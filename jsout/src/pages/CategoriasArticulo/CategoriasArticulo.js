import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { useNavigate } from 'react-router-dom';
import { Alert, Table, Card, Button, Typography, Empty } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { categoriaArticuloApi } from '../../api/categoriaArticuloApi';
import { toTitleCase } from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const CategoriasArticulo = () => {
    const navigate = useNavigate();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [page, setPage] = useState(1);
    const [searchText, setSearchText] = useState('');
    const [pageSize, setPageSize] = useState(25);
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['categoriasArticulo', sucursalActiva, page, pageSize, searchText],
        queryFn: async () => {
            if (sucursalActiva === undefined)
                return { datos: [], total: 0 };
            const salto = (page - 1) * pageSize;
            const params = { cantidad: pageSize, salto };
            if (searchText)
                params.busqueda = searchText;
            const [resultados, totalCount] = await Promise.all([
                categoriaArticuloApi.filtrar(sucursalActiva, params),
                categoriaArticuloApi.obtenerTotal(sucursalActiva, { busqueda: searchText || undefined }),
            ]);
            return { datos: resultados || [], total: totalCount ?? 0 };
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('MCategoria');
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
            if (col.key === 'grupo')
                return item.grupo?.nombre || '';
            if (col.key === 'control')
                return item.control?.nombre || '';
            return '';
        }));
        exportToExcel({
            fileName: `CategoriasArticulo_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'CategoriasArticulo',
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
            render: (val) => _jsx(Text, { strong: true, children: val || '-' }),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            width: 280,
            render: (val) => _jsx(Text, { children: toTitleCase(val ?? '') }),
        },
        {
            title: 'Grupo',
            key: 'grupo',
            width: 200,
            render: (_, record) => (_jsx(Text, { children: record.grupo?.nombre ? toTitleCase(record.grupo.nombre) : '-' })),
        },
        {
            title: 'Control',
            key: 'control',
            width: 200,
            render: (_, record) => (_jsx(Text, { children: record.control?.nombre ? toTitleCase(record.control.nombre) : '-' })),
        },
        {
            title: 'ID Externo',
            dataIndex: 'idExterno',
            key: 'idExterno',
            width: 120,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar categor\u00EDas de art\u00EDculo", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); }, onNuevo: () => navigate('/MCategoria/nuevo'), onReload: () => refetch(), onExportarExcel: handleExportarExcel }), _jsx(Table, { columns: columns, dataSource: data?.datos || [], rowKey: (r) => r.codigo || r.nombre || '', loading: isLoading, scroll: { x: 900 }, size: "middle", rowClassName: "paces-row-hover", className: "paces-border-top paces-list-table", locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsx(Empty, { description: "No hay categor\u00EDas de art\u00EDculo registradas" }) }),
                        }, pagination: {
                            current: page,
                            pageSize,
                            total: data?.total || 0,
                            onChange: (p) => setPage(p),
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        } })] })] }));
};
export default CategoriasArticulo;
