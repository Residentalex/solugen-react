import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Table, Button, Empty, Modal, Descriptions, Typography } from 'antd';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { puntoVentaApi } from '../../api/puntoVentaApi';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
function toTitleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
const { Text } = Typography;
const PuntosVenta = () => {
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [searchText, setSearchText] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [detalleVisible, setDetalleVisible] = useState(false);
    const [detalleItem, setDetalleItem] = useState(null);
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['puntosVenta', sucursalActiva, page, pageSize, searchText],
        queryFn: async () => {
            if (sucursalActiva === undefined)
                return { datos: [], total: 0 };
            const salto = (page - 1) * pageSize;
            const params = { cantidad: pageSize, salto };
            if (searchText)
                params.busqueda = searchText;
            const result = await puntoVentaApi.filtrarPuntosVenta(sucursalActiva, params);
            return { datos: result.items, total: result.total };
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('MPOS');
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
            fileName: `PuntosVenta_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'PuntosVenta',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    const handleSearch = (value) => {
        setSearchText(value);
        setPage(1);
    };
    const abrirDetalle = (item) => {
        setDetalleItem(item);
        setDetalleVisible(true);
    };
    const columns = [
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            render: (val, record) => (_jsx(Text, { strong: true, className: "paces-doc-link", style: { cursor: 'pointer' }, onClick: () => abrirDetalle(record), children: toTitleCase(val ?? '') })),
        },
        {
            title: 'IP',
            dataIndex: 'ip',
            key: 'ip',
            width: 180,
            render: (val) => _jsx(Text, { style: { fontFamily: 'monospace' }, children: val || '-' }),
        },
        {
            title: 'Ruta',
            dataIndex: 'ruta',
            key: 'ruta',
            width: 280,
            render: (val) => _jsx(Text, { type: "secondary", style: { fontFamily: 'monospace' }, children: val || '-' }),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar puntos de venta", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); setPage(1); }, onReload: () => refetch(), onExportarExcel: handleExportarExcel }), _jsx(Table, { columns: columns, dataSource: data?.datos || [], rowKey: "nombre", loading: isLoading, scroll: { x: 600 }, size: "middle", className: "paces-border-top paces-list-table", pagination: {
                            current: page,
                            pageSize,
                            total: data?.total || 0,
                            onChange: (p) => setPage(p),
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        }, locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: searchText
                                    ? _jsx(Empty, { description: "Sin resultados para la b\u00FAsqueda" })
                                    : _jsx(Empty, { description: "No hay puntos de venta configurados" }) })
                        } })] }), _jsx(Modal, { title: `Detalle: ${detalleItem?.nombre || ''}`, open: detalleVisible, onCancel: () => setDetalleVisible(false), footer: null, width: 520, children: detalleItem && (_jsxs(Descriptions, { column: 1, bordered: true, size: "small", style: { marginTop: 16 }, children: [_jsx(Descriptions.Item, { label: "Nombre", children: toTitleCase(detalleItem.nombre ?? '') }), _jsx(Descriptions.Item, { label: "IP", children: detalleItem.ip || '-' }), _jsx(Descriptions.Item, { label: "Ruta", children: detalleItem.ruta || '-' }), _jsx(Descriptions.Item, { label: "ID Externo", children: detalleItem.idExterno || '-' })] })) })] }));
};
export default PuntosVenta;
