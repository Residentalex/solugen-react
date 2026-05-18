import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message
} from 'antd';
import {
  ArrowLeftOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { salidaAlmacenApi } from '../../api/salidaAlmacenApi';
import { obtenerNombreEnumSucursal } from '../../utils/sucursalEnumMapper';

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
    style={{ borderRadius: 8, marginBottom: 16 }}
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

const SalidaAlmacenDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imprimiendo, setImprimiendo] = useState(false);
  const screens = Grid.useBreakpoint();

  useEffect(() => {
    setActiveModule('FSAP');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    salidaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || err?.response?.data?.ErrorMessage || 'Error al cargar el documento';
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
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
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
    { title: 'Codigo', dataIndex: 'codigo', key: 'codigo', width: 120 },
    { title: 'Articulo', dataIndex: 'articulo', key: 'articulo', ellipsis: true,
      render: (v: string) => toTitleCase(v) },
    { title: 'Cant.', dataIndex: 'cantidad', key: 'cantidad', width: 100, align: 'right' as const,
      render: (v: number) => formatNumber(v) },
    { title: 'Costo', dataIndex: 'costo', key: 'costo', width: 120, align: 'right' as const,
      render: (v: number) => formatNumber(v) },
    { title: 'Total', dataIndex: 'total', key: 'total', width: 130, align: 'right' as const,
      render: (v: number) => <strong>{formatNumber(v)}</strong> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/FSAP')}>
          Volver
        </Button>
        <div style={{ flex: 1 }} />
        <Space>
          <Button icon={<PrinterOutlined />} loading={imprimiendo} onClick={async () => {
            setImprimiendo(true);
            try {
              const res = await apiClient.post('/reportes/inventario/salida', data, {
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
            } catch (e) {
              const ex = e as any;
              try {
                const blob = ex?.response?.data;
                const text = blob instanceof Blob ? await blob.text() : '';
                const json = JSON.parse(text);
                message.error(json.errorMessage || 'Error al generar el PDF');
              } catch {
                message.error(ex?.message || 'Error al generar el PDF');
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
                <Descriptions.Item label="Referencia">{data.referencia || '-'}</Descriptions.Item>
                <Descriptions.Item label="Almacen">{data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Moneda">{data.moneda?.nombre ? toTitleCase(data.moneda.nombre) : '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Tabs defaultActiveKey="detalles" type="card">
              <TabPane tab={`Detalles (${data.detalles?.length || 0})`} key="detalles">
                <Table dataSource={data.detalles || []} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 700 }} />
              </TabPane>
            </Tabs>
          </Col>

          <Col lg={6}>
            <SuplidorCard entidad={data.entidad} suplidor={data.suplidor} />
            <Card title={<span style={{ fontSize: 16, fontWeight: 600 }}>Totales</span>} style={{ borderRadius: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 14 }}>
                  <span className="paces-text-secondary">Total</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(data.total)}</span>
                </div>
              </div>
              {data.nota && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }} className="paces-text-secondary">Notas</div>
                    <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5 }} className="paces-text-dark">
                      {data.nota}
                    </div>
                  </div>
                </>
              )}
            </Card>
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
              <Descriptions.Item label="Referencia">{data.referencia || '-'}</Descriptions.Item>
              <Descriptions.Item label="Almacen">{data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Moneda">{data.moneda?.nombre ? toTitleCase(data.moneda.nombre) : '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <SuplidorCard entidad={data.entidad} suplidor={data.suplidor} />

            <Tabs defaultActiveKey="detalles" type="card">
            <TabPane tab={`Detalles (${data.detalles?.length || 0})`} key="detalles">
              <Table dataSource={data.detalles || []} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 700 }} />
            </TabPane>
          </Tabs>

          <Card title={<span style={{ fontSize: 16, fontWeight: 600 }}>Totales</span>} style={{ borderRadius: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'right' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, fontSize: 14 }}>
                <span style={{ fontWeight: 700 }}>{formatCurrency(data.total)}</span>
              </div>
            </div>
            {data.nota && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#666', marginBottom: 4, textAlign: 'right' }}>Notas</div>
                  <div style={{ fontSize: 13, color: '#333', whiteSpace: 'pre-wrap', lineHeight: 1.5, textAlign: 'right' }}>
                    {data.nota}
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default SalidaAlmacenDetalle;
