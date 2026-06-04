import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Alert,
} from 'antd';
import {
  SaveOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  ClearOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { reciboIngresoApi } from '../../api/reciboIngresoApi';
import { conceptosApi } from '../../api/conceptosApi';
import { tipoApi } from '../../api/tipoApi';
import { clienteApi } from '../../api/clienteApi';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import type { ConceptoDTO, AsientoContableDTO, LogDTO } from '../../types/entradaAlmacen';
import type {
  ReciboIngresoFullDTO, TransaccionAsociadaDTO, CobroDTO, TipoRISelectDTO,
} from '../../types/reciboIngreso';
import LogTable from '../../components/LogTable';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';

import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { formatCurrency, formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';

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
  const [conceptoInfo, setConceptoInfo] = useState<string>('');

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
  const totalValue = Form.useWatch('total', form) ?? 0;

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
    setActiveModule('FRI');
    const pageTitle = mode === 'crear'
      ? 'Nuevo Recibo de Ingreso'
      : 'Editar Recibo de Ingreso';
    setPageTitleOverride(pageTitle);

    // Cargar tipos para RI
    tipoApi.obtenerPorDocumento(sucursalActiva, 'RI')
      .then((tipos) => setTiposCache(tipos as any))
      .catch(() => {});

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
        navigate('/FRI');
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate]);

  // ===== Cargar entidades (clientes o suplidores) =====
  const cargarEntidades = async (conceptoCodigo?: string) => {
    try {
      const res = await conceptosApi.obtenerEntidades(sucursalActiva, conceptoCodigo || selectedConcepto?.codigo);
      setEntidadesCache(res || []);
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
          navigate('/FRI');
        } else if (id) {
          navigate(`/FRI/${id}`);
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

    // Validar distribución: Σ(pagos.Monto) ≤ Total (diferencia clave con NC/ND)
    if (transaccionesAsociadas.length > 0) {
      const sumaMontos = transaccionesAsociadas.reduce((s, t) => s + (t.monto || 0), 0);
      if (sumaMontos > (values.total || 0) + 0.01) {
        return 'La suma de montos en Documentos Relacionados no puede exceder el Total';
      }
    }

    // Validar asientos cuadrados
    if (asientos.length > 0) {
      const totalDebitos = asientos.reduce((s, r) => s + ((r.tipoAsiento === 'D' || r.tipoAsiento === 0) ? r.monto : 0), 0);
      const totalCreditos = asientos.reduce((s, r) => s + ((r.tipoAsiento === 'C' || r.tipoAsiento === 1) ? r.monto : 0), 0);
      if (Math.abs(totalDebitos - totalCreditos) > 0.01) {
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
      retenciones: Math.round(retenciones * 100) / 100,
      tipoDocumento: 'RI',
      documento: base.documento || { codigo: 'RI' },
      concepto: selectedConcepto || { nombre: '', codigo: '' },
      entidad: entidadSel || { nombre: '', codigo: '', identificacion: '' },
      moneda: base.moneda || { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' },
      codigoTipo: selectedTipo?.codigo || values.tipo || '',
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
        navigate(`/FRI/${result.id}`);
      } else {
        await reciboIngresoApi.actualizar(sucursalActiva, dto);
        message.success('Recibo de ingreso actualizado exitosamente');
        navigate(`/FRI/${id}`);
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
      const result = await reciboIngresoApi.recalcularPagos(sucursalActiva, parseInt(id)) as any;
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

  // ===== Handlers de tipo =====
  const handleTipoChange = (val: string) => {
    const t = tiposCache.find((tc) => tc.codigo === val);
    setSelectedTipo(t || null);
    // Resetear concepto al cambiar tipo
    setSelectedConcepto(null);
    setConceptoSearchText('');
    setEntidadesCache([]);
    setSelectedEntidad(null);
    setConceptoInfo('');
    form.setFieldsValue({ concepto: '', entidad: undefined });
  };

  // ===== Handlers de concepto =====
  const handleConceptoSelect = (concepto: ConceptoDTO) => {
    setSelectedConcepto(concepto);
    setEditingField(null);
    setConceptoSearchText('');
    form.setFieldsValue({ concepto: concepto.codigo });

    // Cargar entidades según concepto
    cargarEntidades(concepto.codigo);

    // Mostrar avisos si el concepto tiene flags especiales
    const infoParts: string[] = [];
    if (concepto.noImpuesto) infoParts.push(' * No Impuestos * ');
    if (concepto.noAsientos) infoParts.push(' * No Asientos * ');
    if (concepto.activo === false) infoParts.push(' * Concepto Inactivo * ');
    setConceptoInfo(infoParts.join(''));

    // === ConfigurarMoneda ===
    const monedaObj = concepto.moneda || { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' };
    form.setFieldsValue({
      moneda: monedaObj.nombre,
      tasa: monedaObj.codigo === 'DOP' ? 1 : 1,
    });
    // Actualizar data local para que la UI lo refleje
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, moneda: monedaObj };
    });
  };

  const handleConceptoClear = () => {
    setSelectedConcepto(null);
    setConceptoSearchText('');
    setEntidadesCache([]);
    setSelectedEntidad(null);
    setConceptoInfo('');
    form.setFieldsValue({ concepto: '', entidad: undefined });
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

  // Totales de asientos
  const totalDebitos = asientos.reduce((s, r) => s + ((r.tipoAsiento === 'D' || r.tipoAsiento === 0) ? r.monto : 0), 0);
  const totalCreditos = asientos.reduce((s, r) => s + ((r.tipoAsiento === 'C' || r.tipoAsiento === 1) ? r.monto : 0), 0);

  // ===== Columnas =====
  const asociadasColumns = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110, render: (v: string) => formatDate(v) },
    {
      title: 'Documento', dataIndex: 'documento', key: 'documento', width: 150,
      render: (doc: string) => <span style={{ color: '#6c5ffc', fontWeight: 500 }}>{doc}</span>,
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
      render: (_: any, r: AsientoContableDTO) => (r.tipoAsiento === 'D' || r.tipoAsiento === 0) ? formatNumber(r.monto) : '',
    },
    {
      title: 'Crédito', key: 'credito', width: 130, align: 'right' as const,
      render: (_: any, r: AsientoContableDTO) => (r.tipoAsiento === 'C' || r.tipoAsiento === 1) ? formatNumber(r.monto) : '',
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

          {conceptoInfo && (
            <Col xs={24}>
              <Text type="warning" style={{ fontSize: 12 }}>{conceptoInfo}</Text>
            </Col>
          )}

          {/* Fila 2: Entidad */}
          <Col xs={24} sm={12} lg={12}>
            <Form.Item name="entidad" required style={{ marginBottom: 0 }}>
              <FloatingField label="Entidad Desde" required>
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
            <FloatingField label="Entidad Nombre">
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



  // ===== Tabs =====
  const tabItems: any[] = [];

  // Tab 1: Documentos Relacionados
  tabItems.push({
    key: 'documentos',
    label: `Documentos Relacionados (${transaccionesAsociadas.length})`,
    children: (
      <div>
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Text className="paces-text-secondary">
              Total: {formatCurrency(totalValue || 0)} | Distribuido: {formatCurrency(totalDistribuido)} | 
              Por distribuir: <span style={{ color: porDistribuir > 0 ? '#faad14' : '#52c41a', fontWeight: 600 }}>{formatCurrency(porDistribuir)}</span>
            </Text>
          </Space>
        </div>
        <Table
          dataSource={transaccionesAsociadas}
          columns={asociadasColumns}
          rowKey={(r) => r.transaccionAsociadaID || r.id || Math.random()}
          size="small"
          pagination={false}
          scroll={{ x: 1200 }}
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
        fetchConceptos={() => conceptosApi.obtenerConceptosPorDocumento(sucursalActiva, 'RI')}
      />

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
            <EntidadCard entidad={selectedEntidad} fallbackTitulo="Entidad" />
            <TotalesCard
              subTotal={totalValue || 0}
              descuento={0}
              impuestos={0}
              total={totalValue || 0}
              alignRight={false}
              monedaSimbolo={data?.moneda?.simbolo || selectedConcepto?.moneda?.simbolo || 'RD$'}
              monedaNombre={data?.moneda?.nombre || selectedConcepto?.moneda?.nombre || 'Peso Dominicano'}
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
          <EntidadCard entidad={selectedEntidad} fallbackTitulo="Entidad" />
          <TotalesCard
            subTotal={totalValue || 0}
            descuento={0}
            impuestos={0}
            total={totalValue || 0}
            alignRight={true}
            monedaSimbolo={data?.moneda?.simbolo || selectedConcepto?.moneda?.simbolo || 'RD$'}
            monedaNombre={data?.moneda?.nombre || selectedConcepto?.moneda?.nombre || 'Peso Dominicano'}
          />
        </div>
      )}
    </div>
  );
};

export default ReciboIngresoFormulario;
