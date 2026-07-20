import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Row, Col, Divider, Grid, message, Typography, Descriptions, Alert, Input, Tooltip, Space,
  Modal, Drawer, Avatar, Skeleton, Empty, Dropdown,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  EditOutlined,
  PrinterOutlined,
  SearchOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  ShopOutlined,
  ReloadOutlined,
  DownOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { generadorOrcApi } from '../../api/generadorOrcApi';
import { entradaAlmacenApi } from '../../api/entradaAlmacenApi';
import { apiClient } from '../../api/client';
import type { GeneradorOrdenCompraDTO, DetalleGeneradorDTO } from '../../types/generadorOrc';
import type { OrdenCompraVistaDTO } from '../../types/entradaAlmacen';
import { formatCurrency, formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { ErrorDetalle } from '../../components';
import SucursalDocumentoSelector from '../../components/SucursalDocumentoSelector';
import PermissionGate from '../../components/PermissionGate';

const { Text } = Typography;

const ESTADO_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Borrador', color: 'default' },
  1: { label: 'Generado', color: 'success' },
  2: { label: 'Procesado', color: 'processing' },
  3: { label: 'Anulado', color: 'error' },
};

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
  const { screenCode } = useScreenConfig();
  const screens = Grid.useBreakpoint();

  const [data, setData] = useState<GeneradorOrdenCompraDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');
  const [sucursalDestino, setSucursalDestino] = useState<number | undefined>(undefined);
  const [generando, setGenerando] = useState(false);
  const [ordenesGeneradas, setOrdenesGeneradas] = useState<OrdenCompraVistaDTO[]>([]);
  const [ordenesLoading, setOrdenesLoading] = useState(false);

  // Análisis / monitor
  const [analisisOpen, setAnalisisOpen] = useState(false);
  const [analisisDetalle, setAnalisisDetalle] = useState<DetalleGeneradorDTO | null>(null);
  const [analisisData, setAnalisisData] = useState<Array<{
    sucursal: number;
    sucursalNombre: string;
    codigo: string;
    nombre: string;
    fecha: string;
    documento: string;
    cantidad: number;
    resumen?: { ventasSinComponentes: number; ventasConComponentes: number; salidas: number; devolucionesCompra: number; devolucionesVenta: number };
  }>>([]);
  const [analisisLoading, setAnalisisLoading] = useState(false);
  const [analisisError, setAnalisisError] = useState(false);
  const [analisisResumenLoading, setAnalisisResumenLoading] = useState(false);

  // Modal movimientos
  const [movimientosModalOpen, setMovimientosModalOpen] = useState(false);
  const [movimientosSucursal, setMovimientosSucursal] = useState<string>('');
  const [movimientosData, setMovimientosData] = useState<Array<{
    transacid: number;
    tipoDocumento: string;
    fecha: string;
    documento: string;
    cantidad: number;
    descripcion: string;
  }>>([]);
  const [movimientosLoading, setMovimientosLoading] = useState(false);

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

  const handleGenerarOC = async () => {
    if (!id) return;
    Modal.confirm({
      title: 'Generar Órdenes de Compra',
      content: 'Se generarán Órdenes de Compra para las sucursales con cantidad > 0. ¿Continuar?',
      onOk: async () => {
        setGenerando(true);
        try {
          const ordenes = await generadorOrcApi.generarOC(sucursalActiva, id);
          message.success(`Se generaron ${ordenes.length} Órdenes de Compra`);
          handleRefresh();
          const resumen = ordenes
            .map((o) => `${o.documento?.codigo || 'ORC'}-${o.noDocumento}`)
            .join(', ');
          Modal.success({
            title: 'Órdenes generadas',
            content: (
              <div>
                <p>Se generaron {ordenes.length} orden(es):</p>
                <p>{resumen}</p>
              </div>
            ),
          });
        } catch (err: any) {
          const msg = err?.response?.data?.errorMessage || 'Error al generar OC';
          message.error(msg);
        } finally {
          setGenerando(false);
        }
      },
    });
  };

  useEffect(() => {
    setActiveModule(screenCode);
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride, screenCode]);

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

  // Efecto: cargar ORCs generadas
  useEffect(() => {
    if (!id || !data) return;
    setOrdenesLoading(true);
    generadorOrcApi.obtenerOrdenes(sucursalActiva, id)
      .then(setOrdenesGeneradas)
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar órdenes de compra';
        message.error(msg);
      })
      .finally(() => setOrdenesLoading(false));
  }, [id, sucursalActiva, data]);

  // Efecto: cargar análisis cuando se abre el Drawer
  useEffect(() => {
    if (!analisisOpen || !analisisDetalle) return;

    const SUCURSALES = [
      { id: 0, nombre: 'OP' },
      { id: 1, nombre: 'HR' },
      { id: 2, nombre: 'VH' },
    ];

    setAnalisisData([]);
    setAnalisisLoading(true);
    setAnalisisError(false);

    // Fase 1: 3 llamadas paralelas (una por sucursal)
    Promise.allSettled(
      SUCURSALES.map((s) =>
        entradaAlmacenApi.obtenerUltimasEntradasPorSucursal(s.id, analisisDetalle.codigo)
          .then((data) => {
            if (data && data.length > 0) {
              const item = data[0];
              return { ...item, sucursal: s.id, sucursalNombre: s.nombre };
            }
            return { sucursal: s.id, sucursalNombre: s.nombre, codigo: analisisDetalle.codigo, nombre: '', fecha: null as any, documento: '', cantidad: 0 };
          })
          .catch(() => ({
            sucursal: s.id, sucursalNombre: s.nombre, codigo: analisisDetalle.codigo, nombre: '', fecha: null as any, documento: '', cantidad: 0
          }))
      )
    ).then((results) => {
      const datos = results
        .map((r) => (r.status === 'fulfilled' ? r.value : null))
        .filter((d): d is NonNullable<typeof d> => d !== null);
      setAnalisisData(datos);
      setAnalisisLoading(false);

      // Fase 2: resumen movimientos para las que sí tienen fecha
      const conDatos = datos.filter((d) => d?.fecha);
      if (conDatos.length > 0) {
        setAnalisisResumenLoading(true);
        Promise.allSettled(
          conDatos.map((item) =>
            entradaAlmacenApi.obtenerResumenMovimientosPosteriores(
              item.sucursal, analisisDetalle.codigo, dayjs(item.fecha).format('YYYYMMDDHHmmss'), item.sucursal
            )
            .then((resumen) => ({ sucursal: item.sucursal, resumen }))
            .catch(() => ({ sucursal: item.sucursal, resumen: null }))
          )
        ).then((res) => {
          setAnalisisData((prev) =>
            prev.map((item) => {
              const found = res.find(
                (r) => r.status === 'fulfilled' && r.value?.sucursal === item?.sucursal
              );
              return found?.status === 'fulfilled' && found.value?.resumen
                ? { ...item, resumen: found.value.resumen }
                : item;
            })
          );
          setAnalisisResumenLoading(false);
        });
      }
    }).catch(() => {
      setAnalisisError(true);
      setAnalisisLoading(false);
    });
  }, [analisisOpen, analisisDetalle]);

  // Handler: ver movimientos en modal
  const handleVerMovimientos = useCallback(async (item: typeof analisisData[0]) => {
    if (!analisisDetalle) return;
    setMovimientosSucursal(item.sucursalNombre);
    setMovimientosModalOpen(true);
    setMovimientosLoading(true);
    setMovimientosData([]);
    try {
      const data = await entradaAlmacenApi.obtenerDetalleMovimientosPosteriores(
        item.sucursal,
        analisisDetalle.codigo,
        dayjs(item.fecha).format('YYYYMMDDHHmmss'),
        item.sucursal
      );
      setMovimientosData(data ?? []);
    } catch {
      message.error('Error al cargar movimientos');
      setMovimientosData([]);
    } finally {
      setMovimientosLoading(false);
    }
  }, [analisisDetalle]);

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

  const isLarge = screens.xxl === true;
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
        title: 'Cant.',
        key: `${suc}_cant`,
        width: 90,
        align: 'right' as const,
        onHeaderCell: () => ({ className: SUC_BAND[suc] || '' }),
        onCell: () => ({ className: `gorc-cell-${suc.toLowerCase()}`, style: { verticalAlign: 'top' } }),
        render: (_: any, record: DetalleGeneradorDTO) => (
          <div>
            <Text strong>{formatNumber(record.cantidades?.[suc] ?? 0)}</Text>
            <div className="paces-text-secondary" style={{ fontSize: 10, lineHeight: '18px', textAlign: 'right' }}>
              Conteo: <strong>{formatNumber(record.existenciasFisicas?.[suc] ?? 0)}</strong>
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
      fixed: 'left' as const,
      children: [
        {
          title: 'Artículo', key: 'producto', width: 280,
          onCell: () => ({ style: { verticalAlign: 'top', paddingLeft: 16, whiteSpace: 'normal', wordBreak: 'break-word' } }),
          onHeaderCell: () => ({ style: { paddingLeft: 16 } }),
          render: (_: any, record: DetalleGeneradorDTO) => (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 13, wordBreak: 'break-word', whiteSpace: 'normal', overflowWrap: 'break-word' }}>{toTitleCase(record.producto || '')}</div>
                <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5 }}>
                  <span>{record.codigo}</span>
                  {record.codigo && record.referencia && <span>{' | '}</span>}
                  {record.referencia && <span>{record.referencia}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <PermissionGate permisoEspecial="pe_ver_analisis_compra">
                  <EyeOutlined
                    style={{ cursor: 'pointer', marginTop: 2, color: 'var(--paces-primary)', fontSize: 14 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnalisisDetalle(record);
                      setAnalisisOpen(true);
                    }}
                  />
                </PermissionGate>
                {record.ultimaCompraFecha && (
                  (() => {
                    const diffDias = dayjs().diff(dayjs(record.ultimaCompraFecha), 'day');
                    if (diffDias > 30) {
                      return (
                        <Tooltip title={`Última compra: ${formatDate(record.ultimaCompraFecha)} (${diffDias} días)`}>
                          <ClockCircleOutlined
                            style={{ color: '#fa8c16', cursor: 'pointer', marginTop: 2, fontSize: 14 }}
                          />
                        </Tooltip>
                      );
                    }
                    return null;
                  })()
                )}
              </div>
            </div>
          ),
        },
        {
          title: 'Medida', key: 'medida', width: 100,
          onCell: () => ({ style: { verticalAlign: 'top' } }),
          render: (_: any, record: DetalleGeneradorDTO) => (
            <div style={{ fontSize: 12 }}>
              {record.medida?.nombre || '-'}
            </div>
          ),
        },
        {
          title: 'Costo', dataIndex: 'costo', key: 'costo', width: 90, align: 'right' as const,
          onCell: () => ({ style: { verticalAlign: 'top' } }),
          render: (costo: number) => formatNumber(costo || 0),
        },
        {
          title: 'Margen %', dataIndex: 'margen', key: 'margen', width: 100, align: 'right' as const,
          onCell: () => ({ style: { verticalAlign: 'top' } }),
          render: (margen: number) => `${(margen || 0).toFixed(2)}%`,
        },
        {
          title: 'P. Sugerido', dataIndex: 'precioSugerido', key: 'precioSugerido', width: 100, align: 'right' as const,
          onCell: () => ({ style: { verticalAlign: 'top' } }),
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
          onCell: () => ({ style: { verticalAlign: 'top' } }),
          render: (val: number) => formatNumber(val || 0),
        },
        {
          title: 'Descuento', key: 'descuento_comb', width: 100, align: 'right' as const,
          onCell: () => ({ style: { verticalAlign: 'top' } }),
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
          onCell: () => ({ style: { verticalAlign: 'top' } }),
          render: (_: any, record: DetalleGeneradorDTO) => (
            <div>
              <div>{formatNumber(record.impuestos || 0)}</div>
              {(record.impuesto as any)?.nombre && (
                <Tooltip title={(record.impuesto as any).nombre}>
                  <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {toTitleCase((record.impuesto as any).nombre)}
                  </div>
                </Tooltip>
              )}
            </div>
          ),
        },
        {
          title: 'Total', dataIndex: 'total', key: 'total', width: 110, align: 'right' as const,
          onCell: () => ({ style: { verticalAlign: 'top' } }),
          render: (val: number) => <Text strong style={{ color: 'var(--paces-primary)' }}>{formatNumber(val || 0)}</Text>,
        },
      ],
    },

  ];

  // Calcular colSpan dinámicamente: contar todas las columnas hijas excepto el grupo "Totales"
  const colsAntes = detalleColumns
    .filter((c: any) => c.title !== 'Totales')
    .reduce((sum: number, c: any) => sum + (c.children?.length || 1), 0);

  const datosGeneralesCard = (
    <Card
      className="paces-card"
      size="small"
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Datos del Generador</span>
          <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
        </div>
      }
      style={{ marginBottom: 16 }}
    >
      <Descriptions
        bordered
        size="small"
        column={isLarge ? 3 : 1}
        styles={{ content: { background: 'transparent' } }}
      >
        <Descriptions.Item label="Número:">
          {data.numero || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Tipo:">{data.tipo || '—'}</Descriptions.Item>
        <Descriptions.Item label="Fecha:">
          {formatDate(data.fecha)}
        </Descriptions.Item>
        <Descriptions.Item label="Suplidor:">
          {data.suplidor ? toTitleCase(data.suplidor.nombre) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Almacén:" span={isLarge ? 2 : undefined}>
          {toTitleCase(data.almacen || '-')}
        </Descriptions.Item>
        <Descriptions.Item label="Total:">
          <Text strong>{formatCurrency(data.total)}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Notas:" span={isLarge ? 3 : undefined}>
          <span style={{ whiteSpace: 'pre-wrap' }}>{data.notas || '-'}</span>
        </Descriptions.Item>
      </Descriptions>
      <Divider style={{ margin: '12px 0' }} />
      <Row gutter={16}>
        <Col span={6}>
          <div className="paces-text-secondary" style={{ fontSize: 11 }}>SubTotal</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{formatCurrency(sumSubTotal)}</div>
        </Col>
        <Col span={6}>
          <div className="paces-text-secondary" style={{ fontSize: 11 }}>Descuento</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{formatCurrency(sumDescuento)}</div>
        </Col>
        <Col span={6}>
          <div className="paces-text-secondary" style={{ fontSize: 11 }}>Impuestos</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{formatCurrency(sumImpuestos)}</div>
        </Col>
        <Col span={6}>
          <div className="paces-text-secondary" style={{ fontSize: 11 }}>Total</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--paces-primary)' }}>{formatCurrency(sumTotal)}</div>
        </Col>
      </Row>
    </Card>
  );

  const detallesTabContent = isLarge ? (
    detalles.length > 0 ? (
      <Table<DetalleGeneradorDTO>
        dataSource={detallesFiltrados}
        columns={detalleColumns}
        rowKey="codigo"
        size="small"
        pagination={false}
        scroll={{ x: 1100 }}
        summary={() => (
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
        )}
      />
    ) : (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div className="paces-text-secondary">No hay productos en este generador</div>
      </div>
    )
  ) : (
    // Mobile: tarjetas de producto individuales
    detalles.length > 0 ? (
      <div>
        {detalles.map((item) => (
          <Card key={item.codigo} size="small" style={{ marginBottom: 8 }} className="paces-card">
            <div style={{ fontWeight: 500, fontSize: 14 }}>{toTitleCase(item.producto || '')}</div>
            <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 8 }}>
              {item.codigo}{item.referencia ? ` | ${item.referencia}` : ''}
            </div>
            <Row gutter={8}>
              <Col span={8}>
                <div className="paces-text-secondary" style={{ fontSize: 11 }}>Costo</div>
                <div>{formatNumber(item.costo || 0)}</div>
              </Col>
              <Col span={8}>
                <div className="paces-text-secondary" style={{ fontSize: 11 }}>Margen %</div>
                <div>{(item.margen || 0).toFixed(2)}%</div>
              </Col>
              <Col span={8}>
                <div className="paces-text-secondary" style={{ fontSize: 11 }}>P. Sugerido</div>
                <div>{formatNumber(item.precioSugerido || 0)}</div>
              </Col>
            </Row>
            <Divider style={{ margin: '8px 0' }} />
            <Row gutter={8}>
              {(['OP', 'HR', 'VH'] as const).map((suc) => (
                <Col span={8} key={suc}>
                  <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{suc}</div>
                  <div style={{ fontSize: 11 }}>
                    <div>C: {formatNumber(item.cantidades?.[suc] ?? 0)}</div>
                    <div className="paces-text-secondary">
                      Conteo: {formatNumber(item.existenciasFisicas?.[suc] ?? 0)}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
            <Divider style={{ margin: '8px 0' }} />
            <Row gutter={8}>
              <Col span={6}>
                <div className="paces-text-secondary" style={{ fontSize: 11 }}>SubTotal</div>
                <div>{formatNumber(item.subTotal || 0)}</div>
              </Col>
              <Col span={6}>
                <div className="paces-text-secondary" style={{ fontSize: 11 }}>Descuento</div>
                <div>{formatNumber(item.descuento || 0)}</div>
              </Col>
              <Col span={6}>
                <div className="paces-text-secondary" style={{ fontSize: 11 }}>Impuesto</div>
                <div>{formatNumber(item.impuestos || 0)}</div>
              </Col>
              <Col span={6}>
                <div className="paces-text-secondary" style={{ fontSize: 11 }}>Total</div>
                <div style={{ fontWeight: 700, color: 'var(--paces-primary)' }}>{formatNumber(item.total || 0)}</div>
              </Col>
            </Row>
          </Card>
        ))}
      </div>
    ) : (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div className="paces-text-secondary">No hay productos en este generador</div>
      </div>
    )
  );

  const orcColumns: ColumnsType<OrdenCompraVistaDTO> = [
    { title: 'Documento', dataIndex: 'noDocumento', key: 'noDocumento', width: 160,
      render: (doc: string, record: OrdenCompraVistaDTO) => (
        <Link to={`/FORC/${record.id}`} className="paces-doc-link"><Text strong>{doc}</Text></Link>
      ),
    },
    { title: 'Fecha', dataIndex: 'fechaDocumento', key: 'fechaDocumento', width: 110,
      render: (f: string) => formatDate(f),
    },
    { title: 'Suplidor', key: 'suplidor', render: (_, r: OrdenCompraVistaDTO) => r.suplidor?.nombre || '-' },
    { title: 'Concepto', key: 'concepto', render: (_, r: OrdenCompraVistaDTO) => r.concepto?.nombre || '-' },
    { title: 'Total', dataIndex: 'total', key: 'total', width: 130, align: 'right' as const,
      render: (t: number) => <Text strong>{formatCurrency(t)}</Text>,
    },
    { title: 'Estado', dataIndex: 'estado', key: 'estado', width: 110,
      render: (estado: any) => {
        const estadoNum = typeof estado === 'string'
          ? ({ Borrador: 0, Validado: 1, Anulado: 3 } as Record<string, number>)[estado] ?? -1
          : estado;
        const info = estadoNum === 0 ? { label: 'Borrador', color: 'default' }
          : estadoNum === 1 ? { label: 'Aplicado', color: 'success' }
          : estadoNum === 3 ? { label: 'Anulado', color: 'error' }
          : { label: 'Desconocido', color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
  ];

  const tabsItems = [
    {
      key: 'detalles',
      label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${data.detalles?.length || 0}` : ''})`,
      children: detallesTabContent,
    },
    {
      key: 'ordenes',
      label: `Órdenes de compra (${ordenesGeneradas.length})`,
      children: (
        <Table<OrdenCompraVistaDTO>
          dataSource={ordenesGeneradas}
          columns={orcColumns}
          rowKey="id"
          size="small"
          pagination={false}
          loading={ordenesLoading}
          scroll={{ x: 800 }}
          locale={{ emptyText: <Empty description="No hay órdenes de compra generadas" /> }}
        />
      ),
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
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Volver
        </Button>
        <SucursalDocumentoSelector value={sucursalDestino} onChange={setSucursalDestino} />
        <div style={{ flex: 1 }} />
        <PermissionGate accion="EDITAR">
          <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/FGORC/${id}/editar`)}>
            Editar
          </Button>
        </PermissionGate>
        <PermissionGate accion="IMPRIMIR">
          <Dropdown
            menu={{
              items: [
                {
                  key: 'generador',
                  icon: <FilePdfOutlined />,
                  label: 'Generador ORC',
                  onClick: async () => {
                    try {
                      const res = await apiClient.get(`/ReporteGeneradorOrdenCompra/${sucursalActiva}/${id}`, {
                        responseType: 'blob',
                      });
                      const url = URL.createObjectURL(res.data);
                      window.open(url, '_blank');
                    } catch {
                      message.error('Error al generar el reporte');
                    }
                  },
                },
                {
                  key: 'externas',
                  icon: <FilePdfOutlined />,
                  label: 'Ordenes Externas',
                  onClick: async () => {
                    try {
                      const res = await apiClient.get(`/ReporteOrdenCompra/${sucursalActiva}/${id}`, {
                        responseType: 'blob',
                      });
                      const url = URL.createObjectURL(res.data);
                      window.open(url, '_blank');
                    } catch {
                      message.error('Error al generar el reporte');
                    }
                  },
                },
                {
                  key: 'internas',
                  icon: <FilePdfOutlined />,
                  label: 'Ordenes Internas',
                  onClick: async () => {
                    try {
                      const res = await apiClient.get(`/ReporteOrdenCompra/${sucursalActiva}/${id}`, {
                        responseType: 'blob',
                      });
                      const url = URL.createObjectURL(res.data);
                      window.open(url, '_blank');
                    } catch {
                      message.error('Error al generar el reporte');
                    }
                  },
                },
              ],
            }}
          >
            <Button icon={<PrinterOutlined />}>
              Imprimir <DownOutlined />
            </Button>
          </Dropdown>
        </PermissionGate>
        {(data.estado === 0 || data.estado === 1) && (
          <PermissionGate accion="EDITAR">
            <Button type="primary" icon={<ShopOutlined />} onClick={handleGenerarOC} loading={generando}>
              Generar OC
            </Button>
          </PermissionGate>
        )}
      </div>

      {isLarge ? (
        /* === DESKTOP LAYOUT (≥ xxl) === */
        <div>
          {datosGeneralesCard}
          <Tabs
            defaultActiveKey="detalles"
            type="card"
            tabBarExtraContent={
              <Input.Search
                placeholder="Buscar producto..."
                allowClear
                style={{ width: 320 }}
                prefix={<SearchOutlined className="paces-text-icon" />}
                onSearch={(value) => setDetalleSearch(value)}
                onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
              />
            }
            items={tabsItems}
          />
        </div>
      ) : (
        /* === MOBILE LAYOUT (< xxl) === */
        <div>
          {datosGeneralesCard}
          <Tabs
            defaultActiveKey="detalles"
            type="card"
            tabBarExtraContent={
              <Input.Search
                placeholder="Buscar producto..."
                allowClear
                style={{ width: 320 }}
                prefix={<SearchOutlined className="paces-text-icon" />}
                onSearch={(value) => setDetalleSearch(value)}
                onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
              />
            }
            items={tabsItems}
          />
        </div>
      )}

      {/* ===== Monitor de Análisis (Drawer) ===== */}
      <Drawer
        title={
          <Space>
            <BarChartOutlined style={{ color: 'var(--paces-primary)' }} />
            <span style={{ fontWeight: 600 }}>Análisis de Producto</span>
          </Space>
        }
        placement="right"
        width={520}
        open={analisisOpen}
        onClose={() => setAnalisisOpen(false)}
      >
        {analisisDetalle && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* SECCIÓN A — Identidad del producto */}
            <Space align="start" size={12} style={{ marginBottom: 16, width: '100%' }}>
              <Avatar size={40} style={{ backgroundColor: 'rgba(85,110,230,0.12)', color: 'var(--paces-primary)', fontWeight: 600, flexShrink: 0 }}>
                {(analisisDetalle?.producto || '?')[0].toUpperCase()}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Title level={5} style={{ margin: 0 }}>{toTitleCase(analisisDetalle?.producto || '')}</Typography.Title>
                <Typography.Text className="paces-text-secondary" style={{ fontSize: 12 }}>
                  Código: {analisisDetalle?.codigo}
                  {analisisDetalle?.referencia ? <span> · Ref: {analisisDetalle.referencia}</span> : ''}
                  {analisisDetalle?.medida?.nombre ? <span> · Medida: {analisisDetalle.medida.nombre}</span> : ''}
                </Typography.Text>
              </div>
            </Space>
            <Divider style={{ margin: '0 0 16px 0' }} />

            {/* SECCIÓN B — Última Entrada por sucursal */}
            {analisisError ? (
              <Alert type="error" message="Error al cargar datos" style={{ marginBottom: 16 }}
                action={<Button size="small" onClick={() => { setAnalisisOpen(false); setTimeout(() => setAnalisisOpen(true), 100); }}><ReloadOutlined />Reintentar</Button>} />
            ) : analisisLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} style={{ marginBottom: 16 }} />
            ) : analisisData.length > 0 ? (
              <>
              {analisisData.some((d) => d.resumen) && (
                <Card
                  className="paces-card"
                  size="small"
                  style={{
                    borderRadius: 6,
                    border: '1px solid #d9d9d9',
                    borderTop: '3px solid #556ee6',
                    background: 'rgba(85,110,230,0.04)',
                    marginBottom: 12,
                  }}
                >
                  <Typography.Text strong style={{ fontSize: 12, color: '#556ee6', display: 'block', marginBottom: 6 }}>
                    📊 Resumen total
                  </Typography.Text>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                    {(() => {
                      const totales = analisisData.reduce(
                        (acc, item) => {
                          const r = item.resumen;
                          if (!r) return acc;
                          return {
                            ventasSinComponentes: acc.ventasSinComponentes + (r.ventasSinComponentes || 0),
                            ventasConComponentes: acc.ventasConComponentes + (r.ventasConComponentes || 0),
                            salidas: acc.salidas + (r.salidas || 0),
                            devCompra: acc.devCompra + (r.devolucionesCompra || 0),
                            devVenta: acc.devVenta + (r.devolucionesVenta || 0),
                          };
                        },
                        { ventasSinComponentes: 0, ventasConComponentes: 0, salidas: 0, devCompra: 0, devVenta: 0 }
                      );
                      return [
                        { label: 'Ventas (sin comp.)', value: totales.ventasSinComponentes },
                        { label: 'Ventas (con comp.)', value: totales.ventasConComponentes },
                        { label: 'Salidas', value: totales.salidas },
                        { label: 'Dev. Compra', value: totales.devCompra },
                        { label: 'Dev. Venta', value: totales.devVenta },
                      ].map((kpi) => (
                        <div key={kpi.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <Typography.Text style={{ fontSize: 12, color: '#8c8c8c' }}>{kpi.label}</Typography.Text>
                          <Typography.Text strong style={{ fontSize: 14, color: '#556ee6' }}>
                            {formatNumber(kpi.value)}
                          </Typography.Text>
                        </div>
                      ));
                    })()}
                  </div>
                </Card>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {analisisData.map((item) => {
                  const SUCURSAL_COLORS: Record<number, { color: string; bg: string }> = {
                    0: { color: '#1677ff', bg: 'rgba(22,119,255,0.06)' },
                    1: { color: '#52c41a', bg: 'rgba(82,196,26,0.06)' },
                    2: { color: '#fa8c16', bg: 'rgba(250,140,22,0.06)' },
                  };
                  const style = SUCURSAL_COLORS[item.sucursal] || { color: '#556ee6', bg: 'rgba(85,110,230,0.06)' };
                  const sinRegistro = !item.fecha;

                  return (
                    <Card
                      key={item.sucursal}
                      className="paces-card"
                      size="small"
                      style={{
                        borderRadius: 6,
                        border: '1px solid #f0f0f0',
                        borderTop: `3px solid ${style.color}`,
                        background: style.bg,
                      }}
                    >
                      {/* Header: nombre sucursal */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Space>
                          <ShopOutlined style={{ color: style.color, fontSize: 15 }} />
                          <Typography.Text strong style={{ fontSize: 13, color: style.color }}>{item.sucursalNombre}</Typography.Text>
                          {sinRegistro && <Tag color="default" style={{ margin: 0, fontSize: 10 }}>Sin compras</Tag>}
                        </Space>
                        {!sinRegistro && (
                          <Button
                            type="link"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleVerMovimientos(item)}
                            style={{ fontSize: 12 }}
                          >
                            Ver movimientos →
                          </Button>
                        )}
                      </div>

                      {!sinRegistro ? (
                        <>
                          {/* BLOQUE 1: Última compra */}
                          <div style={{ marginBottom: 10 }}>
                            <Typography.Text strong style={{ fontSize: 12, color: '#262626', display: 'block', marginBottom: 6 }}>
                              📦 Última compra  <Typography.Text strong style={{ fontSize: 13, color: '#556ee6' }}>{item.fecha ? formatDate(item.fecha) : '-'}</Typography.Text>
                            </Typography.Text>
                            <div style={{ marginTop: 8 }}>
                              <Typography.Text style={{ fontSize: 12, color: '#8c8c8c', marginRight: 8 }}>
                                {item.documento}
                              </Typography.Text>
                              <Tag color="blue" style={{ fontSize: 11 }}>{formatNumber(item.cantidad)}</Tag>
                            </div>
                          </div>

                          {/* Divider punteado */}
                          <div style={{ borderTop: '1px dashed #e8e8e8', marginBottom: 10 }} />

                          {/* BLOQUE 2: Movimientos posteriores */}
                          <div style={{ marginBottom: 10 }}>
                            <Typography.Text strong style={{ fontSize: 12, color: '#262626', display: 'block', marginBottom: 6 }}>
                              📊 Movimientos posteriores
                            </Typography.Text>

                            {/* Grid 2x2 de KPIs */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', marginBottom: 6 }}>
                              {[
                                { label: 'Ventas (sin comp.)', value: item.resumen?.ventasSinComponentes },
                                { label: 'Ventas (con comp.)', value: item.resumen?.ventasConComponentes },
                                { label: 'Salidas', value: item.resumen?.salidas },
                                { label: 'Dev. Compra', value: item.resumen?.devolucionesCompra },
                                { label: 'Dev. Venta', value: item.resumen?.devolucionesVenta },
                              ].map((kpi) => (
                                <div key={kpi.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                  <Typography.Text style={{ fontSize: 12, color: '#8c8c8c' }}>{kpi.label}</Typography.Text>
                                  {kpi.value !== undefined ? (
                                    <Typography.Text strong style={{ fontSize: 14, color: style.color }}>
                                      {formatNumber(kpi.value)}
                                    </Typography.Text>
                                  ) : analisisResumenLoading ? (
                                    <Skeleton.Input active size="small" style={{ width: 30, height: 16 }} />
                                  ) : (
                                    <Typography.Text style={{ fontSize: 13 }}>0</Typography.Text>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Última venta */}
                            {item.resumen?.ultimaVentaFecha && (
                              <div style={{ background: 'rgba(85,110,230,0.04)', borderRadius: 4, padding: '6px 8px', marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography.Text style={{ fontSize: 11, color: '#595959' }}>
                                  🕐 Última venta: {formatDate(item.resumen.ultimaVentaFecha)}
                                </Typography.Text>
                                <Typography.Text style={{ fontSize: 11, color: '#8c8c8c', fontStyle: 'italic' }}>
                                  {(() => {
                                    const diffDias = dayjs(item.resumen!.ultimaVentaFecha).diff(dayjs(item.fecha), 'day');
                                    if (diffDias === 0) return 'hoy';
                                    if (diffDias === 1) return 'hace 1 día';
                                    if (diffDias < 30) return `hace ${diffDias} días`;
                                    const diffMeses = Math.floor(diffDias / 30);
                                    if (diffMeses === 1) return 'hace 1 mes';
                                    if (diffMeses < 12) return `hace ${diffMeses} meses`;
                                    const diffAnios = Math.floor(diffDias / 365);
                                    if (diffAnios === 1) return 'hace 1 año';
                                    return `hace ${diffAnios} años`;
                                  })()}
                                </Typography.Text>
                              </div>
                            )}
                          </div>


                        </>
                      ) : (
                        <Typography.Text className="paces-text-secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
                          No hay registros de compra para esta sucursal.
                        </Typography.Text>
                      )}
                    </Card>
                  );
                })}
              </div>


            </>
            ) : (
              <Alert type="info" message="No se encontraron entradas para este producto" style={{ marginBottom: 16 }} />
            )}

            {/* SECCIÓN C — Costos y Precio */}
            <Divider orientation="left" style={{ fontSize: 12, color: '#8c8c8c' }}>Costos y Precio</Divider>
            <div style={{ background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0', padding: '12px 0', marginBottom: 16 }}>
              <Row gutter={0}>
                <Col span={8} style={{ borderRight: '1px solid #f0f0f0', textAlign: 'center' }}>
                  <Typography.Text className="paces-text-secondary" style={{ fontSize: 11, display: 'block' }}>Costo</Typography.Text>
                  <Typography.Text strong style={{ fontSize: 16, color: 'var(--paces-primary)' }}>
                    {formatNumber(analisisDetalle?.costo || 0)}
                  </Typography.Text>
                </Col>
                <Col span={8} style={{ borderRight: '1px solid #f0f0f0', textAlign: 'center' }}>
                  <Typography.Text className="paces-text-secondary" style={{ fontSize: 11, display: 'block' }}>Margen %</Typography.Text>
                  <Typography.Text strong style={{ fontSize: 16, color: (analisisDetalle?.margen || 0) > 0 ? '#34c38f' : '#ff4d4f' }}>
                    {(analisisDetalle?.margen || 0).toFixed(2)}%
                  </Typography.Text>
                </Col>
                <Col span={8} style={{ textAlign: 'center' }}>
                  <Typography.Text className="paces-text-secondary" style={{ fontSize: 11, display: 'block' }}>Precio</Typography.Text>
                  <Typography.Text strong style={{ fontSize: 16 }}>
                    {formatNumber(analisisDetalle?.precioSugerido || 0)}
                  </Typography.Text>
                </Col>
              </Row>
            </div>
          </div>
        )}
      </Drawer>

      {/* ===== Modal de Movimientos Posteriores ===== */}
      <Modal
        title={`Movimientos posteriores — ${movimientosSucursal} — ${analisisDetalle?.codigo || ''}`}
        open={movimientosModalOpen}
        onCancel={() => setMovimientosModalOpen(false)}
        footer={null}
        width={700}
        destroyOnHidden
      >
        <Table
          dataSource={movimientosData}
          rowKey="transacid"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          loading={movimientosLoading}
          locale={{ emptyText: <Empty description="No hay movimientos posteriores" /> }}
          columns={[
            { title: 'Fecha', dataIndex: 'fecha', width: 110, render: (v: string) => formatDate(v) },
            { title: 'Documento', dataIndex: 'documento', width: 160, ellipsis: true },
            { title: 'Cantidad', dataIndex: 'cantidad', width: 90, align: 'right' as const, render: (v: number) => formatNumber(v) },
          ]}
          scroll={{ x: 600 }}
        />
      </Modal>
    </div>
  );
};

export default GeneradorORCDetalle;
