import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  Table,
  Input,
  Button,
  Row,
  Col,
  Typography,
  Space,
  Alert,
  App,
  Avatar,
  Divider,
  Tag,
  Skeleton,
} from 'antd';
import {
  SearchOutlined,
  ShopOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { Sucursal } from '../../types/auth';
import { entradaAlmacenApi } from '../../api/entradaAlmacenApi';
import { ordenCompraApi } from '../../api/ordenCompraApi';
import { generadorOrcApi } from '../../api/generadorOrcApi';
import { formatNumber, formatDate, toTitleCase } from '../../utils/formats';
import ModalMovimientosPosteriores from '../../components/ModalMovimientosPosteriores/ModalMovimientosPosteriores';
import type { ColumnsType } from 'antd/es/table';
import type { ProductoRmovdoc, ResultadoRmovdoc } from '../../types/rmovdoc';

const { Text } = Typography;

// Prefijos = códigos de documento (tipo_doc), NO códigos de pantalla.
const PREFIJOS_VALIDOS = ['ENP', 'ORC', 'GORC'];

// Centro de costo en el número de ENP -> sucursal de operaciones.
// 01 OrensePlaza, 02 HiperRomana, 03 OrenseVillaHermosa.
const CENTRO_COSTO_SUCURSAL: Record<string, number> = {
  '01': Sucursal.OrensePlaza,
  '02': Sucursal.HiperRomana,
  '03': Sucursal.OrenseVillaHermosa,
};

// Sucursales para el análisis de producto (igual que en FGORC).
const SUCURSALES_ANALISIS = [
  { id: Sucursal.OrensePlaza, nombre: 'OP' },
  { id: Sucursal.HiperRomana, nombre: 'HR' },
  { id: Sucursal.OrenseVillaHermosa, nombre: 'VH' },
];

function normalizarNumero(valor: string): string {
  return (valor || '').replace(/[^0-9]/g, '');
}

function parseReferencia(input: string): { prefijo: string; numero: string } | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;
  const partes = trimmed.split(/[-/\s]+/).filter(Boolean);
  if (partes.length < 2) return null;
  const prefijo = partes[0].toUpperCase();
  const numero = partes.slice(1).join('');
  if (!PREFIJOS_VALIDOS.includes(prefijo)) return null;
  if (!numero) return null;
  return { prefijo, numero };
}

// Suma de cantidades por sucursal (DetalleGeneradorDTO no tiene campo `cantidad`).
function sumarCantidades(cantidades: Record<string, number> | null | undefined): number {
  return Object.values(cantidades || {}).reduce((s, v) => s + (v || 0), 0);
}

const columnasProducto: ColumnsType<ProductoRmovdoc> = [
  {
    title: 'Código',
    dataIndex: 'codigo',
    key: 'codigo',
    width: 120,
    fixed: 'left',
    render: (codigo: string) => <span>{codigo || '-'}</span>,
  },
  {
    title: 'Artículo',
    dataIndex: 'articulo',
    key: 'articulo',
    render: (articulo: string) => <span>{toTitleCase(articulo || '')}</span>,
  },
  {
    title: 'Cantidad',
    dataIndex: 'cantidad',
    key: 'cantidad',
    width: 120,
    align: 'right',
    render: (v: number) => formatNumber(v || 0),
  },
  {
    title: 'Costo',
    dataIndex: 'costo',
    key: 'costo',
    width: 130,
    align: 'right',
    responsive: ['md', 'lg', 'xl', 'xxl'],
    render: (v: number) => formatNumber(v || 0),
  },
  {
    title: 'Descuento',
    dataIndex: 'descuento',
    key: 'descuento',
    width: 120,
    align: 'right',
    responsive: ['lg', 'xl', 'xxl'],
    render: (v: number) => formatNumber(v || 0),
  },
  {
    title: 'SubTotal',
    dataIndex: 'subTotal',
    key: 'subTotal',
    width: 120,
    align: 'right',
    responsive: ['lg', 'xl', 'xxl'],
    render: (v: number) => formatNumber(v || 0),
  },
  {
    title: 'Impuestos',
    dataIndex: 'impuestos',
    key: 'impuestos',
    width: 140,
    align: 'right',
    responsive: ['lg', 'xl', 'xxl'],
    render: (v: number) => formatNumber(v || 0),
  },
  {
    title: 'Total',
    dataIndex: 'total',
    key: 'total',
    width: 120,
    align: 'right',
    render: (v: number) => <Text strong>{formatNumber(v || 0)}</Text>,
  },
];

const Rmovdoc: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const { message } = App.useApp();

  const [valor, setValor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoRmovdoc | null>(null);
  const [detallesRaw, setDetallesRaw] = useState<any[]>([]);
  const [selectedDetalle, setSelectedDetalle] = useState<any | null>(null);

  // Análisis de producto (replica el drawer de FGORC)
  const [analisisData, setAnalisisData] = useState<any[]>([]);
  const [analisisLoading, setAnalisisLoading] = useState(false);
  const [analisisError, setAnalisisError] = useState(false);
  const [analisisResumenLoading, setAnalisisResumenLoading] = useState(false);
  const [movimientosModalOpen, setMovimientosModalOpen] = useState(false);
  const [movimientosSucursal, setMovimientosSucursal] = useState('');
  const [movimientosData, setMovimientosData] = useState<any[]>([]);
  const [movimientosLoading, setMovimientosLoading] = useState(false);

  const buscar = useCallback(async () => {
    const parsed = parseReferencia(valor);
    if (!parsed) {
      message.error('Formato inválido. Use CODIGO-NUMERO (ej. GORC-0000089327, ORC-..., ENP-...).');
      return;
    }
    const { prefijo, numero } = parsed;
    setLoading(true);
    setError(null);
    setResultado(null);
    setSelectedDetalle(null);
    setDetallesRaw([]);
    try {
      let productos: ProductoRmovdoc[] = [];
      let encabezado: ResultadoRmovdoc['encabezado'] = {};
      let raw: any[] = [];

      if (prefijo === 'GORC') {
        // genorc vive en BD Compra (sucursal 5)
        const filt = await generadorOrcApi.filtrar(Sucursal.Compra, { documento: numero, cantidad: 25, salto: 0 });
        const match = filt.find((d: any) => normalizarNumero(d.numero) === normalizarNumero(numero));
        if (!match) throw new Error('Documento no encontrado');
        const doc: any = await generadorOrcApi.obtenerPorId(Sucursal.Compra, match.idExterno);
        if (!doc) throw new Error('Documento no encontrado');
        // El detalle de GORC no trae cantidad/subTotal/descuento/impuestos/total calculados;
        // se derivan igual que en GeneradorORCDetalle (calcularFilaGORC).
        // Se filtran las líneas con cantidad 0.
        const todosGORC = doc.detalles || [];
        const mapeadosGORC = todosGORC.map((d: any) => {
          const cantTotal = sumarCantidades(d.cantidades);
          const costo = d.costo || 0;
          const pctDesc = d.porcentajeDescuento || 0;
          const pctImp = d.impuesto?.porcentaje ?? 0;
          const subTotal = Math.round(cantTotal * costo * 100) / 100;
          const descuento = Math.round(subTotal * (pctDesc / 100) * 100) / 100;
          const base = subTotal - descuento;
          const impuestos = Math.round(base * (pctImp / 100) * 100) / 100;
          const total = Math.round((base + impuestos) * 100) / 100;
          return {
            raw: d,
            producto: {
              codigo: d.codigo,
              articulo: d.producto,
              cantidad: cantTotal,
              costo,
              descuento,
              subTotal,
              impuestos,
              total,
            } as ProductoRmovdoc,
          };
        });
        const conCantidadGORC = mapeadosGORC.filter((x) => x.producto.cantidad > 0);
        productos = conCantidadGORC.map((x) => x.producto);
        raw = conCantidadGORC.map((x) => x.raw);
        encabezado = {
          noDocumento: doc.numero,
          fecha: doc.fecha,
          suplidor: doc.suplidor?.nombre,
          total: doc.total,
        };
      } else if (prefijo === 'ORC') {
        // ctransac tipo_doc ORC en BD Compra (sucursal 5)
        const filt = await ordenCompraApi.filtrar(Sucursal.Compra, Sucursal.Compra, { documento: numero, cantidad: 25, salto: 0 });
        // El backend filtra por num_doc (ORC); pero noDocumento trae num_orden (GENORC) por un
        // alias en la SQL, así que no sirve para comparar. El servidor ya filtró por el número
        // buscado, así que tomamos el primer resultado.
        const match = filt.data[0];
        if (!match) throw new Error('Documento no encontrado');
        const doc: any = await ordenCompraApi.obtenerPorId(Sucursal.Compra, match.id);
        raw = doc.detalles || [];
        productos = raw.map((d: any) => ({
          codigo: d.codigo,
          articulo: d.articulo,
          cantidad: d.cantidad,
          costo: d.costo,
          descuento: d.descuento,
          subTotal: d.subTotal,
          impuestos: d.impuestos,
          total: d.total,
        }));
        encabezado = {
          noDocumento: doc.noDocumento,
          fecha: doc.fechaDocumento,
          suplidor: doc.suplidor?.nombre,
          total: doc.total,
          monedaSimbolo: doc.moneda?.simbolo,
          monedaNombre: doc.moneda?.nombre,
        };
      } else if (prefijo === 'ENP') {
        // ctransac en BD de operaciones; sucursal por centro de costo del número.
        const cc = numero.slice(0, 2);
        const sucursalENP = CENTRO_COSTO_SUCURSAL[cc];
        const sucursal = sucursalENP !== undefined ? sucursalENP : (sucursalActiva as number);
        const filt = await entradaAlmacenApi.filtrar(sucursal, { documento: numero, cantidad: 25, salto: 0 });
        const match = filt.data.find((d: any) => normalizarNumero(d.documento) === normalizarNumero(numero));
        if (!match) throw new Error('Documento no encontrado');
        const doc: any = await entradaAlmacenApi.obtenerPorId(sucursal, match.id);
        raw = doc.detalles || [];
        productos = raw.map((d: any) => ({
          codigo: d.codigo,
          articulo: d.articulo,
          cantidad: d.cantidad,
          costo: d.costo,
          descuento: d.descuento,
          subTotal: d.subTotal,
          impuestos: d.impuestos,
          total: d.total,
        }));
        encabezado = {
          noDocumento: doc.noDocumento,
          fecha: doc.fechaDocumento,
          suplidor: doc.suplidor?.nombre,
          total: doc.total,
          monedaSimbolo: doc.moneda?.simbolo,
          monedaNombre: doc.moneda?.nombre,
        };
      }

      setDetallesRaw(raw);
      setResultado({
        prefijo,
        numero,
        referencia: `/${prefijo}/${numero}`,
        encabezado,
        productos,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || err?.message || 'Error al consultar el documento';
      message.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [valor, sucursalActiva, message]);

  // Cargar análisis del producto seleccionado (mismo comportamiento que el drawer de FGORC)
  useEffect(() => {
    if (!selectedDetalle) return;
    const codigo = selectedDetalle.codigo;

    setAnalisisData([]);
    setAnalisisLoading(true);
    setAnalisisError(false);

    Promise.allSettled(
      SUCURSALES_ANALISIS.map((s) =>
        entradaAlmacenApi.obtenerUltimasEntradasPorSucursal(s.id, codigo)
          .then((data) => {
            if (data && data.length > 0) {
              const item = data[0];
              return { ...item, sucursal: s.id, sucursalNombre: s.nombre };
            }
            return { sucursal: s.id, sucursalNombre: s.nombre, codigo, nombre: '', fecha: null as any, documento: '', cantidad: 0 };
          })
          .catch(() => ({
            sucursal: s.id, sucursalNombre: s.nombre, codigo, nombre: '', fecha: null as any, documento: '', cantidad: 0,
          }))
      )
    ).then((results) => {
      const datos = results
        .map((r) => (r.status === 'fulfilled' ? r.value : null))
        .filter((d): d is NonNullable<typeof d> => d !== null);
      setAnalisisData(datos);
      setAnalisisLoading(false);

      const conDatos = datos.filter((d) => d?.fecha);
      if (conDatos.length > 0) {
        setAnalisisResumenLoading(true);
        Promise.allSettled(
          conDatos.map((item) =>
            entradaAlmacenApi.obtenerResumenMovimientosPosteriores(
              item.sucursal, codigo, dayjs(item.fecha).format('YYYYMMDDHHmmss'), item.sucursal
            )
              .then((resumen) => ({ sucursal: item.sucursal, resumen }))
              .catch(() => ({ sucursal: item.sucursal, resumen: null }))
          )
        ).then((res) => {
          setAnalisisData((prev) =>
            prev.map((item) => {
              const found = res.find((r) => r.status === 'fulfilled' && r.value?.sucursal === item?.sucursal);
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
  }, [selectedDetalle]);

  const handleVerMovimientos = useCallback(async (item: any) => {
    if (!selectedDetalle) return;
    setMovimientosSucursal(item.sucursalNombre);
    setMovimientosModalOpen(true);
    setMovimientosLoading(true);
    setMovimientosData([]);
    try {
      const data = await entradaAlmacenApi.obtenerDetalleMovimientosPosteriores(
        item.sucursal,
        selectedDetalle.codigo,
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
  }, [selectedDetalle]);

  const referenciaCard = resultado ? (
    <Card className="paces-card" size="small" style={{ marginBottom: 16 }}>
      <Space size={[28, 8]} wrap align="center">
        <div>
          <div className="paces-text-secondary" style={{ fontSize: 11 }}>Referencia</div>
          <Text strong>{resultado.referencia}</Text>
        </div>
        {resultado.encabezado.noDocumento && (
          <div>
            <div className="paces-text-secondary" style={{ fontSize: 11 }}>Documento</div>
            <Text strong>{resultado.encabezado.noDocumento}</Text>
          </div>
        )}
        {resultado.encabezado.fecha && (
          <div>
            <div className="paces-text-secondary" style={{ fontSize: 11 }}>Fecha</div>
            <Text strong>{formatDate(resultado.encabezado.fecha)}</Text>
          </div>
        )}
        {resultado.encabezado.suplidor && (
          <div>
            <div className="paces-text-secondary" style={{ fontSize: 11 }}>Suplidor</div>
            <Text strong>{toTitleCase(resultado.encabezado.suplidor)}</Text>
          </div>
        )}
        <div>
          <div className="paces-text-secondary" style={{ fontSize: 11 }}>Total</div>
          {resultado.encabezado.total ? (
            <Text strong style={{ fontSize: 16, color: 'var(--paces-primary)' }}>
              {resultado.encabezado.monedaSimbolo || ''} {formatNumber(resultado.encabezado.total)}
              {resultado.encabezado.monedaNombre ? ` (${resultado.encabezado.monedaNombre})` : ''}
            </Text>
          ) : (
            <Tag color="warning" style={{ fontSize: 13, margin: 0 }}>
              {resultado.encabezado.monedaSimbolo || ''} 0{resultado.encabezado.monedaNombre ? ` (${resultado.encabezado.monedaNombre})` : ''} · Total en 0
            </Tag>
          )}
        </div>
      </Space>
    </Card>
  ) : null;

  const analisisCard = (
    <Card className="paces-card" size="small" title="Análisis de Producto">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* SECCIÓN A — Identidad del producto */}
        {selectedDetalle ? (
          <Space align="start" size={12} style={{ marginBottom: 16, width: '100%' }}>
            <Avatar size={40} style={{ backgroundColor: 'rgba(85,110,230,0.12)', color: 'var(--paces-primary)', fontWeight: 600, flexShrink: 0 }}>
              {(selectedDetalle?.producto || selectedDetalle?.articulo || '?')[0].toUpperCase()}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Typography.Title level={5} style={{ margin: 0 }}>{toTitleCase(selectedDetalle?.producto || selectedDetalle?.articulo || '')}</Typography.Title>
              <Typography.Text className="paces-text-secondary" style={{ fontSize: 12 }}>
                Código: {selectedDetalle?.codigo}
                {selectedDetalle?.referencia ? <span> · Ref: {selectedDetalle.referencia}</span> : ''}
                {selectedDetalle?.medida?.nombre ? <span> · Medida: {selectedDetalle.medida.nombre}</span> : ''}
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

        {/* SECCIÓN B — Última Entrada por sucursal */}
        {!selectedDetalle ? (
        <Alert type="info" message="Seleccione un producto para ver su análisis de movimientos." style={{ marginBottom: 16 }} />
        ) : analisisError ? (
          <Alert type="error" message="Error al cargar datos" style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={() => setSelectedDetalle({ ...selectedDetalle })}><ReloadOutlined />Reintentar</Button>} />
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
              {analisisData.map((item: any) => {
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

                        <div style={{ borderTop: '1px dashed #e8e8e8', marginBottom: 10 }} />

                        <div style={{ marginBottom: 10 }}>
                          <Typography.Text strong style={{ fontSize: 12, color: '#262626', display: 'block', marginBottom: 6 }}>
                            📊 Movimientos posteriores
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
                {selectedDetalle ? formatNumber(selectedDetalle?.costo || 0) : '—'}
              </Typography.Text>
            </Col>
            <Col span={8} style={{ borderRight: '1px solid #f0f0f0', textAlign: 'center' }}>
              <Typography.Text className="paces-text-secondary" style={{ fontSize: 11, display: 'block' }}>Margen %</Typography.Text>
              <Typography.Text strong style={{ fontSize: 16, color: selectedDetalle && (selectedDetalle?.margen || 0) > 0 ? '#34c38f' : '#ff4d4f' }}>
                {selectedDetalle ? `${(selectedDetalle?.margen || 0).toFixed(2)}%` : '—'}
              </Typography.Text>
            </Col>
            <Col span={8} style={{ textAlign: 'center' }}>
              <Typography.Text className="paces-text-secondary" style={{ fontSize: 11, display: 'block' }}>Precio</Typography.Text>
              <Typography.Text strong style={{ fontSize: 16 }}>
                {selectedDetalle ? formatNumber(selectedDetalle?.precioSugerido || 0) : '—'}
              </Typography.Text>
            </Col>
          </Row>
        </div>
      </div>
    </Card>
  );

  const productosTable = (resultado?.productos?.length ?? 0) > 0 ? (
    <Card className="paces-card" size="small" title={`Productos (${resultado!.productos.length})`}>
      <Table
        dataSource={resultado!.productos}
        columns={columnasProducto}
        rowKey={(_, index) => String(index)}
        size="small"
        pagination={false}
        scroll={{ x: 1100 }}
        rowClassName={(record, index) =>
          selectedDetalle && detallesRaw[index ?? 0]?.codigo === selectedDetalle?.codigo
            ? 'paces-row-selected'
            : ''
        }
        onRow={(record, index) => ({
          onClick: () => setSelectedDetalle(detallesRaw[index ?? 0] ?? null),
          style: { cursor: 'pointer' },
        })}
        locale={{ emptyText: 'Sin productos' }}
      />
    </Card>
  ) : null;

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xxl={18}>
          <Card className="paces-card" size="small" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Text strong style={{ fontSize: 16 }}>Consulta de Documentos por Referencia</Text>
              <Space.Compact style={{ width: '100%', maxWidth: 600 }}>
                <Input
                  placeholder="Referencia (ej. GORC-0000089327)"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  onPressEnter={buscar}
                  prefix={<SearchOutlined className="paces-text-icon" />}
                  allowClear
                />
                <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={buscar}>
                  Buscar
                </Button>
              </Space.Compact>
            </Space>
          </Card>

          {error && !resultado && (
            <Alert type="error" message={error} style={{ marginBottom: 16 }} />
          )}

          {resultado && (
            <>
              {referenciaCard}
              {productosTable}
            </>
          )}
        </Col>
        <Col xxl={6}>
          {analisisCard}
        </Col>
      </Row>

      <ModalMovimientosPosteriores
        open={movimientosModalOpen}
        sucursal={movimientosSucursal}
        codigo={selectedDetalle?.codigo || ''}
        dataSource={movimientosData}
        loading={movimientosLoading}
        onClose={() => setMovimientosModalOpen(false)}
      />
    </div>
  );
};

export default Rmovdoc;
