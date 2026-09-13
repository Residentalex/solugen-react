import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Table, Tabs, Tag, Button, Space, Row, Col, Grid, message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Dropdown, Divider, Alert, Badge, Empty, Tooltip, } from 'antd';
import { DeleteOutlined, PlusOutlined, SearchOutlined, ExclamationCircleOutlined, EditOutlined, MoreOutlined, CalendarOutlined, HolderOutlined, CheckCircleFilled, CheckCircleOutlined, CloseCircleOutlined, BarcodeOutlined, PercentageOutlined, RollbackOutlined, } from '@ant-design/icons';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { Sucursal } from '../../types/auth';
import { entradaAlmacenApi } from '../../api/entradaAlmacenApi';
import { devolucionCompraApi } from '../../api/devolucionCompraApi';
import { conceptosApi } from '../../api/conceptosApi';
import { ordenCompraApi } from '../../api/ordenCompraApi';
import { productoApi } from '../../api/productoApi';
import { parametrosApi } from '../../api/parametrosApi';
import { transaccionApi } from '../../api/transaccionApi';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import BuscarOrdenCompraModal from '../../components/BuscarOrdenCompraModal/BuscarOrdenCompraModal';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import EntradaAlmacenGuide from './EntradaAlmacenGuide';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import ModalFechaVencimiento from '../../components/ModalFechaVencimiento/ModalFechaVencimiento';
import ScannerModal from '../../components/ScannerModal/ScannerModal';
import ProductosOrigenModal from '../../components/ProductosOrigenModal/ProductosOrigenModal';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import CamposRestringidosAlert from '../../components/CamposRestringidosAlert';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { DragHandle, SortableRow, DragListenersContext } from '../../components/DragSortable';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';
import { useDocumentoConfig } from '../../hooks/useDocumentoConfig';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
const { Text } = Typography;
const { TextArea } = Input;
// ===== Cálculo de fila =====
// ===== Cálculo de fila =====
function calcularFila(fila) {
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
function filaVacia() {
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
const EntradaAlmacenFormulario = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const cloneData = location.state?.cloneData;
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const screens = Grid.useBreakpoint();
    const mode = id ? 'editar' : 'crear';
    const { screenCode, documentCode } = useScreenConfig('FENP');
    const monedaDefault = getMonedaSucursalActiva();
    const documentoConfig = useDocumentoConfig(sucursalActiva, documentCode);
    // ===== States =====
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState(null);
    const [detalles, setDetalles] = useState([]);
    const [entidadesCache, setEntidadesCache] = useState([]);
    const [almacenesCache, setAlmacenesCache] = useState([]);
    const [medidasCache, setMedidasCache] = useState([]);
    const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
    const [conceptoSearchText, setConceptoSearchText] = useState('');
    const [selectedConcepto, setSelectedConcepto] = useState(null);
    const [selectedEntidad, setSelectedEntidad] = useState(null);
    const [selectedAlmacen, setSelectedAlmacen] = useState(null);
    const [ordenCompraModalOpen, setOrdenCompraModalOpen] = useState(false);
    const [selectedOC, setSelectedOC] = useState(null);
    const [ocDetallesData, setOcDetallesData] = useState([]);
    const [ordenCompraNoDoc, setOrdenCompraNoDoc] = useState('');
    const [agregarFilaBloqueado, setAgregarFilaBloqueado] = useState(false);
    const [fechaVencimientoModal, setFechaVencimientoModal] = useState({ open: false, detalleId: 0 });
    const [detalleSearch, setDetalleSearch] = useState('');
    const [activeId, setActiveId] = useState(null);
    const [productoModalOpen, setProductoModalOpen] = useState(false);
    const [scannerModalOpen, setScannerModalOpen] = useState(false);
    const [ocProductosModalOpen, setOcProductosModalOpen] = useState(false);
    const [ocProductoSearch, setOcProductoSearch] = useState('');
    const [comodines, setComodines] = useState([]);
    const [fechaCierreContable, setFechaCierreContable] = useState(null);
    const [fechaCierreInventario, setFechaCierreInventario] = useState(null);
    const [modoDescuento, setModoDescuento] = useState('porcentaje');
    const [verificados, setVerificados] = useState(new Set());
    const [detallesDevolucion, setDetallesDevolucion] = useState([]);
    const [modalDevolucionOpen, setModalDevolucionOpen] = useState(false);
    const [detalleDevolucionActivo, setDetalleDevolucionActivo] = useState(null);
    const [cantidadDevolucionInput, setCantidadDevolucionInput] = useState(0);
    const editValuesRef = useRef({});
    const impuestosBackupRef = useRef(new Map());
    const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }));
    // ===== Detalles filtrados por búsqueda =====
    const detallesFiltrados = detalleSearch
        ? detalles.filter((d) => {
            const q = detalleSearch.toLowerCase();
            return ((d.codigo || '').toLowerCase().includes(q) ||
                (d.articulo || '').toLowerCase().includes(q) ||
                (d.referencia || '').toLowerCase().includes(q));
        })
        : detalles;
    // ===== Estado para campos rápidos (NCF, Referencia, Tasa) =====
    const [editingField, setEditingField] = useState(null);
    const editingOriginalValue = useRef('');
    const editingValueRef = useRef('');
    const fieldCloseHandledRef = useRef(false);
    const openFieldEditor = (field) => {
        const val = form.getFieldValue(field);
        const defaultVal = field === 'tasa' ? 1 : '';
        editingOriginalValue.current = val ?? defaultVal;
        editingValueRef.current = val ?? defaultVal;
        setEditingField(field);
        fieldCloseHandledRef.current = false;
    };
    const commitFieldEditor = () => {
        if (fieldCloseHandledRef.current)
            return;
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
                    icon: _jsx(ExclamationCircleOutlined, {}),
                    content: '¿Desea actualizar los costos en base a la nueva tasa?',
                    okText: 'Sí',
                    cancelText: 'No',
                    onOk: () => {
                        const tasaNueva = Number(newValue) || 1;
                        setDetalles((prev) => prev.map((d) => calcularFila({ ...d, costo: (d.costo || 0) / tasaNueva })));
                    },
                });
            }
        }
        setEditingField(null);
    };
    const cancelFieldEditor = () => {
        if (fieldCloseHandledRef.current)
            return;
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
    const conceptoRef = useRef(null);
    const suplidorRef = useRef(null);
    const ordenCompraRef = useRef(null);
    const almacenRef = useRef(null);
    const agregarFilaRef = useRef(null);
    const ncfRef = useRef(null);
    const isLarge = screens.xl ?? true;
    // ===== Determinar qué acciones mostrar según estado =====
    const estado = data?.estado ?? 0;
    const esCerrado = data?.periodo === 6;
    const esBorrador = estado === 0;
    const usuario = useAuthStore((s) => s.usuario);
    const permisoModificarAsientos = usuario?.permisosEspeciales?.some((p) => p.codigo === 'pe_modificar_asientos' && p.valor === true) ?? false;
    const [generandoAsientos, setGenerandoAsientos] = useState(false);
    const [asientosLocales, setAsientosLocales] = useState([]);
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
            setDetalles((cloneData.detalles || []).map((d) => calcularFila(d)));
            setAsientosLocales(cloneData.asientos || []);
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
        conceptosApi.obtenerAlmacenes(sucursalActiva).then(setAlmacenesCache).catch((err) => { console.warn('Error al cargar almacenes cache en formulario entrada', err); });
        // Obtener fechas de cierre (contable e inventario)
        parametrosApi.obtenerFechaCierreInventario(sucursalActiva).then(setFechaCierreInventario).catch((err) => { console.warn('Error al obtener fecha cierre inventario', err); });
        parametrosApi.obtenerFechaCierreFiscal(sucursalActiva).then(setFechaCierreContable).catch((err) => { console.warn('Error al obtener fecha cierre fiscal', err); });
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
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoading(true);
        entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            setData(res);
            setPageTitleOverride(`Editar - ${res.documento.codigo}-${res.noDocumento}`);
            setDetalles((res.detalles || []).map((d) => calcularFila(d)));
            setAsientosLocales(res.asientos || []);
            setSelectedConcepto(res.concepto || null);
            setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
            // === DEFENSIVE: asegurar RNC desde entidad si suplidor no lo tiene ===
            const suplidorFinal = res.suplidor
                ? { ...res.suplidor, identificacion: res.suplidor.identificacion || res.entidad?.identificacion || '' }
                : res.entidad || null;
            setSelectedEntidad(suplidorFinal);
            setSelectedAlmacen(res.almacen || null);
            setSelectedOC(res.ordenCompra?.id ? { id: res.ordenCompra.id, noDocumento: res.ordenCompra.noDocumento } : null);
            setOcDetallesData(res.ordenCompra?.detalles || []);
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
            // Cargar suplidores según el concepto (desde Sucursal.Compra para que idExterno coincida)
            if (res.concepto?.codigo) {
                conceptosApi.obtenerSuplidores(Sucursal.Compra)
                    .then(setEntidadesCache)
                    .catch((err) => { console.warn('Error al cargar suplidores cache por concepto (editar)', err); });
            }
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
            message.error(msg);
            setLoadingError(true);
            navigationConfirmedRef.current = true;
            navigate('/FENP', { replace: true });
        })
            .finally(() => setLoading(false));
    }, [mode, id, sucursalActiva, form, navigate]);
    // ===== Cargar detalles de OC vinculada y comodines =====
    useEffect(() => {
        if (!data?.ordenCompra?.id)
            return;
        if (ocDetallesData.length > 0)
            return;
        ordenCompraApi.obtenerPorId(Sucursal.Compra, data.ordenCompra.id)
            .then((oc) => {
            if (oc.detalles?.length)
                setOcDetallesData(oc.detalles);
        })
            .catch(() => message.warning('No se pudieron cargar los detalles de la OC'));
        // Cargar comodines
        productoApi.obtenerComodines(Sucursal.Compra)
            .then(setComodines)
            .catch((err) => { console.warn('Error al cargar comodines OC vinculada', err); });
    }, [data?.ordenCompra?.id, ocDetallesData.length]);
    // Cargar comodines cuando el documento tiene OC vinculada (independiente de ocDetallesData)
    useEffect(() => {
        if (!data?.ordenCompra?.id)
            return;
        productoApi.obtenerComodines(Sucursal.Compra)
            .then(setComodines)
            .catch((err) => { console.warn('Error al cargar comodines OC vinculada (efecto independiente)', err); });
    }, [data?.ordenCompra?.id]);
    // Cargar detalles de OC y comodines al abrir el modal si no se han cargado antes
    useEffect(() => {
        if (!ocProductosModalOpen || !selectedOC)
            return;
        // Cargar comodines siempre que se abre el modal (independiente de ocDetallesData)
        if (comodines.length === 0) {
            productoApi.obtenerComodines(Sucursal.Compra)
                .then(setComodines)
                .catch((err) => { console.warn('Error al cargar comodines al abrir modal productos OC', err); });
        }
        // Cargar detalles de OC solo si no se han cargado antes
        if (ocDetallesData.length > 0)
            return;
        ordenCompraApi.obtenerPorId(Sucursal.Compra, selectedOC.id)
            .then((oc) => {
            if (oc.detalles?.length) {
                setOcDetallesData(oc.detalles);
            }
        })
            .catch(() => message.warning('No se pudieron cargar los detalles de la OC'));
    }, [ocProductosModalOpen, selectedOC, comodines.length, ocDetallesData.length]);
    const navigationConfirmedRef = useFormularioNavigation();
    // ===== Handlers =====
    const handleCancelar = () => {
        Modal.confirm({
            title: 'Cancelar',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: '¿Esta seguro que desea cancelar los cambios realizados?',
            okText: 'Si, cancelar',
            cancelText: 'No, continuar editando',
            okButtonProps: { danger: true },
            onOk: () => {
                setEditingField(null);
                setAgregarFilaBloqueado(false);
                if (mode === 'crear') {
                    navigationConfirmedRef.current = true;
                    navigate('/FENP', { replace: true });
                }
                else {
                    if (id) {
                        setLoading(true);
                        entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
                            .then((res) => {
                            setData(res);
                            setPageTitleOverride(`Editar - ${res.documento.codigo}-${res.noDocumento}`);
                            setDetalles((res.detalles || []).map((d) => calcularFila(d)));
                            setAsientosLocales(res.asientos || []);
                            setSelectedConcepto(res.concepto || null);
                            setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
                            // === DEFENSIVE: asegurar RNC desde entidad si suplidor no lo tiene ===
                            const suplidorFinal = res.suplidor
                                ? { ...res.suplidor, identificacion: res.suplidor.identificacion || res.entidad?.identificacion || '' }
                                : res.entidad || null;
                            setSelectedEntidad(suplidorFinal);
                            setSelectedAlmacen(res.almacen || null);
                            setSelectedOC(res.ordenCompra?.id ? { id: res.ordenCompra.id, noDocumento: res.ordenCompra.noDocumento } : null);
                            setOcDetallesData(res.ordenCompra?.detalles || []);
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
                                    .catch((err) => { console.warn('Error al recargar suplidores cache al cambiar concepto (modal OC)', err); });
                            }
                        })
                            .catch((err) => {
                            const msg = err?.response?.data?.errorMessage || 'Error al recargar el documento';
                            message.error(msg);
                        })
                            .finally(() => setLoading(false));
                    }
                    navigationConfirmedRef.current = true;
                    navigate(`/FENP/${id}`, { replace: true });
                }
            },
        });
    };
    // Validación del formulario
    const validarFormulario = () => {
        const values = form.getFieldsValue();
        if (!selectedConcepto)
            return 'El concepto es requerido';
        if (!values.suplidor)
            return 'El suplidor es requerido';
        if (!values.almacen && !selectedAlmacen)
            return 'El almacén es requerido';
        if (detalles.length === 0)
            return 'Debe agregar al menos un detalle';
        if (!detalles.some((d) => (d.cantidad || 0) > 0))
            return 'Debe tener al menos un detalle con cantidad > 0';
        // Validar fecha contra cierre contable e inventario (usar la mayor)
        const fechas = [fechaCierreContable, fechaCierreInventario];
        const fechasValidas = fechas.filter((f) => f !== null);
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
    const construirDTO = () => {
        const values = form.getFieldsValue();
        const base = data || {};
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
            moneda: base.moneda || selectedConcepto?.moneda || getMonedaSucursalActiva(),
            almacen: selectedAlmacen || { nombre: '', codigo: '' },
            suplidor: entidadSel || { nombre: '', codigo: '', identificacion: '' },
            sucursal: base.sucursal || { nombre: '', codigo: '', identificacion: '' },
            ordenCompra: values.ordenCompra
                ? { id: base.ordenCompra?.id || 0, noDocumento: values.ordenCompra }
                : { id: 0, noDocumento: '' },
            detalles: detalles.map((d) => calcularFila(d)),
            asientos: asientosLocales.length > 0 ? asientosLocales : (base.asientos || []),
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
        let entidadGuardada = null;
        try {
            const dto = construirDTO();
            if (mode === 'crear') {
                const result = await entradaAlmacenApi.crear(sucursalActiva, dto);
                entidadGuardada = result;
                message.success('Entrada de almacén creada exitosamente');
            }
            else {
                await entradaAlmacenApi.actualizar(sucursalActiva, dto);
                entidadGuardada = { id: parseInt(id), noDocumento: data?.noDocumento };
                message.success('Entrada de almacén actualizada exitosamente');
            }
            // ===== Crear DVC si hay devoluciones pendientes =====
            if (detallesDevolucion.length > 0) {
                try {
                    const dvcDTO = {
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
                        entrada: { id: entidadGuardada?.id || parseInt(id), noDocumento: entidadGuardada?.noDocumento || data?.noDocumento },
                        moneda: dto.moneda,
                        documento: { codigo: 'DVC' },
                        subTotal: detallesDevolucion.reduce((s, d) => s + (d.subTotal || 0), 0),
                        descuento: detallesDevolucion.reduce((s, d) => s + (d.descuento || 0), 0),
                        impuestos: detallesDevolucion.reduce((s, d) => s + (d.impuestos || 0), 0),
                        total: detallesDevolucion.reduce((s, d) => s + (d.total || 0), 0),
                        detalles: detallesDevolucion,
                        asientos: [],
                        logs: [],
                    };
                    const dvcCreada = await devolucionCompraApi.crear(sucursalActiva, dvcDTO);
                    message.success(`Entrada guardada. DVC-${dvcCreada.noDocumento} creada exitosamente.`, 6);
                }
                catch (errDVC) {
                    const msgDVC = extraerMensajeError(errDVC, 'Error desconocido');
                    message.warning(`Entrada guardada, pero ocurrió un error al crear la DVC: ${msgDVC}`, 8);
                    // NO bloquear la navegación â€” la ENP ya se guardó
                }
            }
            navigationConfirmedRef.current = true;
            if (mode === 'crear') {
                navigate(`/FENP/${entidadGuardada.id}`, { replace: true });
            }
            else {
                navigate(`/FENP/${id}`, { replace: true });
            }
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al guardar');
            message.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    // ===== Handlers de concepto =====
    const handleConceptoSelect = (concepto) => {
        setSelectedConcepto(concepto);
        setConceptoSearchText(`${concepto.codigo || ''} - ${toTitleCase(concepto.nombre)}`);
        setEditingField(null);
        // Cargar suplidores del concepto (desde Sucursal.Compra para que idExterno coincida)
        conceptosApi.obtenerSuplidores(Sucursal.Compra)
            .then((ents) => setEntidadesCache(ents))
            .catch((err) => { console.warn('Error al cargar suplidores cache al seleccionar concepto', err); });
        // === ValidarImpuestosProducto (con backup/restore) ===
        const prevNoImpuesto = selectedConcepto?.noImpuesto;
        if (concepto.noImpuesto) {
            // Guardar backup de impuestos actuales antes de limpiarlos
            const hayImpuestos = detalles.some((d) => (d.porcentajeImpuesto || 0) > 0);
            if (hayImpuestos) {
                const backup = new Map();
                detalles.forEach((d) => {
                    if ((d.porcentajeImpuesto || 0) > 0) {
                        backup.set(d.id, { impuesto: d.impuesto, porcentajeImpuesto: d.porcentajeImpuesto || 0 });
                    }
                });
                impuestosBackupRef.current = backup;
                message.warning('El Concepto no acepta Impuestos, por lo que serán eliminados.');
                setDetalles((prev) => prev.map((d) => calcularFila({ ...d, porcentajeImpuesto: 0, impuesto: undefined })));
            }
        }
        else if (prevNoImpuesto && !concepto.noImpuesto) {
            // Restaurar impuestos desde backup
            const backup = impuestosBackupRef.current;
            if (backup.size > 0) {
                setDetalles((prev) => prev.map((d) => {
                    const saved = backup.get(d.id);
                    if (saved) {
                        return calcularFila({ ...d, impuesto: saved.impuesto, porcentajeImpuesto: saved.porcentajeImpuesto });
                    }
                    return d;
                }));
                impuestosBackupRef.current = new Map();
            }
        }
        // === ConfigurarMoneda (siempre desde concepto) ===
        const monedaObj = concepto.moneda || getMonedaSucursalActiva();
        const monedaNombre = monedaObj.nombre;
        const tasaDefault = monedaObj.tasa ?? 1;
        form.setFieldsValue({
            conceptoNombre: concepto.nombre,
            moneda: monedaNombre,
            tasa: tasaDefault ?? 1,
        });
        // Actualizar data local para que construirDTO y la UI lo reflejen
        setData((prev) => {
            if (!prev)
                return prev;
            return { ...prev, moneda: monedaObj };
        });
        // === ConfigurarAlmacenDefecto ===
        // No asignar automáticamente: la guía mostrará el paso de Almacén
        // para que el usuario lo seleccione manualmente.
        // Habilitar Orden de Compra
        // (tOrdenCompra.Enabled = true en desktop â€” en React ya está habilitado por defecto)
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
    const handleOCSelect = async (orden) => {
        // 1. Si hay detalles existentes, preguntar si borrar
        if (detalles.length > 0) {
            const shouldClear = await new Promise((resolve) => {
                Modal.confirm({
                    title: 'Cargar orden de compra',
                    icon: _jsx(ExclamationCircleOutlined, {}),
                    content: '¿Desea Borrar todos los registros?',
                    okText: 'Si',
                    cancelText: 'No',
                    onOk: () => resolve(true),
                    onCancel: () => resolve(false),
                });
            });
            if (!shouldClear)
                return;
            setDetalles([]);
        }
        // 2. Cargar OC completa para tener los detalles (siempre, aunque no se carguen al detalle)
        let ocDetalles = [];
        try {
            const ocCompleta = await ordenCompraApi.obtenerPorId(Sucursal.Compra, orden.id);
            ocDetalles = ocCompleta.detalles || [];
            setOcDetallesData(ocDetalles);
            // Cargar comodines para ProductosOrigenModal
            productoApi.obtenerComodines(Sucursal.Compra)
                .then(setComodines)
                .catch((err) => { console.warn('Error al cargar comodines al seleccionar OC', err); });
        }
        catch {
            // Si falla la carga, continuar sin detalles de OC
        }
        // 3. Preguntar si cargar detalles
        const shouldLoad = await new Promise((resolve) => {
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
                const nuevosDetalles = ocDetalles
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
                    setDetalles((prev) => prev.map((d) => ({
                        ...d,
                        tieneVencimiento: codigosVencimiento.includes(d.codigo) ? true : d.tieneVencimiento,
                    })));
                }
                catch {
                    // Si falla la consulta de vencimiento, no bloquear el flujo
                }
            }
            catch (err) {
                const msg = err?.response?.data?.errorMessage || 'Error al cargar detalles de la orden de compra';
                message.error(msg);
            }
        }
        // 5. Asignar suplidor desde la OC solo si no hay uno seleccionado
        if (!selectedEntidad) {
            const suplidorInfo = {
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
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: (_jsxs("div", { children: [_jsx(Typography.Text, { className: "paces-text-secondary", children: "Aplicar descuento porcentual a todos los productos:" }), _jsx(InputNumber, { autoFocus: true, style: { width: '100%', marginTop: 8 }, min: 0, max: 100, step: 0.01, precision: 2, placeholder: "0.00", onChange: (val) => { descuentoGlobal = val || 0; } })] })),
            okText: 'Aplicar',
            cancelText: 'Cancelar',
            onOk: () => {
                if (descuentoGlobal > 0) {
                    setDetalles((prev) => prev.map((d) => calcularFila({ ...d, porcentajeDescuento: descuentoGlobal })));
                }
            },
        });
    };
    const handleAgregarFila = () => {
        setDetalles((prev) => [{ ...filaVacia(), id: -(prev.length + 1) }, ...prev]);
    };
    const handleSeleccionarProducto = (producto) => {
        // Si hay OC vinculada, validar que el producto pertenezca a la OC o sea comodín
        if (ocDetallesData.length > 0) {
            const existeEnOC = ocDetallesData.some((d) => d.codigo === producto.codigo);
            const esComodin = comodines.some((d) => (d.codigo || d.idExterno) === producto.codigo);
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
            calcularFila({
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
                modificaPrecio: producto.modificaPrecio ?? false,
                modificaDescripcion: producto.modificaDescripcion ?? false,
            }),
            ...prev,
        ]);
    };
    const handleScannerProducto = (producto) => {
        // Si hay OC vinculada, validar que el producto pertenezca a la OC o sea comodín
        if (ocDetallesData.length > 0) {
            const existeEnOC = ocDetallesData.some((d) => d.codigo === producto.codigo);
            const esComodin = comodines.some((d) => (d.codigo || d.idExterno) === producto.codigo);
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
            calcularFila({
                ...filaVacia(),
                id: -(prev.length + 1),
                codigo: producto.codigo,
                articulo: producto.articulo,
                referencia: producto.referencia || '',
                costo: producto.costo || 0,
                modificaPrecio: producto.modificaPrecio ?? false,
                cantidad: producto.cantidad || 1,
                familia: producto.familia,
                medida: producto.medida || { nombre: '', codigo: '', factor: 1, idExterno: 0 },
                impuesto: producto.impuesto,
                porcentajeImpuesto: producto.impuesto?.porcentaje ?? 0,
            }),
            ...prev,
        ]);
    };
    const handleEliminarFila = (id) => {
        Modal.confirm({
            title: 'Eliminar detalle',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: '¿Está seguro de eliminar este detalle?',
            okText: 'Sí',
            cancelText: 'No',
            okButtonProps: { danger: true },
            onOk: () => {
                setDetalles((prev) => prev.filter((d) => d.id !== id));
            },
        });
    };
    const handleToggleVerificar = (id) => {
        setVerificados((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            }
            else {
                next.add(id);
            }
            return next;
        });
    };
    const handleDetalleUpdateValue = (id, field, value) => {
        setDetalles((prev) => prev.map((d) => (d.id !== id ? d : { ...d, [field]: value })));
    };
    const handleDetalleCalculate = (id, field, value) => {
        // Validar cantidad contra OC vinculada
        if (field === 'cantidad' && ocDetallesData.length > 0) {
            const detalle = detalles.find((d) => d.id === id);
            if (detalle) {
                const ocDetalle = ocDetallesData.find((d) => d.codigo === detalle.codigo);
                if (ocDetalle) {
                    const disponible = ((ocDetalle.cantidad + (ocDetalle.cantidadBonificable || 0)) - (ocDetalle.cantidadRecibida || 0));
                    if ((Number(value)) > (disponible) && !ocDetalle.pesado) {
                        message.warning(`La cantidad disponible en la OC es ${disponible}. Se ajustará automáticamente.`);
                        value = disponible;
                    }
                }
            }
        }
        setDetalles((prev) => prev.map((d) => {
            if (d.id !== id)
                return d;
            if (field === 'descuento') {
                // Modo pesos: calcular porcentaje desde el valor en pesos
                const subTotal = (d.cantidad || 0) * (d.costo || 0);
                const pctCalculado = subTotal > 0 ? Math.round((Number(value) / subTotal) * 100 * 100) / 100 : 0;
                const updated = { ...d, descuento: Number(value), porcentajeDescuento: pctCalculado };
                return calcularFila(updated);
            }
            const updated = { ...d, [field]: value };
            return calcularFila(updated);
        }));
    };
    const handleFechaVencimiento = (date) => {
        if (fechaVencimientoModal.detalleId) {
            setDetalles((prev) => prev.map((d) => {
                if (d.id !== fechaVencimientoModal.detalleId)
                    return d;
                return { ...d, fechaVencimiento: date ? date.format('YYYY-MM-DD') : undefined };
            }));
        }
        setFechaVencimientoModal({ open: false, detalleId: 0 });
    };
    const handleDragEnd = (event) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over || active.id === over.id)
            return;
        setDetalles((prev) => {
            const oldIndex = prev.findIndex((d) => d.id === active.id);
            const newIndex = prev.findIndex((d) => d.id === over.id);
            if (oldIndex === -1 || newIndex === -1)
                return prev;
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
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoadingError(false);
        setLoading(true);
        entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            setData(res);
            setDetalles((res.detalles || []).map((d) => calcularFila(d)));
            setAsientosLocales(res.asientos || []);
            setSelectedConcepto(res.concepto || null);
            setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
            const suplidorFinal = res.suplidor
                ? { ...res.suplidor, identificacion: res.suplidor.identificacion || res.entidad?.identificacion || '' }
                : res.entidad || null;
            setSelectedEntidad(suplidorFinal);
            setSelectedAlmacen(res.almacen || null);
            setSelectedOC(res.ordenCompra?.id ? { id: res.ordenCompra.id, noDocumento: res.ordenCompra.noDocumento } : null);
            setOcDetallesData(res.ordenCompra?.detalles || []);
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
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al recargar';
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, form, mode]);
    const handleGenerarAsientos = async () => {
        if (sucursalActiva === undefined)
            return;
        setGenerandoAsientos(true);
        try {
            const dto = construirDTO();
            const asientosGenerados = await transaccionApi.generarAsientos(sucursalActiva, dto);
            setAsientosLocales(asientosGenerados);
            message.success(`Se generaron ${asientosGenerados.length} asientos`);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al generar asientos');
            message.error(msg);
        }
        finally {
            setGenerandoAsientos(false);
        }
    };
    if (loading)
        return _jsx(LoadingSpinner, { mensaje: "Cargando documento..." });
    // ===== Estado y titulo =====
    const estadoInfo = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Borrador', color: 'default' };
    const sinOC = ocDetallesData.length === 0;
    // ===== Grid de detalles editable (responsive) =====
    const detalleColumns = [
        {
            title: '',
            key: 'sort',
            width: 40,
            render: () => _jsx(DragHandle, {}),
        },
        {
            title: 'Código',
            key: 'codigo',
            width: 120,
            fixed: 'left',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13, display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { children: record.codigo || '-' }), (() => {
                                const verificado = verificados.has(record.id);
                                const fechaVencida = record.fechaVencimiento ? new Date(record.fechaVencimiento) < new Date() : false;
                                const tieneCoincidencia = ocDetallesData.some((d) => d.codigo === record.codigo
                                    && (Math.abs(Number(d.costo) - Number(record.costo)) <= 1 || Number(record.cantidadBonificable) !== 0)
                                    && Number(d.medida?.factor || 1) === Number(record.medida?.factor || 1)
                                    && !d.nota?.trim());
                                const ocMatch = ocDetallesData.length > 0
                                    && (tieneCoincidencia || Number(record.cantidadBonificable) > 0)
                                    && (!record.tieneVencimiento || record.fechaVencimiento)
                                    && !fechaVencida;
                                const SKY_BLUE = '#4fc3f7';
                                if (ocMatch && verificado) {
                                    return (_jsx(Tooltip, { title: "Coincide con OC \u00C2\u00B7 Verificado", children: _jsx(CheckCircleFilled, { style: { color: '#34c38f', fontSize: 14 } }) }));
                                }
                                if (ocMatch) {
                                    return _jsx(Tooltip, { title: "Coincide con OC", children: _jsx(CheckCircleOutlined, { style: { color: '#34c38f', fontSize: 12 } }) });
                                }
                                if (verificado) {
                                    return _jsx(Tooltip, { title: "Verificado manualmente", children: _jsx(CheckCircleOutlined, { style: { color: SKY_BLUE, fontSize: 12 } }) });
                                }
                                if (ocDetallesData.length === 0)
                                    return null;
                                let motivo = 'No coincide con la OC';
                                const detalleOC = ocDetallesData.find((d) => d.codigo === record.codigo);
                                if (!detalleOC) {
                                    motivo = 'Código no encontrado en la OC';
                                }
                                else if (record.tieneVencimiento && !record.fechaVencimiento) {
                                    motivo = 'Requiere fecha de vencimiento';
                                }
                                else if (record.fechaVencimiento && new Date(record.fechaVencimiento) < new Date()) {
                                    motivo = 'Fecha de vencimiento vencida';
                                }
                                else if (detalleOC.nota?.trim()) {
                                    motivo = `OC tiene nota: ${detalleOC.nota}`;
                                }
                                else if (Number(detalleOC.medida?.factor || 1) !== Number(record.medida?.factor || 1)) {
                                    motivo = `Factor OC: ${detalleOC.medida?.factor || 1} | ENP: ${record.medida?.factor || 1}`;
                                }
                                else if (Number(record.cantidadBonificable) === 0 && Math.abs(Number(detalleOC.costo) - Number(record.costo)) > 1) {
                                    motivo = `Costo OC: ${formatNumber(detalleOC.costo)} | ENP: ${formatNumber(record.costo)}`;
                                }
                                return (_jsx(Tooltip, { title: motivo, children: _jsx(CloseCircleOutlined, { style: { color: '#d9d9d9', fontSize: 12 } }) }));
                            })()] }), record.referencia && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, marginTop: 'auto' }, children: record.referencia }))] })),
        },
        {
            title: 'Artículo',
            key: 'articulo',
            ellipsis: true,
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, _record, idx) => {
                const fila = detalles[idx];
                if (!fila)
                    return null;
                // Jerarquía Descripción: 1) Documento.modificaDescripcion? 2) Producto.modificaDescripcion?
                const docPermiteDesc = documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion ?? true;
                if (docPermiteDesc) {
                    return (_jsxs("div", { style: { fontSize: 13, display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx(Input, { size: "small", style: { width: '100%' }, value: fila.articulo || '', onChange: (e) => handleDetalleUpdateValue(fila.id, 'articulo', e.target.value) }), _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }, children: [fila.familia?.nombre ? _jsx(Tag, { style: { fontSize: 11, lineHeight: '18px', padding: '0 6px' }, children: toTitleCase(fila.familia.nombre) }) : null, fila.fechaVencimiento && _jsxs("span", { children: ["V: ", formatDate(fila.fechaVencimiento)] })] })] }));
                }
                return (_jsxs("div", { style: { fontSize: 13, display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx("div", { style: { display: 'flex', alignItems: 'center' }, children: _jsx("span", { style: { flex: 1 }, children: toTitleCase(fila.articulo || '') }) }), _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }, children: [fila.familia?.nombre ? _jsx(Tag, { style: { fontSize: 11, lineHeight: '18px', padding: '0 6px' }, children: toTitleCase(fila.familia.nombre) }) : null, fila.fechaVencimiento && _jsxs("span", { children: ["V: ", formatDate(fila.fechaVencimiento)] })] })] }));
            },
        },
        {
            title: 'Cantidad',
            dataIndex: 'cantidad',
            key: 'cantidad',
            width: 100,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            shouldCellUpdate: (record, prevRecord) => record.cantidad !== prevRecord.cantidad || record.medida?.nombre !== prevRecord.medida?.nombre,
            render: (_, _record, idx) => (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }, children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, step: 0.01, precision: 2, controls: false, defaultValue: detalles[idx]?.cantidad, onChange: (val) => {
                            editValuesRef.current[`${detalles[idx].id}_cantidad`] = val || 0;
                        }, onBlur: () => {
                            const val = editValuesRef.current[`${detalles[idx].id}_cantidad`] ?? detalles[idx]?.cantidad;
                            handleDetalleCalculate(detalles[idx].id, 'cantidad', val);
                        }, onPressEnter: () => {
                            const val = editValuesRef.current[`${detalles[idx].id}_cantidad`] ?? detalles[idx]?.cantidad;
                            handleDetalleCalculate(detalles[idx].id, 'cantidad', val);
                        } }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5, marginTop: 'auto', minHeight: 18 }, children: !sinOC && detalles[idx]?.medida?.nombre ? toTitleCase(detalles[idx].medida.nombre) : '' })] })),
        },
        ...(sinOC ? [{
                title: 'Medida',
                key: 'medida',
                width: 160,
                onCell: () => ({ style: { verticalAlign: 'top' } }),
                render: (_, record, _idx) => {
                    const curId = record.medida?.idExterno;
                    const hasMatch = medidasCache.some((m) => m.idExterno === curId);
                    return (_jsx(Select, { size: "small", style: { width: '100%' }, value: hasMatch ? curId : undefined, onChange: (idExterno) => {
                            const medida = medidasCache.find((m) => m.idExterno === idExterno);
                            if (medida) {
                                handleDetalleCalculate(record.id, 'medida', {
                                    nombre: medida.nombre,
                                    codigo: medida.codigo,
                                    factor: medida.factor,
                                    idExterno: medida.idExterno,
                                });
                            }
                        }, children: medidasCache.map((m) => (_jsx(Select.Option, { value: m.idExterno, children: toTitleCase(m.nombre || '') }, m.idExterno ?? 0))) }, medidasCache.length));
                },
            }] : []),
        {
            title: 'Costo',
            dataIndex: 'costo',
            key: 'costo',
            width: 130,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['md', 'lg', 'xl', 'xxl'],
            shouldCellUpdate: (record, prevRecord) => record.costo !== prevRecord.costo || record.porcentajeDescuento !== prevRecord.porcentajeDescuento || record.cantidad !== prevRecord.cantidad || record.medida?.factor !== prevRecord.medida?.factor || record.modificaPrecio !== prevRecord.modificaPrecio,
            render: (_, _record, idx) => {
                const fila = detalles[idx];
                if (!fila)
                    return null;
                const costoBase = Number(fila.costo) || 0;
                const pctDesc = Number(fila.porcentajeDescuento) || 0;
                const factor = Number(fila.medida?.factor) || 1;
                const costoConDescuento = costoBase - ((costoBase * pctDesc) / 100);
                const costoUnitario = costoConDescuento / factor;
                // Jerarquía Precio: 1) Documento.modificaPrecio? 2) Producto.modificaPrecio?
                const docPermiteEditar = documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio ?? true;
                if (docPermiteEditar) {
                    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }, children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, step: 0.01, precision: 2, controls: false, value: fila.costo, onChange: (val) => handleDetalleUpdateValue(fila.id, 'costo', val || 0), onBlur: () => handleDetalleCalculate(fila.id, 'costo', fila.costo || 0), onPressEnter: () => handleDetalleCalculate(fila.id, 'costo', fila.costo || 0) }), _jsxs("div", { style: { fontSize: 11, lineHeight: 1.5, color: '#999', marginTop: 'auto' }, children: [formatNumber(costoUnitario), " \u00D7 ", factor] })] }));
                }
                return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }, children: [_jsx("div", { style: { textAlign: 'right', fontWeight: 500 }, children: formatNumber(costoBase) }), _jsxs("div", { style: { fontSize: 11, lineHeight: 1.5, color: '#999', marginTop: 'auto' }, children: [formatNumber(costoUnitario), " \u00D7 ", factor] })] }));
            },
        },
        {
            title: 'Descuento',
            key: 'descuento',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, _record, idx) => modoDescuento === 'porcentaje' ? (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }, children: [_jsxs(Space.Compact, { style: { width: '100%' }, children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, max: 100, step: 0.01, precision: 2, controls: false, defaultValue: detalles[idx]?.porcentajeDescuento, onChange: (val) => {
                                    editValuesRef.current[`${detalles[idx].id}_descuento`] = val || 0;
                                }, onBlur: () => {
                                    const val = editValuesRef.current[`${detalles[idx].id}_descuento`] ?? detalles[idx]?.porcentajeDescuento;
                                    handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', val);
                                }, onPressEnter: () => {
                                    const val = editValuesRef.current[`${detalles[idx].id}_descuento`] ?? detalles[idx]?.porcentajeDescuento;
                                    handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', val);
                                } }, `pct_${detalles[idx].id}_${modoDescuento}`), _jsx("span", { onClick: () => setModoDescuento('pesos'), style: { cursor: 'pointer', display: 'inline-flex' }, children: _jsx(Input, { size: "small", placeholder: "%", disabled: true, style: { width: 36, textAlign: 'center', borderLeft: 'none', pointerEvents: 'none' } }) })] }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5, marginTop: 'auto' }, children: formatNumber(detalles[idx]?.descuento || 0) })] })) : (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }, children: [_jsxs(Space.Compact, { style: { width: '100%' }, children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, step: 0.01, precision: 2, controls: false, defaultValue: detalles[idx]?.descuento, onChange: (val) => {
                                    editValuesRef.current[`${detalles[idx].id}_descuento_pesos`] = val || 0;
                                }, onBlur: () => {
                                    const val = editValuesRef.current[`${detalles[idx].id}_descuento_pesos`] ?? detalles[idx]?.descuento;
                                    handleDetalleCalculate(detalles[idx].id, 'descuento', val);
                                }, onPressEnter: () => {
                                    const val = editValuesRef.current[`${detalles[idx].id}_descuento_pesos`] ?? detalles[idx]?.descuento;
                                    handleDetalleCalculate(detalles[idx].id, 'descuento', val);
                                } }, `pesos_${detalles[idx].id}_${modoDescuento}`), _jsx("span", { onClick: () => setModoDescuento('porcentaje'), style: { cursor: 'pointer', display: 'inline-flex' }, children: _jsx(Input, { size: "small", placeholder: "$", disabled: true, style: { width: 36, textAlign: 'center', borderLeft: 'none', pointerEvents: 'none' } }) })] }), _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5, marginTop: 'auto' }, children: [formatNumber(detalles[idx]?.porcentajeDescuento || 0), "%"] })] })),
        },
        {
            title: 'SubTotal',
            dataIndex: 'subTotal',
            key: 'subTotal',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx(Text, { children: formatNumber(record.subTotal || 0) }), _jsx("div", { style: { fontSize: 11, lineHeight: 1.5, marginTop: 'auto' }, children: "\u00A0" })] })),
        },
        {
            title: 'Impuestos',
            key: 'impuestos',
            width: 140,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx("div", { children: formatNumber(record.impuestos || 0) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5, marginTop: 'auto', minHeight: 18 }, children: record.impuesto?.nombre ? toTitleCase(record.impuesto.nombre) : '' })] })),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx(Text, { strong: true, children: formatNumber(record.total || 0) }), _jsx("div", { style: { fontSize: 11, lineHeight: 1.5, marginTop: 'auto' }, children: "\u00A0" })] })),
        },
        {
            title: '',
            key: 'devolver',
            width: 50,
            responsive: ['md', 'lg', 'xl', 'xxl'],
            onCell: () => ({ style: { verticalAlign: 'middle', textAlign: 'center' } }),
            render: (_, record) => {
                const yaDevuelto = detallesDevolucion
                    .filter((d) => d.idExterno === record.id)
                    .reduce((s, d) => s + (d.cantidad || 0), 0);
                const disponible = (record.cantidad || 0) - yaDevuelto;
                const tieneDevolucion = yaDevuelto > 0;
                return (_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }, children: _jsx(Tooltip, { title: disponible <= 0 ? 'Sin cantidad disponible' : (tieneDevolucion ? 'Modificar cantidad a devolver' : 'Agregar a devolución'), children: _jsx(Button, { type: "text", size: "small", icon: _jsx(RollbackOutlined, {}), style: { color: tieneDevolucion ? '#556ee6' : '#8c8c8c' }, disabled: disponible <= 0, onClick: () => {
                                setDetalleDevolucionActivo(record);
                                setCantidadDevolucionInput(0);
                                setModalDevolucionOpen(true);
                            } }) }) }));
            },
        },
        {
            title: '',
            key: 'acciones',
            width: 50,
            render: (_, record, idx) => {
                const verificado = verificados.has(record.id);
                const items = [
                    {
                        key: 'eliminar',
                        label: 'Eliminar',
                        icon: _jsx(DeleteOutlined, {}),
                        danger: true,
                        onClick: () => handleEliminarFila(record.id),
                    },
                ];
                items.unshift({
                    key: 'vencimiento',
                    label: record.fechaVencimiento ? `Venc: ${formatDate(record.fechaVencimiento)}` : 'Fecha Vencimiento',
                    icon: _jsx(CalendarOutlined, {}),
                    danger: false,
                    onClick: () => setFechaVencimientoModal({ open: true, detalleId: record.id }),
                });
                items.unshift({
                    key: 'verificar',
                    label: verificado ? 'Desverificar' : 'Verificar',
                    icon: _jsx(CheckCircleOutlined, { style: { color: verificado ? '#4fc3f7' : undefined } }),
                    danger: false,
                    onClick: () => handleToggleVerificar(record.id),
                });
                return (_jsx(Dropdown, { menu: { items }, trigger: ['click'], children: _jsx(Button, { type: "text", size: "small", icon: _jsx(MoreOutlined, {}) }) }));
            },
        },
    ];
    // ===== Encabezado del formulario =====
    // ===== Modal de cantidad a devolver (DVC) =====
    const renderModalDevolucion = () => {
        if (!detalleDevolucionActivo)
            return null;
        const record = detalleDevolucionActivo;
        const yaDevuelto = detallesDevolucion
            .filter((d) => d.idExterno === record.id)
            .reduce((s, d) => s + (d.cantidad || 0), 0);
        const disponible = (record.cantidad || 0) - yaDevuelto;
        return (_jsxs(Modal, { title: "Devolver producto", open: modalDevolucionOpen, onCancel: () => { setModalDevolucionOpen(false); setDetalleDevolucionActivo(null); }, width: 420, destroyOnHidden: true, maskClosable: false, footer: _jsxs(Space, { children: [_jsx(Button, { onClick: () => { setModalDevolucionOpen(false); setDetalleDevolucionActivo(null); }, children: "Cancelar" }), _jsx(Button, { type: "primary", icon: _jsx(RollbackOutlined, {}), disabled: !cantidadDevolucionInput || cantidadDevolucionInput <= 0 || cantidadDevolucionInput > disponible, onClick: () => {
                            const subTotal = cantidadDevolucionInput * (record.costo || 0);
                            const pctDesc = record.porcentajeDescuento || 0;
                            const pctImp = record.impuesto?.porcentaje || 0;
                            const descuento = Math.round(subTotal * (pctDesc / 100) * 100) / 100;
                            const baseImponible = subTotal - descuento;
                            const impuestos = Math.round(baseImponible * (pctImp / 100) * 100) / 100;
                            const total = Math.round((baseImponible + impuestos) * 100) / 100;
                            const nuevoDetalle = {
                                id: -(detallesDevolucion.length + 1),
                                idExterno: record.id,
                                codigo: record.codigo,
                                articulo: record.articulo,
                                referencia: record.referencia || '',
                                cantidad: cantidadDevolucionInput,
                                costo: record.costo || 0,
                                subTotal: (cantidadDevolucionInput * (record.costo || 0)),
                                porcentajeDescuento: record.porcentajeDescuento || 0,
                                descuento,
                                impuesto: record.impuesto,
                                impuestos,
                                total,
                                familia: record.familia,
                                medida: record.medida,
                                tipoArticulo: record.tipoArticulo || 'Producto',
                                nota: '',
                            };
                            setDetallesDevolucion((prev) => [...prev, nuevoDetalle]);
                            setModalDevolucionOpen(false);
                            setDetalleDevolucionActivo(null);
                            message.success('Producto agregado a la lista de devolución');
                        }, children: "Agregar a devoluci\u00F3n" })] }), children: [_jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }, children: [_jsxs("div", { children: [_jsx(Typography.Text, { strong: true, style: { fontSize: 14 }, children: record.codigo }), _jsx("br", {}), record.referencia && (_jsx(Typography.Text, { className: "paces-text-secondary", style: { fontSize: 12 }, children: record.referencia }))] }), _jsxs("div", { style: { flex: 1 }, children: [_jsx(Typography.Text, { style: { fontSize: 13 }, children: toTitleCase(record.articulo || '') }), _jsx("br", {}), record.familia?.nombre && (_jsx(Tag, { style: { fontSize: 11 }, children: toTitleCase(record.familia.nombre) }))] })] }), _jsxs("div", { style: { marginBottom: 12 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 }, children: [_jsx(Typography.Text, { className: "paces-text-secondary", children: "Cantidad recibida:" }), _jsx(Typography.Text, { children: formatNumber(record.cantidad || 0) })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 }, children: [_jsx(Typography.Text, { className: "paces-text-secondary", children: "Ya devuelto:" }), _jsx(Typography.Text, { style: yaDevuelto > 0 ? { color: '#ff4d4f' } : {}, children: formatNumber(yaDevuelto) })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx(Typography.Text, { className: "paces-text-secondary", children: "Disponible:" }), _jsx(Typography.Text, { style: { color: '#34c38f', fontWeight: 600, fontSize: 14 }, children: formatNumber(disponible) })] })] }), _jsx(Divider, { style: { margin: '12px 0' } }), _jsx("div", { style: { marginBottom: 4 }, children: _jsx(Typography.Text, { strong: true, children: "Cantidad a devolver:" }) }), _jsx(InputNumber, { autoFocus: true, style: { width: '100%' }, min: 0.01, max: disponible, step: 0.01, precision: 2, value: cantidadDevolucionInput || undefined, onChange: (val) => setCantidadDevolucionInput(val || 0), onPressEnter: () => {
                        if (cantidadDevolucionInput > 0 && cantidadDevolucionInput <= disponible) {
                            const subTotal = cantidadDevolucionInput * (record.costo || 0);
                            const pctDesc = record.porcentajeDescuento || 0;
                            const pctImp = record.impuesto?.porcentaje || 0;
                            const descuento = Math.round(subTotal * (pctDesc / 100) * 100) / 100;
                            const baseImponible = subTotal - descuento;
                            const impuestos = Math.round(baseImponible * (pctImp / 100) * 100) / 100;
                            const total = Math.round((baseImponible + impuestos) * 100) / 100;
                            const nuevoDetalle = {
                                id: -(detallesDevolucion.length + 1),
                                idExterno: record.id,
                                codigo: record.codigo,
                                articulo: record.articulo,
                                referencia: record.referencia || '',
                                cantidad: cantidadDevolucionInput,
                                costo: record.costo || 0,
                                subTotal: (cantidadDevolucionInput * (record.costo || 0)),
                                porcentajeDescuento: record.porcentajeDescuento || 0,
                                descuento,
                                impuesto: record.impuesto,
                                impuestos,
                                total,
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
                    }, placeholder: "0.00" }), cantidadDevolucionInput > disponible && (_jsx(Alert, { type: "warning", showIcon: true, style: { marginTop: 8 }, message: `La cantidad no puede superar el disponible (${formatNumber(disponible)})` }))] }));
    };
    const renderEncabezado = () => {
        // ncfValue, refValue y tasaValue vienen del watcher reactivo (component-level Form.useWatch)
        return (_jsx(Card, { className: "paces-card", size: "small", title: "Datos Generales", extra: _jsx(EstadoTag, { estado: estado, periodo: data?.periodo }), style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: 16, children: [_jsx(Col, { xs: 24, xxl: 18, children: _jsx(Form, { form: form, layout: "vertical", size: "middle", style: { paddingTop: 24 }, children: _jsxs(Row, { gutter: [16, 24], children: [_jsxs(Col, { xs: 24, sm: 12, lg: 9, children: [_jsx("div", { ref: ordenCompraRef, children: _jsx(FloatingField, { label: "Orden Compra", externalValue: ordenCompraNoDoc, children: _jsx(Input, { placeholder: " ", value: ordenCompraNoDoc, readOnly: true, suffix: _jsx(SearchOutlined, { style: { cursor: 'pointer', color: 'rgba(0,0,0,0.45)' } }), onClick: handleBuscarOC }) }) }), _jsx(Form.Item, { name: "ordenCompra", hidden: true, children: _jsx(Input, {}) })] }), _jsxs(Col, { xs: 24, sm: 12, lg: 15, children: [_jsx("div", { ref: conceptoRef, children: _jsx(FloatingField, { label: "Concepto", required: true, externalValue: conceptoSearchText, children: _jsx(Input, { placeholder: " ", value: conceptoSearchText, readOnly: true, suffix: _jsx(SearchOutlined, { style: { cursor: 'pointer', color: 'rgba(0,0,0,0.45)' } }), onClick: handleConceptoSearchClick }) }) }), _jsx(ConceptoInfoLabel, { concepto: selectedConcepto }), _jsx(Form.Item, { name: "concepto", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "conceptoNombre", hidden: true, children: _jsx(Input, {}) })] }), _jsx(Col, { xs: 24, sm: 12, lg: 9, children: _jsx(Form.Item, { name: "fechaDocumento", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Fecha Documento", required: true, children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabledDate: (current) => {
                                                        if (!current)
                                                            return false;
                                                        const cierre = fechasCierre?.[sucursalActiva];
                                                        if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                                            return true;
                                                        const cierreInv = fechasCierreInv?.[sucursalActiva];
                                                        if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                                            return true;
                                                        return false;
                                                    } }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 15, children: _jsx(Form.Item, { name: "suplidor", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Suplidor / Entidad", required: true, ref: suplidorRef, children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", onChange: (val) => {
                                                        const ent = entidadesCache.find((e) => e.codigo === val);
                                                        // Si el suplidor requiere OC y hay detalles, preguntar si borrar
                                                        if (ent?.requiereORC && detalles.length > 0) {
                                                            Modal.confirm({
                                                                title: 'Cambiar Suplidor',
                                                                icon: _jsx(ExclamationCircleOutlined, {}),
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
                                                        }
                                                        else {
                                                            setSelectedEntidad(ent || null);
                                                            // Limpiar OC al cambiar de suplidor
                                                            setSelectedOC(null);
                                                            setOrdenCompraNoDoc('');
                                                            form.setFieldsValue({ ordenCompra: '' });
                                                            // Si requiere ORC, bloquear agregar fila; si no, desbloquear
                                                            setAgregarFilaBloqueado(ent?.requiereORC === true);
                                                        }
                                                    }, children: entidadesCache.map((ent) => (_jsxs(Select.Option, { value: ent.codigo, children: [toTitleCase(ent.nombre), ent.identificacion ? ` (${ent.identificacion})` : ''] }, ent.codigo))) }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 9, children: _jsx(Form.Item, { name: "fechaRecibo", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Fecha Recibo", children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabledDate: (current) => {
                                                        if (!current)
                                                            return false;
                                                        const cierre = fechasCierre?.[sucursalActiva];
                                                        if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                                            return true;
                                                        const cierreInv = fechasCierreInv?.[sucursalActiva];
                                                        if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                                            return true;
                                                        return false;
                                                    } }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 15, children: _jsx(Form.Item, { name: "almacen", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Almac\u00E9n", required: true, ref: almacenRef, children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", onChange: (val) => {
                                                        const alm = almacenesCache.find((a) => a.codigo === val);
                                                        setSelectedAlmacen(alm || null);
                                                    }, children: almacenesCache.map((alm) => (_jsx(Select.Option, { value: alm.codigo, children: toTitleCase(alm.nombre) }, alm.codigo))) }) }) }) }), _jsxs(Col, { xs: 24, children: [_jsx("div", { style: { marginBottom: 16 }, children: _jsxs(Space, { size: [8, 8], wrap: true, children: [_jsx("div", { ref: ncfRef, children: editingField === 'ncf' ? (_jsx(Input, { size: "small", style: { width: 200 }, placeholder: "NCF", maxLength: 19, autoFocus: true, defaultValue: editingValueRef.current, onChange: (e) => {
                                                                    editingValueRef.current = e.target.value;
                                                                }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                                    if (e.key === 'Escape') {
                                                                        e.stopPropagation();
                                                                        cancelFieldEditor();
                                                                    }
                                                                } })) : ncfValue ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('ncf'), children: ["NCF: ", ncfValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('ncf'), children: [_jsx(PlusOutlined, {}), " NCF"] })) }), editingField === 'referencia' ? (_jsx(Input, { size: "small", style: { width: 200 }, placeholder: "Referencia", autoFocus: true, defaultValue: editingValueRef.current, onChange: (e) => {
                                                                editingValueRef.current = e.target.value;
                                                            }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                                if (e.key === 'Escape') {
                                                                    e.stopPropagation();
                                                                    cancelFieldEditor();
                                                                }
                                                            } })) : refValue ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('referencia'), children: ["Ref: ", refValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('referencia'), children: [_jsx(PlusOutlined, {}), " Referencia"] })), editingField === 'tasa' ? (_jsx(InputNumber, { size: "small", style: { width: 120 }, min: 0, step: 0.01, placeholder: "Tasa", autoFocus: true, defaultValue: editingValueRef.current, onChange: (val) => {
                                                                editingValueRef.current = val ?? 1;
                                                            }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                                if (e.key === 'Escape') {
                                                                    e.stopPropagation();
                                                                    cancelFieldEditor();
                                                                }
                                                            } })) : tasaValue !== 1 ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('tasa'), children: ["Tasa: ", tasaValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('tasa'), children: [_jsx(PlusOutlined, {}), " Tasa"] }))] }) }), _jsx(Form.Item, { name: "ncf", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "referencia", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "tasa", hidden: true, children: _jsx(InputNumber, {}) }), _jsx(Form.Item, { name: "moneda", hidden: true, children: _jsx(Input, {}) })] }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "nota", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Nota", children: _jsx(TextArea, { rows: 3 }) }) }) })] }) }) }), _jsx(Col, { xs: 24, xxl: 6, children: _jsx("div", { style: { marginTop: 24 }, children: _jsx(TotalesCard, { subTotal: totales.subTotal, descuento: totales.descuento, impuestos: totales.impuestos, total: totales.total, hideTitle: true, monedaSimbolo: data?.moneda?.simbolo || selectedConcepto?.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: data?.moneda?.nombre || selectedConcepto?.moneda?.nombre || monedaDefault.nombre, tasa: tasaValue ?? data?.tasa ?? 1 }) }) })] }) }));
    };
    return (_jsxs("div", { children: [_jsx(FormularioToolbar, { saving: saving, estado: mode === 'editar' ? estado : undefined, periodo: data?.periodo, onGuardar: handleGuardar, onCancelar: handleCancelar }), loadingError && (_jsx(Alert, { message: "Error al cargar formulario de entrada de almac\u00E9n", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(BuscarConceptoModal, { open: conceptoModalOpen, onClose: () => setConceptoModalOpen(false), onSelect: handleConceptoSelect, sucursal: data?.concepto?.sucursalDestino?.id ?? data?.sucursal?.id ?? sucursalActiva, documento: "ENP" }), _jsx(BuscarOrdenCompraModal, { open: ordenCompraModalOpen, onClose: () => setOrdenCompraModalOpen(false), onSelect: handleOCSelect, fetchOrdenes: async () => {
                    const hoy = new Date();
                    const hace60 = new Date();
                    hace60.setDate(hace60.getDate() - 60);
                    const formatDateParam = (d) => {
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        const hh = String(d.getHours()).padStart(2, '0');
                        const mm = String(d.getMinutes()).padStart(2, '0');
                        const ss = String(d.getSeconds()).padStart(2, '0');
                        return `${y}${m}${dd}${hh}${mm}${ss}`;
                    };
                    const params = {
                        cantidad: 50,
                        desde: formatDateParam(hace60),
                        hasta: formatDateParam(hoy),
                    };
                    if (selectedEntidad?.codigo?.trim()) {
                        params.suplidor = selectedEntidad.codigo.trim();
                    }
                    const res = await ordenCompraApi.obtenerResumido(Sucursal.Compra, sucursalActiva, params);
                    return res.data;
                } }), _jsx(BuscarProductoModal, { open: productoModalOpen, onClose: () => setProductoModalOpen(false), onSelect: handleSeleccionarProducto, mode: "inventario" }), _jsx(ScannerModal, { open: scannerModalOpen, onClose: () => setScannerModalOpen(false), onSelect: handleScannerProducto }), _jsx(ProductosOrigenModal, { open: ocProductosModalOpen, onClose: () => { setOcProductoSearch(''); setOcProductosModalOpen(false); }, title: "Agregar producto", sourceLabel: "OC", sourceProducts: ocDetallesData, comodines: comodines, addedCodes: detalles.map((d) => d.codigo), sourceColumns: [
                    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
                    { title: 'Artículo', dataIndex: 'articulo', key: 'articulo', ellipsis: true },
                    { title: 'Cant. OC', dataIndex: 'cantidad', key: 'cantidad', width: 90, align: 'right' },
                    { title: 'Costo', dataIndex: 'costo', key: 'costo', width: 100, align: 'right',
                        render: (v) => formatNumber(v) },
                ], comodinColumns: [
                    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
                    { title: 'Artículo', dataIndex: 'nombre', key: 'nombre', ellipsis: true },
                    { title: 'Costo', dataIndex: 'ultimoCosto', key: 'ultimoCosto', width: 100, align: 'right',
                        render: (v) => formatNumber(v || 0) },
                ], onAddSourceProduct: (record) => {
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
                }, onAddComodin: (record) => {
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
                } }), isLarge ? (_jsx(Row, { gutter: 16, children: _jsxs(Col, { xl: 24, children: [renderEncabezado(), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: [
                                {
                                    key: 'detalles',
                                    label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`,
                                    children: (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, ref: agregarFilaRef, children: [_jsxs(Space, { children: [_jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: () => {
                                                                    if (selectedOC) {
                                                                        setOcProductosModalOpen(true);
                                                                    }
                                                                    else {
                                                                        setProductoModalOpen(true);
                                                                    }
                                                                }, children: "Agregar producto" }), _jsx(Button, { icon: _jsx(BarcodeOutlined, {}), onClick: () => setScannerModalOpen(true) }), _jsx(Button, { icon: _jsx(PercentageOutlined, {}), onClick: handleDescuentoGlobal, children: "Dto. global" })] }), _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { maxWidth: 250 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                                            setDetalleSearch(''); } })] }), (documentoConfig?.modificaPrecio === false || documentoConfig?.modificaDescripcion === false || data?.documento?.modificaPrecio === false || data?.documento?.modificaDescripcion === false) && detalles.length > 0 && (_jsx(CamposRestringidosAlert, { modificaPrecio: documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio, modificaDescripcion: documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion })), _jsxs(DndContext, { sensors: sensors, collisionDetection: closestCenter, onDragStart: (event) => { setActiveId(Number(event.active.id)); }, onDragEnd: handleDragEnd, children: [_jsx(SortableContext, { items: detallesFiltrados.map((d) => d.id), strategy: verticalListSortingStrategy, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 1300 }, components: { body: { row: SortableRow } }, locale: {
                                                                emptyText: (_jsx("div", { style: { minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin registros" }) })),
                                                            } }) }), _jsx(DragOverlay, { children: activeId ? (_jsxs("div", { style: { padding: '8px 16px', background: '#fff', border: '2px solid #556ee6', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, width: 300 }, children: [_jsx(HolderOutlined, { style: { color: '#556ee6' } }), _jsx("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: detalles.find((d) => d.id === activeId)?.articulo || 'Arrastrando...' })] })) : null })] })] })),
                                },
                                {
                                    key: 'devoluciones',
                                    label: (_jsxs("span", { children: ["Devoluciones", detallesDevolucion.length > 0 && (_jsx(Badge, { count: detallesDevolucion.length, style: { marginLeft: 6, backgroundColor: '#556ee6' } }))] })),
                                    children: (_jsx(_Fragment, { children: detallesDevolucion.length === 0 ? (_jsx(Empty, { image: _jsx(RollbackOutlined, { style: { fontSize: 32, color: '#bfbfbf' } }), imageStyle: { height: 40 }, description: _jsxs("span", { children: ["Sin productos para devolver", _jsx("br", {}), _jsx(Typography.Text, { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Haga clic en el \u00EDcono \u21A9 de un detalle para agregar productos" })] }) })) : (_jsxs(_Fragment, { children: [_jsx(Alert, { type: "info", showIcon: true, style: { marginBottom: 12 }, message: "Al guardar este documento, se crear\u00E1 autom\u00E1ticamente una Devoluci\u00F3n de Compra (DVC) con los productos listados." }), _jsx(Table, { dataSource: detallesDevolucion, rowKey: "id", size: "small", pagination: false, scroll: { x: 700 }, columns: [
                                                        {
                                                            title: 'Código',
                                                            key: 'codigo',
                                                            width: 120,
                                                            fixed: 'left',
                                                            onCell: () => ({ style: { verticalAlign: 'top' } }),
                                                            render: (_, record) => (_jsxs("div", { children: [_jsx("div", { children: record.codigo }), record.referencia && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5 }, children: record.referencia }))] })),
                                                        },
                                                        {
                                                            title: 'Artículo',
                                                            key: 'articulo',
                                                            ellipsis: true,
                                                            onCell: () => ({ style: { verticalAlign: 'top' } }),
                                                            render: (_, record) => (_jsxs("div", { children: [_jsx("div", { children: toTitleCase(record.articulo || '') }), record.familia?.nombre && (_jsx(Tag, { style: { fontSize: 11 }, children: toTitleCase(record.familia.nombre) }))] })),
                                                        },
                                                        {
                                                            title: 'Cant. a devolver',
                                                            key: 'cantidad',
                                                            width: 110,
                                                            align: 'right',
                                                            onCell: () => ({ style: { verticalAlign: 'top' } }),
                                                            render: (_, record) => (_jsxs("div", { children: [_jsx("div", { children: formatNumber(record.cantidad || 0) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11 }, children: record.medida?.nombre || '' })] })),
                                                        },
                                                        {
                                                            title: 'Costo',
                                                            key: 'costo',
                                                            width: 110,
                                                            align: 'right',
                                                            responsive: ['md', 'lg', 'xl', 'xxl'],
                                                            render: (_, record) => formatNumber(record.costo || 0),
                                                        },
                                                        {
                                                            title: 'Total',
                                                            key: 'total',
                                                            width: 110,
                                                            align: 'right',
                                                            render: (_, record) => (_jsx(Typography.Text, { strong: true, children: formatNumber(record.total || 0) })),
                                                        },
                                                        {
                                                            title: '',
                                                            key: 'acciones',
                                                            width: 50,
                                                            render: (_, record) => (_jsx(Tooltip, { title: "Quitar de la lista", children: _jsx(Button, { type: "text", danger: true, size: "small", icon: _jsx(DeleteOutlined, {}), onClick: () => setDetallesDevolucion((prev) => prev.filter((d) => d.id !== record.id)) }) })),
                                                        },
                                                    ], footer: () => (_jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 }, children: [_jsx(Typography.Text, { className: "paces-text-secondary", children: "Total estimado a devolver:" }), _jsx(Typography.Text, { strong: true, style: { fontSize: 14 }, children: formatNumber(detallesDevolucion.reduce((s, d) => s + (d.total || 0), 0)) })] })) })] })) })),
                                },
                                {
                                    key: 'asientos',
                                    label: `Asientos (${asientosLocales.length || data?.asientos?.length || 0})`,
                                    children: (permisoModificarAsientos && estado === 0 && !selectedConcepto?.noAsientos) ? (_jsx(AsientosContableEditables, { asientos: asientosLocales.length > 0 ? asientosLocales : (data?.asientos || []), onChange: setAsientosLocales, editable: true, scroll: { x: 700 }, onGenerar: handleGenerarAsientos, generando: generandoAsientos })) : (_jsx(AsientosContableTable, { asientos: data?.asientos || [], scroll: { x: 800 } })),
                                },
                                {
                                    key: 'historial',
                                    label: `Historial (${data?.logs?.length || 0})`,
                                    children: (_jsx(LogTable, { dataSource: data?.logs || [], scroll: { x: 800 } })),
                                },
                            ] })] }) })) : (_jsxs("div", { children: [renderEncabezado(), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: [
                            {
                                key: 'detalles',
                                label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`,
                                children: (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, ref: agregarFilaRef, children: [_jsxs(Space, { children: [_jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: () => {
                                                                if (selectedOC) {
                                                                    setOcProductosModalOpen(true);
                                                                }
                                                                else {
                                                                    setProductoModalOpen(true);
                                                                }
                                                            }, children: "Agregar producto" }), _jsx(Button, { icon: _jsx(BarcodeOutlined, {}), onClick: () => setScannerModalOpen(true) }), _jsx(Button, { icon: _jsx(PercentageOutlined, {}), onClick: handleDescuentoGlobal, children: "Dto. global" })] }), _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { maxWidth: 250 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                                        setDetalleSearch(''); } })] }), (documentoConfig?.modificaPrecio === false || documentoConfig?.modificaDescripcion === false || data?.documento?.modificaPrecio === false || data?.documento?.modificaDescripcion === false) && detalles.length > 0 && (_jsx(CamposRestringidosAlert, { modificaPrecio: documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio, modificaDescripcion: documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion })), _jsxs(DndContext, { sensors: sensors, collisionDetection: closestCenter, onDragStart: (event) => { setActiveId(Number(event.active.id)); }, onDragEnd: handleDragEnd, children: [_jsx(SortableContext, { items: detallesFiltrados.map((d) => d.id), strategy: verticalListSortingStrategy, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 1300 }, components: { body: { row: SortableRow } } }) }), _jsx(DragOverlay, { children: activeId ? (_jsxs("div", { style: { padding: '8px 16px', background: '#fff', border: '2px solid #556ee6', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, width: 300 }, children: [_jsx(HolderOutlined, { style: { color: '#556ee6' } }), _jsx("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: detalles.find((d) => d.id === activeId)?.articulo || 'Arrastrando...' })] })) : null })] })] })),
                            },
                            {
                                key: 'devoluciones',
                                label: (_jsxs("span", { children: ["Devoluciones", detallesDevolucion.length > 0 && (_jsx(Badge, { count: detallesDevolucion.length, style: { marginLeft: 6, backgroundColor: '#556ee6' } }))] })),
                                children: (_jsx(_Fragment, { children: detallesDevolucion.length === 0 ? (_jsx(Empty, { image: _jsx(RollbackOutlined, { style: { fontSize: 32, color: '#bfbfbf' } }), imageStyle: { height: 40 }, description: _jsxs("span", { children: ["Sin productos para devolver", _jsx("br", {}), _jsx(Typography.Text, { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Haga clic en el \u00EDcono \u21A9 de un detalle para agregar productos" })] }) })) : (_jsxs(_Fragment, { children: [_jsx(Alert, { type: "info", showIcon: true, style: { marginBottom: 12 }, message: "Al guardar este documento, se crear\u00E1 autom\u00E1ticamente una Devoluci\u00F3n de Compra (DVC) con los productos listados." }), _jsx(Table, { dataSource: detallesDevolucion, rowKey: "id", size: "small", pagination: false, scroll: { x: 700 }, columns: [
                                                    {
                                                        title: 'Código',
                                                        key: 'codigo',
                                                        width: 120,
                                                        fixed: 'left',
                                                        onCell: () => ({ style: { verticalAlign: 'top' } }),
                                                        render: (_, record) => (_jsxs("div", { children: [_jsx("div", { children: record.codigo }), record.referencia && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5 }, children: record.referencia }))] })),
                                                    },
                                                    {
                                                        title: 'Artículo',
                                                        key: 'articulo',
                                                        ellipsis: true,
                                                        onCell: () => ({ style: { verticalAlign: 'top' } }),
                                                        render: (_, record) => (_jsxs("div", { children: [_jsx("div", { children: toTitleCase(record.articulo || '') }), record.familia?.nombre && (_jsx(Tag, { style: { fontSize: 11 }, children: toTitleCase(record.familia.nombre) }))] })),
                                                    },
                                                    {
                                                        title: 'Cant. a devolver',
                                                        key: 'cantidad',
                                                        width: 110,
                                                        align: 'right',
                                                        onCell: () => ({ style: { verticalAlign: 'top' } }),
                                                        render: (_, record) => (_jsxs("div", { children: [_jsx("div", { children: formatNumber(record.cantidad || 0) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11 }, children: record.medida?.nombre || '' })] })),
                                                    },
                                                    {
                                                        title: 'Costo',
                                                        key: 'costo',
                                                        width: 110,
                                                        align: 'right',
                                                        responsive: ['md', 'lg', 'xl', 'xxl'],
                                                        render: (_, record) => formatNumber(record.costo || 0),
                                                    },
                                                    {
                                                        title: 'Total',
                                                        key: 'total',
                                                        width: 110,
                                                        align: 'right',
                                                        render: (_, record) => (_jsx(Typography.Text, { strong: true, children: formatNumber(record.total || 0) })),
                                                    },
                                                    {
                                                        title: '',
                                                        key: 'acciones',
                                                        width: 50,
                                                        render: (_, record) => (_jsx(Tooltip, { title: "Quitar de la lista", children: _jsx(Button, { type: "text", danger: true, size: "small", icon: _jsx(DeleteOutlined, {}), onClick: () => setDetallesDevolucion((prev) => prev.filter((d) => d.id !== record.id)) }) })),
                                                    },
                                                ], footer: () => (_jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 }, children: [_jsx(Typography.Text, { className: "paces-text-secondary", children: "Total estimado a devolver:" }), _jsx(Typography.Text, { strong: true, style: { fontSize: 14 }, children: formatNumber(detallesDevolucion.reduce((s, d) => s + (d.total || 0), 0)) })] })) })] })) })),
                            },
                            {
                                key: 'asientos',
                                label: `Asientos (${asientosLocales.length || data?.asientos?.length || 0})`,
                                children: (permisoModificarAsientos && estado === 0 && !selectedConcepto?.noAsientos) ? (_jsx(AsientosContableEditables, { asientos: asientosLocales.length > 0 ? asientosLocales : (data?.asientos || []), onChange: setAsientosLocales, editable: true, scroll: { x: 700 }, onGenerar: handleGenerarAsientos, generando: generandoAsientos })) : (_jsx(AsientosContableTable, { asientos: data?.asientos || [], scroll: { x: 800 } })),
                            },
                            {
                                key: 'historial',
                                label: `Historial (${data?.logs?.length || 0})`,
                                children: (_jsx(LogTable, { dataSource: data?.logs || [], scroll: { x: 800 } })),
                            },
                        ] })] })), renderModalDevolucion(), (mode === 'crear' || esBorrador) && (_jsx(EntradaAlmacenGuide, { mode: mode, concepto: selectedConcepto, suplidor: selectedEntidad, ordenCompra: selectedOC, almacen: selectedAlmacen, detallesCount: detalles.length, ncf: ncfValue, conceptoRef: conceptoRef, suplidorRef: suplidorRef, ordenCompraRef: ordenCompraRef, almacenRef: almacenRef, agregarFilaRef: agregarFilaRef, ncfRef: ncfRef })), _jsx(ModalFechaVencimiento, { open: fechaVencimientoModal.open, onClose: () => setFechaVencimientoModal({ open: false, detalleId: 0 }), onFechaChange: handleFechaVencimiento })] }));
};
export default EntradaAlmacenFormulario;
