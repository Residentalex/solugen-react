import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Grid, message, Typography, Alert,
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { ordenCompraApi } from '../../api/ordenCompraApi';
import PermissionGate from '../../components/PermissionGate';

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

function formatDate(val: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const ACCION_MAP: Record<number, string> = {
  0: 'Crear', 1: 'Modificar', 2: 'Eliminar', 3: 'Aplicar',
  4: 'Desaplicar', 5: 'Postear', 6: 'Anular', 7: 'Revisar',
  8: 'Reversar', 9: 'Escanear',
};

const OrdenCompraDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);

  useEffect(() => {
    setActiveModule('FORC');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    ordenCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setPageTitleOverride(`ORC-${res.noDocumento || id}`);
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar la orden de compra';
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  const handleRefresh = useCallback(() => {
    setLoadingError(false);
    if (!id) return;
    setLoading(true);
    ordenCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setPageTitleOverride(`ORC-${res.noDocumento || id}`);
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  if (loading || !data) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando orden de compra...</div>
      </div>
    );
  }

  const isLarge = screens.lg ?? true;
  const estadoInfo = ESTADO_MAP[data.estado] || { label: 'Desconocido', color: 'default' };

  const detalleColumns = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
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
      title: 'Costo',
      key: 'costo',
      width: 130,
      align: 'right' as const,
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
      width: 130,
      align: 'right' as const,
      onHeaderCell: () => ({ style: { paddingRight: 8 } }),
      render: (_: any, record: any) => (
        <div style={{ paddingRight: 8 }}>
          <Text strong>{formatNumber(record.total || 0)}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
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
    { title: 'Usuario', dataIndex: 'usuario', key: 'usuario', width: 200,
      render: (v: any) => (v?.nombre ? toTitleCase(v.nombre) : v?.nombreUsuario ? toTitleCase(v.nombreUsuario) : '-') },
    { title: 'Estacion', dataIndex: 'estacion', key: 'estacion', width: 200 },
    { title: 'Accion', dataIndex: 'accion', key: 'accion', width: 120,
      render: (v: number) => ACCION_MAP[v] || `Accion ${v}` },
    { title: 'Motivos', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true },
  ];

  function esDebito(tipo: any): boolean { return tipo === 'D' || tipo === 0; }
  function esCredito(tipo: any): boolean { return tipo === 'C' || tipo === 1; }

  const totalDebitos = (data.asientos || []).reduce((s: number, r: any) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
  const totalCreditos = (data.asientos || []).reduce((s: number, r: any) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);

  const esEditable = data.estado === 0;

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
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/FORC')}>
          Volver
        </Button>
        <div style={{ flex: 1 }} />
        <Space>
          {esEditable && (
            <PermissionGate accion="EDITAR">
              <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/FORC/${id}/editar`)}>
                Editar
              </Button>
            </PermissionGate>
          )}
          <Button icon={<ReloadOutlined />} onClick={() => {
            setLoading(true);
            ordenCompraApi.obtenerPorId(sucursalActiva, parseInt(id!))
              .then((res) => setData(res))
              .catch((err: any) => message.error(err?.response?.data?.errorMessage || 'Error al recargar'))
              .finally(() => setLoading(false));
          }} />
        </Space>
      </div>

      {isLarge ? (
        <Row gutter={16}>
          <Col lg={18}>
            <Card className="paces-card" size="small" title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
                <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
              </div>
            } style={{ marginBottom: 16 }}>
              <Descriptions bordered size="small" column={3} styles={{ content: { background: 'transparent' } }}>
                <Descriptions.Item label="Documento">
                  {data.noDocumento || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Concepto">
                  {data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="NCF">
                  {data.ncf || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha Doc.">
                  {formatDate(data.fechaDocumento)}
                </Descriptions.Item>
                <Descriptions.Item label="Suplidor">
                  {data.suplidor?.nombre ? toTitleCase(data.suplidor.nombre) : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Referencia">
                  {data.referencia || '-'}
                </Descriptions.Item>
                {data.nota && (
                  <Descriptions.Item label="Nota" span={3}>
                    <span style={{ whiteSpace: 'pre-wrap' }}>{data.nota}</span>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            <Tabs defaultActiveKey="detalles" type="card"
              items={[
                {
                  key: 'detalles',
                  label: `Detalles (${data.detalles?.length || 0})`,
                  children: (
                    <Table dataSource={data.detalles || []} columns={detalleColumns} rowKey={(r: any) => r.id || r.codigo} size="small" pagination={false} scroll={{ x: 900 }} />
                  ),
                },
                {
                  key: 'asientos',
                  label: `Asientos (${data.asientos?.length || 0})`,
                  children: (
                    <Table dataSource={data.asientos || []} columns={asientoColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 700 }}
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
                  ),
                },
                {
                  key: 'historial',
                  label: `Historial (${data.logs?.length || 0})`,
                  children: (
                    <Table dataSource={data.logs || []} columns={logColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 900 }} />
                  ),
                },
              ]}
            />
          </Col>

          <Col lg={6}>
            <Card title={<span style={{ fontSize: 14, fontWeight: 600 }}>Suplidor</span>} className="paces-card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                {data.suplidor?.nombre ? toTitleCase(data.suplidor.nombre) : '-'}
              </div>
              {data.suplidor?.identificacion && (
                <div className="paces-text-secondary" style={{ fontSize: 13 }}>RNC: {data.suplidor.identificacion}</div>
              )}
              {data.suplidor?.telefono && (
                <div className="paces-text-secondary" style={{ fontSize: 13 }}>Tel: {data.suplidor.telefono}</div>
              )}
            </Card>

            <Card title={<span style={{ fontSize: 14, fontWeight: 600 }}>Totales</span>} className="paces-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">Subtotal</span>
                  <span>{formatNumber(data.subTotal || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">Descuento</span>
                  <span>{formatNumber(data.descuento || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">Impuestos</span>
                  <span>{formatNumber(data.impuestos || 0)}</span>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #e8e8e8', margin: '12px 0', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ color: '#556ee6' }}>{formatCurrency(data.total || 0)}</span>
              </div>
            </Card>
          </Col>
        </Row>
      ) : (
        <div>
          <Card className="paces-card" size="small" title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
              <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
            </div>
          } style={{ marginBottom: 16 }}>
            <Descriptions bordered size="small" column={1} styles={{ content: { background: 'transparent' } }}>
              <Descriptions.Item label="Documento">{data.noDocumento || '-'}</Descriptions.Item>
              <Descriptions.Item label="Concepto">{data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'}</Descriptions.Item>
              <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
              <Descriptions.Item label="Suplidor">{data.suplidor?.nombre ? toTitleCase(data.suplidor.nombre) : '-'}</Descriptions.Item>
              <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
              <Descriptions.Item label="Referencia">{data.referencia || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title={<span style={{ fontSize: 14, fontWeight: 600 }}>Suplidor</span>} className="paces-card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600 }}>{data.suplidor?.nombre ? toTitleCase(data.suplidor.nombre) : '-'}</div>
            {data.suplidor?.identificacion && <div className="paces-text-secondary">RNC: {data.suplidor.identificacion}</div>}
          </Card>

          <Tabs defaultActiveKey="detalles" type="card"
            items={[
              {
                key: 'detalles',
                label: `Detalles (${data.detalles?.length || 0})`,
                children: <Table dataSource={data.detalles || []} columns={detalleColumns} rowKey={(r: any) => r.id || r.codigo} size="small" pagination={false} scroll={{ x: 900 }} />,
              },
              {
                key: 'asientos',
                label: `Asientos (${data.asientos?.length || 0})`,
                children: <Table dataSource={data.asientos || []} columns={asientoColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 700 }} />,
              },
              {
                key: 'historial',
                label: `Historial (${data.logs?.length || 0})`,
                children: <Table dataSource={data.logs || []} columns={logColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 900 }} />,
              },
            ]}
          />

          <Card title={<span style={{ fontSize: 14, fontWeight: 600 }}>Totales</span>} className="paces-card" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'right' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="paces-text-secondary">Subtotal</span>
                <span>{formatNumber(data.subTotal || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="paces-text-secondary">Descuento</span>
                <span>{formatNumber(data.descuento || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="paces-text-secondary">Impuestos</span>
                <span>{formatNumber(data.impuestos || 0)}</span>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #e8e8e8', margin: '12px 0', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700 }}>
              <span>Total</span>
              <span style={{ color: '#556ee6' }}>{formatCurrency(data.total || 0)}</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OrdenCompraDetalle;
