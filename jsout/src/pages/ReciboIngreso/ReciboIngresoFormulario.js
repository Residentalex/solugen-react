import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Alert, Popover, Empty, } from 'antd';
import { SaveOutlined, CloseOutlined, ExclamationCircleOutlined, SearchOutlined, ClearOutlined, EditOutlined, PlusOutlined, DeleteOutlined, } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { reciboIngresoApi } from '../../api/reciboIngresoApi';
import { conceptosApi } from '../../api/conceptosApi';
import { tipoApi } from '../../api/tipoApi';
import { clienteApi } from '../../api/clienteApi';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import { OrigenCuenta } from '../../types/contabilidad';
import LogTable from '../../components/LogTable';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import BuscarDocumentoModal from '../../components/BuscarDocumentoModal/BuscarDocumentoModal';
import BuscarEntidadSelect from '../../components/BuscarEntidadSelect/BuscarEntidadSelect';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import GuidePopover from '../../components/GuidePopover/GuidePopover';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum } from '../../utils/estadoDocumento';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
const { Text } = Typography;
const { TextArea } = Input;
const MEDIO_COBRO_LABELS = {
    Efectivo: 'Efectivo',
    Cheque: 'Cheque',
    Transferencia: 'Transferencia',
    TarjetaCredito: 'Tarjeta Crédito',
    TarjetaDebito: 'Tarjeta Débito',
    Bono: 'Bono',
    TarjetaRegalo: 'Tarjeta Regalo',
    NotaCredito: 'Nota Crédito',
};
// ===== Mapa de rutas para documentos relacionados (Task 2) =====
const MAPA_RUTAS_DOC = {
    ND: '/FND',
    FAC: '/FFAC',
    NC: '/FNC',
    RI: '/FRI',
    NDD: '/FNDD',
    NDN: '/FNDN',
    NCN: '/FNCN',
};
function getRutaDocumento(record) {
    const tipoDoc = record?.tipoDocumento;
    if (!tipoDoc)
        return null;
    const codigo = typeof tipoDoc === 'number' ? (['AID', 'AIC', 'ABN', 'AJA', 'CBI', 'CDC', 'CHK', 'CHN', 'CIE', 'CIT', 'CKO', 'CPF', 'CTT', 'DBA', 'DBI', 'DCA', 'DCN', 'DEC', 'DEP', 'DEV', 'DGA', 'DPN', 'DPR', 'DVC', 'DVN', 'ED', 'EDI', 'EDN', 'EIN', 'ENP', 'EPJ', 'EPN', 'ER', 'EXP', 'FAC', 'FAN', 'LAC', 'NBN', 'NC', 'NCB', 'NCN', 'ND', 'NDB', 'NDD', 'NDN', 'NDV', 'NOM', 'ORC', 'ORT', 'PAG', 'PRES', 'PV', 'PVC', 'PVN', 'PVS', 'PVT', 'RAC', 'RBN', 'RCM', 'RDE', 'RDN', 'REA', 'REQ', 'RES', 'RETA', 'RI', 'RIN', 'RSV', 'RTB', 'RUA', 'SAP', 'SCO', 'SDD', 'SPA', 'SPJ', 'SPN', 'SPT', 'TBN', 'TID', 'TRB', 'TRP', 'TUR', 'UBD', 'VD', 'DBN', 'PVComponente', 'Existencia'][tipoDoc] || '') : tipoDoc;
    const rutaBase = MAPA_RUTAS_DOC[codigo];
    if (!rutaBase)
        return null;
    const docId = record.id || record.transaccionAsociadaID;
    if (!docId)
        return null;
    return `${rutaBase}/${docId}`;
}
// ===== Helpers para tipo de asiento =====
function esDebito(tipo) { return tipo === 'D' || tipo === 0; }
function esCredito(tipo) { return tipo === 'C' || tipo === 1; }
// ===== Factory para Cobros =====
function crearCobrosIniciales() {
    const medios = [
        { medioCobro: 'Efectivo', editable: true },
        { medioCobro: 'Cheque', editable: true },
        { medioCobro: 'Transferencia', editable: true },
        { medioCobro: 'TarjetaCredito', editable: true },
        { medioCobro: 'TarjetaDebito', editable: true },
        { medioCobro: 'Bono', editable: false },
        { medioCobro: 'TarjetaRegalo', editable: false },
        { medioCobro: 'NotaCredito', editable: false },
    ];
    return medios.map((m, i) => ({
        id: -(i + 1),
        medioCobro: m.medioCobro,
        monto: 0,
        editable: m.editable,
    }));
}
// ===== Componente principal =====
const ReciboIngresoFormulario = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const screens = Grid.useBreakpoint();
    const mode = id ? 'editar' : 'crear';
    const { screenCode, documentCode } = useScreenConfig('FRI');
    // ===== States =====
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState(null);
    const [tiposCache, setTiposCache] = useState([]);
    const [entidadesCache, setEntidadesCache] = useState([]);
    const [selectedTipo, setSelectedTipo] = useState(null);
    const [selectedConcepto, setSelectedConcepto] = useState(null);
    const [selectedEntidad, setSelectedEntidad] = useState(null);
    const [transaccionesAsociadas, setTransaccionesAsociadas] = useState([]);
    const [cobros, setCobros] = useState(crearCobrosIniciales());
    const [asientos, setAsientos] = useState([]);
    const [logs, setLogs] = useState([]);
    const [medidasCache, setMedidasCache] = useState([]);
    const [sucursalesCache, setSucursalesCache] = useState([]);
    const [selectedSucursal, setSelectedSucursal] = useState(null);
    // Concepto modal
    const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
    const [conceptoSearchText, setConceptoSearchText] = useState('');
    // Documento relacionado modal
    const [documentoModalOpen, setDocumentoModalOpen] = useState(false);
    const impuestosBackupRef = useRef(new Map());
    // Quick fields
    const [editingField, setEditingField] = useState(null);
    const editingOriginalValue = useRef('');
    const editingValueRef = useRef('');
    const fieldCloseHandledRef = useRef(false);
    // Refs para la guía paso a paso
    const tipoRef = useRef(null);
    const conceptoRef = useRef(null);
    const entidadRef = useRef(null);
    const totalRef = useRef(null);
    const documentosRef = useRef(null);
    const sucursalRef = useRef(null);
    const [form] = Form.useForm();
    // Watchers
    const ncfValue = Form.useWatch('ncf', form) || '';
    const refValue = Form.useWatch('referencia', form) || '';
    const tasaValue = Form.useWatch('tasa', form) ?? 1;
    const totalValue = Form.useWatch('total', form) ?? 0;
    const sinOC = true;
    const isLarge = screens.xxl === true;
    const usuario = useAuthStore((s) => s.usuario);
    const permisoModificarAsientos = usuario?.permisosEspeciales?.some((p) => p.codigo === 'pe_modificar_asientos' && p.valor === true) ?? false;
    // Estado
    const estado = data?.estado ?? 0;
    const esCerrado = data?.periodo === 6;
    const esBorrador = estado === 0;
    const esAplicado = estado === 1;
    const esAnulado = estado === 3;
    // ===== Quick field editors =====
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
            // RI13 - Si se cambió la tasa, preguntar si actualizar montos
            if (field === 'tasa' && oldValue !== newValue) {
                Modal.confirm({
                    title: 'Actualizar montos',
                    icon: _jsx(ExclamationCircleOutlined, {}),
                    content: '¿Desea actualizar los montos en base a la nueva tasa?',
                    okText: 'Sí',
                    cancelText: 'No',
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
    // ===== Cargar catálogos al montar =====
    useEffect(() => {
        setActiveModule(screenCode);
        const pageTitle = mode === 'crear'
            ? 'Nuevo Recibo de Ingreso'
            : 'Editar Recibo de Ingreso';
        setPageTitleOverride(pageTitle);
        // Cargar tipos para RI
        tipoApi.obtenerPorDocumento(sucursalActiva, 'RI')
            .then((tipos) => setTiposCache(tipos))
            .catch((err) => console.warn('Error al cargar tipos cache', err));
        unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch((err) => console.warn('Error al cargar medidas cache', err));
        // Cargar sucursales desde la API
        conceptosApi.obtenerSucursales(sucursalActiva).then(setSucursalesCache).catch((err) => console.warn('Error al cargar sucursales cache', err));
        if (mode === 'crear') {
            form.setFieldsValue({
                fechaDocumento: dayjs(),
                tasa: 1,
                total: 0,
            });
            setCobros(crearCobrosIniciales());
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
    // ===== Cargar datos en modo editar =====
    useEffect(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoading(true);
        reciboIngresoApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            setData(res);
            setTransaccionesAsociadas(res.transaccionesAsociadas || []);
            setAsientos(res.asientos || []);
            setLogs(res.logs || []);
            // Inicializar cobros desde respuesta o valores por defecto
            if (res.cobros && res.cobros.length > 0) {
                setCobros(res.cobros);
            }
            else {
                setCobros(crearCobrosIniciales());
            }
            setSelectedConcepto(res.concepto || null);
            setSelectedEntidad(res.entidad || null);
            // Restaurar sucursal
            if (res.sucursal) {
                setSelectedSucursal(res.sucursal);
            }
            // Obtener tipo desde res si existe
            if (res.tipo) {
                setSelectedTipo(res.tipo);
            }
            else if (res.codigoTipo) {
                const encontrado = tiposCache.find(t => t.codigo === res.codigoTipo);
                if (encontrado)
                    setSelectedTipo(encontrado);
            }
            const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
            form.setFieldsValue({
                tipo: res.tipo?.codigo || res.codigoTipo || '',
                concepto: res.concepto?.codigo || '',
                entidad: res.entidad?.codigo || res.codigoEntidad || '',
                fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                ncf: res.ncf || '',
                referencia: res.referencia || '',
                tasa: res.tasa || 1,
                nota: res.nota || '',
                total: res.total || 0,
            });
            // Cargar entidades según el concepto
            if (res.concepto?.codigo) {
                cargarEntidades(res.concepto.codigo);
            }
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
            message.error(msg);
            setLoadingError(true);
            navigate('/FRI', { replace: true });
        })
            .finally(() => setLoading(false));
    }, [mode, id, sucursalActiva, form, navigate]);
    // ===== Cargar entidades (clientes o suplidores) =====
    const cargarEntidades = async (conceptoCodigo) => {
        try {
            const res = await conceptosApi.obtenerEntidadesActivas(sucursalActiva, conceptoCodigo || selectedConcepto?.codigo);
            setEntidadesCache((Array.isArray(res) ? res : []).filter((e) => e.activo !== false));
        }
        catch {
            // Fallback: cargar clientes
            try {
                const clientes = await clienteApi.obtenerActivos(sucursalActiva);
                setEntidadesCache(Array.isArray(clientes) ? clientes : []);
            }
            catch {
                message.error('Error al cargar entidades');
            }
        }
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
                    navigate('/FRI', { replace: true });
                }
                else if (id) {
                    navigate(`/FRI/${id}`, { replace: true });
                }
            },
        });
    };
    // ===== Validación =====
    const validarFormulario = () => {
        const values = form.getFieldsValue();
        if (!selectedConcepto)
            return 'Debe elegir un Concepto';
        if (!selectedEntidad && !values.entidad)
            return 'Debe elegir una Entidad';
        const fechaDoc = values.fechaDocumento;
        if (fechaDoc) {
            const hoy = dayjs().endOf('day');
            if (dayjs(fechaDoc).isAfter(hoy)) {
                return 'La fecha del documento no puede ser mayor a hoy';
            }
        }
        // RI17 - Validar distribución vs total
        if (transaccionesAsociadas.length > 0) {
            const distribuido = transaccionesAsociadas.reduce((s, t) => s + (t.monto || 0), 0);
            if (distribuido - (values.total || 0) > 0.01) {
                return 'El monto distribuido en las facturas no puede ser mayor al total del documento.';
            }
        }
        // RI8 - Validar asientos cuadrados
        if (asientos.length > 0) {
            const totalDebitos = asientos.reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
            const totalCreditos = asientos.reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);
            if (Math.abs(totalDebitos - totalCreditos) > 0.01) {
                return 'Los asientos contables no están cuadrados. Los débitos deben ser igual a los créditos.';
            }
        }
        if (values.nota && values.nota.length > 500) {
            return 'La nota no puede exceder 500 caracteres';
        }
        return null;
    };
    // ===== Construir DTO =====
    const construirDTO = () => {
        const values = form.getFieldsValue();
        const base = data || {};
        const entidadSel = entidadesCache.find((e) => e.codigo === values.entidad) || selectedEntidad;
        const fechaDoc = values.fechaDocumento
            ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
                ? toISOFormat(values.fechaDocumento.toDate())
                : values.fechaDocumento)
            : toISOFormat(new Date());
        // Calcular retenciones e impuestos desde transacciones asociadas
        const retenciones = transaccionesAsociadas
            .reduce((s, t) => s + (t.retencion || 0), 0);
        const subTotal = (values.total || 0) - (base.impuestos || 0);
        // Asegurar documento con origenCuenta desde companyStore
        const { documentos } = useCompanyStore.getState().data;
        const docConfig = documentos.find((d) => d.codigo === documentCode);
        const docOrigenCuenta = base.documento?.origenCuenta ?? docConfig?.origenCuenta ?? OrigenCuenta.Desconocido;
        const documento = base.documento?.codigo
            ? { ...base.documento, origenCuenta: docOrigenCuenta }
            : { codigo: documentCode, origenCuenta: docOrigenCuenta };
        // Asegurar entidad con tipoEntidad
        const tipoEntidadStr = base.tipoEntidad || 'CLI';
        const entidadBase = entidadSel || { nombre: '', codigo: '', identificacion: '' };
        const entidad = {
            ...entidadBase,
            tipoEntidad: entidadBase.tipoEntidad ?? {
                codigo: tipoEntidadStr,
                origenCuenta: docOrigenCuenta,
            },
        };
        return {
            id: base.id || 0,
            fechaDocumento: fechaDoc,
            noDocumento: base.noDocumento || '',
            estado: base.estado || 0,
            periodo: base.periodo || new Date().getMonth() + 1,
            ncf: values.ncf || '',
            referencia: values.referencia || '',
            nota: values.nota || '',
            tasa: values.tasa || 1,
            total: values.total || 0,
            subTotal: Math.round(subTotal * 100) / 100,
            descuento: base.descuento || 0,
            impuestos: base.impuestos || 0,
            diasCredito: selectedEntidad?.diasCredito || 0,
            retenciones: Math.round(retenciones * 100) / 100,
            tipoDocumento: base.tipoDocumento ?? 66,
            tipoEntidad: base.tipoEntidad || selectedConcepto?.entidades?.[0]?.codigo || 'CLI',
            documento,
            concepto: selectedConcepto || { nombre: '', codigo: '' },
            codigoTipo: selectedTipo?.codigo || values.tipo || '',
            codigoEntidad: entidadSel?.codigo || selectedEntidad?.codigo || entidad.codigo || base.codigoEntidad || '',
            codigoConcepto: selectedConcepto?.codigo || base.codigoConcepto || '',
            codigoMoneda: (base.moneda || getMonedaSucursalActiva())?.codigo || base.codigoMoneda || '',
            codigoSucursal: selectedSucursal?.idExterno || selectedSucursal?.codigo || base.codigoSucursal || '',
            nombreEntidad: entidad.nombre || base.nombreEntidad || '',
            entidad,
            moneda: base.moneda || getMonedaSucursalActiva(),
            sucursal: selectedSucursal
                ? { codigo: selectedSucursal.codigo, idExterno: selectedSucursal.idExterno, nombre: selectedSucursal.nombre || '' }
                : base.sucursal || undefined,
            // Colecciones
            transaccionesAsociadas: transaccionesAsociadas.map((t) => ({
                ...t,
                transaccionAsociadaID: t.transaccionAsociadaID || t.id,
                saldoPendiente: pendienteEfectivo(t),
            })),
            cobros: cobros.map((c) => ({
                medioCobro: c.medioCobro,
                monto: c.monto || 0,
            })),
            asientos: asientos || [],
            logs: logs || [],
        };
    };
    // ===== Acciones =====
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
                const result = await reciboIngresoApi.crear(sucursalActiva, dto);
                message.success('Recibo de ingreso creado exitosamente');
                navigate(`/FRI/${result.id}`, { replace: true });
            }
            else {
                await reciboIngresoApi.actualizar(sucursalActiva, dto);
                message.success('Recibo de ingreso actualizado exitosamente');
                navigate(`/FRI/${id}`, { replace: true });
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
        setSaving(true);
        try {
            const dto = construirDTO();
            const asientosGenerados = await reciboIngresoApi.generarAsientos(sucursalActiva, dto);
            setAsientos(asientosGenerados);
            message.success(`Se generaron ${asientosGenerados.length} asientos`);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al generar asientos');
            message.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    // ===== Handlers de tipo =====
    const handleTipoChange = (val) => {
        const t = tiposCache.find((tc) => tc.codigo === val);
        setSelectedTipo(t || null);
        // Resetear concepto al cambiar tipo
        setSelectedConcepto(null);
        setConceptoSearchText('');
        setEntidadesCache([]);
        setSelectedEntidad(null);
        form.setFieldsValue({ concepto: '', entidad: undefined });
    };
    // ===== Handlers de concepto =====
    const handleConceptoSelect = (concepto) => {
        setSelectedConcepto(concepto);
        setEditingField(null);
        setConceptoSearchText('');
        // Cargar entidades según concepto
        cargarEntidades(concepto.codigo);
        // === ConfigurarMoneda (siempre desde concepto) ===
        const monedaObj = concepto.moneda || getMonedaSucursalActiva();
        // Actualizar data local para que la UI lo refleje
        setData((prev) => {
            if (!prev)
                return prev;
            return { ...prev, moneda: monedaObj };
        });
        form.setFieldsValue({
            concepto: concepto.codigo,
            moneda: monedaObj.nombre,
            tasa: monedaObj.tasa ?? 1,
        });
        // === NoImpuesto: si el concepto no acepta impuestos, mostrar advertencia ===
        if (concepto.noImpuesto) {
            const hayRetenciones = transaccionesAsociadas.some((t) => (t.retencion || 0) > 0);
            if (hayRetenciones) {
                message.warning('El Concepto no acepta Impuestos/Retenciones. Verifique las retenciones en documentos relacionados.');
            }
        }
    };
    const handleConceptoClear = () => {
        setSelectedConcepto(null);
        setConceptoSearchText('');
        setEntidadesCache([]);
        setSelectedEntidad(null);
        form.setFieldsValue({ concepto: '', entidad: undefined });
    };
    // ===== Handler para agregar documentos relacionados =====
    const handleAgregarDocumentos = (docs) => {
        setTransaccionesAsociadas((prev) => {
            const idsExistentes = new Set(prev.map((t) => t.transaccionAsociadaID || t.id));
            const nuevos = docs.filter((d) => !idsExistentes.has(d.transaccionAsociadaID || d.id));
            return [...prev, ...nuevos];
        });
    };
    const handleDocRelacionadoRemove = (id) => {
        setTransaccionesAsociadas((prev) => prev.filter((t) => (t.transaccionAsociadaID || t.id) !== id));
    };
    // ===== Totales calculados =====
    const totalDistribuido = transaccionesAsociadas.reduce((s, t) => s + (t.monto || 0), 0);
    const totalRetenciones = transaccionesAsociadas.reduce((s, t) => s + (t.retencion || 0), 0);
    const totalPagar = (totalValue || 0) - totalRetenciones;
    const porDistribuir = totalPagar - totalDistribuido;
    // Totales de cobros
    const totalCobrado = cobros.reduce((s, c) => s + (c.monto || 0), 0);
    const cuentasPorCobrar = (totalValue || 0) - totalCobrado;
    const diferencia = (totalValue || 0) - totalCobrado;
    const totales = {
        subTotal: (totalValue || 0) - (data?.impuestos || 0),
        descuento: data?.descuento || 0,
        impuestos: data?.impuestos || 0,
        total: totalValue || 0,
    };
    // Totales de asientos
    const totalDebitos = asientos.reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
    const totalCreditos = asientos.reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);
    // ===== Pendiente efectivo por fila =====
    // DOCASOC.PENDIENTE puede venir mal (0) cuando en realidad DEBITADO - ACREDITADO != 0.
    // El pendiente efectivo se calcula como max(montoOriginal - pagado, saldoPendiente), nunca negativo.
    const pendienteEfectivo = (t) => {
        const v = Math.max(0, (t.montoOriginal || 0) - (t.pagado || 0), t.saldoPendiente || 0);
        return Math.round(v * 100) / 100;
    };
    // ===== Columnas =====
    const asociadasColumns = [
        { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110, render: (v) => formatDate(v) },
        {
            title: 'Documento', dataIndex: 'documento', key: 'documento', width: 150,
            render: (doc, record) => {
                const ruta = getRutaDocumento(record);
                if (ruta) {
                    return _jsx(Link, { to: ruta, style: { color: '#6c5ffc', fontWeight: 500 }, children: doc });
                }
                return _jsx("span", { style: { color: '#6c5ffc', fontWeight: 500 }, children: doc });
            },
        },
        { title: 'Sucursal', dataIndex: 'sucursal', key: 'sucursal', width: 100, render: (v) => v || '-' },
        { title: 'NCF', dataIndex: 'nCF', key: 'nCF', width: 140, render: (v) => v || '-' },
        { title: 'Monto Original', dataIndex: 'montoOriginal', key: 'montoOriginal', width: 130, align: 'right', render: (v) => formatNumber(v) },
        { title: 'Abonado', dataIndex: 'pagado', key: 'pagado', width: 120, align: 'right', render: (v) => formatNumber(v) },
        { title: 'Pendiente', dataIndex: 'saldoPendiente', key: 'saldoPendiente', width: 120, align: 'right', render: (_, record) => _jsx("strong", { children: formatNumber(pendienteEfectivo(record)) }) },
        { title: 'Retención', dataIndex: 'retencion', key: 'retencion', width: 110, align: 'right', render: (v) => formatNumber(v || 0) },
        {
            title: 'Monto', dataIndex: 'monto', key: 'monto', width: 130, align: 'right',
            render: (_, record, idx) => (_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, max: pendienteEfectivo(record), step: 0.01, precision: 2, value: transaccionesAsociadas[idx]?.monto, onChange: (val) => {
                    const monto = val ?? 0;
                    setTransaccionesAsociadas((prev) => prev.map((t, i) => i === idx ? { ...t, monto: Math.min(monto, pendienteEfectivo(t)) } : t));
                } })),
        },
        {
            title: '', key: 'accion', width: 50,
            render: (_, record) => (_jsx(Button, { type: "text", danger: true, size: "small", icon: _jsx(DeleteOutlined, {}), onClick: () => handleDocRelacionadoRemove(record.transaccionAsociadaID || record.id) })),
        },
    ];
    const cobrosColumns = [
        {
            title: 'Medio de Cobro', dataIndex: 'medioCobro', key: 'medioCobro', width: 180,
            render: (v) => MEDIO_COBRO_LABELS[v] || v,
        },
        {
            title: 'Monto', dataIndex: 'monto', key: 'monto', width: 150, align: 'right',
            render: (_, _record, idx) => (_jsx(InputNumber, { size: "small", style: { width: '100%' }, min: 0, step: 0.01, precision: 2, value: cobros[idx]?.monto, disabled: !cobros[idx]?.editable, onChange: (val) => {
                    setCobros((prev) => prev.map((c, i) => i === idx ? { ...c, monto: val || 0 } : c));
                } })),
        },
        {
            title: 'Referencia', dataIndex: 'referencia', key: 'referencia', width: 150,
            render: (_, _record, idx) => (_jsx(Input, { size: "small", style: { width: '100%' }, value: cobros[idx]?.referencia || '', disabled: !cobros[idx]?.editable, onChange: (e) => {
                    setCobros((prev) => prev.map((c, i) => i === idx ? { ...c, referencia: e.target.value } : c));
                } })),
        },
    ];
    const asientoColumns = [
        {
            title: 'Cuenta', key: 'cuenta', width: 120,
            render: (_, r) => r.cuentaContable?.noCuenta || '-',
        },
        {
            title: 'Nombre', key: 'nombre', ellipsis: true,
            render: (_, r) => r.cuentaContable?.nombre ? toTitleCase(r.cuentaContable.nombre) : '-',
        },
        {
            title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true,
            render: (v) => v ? toTitleCase(v) : '-',
        },
        {
            title: 'Débito', key: 'debito', width: 130, align: 'right',
            render: (_, r) => esDebito(r.tipoAsiento) ? formatNumber(r.monto) : '',
        },
        {
            title: 'Crédito', key: 'credito', width: 130, align: 'right',
            render: (_, r) => esCredito(r.tipoAsiento) ? formatNumber(r.monto) : '',
        },
    ];
    const handleRefresh = useCallback(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoadingError(false);
        setLoading(true);
        reciboIngresoApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            setData(res);
            setTransaccionesAsociadas(res.transaccionesAsociadas || []);
            setAsientos(res.asientos || []);
            setLogs(res.logs || []);
            if (res.cobros && res.cobros.length > 0)
                setCobros(res.cobros);
            else
                setCobros(crearCobrosIniciales());
            setSelectedConcepto(res.concepto || null);
            setSelectedEntidad(res.entidad || null);
            setSelectedSucursal(res.sucursal || null);
            if (res.tipo)
                setSelectedTipo(res.tipo);
            else if (res.codigoTipo) {
                const encontrado = tiposCache.find(t => t.codigo === res.codigoTipo);
                if (encontrado)
                    setSelectedTipo(encontrado);
            }
            const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
            form.setFieldsValue({
                tipo: res.tipo?.codigo || res.codigoTipo || '',
                concepto: res.concepto?.codigo || '',
                entidad: res.entidad?.codigo || res.codigoEntidad || '',
                fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                ncf: res.ncf || '', referencia: res.referencia || '',
                tasa: res.tasa || 1, nota: res.nota || '', total: res.total || 0,
            });
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al recargar';
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, form, mode]);
    // ===== Loading =====
    if (loading) {
        return _jsx(LoadingSpinner, { mensaje: "Cargando documento..." });
    }
    // ===== Estado info =====
    const estadoInfo = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Borrador', color: 'default' };
    // ===== Encabezado =====
    const documentoTieneTipos = tiposCache.length > 0;
    const renderEncabezado = () => (_jsx(Card, { className: "paces-card", size: "small", title: "Datos Generales", extra: _jsx(EstadoTag, { estado: estado, periodo: data?.periodo }), style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: 16, children: [_jsx(Col, { xs: 24, xxl: 18, children: _jsx(Form, { form: form, layout: "vertical", size: "small", style: { paddingTop: 24 }, children: _jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, sm: 12, lg: 9, children: _jsx("div", { ref: tipoRef, children: _jsx(Form.Item, { name: "tipo", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Tipo", children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", onChange: handleTipoChange, children: tiposCache.map((tc) => (_jsxs(Select.Option, { value: tc.codigo, children: [tc.codigo, " - ", toTitleCase(tc.nombre)] }, tc.codigo))) }) }) }) }) }), _jsxs(Col, { xs: 24, sm: 12, lg: 15, children: [_jsx("div", { ref: conceptoRef, children: _jsx(FloatingField, { label: "Concepto", required: true, children: _jsx(Input, { placeholder: " ", value: selectedConcepto ? `${selectedConcepto.codigo || ''} - ${toTitleCase(selectedConcepto.nombre)}` : conceptoSearchText, readOnly: true, disabled: documentoTieneTipos && !selectedTipo, suffix: _jsxs(Space, { size: 4, children: [_jsx(SearchOutlined, { onClick: () => (!documentoTieneTipos || selectedTipo) && setConceptoModalOpen(true), style: { cursor: (!documentoTieneTipos || selectedTipo) ? 'pointer' : 'not-allowed', color: 'rgba(0,0,0,0.45)' } }), selectedConcepto && _jsx(ClearOutlined, { onClick: handleConceptoClear, style: { cursor: 'pointer' } })] }), onClick: () => (!documentoTieneTipos || selectedTipo) && setConceptoModalOpen(true) }) }) }), _jsx(Form.Item, { name: "concepto", hidden: true, children: _jsx(Input, {}) }), _jsx(ConceptoInfoLabel, { concepto: selectedConcepto })] }), _jsx(Col, { xs: 24, sm: 12, lg: 9, children: _jsx(Form.Item, { name: "fechaDocumento", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Fecha", required: true, children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabledDate: (current) => {
                                                    if (!current)
                                                        return false;
                                                    const cierre = fechasCierre?.[sucursalActiva];
                                                    if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                                        return true;
                                                    const cierreInv = fechasCierreInv?.[sucursalActiva];
                                                    if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                                        return true;
                                                    return false;
                                                } }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 15, children: _jsx("div", { ref: entidadRef, children: _jsx(Form.Item, { name: "entidad", required: true, style: { marginBottom: 0 }, children: _jsx(BuscarEntidadSelect, { entidades: entidadesCache, value: selectedEntidad?.codigo, label: "Cliente", required: true, tieneDocumentosAsociados: transaccionesAsociadas.length > 0, conceptoSeleccionado: !!selectedConcepto, onChange: (codigo, entidad) => {
                                                    setSelectedEntidad(entidad || null);
                                                } }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 9, children: _jsx("div", { ref: totalRef, children: _jsx(Form.Item, { name: "total", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Monto Total", required: true, children: _jsx(InputNumber, { style: { width: '100%' }, min: 0, step: 0.01, precision: 2 }) }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 9, ref: sucursalRef, children: _jsx(Form.Item, { name: "sucursal", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Sucursal Contable", children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", placeholder: " ", value: selectedSucursal?.sucursal ?? undefined, onChange: (val) => {
                                                    const suc = sucursalesCache.find((s) => s.sucursal === val);
                                                    setSelectedSucursal(suc || null);
                                                }, children: sucursalesCache.map((suc) => (_jsx(Select.Option, { value: suc.sucursal, children: toTitleCase(suc.nombre || '') }, suc.sucursal))) }) }) }) }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "nota", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Nota", children: _jsx(TextArea, { rows: 3, maxLength: 500, showCount: true }) }) }) })] }) }) }), _jsxs(Col, { xs: 24, xxl: 6, children: [_jsx("div", { style: { marginTop: 24 }, children: _jsx(TotalesCard, { subTotal: totales.subTotal, descuento: totales.descuento, impuestos: totales.impuestos, total: totales.total, hideTitle: true, monedaSimbolo: data?.moneda?.simbolo || selectedConcepto?.moneda?.simbolo || getMonedaSucursalActiva().simbolo, monedaNombre: data?.moneda?.nombre || selectedConcepto?.moneda?.nombre || getMonedaSucursalActiva().nombre, tasa: tasaValue ?? data?.tasa ?? 1 }) }), _jsx(Form.Item, { name: "ncf", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "referencia", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "tasa", hidden: true, children: _jsx(InputNumber, {}) }), _jsx("div", { style: { marginTop: 16 }, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsx("div", { children: editingField === 'ncf' ? (_jsx(Input, { size: "small", style: { width: '100%' }, placeholder: "NCF", maxLength: 19, autoFocus: true, defaultValue: editingValueRef.current, onChange: (e) => { editingValueRef.current = e.target.value; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                if (e.key === 'Escape') {
                                                    e.stopPropagation();
                                                    cancelFieldEditor();
                                                }
                                            } })) : ncfValue ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('ncf'), children: ["NCF: ", ncfValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('ncf'), children: [_jsx(PlusOutlined, {}), " NCF"] })) }), _jsx("div", { children: editingField === 'referencia' ? (_jsx(Input, { size: "small", style: { width: '100%' }, placeholder: "Referencia", autoFocus: true, defaultValue: editingValueRef.current, onChange: (e) => { editingValueRef.current = e.target.value; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                if (e.key === 'Escape') {
                                                    e.stopPropagation();
                                                    cancelFieldEditor();
                                                }
                                            } })) : refValue ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('referencia'), children: ["Ref: ", refValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('referencia'), children: [_jsx(PlusOutlined, {}), " Referencia"] })) }), _jsx("div", { children: editingField === 'tasa' ? (_jsx(InputNumber, { size: "small", style: { width: '100%' }, min: 0, step: 0.01, placeholder: "Tasa", autoFocus: true, defaultValue: editingValueRef.current, onChange: (val) => { editingValueRef.current = val ?? 1; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                if (e.key === 'Escape') {
                                                    e.stopPropagation();
                                                    cancelFieldEditor();
                                                }
                                            } })) : tasaValue !== 1 ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('tasa'), children: ["Tasa: ", tasaValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('tasa'), children: [_jsx(PlusOutlined, {}), " Tasa"] })) })] }) })] })] }) }));
    // ===== Tabs =====
    const tabItems = [];
    // Tab 1: Documentos Relacionados
    tabItems.push({
        key: 'documentos',
        label: `Documentos Relacionados (${transaccionesAsociadas.length})`,
        children: (_jsxs("div", { ref: documentosRef, children: [_jsxs("div", { style: { marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Space, { children: _jsxs(Text, { className: "paces-text-secondary", children: ["Total: ", formatNumber(totalValue || 0), " | Distribuido: ", formatNumber(totalDistribuido), " | Por distribuir: ", _jsx("span", { style: { color: porDistribuir > 0 ? '#faad14' : '#52c41a', fontWeight: 600 }, children: formatNumber(porDistribuir) })] }) }), _jsx(Button, { type: "primary", size: "small", icon: _jsx(PlusOutlined, {}), disabled: !selectedEntidad, onClick: () => setDocumentoModalOpen(true), children: "Agregar" })] }), _jsx(Table, { dataSource: transaccionesAsociadas, columns: asociadasColumns, rowKey: (r) => r.transaccionAsociadaID || r.id || Math.random(), size: "small", pagination: false, scroll: { x: 1200 }, locale: {
                        emptyText: (_jsx("div", { style: { minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin registros" }) })),
                    } })] })),
    });
    // Tab 2: Cobros (Medios de Cobro) - Único de RI
    tabItems.push({
        key: 'cobros',
        label: `Cobros (${cobros.filter(c => (c.monto || 0) > 0).length})`,
        children: (_jsx(Table, { dataSource: cobros, columns: cobrosColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 600 }, summary: () => (_jsxs(Table.Summary, { fixed: true, children: [_jsxs(Table.Summary.Row, { children: [_jsx(Table.Summary.Cell, { index: 0, children: _jsx("strong", { children: "Totales" }) }), _jsx(Table.Summary.Cell, { index: 1, align: "right", children: _jsx("strong", { children: formatNumber(totalCobrado) }) }), _jsx(Table.Summary.Cell, { index: 2 })] }), _jsxs(Table.Summary.Row, { children: [_jsx(Table.Summary.Cell, { index: 0, className: "paces-text-secondary", children: "Total Documento" }), _jsx(Table.Summary.Cell, { index: 1, align: "right", children: formatNumber(totalValue || 0) }), _jsx(Table.Summary.Cell, { index: 2 })] }), _jsxs(Table.Summary.Row, { children: [_jsx(Table.Summary.Cell, { index: 0, className: "paces-text-secondary", children: "Cuenta por Cobrar" }), _jsx(Table.Summary.Cell, { index: 1, align: "right", children: _jsx("span", { style: { color: cuentasPorCobrar > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }, children: formatNumber(cuentasPorCobrar) }) }), _jsx(Table.Summary.Cell, { index: 2 })] }), _jsxs(Table.Summary.Row, { children: [_jsx(Table.Summary.Cell, { index: 0, className: "paces-text-secondary", children: "Diferencia" }), _jsx(Table.Summary.Cell, { index: 1, align: "right", children: _jsx("span", { style: { color: Math.abs(diferencia) > 0.01 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }, children: formatNumber(diferencia) }) }), _jsx(Table.Summary.Cell, { index: 2 })] })] })) })),
    });
    // Tab 3: Asientos Contables
    tabItems.push({
        key: 'asientos',
        label: `Asientos Contables (${asientos.length})`,
        children: (permisoModificarAsientos && estado === 0 && !selectedConcepto?.noAsientos) ? (_jsxs("div", { children: [_jsx("div", { style: { marginBottom: 8, display: 'flex', justifyContent: 'flex-end' }, children: _jsx(Button, { icon: _jsx(ExclamationCircleOutlined, {}), onClick: handleGenerarAsientos, loading: saving, children: "GENERAR" }) }), _jsx(Table, { dataSource: asientos, columns: asientoColumns, rowKey: (r) => r.id || Math.random(), size: "small", pagination: false, scroll: { x: 600 }, summary: () => (_jsx(Table.Summary, { fixed: true, children: _jsxs(Table.Summary.Row, { children: [_jsx(Table.Summary.Cell, { index: 0, colSpan: 3, children: _jsx("strong", { children: "Totales" }) }), _jsx(Table.Summary.Cell, { index: 3, align: "right", children: _jsx("strong", { children: formatNumber(totalDebitos) }) }), _jsx(Table.Summary.Cell, { index: 4, align: "right", children: _jsx("strong", { children: formatNumber(totalCreditos) }) })] }) })) })] })) : (_jsx(Table, { dataSource: asientos, columns: asientoColumns, rowKey: (r) => r.id || Math.random(), size: "small", pagination: false, scroll: { x: 600 }, summary: () => (_jsx(Table.Summary, { fixed: true, children: _jsxs(Table.Summary.Row, { children: [_jsx(Table.Summary.Cell, { index: 0, colSpan: 3, children: _jsx("strong", { children: "Totales" }) }), _jsx(Table.Summary.Cell, { index: 3, align: "right", children: _jsx("strong", { children: formatNumber(totalDebitos) }) }), _jsx(Table.Summary.Cell, { index: 4, align: "right", children: _jsx("strong", { children: formatNumber(totalCreditos) }) })] }) })) })),
    });
    // Tab 4: Historial
    tabItems.push({
        key: 'historial',
        label: `Historial (${logs.length})`,
        children: (_jsx(LogTable, { dataSource: logs, scroll: { x: 900 } })),
    });
    // ===== Render principal =====
    return (_jsxs("div", { children: [_jsx(FormularioToolbar, { saving: saving, estado: estado, periodo: data?.periodo, onGuardar: handleGuardar, onCancelar: handleCancelar }), loadingError && (_jsx(Alert, { message: "Error al cargar formulario de recibo de ingreso", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(BuscarConceptoModal, { open: conceptoModalOpen, onClose: () => setConceptoModalOpen(false), onSelect: handleConceptoSelect, sucursal: sucursalActiva, documento: "RI", tipo: selectedTipo?.codigo }), _jsx(BuscarDocumentoModal, { open: documentoModalOpen, onClose: () => setDocumentoModalOpen(false), onSelect: handleAgregarDocumentos, tipoEntidad: selectedConcepto?.entidades?.[0]?.codigo || 'CLI', codEntidad: selectedEntidad?.codigo || data?.codigoEntidad || '', origen: (() => { const { documentos } = useCompanyStore.getState().data; const docConfig = documentos.find((d) => d.codigo === 'RI'); const docOrigen = docConfig?.origenCuenta ?? OrigenCuenta.Desconocido; return typeof docOrigen === 'number' ? docOrigen : (docOrigen === 'Credito' ? OrigenCuenta.Credito : OrigenCuenta.Debito); })(), montoTotal: totalValue || 0, documentosIniciales: transaccionesAsociadas
                    .map(t => t.id || t.transaccionAsociadaID)
                    .filter((id) => id != null && id > 0), documentoEnviado: data?.noDocumento ? `${documentCode}-${data.noDocumento}` : undefined }), isLarge ? (_jsx(Row, { gutter: 16, children: _jsxs(Col, { xxl: 24, children: [renderEncabezado(), _jsx(Tabs, { defaultActiveKey: "documentos", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: tabItems })] }) })) : (_jsxs("div", { children: [renderEncabezado(), _jsx(Tabs, { defaultActiveKey: "documentos", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: tabItems })] })), (mode === 'crear' || esBorrador) && (_jsx(ReciboIngresoGuide, { mode: mode, tipo: selectedTipo, concepto: selectedConcepto, entidad: selectedEntidad, total: totalValue, transaccionesCount: transaccionesAsociadas.length, sucursal: selectedSucursal, tipoRef: tipoRef, conceptoRef: conceptoRef, entidadRef: entidadRef, totalRef: totalRef, documentosRef: documentosRef, sucursalRef: sucursalRef }))] }));
};
const ReciboIngresoGuide = ({ tipo, concepto, entidad, total, transaccionesCount, sucursal, tipoRef, conceptoRef, entidadRef, totalRef, documentosRef, sucursalRef, }) => {
    const [open, setOpen] = useState(false);
    const dismissedStepRef = useRef(null);
    const currentStepRef = useRef(null);
    const getCurrentStep = useCallback(() => {
        const steps = [
            {
                key: 'sucursal',
                title: 'Paso 1: Sucursal',
                description: 'Seleccione la sucursal contable a la que pertenece el recibo de ingreso.',
                target: () => sucursalRef.current,
            },
            {
                key: 'tipo',
                title: 'Paso 2: Tipo',
                description: 'Debe elegir un tipo de documento para continuar.',
                target: () => tipoRef.current,
            },
            {
                key: 'concepto',
                title: 'Paso 3: Concepto',
                description: 'Seleccione un concepto. Las opciones dependen del tipo seleccionado.',
                target: () => conceptoRef.current,
            },
            {
                key: 'entidad',
                title: 'Paso 4: Entidad',
                description: 'Seleccione la entidad (cliente) asociada al recibo de ingreso.',
                target: () => entidadRef.current,
            },
            {
                key: 'monto',
                title: 'Paso 5: Monto',
                description: 'Ingrese el monto total del recibo de ingreso.',
                target: () => totalRef.current,
            },
            {
                key: 'documentos',
                title: 'Paso 6: Documentos',
                description: 'Agregue los documentos/pagos asociados al recibo de ingreso.',
                target: () => documentosRef.current,
            },
        ];
        if (!sucursal)
            return steps[0];
        if (!tipo)
            return steps[1];
        if (!concepto)
            return steps[2];
        if (!entidad)
            return steps[3];
        if (!total || total === 0)
            return steps[4];
        if (transaccionesCount === 0)
            return steps[5];
        return null;
    }, [tipo, concepto, entidad, total, transaccionesCount, sucursal, tipoRef, conceptoRef, entidadRef, totalRef, documentosRef, sucursalRef]);
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
export default ReciboIngresoFormulario;
