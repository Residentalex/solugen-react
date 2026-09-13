import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Table, Card, Button, Typography, Alert, Empty } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { familiaArticuloApi } from '../../api/familiaArticuloApi';
import { toTitleCase } from '../../utils/formats';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const FamiliasArticulo = () => {
    const navigate = useNavigate();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [page, setPage] = useState(1);
    const [searchText, setSearchText] = useState('');
    const [pageSize, setPageSize] = useState(25);
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['familiasArticulo', sucursalActiva, page, pageSize, searchText],
        queryFn: async () => {
            if (sucursalActiva === undefined)
                return { datos: [], total: 0 };
            const salto = (page - 1) * pageSize;
            const params = { cantidad: pageSize, salto };
            if (searchText)
                params.busqueda = searchText;
            const { items, total } = await familiaArticuloApi.filtrar(sucursalActiva, params);
            return { datos: items, total };
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('MFamilia');
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
            fileName: `FamiliasArticulo_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'FamiliasArticulo',
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
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            width: 200,
            fixed: 'left',
            render: (val) => _jsx(Text, { strong: true, children: toTitleCase(val ?? '') }),
        },
        {
            title: 'ID Externo',
            dataIndex: 'idExterno',
            key: 'idExterno',
            width: 120,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        {
            title: 'Aumento Precio Máx.',
            dataIndex: 'aumentoPrecioMaximo',
            key: 'aumentoPrecioMaximo',
            width: 160,
            align: 'right',
            render: (val) => _jsx(Text, { children: (val ?? 0).toLocaleString() }),
        },
        {
            title: 'Cuenta Costo Venta',
            dataIndex: 'cuentaCostoVenta',
            key: 'cuentaCostoVenta',
            width: 150,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        {
            title: 'Cuenta Ingresos Venta',
            dataIndex: 'cuentaIngresosVenta',
            key: 'cuentaIngresosVenta',
            width: 150,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        {
            title: 'Cuenta Descuento Venta',
            dataIndex: 'cuentaDescuentoVenta',
            key: 'cuentaDescuentoVenta',
            width: 160,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        {
            title: 'Cuenta Devolución Venta',
            dataIndex: 'cuentaDeVolucionVenta',
            key: 'cuentaDeVolucionVenta',
            width: 170,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        {
            title: 'Cuenta Costo Compra',
            dataIndex: 'cuentaCostoCompra',
            key: 'cuentaCostoCompra',
            width: 150,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        {
            title: 'Cuenta Devolución Compra',
            dataIndex: 'cuentaDevolucionCompra',
            key: 'cuentaDevolucionCompra',
            width: 170,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { title: "Error al cargar familias de art\u00EDculos", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); }, onNuevo: () => navigate('/MFamilia/nuevo'), onReload: () => refetch(), onExportarExcel: handleExportarExcel }), _jsx(Table, { columns: columns, dataSource: data?.datos || [], rowKey: (r) => r.idExterno || r.nombre || '', loading: isLoading, scroll: { x: 1450 }, size: "middle", rowClassName: "paces-row-hover", className: "paces-border-top paces-list-table", locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsx(Empty, { description: "No hay familias de art\u00EDculo registradas" }) }),
                        }, pagination: {
                            current: page,
                            pageSize,
                            total: data?.total || 0,
                            onChange: (p) => setPage(p),
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        } })] })] }));
};
export default FamiliasArticulo;
