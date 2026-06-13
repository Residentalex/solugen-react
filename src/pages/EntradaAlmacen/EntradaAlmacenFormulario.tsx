import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Button, Space, Row, Col, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Dropdown, Divider, Alert, Badge, Empty, Tooltip,
} from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  MoreOutlined,
  CalendarOutlined,
  HolderOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BarcodeOutlined,
  PercentageOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Sucursal } from '../../types/auth';

import { entradaAlmacenApi } from '../../api/entradaAlmacenApi';
import { devolucionCompraApi } from '../../api/devolucionCompraApi';
import { conceptosApi } from '../../api/conceptosApi';
import { ordenCompraApi } from '../../api/ordenCompraApi';
import { productoApi } from '../../api/productoApi';
import { parametrosApi } from '../../api/parametrosApi';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import BuscarOrdenCompraModal from '../../components/BuscarOrdenCompraModal/BuscarOrdenCompraModal';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import EntradaAlmacenGuide from './EntradaAlmacenGuide';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import ScannerModal from '../../components/ScannerModal/ScannerModal';
import ProductosOrigenModal from '../../components/ProductosOrigenModal/ProductosOrigenModal';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { DragHandle, SortableRow, DragListenersContext } from '../../components/DragSortable';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { formatCurrency, formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';
import type {
  EntradaAlmacenDTO, DetalleEntradaAlmacenDTO,
  ConceptoDTO, AlmacenDTO, SuplidorDTO,
  OrdenCompraVistaDTO, DetalleOrdenCompraVistaDTO,
} from '../../types/entradaAlmacen';
import type { UnidadMedidaDTO } from '../../types/productos';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';

const { Text } = Typography;
const { TextArea } = Input;

// ===== Cálculo de fila =====

// ===== Cálculo de fila =====
function calcularFila(fila: DetalleEntradaAlmacenDTO): DetalleEntradaAlmacenDTO {
  const cantidad = fila.cantidad || 0;
  const costo = fila.costo || 0;
  const pctDesc = fila.porcentajeDescuento || 0;
  const pctImp = fila.impuesto?.porcentaje ?? (fila.porcentajeImpuesto || 0);
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








// ===== Componente principal =====
const EntradaAlmacenFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const cloneData = (location.state as any)?.cloneData;
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const { screenCode, documentCode } = useScreenConfig('FENP');

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<EntradaAlmacenDTO | null>(null);
  const [detalles, setDetalles] = useState<DetalleEntradaAlmacenDTO[]>([]);
  const [entidadesCache, setEntidadesCache] = useState<SuplidorDTO[]>([]);
  const [almacenesCache, setAlmacenesCache] = useState<AlmacenDTO[]>([]);
  const [medidasCache, setMedidasCache] = useState<UnidadMedidaDTO[]>([]);
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
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [ocProductosModalOpen, setOcProductosModalOpen] = useState(false);
  const [ocProductoSearch, setOcProductoSearch] = useState('');
  const [comodines, setComodines] = useState<any[]>([]);
  const [fechaCierreContable, setFechaCierreContable] = useState<string | null>(null);
  const [fechaCierreInventario, setFechaCierreInventario] = useState<string | null>(null);
  const [modoDescuento, setModoDescuento] = useState<'porcentaje' | 'pesos'>('porcentaje');
  const [verificados, setVerificados] = useState<Set<number>>(new Set());
  const [detallesDevolucion, setDetallesDevolucion] = useState<any[]>([]);
  const [modalDevolucionOpen, setModalDevolucionOpen] = useState(false);
  const [detalleDevolucionActivo, setDetalleDevolucionActivo] = useState<any>(null);
  const [cantidadDevolucionInput, setCantidadDevolucionInput] = useState<number>(0);

  const editValuesRef = useRef<Record<string, any>>({});

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
      const oldValue = form.getFieldValue(field);
      const newValue = editingValueRef.current;
      form.setFieldsValue({ [field]: newValue });

      // Si se cambió la tasa y hay detalles, preguntar si actualizar costos
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

  // ===== Watchers reactivos para campos usados en el encabezado =====
  const ncfValue = Form.useWatch('ncf', form) || '';
  const refValue = Form.useWatch('referencia', form) || '';
  const tasaValue = Form.useWatch('tasa', form) ?? 1;

  // ===== Refs para la guía (Tour) =====
  const conceptoRef = useRef<HTMLDivElement>(null);
  const suplidorRef = useRef<HTMLDivElement>(null);
  const ordenCompraRef = useRef<HTMLDivElement>(null);
  const almacenRef = useRef<HTMLDivElement>(null);
  const agregarFilaRef = useRef<HTMLDivElement>(null);
  const ncfRef = useRef<HTMLDivElement>(null);

  const isLarge = screens.xl ?? true;

  // ===== Determinar qué acciones mostrar según estado =====
  const estado = data?.estado ?? 0;
  const esCerrado = data?.periodo === 6;
  const esBorrador = estado === 0;

  // ===== Cargar datos de apoyo al montar =====
  useEffect(() => {
    setActiveModule(screenCode);
    const pageTitle = mode === 'crear' ? 'Nuevo Entrada de Almacén' : '';
    setPageTitleOverride(pageTitle);

    const cleanup = () => {
      resetToolbar();
      setPageTitleOverride('');
    };

    // === Si viene de Clonar ===
    if (cloneData) {
      setDetalles((cloneData.detalles || []).map((d: DetalleEntradaAlmacenDTO) => calcularFila(d)));
      setSelectedConcepto(cloneData.concepto || null);
      setConceptoSearchText(`${cloneData.concepto?.codigo || ''} - ${toTitleCase(cloneData.concepto?.nombre || '')}`);
      setSelectedEntidad(cloneData.suplidor || cloneData.entidad || null);
      setSelectedAlmacen(cloneData.almacen || null);

      const fechaDoc = cloneData.fechaDocumento ? parseDateRaw(cloneData.fechaDocumento) : null;
      form.setFieldsValue({
        conceptoNombre: cloneData.concepto?.nombre || '',
        concepto: cloneData.concepto?.codigo || '',
        suplidor: cloneData.suplidor?.codigo || cloneData.entidad?.codigo || '',
        almacen: cloneData.almacen?.codigo || '',
        fechaDocumento: fechaDoc ? dayjs(fechaDoc) : dayjs(),
        fechaRecibo: cloneData.fechaEntrega ? dayjs(parseDateRaw(cloneData.fechaEntrega)) : dayjs(),
        ncf: cloneData.ncf || '',
        referencia: cloneData.referencia || '',
        ordenCompra: cloneData.ordenCompra?.noDocumento || '',
        moneda: cloneData.moneda?.nombre || '',
        tasa: cloneData.tasa || 1,
        nota: cloneData.nota || '',
      });
      return cleanup;
    }

    // Cargar catálogos
    conceptosApi.obtenerAlmacenes(sucursalActiva).then(setAlmacenesCache).catch(() => {});
    // Obtener fechas de cierre (contable e inventario)
    parametrosApi.obtenerFechaCierreInventario(sucursalActiva).then(setFechaCierreInventario).catch(() => {});
    parametrosApi.obtenerFechaCierreFiscal(sucursalActiva).then(setFechaCierreContable).catch(() => {});
    // Cargar unidades de medida
    unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch((err) => {
      message.error(extraerMensajeError(err, 'Error al cargar unidades de medida'));
    });

    // Inicializar fechas en modo crear
    if (mode === 'crear') {
      form.setFieldsValue({
        fechaDocumento: dayjs(),
        fechaRecibo: dayjs(),
      });
    }

    return cleanup;
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, sucursalActiva, form, cloneData]);

  // ===== Cargar datos si es modo editar =====
  useEffect(() => {
    if (mode === 'crear') return;

    if (!id) return;
    setLoading(true);
    entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setPageTitleOverride(`Editar - ${res.documento.codigo}-${res.noDocumento}`);
        setDetalles((res.detalles || []).map((d: DetalleEntradaAlmacenDTO) => calcularFila(d)));
        setSelectedConcepto(res.concepto || null);
        setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
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
        setLoadingError(true);
        navigationConfirmedRef.current = true;
        navigate('/FENP');
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate]);

  // ===== Cargar detalles de OC vinculada y comodines =====
  useEffect(() => {
    if (!data?.ordenCompra?.id) return;
    if (ocDetallesData.length > 0) return;
    ordenCompraApi.obtenerPorId(Sucursal.Compra, data.ordenCompra.id)
      .then((oc: any) => {
        if (oc.detalles?.length) setOcDetallesData(oc.detalles);
      })
      .catch(() => message.warning('No se pudieron cargar los detalles de la OC'));
    // Cargar comodines
    productoApi.obtenerComodines(Sucursal.Compra)
      .then(setComodines)
      .catch(() => {});
  }, [data?.ordenCompra?.id, ocDetallesData.length]);

  // Cargar detalles de OC y comodines al abrir el modal si no se han cargado antes
  useEffect(() => {
    if (!ocProductosModalOpen || !selectedOC) return;
    if (ocDetallesData.length > 0) return;

    ordenCompraApi.obtenerPorId(Sucursal.Compra, selectedOC.id)
      .then((oc: any) => {
        if (oc.detalles?.length) {
          setOcDetallesData(oc.detalles);
        }
      })
      .catch(() => message.warning('No se pudieron cargar los detalles de la OC'));
    productoApi.obtenerComodines(Sucursal.Compra)
      .then(setComodines)
      .catch(() => {});
  }, [ocProductosModalOpen, selectedOC, ocDetallesData.length]);

  const navigationConfirmedRef = useFormularioNavigation();

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
          navigationConfirmedRef.current = true;
          navigate('/FENP');
        } else {
          if (id) {
            setLoading(true);
            entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
              .then((res) => {
        setData(res);
        setPageTitleOverride(`Editar - ${res.documento.codigo}-${res.noDocumento}`);
        setDetalles((res.detalles || []).map((d: DetalleEntradaAlmacenDTO) => calcularFila(d)));
                setSelectedConcepto(res.concepto || null);
                setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
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
          navigationConfirmedRef.current = true;
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

    // Validar fecha contra cierre contable e inventario (usar la mayor)
    const fechas: (string | null)[] = [fechaCierreContable, fechaCierreInventario];
    const fechasValidas = fechas.filter((f): f is string => f !== null);
    if (fechasValidas.length > 0) {
      const timestamps = fechasValidas.map((f) => {
        const d = parseDateRaw(f);
        return d ? dayjs(d).startOf('day').valueOf() : 0;
      }).filter((t) => t > 0);

      if (timestamps.length > 0) {
        const cierreMaxTs = Math.max(...timestamps);

        const fechaDoc = values.fechaDocumento;
        if (fechaDoc && dayjs(fechaDoc).startOf('day').valueOf() <= cierreMaxTs) {
          return 'La fecha del documento no puede ser menor o igual a la fecha de cierre (contable o de inventario)';
        }

        const fechaRec = values.fechaRecibo;
        if (fechaRec && dayjs(fechaRec).startOf('day').valueOf() <= cierreMaxTs) {
          return 'La fecha de recibo no puede ser menor o igual a la fecha de cierre (contable o de inventario)';
        }
      }
    }

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
      documento: base.documento || { codigo: documentCode },
      entidad: entidadSel
        ? { nombre: entidadSel.nombre, codigo: entidadSel.codigo, identificacion: entidadSel.identificacion || '', telefono: entidadSel.telefono, direccion: entidadSel.direccion }
        : { nombre: '', codigo: '', identificacion: '' },
      concepto: selectedConcepto || { nombre: '', codigo: '' },
      moneda: selectedConcepto?.moneda || base.moneda || { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' },
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
    let entidadGuardada: any = null;
    try {
      const dto = construirDTO();
      if (mode === 'crear') {
        const result = await entradaAlmacenApi.crear(sucursalActiva, dto);
        entidadGuardada = result;
        message.success('Entrada de almacén creada exitosamente');
      } else {
        await entradaAlmacenApi.actualizar(sucursalActiva, dto);
        entidadGuardada = { id: parseInt(id!), noDocumento: data?.noDocumento };
        message.success('Entrada de almacén actualizada exitosamente');
      }

      // ===== Crear DVC si hay devoluciones pendientes =====
      if (detallesDevolucion.length > 0) {
        try {
          const dvcDTO: any = {
            id: 0,
            fechaDocumento: toISOFormat(new Date()),
            noDocumento: '',
            estado: 0,
            periodo: new Date().getMonth() + 1,
            referencia: entidadGuardada?.noDocumento || data?.noDocumento || '',
            ncf: '',
            nota: `Devolución generada desde ENP-${entidadGuardada?.noDocumento || data?.noDocumento}`,
            tasa: dto.tasa || 1,
            concepto: selectedConcepto || { nombre: '', codigo: '' },
            almacen: dto.almacen,
            suplidor: dto.suplidor || dto.entidad,
            entidad: dto.entidad,
            tipo: null,
            entrada: { id: entidadGuardada?.id || parseInt(id!), noDocumento: entidadGuardada?.noDocumento || data?.noDocumento },
            moneda: dto.moneda,
            documento: { codigo: 'DVC' },
            subTotal: detallesDevolucion.reduce((s: number, d: any) => s + (d.subTotal || 0), 0),
            descuento: detallesDevolucion.reduce((s: number, d: any) => s + (d.descuento || 0), 0),
            impuestos: detallesDevolucion.reduce((s: number, d: any) => s + (d.impuestos || 0), 0),
            total: detallesDevolucion.reduce((s: number, d: any) => s + (d.total || 0), 0),
            detalles: detallesDevolucion,
            asientos: [],
            logs: [],
          };

          const dvcCreada = await devolucionCompraApi.crear(sucursalActiva, dvcDTO);
          message.success(
            `Entrada guardada. DVC-${dvcCreada.noDocumento} creada exitosamente.`,
            6
          );
        } catch (errDVC: any) {
          const msgDVC = extraerMensajeError(errDVC, 'Error desconocido');
          message.warning(
            `Entrada guardada, pero ocurrió un error al crear la DVC: ${msgDVC}`,
            8
          );
          // NO bloquear la navegación — la ENP ya se guardó
        }
      }

      navigationConfirmedRef.current = true;
      if (mode === 'crear') {
        navigate(`/FENP/${entidadGuardada.id}`);
      } else {
        navigate(`/FENP/${id}`);
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
    setConceptoSearchText(`${concepto.codigo || ''} - ${toTitleCase(concepto.nombre)}`);
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
        prev.map((d) => calcularFila({ ...d, porcentajeImpuesto: 0, impuesto: undefined }))
      );
    }

    // === ConfigurarMoneda ===
    // Usar la moneda del concepto si viene, sino default a Peso Dominicano
    const monedaObj = concepto.moneda || { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' };
    const monedaNombre = monedaObj.nombre;
    const tasaDefault = monedaObj.codigo === 'DOP' ? 1 : (concepto.moneda?.codigo ? undefined : 1);
    form.setFieldsValue({
      moneda: monedaNombre,
      tasa: tasaDefault ?? 1,
    });
    // Actualizar data local para que construirDTO y la UI lo reflejen
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, moneda: monedaObj };
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

    // 2. Cargar OC completa para tener los detalles (siempre, aunque no se carguen al detalle)
    let ocDetalles: any[] = [];
    try {
      const ocCompleta = await ordenCompraApi.obtenerPorId(Sucursal.Compra, orden.id) as any;
      ocDetalles = ocCompleta.detalles || [];
      setOcDetallesData(ocDetalles);
    } catch {
      // Si falla la carga, continuar sin detalles de OC
    }

    // 3. Preguntar si cargar detalles
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

    // 4. Cargar detalles si confirma
    if (shouldLoad) {
      try {
        const nuevosDetalles: DetalleEntradaAlmacenDTO[] = ocDetalles
          .filter((d: any) => {
            const cantidad = (d.cantidad + (d.cantidadBonificable || 0)) - (d.cantidadRecibida || 0);
            return cantidad > 0;
          })
          .map((d: any, idx: number) => ({
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

    // 5. Asignar suplidor desde la OC solo si no hay uno seleccionado
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

  // ===== Handlers de detalles =====
  const handleDescuentoGlobal = () => {
    let descuentoGlobal = 0;
    Modal.confirm({
      title: 'Descuento global',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <Typography.Text className="paces-text-secondary">
            Aplicar descuento porcentual a todos los productos:
          </Typography.Text>
          <InputNumber
            autoFocus
            style={{ width: '100%', marginTop: 8 }}
            min={0}
            max={100}
            step={0.01}
            precision={2}
            placeholder="0.00"
            onChange={(val) => { descuentoGlobal = val || 0; }}
          />
        </div>
      ),
      okText: 'Aplicar',
      cancelText: 'Cancelar',
      onOk: () => {
        if (descuentoGlobal > 0) {
          setDetalles((prev) =>
            prev.map((d) => calcularFila({ ...d, porcentajeDescuento: descuentoGlobal }))
          );
        }
      },
    });
  };

  const handleAgregarFila = () => {
    setDetalles((prev) => [{ ...filaVacia(), id: -(prev.length + 1) }, ...prev]);
  };

    const handleSeleccionarProducto = (producto: any) => {
      // Si hay OC vinculada, validar que el producto pertenezca a la OC o sea comodín
      if (ocDetallesData.length > 0) {
        const existeEnOC = ocDetallesData.some((d: any) => d.codigo === producto.codigo);
        const esComodin = comodines.some((d: any) => (d.codigo || d.idExterno) === producto.codigo);
        if (!existeEnOC && !esComodin) {
          message.warning(`El producto ${producto.codigo} no pertenece a la orden de compra ni es un producto comodín`);
          return;
        }
        const yaAgregado = detalles.some((d) => d.codigo === producto.codigo);
        if (yaAgregado) {
          message.warning(`El producto ${producto.codigo} ya está agregado al detalle`);
          return;
        }
      }
      setDetalles((prev) => [
        {
          ...filaVacia(),
          id: -(prev.length + 1),
          codigo: producto.codigo,
          articulo: producto.articulo,
          referencia: producto.referencia || '',
          costo: producto.costo || 0,
          cantidad: 1,
          familia: producto.familia,
          medida: producto.medida || { nombre: '', codigo: '', factor: 1, idExterno: 0 },
          impuesto: producto.impuesto,
          porcentajeImpuesto: producto.impuesto?.porcentaje ?? 0,
        },
        ...prev,
      ]);
    };

    const handleScannerProducto = (producto: any) => {
      // Si hay OC vinculada, validar que el producto pertenezca a la OC o sea comodín
      if (ocDetallesData.length > 0) {
        const existeEnOC = ocDetallesData.some((d: any) => d.codigo === producto.codigo);
        const esComodin = comodines.some((d: any) => (d.codigo || d.idExterno) === producto.codigo);
        if (!existeEnOC && !esComodin) {
          message.warning(`El código ${producto.codigo} no pertenece a la orden de compra ni es un producto comodín`);
          return;
        }
        const yaAgregado = detalles.some((d) => d.codigo === producto.codigo);
        if (yaAgregado) {
          message.warning(`El producto ${producto.codigo} ya está agregado al detalle`);
          return;
        }
      }
      setDetalles((prev) => [
        {
          ...filaVacia(),
          id: -(prev.length + 1),
          codigo: producto.codigo,
          articulo: producto.articulo,
          referencia: producto.referencia || '',
          costo: producto.costo || 0,
          cantidad: producto.cantidad || 1,
          familia: producto.familia,
          medida: producto.medida || { nombre: '', codigo: '', factor: 1, idExterno: 0 },
          impuesto: producto.impuesto,
          porcentajeImpuesto: producto.impuesto?.porcentaje ?? 0,
        },
        ...prev,
      ]);
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

  const handleToggleVerificar = (id: number) => {
    setVerificados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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
          const disponible = ((ocDetalle.cantidad + (ocDetalle.cantidadBonificable || 0)) - (ocDetalle.cantidadRecibida || 0));
          if ((Number(value)) > (disponible) && !ocDetalle.pesado) {
            message.warning(`La cantidad disponible en la OC es ${disponible}. Se ajustará automáticamente.`);
            value = disponible;
          }
        }
      }
    }

    setDetalles((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        if (field === 'descuento') {
          // Modo pesos: calcular porcentaje desde el valor en pesos
          const subTotal = (d.cantidad || 0) * (d.costo || 0);
          const pctCalculado = subTotal > 0 ? Math.round((Number(value) / subTotal) * 100 * 100) / 100 : 0;
          const updated = { ...d, descuento: Number(value), porcentajeDescuento: pctCalculado };
          return calcularFila(updated);
        }
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

  // asientoColumns reemplazado por AsientosContableTable compartido

  const handleRefresh = useCallback(() => {
    if (mode === 'crear') return;
    if (!id) return;
    setLoadingError(false);
    setLoading(true);
    entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setDetalles((res.detalles || []).map((d: DetalleEntradaAlmacenDTO) => calcularFila(d)));
        setSelectedConcepto(res.concepto || null);
        setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
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
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, form, mode]);

  if (loading) return <LoadingSpinner mensaje="Cargando documento..." />;

  // ===== Estado y titulo =====
  const estadoInfo = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Borrador', color: 'default' };




  const sinOC = ocDetallesData.length === 0;

  // ===== Grid de detalles editable (responsive) =====
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
      render: (_: any, record: DetalleEntradaAlmacenDTO) => (
        <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{record.codigo || '-'}</span>
            {(() => {
              const verificado = verificados.has(record.id);
              const fechaVencida = record.fechaVencimiento ? new Date(record.fechaVencimiento) < new Date() : false;
              const tieneCoincidencia = ocDetallesData.some((d: DetalleOrdenCompraVistaDTO) =>
                d.codigo === record.codigo
                && (Math.abs(Number(d.costo) - Number(record.costo)) <= 1 || Number(record.cantidadBonificable) !== 0)
                && Number(d.medida?.factor || 1) === Number(record.medida?.factor || 1)
                && !d.nota?.trim()
              );
              const ocMatch = ocDetallesData.length > 0
                && (tieneCoincidencia || Number(record.cantidadBonificable) > 0)
                && (!record.tieneVencimiento || record.fechaVencimiento)
                && !fechaVencida;

              const SKY_BLUE = '#4fc3f7';

              if (ocMatch && verificado) {
                return (
                  <Tooltip title="Coincide con OC · Verificado">
                    <CheckCircleFilled style={{ color: '#34c38f', fontSize: 14 }} />
                  </Tooltip>
                );
              }

              if (ocMatch) {
                return <Tooltip title="Coincide con OC"><CheckCircleOutlined style={{ color: '#34c38f', fontSize: 12 }} /></Tooltip>;
              }

              if (verificado) {
                return <Tooltip title="Verificado manualmente"><CheckCircleOutlined style={{ color: SKY_BLUE, fontSize: 12 }} /></Tooltip>;
              }

              if (ocDetallesData.length === 0) return null;

              let motivo = 'No coincide con la OC';
              const detalleOC = ocDetallesData.find((d: DetalleOrdenCompraVistaDTO) => d.codigo === record.codigo);
              if (!detalleOC) {
                motivo = 'Código no encontrado en la OC';
              } else if (record.tieneVencimiento && !record.fechaVencimiento) {
                motivo = 'Requiere fecha de vencimiento';
              } else if (record.fechaVencimiento && new Date(record.fechaVencimiento) < new Date()) {
                motivo = 'Fecha de vencimiento vencida';
              } else if (detalleOC.nota?.trim()) {
                motivo = `OC tiene nota: ${detalleOC.nota}`;
              } else if (Number(detalleOC.medida?.factor || 1) !== Number(record.medida?.factor || 1)) {
                motivo = `Factor OC: ${detalleOC.medida?.factor || 1} | ENP: ${record.medida?.factor || 1}`;
              } else if (Number(record.cantidadBonificable) === 0 && Math.abs(Number(detalleOC.costo) - Number(record.costo)) > 1) {
                motivo = `Costo OC: ${formatNumber(detalleOC.costo)} | ENP: ${formatNumber(record.costo)}`;
              }
              return (
                <Tooltip title={motivo}>
                  <CloseCircleOutlined style={{ color: '#d9d9d9', fontSize: 12 }} />
                </Tooltip>
              );
            })()}
          </div>
          {record.referencia && (
            <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, marginTop: 'auto' }}>
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
      render: (_: any, record: DetalleEntradaAlmacenDTO) => {
        return (
          <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ flex: 1 }}>{toTitleCase(record.articulo || '')}</span>
            </div>
            <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
              {record.familia?.nombre ? <Tag style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>{toTitleCase(record.familia.nombre)}</Tag> : null}
              {record.fechaVencimiento && <span>V: {formatDate(record.fechaVencimiento)}</span>}
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
      shouldCellUpdate: (record: DetalleEntradaAlmacenDTO, prevRecord: DetalleEntradaAlmacenDTO) =>
        record.cantidad !== prevRecord.cantidad || record.medida?.nombre !== prevRecord.medida?.nombre,
      render: (_: any, _record: DetalleEntradaAlmacenDTO, idx: number) => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }}>
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            styles={{ input: { textAlign: 'right' } }}
            min={0}
            step={0.01}
            precision={2}
            controls={false}
            defaultValue={detalles[idx]?.cantidad}
            onChange={(val) => {
              editValuesRef.current[`${detalles[idx].id}_cantidad`] = val || 0;
            }}
            onBlur={() => {
              const val = editValuesRef.current[`${detalles[idx].id}_cantidad`] ?? detalles[idx]?.cantidad;
              handleDetalleCalculate(detalles[idx].id, 'cantidad', val);
            }}
            onPressEnter={() => {
              const val = editValuesRef.current[`${detalles[idx].id}_cantidad`] ?? detalles[idx]?.cantidad;
              handleDetalleCalculate(detalles[idx].id, 'cantidad', val);
            }}
          />
          <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 'auto', minHeight: 18 }}>
            {!sinOC && detalles[idx]?.medida?.nombre ? toTitleCase(detalles[idx].medida.nombre) : ''}
          </div>
        </div>
      ),
    },
    ...(sinOC ? [{
      title: 'Medida',
      key: 'medida',
      width: 160,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: DetalleEntradaAlmacenDTO, _idx: number) => {
        const curId = record.medida?.idExterno;
        const hasMatch = medidasCache.some((m) => m.idExterno === curId);
        return (
        <Select
          size="small"
          style={{ width: '100%' }}
          key={medidasCache.length}
          value={hasMatch ? curId : undefined}
          onChange={(idExterno) => {
            const medida = medidasCache.find((m) => m.idExterno === idExterno);
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
          {medidasCache.map((m) => (
            <Select.Option key={m.idExterno ?? 0} value={m.idExterno}>
              {toTitleCase(m.nombre || '')}
            </Select.Option>
          ))}
        </Select>
      );
      },
    }] : []),
    {
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      width: 130,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
      shouldCellUpdate: (record: DetalleEntradaAlmacenDTO, prevRecord: DetalleEntradaAlmacenDTO) => record.costo !== prevRecord.costo || record.porcentajeDescuento !== prevRecord.porcentajeDescuento || record.cantidad !== prevRecord.cantidad || record.medida?.factor !== prevRecord.medida?.factor,
      render: (_: any, record: DetalleEntradaAlmacenDTO, idx: number) => {
        const costoBase = Number(detalles[idx]?.costo) || 0;
        const pctDesc = Number(detalles[idx]?.porcentajeDescuento) || 0;
        const factor = Number(detalles[idx]?.medida?.factor) || 1;
        const costoConDescuento = costoBase - ((costoBase * pctDesc) / 100);
        const costoUnitario = costoConDescuento / factor;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }}>
            <InputNumber
              size="small"
              style={{ width: '100%' }}
              styles={{ input: { textAlign: 'right' } }}
              min={0}
              step={0.01}
              precision={2}
              controls={false}
              defaultValue={detalles[idx]?.costo}
              onChange={(val) => {
                editValuesRef.current[`${detalles[idx].id}_costo`] = val || 0;
              }}
              onBlur={() => {
                const val = editValuesRef.current[`${detalles[idx].id}_costo`] ?? detalles[idx]?.costo;
                handleDetalleCalculate(detalles[idx].id, 'costo', val);
              }}
              onPressEnter={() => {
                const val = editValuesRef.current[`${detalles[idx].id}_costo`] ?? detalles[idx]?.costo;
                handleDetalleCalculate(detalles[idx].id, 'costo', val);
              }}
            />
            <div style={{ fontSize: 11, lineHeight: 1.5, color: '#999', marginTop: 'auto' }}>
              {formatNumber(costoUnitario)} × {factor}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Descuento',
      key: 'descuento',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, _record: DetalleEntradaAlmacenDTO, idx: number) =>
        modoDescuento === 'porcentaje' ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }}>
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                key={`pct_${detalles[idx].id}_${modoDescuento}`}
                size="small"
                style={{ width: '100%' }}
                styles={{ input: { textAlign: 'right' } }}
                min={0}
                max={100}
                step={0.01}
                precision={2}
                controls={false}
                defaultValue={detalles[idx]?.porcentajeDescuento}
                onChange={(val) => {
                  editValuesRef.current[`${detalles[idx].id}_descuento`] = val || 0;
                }}
                onBlur={() => {
                  const val = editValuesRef.current[`${detalles[idx].id}_descuento`] ?? detalles[idx]?.porcentajeDescuento;
                  handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', val);
                }}
                onPressEnter={() => {
                  const val = editValuesRef.current[`${detalles[idx].id}_descuento`] ?? detalles[idx]?.porcentajeDescuento;
                  handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', val);
                }}
              />
              <span onClick={() => setModoDescuento('pesos')} style={{ cursor: 'pointer', display: 'inline-flex' }}>
                <Input size="small" placeholder="%" disabled style={{ width: 36, textAlign: 'center', borderLeft: 'none', pointerEvents: 'none' }} />
              </span>
            </Space.Compact>
            <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 'auto' }}>
              {formatNumber(detalles[idx]?.descuento || 0)}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }}>
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                key={`pesos_${detalles[idx].id}_${modoDescuento}`}
                size="small"
                style={{ width: '100%' }}
                styles={{ input: { textAlign: 'right' } }}
                min={0}
                step={0.01}
                precision={2}
                controls={false}
                defaultValue={detalles[idx]?.descuento}
                onChange={(val) => {
                  editValuesRef.current[`${detalles[idx].id}_descuento_pesos`] = val || 0;
                }}
                onBlur={() => {
                  const val = editValuesRef.current[`${detalles[idx].id}_descuento_pesos`] ?? detalles[idx]?.descuento;
                  handleDetalleCalculate(detalles[idx].id, 'descuento', val);
                }}
                onPressEnter={() => {
                  const val = editValuesRef.current[`${detalles[idx].id}_descuento_pesos`] ?? detalles[idx]?.descuento;
                  handleDetalleCalculate(detalles[idx].id, 'descuento', val);
                }}
              />
              <span onClick={() => setModoDescuento('porcentaje')} style={{ cursor: 'pointer', display: 'inline-flex' }}>
                <Input size="small" placeholder="$" disabled style={{ width: 36, textAlign: 'center', borderLeft: 'none', pointerEvents: 'none' }} />
              </span>
            </Space.Compact>
            <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 'auto' }}>
              {formatNumber(detalles[idx]?.porcentajeDescuento || 0)}%
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
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: DetalleEntradaAlmacenDTO) => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Text>{formatNumber(record.subTotal || 0)}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5, marginTop: 'auto' }}>&nbsp;</div>
        </div>
      ),
    },
    {
      title: 'Impuestos',
      key: 'impuestos',
      width: 140,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: DetalleEntradaAlmacenDTO) => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div>{formatNumber(record.impuestos || 0)}</div>
          <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 'auto', minHeight: 18 }}>
            {record.impuesto?.nombre ? toTitleCase(record.impuesto.nombre) : ''}
          </div>
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
      render: (_: any, record: DetalleEntradaAlmacenDTO) => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Text strong>{formatNumber(record.total || 0)}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5, marginTop: 'auto' }}>&nbsp;</div>
        </div>
      ),
    },
    {
      title: '',
      key: 'devolver',
      width: 50,
      responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => {
        const yaDevuelto = detallesDevolucion
          .filter((d) => d.idExterno === record.id)
          .reduce((s, d) => s + (d.cantidad || 0), 0);
        const disponible = (record.cantidad || 0) - yaDevuelto;
        const tieneDevolucion = yaDevuelto > 0;

        return (
          <Tooltip title={disponible <= 0 ? 'Sin cantidad disponible' : (tieneDevolucion ? 'Modificar cantidad a devolver' : 'Agregar a devolución')}>
            <Button
              type="text"
              size="small"
              icon={<RollbackOutlined />}
              style={{ color: tieneDevolucion ? '#556ee6' : '#8c8c8c' }}
              disabled={disponible <= 0}
              onClick={() => {
                setDetalleDevolucionActivo(record);
                setCantidadDevolucionInput(0);
                setModalDevolucionOpen(true);
              }}
            />
          </Tooltip>
        );
      },
    },
    {
      title: '',
      key: 'acciones',
      width: 50,
      render: (_: any, record: DetalleEntradaAlmacenDTO, idx: number) => {
        const verificado = verificados.has(record.id);
        const items = [
          {
            key: 'eliminar',
            label: 'Eliminar',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleEliminarFila(record.id),
          },
        ];

        items.unshift({
          key: 'vencimiento',
          label: record.fechaVencimiento ? `Venc: ${formatDate(record.fechaVencimiento)}` : 'Fecha Vencimiento',
          icon: <CalendarOutlined />,
          danger: false,
          onClick: () => setFechaVencimientoModal({ open: true, detalleId: record.id }),
        });

        items.unshift({
          key: 'verificar',
          label: verificado ? 'Desverificar' : 'Verificar',
          icon: <CheckCircleOutlined style={{ color: verificado ? '#4fc3f7' : undefined }} />,
          danger: false,
          onClick: () => handleToggleVerificar(record.id),
        });

        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  // ===== Encabezado del formulario =====
  // ===== Modal de cantidad a devolver (DVC) =====
  const renderModalDevolucion = () => {
    if (!detalleDevolucionActivo) return null;
    const record = detalleDevolucionActivo;
    const yaDevuelto = detallesDevolucion
      .filter((d) => d.idExterno === record.id)
      .reduce((s, d) => s + (d.cantidad || 0), 0);
    const disponible = (record.cantidad || 0) - yaDevuelto;

    return (
      <Modal
        title="Devolver producto"
        open={modalDevolucionOpen}
        onCancel={() => { setModalDevolucionOpen(false); setDetalleDevolucionActivo(null); }}
        width={420}
        destroyOnClose
        maskClosable={false}
        footer={
          <Space>
            <Button onClick={() => { setModalDevolucionOpen(false); setDetalleDevolucionActivo(null); }}>Cancelar</Button>
            <Button
              type="primary"
              icon={<RollbackOutlined />}
              disabled={!cantidadDevolucionInput || cantidadDevolucionInput <= 0 || cantidadDevolucionInput > disponible}
              onClick={() => {
                const nuevoDetalle: any = {
                  id: -(detallesDevolucion.length + 1),
                  idExterno: record.id,
                  codigo: record.codigo,
                  articulo: record.articulo,
                  referencia: record.referencia || '',
                  cantidad: cantidadDevolucionInput,
                  costo: record.costo || 0,
                  subTotal: (cantidadDevolucionInput * (record.costo || 0)),
                  porcentajeDescuento: record.porcentajeDescuento || 0,
                  descuento: 0,
                  impuesto: record.impuesto,
                  impuestos: 0,
                  total: (cantidadDevolucionInput * (record.costo || 0)),
                  familia: record.familia,
                  medida: record.medida,
                  tipoArticulo: record.tipoArticulo || 'Producto',
                  nota: '',
                };
                setDetallesDevolucion((prev) => [...prev, nuevoDetalle]);
                setModalDevolucionOpen(false);
                setDetalleDevolucionActivo(null);
                message.success('Producto agregado a la lista de devolución');
              }}
            >
              Agregar a devolución
            </Button>
          </Space>
        }
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div>
            <Typography.Text strong style={{ fontSize: 14 }}>{record.codigo}</Typography.Text>
            <br />
            {record.referencia && (
              <Typography.Text className="paces-text-secondary" style={{ fontSize: 12 }}>
                {record.referencia}
              </Typography.Text>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <Typography.Text style={{ fontSize: 13 }}>{toTitleCase(record.articulo || '')}</Typography.Text>
            <br />
            {record.familia?.nombre && (
              <Tag style={{ fontSize: 11 }}>{toTitleCase(record.familia.nombre)}</Tag>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Typography.Text className="paces-text-secondary">Cantidad recibida:</Typography.Text>
            <Typography.Text>{formatNumber(record.cantidad || 0)}</Typography.Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Typography.Text className="paces-text-secondary">Ya devuelto:</Typography.Text>
            <Typography.Text style={yaDevuelto > 0 ? { color: '#ff4d4f' } : {}}>{formatNumber(yaDevuelto)}</Typography.Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography.Text className="paces-text-secondary">Disponible:</Typography.Text>
            <Typography.Text style={{ color: '#34c38f', fontWeight: 600, fontSize: 14 }}>{formatNumber(disponible)}</Typography.Text>
          </div>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <div style={{ marginBottom: 4 }}>
          <Typography.Text strong>Cantidad a devolver:</Typography.Text>
        </div>
        <InputNumber
          autoFocus
          style={{ width: '100%' }}
          min={0.01}
          max={disponible}
          step={0.01}
          precision={2}
          value={cantidadDevolucionInput || undefined}
          onChange={(val) => setCantidadDevolucionInput(val || 0)}
          onPressEnter={() => {
            if (cantidadDevolucionInput > 0 && cantidadDevolucionInput <= disponible) {
              const nuevoDetalle: any = {
                id: -(detallesDevolucion.length + 1),
                idExterno: record.id,
                codigo: record.codigo,
                articulo: record.articulo,
                referencia: record.referencia || '',
                cantidad: cantidadDevolucionInput,
                costo: record.costo || 0,
                subTotal: (cantidadDevolucionInput * (record.costo || 0)),
                porcentajeDescuento: record.porcentajeDescuento || 0,
                descuento: 0,
                impuesto: record.impuesto,
                impuestos: 0,
                total: (cantidadDevolucionInput * (record.costo || 0)),
                familia: record.familia,
                medida: record.medida,
                tipoArticulo: record.tipoArticulo || 'Producto',
                nota: '',
              };
              setDetallesDevolucion((prev) => [...prev, nuevoDetalle]);
              setModalDevolucionOpen(false);
              setDetalleDevolucionActivo(null);
              message.success('Producto agregado a la lista de devolución');
            }
          }}
          placeholder="0.00"
        />
        {cantidadDevolucionInput > disponible && (
          <Alert
            type="warning"
            showIcon
            style={{ marginTop: 8 }}
            message={`La cantidad no puede superar el disponible (${formatNumber(disponible)})`}
          />
        )}
      </Modal>
    );
  };

  const renderEncabezado = () => {
    // ncfValue, refValue y tasaValue vienen del watcher reactivo (component-level Form.useWatch)
    return (
    <Card className="paces-card" size="small" title="Datos Generales" extra={<EstadoTag estado={estado} periodo={data?.periodo} />} style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={24} xxl={18}>
          <Form form={form} layout="vertical" size="middle" style={{ paddingTop: 24 }}>
            <Row gutter={[16, 24]}>
              {/* Fila 1: OrdenCompra + Concepto */}
              <Col xs={24} sm={12} lg={9}>
                <div ref={ordenCompraRef}>
                  <FloatingField label="Orden Compra" externalValue={ordenCompraNoDoc}>
                    <Input
                      placeholder=" "
                      value={ordenCompraNoDoc}
                      readOnly
                      suffix={<SearchOutlined style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }} />}
                      onClick={handleBuscarOC}
                    />
                  </FloatingField>
                </div>
                <Form.Item name="ordenCompra" hidden><Input /></Form.Item>
              </Col>

          <Col xs={24} sm={12} lg={15}>
            <div ref={conceptoRef}>
              <FloatingField label="Concepto" required externalValue={conceptoSearchText}>
                <Input
                  placeholder=" "
                  value={conceptoSearchText}
                  readOnly
                  suffix={<SearchOutlined style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }} />}
                  onClick={handleConceptoSearchClick}
                />
              </FloatingField>
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

          {/* Fila 4: Campos rápidos (NCF, Referencia, Tasa) */}
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
                  <Tag style={{ cursor: 'pointer', fontSize: 14, padding: '6px 16px' }} onClick={() => openFieldEditor('referencia')}>
                    Ref: {refValue} <EditOutlined />
                  </Tag>
                ) : (
                  <Tag style={{ cursor: 'pointer', fontSize: 14, padding: '6px 16px' }} onClick={() => openFieldEditor('referencia')}>
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
                  <Tag style={{ cursor: 'pointer', fontSize: 14, padding: '6px 16px' }} onClick={() => openFieldEditor('tasa')}>
                    Tasa: {tasaValue} <EditOutlined />
                  </Tag>
                ) : (
                  <Tag style={{ cursor: 'pointer', fontSize: 14, padding: '6px 16px' }} onClick={() => openFieldEditor('tasa')}>
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
        </Col>
        <Col xs={24} xxl={6}>
          <div style={{ marginTop: 24 }}>
            <TotalesCard
              subTotal={totales.subTotal}
              descuento={totales.descuento}
              impuestos={totales.impuestos}
              total={totales.total}
              hideTitle
              monedaSimbolo={data?.moneda?.simbolo || selectedConcepto?.moneda?.simbolo || 'RD$'}
              monedaNombre={data?.moneda?.nombre || selectedConcepto?.moneda?.nombre || 'Peso Dominicano'}
              tasa={tasaValue ?? data?.tasa ?? 1}
            />
          </div>
        </Col>
      </Row>
    </Card>
    );
  };

  return (
    <div>
      <FormularioToolbar
        saving={saving}
        estado={mode === 'editar' ? estado : undefined}
        periodo={data?.periodo}
        onGuardar={handleGuardar}
        onCancelar={handleCancelar}
      />

      {loadingError && (
        <Alert
          message="Error al cargar formulario de entrada de almacén"
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
        sucursal={data?.concepto?.sucursalDestino?.id ?? data?.sucursal?.id ?? sucursalActiva}
        documento="ENP"
      />

      <BuscarOrdenCompraModal
        open={ordenCompraModalOpen}
        onClose={() => setOrdenCompraModalOpen(false)}
        onSelect={handleOCSelect}
        fetchOrdenes={async () => {
          const hoy = new Date();
          const hace60 = new Date();
          hace60.setDate(hace60.getDate() - 60);
          const formatDateParam = (d: Date): string => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            const ss = String(d.getSeconds()).padStart(2, '0');
            return `${y}${m}${dd}${hh}${mm}${ss}`;
          };
          const params: any = {
            cantidad: 50,
            desde: formatDateParam(hace60),
            hasta: formatDateParam(hoy),
          };
          if (selectedEntidad?.codigo?.trim()) {
            params.suplidor = selectedEntidad.codigo.trim();
          }
          return await ordenCompraApi.obtenerResumido(Sucursal.Compra, sucursalActiva, params);
        }}
      />
      <BuscarProductoModal
        open={productoModalOpen}
        onClose={() => setProductoModalOpen(false)}
        onSelect={handleSeleccionarProducto}
        mode="inventario"
      />
      <ScannerModal
        open={scannerModalOpen}
        onClose={() => setScannerModalOpen(false)}
        onSelect={handleScannerProducto}
      />

      <ProductosOrigenModal
        open={ocProductosModalOpen}
        onClose={() => { setOcProductoSearch(''); setOcProductosModalOpen(false); }}
        title="Agregar producto"
        sourceLabel="OC"
        sourceProducts={ocDetallesData}
        comodines={comodines}
        addedCodes={detalles.map((d) => d.codigo)}
        sourceColumns={[
          { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
          { title: 'Artículo', dataIndex: 'articulo', key: 'articulo', ellipsis: true },
          { title: 'Cant. OC', dataIndex: 'cantidad', key: 'cantidad', width: 90, align: 'right' as const },
          { title: 'Costo', dataIndex: 'costo', key: 'costo', width: 100, align: 'right' as const,
            render: (v: number) => formatNumber(v) },
        ]}
        comodinColumns={[
          { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
          { title: 'Artículo', dataIndex: 'nombre', key: 'nombre', ellipsis: true },
          { title: 'Costo', dataIndex: 'ultimoCosto', key: 'ultimoCosto', width: 100, align: 'right' as const,
            render: (v: number) => formatNumber(v || 0) },
        ]}
        onAddSourceProduct={(record) => {
          setDetalles((prev) => [
            calcularFila({
              ...filaVacia(),
              id: -(prev.length + 1),
              codigo: record.codigo,
              articulo: record.articulo,
              referencia: record.referencia || '',
              costo: record.costo || 0,
              cantidad: record.cantidad || 0,
              porcentajeDescuento: record.porcentajeDescuento || 0,
              familia: record.familia,
              medida: record.medida || { nombre: '', codigo: '', factor: 1, idExterno: 0 },
              impuesto: record.impuesto,
              porcentajeImpuesto: record.impuesto?.porcentaje ?? 0,
              cantidadBonificable: record.cantidadBonificable || 0,
            }),
            ...prev,
          ]);
          setOcProductoSearch('');
        }}
        onAddComodin={(record) => {
          setDetalles((prev) => [
            calcularFila({
              ...filaVacia(),
              id: -(prev.length + 1),
              codigo: record.codigo || record.idExterno,
              articulo: record.nombre,
              referencia: record.referencia || record.upc || '',
              costo: record.ultimoCosto || 0,
              cantidad: 1,
              familia: record.familia ? { nombre: record.familia.nombre, idExterno: record.familia.idExterno } : undefined,
              medida: record.unidadMedida || { nombre: '', codigo: '', factor: 1, idExterno: 0 },
              impuesto: record.impuestos?.[0]?.impuesto,
              porcentajeImpuesto: record.impuestos?.[0]?.impuesto?.porcentaje ?? 0,
            }),
            ...prev,
          ]);
        }}
      />

      {isLarge ? (
        /* === DESKTOP LAYOUT (>= lg) === */
        <Row gutter={16}>
          <Col xl={24}>
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
                          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                            if (selectedOC) {
                              setOcProductosModalOpen(true);
                            } else {
                              setProductoModalOpen(true);
                            }
                          }}>
                            Agregar producto
                          </Button>
                          <Button icon={<BarcodeOutlined />} onClick={() => setScannerModalOpen(true)} />
                          <Button icon={<PercentageOutlined />} onClick={handleDescuentoGlobal}>
                            Dto. global
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
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(event) => { setActiveId(Number(event.active.id)); }} onDragEnd={handleDragEnd}>
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
                key: 'devoluciones',
                  label: (
                    <span>
                      Devoluciones
                      {detallesDevolucion.length > 0 && (
                        <Badge count={detallesDevolucion.length}
                          style={{ marginLeft: 6, backgroundColor: '#556ee6' }} />
                      )}
                    </span>
                  ),
                  children: (
                    <>
                      {detallesDevolucion.length === 0 ? (
                        <Empty
                          image={<RollbackOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />}
                          imageStyle={{ height: 40 }}
                          description={
                            <span>
                              Sin productos para devolver<br />
                              <Typography.Text className="paces-text-secondary" style={{ fontSize: 12 }}>
                                Haga clic en el ícono ↩ de un detalle para agregar productos
                              </Typography.Text>
                            </span>
                          }
                        />
                      ) : (
                        <>
                          <Alert
                            type="info"
                            showIcon
                            style={{ marginBottom: 12 }}
                            message="Al guardar este documento, se creará automáticamente una Devolución de Compra (DVC) con los productos listados."
                          />
                          <Table
                            dataSource={detallesDevolucion}
                            rowKey="id"
                            size="small"
                            pagination={false}
                            scroll={{ x: 700 }}
                            columns={[
                              {
                                title: 'Código',
                                key: 'codigo',
                                width: 120,
                                fixed: 'left',
                                onCell: () => ({ style: { verticalAlign: 'top' } }),
                                render: (_: any, record: any) => (
                                  <div>
                                    <div>{record.codigo}</div>
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
                                render: (_: any, record: any) => (
                                  <div>
                                    <div>{toTitleCase(record.articulo || '')}</div>
                                    {record.familia?.nombre && (
                                      <Tag style={{ fontSize: 11 }}>{toTitleCase(record.familia.nombre)}</Tag>
                                    )}
                                  </div>
                                ),
                              },
                              {
                                title: 'Cant. a devolver',
                                key: 'cantidad',
                                width: 110,
                                align: 'right',
                                onCell: () => ({ style: { verticalAlign: 'top' } }),
                                render: (_: any, record: any) => (
                                  <div>
                                    <div>{formatNumber(record.cantidad || 0)}</div>
                                    <div className="paces-text-secondary" style={{ fontSize: 11 }}>
                                      {record.medida?.nombre || ''}
                                    </div>
                                  </div>
                                ),
                              },
                              {
                                title: 'Costo',
                                key: 'costo',
                                width: 110,
                                align: 'right',
                                responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
                                render: (_: any, record: any) => formatNumber(record.costo || 0),
                              },
                              {
                                title: 'Total',
                                key: 'total',
                                width: 110,
                                align: 'right',
                                render: (_: any, record: any) => (
                                  <Typography.Text strong>{formatNumber(record.total || 0)}</Typography.Text>
                                ),
                              },
                              {
                                title: '',
                                key: 'acciones',
                                width: 50,
                                render: (_: any, record: any) => (
                                  <Tooltip title="Quitar de la lista">
                                    <Button
                                      type="text"
                                      danger
                                      size="small"
                                      icon={<DeleteOutlined />}
                                      onClick={() => setDetallesDevolucion((prev) => prev.filter((d) => d.id !== record.id))}
                                    />
                                  </Tooltip>
                                ),
                              },
                            ]}
                            footer={() => (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                <Typography.Text className="paces-text-secondary">Total estimado a devolver:</Typography.Text>
                                <Typography.Text strong style={{ fontSize: 14 }}>
                                  {formatCurrency(detallesDevolucion.reduce((s: number, d: any) => s + (d.total || 0), 0))}
                                </Typography.Text>
                              </div>
                            )}
                          />
                        </>
                      )}
                    </>
                  ),
                },
                {
                  key: 'asientos',
                  label: `Asientos (${data?.asientos?.length || 0})`,
                  children: (
                    <AsientosContableTable asientos={data?.asientos || []} scroll={{ x: 800 }} />
                  ),
                },
                {
                  key: 'historial',
                  label: `Historial (${data?.logs?.length || 0})`,
                  children: (
                    <LogTable dataSource={data?.logs || []} scroll={{ x: 800 }} />
                  ),
                },
              ]}
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
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                          if (selectedOC) {
                            setOcProductosModalOpen(true);
                          } else {
                            setProductoModalOpen(true);
                          }
                        }}>
                          Agregar producto
                        </Button>
                        <Button icon={<BarcodeOutlined />} onClick={() => setScannerModalOpen(true)} />
                        <Button icon={<PercentageOutlined />} onClick={handleDescuentoGlobal}>
                          Dto. global
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
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(event) => { setActiveId(Number(event.active.id)); }} onDragEnd={handleDragEnd}>
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
                key: 'devoluciones',
                label: (
                  <span>
                    Devoluciones
                    {detallesDevolucion.length > 0 && (
                      <Badge count={detallesDevolucion.length}
                        style={{ marginLeft: 6, backgroundColor: '#556ee6' }} />
                    )}
                  </span>
                ),
                children: (
                  <>
                    {detallesDevolucion.length === 0 ? (
                      <Empty
                        image={<RollbackOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />}
                        imageStyle={{ height: 40 }}
                        description={
                          <span>
                            Sin productos para devolver<br />
                            <Typography.Text className="paces-text-secondary" style={{ fontSize: 12 }}>
                              Haga clic en el ícono ↩ de un detalle para agregar productos
                            </Typography.Text>
                          </span>
                        }
                      />
                    ) : (
                      <>
                        <Alert
                          type="info"
                          showIcon
                          style={{ marginBottom: 12 }}
                          message="Al guardar este documento, se creará automáticamente una Devolución de Compra (DVC) con los productos listados."
                        />
                        <Table
                          dataSource={detallesDevolucion}
                          rowKey="id"
                          size="small"
                          pagination={false}
                          scroll={{ x: 700 }}
                          columns={[
                            {
                              title: 'Código',
                              key: 'codigo',
                              width: 120,
                              fixed: 'left',
                              onCell: () => ({ style: { verticalAlign: 'top' } }),
                              render: (_: any, record: any) => (
                                <div>
                                  <div>{record.codigo}</div>
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
                              render: (_: any, record: any) => (
                                <div>
                                  <div>{toTitleCase(record.articulo || '')}</div>
                                  {record.familia?.nombre && (
                                    <Tag style={{ fontSize: 11 }}>{toTitleCase(record.familia.nombre)}</Tag>
                                  )}
                                </div>
                              ),
                            },
                            {
                              title: 'Cant. a devolver',
                              key: 'cantidad',
                              width: 110,
                              align: 'right',
                              onCell: () => ({ style: { verticalAlign: 'top' } }),
                              render: (_: any, record: any) => (
                                <div>
                                  <div>{formatNumber(record.cantidad || 0)}</div>
                                  <div className="paces-text-secondary" style={{ fontSize: 11 }}>
                                    {record.medida?.nombre || ''}
                                  </div>
                                </div>
                              ),
                            },
                            {
                              title: 'Costo',
                              key: 'costo',
                              width: 110,
                              align: 'right',
                              responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
                              render: (_: any, record: any) => formatNumber(record.costo || 0),
                            },
                            {
                              title: 'Total',
                              key: 'total',
                              width: 110,
                              align: 'right',
                              render: (_: any, record: any) => (
                                <Typography.Text strong>{formatNumber(record.total || 0)}</Typography.Text>
                              ),
                            },
                            {
                              title: '',
                              key: 'acciones',
                              width: 50,
                              render: (_: any, record: any) => (
                                <Tooltip title="Quitar de la lista">
                                  <Button
                                    type="text"
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    onClick={() => setDetallesDevolucion((prev) => prev.filter((d) => d.id !== record.id))}
                                  />
                                </Tooltip>
                              ),
                            },
                          ]}
                          footer={() => (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                              <Typography.Text className="paces-text-secondary">Total estimado a devolver:</Typography.Text>
                              <Typography.Text strong style={{ fontSize: 14 }}>
                                {formatCurrency(detallesDevolucion.reduce((s: number, d: any) => s + (d.total || 0), 0))}
                              </Typography.Text>
                            </div>
                          )}
                        />
                      </>
                    )}
                  </>
                ),
              },
              {
                key: 'asientos',
                label: `Asientos (${data?.asientos?.length || 0})`,
                children: (
                  <AsientosContableTable asientos={data?.asientos || []} scroll={{ x: 800 }} />
                ),
              },
              {
                key: 'historial',
                label: `Historial (${data?.logs?.length || 0})`,
                children: (
                  <LogTable dataSource={data?.logs || []} scroll={{ x: 800 }} />
                ),
              },
            ]}
          />

        </div>
      )}

      {renderModalDevolucion()}

      {/* Guía paso a paso (solo en modo crear o editar borrador) */}
      {(mode === 'crear' || esBorrador) && (
        <EntradaAlmacenGuide
          mode={mode}
          concepto={selectedConcepto}
          suplidor={selectedEntidad}
          ordenCompra={selectedOC}
          almacen={selectedAlmacen}
          detallesCount={detalles.length}
          ncf={ncfValue}
          conceptoRef={conceptoRef}
          suplidorRef={suplidorRef}
          ordenCompraRef={ordenCompraRef}
          almacenRef={almacenRef}
          agregarFilaRef={agregarFilaRef}
          ncfRef={ncfRef}
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

