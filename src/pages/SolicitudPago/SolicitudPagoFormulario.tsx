import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Grid,
  Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Alert, Empty, App,
} from 'antd';
import {
  SaveOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  BankOutlined,
  PlusOutlined,
  DeleteOutlined,
  HistoryOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useCompanyStore } from '../../stores/companyStore';
import { solicitudPagoApi } from '../../api/solicitudPagoApi';
import { conceptosApi } from '../../api/conceptosApi';
import { cuentaBancariaApi } from '../../api/cuentaBancariaApi';
import CampoTipo from '../../components/CampoTipo/CampoTipo';
import type { SolicitudPagoDTO, SolicitudPagoCrearDTO, SolicitudPagoActualizarDTO } from '../../types/solicitudPago';
import type { ConceptoDTO, EntidadDTO, AsientoContableDTO, LogDTO } from '../../types/entradaAlmacen';
import type { TransaccionAsociadaDTO } from '../../types/reciboIngreso';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import BuscarCuentaBancariaModal from '../../components/BuscarCuentaBancariaModal/BuscarCuentaBancariaModal';
import BuscarDocumentoModal from '../../components/BuscarDocumentoModal/BuscarDocumentoModal';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import AsientosContableTable from '../../components/AsientosContableTable';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import BuscarCuentaContableModal from '../../components/BuscarCuentaContableModal/BuscarCuentaContableModal';
import LogTable from '../../components/LogTable';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import { toTitleCase, extraerMensajeError, toISOFormat, formatNumber, formatDate } from '../../utils/formats';
import { toEstadoNum } from '../../utils/estadoDocumento';

const { Text } = Typography;
const { TextArea } = Input;

const TIPOS_PAGO = [
  { codigo: 'CHK', nombre: 'Cheque' },
  { codigo: 'TRB', nombre: 'Transferencia Bancaria' },
  { codigo: 'DEP', nombre: 'Depósito Bancario' },
  { codigo: 'DEC', nombre: 'Desembolso de Caja' },
];

// ===== Componente principal =====
const SolicitudPagoFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const usuario = useAuthStore((s: any) => s.usuario);
  const permisoModificarAsientos = usuario?.permisosEspeciales?.some(
    (p: any) => p.codigo?.toUpperCase() === 'PE_MODIFICAR_ASIENTOS' && p.valor === true
  ) ?? false;
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
  const screens = Grid.useBreakpoint();
  const { message } = App.useApp();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const { screenCode, documentCode } = useScreenConfig('FSPA');
  const [form] = Form.useForm();
  const navigationConfirmedRef = useRef(false);
  const impuestosBackupRef = useRef<Map<number, { impuesto?: any; porcentajeImpuesto: number }>>(new Map());

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<SolicitudPagoDTO | null>(null);
  const [tipoValue, setTipoValue] = useState<string>('');
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [selectedEntidad, setSelectedEntidad] = useState<EntidadDTO | null>(null);
  const [entidadesCache, setEntidadesCache] = useState<EntidadDTO[]>([]);
  const [tipoPago, setTipoPago] = useState<string>('');

  // Concepto modal
  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
  const [conceptoSearchText, setConceptoSearchText] = useState('');
  const [sucursalDestino, setSucursalDestino] = useState<number | undefined>(undefined);

  // Cuenta Bancaria
  const [selectedCuenta, setSelectedCuenta] = useState<{ nombre: string; noCuenta: string; banco: string } | null>(null);
  const [cuentaModalOpen, setCuentaModalOpen] = useState(false);

  // Documentos relacionados
  // descuento/impuesto son campos editables locales, no vienen del backend DTO.
  type TransaccionAsociadaForm = TransaccionAsociadaDTO & { descuento?: number; impuesto?: number };
  const normalizarAsociada = (t: TransaccionAsociadaDTO): TransaccionAsociadaForm => ({
    ...t,
    descuento: (t as TransaccionAsociadaForm).descuento ?? 0,
    impuesto: (t as TransaccionAsociadaForm).impuesto ?? 0,
  });
  const [transaccionesAsociadas, setTransaccionesAsociadas] = useState<TransaccionAsociadaForm[]>([]);
  const [documentoModalOpen, setDocumentoModalOpen] = useState(false);

  // Cuenta contable para asientos manuales
  const [cuentaModalAsientoOpen, setCuentaModalAsientoOpen] = useState(false);

  // Modal para avance de efectivo (sin documentos relacionados)
  const [modalMontoSinDocsOpen, setModalMontoSinDocsOpen] = useState(false);
  const [modalMontoSinDocsValue, setModalMontoSinDocsValue] = useState<number | null>(null);

  // Asientos e historial
  const [asientos, setAsientos] = useState<AsientoContableDTO[]>([]);
  const [errorGeneracion, setErrorGeneracion] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogDTO[]>([]);

  // ===== Totales calculados desde documentos seleccionados =====
  const totalesDocs = React.useMemo(() => {
    const baseSubTotal = transaccionesAsociadas.reduce((s, t) => s + (t.monto || 0) + (t.descuento || 0), 0);
    const baseDescuento = transaccionesAsociadas.reduce((s, t) => s + (t.descuento || 0), 0);
    const baseImpuestos = transaccionesAsociadas.reduce((s, t) => s + (t.impuesto || 0), 0);
    const baseRetenciones = transaccionesAsociadas.reduce((s, t) => s + (t.retencion || 0), 0);
    // Si no hay documentos relacionados (avance efectivo), subtotal = total del documento
    const tieneDocs = transaccionesAsociadas && transaccionesAsociadas.length > 0;
    return {
      subTotal: tieneDocs ? baseSubTotal : (data?.subTotal || data?.total || form.getFieldValue('subTotal') || 0),
      descuento: tieneDocs ? baseDescuento : (data?.descuento || form.getFieldValue('descuento') || 0),
      impuestos: tieneDocs ? baseImpuestos : (data?.impuestos || form.getFieldValue('impuestos') || 0),
      retenciones: tieneDocs ? baseRetenciones : (data?.retenciones || form.getFieldValue('retenciones') || 0),
    };
  }, [transaccionesAsociadas, data, form]);

  const totalCalculado = Math.round(
    (totalesDocs.subTotal - totalesDocs.descuento + totalesDocs.impuestos) * 100
  ) / 100;

  // Si no hay documentos relacionados, usar el total del backend (edicion) o el calculado
  const totalDisplay = totalCalculado;
  const totalDistribuido = totalesDocs.subTotal - totalesDocs.descuento;
  const totalRetencionesDocs = transaccionesAsociadas.reduce((s, t) => s + (t.retencion || 0), 0);

  const porDistribuir = totalCalculado - totalDistribuido;
  const tasaValue = Form.useWatch('tasa', form) ?? 1;

  // Sincronizar form fields para submission del DTO
  useEffect(() => {
    form.setFieldsValue({
      subTotal: totalesDocs.subTotal,
      descuento: totalesDocs.descuento,
      impuestos: totalesDocs.impuestos,
      retenciones: totalesDocs.retenciones,
      total: totalCalculado,
    });
  }, [totalesDocs, form]);

  // ===== Constantes =====
const isLarge = screens.xxl === true;

  // Moneda dinámica (siempre desde concepto)
  const monedaSimbolo = selectedConcepto?.moneda?.simbolo || getMonedaSucursalActiva().simbolo;
  const monedaNombre = selectedConcepto?.moneda?.nombre || getMonedaSucursalActiva().nombre;

  // ===== Cargar entidades según concepto =====
  const cargarEntidades = useCallback(async (conceptoCodigo?: string) => {
    try {
      const res = await conceptosApi.obtenerEntidadesActivas(sucursalActiva, conceptoCodigo);
      setEntidadesCache(res || []);
    } catch {
      message.error('Error al cargar entidades');
    }
  }, [sucursalActiva, message]);

  // ===== Carga inicial =====
  useEffect(() => {
    setActiveModule(screenCode);
    const pageTitle = mode === 'crear'
      ? 'Nueva Solicitud de Pago'
      : 'Editar Solicitud de Pago';
    setPageTitleOverride(pageTitle);

    if (mode === 'crear') {
      form.setFieldsValue({
        fechaDocumento: dayjs(),
        tasa: 1,
        subTotal: 0,
        descuento: 0,
        impuestos: 0,
        retenciones: 0,
      });
    }

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, form]);

   // ===== Inicialmente no hay documentos relacionados (caso típico para SPAs) =====
   // Se normaliza las transaccionesAsociadas a [] en lugar de null/undefined
   useEffect(() => {
     if (!transaccionesAsociadas) {
       setTransaccionesAsociadas([]);
     }
   }, []);

  // ===== Cargar datos en modo editar =====
  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;

    setLoading(true);
    solicitudPagoApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then(async (res) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          navigate('/FSPA', { replace: true });
          return;
        }

        setData(res);
        setAsientos(res.asientos || []);
        setLogs(res.logs || []);
        setTransaccionesAsociadas((res.transaccionesAsociadas || []).map(normalizarAsociada));

        // Concepto
        const resAny = res as any;
        const conceptoRaw = resAny.concepto;
        const concepto = typeof conceptoRaw === 'object' && conceptoRaw !== null ? conceptoRaw as ConceptoDTO : null;
        const conceptoCodigo = concepto?.codigo || '';
        if (concepto) {
          setSelectedConcepto({ ...concepto, codigo: conceptoCodigo });
          setConceptoSearchText(`${conceptoCodigo} - ${concepto.nombre || ''}`);
          // Cargar entidades según concepto
          if (conceptoCodigo) {
            cargarEntidades(conceptoCodigo);
          }
        }

        // Tipo
        const tipoRaw = resAny.tipo;
        setTipoValue(tipoRaw?.codigo || resAny.codigoTipo || '');

        // Tipo Pago a Generar
        const tipoPagoRaw = (res as any).tipoPagoCodigo;
        if (tipoPagoRaw) setTipoPago(tipoPagoRaw);

        // Cuenta Bancaria — resolver datos completos desde el API
        if (res.cuentaBancaria) {
          try {
            const cuentas = await cuentaBancariaApi.obtenerListado(sucursalActiva);
            const encontrada = cuentas.find((c) => c.noCuenta === res.cuentaBancaria);
            if (encontrada) {
              setSelectedCuenta({ nombre: encontrada.nombre, noCuenta: encontrada.noCuenta, banco: encontrada.banco });
            } else {
              setSelectedCuenta({ nombre: '', noCuenta: res.cuentaBancaria, banco: '—' });
            }
          } catch {
            setSelectedCuenta({ nombre: '', noCuenta: res.cuentaBancaria, banco: '' });
          }
        }

        // Entidad: el DTO la trae como string; si el backend envía objeto se soporta sin leer codigoEntidad.
        const entidadRaw = resAny.entidad;
        const entidad = typeof entidadRaw === 'object' && entidadRaw !== null ? entidadRaw as EntidadDTO : null;
        const entidadCodigo = entidad?.codigo || (typeof entidadRaw === 'string' ? entidadRaw : '');
        if (entidad) {
          setSelectedEntidad({ ...entidad, codigo: entidadCodigo });
        }

        // Fecha (forzar interpretación local para evitar desplazamiento UTC)
        const fechaDoc = res.fechaDocumento ? dayjs(res.fechaDocumento.substring(0, 10)) : null;

        form.setFieldsValue({
          fechaDocumento: fechaDoc,
          tipo: tipoRaw?.codigo || resAny.codigoTipo || '',
          concepto: concepto?.codigo || '',
          entidad: entidadCodigo,
          cuentaBancaria: res.cuentaBancaria || '',
          referencia: res.referencia || '',
          ncf: res.ncf || '',
          tipoPago: (res as any).tipoPagoCodigo || '',
nota: res.nota || '',
        subTotal: res.subTotal ?? 0,
        descuento: res.descuento ?? 0,
        impuestos: res.impuestos ?? 0,
        retenciones: res.retenciones ?? 0,
        total: res.total ?? totalCalculado,
        tasa: res.tasa ?? 1,
        nombreBeneficiario: res.nombreBeneficiario || entidad?.beneficiario?.trim() || '',
      });
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar la solicitud de pago');
        message.error(msg);
        setLoadingError(true);
        navigate('/FSPA', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate, cargarEntidades, message]);

  // ===== Bloqueo de navegación con cambios sin guardar =====
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const leave = window.confirm('Los cambios no guardados se perderán. ¿Está seguro que desea salir?');
      if (!leave) {
        window.history.pushState(null, '', window.location.pathname);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const originalPushState = window.history.pushState.bind(window.history);
    window.history.pushState = function (data: any, unused: string, url?: string | URL | null) {
      const currentPath = window.location.pathname;
      const newPath = typeof url === 'string' ? url.split('?')[0] : (url instanceof URL ? url.pathname : null);
      if (newPath && currentPath !== newPath && !navigationConfirmedRef.current) {
        const leave = window.confirm('Los cambios no guardados se perderán. ¿Está seguro que desea salir?');
        if (!leave) return;
        navigationConfirmedRef.current = true;
      }
      return originalPushState(data, unused, url);
    };
    return () => { window.history.pushState = originalPushState; };
  }, []);

  // ===== Handlers de concepto =====
  const handleConceptoSelect = (concepto: ConceptoDTO) => {
    setSelectedConcepto(concepto);
    setConceptoSearchText('');
    setSelectedEntidad(null);

    // Cargar entidades según concepto
    if (concepto.codigo) {
      cargarEntidades(concepto.codigo);
    }

    // === ConfigurarMoneda (siempre desde concepto) ===
    // MonedaDTO no trae tasa; la tasa se mantiene desde el form o data.
    const monedaObj = concepto.moneda || getMonedaSucursalActiva();
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, moneda: { simbolo: monedaObj.simbolo, nombre: monedaObj.nombre } };
    });

    form.setFieldsValue({
      concepto: concepto.codigo,
      entidad: undefined,
      moneda: monedaObj.nombre,
      tasa: form.getFieldValue('tasa') ?? data?.tasa ?? 1,
      nombreBeneficiario: '',
    });

    // === NoImpuesto: si el concepto no acepta impuestos, limpiarlos ===
    const prevNoImpuesto = selectedConcepto?.noImpuesto;
    if (concepto.noImpuesto) {
      const impuestosActual = form.getFieldValue('impuestos') || 0;
      if (impuestosActual > 0) {
        impuestosBackupRef.current.set(0, { impuesto: undefined, porcentajeImpuesto: impuestosActual });
        message.warning('El Concepto no acepta Impuestos, por lo que serán eliminados.');
        form.setFieldsValue({ impuestos: 0 });
      }
    } else if (prevNoImpuesto && !concepto.noImpuesto) {
      const saved = impuestosBackupRef.current.get(0);
      if (saved) {
        form.setFieldsValue({ impuestos: saved.porcentajeImpuesto });
        impuestosBackupRef.current = new Map();
      }
    }
  };

  const handleConceptoClear = () => {
    setSelectedConcepto(null);
    setConceptoSearchText('');
    setEntidadesCache([]);
    setSelectedEntidad(null);
    form.setFieldsValue({ concepto: '', entidad: undefined, nombreBeneficiario: '' });
  };

  // ===== Handlers de Cuenta Bancaria =====
  const handleCuentaSelect = (cuenta: any) => {
    setSelectedCuenta({ nombre: cuenta.nombre, noCuenta: cuenta.noCuenta, banco: cuenta.banco });
    form.setFieldsValue({ cuentaBancaria: cuenta.noCuenta });
  };

  const handleCuentaClear = () => {
    setSelectedCuenta(null);
    form.setFieldsValue({ cuentaBancaria: '' });
  };

  const handleMontoChange = (id: number | undefined, nuevoMonto: number | null) => {
    if (!id) return;
    const monto = nuevoMonto ?? 0;
    setTransaccionesAsociadas((prev) =>
      prev.map((t) =>
        (t.transaccionAsociadaID || t.id) === id ? { ...t, monto: Math.min(monto, Math.max(0, pendienteEfectivo(t) - (t.descuento || 0))) } : t
      )
    );
  };

  const handleDescuentoChange = (id: number | undefined, nuevoDescuento: number | null) => {
    if (!id) return;
    setTransaccionesAsociadas((prev) =>
      prev.map((t) => {
        if ((t.transaccionAsociadaID || t.id) !== id) return t;
        const pendiente = pendienteEfectivo(t);
        const descuento = Math.min(Math.max(nuevoDescuento || 0, 0), pendiente);
        return { ...t, descuento, monto: Math.max(0, pendiente - descuento) };
      })
    );
  };

  // ===== Handler para documentos relacionados =====
  const handleAgregarDocumentos = (docs: TransaccionAsociadaDTO[]) => {
    setTransaccionesAsociadas((prev) => {
      const idsExistentes = new Set(
        prev.map((t) => t.transaccionAsociadaID || t.id)
      );
      const nuevos = docs
        .filter((d) => !idsExistentes.has(d.transaccionAsociadaID || d.id))
        .map(normalizarAsociada);
      return [...prev, ...nuevos];
    });
  };

  const handleDocRelacionadoRemove = (id?: number) => {
    setTransaccionesAsociadas((prev) =>
      prev.filter((t) => (t.transaccionAsociadaID || t.id) !== id)
    );
  };



  const construirDTO = (): SolicitudPagoCrearDTO | SolicitudPagoActualizarDTO => {
    const values = form.getFieldsValue();
    const fechaDoc = values.fechaDocumento
      ? dayjs(values.fechaDocumento).format('YYYYMMDDHHmmss')
      : dayjs().format('YYYYMMDDHHmmss');
    const dto: SolicitudPagoCrearDTO & { codigoTipo?: string; tipoPagoCodigo?: string } = {
      fechaDocumento: fechaDoc,
      codigoTipo: tipoValue || '',
      conceptoCodigo: selectedConcepto?.codigo || '',
      entidadId: selectedEntidad?.codigo || '',
      cuentaBancaria: values.cuentaBancaria || '',
      referencia: values.referencia || '',
      ncf: values.ncf || '',
      tipoPagoCodigo: tipoPago || '',
      nota: values.nota || '',
      subTotal: totalesDocs.subTotal,
      descuento: totalesDocs.descuento,
      impuestos: totalesDocs.impuestos,
      retenciones: totalesDocs.retenciones,
      total: totalCalculado,
      tasa: tasaValue,
      simboloMoneda: monedaSimbolo,
      nombreMoneda: monedaNombre,
      nombreBeneficiario: values.nombreBeneficiario || '',
    };

    const dtoConAsociadas = {
      ...dto,
      transaccionesAsociadas: transaccionesAsociadas.map((t) => ({
        ...t,
        transaccionAsociadaID: t.transaccionAsociadaID || t.id,
        saldoPendiente: pendienteEfectivo(t),
      })),
    };

    if (mode === 'editar' && id && data) {
      return {
        ...dtoConAsociadas,
        id: data.id || parseInt(id),
        asientos: asientos || [],
        logs: logs || [],
      } as SolicitudPagoActualizarDTO;
    }

    return dtoConAsociadas as SolicitudPagoCrearDTO | SolicitudPagoActualizarDTO;
  };

  // ===== Generar asientos =====
  /** Construye un objeto tipo TransaccionDTO (con objetos anidados) para el endpoint generarAsiento */
  const construirDTOGenerarAsientos = useCallback(() => {
    const values = form.getFieldsValue();
    const base: any = data || {};
    const fechaDoc = values.fechaDocumento
      ? dayjs(values.fechaDocumento).format('YYYY-MM-DDTHH:mm:ss')
      : dayjs().format('YYYY-MM-DDTHH:mm:ss');

    // Documento desde pantalla
    const documento = base.documento?.codigo
      ? { ...base.documento }
      : { codigo: documentCode };

    // Concepto
    const concepto = selectedConcepto || { nombre: '', codigo: '' };

    // Entidad
    const entidad = selectedEntidad || { nombre: '', codigo: '', identificacion: '' };

    // Moneda: SolicitudPagoDTO.moneda solo trae simbolo/nombre; codigo desde concepto o sucursal.
    const moneda = base.moneda || selectedConcepto?.moneda || getMonedaSucursalActiva();
    const monedaCodigo = (moneda as { codigo?: string })?.codigo || getMonedaSucursalActiva().codigo;

    return {
      id: base.id || 0,
      fechaDocumento: fechaDoc,
      noDocumento: base.noDocumento || '',
      estado: base.estado || 0,
      periodo: base.periodo || new Date().getMonth() + 1,
      ncf: values.ncf || '',
      referencia: values.referencia || '',
      nota: values.nota || '',
      tasa: tasaValue,
      total: Math.round((totalesDocs.subTotal - totalesDocs.descuento + totalesDocs.impuestos) * 100) / 100,
      subTotal: totalesDocs.subTotal,
      descuento: totalesDocs.descuento,
      impuestos: totalesDocs.impuestos,
      retenciones: totalesDocs.retenciones,
      tipoDocumento: base.tipoDocumento ?? 0,
      documento,
      concepto,
      entidad,
      moneda,
      cuentaBancaria: values.cuentaBancaria || '',
      numeroCuenta: values.cuentaBancaria || '',
      codigoTipo: tipoValue || '',
      codigoEntidad: entidad.codigo || '',
      codigoConcepto: concepto.codigo || '',
      codigoMoneda: monedaCodigo,
      nombreEntidad: entidad.nombre || base.nombreEntidad || '',
      nombreBeneficiario: values.nombreBeneficiario || '',
      transaccionesAsociadas: transaccionesAsociadas.map((t) => ({
        ...t,
        transaccionAsociadaID: t.transaccionAsociadaID || t.id,
        saldoPendiente: pendienteEfectivo(t),
      })),
      asientos: asientos || [],
      logs: logs || [],
    };
  }, [data, form, documentCode, selectedConcepto, selectedEntidad,
      tasaValue, totalCalculado, totalDisplay, totalesDocs, tipoValue, transaccionesAsociadas, asientos, logs]);

  const handleGenerarAsientos = async () => {
    if (saving) return;
    if (sucursalActiva === undefined) return;
    const values = form.getFieldsValue();
    if (!values.cuentaBancaria) {
      message.error('Debe ingresar una Cuenta Bancaria para generar los asientos.');
      return;
    }
    setSaving(true);
    setErrorGeneracion(null);
    try {
      const dto = construirDTOGenerarAsientos();
      const asientosGenerados = await solicitudPagoApi.generarAsientos(sucursalActiva, dto);
      setAsientos((prev) => {
        const manuales = prev.filter((a) => a.generado === false);
        return [...manuales, ...asientosGenerados];
      });
      message.success(`Se generaron ${asientosGenerados.length} asientos`);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al generar asientos');
      setErrorGeneracion(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAgregarAsientoManual = (cuenta: { noCuenta: string; nombre: string }) => {
    if (saving) return;
    const nuevoAsiento: AsientoContableDTO = {
      id: Date.now(),
      cuentaContable: { noCuenta: cuenta.noCuenta, nombre: cuenta.nombre },
      monto: 0,
      tipoAsiento: 'D',
      generado: false,
      descripcion: '',
    };
    setAsientos((prev) => [...prev, nuevoAsiento]);
  };

  const handleGuardarConMonto = async (monto: number) => {
    if (saving) return;
    setSaving(true);
    try {
      const dto = construirDTO();
      // Si hay documentos relacionados, no usar subTotal como monto; usar monto del modal
      const tieneDocs = transaccionesAsociadas && transaccionesAsociadas.length > 0;
      const dtoConMonto = {
        ...dto,
        subTotal: monto,
        transaccionesAsociadas: tieneDocs ? transaccionesAsociadas.map((t) => ({
          ...t,
          transaccionAsociadaID: t.transaccionAsociadaID || t.id,
          saldoPendiente: pendienteEfectivo(t),
        })) : [],
      } as SolicitudPagoCrearDTO | SolicitudPagoActualizarDTO;

      // Generar asientos si no existen (como en handleGuardar)
      let asientosActualizados = asientos || [];
      if (!asientos || asientos.length === 0) {
        try {
          const tempDTO = construirDTOGenerarAsientos();
          const generados = await solicitudPagoApi.generarAsientos(sucursalActiva, tempDTO);
          setAsientos((prev) => {
            const manuales = prev.filter((a) => a.generado === false);
            return [...manuales, ...generados];
          });
          asientosActualizados = generados;
        } catch (errAsientos) {
          message.warning('No se pudo generar asientos automáticamente');
        }
      }
      const dtoConAsientos = {
        ...dtoConMonto,
        asientos: asientosActualizados,
      };
      if (mode === 'crear') {
        const result = await solicitudPagoApi.crear(sucursalActiva, dtoConAsientos as SolicitudPagoCrearDTO);
        navigationConfirmedRef.current = true;
        message.success('Solicitud de pago creada exitosamente');
        navigate(`/FSPA/${result.id}`, { replace: true });
      } else {
        await solicitudPagoApi.actualizar(sucursalActiva, dtoConAsientos as SolicitudPagoActualizarDTO);
        navigationConfirmedRef.current = true;
        message.success('Solicitud de pago actualizada exitosamente');
        navigate(`/FSPA/${id}`, { replace: true });
      }
    } catch (err: any) {
      console.log('Error al guardar con monto:', err);
      const msg = extraerMensajeError(err, 'Error al guardar con monto');
      message.error(msg);
    } finally {
      setSaving(false);
      setModalMontoSinDocsOpen(false);
      setModalMontoSinDocsValue(0);
    }
  };

  // ===== Cancelar =====
  const handleCancelar = () => {
    Modal.confirm({
      title: 'Cancelar',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro que desea cancelar los cambios realizados?',
      okText: 'Sí, cancelar',
      cancelText: 'No, continuar editando',
      okButtonProps: { danger: true },
      onOk: () => {
        navigationConfirmedRef.current = true;
        if (mode === 'crear') {
          navigate('/FSPA', { replace: true });
        } else if (id) {
          navigate(`/FSPA/${id}`, { replace: true });
        }
      },
    });
  };

  // ===== Validación =====
  const validarFormulario = () => {
    if (!selectedConcepto)
      return 'Debe seleccionar un Concepto';
    if (!selectedEntidad)
      return 'Debe seleccionar una Entidad';
    if (!selectedEntidad?.codigo)
      return 'La entidad seleccionada no tiene un código válido';
    const values = form.getFieldsValue();
    if (!values.cuentaBancaria)
      return 'Debe ingresar una Cuenta Bancaria';
    if (totalesDocs.subTotal < 0)
      return 'SubTotal no puede ser negativo';
    return null;
  };

  // ===== Guardar =====
  const handleGuardar = async () => {
    const error = validarFormulario();
    if (error) {
      message.error(error);
      return;
    }

    // Validación para avance de efectivo (sin documentos relacionados)
    const noHayDocsRelacionados = !transaccionesAsociadas || transaccionesAsociadas.length === 0;

    if (noHayDocsRelacionados) {
      const savedTotal = mode === 'editar'
        ? (data?.subTotal ?? data?.total ?? totalCalculado)
        : totalCalculado;
      setModalMontoSinDocsValue(savedTotal);
      setModalMontoSinDocsOpen(true);
      return;
    }

    setSaving(true);
    try {
      // Generar asientos si no existen
      let asientosActualizados = asientos || [];
      if (!asientos || asientos.length === 0) {
        try {
          const tempDTO = construirDTOGenerarAsientos();
          const generados = await solicitudPagoApi.generarAsientos(sucursalActiva, tempDTO);
          setAsientos((prev) => {
            const manuales = prev.filter((a) => a.generado === false);
            return [...manuales, ...generados];
          });
          asientosActualizados = generados;
        } catch (errAsientos) {
          message.warning('No se pudo generar asientos automáticamente');
        }
      }
      const dto = construirDTO();
      const dtoConAsientos = {
        ...dto,
        asientos: asientosActualizados,
      };
      if (mode === 'crear') {
        const result = await solicitudPagoApi.crear(sucursalActiva, dtoConAsientos as SolicitudPagoCrearDTO);
        navigationConfirmedRef.current = true;
        message.success('Solicitud de pago creada exitosamente');
        navigate(`/FSPA/${result.id}`, { replace: true });
      } else {
        await solicitudPagoApi.actualizar(sucursalActiva, dtoConAsientos as SolicitudPagoActualizarDTO);
        navigationConfirmedRef.current = true;
        message.success('Solicitud de pago actualizada exitosamente');
        navigate(`/FSPA/${id}`, { replace: true });
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== Refresh =====
  const handleRefresh = useCallback(() => {
    if (mode === 'crear') return;
    if (!id) return;
    setLoadingError(false);
    setLoading(true);
    solicitudPagoApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setAsientos(res.asientos || []);
        setLogs(res.logs || []);
        setTransaccionesAsociadas((res.transaccionesAsociadas || []).map(normalizarAsociada));
        const resAny = res as any;
        const conceptoRaw = resAny.concepto;
        const conceptoH = typeof conceptoRaw === 'object' && conceptoRaw !== null ? conceptoRaw as ConceptoDTO : null;
        const conceptoCodigoH = conceptoH?.codigo || '';
        if (conceptoH) {
          setSelectedConcepto({ ...conceptoH, codigo: conceptoCodigoH });
          setConceptoSearchText(`${conceptoCodigoH} - ${conceptoH.nombre || ''}`);
          if (conceptoCodigoH) {
            cargarEntidades(conceptoCodigoH);
          }
        }
        const tipoRaw = resAny.tipo;
        setTipoValue(tipoRaw?.codigo || resAny.codigoTipo || '');
        const tipoPagoRaw = (res as any).tipoPagoCodigo;
        if (tipoPagoRaw) setTipoPago(tipoPagoRaw);
        const entidadRaw = resAny.entidad;
        const entidadH = typeof entidadRaw === 'object' && entidadRaw !== null ? entidadRaw as EntidadDTO : null;
        const entidadCodigoH = entidadH?.codigo || (typeof entidadRaw === 'string' ? entidadRaw : '');
        if (entidadH) {
          setSelectedEntidad({ ...entidadH, codigo: entidadCodigoH });
        }
        // Fecha (forzar interpretación local para evitar desplazamiento UTC)
        const fechaDoc = res.fechaDocumento ? dayjs(res.fechaDocumento.substring(0, 10)) : null;
        form.setFieldsValue({
          fechaDocumento: fechaDoc,
          tipo: tipoRaw?.codigo || resAny.codigoTipo || '',
          concepto: conceptoH?.codigo || '',
          entidad: entidadCodigoH,
          cuentaBancaria: res.cuentaBancaria || '',
          referencia: res.referencia || '',
          ncf: res.ncf || '',
          tipoPago: (res as any).tipoPagoCodigo || '',
          nota: res.nota || '',
subTotal: res.subTotal ?? 0,
        descuento: res.descuento ?? 0,
        impuestos: res.impuestos ?? 0,
        retenciones: res.retenciones ?? 0,
        tasa: res.tasa ?? 1,
        nombreBeneficiario: res.nombreBeneficiario || entidadH?.beneficiario?.trim() || '',
      });
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al recargar');
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, form, mode, message, cargarEntidades]);

  // ===== Loading state =====
  if (loading) {
    return <LoadingSpinner mensaje="Cargando documento..." />;
  }

  // ===== Estado info =====
  const estado = data?.estado ?? 0;
  const periodo = data?.periodo;

  // ===== Encabezado del formulario =====
  const renderEncabezado = () => (
    <Card
      className="paces-card"
      size="small"
      title="Datos de la Solicitud de Pago"
      style={{ marginBottom: 16 }}
    >
      <Row gutter={16}>
        <Col xs={24} xxl={18}>
          <Form form={form} layout="vertical" size="middle" style={{ paddingTop: 24 }}>
            <Row gutter={[16, 24]}>
              {/* Fila 1: Cuenta Bancaria + Concepto + Referencia */}
              <Col xs={24} sm={12} lg={8}>
                <Form.Item name="cuentaBancaria" hidden>
                  <Input />
                </Form.Item>
                <FloatingField label="Cuenta Bancaria" required>
                  <Input
                    placeholder=" "
                    readOnly
                    value={
                      selectedCuenta
                        ? `${selectedCuenta.noCuenta}`
                        : ''
                    }
                    onClick={() => setCuentaModalOpen(true)}
                    suffix={
                      <Space size={4}>
                        <SearchOutlined
                          style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }}
                          onClick={() => setCuentaModalOpen(true)}
                        />
                        {selectedCuenta && (
                          <CloseOutlined
                            onClick={(e) => { e.stopPropagation(); handleCuentaClear(); }}
                            style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }}
                          />
                        )}
                      </Space>
                    }
                  />
                </FloatingField>
              </Col>

              <Col xs={24} sm={12} lg={8}>
                <div>
                  <FloatingField label="Concepto" required>
                    <Input
                      placeholder=" "
                      value={
                        selectedConcepto
                          ? toTitleCase(selectedConcepto.nombre)
                          : conceptoSearchText
                      }
                      readOnly
                      suffix={<SearchOutlined style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }} />}
                      onClick={() => setConceptoModalOpen(true)}
                    />
                  </FloatingField>
                </div>
                <Form.Item name="concepto" hidden>
                  <Input />
                </Form.Item>
                <ConceptoInfoLabel concepto={selectedConcepto} />
              </Col>

              <Col xs={24} sm={12} lg={8}>
                <Form.Item name="referencia" style={{ marginBottom: 0 }}>
                  <FloatingField label="Referencia">
                    <Input placeholder="Referencia del documento" />
                  </FloatingField>
                </Form.Item>
              </Col>

              {/* Fila 2: Fecha + Entidad + Tipo Doc a Generar */}
              <Col xs={24} sm={12} lg={8}>
                <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }}>
                  <FloatingField label="Fecha" required>
                    <DatePicker
                      style={{ width: '100%' }}
                      format="YYYY-MM-DD"
                      disabledDate={(current) => {
                        if (!current) return false;
                        if ((data as any)?.documento?.fechaPermitida === 'MenorIgualFechaDia') {
                          if (current.isAfter(dayjs(), 'day')) return true;
                        }
                        const cierre = fechasCierre?.[sucursalActiva];
                        if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day')) return true;
                        const cierreInv = fechasCierreInv?.[sucursalActiva];
                        if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day')) return true;
                        return false;
                      }}
                    />
                  </FloatingField>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} lg={8}>
                <Form.Item name="entidad" required style={{ marginBottom: 0 }}>
                  <FloatingField label="Entidad" required>
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      notFoundContent="Seleccione un concepto primero"
                      onChange={(val) => {
                        const ent = entidadesCache.find((e: any) => e.codigo === val);
                        setSelectedEntidad(ent || null);
                        form.setFieldsValue({
                          nombreBeneficiario: ent?.beneficiario?.trim() || '',
                        });
                      }}
                      onDropdownVisibleChange={(open) => {
                        if (open && !selectedConcepto) {
                          message.info('Seleccione un concepto primero');
                        }
                      }}
                    >
                      {entidadesCache.map((ent: any) => (
                        <Select.Option key={ent.codigo} value={ent.codigo}>
                          {toTitleCase(ent.nombre)}
                          {ent.identificacion ? ` (${ent.identificacion})` : ''}
                        </Select.Option>
                      ))}
                    </Select>
                  </FloatingField>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} lg={8}>
                <Form.Item name="tipoPago" style={{ marginBottom: 0 }}>
                  <FloatingField label="Tipo de Pago a Generar">
                    <Select
                      allowClear
                      placeholder="Seleccione tipo de pago"
                      value={tipoPago || undefined}
                      onChange={(val) => setTipoPago(val || '')}
                    >
                      {TIPOS_PAGO.map((tp) => (
                        <Select.Option key={tp.codigo} value={tp.codigo}>
                          <BankOutlined style={{ marginRight: 6, color: '#556ee6' }} />
                          {tp.nombre} ({tp.codigo})
                        </Select.Option>
                      ))}
                    </Select>
                  </FloatingField>
                </Form.Item>
              </Col>

              {/* Fila 3: Nota + Beneficiario */}
              <Col xs={24} sm={12} lg={16}>
                <Form.Item name="nota" style={{ marginBottom: 0 }}>
                  <FloatingField label="Nota">
                    <TextArea rows={3} maxLength={500} showCount />
                  </FloatingField>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} lg={8}>
                <Form.Item name="nombreBeneficiario" style={{ marginBottom: 0 }}>
                  <FloatingField label="Beneficiario">
                    <Input placeholder="Nombre del beneficiario" />
                  </FloatingField>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Col>

        <Col xs={24} xxl={6}>
          <div style={{ marginTop: 24 }}>
            <TotalesCard
              subTotal={totalesDocs.subTotal}
              descuento={totalesDocs.descuento}
              impuestos={totalesDocs.impuestos}
              retenciones={totalesDocs.retenciones}
              total={totalDisplay}
              hideTitle
              monedaSimbolo={monedaSimbolo}
              monedaNombre={monedaNombre}
              tasa={tasaValue ?? 1}
            />
          </div>
        </Col>
      </Row>
    </Card>
  );

  // ===== Pendiente efectivo por fila =====
  // DOCASOC.PENDIENTE puede venir mal (0) cuando en realidad DEBITADO - ACREDITADO != 0.
  // El pendiente efectivo se calcula como max(montoOriginal - pagado, saldoPendiente), nunca negativo.
  const pendienteEfectivo = (t: TransaccionAsociadaForm): number => {
    const v = Math.max(0, (t.montoOriginal || 0) - (t.pagado || 0), t.saldoPendiente || 0);
    return Math.round(v * 100) / 100;
  };

  // ===== Columnas de documentos relacionados (mismo formato que TransaccionBancaria) =====
  const asociadasColumns = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110, render: (v: string) => v ? formatDate(v) : '-' },
    { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 160 },
    { title: 'NCF', dataIndex: 'nCF', key: 'nCF', width: 130, render: (v: string, record: TransaccionAsociadaForm) => v || (record as any).ncf || '-' },
    { title: 'Monto Original', dataIndex: 'montoOriginal', key: 'montoOriginal', width: 130, align: 'right' as const, render: (v: number) => formatNumber(v ?? 0) },
    {
      title: 'Acreditado/Abonado',
      key: 'pagado',
      width: 150,
      align: 'right' as const,
      render: (_: any, record: TransaccionAsociadaForm) => (
        <Text type="secondary">{formatNumber(record.pagado ?? 0)}</Text>
      ),
    },
    {
      title: 'Descuento',
      key: 'descuento',
      width: 140,
      align: 'right' as const,
      render: (_: any, record: TransaccionAsociadaForm) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          className="input-number-right"
          min={0}
          step={0.01}
          precision={2}
          value={record.descuento}
          onChange={(val) => handleDescuentoChange(record.transaccionAsociadaID || record.id, val)}
        />
      ),
    },
    {
      title: 'Documentos Asociados',
      key: 'spaDocumento',
      width: 180,
      render: (_: any, record: TransaccionAsociadaForm) => {
        if (!record.bloqueado) return '-';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tag color="error">{record.spaDocumento || 'SPA bloqueante'}</Tag>
            {record.spaId && <span title={`SPA ID: ${record.spaId}`} style={{ fontSize: 10, color: '#8c8c8c' }}>#{record.spaId}</span>}
          </div>
        );
      },
    },
    {
      title: 'Retenciones',
      key: 'retencion',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: TransaccionAsociadaForm) => formatNumber(record.retencion ?? 0),
    },
    {
      title: 'Monto',
      key: 'monto',
      width: 140,
      align: 'right' as const,
      render: (_: any, record: TransaccionAsociadaForm) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          className="input-number-right"
          min={0}
          max={Math.max(0, pendienteEfectivo(record) - (record.descuento || 0))}
          step={0.01}
          precision={2}
          value={record.monto}
          onChange={(val) => handleMontoChange(record.transaccionAsociadaID || record.id, val)}
        />
      ),
    },
    {
      title: '', key: 'accion', width: 50,
      render: (_: any, record: TransaccionAsociadaForm) => (
        <Button type="text" danger size="small" icon={<DeleteOutlined />}
          onClick={() => handleDocRelacionadoRemove(record.transaccionAsociadaID || record.id)} />
      ),
    },
  ];

  // ===== Tabs =====
  const tabItems = [
    {
      key: 'documentos',
      icon: <FileTextOutlined />,
      label: `Documentos Relacionados (${transaccionesAsociadas.length})`,
      children: (
        <div>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <span className="paces-text-secondary">
                Total: {formatNumber(totalCalculado)} | Distribuido: {formatNumber(totalDistribuido)} |
                Por distribuir: <span style={{ color: porDistribuir > 0 ? '#faad14' : '#52c41a', fontWeight: 600 }}>{formatNumber(porDistribuir)}</span>
              </span>
            </Space>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              disabled={!selectedEntidad || saving}
              onClick={() => setDocumentoModalOpen(true)}
            >
              Agregar
            </Button>
          </div>
          <Table
            dataSource={transaccionesAsociadas}
            columns={asociadasColumns}
            rowKey={(r) => r.transaccionAsociadaID || r.id || Math.random()}
            size="small"
            pagination={false}
            scroll={{ x: 800 }}
            locale={{
              emptyText: (
                <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Empty description="Sin registros" />
                </div>
              ),
            }}
          />
        </div>
      ),
    },
    {
      key: 'asientos',
      label: `Asientos Contables (${asientos.length})`,
      children: (permisoModificarAsientos && estado === 0 && !selectedConcepto?.noAsientos) ? (
        <>
          <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
            <Button icon={<PlusOutlined />} onClick={() => setCuentaModalAsientoOpen(true)} disabled={saving}>
              Agregar asiento manual
            </Button>
          </div>
          <AsientosContableEditables
            asientos={asientos}
            onChange={setAsientos}
            editable={!saving}
            onGenerar={handleGenerarAsientos}
            generando={saving}
          />
        </>
      ) : (
        <AsientosContableTable asientos={asientos} scroll={{ x: 700 }} rowKey={(r: any) => r.id || Math.random()} />
      ),
    },
    {
      key: 'historial',
      icon: <HistoryOutlined />, label: `Historial (${logs.length})`,
      children: (
        <LogTable dataSource={logs} scroll={{ x: 900 }} />
      ),
    },
  ];

  // ===== Render principal =====
  return (
    <div>
      <FormularioToolbar
        mode={mode}
        saving={saving}
        estado={estado}
        periodo={periodo}
        onGuardar={handleGuardar}
        onCancelar={handleCancelar}
      />

      {loadingError && (
        <Alert
          message="Error al cargar el formulario de solicitud de pago"
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

      {errorGeneracion && (
        <Alert
          message="Error al generar asientos"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          description={errorGeneracion}
          closable
          onClose={() => setErrorGeneracion(null)}
        />
      )}

      <BuscarConceptoModal
        open={conceptoModalOpen}
        onClose={() => setConceptoModalOpen(false)}
        onSelect={handleConceptoSelect}
        sucursal={sucursalActiva}
        documento={documentCode}
      />

      <BuscarCuentaBancariaModal
        open={cuentaModalOpen}
        onClose={() => setCuentaModalOpen(false)}
        onSelect={handleCuentaSelect}
        sucursal={sucursalActiva}
      />

      <BuscarDocumentoModal
        open={documentoModalOpen}
        onClose={() => setDocumentoModalOpen(false)}
        onSelect={handleAgregarDocumentos}
        tipoEntidad="SUP"
        codEntidad={selectedEntidad?.codigo || ''}
        montoTotal={totalCalculado}
        documentosIniciales={transaccionesAsociadas
          .map(t => t.id || t.transaccionAsociadaID)
          .filter((id): id is number => id != null && id > 0)}
        transaccionId={id}
        excluirSpaId={id}
        sucursalForBloqueo={sucursalActiva}
      />

      {/* Modal de búsqueda de cuenta contable para asientos manuales */}
<BuscarCuentaContableModal
         open={cuentaModalAsientoOpen}
         onClose={() => setCuentaModalAsientoOpen(false)}
         onSelect={(cuenta) => {
           handleAgregarAsientoManual(cuenta);
           setCuentaModalAsientoOpen(false);
         }}
         sucursal={sucursalActiva}
       />

        {/* Modal para especificar monto cuando no hay documentos relacionados (avance de efectivo) */}
        <Modal
          title="Especificar Monto de Avance de Efectivo"
          open={modalMontoSinDocsOpen}
          onOk={() => {
            if (modalMontoSinDocsValue !== null) {
              handleGuardarConMonto(modalMontoSinDocsValue);
            }
          }}
          onCancel={() => { if (!saving) setModalMontoSinDocsOpen(false); }}
          okText="Confirmar Monto"
          cancelText="Cancelar"
          okButtonProps={{ loading: saving, disabled: saving }}
          cancelButtonProps={{ disabled: saving }}
          width={500}
        >
         <div style={{ padding: 24 }}>
           <p style={{ marginBottom: 16, fontSize: 16 }}>
             No se han especificado documentos relacionados para esta solicitud de pago.
           </p>
           <p style={{ marginBottom: 24, fontSize: 14, color: '#262626' }}>
             Para registrar un <strong>avance de efectivo</strong>, es necesario especificar el monto exacto que se desea desembolsar o adelantar. Este monto será el <strong>total</strong> de la solicitud de pago y se registrará como un avance de efectivo sin documentos relacionados.
           </p>
           <div style={{ marginBottom: 24 }}>
             <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
               Monto del Avance de Efectivo (RD$):
             </label>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={0.01}
                precision={2}
                placeholder="Ingrese el monto..."
                value={modalMontoSinDocsValue ?? 0}
                disabled={saving}
                onChange={(value) => setModalMontoSinDocsValue(value)}
                onPressEnter={() => {
                  if (modalMontoSinDocsValue !== null) {
                    handleGuardarConMonto(modalMontoSinDocsValue);
                  }
                }}
             />
           </div>
           <div style={{ background: '#fff7e6', borderRadius: 4, padding: 16, border: '1px solid #ffd591' }}>
             <p style={{ margin: 0, fontSize: 13, color: '#d96400' }}>
               <strong>Nota importante:</strong> El monto ingresado será el total de la solicitud de pago. No se generará ningún documento relacionado; el sistema registrará este valor como un avance de efectivo.
             </p>
           </div>
         </div>
       </Modal>

      {isLarge ? (
        /* === DESKTOP === */
        <Row gutter={16}>
          <Col xxl={24}>
            {renderEncabezado()}
            <Tabs
              defaultActiveKey="documentos"
              type="card"
              style={{ borderRadius: 8, padding: '0 16px' }}
              items={tabItems}
            />
          </Col>
        </Row>
      ) : (
        /* === MOBILE === */
        <div>
          {renderEncabezado()}
          <Tabs
            defaultActiveKey="documentos"
            type="card"
            style={{ borderRadius: 8, padding: '0 16px' }}
            items={tabItems}
          />
        </div>
      )}
    </div>
  );
};

export default SolicitudPagoFormulario;
