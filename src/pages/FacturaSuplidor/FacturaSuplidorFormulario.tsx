import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Dropdown, Alert,
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
import { facturaSuplidorApi } from '../../api/facturaSuplidorApi';
import { productoApi } from '../../api/productoApi';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import type {
  ConceptoDTO, SuplidorDTO,
  AsientoContableDTO,
} from '../../types/entradaAlmacen';
import type {
  DetalleFacturaSuplidorDTO, FacturaSuplidorFullDTO, TipoDTO,
} from '../../types/facturaSuplidor';

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

// ===== CÃ¡lculo de fila FRDE =====
function calcularFila(fila: DetalleFacturaSuplidorDTO): DetalleFacturaSuplidorDTO {
  const cantidad = fila.cantidad || 0;
  const costo = fila.costo || 0;
  const pctDesc = fila.porcentajeDescuento || 0;
  const pctImp = fila.impuesto?.porcentaje || 0;

  const subTotal = Math.round(cantidad * costo * 100) / 100;
  const descuento = Math.round(subTotal * (pctDesc / 100) * 100) / 100;
  const baseImponible = subTotal - descuento;
  const impuestos = Math.round(baseImponible * (pctImp / 100) * 100) / 100;
  const total = Math.round((baseImponible + impuestos) * 100) / 100;

  return {
    ...fila,
    cantidad,
    costo,
    subTotal,
    descuento,
    impuestos,
    total,
  };
}

function filaVacia(): DetalleFacturaSuplidorDTO {
  return {
    id: 0,
    codigo: '',
    articulo: '',
    referencia: '',
    cantidad: 0,
    costo: 0,
    subTotal: 0,
    porcentajeDescuento: 0,
    descuento: 0,
    impuestos: 0,
    total: 0,
    tipoArticulo: 'Producto',
    nota: '',
  };
}

// ===== Componente BuscarEntradaModal (para seleccionar ENP referencia) =====
interface BuscarEntradaModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (entrada: any) => void;
}

const BuscarEntradaModal: React.FC<BuscarEntradaModalProps> = ({ open, onClose, onSelect }) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [resultados, setResultados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const buscar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await facturaSuplidorApi.obtenerEntradasAlmacen(sucursalActiva, { cantidad: 50 });
      setResultados(res || []);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al buscar entradas de almacÃ©n');
      message.error(msg);
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    if (open) buscar();
  }, [open, buscar]);

  const columnas = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 150,
      render: (v: string) => <span className="paces-text-primary">{v}</span>,
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (v: string) => formatDate(v),
    },
    {
      title: 'Suplidor',
      dataIndex: 'entidad',
      key: 'entidad',
      ellipsis: true,
      render: (v: string) => toTitleCase(v || ''),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 130,
      align: 'right' as const,
      render: (v: number) => formatCurrency(v || 0),
    },
  ];

  return (
    <Modal
      title="Buscar Entrada de AlmacÃ©n"
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <Input.Search
        placeholder="Buscar..."
        allowClear
        onSearch={() => buscar()}
        style={{ marginBottom: 16 }}
      />
      <Table
        dataSource={resultados}
        columns={columnas}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ y: 400 }}
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
        <span className="paces-text-secondary">TelÃ©fono: </span>
        <span>{suplidor?.telefono || '-'}</span>
      </div>
      <div>
        <span className="paces-text-secondary">DirecciÃ³n: </span>
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
          <span>{toTitleCase(monedaNombre || 'Peso Dominicano')} ({monedaSimbolo || 'RD$'} {formatNumber(tasa ?? 1)})</span>
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
      <span style={{ color: 'var(--paces-primary)' }}>{monedaSimbolo || 'RD$'} {formatNumber(total)}</span>
    </div>
  </Card>
);

// ===== Contexto para pasar listeners de drag al handle =====
const DragListenersContext = React.createContext<any>(null);

// ===== Componente SortableRow para drag-and-drop =====
const SortableRow: React.FC<any> = ({ children, ...rest }) => {
  const recordId = rest['data-row-key'];

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
const FacturaSuplidorFormulario: React.FC = () => {
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
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<FacturaSuplidorFullDTO | null>(null);
  const [detalles, setDetalles] = useState<DetalleFacturaSuplidorDTO[]>([]);
  const [suplidoresCache, setSuplidoresCache] = useState<SuplidorDTO[]>([]);
  const [tiposCache, setTiposCache] = useState<TipoDTO[]>([]);
  const [conceptosCache, setConceptosCache] = useState<ConceptoDTO[]>([]);
  const [selectedTipo, setSelectedTipo] = useState<TipoDTO | null>(null);
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [selectedEntidad, setSelectedEntidad] = useState<SuplidorDTO | null>(null);
  const [selectedEntrada, setSelectedEntrada] = useState<any>(null);
  const [conceptoInfo, setConceptoInfo] = useState<string>('');
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [entradaModalOpen, setEntradaModalOpen] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [fechaVencimientoModal, setFechaVencimientoModal] = useState<{ open: boolean; detalleId: number }>({ open: false, detalleId: 0 });

  // Refs para la guÃ­a
  const tipoRef = useRef<HTMLDivElement>(null);
  const conceptoRef = useRef<HTMLDivElement>(null);
  const suplidorRef = useRef<HTMLDivElement>(null);
  const agregarFilaRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  // ===== Detalles filtrados por bÃºsqueda =====
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

  // ===== Estado para campos rÃ¡pidos (NCF, Referencia, Tasa) =====
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
    setActiveModule('FRDE');
    const pageTitle = mode === 'crear' ? 'Nueva Factura de Suplidor' : 'Editar Factura de Suplidor';
    setPageTitleOverride(pageTitle);

    // Cargar catÃ¡logos iniciales
    facturaSuplidorApi.obtenerTipos(sucursalActiva).then(setTiposCache).catch(() => {});

    // Inicializar fecha en modo crear
    if (mode === 'crear') {
      form.setFieldsValue({
        fechaDocumento: dayjs(),
        fechaVencimiento: dayjs(),
        fechaEntrega: dayjs(),
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
    facturaSuplidorApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((_res) => {
        const res = _res as any;
        setData(res);
        setDetalles(res.detalles || []);
        setSelectedTipo(res.tipo || null);
        setSelectedConcepto(res.concepto || null);
        setSelectedEntidad(res.suplidor || res.entidad || null);
        setSelectedEntrada(res.entradaAlmacen || null);

        const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;

        form.setFieldsValue({
          tipo: res.tipo?.codigo || '',
          concepto: res.concepto?.codigo || '',
          suplidor: res.suplidor?.codigo || res.entidad?.codigo || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          fechaVencimiento: res.fechaVencimiento ? dayjs(parseDateRaw(res.fechaVencimiento)) : null,
          fechaEntrega: res.fechaEntrega ? dayjs(parseDateRaw(res.fechaEntrega)) : null,
          ncf: res.ncf || '',
          referencia: res.referencia || '',
          diasCredito: res.diasCredito || 0,
          moneda: res.moneda?.nombre || '',
          tasa: res.tasa || 1,
          nota: res.nota || '',
        });

        // Cargar conceptos filtrados por tipo si existe
        if (res.tipo?.idExterno) {
          facturaSuplidorApi.obtenerConceptos(sucursalActiva, res.tipo.idExterno)
            .then(setConceptosCache)
            .catch(() => {});
        }

        // Cargar suplidores
        facturaSuplidorApi.obtenerSuplidores(sucursalActiva)
          .then(setSuplidoresCache)
          .catch(() => {});
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        message.error(msg);
        setLoadingError(true);
        navigate('/FRDE');
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate]);

  // ===== Handlers =====
  const handleCancelar = () => {
    Modal.confirm({
      title: 'Cancelar',
      icon: <ExclamationCircleOutlined />,
      content: 'Â¿EstÃ¡ seguro que desea cancelar los cambios realizados?',
      okText: 'SÃ­, cancelar',
      cancelText: 'No, continuar editando',
      okButtonProps: { danger: true },
      onOk: () => {
        setEditingField(null);
        if (mode === 'crear') {
          navigate('/FRDE');
        } else {
          if (id) {
            setLoading(true);
            facturaSuplidorApi.obtenerPorId(sucursalActiva, parseInt(id))
              .then((_res) => {
                const res = _res as any;
                setData(res);
                setDetalles(res.detalles || []);
                setSelectedTipo(res.tipo || null);
                setSelectedConcepto(res.concepto || null);
                setSelectedEntidad(res.suplidor || res.entidad || null);
                setSelectedEntrada(res.entradaAlmacen || null);

                const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;

                form.setFieldsValue({
                  tipo: res.tipo?.codigo || '',
                  concepto: res.concepto?.codigo || '',
                  suplidor: res.suplidor?.codigo || res.entidad?.codigo || '',
                  fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                  fechaVencimiento: res.fechaVencimiento ? dayjs(parseDateRaw(res.fechaVencimiento)) : null,
                  fechaEntrega: res.fechaEntrega ? dayjs(parseDateRaw(res.fechaEntrega)) : null,
                  ncf: res.ncf || '',
                  referencia: res.referencia || '',
                  diasCredito: res.diasCredito || 0,
                  moneda: res.moneda?.nombre || '',
                  tasa: res.tasa || 1,
                  nota: res.nota || '',
                });

                if (res.tipo?.idExterno) {
                  facturaSuplidorApi.obtenerConceptos(sucursalActiva, res.tipo.idExterno)
                    .then(setConceptosCache)
                    .catch(() => {});
                }
                facturaSuplidorApi.obtenerSuplidores(sucursalActiva)
                  .then(setSuplidoresCache)
                  .catch(() => {});
              })
              .catch((err: any) => {
                const msg = err?.response?.data?.errorMessage || 'Error al recargar el documento';
                message.error(msg);
              })
              .finally(() => setLoading(false));
          }
          navigate(`/FRDE/${id}`);
        }
      },
    });
  };

  // ===== ValidaciÃ³n del formulario =====
  const validarFormulario = (): string | null => {
    const values = form.getFieldsValue();
    if (!selectedTipo) return 'Debe seleccionar un Tipo de Documento.';
    if (!selectedConcepto) return 'Debe elegir un Concepto para poder continuar.';
    if (suplidoresCache.length > 0 && !values.suplidor && !selectedEntidad) return 'El suplidor es requerido.';
    if (detalles.length === 0) return 'No se puede crear un documento de FACTURA SUPLIDOR sin detalle.';
    if (!detalles.some((d) => (d.cantidad || 0) > 0)) return 'Debe tener al menos un detalle con cantidad > 0';

    // Validar fecha doc â‰¤ hoy
    const fechaDoc = values.fechaDocumento;
    if (fechaDoc && dayjs.isDayjs(fechaDoc)) {
      if (fechaDoc.isAfter(dayjs(), 'day')) {
        return 'La fecha del documento no puede ser mayor a hoy.';
      }
    }

    // Validar fecha entrega â‰¤ fecha doc
    const fechaEntrega = values.fechaEntrega;
    if (fechaDoc && dayjs.isDayjs(fechaDoc) && fechaEntrega && dayjs.isDayjs(fechaEntrega)) {
      if (fechaEntrega.isAfter(fechaDoc, 'day')) {
        return 'La fecha de entrega no puede ser mayor a la fecha del documento.';
      }
    }

    // Validar asientos cuadrados si existen
    if (data?.asientos && data.asientos.length > 0) {
      const totalDebitos = data.asientos.reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
      const totalCreditos = data.asientos.reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);
      if (Math.abs(totalDebitos - totalCreditos) > 0.01) {
        return 'Los asientos contables no estÃ¡n cuadrados. Los dÃ©bitos deben ser igual a los crÃ©ditos.';
      }
    }

    return null;
  };

  // ===== Construir DTO desde el formulario =====
  const construirDTO = (): FacturaSuplidorFullDTO => {
    const values = form.getFieldsValue();
    const base = data || {} as any;

    const entidadSel = suplidoresCache.find((e) => e.codigo === values.suplidor) || selectedEntidad;

    const fechaDoc = values.fechaDocumento
      ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
        ? toISOFormat(values.fechaDocumento.toDate())
        : values.fechaDocumento)
      : toISOFormat(new Date());

    const fechaVenc = values.fechaVencimiento
      ? (typeof values.fechaVencimiento === 'object' && values.fechaVencimiento.toDate
          ? toISOFormat(values.fechaVencimiento.toDate())
          : values.fechaVencimiento)
      : undefined;

    const fechaEnt = values.fechaEntrega
      ? (typeof values.fechaEntrega === 'object' && values.fechaEntrega.toDate
          ? toISOFormat(values.fechaEntrega.toDate())
          : values.fechaEntrega)
      : undefined;

    const totalSub = detalles.reduce((s, d) => s + (d.subTotal || 0), 0);
    const totalDesc = detalles.reduce((s, d) => s + (d.descuento || 0), 0);
    const totalImp = detalles.reduce((s, d) => s + (d.impuestos || 0), 0);
    const total = detalles.reduce((s, d) => s + (d.total || 0), 0);

    return {
      id: base.id || 0,
      fechaDocumento: fechaDoc,
      fechaVencimiento: fechaVenc || '',
      fechaEntrega: fechaEnt || '',
      noDocumento: base.noDocumento || '',
      estado: base.estado || 0,
      periodo: base.periodo || new Date().getMonth() + 1,
      ncf: values.ncf || '',
      referencia: values.referencia || '',
      nota: values.nota || '',
      subTotal: Math.round(totalSub * 100) / 100,
      descuento: Math.round(totalDesc * 100) / 100,
      impuestos: Math.round(totalImp * 100) / 100,
      retenciones: base.retenciones || 0,
      total: Math.round(total * 100) / 100,
      tasa: values.tasa || 1,
      diasCredito: values.diasCredito || 0,
      documento: base.documento || { codigo: 'RDE' },
      concepto: selectedConcepto || { nombre: '', codigo: '' },
      moneda: base.moneda || { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' },
      suplidor: entidadSel || { nombre: '', codigo: '', identificacion: '' },
      entidad: entidadSel
        ? { nombre: entidadSel.nombre, codigo: entidadSel.codigo, identificacion: entidadSel.identificacion || '', telefono: entidadSel.telefono, direccion: entidadSel.direccion }
        : { nombre: '', codigo: '', identificacion: '' },
      tipo: selectedTipo || null,
      entradaAlmacen: selectedEntrada || null,
      detalles: detalles.map((d) => calcularFila(d)),
      asientos: base.asientos || [],
      logs: base.logs || [],
    };
  };

  // ===== NCF Validation =====
  const validarNCF = useCallback(async (): Promise<string | null> => {
    const ncf = form.getFieldValue('ncf');
    const suplidorCodigo = form.getFieldValue('suplidor');
    if (ncf && suplidorCodigo && selectedEntidad) {
      try {
        const existe = await facturaSuplidorApi.verificarNCF(sucursalActiva, ncf, suplidorCodigo);
        if (existe) {
          return `El NCF "${ncf}" ya existe para este suplidor.`;
        }
      } catch {
        // Si falla la verificaciÃ³n, continuar
      }
    }
    return null;
  }, [sucursalActiva, form, selectedEntidad]);

  const handleGuardar = async () => {
    const error = validarFormulario();
    if (error) {
      message.error(error);
      return;
    }

    // Validar NCF duplicado antes de guardar
    const ncfError = await validarNCF();
    if (ncfError) {
      message.error(ncfError);
      return;
    }

    setSaving(true);
    try {
      const dto = construirDTO();
      if (mode === 'crear') {
        const result = await facturaSuplidorApi.crear(sucursalActiva, dto);
        message.success('Factura de suplidor creada exitosamente');
        navigate(`/FRDE/${result.id}`);
      } else {
        await facturaSuplidorApi.actualizar(sucursalActiva, dto);
        message.success('Factura de suplidor actualizada exitosamente');
        navigate(`/FRDE/${id}`);
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== Handlers de Tipo =====
  const handleTipoSelect = (tipoCodigo: string) => {
    const tipo = tiposCache.find((t) => t.codigo === tipoCodigo) || null;
    setSelectedTipo(tipo);
    setSelectedConcepto(null);
    setConceptosCache([]);
    setConceptoInfo('');
    form.setFieldsValue({ concepto: '' });

    if (tipo) {
      facturaSuplidorApi.obtenerConceptos(sucursalActiva, tipo.idExterno)
        .then((conceptos) => setConceptosCache(conceptos))
        .catch(() => {});
    }
  };

  const handleTipoClear = () => {
    setSelectedTipo(null);
    setSelectedConcepto(null);
    setConceptosCache([]);
    setConceptoInfo('');
    form.setFieldsValue({ tipo: '', concepto: '' });
  };

  // ===== Handlers de Concepto =====
  const handleConceptoSelect = (concepto: ConceptoDTO) => {
    setSelectedConcepto(concepto);
    setEditingField(null);
    form.setFieldsValue({ concepto: concepto.codigo });

    // Cargar suplidores
    facturaSuplidorApi.obtenerSuplidores(sucursalActiva)
      .then((ents) => setSuplidoresCache(ents))
      .catch(() => {});

    // Mostrar avisos si el concepto tiene flags especiales
    const infoParts: string[] = [];
    if (concepto.noImpuesto) infoParts.push(' * No Impuestos * ');
    if (concepto.noAsientos) infoParts.push(' * No Asientos * ');
    if (concepto.activo === false) infoParts.push(' * Concepto Inactivo * ');
    if (concepto.noActualizaCostos) infoParts.push(' * No Actualiza Costos * ');
    setConceptoInfo(infoParts.join(''));

    // Si el concepto es NoImpuesto y hay detalles con impuestos, limpiarlos
    if (concepto.noImpuesto && detalles.some((d) => (d.impuesto?.porcentaje || 0) > 0)) {
      message.warning('El Concepto no acepta Impuestos, por lo que serÃ¡n eliminados.');
      setDetalles((prev) =>
        prev.map((d) => calcularFila({ ...d, impuesto: undefined }))
      );
    }

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
    setSuplidoresCache([]);
    form.setFieldsValue({ concepto: '', suplidor: undefined });
  };

  // ===== Handlers de Entrada Referencia =====
  const handleEntradaSelect = async (entrada: any) => {
    if (detalles.length > 0) {
      const shouldReplace = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: 'Â¿Desea Borrar todos los registros?',
          icon: <ExclamationCircleOutlined />,
          content: 'Ya existen detalles en el documento. Â¿Desea borrarlos y cargar los de la entrada seleccionada?',
          okText: 'SÃ­, borrar y cargar',
          cancelText: 'No, mantener',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });

      if (shouldReplace) {
        try {
          const detalleEntrada = await facturaSuplidorApi.obtenerDetalleEntrada(sucursalActiva, entrada.id);
          const nuevosDetalles = (detalleEntrada.detalles || []).map((d: any, idx: number) => ({
            ...filaVacia(),
            id: -(idx + 1),
            codigo: d.codigo || '',
            articulo: d.articulo || '',
            referencia: d.referencia || '',
            cantidad: d.cantidad || 0,
            costo: d.costo || 0,
            familia: d.familia,
            medida: d.medida,
            impuesto: d.impuesto,
            tieneVencimiento: d.tieneVencimiento,
          }));
          setDetalles(nuevosDetalles.map((d: DetalleFacturaSuplidorDTO) => calcularFila(d)));
        } catch (err: any) {
          const msg = extraerMensajeError(err, 'Error al cargar detalles de la entrada');
          message.error(msg);
        }
      }
    } else {
      Modal.confirm({
        title: 'Â¿Desea Cargar todos los registros?',
        icon: <ExclamationCircleOutlined />,
        content: 'Â¿Desea cargar los productos de la entrada seleccionada?',
        okText: 'SÃ­, cargar',
        cancelText: 'No',
        onOk: async () => {
          try {
            const detalleEntrada = await facturaSuplidorApi.obtenerDetalleEntrada(sucursalActiva, entrada.id);
            const nuevosDetalles = (detalleEntrada.detalles || []).map((d: any, idx: number) => ({
              ...filaVacia(),
              id: -(idx + 1),
              codigo: d.codigo || '',
              articulo: d.articulo || '',
              referencia: d.referencia || '',
              cantidad: d.cantidad || 0,
              costo: d.costo || 0,
              familia: d.familia,
              medida: d.medida,
              impuesto: d.impuesto,
              tieneVencimiento: d.tieneVencimiento,
            }));
            setDetalles(nuevosDetalles.map((d: DetalleFacturaSuplidorDTO) => calcularFila(d)));
          } catch (err: any) {
            const msg = extraerMensajeError(err, 'Error al cargar detalles de la entrada');
            message.error(msg);
          }
        },
      });
    }

    setSelectedEntrada(entrada);
    if (entrada?.suplidor?.codigo) {
      setSelectedEntidad(entrada.suplidor);
      form.setFieldsValue({ suplidor: entrada.suplidor.codigo });
    }
  };

  const handleEntradaClear = () => {
    setSelectedEntrada(null);
  };

  // ===== Handlers de detalles =====
  const handleAgregarFila = () => {
    setDetalles((prev) => [{ ...filaVacia(), id: -(prev.length + 1) }, ...prev]);
  };

  const handleEliminarFila = (idFila: number) => {
    Modal.confirm({
      title: 'Eliminar detalle',
      icon: <ExclamationCircleOutlined />,
      content: 'Â¿EstÃ¡ seguro de eliminar este detalle?',
      okText: 'SÃ­',
      cancelText: 'No',
      okButtonProps: { danger: true },
      onOk: () => {
        setDetalles((prev) => prev.filter((d) => d.id !== idFila));
      },
    });
  };

  const handleDetalleUpdateValue = (idFila: number, field: string, value: any) => {
    setDetalles((prev) =>
      prev.map((d) => (d.id !== idFila ? d : { ...d, [field]: value }))
    );
  };

  const handleDetalleCalculate = (idFila: number, field: string, value: any) => {
    setDetalles((prev) =>
      prev.map((d) => {
        if (d.id !== idFila) return d;
        const updated = { ...d, [field]: value };
        return calcularFila(updated);
      })
    );
  };

  const handleProductoSelect = (producto: any) => {
    const filaVaciaIdx = detalles.findIndex((d) => !d.codigo);
    if (filaVaciaIdx === -1) {
      const nuevaFila = filaVacia();
      const nuevoId = -(detalles.length + 1);
      setDetalles((prev) => {
        const filled: DetalleFacturaSuplidorDTO = {
          ...nuevaFila,
          id: nuevoId,
          codigo: producto.codigo,
          articulo: producto.articulo,
          referencia: producto.referencia || '',
          costo: producto.costo || 0,
          familia: producto.familia,
          medida: producto.medida,
          impuesto: producto.impuesto,
          tieneVencimiento: producto.tieneVencimiento,
        };
        return [calcularFila(filled), ...prev];
      });
    } else {
      setDetalles((prev) =>
        prev.map((d) => {
          if (d.id !== detalles[filaVaciaIdx].id) return d;
          const filled: DetalleFacturaSuplidorDTO = {
            ...d,
            codigo: producto.codigo,
            articulo: producto.articulo,
            referencia: producto.referencia || '',
            costo: producto.costo || 0,
            familia: producto.familia,
            medida: producto.medida,
            impuesto: producto.impuesto,
            tieneVencimiento: producto.tieneVencimiento,
          };
          return calcularFila(filled);
        })
      );
    }
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

        {/* Botones segÃºn estado - CreaciÃ³n */}
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

        {/* Botones segÃºn estado - EdiciÃ³n */}
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
          </>
        )}
      </Space>
    </div>
  );

  // ===== Encabezado del formulario =====
  const renderEncabezado = () => (
    <Card className="paces-card" size="small" title="Datos Generales" style={{ marginBottom: 16 }}>
      <Form form={form} layout="vertical" size="small" style={{ paddingTop: 24 }}>
        <Row gutter={[16, 24]}>
          {/* Fila 1: Tipo + Concepto + Suplidor */}
          <Col xs={24} sm={12} lg={8}>
            <div ref={tipoRef} style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
              <div style={{ flex: 1 }}>
                <Form.Item name="tipo" required style={{ marginBottom: 0 }}>
                  <FloatingField label="Tipo de Documento" required>
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      placeholder=" "
                      onChange={handleTipoSelect}
                      onClear={handleTipoClear}
                    >
                      {tiposCache.map((t) => (
                        <Select.Option key={t.codigo} value={t.codigo}>
                          {toTitleCase(t.nombre)}
                        </Select.Option>
                      ))}
                    </Select>
                  </FloatingField>
                </Form.Item>
              </div>
            </div>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <div ref={conceptoRef} style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
              <div style={{ flex: 1 }}>
                <FloatingField label="Concepto" required>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    placeholder=" "
                    value={selectedConcepto?.codigo || undefined}
                    disabled={!selectedTipo}
                    onChange={(val) => {
                      const conc = conceptosCache.find((c) => c.codigo === val);
                      if (conc) handleConceptoSelect(conc);
                      else handleConceptoClear();
                    }}
                    notFoundContent={!selectedTipo ? 'Seleccione un tipo primero' : 'Sin conceptos disponibles'}
                  >
                    {conceptosCache.map((c) => (
                      <Select.Option key={c.codigo} value={c.codigo}>
                        {toTitleCase(c.nombre)}
                      </Select.Option>
                    ))}
                  </Select>
                </FloatingField>
              </div>
              {selectedConcepto && (
                <Button icon={<ClearOutlined />} onClick={handleConceptoClear} />
              )}
            </div>
            <Form.Item name="concepto" hidden><Input /></Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <div ref={suplidorRef}>
              <Form.Item name="suplidor" required style={{ marginBottom: 0 }}>
                <FloatingField label="Suplidor" required>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    placeholder=" "
                    value={selectedEntidad?.codigo || undefined}
                    onChange={(val) => {
                      const ent = suplidoresCache.find((e) => e.codigo === val);
                      setSelectedEntidad(ent || null);
                    }}
                  >
                    {suplidoresCache.map((ent) => (
                      <Select.Option key={ent.codigo} value={ent.codigo}>
                        {toTitleCase(ent.nombre)}{ent.identificacion ? ` (${ent.identificacion})` : ''}
                      </Select.Option>
                    ))}
                  </Select>
                </FloatingField>
              </Form.Item>
            </div>
          </Col>

          {conceptoInfo && (
            <Col xs={24}>
              <Text type="warning" style={{ fontSize: 12 }}>{conceptoInfo}</Text>
            </Col>
          )}

          {/* Fila 2: Fecha Doc + Fecha Vencimiento + Fecha Entrega */}
          <Col xs={24} sm={12} lg={8}>
            <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }}>
              <FloatingField label="Fecha Documento" required>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </FloatingField>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Form.Item name="fechaVencimiento" style={{ marginBottom: 0 }}>
              <FloatingField label="Fecha Vencimiento">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </FloatingField>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Form.Item name="fechaEntrega" style={{ marginBottom: 0 }}>
              <FloatingField label="Fecha Entrega">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </FloatingField>
            </Form.Item>
          </Col>

          {/* Fila 3: Entrada Referencia + DÃ­as CrÃ©dito */}
          <Col xs={24} sm={12} lg={8}>
            <FloatingField label="Entrada AlmacÃ©n de Referencia">
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder=" "
                  value={selectedEntrada?.documento || ''}
                  readOnly
                  onClick={() => setEntradaModalOpen(true)}
                />
                <Button icon={<SearchOutlined />} onClick={() => setEntradaModalOpen(true)} />
                {selectedEntrada && (
                  <Button icon={<ClearOutlined />} onClick={handleEntradaClear} />
                )}
              </Space.Compact>
            </FloatingField>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Form.Item name="diasCredito" style={{ marginBottom: 0 }}>
              <FloatingField label="DÃ­as CrÃ©dito">
                <InputNumber style={{ width: '100%' }} min={0} precision={0} placeholder=" " />
              </FloatingField>
            </Form.Item>
          </Col>

          {/* Fila 4: Botones rÃ¡pidos para campos opcionales */}
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
            {/* Hidden form items para campos rÃ¡pidos */}
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

  // ===== Grid de detalles editable =====
  const detalleColumns = [
    {
      title: '',
      key: 'sort',
      width: 40,
      render: () => <DragHandle />,
    },
    {
      title: 'CÃ³digo',
      key: 'codigoInput',
      width: 100,
      onCell: () => ({ style: { paddingLeft: 8 } }),
      render: (_: any, _record: DetalleFacturaSuplidorDTO, idx: number) => (
        <Input
          size="small"
          style={{ width: '100%' }}
          placeholder="CÃ³digo"
          value={detalles[idx]?.codigo || ''}
          onChange={(e) => handleDetalleUpdateValue(detalles[idx].id, 'codigo', e.target.value)}
          onBlur={() => {
            const codigo = detalles[idx]?.codigo;
            if (codigo && codigo.length >= 2) {
              productoApi.obtenerDetalle(sucursalActiva, codigo)
                .then((prod) => {
                  if (prod) {
                    handleDetalleUpdateValue(detalles[idx].id, 'articulo', prod.nombre || '');
                    handleDetalleUpdateValue(detalles[idx].id, 'referencia', prod.referenciaInterna || '');
                    handleDetalleUpdateValue(detalles[idx].id, 'costo', prod.ultimoCosto || 0);
                    handleDetalleUpdateValue(detalles[idx].id, 'familia', prod.familia);
                    if (prod.unidadMedida) {
                      handleDetalleUpdateValue(detalles[idx].id, 'medida', {
                        nombre: prod.unidadMedida.nombre || '',
                        codigo: '',
                        factor: 1,
                        idExterno: prod.unidadMedida.idExterno || 0,
                      });
                    }
                    if (prod.impuestos && prod.impuestos.length > 0) {
                      const imp = prod.impuestos[0].impuesto;
                      if (imp) {
                        handleDetalleUpdateValue(detalles[idx].id, 'impuesto', imp);
                      }
                    }
                    handleDetalleUpdateValue(detalles[idx].id, 'tieneVencimiento', prod.pesado || false);
                    handleDetalleCalculate(detalles[idx].id, 'costo', prod.ultimoCosto || 0);
                  }
                })
                .catch(() => {
                  productoApi.obtenerListado(sucursalActiva, { codigo })
                    .then((prods) => {
                      if (prods && prods.length > 0) {
                        const p = prods[0];
                        handleDetalleUpdateValue(detalles[idx].id, 'articulo', p.nombre || '');
                        handleDetalleUpdateValue(detalles[idx].id, 'referencia', p.referencia || '');
                        handleDetalleUpdateValue(detalles[idx].id, 'costo', p.ultimoCosto || 0);
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
                        handleDetalleCalculate(detalles[idx].id, 'costo', p.ultimoCosto || 0);
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
      title: 'ArtÃ­culo',
      key: 'articulo',
      ellipsis: true,
      shouldCellUpdate: (record: DetalleFacturaSuplidorDTO, prevRecord: DetalleFacturaSuplidorDTO) =>
        record.articulo !== prevRecord.articulo || record.referencia !== prevRecord.referencia || record.medida?.nombre !== prevRecord.medida?.nombre,
      render: (_: any, record: DetalleFacturaSuplidorDTO) => (
        <div style={{ fontSize: 13 }}>
          <div>{toTitleCase(record.articulo || '')}</div>
          <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5 }}>
            {record.referencia && <span>{record.referencia}</span>}
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
      shouldCellUpdate: (record: DetalleFacturaSuplidorDTO, prevRecord: DetalleFacturaSuplidorDTO) =>
        record.cantidad !== prevRecord.cantidad || record.medida?.nombre !== prevRecord.medida?.nombre,
      render: (_: any, _record: DetalleFacturaSuplidorDTO, idx: number) => (
        <div>
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            styles={{ input: { textAlign: 'right' } }}
            min={0.01}
            step={0.01}
            precision={2}
            controls={false}
            value={detalles[idx]?.cantidad}
            onChange={(val) => handleDetalleUpdateValue(detalles[idx].id, 'cantidad', val || 0)}
            onBlur={() => handleDetalleCalculate(detalles[idx].id, 'cantidad', detalles[idx]?.cantidad || 0)}
            onPressEnter={() => handleDetalleCalculate(detalles[idx].id, 'cantidad', detalles[idx]?.cantidad || 0)}
          />
          {detalles[idx]?.medida?.nombre && (
            <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 2 }}>
              {toTitleCase(detalles[idx].medida!.nombre)}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      width: 130,
      align: 'right' as const,
      responsive: ['sm' as const, 'md' as const, 'lg' as const],
      shouldCellUpdate: (record: DetalleFacturaSuplidorDTO, prevRecord: DetalleFacturaSuplidorDTO) => record.costo !== prevRecord.costo || record.porcentajeDescuento !== prevRecord.porcentajeDescuento || record.cantidad !== prevRecord.cantidad || record.medida?.factor !== prevRecord.medida?.factor,
      render: (_: any, record: DetalleFacturaSuplidorDTO, idx: number) => {
        const costoBase = Number(detalles[idx]?.costo) || 0;
        const pctDesc = Number(detalles[idx]?.porcentajeDescuento) || 0;
        const factor = Number(detalles[idx]?.medida?.factor) || 1;
        const costoConDescuento = costoBase - ((costoBase * pctDesc) / 100);
        const costoUnitario = costoConDescuento / factor;
        return (
          <div>
            <InputNumber
              size="small"
              style={{ width: '100%' }}
              styles={{ input: { textAlign: 'right' } }}
              min={0}
              step={0.01}
              precision={2}
              controls={false}
              value={detalles[idx]?.costo}
              onChange={(val) => handleDetalleUpdateValue(detalles[idx].id, 'costo', val || 0)}
              onBlur={() => handleDetalleCalculate(detalles[idx].id, 'costo', detalles[idx]?.costo || 0)}
              onPressEnter={() => handleDetalleCalculate(detalles[idx].id, 'costo', detalles[idx]?.costo || 0)}
            />
            <div style={{ fontSize: 11, lineHeight: 1.5, color: '#999' }}>
              {formatNumber(costoUnitario)} × {factor}
            </div>
          </div>
        );
      },
    },
    {
      title: '% Desc',
      key: 'porcentajeDescuento',
      width: 90,
      align: 'right' as const,
      render: (_: any, _record: DetalleFacturaSuplidorDTO, idx: number) => (
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
      ),
    },
    {
      title: 'Descuento',
      key: 'descuento',
      width: 100,
      align: 'right' as const,
      responsive: ['md' as const, 'lg' as const],
      render: (_: any, record: DetalleFacturaSuplidorDTO) => (
        <Text>{formatNumber(record.descuento || 0)}</Text>
      ),
    },
    {
      title: 'SubTotal',
      dataIndex: 'subTotal',
      key: 'subTotal',
      width: 100,
      align: 'right' as const,
      responsive: ['md' as const, 'lg' as const],
      render: (_: any, record: DetalleFacturaSuplidorDTO) => (
        <Text>{formatNumber(record.subTotal || 0)}</Text>
      ),
    },
    {
      title: 'Impuestos',
      key: 'impuestos',
      width: 100,
      align: 'right' as const,
      render: (_: any, record: DetalleFacturaSuplidorDTO) => (
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
      width: 100,
      align: 'right' as const,
      render: (_: any, record: DetalleFacturaSuplidorDTO) => (
        <Text strong>{formatNumber(record.total || 0)}</Text>
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 50,
      onCell: () => ({ style: { paddingRight: 8 } }),
      render: (_: any, _record: DetalleFacturaSuplidorDTO, idx: number) => {
        const items = [
          {
            key: 'eliminar',
            label: 'Eliminar',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleEliminarFila(detalles[idx].id),
          },
        ];

        if (detalles[idx]?.tieneVencimiento) {
          items.unshift({
            key: 'vencimiento',
            label: detalles[idx].fechaVencimiento ? `Venc: ${formatDate(detalles[idx].fechaVencimiento!)}` : 'Fecha Vencimiento',
            icon: <CalendarOutlined />,
            danger: false,
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

  const handleRefresh = useCallback(() => {
    if (mode === 'crear') return;
    if (!id) return;
    setLoadingError(false);
    setLoading(true);
    facturaSuplidorApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((_res) => {
        const res = _res as any;
        setData(res); setDetalles(res.detalles || []);
        setSelectedTipo(res.tipo || null); setSelectedConcepto(res.concepto || null);
        setSelectedEntidad(res.suplidor || res.entidad || null);
        setSelectedEntrada(res.entradaAlmacen || null);
        const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
        form.setFieldsValue({
          tipo: res.tipo?.codigo || '', concepto: res.concepto?.codigo || '',
          suplidor: res.suplidor?.codigo || res.entidad?.codigo || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          fechaVencimiento: res.fechaVencimiento ? dayjs(parseDateRaw(res.fechaVencimiento)) : null,
          fechaEntrega: res.fechaEntrega ? dayjs(parseDateRaw(res.fechaEntrega)) : null,
          ncf: res.ncf || '', referencia: res.referencia || '',
          diasCredito: res.diasCredito || 0, moneda: res.moneda?.nombre || '',
          tasa: res.tasa || 1, nota: res.nota || '',
        });
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        message.error(msg); setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, form, mode]);

  return (
    <div>
      {renderToolbar()}

      {loadingError && (
        <Alert
          message="Error al cargar formulario de factura de suplidor"
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

      <BuscarProductoModal
        open={productoModalOpen}
        onClose={() => setProductoModalOpen(false)}
        onSelect={handleProductoSelect}
        mode="compra"
      />
      <BuscarEntradaModal
        open={entradaModalOpen}
        onClose={() => setEntradaModalOpen(false)}
        onSelect={handleEntradaSelect}
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
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(event) => { setActiveId(event.active.id as number); }} onDragEnd={handleDragEnd}>
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
              monedaSimbolo={data?.moneda?.simbolo || selectedConcepto?.moneda?.simbolo || 'RD$'}
              monedaNombre={data?.moneda?.nombre || selectedConcepto?.moneda?.nombre || 'Peso Dominicano'}
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
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(event) => { setActiveId(event.active.id as number); }} onDragEnd={handleDragEnd}>
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
            monedaSimbolo={data?.moneda?.simbolo || selectedConcepto?.moneda?.simbolo || 'RD$'}
            monedaNombre={data?.moneda?.nombre || selectedConcepto?.moneda?.nombre || 'Peso Dominicano'}
            tasa={tasaValue ?? data?.tasa ?? 1}
          />
        </div>
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

export default FacturaSuplidorFormulario;
