import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Alert, Popover, Empty,
} from 'antd';
import {
  SaveOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  ClearOutlined,
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { reciboIngresoApi } from '../../api/reciboIngresoApi';
import { conceptosApi } from '../../api/conceptosApi';
import { tipoApi } from '../../api/tipoApi';
import { clienteApi } from '../../api/clienteApi';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import type { ConceptoDTO, AsientoContableDTO, LogDTO } from '../../types/entradaAlmacen';
import type { UnidadMedidaDTO } from '../../types/productos';
import type {
  ReciboIngresoFullDTO, TransaccionAsociadaDTO, CobroDTO, TipoRISelectDTO,
} from '../../types/reciboIngreso';
import { OrigenCuenta } from '../../types/contabilidad';
import LogTable from '../../components/LogTable';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import BuscarDocumentoModal from '../../components/BuscarDocumentoModal/BuscarDocumentoModal';
import BuscarEntidadSelect from '../../components/BuscarEntidadSelect/BuscarEntidadSelect';

import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import GuidePopover from '../../components/GuidePopover/GuidePopover';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { formatCurrency, formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum } from '../../utils/estadoDocumento';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';

const { Text } = Typography;
const { TextArea } = Input;

const MEDIO_COBRO_LABELS: Record<string, string> = {
  Efectivo: 'Efectivo',
  Cheque: 'Cheque',
  Transferencia: 'Transferencia',
  TarjetaCredito: 'Tarjeta Crédito',
  TarjetaDebito: 'Tarjeta Débito',
  Bono: 'Bono',
  TarjetaRegalo: 'Tarjeta Regalo',
  NotaCredito: 'Nota Crédito',
};

// ===== Mapa de rutas para documentos relacionados (Task 2) =====
const MAPA_RUTAS_DOC: Record<string, string> = {
  ND: '/FND',
  FAC: '/FFAC',
  NC: '/FNC',
  RI: '/FRI',
  NDD: '/FNDD',
  NDN: '/FNDN',
  NCN: '/FNCN',
};

function getRutaDocumento(record: any): string | null {
  const tipoDoc = record?.tipoDocumento;
  if (!tipoDoc) return null;
  const codigo = typeof tipoDoc === 'number' ? (['AID','AIC','ABN','AJA','CBI','CDC','CHK','CHN','CIE','CIT','CKO','CPF','CTT','DBA','DBI','DCA','DCN','DEC','DEP','DEV','DGA','DPN','DPR','DVC','DVN','ED','EDI','EDN','EIN','ENP','EPJ','EPN','ER','EXP','FAC','FAN','LAC','NBN','NC','NCB','NCN','ND','NDB','NDD','NDN','NDV','NOM','ORC','ORT','PAG','PRES','PV','PVC','PVN','PVS','PVT','RAC','RBN','RCM','RDE','RDN','REA','REQ','RES','RETA','RI','RIN','RSV','RTB','RUA','SAP','SCO','SDD','SPA','SPJ','SPN','SPT','TBN','TID','TRB','TRP','TUR','UBD','VD','DBN','PVComponente','Existencia'][tipoDoc] || '') : tipoDoc;
  const rutaBase = MAPA_RUTAS_DOC[codigo];
  if (!rutaBase) return null;
  const docId = record.id || record.transaccionAsociadaID;
  if (!docId) return null;
  return `${rutaBase}/${docId}`;
}

// ===== Helpers para tipo de asiento =====
function esDebito(tipo: any): boolean { return tipo === 'D' || tipo === 0; }
function esCredito(tipo: any): boolean { return tipo === 'C' || tipo === 1; }

// ===== Factory para Cobros =====
function crearCobrosIniciales(): CobroDTO[] {
  const medios = [
    { medioCobro: 'Efectivo', editable: true },
    { medioCobro: 'Cheque', editable: true },
    { medioCobro: 'Transferencia', editable: true },
    { medioCobro: 'TarjetaCredito', editable: true },
    { medioCobro: 'TarjetaDebito', editable: true },
    { medioCobro: 'Bono', editable: false },
    { medioCobro: 'TarjetaRegalo', editable: false },
    { medioCobro: 'NotaCredito', editable: false },
  ];
  return medios.map((m, i) => ({
    id: -(i + 1),
    medioCobro: m.medioCobro,
    monto: 0,
    editable: m.editable,
  }));
}

// ===== Componente principal =====
const ReciboIngresoFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const { screenCode, documentCode } = useScreenConfig('FRI');

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ReciboIngresoFullDTO | null>(null);
  const [tiposCache, setTiposCache] = useState<TipoRISelectDTO[]>([]);
  const [entidadesCache, setEntidadesCache] = useState<any[]>([]);
  const [selectedTipo, setSelectedTipo] = useState<TipoRISelectDTO | null>(null);
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [selectedEntidad, setSelectedEntidad] = useState<any>(null);
  const [transaccionesAsociadas, setTransaccionesAsociadas] = useState<TransaccionAsociadaDTO[]>([]);
  const [cobros, setCobros] = useState<CobroDTO[]>(crearCobrosIniciales());
  const [asientos, setAsientos] = useState<AsientoContableDTO[]>([]);
  const [logs, setLogs] = useState<LogDTO[]>([]);
  const [medidasCache, setMedidasCache] = useState<UnidadMedidaDTO[]>([]);
  const [sucursalesCache, setSucursalesCache] = useState<any[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState<any>(null);

  // Concepto modal
  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
  const [conceptoSearchText, setConceptoSearchText] = useState('');

  // Documento relacionado modal
  const [documentoModalOpen, setDocumentoModalOpen] = useState(false);

  const impuestosBackupRef = useRef<Map<number, { impuesto?: any; porcentajeImpuesto: number }>>(new Map());

  // Quick fields
  const [editingField, setEditingField] = useState<string | null>(null);
  const editingOriginalValue = useRef<string | number>('');
  const editingValueRef = useRef<string | number>('');
  const fieldCloseHandledRef = useRef(false);

  // Refs para la guía paso a paso
  const tipoRef = useRef<HTMLDivElement>(null);
  const conceptoRef = useRef<HTMLDivElement>(null);
  const entidadRef = useRef<HTMLDivElement>(null);
  const totalRef = useRef<HTMLDivElement>(null);
  const documentosRef = useRef<HTMLDivElement>(null);
  const sucursalRef = useRef<HTMLDivElement>(null);

  const [form] = Form.useForm();

  // Watchers
  const ncfValue = Form.useWatch('ncf', form) || '';
  const refValue = Form.useWatch('referencia', form) || '';
  const tasaValue = Form.useWatch('tasa', form) ?? 1;
  const totalValue = Form.useWatch('total', form) ?? 0;

  const sinOC = true;
  const isLarge = screens.xxl === true;

  // Estado
  const estado = toEstadoNum(data?.estado);
  const esCerrado = data?.periodo === 6;
  const esBorrador = estado === 0;
  const esAplicado = estado === 1;
  const esAnulado = estado === 3;

  // ===== Quick field editors =====
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
      const oldValue = form.getFieldValue(field);
      const newValue = editingValueRef.current;
      form.setFieldsValue({ [field]: newValue });

      // RI13 - Si se cambió la tasa, preguntar si actualizar montos
      if (field === 'tasa' && oldValue !== newValue) {
        Modal.confirm({
          title: 'Actualizar montos',
          icon: <ExclamationCircleOutlined />,
          content: '¿Desea actualizar los montos en base a la nueva tasa?',
          okText: 'Sí',
          cancelText: 'No',
        });
      }
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

  // ===== Cargar catálogos al montar =====
  useEffect(() => {
    setActiveModule(screenCode);
    const pageTitle = mode === 'crear'
      ? 'Nuevo Recibo de Ingreso'
      : 'Editar Recibo de Ingreso';
    setPageTitleOverride(pageTitle);

    // Cargar tipos para RI
    tipoApi.obtenerPorDocumento(sucursalActiva, 'RI')
      .then((tipos) => setTiposCache(tipos as any))
      .catch((err) => console.warn('Error al cargar tipos cache', err));
    unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch((err) => console.warn('Error al cargar medidas cache', err));
    // Cargar sucursales desde la API
    conceptosApi.obtenerSucursales(sucursalActiva).then(setSucursalesCache).catch((err) => console.warn('Error al cargar sucursales cache', err));

    if (mode === 'crear') {
      form.setFieldsValue({
        fechaDocumento: dayjs(),
        tasa: 1,
        total: 0,
      });
      setCobros(crearCobrosIniciales());
    }

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, sucursalActiva, form]);

  // ===== Cargar datos en modo editar =====
  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;

    setLoading(true);
    reciboIngresoApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res: any) => {
        setData(res);
        setTransaccionesAsociadas(res.transaccionesAsociadas || []);
        setAsientos(res.asientos || []);
        setLogs(res.logs || []);

        // Inicializar cobros desde respuesta o valores por defecto
        if (res.cobros && res.cobros.length > 0) {
          setCobros(res.cobros);
        } else {
          setCobros(crearCobrosIniciales());
        }

        setSelectedConcepto(res.concepto || null);
        setSelectedEntidad(res.entidad || null);
        // Restaurar sucursal
        if (res.sucursal) {
          setSelectedSucursal(res.sucursal);
        }

        // Obtener tipo desde res si existe
        if (res.tipo) {
          setSelectedTipo(res.tipo);
        } else if (res.codigoTipo) {
          const encontrado = tiposCache.find(t => t.codigo === res.codigoTipo);
          if (encontrado) setSelectedTipo(encontrado);
        }

        const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;

        form.setFieldsValue({
          tipo: res.tipo?.codigo || res.codigoTipo || '',
          concepto: res.concepto?.codigo || '',
          entidad: res.entidad?.codigo || res.codigoEntidad || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          ncf: res.ncf || '',
          referencia: res.referencia || '',
          tasa: res.tasa || 1,
          nota: res.nota || '',
          total: res.total || 0,
        });

        // Cargar entidades según el concepto
        if (res.concepto?.codigo) {
          cargarEntidades(res.concepto.codigo);
        }
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        message.error(msg);
        setLoadingError(true);
        navigate('/FRI', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate]);

  // ===== Cargar entidades (clientes o suplidores) =====
  const cargarEntidades = async (conceptoCodigo?: string) => {
    try {
      const res = await conceptosApi.obtenerEntidades(sucursalActiva, conceptoCodigo || selectedConcepto?.codigo);
      setEntidadesCache((res || []).filter((e) => e.activo !== false));
    } catch {
      // Fallback: cargar clientes
      try {
        const clientes = await clienteApi.obtenerActivos(sucursalActiva);
        setEntidadesCache(clientes || []);
      } catch {
        message.error('Error al cargar entidades');
      }
    }
  };

  // ===== Handlers =====
  const handleCancelar = () => {
    Modal.confirm({
      title: 'Cancelar',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro que desea cancelar los cambios realizados?',
      okText: 'Sí, cancelar',
      cancelText: 'No, continuar editando',
      okButtonProps: { danger: true },
      onOk: () => {
        setEditingField(null);
        if (mode === 'crear') {
          navigate('/FRI', { replace: true });
        } else if (id) {
          navigate(`/FRI/${id}`, { replace: true });
        }
      },
    });
  };

  // ===== Validación =====
  const validarFormulario = (): string | null => {
    const values = form.getFieldsValue();

    if (!selectedConcepto) return 'Debe elegir un Concepto';
    if (!selectedEntidad && !values.entidad) return 'Debe elegir una Entidad';

    const fechaDoc = values.fechaDocumento;
    if (fechaDoc) {
      const hoy = dayjs().endOf('day');
      if (dayjs(fechaDoc).isAfter(hoy)) {
        return 'La fecha del documento no puede ser mayor a hoy';
      }
    }

    // RI17 - Validar distribución vs total
    if (transaccionesAsociadas.length > 0) {
      const distribuido = transaccionesAsociadas.reduce((s, t) => s + (t.monto || 0), 0);
      if (distribuido - (values.total || 0) > 0.01) {
        return 'El monto distribuido en las facturas no puede ser mayor al total del documento.';
      }
    }

    // RI8 - Validar asientos cuadrados
    if (asientos.length > 0) {
      const totalDebitos = asientos.reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
      const totalCreditos = asientos.reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);
      if (Math.abs(totalDebitos - totalCreditos) > 0.01) {
        return 'Los asientos contables no están cuadrados. Los débitos deben ser igual a los créditos.';
      }
    }

    if (values.nota && values.nota.length > 500) {
      return 'La nota no puede exceder 500 caracteres';
    }

    return null;
  };

  // ===== Construir DTO =====
  const construirDTO = (): any => {
    const values = form.getFieldsValue();
    const base: any = data || {};

    const entidadSel = entidadesCache.find((e: any) => e.codigo === values.entidad) || selectedEntidad;

    const fechaDoc = values.fechaDocumento
      ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
        ? toISOFormat(values.fechaDocumento.toDate())
        : values.fechaDocumento)
      : toISOFormat(new Date());

    // Calcular retenciones e impuestos desde transacciones asociadas
    const retenciones = transaccionesAsociadas
      .reduce((s, t) => s + (t.retencion || 0), 0);

    const subTotal = (values.total || 0) - (base.impuestos || 0);

    // Asegurar documento con origenCuenta desde companyStore
    const { documentos } = useCompanyStore.getState().data;
    const docConfig = documentos.find((d: any) => d.codigo === documentCode);
    const docOrigenCuenta = base.documento?.origenCuenta ?? docConfig?.origenCuenta ?? OrigenCuenta.Desconocido;
    const documento = base.documento?.codigo
      ? { ...base.documento, origenCuenta: docOrigenCuenta }
      : { codigo: documentCode, origenCuenta: docOrigenCuenta };

    // Asegurar entidad con tipoEntidad
    const tipoEntidadStr = base.tipoEntidad || 'CLI';
    const entidadBase = entidadSel || { nombre: '', codigo: '', identificacion: '' };
    const entidad = {
      ...entidadBase,
      tipoEntidad: entidadBase.tipoEntidad ?? {
        codigo: tipoEntidadStr,
        origenCuenta: docOrigenCuenta,
      },
    };

    return {
      id: base.id || 0,
      fechaDocumento: fechaDoc,
      noDocumento: base.noDocumento || '',
      estado: base.estado || 0,
      periodo: base.periodo || new Date().getMonth() + 1,
      ncf: values.ncf || '',
      referencia: values.referencia || '',
      nota: values.nota || '',
      tasa: values.tasa || 1,
      total: values.total || 0,
      subTotal: Math.round(subTotal * 100) / 100,
      descuento: base.descuento || 0,
      impuestos: base.impuestos || 0,
      diasCredito: selectedEntidad?.diasCredito || 0,
      retenciones: Math.round(retenciones * 100) / 100,
      tipoDocumento: base.tipoDocumento ?? 66,
      tipoEntidad: base.tipoEntidad || selectedConcepto?.entidades?.[0]?.codigo || 'CLI',
      documento,
      concepto: selectedConcepto || { nombre: '', codigo: '' },
      entidad,
      moneda: base.moneda || getMonedaSucursalActiva(),
      codigoTipo: selectedTipo?.codigo || values.tipo || '',
      sucursal: selectedSucursal
        ? { codigo: selectedSucursal.codigo, idExterno: selectedSucursal.idExterno, nombre: selectedSucursal.nombre || '' }
        : base.sucursal || undefined,
      // Colecciones
      transaccionesAsociadas: transaccionesAsociadas.map((t) => ({
        ...t,
        transaccionAsociadaID: t.transaccionAsociadaID || t.id,
      })),
      cobros: cobros.map((c) => ({
        medioCobro: c.medioCobro,
        monto: c.monto || 0,
      })),
      asientos: asientos || [],
      logs: logs || [],
    };
  };

  // ===== Acciones =====
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
        const result = await reciboIngresoApi.crear(sucursalActiva, dto);
        message.success('Recibo de ingreso creado exitosamente');
        navigate(`/FRI/${result.id}`, { replace: true });
      } else {
        await reciboIngresoApi.actualizar(sucursalActiva, dto);
        message.success('Recibo de ingreso actualizado exitosamente');
        navigate(`/FRI/${id}`, { replace: true });
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerarAsientos = async () => {
    if (sucursalActiva === undefined) return;
    setSaving(true);
    try {
      const dto = construirDTO();
      const asientosGenerados = await reciboIngresoApi.generarAsientos(sucursalActiva, dto);
      setAsientos(asientosGenerados);
      message.success(`Se generaron ${asientosGenerados.length} asientos`);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al generar asientos');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== Handlers de tipo =====
  const handleTipoChange = (val: string) => {
    const t = tiposCache.find((tc) => tc.codigo === val);
    setSelectedTipo(t || null);
    // Resetear concepto al cambiar tipo
    setSelectedConcepto(null);
    setConceptoSearchText('');
    setEntidadesCache([]);
    setSelectedEntidad(null);
    form.setFieldsValue({ concepto: '', entidad: undefined });
  };

  // ===== Handlers de concepto =====
  const handleConceptoSelect = (concepto: ConceptoDTO) => {
    setSelectedConcepto(concepto);
    setEditingField(null);
    setConceptoSearchText('');

    // Cargar entidades según concepto
    cargarEntidades(concepto.codigo);

    // === ConfigurarMoneda ===
    const monedaObj = concepto.moneda || getMonedaSucursalActiva();
    // Actualizar data local para que la UI lo refleje
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, moneda: monedaObj };
    });

    form.setFieldsValue({
      concepto: concepto.codigo,
      moneda: monedaObj.nombre,
      tasa: monedaObj.tasa ?? 1,
    });

    // === NoImpuesto: si el concepto no acepta impuestos, mostrar advertencia ===
    if (concepto.noImpuesto) {
      const hayRetenciones = transaccionesAsociadas.some((t) => (t.retencion || 0) > 0);
      if (hayRetenciones) {
        message.warning('El Concepto no acepta Impuestos/Retenciones. Verifique las retenciones en documentos relacionados.');
      }
    }
  };

  const handleConceptoClear = () => {
    setSelectedConcepto(null);
    setConceptoSearchText('');
    setEntidadesCache([]);
    setSelectedEntidad(null);
    form.setFieldsValue({ concepto: '', entidad: undefined });
  };

  // ===== Handler para agregar documentos relacionados =====
  const handleAgregarDocumentos = (docs: any[]) => {
    setTransaccionesAsociadas((prev) => {
      const idsExistentes = new Set(
        prev.map((t) => t.transaccionAsociadaID || t.id)
      );
      const nuevos = docs.filter(
        (d) => !idsExistentes.has(d.transaccionAsociadaID || d.id)
      );
      return [...prev, ...nuevos];
    });
  };

  const handleDocRelacionadoRemove = (id?: number) => {
    setTransaccionesAsociadas((prev) =>
      prev.filter((t) => (t.transaccionAsociadaID || t.id) !== id)
    );
  };

  // ===== Totales calculados =====
  const totalDistribuido = transaccionesAsociadas.reduce((s, t) => s + (t.monto || 0), 0);
  const totalRetenciones = transaccionesAsociadas.reduce((s, t) => s + (t.retencion || 0), 0);
  const totalPagar = (totalValue || 0) - totalRetenciones;
  const porDistribuir = totalPagar - totalDistribuido;

  // Totales de cobros
  const totalCobrado = cobros.reduce((s, c) => s + (c.monto || 0), 0);
  const cuentasPorCobrar = (totalValue || 0) - totalCobrado;
  const diferencia = (totalValue || 0) - totalCobrado;
  const totales = {
    subTotal: (totalValue || 0) - (data?.impuestos || 0),
    descuento: data?.descuento || 0,
    impuestos: data?.impuestos || 0,
    total: totalValue || 0,
  };

  // Totales de asientos
  const totalDebitos = asientos.reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
  const totalCreditos = asientos.reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);

  // ===== Columnas =====
  const asociadasColumns = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110, render: (v: string) => formatDate(v) },
    {
      title: 'Documento', dataIndex: 'documento', key: 'documento', width: 150,
      render: (doc: string, record: any) => {
        const ruta = getRutaDocumento(record);
        if (ruta) {
          return <Link to={ruta} style={{ color: '#6c5ffc', fontWeight: 500 }}>{doc}</Link>;
        }
        return <span style={{ color: '#6c5ffc', fontWeight: 500 }}>{doc}</span>;
      },
    },
    { title: 'Sucursal', dataIndex: 'sucursal', key: 'sucursal', width: 100, render: (v: string) => v || '-' },
    { title: 'NCF', dataIndex: 'nCF', key: 'nCF', width: 140, render: (v: string) => v || '-' },
    { title: 'Monto Original', dataIndex: 'montoOriginal', key: 'montoOriginal', width: 130, align: 'right' as const, render: (v: number) => formatNumber(v) },
    { title: 'Abonado', dataIndex: 'pagado', key: 'pagado', width: 120, align: 'right' as const, render: (v: number) => formatNumber(v) },
    { title: 'Pendiente', dataIndex: 'saldoPendiente', key: 'saldoPendiente', width: 120, align: 'right' as const, render: (v: number) => <strong>{formatNumber(v)}</strong> },
    { title: 'Retención', dataIndex: 'retencion', key: 'retencion', width: 110, align: 'right' as const, render: (v: number) => formatNumber(v || 0) },
    {
      title: 'Monto', dataIndex: 'monto', key: 'monto', width: 130, align: 'right' as const,
      render: (_: any, _record: TransaccionAsociadaDTO, idx: number) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          min={0}
          step={0.01}
          precision={2}
          value={transaccionesAsociadas[idx]?.monto}
          onChange={(val) => {
            setTransaccionesAsociadas((prev) =>
              prev.map((t, i) => i === idx ? { ...t, monto: val || 0 } : t)
            );
          }}
        />
      ),
    },
    {
      title: '', key: 'accion', width: 50,
      render: (_: any, record: TransaccionAsociadaDTO) => (
        <Button type="text" danger size="small" icon={<DeleteOutlined />}
          onClick={() => handleDocRelacionadoRemove(record.transaccionAsociadaID || record.id)} />
      ),
    },
  ];

  const cobrosColumns = [
    {
      title: 'Medio de Cobro', dataIndex: 'medioCobro', key: 'medioCobro', width: 180,
      render: (v: string) => MEDIO_COBRO_LABELS[v] || v,
    },
    {
      title: 'Monto', dataIndex: 'monto', key: 'monto', width: 150, align: 'right' as const,
      render: (_: any, _record: CobroDTO, idx: number) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          min={0}
          step={0.01}
          precision={2}
          value={cobros[idx]?.monto}
          disabled={!cobros[idx]?.editable}
          onChange={(val) => {
            setCobros((prev) =>
              prev.map((c, i) => i === idx ? { ...c, monto: val || 0 } : c)
            );
          }}
        />
      ),
    },
    {
      title: 'Referencia', dataIndex: 'referencia', key: 'referencia', width: 150,
      render: (_: any, _record: CobroDTO, idx: number) => (
        <Input
          size="small"
          style={{ width: '100%' }}
          value={cobros[idx]?.referencia || ''}
          disabled={!cobros[idx]?.editable}
          onChange={(e) => {
            setCobros((prev) =>
              prev.map((c, i) => i === idx ? { ...c, referencia: e.target.value } : c)
            );
          }}
        />
      ),
    },
  ];

  const asientoColumns = [
    {
      title: 'Cuenta', key: 'cuenta', width: 120,
      render: (_: any, r: AsientoContableDTO) => r.cuentaContable?.noCuenta || '-',
    },
    {
      title: 'Nombre', key: 'nombre', ellipsis: true,
      render: (_: any, r: AsientoContableDTO) => r.cuentaContable?.nombre ? toTitleCase(r.cuentaContable.nombre) : '-',
    },
    {
      title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true,
      render: (v: string) => v ? toTitleCase(v) : '-',
    },
    {
      title: 'Débito', key: 'debito', width: 130, align: 'right' as const,
      render: (_: any, r: AsientoContableDTO) => esDebito(r.tipoAsiento) ? formatNumber(r.monto) : '',
    },
    {
      title: 'Crédito', key: 'credito', width: 130, align: 'right' as const,
      render: (_: any, r: AsientoContableDTO) => esCredito(r.tipoAsiento) ? formatNumber(r.monto) : '',
    },
  ];

  const handleRefresh = useCallback(() => {
    if (mode === 'crear') return;
    if (!id) return;
    setLoadingError(false);
    setLoading(true);
    reciboIngresoApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res: any) => {
        setData(res);
        setTransaccionesAsociadas(res.transaccionesAsociadas || []);
        setAsientos(res.asientos || []);
        setLogs(res.logs || []);
        if (res.cobros && res.cobros.length > 0) setCobros(res.cobros);
        else setCobros(crearCobrosIniciales());
        setSelectedConcepto(res.concepto || null);
        setSelectedEntidad(res.entidad || null);
        setSelectedSucursal(res.sucursal || null);
        if (res.tipo) setSelectedTipo(res.tipo);
        else if (res.codigoTipo) {
          const encontrado = tiposCache.find(t => t.codigo === res.codigoTipo);
          if (encontrado) setSelectedTipo(encontrado);
        }
        const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
        form.setFieldsValue({
          tipo: res.tipo?.codigo || res.codigoTipo || '',
          concepto: res.concepto?.codigo || '',
          entidad: res.entidad?.codigo || res.codigoEntidad || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          ncf: res.ncf || '', referencia: res.referencia || '',
          tasa: res.tasa || 1, nota: res.nota || '', total: res.total || 0,
        });
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        message.error(msg); setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, form, mode]);

  // ===== Loading =====
  if (loading) {
    return <LoadingSpinner mensaje="Cargando documento..." />;
  }

  // ===== Estado info =====
  const estadoInfo = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Borrador', color: 'default' };

  // ===== Encabezado =====
  const documentoTieneTipos = tiposCache.length > 0;
  const renderEncabezado = () => (
    <Card className="paces-card" size="small" title="Datos Generales" extra={<EstadoTag estado={estado} periodo={data?.periodo} />} style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={24} xxl={18}>
          <Form form={form} layout="vertical" size="small" style={{ paddingTop: 24 }}>
        <Row gutter={[16, 24]}>
          {/* Fila 1: Tipo + Concepto */}
          <Col xs={24} sm={12} lg={9}>
            <div ref={tipoRef}>
              <Form.Item name="tipo" style={{ marginBottom: 0 }}>
                <FloatingField label="Tipo">
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    onChange={handleTipoChange}
                  >
                    {tiposCache.map((tc) => (
                      <Select.Option key={tc.codigo} value={tc.codigo}>
                        {tc.codigo} - {toTitleCase(tc.nombre)}
                      </Select.Option>
                    ))}
                  </Select>
                </FloatingField>
              </Form.Item>
            </div>
          </Col>
          <Col xs={24} sm={12} lg={15}>
            <div ref={conceptoRef}>
              <FloatingField label="Concepto" required>
                <Input
                  placeholder=" "
                  value={selectedConcepto ? `${selectedConcepto.codigo || ''} - ${toTitleCase(selectedConcepto.nombre)}` : conceptoSearchText}
                  readOnly
                  disabled={documentoTieneTipos && !selectedTipo}
                  suffix={
                    <Space size={4}>
                      <SearchOutlined
                        onClick={() => (!documentoTieneTipos || selectedTipo) && setConceptoModalOpen(true)}
                        style={{ cursor: (!documentoTieneTipos || selectedTipo) ? 'pointer' : 'not-allowed', color: 'rgba(0,0,0,0.45)' }}
                      />
                      {selectedConcepto && <ClearOutlined onClick={handleConceptoClear} style={{ cursor: 'pointer' }} />}
                    </Space>
                  }
                  onClick={() => (!documentoTieneTipos || selectedTipo) && setConceptoModalOpen(true)}
                />
              </FloatingField>
            </div>
            <Form.Item name="concepto" hidden><Input /></Form.Item>
            <ConceptoInfoLabel concepto={selectedConcepto} />
          </Col>

          {/* Fila 2: Fecha + Cliente */}
          <Col xs={24} sm={12} lg={9}>
            <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }}>
              <FloatingField label="Fecha" required>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </FloatingField>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={15}>
            <div ref={entidadRef}>
              <Form.Item name="entidad" required style={{ marginBottom: 0 }}>
                <BuscarEntidadSelect
                  entidades={entidadesCache as any}
                  value={selectedEntidad?.codigo}
                  label="Cliente"
                  required
                  tieneDocumentosAsociados={transaccionesAsociadas.length > 0}
                  conceptoSeleccionado={!!selectedConcepto}
                  onChange={(codigo, entidad) => setSelectedEntidad(entidad || null)}
                />
              </Form.Item>
            </div>
          </Col>

          {/* Fila 3: Monto Total */}
          <Col xs={24} sm={12} lg={9}>
            <div ref={totalRef}>
              <Form.Item name="total" required style={{ marginBottom: 0 }}>
                <FloatingField label="Monto Total" required>
                  <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
                </FloatingField>
              </Form.Item>
            </div>
          </Col>

          {/* Fila 4: Sucursal Contable */}
          <Col xs={24} sm={12} lg={9} ref={sucursalRef}>
            <Form.Item name="sucursal" style={{ marginBottom: 0 }}>
              <FloatingField label="Sucursal Contable">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  placeholder=" "
                  value={selectedSucursal?.sucursal ?? undefined}
                  onChange={(val) => {
                    const suc = sucursalesCache.find((s: any) => s.sucursal === val);
                    setSelectedSucursal(suc || null);
                  }}
                >
                  {sucursalesCache.map((suc: any) => (
                    <Select.Option key={suc.sucursal} value={suc.sucursal}>
                      {toTitleCase(suc.nombre || '')}
                    </Select.Option>
                  ))}
                </Select>
              </FloatingField>
            </Form.Item>
          </Col>

          {/* Fila 5: Nota */}
          <Col xs={24}>
            <Form.Item name="nota" style={{ marginBottom: 0 }}>
              <FloatingField label="Nota">
                <TextArea rows={3} maxLength={500} showCount />
              </FloatingField>
            </Form.Item>
          </Col>
        </Row>
      </Form>
        </Col>
        <Col xs={24} xxl={6}>
          <div style={{ marginTop: 24 }}>
            <TotalesCard
              subTotal={totales.subTotal}
              descuento={totales.descuento}
              impuestos={totales.impuestos}
              total={totales.total}
              hideTitle
            />
          </div>
          <Form.Item name="ncf" hidden><Input /></Form.Item>
          <Form.Item name="referencia" hidden><Input /></Form.Item>
          <Form.Item name="tasa" hidden><InputNumber /></Form.Item>
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* NCF */}
              <div>
                {editingField === 'ncf' ? (
                  <Input
                    size="small"
                    style={{ width: '100%' }}
                    placeholder="NCF"
                    maxLength={19}
                    autoFocus
                    defaultValue={editingValueRef.current as string}
                    onChange={(e) => { editingValueRef.current = e.target.value; }}
                    onPressEnter={() => commitFieldEditor()}
                    onBlur={() => commitFieldEditor()}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { e.stopPropagation(); cancelFieldEditor(); }
                    }}
                  />
                ) : ncfValue ? (
                  <Tag style={{ cursor: 'pointer', fontSize: 14, padding: '6px 16px' }} onClick={() => openFieldEditor('ncf')}>
                    NCF: {ncfValue} <EditOutlined />
                  </Tag>
                ) : (
                  <Tag style={{ cursor: 'pointer', fontSize: 14, padding: '6px 16px' }} onClick={() => openFieldEditor('ncf')}>
                    <PlusOutlined /> NCF
                  </Tag>
                )}
              </div>

              {/* Referencia */}
              <div>
                {editingField === 'referencia' ? (
                  <Input
                    size="small"
                    style={{ width: '100%' }}
                    placeholder="Referencia"
                    autoFocus
                    defaultValue={editingValueRef.current as string}
                    onChange={(e) => { editingValueRef.current = e.target.value; }}
                    onPressEnter={() => commitFieldEditor()}
                    onBlur={() => commitFieldEditor()}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { e.stopPropagation(); cancelFieldEditor(); }
                    }}
                  />
                ) : refValue ? (
                  <Tag style={{ cursor: 'pointer', fontSize: 14, padding: '6px 16px' }} onClick={() => openFieldEditor('referencia')}>
                    Ref: {refValue} <EditOutlined />
                  </Tag>
                ) : (
                  <Tag style={{ cursor: 'pointer', fontSize: 14, padding: '6px 16px' }} onClick={() => openFieldEditor('referencia')}>
                    <PlusOutlined /> Referencia
                  </Tag>
                )}
              </div>

              {/* Tasa */}
              <div>
                {editingField === 'tasa' ? (
                  <InputNumber
                    size="small"
                    style={{ width: '100%' }}
                    min={0}
                    step={0.01}
                    placeholder="Tasa"
                    autoFocus
                    defaultValue={editingValueRef.current as number}
                    onChange={(val) => { editingValueRef.current = val ?? 1; }}
                    onPressEnter={() => commitFieldEditor()}
                    onBlur={() => commitFieldEditor()}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { e.stopPropagation(); cancelFieldEditor(); }
                    }}
                  />
                ) : tasaValue !== 1 ? (
                  <Tag style={{ cursor: 'pointer', fontSize: 14, padding: '6px 16px' }} onClick={() => openFieldEditor('tasa')}>
                    Tasa: {tasaValue} <EditOutlined />
                  </Tag>
                ) : (
                  <Tag style={{ cursor: 'pointer', fontSize: 14, padding: '6px 16px' }} onClick={() => openFieldEditor('tasa')}>
                    <PlusOutlined /> Tasa
                  </Tag>
                )}
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  );



  // ===== Tabs =====
  const tabItems: any[] = [];

  // Tab 1: Documentos Relacionados
  tabItems.push({
    key: 'documentos',
    label: `Documentos Relacionados (${transaccionesAsociadas.length})`,
    children: (
      <div ref={documentosRef}>
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Text className="paces-text-secondary">
              Total: {formatCurrency(totalValue || 0)} | Distribuido: {formatCurrency(totalDistribuido)} | 
              Por distribuir: <span style={{ color: porDistribuir > 0 ? '#faad14' : '#52c41a', fontWeight: 600 }}>{formatCurrency(porDistribuir)}</span>
            </Text>
          </Space>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            disabled={!selectedEntidad}
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
          scroll={{ x: 1200 }}
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
  });

  // Tab 2: Cobros (Medios de Cobro) - Único de RI
  tabItems.push({
    key: 'cobros',
    label: `Cobros (${cobros.filter(c => (c.monto || 0) > 0).length})`,
    children: (
      <Table
        dataSource={cobros}
        columns={cobrosColumns}
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ x: 600 }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}><strong>Totales</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <strong>{formatCurrency(totalCobrado)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} />
            </Table.Summary.Row>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} className="paces-text-secondary">Total Documento</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">{formatCurrency(totalValue || 0)}</Table.Summary.Cell>
              <Table.Summary.Cell index={2} />
            </Table.Summary.Row>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} className="paces-text-secondary">Cuenta por Cobrar</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <span style={{ color: cuentasPorCobrar > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
                  {formatCurrency(cuentasPorCobrar)}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} />
            </Table.Summary.Row>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} className="paces-text-secondary">Diferencia</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <span style={{ color: Math.abs(diferencia) > 0.01 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
                  {formatCurrency(diferencia)}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    ),
  });

  // Tab 3: Asientos Contables
  tabItems.push({
    key: 'asientos',
    label: `Asientos Contables (${asientos.length})`,
    children: (
      <div>
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            icon={<ExclamationCircleOutlined />}
            onClick={handleGenerarAsientos}
            loading={saving}
            disabled={!id}
          >
            GENERAR
          </Button>
        </div>
        <Table
          dataSource={asientos}
          columns={asientoColumns}
          rowKey={(r) => r.id || Math.random()}
          size="small"
          pagination={false}
          scroll={{ x: 600 }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3}><strong>Totales</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right"><strong>{formatNumber(totalDebitos)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right"><strong>{formatNumber(totalCreditos)}</strong></Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </div>
    ),
  });

  // Tab 4: Historial
  tabItems.push({
    key: 'historial',
    label: `Historial (${logs.length})`,
    children: (
      <LogTable dataSource={logs} scroll={{ x: 900 }} />
    ),
  });

  // ===== Render principal =====
  return (
    <div>
      <FormularioToolbar saving={saving} estado={estado} periodo={data?.periodo} onGuardar={handleGuardar} onCancelar={handleCancelar} />

      {loadingError && (
        <Alert
          message="Error al cargar formulario de recibo de ingreso"
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
        documento="RI"
        tipo={selectedTipo?.codigo}
      />

      <BuscarDocumentoModal
        open={documentoModalOpen}
        onClose={() => setDocumentoModalOpen(false)}
        onSelect={handleAgregarDocumentos}
        tipoEntidad={selectedConcepto?.entidades?.[0]?.codigo || 'CLI'}
        codEntidad={selectedEntidad?.codigo || data?.codigoEntidad || ''}
        origen={(() => { const { documentos } = useCompanyStore.getState().data; const docConfig = documentos.find((d: any) => d.codigo === 'RI'); const docOrigen = docConfig?.origenCuenta ?? OrigenCuenta.Desconocido; return typeof docOrigen === 'number' ? docOrigen : (docOrigen === 'Credito' ? OrigenCuenta.Credito : OrigenCuenta.Debito); })()}
        montoTotal={totalValue || 0}
        documentosIniciales={transaccionesAsociadas
          .map(t => t.id || t.transaccionAsociadaID)
          .filter((id): id is number => id != null && id > 0)}
        documentoEnviado={data?.noDocumento ? `${documentCode}-${data.noDocumento}` : undefined}
      />

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

      {/* RI19 - Guía paso a paso */}
      {(mode === 'crear' || esBorrador) && (
        <ReciboIngresoGuide
          mode={mode}
          tipo={selectedTipo}
          concepto={selectedConcepto}
          entidad={selectedEntidad}
          total={totalValue}
          transaccionesCount={transaccionesAsociadas.length}
          sucursal={selectedSucursal}
          tipoRef={tipoRef}
          conceptoRef={conceptoRef}
          entidadRef={entidadRef}
          totalRef={totalRef}
          documentosRef={documentosRef}
          sucursalRef={sucursalRef}
        />
      )}
    </div>
  );
};

// ===== Componente Guía paso a paso para ReciboIngreso (RI19) =====
interface ReciboIngresoGuideProps {
  mode: 'crear' | 'editar';
  tipo: any | null;
  concepto: any | null;
  entidad: any | null;
  total: number;
  transaccionesCount: number;
  sucursal: any | null;
  tipoRef: React.RefObject<HTMLDivElement | null>;
  conceptoRef: React.RefObject<HTMLDivElement | null>;
  entidadRef: React.RefObject<HTMLDivElement | null>;
  totalRef: React.RefObject<HTMLDivElement | null>;
  documentosRef: React.RefObject<HTMLDivElement | null>;
  sucursalRef: React.RefObject<HTMLDivElement | null>;
}

interface GuideStep {
  key: string;
  title: string;
  description: string;
  target: () => HTMLDivElement | null;
}

const ReciboIngresoGuide: React.FC<ReciboIngresoGuideProps> = ({
  tipo, concepto, entidad, total, transaccionesCount, sucursal,
  tipoRef, conceptoRef, entidadRef, totalRef, documentosRef, sucursalRef,
}) => {
  const [open, setOpen] = useState(false);
  const dismissedStepRef = useRef<string | null>(null);
  const currentStepRef = useRef<GuideStep | null>(null);

  const getCurrentStep = useCallback((): GuideStep | null => {
    const steps: GuideStep[] = [
      {
        key: 'sucursal',
        title: 'Paso 1: Sucursal',
        description: 'Seleccione la sucursal contable a la que pertenece el recibo de ingreso.',
        target: () => sucursalRef.current,
      },
      {
        key: 'tipo',
        title: 'Paso 2: Tipo',
        description: 'Debe elegir un tipo de documento para continuar.',
        target: () => tipoRef.current,
      },
      {
        key: 'concepto',
        title: 'Paso 3: Concepto',
        description: 'Seleccione un concepto. Las opciones dependen del tipo seleccionado.',
        target: () => conceptoRef.current,
      },
      {
        key: 'entidad',
        title: 'Paso 4: Entidad',
        description: 'Seleccione la entidad (cliente) asociada al recibo de ingreso.',
        target: () => entidadRef.current,
      },
      {
        key: 'monto',
        title: 'Paso 5: Monto',
        description: 'Ingrese el monto total del recibo de ingreso.',
        target: () => totalRef.current,
      },
      {
        key: 'documentos',
        title: 'Paso 6: Documentos',
        description: 'Agregue los documentos/pagos asociados al recibo de ingreso.',
        target: () => documentosRef.current,
      },
    ];

    if (!sucursal) return steps[0];
    if (!tipo) return steps[1];
    if (!concepto) return steps[2];
    if (!entidad) return steps[3];
    if (!total || total === 0) return steps[4];
    if (transaccionesCount === 0) return steps[5];

    return null;
  }, [tipo, concepto, entidad, total, transaccionesCount, sucursal, tipoRef, conceptoRef, entidadRef, totalRef, documentosRef, sucursalRef]);

  currentStepRef.current = getCurrentStep();

  useEffect(() => {
    const current = getCurrentStep();
    if (current) {
      if (dismissedStepRef.current !== current.key) {
        setOpen(true);
      }
    } else {
      setOpen(false);
      dismissedStepRef.current = null;
    }
  }, [getCurrentStep]);

  const currentStep = getCurrentStep();
  if (!currentStep) return null;

  return (
    <GuidePopover
      title={currentStep.title}
      description={currentStep.description}
      targetElement={currentStep.target()}
      open={open}
      onClose={() => { setOpen(false); dismissedStepRef.current = currentStepRef.current?.key || ''; }}
    />
  );
};

export default ReciboIngresoFormulario;

