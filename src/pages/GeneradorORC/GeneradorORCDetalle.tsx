import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tag, Spin, Button, Row, Col, Divider, Grid, message, Typography, Descriptions, Alert, Input
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  IdcardOutlined,
  CalendarOutlined,
  ShoppingCartOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { generadorOrcApi } from '../../api/generadorOrcApi';
import type { GeneradorOrdenCompraDTO, DetalleGeneradorDTO } from '../../types/generadorOrc';
import { ErrorDetalle } from '../../components';

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

function calcularFilaGORC(fila: DetalleGeneradorDTO): DetalleGeneradorDTO {
  const cantTotal = Object.values(fila.cantidades || {}).reduce((s, v) => s + (v || 0), 0);
  const costo = fila.costo || 0;
  const pctDesc = fila.porcentajeDescuento || 0;
  const pctImp = fila.impuesto?.porcentaje ?? 0;
  const subTotal = Math.round(cantTotal * costo * 100) / 100;
  const descuento = Math.round(subTotal * (pctDesc / 100) * 100) / 100;
  const base = subTotal - descuento;
  const impuestos = Math.round(base * (pctImp / 100) * 100) / 100;
  const total = Math.round((base + impuestos) * 100) / 100;
  return { ...fila, subTotal, descuento, impuestos, total };
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
  const [detalleSearch, setDetalleSearch] = useState('');

  const detallesFiltrados = useMemo(() => {
    const d = (data?.detalles || []).map((item) => calcularFilaGORC(item));
    return detalleSearch
      ? d.filter(item => {
          const q = detalleSearch.toLowerCase();
          return (item.codigo || '').toLowerCase().includes(q) ||
                 (item.producto || '').toLowerCase().includes(q);
        })
      : d;
  }, [data, detalleSearch]);

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
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
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

  if (loading || (!data && !loadingError)) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando documento...</div>
      </div>
    );
  }
  if (loadingError && !data) {
    return <ErrorDetalle mensaje="Error al cargar el documento" rutaVolver="/FGORC" />;
  }
  if (!data) return null;

  const isLarge = screens.lg ?? true;
  const estadoInfo = ESTADO_MAP[data.estado] || { label: 'Desconocido', color: 'default' };
  const detalles = detallesFiltrados;

  const sumSubTotal = detalles.reduce((s, d) => s + (d.subTotal || 0), 0);
  const sumDescuento = detalles.reduce((s, d) => s + (d.descuento || 0), 0);
  const sumImpuestos = detalles.reduce((s, d) => s + (d.impuestos || 0), 0);
  const sumTotal = detalles.reduce((s, d) => s + (d.total || 0), 0);

  const SUC_BAND: Record<string, string> = {
    OP: 'gorc-band-op',
    HR: 'gorc-band-hr',
    VH: 'gorc-band-vh',
  };

  const sucursalColumns = (suc: string) => ({
    title: suc,
    className: SUC_BAND[suc] || '',
    children: [
      {
        title: 'Cant.', key: `${suc}_cant`, width: 80, align: 'right' as const,
        onHeaderCell: () => ({ className: SUC_BAND[suc] || '' }),
        onCell: () => ({ className: `gorc-cell-${suc.toLowerCase()}` }),
        render: (_: any, record: DetalleGeneradorDTO) => (
          <div>
            <Text strong>{formatNumber(record.cantidades?.[suc] ?? 0)}</Text>
            {record.medida?.nombre && (
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, textAlign: 'right' }}>
                {record.medida.nombre}
              </div>
            )}
          </div>
        ),
      },
      {
        title: 'Bonif.', key: `${suc}_bonif`, width: 75, align: 'right' as const,
        onHeaderCell: () => ({ className: SUC_BAND[suc] || '' }),
        onCell: () => ({ className: `gorc-cell-${suc.toLowerCase()}` }),
        render: (_: any, record: DetalleGeneradorDTO) => formatNumber(record.cantidadesBonificadas?.[suc] ?? 0),
      },
      {
        title: 'Exist.\nConteo', key: `${suc}_existconteo`, width: 90, align: 'right' as const,
        onHeaderCell: () => ({ className: SUC_BAND[suc] || '' }),
        onCell: () => ({ className: `gorc-cell-${suc.toLowerCase()}` }),
        render: (_: any, record: DetalleGeneradorDTO) => (
          <div>
            <div>{formatNumber(record.existencias?.[suc] ?? 0)}</div>
            <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5 }}>
              {formatNumber(record.existenciasFisicas?.[suc] ?? 0)}
            </div>
          </div>
        ),
      },
    ],
  });

  const detalleColumns = [
    {
      title: 'Información',
      className: 'gorc-band-info',
      children: [
        {
          title: 'Artículo', key: 'producto',
          onCell: () => ({ style: { paddingLeft: 16 } }),
          onHeaderCell: () => ({ style: { paddingLeft: 16 } }),
          render: (_: any, record: DetalleGeneradorDTO) => (
            <div style={{ fontSize: 13 }}>
              <div style={{ fontWeight: 500 }}>{toTitleCase(record.producto || '')}</div>
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5 }}>
                <span>{record.codigo}</span>
                {record.codigo && record.referencia && <span>{' | '}</span>}
                {record.referencia && <span>{record.referencia}</span>}
              </div>
            </div>
          ),
        },
        {
          title: 'Costo', dataIndex: 'costo', key: 'costo', width: 90, align: 'right' as const,
          render: (costo: number) => formatNumber(costo || 0),
        },
        {
          title: 'Margen %', dataIndex: 'margen', key: 'margen', width: 100, align: 'right' as const,
          render: (margen: number) => `${(margen || 0).toFixed(2)}%`,
        },
        {
          title: 'P. Sugerido', dataIndex: 'precioSugerido', key: 'precioSugerido', width: 100, align: 'right' as const,
          render: (val: number) => formatNumber(val || 0),
        },
      ],
    },
    // Columnas agrupadas por sucursal (OP, HR, VH)
    sucursalColumns('OP'),
    sucursalColumns('HR'),
    sucursalColumns('VH'),
    // Totales
    {
      title: 'Totales',
      className: 'gorc-band-totales',
      children: [
        {
          title: 'SubTotal', dataIndex: 'subTotal', key: 'subTotal', width: 110, align: 'right' as const,
          render: (val: number) => formatNumber(val || 0),
        },
        {
          title: 'Descuento', key: 'descuento_comb', width: 100, align: 'right' as const,
          render: (_: any, record: DetalleGeneradorDTO) => (
            <div>
              <div>{(record.porcentajeDescuento || 0).toFixed(2)}%</div>
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5 }}>
                {formatNumber(record.descuento || 0)}
              </div>
            </div>
          ),
        },
        {
          title: 'Impuesto', dataIndex: 'impuestos', key: 'impuestos', width: 140, align: 'right' as const,
          render: (_: any, record: DetalleGeneradorDTO) => (
            <div>
              <div>{formatNumber(record.impuestos || 0)}</div>
              {(record.impuesto as any)?.nombre && (
                <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5 }}>
                  {toTitleCase((record.impuesto as any).nombre)}
                </div>
              )}
            </div>
          ),
        },
        {
          title: 'Total', dataIndex: 'total', key: 'total', width: 110, align: 'right' as const,
          render: (val: number) => <Text strong style={{ color: 'var(--paces-primary)' }}>{formatNumber(val || 0)}</Text>,
        },
      ],
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
        <div>
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

            <Card className="paces-card" size="small" title={`Productos (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`}>
              {detalles.length > 0 ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <Input.Search
                      placeholder="Buscar producto..."
                      allowClear
                      style={{ maxWidth: 250 }}
                      prefix={<SearchOutlined className="paces-text-icon" />}
                      onSearch={(value) => setDetalleSearch(value)}
                      onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                    />
                  </div>
                  <Table<DetalleGeneradorDTO>
                    dataSource={detallesFiltrados}
                    columns={detalleColumns}
                    rowKey="codigo"
                    size="small"
                    pagination={false}
                    scroll={{ x: 1600 }}
                    summary={() => {
                      const colsAntes = 13;
                      return (
                        <Table.Summary fixed="bottom">
                          <Table.Summary.Row style={{ fontWeight: 600, backgroundColor: '#fafafa' }}>
                            <Table.Summary.Cell index={0} colSpan={colsAntes}>
                              <Text strong style={{ paddingLeft: 8 }}>Totales</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={colsAntes} align="right">{formatCurrency(sumSubTotal)}</Table.Summary.Cell>
                            <Table.Summary.Cell index={colsAntes + 1} align="right">{formatCurrency(sumDescuento)}</Table.Summary.Cell>
                            <Table.Summary.Cell index={colsAntes + 2} align="right">{formatCurrency(sumImpuestos)}</Table.Summary.Cell>
                            <Table.Summary.Cell index={colsAntes + 3} align="right">
                              <Text strong style={{ color: 'var(--paces-primary)' }}>{formatCurrency(sumTotal)}</Text>
                            </Table.Summary.Cell>
                          </Table.Summary.Row>
                        </Table.Summary>
                      );
                    }}
                  />
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div className="paces-text-secondary">No hay productos en este generador</div>
                </div>
              )}
            </Card>
          </div>
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

          <Card className="paces-card" size="small" title={`Productos (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`} style={{ marginBottom: 16 }}>
            {detalles.length > 0 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <Input.Search
                    placeholder="Buscar producto..."
                    allowClear
                    style={{ maxWidth: 250 }}
                    prefix={<SearchOutlined className="paces-text-icon" />}
                    onSearch={(value) => setDetalleSearch(value)}
                    onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                  />
                </div>
                <Table<DetalleGeneradorDTO>
                  dataSource={detallesFiltrados}
                  columns={detalleColumns}
                  rowKey="codigo"
                  size="small"
                  pagination={false}
                  scroll={{ x: 1600 }}
                  summary={() => {
                    const colsAntes = 13;
                    return (
                      <Table.Summary fixed="bottom">
                        <Table.Summary.Row style={{ fontWeight: 600, backgroundColor: '#fafafa' }}>
                          <Table.Summary.Cell index={0} colSpan={colsAntes}>
                            <Text strong style={{ paddingLeft: 8 }}>Totales</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={colsAntes} align="right">{formatCurrency(sumSubTotal)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={colsAntes + 1} align="right">{formatCurrency(sumDescuento)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={colsAntes + 2} align="right">{formatCurrency(sumImpuestos)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={colsAntes + 3} align="right">
                            <Text strong style={{ color: 'var(--paces-primary)' }}>{formatCurrency(sumTotal)}</Text>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    );
                  }}
                />
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div className="paces-text-secondary">No hay productos en este generador</div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default GeneradorORCDetalle;
