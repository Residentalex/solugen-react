import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { Table, Card, Button, Tag, Tooltip, message, Input, Select, Alert, Space, Popconfirm, Empty, } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined, EditOutlined, PlayCircleOutlined, PoweroffOutlined, DeleteOutlined, FileExcelOutlined, } from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import { notificacionesApi } from '../../api/notificacionesApi';
import NotificacionSQLFormulario from './NotificacionSQLFormulario';
import NotificacionSQLResultadoModal from './NotificacionSQLResultadoModal';
import { useCompanyStore } from '../../stores/companyStore';
import { useAuthStore } from '../../stores/authStore';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
function formatIntervalo(minutos) {
    if (minutos < 60)
        return `Cada ${minutos} min`;
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    if (m === 0)
        return `Cada ${h}h`;
    return `Cada ${h}h ${m}min`;
}
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
const NotificacionesPersonalizadas = () => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const sucursalesData = useCompanyStore((s) => s.data.sucursales);
    const SUCURSALES_LABELS = Object.fromEntries((sucursalesData || [])
        .filter((s) => s.sucursal >= 0 && s.sucursal <= 3)
        .map((s) => [s.sucursal, s.nombre]));
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [pagina, setPagina] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [loadingError, setLoadingError] = useState(false);
    const [formularioVisible, setFormularioVisible] = useState(false);
    const [editando, setEditando] = useState(null);
    const [resultadoVisible, setResultadoVisible] = useState(false);
    const [configIdResultado, setConfigIdResultado] = useState(0);
    const [configNombreResultado, setConfigNombreResultado] = useState('');
    const cargarDatos = useCallback(async () => {
        setLoading(true);
        try {
            const data = await notificacionesApi.obtenerSQLConfigs();
            setConfigs(data || []);
            setLoadingError(false);
        }
        catch {
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);
    const handleSearch = (value) => {
        setSearchText(value);
        setPagina(1);
    };
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const cols = columns.filter((c) => c.key !== 'acciones');
        exportToExcel({
            fileName: `NotificacionesPersonalizadas_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Notificaciones Personalizadas',
            companyName,
            columnHeaders: cols.map((c) => c.title),
            dataRows: dataSource.map((item) => cols.map((col) => {
                const val = item[col.dataIndex];
                return val !== null && val !== undefined ? String(val) : '';
            })),
        });
    };
    const handleRefresh = () => {
        setLoadingError(false);
        cargarDatos();
    };
    const abrirNuevo = () => {
        setEditando(null);
        setFormularioVisible(true);
    };
    const abrirEditar = (config) => {
        setEditando(config);
        setFormularioVisible(true);
    };
    const handleGuardado = () => {
        setFormularioVisible(false);
        setEditando(null);
        cargarDatos();
    };
    const handleProbar = (config) => {
        setConfigIdResultado(config.id);
        setConfigNombreResultado(config.nombre);
        setResultadoVisible(true);
    };
    const handleActivar = async (config) => {
        try {
            await notificacionesApi.activarSQLConfig(config.id, !config.activo);
            message.success(config.activo ? 'Configuración desactivada' : 'Configuración activada');
            cargarDatos();
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cambiar estado');
        }
    };
    const handleEliminar = async (id) => {
        try {
            await notificacionesApi.eliminarSQLConfig(id);
            message.success('Configuración eliminada');
            cargarDatos();
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al eliminar');
        }
    };
    const dataSource = searchText
        ? configs.filter((c) => c.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
            c.tipo.toLowerCase().includes(searchText.toLowerCase()))
        : configs;
    const columns = [
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            width: 220,
            ellipsis: true,
            render: (text) => (_jsx("span", { style: { fontWeight: 500, color: '#556ee6' }, children: text })),
        },
        {
            title: 'Tipo',
            dataIndex: 'tipo',
            key: 'tipo',
            width: 120,
            render: (text) => (_jsx(Tag, { color: tipoColor[text] || 'default', children: text || 'Info' })),
        },
        {
            title: 'Sucursales',
            dataIndex: 'sucursalIDs',
            key: 'sucursalIDs',
            width: 220,
            render: (val) => {
                if (!val)
                    return _jsx(Tag, { children: "Consolidado" });
                const ids = val.split(',').map(Number);
                return (_jsx(Space, { wrap: true, size: 4, children: ids.map(id => _jsx(Tag, { children: SUCURSALES_LABELS[id] || `Suc #${id}` }, id)) }));
            },
        },
        {
            title: 'Intervalo',
            dataIndex: 'intervaloMinutos',
            key: 'intervaloMinutos',
            width: 140,
            render: (minutos) => (_jsx("span", { className: "paces-text-secondary", children: formatIntervalo(minutos) })),
        },
        {
            title: 'Última ejecución',
            dataIndex: 'ultimaEjecucion',
            key: 'ultimaEjecucion',
            width: 170,
            render: (text) => (_jsx("span", { className: "paces-text-secondary", style: { fontSize: 12 }, children: formatFecha(text) })),
        },
        {
            title: 'Activo',
            dataIndex: 'activo',
            key: 'activo',
            width: 90,
            render: (activo) => (_jsx(Tag, { color: activo ? 'green' : 'default', children: activo ? 'Activo' : 'Inactivo' })),
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 180,
            fixed: 'right',
            render: (_, record) => (_jsxs(Space, { size: 0, children: [_jsx(Tooltip, { title: "Editar", children: _jsx(Button, { type: "text", size: "small", icon: _jsx(EditOutlined, {}), onClick: () => abrirEditar(record) }) }), _jsx(Tooltip, { title: "Probar SQL", children: _jsx(Button, { type: "text", size: "small", icon: _jsx(PlayCircleOutlined, {}), onClick: () => handleProbar(record) }) }), _jsx(Tooltip, { title: record.activo ? 'Desactivar' : 'Activar', children: _jsx(Button, { type: "text", size: "small", icon: _jsx(PoweroffOutlined, {}), onClick: () => handleActivar(record) }) }), _jsx(Popconfirm, { title: "Eliminar configuraci\u00F3n", description: "\u00BFEst\u00E1 seguro de eliminar esta configuraci\u00F3n SQL?", onConfirm: () => handleEliminar(record.id), okText: "Eliminar", cancelText: "Cancelar", okButtonProps: { danger: true }, children: _jsx(Tooltip, { title: "Eliminar", children: _jsx(Button, { type: "text", size: "small", danger: true, icon: _jsx(DeleteOutlined, {}) }) }) })] })),
        },
    ];
    return (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, children: [_jsx("h4", { style: { margin: 0, fontSize: 18, fontWeight: 600 }, children: "Notificaciones Personalizadas SQL" }), _jsx(PermissionGate, { permisoEspecial: "pe_NOTIFICACIONESPECIAL", children: _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: abrirNuevo, children: "Nueva configuraci\u00F3n SQL" }) })] }), loadingError && (_jsx(Alert, { message: "Error al cargar configuraciones SQL", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx(Input.Search, { placeholder: "Buscar por nombre o tipo...", allowClear: true, onSearch: handleSearch, style: { width: 400 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx(Select, { style: { width: 65 }, value: pageSize, onChange: (v) => { setPageSize(v); setPagina(1); }, options: [
                                        { value: 25, label: '25' },
                                        { value: 50, label: '50' },
                                        { value: 100, label: '100' },
                                    ] }), _jsx("div", { style: { flex: 1 } }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: handleExportarExcel }) }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: handleRefresh })] }) }), _jsx(Table, { columns: columns, dataSource: dataSource, rowKey: "id", className: "paces-border-top paces-list-table", rowClassName: "paces-row-hover", onRow: () => ({ style: { cursor: 'pointer' } }), loading: loading, scroll: { x: 950 }, size: "middle", locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No hay notificaciones personalizadas registradas" }) }),
                        }, pagination: {
                            current: pagina,
                            pageSize,
                            onChange: (p) => setPagina(p),
                            showSizeChanger: false,
                            showTotal: (total) => `${total} registros`,
                        } })] }), _jsx(NotificacionSQLFormulario, { visible: formularioVisible, editando: editando, onClose: () => { setFormularioVisible(false); setEditando(null); }, onGuardado: handleGuardado }), _jsx(NotificacionSQLResultadoModal, { visible: resultadoVisible, configId: configIdResultado, configNombre: configNombreResultado, onClose: () => setResultadoVisible(false) })] }));
};
export default NotificacionesPersonalizadas;
