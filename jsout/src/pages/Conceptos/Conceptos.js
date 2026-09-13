import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Table, Card, Tag, Button, Typography, Alert, Empty } from 'antd';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { conceptosApi } from '../../api/conceptosApi';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const toTitleCase = (str) => str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const Conceptos = () => {
    const navigate = useNavigate();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [page, setPage] = useState(1);
    const [searchText, setSearchText] = useState('');
    const [pageSize, setPageSize] = useState(25);
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['conceptos', sucursalActiva, page, pageSize, searchText],
        queryFn: async () => {
            if (sucursalActiva === undefined)
                return { datos: [], total: 0 };
            const salto = (page - 1) * pageSize;
            const params = { cantidad: pageSize, salto };
            if (searchText)
                params.busqueda = searchText;
            const [resultados, totalCount] = await Promise.all([
                conceptosApi.filtrar(sucursalActiva, params),
                conceptosApi.obtenerTotal(sucursalActiva, { busqueda: searchText || undefined }),
            ]);
            return { datos: resultados || [], total: totalCount ?? 0 };
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('MConcepto');
        updateToolbar({});
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar]);
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const dataSource = data?.datos || [];
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
            fileName: `Conceptos_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Conceptos',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    const handleSearch = (value) => {
        setPage(1);
        setSearchText(value);
    };
    const columns = [
        {
            title: 'Código',
            dataIndex: 'codigo',
            key: 'codigo',
            width: 120,
            fixed: 'left',
            render: (val, record) => (_jsx(Text, { style: { fontFamily: 'monospace', cursor: 'pointer', color: '#556ee6' }, onClick: () => navigate(`/MConcepto/${record.codigo}`), children: val })),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            ellipsis: true,
            render: (val) => _jsx(Text, { strong: true, ellipsis: true, children: toTitleCase(val ?? '') }),
        },
        {
            title: 'Estado',
            dataIndex: 'activo',
            key: 'activo',
            width: 90,
            align: 'center',
            render: (val) => (_jsx(Tag, { color: val ? 'green' : 'default', children: val ? 'Activo' : 'Inactivo' })),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { title: "Error al cargar conceptos", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { styles: { body: { padding: 0 } }, className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); }, onNuevo: () => navigate('/MConcepto/nuevo'), onReload: () => refetch(), onExportarExcel: handleExportarExcel }), _jsx(Table, { columns: columns, dataSource: data?.datos || [], rowKey: "codigo", loading: isLoading, scroll: { x: 700 }, size: "middle", pagination: {
                            current: page,
                            pageSize,
                            total: data?.total || 0,
                            onChange: (p) => setPage(p),
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        }, locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No hay conceptos registrados" }) }),
                        }, className: "paces-border-top paces-list-table" })] })] }));
};
export default Conceptos;
