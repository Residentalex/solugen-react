import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Grid, Divider, Dropdown,
  Descriptions, Alert, Typography, Space, Input, DatePicker, Tooltip, message, Modal,
  Checkbox
} from 'antd';
import type { MenuProps } from 'antd';
import {
  InboxOutlined,
  ArrowLeftOutlined, ReloadOutlined, FilterOutlined, FilterFilled,
  DollarCircleOutlined, FileTextOutlined, SwapOutlined,
  CreditCardOutlined, CreditCardFilled, GiftOutlined,
  TagOutlined, RollbackOutlined, PrinterOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import FechaColumnCell from '../../components/FechaColumnCell';
import { turnoApi } from '../../api/turnoApi';
import type { CobroDTO } from '../../types/turno';
import { formatCurrency, formatDate, formatDateTime, toTitleCase, formatNumber } from '../../utils/formats';
import DetalleToolbar from '../../components/DetalleToolbar';
import FiltroSeleccionDropdown from '../../components/FiltroSeleccionDropdown';
import PermissionGate from '../../components/PermissionGate';
import { CODIGO_PLANTILLA_TURNO_CIERRE } from '../../utils/ticketPlantilla';
import { companiaApi } from '../../api/companiaApi';
import { reportesConfigApi } from '../../api/reportesConfigApi';
import { visanetApi } from '../../api/visanetApi';
import type { VisanetTurnoVoucherDTO } from '../../types/visanet';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import dayjs from 'dayjs';

const { Text } = Typography;

// Fila de detalle del turno (costos/ingresos). Los montos pueden llegar como
// número, texto o vacío, por eso se tipan como number | string y se coercionan
// con aNumero al totalizar.
interface DetalleTurnoFila {
  codigo?: string;
  articulo?: string;
  referencia?: string;
  cantidad?: number | string;
  precio?: number | string;
  subTotal?: number | string;
  porcentajeDescuento?: number | string;
  descuento?: number | string;
  impuestos?: number | string;
  total?: number | string;
  impuesto?: { nombre?: string };
  familia?: { nombre?: string };
  medida?: { nombre?: string; factor?: number | string };
}

const aNumero = (v: unknown): number => {
  if (typeof v === 'number') return Number.isNaN(v) ? 0 : v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
};

// ─── Cierre de vouchers por turno (ventana HTML) ─────────────────────────────────
// Replica el formato de VisanetTest.handleVisualizarCierre adaptado a
// VisanetTurnoVoucherDTO: agrupación por marca+lote (marca = nTipoTC con
// fallback a host), REF.: = rrn, VENTA NORMAL/ANULADA (anulada = T/S con monto
// negativo), totales Ventas/Anulaciones/Total, cabecera del comercio,
// 'DETALLES DEL CIERRE' y '** CIERRE COMPLETO **'.
// La vía térmica VSNT_CIERRE no se usa: sus zonas por defecto solo imprimen
// encabezado/resultado (ID_COMERCIO/FECHA/RESULTADO) y no el detalle itemizado
// por marca+lote con totales que exige este reporte.
const caracteresHtmlCierre: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
};

const escaparHtmlCierre = (valor: unknown): string =>
  String(valor ?? '').replace(/[&<>"']/g, (caracter) => caracteresHtmlCierre[caracter] ?? caracter);

/** Un voucher de turno está anulado si ANULADO es 'T' (actual) o 'S' (legacy). */
const esVoucherAnuladoTurno = (valor?: string): boolean => valor === 'T' || valor === 'S';

function generarHtmlCierreVouchersTurno(
  vouchers: VisanetTurnoVoucherDTO[],
  companyInfo: { nombre: string; direccion: string; telefono: string; fax: string; rnc: string },
  simMoneda: string,
  noTurno: string,
  fechaEtiqueta: string,
): string {
  const formatoMonto = (monto: number) =>
    `${simMoneda} ${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const grupos = new Map<string, { marca: string; lote: string; vouchers: VisanetTurnoVoucherDTO[] }>();
  vouchers.forEach((voucher) => {
    const marca = voucher.nTipoTC?.trim() || voucher.host?.trim() || 'SIN MARCA';
    const lote = voucher.noLote?.trim() || 'SIN LOTE';
    const clave = `${marca}::${lote}`;
    const grupo = grupos.get(clave);
    if (grupo) {
      grupo.vouchers.push(voucher);
    } else {
      grupos.set(clave, { marca, lote, vouchers: [voucher] });
    }
  });

  const ventas = vouchers.filter((voucher) => !esVoucherAnuladoTurno(voucher.anulado));
  const anulaciones = vouchers.filter((voucher) => esVoucherAnuladoTurno(voucher.anulado));
  const montoVentas = ventas.reduce((total, voucher) => total + Number(voucher.monto || 0), 0);
  const montoAnulaciones = anulaciones.reduce((total, voucher) => total + Number(voucher.monto || 0), 0);

  const gruposHtml = Array.from(grupos.values()).map(({ marca, lote, vouchers: vouchersGrupo }) => {
    const marcaMostrada = marca.toUpperCase() === 'MCARD' ? 'MASTERCARD' : marca;
    const movimientos = vouchersGrupo.map((voucher) => {
      const esAnulacion = esVoucherAnuladoTurno(voucher.anulado);
      const monto = Number(voucher.monto || 0);
      const tarjeta = voucher.notarjeta?.trim() || 'SIN TARJETA';
      const marcaLinea = voucher.nombtar?.trim() || voucher.tipoTC?.trim() || '';
      const aprobacion = voucher.noAprob?.trim();
      const fechaMovimiento = voucher.fecha && dayjs(voucher.fecha).isValid()
        ? dayjs(voucher.fecha).format('DD/MM/YY')
        : (typeof voucher.fecha === 'string' ? voucher.fecha.trim() : '');
      const horaMovimiento = voucher.hora?.trim();
      const detalles = [
        aprobacion ? escaparHtmlCierre(aprobacion) : '',
        fechaMovimiento ? `FECHA: ${escaparHtmlCierre(fechaMovimiento)}` : '',
        horaMovimiento ? `HORA: ${escaparHtmlCierre(horaMovimiento)}` : '',
      ].filter(Boolean).join('   ');

      return `<div class="movimiento ${esAnulacion ? 'anulacion' : ''}">
            <div class="movimiento-cabecera">
              <span>REF.: ${escaparHtmlCierre(voucher.rrn?.trim() || 'SIN REF.')}</span>
              <span>${escaparHtmlCierre(tarjeta)}</span>
              <span>${escaparHtmlCierre(marcaLinea)}</span>
            </div>
            ${detalles ? `<div class="movimiento-detalle">${detalles}</div>` : ''}
            <div class="movimiento-estado">
              <strong>${esAnulacion ? 'VENTA ANULADA' : 'VENTA NORMAL'}</strong>
              <strong>${escaparHtmlCierre(formatoMonto(esAnulacion ? -monto : monto))}</strong>
            </div>
          </div>`;
    }).join('');

    return `<section class="grupo">
          <div class="fila-meta grupo-meta"><strong>HOST: ${escaparHtmlCierre(marcaMostrada)}</strong><strong>LOTE: ${escaparHtmlCierre(lote)}</strong></div>
          <div class="separador"></div>
          ${movimientos}
          <div class="separador"></div>
        </section>`;
  }).join('');

  const merchantId = vouchers.map((v) => v.merchantId?.trim()).find(Boolean) || '';
  const encabezadoEmpresa = [
    merchantId && `<div>${escaparHtmlCierre(merchantId)}</div>`,
    companyInfo.nombre && `<div class="nombre-comercio">${escaparHtmlCierre(companyInfo.nombre)}</div>`,
    companyInfo.rnc && `<div>${escaparHtmlCierre(companyInfo.rnc)}</div>`,
    companyInfo.direccion && `<div class="etiqueta">DIRECCION DEL COMERCIO</div><div>${escaparHtmlCierre(companyInfo.direccion)}</div>`,
  ].filter(Boolean).join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Cierre Visanet Turno ${escaparHtmlCierre(noTurno)}</title>
<style>
  @page { size: 80mm auto; margin: 3mm; }
  * { box-sizing: border-box; }
  body { width: 74mm; margin: 0 auto; padding: 2mm 0; color: #171717; font-family: Arial, sans-serif; font-size: 9px; line-height: 1.25; }
  .recibo { min-height: 120mm; border: 1px solid #62738d; padding: 7mm 3.5mm 5mm; }
  .encabezado { text-align: center; margin-bottom: 9px; text-transform: uppercase; }
  .nombre-comercio { margin-bottom: 8px; font-size: 16px; font-weight: 700; }
  .etiqueta { margin-top: 1px; }
  h1 { margin: 2px 0 0; font-size: 10px; }
  .fecha { font-weight: 700; }
  .grupo { margin-top: 10px; break-inside: avoid; }
  .fila-meta, .movimiento-pie { display: flex; justify-content: space-between; gap: 7px; }
  .grupo-meta { justify-content: flex-start; gap: 14px; }
  .movimiento-cabecera { display: grid; grid-template-columns: auto 1fr auto; gap: 5px; }
  .movimiento-cabecera span:nth-child(2) { text-align: center; }
  .movimiento-cabecera span:last-child { text-align: right; }
  .separador { border-top: 1px solid #565656; margin: 4px 0; }
  .movimiento { margin: 4px 0; }
  .movimiento-detalle { color: #333; overflow-wrap: anywhere; }
  .anulacion { font-weight: 700; }
  .resumen { margin-top: 13px; }
  .fila-total { display: grid; grid-template-columns: 1fr 20px auto; gap: 5px; padding: 2px 0; }
  .fila-total strong:last-child { text-align: right; }
  .neto { font-weight: 700; }
  .pie { margin-top: 17px; text-align: center; font-weight: 700; }
  @media print { body { width: auto; padding: 0; } .recibo { min-height: 0; } }
</style>
</head>
<body>
<main class="recibo">
  <header class="encabezado">
    ${encabezadoEmpresa}
    <h1>DETALLES DEL CIERRE</h1>
    <div class="fecha">TURNO: ${escaparHtmlCierre(noTurno)}</div>
    <div class="fecha">FECHA: ${escaparHtmlCierre(fechaEtiqueta)}</div>
  </header>
  ${gruposHtml}
  <section class="resumen">
    <div class="separador"></div>
    <div class="fila-total"><span>Ventas:</span><strong>${ventas.length}</strong><strong>${escaparHtmlCierre(formatoMonto(montoVentas))}</strong></div>
    <div class="fila-total anulacion"><span>Anulaciones:</span><strong>${anulaciones.length}</strong><strong>${escaparHtmlCierre(formatoMonto(-montoAnulaciones))}</strong></div>
    <div class="fila-total neto"><span>Total:</span><strong>${ventas.length - anulaciones.length}</strong><strong>${escaparHtmlCierre(formatoMonto(montoVentas - montoAnulaciones))}</strong></div>
  </section>
  <footer class="pie">** CIERRE COMPLETO **</footer>
</main>
</body>
</html>`;
}

// ─── Componente de filtro por rango de fechas ─────────────────────────────────
const FiltroFechaDropdown: React.FC<{
  confirm: () => void;
  clearFilters: () => void;
  filtroKey: string;
  filtrosActivos: Record<string, any>;
  setFiltrosActivos: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}> = ({ confirm, clearFilters, filtroKey, filtrosActivos, setFiltrosActivos }) => {
  const [fechas, setFechas] = React.useState<any>(null);

  const handleAplicar = () => {
    if (fechas && fechas[0] && fechas[1]) {
      setFiltrosActivos(prev => ({
        ...prev,
        [filtroKey]: { value: [fechas[0].toISOString(), fechas[1].toISOString()] }
      }));
    } else {
      setFiltrosActivos(prev => { const n = { ...prev }; delete n[filtroKey]; return n; });
    }
    confirm();
  };

  const handleLimpiar = () => {
    setFechas(null);
    clearFilters?.();
    setFiltrosActivos(prev => { const n = { ...prev }; delete n[filtroKey]; return n; });
    confirm();
  };

  return (
    <div style={{ padding: 12, width: 260 }}>
      <DatePicker.RangePicker
        value={fechas}
        onChange={dates => setFechas(dates)}
        style={{ width: '100%', marginBottom: 8 }}
        placeholder={['Fecha desde', 'Fecha hasta']}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button size="small" onClick={handleLimpiar}>Limpiar</Button>
        <Button type="primary" size="small" onClick={handleAplicar}>Aplicar</Button>
      </div>
    </div>
  );
};

const TurnoDetalle: React.FC = () => {
  const { noTurno } = useParams<{ noTurno: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const sucursalContable = useAuthStore((s: any) => s.sucursalContable);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);

  const screens = Grid.useBreakpoint();
  const isLarge = screens.xxl === true;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['turnoDetalle', sucursalActiva, noTurno],
    queryFn: async () => {
      if (!noTurno) throw new Error('NoTurno es requerido');
      return turnoApi.obtenerPorNoTurno(sucursalActiva, noTurno);
    },
    enabled: !!noTurno && sucursalActiva !== undefined,
  });

  useEffect(() => {
    setActiveModule('FTURNOS');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (data) {
      setPageTitleOverride(`Turno: ${data.noTurno}`);
    }
  }, [data, setPageTitleOverride]);

  const { data: desgloseData, isLoading: cargandoDesglose } = useQuery({
    queryKey: ['turnoDesgloseMonedas', sucursalActiva, noTurno],
    queryFn: async () => {
      if (!noTurno || sucursalActiva === undefined) return [];
      return turnoApi.obtenerDesgloseMonedas(sucursalActiva, noTurno);
    },
    enabled: !!noTurno && sucursalActiva !== undefined && !!data,
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handlePostear = () => {
    Modal.confirm({
      title: 'Postear Turno',
      content: `¿Está seguro de generar los asientos contables del turno ${data?.noTurno}?`,
      okText: 'Postear',
      cancelText: 'Cancelar',
      onOk: async () => {
        if (!data || posteando || imprimiendo) return;
        setPosteando(true);
        try {
          await turnoApi.postear(sucursalActiva, data.noTurno, sucursalContable);
          message.success('Turno posteado correctamente');
          refetch();
        } catch (err: any) {
          message.error(err?.response?.data?.errorMessage || 'Error al postear el turno');
        } finally {
          setPosteando(false);
        }
      },
    });
  };

const [filtrosActivos, setFiltrosActivos] = useState<Record<string, any>>({});
   const [costosFiltrosActivos, setCostosFiltrosActivos] = useState<Record<string, any>>({});
   const [ingresosFiltrosActivos, setIngresosFiltrosActivos] = useState<Record<string, any>>({});
const [costosSearch, setCostosSearch] = useState('');
    const [ingresosSearch, setIngresosSearch] = useState('');
    const [articulosSearch, setArticulosSearch] = useState('');
    const [posteando, setPosteando] = useState(false);
    const [imprimiendo, setImprimiendo] = useState(false);
    const asientos = data?.factura?.asientos || [];
    const logs = data?.factura?.logs || [];
    const detalles: DetalleTurnoFila[] = data?.factura?.detalles ?? [];

    const articulosFiltrados = React.useMemo(() => {
      if (!detalles) return [];
      if (!articulosSearch) return detalles;
      const q = articulosSearch.toLowerCase();
      return detalles.filter((d: any) =>
        String(d.codigo ?? '').toLowerCase().includes(q) ||
        String(d.articulo ?? '').toLowerCase().includes(q) ||
        String(d.referencia ?? '').toLowerCase().includes(q)
      );
    }, [detalles, articulosSearch]);

    const articulosColumns = [
      {
        title: 'Código',
        key: 'codigo',
        width: 120,
        fixed: 'left' as const,
        onCell: () => ({ style: { verticalAlign: 'top' } }),
        render: (_: any, record: any) => (
          <div style={{ fontSize: 13 }}>
            <div>{record.codigo || '-'}</div>
            {record.referencia && (
              <Tooltip title={record.referencia}>
                <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                  {record.referencia}
                </div>
              </Tooltip>
            )}
          </div>
        ),
      },
      {
        title: 'Artículo',
        key: 'articulo',
        ellipsis: true,
        onCell: () => ({ style: { verticalAlign: 'top' } }),
        render: (_: any, record: any) => (
          <div style={{ fontSize: 13 }}>
            <div>{toTitleCase(record.articulo || '')}</div>
            <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }}>
              {record.familia?.nombre ? <Tag style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>{toTitleCase(record.familia.nombre)}</Tag> : null}
            </div>
          </div>
        ),
      },
      {
        title: 'Cantidad',
        dataIndex: 'cantidad',
        key: 'cantidad',
        width: 120,
        align: 'right' as const,
        onCell: () => ({ style: { verticalAlign: 'top' } }),
        render: (_: any, record: any) => (
          <div>
            <div>{formatNumber(record.cantidad || 0)}</div>
            {record.medida?.nombre && (
              <Tooltip title={record.medida.nombre}>
                <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {record.medida.nombre}
                </div>
              </Tooltip>
            )}
          </div>
        ),
      },
      {
        title: 'Precio',
        dataIndex: 'precio',
        key: 'precio',
        width: 130,
        align: 'right' as const,
        onCell: () => ({ style: { verticalAlign: 'top' } }),
        responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
        render: (_: any, record: any) => {
          const pctDesc = Number(record.porcentajeDescuento) || 0;
          const factor = Number(record.medida?.factor) || 1;
          const precioBase = Number(record.precio) || 0;
          const precioConDescuento = precioBase - ((precioBase * pctDesc) / 100);
          const precioUnitario = precioConDescuento / factor;
          return (
            <div>
              <div>{formatNumber(precioBase)}</div>
              <div style={{ fontSize: 11, lineHeight: 1.5, color: '#999' }}>
                {formatNumber(precioUnitario)} × {factor}
              </div>
            </div>
          );
        },
      },
      {
        title: 'Descuento',
        key: 'descuento',
        width: 120,
        align: 'right' as const,
        onCell: () => ({ style: { verticalAlign: 'top' } }),
        responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
        render: (_: any, record: any) => (
          <div>
            <div>{formatNumber(record.descuento || 0)}</div>
            <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
          </div>
        ),
      },
      {
        title: 'SubTotal',
        dataIndex: 'subTotal',
        key: 'subTotal',
        width: 120,
        align: 'right' as const,
        onCell: () => ({ style: { verticalAlign: 'top' } }),
        responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
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
        onCell: () => ({ style: { verticalAlign: 'top' } }),
        responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
        render: (_: any, record: any) => (
          <div>
            <div>{formatNumber(record.impuestos || 0)}</div>
            {record.impuesto?.nombre && (
              <Tooltip title={record.impuesto.nombre}>
                <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {toTitleCase(record.impuesto.nombre)}
                </div>
              </Tooltip>
            )}
          </div>
        ),
      },
      {
        title: 'Total',
        dataIndex: 'total',
        key: 'total',
        width: 120,
        align: 'right' as const,
        onCell: () => ({ style: { verticalAlign: 'top', paddingRight: 16 } }),
        onHeaderCell: () => ({ style: { paddingRight: 16 } }),
        render: (_: any, record: any) => (
          <div>
            <Text strong>{formatNumber(record.total || 0)}</Text>
            <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
          </div>
        ),
      },
    ];

  // ─── Helpers de filtros ──────────────────────────────────────────────────────
  const limpiarFiltro = React.useCallback((key: string) => {
    setFiltrosActivos(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  const limpiarTodosFiltros = React.useCallback(() => {
    setFiltrosActivos({});
  }, []);

  const limpiarFiltroCostos = React.useCallback((key: string) => {
    setCostosFiltrosActivos(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  const limpiarTodosFiltrosCostos = React.useCallback(() => {
    setCostosFiltrosActivos({});
  }, []);

  const limpiarFiltroIngresos = React.useCallback((key: string) => {
    setIngresosFiltrosActivos(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  const limpiarTodosFiltrosIngresos = React.useCallback(() => {
    setIngresosFiltrosActivos({});
  }, []);

  // Bloqueo uniforme durante postear/imprimir
  const procesandoTurno = posteando || imprimiendo;

  // ─── Impresión dual del cierre de turno ────────────────────────────────────────
  // Ticket de cierre (plantilla TURNO_CIERRE) + cierre de vouchers Visanet
  // (ventana HTML con el formato de VisanetTest). El flag imprimiendo lo
  // gobierna handleImprimir; los núcleos devuelven boolean sin tocarlo.
  type OpcionImpresion = 'ticket' | 'vouchers' | 'ambos';

  const itemsImpresion: MenuProps['items'] = [
    { key: 'ticket', label: 'Ticket de cierre', icon: <PrinterOutlined /> },
    { key: 'vouchers', label: 'Cierre de vouchers', icon: <CreditCardOutlined /> },
    { key: 'ambos', label: 'Ambos' },
  ];

  // Info de la compañía para los reportes (misma fuente que el ticket de cierre).
  const obtenerCompanyInfoTurno = async () => {
    let companyInfo = { nombre: '', direccion: '', telefono: '', rnc: '', fax: '', slogan: '' };
    try {
      const lista = await companiaApi.obtenerTodas(sucursalActiva);
      if (lista.length > 0) {
        companyInfo = {
          nombre: lista[0].nombre ?? '',
          direccion: lista[0].direccion ?? '',
          telefono: lista[0].telefono ?? '',
          rnc: lista[0].rnc ?? '',
          fax: lista[0].fax ?? '',
          slogan: lista[0].slogan ?? '',
        };
      }
    } catch {
      const sucursales = useAuthStore.getState().sucursalesPermitidas;
      companyInfo.nombre = sucursales.find((sp: any) => sp.sucursal === sucursalActiva)?.nombre || '';
    }
    return companyInfo;
  };

  // Núcleo de impresión del ticket de cierre (plantilla TURNO_CIERRE, TICKET_TC).
  const imprimirTicketCierre = async (): Promise<boolean> => {
    if (!data) return false;
    try {
      // Datos de la compañía desde la sucursal activa
      const companyInfo = await obtenerCompanyInfoTurno();

    // Plantilla ESC/POS de cierre de turno (por codigo fijo TURNO_CIERRE)
    const plantilla = await reportesConfigApi.obtenerPorCodigo(CODIGO_PLANTILLA_TURNO_CIERRE);
    if (!plantilla) {
      message.error('No hay plantilla ESC/POS asignada para el cierre de turno.');
      return false;
    }

    // JSON de impresión resumido para el ticket de cierre (TURNO_CIERRE).
    // La plantilla solo consume: encabezado + resumen por tipo de cobro
    // (los marcadores COBRO: resuelven a cobros.0.<tipo>) + los totales
    // top-level (total, cobrado, porCobrar, devuelta). No se envian facturas,
    // detalles ni los cobros por documento — solo resúmenes de todo.
    const dataPrint = {
      id: data.id,
      noTurno: data.noTurno,
      fechaApertura: data.fechaApertura,
      fechaCierre: data.fechaCierre,
      fechaDocumento: data.fechaCierre || data.fechaApertura,
      total: data.total ?? 0,
      cobrado,
      porCobrar,
      devuelta: cobrosTotales.devuelta,
      nombrePOS: data.nombrePOS,
      usuario: { nombre: data?.usuario?.nombre ?? '' },
      factur: { cajero: data?.usuario?.nombre ?? '' },
      ...(data.estado !== undefined ? { estado: data.estado } : {}),
      sucursal: {
        nombre: companyInfo.nombre,
        direccion: companyInfo.direccion,
        telefono: companyInfo.telefono,
        rnc: companyInfo.rnc,
        fax: companyInfo.fax,
        slogan: companyInfo.slogan,
      },
      cobros: [cobrosTotales],
      impuestos: Object.entries(impuestosTotales).map(([tipo, monto]) => ({
        tipo,
        monto,
      })),
      desgloseMonedas: desgloseData || [],
    };

    // Obtener el payload serializado que el frontend enviara directamente
    // al servicio local Solugen.Impresion.Service de la maquina cliente.
    const payload = await reportesConfigApi.obtenerPayloadImpresion(plantilla.plantillaId, {
      tipoDoc: 'TICKET_TC',
      data: dataPrint,
      company: companyInfo,
      feedLines: 4,
      cut: true,
      copias: 1,
    });

    // URL del servicio local de impresion.
    const servicioLocalUrl = import.meta.env.VITE_IMPRESSION_SERVICE_URL || 'http://localhost:5010/imprimir';
    const resultado = await reportesConfigApi.imprimirLocal(payload, servicioLocalUrl);
    if (resultado.ok) {
      message.success('Ticket de cierre enviado a la impresora');
      return true;
    }
    message.error(resultado.error ?? 'Error al imprimir: el servicio local no respondio');
    return false;
  } catch (err: any) {
    const msg =
      err?.response?.data?.errorMessage ||
      err?.response?.data?.ErrorMessage ||
      err?.message ||
      'Error al imprimir el ticket';
    message.error(msg);
    return false;
  }
};

  // Núcleo del cierre de vouchers del turno (ventana HTML con el formato de
  // VisanetTest). Si el turno no tiene vouchers muestra message.info.
  const imprimirCierreVouchers = async (): Promise<boolean> => {
    if (!data) return false;
    let vouchers: VisanetTurnoVoucherDTO[];
    try {
      // El backend espera el NoTurno exacto de TURNOS.TURNO (mismo valor que
      // TurnoController.Cerrar usa al pedir los vouchers del turno).
      vouchers = await visanetApi.obtenerVouchersTurno(sucursalActiva, data.noTurno);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al obtener los vouchers del turno');
      return false;
    }
    if (!vouchers || vouchers.length === 0) {
      message.info('Este turno no tiene vouchers Visanet.');
      return false;
    }
    const ventana = window.open('', '_blank');
    if (!ventana) {
      message.error('El navegador bloqueó la vista del cierre. Permite las ventanas emergentes e inténtalo de nuevo.');
      return false;
    }
    try {
      const companyInfo = await obtenerCompanyInfoTurno();
      const simMoneda = getMonedaSucursalActiva().simbolo;
      const fechaCierre = data.fechaCierre || data.fechaApertura;
      const fechaEtiqueta = fechaCierre && dayjs(fechaCierre).isValid()
        ? dayjs(fechaCierre).format('DD/MM/YYYY')
        : String(fechaCierre ?? '');
      ventana.document.write(generarHtmlCierreVouchersTurno(vouchers, companyInfo, simMoneda, data.noTurno, fechaEtiqueta));
      ventana.document.close();
      ventana.focus();
      return true;
    } catch {
      ventana.close();
      message.error('No se pudo generar la vista del cierre.');
      return false;
    }
  };

  // Dispatcher del Dropdown.Button de impresión. Respeta el bloqueo
  // procesandoTurno (imprimiendo/posteando). 'ambos' imprime secuencialmente
  // el ticket y luego los vouchers; sin vouchers solo sale el ticket.
  const handleImprimir = async (opcion: OpcionImpresion) => {
    if (!data || imprimiendo || posteando) return;
    setImprimiendo(true);
    try {
      if (opcion === 'ticket') {
        await imprimirTicketCierre();
        return;
      }
      if (opcion === 'vouchers') {
        await imprimirCierreVouchers();
        return;
      }
      await imprimirTicketCierre();
      await imprimirCierreVouchers();
    } finally {
      setImprimiendo(false);
    }
  };

  // Calcular cobros totales
  const cobrosTotales: CobroDTO = React.useMemo(() => {
    if (!data?.cobros?.length) return {
      efectivo: 0, cheque: 0, transferencia: 0,
      tarjetaCredito: 0, tarjetaDebito: 0, bono: 0,
      tarjetaRegalo: 0, notaCredito: 0, pago: 0, devuelta: 0, facturaID: 0,
    };
    return data.cobros.reduce((acc: CobroDTO, c: CobroDTO) => ({
      efectivo: acc.efectivo + (c.efectivo || 0),
      cheque: acc.cheque + (c.cheque || 0),
      transferencia: acc.transferencia + (c.transferencia || 0),
      tarjetaCredito: acc.tarjetaCredito + (c.tarjetaCredito || 0),
      tarjetaDebito: acc.tarjetaDebito + (c.tarjetaDebito || 0),
      bono: acc.bono + (c.bono || 0),
      tarjetaRegalo: acc.tarjetaRegalo + (c.tarjetaRegalo || 0),
      notaCredito: acc.notaCredito + (c.notaCredito || 0),
      pago: acc.pago + (c.pago || 0),
      devuelta: acc.devuelta + (c.devuelta || 0),
      facturaID: 0,
    }), { efectivo: 0, cheque: 0, transferencia: 0, tarjetaCredito: 0, tarjetaDebito: 0, bono: 0, tarjetaRegalo: 0, notaCredito: 0, pago: 0, devuelta: 0, facturaID: 0 });
  }, [data?.cobros]);

  const cobrado = data?.cobros?.reduce((sum, c) => sum +
    (c.efectivo || 0) + (c.cheque || 0) + (c.transferencia || 0) +
    (c.tarjetaCredito || 0) + (c.tarjetaDebito || 0) + (c.bono || 0) +
    (c.tarjetaRegalo || 0) + (c.notaCredito || 0), 0) ?? 0;
const total = data?.total ?? 0;
  const porCobrar = total - cobrado;

  // Resumen de impuestos por tipo (I=Impuesto, L=Liquidación, V=Informativo, R=Retención)
  const impuestosTotales: Record<string, number> = React.useMemo(() => {
    const acumulador: Record<string, number> = {};
    if (!data?.facturas) return acumulador;
    data.facturas.forEach((f: any) => {
      if (f.impuestos && Array.isArray(f.impuestos)) {
        f.impuestos.forEach((imp: any) => {
          const tipo = imp.tipo || 'I';
          acumulador[tipo] = (acumulador[tipo] || 0) + (imp.monto || 0);
        });
      }
    });
    return acumulador;
  }, [data?.facturas]);

  // Mapa de pagos por factura
  const pagosPorFactura: Record<number, { metodos: Array<{ key: string; label: string; monto: number }>; totalPagado: number }> = React.useMemo(() => {
    const mapa: Record<number, { metodos: Array<{ key: string; label: string; monto: number }>; totalPagado: number }> = {};
    if (!data?.cobros) return mapa;
    data.cobros.forEach((c: CobroDTO) => {
      if (!mapa[c.facturaID]) {
        mapa[c.facturaID] = { metodos: [], totalPagado: 0 };
      }
      const metodos: Array<{ key: string; label: string; monto: number }> = [];
      if (c.efectivo > 0) metodos.push({ key: 'efectivo', label: 'Efvo.', monto: c.efectivo });
      if (c.cheque > 0) metodos.push({ key: 'cheque', label: 'Cheque', monto: c.cheque });
      if (c.transferencia > 0) metodos.push({ key: 'transferencia', label: 'Transf.', monto: c.transferencia });
      if (c.tarjetaCredito > 0) metodos.push({ key: 'tarjetaCredito', label: 'T.Créd.', monto: c.tarjetaCredito });
      if (c.tarjetaDebito > 0) metodos.push({ key: 'tarjetaDebito', label: 'T.Déb.', monto: c.tarjetaDebito });
      if (c.bono > 0) metodos.push({ key: 'bono', label: 'Bono', monto: c.bono });
      if (c.tarjetaRegalo > 0) metodos.push({ key: 'tarjetaRegalo', label: 'T.Reg.', monto: c.tarjetaRegalo });
      if (c.notaCredito > 0) metodos.push({ key: 'notaCredito', label: 'N.Créd.', monto: c.notaCredito });
      mapa[c.facturaID].metodos.push(...metodos);
      mapa[c.facturaID].totalPagado += metodos.reduce((sum, m) => sum + m.monto, 0);
    });
    return mapa;
  }, [data?.cobros]);

  // Mapas para iconos y labels de métodos de pago
  const METODO_PAGO_LABELS: Record<string, string> = {
    efectivo: 'Efectivo', cheque: 'Cheque', transferencia: 'Transferencia',
    tarjetaCredito: 'T. Crédito', tarjetaDebito: 'T. Débito',
    bono: 'Bono', tarjetaRegalo: 'T. Regalo', notaCredito: 'N. Crédito',
  };

  const ICONO_MAP: Record<string, React.ReactNode> = {
    efectivo: <DollarCircleOutlined style={{ fontSize: 18, color: '#52c41a' }} />,
    cheque: <FileTextOutlined style={{ fontSize: 18, color: '#1890ff' }} />,
    transferencia: <SwapOutlined style={{ fontSize: 18, color: '#722ed1' }} />,
    tarjetaCredito: <CreditCardOutlined style={{ fontSize: 18, color: '#13c2c2' }} />,
    tarjetaDebito: <CreditCardFilled style={{ fontSize: 18, color: '#2f54eb' }} />,
    bono: <GiftOutlined style={{ fontSize: 18, color: '#faad14' }} />,
    tarjetaRegalo: <TagOutlined style={{ fontSize: 18, color: '#fa8c16' }} />,
    notaCredito: <RollbackOutlined style={{ fontSize: 18, color: '#ff4d4f' }} />,
  };

  // Columnas de facturas con filtro tipo Excel
  const facturaColumns = [
    {
      title: 'No. Documento',
      key: 'noDocumento',
      width: 160,
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={data?.facturas || []}
          dataIndex="noDocumento"
          render={(r: any) => r.noDocumento || r.documento || ''}
          placeholder="Buscar documento..."
          filtroKey="noDocumento"
          filtrosActivos={filtrosActivos}
          setFiltrosActivos={setFiltrosActivos}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => filtrosActivos.noDocumento
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
      render: (_: any, record: any) => (
        <Text
          className="paces-doc-link"
          onClick={() => navigate(`/FPV/${record.id}`)}
          style={{ cursor: 'pointer' }}
        >
          {record.noDocumento || record.documento || '-'}
        </Text>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaDocumento',
      key: 'fechaDocumento',
      width: 140,
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroFechaDropdown
          confirm={confirm}
          clearFilters={clearFilters}
          filtroKey="fechaDocumento"
          filtrosActivos={filtrosActivos}
          setFiltrosActivos={setFiltrosActivos}
        />
      ),
      filterIcon: () => filtrosActivos.fechaDocumento
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
      render: (val: string) => <FechaColumnCell fecha={val} />,
    },
    {
      title: 'Entidad/Cliente',
      key: 'cliente',
      width: 250,
      ellipsis: true,
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={data?.facturas || []}
          dataIndex="cliente"
          render={(r: any) => r.cliente?.nombre || ''}
          placeholder="Buscar cliente..."
          filtroKey="cliente"
          filtrosActivos={filtrosActivos}
          setFiltrosActivos={setFiltrosActivos}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => filtrosActivos.cliente
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
      render: (_: any, record: any) => (
        <Text>{record.cliente?.nombre || '-'}</Text>
      ),
    },
    {
      title: 'Pagos',
      key: 'pagos',
      width: 160,
      filterDropdown: ({ confirm, clearFilters }: any) => {
        const metodosSet = new Set<string>();
        (data?.facturas || []).forEach((fac: any) => {
          const pagos = pagosPorFactura[fac.id];
          if (pagos?.metodos?.length) {
            pagos.metodos.forEach((m: any) => metodosSet.add(m.key));
          } else {
            metodosSet.add('sin_pago');
          }
        });
        const options = Array.from(metodosSet).map(key => ({
          label: key === 'sin_pago' ? 'Sin pago' : (METODO_PAGO_LABELS[key] || key),
          value: key,
        }));
        return (
          <div style={{ padding: 8, minWidth: 180 }}>
            <Checkbox.Group
              value={filtrosActivos.pagos?.valor || []}
              onChange={(checkedValues) => {
                setFiltrosActivos(prev => {
                  if (checkedValues.length > 0) {
                    return { ...prev, pagos: { valor: checkedValues as string[] } };
                  }
                  const n = { ...prev };
                  delete n.pagos;
                  return n;
                });
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {options.map(opt => (
                  <Checkbox key={opt.value} value={opt.value}>{opt.label}</Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
              <Button size="small" onClick={() => {
                setFiltrosActivos(prev => { const n = { ...prev }; delete n.pagos; return n; });
                clearFilters?.();
                confirm();
              }}>Limpiar</Button>
              <Button type="primary" size="small" onClick={() => confirm()}>Aceptar</Button>
            </div>
          </div>
        );
      },
      filterIcon: () => filtrosActivos.pagos
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
      render: (_: any, record: any) => {
        const pagos = pagosPorFactura[record.id];
        if (!pagos || pagos.metodos.length === 0) {
          return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
        }
        return (
          <Space size={[2, 0]}>
            {pagos.metodos.map((m) => (
              <Tooltip key={m.key} title={`${METODO_PAGO_LABELS[m.key] || m.label}: ${formatNumber(m.monto)}`}>
                {ICONO_MAP[m.key]}
              </Tooltip>
            ))}
          </Space>
        );
      },
    },
    {
      title: 'Pendiente',
      key: 'pendiente',
      width: 130,
      align: 'right' as const,
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={data?.facturas || []}
          dataIndex="pendiente"
          render={(record: any) => {
            const pagos = pagosPorFactura[record.id];
            const cobrado = pagos?.totalPagado || 0;
            const pendiente = record.total - cobrado;
            return pendiente <= 0.01 ? 'Pagado' : 'Con pendiente';
          }}
          placeholder="Buscar..."
          filtroKey="pendiente"
          filtrosActivos={filtrosActivos}
          setFiltrosActivos={setFiltrosActivos}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => filtrosActivos.pendiente
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
      render: (_: any, record: any) => {
        const pagos = pagosPorFactura[record.id];
        const cobrado = pagos?.totalPagado || 0;
        const pendiente = record.total - cobrado;
        if (pendiente <= 0.01) {
          return <Text style={{ color: '#52c41a' }}>Pagado</Text>;
        }
        return <Text strong style={{ color: '#ff4d4f' }}>{formatNumber(pendiente)}</Text>;
      },
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 140,
      align: 'right' as const,
      render: (val: number) => <Text strong>{formatNumber(val)}</Text>,
    },
  ];

  // Columnas de desglose cobros
  const metodoPagoColumns = [
    {
      title: 'Método de Pago',
      key: 'metodo',
      render: (_: any, record: any) => <Text>{record.metodo}</Text>,
    },
    {
      title: 'Monto',
      key: 'monto',
      align: 'right' as const,
      width: 160,
      render: (_: any, record: any) => <Text strong>{formatNumber(record.monto)}</Text>,
    },
  ];

  const metodosPago = [
    { metodo: 'Efectivo', monto: cobrosTotales.efectivo, key: 'efectivo' },
    { metodo: 'Cheque', monto: cobrosTotales.cheque, key: 'cheque' },
    { metodo: 'Transferencia', monto: cobrosTotales.transferencia, key: 'transferencia' },
    { metodo: 'Tarjeta Crédito', monto: cobrosTotales.tarjetaCredito, key: 'tarjetaCredito' },
    { metodo: 'Tarjeta Débito', monto: cobrosTotales.tarjetaDebito, key: 'tarjetaDebito' },
    { metodo: 'Bono', monto: cobrosTotales.bono, key: 'bono' },
    { metodo: 'Tarjeta Regalo', monto: cobrosTotales.tarjetaRegalo, key: 'tarjetaRegalo' },
    { metodo: 'Nota Crédito', monto: cobrosTotales.notaCredito, key: 'notaCredito' },
  ].filter(m => m.monto !== 0);

  const loading = isLoading;
  const loadingError = isError;

  const documentosFiltrados = React.useMemo(() => {
    let result = data?.facturas || [];

    Object.entries(filtrosActivos).forEach(([key, filtro]) => {
      if (!filtro) return;
      result = result.filter((doc: any) => {
        if (key === 'noDocumento') {
          const val = doc.noDocumento || doc.documento || '';
          return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
        }
        if (key === 'cliente') {
          const val = doc.cliente?.nombre || '';
          return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
        }
        if (key === 'fechaDocumento') {
          const docFecha = doc.fechaDocumento ? new Date(doc.fechaDocumento).getTime() : 0;
          const desde = filtro.value?.[0] ? new Date(filtro.value[0]).getTime() : 0;
          const hasta = filtro.value?.[1] ? new Date(filtro.value[1]).getTime() : Infinity;
          return docFecha >= desde && docFecha <= hasta;
        }
        if (key === 'pagos') {
          const seleccionados: string[] = filtro.valor || [];
          if (seleccionados.length === 0) return true;
          const pagos = pagosPorFactura[doc.id];
          const metodosDoc = pagos?.metodos?.map((m: any) => m.key) || [];
          if (metodosDoc.length === 0 && seleccionados.includes('sin_pago')) return true;
          if (metodosDoc.length > 0) return seleccionados.some((m: string) => metodosDoc.includes(m));
          return false;
        }
        if (key === 'pendiente') {
          const pagos = pagosPorFactura[doc.id];
          const cobrado = pagos?.totalPagado || 0;
          const pendiente = doc.total - cobrado;
          const estado = pendiente <= 0.01 ? 'Pagado' : 'Con pendiente';
          return Array.isArray(filtro.valor) ? filtro.valor.includes(estado) : true;
        }
        return true;
      });
    });

    return result;
  }, [data?.facturas, filtrosActivos]);

  const costosFiltrados = React.useMemo(() => {
    let result = detalles;

    // Apply column filters
    Object.entries(costosFiltrosActivos).forEach(([key, filtro]) => {
      if (!filtro) return;
      result = result.filter((d: DetalleTurnoFila) => {
        if (key === 'codigo') {
          const val = d.codigo || '';
          return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
        }
        if (key === 'articulo') {
          const val = d.articulo || '';
          return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
        }
        return true;
      });
    });

    // Apply text search
    if (costosSearch) {
      const q = costosSearch.toLowerCase();
      result = result.filter((d: DetalleTurnoFila) =>
        (d.codigo?.toLowerCase() || '').includes(q) ||
        (d.articulo?.toLowerCase() || '').includes(q) ||
        (d.referencia?.toLowerCase() || '').includes(q)
      );
    }

    return result;
  }, [costosSearch, detalles, costosFiltrosActivos]);

  const ingresosFiltrados = React.useMemo(() => {
    let result = detalles;

    // Apply column filters
    Object.entries(ingresosFiltrosActivos).forEach(([key, filtro]) => {
      if (!filtro) return;
      result = result.filter((d: DetalleTurnoFila) => {
        if (key === 'codigo') {
          const val = d.codigo || '';
          return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
        }
        if (key === 'articulo') {
          const val = d.articulo || '';
          return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
        }
        if (key === 'impuesto') {
          const val = d.impuesto?.nombre || '';
          return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
        }
        return true;
      });
    });

    // Apply text search
    if (ingresosSearch) {
      const q = ingresosSearch.toLowerCase();
      result = result.filter((d: DetalleTurnoFila) =>
        (d.codigo?.toLowerCase() || '').includes(q) ||
        (d.articulo?.toLowerCase() || '').includes(q) ||
        (d.referencia?.toLowerCase() || '').includes(q)
      );
    }

    return result;
  }, [ingresosSearch, detalles, ingresosFiltrosActivos]);

  // ===== Totales de tablas =====
  interface TotalDocumento { total: number }
  interface TotalCosto { cantidad: number; total: number }
  interface TotalIngreso { cantidad: number; subTotal: number; descuento: number; impuestos: number; total: number }

  const totalesDocumentos = React.useMemo((): TotalDocumento => {
    return documentosFiltrados.reduce<TotalDocumento>(
      (acc, doc) => ({
        total: acc.total + aNumero(doc.total),
      }),
      { total: 0 }
    );
  }, [documentosFiltrados]);

  const totalesCostos = React.useMemo((): TotalCosto => {
    return costosFiltrados.reduce<TotalCosto>(
      (acc, item) => ({
        cantidad: acc.cantidad + aNumero(item.cantidad),
        total: acc.total + aNumero(item.total),
      }),
      { cantidad: 0, total: 0 }
    );
  }, [costosFiltrados]);

  const totalesIngresos = React.useMemo((): TotalIngreso => {
    return ingresosFiltrados.reduce<TotalIngreso>(
      (acc, item) => ({
        cantidad: acc.cantidad + aNumero(item.cantidad),
        subTotal: acc.subTotal + aNumero(item.subTotal),
        descuento: acc.descuento + aNumero(item.descuento),
        impuestos: acc.impuestos + aNumero(item.impuestos),
        total: acc.total + aNumero(item.total),
      }),
      { cantidad: 0, subTotal: 0, descuento: 0, impuestos: 0, total: 0 }
    );
  }, [ingresosFiltrados]);

  if (loading || (!data && !loadingError)) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando detalle del turno...</div>
      </div>
    );
  }

  if (loadingError && !data) {
    return (
      <div>
        <Alert
          message="Error al cargar detalle del turno"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={handleRefresh}>
              Reintentar
            </Button>
          }
        />
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Volver
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const estadoTag = data.cerrado
    ? <Tag color="green">Cerrado</Tag>
    : <Tag color="warning">Abierto</Tag>;

  const contentCard = (
    <Card
      className="paces-card"
      size="small"
      style={{ position: 'sticky', top: 0, background: 'var(--paces-bg-container, #fff)', zIndex: 10 }}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
          <Space>
            {estadoTag}
          </Space>
        </div>
      }
    >
      <Descriptions
        bordered
        size="small"
        column={isLarge ? 3 : 1}
        styles={{ content: { background: 'transparent' } }}
      >
        <Descriptions.Item label="No. Turno">
          {data.noTurno}
        </Descriptions.Item>
        <Descriptions.Item label="Cajero">
          {toTitleCase(data.usuario?.nombre || '')}
        </Descriptions.Item>
        <Descriptions.Item label="POS">
          {data.nombrePOS || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Fecha Apertura">
          {formatDateTime(data.fechaApertura)}
        </Descriptions.Item>
        <Descriptions.Item label="Fecha Cierre">
          {data.fechaCierre ? formatDateTime(data.fechaCierre) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Cerrado">
          <Tag color={data.cerrado ? 'green' : 'default'}>
            {data.cerrado ? 'Sí' : 'No'}
          </Tag>
        </Descriptions.Item>
      </Descriptions>
      <Divider plain style={{ margin: '8px 0', fontSize: 12 }}>Totales</Divider>
      <div style={{ display: 'flex', flexDirection: isLarge ? 'row' : 'column', gap: 16, padding: '0 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1 }}>
          <span className="paces-text-secondary">Total Facturado</span>
          <Text strong>{formatCurrency(total)}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1 }}>
          <span className="paces-text-secondary">Cobrado</span>
          <Text strong style={{ color: '#34c38f' }}>{formatCurrency(cobrado)}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1 }}>
          <span className="paces-text-secondary">Por Cobrar</span>
          <Text strong style={{ color: porCobrar > 0 ? '#f46a6a' : '#595959' }}>
            {formatCurrency(porCobrar)}
          </Text>
        </div>
      </div>
    </Card>
  );

  const costosColumns = [
    {
      title: 'Código',
      key: 'codigo',
      width: 120,
      fixed: 'left' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={detalles}
          dataIndex="codigo"
          placeholder="Buscar código..."
          filtroKey="codigo"
          filtrosActivos={costosFiltrosActivos}
          setFiltrosActivos={setCostosFiltrosActivos}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => costosFiltrosActivos.codigo
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13 }}>
          <div>{record.codigo || '-'}</div>
          {record.referencia && (
            <Tooltip title={record.referencia}>
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                {record.referencia}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Artículo',
      key: 'articulo',
      ellipsis: true,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={detalles}
          dataIndex="articulo"
          placeholder="Buscar artículo..."
          filtroKey="articulo"
          filtrosActivos={costosFiltrosActivos}
          setFiltrosActivos={setCostosFiltrosActivos}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => costosFiltrosActivos.articulo
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13 }}>
          <div>{toTitleCase(record.articulo || '')}</div>
          <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }}>
            {record.familia?.nombre ? <Tag style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>{toTitleCase(record.familia.nombre)}</Tag> : null}
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
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontSize: 13 }}>{formatNumber(record.cantidad || 0)}</div>
          {record.medida?.nombre && (
            <Tooltip title={record.medida.nombre}>
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {record.medida.nombre}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      width: 130,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13 }}>
          <div>{formatNumber(record.costo || 0)}</div>
          {record.medida?.factor && record.medida.factor !== 1 && (
            <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, textAlign: 'right' }}>
              × {record.medida.factor}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top', paddingRight: 16 } }),
      onHeaderCell: () => ({ style: { paddingRight: 16 } }),
      render: (_: any, record: any) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{formatNumber(record.total || 0)}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
  ];

  const ingresosColumns = [
    {
      title: 'Código',
      key: 'codigo',
      width: 120,
      fixed: 'left' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={detalles}
          dataIndex="codigo"
          placeholder="Buscar código..."
          filtroKey="codigo"
          filtrosActivos={ingresosFiltrosActivos}
          setFiltrosActivos={setIngresosFiltrosActivos}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => ingresosFiltrosActivos.codigo
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13 }}>
          <div>{record.codigo || '-'}</div>
          {record.referencia && (
            <Tooltip title={record.referencia}>
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                {record.referencia}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Artículo',
      key: 'articulo',
      ellipsis: true,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={detalles}
          dataIndex="articulo"
          placeholder="Buscar artículo..."
          filtroKey="articulo"
          filtrosActivos={ingresosFiltrosActivos}
          setFiltrosActivos={setIngresosFiltrosActivos}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => ingresosFiltrosActivos.articulo
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13 }}>
          <div>{toTitleCase(record.articulo || '')}</div>
          <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }}>
            {record.familia?.nombre ? <Tag style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>{toTitleCase(record.familia.nombre)}</Tag> : null}
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
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontSize: 13 }}>{formatNumber(record.cantidad || 0)}</div>
          {record.medida?.nombre && (
            <Tooltip title={record.medida.nombre}>
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {record.medida.nombre}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Precio',
      dataIndex: 'precio',
      key: 'precio',
      width: 130,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div style={{ fontSize: 14 }}>
          <div>{formatNumber(record.precio || 0)}</div>
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
    {
      title: 'Impuestos',
      dataIndex: 'impuestos',
      key: 'impuestos',
      width: 180,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={detalles}
          dataIndex="impuesto"
          render={(r: any) => r.impuesto?.nombre || ''}
          placeholder="Buscar impuesto..."
          filtroKey="impuesto"
          filtrosActivos={ingresosFiltrosActivos}
          setFiltrosActivos={setIngresosFiltrosActivos}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => ingresosFiltrosActivos.impuesto
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
      render: (_: any, record: any) => (
        <div style={{ fontSize: 14 }}>
          <div>{formatNumber(record.impuestos || 0)}</div>
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
            {record.impuesto?.nombre || ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Descuentos',
      dataIndex: 'descuento',
      key: 'descuento',
      width: 130,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div style={{ fontSize: 14 }}>
          <div>{formatNumber(record.descuento || 0)}</div>
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top', paddingRight: 16 } }),
      onHeaderCell: () => ({ style: { paddingRight: 16 } }),
      render: (_: any, record: any) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{formatNumber(record.total || 0)}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
  ];

  const nDetalles = detalles.length;

const tabsItems = [
     {
       key: 'resumen',
       label: 'Resumen',
       children: (
         <div>
           <Card className="paces-card" size="small" title={<span style={{ fontSize: 14, fontWeight: 600 }}>Datos Generales</span>}>
             <Descriptions bordered size="small" column={isLarge ? 3 : 1} styles={{ content: { background: 'transparent' } }}>
               <Descriptions.Item label="No. Turno">{data.noTurno}</Descriptions.Item>
               <Descriptions.Item label="Cajero">{toTitleCase(data.usuario?.nombre || '')}</Descriptions.Item>
               <Descriptions.Item label="POS">{data.nombrePOS || '-'}</Descriptions.Item>
               <Descriptions.Item label="Fecha Apertura">{formatDateTime(data.fechaApertura)}</Descriptions.Item>
               <Descriptions.Item label="Fecha Cierre">{data.fechaCierre ? formatDateTime(data.fechaCierre) : '-'}</Descriptions.Item>
               <Descriptions.Item label="Cerrado">
                 <Tag color={data.cerrado ? 'green' : 'default'}>{data.cerrado ? 'Sí' : 'No'}</Tag>
               </Descriptions.Item>
             </Descriptions>
             <Divider plain style={{ margin: '8px 0', fontSize: 12 }}>Totales</Divider>
             <div style={{ display: 'flex', flexDirection: isLarge ? 'row' : 'column', gap: 16, padding: '0 8px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1 }}>
                 <span className="paces-text-secondary" style={{ fontSize: 14 }}>Total Facturado</span>
                 <Text strong style={{ fontSize: 14 }}>{formatCurrency(total)}</Text>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1 }}>
                 <span className="paces-text-secondary" style={{ fontSize: 14 }}>Cobrado</span>
                 <Text strong style={{ color: '#34c38f', fontSize: 14 }}>{formatCurrency(cobrado)}</Text>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1 }}>
                 <span className="paces-text-secondary" style={{ fontSize: 14 }}>Por Cobrar</span>
                 <Text strong style={{ color: porCobrar > 0 ? '#f46a6a' : '#595959', fontSize: 14 }}>
                   {formatCurrency(porCobrar)}
                 </Text>
               </div>
             </div>
           </Card>
         </div>
       ),
     },
     {
       key: 'articulos',
       icon: <InboxOutlined />, label: `Productos/Servicios (${detalles.length})`,
       children: (
         <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
             <Input.Search
               placeholder="Buscar artículo..."
               allowClear
               style={{ width: '100%', maxWidth: 250, flex: '1 1 auto' }}
               onChange={(e) => setArticulosSearch(e.target.value)}
               onSearch={(value) => setArticulosSearch(value)}
             />
             <div style={{ flex: 1 }} />
             <Text type="secondary" style={{ fontSize: 13 }}>
               {detalles.length} artículos
             </Text>
           </div>
           <Table
             dataSource={articulosFiltrados}
             columns={articulosColumns}
             rowKey={(record: any) => `${record.codigo}-${record.id || record.facturaID || ''}`}
             size="middle"
              pagination={{ pageSize: 25, showSizeChanger: false, showTotal: (t: number) => `${t} registros` }}
              scroll={{ x: 1100 }}
              locale={{ emptyText: 'Sin artículos registrados' }}
           />
         </div>
       ),
     },
     {
       key: 'ventas',
       label: `Ventas (${data.facturas?.length || 0})`,
       children: (
         <div>
           <Table
             dataSource={documentosFiltrados}
             columns={facturaColumns}
             rowKey="id"
             rowClassName={(record: any) => {
               const pagos = pagosPorFactura[record.id];
               const cobrado = pagos?.totalPagado || 0;
               const pendiente = record.total - cobrado;
               if (pendiente > 0.01) return 'paces-row-pendiente';
               return '';
             }}
             size="small"
             pagination={{ pageSize: 25, showSizeChanger: false, showTotal: (t: number) => `${t} registros` }}
             scroll={{ x: 1100 }}
             locale={{ emptyText: 'Sin facturas registradas' }}
             summary={() => (
               <Table.Summary fixed="bottom">
                 <Table.Summary.Row style={{ fontWeight: 600, backgroundColor: '#fafafa' }}>
                   <Table.Summary.Cell index={0} colSpan={3}>
                     <Text strong style={{ paddingLeft: 8 }}>Totales</Text>
                   </Table.Summary.Cell>
                   <Table.Summary.Cell index={3} align="right">
                     <Text strong>{formatNumber(totalesDocumentos.total)}</Text>
                   </Table.Summary.Cell>
                 </Table.Summary.Row>
               </Table.Summary>
             )}
           />
         </div>
       ),
     },
     {
       key: 'cobros',
       label: `Cobros (${data.cobros?.length || 0})`,
       children: (
         <div>
           <Table
             dataSource={metodosPago}
             columns={metodoPagoColumns}
             rowKey="key"
             size="small"
             pagination={false}
             style={{ marginBottom: 16 }}
             locale={{ emptyText: 'Sin cobros registrados' }}
           />
           <Card className="paces-card" size="small" title={<span style={{ fontSize: 14, fontWeight: 600 }}>Totales</span>}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                 <span className="paces-text-secondary" style={{ fontSize: 14 }}>Total Facturado</span>
                 <Text strong style={{ fontSize: 14 }}>{formatNumber(total)}</Text>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                 <span className="paces-text-secondary" style={{ fontSize: 14 }}>Cobrado</span>
                 <Text strong style={{ color: '#34c38f', fontSize: 14 }}>{formatNumber(cobrado)}</Text>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                 <span className="paces-text-secondary" style={{ fontSize: 14 }}>Devuelta</span>
                 <Text strong style={{ fontSize: 14 }}>{formatNumber(cobrosTotales.devuelta)}</Text>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                 <span className="paces-text-secondary" style={{ fontSize: 14 }}>Por Cobrar</span>
                 <Text strong style={{ color: porCobrar > 0 ? '#f46a6a' : '#595959', fontSize: 14 }}>
                   {formatNumber(porCobrar)}
                 </Text>
               </div>
             </div>
           </Card>
         </div>
       ),
     },
     {
       key: 'diferencias',
       label: `Diferencias`,
       children: (
         <div>
           <Card
             className="paces-card"
             size="small"
             style={{
               background: porCobrar > 0 ? '#fff7e6' : '#f6ffed',
               border: `1px solid ${porCobrar > 0 ? '#ffd591' : '#b7eb8f'}`,
               borderRadius: 8,
               marginBottom: 16,
             }}
           >
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span style={{ fontSize: 16, fontWeight: 600, color: porCobrar > 0 ? '#d46b08' : '#52c41a' }}>
                 {porCobrar > 0 ? '⚠️ Atención: Diferencia en Caja' : '✅ Caja Equilibrada'}
               </span>
             </div>
             <div style={{ display: 'flex', gap: 32, marginTop: 16, flexWrap: 'wrap' }}>
               <div>
                 <span className="paces-text-secondary" style={{ fontSize: 13 }}>Total Facturado</span>
                 <div style={{ fontSize: 18, fontWeight: 600 }}>{formatCurrency(total)}</div>
               </div>
               <div>
                 <span className="paces-text-secondary" style={{ fontSize: 13 }}>Cobrado</span>
                 <div style={{ fontSize: 18, fontWeight: 600, color: '#34c38f' }}>{formatCurrency(cobrado)}</div>
               </div>
               <div>
                 <span className="paces-text-secondary" style={{ fontSize: 13 }}>Por Cobrar</span>
                 <div style={{ fontSize: 18, fontWeight: 600, color: porCobrar > 0 ? '#f46a6a' : '#595959' }}>
                   {formatCurrency(porCobrar)}
                 </div>
               </div>
               <div>
                 <span className="paces-text-secondary" style={{ fontSize: 13 }}>Devuelta</span>
                 <div style={{ fontSize: 18, fontWeight: 600, color: '#722ed1' }}>{formatCurrency(cobrosTotales.devuelta)}</div>
               </div>
             </div>
           </Card>
           {porCobrar > 0 && (
             <Alert
               message="Existe una diferencia en la caja"
               description={`El turno ${data.noTurno} tiene un saldo pendiente de cobro de ${formatCurrency(porCobrar)}. Verifique los cobros registrados.`}
               type="warning"
               showIcon
               style={{ marginBottom: 16 }}
             />
           )}
           <Card className="paces-card" size="small" title={<span style={{ fontSize: 14, fontWeight: 600 }}>Detalle por Método de Pago</span>}>
             <Table
               dataSource={metodosPago}
               columns={metodoPagoColumns}
               rowKey="key"
               size="small"
               pagination={false}
               locale={{ emptyText: 'Sin cobros registrados' }}
             />
           </Card>
         </div>
       ),
     },
   ];

  return (
    <div>
      <style>{`
  .paces-row-pendiente {
    background-color: #fff1f0 !important;
  }
  .paces-row-pendiente:hover td {
    background-color: #ffccc7 !important;
  }
`}</style>
      {loadingError && (
        <Alert
          message="Error al cargar detalle del turno"
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

      <DetalleToolbar
        modulo="FTURNOS"
        estado={data.cerrado ? 1 : 0}
        periodo={data.periodo ?? 0}
        saving={posteando}
        onVolver={() => navigate(-1)}
        onPostear={handlePostear}
        extraButtons={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} disabled={procesandoTurno} />
            <PermissionGate codigoPantalla="FTURNOS" accion="IMPRIMIR">
              <Dropdown.Button
                icon={<PrinterOutlined />}
                loading={imprimiendo}
                disabled={procesandoTurno}
                onClick={() => handleImprimir('ticket')}
                menu={{ items: itemsImpresion, onClick: (e) => handleImprimir(e.key as OpcionImpresion) }}
              >
                Ticket Cierre
              </Dropdown.Button>
            </PermissionGate>
          </Space>
        }
      />

      <div>
        <Tabs defaultActiveKey="resumen" type="card" items={tabsItems} />
      </div>
    </div>
  );
};

export default TurnoDetalle;
