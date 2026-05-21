import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Dropdown,
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
  MoreOutlined,
  CalendarOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Sucursal } from '../../types/auth';

import { entradaAlmacenApi } from '../../api/entradaAlmacenApi';
import { conceptosApi } from '../../api/conceptosApi';
import { ordenCompraApi } from '../../api/ordenCompraApi';
import { productoApi } from '../../api/productoApi';
import BuscarOrdenCompraModal from './BuscarOrdenCompraModal';
import EntradaAlmacenGuide from './EntradaAlmacenGuide';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import type {
  EntradaAlmacenDTO, DetalleEntradaAlmacenDTO, AsientoContableDTO,
  ConceptoDTO, EntidadDTO, AlmacenDTO, SuplidorDTO,
  OrdenCompraVistaDTO, DetalleOrdenCompraVistaDTO,
} from '../../types/entradaAlmacen';

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
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${day}${hh}${mm}${ss}`;
}

/** Formato ISO 8601 para JSON body (System.Text.Json en ASP.NET Core). */
function toISOFormat(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}`;
}

// ===== Helper para extraer mensaje de error de la respuesta del backend =====
function extraerMensajeError(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) return fallback;

  // Formato ApiResponse<T> (el estandar)
  if (data.errorMessage) return data.errorMessage;

  // Formato ValidationProblemDetails de ASP.NET Core
  if (data.errors && typeof data.errors === 'object') {
    const mensajes: string[] = [];
    for (const key of Object.keys(data.errors)) {
      const val = data.errors[key];
      if (Array.isArray(val)) {
        mensajes.push(...val);
      } else if (typeof val === 'string') {
        mensajes.push(val);
      }
    }
    if (mensajes.length > 0) return mensajes.join('; ');
  }

  return fallback;
}

// ===== Cálculo de fila =====
function calcularFila(fila: DetalleEntradaAlmacenDTO): DetalleEntradaAlmacenDTO {
  const cantidad = fila.cantidad || 0;
  const costo = fila.costo || 0;
  const pctDesc = fila.porcentajeDescuento || 0;
  const pctImp = fila.porcentajeImpuesto || 0;
  const cantBonif = fila.cantidadBonificable || 0;
  const ajustado = fila.ajustado || false;

  // Si hay bonificable y no se ha ajustado, recalcular costo efectivo
  let costoEfectivo = costo;
  let cantidadEfectiva = cantidad;
  let nuevoAjustado = ajustado;

  if (cantBonif > 0 && !ajustado) {
    const subTotalOriginal = Math.round(cantidad * costo * 100) / 100;
    cantidadEfectiva = cantidad + cantBonif;
    costoEfectivo = subTotalOriginal / cantidadEfectiva;
    nuevoAjustado = true;
  }

  const subTotal = Math.round(cantidadEfectiva * costoEfectivo * 100) / 100;
  const descuento = Math.round(subTotal * (pctDesc / 100) * 100) / 100;
  const baseImponible = subTotal - descuento;
  const impuestos = Math.round(baseImponible * (pctImp / 100) * 100) / 100;
  const total = Math.round((baseImponible + impuestos) * 100) / 100;

  return {
    ...fila,
    cantidad: cantidadEfectiva,
    costo: costoEfectivo,
    subTotal,
    descuento,
    impuestos,
    total,
    ajustado: nuevoAjustado,
  };
}

function filaVacia(): DetalleEntradaAlmacenDTO {
  return {
    id: 0,
    codigo: '',
    articulo: '',
    referencia: '',
    cantidad: 0,
    costo: 0,
    precio: 0,
    subTotal: 0,
    descuento: 0,
    porcentajeDescuento: 0,
    impuestos: 0,
    porcentajeImpuesto: 0,
    total: 0,
    tipoArticulo: 'Producto',
    flete: 0,
    costoActual: 0,
    ajustado: false,
    cantidadBonificable: 0,
  };
}

// ===== Componente BuscarConceptoModal =====
interface BuscarConceptoModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (concepto: ConceptoDTO) => void;
}

const BuscarConceptoModal: React.FC<BuscarConceptoModalProps> = ({ open, onClose, onSelect }) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [conceptos, setConceptos] = useState<ConceptoDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async (filtro?: string) => {
    setLoading(true);
    try {
      const res = await conceptosApi.obtenerConceptos(sucursalActiva, filtro);
      setConceptos(res || []);
    } catch {
      message.error('Error al cargar conceptos');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    if (open) cargar();
  }, [open, cargar]);

  const columnas = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', ellipsis: true,
      render: (v: string) => toTitleCase(v) },
  ];

  return (
    <Modal
      title="Buscar Concepto"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Input.Search
        placeholder="Buscar por código o nombre..."
        allowClear
        onSearch={(val) => cargar(val)}
        style={{ marginBottom: 16 }}
      />
      <Table
        dataSource={conceptos}
        columns={columnas}
        rowKey="codigo"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        onRow={(record) => ({
          onClick: () => { onSelect(record); onClose(); },
          style: { cursor: 'pointer' },
        })}
      />
    </Modal>
  );
};

// ===== Componente SuplidorCard (readonly en right column) =====
interface SuplidorCardProps {
  suplidor: SuplidorDTO | null;
}

const SuplidorCard: React.FC<SuplidorCardProps> = ({ suplidor }) => (
  <Card
    title={<span style={{ fontSize: 16, fontWeight: 600 }}>Suplidor</span>}
    className="paces-card"
    style={{ marginBottom: 16 }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontWeight: 600 }}>
        {suplidor?.nombre ? toTitleCase(suplidor.nombre) : '-'}
      </div>
      <div>
        <span className="paces-text-secondary">RNC: </span>
        <span>{suplidor?.identificacion || '-'}</span>
      </div>
      <div>
        <span className="paces-text-secondary">Teléfono: </span>
        <span>{suplidor?.telefono || '-'}</span>
      </div>
      <div>
        <span className="paces-text-secondary">Dirección: </span>
        <span>{suplidor?.direccion ? toTitleCase(suplidor.direccion) : '-'}</span>
      </div>
    </div>
  </Card>
);

// ===== Componente TotalesCard =====
interface TotalesCardProps {
  subTotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  alignRight: boolean;
  monedaSimbolo?: string;
  monedaNombre?: string;
  tasa?: number;
}

const TotalesCard: React.FC<TotalesCardProps> = ({ subTotal, descuento, impuestos, total, alignRight, monedaSimbolo, monedaNombre, tasa }) => (
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
      <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16 }}>
        {!alignRight && <span className="paces-text-secondary">Descuento</span>}
        <span>{formatNumber(descuento)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16 }}>
        {!alignRight && <span className="paces-text-secondary">Impuestos</span>}
        <span>{formatNumber(impuestos)}</span>
      </div>
    </div>

    <Divider style={{ margin: '12px 0' }} />

    <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16, fontSize: 16, fontWeight: 700 }}>
      {!alignRight && <span>Total</span>}
      <span style={{ color: 'var(--paces-primary)' }}>{formatCurrency(total)}</span>
    </div>
  </Card>
);

// ===== Contexto para pasar listeners de drag al handle =====
const DragListenersContext = React.createContext<any>(null);

// ===== Componente SortableRow para drag-and-drop =====
const SortableRow: React.FC<any> = ({ children, ...rest }) => {
  // Ant Design Table NO pasa record como prop en esta versión.
  // En su lugar, data-row-key se asigna automáticamente al <tr> vía rowKey="id".
  const recordId = rest['data-row-key'];

  // Si no hay data-row-key (expanded row, empty row, etc.), renderizar <tr> normal sin drag
  if (!recordId) {
    return <tr {...rest}>{children}</tr>;
  }

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: recordId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <DragListenersContext.Provider value={listeners}>
      <tr ref={setNodeRef} style={style} {...attributes} {...rest}>
        {children}
      </tr>
    </DragListenersContext.Provider>
  );
};

// ===== Componente DragHandle que inicia el arrastre solo desde el icono =====
const DragHandle: React.FC = () => {
  const listeners = React.useContext(DragListenersContext);
  return (
    <div
      {...(listeners ?? {})}
      style={{ cursor: 'grab', touchAction: 'none', userSelect: 'none', display: 'inline-flex' }}
    >
      <HolderOutlined style={{ color: '#999' }} />
    </div>
  );
};

// ===== Componente principal =====
const EntradaAlmacenFormulario: React.FC = () => {
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
  const [data, setData] = useState<EntradaAlmacenDTO | null>(null);
  const [detalles, setDetalles] = useState<DetalleEntradaAlmacenDTO[]>([]);
  const [entidadesCache, setEntidadesCache] = useState<SuplidorDTO[]>([]);
  const [almacenesCache, setAlmacenesCache] = useState<AlmacenDTO[]>([]);
  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
  const [conceptoSearchText, setConceptoSearchText] = useState('');
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [selectedEntidad, setSelectedEntidad] = useState<SuplidorDTO | null>(null);
  const [selectedAlmacen, setSelectedAlmacen] = useState<AlmacenDTO | null>(null);
  const [ordenCompraModalOpen, setOrdenCompraModalOpen] = useState(false);
  const [selectedOC, setSelectedOC] = useState<OrdenCompraVistaDTO | null>(null);
  const [ocDetallesData, setOcDetallesData] = useState<DetalleOrdenCompraVistaDTO[]>([]);
  const [ordenCompraNoDoc, setOrdenCompraNoDoc] = useState('');
  const [conceptoInfo, setConceptoInfo] = useState<string>('');
  const [agregarFilaBloqueado, setAgregarFilaBloqueado] = useState(false);
  const [fechaVencimientoModal, setFechaVencimientoModal] = useState<{ open: boolean; detalleId: number }>({ open: false, detalleId: 0 });
  const [detalleSearch, setDetalleSearch] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

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

  // ===== Watchers reactivos para campos usados en el encabezado =====
  const ncfValue = Form.useWatch('ncf', form) || '';
  const refValue = Form.useWatch('referencia', form) || '';
  const tasaValue = Form.useWatch('tasa', form) ?? 1;

  // ===== Refs para la guía (Tour) =====
  const conceptoRef = useRef<HTMLElement>(null);
  const suplidorRef = useRef<HTMLDivElement>(null);
  const ordenCompraRef = useRef<HTMLElement>(null);
  const almacenRef = useRef<HTMLDivElement>(null);
  const agregarFilaRef = useRef<HTMLElement>(null);
  const ncfRef = useRef<HTMLElement>(null);

  const isLarge = screens.lg ?? true;

  // ===== Determinar qué acciones mostrar según estado =====
  const estado = data?.estado ?? 0;
  const esCerrado = data?.periodo === 6;
  const esBorrador = estado === 0;
  const esAplicado = estado === 1;
  const esAnulado = estado === 3;

  // ===== Cargar datos de apoyo al montar =====
  useEffect(() => {
    setActiveModule('FENP');
    const pageTitle = mode === 'crear' ? 'Nueva Entrada de Almacén' : 'Editar Entrada de Almacén';
    setPageTitleOverride(pageTitle);

    // Cargar catálogos
    conceptosApi.obtenerAlmacenes(sucursalActiva).then(setAlmacenesCache).catch(() => {});

    // Inicializar fechas en modo crear
    if (mode === 'crear') {
      form.setFieldsValue({
        fechaDocumento: dayjs(),
        fechaRecibo: dayjs(),
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
    entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setDetalles(res.detalles || []);
        setSelectedConcepto(res.concepto || null);
        setConceptoSearchText(toTitleCase(res.concepto?.nombre || ''));
		// === DEFENSIVE: asegurar RNC desde entidad si suplidor no lo tiene ===
		const suplidorFinal = res.suplidor
		  ? { ...res.suplidor, identificacion: res.suplidor.identificacion || res.entidad?.identificacion || '' }
		  : res.entidad || null;
		setSelectedEntidad(suplidorFinal);
		setSelectedAlmacen(res.almacen || null);
		setSelectedOC(res.ordenCompra?.id ? { id: res.ordenCompra.id, noDocumento: res.ordenCompra.noDocumento } as any : null);
		setOrdenCompraNoDoc(res.ordenCompra?.noDocumento || '');

        // Poblar formulario
        const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;

        form.setFieldsValue({
          conceptoNombre: res.concepto?.nombre || '',
          concepto: res.concepto?.codigo || '',
			suplidor: res.suplidor?.codigo || res.entidad?.codigo || '',
          almacen: res.almacen?.codigo || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          fechaRecibo: res.fechaEntrega
            ? dayjs(parseDateRaw(res.fechaEntrega))
            : res.fechaDocumento
              ? dayjs(parseDateRaw(res.fechaDocumento))
              : null,
          ncf: res.ncf || '',
          referencia: res.referencia || '',
          ordenCompra: res.ordenCompra?.noDocumento || '',
          moneda: res.moneda?.nombre || '',
          tasa: res.tasa || 1,
          nota: res.nota || '',
        });

        // Cargar suplidores según el concepto (desde Sucursal.Compra para que idExterno coincida)
        if (res.concepto?.codigo) {
          conceptosApi.obtenerSuplidores(Sucursal.Compra)
            .then(setEntidadesCache)
            .catch(() => {});
        }
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        message.error(msg);
        navigate('/FENP');
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate]);

  // ===== Handlers =====
  const handleCancelar = () => {
    Modal.confirm({
      title: 'Cancelar',
      icon: <ExclamationCircleOutlined />,
      content: '¿Esta seguro que desea cancelar los cambios realizados?',
      okText: 'Si, cancelar',
      cancelText: 'No, continuar editando',
      okButtonProps: { danger: true },
      onOk: () => {
        setEditingField(null);
        setAgregarFilaBloqueado(false);
        if (mode === 'crear') {
          navigate('/FENP');
        } else {
          if (id) {
            setLoading(true);
            entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
              .then((res) => {
                setData(res);
                setDetalles(res.detalles || []);
                setSelectedConcepto(res.concepto || null);
                setConceptoSearchText(toTitleCase(res.concepto?.nombre || ''));
                // === DEFENSIVE: asegurar RNC desde entidad si suplidor no lo tiene ===
                const suplidorFinal = res.suplidor
                  ? { ...res.suplidor, identificacion: res.suplidor.identificacion || res.entidad?.identificacion || '' }
                  : res.entidad || null;
                setSelectedEntidad(suplidorFinal);
                setSelectedAlmacen(res.almacen || null);
                setSelectedOC(res.ordenCompra?.id ? { id: res.ordenCompra.id, noDocumento: res.ordenCompra.noDocumento } as any : null);
                setOrdenCompraNoDoc(res.ordenCompra?.noDocumento || '');

                const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;

                form.setFieldsValue({
                  conceptoNombre: res.concepto?.nombre || '',
                  concepto: res.concepto?.codigo || '',
 suplidor: res.suplidor?.codigo || res.entidad?.codigo || '',
                  almacen: res.almacen?.codigo || '',
                  fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                  fechaRecibo: res.fechaEntrega
                    ? dayjs(parseDateRaw(res.fechaEntrega))
                    : res.fechaDocumento
                      ? dayjs(parseDateRaw(res.fechaDocumento))
                      : null,
                  ncf: res.ncf || '',
                  referencia: res.referencia || '',
                  ordenCompra: res.ordenCompra?.noDocumento || '',
                  moneda: res.moneda?.nombre || '',
                  tasa: res.tasa || 1,
                  nota: res.nota || '',
                });

                if (res.concepto?.codigo) {
                  conceptosApi.obtenerSuplidores(Sucursal.Compra)
                    .then(setEntidadesCache)
                    .catch(() => {});
                }
              })
              .catch((err: any) => {
                const msg = err?.response?.data?.errorMessage || 'Error al recargar el documento';
                message.error(msg);
              })
              .finally(() => setLoading(false));
          }
          navigate(`/FENP/${id}`);
        }
      },
    });
  };

  // Validación del formulario
  const validarFormulario = (): string | null => {
    const values = form.getFieldsValue();
    if (!selectedConcepto) return 'El concepto es requerido';
    if (!values.suplidor) return 'El suplidor es requerido';
    if (!values.almacen && !selectedAlmacen) return 'El almacén es requerido';
    if (detalles.length === 0) return 'Debe agregar al menos un detalle';
    if (!detalles.some((d) => (d.cantidad || 0) > 0)) return 'Debe tener al menos un detalle con cantidad > 0';
    return null;
  };

  // Construir DTO desde el formulario
  const construirDTO = (): EntradaAlmacenDTO => {
    const values = form.getFieldsValue();
    const base = data || {} as any;

    const entidadSel = entidadesCache.find((e) => e.codigo === values.suplidor) || selectedEntidad;

    const fechaDoc = values.fechaDocumento
      ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
        ? toISOFormat(values.fechaDocumento.toDate())
        : values.fechaDocumento)
      : toISOFormat(new Date());

    const totalSub = detalles.reduce((s, d) => s + (d.subTotal || 0), 0);
    const totalDesc = detalles.reduce((s, d) => s + (d.descuento || 0), 0);
    const totalImp = detalles.reduce((s, d) => s + (d.impuestos || 0), 0);
    const total = detalles.reduce((s, d) => s + (d.total || 0), 0);

    return {
      id: base.id || 0,
      fechaDocumento: fechaDoc,
      fechaEntrega: values.fechaRecibo
        ? (typeof values.fechaRecibo === 'object' && values.fechaRecibo.toDate
            ? toISOFormat(values.fechaRecibo.toDate())
            : values.fechaRecibo)
        : null,
      tipoDocumento: base.tipoDocumento || 1,
      noDocumento: base.noDocumento || '',
      estado: base.estado || 0,
      periodo: base.periodo || new Date().getMonth() + 1,
      ncf: values.ncf || '',
      ncfModificado: base.ncfModificado || '',
      referencia: values.referencia || '',
      nota: values.nota || '',
      diasCredito: entidadSel?.diasCredito || base.diasCredito || 0,
      subTotal: Math.round(totalSub * 100) / 100,
      descuento: Math.round(totalDesc * 100) / 100,
      impuestos: Math.round(totalImp * 100) / 100,
      retenciones: base.retenciones || 0,
      total: Math.round(total * 100) / 100,
      tasa: values.tasa || 1,
      documento: base.documento || { codigo: 'ENP' },
      entidad: entidadSel
        ? { nombre: entidadSel.nombre, codigo: entidadSel.codigo, identificacion: entidadSel.identificacion || '', telefono: entidadSel.telefono, direccion: entidadSel.direccion }
        : { nombre: '', codigo: '', identificacion: '' },
      concepto: selectedConcepto || { nombre: '', codigo: '' },
      moneda: base.moneda || { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' },
      almacen: selectedAlmacen || { nombre: '', codigo: '' },
      suplidor: entidadSel || { nombre: '', codigo: '', identificacion: '' },
      sucursal: base.sucursal || { nombre: '', codigo: '', identificacion: '' },
      ordenCompra: values.ordenCompra
        ? { id: base.ordenCompra?.id || 0, noDocumento: values.ordenCompra }
        : { id: 0, noDocumento: '' },
      detalles: detalles.map((d) => calcularFila(d)),
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
        const result = await entradaAlmacenApi.crear(sucursalActiva, dto);
        message.success('Entrada de almacén creada exitosamente');
        navigate(`/FENP/${result.id}`);
      } else {
        await entradaAlmacenApi.actualizar(sucursalActiva, dto);
        message.success('Entrada de almacén actualizada exitosamente');
        navigate(`/FENP/${id}`);
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
      const result = await entradaAlmacenApi.aplicar(sucursalActiva, parseInt(id));
      setData(result);
      message.success('Documento aplicado exitosamente');
      navigate(`/FENP/${id}`);
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
      await entradaAlmacenApi.anular(sucursalActiva, dto);
      message.success('Documento anulado exitosamente');
      navigate(`/FENP/${id}`);
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
      await entradaAlmacenApi.postear(sucursalActiva, dto);
      message.success('Documento posteado exitosamente');
      navigate(`/FENP/${id}`);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al postear');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRevisado = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await entradaAlmacenApi.revisado(sucursalActiva, parseInt(id));
      message.success('Documento marcado como revisado');
      navigate(`/FENP/${id}`);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al marcar revisado');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReversar = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await entradaAlmacenApi.reversar(sucursalActiva, parseInt(id));
      message.success('Documento reversado exitosamente');
      navigate(`/FENP/${id}`);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al reversar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== Handlers de concepto =====
  const handleConceptoSelect = (concepto: ConceptoDTO) => {
    setSelectedConcepto(concepto);
    setConceptoSearchText(toTitleCase(concepto.nombre));
    setEditingField(null);
    form.setFieldsValue({ conceptoNombre: concepto.nombre });

    // Cargar suplidores del concepto (desde Sucursal.Compra para que idExterno coincida)
    conceptosApi.obtenerSuplidores(Sucursal.Compra)
      .then((ents) => setEntidadesCache(ents))
      .catch(() => {});

    // === ValidarImpuestosProducto ===
    // Mostrar avisos si el concepto tiene flags especiales
    const infoParts: string[] = [];
    if (concepto.noImpuesto) infoParts.push(' * No Impuestos * ');
    if (concepto.noAsientos) infoParts.push(' * No Asientos * ');
    if (concepto.activo === false) infoParts.push(' * Concepto Inactivo * ');
    if (concepto.noActualizaCostos) infoParts.push(' * No Actualiza Costos * ');
    setConceptoInfo(infoParts.join(''));

    // Si el concepto es NoImpuesto y hay detalles con impuestos, limpiarlos
    if (concepto.noImpuesto && detalles.some((d) => (d.porcentajeImpuesto || 0) > 0)) {
      message.warning('El Concepto no acepta Impuestos, por lo que serán eliminados.');
      setDetalles((prev) =>
        prev.map((d) => calcularFila({ ...d, porcentajeImpuesto: 0 }))
      );
    }

    // === ConfigurarMoneda ===
    // Usar la moneda del concepto si viene, sino default a Peso Dominicano
    const monedaNombre = concepto.moneda?.nombre || 'Peso Dominicano';
    const tasaDefault = concepto.moneda?.codigo === 'DOP' || !concepto.moneda ? 1 : (concepto.moneda?.codigo ? undefined : 1);
    form.setFieldsValue({
      moneda: monedaNombre,
      tasa: tasaDefault ?? 1,
    });

    // === ConfigurarAlmacenDefecto ===
    // No asignar automáticamente: la guía mostrará el paso de Almacén
    // para que el usuario lo seleccione manualmente.

    // Habilitar Orden de Compra
    // (tOrdenCompra.Enabled = true en desktop — en React ya está habilitado por defecto)

    // Mostrar guía
    // (MostrarGuia ya se maneja con el componente EntradaAlmacenGuide)
  };

  const handleConceptoSearchClick = () => {
    setConceptoModalOpen(true);
  };

  const handleConceptoClear = () => {
    setSelectedConcepto(null);
    setConceptoSearchText('');
    setEntidadesCache([]);
    form.setFieldsValue({ conceptoNombre: '', suplidor: undefined });
  };

  // ===== Handlers de OrdenCompra =====
  const handleBuscarOC = () => {
    setOrdenCompraModalOpen(true);
  };

  const handleOCSelect = async (orden: OrdenCompraVistaDTO) => {
    // 1. Si hay detalles existentes, preguntar si borrar
    if (detalles.length > 0) {
      const shouldClear = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: 'Cargar orden de compra',
          icon: <ExclamationCircleOutlined />,
          content: '¿Desea Borrar todos los registros?',
          okText: 'Si',
          cancelText: 'No',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!shouldClear) return;
      setDetalles([]);
    }

    // 2. Preguntar si cargar detalles
    const shouldLoad = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: 'Cargar orden de compra',
        content: '¿Desea Cargar todos los registros?',
        okText: 'Si',
        cancelText: 'No',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

    // 3. Cargar detalles si confirma
    if (shouldLoad) {
      try {
        const ocCompleta = await ordenCompraApi.obtenerPorId(Sucursal.Compra, orden.id);
        const ocDetalles = ocCompleta.detalles || [];
        setOcDetallesData(ocDetalles);
        const nuevosDetalles: DetalleEntradaAlmacenDTO[] = ocDetalles
          .filter((d) => {
            const cantidad = (d.cantidad + (d.cantidadBonificable || 0)) - (d.cantidadRecibida || 0);
            return cantidad > 0;
          })
          .map((d, idx) => ({
            id: -(idx + 1),
            idExterno: d.idExterno || d.id,
            idTransaccionExterna: d.idTransaccionExterna || orden.id,
            codigo: d.codigo,
            articulo: d.articulo,
            referencia: d.referencia || '',
            cantidad: (d.cantidad + (d.cantidadBonificable || 0)) - (d.cantidadRecibida || 0),
            costo: d.costo || 0,
            precio: d.precio || d.costo || 0,
            subTotal: 0,
            descuento: 0,
            porcentajeDescuento: d.porcentajeDescuento || 0,
            impuestos: 0,
            porcentajeImpuesto: d.porcentajeImpuesto || (d.impuesto?.porcentaje ?? 0),
            total: 0,
            tipoArticulo: d.tipoArticulo || 'Producto',
            nota: d.nota || '',
            flete: 0,
            costoActual: 0,
            ajustado: false,
            cantidadBonificable: d.cantidadBonificable || 0,
            tieneVencimiento: d.tieneVencimiento || false,
            familia: d.familia || undefined,
            medida: d.medida || undefined,
            impuesto: d.impuesto || undefined,
          }));
        setDetalles(nuevosDetalles.map((d) => calcularFila(d)));

        if (nuevosDetalles.length === 0) {
          message.warning('Esta orden de compra no tiene productos pendientes.');
        }

        // Verificar productos con vencimiento
        try {
          const codigos = nuevosDetalles.map((d) => d.codigo);
          const codigosVencimiento = await productoApi.obtenerProductosVencimiento(Sucursal.Compra, codigos);
          setDetalles((prev) =>
            prev.map((d) => ({
              ...d,
              tieneVencimiento: codigosVencimiento.includes(d.codigo) ? true : d.tieneVencimiento,
            }))
          );
        } catch {
          // Si falla la consulta de vencimiento, no bloquear el flujo
        }
      } catch (err: any) {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar detalles de la orden de compra';
        message.error(msg);
      }
    }

    // 4. Asignar suplidor desde la OC solo si no hay uno seleccionado
    if (!selectedEntidad) {
      const suplidorInfo: SuplidorDTO = {
        nombre: orden.suplidor.nombre,
        codigo: orden.suplidor.codigo,
        identificacion: '',
        telefono: orden.suplidor.telefono,
      };
      setSelectedEntidad(suplidorInfo);
      form.setFieldsValue({ suplidor: orden.suplidor.codigo });
    }
    setAgregarFilaBloqueado(false);

    // 5. Asignar referencia de OC
    setOrdenCompraNoDoc(orden.noDocumento);
    form.setFieldsValue({ ordenCompra: orden.noDocumento });
    setSelectedOC(orden);
  };

  const handleOCUnselect = () => {
    setSelectedOC(null);
    setOcDetallesData([]);
    setOrdenCompraNoDoc('');
    form.setFieldsValue({ ordenCompra: '' });
  };

  // ===== Handlers de detalles =====
  const handleAgregarFila = () => {
    setDetalles((prev) => [{ ...filaVacia(), id: -(prev.length + 1) }, ...prev]);
  };

  const handleEliminarFila = (id: number) => {
    setDetalles((prev) => prev.filter((d) => d.id !== id));
  };

  const handleDetalleUpdateValue = (id: number, field: string, value: any) => {
    setDetalles((prev) =>
      prev.map((d) => (d.id !== id ? d : { ...d, [field]: value }))
    );
  };

  const handleDetalleCalculate = (id: number, field: string, value: any) => {
    // Validar cantidad contra OC vinculada
    if (field === 'cantidad' && ocDetallesData.length > 0) {
      const detalle = detalles.find((d) => d.id === id);
      if (detalle) {
        const ocDetalle = ocDetallesData.find((d: DetalleOrdenCompraVistaDTO) => d.codigo === detalle.codigo);
        if (ocDetalle) {
          const factor = ocDetalle.medida?.factor || 1;
          const disponible = ((ocDetalle.cantidad + (ocDetalle.cantidadBonificable || 0)) - (ocDetalle.cantidadRecibida || 0));
          if ((Number(value) * factor) > (disponible * factor) && !ocDetalle.pesado) {
            message.warning(`La cantidad disponible en la OC es ${disponible}. Se ajustará automáticamente.`);
            value = disponible;
          }
        }
      }
    }

    setDetalles((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const updated = { ...d, [field]: value };
        return calcularFila(updated);
      })
    );
  };

  const handleFechaVencimiento = (date: dayjs.Dayjs | null) => {
    if (fechaVencimientoModal.detalleId) {
      setDetalles((prev) =>
        prev.map((d) => {
          if (d.id !== fechaVencimientoModal.detalleId) return d;
          return { ...d, fechaVencimiento: date ? date.format('YYYY-MM-DD') : undefined };
        })
      );
    }
    setFechaVencimientoModal({ open: false, detalleId: 0 });
  };

  const handleDragEnd = (event: any) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDetalles((prev) => {
      const oldIndex = prev.findIndex((d) => d.id === active.id);
      const newIndex = prev.findIndex((d) => d.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(oldIndex, 1);
      updated.splice(newIndex, 0, moved);
      return updated;
    });
  };

  // ===== Totales calculados =====
  const totales = {
    subTotal: detalles.reduce((s, d) => s + (d.subTotal || 0), 0),
    descuento: detalles.reduce((s, d) => s + (d.descuento || 0), 0),
    impuestos: detalles.reduce((s, d) => s + (d.impuestos || 0), 0),
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

  // ===== Estado y titulo =====
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
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleGuardar}>
          Guardar
        </Button>
        <Button icon={<CloseOutlined />} onClick={handleCancelar}>
          Cancelar
        </Button>
      </Space>
    </div>
  );

  // ===== Grid de detalles editable (responsive) =====
  const detalleColumns = [
    {
      title: '',
      key: 'sort',
      width: 40,
      render: () => <DragHandle />,
    },
    {
      title: 'Artículo',
      key: 'articulo',
      ellipsis: true,
      shouldCellUpdate: (record: DetalleEntradaAlmacenDTO, prevRecord: DetalleEntradaAlmacenDTO) =>
        record.articulo !== prevRecord.articulo || record.codigo !== prevRecord.codigo || record.referencia !== prevRecord.referencia || record.medida?.nombre !== prevRecord.medida?.nombre || record.fechaVencimiento !== prevRecord.fechaVencimiento,
      render: (_: any, record: DetalleEntradaAlmacenDTO) => (
        <div style={{ fontSize: 13 }}>
          <div>{toTitleCase(record.articulo || '')}</div>
          <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {record.codigo && <span>{record.codigo}</span>}
              {record.codigo && record.referencia && <span>{' | '}</span>}
              {record.referencia && <span>{record.referencia}</span>}
            </span>
            {record.fechaVencimiento && <span className="paces-text-secondary">V: {formatDate(record.fechaVencimiento)}</span>}
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
      shouldCellUpdate: (record: DetalleEntradaAlmacenDTO, prevRecord: DetalleEntradaAlmacenDTO) =>
        record.cantidad !== prevRecord.cantidad || record.medida?.nombre !== prevRecord.medida?.nombre,
      render: (_: any, _record: DetalleEntradaAlmacenDTO, idx: number) => (
        <div>
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            min={0}
            step={0.01}
            precision={2}
            value={detalles[idx]?.cantidad}
            onChange={(val) => handleDetalleUpdateValue(detalles[idx].id, 'cantidad', val || 0)}
            onBlur={() => handleDetalleCalculate(detalles[idx].id, 'cantidad', detalles[idx]?.cantidad || 0)}
            onPressEnter={() => handleDetalleCalculate(detalles[idx].id, 'cantidad', detalles[idx]?.cantidad || 0)}
          />
          {detalles[idx]?.medida?.nombre && (
            <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 2 }}>
              {toTitleCase(detalles[idx].medida.nombre)}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      width: 110,
      align: 'right' as const,
      responsive: ['sm' as const, 'md' as const, 'lg' as const],
      shouldCellUpdate: (record: DetalleEntradaAlmacenDTO, prevRecord: DetalleEntradaAlmacenDTO) => record.costo !== prevRecord.costo,
      render: (_: any, _record: DetalleEntradaAlmacenDTO, idx: number) => (
        <div>
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            min={0}
            step={0.01}
            precision={2}
            value={detalles[idx]?.costo}
            onChange={(val) => handleDetalleUpdateValue(detalles[idx].id, 'costo', val || 0)}
            onBlur={() => handleDetalleCalculate(detalles[idx].id, 'costo', detalles[idx]?.costo || 0)}
            onPressEnter={() => handleDetalleCalculate(detalles[idx].id, 'costo', detalles[idx]?.costo || 0)}
          />
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
    {
      title: 'Descuento',
      key: 'descuento',
      width: 120,
      align: 'right' as const,
      shouldCellUpdate: (record: DetalleEntradaAlmacenDTO, prevRecord: DetalleEntradaAlmacenDTO) =>
        record.porcentajeDescuento !== prevRecord.porcentajeDescuento || record.descuento !== prevRecord.descuento,
      render: (_: any, _record: DetalleEntradaAlmacenDTO, idx: number) => (
        <div>
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            min={0}
            max={100}
            step={0.01}
            precision={2}
            value={detalles[idx]?.porcentajeDescuento}
            onChange={(val) => handleDetalleUpdateValue(detalles[idx].id, 'porcentajeDescuento', val || 0)}
            onBlur={() => handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', detalles[idx]?.porcentajeDescuento || 0)}
            onPressEnter={() => handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', detalles[idx]?.porcentajeDescuento || 0)}
            addonAfter="%"
          />
          <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 2 }}>
            {formatNumber(detalles[idx]?.descuento || 0)}
          </div>
        </div>
      ),
    },
    {
      title: 'SubTotal',
      dataIndex: 'subTotal',
      key: 'subTotal',
      width: 120,
      align: 'right' as const,
      responsive: ['md' as const, 'lg' as const],
      render: (_: any, record: DetalleEntradaAlmacenDTO) => (
        <div>
          <Text>{formatNumber(record.subTotal || 0)}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
    {
      title: 'Impuestos',
      key: 'impuestos',
      width: 140,
      align: 'right' as const,
      render: (_: any, record: DetalleEntradaAlmacenDTO) => (
        <div>
          <div>{formatNumber(record.impuestos || 0)}</div>
          {record.impuesto?.nombre && (
            <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5 }}>{toTitleCase(record.impuesto.nombre)}</div>
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
      render: (_: any, record: DetalleEntradaAlmacenDTO) => (
        <div>
          <Text strong>{formatNumber(record.total || 0)}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 50,
      render: (_: any, record: DetalleEntradaAlmacenDTO, idx: number) => {
        const items = [
          {
            key: 'eliminar',
            label: 'Eliminar',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleEliminarFila(detalles[idx].id),
          },
        ];

        if (record.tieneVencimiento) {
          items.unshift({
            key: 'vencimiento',
            label: record.fechaVencimiento ? `Venc: ${formatDate(record.fechaVencimiento)}` : 'Fecha Vencimiento',
            icon: <CalendarOutlined />,
            onClick: () => setFechaVencimientoModal({ open: true, detalleId: detalles[idx].id }),
          });
        }

        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  // ===== Encabezado del formulario =====
  const renderEncabezado = () => {
    // ncfValue, refValue y tasaValue vienen del watcher reactivo (component-level Form.useWatch)
    return (
    <Card className="paces-card" size="small" title="Datos Generales" style={{ marginBottom: 16 }}>
      <Form form={form} layout="vertical" size="small" style={{ paddingTop: 24 }}>
        <Row gutter={[16, 24]}>
          {/* Fila 1: OrdenCompra + Concepto */}
          <Col xs={24} sm={12} lg={9}>
            <div ref={ordenCompraRef} style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
              <div style={{ flex: 1 }}>
                <FloatingField label="Orden Compra" externalValue={ordenCompraNoDoc}>
                  <Input placeholder=" " value={ordenCompraNoDoc} readOnly />
                </FloatingField>
              </div>
              <Button icon={<SearchOutlined />} onClick={handleBuscarOC} />
            </div>
            <Form.Item name="ordenCompra" hidden><Input /></Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={15}>
            <div ref={conceptoRef} style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
              <div style={{ flex: 1 }}>
                <FloatingField label="Concepto" required externalValue={conceptoSearchText}>
                  <Input placeholder=" " value={conceptoSearchText} readOnly />
                </FloatingField>
              </div>
              <Button icon={<SearchOutlined />} onClick={handleConceptoSearchClick} />
            </div>
            <Form.Item name="concepto" hidden><Input /></Form.Item>
            <Form.Item name="conceptoNombre" hidden><Input /></Form.Item>
          </Col>

          {conceptoInfo && (
            <Col xs={24}>
              <Text type="warning" style={{ fontSize: 12 }}>{conceptoInfo}</Text>
            </Col>
          )}

          {/* Fila 2: FechaDocumento + Suplidor */}
          <Col xs={24} sm={12} lg={9}>
            <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }}>
              <FloatingField label="Fecha Documento" required>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </FloatingField>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={15}>
            <Form.Item name="suplidor" required style={{ marginBottom: 0 }}>
              <FloatingField label="Suplidor / Entidad" required ref={suplidorRef}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  onChange={(val) => {
                    const ent = entidadesCache.find((e) => e.codigo === val);

                    // Si el suplidor requiere OC y hay detalles, preguntar si borrar
                    if (ent?.requiereORC && detalles.length > 0) {
                      Modal.confirm({
                        title: 'Cambiar Suplidor',
                        icon: <ExclamationCircleOutlined />,
                        content: `El suplidor ${ent.nombre} requiere Orden de Compra, se borrarán los productos agregados. ¿Está seguro que desea hacerlo?`,
                        okText: 'Sí',
                        cancelText: 'No',
                        onOk: () => {
                          setDetalles([]);
                          setSelectedEntidad(ent);
                          setSelectedOC(null);
                          setOrdenCompraNoDoc('');
                          form.setFieldsValue({ ordenCompra: '' });
                          setAgregarFilaBloqueado(true);
                        },
                        onCancel: () => {
                          // Revertir la selección del suplidor
                          form.setFieldsValue({ suplidor: selectedEntidad?.codigo || undefined });
                        },
                      });
                    } else {
                      setSelectedEntidad(ent || null);
                      // Limpiar OC al cambiar de suplidor
                      setSelectedOC(null);
                      setOrdenCompraNoDoc('');
                      form.setFieldsValue({ ordenCompra: '' });
                      // Si requiere ORC, bloquear agregar fila; si no, desbloquear
                      setAgregarFilaBloqueado(ent?.requiereORC === true);
                    }
                  }}
                >
                  {entidadesCache.map((ent) => (
                    <Select.Option key={ent.codigo} value={ent.codigo}>
                      {toTitleCase(ent.nombre)}{ent.identificacion ? ` (${ent.identificacion})` : ''}
                    </Select.Option>
                  ))}
                </Select>
              </FloatingField>
            </Form.Item>
          </Col>

          {/* Fila 3: FechaRecibo + Almacén */}
          <Col xs={24} sm={12} lg={9}>
            <Form.Item name="fechaRecibo" style={{ marginBottom: 0 }}>
              <FloatingField label="Fecha Recibo">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </FloatingField>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={15}>
            <Form.Item name="almacen" required style={{ marginBottom: 0 }}>
              <FloatingField label="Almacén" required ref={almacenRef}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  onChange={(val) => {
                    const alm = almacenesCache.find((a) => a.codigo === val);
                    setSelectedAlmacen(alm || null);
                  }}
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
                <div ref={ncfRef}>
                  {editingField === 'ncf' ? (
                    <Input
                      size="small"
                      style={{ width: 200 }}
                      placeholder="NCF"
                      maxLength={19}
                      autoFocus
                      defaultValue={editingValueRef.current as string}
                      onChange={(e) => {
                        editingValueRef.current = e.target.value;
                      }}
                      onPressEnter={() => commitFieldEditor()}
                      onBlur={() => commitFieldEditor()}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.stopPropagation();
                          cancelFieldEditor();
                        }
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
                    onChange={(e) => {
                      editingValueRef.current = e.target.value;
                    }}
                    onPressEnter={() => commitFieldEditor()}
                    onBlur={() => commitFieldEditor()}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        cancelFieldEditor();
                      }
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
                    onChange={(val) => {
                      editingValueRef.current = val ?? 1;
                    }}
                    onPressEnter={() => commitFieldEditor()}
                    onBlur={() => commitFieldEditor()}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        cancelFieldEditor();
                      }
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
  };

  return (
    <div>
      {renderToolbar()}

      <BuscarConceptoModal
        open={conceptoModalOpen}
        onClose={() => setConceptoModalOpen(false)}
        onSelect={handleConceptoSelect}
      />

      <BuscarOrdenCompraModal
        open={ordenCompraModalOpen}
        onClose={() => setOrdenCompraModalOpen(false)}
        onSelect={handleOCSelect}
        suplidorCodigo={selectedEntidad?.codigo}
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
                        <Button
                          type="dashed"
                          icon={<PlusOutlined />}
                          onClick={handleAgregarFila}
                          disabled={agregarFilaBloqueado}
                        >
                          Agregar fila
                        </Button>
                        <Input.Search
                          placeholder="Buscar detalle..."
                          allowClear
                          style={{ maxWidth: 250 }}
                          onSearch={(value) => setDetalleSearch(value)}
                          onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                        />
                      </div>
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(event) => { setActiveId(event.active.id); }} onDragEnd={handleDragEnd}>
                        <SortableContext items={detallesFiltrados.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                        <Table
                          dataSource={detallesFiltrados}
                          columns={detalleColumns}
                          rowKey="id"
                          size="small"
                          pagination={false}
                          scroll={{ x: 1300 }}
                          components={{ body: { row: SortableRow } }}
                        />
                        </SortableContext>
                        <DragOverlay>
                          {activeId ? (
                            <div style={{ padding: '8px 16px', background: '#fff', border: '2px solid #556ee6', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, width: 300 }}>
                              <HolderOutlined style={{ color: '#556ee6' }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {detalles.find((d) => d.id === activeId)?.articulo || 'Arrastrando...'}
                              </span>
                            </div>
                          ) : null}
                        </DragOverlay>
                      </DndContext>
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
            <SuplidorCard
              suplidor={selectedEntidad ?? data?.suplidor ?? null}
            />
            <TotalesCard
              subTotal={totales.subTotal}
              descuento={totales.descuento}
              impuestos={totales.impuestos}
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
                      <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={handleAgregarFila}
                        disabled={agregarFilaBloqueado}
                      >
                        Agregar fila
                      </Button>
                      <Input.Search
                        placeholder="Buscar detalle..."
                        allowClear
                        style={{ maxWidth: 250 }}
                        onSearch={(value) => setDetalleSearch(value)}
                        onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                      />
                    </div>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(event) => { setActiveId(event.active.id); }} onDragEnd={handleDragEnd}>
                      <SortableContext items={detallesFiltrados.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                    <Table
                      dataSource={detallesFiltrados}
                      columns={detalleColumns}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      scroll={{ x: 1300 }}
                      components={{ body: { row: SortableRow } }}
                    />
                    </SortableContext>
                    <DragOverlay>
                      {activeId ? (
                        <div style={{ padding: '8px 16px', background: '#fff', border: '2px solid #556ee6', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, width: 300 }}>
                          <HolderOutlined style={{ color: '#556ee6' }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {detalles.find((d) => d.id === activeId)?.articulo || 'Arrastrando...'}
                          </span>
                        </div>
                      ) : null}
                    </DragOverlay>
                    </DndContext>
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

          <SuplidorCard
            suplidor={selectedEntidad ?? data?.suplidor ?? null}
          />

          <TotalesCard
            subTotal={totales.subTotal}
            descuento={totales.descuento}
            impuestos={totales.impuestos}
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
        <EntradaAlmacenGuide
          mode={mode}
          concepto={selectedConcepto}
          suplidor={selectedEntidad}
          ordenCompra={selectedOC}
          almacen={selectedAlmacen}
          detallesCount={detalles.length}
          conceptoRef={conceptoRef}
          suplidorRef={suplidorRef}
          ordenCompraRef={ordenCompraRef}
          almacenRef={almacenRef}
          agregarFilaRef={agregarFilaRef}
        />
      )}

      {/* Modal de Fecha de Vencimiento */}
      <Modal
        title="Fecha de Vencimiento"
        open={fechaVencimientoModal.open}
        onCancel={() => setFechaVencimientoModal({ open: false, detalleId: 0 })}
        onOk={() => setFechaVencimientoModal({ open: false, detalleId: 0 })}
        footer={null}
        destroyOnHidden
      >
        <DatePicker
          style={{ width: '100%' }}
          format="YYYY-MM-DD"
          onChange={handleFechaVencimiento}
        />
      </Modal>
    </div>
  );
};

export default EntradaAlmacenFormulario;
