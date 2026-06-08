import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Modal, Alert,
  Switch, Typography,
} from 'antd';
import {
  SaveOutlined,
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ClearOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { notaCreditoApi } from '../../api/notaCreditoApi';
import { conceptosApi } from '../../api/conceptosApi';
import { tipoApi } from '../../api/tipoApi';
import { clienteApi } from '../../api/clienteApi';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import type { ConceptoDTO, AsientoContableDTO, LogDTO } from '../../types/entradaAlmacen';
import type { UnidadMedidaDTO } from '../../types/productos';
import type {
  NotaCreditoFullDTO,
  TransaccionAsociadaDTO,
  DetalleMovimientoDTO, DevolucionDTO, ImpuestoFacturaDTO,
  TipoNCSelectDTO,
} from '../../types/notaCredito';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import { parametrosApi } from '../../api/parametrosApi';
import LogTable from '../../components/LogTable';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import BuscarDocumentoModal from '../../components/BuscarDocumentoModal/BuscarDocumentoModal';

import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { formatCurrency, formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';
import { NotaCreditoGuide } from './NotaCreditoGuide';

const { TextArea } = Input;

// ===== Validación de formato NCF Modificado =====
function validarNcfModificado(val: string): boolean {
  if (!val) return true;
  const b0Pattern = /^B0\d{9}$/;
  const e3Pattern = /^E3\d{10}$/;
  return b0Pattern.test(val) || e3Pattern.test(val);
}

// ===== Componente principal =====
interface NotaCreditoFormularioProps {
  tipoEntidad: 'SUP' | 'CLI';
}

const NotaCreditoFormulario: React.FC<NotaCreditoFormularioProps> = ({ tipoEntidad }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const cloneData = (location.state as any)?.cloneData;
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const usuario = useAuthStore((s: any) => s.usuario);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const codigoPantalla = tipoEntidad === 'SUP' ? 'FNCSUP' : 'FNCCLI';
  const pantallaActiva = usuario?.pantallas?.find((p: any) => p.codigo?.toUpperCase() === codigoPantalla?.toUpperCase());
  const tienePermisoPostear = pantallaActiva?.acciones?.includes('POSTEAR') ?? false;
  const entidadLabel = tipoEntidad === 'SUP' ? 'Suplidor' : 'Cliente';

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<NotaCreditoFullDTO | null>(null);
  const [tiposCache, setTiposCache] = useState<TipoNCSelectDTO[]>([]);
  const [entidadesCache, setEntidadesCache] = useState<any[]>([]);
  const [selectedTipo, setSelectedTipo] = useState<TipoNCSelectDTO | null>(null);
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [selectedEntidad, setSelectedEntidad] = useState<any>(null);
  const [transaccionesAsociadas, setTransaccionesAsociadas] = useState<TransaccionAsociadaDTO[]>([]);
  const [detallesMovimiento, setDetallesMovimiento] = useState<DetalleMovimientoDTO[]>([]);
  const [devoluciones, setDevoluciones] = useState<DevolucionDTO[]>([]);
  const [impuestosFactura, setImpuestosFactura] = useState<ImpuestoFacturaDTO[]>([]);
  const [medidasCache, setMedidasCache] = useState<UnidadMedidaDTO[]>([]);
  const [asientos, setAsientos] = useState<AsientoContableDTO[]>([]);
  const [logs, setLogs] = useState<LogDTO[]>([]);
  const [fechaCierreContable, setFechaCierreContable] = useState<string | null>(null);
  const [sucursalesCache, setSucursalesCache] = useState<any[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState<any>(null);

  // NCF Modificado
  const [ncfTipo, setNcfTipo] = useState<'documento' | 'modificado'>('documento');
  const [ncfModificadoVal, setNcfModificadoVal] = useState('');

  // Concepto modal
  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
  const [conceptoSearchText, setConceptoSearchText] = useState('');

  // Documentos relacionados modal
  const [buscarDocModalOpen, setBuscarDocModalOpen] = useState(false);

  // Refs para la guía
  const conceptoRef = useRef<HTMLDivElement>(null);
  const sucursalRef = useRef<HTMLDivElement>(null);
  const entidadRef = useRef<HTMLDivElement>(null);
  const documentosRef = useRef<HTMLDivElement>(null);

  // Quick fields
  const [editingField, setEditingField] = useState<string | null>(null);
  const editingOriginalValue = useRef<string | number>('');
  const editingValueRef = useRef<string | number>('');
  const fieldCloseHandledRef = useRef(false);

  const [form] = Form.useForm();

  // Watchers
  const ncfValue = Form.useWatch('ncf', form) || '';
  const refValue = Form.useWatch('referencia', form) || '';
  const tasaValue = Form.useWatch('tasa', form) ?? 1;

  const sinOC = true;
  const isLarge = screens.xxl === true;
  const [conceptoInfo, setConceptoInfo] = useState<string>('');

  // Estado
  const estado = data?.estado ?? 0;
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
      form.setFieldsValue({ [field]: editingValueRef.current });
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
    setActiveModule(codigoPantalla);
    const pageTitle = mode === 'crear'
      ? `Nueva Nota de Crédito - ${entidadLabel}`
      : `Editar Nota de Crédito - ${entidadLabel}`;
    setPageTitleOverride(pageTitle);

    const cleanup = () => {
      resetToolbar();
      setPageTitleOverride('');
    };

    // === Si viene de Clonar ===
    if (cloneData) {
      setSelectedConcepto(cloneData.concepto || null);
      setSelectedEntidad(cloneData.entidad || null);
      setSelectedSucursal(cloneData.sucursal || null);
      setTransaccionesAsociadas(cloneData.transaccionesAsociadas || []);
      setDetallesMovimiento(cloneData.detallesMovimiento || cloneData.detalles || []);
      setDevoluciones(cloneData.devoluciones || []);
      setImpuestosFactura(cloneData.impuestosFactura || []);
      setAsientos(cloneData.asientos || []);
      setLogs(cloneData.logs || []);
      setNcfModificadoVal(cloneData.ncfModificado || '');
      setNcfTipo(cloneData.ncfModificado ? 'modificado' : 'documento');

      const fechaDoc = cloneData.fechaDocumento ? parseDateRaw(cloneData.fechaDocumento) : null;
      form.setFieldsValue({
        concepto: cloneData.concepto?.codigo || '',
        entidad: cloneData.entidad?.codigo || '',
        sucursal: cloneData.sucursal?.codigo || '',
        fechaDocumento: fechaDoc ? dayjs(fechaDoc) : dayjs(),
        ncf: cloneData.ncf || '',
        referencia: cloneData.referencia || '',
        moneda: cloneData.moneda?.nombre || '',
        tasa: cloneData.tasa || 1,
        nota: cloneData.nota || '',
        total: cloneData.total || 0,
        bienes: cloneData.bienes || 0,
        servicios: cloneData.servicios || 0,
      });
      return cleanup;
    }

    // Cargar tipos para NC
    tipoApi.obtenerPorDocumento(sucursalActiva, 'NC')
      .then((tipos) => setTiposCache(tipos as any))
      .catch(() => {});
    unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch(() => {});
    parametrosApi.obtenerFechaCierreFiscal(sucursalActiva).then(setFechaCierreContable).catch(() => {});
    conceptosApi.obtenerSucursales(sucursalActiva).then(setSucursalesCache).catch(() => {});

    if (mode === 'crear') {
      form.setFieldsValue({
        fechaDocumento: dayjs(),
        tasa: 1,
        total: 0,
      });
    }

    return cleanup;
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, sucursalActiva, form, codigoPantalla, entidadLabel, cloneData]);

  // ===== Cargar datos en modo editar =====
  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;

    setLoading(true);
    notaCreditoApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res: any) => {
        setData(res);
        setTransaccionesAsociadas(res.transaccionesAsociadas || []);
        setDetallesMovimiento(res.detallesMovimiento || res.detalles || []);
        setDevoluciones(res.devoluciones || []);
        setImpuestosFactura(res.impuestosFactura || []);
        setAsientos(res.asientos || []);
        setLogs(res.logs || []);
        setNcfModificadoVal(res.ncfModificado || '');
        setNcfTipo(res.ncfModificado ? 'modificado' : 'documento');

        setSelectedConcepto(res.concepto || null);
        setSelectedEntidad(res.entidad || null);

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
          bienes: res.bienes || 0,
          servicios: res.servicios || 0,
          sucursal: res.sucursal?.codigo || res.codigoSucursal || '',
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
        navigate(`/${codigoPantalla}`);
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate, codigoPantalla]);

  // ===== Cargar entidades (clientes o suplidores) =====
  const cargarEntidades = async (conceptoCodigo?: string) => {
    try {
      // Cargar desde el endpoint de entidades
      const res = await conceptosApi.obtenerEntidades(sucursalActiva, conceptoCodigo || selectedConcepto?.codigo);
      setEntidadesCache(res || []);
    } catch {
      // Fallback: cargar clientes o suplidores
      try {
        if (tipoEntidad === 'CLI') {
          const clientes = await clienteApi.obtenerActivos(sucursalActiva);
          setEntidadesCache(clientes || []);
        } else {
          const suplidores = await conceptosApi.obtenerSuplidores(sucursalActiva);
          setEntidadesCache(suplidores || []);
        }
      } catch {
        message.error(`Error al cargar ${entidadLabel.toLowerCase()}s`);
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
          navigate(`/${codigoPantalla}`);
        } else if (id) {
          navigate(`/${codigoPantalla}/${id}`);
        }
      },
    });
  };

  // ===== Validación =====
  const validarFormulario = async (): Promise<string | null> => {
    const values = form.getFieldsValue();

    if (!selectedConcepto) return 'Debe elegir un Concepto';
    if (!selectedEntidad && !values.entidad) return `Debe elegir un ${entidadLabel}`;

    const fechaDoc = values.fechaDocumento;
    if (fechaDoc) {
      const hoy = dayjs().endOf('day');
      if (dayjs(fechaDoc).isAfter(hoy)) {
        return 'La fecha del documento no puede ser mayor a hoy';
      }
    }

    // Validar fecha contra cierre contable
    if (fechaCierreContable) {
      const cierreDate = parseDateRaw(fechaCierreContable);
      if (cierreDate) {
        const cierreTs = dayjs(cierreDate).startOf('day').valueOf();
        if (fechaDoc && dayjs(fechaDoc).startOf('day').valueOf() <= cierreTs) {
          return 'La fecha del documento no puede ser menor o igual a la fecha de cierre';
        }
      }
    }

    // Validar margen de impuestos
    if (impuestosFactura.length > 0) {
      const total = form.getFieldsValue().total || 0;
      for (const imp of impuestosFactura) {
        const porcentaje = (imp as any).impuesto?.porcentaje || 0;
        const montoPromedio = total * ((porcentaje + 1) / 100);
        if (imp.monto > montoPromedio) {
          return `El monto del impuesto ${(imp as any).impuesto?.nombre || ''} superó el margen permitido.`;
        }
      }
    }

    // Validar distribución: si hay transacciones asociadas, suma debe coincidir con total
    if (transaccionesAsociadas.length > 0) {
      const sumaMontos = transaccionesAsociadas.reduce((s, t) => s + (t.monto || 0), 0);
      if (Math.abs(sumaMontos - (values.total || 0)) > 0.01) {
        return 'La suma de montos en Documentos Relacionados debe ser igual al Total';
      }
    }

    // Validar distribución: si hay devoluciones y es SUP
    if (tipoEntidad === 'SUP' && devoluciones.length > 0) {
      const sumaDVCs = devoluciones.reduce((s, d) => s + (d.monto || 0), 0);
      if (Math.abs(sumaDVCs - (values.total || 0)) > 0.01) {
        return 'La suma de montos en Devoluciones debe ser igual al Total';
      }
    }

    // Validar asientos cuadrados
    if (asientos.length > 0) {
      const totalDebitos = asientos.reduce((s, r) => s + (r.tipoAsiento === 'D' || r.tipoAsiento === 0 ? r.monto : 0), 0);
      const totalCreditos = asientos.reduce((s, r) => s + (r.tipoAsiento === 'C' || r.tipoAsiento === 1 ? r.monto : 0), 0);
      if (Math.abs(totalDebitos - totalCreditos) > 0.01) {
        return 'Los asientos contables no están cuadrados';
      }
    }

    // Validar NCF Modificado
    if (ncfTipo === 'modificado' && ncfModificadoVal && !validarNcfModificado(ncfModificadoVal)) {
      return 'El formato del NCF Modificado no es válido (B0+9dígitos o E3+10dígitos)';
    }

    if (values.nota && values.nota.length > 500) {
      return 'La nota no puede exceder 500 caracteres';
    }

    // Validar NCF si tiene
    if (values.ncf) {
      const ncf = values.ncf.trim();
      const validoB0 = /^B0\d{9}$/.test(ncf);
      const validoE3 = /^E3\d{10}$/.test(ncf);
      if (!validoB0 && !validoE3) {
        return 'El NCF debe tener formato B0 + 9 dígitos o E3 + 10 dígitos';
      }

      // Validar NCF duplicado
      if (selectedEntidad?.codigo) {
        try {
          const ncfExiste = await notaCreditoApi.verificarNCF(sucursalActiva, ncf, selectedEntidad.codigo);
          if (ncfExiste) {
            return `El NCF ${ncf} ya fue usado en otro documento`;
          }
        } catch {
          // Si falla la verificación, continuar (no bloquear)
        }
      }
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

    // Calcular impuestos desde la tabla de impuestos factura
    const retenciones = impuestosFactura
      .filter((i) => i.tipo === 'R' || i.tipo === 'Retenciones')
      .reduce((s, i) => s + (i.monto || 0), 0);
    const impuestosCalc = impuestosFactura
      .filter((i) => i.tipo === 'I' || i.tipo === 'Impuesto' || i.tipo === 'V' || i.tipo === 'Informativo')
      .reduce((s, i) => s + (i.monto || 0), 0);
    const otrosImpuestos = impuestosFactura
      .filter((i) => i.tipo !== 'R' && i.tipo !== 'Retenciones' && i.tipo !== 'I' && i.tipo !== 'Impuesto' && i.tipo !== 'V' && i.tipo !== 'Informativo')
      .reduce((s, i) => s + (i.monto || 0), 0);

    const totalImpuestos = impuestosCalc + otrosImpuestos;
    const subTotal = (values.total || 0) - totalImpuestos;

    return {
      id: base.id || 0,
      fechaDocumento: fechaDoc,
      noDocumento: base.noDocumento || '',
      estado: base.estado || 0,
      periodo: base.periodo || new Date().getMonth() + 1,
      ncf: values.ncf || '',
      ncfModificado: ncfTipo === 'modificado' ? ncfModificadoVal : '',
      referencia: values.referencia || '',
      nota: values.nota || '',
      tasa: values.tasa || 1,
      total: values.total || 0,
      bienes: values.bienes || 0,
      servicios: values.servicios || 0,
      subTotal: Math.round(subTotal * 100) / 100,
      descuento: base.descuento || 0,
      impuestos: Math.round(totalImpuestos * 100) / 100,
      retenciones: Math.round(retenciones * 100) / 100,
      tipoDocumento: 'NC',
      tipoEntidad,
      documento: base.documento || { codigo: 'NC' },
      concepto: selectedConcepto || { nombre: '', codigo: '' },
      entidad: entidadSel || { nombre: '', codigo: '', identificacion: '' },
      moneda: base.moneda || { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' },
      codigoTipo: selectedTipo?.codigo || values.tipo || '',
      sucursal: selectedSucursal ? { codigo: selectedSucursal.codigo || selectedSucursal.idExterno, nombre: selectedSucursal.nombre || '' } : undefined,
      // Colecciones
      transaccionesAsociadas: transaccionesAsociadas.map((t) => ({
        ...t,
        transaccionAsociadaID: t.transaccionAsociadaID || t.id,
      })),
      detallesMovimiento: tipoEntidad === 'CLI' ? detallesMovimiento : [],
      devoluciones: tipoEntidad === 'SUP' ? devoluciones : [],
      impuestosFactura,
      asientos: asientos || [],
      logs: logs || [],
    };
  };

  // ===== Acciones =====
  const handleGuardar = async () => {
    const error = await validarFormulario();
    if (error) {
      message.error(error);
      return;
    }

    setSaving(true);
    try {
      const dto = construirDTO();
      if (mode === 'crear') {
        const result = await notaCreditoApi.crear(sucursalActiva, dto);
        message.success('Nota de crédito creada exitosamente');
        navigate(`/${codigoPantalla}/${result.id}`);
      } else {
        await notaCreditoApi.actualizar(sucursalActiva, dto);
        message.success('Nota de crédito actualizada exitosamente');
        navigate(`/${codigoPantalla}/${id}`);
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerarAsientos = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const result = await notaCreditoApi.recalcularPagos(sucursalActiva, parseInt(id)) as any;
      if (result?.asientos) {
        setAsientos(result.asientos);
      }
      message.success('Asientos generados automáticamente');
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al generar asientos');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== Handlers de concepto =====
  const handleConceptoSelect = (concepto: ConceptoDTO) => {
    setSelectedConcepto(concepto);
    setEditingField(null);
    setConceptoSearchText('');
    form.setFieldsValue({ concepto: concepto.codigo });

    // Cargar entidades segÃºn concepto
    cargarEntidades(concepto.codigo);

    // === ConfigurarMoneda ===
    const monedaObj = concepto.moneda || { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' };
    form.setFieldsValue({
      moneda: monedaObj.nombre,
      tasa: monedaObj.codigo === 'DOP' ? 1 : 1,
    });
    // Actualizar data local para que la UI lo refleje
    const monedaFull = { nombre: monedaObj.nombre, simbolo: (monedaObj as any).simbolo || 'RD$', codigo: monedaObj.codigo };
    setData((prev: any) => {
      if (!prev) return prev;
      return { ...prev, moneda: monedaFull };
    });

    // === Mostrar avisos si el concepto tiene flags especiales ===
    const infoParts: string[] = [];
    if (concepto.noImpuesto) infoParts.push(' * No Impuestos * ');
    if (concepto.noAsientos) infoParts.push(' * No Asientos * ');
    if (concepto.activo === false) infoParts.push(' * Concepto Inactivo * ');
    if (concepto.noActualizaCostos) infoParts.push(' * No Actualiza Costos * ');
    setConceptoInfo(infoParts.join(''));
  };

  const handleConceptoClear = () => {
    setSelectedConcepto(null);
    setConceptoSearchText('');
    setEntidadesCache([]);
    setSelectedEntidad(null);
    form.setFieldsValue({ concepto: '', entidad: undefined });
  };

  // ===== Handlers de documentos relacionados =====
  const handleDocRelacionadoSelect = (docs: any[]) => {
    setTransaccionesAsociadas((prev) => {
      const existentes = new Set(prev.map((d) => d.transaccionAsociadaID));
      const nuevos = docs.filter((d) => !existentes.has(d.transaccionAsociadaID));
      return [...prev, ...nuevos];
    });
  };

  // ===== NCF Modificado =====
  const handleNcfTipoChange = (value: 'documento' | 'modificado') => {
    setNcfTipo(value);
    if (value === 'documento') setNcfModificadoVal('');
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

  // ===== Totales calculados =====
  const totales = {
    subTotal: detallesMovimiento.reduce((s, d) => s + (d.subTotal || 0), 0),
    descuento: detallesMovimiento.reduce((s, d) => s + (d.descuento || 0), 0),
    impuestos: detallesMovimiento.reduce((s, d) => s + (d.impuestos || 0), 0),
    total: detallesMovimiento.reduce((s, d) => s + (d.total || 0), 0),
  };

  // ===== Columnas =====
  const asociadasColumns = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110, render: (v: string) => formatDate(v) },
    {
      title: 'Documento', dataIndex: 'documento', key: 'documento', width: 150,
      render: (doc: string) => <span style={{ color: '#6c5ffc', fontWeight: 500 }}>{doc}</span>,
    },
    { title: 'Monto Original', dataIndex: 'montoOriginal', key: 'montoOriginal', width: 130, align: 'right' as const, render: (v: number) => formatNumber(v) },
    { title: 'Abonado', dataIndex: 'pagado', key: 'pagado', width: 120, align: 'right' as const, render: (v: number) => formatNumber(v) },
    { title: 'Pendiente', dataIndex: 'saldoPendiente', key: 'saldoPendiente', width: 120, align: 'right' as const, render: (v: number) => <strong>{formatNumber(v)}</strong> },
    {
      title: 'Monto a Aplicar', dataIndex: 'monto', key: 'monto', width: 130, align: 'right' as const,
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
    { title: 'NCF', dataIndex: 'nCF', key: 'nCF', width: 140, render: (v: string) => v || '-' },
  ];

  const detalleMovimientoColumns = [
    {
      title: 'CÃ³digo',
      key: 'codigo',
      width: 120,
      fixed: 'left' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13 }}>
          <div>{record.codigo || '-'}</div>
          {record.referencia && (
            <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5 }}>
              {record.referencia}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'ArtÃ­culo',
      key: 'articulo',
      ellipsis: true,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13 }}>
          <div>{toTitleCase(record.articulo || '')}</div>
          <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }}>
            {record.familia?.nombre ? <Tag style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>{toTitleCase(record.familia.nombre)}</Tag> : null}
            {record.fechaVencimiento && <span>V: {formatDate(record.fechaVencimiento)}</span>}
          </div>
        </div>
      ),
    },
    { title: 'Tipo', dataIndex: 'tipo', key: 'tipo', width: 100, onCell: () => ({ style: { verticalAlign: 'top' } }) },
    { title: 'Cantidad', dataIndex: 'cantidad', key: 'cantidad', width: 100, align: 'right' as const, onCell: () => ({ style: { verticalAlign: 'top' } }), render: (v: number) => formatNumber(v) },
    { title: 'Medida', dataIndex: 'udm', key: 'medida', width: 80, onCell: () => ({ style: { verticalAlign: 'top' } }), render: (v: string) => v || '-' },
    { title: 'Precio', dataIndex: 'precio', key: 'precio', width: 110, align: 'right' as const, responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const], onCell: () => ({ style: { verticalAlign: 'top' } }), render: (v: number) => formatNumber(v) },
    { title: 'SubTotal', dataIndex: 'subTotal', key: 'subTotal', width: 120, align: 'right' as const, responsive: ['lg' as const, 'xl' as const, 'xxl' as const], onCell: () => ({ style: { verticalAlign: 'top' } }), render: (v: number) => formatNumber(v) },
    { title: 'Impuestos', dataIndex: 'impuestos', key: 'impuestos', width: 140, align: 'right' as const, responsive: ['lg' as const, 'xl' as const, 'xxl' as const], onCell: () => ({ style: { verticalAlign: 'top' } }), render: (v: number) => formatNumber(v) },
    { title: 'Descuento', dataIndex: 'descuento', key: 'descuento', width: 120, align: 'right' as const, responsive: ['lg' as const, 'xl' as const, 'xxl' as const], onCell: () => ({ style: { verticalAlign: 'top' } }), render: (v: number) => formatNumber(v) },
    { title: 'Total', dataIndex: 'total', key: 'total', width: 120, align: 'right' as const, onCell: () => ({ style: { verticalAlign: 'top' } }), render: (v: number) => <strong>{formatNumber(v)}</strong> },
  ];

  const devolucionesColumns = [
    { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 150 },
    { title: 'Monto', dataIndex: 'monto', key: 'monto', width: 130, align: 'right' as const, render: (v: number) => formatCurrency(v) },
    { title: 'Pérdida', dataIndex: 'perdida', key: 'perdida', width: 130, align: 'right' as const, render: (v: number) => formatCurrency(v) },
    {
      title: 'Generar Pérdida', dataIndex: 'generarPerdida', key: 'generarPerdida', width: 130,
      render: (_: any, record: DevolucionDTO, idx: number) => (
        <Switch
          checked={record.generarPerdida}
          onChange={(checked) => {
            setDevoluciones((prev) =>
              prev.map((d, i) => i === idx ? { ...d, generarPerdida: checked } : d)
            );
          }}
        />
      ),
    },
  ];

  const impuestoFacturaColumns = [
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', ellipsis: true },
    { title: 'Cuenta', dataIndex: 'cuenta', key: 'cuenta', width: 120, render: (v: string) => v || '-' },
    {
      title: 'Monto', dataIndex: 'monto', key: 'monto', width: 130, align: 'right' as const,
      render: (_: any, _record: ImpuestoFacturaDTO, idx: number) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          min={0}
          step={0.01}
          precision={2}
          value={impuestosFactura[idx]?.monto}
          onChange={(val) => {
            setImpuestosFactura((prev) =>
              prev.map((im, i) => i === idx ? { ...im, monto: val || 0 } : im)
            );
          }}
        />
      ),
    },
  ];

  // ===== Loading =====
  if (loading) {
    return <LoadingSpinner mensaje="Cargando documento..." />;
  }

  // ===== Estado info =====
  const estadoInfo = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Borrador', color: 'default' };

  // ===== Encabezado =====
  const renderEncabezado = () => (
    <Card className="paces-card" size="small" title="Datos Generales" style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={24} xxl={18}>
          <Form form={form} layout="vertical" size="small" style={{ paddingTop: 24 }}>
        <Row gutter={[16, 24]}>
          {/* Fila 1: Tipo + Concepto */}
          <Col xs={24} sm={12} lg={9}>
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
                      {toTitleCase(tc.nombre)}
                    </Select.Option>
                  ))}
                </Select>
              </FloatingField>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={15}>
            <div ref={conceptoRef} style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
              <div style={{ flex: 1 }}>
                <FloatingField label="Concepto" required>
                  <Input
                    placeholder=" "
                    value={selectedConcepto ? toTitleCase(selectedConcepto.nombre) : conceptoSearchText}
                    readOnly
                    onClick={() => setConceptoModalOpen(true)}
                  />
                </FloatingField>
              </div>
              <Button icon={<SearchOutlined />} onClick={() => setConceptoModalOpen(true)} />
              {selectedConcepto && (
                <Button icon={<ClearOutlined />} onClick={handleConceptoClear} />
              )}
            </div>
            <Form.Item name="concepto" hidden><Input /></Form.Item>
            {conceptoInfo && (
              <Col xs={24}>
                <Typography.Text type="warning" style={{ fontSize: 12 }}>{conceptoInfo}</Typography.Text>
              </Col>
            )}
          </Col>

          {/* Fila: Sucursal */}
          <Col xs={24} sm={12} lg={6} ref={sucursalRef}>
            <Form.Item name="sucursal" style={{ marginBottom: 0 }}>
              <FloatingField label="Sucursal">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  onChange={(val) => {
                    const s = sucursalesCache.find((x: any) => x.codigo === val || x.idExterno === val);
                    setSelectedSucursal(s || null);
                  }}
                >
                  {sucursalesCache.map((s: any) => (
                    <Select.Option key={s.codigo || s.idExterno} value={s.codigo || s.idExterno}>
                      {toTitleCase(s.nombre)}
                    </Select.Option>
                  ))}
                </Select>
              </FloatingField>
            </Form.Item>
            <Form.Item name="sucursal" hidden><Input /></Form.Item>
          </Col>

          {/* Fila 2: Entidad */}
          <Col xs={24} sm={12} lg={12} ref={entidadRef}>
            <Form.Item name="entidad" required style={{ marginBottom: 0 }}>
              <FloatingField label={entidadLabel} required>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  notFoundContent="Seleccione un concepto primero"
                  onChange={(val) => {
                    if (!val) { setSelectedEntidad(null); return; }
                    
                    const ent = entidadesCache.find((e: any) => e.codigo === val);
                    if (!ent) return;
                    
                    // Si hay documentos asignados, preguntar antes de cambiar
                    const tieneDocs = transaccionesAsociadas.length > 0 || devoluciones.length > 0;
                    if (tieneDocs && selectedEntidad) {
                      Modal.confirm({
                        title: 'Cambiar entidad',
                        icon: <ExclamationCircleOutlined />,
                        content: `La entidad ${ent.nombre} tiene documentos asignados. Se borrarán los documentos agregados. ¿Está seguro?`,
                        okText: 'Sí, cambiar',
                        cancelText: 'No',
                        okButtonProps: { danger: true },
                        onOk: () => {
                          setSelectedEntidad(ent);
                          setTransaccionesAsociadas([]);
                          setDevoluciones([]);
                          form.setFieldsValue({ entidad: ent.codigo });
                        },
                        onCancel: () => {
                          // Restaurar valor anterior
                          form.setFieldsValue({ entidad: selectedEntidad.codigo });
                        },
                      });
                    } else {
                      setSelectedEntidad(ent);
                      form.setFieldsValue({ entidad: ent.codigo });
                    }
                  }}
                  onDropdownVisibleChange={(open) => {
                    if (open && !selectedConcepto) {
                      message.info('Seleccione un concepto primero');
                    }
                  }}
                >
                  {entidadesCache.map((ent: any) => (
                    <Select.Option key={ent.codigo} value={ent.codigo}>
                      {toTitleCase(ent.nombre)}{ent.identificacion ? ` (${ent.identificacion})` : ''}
                    </Select.Option>
                  ))}
                </Select>
              </FloatingField>
            </Form.Item>
          </Col>

          {/* RNC ReadOnly */}
          <Col xs={24} sm={12} lg={6}>
            <FloatingField label="RNC">
              <Input value={selectedEntidad?.identificacion || ''} readOnly />
            </FloatingField>
          </Col>

          {/* Entidad Nombre ReadOnly */}
          <Col xs={24} sm={12} lg={6}>
            <FloatingField label="Nombre">
              <Input value={selectedEntidad?.nombre ? toTitleCase(selectedEntidad.nombre) : ''} readOnly />
            </FloatingField>
          </Col>

          {/* Fila 3: Fecha + Monto Total */}
          <Col xs={24} sm={12} lg={6}>
            <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }}>
              <FloatingField label="Fecha" required>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </FloatingField>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Form.Item name="total" required style={{ marginBottom: 0 }}>
              <FloatingField label="Monto Total" required>
                <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
              </FloatingField>
            </Form.Item>
          </Col>

          {/* Fila: Bienes + Servicios */}
          <Col xs={24} sm={12} lg={6}>
            <Form.Item name="bienes" style={{ marginBottom: 0 }}>
              <FloatingField label="Bienes">
                <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
              </FloatingField>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Form.Item name="servicios" style={{ marginBottom: 0 }}>
              <FloatingField label="Servicios">
                <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
              </FloatingField>
            </Form.Item>
          </Col>

          {/* Fila 4: Campos rápidos */}
          <Col xs={24}>
            <div style={{ marginBottom: 16 }}>
              <Space size={[8, 8]} wrap>
                {/* NCF */}
                <div>
                  {editingField === 'ncf' ? (
                    <Input
                      size="small"
                      style={{ width: 200 }}
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
                    <Tag style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => openFieldEditor('ncf')}>
                      NCF: {ncfValue} <EditOutlined />
                    </Tag>
                  ) : (
                    <Tag style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => openFieldEditor('ncf')}>
                      <PlusOutlined /> NCF
                    </Tag>
                  )}
                </div>

                {/* Selector NCF Modificado */}
                <Select
                  size="small"
                  style={{ width: 160 }}
                  value={ncfTipo}
                  onChange={handleNcfTipoChange}
                >
                  <Select.Option value="documento">NCF Documento</Select.Option>
                  <Select.Option value="modificado">NCF Modificado</Select.Option>
                </Select>

                {ncfTipo === 'modificado' && (
                  <Input
                    size="small"
                    style={{ width: 200 }}
                    placeholder="NCF Modificado"
                    maxLength={19}
                    value={ncfModificadoVal}
                    onChange={(e) => setNcfModificadoVal(e.target.value.toUpperCase())}
                    status={ncfModificadoVal && !validarNcfModificado(ncfModificadoVal) ? 'error' : undefined}
                  />
                )}

                {/* Referencia */}
                {editingField === 'referencia' ? (
                  <Input
                    size="small"
                    style={{ width: 200 }}
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
                  <Tag style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => openFieldEditor('referencia')}>
                    Ref: {refValue} <EditOutlined />
                  </Tag>
                ) : (
                  <Tag style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => openFieldEditor('referencia')}>
                    <PlusOutlined /> Referencia
                  </Tag>
                )}

                {/* Tasa */}
                {editingField === 'tasa' ? (
                  <InputNumber
                    size="small"
                    style={{ width: 120 }}
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
                  <Tag style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => openFieldEditor('tasa')}>
                    Tasa: {tasaValue} <EditOutlined />
                  </Tag>
                ) : (
                  <Tag style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => openFieldEditor('tasa')}>
                    <PlusOutlined /> Tasa
                  </Tag>
                )}
              </Space>
            </div>
            <Form.Item name="ncf" hidden><Input /></Form.Item>
            <Form.Item name="referencia" hidden><Input /></Form.Item>
            <Form.Item name="tasa" hidden><InputNumber /></Form.Item>
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
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'flex-start' }}>
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => setBuscarDocModalOpen(true)}>
            Agregar Documento
          </Button>
        </div>
        <Table
          dataSource={transaccionesAsociadas}
          columns={asociadasColumns}
          rowKey={(r) => r.transaccionAsociadaID || r.id || Math.random()}
          size="small"
          pagination={false}
          scroll={{ x: 900 }}
        />
      </div>
    ),
  });

  // Tab 2: Artículos (solo CLI)
  if (tipoEntidad === 'CLI') {
    tabItems.push({
      key: 'articulos',
      label: `Artículos (${detallesMovimiento.length})`,
      children: (
        <div>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
            <Space>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => {
                  const nuevoId = -(detallesMovimiento.length + 1);
                  setDetallesMovimiento((prev) => [
                    ...prev,
                    {
                      id: nuevoId,
                      codigo: '',
                      articulo: '',
                      cantidad: 0,
                      precio: 0,
                      subTotal: 0,
                      impuestos: 0,
                      descuento: 0,
                      total: 0,
                      tipoArticulo: 'Producto',
                    },
                  ]);
                }}
              >
                Agregar fila
              </Button>
            </Space>
          </div>
          <Table
            dataSource={detallesMovimiento}
            columns={detalleMovimientoColumns}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: 1200 }}
          />
        </div>
      ),
    });
  }

  // Tab 3: Devoluciones (solo SUP)
  if (tipoEntidad === 'SUP') {
    tabItems.push({
      key: 'devoluciones',
      label: `Devoluciones (${devoluciones.length})`,
      children: (
        <Table
          dataSource={devoluciones}
          columns={devolucionesColumns}
          rowKey={(r) => r.id || Math.random()}
          size="small"
          pagination={false}
          scroll={{ x: 600 }}
        />
      ),
    });
  }

  // Tab 4: Impuestos y Retenciones
  tabItems.push({
    key: 'impuestos',
    label: `Impuestos y Retenciones (${impuestosFactura.length})`,
    children: (
      <Table
        dataSource={impuestosFactura}
        columns={impuestoFacturaColumns}
        rowKey={(r) => r.id || Math.random()}
        size="small"
        pagination={false}
        scroll={{ x: 500 }}
      />
    ),
  });

  // Tab 5: Asientos Contables
  tabItems.push({
    key: 'asientos',
    label: `Asientos Contables (${asientos.length})`,
    children: (
      <AsientosContableEditables
        asientos={asientos}
        onChange={setAsientos}
        editable={estado === 0 && tienePermisoPostear}
        onGenerar={handleGenerarAsientos}
        generando={saving}
        disableGenerar={!id}
      />
    ),
  });

  // Tab 6: Historial
  tabItems.push({
    key: 'historial',
    label: `Historial (${logs.length})`,
    children: (
      <LogTable dataSource={logs} scroll={{ x: 900 }} />
    ),
  });

  const handleRefresh = useCallback(() => {
    if (mode === 'crear') return;
    if (!id) return;
    setLoadingError(false);
    setLoading(true);
    notaCreditoApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res: any) => {
        setData(res);
        setTransaccionesAsociadas(res.transaccionesAsociadas || []);
        setDetallesMovimiento(res.detallesMovimiento || res.detalles || []);
        setDevoluciones(res.devoluciones || []);
        setImpuestosFactura(res.impuestosFactura || []);
        setAsientos(res.asientos || []);
        setLogs(res.logs || []);
        setSelectedConcepto(res.concepto || null);
        setSelectedEntidad(res.entidad || null);
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
          tasa: res.tasa || 1, nota: res.nota || '', total: res.total || 0, bienes: res.bienes || 0, servicios: res.servicios || 0,
        });
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        message.error(msg); setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, form, mode]);

  // ===== Render principal =====
  return (
    <div>
      <FormularioToolbar saving={saving} estado={estado} periodo={data?.periodo} onGuardar={handleGuardar} onCancelar={handleCancelar} />

      {loadingError && (
        <Alert
          message="Error al cargar formulario de nota de crédito"
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
        fetchConceptos={() => conceptosApi.obtenerConceptosPorDocumento(sucursalActiva, 'NC')}
      />

      <BuscarDocumentoModal
        open={buscarDocModalOpen}
        onClose={() => setBuscarDocModalOpen(false)}
        onSelect={handleDocRelacionadoSelect}
        tipoEntidad={tipoEntidad}
        montoTotal={Number(form.getFieldValue('total') || 0)}
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

      {/* Guía paso a paso (solo en modo crear o editar borrador) */}
      {(mode === 'crear' || esBorrador) && (
        <NotaCreditoGuide
          mode={mode}
          concepto={selectedConcepto}
          sucursal={selectedSucursal}
          entidad={selectedEntidad}
          detallesCount={transaccionesAsociadas.length + devoluciones.length}
          conceptoRef={conceptoRef}
          sucursalRef={sucursalRef}
          entidadRef={entidadRef}
          documentosRef={documentosRef}
        />
      )}
    </div>
  );
};

export default NotaCreditoFormulario;
