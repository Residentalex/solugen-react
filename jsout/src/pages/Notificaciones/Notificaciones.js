import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Modal, Descriptions } from 'antd';
import { Table, Tabs, Tag, Button, Tooltip, message, Card, Input, Empty, Row, Col, Select, Skeleton, Alert } from 'antd';
import { SearchOutlined, ReloadOutlined, SendOutlined, CheckOutlined, ClockCircleOutlined, BellOutlined, WarningOutlined, CloseCircleOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';
import PermissionGate from '../../components/PermissionGate';
import { useNotificacionesStore } from '../../stores/notificacionesStore';
import { notificacionesApi } from '../../api/notificacionesApi';
import { ticketApi } from '../../api/ticketApi';
import EnviarNotificacionModal from './EnviarNotificacionModal';
import TicketThreadModal from '../../components/TicketThreadModal';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
function formatFecha(iso) {
    if (!iso)
        return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('es-DO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
const tipoColor = {
    Alerta: 'gold',
    Info: 'blue',
    Error: 'red',
    Advertencia: 'orange',
    Exito: 'green',
    Ticket: 'purple',
};
const Notificaciones = () => {
    const sucursal = useAuthStore((s) => s.compania);
    const usuarioID = useAuthStore((s) => s.usuario?.id);
    const pendientes = useNotificacionesStore((s) => s.pendientes);
    const cargando = useNotificacionesStore((s) => s.cargando);
    const cargarPendientes = useNotificacionesStore((s) => s.cargarPendientes);
    const marcarComoLeida = useNotificacionesStore((s) => s.marcarComoLeida);
    const [enviadas, setEnviadas] = useState([]);
    const [loadingEnviadas, setLoadingEnviadas] = useState(false);
    const [historial, setHistorial] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [pageSize, setPageSize] = useState(25);
    const [modalVisible, setModalVisible] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [tabActiva, setTabActiva] = useState(() => location.state?.tab || 'pendientes');
    const [filtroTipo, setFiltroTipo] = useState([]);
    const [filtroModulo, setFiltroModulo] = useState([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [selectedRow, setSelectedRow] = useState(null);
    const [loadingError, setLoadingError] = useState(false);
    const [verNotificacion, setVerNotificacion] = useState(null);
    const [ticketModalID, setTicketModalID] = useState(null);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    useEffect(() => {
        setActiveModule('notificaciones');
    }, [setActiveModule]);
    const modulosDisponibles = useMemo(() => {
        const modulos = new Set();
        [...pendientes, ...enviadas, ...historial].forEach((n) => { if (n.modulo)
            modulos.add(n.modulo); });
        return Array.from(modulos);
    }, [pendientes, enviadas, historial]);
    const cargarEnviadas = useCallback(async () => {
        if (!sucursal || !usuarioID)
            return;
        setLoadingEnviadas(true);
        try {
            const data = await notificacionesApi.obtenerEnviadas(sucursal, usuarioID);
            setEnviadas(data || []);
            setLoadingError(false);
        }
        catch {
            setLoadingError(true);
        }
        finally {
            setLoadingEnviadas(false);
        }
    }, [sucursal, usuarioID]);
    const cargarHistorial = useCallback(async () => {
        if (!sucursal || !usuarioID)
            return;
        setLoadingHistorial(true);
        try {
            const data = await notificacionesApi.obtenerHistorial(sucursal, usuarioID);
            setHistorial(data || []);
            setLoadingError(false);
        }
        catch {
            setLoadingError(true);
        }
        finally {
            setLoadingHistorial(false);
        }
    }, [sucursal, usuarioID]);
    useEffect(() => {
        const load = async () => {
            try {
                await cargarPendientes();
                setLoadingError(false);
            }
            catch {
                setLoadingError(true);
            }
        };
        load();
        cargarEnviadas();
        cargarHistorial();
    }, [cargarPendientes, cargarEnviadas, cargarHistorial]);
    const handleSearch = (value) => {
        setSearchText(value);
    };
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursal);
        const dataSource = getDataSource();
        const cols = columns.filter((c) => c.key !== 'acciones');
        exportToExcel({
            fileName: `Notificaciones_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Notificaciones',
            companyName,
            columnHeaders: cols.map((c) => c.title),
            dataRows: dataSource.map((item) => cols.map((col) => {
                if (col.key === 'estado') {
                    return item.leida ? 'Leída' : 'No leída';
                }
                const val = item[col.dataIndex];
                return val !== null && val !== undefined ? String(val) : '';
            })),
        });
    };
    const handleRefresh = () => {
        setLoadingError(false);
        cargarPendientes();
        if (tabActiva === 'enviadas' || tabActiva === 'historial') {
            cargarEnviadas();
        }
        cargarHistorial();
    };
    const handleTabChange = (key) => {
        setTabActiva(key);
        setSelectedRowKeys([]);
        setSelectedRow(null);
    };
    const handleMarcarLeida = async (notificacionUsuarioID) => {
        await marcarComoLeida(notificacionUsuarioID);
    };
    const handleMarcarSeleccionadas = async () => {
        try {
            await Promise.all(selectedRowKeys.map((key) => marcarComoLeida(key)));
            message.success(`${selectedRowKeys.length} notificaciones marcadas como leídas`);
            setSelectedRowKeys([]);
            cargarPendientes();
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al marcar notificaciones');
        }
    };
    const getDataSource = () => {
        let source;
        if (tabActiva === 'pendientes') {
            source = pendientes;
        }
        else if (tabActiva === 'enviadas') {
            source = enviadas;
        }
        else {
            source = historial;
        }
        let filtered = source;
        if (searchText) {
            const term = searchText.toLowerCase();
            filtered = filtered.filter((n) => n.titulo.toLowerCase().includes(term) ||
                n.mensaje.toLowerCase().includes(term) ||
                n.modulo?.toLowerCase().includes(term));
        }
        if (filtroTipo.length > 0) {
            filtered = filtered.filter((n) => filtroTipo.includes(n.tipo));
        }
        if (filtroModulo.length > 0) {
            filtered = filtered.filter((n) => filtroModulo.includes(n.modulo));
        }
        return filtered;
    };
    const isLoading = useMemo(() => {
        switch (tabActiva) {
            case 'pendientes': return cargando;
            case 'enviadas': return loadingEnviadas;
            case 'historial': return loadingHistorial;
            default: return false;
        }
    }, [tabActiva, cargando, loadingEnviadas, loadingHistorial]);
    const columns = [
        {
            title: 'Título',
            dataIndex: 'titulo',
            key: 'titulo',
            width: 200,
            ellipsis: true,
            render: (text, record) => (_jsx("a", { onClick: () => setVerNotificacion(record), style: { fontWeight: record.leida ? 400 : 600 }, children: text })),
        },
        {
            title: 'Mensaje',
            dataIndex: 'mensaje',
            key: 'mensaje',
            width: 280,
            ellipsis: true,
            render: (text) => (_jsx("span", { className: "paces-text-secondary", children: text })),
        },
        {
            title: 'Módulo',
            dataIndex: 'modulo',
            key: 'modulo',
            width: 130,
            render: (text) => text ? _jsx(Tag, { style: { fontSize: 11 }, children: text }) : '-',
        },
        {
            title: 'Tipo',
            dataIndex: 'tipo',
            key: 'tipo',
            width: 110,
            render: (text) => (_jsx(Tag, { color: tipoColor[text] || 'default', style: { fontSize: 11 }, children: text || 'Info' })),
        },
        {
            title: 'Fecha',
            dataIndex: 'fechaCreacion',
            key: 'fechaCreacion',
            width: 170,
            render: (text) => (_jsxs("span", { className: "paces-text-secondary", style: { fontSize: 12 }, children: [_jsx(ClockCircleOutlined, { style: { marginRight: 4, fontSize: 10 } }), formatFecha(text)] })),
        },
        {
            title: 'Estado',
            key: 'estado',
            width: 100,
            render: (_, record) => (_jsx(Tag, { color: record.leida ? 'default' : 'blue', style: { fontSize: 11 }, children: record.leida ? 'Leída' : 'No leída' })),
        },
        ...(tabActiva === 'pendientes'
            ? [
                {
                    title: 'Acciones',
                    key: 'acciones',
                    width: 110,
                    fixed: 'right',
                    render: (_, record) => (!record.leida ? (_jsx(Tooltip, { title: "Marcar como le\u00EDda", children: _jsx(Button, { type: "text", size: "small", icon: _jsx(CheckOutlined, {}), onClick: () => handleMarcarLeida(record.notificacionUsuarioID), children: "Leer" }) })) : null),
                },
            ]
            : []),
    ];
    return (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, children: [_jsx("h4", { style: { margin: 0, fontSize: 18, fontWeight: 600 }, children: "Bandeja de Notificaciones" }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx(Button, { onClick: () => navigate('/notificaciones/config'), children: "Configuraci\u00F3n" }), _jsx(Button, { onClick: () => navigate('/notificaciones/personalizadas'), children: "SQL Personalizadas" }), _jsx(PermissionGate, { permisoEspecial: "pe_NOTIFICACION", children: _jsx(Button, { type: "primary", icon: _jsx(SendOutlined, {}), onClick: () => setModalVisible(true), children: "Enviar Notificaci\u00F3n" }) })] })] }), _jsx(Row, { gutter: [24, 24], style: { marginBottom: 24 }, children: [
                    {
                        icon: _jsx(BellOutlined, {}),
                        cssClass: 'paces-stat-card--primary',
                        iconBg: 'rgba(85, 110, 230, 0.1)',
                        iconColor: 'var(--paces-primary)',
                        value: pendientes.length,
                        label: 'Pendientes',
                        change: `${pendientes.length} sin leer`,
                    },
                    {
                        icon: _jsx(WarningOutlined, {}),
                        cssClass: 'paces-stat-card--warning',
                        iconBg: 'rgba(241, 180, 76, 0.1)',
                        iconColor: '#f0b345',
                        value: pendientes.filter((n) => n.tipo === 'Alerta' || n.tipo === 'Advertencia').length,
                        label: 'Alertas',
                        change: 'requieren atención',
                    },
                    {
                        icon: _jsx(CloseCircleOutlined, {}),
                        cssClass: 'paces-stat-card--danger',
                        iconBg: 'rgba(244, 106, 106, 0.1)',
                        iconColor: '#f46a6a',
                        value: pendientes.filter((n) => n.tipo === 'Error').length,
                        label: 'Errores',
                        change: 'últimos 7 días',
                    },
                    {
                        icon: _jsx(ClockCircleOutlined, {}),
                        cssClass: 'paces-stat-card--success',
                        iconBg: 'rgba(52, 195, 143, 0.1)',
                        iconColor: '#34c38f',
                        value: pendientes.length + enviadas.length,
                        label: 'Total',
                        change: 'recibidas',
                    },
                ].map((s, i) => (_jsx(Col, { xs: 24, sm: 12, lg: 6, children: _jsxs("div", { className: `paces-stat-card ${s.cssClass}`, children: [_jsx("div", { className: "paces-stat-icon", style: { background: s.iconBg, color: s.iconColor }, children: s.icon }), _jsxs("div", { children: [_jsx("div", { className: "paces-stat-value", children: s.value }), _jsx("p", { className: "paces-stat-label", children: s.label }), _jsx("div", { className: "paces-stat-change", children: s.change })] })] }) }, i))) }), loadingError && (_jsx(Alert, { message: "Error al cargar notificaciones", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8 }, styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx(Input.Search, { placeholder: "Buscar por t\u00EDtulo, mensaje o m\u00F3dulo...", allowClear: true, onSearch: handleSearch, onKeyDown: (e) => {
                                        if (e.key === 'Escape') {
                                            e.target.blur();
                                            handleSearch('');
                                        }
                                    }, style: { width: 400 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx(Select, { mode: "multiple", placeholder: "Tipo", allowClear: true, style: { minWidth: 120, maxWidth: 200 }, value: filtroTipo, onChange: setFiltroTipo, options: [
                                        { label: 'Alerta', value: 'Alerta' },
                                        { label: 'Info', value: 'Info' },
                                        { label: 'Error', value: 'Error' },
                                        { label: 'Advertencia', value: 'Advertencia' },
                                        { label: 'Éxito', value: 'Exito' },
                                        { label: 'Ticket', value: 'Ticket' },
                                    ] }), _jsx(Select, { mode: "multiple", placeholder: "M\u00F3dulo", allowClear: true, style: { minWidth: 120, maxWidth: 200 }, value: filtroModulo, onChange: setFiltroModulo, options: modulosDisponibles.map((m) => ({ label: m, value: m })) }), _jsx(Select, { style: { width: 65 }, value: pageSize, onChange: (v) => { setPageSize(v); }, options: [
                                        { value: 25, label: '25' },
                                        { value: 50, label: '50' },
                                        { value: 100, label: '100' },
                                    ] }), _jsx("div", { style: { flex: 1 } }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: handleExportarExcel }) }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: handleRefresh })] }) }), selectedRowKeys.length > 0 && tabActiva === 'pendientes' && (_jsxs("div", { style: {
                            background: 'var(--paces-hover-bg)',
                            border: '1px solid var(--paces-border)',
                            borderRadius: 6,
                            padding: '8px 16px',
                            margin: '0 24px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                        }, children: [_jsxs("span", { style: { fontSize: 13 }, children: [selectedRowKeys.length, " seleccionadas"] }), _jsx(Button, { size: "small", type: "primary", icon: _jsx(CheckOutlined, {}), onClick: handleMarcarSeleccionadas, children: "Marcar como le\u00EDdas" }), _jsx(Button, { size: "small", onClick: () => setSelectedRowKeys([]), children: "Cancelar" })] })), _jsx(Tabs, { activeKey: tabActiva, onChange: handleTabChange, style: { padding: '0 24px' }, className: "paces-tabs", items: [
                            {
                                key: 'pendientes',
                                label: `Pendientes (${pendientes.length})`,
                                children: isLoading ? (_jsx("div", { style: { padding: '16px 0' }, children: _jsx(Skeleton, { active: true, paragraph: { rows: 5 } }) })) : (_jsx(Table, { columns: columns, dataSource: getDataSource(), rowKey: "notificacionUsuarioID", className: "paces-border-top paces-list-table", rowClassName: (record) => selectedRow?.notificacionUsuarioID === record.notificacionUsuarioID ? 'paces-row-selected' : 'paces-row-hover', onRow: (record) => ({
                                        onClick: () => setSelectedRow(record),
                                        style: { cursor: 'pointer' },
                                    }), scroll: { x: 1100 }, size: "middle", rowSelection: {
                                        selectedRowKeys,
                                        onChange: (keys) => setSelectedRowKeys(keys),
                                    }, locale: {
                                        emptyText: (_jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No hay notificaciones pendientes" }) })),
                                    }, pagination: {
                                        pageSize,
                                        showSizeChanger: false,
                                        showTotal: (total) => `${total} registros`,
                                    } })),
                            },
                            {
                                key: 'enviadas',
                                label: 'Enviadas',
                                children: isLoading ? (_jsx("div", { style: { padding: '16px 0' }, children: _jsx(Skeleton, { active: true, paragraph: { rows: 5 } }) })) : (_jsx(Table, { columns: columns, dataSource: getDataSource(), rowKey: "id", className: "paces-border-top paces-list-table", rowClassName: (record) => selectedRow?.id === record.id ? 'paces-row-selected' : 'paces-row-hover', onRow: (record) => ({
                                        onClick: () => setSelectedRow(record),
                                        style: { cursor: 'pointer' },
                                    }), scroll: { x: 1100 }, size: "middle", locale: {
                                        emptyText: (_jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No has enviado notificaciones", children: _jsx(PermissionGate, { permisoEspecial: "pe_NOTIFICACION", children: _jsx(Button, { type: "primary", onClick: () => setModalVisible(true), children: "Enviar primera notificaci\u00F3n" }) }) }) })),
                                    }, pagination: {
                                        pageSize,
                                        showSizeChanger: false,
                                        showTotal: (total) => `${total} registros`,
                                    } })),
                            },
                            {
                                key: 'historial',
                                label: `Historial (${historial.length})`,
                                children: loadingHistorial ? (_jsx("div", { style: { padding: '16px 0' }, children: _jsx(Skeleton, { active: true, paragraph: { rows: 5 } }) })) : (_jsx(Table, { columns: columns, dataSource: getDataSource(), rowKey: "notificacionUsuarioID", className: "paces-border-top paces-list-table", rowClassName: (record) => selectedRow?.notificacionUsuarioID === record.notificacionUsuarioID ? 'paces-row-selected' : 'paces-row-hover', onRow: (record) => ({
                                        onClick: () => setSelectedRow(record),
                                        style: { cursor: 'pointer' },
                                    }), scroll: { x: 1100 }, size: "middle", locale: {
                                        emptyText: (_jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No hay notificaciones en el historial" }) })),
                                    }, pagination: {
                                        pageSize,
                                        showSizeChanger: false,
                                        showTotal: (total) => `${total} registros`,
                                    } })),
                            },
                        ] })] }), _jsx(Modal, { title: verNotificacion?.titulo || 'Notificación', open: !!verNotificacion, onCancel: () => setVerNotificacion(null), footer: null, width: 600, children: verNotificacion && (_jsxs(_Fragment, { children: [_jsxs(Descriptions, { column: 1, bordered: true, size: "small", children: [_jsx(Descriptions.Item, { label: "Mensaje", children: _jsx("div", { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' }, children: verNotificacion.mensaje }) }), _jsx(Descriptions.Item, { label: "M\u00F3dulo", children: verNotificacion.modulo || '-' }), _jsx(Descriptions.Item, { label: "Tipo", children: _jsx(Tag, { color: tipoColor[verNotificacion.tipo] || 'default', children: verNotificacion.tipo || 'Info' }) }), _jsx(Descriptions.Item, { label: "Fecha", children: formatFecha(verNotificacion.fechaCreacion) }), _jsx(Descriptions.Item, { label: "Estado", children: _jsx(Tag, { color: verNotificacion.leida ? 'default' : 'blue', children: verNotificacion.leida ? 'Leída' : 'No leída' }) })] }), verNotificacion.tipo === 'Ticket' && verNotificacion.referenciaID && (_jsxs("div", { style: { marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }, children: [_jsx(Button, { type: "primary", onClick: () => {
                                        const id = verNotificacion.referenciaID;
                                        setVerNotificacion(null);
                                        setTicketModalID(id);
                                    }, children: "Ver ticket" }), _jsx(Button, { style: { borderColor: '#34c38f', color: '#34c38f' }, onClick: async () => {
                                        if (!sucursal || !verNotificacion?.referenciaID)
                                            return;
                                        try {
                                            await ticketApi.cambiarEstado(sucursal, verNotificacion.referenciaID, { estado: 'Resuelto', usuarioID: usuarioID });
                                            message.success('Ticket marcado como resuelto');
                                            setVerNotificacion(null);
                                        }
                                        catch (err) {
                                            message.error(err?.response?.data?.errorMessage || 'Error al marcar como resuelto');
                                        }
                                    }, children: "\u2713 Resolver" })] })), verNotificacion?.referenciaTipo === 'NotificacionSQL' && verNotificacion?.referenciaID && (_jsx("div", { style: { marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }, children: _jsx(Button, { type: "primary", onClick: () => {
                                    const id = verNotificacion.referenciaID;
                                    setVerNotificacion(null);
                                    navigate(`/visualizar-consulta/${id}`);
                                }, children: "Visualizar datos" }) }))] })) }), _jsx(TicketThreadModal, { open: ticketModalID !== null, ticketID: ticketModalID ?? 0, onClose: () => {
                    setTicketModalID(null);
                } }), _jsx(EnviarNotificacionModal, { visible: modalVisible, onClose: () => setModalVisible(false), onEnviado: () => {
                    cargarEnviadas();
                } })] }));
};
export default Notificaciones;
