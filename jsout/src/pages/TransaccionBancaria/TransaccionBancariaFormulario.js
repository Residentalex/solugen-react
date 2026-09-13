import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Space, Row, Col, Divider, Table, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Alert, App, Tabs, Tag, } from 'antd';
import { SaveOutlined, CloseOutlined, ExclamationCircleOutlined, SearchOutlined, BankOutlined, TagOutlined, DollarOutlined, PlusOutlined, DeleteOutlined, EditOutlined, } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useCompanyStore } from '../../stores/companyStore';
import { transaccionBancariaApi } from '../../api/transaccionBancariaApi';
import { cuentaBancariaApi } from '../../api/cuentaBancariaApi';
import { conceptosApi } from '../../api/conceptosApi';
import { tipoApi } from '../../api/tipoApi';
import { apiClient } from '../../api/client';
import { OrigenCuenta } from '../../types/contabilidad';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import FormularioToolbar from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { obtenerNombreSucursal } from '../../utils/sucursalEnumMapper';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import BuscarDocumentoModal from '../../components/BuscarDocumentoModal/BuscarDocumentoModal';
import AsientosContableTable from '../../components/AsientosContableTable';
import LogTable from '../../components/LogTable';
import { toTitleCase, extraerMensajeError, toISOFormat, formatNumber } from '../../utils/formats';
import { toEstadoNum } from '../../utils/estadoDocumento';
const { TextArea } = Input;
const { Text } = Typography;
// ===== Componente principal =====
const TransaccionBancariaFormulario = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
    const { message } = App.useApp();
    const mode = id ? 'editar' : 'crear';
    const { screenCode, documentCode } = useScreenConfig('FTransBanco');
    const [form] = Form.useForm();
    const navigationConfirmedRef = useRef(false);
    const impuestosBackupRef = useRef(new Map());
    // ===== States =====
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState(null);
    const [tipoValue, setTipoValue] = useState('');
    const [selectedConcepto, setSelectedConcepto] = useState(null);
    const [selectedEntidad, setSelectedEntidad] = useState(null);
    const [entidadesCache, setEntidadesCache] = useState([]);
    const [cuentasBancarias, setCuentasBancarias] = useState([]);
    const [selectedCuenta, setSelectedCuenta] = useState('');
    // Concepto modal
    const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
    const [conceptoSearchText, setConceptoSearchText] = useState('');
    // ===== Tipo Documento =====
    const [tipoDocumentoOpciones, setTipoDocumentoOpciones] = useState([]);
    const [loadingTipos, setLoadingTipos] = useState(false);
    // ===== Documentos Asociados editables =====
    const [documentosAsociados, setDocumentosAsociados] = useState([]);
    const [buscarDocModalOpen, setBuscarDocModalOpen] = useState(false);
    // ===== Pendiente efectivo por fila =====
    // DOCASOC.PENDIENTE puede venir mal (0) cuando en realidad DEBITADO - ACREDITADO != 0.
    // El pendiente efectivo se calcula como max(montoOriginal - pagado, saldoPendiente), nunca negativo.
    const pendienteEfectivo = (t) => {
        const v = Math.max(0, (t.montoOriginal || 0) - (t.pagado || 0), t.saldoPendiente || t.pendiente || 0);
        return Math.round(v * 100) / 100;
    };
    // ===== Estado para campos rápidos (Referencia, Tasa) =====
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
    // ===== Watchers =====
    const subTotalValue = Form.useWatch('subTotal', form) ?? 0;
    const descuentoValue = Form.useWatch('descuento', form) ?? 0;
    const impuestosValue = Form.useWatch('impuestos', form) ?? 0;
    const retencionesValue = Form.useWatch('retenciones', form) ?? 0;
    const refValue = Form.useWatch('referencia', form) || '';
    const tasaValue = Form.useWatch('tasa', form) ?? 1;
    // ===== Moneda dinámica desde el concepto seleccionado =====
    const monedaSimbolo = selectedConcepto?.moneda?.simbolo || getMonedaSucursalActiva().simbolo;
    const monedaNombre = selectedConcepto?.moneda?.nombre || getMonedaSucursalActiva().nombre;
    // ===== Computed totals desde documentos asociados =====
    const sumaMontos = useMemo(() => documentosAsociados.reduce((sum, d) => sum + (d.monto || 0), 0), [documentosAsociados]);
    const sumaDescuentos = useMemo(() => documentosAsociados.reduce((sum, d) => sum + (d.descuento || 0), 0), [documentosAsociados]);
    // SubTotal = sumaMontos + sumaDescuentos (el monto base antes de descuento)
    const subTotalCalculado = Math.round((sumaMontos + sumaDescuentos) * 100) / 100;
    // ===== Sincronizar totales al formulario =====
    useEffect(() => {
        form.setFieldsValue({
            subTotal: subTotalCalculado,
            descuento: Math.round(sumaDescuentos * 100) / 100,
        });
    }, [sumaMontos, sumaDescuentos, form]);
    // Total = SubTotal - Descuento + Impuestos - Retenciones = sumaMontos + impuestos - retenciones
    const totalCalculado = Math.round((sumaMontos + (impuestosValue || 0) - (retencionesValue || 0)) * 100) / 100;
    // ===== Cargar cuentas bancarias =====
    const cargarCuentasBancarias = useCallback(async () => {
        try {
            const result = await cuentaBancariaApi.obtenerListado(sucursalActiva);
            setCuentasBancarias(result || []);
        }
        catch {
            message.error('Error al cargar cuentas bancarias');
        }
    }, [sucursalActiva, message]);
    // ===== Cargar tipos de documento =====
    const cargarTiposDocumento = useCallback(async () => {
        setLoadingTipos(true);
        try {
            const result = await tipoApi.obtenerPorDocumento(sucursalActiva, 'SP');
            setTipoDocumentoOpciones(result || []);
        }
        catch {
            message.error('Error al cargar tipos de documento');
        }
        finally {
            setLoadingTipos(false);
        }
    }, [sucursalActiva, message]);
    // ===== Cargar pendientes cuando cambia la entidad =====
    const cargarPendientesEntidad = useCallback(async (codEntidad) => {
        if (!codEntidad) {
            setDocumentosAsociados([]);
            return;
        }
        const tipoEntidad = selectedEntidad?.tipoEntidad?.codigo || 'SUP';
        try {
            const { data: resp } = await apiClient.get(`/Transaccion/${sucursalActiva}/pendiente/${codEntidad}`, { params: { tipoEntidad } });
            const docs = (resp?.data || []).map((d) => ({
                id: d.id,
                transaccionAsociadaID: d.id,
                fecha: d.fechaDocumento ? dayjs(d.fechaDocumento).format('YYYY-MM-DD') : '',
                documento: `${(d.documento?.codigo || d.tipoDocumento || '')}-${d.noDocumento || ''}`,
                nCF: d.ncf || '',
                montoOriginal: d.total || 0,
                monto: d.total || 0,
                descuento: 0,
                retencion: d.retenciones ?? 0,
                pagado: d.acreditado ?? d.debitado ?? 0,
                pendiente: (d.total || 0) - (d.acreditado ?? d.debitado ?? 0),
            }));
            setDocumentosAsociados(docs);
        }
        catch {
            message.error('Error al cargar documentos pendientes');
        }
    }, [sucursalActiva, selectedEntidad?.tipoEntidad?.codigo, message]);
    // ===== Carga inicial =====
    useEffect(() => {
        setActiveModule(screenCode);
        if (mode === 'crear') {
            setPageTitleOverride('Nueva Transacción Bancaria');
        }
        cargarCuentasBancarias();
        cargarTiposDocumento();
        if (mode === 'crear') {
            form.setFieldsValue({
                fechaDocumento: dayjs(),
                tasa: 1,
                subTotal: 0,
                descuento: 0,
                impuestos: 0,
                retenciones: 0,
                beneficiario: '',
                total: values.total ?? totalCalculado,
            });
        }
        return () => {
            resetToolbar();
            setPageTitleOverride('');
        };
    }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, form, cargarCuentasBancarias, cargarTiposDocumento]);
    // ===== Cargar entidades según concepto =====
    const cargarEntidades = useCallback(async (conceptoCodigo) => {
        try {
            const res = await conceptosApi.obtenerEntidadesActivas(sucursalActiva, conceptoCodigo);
            setEntidadesCache(res || []);
        }
        catch {
            message.error('Error al cargar entidades');
        }
    }, [sucursalActiva, message]);
    // ===== Cargar datos en modo editar =====
    useEffect(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoading(true);
        transaccionBancariaApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                navigate('/FTransBanco', { replace: true });
                return;
            }
            setData(res);
            // Documentos asociados en modo editar
            if (res.transaccionesAsociadas && res.transaccionesAsociadas.length > 0) {
                setDocumentosAsociados(res.transaccionesAsociadas.map((d) => ({
                    id: d.transaccionAsociadaID ?? d.id ?? Math.random(),
                    transaccionAsociadaID: d.transaccionAsociadaID ?? d.id,
                    transaccionID: d.id,
                    fecha: d.fecha ? dayjs(d.fecha).format('YYYY-MM-DD') : '',
                    documento: d.documento || '',
                    nCF: d.nCF || d.ncf || '',
                    montoOriginal: d.montoOriginal ?? 0,
                    monto: d.monto ?? d.montoOriginal ?? 0,
                    descuento: d.descuento ?? 0,
                    retencion: d.retencion ?? 0,
                    pagado: d.pagado ?? 0,
                    pendiente: pendienteEfectivo(d),
                })));
            }
            // Concepto
            const conceptoRaw = res.concepto;
            const concepto = typeof conceptoRaw === 'object' && conceptoRaw !== null ? conceptoRaw : null;
            if (concepto) {
                setSelectedConcepto(concepto);
                setConceptoSearchText(`${concepto.codigo || ''} - ${concepto.nombre || ''}`);
                if (concepto.codigo) {
                    cargarEntidades(concepto.codigo);
                }
            }
            // Tipo - usar codigoTipo del DTO, con fallback a tipo?.codigo
            const tipoCodigo = res.tipo?.codigo || '';
            setTipoValue(tipoCodigo);
            // Entidad
            const entidadRaw = res.entidad;
            const entidad = typeof entidadRaw === 'object' && entidadRaw !== null ? entidadRaw : null;
            if (entidad) {
                // El código de entidad puede venir en idExterno en vez de codigo
                setSelectedEntidad({
                    ...entidad,
                    codigo: entidad.codigo || entidad.idExterno || '',
                });
            }
            else if (res.codigoEntidad) {
                // Crear entidad sintética desde campos planos cuando la API no devuelve el objeto
                setSelectedEntidad({
                    codigo: res.codigoEntidad,
                    nombre: res.nombreEntidad || '',
                    identificacion: '',
                    tipoEntidad: { codigo: res.tipoEntidad || 'SUP', origenCuenta: 1 },
                });
            }
            // Cuenta bancaria: usar ctaBancaria
            const cta = res.ctaBancaria || '';
            setSelectedCuenta(cta);
            // Fecha: usar fechaDocumento
            const fechaDoc = res.fechaDocumento ? dayjs(res.fechaDocumento) : null;
            form.setFieldsValue({
                fechaDocumento: fechaDoc,
                tipo: tipoCodigo,
                concepto: concepto?.codigo || (typeof res.concepto === 'string' ? res.concepto : ''),
                entidad: entidad?.codigo || '',
                cuentaBancaria: cta,
                referencia: res.referencia || '',
                ncf: res.ncf || '',
                nota: res.nota || '',
                subTotal: res.subTotal ?? 0,
                descuento: res.descuento ?? 0,
                impuestos: res.impuestos ?? 0,
                retenciones: res.retenciones ?? 0,
                tasa: res.tasa ?? 1,
                beneficiario: res.nombreBeneficiario || '',
                total: res.total ?? totalCalculado,
            });
            // Mostrar documento en el título
            const docCodigo = res.documento?.codigo || res.codigoTipo || '';
            setPageTitleOverride(`Editar - ${docCodigo}-${res.noDocumento}`);
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al cargar la transacción bancaria');
            message.error(msg);
            setLoadingError(true);
            navigate('/FTransBanco', { replace: true });
        })
            .finally(() => setLoading(false));
    }, [mode, id, sucursalActiva, form, navigate, cargarEntidades, message]);
    // ===== Cargar documentos pendientes al seleccionar entidad (crear) =====
    useEffect(() => {
        if (mode !== 'crear')
            return;
        if (selectedEntidad?.codigo) {
            cargarPendientesEntidad(selectedEntidad.codigo);
        }
        else {
            setDocumentosAsociados([]);
        }
    }, [selectedEntidad?.codigo, mode, cargarPendientesEntidad]);
    // ===== Bloqueo de navegación con cambios sin guardar =====
    useEffect(() => {
        const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, []);
    useEffect(() => {
        const handlePopState = () => {
            const leave = window.confirm('Los cambios no guardados se perderán. ¿Está seguro que desea salir?');
            if (!leave) {
                window.history.pushState(null, '', window.location.pathname);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);
    useEffect(() => {
        const originalPushState = window.history.pushState.bind(window.history);
        window.history.pushState = function (dataArg, unused, url) {
            const currentPath = window.location.pathname;
            const newPath = typeof url === 'string' ? url.split('?')[0] : (url instanceof URL ? url.pathname : null);
            if (newPath && currentPath !== newPath && !navigationConfirmedRef.current) {
                const leave = window.confirm('Los cambios no guardados se perderán. ¿Está seguro que desea salir?');
                if (!leave)
                    return;
                navigationConfirmedRef.current = true;
            }
            return originalPushState(dataArg, unused, url);
        };
        return () => { window.history.pushState = originalPushState; };
    }, []);
    // ===== Handlers de concepto =====
    const handleConceptoSelect = (concepto) => {
        setSelectedConcepto(concepto);
        setConceptoSearchText('');
        setSelectedEntidad(null);
        setDocumentosAsociados([]);
        if (concepto.codigo) {
            cargarEntidades(concepto.codigo);
        }
        // === ConfigurarMoneda ===
        const monedaObj = concepto.moneda || getMonedaSucursalActiva();
        setData((prev) => {
            if (!prev)
                return prev;
            return { ...prev, codigoMoneda: monedaObj.nombre };
        });
        form.setFieldsValue({
            concepto: concepto.codigo,
            entidad: undefined,
            moneda: monedaObj.nombre,
            tasa: monedaObj.tasa ?? 1,
        });
        // === NoImpuesto ===
        const prevNoImpuesto = selectedConcepto?.noImpuesto;
        if (concepto.noImpuesto) {
            const impuestosActual = form.getFieldValue('impuestos') || 0;
            if (impuestosActual > 0) {
                impuestosBackupRef.current.set(0, { impuesto: undefined, porcentajeImpuesto: impuestosActual });
                message.warning('El Concepto no acepta Impuestos, por lo que serán eliminados.');
                form.setFieldsValue({ impuestos: 0 });
            }
        }
        else if (prevNoImpuesto && !concepto.noImpuesto) {
            const saved = impuestosBackupRef.current.get(0);
            if (saved) {
                form.setFieldsValue({ impuestos: saved.porcentajeImpuesto });
                impuestosBackupRef.current = new Map();
            }
        }
    };
    const handleConceptoClear = () => {
        setSelectedConcepto(null);
        setConceptoSearchText('');
        setEntidadesCache([]);
        setSelectedEntidad(null);
        setDocumentosAsociados([]);
        form.setFieldsValue({ concepto: '', entidad: undefined });
    };
    // ===== Handlers de navegación =====
    const handleCancelar = () => {
        Modal.confirm({
            title: 'Cancelar',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: '¿Está seguro que desea cancelar los cambios realizados?',
            okText: 'Sí, cancelar',
            cancelText: 'No, continuar editando',
            okButtonProps: { danger: true },
            onOk: () => {
                navigationConfirmedRef.current = true;
                if (mode === 'crear') {
                    navigate('/FTransBanco', { replace: true });
                }
                else if (id) {
                    navigate(`/FTransBanco/${id}`, { replace: true });
                }
            },
        });
    };
    // ===== Validación =====
    const validarFormulario = () => {
        if (!selectedConcepto)
            return 'Debe seleccionar un Concepto';
        if (!selectedEntidad)
            return 'Debe seleccionar una Entidad';
        const values = form.getFieldsValue();
        if (!values.cuentaBancaria)
            return 'Debe seleccionar una Cuenta Bancaria';
        if (subTotalValue < 0)
            return 'SubTotal no puede ser negativo';
        return null;
    };
    // ===== Construir DTO =====
    const construirDTO = () => {
        const values = form.getFieldsValue();
        const tipoEntidadStr = selectedEntidad?.tipoEntidad?.codigo || selectedEntidad?.tipo || 'SUP';
        const fechaDoc = values.fechaDocumento
            ? toISOFormat(values.fechaDocumento.toDate())
            : toISOFormat(new Date());
        const dto = {
            fechaDocumento: fechaDoc,
            codigoTipo: tipoValue || '',
            codigoConcepto: selectedConcepto?.codigo || '',
            codigoEntidad: selectedEntidad?.codigo || selectedEntidad?.identificacion || '',
            nombreEntidad: selectedEntidad?.nombre || data?.nombreEntidad || '',
            numeroCuenta: selectedEntidad?.cuentaContable?.noCuenta || data?.entidad?.cuentaContable?.noCuenta || '',
            codigoSucursal: data?.sucursal?.sucursal ? String(data.sucursal.sucursal) : String(sucursalActiva),
            ctaBancaria: values.cuentaBancaria || '',
            referencia: values.referencia || '',
            ncf: values.ncf || '',
            nota: values.nota || '',
            subTotal: subTotalCalculado,
            descuento: sumaDescuentos,
            impuestos: impuestosValue,
            retenciones: retencionesValue,
            total: totalCalculado,
            tasa: tasaValue,
            nombreBeneficiario: values.beneficiario || undefined,
            codigoMoneda: monedaSimbolo === 'RD$' ? 'DOP' : (monedaSimbolo === 'US$' ? 'USD' : monedaNombre),
            entidad: selectedEntidad ? {
                codigo: selectedEntidad?.codigo || '',
                nombre: selectedEntidad?.nombre || data?.nombreEntidad || '',
                tipoEntidad: selectedEntidad?.tipoEntidad || data?.entidad?.tipoEntidad || { codigo: tipoEntidadStr, origenCuenta: 1 },
                cuentaContable: selectedEntidad?.cuentaContable || data?.entidad?.cuentaContable || undefined,
            } : undefined,
            transaccionesAsociadas: documentosAsociados.map(d => ({
                id: d.transaccionID ?? data?.id ?? 0,
                transaccionAsociadaID: d.transaccionAsociadaID ?? d.id,
                monto: d.monto ?? 0,
                montoOriginal: d.montoOriginal ?? 0,
                descuento: d.descuento ?? 0,
                retencion: d.retencion ?? 0,
                nCF: d.nCF,
                documento: d.documento,
                pagado: d.pagado ?? 0,
                saldoPendiente: pendienteEfectivo(d),
            })),
        };
        if (mode === 'editar' && id) {
            dto.id = data?.id || parseInt(id);
            if (data?.documento?.codigo) {
                dto.tipoDocumento = data.documento.codigo;
            }
        }
        const docCodigo = data?.documento?.codigo || selectedConcepto?.docAGenerar || '';
        const docConfig = docCodigo ? useCompanyStore.getState().data.documentos?.find((d) => d.codigo === docCodigo) : undefined;
        if (docCodigo) {
            dto.documento = {
                codigo: docCodigo,
                origenCuenta: data?.documento?.origenCuenta ?? docConfig?.origenCuenta ?? OrigenCuenta.Desconocido,
            };
        }
        return dto;
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
                const idCreado = await transaccionBancariaApi.crearDocBancario(sucursalActiva, dto);
                navigationConfirmedRef.current = true;
                message.success('Transacción bancaria creada exitosamente');
                navigate(`/FTransBanco/${idCreado}`, { replace: true });
            }
            else {
                await transaccionBancariaApi.actualizar(sucursalActiva, dto);
                navigationConfirmedRef.current = true;
                message.success('Transacción bancaria actualizada exitosamente');
                navigate(`/FTransBanco/${id}`, { replace: true });
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
    // ===== Refresh =====
    const handleRefresh = useCallback(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoadingError(false);
        setLoading(true);
        transaccionBancariaApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            if (!res) {
                message.error('Documento no encontrado.');
                setLoadingError(true);
                return;
            }
            setData(res);
            // Recargar documentos asociados
            if (res.transaccionesAsociadas && res.transaccionesAsociadas.length > 0) {
                setDocumentosAsociados(res.transaccionesAsociadas.map((d) => ({
                    id: d.transaccionAsociadaID ?? d.id ?? Math.random(),
                    transaccionAsociadaID: d.transaccionAsociadaID ?? d.id,
                    transaccionID: d.id,
                    fecha: d.fecha ? dayjs(d.fecha).format('YYYY-MM-DD') : '',
                    documento: d.documento || '',
                    nCF: d.nCF || d.ncf || '',
                    montoOriginal: d.montoOriginal ?? 0,
                    monto: d.monto ?? d.montoOriginal ?? 0,
                    descuento: d.descuento ?? 0,
                    retencion: d.retencion ?? 0,
                    pagado: d.pagado ?? 0,
                    pendiente: pendienteEfectivo(d),
                })));
            }
            const conceptoRaw = res.concepto;
            const conceptoH = typeof conceptoRaw === 'object' && conceptoRaw !== null ? conceptoRaw : null;
            if (conceptoH) {
                setSelectedConcepto(conceptoH);
                setConceptoSearchText(`${conceptoH.codigo || ''} - ${conceptoH.nombre || ''}`);
            }
            const tipoDocObj = res.documento;
            const tipoCodigo = res.tipo?.codigo || '';
            setTipoValue(tipoCodigo);
            const entidadRaw = res.entidad;
            const entidadH = typeof entidadRaw === 'object' && entidadRaw !== null ? entidadRaw : null;
            if (entidadH) {
                // El código de entidad puede venir en idExterno en vez de codigo
                setSelectedEntidad({
                    ...entidadH,
                    codigo: entidadH.codigo || entidadH.idExterno || '',
                });
            }
            else if (res.codigoEntidad) {
                // Crear entidad sintética desde campos planos cuando la API no devuelve el objeto
                setSelectedEntidad({
                    codigo: res.codigoEntidad,
                    nombre: res.nombreEntidad || '',
                    identificacion: '',
                    tipoEntidad: { codigo: res.tipoEntidad || 'SUP', origenCuenta: 1 },
                });
            }
            setSelectedCuenta(res.ctaBancaria || '');
            const fechaDoc = res.fechaDocumento ? dayjs(res.fechaDocumento) : null;
            form.setFieldsValue({
                fechaDocumento: fechaDoc,
                tipo: tipoDocObj?.codigo || res.codigoTipo || '',
                concepto: conceptoH?.codigo || '',
                entidad: entidadH?.codigo || '',
                cuentaBancaria: res.ctaBancaria || '',
                referencia: res.referencia || '',
                ncf: res.ncf || '',
                nota: res.nota || '',
                subTotal: res.subTotal ?? 0,
                descuento: res.descuento ?? 0,
                impuestos: res.impuestos ?? 0,
                retenciones: res.retenciones ?? 0,
                tasa: res.tasa ?? 1,
                beneficiario: res.nombreBeneficiario || '',
                total: res.total ?? totalCalculado,
            });
            // Mostrar documento en el título
            const docCodigoRefresh = res.documento?.codigo || res.codigoTipo || '';
            setPageTitleOverride(`Editar - ${docCodigoRefresh}-${res.noDocumento}`);
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al recargar');
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, form, mode, message]);
    // ===== Handlers de documentos asociados =====
    const handleMontoChange = useCallback((id, value) => {
        setDocumentosAsociados(prev => prev.map(d => (d.transaccionAsociadaID ?? d.id) === id ? { ...d, monto: Math.min(value ?? 0, pendienteEfectivo(d)) } : d));
    }, []);
    const handleDescuentoChange = useCallback((id, value) => {
        setDocumentosAsociados(prev => prev.map(d => (d.transaccionAsociadaID ?? d.id) === id ? { ...d, descuento: value ?? 0 } : d));
    }, []);
    const handleRemoveDoc = useCallback((id) => {
        setDocumentosAsociados(prev => prev.filter(d => (d.transaccionAsociadaID ?? d.id) !== id));
    }, []);
    const handleDocumentosSeleccionados = useCallback((docs) => {
        setDocumentosAsociados(prev => {
            const existingIds = new Set(prev.map(d => d.transaccionAsociadaID ?? d.id));
            const nuevos = docs.filter((d) => !existingIds.has(d.transaccionAsociadaID ?? d.id));
            return [...prev, ...nuevos.map((d) => ({
                    id: d.transaccionAsociadaID ?? d.id,
                    transaccionAsociadaID: d.transaccionAsociadaID ?? d.id,
                    transaccionID: d.transaccionID,
                    fecha: d.fecha ? dayjs(d.fecha).format('YYYY-MM-DD') : '',
                    documento: d.documento || '',
                    nCF: d.ncf || d.nCF || '',
                    montoOriginal: d.montoOriginal || 0,
                    monto: d.monto ?? d.montoOriginal ?? 0,
                    descuento: 0,
                    retencion: d.retencion ?? 0,
                    pagado: d.pagado ?? d.acreditado ?? 0,
                    pendiente: pendienteEfectivo(d),
                }))];
        });
    }, []);
    // ===== Loading state =====
    if (loading) {
        return _jsx(LoadingSpinner, { mensaje: "Cargando documento..." });
    }
    // ===== Estado info =====
    const estado = data?.estado ?? 0;
    const periodo = data?.periodo;
    // ===== Encabezado del formulario =====
    const renderEncabezado = () => (_jsxs(Card, { className: "paces-card", size: "small", title: "Datos de la Transacci\u00F3n Bancaria", style: { marginBottom: 16 }, children: [_jsx(Form, { form: form, layout: "vertical", size: "middle", style: { paddingTop: 24 }, children: _jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, sm: 12, children: _jsx(Form.Item, { name: "tipo", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Tipo Documento", required: true, children: mode === 'editar' && data?.documento?.nombre ? (_jsxs(Text, { style: { padding: '4px 12px', display: 'block', lineHeight: '32px', background: '#f5f5f5', borderRadius: 4 }, children: [toTitleCase(data.documento.nombre), " (", data.documento.codigo, ")"] })) : (_jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "label", placeholder: " ", value: tipoValue || undefined, onChange: (val) => setTipoValue(val || ''), loading: loadingTipos, notFoundContent: !loadingTipos && tipoDocumentoOpciones.length === 0 ? 'No hay tipos disponibles' : undefined, children: tipoDocumentoOpciones.map((t) => (_jsx(Select.Option, { value: t.codigo, label: toTitleCase(t.nombre), children: toTitleCase(t.nombre) }, t.codigo))) })) }) }) }), _jsxs(Col, { xs: 24, sm: 12, children: [_jsx("div", { children: _jsx(FloatingField, { label: "Concepto", required: true, children: _jsx(Input, { placeholder: " ", value: selectedConcepto
                                                ? toTitleCase(selectedConcepto.nombre)
                                                : conceptoSearchText, readOnly: true, suffix: _jsx(SearchOutlined, { style: { cursor: 'pointer', color: 'rgba(0,0,0,0.45)' } }), onClick: () => setConceptoModalOpen(true) }) }) }), _jsx(Form.Item, { name: "concepto", hidden: true, children: _jsx(Input, {}) }), _jsx(ConceptoInfoLabel, { concepto: selectedConcepto })] }), _jsx(Col, { xs: 24, sm: 12, children: _jsx(Form.Item, { name: "fechaDocumento", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Fecha", required: true, children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabledDate: (current) => {
                                            if (!current)
                                                return false;
                                            if (data?.documento?.fechaPermitida === 'MenorIgualFechaDia') {
                                                if (current.isAfter(dayjs(), 'day'))
                                                    return true;
                                            }
                                            const cierre = fechasCierre?.[sucursalActiva];
                                            if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                                return true;
                                            const cierreInv = fechasCierreInv?.[sucursalActiva];
                                            if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                                return true;
                                            return false;
                                        } }) }) }) }), _jsx(Col, { xs: 24, sm: 12, children: _jsx(Form.Item, { name: "entidad", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Entidad", required: true, children: mode === 'editar' && data?.nombreEntidad ? (_jsx(Text, { style: { padding: '4px 12px', display: 'block', lineHeight: '32px', background: '#f5f5f5', borderRadius: 4 }, children: toTitleCase(data.nombreEntidad) })) : mode === 'editar' && selectedEntidad ? (_jsxs(Text, { style: { padding: '4px 12px', display: 'block', lineHeight: '32px', background: '#f5f5f5', borderRadius: 4 }, children: [toTitleCase(selectedEntidad.nombre), " (", selectedEntidad.codigo, ")"] })) : (_jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "label", notFoundContent: !selectedConcepto ? 'Seleccione un concepto primero' : (entidadesCache.length === 0 ? 'No hay entidades disponibles' : undefined), onChange: (val) => {
                                            const ent = entidadesCache.find((e) => e.codigo === val);
                                            setSelectedEntidad(ent || null);
                                        }, onDropdownVisibleChange: (open) => {
                                            if (open && !selectedConcepto) {
                                                message.info('Seleccione un concepto primero');
                                            }
                                        }, children: entidadesCache.map((ent) => (_jsxs(Select.Option, { value: ent.codigo, label: toTitleCase(ent.nombre) + (ent.identificacion ? ` (${ent.identificacion})` : ''), children: [toTitleCase(ent.nombre), ent.identificacion ? ` (${ent.identificacion})` : ''] }, ent.codigo))) })) }) }, selectedConcepto?.codigo || 'empty') }), _jsx(Col, { xs: 24, sm: 12, children: _jsx(Form.Item, { name: "cuentaBancaria", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Cuenta Bancaria", required: true, children: mode === 'editar' ? (_jsx(Text, { style: { padding: '4px 12px', display: 'block', lineHeight: '32px', background: '#f5f5f5', borderRadius: 4 }, children: selectedCuenta ? (() => { const cta = cuentasBancarias.find(c => c.noCuenta === selectedCuenta); return cta ? `${cta.noCuenta} - ${toTitleCase(cta.nombre)}${cta.banco ? ` (${toTitleCase(cta.banco)})` : ''}` : selectedCuenta; })() : 'No disponible' })) : (_jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", placeholder: "Seleccione una cuenta bancaria", value: selectedCuenta || undefined, onChange: (val) => setSelectedCuenta(val || ''), notFoundContent: cuentasBancarias.length === 0 ? 'No hay cuentas disponibles' : undefined, children: cuentasBancarias.map((cta) => (_jsxs(Select.Option, { value: cta.noCuenta, children: [_jsx(BankOutlined, { style: { marginRight: 6, color: '#556ee6' } }), cta.noCuenta, " - ", toTitleCase(cta.nombre), " ", cta.banco ? `(${toTitleCase(cta.banco)})` : ''] }, cta.noCuenta))) })) }) }) }), _jsx(Col, { xs: 24, sm: 12, children: _jsx(Form.Item, { name: "beneficiario", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Beneficiario", children: _jsx(Input, { placeholder: "Nombre del beneficiario" }) }) }) }), _jsx(Col, { xs: 24, sm: 12, children: _jsx(FloatingField, { label: "Sucursal", children: _jsx(Text, { style: { padding: '4px 12px', display: 'block', lineHeight: '32px', background: '#f5f5f5', borderRadius: 4 }, children: obtenerNombreSucursal(String(sucursalActiva)) }) }) }), _jsx(Col, { xs: 24, sm: 12, children: _jsx(Form.Item, { name: "total", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Total", children: _jsx(InputNumber, { style: { width: '100%' }, min: 0, step: 0.01, precision: 2, prefix: monedaSimbolo }) }) }) }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "nota", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Nota", children: _jsx(TextArea, { rows: 3, maxLength: 500, showCount: true }) }) }) }), _jsxs(Col, { xs: 24, children: [_jsx("div", { style: { marginBottom: 8 }, children: _jsxs(Space, { size: [8, 8], wrap: true, children: [editingField === 'referencia' ? (_jsx(Input, { size: "small", style: { width: 200 }, placeholder: "Referencia", autoFocus: true, defaultValue: editingValueRef.current, onChange: (e) => { editingValueRef.current = e.target.value; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                    if (e.key === 'Escape') {
                                                        e.stopPropagation();
                                                        cancelFieldEditor();
                                                    }
                                                } })) : refValue ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('referencia'), children: ["Ref: ", refValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('referencia'), children: [_jsx(PlusOutlined, {}), " Referencia"] })), editingField === 'tasa' ? (_jsx(InputNumber, { size: "small", style: { width: 120 }, min: 0, step: 0.01, placeholder: "Tasa", autoFocus: true, defaultValue: editingValueRef.current, onChange: (val) => { editingValueRef.current = val ?? 1; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                    if (e.key === 'Escape') {
                                                        e.stopPropagation();
                                                        cancelFieldEditor();
                                                    }
                                                } })) : tasaValue !== 1 ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('tasa'), children: ["Tasa: ", tasaValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14, padding: '6px 16px' }, onClick: () => openFieldEditor('tasa'), children: [_jsx(PlusOutlined, {}), " Tasa"] }))] }) }), _jsx(Form.Item, { name: "referencia", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "tasa", hidden: true, children: _jsx(InputNumber, {}) })] })] }) }), _jsxs("div", { style: { display: 'none' }, children: [_jsx(Form.Item, { name: "subTotal", children: _jsx(InputNumber, {}) }), _jsx(Form.Item, { name: "descuento", children: _jsx(InputNumber, {}) }), _jsx(Form.Item, { name: "impuestos", children: _jsx(InputNumber, {}) }), _jsx(Form.Item, { name: "retenciones", children: _jsx(InputNumber, {}) })] })] }));
    // ===== Render principal =====
    return (_jsxs("div", { children: [_jsx(FormularioToolbar, { mode: mode, saving: saving, estado: estado, periodo: periodo, onGuardar: handleGuardar, onCancelar: handleCancelar }), loadingError && (_jsx(Alert, { message: "Error al cargar el formulario de transacci\u00F3n bancaria", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(BuscarConceptoModal, { open: conceptoModalOpen, onClose: () => setConceptoModalOpen(false), onSelect: handleConceptoSelect, sucursal: sucursalActiva, documento: documentCode }), _jsx(BuscarDocumentoModal, { open: buscarDocModalOpen, onClose: () => setBuscarDocModalOpen(false), onSelect: handleDocumentosSeleccionados, tipoEntidad: selectedEntidad?.tipoEntidad?.codigo || 'SUP', codEntidad: selectedEntidad?.codigo || '', origen: (() => {
                    const { documentos } = useCompanyStore.getState().data;
                    const docCodigo = selectedConcepto?.docAGenerar || data?.documento?.codigo || '';
                    const docConfig = docCodigo ? documentos.find((d) => d.codigo === docCodigo) : undefined;
                    const docOrigen = docConfig?.origenCuenta ?? OrigenCuenta.Desconocido;
                    return typeof docOrigen === 'number' ? docOrigen : (docOrigen === 'Credito' ? OrigenCuenta.Credito : OrigenCuenta.Debito);
                })(), documentosIniciales: documentosAsociados.map((d) => d.transaccionAsociadaID ?? d.id), puedeAsignar: true }), renderEncabezado(), _jsx(Card, { className: "paces-card", size: "small", style: { marginTop: 16 }, children: _jsx(Tabs, { defaultActiveKey: "documentos", type: "card", items: [
                        {
                            key: 'documentos',
                            label: `Documentos Asociados (${documentosAsociados.length})`,
                            children: (_jsxs(_Fragment, { children: [_jsx("style", { children: `.input-number-right .ant-input-number-input { text-align: right !important; }` }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, children: [_jsxs("span", { style: { fontSize: 14, fontWeight: 600 }, children: [_jsx(BankOutlined, { style: { marginRight: 6, color: '#556ee6' } }), "Documentos Asociados"] }), _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: () => {
                                                    if (!selectedEntidad?.codigo) {
                                                        message.warning('Seleccione una entidad primero');
                                                        return;
                                                    }
                                                    setBuscarDocModalOpen(true);
                                                }, children: "Agregar" })] }), _jsx(Table, { dataSource: documentosAsociados, rowKey: (r) => r.transaccionAsociadaID ?? r.id, size: "small", pagination: false, scroll: { x: 1260 }, locale: { emptyText: !selectedEntidad?.codigo ? 'Seleccione una entidad para cargar documentos pendientes' : 'No hay documentos asociados' }, columns: [
                                            {
                                                title: 'Fecha',
                                                dataIndex: 'fecha',
                                                key: 'fecha',
                                                width: 110,
                                                render: (v) => v || '-',
                                            },
                                            {
                                                title: 'Documento',
                                                dataIndex: 'documento',
                                                key: 'documento',
                                                width: 160,
                                            },
                                            {
                                                title: 'NCF',
                                                dataIndex: 'nCF',
                                                key: 'nCF',
                                                width: 130,
                                                render: (v) => v || '-',
                                            },
                                            {
                                                title: 'Monto Original',
                                                dataIndex: 'montoOriginal',
                                                key: 'montoOriginal',
                                                width: 130,
                                                align: 'right',
                                                render: (v) => formatNumber(v ?? 0),
                                            },
                                            {
                                                title: 'Acreditado/Abonado',
                                                key: 'pagado',
                                                width: 150,
                                                align: 'right',
                                                render: (_, record) => (_jsx(Text, { type: "secondary", children: formatNumber(record.pagado ?? 0) })),
                                            },
                                            {
                                                title: 'Pendiente',
                                                key: 'pendiente',
                                                width: 130,
                                                align: 'right',
                                                render: (_, record) => (_jsx(Text, { style: { color: record.pendiente > 0 ? '#fa8c16' : undefined }, children: formatNumber(record.pendiente ?? 0) })),
                                            },
                                            {
                                                title: 'Retenciones',
                                                key: 'retencion',
                                                width: 120,
                                                align: 'right',
                                                render: (_, record) => formatNumber(record.retencion ?? 0),
                                            },
                                            {
                                                title: 'Descuento',
                                                key: 'descuento',
                                                width: 140,
                                                align: 'right',
                                                render: (_, record) => (_jsx(InputNumber, { size: "small", style: { width: '100%' }, inputStyle: { textAlign: 'right' }, className: "input-number-right", min: 0, step: 0.01, precision: 2, value: record.descuento, onChange: (val) => handleDescuentoChange(record.transaccionAsociadaID ?? record.id, val) })),
                                            },
                                            {
                                                title: 'Monto',
                                                key: 'monto',
                                                width: 140,
                                                align: 'right',
                                                render: (_, record) => (_jsx(InputNumber, { size: "small", style: { width: '100%' }, inputStyle: { textAlign: 'right' }, className: "input-number-right", min: 0, max: pendienteEfectivo(record), step: 0.01, precision: 2, value: record.monto, onChange: (val) => handleMontoChange(record.transaccionAsociadaID ?? record.id, val) })),
                                            },
                                            {
                                                title: '',
                                                key: 'accion',
                                                width: 50,
                                                render: (_, record) => (_jsx(Button, { type: "text", danger: true, size: "small", icon: _jsx(DeleteOutlined, {}), onClick: () => handleRemoveDoc(record.transaccionAsociadaID ?? record.id) })),
                                            },
                                        ] }), _jsx(Divider, {}), _jsxs("div", { style: { display: 'flex', gap: 24, justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(Text, { type: "secondary", children: "SubTotal:" }), _jsxs(Text, { strong: true, children: [monedaSimbolo, " ", formatNumber(subTotalCalculado)] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(Text, { type: "secondary", children: "Descuento:" }), _jsxs(Text, { strong: true, children: [monedaSimbolo, " ", formatNumber(sumaDescuentos)] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(Text, { type: "secondary", children: "Impuestos:" }), _jsxs(Text, { strong: true, children: [monedaSimbolo, " ", formatNumber(impuestosValue)] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(Text, { type: "secondary", children: "Retenciones:" }), _jsxs(Text, { strong: true, children: [monedaSimbolo, " ", formatNumber(retencionesValue)] })] }), _jsx(Divider, { type: "vertical", style: { height: 30 } }), _jsx("div", { children: _jsxs(Text, { style: { fontSize: 16, fontWeight: 700 }, children: ["Total: ", monedaSimbolo, " ", formatNumber(totalCalculado)] }) })] })] })),
                        },
                        {
                            key: 'asientos',
                            label: `Asientos (${data?.asientos?.length || 0})`,
                            children: (_jsx(AsientosContableTable, { asientos: data?.asientos || [], scroll: { x: 900 } })),
                        },
                        {
                            key: 'historial',
                            label: `Historial (${data?.logs?.length || 0})`,
                            children: (_jsx(LogTable, { dataSource: data?.logs || [], scroll: { x: 900 } })),
                        },
                    ] }) })] }));
};
export default TransaccionBancariaFormulario;
