import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Alert, Table, DatePicker, Tag, Card, Button, Typography, Empty, Input } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { turnoApi } from '../../api/turnoApi';
import { ReloadOutlined, SearchOutlined, FileExcelOutlined } from '@ant-design/icons';
import { formatCurrency } from '../../utils/formats';
import PermissionGate from '../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { RangePicker } = DatePicker;
const { Text } = Typography;
const PERIODO_MAP = {
    0: { label: 'Abierto', color: 'warning' },
    1: { label: 'Cerrado', color: 'success' },
};
const DIAS_POR_DEFECTO = 30;
const FILAS_POR_PAGINA = 25;
function formatDateTime(dateStr) {
    if (!dateStr)
        return '-';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime()))
            return dateStr;
        return d.toLocaleDateString('es-DO', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    }
    catch {
        return dateStr;
    }
}
function toTitleCase(str) {
    if (!str)
        return str;
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
function formatDateParam(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}000000`;
}
const Turnos = () => {
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(FILAS_POR_PAGINA);
    const [selectedRow, setSelectedRow] = useState(null);
    const [searchText, setSearchText] = useState('');
    const dateParamsRef = useRef({
        desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
        hasta: formatDateParam(new Date()),
    });
    const [dateTrigger, setDateTrigger] = useState(0);
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['turnos', sucursalActiva, page, pageSize, searchText, dateTrigger],
        queryFn: async () => {
            if (searchText) {
                // Búsqueda: solo filtrar por turno, sin fechas
                const params = {
                    cantidad: pageSize,
                    salto: (page - 1) * pageSize,
                    turno: searchText,
                };
                const result = await turnoApi.filtrar(sucursalActiva, params);
                const total = result.length < pageSize
                    ? (page - 1) * pageSize + result.length + 1
                    : (page - 1) * pageSize + result.length + pageSize;
                return { datos: result, total };
            }
            else {
                // Listado normal: con rango de fechas
                const params = {
                    desde: dateParamsRef.current.desde,
                    hasta: dateParamsRef.current.hasta,
                    cantidad: pageSize,
                    salto: (page - 1) * pageSize,
                };
                const result = await turnoApi.obtenerListadoResumido(sucursalActiva, params);
                const total = result.length < pageSize
                    ? (page - 1) * pageSize + result.length + 1
                    : (page - 1) * pageSize + result.length + pageSize;
                return { datos: result, total };
            }
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('FTURNOS');
        updateToolbar({});
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar]);
    const handleRefresh = () => {
        setDateTrigger((n) => n + 1);
    };
    const handleDateChange = (dates) => {
        if (dates && dates[0] && dates[1]) {
            dateParamsRef.current = {
                desde: formatDateParam(dates[0].toDate()),
                hasta: formatDateParam(dates[1].toDate()),
            };
        }
        else {
            dateParamsRef.current = {
                desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
                hasta: formatDateParam(new Date()),
            };
        }
        setPage(1);
        setDateTrigger((n) => n + 1);
    };
    const handleSearch = (value) => {
        setSearchText(value);
        setPage(1);
    };
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const dataSource = data?.datos || [];
        const exportCols = columns.filter((col) => col.title && col.title !== '' && col.title !== 'Acciones');
        const columnHeaders = exportCols.map((col) => col.title);
        const dataRows = dataSource.map((item) => exportCols.map((col) => {
            const val = item[col.dataIndex];
            return val != null ? String(val) : '';
        }));
        exportToExcel({
            fileName: `Turnos_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Turnos',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    const handleRowClick = (record) => {
        setSelectedRow(record);
    };
    const openDetalle = (record) => {
        navigate(`/FTURNOS/${record.noTurno}`);
    };
    const columns = [
        {
            title: 'No. Turno',
            dataIndex: 'noTurno',
            key: 'noTurno',
            width: 140,
            render: (val, record) => (_jsx(Text, { strong: true, className: "paces-doc-link", onClick: () => openDetalle(record), children: val })),
        },
        {
            title: 'Fecha Apertura',
            dataIndex: 'fechaApertura',
            key: 'fechaApertura',
            width: 140,
            render: (val) => _jsx(Text, { children: formatDateTime(val) }),
        },
        {
            title: 'Fecha Cierre',
            dataIndex: 'fechaCierre',
            key: 'fechaCierre',
            width: 140,
            render: (val) => _jsx(Text, { children: val ? formatDateTime(val) : '-' }),
        },
        {
            title: 'Usuario',
            dataIndex: 'usuario',
            key: 'usuario',
            width: 180,
            ellipsis: true,
            render: (val) => (_jsx(Text, { children: toTitleCase(val?.nombre || '') })),
        },
        {
            title: 'POS',
            dataIndex: 'nombrePOS',
            key: 'nombrePOS',
            width: 150,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 140,
            align: 'right',
            render: (val) => _jsx(Text, { strong: true, children: formatCurrency(val) }),
        },
        {
            title: 'Cerrado',
            dataIndex: 'cerrado',
            key: 'cerrado',
            width: 90,
            render: (val) => (_jsx(Tag, { color: val ? 'green' : 'default', children: val ? 'Sí' : 'No' })),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar turnos", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx(Input.Search, { placeholder: "Buscar turno...", allowClear: true, onSearch: handleSearch, style: { width: 400 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx(RangePicker, { style: { width: 180 }, format: "YYYY-MM-DD", onChange: handleDateChange, placeholder: ["Desde", "Hasta"] }), _jsx("div", { style: { flex: 1 } }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: handleExportarExcel }) }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: handleRefresh })] }) }), _jsx(Table, { className: "paces-border-top paces-list-table", columns: columns, dataSource: data?.datos || [], rowKey: "id", loading: isLoading, size: "middle", scroll: { x: 900 }, locale: { emptyText: _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No hay turnos registrados" }) }) }, pagination: {
                            current: page,
                            pageSize,
                            total: data?.total || 0,
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        }, onChange: (pagination) => {
                            if (pagination.current)
                                setPage(pagination.current);
                        }, rowClassName: (record) => selectedRow?.id === record.id ? 'paces-row-selected' : 'paces-row-hover', onRow: (record) => ({
                            onClick: () => handleRowClick(record),
                            style: { cursor: 'pointer' },
                        }) })] })] }));
};
export default Turnos;
