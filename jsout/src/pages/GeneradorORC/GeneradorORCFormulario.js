import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Avatar, Card, Table, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Checkbox, Select, message, Form, Input, InputNumber, DatePicker, Typography, Modal, Dropdown, Alert, Skeleton, Drawer, Descriptions, Tooltip, } from 'antd';
import { SaveOutlined, CloseOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, ExclamationCircleOutlined, MoreOutlined, ShoppingCartOutlined, DownloadOutlined, SyncOutlined, DatabaseOutlined, CalendarOutlined, BarChartOutlined, EyeOutlined, ShopOutlined, UploadOutlined, SwapOutlined, ReloadOutlined, FileTextOutlined, ExportOutlined, RollbackOutlined, UndoOutlined, ClockCircleOutlined, } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useCompanyStore } from '../../stores/companyStore';
import { generadorOrcApi } from '../../api/generadorOrcApi';
import { entradaAlmacenApi } from '../../api/entradaAlmacenApi';
import { productoApi } from '../../api/productoApi';
import { parametrosApi } from '../../api/parametrosApi';
import { configModuloApi } from '../../api/configModuloApi';
import { conteoApi } from '../../api/conteoApi';
import AgregarProductoGORCModal from '../../components/AgregarProductoGORCModal/AgregarProductoGORCModal';
import ModalBuscarSuplidor from '../../components/ModalBuscarSuplidor/ModalBuscarSuplidor';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import { companiaApi } from '../../api/companiaApi';
import PermissionGate from '../../components/PermissionGate';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import ModalMovimientosPosteriores from '../../components/ModalMovimientosPosteriores/ModalMovimientosPosteriores';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';
const { Text } = Typography;
const SUCURSALES = ['OP', 'HR', 'VH'];
// ===== Cálculo de fila GORC =====
function calcularFilaGORC(fila) {
    const cantTotal = Object.values(fila.cantidades || {}).reduce((s, v) => s + (v || 0), 0);
    const costo = fila.costo || 0;
    const pctDesc = fila.porcentajeDescuento || 0;
    const pctImp = fila.impuesto?.porcentaje ?? 0;
    const subTotal = Math.round(cantTotal * costo * 100) / 100;
    const descuento = Math.round(subTotal * (pctDesc / 100) * 100) / 100;
    const base = subTotal - descuento;
    const impuestos = Math.round(base * (pctImp / 100) * 100) / 100;
    const total = Math.round((base + impuestos) * 100) / 100;
    return { ...fila, subTotal, descuento, impuestos, total };
}
function filaVaciaGORC() {
    return {
        codigo: '',
        referencia: '',
        producto: '',
        medida: null,
        impuesto: null,
        cantidades: { OP: 0, HR: 0, VH: 0 },
        cantidadesBonificadas: { OP: 0, HR: 0, VH: 0 },
        existencias: { OP: 0, HR: 0, VH: 0 },
        existenciasFisicas: { OP: 0, HR: 0, VH: 0 },
        costo: 0,
        margen: 0,
        precioSugerido: 0,
        subTotal: 0,
        porcentajeDescuento: 0,
        descuento: 0,
        impuestos: 0,
        total: 0,
    };
}
function redondearAlFactor(precio, factor) {
    if (!factor || factor <= 0)
        return precio;
    return Math.ceil(precio / factor) * factor;
}
/** Normaliza una medida asegurando que tenga nombre, codigo, factor e idExterno.
 *  Maneja el caso en que la API devuelva `id` en lugar de `idExterno`. */
function normalizarMedida(medida) {
    if (!medida)
        return null;
    return {
        nombre: medida.nombre || '',
        codigo: medida.codigo || '',
        factor: medida.factor ?? 1,
        idExterno: medida.idExterno ?? medida.id ?? 0,
    };
}
const ModosCargaModal = ({ open, onClose, onSeleccionarMaestro, onSeleccionarPlantilla }) => (_jsx(Modal, { title: "Cargar productos", open: open, onCancel: onClose, footer: null, width: 500, destroyOnHidden: true, children: _jsxs(Row, { gutter: [16, 16], children: [_jsx(Col, { span: 12, children: _jsxs(Card, { hoverable: true, onClick: () => { onSeleccionarMaestro(); onClose(); }, style: { textAlign: 'center', cursor: 'pointer' }, children: [_jsx(DatabaseOutlined, { style: { fontSize: 36, color: 'var(--paces-primary)', marginBottom: 12 } }), _jsx("div", { style: { fontWeight: 600, fontSize: 15 }, children: "Maestro" }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, marginTop: 4 }, children: "Cargar todos los productos del suplidor con datos anteriores" })] }) }), _jsx(Col, { span: 12, children: _jsxs(Card, { hoverable: true, onClick: () => { onSeleccionarPlantilla(); onClose(); }, style: { textAlign: 'center', cursor: 'pointer' }, children: [_jsx(ShoppingCartOutlined, { style: { fontSize: 36, color: 'var(--paces-primary)', marginBottom: 12 } }), _jsx("div", { style: { fontWeight: 600, fontSize: 15 }, children: "Plantilla" }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, marginTop: 4 }, children: "Cargar desde una plantilla o conteo f\u00EDsico" })] }) })] }) }));
const BuscarPlantillaGORCModal = ({ open, onClose, onSelect, codigoSuplidor }) => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const res = await conteoApi.obtenerPlantillas(sucursalActiva, codigoSuplidor);
            setData(Array.isArray(res) ? res : []);
        }
        catch {
            message.error('Error al cargar plantillas');
            setData([]);
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva, codigoSuplidor]);
    useEffect(() => {
        if (open)
            cargar();
    }, [open, cargar]);
    const filtered = useMemo(() => {
        if (!search.trim())
            return data;
        const term = search.trim().toLowerCase();
        return data.filter((r) => r.codigo?.toLowerCase().includes(term));
    }, [data, search]);
    const columnas = [
        { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 150 },
        { title: 'Suplidor', dataIndex: 'suplidor', key: 'suplidor', ellipsis: true,
            render: (v) => toTitleCase(v || '') },
    ];
    return (_jsxs(Modal, { title: "Buscar Plantilla de Conteo", open: open, onCancel: onClose, footer: null, width: 600, destroyOnHidden: true, children: [_jsx(Input.Search, { placeholder: "Buscar por c\u00F3digo...", allowClear: true, onSearch: (val) => setSearch(val), style: { marginBottom: 16 } }), _jsx(Table, { dataSource: filtered, columns: columnas, rowKey: "id", loading: loading, size: "small", pagination: { pageSize: 10, showSizeChanger: false }, onRow: (record) => ({
                    onClick: () => {
                        onSelect(record);
                        onClose();
                    },
                    style: { cursor: 'pointer' },
                }) })] }));
};
const SeleccionarConteosModal = ({ open, onClose, conteos, onConfirm }) => {
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    useEffect(() => {
        if (open)
            setSelectedRowKeys([]);
    }, [open]);
    const getKey = (r) => r.idExterno || r.inventid || r.id;
    const getSucursal = (r) => r.compania?.prefijo || r.compania?.centroCosto || `suc-${r.sucursal}`;
    const sucursalesSeleccionadas = conteos
        .filter((c) => selectedRowKeys.includes(getKey(c)))
        .map(getSucursal);
    const columnas = [
        { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 120,
            render: (_, r) => r.noinvent || r.documento || '-' },
        { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 95,
            render: (v) => formatDate(v) },
        { title: 'Almacén', key: 'codalm', width: 120,
            render: (_, r) => toTitleCase(r.almacen || '') || r.codigoAlmacen || '-' },
        { title: 'Sucursal', key: 'codsuc', width: 90,
            render: (_, r) => getSucursal(r) },
    ];
    const rowSelection = {
        selectedRowKeys,
        onChange: (keys) => {
            const sucsNuevas = conteos
                .filter((c) => keys.includes(getKey(c)))
                .map(getSucursal);
            const sucDuplicada = sucsNuevas.some((a) => sucsNuevas.filter((x) => x === a).length > 1);
            if (sucDuplicada)
                return;
            setSelectedRowKeys(keys);
        },
        getCheckboxProps: (record) => {
            const suc = getSucursal(record);
            const yaSeleccionado = sucursalesSeleccionadas.includes(suc) && !selectedRowKeys.includes(getKey(record));
            return { disabled: yaSeleccionado };
        },
    };
    return (_jsxs(Modal, { title: "Seleccionar conteos f\u00EDsicos", open: open, onCancel: onClose, width: 800, destroyOnHidden: true, okText: "Cargar seleccionados", onOk: () => onConfirm(selectedRowKeys), okButtonProps: { disabled: selectedRowKeys.length === 0 }, children: [_jsx("p", { style: { marginBottom: 12 }, className: "paces-text-secondary", children: "Seleccione uno o m\u00E1s conteos f\u00EDsicos (m\u00E1ximo uno por almac\u00E9n) para cargar sus productos." }), _jsx(Table, { dataSource: conteos, columns: columnas, rowKey: (r) => r.idExterno || r.inventid || r.id, rowSelection: rowSelection, size: "small", pagination: false, scroll: { y: 400 } })] }));
};
// ===== Componente principal =====
const GeneradorORCFormulario = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const screens = Grid.useBreakpoint();
    const mode = id ? 'editar' : 'crear';
    const { screenCode, documentCode } = useScreenConfig('FGORC');
    const isLarge = screens.xxl === true;
    const unidadBase = useCompanyStore((s) => s.data.unidadBase);
    // ===== Estados =====
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [cargandoMaestro, setCargandoMaestro] = useState(false);
    const [recalculando, setRecalculando] = useState(false);
    const [loadVersion, setLoadVersion] = useState(0);
    const [data, setData] = useState(null);
    const [detalles, setDetalles] = useState([]);
    const [selectedSuplidor, setSelectedSuplidor] = useState(null);
    const [suplidorSearchText, setSuplidorSearchText] = useState('');
    const [fechaCierreContable, setFechaCierreContable] = useState(null);
    const [factorRedondeo, setFactorRedondeo] = useState(5);
    // Cargar factor de redondeo desde configuracion por modulo
    useEffect(() => {
        configModuloApi.obtenerPorClave(sucursalActiva, 'GORC', 'FACTOR_REDONDEO')
            .then((cfg) => {
            if (cfg?.valor) {
                const parsed = parseInt(cfg.valor, 10);
                setFactorRedondeo(!isNaN(parsed) && parsed > 0 ? parsed : 5);
            }
        })
            .catch(() => {
            console.warn('[GORC] No se pudo obtener FACTOR_REDONDEO, usando default 5');
        });
    }, [sucursalActiva]);
    const [suplidorModalOpen, setSuplidorModalOpen] = useState(false);
    const [productoModalOpen, setProductoModalOpen] = useState(false);
    const [modosCargaModalOpen, setModosCargaModalOpen] = useState(false);
    const [plantillaModalOpen, setPlantillaModalOpen] = useState(false);
    const [seleccionarConteosOpen, setSeleccionarConteosOpen] = useState(false);
    const [conteosPlantilla, setConteosPlantilla] = useState([]);
    const [detalleSearch, setDetalleSearch] = useState('');
    const [redondeoComercial, setRedondeoComercial] = useState(false);
    const [modoDescuento, setModoDescuento] = useState('porcentaje');
    const [activeId, setActiveId] = useState(null);
    const [medidasCache, setMedidasCache] = useState([]);
    const [conteoDetallesData, setConteoDetallesData] = useState(null);
    const [maestroDetallesData, setMaestroDetallesData] = useState(null);
    const [suplidorProductos, setSuplidorProductos] = useState([]);
    const [codigoInput, setCodigoInput] = useState('');
    // Selección múltiple
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    // Navegación por teclado entre filas de la tabla de detalles
    const [activeRowIndex, setActiveRowIndex] = useState(0);
    // Análisis / monitor
    const [analisisOpen, setAnalisisOpen] = useState(false);
    const [analisisDetalle, setAnalisisDetalle] = useState(null);
    const [analisisData, setAnalisisData] = useState([]);
    const [analisisLoading, setAnalisisLoading] = useState(false);
    const [analisisError, setAnalisisError] = useState(false);
    const [analisisResumenLoading, setAnalisisResumenLoading] = useState(false);
    // Modal movimientos
    const [movimientosModalOpen, setMovimientosModalOpen] = useState(false);
    const [movimientosSucursal, setMovimientosSucursal] = useState('');
    const [movimientosData, setMovimientosData] = useState([]);
    const [movimientosLoading, setMovimientosLoading] = useState(false);
    useEffect(() => {
        if (!analisisOpen || !analisisDetalle)
            return;
        const SUCURSALES = [
            { id: 0, nombre: 'OP' },
            { id: 1, nombre: 'HR' },
            { id: 2, nombre: 'VH' },
        ];
        setAnalisisData([]);
        setAnalisisLoading(true);
        setAnalisisError(false);
        // Fase 1: 3 llamadas paralelas (una por sucursal)
        Promise.allSettled(SUCURSALES.map((s) => entradaAlmacenApi.obtenerUltimasEntradasPorSucursal(s.id, analisisDetalle.codigo)
            .then((data) => {
            if (data && data.length > 0) {
                const item = data[0];
                return { ...item, sucursal: s.id, sucursalNombre: s.nombre };
            }
            return { sucursal: s.id, sucursalNombre: s.nombre, codigo: analisisDetalle.codigo, nombre: '', fecha: null, documento: '', cantidad: 0 };
        })
            .catch(() => ({
            sucursal: s.id, sucursalNombre: s.nombre, codigo: analisisDetalle.codigo, nombre: '', fecha: null, documento: '', cantidad: 0
        })))).then((results) => {
            const datos = results
                .map((r) => (r.status === 'fulfilled' ? r.value : null))
                .filter((d) => d !== null);
            setAnalisisData(datos);
            setAnalisisLoading(false);
            // Fase 2: resumen movimientos para las que sí tienen fecha
            const conDatos = datos.filter((d) => d?.fecha);
            if (conDatos.length > 0) {
                setAnalisisResumenLoading(true);
                Promise.allSettled(conDatos.map((item) => entradaAlmacenApi.obtenerResumenMovimientosPosteriores(item.sucursal, analisisDetalle.codigo, dayjs(item.fecha).format('YYYYMMDDHHmmss'), item.sucursal)
                    .then((resumen) => ({ sucursal: item.sucursal, resumen }))
                    .catch(() => ({ sucursal: item.sucursal, resumen: null })))).then((res) => {
                    setAnalisisData((prev) => prev.map((item) => {
                        const found = res.find((r) => r.status === 'fulfilled' && r.value?.sucursal === item?.sucursal);
                        return found?.status === 'fulfilled' && found.value?.resumen
                            ? { ...item, resumen: found.value.resumen }
                            : item;
                    }));
                    setAnalisisResumenLoading(false);
                });
            }
        }).catch(() => {
            setAnalisisError(true);
            setAnalisisLoading(false);
        });
    }, [analisisOpen, analisisDetalle]);
    const editValuesRef = useRef({});
    const navigationConfirmedRef = useFormularioNavigation();
    const codigoInputRef = useRef(null);
    const selectedSuplidorRef = useRef(selectedSuplidor);
    const plantillaDetallesRef = useRef(new Map());
    useEffect(() => { selectedSuplidorRef.current = selectedSuplidor; }, [selectedSuplidor]);
    const [form] = Form.useForm();
    // ===== Cierre contable =====
    useEffect(() => {
        parametrosApi.obtenerFechaCierre(sucursalActiva)
            .then((fecha) => setFechaCierreContable(dayjs(fecha)))
            .catch((err) => console.warn('Error al obtener fecha cierre', err));
        parametrosApi.obtenerFechaCierreInventario(sucursalActiva)
            .then((fecha) => {
            if (fecha)
                setFechaCierreContable(dayjs(fecha));
        })
            .catch((err) => console.warn('Error al obtener fecha cierre inventario', err));
    }, [sucursalActiva]);
    // ===== Carga inicial y título =====
    useEffect(() => {
        setActiveModule(screenCode);
        const pageTitle = mode === 'crear' ? 'Nuevo Generador ORC' : 'Editar Generador ORC';
        setPageTitleOverride(pageTitle);
        unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch((err) => console.warn('Error al cargar medidas cache', err));
        if (mode === 'crear') {
            form.setFieldsValue({ fecha: dayjs() });
        }
        return () => {
            resetToolbar();
            setPageTitleOverride('');
        };
    }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, form]);
    // ===== Cargar datos si es edición =====
    useEffect(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoading(true);
        generadorOrcApi.obtenerPorId(sucursalActiva, id)
            .then((res) => {
            setData(res);
            setPageTitleOverride(`GORC-${res.numero} — Editar`);
            const detallesMapeados = (res.detalles || []).map((d) => calcularFilaGORC(d));
            setDetalles(detallesMapeados);
            setLoadVersion((v) => v + 1);
            if (res.suplidor) {
                setSelectedSuplidor(res.suplidor);
                setSuplidorSearchText(toTitleCase(res.suplidor.nombre));
            }
            const fechaVal = res.fecha ? dayjs(res.fecha) : null;
            form.setFieldsValue({
                fecha: fechaVal,
                notas: res.notas || '',
            });
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
            message.error(msg);
            setLoadingError(true);
            navigationConfirmedRef.current = true;
            navigate('/FGORC', { replace: true });
        })
            .finally(() => setLoading(false));
    }, [mode, id, sucursalActiva, form, navigate]);
    // ===== Handlers de navegación =====
    const handleCancelar = () => {
        Modal.confirm({
            title: '¿Descartar cambios?',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: 'Los cambios no guardados se perderán. ¿Está seguro que desea salir?',
            okText: 'Sí, descartar',
            cancelText: 'Continuar editando',
            okButtonProps: { danger: true },
            onOk: () => {
                navigationConfirmedRef.current = true;
                navigate('/FGORC', { replace: true });
            },
        });
    };
    // ===== Validación =====
    const validarFormulario = () => {
        if (!selectedSuplidor)
            return 'Debe seleccionar un suplidor antes de guardar.';
        if (detalles.length === 0)
            return 'Debe agregar al menos un producto al generador.';
        const tieneCantidad = detalles.some((d) => {
            const total = Object.values(d.cantidades || {}).reduce((s, v) => s + (v || 0), 0);
            return total > 0;
        });
        if (!tieneCantidad)
            return 'Al menos un producto debe tener una cantidad mayor a cero.';
        const fecha = form.getFieldValue('fecha');
        if (!fecha)
            return 'La fecha del documento es requerida.';
        return null;
    };
    // ===== Construir DTO =====
    const construirDTO = () => {
        const values = form.getFieldsValue();
        const base = data || {};
        const fechaDoc = values.fecha
            ? (typeof values.fecha === 'object' && values.fecha.toDate
                ? toISOFormat(values.fecha.toDate())
                : values.fecha)
            : toISOFormat(new Date());
        const totalSub = detalles.reduce((s, d) => s + (d.subTotal || 0), 0);
        const totalDesc = detalles.reduce((s, d) => s + (d.descuento || 0), 0);
        const totalImp = detalles.reduce((s, d) => s + (d.impuestos || 0), 0);
        const total = detalles.reduce((s, d) => s + (d.total || 0), 0);
        return {
            idExterno: base.idExterno || '',
            numero: base.numero || '',
            fecha: fechaDoc,
            suplidor: selectedSuplidor,
            almacen: base.almacen || '',
            notas: values.notas || '',
            estado: base.estado || 0,
            subTotal: Math.round(totalSub * 100) / 100,
            descuento: Math.round(totalDesc * 100) / 100,
            impuestos: Math.round(totalImp * 100) / 100,
            redondeo: redondeoComercial,
            total: Math.round(total * 100) / 100,
            creadoPor: null,
            validadoPor: null,
            logs: base.logs || [],
            detalles: detalles.map((d) => calcularFilaGORC(d)),
        };
    };
    // ===== Guardar =====
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
                const result = await generadorOrcApi.crear(sucursalActiva, dto);
                message.success('Generador ORC creado correctamente');
                navigationConfirmedRef.current = true;
                navigate(`/FGORC/${result.idExterno}`, { replace: true });
            }
            else {
                await generadorOrcApi.actualizar(sucursalActiva, dto);
                message.success('Generador ORC actualizado correctamente');
                navigationConfirmedRef.current = true;
                navigate(`/FGORC/${id}`, { replace: true });
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
    // ===== Handler de suplidor =====
    const handleSuplidorSelect = (suplidor) => {
        if (detalles.length > 0) {
            Modal.confirm({
                title: 'Cambiar suplidor',
                icon: _jsx(ExclamationCircleOutlined, {}),
                content: `Al cambiar el suplidor a "${toTitleCase(suplidor.nombre)}", los productos actuales serán eliminados. ¿Desea continuar?`,
                okText: 'Sí, cambiar',
                cancelText: 'Cancelar',
                okButtonProps: { danger: true },
                onOk: () => {
                    setSelectedSuplidor(suplidor);
                    setSuplidorSearchText(toTitleCase(suplidor.nombre));
                    form.setFieldsValue({ suplidorCodigo: suplidor.codigo });
                    setDetalles([]);
                    // Preguntar modo de carga
                    setModosCargaModalOpen(true);
                },
            });
        }
        else {
            setSelectedSuplidor(suplidor);
            setSuplidorSearchText(toTitleCase(suplidor.nombre));
            form.setFieldsValue({ suplidorCodigo: suplidor.codigo });
            // Si no hay detalles, abrir directamente el modal de carga
            setModosCargaModalOpen(true);
        }
    };
    const handleCargarMaestro = useCallback(async () => {
        const suplidor = selectedSuplidorRef.current;
        if (!suplidor) {
            message.warning('Seleccione un suplidor primero');
            setCargandoMaestro(false);
            return;
        }
        setCargandoMaestro(true);
        try {
            const productos = await productoApi.obtenerProductosPorSuplidor(sucursalActiva, suplidor.codigo);
            if (!productos || productos.length === 0) {
                message.info('No se encontraron productos para este suplidor.');
                setDetalles([]);
                return;
            }
            const codigos = productos.map((p) => p.codigo);
            let datosAnteriores = [];
            try {
                datosAnteriores = await generadorOrcApi.obtenerDatosAnteriores(sucursalActiva, codigos);
            }
            catch { }
            const mapDatosAnteriores = new Map();
            (datosAnteriores || []).forEach((d) => {
                if (d.codigo)
                    mapDatosAnteriores.set(d.codigo, d);
            });
            // Construir datos enriquecidos (para guardar en memoria si da NO)
            const todosProductosMaestro = productos.map((prod) => {
                const hist = mapDatosAnteriores.get(prod.codigo);
                const impuestoCompra = (prod.impuestos || []).find((i) => i.impuesto?.ambito === "Compra")?.impuesto || null;
                return {
                    codigo: prod.codigo,
                    articulo: prod.nombre || '',
                    referencia: prod.referenciaInterna || '',
                    _costo: hist?.costo ?? prod.ultimoCosto ?? 0,
                    _margen: hist?.margen ?? 0,
                    _precioSugerido: hist?.precioSugerido ?? prod.precio ?? 0,
                    _ultimaCompraFecha: hist?.fecha ?? undefined,
                    _porcentajeDescuento: hist?.porcientoDescuento ?? 0,
                    _impuesto: impuestoCompra,
                    _medida: normalizarMedida(prod.unidadMedida) ?? normalizarMedida(unidadBase),
                    ultimoCosto: hist?.costo ?? prod.ultimoCosto ?? 0,
                    medida: normalizarMedida(prod.unidadMedida) ?? normalizarMedida(unidadBase),
                };
            });
            // Modal de confirmación
            const shouldLoad = await new Promise((resolve) => {
                Modal.confirm({
                    title: 'Cargar productos del maestro',
                    icon: _jsx(ExclamationCircleOutlined, {}),
                    content: `¿Desea cargar los ${todosProductosMaestro.length} productos del suplidor ${toTitleCase(suplidor.nombre)}?`,
                    okText: 'Sí',
                    cancelText: 'No',
                    onOk: () => resolve(true),
                    onCancel: () => resolve(false),
                });
            });
            if (shouldLoad) {
                // Cargar directo en la tabla
                const filas = productos.map((prod) => {
                    const hist = mapDatosAnteriores.get(prod.codigo);
                    const impuestoCompra = (prod.impuestos || []).find((i) => i.impuesto?.ambito === "Compra")?.impuesto || null;
                    return {
                        codigo: prod.codigo,
                        referencia: prod.referenciaInterna || '',
                        producto: prod.nombre || '',
                        medida: normalizarMedida(prod.unidadMedida) ?? normalizarMedida(unidadBase),
                        impuesto: impuestoCompra,
                        cantidades: { OP: 0, HR: 0, VH: 0 },
                        cantidadesBonificadas: { OP: 0, HR: 0, VH: 0 },
                        existencias: { OP: 0, HR: 0, VH: 0 },
                        existenciasFisicas: { OP: 0, HR: 0, VH: 0 },
                        costo: hist?.costo ?? prod.ultimoCosto ?? 0,
                        ultimaCompraFecha: hist?.fecha ?? undefined,
                        margen: hist?.margen ?? 0,
                        precioSugerido: hist?.precioSugerido ?? prod.precio ?? 0,
                        subTotal: 0,
                        porcentajeDescuento: hist?.porcientoDescuento ?? 0,
                        descuento: 0,
                        impuestos: 0,
                        total: 0,
                    };
                });
                setDetalles(filas.map((f) => calcularFilaGORC(f)));
                setLoadVersion((v) => v + 1);
                message.success(`${filas.length} productos cargados del maestro`);
            }
            else {
                // Guardar en memoria
                setMaestroDetallesData(todosProductosMaestro);
                message.info(`${todosProductosMaestro.length} productos del suplidor guardados en memoria.`);
            }
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al cargar productos del maestro');
            message.error(msg);
        }
        finally {
            setCargandoMaestro(false);
        }
    }, [sucursalActiva, unidadBase]);
    // ===== Handler de detalle =====
    const handleCeldaCommit = useCallback((rowCodigo, campo, valor) => {
        setDetalles((prev) => prev.map((d) => {
            if (d.codigo !== rowCodigo)
                return d;
            let actualizado = { ...d };
            if (campo.startsWith('cantidades.')) {
                const suc = campo.split('.')[1];
                actualizado = {
                    ...actualizado,
                    cantidades: { ...(actualizado.cantidades || {}), [suc]: valor },
                };
            }
            else if (campo.startsWith('cantidadesBonificadas.')) {
                const suc = campo.split('.')[1];
                actualizado = {
                    ...actualizado,
                    cantidadesBonificadas: { ...(actualizado.cantidadesBonificadas || {}), [suc]: valor },
                };
            }
            else if (campo === 'descuento') {
                const cantTotal = Object.values(actualizado.cantidades || {}).reduce((s, v) => s + (v || 0), 0);
                const subTotal = Math.round((cantTotal * (actualizado.costo || 0)) * 100) / 100;
                actualizado.porcentajeDescuento = subTotal > 0 ? (valor / subTotal) * 100 : 0;
            }
            else {
                actualizado[campo] = valor;
            }
            // Recalcular precio sugerido: costo unitario × (1 + margen/100)
            if (campo === 'costo' || campo === 'margen') {
                const factor = actualizado.medida?.factor || 1;
                const costoUnitario = (actualizado.costo || 0) / factor;
                const margen = actualizado.margen || 0;
                actualizado.precioSugerido = Math.round(costoUnitario * (1 + margen / 100) * 100) / 100;
            }
            return calcularFilaGORC(actualizado);
        }));
    }, []);
    const handleEliminarDetalle = useCallback((codigo) => {
        const filaEliminada = detalles.find((d) => d.codigo === codigo);
        const indexEliminado = detalles.findIndex((d) => d.codigo === codigo);
        if (!filaEliminada)
            return;
        setDetalles((prev) => prev.filter((d) => d.codigo !== codigo));
        const key = `undo_${codigo}`;
        message.open({
            key,
            type: 'info',
            content: (_jsxs("span", { children: ["Producto eliminado.", ' ', _jsx(Button, { type: "link", size: "small", style: { padding: 0 }, onClick: () => {
                            setDetalles((prev) => {
                                const nueva = [...prev];
                                nueva.splice(indexEliminado, 0, filaEliminada);
                                return nueva;
                            });
                            message.destroy(key);
                        }, children: "Deshacer" })] })),
            duration: 5,
        });
    }, [detalles]);
    const handleAgregarProducto = async () => {
        const suplidor = selectedSuplidorRef.current;
        if (!suplidor) {
            message.warning('Seleccione un suplidor primero');
            return;
        }
        try {
            const productos = await productoApi.obtenerProductosPorSuplidor(sucursalActiva, suplidor.codigo);
            if (!productos || productos.length === 0) {
                message.info('No se encontraron productos para este suplidor.');
                setSuplidorProductos([]);
                setProductoModalOpen(true);
                return;
            }
            const codigos = productos.map((p) => p.codigo);
            let datosAnteriores = [];
            try {
                datosAnteriores = await generadorOrcApi.obtenerDatosAnteriores(sucursalActiva, codigos);
            }
            catch { }
            const mapDatosAnteriores = new Map();
            (datosAnteriores || []).forEach((d) => {
                if (d.codigo)
                    mapDatosAnteriores.set(d.codigo, d);
            });
            const enriquecidos = productos.map((prod) => {
                const hist = mapDatosAnteriores.get(prod.codigo);
                const impuestoCompra = (prod.impuestos || []).find((i) => i.impuesto?.ambito === "Compra")?.impuesto || null;
                return {
                    codigo: prod.codigo,
                    articulo: prod.nombre || '',
                    referencia: prod.referenciaInterna || '',
                    _costo: hist?.costo ?? prod.ultimoCosto ?? 0,
                    _margen: hist?.margen ?? 0,
                    _precioSugerido: hist?.precioSugerido ?? prod.precio ?? 0,
                    _ultimaCompraFecha: hist?.fecha ?? undefined,
                    _porcentajeDescuento: hist?.porcientoDescuento ?? 0,
                    _impuesto: impuestoCompra,
                    _medida: (() => {
                        if (hist?.medidaId && hist.medidaId > 0) {
                            const histMedida = medidasCache.find(m => Number(m.idExterno) === Number(hist.medidaId));
                            if (histMedida)
                                return { ...histMedida };
                        }
                        return normalizarMedida(prod.unidadMedida) ?? normalizarMedida(unidadBase);
                    })(),
                    ultimoCosto: hist?.costo ?? prod.ultimoCosto ?? 0,
                    medida: (() => {
                        if (hist?.medidaId && hist.medidaId > 0) {
                            const histMedida = medidasCache.find(m => Number(m.idExterno) === Number(hist.medidaId));
                            if (histMedida)
                                return { ...histMedida };
                        }
                        return normalizarMedida(prod.unidadMedida) ?? normalizarMedida(unidadBase);
                    })(),
                };
            });
            setSuplidorProductos(enriquecidos);
            setProductoModalOpen(true);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al cargar productos del suplidor');
            message.error(msg);
        }
    };
    const handleProductoSeleccionado = useCallback((producto) => {
        const yaExiste = detalles.some((d) => d.codigo === producto.codigo);
        if (yaExiste) {
            message.warning(`${producto.codigo} ya está en la tabla`);
            return;
        }
        const nuevaFila = {
            codigo: producto.codigo,
            referencia: producto.referencia || '',
            producto: producto.articulo || '',
            medida: producto.medida || normalizarMedida(unidadBase),
            impuesto: producto.impuesto || null,
            cantidades: { OP: 0, HR: 0, VH: 0 },
            cantidadesBonificadas: { OP: 0, HR: 0, VH: 0 },
            existencias: { OP: 0, HR: 0, VH: 0 },
            existenciasFisicas: producto.existenciasFisicas ?? { OP: 0, HR: 0, VH: 0 },
            costo: producto.costo || 0,
            margen: producto.margen || 0,
            precioSugerido: producto.precioSugerido || 0,
            subTotal: 0,
            porcentajeDescuento: producto.porcentajeDescuento ?? 0,
            ultimaCompraFecha: producto.ultimaCompraFecha ?? undefined,
            descuento: 0,
            impuestos: 0,
            total: 0,
        };
        setDetalles((prev) => [...prev, nuevaFila]);
        setProductoModalOpen(false);
        message.success(`${toTitleCase(producto.articulo || '')} agregado`);
    }, [detalles]);
    // ===== Código rápido (Enter para buscar producto) =====
    const handleCodigoEnter = async () => {
        const codigo = codigoInput.trim();
        if (!codigo)
            return;
        if (!selectedSuplidor) {
            message.warning('Seleccione un suplidor primero');
            return;
        }
        try {
            const producto = await productoApi.obtenerPorCodigo(sucursalActiva, codigo);
            if (!producto) {
                message.error(`Producto ${codigo} no encontrado`);
                setCodigoInput('');
                codigoInputRef.current?.focus();
                return;
            }
            // Obtener datos históricos de última compra
            let hist = null;
            try {
                const datosAnteriores = await generadorOrcApi.obtenerDatosAnteriores(sucursalActiva, [codigo]);
                hist = (datosAnteriores || [])[0] ?? null;
            }
            catch {
                // Silencioso - se usan datos del maestro como fallback
            }
            // Obtener existencias reales por sucursal usando el prefijo de cada compañía
            const fechaStr = dayjs().format('YYYYMMDDHHmmss');
            const existenciasFisicas = { OP: 0, HR: 0, VH: 0 };
            const columnasValidas = ['OP', 'HR', 'VH'];
            try {
                const companias = await companiaApi.obtenerTodas(sucursalActiva);
                const companiasFiltradas = (companias || []).filter((c) => c.prefijo && columnasValidas.includes(c.prefijo));
                if (companiasFiltradas.length > 0) {
                    const resultados = await Promise.allSettled(companiasFiltradas.map((c) => {
                        return generadorOrcApi.obtenerExistencias(c.sucursal ?? 0, [codigo], fechaStr)
                            .then((res) => {
                            return {
                                prefijo: c.prefijo,
                                total: (res || []).reduce((sum, item) => sum + (item.cantidad || 0), 0)
                            };
                        });
                    }));
                    resultados.forEach((r) => {
                        if (r.status === 'fulfilled' && r.value) {
                            existenciasFisicas[r.value.prefijo] = r.value.total;
                        }
                    });
                }
            }
            catch (e) {
                // Silencioso - el error ya se maneja externamente
            }
            // Construir objeto compatible con handleProductoSeleccionado
            const impuestoCompra = (producto.impuestos || []).find((i) => i.impuesto?.ambito === "Compra")?.impuesto || null;
            // Determinar medida: priorizar la de la última compra si existe
            let medidaFinal = null;
            if (hist?.medidaId && Number(hist.medidaId) > 0) {
                const histMedida = medidasCache.find(m => Number(m.idExterno) === Number(hist.medidaId));
                if (histMedida) {
                    medidaFinal = { ...histMedida };
                }
            }
            if (!medidaFinal) {
                medidaFinal = normalizarMedida(producto.unidadMedida);
            }
            const productoCompacto = {
                codigo: producto.codigo,
                referencia: producto.referencia || '',
                articulo: producto.nombre || '',
                medida: medidaFinal,
                impuesto: impuestoCompra
                    ? {
                        nombre: impuestoCompra.nombre || '',
                        porcentaje: impuestoCompra.porcentaje || 0,
                        codigo: impuestoCompra.codigo || '',
                        idExterno: impuestoCompra.idExterno || '',
                    }
                    : null,
                costo: hist?.costo ?? producto.ultimoCosto ?? 0,
                margen: hist?.margen ?? 0,
                precioSugerido: hist?.precioSugerido ?? producto.precio ?? 0,
                ultimaCompraFecha: hist?.fecha ?? undefined,
                porcentajeDescuento: hist?.porcientoDescuento ?? 0,
                existenciasFisicas,
            };
            Modal.confirm({
                title: 'Producto encontrado',
                icon: _jsx(ExclamationCircleOutlined, {}),
                content: `¿Agregar ${producto.nombre || ''} (${codigo})?`,
                okText: 'Agregar',
                cancelText: 'Cancelar',
                onOk: () => {
                    handleProductoSeleccionado(productoCompacto);
                    setCodigoInput('');
                    setTimeout(() => codigoInputRef.current?.focus(), 100);
                },
                onCancel: () => {
                    setCodigoInput('');
                    setTimeout(() => codigoInputRef.current?.focus(), 100);
                },
            });
        }
        catch {
            message.error(`Producto ${codigo} no encontrado`);
            setCodigoInput('');
            codigoInputRef.current?.focus();
        }
    };
    const handleRecalcularPrecios = useCallback(() => {
        setRecalculando(true);
        setDetalles((prev) => prev.map((d) => ({
            ...d,
            precioSugerido: redondearAlFactor(d.costo * (1 + (d.margen || 0) / 100), factorRedondeo),
        })));
        setRecalculando(false);
        message.success('Precios sugeridos recalculados');
    }, [factorRedondeo]);
    const handleCargarConteoCache = useCallback(() => {
        if (!conteoDetallesData || conteoDetallesData.length === 0) {
            message.info('No hay productos de conteo en memoria. Cargue una plantilla primero.');
            return;
        }
        const filas = conteoDetallesData.map((d) => ({
            codigo: d.codigo || '',
            referencia: d.referencia || '',
            producto: d.articulo || '',
            medida: d._medida || d.medida || normalizarMedida(unidadBase),
            impuesto: d._impuesto || null,
            cantidades: { OP: 0, HR: 0, VH: 0 },
            cantidadesBonificadas: { OP: 0, HR: 0, VH: 0 },
            existencias: { OP: 0, HR: 0, VH: 0 },
            existenciasFisicas: {
                OP: d._cantidadesPorPrefijo?.OP || 0,
                HR: d._cantidadesPorPrefijo?.HR || 0,
                VH: d._cantidadesPorPrefijo?.VH || 0,
            },
            costo: d._costo || 0,
            ultimaCompraFecha: d._ultimaCompraFecha || undefined,
            margen: d._margen || 0,
            precioSugerido: d._precioSugerido || 0,
            subTotal: 0,
            porcentajeDescuento: d._porcentajeDescuento || 0,
            descuento: 0,
            impuestos: 0,
            total: 0,
        }));
        setDetalles((prev) => [...prev, ...filas.map((f) => calcularFilaGORC(f))]);
        setLoadVersion((v) => v + 1);
        message.success(`${filas.length} productos cargados desde memoria`);
    }, [conteoDetallesData]);
    const handleCargarPlantilla = useCallback(() => {
        if (!selectedSuplidor) {
            message.warning('Seleccione un suplidor primero');
            return;
        }
        setPlantillaModalOpen(true);
    }, [selectedSuplidor]);
    const handlePlantillaSeleccionada = useCallback(async (plantilla) => {
        if (!selectedSuplidor)
            return;
        setCargandoMaestro(true);
        try {
            const response = await conteoApi.obtenerPorPlantilla(sucursalActiva, plantilla.codigo);
            const conteos = Array.isArray(response) ? response : [];
            if (conteos.length === 0) {
                try {
                    const plantillaData = await conteoApi.obtenerPlantilla(sucursalActiva, plantilla.codigo || plantilla.id);
                    const detallesPlantilla = plantillaData?.detalles;
                    const mapPlantilla = new Map();
                    detallesPlantilla?.forEach((d) => {
                        if (d.codigo)
                            mapPlantilla.set(d.codigo, d);
                    });
                    plantillaDetallesRef.current = mapPlantilla;
                    if (detallesPlantilla && detallesPlantilla.length > 0) {
                        const codigos = [...new Set(detallesPlantilla.map((d) => d.codigo).filter(Boolean))];
                        let mapDatosAnteriores = new Map();
                        let mapImpuestos = new Map();
                        let mapMedidasFallback = new Map();
                        if (codigos.length > 0) {
                            try {
                                const [datosAnteriores, productos] = await Promise.all([
                                    generadorOrcApi.obtenerDatosAnteriores(sucursalActiva, codigos),
                                    productoApi.obtenerPorListaCodigos(sucursalActiva, codigos),
                                ]);
                                (datosAnteriores || []).forEach((d) => {
                                    if (d.codigo)
                                        mapDatosAnteriores.set(d.codigo, d);
                                });
                                (productos || []).forEach((p) => {
                                    const impuestoCompra = (p.impuestos || []).find((i) => i.impuesto?.ambito === "Compra")?.impuesto || null;
                                    if (impuestoCompra)
                                        mapImpuestos.set(p.codigo, impuestoCompra);
                                    if (p.unidadMedida) {
                                        mapMedidasFallback.set(p.codigo, {
                                            nombre: p.unidadMedida.nombre || '',
                                            codigo: p.unidadMedida.codigo || '',
                                            factor: p.unidadMedida.factor ?? 0,
                                            idExterno: p.unidadMedida.idExterno ?? 0,
                                        });
                                    }
                                });
                            }
                            catch { }
                        }
                        const filas = detallesPlantilla.map((d) => {
                            const hist = mapDatosAnteriores.get(d.codigo);
                            return {
                                codigo: d.codigo || '',
                                referencia: d.referencia || '',
                                producto: d.producto || d.DESCRIPCION || '',
                                medida: d.presentacion
                                    ? { nombre: d.presentacion, codigo: '', factor: 1, idExterno: d.presentacionID || 0 }
                                    : mapMedidasFallback.get(d.codigo) || normalizarMedida(unidadBase),
                                impuesto: mapImpuestos.get(d.codigo) || null,
                                cantidades: { OP: 0, HR: 0, VH: 0 },
                                cantidadesBonificadas: { OP: 0, HR: 0, VH: 0 },
                                existencias: { OP: 0, HR: 0, VH: 0 },
                                existenciasFisicas: {
                                    OP: p._cantidadesPorPrefijo?.OP || 0,
                                    HR: p._cantidadesPorPrefijo?.HR || 0,
                                    VH: p._cantidadesPorPrefijo?.VH || 0,
                                },
                                costo: hist?.costo ?? 0,
                                ultimaCompraFecha: hist?.fecha ?? undefined,
                                margen: hist?.margen ?? 0,
                                precioSugerido: hist?.precioSugerido ?? 0,
                                subTotal: 0,
                                porcentajeDescuento: 0,
                                descuento: 0,
                                impuestos: 0,
                                total: 0,
                            };
                        });
                        setConteoDetallesData(detallesPlantilla);
                        const shouldLoad = await new Promise((resolve) => {
                            Modal.confirm({
                                title: 'Cargar productos de la plantilla',
                                content: `No hay conteos recientes. ¿Desea cargar los ${filas.length} productos definidos en la plantilla?`,
                                okText: 'Sí',
                                cancelText: 'No',
                                onOk: () => resolve(true),
                                onCancel: () => resolve(false),
                            });
                        });
                        if (shouldLoad) {
                            setDetalles(filas.map((f) => calcularFilaGORC(f)));
                            setLoadVersion((v) => v + 1);
                            message.success(`${filas.length} productos cargados de la plantilla`);
                        }
                        else {
                            message.info('Productos de plantilla guardados en memoria.');
                        }
                        return;
                    }
                }
                catch { }
                message.info('No se encontraron conteos físicos para esta plantilla en los últimos 15 días.');
                setConteosPlantilla([]);
                return;
            }
            setConteosPlantilla(conteos);
            setSeleccionarConteosOpen(true);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al cargar conteos de la plantilla');
            message.error(msg);
        }
        finally {
            setCargandoMaestro(false);
        }
    }, [sucursalActiva, selectedSuplidor]);
    const handleConteosSeleccionados = useCallback(async (selectedKeys) => {
        if (selectedKeys.length === 0)
            return;
        setCargandoMaestro(true);
        try {
            const todosDetalles = [];
            for (const key of selectedKeys) {
                const id = Number(key);
                if (isNaN(id))
                    continue;
                const conteo = await conteoApi.obtenerPorId(sucursalActiva, id);
                if (conteo && conteo.detalles) {
                    const prefijoConteo = conteo.compania?.prefijo || '';
                    for (const d of conteo.detalles) {
                        const idx = todosDetalles.findIndex((item) => item.codigo === d.codigo);
                        if (idx === -1) {
                            // Nuevo producto: inicializar _cantidadesPorPrefijo
                            todosDetalles.push({
                                ...d,
                                _cantidadesPorPrefijo: prefijoConteo ? { [prefijoConteo]: d.cantidad || 0 } : {},
                            });
                        }
                        else {
                            // Ya existe: acumular cantidad por prefijo
                            if (prefijoConteo && d.cantidad) {
                                todosDetalles[idx]._cantidadesPorPrefijo = todosDetalles[idx]._cantidadesPorPrefijo || {};
                                todosDetalles[idx]._cantidadesPorPrefijo[prefijoConteo] =
                                    (todosDetalles[idx]._cantidadesPorPrefijo[prefijoConteo] || 0) + d.cantidad;
                            }
                        }
                    }
                }
            }
            if (todosDetalles.length === 0) {
                message.info('No se encontraron productos en los conteos seleccionados.');
                setConteoDetallesData(null);
                return;
            }
            const codigos = [...new Set(todosDetalles.map((d) => d.codigo).filter(Boolean))];
            let mapDatosAnteriores = new Map();
            let mapImpuestos = new Map();
            let mapMedidas = new Map();
            if (codigos.length > 0) {
                try {
                    const [datosAnteriores, productos] = await Promise.all([
                        generadorOrcApi.obtenerDatosAnteriores(sucursalActiva, codigos),
                        productoApi.obtenerPorListaCodigos(sucursalActiva, codigos),
                    ]);
                    (datosAnteriores || []).forEach((d) => {
                        if (d.codigo)
                            mapDatosAnteriores.set(d.codigo, d);
                    });
                    (productos || []).forEach((p) => {
                        const impuestoCompra = (p.impuestos || []).find((i) => i.impuesto?.ambito === "Compra")?.impuesto || null;
                        if (impuestoCompra)
                            mapImpuestos.set(p.codigo, impuestoCompra);
                        if (p.unidadMedida) {
                            mapMedidas.set(p.codigo, {
                                nombre: p.unidadMedida.nombre || '',
                                codigo: p.unidadMedida.codigo || '',
                                factor: p.unidadMedida.factor ?? 0,
                                idExterno: p.unidadMedida.idExterno ?? 0,
                            });
                        }
                    });
                }
                catch { }
            }
            // Enriquecer detalles con datos anteriores ANTES de guardar en memoria
            const todosDetallesEnriquecidos = todosDetalles.map((d) => {
                const hist = mapDatosAnteriores.get(d.codigo);
                const detallePlantilla = plantillaDetallesRef.current.get(d.codigo);
                return {
                    ...d,
                    _costo: hist?.costo ?? d.ultimoCosto ?? d.costo ?? 0,
                    _margen: hist?.margen ?? 0,
                    _precioSugerido: hist?.precioSugerido ?? 0,
                    _ultimaCompraFecha: hist?.fecha ?? undefined,
                    _porcentajeDescuento: hist?.porcientoDescuento ?? 0,
                    _impuesto: mapImpuestos.get(d.codigo) || null,
                    _medida: detallePlantilla?.presentacion
                        ? { nombre: detallePlantilla.presentacion, codigo: '', factor: 1, idExterno: detallePlantilla.presentacionID || 0 }
                        : d.medida || mapMedidas.get(d.codigo) || normalizarMedida(unidadBase),
                };
            });
            setConteoDetallesData(todosDetallesEnriquecidos);
            const shouldLoad = await new Promise((resolve) => {
                Modal.confirm({
                    title: 'Cargar productos del conteo',
                    content: `¿Desea cargar los ${todosDetallesEnriquecidos.length} productos de los conteos físicos?`,
                    okText: 'Sí',
                    cancelText: 'No',
                    onOk: () => resolve(true),
                    onCancel: () => resolve(false),
                });
            });
            if (shouldLoad) {
                const filas = todosDetallesEnriquecidos.map((d) => ({
                    codigo: d.codigo || '',
                    referencia: d.referencia || '',
                    producto: d.articulo || d.descripcion || '',
                    medida: d._medida,
                    impuesto: d._impuesto,
                    cantidades: { OP: 0, HR: 0, VH: 0 },
                    cantidadesBonificadas: { OP: 0, HR: 0, VH: 0 },
                    existencias: { OP: 0, HR: 0, VH: 0 },
                    existenciasFisicas: {
                        OP: d._cantidadesPorPrefijo?.OP || 0,
                        HR: d._cantidadesPorPrefijo?.HR || 0,
                        VH: d._cantidadesPorPrefijo?.VH || 0,
                    },
                    costo: d._costo,
                    ultimaCompraFecha: d._ultimaCompraFecha,
                    margen: d._margen,
                    precioSugerido: d._precioSugerido,
                    subTotal: 0,
                    porcentajeDescuento: d._porcentajeDescuento,
                    descuento: 0,
                    impuestos: 0,
                    total: 0,
                }));
                setDetalles(filas.map((f) => calcularFilaGORC(f)));
                setLoadVersion((v) => v + 1);
                message.success(`${filas.length} productos cargados de los conteos`);
            }
            else {
                message.info('Productos de conteos guardados en memoria.');
            }
        }
        catch (err) {
            console.error('[GORC] Error en handleConteosSeleccionados:', err);
            const msg = extraerMensajeError(err, 'Error al cargar detalles de conteos');
            message.error(msg);
        }
        finally {
            setCargandoMaestro(false);
        }
    }, [sucursalActiva]);
    // ===== Refresh =====
    const handleRefresh = useCallback(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoadingError(false);
        setLoading(true);
        generadorOrcApi.obtenerPorId(sucursalActiva, id)
            .then((res) => {
            setData(res);
            const detallesMapeados = (res.detalles || []).map((d) => calcularFilaGORC(d));
            setDetalles(detallesMapeados);
            setLoadVersion((v) => v + 1);
            if (res.suplidor) {
                setSelectedSuplidor(res.suplidor);
                setSuplidorSearchText(toTitleCase(res.suplidor.nombre));
            }
            const fechaVal = res.fecha ? dayjs(res.fecha) : null;
            form.setFieldsValue({ fecha: fechaVal, notas: res.notas || '' });
        })
            .catch((err) => {
            message.error(err?.response?.data?.errorMessage || 'Error al recargar');
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, form, mode]);
    // ===== Handler Ver Movimientos =====
    const handleVerMovimientos = useCallback(async (item) => {
        if (!analisisDetalle)
            return;
        setMovimientosSucursal(item.sucursalNombre);
        setMovimientosModalOpen(true);
        setMovimientosLoading(true);
        setMovimientosData([]);
        try {
            const data = await entradaAlmacenApi.obtenerDetalleMovimientosPosteriores(item.sucursal, analisisDetalle.codigo, dayjs(item.fecha).format('YYYYMMDDHHmmss'), item.sucursal);
            setMovimientosData(data ?? []);
        }
        catch {
            message.error('Error al cargar movimientos');
            setMovimientosData([]);
        }
        finally {
            setMovimientosLoading(false);
        }
    }, [sucursalActiva, analisisDetalle]);
    // ===== Totales derivados =====
    const totalesGenerales = useMemo(() => ({
        subTotal: detalles.reduce((s, d) => s + (d.subTotal || 0), 0),
        descuento: detalles.reduce((s, d) => s + (d.descuento || 0), 0),
        impuestos: detalles.reduce((s, d) => s + (d.impuestos || 0), 0),
        total: detalles.reduce((s, d) => s + (d.total || 0), 0),
    }), [detalles]);
    // ===== Detalles filtrados =====
    const detallesFiltrados = useMemo(() => detalleSearch
        ? detalles.filter((d) => {
            const q = detalleSearch.toLowerCase();
            return ((d.codigo || '').toLowerCase().includes(q) ||
                (d.producto || '').toLowerCase().includes(q) ||
                (d.referencia || '').toLowerCase().includes(q));
        })
        : detalles, [detalles, detalleSearch]);
    // Scroll a fila activa en la tabla de detalles
    useEffect(() => {
        if (activeRowIndex === null || activeRowIndex < 0)
            return;
        const fila = detallesFiltrados[activeRowIndex];
        if (!fila)
            return;
        const el = document.querySelector(`.gorc-table tr[data-row-key="${fila.codigo}"]`);
        if (el) {
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [activeRowIndex, detallesFiltrados]);
    // Mantener activeRowIndex válido cuando cambian los detalles (agregar/quitar filas)
    useEffect(() => {
        setActiveRowIndex((prev) => {
            if (detallesFiltrados.length === 0)
                return null;
            if (prev === null || prev >= detallesFiltrados.length)
                return 0;
            return prev;
        });
    }, [detallesFiltrados]);
    // ===== Columnas de la tabla =====
    const detalleColumns = useMemo(() => {
        const SUC_COLORS = {
            OP: 'gorc-band-op',
            HR: 'gorc-band-hr',
            VH: 'gorc-band-vh',
        };
        const SUC_COLORS_BG = {
            OP: '#e6f7e6', // verde muy claro
            HR: '#e6f0fa', // azul muy claro
            VH: '#fff3e6', // naranja muy claro
        };
        const sucursalGroup = (suc) => ({
            title: _jsx("div", { style: { textAlign: 'center' }, children: suc }),
            className: SUC_COLORS[suc] || '',
            children: [
                {
                    title: 'Cant.',
                    key: `${suc}_cant`,
                    width: 90,
                    align: 'right',
                    onCell: () => ({
                        style: { verticalAlign: 'top', backgroundColor: SUC_COLORS_BG[suc] || 'transparent' },
                    }),
                    render: (_, record) => {
                        const refKey = `${record.codigo}_cant_${suc}`;
                        return (_jsxs("div", { children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, precision: 0, controls: false, defaultValue: record.cantidades?.[suc] ?? 0, onChange: (val) => { editValuesRef.current[refKey] = val ?? 0; }, onBlur: () => {
                                        const val = editValuesRef.current[refKey] ?? record.cantidades?.[suc] ?? 0;
                                        handleCeldaCommit(record.codigo, `cantidades.${suc}`, val);
                                    }, onPressEnter: () => {
                                        const val = editValuesRef.current[refKey] ?? record.cantidades?.[suc] ?? 0;
                                        handleCeldaCommit(record.codigo, `cantidades.${suc}`, val);
                                    } }, `${record.codigo}_${suc}_cant_${loadVersion}`), _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 10, lineHeight: '18px', textAlign: 'right' }, children: ["Conteo: ", _jsx("strong", { children: formatNumber(record.existenciasFisicas?.[suc] ?? 0) })] })] }));
                    },
                },
            ],
        });
        return [
            // Columna Artículo (unifica código + producto + referencia, fija izquierda)
            {
                title: 'Artículo',
                key: 'articulo',
                width: 280,
                fixed: 'left',
                onCell: () => ({ style: { verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' } }),
                render: (_, record) => (_jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 8 }, children: [selectionMode && (_jsx(Checkbox, { checked: selectedRowKeys.includes(record.codigo), onChange: (e) => {
                                if (e.target.checked) {
                                    setSelectedRowKeys((prev) => [...prev, record.codigo]);
                                }
                                else {
                                    setSelectedRowKeys((prev) => prev.filter((k) => k !== record.codigo));
                                }
                            }, style: { marginTop: 3 } })), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontWeight: 500, fontSize: 12, wordBreak: 'break-word', whiteSpace: 'normal', overflowWrap: 'break-word' }, children: toTitleCase(record.producto || '') }), _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5 }, children: [_jsx("span", { children: record.codigo }), record.codigo && record.referencia && _jsx("span", { children: ' | ' }), record.referencia && _jsx("span", { children: record.referencia })] })] }), !selectionMode && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }, children: [_jsx(PermissionGate, { permisoEspecial: "pe_ver_analisis_compra", children: _jsx(EyeOutlined, { style: { cursor: 'pointer', marginTop: 2, color: 'var(--paces-primary)', fontSize: 14 }, onClick: (e) => {
                                            e.stopPropagation();
                                            setAnalisisDetalle(record);
                                            setAnalisisOpen(true);
                                        } }) }), record.ultimaCompraFecha && ((() => {
                                    const diffDias = dayjs().diff(dayjs(record.ultimaCompraFecha), 'day');
                                    if (diffDias > 30) {
                                        return (_jsx(Tooltip, { title: `Última compra: ${formatDate(record.ultimaCompraFecha)} (${diffDias} días)`, children: _jsx(ClockCircleOutlined, { style: { color: '#fa8c16', cursor: 'pointer', marginTop: 2, fontSize: 14 } }) }));
                                    }
                                    return null;
                                })())] }))] })),
            },
            // Medida
            {
                title: 'Medida',
                key: 'medida',
                width: 110,
                onCell: () => ({ style: { verticalAlign: 'top' } }),
                render: (_, record) => (_jsxs("div", { children: [_jsx(Select, { showSearch: true, filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()), size: "small", style: { width: '100%' }, value: record.medida?.idExterno || unidadBase?.idExterno || undefined, placeholder: "Seleccionar", onChange: (val) => {
                                const medida = medidasCache.find((m) => m.idExterno === val);
                                if (medida) {
                                    setDetalles((prev) => prev.map((d) => d.codigo === record.codigo
                                        ? { ...d, medida: { ...medida } }
                                        : d));
                                }
                            }, options: medidasCache.map((m) => ({
                                value: m.idExterno ?? 0,
                                label: toTitleCase(m.nombre || ''),
                            })) }), record.medida?.factor && record.medida.factor > 1 && (_jsxs("div", { className: "paces-text-secondary", style: { fontSize: 10, lineHeight: '18px', marginTop: 2 }, children: ["factor: ", record.medida.factor] }))] })),
            },
            // Costo
            {
                title: 'Costo',
                key: 'costo',
                width: 85,
                align: 'right',
                onCell: () => ({ style: { verticalAlign: 'top' } }),
                render: (_, record) => {
                    const factor = record.medida?.factor || 1;
                    const costoUnitario = factor > 1 ? (record.costo || 0) / factor : record.costo || 0;
                    return (_jsxs("div", { children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, precision: 2, controls: false, defaultValue: record.costo ?? 0, onChange: (val) => { editValuesRef.current[`${record.codigo}_costo`] = val ?? 0; }, onBlur: () => {
                                    const val = editValuesRef.current[`${record.codigo}_costo`] ?? record.costo ?? 0;
                                    handleCeldaCommit(record.codigo, 'costo', val);
                                }, onPressEnter: () => {
                                    const val = editValuesRef.current[`${record.codigo}_costo`] ?? record.costo ?? 0;
                                    handleCeldaCommit(record.codigo, 'costo', val);
                                } }, `${record.codigo}_costo_${loadVersion}`), factor > 1 && (_jsxs("div", { className: "paces-text-secondary", style: { fontSize: 10, lineHeight: '18px', textAlign: 'right', marginTop: 2 }, children: [formatNumber(costoUnitario), " c/u"] }))] }));
                },
                shouldCellUpdate: (record, prev) => record.costo !== prev.costo,
            },
            // Margen %
            {
                title: 'Margen %',
                key: 'margen',
                width: 90,
                align: 'right',
                onCell: () => ({ style: { verticalAlign: 'top' } }),
                render: (_, record) => (_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, precision: 2, controls: false, defaultValue: record.margen ?? 0, onChange: (val) => { editValuesRef.current[`${record.codigo}_margen`] = val ?? 0; }, onBlur: () => {
                        const val = editValuesRef.current[`${record.codigo}_margen`] ?? record.margen ?? 0;
                        handleCeldaCommit(record.codigo, 'margen', val);
                    }, onPressEnter: () => {
                        const val = editValuesRef.current[`${record.codigo}_margen`] ?? record.margen ?? 0;
                        handleCeldaCommit(record.codigo, 'margen', val);
                    } }, `${record.codigo}_margen_${loadVersion}`)),
                shouldCellUpdate: (record, prev) => record.margen !== prev.margen,
            },
            // P. Sugerido
            {
                title: 'Precio',
                key: 'precioSugerido',
                width: 80,
                align: 'right',
                onCell: () => ({ style: { verticalAlign: 'top' } }),
                render: (_, record) => (_jsx(Text, { style: { fontSize: 12 }, children: formatNumber(record.precioSugerido || 0) })),
            },
            // Grupos por sucursal
            sucursalGroup('OP'),
            sucursalGroup('HR'),
            sucursalGroup('VH'),
            // Grupo Totales
            {
                title: 'Totales',
                className: 'gorc-band-totales',
                children: [
                    {
                        title: 'SubTotal',
                        key: 'subTotal',
                        width: 90,
                        align: 'right',
                        onCell: () => ({ style: { verticalAlign: 'top' } }),
                        render: (_, record) => (_jsx(Text, { style: { fontSize: 12 }, children: formatNumber(record.subTotal || 0) })),
                    },
                    {
                        title: 'Descuento',
                        key: 'descuento',
                        width: 100,
                        align: 'right',
                        onCell: () => ({ style: { verticalAlign: 'top' } }),
                        render: (_, record) => modoDescuento === 'porcentaje' ? (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'stretch' }, children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, max: 100, precision: 2, controls: false, defaultValue: record.porcentajeDescuento ?? 0, onChange: (val) => { editValuesRef.current[`${record.codigo}_desc`] = val ?? 0; }, onBlur: () => {
                                                const val = editValuesRef.current[`${record.codigo}_desc`] ?? record.porcentajeDescuento ?? 0;
                                                handleCeldaCommit(record.codigo, 'porcentajeDescuento', val);
                                            }, onPressEnter: () => {
                                                const val = editValuesRef.current[`${record.codigo}_desc`] ?? record.porcentajeDescuento ?? 0;
                                                handleCeldaCommit(record.codigo, 'porcentajeDescuento', val);
                                            } }, `${record.codigo}_pct_${modoDescuento}`), _jsx("div", { onClick: () => setModoDescuento('pesos'), style: { cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, background: '#f5f5f5', border: '1px solid #d9d9d9', borderLeft: 'none', borderRadius: '0 6px 6px 0', fontSize: 12, color: '#8c8c8c', userSelect: 'none' }, children: "%" })] }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, textAlign: 'right' }, children: formatNumber(record.descuento || 0) })] })) : (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'stretch' }, children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, precision: 2, controls: false, defaultValue: record.descuento ?? 0, onChange: (val) => { editValuesRef.current[`${record.codigo}_desc_pesos`] = val ?? 0; }, onBlur: () => {
                                                const val = editValuesRef.current[`${record.codigo}_desc_pesos`] ?? record.descuento ?? 0;
                                                handleCeldaCommit(record.codigo, 'descuento', val);
                                            }, onPressEnter: () => {
                                                const val = editValuesRef.current[`${record.codigo}_desc_pesos`] ?? record.descuento ?? 0;
                                                handleCeldaCommit(record.codigo, 'descuento', val);
                                            } }, `${record.codigo}_pesos_${modoDescuento}`), _jsx("div", { onClick: () => setModoDescuento('porcentaje'), style: { cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, background: '#f5f5f5', border: '1px solid #d9d9d9', borderLeft: 'none', borderRadius: '0 6px 6px 0', fontSize: 12, color: '#8c8c8c', userSelect: 'none' }, children: "$" })] }), _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, textAlign: 'right' }, children: [(record.porcentajeDescuento || 0).toFixed(2), "%"] })] })),
                    },
                    {
                        title: 'Impuesto',
                        key: 'impuestos',
                        width: 100,
                        align: 'right',
                        onCell: () => ({ style: { verticalAlign: 'top' } }),
                        render: (_, record) => (_jsxs("div", { style: { textAlign: 'right' }, children: [_jsx(Text, { style: { fontSize: 12 }, children: formatNumber(record.impuestos || 0) }), record.impuesto?.nombre && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 10, lineHeight: '16px' }, children: record.impuesto.nombre }))] })),
                    },
                    {
                        title: 'Total',
                        key: 'total',
                        width: 110,
                        align: 'right',
                        onCell: () => ({ style: { verticalAlign: 'top' } }),
                        render: (_, record) => (_jsx(Text, { strong: true, style: { fontSize: 12, color: 'var(--paces-primary)' }, children: formatNumber(record.total || 0) })),
                    },
                ],
            },
            // Columna acciones (fija derecha)
            {
                title: '',
                key: 'acciones',
                width: 44,
                fixed: 'right',
                render: (_, record) => (_jsx(Dropdown, { menu: {
                        items: [
                            {
                                key: 'eliminar',
                                label: 'Eliminar',
                                icon: _jsx(DeleteOutlined, {}),
                                danger: true,
                                onClick: () => handleEliminarDetalle(record.codigo),
                            },
                        ],
                    }, trigger: ['click'], children: _jsx(Button, { type: "text", size: "small", icon: _jsx(MoreOutlined, {}) }) })),
            },
        ];
    }, [loadVersion, handleCeldaCommit, handleEliminarDetalle, modoDescuento, selectionMode, selectedRowKeys]);
    // ===== Skeleton loading =====
    if (loading) {
        return (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }, children: [_jsx(Skeleton.Button, { active: true, style: { width: 100 } }), _jsx(Skeleton.Button, { active: true, style: { width: 90 } })] }), _jsx(Row, { gutter: 16, children: _jsxs(Col, { xxl: 24, children: [_jsx(Card, { className: "paces-card", size: "small", style: { marginBottom: 16 }, children: _jsx(Skeleton, { active: true, paragraph: { rows: 2 } }) }), _jsx(Card, { className: "paces-card", size: "small", children: _jsx(Skeleton, { active: true, paragraph: { rows: 6 } }) })] }) })] }));
    }
    // ===== Estado =====
    const estado = data?.estado ?? 0;
    const estadoInfo = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Borrador', color: 'default' };
    // ===== Toolbar =====
    // ===== Encabezado =====
    const renderEncabezado = () => (_jsx(Card, { className: "paces-card", size: "small", title: "Datos Generales", extra: _jsx(EstadoTag, { estado: estado, periodo: data?.periodo }), style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: 16, children: [_jsx(Col, { xs: 24, xxl: 18, children: _jsx(Form, { form: form, layout: "vertical", size: "middle", children: _jsxs(Row, { gutter: [16, 16], children: [_jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "fecha", rules: [{ required: true, message: 'Campo requerido' }], children: _jsx(FloatingField, { label: "Fecha", required: true, children: _jsx(DatePicker, { format: "YYYY-MM-DD", style: { width: '100%' }, disabledDate: (current) => {
                                                    if (!current)
                                                        return false;
                                                    if (fechaCierreContable && current.isBefore(fechaCierreContable, 'day'))
                                                        return true;
                                                    if (current.isAfter(dayjs().add(1, 'day'), 'day'))
                                                        return true;
                                                    return false;
                                                } }) }) }) }), _jsxs(Col, { xs: 24, sm: 12, lg: 16, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 0 }, children: [_jsx("div", { style: { flex: 1 }, children: _jsx(FloatingField, { label: "Suplidor", required: true, externalValue: suplidorSearchText, children: _jsx(Input, { placeholder: " ", value: suplidorSearchText, readOnly: true }) }) }), _jsx(Button, { icon: _jsx(SearchOutlined, {}), onClick: () => setSuplidorModalOpen(true) })] }), _jsx(Form.Item, { name: "suplidorCodigo", hidden: true, children: _jsx(Input, {}) })] }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { style: { marginBottom: 0 }, children: _jsx(Checkbox, { checked: redondeoComercial, onChange: (e) => setRedondeoComercial(e.target.checked), children: "Redondeo Comercial" }) }) })] }) }) }), _jsx(Col, { xs: 24, xxl: 6, children: _jsx(TotalesCard, { subTotal: totalesGenerales.subTotal, descuento: totalesGenerales.descuento, impuestos: totalesGenerales.impuestos, total: totalesGenerales.total, hideTitle: true }) })] }) }));
    // ===== Tabla de detalles =====
    const renderDetalles = () => (_jsxs(Card, { className: "paces-card", size: "small", title: `Productos (${detalles.length})`, style: { marginBottom: 24 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }, children: [_jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: handleAgregarProducto, size: "small", children: "Agregar producto" }), selectedSuplidor && (_jsx(Button, { icon: _jsx(DownloadOutlined, {}), onClick: () => setModosCargaModalOpen(true), loading: cargandoMaestro, size: "small", children: "Cargar Maestro / Plantilla" })), selectedSuplidor && (_jsx(Input, { ref: codigoInputRef, placeholder: "C\u00F3digo + Enter", style: { width: 180, marginLeft: 'auto' }, value: codigoInput, onChange: (e) => setCodigoInput(e.target.value), onPressEnter: handleCodigoEnter, disabled: !selectedSuplidor, size: "small" })), selectionMode && selectedRowKeys.length > 0 && (_jsxs(Button, { danger: true, icon: _jsx(DeleteOutlined, {}), size: "small", onClick: () => {
                            Modal.confirm({
                                title: `¿Eliminar ${selectedRowKeys.length} producto(s)?`,
                                icon: _jsx(ExclamationCircleOutlined, {}),
                                content: 'Los productos seleccionados serán eliminados de la tabla.',
                                okText: 'Sí, eliminar',
                                okButtonProps: { danger: true },
                                cancelText: 'Cancelar',
                                onOk: () => {
                                    setDetalles((prev) => prev.filter((d) => !selectedRowKeys.includes(d.codigo)));
                                    setSelectedRowKeys([]);
                                    setSelectionMode(false);
                                },
                            });
                        }, children: ["Eliminar seleccionados (", selectedRowKeys.length, ")"] })), _jsx("div", { style: { flex: 1 } }), _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { maxWidth: 250 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                            setDetalleSearch(''); } })] }), detalles.length > 0 ? (_jsx("div", { className: "gorc-table", children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: "codigo", size: "small", pagination: false, scroll: { x: 1920, y: 'calc(100vh - 480px)' }, rowClassName: (_record, index) => index === activeRowIndex ? 'gorc-row-active' : '', onRow: (record, index) => ({
                        onClick: () => {
                            setActiveRowIndex(index ?? 0);
                        },
                        onKeyDown: (e) => {
                            // No navegar si el foco está dentro de un InputNumber (input nativo)
                            if (e.target.tagName === 'INPUT')
                                return;
                            if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setActiveRowIndex((prev) => {
                                    if (prev === null || prev <= 0)
                                        return 0;
                                    return prev - 1;
                                });
                            }
                            else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setActiveRowIndex((prev) => {
                                    if (prev === null)
                                        return 0;
                                    const max = detallesFiltrados.length - 1;
                                    if (prev >= max)
                                        return max;
                                    return prev + 1;
                                });
                            }
                        },
                        tabIndex: 0,
                        style: { cursor: 'pointer' },
                    }), summary: () => {
                        const COLS_ANTES_TOTALES = 8; // articulo(0) + medida(1) + costo(2) + margen(3) + p.sugerido(4) + OP(5) + HR(6) + VH(7)
                        return (_jsx(Table.Summary, { fixed: "bottom", children: _jsxs(Table.Summary.Row, { style: { fontWeight: 600, backgroundColor: '#fafafa' }, children: [_jsx(Table.Summary.Cell, { index: 0, colSpan: COLS_ANTES_TOTALES, children: _jsx(Text, { strong: true, style: { paddingLeft: 8 }, children: "Totales" }) }), _jsx(Table.Summary.Cell, { index: COLS_ANTES_TOTALES, align: "right", children: _jsx(Text, { strong: true, children: formatNumber(totalesGenerales.subTotal) }) }), _jsx(Table.Summary.Cell, { index: COLS_ANTES_TOTALES + 1, align: "right", children: _jsx(Text, { children: formatNumber(totalesGenerales.descuento) }) }), _jsx(Table.Summary.Cell, { index: COLS_ANTES_TOTALES + 2, align: "right", children: _jsx(Text, { children: formatNumber(totalesGenerales.impuestos) }) }), _jsx(Table.Summary.Cell, { index: COLS_ANTES_TOTALES + 3, align: "right", children: _jsx(Text, { strong: true, style: { color: 'var(--paces-primary)', fontSize: 13 }, children: formatNumber(totalesGenerales.total) }) }), _jsx(Table.Summary.Cell, { index: COLS_ANTES_TOTALES + 4 })] }) }));
                    } }) })) : (_jsxs("div", { style: { textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }, children: [_jsx(ShoppingCartOutlined, { style: { fontSize: 48, color: '#d9d9d9' } }), _jsx("div", { style: { fontSize: 15, fontWeight: 500, color: '#595959' }, children: "No hay productos en este generador" }), selectedSuplidor ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 13 }, children: "Usa \"Cargar Maestro/Plantilla\" para cargar productos del suplidor, o \"Agregar producto\" para a\u00F1adir uno a uno." }), _jsxs(Space, { children: [_jsx(Button, { type: "primary", icon: _jsx(DownloadOutlined, {}), onClick: () => setModosCargaModalOpen(true), children: "Cargar Maestro / Plantilla" }), _jsx(Input, { ref: codigoInputRef, placeholder: "C\u00F3digo + Enter", style: { width: 180 }, value: codigoInput, onChange: (e) => setCodigoInput(e.target.value), onPressEnter: handleCodigoEnter, size: "small" }), _jsx(Button, { icon: _jsx(PlusOutlined, {}), onClick: () => setProductoModalOpen(true), children: "Agregar producto" })] })] })) : (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 13 }, children: "Primero selecciona un suplidor para cargar productos." }))] })), detalles.length > 0 && detalles.some((d) => d.costo === 0) && (_jsx(Alert, { message: `${detalles.filter((d) => d.costo === 0).length} productos sin costo anterior`, description: "Estos productos no tienen historial de compra con este suplidor. Ingrese el costo manualmente.", type: "warning", showIcon: true, closable: true, style: { marginTop: 12 } }))] }));
    // ===== Render principal =====
    return (_jsxs("div", { children: [_jsx(FormularioToolbar, { saving: saving, estado: estado, onGuardar: handleGuardar, onCancelar: handleCancelar }), loadingError && (_jsx(Alert, { message: "Error al cargar el documento", description: "No se pudo obtener la informaci\u00F3n del generador. Verifique su conexi\u00F3n e intente nuevamente.", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), renderEncabezado(), isLarge ? (_jsx(Row, { gutter: 16, children: _jsx(Col, { xxl: 24, children: renderDetalles() }) })) : (_jsx("div", { children: renderDetalles() })), _jsx(ModalBuscarSuplidor, { open: suplidorModalOpen, onClose: () => setSuplidorModalOpen(false), onSelect: (record) => {
                    const suplidor = {
                        idExterno: record.idExterno || record.codigo || '',
                        codigo: record.codigo || '',
                        nombre: record.nombre || '',
                        diasCredito: record.diasCredito || 0,
                        rnc: record.identificacion || '',
                        identificacion: record.identificacion || '',
                        telefono: record.telefono || '',
                        direccion: record.direccion || '',
                    };
                    handleSuplidorSelect(suplidor);
                }, buscar: async (filtro) => {
                    const { proveedorApi } = await import('../../api/proveedorApi');
                    return proveedorApi.filtrar(sucursalActiva, filtro || undefined, filtro || undefined);
                }, autoFocus: true, mostrarRnc: true }), _jsx(AgregarProductoGORCModal, { open: productoModalOpen, onClose: () => { setProductoModalOpen(false); setSuplidorProductos([]); }, onSelectProducto: (producto) => {
                    handleProductoSeleccionado(producto);
                    setProductoModalOpen(false);
                    setSuplidorProductos([]);
                }, onSelectConteos: (productos) => {
                    const filas = productos.map((p) => {
                        const yaExiste = detalles.some((d) => d.codigo === p.codigo);
                        if (yaExiste)
                            return null;
                        return {
                            codigo: p.codigo,
                            referencia: p.referencia || '',
                            producto: p.articulo || '',
                            medida: p._medida || p.medida || normalizarMedida(unidadBase),
                            impuesto: p._impuesto || p.impuesto || null,
                            cantidades: { OP: 0, HR: 0, VH: 0 },
                            cantidadesBonificadas: { OP: 0, HR: 0, VH: 0 },
                            existencias: { OP: 0, HR: 0, VH: 0 },
                            existenciasFisicas: { OP: 0, HR: 0, VH: 0 },
                            costo: p._costo || p.costo || 0,
                            ultimaCompraFecha: p._ultimaCompraFecha || undefined,
                            margen: p._margen || 0,
                            precioSugerido: p._precioSugerido || p.precio || 0,
                            subTotal: 0,
                            porcentajeDescuento: p._porcentajeDescuento || 0,
                            descuento: 0,
                            impuestos: 0,
                            total: 0,
                        };
                    }).filter(Boolean);
                    setDetalles((prev) => [...prev, ...filas.map((f) => calcularFilaGORC(f))]);
                    setLoadVersion((v) => v + 1);
                    message.success(`${filas.length} productos agregados`);
                    setProductoModalOpen(false);
                    setSuplidorProductos([]);
                }, suplidorProductos: suplidorProductos }), _jsx(ModosCargaModal, { open: modosCargaModalOpen, onClose: () => setModosCargaModalOpen(false), onSeleccionarMaestro: handleCargarMaestro, onSeleccionarPlantilla: handleCargarPlantilla }), _jsx(BuscarPlantillaGORCModal, { open: plantillaModalOpen, onClose: () => setPlantillaModalOpen(false), onSelect: handlePlantillaSeleccionada, codigoSuplidor: selectedSuplidor?.codigo || '' }), _jsx(SeleccionarConteosModal, { open: seleccionarConteosOpen, onClose: () => setSeleccionarConteosOpen(false), conteos: conteosPlantilla, onConfirm: (keys) => {
                    setSeleccionarConteosOpen(false);
                    handleConteosSeleccionados(keys);
                } }), _jsx(Drawer, { title: _jsxs(Space, { children: [_jsx(BarChartOutlined, { style: { color: 'var(--paces-primary)' } }), _jsx("span", { style: { fontWeight: 600 }, children: "An\u00E1lisis de Producto" })] }), placement: "right", width: 520, open: analisisOpen, onClose: () => setAnalisisOpen(false), children: analisisDetalle && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 0 }, children: [_jsxs(Space, { align: "start", size: 12, style: { marginBottom: 16, width: '100%' }, children: [_jsx(Avatar, { size: 40, style: { backgroundColor: 'rgba(85,110,230,0.12)', color: 'var(--paces-primary)', fontWeight: 600, flexShrink: 0 }, children: (analisisDetalle?.producto || '?')[0].toUpperCase() }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx(Typography.Title, { level: 5, style: { margin: 0 }, children: toTitleCase(analisisDetalle?.producto || '') }), _jsxs(Typography.Text, { className: "paces-text-secondary", style: { fontSize: 12 }, children: ["C\u00F3digo: ", analisisDetalle?.codigo, analisisDetalle?.referencia ? _jsxs("span", { children: [" \u00B7 Ref: ", analisisDetalle.referencia] }) : '', analisisDetalle?.medida?.nombre ? _jsxs("span", { children: [" \u00B7 Medida: ", analisisDetalle.medida.nombre] }) : ''] })] })] }), _jsx(Divider, { style: { margin: '0 0 16px 0' } }), analisisError ? (_jsx(Alert, { type: "error", message: "Error al cargar datos", style: { marginBottom: 16 }, action: _jsxs(Button, { size: "small", onClick: () => { setAnalisisOpen(false); setTimeout(() => setAnalisisOpen(true), 100); }, children: [_jsx(ReloadOutlined, {}), "Reintentar"] }) })) : analisisLoading ? (_jsx(Skeleton, { active: true, paragraph: { rows: 3 }, style: { marginBottom: 16 } })) : analisisData.length > 0 ? (_jsxs(_Fragment, { children: [analisisData.some((d) => d.resumen) && (_jsxs(Card, { className: "paces-card", size: "small", style: {
                                        borderRadius: 6,
                                        border: '1px solid #d9d9d9',
                                        borderTop: '3px solid #556ee6',
                                        background: 'rgba(85,110,230,0.04)',
                                        marginBottom: 12,
                                    }, children: [_jsx(Typography.Text, { strong: true, style: { fontSize: 12, color: '#556ee6', display: 'block', marginBottom: 6 }, children: "\uD83D\uDCCA Resumen total" }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }, children: (() => {
                                                const totales = analisisData.reduce((acc, item) => {
                                                    const r = item.resumen;
                                                    if (!r)
                                                        return acc;
                                                    return {
                                                        ventasSinComponentes: acc.ventasSinComponentes + (r.ventasSinComponentes || 0),
                                                        ventasConComponentes: acc.ventasConComponentes + (r.ventasConComponentes || 0),
                                                        salidas: acc.salidas + (r.salidas || 0),
                                                        devCompra: acc.devCompra + (r.devolucionesCompra || 0),
                                                        devVenta: acc.devVenta + (r.devolucionesVenta || 0),
                                                    };
                                                }, { ventasSinComponentes: 0, ventasConComponentes: 0, salidas: 0, devCompra: 0, devVenta: 0 });
                                                return [
                                                    { label: 'Ventas (sin comp.)', value: totales.ventasSinComponentes },
                                                    { label: 'Ventas (con comp.)', value: totales.ventasConComponentes },
                                                    { label: 'Salidas', value: totales.salidas },
                                                    { label: 'Dev. Compra', value: totales.devCompra },
                                                    { label: 'Dev. Venta', value: totales.devVenta },
                                                ].map((kpi) => (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }, children: [_jsx(Typography.Text, { style: { fontSize: 12, color: '#8c8c8c' }, children: kpi.label }), _jsx(Typography.Text, { strong: true, style: { fontSize: 14, color: '#556ee6' }, children: formatNumber(kpi.value) })] }, kpi.label)));
                                            })() })] })), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: analisisData.map((item) => {
                                        const SUCURSAL_COLORS = {
                                            0: { color: '#1677ff', bg: 'rgba(22,119,255,0.06)' },
                                            1: { color: '#52c41a', bg: 'rgba(82,196,26,0.06)' },
                                            2: { color: '#fa8c16', bg: 'rgba(250,140,22,0.06)' },
                                        };
                                        const style = SUCURSAL_COLORS[item.sucursal] || { color: '#556ee6', bg: 'rgba(85,110,230,0.06)' };
                                        const sinRegistro = !item.fecha;
                                        return (_jsxs(Card, { className: "paces-card", size: "small", style: {
                                                borderRadius: 6,
                                                border: '1px solid #f0f0f0',
                                                borderTop: `3px solid ${style.color}`,
                                                background: style.bg,
                                            }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }, children: [_jsxs(Space, { children: [_jsx(ShopOutlined, { style: { color: style.color, fontSize: 15 } }), _jsx(Typography.Text, { strong: true, style: { fontSize: 13, color: style.color }, children: item.sucursalNombre }), sinRegistro && _jsx(Tag, { color: "default", style: { margin: 0, fontSize: 10 }, children: "Sin compras" })] }), !sinRegistro && (_jsx(Button, { type: "link", size: "small", icon: _jsx(EyeOutlined, {}), onClick: () => handleVerMovimientos(item), style: { fontSize: 12 }, children: "Ver movimientos \u2192" }))] }), !sinRegistro ? (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 10 }, children: [_jsxs(Typography.Text, { strong: true, style: { fontSize: 12, color: '#262626', display: 'block', marginBottom: 6 }, children: ["\uD83D\uDCE6 \u00DAltima compra  ", _jsx(Typography.Text, { strong: true, style: { fontSize: 13, color: '#556ee6' }, children: item.fecha ? formatDate(item.fecha) : '-' })] }), _jsxs("div", { style: { marginTop: 8 }, children: [_jsx(Typography.Text, { style: { fontSize: 12, color: '#8c8c8c', marginRight: 8 }, children: item.documento }), _jsx(Tag, { color: "blue", style: { fontSize: 11 }, children: formatNumber(item.cantidad) })] })] }), _jsx("div", { style: { borderTop: '1px dashed #e8e8e8', marginBottom: 10 } }), _jsxs("div", { style: { marginBottom: 10 }, children: [_jsx(Typography.Text, { strong: true, style: { fontSize: 12, color: '#262626', display: 'block', marginBottom: 6 }, children: "\uD83D\uDCCA Movimientos posteriores" }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', marginBottom: 6 }, children: [
                                                                        { label: 'Ventas (sin comp.)', value: item.resumen?.ventasSinComponentes },
                                                                        { label: 'Ventas (con comp.)', value: item.resumen?.ventasConComponentes },
                                                                        { label: 'Salidas', value: item.resumen?.salidas },
                                                                        { label: 'Dev. Compra', value: item.resumen?.devolucionesCompra },
                                                                        { label: 'Dev. Venta', value: item.resumen?.devolucionesVenta },
                                                                    ].map((kpi) => (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }, children: [_jsx(Typography.Text, { style: { fontSize: 12, color: '#8c8c8c' }, children: kpi.label }), kpi.value !== undefined ? (_jsx(Typography.Text, { strong: true, style: { fontSize: 14, color: style.color }, children: formatNumber(kpi.value) })) : analisisResumenLoading ? (_jsx(Skeleton.Input, { active: true, size: "small", style: { width: 30, height: 16 } })) : (_jsx(Typography.Text, { style: { fontSize: 13 }, children: "0" }))] }, kpi.label))) }), item.resumen?.ultimaVentaFecha && (_jsxs("div", { style: { background: 'rgba(85,110,230,0.04)', borderRadius: 4, padding: '6px 8px', marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs(Typography.Text, { style: { fontSize: 11, color: '#595959' }, children: ["\uD83D\uDD50 \u00DAltima venta: ", formatDate(item.resumen.ultimaVentaFecha)] }), _jsx(Typography.Text, { style: { fontSize: 11, color: '#8c8c8c', fontStyle: 'italic' }, children: (() => {
                                                                                const diffDias = dayjs(item.resumen.ultimaVentaFecha).diff(dayjs(item.fecha), 'day');
                                                                                if (diffDias === 0)
                                                                                    return 'hoy';
                                                                                if (diffDias === 1)
                                                                                    return 'hace 1 día';
                                                                                if (diffDias < 30)
                                                                                    return `hace ${diffDias} días`;
                                                                                const diffMeses = Math.floor(diffDias / 30);
                                                                                if (diffMeses === 1)
                                                                                    return 'hace 1 mes';
                                                                                if (diffMeses < 12)
                                                                                    return `hace ${diffMeses} meses`;
                                                                                const diffAnios = Math.floor(diffDias / 365);
                                                                                if (diffAnios === 1)
                                                                                    return 'hace 1 año';
                                                                                return `hace ${diffAnios} años`;
                                                                            })() })] }))] })] })) : (_jsx(Typography.Text, { className: "paces-text-secondary", style: { fontSize: 12, fontStyle: 'italic' }, children: "No hay registros de compra para esta sucursal." }))] }, item.sucursal));
                                    }) })] })) : (_jsx(Alert, { type: "info", message: "No se encontraron entradas para este producto", style: { marginBottom: 16 } })), _jsx(Divider, { orientation: "left", style: { fontSize: 12, color: '#8c8c8c' }, children: "Costos y Precio" }), _jsx("div", { style: { background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0', padding: '12px 0', marginBottom: 16 }, children: _jsxs(Row, { gutter: 0, children: [_jsxs(Col, { span: 8, style: { borderRight: '1px solid #f0f0f0', textAlign: 'center' }, children: [_jsx(Typography.Text, { className: "paces-text-secondary", style: { fontSize: 11, display: 'block' }, children: "Costo" }), _jsx(Typography.Text, { strong: true, style: { fontSize: 16, color: 'var(--paces-primary)' }, children: formatNumber(analisisDetalle?.costo || 0) })] }), _jsxs(Col, { span: 8, style: { borderRight: '1px solid #f0f0f0', textAlign: 'center' }, children: [_jsx(Typography.Text, { className: "paces-text-secondary", style: { fontSize: 11, display: 'block' }, children: "Margen %" }), _jsxs(Typography.Text, { strong: true, style: { fontSize: 16, color: (analisisDetalle?.margen || 0) > 0 ? '#34c38f' : '#ff4d4f' }, children: [(analisisDetalle?.margen || 0).toFixed(2), "%"] })] }), _jsxs(Col, { span: 8, style: { textAlign: 'center' }, children: [_jsx(Typography.Text, { className: "paces-text-secondary", style: { fontSize: 11, display: 'block' }, children: "Precio" }), _jsx(Typography.Text, { strong: true, style: { fontSize: 16 }, children: formatNumber(analisisDetalle?.precioSugerido || 0) })] })] }) })] })) }), _jsx(ModalMovimientosPosteriores, { open: movimientosModalOpen, sucursal: movimientosSucursal, codigo: analisisDetalle?.codigo || '', dataSource: movimientosData, loading: movimientosLoading, onClose: () => setMovimientosModalOpen(false) })] }));
};
export default GeneradorORCFormulario;
