import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Table, Button, Tag, Typography, Empty, Modal, Descriptions, Alert } from 'antd';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { puntoVentaApi } from '../../api/puntoVentaApi';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
function toTitleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
const { Text } = Typography;
const MetodosPago = () => {
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
        queryKey: ['metodosPago', sucursalActiva, page, pageSize, searchText],
        queryFn: async () => {
            if (sucursalActiva === undefined)
                return { datos: [], total: 0 };
            const salto = (page - 1) * pageSize;
            const params = { cantidad: pageSize, salto };
            if (searchText)
                params.busqueda = searchText;
            const { items, total } = await puntoVentaApi.filtrarMetodosPago(sucursalActiva, params);
            return { datos: items, total };
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('MMetodosPago');
        updateToolbar({});
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar]);
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const dataSource = Array.isArray(data?.datos) ? data.datos : [];
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
            fileName: `MetodosPago_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'MetodosPago',
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
            title: 'Código',
            dataIndex: 'codigo',
            key: 'codigo',
            width: 120,
            render: (val, record) => (_jsx(Text, { strong: true, className: "paces-doc-link", style: { fontFamily: 'monospace', cursor: 'pointer' }, onClick: () => abrirDetalle(record), children: val || '-' })),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            render: (val) => _jsx(Text, { strong: true, children: toTitleCase(val ?? '') }),
        },
        {
            title: 'Requiere Documento',
            dataIndex: 'requiereDocumento',
            key: 'requiereDocumento',
            width: 160,
            render: (val) => (_jsx(Tag, { color: val ? 'blue' : 'default', children: val ? 'Sí' : 'No' })),
        },
        {
            title: 'Documento',
            dataIndex: 'codigoDocumento',
            key: 'codigoDocumento',
            width: 120,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { title: "Error al cargar m\u00E9todos de pago", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); setPage(1); }, onReload: () => refetch(), onExportarExcel: handleExportarExcel }), _jsx(Table, { columns: columns, dataSource: Array.isArray(data?.datos) ? data.datos : [], rowKey: "id", loading: isLoading, scroll: { x: 600 }, size: "middle", rowClassName: "paces-row-hover", className: "paces-border-top paces-list-table", pagination: {
                            current: page,
                            pageSize,
                            total: data?.total || 0,
                            onChange: (p) => setPage(p),
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        }, locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: searchText
                                    ? _jsx(Empty, { description: "Sin resultados para la b\u00FAsqueda" })
                                    : _jsx(Empty, { description: "No hay m\u00E9todos de pago configurados" }) })
                        } }), _jsx(Modal, { title: `Detalle: ${detalleItem?.nombre || ''}`, open: detalleVisible, onCancel: () => setDetalleVisible(false), footer: null, width: 520, children: detalleItem && (_jsxs(Descriptions, { column: 1, bordered: true, size: "small", style: { marginTop: 16 }, children: [_jsx(Descriptions.Item, { label: "C\u00F3digo", children: detalleItem.codigo }), _jsx(Descriptions.Item, { label: "Nombre", children: detalleItem.nombre }), _jsx(Descriptions.Item, { label: "Requiere Documento", children: _jsx(Tag, { color: detalleItem.requiereDocumento ? 'blue' : 'default', children: detalleItem.requiereDocumento ? 'Sí' : 'No' }) }), _jsx(Descriptions.Item, { label: "Documento Asociado", children: detalleItem.codigoDocumento || '-' })] })) })] })] }));
};
export default MetodosPago;
