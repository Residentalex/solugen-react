import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Table, Button, Row, Col, Select, Input, Tag, Badge, Typography, message, notification, Modal, Space, Switch, Tooltip, Tabs, Form, InputNumber, Segmented, Alert, Empty, Descriptions, } from 'antd';
import { SearchOutlined, ReloadOutlined, PlayCircleOutlined, RiseOutlined, AlertOutlined, CheckCircleOutlined, SyncOutlined, DeleteOutlined, ClockCircleOutlined, CopyOutlined, InfoCircleOutlined, } from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import { hangfireApi } from '../../api/hangfireApi';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text, Title } = Typography;
// â”€â”€ Constantes â”€â”€
const MODULO_MAP = {
    Inventario: { label: 'Inventario', color: 'blue' },
    Compras: { label: 'Compras', color: 'cyan' },
    DGII: { label: 'DGII', color: 'purple' },
    Facturacion: { label: 'Facturacion', color: 'geekblue' },
    Transferencias: { label: 'Transferencias', color: 'orange' },
};
const ESTADO_BADGE = {
    Exitoso: { status: 'success', text: 'Exitoso' },
    Fallido: { status: 'error', text: 'Fallido' },
    Ejecutando: { status: 'processing', text: 'Ejecutando' },
    NuncaEjecutado: { status: 'default', text: 'Nunca ejecutado' },
};
// â”€â”€ Helpers â”€â”€
function formatFecha(val) {
    if (!val)
        return '-';
    try {
        const d = new Date(val);
        if (isNaN(d.getTime()))
            return val;
        return d.toLocaleDateString('es-DO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
    catch {
        return val;
    }
}
function formatDuracion(seg) {
    if (seg === null || seg === undefined)
        return '-';
    return `${seg.toFixed(1)}s`;
}
function detectarFrecuencia(cron) {
    const horasMatch = cron.match(/^0 \*\/(\d+) \* \* \*$/);
    if (horasMatch)
        return { tipo: 'hours', valor: parseInt(horasMatch[1], 10) };
    const minutosMatch = cron.match(/^\*\/(\d+) \* \* \* \*$/);
    if (minutosMatch)
        return { tipo: 'minutes', valor: parseInt(minutosMatch[1], 10) };
    return { tipo: 'custom', valor: 0 };
}
function describirCron(cron) {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5)
        return 'Expresión personalizada';
    const [min, hour, dom, month, dow] = parts;
    // Cada X horas
    if (min === '0' && hour.startsWith('*/')) {
        const h = hour.replace('*/', '');
        return `Cada ${h} horas, todos los días`;
    }
    // Cada X minutos
    if (hour === '*' && min.startsWith('*/')) {
        const m = min.replace('*/', '');
        return `Cada ${m} minutos`;
    }
    // Una hora específica cada día
    if (min === '0' && hour !== '*' && !hour.includes('/') && dom === '*' && month === '*' && dow === '*') {
        return `A las ${hour.padStart(2, '0')}:00, todos los días`;
    }
    return 'Expresión personalizada';
}
function buildInitialFormState(template) {
    const freq = detectarFrecuencia(template.cronDefault);
    return {
        sucursal: '',
        destino: '',
        frecuenciaTipo: freq.tipo,
        horas: freq.tipo === 'hours' ? freq.valor : 1,
        minutos: freq.tipo === 'minutes' ? freq.valor : 30,
        cron: template.cronDefault,
    };
}
// â”€â”€ Componente principal â”€â”€
const Automatizaciones = () => {
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const sucursalesPermitidas = useAuthStore((s) => s.sucursalesPermitidas);
    const sucursalesData = useCompanyStore((s) => s.data.sucursales);
    // â”€â”€ Jobs state â”€â”€
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [resumenInfo, setResumen] = useState({
        total: 0,
        fallidos: 0,
        exitosos: 0,
    });
    const [searchText, setSearchText] = useState('');
    const [filtroModulo, setFiltroModulo] = useState(undefined);
    const [kpiActiveCell, setKpiActiveCell] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const intervalRef = useRef(null);
    const { data: jobsQuery, isLoading, isError, refetch } = useQuery({
        queryKey: ['automatizacionesJobs'],
        queryFn: async () => {
            const data = await hangfireApi.obtenerJobs();
            return {
                jobs: data.jobs || [],
                resumen: {
                    total: data.total ?? data.jobs?.length ?? 0,
                    fallidos: data.fallidos ?? 0,
                    exitosos: data.exitosos ?? 0,
                },
            };
        },
        placeholderData: (prev) => prev,
    });
    const jobs = jobsQuery?.jobs || [];
    const resumen = jobsQuery?.resumen || { total: 0, fallidos: 0, exitosos: 0 };
    useEffect(() => {
        if (jobsQuery?.resumen) {
            setResumen(jobsQuery.resumen);
        }
    }, [jobsQuery?.resumen]);
    const [errorModal, setErrorModal] = useState({
        visible: false,
        job: null,
    });
    const [detalleJobModal, setDetalleJobModal] = useState({
        visible: false,
        job: null,
    });
    // â”€â”€ Templates state â”€â”€
    const [templates, setTemplates] = useState([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);
    const [templateForm, setTemplateForm] = useState(null);
    const [initialFormData, setInitialFormData] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [templateSearchText, setTemplateSearchText] = useState('');
    const [templateFiltroModulo, setTemplateFiltroModulo] = useState(undefined);
    const [formError, setFormError] = useState(null);
    // â”€â”€ UI state â”€â”€
    const [activeTab, setActiveTab] = useState('jobs');
    // â”€â”€ Sucursales â”€â”€
    const sucursalOptions = useMemo(() => {
        // Mapa de nombre mostrado a nombre del enum (sin espacios)
        const nombreAEnum = {
            'El Ofertazo': 'ElOfertazo',
            'Hiper Romana': 'HiperRomana',
            'Orense Plaza': 'OrensePlaza',
            'Orense Villa Hermosa': 'OrenseVillaHermosa',
        };
        if (sucursalesPermitidas.length > 0) {
            return sucursalesPermitidas.map((s) => ({
                value: nombreAEnum[s.nombre] || s.nombre.replace(/\s+/g, ''),
                label: s.nombre,
            }));
        }
        return (sucursalesData || [])
            .filter((s) => s.sucursal >= 0 && s.sucursal <= 3)
            .map((s) => ({ value: s.nombre, label: s.nombre }));
    }, [sucursalesPermitidas, sucursalesData]);
    // â”€â”€ Computed â”€â”€
    const selectedTemplate = useMemo(() => templates.find((t) => t.tipoJobId === selectedTemplateId) || null, [templates, selectedTemplateId]);
    const isFormDirty = useMemo(() => {
        if (!initialFormData || !templateForm)
            return false;
        return (templateForm.sucursal !== initialFormData.sucursal ||
            templateForm.destino !== initialFormData.destino ||
            templateForm.frecuenciaTipo !== initialFormData.frecuenciaTipo ||
            templateForm.horas !== initialFormData.horas ||
            templateForm.minutos !== initialFormData.minutos ||
            templateForm.cron !== initialFormData.cron);
    }, [templateForm, initialFormData]);
    const jobsActivos = useMemo(() => jobs.filter((j) => j.activo).length, [jobs]);
    // â”€â”€ Cargar templates â”€â”€
    const cargarTemplates = useCallback(async () => {
        setTemplatesLoading(true);
        try {
            const data = await hangfireApi.obtenerTemplates();
            setTemplates(data || []);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar plantillas');
        }
        finally {
            setTemplatesLoading(false);
        }
    }, []);
    // â”€â”€ Inicializar â”€â”€
    useEffect(() => {
        setActiveModule('MAutomatizacion');
        updateToolbar({});
        refetch();
        cargarTemplates();
        return () => {
            resetToolbar();
        };
    }, [setActiveModule, updateToolbar, resetToolbar, cargarTemplates]);
    // â”€â”€ Auto-refresh (solo en tab jobs y sin modal abierto) â”€â”€
    useEffect(() => {
        if (autoRefresh && activeTab === 'jobs') {
            intervalRef.current = setInterval(() => {
                if (!errorModal.visible) {
                    refetch();
                }
            }, 30000);
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [autoRefresh, activeTab, errorModal.visible]);
    // â”€â”€ Auto-seleccionar primer template al entrar al tab registrar â”€â”€
    useEffect(() => {
        if (activeTab === 'registrar' && templates.length > 0 && !selectedTemplateId) {
            handleSelectTemplate(templates[0].tipoJobId);
        }
    }, [activeTab, templates, selectedTemplateId]);
    // â”€â”€ Exportar Excel â”€â”€
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const cols = columns.filter((c) => c.key !== 'acciones');
        exportToExcel({
            fileName: `Automatizaciones_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Automatizaciones',
            companyName,
            columnHeaders: cols.map((c) => c.title),
            dataRows: filteredJobs.map((item) => cols.map((col) => {
                const val = item[col.dataIndex];
                return val !== null && val !== undefined ? String(val) : '';
            })),
        });
    };
    // â”€â”€ Handlers jobs â”€â”€
    const handleSearch = (value) => {
        setSearchText(value);
    };
    const handleRefresh = () => {
        refetch();
        refetch();
    };
    const handleReRegistrarTodos = () => {
        Modal.confirm({
            title: 'Re-registrar todos los jobs',
            content: '¿Está seguro de re-registrar todos los jobs? Esto actualizará las definiciones para que incluyan notificaciones automáticas.',
            okText: 'Re-registrar',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    const result = await hangfireApi.reRegistrarTodos();
                    if (result.errores && result.errores.length > 0) {
                        message.warning(`Procesados ${result.procesados} jobs, pero ocurrieron ${result.errores.length} errores`);
                    }
                    else {
                        message.success(`${result.procesados} jobs re-registrados correctamente`);
                    }
                    refetch();
                }
                catch (err) {
                    message.error(err?.response?.data?.errorMessage || 'Error al re-registrar jobs');
                }
            },
        });
    };
    const handleTrigger = (job) => {
        Modal.confirm({
            title: 'Ejecutar automatización',
            content: `¿Está seguro de ejecutar "${job.nombre}" manualmente?`,
            okText: 'Ejecutar',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await hangfireApi.triggerJob(job.id);
                    message.success(`Job "${job.nombre}" disparado correctamente`);
                    refetch();
                }
                catch (err) {
                    message.error(err?.response?.data?.errorMessage || 'Error al ejecutar job');
                }
            },
        });
    };
    const handleEliminar = (job) => {
        Modal.confirm({
            title: 'Eliminar job',
            content: `¿Está seguro de eliminar "${job.nombre}"?`,
            okText: 'Eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await hangfireApi.eliminarJob(job.id);
                    message.success(`Job "${job.nombre}" eliminado`);
                    refetch();
                }
                catch (err) {
                    message.error(err?.response?.data?.errorMessage || 'Error al eliminar job');
                }
            },
        });
    };
    const handleRowClick = (record) => {
        if (record.ultimoEstado === 'Fallido' && record.error) {
            setErrorModal({ visible: true, job: record });
        }
    };
    const abrirDetalleJob = (job) => {
        setDetalleJobModal({ visible: true, job });
    };
    // â”€â”€ Handlers KPI â”€â”€
    const handleKpiClick = (cell) => {
        if (kpiActiveCell === cell) {
            setKpiActiveCell(null);
        }
        else {
            setKpiActiveCell(cell);
        }
    };
    const handleCopyError = () => {
        if (errorModal.job?.error) {
            navigator.clipboard.writeText(errorModal.job.error).then(() => message.success('Error copiado al portapapeles'), () => message.error('No se pudo copiar el error'));
        }
    };
    // â”€â”€ Handlers templates â”€â”€
    const handleSelectTemplate = (tipoJobId) => {
        if (isFormDirty) {
            Modal.confirm({
                title: 'Cambiar de plantilla',
                content: 'Se perderán los cambios no guardados. ¿Desea continuar?',
                okText: 'Descartar cambios',
                okType: 'danger',
                cancelText: 'Cancelar',
                onOk: () => {
                    doSelectTemplate(tipoJobId);
                },
            });
        }
        else {
            doSelectTemplate(tipoJobId);
        }
    };
    const doSelectTemplate = (tipoJobId) => {
        const template = templates.find((t) => t.tipoJobId === tipoJobId);
        if (!template)
            return;
        setSelectedTemplateId(tipoJobId);
        setFormError(null);
        const initForm = buildInitialFormState(template);
        setTemplateForm(initForm);
        setInitialFormData(initForm);
    };
    const updateFormField = (field, value) => {
        setTemplateForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    };
    const handleFrecuenciaChange = (tipo) => {
        if (!templateForm)
            return;
        if (tipo === 'hours') {
            const h = templateForm.horas || 1;
            setTemplateForm({ ...templateForm, frecuenciaTipo: tipo, cron: `0 */${h} * * *` });
        }
        else if (tipo === 'minutes') {
            const m = templateForm.minutos || 1;
            setTemplateForm({ ...templateForm, frecuenciaTipo: tipo, cron: `*/${m} * * * *` });
        }
        else {
            setTemplateForm({ ...templateForm, frecuenciaTipo: tipo });
        }
    };
    const handleHorasChange = (val) => {
        if (!templateForm)
            return;
        const h = val || 1;
        setTemplateForm({ ...templateForm, horas: h, cron: `0 */${h} * * *` });
    };
    const handleMinutosChange = (val) => {
        if (!templateForm)
            return;
        const m = val || 1;
        setTemplateForm({ ...templateForm, minutos: m, cron: `*/${m} * * * *` });
    };
    const handleRegistrar = async () => {
        if (!selectedTemplate || !templateForm)
            return;
        setFormError(null);
        // Validar campos requeridos
        const missing = [];
        selectedTemplate.parametros.forEach((p) => {
            if (p.requerido) {
                let val = '';
                if (p.tipo === 'sucursal')
                    val = templateForm.sucursal;
                else if (p.tipo === 'destino')
                    val = templateForm.destino;
                else if (p.tipo === 'horas')
                    val = String(templateForm.horas);
                else if (p.tipo === 'minutos')
                    val = String(templateForm.minutos);
                if (!val || val === '0')
                    missing.push(p.label);
            }
        });
        if (missing.length > 0) {
            setFormError(`Complete los campos requeridos: ${missing.join(', ')}`);
            return;
        }
        setSubmitting(true);
        try {
            await hangfireApi.registrarJob({
                tipoJobId: selectedTemplate.tipoJobId,
                sucursal: templateForm.sucursal,
                destino: templateForm.destino || undefined,
                cron: templateForm.cron,
            });
            notification.success({
                message: 'Job registrado correctamente',
                description: (_jsxs("span", { children: [_jsx(Text, { strong: true, children: selectedTemplate.nombre }), " ya est\u00E1 activo"] })),
                duration: 4.5,
                btn: (_jsx(Button, { size: "small", type: "primary", onClick: () => {
                        notification.destroy();
                        setActiveTab('jobs');
                    }, children: "Ver jobs" })),
            });
            // Resetear formulario
            const initForm = buildInitialFormState(selectedTemplate);
            setTemplateForm(initForm);
            setInitialFormData(initForm);
            refetch();
        }
        catch (err) {
            setFormError(err?.response?.data?.errorMessage || `Error al registrar job "${selectedTemplate.nombre}"`);
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleCancelForm = () => {
        if (!selectedTemplate)
            return;
        const initForm = buildInitialFormState(selectedTemplate);
        setTemplateForm(initForm);
        setInitialFormData(initForm);
        setFormError(null);
    };
    const handleTemplateSearch = (value) => {
        setTemplateSearchText(value);
    };
    // â”€â”€ Verificar si form es valido para habilitar boton â”€â”€
    const isFormValid = useMemo(() => {
        if (!selectedTemplate || !templateForm)
            return false;
        for (const p of selectedTemplate.parametros) {
            if (p.requerido) {
                if (p.tipo === 'sucursal' && !templateForm.sucursal)
                    return false;
                if (p.tipo === 'destino' && !templateForm.destino)
                    return false;
                if (p.tipo === 'horas' && !templateForm.horas)
                    return false;
                if (p.tipo === 'minutos' && !templateForm.minutos)
                    return false;
            }
        }
        return true;
    }, [selectedTemplate, templateForm]);
    // â”€â”€ Filtros de jobs â”€â”€
    const modulosDisponibles = useMemo(() => {
        const modulos = new Set();
        jobs.forEach((j) => {
            if (j.modulo)
                modulos.add(j.modulo);
        });
        return Array.from(modulos).sort();
    }, [jobs]);
    const filteredJobs = useMemo(() => {
        let result = jobs;
        if (kpiActiveCell === 'exitosos') {
            result = result.filter((j) => j.ultimoEstado === 'Exitoso');
        }
        else if (kpiActiveCell === 'fallidos') {
            result = result.filter((j) => j.ultimoEstado === 'Fallido');
        }
        else if (kpiActiveCell === 'activos') {
            result = result.filter((j) => j.activo);
        }
        // 'total' = sin filtro de KPI
        if (filtroModulo) {
            result = result.filter((j) => j.modulo === filtroModulo);
        }
        if (searchText) {
            const lower = searchText.toLowerCase();
            result = result.filter((j) => j.nombre.toLowerCase().includes(lower));
        }
        return result;
    }, [jobs, kpiActiveCell, filtroModulo, searchText]);
    // â”€â”€ Templates modulos y filtro â”€â”€
    const modulosTemplates = useMemo(() => {
        const modulos = new Set();
        templates.forEach((t) => {
            if (t.modulo)
                modulos.add(t.modulo);
        });
        return Array.from(modulos).sort();
    }, [templates]);
    const filteredTemplates = useMemo(() => {
        let result = templates;
        if (templateFiltroModulo) {
            result = result.filter((t) => t.modulo === templateFiltroModulo);
        }
        if (templateSearchText) {
            const lower = templateSearchText.toLowerCase();
            result = result.filter((t) => t.nombre.toLowerCase().includes(lower) ||
                (t.descripcion && t.descripcion.toLowerCase().includes(lower)));
        }
        return result;
    }, [templates, templateFiltroModulo, templateSearchText]);
    // â”€â”€ Columnas de la tabla â”€â”€
    const columns = [
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            fixed: 'left',
            width: 220,
            render: (nombre, record) => (_jsxs("span", { className: "paces-doc-link", style: { cursor: 'pointer', color: 'var(--paces-primary)', fontWeight: 600 }, onClick: (e) => {
                    e.stopPropagation();
                    abrirDetalleJob(record);
                }, children: [_jsx(InfoCircleOutlined, { style: { marginRight: 6, fontSize: 13 } }), nombre] })),
        },
        {
            title: 'Módulo',
            dataIndex: 'modulo',
            key: 'modulo',
            width: 140,
            render: (modulo) => {
                if (!modulo)
                    return _jsx(Text, { className: "paces-text-secondary", children: "-" });
                const info = MODULO_MAP[modulo];
                return info ? (_jsx(Tag, { color: info.color, children: info.label })) : (_jsx(Tag, { children: modulo }));
            },
        },
        {
            title: 'Sucursal',
            dataIndex: 'sucursal',
            key: 'sucursal',
            width: 130,
            render: (sucursal) => sucursal ? _jsx(Tag, { color: "default", children: sucursal }) : _jsx(Text, { className: "paces-text-secondary", children: "-" }),
        },
        {
            title: 'Último Estado',
            dataIndex: 'ultimoEstado',
            key: 'ultimoEstado',
            width: 150,
            render: (estado) => {
                const info = ESTADO_BADGE[estado] || { status: 'default', text: estado };
                return (_jsxs(Space, { children: [_jsx(Badge, { status: info.status }), _jsx(Text, { children: info.text })] }));
            },
        },
        {
            title: 'Última Ejecución',
            dataIndex: 'ultimaEjecucion',
            key: 'ultimaEjecucion',
            width: 160,
            render: (val) => (_jsx(Text, { className: "paces-text-secondary", children: formatFecha(val) })),
        },
        {
            title: 'Próxima Ejecución',
            dataIndex: 'proximaEjecucion',
            key: 'proximaEjecucion',
            width: 160,
            render: (val) => (_jsx(Text, { className: "paces-text-secondary", children: formatFecha(val) })),
        },
        {
            title: 'Duración',
            dataIndex: 'duracionSegundos',
            key: 'duracionSegundos',
            width: 90,
            align: 'right',
            render: (val) => (_jsx(Text, { className: "paces-text-secondary", children: formatDuracion(val) })),
        },
        {
            title: 'Cron',
            dataIndex: 'cron',
            key: 'cron',
            width: 110,
            render: (cron) => (_jsx(Tooltip, { title: `Expresión Cron: ${cron}`, children: _jsxs(Space, { size: 4, children: [_jsx(ClockCircleOutlined, { style: { fontSize: 12, color: 'var(--paces-text-secondary)' } }), _jsx(Text, { code: true, className: "paces-text-secondary", style: { fontSize: 10 }, children: cron })] }) })),
        },
        {
            title: 'Activo',
            dataIndex: 'activo',
            key: 'activo',
            width: 80,
            align: 'center',
            render: (activo) => (_jsx(Switch, { size: "small", checked: activo, disabled: true })),
        },
        {
            title: 'Acciones',
            key: 'acciones',
            fixed: 'right',
            width: 90,
            render: (_, record) => (_jsxs(Space, { children: [_jsx(Tooltip, { title: "Ejecutar ahora", children: _jsx(Button, { type: "text", size: "small", icon: _jsx(PlayCircleOutlined, { style: { color: 'var(--paces-primary)', fontSize: 16 } }), onClick: (e) => {
                                e.stopPropagation();
                                handleTrigger(record);
                            } }) }), _jsx(Tooltip, { title: "Eliminar", children: _jsx(Button, { type: "text", size: "small", danger: true, icon: _jsx(DeleteOutlined, { style: { fontSize: 16 } }), onClick: (e) => {
                                e.stopPropagation();
                                handleEliminar(record);
                            } }) })] })),
        },
    ];
    // â”€â”€ Render: Cabecera de pagina â”€â”€
    const renderPageHeader = () => (_jsx("div", { style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
        }, children: _jsxs(Space, { children: [_jsx(PermissionGate, { accion: "CREAR", children: _jsx(Tooltip, { title: "Re-registrar todos los jobs para incluir notificaciones autom\u00E1ticas", children: _jsx(Button, { icon: _jsx(SyncOutlined, {}), onClick: handleReRegistrarTodos, children: "Re-registrar Jobs" }) }) }), _jsx(Tooltip, { title: "Ir a Hangfire Dashboard", children: _jsx(Button, { icon: _jsx(SyncOutlined, {}), onClick: () => window.open('/hangfire', '_blank'), children: "Hangfire Dashboard" }) })] }) }));
    // â”€â”€ Render: KPI Strip â”€â”€
    const renderKpiStrip = () => {
        const cells = [
            {
                key: 'total',
                icon: _jsx(SyncOutlined, {}),
                value: resumenInfo.total,
                label: 'jobs',
                color: 'var(--paces-primary)',
                bgColor: 'rgba(85,110,230,0.08)',
            },
            {
                key: 'exitosos',
                icon: _jsx(CheckCircleOutlined, {}),
                value: resumenInfo.exitosos,
                label: 'últimas ejecuciones',
                color: '#34c38f',
                bgColor: 'rgba(52,195,143,0.08)',
            },
            {
                key: 'fallidos',
                icon: _jsx(AlertOutlined, {}),
                value: resumenInfo.fallidos,
                label: 'últimas ejecuciones',
                color: '#f46a6a',
                bgColor: 'rgba(244,106,106,0.08)',
            },
            {
                key: 'activos',
                icon: _jsx(RiseOutlined, {}),
                value: jobsActivos,
                label: 'programados',
                color: '#f0b345',
                bgColor: 'rgba(240,179,69,0.08)',
            },
        ];
        return (_jsx(Card, { className: "paces-card-erp", style: { borderRadius: 8, height: 92, marginBottom: 16, overflow: 'hidden' }, styles: { body: { padding: '16px 20px', height: '100%' } }, children: _jsx("div", { style: { display: 'flex', height: '100%', alignItems: 'stretch' }, children: cells.map((cell, idx) => {
                    const isActive = kpiActiveCell === cell.key;
                    return (_jsxs("div", { onClick: () => handleKpiClick(cell.key), style: {
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            padding: '0 16px',
                            cursor: 'pointer',
                            borderRight: idx < cells.length - 1 ? '1px solid var(--paces-border)' : 'none',
                            borderTop: isActive ? `2px solid ${cell.color}` : '2px solid transparent',
                            background: isActive ? cell.bgColor : 'transparent',
                            transition: 'background 0.2s, border-color 0.2s',
                        }, onMouseEnter: (e) => {
                            if (!isActive) {
                                e.currentTarget.style.background = 'var(--paces-row-hover)';
                            }
                        }, onMouseLeave: (e) => {
                            if (!isActive) {
                                e.currentTarget.style.background = 'transparent';
                            }
                        }, children: [_jsx("div", { style: {
                                    width: 40,
                                    height: 40,
                                    borderRadius: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: `${cell.color}15`,
                                    color: cell.color,
                                    fontSize: 22,
                                    flexShrink: 0,
                                }, children: cell.icon }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 24, fontWeight: 600, lineHeight: 1.2 }, children: cell.value }), _jsx("div", { style: { fontSize: 12, color: 'var(--paces-text-secondary)', lineHeight: 1.3 }, children: cell.label })] })] }, cell.key));
                }) }) }));
    };
    // â”€â”€ Render: Toolbar de tabla â”€â”€
    const renderTableToolbar = () => (_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); setPage(1); }, onReload: handleRefresh, onExportarExcel: handleExportarExcel, filtros: _jsx(Select, { style: { width: 160 }, placeholder: "Todos los m\u00F3dulos", allowClear: true, value: filtroModulo, onChange: (val) => setFiltroModulo(val), options: modulosDisponibles.map((m) => ({ value: m, label: m })) }), acciones: _jsxs(Space, { size: 8, children: [_jsx(Text, { className: "paces-text-secondary", style: { fontSize: 13 }, children: "Auto \u00B7 30s" }), _jsx(Switch, { size: "small", checked: autoRefresh, onChange: (checked) => setAutoRefresh(checked) })] }) }));
    // â”€â”€ Render: Tabla de jobs â”€â”€
    const renderJobsTable = () => {
        const noJobsAtAll = jobs.length === 0 && !isLoading;
        const noResults = filteredJobs.length === 0 && jobs.length > 0 && !isLoading;
        const emptyText = noJobsAtAll ? (_jsx(Empty, { description: "No hay jobs registrados", style: { padding: '40px 0' }, children: _jsx(PermissionGate, { accion: "CREAR", children: _jsx(Button, { type: "primary", onClick: () => setActiveTab('registrar'), children: "Registrar primer job" }) }) })) : noResults ? (_jsx(Empty, { description: "No se encontraron jobs con los filtros actuales", style: { padding: '40px 0' }, children: _jsx(Button, { onClick: () => {
                    setSearchText('');
                    setFiltroModulo(undefined);
                    setKpiActiveCell(null);
                }, children: "Limpiar filtros" }) })) : undefined;
        return (_jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [renderTableToolbar(), _jsx(Table, { columns: columns, dataSource: filteredJobs, rowKey: "id", loading: isLoading, scroll: { x: 1400 }, size: "small", locale: { emptyText }, rowClassName: (record) => record.ultimoEstado === 'Fallido' ? 'paces-row-hover' : 'paces-row-hover', onRow: (record) => ({
                        onClick: () => handleRowClick(record),
                        style: {
                            cursor: 'pointer',
                            background: record.ultimoEstado === 'Fallido' ? 'rgba(244,106,106,0.04)' : undefined,
                        },
                    }), pagination: {
                        current: page,
                        pageSize,
                        onChange: (p) => setPage(p),
                        showSizeChanger: false,
                        showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} jobs`,
                    }, className: "paces-border-top paces-list-table" })] }));
    };
    // â”€â”€ Render: Modal de detalle de job â”€â”€
    const renderDetalleJobModal = () => (_jsx(Modal, { open: detalleJobModal.visible, onCancel: () => setDetalleJobModal({ visible: false, job: null }), width: 600, title: _jsxs(Space, { children: [_jsx(InfoCircleOutlined, { style: { color: 'var(--paces-primary)', fontSize: 18 } }), _jsxs("span", { children: ["Detalle del Job: ", _jsx(Text, { strong: true, children: detalleJobModal.job?.nombre || '' })] })] }), footer: _jsx(Button, { type: "primary", onClick: () => setDetalleJobModal({ visible: false, job: null }), children: "Cerrar" }), children: detalleJobModal.job && (_jsxs(Descriptions, { column: 1, bordered: true, size: "small", style: { marginTop: 16 }, children: [_jsx(Descriptions.Item, { label: "Nombre", children: detalleJobModal.job.nombre }), _jsx(Descriptions.Item, { label: "M\u00F3dulo", children: detalleJobModal.job.modulo || '-' }), _jsx(Descriptions.Item, { label: "Sucursal", children: detalleJobModal.job.sucursal || '-' }), _jsx(Descriptions.Item, { label: "Cron", children: _jsx(Text, { code: true, children: detalleJobModal.job.cron }) }), _jsxs(Descriptions.Item, { label: "\u00DAltimo Estado", children: [_jsx(Badge, { status: ESTADO_BADGE[detalleJobModal.job.ultimoEstado]?.status || 'default' }), ESTADO_BADGE[detalleJobModal.job.ultimoEstado]?.text || detalleJobModal.job.ultimoEstado] }), _jsx(Descriptions.Item, { label: "\u00DAltima Ejecuci\u00F3n", children: formatFecha(detalleJobModal.job.ultimaEjecucion) }), _jsx(Descriptions.Item, { label: "Pr\u00F3xima Ejecuci\u00F3n", children: formatFecha(detalleJobModal.job.proximaEjecucion) }), _jsx(Descriptions.Item, { label: "Duraci\u00F3n", children: formatDuracion(detalleJobModal.job.duracionSegundos) }), _jsx(Descriptions.Item, { label: "Activo", children: _jsx(Switch, { size: "small", checked: detalleJobModal.job.activo, disabled: true }) }), detalleJobModal.job.ultimoEstado === 'Fallido' && detalleJobModal.job.error && (_jsx(Descriptions.Item, { label: "Error", children: _jsx("pre", { style: {
                            background: 'var(--paces-topbar-search-bg)',
                            padding: 12,
                            borderRadius: 6,
                            fontSize: 12,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            maxHeight: 200,
                            overflow: 'auto',
                            color: '#f46a6a',
                            border: '1px solid var(--paces-border)',
                            margin: 0,
                        }, children: detalleJobModal.job.error }) }))] })) }));
    // â”€â”€ Render: Modal de error mejorado â”€â”€
    const renderErrorModal = () => (_jsxs(Modal, { open: errorModal.visible, onCancel: () => setErrorModal({ visible: false, job: null }), width: 720, title: _jsxs(Space, { children: [_jsx(AlertOutlined, { style: { color: '#f46a6a', fontSize: 18 } }), _jsxs("span", { children: ["Error del job: ", _jsx(Text, { strong: true, children: errorModal.job?.nombre || '' })] })] }), footer: _jsxs(Space, { children: [_jsx(Button, { icon: _jsx(CopyOutlined, {}), onClick: handleCopyError, children: "Copiar error" }), _jsx(Button, { type: "primary", onClick: () => setErrorModal({ visible: false, job: null }), children: "Cerrar" })] }), children: [_jsx("div", { style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: [24, 8], children: [_jsxs(Col, { span: 12, children: [_jsx(Text, { className: "paces-text-secondary", style: { fontSize: 12, display: 'block' }, children: "\u00DAltima ejecuci\u00F3n" }), _jsx(Text, { children: formatFecha(errorModal.job?.ultimaEjecucion || null) })] }), _jsxs(Col, { span: 12, children: [_jsx(Text, { className: "paces-text-secondary", style: { fontSize: 12, display: 'block' }, children: "Duraci\u00F3n" }), _jsx(Text, { children: formatDuracion(errorModal.job?.duracionSegundos || null) })] })] }) }), _jsx("pre", { style: {
                    background: 'var(--paces-topbar-search-bg)',
                    padding: 16,
                    borderRadius: 8,
                    fontSize: 12,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 400,
                    overflow: 'auto',
                    color: '#f46a6a',
                    border: '1px solid var(--paces-border)',
                    margin: 0,
                }, children: errorModal.job?.error || 'Sin detalle de error disponible' })] }));
    // â”€â”€ Render: Template List (columna izquierda) â”€â”€
    const renderTemplateList = () => {
        return (_jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, height: '100%' }, styles: { body: { padding: 0 } }, children: [_jsxs("div", { style: { padding: '16px 20px', borderBottom: '1px solid var(--paces-border)' }, children: [_jsxs("div", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 12,
                            }, children: [_jsx(Text, { strong: true, style: { fontSize: 15 }, children: "Tipos disponibles" }), _jsx(Tag, { children: templates.length })] }), _jsx(Input.Search, { placeholder: "Buscar...", allowClear: true, onSearch: handleTemplateSearch, onKeyDown: (e) => {
                                if (e.key === 'Escape') {
                                    e.target.blur();
                                    handleTemplateSearch('');
                                }
                            }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }), style: { width: '100%', marginBottom: 8 } }), _jsx(Select, { style: { width: '100%' }, placeholder: "Filtrar por m\u00F3dulo", allowClear: true, value: templateFiltroModulo, onChange: (val) => setTemplateFiltroModulo(val), options: modulosTemplates.map((m) => ({ value: m, label: m })) })] }), _jsx("div", { style: {
                        maxHeight: 'calc(100vh - 280px)',
                        overflowY: 'auto',
                        padding: 0,
                    }, children: filteredTemplates.length === 0 ? (_jsx("div", { style: { padding: 32, textAlign: 'center' }, children: _jsx(Text, { className: "paces-text-secondary", children: "No hay plantillas disponibles" }) })) : (filteredTemplates.map((template) => {
                        const isSelected = template.tipoJobId === selectedTemplateId;
                        const modInfo = template.modulo ? MODULO_MAP[template.modulo] : null;
                        return (_jsxs("div", { onClick: () => handleSelectTemplate(template.tipoJobId), style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '12px 16px',
                                cursor: 'pointer',
                                borderLeft: isSelected
                                    ? `3px solid var(--paces-primary)`
                                    : '3px solid transparent',
                                background: isSelected ? 'var(--paces-row-hover)' : 'transparent',
                                transition: 'background 0.15s, border-color 0.15s',
                                minHeight: 64,
                                borderBottom: '1px solid var(--paces-border)',
                            }, onMouseEnter: (e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.background = 'var(--paces-row-hover)';
                                }
                            }, onMouseLeave: (e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }, children: [_jsx("div", { style: {
                                        width: 32,
                                        height: 32,
                                        borderRadius: 6,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: modInfo
                                            ? `var(--paces-primary)15`
                                            : 'var(--paces-topbar-search-bg)',
                                        color: 'var(--paces-primary)',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        flexShrink: 0,
                                    }, children: template.nombre.charAt(0).toUpperCase() }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx(Text, { strong: isSelected, style: {
                                                display: 'block',
                                                fontSize: 13,
                                                lineHeight: 1.3,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }, children: template.nombre }), _jsx(Text, { className: "paces-text-secondary", style: {
                                                display: 'block',
                                                fontSize: 12,
                                                lineHeight: '16px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }, children: (template.descripcion || '').substring(0, 60) })] }), modInfo && (_jsx(Tag, { color: modInfo.color, style: { margin: 0, flexShrink: 0 }, children: modInfo.label }))] }, template.tipoJobId));
                    })) })] }));
    };
    // â”€â”€ Render: Template Detail (columna derecha) â”€â”€
    const renderTemplateDetail = () => {
        if (!selectedTemplate || !templateForm) {
            return (_jsx(Card, { className: "paces-card-erp", style: { borderRadius: 8, height: '100%' }, children: _jsx("div", { style: { textAlign: 'center', padding: 48 }, children: _jsx(Text, { className: "paces-text-secondary", children: "Seleccione una plantilla para configurarla" }) }) }));
        }
        const modInfo = selectedTemplate.modulo ? MODULO_MAP[selectedTemplate.modulo] : null;
        // Calcular campos faltantes para tooltip
        const missingFields = [];
        selectedTemplate.parametros.forEach((p) => {
            if (p.requerido) {
                if (p.tipo === 'sucursal' && !templateForm.sucursal)
                    missingFields.push(p.label);
                if (p.tipo === 'destino' && !templateForm.destino)
                    missingFields.push(p.label);
            }
        });
        const formInvalidTooltip = missingFields.length > 0
            ? `Complete los campos requeridos: ${missingFields.join(', ')}`
            : undefined;
        return (_jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, height: '100%' }, styles: { body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }, children: [_jsxs("div", { style: {
                        padding: '12px 24px',
                        borderBottom: '1px solid var(--paces-border)',
                        minHeight: 56,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        flexShrink: 0,
                    }, children: [_jsx("div", { style: {
                                width: 32,
                                height: 32,
                                borderRadius: 6,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: modInfo
                                    ? `var(--paces-primary)15`
                                    : 'var(--paces-topbar-search-bg)',
                                color: 'var(--paces-primary)',
                                fontSize: 14,
                                fontWeight: 600,
                                flexShrink: 0,
                            }, children: selectedTemplate.nombre.charAt(0).toUpperCase() }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(Title, { level: 5, style: { margin: 0 }, children: selectedTemplate.nombre }), modInfo && (_jsx(Tag, { color: modInfo.color, style: { margin: 0, flexShrink: 0 }, children: modInfo.label }))] }), _jsx(Text, { type: "secondary", style: {
                                        fontSize: 13,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        lineHeight: '18px',
                                        maxHeight: 36,
                                    }, children: selectedTemplate.descripcion })] })] }), _jsxs("div", { style: { flex: 1, overflow: 'auto', padding: '20px 24px' }, children: [formError && (_jsx(Alert, { type: "error", message: formError, style: { marginBottom: 16 }, showIcon: true })), _jsxs("div", { style: { marginBottom: 20 }, children: [_jsx(Text, { strong: true, style: { fontSize: 14, display: 'block', marginBottom: 12 }, children: "1. \u00BFDonde se ejecuta?" }), _jsx(Row, { gutter: 16, children: selectedTemplate.parametros.map((param) => {
                                        if (param.tipo === 'sucursal') {
                                            return (_jsx(Col, { xs: 24, md: 12, children: _jsx(Form.Item, { label: param.label, required: param.requerido, style: { marginBottom: 0 }, children: _jsx(Select, { value: templateForm.sucursal || undefined, onChange: (val) => updateFormField('sucursal', val), options: sucursalOptions, placeholder: `Seleccionar ${param.label}`, style: { width: '100%' }, allowClear: true, showSearch: true, optionFilterProp: "label", disabled: submitting }) }) }, param.nombre));
                                        }
                                        if (param.tipo === 'destino') {
                                            return (_jsx(Col, { xs: 24, md: 12, children: _jsx(Form.Item, { label: param.label, required: param.requerido, style: { marginBottom: 0 }, children: _jsx(Select, { value: templateForm.destino || undefined, onChange: (val) => updateFormField('destino', val), options: sucursalOptions, placeholder: `Seleccionar ${param.label}`, style: { width: '100%' }, allowClear: true, showSearch: true, optionFilterProp: "label", disabled: submitting }) }) }, param.nombre));
                                        }
                                        return null;
                                    }) })] }), _jsxs("div", { children: [_jsx(Text, { strong: true, style: { fontSize: 14, display: 'block', marginBottom: 12 }, children: "2. \u00BFCon que frecuencia?" }), _jsx(Segmented, { value: templateForm.frecuenciaTipo, onChange: (val) => handleFrecuenciaChange(val), options: [
                                        { label: 'Cada X horas', value: 'hours' },
                                        { label: 'Cada X minutos', value: 'minutes' },
                                        { label: 'Avanzado (cron)', value: 'custom' },
                                    ], block: true, disabled: submitting, style: { marginBottom: 16 } }), templateForm.frecuenciaTipo === 'hours' && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }, children: [_jsx(InputNumber, { min: 1, max: 24, value: templateForm.horas, onChange: handleHorasChange, style: { width: 100 }, disabled: submitting }), _jsx(Text, { children: "hora(s)" })] })), templateForm.frecuenciaTipo === 'minutes' && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }, children: [_jsx(InputNumber, { min: 1, max: 59, value: templateForm.minutos, onChange: handleMinutosChange, style: { width: 100 }, disabled: submitting }), _jsx(Text, { children: "minuto(s)" })] })), templateForm.frecuenciaTipo === 'custom' && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }, children: [_jsx(Input, { value: templateForm.cron, onChange: (e) => updateFormField('cron', e.target.value), placeholder: "0 * * * *", style: { width: 240 }, disabled: submitting }), _jsx(Tooltip, { title: "https://crontab.guru", children: _jsx(Button, { type: "link", size: "small", style: { fontSize: 12 }, onClick: () => window.open('https://crontab.guru', '_blank'), disabled: submitting, children: "\u00BFAyuda?" }) })] })), _jsxs("div", { style: {
                                        background: 'var(--paces-topbar-search-bg)',
                                        borderRadius: 6,
                                        padding: '10px 14px',
                                    }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }, children: [_jsx(ClockCircleOutlined, { style: { fontSize: 13, color: 'var(--paces-text-secondary)' } }), _jsx(Text, { className: "paces-text-secondary", style: { fontSize: 13 }, children: describirCron(templateForm.cron) })] }), _jsxs(Text, { className: "paces-text-secondary", style: { fontSize: 12 }, children: ["Cron:", ' ', _jsx("code", { style: {
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        color: 'var(--paces-primary)',
                                                    }, children: templateForm.cron })] })] })] })] }), _jsx("div", { style: {
                        position: 'sticky',
                        bottom: 0,
                        background: 'inherit',
                        borderTop: '1px solid var(--paces-border)',
                        padding: '12px 24px',
                        flexShrink: 0,
                    }, children: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Button, { disabled: !isFormDirty, onClick: handleCancelForm, children: "Restablecer" }), _jsx(PermissionGate, { accion: "CREAR", children: _jsx(Tooltip, { title: formInvalidTooltip, children: _jsx(Button, { type: "primary", disabled: !isFormValid, loading: submitting, onClick: handleRegistrar, children: "Registrar automatizaci\u00F3n" }) }) })] }) })] }));
    };
    // â”€â”€ Render: Contenido del tab Jobs â”€â”€
    const renderJobsTab = () => (_jsxs(_Fragment, { children: [renderKpiStrip(), renderJobsTable(), renderErrorModal(), renderDetalleJobModal()] }));
    // â”€â”€ Render: Contenido del tab Registrar â”€â”€
    const renderRegistrarTab = () => {
        if (templatesLoading && templates.length === 0) {
            return (_jsxs("div", { style: { textAlign: 'center', padding: 48 }, children: [_jsx(SyncOutlined, { spin: true, style: { fontSize: 32, color: 'var(--paces-primary)' } }), _jsx("br", {}), _jsx(Text, { className: "paces-text-secondary", style: { marginTop: 12, display: 'block' }, children: "Cargando plantillas..." })] }));
        }
        if (templates.length === 0) {
            return (_jsx(Card, { className: "paces-card-erp", style: { borderRadius: 8 }, children: _jsx(Empty, { description: "No hay plantillas de jobs disponibles." }) }));
        }
        return (_jsxs(Row, { gutter: [24, 24], children: [_jsx(Col, { xs: 24, md: 8, lg: 7, children: renderTemplateList() }), _jsx(Col, { xs: 24, md: 16, lg: 17, children: renderTemplateDetail() })] }));
    };
    // â”€â”€ Render principal â”€â”€
    // Memoizar tabs para evitar re-render completo al escribir en el formulario
    const jobsContent = useMemo(() => renderJobsTab(), [
        jobs, resumenInfo, isLoading, searchText, filtroModulo,
        kpiActiveCell, autoRefresh, filteredJobs, columns, errorModal
    ]);
    const registrarContent = useMemo(() => renderRegistrarTab(), [
        templates, templatesLoading, filteredTemplates, selectedTemplateId,
        templateForm, initialFormData, submitting, formError, templateFiltroModulo,
        sucursalOptions, isFormValid, isFormDirty, templateForm?.frecuenciaTipo
    ]);
    return (_jsxs("div", { children: [isError && (_jsx(Alert, { message: "Error al cargar automatizaciones", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), renderPageHeader(), _jsx(Tabs, { activeKey: activeTab, onChange: (key) => setActiveTab(key), type: "line", tabBarStyle: { marginBottom: 16 }, items: [
                    {
                        key: 'jobs',
                        label: (_jsxs("span", { style: { fontSize: 14, fontWeight: 600 }, children: ["Jobs Registrados", ' ', _jsx(Badge, { count: resumenInfo.total, size: "small", style: { backgroundColor: 'var(--paces-primary)' } })] })),
                        children: jobsContent,
                    },
                    {
                        key: 'registrar',
                        label: (_jsxs("span", { style: { fontSize: 14, fontWeight: 600 }, children: ["Registrar Nuevo", ' ', _jsx(Badge, { count: templates.length, size: "small", style: { backgroundColor: 'var(--paces-primary)' } })] })),
                        children: registrarContent,
                    },
                ], style: { marginTop: 0 } })] }));
};
export default Automatizaciones;
