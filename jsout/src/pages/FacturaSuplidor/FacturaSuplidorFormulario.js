import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Dropdown, Alert, Popover, Empty, Tooltip, } from 'antd';
import { SaveOutlined, CloseOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, ExclamationCircleOutlined, EditOutlined, MoreOutlined, CalendarOutlined, HolderOutlined, BarcodeOutlined, PercentageOutlined, } from '@ant-design/icons';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import dayjs from 'dayjs';
import { DragHandle, SortableRow } from '../../components/DragSortable';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { facturaSuplidorApi } from '../../api/facturaSuplidorApi';
import { conceptosApi } from '../../api/conceptosApi';
import { productoApi } from '../../api/productoApi';
import { impuestoApi } from '../../api/impuestoApi';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import ModalFechaVencimiento from '../../components/ModalFechaVencimiento/ModalFechaVencimiento';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import { BuscarEntradaModal } from '../../components/BuscarEntradaModal';
import ScannerModal from '../../components/ScannerModal/ScannerModal';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import BuscarEntidadSelect from '../../components/BuscarEntidadSelect/BuscarEntidadSelect';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import LogTable from '../../components/LogTable';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import SeleccionarImpuestosModal from '../../components/SeleccionarImpuestosModal';
import AsientosContableTable from '../../components/AsientosContableTable';
import BuscarCuentaContableModal from '../../components/BuscarCuentaContableModal/BuscarCuentaContableModal';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import GuidePopover from '../../components/GuidePopover/GuidePopover';
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
// ===== Cálculo de fila FRDE =====
function calcularFila(fila, otros = 0) {
    const cantidad = fila.cantidad || 0;
    const costo = fila.costo || 0;
    const pctDesc = fila.porcentajeDescuento || 0;
    const pctImp = fila.impuesto?.porcentaje ?? (fila.porcentajeImpuesto || 0);
    const subTotal = Math.round(cantidad * costo * 100) / 100;
    const descuento = Math.round(subTotal * (pctDesc / 100) * 100) / 100;
    const baseImponible = subTotal - descuento;
    const impuestos = Math.round(baseImponible * (pctImp / 100) * 100) / 100;
    const total = Math.round((baseImponible + impuestos + otros) * 100) / 100;
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
        idExterno: 0,
        codigo: '',
        articulo: '',
        referencia: '',
        cantidad: 0,
        costo: 0,
        subTotal: 0,
        porcentajeDescuento: 0,
        porcentajeImpuesto: 0,
        descuento: 0,
        impuestos: 0,
        total: 0,
        tipoArticulo: 'Producto',
        nota: '',
    };
}
const esNcfValido = (ncf) => {
    if (!ncf)
        return true; // vacío es válido (opcional)
    const upper = ncf.toUpperCase();
    if (upper.startsWith('B'))
        return upper.length === 11;
    if (upper.startsWith('E'))
        return upper.length === 13;
    return false; // no empieza con B ni E
};
// ===== Error Boundary =====
class FacturaSuplidorErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('[FacturaSuplidorErrorBoundary]', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (_jsxs("div", { style: { padding: 24 }, children: [_jsx("h2", { children: "Error en el formulario" }), _jsx("pre", { style: { color: 'red', whiteSpace: 'pre-wrap' }, children: this.state.error?.message }), _jsx("pre", { style: { fontSize: 12, whiteSpace: 'pre-wrap', marginTop: 8 }, children: this.state.error?.stack })] }));
        }
        return this.props.children;
    }
}
// ===== Componente principal =====
const FacturaSuplidorFormulario = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const screens = Grid.useBreakpoint();
    const mode = id ? 'editar' : 'crear';
    const { screenCode, documentCode } = useScreenConfig('FRDE');
    const documentoConfig = useDocumentoConfig(sucursalActiva, documentCode);
    const monedaDefault = getMonedaSucursalActiva();
    // ===== States =====
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState(null);
    const [detalles, setDetalles] = useState([]);
    const [suplidoresCache, setSuplidoresCache] = useState([]);
    const [impuestosCache, setImpuestosCache] = useState([]);
    const [selectedConcepto, setSelectedConcepto] = useState(null);
    const [conceptoSearchText, setConceptoSearchText] = useState('');
    const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
    const [selectedEntidad, setSelectedEntidad] = useState(null);
    const [selectedEntrada, setSelectedEntrada] = useState(null);
    const [almacenesCache, setAlmacenesCache] = useState([]);
    const [selectedAlmacen, setSelectedAlmacen] = useState(null);
    const [productoModalOpen, setProductoModalOpen] = useState(false);
    const [entradaModalOpen, setEntradaModalOpen] = useState(false);
    const [detalleSearch, setDetalleSearch] = useState('');
    const [activeId, setActiveId] = useState(null);
    const [fechaVencimientoModal, setFechaVencimientoModal] = useState({ open: false, detalleId: 0 });
    const [medidasCache, setMedidasCache] = useState([]);
    const [sucursalesCache, setSucursalesCache] = useState([]);
    const [selectedSucursal, setSelectedSucursal] = useState(null);
    const [tiposCache, setTiposCache] = useState([]);
    const [selectedTipo, setSelectedTipo] = useState(null);
    const [asientosLocales, setAsientosLocales] = useState([]);
    const [impuestosFactura, setImpuestosFactura] = useState([]);
    const [modalImpuestosOpen, setModalImpuestosOpen] = useState(false);
    const [scannerModalOpen, setScannerModalOpen] = useState(false);
    const [generandoAsientos, setGenerandoAsientos] = useState(false);
    const [cuentaModalAsientoOpen, setCuentaModalAsientoOpen] = useState(false);
    const [detallesModificados, setDetallesModificados] = useState(false);
    const [modoDescuento, setModoDescuento] = useState('porcentaje');
    // Refs para la guía
    const entradaRef = useRef(null);
    const conceptoRef = useRef(null);
    const suplidorRef = useRef(null);
    const almacenRef = useRef(null);
    const agregarFilaRef = useRef(null);
    const ncfRef = useRef(null);
    const sucursalRef = useRef(null);
    const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }));
    const editValuesRef = useRef({});
    // Backup de impuestos para restaurar cuando el concepto deje de ser noImpuesto
    const impuestosBackupRef = useRef(new Map());
    // Normalizar impuestosFactura del API (estructura anidada → plana)
    function normalizarImpuestos(items) {
        return (items || []).map((item) => ({
            id: item.impuesto?.codigo || item.id,
            codigo: item.impuesto?.codigo || item.codigo,
            idExterno: item.impuesto?.idExterno || item.idExterno,
            nombre: item.impuesto?.nombre || item.nombre || '',
            porcentaje: item.impuesto?.porcentaje ?? item.porcentaje ?? 0,
            tipo: item.tipo || item.impuesto?.tipo || '',
            asientos: item.asientos ?? item.impuesto?.asientos ?? true,
            noCuenta: item.noCuenta || item.impuesto?.noCuenta || '',
            monto: item.monto ?? 0,
            impuesto: item.impuesto || {
                nombre: item.impuesto?.nombre || item.nombre || '',
                porcentaje: item.impuesto?.porcentaje ?? item.porcentaje ?? 0,
                codigo: item.impuesto?.codigo || item.codigo || '',
                idExterno: item.impuesto?.idExterno || item.idExterno || '',
                asientos: item.asientos ?? item.impuesto?.asientos ?? true,
                noCuenta: item.noCuenta || item.impuesto?.noCuenta || '',
            },
        }));
    }
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
            // Mejora F20: Si se cambió la tasa y hay detalles, preguntar si actualizar costos
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
            // Mejora F22: Validar formato NCF
            if (field === 'ncf') {
                const ncfStr = String(newValue || '');
                if (!esNcfValido(ncfStr)) {
                    message.warning('Formato de NCF incorrecto. B=11 dígitos, E=13 dígitos.');
                }
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
    const usuario = useAuthStore((s) => s.usuario);
    const permisoModificarAsientos = usuario?.permisosEspeciales?.some((p) => p.codigo === 'pe_modificar_asientos' && p.valor === true) ?? false;
    // ===== Determinar estado =====
    const estado = data?.estado ?? 0;
    const esCerrado = data?.periodo === 6;
    const esBorrador = estado === 0;
    const esAplicado = estado === 1;
    const esAnulado = estado === 3;
    // ===== Cargar datos de apoyo al montar =====
    useEffect(() => {
        setActiveModule(screenCode);
        const pageTitle = mode === 'crear' ? 'Nueva Factura de Suplidor' : 'Editar Factura de Suplidor';
        setPageTitleOverride(pageTitle);
        // Cargar catálogos iniciales
        conceptosApi.obtenerAlmacenes(sucursalActiva).then(setAlmacenesCache).catch((err) => console.warn('Error al cargar almacenes cache', err));
        unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch((err) => console.warn('Error al cargar medidas cache', err));
        // Cargar sucursales desde la API (CompanioDTO con codigo/idExterno)
        conceptosApi.obtenerSucursales(sucursalActiva).then(setSucursalesCache).catch((err) => console.warn('Error al cargar sucursales cache', err));
        // Cargar tipos de documento
        facturaSuplidorApi.obtenerTipos(sucursalActiva).then(setTiposCache).catch((err) => console.warn('Error al cargar tipos cache', err));
        // Cargar suplidores
        facturaSuplidorApi.obtenerSuplidores(sucursalActiva).then((res) => setSuplidoresCache(Array.isArray(res) ? res : [])).catch((err) => console.warn('Error al cargar suplidores cache', err));
        // Cargar catálogo de impuestos para compras (usado al seleccionar producto)
        impuestoApi.obtenerParaCompras(sucursalActiva).then(setImpuestosCache).catch((err) => console.warn('Error al cargar impuestos cache', err));
        // Inicializar fecha y monto en modo crear
        if (mode === 'crear') {
            form.setFieldsValue({
                fechaDocumento: dayjs(),
                monto: 0,
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
    // ===== Cargar datos si es modo editar =====
    useEffect(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoading(true);
        facturaSuplidorApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((_res) => {
            const res = _res;
            setData(res);
            const detallesNormalizados = (res.detalles || []).map((d) => ({
                ...d,
                impuestosDetalle: d.impuestosDetalle?.length > 0
                    ? d.impuestosDetalle
                    : d.impuesto?.codigo
                        ? [{ total: 0, tasa: d.impuesto.porcentaje || 0, tipo: d.impuesto.tipo || 'I', impuesto: { ...d.impuesto } }]
                        : [],
            }));
            setDetalles(detallesNormalizados);
            setAsientosLocales(res.asientos || []);
            setImpuestosFactura(normalizarImpuestos(res.impuestosFactura));
            setSelectedConcepto(res.concepto || null);
            setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
            setSelectedEntidad(res.suplidor || res.entidad || null);
            setSelectedEntrada(res.entradaAlmacen || null);
            setSelectedTipo(res.tipo || null);
            const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
            form.setFieldsValue({
                concepto: res.concepto?.codigo || '',
                suplidor: res.suplidor?.codigo || res.entidad?.codigo || res.codigoEntidad || '',
                fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                ncf: res.ncf || '',
                referencia: res.referencia || '',
                moneda: res.moneda?.nombre || '',
                monto: res.total || 0,
                tasa: res.tasa || 1,
                nota: res.nota || '',
                diasCredito: res.diasCredito ?? res.suplidor?.diasCredito ?? 0,
                tipo: res.tipo?.codigo || '',
            });
            // Actualizar título con número de documento
            const docTitle = `${res.documento?.codigo || 'FRDE'}-${res.noDocumento || ''}`;
            setPageTitleOverride(`Editar - ${docTitle}`);
            // Cargar suplidores y actualizar selectedEntidad con datos completos
            facturaSuplidorApi.obtenerSuplidores(sucursalActiva)
                .then((suplidores) => {
                const suplidoresArr = Array.isArray(suplidores) ? suplidores : [];
                setSuplidoresCache(suplidoresArr);
                const codigoEntidad = res.entidad?.codigo || res.suplidor?.codigo || res.codigoEntidad;
                if (codigoEntidad) {
                    const match = suplidoresArr.find((s) => s.codigo === codigoEntidad);
                    if (match)
                        setSelectedEntidad(match);
                }
            })
                .catch((err) => console.warn('Error al cargar suplidores en modo editar', err));
            // Restaurar sucursal
            if (res.sucursal) {
                setSelectedSucursal(res.sucursal);
            }
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
            message.error(msg);
            setLoadingError(true);
            navigate('/FRDE', { replace: true });
        })
            .finally(() => setLoading(false));
    }, [mode, id, sucursalActiva, form, navigate]);
    // ===== Handler del modal de impuestos compartido =====
    const handleConfirmarImpuestos = (items) => {
        const mapeados = items.map((i) => ({
            id: i.codigo,
            codigo: i.codigo,
            idExterno: i.idExterno,
            nombre: i.nombre,
            porcentaje: i.porcentaje,
            tipo: i.tipo,
            asientos: true,
            noCuenta: i.noCuenta || '',
            monto: i.monto,
            impuesto: { nombre: i.nombre, porcentaje: i.porcentaje, idExterno: i.idExterno, codigo: i.codigo, asientos: true, noCuenta: i.noCuenta || '' },
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
    // ===== Sincronizar impuesto de detalle con impuestosFactura =====
    const agregarImpuestoAFactura = useCallback((codigo, idExterno, nombre, porcentaje, tipo, asientos = true, noCuenta) => {
        if (!codigo)
            return;
        setImpuestosFactura((prev) => {
            const existe = prev.some((i) => i.codigo === codigo);
            if (existe)
                return prev;
            return [
                ...prev,
                {
                    id: codigo,
                    codigo,
                    idExterno: idExterno || codigo,
                    nombre,
                    porcentaje,
                    tipo: tipo || 'Impuesto',
                    asientos,
                    noCuenta: noCuenta || '',
                    monto: 0,
                    impuesto: { nombre, porcentaje, idExterno: idExterno || codigo, codigo, asientos, noCuenta: noCuenta || '' },
                },
            ];
        });
    }, []);
    // ===== Recalcular montos de impuestosFactura en base a detalles =====
    const recalcularMontosImpuestosFactura = useCallback(() => {
        setImpuestosFactura((prev) => prev.map((imp) => {
            const tipo = imp.tipo || imp.impuesto?.tipo;
            const esItbis = tipo === 'I' || tipo === 'Impuesto';
            const pct = imp.porcentaje || 0;
            // Sumar solo sobre detalles que tienen este impuesto
            let sumaDesdeDetalles = 0;
            let detallesMatch = [];
            (detalles || []).forEach((d) => {
                const base = (d.subTotal || 0) - (d.descuento || 0);
                let tiene = false;
                if (esItbis) {
                    tiene = d.impuesto?.porcentaje === pct;
                }
                else {
                    tiene = d.impuestosDetalle?.some((idt) => {
                        const idtCodigo = idt.impuesto?.codigo || idt.impuesto?.idExterno;
                        const impCodigo = imp.codigo || imp.idExterno;
                        return idtCodigo === impCodigo;
                    });
                }
                if (tiene) {
                    sumaDesdeDetalles += Math.round(base * (pct / 100) * 100) / 100;
                    detallesMatch.push({ id: d.id, cod: d.codigo, base, detImp: d.impuestosDetalle?.map((x) => x.impuesto?.codigo || x.tasa) });
                }
            });
            if (!esItbis) {
                console.log('[DEBUG] imp=' + imp.codigo + ' pct=' + pct + ' suma=' + sumaDesdeDetalles + ' detallesMatch=' + detallesMatch.length + ' totalDetalles=' + (detalles || []).length);
            }
            return { ...imp, monto: sumaDesdeDetalles };
        }));
    }, [detalles]);
    // Recalcular montos cada vez que los detalles cambien
    useEffect(() => {
        recalcularMontosImpuestosFactura();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detalles]);
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
                setDetallesModificados(false);
                if (mode === 'crear') {
                    navigate('/FRDE', { replace: true });
                }
                else {
                    if (id) {
                        setLoading(true);
                        facturaSuplidorApi.obtenerPorId(sucursalActiva, parseInt(id))
                            .then((_res) => {
                            const res = _res;
                            setData(res);
                            const detallesNormalizados = (res.detalles || []).map((d) => ({
                                ...d,
                                impuestosDetalle: d.impuestosDetalle?.length > 0
                                    ? d.impuestosDetalle
                                    : d.impuesto?.codigo
                                        ? [{ total: 0, tasa: d.impuesto.porcentaje || 0, tipo: d.impuesto.tipo || 'I', impuesto: { ...d.impuesto } }]
                                        : [],
                            }));
                            setDetalles(detallesNormalizados);
                            setAsientosLocales(res.asientos || []);
                            setImpuestosFactura(normalizarImpuestos(res.impuestosFactura));
                            setSelectedConcepto(res.concepto || null);
                            setSelectedEntidad(res.suplidor || res.entidad || null);
                            setSelectedEntrada(res.entradaAlmacen || null);
                            const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
                            form.setFieldsValue({
                                concepto: res.concepto?.codigo || '',
                                suplidor: res.suplidor?.codigo || res.entidad?.codigo || res.codigoEntidad || '',
                                fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                                ncf: res.ncf || '',
                                referencia: res.referencia || '',
                                moneda: res.moneda?.nombre || '',
                                tasa: res.tasa || 1,
                                nota: res.nota || '',
                                monto: res.total || 0,
                                diasCredito: res.diasCredito ?? res.suplidor?.diasCredito ?? 0,
                            });
                            const docTitle = `${res.documento?.codigo || 'FRDE'}-${res.noDocumento || ''}`;
                            setPageTitleOverride(`Editar - ${docTitle}`);
                            facturaSuplidorApi.obtenerSuplidores(sucursalActiva)
                                .then((suplidores) => {
                                const suplidoresArr = Array.isArray(suplidores) ? suplidores : [];
                                setSuplidoresCache(suplidoresArr);
                                const codigoEntidad = res.entidad?.codigo || res.suplidor?.codigo || res.codigoEntidad;
                                if (codigoEntidad) {
                                    const match = suplidoresArr.find((s) => s.codigo === codigoEntidad);
                                    if (match)
                                        setSelectedEntidad(match);
                                }
                            })
                                .catch((err) => console.warn('Error al cargar suplidores al recargar', err));
                        })
                            .catch((err) => {
                            const msg = err?.response?.data?.errorMessage || 'Error al recargar el documento';
                            message.error(msg);
                        })
                            .finally(() => setLoading(false));
                    }
                    navigate(`/FRDE/${id}`, { replace: true });
                }
            },
        });
    };
    // ===== Validación del formulario =====
    const validarFormulario = () => {
        const values = form.getFieldsValue();
        if (!selectedConcepto)
            return 'Debe elegir un Concepto para poder continuar.';
        if (suplidoresCache.length > 0 && !values.suplidor && !selectedEntidad)
            return 'El suplidor es requerido.';
        if (detalles.length === 0)
            return 'No se puede crear un documento de FACTURA SUPLIDOR sin detalle.';
        if (!detalles.some((d) => (d.cantidad || 0) > 0))
            return 'Debe tener al menos un detalle con cantidad > 0';
        // Validar fecha doc â‰¤ hoy
        const fechaDoc = values.fechaDocumento;
        if (fechaDoc && dayjs.isDayjs(fechaDoc)) {
            if (fechaDoc.isAfter(dayjs(), 'day')) {
                return 'La fecha del documento no puede ser mayor a hoy.';
            }
        }
        // Mejora F15: Validar según FechaPermitida del documento
        if (data?.documento?.codigo) {
            // Si no tenemos data.documento.fechaPermitida, usar la validación simple por defecto
            const fechaPermitida = data?.documento?.fechaPermitida;
            if (fechaPermitida === 'MenorIgualFechaDia' || !fechaPermitida) {
                // La validación de fecha <= hoy ya está implementada arriba (se mantiene)
            }
        }
        // Validar asientos cuadrados si existen
        const asientosAValidar = asientosLocales.length > 0 ? asientosLocales : (data?.asientos || []);
        if (asientosAValidar.length > 0) {
            const totalDebitos = asientosAValidar.reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
            const totalCreditos = asientosAValidar.reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);
            if (Math.abs(totalDebitos - totalCreditos) > 0.01) {
                return 'Los asientos contables no están cuadrados. Los débitos deben ser igual a los créditos.';
            }
        }
        return null;
    };
    // ===== Construir DTO desde el formulario =====
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
        const nuevosDetalles = detalles.map((d) => calcularFila(d, calcularOtros(d)));
        const totalCalculado = nuevosDetalles.reduce((s, d) => s + (d.total || 0), 0);
        const total = detallesModificados || !data?.total
            ? totalCalculado
            : data.total;
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
            retenciones: retencionesTotal,
            total: Math.round(total * 100) / 100,
            tasa: values.tasa || 1,
            tipoDocumento: base.tipoDocumento ?? 60, // RDE = 60 en enum TipoDocumento
            tipoEntidad: base.tipoEntidad || 'SUP',
            diasCredito: values.diasCredito ?? 0,
            documento: base.documento || { codigo: documentCode },
            concepto: selectedConcepto || { nombre: '', codigo: '' },
            moneda: base.moneda || getMonedaSucursalActiva(),
            suplidor: entidadSel || { nombre: '', codigo: '', identificacion: '' },
            entidad: entidadSel
                ? {
                    nombre: entidadSel.nombre,
                    codigo: entidadSel.codigo,
                    identificacion: entidadSel.identificacion || '',
                    telefono: entidadSel.telefono,
                    direccion: entidadSel.direccion,
                    codigoTipoEntidad: entidadSel.codigoTipoEntidad,
                    tipoEntidad: entidadSel.tipoEntidad,
                    cuentaContable: entidadSel.cuentaContable,
                }
                : { nombre: '', codigo: '', identificacion: '' },
            tipo: selectedTipo || null,
            entradaAlmacen: selectedEntrada || null,
            fechaRecibo: selectedEntrada?.fechaEntrega
                ? (typeof selectedEntrada.fechaEntrega === 'string'
                    ? selectedEntrada.fechaEntrega
                    : fechaDoc)
                : fechaDoc,
            sucursal: selectedSucursal
                ? { ...selectedSucursal, codigo: selectedSucursal.codigo || selectedSucursal.idExterno, idExterno: selectedSucursal.idExterno || selectedSucursal.codigo }
                : base.sucursal || { nombre: '', codigo: '', identificacion: '' },
            detalles: nuevosDetalles,
            asientos: asientosLocales.length > 0 ? asientosLocales : (base.asientos || []),
            impuestosFactura: impuestosFactura.map((imp) => {
                const tipo = imp.tipo || imp.impuesto?.tipo;
                const esItbis = tipo === 'I' || tipo === 'Impuesto';
                const pct = imp.porcentaje || 0;
                let suma = 0;
                detalles.forEach((d) => {
                    const base = (d.subTotal || 0) - (d.descuento || 0);
                    let tiene = false;
                    if (esItbis) {
                        tiene = d.impuesto?.porcentaje === pct;
                    }
                    else if (d.impuestosDetalle) {
                        tiene = d.impuestosDetalle.some((idt) => {
                            const idtCod = idt.impuesto?.codigo || idt.impuesto?.idExterno;
                            const impCod = imp.codigo || imp.idExterno;
                            return idtCod === impCod;
                        });
                    }
                    if (tiene) {
                        suma += Math.round(base * (pct / 100) * 100) / 100;
                    }
                });
                return { ...imp, monto: suma > 0 ? suma : (imp.monto ?? 0) };
            }),
            logs: base.logs || [],
        };
    };
    // ===== NCF Validation =====
    const validarNCF = useCallback(async () => {
        const ncf = form.getFieldValue('ncf');
        const suplidorCodigo = form.getFieldValue('suplidor');
        if (ncf && suplidorCodigo && selectedEntidad) {
            try {
                const existe = await facturaSuplidorApi.verificarNCF(sucursalActiva, ncf, suplidorCodigo);
                if (existe) {
                    return `El NCF "${ncf}" ya existe para este suplidor.`;
                }
            }
            catch {
                // Si falla la verificación, continuar
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
                navigate(`/FRDE/${result.id}`, { replace: true });
            }
            else {
                await facturaSuplidorApi.actualizar(sucursalActiva, dto);
                message.success('Factura de suplidor actualizada exitosamente');
                navigate(`/FRDE/${id}`, { replace: true });
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
    // ===== Handlers de Concepto =====
    const handleConceptoSelect = (concepto) => {
        setSelectedConcepto(concepto);
        setConceptoSearchText(`${concepto.codigo || ''} - ${toTitleCase(concepto.nombre)}`);
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
        // Cargar suplidores y actualizar selectedEntidad con datos completos
        facturaSuplidorApi.obtenerSuplidores(sucursalActiva)
            .then((suplidores) => {
            const suplidoresArr = Array.isArray(suplidores) ? suplidores : [];
            setSuplidoresCache(suplidoresArr);
            const codigoEntidad = data?.entidad?.codigo || data?.suplidor?.codigo || data?.codigoEntidad;
            if (codigoEntidad) {
                const match = suplidoresArr.find((s) => s.codigo === codigoEntidad);
                if (match)
                    setSelectedEntidad(match);
            }
        })
            .catch((err) => console.warn('Error al cargar suplidores al cambiar concepto', err));
        // Si el concepto es NoImpuesto y hay detalles con impuestos, limpiarlos
        const prevNoImpuesto = selectedConcepto?.noImpuesto;
        if (concepto.noImpuesto) {
            const hayImpuestos = detalles.some((d) => (d.impuesto?.porcentaje || 0) > 0);
            if (hayImpuestos) {
                const backup = new Map();
                detalles.forEach((d) => {
                    if ((d.impuesto?.porcentaje || 0) > 0) {
                        backup.set(d.id, { impuesto: d.impuesto, porcentajeImpuesto: d.porcentajeImpuesto || 0 });
                    }
                });
                impuestosBackupRef.current = backup;
                message.warning('El Concepto no acepta Impuestos, por lo que serán eliminados.');
                setDetallesModificados(true);
                setDetalles((prev) => prev.map((d) => calcularFila({ ...d, porcentajeImpuesto: 0, impuesto: undefined })));
            }
        }
        else if (prevNoImpuesto && !concepto.noImpuesto) {
            const backup = impuestosBackupRef.current;
            if (backup.size > 0) {
                setDetallesModificados(true);
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
    const handleConceptoClear = () => {
        setSelectedConcepto(null);
        setConceptoSearchText('');
        setSuplidoresCache([]);
        form.setFieldsValue({ concepto: '', suplidor: undefined });
    };
    // ===== Handlers de Entrada Referencia =====
    const handleEntradaSelect = async (entrada) => {
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
                setDetallesModificados(true);
                try {
                    const detalleEntrada = await facturaSuplidorApi.obtenerDetalleEntrada(sucursalActiva, entrada.id);
                    const nuevosDetalles = (detalleEntrada.detalles || []).map((d, idx) => ({
                        ...filaVacia(),
                        id: -(idx + 1),
                        codigo: d.codigo || '',
                        articulo: d.articulo || '',
                        referencia: d.referencia || '',
                        cantidad: d.cantidad || 0,
                        costo: d.costo || 0,
                        porcentajeDescuento: d.porcentajeDescuento || 0,
                        familia: d.familia,
                        medida: d.medida,
                        impuesto: d.impuesto,
                        tieneVencimiento: d.tieneVencimiento,
                    }));
                    const calculados = nuevosDetalles.map((d) => calcularFila(d));
                    setDetalles(calculados);
                    // Sincronizar impuestos únicos desde los detalles de la ENP
                    const impuestosUnicos = new Map();
                    calculados.forEach((d) => {
                        if (d.impuesto?.codigo && !impuestosUnicos.has(d.impuesto.codigo)) {
                            impuestosUnicos.set(d.impuesto.codigo, {
                                codigo: d.impuesto.codigo,
                                idExterno: d.impuesto.idExterno || d.impuesto.codigo,
                                nombre: d.impuesto.nombre,
                                porcentaje: d.impuesto.porcentaje,
                                tipo: d.impuesto.tipo || 'Impuesto',
                                asientos: d.impuesto?.asientos ?? true,
                                noCuenta: d.impuesto?.noCuenta || '',
                            });
                        }
                    });
                    impuestosUnicos.forEach((imp) => {
                        agregarImpuestoAFactura(imp.codigo, imp.idExterno, imp.nombre, imp.porcentaje, imp.tipo, imp.asientos ?? true, imp.noCuenta || '');
                    });
                    const totalEntrada = calculados.reduce((s, d) => s + (d.total || 0), 0);
                    form.setFieldsValue({ monto: totalEntrada });
                }
                catch (err) {
                    const msg = extraerMensajeError(err, 'Error al cargar detalles de la entrada');
                    message.error(msg);
                }
            }
        }
        else {
            Modal.confirm({
                title: '¿Desea Cargar todos los registros?',
                icon: _jsx(ExclamationCircleOutlined, {}),
                content: '¿Desea cargar los productos de la entrada seleccionada?',
                okText: 'Sí, cargar',
                cancelText: 'No',
                onOk: async () => {
                    setDetallesModificados(true);
                    try {
                        const detalleEntrada = await facturaSuplidorApi.obtenerDetalleEntrada(sucursalActiva, entrada.id);
                        const nuevosDetalles = (detalleEntrada.detalles || []).map((d, idx) => ({
                            ...filaVacia(),
                            id: -(idx + 1),
                            codigo: d.codigo || '',
                            articulo: d.articulo || '',
                            referencia: d.referencia || '',
                            cantidad: d.cantidad || 0,
                            costo: d.costo || 0,
                            porcentajeDescuento: d.porcentajeDescuento || 0,
                            familia: d.familia,
                            medida: d.medida,
                            impuesto: d.impuesto,
                            tieneVencimiento: d.tieneVencimiento,
                        }));
                        const calculados = nuevosDetalles.map((d) => calcularFila(d));
                        setDetalles(calculados);
                        // Sincronizar impuestos únicos desde los detalles de la ENP
                        const impuestosUnicos = new Map();
                        calculados.forEach((d) => {
                            if (d.impuesto?.codigo && !impuestosUnicos.has(d.impuesto.codigo)) {
                                impuestosUnicos.set(d.impuesto.codigo, {
                                    codigo: d.impuesto.codigo,
                                    idExterno: d.impuesto.idExterno || d.impuesto.codigo,
                                    nombre: d.impuesto.nombre,
                                    porcentaje: d.impuesto.porcentaje,
                                    tipo: d.impuesto.tipo || 'Impuesto',
                                    asientos: d.impuesto?.asientos ?? true,
                                    noCuenta: d.impuesto?.noCuenta || '',
                                });
                            }
                        });
                        impuestosUnicos.forEach((imp) => {
                            agregarImpuestoAFactura(imp.codigo, imp.idExterno, imp.nombre, imp.porcentaje, imp.tipo, imp.asientos ?? true, imp.noCuenta || '');
                        });
                        const totalEntrada = calculados.reduce((s, d) => s + (d.total || 0), 0);
                        form.setFieldsValue({ monto: totalEntrada });
                    }
                    catch (err) {
                        const msg = extraerMensajeError(err, 'Error al cargar detalles de la entrada');
                        message.error(msg);
                    }
                },
            });
        }
        setSelectedEntrada(entrada);
        if (entrada?.suplidor?.codigo) {
            setSelectedEntidad(entrada.suplidor);
            form.setFieldsValue({
                suplidor: entrada.suplidor.codigo,
                diasCredito: entrada.suplidor.diasCredito ?? 0,
            });
        }
    };
    // ===== Handlers de detalles =====
    const handleAgregarFila = () => {
        setDetallesModificados(true);
        setDetalles((prev) => [{ ...filaVacia(), id: -(prev.length + 1) }, ...prev]);
    };
    const handleEliminarFila = (idFila) => {
        const detalleEliminado = detalles.find((d) => d.id === idFila);
        Modal.confirm({
            title: 'Eliminar detalle',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: '¿Está seguro de eliminar este detalle?',
            okText: 'Sí',
            cancelText: 'No',
            okButtonProps: { danger: true },
            onOk: () => {
                setDetallesModificados(true);
                setDetalles((prev) => {
                    const nuevos = prev.filter((d) => d.id !== idFila);
                    // Limpiar impuestos que ya no usa ningún detalle
                    if (detalleEliminado?.impuesto?.codigo) {
                        const codImpuesto = detalleEliminado.impuesto.codigo;
                        const sigueEnUso = nuevos.some((d) => d.impuesto?.codigo === codImpuesto);
                        if (!sigueEnUso) {
                            setImpuestosFactura((prevImp) => prevImp.filter((i) => i.codigo !== codImpuesto));
                        }
                    }
                    return nuevos;
                });
            },
        });
    };
    const handleDetalleUpdateValue = (idFila, field, value) => {
        setDetallesModificados(true);
        setDetalles((prev) => prev.map((d) => (d.id !== idFila ? d : { ...d, [field]: value })));
    };
    const handleDetalleCalculate = (idFila, field, value) => {
        setDetallesModificados(true);
        const nuevosDetalles = detalles.map((d) => {
            if (d.id !== idFila)
                return d;
            let updated = { ...d, [field]: value };
            // Si el descuento se ingreso en pesos, calcular el porcentaje equivalente
            if (field === 'descuento') {
                const subTotal = Math.round((d.cantidad || 0) * (d.costo || 0) * 100) / 100;
                const pctCalculado = subTotal > 0 ? Math.round((value / subTotal) * 100 * 100) / 100 : 0;
                updated = { ...updated, porcentajeDescuento: pctCalculado };
            }
            return calcularFila(updated);
        });
        setDetalles(nuevosDetalles);
    };
    const handleProductoSelect = async (producto) => {
        setDetallesModificados(true);
        // Construir impuestosDetalle del detalle
        const impuestosDetalle = [];
        // Impuesto principal del producto
        if (producto.impuesto?.codigo) {
            impuestosDetalle.push({
                impuestoID: Number(producto.impuesto.idExterno) || 0,
                total: 0,
                tasa: producto.impuesto.porcentaje || 0,
                tipo: producto.impuesto.tipo || 'I',
                impuesto: {
                    nombre: producto.impuesto.nombre,
                    porcentaje: producto.impuesto.porcentaje,
                    codigo: producto.impuesto.codigo,
                    idExterno: producto.impuesto.idExterno,
                    tipo: producto.impuesto.tipo || 'I',
                },
            });
        }
        // Cargar impuestos adicionales del producto
        try {
            const detalleProducto = await productoApi.obtenerDetalle(sucursalActiva, producto.codigo);
            if (detalleProducto?.impuestos && detalleProducto.impuestos.length > 0) {
                detalleProducto.impuestos.forEach((imp) => {
                    const impuestoReal = impuestosCache.find((i) => i.nombre?.toLowerCase() === imp.impuesto?.nombre?.toLowerCase());
                    const impCodigo = impuestoReal?.codigo || imp.impuesto?.codigo || '';
                    const mainCodigo = producto.impuesto?.codigo || producto.impuesto?.nombre?.replace(/\s+/g, '_');
                    if (impCodigo && impCodigo !== mainCodigo) {
                        const impIdExterno = impuestoReal?.idExterno || imp.impuesto?.idExterno || impCodigo;
                        const impTipo = impuestoReal?.tipo || imp.impuesto?.tipo || 'Informativo';
                        const pct = imp.impuesto?.porcentaje || 0;
                        // Agregar a impuestosDetalle del detalle
                        impuestosDetalle.push({
                            impuestoID: Number(impIdExterno) || 0,
                            total: 0,
                            tasa: pct,
                            tipo: impTipo,
                            impuesto: {
                                nombre: imp.impuesto?.nombre || '',
                                porcentaje: pct,
                                codigo: impCodigo,
                                idExterno: impIdExterno,
                                tipo: impTipo,
                            },
                        });
                        // Agregar a impuestosFactura (nivel factura)
                        agregarImpuestoAFactura(impCodigo, impIdExterno, imp.impuesto?.nombre || '', pct, impTipo, impuestoReal?.asientos ?? imp.impuesto?.asientos ?? true, impuestoReal?.noCuenta || imp.impuesto?.noCuenta || '');
                    }
                });
            }
        }
        catch {
            // Silencioso
        }
        // Sincronizar impuesto principal con impuestosFactura
        if (producto.impuesto?.codigo) {
            agregarImpuestoAFactura(producto.impuesto.codigo, producto.impuesto.idExterno, producto.impuesto.nombre, producto.impuesto.porcentaje, producto.impuesto.tipo || 'Impuesto', producto.impuesto.asientos ?? true, producto.impuesto.noCuenta || '');
        }
        console.log('[DEBUG] impuestosDetalle para ' + producto.codigo + ':', JSON.stringify(impuestosDetalle.map(i => ({ cod: i.impuesto?.codigo, pct: i.impuesto?.porcentaje, nom: i.impuesto?.nombre }))));
        // Crear el detalle
        const filaVaciaIdx = detalles.findIndex((d) => !d.codigo);
        if (filaVaciaIdx === -1) {
            const nuevaFila = filaVacia();
            const nuevoId = -(detalles.length + 1);
            const filled = {
                ...nuevaFila,
                id: nuevoId,
                idExterno: nuevoId,
                codigo: producto.codigo,
                articulo: producto.articulo,
                referencia: producto.referencia || '',
                cantidad: producto.cantidad || 1,
                costo: producto.costo || 0,
                familia: producto.familia,
                medida: producto.medida,
                impuesto: producto.impuesto,
                porcentajeImpuesto: producto.impuesto?.porcentaje ?? 0,
                impuestosDetalle,
                tieneVencimiento: producto.tieneVencimiento,
                modificaPrecio: producto.modificaPrecio ?? false,
                modificaDescripcion: producto.modificaDescripcion ?? false,
            };
            setDetalles((prev) => [calcularFila(filled, 0), ...prev]);
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
                    cantidad: producto.cantidad || 1,
                    costo: producto.costo || 0,
                    familia: producto.familia,
                    medida: producto.medida,
                    impuesto: producto.impuesto,
                    porcentajeImpuesto: producto.impuesto?.porcentaje ?? 0,
                    impuestosDetalle,
                    tieneVencimiento: producto.tieneVencimiento,
                    modificaPrecio: producto.modificaPrecio ?? false,
                    modificaDescripcion: producto.modificaDescripcion ?? false,
                    idExterno: d.id || nuevoId,
                };
                return calcularFila(filled, 0);
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
        setDetallesModificados(true);
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
    const handleDescuentoGlobal = () => {
        Modal.confirm({
            title: 'Descuento global',
            content: (_jsx(InputNumber, { min: 0, max: 100, step: 0.01, precision: 2, style: { width: '100%' }, placeholder: "Porcentaje de descuento", id: "descuento-global-input", onChange: (val) => {
                    window.__descuentoGlobal = val;
                } })),
            onOk: () => {
                const pct = window.__descuentoGlobal;
                if (pct === undefined || pct === null) {
                    message.warning('Debe ingresar un porcentaje');
                    return false;
                }
                setDetallesModificados(true);
                setDetalles((prev) => prev.map((d) => calcularFila({ ...d, porcentajeDescuento: Number(pct) })));
            },
        });
    };
    // ===== Calcular "Otros" impuestos por detalle (solo tipo 'V'/'Informativo') =====
    function esImpuestoInformativo(imp) {
        const t = imp.tipo ?? imp.impuesto?.tipo;
        return t === 'V' || t === 'Informativo' || t === 3;
    }
    const calcularOtros = useCallback((detalle) => {
        const baseImponible = (detalle.subTotal || 0) - (detalle.descuento || 0);
        // Solo sumar impuestos informativos que el detalle tenga en impuestosDetalle
        const otrosPct = impuestosFactura
            .filter((imp) => esImpuestoInformativo(imp))
            .filter((imp) => {
            if (!detalle.impuestosDetalle || detalle.impuestosDetalle.length === 0)
                return false;
            return detalle.impuestosDetalle.some((idt) => {
                return idt.impuestoID > 0 && idt.impuestoID === Number(imp.idExterno || imp.impuesto?.idExterno);
            });
        })
            .reduce((sum, imp) => sum + (imp.porcentaje || 0), 0);
        if (otrosPct <= 0)
            return 0;
        return Math.round(baseImponible * (otrosPct / 100) * 100) / 100;
    }, [impuestosFactura]);
    // ===== Impuestos informativos para TotalesCard =====
    const impuestosInformativos = React.useMemo(() => impuestosFactura
        .filter((imp) => esImpuestoInformativo(imp))
        .map((imp) => ({ nombre: imp.nombre || '', monto: imp.monto || 0 })), [impuestosFactura]);
    // ===== Retenciones calculadas desde impuestosFactura (tipo R) =====
    const retencionesTotal = React.useMemo(() => impuestosFactura
        .filter((imp) => (imp.tipo || imp.impuesto?.tipo) === 'R')
        .reduce((sum, imp) => sum + (imp.monto || 0), 0), [impuestosFactura]);
    // ===== Totales calculados =====
    const totales = {
        subTotal: detalles.reduce((s, d) => s + (d.subTotal || 0), 0),
        descuento: detalles.reduce((s, d) => s + (d.descuento || 0), 0),
        impuestos: detalles.reduce((s, d) => s + (d.impuestos || 0), 0),
        otros: detalles.reduce((s, d) => s + calcularOtros(d), 0),
        total: detalles.reduce((s, d) => s + (d.total || 0) + calcularOtros(d), 0),
    };
    // ===== Funciones auxiliares para asientos =====
    function esDebito(tipo) { return tipo === 'D' || tipo === 0; }
    function esCredito(tipo) { return tipo === 'C' || tipo === 1; }
    // ===== Loading state (inline) =====
    // ===== Estado info =====
    const estadoInfo = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Borrador', color: 'default' };
    // ===== Encabezado del formulario =====
    const renderEncabezado = () => (_jsx(Card, { className: "paces-card", size: "small", title: "Datos Generales", extra: _jsx(EstadoTag, { estado: estado, periodo: data?.periodo }), style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: 16, children: [_jsx(Col, { xs: 24, xxl: 18, children: _jsx(Form, { form: form, layout: "vertical", size: "middle", style: { paddingTop: 24 }, children: _jsxs(Row, { gutter: [16, 24], children: [_jsxs(Col, { xs: 24, sm: 12, lg: 8, children: [_jsx("div", { ref: entradaRef, children: _jsx(FloatingField, { label: "Entrada Almac\u00E9n Ref", externalValue: selectedEntrada?.noDocumento || '', children: _jsx(Input, { placeholder: " ", value: selectedEntrada?.noDocumento || '', readOnly: true, suffix: _jsx(SearchOutlined, { style: { cursor: 'pointer', color: 'rgba(0,0,0,0.45)' } }), onClick: () => setEntradaModalOpen(true) }) }) }), _jsx(Form.Item, { name: "entradaAlmacen", hidden: true, children: _jsx(Input, {}) })] }), _jsxs(Col, { xs: 24, sm: 12, lg: 8, children: [_jsxs("div", { ref: conceptoRef, children: [_jsx(FloatingField, { label: "Concepto", required: true, externalValue: conceptoSearchText, children: _jsx(Input, { placeholder: " ", value: conceptoSearchText, readOnly: true, suffix: _jsx(SearchOutlined, { style: { cursor: 'pointer', color: 'rgba(0,0,0,0.45)' } }), onClick: () => setConceptoModalOpen(true) }) }), _jsx(ConceptoInfoLabel, { concepto: selectedConcepto })] }), _jsx(Form.Item, { name: "concepto", hidden: true, children: _jsx(Input, {}) })] }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "tipo", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Tipo", children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", placeholder: " ", value: selectedTipo?.codigo || undefined, onChange: (val) => {
                                                    const tipo = tiposCache.find((t) => t.codigo === val);
                                                    setSelectedTipo(tipo || null);
                                                }, children: tiposCache.map((t) => (_jsxs(Select.Option, { value: t.codigo, children: [t.codigo, " - ", toTitleCase(t.nombre)] }, t.codigo))) }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "fechaDocumento", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Fecha Doc.", required: true, children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabledDate: (current) => {
                                                    if (!current)
                                                        return false;
                                                    const cierre = fechasCierre?.[sucursalActiva];
                                                    if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                                        return true;
                                                    const cierreInv = fechasCierreInv?.[sucursalActiva];
                                                    if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                                        return true;
                                                    return false;
                                                } }) }) }) }), _jsxs(Col, { xs: 24, sm: 12, lg: 16, children: [_jsx("div", { ref: suplidorRef, children: _jsx(BuscarEntidadSelect, { label: "Suplidor", required: true, entidades: suplidoresCache, value: form.getFieldValue('suplidor') || selectedEntidad?.codigo || undefined, onChange: (codigo, entidad) => {
                                                    form.setFieldsValue({ suplidor: codigo || '' });
                                                    setSelectedEntidad(entidad || null);
                                                    if (entidad) {
                                                        form.setFieldsValue({ diasCredito: entidad.diasCredito ?? 0 });
                                                    }
                                                }, conceptoSeleccionado: !!selectedConcepto }) }), _jsx(Form.Item, { name: "suplidor", hidden: true, children: _jsx(Input, {}) })] }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(FloatingField, { label: "Fecha Recibo", externalValue: selectedEntrada?.fechaEntrega ? formatDate(selectedEntrada.fechaEntrega) : '-', children: _jsx(Input, { placeholder: " ", value: selectedEntrada?.fechaEntrega ? formatDate(selectedEntrada.fechaEntrega) : '-', readOnly: true }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx("div", { ref: almacenRef, children: _jsx(Form.Item, { name: "almacen", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Almac\u00E9n", children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", placeholder: " ", onChange: (val) => {
                                                        const alm = almacenesCache.find((a) => a.codigo === val);
                                                        setSelectedAlmacen(alm || null);
                                                    }, children: almacenesCache.map((alm) => (_jsx(Select.Option, { value: alm.codigo, children: toTitleCase(alm.nombre) }, alm.codigo))) }) }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx("div", { ref: sucursalRef, children: _jsx(Form.Item, { name: "sucursal", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Sucursal Contable", children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", placeholder: " ", value: selectedSucursal?.sucursal ?? undefined, onChange: (val) => {
                                                        const suc = sucursalesCache.find((s) => s.sucursal === val);
                                                        setSelectedSucursal(suc || null);
                                                    }, children: sucursalesCache.map((suc) => (_jsx(Select.Option, { value: suc.sucursal, children: toTitleCase(suc.nombre || '') }, suc.sucursal))) }) }) }) }) }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "nota", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Nota", children: _jsx(TextArea, { rows: 2 }) }) }) }), _jsx(Form.Item, { name: "tasa", hidden: true, children: _jsx(InputNumber, {}) }), _jsx(Form.Item, { name: "moneda", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "ncf", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "referencia", hidden: true, children: _jsx(Input, {}) }), _jsx(Col, { xs: 24, children: _jsx("div", { style: { marginBottom: 0, marginTop: 8 }, children: _jsx("div", { ref: ncfRef, children: _jsxs(Space, { size: [8, 8], wrap: true, children: [editingField === 'ncf' ? (_jsx(Input, { size: "small", style: { width: 200 }, placeholder: "NCF", maxLength: 19, autoFocus: true, defaultValue: editingValueRef.current, onChange: (e) => { editingValueRef.current = e.target.value; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                            if (e.key === 'Escape') {
                                                                e.stopPropagation();
                                                                cancelFieldEditor();
                                                            }
                                                        } })) : ncfValue ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('ncf'), children: ["NCF: ", ncfValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('ncf'), children: [_jsx(PlusOutlined, {}), " NCF"] })), editingField === 'tasa' ? (_jsx(InputNumber, { size: "small", style: { width: 120 }, min: 0, step: 0.01, placeholder: "Tasa", autoFocus: true, defaultValue: editingValueRef.current, onChange: (val) => { editingValueRef.current = val ?? 1; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                            if (e.key === 'Escape') {
                                                                e.stopPropagation();
                                                                cancelFieldEditor();
                                                            }
                                                        } })) : tasaValue !== 1 ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('tasa'), children: ["Tasa: ", tasaValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('tasa'), children: [_jsx(PlusOutlined, {}), " Tasa"] })), editingField === 'referencia' ? (_jsx(Input, { size: "small", style: { width: 200 }, placeholder: "Referencia", autoFocus: true, defaultValue: editingValueRef.current, onChange: (e) => { editingValueRef.current = e.target.value; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                            if (e.key === 'Escape') {
                                                                e.stopPropagation();
                                                                cancelFieldEditor();
                                                            }
                                                        } })) : refValue ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('referencia'), children: ["Ref: ", refValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('referencia'), children: [_jsx(PlusOutlined, {}), " Referencia"] }))] }) }) }) })] }) }) }), _jsx(Col, { xs: 24, xxl: 6, children: _jsx("div", { style: { marginTop: 24 }, children: _jsx(TotalesCard, { subTotal: totales.subTotal, descuento: totales.descuento, impuestos: totales.impuestos, retenciones: retencionesTotal, total: totales.total, hideTitle: true, monedaSimbolo: data?.moneda?.simbolo || selectedConcepto?.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: data?.moneda?.nombre || selectedConcepto?.moneda?.nombre || monedaDefault.nombre, tasa: tasaValue ?? data?.tasa ?? 1, impuestosInformativos: impuestosInformativos }) }) })] }) }));
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
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13, display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx("span", { children: record.codigo || '-' }), record.referencia && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, marginTop: 'auto' }, children: record.referencia }))] })),
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
            render: (_, _record, idx) => (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, step: 0.01, precision: 2, controls: false, defaultValue: detalles[idx]?.cantidad, onChange: (val) => {
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
                                handleDetalleUpdateValue(record.id, 'medida', {
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
            render: (_, _record, idx) => {
                const fila = detalles[idx];
                if (!fila)
                    return null;
                const docPermiteEditar = documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio ?? true;
                if (docPermiteEditar) {
                    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }, children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, step: 0.01, precision: 4, controls: false, defaultValue: fila.costo, onChange: (val) => {
                                    editValuesRef.current[`${fila.id}_costo`] = val || 0;
                                }, onBlur: () => {
                                    const val = editValuesRef.current[`${fila.id}_costo`] ?? fila.costo;
                                    handleDetalleCalculate(fila.id, 'costo', val);
                                }, onPressEnter: () => {
                                    const val = editValuesRef.current[`${fila.id}_costo`] ?? fila.costo;
                                    handleDetalleCalculate(fila.id, 'costo', val);
                                } }), _jsx("div", { style: { fontSize: 11, lineHeight: 1.5, color: '#999', marginTop: 'auto' }, children: "\u00A0" })] }));
                }
                return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }, children: [_jsx("div", { style: { textAlign: 'right', fontWeight: 500 }, children: formatNumber(fila.costo) }), _jsx("div", { style: { fontSize: 11, lineHeight: 1.5, color: '#999', marginTop: 'auto' }, children: "\u00A0" })] }));
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
            render: (_, record) => (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx("div", { children: formatNumber(record.impuestos || 0) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5, marginTop: 'auto', minHeight: 18 }, children: record.impuestosDetalle && record.impuestosDetalle.length > 0
                            ? record.impuestosDetalle.map((idt) => idt.impuesto?.nombre || '').filter(Boolean).join(', ')
                            : record.impuesto?.nombre
                                ? toTitleCase(record.impuesto.nombre)
                                : '' })] })),
        },
        {
            title: 'Otros',
            key: 'otros',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx(Text, { children: formatNumber(calcularOtros(record)) }), _jsx("div", { style: { fontSize: 11, lineHeight: 1.5, marginTop: 'auto' }, children: "\u00A0" })] })),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx(Text, { strong: true, children: formatNumber((record.total || 0) + calcularOtros(record)) }), _jsx("div", { style: { fontSize: 11, lineHeight: 1.5, marginTop: 'auto' }, children: "\u00A0" })] })),
        },
        {
            title: '',
            key: 'acciones',
            width: 50,
            onCell: () => ({ style: { paddingRight: 8 } }),
            render: (_, _record, idx) => (_jsx(Tooltip, { title: "Quitar producto", children: _jsx(Button, { type: "text", size: "small", danger: true, icon: _jsx(DeleteOutlined, {}), onClick: () => handleEliminarFila(detalles[idx].id) }) })),
        },
    ];
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
    const handleRefresh = useCallback(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoadingError(false);
        setLoading(true);
        facturaSuplidorApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((_res) => {
            const res = _res;
            setData(res);
            const detallesNormalizados = (res.detalles || []).map((d) => ({
                ...d,
                impuestosDetalle: d.impuestosDetalle?.length > 0
                    ? d.impuestosDetalle
                    : d.impuesto?.codigo
                        ? [{ total: 0, tasa: d.impuesto.porcentaje || 0, tipo: d.impuesto.tipo || 'I', impuesto: { ...d.impuesto } }]
                        : [],
            }));
            setDetalles(detallesNormalizados);
            setAsientosLocales(res.asientos || []);
            setImpuestosFactura(normalizarImpuestos(res.impuestosFactura));
            setSelectedConcepto(res.concepto || null);
            setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
            setSelectedEntidad(res.suplidor || res.entidad || null);
            setSelectedEntrada(res.entradaAlmacen || null);
            const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
            form.setFieldsValue({
                concepto: res.concepto?.codigo || '',
                suplidor: res.suplidor?.codigo || res.entidad?.codigo || res.codigoEntidad || '',
                fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                ncf: res.ncf || '', referencia: res.referencia || '',
                moneda: res.moneda?.nombre || '', monto: res.total || 0,
                tasa: res.tasa || 1, nota: res.nota || '',
                diasCredito: res.diasCredito ?? res.suplidor?.diasCredito ?? 0,
            });
            const docTitle = `${res.documento?.codigo || 'FRDE'}-${res.noDocumento || ''}`;
            setPageTitleOverride(`Editar - ${docTitle}`);
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al recargar';
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, form, mode]);
    const handleGenerarAsientos = useCallback(async () => {
        if (sucursalActiva === undefined)
            return;
        setGenerandoAsientos(true);
        try {
            const dto = construirDTO();
            const asientosGenerados = await facturaSuplidorApi.generarAsientos(sucursalActiva, dto);
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
    }, [sucursalActiva, construirDTO]);
    const handleAgregarAsientoManual = (cuenta) => {
        const nuevoAsiento = {
            id: Date.now(),
            cuentaContable: { noCuenta: cuenta.noCuenta, nombre: cuenta.nombre },
            monto: 0,
            tipoAsiento: 'D',
            generado: false,
            descripcion: '',
        };
        setAsientosLocales((prev) => [...prev, nuevoAsiento]);
    };
    if (loading) {
        return _jsx(LoadingSpinner, { mensaje: "Cargando documento..." });
    }
    return (_jsxs("div", { children: [_jsx(FormularioToolbar, { saving: saving, estado: estado, periodo: data?.periodo, onGuardar: handleGuardar, onCancelar: handleCancelar }), loadingError && (_jsx(Alert, { message: "Error al cargar formulario de factura de suplidor", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(BuscarConceptoModal, { open: conceptoModalOpen, onClose: () => setConceptoModalOpen(false), onSelect: handleConceptoSelect, sucursal: sucursalActiva, documento: "RDE", tipoEntidad: "SUP" }), _jsx(BuscarProductoModal, { open: productoModalOpen, onClose: () => setProductoModalOpen(false), onSelect: handleProductoSelect, mode: "compra" }), _jsx(BuscarEntradaModal, { open: entradaModalOpen, onClose: () => setEntradaModalOpen(false), onSelect: handleEntradaSelect, entidad: selectedEntidad?.codigo, onBuscar: facturaSuplidorApi.obtenerEntradasAlmacen }), _jsx(SeleccionarImpuestosModal, { open: modalImpuestosOpen, onClose: () => setModalImpuestosOpen(false), onConfirm: handleConfirmarImpuestos, tipoEntidad: "SUP", sucursal: sucursalActiva, existentes: impuestosFactura.map((i) => ({
                    codigo: i.codigo || '',
                    idExterno: i.idExterno || '',
                    nombre: i.nombre || '',
                    porcentaje: i.porcentaje || 0,
                    tipo: i.tipo || 'Impuesto',
                    monto: i.monto,
                })) }), _jsx(ScannerModal, { open: scannerModalOpen, onClose: () => setScannerModalOpen(false), onSelect: (producto) => {
                    handleProductoSelect(producto);
                    setScannerModalOpen(false);
                } }), _jsx(BuscarCuentaContableModal, { open: cuentaModalAsientoOpen, onClose: () => setCuentaModalAsientoOpen(false), onSelect: (cuenta) => {
                    handleAgregarAsientoManual(cuenta);
                    setCuentaModalAsientoOpen(false);
                }, sucursal: sucursalActiva }), isLarge ? (_jsx(Row, { gutter: 16, children: _jsxs(Col, { xxl: 24, children: [renderEncabezado(), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: [
                                {
                                    key: 'detalles',
                                    label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`,
                                    children: (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, ref: agregarFilaRef, children: [_jsxs(Space, { children: [_jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: () => setProductoModalOpen(true), children: "Agregar producto" }), _jsx(Button, { icon: _jsx(BarcodeOutlined, {}), onClick: () => setScannerModalOpen(true) }), _jsx(Button, { icon: _jsx(PercentageOutlined, {}), onClick: handleDescuentoGlobal, children: "Dto. global" })] }), _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { maxWidth: 250 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
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
                                    children: (permisoModificarAsientos && estado === 0 && !selectedConcepto?.noAsientos) ? (_jsxs(_Fragment, { children: [_jsx("div", { style: { marginBottom: 8, display: 'flex', gap: 8 }, children: _jsx(Button, { icon: _jsx(PlusOutlined, {}), onClick: () => setCuentaModalAsientoOpen(true), children: "Agregar asiento manual" }) }), _jsx(AsientosContableEditables, { asientos: asientosLocales.length > 0 ? asientosLocales : (data?.asientos || []), onChange: setAsientosLocales, editable: true, scroll: { x: 600 }, onGenerar: handleGenerarAsientos, generando: generandoAsientos })] })) : (_jsx(AsientosContableTable, { asientos: data?.asientos || [], scroll: { x: 600 } })),
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
                                children: (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, ref: agregarFilaRef, children: [_jsxs(Space, { children: [_jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: () => setProductoModalOpen(true), children: "Agregar producto" }), _jsx(Button, { icon: _jsx(BarcodeOutlined, {}), onClick: () => setScannerModalOpen(true) }), _jsx(Button, { icon: _jsx(PercentageOutlined, {}), onClick: handleDescuentoGlobal, children: "Dto. global" })] }), _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { maxWidth: 250 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
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
                                children: (permisoModificarAsientos && estado === 0 && !selectedConcepto?.noAsientos) ? (_jsxs(_Fragment, { children: [_jsx("div", { style: { marginBottom: 8, display: 'flex', gap: 8 }, children: _jsx(Button, { icon: _jsx(PlusOutlined, {}), onClick: () => setCuentaModalAsientoOpen(true), children: "Agregar asiento manual" }) }), _jsx(AsientosContableEditables, { asientos: asientosLocales.length > 0 ? asientosLocales : (data?.asientos || []), onChange: setAsientosLocales, editable: true, scroll: { x: 600 }, onGenerar: handleGenerarAsientos, generando: generandoAsientos })] })) : (_jsx(AsientosContableTable, { asientos: data?.asientos || [], scroll: { x: 600 } })),
                            },
                            {
                                key: 'historial',
                                label: `Historial (${data?.logs?.length || 0})`,
                                children: (_jsx(LogTable, { dataSource: data?.logs || [], scroll: { x: 900 } })),
                            },
                        ] })] })), _jsx(ModalFechaVencimiento, { open: fechaVencimientoModal.open, onClose: () => setFechaVencimientoModal({ open: false, detalleId: 0 }), onFechaChange: handleFechaVencimiento }), (mode === 'crear' || esBorrador) && (_jsx(FacturaSuplidorGuide, { mode: mode, concepto: selectedConcepto, suplidor: selectedEntidad, almacen: selectedAlmacen, detallesCount: detalles.length, ncf: ncfValue, conceptoRef: conceptoRef, suplidorRef: suplidorRef, almacenRef: almacenRef, agregarFilaRef: agregarFilaRef, ncfRef: ncfRef, suplidoresDisponibles: suplidoresCache.length > 0 }))] }));
};
const FacturaSuplidorGuide = ({ mode: _mode, concepto, suplidor, almacen, detallesCount, ncf, conceptoRef, suplidorRef, almacenRef, agregarFilaRef, ncfRef, suplidoresDisponibles, }) => {
    const [open, setOpen] = useState(false);
    const dismissedStepRef = useRef(null);
    const currentStepRef = useRef(null);
    const getCurrentStep = useCallback(() => {
        const steps = [
            {
                key: 'concepto',
                title: 'Paso 1: Concepto',
                description: 'Debe elegir un concepto para poder continuar. Los conceptos determinan ciertas acciones del documento.',
                target: () => conceptoRef.current,
            },
            {
                key: 'suplidor',
                title: 'Paso 2: Suplidor',
                description: 'Seleccione el suplidor de la factura.',
                target: () => suplidorRef.current,
            },
            {
                key: 'almacen',
                title: 'Paso 3: Almacén',
                description: 'Seleccione el almacén de destino.',
                target: () => almacenRef.current,
            },
            {
                key: 'productos',
                title: 'Paso 4: Productos',
                description: 'Agregue productos al documento usando el botón "Agregar fila" o "Buscar Producto".',
                target: () => agregarFilaRef.current,
            },
            {
                key: 'ncf',
                title: 'Paso 5: NCF',
                description: 'Debe digitar el NCF de la factura para poder continuar.',
                target: () => ncfRef.current,
            },
        ];
        // Lógica de prioridad
        if (!concepto)
            return steps[0];
        if (suplidoresDisponibles && !suplidor)
            return steps[1];
        if (!almacen)
            return steps[2];
        if (detallesCount === 0)
            return steps[3];
        if (!ncf)
            return steps[4];
        return null;
    }, [concepto, suplidor, almacen, detallesCount, ncf, suplidoresDisponibles, conceptoRef, suplidorRef, almacenRef, agregarFilaRef, ncfRef]);
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
const FacturaSuplidorFormularioConErrorBoundary = () => (_jsx(FacturaSuplidorErrorBoundary, { children: _jsx(FacturaSuplidorFormulario, {}) }));
export default FacturaSuplidorFormularioConErrorBoundary;
