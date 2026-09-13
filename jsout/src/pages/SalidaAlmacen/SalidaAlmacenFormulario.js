import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Dropdown, Popover, Alert, Empty, } from 'antd';
import { SaveOutlined, CloseOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, ExclamationCircleOutlined, EditOutlined, MoreOutlined, CalendarOutlined, HolderOutlined, BarcodeOutlined, CheckCircleFilled, CheckCircleOutlined, } from '@ant-design/icons';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { salidaAlmacenApi } from '../../api/salidaAlmacenApi';
import { transaccionApi } from '../../api/transaccionApi';
import { productoApi } from '../../api/productoApi';
import { parametrosApi } from '../../api/parametrosApi';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import ModalFechaVencimiento from '../../components/ModalFechaVencimiento/ModalFechaVencimiento';
import ScannerModal from '../../components/ScannerModal/ScannerModal';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import PermissionGate from '../../components/PermissionGate';
import '../../components/FloatingLabel/FloatingField.css';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { DragHandle, SortableRow, DragListenersContext } from '../../components/DragSortable';
import { SalidaAlmacenGuide } from './SalidaAlmacenGuide';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import CamposRestringidosAlert from '../../components/CamposRestringidosAlert';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useDocumentoConfig } from '../../hooks/useDocumentoConfig';
import { formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
const { Text } = Typography;
const { TextArea } = Input;
// ===== Cálculo de fila para SAP (sin bonificable, sin flete) =====
function calcularFila(fila) {
    const cantidad = fila.cantidad || 0;
    const costo = fila.costo || 0;
    const pctDesc = fila.porcentajeDescuento || 0;
    const pctImp = fila.porcentajeImpuesto || 0;
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
function filaVacia() {
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
        porcentajeImpuesto: 0,
        impuestos: 0,
        total: 0,
        tipoArticulo: 'Producto',
    };
}
// ===== Componente principal =====
const SalidaAlmacenFormulario = () => {
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
    const { screenCode, documentCode } = useScreenConfig('FSAP');
    const documentoConfig = useDocumentoConfig(sucursalActiva, documentCode);
    const monedaDefault = getMonedaSucursalActiva();
    // ===== States =====
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState(null);
    const [detalles, setDetalles] = useState([]);
    const [suplidoresCache, setSuplidoresCache] = useState([]);
    const [almacenesCache, setAlmacenesCache] = useState([]);
    const [selectedConcepto, setSelectedConcepto] = useState(null);
    const [selectedEntidad, setSelectedEntidad] = useState(null);
    const [selectedAlmacen, setSelectedAlmacen] = useState(null);
    const [productoModalOpen, setProductoModalOpen] = useState(false);
    const [detalleSearch, setDetalleSearch] = useState('');
    const [activeId, setActiveId] = useState(null);
    const [fechaVencimientoModal, setFechaVencimientoModal] = useState({ open: false, detalleId: 0 });
    const [medidasCache, setMedidasCache] = useState([]);
    const [scannerModalOpen, setScannerModalOpen] = useState(false);
    const [modoDescuento, setModoDescuento] = useState('porcentaje');
    const [verificados, setVerificados] = useState(new Set());
    const [fechaCierreContable, setFechaCierreContable] = useState(null);
    const [fechaCierreInventario, setFechaCierreInventario] = useState(null);
    const usuario = useAuthStore((s) => s.usuario);
    const permisoModificarAsientos = usuario?.permisosEspeciales?.some((p) => p.codigo === 'pe_modificar_asientos' && p.valor === true) ?? false;
    const [generandoAsientos, setGenerandoAsientos] = useState(false);
    const [asientosLocales, setAsientosLocales] = useState([]);
    const editValuesRef = useRef({});
    const tasaAnteriorRef = useRef(1);
    const impuestosBackupRef = useRef(new Map());
    const navigationConfirmedRef = useFormularioNavigation();
    // Refs para la guía
    const conceptoRef = useRef(null);
    const suplidorRef = useRef(null);
    const almacenRef = useRef(null);
    const agregarFilaRef = useRef(null);
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
            form.setFieldsValue({ [field]: editingValueRef.current });
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
    const refValue = Form.useWatch('referencia', form) || '';
    const tasaValue = Form.useWatch('tasa', form) ?? 1;
    const sinOC = true;
    const isLarge = screens.xl ?? true;
    // ===== Determinar estado =====
    const estado = data?.estado ?? 0;
    const esCerrado = data?.periodo === 6;
    const esBorrador = estado === 0;
    const esAplicado = estado === 1;
    const esAnulado = estado === 3;
    // ===== Cargar datos de apoyo al montar =====
    useEffect(() => {
        setActiveModule(screenCode);
        const pageTitle = mode === 'crear' ? 'Nuevo Salida de Almacén' : 'Editar Salida de Almacén';
        setPageTitleOverride(pageTitle);
        const cleanup = () => {
            resetToolbar();
            setPageTitleOverride('');
        };
        // === Si viene de Clonar ===
        if (cloneData) {
            setDetalles((cloneData.detalles || []).map((d) => calcularFila(d)));
            setSelectedConcepto(cloneData.concepto || null);
            setConceptoSearchText(`${cloneData.concepto?.codigo || ''} - ${toTitleCase(cloneData.concepto?.nombre || '')}`);
            setSelectedEntidad(cloneData.suplidor || cloneData.entidad || null);
            setSelectedAlmacen(cloneData.almacen || null);
            const fechaDoc = cloneData.fechaDocumento ? parseDateRaw(cloneData.fechaDocumento) : null;
            form.setFieldsValue({
                concepto: cloneData.concepto?.codigo || '',
                suplidor: cloneData.suplidor?.codigo || cloneData.entidad?.codigo || '',
                almacen: cloneData.almacen?.codigo || '',
                fechaDocumento: fechaDoc ? dayjs(fechaDoc) : dayjs(),
                fechaRecibo: cloneData.fechaRecibo ? dayjs(parseDateRaw(cloneData.fechaRecibo)) : dayjs(),
                ncf: cloneData.ncf || '',
                referencia: cloneData.referencia || '',
                moneda: cloneData.moneda?.nombre || '',
                tasa: cloneData.tasa || 1,
                nota: cloneData.nota || '',
            });
            return cleanup;
        }
        // Cargar almacenes
        salidaAlmacenApi.obtenerAlmacenes(sucursalActiva).then(setAlmacenesCache).catch((err) => { console.warn('Error al cargar almacenes cache en formulario salida', err); });
        unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch((err) => { console.warn('Error al cargar medidas cache en formulario salida', err); });
        // Obtener fechas de cierre (contable e inventario)
        parametrosApi.obtenerFechaCierreInventario(sucursalActiva).then(setFechaCierreInventario).catch((err) => { console.warn('Error al obtener fecha cierre inventario en salida', err); });
        parametrosApi.obtenerFechaCierreFiscal(sucursalActiva).then(setFechaCierreContable).catch((err) => { console.warn('Error al obtener fecha cierre fiscal en salida', err); });
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
        salidaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            setData(res);
            setPageTitleOverride(`Editar - ${res.documento?.codigo || 'SAP'}-${res.noDocumento || ''}`);
            setDetalles((res.detalles || []).map((d) => calcularFila(d)));
            setAsientosLocales(res.asientos || []);
            setSelectedConcepto(res.concepto || null);
            setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
            setSelectedEntidad(res.suplidor || res.entidad || null);
            setSelectedAlmacen(res.almacen || null);
            const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
            form.setFieldsValue({
                concepto: res.concepto?.codigo || '',
                suplidor: res.suplidor?.codigo || res.entidad?.codigo || '',
                almacen: res.almacen?.codigo || '',
                fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                fechaRecibo: res.fechaRecibo
                    ? dayjs(parseDateRaw(res.fechaRecibo))
                    : null,
                ncf: res.ncf || '',
                referencia: res.referencia || '',
                moneda: res.moneda?.nombre || '',
                tasa: res.tasa || 1,
                nota: res.nota || '',
            });
            // Cargar suplidores según el concepto
            if (res.concepto?.codigo) {
                salidaAlmacenApi.obtenerSuplidores(sucursalActiva)
                    .then(setSuplidoresCache)
                    .catch((err) => { console.warn('Error al cargar suplidores cache al editar salida', err); });
            }
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
            message.error(msg);
            setLoadingError(true);
            navigate('/FSAP', { replace: true });
        })
            .finally(() => setLoading(false));
    }, [mode, id, sucursalActiva, form, navigate]);
    // ===== Efecto para detectar cambios en la tasa y preguntar por actualización de costos =====
    useEffect(() => {
        const nuevaTasa = tasaValue;
        const tasaAnterior = tasaAnteriorRef.current;
        // Solo si cambió realmente y no es el valor inicial
        if (tasaAnterior !== nuevaTasa && tasaAnterior !== 1 && editingField === null) {
            Modal.confirm({
                title: 'Actualizar costos',
                icon: _jsx(ExclamationCircleOutlined, {}),
                content: `¿Desea actualizar los costos de los detalles en base a la nueva tasa (${tasaAnterior} → ${nuevaTasa})?`,
                onOk: () => {
                    setDetalles((prev) => prev.map((d) => {
                        const costoActual = d.costo || 0;
                        const nuevoCosto = Math.round((costoActual / nuevaTasa) * 100) / 100;
                        return calcularFila({ ...d, costo: nuevoCosto });
                    }));
                    message.success('Costos actualizados correctamente');
                },
                onCancel: () => {
                    // No hacer nada, solo mantener la tasa nueva sin actualizar costos
                },
            });
        }
        tasaAnteriorRef.current = nuevaTasa;
    }, [tasaValue, editingField]);
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
                    navigationConfirmedRef.current = true;
                    navigate('/FSAP', { replace: true });
                }
                else {
                    if (id) {
                        setLoading(true);
                        salidaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
                            .then((res) => {
                            setData(res);
                            setPageTitleOverride(`Editar - ${res.documento?.codigo || 'SAP'}-${res.noDocumento || ''}`);
                            setDetalles(res.detalles || []);
                            setAsientosLocales(res.asientos || []);
                            setSelectedConcepto(res.concepto || null);
                            setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
                            setSelectedEntidad(res.suplidor || res.entidad || null);
                            setSelectedAlmacen(res.almacen || null);
                            const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
                            form.setFieldsValue({
                                concepto: res.concepto?.codigo || '',
                                suplidor: res.suplidor?.codigo || res.entidad?.codigo || '',
                                almacen: res.almacen?.codigo || '',
                                fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                                fechaRecibo: res.fechaRecibo
                                    ? dayjs(parseDateRaw(res.fechaRecibo))
                                    : null,
                                ncf: res.ncf || '',
                                referencia: res.referencia || '',
                                moneda: res.moneda?.nombre || '',
                                tasa: res.tasa || 1,
                                nota: res.nota || '',
                            });
                            if (res.concepto?.codigo) {
                                salidaAlmacenApi.obtenerSuplidores(sucursalActiva)
                                    .then(setSuplidoresCache)
                                    .catch((err) => { console.warn('Error al recargar suplidores cache al cambiar concepto en salida', err); });
                            }
                        })
                            .catch((err) => {
                            const msg = err?.response?.data?.errorMessage || 'Error al recargar el documento';
                            message.error(msg);
                        })
                            .finally(() => setLoading(false));
                    }
                    navigationConfirmedRef.current = true;
                    navigate(`/FSAP/${id}`, { replace: true });
                }
            },
        });
    };
    // Validación del formulario
    const validarFormulario = () => {
        const values = form.getFieldsValue();
        if (!selectedConcepto)
            return 'Debe elegir un Concepto para poder continuar';
        if (!selectedAlmacen && !values.almacen)
            return 'El almacén es requerido';
        if (suplidoresCache.length > 0 && !values.suplidor && !selectedEntidad)
            return 'El suplidor es requerido';
        if (detalles.length === 0)
            return 'No se puede crear un documento de SALIDA ALMACEN sin detalle.';
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
        // Validar productos con vencimiento
        const sinVencimiento = detalles.filter((d) => d.tieneVencimiento && !d.fechaVencimiento);
        if (sinVencimiento.length > 0) {
            return `Los siguientes productos requieren fecha de vencimiento: ${sinVencimiento.map((d) => d.articulo).join(', ')}`;
        }
        return null;
    };
    // Construir DTO desde el formulario
    const construirDTO = () => {
        const values = form.getFieldsValue();
        const base = data || {};
        const entidadSel = suplidoresCache.find((e) => e.codigo === values.suplidor) || selectedEntidad;
        const fechaDoc = values.fechaDocumento
            ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
                ? toISOFormat(values.fechaDocumento.toDate())
                : values.fechaDocumento)
            : toISOFormat(new Date());
        const fechaRecibo = values.fechaRecibo
            ? (typeof values.fechaRecibo === 'object' && values.fechaRecibo.toDate
                ? toISOFormat(values.fechaRecibo.toDate())
                : values.fechaRecibo)
            : undefined;
        const totalSub = detalles.reduce((s, d) => s + (d.subTotal || 0), 0);
        const totalDesc = detalles.reduce((s, d) => s + (d.descuento || 0), 0);
        const totalImp = detalles.reduce((s, d) => s + (d.impuestos || 0), 0);
        const total = detalles.reduce((s, d) => s + (d.total || 0), 0);
        return {
            id: base.id || 0,
            fechaDocumento: fechaDoc,
            fechaRecibo,
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
            retenciones: base.retenciones || 0,
            tipoDocumento: base.tipoDocumento ?? 71,
            tasa: values.tasa || 1,
            diasCredito: entidadSel?.diasCredito || base.diasCredito || 0,
            documento: base.documento || { codigo: documentCode },
            concepto: selectedConcepto || { nombre: '', codigo: '' },
            moneda: base.moneda || getMonedaSucursalActiva(),
            almacen: selectedAlmacen || { nombre: '', codigo: '' },
            suplidor: entidadSel || { nombre: '', codigo: '', identificacion: '' },
            entidad: entidadSel
                ? { nombre: entidadSel.nombre, codigo: entidadSel.codigo, identificacion: entidadSel.identificacion || '', telefono: entidadSel.telefono, direccion: entidadSel.direccion }
                : { nombre: '', codigo: '', identificacion: '' },
            sucursal: base.sucursal || { nombre: '', codigo: '', identificacion: '' },
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
        try {
            const dto = construirDTO();
            if (mode === 'crear') {
                const result = await salidaAlmacenApi.crear(sucursalActiva, dto);
                message.success('Salida de almacén creada exitosamente');
                navigationConfirmedRef.current = true;
                navigate(`/FSAP/${result.id}`, { replace: true });
            }
            else {
                await salidaAlmacenApi.actualizar(sucursalActiva, dto);
                message.success('Salida de almacén actualizada exitosamente');
                navigationConfirmedRef.current = true;
                navigate(`/FSAP/${id}`, { replace: true });
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
        // Cargar suplidores
        salidaAlmacenApi.obtenerSuplidores(sucursalActiva)
            .then((ents) => setSuplidoresCache(ents))
            .catch((err) => { console.warn('Error al cargar suplidores cache al seleccionar concepto en salida', err); });
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
        // === ConfigurarMoneda ===
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
        // === Auto-asignar almacén del concepto ===
        if (concepto.almacen?.codigo) {
            const al = almacenesCache.find(a => a.codigo === concepto.almacen.codigo);
            if (al) {
                setSelectedAlmacen(al);
                form.setFieldsValue({ almacen: al.codigo });
            }
        }
    };
    const handleConceptoSearchClick = () => {
        // Usamos el mismo modal inline que el del listado de conceptos
        setConceptoModalOpen(true);
    };
    const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
    const [conceptoSearchText, setConceptoSearchText] = useState('');
    const handleConceptoClear = () => {
        setSelectedConcepto(null);
        setConceptoSearchText('');
        setSuplidoresCache([]);
        form.setFieldsValue({ concepto: '', suplidor: undefined });
    };
    const handleRefresh = useCallback(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoadingError(false);
        setLoading(true);
        salidaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            setData(res);
            setPageTitleOverride(`Editar - ${res.documento?.codigo || 'SAP'}-${res.noDocumento || ''}`);
            setDetalles((res.detalles || []).map((d) => calcularFila(d)));
            setSelectedConcepto(res.concepto || null);
            setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
            setSelectedEntidad(res.suplidor || res.entidad || null);
            setSelectedAlmacen(res.almacen || null);
            const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
            form.setFieldsValue({
                concepto: res.concepto?.codigo || '',
                suplidor: res.suplidor?.codigo || res.entidad?.codigo || '',
                almacen: res.almacen?.codigo || '',
                fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                fechaRecibo: res.fechaRecibo ? dayjs(parseDateRaw(res.fechaRecibo)) : null,
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
            if (field === 'descuento') {
                const subTotal = (d.cantidad || 0) * (d.costo || 0);
                const pctCalculado = subTotal > 0 ? Math.round((Number(value) / subTotal) * 100 * 100) / 100 : 0;
                const updated = { ...d, descuento: Number(value), porcentajeDescuento: pctCalculado };
                return calcularFila(updated);
            }
            const updated = { ...d, [field]: value };
            return calcularFila(updated);
        }));
    };
    const handleProductoSelect = (producto) => {
        // Buscar la primera fila vacía (sin código) y llenarla
        const filaVaciaIdx = detalles.findIndex((d) => !d.codigo);
        if (filaVaciaIdx === -1) {
            // Agregar nueva fila
            const nuevaFila = filaVacia();
            const nuevoId = -(detalles.length + 1);
            setDetalles((prev) => {
                const filled = {
                    ...nuevaFila,
                    id: nuevoId,
                    codigo: producto.codigo,
                    articulo: producto.articulo,
                    referencia: producto.referencia || '',
                    costo: producto.costo || 0,
                    cantidad: 1,
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
                    costo: producto.costo || 0,
                    cantidad: 1,
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
    const handleScannerProducto = (producto) => {
        const nuevaFila = filaVacia();
        const nuevoId = -(detalles.length + 1);
        setDetalles((prev) => {
            const filled = {
                ...nuevaFila,
                id: nuevoId,
                codigo: producto.codigo,
                articulo: producto.articulo,
                referencia: producto.referencia || '',
                costo: producto.costo || 0,
                cantidad: producto.cantidad || 1,
                familia: producto.familia,
                medida: producto.medida,
            };
            return [calcularFila(filled), ...prev];
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
    // ===== Asientos Contables =====
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
            render: (_, record) => {
                const verificado = verificados.has(record.id);
                return (_jsxs("div", { style: { fontSize: 13 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { children: record.codigo || '-' }), verificado ? (_jsx(CheckCircleFilled, { style: { color: '#4fc3f7', fontSize: 14 } })) : null] }), record.referencia && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5 }, children: record.referencia }))] }));
            },
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
            render: (_, _record, idx) => (_jsxs("div", { children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, step: 0.01, precision: 2, controls: false, defaultValue: detalles[idx]?.cantidad, onChange: (val) => { editValuesRef.current[`${detalles[idx].id}_cantidad`] = val || 0; }, onBlur: () => { const val = editValuesRef.current[`${detalles[idx].id}_cantidad`] ?? (detalles[idx]?.cantidad || 0); handleDetalleCalculate(detalles[idx].id, 'cantidad', val); }, onPressEnter: () => { const val = editValuesRef.current[`${detalles[idx].id}_cantidad`] ?? (detalles[idx]?.cantidad || 0); handleDetalleCalculate(detalles[idx].id, 'cantidad', val); } }), detalles[idx]?.medida?.nombre && !sinOC && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5, marginTop: 2 }, children: toTitleCase(detalles[idx].medida.nombre) }))] })),
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
                    return (_jsxs("div", { children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, step: 0.01, precision: 2, controls: false, value: fila.costo, onChange: (val) => handleDetalleUpdateValue(fila.id, 'costo', val || 0), onBlur: () => handleDetalleCalculate(fila.id, 'costo', fila.costo || 0), onPressEnter: () => handleDetalleCalculate(fila.id, 'costo', fila.costo || 0) }), _jsxs("div", { style: { fontSize: 11, lineHeight: 1.5, color: '#999' }, children: [formatNumber(costoUnitario), " \u00D7 ", factor] })] }));
                }
                return (_jsxs("div", { children: [_jsx("div", { style: { textAlign: 'right', fontWeight: 500 }, children: formatNumber(costoBase) }), _jsxs("div", { style: { fontSize: 11, lineHeight: 1.5, color: '#999' }, children: [formatNumber(costoUnitario), " \u00D7 ", factor] })] }));
            },
        },
        {
            title: 'Descuento',
            key: 'descuento',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, _record, idx) => modoDescuento === 'porcentaje' ? (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }, children: [_jsxs(Space.Compact, { style: { width: '100%' }, children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, max: 100, step: 0.01, precision: 2, controls: false, defaultValue: detalles[idx]?.porcentajeDescuento, onChange: (val) => { editValuesRef.current[`${detalles[idx].id}_descuento`] = val || 0; }, onBlur: () => { const val = editValuesRef.current[`${detalles[idx].id}_descuento`] ?? detalles[idx]?.porcentajeDescuento; handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', val); }, onPressEnter: () => { const val = editValuesRef.current[`${detalles[idx].id}_descuento`] ?? detalles[idx]?.porcentajeDescuento; handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', val); } }, `pct_${detalles[idx].id}_${modoDescuento}`), _jsx("span", { onClick: () => setModoDescuento('pesos'), style: { cursor: 'pointer', display: 'inline-flex' }, children: _jsx(Input, { size: "small", placeholder: "%", disabled: true, style: { width: 36, textAlign: 'center', borderLeft: 'none', pointerEvents: 'none' } }) })] }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5, marginTop: 'auto' }, children: formatNumber(detalles[idx]?.descuento || 0) })] })) : (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }, children: [_jsxs(Space.Compact, { style: { width: '100%' }, children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, step: 0.01, precision: 2, controls: false, defaultValue: detalles[idx]?.descuento, onChange: (val) => { editValuesRef.current[`${detalles[idx].id}_descuento_pesos`] = val || 0; }, onBlur: () => { const val = editValuesRef.current[`${detalles[idx].id}_descuento_pesos`] ?? detalles[idx]?.descuento; handleDetalleCalculate(detalles[idx].id, 'descuento', val); }, onPressEnter: () => { const val = editValuesRef.current[`${detalles[idx].id}_descuento_pesos`] ?? detalles[idx]?.descuento; handleDetalleCalculate(detalles[idx].id, 'descuento', val); } }, `pesos_${detalles[idx].id}_${modoDescuento}`), _jsx("span", { onClick: () => setModoDescuento('porcentaje'), style: { cursor: 'pointer', display: 'inline-flex' }, children: _jsx(Input, { size: "small", placeholder: "$", disabled: true, style: { width: 36, textAlign: 'center', borderLeft: 'none', pointerEvents: 'none' } }) })] }), _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5, marginTop: 'auto' }, children: [formatNumber(detalles[idx]?.porcentajeDescuento || 0), "%"] })] })),
        },
        {
            title: 'SubTotal',
            dataIndex: 'subTotal',
            key: 'subTotal',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => (_jsxs("div", { children: [_jsx(Text, { children: formatNumber(record.subTotal || 0) }), _jsx("div", { style: { fontSize: 11, lineHeight: 1.5 }, children: "\u00A0" })] })),
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
            render: (_, record) => (_jsxs("div", { children: [_jsx(Text, { strong: true, children: formatNumber(record.total || 0) }), _jsx("div", { style: { fontSize: 11, lineHeight: 1.5 }, children: "\u00A0" })] })),
        },
        {
            title: '',
            key: 'acciones',
            width: 50,
            onCell: () => ({ style: { paddingRight: 8 } }),
            render: (_, _record, idx) => {
                const verificado = verificados.has(detalles[idx].id);
                const items = [
                    {
                        key: 'eliminar',
                        label: 'Eliminar',
                        icon: _jsx(DeleteOutlined, {}),
                        danger: true,
                        onClick: () => handleEliminarFila(detalles[idx].id),
                    },
                ];
                items.unshift({
                    key: 'verificar',
                    label: verificado ? 'Desverificar' : 'Verificar',
                    icon: _jsx(CheckCircleOutlined, { style: { color: verificado ? '#4fc3f7' : undefined } }),
                    danger: false,
                    onClick: () => handleToggleVerificar(detalles[idx].id),
                });
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
    const renderEncabezado = () => (_jsx(Card, { className: "paces-card", size: "small", title: "Datos Generales", extra: _jsx(EstadoTag, { estado: estado, periodo: data?.periodo }), style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: 16, children: [_jsx(Col, { xs: 24, xxl: 18, children: _jsx(Form, { form: form, layout: "vertical", size: "middle", style: { paddingTop: 24 }, children: _jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, sm: 12, lg: 9, children: _jsx(Form.Item, { name: "fechaDocumento", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Fecha Documento", required: true, children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabledDate: (current) => {
                                                    if (!current)
                                                        return false;
                                                    const cierre = fechasCierre?.[sucursalActiva];
                                                    if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                                        return true;
                                                    const cierreInv = fechasCierreInv?.[sucursalActiva];
                                                    if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                                        return true;
                                                    return false;
                                                } }) }) }) }), _jsxs(Col, { xs: 24, sm: 12, lg: 15, children: [_jsx("div", { ref: conceptoRef, children: _jsx(FloatingField, { label: "Concepto", required: true, externalValue: conceptoSearchText, children: _jsx(Input, { placeholder: " ", value: conceptoSearchText, readOnly: true, suffix: _jsx(SearchOutlined, { style: { cursor: 'pointer', color: 'rgba(0,0,0,0.45)' } }), onClick: handleConceptoSearchClick }) }) }), _jsx(ConceptoInfoLabel, { concepto: selectedConcepto }), _jsx(Form.Item, { name: "concepto", hidden: true, children: _jsx(Input, {}) })] }), _jsx(Col, { xs: 24, sm: 12, lg: 9, children: _jsx(Form.Item, { name: "fechaRecibo", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Fecha Recibo", children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabledDate: (current) => {
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
                                                }, children: almacenesCache.map((alm) => (_jsx(Select.Option, { value: alm.codigo, children: toTitleCase(alm.nombre) }, alm.codigo))) }) }) }) }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "suplidor", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Suplidor / Entidad", required: true, ref: suplidorRef, children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", onChange: (val) => {
                                                    const ent = suplidoresCache.find((e) => e.codigo === val);
                                                    setSelectedEntidad(ent || null);
                                                }, children: suplidoresCache.map((ent) => (_jsxs(Select.Option, { value: ent.codigo, children: [toTitleCase(ent.nombre), ent.identificacion ? ` (${ent.identificacion})` : ''] }, ent.codigo))) }) }) }) }), _jsxs(Col, { xs: 24, children: [_jsx("div", { style: { marginBottom: 16 }, children: _jsxs(Space, { size: [8, 8], wrap: true, children: [editingField === 'referencia' ? (_jsx(Input, { size: "small", style: { width: 200 }, placeholder: "Referencia", autoFocus: true, defaultValue: editingValueRef.current, onChange: (e) => { editingValueRef.current = e.target.value; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                            if (e.key === 'Escape') {
                                                                e.stopPropagation();
                                                                cancelFieldEditor();
                                                            }
                                                        } })) : refValue ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('referencia'), children: ["Ref: ", refValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('referencia'), children: [_jsx(PlusOutlined, {}), " Referencia"] })), editingField === 'tasa' ? (_jsx(InputNumber, { size: "small", style: { width: 120 }, min: 0, step: 0.01, placeholder: "Tasa", autoFocus: true, defaultValue: editingValueRef.current, onChange: (val) => { editingValueRef.current = val ?? 1; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                            if (e.key === 'Escape') {
                                                                e.stopPropagation();
                                                                cancelFieldEditor();
                                                            }
                                                        } })) : tasaValue !== 1 ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('tasa'), children: ["Tasa: ", tasaValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('tasa'), children: [_jsx(PlusOutlined, {}), " Tasa"] }))] }) }), _jsx(Form.Item, { name: "referencia", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "tasa", hidden: true, children: _jsx(InputNumber, {}) }), _jsx(Form.Item, { name: "moneda", hidden: true, children: _jsx(Input, {}) })] }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "nota", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Nota", children: _jsx(TextArea, { rows: 3 }) }) }) })] }) }) }), _jsx(Col, { xs: 24, xxl: 6, children: _jsx("div", { style: { marginTop: 24 }, children: _jsx(TotalesCard, { subTotal: totales.subTotal, descuento: totales.descuento, impuestos: totales.impuestos, total: totales.total, hideTitle: true, monedaSimbolo: data?.moneda?.simbolo || selectedConcepto?.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: data?.moneda?.nombre || selectedConcepto?.moneda?.nombre || monedaDefault.nombre, tasa: tasaValue ?? data?.tasa ?? 1 }) }) })] }) }));
    return (_jsxs("div", { children: [_jsx(FormularioToolbar, { saving: saving, estado: estado, periodo: data?.periodo, onGuardar: handleGuardar, onCancelar: handleCancelar }), loadingError && (_jsx(Alert, { message: "Error al cargar formulario de salida de almac\u00E9n", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(BuscarConceptoModal, { open: conceptoModalOpen, onClose: () => setConceptoModalOpen(false), onSelect: handleConceptoSelect, sucursal: sucursalActiva, documento: "SAP" }), _jsx(BuscarProductoModal, { open: productoModalOpen, onClose: () => setProductoModalOpen(false), onSelect: handleProductoSelect, mode: "inventario" }), _jsx(ScannerModal, { open: scannerModalOpen, onClose: () => setScannerModalOpen(false), onSelect: handleScannerProducto }), isLarge ? (_jsx(Row, { gutter: 16, children: _jsxs(Col, { xxl: 24, children: [renderEncabezado(), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: [
                                {
                                    key: 'detalles',
                                    label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`,
                                    children: (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, ref: agregarFilaRef, children: [_jsxs(Space, { children: [_jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: () => setProductoModalOpen(true), children: "Agregar producto" }), _jsx(Button, { icon: _jsx(BarcodeOutlined, {}), onClick: () => setScannerModalOpen(true) })] }), _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { maxWidth: 250 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                                            setDetalleSearch(''); } })] }), (documentoConfig?.modificaPrecio === false || documentoConfig?.modificaDescripcion === false || data?.documento?.modificaPrecio === false || data?.documento?.modificaDescripcion === false) && detalles.length > 0 && (_jsx(CamposRestringidosAlert, { modificaPrecio: documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio, modificaDescripcion: documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion })), _jsxs(DndContext, { sensors: sensors, collisionDetection: closestCenter, onDragStart: (event) => { setActiveId(event.active.id); }, onDragEnd: handleDragEnd, children: [_jsx(SortableContext, { items: detallesFiltrados.map((d) => d.id), strategy: verticalListSortingStrategy, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 1300 }, components: { body: { row: SortableRow } }, locale: {
                                                                emptyText: (_jsx("div", { style: { minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin registros" }) })),
                                                            } }) }), _jsx(DragOverlay, { children: activeId ? (_jsxs("div", { style: { padding: '8px 16px', background: '#fff', border: '2px solid #556ee6', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, width: 300 }, children: [_jsx(HolderOutlined, { style: { color: '#556ee6' } }), _jsx("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: detalles.find((d) => d.id === activeId)?.articulo || 'Arrastrando...' })] })) : null })] })] })),
                                },
                                {
                                    key: 'asientos',
                                    label: `Asientos (${(asientosLocales.length > 0 ? asientosLocales : (data?.asientos || [])).length || 0})`,
                                    children: (permisoModificarAsientos && estado === 0 && !selectedConcepto?.noAsientos) ? (_jsx(AsientosContableEditables, { asientos: asientosLocales.length > 0 ? asientosLocales : (data?.asientos || []), onChange: setAsientosLocales, editable: true, scroll: { x: 900 }, onGenerar: handleGenerarAsientos, generando: generandoAsientos })) : (_jsx(AsientosContableTable, { asientos: data?.asientos || [], scroll: { x: 900 } })),
                                },
                                {
                                    key: 'historial',
                                    label: `Historial (${data?.logs?.length || 0})`,
                                    children: (_jsx(LogTable, { dataSource: data?.logs || [], scroll: { x: 900 } })),
                                },
                            ] })] }) })) : (_jsxs("div", { children: [renderEncabezado(), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: [
                            {
                                key: 'detalles',
                                label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`,
                                children: (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, ref: agregarFilaRef, children: [_jsxs(Space, { children: [_jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: () => setProductoModalOpen(true), children: "Agregar producto" }), _jsx(Button, { icon: _jsx(BarcodeOutlined, {}), onClick: () => setScannerModalOpen(true) })] }), _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { maxWidth: 250 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                                        setDetalleSearch(''); } })] }), (documentoConfig?.modificaPrecio === false || documentoConfig?.modificaDescripcion === false || data?.documento?.modificaPrecio === false || data?.documento?.modificaDescripcion === false) && detalles.length > 0 && (_jsx(CamposRestringidosAlert, { modificaPrecio: documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio, modificaDescripcion: documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion })), _jsxs(DndContext, { sensors: sensors, collisionDetection: closestCenter, onDragStart: (event) => { setActiveId(event.active.id); }, onDragEnd: handleDragEnd, children: [_jsx(SortableContext, { items: detallesFiltrados.map((d) => d.id), strategy: verticalListSortingStrategy, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 1300 }, components: { body: { row: SortableRow } }, locale: {
                                                            emptyText: (_jsx("div", { style: { minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin registros" }) })),
                                                        } }) }), _jsx(DragOverlay, { children: activeId ? (_jsxs("div", { style: { padding: '8px 16px', background: '#fff', border: '2px solid #556ee6', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, width: 300 }, children: [_jsx(HolderOutlined, { style: { color: '#556ee6' } }), _jsx("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: detalles.find((d) => d.id === activeId)?.articulo || 'Arrastrando...' })] })) : null })] })] })),
                            },
                            {
                                key: 'asientos',
                                label: `Asientos (${(asientosLocales.length > 0 ? asientosLocales : (data?.asientos || [])).length || 0})`,
                                children: (permisoModificarAsientos && estado === 0 && !selectedConcepto?.noAsientos) ? (_jsx(AsientosContableEditables, { asientos: asientosLocales.length > 0 ? asientosLocales : (data?.asientos || []), onChange: setAsientosLocales, editable: true, scroll: { x: 900 }, onGenerar: handleGenerarAsientos, generando: generandoAsientos })) : (_jsx(AsientosContableTable, { asientos: data?.asientos || [], scroll: { x: 900 } })),
                            },
                            {
                                key: 'historial',
                                label: `Historial (${data?.logs?.length || 0})`,
                                children: (_jsx(LogTable, { dataSource: data?.logs || [], scroll: { x: 900 } })),
                            },
                        ] })] })), (mode === 'crear' || esBorrador) && (_jsx(SalidaAlmacenGuide, { mode: mode, concepto: selectedConcepto, suplidor: selectedEntidad, almacen: selectedAlmacen, detallesCount: detalles.length, conceptoRef: conceptoRef, suplidorRef: suplidorRef, almacenRef: almacenRef, agregarFilaRef: agregarFilaRef, suplidoresDisponibles: suplidoresCache.length > 0 })), _jsx(ModalFechaVencimiento, { open: fechaVencimientoModal.open, onClose: () => setFechaVencimientoModal({ open: false, detalleId: 0 }), onFechaChange: handleFechaVencimiento })] }));
};
export default SalidaAlmacenFormulario;
