import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Card, Table, Input, Button, DatePicker, Row, Col, Modal, Space,
  message, Alert, Empty, Tag, Avatar, Divider, Skeleton, Typography, Grid,
} from 'antd';
import {
  ThunderboltOutlined, SearchOutlined, ReloadOutlined,
  EyeOutlined, ShopOutlined, BarChartOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { movimientoApi } from '../../api/movimientoApi';
import { conteoApi } from '../../api/conteoApi';
import { entradaAlmacenApi } from '../../api/entradaAlmacenApi';
import ModalMovimientosPosteriores from '../../components/ModalMovimientosPosteriores/ModalMovimientosPosteriores';
import type { PlantillaConteoFisicoDTO } from '../../api/conteoApi';
import type { DetallePlantillaConteoFisicoDTO } from '../../types/plantilla';
import dayjs, { Dayjs } from 'dayjs';


// ---------------------------------------------------------------------------
// Helpers de formato
// ---------------------------------------------------------------------------
function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(val: string | null): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

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



// ---------------------------------------------------------------------------
// Modal de búsqueda de plantillas
// ---------------------------------------------------------------------------
interface BuscarPlantillaModalProps {
  open: boolean;
  bloqueado?: boolean;
  ocupadoRef: React.MutableRefObject<boolean>;
  intentarOcupar: () => boolean;
  liberarOcupacion: () => void;
  onClose: () => void;
  onSelect: (plantilla: PlantillaConteoFisicoDTO) => void;
}

const BuscarPlantillaModal: React.FC<BuscarPlantillaModalProps> = ({
  open,
  bloqueado = false,
  ocupadoRef,
  intentarOcupar,
  liberarOcupacion,
  onClose,
  onSelect,
}) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [resultados, setResultados] = useState<PlantillaConteoFisicoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const buscar = useCallback(async () => {
    // Candado compartido: si otra operación está en vuelo, no iniciar la búsqueda
    if (!intentarOcupar()) return;
    setLoading(true);
    try {
      const res = await conteoApi.obtenerPlantillas(sucursalActiva);
      setResultados(res || []);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al buscar plantillas');
      message.error(msg);
      setResultados([]);
    } finally {
      setLoading(false);
      liberarOcupacion();
    }
  }, [sucursalActiva, intentarOcupar, liberarOcupacion]);

  // Efecto de apertura: no dispara búsqueda si el candado está tomado (chequeo por ref, sin esperar render)
  useEffect(() => {
    if (open) {
      if (ocupadoRef.current) return;
      setSearchText('');
      buscar();
    }
  }, [open, buscar, ocupadoRef]);

  const filtered = useMemo(() => {
    if (!searchText.trim()) return resultados;
    const term = searchText.trim().toLowerCase();
    return resultados.filter((r) => r.codigo?.toLowerCase().includes(term));
  }, [resultados, searchText]);

  const columnas = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 150,
    },
    {
      title: 'Suplidor',
      dataIndex: 'suplidor',
      key: 'suplidor',
      ellipsis: true,
      render: (v: string) => toTitleCase(v || ''),
    },
  ];

  return (
    <Modal
      title="Buscar plantilla"
      open={open}
      onCancel={() => {
        // El cierre consulta la referencia sincrónica, no solo el estado renderizado
        if (ocupadoRef.current || bloqueado || loading) return;
        onClose();
      }}
      maskClosable={!bloqueado && !loading}
      keyboard={!bloqueado && !loading}
      footer={null}
      width={700}
      destroyOnHidden
    >
      <Input.Search
        placeholder="Buscar por código..."
        allowClear
        disabled={bloqueado || loading}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onSearch={(value) => setSearchText(value)}
        style={{ marginBottom: 16 }}
      />
      <Table
        dataSource={filtered}
        columns={columnas}
        rowKey="id"
        loading={loading}
        size="small"
        locale={{
          emptyText: <div style={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Empty description="No hay plantillas disponibles" />
          </div>,
        }}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ y: 400 }}
        onRow={(record) => ({
          onClick: () => {
            // Chequeo sincrónico por referencia: bloquea clics consecutivos antes del siguiente render.
            // El cierre lo hace el manejador principal tras adquirir el candado (no usar onClose aquí,
            // pues sería rechazado una vez tomado el candado).
            if (ocupadoRef.current || bloqueado || loading) return;
            onSelect(record);
          },
          style: { cursor: (bloqueado || loading) ? 'default' : 'pointer' },
        })}
      />
    </Modal>
  );
};


// ---------------------------------------------------------------------------
// Columnas para la tabla de productos
// ---------------------------------------------------------------------------
interface ColumnasProducto {
  title: React.ReactNode;
  dataIndex: string;
  key: string;
  width?: number;
  ellipsis?: boolean;
  align?: 'left' | 'right' | 'center';
  render?: (value: any, record: DetallePlantillaConteoFisicoDTO, index: number) => React.ReactNode;
}

const columnasProducto: ColumnasProducto[] = [
  {
    title: 'Código',
    dataIndex: 'codigo',
    key: 'codigo',
    width: 120,
  },
  {
    title: 'Artículo',
    dataIndex: 'producto',
    key: 'producto',
    ellipsis: true,
    render: (value: string) => toTitleCase(value || ''),
  },
  {
    title: 'Presentación',
    dataIndex: 'presentacion',
    key: 'presentacion',
    width: 140,
    render: (value: string) => value || '-',
  },
  {
    title: 'Familia',
    dataIndex: 'familia',
    key: 'familia',
    width: 140,
    render: (value: string) => value || '-',
  },
];


// ---------------------------------------------------------------------------
// Página principal: Movimiento por Plantilla
// ---------------------------------------------------------------------------
const MovimientoPorPlantilla: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);

  // Filtros
  const [plantillaCodigo, setPlantillaCodigo] = useState<string>('');
  const [suplidorNombre, setSuplidorNombre] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);

  // Datos - productos de la plantilla
  const [productos, setProductos] = useState<DetallePlantillaConteoFisicoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  // Candado único compartido por toda la pantalla (lógica por ref = inmediata,
  // visual por estado = en el siguiente render). Solo una acción en vuelo.
  const ocupadoRef = useRef(false);
  const [operacionEnCurso, setOperacionEnCurso] = useState(false);
  // Secuencia anti-stale del análisis (descarta respuestas de selecciones anteriores)
  const analisisSeqRef = useRef(0);
  const intentarOcupar = useCallback(() => {
    if (ocupadoRef.current) return false;
    ocupadoRef.current = true;
    setOperacionEnCurso(true);
    return true;
  }, []);
  const liberarOcupacion = useCallback(() => {
    ocupadoRef.current = false;
    setOperacionEnCurso(false);
  }, []);

  // Fecha seleccionada
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Dayjs>(dayjs());

  // Búsqueda local en resultados
  const [searchText, setSearchText] = useState('');

  // Producto seleccionado para análisis
  const [selectedItem, setSelectedItem] = useState<DetallePlantillaConteoFisicoDTO | null>(null);
  const [analisisLoading, setAnalisisLoading] = useState(false);
  const [analisisError, setAnalisisError] = useState(false);
  const [analisisData, setAnalisisData] = useState<any[]>([]);
  const [analisisResumenLoading, setAnalisisResumenLoading] = useState(false);

  // Modal movimientos posteriores
  const [movimientosModalOpen, setMovimientosModalOpen] = useState(false);
  const [movimientosSucursal, setMovimientosSucursal] = useState('');
  const [movimientosData, setMovimientosData] = useState<any[]>([]);
  const [movimientosLoading, setMovimientosLoading] = useState(false);

  // Bloqueo visual agregado: candado compartido + spinners en curso
  const bloqueado = operacionEnCurso || loading || movimientosLoading;

  // Layout adaptable (patrón pantallas canónicas): dos columnas solo en ≥xxl
  const screens = Grid.useBreakpoint();
  const isLarge = screens.xxl === true;

  useEffect(() => {
    setActiveModule('RMOVPLAN');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (plantillaCodigo) {
      setPageTitleOverride(`Movimiento por Plantilla #${plantillaCodigo}`);
    } else {
      setPageTitleOverride('');
    }
  }, [plantillaCodigo, setPageTitleOverride]);

  // Cargar productos de la plantilla — usa el candado único compartido
  const handleGenerar = useCallback(async () => {
    // Chequeo sincrónico por referencia: frena el doble clic antes del siguiente render
    if (!intentarOcupar()) {
      return;
    }
    if (!plantillaCodigo) {
      liberarOcupacion();
      message.warning('Debe seleccionar una plantilla primero');
      return;
    }
    setLoadingError(false);
    setLoading(true);
    setSelectedItem(null);
    setAnalisisData([]);
    try {
      const res = await movimientoApi.obtenerProductosPlantilla(sucursalActiva, plantillaCodigo);
      setProductos(res || []);
      if (!res || res.length === 0) {
        message.info('No se encontraron productos para esta plantilla');
      }
    } catch (err: any) {
      setLoadingError(true);
      setProductos([]);
      const msg = extraerMensajeError(err, 'Error al cargar los productos');
      message.error(msg);
    } finally {
      setLoading(false);
      liberarOcupacion();
    }
  }, [plantillaCodigo, sucursalActiva, intentarOcupar, liberarOcupacion]);

  // Seleccionar plantilla desde el modal — comparte el candado único
  const handleSeleccionarPlantilla = useCallback(
    async (plantilla: PlantillaConteoFisicoDTO) => {
      if (!intentarOcupar()) return;
      // Cierre directo (sin pasar por el onClose protegido, que rechazaría
      // el cierre con el candado ya tomado)
      setModalVisible(false);
      setPlantillaCodigo(plantilla.codigo);
      try {
        const detalle = await conteoApi.obtenerPlantilla(sucursalActiva, plantilla.id);
        if (detalle?.suplidor) {
          setSuplidorNombre(detalle.suplidor);
        } else if (plantilla.suplidor) {
          setSuplidorNombre(plantilla.suplidor);
        }
      } catch {
        if (plantilla.suplidor) {
          setSuplidorNombre(plantilla.suplidor);
        }
      } finally {
        liberarOcupacion();
      }
    },
    [sucursalActiva, intentarOcupar, liberarOcupacion]
  );

  // Cargar análisis de producto cuando se selecciona — usa el candado único compartido
  useEffect(() => {
    if (!selectedItem) return;
    // Si otra operación está en vuelo, no iniciar un análisis que nacería stale
    if (!intentarOcupar()) return;
    const seq = ++analisisSeqRef.current;
    const codigo = selectedItem.codigo;
    let cancelado = false;

    const SUCURSALES_ANALISIS = [
      { id: 0, nombre: 'OP' },
      { id: 1, nombre: 'HR' },
      { id: 2, nombre: 'VH' },
    ];
    const vacio = (s: { id: number; nombre: string }) => ({
      sucursal: s.id, sucursalNombre: s.nombre, codigo, nombre: '', fecha: null as any, documento: '', cantidad: 0,
    });

    (async () => {
      setAnalisisData([]);
      setAnalisisLoading(true);
      setAnalisisError(false);
      try {
        const results = await Promise.allSettled(
          SUCURSALES_ANALISIS.map((s) =>
            entradaAlmacenApi.obtenerUltimasEntradasPorSucursal(s.id, codigo)
              .then((data) => {
                if (data && data.length > 0) {
                  const item = data[0];
                  return { ...item, sucursal: s.id, sucursalNombre: s.nombre };
                }
                return vacio(s);
              })
              .catch(() => vacio(s))
          )
        );
        if (cancelado || analisisSeqRef.current !== seq) return;
        const datos = results
          .map((r) => (r.status === 'fulfilled' ? r.value : null))
          .filter((d): d is NonNullable<typeof d> => d !== null);
        setAnalisisData(datos);

        const conDatos = datos.filter((d) => d?.fecha);
        if (conDatos.length > 0) {
          setAnalisisResumenLoading(true);
          const res = await Promise.allSettled(
            conDatos.map((item) =>
              entradaAlmacenApi.obtenerResumenMovimientosPosteriores(
                item.sucursal, codigo, dayjs(item.fecha).format('YYYYMMDDHHmmss'), item.sucursal
              )
                .then((resumen) => ({ sucursal: item.sucursal, resumen }))
                .catch(() => ({ sucursal: item.sucursal, resumen: null }))
            )
          );
          if (cancelado || analisisSeqRef.current !== seq) return;
          setAnalisisData((prev) =>
            prev.map((item) => {
              const found = res.find((r) => r.status === 'fulfilled' && r.value?.sucursal === item?.sucursal);
              return found?.status === 'fulfilled' && found.value?.resumen
                ? { ...item, resumen: found.value.resumen }
                : item;
            })
          );
        }
      } catch {
        if (!cancelado && analisisSeqRef.current === seq) {
          setAnalisisError(true);
        }
      } finally {
        if (!cancelado && analisisSeqRef.current === seq) {
          setAnalisisLoading(false);
          setAnalisisResumenLoading(false);
        }
        liberarOcupacion();
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [selectedItem, intentarOcupar, liberarOcupacion]);

  // Ver movimientos posteriores — usa el candado único compartido
  const handleVerMovimientos = useCallback(async (item: any) => {
    if (!intentarOcupar()) return;
    if (!selectedItem) {
      liberarOcupacion();
      return;
    }
    setMovimientosSucursal(item.sucursalNombre);
    setMovimientosModalOpen(true);
    setMovimientosLoading(true);
    setMovimientosData([]);
    try {
      const data = await entradaAlmacenApi.obtenerDetalleMovimientosPosteriores(
        item.sucursal,
        selectedItem.codigo,
        dayjs(item.fecha).format('YYYYMMDDHHmmss'),
        item.sucursal
      );
      setMovimientosData(data ?? []);
    } catch {
      message.error('Error al cargar movimientos');
      setMovimientosData([]);
    } finally {
      setMovimientosLoading(false);
      liberarOcupacion();
    }
  }, [selectedItem, intentarOcupar, liberarOcupacion]);

  // Datos filtrados por búsqueda local
  const filteredData = useMemo(() => {
    if (!productos.length) return [];
    if (!searchText.trim()) return productos;
    const term = searchText.trim().toLowerCase();
    return productos.filter(
      (item) =>
        (item.codigo || '').toLowerCase().includes(term) ||
        (item.producto || '').toLowerCase().includes(term) ||
        (item.familia || '').toLowerCase().includes(term)
    );
  }, [productos, searchText]);

  // Card de análisis de producto (sidebar derecho) — área Resultado
  const analisisCard = (
    <Card className="paces-card" size="small" title="Análisis del producto">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Identidad del producto */}
        {selectedItem ? (
          <Space align="start" size={12} style={{ marginBottom: 16, width: '100%' }}>
            <Avatar size={40} style={{ backgroundColor: 'rgba(85,110,230,0.12)', color: 'var(--paces-primary)', fontWeight: 600, flexShrink: 0 }}>
              {(selectedItem?.producto || '?')[0].toUpperCase()}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Typography.Title level={5} style={{ margin: 0 }}>{toTitleCase(selectedItem?.producto || '')}</Typography.Title>
              <Typography.Text className="paces-text-secondary" style={{ fontSize: 12 }}>
                Código: {selectedItem?.codigo}
              </Typography.Text>
              <br />
              <Typography.Text className="paces-text-secondary" style={{ fontSize: 11 }}>
                {selectedItem?.presentacion ? `Presentación: ${selectedItem.presentacion}` : ''}
                {selectedItem?.familia ? ` | Familia: ${selectedItem.familia}` : ''}
              </Typography.Text>
            </div>
          </Space>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Avatar size={40} style={{ backgroundColor: 'rgba(0,0,0,0.04)', color: '#8c8c8c', fontWeight: 600, flexShrink: 0 }}>?</Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Typography.Title level={5} style={{ margin: 0, color: '#8c8c8c' }}>Sin producto seleccionado</Typography.Title>
              <Typography.Text className="paces-text-secondary" style={{ fontSize: 12 }}>
                Seleccione un producto de la lista para ver su análisis.
              </Typography.Text>
            </div>
          </div>
        )}
        <Divider style={{ margin: '0 0 16px 0' }} />

        {/* Análisis por sucursal */}
        {!selectedItem ? (
          <Alert type="info" message="Seleccione un producto para ver su análisis de movimientos." style={{ marginBottom: 16 }} />
        ) : analisisError ? (
          <Alert type="error" message="Error al cargar datos" style={{ marginBottom: 16 }}
            action={<Button size="small" disabled={bloqueado || analisisLoading} onClick={() => { if (!ocupadoRef.current && !bloqueado && selectedItem) setSelectedItem({ ...selectedItem }); }}><ReloadOutlined />Reintentar</Button>} />
        ) : analisisLoading ? (
          <Skeleton active paragraph={{ rows: 3 }} style={{ marginBottom: 16 }} />
        ) : analisisData.length > 0 ? (
          <>
            {analisisData.some((d) => d.resumen) && (
              <div style={{ marginBottom: 12 }}>
                <Space size={6} style={{ marginBottom: 6 }}>
                  <BarChartOutlined style={{ color: 'var(--paces-primary)' }} />
                  <Typography.Text strong style={{ fontSize: 12 }}>
                    Resumen total
                  </Typography.Text>
                </Space>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                  {(() => {
                    const totales = analisisData.reduce(
                      (acc: any, item: any) => {
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
                        <Typography.Text strong style={{ fontSize: 14 }}>
                          {formatNumber(kpi.value)}
                        </Typography.Text>
                      </div>
                    ));
                  })()}
                </div>
                <Divider style={{ margin: '12px 0 0 0' }} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {analisisData.map((item: any) => {
                const SUCURSAL_COLORS: Record<number, { color: string }> = {
                  0: { color: '#1677ff' },
                  1: { color: '#52c41a' },
                  2: { color: '#fa8c16' },
                };
                const style = SUCURSAL_COLORS[item.sucursal] || { color: '#556ee6' };
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
                    }}
                  >
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
                          disabled={bloqueado || movimientosLoading}
                          onClick={() => handleVerMovimientos(item)}
                          style={{ fontSize: 12 }}
                        >
                          Ver movimientos
                        </Button>
                      )}
                    </div>

                    {!sinRegistro ? (
                      <>
                        <div style={{ marginBottom: 10 }}>
                          <Typography.Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                            Última compra <Typography.Text strong style={{ fontSize: 13 }}>{item.fecha ? formatDate(item.fecha) : '-'}</Typography.Text>
                          </Typography.Text>
                          <div style={{ marginTop: 8 }}>
                            <Typography.Text style={{ fontSize: 12, color: '#8c8c8c', marginRight: 8 }}>
                              {item.documento}
                            </Typography.Text>
                            <Tag color="blue" style={{ fontSize: 11 }}>{formatNumber(item.cantidad)}</Tag>
                          </div>
                        </div>

                        <div style={{ borderTop: '1px dashed #e8e8e8', marginBottom: 10 }} />

                        <div style={{ marginBottom: 10 }}>
                          <Typography.Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                            Movimientos posteriores
                          </Typography.Text>

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

                          {item.resumen?.ultimaVentaFecha && (
                            <Space size={6} style={{ marginTop: 8 }}>
                              <ClockCircleOutlined style={{ color: '#8c8c8c', fontSize: 11 }} />
                              <Typography.Text style={{ fontSize: 11, color: '#595959' }}>
                                Última venta: {formatDate(item.resumen.ultimaVentaFecha)}
                              </Typography.Text>
                            </Space>
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
      </div>
    </Card>
  );

  // Card de productos (área Resultado) — se reutiliza en layout amplio y compacto
  const productosCard = (
    <Card
      className="paces-card"
      style={{ borderRadius: 8 }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Resultado — Productos</span>
          <Tag color="blue">{filteredData.length} registros</Tag>
        </div>
      }
    >
      <div style={{ padding: '0 0 16px' }}>
        <Input.Search
          placeholder="Buscar por código, artículo o familia..."
          allowClear
          onSearch={(value) => setSearchText(value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              (e.target as HTMLInputElement).blur();
              setSearchText('');
            }
          }}
          style={{ width: '100%', maxWidth: 400 }}
          prefix={<SearchOutlined className="paces-text-icon" />}
        />
      </div>
      {filteredData.length === 0 && !loading ? (
        <div style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                {!plantillaCodigo
                  ? 'Seleccione una plantilla usando el botón buscar y presione Generar'
                  : searchText.trim()
                    ? 'No hay resultados que coincidan con la búsqueda'
                    : 'No se encontraron productos para esta plantilla'}
              </span>
            }
          />
        </div>
      ) : (
        <Table
          dataSource={filteredData}
          columns={columnasProducto as any}
          rowKey={(record, index) => `${record.codigo}-${index}`}
          loading={loading}
          size="small"
          scroll={{ x: 600 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: false,
            showTotal: (total) => `${total} registros`,
          }}
          rowClassName={(record, index) =>
            selectedItem && selectedItem.codigo === record.codigo
              ? 'paces-row-selected'
              : ''
          }
          onRow={(record, index) => ({
            onClick: () => { if (!ocupadoRef.current && !bloqueado) setSelectedItem(record); },
            style: { cursor: bloqueado ? 'default' : 'pointer' },
          })}
        />
      )}
    </Card>
  );

  return (
    <div>
      {/* Card 1 — Parámetros del movimiento */}
      <Card
        className="paces-card"
        style={{ borderRadius: 8, marginBottom: 16 }}
        title={<span style={{ fontSize: 16, fontWeight: 600 }}>Parámetros del movimiento</span>}
      >
        <Row gutter={[16, 16]} align="middle">
          {/* Plantilla */}
          <Col xs={24} md={12} xl={7}>
            <div style={{ fontSize: 14, marginBottom: 6 }}>Plantilla</div>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                disabled
                value={plantillaCodigo}
                placeholder="Seleccione una plantilla"
              />
              <Button
                icon={<SearchOutlined />}
                disabled={bloqueado}
                onClick={() => { if (!ocupadoRef.current && !bloqueado) setModalVisible(true); }}
                title="Buscar plantilla"
              />
            </Space.Compact>
          </Col>

          {/* Suplidor */}
          <Col xs={24} md={12} xl={7}>
            <div style={{ fontSize: 14, marginBottom: 6 }}>Suplidor</div>
            <Input
              disabled
              value={suplidorNombre ? toTitleCase(suplidorNombre) : ''}
              placeholder="Se selecciona automáticamente"
            />
          </Col>

          {/* Fecha */}
          <Col xs={24} md={12} xl={5}>
            <div style={{ fontSize: 14, marginBottom: 6 }}>Fecha</div>
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              value={fechaSeleccionada}
              disabled={bloqueado}
              onChange={(date) => { if (!ocupadoRef.current && !bloqueado) setFechaSeleccionada(date || dayjs()); }}
              disabledDate={(current) => {
                if (!current) return false;
                const cierre = fechasCierre?.[sucursalActiva];
                if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day')) return true;
                const cierreInv = fechasCierreInv?.[sucursalActiva];
                if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day')) return true;
                return false;
              }}
            />
          </Col>

          {/* Generar */}
          <Col xs={24} md={12} xl={5} style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={loading}
              disabled={!plantillaCodigo || bloqueado}
              onClick={handleGenerar}
              style={{ minWidth: 140 }}
            >
              Generar
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Alert de error */}
      {loadingError && (
        <Alert
          message="Error al cargar los datos"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" disabled={bloqueado} onClick={handleGenerar}>
              Reintentar
            </Button>
          }
        />
      )}

      {/* Card 2 — Resultado con sidebar (dos columnas solo en ≥xxl) */}
      {isLarge ? (
        <Row gutter={16}>
          <Col xxl={18}>
            {productosCard}
          </Col>
          <Col xxl={6}>
            {analisisCard}
          </Col>
        </Row>
      ) : (
        <>
          {productosCard}
          <div style={{ marginTop: 24 }}>
            {analisisCard}
          </div>
        </>
      )}

      {/* Modal de búsqueda de plantillas */}
      <BuscarPlantillaModal
        open={modalVisible}
        bloqueado={bloqueado}
        ocupadoRef={ocupadoRef}
        intentarOcupar={intentarOcupar}
        liberarOcupacion={liberarOcupacion}
        onClose={() => { if (!ocupadoRef.current && !bloqueado) setModalVisible(false); }}
        onSelect={handleSeleccionarPlantilla}
      />

      {/* Modal de movimientos posteriores */}
      <ModalMovimientosPosteriores
        open={movimientosModalOpen}
        sucursal={movimientosSucursal}
        codigo={selectedItem?.codigo || ''}
        dataSource={movimientosData}
        loading={movimientosLoading}
        onClose={() => { if (!ocupadoRef.current && !movimientosLoading && !bloqueado) setMovimientosModalOpen(false); }}
      />
    </div>
  );
};

export default MovimientoPorPlantilla;
