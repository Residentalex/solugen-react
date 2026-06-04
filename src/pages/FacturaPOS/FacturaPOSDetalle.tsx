import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message, Tooltip, Typography
} from 'antd';
import {
  ArrowLeftOutlined,
  PrinterOutlined,
  EditOutlined,
  LockFilled,
  CheckCircleOutlined,
  CloseCircleOutlined,
  IdcardOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { facturaPOSApi } from '../../api/facturaPOSApi';
import type { FacturaPOSDTO } from '../../types/facturaPOS';
import PermissionGate from '../../components/PermissionGate';
import LogTable from '../../components/LogTable';

const { Text } = Typography;

const ESTADO_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Borrador', color: 'default' },
  1: { label: 'Aplicado', color: 'success' },
  2: { label: 'Autorizado', color: 'processing' },
  3: { label: 'Anulado', color: 'error' },
  4: { label: 'Pagado', color: 'cyan' },
  5: { label: 'Abierto', color: 'warning' },
  6: { label: 'Cerrado', color: 'default' },
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

interface ClienteCardProps {
  entidad: { nombre: string; identificacion: string; telefono?: string; direccion?: string } | undefined;
  cliente: { nombre: string; identificacion: string; telefono?: string; direccion?: string } | undefined;
}

const ClienteCard: React.FC<ClienteCardProps> = ({ entidad, cliente }) => {
  const identificacion = cliente?.identificacion || entidad?.identificacion || '';
  const telefono = entidad?.telefono || cliente?.telefono || '';
  const direccion = entidad?.direccion ? toTitleCase(entidad.direccion) : cliente?.direccion ? toTitleCase(cliente.direccion) : '-';

  return (
    <Card
      title={<span style={{ fontSize: 16, fontWeight: 600 }}>{toTitleCase(cliente?.nombre || entidad?.nombre || 'Cliente')}</span>}
      className="paces-card"
      style={{ marginBottom: 16 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {identificacion && identificacion !== '-' && (
          <div style={{ fontSize: 13 }}>
            <IdcardOutlined style={{ color: '#556ee6', marginRight: 8 }} />
            {identificacion}
          </div>
        )}
        {telefono && telefono !== '-' && (
          <div style={{ fontSize: 13 }}>
            <PhoneOutlined style={{ color: '#556ee6', marginRight: 8 }} />
            {telefono}
          </div>
        )}
        {direccion && direccion !== '-' && (
          <div style={{ fontSize: 13, color: '#595959' }}>
            <EnvironmentOutlined style={{ color: '#556ee6', marginRight: 8 }} />
            {direccion}
          </div>
        )}
      </div>
    </Card>
  );
};

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
          <span>{toTitleCase(monedaNombre || 'Peso Dominicano')} ({monedaSimbolo || 'RD$'} {formatNumber(tasa ?? 1)})</span>
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

const FacturaPOSDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);

  const [data, setData] = useState<FacturaPOSDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imprimiendo, setImprimiendo] = useState(false);
  const screens = Grid.useBreakpoint();

  useEffect(() => {
    setActiveModule('FPV');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    facturaPOSApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          const msg = 'Documento no encontrado en la sucursal seleccionada.';
          setError(msg);
          message.error(msg);
          return;
        }
        setData(res);
        setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.ErrorMessage || 'Error al cargar el documento';
        setError(msg);
        message.error(msg);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando documento...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <div style={{ fontSize: 18, color: '#ff4d4f', marginBottom: 16 }}>Error</div>
        <div style={{ marginBottom: 24 }} className="paces-text-secondary">{error}</div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/FPV')}>
          Volver
        </Button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const isLarge = screens.lg ?? true;

  const estadoInfo = ESTADO_MAP[data.estado] || { label: 'Desconocido', color: 'default' };
  const esCerrado = data.periodo === 6;

  const detalleColumns = [
    {
      title: 'Artículo',
      key: 'articulo',
      ellipsis: true,
      onHeaderCell: () => ({ style: { paddingLeft: 8 } }),
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13, paddingLeft: 8 }}>
          <div>{toTitleCase(record.articulo || '')}</div>
          <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {record.codigo && <span>{record.codigo}</span>}
              {record.codigo && record.referencia && <span>{' | '}</span>}
              {record.referencia && <span>{record.referencia}</span>}
            </span>
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
      title: 'Precio',
      dataIndex: 'precio',
      key: 'precio',
      width: 130,
      align: 'right' as const,
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
      width: 130,
      align: 'right' as const,
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
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/FPV')}>
          Volver
        </Button>
        <div style={{ flex: 1 }} />
        <Space>
          <PermissionGate accion="IMPRIMIR">
            <Button icon={<PrinterOutlined />} loading={imprimiendo} onClick={async () => {
            setImprimiendo(true);
            try {
              const res = await apiClient.get(`/reportes/facturacion/facturaPOS/${sucursalActiva}/${id}`, {
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
          }} />
          </PermissionGate>
          {data.estado === 0 && data.periodo !== 6 && (
            <PermissionGate accion="EDITAR">
              <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/FPV/${id}/editar`)}>Editar</Button>
            </PermissionGate>
          )}
          {data.estado === 0 && data.periodo !== 6 && (
            <PermissionGate accion="APLICAR">
              <Button icon={<CheckCircleOutlined />} loading={saving} onClick={handleAplicar}>
                Aplicar
              </Button>
            </PermissionGate>
          )}
          {data.estado !== 3 && (
            <PermissionGate accion="ANULAR">
              <Button danger icon={<CloseCircleOutlined />} loading={saving} onClick={handleAnular}>
                Anular
              </Button>
            </PermissionGate>
          )}
          {data.estado === 1 && (
            <PermissionGate accion="POSTEAR">
              <Button icon={<CheckCircleOutlined />} loading={saving} onClick={handlePostear}>Postear</Button>
            </PermissionGate>
          )}
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
            <Button icon={<CheckCircleOutlined />} loading={saving} onClick={handlePostear}>Postear</Button>
          )}
        </Space>
      </div>

      {isLarge ? (
        /* === DESKTOP LAYOUT (≥ lg) === */
        <Row gutter={16}>
          <Col lg={18}>
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
                <Descriptions.Item label="Concepto">{data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
                <Descriptions.Item label="Hora">{data.fechaDocumento ? new Date(data.fechaDocumento).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Almacen" span={2}>{data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Cajero">{(data as any).creadoPor?.nombre ? toTitleCase((data as any).creadoPor.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Punto de Venta">-</Descriptions.Item>
                <Descriptions.Item label="Turno">{data.turno || '-'}</Descriptions.Item>
                <Descriptions.Item label="Nota" span={3}><span style={{ whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</span></Descriptions.Item>
              </Descriptions>
            </Card>

            <Tabs
              defaultActiveKey="detalles"
              type="card"
              items={[
                {
                  key: 'detalles',
                  label: `Detalles (${data.detalles?.length || 0})`,
                  children: (
                    <Table dataSource={data.detalles || []} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 1100 }} />
                  ),
                },
                {
                  key: 'cobros',
                  label: `Cobros (${data.cobros?.length || 0})`,
                  children: (
                    data.cobros && data.cobros.length > 0 ? (
                      <Table dataSource={data.cobros || []} columns={[
                        { title: 'Efectivo', dataIndex: 'efectivo', key: 'efectivo', align: 'right' as const, render: (v: number) => formatNumber(v || 0) },
                        { title: 'Cheque', dataIndex: 'cheque', key: 'cheque', align: 'right' as const, render: (v: number) => formatNumber(v || 0) },
                        { title: 'Transferencia', dataIndex: 'transferencia', key: 'transferencia', align: 'right' as const, render: (v: number) => formatNumber(v || 0) },
                        { title: 'Tarjeta Crédito', dataIndex: 'tarjetaCredito', key: 'tarjetaCredito', align: 'right' as const, render: (v: number) => formatNumber(v || 0) },
                        { title: 'Tarjeta Débito', dataIndex: 'tarjetaDebito', key: 'tarjetaDebito', align: 'right' as const, render: (v: number) => formatNumber(v || 0) },
                        { title: 'Bono', dataIndex: 'bono', key: 'bono', align: 'right' as const, render: (v: number) => formatNumber(v || 0) },
                        { title: 'Tarjeta Regalo', dataIndex: 'tarjetaRegalo', key: 'tarjetaRegalo', align: 'right' as const, render: (v: number) => formatNumber(v || 0) },
                        { title: 'Nota Crédito', dataIndex: 'notaCredito', key: 'notaCredito', align: 'right' as const, render: (v: number) => formatNumber(v || 0) },
                      ]} rowKey={(_record, i) => (i ?? 0).toString()} size="small" pagination={false} scroll={{ x: 900 }} />
                    ) : (
                      <div style={{ textAlign: 'center', padding: 24 }} className="paces-text-secondary">Sin cobros registrados</div>
                    )
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

          <Col lg={6}>
            <ClienteCard entidad={data.entidad} cliente={data.cliente} />
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
                <Descriptions.Item label="Concepto">{data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
                <Descriptions.Item label="Hora">{data.fechaDocumento ? new Date(data.fechaDocumento).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Almacen">{data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Cajero">{(data as any).creadoPor?.nombre ? toTitleCase((data as any).creadoPor.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Punto de Venta">-</Descriptions.Item>
                <Descriptions.Item label="Turno">{data.turno || '-'}</Descriptions.Item>
                <Descriptions.Item label="Nota"><span style={{ whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</span></Descriptions.Item>
              </Descriptions>
            </Card>

            <ClienteCard entidad={data.entidad} cliente={data.cliente} />

          <Tabs
            defaultActiveKey="detalles"
            type="card"
            items={[
              {
                key: 'detalles',
                label: `Detalles (${data.detalles?.length || 0})`,
                children: (
                  <Table dataSource={data.detalles || []} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 1100 }} />
                ),
              },
              {
                key: 'cobros',
                label: `Cobros (${data.cobros?.length || 0})`,
                children: (
                  data.cobros && data.cobros.length > 0 ? (
                    <Table dataSource={data.cobros || []} columns={[
                      { title: 'Efectivo', dataIndex: 'efectivo', key: 'efectivo', align: 'right' as const, render: (v: number) => formatNumber(v || 0) },
                      { title: 'Cheque', dataIndex: 'cheque', key: 'cheque', align: 'right' as const, render: (v: number) => formatNumber(v || 0) },
                      { title: 'Transferencia', dataIndex: 'transferencia', key: 'transferencia', align: 'right' as const, render: (v: number) => formatNumber(v || 0) },
                      { title: 'Tarjeta Crédito', dataIndex: 'tarjetaCredito', key: 'tarjetaCredito', align: 'right' as const, render: (v: number) => formatNumber(v || 0) },
                      { title: 'Tarjeta Débito', dataIndex: 'tarjetaDebito', key: 'tarjetaDebito', align: 'right' as const, render: (v: number) => formatNumber(v || 0) },
                      { title: 'Bono', dataIndex: 'bono', key: 'bono', align: 'right' as const, render: (v: number) => formatNumber(v || 0) },
                      { title: 'Tarjeta Regalo', dataIndex: 'tarjetaRegalo', key: 'tarjetaRegalo', align: 'right' as const, render: (v: number) => formatNumber(v || 0) },
                      { title: 'Nota Crédito', dataIndex: 'notaCredito', key: 'notaCredito', align: 'right' as const, render: (v: number) => formatNumber(v || 0) },
                    ]} rowKey={(_record, i) => (i ?? 0).toString()} size="small" pagination={false} scroll={{ x: 900 }} />
                  ) : (
                    <div style={{ textAlign: 'center', padding: 24 }} className="paces-text-secondary">Sin cobros registrados</div>
                  )
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

          <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} total={data.total} nota={data.nota} alignRight={true}
            monedaSimbolo={data.moneda?.simbolo || 'RD$'}
            monedaNombre={data.moneda?.nombre || 'Peso Dominicano'}
            tasa={data.tasa ?? 1}
          />
        </div>
      )}

    </div>
  );
};

export default FacturaPOSDetalle;
