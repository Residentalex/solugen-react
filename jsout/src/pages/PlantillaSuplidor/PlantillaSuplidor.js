import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Table, Card, Input, Button, Typography, Alert, Space, Empty } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { plantillaSuplidorApi } from '../../api/plantillaSuplidorApi';
import PermissionGate from '../../components/PermissionGate';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const FILAS_POR_PAGINA = 25;
function formatDate(val) {
    if (!val)
        return '-';
    const d = new Date(val);
    if (isNaN(d.getTime()))
        return val;
    return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function toTitleCase(str) {
    if (!str)
        return str;
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
const PlantillaSuplidor = () => {
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setNuevoCallback = useUIStore((s) => s.setNuevoCallback);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(FILAS_POR_PAGINA);
    const [searchText, setSearchText] = useState('');
    const [selectedRow, setSelectedRow] = useState(null);
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['plantillaSuplidor', sucursalActiva, searchText],
        queryFn: async () => {
            const resultados = await plantillaSuplidorApi.obtenerTodo(sucursalActiva);
            let filtrados = resultados;
            if (searchText.length > 0) {
                const q = searchText.toLowerCase();
                filtrados = resultados.filter((r) => (r.numero || '').toLowerCase().includes(q) ||
                    (r.nombreSuplidor || '').toLowerCase().includes(q) ||
                    (r.fecha || '').toLowerCase().includes(q));
            }
            return filtrados;
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('mplantillasup');
        setNuevoCallback(() => navigate('/mplantillasup/nuevo'));
        return () => {
            resetToolbar();
            setNuevoCallback(undefined);
        };
    }, [setActiveModule, resetToolbar, setNuevoCallback, navigate]);
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const dataSource = data || [];
        const exportCols = columns.filter((col) => col.title && col.title !== '' && col.title !== 'Acciones');
        const columnHeaders = exportCols.map((col) => col.title);
        const dataRows = dataSource.map((item) => exportCols.map((col) => {
            if (col.dataIndex) {
                const val = item[col.dataIndex];
                return val != null ? String(val) : '';
            }
            return '';
        }));
        exportToExcel({
            fileName: `PlantillaSuplidor_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'PlantillaSuplidor',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    const handleSearch = (value) => {
        setSearchText(value);
        setPage(1);
    };
    const handleTableChange = (pagination) => {
        setPage(pagination.current);
        setPageSize(pagination.pageSize);
    };
    const handleRowClick = (record) => {
        setSelectedRow(record);
    };
    const columns = [
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 120,
            render: (f) => _jsx(Text, { children: formatDate(f) }),
        },
        {
            title: 'Número',
            dataIndex: 'numero',
            key: 'numero',
            width: 160,
            render: (num, record) => (_jsx(Link, { to: `/mplantillasup/${record.id}`, className: "paces-doc-link", children: _jsx(Text, { strong: true, children: num }) })),
        },
        {
            title: 'Suplidor',
            dataIndex: 'nombreSuplidor',
            key: 'nombreSuplidor',
            ellipsis: true,
            render: (nombre) => (_jsx(Text, { children: toTitleCase(nombre) || '' })),
        },
    ];
    const paginatedData = useMemo(() => {
        const list = data || [];
        return list.slice((page - 1) * pageSize, page * pageSize);
    }, [data, page, pageSize]);
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar plantillas de suplidores", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { styles: { body: { padding: 0 } }, className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: 25, onPageSizeChange: (v) => { }, ocultarPageSize: true, onNuevo: () => navigate('/mplantillasup/nuevo'), onReload: () => refetch(), onExportarExcel: handleExportarExcel }), _jsx(Table, { columns: columns, dataSource: paginatedData, rowKey: "id", loading: isLoading, scroll: { x: 600 }, size: "middle", rowClassName: (record) => selectedRow?.id === record.id ? 'paces-row-selected' : 'paces-row-hover', onRow: (record) => ({
                            onClick: () => handleRowClick(record),
                            style: { cursor: 'pointer' },
                        }), onChange: handleTableChange, pagination: {
                            current: page,
                            pageSize,
                            total: (data || []).length,
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        }, locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsx(Empty, { description: "No hay plantillas de suplidor registradas" }) }),
                        }, className: "paces-border-top paces-list-table" })] })] }));
};
export default PlantillaSuplidor;
