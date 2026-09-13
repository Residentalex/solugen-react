import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message, Form, Input, InputNumber, Select, DatePicker, Modal, Alert, Switch, Typography, Empty, } from 'antd';
import { SaveOutlined, CloseOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, ClearOutlined, ExclamationCircleOutlined, EditOutlined, } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { notaCreditoApi } from '../../api/notaCreditoApi';
import { conceptosApi } from '../../api/conceptosApi';
import { entidadApi } from '../../api/entidadApi';
import { tipoApi } from '../../api/tipoApi';
import { clienteApi } from '../../api/clienteApi';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import { parametrosApi } from '../../api/parametrosApi';
import LogTable from '../../components/LogTable';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import SeleccionarImpuestosModal from '../../components/SeleccionarImpuestosModal';
import { OrigenCuenta } from '../../types/contabilidad';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import BuscarDocumentoModal, { normalizarOrigen } from '../../components/BuscarDocumentoModal/BuscarDocumentoModal';
import BuscarEntidadSelect from '../../components/BuscarEntidadSelect/BuscarEntidadSelect';
import BuscarCuentaContableModal from '../../components/BuscarCuentaContableModal/BuscarCuentaContableModal';
import AsientosContableTable from '../../components/AsientosContableTable';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum } from '../../utils/estadoDocumento';
import { NotaCreditoGuide } from './NotaCreditoGuide';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
const { Text } = Typography;
const { TextArea } = Input;
// ===== Validación de formato NCF Modificado =====
function validarNcfModificado(val) {
    if (!val)
        return true;
    const b0Pattern = /^B0\d{9}$/;
    const e3Pattern = /^E3\d{10}$/;
    return b0Pattern.test(val) || e3Pattern.test(val);
}
const NotaCreditoFormulario = ({ tipoEntidad }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const cloneData = location.state?.cloneData;
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const usuario = useAuthStore((s) => s.usuario);
    const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const screens = Grid.useBreakpoint();
    const mode = id ? 'editar' : 'crear';
    const codigoPantalla = tipoEntidad === 'SUP' ? 'FNCSUP' : 'FNCCLI';
    const { documentCode } = useScreenConfig('FNC');
    const pantallaActiva = usuario?.pantallas?.find((p) => p.codigo?.toUpperCase() === codigoPantalla?.toUpperCase());
    const tienePermisoPostear = pantallaActiva?.acciones?.includes('POSTEAR') ?? false;
    const permisoModificarAsientos = usuario?.permisosEspeciales?.some((p) => p.codigo === 'pe_modificar_asientos' && p.valor === true) ?? false;
    const entidadLabel = tipoEntidad === 'SUP' ? 'Suplidor' : 'Cliente';
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
    const [detallesMovimiento, setDetallesMovimiento] = useState([]);
    const [devoluciones, setDevoluciones] = useState([]);
    const [impuestosFactura, setImpuestosFactura] = useState([]);
    const [medidasCache, setMedidasCache] = useState([]);
    const [asientos, setAsientos] = useState([]);
    const [logs, setLogs] = useState([]);
    const [fechaCierreContable, setFechaCierreContable] = useState(null);
    const [sucursalesCache, setSucursalesCache] = useState([]);
    const [selectedSucursal, setSelectedSucursal] = useState(null);
    // NCF Modificado
    const [ncfTipo, setNcfTipo] = useState('documento');
    const [ncfModificadoVal, setNcfModificadoVal] = useState('');
    // Modal de selección de impuestos
    const [modalImpuestosOpen, setModalImpuestosOpen] = useState(false);
    // Modal de búsqueda de cuenta contable para asientos manuales
    const [cuentaModalAsientoOpen, setCuentaModalAsientoOpen] = useState(false);
    // Concepto modal
    const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
    const [conceptoSearchText, setConceptoSearchText] = useState('');
    // Documentos relacionados modal
    const [buscarDocModalOpen, setBuscarDocModalOpen] = useState(false);
    const impuestosBackupRef = useRef(new Map());
    // Refs para la guía
    const conceptoRef = useRef(null);
    const sucursalRef = useRef(null);
    const entidadRef = useRef(null);
    const documentosRef = useRef(null);
    const tipoRef = useRef(null);
    const montoRef = useRef(null);
    // Quick fields
    const [editingField, setEditingField] = useState(null);
    const editingOriginalValue = useRef('');
    const editingValueRef = useRef('');
    const fieldCloseHandledRef = useRef(false);
    const [form] = Form.useForm();
    // Watchers
    const ncfValue = Form.useWatch('ncf', form) || '';
    const refValue = Form.useWatch('referencia', form) || '';
    const tasaValue = Form.useWatch('tasa', form) ?? 1;
    const totalValue = Form.useWatch('total', form) ?? 0;
    const sinOC = true;
    const isLarge = screens.xxl === true;
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
    // ===== Cargar catálogos al montar =====
    useEffect(() => {
        setActiveModule(codigoPantalla);
        const pageTitle = mode === 'crear'
            ? `Nueva Nota de Crédito - ${entidadLabel}`
            : `Editar Nota de Crédito - ${entidadLabel}`;
        setPageTitleOverride(pageTitle);
        // Cargar catálogos necesarios (tipos y sucursales)
        tipoApi.obtenerPorDocumento(sucursalActiva, 'NC')
            .then((tipos) => {
            setTiposCache(tipos);
        })
            .catch((err) => console.warn('Error al cargar tipos cache', err));
        conceptosApi.obtenerSucursales(sucursalActiva).then(setSucursalesCache).catch((err) => console.warn('Error al cargar sucursales cache', err));
        const cleanup = () => {
            resetToolbar();
            setPageTitleOverride('');
        };
        // === Si viene de Clonar ===
        if (cloneData) {
            console.log('[DEBUG cloneData]', cloneData);
            console.log('[DEBUG entidad]', cloneData.entidad);
            console.log('[DEBUG entidad.codigo]', cloneData.entidad?.codigo);
            setSelectedConcepto(cloneData.concepto || null);
            const entidadCloneNorm = cloneData.entidad ? {
                ...cloneData.entidad,
                codigo: cloneData.entidad.codigo || cloneData.entidad.idExterno || '',
            } : null;
            setSelectedEntidad(entidadCloneNorm);
            setSelectedSucursal(cloneData.sucursal || null);
            if (cloneData.tipo) {
                setSelectedTipo(cloneData.tipo);
            }
            setTransaccionesAsociadas(cloneData.transaccionesAsociadas || []);
            setDetallesMovimiento(cloneData.detallesMovimiento || cloneData.detalles || []);
            setDevoluciones(cloneData.devoluciones || []);
            // Normalizar desde impuestosFactura (anidado) si viene de clon
            setImpuestosFactura((cloneData.impuestosFactura || []).map((imp) => ({
                codigo: imp.impuesto?.codigo,
                idExterno: imp.impuesto?.idExterno,
                nombre: imp.impuesto?.nombre,
                porcentaje: imp.impuesto?.porcentaje,
                tipo: imp.tipo,
                monto: imp.monto,
            })));
            setAsientos(cloneData.asientos || []);
            setLogs(cloneData.logs || []);
            setNcfModificadoVal(cloneData.ncfModificado || '');
            setNcfTipo(cloneData.ncfModificado ? 'modificado' : 'documento');
            // Cargar entidades para el select de entidad
            if (cloneData.concepto?.codigo) {
                cargarEntidades(cloneData.concepto.codigo);
            }
            // Si la entidad viene en cloneData, agregarla al cache directamente
            if (cloneData.entidad?.codigo) {
                // Forzar la entidad en el cache inmediatamente
                setEntidadesCache([cloneData.entidad]);
                console.log('[DEBUG entidadesCache set]', cloneData.entidad);
                // También intentar cargar las demás entidades desde la API
                if (cloneData.concepto?.codigo) {
                    entidadApi.obtenerActivos(sucursalActiva, cloneData.concepto.codigo, tipoEntidad)
                        .then((res) => {
                        if (Array.isArray(res) && res.length > 0)
                            setEntidadesCache(res);
                    })
                        .catch(() => { });
                }
            }
            const fechaDoc = cloneData.fechaDocumento ? parseDateRaw(cloneData.fechaDocumento) : null;
            form.setFieldsValue({
                concepto: cloneData.concepto?.codigo || '',
                entidad: entidadCloneNorm?.codigo || '',
                sucursal: cloneData.sucursal?.codigo || '',
                fechaDocumento: fechaDoc ? dayjs(fechaDoc) : dayjs(),
                ncf: cloneData.ncf || '',
                referencia: cloneData.referencia || '',
                moneda: cloneData.moneda?.nombre || '',
                tasa: cloneData.tasa || 1,
                nota: cloneData.nota || '',
                total: cloneData.total || 0,
                bienes: cloneData.bienes || 0,
                servicios: cloneData.servicios || 0,
            });
            // Cargar medidas y fecha cierre fiscal
            unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch((err) => console.warn('Error al cargar medidas cache', err));
            parametrosApi.obtenerFechaCierreFiscal(sucursalActiva).then(setFechaCierreContable).catch((err) => console.warn('Error al obtener fecha cierre fiscal', err));
            return cleanup;
        }
        if (mode === 'crear') {
            form.setFieldsValue({
                fechaDocumento: dayjs(),
                tasa: 1,
                total: 0,
            });
        }
        return cleanup;
    }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, sucursalActiva, form, codigoPantalla, entidadLabel, cloneData]);
    // Seleccionar sucursal activa por defecto en modo crear
    useEffect(() => {
        if (mode === 'crear' && sucursalesCache.length > 0 && !selectedSucursal) {
            const match = sucursalesCache.find((s) => String(s.sucursal ?? s.codigo ?? s.idExterno) === String(sucursalActiva));
            if (match) {
                setSelectedSucursal(match);
                form.setFieldsValue({ sucursal: match.codigo || match.idExterno });
            }
        }
    }, [sucursalesCache, mode, sucursalActiva, selectedSucursal, form]);
    // ===== Cargar datos en modo editar =====
    useEffect(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoading(true);
        notaCreditoApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            setData(res);
            setTransaccionesAsociadas(res.transaccionesAsociadas || []);
            setDetallesMovimiento(res.detallesMovimiento || res.detalles || []);
            setDevoluciones(res.devoluciones || []);
            // Normalizar de estructura anidada → plana para la UI
            setImpuestosFactura((res.impuestosFactura || []).map((imp) => ({
                codigo: imp.impuesto?.codigo,
                idExterno: imp.impuesto?.idExterno,
                nombre: imp.impuesto?.nombre,
                porcentaje: imp.impuesto?.porcentaje,
                tipo: imp.tipo,
                monto: imp.monto,
            })));
            setAsientos(res.asientos || []);
            setLogs(res.logs || []);
            setNcfModificadoVal(res.ncfModificado || '');
            setNcfTipo(res.ncfModificado ? 'modificado' : 'documento');
            setSelectedConcepto(res.concepto || null);
            setSelectedEntidad(res.entidad || null);
            setSelectedSucursal(res.sucursal || null);
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
                bienes: res.bienes || 0,
                servicios: res.servicios || 0,
                sucursal: res.sucursal?.codigo || res.codigoSucursal || '',
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
            navigate(`/${codigoPantalla}`, { replace: true });
        })
            .finally(() => setLoading(false));
    }, [mode, id, sucursalActiva, form, navigate, codigoPantalla]);
    // ===== Cargar entidades (clientes o suplidores) =====
    const cargarEntidades = async (conceptoCodigo) => {
        try {
            // Cargar desde el endpoint de entidades
            const res = await entidadApi.obtenerActivos(sucursalActiva, conceptoCodigo || selectedConcepto?.codigo, tipoEntidad);
            setEntidadesCache(Array.isArray(res) ? res : []);
        }
        catch {
            // Fallback: cargar clientes o suplidores
            try {
                if (tipoEntidad === 'CLI') {
                    const clientes = await clienteApi.obtenerActivos(sucursalActiva);
                    setEntidadesCache(Array.isArray(clientes) ? clientes : []);
                }
                else {
                    const suplidores = await conceptosApi.obtenerSuplidores(sucursalActiva);
                    setEntidadesCache(Array.isArray(suplidores) ? suplidores : []);
                }
            }
            catch {
                message.error(`Error al cargar ${entidadLabel.toLowerCase()}s`);
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
                    navigate(`/${codigoPantalla}`, { replace: true });
                }
                else if (id) {
                    navigate(`/${codigoPantalla}/${id}`, { replace: true });
                }
            },
        });
    };
    // ===== Validación =====
    const validarFormulario = async () => {
        const values = form.getFieldsValue();
        if (!selectedConcepto)
            return 'Debe elegir un Concepto';
        if (!selectedEntidad && !values.entidad)
            return `Debe elegir un ${entidadLabel}`;
        const fechaDoc = values.fechaDocumento;
        if (fechaDoc) {
            const hoy = dayjs().endOf('day');
            if (dayjs(fechaDoc).isAfter(hoy)) {
                return 'La fecha del documento no puede ser mayor a hoy';
            }
        }
        // Validar fecha contra cierre contable
        if (fechaCierreContable) {
            const cierreDate = parseDateRaw(fechaCierreContable);
            if (cierreDate) {
                const cierreTs = dayjs(cierreDate).startOf('day').valueOf();
                if (fechaDoc && dayjs(fechaDoc).startOf('day').valueOf() <= cierreTs) {
                    return 'La fecha del documento no puede ser menor o igual a la fecha de cierre';
                }
            }
        }
        // Validar margen de impuestos
        if (impuestosFactura.length > 0) {
            const total = form.getFieldsValue().total || 0;
            for (const imp of impuestosFactura) {
                const porcentaje = imp.impuesto?.porcentaje || 0;
                const montoPromedio = total * ((porcentaje + 1) / 100);
                if (imp.monto > montoPromedio) {
                    return `El monto del impuesto ${imp.impuesto?.nombre || ''} superó el margen permitido.`;
                }
            }
        }
        // Validar distribución: si hay transacciones asociadas, suma debe coincidir con total
        if (transaccionesAsociadas.length > 0) {
            const sumaMontos = transaccionesAsociadas.reduce((s, t) => s + (t.monto || 0), 0);
            if (Math.abs(sumaMontos - (values.total || 0)) > 0.01) {
                return 'La suma de montos en Documentos Relacionados debe ser igual al Total';
            }
        }
        // Validar distribución: si hay devoluciones y es SUP
        if (tipoEntidad === 'SUP' && devoluciones.length > 0) {
            const sumaDVCs = devoluciones.reduce((s, d) => s + (d.monto || 0), 0);
            if (Math.abs(sumaDVCs - (values.total || 0)) > 0.01) {
                return 'La suma de montos en Devoluciones debe ser igual al Total';
            }
        }
        // Validar asientos cuadrados
        if (asientos.length > 0) {
            const totalDebitos = asientos.reduce((s, r) => s + (r.tipoAsiento === 'D' || r.tipoAsiento === 0 ? r.monto : 0), 0);
            const totalCreditos = asientos.reduce((s, r) => s + (r.tipoAsiento === 'C' || r.tipoAsiento === 1 ? r.monto : 0), 0);
            if (Math.abs(totalDebitos - totalCreditos) > 0.01) {
                return 'Los asientos contables no están cuadrados';
            }
        }
        // Validar NCF Modificado
        if (ncfTipo === 'modificado' && ncfModificadoVal && !validarNcfModificado(ncfModificadoVal)) {
            return 'El formato del NCF Modificado no es válido (B0+9dígitos o E3+10dígitos)';
        }
        if (values.nota && values.nota.length > 500) {
            return 'La nota no puede exceder 500 caracteres';
        }
        // Validar NCF si tiene
        if (values.ncf) {
            const ncf = values.ncf.trim();
            const validoB0 = /^B0\d{9}$/.test(ncf);
            const validoE3 = /^E3\d{10}$/.test(ncf);
            if (!validoB0 && !validoE3) {
                return 'El NCF debe tener formato B0 + 9 dígitos o E3 + 10 dígitos';
            }
            // Validar NCF duplicado
            if (selectedEntidad?.codigo) {
                try {
                    const ncfExiste = await notaCreditoApi.verificarNCF(sucursalActiva, ncf, selectedEntidad.codigo);
                    if (ncfExiste) {
                        return `El NCF ${ncf} ya fue usado en otro documento`;
                    }
                }
                catch {
                    // Si falla la verificación, continuar (no bloquear)
                }
            }
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
        // Calcular impuestos desde la tabla de impuestos factura
        const retenciones = impuestosFactura
            .filter((i) => i.tipo === 'R' || i.tipo === 'Retencion' || i.tipo === 'Retenciones')
            .reduce((s, i) => s + (i.monto || 0), 0);
        const impuestosCalc = impuestosFactura
            .filter((i) => i.tipo === 'I' || i.tipo === 'Impuesto' || i.tipo === 'V' || i.tipo === 'Informativo')
            .reduce((s, i) => s + (i.monto || 0), 0);
        const otrosImpuestos = impuestosFactura
            .filter((i) => i.tipo !== 'R' && i.tipo !== 'Retencion' && i.tipo !== 'Retenciones' && i.tipo !== 'I' && i.tipo !== 'Impuesto' && i.tipo !== 'V' && i.tipo !== 'Informativo')
            .reduce((s, i) => s + (i.monto || 0), 0);
        const totalImpuestos = impuestosCalc + otrosImpuestos;
        const subTotal = (values.total || 0) - totalImpuestos;
        // Asegurar documento con origenCuenta desde companyStore
        const { documentos } = useCompanyStore.getState().data;
        const docConfig = documentos.find((d) => d.codigo === documentCode);
        const docOrigenCuenta = base.documento?.origenCuenta ?? docConfig?.origenCuenta ?? OrigenCuenta.Desconocido;
        const documento = base.documento?.codigo
            ? { ...base.documento, origenCuenta: docOrigenCuenta }
            : { codigo: documentCode, origenCuenta: docOrigenCuenta };
        // Asegurar entidad con tipoEntidad
        const tipoEntidadStr = tipoEntidad;
        const entidadBase = base.entidad || entidadSel || { nombre: '', codigo: '', identificacion: '' };
        const entidad = {
            ...entidadBase,
            cuentaContable: entidadBase.cuentaContable,
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
            ncfModificado: ncfTipo === 'modificado' ? ncfModificadoVal : '',
            referencia: values.referencia || '',
            nota: values.nota || '',
            tasa: values.tasa || 1,
            diasCredito: selectedEntidad?.diasCredito || 0,
            total: values.total || 0,
            bienes: values.bienes || 0,
            servicios: values.servicios || 0,
            subTotal: Math.round(subTotal * 100) / 100,
            descuento: base.descuento || 0,
            impuestos: Math.round(totalImpuestos * 100) / 100,
            retenciones: Math.round(retenciones * 100) / 100,
            tipoDocumento: base.tipoDocumento ?? 39,
            tipoEntidad,
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
            sucursal: selectedSucursal ?? undefined,
            // Colecciones
            transaccionesAsociadas: transaccionesAsociadas.map((t) => ({
                ...t,
                transaccionAsociadaID: t.transaccionAsociadaID || t.id,
                saldoPendiente: pendienteEfectivo(t),
            })),
            detallesMovimiento: tipoEntidad === 'CLI' ? detallesMovimiento : [],
            devoluciones: tipoEntidad === 'SUP' ? devoluciones : [],
            // Transformar estructura plana → anidada para el backend
            impuestosFactura: impuestosFactura.map((imp) => ({
                monto: imp.monto || 0,
                tipo: imp.tipo || 'Impuesto',
                impuesto: {
                    codigo: imp.codigo || '',
                    idExterno: imp.idExterno || (imp.codigo || '').replace(/^IMP-0*/, '') || null,
                    nombre: imp.nombre || '',
                    porcentaje: imp.porcentaje || 0,
                },
            })),
            asientos: asientos || [],
            logs: logs || [],
        };
    };
    // ===== Acciones =====
    const handleGuardar = async () => {
        const error = await validarFormulario();
        if (error) {
            message.error(error);
            return;
        }
        setSaving(true);
        try {
            const dto = construirDTO();
            if (mode === 'crear') {
                const result = await notaCreditoApi.crear(sucursalActiva, dto);
                message.success('Nota de crédito creada exitosamente');
                navigate(`/${codigoPantalla}/${result.id}`, { replace: true });
            }
            else {
                await notaCreditoApi.actualizar(sucursalActiva, dto);
                message.success('Nota de crédito actualizada exitosamente');
                navigate(`/${codigoPantalla}/${id}`, { replace: true });
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
            const asientosGenerados = await notaCreditoApi.generarAsientos(sucursalActiva, dto);
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
    // ===== Handlers de concepto =====
    const handleConceptoSelect = (concepto) => {
        setSelectedConcepto(concepto);
        setEditingField(null);
        setConceptoSearchText('');
        // Cargar entidades según concepto
        cargarEntidades(concepto.codigo);
        // === ConfigurarMoneda (siempre desde concepto) ===
        const monedaObj = concepto.moneda || getMonedaSucursalActiva();
        const monedaFull = { nombre: monedaObj.nombre, simbolo: monedaObj.simbolo || getMonedaSucursalActiva().simbolo, codigo: monedaObj.codigo };
        setData((prev) => {
            if (!prev)
                return prev;
            return { ...prev, moneda: monedaFull };
        });
        form.setFieldsValue({
            concepto: concepto.codigo,
            moneda: monedaObj.nombre,
            tasa: monedaObj.tasa ?? 1,
        });
        // === NoImpuesto: si el concepto no acepta impuestos, limpiarlos ===
        const prevNoImpuesto = selectedConcepto?.noImpuesto;
        if (concepto.noImpuesto) {
            // Limpiar impuestosFactura si existe alguno
            const hayImpuestos = impuestosFactura.length > 0;
            if (hayImpuestos) {
                const backup = new Map();
                impuestosFactura.forEach((i, idx) => {
                    if ((i.monto || 0) > 0) {
                        backup.set(idx, { impuesto: i, porcentajeImpuesto: i.porcentaje || 0 });
                    }
                });
                impuestosBackupRef.current = backup;
                message.warning('El Concepto no acepta Impuestos, por lo que serán eliminados.');
                setImpuestosFactura([]);
            }
        }
        else if (prevNoImpuesto && !concepto.noImpuesto) {
            // Restoration not implemented for NC since impuestosFactura are managed via modal
        }
    };
    const handleConceptoClear = () => {
        setSelectedConcepto(null);
        setConceptoSearchText('');
        setEntidadesCache([]);
        setSelectedEntidad(null);
        form.setFieldsValue({ concepto: '', entidad: undefined });
    };
    // ===== Handlers de documentos relacionados =====
    const handleDocRelacionadoSelect = (docs) => {
        setTransaccionesAsociadas((prev) => {
            const existentes = new Set(prev.map((d) => d.transaccionAsociadaID));
            const nuevos = docs.filter((d) => !existentes.has(d.transaccionAsociadaID));
            return [...prev, ...nuevos];
        });
    };
    // ===== Handler del modal de impuestos compartido =====
    const handleConfirmarImpuestos = (items) => {
        setImpuestosFactura((prev) => {
            const existentes = new Map(prev.map((i) => [i.codigo, i]));
            for (const n of items) {
                const existente = existentes.get(n.codigo);
                if (existente) {
                    existentes.set(n.codigo, { ...existente, monto: existente.monto ?? n.monto });
                }
                else {
                    existentes.set(n.codigo, {
                        id: Date.now() + Math.random(),
                        codigo: n.codigo,
                        idExterno: n.idExterno,
                        nombre: n.nombre,
                        porcentaje: n.porcentaje,
                        tipo: n.tipo,
                        monto: n.monto,
                    });
                }
            }
            return Array.from(existentes.values());
        });
    };
    // ===== NCF Modificado =====
    const handleNcfTipoChange = (value) => {
        setNcfTipo(value);
        if (value === 'documento')
            setNcfModificadoVal('');
    };
    // ===== Handler para agregar asiento manual =====
    const handleAgregarAsientoManual = (cuenta) => {
        const nuevoAsiento = {
            id: Date.now(),
            cuentaContable: { noCuenta: cuenta.noCuenta, nombre: cuenta.nombre },
            monto: 0,
            tipoAsiento: 'D',
            generado: false,
            descripcion: '',
        };
        setAsientos((prev) => [...prev, nuevoAsiento]);
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
    // ===== Totales calculados =====
    const totalImpuestosCalc = impuestosFactura
        .filter((i) => i.tipo === 'I' || i.tipo === 'Impuesto' || i.tipo === 'V' || i.tipo === 'Informativo')
        .reduce((s, i) => s + (i.monto || 0), 0);
    const totales = {
        subTotal: (totalValue || 0) - totalImpuestosCalc,
        descuento: 0,
        impuestos: totalImpuestosCalc,
        total: totalValue || 0,
    };
    // ===== Handlers =====
    const handleRemoveDocumento = (idx) => {
        setTransaccionesAsociadas((prev) => prev.filter((_, i) => i !== idx));
    };
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
            render: (doc) => _jsx("span", { style: { color: '#6c5ffc', fontWeight: 500 }, children: doc }),
        },
        { title: 'Monto Original', dataIndex: 'montoOriginal', key: 'montoOriginal', width: 130, align: 'right', render: (v) => formatNumber(v) },
        { title: 'Abonado', dataIndex: 'pagado', key: 'pagado', width: 120, align: 'right', render: (v) => formatNumber(v) },
        { title: 'Pendiente', dataIndex: 'saldoPendiente', key: 'saldoPendiente', width: 120, align: 'right', render: (_, record) => _jsx("strong", { children: formatNumber(pendienteEfectivo(record)) }) },
        {
            title: 'Monto a Aplicar', dataIndex: 'monto', key: 'monto', width: 130, align: 'right',
            render: (_, record, idx) => (_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, max: pendienteEfectivo(record), step: 0.01, precision: 2, value: transaccionesAsociadas[idx]?.monto, onChange: (val) => {
                    const monto = val ?? 0;
                    setTransaccionesAsociadas((prev) => prev.map((t, i) => i === idx ? { ...t, monto: Math.min(monto, pendienteEfectivo(t)) } : t));
                } })),
        },
        { title: 'NCF', dataIndex: 'nCF', key: 'nCF', width: 140, render: (v) => v || '-' },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 60,
            fixed: 'right',
            render: (_, _record, idx) => (_jsx(Button, { type: "text", danger: true, icon: _jsx(DeleteOutlined, {}), onClick: () => handleRemoveDocumento(idx) })),
        },
    ];
    const detalleMovimientoColumns = [
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
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx("div", { children: toTitleCase(record.articulo || '') }), _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }, children: [record.familia?.nombre ? _jsx(Tag, { style: { fontSize: 11, lineHeight: '18px', padding: '0 6px' }, children: toTitleCase(record.familia.nombre) }) : null, record.fechaVencimiento && _jsxs("span", { children: ["V: ", formatDate(record.fechaVencimiento)] })] })] })),
        },
        { title: 'Tipo', dataIndex: 'tipo', key: 'tipo', width: 100, onCell: () => ({ style: { verticalAlign: 'top' } }) },
        { title: 'Cantidad', dataIndex: 'cantidad', key: 'cantidad', width: 100, align: 'right', onCell: () => ({ style: { verticalAlign: 'top' } }), render: (v) => formatNumber(v) },
        { title: 'Medida', dataIndex: 'udm', key: 'medida', width: 80, onCell: () => ({ style: { verticalAlign: 'top' } }), render: (v) => v || '-' },
        { title: 'Precio', dataIndex: 'precio', key: 'precio', width: 110, align: 'right', responsive: ['md', 'lg', 'xl', 'xxl'], onCell: () => ({ style: { verticalAlign: 'top' } }), render: (v) => formatNumber(v) },
        { title: 'SubTotal', dataIndex: 'subTotal', key: 'subTotal', width: 120, align: 'right', responsive: ['lg', 'xl', 'xxl'], onCell: () => ({ style: { verticalAlign: 'top' } }), render: (v) => formatNumber(v) },
        { title: 'Impuestos', dataIndex: 'impuestos', key: 'impuestos', width: 140, align: 'right', responsive: ['lg', 'xl', 'xxl'], onCell: () => ({ style: { verticalAlign: 'top' } }), render: (v) => formatNumber(v) },
        { title: 'Descuento', dataIndex: 'descuento', key: 'descuento', width: 120, align: 'right', responsive: ['lg', 'xl', 'xxl'], onCell: () => ({ style: { verticalAlign: 'top' } }), render: (v) => formatNumber(v) },
        { title: 'Total', dataIndex: 'total', key: 'total', width: 120, align: 'right', onCell: () => ({ style: { verticalAlign: 'top' } }), render: (v) => _jsx("strong", { children: formatNumber(v) }) },
    ];
    const devolucionesColumns = [
        { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 150 },
        { title: 'Monto', dataIndex: 'monto', key: 'monto', width: 130, align: 'right', render: (v) => formatNumber(v) },
        { title: 'Pérdida', dataIndex: 'perdida', key: 'perdida', width: 130, align: 'right', render: (v) => formatNumber(v) },
        {
            title: 'Generar Pérdida', dataIndex: 'generarPerdida', key: 'generarPerdida', width: 130,
            render: (_, record, idx) => (_jsx(Switch, { checked: record.generarPerdida, onChange: (checked) => {
                    setDevoluciones((prev) => prev.map((d, i) => i === idx ? {
                        ...d,
                        generarPerdida: checked,
                        perdida: checked ? ((d.montoOriginal || 0) - ((d.pagado || 0) + (d.monto || 0))) : 0
                    } : d));
                } })),
        },
    ];
    const impuestoFacturaColumns = [
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
                    setImpuestosFactura((prev) => prev.map((im, i) => i === idx ? { ...im, monto: val || 0 } : im));
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
    // ===== Estado info =====
    const estadoInfo = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Borrador', color: 'default' };
    // ===== Encabezado =====
    const documentoTieneTipos = tiposCache.length > 0;
    const renderEncabezado = () => (_jsx(Card, { className: "paces-card", size: "small", title: "Datos Generales", extra: _jsx(EstadoTag, { estado: estado, periodo: data?.periodo }), style: { marginBottom: 16, paddingBottom: 32 }, children: _jsxs(Row, { gutter: 16, children: [_jsx(Col, { xs: 24, xxl: 18, children: _jsx(Form, { form: form, layout: "vertical", size: "small", style: { paddingTop: 24 }, children: _jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, sm: 12, lg: 6, children: _jsx(Form.Item, { name: "fechaDocumento", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Fecha", required: true, children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabledDate: (current) => {
                                                    if (!current)
                                                        return false;
                                                    const cierre = fechasCierre?.[sucursalActiva];
                                                    if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                                        return true;
                                                    const cierreInv = fechasCierreInv?.[sucursalActiva];
                                                    if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                                        return true;
                                                    return false;
                                                } }) }) }) }), _jsxs(Col, { xs: 24, sm: 12, lg: 18, children: [_jsx("div", { ref: conceptoRef, children: _jsx(FloatingField, { label: "Concepto", required: true, children: _jsx(Input, { placeholder: " ", value: selectedConcepto ? `${selectedConcepto.codigo} - ${toTitleCase(selectedConcepto.nombre)}` : '', readOnly: true, disabled: documentoTieneTipos && !selectedTipo, suffix: _jsxs(Space, { size: 4, children: [_jsx(SearchOutlined, { onClick: () => (!documentoTieneTipos || selectedTipo) && setConceptoModalOpen(true), style: { cursor: (!documentoTieneTipos || selectedTipo) ? 'pointer' : 'not-allowed', color: 'rgba(0,0,0,0.45)' } }), selectedConcepto && _jsx(ClearOutlined, { onClick: handleConceptoClear, style: { cursor: 'pointer' } })] }), onClick: () => (!documentoTieneTipos || selectedTipo) && setConceptoModalOpen(true) }) }) }), _jsx(Form.Item, { name: "concepto", hidden: true, children: _jsx(Input, {}) }), _jsx(ConceptoInfoLabel, { concepto: selectedConcepto })] }), _jsx(Col, { xs: 24, sm: 12, lg: 6, children: _jsx("div", { ref: tipoRef, children: _jsx(Form.Item, { name: "tipo", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Tipo", children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", value: selectedTipo?.codigo, onChange: handleTipoChange, children: tiposCache.map((tc) => (_jsxs(Select.Option, { value: tc.codigo, children: [tc.codigo, " - ", toTitleCase(tc.nombre)] }, tc.codigo))) }) }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 18, children: _jsx("div", { ref: entidadRef, children: _jsx(Form.Item, { name: "entidad", required: true, style: { marginBottom: 0 }, children: _jsx(BuscarEntidadSelect, { entidades: entidadesCache, value: selectedEntidad?.codigo, label: entidadLabel, required: true, tieneDocumentosAsociados: transaccionesAsociadas.length > 0 || devoluciones.length > 0, conceptoSeleccionado: !!selectedConcepto, onChange: (codigo, entidad) => {
                                                    setSelectedEntidad(entidad || null);
                                                } }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 6, ref: sucursalRef, children: _jsx(Form.Item, { name: "sucursal", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Sucursal", children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", onChange: (val) => {
                                                    const s = sucursalesCache.find((x) => x.codigo === val || x.idExterno === val);
                                                    setSelectedSucursal(s || null);
                                                }, children: sucursalesCache.map((s) => (_jsx(Select.Option, { value: s.codigo || s.idExterno, children: toTitleCase(s.nombre) }, s.codigo || s.idExterno))) }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 6, children: _jsx("div", { ref: montoRef, children: _jsx(Form.Item, { name: "total", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Monto Total", required: true, children: _jsx(InputNumber, { style: { width: '100%' }, min: 0, step: 0.01, precision: 2 }) }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 6, children: _jsx(Form.Item, { name: "bienes", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Bienes", children: _jsx(InputNumber, { style: { width: '100%' }, min: 0, step: 0.01, precision: 2 }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 6, children: _jsx(Form.Item, { name: "servicios", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Servicios", children: _jsx(InputNumber, { style: { width: '100%' }, min: 0, step: 0.01, precision: 2 }) }) }) }), _jsx(Col, { xs: 24, lg: 18, children: _jsx(Form.Item, { name: "nota", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Nota", children: _jsx(TextArea, { rows: 3, maxLength: 500, showCount: true, placeholder: "Nota (m\u00E1x 500 caracteres)" }) }) }) }), _jsxs(Col, { xs: 24, lg: 6, children: [_jsxs(Space, { size: [8, 8], wrap: true, children: [_jsx("div", { children: editingField === 'ncf' ? (_jsx(Input, { size: "small", style: { width: 200 }, placeholder: "NCF", maxLength: 19, autoFocus: true, defaultValue: editingValueRef.current, onChange: (e) => { editingValueRef.current = e.target.value; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                            if (e.key === 'Escape') {
                                                                e.stopPropagation();
                                                                cancelFieldEditor();
                                                            }
                                                        } })) : ncfValue ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => openFieldEditor('ncf'), children: ["NCF: ", ncfValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => openFieldEditor('ncf'), children: [_jsx(PlusOutlined, {}), " NCF"] })) }), _jsx("div", { children: editingField === 'ncfModificado' ? (_jsx(Input, { size: "small", style: { width: 200 }, placeholder: "NCF Modificado", maxLength: 20, autoFocus: true, defaultValue: editingValueRef.current, onChange: (e) => { editingValueRef.current = e.target.value.toUpperCase(); }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                            if (e.key === 'Escape') {
                                                                e.stopPropagation();
                                                                cancelFieldEditor();
                                                            }
                                                        }, status: editingValueRef.current && !validarNcfModificado(editingValueRef.current) ? 'error' : undefined })) : ncfModificadoVal ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => openFieldEditor('ncfModificado'), children: ["NCF Mod: ", ncfModificadoVal, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => { setNcfTipo('modificado'); openFieldEditor('ncfModificado'); }, children: [_jsx(PlusOutlined, {}), " NCF Mod"] })) }), _jsx("div", { children: editingField === 'referencia' ? (_jsx(Input, { size: "small", style: { width: 200 }, placeholder: "Referencia", autoFocus: true, defaultValue: editingValueRef.current, onChange: (e) => { editingValueRef.current = e.target.value; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                            if (e.key === 'Escape') {
                                                                e.stopPropagation();
                                                                cancelFieldEditor();
                                                            }
                                                        } })) : refValue ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => openFieldEditor('referencia'), children: ["Ref: ", refValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => openFieldEditor('referencia'), children: [_jsx(PlusOutlined, {}), " Referencia"] })) }), _jsx("div", { children: editingField === 'tasa' ? (_jsx(InputNumber, { size: "small", style: { width: 120 }, min: 0, step: 0.01, placeholder: "Tasa", autoFocus: true, defaultValue: editingValueRef.current, onChange: (val) => { editingValueRef.current = val ?? 1; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                            if (e.key === 'Escape') {
                                                                e.stopPropagation();
                                                                cancelFieldEditor();
                                                            }
                                                        } })) : tasaValue !== 1 ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => openFieldEditor('tasa'), children: ["Tasa: ", tasaValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => openFieldEditor('tasa'), children: [_jsx(PlusOutlined, {}), " Tasa"] })) })] }), _jsx(Form.Item, { name: "ncf", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "referencia", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "tasa", hidden: true, children: _jsx(InputNumber, {}) })] }), _jsx(Form.Item, { name: "moneda", hidden: true, children: _jsx(Input, {}) })] }) }) }), _jsx(Col, { xs: 24, xxl: 6, children: _jsx("div", { style: { marginTop: 24 }, children: _jsx(TotalesCard, { subTotal: totales.subTotal, descuento: totales.descuento, impuestos: totales.impuestos, total: totales.total, hideTitle: true, monedaSimbolo: data?.moneda?.simbolo || selectedConcepto?.moneda?.simbolo || getMonedaSucursalActiva().simbolo, monedaNombre: data?.moneda?.nombre || selectedConcepto?.moneda?.nombre || getMonedaSucursalActiva().nombre, tasa: tasaValue ?? data?.tasa ?? 1 }) }) })] }) }));
    // ===== Tabs =====
    const tabItems = [];
    // Tab 1: Documentos Relacionados
    tabItems.push({
        key: 'documentos',
        label: `Documentos Relacionados (${transaccionesAsociadas.length})`,
        children: (_jsxs("div", { ref: documentosRef, children: [_jsx("div", { style: { marginBottom: 8, display: 'flex', justifyContent: 'flex-start' }, children: _jsx(Button, { type: "dashed", icon: _jsx(PlusOutlined, {}), onClick: () => setBuscarDocModalOpen(true), children: "Agregar Documento" }) }), _jsx(Table, { dataSource: transaccionesAsociadas, columns: asociadasColumns, rowKey: (r) => r.transaccionAsociadaID || r.id || Math.random(), size: "small", pagination: false, scroll: { x: 900 } })] })),
    });
    // Tab 2: Artículos (solo CLI)
    if (tipoEntidad === 'CLI') {
        tabItems.push({
            key: 'articulos',
            label: `Artículos (${detallesMovimiento.length})`,
            children: (_jsxs("div", { children: [_jsx("div", { style: { marginBottom: 8, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }, children: _jsx(Space, { children: _jsx(Button, { type: "dashed", icon: _jsx(PlusOutlined, {}), onClick: () => {
                                    const nuevoId = -(detallesMovimiento.length + 1);
                                    setDetallesMovimiento((prev) => [
                                        ...prev,
                                        {
                                            id: nuevoId,
                                            codigo: '',
                                            articulo: '',
                                            cantidad: 0,
                                            precio: 0,
                                            subTotal: 0,
                                            impuestos: 0,
                                            descuento: 0,
                                            total: 0,
                                            tipoArticulo: 'Producto',
                                        },
                                    ]);
                                }, children: "Agregar fila" }) }) }), _jsx(Table, { dataSource: detallesMovimiento, columns: detalleMovimientoColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 1200 }, locale: {
                            emptyText: (_jsx("div", { style: { minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin registros" }) })),
                        } })] })),
        });
    }
    // Tab 3: Devoluciones (solo SUP)
    if (tipoEntidad === 'SUP') {
        tabItems.push({
            key: 'devoluciones',
            label: `Devoluciones (${devoluciones.length})`,
            children: (_jsx(Table, { dataSource: devoluciones, columns: devolucionesColumns, rowKey: (r) => r.id || Math.random(), size: "small", pagination: false, scroll: { x: 600 } })),
        });
    }
    // Tab 4: Impuestos y Retenciones
    tabItems.push({
        key: 'impuestos',
        label: `Impuestos y Retenciones (${impuestosFactura.length})`,
        children: (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 8 }, children: [_jsx(Button, { type: "primary", ghost: true, icon: _jsx(SearchOutlined, {}), onClick: () => setModalImpuestosOpen(true), children: "Seleccionar del cat\u00E1logo" }), impuestosFactura.length > 0 && (_jsx(Button, { type: "link", danger: true, style: { marginLeft: 8 }, onClick: () => setImpuestosFactura([]), children: "Limpiar todos" }))] }), _jsx(Table, { dataSource: impuestosFactura, columns: impuestoFacturaColumns, rowKey: (r) => r.id || Math.random(), size: "small", pagination: false, scroll: { x: 600 }, locale: { emptyText: 'Sin impuestos seleccionados' } })] })),
    });
    // Tab 5: Asientos Contables
    tabItems.push({
        key: 'asientos',
        label: `Asientos Contables (${asientos.length})`,
        children: (permisoModificarAsientos && estado === 0 && !selectedConcepto?.noAsientos) ? (_jsxs(_Fragment, { children: [_jsx("div", { style: { marginBottom: 8, display: 'flex', gap: 8 }, children: _jsx(Button, { icon: _jsx(PlusOutlined, {}), onClick: () => setCuentaModalAsientoOpen(true), children: "Agregar asiento manual" }) }), _jsx(AsientosContableEditables, { asientos: asientos, onChange: setAsientos, editable: true, onGenerar: handleGenerarAsientos, generando: saving })] })) : (_jsx(AsientosContableTable, { asientos: asientos, scroll: { x: 600 }, rowKey: (r) => r.id || r.asientoID })),
    });
    // Tab 6: Historial
    tabItems.push({
        key: 'historial',
        label: `Historial (${logs.length})`,
        children: (_jsx(LogTable, { dataSource: logs, scroll: { x: 900 } })),
    });
    const handleRefresh = useCallback(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoadingError(false);
        setLoading(true);
        notaCreditoApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            setData(res);
            setTransaccionesAsociadas(res.transaccionesAsociadas || []);
            setDetallesMovimiento(res.detallesMovimiento || res.detalles || []);
            setDevoluciones(res.devoluciones || []);
            // Normalizar de estructura anidada → plana para la UI
            setImpuestosFactura((res.impuestosFactura || []).map((imp) => ({
                codigo: imp.impuesto?.codigo,
                idExterno: imp.impuesto?.idExterno,
                nombre: imp.impuesto?.nombre,
                porcentaje: imp.impuesto?.porcentaje,
                tipo: imp.tipo,
                monto: imp.monto,
            })));
            setAsientos(res.asientos || []);
            setLogs(res.logs || []);
            setSelectedConcepto(res.concepto || null);
            setSelectedEntidad(res.entidad || null);
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
                tasa: res.tasa || 1, nota: res.nota || '', total: res.total || 0, bienes: res.bienes || 0, servicios: res.servicios || 0,
            });
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al recargar';
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, form, mode]);
    // ===== Render principal =====
    return (_jsxs("div", { children: [loading && _jsx(LoadingSpinner, { mensaje: "Cargando documento..." }), !loading && (_jsxs(_Fragment, { children: [_jsx(FormularioToolbar, { saving: saving, estado: estado, periodo: data?.periodo, onGuardar: handleGuardar, onCancelar: handleCancelar }), loadingError && (_jsx(Alert, { message: "Error al cargar formulario de nota de cr\u00E9dito", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(BuscarConceptoModal, { open: conceptoModalOpen, onClose: () => setConceptoModalOpen(false), onSelect: handleConceptoSelect, sucursal: sucursalActiva, documento: "NC", tipo: selectedTipo?.codigo }), _jsx(BuscarDocumentoModal, { open: buscarDocModalOpen, onClose: () => setBuscarDocModalOpen(false), onSelect: handleDocRelacionadoSelect, tipoEntidad: tipoEntidad, codEntidad: selectedEntidad?.idExterno || selectedEntidad?.codigo || '', origen: (() => {
                            const { documentos } = useCompanyStore.getState().data;
                            const docConfig = documentos.find((d) => d.codigo === documentCode);
                            return normalizarOrigen(docConfig?.origenCuenta ?? OrigenCuenta.Desconocido);
                        })(), montoTotal: Number(form.getFieldValue('total') || 0) }), _jsx(SeleccionarImpuestosModal, { open: modalImpuestosOpen, onClose: () => setModalImpuestosOpen(false), onConfirm: handleConfirmarImpuestos, tipoEntidad: tipoEntidad, sucursal: sucursalActiva, existentes: impuestosFactura.map((i) => ({
                            codigo: i.codigo || '',
                            idExterno: i.idExterno || '',
                            nombre: i.nombre || '',
                            porcentaje: i.porcentaje || 0,
                            tipo: i.tipo || 'Impuesto',
                            monto: i.monto,
                        })) }), _jsx(BuscarCuentaContableModal, { open: cuentaModalAsientoOpen, onClose: () => setCuentaModalAsientoOpen(false), onSelect: (cuenta) => {
                            handleAgregarAsientoManual(cuenta);
                            setCuentaModalAsientoOpen(false);
                        }, sucursal: sucursalActiva }), isLarge ? (_jsx(Row, { gutter: 16, children: _jsxs(Col, { xxl: 24, children: [renderEncabezado(), _jsx(Tabs, { defaultActiveKey: "documentos", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: tabItems })] }) })) : (_jsxs("div", { children: [renderEncabezado(), _jsx(Tabs, { defaultActiveKey: "documentos", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: tabItems })] })), (mode === 'crear' || esBorrador) && (_jsx(NotaCreditoGuide, { mode: mode, tipo: selectedTipo?.codigo || '', concepto: selectedConcepto, entidad: selectedEntidad, total: totalValue || 0, detallesCount: transaccionesAsociadas.length + devoluciones.length, conceptoRef: conceptoRef, entidadRef: entidadRef, documentosRef: documentosRef, tipoRef: tipoRef, montoRef: montoRef, sucursal: selectedSucursal, sucursalRef: sucursalRef }))] }))] }));
};
export default NotaCreditoFormulario;
