import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Table, Card, Button, Modal, Descriptions, Typography, Tag, Divider, Empty } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { ofertaApi } from '../../api/ofertaApi';
import { formatCurrency } from '../../utils/formats';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
/* â”€â”€â”€â”€â”€â”€â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function toTitleCase(str) {
    if (!str)
        return str;
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
function formatDate(dateStr) {
    if (!dateStr)
        return '-';
    try {
        return new Intl.DateTimeFormat('es-DO', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(new Date(dateStr));
    }
    catch {
        return dateStr;
    }
}
function getVigencia(item) {
    if (!item.activo)
        return { text: 'Inactiva', color: 'default' };
    const hoy = new Date();
    const fechaFinal = new Date(item.fechaFinal);
    if (fechaFinal < hoy)
        return { text: 'Expirada', color: 'red' };
    return { text: 'Vigente', color: 'green' };
}
/* â”€â”€â”€â”€â”€â”€â”€â”€â”€ componente â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const Ofertas = () => {
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [page, setPage] = useState(1);
    const [searchText, setSearchText] = useState('');
    const [pageSize, setPageSize] = useState(25);
    const [detalleVisible, setDetalleVisible] = useState(false);
    const [detalleItem, setDetalleItem] = useState(null);
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['ofertas', sucursalActiva, page, pageSize, searchText],
        queryFn: async () => {
            if (sucursalActiva === undefined)
                return { datos: [], total: 0 };
            const salto = (page - 1) * pageSize;
            const params = { cantidad: pageSize, salto };
            if (searchText)
                params.busqueda = searchText;
            const [resultados, totalCount] = await Promise.all([
                ofertaApi.filtrar(sucursalActiva, params),
                ofertaApi.obtenerTotal(sucursalActiva, { busqueda: searchText || undefined }),
            ]);
            return { datos: resultados || [], total: totalCount ?? 0 };
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('FOfertas');
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
            fileName: `Ofertas_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Ofertas',
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
    /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ columnas â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    const columns = [
        {
            title: 'Código',
            dataIndex: 'codigo',
            key: 'codigo',
            width: 120,
            fixed: 'left',
            render: (val, record) => (_jsx(Text, { strong: true, className: "paces-doc-link", style: { cursor: 'pointer' }, onClick: () => abrirDetalle(record), children: val })),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            width: 280,
            render: (val) => _jsx(Text, { children: toTitleCase(val ?? '') }),
        },
        {
            title: 'Fecha Inicio',
            dataIndex: 'fechaInicio',
            key: 'fechaInicio',
            width: 140,
            render: (val) => _jsx(Text, { children: formatDate(val) }),
        },
        {
            title: 'Fecha Final',
            dataIndex: 'fechaFinal',
            key: 'fechaFinal',
            width: 140,
            render: (val) => _jsx(Text, { children: formatDate(val) }),
        },
        {
            title: 'Vigencia',
            dataIndex: 'activo',
            key: 'vigencia',
            width: 160,
            render: (_, record) => {
                const vigencia = getVigencia(record);
                return _jsx(Tag, { color: vigencia.color, children: vigencia.text });
            },
        },
        {
            title: 'Cliente Crédito',
            dataIndex: 'aplicaClienteCredito',
            key: 'aplicaClienteCredito',
            width: 120,
            render: (val) => _jsx(Tag, { color: "blue", children: val ? 'Sí' : 'No' }),
        },
    ];
    /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ render â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar ofertas", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); }, onReload: () => refetch(), onExportarExcel: handleExportarExcel }), _jsx(Table, { columns: columns, dataSource: data?.datos || [], rowKey: "codigo", loading: isLoading, scroll: { x: 1040 }, size: "middle", rowClassName: "paces-row-hover", className: "paces-border-top paces-list-table", pagination: {
                            current: page,
                            pageSize,
                            total: data?.total || 0,
                            onChange: (p) => setPage(p),
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        }, locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: searchText
                                    ? _jsx(Empty, { description: "No se encontraron ofertas para la b\u00FAsqueda" })
                                    : _jsx(Empty, { description: "No hay ofertas registradas" }) }),
                        } })] }), _jsx(Modal, { title: `Oferta: ${detalleItem?.nombre || ''}`, open: detalleVisible, onCancel: () => setDetalleVisible(false), footer: null, width: 640, children: detalleItem && (_jsxs(_Fragment, { children: [_jsxs(Descriptions, { column: 1, bordered: true, size: "small", style: { marginTop: 16 }, children: [_jsx(Descriptions.Item, { label: "C\u00F3digo", children: detalleItem.codigo }), _jsx(Descriptions.Item, { label: "Nombre", children: toTitleCase(detalleItem.nombre ?? '') }), _jsx(Descriptions.Item, { label: "Fecha Inicio", children: formatDate(detalleItem.fechaInicio) }), _jsx(Descriptions.Item, { label: "Fecha Final", children: formatDate(detalleItem.fechaFinal) }), _jsx(Descriptions.Item, { label: "Estado", children: _jsx(Tag, { color: getVigencia(detalleItem).color, children: getVigencia(detalleItem).text }) }), _jsx(Descriptions.Item, { label: "Aplica Cr\u00C3\u00A9dito", children: detalleItem.aplicaClienteCredito ? 'Sí' : 'No' })] }), detalleItem.detalles && detalleItem.detalles.length > 0 && (_jsxs(_Fragment, { children: [_jsxs(Divider, { children: ["Productos (", detalleItem.detalles.length, ")"] }), _jsxs(Table, { dataSource: [...detalleItem.detalles].sort((a, b) => b.codigo.localeCompare(a.codigo)), rowKey: "codigo", size: "small", pagination: false, scroll: { x: 500 }, children: [_jsx(Table.Column, { title: "C\u00F3digo", dataIndex: "codigo", width: 100 }, "codigo"), _jsx(Table.Column, { title: "Art\u00EDculo", dataIndex: "articulo", ellipsis: true }, "articulo"), _jsx(Table.Column, { title: "Precio", dataIndex: "precio", align: "right", width: 120, render: (v) => formatCurrency(v) }, "precio"), _jsx(Table.Column, { title: "Dto %", dataIndex: "porcentajeDescuento", align: "right", width: 80, render: (v) => `${v}%` }, "porcentajeDescuento")] })] }))] })) })] }));
};
export default Ofertas;
