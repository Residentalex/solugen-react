import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message, Input
} from 'antd';
import {
  ArrowLeftOutlined, PrinterOutlined, EditOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { notaCreditoApi } from '../../api/notaCreditoApi';
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

function formatDate(val: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

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

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface EntidadCardProps {
  entidad: { nombre: string; identificacion: string; telefono?: string } | undefined;
  tipoEntidad: 'SUP' | 'CLI';
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
        <span className="paces-text-secondary">RNC: </span>
        <span>{entidad?.identificacion || '-'}</span>
      </div>
      <div>
        <span className="paces-text-secondary">Teléfono: </span>
        <span>{entidad?.telefono || '-'}</span>
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
  const [error, setError] = useState<string | null>(null);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');
  const screens = Grid.useBreakpoint();

  const codigoPantalla = tipoEntidad === 'SUP' ? 'FNCSUP' : 'FNCCLI';

  useEffect(() => {
    setActiveModule(codigoPantalla);
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride, codigoPantalla]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    notaCreditoApi.obtenerPorId(sucursalActiva, parseInt(id))
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
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/${codigoPantalla}`)}>
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

  // ===== Documentos filtrados por búsqueda =====
  const documentosFiltrados = detalleSearch
    ? (data?.transaccionesAsociadas || []).filter((d: any) => {
        const q = detalleSearch.toLowerCase();
        return (
          (d.documento || '').toLowerCase().includes(q) ||
          (d.nCF || '').toLowerCase().includes(q)
        );
      })
    : (data?.transaccionesAsociadas || []);

  const asociadasColumns = [
    { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140 },
    { title: 'NCF', dataIndex: 'nCF', key: 'nCF', width: 140, render: (v: string) => v || '-' },
    { title: 'Monto Original', dataIndex: 'montoOriginal', key: 'montoOriginal', width: 130, align: 'right' as const, render: (v: number) => formatNumber(v) },
    { title: 'Pagado', dataIndex: 'pagado', key: 'pagado', width: 120, align: 'right' as const, render: (v: number) => formatNumber(v) },
    { title: 'Saldo', dataIndex: 'saldoPendiente', key: 'saldoPendiente', width: 120, align: 'right' as const, render: (v: number) => <strong>{formatNumber(v)}</strong> },
    { title: 'Monto', dataIndex: 'monto', key: 'monto', width: 120, align: 'right' as const, render: (v: number) => <strong>{formatNumber(v)}</strong> },
  ];

  const asientoColumns = [
    { title: 'Cuenta', key: 'cuenta', width: 120,
      render: (_: any, r: any) => r.cuentaContable?.noCuenta || '-' },
    { title: 'Nombre', key: 'nombre', ellipsis: true,
      render: (_: any, r: any) => r.cuentaContable?.nombre ? toTitleCase(r.cuentaContable.nombre) : '-' },
    { title: 'Descripcion', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true,
      render: (v: string) => v ? toTitleCase(v) : '-' },
    { title: 'Debito', key: 'debito', width: 130, align: 'right' as const,
      render: (_: any, r: any) => esDebito(r.tipoAsiento) ? formatNumber(r.monto) : '' },
    { title: 'Credito', key: 'credito', width: 130, align: 'right' as const,
      render: (_: any, r: any) => esCredito(r.tipoAsiento) ? formatNumber(r.monto) : '' },
  ];

  const logColumns = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 160, render: (v: string) => formatDate(v) },
    { title: 'Usuario', dataIndex: 'usuario', key: 'usuario', width: 200, render: (v: any) => (v?.nombre ? toTitleCase(v.nombre) : v?.nombreUsuario ? toTitleCase(v.nombreUsuario) : '-') },
    { title: 'Estacion', dataIndex: 'estacion', key: 'estacion', width: 200 },
    { title: 'Accion', dataIndex: 'accion', key: 'accion', width: 120, render: (v: number) => ACCION_MAP[v] || `Accion ${v}` },
    { title: 'Motivos', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true },
  ];

  function esDebito(tipo: any): boolean { return tipo === 'D' || tipo === 0; }
  function esCredito(tipo: any): boolean { return tipo === 'C' || tipo === 1; }

  const totalDebitos = (data.asientos || []).reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
  const totalCreditos = (data.asientos || []).reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/${codigoPantalla}`)}>
          Volver
        </Button>
        <div style={{ flex: 1 }} />
        <Space>
          <Button icon={<PrinterOutlined />} loading={imprimiendo} onClick={async () => {
            setImprimiendo(true);
            try {
              const res = await apiClient.get(`/reportes/contabilidad/nota-credito/${data.codigoSucursal ? obtenerNombreEnumSucursal(data.codigoSucursal) : sucursalActiva}/${id}`, {
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
            <Button type="primary" icon={<EditOutlined />}>Editar</Button>
          )}
        </Space>
      </div>

      {isLarge ? (
        /* === DESKTOP LAYOUT (≥ lg) === */
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
                <Descriptions.Item label="Documento">{data.noDocumento || '-'}</Descriptions.Item>
                <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
                <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
                <Descriptions.Item label="Referencia">{data.referencia || '-'}</Descriptions.Item>
                <Descriptions.Item label="Moneda">{data.moneda?.nombre ? toTitleCase(data.moneda.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Tasa">{data.tasa ? formatNumber(data.tasa) : '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Tabs defaultActiveKey="documentos" type="card">
              <TabPane tab={`Documentos (${documentosFiltrados.length}${detalleSearch ? `/${data.transaccionesAsociadas?.length || 0}` : ''})`} key="documentos">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <Input.Search
                    placeholder="Buscar documento..."
                    allowClear
                    style={{ maxWidth: 250 }}
                    onSearch={(value) => setDetalleSearch(value)}
                    onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                  />
                </div>
                <Table dataSource={documentosFiltrados} columns={asociadasColumns} rowKey={(r: any) => r.transaccionAsociadaID || r.id} size="small" pagination={false} scroll={{ x: 800 }} />
              </TabPane>
              <TabPane tab={`Asientos (${data.asientos?.length || 0})`} key="asientos">
                <Table dataSource={data.asientos || []} columns={asientoColumns} rowKey={(r: any) => r.id || r.asientoID} size="small" pagination={false} scroll={{ x: 600 }}
                  summary={() => (
                    <Table.Summary fixed>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3}><strong>Totales</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right"><strong>{formatNumber(totalDebitos)}</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={4} align="right"><strong>{formatNumber(totalCreditos)}</strong></Table.Summary.Cell>
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
            <EntidadCard entidad={data.entidad} tipoEntidad={tipoEntidad} />
            <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} total={data.total} nota={data.nota} alignRight={false} />
          </Col>
        </Row>
      ) : (
        /* === MOBILE LAYOUT (< lg) === */
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
              <Descriptions.Item label="Documento">{data.noDocumento || '-'}</Descriptions.Item>
              <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
              <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
              <Descriptions.Item label="Referencia">{data.referencia || '-'}</Descriptions.Item>
              <Descriptions.Item label="Moneda">{data.moneda?.nombre ? toTitleCase(data.moneda.nombre) : '-'}</Descriptions.Item>
              <Descriptions.Item label="Tasa">{data.tasa ? formatNumber(data.tasa) : '-'}</Descriptions.Item>
            </Descriptions>
          </Card>

          <EntidadCard entidad={data.entidad} tipoEntidad={tipoEntidad} />

          <Tabs defaultActiveKey="documentos" type="card">
            <TabPane tab={`Documentos (${documentosFiltrados.length}${detalleSearch ? `/${data.transaccionesAsociadas?.length || 0}` : ''})`} key="documentos">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <Input.Search
                  placeholder="Buscar documento..."
                  allowClear
                  style={{ maxWidth: 250 }}
                  onSearch={(value) => setDetalleSearch(value)}
                  onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                />
              </div>
              <Table dataSource={documentosFiltrados} columns={asociadasColumns} rowKey={(r: any) => r.transaccionAsociadaID || r.id} size="small" pagination={false} scroll={{ x: 800 }} />
            </TabPane>
            <TabPane tab={`Asientos (${data.asientos?.length || 0})`} key="asientos">
              <Table dataSource={data.asientos || []} columns={asientoColumns} rowKey={(r: any) => r.id || r.asientoID} size="small" pagination={false} scroll={{ x: 600 }}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={3}><strong>Totales</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right"><strong>{formatNumber(totalDebitos)}</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="right"><strong>{formatNumber(totalCreditos)}</strong></Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </TabPane>
            <TabPane tab={`Historial (${data.logs?.length || 0})`} key="historial">
              <Table dataSource={data.logs || []} columns={logColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 900 }} />
            </TabPane>
          </Tabs>

          <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} total={data.total} nota={data.nota} alignRight={true} />
        </div>
      )}
    </div>
  );
};

export default NotaCreditoDetalle;
