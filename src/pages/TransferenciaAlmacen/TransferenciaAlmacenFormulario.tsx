import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Popover,
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
import { transferenciaAlmacenApi } from '../../api/transferenciaAlmacenApi';
import { productoApi } from '../../api/productoApi';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import type {
  ConceptoDTO, AlmacenDTO,
  AsientoContableDTO,
} from '../../types/entradaAlmacen';
import type { DetalleTransferenciaAlmacenDTO, TransferenciaAlmacenFullDTO } from '../../types/transferenciaAlmacen';

const { Text } = Typography;
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

// ===== Helpers de formato =====
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

// ===== Interfaz local con _costo interno (no enviado a la API) =====
interface DetalleTRPInterno extends DetalleTransferenciaAlmacenDTO {
  _costo?: number;
}

// ===== Cálculo de fila para TRP (sin descuento, sin impuesto) =====
function calcularFila(fila: DetalleTRPInterno): DetalleTRPInterno {
  const cantidad = fila.cantidad || 0;
  const costo = fila._costo || 0;
  const subTotal = Math.round(cantidad * costo * 100) / 100;
  const total = Math.round(cantidad * costo * 100) / 100;

  return {
    ...fila,
    cantidad,
    subTotal,
    total,
  };
}

function filaVacia(): DetalleTRPInterno {
  return {
    id: 0,
    codigo: '',
    articulo: '',
    referencia: '',
    cantidad: 0,
    subTotal: 0,
    total: 0,
    tipoArticulo: 'Producto',
    _costo: 0,
  };
}

// ===== Componente BuscarProductoModal (simplificado: sin impuesto, sin vencimiento) =====
interface BuscarProductoModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (producto: {
    codigo: string;
    articulo: string;
    referencia: string;
    costo: number;
    familia?: { nombre: string; idExterno: string };
    medida?: { nombre: string; codigo: string; factor: number; idExterno: number };
  }) => void;
}

const BuscarProductoModal: React.FC<BuscarProductoModalProps> = ({ open, onClose, onSelect }) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const cargar = useCallback(async (filtro?: string) => {
    setLoading(true);
    try {
      const res = await productoApi.obtenerListado(sucursalActiva, filtro ? { codigo: filtro } : undefined);
      setProductos(res || []);
    } catch {
      message.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    if (open) cargar();
  }, [open, cargar]);

  const columnas = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
    { title: 'Artículo', dataIndex: 'nombre', key: 'nombre', ellipsis: true,
      render: (v: string) => toTitleCase(v) },
    { title: 'Referencia', dataIndex: 'referencia', key: 'referencia', width: 120,
      render: (v: string) => v || '-' },
  ];

  return (
    <Modal
      title="Buscar Producto"
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnHidden
    >
      <Input.Search
        placeholder="Buscar por código o nombre..."
        allowClear
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onSearch={(val) => cargar(val)}
        style={{ marginBottom: 16 }}
      />
      <Table
        dataSource={productos}
        columns={columnas}
        rowKey="codigo"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        onRow={(record) => ({
          onClick: async () => {
            try {
              const detalle = await productoApi.obtenerDetalle(sucursalActiva, record.codigo);
              onSelect({
                codigo: record.codigo,
                articulo: detalle.nombre || record.nombre,
                referencia: detalle.referenciaInterna || record.referencia || '',
                costo: detalle.ultimoCosto || record.ultimoCosto || 0,
                familia: detalle.familia || record.familia,
                medida: detalle.unidadMedida
                  ? { nombre: detalle.unidadMedida.nombre || '', codigo: '', factor: 1, idExterno: detalle.unidadMedida.idExterno || 0 }
                  : record.unidadMedida
                    ? { nombre: record.unidadMedida.nombre || '', codigo: '', factor: 1, idExterno: record.unidadMedida.idExterno || 0 }
                    : undefined,
              });
            } catch {
              onSelect({
                codigo: record.codigo,
                articulo: record.nombre,
                referencia: record.referencia || '',
                costo: record.ultimoCosto || 0,
                familia: record.familia,
                medida: record.unidadMedida
                  ? { nombre: record.unidadMedida.nombre || '', codigo: '', factor: 1, idExterno: record.unidadMedida.idExterno || 0 }
                  : undefined,
              });
            }
            onClose();
          },
          style: { cursor: 'pointer' },
        })}
      />
    </Modal>
  );
};

// ===== Componente TotalesCard (sin descuento ni impuestos) =====
interface TotalesCardProps {
  subTotal: number;
  total: number;
  alignRight: boolean;
  monedaSimbolo?: string;
  monedaNombre?: string;
  tasa?: number;
}

const TotalesCard: React.FC<TotalesCardProps> = ({ subTotal, total, alignRight, monedaSimbolo, monedaNombre, tasa }) => (
  <Card
    title={<span style={{ fontSize: 16, fontWeight: 600 }}>Totales</span>}
    className="paces-card"
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: alignRight ? 'right' : undefined }}>
      {monedaSimbolo && tasa !== undefined && (
        <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16 }}>
          {!alignRight && <span className="paces-text-secondary">Moneda</span>}
          <span>{monedaNombre || 'Peso Dominicano'} ({monedaSimbolo || 'RD$'} {formatNumber(tasa ?? 1)})</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16 }}>
        {!alignRight && <span className="paces-text-secondary">Subtotal</span>}
        <span>{formatNumber(subTotal)}</span>
      </div>
    </div>

    <Divider style={{ margin: '12px 0' }} />

    <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16, fontSize: 16, fontWeight: 700 }}>
      {!alignRight && <span>Total</span>}
      <span style={{ color: 'var(--paces-primary)' }}>{formatCurrency(total)}</span>
    </div>
  </Card>
);

// ===== Componente principal =====
const TransferenciaAlmacenFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<TransferenciaAlmacenFullDTO | null>(null);
  const [detalles, setDetalles] = useState<DetalleTRPInterno[]>([]);
  const [almacenesCache, setAlmacenesCache] = useState<AlmacenDTO[]>([]);
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [selectedAlmacen, setSelectedAlmacen] = useState<AlmacenDTO | null>(null);
  const [selectedAlmacenDestino, setSelectedAlmacenDestino] = useState<AlmacenDTO | null>(null);
  const [conceptoInfo, setConceptoInfo] = useState<string>('');
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');

  // Refs para la guía
  const conceptoRef = useRef<HTMLDivElement>(null);
  const almacenOrigenRef = useRef<HTMLDivElement>(null);
  const almacenDestinoRef = useRef<HTMLDivElement>(null);
  const agregarFilaRef = useRef<HTMLDivElement>(null);

  // ===== Detalles filtrados por búsqueda =====
  const detallesFiltrados = detalleSearch
    ? detalles.filter((d) => {
        const q = detalleSearch.toLowerCase();
        return (
          (d.codigo || '').toLowerCase().includes(q) ||
          (d.articulo || '').toLowerCase().includes(q) ||
          (d.referencia || '').toLowerCase().includes(q)
        );
      })
    : detalles;

  // ===== Estado para campos rápidos (NCF, Referencia, Tasa) =====
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

  const [form] = Form.useForm();

  // ===== Watchers reactivos =====
  const ncfValue = Form.useWatch('ncf', form) || '';
  const refValue = Form.useWatch('referencia', form) || '';
  const tasaValue = Form.useWatch('tasa', form) ?? 1;

  const isLarge = screens.lg ?? true;

  // ===== Determinar estado =====
  const estado = data?.estado ?? 0;
  const esCerrado = data?.periodo === 6;
  const esBorrador = estado === 0;
  const esAplicado = estado === 1;
  const esAnulado = estado === 3;

  // ===== Cargar datos de apoyo al montar =====
  useEffect(() => {
    setActiveModule('FTRP');
    const pageTitle = mode === 'crear' ? 'Nueva Transferencia de Almacén' : 'Editar Transferencia de Almacén';
    setPageTitleOverride(pageTitle);

    // Cargar almacenes
    transferenciaAlmacenApi.obtenerAlmacenes(sucursalActiva).then(setAlmacenesCache).catch(() => {});

    // Inicializar fecha en modo crear
    if (mode === 'crear') {
      form.setFieldsValue({
        fechaDocumento: dayjs(),
      });
    }

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, sucursalActiva, form]);

  // ===== Cargar datos si es modo editar =====
  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;

    setLoading(true);
    transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setDetalles((res.detalles || []).map((d) => ({ ...d, _costo: d.total && d.cantidad ? d.total / d.cantidad : 0 })));
        setSelectedConcepto(res.concepto || null);
        setSelectedAlmacen(res.almacen || null);
        setSelectedAlmacenDestino(res.almacenDestino || null);

        const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;

        form.setFieldsValue({
          concepto: res.concepto?.codigo || '',
          almacen: res.almacen?.codigo || '',
          almacenDestino: res.almacenDestino?.codigo || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          ncf: res.ncf || '',
          referencia: res.referencia || '',
          moneda: res.moneda?.nombre || '',
          tasa: res.tasa || 1,
          nota: res.nota || '',
        });
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        message.error(msg);
        navigate('/FTRP');
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate]);

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
          navigate('/FTRP');
        } else {
          if (id) {
            setLoading(true);
            transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
              .then((res) => {
                setData(res);
                setDetalles((res.detalles || []).map((d) => ({ ...d, _costo: d.total && d.cantidad ? d.total / d.cantidad : 0 })));
                setSelectedConcepto(res.concepto || null);
                setSelectedAlmacen(res.almacen || null);
                setSelectedAlmacenDestino(res.almacenDestino || null);

                const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;

                form.setFieldsValue({
                  concepto: res.concepto?.codigo || '',
                  almacen: res.almacen?.codigo || '',
                  almacenDestino: res.almacenDestino?.codigo || '',
                  fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                  ncf: res.ncf || '',
                  referencia: res.referencia || '',
                  moneda: res.moneda?.nombre || '',
                  tasa: res.tasa || 1,
                  nota: res.nota || '',
                });
              })
              .catch((err: any) => {
                const msg = err?.response?.data?.errorMessage || 'Error al recargar el documento';
                message.error(msg);
              })
              .finally(() => setLoading(false));
          }
          navigate(`/FTRP/${id}`);
        }
      },
    });
  };

  // Validación del formulario
  const validarFormulario = (): string | null => {
    const values = form.getFieldsValue();
    if (!selectedConcepto) return 'Debe elegir un Concepto para poder continuar';
    if (!selectedAlmacen && !values.almacen) return 'El Almacén Origen es requerido';
    if (!selectedAlmacenDestino && !values.almacenDestino) return 'El Almacén Destino es requerido';
    if (selectedAlmacen && selectedAlmacenDestino && selectedAlmacen.codigo === selectedAlmacenDestino.codigo) {
      return 'No puedes transferir al mismo Almacen';
    }
    if (detalles.length === 0) return 'No se puede crear un documento de TRANSFERENCIA ALMACEN sin detalle.';
    if (!detalles.some((d) => (d.cantidad || 0) > 0)) return 'Debe tener al menos un detalle con cantidad > 0';
    return null;
  };

  // Construir DTO desde el formulario
  const construirDTO = (): TransferenciaAlmacenFullDTO => {
    const values = form.getFieldsValue();
    const base = data || {} as any;

    const fechaDoc = values.fechaDocumento
      ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
        ? toISOFormat(values.fechaDocumento.toDate())
        : values.fechaDocumento)
      : toISOFormat(new Date());

    const totalSub = detalles.reduce((s, d) => s + (d.subTotal || 0), 0);
    const total = detalles.reduce((s, d) => s + (d.total || 0), 0);

    // Mapear detalles: quitar campo interno _costo
    const detallesDTO = detalles.map((d) => {
      const { _costo, ...rest } = d;
      return rest;
    });

    return {
      id: base.id || 0,
      fechaDocumento: fechaDoc,
      noDocumento: base.noDocumento || '',
      estado: base.estado || 0,
      periodo: base.periodo || new Date().getMonth() + 1,
      ncf: values.ncf || '',
      referencia: values.referencia || '',
      nota: values.nota || '',
      subTotal: Math.round(totalSub * 100) / 100,
      total: Math.round(total * 100) / 100,
      tasa: values.tasa || 1,
      documento: base.documento || { codigo: 'FTRP' },
      concepto: selectedConcepto || { nombre: '', codigo: '' },
      moneda: base.moneda || { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' },
      almacen: selectedAlmacen || { nombre: '', codigo: '' },
      almacenDestino: selectedAlmacenDestino || { nombre: '', codigo: '' },
      detalles: detallesDTO,
      asientos: base.asientos || [],
      logs: base.logs || [],
    };
  };

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
        const result = await transferenciaAlmacenApi.crear(sucursalActiva, dto);
        message.success('Transferencia de almacén creada exitosamente');
        navigate(`/FTRP/${result.id}`);
      } else {
        await transferenciaAlmacenApi.actualizar(sucursalActiva, dto);
        message.success('Transferencia de almacén actualizada exitosamente');
        navigate(`/FTRP/${id}`);
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
      const result = await transferenciaAlmacenApi.aplicar(sucursalActiva, parseInt(id));
      setData(result);
      message.success('Documento aplicado exitosamente');
      navigate(`/FTRP/${id}`);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al aplicar');
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
      await transferenciaAlmacenApi.anular(sucursalActiva, dto);
      message.success('Documento anulado exitosamente');
      navigate(`/FTRP/${id}`);
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
      await transferenciaAlmacenApi.postear(sucursalActiva, dto);
      message.success('Documento posteado exitosamente');
      navigate(`/FTRP/${id}`);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al postear');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== Handlers de concepto =====
  const handleConceptoSelect = (concepto: ConceptoDTO) => {
    setSelectedConcepto(concepto);
    setEditingField(null);
    form.setFieldsValue({ concepto: concepto.codigo });

    // Auto-asignar almacenes según concepto
    if (concepto.almacen) {
      setSelectedAlmacen(concepto.almacen);
      form.setFieldsValue({ almacen: concepto.almacen.codigo });
    }

    // Mostrar avisos si el concepto tiene flags especiales
    const infoParts: string[] = [];
    if (concepto.noImpuesto) infoParts.push(' * No Impuestos * ');
    if (concepto.noAsientos) infoParts.push(' * No Asientos * ');
    if (concepto.activo === false) infoParts.push(' * Concepto Inactivo * ');
    if (concepto.noActualizaCostos) infoParts.push(' * No Actualiza Costos * ');
    setConceptoInfo(infoParts.join(''));

    // Configurar moneda según el concepto
    const monedaNombre = concepto.moneda?.nombre || 'Peso Dominicano';
    form.setFieldsValue({
      moneda: monedaNombre,
      tasa: 1,
    });
  };

  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
  const [conceptosCache, setConceptosCache] = useState<ConceptoDTO[]>([]);
  const [conceptoSearchText, setConceptoSearchText] = useState('');

  const handleConceptoSearchClick = () => {
    setConceptoModalOpen(true);
  };

  const handleConceptoClear = () => {
    setSelectedConcepto(null);
    setConceptoSearchText('');
    setConceptosCache([]);
    form.setFieldsValue({ concepto: '' });
  };

  // Cargar conceptos cuando se abre el modal
  const cargarConceptos = useCallback(async (_filtro?: string) => {
    try {
      const res = await transferenciaAlmacenApi.obtenerConceptos(sucursalActiva, 'FTRP');
      setConceptosCache(res || []);
    } catch {
      message.error('Error al cargar conceptos');
    }
  }, [sucursalActiva]);

  useEffect(() => {
    if (conceptoModalOpen) {
      cargarConceptos();
    }
  }, [conceptoModalOpen, cargarConceptos]);

  // ===== Handlers de detalles =====
  const handleAgregarFila = () => {
    setDetalles((prev) => [{ ...filaVacia(), id: -(prev.length + 1) }, ...prev]);
  };

  const handleEliminarFila = (id: number) => {
    Modal.confirm({
      title: 'Eliminar detalle',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro de eliminar este detalle?',
      okText: 'Sí',
      cancelText: 'No',
      okButtonProps: { danger: true },
      onOk: () => {
        setDetalles((prev) => prev.filter((d) => d.id !== id));
      },
    });
  };

  const handleDetalleUpdateValue = (id: number, field: string, value: any) => {
    setDetalles((prev) =>
      prev.map((d) => (d.id !== id ? d : { ...d, [field]: value }))
    );
  };

  const handleDetalleCalculate = (id: number, field: string, value: any) => {
    setDetalles((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const updated = { ...d, [field]: value };
        return calcularFila(updated);
      })
    );
  };

  const handleProductoSelect = (producto: any) => {
    // Buscar la primera fila vacía (sin código) y llenarla
    const filaVaciaIdx = detalles.findIndex((d) => !d.codigo);
    if (filaVaciaIdx === -1) {
      // Agregar nueva fila
      const nuevoId = -(detalles.length + 1);
      setDetalles((prev) => {
        const filled: DetalleTRPInterno = {
          ...filaVacia(),
          id: nuevoId,
          codigo: producto.codigo,
          articulo: producto.articulo,
          referencia: producto.referencia || '',
          _costo: producto.costo || 0,
          familia: producto.familia,
          medida: producto.medida,
        };
        return [calcularFila(filled), ...prev];
      });
    } else {
      setDetalles((prev) =>
        prev.map((d) => {
          if (d.id !== detalles[filaVaciaIdx].id) return d;
          return calcularFila({
            ...d,
            codigo: producto.codigo,
            articulo: producto.articulo,
            referencia: producto.referencia || '',
            _costo: producto.costo || 0,
            familia: producto.familia,
            medida: producto.medida,
          });
        })
      );
    }
  };

  // ===== Handlers de almacenes =====
  const handleAlmacenChange = (codigo: string) => {
    const alm = almacenesCache.find((a) => a.codigo === codigo);
    setSelectedAlmacen(alm || null);
    form.setFieldsValue({ almacen: codigo });
  };

  const handleAlmacenDestinoChange = (codigo: string) => {
    const alm = almacenesCache.find((a) => a.codigo === codigo);
    setSelectedAlmacenDestino(alm || null);
    form.setFieldsValue({ almacenDestino: codigo });
  };

  // ===== Totales calculados =====
  const totales = {
    subTotal: detalles.reduce((s, d) => s + (d.subTotal || 0), 0),
    total: detalles.reduce((s, d) => s + (d.total || 0), 0),
  };

  // ===== Columnas de la tabla de asientos =====
  function esDebito(tipo: any): boolean { return tipo === 'D' || tipo === 0; }
  function esCredito(tipo: any): boolean { return tipo === 'C' || tipo === 1; }
  const totalDebitos = (data?.asientos || []).reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
  const totalCreditos = (data?.asientos || []).reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);

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

  // ===== Estado info =====
  const estadoInfo = ESTADO_MAP[estado] || { label: 'Borrador', color: 'default' };

  // ===== Toolbar manual (inline) =====
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

        {/* Botones según estado - Creación */}
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

        {/* Botones según estado - Edición */}
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

  // ===== Modal de búsqueda de concepto =====
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
        onSearch={(val) => cargarConceptos(val)}
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

  // ===== Grid de detalles editable (sin costo, sin descuento, sin impuesto) =====
  const detalleColumns = [
    {
      title: 'Código',
      key: 'codigoInput',
      width: 100,
      render: (_: any, _record: DetalleTransferenciaAlmacenDTO, idx: number) => (
        <Input
          size="small"
          style={{ width: '100%' }}
          placeholder="Código"
          value={detalles[idx]?.codigo || ''}
          onChange={(e) => handleDetalleUpdateValue(detalles[idx].id, 'codigo', e.target.value)}
          onBlur={() => {
            const codigo = detalles[idx]?.codigo;
            if (codigo && codigo.length >= 2) {
              // Buscar producto por código usando obtenerDetalle
              productoApi.obtenerDetalle(sucursalActiva, codigo)
                .then((prod) => {
                  if (prod) {
                    handleDetalleUpdateValue(detalles[idx].id, 'articulo', prod.nombre || '');
                    handleDetalleUpdateValue(detalles[idx].id, 'referencia', prod.referenciaInterna || '');
                    handleDetalleUpdateValue(detalles[idx].id, '_costo', prod.ultimoCosto || 0);
                    handleDetalleUpdateValue(detalles[idx].id, 'familia', prod.familia);
                    if (prod.unidadMedida) {
                      handleDetalleUpdateValue(detalles[idx].id, 'medida', {
                        nombre: prod.unidadMedida.nombre || '',
                        codigo: '',
                        factor: 1,
                        idExterno: prod.unidadMedida.idExterno || 0,
                      });
                    }
                    handleDetalleCalculate(detalles[idx].id, '_costo', prod.ultimoCosto || 0);
                  }
                })
                .catch(() => {
                  // Si falla la búsqueda por código exacto, intentar con listado filtrado
                  productoApi.obtenerListado(sucursalActiva, { codigo })
                    .then((prods) => {
                      if (prods && prods.length > 0) {
                        const p = prods[0];
                        handleDetalleUpdateValue(detalles[idx].id, 'articulo', p.nombre || '');
                        handleDetalleUpdateValue(detalles[idx].id, 'referencia', p.referencia || '');
                        handleDetalleUpdateValue(detalles[idx].id, '_costo', p.ultimoCosto || 0);
                        if (p.familia) {
                          handleDetalleUpdateValue(detalles[idx].id, 'familia', p.familia);
                        }
                        if (p.unidadMedida) {
                          handleDetalleUpdateValue(detalles[idx].id, 'medida', {
                            nombre: p.unidadMedida.nombre || '',
                            codigo: '',
                            factor: 1,
                            idExterno: p.unidadMedida.idExterno || 0,
                          });
                        }
                        handleDetalleCalculate(detalles[idx].id, '_costo', p.ultimoCosto || 0);
                      }
                    })
                    .catch(() => {});
                });
            }
          }}
        />
      ),
    },
    {
      title: 'Artículo',
      key: 'articulo',
      ellipsis: true,
      shouldCellUpdate: (record: DetalleTransferenciaAlmacenDTO, prevRecord: DetalleTransferenciaAlmacenDTO) =>
        record.articulo !== prevRecord.articulo || record.referencia !== prevRecord.referencia ||
        (record as any).medida?.nombre !== (prevRecord as any).medida?.nombre,
      render: (_: any, record: DetalleTransferenciaAlmacenDTO) => (
        <div style={{ fontSize: 13 }}>
          <div>{toTitleCase(record.articulo || '')}</div>
          <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {record.referencia && <span>{record.referencia}</span>}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Familia',
      key: 'familia',
      width: 120,
      responsive: ['md' as const, 'lg' as const],
      render: (_: any, record: any) => (
        <Text style={{ fontSize: 12 }}>{record.familia?.nombre ? toTitleCase(record.familia.nombre) : '-'}</Text>
      ),
    },
    {
      title: 'Medida',
      key: 'medida',
      width: 80,
      responsive: ['sm' as const, 'md' as const, 'lg' as const],
      render: (_: any, record: any) => (
        <Text style={{ fontSize: 12 }}>{record.medida?.nombre ? toTitleCase(record.medida.nombre) : '-'}</Text>
      ),
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 100,
      align: 'right' as const,
      shouldCellUpdate: (record: DetalleTransferenciaAlmacenDTO, prevRecord: DetalleTransferenciaAlmacenDTO) =>
        record.cantidad !== prevRecord.cantidad || (record as any).medida?.nombre !== (prevRecord as any).medida?.nombre,
      render: (_: any, _record: DetalleTransferenciaAlmacenDTO, idx: number) => (
        <div>
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            min={0.01}
            step={0.01}
            precision={2}
            value={detalles[idx]?.cantidad}
            onChange={(val) => handleDetalleUpdateValue(detalles[idx].id, 'cantidad', val || 0)}
            onBlur={() => handleDetalleCalculate(detalles[idx].id, 'cantidad', detalles[idx]?.cantidad || 0)}
            onPressEnter={() => handleDetalleCalculate(detalles[idx].id, 'cantidad', detalles[idx]?.cantidad || 0)}
          />
          {(detalles[idx] as any)?.medida?.nombre && (
            <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 2 }}>
              {toTitleCase((detalles[idx] as any).medida!.nombre)}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 100,
      align: 'right' as const,
      render: (_: any, record: DetalleTransferenciaAlmacenDTO) => (
        <Text strong>{formatNumber(record.total || 0)}</Text>
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 50,
      render: (_: any, _record: DetalleTransferenciaAlmacenDTO, idx: number) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleEliminarFila(detalles[idx].id)}
        />
      ),
    },
  ];

  // ===== Encabezado del formulario =====
  const renderEncabezado = () => (
    <Card className="paces-card" size="small" title="Datos Generales" style={{ marginBottom: 16 }}>
      <Form form={form} layout="vertical" size="small" style={{ paddingTop: 24 }}>
        <Row gutter={[16, 24]}>
          {/* Fila 1: Concepto */}
          <Col xs={24} sm={12} lg={9}>
            <div ref={conceptoRef} style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
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

          {conceptoInfo && (
            <Col xs={24}>
              <Text type="warning" style={{ fontSize: 12 }}>{conceptoInfo}</Text>
            </Col>
          )}

          {/* Fila 2: FechaDocumento + Almacén Origen */}
          <Col xs={24} sm={12} lg={9}>
            <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }}>
              <FloatingField label="Fecha Documento" required>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </FloatingField>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={15}>
            <Form.Item name="almacen" required style={{ marginBottom: 0 }}>
              <FloatingField label="Almacén Origen" required ref={almacenOrigenRef}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  onChange={handleAlmacenChange}
                  value={selectedAlmacen?.codigo}
                >
                  {almacenesCache.map((alm) => (
                    <Select.Option key={alm.codigo} value={alm.codigo}>
                      {toTitleCase(alm.nombre)}
                    </Select.Option>
                  ))}
                </Select>
              </FloatingField>
            </Form.Item>
          </Col>

          {/* Fila 3: Almacén Destino + Tasa */}
          <Col xs={24} sm={12} lg={9}>
            <Form.Item name="almacenDestino" required style={{ marginBottom: 0 }}>
              <FloatingField label="Almacén Destino" required ref={almacenDestinoRef}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  onChange={handleAlmacenDestinoChange}
                  value={selectedAlmacenDestino?.codigo}
                >
                  {almacenesCache.map((alm) => (
                    <Select.Option key={alm.codigo} value={alm.codigo}>
                      {toTitleCase(alm.nombre)}
                    </Select.Option>
                  ))}
                </Select>
              </FloatingField>
            </Form.Item>
          </Col>

          {/* Fila 4: Botones rápidos para campos opcionales */}
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
            {/* Hidden form items para campos rápidos */}
            <Form.Item name="ncf" hidden><Input /></Form.Item>
            <Form.Item name="referencia" hidden><Input /></Form.Item>
            <Form.Item name="tasa" hidden><InputNumber /></Form.Item>
            <Form.Item name="moneda" hidden><Input /></Form.Item>
          </Col>

          {/* Fila 5: Nota */}
          <Col xs={24}>
            <Form.Item name="nota" style={{ marginBottom: 0 }}>
              <FloatingField label="Nota">
                <TextArea rows={3} />
              </FloatingField>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  );

  return (
    <div>
      {renderToolbar()}
      {modalConcepto}
      <BuscarProductoModal
        open={productoModalOpen}
        onClose={() => setProductoModalOpen(false)}
        onSelect={handleProductoSelect}
      />

      {isLarge ? (
        /* === DESKTOP LAYOUT (>= lg) === */
        <Row gutter={16}>
          <Col lg={18}>
            {renderEncabezado()}

            <Tabs
              defaultActiveKey="detalles"
              type="card"
              style={{ borderRadius: 8, padding: '0 16px' }}
              items={[
                {
                  key: 'detalles',
                  label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`,
                  children: (
                    <>
                      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} ref={agregarFilaRef}>
                        <Space>
                          <Button
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={handleAgregarFila}
                          >
                            Agregar fila
                          </Button>
                          <Button
                            icon={<SearchOutlined />}
                            onClick={() => setProductoModalOpen(true)}
                          >
                            Buscar Producto
                          </Button>
                        </Space>
                        <Input.Search
                          placeholder="Buscar detalle..."
                          allowClear
                          style={{ maxWidth: 250 }}
                          onSearch={(value) => setDetalleSearch(value)}
                          onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                        />
                      </div>
                      <Table
                        dataSource={detallesFiltrados}
                        columns={detalleColumns}
                        rowKey="id"
                        size="small"
                        pagination={false}
                        scroll={{ x: 800 }}
                      />
                    </>
                  ),
                },
                {
                  key: 'asientos',
                  label: `Asientos (${data?.asientos?.length || 0})`,
                  children: (
                    <Table
                      dataSource={data?.asientos || []}
                      columns={asientoColumns}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      scroll={{ x: 900 }}
                      summary={() => (
                        <Table.Summary fixed>
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={3}><strong>Totales</strong></Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right"><strong>{formatNumber(totalDebitos)}</strong></Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right"><strong>{formatNumber(totalCreditos)}</strong></Table.Summary.Cell>
                          </Table.Summary.Row>
                        </Table.Summary>
                      )}
                    />
                  ),
                },
                {
                  key: 'historial',
                  label: `Historial (${data?.logs?.length || 0})`,
                  children: (
                    <Table
                      dataSource={data?.logs || []}
                      columns={logColumns}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      scroll={{ x: 900 }}
                    />
                  ),
                },
              ]}
            />
          </Col>

          <Col lg={6}>
            <TotalesCard
              subTotal={totales.subTotal}
              total={totales.total}
              alignRight={false}
              monedaSimbolo={data?.moneda?.simbolo || 'RD$'}
              monedaNombre={data?.moneda?.nombre || 'Peso Dominicano'}
              tasa={tasaValue ?? data?.tasa ?? 1}
            />
          </Col>
        </Row>
      ) : (
        /* === MOBILE LAYOUT (< lg) === */
        <div>
          {renderEncabezado()}

          <Tabs
            defaultActiveKey="detalles"
            type="card"
            style={{ borderRadius: 8, padding: '0 16px' }}
            items={[
              {
                key: 'detalles',
                label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`,
                children: (
                  <>
                    <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} ref={agregarFilaRef}>
                      <Space>
                        <Button
                          type="dashed"
                          icon={<PlusOutlined />}
                          onClick={handleAgregarFila}
                        >
                          Agregar fila
                        </Button>
                        <Button
                          icon={<SearchOutlined />}
                          onClick={() => setProductoModalOpen(true)}
                        >
                          Buscar Prod.
                        </Button>
                      </Space>
                      <Input.Search
                        placeholder="Buscar detalle..."
                        allowClear
                        style={{ maxWidth: 250 }}
                        onSearch={(value) => setDetalleSearch(value)}
                        onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                      />
                    </div>
                    <Table
                      dataSource={detallesFiltrados}
                      columns={detalleColumns}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      scroll={{ x: 800 }}
                    />
                  </>
                ),
              },
              {
                key: 'asientos',
                label: `Asientos (${data?.asientos?.length || 0})`,
                children: (
                  <Table
                    dataSource={data?.asientos || []}
                    columns={asientoColumns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    scroll={{ x: 900 }}
                    summary={() => (
                      <Table.Summary fixed>
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={3}><strong>Totales</strong></Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right"><strong>{formatNumber(totalDebitos)}</strong></Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right"><strong>{formatNumber(totalCreditos)}</strong></Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    )}
                  />
                ),
              },
              {
                key: 'historial',
                label: `Historial (${data?.logs?.length || 0})`,
                children: (
                  <Table
                    dataSource={data?.logs || []}
                    columns={logColumns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    scroll={{ x: 900 }}
                  />
                ),
              },
            ]}
          />

          <TotalesCard
            subTotal={totales.subTotal}
            total={totales.total}
            alignRight={true}
            monedaSimbolo={data?.moneda?.simbolo || 'RD$'}
            monedaNombre={data?.moneda?.nombre || 'Peso Dominicano'}
            tasa={tasaValue ?? data?.tasa ?? 1}
          />
        </div>
      )}

      {/* Guía paso a paso (solo en modo crear o editar borrador) */}
      {(mode === 'crear' || esBorrador) && (
        <TransferenciaAlmacenGuide
          mode={mode}
          concepto={selectedConcepto}
          almacenOrigen={selectedAlmacen}
          almacenDestino={selectedAlmacenDestino}
          detallesCount={detalles.length}
          conceptoRef={conceptoRef}
          almacenOrigenRef={almacenOrigenRef}
          almacenDestinoRef={almacenDestinoRef}
          agregarFilaRef={agregarFilaRef}
        />
      )}
    </div>
  );
};

// ===== Componente Guía paso a paso para TRP =====
interface TransferenciaAlmacenGuideProps {
  mode: 'crear' | 'editar';
  concepto: ConceptoDTO | null;
  almacenOrigen: AlmacenDTO | null;
  almacenDestino: AlmacenDTO | null;
  detallesCount: number;
  conceptoRef: React.RefObject<HTMLDivElement | null>;
  almacenOrigenRef: React.RefObject<HTMLDivElement | null>;
  almacenDestinoRef: React.RefObject<HTMLDivElement | null>;
  agregarFilaRef: React.RefObject<HTMLDivElement | null>;
}

interface GuideStep {
  key: string;
  title: string;
  description: string;
  target: () => HTMLDivElement | null;
}

const TransferenciaAlmacenGuide: React.FC<TransferenciaAlmacenGuideProps> = ({
  concepto,
  almacenOrigen,
  almacenDestino,
  detallesCount,
  conceptoRef,
  almacenOrigenRef,
  almacenDestinoRef,
  agregarFilaRef,
}) => {
  const [open, setOpen] = useState(false);
  const dismissedStepRef = useRef<string | null>(null);
  const currentStepRef = useRef<GuideStep | null>(null);

  const getCurrentStep = useCallback((): GuideStep | null => {
    const steps: GuideStep[] = [
      {
        key: 'concepto',
        title: 'Paso 1: Concepto',
        description: 'Debe elegir un concepto para poder continuar. Los conceptos determinan ciertas acciones del documento.',
        target: () => conceptoRef.current,
      },
      {
        key: 'almacenOrigen',
        title: 'Paso 2: Almacén Origen',
        description: 'Seleccione el almacén desde donde saldrá la mercancía.',
        target: () => almacenOrigenRef.current,
      },
      {
        key: 'almacenDestino',
        title: 'Paso 3: Almacén Destino',
        description: 'Seleccione el almacén de destino. Debe ser diferente al almacén origen.',
        target: () => almacenDestinoRef.current,
      },
      {
        key: 'productos',
        title: 'Paso 4: Productos',
        description: 'Agregue productos al documento usando el botón "Agregar fila" o "Buscar Producto".',
        target: () => agregarFilaRef.current,
      },
    ];

    if (!concepto) return steps[0];
    if (!almacenOrigen) return steps[1];
    if (!almacenDestino) return steps[2];
    if (detallesCount === 0) return steps[3];

    return null;
  }, [concepto, almacenOrigen, almacenDestino, detallesCount, conceptoRef, almacenOrigenRef, almacenDestinoRef, agregarFilaRef]);

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

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.ant-popover')) return;
      setOpen(false);
      if (currentStepRef.current) {
        dismissedStepRef.current = currentStepRef.current.key;
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const currentStep = getCurrentStep();
  if (!currentStep) return null;

  const targetElement = currentStep.target();
  if (!targetElement) return null;

  const rect = targetElement.getBoundingClientRect();

  return createPortal(
    <Popover
      open={open}
      onOpenChange={(visible: boolean) => {
        if (!visible) {
          setOpen(false);
          dismissedStepRef.current = currentStep.key;
        }
      }}
      title={currentStep.title}
      content={currentStep.description}
      placement="top"
      trigger={[]}
      rootClassName="guide-popover"
    >
      <span
        style={{
          position: 'fixed',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />
    </Popover>,
    document.body,
  );
};

export default TransferenciaAlmacenFormulario;
