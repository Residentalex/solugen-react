import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Grid, Input, Typography, Tooltip, Modal, Alert, App, DatePicker, Dropdown, Switch,
} from 'antd';
import type { MenuProps } from 'antd';
import dayjs from 'dayjs';

import {
  LockFilled,
  CheckCircleFilled,
  CheckCircleOutlined,
  CalendarOutlined,
  MoreOutlined,
  PrinterOutlined,
  FileTextOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import ErrorDetalle from '../../components/ErrorDetalle';
import PermissionGate from '../../components/PermissionGate';
import { apiClient } from '../../api/client';
import { salidaAlmacenApi } from '../../api/salidaAlmacenApi';
import type { SalidaAlmacenFullDTO, DetalleSalidaAlmacenDTO } from '../../types/salidaAlmacen';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import ModalAnular from '../../components/ModalAnular/ModalAnular';
import { documentoRelacionApi, type DocumentoRelacionDTO } from '../../api/documentoRelacionApi';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import SucursalField from '../../components/SucursalField';
import { formatCurrency, formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { resolveEstado, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import { productoApi } from '../../api/productoApi';

const { Text } = Typography;

function extraerMensajeError(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (data.errorMessage) return data.errorMessage;
  if (data.errors && typeof data.errors === 'object') {
    const mensajes: string[] = [];
    for (const key of Object.keys(data.errors)) {
      const val = data.errors[key];
      if (Array.isArray(val)) mensajes.push(...val);
      else if (typeof val === 'string') mensajes.push(val);
    }
    if (mensajes.length > 0) return mensajes.join('; ');
  }
  return fallback;
}

const SalidaAlmacenDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode, documentCode } = useScreenConfig('FSAP');
  const [data, setData] = useState<SalidaAlmacenFullDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');
  const [tieneScan, setTieneScan] = useState<boolean | null>(null);
  const [operacionTitulo, setOperacionTitulo] = useState('');
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [scannerUrl, setScannerUrl] = useState<string | null>(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [documentosRelacionados, setDocumentosRelacionados] = React.useState<DocumentoRelacionDTO[]>([]);
  const [verificados, setVerificados] = useState<Set<number>>(new Set());
  const [fechaVencimientoModal, setFechaVencimientoModal] = useState<{ open: boolean; detalleId: number }>({ open: false, detalleId: 0 });
  const [modalDesaplicarOpen, setModalDesaplicarOpen] = useState(false);
  const [modalAnularOpen, setModalAnularOpen] = useState(false);
  const [sucursalDestino, setSucursalDestino] = useState<number | undefined>(undefined);
  const [mostrandoReverso, setMostrandoReverso] = useState(false);
  const [reversoData, setReversoData] = useState<any>(null);
  const [vencimientoPendientes, setVencimientoPendientes] = useState<{ id: number; codigo: string; articulo: string }[]>([]);
  const [vencimientoModalOpen, setVencimientoModalOpen] = useState(false);
  const [vencimientoFechas, setVencimientoFechas] = useState<Record<number, dayjs.Dayjs>>({});
  const monedaDefault = getMonedaSucursalActiva();

  const { message } = App.useApp();
  const operacion = useAplicar();
  const screens = Grid.useBreakpoint();

  const handleRefresh = useCallback(() => {
    if (!id) return;
    setLoadingError(false);
    salidaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
        // Si el documento está anulado y tiene reversoId, cargar el reverso
        if (toEstadoNum(res.estado) === 3 && (res as any).reversoID) {
          salidaAlmacenApi.obtenerPorId(sucursalActiva, (res as any).reversoID)
            .then((revRes) => setReversoData(revRes))
            .catch(() => setReversoData(null));
        } else {
          setReversoData(null);
          setMostrandoReverso(false);
        }
        // Recargar documentos relacionados
        documentoRelacionApi.obtenerPorTransaccion(parseInt(id), sucursalActiva)
          .then(rel => setDocumentosRelacionados(rel || []))
          .catch(() => message.warning('No se pudieron cargar los documentos relacionados'));
        salidaAlmacenApi.verificarScan(sucursalActiva, parseInt(id))
          .then((scanRes) => setTieneScan(scanRes.existe))
          .catch(() => setTieneScan(false));
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar el documento');
        message.error(msg);
        setLoadingError(true);
      })
  }, [id, sucursalActiva, setPageTitleOverride]);

  useEffect(() => {
    setActiveModule(screenCode);
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setLoadingError(false);
    salidaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
        // Si el documento está anulado y tiene reversoId, cargar el reverso
        if (res.estado === 3 && (res as any).reversoID) {
          salidaAlmacenApi.obtenerPorId(sucursalActiva, (res as any).reversoID)
            .then((revRes) => setReversoData(revRes))
            .catch(() => setReversoData(null));
        } else {
          setReversoData(null);
          setMostrandoReverso(false);
        }
        // Verificar si tiene documento escaneado
        salidaAlmacenApi.verificarScan(sucursalActiva, parseInt(id))
          .then((scanRes) => setTieneScan(scanRes.existe))
          .catch(() => setTieneScan(false));
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar el documento');
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  // Actualizar el título del header al alternar entre Original/Reverso
  useEffect(() => {
    if (mostrandoReverso && reversoData) {
      const doc = reversoData as any;
      setPageTitleOverride(`${doc.documento?.codigo || 'SAP'}-${doc.noDocumento || ''}`);
    } else if (data) {
      const doc = data as any;
      setPageTitleOverride(`${doc.documento?.codigo || 'SAP'}-${doc.noDocumento || ''}`);
    }
  }, [mostrandoReverso, reversoData, data, setPageTitleOverride]);

  // Cargar documentos relacionados desde DOCUMENTOS_RELACION
  React.useEffect(() => {
    if (!data?.id) return;
    documentoRelacionApi.obtenerPorTransaccion(data.id, sucursalActiva)
      .then(rel => setDocumentosRelacionados(rel || []))
      .catch(() => {
        setDocumentosRelacionados([]);
        message.warning('No se pudieron cargar los documentos relacionados');
      });
  }, [data?.id, sucursalActiva]);

  const handleVerScanner = async () => {
    if (!id) return;
    setScannerLoading(true);
    try {
      const blob = await salidaAlmacenApi.descargarScan(sucursalActiva, parseInt(id));
      const url = URL.createObjectURL(blob);
      setScannerUrl(url);
      setScannerModalOpen(true);
    } catch {
      message.error('Error al cargar el archivo escaneado');
    } finally {
      setScannerLoading(false);
    }
  };

  const handleFechaVencimiento = (date: dayjs.Dayjs | null) => {
    if (fechaVencimientoModal.detalleId) {
      setData((prev: SalidaAlmacenFullDTO | null) => {
        if (!prev) return prev;
        return {
          ...prev,
          detalles: prev.detalles.map((d: DetalleSalidaAlmacenDTO) => {
            if (d.id !== fechaVencimientoModal.detalleId) return d;
            return { ...d, fechaVencimiento: date ? date.format('YYYY-MM-DD') : undefined };
          }),
        };
      });
    }
    setFechaVencimientoModal({ open: false, detalleId: 0 });
  };

  const handleToggleVerificar = (id: number) => {
    setVerificados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading || (!data && !loadingError)) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando documento...</div>
      </div>
    );
  }
  if (loadingError && !data) {
    return <ErrorDetalle rutaVolver="/FSAP" onRecargar={handleRefresh} />;
  }

  const documentoActivo = mostrandoReverso && reversoData ? reversoData : data;
  const isLarge = screens.xxl === true;
  const estadoInfo = resolveEstado(documentoActivo.estado);
  const esCerrado = toPeriodoNum(documentoActivo.periodo) === 6;

  // ===== Detalles filtrados por búsqueda =====
  const detallesFiltrados = detalleSearch
    ? (data?.detalles || []).filter((d: DetalleSalidaAlmacenDTO) => {
        const q = detalleSearch.toLowerCase();
        return (
          (d.codigo || '').toLowerCase().includes(q) ||
          (d.articulo || '').toLowerCase().includes(q) ||
          (d.referencia || '').toLowerCase().includes(q)
        );
      })
    : (data?.detalles || []);

  const detalleColumns = [
    {
      title: 'Código',
      key: 'codigo',
      width: 100,
      fixed: 'left' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: unknown, record: DetalleSalidaAlmacenDTO) => {
        const verificado = verificados.has(record.id);
        return (
          <div style={{ fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{record.codigo || '-'}</span>
              {verificado ? (
                <CheckCircleFilled style={{ color: '#4fc3f7', fontSize: 14 }} />
              ) : null}
            </div>
            {record.referencia && (
              <Tooltip title={record.referencia}>
                <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                  {record.referencia}
                </div>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: 'Artículo',
      key: 'articulo',
      ellipsis: true,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: unknown, record: DetalleSalidaAlmacenDTO) => (
        <div style={{ fontSize: 13 }}>
          <div>{toTitleCase(record.articulo || '')}</div>
          <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }}>
            {record.familia?.nombre ? <Tag style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>{toTitleCase(record.familia.nombre)}</Tag> : null}
            {record.fechaVencimiento && <span>V: {formatDate(record.fechaVencimiento)}</span>}
          </div>
        </div>
      ),
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 110,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: unknown, record: DetalleSalidaAlmacenDTO) => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div>{formatNumber(record.cantidad || 0)}</div>
          <Tooltip title={record.medida?.nombre || ''}>
            <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, textAlign: 'right', marginTop: 'auto', minHeight: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {record.medida?.nombre || ''}
            </div>
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      width: 110,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: unknown, record: DetalleSalidaAlmacenDTO) => {
        const costoBase = Number(record.costo) || 0;
        const pctDesc = Number(record.porcentajeDescuento) || 0;
        const factor = Number(record.medida?.factor) || 1;
        const costoConDescuento = costoBase - ((costoBase * pctDesc) / 100);
        const costoUnitario = costoConDescuento / factor;
        return (
          <div>
            <div>{formatNumber(costoBase)}</div>
            <div style={{ fontSize: 11, lineHeight: 1.5, color: '#999' }}>
              {formatNumber(costoUnitario)} × {factor}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Descuento',
      key: 'descuento',
      width: 100,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: unknown, record: DetalleSalidaAlmacenDTO) => (
        <div>
          <div>{formatNumber(record.porcentajeDescuento || 0)}%</div>
          <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 2 }}>
            {formatNumber(record.descuento || 0)}
          </div>
        </div>
      ),
    },
    {
      title: 'Impuestos',
      key: 'impuestos',
      width: 140,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: unknown, record: DetalleSalidaAlmacenDTO) => (
        <div>
          <div>{formatNumber(record.impuestos || 0)}</div>
          {record.impuesto?.nombre && (
            <Tooltip title={record.impuesto.nombre}>
              <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {toTitleCase(record.impuesto.nombre)}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 100,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top', paddingRight: 16 } }),
      onHeaderCell: () => ({ style: { paddingRight: 16 } }),
      render: (_: unknown, record: DetalleSalidaAlmacenDTO) => (
        <div>
          <Text strong>{formatNumber(record.total || 0)}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
  ];

  // ===== Asientos e Historial =====
  // asientoColumns reemplazado por AsientosContableTable compartido

  // ===== Handlers de acciones de estado =====
  const handleAplicar = async () => {
    if (!id) return;

    // Verificación temprana del scanner (solo obligatorio si no genera documento derivado)
    if (tieneScan === false && !data?.concepto?.docAGenerar) {
      message.warning('Debe escanear el documento antes de aplicar.');
      return;
    }

    // ===== Validar fechas de vencimiento (solo si el concepto tiene sucursalDestino) =====
    if (data?.concepto?.sucursalDestino && data.detalles?.length) {
      try {
        const codigos = data.detalles.map((d) => d.codigo).filter(Boolean) as string[];
        const codigosConVencimiento = await productoApi.obtenerProductosVencimiento(sucursalActiva, codigos);

        if (codigosConVencimiento.length > 0) {
          // Filtrar detalles que tienen vencimiento pero no tienen fecha
          const pendientes = data.detalles
            .filter((d) => codigosConVencimiento.includes(d.codigo) && !d.fechaVencimiento)
            .map((d) => ({ id: d.id, codigo: d.codigo, articulo: d.articulo }));

          if (pendientes.length > 0) {
            setVencimientoPendientes(pendientes);
            setVencimientoFechas({});
            setVencimientoModalOpen(true);
            return; // Esperar a que el usuario complete las fechas
          }
        }
      } catch (err: any) {
        const msg = err?.response?.data?.errorMessage || 'Error al validar fechas de vencimiento';
        message.warning(msg);
        // No bloquear la aplicación si falla la consulta de vencimiento
      }
    }

    setOperacionTitulo(`Aplicando SAP-${data?.noDocumento || id}`);
    operacion.ejecutar(`/SAP/${sucursalActiva}/aplicar/${id}`, handleRefresh);
  };

  const handleVencimientoConfirm = () => {
    // Actualizar las fechas en los detalles
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        detalles: prev.detalles.map((d) => {
          const fecha = vencimientoFechas[d.id];
          if (!fecha) return d;
          return { ...d, fechaVencimiento: fecha.format('YYYY-MM-DD') };
        }),
      };
    });
    setVencimientoModalOpen(false);
    setVencimientoPendientes([]);
    setVencimientoFechas({});

    // Continuar con la aplicación
    setOperacionTitulo(`Aplicando SAP-${data?.noDocumento || id}`);
    operacion.ejecutar(`/SAP/${sucursalActiva}/aplicar/${id}`, handleRefresh);
  };

  const handleDesaplicarConfirm = async (motivo: string) => {
    if (!id || !data) return;
    try {
      const documento = `${data.documento.codigo || ''}-${data.noDocumento || ''}`;
      await salidaAlmacenApi.desaplicar(sucursalActiva, documento);
      message.success('Documento desaplicado exitosamente');
      setModalDesaplicarOpen(false);
      handleRefresh();
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al desaplicar');
      message.error(msg);
      throw err; // Re-lanzar para que el modal no se cierre en error
    }
  };

  const handleAnularConfirm = async (dataAnular: { fecha: string; motivo: string }) => {
    if (!data || !id) return;
    try {
      // Incluir motivo en el payload de anulación
      const payload = { ...data, motivo: dataAnular.motivo, fechaAnulacion: dataAnular.fecha };
      await salidaAlmacenApi.anular(sucursalActiva, payload);
      message.success('Documento anulado exitosamente');
      setModalAnularOpen(false);
      const res = await salidaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id));
      setData(res);
      if (res.estado === 3 && (res as any).reversoID) {
        const revRes = await salidaAlmacenApi.obtenerPorId(sucursalActiva, (res as any).reversoID);
        setReversoData(revRes);
      } else {
        setReversoData(null);
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al anular');
      message.error(msg);
      throw err; // Re-lanzar para que el modal no se cierre en error
    }
  };

  const handlePostear = () => {
    if (!data) return;
    setOperacionTitulo(`Posteando SAP-${data?.noDocumento || id}`);
    operacion.ejecutar(
      `/SAP/${sucursalActiva}/postear`,
      handleRefresh,
      data
    );
  };

  const handleRevisado = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await salidaAlmacenApi.revisado(sucursalActiva, parseInt(id));
      message.success('Documento marcado como revisado');
      const res = await salidaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al marcar revisado');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReversar = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await salidaAlmacenApi.reversar(sucursalActiva, parseInt(id));
      message.success('Documento reversado exitosamente');
      const res = await salidaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
      if (res.estado === 3 && (res as any).reversoID) {
        const revRes = await salidaAlmacenApi.obtenerPorId(sucursalActiva, (res as any).reversoID);
        setReversoData(revRes);
      } else {
        setReversoData(null);
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al reversar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const imprimirConFormato = async (formato: string) => {
    setImprimiendo(true);
    try {
      const res = await apiClient.post(`/reportes/inventario/salida?formato=${formato}`, data, {
        responseType: 'blob',
      });
      const blobUrl = URL.createObjectURL(res.data);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(blobUrl);
        }, 30000);
      }, 2000);
    } catch {
      message.error('Error al generar el PDF');
    } finally {
      setImprimiendo(false);
    }
  };

  const printMenuItems: MenuProps['items'] = [
    { key: 'consumo', label: 'Salida por Consumo' },
    { key: 'decomiso', label: 'Salida por Decomiso' },
  ];

  const handlePrintMenuClick: MenuProps['onClick'] = ({ key }) => {
    imprimirConFormato(key);
  };

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle de salida de almacén"
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
      <DetalleToolbar
        modulo="FSAP"
        estado={documentoActivo.estado}
        periodo={documentoActivo.periodo}
        revisado={documentoActivo.revisado}
        saving={saving}
        imprimiendo={imprimiendo}
        operacionLoading={operacion?.loading}
        onVolver={() => navigate(-1)}
        showImprimir={false}
        onEditar={() => navigate(`/FSAP/${id}/editar`)}
        confirmActions={true}
        onAplicar={handleAplicar}
        onAnular={async () => setModalAnularOpen(true)}
        onPostear={handlePostear}
        onRevisado={handleRevisado}
        onDesaplicar={async () => setModalDesaplicarOpen(true)}
        onReversar={handleReversar}
        extraButtons={id ? (
          <>
            {toEstadoNum(data?.estado) === 3 && reversoData && (
              <Switch
                checked={mostrandoReverso}
                checkedChildren="Reverso"
                unCheckedChildren="Original"
                onChange={(checked) => setMostrandoReverso(checked)}
                style={{ marginLeft: 8 }}
              />
            )}
            {documentoActivo?.concepto?.sucursalDestino?.codigo ? (
              <PermissionGate accion="IMPRIMIR">
                <Button icon={<PrinterOutlined />} loading={imprimiendo} onClick={() => imprimirConFormato('general')} />
              </PermissionGate>
            ) : (
              <PermissionGate accion="IMPRIMIR">
                <Dropdown menu={{ items: printMenuItems, onClick: handlePrintMenuClick }} trigger={['click']}>
                  <Button icon={<PrinterOutlined />} loading={imprimiendo} />
                </Dropdown>
              </PermissionGate>
            )}
          </>
        ) : undefined}
      />

      {mostrandoReverso && (
        <Alert
          message="Viendo documento de Reverso"
          description="Este documento es el reverso generado al anular el documento original."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {isLarge ? (
        <Row gutter={16}>
          <Col xxl={18}>
            <Card className="paces-card" size="small" title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>
                    Datos Generales
                  </span>
                  <Space>
                    {esCerrado && (
  <Tooltip title="Período contable cerrado">
    <LockFilled style={{ marginLeft: 4, fontSize: 14, color: '#595959' }} />
  </Tooltip>
)}
                    <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
                    {tieneScan === true && (
                      <Tooltip title="Ver documento escaneado">
                        <Tag
                          icon={<FileTextOutlined />}
                          color="success"
                          style={{ cursor: 'pointer' }}
                          onClick={handleVerScanner}
                        />
                      </Tooltip>
                    )}
                    {tieneScan === false && (
                      <Tooltip title="Documento no escaneado">
                        <Tag icon={<FileSearchOutlined />} color="warning" />
                      </Tooltip>
                    )}
                  </Space>
                </div>
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered size="small" column={3} styles={{ content: { background: 'transparent' } }}>
                {/* Fila 1 */}
                <Descriptions.Item label="Documento Generado:">
                  {documentoActivo.documento?.codigo ? `${documentoActivo.documento.codigo}-${documentoActivo.noDocumento}` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Concepto:">
                  {documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-')}
                  <ConceptoInfoLabel concepto={documentoActivo.concepto} />
                </Descriptions.Item>
                <Descriptions.Item label="Tipo:">{documentoActivo.tipo?.nombre || documentoActivo.codigoTipo || '-'}</Descriptions.Item>

                {/* Fila 2 */}
                <Descriptions.Item label="Fecha Doc.:">{formatDate(documentoActivo.fechaDocumento)}</Descriptions.Item>
                <Descriptions.Item label="Entidad:">
                  {documentoActivo.suplidor?.nombre ? toTitleCase(documentoActivo.suplidor.nombre) : (documentoActivo.entidad?.nombre ? toTitleCase(documentoActivo.entidad.nombre) : '-')}
                </Descriptions.Item>
                <Descriptions.Item label="Referencia:">{documentoActivo.referencia || '-'}</Descriptions.Item>

                {/* Fila 3 */}
                <Descriptions.Item label="Fecha Entrega:">{documentoActivo.fechaRecibo ? formatDate(documentoActivo.fechaRecibo) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Almacén:">
                  {documentoActivo.almacen?.nombre ? toTitleCase(documentoActivo.almacen.nombre) : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Sucursal:">
                  <SucursalField codigoSucursal={documentoActivo.codigoSucursal} />
                </Descriptions.Item>

                {/* Fila 4 */}
                <Descriptions.Item label="Nota:" span={3}>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{documentoActivo.nota || '-'}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Tabs
              defaultActiveKey="detalles"
              type="card"
              tabBarExtraContent={
                <Input.Search
                  placeholder="Buscar detalle..."
                  allowClear
                  style={{ width: 320 }}
                  onSearch={(value) => setDetalleSearch(value)}
                  onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                />
              }
              items={[
                {
                  key: 'detalles',
                  label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${documentoActivo.detalles?.length || 0}` : ''})`,
                  children: (
                    <Table dataSource={detallesFiltrados} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 800 }} />
                  ),
                },
                {
                  key: 'asientos',
                  label: `Asientos (${documentoActivo.asientos?.length || 0})`,
                  children: (
                    <AsientosContableTable asientos={documentoActivo.asientos || []} scroll={{ x: 800 }} />
                  ),
                },
                {
                  key: 'historial',
                  label: `Historial (${documentoActivo.logs?.length || 0})`,
                  children: (
                    <LogTable dataSource={documentoActivo.logs || []} scroll={{ x: 800 }} />
                  ),
                },
              ]}
            />
          </Col>

          <Col xxl={6}>
            <EntidadCard entidad={documentoActivo.suplidor} entidadSecundaria={documentoActivo.entidad} fallbackTitulo="Suplidor" />
            <TotalesCard subTotal={documentoActivo.subTotal} descuento={documentoActivo.descuento} impuestos={documentoActivo.impuestos} total={documentoActivo.total} alignRight={false}
              monedaSimbolo={documentoActivo.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={documentoActivo.moneda?.nombre || monedaDefault.nombre}
              tasa={documentoActivo.tasa ?? 1}
            />
            <DocumentosRelacionadosCard
              documentos={documentosRelacionados}
              currentId={data?.id}
            />
          </Col>
        </Row>
      ) : (
        <div>
          <Card className="paces-card" size="small" title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>
                    Datos Generales
                  </span>
                  <Space>
                    {esCerrado && (
  <Tooltip title="Período contable cerrado">
    <LockFilled style={{ marginLeft: 4, fontSize: 14, color: '#595959' }} />
  </Tooltip>
)}
                    <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
                    {tieneScan === true && (
                      <Tooltip title="Ver documento escaneado">
                        <Tag
                          icon={<FileTextOutlined />}
                          color="success"
                          style={{ cursor: 'pointer' }}
                          onClick={handleVerScanner}
                        />
                      </Tooltip>
                    )}
                    {tieneScan === false && (
                      <Tooltip title="Documento no escaneado">
                        <Tag icon={<FileSearchOutlined />} color="warning" />
                      </Tooltip>
                    )}
                  </Space>
                </div>
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered size="small" column={1} styles={{ content: { background: 'transparent' } }}>
                <Descriptions.Item label="Documento Generado:">
                  {documentoActivo.documento?.codigo ? `${documentoActivo.documento.codigo}-${documentoActivo.noDocumento}` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Concepto:">
                  {documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-')}
                  <ConceptoInfoLabel concepto={documentoActivo.concepto} />
                </Descriptions.Item>
                <Descriptions.Item label="Tipo:">{documentoActivo.tipo?.nombre || documentoActivo.codigoTipo || '-'}</Descriptions.Item>
                <Descriptions.Item label="Fecha Doc.:">{formatDate(documentoActivo.fechaDocumento)}</Descriptions.Item>
                <Descriptions.Item label="Entidad:">
                  {documentoActivo.suplidor?.nombre ? toTitleCase(documentoActivo.suplidor.nombre) : (documentoActivo.entidad?.nombre ? toTitleCase(documentoActivo.entidad.nombre) : '-')}
                </Descriptions.Item>
                <Descriptions.Item label="Referencia:">{documentoActivo.referencia || '-'}</Descriptions.Item>
                <Descriptions.Item label="Fecha Entrega:">{documentoActivo.fechaRecibo ? formatDate(documentoActivo.fechaRecibo) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Almacén:">
                  {documentoActivo.almacen?.nombre ? toTitleCase(documentoActivo.almacen.nombre) : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Sucursal:">
                  <SucursalField codigoSucursal={documentoActivo.codigoSucursal} />
                </Descriptions.Item>
                <Descriptions.Item label="Nota:">
                  <span style={{ whiteSpace: 'pre-wrap' }}>{documentoActivo.nota || '-'}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Tabs
              defaultActiveKey="detalles"
              type="card"
              tabBarExtraContent={
                <Input.Search
                  placeholder="Buscar detalle..."
                  allowClear
                  style={{ width: 320 }}
                  onSearch={(value) => setDetalleSearch(value)}
                  onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                />
              }
              items={[
                {
                  key: 'detalles',
                  label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${documentoActivo.detalles?.length || 0}` : ''})`,
                  children: (
                    <Table dataSource={detallesFiltrados} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 800 }} />
                  ),
                },
                {
                  key: 'asientos',
                  label: `Asientos (${documentoActivo.asientos?.length || 0})`,
                  children: (
                    <AsientosContableTable asientos={documentoActivo.asientos || []} scroll={{ x: 800 }} />
                  ),
                },
                {
                  key: 'historial',
                  label: `Historial (${documentoActivo.logs?.length || 0})`,
                  children: (
                    <LogTable dataSource={documentoActivo.logs || []} scroll={{ x: 800 }} />
                  ),
                },
              ]}
            />

          <div style={{ marginTop: 24 }}>
            <TotalesCard subTotal={documentoActivo.subTotal} descuento={documentoActivo.descuento} impuestos={documentoActivo.impuestos} total={documentoActivo.total} alignRight={true}
              monedaSimbolo={documentoActivo.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={documentoActivo.moneda?.nombre || monedaDefault.nombre}
              tasa={documentoActivo.tasa ?? 1}
            />

          <DocumentosRelacionadosCard
            documentos={documentosRelacionados}
            currentId={data?.id}
          />
          </div>
        </div>
      )}

      {/* Modal Desaplicar */}
      <ModalDesaplicar
        open={modalDesaplicarOpen}
        onClose={() => setModalDesaplicarOpen(false)}
        onConfirm={handleDesaplicarConfirm}
        tituloDocumento={data ? `${data.documento.codigo}-${data.noDocumento}` : undefined}
        loading={saving}
      />

      {/* Modal Anular */}
      <ModalAnular
        open={modalAnularOpen}
        onClose={() => setModalAnularOpen(false)}
        onConfirm={handleAnularConfirm}
        documento={data ? `${data.documento.codigo}-${data.noDocumento}` : ''}
        fechaDocumento={data?.fechaDocumento || ''}
        periodoCerrado={toPeriodoNum(data?.periodo) === 6}
      />

      {/* Modal de Fecha de Vencimiento */}
      <Modal
        title="Fecha de Vencimiento"
        open={fechaVencimientoModal.open}
        onCancel={() => setFechaVencimientoModal({ open: false, detalleId: 0 })}
        onOk={() => setFechaVencimientoModal({ open: false, detalleId: 0 })}
        footer={null}
        destroyOnHidden
      >
        <DatePicker
          style={{ width: '100%' }}
          format="YYYY-MM-DD"
          onChange={handleFechaVencimiento}
        />
      </Modal>

      {/* Modal de Visor de Scanner */}
      <Modal
        title="Documento Escaneado"
        open={scannerModalOpen}
        onCancel={() => { setScannerModalOpen(false); if (scannerUrl) URL.revokeObjectURL(scannerUrl); setScannerUrl(null); }}
        width="80%"
        style={{ top: 20 }}
        footer={null}
        destroyOnHidden
      >
        {scannerLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : scannerUrl ? (
          <iframe src={scannerUrl} style={{ width: '100%', height: '70vh', border: 'none' }} title="Scanner" />
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        )}
      </Modal>

      {/* Modal de Fechas de Vencimiento Requeridas */}
      <Modal
        title="Fechas de Vencimiento Requeridas"
        open={vencimientoModalOpen}
        onCancel={() => { setVencimientoModalOpen(false); setVencimientoPendientes([]); setVencimientoFechas({}); }}
        width={520}
        destroyOnHidden
        maskClosable={false}
        footer={
          <Space>
            <Button onClick={() => { setVencimientoModalOpen(false); setVencimientoPendientes([]); setVencimientoFechas({}); }}>
              Cancelar
            </Button>
            <Button
              type="primary"
              disabled={vencimientoPendientes.some((p) => !vencimientoFechas[p.id])}
              onClick={handleVencimientoConfirm}
            >
              Aplicar
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Text>Los siguientes productos requieren fecha de vencimiento:</Text>
        </div>
        {vencimientoPendientes.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{p.codigo}</div>
              <div className="paces-text-secondary" style={{ fontSize: 12 }}>{p.articulo}</div>
            </div>
            <DatePicker
              style={{ width: 160 }}
              format="YYYY-MM-DD"
              value={vencimientoFechas[p.id] || null}
              onChange={(date) => {
                setVencimientoFechas((prev) => ({
                  ...prev,
                  [p.id]: date || undefined as any,
                }));
              }}
              disabledDate={(current) => current && current.isBefore(dayjs(), 'day')}
            />
          </div>
        ))}
      </Modal>

      {/* Modal de Progreso para Aplicar/Postear */}
      <ModalProgreso
        open={operacion.loading || !!operacion.completado}
        titulo={operacionTitulo}
        eventos={operacion.eventos}
        completado={operacion.completado}
        onClose={() => operacion.reset()}
      />
    </div>
  );
};

export default SalidaAlmacenDetalle;
