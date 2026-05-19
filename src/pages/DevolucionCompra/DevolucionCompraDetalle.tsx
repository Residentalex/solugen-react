import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message, Input, Typography
} from 'antd';
import {
  ArrowLeftOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { devolucionCompraApi } from '../../api/devolucionCompraApi';

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

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(n);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface SuplidorCardProps {
  entidad: { nombre: string; identificacion: string; telefono?: string; direccion?: string } | undefined;
  suplidor: { nombre: string; telefono?: string; direccion?: string } | undefined;
}

const SuplidorCard: React.FC<SuplidorCardProps> = ({ entidad, suplidor }) => (
  <Card
    title={<span style={{ fontSize: 16, fontWeight: 600 }}>Suplidor</span>}
    className="paces-card"
    style={{ marginBottom: 16 }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
      <div style={{ fontSize: 16, fontWeight: 700 }}>
        {suplidor?.nombre ? toTitleCase(suplidor.nombre) : entidad?.nombre ? toTitleCase(entidad.nombre) : '-'}
      </div>
      <div>
        <span className="paces-text-secondary">RNC: </span>
        <span>{entidad?.identificacion || '-'}</span>
      </div>
      <div>
        <span className="paces-text-secondary">Teléfono: </span>
        <span>{entidad?.telefono || suplidor?.telefono || '-'}</span>
      </div>
      <div>
        <span className="paces-text-secondary">Dirección: </span>
        <span>{entidad?.direccion ? toTitleCase(entidad.direccion) : suplidor?.direccion ? toTitleCase(suplidor.direccion) : '-'}</span>
      </div>
    </div>
  </Card>
);

function formatDate(val: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface TotalesCardProps {
  subTotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  nota: string;
  alignRight: boolean;
}

const TotalesCard: React.FC<TotalesCardProps> = ({ subTotal, descuento, impuestos, total, nota, alignRight }) => (
  <Card
    title={<span style={{ fontSize: 16, fontWeight: 600 }}>Totales</span>}
    className="paces-card"
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: alignRight ? 'right' : undefined }}>
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

const DevolucionCompraDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');
  const screens = Grid.useBreakpoint();

  useEffect(() => {
    setActiveModule('FDVC');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    devolucionCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
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
      width: 120,
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
    {
      title: 'Subtotal',
      dataIndex: 'subTotal',
      key: 'subTotal',
      width: 130,
      align: 'right' as const,
      render: (_: any, record: any) => (
        <div>
          <Text strong>{formatNumber(record.subTotal || 0)}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/FDVC')}>
          Volver
        </Button>
        <div style={{ flex: 1 }} />
        <Space>
          <Button icon={<PrinterOutlined />} loading={imprimiendo} onClick={async () => {
            setImprimiendo(true);
            try {
              const res = await apiClient.post('/reportes/inventario/devolucion-compra', data, {
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
              try {
                const blob = err?.response?.data;
                const text = blob instanceof Blob ? await blob.text() : '';
                const json = JSON.parse(text);
                message.error(json.errorMessage || 'Error al generar el PDF');
              } catch {
                message.error(err?.message || 'Error al generar el PDF');
              }
            } finally {
              setImprimiendo(false);
            }
          }}>Imprimir</Button>
        </Space>
      </div>

      {isLarge ? (
        <Row gutter={16}>
          <Col lg={18}>
            <Card
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 18, fontWeight: 600 }}>
                    {data.concepto?.nombre || '-'}
                  </span>
                  <Space>
                    {esCerrado && <Tag color="geekblue">Cerrado</Tag>}
                    <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
                  </Space>
                </div>
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
                <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
                <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
                <Descriptions.Item label="Entrada Ref.">{data.documentoReferencia || '-'}</Descriptions.Item>
                <Descriptions.Item label="Almacen">{data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Moneda">{data.moneda?.nombre ? toTitleCase(data.moneda.nombre) : '-'}</Descriptions.Item>
              </Descriptions>
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
            </Tabs>
          </Col>

          <Col lg={6}>
            <SuplidorCard entidad={data.entidad} suplidor={data.suplidor} />
            <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} total={data.total} nota={data.nota} alignRight={false} />
          </Col>
        </Row>
      ) : (
        <div>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 18, fontWeight: 600 }}>
                  {data.concepto?.nombre || '-'}
                </span>
                <Space>
                  {esCerrado && <Tag color="geekblue">Cerrado</Tag>}
                  <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
                </Space>
              </div>
            }
            style={{ marginBottom: 16 }}
          >
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
              <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
              <Descriptions.Item label="Entrada Ref.">{data.documentoReferencia || '-'}</Descriptions.Item>
              <Descriptions.Item label="Almacen">{data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Moneda">{data.moneda?.nombre ? toTitleCase(data.moneda.nombre) : '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <SuplidorCard entidad={data.entidad} suplidor={data.suplidor} />

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
          </Tabs>

          <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} total={data.total} nota={data.nota} alignRight={true} />
        </div>
      )}
    </div>
  );
};

export default DevolucionCompraDetalle;
