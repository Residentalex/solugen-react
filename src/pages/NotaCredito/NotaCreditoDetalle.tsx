import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message
} from 'antd';
import {
  ArrowLeftOutlined, PrinterOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { notaCreditoApi } from '../../api/notaCreditoApi';

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

function formatDate(val: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toTitleCase(str: string): string {
  if (!str) return '-';
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface EntidadCardProps {
  entidad: any;
  tipoEntidad: string;
}

const EntidadCard: React.FC<EntidadCardProps> = ({ entidad, tipoEntidad }) => (
  <Card
    title={<span style={{ fontSize: 16, fontWeight: 600 }}>{tipoEntidad === 'SUP' ? 'Suplidor' : 'Cliente'}</span>}
    className="paces-card"
    style={{ marginBottom: 16 }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
      <div style={{ fontSize: 16, fontWeight: 700 }}>
        {entidad?.nombre ? toTitleCase(entidad.nombre) : '-'}
      </div>
      <div>
        <span style={{ color: '#6c757d' }}>RNC: </span>
        <span>{entidad?.identificacion || '-'}</span>
      </div>
      <div>
        <span style={{ color: '#6c757d' }}>Teléfono: </span>
        <span>{entidad?.telefono || '-'}</span>
      </div>
    </div>
  </Card>
);

const TotalesCard: React.FC<{ data: any }> = ({ data }) => (
  <Card title={<span style={{ fontSize: 16, fontWeight: 600 }}>Totales</span>} className="paces-card">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Row justify="space-between">
        <span style={{ color: '#6c757d' }}>Subtotal</span>
        <span>{formatNumber(data.subTotal)}</span>
      </Row>
      <Row justify="space-between">
        <span style={{ color: '#6c757d' }}>Descuento</span>
        <span>{formatNumber(data.descuento)}</span>
      </Row>
      <Row justify="space-between">
        <span style={{ color: '#6c757d' }}>Impuestos</span>
        <span>{formatNumber(data.impuestos)}</span>
      </Row>
      <Row justify="space-between">
        <span style={{ color: '#6c757d' }}>Retenciones</span>
        <span>{formatNumber(data.retenciones)}</span>
      </Row>
      <Row justify="space-between">
        <span style={{ color: '#6c757d' }}>Débitos</span>
        <span>{formatNumber(data.debitos)}</span>
      </Row>
      <Row justify="space-between">
        <span style={{ color: '#6c757d' }}>Créditos</span>
        <span>{formatNumber(data.creditos)}</span>
      </Row>
    </div>
    <Divider style={{ margin: '12px 0' }} />
    <Row justify="space-between" style={{ fontSize: 16, fontWeight: 700 }}>
      <span>Total</span>
      <span style={{ color: '#3f8600' }}>{formatCurrency(data.total)}</span>
    </Row>
    {data.nota && (
      <>
        <Divider style={{ margin: '12px 0' }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6c757d', marginBottom: 4 }}>Notas</div>
          <div style={{ fontSize: 13, color: '#333', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {data.nota}
          </div>
        </div>
      </>
    )}
  </Card>
);

interface NotaCreditoDetalleProps {
  tipoEntidad: 'SUP' | 'CLI';
}

const NotaCreditoDetalle: React.FC<NotaCreditoDetalleProps> = ({ tipoEntidad }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const screens = Grid.useBreakpoint();

  const codigoPantalla = tipoEntidad === 'SUP' ? 'FNCSUP' : 'FNCCLI';

  useEffect(() => {
    setActiveModule(codigoPantalla);
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride, codigoPantalla]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    notaCreditoApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setPageTitleOverride(`NC-${res.noDocumento}`);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  if (loading || !data) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#6c757d' }}>Cargando documento...</div>
      </div>
    );
  }

  const isLarge = screens.lg ?? true;
  const estadoInfo = ESTADO_MAP[data.estado] || { label: 'Desconocido', color: 'default' };
  const esCerrado = data.periodo === 6;

  const asociadasColumns = [
    { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140 },
    { title: 'NCF', dataIndex: 'nCF', key: 'nCF', width: 140, render: (v: string) => v || '-' },
    { title: 'Monto Original', dataIndex: 'montoOriginal', key: 'montoOriginal', width: 130, align: 'right' as const, render: (v: number) => formatNumber(v) },
    { title: 'Pagado', dataIndex: 'pagado', key: 'pagado', width: 120, align: 'right' as const, render: (v: number) => formatNumber(v) },
    { title: 'Saldo', dataIndex: 'saldoPendiente', key: 'saldoPendiente', width: 120, align: 'right' as const, render: (v: number) => <strong>{formatNumber(v)}</strong> },
    { title: 'Monto', dataIndex: 'monto', key: 'monto', width: 120, align: 'right' as const, render: (v: number) => <strong>{formatNumber(v)}</strong> },
  ];

  const asientoColumns = [
    { title: 'Cuenta', dataIndex: 'noCuenta', key: 'noCuenta', width: 120 },
    { title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true, render: (v: string) => v ? toTitleCase(v) : '-' },
    { title: 'Débito', dataIndex: 'debito', key: 'debito', width: 120, align: 'right' as const, render: (v: number) => formatNumber(v) },
    { title: 'Crédito', dataIndex: 'credito', key: 'credito', width: 120, align: 'right' as const, render: (v: number) => formatNumber(v) },
  ];

  const impuestoColumns = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 100 },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', ellipsis: true },
    { title: 'Porcentaje', dataIndex: 'porcentaje', key: 'porcentaje', width: 110, align: 'right' as const, render: (v: number) => `${formatNumber(v)}%` },
    { title: 'Monto', dataIndex: 'monto', key: 'monto', width: 120, align: 'right' as const, render: (v: number) => formatNumber(v) },
  ];

  const logColumns = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 160, render: (v: string) => v ? new Date(v).toLocaleString('es-DO') : '-' },
    { title: 'Usuario', dataIndex: 'usuario', key: 'usuario', width: 120 },
    { title: 'Acción', dataIndex: 'accion', key: 'accion', width: 100 },
    { title: 'Detalle', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true },
  ];

  const sumDebitos = (data.asientos || []).reduce((s: number, a: any) => s + (a.debito || 0), 0);
  const sumCreditos = (data.asientos || []).reduce((s: number, a: any) => s + (a.credito || 0), 0);

  const headerCard = (
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
      className="paces-card"
      style={{ marginBottom: 16 }}
    >
      <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
        <Descriptions.Item label="Documento">{data.noDocumento || '-'}</Descriptions.Item>
        <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
        <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
        <Descriptions.Item label="Referencia">{data.referencia || '-'}</Descriptions.Item>
        <Descriptions.Item label="Moneda">{data.moneda?.nombre ? toTitleCase(data.moneda.nombre) : '-'}</Descriptions.Item>
        <Descriptions.Item label="Tasa">{data.tasa ? formatNumber(data.tasa) : '-'}</Descriptions.Item>
      </Descriptions>
    </Card>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/${codigoPantalla}`)}>
          Volver
        </Button>
        <div style={{ flex: 1 }} />
        <Space>
          <Button icon={<PrinterOutlined />} loading={imprimiendo} onClick={async () => {
            setImprimiendo(true);
            try {
              const res = await apiClient.get(`/reportes/contabilidad/nota-credito/${sucursalActiva}/${id}`, {
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
            {headerCard}
            <Tabs defaultActiveKey="documentos" type="card">
              <TabPane tab={`Documentos (${data.transaccionesAsociadas?.length || 0})`} key="documentos">
                <Table
                  dataSource={data.transaccionesAsociadas || []}
                  columns={asociadasColumns}
                  rowKey={(r: any) => r.transaccionAsociadaID || r.id}
                  size="small"
                  pagination={false}
                  scroll={{ x: 800 }}
                />
              </TabPane>
              <TabPane tab={`Asientos (${data.asientos?.length || 0})`} key="asientos">
                <Table
                  dataSource={data.asientos || []}
                  columns={asientoColumns}
                  rowKey={(r: any) => r.id || r.asientoID}
                  size="small"
                  pagination={false}
                  scroll={{ x: 600 }}
                  summary={() => data.asientos?.length ? (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0}><strong>Totales</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={1} />
                      <Table.Summary.Cell index={2} align="right"><strong>{formatNumber(sumDebitos)}</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right"><strong>{formatNumber(sumCreditos)}</strong></Table.Summary.Cell>
                    </Table.Summary.Row>
                  ) : null}
                />
              </TabPane>
              <TabPane tab={`Impuestos (${data.impuestosFactura?.length || 0})`} key="impuestos">
                <Table
                  dataSource={data.impuestosFactura || []}
                  columns={impuestoColumns}
                  rowKey={(r: any) => r.id || r.codigo}
                  size="small"
                  pagination={false}
                  scroll={{ x: 500 }}
                />
              </TabPane>
              <TabPane tab={`Historial (${data.logs?.length || 0})`} key="logs">
                <Table
                  dataSource={data.logs || []}
                  columns={logColumns}
                  rowKey={(r: any) => r.id || r.fecha}
                  size="small"
                  pagination={false}
                  scroll={{ x: 600 }}
                />
              </TabPane>
            </Tabs>
          </Col>
          <Col lg={6}>
            <EntidadCard entidad={data.entidad} tipoEntidad={tipoEntidad} />
            <TotalesCard data={data} />
          </Col>
        </Row>
      ) : (
        <div>
          {headerCard}
          <EntidadCard entidad={data.entidad} tipoEntidad={tipoEntidad} />
          <Tabs defaultActiveKey="documentos" type="card">
            <TabPane tab={`Documentos (${data.transaccionesAsociadas?.length || 0})`} key="documentos">
              <Table
                dataSource={data.transaccionesAsociadas || []}
                columns={asociadasColumns}
                rowKey={(r: any) => r.transaccionAsociadaID || r.id}
                size="small"
                pagination={false}
                scroll={{ x: 800 }}
              />
            </TabPane>
            <TabPane tab={`Asientos (${data.asientos?.length || 0})`} key="asientos">
              <Table
                dataSource={data.asientos || []}
                columns={asientoColumns}
                rowKey={(r: any) => r.id || r.asientoID}
                size="small"
                pagination={false}
                scroll={{ x: 600 }}
                summary={() => data.asientos?.length ? (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}><strong>Totales</strong></Table.Summary.Cell>
                    <Table.Summary.Cell index={1} />
                    <Table.Summary.Cell index={2} align="right"><strong>{formatNumber(sumDebitos)}</strong></Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right"><strong>{formatNumber(sumCreditos)}</strong></Table.Summary.Cell>
                  </Table.Summary.Row>
                ) : null}
              />
            </TabPane>
            <TabPane tab={`Impuestos (${data.impuestosFactura?.length || 0})`} key="impuestos">
              <Table
                dataSource={data.impuestosFactura || []}
                columns={impuestoColumns}
                rowKey={(r: any) => r.id || r.codigo}
                size="small"
                pagination={false}
                scroll={{ x: 500 }}
              />
            </TabPane>
            <TabPane tab={`Historial (${data.logs?.length || 0})`} key="logs">
              <Table
                dataSource={data.logs || []}
                columns={logColumns}
                rowKey={(r: any) => r.id || r.fecha}
                size="small"
                pagination={false}
                scroll={{ x: 600 }}
              />
            </TabPane>
          </Tabs>
          <TotalesCard data={data} />
        </div>
      )}
    </div>
  );
};

export default NotaCreditoDetalle;
