import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message, Input, Typography, Tooltip
} from 'antd';
import {
  ArrowLeftOutlined,
  PrinterOutlined,
  LockFilled,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { transferenciaAlmacenApi } from '../../api/transferenciaAlmacenApi';
import PermissionGate from '../../components/PermissionGate';

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

const TransferenciaAlmacenDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');
  const [tieneScan, setTieneScan] = useState<boolean | null>(null);
  const screens = Grid.useBreakpoint();

  useEffect(() => {
    setActiveModule('FTRP');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
        // Verificar si tiene documento escaneado
        transferenciaAlmacenApi.verificarScan(sucursalActiva, parseInt(id))
          .then((scanRes) => setTieneScan(scanRes.existe))
          .catch(() => setTieneScan(false));
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

  function esDebito(tipo: any): boolean { return tipo === 'D' || tipo === 0; }
  function esCredito(tipo: any): boolean { return tipo === 'C' || tipo === 1; }

  const totalDebitos = (data.asientos || []).reduce((s: number, r: any) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
  const totalCreditos = (data.asientos || []).reduce((s: number, r: any) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);

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

  // ===== Handlers de acciones de estado =====
  const handleAplicar = async () => {
    if (!id) return;

    // Verificación temprana del scanner
    if (tieneScan === false) {
      message.warning('Debe escanear el documento antes de aplicar.');
      return;
    }

    setSaving(true);
    try {
      await transferenciaAlmacenApi.aplicar(sucursalActiva, parseInt(id));
      message.success('Documento aplicado exitosamente');
      const res = await transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id));
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
      await transferenciaAlmacenApi.anular(sucursalActiva, data as any);
      message.success('Documento anulado exitosamente');
      const res = await transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id!));
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
      await transferenciaAlmacenApi.postear(sucursalActiva, data as any);
      message.success('Documento posteado exitosamente');
      const res = await transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id!));
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
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/FTRP')}>
          Volver
        </Button>
        <div style={{ flex: 1 }} />
        <Space>
          {data.estado === 0 && data.periodo !== 6 && (
            <PermissionGate accion="EDITAR">
              <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/FTRP/${id}/editar`)}>Editar</Button>
            </PermissionGate>
          )}
          <PermissionGate accion="IMPRIMIR">
            <Button icon={<PrinterOutlined />} loading={imprimiendo} onClick={async () => {
            setImprimiendo(true);
            try {
              const res = await apiClient.post('/reportes/inventario/transferencia', data, {
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
          }} />
          </PermissionGate>
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
        </Space>
      </div>

      {isLarge ? (
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
                    {tieneScan === true && (
                      <Tooltip title="Documento escaneado">
                        <Tag icon={<FileTextOutlined />} color="success" />
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
              <Descriptions bordered size="small" column={2} styles={{ content: { background: 'transparent' } }}>
                <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
                <Descriptions.Item label="Concepto">{data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Almacen Origen">{data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Almacen Destino">{data.almacenDestino?.nombre ? toTitleCase(data.almacenDestino.nombre) : '-'}</Descriptions.Item>
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
            <TotalesCard subTotal={data.subTotal || 0} descuento={data.descuento || 0} impuestos={data.impuestos || 0} total={data.total} nota={data.nota} alignRight={false}
              monedaSimbolo={data.moneda?.simbolo || 'RD$'}
              monedaNombre={data.moneda?.nombre || 'Peso Dominicano'}
              tasa={data.tasa ?? 1}
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
                      <Tooltip title="Documento escaneado">
                        <Tag icon={<FileTextOutlined />} color="success" />
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
                <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
                <Descriptions.Item label="Concepto">{data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Almacen Origen">{data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Almacen Destino">{data.almacenDestino?.nombre ? toTitleCase(data.almacenDestino.nombre) : '-'}</Descriptions.Item>
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

          <TotalesCard subTotal={data.subTotal || 0} descuento={data.descuento || 0} impuestos={data.impuestos || 0} total={data.total} nota={data.nota} alignRight={true}
            monedaSimbolo={data.moneda?.simbolo || 'RD$'}
            monedaNombre={data.moneda?.nombre || 'Peso Dominicano'}
            tasa={data.tasa ?? 1}
          />
        </div>
      )}
    </div>
  );
};

export default TransferenciaAlmacenDetalle;
