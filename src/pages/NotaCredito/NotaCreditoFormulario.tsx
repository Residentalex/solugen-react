import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Modal, Alert,
  Switch,
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
import type {
  TransaccionAsociadaDTO,
  DetalleMovimientoDTO, DevolucionDTO, ImpuestoFacturaDTO,
  TipoNCSelectDTO,
} from '../../types/notaCredito';

const { TextArea } = Input;

const ESTADO_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Borrador', color: 'default' },
  1: { label: 'Aplicado', color: 'success' },
  2: { label: 'Autorizado', color: 'processing' },
  3: { label: 'Anulado', color: 'error' },
  4: { label: 'Pagado', color: 'cyan' },
  5: { label: 'Abierto', color: 'warning' },
  6: { label: 'Cerrado', color: 'default' },
};

const ACCION_MAP: Record<number, string> = {
  0: 'Crear', 1: 'Modificar', 2: 'Eliminar', 3: 'Aplicar',
  4: 'Desaplicar', 5: 'Postear', 6: 'Anular', 7: 'Revisar',
  8: 'Reversar', 9: 'Escanear',
};

// ===== Helpers =====
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

function parseDateRaw(val: string): Date | null {
  if (!val) return null;
  const num = val.replace(/\D/g, '');
  if (num.length >= 14) {
    const y = parseInt(num.slice(0, 4), 10);
    const m = parseInt(num.slice(4, 6), 10) - 1;
    const d = parseInt(num.slice(6, 8), 10);
    return new Date(y, m, d);
  }
  const dt = new Date(val);
  return isNaN(dt.getTime()) ? null : dt;
}

function toISOFormat(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}`;
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

// ===== Componente principal =====
interface NotaCreditoFormularioProps {
  tipoEntidad: 'SUP' | 'CLI';
}

const NotaCreditoFormulario: React.FC<NotaCreditoFormularioProps> = ({ tipoEntidad }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const codigoPantalla = tipoEntidad === 'SUP' ? 'FNCSUP' : 'FNCCLI';
  const entidadLabel = tipoEntidad === 'SUP' ? 'Suplidor' : 'Cliente';

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [tiposCache, setTiposCache] = useState<TipoNCSelectDTO[]>([]);
  const [conceptosCache, setConceptosCache] = useState<ConceptoDTO[]>([]);
  const [entidadesCache, setEntidadesCache] = useState<any[]>([]);
  const [selectedTipo, setSelectedTipo] = useState<TipoNCSelectDTO | null>(null);
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [selectedEntidad, setSelectedEntidad] = useState<any>(null);
  const [transaccionesAsociadas, setTransaccionesAsociadas] = useState<TransaccionAsociadaDTO[]>([]);
  const [detallesMovimiento, setDetallesMovimiento] = useState<DetalleMovimientoDTO[]>([]);
  const [devoluciones, setDevoluciones] = useState<DevolucionDTO[]>([]);
  const [impuestosFactura, setImpuestosFactura] = useState<ImpuestoFacturaDTO[]>([]);
  const [asientos, setAsientos] = useState<AsientoContableDTO[]>([]);
  const [logs, setLogs] = useState<LogDTO[]>([]);

  // Concepto modal
  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
  const [conceptoSearchText, setConceptoSearchText] = useState('');

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

  const isLarge = screens.lg ?? true;

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

    // Cargar tipos para NC
    tipoApi.obtenerPorDocumento(sucursalActiva, 'NC')
      .then((tipos) => setTiposCache(tipos as any))
      .catch(() => {});

    if (mode === 'crear') {
      form.setFieldsValue({
        fechaDocumento: dayjs(),
        tasa: 1,
        total: 0,
      });
    }

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, sucursalActiva, form, codigoPantalla, entidadLabel]);

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

  // ===== Cargar conceptos =====
  const cargarConceptos = useCallback(async () => {
    try {
      const res = await conceptosApi.obtenerConceptos(sucursalActiva, 'NC');
      setConceptosCache(res || []);
      return res || [];
    } catch {
      message.error('Error al cargar conceptos');
      return [];
    }
  }, [sucursalActiva]);

  useEffect(() => {
    if (conceptoModalOpen) {
      cargarConceptos();
    }
  }, [conceptoModalOpen, cargarConceptos]);

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
  const validarFormulario = (): string | null => {
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
    }

    return null;
  };

  // ===== Construir DTO =====
  const construirDTO = (): any => {
    const values = form.getFieldsValue();
    const base = data || {};

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
      referencia: values.referencia || '',
      nota: values.nota || '',
      tasa: values.tasa || 1,
      total: values.total || 0,
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
    const error = validarFormulario();
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

  const handleAplicar = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const result = await notaCreditoApi.aplicar(sucursalActiva, parseInt(id));
      setData(result);
      message.success('Documento aplicado exitosamente');
      navigate(`/${codigoPantalla}/${id}`);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al aplicar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDesaplicar = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await notaCreditoApi.desaplicar(sucursalActiva, data.noDocumento || '');
      message.success('Documento desaplicado exitosamente');
      navigate(`/${codigoPantalla}/${id}`);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al desaplicar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAnular = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const dto = construirDTO();
      await notaCreditoApi.anular(sucursalActiva, dto);
      message.success('Documento anulado exitosamente');
      navigate(`/${codigoPantalla}/${id}`);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al anular');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePostear = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const dto = construirDTO();
      await notaCreditoApi.postear(sucursalActiva, dto);
      message.success('Documento posteado exitosamente');
      navigate(`/${codigoPantalla}/${id}`);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al postear');
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

    // Cargar entidades según concepto
    cargarEntidades(concepto.codigo);
  };

  const handleConceptoClear = () => {
    setSelectedConcepto(null);
    setConceptoSearchText('');
    setEntidadesCache([]);
    setSelectedEntidad(null);
    form.setFieldsValue({ concepto: '', entidad: undefined });
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

  const totalDebitos = asientos.reduce((s, r) => s + ((r.tipoAsiento === 'D' || r.tipoAsiento === 0) ? r.monto : 0), 0);
  const totalCreditos = asientos.reduce((s, r) => s + ((r.tipoAsiento === 'C' || r.tipoAsiento === 1) ? r.monto : 0), 0);

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
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 100 },
    { title: 'Artículo', dataIndex: 'articulo', key: 'articulo', ellipsis: true },
    { title: 'Familia', dataIndex: 'familia', key: 'familia', width: 120 },
    { title: 'Tipo', dataIndex: 'tipo', key: 'tipo', width: 100 },
    { title: 'Cantidad', dataIndex: 'cantidad', key: 'cantidad', width: 100, align: 'right' as const, render: (v: number) => formatNumber(v) },
    { title: 'UDM', dataIndex: 'udm', key: 'udm', width: 80, render: (v: string) => v || '-' },
    { title: 'Precio', dataIndex: 'precio', key: 'precio', width: 110, align: 'right' as const, render: (v: number) => formatNumber(v) },
    { title: 'SubTotal', dataIndex: 'subTotal', key: 'subTotal', width: 110, align: 'right' as const, render: (v: number) => formatNumber(v) },
    { title: 'Impuestos', dataIndex: 'impuestos', key: 'impuestos', width: 110, align: 'right' as const, render: (v: number) => formatNumber(v) },
    { title: 'Descuento', dataIndex: 'descuento', key: 'descuento', width: 110, align: 'right' as const, render: (v: number) => formatNumber(v) },
    { title: 'Total', dataIndex: 'total', key: 'total', width: 110, align: 'right' as const, render: (v: number) => <strong>{formatNumber(v)}</strong> },
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
      render: (_: any, r: AsientoContableDTO) => (r.tipoAsiento === 'D' || r.tipoAsiento === 0) ? formatNumber(r.monto) : '',
    },
    {
      title: 'Crédito', key: 'credito', width: 130, align: 'right' as const,
      render: (_: any, r: AsientoContableDTO) => (r.tipoAsiento === 'C' || r.tipoAsiento === 1) ? formatNumber(r.monto) : '',
    },
  ];

  const logColumns = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 160, render: (v: string) => formatDate(v) },
    {
      title: 'Usuario', dataIndex: 'usuario', key: 'usuario', width: 200,
      render: (v: any) => (v?.nombre ? toTitleCase(v.nombre) : v?.nombreUsuario ? toTitleCase(v.nombreUsuario) : '-'),
    },
    { title: 'Estación', dataIndex: 'estacion', key: 'estacion', width: 200 },
    { title: 'Acción', dataIndex: 'accion', key: 'accion', width: 120, render: (v: number) => ACCION_MAP[v] || `Acción ${v}` },
    { title: 'Motivos', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true },
  ];

  // ===== Loading =====
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando documento...</div>
      </div>
    );
  }

  // ===== Estado info =====
  const estadoInfo = ESTADO_MAP[estado] || { label: 'Borrador', color: 'default' };

  // ===== Toolbar =====
  const renderToolbar = () => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
      <div style={{ flex: 1 }} />
      <Space wrap>
        {mode === 'editar' && data && (
          <>
            {esCerrado && <Tag color="geekblue">Cerrado</Tag>}
            <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
          </>
        )}

        {mode === 'crear' && (
          <>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleGuardar}>
              Guardar
            </Button>
            <Button icon={<CloseOutlined />} onClick={handleCancelar}>
              Cancelar
            </Button>
          </>
        )}

        {mode === 'editar' && (
          <>
            {esBorrador && (
              <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleGuardar}>
                Guardar
              </Button>
            )}
            {esBorrador && (
              <Button icon={<CloseOutlined />} onClick={handleCancelar}>
                Cancelar
              </Button>
            )}
            {esBorrador && (
              <Button
                icon={<ExclamationCircleOutlined />}
                loading={saving}
                onClick={handleAplicar}
              >
                Aplicar
              </Button>
            )}
            {esAplicado && (
              <Button
                icon={<ExclamationCircleOutlined />}
                loading={saving}
                onClick={handleDesaplicar}
              >
                Desaplicar
              </Button>
            )}
            {esAplicado && (
              <Button
                icon={<ExclamationCircleOutlined />}
                loading={saving}
                onClick={handlePostear}
              >
                Postear
              </Button>
            )}
            {!esAnulado && (
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={saving}
                onClick={handleAnular}
              >
                Anular
              </Button>
            )}
          </>
        )}
      </Space>
    </div>
  );

  // ===== Encabezado =====
  const renderEncabezado = () => (
    <Card className="paces-card" size="small" title="Datos Generales" style={{ marginBottom: 16 }}>
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
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
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
          </Col>

          {/* Fila 2: Entidad */}
          <Col xs={24} sm={12} lg={12}>
            <Form.Item name="entidad" required style={{ marginBottom: 0 }}>
              <FloatingField label={entidadLabel} required>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  notFoundContent="Seleccione un concepto primero"
                  onChange={(val) => {
                    const ent = entidadesCache.find((e: any) => e.codigo === val);
                    setSelectedEntidad(ent || null);
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
    </Card>
  );

  // ===== Entidad Card =====
  const EntidadCard = () => (
    <Card
      title={<span style={{ fontSize: 16, fontWeight: 600 }}>{entidadLabel}</span>}
      className="paces-card"
      style={{ marginBottom: 16 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontWeight: 600 }}>
          {selectedEntidad?.nombre ? toTitleCase(selectedEntidad.nombre) : '-'}
        </div>
        <div>
          <span className="paces-text-secondary">RNC: </span>
          <span>{selectedEntidad?.identificacion || '-'}</span>
        </div>
        <div>
          <span className="paces-text-secondary">Teléfono: </span>
          <span>{selectedEntidad?.telefono || '-'}</span>
        </div>
      </div>
    </Card>
  );

  // ===== Totales Card =====
  const TotalesCard = () => (
    <Card
      title={<span style={{ fontSize: 16, fontWeight: 600 }}>Totales</span>}
      className="paces-card"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span className="paces-text-secondary">Subtotal</span>
          <span>{formatNumber(totales.subTotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span className="paces-text-secondary">Descuento</span>
          <span>{formatNumber(totales.descuento)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span className="paces-text-secondary">Impuestos</span>
          <span>{formatNumber(totales.impuestos)}</span>
        </div>
      </div>
      <Divider style={{ margin: '12px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 16, fontWeight: 700 }}>
        <span>Total</span>
        <span style={{ color: 'var(--paces-primary)' }}>{formatCurrency(totales.total)}</span>
      </div>
      {data?.nota && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }} className="paces-text-secondary">Notas</div>
            <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5 }} className="paces-text-dark">
              {data.nota}
            </div>
          </div>
        </>
      )}
    </Card>
  );

  // ===== Tabs =====
  const tabItems: any[] = [];

  // Tab 1: Documentos Relacionados
  tabItems.push({
    key: 'documentos',
    label: `Documentos Relacionados (${transaccionesAsociadas.length})`,
    children: (
      <Table
        dataSource={transaccionesAsociadas}
        columns={asociadasColumns}
        rowKey={(r) => r.transaccionAsociadaID || r.id || Math.random()}
        size="small"
        pagination={false}
        scroll={{ x: 900 }}
      />
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

  // Tab 6: Historial
  tabItems.push({
    key: 'historial',
    label: `Historial (${logs.length})`,
    children: (
      <Table
        dataSource={logs}
        columns={logColumns}
        rowKey={(r) => r as any}
        size="small"
        pagination={false}
        scroll={{ x: 900 }}
      />
    ),
  });

  // ===== Modal Concepto =====
  const modalConcepto = (
    <Modal
      title="Buscar Concepto"
      open={conceptoModalOpen}
      onCancel={() => setConceptoModalOpen(false)}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Input.Search
        placeholder="Buscar por código o nombre..."
        allowClear
        onSearch={() => cargarConceptos()}
        style={{ marginBottom: 16 }}
      />
      <Table
        dataSource={conceptosCache}
        columns={[
          { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
          { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', ellipsis: true, render: (v: string) => toTitleCase(v) },
        ]}
        rowKey="codigo"
        loading={false}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        onRow={(record) => ({
          onClick: () => {
            handleConceptoSelect(record);
            setConceptoModalOpen(false);
          },
          style: { cursor: 'pointer' },
        })}
      />
    </Modal>
  );

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
          tasa: res.tasa || 1, nota: res.nota || '', total: res.total || 0,
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
      {renderToolbar()}

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

      {modalConcepto}

      {isLarge ? (
        /* === DESKTOP === */
        <Row gutter={16}>
          <Col lg={18}>
            {renderEncabezado()}
            <Tabs
              defaultActiveKey="documentos"
              type="card"
              style={{ borderRadius: 8, padding: '0 16px' }}
              items={tabItems}
            />
          </Col>
          <Col lg={6}>
            <EntidadCard />
            <TotalesCard />
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
          <EntidadCard />
          <TotalesCard />
        </div>
      )}
    </div>
  );
};

export default NotaCreditoFormulario;
