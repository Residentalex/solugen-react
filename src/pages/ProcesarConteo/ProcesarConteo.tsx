import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Modal,
  Segmented,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import type { UploadProps } from 'antd';
import type { Dayjs } from 'dayjs';
import { Select } from '../../components/Select';
import type { ColumnsType } from 'antd/es/table';
import {
  CalculatorOutlined,
  DownloadOutlined,
  InboxOutlined,
  InfoCircleOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { eventoApi } from '../../api/eventoApi';
import { almacenApi } from '../../api/almacenApi';
import { procesableConteoApi } from '../../api/procesableConteoApi';
import type { AlmacenDTO } from '../../types/entradaAlmacen';
import type { EventoInventarioDTO } from '../../types/evento';
import type { ConteoProcesableDTO } from '../../types/procesableConteo';
import type { ImportarConteoLineaDTO } from '../../types/conteo';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  toTitleCase,
} from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import PermissionGate from '../../components/PermissionGate';
import FechaColumnCell from '../../components/FechaColumnCell';
import ProcesableAjuste from './ProcesableAjuste';

const { Text } = Typography;
const { Dragger } = Upload;

const CODIGO_PANTALLA = 'OPROCESARCONTEO';
const FILAS_POR_PAGINA = 25;

type ContextoAjuste = {
  codEvento?: string;
  codAlmacen: string;
  fecha?: string;
  inventIds: number[];
  lineas?: ImportarConteoLineaDTO[];
  nota?: string;
};

const ProcesarConteo: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  const [codEvento, setCodEvento] = useState<string | undefined>(undefined);
  const [codAlmacen, setCodAlmacen] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [consultado, setConsultado] = useState(false);

  /**
   * Origen del conteo: por Evento (comportamiento histórico) o por Importación
   * de un Excel Código|Cantidad|Costo con fecha y almacén propios.
   */
  const [origen, setOrigen] = useState<'evento' | 'importacion'>('evento');
  /** Fecha de conteo del modo importación (obligatoria en ese modo). */
  const [fechaConteo, setFechaConteo] = useState<Dayjs | null>(null);

  const [importarOpen, setImportarOpen] = useState(false);
  const [lineasImportar, setLineasImportar] = useState<ImportarConteoLineaDTO[]>([]);
  const [notaImportar, setNotaImportar] = useState('');
  const [nombreArchivoImportar, setNombreArchivoImportar] = useState('');
  const [resumenImportar, setResumenImportar] = useState('');
  const [contextoAjuste, setContextoAjuste] = useState<ContextoAjuste | null>(null);

  const { data: eventos } = useQuery({
    queryKey: ['eventosInventario', sucursalActiva],
    queryFn: () => eventoApi.obtenerListado(sucursalActiva),
    enabled: sucursalActiva !== undefined,
  });

  const { data: almacenes } = useQuery({
    queryKey: ['almacenesProcesarConteo', sucursalActiva],
    queryFn: () => almacenApi.obtenerListado(sucursalActiva),
    enabled: sucursalActiva !== undefined,
  });

  const { data: conteos, isLoading, isError, refetch } = useQuery({
    queryKey: ['procesableConteos', sucursalActiva, codEvento, codAlmacen],
    queryFn: () =>
      procesableConteoApi.obtenerConteosPorEvento(sucursalActiva, codEvento!, {
        almacen: codAlmacen || undefined,
      }),
    enabled: consultado && !!codEvento && sucursalActiva !== undefined,
  });

  useEffect(() => {
    setActiveModule(CODIGO_PANTALLA);
    updateToolbar({});
    return () => {
      resetToolbar();
    };
  }, [setActiveModule, updateToolbar, resetToolbar]);

  // Cambiar el evento o el almacen invalida la seleccion.
  const limpiarSeleccion = useCallback(() => {
    setSelectedRowKeys([]);
    setConsultado(false);
  }, []);

  const eventosFiltrados = useMemo(() => {
    if (!eventos) return [] as EventoInventarioDTO[];
    const texto = searchText.trim().toLowerCase();
    if (!texto) return eventos;
    return eventos.filter(
      (e) =>
        e.nombre?.toLowerCase().includes(texto) ||
        e.codigo?.toLowerCase().includes(texto)
    );
  }, [eventos, searchText]);

  const datosFiltrados = useMemo(() => {
    const lista = conteos || [];
    const texto = searchText.trim().toLowerCase();
    if (!texto) return lista;
    return lista.filter(
      (c) =>
        c.documento?.toLowerCase().includes(texto) ||
        c.nombreSuplidor?.toLowerCase().includes(texto) ||
        c.codigoAlmacen?.toLowerCase().includes(texto)
    );
  }, [conteos, searchText]);

  const columnasConteos: ColumnsType<ConteoProcesableDTO> = useMemo(
    () => [
      {
        title: 'Documento',
        dataIndex: 'documento',
        key: 'documento',
        width: 150,
        fixed: 'left',
        render: (valor: string) => <Text strong>{valor}</Text>,
      },
      {
        title: 'Fecha',
        dataIndex: 'fecha',
        key: 'fecha',
        width: 120,
        render: (valor: string) => <FechaColumnCell fecha={valor} />,
      },
      {
        title: 'Almacén',
        dataIndex: 'almacen',
        key: 'almacen',
        width: 150,
        render: (valor: string, registro) => (
          <Text>
            {toTitleCase(valor || '') || registro.codigoAlmacen || '-'}
          </Text>
        ),
      },
      {
        title: 'Suplidor',
        dataIndex: 'nombreSuplidor',
        key: 'nombreSuplidor',
        width: 200,
        ellipsis: true,
        render: (valor: string) => <Text>{toTitleCase(valor || '') || '-'}</Text>,
      },
      {
        title: 'Usuario',
        dataIndex: 'usuario',
        key: 'usuario',
        width: 150,
        ellipsis: true,
        render: (valor: string) => <Text>{toTitleCase(valor || '') || '-'}</Text>,
      },
      {
        title: 'Artículos',
        dataIndex: 'cantidadDetalles',
        key: 'cantidadDetalles',
        width: 100,
        align: 'right',
        render: (valor: number) => <Text>{formatNumber(valor ?? 0)}</Text>,
      },
      {
        title: 'Cantidad',
        dataIndex: 'cantidad',
        key: 'cantidad',
        width: 120,
        align: 'right',
        render: (valor: number) => <Text>{formatNumber(valor ?? 0)}</Text>,
      },
      {
        title: 'Costo',
        dataIndex: 'costo',
        key: 'costo',
        width: 130,
        align: 'right',
        render: (valor: number) => <Text>{formatCurrency(valor ?? 0)}</Text>,
      },
      {
        title: 'Estado',
        dataIndex: 'bloqueado',
        key: 'bloqueado',
        width: 120,
        render: (valor: boolean) =>
          valor ? <Tag color="red">Bloqueado</Tag> : <Tag>Editable</Tag>,
      },
      {
        title: 'Procesado',
        dataIndex: 'procesado',
        key: 'procesado',
        width: 170,
        render: (valor: boolean, registro) =>
          valor ? (
            <Tooltip title={`Ya unificado en el procesable N.º ${registro.procesableNo ?? '-'}`}>
              <Tag color="processing">Procesable {registro.procesableNo ?? '-'}</Tag>
            </Tooltip>
          ) : (
            <Tag color="default">No unificado</Tag>
          ),
      },
    ],
    []
  );

  const handleSearch = useCallback((valor: string) => {
    setSearchText(valor);
  }, []);

  const handleConsultar = useCallback(() => {
    if (!codEvento) {
      message.warning('Seleccione un evento de inventario.');
      return;
    }
    setSelectedRowKeys([]);
    if (consultado) {
      void refetch();
      return;
    }
    setConsultado(true);
  }, [codEvento, consultado, refetch]);

  const handleRefresh = useCallback(() => {
    setSelectedRowKeys([]);
    if (consultado && codEvento) {
      void refetch();
    }
  }, [codEvento, consultado, refetch]);

  /**
   * Muestra la revision del ajuste dentro de la misma pantalla, sin abrir una
   * pestana nueva. El calculo ocurre en el backend al montar la revision.
   */
  const handleAbrirAjuste = useCallback(() => {
    if (!codEvento) {
      message.warning('Seleccione un evento de inventario.');
      return;
    }
    if (!codAlmacen) {
      message.warning(
        'Seleccione el almacén del ajuste. La cantidad del sistema se calcula por almacén porque la entrada o salida de almacén resultante es de un solo almacén.'
      );
      return;
    }
    if (selectedRowKeys.length === 0) {
      message.warning('Seleccione al menos un conteo.');
      return;
    }

    setContextoAjuste({
      codEvento,
      codAlmacen,
      inventIds: selectedRowKeys.map((k) => Number(k)),
    });
  }, [codEvento, codAlmacen, selectedRowKeys]);

  const handleExportarConteos = useCallback(async () => {
    const companyName = await getCompanyName(sucursalActiva);
    const exportCols = columnasConteos.filter((col) => col.title !== 'Acciones');
    const columnHeaders = exportCols.map((col) => String(col.title));
    const dataRows = datosFiltrados.map((item) =>
      exportCols.map((col) => {
        const clave = (col as { dataIndex?: string }).dataIndex;
        if (!clave) return '';
        const valor = (item as unknown as Record<string, unknown>)[clave];
        return valor != null ? String(valor) : '';
      })
    );
    exportToExcel({
      fileName: `Conteos_ProcesarConteo_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'Conteos',
      companyName,
      columnHeaders,
      dataRows,
    });
  }, [columnasConteos, datosFiltrados, sucursalActiva]);

  const abrirImportarConteo = useCallback(() => {
    setImportarOpen(true);
  }, []);

  const cerrarImportarConteo = useCallback(() => {
    setImportarOpen(false);
    setLineasImportar([]);
    setNombreArchivoImportar('');
    setResumenImportar('');
    setNotaImportar('');
  }, []);

  const handleDescargarPlantillaConteo = useCallback(() => {
    const datos = [{ 'Código': 'COD-00001', 'Cantidad': 10, 'Costo': 1250.5 }];
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(datos);
    worksheet['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla');
    XLSX.writeFile(workbook, 'plantilla_importacion_conteo.xlsx');
  }, []);

  const procesarArchivoConteo = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setLineasImportar([]);
      setNombreArchivoImportar('');
      setResumenImportar('');
      message.error('Solo se permiten archivos .xlsx');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (rows.length < 2) {
          setLineasImportar([]);
          setNombreArchivoImportar('');
          setResumenImportar('');
          message.warning('El archivo no contiene datos válidos.');
          return;
        }

        const headers = (rows[0] as unknown[]).map((h) => String(h ?? '').trim().toLowerCase());
        const idxCodigo = headers.findIndex((h) => h === 'código' || h === 'codigo');
        const idxCantidad = headers.indexOf('cantidad');
        const idxCosto = headers.indexOf('costo');

        if (idxCodigo < 0 || idxCantidad < 0 || idxCosto < 0) {
          setLineasImportar([]);
          setNombreArchivoImportar('');
          setResumenImportar('');
          message.error('El archivo debe tener encabezados "Código", "Cantidad" y "Costo".');
          return;
        }

        let invalidas = 0;
        let repetidos = 0;
        const mapa = new Map<string, { cantidad: number; costo: number }>();

        const esNumeroValido = (raw: unknown): boolean =>
          raw !== '' && raw !== null && raw !== undefined && Number.isFinite(Number(raw));

        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i] as unknown[];
          if (cols.every((c) => !c && c !== 0)) continue;

          const codigo = String(cols[idxCodigo] ?? '').trim();
          const rawCantidad = cols[idxCantidad];
          const rawCosto = cols[idxCosto];
          const cantidad = Number(rawCantidad);
          const costo = Number(rawCosto);

          if (
            !codigo ||
            !esNumeroValido(rawCantidad) ||
            !esNumeroValido(rawCosto) ||
            cantidad < 0 ||
            costo < 0
          ) {
            invalidas += 1;
            continue;
          }

          const previo = mapa.get(codigo);
          if (previo) {
            // Criterio de códigos repetidos: se suman las cantidades y se
            // conserva el costo no cero. Si ya hay un costo distinto de cero se
            // mantiene; si el guardado es 0 y llega uno no cero, se toma este.
            repetidos += 1;
            previo.cantidad += cantidad;
            if (previo.costo === 0 && costo !== 0) {
              previo.costo = costo;
            }
          } else {
            mapa.set(codigo, { cantidad, costo });
          }
        }

        const lineas: ImportarConteoLineaDTO[] = Array.from(mapa.entries()).map(
          ([codigo, valor]) => ({ codigo, cantidad: valor.cantidad, costo: valor.costo })
        );

        setLineasImportar(lineas);
        setNombreArchivoImportar(file.name);

        const avisos: string[] = [];
        if (repetidos > 0) {
          avisos.push(`${repetidos} código(s) repetido(s) se sumaron`);
        }
        if (invalidas > 0) {
          avisos.push(`${invalidas.toLocaleString('es-DO')} fila(s) inválida(s) descartadas.`);
        }
        setResumenImportar(avisos.join('. '));

        if (lineas.length === 0) {
          message.warning('No hay filas válidas para importar.');
        } else {
          message.success(`${lineas.length} fila(s) válida(s) cargadas.`);
        }
      } catch {
        message.error('Error al leer el archivo. Verifique el formato.');
      }
    };

    reader.onerror = () => {
      message.error('Error al leer el archivo');
    };

    reader.readAsArrayBuffer(file);
  }, []);

  const uploadPropsConteo: UploadProps = {
    name: 'archivo',
    multiple: false,
    accept: '.xlsx',
    showUploadList: false,
    beforeUpload: (file) => {
      procesarArchivoConteo(file);
      return false;
    },
  };

  const columnasPreviewImportar: ColumnsType<ImportarConteoLineaDTO> = useMemo(
    () => [
      { title: 'Código', dataIndex: 'codigo', key: 'codigo' },
      {
        title: 'Cantidad',
        dataIndex: 'cantidad',
        key: 'cantidad',
        align: 'right',
        render: (valor: number) => <Text>{formatNumber(valor ?? 0)}</Text>,
      },
      {
        title: 'Costo',
        dataIndex: 'costo',
        key: 'costo',
        align: 'right',
        render: (valor: number) => <Text>{formatCurrency(valor ?? 0)}</Text>,
      },
    ],
    []
  );

  const handleImportarConteo = useCallback(() => {
    if (!fechaConteo) {
      message.warning('Seleccione la fecha del conteo.');
      return;
    }
    if (!codAlmacen) {
      message.warning('Seleccione un almacén.');
      return;
    }
    if (sucursalActiva === undefined) {
      message.warning('No hay sucursal activa seleccionada.');
      return;
    }
    if (lineasImportar.length === 0) {
      message.warning('No hay filas válidas para importar.');
      return;
    }

    const fecha = fechaConteo.format('YYYYMMDDHHmmss');

    // La revision se muestra en la misma pantalla con las lineas del Excel en
    // memoria: no se crea el conteo (INVENT/DINVENT) hasta confirmar.
    setContextoAjuste({
      codAlmacen,
      fecha,
      lineas: lineasImportar,
      nota: notaImportar.trim() || undefined,
      inventIds: [],
    });

    message.success('Revisión abierta.');
    cerrarImportarConteo();
  }, [
    fechaConteo,
    codAlmacen,
    lineasImportar,
    notaImportar,
    sucursalActiva,
    cerrarImportarConteo,
  ]);

  if (contextoAjuste) {
    return (
      <ProcesableAjuste
        codEvento={contextoAjuste.codEvento}
        codAlmacen={contextoAjuste.codAlmacen}
        fecha={contextoAjuste.fecha}
        inventIds={contextoAjuste.inventIds}
        lineas={contextoAjuste.lineas}
        nota={contextoAjuste.nota}
        onVolver={() => setContextoAjuste(null)}
      />
    );
  }

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar los conteos del evento"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={handleRefresh}>
              Reintentar
            </Button>
          }
        />
      )}

      <Card
        styles={{ body: { padding: 0 } }}
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
      >
        <CatalogoListadoToolbar
          onSearch={handleSearch}
          placeholder="Buscar en los conteos listados..."
          pageSize={FILAS_POR_PAGINA}
          onPageSizeChange={() => {}}
          ocultarPageSize
          onReload={handleRefresh}
          onExportarExcel={origen === 'evento' ? handleExportarConteos : undefined}
          filtros={
            <Space size={8} wrap>
              <Segmented
                value={origen}
                onChange={(valor) => setOrigen(valor as 'evento' | 'importacion')}
                options={[
                  { label: 'Evento', value: 'evento' },
                  { label: 'Importación', value: 'importacion' },
                ]}
              />
              {origen === 'evento' ? (
                <>
                  <Select
                    style={{ minWidth: 260 }}
                    placeholder="Evento de inventario"
                    value={codEvento}
                    onChange={(valor) => {
                      setCodEvento(valor);
                      limpiarSeleccion();
                    }}
                    options={eventosFiltrados.map((e) => ({
                      value: e.codigo,
                      label: `${e.nombre} — ${formatDate(e.fecha)}`,
                    }))}
                    showSearch
                    optionFilterProp="label"
                    notFoundContent={<Empty description="Sin eventos" />}
                  />
                  <Select
                    style={{ minWidth: 200 }}
                    placeholder="Almacén del ajuste"
                    value={codAlmacen || undefined}
                    onChange={(valor) => {
                      setCodAlmacen(valor ?? '');
                      limpiarSeleccion();
                    }}
                    options={(almacenes || []).map((a: AlmacenDTO) => ({
                      value: a.idExterno ?? a.codigo,
                      label: toTitleCase(a.nombre || a.idExterno || a.codigo),
                    }))}
                    allowClear
                  />
                  <Button type="primary" onClick={handleConsultar}>
                    Consultar
                  </Button>
                </>
              ) : (
                <>
                  <DatePicker
                    style={{ minWidth: 180 }}
                    placeholder="Fecha de conteo"
                    value={fechaConteo}
                    onChange={(valor) => setFechaConteo(valor)}
                  />
                  <Select
                    style={{ minWidth: 200 }}
                    placeholder="Almacén"
                    value={codAlmacen || undefined}
                    onChange={(valor) => setCodAlmacen(valor ?? '')}
                    options={(almacenes || []).map((a: AlmacenDTO) => ({
                      value: a.idExterno ?? a.codigo,
                      label: toTitleCase(a.nombre || a.idExterno || a.codigo),
                    }))}
                  />
                  <PermissionGate accion="PROCESAR">
                    <Button
                      type="primary"
                      icon={<UploadOutlined />}
                      onClick={abrirImportarConteo}
                      disabled={!fechaConteo || !codAlmacen}
                    >
                      Importar conteo
                    </Button>
                  </PermissionGate>
                </>
              )}
            </Space>
          }
          accionesItems={
            // La pantalla OProcesarConteo solo declara la accion PROCESAR en
            // AUTH_PANTALLA_ACCION (consultar en la base de seguridad), por eso
            // no se usa CREAR: el PermissionGate devuelve null y oculta el boton.
            origen === 'evento'
              ? [{
                  key: 'revisar-ajuste',
                  label: `Revisar ajuste (${selectedRowKeys.length})`,
                  icon: <CalculatorOutlined />,
                  onClick: handleAbrirAjuste,
                  permiso: { accion: 'PROCESAR' },
                  disabled: !codEvento || !codAlmacen || selectedRowKeys.length === 0,
                }]
              : []
          }
        />

        {origen === 'evento' && (
          <>
            {!codEvento && (
              <Alert
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
                style={{ margin: '16px 24px 0' }}
                message="Seleccione un evento de inventario para listar sus conteos."
              />
            )}

            {codEvento && !codAlmacen && (
              <Alert
                type="warning"
                showIcon
                style={{ margin: '16px 24px 0' }}
                message="Seleccione el almacén para poder calcular el ajuste. La cantidad del sistema se calcula por almacén porque la entrada o salida de almacén resultante es de un solo almacén."
              />
            )}

            {selectedRowKeys.length > 0 && (
              <Alert
                type="success"
                showIcon
                style={{ margin: '16px 24px 0' }}
                message={`${selectedRowKeys.length} conteo${selectedRowKeys.length === 1 ? '' : 's'} seleccionado${selectedRowKeys.length === 1 ? '' : 's'}. La siguiente pantalla permite revisar el impacto estimado; todavía no modifica las existencias.`}
              />
            )}
          </>
        )}

        {origen === 'importacion' && (
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ margin: '16px 24px 0' }}
            message="Seleccione la fecha del conteo y el almacén; luego importe el archivo Excel con las columnas Código, Cantidad y Costo."
          />
        )}

        {origen === 'evento' && (
          <Table<ConteoProcesableDTO>
            columns={columnasConteos}
            dataSource={datosFiltrados}
            rowKey="inventId"
            loading={isLoading}
            scroll={{ x: 1350 }}
            sticky
            size="middle"
            rowClassName={(registro) =>
              registro.procesado ? 'paces-row-selected' : 'paces-row-hover'
            }
            rowSelection={{
              selectedRowKeys,
              preserveSelectedRowKeys: true,
              columnWidth: 50,
              getCheckboxProps: (registro) => ({
                name: registro.documento,
                disabled: registro.procesado,
              }),
              onChange: (claves) => setSelectedRowKeys(claves),
            }}
            locale={{
              emptyText: (
                <div
                  style={{
                    minHeight: 160,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Empty description="No hay conteos para el evento seleccionado" />
                </div>
              ),
            }}
            pagination={{
              pageSize: FILAS_POR_PAGINA,
              showSizeChanger: false,
              showTotal: (total) => `${total} registros`,
            }}
            className="paces-border-top paces-list-table"
          />
        )}
      </Card>

      <Modal
        open={importarOpen}
        onCancel={cerrarImportarConteo}
        title="Importar conteo por Excel"
        width={720}
        footer={[
          <Button
            key="cancelar"
            onClick={cerrarImportarConteo}
          >
            Cancelar
          </Button>,
          <Button
            key="importar"
            type="primary"
            icon={<UploadOutlined />}
            onClick={handleImportarConteo}
            disabled={lineasImportar.length === 0 || !fechaConteo || !codAlmacen}
          >
            Importar
          </Button>,
        ]}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message={
              <Space direction="vertical" size={0}>
                <Text>
                  Almacén:{' '}
                  {toTitleCase(
                    (almacenes || []).find(
                      (a: AlmacenDTO) => (a.idExterno ?? a.codigo) === codAlmacen
                    )
                      ?.nombre || codAlmacen
                  ) || '—'}
                </Text>
                <Text>
                  Fecha de conteo: {fechaConteo ? fechaConteo.format('DD/MM/YYYY') : '—'}
                </Text>
              </Space>
            }
          />

          <Button icon={<DownloadOutlined />} onClick={handleDescargarPlantillaConteo}>
            Descargar plantilla
          </Button>

          <Dragger {...uploadPropsConteo} style={{ padding: '12px 0' }}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Haga clic o arrastre el archivo aquí</p>
            <p className="ant-upload-hint">
              Solo se permiten archivos .xlsx con columnas Código, Cantidad y Costo
            </p>
          </Dragger>

          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Nota (opcional)
            </Text>
            <Input
              placeholder="Nota para el documento de conteo"
              value={notaImportar}
              onChange={(e) => setNotaImportar(e.target.value)}
              maxLength={500}
            />
          </div>

          {nombreArchivoImportar && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Archivo: {nombreArchivoImportar} — {lineasImportar.length} fila(s) válida(s)
            </Text>
          )}

          {resumenImportar && <Alert type="info" showIcon message={resumenImportar} />}

          <Table<ImportarConteoLineaDTO>
            className="paces-list-table"
            dataSource={lineasImportar}
            columns={columnasPreviewImportar}
            rowKey="codigo"
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `${t} registros` }}
            scroll={{ y: 240 }}
          />
        </Space>
      </Modal>
    </>
  );
};

export default ProcesarConteo;
