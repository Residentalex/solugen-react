import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Input, Modal, Typography, Tooltip, Alert, App
} from 'antd';
import {
  LockFilled,
  IdcardOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  FileSearchOutlined,
  RollbackOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  TagOutlined,
  UserOutlined,
  DollarOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { apiClient } from '../../api/client';
import { devolucionVentaApi } from '../../api/devolucionVentaApi';
import type { DevolucionVentaDTO, AsientoContableDTO } from '../../types/devolucionVenta';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import { documentoRelacionApi, type DocumentoRelacionDTO } from '../../api/documentoRelacionApi';
import { obtenerNombreEnumSucursal } from '../../utils/sucursalEnumMapper';

import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import TransaccionesAsociadasCard from '../../components/TransaccionesAsociadasCard';
import { formatCurrency, formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { resolveEstado } from '../../utils/estadoDocumento';
import ErrorDetalle from '../../components/ErrorDetalle';

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

const DevolucionVentaDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode, documentCode } = useScreenConfig();

  const [data, setData] = useState<DevolucionVentaDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');
  const [tieneScan, setTieneScan] = useState<boolean | null>(null);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [scannerUrl, setScannerUrl] = useState<string | null>(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [documentosRelacionados, setDocumentosRelacionados] = useState<DocumentoRelacionDTO[]>([]);
  const [facturaData, setFacturaData] = useState<any>(null);
  const monedaDefault = getMonedaSucursalActiva();

  const { message: messageApi } = App.useApp();
  const operacion = useAplicar();
  const [operacionTitulo, setOperacionTitulo] = useState('');
  const [sucursalDestino, setSucursalDestino] = useState<number | undefined>(undefined);

  const screens = Grid.useBreakpoint();

  useEffect(() => {
    setActiveModule(screenCode);
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  // ===== Cargar documentos relacionados desde DOCUMENTOS_RELACION =====
  useEffect(() => {
    if (!data?.id) return;
    documentoRelacionApi.obtenerPorTransaccion(data.id)
      .then(rel => setDocumentosRelacionados(rel || []))
      .catch(() => {
        setDocumentosRelacionados([]);
      });
  }, [data?.id]);

  // ===== Carga inicial =====
  useEffect(() => {
    if (!id) return;
    setFacturaData(null);
    setLoading(true);
    setLoadingError(false);
    devolucionVentaApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          messageApi.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
        // Verificar factura escaneada
        devolucionVentaApi.verificarScan(sucursalActiva, parseInt(id))
          .then((scanRes) => setTieneScan(scanRes.existe))
          .catch(() => setTieneScan(false));
        // Cargar factura POS asociada
        if (res.factura?.id) {
          setFacturaData(res.factura);
        }
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar el documento');
        messageApi.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  const handleRefresh = useCallback(() => {
    if (!id) return;
    setFacturaData(null);
    setLoadingError(false);
    devolucionVentaApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          messageApi.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
        // Verificar factura escaneada
        devolucionVentaApi.verificarScan(sucursalActiva, parseInt(id))
          .then((scanRes) => setTieneScan(scanRes.existe))
          .catch(() => setTieneScan(false));
        // Cargar factura POS asociada
        if (res.factura?.id) {
          setFacturaData(res.factura);
        } else {
          setFacturaData(null);
        }
        // Cargar documentos relacionados desde DOCUMENTOS_RELACION
        documentoRelacionApi.obtenerPorTransaccion(parseInt(id))
          .then(rel => setDocumentosRelacionados(rel || []))
          .catch(() => setDocumentosRelacionados([]));
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al recargar');
        messageApi.error(msg);
        setLoadingError(true);
      })
  }, [id, sucursalActiva, setPageTitleOverride]);

  const handleVerScanner = async () => {
    if (!id) return;
    setScannerLoading(true);
    try {
      const blob = await devolucionVentaApi.descargarScan(sucursalActiva, parseInt(id));
      const url = URL.createObjectURL(blob);
      setScannerUrl(url);
      setScannerModalOpen(true);
    } catch (err: any) {
      messageApi.error('Error al cargar el archivo escaneado');
    } finally {
      setScannerLoading(false);
    }
  };

  // ===== Permisos para pantallas relacionadas =====
  const tienePermisoFPV = React.useMemo(() => {
    const usuario = useAuthStore.getState().usuario;
    if (!usuario) return false;
    const pantalla = usuario.pantallas.find(
      (p) => p.codigo?.toUpperCase() === 'FPV'
    );
    return pantalla?.acciones.includes('VISUALIZAR') ?? false;
  }, []);

  if (loading || (!data && !loadingError)) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando documento...</div>
      </div>
    );
  }

  if (loadingError && !data) { return <ErrorDetalle rutaVolver="/FDEV" onRecargar={handleRefresh} />; }
  if (!data) return null;

  const isLarge = screens.xxl === true;

  const estadoInfo = resolveEstado(data.estado);
  const esCerrado = data.periodo === 6;

  // ===== Detalles filtrados por búsqueda =====
  const detallesFiltrados = detalleSearch
    ? (data?.detalles || []).filter((d: any) => {
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
      ellipsis: true,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
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
      key: 'cantidad',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{formatNumber(record.cantidad || 0)}</div>
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
      title: 'Precio',
      dataIndex: 'precio',
      key: 'precio',
      width: 130,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: any) => {
        const pctDesc = Number(record.porcentajeDescuento) || 0;
        const factor = Number(record.medida?.factor) || 1;
        const precioBase = Number(record.precio) || 0;
        const precioConDescuento = precioBase - ((precioBase * pctDesc) / 100);
        const precioUnitario = precioConDescuento / factor;
        return (
          <div>
            <div>{formatNumber(precioBase)}</div>
            <div style={{ fontSize: 11, lineHeight: 1.5, color: '#999' }}>
              {formatNumber(precioUnitario)} × {factor}
            </div>
          </div>
        );
      },
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
          <div>{formatNumber(record.porcentajeDescuento || 0)}%</div>
          <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 2 }}>
            {formatNumber(record.descuento || 0)}
          </div>
        </div>
      ),
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
      title: 'Impuestos',
      key: 'impuestos',
      width: 140,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: any) => (
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

  // ===== Handlers de acciones de estado =====
  const handleDesaplicar = async () => {
    if (!id || !data) return;
    setSaving(true);
    try {
      const origen = obtenerNombreEnumSucursal(data.codigoSucursal || String(sucursalActiva));
      const documento = `${data.documento.codigo}-${data.noDocumento}`;
      await devolucionVentaApi.desaplicar(sucursalActiva, documento);
      messageApi.success('Documento desaplicado exitosamente');
      handleRefresh();
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al desaplicar');
      messageApi.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAplicar = () => {
    if (!id) return;

    // Verificación temprana del scanner
    if (tieneScan === false) {
      messageApi.warning('Debe escanear el documento antes de aplicar.');
      return;
    }

    setOperacionTitulo(`Aplicando DEV-${data?.noDocumento || id}`);
    operacion.ejecutar(
      `/DEV/${sucursalActiva}/aplicar/${id}`,
      handleRefresh
    );
  };

  const handleAnular = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await devolucionVentaApi.anular(sucursalActiva, data as any);
      messageApi.success('Documento anulado exitosamente');
      const res = await devolucionVentaApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al anular');
      messageApi.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePostear = () => {
    if (!data) return;
    setOperacionTitulo(`Posteando DEV-${data?.noDocumento || id}`);
    operacion.ejecutar(
      `/DEV/${sucursalActiva}/postear`,
      handleRefresh,
      data
    );
  };

  const handleRevisado = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await devolucionVentaApi.revisado(sucursalActiva, parseInt(id));
      messageApi.success('Documento marcado como revisado');
      const res = await devolucionVentaApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al marcar revisado');
      messageApi.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReversar = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await devolucionVentaApi.reversar(sucursalActiva, parseInt(id));
      messageApi.success('Documento reversado exitosamente');
      const res = await devolucionVentaApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al reversar');
      messageApi.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle de devolución de venta"
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
        modulo="FDEV"
        estado={data.estado}
        periodo={data.periodo}
        revisado={data.revisado}
        saving={saving}
        imprimiendo={imprimiendo}
        operacionLoading={operacion?.loading}
        onVolver={() => navigate('/FDEV')}
        onImprimir={async () => {
          setImprimiendo(true);
          try {
            const res = await apiClient.get('/reportes/facturacion/devolucion', {
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
            messageApi.error('Error al generar el PDF');
          } finally {
            setImprimiendo(false);
          }
        }}
        onEditar={() => navigate(`/FDEV/${id}/editar`)}
        onAplicar={handleAplicar}
        onAnular={handleAnular}
        onPostear={handlePostear}
        onRevisado={handleRevisado}
        onDesaplicar={handleDesaplicar}
        onReversar={handleReversar}
      />

      {isLarge ? (
        /* === DESKTOP LAYOUT (≥ lg) === */
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
                    {tieneScan === false && <Tag icon={<FileSearchOutlined />} color="warning" />}
                  </Space>
                </div>
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered size="small" column={3} styles={{ content: { background: 'transparent' } }}>
                <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
                <Descriptions.Item label="Concepto">{data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : (data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-')}</Descriptions.Item>
                <Descriptions.Item label="Tipo">—</Descriptions.Item>
                <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
                <Descriptions.Item label="Almacen" span={3}>{data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Nota" span={3}><span style={{ whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</span></Descriptions.Item>
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
                    <Table dataSource={detallesFiltrados} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 1100 }} />
                  ),
                },
                {
                  key: 'asientos',
                  label: `Asientos (${data.asientos?.length || 0})`,
                  children: (
                    <AsientosContableTable asientos={data.asientos || []} scroll={{ x: 900 }} />
                  ),
                },
                {
                  key: 'historial',
                  label: `Historial (${data.logs?.length || 0})`,
                  children: (
                    <LogTable dataSource={data.logs || []} scroll={{ x: 900 }} />
                  ),
                },
                {
                  key: 'consumo',
                  label: `Consumido en (${data.transaccionesAsociadas?.length || 0})`,
                  children: (
                    <TransaccionesAsociadasCard documentos={data.transaccionesAsociadas || []}
                      onDocumentoClick={(doc) => {
                        const docStr = doc.documento || '';
                        const tipo = (docStr.split('-')[0] || '').toUpperCase();
                        const rutas: Record<string, string> = { PV: '/FPV', DEV: '/FDEV', NC: '/FNC', ND: '/FND' };
                        const ruta = rutas[tipo];
                        if (ruta && doc.id) navigate(`${ruta}/${doc.id}`);
                      }}
                    />
                  ),
                },
              ]}
            />
          </Col>

          <Col xxl={6}>
            <EntidadCard entidad={data.cliente} entidadSecundaria={data.entidad} fallbackTitulo="Cliente" />
            <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} total={data.total} alignRight={false}
              monedaSimbolo={data.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={data.moneda?.nombre || monedaDefault.nombre}
              tasa={data.tasa ?? 1}
            />
            {facturaData && (
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>Factura Asociada</span>
                    {facturaData.documento?.codigo && (
                      <Tag color="blue" style={{ marginLeft: 8, fontWeight: 400 }}>
                        {facturaData.documento.codigo === 'PV' ? 'Punto de Venta' : facturaData.documento.codigo}
                      </Tag>
                    )}
                  </div>
                }
                className="paces-card"
                style={{ marginBottom: 16 }}
              >
                <div
                  onClick={tienePermisoFPV ? () => navigate(`/FPV/${facturaData.id}`) : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(85, 110, 230, 0.06)', borderRadius: 6,
                    padding: '10px 12px', marginBottom: 12,
                    cursor: tienePermisoFPV ? 'pointer' : 'default',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={tienePermisoFPV ? (e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(85, 110, 230, 0.12)'; } : undefined}
                  onMouseLeave={tienePermisoFPV ? (e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(85, 110, 230, 0.06)'; } : undefined}
                >
                  <FileTextOutlined style={{ color: '#556ee6', fontSize: 16, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: tienePermisoFPV ? '#556ee6' : '#262626', flex: 1 }}>
                    {facturaData.documento?.codigo}-{facturaData.noDocumento}
                  </span>
                  {facturaData.turno && <Tag style={{ background: '#d9d9d9', borderColor: '#d9d9d9', color: '#595959', marginRight: 4, flexShrink: 0 }}>Turno {facturaData.turno}</Tag>}
                  {tienePermisoFPV && <ArrowRightOutlined style={{ color: '#556ee6', fontSize: 12 }} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 13 }}>
                    <CalendarOutlined style={{ color: '#556ee6', marginRight: 8 }} />
                    {formatDate(facturaData.fechaDocumento)}
                  </div>
                  {facturaData.ncf && (
                    <div style={{ fontSize: 13 }}>
                      <TagOutlined style={{ color: '#556ee6', marginRight: 8 }} />
                      {facturaData.ncf}
                    </div>
                  )}
                  {facturaData.cliente?.nombre && (
                    <div style={{ fontSize: 13 }}>
                      <UserOutlined style={{ color: '#556ee6', marginRight: 8 }} />
                      {toTitleCase(facturaData.cliente.nombre)}
                    </div>
                  )}
                  <div style={{ fontSize: 13 }}>
                    <DollarOutlined style={{ color: '#556ee6', marginRight: 8 }} />
                    <span style={{ fontWeight: 600, color: '#262626' }}>{formatCurrency(facturaData.total)}</span>
                  </div>
                  {facturaData.cajero && (
                    <div style={{ fontSize: 13, color: '#595959' }}>
                      <TeamOutlined style={{ color: '#8c8c8c', marginRight: 8 }} />
                      {facturaData.cajero}
                    </div>
                  )}
                </div>
              </Card>
            )}

          </Col>
        </Row>
      ) : (
        /* === MOBILE LAYOUT (< lg) === */
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
                    {tieneScan === false && <Tag icon={<FileSearchOutlined />} color="warning" />}
                  </Space>
                </div>
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered size="small" column={1} styles={{ content: { background: 'transparent' } }}>
              <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
              <Descriptions.Item label="Concepto">{data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : (data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-')}</Descriptions.Item>
              <Descriptions.Item label="Tipo">—</Descriptions.Item>
              <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
              <Descriptions.Item label="Almacen">{data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-'}</Descriptions.Item>
              <Descriptions.Item label="Nota"><span style={{ whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</span></Descriptions.Item>
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
                  <Table dataSource={detallesFiltrados} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 1100 }} />
                ),
              },
              {
                key: 'asientos',
                label: `Asientos (${data.asientos?.length || 0})`,
                children: (
                  <AsientosContableTable asientos={data.asientos || []} scroll={{ x: 900 }} />
                ),
              },
              {
                key: 'historial',
                label: `Historial (${data.logs?.length || 0})`,
                children: (
                  <LogTable dataSource={data.logs || []} scroll={{ x: 900 }} />
                ),
              },
              {
                key: 'consumo',
                label: `Consumido en (${data.transaccionesAsociadas?.length || 0})`,
                children: (
                  <TransaccionesAsociadasCard documentos={data.transaccionesAsociadas || []}
                    onDocumentoClick={(doc) => {
                      const docStr = doc.documento || '';
                      const tipo = (docStr.split('-')[0] || '').toUpperCase();
                      const rutas: Record<string, string> = { PV: '/FPV', DEV: '/FDEV', NC: '/FNC', ND: '/FND' };
                      const ruta = rutas[tipo];
                      if (ruta && doc.id) navigate(`${ruta}/${doc.id}`);
                    }}
                  />
                ),
              },
            ]}
          />

          <div style={{ marginTop: 24 }}>
            <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} total={data.total} alignRight={true}
              monedaSimbolo={data.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={data.moneda?.nombre || monedaDefault.nombre}
              tasa={data.tasa ?? 1}
            />

          {facturaData && (
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>Factura Asociada</span>
                  {facturaData.documento?.codigo && (
                    <Tag color="blue" style={{ marginLeft: 8, fontWeight: 400 }}>
                      {facturaData.documento.codigo === 'PV' ? 'Punto de Venta' : facturaData.documento.codigo}
                    </Tag>
                  )}
                </div>
              }
              className="paces-card"
              style={{ marginBottom: 16 }}
            >
              <div
                onClick={tienePermisoFPV ? () => navigate(`/FPV/${facturaData.id}`) : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(85, 110, 230, 0.06)', borderRadius: 6,
                  padding: '10px 12px', marginBottom: 12,
                  cursor: tienePermisoFPV ? 'pointer' : 'default',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={tienePermisoFPV ? (e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(85, 110, 230, 0.12)'; } : undefined}
                onMouseLeave={tienePermisoFPV ? (e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(85, 110, 230, 0.06)'; } : undefined}
              >
                <FileTextOutlined style={{ color: '#556ee6', fontSize: 16, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: tienePermisoFPV ? '#556ee6' : '#262626', flex: 1 }}>
                  {facturaData.documento?.codigo}-{facturaData.noDocumento}
                </span>
                {facturaData.turno && <Tag style={{ background: '#d9d9d9', borderColor: '#d9d9d9', color: '#595959', marginRight: 4, flexShrink: 0 }}>Turno {facturaData.turno}</Tag>}
                {tienePermisoFPV && <ArrowRightOutlined style={{ color: '#556ee6', fontSize: 12 }} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 13 }}>
                  <CalendarOutlined style={{ color: '#556ee6', marginRight: 8 }} />
                  {formatDate(facturaData.fechaDocumento)}
                </div>
                {facturaData.ncf && (
                  <div style={{ fontSize: 13 }}>
                    <TagOutlined style={{ color: '#556ee6', marginRight: 8 }} />
                    {facturaData.ncf}
                  </div>
                )}
                {facturaData.cliente?.nombre && (
                  <div style={{ fontSize: 13 }}>
                    <UserOutlined style={{ color: '#556ee6', marginRight: 8 }} />
                    {toTitleCase(facturaData.cliente.nombre)}
                  </div>
                )}
                <div style={{ fontSize: 13 }}>
                  <DollarOutlined style={{ color: '#556ee6', marginRight: 8 }} />
                  <span style={{ fontWeight: 600, color: '#262626' }}>{formatCurrency(facturaData.total)}</span>
                </div>
                {facturaData.cajero && (
                  <div style={{ fontSize: 13, color: '#595959' }}>
                    <TeamOutlined style={{ color: '#8c8c8c', marginRight: 8 }} />
                    {facturaData.cajero}
                  </div>
                )}
              </div>
            </Card>
          )}
          <DocumentosRelacionadosCard
            documentos={documentosRelacionados}
            currentId={data?.id}
          />
          </div>
        </div>
      )}

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

export default DevolucionVentaDetalle;
