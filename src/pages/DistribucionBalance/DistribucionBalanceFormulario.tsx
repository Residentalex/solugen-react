import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Modal, Alert,
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
import { distribucionBalanceApi } from '../../api/distribucionBalanceApi';
import { conceptosApi } from '../../api/conceptosApi';
import { tipoApi } from '../../api/tipoApi';
import { clienteApi } from '../../api/clienteApi';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import type { ConceptoDTO, AsientoContableDTO, LogDTO } from '../../types/entradaAlmacen';
import type {
  TransaccionAsociadaDTO,
} from '../../types/distribucionBalance';
import type { TipoDocumentoDTO } from '../../types/transaccion';

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
interface DistribucionBalanceFormularioProps {
  tipoEntidad: 'SUP' | 'CLI';
}

const DistribucionBalanceFormulario: React.FC<DistribucionBalanceFormularioProps> = ({ tipoEntidad }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const codigoPantalla = tipoEntidad === 'SUP' ? 'FDBASUP' : 'FDBACLI';
  const entidadLabel = tipoEntidad === 'SUP' ? 'Suplidor' : 'Cliente';

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [tiposCache, setTiposCache] = useState<TipoDocumentoDTO[]>([]);
  const [conceptosCache, setConceptosCache] = useState<ConceptoDTO[]>([]);
  const [entidadesCache, setEntidadesCache] = useState<any[]>([]);
  const [selectedTipo, setSelectedTipo] = useState<TipoDocumentoDTO | null>(null);
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [selectedEntidad, setSelectedEntidad] = useState<any>(null);
  const [transaccionesAsociadas, setTransaccionesAsociadas] = useState<TransaccionAsociadaDTO[]>([]);
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

  // ===== Transacciones separadas por origen =====
  const debitos = transaccionesAsociadas.filter(
    (t) => t.origenCuenta?.toLowerCase() === 'debito' || t.origenCuenta === 'D' || t.origenCuenta === '0'
  );
  const creditos = transaccionesAsociadas.filter(
    (t) => t.origenCuenta?.toLowerCase() === 'credito' || t.origenCuenta === 'C' || t.origenCuenta === '1'
  );

  // ===== Totales DBA =====
  const totalDebitosDBA = debitos.reduce((s, t) => s + (t.monto || 0), 0);
  const totalCreditosDBA = creditos.reduce((s, t) => s + (t.monto || 0), 0);
  const pendienteDBA = totalDebitosDBA - totalCreditosDBA;

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
      ? `Nueva Distribución de Balance - ${entidadLabel}`
      : `Editar Distribución de Balance - ${entidadLabel}`;
    setPageTitleOverride(pageTitle);

    // Cargar tipos para DBA
    tipoApi.obtenerPorDocumento(sucursalActiva, 'DBA')
      .then((tipos) => setTiposCache(tipos as any))
      .catch(() => {});

    if (mode === 'crear') {
      form.setFieldsValue({
        fechaDocumento: dayjs(),
        tasa: 1,
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
    distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res: any) => {
        setData(res);
        setTransaccionesAsociadas(res.transaccionesAsociadas || []);
        setAsientos(res.asientos || []);
        setLogs(res.logs || []);

        setSelectedConcepto(res.concepto || null);
        setSelectedEntidad(res.entidad || null);

        if (res.tipo) {
          setSelectedTipo(res.tipo);
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
      const res = await conceptosApi.obtenerConceptos(sucursalActiva, 'DBA');
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
      // Fallback
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

    // REGLA CRÍTICA: Total Débitos == Total Créditos
    if (Math.abs(pendienteDBA) > 0.01) {
      return 'El total de Débitos debe ser igual al total de Créditos. Pendiente: ' + formatNumber(pendienteDBA);
    }

    // Validar asientos cuadrados
    if (asientos.length > 0) {
      const totalDebAsientos = asientos.reduce((s, r) => s + (r.tipoAsiento === 'D' || r.tipoAsiento === 0 ? r.monto : 0), 0);
      const totalCreAsientos = asientos.reduce((s, r) => s + (r.tipoAsiento === 'C' || r.tipoAsiento === 1 ? r.monto : 0), 0);
      if (Math.abs(totalDebAsientos - totalCreAsientos) > 0.01) {
        return 'Los asientos contables no están cuadrados';
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
    const base = data || {};

    const entidadSel = entidadesCache.find((e: any) => e.codigo === values.entidad) || selectedEntidad;

    const fechaDoc = values.fechaDocumento
      ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
        ? toISOFormat(values.fechaDocumento.toDate())
        : values.fechaDocumento)
      : toISOFormat(new Date());

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
      total: totalDebitosDBA,
      subTotal: base.subTotal || 0,
      descuento: base.descuento || 0,
      impuestos: base.impuestos || 0,
      tipoDocumento: 'DBA',
      tipoEntidad,
      documento: base.documento || { codigo: 'DBA' },
      concepto: selectedConcepto || { nombre: '', codigo: '' },
      entidad: entidadSel || { nombre: '', codigo: '', identificacion: '' },
      moneda: base.moneda || { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' },
      codigoTipo: selectedTipo?.codigo || values.tipo || '',
      // Colecciones
      transaccionesAsociadas: transaccionesAsociadas.map((t) => ({
        ...t,
        transaccionAsociadaID: t.transaccionAsociadaID || t.id,
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
        const result = await distribucionBalanceApi.crear(sucursalActiva, dto);
        message.success('Distribución de Balance creada exitosamente');
        navigate(`/${codigoPantalla}/${result.id}`);
      } else {
        await distribucionBalanceApi.actualizar(sucursalActiva, dto);
        message.success('Distribución de Balance actualizada exitosamente');
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
      const result = await distribucionBalanceApi.aplicar(sucursalActiva, parseInt(id));
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
      await distribucionBalanceApi.desaplicar(sucursalActiva, data.noDocumento || '');
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
      await distribucionBalanceApi.anular(sucursalActiva, dto);
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
      await distribucionBalanceApi.postear(sucursalActiva, dto);
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
      const result = await distribucionBalanceApi.recalcular(sucursalActiva, parseInt(id)) as any;
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

    // Configurar moneda según el concepto
    const monedaNombre = concepto.moneda?.nombre || 'Peso Dominicano';
    form.setFieldsValue({
      moneda: monedaNombre,
      tasa: 1,
    });
  };

  const handleConceptoSearchClick = () => setConceptoModalOpen(true);

  const handleConceptoClear = () => {
    setSelectedConcepto(null);
    setConceptoSearchText('');
    setEntidadesCache([]);
    form.setFieldsValue({ concepto: '', entidad: undefined });
  };

  // ===== Handle monto change en transacción asociada =====
  const handleAsociadaMontoChange = (id: number | undefined, value: number | null) => {
    if (!id) return;
    setTransaccionesAsociadas((prev) =>
      prev.map((t) => {
        if ((t.transaccionAsociadaID || t.id) !== id) return t;
        const monto = value ?? 0;
        return { ...t, monto: Math.min(monto, t.saldoPendiente) };
      })
    );
  };

  // ===== Totales para asientos =====
  function esDebito(tipo: any): boolean { return tipo === 'D' || tipo === 0; }
  function esCredito(tipo: any): boolean { return tipo === 'C' || tipo === 1; }
  const totalDebAsientos = asientos.reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
  const totalCreAsientos = asientos.reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);

  // ===== Columnas de transacciones asociadas =====
  const asociadasColumns: any[] = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 100, render: (v: string) => formatDate(v) },
    {
      title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140,
      render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span>,
    },
    { title: 'NCF', dataIndex: 'nCF', key: 'nCF', width: 130, render: (v: string) => v || '-' },
    {
      title: 'Monto Original', dataIndex: 'montoOriginal', key: 'montoOriginal', width: 120, align: 'right' as const,
      render: (v: number) => formatNumber(v),
    },
    {
      title: 'Abonado', dataIndex: 'pagado', key: 'pagado', width: 110, align: 'right' as const,
      render: (v: number) => formatNumber(v),
    },
    {
      title: 'Pendiente', dataIndex: 'saldoPendiente', key: 'saldoPendiente', width: 110, align: 'right' as const,
      render: (v: number) => <strong>{formatNumber(v)}</strong>,
    },
    {
      title: 'Retención', dataIndex: 'retencion', key: 'retencion', width: 100, align: 'right' as const,
      render: (v: number) => (v ? formatNumber(v) : '-'),
    },
    {
      title: 'Monto', key: 'monto', width: 120, align: 'right' as const,
      render: (_: any, record: TransaccionAsociadaDTO) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          min={0}
          max={record.saldoPendiente}
          step={0.01}
          precision={2}
          value={record.monto}
          onChange={(val) => handleAsociadaMontoChange(record.transaccionAsociadaID || record.id, val)}
        />
      ),
    },
  ];

  const asientoColumns = [
    { title: 'Cuenta', key: 'cuenta', width: 120,
      render: (_: any, r: AsientoContableDTO) => r.cuentaContable?.noCuenta || '-' },
    { title: 'Nombre', key: 'nombre', ellipsis: true,
      render: (_: any, r: AsientoContableDTO) => r.cuentaContable?.nombre ? toTitleCase(r.cuentaContable.nombre) : '-' },
    { title: 'Descripcion', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true,
      render: (v: string) => v ? toTitleCase(v) : '-' },
    { title: 'Debito', key: 'debito', width: 130, align: 'right' as const,
      render: (_: any, r: AsientoContableDTO) => esDebito(r.tipoAsiento) ? formatNumber(r.monto) : '' },
    { title: 'Credito', key: 'credito', width: 130, align: 'right' as const,
      render: (_: any, r: AsientoContableDTO) => esCredito(r.tipoAsiento) ? formatNumber(r.monto) : '' },
  ];

  const logColumns = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 160, render: (v: string) => formatDate(v) },
    { title: 'Usuario', dataIndex: 'usuario', key: 'usuario', width: 200,
      render: (v: any) => (v?.nombre ? toTitleCase(v.nombre) : v?.nombreUsuario ? toTitleCase(v.nombreUsuario) : '-') },
    { title: 'Estacion', dataIndex: 'estacion', key: 'estacion', width: 200 },
    { title: 'Accion', dataIndex: 'accion', key: 'accion', width: 120,
      render: (v: number) => ACCION_MAP[v] || `Accion ${v}` },
    { title: 'Motivos', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true },
  ];

  // ===== Loading state =====
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando documento...</div>
      </div>
    );
  }

  const estadoInfo = ESTADO_MAP[estado] || { label: 'Borrador', color: 'default' };

  // ===== Toolbar inline =====
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
              <Button icon={<ExclamationCircleOutlined />} loading={saving} onClick={handleAplicar}>
                Aplicar
              </Button>
            )}
            {esAplicado && (
              <Button icon={<ExclamationCircleOutlined />} loading={saving} onClick={handleDesaplicar}>
                Desaplicar
              </Button>
            )}
            {esAplicado && (
              <Button icon={<ExclamationCircleOutlined />} loading={saving} onClick={handlePostear}>
                Postear
              </Button>
            )}
            {!esAnulado && (
              <Button danger icon={<DeleteOutlined />} loading={saving} onClick={handleAnular}>
                Anular
              </Button>
            )}
            {id && (
              <Button icon={<ExclamationCircleOutlined />} loading={saving} onClick={handleGenerarAsientos}>
                ReCalcular
              </Button>
            )}
          </>
        )}
      </Space>
    </div>
  );

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
          { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', ellipsis: true,
            render: (v: string) => toTitleCase(v) },
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
                  onChange={(val) => {
                    const t = tiposCache.find((tc) => tc.codigo === val);
                    setSelectedTipo(t || null);
                  }}
                >
                  {tiposCache.map((t) => (
                    <Select.Option key={t.codigo} value={t.codigo}>
                      {t.nombre || t.codigo}
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
                    onClick={handleConceptoSearchClick}
                  />
                </FloatingField>
              </div>
              <Button icon={<SearchOutlined />} onClick={handleConceptoSearchClick} />
              {selectedConcepto && (
                <Button icon={<ClearOutlined />} onClick={handleConceptoClear} />
              )}
            </div>
            <Form.Item name="concepto" hidden><Input /></Form.Item>
          </Col>

          {/* Fila 2: Fecha + Entidad */}
          <Col xs={24} sm={12} lg={9}>
            <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }}>
              <FloatingField label="Fecha" required>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </FloatingField>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={15}>
            <Form.Item name="entidad" required style={{ marginBottom: 0 }}>
              <FloatingField label={entidadLabel} required>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  onChange={(val) => {
                    const ent = entidadesCache.find((e: any) => e.codigo === val);
                    setSelectedEntidad(ent || null);
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

          {/* Fila 3: Campos rápidos */}
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
            <Form.Item name="moneda" hidden><Input /></Form.Item>
          </Col>

          {/* Fila 4: Nota */}
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

  // ===== Footer de Totales DBA =====
  const BalanceFooter = () => (
    <Card className="paces-card" size="small" style={{ marginTop: 16 }}>
      <Row gutter={[16, 8]}>
        <Col xs={8} style={{ textAlign: 'center' }}>
          <div className="paces-text-secondary" style={{ fontSize: 12 }}>Total Débitos</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#389e0d' }}>{formatNumber(totalDebitosDBA)}</div>
        </Col>
        <Col xs={8} style={{ textAlign: 'center' }}>
          <div className="paces-text-secondary" style={{ fontSize: 12 }}>Total Créditos</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#389e0d' }}>{formatNumber(totalCreditosDBA)}</div>
        </Col>
        <Col xs={8} style={{ textAlign: 'center' }}>
          <div className="paces-text-secondary" style={{ fontSize: 12 }}>Pendiente</div>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: Math.abs(pendienteDBA) > 0.01 ? '#ff4d4f' : '#389e0d',
          }}>
            {formatNumber(pendienteDBA)}
          </div>
        </Col>
      </Row>
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

  // ===== Totales Card (lateral) =====
  const TotalesCard = () => (
    <Card
      title={<span style={{ fontSize: 16, fontWeight: 600 }}>Balance</span>}
      className="paces-card"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span className="paces-text-secondary">Total Débitos</span>
          <span style={{ fontWeight: 600 }}>{formatNumber(totalDebitosDBA)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span className="paces-text-secondary">Total Créditos</span>
          <span style={{ fontWeight: 600 }}>{formatNumber(totalCreditosDBA)}</span>
        </div>
      </div>
      <Divider style={{ margin: '12px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 16, fontWeight: 700 }}>
        <span>Pendiente</span>
        <span style={{ color: Math.abs(pendienteDBA) > 0.01 ? '#ff4d4f' : 'var(--paces-primary)' }}>
          {formatNumber(pendienteDBA)}
        </span>
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

  // Tab 1: Débitos
  tabItems.push({
    key: 'debitos',
    label: `Débitos (${debitos.length})`,
    children: (
      <div>
        <Table
          dataSource={debitos}
          columns={asociadasColumns}
          rowKey={(r) => r.transaccionAsociadaID || r.id || Math.random()}
          size="small"
          pagination={false}
          scroll={{ x: 1000 }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={7} align="right">
                  <strong>Total Débitos:</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <strong style={{ color: '#389e0d' }}>{formatNumber(totalDebitosDBA)}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </div>
    ),
  });

  // Tab 2: Créditos
  tabItems.push({
    key: 'creditos',
    label: `Créditos (${creditos.length})`,
    children: (
      <div>
        <Table
          dataSource={creditos}
          columns={asociadasColumns}
          rowKey={(r) => r.transaccionAsociadaID || r.id || Math.random()}
          size="small"
          pagination={false}
          scroll={{ x: 1000 }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={7} align="right">
                  <strong>Total Créditos:</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <strong style={{ color: '#389e0d' }}>{formatNumber(totalCreditosDBA)}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </div>
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
                <Table.Summary.Cell index={3} align="right"><strong>{formatNumber(totalDebAsientos)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right"><strong>{formatNumber(totalCreAsientos)}</strong></Table.Summary.Cell>
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

  const handleRefresh = useCallback(() => {
    if (mode === 'crear') return;
    if (!id) return;
    setLoadingError(false);
    setLoading(true);
    distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res: any) => {
        setData(res);
        setTransaccionesAsociadas(res.transaccionesAsociadas || []);
        setAsientos(res.asientos || []);
        setLogs(res.logs || []);
        setSelectedConcepto(res.concepto || null);
        setSelectedEntidad(res.entidad || null);
        if (res.tipo) setSelectedTipo(res.tipo);
        const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
        form.setFieldsValue({
          tipo: res.tipo?.codigo || res.codigoTipo || '',
          concepto: res.concepto?.codigo || '',
          entidad: res.entidad?.codigo || res.codigoEntidad || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          ncf: res.ncf || '', referencia: res.referencia || '',
          tasa: res.tasa || 1, nota: res.nota || '',
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
          message="Error al cargar formulario de distribución de balance"
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
              defaultActiveKey="debitos"
              type="card"
              style={{ borderRadius: 8, padding: '0 16px' }}
              items={tabItems}
            />
            <BalanceFooter />
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
            defaultActiveKey="debitos"
            type="card"
            style={{ borderRadius: 8, padding: '0 16px' }}
            items={tabItems}
          />
          <BalanceFooter />
          <EntidadCard />
          <TotalesCard />
        </div>
      )}
    </div>
  );
};

export default DistribucionBalanceFormulario;
