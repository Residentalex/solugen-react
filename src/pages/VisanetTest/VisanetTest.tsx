import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, InputNumber, Select, Modal, Tag, Typography, Space, Row, Col, Alert, Table, Drawer, Tabs, message, DatePicker } from 'antd';
import { ArrowLeftOutlined, CopyOutlined, PrinterOutlined, CreditCardOutlined, StopOutlined, FolderOpenOutlined, FileExcelOutlined, ReloadOutlined, CodeOutlined, HeartOutlined, IdcardOutlined, ReadOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { getCompanyName, exportToExcel } from '../../utils/exportToExcel';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { useCompanyStore } from '../../stores/companyStore';
import { visanetApi } from '../../api/visanetApi';
import type {
  VisanetCierrePruebaRespuestaDTO,
  VisanetResponseDTO,
  VisanetVoucherDTO,
  VisanetVoucherInputDTO,
} from '../../types/visanet';
import VisanetVoucher from '../../components/VisanetVoucher';
import { reportesConfigApi } from '../../api/reportesConfigApi';
import { companiaApi } from '../../api/companiaApi';
import { CODIGO_PLANTILLA_VSNT_VOUCHER, CODIGO_PLANTILLA_VSNT_ANULACION, CODIGO_PLANTILLA_VSNT_CIERRE } from '../../utils/ticketPlantilla';
import { formatTicketVoucherVisanet } from '../../utils/escpos-formatter';
import { escposToHtml } from '../../utils/escposToHtml';
import dayjs from 'dayjs';

const caracteresHtml: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
};

const escaparHtml = (valor: unknown): string =>
  String(valor ?? '').replace(/[&<>"']/g, (caracter) => caracteresHtml[caracter] ?? caracter);

const ESTILOS_COMPROBANTE_CIERRE_VISANET = `
  .comprobante-cierre-visanet {
    width: 80mm;
    min-height: 1px;
    padding: 4mm 4mm 6mm;
    box-sizing: border-box;
    background: #fff;
    color: #1f1f1f;
    font-family: "Courier New", monospace;
    font-size: 11px;
    line-height: 1.4;
  }
  .comprobante-cierre-visanet * { box-sizing: border-box; }
  .comprobante-cierre-visanet .encabezado { text-align: center; margin-bottom: 12px; }
  .comprobante-cierre-visanet h1 { margin: 0 0 3px; font-size: 15px; }
  .comprobante-cierre-visanet .empresa { font-weight: 700; }
  .comprobante-cierre-visanet .grupo { margin-top: 13px; break-inside: avoid; }
  .comprobante-cierre-visanet .fila-meta,
  .comprobante-cierre-visanet .movimiento-cabecera,
  .comprobante-cierre-visanet .movimiento-pie,
  .comprobante-cierre-visanet .fila-total { display: flex; justify-content: space-between; gap: 8px; }
  .comprobante-cierre-visanet .separador { border-top: 1px dashed #444; margin: 7px 0; }
  .comprobante-cierre-visanet .movimiento { margin: 6px 0; }
  .comprobante-cierre-visanet .movimiento-detalle { color: #444; overflow-wrap: anywhere; }
  .comprobante-cierre-visanet .anulacion { font-weight: 700; }
  .comprobante-cierre-visanet .resumen { margin-top: 16px; }
  .comprobante-cierre-visanet .fila-total { padding: 2px 0; }
  .comprobante-cierre-visanet .neto { font-size: 13px; font-weight: 700; border-top: 1px dashed #444; margin-top: 5px; padding-top: 5px; }
  .comprobante-cierre-visanet .pie { margin-top: 18px; text-align: center; font-weight: 700; }
`;

const { Title, Text } = Typography;

const SUBSIDIO_OPCIONES = [
  { label: 'COMER ES PRIMERO', value: ' ' },
  { label: 'ENVEJECIENTES', value: 'E' },
  { label: 'BONO ESCOLAR', value: 'F' },
  { label: 'ILAE', value: 'G' },
  { label: 'ESTUDIANTES', value: 'B' },
  { label: 'PIPP', value: 'D' },
  { label: 'BONOGAS HOGAR', value: 'C' },
  { label: 'BONOGAS CHOFER', value: 'H' },
  { label: 'MEDICINA', value: 'A' },
  { label: 'BONO LUZ', value: 'I' },
  { label: 'OPORTUNIDAD 14/24', value: 'O' },
  { label: 'TRANSFORMANDO MI PAIS', value: 'T' },
  { label: 'MOTOBEN', value: 'M' },
];

const SUBSIDIO_MONTOS: Record<string, number> = {
  ' ': 1650,   // COMER ES PRIMERO
  'E': 400,    // ENVEJECIENTES
  'F': 300,    // BONO ESCOLAR
};

const SUBSIDIO_NOMBRES: Record<string, string> = {
  ' ': 'COMER ES PRIMERO',
  'G': 'ILAE',
  'B': 'ESTUDIANTES',
  'E': 'ENVEJECIENTES',
  'D': 'PIPP',
  'C': 'BONOGAS HOGAR',
  'H': 'BONOGAS CHOFER',
  'A': 'MEDICINA',
  'I': 'BONO LUZ',
  'F': 'BONO ESCOLAR',
  'O': 'OPORTUNIDAD 14/24',
  'T': 'TRANSFORMANDO MI PAIS',
  'M': 'MOTOBEN',
};

/**
 * Asegura que la respuesta traiga fecha de transacción para imprimir el voucher:
 * si el POS no la devolvió, una venta fresca es de hoy. Se usa mediodía local
 * (T12:00:00) para que formatFechaCorta no corra el día por zona horaria (UTC-4).
 */
const conFechaTransaccion = (res: VisanetResponseDTO): VisanetResponseDTO => {
  if (res.transactionDate) return res;
  const hoy = new Date();
  return {
    ...res,
    transactionDate: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}T12:00:00`,
  };
};

/** Tipo de operación que determina la plantilla y el label del voucher. */
type TipoOpVoucher = 'venta' | 'subsidio' | 'anulacion' | 'cierre';

const CODIGO_PLANTILLA_POR_OP: Record<TipoOpVoucher, string> = {
  venta: CODIGO_PLANTILLA_VSNT_VOUCHER,
  subsidio: CODIGO_PLANTILLA_VSNT_VOUCHER,
  anulacion: CODIGO_PLANTILLA_VSNT_ANULACION,
  cierre: CODIGO_PLANTILLA_VSNT_CIERRE,
};

const labelOperacionVoucher = (tipoOp: TipoOpVoucher, subsidyIdParam?: string): string => {
  if (tipoOp === 'anulacion') return 'ANULACION';
  if (tipoOp === 'cierre') return 'CIERRE DE LOTE';
  if (tipoOp === 'venta') return 'VENTA';
  return SUBSIDIO_NOMBRES[subsidyIdParam ?? ''] || 'SUBSIDIO';
};

/**
 * Convierte la respuesta cruda del cierre de lote (string JSON del terminal)
 * al shape que espera la plantilla VSNT_CIERRE. Las claves del terminal
 * (batchNumber, merchantId, transactionDate, etc.) coinciden con el DTO.
 * Si el terminal no devolvió JSON válido, se conserva el texto como mensaje.
 */
const parseCierre = (raw: string): VisanetResponseDTO => {
  try {
    const datos = JSON.parse(raw);
    return { exitoso: true, ...(datos && typeof datos === 'object' ? datos : {}) };
  } catch {
    return { exitoso: true, mensajeRespuesta: raw };
  }
};

/** Representa los bytes de control del ESC/POS de forma legible (visor crudo). */
const escposCrudoVisible = (raw: string): string => raw
  .replace(/\x1B/g, '<ESC>')
  .replace(/\x1D/g, '<GS>')
  .replace(/\x0C/g, '<FF>')
  .replace(/[\x00-\x08\x0B\x0E-\x1F\x7F]/g, (c) => `<#${c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()}>`);

const VisanetTest: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  // Estado de carga y resultado
  const [loading, setLoading] = useState<string | null>(null);
  const [resultado, setResultado] = useState<VisanetResponseDTO | string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Última venta ejecutada (se conserva para imprimir el voucher)
  const [montoPesos, setMontoPesos] = useState<number | null>(null);
  const [tokenECR, setTokenECR] = useState<string>('');

  // Campos Subsidio
  const [subsidioMontoPesos, setSubsidioMontoPesos] = useState<number | null>(null);
  const [subsidyId, setSubsidyId] = useState<string>('');
  // Subsidio seleccionado en el listado (pendiente de confirmación)
  const [subsidioConfirmacion, setSubsidioConfirmacion] = useState<{ subsidyId: string; montoPesos: number } | null>(null);

  // Modales de operación
  const [venderModalOpen, setVenderModalOpen] = useState(false);
  const [venderMonto, setVenderMonto] = useState<number | null>(null);
  const [venderTokenECR, setVenderTokenECR] = useState<string>('');

  const [anularModalOpen, setAnularModalOpen] = useState(false);
  const [anularTokenId, setAnularTokenId] = useState<string>('');

  const [cerrarLoteModalOpen, setCerrarLoteModalOpen] = useState(false);
  const [cierrePruebaModalOpen, setCierrePruebaModalOpen] = useState(false);
  const [jsonCierrePrueba, setJsonCierrePrueba] = useState('');
  const [vistaCierrePruebaOpen, setVistaCierrePruebaOpen] = useState(false);
  const [contenidoCierrePrueba, setContenidoCierrePrueba] = useState('');
  const [exportandoCierrePrueba, setExportandoCierrePrueba] = useState(false);
  const comprobanteCierrePruebaRef = useRef<HTMLDivElement>(null);

  // Tipo de la última operación ejecutada (define plantilla y label del voucher)
  const [tipoResultado, setTipoResultado] = useState<TipoOpVoucher>('venta');

  // Modal Visualizar ESC/POS
  const [escposModalOpen, setEscposModalOpen] = useState(false);
  const [escposContenido, setEscposContenido] = useState<{
    titulo: string; raw: string; html: string; anchoLinea: number; fontFamily?: string;
  } | null>(null);

  // Drawer de JSON de respuesta (soporte)
  const [jsonDrawerOpen, setJsonDrawerOpen] = useState(false);

  // Registros del día (vouchers)
  const [vouchers, setVouchers] = useState<VisanetVoucherDTO[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [generandoCierre, setGenerandoCierre] = useState(false);
  const [fechaFiltro, setFechaFiltro] = useState<dayjs.Dayjs | null>(dayjs());

  // Estado del modal voucher
  const [voucherVisible, setVoucherVisible] = useState(false);

  // Datos de empresa
  const companyStore = useCompanyStore();
  const [companyName, setCompanyName] = useState('');
  const [sucursalName, setSucursalName] = useState('');
  const [simMoneda, setSimMoneda] = useState('RD$');
  const [tipoOperacion, setTipoOperacion] = useState<'venta' | 'subsidio'>('venta');

  // Obtener datos de empresa al iniciar
  useEffect(() => {
    getCompanyName(sucursalActiva).then(setCompanyName);
    setSimMoneda(getMonedaSucursalActiva().simbolo);
    const suc = companyStore.data.sucursales.find((s: any) => s.sucursal === sucursalActiva);
    setSucursalName(suc?.nombre || '');
  }, [sucursalActiva]);

  // Carga los vouchers del día (GET /visanet/{sucursal}/vouchers-dia?fecha=yyyy-MM-dd)
  const cargarVouchersDelDia = useCallback(async (fecha?: dayjs.Dayjs) => {
    setVouchersLoading(true);
    try {
      const fechaParam = fecha ? fecha.format('YYYY-MM-DD') : undefined;
      const data = await visanetApi.obtenerVouchersDelDia(sucursalActiva, fechaParam);
      setVouchers(data || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar los vouchers');
    } finally {
      setVouchersLoading(false);
    }
  }, [sucursalActiva]);

  // Cargar registros del día al montar
  useEffect(() => {
    cargarVouchersDelDia(dayjs());
  }, [cargarVouchersDelDia]);

  // Handlers
  const ejecutarVenta = async (montoPesosParam: number, tokenECRParam?: string) => {
    setLoading('vender');
    setError(null);
    setResultado(null);
    try {
      if (!montoPesosParam || montoPesosParam <= 0) {
        setError('Ingresa un monto válido mayor a 0');
        return;
      }
      const res = conFechaTransaccion(await visanetApi.vender(sucursalActiva, 0, montoPesosParam, tokenECRParam || undefined));
      setResultado(res);
      setTipoOperacion('venta');
      setTipoResultado('venta');
      setMontoPesos(montoPesosParam);
      setTokenECR(tokenECRParam || '');
      await cargarVouchersDelDia(dayjs());
      if (res?.exitoso) {
        imprimirVoucherConDatos('venta', res, montoPesosParam);
      }
    } catch (err: any) {
      setError(err?.response?.data?.errorMessage || err.message || 'Error al vender');
    } finally {
      setLoading(null);
    }
  };

  // Genera un comprobante desde la respuesta CLOSE ya recibida de Visanet.
  const handleVisualizarCierrePrueba = async () => {
    let cierre: VisanetCierrePruebaRespuestaDTO;
    try {
      cierre = JSON.parse(jsonCierrePrueba) as VisanetCierrePruebaRespuestaDTO;
    } catch {
      message.error('El contenido no es un JSON valido.');
      return;
    }

    const adquirentes = (cierre.acquirers ?? []).filter(
      (adquirente) => Array.isArray(adquirente.data) && adquirente.data.length > 0,
    );
    if (!adquirentes.length) {
      message.warning('El JSON no contiene transacciones de cierre para visualizar.');
      return;
    }

    setGenerandoCierre(true);

    try {
      const sucursal = companyStore.data.sucursales.find((item: any) => item.sucursal === sucursalActiva);
      let companiaInfo = {
        nombre: sucursal?.nombre || sucursalName || '',
        direccion: sucursal?.direccion || '',
        telefono: sucursal?.telefono || '',
        fax: sucursal?.fax || '',
        rnc: sucursal?.rnc || '',
      };

      try {
        const compania = await companiaApi.obtenerActiva(sucursalActiva);
        if (compania?.nombre) {
          companiaInfo = {
            nombre: compania.nombre || companiaInfo.nombre,
            direccion: compania.direccion || companiaInfo.direccion,
            telefono: compania.telefono || companiaInfo.telefono,
            fax: compania.fax || companiaInfo.fax,
            rnc: compania.rnc || companiaInfo.rnc,
          };
        }
      } catch {
        // Se usan los datos de la sucursal si no se puede consultar la compania.
      }

      let totalVentas = 0;
      let totalAnulaciones = 0;
      let cantidadVentas = 0;
      let cantidadAnulaciones = 0;

      const detalleAdquirentes = adquirentes.map((adquirente) => {
        const transacciones = adquirente.data ?? [];
        const primera = transacciones[0];
        const host = primera?.acquirerName || `HOST ${adquirente.processingHost ?? ''}`;
        const lote = primera?.batchNumber || adquirente.batchNumber || '';
        const movimientos = transacciones.map((transaccion) => {
          const monto = Math.abs(Number(transaccion.totalAmount) || 0);
          const esAnulacion =
            transaccion.transactionName?.toUpperCase().includes('VOID') ||
            Number(transaccion.totalAmount) < 0;

          if (esAnulacion) {
            totalAnulaciones += monto;
            cantidadAnulaciones += 1;
          } else {
            totalVentas += monto;
            cantidadVentas += 1;
          }

          const fecha = transaccion.transactionDate || transaccion.datetime?.split(' ')[0] || '';
          const hora = transaccion.transactionTime || transaccion.datetime?.split(' ').slice(1).join(' ') || '';
          const referencia = transaccion.approval || transaccion.authorization || transaccion.rrn || 'SIN REF.';

          return `
            <div class="movimiento ${esAnulacion ? 'anulacion' : ''}">
              <div class="movimiento-cabecera"><span>REF.: ${escaparHtml(referencia)}</span><span>${escaparHtml(host)}</span></div>
              <div class="movimiento-detalle">TARJETA: ${escaparHtml(transaccion.pan || '')}</div>
              <div class="movimiento-pie"><span>FECHA: ${escaparHtml(fecha)}${hora ? ' ' + escaparHtml(hora) : ''}</span><span>${escaparHtml(simMoneda)} ${(esAnulacion ? -monto : monto).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
              <div>${esAnulacion ? 'VENTA ANULADA' : 'VENTA NORMAL'}</div>
            </div>`;
        }).join('<div class="separador"></div>');

        return `<section class="grupo">
          <div class="fila-meta"><strong>HOST: ${escaparHtml(host)}</strong><strong>LOTE: ${escaparHtml(lote)}</strong></div>
          <div class="separador"></div>${movimientos}
        </section>`;
      }).join('');

      const totalNeto = totalVentas - totalAnulaciones;
      const cantidadTotal = cantidadVentas - cantidadAnulaciones;
      const formatoMonto = (monto: number) =>
        `${escaparHtml(simMoneda)} ${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      setContenidoCierrePrueba(`
        <header class="encabezado">
          ${companiaInfo.nombre ? `<div class="empresa">${escaparHtml(companiaInfo.nombre)}</div>` : ''}
          ${companiaInfo.direccion ? `<div>${escaparHtml(companiaInfo.direccion)}</div>` : ''}
          ${companiaInfo.telefono || companiaInfo.fax ? `<div>Tel.: ${escaparHtml(companiaInfo.telefono)}${companiaInfo.telefono && companiaInfo.fax ? ' &nbsp; ' : ''}${companiaInfo.fax ? `Fax: ${escaparHtml(companiaInfo.fax)}` : ''}</div>` : ''}
          ${companiaInfo.rnc ? `<div>RNC: ${escaparHtml(companiaInfo.rnc)}</div>` : ''}
          <h1>CIERRE PORTAL</h1>
          <div>${escaparHtml(cierre.responseMessage || '')}</div>
        </header>
        ${detalleAdquirentes}
        <section class="resumen">
          <div class="separador"></div>
          <div class="fila-total"><span>Ventas: ${cantidadVentas}</span><strong>${formatoMonto(totalVentas)}</strong></div>
          <div class="fila-total"><span>Anulaciones: ${cantidadAnulaciones}</span><strong>${formatoMonto(-totalAnulaciones)}</strong></div>
          <div class="fila-total neto"><span>Total: ${cantidadTotal}</span><strong>${formatoMonto(totalNeto)}</strong></div>
        </section>
        <footer class="pie">** CIERRE COMPLETO **</footer>
      `);
      setCierrePruebaModalOpen(false);
      setVistaCierrePruebaOpen(true);
    } catch {
      message.error('No fue posible generar el comprobante.');
    } finally {
      setGenerandoCierre(false);
    }
  };

  const capturarCierrePrueba = async () => {
    const comprobante = comprobanteCierrePruebaRef.current;
    if (!comprobante) {
      message.error('No se encontro el comprobante para exportar.');
      return null;
    }

    const { default: html2canvas } = await import('html2canvas');
    return html2canvas(comprobante, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      width: comprobante.scrollWidth,
      height: comprobante.scrollHeight,
      windowWidth: comprobante.scrollWidth,
      windowHeight: comprobante.scrollHeight,
    });
  };

  const handleGuardarCierrePruebaPdf = async () => {
    setExportandoCierrePrueba(true);
    try {
      const lienzo = await capturarCierrePrueba();
      if (!lienzo) return;

      const { jsPDF } = await import('jspdf');
      const anchoMm = 80;
      const altoMm = (lienzo.height / lienzo.width) * anchoMm;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [anchoMm, altoMm] as [number, number],
        compress: true,
      });
      pdf.addImage(lienzo.toDataURL('image/png'), 'PNG', 0, 0, anchoMm, altoMm, undefined, 'FAST');

      const url = URL.createObjectURL(pdf.output('blob'));
      const ventanaPdf = window.open(url, '_blank');
      if (!ventanaPdf) {
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = 'cierre-visanet.pdf';
        enlace.click();
        message.warning('El navegador bloqueo la nueva pestana; se descargo el PDF.');
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      console.error('No fue posible generar el PDF de cierre Visanet.', error);
      message.error('No fue posible generar el PDF del cierre.');
    } finally {
      setExportandoCierrePrueba(false);
    }
  };

  const handleDescargarCierrePruebaPng = async () => {
    setExportandoCierrePrueba(true);
    try {
      const lienzo = await capturarCierrePrueba();
      if (!lienzo) return;

      const blob = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, 'image/png'));
      if (!blob) throw new Error('No se pudo crear la imagen del comprobante.');

      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'cierre-visanet.png';
      enlace.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (error) {
      console.error('No fue posible generar la imagen de cierre Visanet.', error);
      message.error('No fue posible descargar la imagen del cierre.');
    } finally {
      setExportandoCierrePrueba(false);
    }
  };

  const confirmarVentaModal = async () => {
    if (!venderMonto || venderMonto <= 0) {
      message.warning('Ingresa un monto válido mayor a 0');
      return;
    }
    setVenderModalOpen(false);
    await ejecutarVenta(venderMonto, venderTokenECR || undefined);
  };

  const ejecutarVentaSubsidio = async (subsidyIdParam: string, montoPesosParam: number) => {
    setLoading('subsidio');
    setError(null);
    setResultado(null);
    try {
      if (!montoPesosParam || montoPesosParam <= 0) {
        setError('Ingresa un monto válido mayor a 0');
        return;
      }
      const res = conFechaTransaccion(await visanetApi.venderSubsidio(sucursalActiva, 0, montoPesosParam, subsidyIdParam));
      setResultado(res);
      setTipoOperacion('subsidio');
      setTipoResultado('subsidio');
      await cargarVouchersDelDia(dayjs());
      if (res?.exitoso) {
        imprimirVoucherConDatos('subsidio', res, montoPesosParam, subsidyIdParam);
      }
    } catch (err: any) {
      setError(err?.response?.data?.errorMessage || err.message || 'Error al vender con subsidio');
    } finally {
      setLoading(null);
    }
  };

  const handleVenderSubsidio = async () => {
    await ejecutarVentaSubsidio(subsidyId, subsidioMontoPesos ?? 0);
  };

  const ejecutarAnulacion = async (tokenIdParam: string) => {
    setLoading('anular');
    setError(null);
    setResultado(null);
    try {
      const res = await visanetApi.anular(sucursalActiva, tokenIdParam);
      setResultado(res);
      setTipoResultado('anulacion');
      await cargarVouchersDelDia(dayjs());
      if (res?.exitoso) {
        // Imprime el voucher de anulación con su plantilla (VSNT_ANULACION)
        await imprimirVoucherConDatos('anulacion', conFechaTransaccion(res), Number(res.totalAmount) || 0);
      }
    } catch (err: any) {
      setError(err?.response?.data?.errorMessage || err.message || 'Error al anular');
    } finally {
      setLoading(null);
    }
  };

  const confirmarAnularModal = async () => {
    const token = anularTokenId.trim();
    if (!token) {
      message.warning('Ingresa el TokenId a anular');
      return;
    }
    setAnularModalOpen(false);
    await ejecutarAnulacion(token);
  };

  const confirmarCerrarLoteModal = async () => {
    setCerrarLoteModalOpen(false);
    setLoading('cerrar');
    setError(null);
    setResultado(null);
    try {
      const res = await visanetApi.cerrarLote(sucursalActiva);
      setResultado(res);
      setTipoResultado('cierre');
      await cargarVouchersDelDia(dayjs());
      // Imprime el comprobante de cierre de lote con su plantilla (VSNT_CIERRE)
      await imprimirVoucherConDatos('cierre', parseCierre(res), 0);
    } catch (err: any) {
      setError(err?.response?.data?.errorMessage || err.message || 'Error al cerrar lote');
    } finally {
      setLoading(null);
    }
  };

  // Prepara plantilla, compañía y datos del voucher según el tipo de operación.
  const prepararDatosVoucher = async (
    tipoOp: TipoOpVoucher,
    resultadoVenta: VisanetResponseDTO,
    monto: number,
    subsidyIdParam?: string
  ) => {
    // 1. Obtener plantilla según la operación (venta/subsidio → VOUCHER,
    //    anulación → ANULACION, cierre de lote → CIERRE)
    const codigoPlantilla = CODIGO_PLANTILLA_POR_OP[tipoOp];
    const plantilla = await reportesConfigApi.obtenerPorCodigo(codigoPlantilla);
    if (!plantilla) {
      message.error(`No hay plantilla ESC/POS asignada para ${codigoPlantilla}.`);
      return null;
    }

    // 2. Info de la compañía. El nombre comercial vive en parametros.descripcion
    //    (ej: 'Almacenes del Este, S. A. [Orense Plaza]') y lo expone
    //    /Compania/activa; si falla, se usan los datos de la sucursal.
    const suc = companyStore.data.sucursales.find((s: any) => s.sucursal === sucursalActiva);
    let companyInfo = {
      nombre: suc?.nombre || '',
      direccion: suc?.direccion || '',
      telefono: suc?.telefono || '',
      rnc: suc?.rnc || '',
      fax: suc?.fax || '',
      slogan: suc?.slogan || '',
    };
    try {
      const compania = await companiaApi.obtenerActiva(sucursalActiva);
      if (compania?.nombre) {
        companyInfo = {
          nombre: compania.nombre,
          direccion: compania.direccion || companyInfo.direccion,
          telefono: compania.telefono || companyInfo.telefono,
          rnc: compania.rnc || companyInfo.rnc,
          fax: compania.fax || companyInfo.fax,
          slogan: compania.slogan || companyInfo.slogan,
        };
      }
    } catch {
      // Sin respuesta del servicio de compañía: se conservan los datos de la sucursal.
    }

    // 3. Data del voucher para el template
    const dataVoucher: VisanetVoucherInputDTO = {
      ...resultadoVenta,
      montoPesos: monto,
      simMoneda,
      sucursalName,
      subsidioLabel: labelOperacionVoucher(tipoOp, subsidyIdParam),
    };

    return { plantilla, companyInfo, dataVoucher };
  };

  // Imprime el voucher usando el servicio standalone Solugen.Impresion.Service (igual que /FPV).
  // La plantilla depende del tipo de operación (venta/subsidio/anulación/cierre).
  const imprimirVoucherConDatos = async (
    tipoOp: TipoOpVoucher,
    resultadoVenta: VisanetResponseDTO,
    monto: number,
    subsidyIdParam?: string
  ) => {
    try {
      const prep = await prepararDatosVoucher(tipoOp, resultadoVenta, monto, subsidyIdParam);
      if (!prep) return;

      // 4. Payload para el servicio de impresion
      const payload = await reportesConfigApi.obtenerPayloadImpresion(prep.plantilla.plantillaId, {
        tipoDoc: 'TICKET_VSNT',
        data: prep.dataVoucher,
        company: prep.companyInfo,
        feedLines: 3,
        cut: true,
        copias: 1,
      });

      // 5. Enviar al servicio standalone (mismo flujo que /FPV)
      const servicioLocalUrl = import.meta.env.VITE_IMPRESSION_SERVICE_URL || 'http://localhost:5010/imprimir';
      const resultado = await reportesConfigApi.imprimirLocal(payload, servicioLocalUrl);
      if (resultado.ok) {
        message.success('Voucher enviado a la impresora');
      } else {
        message.error(resultado.error ?? 'Error al imprimir: el servicio local no respondió');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || err?.response?.data?.ErrorMessage || 'Error al imprimir el voucher';
      message.error(msg);
    }
  };

  // Visualiza EXACTAMENTE el ESC/POS que se enviaría a la impresora: se renderiza
  // con el mismo formateador TypeScript que ejecuta el servicio local, usando la
  // config guardada de la plantilla.
  const visualizarVoucher = async (
    tipoOp: TipoOpVoucher,
    resultadoVenta: VisanetResponseDTO,
    monto: number,
    subsidyIdParam?: string
  ) => {
    try {
      const prep = await prepararDatosVoucher(tipoOp, resultadoVenta, monto, subsidyIdParam);
      if (!prep) return;
      const raw = formatTicketVoucherVisanet(prep.dataVoucher, prep.companyInfo, prep.plantilla.config ?? undefined);
      setEscposContenido({
        titulo: `ESC/POS — ${labelOperacionVoucher(tipoOp, subsidyIdParam)}`,
        raw,
        html: escposToHtml(raw),
        anchoLinea: prep.plantilla.config?.opciones?.anchoLinea ?? 42,
        fontFamily: prep.plantilla.config?.opciones?.fontFamily,
      });
      setEscposModalOpen(true);
    } catch (err: any) {
      message.error(err?.message || 'Error al generar la vista ESC/POS');
    }
  };

  // Resuelve el tipo de operación, la respuesta y el monto del resultado actual
  // (venta/subsidio/anulación → objeto; cierre de lote → string crudo del terminal).
  const resolverContextoResultado = (): { tipoOp: TipoOpVoucher; res: VisanetResponseDTO; monto: number } | null => {
    if (!resultado) return null;
    if (typeof resultado === 'string') {
      return { tipoOp: 'cierre', res: parseCierre(resultado), monto: 0 };
    }
    const monto = tipoResultado === 'venta'
      ? (montoPesos || 0)
      : tipoResultado === 'subsidio'
        ? (subsidioMontoPesos || 0)
        : Number(resultado.totalAmount) || 0;
    return { tipoOp: tipoResultado, res: resultado, monto };
  };

  // Botón manual "Imprimir": wrapper que usa el estado actual.
  const handlePrint = async () => {
    const ctx = resolverContextoResultado();
    if (!ctx) return;
    await imprimirVoucherConDatos(ctx.tipoOp, ctx.res, ctx.monto, subsidyId);
  };

  // Botón "Visualizar ESC/POS": muestra el ESC/POS exacto del resultado actual.
  const handleVisualizar = async () => {
    const ctx = resolverContextoResultado();
    if (!ctx) return;
    await visualizarVoucher(ctx.tipoOp, ctx.res, ctx.monto, subsidyId);
  };

  const handleCopiarEscPos = () => {
    if (!escposContenido) return;
    navigator.clipboard.writeText(escposCrudoVisible(escposContenido.raw));
    message.success('ESC/POS copiado al portapapeles');
  };

  // Texto JSON para soporte. Para el cierre de lote el resultado es la respuesta
  // cruda del terminal (string): si es JSON válido se muestra formateado.
  const jsonSoporteTexto = (): string => {
    if (typeof resultado === 'string') {
      try {
        return JSON.stringify(JSON.parse(resultado), null, 2);
      } catch {
        return resultado;
      }
    }
    return JSON.stringify(resultado, null, 2);
  };

  const handleCopiarJson = () => {
    navigator.clipboard.writeText(jsonSoporteTexto());
    message.success('JSON copiado al portapapeles');
  };

  const subsidioLabel = tipoOperacion === 'venta' ? 'VENTA' : (SUBSIDIO_NOMBRES[subsidyId] || 'SUBSIDIO');

  // Reconstruye la respuesta del terminal a partir del registro del día
  // (la tabla VOUCHERS no guarda el JSON original).
  const reconstruirRespuestaDeRecord = (record: VisanetVoucherDTO): { res: VisanetResponseDTO; monto: number } => {
    // La fecha de la transacción viene codificada en el prefijo del NOSEC
    // (VN{yyMMdd}-...) porque la tabla VOUCHERS no tiene columna de fecha.
    // Se envía con T12:00:00 (mediodía local) para que new Date() no la
    // interprete como medianoche UTC y muestre el día anterior en UTC-4.
    const matchFecha = /^VN(\d{2})(\d{2})(\d{2})-/.exec(record.noSec || '');
    const transactionDate = matchFecha ? `20${matchFecha[1]}-${matchFecha[2]}-${matchFecha[3]}T12:00:00` : undefined;
    const res: VisanetResponseDTO = {
      // La operación fue aprobada (el voucher está en el listado; si está
      // anulado es porque la anulación también lo fue).
      exitoso: true,
      autorizacion: record.noAprob,
      tokenId: record.tokenId,
      totalAmount: record.monto?.toFixed(2),
      panMasked: record.notarjeta,
      stan: String(record.noSec),
      rrn: record.rrn,
      batchNumber: record.noLote,
      issuerName: record.tipoTC,
      cardHolderName: record.nombtar,
      transactionDate,
    };
    return { res, monto: record.monto ?? 0 };
  };

  // Tipo de operación para reimprimir/visualizar un registro del día:
  // un voucher anulado se reimprime como comprobante de ANULACIÓN (VSNT_ANULACION).
  const tipoOpDeRecord = (record: VisanetVoucherDTO): TipoOpVoucher =>
    record.anulado === 'S' ? 'anulacion' : 'venta';

  // Reimprimir voucher desde la tabla de registros del día
  const handleReimprimir = async (record: VisanetVoucherDTO) => {
    const { res, monto } = reconstruirRespuestaDeRecord(record);
    await imprimirVoucherConDatos(tipoOpDeRecord(record), res, monto);
  };

  // Visualizar el voucher de un registro del día sin imprimirlo
  const handleVisualizarReimpresion = async (record: VisanetVoucherDTO) => {
    const { res, monto } = reconstruirRespuestaDeRecord(record);
    await visualizarVoucher(tipoOpDeRecord(record), res, monto);
  };

  // Columnas de la tabla de registros del día
  const columnasVouchers: ColumnsType<VisanetVoucherDTO> = [
    {
      title: 'NOSEC',
      dataIndex: 'noSec',
      key: 'noSec',
      width: 80,
      render: (noSec: number, record: VisanetVoucherDTO) => (
        <span style={record.anulado === 'S' ? { textDecoration: 'line-through' } : undefined}>{noSec}</span>
      ),
    },
    { title: 'Token ID', dataIndex: 'tokenId', key: 'tokenId', width: 150 },
    {
      title: 'Monto',
      dataIndex: 'monto',
      key: 'monto',
      width: 130,
      align: 'right',
      render: (monto: number) => (monto != null ? `${simMoneda} ${monto.toFixed(2)}` : '-'),
    },
    { title: 'Tarjeta', dataIndex: 'notarjeta', key: 'notarjeta', width: 140 },
    { title: 'Autorización', dataIndex: 'noAprob', key: 'noAprob', width: 120 },
    { title: 'RRN', dataIndex: 'rrn', key: 'rrn', width: 130 },
    { title: 'Lote', dataIndex: 'noLote', key: 'noLote', width: 90 },
    {
      title: 'Estado',
      key: 'estado',
      width: 120,
      render: (_, record) => (
        record.anulado === 'S' ? <Tag color="red">ANULADO</Tag> : <Tag color="green">APROBADO</Tag>
      ),
    },
    { title: 'Origen', dataIndex: 'origen', key: 'origen', width: 110 },
    { title: 'Respuesta', dataIndex: 'respuestaMsg', key: 'respuestaMsg', width: 220, ellipsis: true },
    {
      title: '',
      key: 'acciones',
      width: 80,
      render: (_, record) => (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            title={record.anulado === 'S' ? 'Visualizar anulación (ESC/POS)' : 'Visualizar ESC/POS'}
            onClick={() => handleVisualizarReimpresion(record)}
          />
          <Button
            type="link"
            size="small"
            icon={<PrinterOutlined />}
            title={record.anulado === 'S' ? 'Reimprimir comprobante de anulación' : 'Reimprimir voucher'}
            onClick={() => handleReimprimir(record)}
          />
        </Space>
      ),
    },
  ];

  const handleVisualizarCierre = async () => {
    if (!vouchers.length) {
      message.info('No hay vouchers para la fecha seleccionada.');
      return;
    }

    const ventana = window.open('', '_blank');
    if (!ventana) {
      message.error('El navegador bloqueó la vista del cierre. Permite las ventanas emergentes e inténtalo de nuevo.');
      return;
    }

    setGenerandoCierre(true);
    try {
      const suc = companyStore.data.sucursales.find((s: any) => s.sucursal === sucursalActiva);
      let companiaInfo = {
        nombre: suc?.nombre || sucursalName || '',
        direccion: suc?.direccion || '',
        telefono: suc?.telefono || '',
        fax: suc?.fax || '',
        rnc: suc?.rnc || '',
      };

      try {
        const compania = await companiaApi.obtenerActiva(sucursalActiva);
        if (compania?.nombre) {
          companiaInfo = {
            nombre: compania.nombre,
            direccion: compania.direccion || companiaInfo.direccion,
            telefono: compania.telefono || companiaInfo.telefono,
            fax: compania.fax || companiaInfo.fax,
            rnc: compania.rnc || companiaInfo.rnc,
          };
        }
      } catch {
        // Conserva los datos disponibles de la sucursal.
      }

      const formatoMonto = (monto: number) =>
        `${simMoneda} ${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const grupos = new Map<string, { host: string; lote: string; vouchers: VisanetVoucherDTO[] }>();
      vouchers.forEach((voucher) => {
        const host = voucher.host?.trim() || 'SIN HOST';
        const lote = voucher.noLote?.trim() || 'SIN LOTE';
        const clave = `${host}::${lote}`;
        const grupo = grupos.get(clave);
        if (grupo) {
          grupo.vouchers.push(voucher);
        } else {
          grupos.set(clave, { host, lote, vouchers: [voucher] });
        }
      });

      const ventas = vouchers.filter((voucher) => voucher.anulado !== 'S');
      const anulaciones = vouchers.filter((voucher) => voucher.anulado === 'S');
      const montoVentas = ventas.reduce((total, voucher) => total + Number(voucher.monto || 0), 0);
      const montoAnulaciones = anulaciones.reduce((total, voucher) => total + Number(voucher.monto || 0), 0);

      const gruposHtml = Array.from(grupos.values()).map(({ host, lote, vouchers: vouchersGrupo }) => {
        const movimientos = vouchersGrupo.map((voucher) => {
          const esAnulacion = voucher.anulado === 'S';
          const monto = Number(voucher.monto || 0);
          const tarjeta = voucher.notarjeta?.trim() || 'SIN TARJETA';
          const aprobacion = voucher.noAprob?.trim();
          const rrn = voucher.rrn?.trim();
          const detalles = [
            escaparHtml(tarjeta),
            aprobacion ? `Aprob.: ${escaparHtml(aprobacion)}` : '',
            rrn ? `RRN: ${escaparHtml(rrn)}` : '',
          ].filter(Boolean).join(' | ');

          return `<div class="movimiento ${esAnulacion ? 'anulacion' : ''}">
            <div class="movimiento-cabecera">
              <strong>${escaparHtml(esAnulacion ? 'ANULACION' : 'VENTA')} ${escaparHtml(voucher.noSec || 'SIN REF.')}</strong>
              <strong>${escaparHtml(formatoMonto(esAnulacion ? -monto : monto))}</strong>
            </div>
            <div class="movimiento-detalle">${detalles}</div>
          </div>`;
        }).join('');

        const montoGrupo = vouchersGrupo.reduce(
          (total, voucher) => total + (voucher.anulado === 'S' ? -Number(voucher.monto || 0) : Number(voucher.monto || 0)),
          0,
        );

        return `<section class="grupo">
          <div class="fila-meta"><strong>HOST: ${escaparHtml(host)}</strong><strong>LOTE: ${escaparHtml(lote)}</strong></div>
          <div class="separador"></div>
          ${movimientos}
          <div class="separador"></div>
          <div class="movimiento-pie"><strong>NETO DEL LOTE</strong><strong>${escaparHtml(formatoMonto(montoGrupo))}</strong></div>
        </section>`;
      }).join('');

      const fecha = (fechaFiltro ?? dayjs()).format('DD/MM/YYYY');
      const encabezadoEmpresa = [
        companiaInfo.nombre,
        companiaInfo.direccion,
        [companiaInfo.telefono && `Tel.: ${companiaInfo.telefono}`, companiaInfo.fax && `Fax: ${companiaInfo.fax}`].filter(Boolean).join('   '),
        companiaInfo.rnc && `RNC: ${companiaInfo.rnc}`,
      ].filter((linea): linea is string => Boolean(linea)).map((linea) => `<div>${escaparHtml(linea)}</div>`).join('');

      ventana.document.write(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Cierre Visanet ${escaparHtml(fecha)}</title>
<style>
  @page { size: 80mm auto; margin: 5mm; }
  * { box-sizing: border-box; }
  body { width: 70mm; margin: 0 auto; color: #1f1f1f; font-family: "Courier New", monospace; font-size: 11px; line-height: 1.4; }
  .encabezado { text-align: center; margin-bottom: 12px; }
  h1 { margin: 0 0 3px; font-size: 15px; }
  .fecha { margin-top: 5px; font-weight: 700; }
  .grupo { margin-top: 13px; break-inside: avoid; }
  .fila-meta, .movimiento-cabecera, .movimiento-pie, .fila-total { display: flex; justify-content: space-between; gap: 8px; }
  .separador { border-top: 1px dashed #444; margin: 7px 0; }
  .movimiento { margin: 6px 0; }
  .movimiento-detalle { color: #444; overflow-wrap: anywhere; }
  .anulacion { font-weight: 700; }
  .resumen { margin-top: 16px; }
  .fila-total { padding: 2px 0; }
  .neto { font-size: 13px; font-weight: 700; border-top: 1px dashed #444; margin-top: 5px; padding-top: 5px; }
  .pie { margin-top: 18px; text-align: center; font-weight: 700; }
  .nota { margin-top: 18px; color: #555; font-family: Arial, sans-serif; font-size: 10px; font-weight: 400; }
  @media print { body { width: auto; } .nota { display: none; } }
</style>
</head>
<body>
  <header class="encabezado">
    ${encabezadoEmpresa}
    <h1>CIERRE PORTAL</h1>
    <div class="fecha">FECHA: ${escaparHtml(fecha)}</div>
  </header>
  ${gruposHtml}
  <section class="resumen">
    <div class="separador"></div>
    <div class="fila-total"><span>Ventas (${ventas.length})</span><strong>${escaparHtml(formatoMonto(montoVentas))}</strong></div>
    <div class="fila-total"><span>Anulaciones (${anulaciones.length})</span><strong>${escaparHtml(formatoMonto(-montoAnulaciones))}</strong></div>
    <div class="fila-total neto"><span>TOTAL (${ventas.length - anulaciones.length})</span><strong>${escaparHtml(formatoMonto(montoVentas - montoAnulaciones))}</strong></div>
  </section>
  <footer class="pie">** CIERRE COMPLETO **</footer>
  <div class="nota">Vista de consulta. Use Imprimir o Guardar como PDF del navegador.</div>
</body>
</html>`);
      ventana.document.close();
      ventana.focus();
    } catch {
      ventana.close();
      message.error('No se pudo generar la vista del cierre.');
    } finally {
      setGenerandoCierre(false);
    }
  };

  const handleExportarExcelVouchers = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    const cols = columnasVouchers.filter((c) => c.key !== 'acciones');
    exportToExcel({
      fileName: `VisanetVouchers_${fechaFiltro?.format('YYYYMMDD') || dayjs().format('YYYYMMDD')}`,
      sheetName: 'VisanetVouchers',
      companyName,
      columnHeaders: cols.map((c) => c.title as string),
      dataRows: vouchers.map((item: any) =>
        cols.map((col) => {
          if (col.key === 'estado') {
            return item.anulado === 'S' ? 'ANULADO' : 'APROBADO';
          }
          if (col.key === 'monto') {
            return item.monto != null ? item.monto.toFixed(2) : '';
          }
          const val = item[col.dataIndex as string];
          return val !== null && val !== undefined ? String(val) : '';
        })
      ),
    });
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Toolbar superior: Volver + título, acciones alineadas a la derecha */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/CCENTRALSUPERVISION')}>
          Volver
        </Button>
        <Title level={4} style={{ margin: 0 }}>Cobro con Tarjeta (Visanet)</Title>
        <div style={{ flex: 1 }} />
        <Button
          type="primary"
          icon={<CreditCardOutlined />}
          style={{ height: 40 }}
          loading={loading === 'vender'}
          onClick={() => {
            setVenderMonto(null);
            setVenderTokenECR('');
            setVenderModalOpen(true);
          }}
        >
          Vender
        </Button>
        <Button
          danger
          icon={<StopOutlined />}
          style={{ height: 40 }}
          loading={loading === 'anular'}
          onClick={() => {
            setAnularTokenId('');
            setAnularModalOpen(true);
          }}
        >
          Anular
        </Button>
        <Button
          icon={<FolderOpenOutlined />}
          style={{ height: 40 }}
          loading={loading === 'cerrar'}
          onClick={() => setCerrarLoteModalOpen(true)}
        >
          Cerrar Lote
        </Button>
          <Button
            icon={<EyeOutlined />}
            style={{ height: 40 }}
            onClick={() => setCierrePruebaModalOpen(true)}
  title="Generar un comprobante desde una respuesta JSON sin enviarlo al terminal"
>
  Generar cierre PDF
          </Button>
      </div>

      {/* KPIs de subsidios prioritarios + Subsidio */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* KPIs de subsidios prioritarios */}
        <Col xs={24} sm={12}>
          <Card title="Subsidios prioritarios" size="small" className="paces-card">
            <Row gutter={[12, 12]}>
              {Object.entries(SUBSIDIO_MONTOS).map(([id, monto]) => {
                const KPI_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
                  ' ': { color: '#34c38f', bg: 'rgba(52,195,143,0.1)', icon: <HeartOutlined /> },
                  'E': { color: '#556ee6', bg: 'rgba(85,110,230,0.1)', icon: <IdcardOutlined /> },
                  'F': { color: '#f0b345', bg: 'rgba(240,179,69,0.1)', icon: <ReadOutlined /> },
                };
                const kpi = KPI_CONFIG[id] || { color: '#556ee6', bg: 'rgba(85,110,230,0.1)', icon: <CreditCardOutlined /> };
                return (
                  <Col xs={24} sm={8} key={id}>
                    <div
                      className="dashboard-kpi-card"
                      style={{ cursor: 'pointer', '--kpi-accent': kpi.color } as React.CSSProperties}
                      onClick={() => setSubsidioConfirmacion({ subsidyId: id, montoPesos: monto })}
                    >
                      <div className="dashboard-kpi-top">
                        <div className="dashboard-kpi-icon" style={{ background: kpi.bg, color: kpi.color }}>
                          {kpi.icon}
                        </div>
                        <span className="dashboard-kpi-chip">Monto</span>
                      </div>
                      <div className="dashboard-kpi-value">
                        {simMoneda}{' '}
                        {monto.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <p className="dashboard-kpi-label">{SUBSIDIO_NOMBRES[id] || 'SUBSIDIO'}</p>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </Card>
        </Col>

        {/* Subsidio */}
        <Col xs={24} sm={12}>
          <Card title="🎫 Subsidio" size="small" className="paces-card">
            <Space direction="vertical" style={{ width: '100%' }}>
              <InputNumber
                placeholder="Monto en pesos (ej: 500.00)"
                style={{ width: '100%' }}
                precision={2}
                min={0}
                value={subsidioMontoPesos}
                onChange={(v) => setSubsidioMontoPesos(v ?? null)}
                onPressEnter={handleVenderSubsidio}
              />
              <Select
                placeholder="Seleccionar subsidio"
                style={{ width: '100%' }}
                allowClear
                options={SUBSIDIO_OPCIONES}
                value={subsidyId || undefined}
                onChange={(val) => {
                  const value = val ?? '';
                  setSubsidyId(value);
                  const montoDefinido = SUBSIDIO_MONTOS[value];
                  if (montoDefinido != null) {
                    setSubsidioMontoPesos(montoDefinido);
                  }
                }}
              />
              <Button type="primary" block loading={loading === 'subsidio'} onClick={handleVenderSubsidio}>
                Vender
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Área de resultado */}
      {error && (
        <Alert type="error" message="Error" description={error} showIcon style={{ marginTop: 16 }} />
      )}

      {resultado && !error && (
        <Space style={{ marginTop: 16 }}>
          {typeof resultado === 'object' && 'exitoso' in resultado && (
            <Button icon={<PrinterOutlined />} onClick={() => setVoucherVisible(true)}>
              Ver Voucher
            </Button>
          )}
          <Button icon={<EyeOutlined />} onClick={handleVisualizar}>
            Visualizar ESC/POS
          </Button>
          <Button icon={<CodeOutlined />} onClick={() => setJsonDrawerOpen(true)}>
            Ver JSON (soporte)
          </Button>
        </Space>
      )}

      <VisanetVoucher
        visible={voucherVisible}
        onClose={() => setVoucherVisible(false)}
        respuesta={
          resultado && typeof resultado === 'object' && 'exitoso' in resultado
            ? (resultado as VisanetResponseDTO)
            : ({} as VisanetResponseDTO)
        }
        montoPesos={tipoOperacion === 'venta' ? (montoPesos || 0) : (subsidioMontoPesos || 0)}
        transacId={0}
        onPrintQZ={handlePrint}
        companyName={companyName}
        sucursalName={sucursalName}
        simMoneda={simMoneda}
        subsidioLabel={subsidioLabel}
      />

      {/* Registros */}
      <Card
        className="paces-card-erp"
        title="Registros"
        style={{ borderRadius: 8, overflow: 'hidden', marginTop: 16 }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <DatePicker
              value={fechaFiltro}
              onChange={(date) => {
                setFechaFiltro(date);
                cargarVouchersDelDia(date ?? dayjs());
              }}
              format="DD/MM/YYYY"
              style={{ width: 140 }}
     />
     <div style={{ flex: 1 }} />
     <Button
       icon={<EyeOutlined />}
       loading={generandoCierre}
       disabled={!vouchers.length}
       onClick={handleVisualizarCierre}
     >
       Ver cierre
     </Button>
     <Button icon={<FileExcelOutlined />} onClick={handleExportarExcelVouchers} />
     <Button icon={<ReloadOutlined />} onClick={() => cargarVouchersDelDia(fechaFiltro ?? dayjs())} />
          </div>
        </div>
        <Table
          rowKey="noSec"
          className="paces-border-top paces-list-table"
          size="middle"
          columns={columnasVouchers}
          dataSource={vouchers}
          loading={vouchersLoading}
          scroll={{ x: 1350 }}
          pagination={{ showTotal: (t) => `${t} registros` }}
          rowClassName={(record) => (record.anulado === 'S' ? 'paces-text-secondary' : '')}
        />
      </Card>

      <Modal
        title="Generar cierre desde JSON"
        open={cierrePruebaModalOpen}
        onCancel={() => setCierrePruebaModalOpen(false)}
        onOk={handleVisualizarCierrePrueba}
        okText="Abrir comprobante"
        cancelText="Cancelar"
        confirmLoading={generandoCierre}
        width={760}
      >
        <Alert
          type="info"
          showIcon
          message="No envia operaciones al terminal"
          description="Genera una vista continua de 80 mm. Desde ella puedes abrir un PDF de una sola pagina o descargar una imagen."
          style={{ marginBottom: 16 }}
        />
        <Text strong>Respuesta JSON del cierre</Text>
        <Input.TextArea
          value={jsonCierrePrueba}
          onChange={(event) => setJsonCierrePrueba(event.target.value)}
          autoSize={{ minRows: 14, maxRows: 22 }}
          placeholder="Pega aqui la respuesta JSON del cierre de Visanet."
          spellCheck={false}
          style={{ marginTop: 8, fontFamily: 'Consolas, monospace' }}
        />
      </Modal>

      <Modal
        title="Cierre Visanet"
        open={vistaCierrePruebaOpen}
        onCancel={() => setVistaCierrePruebaOpen(false)}
        footer={[
          <Button key="cerrar" onClick={() => setVistaCierrePruebaOpen(false)}>
            Cerrar
          </Button>,
          <Button
            key="png"
            onClick={handleDescargarCierrePruebaPng}
            loading={exportandoCierrePrueba}
          >
            Descargar PNG
          </Button>,
          <Button
            key="pdf"
            type="primary"
            onClick={handleGuardarCierrePruebaPdf}
            loading={exportandoCierrePrueba}
          >
            Abrir PDF de 80 mm
          </Button>,
        ]}
        width={560}
      >
        <div
          style={{
            maxHeight: '70vh',
            overflow: 'auto',
            padding: '12px 0',
            background: '#f0f0f0',
          }}
        >
          <style>{ESTILOS_COMPROBANTE_CIERRE_VISANET}</style>
          <div
            ref={comprobanteCierrePruebaRef}
            className="comprobante-cierre-visanet"
            dangerouslySetInnerHTML={{ __html: contenidoCierrePrueba }}
            style={{ margin: '0 auto' }}
          />
        </div>
      </Modal>

      {/* Modal de confirmación de subsidio rápido */}
      <Modal
        title="Confirmar venta de subsidio"
        open={subsidioConfirmacion !== null}
        onCancel={() => setSubsidioConfirmacion(null)}
        onOk={() => {
          const confirmacion = subsidioConfirmacion;
          if (!confirmacion) return;
          const { subsidyId: subsId, montoPesos: monto } = confirmacion;
          setSubsidyId(subsId);
          setSubsidioMontoPesos(monto);
          setSubsidioConfirmacion(null);
          ejecutarVentaSubsidio(subsId, monto);
        }}
        okText="Vender"
        cancelText="Cancelar"
        okButtonProps={{ loading: loading === 'subsidio' }}
      >
        {subsidioConfirmacion && (
          <p style={{ margin: 0 }}>
            ¿Deseas vender el subsidio{' '}
            <strong>{SUBSIDIO_NOMBRES[subsidioConfirmacion.subsidyId] || 'SUBSIDIO'}</strong> por un
            monto de{' '}
            <strong>
              {simMoneda}{' '}
              {subsidioConfirmacion.montoPesos.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </strong>
            ?
          </p>
        )}
      </Modal>

      {/* Modal de venta */}
      <Modal
        title="Vender (PAX)"
        open={venderModalOpen}
        onCancel={() => setVenderModalOpen(false)}
        onOk={confirmarVentaModal}
        okText="Vender"
        cancelText="Cancelar"
        okButtonProps={{ loading: loading === 'vender' }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <div>
            <Text type="secondary">Monto en pesos</Text>
            <InputNumber
              style={{ width: '100%' }}
              precision={2}
              min={0}
              value={venderMonto}
              onChange={(v) => setVenderMonto(v ?? null)}
              onPressEnter={confirmarVentaModal}
              placeholder="Ej: 1500.00"
              autoFocus
            />
          </div>
          <div>
            <Text type="secondary">TokenECR (opcional)</Text>
            <Input
              placeholder="TokenECR"
              value={venderTokenECR}
              onChange={(e) => setVenderTokenECR(e.target.value)}
            />
          </div>
        </Space>
      </Modal>

      {/* Modal de anulación */}
      <Modal
        title="Anular (PAX)"
        open={anularModalOpen}
        onCancel={() => setAnularModalOpen(false)}
        onOk={confirmarAnularModal}
        okText="Anular"
        cancelText="Cancelar"
        okButtonProps={{ loading: loading === 'anular', danger: true }}
      >
        <div>
          <Text type="secondary">TokenId a anular</Text>
          <Input
            placeholder="TokenId"
            value={anularTokenId}
            onChange={(e) => setAnularTokenId(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>

      {/* Modal de cierre de lote */}
      <Modal
        title="Cerrar Lote (PAX)"
        open={cerrarLoteModalOpen}
        onCancel={() => setCerrarLoteModalOpen(false)}
        onOk={confirmarCerrarLoteModal}
        okText="Cerrar Lote"
        cancelText="Cancelar"
        okButtonProps={{ loading: loading === 'cerrar' }}
      >
        <p style={{ margin: 0 }}>
          ¿Deseas cerrar el lote de transacciones del PAX? Esta acción no se puede deshacer.
        </p>
      </Modal>

      {/* Modal Visualizar ESC/POS (salida exacta que se envía a la impresora) */}
      <Modal
        title={escposContenido?.titulo || 'ESC/POS'}
        open={escposModalOpen}
        onCancel={() => setEscposModalOpen(false)}
        width={720}
        footer={[
          <Button key="copiar" icon={<CopyOutlined />} onClick={handleCopiarEscPos}>
            Copiar ESC/POS
          </Button>,
          <Button key="cerrar" type="primary" onClick={() => setEscposModalOpen(false)}>
            Cerrar
          </Button>,
        ]}
      >
        <Tabs
          items={[
            {
              key: 'vista',
              label: 'Vista previa',
              children: (
                <div
                  style={{
                    background: '#fff',
                    width: `${(escposContenido?.anchoLinea ?? 42) * 10}px`,
                    minWidth: `${(escposContenido?.anchoLinea ?? 42) * 8.5}px`,
                    maxWidth: '100%',
                    margin: '0 auto',
                    padding: '16px 20px',
                    fontFamily: escposContenido?.fontFamily ? `'${escposContenido.fontFamily}', monospace` : "'Courier New', Courier, monospace",
                    fontSize: 14,
                    lineHeight: 1.5,
                    border: '1px solid #d9d9d9',
                    borderRadius: 4,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    maxHeight: 'calc(100vh - 300px)',
                    overflowY: 'auto',
                  }}
                  dangerouslySetInnerHTML={{ __html: escposContenido?.html || '' }}
                />
              ),
            },
            {
              key: 'crudo',
              label: 'ESC/POS crudo',
              children: (
                <pre
                  style={{
                    maxHeight: 'calc(100vh - 300px)',
                    overflow: 'auto',
                    background: '#f5f5f5',
                    padding: 12,
                    borderRadius: 4,
                    fontSize: 12,
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {escposContenido ? escposCrudoVisible(escposContenido.raw) : ''}
                </pre>
              ),
            },
          ]}
        />
      </Modal>

      {/* Drawer JSON de respuesta (soporte) */}
      <Drawer
        title="JSON de respuesta"
        open={jsonDrawerOpen}
        onClose={() => setJsonDrawerOpen(false)}
        width={560}
      >
        <p style={{ marginTop: 0 }}>
          Si necesitas soporte técnico, copia este JSON y envíalo al equipo de desarrollo.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <Button size="small" icon={<CopyOutlined />} onClick={handleCopiarJson}>
            Copiar JSON
          </Button>
        </div>
        <pre
          style={{
            maxHeight: 'calc(100vh - 260px)',
            overflow: 'auto',
            background: '#f5f5f5',
            padding: 12,
            borderRadius: 4,
            fontSize: 12,
            margin: 0,
          }}
        >
          {jsonSoporteTexto()}
        </pre>
      </Drawer>
    </div>
  );
};

export default VisanetTest;
