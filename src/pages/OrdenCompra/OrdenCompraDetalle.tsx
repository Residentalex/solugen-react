import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Input, Modal, Typography, Tooltip, Alert, App,
  Drawer, Avatar, Skeleton, Empty,
} from 'antd';
import {
  LockFilled,
  FileTextOutlined,
  FileSearchOutlined,
  IdcardOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  ShopOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import DetalleToolbar from '../../components/DetalleToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { ordenCompraApi } from '../../api/ordenCompraApi';
import { entradaAlmacenApi } from '../../api/entradaAlmacenApi';
import { documentoRelacionApi, type DocumentoRelacionDTO } from '../../api/documentoRelacionApi';
import SucursalField from '../../components/SucursalField';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import { formatCurrency, formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import ErrorDetalle from '../../components/ErrorDetalle';
import PermissionGate from '../../components/PermissionGate';

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

// ===== Componente principal =====

const OrdenCompraDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const { screenCode, documentCode } = useScreenConfig();
  const screens = Grid.useBreakpoint();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');
  const [tieneScan, setTieneScan] = useState<boolean | null>(null);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [scannerUrl, setScannerUrl] = useState<string | null>(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [documentosRelacionados, setDocumentosRelacionados] = useState<DocumentoRelacionDTO[]>([]);
  const monedaDefault = getMonedaSucursalActiva();

  const operacion = useAplicar();
  const [operacionTitulo, setOperacionTitulo] = useState('');

  const { message } = App.useApp();
  const [sucursalDestino, setSucursalDestino] = useState<number | undefined>(undefined);

  // Análisis / monitor (igual que en GeneradorORCDetalle)
  const [analisisOpen, setAnalisisOpen] = useState(false);
  const [analisisDetalle, setAnalisisDetalle] = useState<any>(null);
  const [analisisData, setAnalisisData] = useState<Array<{
    sucursal: number;
    sucursalNombre: string;
    codigo: string;
    nombre: string;
    fecha: string;
    documento: string;
    cantidad: number;
    resumen?: { ventasSinComponentes: number; ventasConComponentes: number; salidas: number; devolucionesCompra: number; devolucionesVenta: number; ultimaVentaFecha?: string };
  }>>([]);
  const [analisisLoading, setAnalisisLoading] = useState(false);
  const [analisisError, setAnalisisError] = useState(false);
  const [analisisResumenLoading, setAnalisisResumenLoading] = useState(false);

  // Modal movimientos
  const [movimientosModalOpen, setMovimientosModalOpen] = useState(false);
  const [movimientosSucursal, setMovimientosSucursal] = useState<string>('');
  const [movimientosData, setMovimientosData] = useState<Array<{
    transacid: number;
    tipoDocumento: string;
    fecha: string;
    documento: string;
    cantidad: number;
    descripcion: string;
  }>>([]);
  const [movimientosLoading, setMovimientosLoading] = useState(false);

  // ===== Carga de documentos relacionados =====
  useEffect(() => {
    if (!data?.id) return;
    documentoRelacionApi.obtenerPorTransaccion(data.id)
      .then((rel) => setDocumentosRelacionados(rel || []))
      .catch(() => {
        setDocumentosRelacionados([]);
        message.warning('No se pudieron cargar los documentos relacionados');
      });
  }, [data?.id]);

  // ===== handleRefresh =====
  const handleRefresh = useCallback(() => {
    if (!id) return;
    setLoadingError(false);
    ordenCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res: any) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`ORC-${res.noDocumento || id}`);
        // Cargar documentos relacionados desde DOCUMENTOS_RELACION
        documentoRelacionApi.obtenerPorTransaccion(parseInt(id))
          .then(rel => setDocumentosRelacionados(rel || []))
          .catch(() => setDocumentosRelacionados([]));
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al recargar');
        message.error(msg);
        setLoadingError(true);
      })
  }, [id, sucursalActiva, setPageTitleOverride]);

  // ===== Handlers de acciones de estado =====

  const handleDesaplicar = async () => {
    if (!id || !data) return;
    setSaving(true);
    try {
      const documento = `ORC-${data.noDocumento}`;
      await ordenCompraApi.desaplicar(sucursalActiva, documento);
      message.success('Documento desaplicado exitosamente');
      handleRefresh();
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al desaplicar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAplicar = () => {
    if (!id) return;
    setOperacionTitulo(`Aplicando ORC-${data?.noDocumento || id}`);
    operacion.ejecutar(
      `/ORC/${sucursalActiva}/aplicar/${id}`,
      handleRefresh
    );
  };

  const handleAnular = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await ordenCompraApi.anular(sucursalActiva, data as any);
      message.success('Documento anulado exitosamente');
      const res = await ordenCompraApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al anular');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePostear = () => {
    if (!data) return;
    setOperacionTitulo(`Posteando ORC-${data?.noDocumento || id}`);
    operacion.ejecutar(
      `/ORC/${sucursalActiva}/postear`,
      handleRefresh,
      data
    );
  };

  const handleRevisado = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await ordenCompraApi.revisado(sucursalActiva, parseInt(id));
      message.success('Documento marcado como revisado');
      const res = await ordenCompraApi.obtenerPorId(sucursalActiva, parseInt(id!));
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
      await ordenCompraApi.reversar(sucursalActiva, parseInt(id));
      message.success('Documento reversado exitosamente');
      const res = await ordenCompraApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al reversar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleVerScanner = async () => {
    if (!id) return;
    setScannerLoading(true);
    try {
      const blob = await ordenCompraApi.descargarScan(sucursalActiva, parseInt(id));
      const url = URL.createObjectURL(blob);
      setScannerUrl(url);
      setScannerModalOpen(true);
    } catch {
      message.error('Error al cargar el archivo escaneado');
    } finally {
      setScannerLoading(false);
    }
  };

  // ===== Efectos de ciclo de vida =====

  useEffect(() => {
    setActiveModule(screenCode);
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    ordenCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res: any) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`ORC-${res.noDocumento || id}`);
        // Verificar scan
        ordenCompraApi.verificarScan(sucursalActiva, parseInt(id))
          .then((scanRes) => setTieneScan(scanRes.existe))
          .catch(() => setTieneScan(false));
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar la orden de compra');
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  // Efecto: cargar análisis cuando se abre el Drawer
  useEffect(() => {
    if (!analisisOpen || !analisisDetalle) return;

    const SUCURSALES = [
      { id: 0, nombre: 'OP' },
      { id: 1, nombre: 'HR' },
      { id: 2, nombre: 'VH' },
    ];

    setAnalisisData([]);
    setAnalisisLoading(true);
    setAnalisisError(false);

    // Fase 1: 3 llamadas paralelas (una por sucursal)
    Promise.allSettled(
      SUCURSALES.map((s) =>
        entradaAlmacenApi.obtenerUltimasEntradasPorSucursal(s.id, analisisDetalle.codigo)
          .then((data) => {
            if (data && data.length > 0) {
              const item = data[0];
              return { ...item, sucursal: s.id, sucursalNombre: s.nombre };
            }
            return { sucursal: s.id, sucursalNombre: s.nombre, codigo: analisisDetalle.codigo, nombre: '', fecha: null as any, documento: '', cantidad: 0 };
          })
          .catch(() => ({
            sucursal: s.id, sucursalNombre: s.nombre, codigo: analisisDetalle.codigo, nombre: '', fecha: null as any, documento: '', cantidad: 0
          }))
      )
    ).then((results) => {
      const datos = results
        .map((r) => (r.status === 'fulfilled' ? r.value : null))
        .filter((d): d is NonNullable<typeof d> => d !== null);
      setAnalisisData(datos);
      setAnalisisLoading(false);

      // Fase 2: resumen movimientos para las que sí tienen fecha
      const conDatos = datos.filter((d) => d?.fecha);
      if (conDatos.length > 0) {
        setAnalisisResumenLoading(true);
        Promise.allSettled(
          conDatos.map((item) =>
            entradaAlmacenApi.obtenerResumenMovimientosPosteriores(
              item.sucursal, analisisDetalle.codigo, dayjs(item.fecha).format('YYYYMMDDHHmmss'), item.sucursal
            )
            .then((resumen) => ({ sucursal: item.sucursal, resumen }))
            .catch(() => ({ sucursal: item.sucursal, resumen: null }))
          )
        ).then((res) => {
          setAnalisisData((prev) =>
            prev.map((item) => {
              const found = res.find(
                (r) => r.status === 'fulfilled' && r.value?.sucursal === item?.sucursal
              );
              return found?.status === 'fulfilled' && found.value?.resumen
                ? { ...item, resumen: found.value.resumen }
                : item;
            })
          );
          setAnalisisResumenLoading(false);
        });
      }
    }).catch(() => {
      setAnalisisError(true);
      setAnalisisLoading(false);
    });
  }, [analisisOpen, analisisDetalle]);

  // Handler: ver movimientos en modal
  const handleVerMovimientos = useCallback(async (item: typeof analisisData[0]) => {
    if (!analisisDetalle) return;
    setMovimientosSucursal(item.sucursalNombre);
    setMovimientosModalOpen(true);
    setMovimientosLoading(true);
    setMovimientosData([]);
    try {
      const data = await entradaAlmacenApi.obtenerDetalleMovimientosPosteriores(
        item.sucursal,
        analisisDetalle.codigo,
        dayjs(item.fecha).format('YYYYMMDDHHmmss'),
        item.sucursal
      );
      setMovimientosData(data ?? []);
    } catch {
      message.error('Error al cargar movimientos');
      setMovimientosData([]);
    } finally {
      setMovimientosLoading(false);
    }
  }, [analisisDetalle]);

  // ===== Early returns =====

  if (loading || (!data && !loadingError)) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando orden de compra...</div>
      </div>
    );
  }

  if (loadingError && !data) { return <ErrorDetalle rutaVolver="/FORC" onRecargar={handleRefresh} />; }

  // ===== Cálculos derivados =====

  const isLarge = screens.xxl === true;
  const estadoInfo = ESTADO_DOCUMENTO_MAP[toEstadoNum(data.estado)] || { label: 'Desconocido', color: 'default' };
  const esCerrado = toPeriodoNum(data.periodo) === 6;

  const detallesFiltrados = detalleSearch
    ? (data.detalles || []).filter((d: any) => {
        const q = detalleSearch.toLowerCase();
        return (
          (d.codigo || '').toLowerCase().includes(q) ||
          (d.articulo || '').toLowerCase().includes(q) ||
          (d.referencia || '').toLowerCase().includes(q)
        );
      })
    : (data.detalles || []);

  // ===== Columnas de tablas =====

  const detalleColumns = [
    {
      title: 'Código',
      key: 'codigo',
      width: 120,
      fixed: 'left' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13 }}>
          <div>{record.codigo || '-'}</div>
          {record.referencia && (
            <Tooltip title={record.referencia}>
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                {record.referencia}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Artículo',
      key: 'articulo',
      onCell: () => ({ style: { verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' } }),
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, fontSize: 13, wordBreak: 'break-word', whiteSpace: 'normal', overflowWrap: 'break-word' }}>{toTitleCase(record.articulo || '')}</div>
            <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5 }}>
              <span>{record.codigo}</span>
              {record.codigo && record.referencia && <span>{' | '}</span>}
              {record.referencia && <span>{record.referencia}</span>}
            </div>
            <div style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              {record.familia?.nombre ? <Tag style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px', margin: 0 }}>{toTitleCase(record.familia.nombre)}</Tag> : null}
              {record.fechaVencimiento && <span style={{ color: '#8c8c8c' }}>V: {formatDate(record.fechaVencimiento)}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <PermissionGate permisoEspecial="pe_ver_analisis_compra">
              <EyeOutlined
                style={{ cursor: 'pointer', marginTop: 2, color: 'var(--paces-primary)', fontSize: 14 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setAnalisisDetalle(record);
                  setAnalisisOpen(true);
                }}
              />
            </PermissionGate>
            {record.ultimaCompraFecha && (
              (() => {
                const diffDias = dayjs().diff(dayjs(record.ultimaCompraFecha), 'day');
                if (diffDias > 30) {
                  return (
                    <Tooltip title={`Última compra: ${formatDate(record.ultimaCompraFecha)} (${diffDias} días)`}>
                      <ClockCircleOutlined
                        style={{ color: '#fa8c16', cursor: 'pointer', marginTop: 2, fontSize: 14 }}
                      />
                    </Tooltip>
                  );
                }
                return null;
              })()
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div>
          <div>{formatNumber(record.cantidad || 0)}</div>
          {record.medida?.nombre && (
            <Tooltip title={record.medida.nombre}>
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {record.medida.nombre}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Costo',
      key: 'costo',
      width: 130,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: any) => {
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
      title: 'SubTotal',
      dataIndex: 'subTotal',
      key: 'subTotal',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: any) => (
        <div>
          <div>{formatNumber(record.subTotal || 0)}</div>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
    {
      title: 'Descuento',
      key: 'descuento',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: any) => (
        <div>
          <div>{formatNumber(record.descuento || 0)}</div>
          {record.porcentajeDescuento ? <div className="paces-text-secondary" style={{ fontSize: 11 }}>({formatNumber(record.porcentajeDescuento)}%)</div> : null}
        </div>
      ),
    },
    {
      title: 'Total',
      key: 'total',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top', paddingRight: 16 } }),
      onHeaderCell: () => ({ style: { paddingRight: 16 } }),
      render: (_: any, record: any) => (
        <div>
          <Text strong>{formatNumber(record.total || 0)}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
  ];

  // asientoColumns reemplazado por AsientosContableTable compartido

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle de orden de compra"
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
        modulo="FORC"
        estado={data.estado}
        periodo={data.periodo}
        revisado={data.revisado}
        saving={saving}
        operacionLoading={operacion?.loading}
        onVolver={() => navigate(-1)}
        onEditar={() => navigate(`/FORC/${id}/editar`)}
        onAplicar={handleAplicar}
        onAnular={handleAnular}
        onPostear={handlePostear}
        onRevisado={handleRevisado}
        onDesaplicar={handleDesaplicar}
        onReversar={handleReversar}
        showImprimir={false}
      />

      {isLarge ? (
        /* === DESKTOP LAYOUT (≥ lg) === */
        <Row gutter={16}>
          <Col xxl={18}>
            <Card className="paces-card" size="small" title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
                <Space>
                  {esCerrado && (
                    <Tooltip title="Período contable cerrado">
                      <LockFilled style={{ fontSize: 14, color: '#595959' }} />
                    </Tooltip>
                  )}
                  <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
                  {tieneScan === true && (
                    <Tooltip title="Ver factura escaneada">
                      <Tag
                        icon={<FileTextOutlined />}
                        color="success"
                        style={{ cursor: 'pointer' }}
                        onClick={handleVerScanner}
                      />
                    </Tooltip>
                  )}
                  {tieneScan === false && <Tag icon={<FileSearchOutlined />} color="warning" />}
                </Space>
              </div>
            } style={{ marginBottom: 16 }}>
              <Descriptions bordered size="small" column={3} styles={{ content: { background: 'transparent' } }}>
                <Descriptions.Item label="Fecha">
                  {formatDate(data.fechaDocumento)}
                </Descriptions.Item>
                <Descriptions.Item label="Concepto">
                  {data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : (data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-')}
                  <ConceptoInfoLabel concepto={data.concepto} />
                </Descriptions.Item>
                <Descriptions.Item label="Sucursal">
                  <SucursalField codigoSucursal={data.codigoSucursal} sucursal={data.sucursal} />
                </Descriptions.Item>
                {data.nota && (
                  <Descriptions.Item label="Nota" span={3}>
                    <span style={{ whiteSpace: 'pre-wrap' }}>{data.nota}</span>
                  </Descriptions.Item>
                )}
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
                  label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${data.detalles?.length || 0}` : ''})`,
                  children: (
                    <Table dataSource={detallesFiltrados} columns={detalleColumns} rowKey={(r: any) => r.id || r.codigo} size="small" pagination={false} scroll={{ x: 1100 }} />
                  ),
                },
                {
                  key: 'asientos',
                  label: `Asientos (${data.asientos?.length || 0})`,
                  children: (
                    <AsientosContableTable asientos={data.asientos || []} scroll={{ x: 700 }} />
                  ),
                },
                {
                  key: 'historial',
                  label: `Historial (${data.logs?.length || 0})`,
                  children: (
                    <LogTable dataSource={data.logs || []} scroll={{ x: 900 }} />
                  ),
                },
              ]}
            />
          </Col>

          <Col xxl={6}>
            <EntidadCard entidad={data.suplidor} fallbackTitulo="Suplidor" />
            <TotalesCard subTotal={data.subTotal || 0} descuento={data.descuento || 0} impuestos={data.impuestos || 0} total={data.total || 0} alignRight={false}
              monedaSimbolo={data.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={data.moneda?.nombre || monedaDefault.nombre}
              tasa={data.tasa ?? 1}
            />
            <DocumentosRelacionadosCard
              documentos={documentosRelacionados}
              currentId={data?.id}
            />
          </Col>
        </Row>
      ) : (
        /* === MOBILE LAYOUT (< lg) === */
        <div>
          <Card className="paces-card" size="small" title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
              <Space>
                {esCerrado && (
                  <Tooltip title="Período contable cerrado">
                    <LockFilled style={{ fontSize: 14, color: '#595959' }} />
                  </Tooltip>
                )}
                <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
                {tieneScan === true && (
                  <Tooltip title="Ver factura escaneada">
                    <Tag
                      icon={<FileTextOutlined />}
                      color="success"
                      style={{ cursor: 'pointer' }}
                      onClick={handleVerScanner}
                    />
                  </Tooltip>
                )}
                {tieneScan === false && <Tag icon={<FileSearchOutlined />} color="warning" />}
              </Space>
            </div>
          } style={{ marginBottom: 16 }}>
            <Descriptions bordered size="small" column={1} styles={{ content: { background: 'transparent' } }}>
              <Descriptions.Item label="Fecha">
                {formatDate(data.fechaDocumento)}
              </Descriptions.Item>
              <Descriptions.Item label="Concepto">
                {data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : (data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-')}
                <ConceptoInfoLabel concepto={data.concepto} />
              </Descriptions.Item>
              <Descriptions.Item label="Sucursal">
                <SucursalField codigoSucursal={data.codigoSucursal} sucursal={data.sucursal} />
              </Descriptions.Item>
              {data.nota && (
                <Descriptions.Item label="Nota" span={1}>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{data.nota}</span>
                </Descriptions.Item>
              )}
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
                label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${data.detalles?.length || 0}` : ''})`,
                children: (
                  <Table dataSource={detallesFiltrados} columns={detalleColumns} rowKey={(r: any) => r.id || r.codigo} size="small" pagination={false} scroll={{ x: 1100 }} />
                ),
              },
              {
                key: 'asientos',
                label: `Asientos (${data.asientos?.length || 0})`,
                children: <AsientosContableTable asientos={data.asientos || []} scroll={{ x: 700 }} />,
              },
              {
                key: 'historial',
                label: `Historial (${data.logs?.length || 0})`,
                children: <LogTable dataSource={data.logs || []} scroll={{ x: 900 }} />,
              },
            ]}
          />

          <div style={{ marginTop: 24 }}>
            <TotalesCard subTotal={data.subTotal || 0} descuento={data.descuento || 0} impuestos={data.impuestos || 0} total={data.total || 0} alignRight={true}
              monedaSimbolo={data.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={data.moneda?.nombre || monedaDefault.nombre}
              tasa={data.tasa ?? 1}
            />

          <DocumentosRelacionadosCard
            documentos={documentosRelacionados}
            currentId={data?.id}
          />
          </div>
        </div>
      )}

      {/* ===== Monitor de Análisis (Drawer) ===== */}
      <Drawer
        title={
          <Space>
            <BarChartOutlined style={{ color: 'var(--paces-primary)' }} />
            <span style={{ fontWeight: 600 }}>Análisis de Producto</span>
          </Space>
        }
        placement="right"
        width={520}
        open={analisisOpen}
        onClose={() => setAnalisisOpen(false)}
      >
        {analisisDetalle && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* SECCIÓN A — Identidad del producto */}
            <Space align="start" size={12} style={{ marginBottom: 16, width: '100%' }}>
              <Avatar size={40} style={{ backgroundColor: 'rgba(85,110,230,0.12)', color: 'var(--paces-primary)', fontWeight: 600, flexShrink: 0 }}>
                {(analisisDetalle?.articulo || '?')[0].toUpperCase()}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Title level={5} style={{ margin: 0 }}>{toTitleCase(analisisDetalle?.articulo || '')}</Typography.Title>
                <Typography.Text className="paces-text-secondary" style={{ fontSize: 12 }}>
                  Código: {analisisDetalle?.codigo}
                  {analisisDetalle?.referencia ? <span> · Ref: {analisisDetalle.referencia}</span> : ''}
                  {analisisDetalle?.medida?.nombre ? <span> · Medida: {analisisDetalle.medida.nombre}</span> : ''}
                </Typography.Text>
              </div>
            </Space>
            <Divider style={{ margin: '0 0 16px 0' }} />

            {/* SECCIÓN B — Última Entrada por sucursal */}
            {analisisError ? (
              <Alert type="error" message="Error al cargar datos" style={{ marginBottom: 16 }}
                action={<Button size="small" onClick={() => { setAnalisisOpen(false); setTimeout(() => setAnalisisOpen(true), 100); }}><ReloadOutlined />Reintentar</Button>} />
            ) : analisisLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} style={{ marginBottom: 16 }} />
            ) : analisisData.length > 0 ? (
              <>
              {analisisData.some((d) => d.resumen) && (
                <Card
                  className="paces-card"
                  size="small"
                  style={{
                    borderRadius: 6,
                    border: '1px solid #d9d9d9',
                    borderTop: '3px solid #556ee6',
                    background: 'rgba(85,110,230,0.04)',
                    marginBottom: 12,
                  }}
                >
                  <Typography.Text strong style={{ fontSize: 12, color: '#556ee6', display: 'block', marginBottom: 6 }}>
                    📊 Resumen total
                  </Typography.Text>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                    {(() => {
                      const totales = analisisData.reduce(
                        (acc, item) => {
                          const r = item.resumen;
                          if (!r) return acc;
                          return {
                            ventasSinComponentes: acc.ventasSinComponentes + (r.ventasSinComponentes || 0),
                            ventasConComponentes: acc.ventasConComponentes + (r.ventasConComponentes || 0),
                            salidas: acc.salidas + (r.salidas || 0),
                            devCompra: acc.devCompra + (r.devolucionesCompra || 0),
                            devVenta: acc.devVenta + (r.devolucionesVenta || 0),
                          };
                        },
                        { ventasSinComponentes: 0, ventasConComponentes: 0, salidas: 0, devCompra: 0, devVenta: 0 }
                      );
                      return [
                        { label: 'Ventas (sin comp.)', value: totales.ventasSinComponentes },
                        { label: 'Ventas (con comp.)', value: totales.ventasConComponentes },
                        { label: 'Salidas', value: totales.salidas },
                        { label: 'Dev. Compra', value: totales.devCompra },
                        { label: 'Dev. Venta', value: totales.devVenta },
                      ].map((kpi) => (
                        <div key={kpi.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <Typography.Text style={{ fontSize: 12, color: '#8c8c8c' }}>{kpi.label}</Typography.Text>
                          <Typography.Text strong style={{ fontSize: 14, color: '#556ee6' }}>
                            {formatNumber(kpi.value)}
                          </Typography.Text>
                        </div>
                      ));
                    })()}
                  </div>
                </Card>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {analisisData.map((item) => {
                  const SUCURSAL_COLORS: Record<number, { color: string; bg: string }> = {
                    0: { color: '#1677ff', bg: 'rgba(22,119,255,0.06)' },
                    1: { color: '#52c41a', bg: 'rgba(82,196,26,0.06)' },
                    2: { color: '#fa8c16', bg: 'rgba(250,140,22,0.06)' },
                  };
                  const style = SUCURSAL_COLORS[item.sucursal] || { color: '#556ee6', bg: 'rgba(85,110,230,0.06)' };
                  const sinRegistro = !item.fecha;

                  return (
                    <Card
                      key={item.sucursal}
                      className="paces-card"
                      size="small"
                      style={{
                        borderRadius: 6,
                        border: '1px solid #f0f0f0',
                        borderTop: `3px solid ${style.color}`,
                        background: style.bg,
                      }}
                    >
                      {/* Header: nombre sucursal */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Space>
                          <ShopOutlined style={{ color: style.color, fontSize: 15 }} />
                          <Typography.Text strong style={{ fontSize: 13, color: style.color }}>{item.sucursalNombre}</Typography.Text>
                          {sinRegistro && <Tag color="default" style={{ margin: 0, fontSize: 10 }}>Sin compras</Tag>}
                        </Space>
                        {!sinRegistro && (
                          <Button
                            type="link"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleVerMovimientos(item)}
                            style={{ fontSize: 12 }}
                          >
                            Ver movimientos →
                          </Button>
                        )}
                      </div>

                      {!sinRegistro ? (
                        <>
                          {/* BLOQUE 1: Última compra */}
                          <div style={{ marginBottom: 10 }}>
                            <Typography.Text strong style={{ fontSize: 12, color: '#262626', display: 'block', marginBottom: 6 }}>
                              📦 Última compra  <Typography.Text strong style={{ fontSize: 13, color: '#556ee6' }}>{item.fecha ? formatDate(item.fecha) : '-'}</Typography.Text>
                            </Typography.Text>
                            <div style={{ marginTop: 8 }}>
                              <Typography.Text style={{ fontSize: 12, color: '#8c8c8c', marginRight: 8 }}>
                                {item.documento}
                              </Typography.Text>
                              <Tag color="blue" style={{ fontSize: 11 }}>{formatNumber(item.cantidad)}</Tag>
                            </div>
                          </div>

                          {/* Divider punteado */}
                          <div style={{ borderTop: '1px dashed #e8e8e8', marginBottom: 10 }} />

                          {/* BLOQUE 2: Movimientos posteriores */}
                          <div style={{ marginBottom: 10 }}>
                            <Typography.Text strong style={{ fontSize: 12, color: '#262626', display: 'block', marginBottom: 6 }}>
                              📊 Movimientos posteriores
                            </Typography.Text>

                            {/* Grid 2x2 de KPIs */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', marginBottom: 6 }}>
                              {[
                                { label: 'Ventas (sin comp.)', value: item.resumen?.ventasSinComponentes },
                                { label: 'Ventas (con comp.)', value: item.resumen?.ventasConComponentes },
                                { label: 'Salidas', value: item.resumen?.salidas },
                                { label: 'Dev. Compra', value: item.resumen?.devolucionesCompra },
                                { label: 'Dev. Venta', value: item.resumen?.devolucionesVenta },
                              ].map((kpi) => (
                                <div key={kpi.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                  <Typography.Text style={{ fontSize: 12, color: '#8c8c8c' }}>{kpi.label}</Typography.Text>
                                  {kpi.value !== undefined ? (
                                    <Typography.Text strong style={{ fontSize: 14, color: style.color }}>
                                      {formatNumber(kpi.value)}
                                    </Typography.Text>
                                  ) : analisisResumenLoading ? (
                                    <Skeleton.Input active size="small" style={{ width: 30, height: 16 }} />
                                  ) : (
                                    <Typography.Text style={{ fontSize: 13 }}>0</Typography.Text>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Última venta */}
                            {item.resumen?.ultimaVentaFecha && (
                              <div style={{ background: 'rgba(85,110,230,0.04)', borderRadius: 4, padding: '6px 8px', marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography.Text style={{ fontSize: 11, color: '#595959' }}>
                                  🕐 Última venta: {formatDate(item.resumen.ultimaVentaFecha)}
                                </Typography.Text>
                                <Typography.Text style={{ fontSize: 11, color: '#8c8c8c', fontStyle: 'italic' }}>
                                  {(() => {
                                    const diffDias = dayjs(item.resumen!.ultimaVentaFecha).diff(dayjs(item.fecha), 'day');
                                    if (diffDias === 0) return 'hoy';
                                    if (diffDias === 1) return 'hace 1 día';
                                    if (diffDias < 30) return `hace ${diffDias} días`;
                                    const diffMeses = Math.floor(diffDias / 30);
                                    if (diffMeses === 1) return 'hace 1 mes';
                                    if (diffMeses < 12) return `hace ${diffMeses} meses`;
                                    const diffAnios = Math.floor(diffDias / 365);
                                    if (diffAnios === 1) return 'hace 1 año';
                                    return `hace ${diffAnios} años`;
                                  })()}
                                </Typography.Text>
                              </div>
                            )}
                          </div>


                        </>
                      ) : (
                        <Typography.Text className="paces-text-secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
                          No hay registros de compra para esta sucursal.
                        </Typography.Text>
                      )}
                    </Card>
                  );
                })}
              </div>


            </>
            ) : (
              <Alert type="info" message="No se encontraron entradas para este producto" style={{ marginBottom: 16 }} />
            )}

            {/* SECCIÓN C — Costos y Precio */}
            <Divider orientation="left" style={{ fontSize: 12, color: '#8c8c8c' }}>Costos y Precio</Divider>
            <div style={{ background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0', padding: '12px 0', marginBottom: 16 }}>
              <Row gutter={0}>
                <Col span={8} style={{ borderRight: '1px solid #f0f0f0', textAlign: 'center' }}>
                  <Typography.Text className="paces-text-secondary" style={{ fontSize: 11, display: 'block' }}>Costo</Typography.Text>
                  <Typography.Text strong style={{ fontSize: 16, color: 'var(--paces-primary)' }}>
                    {formatNumber(analisisDetalle?.costo || 0)}
                  </Typography.Text>
                </Col>
                <Col span={8} style={{ borderRight: '1px solid #f0f0f0', textAlign: 'center' }}>
                  <Typography.Text className="paces-text-secondary" style={{ fontSize: 11, display: 'block' }}>Margen %</Typography.Text>
                  <Typography.Text strong style={{ fontSize: 16, color: (analisisDetalle?.margen || 0) > 0 ? '#34c38f' : '#ff4d4f' }}>
                    {(analisisDetalle?.margen || 0).toFixed(2)}%
                  </Typography.Text>
                </Col>
                <Col span={8} style={{ textAlign: 'center' }}>
                  <Typography.Text className="paces-text-secondary" style={{ fontSize: 11, display: 'block' }}>Precio</Typography.Text>
                  <Typography.Text strong style={{ fontSize: 16 }}>
                    {formatNumber(analisisDetalle?.precioSugerido || 0)}
                  </Typography.Text>
                </Col>
              </Row>
            </div>
          </div>
        )}
      </Drawer>

      {/* ===== Modal de Movimientos Posteriores ===== */}
      <Modal
        title={`Movimientos posteriores — ${movimientosSucursal} — ${analisisDetalle?.codigo || ''}`}
        open={movimientosModalOpen}
        onCancel={() => setMovimientosModalOpen(false)}
        footer={null}
        width={700}
        destroyOnHidden
      >
        <Table
          dataSource={movimientosData}
          rowKey="transacid"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          loading={movimientosLoading}
          locale={{ emptyText: <Empty description="No hay movimientos posteriores" /> }}
          columns={[
            { title: 'Fecha', dataIndex: 'fecha', width: 110, render: (v: string) => formatDate(v) },
            { title: 'Documento', dataIndex: 'documento', width: 160, ellipsis: true },
            { title: 'Cantidad', dataIndex: 'cantidad', width: 90, align: 'right' as const, render: (v: number) => formatNumber(v) },
          ]}
          scroll={{ x: 600 }}
        />
      </Modal>

      {/* Modal de Visor de Scanner */}
      <Modal
        title="Factura Escaneada"
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

export default OrdenCompraDetalle;
