import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message, Form, Input, InputNumber, Select, DatePicker, Modal, Alert, Empty, } from 'antd';
import { SaveOutlined, CloseOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, ClearOutlined, ExclamationCircleOutlined, EditOutlined, } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { distribucionBalanceApi } from '../../api/distribucionBalanceApi';
import { conceptosApi } from '../../api/conceptosApi';
import { tipoApi } from '../../api/tipoApi';
import { clienteApi } from '../../api/clienteApi';
import { parametrosApi } from '../../api/parametrosApi';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import LogTable from '../../components/LogTable';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import AsientosContableTable from '../../components/AsientosContableTable';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import BuscarDocumentoModal from '../../components/BuscarDocumentoModal/BuscarDocumentoModal';
import { OrigenCuenta } from '../../types/contabilidad';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum } from '../../utils/estadoDocumento';
import { DistribucionBalanceGuide } from './DistribucionBalanceGuide';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
const { TextArea } = Input;
const DistribucionBalanceFormulario = ({ tipoEntidad }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
    const usuario = useAuthStore((s) => s.usuario);
    const permisoModificarAsientos = usuario?.permisosEspeciales?.some((p) => p.codigo === 'pe_modificar_asientos' && p.valor === true) ?? false;
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const screens = Grid.useBreakpoint();
    const mode = id ? 'editar' : 'crear';
    const codigoPantalla = tipoEntidad === 'SUP' ? 'FDBASUP' : 'FDBACLI';
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
    const [asientos, setAsientos] = useState([]);
    const [logs, setLogs] = useState([]);
    const [medidasCache, setMedidasCache] = useState([]);
    const [fechaCierreContable, setFechaCierreContable] = useState(null);
    const [selectedDebitos, setSelectedDebitos] = useState([]);
    const [selectedCreditos, setSelectedCreditos] = useState([]);
    // Concepto modal
    const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
    const [conceptoSearchText, setConceptoSearchText] = useState('');
    // Documentos pendientes modal
    const [pendientesModalOpen, setPendientesModalOpen] = useState(false);
    const [pendientesOrigen, setPendientesOrigen] = useState(1); // 0=Debito, 1=Credito
    const [totalDistribucion, setTotalDistribucion] = useState(0);
    const impuestosBackupRef = useRef(new Map());
    // Refs para la guía
    const tipoRef = useRef(null);
    const conceptoRef = useRef(null);
    const entidadRef = useRef(null);
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
    const sinOC = true;
    const isLarge = screens.xxl === true;
    // Estado
    const estado = data?.estado ?? 0;
    const esCerrado = data?.periodo === 6;
    const esBorrador = estado === 0;
    const esAplicado = estado === 1;
    const esAnulado = estado === 3;
    // ===== Transacciones separadas por origen =====
    const debitos = transaccionesAsociadas.filter((t) => t.origenCuenta?.toLowerCase() === 'debito' || t.origenCuenta === 'D' || t.origenCuenta === '0');
    const creditos = transaccionesAsociadas.filter((t) => t.origenCuenta?.toLowerCase() === 'credito' || t.origenCuenta === 'C' || t.origenCuenta === '1');
    // ===== Totales DBA =====
    const totalDebitosDBA = debitos.reduce((s, t) => s + (t.monto || 0), 0);
    const totalCreditosDBA = creditos.reduce((s, t) => s + (t.monto || 0), 0);
    const pendienteDBA = totalDebitosDBA - totalCreditosDBA;
    const totales = {
        subTotal: data?.subTotal || 0,
        descuento: data?.descuento || 0,
        impuestos: data?.impuestos || 0,
        total: data?.total || 0,
    };
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
            ? `Nueva Distribución de Balance - ${entidadLabel}`
            : `Editar Distribución de Balance - ${entidadLabel}`;
        setPageTitleOverride(pageTitle);
        // Cargar tipos para DBA
        tipoApi.obtenerPorDocumento(sucursalActiva, 'DBA')
            .then((tipos) => setTiposCache(tipos))
            .catch((err) => console.warn('Error al cargar tipos cache', err));
        unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch((err) => console.warn('Error al cargar medidas cache', err));
        parametrosApi.obtenerFechaCierreFiscal(sucursalActiva).then(setFechaCierreContable).catch((err) => console.warn('Error al obtener fecha cierre fiscal', err));
        if (mode === 'crear') {
            form.setFieldsValue({
                fechaDocumento: dayjs(),
                tasa: 1,
            });
            setTotalDistribucion(0);
        }
        return () => {
            resetToolbar();
            setPageTitleOverride('');
        };
    }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, sucursalActiva, form, codigoPantalla, entidadLabel]);
    // ===== Cargar datos en modo editar =====
    useEffect(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoading(true);
        distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            setData(res);
            setTransaccionesAsociadas(res.transaccionesAsociadas || []);
            setAsientos(res.asientos || []);
            setLogs(res.logs || []);
            setSelectedConcepto(res.concepto || null);
            setSelectedEntidad(res.entidad || null);
            if (res.tipo) {
                setSelectedTipo(res.tipo);
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
            });
            setTotalDistribucion(res.total || 0);
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
            const res = await conceptosApi.obtenerEntidadesActivas(sucursalActiva, conceptoCodigo || selectedConcepto?.codigo);
            setEntidadesCache(res || []);
        }
        catch {
            // Fallback
            try {
                if (tipoEntidad === 'CLI') {
                    const clientes = await clienteApi.obtenerActivos(sucursalActiva);
                    setEntidadesCache(clientes || []);
                }
                else {
                    const suplidores = await conceptosApi.obtenerSuplidores(sucursalActiva);
                    setEntidadesCache(suplidores || []);
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
        // REGLA CRÍTICA: Total Débitos == Total Créditos
        if (Math.abs(pendienteDBA) > 0.01) {
            return 'El total de Débitos debe ser igual al total de Créditos. Pendiente: ' + formatNumber(pendienteDBA);
        }
        // Validar asientos cuadrados
        if (asientos.length > 0) {
            const totalDebAsientos = asientos.reduce((s, r) => s + (r.tipoAsiento === 'D' || r.tipoAsiento === 0 ? r.monto : 0), 0);
            const totalCreAsientos = asientos.reduce((s, r) => s + (r.tipoAsiento === 'C' || r.tipoAsiento === 1 ? r.monto : 0), 0);
            if (Math.abs(totalDebAsientos - totalCreAsientos) > 0.01) {
                return 'Los asientos contables no están cuadrados';
            }
        }
        if (values.nota && values.nota.length > 500) {
            return 'La nota no puede exceder 500 caracteres';
        }
        return null;
    };
    // ===== Pendiente efectivo por fila =====
    // DOCASOC.PENDIENTE puede venir mal (0) cuando en realidad DEBITADO - ACREDITADO != 0.
    // El pendiente efectivo se calcula como max(montoOriginal - pagado, saldoPendiente), nunca negativo.
    const pendienteEfectivo = (t) => {
        const v = Math.max(0, (t.montoOriginal || 0) - (t.pagado || 0), t.saldoPendiente || 0);
        return Math.round(v * 100) / 100;
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
        // Asegurar documento con origenCuenta desde companyStore
        const { documentos } = useCompanyStore.getState().data;
        const docConfig = documentos.find((d) => d.codigo === 'DBA');
        const docOrigenCuenta = base.documento?.origenCuenta ?? docConfig?.origenCuenta ?? OrigenCuenta.Desconocido;
        const documento = base.documento?.codigo
            ? { ...base.documento, origenCuenta: docOrigenCuenta }
            : { codigo: 'DBA', origenCuenta: docOrigenCuenta };
        // Asegurar entidad con tipoEntidad
        const tipoEntidadStr = tipoEntidad;
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
            total: totalDistribucion,
            subTotal: base.subTotal || 0,
            descuento: base.descuento || 0,
            impuestos: base.impuestos || 0,
            tipoDocumento: 'DBA',
            tipoEntidad,
            documento,
            concepto: selectedConcepto || { nombre: '', codigo: '' },
            codigoTipo: selectedTipo?.codigo || values.tipo || '',
            codigoEntidad: entidadSel?.codigo || selectedEntidad?.codigo || entidad.codigo || base.codigoEntidad || '',
            codigoConcepto: selectedConcepto?.codigo || base.codigoConcepto || '',
            codigoSucursal: base.codigoSucursal || (data?.sucursal?.sucursal !== undefined ? String(data.sucursal.sucursal) : String(sucursalActiva)),
            codigoMoneda: (base.moneda || getMonedaSucursalActiva())?.codigo || base.codigoMoneda || '',
            nombreEntidad: entidad.nombre || base.nombreEntidad || '',
            entidad,
            moneda: base.moneda || getMonedaSucursalActiva(),
            transaccionesAsociadas: transaccionesAsociadas.map((t) => ({
                ...t,
                transaccionAsociadaID: t.transaccionAsociadaID || t.id,
                saldoPendiente: pendienteEfectivo(t),
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
                const result = await distribucionBalanceApi.crear(sucursalActiva, dto);
                message.success('Distribución de Balance creada exitosamente');
                navigate(`/${codigoPantalla}/${result.id}`, { replace: true });
            }
            else {
                await distribucionBalanceApi.actualizar(sucursalActiva, dto);
                message.success('Distribución de Balance actualizada exitosamente');
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
            const asientosGenerados = await distribucionBalanceApi.generarAsientos(sucursalActiva, dto);
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
        // === ConfigurarMoneda ===
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
        // === NoImpuesto: si el concepto no acepta impuestos, mostrar advertencia ===
        if (concepto.noImpuesto) {
            const hayRetenciones = transaccionesAsociadas.some((t) => (t.retencion || 0) > 0);
            if (hayRetenciones) {
                message.warning('El Concepto no acepta Impuestos/Retenciones. Verifique las retenciones en documentos relacionados.');
            }
        }
    };
    const handleConceptoSearchClick = () => setConceptoModalOpen(true);
    // ===== Documentos pendientes =====
    const handleOpenDocumentosPendientes = (origen) => {
        const entidadCodigo = selectedEntidad?.codigo || form.getFieldValue('entidad');
        if (!entidadCodigo) {
            message.warning(`Debe seleccionar un ${entidadLabel} primero`);
            return;
        }
        setPendientesOrigen(origen);
        setPendientesModalOpen(true);
    };
    const handleSelectDocumentosPendientes = (docs) => {
        if (!docs || docs.length === 0)
            return;
        // Asignar origenCuenta según el origen con que se abrió el modal
        // Si origen=1 (Credito) → los docs seleccionados son DÉBITOS en la DBA
        // Si origen=0 (Debito) → los docs seleccionados son CRÉDITOS en la DBA
        const origenStr = pendientesOrigen === 1 ? 'Debito' : 'Credito';
        const docsConOrigen = docs.map((d) => ({
            ...d,
            origenCuenta: d.origenCuenta ?? origenStr,
        }));
        setTransaccionesAsociadas((prev) => {
            const existingIds = new Set(prev.map((t) => t.transaccionAsociadaID || t.id));
            const nuevos = docsConOrigen.filter((d) => !existingIds.has(d.transaccionAsociadaID || d.id));
            return [...prev, ...nuevos];
        });
        setPendientesModalOpen(false);
    };
    const handleConceptoClear = () => {
        setSelectedConcepto(null);
        setConceptoSearchText('');
        setEntidadesCache([]);
        form.setFieldsValue({ concepto: '', entidad: undefined });
    };
    // ===== Handle monto change en transacción asociada =====
    const handleAsociadaMontoChange = (id, value) => {
        if (!id)
            return;
        setTransaccionesAsociadas((prev) => prev.map((t) => {
            if ((t.transaccionAsociadaID || t.id) !== id)
                return t;
            const monto = value ?? 0;
            return { ...t, monto: Math.min(monto, pendienteEfectivo(t)) };
        }));
    };
    // ===== Handlers de eliminación =====
    const handleEliminarFila = (id) => {
        setTransaccionesAsociadas((prev) => prev.filter((t) => {
            const tid = t.transaccionAsociadaID || t.id;
            return tid !== id;
        }));
        setSelectedDebitos([]);
        setSelectedCreditos([]);
    };
    const handleEliminarSeleccionados = (tipo) => {
        const selected = tipo === 'debito' ? selectedDebitos : selectedCreditos;
        if (selected.length === 0)
            return;
        Modal.confirm({
            title: 'Eliminar documentos',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: `¿Está seguro de eliminar ${selected.length} documento(s) seleccionados?`,
            okText: 'Sí, eliminar',
            cancelText: 'No',
            okButtonProps: { danger: true },
            onOk: () => {
                const idsAEliminar = new Set(selected);
                setTransaccionesAsociadas((prev) => prev.filter((t) => {
                    const tid = t.transaccionAsociadaID || t.id;
                    return !idsAEliminar.has(tid);
                }));
                if (tipo === 'debito')
                    setSelectedDebitos([]);
                else
                    setSelectedCreditos([]);
            },
        });
    };
    // ===== Columnas de transacciones asociadas =====
    const asociadasColumns = [
        { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 100, render: (v) => formatDate(v) },
        {
            title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140,
            render: (v) => _jsx("span", { style: { fontWeight: 600 }, children: v }),
        },
        { title: 'NCF', dataIndex: 'nCF', key: 'nCF', width: 130, render: (v) => v || '-' },
        {
            title: 'Monto Original', dataIndex: 'montoOriginal', key: 'montoOriginal', width: 120, align: 'right',
            render: (v) => formatNumber(v),
        },
        {
            title: 'Abonado', dataIndex: 'pagado', key: 'pagado', width: 110, align: 'right',
            render: (v) => formatNumber(v),
        },
        {
            title: 'Pendiente', dataIndex: 'saldoPendiente', key: 'saldoPendiente', width: 110, align: 'right',
            render: (_, record) => _jsx("strong", { children: formatNumber(pendienteEfectivo(record)) }),
        },
        {
            title: 'Retención', dataIndex: 'retencion', key: 'retencion', width: 100, align: 'right',
            render: (v) => (v ? formatNumber(v) : '-'),
        },
        {
            title: 'Monto', key: 'monto', width: 120, align: 'right',
            render: (_, record) => (_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, max: pendienteEfectivo(record), step: 0.01, precision: 2, value: record.monto, onChange: (val) => handleAsociadaMontoChange(record.transaccionAsociadaID || record.id, val) })),
        },
        {
            title: '',
            key: 'accion',
            width: 50,
            render: (_, record) => (_jsx(Button, { type: "text", size: "small", danger: true, icon: _jsx(DeleteOutlined, {}), onClick: (e) => {
                    e.stopPropagation();
                    handleEliminarFila(record.transaccionAsociadaID || record.id);
                } })),
        },
    ];
    // ===== Handle refresh =====
    const handleRefresh = useCallback(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoadingError(false);
        setLoading(true);
        distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            setData(res);
            setTransaccionesAsociadas(res.transaccionesAsociadas || []);
            setAsientos(res.asientos || []);
            setLogs(res.logs || []);
            setSelectedConcepto(res.concepto || null);
            setSelectedEntidad(res.entidad || null);
            if (res.tipo)
                setSelectedTipo(res.tipo);
            const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
            form.setFieldsValue({
                tipo: res.tipo?.codigo || res.codigoTipo || '',
                concepto: res.concepto?.codigo || '',
                entidad: res.entidad?.codigo || res.codigoEntidad || '',
                fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                ncf: res.ncf || '', referencia: res.referencia || '',
                tasa: res.tasa || 1, nota: res.nota || '',
            });
            setTotalDistribucion(res.total || 0);
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
    const estadoInfo = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Borrador', color: 'default' };
    // ===== Encabezado =====
    const documentoTieneTipos = tiposCache.length > 0;
    const renderEncabezado = () => (_jsx(Card, { className: "paces-card", size: "small", title: "Datos Generales", extra: _jsx(EstadoTag, { estado: estado, periodo: data?.periodo }), style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: 16, children: [_jsx(Col, { xs: 24, xxl: 18, children: _jsx(Form, { form: form, layout: "vertical", size: "small", style: { paddingTop: 24 }, children: _jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, sm: 12, lg: 9, ref: tipoRef, children: _jsx(Form.Item, { name: "tipo", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Tipo", children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", onChange: (val) => {
                                                    const t = tiposCache.find((tc) => tc.codigo === val);
                                                    setSelectedTipo(t || null);
                                                }, children: tiposCache.map((t) => (_jsxs(Select.Option, { value: t.codigo, children: [t.codigo, " - ", toTitleCase(t.nombre)] }, t.codigo))) }) }) }) }), _jsxs(Col, { xs: 24, sm: 12, lg: 15, children: [_jsx("div", { ref: conceptoRef, children: _jsx(FloatingField, { label: "Concepto", required: true, children: _jsx(Input, { placeholder: " ", value: selectedConcepto ? `${selectedConcepto.codigo || ''} - ${toTitleCase(selectedConcepto.nombre)}` : conceptoSearchText, readOnly: true, disabled: documentoTieneTipos && !selectedTipo, suffix: _jsxs(Space, { size: 4, children: [_jsx(SearchOutlined, { onClick: () => (!documentoTieneTipos || selectedTipo) && handleConceptoSearchClick(), style: { cursor: (!documentoTieneTipos || selectedTipo) ? 'pointer' : 'not-allowed', color: 'rgba(0,0,0,0.45)' } }), selectedConcepto && _jsx(ClearOutlined, { onClick: handleConceptoClear, style: { cursor: 'pointer' } })] }), onClick: () => (!documentoTieneTipos || selectedTipo) && handleConceptoSearchClick() }) }) }), _jsx(Form.Item, { name: "concepto", hidden: true, children: _jsx(Input, {}) }), _jsx(ConceptoInfoLabel, { concepto: selectedConcepto })] }), _jsx(Col, { xs: 24, sm: 12, lg: 9, children: _jsx(Form.Item, { name: "fechaDocumento", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Fecha", required: true, children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabledDate: (current) => {
                                                    if (!current)
                                                        return false;
                                                    const cierre = fechasCierre?.[sucursalActiva];
                                                    if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                                        return true;
                                                    const cierreInv = fechasCierreInv?.[sucursalActiva];
                                                    if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                                        return true;
                                                    return false;
                                                } }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 15, ref: entidadRef, children: _jsx(Form.Item, { name: "entidad", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: entidadLabel, required: true, children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", onChange: (val) => {
                                                    const ent = entidadesCache.find((e) => e.codigo === val);
                                                    setSelectedEntidad(ent || null);
                                                }, children: entidadesCache.map((ent) => (_jsxs(Select.Option, { value: ent.codigo, children: [toTitleCase(ent.nombre), ent.identificacion ? ` (${ent.identificacion})` : ''] }, ent.codigo))) }) }) }) }), _jsxs(Col, { xs: 24, children: [_jsx("div", { style: { marginBottom: 16 }, children: _jsxs(Space, { size: [8, 8], wrap: true, children: [_jsx("div", { children: editingField === 'ncf' ? (_jsx(Input, { size: "small", style: { width: 200 }, placeholder: "NCF", maxLength: 19, autoFocus: true, defaultValue: editingValueRef.current, onChange: (e) => { editingValueRef.current = e.target.value; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
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
                                                        } })) : tasaValue !== 1 ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => openFieldEditor('tasa'), children: ["Tasa: ", tasaValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => openFieldEditor('tasa'), children: [_jsx(PlusOutlined, {}), " Tasa"] })), _jsx(InputNumber, { size: "small", style: { width: 150 }, min: 0, step: 0.01, precision: 2, placeholder: "Total", value: totalDistribucion, onChange: (val) => setTotalDistribucion(val || 0), addonBefore: "Total" })] }) }), _jsx(Form.Item, { name: "ncf", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "referencia", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "tasa", hidden: true, children: _jsx(InputNumber, {}) }), _jsx(Form.Item, { name: "moneda", hidden: true, children: _jsx(Input, {}) })] }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "nota", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Nota", children: _jsx(TextArea, { rows: 3, maxLength: 500, showCount: true }) }) }) })] }) }) }), _jsx(Col, { xs: 24, xxl: 6, children: _jsx("div", { style: { marginTop: 24 }, children: _jsx(TotalesCard, { subTotal: totales.subTotal, descuento: totales.descuento, impuestos: totales.impuestos, total: totales.total, hideTitle: true }) }) })] }) }));
    // ===== Footer de Totales DBA =====
    const BalanceFooter = () => (_jsx(Card, { className: "paces-card", size: "small", style: { marginTop: 16 }, children: _jsxs(Row, { gutter: [16, 8], children: [_jsxs(Col, { xs: 8, style: { textAlign: 'center' }, children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Total D\u00E9bitos" }), _jsx("div", { style: { fontSize: 16, fontWeight: 700, color: '#389e0d' }, children: formatNumber(totalDebitosDBA) })] }), _jsxs(Col, { xs: 8, style: { textAlign: 'center' }, children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Total Cr\u00E9ditos" }), _jsx("div", { style: { fontSize: 16, fontWeight: 700, color: '#389e0d' }, children: formatNumber(totalCreditosDBA) })] }), _jsxs(Col, { xs: 8, style: { textAlign: 'center' }, children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Pendiente" }), _jsx("div", { style: {
                                fontSize: 16,
                                fontWeight: 700,
                                color: Math.abs(pendienteDBA) > 0.01 ? '#ff4d4f' : '#389e0d',
                            }, children: formatNumber(pendienteDBA) })] })] }) }));
    // ===== Tabs =====
    const tabItems = [];
    // Tab 1: Débitos
    tabItems.push({
        key: 'debitos',
        label: `Débitos (${debitos.length})`,
        children: (_jsxs("div", { children: [_jsxs("div", { style: { marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsx(Button, { type: "dashed", icon: _jsx(PlusOutlined, {}), onClick: () => handleOpenDocumentosPendientes(1), children: "Agregar documentos" }), _jsx("div", { style: { flex: 1 } }), selectedDebitos.length > 0 && (_jsxs(Button, { danger: true, icon: _jsx(DeleteOutlined, {}), onClick: () => handleEliminarSeleccionados('debito'), children: ["Eliminar (", selectedDebitos.length, ")"] }))] }), _jsx(Table, { dataSource: debitos, columns: asociadasColumns, rowKey: (r) => r.transaccionAsociadaID || r.id || Math.random(), size: "small", pagination: false, scroll: { x: 1100 }, rowSelection: {
                        selectedRowKeys: selectedDebitos,
                        onChange: (keys) => setSelectedDebitos(keys),
                    }, summary: () => (_jsx(Table.Summary, { fixed: true, children: _jsxs(Table.Summary.Row, { children: [_jsx(Table.Summary.Cell, { index: 0, colSpan: 7, align: "right", children: _jsx("strong", { children: "Total D\u00E9bitos:" }) }), _jsx(Table.Summary.Cell, { index: 7, align: "right", children: _jsx("strong", { style: { color: '#389e0d' }, children: formatNumber(totalDebitosDBA) }) })] }) })), locale: {
                        emptyText: (_jsx("div", { style: { minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin registros" }) })),
                    } })] })),
    });
    // Tab 2: Créditos
    tabItems.push({
        key: 'creditos',
        label: `Créditos (${creditos.length})`,
        children: (_jsxs("div", { children: [_jsxs("div", { style: { marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsx(Button, { type: "dashed", icon: _jsx(PlusOutlined, {}), onClick: () => handleOpenDocumentosPendientes(0), children: "Agregar documentos" }), _jsx("div", { style: { flex: 1 } }), selectedCreditos.length > 0 && (_jsxs(Button, { danger: true, icon: _jsx(DeleteOutlined, {}), onClick: () => handleEliminarSeleccionados('credito'), children: ["Eliminar (", selectedCreditos.length, ")"] }))] }), _jsx(Table, { dataSource: creditos, columns: asociadasColumns, rowKey: (r) => r.transaccionAsociadaID || r.id || Math.random(), size: "small", pagination: false, scroll: { x: 1100 }, rowSelection: {
                        selectedRowKeys: selectedCreditos,
                        onChange: (keys) => setSelectedCreditos(keys),
                    }, summary: () => (_jsx(Table.Summary, { fixed: true, children: _jsxs(Table.Summary.Row, { children: [_jsx(Table.Summary.Cell, { index: 0, colSpan: 7, align: "right", children: _jsx("strong", { children: "Total Cr\u00E9ditos:" }) }), _jsx(Table.Summary.Cell, { index: 7, align: "right", children: _jsx("strong", { style: { color: '#389e0d' }, children: formatNumber(totalCreditosDBA) }) })] }) })), locale: {
                        emptyText: (_jsx("div", { style: { minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin registros" }) })),
                    } })] })),
    });
    // Tab 3: Asientos Contables
    tabItems.push({
        key: 'asientos',
        label: `Asientos Contables (${asientos.length})`,
        children: (permisoModificarAsientos && estado === 0 && !selectedConcepto?.noAsientos) ? (_jsx(AsientosContableEditables, { asientos: asientos, onChange: setAsientos, editable: true, onGenerar: handleGenerarAsientos, generando: saving })) : (_jsx(AsientosContableTable, { asientos: asientos })),
    });
    // Tab 4: Historial
    tabItems.push({
        key: 'historial',
        label: `Historial (${logs.length})`,
        children: (_jsx(LogTable, { dataSource: logs, scroll: { x: 900 } })),
    });
    // ===== Render principal =====
    return (_jsxs("div", { children: [_jsx(FormularioToolbar, { saving: saving, estado: estado, periodo: data?.periodo, onGuardar: handleGuardar, onCancelar: handleCancelar }), loadingError && (_jsx(Alert, { message: "Error al cargar formulario de distribuci\u00F3n de balance", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(BuscarConceptoModal, { open: conceptoModalOpen, onClose: () => setConceptoModalOpen(false), onSelect: handleConceptoSelect, sucursal: sucursalActiva, documento: "DBA", tipo: selectedTipo?.codigo }), _jsx(BuscarDocumentoModal, { open: pendientesModalOpen, onClose: () => setPendientesModalOpen(false), onSelect: handleSelectDocumentosPendientes, tipoEntidad: tipoEntidad, codEntidad: selectedEntidad?.codigo || form.getFieldValue('entidad') || '', origen: pendientesOrigen, montoTotal: totalDistribucion, puedeAsignar: true, documentosIniciales: transaccionesAsociadas
                    .map(t => t.id || t.transaccionAsociadaID)
                    .filter((id) => id != null && id > 0), documentoEnviado: data?.noDocumento ? `DBA-${data.noDocumento}` : undefined }), isLarge ? (_jsx(Row, { gutter: 16, children: _jsxs(Col, { xxl: 24, children: [renderEncabezado(), _jsx(Tabs, { defaultActiveKey: "debitos", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: tabItems }), _jsx(BalanceFooter, {})] }) })) : (_jsxs("div", { children: [renderEncabezado(), _jsx(Tabs, { defaultActiveKey: "debitos", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: tabItems }), _jsx(BalanceFooter, {})] })), (mode === 'crear' || esBorrador) && (_jsx(DistribucionBalanceGuide, { mode: mode, tipo: selectedTipo, concepto: selectedConcepto, entidad: selectedEntidad, detallesCount: debitos.length + creditos.length, tipoRef: tipoRef, conceptoRef: conceptoRef, entidadRef: entidadRef }))] }));
};
export default DistribucionBalanceFormulario;
