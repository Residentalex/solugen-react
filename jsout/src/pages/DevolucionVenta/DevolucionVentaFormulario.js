import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Alert, Dropdown, Empty, } from 'antd';
import { SaveOutlined, CloseOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, ClearOutlined, ExclamationCircleOutlined, MoreOutlined, CheckCircleOutlined, CloseCircleOutlined, RedoOutlined, RollbackOutlined, HolderOutlined, EditOutlined, } from '@ant-design/icons';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { devolucionVentaApi } from '../../api/devolucionVentaApi';
import { facturaPOSApi } from '../../api/facturaPOSApi';
import { productoApi } from '../../api/productoApi';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import LogTable from '../../components/LogTable';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import { DragHandle, SortableRow, DragListenersContext } from '../../components/DragSortable';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useDocumentoConfig } from '../../hooks/useDocumentoConfig';
import { formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum } from '../../utils/estadoDocumento';
import CamposRestringidosAlert from '../../components/CamposRestringidosAlert';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import AsientosContableTable from '../../components/AsientosContableTable';
import { transaccionApi } from '../../api/transaccionApi';
const { Text } = Typography;
const { TextArea } = Input;
// ===== Cálculo de fila para DEV =====
function calcularFila(fila) {
    const cantidad = fila.cantidad || 0;
    const precio = fila.precio || 0;
    const pctDesc = fila.porcentajeDescuento || 0;
    const pctImp = fila.porcentajeImpuesto || 0;
    const subTotal = Math.round(cantidad * precio * 100) / 100;
    const descuento = Math.round(subTotal * (pctDesc / 100) * 100) / 100;
    // ITBIS por unidad: Round(Precio - Precio / (1 + %Imp/100), 2)
    const itbisUnit = pctImp > 0
        ? Math.round((precio - precio / (1 + pctImp / 100)) * 100) / 100
        : 0;
    const impuestos = Math.round(itbisUnit * cantidad * 100) / 100;
    const montoBase = subTotal - impuestos;
    const total = Math.round((subTotal - descuento) * 100) / 100;
    return {
        ...fila,
        cantidad,
        precio,
        precioNeto: precio,
        montoBase,
        subTotal,
        descuento,
        impuestos,
        total,
    };
}
function filaVacia() {
    return {
        id: 0,
        idTransaccion: 0,
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
    };
}
const BuscarFacturaModal = ({ open, onClose, onSelect }) => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [facturas, setFacturas] = useState([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (!open)
            return;
        setLoading(true);
        const hoy = dayjs();
        const desde = hoy.subtract(90, 'day');
        const fmt = (d) => d.format('YYYYMMDDHHmmss');
        facturaPOSApi.obtenerVista(sucursalActiva, fmt(desde), fmt(hoy), 50, 0)
            .then(setFacturas)
            .catch(() => message.error('Error al cargar facturas'))
            .finally(() => setLoading(false));
    }, [open, sucursalActiva]);
    const columns = [
        { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140 },
        { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110,
            render: (v) => formatDate(v) },
        { title: 'Cliente', dataIndex: 'entidad', key: 'entidad', ellipsis: true,
            render: (v) => toTitleCase(v || '') },
        { title: 'Total', dataIndex: 'total', key: 'total', width: 130, align: 'right',
            render: (v) => formatNumber(v) },
    ];
    return (_jsx(Modal, { title: "Buscar Factura POS", open: open, onCancel: onClose, footer: null, width: 800, destroyOnHidden: true, children: _jsx(Table, { dataSource: facturas, columns: columns, rowKey: "id", loading: loading, size: "small", pagination: { pageSize: 10, showSizeChanger: false }, onRow: (record) => ({
                onClick: () => {
                    onSelect(record);
                    onClose();
                },
                style: { cursor: 'pointer' },
            }) }) }));
};
// ===== Componente principal =====
const DevolucionVentaFormulario = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const screens = Grid.useBreakpoint();
    const mode = id ? 'editar' : 'crear';
    const { screenCode, documentCode } = useScreenConfig('FDEV');
    const documentoConfig = useDocumentoConfig(sucursalActiva, documentCode);
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
    const [selectedFactura, setSelectedFactura] = useState(null);
    const [productoModalOpen, setProductoModalOpen] = useState(false);
    const [facturaModalOpen, setFacturaModalOpen] = useState(false);
    const [detalleSearch, setDetalleSearch] = useState('');
    const [medidasCache, setMedidasCache] = useState([]);
    const [editingField, setEditingField] = useState(null);
    const editingOriginalValue = useRef('');
    const editingValueRef = useRef('');
    const fieldCloseHandledRef = useRef(false);
    const [searchParams] = useSearchParams();
    const pvId = searchParams.get('pvId');
    const [desdePV, setDesdePV] = useState(false);
    const [form] = Form.useForm();
    const ncfValue = Form.useWatch('ncf', form) || '';
    const tasaValue = Form.useWatch('tasa', form) ?? 1;
    const editValuesRef = useRef({});
    const impuestosBackupRef = useRef(new Map());
    const navigationConfirmedRef = useFormularioNavigation();
    const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }));
    const [activeId, setActiveId] = useState(null);
    const detallesFiltrados = detalleSearch
        ? detalles.filter((d) => {
            const q = detalleSearch.toLowerCase();
            return (d.codigo || '').toLowerCase().includes(q) ||
                (d.articulo || '').toLowerCase().includes(q) ||
                (d.referencia || '').toLowerCase().includes(q);
        })
        : detalles;
    const sinOC = true;
    const isLarge = screens.xxl === true;
    // ===== Determinar estado =====
    const estado = data?.estado ?? 0;
    const esCerrado = data?.periodo === 6;
    const esBorrador = estado === 0;
    const esAplicado = estado === 1;
    const esAnulado = estado === 3;
    const usuario = useAuthStore((s) => s.usuario);
    const permisoModificarAsientos = usuario?.permisosEspeciales?.some((p) => p.codigo === 'pe_modificar_asientos' && p.valor === true) ?? false;
    const [generandoAsientos, setGenerandoAsientos] = useState(false);
    // ===== Cargar datos de apoyo al montar =====
    useEffect(() => {
        setActiveModule(screenCode);
        const pageTitle = mode === 'crear' ? 'Nueva Devolución de Venta' : 'Editar Devolución de Venta';
        setPageTitleOverride(pageTitle);
        // Cargar almacenes
        devolucionVentaApi.obtenerAlmacenes(sucursalActiva).then(setAlmacenesCache).catch((err) => console.warn('Error al cargar almacenes cache', err));
        unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch((err) => console.warn('Error al cargar medidas cache', err));
        // Inicializar fechas en modo crear
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
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoading(true);
        devolucionVentaApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            // Convertir a FullDTO
            const full = {
                id: res.id,
                fechaDocumento: res.fechaDocumento,
                noDocumento: res.noDocumento,
                estado: res.estado,
                periodo: res.periodo,
                ncf: res.ncf,
                referencia: res.referencia,
                nota: res.nota,
                tasa: res.tasa,
                tipoDocumento: res.tipoDocumento,
                concepto: res.concepto,
                almacen: res.almacen,
                cliente: res.cliente,
                entidad: res.entidad,
                factura: res.factura || null,
                moneda: res.moneda,
                documento: res.documento,
                subTotal: res.subTotal,
                descuento: res.descuento,
                impuestos: res.impuestos,
                total: res.total,
                detalles: res.detalles || [],
                asientos: res.asientos || [],
                logs: res.logs || [],
            };
            setData(full);
            setDetalles(res.detalles || []);
            setSelectedConcepto(res.concepto || null);
            setSelectedCliente(res.cliente || null);
            setSelectedAlmacen(res.almacen || null);
            setSelectedFactura(res.factura || null);
            const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
            form.setFieldsValue({
                concepto: res.concepto?.codigo || '',
                cliente: res.cliente?.codigo || '',
                almacen: res.almacen?.codigo || '',
                fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                ncf: res.ncf || '',
                referencia: res.referencia || '',
                moneda: res.moneda?.nombre || '',
                tasa: res.tasa || 1,
                nota: res.nota || '',
            });
            // Cargar clientes según el concepto
            if (res.concepto?.codigo) {
                devolucionVentaApi.obtenerClientes(sucursalActiva)
                    .then(setClientesCache)
                    .catch((err) => console.warn('Error al cargar clientes cache en editar', err));
            }
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
            message.error(msg);
            setLoadingError(true);
            navigate('/FDEV', { replace: true });
        })
            .finally(() => setLoading(false));
    }, [mode, id, sucursalActiva, form, navigate]);
    // ===== Precarga desde PV (si viene query param pvId) =====
    useEffect(() => {
        if (mode !== 'crear' || !pvId)
            return;
        const cargarDesdePV = async () => {
            setLoading(true);
            try {
                const facturaFull = await devolucionVentaApi.obtenerFacturaPOS(sucursalActiva, parseInt(pvId));
                if (!facturaFull) {
                    message.error('Factura POS no encontrada');
                    return;
                }
                setDesdePV(true);
                // Crear objeto de factura simplificado para selectedFactura
                const facturaObj = {
                    id: facturaFull.id,
                    documento: facturaFull.documento,
                    noDocumento: facturaFull.noDocumento,
                    fechaDocumento: facturaFull.fechaDocumento,
                };
                setSelectedFactura(facturaObj);
                // Precargar concepto
                if (facturaFull.concepto) {
                    setSelectedConcepto(facturaFull.concepto);
                }
                // Precargar cliente
                if (facturaFull.cliente) {
                    setSelectedCliente(facturaFull.cliente);
                    // Cargar clientes cache para el Select
                    devolucionVentaApi.obtenerClientes(sucursalActiva)
                        .then(setClientesCache)
                        .catch(() => { });
                }
                // Precargar almacén
                if (facturaFull.almacen) {
                    setSelectedAlmacen(facturaFull.almacen);
                }
                // Setear valores del formulario
                form.setFieldsValue({
                    concepto: facturaFull.concepto?.codigo || '',
                    cliente: facturaFull.cliente?.codigo || '',
                    almacen: facturaFull.almacen?.codigo || '',
                    fechaDocumento: dayjs(),
                    moneda: facturaFull.moneda?.nombre || 'Peso Dominicano',
                    tasa: facturaFull.tasa || 1,
                });
                // Actualizar data para moneda en TotalesCard
                setData((prev) => {
                    if (!prev)
                        return prev;
                    return { ...prev, moneda: facturaFull.moneda || null };
                });
                // Precargar detalles desde la PV
                if (facturaFull.detalles && facturaFull.detalles.length > 0) {
                    const nuevosDetalles = facturaFull.detalles.map((d, idx) => ({
                        id: -(idx + 1),
                        idTransaccion: 0,
                        idAsociado: d.id,
                        codigo: d.codigo || '',
                        articulo: d.articulo || '',
                        referencia: d.referencia || '',
                        cantidad: 0, // Default 0 — el usuario elige cuánto devolver
                        cantidadOriginal: d.cantidad || 0, // Guardar cantidad original de la PV
                        costo: d.costo || 0,
                        precio: d.precio || 0,
                        subTotal: 0,
                        porcentajeDescuento: d.porcentajeDescuento || 0,
                        descuento: 0,
                        porcentajeImpuesto: d.porcentajeImpuesto || 0,
                        impuestos: 0,
                        total: 0,
                        tipoArticulo: d.tipoArticulo || 'Producto',
                        tieneVencimiento: d.tieneVencimiento || false,
                        familia: d.familia,
                        medida: d.medida,
                        impuesto: d.impuesto,
                    }));
                    setDetalles(nuevosDetalles.map((d) => calcularFila(d)));
                    message.success(`Se cargaron ${nuevosDetalles.length} detalles de la factura POS`);
                }
            }
            catch (err) {
                const msg = extraerMensajeError(err, 'Error al cargar la factura POS');
                message.error(msg);
            }
            finally {
                setLoading(false);
            }
        };
        cargarDesdePV();
    }, [mode, pvId, sucursalActiva, form]);
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
                if (mode === 'crear') {
                    navigationConfirmedRef.current = true;
                    navigate('/FDEV', { replace: true });
                }
                else if (id) {
                    setLoading(true);
                    devolucionVentaApi.obtenerPorId(sucursalActiva, parseInt(id))
                        .then((res) => {
                        const full = {
                            id: res.id,
                            fechaDocumento: res.fechaDocumento,
                            noDocumento: res.noDocumento,
                            estado: res.estado,
                            periodo: res.periodo,
                            ncf: res.ncf,
                            referencia: res.referencia,
                            nota: res.nota,
                            tasa: res.tasa,
                            tipoDocumento: res.tipoDocumento,
                            concepto: res.concepto,
                            almacen: res.almacen,
                            cliente: res.cliente,
                            entidad: res.entidad,
                            factura: res.factura || null,
                            moneda: res.moneda,
                            documento: res.documento,
                            subTotal: res.subTotal,
                            descuento: res.descuento,
                            impuestos: res.impuestos,
                            total: res.total,
                            detalles: res.detalles || [],
                            asientos: res.asientos || [],
                            logs: res.logs || [],
                        };
                        setData(full);
                        setDetalles(res.detalles || []);
                        setSelectedConcepto(res.concepto || null);
                        setSelectedCliente(res.cliente || null);
                        setSelectedAlmacen(res.almacen || null);
                        setSelectedFactura(res.factura || null);
                        const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
                        form.setFieldsValue({
                            concepto: res.concepto?.codigo || '',
                            cliente: res.cliente?.codigo || '',
                            almacen: res.almacen?.codigo || '',
                            fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                            ncf: res.ncf || '',
                            referencia: res.referencia || '',
                            moneda: res.moneda?.nombre || '',
                            tasa: res.tasa || 1,
                            nota: res.nota || '',
                        });
                    })
                        .catch((err) => {
                        const msg = err?.response?.data?.errorMessage || 'Error al recargar el documento';
                        message.error(msg);
                    })
                        .finally(() => setLoading(false));
                    navigationConfirmedRef.current = true;
                    navigate(`/FDEV/${id}`, { replace: true });
                }
            },
        });
    };
    // Validación del formulario
    const validarFormulario = () => {
        const values = form.getFieldsValue();
        if (!selectedConcepto)
            return 'Debe elegir un Concepto para poder continuar';
        if (!selectedCliente && !values.cliente)
            return 'El cliente es requerido';
        if (!selectedAlmacen && !values.almacen)
            return 'El almacén es requerido';
        if (detalles.length === 0)
            return 'No se puede crear un documento de DEVOLUCIÓN VENTA sin detalle.';
        if (!detalles.some((d) => (d.cantidad || 0) > 0))
            return 'Debe tener al menos un detalle con cantidad > 0';
        // Si viene desde PV, validar que ninguna cantidad a devolver exceda la cantidad original
        if (desdePV) {
            const excedido = detalles.find((d) => (d.cantidadOriginal || 0) > 0 && (d.cantidad || 0) > (d.cantidadOriginal || 0));
            if (excedido) {
                return `La cantidad a devolver del artículo "${excedido.articulo}" (${excedido.cantidad}) excede la cantidad original de la factura (${excedido.cantidadOriginal})`;
            }
            // La nota es obligatoria para devoluciones desde factura POS
            if (!values.nota || !values.nota.trim()) {
                return 'La nota es obligatoria para devoluciones desde factura POS';
            }
        }
        const fecha = values.fechaDocumento;
        if (fecha) {
            const f = typeof fecha === 'object' && fecha.toDate ? fecha.toDate() : new Date(fecha);
            if (f > new Date())
                return 'La fecha del documento no puede ser mayor a hoy';
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
        // Filtrar solo detalles con cantidad > 0 para enviar al backend
        const detallesValidos = detalles
            .filter((d) => (d.cantidad || 0) > 0)
            .map((d) => {
            const calculado = calcularFila(d);
            // Cuando la devolución es desde PV, incluir devuelto (cantidad a devolver)
            if (desdePV) {
                return { ...calculado, devuelto: d.cantidad };
            }
            return calculado;
        });
        const totalSub = detallesValidos.reduce((s, d) => s + (d.subTotal || 0), 0);
        const totalDesc = detallesValidos.reduce((s, d) => s + (d.descuento || 0), 0);
        const totalImp = detallesValidos.reduce((s, d) => s + (d.impuestos || 0), 0);
        const total = detallesValidos.reduce((s, d) => s + (d.total || 0), 0);
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
            descuento: Math.round(totalDesc * 100) / 100,
            impuestos: Math.round(totalImp * 100) / 100,
            total: Math.round(total * 100) / 100,
            tasa: values.tasa || 1,
            tipoDocumento: base.tipoDocumento ?? 20,
            documento: base.documento || { codigo: documentCode },
            concepto: selectedConcepto || { nombre: '', codigo: '' },
            moneda: base.moneda || getMonedaSucursalActiva(),
            almacen: selectedAlmacen || { nombre: '', codigo: '' },
            cliente: clienteSel
                ? { nombre: clienteSel.nombre, codigo: clienteSel.codigo, identificacion: clienteSel.identificacion || '' }
                : { nombre: '', codigo: '', identificacion: '' },
            entidad: clienteSel
                ? { nombre: clienteSel.nombre, codigo: clienteSel.codigo, identificacion: clienteSel.identificacion || '', telefono: clienteSel.telefono, direccion: clienteSel.direccion }
                : { nombre: '', codigo: '', identificacion: '' },
            factura: selectedFactura || null,
            sucursal: base.sucursal || { nombre: '', codigo: '', identificacion: '' },
            detalles: detallesValidos,
            asientos: base.asientos || [],
            logs: base.logs || [],
        };
    };
    // ===== Handlers de campos rápidos =====
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
            const newValue = editingValueRef.current;
            form.setFieldsValue({ [field]: newValue });
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
    const handleGuardar = async () => {
        const error = validarFormulario();
        if (error) {
            message.error(error);
            return;
        }
        setSaving(true);
        try {
            if (mode === 'crear') {
                if (desdePV && pvId) {
                    const dto = construirDTO();
                    const detallesValidos = dto.detalles || [];
                    const result = await devolucionVentaApi.crearDesdePV(sucursalActiva, parseInt(pvId), { detalles: detallesValidos });
                    message.success('Devolución de venta creada exitosamente');
                    navigationConfirmedRef.current = true;
                    navigate(`/FDEV/${result.id}`, { replace: true });
                }
                else {
                    const dto = construirDTO();
                    const result = await devolucionVentaApi.crear(sucursalActiva, dto);
                    message.success('Devolución de venta creada exitosamente');
                    navigationConfirmedRef.current = true;
                    navigate(`/FDEV/${result.id}`, { replace: true });
                }
            }
            else {
                const dto = construirDTO();
                await devolucionVentaApi.actualizar(sucursalActiva, dto);
                message.success('Devolución de venta actualizada exitosamente');
                navigationConfirmedRef.current = true;
                navigate(`/FDEV/${id}`, { replace: true });
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
    // ===== Handlers de concepto =====
    const handleConceptoSelect = (concepto) => {
        setSelectedConcepto(concepto);
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
        devolucionVentaApi.obtenerClientes(sucursalActiva)
            .then((ents) => setClientesCache(ents))
            .catch((err) => console.warn('Error al cargar clientes cache al cambiar concepto', err));
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
        // Si el concepto tiene almacén por defecto
        if (concepto.almacen?.codigo) {
            const alm = almacenesCache.find((a) => a.codigo === concepto.almacen.codigo);
            if (alm) {
                setSelectedAlmacen(alm);
                form.setFieldsValue({ almacen: alm.codigo });
            }
        }
    };
    const handleConceptoSearchClick = () => {
        setConceptoModalOpen(true);
    };
    const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
    const [conceptoSearchText, setConceptoSearchText] = useState('');
    const handleConceptoClear = () => {
        setSelectedConcepto(null);
        setConceptoSearchText('');
        setClientesCache([]);
        form.setFieldsValue({ concepto: '', cliente: undefined });
    };
    // ===== Handlers de factura origen =====
    const handleFacturaSelect = async (factura) => {
        setSelectedFactura(factura);
        // Cargar detalle completo de la factura para clonar sus líneas
        try {
            const facturaFull = await devolucionVentaApi.obtenerFacturaPOS(sucursalActiva, factura.id);
            if (facturaFull?.detalles && facturaFull.detalles.length > 0) {
                // Confirmar antes de reemplazar detalles existentes
                if (detalles.length > 0) {
                    Modal.confirm({
                        title: '¿Reemplazar detalles?',
                        icon: _jsx(ExclamationCircleOutlined, {}),
                        content: 'Al seleccionar una factura se reemplazarán los detalles actuales por los de la factura. ¿Desea continuar?',
                        okText: 'Sí, reemplazar',
                        cancelText: 'No',
                        onOk: () => {
                            setDesdePV(true);
                            const nuevosDetalles = facturaFull.detalles.map((d, idx) => ({
                                id: -(idx + 1),
                                idTransaccion: 0,
                                idAsociado: d.id,
                                codigo: d.codigo || '',
                                articulo: d.articulo || '',
                                referencia: d.referencia || '',
                                cantidad: 0, // Default 0 — el usuario elige cuánto devolver
                                cantidadOriginal: d.cantidad || 0, // Cantidad original de la PV
                                costo: d.costo || 0,
                                precio: d.precio || 0,
                                subTotal: 0,
                                porcentajeDescuento: d.porcentajeDescuento || 0,
                                descuento: 0,
                                porcentajeImpuesto: d.porcentajeImpuesto || 0,
                                impuestos: 0,
                                total: 0,
                                tipoArticulo: d.tipoArticulo || 'Producto',
                                tieneVencimiento: d.tieneVencimiento || false,
                                familia: d.familia,
                                medida: d.medida,
                                impuesto: d.impuesto,
                            }));
                            setDetalles(nuevosDetalles.map((d) => calcularFila(d)));
                            message.success(`Se cargaron ${nuevosDetalles.length} detalles de la factura`);
                        },
                    });
                }
                else {
                    setDesdePV(true);
                    const nuevosDetalles = facturaFull.detalles.map((d, idx) => ({
                        id: -(idx + 1),
                        idTransaccion: 0,
                        idAsociado: d.id,
                        codigo: d.codigo || '',
                        articulo: d.articulo || '',
                        referencia: d.referencia || '',
                        cantidad: 0, // Default 0 — el usuario elige cuánto devolver
                        cantidadOriginal: d.cantidad || 0, // Cantidad original de la PV
                        costo: d.costo || 0,
                        precio: d.precio || 0,
                        subTotal: 0,
                        porcentajeDescuento: d.porcentajeDescuento || 0,
                        descuento: 0,
                        porcentajeImpuesto: d.porcentajeImpuesto || 0,
                        impuestos: 0,
                        total: 0,
                        tipoArticulo: d.tipoArticulo || 'Producto',
                        tieneVencimiento: d.tieneVencimiento || false,
                        familia: d.familia,
                        medida: d.medida,
                        impuesto: d.impuesto,
                    }));
                    setDetalles(nuevosDetalles.map((d) => calcularFila(d)));
                    message.success(`Se cargaron ${nuevosDetalles.length} detalles de la factura`);
                }
            }
        }
        catch {
            message.error('Error al cargar los detalles de la factura');
        }
    };
    const handleFacturaClear = () => {
        setSelectedFactura(null);
        setDesdePV(false);
        form.setFieldsValue({ referencia: '' });
    };
    // ===== Handlers de detalles =====
    const handleAgregarFila = () => {
        const newId = -(detalles.length + 1);
        setDetalles((prev) => [calcularFila({ ...filaVacia(), id: newId }), ...prev]);
    };
    const handleEliminarFila = (detId) => {
        Modal.confirm({
            title: 'Eliminar detalle',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: '¿Está seguro de eliminar este detalle?',
            okText: 'Sí',
            cancelText: 'No',
            okButtonProps: { danger: true },
            onOk: () => {
                setDetalles((prev) => prev.filter((d) => d.id !== detId));
            },
        });
    };
    const handleDetalleUpdateValue = (detId, field, value) => {
        setDetalles((prev) => prev.map((d) => (d.id !== detId ? d : { ...d, [field]: value })));
    };
    const handleDetalleCalculate = (detId, field, value) => {
        setDetalles((prev) => prev.map((d) => {
            if (d.id !== detId)
                return d;
            const updated = { ...d, [field]: value };
            return calcularFila(updated);
        }));
    };
    const handleProductoSelect = (producto) => {
        const filaVaciaIdx = detalles.findIndex((d) => !d.codigo);
        if (filaVaciaIdx === -1) {
            const nuevoId = -(detalles.length + 1);
            setDetalles((prev) => {
                const filled = {
                    ...filaVacia(),
                    id: nuevoId,
                    codigo: producto.codigo,
                    articulo: producto.articulo,
                    referencia: producto.referencia || '',
                    costo: producto.costo || 0,
                    precio: producto.precio || 0,
                    familia: producto.familia,
                    medida: producto.medida,
                    impuesto: producto.impuesto,
                    porcentajeImpuesto: producto.impuesto?.porcentaje || 0,
                    tieneVencimiento: producto.tieneVencimiento || false,
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
                    costo: producto.costo || 0,
                    precio: producto.precio || 0,
                    familia: producto.familia,
                    medida: producto.medida,
                    impuesto: producto.impuesto,
                    porcentajeImpuesto: producto.impuesto?.porcentaje || 0,
                    tieneVencimiento: producto.tieneVencimiento || false,
                    modificaPrecio: producto.modificaPrecio ?? false,
                    modificaDescripcion: producto.modificaDescripcion ?? false,
                };
                return calcularFila(filled);
            }));
        }
    };
    // ===== Totales calculados =====
    const totales = {
        subTotal: detalles.reduce((s, d) => s + (d.subTotal || 0), 0),
        descuento: detalles.reduce((s, d) => s + (d.descuento || 0), 0),
        impuestos: detalles.reduce((s, d) => s + (d.impuestos || 0), 0),
        total: detalles.reduce((s, d) => s + (d.total || 0), 0),
    };
    // ===== Generar asientos contables =====
    const handleGenerarAsientos = async () => {
        if (sucursalActiva === undefined)
            return;
        setGenerandoAsientos(true);
        try {
            const dto = construirDTO();
            const asientosGenerados = await transaccionApi.generarAsientos(sucursalActiva, dto);
            setData((prev) => prev ? { ...prev, asientos: asientosGenerados } : prev);
            message.success(`Se generaron ${asientosGenerados.length} asientos`);
        }
        catch (err) {
            message.error(err?.message || 'Error al generar asientos');
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
        devolucionVentaApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            const full = {
                id: res.id,
                fechaDocumento: res.fechaDocumento,
                noDocumento: res.noDocumento,
                estado: res.estado,
                periodo: res.periodo,
                ncf: res.ncf,
                referencia: res.referencia,
                nota: res.nota,
                tasa: res.tasa,
                tipoDocumento: res.tipoDocumento,
                concepto: res.concepto,
                almacen: res.almacen,
                cliente: res.cliente,
                entidad: res.entidad,
                factura: res.factura || null,
                moneda: res.moneda,
                documento: res.documento,
                subTotal: res.subTotal,
                descuento: res.descuento,
                impuestos: res.impuestos,
                total: res.total,
                detalles: res.detalles || [],
                asientos: res.asientos || [],
                logs: res.logs || [],
            };
            setData(full);
            setDetalles(res.detalles || []);
            setSelectedConcepto(res.concepto || null);
            setSelectedCliente(res.cliente || null);
            setSelectedAlmacen(res.almacen || null);
            setSelectedFactura(res.factura || null);
            const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
            form.setFieldsValue({
                concepto: res.concepto?.codigo || '',
                cliente: res.cliente?.codigo || '',
                almacen: res.almacen?.codigo || '',
                fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                ncf: res.ncf || '',
                referencia: res.referencia || '',
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
            onCell: () => ({ style: { verticalAlign: 'top' } }),
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
                const docPermiteDesc = documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion ?? true;
                if (docPermiteDesc && !desdePV) {
                    return (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx(Input, { size: "small", style: { width: '100%' }, value: fila.articulo || '', onChange: (e) => handleDetalleUpdateValue(fila.id, 'articulo', e.target.value) }), _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }, children: [fila.familia?.nombre ? _jsx(Tag, { style: { fontSize: 11, lineHeight: '18px', padding: '0 6px' }, children: toTitleCase(fila.familia.nombre) }) : null, fila.fechaVencimiento && _jsxs("span", { children: ["V: ", formatDate(fila.fechaVencimiento)] })] })] }));
                }
                return (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx("div", { children: toTitleCase(fila.articulo || '') }), _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }, children: [fila.familia?.nombre ? _jsx(Tag, { style: { fontSize: 11, lineHeight: '18px', padding: '0 6px' }, children: toTitleCase(fila.familia.nombre) }) : null, fila.fechaVencimiento && _jsxs("span", { children: ["V: ", formatDate(fila.fechaVencimiento)] })] })] }));
            },
        },
        // Columna "Cant. Original" — solo cuando la DEV viene desde PV
        ...(desdePV ? [{
                title: 'Cant. Original',
                key: 'cantidadOriginal',
                width: 100,
                align: 'right',
                onCell: () => ({ style: { verticalAlign: 'top' } }),
                render: (_, record) => (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx("span", { children: formatNumber(record.cantidadOriginal || 0) }), record.medida?.nombre && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, textAlign: 'right' }, children: toTitleCase(record.medida.nombre) }))] })),
            }] : []),
        {
            title: desdePV ? 'A Devolver' : 'Devuelto',
            dataIndex: 'cantidad',
            key: 'cantidad',
            width: 100,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            shouldCellUpdate: (record, prevRecord) => record.cantidad !== prevRecord.cantidad || record.medida?.nombre !== prevRecord.medida?.nombre,
            render: (_, _record, idx) => (_jsxs("div", { children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, max: desdePV ? (detalles[idx]?.cantidadOriginal ?? undefined) : undefined, step: 0.01, precision: 2, controls: false, defaultValue: detalles[idx]?.cantidad, onChange: (val) => { editValuesRef.current[`${detalles[idx].id}_cantidad`] = val || 0; }, onBlur: () => { const val = editValuesRef.current[`${detalles[idx].id}_cantidad`] ?? detalles[idx]?.cantidad; handleDetalleCalculate(detalles[idx].id, 'cantidad', val); }, onPressEnter: () => { const val = editValuesRef.current[`${detalles[idx].id}_cantidad`] ?? detalles[idx]?.cantidad; handleDetalleCalculate(detalles[idx].id, 'cantidad', val); } }), detalles[idx]?.medida?.nombre && !sinOC && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5, marginTop: 2 }, children: toTitleCase(detalles[idx].medida.nombre) }))] })),
        },
        ...(sinOC ? [{
                title: 'Medida',
                key: 'medida',
                width: 160,
                onCell: () => ({ style: { verticalAlign: 'top' } }),
                render: (_, record, _idx) => {
                    if (desdePV) {
                        return (_jsx(Text, { style: { fontSize: 13 }, children: toTitleCase(record.medida?.nombre || '') }));
                    }
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
                const docPermiteEditar = documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio ?? true;
                if (docPermiteEditar && !desdePV) {
                    return (_jsxs("div", { children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, step: 0.01, precision: 2, controls: false, value: fila.precio, onChange: (val) => handleDetalleUpdateValue(fila.id, 'precio', val || 0), onBlur: () => handleDetalleCalculate(fila.id, 'precio', fila.precio || 0), onPressEnter: () => handleDetalleCalculate(fila.id, 'precio', fila.precio || 0) }), _jsxs("div", { style: { fontSize: 11, lineHeight: 1.5, color: '#999' }, children: [formatNumber(precioUnitario), " \u00D7 ", factor] })] }));
                }
                return (_jsxs("div", { children: [_jsx(Text, { children: formatNumber(precioBase) }), _jsxs("div", { style: { fontSize: 11, lineHeight: 1.5, color: '#999' }, children: [formatNumber(precioUnitario), " \u00D7 ", factor] })] }));
            },
        },
        {
            title: 'SubTotal',
            dataIndex: 'subTotal',
            key: 'subTotal',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            shouldCellUpdate: (record, prevRecord) => record.subTotal !== prevRecord.subTotal,
            render: (_, record) => (_jsx(Text, { children: formatNumber(record.subTotal || 0) })),
        },
        {
            title: '% Desc',
            key: 'porcentajeDescuento',
            width: 90,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, _record, idx) => {
                if (desdePV) {
                    return _jsxs(Text, { children: [formatNumber(detalles[idx]?.porcentajeDescuento || 0), "%"] });
                }
                return (_jsx(InputNumber, { size: "small", style: { width: '100%' }, min: 0, max: 100, step: 0.01, precision: 2, defaultValue: detalles[idx]?.porcentajeDescuento, onChange: (val) => { editValuesRef.current[`${detalles[idx].id}_porcentajeDescuento`] = val || 0; }, onBlur: () => { const val = editValuesRef.current[`${detalles[idx].id}_porcentajeDescuento`] ?? detalles[idx]?.porcentajeDescuento; handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', val); }, onPressEnter: () => { const val = editValuesRef.current[`${detalles[idx].id}_porcentajeDescuento`] ?? detalles[idx]?.porcentajeDescuento; handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', val); }, addonAfter: "%" }));
            },
        },
        {
            title: 'Desc.',
            key: 'descuento',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            shouldCellUpdate: (record, prevRecord) => record.descuento !== prevRecord.descuento,
            render: (_, record) => (_jsx(Text, { children: formatNumber(record.descuento || 0) })),
        },
        {
            title: 'Imp.',
            key: 'impuestos',
            width: 140,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            shouldCellUpdate: (record, prevRecord) => record.impuestos !== prevRecord.impuestos || record.impuesto?.nombre !== prevRecord.impuesto?.nombre,
            render: (_, record) => (_jsxs("div", { children: [_jsx("div", { children: formatNumber(record.impuestos || 0) }), record.impuesto?.nombre && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5 }, children: toTitleCase(record.impuesto.nombre) }))] })),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            shouldCellUpdate: (record, prevRecord) => record.total !== prevRecord.total,
            render: (_, record) => (_jsx(Text, { strong: true, children: formatNumber(record.total || 0) })),
        },
        {
            title: '',
            key: 'acciones',
            width: 50,
            onCell: () => ({ style: { paddingRight: 8 } }),
            render: (_, _record, idx) => {
                if (desdePV)
                    return null;
                const items = [
                    {
                        key: 'eliminar',
                        label: 'Eliminar',
                        icon: _jsx(DeleteOutlined, {}),
                        danger: true,
                        onClick: () => handleEliminarFila(detalles[idx].id),
                    },
                ];
                return (_jsx(Dropdown, { menu: { items }, trigger: ['click'], children: _jsx(Button, { type: "text", size: "small", icon: _jsx(MoreOutlined, {}) }) }));
            },
        },
    ];
    // ===== Encabezado del formulario =====
    const renderEncabezado = () => (_jsx(Card, { className: "paces-card", size: "small", title: "Datos Generales", extra: _jsx(EstadoTag, { estado: estado, periodo: data?.periodo }), style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: 16, children: [_jsx(Col, { xs: 24, xxl: 18, children: _jsxs(Form, { form: form, layout: "vertical", size: "middle", style: { paddingTop: 24 }, children: [_jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, sm: 12, lg: 9, children: _jsx("div", { children: _jsx(FloatingField, { label: "Factura Referencia", children: _jsx(Input, { placeholder: " ", value: selectedFactura
                                                        ? `${typeof selectedFactura.documento === 'object' ? (selectedFactura.documento?.codigo || '') + '-' + (selectedFactura.noDocumento || '') : selectedFactura.documento}`
                                                        : '', readOnly: true, suffix: !desdePV ? (_jsxs(Space, { size: 4, children: [_jsx(SearchOutlined, { onClick: () => setFacturaModalOpen(true), style: { cursor: 'pointer', color: 'rgba(0,0,0,0.45)' } }), selectedFactura && _jsx(ClearOutlined, { onClick: handleFacturaClear, style: { cursor: 'pointer' } })] })) : undefined, onClick: desdePV ? undefined : () => setFacturaModalOpen(true) }) }) }) }), _jsxs(Col, { xs: 24, sm: 12, lg: 15, children: [_jsxs("div", { children: [_jsx(FloatingField, { label: "Concepto", required: true, children: _jsx(Input, { placeholder: " ", value: selectedConcepto ? `${selectedConcepto.codigo || ''} - ${toTitleCase(selectedConcepto.nombre)}` : conceptoSearchText, readOnly: true, suffix: !desdePV ? (_jsxs(Space, { size: 4, children: [_jsx(SearchOutlined, { onClick: handleConceptoSearchClick, style: { cursor: 'pointer', color: 'rgba(0,0,0,0.45)' } }), selectedConcepto && _jsx(ClearOutlined, { onClick: handleConceptoClear, style: { cursor: 'pointer' } })] })) : undefined, onClick: desdePV ? undefined : handleConceptoSearchClick }) }), _jsx(ConceptoInfoLabel, { concepto: selectedConcepto })] }), _jsx(Form.Item, { name: "concepto", hidden: true, children: _jsx(Input, {}) })] }), _jsx(Col, { xs: 24, sm: 12, lg: 9, children: _jsx(Form.Item, { name: "fechaDocumento", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Fecha Documento", required: true, children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabled: desdePV, disabledDate: (current) => {
                                                        if (!current)
                                                            return false;
                                                        const cierre = fechasCierre?.[sucursalActiva];
                                                        if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                                            return true;
                                                        const cierreInv = fechasCierreInv?.[sucursalActiva];
                                                        if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                                            return true;
                                                        return false;
                                                    } }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 15, children: _jsx(Form.Item, { name: "cliente", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Cliente", required: true, children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", disabled: desdePV, onChange: (val) => {
                                                        const ent = clientesCache.find((e) => e.codigo === val);
                                                        setSelectedCliente(ent || null);
                                                    }, children: clientesCache.map((ent) => (_jsxs(Select.Option, { value: ent.codigo, children: [toTitleCase(ent.nombre), ent.identificacion ? ` (${ent.identificacion})` : ''] }, ent.codigo))) }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 9, children: _jsx("div", { children: _jsx(FloatingField, { label: "Fecha Factura", children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabled: true, value: selectedFactura?.fechaDocumento ? dayjs(selectedFactura.fechaDocumento) : null }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 15, children: _jsx(Form.Item, { name: "almacen", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Almac\u00E9n", required: true, children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", disabled: desdePV, onChange: (val) => {
                                                        const alm = almacenesCache.find((a) => a.codigo === val);
                                                        setSelectedAlmacen(alm || null);
                                                    }, children: almacenesCache.map((alm) => (_jsx(Select.Option, { value: alm.codigo, children: toTitleCase(alm.nombre) }, alm.codigo))) }) }) }) }), _jsx(Col, { xs: 24, children: _jsx("div", { style: { marginBottom: 16 }, children: _jsxs(Space, { size: [8, 8], wrap: true, children: [_jsx("div", { children: editingField === 'ncf' ? (_jsx(Input, { size: "small", style: { width: 200 }, placeholder: "NCF", maxLength: 19, autoFocus: true, defaultValue: editingValueRef.current, onChange: (e) => { editingValueRef.current = e.target.value; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => { if (e.key === 'Escape') {
                                                                e.stopPropagation();
                                                                cancelFieldEditor();
                                                            } } })) : ncfValue ? (_jsxs(Tag, { style: { fontSize: 14, padding: '6px 16px', cursor: desdePV ? 'default' : 'pointer' }, onClick: desdePV ? undefined : () => openFieldEditor('ncf'), children: ["NCF: ", ncfValue, " ", !desdePV && _jsx(EditOutlined, {})] })) : (!desdePV ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('ncf'), children: [_jsx(PlusOutlined, {}), " NCF"] })) : null) }), _jsx("div", { children: editingField === 'tasa' ? (_jsx(InputNumber, { size: "small", style: { width: 120 }, min: 0, step: 0.01, precision: 4, autoFocus: true, defaultValue: editingValueRef.current, onChange: (val) => { editingValueRef.current = val ?? 0; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => { if (e.key === 'Escape') {
                                                                e.stopPropagation();
                                                                cancelFieldEditor();
                                                            } } })) : (_jsxs(Tag, { style: { fontSize: 14, padding: '6px 16px', cursor: desdePV ? 'default' : 'pointer' }, onClick: desdePV ? undefined : () => openFieldEditor('tasa'), children: ["Tasa: ", tasaValue, " ", !desdePV && _jsx(EditOutlined, {})] })) })] }) }) }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "nota", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Nota", children: _jsx(TextArea, { rows: 3, maxLength: 500, showCount: true }) }) }) })] }), _jsx(Form.Item, { name: "ncf", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "tasa", hidden: true, children: _jsx(InputNumber, {}) })] }) }), _jsx(Col, { xs: 24, xxl: 6, children: _jsx("div", { style: { marginTop: 24 }, children: _jsx(TotalesCard, { subTotal: totales.subTotal, descuento: totales.descuento, impuestos: totales.impuestos, total: totales.total, hideTitle: true, monedaSimbolo: data?.moneda?.simbolo || selectedConcepto?.moneda?.simbolo || 'RD$', monedaNombre: data?.moneda?.nombre || selectedConcepto?.moneda?.nombre || 'Peso Dominicano', tasa: tasaValue ?? data?.tasa ?? 1 }) }) })] }) }));
    return (_jsxs("div", { children: [_jsx(FormularioToolbar, { saving: saving, estado: estado, periodo: data?.periodo, onGuardar: handleGuardar, onCancelar: handleCancelar }), desdePV && selectedFactura && (_jsx(Alert, { message: _jsxs("span", { children: ["Devoluci\u00F3n desde PV:", ' ', _jsx(Text, { strong: true, children: typeof selectedFactura.documento === 'object'
                                ? `${selectedFactura.documento?.codigo || ''}-${selectedFactura.noDocumento || ''}`
                                : selectedFactura.documento || `PV-${selectedFactura.noDocumento}` })] }), type: "info", showIcon: true, icon: _jsx(RollbackOutlined, {}), style: { marginBottom: 16 }, closable: false })), loadingError && (_jsx(Alert, { message: "Error al cargar formulario de devoluci\u00F3n de venta", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(BuscarConceptoModal, { open: conceptoModalOpen, onClose: () => setConceptoModalOpen(false), onSelect: handleConceptoSelect, sucursal: sucursalActiva, documento: "DEV" }), _jsx(BuscarProductoModal, { open: productoModalOpen, onClose: () => setProductoModalOpen(false), onSelect: handleProductoSelect, mode: "venta" }), _jsx(BuscarFacturaModal, { open: facturaModalOpen, onClose: () => setFacturaModalOpen(false), onSelect: handleFacturaSelect }), isLarge ? (_jsx(Row, { gutter: 16, children: _jsxs(Col, { xxl: 24, children: [renderEncabezado(), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: [
                                {
                                    key: 'detalles',
                                    label: `Productos (${detalles.length}${detalleSearch ? ` filtrados` : ''})`,
                                    children: (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [!desdePV && (_jsxs(Space, { children: [_jsx(Button, { type: "dashed", icon: _jsx(PlusOutlined, {}), onClick: handleAgregarFila, children: "Agregar fila" }), _jsx(Button, { icon: _jsx(SearchOutlined, {}), onClick: () => setProductoModalOpen(true), children: "Buscar Producto" })] })), _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { maxWidth: 250 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                                            setDetalleSearch(''); } })] }), (documentoConfig?.modificaPrecio === false || documentoConfig?.modificaDescripcion === false || data?.documento?.modificaPrecio === false || data?.documento?.modificaDescripcion === false) && detalles.length > 0 && (_jsx(CamposRestringidosAlert, { modificaPrecio: documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio, modificaDescripcion: documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion })), _jsxs(DndContext, { sensors: sensors, collisionDetection: closestCenter, onDragStart: (event) => setActiveId(event.active.id), onDragEnd: handleDragEnd, onDragCancel: () => setActiveId(null), children: [_jsx(SortableContext, { items: detallesFiltrados.map((d) => d.id), strategy: verticalListSortingStrategy, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 1300 }, components: { body: { row: SortableRow } }, locale: {
                                                                emptyText: (_jsx("div", { style: { minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin registros" }) })),
                                                            } }) }), _jsx(DragOverlay, { children: activeId ? (_jsxs("div", { style: { padding: '8px 16px', background: '#fff', border: '2px solid #556ee6', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, width: 300 }, children: [_jsx(HolderOutlined, { style: { color: '#556ee6' } }), _jsx("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: detalles.find((d) => d.id === activeId)?.articulo || 'Arrastrando...' })] })) : null })] })] })),
                                },
                                {
                                    key: 'consumo',
                                    label: `Consumo (0)`,
                                    children: (_jsx("div", { style: { padding: 24, textAlign: 'center' }, className: "paces-text-secondary", children: "Documentos que han utilizado esta nota de cr\u00E9dito (disponible despu\u00E9s de aplicar)." })),
                                },
                                {
                                    key: 'asientos',
                                    label: `Asientos (${data?.asientos?.length || 0})`,
                                    children: (permisoModificarAsientos && estado === 0 && !selectedConcepto?.noAsientos) ? (_jsx(AsientosContableEditables, { asientos: data?.asientos || [], onChange: (nuevosAsientos) => setData((prev) => prev ? { ...prev, asientos: nuevosAsientos } : prev), editable: true, scroll: { x: 900 }, onGenerar: handleGenerarAsientos, generando: generandoAsientos })) : (_jsx(AsientosContableTable, { asientos: data?.asientos || [], scroll: { x: 900 } })),
                                },
                                {
                                    key: 'historial',
                                    label: `Historial (${data?.logs?.length || 0})`,
                                    children: (_jsx(LogTable, { dataSource: data?.logs || [], scroll: { x: 900 } })),
                                },
                            ] })] }) })) : (_jsxs("div", { children: [renderEncabezado(), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: [
                            {
                                key: 'detalles',
                                label: `Productos (${detalles.length}${detalleSearch ? ` filtrados` : ''})`,
                                children: (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [!desdePV && (_jsxs(Space, { children: [_jsx(Button, { type: "dashed", icon: _jsx(PlusOutlined, {}), onClick: handleAgregarFila, children: "Agregar fila" }), _jsx(Button, { icon: _jsx(SearchOutlined, {}), onClick: () => setProductoModalOpen(true), children: "Buscar Prod." })] })), _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { maxWidth: 250 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                                        setDetalleSearch(''); } })] }), (documentoConfig?.modificaPrecio === false || documentoConfig?.modificaDescripcion === false || data?.documento?.modificaPrecio === false || data?.documento?.modificaDescripcion === false) && detalles.length > 0 && (_jsx(CamposRestringidosAlert, { modificaPrecio: documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio, modificaDescripcion: documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion })), _jsxs(DndContext, { sensors: sensors, collisionDetection: closestCenter, onDragStart: (event) => setActiveId(event.active.id), onDragEnd: handleDragEnd, onDragCancel: () => setActiveId(null), children: [_jsx(SortableContext, { items: detallesFiltrados.map((d) => d.id), strategy: verticalListSortingStrategy, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 1300 }, components: { body: { row: SortableRow } }, locale: {
                                                            emptyText: (_jsx("div", { style: { minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin registros" }) })),
                                                        } }) }), _jsx(DragOverlay, { children: activeId ? (_jsxs("div", { style: { padding: '8px 16px', background: '#fff', border: '2px solid #556ee6', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, width: 300 }, children: [_jsx(HolderOutlined, { style: { color: '#556ee6' } }), _jsx("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: detalles.find((d) => d.id === activeId)?.articulo || 'Arrastrando...' })] })) : null })] })] })),
                            },
                            {
                                key: 'consumo',
                                label: `Consumo (0)`,
                                children: (_jsx("div", { style: { padding: 24, textAlign: 'center' }, className: "paces-text-secondary", children: "Documentos que han utilizado esta nota de cr\u00E9dito (disponible despu\u00E9s de aplicar)." })),
                            },
                            {
                                key: 'asientos',
                                label: `Asientos (${data?.asientos?.length || 0})`,
                                children: (permisoModificarAsientos && estado === 0 && !selectedConcepto?.noAsientos) ? (_jsx(AsientosContableEditables, { asientos: data?.asientos || [], onChange: (nuevosAsientos) => setData((prev) => prev ? { ...prev, asientos: nuevosAsientos } : prev), editable: true, scroll: { x: 900 }, onGenerar: handleGenerarAsientos, generando: generandoAsientos })) : (_jsx(AsientosContableTable, { asientos: data?.asientos || [], scroll: { x: 900 } })),
                            },
                            {
                                key: 'historial',
                                label: `Historial (${data?.logs?.length || 0})`,
                                children: (_jsx(LogTable, { dataSource: data?.logs || [], scroll: { x: 900 } })),
                            },
                        ] })] }))] }));
};
export default DevolucionVentaFormulario;
