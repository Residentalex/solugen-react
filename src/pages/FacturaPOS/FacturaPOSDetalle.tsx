import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Grid, Input, message, Tooltip, Typography, QRCode, Badge
} from 'antd';
import {
  ArrowLeftOutlined,
  PrinterOutlined,
  EditOutlined,
  LockFilled,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { apiClient } from '../../api/client';
import { facturaPOSApi } from '../../api/facturaPOSApi';
import { devolucionVentaApi } from '../../api/devolucionVentaApi';
import { transaccionApi } from '../../api/transaccionApi';

import type { FacturaPOSDTO } from '../../types/facturaPOS';
import PermissionGate from '../../components/PermissionGate';
import LogTable from '../../components/LogTable';
import { formatCurrency } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { resolveEstado, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import CobrosMinimal from '../../components/CobrosCard/CobrosMinimal';
import ErrorDetalle from '../../components/ErrorDetalle';
import DetalleToolbar from '../../components/DetalleToolbar';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import SucursalField from '../../components/SucursalField';

const { Text } = Typography;

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(val: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const FacturaPOSDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode, documentCode } = useScreenConfig();

  const [data, setData] = useState<FacturaPOSDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');
  const [devolucionesPV, setDevolucionesPV] = useState<any[]>([]);
  const [dtransasocDevueltos, setDtransasocDevueltos] = useState<Set<number>>(new Set());
  const monedaDefault = getMonedaSucursalActiva();
  const screens = Grid.useBreakpoint();

  useEffect(() => {
    setActiveModule(screenCode);
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  const handleRefresh = React.useCallback(() => {
    if (!id) return;
    setLoading(true);
    setLoadingError(false);
    facturaPOSApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
        // Cargar devoluciones vinculadas via DTRANSIDASOC
        transaccionApi.obtenerDevolucionesPorPV(sucursalActiva, res.id)
          .then((devs) => {
            setDevolucionesPV(devs);
            if (devs.length > 0) {
          Promise.all(
            devs.map((d: any) =>
              devolucionVentaApi.obtenerPorId(sucursalActiva, d.id)
                .then((dev: any) => (dev.detalles || []).map((det: any) => Number(det.idAsociado)))
                .catch(() => [] as number[])
            )
          ).then((results) => {
                const set = new Set<number>();
                for (const ids of results) ids.forEach((id: number) => set.add(id));
                setDtransasocDevueltos(set);
              });
            }
          })
          .catch((err: any) => console.error('Error cargando devoluciones PV:', err));
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.ErrorMessage || 'Error al cargar el documento';
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando documento...</div>
      </div>
    );
  }

  if (loadingError && !data) {
    return <ErrorDetalle rutaVolver="/FPV" onRecargar={handleRefresh} />;
  }

  if (!data) {
    return null;
  }

  const isLarge = screens.xxl === true;

  const estadoInfo = resolveEstado(data.estado);
  const esCerrado = toPeriodoNum(data.periodo) === 6;

  const detallesFiltrados = detalleSearch
    ? (data.detalles || []).filter((d) => {
        const q = detalleSearch.toLowerCase();
        return (
          (d.codigo || '').toLowerCase().includes(q) ||
          (d.articulo || '').toLowerCase().includes(q) ||
          (d.referencia || '').toLowerCase().includes(q)
        );
      })
    : (data.detalles || []);

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
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => {
        const devuelto = dtransasocDevueltos.has(record.id);
        return (
          <div>
            <div>
              {devuelto ? (
                <span style={{ textDecoration: 'line-through', color: '#ff4d4f' }}>
                  {formatNumber(record.cantidad || 0)}
                </span>
              ) : (
                <span>{formatNumber(record.cantidad || 0)}</span>
              )}
            </div>
            {record.medida?.nombre && (
              <Tooltip title={record.medida.nombre}>
                <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {record.medida.nombre}
                </div>
              </Tooltip>
            )}
          </div>
        );
      },
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


  // ===== Handlers de acciones de estado =====
  const handleAplicar = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await facturaPOSApi.aplicar(sucursalActiva, parseInt(id));
      message.success('Documento aplicado exitosamente');
      const res = await facturaPOSApi.obtenerPorId(sucursalActiva, parseInt(id));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al aplicar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAnular = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await facturaPOSApi.anular(sucursalActiva, data as any);
      message.success('Documento anulado exitosamente');
      const res = await facturaPOSApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al anular');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePostear = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await facturaPOSApi.postear(sucursalActiva, data as any);
      message.success('Documento posteado exitosamente');
      const res = await facturaPOSApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al postear');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div>
      <DetalleToolbar
        modulo={screenCode}
        estado={data.estado}
        periodo={data.periodo}
        saving={saving}
        imprimiendo={imprimiendo}
        onVolver={() => navigate(-1)}
        onImprimirTicket={async () => {
          setImprimiendo(true);
          try {
            const res = await apiClient.post(`/reportes/facturacion/pos/${sucursalActiva}`, data, {
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
          } catch (err: any) {
            const msg = err?.response?.data?.ErrorMessage || 'Error al generar el PDF';
            message.error(msg);
          } finally {
            setImprimiendo(false);
          }
        }}
        onEditar={() => navigate(`/FPV/${id}/editar`)}
        onAplicar={handleAplicar}
        onAnular={handleAnular}
        onPostear={handlePostear}
        confirmActions={false}
      />

      {/* Botón "Crear Devolución" — navega al formulario de DEV con pvId */}
      {data.estado !== 0 && data.estado !== 3 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <PermissionGate codigoPantalla="FPV" permisoEspecial="pe_crear_devolucion">
            <Button type="primary" icon={<RollbackOutlined />} onClick={() => navigate(`/FDEV/nuevo?pvId=${data.id}`)}>
              Crear Devolución
            </Button>
          </PermissionGate>
        </div>
      )}

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
                  </Space>
                </div>
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered size="small" column={3} styles={{ content: { background: 'transparent' } }}>
                <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
                <Descriptions.Item label="Concepto">{data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : (data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-')}<ConceptoInfoLabel concepto={data.concepto} /></Descriptions.Item>
                <Descriptions.Item label="Tipo">—</Descriptions.Item>
                <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
                <Descriptions.Item label="Hora">{data.fechaDocumento ? new Date(data.fechaDocumento).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Almacen" span={2}>{data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Cajero">{data.cajero ? toTitleCase(data.cajero) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Punto de Venta">{data.caja || '-'}</Descriptions.Item>
                <Descriptions.Item label="Turno">
                  {data.turno ? (
                    data.turno.includes('(Local)') ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span>{data.turno.replace(' (Local)', '')}</span>
                        <Tag style={{ background: '#d9d9d9', borderColor: '#d9d9d9', color: '#595959', marginRight: 0 }}>Local</Tag>
                      </div>
                    ) : data.turno
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                      <Tag style={{ background: '#d9d9d9', borderColor: '#d9d9d9', color: '#595959', marginRight: 0 }}>Local</Tag>
                    </div>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Sucursal:">
                  <SucursalField codigoSucursal={data.codigoSucursal} sucursal={data.sucursal} />
                </Descriptions.Item>
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
                  label: `Detalles (${data.detalles?.length || 0})`,
                  children: (
                    <Table dataSource={detallesFiltrados} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 1100 }} />
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
                  key: 'impuestos',
                  label: `Impuestos (${data.impuestosFactura?.length || 0})`,
                  children: (
                    <Table
                      dataSource={data.impuestosFactura || []}
                      rowKey={(r: any) => r.id || r.impuesto?.codigo || Math.random()}
                      size="small"
                      pagination={false}
                      scroll={{ x: 500 }}
                      columns={[
                        { title: 'Impuesto', key: 'nombre', render: (_: any, r: any) => r.impuesto?.nombre || '-' },
                        { title: 'Porcentaje', key: 'porcentaje', width: 110, align: 'right' as const, render: (_: any, r: any) => r.impuesto?.porcentaje != null ? `${r.impuesto.porcentaje}%` : '-' },
                        { title: 'Monto', key: 'monto', width: 130, align: 'right' as const, render: (_: any, r: any) => <Text strong>{formatCurrency(r.monto || 0)}</Text> },
                        { title: 'Tipo', key: 'tipo', width: 110, render: (_: any, r: any) => r.tipo || '-' },
                      ]}
                    />
                  ),
                },
                ...(devolucionesPV.length > 0 ? [{
                  key: 'devoluciones',
                  label: (
                    <span>
                      Devoluciones
                      <Badge count={devolucionesPV.length}
                        style={{ marginLeft: 6, backgroundColor: '#556ee6' }} />
                    </span>
                  ),
                  children: (
                    <Table
                      dataSource={devolucionesPV}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      scroll={{ x: 600 }}
                      columns={[
                        { title: 'Documento', key: 'documento', width: 160,
                          render: (_: any, rec: any) => (
                            <a className="paces-doc-link"
                              onClick={() => navigate(`/FDEV/${rec.id}`)}
                              style={{ cursor: 'pointer' }}>
                              {rec.documento || `DEV-${rec.noDocumento}`}
                            </a>
                          ),
                        },
                        { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110,
                          render: (v: string) => formatDate(v),
                        },
                        { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 150,
                          render: (v: string) => v || '-',
                        },
                      ]}
                    />
                  ),
                }] : []),
                ...(data.transaccionesAsociadas?.length ? [{
                  key: 'relacionados',
                  label: (
                    <span>
                      Documentos Relacionados
                      <Badge count={data.transaccionesAsociadas!.length}
                        style={{ marginLeft: 6, backgroundColor: '#556ee6' }} />
                    </span>
                  ),
                  children: (
                    <Table
                      dataSource={data.transaccionesAsociadas!}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      scroll={{ x: 600 }}
                      columns={[
                        { title: 'Documento', key: 'documento', width: 160,
                          render: (_: any, rec: any) => (
                            <a className="paces-doc-link"
                              onClick={() => navigate(`/FDEV/${rec.transaccionAsociadaID}`)}
                              style={{ cursor: 'pointer' }}>
                              {rec.documento || 'DEV'}
                            </a>
                          ),
                        },
                        { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110,
                          render: (v: string) => formatDate(v),
                        },
                        { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 150,
                          render: (v: string) => v || '-',
                        },
                        { title: 'Monto', dataIndex: 'monto', key: 'monto', width: 120, align: 'right' as const,
                          render: (v: number) => <Text strong>{formatCurrency(v || 0)}</Text>,
                        },
                      ]}
                    />
                  ),
                }] : []),
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
            <CobrosMinimal cobrosPOS={data.cobros?.[0]} loading={loading} />
            {data?.envioDGII?.codigoQR && (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <QRCode value={data.envioDGII.codigoQR} size={140} />
              </div>
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
                  </Space>
                </div>
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered size="small" column={1} styles={{ content: { background: 'transparent' } }}>
              <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
              <Descriptions.Item label="Concepto">{data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : (data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-')}<ConceptoInfoLabel concepto={data.concepto} /></Descriptions.Item>
              <Descriptions.Item label="Tipo">—</Descriptions.Item>
              <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
              <Descriptions.Item label="Hora">{data.fechaDocumento ? new Date(data.fechaDocumento).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</Descriptions.Item>
              <Descriptions.Item label="Almacen">{data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Cajero">{data.cajero ? toTitleCase(data.cajero) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Punto de Venta">{data.caja || '-'}</Descriptions.Item>
                <Descriptions.Item label="Turno">
                  {data.turno ? (
                    data.turno.includes('(Local)') ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span>{data.turno.replace(' (Local)', '')}</span>
                        <Tag style={{ background: '#d9d9d9', borderColor: '#d9d9d9', color: '#595959', marginRight: 0 }}>Local</Tag>
                      </div>
                    ) : data.turno
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                      <Tag style={{ background: '#d9d9d9', borderColor: '#d9d9d9', color: '#595959', marginRight: 0 }}>Local</Tag>
                    </div>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Sucursal:">
                  <SucursalField codigoSucursal={data.codigoSucursal} sucursal={data.sucursal} />
                </Descriptions.Item>
                <Descriptions.Item label="Nota"><span style={{ whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</span></Descriptions.Item>
              </Descriptions>
            </Card>

            <EntidadCard entidad={data.cliente} entidadSecundaria={data.entidad} fallbackTitulo="Cliente" />

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
                label: `Detalles (${data.detalles?.length || 0})`,
                children: (
                  <Table dataSource={detallesFiltrados} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 1100 }} />
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
                key: 'impuestos',
                label: `Impuestos (${data.impuestosFactura?.length || 0})`,
                children: (
                  <Table
                    dataSource={data.impuestosFactura || []}
                    rowKey={(r: any) => r.id || r.impuesto?.codigo || Math.random()}
                    size="small"
                    pagination={false}
                    scroll={{ x: 500 }}
                    columns={[
                      { title: 'Impuesto', key: 'nombre', render: (_: any, r: any) => r.impuesto?.nombre || '-' },
                      { title: 'Porcentaje', key: 'porcentaje', width: 110, align: 'right' as const, render: (_: any, r: any) => r.impuesto?.porcentaje != null ? `${r.impuesto.porcentaje}%` : '-' },
                      { title: 'Monto', key: 'monto', width: 130, align: 'right' as const, render: (_: any, r: any) => <Text strong>{formatCurrency(r.monto || 0)}</Text> },
                      { title: 'Tipo', key: 'tipo', width: 110, render: (_: any, r: any) => r.tipo || '-' },
                    ]}
                  />
                ),
              },
              ...(devolucionesPV.length > 0 ? [{
                key: 'devoluciones',
                label: (
                  <span>
                    Devoluciones
                    <Badge count={devolucionesPV.length}
                      style={{ marginLeft: 6, backgroundColor: '#556ee6' }} />
                  </span>
                ),
                children: (
                  <Table
                    dataSource={devolucionesPV}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    scroll={{ x: 600 }}
                    columns={[
                      { title: 'Documento', key: 'documento', width: 160,
                        render: (_: any, rec: any) => (
                          <a className="paces-doc-link"
                            onClick={() => navigate(`/FDEV/${rec.id}`)}
                            style={{ cursor: 'pointer' }}>
                            {rec.documento || `DEV-${rec.noDocumento}`}
                          </a>
                        ),
                      },
                      { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110,
                        render: (v: string) => formatDate(v),
                      },
                      { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 150,
                        render: (v: string) => v || '-',
                      },
                    ]}
                  />
                ),
              }] : []),
              ...(data.transaccionesAsociadas?.length ? [{
                key: 'relacionados',
                label: (
                  <span>
                    Documentos Relacionados
                    <Badge count={data.transaccionesAsociadas!.length}
                      style={{ marginLeft: 6, backgroundColor: '#556ee6' }} />
                  </span>
                ),
                children: (
                  <Table
                    dataSource={data.transaccionesAsociadas!}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    scroll={{ x: 600 }}
                    columns={[
                      { title: 'Documento', key: 'documento', width: 160,
                        render: (_: any, rec: any) => (
                          <a className="paces-doc-link"
                            onClick={() => navigate(`/FDEV/${rec.transaccionAsociadaID}`)}
                            style={{ cursor: 'pointer' }}>
                            {rec.documento || 'DEV'}
                          </a>
                        ),
                      },
                      { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110,
                        render: (v: string) => formatDate(v),
                      },
                      { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 150,
                        render: (v: string) => v || '-',
                      },
                      { title: 'Monto', dataIndex: 'monto', key: 'monto', width: 120, align: 'right' as const,
                        render: (v: number) => <Text strong>{formatCurrency(v || 0)}</Text>,
                      },
                    ]}
                  />
                ),
              }] : []),
            ]}
          />

          <div style={{ marginTop: 24 }}>
            <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} total={data.total} alignRight={true}
              monedaSimbolo={data.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={data.moneda?.nombre || monedaDefault.nombre}
              tasa={data.tasa ?? 1}
            />
            <CobrosMinimal cobrosPOS={data.cobros?.[0]} loading={loading} />
            {data?.envioDGII?.codigoQR && (
              <div style={{ textAlign: 'center' }}>
                <QRCode value={data.envioDGII.codigoQR} size={140} />
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default FacturaPOSDetalle;
