import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Card, Button, Row, Col, Divider, Table,
  Form, Input, InputNumber,  DatePicker, Typography, Modal, Alert, App, Tabs, Dropdown,
} from 'antd';
import { Select } from '../../components/Select';
import {
  SaveOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  BankOutlined,
  TagOutlined,
  DollarOutlined,
  PlusOutlined,
  DeleteOutlined,
  HistoryOutlined,
  FileTextOutlined,
  PrinterOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useCompanyStore } from '../../stores/companyStore';
import { transaccionBancariaApi } from '../../api/transaccionBancariaApi';
import { transaccionApi } from '../../api/transaccionApi';
import { cuentaBancariaApi } from '../../api/cuentaBancariaApi';
import type { CuentaBancariaDTO } from '../../api/cuentaBancariaApi';
import { conceptosApi } from '../../api/conceptosApi';
import { tipoApi } from '../../api/tipoApi';
import { apiClient } from '../../api/client';
import type { TransaccionDTO, TipoDocumentoDTO, TransaccionAsientoDTO } from '../../types/transaccion';
import type { ConceptoDTO, EntidadDTO } from '../../types/entradaAlmacen';
import { OrigenCuenta } from '../../types/contabilidad';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import FormularioToolbar from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { obtenerNombreSucursal } from '../../utils/sucursalEnumMapper';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import BuscarDocumentoModal from '../../components/BuscarDocumentoModal/BuscarDocumentoModal';
import AsientosContableTable from '../../components/AsientosContableTable';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import BuscarCuentaContableModal from '../../components/BuscarCuentaContableModal/BuscarCuentaContableModal';
import LogTable from '../../components/LogTable';
import { toTitleCase, extraerMensajeError, toISOFormat, formatNumber, redondear2 } from '../../utils/formats';
import { esDebito, esCredito } from '../../utils/contabilidad';
import { toEstadoNum } from '../../utils/estadoDocumento';
import MemoField from '../../components/MemoField/MemoField';
import CamposRapidosFila from '../../components/CamposRapidosFila/CamposRapidosFila';
import { reporteChequePopularApi } from '../../api/reporteChequePopularApi';
import type { ReporteChequePopularDTO } from '../../types/reporteChequePopular';

const { Text } = Typography;

// ===== Componente principal =====
const TransaccionBancariaFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const { data: { fechasCierre, fechasCierreInv, documentos } } = useCompanyStore();
  const { message } = App.useApp();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const { screenCode, documentCode } = useScreenConfig('FTransBanco');
  const [form] = Form.useForm();
  const navigationConfirmedRef = useRef(false);
  const impuestosBackupRef = useRef<Map<number, { impuesto?: any; porcentajeImpuesto: number }>>(new Map());

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generandoCheque, setGenerandoCheque] = useState(false);
  const [data, setData] = useState<TransaccionDTO | null>(null);
  const [tipoValue, setTipoValue] = useState<string>('');
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [selectedEntidad, setSelectedEntidad] = useState<EntidadDTO | null>(null);
  const [entidadesCache, setEntidadesCache] = useState<EntidadDTO[]>([]);
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancariaDTO[]>([]);
  const [selectedCuenta, setSelectedCuenta] = useState<string>('');

  // Cuenta bancaria recibida desde el listado FTransBanco (botón Nuevo)
  const cuentaInicial = (location.state as any)?.cuentaCodigo as string | undefined;
  const cuentaFijadaRef = useRef(false);

  // Concepto modal
  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
  const [conceptoSearchText, setConceptoSearchText] = useState('');

  // ===== Tipo Documento =====
  const [tipoDocumentoOpciones, setTipoDocumentoOpciones] = useState<TipoDocumentoDTO[]>([]);
  const [loadingTipos, setLoadingTipos] = useState(false);

  // ===== Documentos Asociados editables =====
  const [documentosAsociados, setDocumentosAsociados] = useState<any[]>([]);
  const [buscarDocModalOpen, setBuscarDocModalOpen] = useState(false);

  // ===== Asientos contables =====
  const [asientos, setAsientos] = useState<TransaccionAsientoDTO[]>([]);
  const [generandoAsientos, setGenerandoAsientos] = useState(false);
  const [cuentaModalAsientoOpen, setCuentaModalAsientoOpen] = useState(false);
  const [errorGeneracion, setErrorGeneracion] = useState<string | null>(null);
  const usuario = useAuthStore((s: any) => s.usuario);
  const permisoModificarAsientos = usuario?.permisosEspeciales?.some((p: any) => p.codigo?.toUpperCase() === 'PE_MODIFICAR_ASIENTOS' && p.valor === true) ?? false;

  // ===== Pendiente efectivo por fila =====
  // DOCASOC.PENDIENTE puede venir mal (0) cuando en realidad DEBITADO - ACREDITADO != 0.
  // El pendiente efectivo se calcula como max(montoOriginal - pagado, saldoPendiente), nunca negativo.
  const pendienteEfectivo = (t: any): number => {
    const v = Math.max(0, (t.montoOriginal || 0) - (t.pagado || 0), t.saldoPendiente || t.pendiente || 0);
    return redondear2(v);
  };

  // ===== Estado para campos rápidos (Referencia, Tasa) =====
  const [editingField, setEditingField] = useState<string | null>(null);
  const editingOriginalValue = useRef<string | number>('');
  const editingValueRef = useRef<string | number>('');
  const fieldCloseHandledRef = useRef(false);

  const openFieldEditor = (field: string) => {
    const val = form.getFieldValue(field);
    const defaultVal = field === 'tasa' ? 1 : '';
    editingOriginalValue.current = val ?? defaultVal;
    editingValueRef.current = val ?? defaultVal;
    setEditingField(field);
    fieldCloseHandledRef.current = false;
  };

  const commitFieldEditor = () => {
    if (fieldCloseHandledRef.current) return;
    fieldCloseHandledRef.current = true;
    const field = editingField;
    if (field) {
      const newValue = editingValueRef.current;
      form.setFieldsValue({ [field]: newValue });
    }
    setEditingField(null);
  };

  const cancelFieldEditor = () => {
    if (fieldCloseHandledRef.current) return;
    fieldCloseHandledRef.current = true;
    const field = editingField;
    if (field) {
      form.setFieldsValue({ [field]: editingOriginalValue.current });
    }
    setEditingField(null);
  };

  // ===== Watchers =====
  const subTotalValue = Form.useWatch('subTotal', form) ?? 0;
  const descuentoValue = Form.useWatch('descuento', form) ?? 0;
  const impuestosValue = Form.useWatch('impuestos', form) ?? 0;
  const retencionesValue = Form.useWatch('retenciones', form) ?? 0;
  const totalValue = Form.useWatch('total', form) ?? 0;
  const refValue = Form.useWatch('referencia', form) || '';
  const tasaValue = Form.useWatch('tasa', form) ?? 1;
  const beneficiarioValue = Form.useWatch('beneficiario', form);

  // ===== Documento efectivo para cargar los conceptos =====
  // Los conceptos bancarios cuelgan de DOCCONCEPTO.CODDOC (por documento), no por tipo.
  // En editar se usa el documento real del DTO; en crear, el tipo seleccionado.
  const documentoConceptos = tipoValue || data?.documento?.codigo || documentCode;

  // ===== ¿El documento exige el contacto (beneficiario)? =====
  // ENTDOC.REQCONTACTO -> DocumentoDTO.RequiereContacto. En editar viene en el
  // documento del DTO; en crear, del catalogo de documentos de la configuracion inicial.
  const requiereContactoDocumento = useMemo(() => {
    const docCodigo = data?.documento?.codigo || selectedConcepto?.docAGenerar || tipoValue;
    const docConfig = docCodigo ? documentos?.find((d: any) => d.codigo === docCodigo) : undefined;
    return Boolean(data?.documento?.requiereContacto ?? docConfig?.requiereContacto);
  }, [data?.documento, selectedConcepto?.docAGenerar, tipoValue, documentos]);

  // ===== Moneda dinámica desde el concepto seleccionado =====
  const monedaSimbolo = selectedConcepto?.moneda?.simbolo || getMonedaSucursalActiva().simbolo;
  const monedaNombre = selectedConcepto?.moneda?.nombre || getMonedaSucursalActiva().nombre;
  // Codigo real de MONEDAS.CODIGO. Antes se deducia del simbolo (`'RD$' ? 'DOP' : 'USD'`),
  // lo que resolvia cualquier otra moneda a USD. `nombre` queda solo como ultimo respaldo.
  const codigoMonedaDocumento =
    selectedConcepto?.moneda?.codigo
    || data?.moneda?.codigo
    || getMonedaSucursalActiva().codigo
    || monedaNombre;

  // ===== Computed totals desde documentos asociados =====
  const sumaMontos = useMemo(
    () => documentosAsociados.reduce((sum, d) => sum + (d.monto || 0), 0),
    [documentosAsociados]
  );
  const sumaDescuentos = useMemo(
    () => documentosAsociados.reduce((sum, d) => sum + (d.descuento || 0), 0),
    [documentosAsociados]
  );

  // SubTotal = sumaMontos + sumaDescuentos (el monto base antes de descuento)
  const subTotalCalculado = Math.round((sumaMontos + sumaDescuentos) * 100) / 100;

  // Total = SubTotal - Descuento + Impuestos - Retenciones = sumaMontos + impuestos - retenciones
  const totalCalculado = Math.round(
    (sumaMontos + (impuestosValue || 0) - (retencionesValue || 0)) * 100
  ) / 100;

  // ===== Sincronizar totales al formulario =====
  // Con documentos relacionados el Total se DERIVA de ellos (no editable),
  // igual que la SPA. Sin documentos (avance al suplidor) se respeta el
  // valor manual del campo.
  useEffect(() => {
    const valores: Record<string, number> = {
      subTotal: subTotalCalculado,
      descuento: Math.round(sumaDescuentos * 100) / 100,
    };
    if (documentosAsociados.length > 0) {
      valores.total = totalCalculado;
    }
    form.setFieldsValue(valores);
  }, [sumaMontos, sumaDescuentos, totalCalculado, documentosAsociados.length, form]);

  // Usar el total que el usuario escribió en el formulario, si lo hay;
  // si no, caer al cálculo automático.
  const totalUsuario = totalValue || totalCalculado;

  // ===== Cargar cuentas bancarias =====
  const cargarCuentasBancarias = useCallback(async () => {
    try {
      const result = await cuentaBancariaApi.obtenerListado(sucursalActiva);
      setCuentasBancarias(result || []);
    } catch {
      message.error('Error al cargar cuentas bancarias');
    }
  }, [sucursalActiva, message]);

  // ===== Pre-selección de cuenta bancaria desde el listado (FTransBanco) =====
  useEffect(() => {
    if (mode !== 'crear') return;
    if (!cuentaInicial || cuentaFijadaRef.current) return;
    const existe = cuentasBancarias.some((c) => c.noCuenta === cuentaInicial);
    if (!existe) return;
    if (form.getFieldValue('cuentaBancaria')) return;
    cuentaFijadaRef.current = true;
    setSelectedCuenta(cuentaInicial);
    form.setFieldsValue({ cuentaBancaria: cuentaInicial });
  }, [mode, cuentaInicial, cuentasBancarias, form]);

  // Cuenta fijada: solo en modo crear y cuando el listado pasó la cuenta activa
  const cuentaFijada = mode === 'crear' && !!cuentaInicial && !!selectedCuenta && selectedCuenta === cuentaInicial;

  // ===== Cargar tipos de documento (mismo mecanismo que RDocAplicado) =====
  const cargarTiposDocumento = useCallback(async () => {
    setLoadingTipos(true);
    try {
      const { data: resp } = await apiClient.get(`/Pantalla/${sucursalActiva}/modulo/7/documentos`);
      const tipos = (resp?.data || []).map((d: any) => ({
        codigo: d.codigo,
        nombre: d.descripcion,
      }));
      setTipoDocumentoOpciones(tipos);
    } catch {
      message.error('Error al cargar tipos de documento');
    } finally {
      setLoadingTipos(false);
    }
  }, [sucursalActiva, message]);

  // ===== Carga inicial =====
  useEffect(() => {
    setActiveModule(screenCode);
    if (mode === 'crear') {
      setPageTitleOverride('Nueva Transacción Bancaria');
    }
    cargarCuentasBancarias();
    cargarTiposDocumento();

    if (mode === 'crear') {
      form.setFieldsValue({
        fechaDocumento: dayjs(),
        tasa: 1,
        subTotal: 0,
        descuento: 0,
        impuestos: 0,
        retenciones: 0,
        beneficiario: '',
      total: totalUsuario,
      });
    }

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, form, cargarCuentasBancarias, cargarTiposDocumento]);

  // ===== Cargar entidades según concepto =====
  const cargarEntidades = useCallback(async (conceptoCodigo?: string) => {
    try {
      const res = await conceptosApi.obtenerEntidadesActivas(sucursalActiva, conceptoCodigo);
      setEntidadesCache(res || []);
    } catch {
      message.error('Error al cargar entidades');
    }
  }, [sucursalActiva, message]);

  // ===== Cargar datos en modo editar =====
  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;

    setLoading(true);
    transaccionBancariaApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          navigate('/FTransBanco', { replace: true });
          return;
        }

        setData(res);

        // Documentos asociados en modo editar
        if (res.transaccionesAsociadas && res.transaccionesAsociadas.length > 0) {
          setDocumentosAsociados(res.transaccionesAsociadas.map((d: any) => ({
            id: d.transaccionAsociadaID ?? d.id ?? Math.random(),
            transaccionAsociadaID: d.transaccionAsociadaID ?? d.id,
            transaccionID: d.id,
            fecha: d.fecha ? dayjs(d.fecha).format('YYYY-MM-DD') : '',
            documento: d.documento || '',
            nCF: d.nCF || d.ncf || '',
            montoOriginal: d.montoOriginal ?? 0,
            monto: d.monto ?? d.montoOriginal ?? 0,
            descuento: d.descuento ?? 0,
            retencion: d.retencion ?? 0,
            pagado: d.pagado ?? 0,
            pendiente: pendienteEfectivo(d),
          })));
        }

        // Concepto
        const conceptoRaw = res.concepto;
        const concepto = typeof conceptoRaw === 'object' && conceptoRaw !== null ? conceptoRaw as unknown as ConceptoDTO : null;
        if (concepto) {
          setSelectedConcepto(concepto);
          setConceptoSearchText(`${concepto.codigo || ''} - ${concepto.nombre || ''}`);
          if (concepto.codigo) {
            cargarEntidades(concepto.codigo);
          }
        }

        // Tipo - usar codigoTipo del DTO, con fallback a tipo?.codigo
        const tipoCodigo = res.tipo?.codigo || '';
        setTipoValue(tipoCodigo);

        // Entidad
        const entidadRaw = res.entidad;
        const entidad = typeof entidadRaw === 'object' && entidadRaw !== null ? entidadRaw as unknown as EntidadDTO : null;
        if (entidad) {
          // El código de entidad puede venir en idExterno en vez de codigo
          setSelectedEntidad({
            ...entidad,
            codigo: entidad.codigo || (entidad as any).idExterno || '',
          });
        } else if (res.codigoEntidad) {
          // Crear entidad sintética desde campos planos cuando la API no devuelve el objeto
          setSelectedEntidad({
            codigo: res.codigoEntidad,
            nombre: res.nombreEntidad || '',
            identificacion: '',
            tipoEntidad: { codigo: res.tipoEntidad || 'SUP', origenCuenta: 1 },
          } as any);
        }

        // Cuenta bancaria: usar ctaBancaria
        const cta = res.ctaBancaria || '';
        setSelectedCuenta(cta);

        // Fecha: usar fechaDocumento
        const fechaDoc = res.fechaDocumento ? dayjs(res.fechaDocumento) : null;

        form.setFieldsValue({
          fechaDocumento: fechaDoc,
          tipo: tipoCodigo,
          concepto: concepto?.codigo || (typeof res.concepto === 'string' ? res.concepto : ''),
          entidad: entidad?.codigo || '',
          cuentaBancaria: cta,
          referencia: res.referencia || '',
          ncf: res.ncf || '',
          nota: res.nota || '',
          subTotal: res.subTotal ?? 0,
          descuento: res.descuento ?? 0,
          impuestos: res.impuestos ?? 0,
          retenciones: res.retenciones ?? 0,
          tasa: res.tasa ?? 1,
          beneficiario: res.nombreBeneficiario || '',
          total: res.total ?? totalCalculado,
        });

        // Mostrar documento en el título
        const docCodigo = res.documento?.codigo || res.codigoTipo || '';
        setPageTitleOverride(`Editar - ${docCodigo}-${res.noDocumento}`);
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar la transacción bancaria');
        message.error(msg);
        setLoadingError(true);
        navigate('/FTransBanco', { replace: true });
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
    window.history.pushState = function (dataArg: any, unused: string, url?: string | URL | null) {
      const currentPath = window.location.pathname;
      const newPath = typeof url === 'string' ? url.split('?')[0] : (url instanceof URL ? url.pathname : null);
      if (newPath && currentPath !== newPath && !navigationConfirmedRef.current) {
        const leave = window.confirm('Los cambios no guardados se perderán. ¿Está seguro que desea salir?');
        if (!leave) return;
        navigationConfirmedRef.current = true;
      }
      return originalPushState(dataArg, unused, url);
    };
    return () => { window.history.pushState = originalPushState; };
  }, []);

  // ===== Handlers de concepto =====
  const handleConceptoSelect = (concepto: ConceptoDTO) => {
    setSelectedConcepto(concepto);
    setConceptoSearchText('');
    setSelectedEntidad(null);
    setDocumentosAsociados([]);

    if (concepto.codigo) {
      cargarEntidades(concepto.codigo);
    }

    // === ConfigurarMoneda ===
    const monedaObj = concepto.moneda || getMonedaSucursalActiva();
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, codigoMoneda: monedaObj.codigo || monedaObj.nombre };
    });

    form.setFieldsValue({
      concepto: concepto.codigo,
      entidad: undefined,
      moneda: monedaObj.nombre,
      tasa: monedaObj.tasa ?? 1,
    });

    // === NoImpuesto ===
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
    setDocumentosAsociados([]);
    form.setFieldsValue({ concepto: '', entidad: undefined });
  };

  // ===== Cambio de tipo de documento =====
  const handleTipoChange = (val?: string) => {
    setTipoValue(val || '');
    if (selectedConcepto) {
      handleConceptoClear();
      message.info('Cambió el tipo de documento. Seleccione el concepto nuevamente.');
    }
  };

  // ===== Handlers de navegación =====
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
          navigate('/FTransBanco', { replace: true });
        } else if (id) {
          navigate(`/FTransBanco/${id}`, { replace: true });
        }
      },
    });
  };

  // ===== Validación =====
  const validarFormulario = (): string | null => {
    if (mode === 'crear' && !tipoValue) return 'Debe seleccionar el Tipo Documento';
    if (!selectedConcepto) return 'Debe seleccionar un Concepto';
    
    const values = form.getFieldsValue();
    if (!values.cuentaBancaria) return 'Debe seleccionar una Cuenta Bancaria';
    if (subTotalValue < 0) return 'SubTotal no puede ser negativo';

    // El contacto (beneficiario) solo se exige cuando el documento tiene
    // activo ENTDOC.REQCONTACTO. Con la bandera apagada el campo queda opcional.
    if (requiereContactoDocumento) {
      const conceptoTieneEntidades = selectedConcepto.Entidades?.length > 0;

      if (conceptoTieneEntidades) {
        // Concept works with entity types: need entity OR beneficiario
        if (!selectedEntidad && !beneficiarioValue) return 'Debe seleccionar una Entidad o ingresar un Beneficiario';
      } else {
        // Concept does NOT work with entity types: entity not needed, but beneficiario is required
        if (!beneficiarioValue) return 'Debe ingresar un Beneficiario';
      }
    }

    // Validar asientos cuadrados
    if (asientos.length > 0) {
      const deb = asientos.reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
      const cred = asientos.reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);
      if (Math.abs(deb - cred) > 0.01) return 'Los asientos contables no están cuadrados';
    }

    return null;
  };

  // ===== Construir DTO =====
  const construirDTO = (): Partial<TransaccionDTO> => {
    const values = form.getFieldsValue();
    const tipoEntidadStr = selectedEntidad?.tipoEntidad?.codigo || (selectedEntidad as any)?.tipo || 'SUP';

    const fechaDoc = values.fechaDocumento
      ? toISOFormat(values.fechaDocumento.toDate())
      : toISOFormat(new Date());

    const totalDocumento = documentosAsociados.length > 0
      ? totalCalculado
      : (form.getFieldValue('total') ?? 0);

    const dto: Partial<TransaccionDTO> = {
      fechaDocumento: fechaDoc,
      codigoTipo: tipoValue || '',
      codigoConcepto: selectedConcepto?.codigo || '',
      codigoEntidad: selectedEntidad?.codigo || selectedEntidad?.identificacion || '',
      nombreEntidad: selectedEntidad?.nombre || data?.nombreEntidad || '',
      numeroCuenta: selectedEntidad?.cuentaContable?.noCuenta || data?.entidad?.cuentaContable?.noCuenta || '',
      codigoSucursal: data?.sucursal?.sucursal ? String(data.sucursal.sucursal) : String(sucursalActiva),
      ctaBancaria: values.cuentaBancaria || '',
      referencia: values.referencia || '',
      ncf: values.ncf || '',
      nota: values.nota || '',
      subTotal: documentosAsociados.length > 0
        ? subTotalCalculado
        : redondear2(totalDocumento - (retencionesValue || 0)),
      descuento: sumaDescuentos,
      impuestos: impuestosValue,
      retenciones: retencionesValue,
      total: totalDocumento,
      tasa: tasaValue,
      nombreBeneficiario: values.beneficiario || undefined,
      codigoMoneda: codigoMonedaDocumento,
      asientos: asientos || [],
      entidad: selectedEntidad ? {
        codigo: selectedEntidad?.codigo || '',
        nombre: selectedEntidad?.nombre || data?.nombreEntidad || '',
        tipoEntidad: selectedEntidad?.tipoEntidad || data?.entidad?.tipoEntidad || { codigo: tipoEntidadStr, origenCuenta: 1 },
        cuentaContable: selectedEntidad?.cuentaContable || data?.entidad?.cuentaContable || undefined,
      } : undefined,
      transaccionesAsociadas: documentosAsociados.map(d => ({
        id: d.transaccionID ?? data?.id ?? 0,
        transaccionAsociadaID: d.transaccionAsociadaID ?? d.id,
        monto: d.monto ?? 0,
        montoOriginal: d.montoOriginal ?? 0,
        descuento: d.descuento ?? 0,
        retencion: d.retencion ?? 0,
        nCF: d.nCF,
        documento: d.documento,
        pagado: d.pagado ?? 0,
        saldoPendiente: pendienteEfectivo(d),
      })),
    };

    if (mode === 'editar' && id) {
      dto.id = data?.id || parseInt(id);
      if (data?.documento?.codigo) {
        (dto as any).tipoDocumento = data.documento.codigo;
      }
    } else if (mode === 'crear') {
      // El documento creado no debe quedar como 'AID' (enum por defecto del backend).
      // Enviar el código de documento seleccionado; el backend usa JsonStringEnumConverter.
      (dto as any).tipoDocumento = tipoValue;
    }

    const docCodigo = data?.documento?.codigo || selectedConcepto?.docAGenerar || tipoValue;
    const docConfig = docCodigo ? useCompanyStore.getState().data.documentos?.find((d: any) => d.codigo === docCodigo) : undefined;
    if (docCodigo) {
      dto.documento = {
        codigo: docCodigo,
        origenCuenta: data?.documento?.origenCuenta ?? docConfig?.origenCuenta ?? OrigenCuenta.Desconocido,
      };
    }

    return dto;
  };

  // ===== Guardar =====
  const handleGuardar = async () => {
    const error = validarFormulario();
    if (error) {
      message.error(error);
      return;
    }

    setSaving(true);
    try {
      const dto = construirDTO();
      if (mode === 'crear') {
        const { id: idCreado, warning } = await transaccionBancariaApi.crearDocBancario(sucursalActiva, dto);
        navigationConfirmedRef.current = true;
        if (warning) {
          message.warning(warning);
        } else {
          message.success('Transacción bancaria creada exitosamente');
        }
        navigate(`/FTransBanco/${idCreado}`, { replace: true });
      } else {
        await transaccionBancariaApi.actualizar(sucursalActiva, dto);
        navigationConfirmedRef.current = true;
        message.success('Transacción bancaria actualizada exitosamente');
        navigate(`/FTransBanco/${id}`, { replace: true });
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAgregarAsientoManual = (cuenta: any) => {
    const nuevoAsiento: any = {
      id: Date.now(),
      cuentaContable: { noCuenta: cuenta.noCuenta, nombre: cuenta.nombre },
      monto: 0,
      tipoAsiento: 'D',
      generado: false,
      descripcion: '',
    };
    setAsientos((prev) => [...prev, nuevoAsiento as unknown as TransaccionAsientoDTO]);
  };

  const handleGenerarAsientos = async () => {
    setGenerandoAsientos(true);
    setErrorGeneracion(null);
    try {
      const dto = construirDTO();
      const generados = await transaccionApi.generarAsientos(sucursalActiva, dto);
      setAsientos((generados || []) as TransaccionAsientoDTO[]);
      setErrorGeneracion(null);
      message.success(`Se generaron ${generados.length} asientos`);
    } catch (err: any) {
      setErrorGeneracion(extraerMensajeError(err, 'Error al generar asientos'));
    } finally {
      setGenerandoAsientos(false);
    }
  };

  // ===== Refresh =====
  const handleRefresh = useCallback(() => {
    if (mode === 'crear') return;
    if (!id) return;
    setLoadingError(false);
    setLoading(true);
    transaccionBancariaApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setAsientos((res.asientos as TransaccionAsientoDTO[]) || []);

        // Recargar documentos asociados
        if (res.transaccionesAsociadas && res.transaccionesAsociadas.length > 0) {
          setDocumentosAsociados(res.transaccionesAsociadas.map((d: any) => ({
            id: d.transaccionAsociadaID ?? d.id ?? Math.random(),
            transaccionAsociadaID: d.transaccionAsociadaID ?? d.id,
            transaccionID: d.id,
            fecha: d.fecha ? dayjs(d.fecha).format('YYYY-MM-DD') : '',
            documento: d.documento || '',
            nCF: d.nCF || d.ncf || '',
            montoOriginal: d.montoOriginal ?? 0,
            monto: d.monto ?? d.montoOriginal ?? 0,
            descuento: d.descuento ?? 0,
            retencion: d.retencion ?? 0,
            pagado: d.pagado ?? 0,
            pendiente: pendienteEfectivo(d),
          })));
        }

        const conceptoRaw = res.concepto;
        const conceptoH = typeof conceptoRaw === 'object' && conceptoRaw !== null ? conceptoRaw as unknown as ConceptoDTO : null;
        if (conceptoH) {
          setSelectedConcepto(conceptoH);
          setConceptoSearchText(`${conceptoH.codigo || ''} - ${conceptoH.nombre || ''}`);
        }
        const tipoDocObj = res.documento;
        const tipoCodigo = res.tipo?.codigo || '';
        setTipoValue(tipoCodigo);
        const entidadRaw = res.entidad;
        const entidadH = typeof entidadRaw === 'object' && entidadRaw !== null ? entidadRaw as unknown as EntidadDTO : null;
        if (entidadH) {
          // El código de entidad puede venir en idExterno en vez de codigo
          setSelectedEntidad({
            ...entidadH,
            codigo: entidadH.codigo || (entidadH as any).idExterno || '',
          });
        } else if (res.codigoEntidad) {
          // Crear entidad sintética desde campos planos cuando la API no devuelve el objeto
          setSelectedEntidad({
            codigo: res.codigoEntidad,
            nombre: res.nombreEntidad || '',
            identificacion: '',
            tipoEntidad: { codigo: res.tipoEntidad || 'SUP', origenCuenta: 1 },
          } as any);
        }
        setSelectedCuenta(res.ctaBancaria || '');
        const fechaDoc = res.fechaDocumento ? dayjs(res.fechaDocumento) : null;
        form.setFieldsValue({
          fechaDocumento: fechaDoc,
          tipo: tipoDocObj?.codigo || (res as any).codigoTipo || '',
          concepto: conceptoH?.codigo || '',
          entidad: entidadH?.codigo || '',
          cuentaBancaria: res.ctaBancaria || '',
          referencia: res.referencia || '',
          ncf: res.ncf || '',
          nota: res.nota || '',
          subTotal: res.subTotal ?? 0,
          descuento: res.descuento ?? 0,
          impuestos: res.impuestos ?? 0,
          retenciones: res.retenciones ?? 0,
          tasa: res.tasa ?? 1,
          beneficiario: res.nombreBeneficiario || '',
          total: res.total ?? totalCalculado,
        });

        // Mostrar documento en el título
        const docCodigoRefresh = res.documento?.codigo || res.codigoTipo || '';
        setPageTitleOverride(`Editar - ${docCodigoRefresh}-${res.noDocumento}`);
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al recargar');
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, form, mode, message]);

  // ===== Handlers de documentos asociados =====
  const handleMontoChange = useCallback((id: number, value: number | null) => {
    setDocumentosAsociados(prev =>
      prev.map(d => (d.transaccionAsociadaID ?? d.id) === id ? { ...d, monto: Math.min(value ?? 0, pendienteEfectivo(d)) } : d)
    );
  }, []);

  const handleDescuentoChange = useCallback((id: number, value: number | null) => {
    setDocumentosAsociados(prev =>
      prev.map(d => (d.transaccionAsociadaID ?? d.id) === id ? { ...d, descuento: value ?? 0 } : d)
    );
  }, []);

  const handleRemoveDoc = useCallback((id: number) => {
    setDocumentosAsociados(prev =>
      prev.filter(d => (d.transaccionAsociadaID ?? d.id) !== id)
    );
  }, []);

  const handleDocumentosSeleccionados = useCallback((docs: any[]) => {
    setDocumentosAsociados(prev => {
      const existingIds = new Set(prev.map(d => d.transaccionAsociadaID ?? d.id));
      const nuevos = docs.filter((d: any) => !existingIds.has(d.transaccionAsociadaID ?? d.id));
      return [...prev, ...nuevos.map((d: any) => ({
        id: d.transaccionAsociadaID ?? d.id,
        transaccionAsociadaID: d.transaccionAsociadaID ?? d.id,
        transaccionID: d.transaccionID,
        fecha: d.fecha ? dayjs(d.fecha).format('YYYY-MM-DD') : '',
        documento: d.documento || '',
        nCF: d.ncf || d.nCF || '',
        montoOriginal: d.montoOriginal || 0,
        monto: d.monto ?? d.montoOriginal ?? 0,
        descuento: 0,
        retencion: d.retencion ?? 0,
        pagado: d.pagado ?? d.acreditado ?? 0,
        pendiente: pendienteEfectivo(d),
      }))];
    });
  }, []);

  // ===== Cheque de Banco Popular =====
  // El formato de cheque Popular solo aplica a documentos de tipo Cheque (CHK) cuya
  // cuenta bancaria pertenezca al Banco Popular. Los demas bancos y tipos conservan el flujo actual.
  const cuentaSeleccionada = useMemo(
    () => cuentasBancarias.find((c) => c.noCuenta === selectedCuenta),
    [cuentasBancarias, selectedCuenta]
  );

  const esChequePopular = useMemo(() => {
    const esTipoCheque = tipoValue.trim().toUpperCase() === 'CHK';
    const codigoBanco = cuentaSeleccionada?.codigoBanco?.trim();
    const banco = (cuentaSeleccionada?.banco || '').toUpperCase();
    return esTipoCheque && (codigoBanco === '001' || banco.includes('POPULAR'));
  }, [tipoValue, cuentaSeleccionada]);

  /** Arma el DTO del reporte con los valores actuales del formulario. */
  const construirPayloadCheque = (
    documento: TransaccionDTO | null,
    noDocumento: string
  ): ReporteChequePopularDTO => {
    const values = form.getFieldsValue();
    const fecha = values.fechaDocumento ? dayjs(values.fechaDocumento) : dayjs();

    return {
      id: documento?.id ?? 0,
      fechaDocumento: toISOFormat(fecha.toDate()),
      tipoDocumento: tipoValue || documento?.codigoTipo || 'CHK',
      noDocumento,
      codigoEntidad: selectedEntidad?.codigo || documento?.codigoEntidad || '',
      nombreEntidad: selectedEntidad?.nombre || documento?.nombreEntidad || '',
      ctaBancaria: values.cuentaBancaria || selectedCuenta || '',
      concepto: selectedConcepto?.nombre || '',
      referencia: values.referencia || '',
      total: totalUsuario ?? 0,
      // Si el usuario no escribio el beneficiario, se usa el del documento o el de la entidad.
      nombreBeneficiario: values.beneficiario || documento?.nombreBeneficiario || selectedEntidad?.nombre || '',
      montoEnLetras: '',
      estado: documento?.estado ?? 0,
      notas: values.nota || '',
    };
  };

  /** Mensaje de error del backend cuando la respuesta viene como Blob (responseType: 'blob'). */
  const mensajeErrorReporte = async (err: any, fallback: string): Promise<string> => {
    const data = err?.response?.data;
    if (data instanceof Blob) {
      try {
        const texto = await data.text();
        if (texto) {
          const parsed = JSON.parse(texto);
          if (parsed?.errorMessage) return parsed.errorMessage;
        }
      } catch {
        // Respuesta no JSON: se usa el mensaje generico.
      }
    }
    return extraerMensajeError(err, fallback);
  };

  /**
   * Vista previa e impresion del cheque Popular. En modo crear el documento se guarda
   * primero, porque el numero de cheque sale del documento persistido.
   */
  const handleChequePopular = async (accion: 'vista-previa' | 'imprimir') => {
    if (!esChequePopular || saving || generandoCheque) return;

    const error = validarFormulario();
    if (error) {
      message.error(error);
      return;
    }

    const beneficiario = (
      form.getFieldValue('beneficiario')
      || data?.nombreBeneficiario
      || selectedEntidad?.nombre
      || ''
    ).trim();

    if (!beneficiario) {
      message.error('Debe indicar el beneficiario del cheque');
      return;
    }

    if (mode === 'editar' && form.isFieldsTouched()) {
      message.warning('Hay cambios sin guardar: el cheque se genera con los datos en pantalla.');
    }

    setSaving(true);
    setGenerandoCheque(true);
    try {
      let documento = data;
      let noDocumento = data?.noDocumento || '';
      let idParaNavegar: number | null = null;

      if (mode === 'crear') {
        const { id: idCreado, warning } = await transaccionBancariaApi.crearDocBancario(
          sucursalActiva,
          construirDTO()
        );
        idParaNavegar = idCreado;
        documento = await transaccionBancariaApi.obtenerPorId(sucursalActiva, idCreado);
        noDocumento = documento?.noDocumento || '';
        setData(documento);
        if (warning) message.warning(warning);
        else message.success('Transacción bancaria guardada');
      }

      if (accion === 'imprimir' && toEstadoNum(documento?.estado) === 3) {
        message.warning('El documento está anulado: revise el cheque antes de usarlo.');
      }

      const payload = construirPayloadCheque(documento, noDocumento);
      const blob = accion === 'vista-previa'
        ? await reporteChequePopularApi.vistaPrevia(sucursalActiva, payload)
        : await reporteChequePopularApi.imprimir(sucursalActiva, payload);

      window.open(URL.createObjectURL(blob), '_blank');

      if (idParaNavegar) {
        navigationConfirmedRef.current = true;
        navigate(`/FTransBanco/${idParaNavegar}`, { replace: true });
      }
    } catch (err: any) {
      message.error(await mensajeErrorReporte(err, 'Error al generar el cheque de Banco Popular'));
    } finally {
      setSaving(false);
      setGenerandoCheque(false);
    }
  };

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
      title="Datos de la Transacción Bancaria"
      style={{ marginBottom: 16 }}
    >
      <Form form={form} layout="vertical" size="middle" style={{ paddingTop: 24 }}>
        <Row gutter={[16, 24]}>
          {/* Fila 1: Tipo | Concepto */}
          <Col xs={24} sm={12}>
            <Form.Item name="tipo" style={{ marginBottom: 0 }}>
              <FloatingField label="Tipo Documento" required>
                {mode === 'editar' && data?.documento?.nombre ? (
                  <Text style={{ padding: '4px 12px', display: 'block', lineHeight: '32px', background: '#f5f5f5', borderRadius: 4 }}>
                    {toTitleCase(data.documento.nombre)} ({data.documento.codigo})
                  </Text>
                ) : (
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder=" "
                    value={tipoValue || undefined}
                    onChange={handleTipoChange}
                    loading={loadingTipos}
                    notFoundContent={!loadingTipos && tipoDocumentoOpciones.length === 0 ? 'No hay tipos disponibles' : undefined}
                  >
                    {tipoDocumentoOpciones.map((t) => (
                      <Select.Option key={t.codigo} value={t.codigo} label={toTitleCase(t.nombre)}>
                        {toTitleCase(t.nombre)}
                      </Select.Option>
                    ))}
                  </Select>
                )}
              </FloatingField>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
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
                  onClick={() => {
                    if (mode === 'crear' && !tipoValue) {
                      message.info('Seleccione el Tipo Documento primero');
                      return;
                    }
                    setConceptoModalOpen(true);
                  }}
                />
              </FloatingField>
            </div>
            <Form.Item name="concepto" hidden>
              <Input />
            </Form.Item>
            <ConceptoInfoLabel concepto={selectedConcepto} />
          </Col>

          {/* Fila 2: Fecha Doc | Entidad */}
          <Col xs={24} sm={12}>
            <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }}>
              <FloatingField label="Fecha" required>
                <DatePicker
                  style={{ width: '100%' }}
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

          <Col xs={24} sm={12}>
            <Form.Item name="entidad" key={selectedConcepto?.codigo || 'empty'} style={{ marginBottom: 0 }}>
              <FloatingField label="Entidad">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  notFoundContent={!selectedConcepto ? 'Seleccione un concepto primero' : (entidadesCache.length === 0 ? 'No hay entidades disponibles' : undefined)}
                  onChange={(val) => {
                    const ent = entidadesCache.find((e: any) => e.codigo === val);
                    setSelectedEntidad(ent || null);
                  }}
                  onOpenChange={(open) => {
                    if (open && !selectedConcepto) {
                      message.info('Seleccione un concepto primero');
                    }
                  }}
                >
                  {entidadesCache.map((ent: any) => (
                    <Select.Option
                      key={ent.codigo}
                      value={ent.codigo}
                      label={toTitleCase(ent.nombre) + (ent.identificacion ? ` (${ent.identificacion})` : '')}
                    >
                      {toTitleCase(ent.nombre)}
                      {ent.identificacion ? ` (${ent.identificacion})` : ''}
                    </Select.Option>
                  ))}
                </Select>
              </FloatingField>
            </Form.Item>
          </Col>

          {/* Fila 3: Cta Bancaria | Beneficiario */}
          <Col xs={24} sm={12}>
            <Form.Item name="cuentaBancaria" required style={{ marginBottom: 0 }}>
              <FloatingField label="Cuenta Bancaria" required>
                {mode === 'editar' ? (
                  <Text style={{ padding: '4px 12px', display: 'block', lineHeight: '32px', background: '#f5f5f5', borderRadius: 4 }}>
                    {selectedCuenta ? (() => { const cta = cuentasBancarias.find(c => c.noCuenta === selectedCuenta); return cta ? `${cta.noCuenta} - ${toTitleCase(cta.nombre)}${cta.banco ? ` (${toTitleCase(cta.banco)})` : ''}` : selectedCuenta; })() : 'No disponible'}
                  </Text>
                ) : (
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    placeholder="Seleccione una cuenta bancaria"
                    value={selectedCuenta || undefined}
                    onChange={(val) => setSelectedCuenta(val || '')}
                    disabled={cuentaFijada}
                    notFoundContent={cuentasBancarias.length === 0 ? 'No hay cuentas disponibles' : undefined}
                  >
                    {cuentasBancarias.map((cta) => (
                      <Select.Option key={cta.noCuenta} value={cta.noCuenta}>
                        <BankOutlined style={{ marginRight: 6, color: '#556ee6' }} />
                        {cta.noCuenta} - {toTitleCase(cta.nombre)} {cta.banco ? `(${toTitleCase(cta.banco)})` : ''}
                      </Select.Option>
                    ))}
                  </Select>
                )}
              </FloatingField>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name="beneficiario" style={{ marginBottom: 0 }}>
              <FloatingField label="Beneficiario" required={requiereContactoDocumento}>
                <Input placeholder="Nombre del beneficiario" />
              </FloatingField>
            </Form.Item>
          </Col>

          {/* Fila 4: Sucursal | Total */}
          <Col xs={24} sm={12}>
            <FloatingField label="Sucursal">
              <Text style={{ padding: '4px 12px', display: 'block', lineHeight: '32px', background: '#f5f5f5', borderRadius: 4 }}>
                {obtenerNombreSucursal(String(sucursalActiva))}
              </Text>
            </FloatingField>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name="total" style={{ marginBottom: 0 }}>
              <FloatingField label="Total">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={0.01}
                  precision={2}
                  prefix={monedaSimbolo}
                  disabled={documentosAsociados.length > 0}
                />
              </FloatingField>
            </Form.Item>
          </Col>

          {/* Fila 5: Nota (span 24) */}
          <Col xs={24}>
            <Form.Item name="nota" style={{ marginBottom: 0 }}>
              <MemoField label="Nota" />
            </Form.Item>
          </Col>

          <CamposRapidosFila
            referencia={{
              valor: refValue,
              editando: editingField === 'referencia',
              etiqueta: 'Referencia',
              prefijo: 'Ref: ',
              placeholder: 'Referencia',
              onEdit: () => openFieldEditor('referencia'),
              onCommit: commitFieldEditor,
              onCancel: cancelFieldEditor,
              onChange: (v) => { editingValueRef.current = v; },
            }}
            tasa={{
              tasa: tasaValue,
              editable: true,
              editando: editingField === 'tasa',
              onEdit: () => openFieldEditor('tasa'),
              onChange: (v) => { editingValueRef.current = v ?? 1; },
              onCommit: commitFieldEditor,
              onCancel: cancelFieldEditor,
            }}
            ocultos={[
              { name: 'referencia' },
              { name: 'tasa', editor: 'number' },
            ]}
          />
        </Row>
      </Form>

      {/* Hidden form items para que watchers y construirDTO funcionen */}
      <div style={{ display: 'none' }}>
        <Form.Item name="subTotal"><InputNumber /></Form.Item>
        <Form.Item name="descuento"><InputNumber /></Form.Item>
        <Form.Item name="impuestos"><InputNumber /></Form.Item>
        <Form.Item name="retenciones"><InputNumber /></Form.Item>
      </div>
    </Card>
  );

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
      >
        {esChequePopular && (
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'vista-previa', icon: <EyeOutlined />, label: 'Vista previa del cheque' },
                { key: 'imprimir', icon: <PrinterOutlined />, label: 'Imprimir sobre papel preimpreso' },
              ],
              onClick: ({ key }) => handleChequePopular(key as 'vista-previa' | 'imprimir'),
            }}
          >
            <Button icon={<PrinterOutlined />} loading={generandoCheque} disabled={saving}>
              Cheque
            </Button>
          </Dropdown>
        )}
      </FormularioToolbar>

      {loadingError && (
        <Alert
          message="Error al cargar el formulario de transacción bancaria"
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

      <BuscarConceptoModal
        open={conceptoModalOpen}
        onClose={() => setConceptoModalOpen(false)}
        onSelect={handleConceptoSelect}
        sucursal={sucursalActiva}
        documento={documentoConceptos}
      />

      <BuscarDocumentoModal
        open={buscarDocModalOpen}
        onClose={() => setBuscarDocModalOpen(false)}
        onSelect={handleDocumentosSeleccionados}
        tipoEntidad={(selectedEntidad?.tipoEntidad?.codigo as 'SUP' | 'CLI') || 'SUP'}
        codEntidad={selectedEntidad?.codigo || ''}
        origen={(() => { 
          const docCodigo = selectedConcepto?.docAGenerar || data?.documento?.codigo || tipoValue || ''; 
          const docConfig = docCodigo ? documentos?.find((d: any) => d.codigo === docCodigo) : undefined; 
          const docOrigen = docConfig?.origenCuenta ?? OrigenCuenta.Desconocido; 
          return typeof docOrigen === 'number' ? docOrigen : (docOrigen === 'Credito' ? OrigenCuenta.Credito : OrigenCuenta.Debito); 
        })()}
        documentosIniciales={documentosAsociados.map((d: any) => d.transaccionAsociadaID ?? d.id)}
        puedeAsignar={true}
        codigoMonedaPrincipal={codigoMonedaDocumento}
      />

      {renderEncabezado()}

      {/* Tabs con Documentos Asociados, Asientos e Historial */}
      <Card className="paces-card" size="small" style={{ marginTop: 16 }}>
        <Tabs
          defaultActiveKey="documentos"
          type="card"
          items={[
            {
              key: 'documentos',
              icon: <FileTextOutlined />,
              label: `Documentos Asociados (${documentosAsociados.length})`,
              children: (
                <>
                  <style>{`.input-number-right .ant-input-number-input { text-align: right !important; }`}</style>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      <BankOutlined style={{ marginRight: 6, color: '#556ee6' }} />
                      Documentos Asociados
                    </span>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        if (!selectedEntidad?.codigo) {
                          message.warning('Seleccione una entidad primero');
                          return;
                      }
                        setBuscarDocModalOpen(true);
                      }}
                    >
                      Agregar
                    </Button>
                  </div>

                  <Table
                    dataSource={documentosAsociados}
                    rowKey={(r: any) => r.transaccionAsociadaID ?? r.id}
                    size="small"
                    pagination={false}
                    scroll={{ x: 1260 }}
                    locale={{ emptyText: !selectedEntidad?.codigo ? 'Seleccione una entidad para cargar documentos pendientes' : 'No hay documentos asociados' }}
                    columns={[
                      {
                        title: 'Fecha',
                        dataIndex: 'fecha',
                        key: 'fecha',
                        width: 110,
                        render: (v: string) => v || '-',
                      },
                      {
                        title: 'Documento',
                        dataIndex: 'documento',
                        key: 'documento',
                        width: 160,
                      },
                      {
                        title: 'NCF',
                        dataIndex: 'nCF',
                        key: 'nCF',
                        width: 130,
                        render: (v: string) => v || '-',
                      },
                      {
                        title: 'Monto Original',
                        dataIndex: 'montoOriginal',
                        key: 'montoOriginal',
                        width: 130,
                        align: 'right' as const,
                        render: (v: number) => formatNumber(v ?? 0),
                      },
                      {
                        title: 'Acreditado/Abonado',
                        key: 'pagado',
                        width: 150,
                        align: 'right' as const,
                        render: (_: any, record: any) => (
                          <Text type="secondary">
                            {formatNumber(record.pagado ?? 0)}
                          </Text>
                        ),
                      },
                      {
                        title: 'Pendiente',
                        key: 'pendiente',
                        width: 130,
                        align: 'right' as const,
                        render: (_: any, record: any) => (
                          <Text style={{ color: record.pendiente > 0 ? '#fa8c16' : undefined }}>
                            {formatNumber(record.pendiente ?? 0)}
                          </Text>
                        ),
                      },
                      {
                        title: 'Retenciones',
                        key: 'retencion',
                        width: 120,
                        align: 'right' as const,
                        render: (_: any, record: any) => formatNumber(record.retencion ?? 0),
                      },
                      {
                        title: 'Descuento',
                        key: 'descuento',
                        width: 140,
                        align: 'right' as const,
render: (_: any, record: any) => (
                            <InputNumber
                                size="small"
                                style={{ width: '100%', textAlign: 'right' }}
                                className="input-number-right"
                                min={0}
                                step={0.01}
                                precision={2}
                                value={record.descuento}
                            onChange={(val) => handleDescuentoChange(record.transaccionAsociadaID ?? record.id, val)}
                          />
                        ),
                      },
                      {
                        title: 'Monto',
                        key: 'monto',
                        width: 140,
                        align: 'right' as const,
render: (_: any, record: any) => (
                            <InputNumber
                                size="small"
                                style={{ width: '100%', textAlign: 'right' }}
                                className="input-number-right"
                                min={0}
                                max={pendienteEfectivo(record)}
                                step={0.01}
                                precision={2}
                                value={record.monto}
                            onChange={(val) => handleMontoChange(record.transaccionAsociadaID ?? record.id, val)}
                          />
                        ),
                      },
                      {
                        title: '',
                        key: 'accion',
                        width: 50,
                        render: (_: any, record: any) => (
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveDoc(record.transaccionAsociadaID ?? record.id)}
                          />
                        ),
                      },
                    ]}
                  />

                  <Divider />

                  {/* Totales (solo lectura) */}
                  <div style={{ display: 'flex', gap: 24, justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Text type="secondary">SubTotal:</Text>
                      <Text strong>{monedaSimbolo} {formatNumber(subTotalCalculado)}</Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Text type="secondary">Descuento:</Text>
                      <Text strong>{monedaSimbolo} {formatNumber(sumaDescuentos)}</Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Text type="secondary">Impuestos:</Text>
                      <Text strong>{monedaSimbolo} {formatNumber(impuestosValue)}</Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Text type="secondary">Retenciones:</Text>
                      <Text strong>{monedaSimbolo} {formatNumber(retencionesValue)}</Text>
                    </div>
                    <Divider type="vertical" style={{ height: 30 }} />
                    <div>
                      <Text style={{ fontSize: 16, fontWeight: 700 }}>
                        Total: {monedaSimbolo} {formatNumber(totalCalculado)}
                      </Text>
                    </div>
                  </div>
                </>
              ),
            },
            {
              key: 'asientos',
              label: `Asientos (${asientos.length})`,
              children: (permisoModificarAsientos && toEstadoNum(estado) === 0 && !selectedConcepto?.noAsientos) ? (
                <>
                  {errorGeneracion && (
                    <Alert
                      type="error"
                      showIcon
                      closable
                      onClose={() => setErrorGeneracion(null)}
                      style={{ marginBottom: 8 }}
                      message="Error al generar asientos"
                      description={errorGeneracion}
                    />
                  )}
                  <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
                    <Button icon={<PlusOutlined />} onClick={() => setCuentaModalAsientoOpen(true)}>
                      Agregar asiento manual
                    </Button>
                  </div>
                  <AsientosContableEditables
                    asientos={asientos}
                    onChange={(nuevos) => setAsientos((nuevos || []) as TransaccionAsientoDTO[])}
                    editable
                    scroll={{ x: 900 }}
                    onGenerar={handleGenerarAsientos}
                    onLimpiar={() => { setAsientos([]); setErrorGeneracion(null); }}
                    generando={generandoAsientos}
                  />
                </>
              ) : (
                <AsientosContableTable asientos={asientos} scroll={{ x: 900 }} />
              ),
            },
            {
              key: 'historial',
              icon: <HistoryOutlined />, label: `Historial (${data?.logs?.length || 0})`,
              children: (
                <LogTable dataSource={data?.logs || []} scroll={{ x: 900 }} />
              ),
            },
          ]}
        />
      </Card>

      <BuscarCuentaContableModal
        open={cuentaModalAsientoOpen}
        onClose={() => setCuentaModalAsientoOpen(false)}
        onSelect={(cuenta) => {
          handleAgregarAsientoManual(cuenta);
          setCuentaModalAsientoOpen(false);
        }}
        sucursal={sucursalActiva}
      />
    </div>
  );
};

export default TransaccionBancariaFormulario;
