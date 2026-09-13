import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Dropdown, Alert, Popover, Empty, } from 'antd';
import { SaveOutlined, CloseOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, ClearOutlined, ExclamationCircleOutlined, EditOutlined, MoreOutlined, CalendarOutlined, HolderOutlined, } from '@ant-design/icons';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { facturaClienteApi } from '../../api/facturaClienteApi';
import { conceptosApi } from '../../api/conceptosApi';
import { productoApi } from '../../api/productoApi';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import ModalFechaVencimiento from '../../components/ModalFechaVencimiento/ModalFechaVencimiento';
import LogTable from '../../components/LogTable';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import BuscarEntidadSelect from '../../components/BuscarEntidadSelect/BuscarEntidadSelect';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import GuidePopover from '../../components/GuidePopover/GuidePopover';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import AsientosContableTable from '../../components/AsientosContableTable';
import { transaccionApi } from '../../api/transaccionApi';
import SeleccionarImpuestosModal from '../../components/SeleccionarImpuestosModal';
import { DragHandle, SortableRow, DragListenersContext } from '../../components/DragSortable';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useDocumentoConfig } from '../../hooks/useDocumentoConfig';
import { formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum } from '../../utils/estadoDocumento';
import CamposRestringidosAlert from '../../components/CamposRestringidosAlert';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
const { Text } = Typography;
const { TextArea } = Input;
// ===== Cálculo de fila para FFAC (Precio × Cantidad) =====
function calcularFila(fila) {
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
const esNcfValido = (ncf) => {
    if (!ncf)
        return true;
    const upper = ncf.toUpperCase();
    if (upper.startsWith('B'))
        return upper.length === 11;
    if (upper.startsWith('E'))
        return upper.length === 13;
    return false;
};
// ===== Componente principal =====
const FacturaClienteFormulario = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const screens = Grid.useBreakpoint();
    const mode = id ? 'editar' : 'crear';
    const { screenCode, documentCode } = useScreenConfig('FFAC');
    const documentoConfig = useDocumentoConfig(sucursalActiva, documentCode);
    const location = useLocation();
    const cloneData = location.state?.cloneData;
    const monedaDefault = getMonedaSucursalActiva();
    // ===== States =====
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState(null);
    const [detalles, setDetalles] = useState([]);
    const [clientesCache, setClientesCache] = useState([]);
    const [almacenesCache, setAlmacenesCache] = useState([]);
    const [selectedConcepto, setSelectedConcepto] = useState(null);
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [selectedAlmacen, setSelectedAlmacen] = useState(null);
    const [selectedTipo, setSelectedTipo] = useState(null);
    const [tiposCache, setTiposCache] = useState([]);
    const [productoModalOpen, setProductoModalOpen] = useState(false);
    const [detalleSearch, setDetalleSearch] = useState('');
    const [activeId, setActiveId] = useState(null);
    const [fechaVencimientoModal, setFechaVencimientoModal] = useState({ open: false, detalleId: 0 });
    const [asientosLocales, setAsientosLocales] = useState([]);
    const [impuestosFactura, setImpuestosFactura] = useState([]);
    const [modalImpuestosOpen, setModalImpuestosOpen] = useState(false);
    // Cache de medidas
    const [medidasCache, setMedidasCache] = useState([]);
    const [sucursalesCache, setSucursalesCache] = useState([]);
    const [selectedSucursal, setSelectedSucursal] = useState(null);
    // Refs para la guía
    const tipoRef = useRef(null);
    const conceptoRef = useRef(null);
    const clienteRef = useRef(null);
    const almacenRef = useRef(null);
    const agregarFilaRef = useRef(null);
    const sucursalRef = useRef(null);
    // Backup de impuestos para restaurar cuando el concepto deje de ser noImpuesto
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
    // ===== Estado para campos rápidos (NCF, Referencia, Tasa, Días Crédito) =====
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
    // ===== Watchers reactivos =====
    const ncfValue = Form.useWatch('ncf', form) || '';
    const refValue = Form.useWatch('referencia', form) || '';
    const tasaValue = Form.useWatch('tasa', form) ?? 1;
    const sinOC = true;
    const isLarge = screens.xxl === true;
    // ===== Determinar estado =====
    const estado = data?.estado ?? 0;
    const esCerrado = data?.periodo === 6;
    const esBorrador = estado === 0;
    const esAplicado = estado === 1;
    const esAnulado = estado === 3;
    // ===== Permisos especiales =====
    const usuario = useAuthStore((s) => s.usuario);
    const permisoModificarAsientos = usuario?.permisosEspeciales?.some((p) => p.codigo === 'pe_modificar_asientos' && p.valor === true) ?? false;
    const [generandoAsientos, setGenerandoAsientos] = useState(false);
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
    // Seleccionar sucursal activa por defecto en modo crear
    useEffect(() => {
        if (mode === 'crear' && sucursalesCache.length > 0 && !selectedSucursal) {
            const match = sucursalesCache.find((s) => String(s.sucursal ?? s.codigo ?? s.idExterno) === String(sucursalActiva));
            if (match) {
                setSelectedSucursal(match);
            }
        }
    }, [sucursalesCache, mode, sucursalActiva, selectedSucursal]);
    // ===== Procesar cloneData =====
    useEffect(() => {
        if (mode !== 'crear' || !cloneData)
            return;
        // Poblar estados
        setSelectedConcepto(cloneData.concepto || null);
        setSelectedCliente(cloneData.cliente || null);
        setSelectedAlmacen(cloneData.almacen || null);
        setSelectedTipo(cloneData.tipo || null);
        setSelectedSucursal(cloneData.sucursal || null);
        setDetalles((cloneData.detalles || []).map((d) => calcularFila({
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
                .then((res) => setClientesCache(Array.isArray(res) ? res : []))
                .catch((err) => console.warn('Error al cargar clientes cache en clone', err));
        }
    }, [mode, cloneData, sucursalActiva, form]);
    // ===== Cargar datos si es modo editar =====
    useEffect(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoading(true);
        facturaClienteApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            // Mapear de FacturaClienteDTO a FacturaClienteFullDTO
            const full = {
                id: res.id,
                fechaDocumento: res.fechaDocumento,
                fechaVencimiento: res.fechaVencimiento || '',
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
                tipo: res.tipo || null,
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
            setImpuestosFactura(full.impuestosFactura || []);
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
            if (full.sucursal) {
                setSelectedSucursal(full.sucursal);
            }
            // Cargar clientes según el concepto
            if (full.concepto?.codigo) {
                facturaClienteApi.obtenerClientes(sucursalActiva)
                    .then((res) => setClientesCache(Array.isArray(res) ? res : []))
                    .catch((err) => console.warn('Error al cargar clientes cache en editar', err));
            }
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
            message.error(msg);
            setLoadingError(true);
            navigate('/FFAC', { replace: true });
        })
            .finally(() => setLoading(false));
    }, [mode, id, sucursalActiva, form, navigate]);
    // ===== Handler del modal de impuestos compartido =====
    const handleConfirmarImpuestos = (items) => {
        const mapeados = items.map((i) => ({
            id: i.codigo,
            codigo: i.codigo,
            nombre: i.nombre,
            porcentaje: i.porcentaje,
            tipo: i.tipo,
            monto: i.monto,
            impuesto: { nombre: i.nombre, porcentaje: i.porcentaje },
        }));
        setImpuestosFactura((prev) => {
            const existentes = new Map(prev.map((i) => [i.codigo, i]));
            for (const n of mapeados) {
                const existente = existentes.get(n.codigo);
                if (existente) {
                    existentes.set(n.codigo, { ...existente, monto: existente.monto ?? n.monto });
                }
                else {
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
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: '¿Está seguro que desea cancelar los cambios realizados?',
            okText: 'Sí, cancelar',
            cancelText: 'No, continuar editando',
            okButtonProps: { danger: true },
            onOk: () => {
                setEditingField(null);
                if (mode === 'crear') {
                    navigate('/FFAC', { replace: true });
                }
                else {
                    if (id) {
                        setLoading(true);
                        facturaClienteApi.obtenerPorId(sucursalActiva, parseInt(id))
                            .then((res) => {
                            const full = {
                                id: res.id,
                                fechaDocumento: res.fechaDocumento,
                                fechaVencimiento: res.fechaVencimiento || '',
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
                                tipo: res.tipo || null,
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
                            setImpuestosFactura(full.impuestosFactura || []);
                            setSelectedConcepto(full.concepto);
                            setSelectedCliente(full.cliente);
                            setSelectedAlmacen(full.almacen);
                            setSelectedTipo(full.tipo);
                            setSelectedSucursal(full.sucursal || null);
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
                                    .then((res) => setClientesCache(Array.isArray(res) ? res : []))
                                    .catch((err) => console.warn('Error al cargar clientes cache al recargar', err));
                            }
                        })
                            .catch((err) => {
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
    const validarFormulario = () => {
        const values = form.getFieldsValue();
        if (!selectedConcepto)
            return 'Debe elegir un Concepto para poder continuar';
        if (!values.cliente && !selectedCliente)
            return 'Debe elegir un Cliente para poder continuar';
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
        if (detalles.length === 0)
            return 'No se puede crear una factura sin detalle.';
        if (!detalles.some((d) => (d.cantidad || 0) > 0))
            return 'Debe tener al menos un detalle con cantidad > 0';
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
    const construirDTO = () => {
        const values = form.getFieldsValue();
        const base = data || {};
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
            }
            else {
                await facturaClienteApi.actualizar(sucursalActiva, dto);
                message.success('Factura de cliente actualizada exitosamente');
                navigate(`/FFAC/${id}`, { replace: true });
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
            if (!prev)
                return prev;
            return { ...prev, moneda: monedaObj };
        });
        // Cargar clientes
        facturaClienteApi.obtenerClientes(sucursalActiva)
            .then((ents) => setClientesCache(Array.isArray(ents) ? ents : []))
            .catch((err) => console.warn('Error al cargar clientes cache al cambiar concepto', err));
        // Si el concepto es NoImpuesto y hay detalles con impuestos, limpiarlos
        const prevNoImpuesto = selectedConcepto?.noImpuesto;
        if (concepto.noImpuesto) {
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
    const handleDetalleUpdateValue = (id, field, value) => {
        setDetalles((prev) => prev.map((d) => (d.id !== id ? d : { ...d, [field]: value })));
    };
    const handleDetalleCalculate = (id, field, value) => {
        setDetalles((prev) => prev.map((d) => {
            if (d.id !== id)
                return d;
            const updated = { ...d, [field]: value };
            return calcularFila(updated);
        }));
    };
    const handleProductoSelect = (producto) => {
        const filaVaciaIdx = detalles.findIndex((d) => !d.codigo);
        if (filaVaciaIdx === -1) {
            const nuevaFila = filaVacia();
            const nuevoId = -(detalles.length + 1);
            setDetalles((prev) => {
                const filled = {
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
        }
        else {
            setDetalles((prev) => prev.map((d) => {
                if (d.id !== detalles[filaVaciaIdx].id)
                    return d;
                const filled = {
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
            }));
        }
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
    // ===== Funciones auxiliares para asientos =====
    function esDebito(tipo) { return tipo === 'D' || tipo === 0; }
    function esCredito(tipo) { return tipo === 'C' || tipo === 1; }
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
    const handleRefresh = useCallback(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoadingError(false);
        setLoading(true);
        facturaClienteApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            const full = {
                id: res.id, fechaDocumento: res.fechaDocumento,
                fechaVencimiento: res.fechaVencimiento || '', noDocumento: res.noDocumento,
                estado: res.estado, periodo: res.periodo, ncf: res.ncf || '', nota: res.nota || '',
                referencia: res.referencia || '', tasa: res.tasa || 1, diasCredito: res.diasCredito || 0,
                concepto: res.concepto || null, cliente: res.cliente || null, almacen: res.almacen || null,
                tipo: res.tipo || null, moneda: res.moneda || null, documento: res.documento,
                subTotal: res.subTotal, descuento: res.descuento, impuestos: res.impuestos, total: res.total,
                detalles: (res.detalles || []).map((d) => ({
                    ...d, porcentajeImpuesto: d.porcentajeImpuesto || (d.impuesto?.porcentaje ?? 0),
                    tieneVencimiento: d.tieneVencimiento ?? false,
                })),
                asientos: res.asientos || [], logs: res.logs || [],
            };
            setData(full);
            setDetalles(full.detalles);
            setAsientosLocales(full.asientos || []);
            setImpuestosFactura(full.impuestosFactura || []);
            setSelectedConcepto(full.concepto);
            setSelectedCliente(full.cliente);
            setSelectedAlmacen(full.almacen);
            setSelectedTipo(full.tipo);
            setSelectedSucursal(full.sucursal || null);
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
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al recargar';
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, form, mode]);
    // ===== Loading state =====
    if (loading) {
        return _jsx(LoadingSpinner, { mensaje: "Cargando documento..." });
    }
    // ===== Estado info =====
    const estadoInfo = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Borrador', color: 'default' };
    // ===== Grid de detalles editable =====
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
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx("div", { children: record.codigo || '-' }), record.referencia && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5 }, children: record.referencia }))] })),
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
                    return (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx(Input, { size: "small", style: { width: '100%' }, value: fila.articulo || '', onChange: (e) => handleDetalleUpdateValue(fila.id, 'articulo', e.target.value) }), _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }, children: [fila.familia?.nombre ? _jsx(Tag, { style: { fontSize: 11, lineHeight: '18px', padding: '0 6px' }, children: toTitleCase(fila.familia.nombre) }) : null, fila.fechaVencimiento && _jsxs("span", { children: ["V: ", formatDate(fila.fechaVencimiento)] })] })] }));
                }
                return (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx("div", { children: toTitleCase(fila.articulo || '') }), _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }, children: [fila.familia?.nombre ? _jsx(Tag, { style: { fontSize: 11, lineHeight: '18px', padding: '0 6px' }, children: toTitleCase(fila.familia.nombre) }) : null, fila.fechaVencimiento && _jsxs("span", { children: ["V: ", formatDate(fila.fechaVencimiento)] })] })] }));
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
            render: (_, _record, idx) => (_jsxs("div", { children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0.01, step: 0.01, precision: 2, controls: false, value: detalles[idx]?.cantidad, onChange: (val) => handleDetalleUpdateValue(detalles[idx].id, 'cantidad', val || 0), onBlur: () => handleDetalleCalculate(detalles[idx].id, 'cantidad', detalles[idx]?.cantidad || 0), onPressEnter: () => handleDetalleCalculate(detalles[idx].id, 'cantidad', detalles[idx]?.cantidad || 0) }), !sinOC && detalles[idx]?.medida?.nombre && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5, marginTop: 2 }, children: toTitleCase(detalles[idx].medida.nombre) }))] })),
        },
        ...(sinOC ? [{
                title: 'Medida',
                key: 'medida',
                width: 160,
                onCell: () => ({ style: { verticalAlign: 'top' } }),
                render: (_, record, _idx) => {
                    const curId = record.medida?.idExterno ?? record.medida?.id;
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
                        }, children: medidasCache.map((m) => (_jsx(Select.Option, { value: m.idExterno, children: toTitleCase(m.nombre) }, m.idExterno))) }, medidasCache.length));
                },
            }] : []),
        {
            title: 'Precio',
            dataIndex: 'precio',
            key: 'precio',
            width: 130,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['md', 'lg', 'xl', 'xxl'],
            shouldCellUpdate: (record, prevRecord) => record.precio !== prevRecord.precio || record.porcentajeDescuento !== prevRecord.porcentajeDescuento || record.cantidad !== prevRecord.cantidad || record.medida?.factor !== prevRecord.medida?.factor || record.modificaPrecio !== prevRecord.modificaPrecio,
            render: (_, _record, idx) => {
                const fila = detalles[idx];
                if (!fila)
                    return null;
                const precioBase = Number(fila.precio) || 0;
                const pctDesc = Number(fila.porcentajeDescuento) || 0;
                const factor = Number(fila.medida?.factor) || 1;
                const precioConDescuento = precioBase - ((precioBase * pctDesc) / 100);
                const precioUnitario = precioConDescuento / factor;
                // Jerarquía Precio: 1) Documento.modificaPrecio? 2) Producto.modificaPrecio?
                const docPermiteEditar = documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio ?? true;
                if (docPermiteEditar) {
                    return (_jsxs("div", { children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, step: 0.01, precision: 2, controls: false, value: fila.precio, onChange: (val) => handleDetalleUpdateValue(fila.id, 'precio', val || 0), onBlur: () => handleDetalleCalculate(fila.id, 'precio', fila.precio || 0), onPressEnter: () => handleDetalleCalculate(fila.id, 'precio', fila.precio || 0) }), _jsxs("div", { style: { fontSize: 11, lineHeight: 1.5, color: '#999' }, children: [formatNumber(precioUnitario), " \u00D7 ", factor] })] }));
                }
                return (_jsxs("div", { children: [_jsx(Text, { children: formatNumber(precioBase) }), _jsxs("div", { style: { fontSize: 11, lineHeight: 1.5, color: '#999' }, children: [formatNumber(precioUnitario), " \u00D7 ", factor] })] }));
            },
        },
        {
            title: '% Desc',
            key: 'porcentajeDescuento',
            width: 90,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, _record, idx) => (_jsx(InputNumber, { size: "small", style: { width: '100%' }, min: 0, max: 100, step: 0.01, precision: 2, value: detalles[idx]?.porcentajeDescuento, onChange: (val) => handleDetalleUpdateValue(detalles[idx].id, 'porcentajeDescuento', val || 0), onBlur: () => handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', detalles[idx]?.porcentajeDescuento || 0), onPressEnter: () => handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', detalles[idx]?.porcentajeDescuento || 0), addonAfter: "%" })),
        },
        {
            title: 'Descuento',
            key: 'descuento',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => (_jsx("div", { children: _jsx(Text, { children: formatNumber(record.descuento || 0) }) })),
        },
        {
            title: 'SubTotal',
            dataIndex: 'subTotal',
            key: 'subTotal',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => (_jsx(Text, { children: formatNumber(record.subTotal || 0) })),
        },
        {
            title: 'Impuestos',
            key: 'impuestos',
            width: 140,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => (_jsxs("div", { children: [_jsx("div", { children: formatNumber(record.impuestos || 0) }), record.impuesto?.nombre && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5 }, children: toTitleCase(record.impuesto.nombre) }))] })),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsx(Text, { strong: true, children: formatNumber(record.total || 0) })),
        },
        {
            title: '',
            key: 'acciones',
            width: 50,
            onCell: () => ({ style: { paddingRight: 8 } }),
            render: (_, _record, idx) => {
                const items = [
                    {
                        key: 'eliminar',
                        label: 'Eliminar',
                        icon: _jsx(DeleteOutlined, {}),
                        danger: true,
                        onClick: () => handleEliminarFila(detalles[idx].id),
                    },
                ];
                if (detalles[idx]?.tieneVencimiento) {
                    items.unshift({
                        key: 'vencimiento',
                        label: detalles[idx].fechaVencimiento ? `Venc: ${formatDate(detalles[idx].fechaVencimiento)}` : 'Fecha Vencimiento',
                        icon: _jsx(CalendarOutlined, {}),
                        danger: false,
                        onClick: () => setFechaVencimientoModal({ open: true, detalleId: detalles[idx].id }),
                    });
                }
                return (_jsx(Dropdown, { menu: { items }, trigger: ['click'], children: _jsx(Button, { type: "text", size: "small", icon: _jsx(MoreOutlined, {}) }) }));
            },
        },
    ];
    // ===== Encabezado del formulario =====
    const documentoTieneTipos = tiposCache.length > 0;
    const renderEncabezado = () => (_jsx(Card, { className: "paces-card", size: "small", title: "Datos Generales", extra: _jsx(EstadoTag, { estado: estado, periodo: data?.periodo }), style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: 16, children: [_jsx(Col, { xs: 24, xxl: 18, children: _jsx(Form, { form: form, layout: "vertical", size: "middle", style: { paddingTop: 24 }, children: _jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, sm: 12, lg: 9, children: _jsx("div", { ref: tipoRef, style: { display: 'flex', alignItems: 'flex-end', gap: 0 }, children: _jsx("div", { style: { flex: 1 }, children: _jsx(Form.Item, { name: "tipo", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Tipo Documento", children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "label", labelInValue: true, value: selectedTipo ? { value: selectedTipo.codigo, label: `${selectedTipo.codigo} - ${toTitleCase(selectedTipo.nombre)}` } : undefined, placeholder: " ", onChange: (val) => {
                                                            const t = tiposCache.find((tc) => tc.codigo === val?.value);
                                                            setSelectedTipo(t || null);
                                                            form.setFieldsValue({ tipo: val?.value || '' });
                                                        }, onClear: () => {
                                                            setSelectedTipo(null);
                                                            form.setFieldsValue({ tipo: '' });
                                                        }, options: tiposCache.map((tc) => ({
                                                            value: tc.codigo,
                                                            label: `${tc.codigo} - ${toTitleCase(tc.nombre)}`,
                                                        })) }) }) }) }) }) }), _jsxs(Col, { xs: 24, sm: 12, lg: 15, children: [_jsxs("div", { ref: conceptoRef, children: [_jsx(FloatingField, { label: "Concepto", required: true, children: _jsx(Input, { placeholder: " ", value: selectedConcepto ? `${selectedConcepto.codigo || ''} - ${toTitleCase(selectedConcepto.nombre)}` : conceptoSearchText, readOnly: true, disabled: documentoTieneTipos && !selectedTipo, suffix: _jsxs(Space, { size: 4, children: [_jsx(SearchOutlined, { onClick: () => (!documentoTieneTipos || selectedTipo) && handleConceptoSearchClick(), style: { cursor: (!documentoTieneTipos || selectedTipo) ? 'pointer' : 'not-allowed', color: 'rgba(0,0,0,0.45)' } }), selectedConcepto && _jsx(ClearOutlined, { onClick: handleConceptoClear, style: { cursor: 'pointer' } })] }), onClick: () => (!documentoTieneTipos || selectedTipo) && handleConceptoSearchClick() }) }), _jsx(ConceptoInfoLabel, { concepto: selectedConcepto })] }), _jsx(Form.Item, { name: "concepto", hidden: true, children: _jsx(Input, {}) })] }), _jsx(Col, { xs: 24, sm: 12, lg: 9, children: _jsx(Form.Item, { name: "fechaDocumento", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Fecha Documento", required: true, children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabledDate: (current) => {
                                                    if (!current)
                                                        return false;
                                                    const cierre = fechasCierre?.[sucursalActiva];
                                                    if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                                        return true;
                                                    const cierreInv = fechasCierreInv?.[sucursalActiva];
                                                    if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                                        return true;
                                                    return false;
                                                } }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 15, children: _jsx("div", { ref: clienteRef, children: _jsx(Form.Item, { name: "cliente", required: true, style: { marginBottom: 0 }, children: _jsx(BuscarEntidadSelect, { entidades: clientesCache, value: selectedCliente?.codigo, label: "Cliente", required: true, onChange: (codigo, entidad) => {
                                                    setSelectedCliente(entidad || null);
                                                    // FC17 - Si el cliente es exento de impuestos, limpiar
                                                    if (entidad?.exentoImpuesto && detalles.some((d) => (d.impuesto?.porcentaje || 0) > 0)) {
                                                        message.warning('El cliente está exento de impuestos. Se eliminarán los impuestos de los detalles.');
                                                        setDetalles((prev) => prev.map((d) => {
                                                            const limpio = { ...d, impuesto: undefined, impuestos: 0 };
                                                            return calcularFila(limpio);
                                                        }));
                                                    }
                                                } }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 9, children: _jsx("div", { ref: sucursalRef, children: _jsx(Form.Item, { name: "sucursal", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Sucursal", children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "label", labelInValue: true, value: selectedSucursal ? (() => {
                                                        const match = sucursalesCache.find((s) => String(s.sucursal ?? s.codigo) === String(selectedSucursal.sucursal ?? selectedSucursal.codigo));
                                                        return {
                                                            value: String(selectedSucursal.sucursal ?? selectedSucursal.codigo),
                                                            label: toTitleCase(match?.nombre || selectedSucursal.nombre || '')
                                                        };
                                                    })() : undefined, onChange: (val) => {
                                                        const suc = sucursalesCache.find((s) => String(s.sucursal ?? s.codigo) === val?.value);
                                                        setSelectedSucursal(suc || null);
                                                    }, placeholder: "Seleccionar sucursal", options: sucursalesCache.map((s) => ({
                                                        value: String(s.sucursal ?? s.codigo),
                                                        label: toTitleCase(s.nombre || ''),
                                                    })) }) }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 15, children: _jsx(Form.Item, { name: "almacen", required: tieneProductos, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Almac\u00E9n", required: tieneProductos, ref: almacenRef, children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", onChange: (val) => {
                                                    const alm = almacenesCache.find((a) => a.codigo === val);
                                                    setSelectedAlmacen(alm || null);
                                                }, children: almacenesCache.map((alm) => (_jsx(Select.Option, { value: alm.codigo, children: toTitleCase(alm.nombre) }, alm.codigo))) }) }) }) }), _jsxs(Col, { xs: 24, children: [_jsx("div", { style: { marginBottom: 16 }, children: _jsxs(Space, { size: [8, 8], wrap: true, children: [_jsx("div", { children: editingField === 'ncf' ? (_jsx(Input, { size: "small", style: { width: 200 }, placeholder: "NCF", maxLength: 19, autoFocus: true, defaultValue: editingValueRef.current, onChange: (e) => { editingValueRef.current = e.target.value; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                                if (e.key === 'Escape') {
                                                                    e.stopPropagation();
                                                                    cancelFieldEditor();
                                                                }
                                                            } })) : ncfValue ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => openFieldEditor('ncf'), children: ["NCF: ", ncfValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => openFieldEditor('ncf'), children: [_jsx(PlusOutlined, {}), " NCF"] })) }), editingField === 'referencia' ? (_jsx(Input, { size: "small", style: { width: 200 }, placeholder: "Referencia", autoFocus: true, defaultValue: editingValueRef.current, onChange: (e) => { editingValueRef.current = e.target.value; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                            if (e.key === 'Escape') {
                                                                e.stopPropagation();
                                                                cancelFieldEditor();
                                                            }
                                                        } })) : refValue ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => openFieldEditor('referencia'), children: ["Ref: ", refValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => openFieldEditor('referencia'), children: [_jsx(PlusOutlined, {}), " Referencia"] })), editingField === 'tasa' ? (_jsx(InputNumber, { size: "small", style: { width: 120 }, min: 0, step: 0.01, placeholder: "Tasa", autoFocus: true, defaultValue: editingValueRef.current, onChange: (val) => { editingValueRef.current = val ?? 1; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                            if (e.key === 'Escape') {
                                                                e.stopPropagation();
                                                                cancelFieldEditor();
                                                            }
                                                        } })) : tasaValue !== 1 ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => openFieldEditor('tasa'), children: ["Tasa: ", tasaValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => openFieldEditor('tasa'), children: [_jsx(PlusOutlined, {}), " Tasa"] }))] }) }), _jsx(Form.Item, { name: "ncf", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "referencia", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "tasa", hidden: true, children: _jsx(InputNumber, {}) }), _jsx(Form.Item, { name: "moneda", hidden: true, children: _jsx(Input, {}) })] }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "nota", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Nota", children: _jsx(TextArea, { rows: 3 }) }) }) })] }) }) }), _jsx(Col, { xs: 24, xxl: 6, children: _jsx("div", { style: { marginTop: 24 }, children: _jsx(TotalesCard, { subTotal: totales.subTotal, descuento: totales.descuento, impuestos: totales.impuestos, total: totales.total, hideTitle: true, monedaSimbolo: data?.moneda?.simbolo || selectedConcepto?.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: data?.moneda?.nombre || selectedConcepto?.moneda?.nombre || monedaDefault.nombre, tasa: tasaValue ?? data?.tasa ?? 1 }) }) })] }) }));
    // ===== Columnas de impuestos =====
    const impuestoColumns = [
        {
            title: 'Tipo',
            dataIndex: 'tipo',
            key: 'tipo',
            width: 120,
            render: (v) => _jsx(Text, { children: v || '-' }),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            ellipsis: true,
            render: (v) => _jsx(Text, { children: v || '-' }),
        },
        {
            title: '%',
            dataIndex: 'porcentaje',
            key: 'porcentaje',
            width: 80,
            align: 'right',
            render: (v) => _jsx(Text, { children: v != null ? `${v}%` : '-' }),
        },
        {
            title: 'Monto',
            dataIndex: 'monto',
            key: 'monto',
            width: 140,
            align: 'right',
            render: (_, _record, idx) => (_jsx(InputNumber, { size: "small", style: { width: 120 }, min: 0, step: 0.01, precision: 2, value: impuestosFactura[idx]?.monto, onChange: (val) => {
                    setImpuestosFactura((prev) => {
                        const next = [...prev];
                        next[idx] = { ...next[idx], monto: val || 0 };
                        return next;
                    });
                } })),
        },
        {
            title: '',
            key: 'accion',
            width: 50,
            render: (_, record, idx) => (_jsx(Button, { type: "text", danger: true, size: "small", icon: _jsx(DeleteOutlined, {}), onClick: () => {
                    setImpuestosFactura((prev) => prev.filter((_, i) => i !== idx));
                } })),
        },
    ];
    return (_jsxs("div", { children: [_jsx(FormularioToolbar, { saving: saving, estado: estado, periodo: data?.periodo, onGuardar: handleGuardar, onCancelar: handleCancelar }), loadingError && (_jsx(Alert, { message: "Error al cargar formulario de factura de cliente", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(BuscarConceptoModal, { open: conceptoModalOpen, onClose: () => setConceptoModalOpen(false), onSelect: handleConceptoSelect, sucursal: sucursalActiva, documento: documentCode, tipo: selectedTipo?.codigo, tipoEntidad: "CLI" }), _jsx(BuscarProductoModal, { open: productoModalOpen, onClose: () => setProductoModalOpen(false), onSelect: handleProductoSelect, mode: "venta" }), _jsx(SeleccionarImpuestosModal, { open: modalImpuestosOpen, onClose: () => setModalImpuestosOpen(false), onConfirm: handleConfirmarImpuestos, tipoEntidad: "CLI", sucursal: sucursalActiva, existentes: impuestosFactura.map((i) => ({
                    codigo: i.codigo || '',
                    nombre: i.nombre || '',
                    porcentaje: i.porcentaje || 0,
                    tipo: i.tipo || 'Impuesto',
                    monto: i.monto,
                })) }), isLarge ? (_jsx(Row, { gutter: 16, children: _jsxs(Col, { xxl: 24, children: [renderEncabezado(), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: [
                                {
                                    key: 'detalles',
                                    label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`,
                                    children: (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, ref: agregarFilaRef, children: [_jsxs(Space, { children: [_jsx(Button, { type: "dashed", icon: _jsx(PlusOutlined, {}), onClick: handleAgregarFila, children: "Agregar fila" }), _jsx(Button, { icon: _jsx(SearchOutlined, {}), onClick: () => setProductoModalOpen(true), children: "Buscar Producto" })] }), _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { maxWidth: 250 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                                            setDetalleSearch(''); } })] }), (documentoConfig?.modificaPrecio === false || documentoConfig?.modificaDescripcion === false || data?.documento?.modificaPrecio === false || data?.documento?.modificaDescripcion === false) && detalles.length > 0 && (_jsx(CamposRestringidosAlert, { modificaPrecio: documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio, modificaDescripcion: documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion })), _jsxs(DndContext, { sensors: sensors, collisionDetection: closestCenter, onDragStart: (event) => { setActiveId(event.active.id); }, onDragEnd: handleDragEnd, children: [_jsx(SortableContext, { items: detallesFiltrados.map((d) => d.id), strategy: verticalListSortingStrategy, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 1300 }, components: { body: { row: SortableRow } }, locale: {
                                                                emptyText: (_jsx("div", { style: { minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin registros" }) })),
                                                            } }) }), _jsx(DragOverlay, { children: activeId ? (_jsxs("div", { style: { padding: '8px 16px', background: '#fff', border: '2px solid #556ee6', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, width: 300 }, children: [_jsx(HolderOutlined, { style: { color: '#556ee6' } }), _jsx("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: detalles.find((d) => d.id === activeId)?.articulo || 'Arrastrando...' })] })) : null })] })] })),
                                },
                                {
                                    key: 'impuestos',
                                    label: `Impuestos (${impuestosFactura.length})`,
                                    children: (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 8 }, children: [_jsx(Button, { type: "primary", ghost: true, icon: _jsx(SearchOutlined, {}), onClick: () => setModalImpuestosOpen(true), children: "Seleccionar del cat\u00E1logo" }), impuestosFactura.length > 0 && (_jsx(Button, { type: "link", danger: true, style: { marginLeft: 8 }, onClick: () => setImpuestosFactura([]), children: "Limpiar todos" }))] }), _jsx(Table, { dataSource: impuestosFactura, columns: impuestoColumns, rowKey: (r) => r.id || r.codigo || Math.random(), size: "small", pagination: false, scroll: { x: 600 }, locale: { emptyText: 'Sin impuestos seleccionados' } })] })),
                                },
                                {
                                    key: 'asientos',
                                    label: `Asientos (${asientosLocales.length || data?.asientos?.length || 0})`,
                                    children: (permisoModificarAsientos && estado === 0 && !selectedConcepto?.noAsientos) ? (_jsx(AsientosContableEditables, { asientos: asientosLocales.length > 0 ? asientosLocales : (data?.asientos || []), onChange: setAsientosLocales, editable: true, scroll: { x: 900 }, onGenerar: handleGenerarAsientos, generando: generandoAsientos })) : (_jsx(AsientosContableTable, { asientos: data?.asientos || [], scroll: { x: 900 } })),
                                },
                                ...(data?.logs && data.logs.length > 0
                                    ? [{
                                            key: 'historial',
                                            label: `Historial (${data?.logs?.length || 0})`,
                                            children: (_jsx(LogTable, { dataSource: data?.logs || [], scroll: { x: 900 } })),
                                        }]
                                    : []),
                            ] })] }) })) : (_jsxs("div", { children: [renderEncabezado(), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: [
                            {
                                key: 'detalles',
                                label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`,
                                children: (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, ref: agregarFilaRef, children: [_jsxs(Space, { children: [_jsx(Button, { type: "dashed", icon: _jsx(PlusOutlined, {}), onClick: handleAgregarFila, children: "Agregar fila" }), _jsx(Button, { icon: _jsx(SearchOutlined, {}), onClick: () => setProductoModalOpen(true), children: "Buscar Producto" })] }), _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { maxWidth: 250 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                                        setDetalleSearch(''); } })] }), (documentoConfig?.modificaPrecio === false || documentoConfig?.modificaDescripcion === false || data?.documento?.modificaPrecio === false || data?.documento?.modificaDescripcion === false) && detalles.length > 0 && (_jsx(CamposRestringidosAlert, { modificaPrecio: documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio, modificaDescripcion: documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion })), _jsxs(DndContext, { sensors: sensors, collisionDetection: closestCenter, onDragStart: (event) => { setActiveId(event.active.id); }, onDragEnd: handleDragEnd, children: [_jsx(SortableContext, { items: detallesFiltrados.map((d) => d.id), strategy: verticalListSortingStrategy, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 1300 }, components: { body: { row: SortableRow } }, locale: {
                                                            emptyText: (_jsx("div", { style: { minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin registros" }) })),
                                                        } }) }), _jsx(DragOverlay, { children: activeId ? (_jsxs("div", { style: { padding: '8px 16px', background: '#fff', border: '2px solid #556ee6', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, width: 300 }, children: [_jsx(HolderOutlined, { style: { color: '#556ee6' } }), _jsx("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: detalles.find((d) => d.id === activeId)?.articulo || 'Arrastrando...' })] })) : null })] })] })),
                            },
                            {
                                key: 'impuestos',
                                label: `Impuestos (${impuestosFactura.length})`,
                                children: (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 8 }, children: [_jsx(Button, { type: "primary", ghost: true, icon: _jsx(SearchOutlined, {}), onClick: () => setModalImpuestosOpen(true), children: "Seleccionar del cat\u00E1logo" }), impuestosFactura.length > 0 && (_jsx(Button, { type: "link", danger: true, style: { marginLeft: 8 }, onClick: () => setImpuestosFactura([]), children: "Limpiar todos" }))] }), _jsx(Table, { dataSource: impuestosFactura, columns: impuestoColumns, rowKey: (r) => r.id || r.codigo || Math.random(), size: "small", pagination: false, scroll: { x: 600 }, locale: { emptyText: 'Sin impuestos seleccionados' } })] })),
                            },
                            {
                                key: 'asientos',
                                label: `Asientos (${asientosLocales.length || data?.asientos?.length || 0})`,
                                children: (permisoModificarAsientos && estado === 0 && !selectedConcepto?.noAsientos) ? (_jsx(AsientosContableEditables, { asientos: asientosLocales.length > 0 ? asientosLocales : (data?.asientos || []), onChange: setAsientosLocales, editable: true, scroll: { x: 900 }, onGenerar: handleGenerarAsientos, generando: generandoAsientos })) : (_jsx(AsientosContableTable, { asientos: data?.asientos || [], scroll: { x: 900 } })),
                            },
                            ...(data?.logs && data.logs.length > 0
                                ? [{
                                        key: 'historial',
                                        label: `Historial (${data?.logs?.length || 0})`,
                                        children: (_jsx(LogTable, { dataSource: data?.logs || [], scroll: { x: 900 } })),
                                    }]
                                : []),
                        ] })] })), _jsx(ModalFechaVencimiento, { open: fechaVencimientoModal.open, onClose: () => setFechaVencimientoModal({ open: false, detalleId: 0 }), onFechaChange: handleFechaVencimiento }), (mode === 'crear' || esBorrador) && (_jsx(FacturaClienteGuide, { mode: mode, tipo: selectedTipo, concepto: selectedConcepto, almacen: selectedAlmacen, cliente: selectedCliente, detallesCount: detalles.length, tieneProductos: tieneProductos, tipoRef: tipoRef, conceptoRef: conceptoRef, almacenRef: almacenRef, clienteRef: clienteRef, agregarFilaRef: agregarFilaRef, sucursal: selectedSucursal, sucursalRef: sucursalRef }))] }));
};
const FacturaClienteGuide = ({ tipo, concepto, almacen, cliente, detallesCount, tieneProductos, tipoRef, conceptoRef, almacenRef, clienteRef, agregarFilaRef, sucursal, sucursalRef, }) => {
    const [open, setOpen] = useState(false);
    const dismissedStepRef = useRef(null);
    const currentStepRef = useRef(null);
    const getCurrentStep = useCallback(() => {
        const steps = [
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
        if (!sucursal)
            return steps[0];
        if (!tipo)
            return steps[1];
        if (!concepto)
            return steps[2];
        if (!cliente)
            return steps[3];
        if (tieneProductos && !almacen)
            return steps[4];
        if (detallesCount === 0)
            return steps[5];
        return null;
    }, [tipo, concepto, almacen, cliente, detallesCount, tieneProductos, sucursal, tipoRef, conceptoRef, almacenRef, clienteRef, agregarFilaRef, sucursalRef]);
    currentStepRef.current = getCurrentStep();
    useEffect(() => {
        const current = getCurrentStep();
        if (current) {
            if (dismissedStepRef.current !== current.key) {
                setOpen(true);
            }
        }
        else {
            setOpen(false);
            dismissedStepRef.current = null;
        }
    }, [getCurrentStep]);
    const currentStep = getCurrentStep();
    if (!currentStep)
        return null;
    return (_jsx(GuidePopover, { title: currentStep.title, description: currentStep.description, targetElement: currentStep.target(), open: open, onClose: () => { setOpen(false); dismissedStepRef.current = currentStepRef.current?.key || ''; } }));
};
export default FacturaClienteFormulario;
