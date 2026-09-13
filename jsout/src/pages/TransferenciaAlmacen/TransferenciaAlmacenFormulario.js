import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Alert, Dropdown, Empty, } from 'antd';
import { SaveOutlined, CloseOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, ClearOutlined, ExclamationCircleOutlined, EditOutlined, BarcodeOutlined, MoreOutlined, HolderOutlined, CheckCircleOutlined, CloseCircleOutlined, } from '@ant-design/icons';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { transferenciaAlmacenApi } from '../../api/transferenciaAlmacenApi';
import { productoApi } from '../../api/productoApi';
import { parametrosApi } from '../../api/parametrosApi';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import ScannerModal from '../../components/ScannerModal/ScannerModal';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import LogTable from '../../components/LogTable';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import { TransferenciaAlmacenGuide } from './TransferenciaAlmacenGuide';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import AsientosContableTable from '../../components/AsientosContableTable';
import { transaccionApi } from '../../api/transaccionApi';
import EntidadCard from '../../components/EntidadCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { DragHandle, SortableRow, DragListenersContext } from '../../components/DragSortable';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useDocumentoConfig } from '../../hooks/useDocumentoConfig';
import { formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';
import CamposRestringidosAlert from '../../components/CamposRestringidosAlert';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
const { Text } = Typography;
const { TextArea } = Input;
// ===== Cálculo de fila para TRP (sin descuento, sin impuesto) =====
function calcularFila(fila) {
    const cantidad = fila.cantidad || 0;
    const costo = fila._costo || 0;
    const subTotal = Math.round(cantidad * costo * 100) / 100;
    const total = Math.round(cantidad * costo * 100) / 100;
    return {
        ...fila,
        cantidad,
        subTotal,
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
        subTotal: 0,
        total: 0,
        tipoArticulo: 'Producto',
        _costo: 0,
    };
}
// ===== Componente principal =====
const TransferenciaAlmacenFormulario = () => {
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
    const { screenCode, documentCode } = useScreenConfig('FTRP');
    const documentoConfig = useDocumentoConfig(sucursalActiva, documentCode);
    // ===== States =====
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState(null);
    const [detalles, setDetalles] = useState([]);
    const [almacenesCache, setAlmacenesCache] = useState([]);
    const [selectedConcepto, setSelectedConcepto] = useState(null);
    const [selectedAlmacen, setSelectedAlmacen] = useState(null);
    const [selectedAlmacenDestino, setSelectedAlmacenDestino] = useState(null);
    const [productoModalOpen, setProductoModalOpen] = useState(false);
    const [scannerModalOpen, setScannerModalOpen] = useState(false);
    const [detalleSearch, setDetalleSearch] = useState('');
    const [activeId, setActiveId] = useState(null);
    const [medidasCache, setMedidasCache] = useState([]);
    const [fechaCierreContable, setFechaCierreContable] = useState(null);
    const [fechaCierreInventario, setFechaCierreInventario] = useState(null);
    const editValuesRef = useRef({});
    const tasaAnteriorRef = useRef(1);
    const impuestosBackupRef = useRef(new Map());
    const navigationConfirmedRef = useFormularioNavigation();
    const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }));
    // Refs para la guía
    const conceptoRef = useRef(null);
    const almacenOrigenRef = useRef(null);
    const almacenDestinoRef = useRef(null);
    const agregarFilaRef = useRef(null);
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
    const usuario = useAuthStore((s) => s.usuario);
    const permisoModificarAsientos = usuario?.permisosEspeciales?.some((p) => p.codigo === 'pe_modificar_asientos' && p.valor === true) ?? false;
    const [asientosLocales, setAsientosLocales] = useState([]);
    const [generandoAsientos, setGenerandoAsientos] = useState(false);
    // ===== Cargar datos de apoyo al montar =====
    useEffect(() => {
        setActiveModule(screenCode);
        const pageTitle = mode === 'crear' ? 'Nueva Transferencia de Almacén' : 'Editar Transferencia de Almacén';
        setPageTitleOverride(pageTitle);
        const cleanup = () => {
            resetToolbar();
            setPageTitleOverride('');
        };
        // === Si viene de Clonar ===
        if (cloneData) {
            setDetalles((cloneData.detalles || []).map((d) => {
                const _costo = d.total && d.cantidad ? d.total / d.cantidad : 0;
                return calcularFila({ ...d, _costo });
            }));
            setSelectedConcepto(cloneData.concepto || null);
            setConceptoSearchText(toTitleCase(cloneData.concepto?.nombre || ''));
            setSelectedAlmacen(cloneData.almacen || null);
            setSelectedAlmacenDestino(cloneData.almacenDestino || null);
            const fechaDoc = cloneData.fechaDocumento ? parseDateRaw(cloneData.fechaDocumento) : null;
            form.setFieldsValue({
                concepto: cloneData.concepto?.codigo || '',
                almacen: cloneData.almacen?.codigo || '',
                almacenDestino: cloneData.almacenDestino?.codigo || '',
                fechaDocumento: fechaDoc ? dayjs(fechaDoc) : dayjs(),
                ncf: cloneData.ncf || '',
                referencia: cloneData.referencia || '',
                moneda: cloneData.moneda?.nombre || '',
                tasa: cloneData.tasa || 1,
                nota: cloneData.nota || '',
            });
            return cleanup;
        }
        // Cargar almacenes
        transferenciaAlmacenApi.obtenerAlmacenes(sucursalActiva).then(setAlmacenesCache).catch((err) => { console.warn('Error al cargar almacenes cache en formulario transferencia', err); });
        unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch((err) => { console.warn('Error al cargar medidas cache en formulario transferencia', err); });
        parametrosApi.obtenerFechaCierreInventario(sucursalActiva).then(setFechaCierreInventario).catch((err) => { console.warn('Error al obtener fecha cierre inventario en transferencia', err); });
        parametrosApi.obtenerFechaCierreFiscal(sucursalActiva).then(setFechaCierreContable).catch((err) => { console.warn('Error al obtener fecha cierre fiscal en transferencia', err); });
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
        transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            setData(res);
            setDetalles((res.detalles || []).map((d) => ({ ...d, _costo: d.total && d.cantidad ? d.total / d.cantidad : 0 })));
            setAsientosLocales(res.asientos || []);
            setSelectedConcepto(res.concepto || null);
            setSelectedAlmacen(res.almacen || null);
            setSelectedAlmacenDestino(res.almacenDestino || null);
            const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
            form.setFieldsValue({
                concepto: res.concepto?.codigo || '',
                almacen: res.almacen?.codigo || '',
                almacenDestino: res.almacenDestino?.codigo || '',
                fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                ncf: res.ncf || '',
                referencia: res.referencia || '',
                moneda: res.moneda?.nombre || '',
                tasa: res.tasa || 1,
                nota: res.nota || '',
            });
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
            message.error(msg);
            setLoadingError(true);
            navigationConfirmedRef.current = true;
            navigate('/FTRP', { replace: true });
        })
            .finally(() => setLoading(false));
    }, [mode, id, sucursalActiva, form, navigate]);
    // ===== Detectar cambio de tasa y preguntar si actualizar costos =====
    useEffect(() => {
        const nuevaTasa = tasaValue;
        const tasaAnterior = tasaAnteriorRef.current;
        if (tasaAnterior !== nuevaTasa && tasaAnterior !== 1 && editingField === null) {
            Modal.confirm({
                title: 'Actualizar costos',
                icon: _jsx(ExclamationCircleOutlined, {}),
                content: `¿Desea actualizar los costos de los detalles en base a la nueva tasa (${tasaAnterior} → ${nuevaTasa})?`,
                onOk: () => {
                    setDetalles((prev) => prev.map((d) => {
                        const costoLimpio = d._costo || 0;
                        const nuevoCosto = Math.round((costoLimpio / nuevaTasa) * 100) / 100;
                        return calcularFila({ ...d, _costo: nuevoCosto });
                    }));
                    message.success('Costos actualizados correctamente');
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
                    navigate('/FTRP', { replace: true });
                }
                else {
                    if (id) {
                        setLoading(true);
                        transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
                            .then((res) => {
                            setData(res);
                            setDetalles((res.detalles || []).map((d) => ({ ...d, _costo: d.total && d.cantidad ? d.total / d.cantidad : 0 })));
                            setAsientosLocales(res.asientos || []);
                            setSelectedConcepto(res.concepto || null);
                            setSelectedAlmacen(res.almacen || null);
                            setSelectedAlmacenDestino(res.almacenDestino || null);
                            const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
                            form.setFieldsValue({
                                concepto: res.concepto?.codigo || '',
                                almacen: res.almacen?.codigo || '',
                                almacenDestino: res.almacenDestino?.codigo || '',
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
                    }
                    navigationConfirmedRef.current = true;
                    navigate(`/FTRP/${id}`, { replace: true });
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
            return 'El Almacén Origen es requerido';
        if (!selectedAlmacenDestino && !values.almacenDestino)
            return 'El Almacén Destino es requerido';
        if (selectedAlmacen && selectedAlmacenDestino && selectedAlmacen.codigo === selectedAlmacenDestino.codigo) {
            return 'No puedes transferir al mismo Almacen';
        }
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
                const values = form.getFieldsValue();
                const fechaDoc = values.fechaDocumento;
                if (fechaDoc && dayjs(fechaDoc).startOf('day').valueOf() <= cierreMaxTs) {
                    return 'La fecha del documento no puede ser menor o igual a la fecha de cierre (contable o de inventario)';
                }
            }
        }
        if (detalles.length === 0)
            return 'No se puede crear un documento de TRANSFERENCIA ALMACEN sin detalle.';
        if (!detalles.some((d) => (d.cantidad || 0) > 0))
            return 'Debe tener al menos un detalle con cantidad > 0';
        return null;
    };
    // Construir DTO desde el formulario
    const construirDTO = () => {
        const values = form.getFieldsValue();
        const base = data || {};
        const fechaDoc = values.fechaDocumento
            ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
                ? toISOFormat(values.fechaDocumento.toDate())
                : values.fechaDocumento)
            : toISOFormat(new Date());
        const totalSub = detalles.reduce((s, d) => s + (d.subTotal || 0), 0);
        const total = detalles.reduce((s, d) => s + (d.total || 0), 0);
        // Mapear detalles: quitar campo interno _costo
        const detallesDTO = detalles.map((d) => {
            const { _costo, ...rest } = d;
            return rest;
        });
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
            total: Math.round(total * 100) / 100,
            retenciones: base.retenciones || 0,
            tasa: values.tasa || 1,
            diasCredito: base.diasCredito || 0,
            tipoDocumento: base.tipoDocumento ?? 81,
            documento: base.documento || { codigo: documentCode },
            concepto: selectedConcepto || { nombre: '', codigo: '' },
            moneda: base.moneda || getMonedaSucursalActiva(),
            almacen: selectedAlmacen || { nombre: '', codigo: '' },
            almacenDestino: selectedAlmacenDestino || { nombre: '', codigo: '' },
            detalles: detallesDTO,
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
                const result = await transferenciaAlmacenApi.crear(sucursalActiva, dto);
                message.success('Transferencia de almacén creada exitosamente');
                navigationConfirmedRef.current = true;
                navigate(`/FTRP/${result.id}`, { replace: true });
            }
            else {
                await transferenciaAlmacenApi.actualizar(sucursalActiva, dto);
                message.success('Transferencia de almacén actualizada exitosamente');
                navigationConfirmedRef.current = true;
                navigate(`/FTRP/${id}`, { replace: true });
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
        // Auto-asignar almacenes según concepto
        if (concepto.almacen) {
            setSelectedAlmacen(concepto.almacen);
            form.setFieldsValue({ almacen: concepto.almacen.codigo });
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
        // === NoImpuesto: si el concepto no acepta impuestos, limpiarlos ===
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
    const handleConceptoSearchClick = () => {
        setConceptoModalOpen(true);
    };
    const handleConceptoClear = () => {
        setSelectedConcepto(null);
        setConceptoSearchText('');
        form.setFieldsValue({ concepto: '' });
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
        // Buscar la primera fila vacía (sin código) y llenarla
        const filaVaciaIdx = detalles.findIndex((d) => !d.codigo);
        if (filaVaciaIdx === -1) {
            // Agregar nueva fila
            const nuevoId = -(detalles.length + 1);
            setDetalles((prev) => {
                const filled = {
                    ...filaVacia(),
                    id: nuevoId,
                    codigo: producto.codigo,
                    articulo: producto.articulo,
                    referencia: producto.referencia || '',
                    _costo: producto.costo || 0,
                    familia: producto.familia,
                    medida: producto.medida,
                    modificaDescripcion: producto.modificaDescripcion ?? false,
                };
                return [calcularFila(filled), ...prev];
            });
        }
        else {
            setDetalles((prev) => prev.map((d) => {
                if (d.id !== detalles[filaVaciaIdx].id)
                    return d;
                return calcularFila({
                    ...d,
                    codigo: producto.codigo,
                    articulo: producto.articulo,
                    referencia: producto.referencia || '',
                    _costo: producto.costo || 0,
                    familia: producto.familia,
                    medida: producto.medida,
                    modificaDescripcion: producto.modificaDescripcion ?? false,
                });
            }));
        }
    };
    const handleScannerProducto = (producto) => {
        const nuevoId = -(detalles.length + 1);
        setDetalles((prev) => {
            const filled = {
                ...filaVacia(),
                id: nuevoId,
                codigo: producto.codigo,
                articulo: producto.articulo,
                referencia: producto.referencia || '',
                _costo: producto.costo || 0,
                cantidad: producto.cantidad || 1,
                familia: producto.familia,
                medida: producto.medida,
            };
            return [calcularFila(filled), ...prev];
        });
    };
    // ===== Handlers de almacenes =====
    const handleAlmacenChange = (codigo) => {
        const alm = almacenesCache.find((a) => a.codigo === codigo);
        setSelectedAlmacen(alm || null);
        form.setFieldsValue({ almacen: codigo });
    };
    const handleAlmacenDestinoChange = (codigo) => {
        const alm = almacenesCache.find((a) => a.codigo === codigo);
        setSelectedAlmacenDestino(alm || null);
        form.setFieldsValue({ almacenDestino: codigo });
    };
    const handleGenerarAsientos = useCallback(async () => {
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
    }, [sucursalActiva, construirDTO]);
    const handleRefresh = useCallback(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoadingError(false);
        setLoading(true);
        transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            setData(res);
            setDetalles((res.detalles || []).map((d) => ({ ...d, _costo: d.total && d.cantidad ? d.total / d.cantidad : 0 })));
            setAsientosLocales(res.asientos || []);
            setSelectedConcepto(res.concepto || null);
            setSelectedAlmacen(res.almacen || null);
            setSelectedAlmacenDestino(res.almacenDestino || null);
            const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
            form.setFieldsValue({
                concepto: res.concepto?.codigo || '',
                almacen: res.almacen?.codigo || '',
                almacenDestino: res.almacenDestino?.codigo || '',
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
    // ===== Handlers de concepto =====
    if (loading) {
        return _jsx(LoadingSpinner, { mensaje: "Cargando documento..." });
    }
    // ===== Estado info =====
    const estadoInfo = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Borrador', color: 'default' };
    // ===== Grid de detalles editable (sin costo, sin descuento, sin impuesto) =====
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
            render: (_, _record, idx) => (_jsxs("div", { children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0.01, step: 0.01, precision: 2, controls: false, defaultValue: detalles[idx]?.cantidad, onChange: (val) => { editValuesRef.current[`${detalles[idx].id}_cantidad`] = val || 0; }, onBlur: () => {
                            const val = editValuesRef.current[`${detalles[idx].id}_cantidad`] ?? detalles[idx]?.cantidad;
                            handleDetalleCalculate(detalles[idx].id, 'cantidad', val || 0);
                        }, onPressEnter: () => {
                            const val = editValuesRef.current[`${detalles[idx].id}_cantidad`] ?? detalles[idx]?.cantidad;
                            handleDetalleCalculate(detalles[idx].id, 'cantidad', val || 0);
                        } }), detalles[idx]?.medida?.nombre && !sinOC && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5, marginTop: 2 }, children: toTitleCase(detalles[idx].medida.nombre) }))] })),
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
                return (_jsx(Dropdown, { menu: { items }, trigger: ['click'], children: _jsx(Button, { type: "text", size: "small", icon: _jsx(MoreOutlined, {}) }) }));
            },
        },
    ];
    // ===== Encabezado del formulario =====
    const renderEncabezado = () => (_jsx(Card, { className: "paces-card", size: "small", title: "Datos Generales", extra: _jsx(EstadoTag, { estado: estado, periodo: data?.periodo }), style: { marginBottom: 16 }, children: _jsx(Row, { gutter: 16, children: _jsx(Col, { xs: 24, xxl: 18, children: _jsx(Form, { form: form, layout: "vertical", size: "middle", style: { paddingTop: 24 }, children: _jsxs(Row, { gutter: [16, 24], children: [_jsxs(Col, { xs: 24, sm: 12, lg: 9, children: [_jsx("div", { ref: conceptoRef, children: _jsx(FloatingField, { label: "Concepto", required: true, children: _jsx(Input, { placeholder: " ", value: selectedConcepto ? `${selectedConcepto.codigo || ''} - ${toTitleCase(selectedConcepto.nombre)}` : conceptoSearchText, readOnly: true, suffix: _jsxs(Space, { size: 4, children: [_jsx(SearchOutlined, { onClick: handleConceptoSearchClick, style: { cursor: 'pointer', color: 'rgba(0,0,0,0.45)' } }), selectedConcepto && _jsx(ClearOutlined, { onClick: handleConceptoClear, style: { cursor: 'pointer' } })] }), onClick: handleConceptoSearchClick }) }) }), _jsx(ConceptoInfoLabel, { concepto: selectedConcepto }), _jsx(Form.Item, { name: "concepto", hidden: true, children: _jsx(Input, {}) })] }), _jsx(Col, { xs: 24, sm: 12, lg: 9, children: _jsx(Form.Item, { name: "fechaDocumento", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Fecha Documento", required: true, children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabledDate: (current) => {
                                                if (!current)
                                                    return false;
                                                const cierre = fechasCierre?.[sucursalActiva];
                                                if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                                    return true;
                                                const cierreInv = fechasCierreInv?.[sucursalActiva];
                                                if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                                    return true;
                                                return false;
                                            } }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 15, children: _jsx(Form.Item, { name: "almacen", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Almac\u00E9n Origen", required: true, ref: almacenOrigenRef, children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", onChange: handleAlmacenChange, value: selectedAlmacen?.codigo, children: almacenesCache.map((alm) => (_jsx(Select.Option, { value: alm.codigo, children: toTitleCase(alm.nombre) }, alm.codigo))) }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 9, children: _jsx(Form.Item, { name: "almacenDestino", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Almac\u00E9n Destino", required: true, ref: almacenDestinoRef, children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", onChange: handleAlmacenDestinoChange, value: selectedAlmacenDestino?.codigo, children: almacenesCache.map((alm) => (_jsx(Select.Option, { value: alm.codigo, children: toTitleCase(alm.nombre) }, alm.codigo))) }) }) }) }), _jsxs(Col, { xs: 24, children: [_jsx("div", { style: { marginBottom: 16 }, children: _jsxs(Space, { size: [8, 8], wrap: true, children: [_jsx("div", { children: editingField === 'ncf' ? (_jsx(Input, { size: "small", style: { width: 200 }, placeholder: "NCF", maxLength: 19, autoFocus: true, defaultValue: editingValueRef.current, onChange: (e) => { editingValueRef.current = e.target.value; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                            if (e.key === 'Escape') {
                                                                e.stopPropagation();
                                                                cancelFieldEditor();
                                                            }
                                                        } })) : ncfValue ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('ncf'), children: ["NCF: ", ncfValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('ncf'), children: [_jsx(PlusOutlined, {}), " NCF"] })) }), editingField === 'referencia' ? (_jsx(Input, { size: "small", style: { width: 200 }, placeholder: "Referencia", autoFocus: true, defaultValue: editingValueRef.current, onChange: (e) => { editingValueRef.current = e.target.value; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                        if (e.key === 'Escape') {
                                                            e.stopPropagation();
                                                            cancelFieldEditor();
                                                        }
                                                    } })) : refValue ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('referencia'), children: ["Ref: ", refValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('referencia'), children: [_jsx(PlusOutlined, {}), " Referencia"] })), editingField === 'tasa' ? (_jsx(InputNumber, { size: "small", style: { width: 120 }, min: 0, step: 0.01, placeholder: "Tasa", autoFocus: true, defaultValue: editingValueRef.current, onChange: (val) => { editingValueRef.current = val ?? 1; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                        if (e.key === 'Escape') {
                                                            e.stopPropagation();
                                                            cancelFieldEditor();
                                                        }
                                                    } })) : tasaValue !== 1 ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('tasa'), children: ["Tasa: ", tasaValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('tasa'), children: [_jsx(PlusOutlined, {}), " Tasa"] }))] }) }), _jsx(Form.Item, { name: "ncf", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "referencia", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "tasa", hidden: true, children: _jsx(InputNumber, {}) }), _jsx(Form.Item, { name: "moneda", hidden: true, children: _jsx(Input, {}) })] }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "nota", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Nota", children: _jsx(TextArea, { rows: 3 }) }) }) })] }) }) }) }) }));
    // ===== Drag-and-drop handler =====
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
    return (_jsxs("div", { children: [_jsx(FormularioToolbar, { saving: saving, estado: estado, periodo: data?.periodo, onGuardar: handleGuardar, onCancelar: handleCancelar }), loadingError && (_jsx(Alert, { message: "Error al cargar formulario de transferencia de almac\u00E9n", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(BuscarConceptoModal, { open: conceptoModalOpen, onClose: () => setConceptoModalOpen(false), onSelect: handleConceptoSelect, sucursal: sucursalActiva, documento: "TRP" }), _jsx(BuscarProductoModal, { open: productoModalOpen, onClose: () => setProductoModalOpen(false), onSelect: handleProductoSelect, mode: "inventario" }), _jsx(ScannerModal, { open: scannerModalOpen, onClose: () => setScannerModalOpen(false), onSelect: handleScannerProducto }), isLarge ? (_jsx(Row, { gutter: 16, children: _jsxs(Col, { xxl: 24, children: [renderEncabezado(), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: [
                                {
                                    key: 'detalles',
                                    label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`,
                                    children: (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, ref: agregarFilaRef, children: [_jsxs(Space, { children: [_jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: () => setProductoModalOpen(true), children: "Agregar producto" }), _jsx(Button, { icon: _jsx(BarcodeOutlined, {}), onClick: () => setScannerModalOpen(true) })] }), _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { maxWidth: 250 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                                            setDetalleSearch(''); } })] }), (documentoConfig?.modificaPrecio === false || documentoConfig?.modificaDescripcion === false) && detalles.length > 0 && (_jsx(CamposRestringidosAlert, { modificaPrecio: documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio, modificaDescripcion: documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion })), _jsxs(DndContext, { sensors: sensors, collisionDetection: closestCenter, onDragStart: ({ active }) => setActiveId(active.id), onDragEnd: handleDragEnd, children: [_jsx(SortableContext, { items: detallesFiltrados.map((d) => d.id), strategy: verticalListSortingStrategy, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 800 }, components: { body: { row: SortableRow } }, locale: {
                                                                emptyText: (_jsx("div", { style: { minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin registros" }) })),
                                                            } }) }), _jsx(DragOverlay, { children: activeId ? (_jsx("div", { style: { padding: '8px 12px', background: '#fafafa', border: '1px solid #d9d9d9', borderRadius: 4, opacity: 0.8 }, children: "Arrastrando..." })) : null })] })] })),
                                },
                                {
                                    key: 'asientos',
                                    label: `Asientos (${asientosLocales.length || data?.asientos?.length || 0})`,
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
                                                        setDetalleSearch(''); } })] }), (documentoConfig?.modificaPrecio === false || documentoConfig?.modificaDescripcion === false) && detalles.length > 0 && (_jsx(CamposRestringidosAlert, { modificaPrecio: documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio, modificaDescripcion: documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion })), _jsxs(DndContext, { sensors: sensors, collisionDetection: closestCenter, onDragStart: ({ active }) => setActiveId(active.id), onDragEnd: handleDragEnd, children: [_jsx(SortableContext, { items: detallesFiltrados.map((d) => d.id), strategy: verticalListSortingStrategy, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 800 }, components: { body: { row: SortableRow } }, locale: {
                                                            emptyText: (_jsx("div", { style: { minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin registros" }) })),
                                                        } }) }), _jsx(DragOverlay, { children: activeId ? (_jsx("div", { style: { padding: '8px 12px', background: '#fafafa', border: '1px solid #d9d9d9', borderRadius: 4, opacity: 0.8 }, children: "Arrastrando..." })) : null })] })] })),
                            },
                            {
                                key: 'asientos',
                                label: `Asientos (${asientosLocales.length || data?.asientos?.length || 0})`,
                                children: (permisoModificarAsientos && estado === 0 && !selectedConcepto?.noAsientos) ? (_jsx(AsientosContableEditables, { asientos: asientosLocales.length > 0 ? asientosLocales : (data?.asientos || []), onChange: setAsientosLocales, editable: true, scroll: { x: 900 }, onGenerar: handleGenerarAsientos, generando: generandoAsientos })) : (_jsx(AsientosContableTable, { asientos: data?.asientos || [], scroll: { x: 900 } })),
                            },
                            {
                                key: 'historial',
                                label: `Historial (${data?.logs?.length || 0})`,
                                children: (_jsx(LogTable, { dataSource: data?.logs || [], scroll: { x: 900 } })),
                            },
                        ] })] })), (mode === 'crear' || esBorrador) && (_jsx(TransferenciaAlmacenGuide, { mode: mode, concepto: selectedConcepto, almacenOrigen: selectedAlmacen, almacenDestino: selectedAlmacenDestino, detallesCount: detalles.length, conceptoRef: conceptoRef, almacenOrigenRef: almacenOrigenRef, almacenDestinoRef: almacenDestinoRef, agregarFilaRef: agregarFilaRef }))] }));
};
export default TransferenciaAlmacenFormulario;
