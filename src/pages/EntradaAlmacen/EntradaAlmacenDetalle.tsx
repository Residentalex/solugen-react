import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message, Input, Dropdown, Modal, DatePicker, Typography
} from 'antd';
import {
  ArrowLeftOutlined,
  PrinterOutlined,
  EditOutlined,
  MoreOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { entradaAlmacenApi } from '../../api/entradaAlmacenApi';
import { obtenerNombreEnumSucursal } from '../../utils/sucursalEnumMapper';
import type { EntradaAlmacenDTO, AsientoContableDTO, SuplidorDTO, EntidadDTO } from '../../types/entradaAlmacen';

const { Text } = Typography;
const { TabPane } = Tabs;

const ESTADO_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Borrador', color: 'default' },
  1: { label: 'Aplicado', color: 'success' },
  2: { label: 'Autorizado', color: 'processing' },
  3: { label: 'Anulado', color: 'error' },
  4: { label: 'Pagado', color: 'cyan' },
  5: { label: 'Abierto', color: 'warning' },
  6: { label: 'Cerrado', color: 'default' },
};

const ACCION_MAP: Record<number, string> = {
  0: 'Crear',
  1: 'Modificar',
  2: 'Eliminar',
  3: 'Aplicar',
  4: 'Desaplicar',
  5: 'Postear',
  6: 'Anular',
  7: 'Revisar',
  8: 'Reversar',
  9: 'Escanear',
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(n);
}

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

interface SuplidorCardProps {
  suplidor: SuplidorDTO | null;
  entidad?: EntidadDTO | null;
}

const SuplidorCard: React.FC<SuplidorCardProps> = ({ suplidor, entidad }) => (
  <Card
    title={<span style={{ fontSize: 16, fontWeight: 600 }}>Suplidor</span>}
    className="paces-card"
    style={{ marginBottom: 16 }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontWeight: 600 }}>
        {suplidor?.nombre ? toTitleCase(suplidor.nombre) : entidad?.nombre ? toTitleCase(entidad.nombre) : '-'}
      </div>
      <div>
        <span className="paces-text-secondary">RNC: </span>
        <span>{suplidor?.identificacion || entidad?.identificacion || '-'}</span>
      </div>
      <div>
        <span className="paces-text-secondary">Teléfono: </span>
        <span>{suplidor?.telefono || entidad?.telefono || '-'}</span>
      </div>
      <div>
        <span className="paces-text-secondary">Dirección: </span>
        <span>{suplidor?.direccion ? toTitleCase(suplidor.direccion) : entidad?.direccion ? toTitleCase(entidad.direccion) : '-'}</span>
      </div>
    </div>
  </Card>
);

interface TotalesCardProps {
  subTotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  nota: string;
  alignRight: boolean;
  monedaSimbolo?: string;
  monedaNombre?: string;
  tasa?: number;
}

const TotalesCard: React.FC<TotalesCardProps> = ({ subTotal, descuento, impuestos, total, nota, alignRight, monedaSimbolo, monedaNombre, tasa }) => (
  <Card
    title={<span style={{ fontSize: 16, fontWeight: 600 }}>Totales</span>}
    className="paces-card"
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: alignRight ? 'right' : undefined }}>
      {monedaSimbolo && tasa !== undefined && (
        <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16 }}>
          {!alignRight && <span className="paces-text-secondary">Moneda</span>}
          <span>{monedaNombre || 'Peso Dominicano'} ({monedaSimbolo || 'RD$'} {formatNumber(tasa ?? 1)})</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16, fontSize: 14 }}>
        {!alignRight && <span className="paces-text-secondary">Subtotal</span>}
        <span>{formatNumber(subTotal)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16, fontSize: 14 }}>
        {!alignRight && <span className="paces-text-secondary">Descuento</span>}
        <span>{formatNumber(descuento)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16, fontSize: 14 }}>
        {!alignRight && <span className="paces-text-secondary">Impuestos</span>}
        <span>{formatNumber(impuestos)}</span>
      </div>
    </div>

    <Divider style={{ margin: '12px 0' }} />

    <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16, fontSize: 16, fontWeight: 700 }}>
      {!alignRight && <span>Total</span>}
      <span style={{ color: 'var(--paces-primary)' }}>{formatCurrency(total)}</span>
    </div>

    {nota && (
      <>
        <Divider style={{ margin: '12px 0' }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, textAlign: alignRight ? 'right' : undefined }} className="paces-text-secondary">Notas</div>
          <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5, textAlign: alignRight ? 'right' : undefined }} className="paces-text-dark">
            {nota}
          </div>
        </div>
      </>
    )}
  </Card>
);

const EntradaAlmacenDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);

  const [data, setData] = useState<EntradaAlmacenDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');
  const [fechaVencimientoModal, setFechaVencimientoModal] = useState<{ open: boolean; detalleId: number }>({ open: false, detalleId: 0 });

  const handleFechaVencimiento = (date: dayjs.Dayjs | null) => {
    if (fechaVencimientoModal.detalleId) {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          detalles: prev.detalles.map((d) => {
            if (d.id !== fechaVencimientoModal.detalleId) return d;
            return { ...d, fechaVencimiento: date ? date.format('YYYY-MM-DD') : undefined };
          }),
        };
      });
    }
    setFechaVencimientoModal({ open: false, detalleId: 0 });
  };
  const screens = Grid.useBreakpoint();

  // ===== Detalles filtrados por búsqueda =====
  const detallesFiltrados = detalleSearch
    ? (data?.detalles || []).filter((d) => {
        const q = detalleSearch.toLowerCase();
        return (
          (d.codigo || '').toLowerCase().includes(q) ||
          (d.articulo || '').toLowerCase().includes(q) ||
          (d.referencia || '').toLowerCase().includes(q)
        );
      })
    : (data?.detalles || []);

  useEffect(() => {
    setActiveModule('FENP');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        message.error(msg);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  if (loading || !data) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando documento...</div>
      </div>
    );
  }

  const isLarge = screens.lg ?? true;

  const estadoInfo = ESTADO_MAP[data.estado] || { label: 'Desconocido', color: 'default' };
  const esCerrado = data.periodo === 6;

  const detalleColumns = [
    {
      title: 'Artículo',
      key: 'articulo',
      ellipsis: true,
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13 }}>
          <div>{toTitleCase(record.articulo || '')}</div>
          <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {record.codigo && <span>{record.codigo}</span>}
              {record.codigo && record.referencia && <span>{' | '}</span>}
              {record.referencia && <span>{record.referencia}</span>}
            </span>
            {record.fechaVencimiento && <span className="paces-text-secondary">V: {formatDate(record.fechaVencimiento)}</span>}
          </div>
        </div>
      ),
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 100,
      align: 'right' as const,
      render: (_: any, record: any) => (
        <div>
          <div>{formatNumber(record.cantidad || 0)}</div>
          {record.medida?.nombre && (
            <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, textAlign: 'right' }}>
              {record.medida.nombre}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      width: 110,
      align: 'right' as const,
      render: (_: any, record: any) => (
        <div>
          <div>{formatNumber(record.costo || 0)}</div>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
    {
      title: 'Descuento',
      key: 'descuento',
      width: 120,
      align: 'right' as const,
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
      render: (_: any, record: any) => (
        <div>
          <div>{formatNumber(record.impuestos || 0)}</div>
          {record.impuesto?.nombre && (
            <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5 }}>{toTitleCase(record.impuesto.nombre)}</div>
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
      render: (_: any, record: any) => (
        <div>
          <Text strong>{formatNumber(record.total || 0)}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 50,
      render: (_: any, record: any) => {
        const items: any[] = [];
        if (record.tieneVencimiento) {
          items.push({
            key: 'vencimiento',
            label: record.fechaVencimiento ? `Venc: ${formatDate(record.fechaVencimiento)}` : 'Fecha Vencimiento',
            icon: <CalendarOutlined />,
            onClick: () => setFechaVencimientoModal({ open: true, detalleId: record.id }),
          });
        }
        if (items.length === 0) return null;
        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  function esDebito(tipo: any): boolean { return tipo === 'D' || tipo === 0; }
  function esCredito(tipo: any): boolean { return tipo === 'C' || tipo === 1; }

  const totalDebitos = (data.asientos || []).reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
  const totalCreditos = (data.asientos || []).reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);

  const asientoColumns = [
    { title: 'Cuenta', key: 'cuenta', width: 120,
      render: (_: any, r: AsientoContableDTO) => r.cuentaContable?.noCuenta || '-' },
    { title: 'Nombre', key: 'nombre', ellipsis: true,
      render: (_: any, r: AsientoContableDTO) => r.cuentaContable?.nombre ? toTitleCase(r.cuentaContable.nombre) : '-' },
    { title: 'Descripcion', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true,
      render: (v: string) => v ? toTitleCase(v) : '-' },
    { title: 'Debito', key: 'debito', width: 130, align: 'right' as const,
      render: (_: any, r: AsientoContableDTO) => esDebito(r.tipoAsiento) ? formatNumber(r.monto) : '' },
    { title: 'Credito', key: 'credito', width: 130, align: 'right' as const,
      render: (_: any, r: AsientoContableDTO) => esCredito(r.tipoAsiento) ? formatNumber(r.monto) : '' },
  ];

  const logColumns = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 160, render: (v: string) => formatDate(v) },
    { title: 'Usuario', dataIndex: 'usuario', key: 'usuario', width: 200,
      render: (v: any) => (v?.nombre ? toTitleCase(v.nombre) : v?.nombreUsuario ? toTitleCase(v.nombreUsuario) : '-') },
    { title: 'Estacion', dataIndex: 'estacion', key: 'estacion', width: 200 },
    { title: 'Accion', dataIndex: 'accion', key: 'accion', width: 120,
      render: (v: number) => ACCION_MAP[v] || `Accion ${v}` },
    { title: 'Motivos', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true },
  ];

  // ===== Handlers de acciones de estado =====
  const handleAplicar = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const result = await entradaAlmacenApi.aplicar(sucursalActiva, parseInt(id));
      setData(result);
      message.success('Documento aplicado exitosamente');
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
      await entradaAlmacenApi.anular(sucursalActiva, data as any);
      message.success('Documento anulado exitosamente');
      const res = await entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id!));
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
      await entradaAlmacenApi.postear(sucursalActiva, data as any);
      message.success('Documento posteado exitosamente');
      const res = await entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al postear');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRevisado = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await entradaAlmacenApi.revisado(sucursalActiva, parseInt(id));
      message.success('Documento marcado como revisado');
      const res = await entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id!));
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
      await entradaAlmacenApi.reversar(sucursalActiva, parseInt(id));
      message.success('Documento reversado exitosamente');
      const res = await entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al reversar');
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
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/FENP')}>
          Volver
        </Button>
        <div style={{ flex: 1 }} />
        <Space>
          <Button icon={<PrinterOutlined />} loading={imprimiendo} onClick={async () => {
            setImprimiendo(true);
            try {
              const sucursalParam = data.codigoSucursal
                ? obtenerNombreEnumSucursal(data.codigoSucursal)
                : sucursalActiva;
              const res = await apiClient.get(`/reportes/inventario/entrada/${sucursalParam}/${id}`, {
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
          }}>Imprimir</Button>
          {data.estado === 0 && data.periodo !== 6 && (
            <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/FENP/${id}/editar`)}>Editar</Button>
          )}
          {/* Acciones de estado - solo en consulta */}
          {data.estado === 0 && data.periodo !== 6 && (
            <Button icon={<CheckCircleOutlined />} loading={saving} onClick={handleAplicar}>
              Aplicar
            </Button>
          )}
          {data.estado !== 3 && (
            <Button danger icon={<CloseCircleOutlined />} loading={saving} onClick={handleAnular}>
              Anular
            </Button>
          )}
          {data.estado === 1 && (
            <>
              <Button icon={<CheckCircleOutlined />} loading={saving} onClick={handlePostear}>
                Postear
              </Button>
              <Button icon={<CheckCircleOutlined />} loading={saving} onClick={handleRevisado}>
                Revisado
              </Button>
              <Button danger icon={<RedoOutlined />} loading={saving} onClick={handleReversar}>
                Reversar
              </Button>
            </>
          )}
        </Space>
      </div>

      {/* Concepto / Estado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 18, fontWeight: 600 }}>{data.concepto?.nombre || '-'}</span>
        <Space>
          {esCerrado && <Tag color="geekblue">Cerrado</Tag>}
          <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
        </Space>
      </div>

      {isLarge ? (
        /* === DESKTOP LAYOUT (≥ lg) === */
        <Row gutter={16}>
          <Col lg={18}>
            <Card className="paces-card" size="small" title="Datos Generales" style={{ marginBottom: 16 }}>
              <div style={{ paddingTop: 16 }}>
                <Row gutter={[16, 24]}>
                  {/* Fila 1: OrdenCompra + Concepto */}
                  <Col xs={24} sm={12} lg={9}>
                    <div>
                      <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Orden Compra</div>
                      <div style={{ fontSize: 14 }}>{data.ordenCompra?.noDocumento || '-'}</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} lg={15}>
                    <div>
                      <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Concepto</div>
                      <div style={{ fontSize: 14 }}>{toTitleCase(data.concepto?.nombre || '-')}</div>
                    </div>
                  </Col>

                  {/* Fila 2: FechaDocumento + Suplidor */}
                  <Col xs={24} sm={12} lg={9}>
                    <div>
                      <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Fecha Documento</div>
                      <div style={{ fontSize: 14 }}>{formatDate(data.fechaDocumento)}</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} lg={15}>
                    <div>
                      <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Suplidor / Entidad</div>
                      <div style={{ fontSize: 14 }}>{toTitleCase(data.suplidor?.nombre || data.entidad?.nombre || '-')}</div>
                    </div>
                  </Col>

                  {/* Fila 3: FechaRecibo + Almacén */}
                  <Col xs={24} sm={12} lg={9}>
                    <div>
                      <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Fecha Recibo</div>
                      <div style={{ fontSize: 14 }}>{data.fechaEntrega ? formatDate(data.fechaEntrega) : '-'}</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} lg={15}>
                    <div>
                      <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Almacén</div>
                      <div style={{ fontSize: 14 }}>{toTitleCase(data.almacen?.nombre || '-')}</div>
                    </div>
                  </Col>

                  {/* Fila 4: Tags informativos */}
                  <Col xs={24}>
                    <Space size={[8, 8]} wrap>
                      <span><span className="paces-text-secondary">NCF: </span>{data.ncf || '-'}</span>
                      <span><span className="paces-text-secondary">Ref: </span>{data.referencia || '-'}</span>
                    </Space>
                  </Col>

                  {/* Fila 5: Nota */}
                  <Col xs={24}>
                    <div>
                      <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Nota</div>
                      <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</div>
                    </div>
                  </Col>
                </Row>
              </div>
            </Card>

            <Tabs defaultActiveKey="detalles" type="card">
              <TabPane tab={`Detalles (${detallesFiltrados.length}${detalleSearch ? `/${data.detalles?.length || 0}` : ''})`} key="detalles">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <Input.Search
                    placeholder="Buscar detalle..."
                    allowClear
                    style={{ maxWidth: 250 }}
                    onSearch={(value) => setDetalleSearch(value)}
                    onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                  />
                </div>
                <Table dataSource={detallesFiltrados} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 1100 }} />
              </TabPane>
              <TabPane tab={`Asientos (${data.asientos?.length || 0})`} key="asientos">
                <Table dataSource={data.asientos || []} columns={asientoColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 900 }}
                  summary={() => (
                    <Table.Summary fixed>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3}><strong>Totales</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right"><strong>{formatNumber(totalDebitos)}</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right"><strong>{formatNumber(totalCreditos)}</strong></Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
              </TabPane>
              <TabPane tab={`Historial (${data.logs?.length || 0})`} key="historial">
                <Table dataSource={data.logs || []} columns={logColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 900 }} />
              </TabPane>
            </Tabs>
          </Col>

          <Col lg={6}>
            <SuplidorCard suplidor={data.suplidor} entidad={data.entidad} />
            <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} total={data.total} nota={data.nota} alignRight={false}
              monedaSimbolo={data.moneda?.simbolo || 'RD$'}
              monedaNombre={data.moneda?.nombre || 'Peso Dominicano'}
              tasa={data.tasa ?? 1}
            />
          </Col>
        </Row>
      ) : (
        /* === MOBILE LAYOUT (< lg) === */
        <div>
            <Card className="paces-card" size="small" title="Datos Generales" style={{ marginBottom: 16 }}>
              <div style={{ paddingTop: 16 }}>
                <Row gutter={[16, 24]}>
                  {/* Fila 1: OrdenCompra + Concepto */}
                  <Col xs={24} sm={12} lg={9}>
                    <div>
                      <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Orden Compra</div>
                      <div style={{ fontSize: 14 }}>{data.ordenCompra?.noDocumento || '-'}</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} lg={15}>
                    <div>
                      <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Concepto</div>
                      <div style={{ fontSize: 14 }}>{toTitleCase(data.concepto?.nombre || '-')}</div>
                    </div>
                  </Col>

                  {/* Fila 2: FechaDocumento + Suplidor */}
                  <Col xs={24} sm={12} lg={9}>
                    <div>
                      <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Fecha Documento</div>
                      <div style={{ fontSize: 14 }}>{formatDate(data.fechaDocumento)}</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} lg={15}>
                    <div>
                      <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Suplidor / Entidad</div>
                      <div style={{ fontSize: 14 }}>{toTitleCase(data.suplidor?.nombre || data.entidad?.nombre || '-')}</div>
                    </div>
                  </Col>

                  {/* Fila 3: FechaRecibo + Almacén */}
                  <Col xs={24} sm={12} lg={9}>
                    <div>
                      <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Fecha Recibo</div>
                      <div style={{ fontSize: 14 }}>{data.fechaEntrega ? formatDate(data.fechaEntrega) : '-'}</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} lg={15}>
                    <div>
                      <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Almacén</div>
                      <div style={{ fontSize: 14 }}>{toTitleCase(data.almacen?.nombre || '-')}</div>
                    </div>
                  </Col>

                  {/* Fila 4: Tags informativos */}
                  <Col xs={24}>
                    <Space size={[8, 8]} wrap>
                      <span><span className="paces-text-secondary">NCF: </span>{data.ncf || '-'}</span>
                      <span><span className="paces-text-secondary">Ref: </span>{data.referencia || '-'}</span>
                    </Space>
                  </Col>

                  {/* Fila 5: Nota */}
                  <Col xs={24}>
                    <div>
                      <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Nota</div>
                      <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</div>
                    </div>
                  </Col>
                </Row>
              </div>
            </Card>

          <SuplidorCard suplidor={data.suplidor} entidad={data.entidad} />

          <Tabs defaultActiveKey="detalles" type="card">
            <TabPane tab={`Detalles (${detallesFiltrados.length}${detalleSearch ? `/${data.detalles?.length || 0}` : ''})`} key="detalles">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <Input.Search
                  placeholder="Buscar detalle..."
                  allowClear
                  style={{ maxWidth: 250 }}
                  onSearch={(value) => setDetalleSearch(value)}
                  onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                />
              </div>
              <Table dataSource={detallesFiltrados} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 1100 }} />
            </TabPane>
            <TabPane tab={`Asientos (${data.asientos?.length || 0})`} key="asientos">
              <Table dataSource={data.asientos || []} columns={asientoColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 900 }}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={3}><strong>Totales</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right"><strong>{formatNumber(totalDebitos)}</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right"><strong>{formatNumber(totalCreditos)}</strong></Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </TabPane>
            <TabPane tab={`Historial (${data.logs?.length || 0})`} key="historial">
              <Table dataSource={data.logs || []} columns={logColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 900 }} />
            </TabPane>
          </Tabs>

          <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} total={data.total} nota={data.nota} alignRight={true}
            monedaSimbolo={data.moneda?.simbolo || 'RD$'}
            monedaNombre={data.moneda?.nombre || 'Peso Dominicano'}
            tasa={data.tasa ?? 1}
          />
        </div>
      )}

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
    </div>
  );
};

export default EntradaAlmacenDetalle;
