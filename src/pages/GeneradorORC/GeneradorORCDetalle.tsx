import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tag, Spin, Button, Row, Col, Divider, Grid, message, Typography, Descriptions, Alert
} from 'antd';
import {
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { generadorOrcApi } from '../../api/generadorOrcApi';
import type { GeneradorOrdenCompraDTO, DetalleGeneradorDTO } from '../../types/generadorOrc';

const { Text } = Typography;

const ESTADO_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Borrador', color: 'default' },
  1: { label: 'Generado', color: 'success' },
  2: { label: 'Procesado', color: 'processing' },
  3: { label: 'Anulado', color: 'error' },
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(n);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function sumCantidades(cantidades: Record<string, number> | null | undefined): number {
  if (!cantidades) return 0;
  return Object.values(cantidades).reduce((sum, v) => sum + (v || 0), 0);
}

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(val: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const GeneradorORCDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);

  const [data, setData] = useState<GeneradorOrdenCompraDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);

  const handleRefresh = useCallback(() => {
    if (!id) return;
    setLoadingError(false);
    setLoading(true);
    generadorOrcApi.obtenerPorId(sucursalActiva, id)
      .then((res) => {
        setData(res);
        setPageTitleOverride(`GORC-${res.numero}`);
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  const screens = Grid.useBreakpoint();

  useEffect(() => {
    setActiveModule('FGORC');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    generadorOrcApi.obtenerPorId(sucursalActiva, id)
      .then((res) => {
        setData(res);
        setPageTitleOverride(`GORC-${res.numero}`);
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        message.error(msg);
        setLoadingError(true);
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
  const detalles = data.detalles || [];

  const sumSubTotal = detalles.reduce((s, d) => s + (d.subTotal || 0), 0);
  const sumDescuento = detalles.reduce((s, d) => s + (d.descuento || 0), 0);
  const sumImpuestos = detalles.reduce((s, d) => s + (d.impuestos || 0), 0);
  const sumTotal = detalles.reduce((s, d) => s + (d.total || 0), 0);

  const detalleColumns = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 100,
    },
    {
      title: 'Producto',
      key: 'producto',
      width: 220,
      render: (_: any, record: DetalleGeneradorDTO) => (
        <div>
          <div>{toTitleCase(record.producto || '')}</div>
          {record.referencia && (
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.referencia}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Medida',
      dataIndex: 'medida',
      key: 'medida',
      width: 80,
      render: (med: { id: number; nombre: string } | null) => med?.nombre || '-',
    },
    {
      title: 'Cantidad',
      key: 'cantidad',
      width: 100,
      align: 'right' as const,
      render: (_: any, record: DetalleGeneradorDTO) => formatNumber(sumCantidades(record.cantidades)),
    },
    {
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      width: 100,
      align: 'right' as const,
      render: (costo: number) => formatCurrency(costo || 0),
    },
    {
      title: 'Margen',
      dataIndex: 'margen',
      key: 'margen',
      width: 80,
      align: 'right' as const,
      render: (margen: number) => `${(margen || 0).toFixed(2)}%`,
    },
    {
      title: 'Precio Sug.',
      dataIndex: 'precioSugerido',
      key: 'precioSugerido',
      width: 110,
      align: 'right' as const,
      render: (val: number) => formatCurrency(val || 0),
    },
    {
      title: 'SubTotal',
      dataIndex: 'subTotal',
      key: 'subTotal',
      width: 110,
      align: 'right' as const,
      render: (val: number) => formatCurrency(val || 0),
    },
    {
      title: 'Desc. %',
      dataIndex: 'porcentajeDescuento',
      key: 'porcentajeDescuento',
      width: 80,
      align: 'right' as const,
      render: (val: number) => (val || 0).toFixed(2),
    },
    {
      title: 'Impuesto',
      dataIndex: 'impuestos',
      key: 'impuestos',
      width: 90,
      align: 'right' as const,
      render: (val: number) => formatCurrency(val || 0),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 110,
      align: 'right' as const,
      render: (val: number) => <Text strong>{formatCurrency(val || 0)}</Text>,
    },
  ];

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle del generador ORC"
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

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/FGORC')}>
          Volver
        </Button>
        <div style={{ flex: 1 }} />
      </div>

      {isLarge ? (
        /* === DESKTOP LAYOUT (≥ lg) === */
        <Row gutter={16}>
          <Col lg={18}>
            <Card className="paces-card" size="small" title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Datos del Generador</span>
                <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
              </div>
            } style={{ marginBottom: 16 }}>
              <Descriptions bordered size="small" column={3} styles={{ content: { background: 'transparent' } }}>
                <Descriptions.Item label="Número:">
                  {data.numero || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha:">
                  {formatDate(data.fecha)}
                </Descriptions.Item>
                <Descriptions.Item label="Suplidor:">
                  {data.suplidor ? toTitleCase(data.suplidor.nombre) : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Almacén:" span={2}>
                  {toTitleCase(data.almacen || '-')}
                </Descriptions.Item>
                <Descriptions.Item label="Total:">
                  <Text strong>{formatCurrency(data.total)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Notas:" span={3}>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{data.notas || '-'}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card className="paces-card" size="small" title={`Productos (${detalles.length})`}>
              {detalles.length > 0 ? (
                <Table<DetalleGeneradorDTO>
                  dataSource={detalles}
                  columns={detalleColumns}
                  rowKey="codigo"
                  size="small"
                  pagination={false}
                  scroll={{ x: 1200 }}
                  summary={() => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}><Text strong>Totales</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={1} />
                      <Table.Summary.Cell index={2} />
                      <Table.Summary.Cell index={3} />
                      <Table.Summary.Cell index={4} />
                      <Table.Summary.Cell index={5} />
                      <Table.Summary.Cell index={6} align="right">{formatCurrency(sumSubTotal)}</Table.Summary.Cell>
                      <Table.Summary.Cell index={7} align="right">{formatNumber(sumDescuento)}</Table.Summary.Cell>
                      <Table.Summary.Cell index={8} align="right">{formatCurrency(sumImpuestos)}</Table.Summary.Cell>
                      <Table.Summary.Cell index={9} align="right"><Text strong style={{ color: 'var(--paces-primary)' }}>{formatCurrency(sumTotal)}</Text></Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div className="paces-text-secondary">No hay productos en este generador</div>
                </div>
              )}
            </Card>
          </Col>

          <Col lg={6}>
            <Card className="paces-card" title={<span style={{ fontSize: 16, fontWeight: 600 }}>Resumen</span>}>
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ fontSize: 16, fontWeight: 700, textAlign: 'right' }}>
                <div className="paces-text-secondary" style={{ fontSize: 13, fontWeight: 400, marginBottom: 4 }}>Total</div>
                <span style={{ color: 'var(--paces-primary)' }}>{formatCurrency(data.total)}</span>
              </div>
              {data.notas && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }} className="paces-text-secondary">Notas</div>
                    <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5 }} className="paces-text-dark">
                      {data.notas}
                    </div>
                  </div>
                </>
              )}
            </Card>
          </Col>
        </Row>
      ) : (
        /* === MOBILE LAYOUT (< lg) === */
        <div>
          <Card className="paces-card" size="small" title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Datos del Generador</span>
              <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
            </div>
          } style={{ marginBottom: 16 }}>
            <Descriptions bordered size="small" column={1} styles={{ content: { background: 'transparent' } }}>
              <Descriptions.Item label="Número:">
                {data.numero || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha:">
                {formatDate(data.fecha)}
              </Descriptions.Item>
              <Descriptions.Item label="Suplidor:">
                {data.suplidor ? toTitleCase(data.suplidor.nombre) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Almacén:">
                {toTitleCase(data.almacen || '-')}
              </Descriptions.Item>
              <Descriptions.Item label="Total:">
                <Text strong>{formatCurrency(data.total)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Notas:">
                <span style={{ whiteSpace: 'pre-wrap' }}>{data.notas || '-'}</span>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card className="paces-card" size="small" title={`Productos (${detalles.length})`} style={{ marginBottom: 16 }}>
            {detalles.length > 0 ? (
              <Table<DetalleGeneradorDTO>
                dataSource={detalles}
                columns={detalleColumns}
                rowKey="codigo"
                size="small"
                pagination={false}
                scroll={{ x: 1200 }}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={2}><Text strong>Totales</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={1} />
                    <Table.Summary.Cell index={2} />
                    <Table.Summary.Cell index={3} />
                    <Table.Summary.Cell index={4} />
                    <Table.Summary.Cell index={5} />
                    <Table.Summary.Cell index={6} align="right">{formatCurrency(sumSubTotal)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={7} align="right">{formatNumber(sumDescuento)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={8} align="right">{formatCurrency(sumImpuestos)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={9} align="right"><Text strong style={{ color: 'var(--paces-primary)' }}>{formatCurrency(sumTotal)}</Text></Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div className="paces-text-secondary">No hay productos en este generador</div>
              </div>
            )}
          </Card>

          <Card className="paces-card" title={<span style={{ fontSize: 16, fontWeight: 600 }}>Resumen</span>}>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ fontSize: 16, fontWeight: 700, textAlign: 'right' }}>
              <div className="paces-text-secondary" style={{ fontSize: 13, fontWeight: 400, marginBottom: 4 }}>Total</div>
              <span style={{ color: 'var(--paces-primary)' }}>{formatCurrency(data.total)}</span>
            </div>
            {data.notas && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }} className="paces-text-secondary">Notas</div>
                  <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5 }} className="paces-text-dark">
                    {data.notas}
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

export default GeneradorORCDetalle;
