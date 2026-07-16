import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Dropdown, Alert, Popover, Empty,
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
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { facturaClienteApi } from '../../api/facturaClienteApi';
import { conceptosApi } from '../../api/conceptosApi';
import { productoApi } from '../../api/productoApi';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import type {
  ConceptoDTO, AlmacenDTO, ClienteDTO, TipoDTO,
} from '../../types/facturaCliente';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import type { DetalleFacturaClienteDTO, FacturaClienteFullDTO } from '../../types/facturaCliente';
import LogTable from '../../components/LogTable';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import BuscarEntidadSelect from '../../components/BuscarEntidadSelect/BuscarEntidadSelect';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import GuidePopover from '../../components/GuidePopover/GuidePopover';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import SeleccionarImpuestosModal from '../../components/SeleccionarImpuestosModal';
import type { ImpuestoSeleccionado } from '../../components/SeleccionarImpuestosModal';
import { DragHandle, SortableRow, DragListenersContext } from '../../components/DragSortable';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useDocumentoConfig } from '../../hooks/useDocumentoConfig';
import { formatCurrency, formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum } from '../../utils/estadoDocumento';
import CamposRestringidosAlert from '../../components/CamposRestringidosAlert';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';

const { Text } = Typography;
const { TextArea } = Input;

// ===== Cálculo de fila para FFAC (Precio × Cantidad) =====
function calcularFila(fila: DetalleFacturaClienteDTO): DetalleFacturaClienteDTO {
  const cantidad = fila.cantidad || 0;
  const precio = fila.precio || 0;
  const pctDesc = fila.porcentajeDescuento || 0;
  const pctImp = fila.porcentajeImpuesto || 0;

  const subTotal = Math.round(cantidad * precio * 100) / 100;
  const descuento = Math.round(subTotal * (pctDesc / 100) * 100) / 100;
  const baseImponible = subTotal - descuento;
  const impuestos = Math.round(baseImponible * (pctImp / 100) * 100) / 100;
  const total = Math.round((baseImponible + impuestos) * 100) / 100;

  return {
    ...fila,
    cantidad,
    precio,
    subTotal,
    descuento,
    impuestos,
    total,
  };
}

function filaVacia(): DetalleFacturaClienteDTO {
  return {
    id: 0,
    codigo: '',
    articulo: '',
    referencia: '',
    cantidad: 0,
    costo: 0,
    precio: 0,
    subTotal: 0,
    porcentajeDescuento: 0,
    descuento: 0,
    porcentajeImpuesto: 0,
    impuestos: 0,
    total: 0,
    tipoArticulo: 'Producto',
    tieneVencimiento: false,
    idTransaccion: 0,
  };
}

// FC19 - Validación de formato NCF
const esNcfValido = (ncf: string): boolean => {
  if (!ncf) return true;
  const upper = ncf.toUpperCase();
  if (upper.startsWith('B')) return upper.length === 11;
  if (upper.startsWith('E')) return upper.length === 13;
  return false;
};



// ===== Componente principal =====
const FacturaClienteFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const { screenCode, documentCode } = useScreenConfig('FFAC');
  const documentoConfig = useDocumentoConfig(sucursalActiva, documentCode);
  const location = useLocation();
  const cloneData = (location.state as any)?.cloneData;
  const monedaDefault = getMonedaSucursalActiva();

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<FacturaClienteFullDTO | null>(null);
  const [detalles, setDetalles] = useState<DetalleFacturaClienteDTO[]>([]);
  const [clientesCache, setClientesCache] = useState<ClienteDTO[]>([]);
  const [almacenesCache, setAlmacenesCache] = useState<AlmacenDTO[]>([]);
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<ClienteDTO | null>(null);
  const [selectedAlmacen, setSelectedAlmacen] = useState<AlmacenDTO | null>(null);
  const [selectedTipo, setSelectedTipo] = useState<TipoDTO | null>(null);
  const [tiposCache, setTiposCache] = useState<TipoDTO[]>([]);
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [fechaVencimientoModal, setFechaVencimientoModal] = useState<{ open: boolean; detalleId: number }>({ open: false, detalleId: 0 });
  const [asientosLocales, setAsientosLocales] = useState<any[]>([]);
  const [impuestosFactura, setImpuestosFactura] = useState<any[]>([]);
  const [modalImpuestosOpen, setModalImpuestosOpen] = useState(false);

  // Cache de medidas
  const [medidasCache, setMedidasCache] = useState<any[]>([]);
  const [sucursalesCache, setSucursalesCache] = useState<any[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState<any>(null);

  // Refs para la guía
  const tipoRef = useRef<HTMLDivElement>(null);
  const conceptoRef = useRef<HTMLDivElement>(null);
  const clienteRef = useRef<HTMLDivElement>(null);
  const almacenRef = useRef<HTMLDivElement>(null);
  const agregarFilaRef = useRef<HTMLDivElement>(null);
  const sucursalRef = useRef<HTMLDivElement>(null);

  // Backup de impuestos para restaurar cuando el concepto deje de ser noImpuesto
  const impuestosBackupRef = useRef<Map<number, { impuesto?: any; porcentajeImpuesto: number }>>(new Map());

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

  // ===== Estado para campos rápidos (NCF, Referencia, Tasa, Días Crédito) =====
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
      const oldValue = editingOriginalValue.current;
      const newValue = editingValueRef.current;
      form.setFieldsValue({ [field]: newValue });

      // FC19 - Validar formato NCF
      if (field === 'ncf') {
        const ncfStr = String(newValue || '');
        if (!esNcfValido(ncfStr)) {
          message.warning('Formato de NCF incorrecto. B=11 dígitos, E=13 dígitos.');
        }
      }

      // FC20 - Si se cambió la tasa y hay detalles, preguntar si actualizar costos
      if (field === 'tasa' && detalles.length > 0 && oldValue !== newValue) {
        Modal.confirm({
          title: 'Actualizar costos',
          icon: <ExclamationCircleOutlined />,
          content: '¿Desea actualizar los costos en base a la nueva tasa?',
          okText: 'Sí',
          cancelText: 'No',
          onOk: () => {
            const tasaNueva = Number(newValue) || 1;
            setDetalles((prev) =>
              prev.map((d) => calcularFila({ ...d, costo: (d.costo || 0) / tasaNueva }))
            );
          },
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

  const [form] = Form.useForm();

  // ===== Watchers reactivos =====
  const ncfValue = Form.useWatch('ncf', form) || '';
  const refValue = Form.useWatch('referencia', form) || '';
  const tasaValue = Form.useWatch('tasa', form) ?? 1;

  const sinOC = true;

  const isLarge = screens.xxl === true;

  // ===== Determinar estado =====
  const estado = toEstadoNum(data?.estado);
  const esCerrado = data?.periodo === 6;
  const esBorrador = estado === 0;
  const esAplicado = estado === 1;
  const esAnulado = estado === 3;

  // ===== Determinar si almacén es obligatorio =====
  const tieneProductos = detalles.some((d) => d.tipoArticulo === 'P' || d.tipoArticulo === 'Producto');

  // ===== Cargar datos de apoyo al montar =====
  useEffect(() => {
    setActiveModule(screenCode);
    const pageTitle = mode === 'crear' ? 'Nueva Factura de Cliente' : 'Editar Factura de Cliente';
    setPageTitleOverride(pageTitle);

    // Cargar almacenes y tipos
    facturaClienteApi.obtenerAlmacenes(sucursalActiva).then(setAlmacenesCache).catch((err) => console.warn('Error al cargar almacenes cache', err));
    facturaClienteApi.obtenerTipos(sucursalActiva).then(setTiposCache).catch((err) => console.warn('Error al cargar tipos cache', err));
    // Cargar sucursales desde la API
    conceptosApi.obtenerSucursales(sucursalActiva).then(setSucursalesCache).catch((err) => console.warn('Error al cargar sucursales cache', err));
    // Cargar unidades de medida
    import('../../api/unidadMedidaApi').then(({ unidadMedidaApi }) => {
      unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch(() => message.error('Error al cargar medidas'));
    });

    // Inicializar fechas en modo crear
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
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, sucursalActiva, form]);

  // ===== Procesar cloneData =====
  useEffect(() => {
    if (mode !== 'crear' || !cloneData) return;

    // Poblar estados
    setSelectedConcepto(cloneData.concepto || null);
    setSelectedCliente(cloneData.cliente || null);
    setSelectedAlmacen(cloneData.almacen || null);
    setSelectedTipo(cloneData.tipo || null);
    setSelectedSucursal(cloneData.sucursal || null);
    setDetalles((cloneData.detalles || []).map((d: any) => calcularFila({
      ...d,
      id: d.id,
      codigo: d.codigo || '',
      articulo: d.articulo || '',
      referencia: d.referencia || '',
      cantidad: d.cantidad || 0,
      precio: d.precio || 0,
      costo: d.costo || 0,
      porcentajeDescuento: d.porcentajeDescuento || 0,
      descuento: d.descuento || 0,
      porcentajeImpuesto: d.porcentajeImpuesto || (d.impuesto?.porcentaje ?? 0),
      impuestos: d.impuestos || 0,
      total: d.total || 0,
      tipoArticulo: d.tipoArticulo || 'Producto',
      tieneVencimiento: d.tieneVencimiento ?? false,
      familia: d.familia,
      medida: d.medida ? { ...d.medida, id: d.medida.idExterno ?? d.medida.id } : undefined,
      impuesto: d.impuesto,
      idTransaccion: 0,
    })));
    setAsientosLocales(cloneData.asientos || []);

    // Poblar campos del form
    form.setFieldsValue({
      concepto: cloneData.concepto?.codigo || '',
      cliente: cloneData.cliente?.codigo || '',
      almacen: cloneData.almacen?.codigo || '',
      tipo: cloneData.tipo?.codigo || '',
      fechaDocumento: dayjs(),
      ncf: cloneData.ncf || '',
      referencia: cloneData.referencia || '',
      tasa: cloneData.tasa || 1,
      nota: cloneData.nota || '',
    });

    // Actualizar texto de busqueda del concepto
    if (cloneData.concepto) {
      setConceptoSearchText(`${cloneData.concepto.codigo || ''} - ${toTitleCase(cloneData.concepto.nombre || '')}`);
    }

    // Cargar clientes si hay concepto
    if (cloneData.concepto?.codigo) {
      facturaClienteApi.obtenerClientes(sucursalActiva)
        .then(setClientesCache)
        .catch((err) => console.warn('Error al cargar clientes cache en clone', err));
    }
  }, [mode, cloneData, sucursalActiva, form]);

  // ===== Cargar datos si es modo editar =====
  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;

    setLoading(true);
    facturaClienteApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        // Mapear de FacturaClienteDTO a FacturaClienteFullDTO
        const full: FacturaClienteFullDTO = {
          id: res.id,
          fechaDocumento: res.fechaDocumento,
          fechaVencimiento: (res as any).fechaVencimiento || '',
          noDocumento: res.noDocumento,
          estado: res.estado,
          periodo: res.periodo,
          ncf: res.ncf || '',
          nota: res.nota || '',
          referencia: res.referencia || '',
          tasa: res.tasa || 1,
          diasCredito: res.diasCredito || 0,
          concepto: res.concepto || null,
          cliente: res.cliente || null,
          almacen: res.almacen || null,
          tipo: (res as any).tipo || null,
          moneda: res.moneda || null,
          documento: res.documento,
          subTotal: res.subTotal,
          descuento: res.descuento,
          impuestos: res.impuestos,
          total: res.total,
          detalles: (res.detalles || []).map((d) => ({
            ...d,
            porcentajeImpuesto: d.porcentajeImpuesto || (d.impuesto?.porcentaje ?? 0),
            tieneVencimiento: d.tieneVencimiento ?? false,
          })),
          asientos: res.asientos || [],
          logs: res.logs || [],
        };
        setData(full);
        setDetalles(full.detalles);
        setAsientosLocales(full.asientos || []);
        setImpuestosFactura((full as any).impuestosFactura || []);
        setSelectedConcepto(full.concepto);
        setSelectedCliente(full.cliente);
        setSelectedAlmacen(full.almacen);
        setSelectedTipo(full.tipo);

        const fechaDoc = full.fechaDocumento ? parseDateRaw(full.fechaDocumento) : null;
        const fechaVenc = full.fechaVencimiento ? parseDateRaw(full.fechaVencimiento) : null;

        form.setFieldsValue({
          concepto: full.concepto?.codigo || '',
          cliente: full.cliente?.codigo || '',
          almacen: full.almacen?.codigo || '',
          tipo: full.tipo?.codigo || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          ncf: full.ncf || '',
          referencia: full.referencia || '',
          tasa: full.tasa || 1,
          nota: full.nota || '',
        });

        // Restaurar sucursal
        if ((full as any).sucursal) {
          setSelectedSucursal((full as any).sucursal);
        }

        // Cargar clientes según el concepto
        if (full.concepto?.codigo) {
          facturaClienteApi.obtenerClientes(sucursalActiva)
            .then(setClientesCache)
            .catch((err) => console.warn('Error al cargar clientes cache en editar', err));
        }
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        message.error(msg);
        setLoadingError(true);
        navigate('/FFAC', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate]);

  // ===== Handler del modal de impuestos compartido =====
  const handleConfirmarImpuestos = (items: ImpuestoSeleccionado[]) => {
    const mapeados = items.map((i) => ({
      id: i.codigo,
      codigo: i.codigo,
      nombre: i.nombre,
      porcentaje: i.porcentaje,
      tipo: i.tipo,
      monto: i.monto,
      impuesto: { nombre: i.nombre, porcentaje: i.porcentaje },
    }));
    setImpuestosFactura((prev: any[]) => {
      const existentes = new Map(prev.map((i: any) => [i.codigo, i]));
      for (const n of mapeados) {
        const existente = existentes.get(n.codigo);
        if (existente) {
          existentes.set(n.codigo, { ...existente, monto: existente.monto ?? n.monto });
        } else {
          existentes.set(n.codigo, n);
        }
      }
      return Array.from(existentes.values());
    });
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
          navigate('/FFAC', { replace: true });
        } else {
          if (id) {
            setLoading(true);
            facturaClienteApi.obtenerPorId(sucursalActiva, parseInt(id))
              .then((res) => {
                const full: FacturaClienteFullDTO = {
                  id: res.id,
                  fechaDocumento: res.fechaDocumento,
                  fechaVencimiento: (res as any).fechaVencimiento || '',
                  noDocumento: res.noDocumento,
                  estado: res.estado,
                  periodo: res.periodo,
                  ncf: res.ncf || '',
                  nota: res.nota || '',
                  referencia: res.referencia || '',
                  tasa: res.tasa || 1,
                  diasCredito: res.diasCredito || 0,
                  concepto: res.concepto || null,
                  cliente: res.cliente || null,
                  almacen: res.almacen || null,
                  tipo: (res as any).tipo || null,
                  moneda: res.moneda || null,
                  documento: res.documento,
                  subTotal: res.subTotal,
                  descuento: res.descuento,
                  impuestos: res.impuestos,
                  total: res.total,
                  detalles: (res.detalles || []).map((d) => ({
                    ...d,
                    porcentajeImpuesto: d.porcentajeImpuesto || (d.impuesto?.porcentaje ?? 0),
                    tieneVencimiento: d.tieneVencimiento ?? false,
                  })),
                  asientos: res.asientos || [],
                  logs: res.logs || [],
                };
                setData(full);
                setDetalles(full.detalles);
                setAsientosLocales(full.asientos || []);
                setImpuestosFactura((full as any).impuestosFactura || []);
                setSelectedConcepto(full.concepto);
                setSelectedCliente(full.cliente);
                setSelectedAlmacen(full.almacen);
                setSelectedTipo(full.tipo);
                setSelectedSucursal((full as any).sucursal || null);

                const fechaDoc = full.fechaDocumento ? parseDateRaw(full.fechaDocumento) : null;
                const fechaVenc = full.fechaVencimiento ? parseDateRaw(full.fechaVencimiento) : null;

                form.setFieldsValue({
                  concepto: full.concepto?.codigo || '',
                  cliente: full.cliente?.codigo || '',
                  almacen: full.almacen?.codigo || '',
                  tipo: full.tipo?.codigo || '',
                  fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                  ncf: full.ncf || '',
                  referencia: full.referencia || '',
                  tasa: full.tasa || 1,
                  nota: full.nota || '',
                });

                if (full.concepto?.codigo) {
                  facturaClienteApi.obtenerClientes(sucursalActiva)
                    .then(setClientesCache)
                    .catch((err) => console.warn('Error al cargar clientes cache al recargar', err));
                }
              })
              .catch((err: any) => {
                const msg = err?.response?.data?.errorMessage || 'Error al recargar el documento';
                message.error(msg);
              })
              .finally(() => setLoading(false));
          }
          navigate(`/FFAC/${id}`, { replace: true });
        }
      },
    });
  };

  // Validación del formulario
  const validarFormulario = (): string | null => {
    const values = form.getFieldsValue();

    if (!selectedConcepto) return 'Debe elegir un Concepto para poder continuar';
    if (!values.cliente && !selectedCliente) return 'Debe elegir un Cliente para poder continuar';
    // FC16 - Almacén requerido solo si hay productos (no servicios)
    if (!selectedAlmacen && !values.almacen && detalles.some((d) => (d.tipoArticulo || 'Producto') === 'Producto')) {
      return 'El almacén es requerido para productos.';
    }

    const fechaDoc = values.fechaDocumento;
    if (fechaDoc) {
      const hoy = dayjs().endOf('day');
      if (dayjs(fechaDoc).isAfter(hoy)) {
        return 'La fecha del documento no puede ser mayor a hoy';
      }
    }

    if (detalles.length === 0) return 'No se puede crear una factura sin detalle.';
    if (!detalles.some((d) => (d.cantidad || 0) > 0)) return 'Debe tener al menos un detalle con cantidad > 0';

    // Validar productos con vencimiento
    const sinVencimiento = detalles.filter((d) => d.tieneVencimiento && !d.fechaVencimiento);
    if (sinVencimiento.length > 0) {
      return `Los siguientes productos requieren fecha de vencimiento: ${sinVencimiento.map((d) => d.articulo).join(', ')}`;
    }

    // Validar asientos cuadrados si existen
    const asientosAValidar = asientosLocales.length > 0 ? asientosLocales : (data?.asientos || []);
    if (asientosAValidar.length > 0) {
      const totalDeb = asientosAValidar.reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
      const totalCred = asientosAValidar.reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);
      if (Math.abs(totalDeb - totalCred) > 0.01) {
        return 'Los asientos contables no están cuadrados. Los débitos deben ser igual a los créditos.';
      }
    }

    // FC15 - Validar según FechaPermitida del documento
    if (data?.documento?.fechaPermitida === 'MenorIgualFechaDia') {
      const fechaDoc = values.fechaDocumento;
      if (fechaDoc && dayjs.isDayjs(fechaDoc)) {
        if (fechaDoc.isAfter(dayjs(), 'day')) {
          return 'La fecha del documento no puede ser mayor a la fecha del día.';
        }
      }
    }

    return null;
  };

  // Construir DTO desde el formulario
  const construirDTO = (): FacturaClienteFullDTO => {
    const values = form.getFieldsValue();
    const base = data || {} as any;

    const clienteSel = clientesCache.find((e) => e.codigo === values.cliente) || selectedCliente;

    const fechaDoc = values.fechaDocumento
      ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
        ? toISOFormat(values.fechaDocumento.toDate())
        : values.fechaDocumento)
      : toISOFormat(new Date());

    const fechaVenc = values.fechaVencimiento
      ? (typeof values.fechaVencimiento === 'object' && values.fechaVencimiento.toDate
          ? toISOFormat(values.fechaVencimiento.toDate())
          : values.fechaVencimiento)
      : null;

    const totalSub = detalles.reduce((s, d) => s + (d.subTotal || 0), 0);
    const totalDesc = detalles.reduce((s, d) => s + (d.descuento || 0), 0);
    const totalImp = detalles.reduce((s, d) => s + (d.impuestos || 0), 0);
    const total = detalles.reduce((s, d) => s + (d.total || 0), 0);

    return {
      id: base.id || 0,
      fechaDocumento: fechaDoc,
      fechaVencimiento: fechaVenc,
      noDocumento: base.noDocumento || '',
      estado: base.estado || 0,
      periodo: base.periodo || new Date().getMonth() + 1,
      ncf: values.ncf || '',
      referencia: values.referencia || '',
      nota: values.nota || '',
      tasa: values.tasa || 1,
      tipoDocumento: base.tipoDocumento ?? 35,
      subTotal: Math.round(totalSub * 100) / 100,
      descuento: Math.round(totalDesc * 100) / 100,
      impuestos: Math.round(totalImp * 100) / 100,
      total: Math.round(total * 100) / 100,
      documento: base.documento || { codigo: documentCode },
      concepto: selectedConcepto || { nombre: '', codigo: '' },
      moneda: base.moneda || getMonedaSucursalActiva(),
      almacen: selectedAlmacen || { nombre: '', codigo: '' },
      cliente: clienteSel || { nombre: '', codigo: '', identificacion: '' },
      tipo: selectedTipo || null,
      sucursal: selectedSucursal
        ? { codigo: selectedSucursal.codigo, idExterno: selectedSucursal.idExterno, nombre: selectedSucursal.nombre || '' }
        : base.sucursal || undefined,
      detalles: detalles.map((d) => calcularFila(d)),
      asientos: asientosLocales.length > 0 ? asientosLocales : (base.asientos || []),
      impuestosFactura: impuestosFactura,
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
        const result = await facturaClienteApi.crear(sucursalActiva, dto);
        message.success('Factura de cliente creada exitosamente');
        navigate(`/FFAC/${result.id}`, { replace: true });
      } else {
        await facturaClienteApi.actualizar(sucursalActiva, dto);
        message.success('Factura de cliente actualizada exitosamente');
        navigate(`/FFAC/${id}`, { replace: true });
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== Handlers de concepto =====
  const handleConceptoSelect = (concepto: ConceptoDTO) => {
    setSelectedConcepto(concepto);
    setEditingField(null);

    // === ConfigurarMoneda (siempre desde concepto) ===
    const monedaObj = concepto.moneda || getMonedaSucursalActiva();
    form.setFieldsValue({
      concepto: concepto.codigo,
      moneda: monedaObj.nombre,
      tasa: monedaObj.tasa ?? 1,
    });
    // Actualizar data local para que la UI lo refleje
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, moneda: monedaObj };
    });

    // Cargar clientes
    facturaClienteApi.obtenerClientes(sucursalActiva)
      .then((ents) => setClientesCache(ents))
      .catch((err) => console.warn('Error al cargar clientes cache al cambiar concepto', err));

    // Si el concepto es NoImpuesto y hay detalles con impuestos, limpiarlos
    const prevNoImpuesto = selectedConcepto?.noImpuesto;

    if (concepto.noImpuesto) {
      const hayImpuestos = detalles.some((d) => (d.porcentajeImpuesto || 0) > 0);
      if (hayImpuestos) {
        const backup = new Map<number, { impuesto?: any; porcentajeImpuesto: number }>();
        detalles.forEach((d) => {
          if ((d.porcentajeImpuesto || 0) > 0) {
            backup.set(d.id, { impuesto: d.impuesto, porcentajeImpuesto: d.porcentajeImpuesto || 0 });
          }
        });
        impuestosBackupRef.current = backup;

        message.warning('El Concepto no acepta Impuestos, por lo que serán eliminados.');
        setDetalles((prev) =>
          prev.map((d) => calcularFila({ ...d, porcentajeImpuesto: 0, impuesto: undefined }))
        );
      }
    } else if (prevNoImpuesto && !concepto.noImpuesto) {
      const backup = impuestosBackupRef.current;
      if (backup.size > 0) {
        setDetalles((prev) =>
          prev.map((d) => {
            const saved = backup.get(d.id);
            if (saved) {
              return calcularFila({ ...d, impuesto: saved.impuesto, porcentajeImpuesto: saved.porcentajeImpuesto });
            }
            return d;
          })
        );
        impuestosBackupRef.current = new Map();
      }
    }
  };

  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
  const [conceptoSearchText, setConceptoSearchText] = useState('');

  const handleConceptoClear = () => {
    setSelectedConcepto(null);
    setConceptoSearchText('');
    setClientesCache([]);
    form.setFieldsValue({ concepto: '', cliente: undefined });
  };

  const handleConceptoSearchClick = () => {
    setConceptoModalOpen(true);
  };

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
    const filaVaciaIdx = detalles.findIndex((d) => !d.codigo);
    if (filaVaciaIdx === -1) {
      const nuevaFila = filaVacia();
      const nuevoId = -(detalles.length + 1);
      setDetalles((prev) => {
        const filled: DetalleFacturaClienteDTO = {
          ...nuevaFila,
          id: nuevoId,
          codigo: producto.codigo,
          articulo: producto.articulo,
          referencia: producto.referencia || '',
          precio: producto.precio || 0,
          familia: producto.familia,
          medida: producto.medida,
          impuesto: producto.impuesto,
          porcentajeImpuesto: producto.impuesto?.porcentaje || 0,
          tieneVencimiento: producto.tieneVencimiento,
          modificaPrecio: producto.modificaPrecio ?? false,
          modificaDescripcion: producto.modificaDescripcion ?? false,
        };
        return [calcularFila(filled), ...prev];
      });
    } else {
      setDetalles((prev) =>
        prev.map((d) => {
          if (d.id !== detalles[filaVaciaIdx].id) return d;
          const filled: DetalleFacturaClienteDTO = {
            ...d,
            codigo: producto.codigo,
            articulo: producto.articulo,
            referencia: producto.referencia || '',
            precio: producto.precio || 0,
            familia: producto.familia,
            medida: producto.medida,
            impuesto: producto.impuesto,
            porcentajeImpuesto: producto.impuesto?.porcentaje || 0,
            tieneVencimiento: producto.tieneVencimiento,
            modificaPrecio: producto.modificaPrecio ?? false,
            modificaDescripcion: producto.modificaDescripcion ?? false,
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

  // ===== Funciones auxiliares para asientos =====
  function esDebito(tipo: any): boolean { return tipo === 'D' || tipo === 0; }
  function esCredito(tipo: any): boolean { return tipo === 'C' || tipo === 1; }

  const handleRefresh = useCallback(() => {
    if (mode === 'crear') return;
    if (!id) return;
    setLoadingError(false);
    setLoading(true);
    facturaClienteApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        const full: FacturaClienteFullDTO = {
          id: res.id, fechaDocumento: res.fechaDocumento,
          fechaVencimiento: (res as any).fechaVencimiento || '', noDocumento: res.noDocumento,
          estado: res.estado, periodo: res.periodo, ncf: res.ncf || '', nota: res.nota || '',
          referencia: res.referencia || '', tasa: res.tasa || 1, diasCredito: res.diasCredito || 0,
          concepto: res.concepto || null, cliente: res.cliente || null, almacen: res.almacen || null,
          tipo: (res as any).tipo || null, moneda: res.moneda || null, documento: res.documento,
          subTotal: res.subTotal, descuento: res.descuento, impuestos: res.impuestos, total: res.total,
          detalles: (res.detalles || []).map((d: any) => ({
            ...d, porcentajeImpuesto: d.porcentajeImpuesto || (d.impuesto?.porcentaje ?? 0),
            tieneVencimiento: d.tieneVencimiento ?? false,
          })),
          asientos: res.asientos || [], logs: res.logs || [],
        };
        setData(full); setDetalles(full.detalles);
        setAsientosLocales(full.asientos || []);
        setImpuestosFactura((full as any).impuestosFactura || []);
        setSelectedConcepto(full.concepto); setSelectedCliente(full.cliente);
        setSelectedAlmacen(full.almacen); setSelectedTipo(full.tipo);
        setSelectedSucursal((full as any).sucursal || null);
        const fechaDoc = full.fechaDocumento ? parseDateRaw(full.fechaDocumento) : null;
        const fechaVenc = full.fechaVencimiento ? parseDateRaw(full.fechaVencimiento) : null;
        form.setFieldsValue({
          concepto: full.concepto?.codigo || '', cliente: full.cliente?.codigo || '',
          almacen: full.almacen?.codigo || '', tipo: full.tipo?.codigo || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          ncf: full.ncf || '', referencia: full.referencia || '',
          tasa: full.tasa || 1, nota: full.nota || '',
        });
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        message.error(msg); setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, form, mode]);

  // ===== Loading state =====
  if (loading) {
    return <LoadingSpinner mensaje="Cargando documento..." />;
  }

  // ===== Estado info =====
  const estadoInfo = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Borrador', color: 'default' };

  // ===== Grid de detalles editable =====
  const detalleColumns = [
    {
      title: '',
      key: 'sort',
      width: 40,
      render: () => <DragHandle />,
    },
    {
      title: 'Código',
      key: 'codigo',
      width: 120,
      fixed: 'left' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: DetalleFacturaClienteDTO) => (
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
      title: 'Artículo',
      key: 'articulo',
      ellipsis: true,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, _record: DetalleFacturaClienteDTO, idx: number) => {
        const fila = detalles[idx];
        if (!fila) return null;
        // Jerarquía Descripción: 1) Documento.modificaDescripcion? 2) Producto.modificaDescripcion?
        const docPermiteDesc = documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion ?? true;
        if (docPermiteDesc) {
          return (
            <div style={{ fontSize: 13 }}>
              <Input
                size="small"
                style={{ width: '100%' }}
                value={fila.articulo || ''}
                onChange={(e) => handleDetalleUpdateValue(fila.id, 'articulo', e.target.value)}
              />
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }}>
                {fila.familia?.nombre ? <Tag style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>{toTitleCase(fila.familia.nombre)}</Tag> : null}
                {fila.fechaVencimiento && <span>V: {formatDate(fila.fechaVencimiento)}</span>}
              </div>
            </div>
          );
        }
        return (
          <div style={{ fontSize: 13 }}>
            <div>{toTitleCase(fila.articulo || '')}</div>
            <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }}>
              {fila.familia?.nombre ? <Tag style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>{toTitleCase(fila.familia.nombre)}</Tag> : null}
              {fila.fechaVencimiento && <span>V: {formatDate(fila.fechaVencimiento)}</span>}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 100,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      shouldCellUpdate: (record: DetalleFacturaClienteDTO, prevRecord: DetalleFacturaClienteDTO) =>
        record.cantidad !== prevRecord.cantidad || record.medida?.nombre !== prevRecord.medida?.nombre,
      render: (_: any, _record: DetalleFacturaClienteDTO, idx: number) => (
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
          {!sinOC && detalles[idx]?.medida?.nombre && (
            <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 2 }}>
              {toTitleCase(detalles[idx].medida!.nombre)}
            </div>
          )}
        </div>
      ),
    },
    ...(sinOC ? [{
      title: 'Medida',
      key: 'medida',
      width: 160,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: DetalleFacturaClienteDTO, _idx: number) => {
        const curId = record.medida?.idExterno ?? record.medida?.id;
        const hasMatch = medidasCache.some((m: any) => m.idExterno === curId);
        return (
          <Select
            size="small"
            style={{ width: '100%' }}
            key={medidasCache.length}
            value={hasMatch ? curId : undefined}
            onChange={(idExterno) => {
              const medida = medidasCache.find((m: any) => m.idExterno === idExterno);
              if (medida) {
                handleDetalleCalculate(record.id, 'medida', {
                  nombre: medida.nombre,
                  codigo: medida.codigo,
                  factor: medida.factor,
                  idExterno: medida.idExterno,
                });
              }
            }}
          >
            {medidasCache.map((m: any) => (
              <Select.Option key={m.idExterno} value={m.idExterno}>
                {toTitleCase(m.nombre)}
              </Select.Option>
            ))}
          </Select>
        );
      },
    }] : []),
    {
      title: 'Precio',
      dataIndex: 'precio',
      key: 'precio',
      width: 130,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
      shouldCellUpdate: (record: DetalleFacturaClienteDTO, prevRecord: DetalleFacturaClienteDTO) => record.precio !== prevRecord.precio || record.porcentajeDescuento !== prevRecord.porcentajeDescuento || record.cantidad !== prevRecord.cantidad || record.medida?.factor !== prevRecord.medida?.factor || record.modificaPrecio !== prevRecord.modificaPrecio,
      render: (_: any, _record: DetalleFacturaClienteDTO, idx: number) => {
        const fila = detalles[idx];
        if (!fila) return null;
        const precioBase = Number(fila.precio) || 0;
        const pctDesc = Number(fila.porcentajeDescuento) || 0;
        const factor = Number(fila.medida?.factor) || 1;
        const precioConDescuento = precioBase - ((precioBase * pctDesc) / 100);
        const precioUnitario = precioConDescuento / factor;
        // Jerarquía Precio: 1) Documento.modificaPrecio? 2) Producto.modificaPrecio?
        const docPermiteEditar = documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio ?? true;
        if (docPermiteEditar) {
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
                value={fila.precio}
                onChange={(val) => handleDetalleUpdateValue(fila.id, 'precio', val || 0)}
                onBlur={() => handleDetalleCalculate(fila.id, 'precio', fila.precio || 0)}
                onPressEnter={() => handleDetalleCalculate(fila.id, 'precio', fila.precio || 0)}
              />
              <div style={{ fontSize: 11, lineHeight: 1.5, color: '#999' }}>
                {formatNumber(precioUnitario)} × {factor}
              </div>
            </div>
          );
        }
        return (
          <div>
            <Text>{formatCurrency(precioBase)}</Text>
            <div style={{ fontSize: 11, lineHeight: 1.5, color: '#999' }}>
              {formatNumber(precioUnitario)} × {factor}
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
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, _record: DetalleFacturaClienteDTO, idx: number) => (
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
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: DetalleFacturaClienteDTO) => (
        <div>
          <Text>{formatNumber(record.descuento || 0)}</Text>
        </div>
      ),
    },
    {
      title: 'SubTotal',
      dataIndex: 'subTotal',
      key: 'subTotal',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: DetalleFacturaClienteDTO) => (
        <Text>{formatNumber(record.subTotal || 0)}</Text>
      ),
    },
    {
      title: 'Impuestos',
      key: 'impuestos',
      width: 140,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: DetalleFacturaClienteDTO) => (
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
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: DetalleFacturaClienteDTO) => (
        <Text strong>{formatNumber(record.total || 0)}</Text>
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 50,
      onCell: () => ({ style: { paddingRight: 8 } }),
      render: (_: any, _record: DetalleFacturaClienteDTO, idx: number) => {
        const items: any[] = [
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

  // ===== Encabezado del formulario =====
  const documentoTieneTipos = tiposCache.length > 0;
  const renderEncabezado = () => (
    <Card className="paces-card" size="small" title="Datos Generales" extra={<EstadoTag estado={estado} periodo={data?.periodo} />} style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={24} xxl={18}>
          <Form form={form} layout="vertical" size="middle" style={{ paddingTop: 24 }}>
            <Row gutter={[16, 24]}>
              {/* Fila 1: Tipo + Concepto */}
              <Col xs={24} sm={12} lg={9}>
                <div ref={tipoRef} style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
                  <div style={{ flex: 1 }}>
                    <Form.Item name="tipo" style={{ marginBottom: 0 }}>
                      <FloatingField label="Tipo Documento">
                        <Select
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          labelInValue
                          value={selectedTipo ? { value: selectedTipo.codigo, label: `${selectedTipo.codigo} - ${toTitleCase(selectedTipo.nombre)}` } : undefined}
                          placeholder=" "
                          onChange={(val: any) => {
                            const t = tiposCache.find((tc) => tc.codigo === val?.value);
                            setSelectedTipo(t || null);
                            form.setFieldsValue({ tipo: val?.value || '' });
                          }}
                          onClear={() => {
                            setSelectedTipo(null);
                            form.setFieldsValue({ tipo: '' });
                          }}
                          options={tiposCache.map((tc) => ({
                            value: tc.codigo,
                            label: `${tc.codigo} - ${toTitleCase(tc.nombre)}`,
                          }))}
                        />
                      </FloatingField>
                    </Form.Item>
                  </div>
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
                            onClick={() => (!documentoTieneTipos || selectedTipo) && handleConceptoSearchClick()}
                            style={{ cursor: (!documentoTieneTipos || selectedTipo) ? 'pointer' : 'not-allowed', color: 'rgba(0,0,0,0.45)' }}
                          />
                          {selectedConcepto && <ClearOutlined onClick={handleConceptoClear} style={{ cursor: 'pointer' }} />}
                        </Space>
                      }
                      onClick={() => (!documentoTieneTipos || selectedTipo) && handleConceptoSearchClick()}
                    />
                  </FloatingField>
                  <ConceptoInfoLabel concepto={selectedConcepto} />
                </div>
                <Form.Item name="concepto" hidden><Input /></Form.Item>
              </Col>

              {/* Fila 2: FechaDocumento + Cliente */}
              <Col xs={24} sm={12} lg={9}>
                <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }}>
                  <FloatingField label="Fecha Documento" required>
                    <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                  </FloatingField>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={15}>
                <div ref={clienteRef}>
                  <Form.Item name="cliente" required style={{ marginBottom: 0 }}>
                    <BuscarEntidadSelect
                      entidades={clientesCache as any}
                      value={selectedCliente?.codigo}
                      label="Cliente"
                      required
                      onChange={(codigo, entidad) => {
                        setSelectedCliente(entidad || null);
                        // FC17 - Si el cliente es exento de impuestos, limpiar
                        if (entidad?.exentoImpuesto && detalles.some((d) => (d.impuesto?.porcentaje || 0) > 0)) {
                          message.warning('El cliente está exento de impuestos. Se eliminarán los impuestos de los detalles.');
                          setDetalles((prev) =>
                            prev.map((d) => {
                              const limpio = { ...d, impuesto: undefined, impuestos: 0 };
                              return calcularFila(limpio);
                            })
                          );
                        }
                      }}
                    />
                  </Form.Item>
                </div>
              </Col>

              {/* Fila 3: Sucursal + Almacén */}
              <Col xs={24} sm={12} lg={9}>
                <div ref={sucursalRef}>
                  <Form.Item name="sucursal" style={{ marginBottom: 0 }}>
                    <FloatingField label="Sucursal">
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        labelInValue
                        value={selectedSucursal ? (() => {
                          const match = sucursalesCache.find((s: any) => 
                            String(s.sucursal ?? s.codigo) === String(selectedSucursal.sucursal ?? selectedSucursal.codigo)
                          );
                          return { 
                            value: String(selectedSucursal.sucursal ?? selectedSucursal.codigo), 
                            label: toTitleCase(match?.nombre || selectedSucursal.nombre || '') 
                          };
                        })() : undefined}
                        onChange={(val: any) => {
                          const suc = sucursalesCache.find((s: any) => 
                            String(s.sucursal ?? s.codigo) === val?.value
                          );
                          setSelectedSucursal(suc || null);
                        }}
                        placeholder="Seleccionar sucursal"
                        options={sucursalesCache.map((s: any) => ({
                          value: String(s.sucursal ?? s.codigo),
                          label: toTitleCase(s.nombre || ''),
                        }))}
                      />
                    </FloatingField>
                  </Form.Item>
                </div>
              </Col>
              <Col xs={24} sm={12} lg={15}>
                <Form.Item name="almacen" required={tieneProductos} style={{ marginBottom: 0 }}>
                  <FloatingField label="Almacén" required={tieneProductos} ref={almacenRef}>
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

              {/* Fila 4: Campos rápidos (NCF, Referencia, Tasa, Días Crédito) */}
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

                    {/* Días Crédito - eliminado */}
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
        </Col>
        <Col xs={24} xxl={6}>
          <div style={{ marginTop: 24 }}>
            <TotalesCard
              subTotal={totales.subTotal}
              descuento={totales.descuento}
              impuestos={totales.impuestos}
              total={totales.total}
              hideTitle
              monedaSimbolo={data?.moneda?.simbolo || selectedConcepto?.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={data?.moneda?.nombre || selectedConcepto?.moneda?.nombre || monedaDefault.nombre}
              tasa={tasaValue ?? data?.tasa ?? 1}
            />
          </div>
        </Col>
      </Row>
    </Card>
  );

  // ===== Columnas de impuestos =====
  const impuestoColumns = [
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      width: 120,
      render: (v: string) => <Text>{v || '-'}</Text>,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      ellipsis: true,
      render: (v: string) => <Text>{v || '-'}</Text>,
    },
    {
      title: '%',
      dataIndex: 'porcentaje',
      key: 'porcentaje',
      width: 80,
      align: 'right' as const,
      render: (v: number) => <Text>{v != null ? `${v}%` : '-'}</Text>,
    },
    {
      title: 'Monto',
      dataIndex: 'monto',
      key: 'monto',
      width: 140,
      align: 'right' as const,
      render: (_: any, _record: any, idx: number) => (
        <InputNumber
          size="small"
          style={{ width: 120 }}
          min={0}
          step={0.01}
          precision={2}
          value={impuestosFactura[idx]?.monto}
          onChange={(val) => {
            setImpuestosFactura((prev: any[]) => {
              const next = [...prev];
              next[idx] = { ...next[idx], monto: val || 0 };
              return next;
            });
          }}
        />
      ),
    },
    {
      title: '',
      key: 'accion',
      width: 50,
      render: (_: any, record: any, idx: number) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => {
            setImpuestosFactura((prev: any[]) => prev.filter((_: any, i: number) => i !== idx));
          }}
        />
      ),
    },
  ];

  return (
    <div>
      <FormularioToolbar saving={saving} estado={estado} periodo={data?.periodo} onGuardar={handleGuardar} onCancelar={handleCancelar} />

      {loadingError && (
        <Alert
          message="Error al cargar formulario de factura de cliente"
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
        documento={documentCode}
        tipo={selectedTipo?.codigo}
        tipoEntidad="CLI"
      />
      <BuscarProductoModal
        open={productoModalOpen}
        onClose={() => setProductoModalOpen(false)}
        onSelect={handleProductoSelect}
        mode="venta"
      />

      {/* Modal de selección de impuestos */}
      <SeleccionarImpuestosModal
        open={modalImpuestosOpen}
        onClose={() => setModalImpuestosOpen(false)}
        onConfirm={handleConfirmarImpuestos}
        tipoEntidad="CLI"
        sucursal={sucursalActiva}
        existentes={impuestosFactura.map((i: any) => ({
          codigo: i.codigo || '',
          nombre: i.nombre || '',
          porcentaje: i.porcentaje || 0,
          tipo: i.tipo || 'Impuesto',
          monto: i.monto,
        }))}
      />

      {isLarge ? (
        /* === DESKTOP LAYOUT (>= xxl) === */
        <Row gutter={16}>
          <Col xxl={24}>
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
                      {(documentoConfig?.modificaPrecio === false || documentoConfig?.modificaDescripcion === false || data?.documento?.modificaPrecio === false || data?.documento?.modificaDescripcion === false) && detalles.length > 0 && (
                        <CamposRestringidosAlert
                          modificaPrecio={documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio}
                          modificaDescripcion={documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion}
                        />
                      )}
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
                          locale={{
                            emptyText: (
                              <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Empty description="Sin registros" />
                              </div>
                            ),
                          }}
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
                  key: 'impuestos',
                  label: `Impuestos (${impuestosFactura.length})`,
                  children: (
                    <>
                      <div style={{ marginBottom: 8 }}>
                        <Button type="primary" ghost icon={<SearchOutlined />} onClick={() => setModalImpuestosOpen(true)}>
                          Seleccionar del catálogo
                        </Button>
                        {impuestosFactura.length > 0 && (
                          <Button type="link" danger style={{ marginLeft: 8 }} onClick={() => setImpuestosFactura([])}>
                            Limpiar todos
                          </Button>
                        )}
                      </div>
                      <Table
                        dataSource={impuestosFactura}
                        columns={impuestoColumns}
                        rowKey={(r: any) => r.id || r.codigo || Math.random()}
                        size="small"
                        pagination={false}
                        scroll={{ x: 600 }}
                        locale={{ emptyText: 'Sin impuestos seleccionados' }}
                      />
                    </>
                  ),
                },
                {
                  key: 'asientos',
                  label: `Asientos (${asientosLocales.length || data?.asientos?.length || 0})`,
                  children: (
                    <AsientosContableEditables
                      asientos={asientosLocales.length > 0 ? asientosLocales : (data?.asientos || [])}
                      onChange={setAsientosLocales}
                      editable={mode === 'crear' || mode === 'editar'}
                      scroll={{ x: 900 }}
                    />
                  ),
                },
                ...(data?.logs && data.logs.length > 0
                  ? [{
                      key: 'historial',
                      label: `Historial (${data?.logs?.length || 0})`,
                      children: (
                        <LogTable dataSource={data?.logs || []} scroll={{ x: 900 }} />
                      ),
                    }]
                  : []),
              ]}
            />
          </Col>
        </Row>
      ) : (
        /* === MOBILE LAYOUT (< xxl) === */
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
                    {(documentoConfig?.modificaPrecio === false || documentoConfig?.modificaDescripcion === false || data?.documento?.modificaPrecio === false || data?.documento?.modificaDescripcion === false) && detalles.length > 0 && (
                      <CamposRestringidosAlert
                        modificaPrecio={documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio}
                        modificaDescripcion={documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion}
                      />
                    )}
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
                        locale={{
                          emptyText: (
                            <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Empty description="Sin registros" />
                            </div>
                          ),
                        }}
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
                key: 'impuestos',
                label: `Impuestos (${impuestosFactura.length})`,
              children: (
                  <>
                    <div style={{ marginBottom: 8 }}>
                      <Button type="primary" ghost icon={<SearchOutlined />} onClick={() => setModalImpuestosOpen(true)}>
                        Seleccionar del catálogo
                      </Button>
                      {impuestosFactura.length > 0 && (
                        <Button type="link" danger style={{ marginLeft: 8 }} onClick={() => setImpuestosFactura([])}>
                          Limpiar todos
                        </Button>
                      )}
                    </div>
                    <Table
                      dataSource={impuestosFactura}
                      columns={impuestoColumns}
                      rowKey={(r: any) => r.id || r.codigo || Math.random()}
                      size="small"
                      pagination={false}
                      scroll={{ x: 600 }}
                      locale={{ emptyText: 'Sin impuestos seleccionados' }}
                    />
                  </>
                ),
              },
              {
                key: 'asientos',
                label: `Asientos (${asientosLocales.length || data?.asientos?.length || 0})`,
                children: (
                  <AsientosContableEditables
                    asientos={asientosLocales.length > 0 ? asientosLocales : (data?.asientos || [])}
                    onChange={setAsientosLocales}
                    editable={mode === 'crear' || mode === 'editar'}
                    scroll={{ x: 900 }}
                  />
                ),
              },
              ...(data?.logs && data.logs.length > 0
                ? [{
                    key: 'historial',
                    label: `Historial (${data?.logs?.length || 0})`,
                    children: (
                      <LogTable dataSource={data?.logs || []} scroll={{ x: 900 }} />
                    ),
                  }]
                : []),
            ]}
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

      {/* Guía paso a paso */}
      {(mode === 'crear' || esBorrador) && (
        <FacturaClienteGuide
          mode={mode}
          tipo={selectedTipo}
          concepto={selectedConcepto}
          almacen={selectedAlmacen}
          cliente={selectedCliente}
          detallesCount={detalles.length}
          tieneProductos={tieneProductos}
          tipoRef={tipoRef}
          conceptoRef={conceptoRef}
          almacenRef={almacenRef}
          clienteRef={clienteRef}
          agregarFilaRef={agregarFilaRef}
          sucursal={selectedSucursal}
          sucursalRef={sucursalRef}
        />
      )}
    </div>
  );
};

// ===== Componente Guía paso a paso para FacturaCliente =====
interface FacturaClienteGuideProps {
  mode: 'crear' | 'editar';
  tipo: any | null;
  concepto: any | null;
  almacen: any | null;
  cliente: any | null;
  detallesCount: number;
  tieneProductos: boolean;
  tipoRef: React.RefObject<HTMLDivElement | null>;
  conceptoRef: React.RefObject<HTMLDivElement | null>;
  almacenRef: React.RefObject<HTMLDivElement | null>;
  clienteRef: React.RefObject<HTMLDivElement | null>;
  agregarFilaRef: React.RefObject<HTMLDivElement | null>;
  sucursal: any | null;
  sucursalRef: React.RefObject<HTMLDivElement | null>;
}

interface GuideStep {
  key: string;
  title: string;
  description: string;
  target: () => HTMLDivElement | null;
}

const FacturaClienteGuide: React.FC<FacturaClienteGuideProps> = ({
  tipo, concepto, almacen, cliente, detallesCount, tieneProductos,
  tipoRef, conceptoRef, almacenRef, clienteRef, agregarFilaRef,
  sucursal, sucursalRef,
}) => {
  const [open, setOpen] = useState(false);
  const dismissedStepRef = useRef<string | null>(null);
  const currentStepRef = useRef<GuideStep | null>(null);

  const getCurrentStep = useCallback((): GuideStep | null => {
    const steps: GuideStep[] = [
      {
        key: 'sucursal',
        title: 'Sucursal',
        description: 'Seleccione la sucursal contable.',
        target: () => sucursalRef.current,
      },
      {
        key: 'tipo',
        title: 'Paso 1: Tipo de Documento',
        description: 'Debe elegir un tipo de documento antes de seleccionar el concepto.',
        target: () => tipoRef.current,
      },
      {
        key: 'concepto',
        title: 'Paso 2: Concepto',
        description: 'Seleccione un concepto. Las opciones dependen del tipo seleccionado.',
        target: () => conceptoRef.current,
      },
      {
        key: 'cliente',
        title: 'Paso 3: Cliente',
        description: 'Seleccione el cliente. El RNC se mostrará automáticamente.',
        target: () => clienteRef.current,
      },
      {
        key: 'almacen',
        title: 'Almacén',
        description: 'Debe elegir un almacén para poder continuar.',
        target: () => almacenRef.current,
      },
      {
        key: 'productos',
        title: 'Paso 4: Productos',
        description: 'Agregue productos usando "Agregar producto" o el scanner.',
        target: () => agregarFilaRef.current,
      },
    ];

    if (!sucursal) return steps[0];
    if (!tipo) return steps[1];
    if (!concepto) return steps[2];
    if (!cliente) return steps[3];
    if (tieneProductos && !almacen) return steps[4];
    if (detallesCount === 0) return steps[5];

    return null;
  }, [tipo, concepto, almacen, cliente, detallesCount, tieneProductos, sucursal, tipoRef, conceptoRef, almacenRef, clienteRef, agregarFilaRef, sucursalRef]);

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

export default FacturaClienteFormulario;

