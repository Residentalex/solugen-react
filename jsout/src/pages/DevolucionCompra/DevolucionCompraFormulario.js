import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Dropdown, Popover, Alert, Empty, } from 'antd';
import { SaveOutlined, CloseOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, ClearOutlined, ExclamationCircleOutlined, EditOutlined, MoreOutlined, CalendarOutlined, HolderOutlined, BarcodeOutlined, CheckCircleOutlined, CloseCircleOutlined, RedoOutlined, PercentageOutlined, } from '@ant-design/icons';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { devolucionCompraApi } from '../../api/devolucionCompraApi';
import { productoApi } from '../../api/productoApi';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import ModalFechaVencimiento from '../../components/ModalFechaVencimiento/ModalFechaVencimiento';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import { BuscarEntradaModal } from '../../components/BuscarEntradaModal';
import ScannerModal from '../../components/ScannerModal/ScannerModal';
import ProductosOrigenModal from '../../components/ProductosOrigenModal/ProductosOrigenModal';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import PermissionGate from '../../components/PermissionGate';
import '../../components/FloatingLabel/FloatingField.css';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import { transaccionApi } from '../../api/transaccionApi';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { DragHandle, SortableRow, DragListenersContext } from '../../components/DragSortable';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useDocumentoConfig } from '../../hooks/useDocumentoConfig';
import { formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import CamposRestringidosAlert from '../../components/CamposRestringidosAlert';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
const { Text } = Typography;
const { TextArea } = Input;
// ===== Cálculo de fila SAP (misma fórmula) =====
function calcularFila(fila) {
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
function filaVacia() {
    return {
        id: 0,
        codigo: '',
        articulo: '',
        referencia: '',
        cantidad: 0,
        devuelto: 0,
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
// ===== Componente principal =====
const DevolucionCompraFormulario = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const entradaId = location.state?.entradaId;
    const cloneData = location.state?.cloneData;
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const screens = Grid.useBreakpoint();
    const mode = id ? 'editar' : 'crear';
    const { screenCode, documentCode } = useScreenConfig('FDVC');
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
    const [tiposCache, setTiposCache] = useState([]);
    const [selectedTipo, setSelectedTipo] = useState(null);
    const [selectedConcepto, setSelectedConcepto] = useState(null);
    const [selectedEntidad, setSelectedEntidad] = useState(null);
    const [selectedAlmacen, setSelectedAlmacen] = useState(null);
    const [selectedEntrada, setSelectedEntrada] = useState(null);
    const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
    const [conceptoSearchText, setConceptoSearchText] = useState('');
    const [productoModalOpen, setProductoModalOpen] = useState(false);
    const [scannerModalOpen, setScannerModalOpen] = useState(false);
    const [entradaModalOpen, setEntradaModalOpen] = useState(false);
    const [entradaDetallesData, setEntradaDetallesData] = useState([]);
    const [comodines, setComodines] = useState([]);
    const [productosOrigenModalOpen, setProductosOrigenModalOpen] = useState(false);
    const [modoDescuento, setModoDescuento] = useState('porcentaje');
    const [detalleSearch, setDetalleSearch] = useState('');
    const [activeId, setActiveId] = useState(null);
    const [fechaVencimientoModal, setFechaVencimientoModal] = useState({ open: false, detalleId: 0 });
    const [medidasCache, setMedidasCache] = useState([]);
    const [documento, setDocumento] = useState(null);
    const usuario = useAuthStore((s) => s.usuario);
    const permisoModificarAsientos = usuario?.permisosEspeciales?.some((p) => p.codigo === 'pe_modificar_asientos' && p.valor === true) ?? false;
    const [generandoAsientos, setGenerandoAsientos] = useState(false);
    const [asientosLocales, setAsientosLocales] = useState([]);
    const editValuesRef = useRef({});
    const impuestosBackupRef = useRef(new Map());
    const navigationConfirmedRef = useFormularioNavigation();
    // Refs para la guía
    const tipoRef = useRef(null);
    const conceptoRef = useRef(null);
    const suplidorRef = useRef(null);
    const almacenRef = useRef(null);
    const agregarFilaRef = useRef(null);
    const entradaRef = useRef(null);
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
    // ===== Estado para campos rápidos (NCF, Tasa) =====
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
    // ===== Watchers reactivos =====
    const ncfValue = Form.useWatch('ncf', form) || '';
    const tasaValue = Form.useWatch('tasa', form) ?? 1;
    const sinOC = entradaDetallesData.length === 0;
    const isLarge = screens.xl ?? true;
    const trabajarEnUnidad = (documento ?? data?.documento)?.trabajarEnUnidad === true;
    // ===== Determinar estado =====
    const estado = data?.estado ?? 0;
    const esCerrado = data?.periodo === 6;
    const esBorrador = estado === 0;
    const esAplicado = estado === 1;
    const esAnulado = estado === 3;
    // ===== Cargar datos de apoyo al montar =====
    useEffect(() => {
        setActiveModule(screenCode);
        const pageTitle = mode === 'crear' ? 'Nueva Devolución de Compra' : 'Editar Devolución de Compra';
        setPageTitleOverride(pageTitle);
        const cleanup = () => {
            resetToolbar();
            setPageTitleOverride('');
        };
        // === Si viene de Clonar ===
        if (cloneData) {
            setDetalles((cloneData.detalles || []).map((d) => calcularFila(d)));
            setSelectedTipo(cloneData.tipo || null);
            setSelectedConcepto(cloneData.concepto || null);
            setConceptoSearchText(`${cloneData.concepto?.codigo || ''} - ${toTitleCase(cloneData.concepto?.nombre || '')}`);
            setSelectedEntidad(cloneData.suplidor || cloneData.entidad || null);
            setSelectedAlmacen(cloneData.almacen || null);
            setSelectedEntrada(cloneData.entrada || null);
            const fechaDoc = cloneData.fechaDocumento ? parseDateRaw(cloneData.fechaDocumento) : null;
            form.setFieldsValue({
                tipo: cloneData.tipo?.codigo || '',
                concepto: cloneData.concepto?.codigo || '',
                suplidor: cloneData.suplidor?.codigo || cloneData.entidad?.codigo || '',
                almacen: cloneData.almacen?.codigo || '',
                fechaDocumento: fechaDoc ? dayjs(fechaDoc) : dayjs(),
                ncf: cloneData.ncf || '',
                referencia: cloneData.referencia || '',
                moneda: cloneData.moneda?.nombre || '',
                tasa: cloneData.tasa || 1,
                nota: cloneData.nota || '',
            });
            return cleanup;
        }
        // Cargar catálogos iniciales
        devolucionCompraApi.obtenerAlmacenes(sucursalActiva).then(r => setAlmacenesCache(r || [])).catch((err) => { console.warn('Error al cargar almacenes cache en devolucion compra', err); });
        devolucionCompraApi.obtenerTipos(sucursalActiva).then(r => setTiposCache(r || [])).catch((err) => { console.warn('Error al cargar tipos cache en devolucion compra', err); });
        devolucionCompraApi.obtenerSuplidores(sucursalActiva).then(r => setSuplidoresCache(r || [])).catch((err) => { console.warn('Error al cargar suplidores cache en devolucion compra', err); });
        unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch((err) => { console.warn('Error al cargar medidas cache en devolucion compra', err); });
        // Inicializar fecha en modo crear
        if (mode === 'crear') {
            form.setFieldsValue({
                fechaDocumento: dayjs(),
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
        devolucionCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            setData(res);
            setDetalles(res.detalles || []);
            setSelectedTipo(res.tipo || null);
            setSelectedConcepto(res.concepto || null);
            setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
            setSelectedEntidad(res.suplidor || res.entidad || null);
            setSelectedAlmacen(res.almacen || null);
            setSelectedEntrada(res.entrada || null);
            const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
            form.setFieldsValue({
                tipo: res.tipo?.codigo || '',
                concepto: res.concepto?.codigo || '',
                suplidor: res.suplidor?.codigo || res.entidad?.codigo || '',
                almacen: res.almacen?.codigo || '',
                fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                ncf: res.ncf || '',
                referencia: res.referencia || '',
                moneda: res.moneda?.nombre || '',
                tasa: res.tasa || 1,
                nota: res.nota || '',
            });
            // Cargar suplidores
            devolucionCompraApi.obtenerSuplidores(sucursalActiva)
                .then(r => setSuplidoresCache(r || []))
                .catch((err) => { console.warn('Error al cargar suplidores cache al editar devolucion', err); });
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al cargar el documento');
            message.error(msg);
            setLoadingError(true);
            navigationConfirmedRef.current = true;
            navigate('/FDVC', { replace: true });
        })
            .finally(() => setLoading(false));
    }, [mode, id, sucursalActiva, form, navigate]);
    // ===== Pre-cargar entrada si viene de EntradaAlmacenDetalle =====
    useEffect(() => {
        if (mode !== 'crear' || !entradaId)
            return;
        if (!documentoConfig)
            return;
        const loadFromEntrada = async () => {
            try {
                const detalleEntrada = await devolucionCompraApi.obtenerDetalleEntrada(sucursalActiva, entradaId);
                setEntradaDetallesData(detalleEntrada.detalles || []);
                setSelectedEntrada({
                    id: detalleEntrada.id,
                    noDocumento: detalleEntrada.noDocumento || '',
                    documento: detalleEntrada.documento ?? { codigo: 'ENP', nombre: '' },
                });
                if (detalleEntrada.suplidor?.codigo) {
                    setSelectedEntidad(detalleEntrada.suplidor);
                    form.setFieldsValue({
                        suplidor: detalleEntrada.suplidor.codigo,
                        referencia: `${detalleEntrada.documento?.codigo || 'ENP'}-${detalleEntrada.noDocumento || ''}`,
                    });
                }
                // Precargar almacén desde la ENP
                if (detalleEntrada.almacen?.codigo) {
                    setSelectedAlmacen(detalleEntrada.almacen);
                    form.setFieldsValue({ almacen: detalleEntrada.almacen.codigo });
                }
                // Precargar tipo por defecto desde configuración de empresa
                try {
                    const tipoDefecto = await devolucionCompraApi.obtenerTipoDVCDefecto(sucursalActiva);
                    if (tipoDefecto?.codigo) {
                        setSelectedTipo(tipoDefecto);
                        form.setFieldsValue({ tipo: tipoDefecto.codigo });
                        // Los conceptos se cargarán al abrir el modal de concepto
                    }
                }
                catch (err) {
                    // Silencioso - si falla, el usuario puede seleccionar manualmente
                    console.warn('No se pudo cargar el tipo por defecto:', err);
                }
                const nuevosDetalles = (detalleEntrada.detalles || []).map((d, idx) => ({
                    ...filaVacia(),
                    id: -(idx + 1),
                    idExterno: d.idExterno || d.id,
                    codigo: d.codigo || '',
                    articulo: d.articulo || '',
                    referencia: d.referencia || '',
                    cantidad: d.cantidad || 0,
                    devuelto: d.devuelto || 0,
                    costo: d.costo || 0,
                    porcentajeDescuento: d.porcentajeDescuento || 0,
                    familia: d.familia,
                    medida: d.medida,
                    impuesto: d.impuesto,
                    tieneVencimiento: d.tieneVencimiento,
                }));
                // Cuando trabajarEnUnidad es true, convertir a unidad base genérica
                if (documentoConfig?.trabajarEnUnidad === true) {
                    nuevosDetalles.forEach((d) => {
                        if (d.medida) {
                            d.medida = { ...d.medida, nombre: 'Unidad(es)' };
                        }
                    });
                }
                setDetalles(nuevosDetalles.map((d) => calcularFila(d)));
            }
            catch (err) {
                const msg = extraerMensajeError(err, 'Error al cargar la entrada seleccionada');
                message.error(msg);
            }
        };
        loadFromEntrada();
    }, [mode, entradaId, sucursalActiva, form, documentoConfig]);
    // ===== Sincronizar documento desde data (edición) o documentoConfig (creación) =====
    useEffect(() => {
        if (data?.documento) {
            setDocumento(data.documento);
        }
        else if (documentoConfig) {
            setDocumento(documentoConfig);
        }
    }, [data, documentoConfig]);
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
                    navigate('/FDVC', { replace: true });
                }
                else {
                    if (id) {
                        setLoading(true);
                        devolucionCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
                            .then((res) => {
                            setData(res);
                            if (res.concepto?.noImpuesto) {
                                setDetalles((res.detalles || []).map((d) => calcularFila({ ...d, impuesto: undefined })));
                            }
                            else {
                                setDetalles(res.detalles || []);
                            }
                            setSelectedTipo(res.tipo || null);
                            setSelectedConcepto(res.concepto || null);
                            setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
                            setSelectedEntidad(res.suplidor || res.entidad || null);
                            setSelectedAlmacen(res.almacen || null);
                            setSelectedEntrada(res.entrada || null);
                            const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
                            form.setFieldsValue({
                                tipo: res.tipo?.codigo || '',
                                concepto: res.concepto?.codigo || '',
                                suplidor: res.suplidor?.codigo || res.entidad?.codigo || '',
                                almacen: res.almacen?.codigo || '',
                                fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                                ncf: res.ncf || '',
                                referencia: res.referencia || '',
                                moneda: res.moneda?.nombre || '',
                                tasa: res.tasa || 1,
                                nota: res.nota || '',
                            });
                            devolucionCompraApi.obtenerSuplidores(sucursalActiva)
                                .then(r => setSuplidoresCache(r || []))
                                .catch((err) => { console.warn('Error al recargar suplidores cache al cambiar concepto en devolucion', err); });
                        })
                            .catch((err) => {
                            const msg = extraerMensajeError(err, 'Error al recargar el documento');
                            message.error(msg);
                        })
                            .finally(() => setLoading(false));
                    }
                    navigationConfirmedRef.current = true;
                    navigate(`/FDVC/${id}`, { replace: true });
                }
            },
        });
    };
    // Validación del formulario (reglas desde ValidarDatos DVC)
    const validarFormulario = () => {
        const values = form.getFieldsValue();
        if (!selectedTipo)
            return 'Debe seleccionar un Tipo de Documento antes de elegir un Concepto.';
        if (!selectedConcepto)
            return 'Debe elegir un Concepto para poder continuar.';
        if (!selectedAlmacen && !values.almacen)
            return 'El almacén es requerido.';
        if (suplidoresCache.length > 0 && !values.suplidor && !selectedEntidad)
            return 'El suplidor es requerido.';
        if (detalles.length === 0)
            return 'No se puede crear un documento de DEVOLUCION COMPRA sin detalle.';
        if (!detalles.some((d) => (d.cantidad || 0) > 0))
            return 'Debe tener al menos un detalle con cantidad > 0';
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
        const totalSub = detalles.reduce((s, d) => s + (d.subTotal || 0), 0);
        const totalDesc = detalles.reduce((s, d) => s + (d.descuento || 0), 0);
        const totalImp = detalles.reduce((s, d) => s + (d.impuestos || 0), 0);
        const total = detalles.reduce((s, d) => s + (d.total || 0), 0);
        // Saneamiento de campos largos para evitar "string right truncation" en Firebird
        const nota = (values.nota || '').slice(0, 1500);
        const ncf = (values.ncf || '').slice(0, 19);
        const referencia = (selectedEntrada?.documento
            ? `${selectedEntrada.documento.codigo || 'ENP'}-${selectedEntrada.noDocumento || ''}`
            : (values.referencia || '')).slice(0, 50);
        const nombreEntidad = (entidadSel?.nombre || '').slice(0, 60);
        const identificacionEntidad = (entidadSel?.identificacion || '').slice(0, 15);
        // Sanea los detalles (DTRANSAC): COD_PRO=VARCHAR(10), DESCRIPCION=VARCHAR(120), REFERENCIA=VARCHAR(50)
        const detallesSeguros = detalles.map((d) => ({
            ...calcularFila(d),
            codigo: (d.codigo || '').slice(0, 10),
            articulo: (d.articulo || '').slice(0, 120),
            referencia: (d.referencia || '').slice(0, 50),
            medida: d.medida ? {
                ...d.medida,
                idExterno: typeof d.medida.idExterno === 'number'
                    ? d.medida.idExterno
                    : (String(d.medida.idExterno || '')).slice(0, 10),
            } : undefined,
            familia: (d.familia && /^\d+$/.test(String(d.familia.idExterno || '')))
                ? d.familia
                : undefined,
        }));
        return {
            id: base.id || 0,
            fechaDocumento: fechaDoc,
            noDocumento: base.noDocumento || '',
            estado: base.estado || 0,
            periodo: base.periodo || new Date().getMonth() + 1,
            ncf,
            referencia,
            nota,
            subTotal: Math.round(totalSub * 100) / 100,
            descuento: Math.round(totalDesc * 100) / 100,
            impuestos: Math.round(totalImp * 100) / 100,
            total: Math.round(total * 100) / 100,
            retenciones: base.retenciones || 0,
            sucursal: base.sucursal || { nombre: '', codigo: '', identificacion: '' },
            tasa: values.tasa || 1,
            diasCredito: entidadSel?.diasCredito || base.diasCredito || 0,
            tipoDocumento: base.tipoDocumento ?? 24,
            tipoDocumentoExterno: selectedTipo?.idExterno,
            documento: base.documento || { codigo: documentCode },
            concepto: selectedConcepto || { nombre: '', codigo: '' },
            moneda: base.moneda || getMonedaSucursalActiva(),
            almacen: selectedAlmacen || { nombre: '', codigo: '' },
            suplidor: entidadSel ? { ...entidadSel, nombre: nombreEntidad, identificacion: identificacionEntidad } : { nombre: '', codigo: '', identificacion: '' },
            entidad: entidadSel
                ? { nombre: nombreEntidad, codigo: entidadSel.codigo, identificacion: identificacionEntidad, telefono: entidadSel.telefono, direccion: entidadSel.direccion }
                : { nombre: '', codigo: '', identificacion: '' },
            codigoTipo: selectedTipo?.codigo || '',
            entrada: selectedEntrada || null,
            detalles: detallesSeguros,
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
                const result = await devolucionCompraApi.crear(sucursalActiva, dto);
                message.success('Devolución de compra creada exitosamente');
                navigationConfirmedRef.current = true;
                navigate(`/FDVC/${result.id}`, { replace: true });
            }
            else {
                await devolucionCompraApi.actualizar(sucursalActiva, dto);
                message.success('Devolución de compra actualizada exitosamente');
                navigationConfirmedRef.current = true;
                navigate(`/FDVC/${id}`, { replace: true });
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
    // ===== Handlers de Tipo =====
    const handleTipoSelect = (tipoCodigo) => {
        const tipo = tiposCache.find((t) => t.codigo === tipoCodigo) || null;
        setSelectedTipo(tipo);
        setSelectedConcepto(null);
        setConceptoSearchText('');
        form.setFieldsValue({ concepto: '' });
    };
    const handleTipoClear = () => {
        setSelectedTipo(null);
        setSelectedConcepto(null);
        setConceptoSearchText('');
        form.setFieldsValue({ tipo: '', concepto: '' });
    };
    // ===== Handlers de Concepto =====
    const handleConceptoSelect = (concepto) => {
        setSelectedConcepto(concepto);
        setConceptoSearchText(`${concepto.codigo || ''} - ${toTitleCase(concepto.nombre)}`);
        setEditingField(null);
        // Cargar suplidores
        devolucionCompraApi.obtenerSuplidores(sucursalActiva)
            .then((ents) => setSuplidoresCache(ents))
            .catch((err) => { console.warn('Error al cargar suplidores cache al seleccionar concepto en devolucion', err); });
        // === ValidarImpuestosProducto (con backup/restore) ===
        const prevNoImpuesto = selectedConcepto?.noImpuesto;
        if (concepto.noImpuesto) {
            // Guardar backup de impuestos actuales antes de limpiarlos
            const hayImpuestos = detalles.some((d) => (d.impuesto?.porcentaje || 0) > 0);
            if (hayImpuestos) {
                const backup = new Map();
                detalles.forEach((d) => {
                    if ((d.impuesto?.porcentaje || 0) > 0) {
                        backup.set(d.id, { impuesto: d.impuesto, porcentajeImpuesto: 0 });
                    }
                });
                impuestosBackupRef.current = backup;
                message.warning('El Concepto no acepta Impuestos, por lo que serán eliminados.');
                setDetalles((prev) => prev.map((d) => calcularFila({ ...d, impuesto: undefined })));
            }
        }
        else if (prevNoImpuesto && !concepto.noImpuesto) {
            // Restaurar impuestos desde backup
            const backup = impuestosBackupRef.current;
            if (backup.size > 0) {
                setDetalles((prev) => prev.map((d) => {
                    const saved = backup.get(d.id);
                    if (saved) {
                        return calcularFila({ ...d, impuesto: saved.impuesto });
                    }
                    return d;
                }));
                impuestosBackupRef.current = new Map();
            }
        }
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
        // Auto-asignar almacén si el concepto trae uno
        if (concepto.almacen) {
            setSelectedAlmacen(concepto.almacen);
            form.setFieldsValue({ almacen: concepto.almacen.codigo });
        }
    };
    const handleConceptoClear = () => {
        setSelectedConcepto(null);
        setConceptoSearchText('');
        setSuplidoresCache([]);
        form.setFieldsValue({ concepto: '', suplidor: undefined });
    };
    const handleConceptoSearchClick = () => {
        setConceptoModalOpen(true);
    };
    // ===== Handlers de Entrada Referencia =====
    const handleEntradaSelect = async (entrada) => {
        try {
            const detalleEntrada = await devolucionCompraApi.obtenerDetalleEntrada(sucursalActiva, entrada.id);
            // Guardar productos de la entrada en memoria para el modal compartido
            setEntradaDetallesData(detalleEntrada.detalles || []);
            productoApi.obtenerComodines(sucursalActiva).then(setComodines).catch((err) => { console.warn('Error al cargar comodines al seleccionar entrada en devolucion', err); });
            // Auto-asignar entrada
            setSelectedEntrada({
                id: detalleEntrada.id,
                noDocumento: detalleEntrada.noDocumento || '',
                documento: detalleEntrada.documento ?? { codigo: 'ENP', nombre: '' },
            });
            // Auto-asignar suplidor desde la entrada
            if (detalleEntrada.suplidor?.codigo) {
                setSelectedEntidad(detalleEntrada.suplidor);
                form.setFieldsValue({ suplidor: detalleEntrada.suplidor.codigo });
            }
            // Auto-asignar almacén desde la entrada
            if (detalleEntrada.almacen?.codigo) {
                setSelectedAlmacen(detalleEntrada.almacen);
                form.setFieldsValue({ almacen: detalleEntrada.almacen.codigo });
            }
            // Auto-asignar moneda y tasa desde la entrada (fallback si suplidor no tiene moneda)
            if (detalleEntrada.moneda?.codigo) {
                form.setFieldsValue({
                    moneda: detalleEntrada.moneda.nombre,
                    tasa: detalleEntrada.tasa || 1,
                });
            }
            // Preguntar si desea importar detalles si ya existen
            if (detalles.length > 0) {
                const shouldReplace = await new Promise((resolve) => {
                    Modal.confirm({
                        title: '¿Desea Borrar todos los registros?',
                        icon: _jsx(ExclamationCircleOutlined, {}),
                        content: 'Ya existen detalles en el documento. ¿Desea borrarlos y cargar los de la entrada seleccionada?',
                        okText: 'Sí, borrar y cargar',
                        cancelText: 'No, mantener',
                        onOk: () => resolve(true),
                        onCancel: () => resolve(false),
                    });
                });
                if (shouldReplace) {
                    const nuevosDetalles = (detalleEntrada.detalles || []).map((d, idx) => ({
                        ...filaVacia(),
                        id: -(idx + 1),
                        idExterno: d.idExterno || d.id,
                        codigo: d.codigo || '',
                        articulo: d.articulo || '',
                        referencia: d.referencia || '',
                        cantidad: d.cantidad || 0,
                        devuelto: d.devuelto || 0,
                        costo: d.costo || 0,
                        porcentajeDescuento: d.porcentajeDescuento || 0,
                        familia: d.familia,
                        medida: d.medida,
                        impuesto: d.impuesto,
                        tieneVencimiento: d.tieneVencimiento,
                    }));
                    // Cuando trabajarEnUnidad es true, convertir a unidad base genérica
                    if ((documento ?? documentoConfig)?.trabajarEnUnidad === true) {
                        nuevosDetalles.forEach((d) => {
                            if (d.medida) {
                                d.medida = { ...d.medida, nombre: 'Unidad(es)' };
                            }
                        });
                    }
                    setDetalles(nuevosDetalles.map((d) => calcularFila(d)));
                }
            }
            else {
                Modal.confirm({
                    title: '¿Desea Cargar todos los registros?',
                    icon: _jsx(ExclamationCircleOutlined, {}),
                    content: '¿Desea cargar los productos de la entrada seleccionada?',
                    okText: 'Sí, cargar',
                    cancelText: 'No',
                    onOk: () => {
                        const nuevosDetalles = (detalleEntrada.detalles || []).map((d, idx) => ({
                            ...filaVacia(),
                            id: -(idx + 1),
                            idExterno: d.idExterno || d.id,
                            codigo: d.codigo || '',
                            articulo: d.articulo || '',
                            referencia: d.referencia || '',
                            cantidad: d.cantidad || 0,
                            devuelto: d.devuelto || 0,
                            costo: d.costo || 0,
                            porcentajeDescuento: d.porcentajeDescuento || 0,
                            familia: d.familia,
                            medida: d.medida,
                            impuesto: d.impuesto,
                            tieneVencimiento: d.tieneVencimiento,
                        }));
                        // Cuando trabajarEnUnidad es true, convertir a unidad base genérica
                        if ((documento ?? documentoConfig)?.trabajarEnUnidad === true) {
                            nuevosDetalles.forEach((d) => {
                                if (d.medida) {
                                    d.medida = { ...d.medida, nombre: 'Unidad(es)' };
                                }
                            });
                        }
                        setDetalles(nuevosDetalles.map((d) => calcularFila(d)));
                    },
                });
            }
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al cargar la entrada seleccionada');
            message.error(msg);
        }
    };
    const handleEntradaClear = () => {
        setSelectedEntrada(null);
        setEntradaDetallesData([]);
        form.setFieldsValue({ referencia: '' });
    };
    // ===== Handlers de detalles =====
    const handleAgregarFila = () => {
        setDetalles((prev) => [{ ...filaVacia(), id: -(prev.length + 1) }, ...prev]);
    };
    const handleEliminarFila = (idFila) => {
        Modal.confirm({
            title: 'Eliminar detalle',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: '¿Está seguro de eliminar este detalle?',
            okText: 'Sí',
            cancelText: 'No',
            okButtonProps: { danger: true },
            onOk: () => {
                setDetalles((prev) => prev.filter((d) => d.id !== idFila));
            },
        });
    };
    const handleDetalleUpdateValue = (idFila, field, value) => {
        setDetalles((prev) => prev.map((d) => (d.id !== idFila ? d : { ...d, [field]: value })));
    };
    const handleDetalleCalculate = (idFila, field, value) => {
        if (field === 'cantidad' && entradaDetallesData.length > 0) {
            const detalle = detalles.find((d) => d.id === idFila);
            if (detalle) {
                const entradaDetalle = entradaDetallesData.find((d) => d.codigo === detalle.codigo);
                if (entradaDetalle) {
                    const disponible = Number(entradaDetalle.cantidad) || 0;
                    if (Number(value) > disponible) {
                        message.warning(`La cantidad disponible en la entrada es ${disponible}. Se ajustará automáticamente.`);
                        value = disponible;
                    }
                }
            }
        }
        setDetalles((prev) => prev.map((d) => {
            if (d.id !== idFila)
                return d;
            let updated = { ...d, [field]: value };
            // Si el campo es 'descuento' (modo pesos), calcular porcentaje equivalente
            if (field === 'descuento') {
                const subTotal = (updated.cantidad || 0) * (updated.costo || 0);
                const pctDesc = subTotal > 0 ? (Number(value) / subTotal) * 100 : 0;
                updated.porcentajeDescuento = Math.round(pctDesc * 100) / 100;
            }
            return calcularFila(updated);
        }));
    };
    const handleDescuentoGlobal = () => {
        let pct = 0;
        Modal.confirm({
            title: 'Descuento global',
            content: (_jsx("div", { style: { marginTop: 8 }, children: _jsx(InputNumber, { style: { width: '100%' }, min: 0, max: 100, step: 0.01, precision: 2, placeholder: "Porcentaje de descuento", addonAfter: "%", onChange: (val) => { pct = val ?? 0; }, autoFocus: true }) })),
            onOk: () => {
                setDetalles((prev) => prev.map((d) => {
                    const updated = calcularFila({ ...d, porcentajeDescuento: pct });
                    return updated;
                }));
            },
        });
    };
    const handleAddProductoClick = () => {
        if (selectedEntrada) {
            setProductosOrigenModalOpen(true);
        }
        else {
            setProductoModalOpen(true);
        }
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
                    costo: producto.costo || 0,
                    familia: producto.familia,
                    medida: producto.medida,
                    impuesto: selectedConcepto?.noImpuesto ? undefined : producto.impuesto,
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
                    familia: producto.familia,
                    medida: producto.medida,
                    impuesto: selectedConcepto?.noImpuesto ? undefined : producto.impuesto,
                    tieneVencimiento: producto.tieneVencimiento,
                    modificaPrecio: producto.modificaPrecio ?? false,
                    modificaDescripcion: producto.modificaDescripcion ?? false,
                };
                return calcularFila(filled);
            }));
        }
    };
    const handleScannerProducto = (producto) => {
        if (entradaDetallesData.length > 0) {
            const existeEnEntrada = entradaDetallesData.some((d) => d.codigo === producto.codigo);
            const esComodin = comodines.some((c) => (c.codigo || c.idExterno) === producto.codigo);
            if (!existeEnEntrada && !esComodin) {
                message.warning(`El producto ${producto.codigo} no pertenece a la entrada seleccionada ni es un comodín`);
                return;
            }
        }
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
                impuesto: selectedConcepto?.noImpuesto ? undefined : producto.impuesto,
            };
            return [calcularFila(filled), ...prev];
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
    const handleRefresh = useCallback(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoadingError(false);
        setLoading(true);
        devolucionCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            setData(res);
            setDetalles(res.detalles || []);
            setSelectedTipo(res.tipo || null);
            setSelectedConcepto(res.concepto || null);
            setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
            setSelectedEntidad(res.suplidor || res.entidad || null);
            setSelectedAlmacen(res.almacen || null);
            setSelectedEntrada(res.entrada || null);
            const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
            form.setFieldsValue({
                tipo: res.tipo?.codigo || '',
                concepto: res.concepto?.codigo || '',
                suplidor: res.suplidor?.codigo || res.entidad?.codigo || '',
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
            const msg = extraerMensajeError(err, 'Error al recargar');
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
    // ===== Encabezado del formulario =====
    const documentoTieneTipos = tiposCache.length > 0;
    const renderEncabezado = () => (_jsx(Card, { className: "paces-card", size: "small", title: "Datos Generales", extra: _jsx(EstadoTag, { estado: estado, periodo: data?.periodo }), style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: 16, children: [_jsx(Col, { xs: 24, xxl: 18, children: _jsx(Form, { form: form, layout: "vertical", size: "middle", style: { paddingTop: 24 }, children: _jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, sm: 12, lg: 9, children: _jsx("div", { ref: tipoRef, style: { display: 'flex', alignItems: 'flex-end', gap: 0 }, children: _jsx("div", { style: { flex: 1 }, children: _jsx(Form.Item, { name: "tipo", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Tipo de Documento", required: true, children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", placeholder: " ", onChange: handleTipoSelect, onClear: handleTipoClear, children: tiposCache.map((t) => (_jsxs(Select.Option, { value: t.codigo, children: [t.codigo, " - ", toTitleCase(t.nombre)] }, t.codigo))) }) }) }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 15, children: _jsx("div", { ref: suplidorRef, children: _jsx(Form.Item, { name: "suplidor", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Suplidor", required: true, children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", placeholder: " ", value: selectedEntidad?.codigo || undefined, onChange: (val) => {
                                                        const ent = suplidoresCache.find((e) => e.codigo === val);
                                                        setSelectedEntidad(ent || null);
                                                    }, children: suplidoresCache.map((ent) => (_jsxs(Select.Option, { value: ent.codigo, children: [toTitleCase(ent.nombre), ent.identificacion ? ` (${ent.identificacion})` : ''] }, ent.codigo))) }) }) }) }) }), _jsxs(Col, { xs: 24, sm: 12, lg: 9, children: [_jsx("div", { ref: entradaRef, children: _jsx(FloatingField, { label: "Entrada de Referencia", children: _jsx(Input, { placeholder: " ", value: selectedEntrada?.documento
                                                        ? `${selectedEntrada.documento.codigo || 'ENP'}-${selectedEntrada.noDocumento || ''}`
                                                        : (form.getFieldValue('referencia') || ''), readOnly: true, suffix: _jsxs(Space, { size: 4, children: [_jsx(SearchOutlined, { onClick: () => setEntradaModalOpen(true), style: { cursor: 'pointer', color: 'rgba(0,0,0,0.45)' } }), selectedEntrada && _jsx(ClearOutlined, { onClick: handleEntradaClear, style: { cursor: 'pointer' } })] }), onClick: () => setEntradaModalOpen(true) }) }) }), _jsx(Form.Item, { name: "referencia", hidden: true, children: _jsx(Input, {}) })] }), _jsxs(Col, { xs: 24, sm: 12, lg: 15, children: [_jsx("div", { ref: conceptoRef, children: _jsx(FloatingField, { label: "Concepto", required: true, externalValue: conceptoSearchText, children: _jsx(Input, { placeholder: " ", value: conceptoSearchText, readOnly: true, disabled: documentoTieneTipos && !selectedTipo, suffix: _jsx(SearchOutlined, { onClick: () => (!documentoTieneTipos || selectedTipo) && handleConceptoSearchClick(), style: { cursor: (!documentoTieneTipos || selectedTipo) ? 'pointer' : 'not-allowed', color: 'rgba(0,0,0,0.45)' } }), onClick: () => (!documentoTieneTipos || selectedTipo) && handleConceptoSearchClick() }) }) }), _jsx(ConceptoInfoLabel, { concepto: selectedConcepto }), _jsx(Form.Item, { name: "concepto", hidden: true, children: _jsx(Input, {}) })] }), _jsx(Col, { xs: 24, sm: 12, lg: 9, children: _jsx(Form.Item, { name: "fechaDocumento", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Fecha Documento", required: true, children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabledDate: (current) => {
                                                    if (!current)
                                                        return false;
                                                    const cierre = fechasCierre?.[sucursalActiva];
                                                    if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                                        return true;
                                                    const cierreInv = fechasCierreInv?.[sucursalActiva];
                                                    if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                                        return true;
                                                    return false;
                                                } }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 15, children: _jsx("div", { ref: almacenRef, children: _jsx(Form.Item, { name: "almacen", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Almac\u00E9n", required: true, children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", placeholder: " ", value: selectedAlmacen?.codigo || undefined, onChange: (val) => {
                                                        const alm = almacenesCache.find((a) => a.codigo === val);
                                                        setSelectedAlmacen(alm || null);
                                                    }, children: almacenesCache.map((alm) => (_jsx(Select.Option, { value: alm.codigo, children: toTitleCase(alm.nombre) }, alm.codigo))) }) }) }) }) }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "nota", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Nota", children: _jsx(TextArea, { rows: 3 }) }) }) }), _jsxs(Col, { xs: 24, children: [_jsx("div", { style: { marginBottom: 16 }, children: _jsxs(Space, { size: [8, 8], wrap: true, children: [_jsx("div", { children: editingField === 'ncf' ? (_jsx(Input, { size: "small", style: { width: 200 }, placeholder: "NCF", maxLength: 19, autoFocus: true, defaultValue: editingValueRef.current, onChange: (e) => { editingValueRef.current = e.target.value; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                                if (e.key === 'Escape') {
                                                                    e.stopPropagation();
                                                                    cancelFieldEditor();
                                                                }
                                                            } })) : ncfValue ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('ncf'), children: ["NCF: ", ncfValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('ncf'), children: [_jsx(PlusOutlined, {}), " NCF"] })) }), editingField === 'tasa' ? (_jsx(InputNumber, { size: "small", style: { width: 120 }, min: 0, step: 0.01, placeholder: "Tasa", autoFocus: true, defaultValue: editingValueRef.current, onChange: (val) => { editingValueRef.current = val ?? 1; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                            if (e.key === 'Escape') {
                                                                e.stopPropagation();
                                                                cancelFieldEditor();
                                                            }
                                                        } })) : tasaValue !== 1 ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('tasa'), children: ["Tasa: ", tasaValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('tasa'), children: [_jsx(PlusOutlined, {}), " Tasa"] }))] }) }), _jsx(Form.Item, { name: "ncf", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "tasa", hidden: true, children: _jsx(InputNumber, {}) }), _jsx(Form.Item, { name: "moneda", hidden: true, children: _jsx(Input, {}) })] })] }) }) }), _jsx(Col, { xs: 24, xxl: 6, children: _jsx("div", { style: { marginTop: 24 }, children: _jsx(TotalesCard, { subTotal: totales.subTotal, descuento: totales.descuento, impuestos: totales.impuestos, total: totales.total, hideTitle: true, monedaSimbolo: data?.moneda?.simbolo || selectedConcepto?.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: data?.moneda?.nombre || selectedConcepto?.moneda?.nombre || monedaDefault.nombre, tasa: tasaValue ?? data?.tasa ?? 1 }) }) })] }) }));
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
                const existeEnEntrada = entradaDetallesData.length > 0 && entradaDetallesData.some((d) => d.codigo === record.codigo);
                return (_jsxs("div", { style: { fontSize: 13 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 4 }, children: [_jsx("span", { children: record.codigo || '-' }), entradaDetallesData.length > 0 && (existeEnEntrada
                                    ? _jsx(CheckCircleOutlined, { style: { color: '#52c41a', fontSize: 14 } })
                                    : _jsx(CloseCircleOutlined, { style: { color: '#999', fontSize: 14 } }))] }), record.referencia && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5 }, children: record.referencia }))] }));
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
            render: (_, _record, idx) => (_jsxs("div", { children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0.01, step: 0.01, precision: 2, controls: false, value: detalles[idx]?.cantidad, onChange: (val) => { editValuesRef.current[`${detalles[idx].id}_cantidad`] = val ?? 0; }, onBlur: () => { const val = editValuesRef.current[`${detalles[idx].id}_cantidad`] ?? (detalles[idx]?.cantidad || 0); handleDetalleCalculate(detalles[idx].id, 'cantidad', val); }, onPressEnter: () => { const val = editValuesRef.current[`${detalles[idx].id}_cantidad`] ?? (detalles[idx]?.cantidad || 0); handleDetalleCalculate(detalles[idx].id, 'cantidad', val); } }), detalles[idx]?.medida?.nombre && (!sinOC || trabajarEnUnidad) && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5, marginTop: 2 }, children: trabajarEnUnidad ? 'Unidad(es)' : toTitleCase(detalles[idx].medida.nombre) }))] })),
        },
        ...(sinOC && !trabajarEnUnidad ? [{
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
            render: (_, record) => (_jsx(Text, { children: formatNumber(record.subTotal || 0) })),
        },
        {
            title: 'Impuestos',
            key: 'impuestos',
            width: 140,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => (_jsxs("div", { children: [_jsx("div", { children: formatNumber(record.impuestos || 0) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5, minHeight: 18 }, children: record.impuesto?.nombre ? toTitleCase(record.impuesto.nombre) : '' })] })),
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
    return (_jsxs("div", { children: [_jsx(FormularioToolbar, { saving: saving, estado: estado, periodo: data?.periodo, onGuardar: handleGuardar, onCancelar: handleCancelar }), loadingError && (_jsx(Alert, { message: "Error al cargar formulario de devoluci\u00F3n de compra", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(BuscarConceptoModal, { open: conceptoModalOpen, onClose: () => setConceptoModalOpen(false), onSelect: (concepto) => {
                    handleConceptoSelect(concepto);
                    setConceptoModalOpen(false);
                }, sucursal: sucursalActiva, documento: "DVC", tipo: selectedTipo?.codigo }), _jsx(BuscarProductoModal, { open: productoModalOpen, onClose: () => setProductoModalOpen(false), onSelect: handleProductoSelect, mode: "compra" }), _jsx(ProductosOrigenModal, { open: productosOrigenModalOpen, onClose: () => setProductosOrigenModalOpen(false), title: "Agregar producto", sourceLabel: "Entrada", sourceProducts: entradaDetallesData, comodines: comodines, addedCodes: detalles.map((d) => d.codigo), sourceColumns: [
                    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
                    { title: 'Artículo', dataIndex: 'articulo', key: 'articulo', ellipsis: true },
                    { title: 'Cant.', dataIndex: 'cantidad', key: 'cantidad', width: 90, align: 'right' },
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
                            cantidad: record.cantidad || 0,
                            costo: record.costo || 0,
                            familia: record.familia,
                            medida: record.medida,
                            impuesto: record.impuesto,
                            tieneVencimiento: record.tieneVencimiento,
                        }),
                        ...prev,
                    ]);
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
                            familia: record.familia,
                            medida: record.unidadMedida || { nombre: '', codigo: '', factor: 1, idExterno: 0 },
                            impuesto: record.impuestos?.[0]?.impuesto,
                        }),
                        ...prev,
                    ]);
                } }), _jsx(BuscarEntradaModal, { open: entradaModalOpen, onClose: () => setEntradaModalOpen(false), onSelect: handleEntradaSelect, entidad: selectedEntidad?.codigo, onBuscar: devolucionCompraApi.buscarEntradas }), _jsx(ScannerModal, { open: scannerModalOpen, onClose: () => setScannerModalOpen(false), onSelect: handleScannerProducto }), isLarge ? (_jsx(Row, { gutter: 16, children: _jsxs(Col, { xxl: 24, children: [renderEncabezado(), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: [
                                {
                                    key: 'detalles',
                                    label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`,
                                    children: (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, ref: agregarFilaRef, children: [_jsxs(Space, { children: [_jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: handleAddProductoClick, children: "Agregar producto" }), _jsx(Button, { icon: _jsx(BarcodeOutlined, {}), onClick: () => setScannerModalOpen(true) }), _jsx(Button, { icon: _jsx(PercentageOutlined, {}), onClick: handleDescuentoGlobal, children: "Dto. global" })] }), _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { maxWidth: 250 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                                            setDetalleSearch(''); } })] }), (documentoConfig?.modificaPrecio === false || documentoConfig?.modificaDescripcion === false || data?.documento?.modificaPrecio === false || data?.documento?.modificaDescripcion === false) && detalles.length > 0 && (_jsx(CamposRestringidosAlert, { modificaPrecio: documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio, modificaDescripcion: documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion })), _jsxs(DndContext, { sensors: sensors, collisionDetection: closestCenter, onDragStart: (event) => { setActiveId(event.active.id); }, onDragEnd: handleDragEnd, children: [_jsx(SortableContext, { items: detallesFiltrados.map((d) => d.id), strategy: verticalListSortingStrategy, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 1300 }, components: { body: { row: SortableRow } } }) }), _jsx(DragOverlay, { children: activeId ? (_jsxs("div", { style: { padding: '8px 16px', background: '#fff', border: '2px solid #556ee6', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, width: 300 }, children: [_jsx(HolderOutlined, { style: { color: '#556ee6' } }), _jsx("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: detalles.find((d) => d.id === activeId)?.articulo || 'Arrastrando...' })] })) : null })] })] })),
                                },
                                {
                                    key: 'asientos',
                                    label: `Asientos (${data?.asientos?.length || 0})`,
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
                                children: (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, ref: agregarFilaRef, children: [_jsxs(Space, { children: [_jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: handleAddProductoClick, children: "Agregar producto" }), _jsx(Button, { icon: _jsx(BarcodeOutlined, {}), onClick: () => setScannerModalOpen(true) })] }), _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { maxWidth: 250 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                                        setDetalleSearch(''); } })] }), (documentoConfig?.modificaPrecio === false || documentoConfig?.modificaDescripcion === false || data?.documento?.modificaPrecio === false || data?.documento?.modificaDescripcion === false) && detalles.length > 0 && (_jsx(CamposRestringidosAlert, { modificaPrecio: documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio, modificaDescripcion: documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion })), _jsxs(DndContext, { sensors: sensors, collisionDetection: closestCenter, onDragStart: (event) => { setActiveId(event.active.id); }, onDragEnd: handleDragEnd, children: [_jsx(SortableContext, { items: detallesFiltrados.map((d) => d.id), strategy: verticalListSortingStrategy, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 1300 }, components: { body: { row: SortableRow } }, locale: {
                                                            emptyText: (_jsx("div", { style: { minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin registros" }) })),
                                                        } }) }), _jsx(DragOverlay, { children: activeId ? (_jsxs("div", { style: { padding: '8px 16px', background: '#fff', border: '2px solid #556ee6', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, width: 300 }, children: [_jsx(HolderOutlined, { style: { color: '#556ee6' } }), _jsx("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: detalles.find((d) => d.id === activeId)?.articulo || 'Arrastrando...' })] })) : null })] })] })),
                            },
                            {
                                key: 'asientos',
                                label: `Asientos (${data?.asientos?.length || 0})`,
                                children: (permisoModificarAsientos && estado === 0 && !selectedConcepto?.noAsientos) ? (_jsx(AsientosContableEditables, { asientos: asientosLocales.length > 0 ? asientosLocales : (data?.asientos || []), onChange: setAsientosLocales, editable: true, scroll: { x: 900 }, onGenerar: handleGenerarAsientos, generando: generandoAsientos })) : (_jsx(AsientosContableTable, { asientos: data?.asientos || [], scroll: { x: 900 } })),
                            },
                            {
                                key: 'historial',
                                label: `Historial (${data?.logs?.length || 0})`,
                                children: (_jsx(LogTable, { dataSource: data?.logs || [], scroll: { x: 900 } })),
                            },
                        ] })] })), (mode === 'crear' || esBorrador) && (_jsx(DevolucionCompraGuide, { mode: mode, tipo: selectedTipo, concepto: selectedConcepto, suplidor: selectedEntidad, almacen: selectedAlmacen, entrada: selectedEntrada, detallesCount: detalles.length, tipoRef: tipoRef, conceptoRef: conceptoRef, suplidorRef: suplidorRef, almacenRef: almacenRef, agregarFilaRef: agregarFilaRef, entradaRef: entradaRef, suplidoresDisponibles: suplidoresCache.length > 0 })), _jsx(ModalFechaVencimiento, { open: fechaVencimientoModal.open, onClose: () => setFechaVencimientoModal({ open: false, detalleId: 0 }), onFechaChange: handleFechaVencimiento })] }));
};
const DevolucionCompraGuide = ({ tipo, concepto, suplidor, almacen, entrada, detallesCount, tipoRef, conceptoRef, suplidorRef, almacenRef, agregarFilaRef, entradaRef, suplidoresDisponibles, }) => {
    const [open, setOpen] = useState(false);
    const dismissedStepRef = useRef(null);
    const currentStepRef = useRef(null);
    const getCurrentStep = useCallback(() => {
        const steps = [
            {
                key: 'tipo',
                title: 'Paso 1: Tipo de Documento',
                description: 'Debe elegir un tipo de documento antes de seleccionar el concepto.',
                target: () => tipoRef.current,
            },
            {
                key: 'entrada',
                title: 'Paso 2: Entrada de Referencia',
                description: 'Seleccione una Entrada de Almacén de referencia para cargar sus productos.',
                target: () => entradaRef.current,
            },
            {
                key: 'concepto',
                title: 'Paso 3: Concepto',
                description: 'Seleccione un concepto. Las opciones disponibles dependen del tipo seleccionado.',
                target: () => conceptoRef.current,
            },
            {
                key: 'suplidor',
                title: 'Paso 4: Suplidor',
                description: 'Seleccione el suplidor. Puede auto-asignarse al elegir una Entrada de Referencia.',
                target: () => suplidorRef.current,
            },
            {
                key: 'almacen',
                title: 'Paso 5: Almacén',
                description: 'Seleccione el almacén donde se registrará la devolución.',
                target: () => almacenRef.current,
            },
            {
                key: 'productos',
                title: 'Paso 6: Productos',
                description: 'Agregue productos usando "Agregar fila", "Buscar Producto" o importando desde una Entrada de Almacén.',
                target: () => agregarFilaRef.current,
            },
        ];
        // Lógica de prioridad (mismo orden que MostrarGuia del desktop)
        if (!tipo)
            return steps[0];
        // Paso 2: Entrada solo si el tipo requiere referencia
        if (tipo?.requiereReferencia && !entrada)
            return steps[1];
        if (!concepto)
            return steps[2];
        if (suplidoresDisponibles && !suplidor)
            return steps[3];
        if (!almacen)
            return steps[4];
        if (detallesCount === 0)
            return steps[5];
        return null;
    }, [tipo, concepto, almacen, suplidor, entrada, detallesCount, suplidoresDisponibles, tipoRef, conceptoRef, suplidorRef, almacenRef, agregarFilaRef, entradaRef]);
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
    useEffect(() => {
        if (!open)
            return;
        const handleClickOutside = (e) => {
            const target = e.target;
            if (target.closest('.ant-popover'))
                return;
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
    if (!currentStep)
        return null;
    const targetElement = currentStep.target();
    if (!targetElement)
        return null;
    const rect = targetElement.getBoundingClientRect();
    return createPortal(_jsx(Popover, { open: open, onOpenChange: (visible) => {
            if (!visible) {
                setOpen(false);
                dismissedStepRef.current = currentStep.key;
            }
        }, title: currentStep.title, content: currentStep.description, placement: "top", trigger: [], rootClassName: "guide-popover", children: _jsx("span", { style: {
                position: 'fixed',
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                pointerEvents: 'none',
                zIndex: -1,
            } }) }), document.body);
};
export default DevolucionCompraFormulario;
