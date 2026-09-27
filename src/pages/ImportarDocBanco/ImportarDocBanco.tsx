import React, { useEffect, useState, useRef } from 'react';
import {
  Card, Table, Button, Checkbox, message, Modal, Progress, Typography, Alert, Tag, Space, Upload, Divider, Statistic,
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  InboxOutlined,
  FileExcelOutlined,
  ReloadOutlined,
  WarningOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import * as XLSX from 'xlsx';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { transaccionBancariaApi } from '../../api/transaccionBancariaApi';
import type { TransaccionDTO } from '../../types/transaccion';
import { toISOFormat } from '../../utils/formats';

const { Text } = Typography;
const { Dragger } = Upload;

// ===== Tipos de UI para filas parseadas del Excel =====
interface FilaDocBancario {
  key: number;
  fecha: Date | null;
  tipoDocumento: string;
  monto: number;
  moneda: string;
  concepto: string;
  ctaBancaria: string;
  referencia: string;
  nota: string;
  sucursal: string;
}

interface CreadoDoc {
  id: number;
  fecha: Date | null;
  tipoDocumento: string;
  monto: number;
  moneda: string;
  referencia: string;
  nota: string;
  sucursal: string;
}

interface ErrorDoc {
  fila: FilaDocBancario;
  error: string;
}

interface FilaValidada {
  fila: FilaDocBancario;
  errores: string[];
  esDuplicado: boolean;
}

// ===== Constantes de formato =====
const COLUMNAS_PLANTILLA = ['fecha', 'tipoDocumento', 'monto', 'moneda', 'concepto', 'ctaBancaria', 'referencia', 'nota', 'sucursal'];
const TAMANO_MAXIMO_MB = 10;
const EXTENSION_PERMITIDA = '.xlsx';

// ===== Helpers =====
function formatDateDisplay(fecha: Date | null): string {
  if (!fecha) return '';
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function handleDescargarPlantilla() {
  const data = [COLUMNAS_PLANTILLA.reduce((acc, col) => ({ ...acc, [col]: '' }), {})];
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = COLUMNAS_PLANTILLA.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla');
  XLSX.writeFile(workbook, 'plantilla_documentos_bancarios.xlsx');
}

function handleDescargarErrores(errores: ErrorDoc[], nombreArchivo: string) {
  const data = errores.map((e) => ({
    fila: e.fila.key,
    fecha: formatDateDisplay(e.fila.fecha),
    tipoDocumento: e.fila.tipoDocumento,
    monto: e.fila.monto,
    moneda: e.fila.moneda,
    concepto: e.fila.concepto,
    ctaBancaria: e.fila.ctaBancaria,
    referencia: e.fila.referencia,
    nota: e.fila.nota,
    sucursal: e.fila.sucursal,
    error: e.error,
  }));
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 10 },
    { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 24 }, { wch: 14 }, { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Errores');
  const baseName = nombreArchivo.replace(/\.xlsx$/i, '') || 'errores_importacion';
  XLSX.writeFile(workbook, `${baseName}_errores.xlsx`);
}

function construirClaveDuplicado(fila: FilaDocBancario): string {
  return [
    formatDateDisplay(fila.fecha),
    fila.tipoDocumento,
    fila.monto.toFixed(2),
    fila.moneda,
    fila.ctaBancaria,
    fila.referencia,
  ].join('|');
}

// ===== Componente principal =====
const ImportarDocBanco: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  const [filas, setFilas] = useState<FilaDocBancario[]>([]);
  const [filasValidadas, setFilasValidadas] = useState<FilaValidada[]>([]);
  const [postear, setPostear] = useState(true);
  const [creando, setCreando] = useState(false);
  const [progreso, setProgreso] = useState<{ actual: number; total: number }>({ actual: 0, total: 0 });
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [tamanoArchivo, setTamanoArchivo] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resultado, setResultado] = useState<{ creados: CreadoDoc[]; errores: ErrorDoc[] } | null>(null);

  useEffect(() => {
    setActiveModule('OImportarDocBanco');
    setPageTitleOverride('Importar Documentos Bancarios');
    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar]);

  // ===== Carga de Excel =====
  const procesarArchivo = (file: File) => {
    if (!file.name.toLowerCase().endsWith(EXTENSION_PERMITIDA)) {
      message.error('Solo se permiten archivos .xlsx');
      return;
    }

    if (file.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
      message.error(`El archivo supera el tamaño máximo permitido de ${TAMANO_MAXIMO_MB} MB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (rows.length < 2) {
          message.warning('El archivo no contiene datos válidos.');
          return;
        }

        const headers = (rows[0] as string[]).map((h) => String(h).trim().toLowerCase());
        const idxFecha = headers.indexOf('fecha');
        const idxTipoDoc = headers.indexOf('tipodocumento');
        const idxMonto = headers.indexOf('monto');
        const idxMoneda = headers.indexOf('moneda');
        const idxConcepto = headers.indexOf('concepto');
        const idxCta = headers.indexOf('ctabancaria');
        const idxRef = headers.indexOf('referencia');
        const idxNota = headers.indexOf('nota');
        const idxSuc = headers.indexOf('sucursal');

        const parsed: FilaDocBancario[] = [];
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i];
          if (cols.every((c: any) => !c && c !== 0)) continue;

          let fecha: Date | null = null;
          if (idxFecha >= 0 && cols[idxFecha]) {
            const val = cols[idxFecha];
            if (val instanceof Date) {
              fecha = val;
            } else if (typeof val === 'number') {
              const excelEpoch = new Date(1899, 11, 30);
              fecha = new Date(excelEpoch.getTime() + val * 24 * 60 * 60 * 1000);
            } else if (typeof val === 'string') {
              const parsedDate = new Date(val);
              if (!isNaN(parsedDate.getTime())) fecha = parsedDate;
            }
          }

          parsed.push({
            key: i,
            fecha,
            tipoDocumento: idxTipoDoc >= 0 ? (String(cols[idxTipoDoc] ?? '').trim().toUpperCase() || 'DEP') : 'DEP',
            monto: idxMonto >= 0 ? parseFloat(cols[idxMonto]) || 0 : 0,
            moneda: idxMoneda >= 0 ? String(cols[idxMoneda] ?? '').trim() : '',
            concepto: idxConcepto >= 0 ? String(cols[idxConcepto] ?? '').trim() : '',
            ctaBancaria: idxCta >= 0 ? String(cols[idxCta] ?? '').trim() : '',
            referencia: idxRef >= 0 ? String(cols[idxRef] ?? '').trim() : '',
            nota: idxNota >= 0 ? String(cols[idxNota] ?? '').trim() : '',
            sucursal: idxSuc >= 0 ? String(cols[idxSuc] ?? '').trim() : '',
          });
        }

        if (parsed.length === 0) {
          message.warning('El archivo no contiene datos válidos.');
          return;
        }

        // ===== Validación de filas y detección de duplicados =====
        const validadas = parsed.map((fila) => {
          const errores: string[] = [];
          if (!fila.fecha) errores.push('Fecha inválida o faltante');
          if (!fila.monto || fila.monto <= 0) errores.push('Monto inválido o faltante');
          if (!fila.moneda) errores.push('Moneda faltante');
          if (!fila.ctaBancaria) errores.push('Cuenta bancaria faltante');
          if (!fila.referencia) errores.push('Referencia faltante');
          return { fila, errores, esDuplicado: false };
        });

        const clavesVistas = new Set<string>();
        validadas.forEach((v) => {
          const clave = construirClaveDuplicado(v.fila);
          if (clavesVistas.has(clave)) {
            v.esDuplicado = true;
            v.errores.push('Posible duplicado');
          } else {
            clavesVistas.add(clave);
          }
        });

        setFilas(parsed);
        setFilasValidadas(validadas);
        setNombreArchivo(file.name);
        setTamanoArchivo(file.size);
        message.success(`${parsed.length} filas cargadas desde Excel`);
      } catch (err) {
        message.error('Error al leer el archivo. Verifique el formato.');
      }
    };

    reader.onerror = () => {
      message.error('Error al leer el archivo');
    };

    reader.readAsArrayBuffer(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadProps: UploadProps = {
    name: 'archivo',
    multiple: false,
    accept: EXTENSION_PERMITIDA,
    showUploadList: false,
    beforeUpload: (file) => {
      procesarArchivo(file);
      return false;
    },
  };

  // ===== Eliminar fila individual =====
  const handleEliminarFila = (key: number) => {
    setFilas((prev) => prev.filter((f) => f.key !== key));
    setFilasValidadas((prev) => prev.filter((v) => v.fila.key !== key));
  };

  // ===== Eliminar todas las filas =====
  const handleEliminarTodo = () => {
    Modal.confirm({
      title: 'Eliminar archivo',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro que desea eliminar todas las filas cargadas?',
      okText: 'Sí, eliminar',
      cancelText: 'No, cancelar',
      okButtonProps: { danger: true },
      onOk: () => {
        setFilas([]);
        setFilasValidadas([]);
        setNombreArchivo('');
        setTamanoArchivo(null);
        setResultado(null);
        message.success('Filas eliminadas');
      },
    });
  };

  // ===== Crear documentos bancarios =====
  const handleCrearDocumentos = async () => {
    const filasAProcesar = filasValidadas.filter((v) => v.errores.length === 0).map((v) => v.fila);
    if (filasAProcesar.length === 0) {
      message.warning('No hay filas válidas para procesar. Revise los errores marcados.');
      return;
    }

    setCreando(true);
    setProgreso({ actual: 0, total: filasAProcesar.length });

    const creados: CreadoDoc[] = [];
    const errores: ErrorDoc[] = [];

    for (let i = 0; i < filasAProcesar.length; i++) {
      const fila = filasAProcesar[i];
      try {
        const tipoDoc = fila.tipoDocumento || 'DEP';
        const dto: Partial<TransaccionDTO> = {
          id: 0,
          fechaDocumento: fila.fecha ? toISOFormat(fila.fecha) : toISOFormat(new Date()),
          total: fila.monto,
          nota: fila.nota,
          referencia: fila.referencia,
          codigoSucursal: fila.sucursal,
          codigoConcepto: fila.concepto,
          codigoMoneda: fila.moneda,
          ctaBancaria: fila.ctaBancaria,
          estado: 1,
          tipoDocumento: tipoDoc,
          documento: { codigo: tipoDoc },
          debitos: 0,
          creditos: 0,
          tasa: 1,
          subTotal: 0,
          descuento: 0,
          impuestos: 0,
          retenciones: 0,
          periodo: new Date().getMonth() + 1,
        };

        const idCreado = await transaccionBancariaApi.crearDocBancario(sucursalActiva, dto, postear);
        creados.push({
          id: idCreado,
          fecha: fila.fecha,
          tipoDocumento: tipoDoc,
          monto: fila.monto,
          moneda: fila.moneda,
          referencia: fila.referencia,
          nota: fila.nota,
          sucursal: fila.sucursal,
        });
      } catch (err: any) {
        const msg = err?.response?.data?.errorMessage || `Error en fila ${i + 1}`;
        errores.push({ fila, error: msg });
      }
      setProgreso({ actual: i + 1, total: filasAProcesar.length });
    }

    setCreando(false);
    setResultado({ creados, errores });
  };

  // ===== Reintentar únicamente registros corregibles (errores de API) =====
  const handleReintentar = async () => {
    if (!resultado || resultado.errores.length === 0) return;

    setCreando(true);
    const reintentos = resultado.errores;
    const nuevosErrores: ErrorDoc[] = [];
    const nuevosCreados: CreadoDoc[] = [];

    for (let i = 0; i < reintentos.length; i++) {
      const fila = reintentos[i].fila;
      try {
        const tipoDoc = fila.tipoDocumento || 'DEP';
        const dto: Partial<TransaccionDTO> = {
          id: 0,
          fechaDocumento: fila.fecha ? toISOFormat(fila.fecha) : toISOFormat(new Date()),
          total: fila.monto,
          nota: fila.nota,
          referencia: fila.referencia,
          codigoSucursal: fila.sucursal,
          codigoConcepto: fila.concepto,
          codigoMoneda: fila.moneda,
          ctaBancaria: fila.ctaBancaria,
          estado: 1,
          tipoDocumento: tipoDoc,
          documento: { codigo: tipoDoc },
          debitos: 0,
          creditos: 0,
          tasa: 1,
          subTotal: 0,
          descuento: 0,
          impuestos: 0,
          retenciones: 0,
          periodo: new Date().getMonth() + 1,
        };

        const idCreado = await transaccionBancariaApi.crearDocBancario(sucursalActiva, dto, postear);
        nuevosCreados.push({
          id: idCreado,
          fecha: fila.fecha,
          tipoDocumento: tipoDoc,
          monto: fila.monto,
          moneda: fila.moneda,
          referencia: fila.referencia,
          nota: fila.nota,
          sucursal: fila.sucursal,
        });
      } catch (err: any) {
        const msg = err?.response?.data?.errorMessage || `Error en fila ${i + 1}`;
        nuevosErrores.push({ fila, error: msg });
      }
    }

    setCreando(false);
    setResultado((prev) => prev ? {
      creados: [...prev.creados, ...nuevosCreados],
      errores: nuevosErrores,
    } : null);

    if (nuevosErrores.length === 0) {
      message.success(`Se reintentaron ${reintentos.length} registros correctamente.`);
    } else {
      message.warning(`${nuevosCreados.length} reintentos exitosos. ${nuevosErrores.length} aún fallan.`);
    }
  };

  // ===== Columnas de la tabla =====
  const columnas = [
    {
      title: 'Fecha',
      key: 'fecha',
      width: 120,
      render: (_: any, record: FilaDocBancario) => (
        <Text>{formatDateDisplay(record.fecha)}</Text>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'tipoDocumento',
      key: 'tipoDocumento',
      width: 80,
    },
    {
      title: 'Monto',
      key: 'monto',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: FilaDocBancario) => (
        <Text strong>{formatNumber(record.monto)}</Text>
      ),
    },
    {
      title: 'Moneda',
      dataIndex: 'moneda',
      key: 'moneda',
      width: 80,
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      key: 'concepto',
      width: 100,
    },
    {
      title: 'Cta. Bancaria',
      dataIndex: 'ctaBancaria',
      key: 'ctaBancaria',
      width: 140,
    },
    {
      title: 'Referencia',
      dataIndex: 'referencia',
      key: 'referencia',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Nota',
      dataIndex: 'nota',
      key: 'nota',
      ellipsis: true,
    },
    {
      title: 'Sucursal',
      dataIndex: 'sucursal',
      key: 'sucursal',
      width: 100,
    },
    {
      title: 'Estado',
      key: 'estado',
      width: 180,
      render: (_: any, record: FilaDocBancario) => {
        const validacion = filasValidadas.find((v) => v.fila.key === record.key);
        if (!validacion) return null;
        return (
          <Space direction="vertical" size={2}>
            {validacion.errores.length === 0 ? (
              <Tag color="green">Válida</Tag>
            ) : (
              <Tag color="red">{validacion.errores.length} error(es)</Tag>
            )}
            {validacion.esDuplicado && <Tag color="orange">Duplicado</Tag>}
          </Space>
        );
      },
    },
    {
      title: '',
      key: 'acciones',
      width: 50,
      render: (_: any, record: FilaDocBancario) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleEliminarFila(record.key)}
          disabled={creando}
        />
      ),
    },
  ];

  const columnasCreados = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 90 },
    {
      title: 'Fecha', key: 'fecha', width: 120,
      render: (_: any, record: CreadoDoc) => <Text>{formatDateDisplay(record.fecha)}</Text>,
    },
    { title: 'Tipo', dataIndex: 'tipoDocumento', key: 'tipoDocumento', width: 80 },
    {
      title: 'Monto', key: 'monto', width: 120, align: 'right' as const,
      render: (_: any, record: CreadoDoc) => <Text strong>{formatNumber(record.monto)}</Text>,
    },
    { title: 'Moneda', dataIndex: 'moneda', key: 'moneda', width: 80 },
    { title: 'Referencia', dataIndex: 'referencia', key: 'referencia', width: 120, ellipsis: true },
    { title: 'Nota', dataIndex: 'nota', key: 'nota', ellipsis: true },
    { title: 'Sucursal', dataIndex: 'sucursal', key: 'sucursal', width: 100 },
  ];

  const filasConErrores = filasValidadas.filter((v) => v.errores.length > 0);
  const duplicados = filasValidadas.filter((v) => v.esDuplicado);
  const totalMonto = filas.reduce((acc, f) => acc + f.monto, 0);
  const filasValidas = filas.length - filasConErrores.length;

  const handleCerrarResultado = () => {
    if (!resultado) return;
    const { creados, errores } = resultado;

    if (errores.length === 0) {
      setFilas([]);
      setFilasValidadas([]);
      setNombreArchivo('');
      setTamanoArchivo(null);
      message.success(`Se crearon ${creados.length} documentos bancarios exitosamente.`);
    } else {
      const clavesFallidas = new Set(errores.map((e) => e.fila.key));
      setFilas((prev) => prev.filter((f) => clavesFallidas.has(f.key)));
      setFilasValidadas((prev) => prev.filter((v) => clavesFallidas.has(v.fila.key)));
      message.warning(`Se crearon ${creados.length} documentos. ${errores.length} fallaron.`);
    }
    setResultado(null);
  };

  return (
    <Card
      className="paces-card-erp"
      style={{ borderRadius: 8, overflow: 'hidden' }}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ padding: '16px 24px 0' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <Button icon={<DownloadOutlined />} onClick={handleDescargarPlantilla} disabled={creando}>
            Descargar plantilla
          </Button>
          <Checkbox
            checked={postear}
            onChange={(e) => setPostear(e.target.checked)}
            disabled={creando}
          >
            Postear documentos
          </Checkbox>
          <div style={{ flex: 1 }} />
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleCrearDocumentos}
            disabled={filasValidas === 0 || creando}
            loading={creando}
          >
            Crear Documentos Bancarios
          </Button>
          <Button
            icon={<DeleteOutlined />}
            onClick={handleEliminarTodo}
            disabled={filas.length === 0 || creando}
            danger
          >
            Eliminar
          </Button>
        </div>

        {/* Zona de carga con arrastrar y soltar */}
        {filas.length === 0 && (
          <>
            <Dragger {...uploadProps} style={{ padding: '24px 0', background: '#fafafa' }}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Haga clic o arrastre el archivo aquí</p>
              <p className="ant-upload-hint">Solo se permiten archivos .xlsx</p>
            </Dragger>

            <Divider />

            {/* Información del formato esperado */}
            <Alert
              message="Formato del archivo"
              description={
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <div><InfoCircleOutlined /> <Text strong>Formato:</Text> .xlsx (Excel)</div>
                  <div><InfoCircleOutlined /> <Text strong>Tamaño máximo:</Text> {TAMANO_MAXIMO_MB} MB</div>
                  <div><InfoCircleOutlined /> <Text strong>Columnas esperadas (primera fila):</Text></div>
                  <div style={{ paddingLeft: 24 }}>
                    <Tag>{COLUMNAS_PLANTILLA.join(', ')}</Tag>
                  </div>
                </Space>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          </>
        )}

        {/* Info del archivo y progreso */}
        {nombreArchivo && (
          <div style={{ marginBottom: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Archivo: {nombreArchivo} — {tamanoArchivo !== null ? formatFileSize(tamanoArchivo) : ''} — {filas.length} filas
            </Text>
          </div>
        )}
        {creando && (
          <div style={{ marginBottom: 16 }}>
            <Progress
              percent={progreso.total > 0 ? Math.round((progreso.actual / progreso.total) * 100) : 0}
              format={() => `${progreso.actual} / ${progreso.total}`}
            />
          </div>
        )}
      </div>

      {filas.length > 0 && (
        <>
          <Divider style={{ margin: 0 }} />
          <div style={{ padding: '12px 24px' }}>
            <Space size={16} wrap>
              <Statistic title="Total filas" value={filas.length} />
              <Statistic title="Filas válidas" value={filasValidas} valueStyle={{ color: '#389e0d' }} />
              <Statistic title="Total a procesar" value={formatNumber(totalMonto)} precision={2} />
              {duplicados.length > 0 && (
                <Tag color="orange" style={{ alignSelf: 'center' }}>
                  <WarningOutlined /> {duplicados.length} posible(s) duplicado(s)
                </Tag>
              )}
              {filasConErrores.length > 0 && (
                <Tag color="red" style={{ alignSelf: 'center' }}>
                  <ExclamationCircleOutlined /> {filasConErrores.length} fila(s) con errores
                </Tag>
              )}
            </Space>
            {filasConErrores.length > 0 && (
              <Alert
                message={`${filasConErrores.length} fila(s) presentan errores y serán omitidas del procesamiento`}
                description="Corrija los errores en el archivo de origen y vuelva a cargar, o elimine las filas marcadas antes de continuar."
                type="warning"
                showIcon
                style={{ marginTop: 12 }}
              />
            )}
          </div>
        </>
      )}

      <Table
        className="paces-border-top paces-list-table"
        dataSource={filas}
        columns={columnas}
        rowKey="key"
        size="small"
        pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `${t} registros` }}
        scroll={{ x: 1100 }}
        rowClassName={(record) => {
          const validacion = filasValidadas.find((v) => v.fila.key === record.key);
          if ((validacion?.errores?.length || 0) > 0) return 'paces-row-error';
          return '';
        }}
      />

      <Modal
        open={!!resultado}
        onCancel={() => setResultado(null)}
        title="Resultado de importación"
        width={900}
        footer={[
          <Button key="cerrar" type="primary" onClick={handleCerrarResultado}>
            Cerrar
          </Button>,
        ]}
      >
        {resultado && (
          <>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Procesados ({resultado.creados.length})</Text>
            </div>
            <Table
              className="paces-list-table"
              dataSource={resultado.creados}
              columns={columnasCreados}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} registros` }}
              scroll={{ x: 900 }}
            />
            {resultado.errores.length > 0 && (
              <>
                <div style={{ marginBottom: 8, marginTop: 16 }}>
                  <Text strong type="danger">Rechazados ({resultado.errores.length})</Text>
                </div>
                <Table
                  className="paces-list-table"
                  dataSource={resultado.errores}
                  rowKey={(_, index) => String(index)}
                  size="small"
                  pagination={false}
                  columns={[
                    {
                      title: 'Fila', key: 'fila', width: 80,
                      render: (_: any, record: ErrorDoc) => <Text>{record.fila.key}</Text>,
                    },
                    {
                      title: 'Referencia', key: 'referencia', width: 130,
                      render: (_: any, record: ErrorDoc) => <Text>{record.fila.referencia || '-'}</Text>,
                    },
                    {
                      title: 'Monto', key: 'monto', width: 120, align: 'right' as const,
                      render: (_: any, record: ErrorDoc) => <Text>{formatNumber(record.fila.monto)}</Text>,
                    },
                    {
                      title: 'Error', dataIndex: 'error', key: 'error',
                      render: (v: string) => <Text type="danger">{v}</Text>,
                    },
                  ]}
                />
                <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Button icon={<FileExcelOutlined />} onClick={() => handleDescargarErrores(resultado.errores, nombreArchivo)}>
                    Descargar errores
                  </Button>
                  <Button
                    type="primary"
                    icon={<ReloadOutlined />}
                    onClick={handleReintentar}
                    loading={creando}
                  >
                    Reintentar corregibles
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </Modal>
    </Card>
  );
};

export default ImportarDocBanco;
