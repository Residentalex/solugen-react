import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Select, Tag, Button, message, Card, Typography, Modal, Descriptions, Alert, Empty, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { servicioApi } from '../../api/servicioApi';
import { formatCurrency, toTitleCase } from '../../utils/formats';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const Servicios = () => {
    const navigate = useNavigate();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [searchText, setSearchText] = useState('');
    const [filtroActivo, setFiltroActivo] = useState('todos');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [detalleItem, setDetalleItem] = useState(null);
    const [detalleOpen, setDetalleOpen] = useState(false);
    const soloActivos = filtroActivo === 'activos' ? true : filtroActivo === 'inactivos' ? false : undefined;
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['servicios', sucursalActiva, page, pageSize, searchText, filtroActivo],
        queryFn: async () => {
            if (sucursalActiva === undefined)
                return { datos: [], total: 0 };
            const salto = (page - 1) * pageSize;
            const params = { cantidad: pageSize, salto };
            if (searchText) {
                params.codigo = searchText;
                params.nombre = searchText;
            }
            if (soloActivos !== undefined)
                params.activo = soloActivos;
            const { items, total } = await servicioApi.obtenerVista(sucursalActiva, params);
            return { datos: items, total };
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('MServicio');
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
            fileName: `Servicios_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Servicios',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    const handleSearch = (value) => {
        setSearchText(value);
        setPage(1);
    };
    const handleFiltroActivoChange = (val) => {
        setFiltroActivo(val);
        setPage(1);
    };
    const abrirDetalle = async (codigo) => {
        try {
            const item = await servicioApi.obtenerPorCodigo(sucursalActiva, codigo);
            setDetalleItem(item);
            setDetalleOpen(true);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al obtener detalle del servicio');
        }
    };
    const columns = [
        {
            title: 'Código',
            dataIndex: 'codigo',
            key: 'codigo',
            width: 120,
            fixed: 'left',
            render: (val) => (_jsx(Text, { strong: true, className: "paces-doc-link", onClick: () => abrirDetalle(val), children: val })),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            width: 320,
            render: (name) => (_jsxs(Space, { children: [_jsx("div", { className: "paces-avatar-initials", children: (name || '?').charAt(0).toUpperCase() }), _jsx(Text, { children: toTitleCase(name || '') })] })),
        },
        {
            title: 'Precio',
            dataIndex: 'precio',
            key: 'precio',
            width: 130,
            align: 'right',
            render: (val) => (_jsx(Text, { style: { fontFamily: 'monospace' }, children: formatCurrency(val) })),
        },
        {
            title: 'Referencia',
            dataIndex: 'referenciaInterna',
            key: 'referenciaInterna',
            width: 180,
            render: (val) => _jsx(Text, { type: "secondary", children: val || '-' }),
        },
        {
            title: 'Familia',
            dataIndex: 'familiaNombre',
            key: 'familiaNombre',
            width: 150,
            render: (val) => val ? _jsx(Tag, { style: { fontSize: 11 }, children: val }) : _jsx(Text, { children: '-' }),
        },
        {
            title: 'Categoría',
            dataIndex: 'categoriaNombre',
            key: 'categoriaNombre',
            width: 150,
            render: (val) => val ? _jsx(Tag, { style: { fontSize: 11 }, children: toTitleCase(val) }) : _jsx(Text, { children: '-' }),
        },
        {
            title: 'Unidad Medida',
            dataIndex: 'unidadMedidaNombre',
            key: 'unidadMedidaNombre',
            width: 100,
            render: (val) => _jsx(Text, { children: val ? toTitleCase(val) : '-' }),
        },
        {
            title: 'Activo',
            dataIndex: 'activo',
            key: 'activo',
            width: 90,
            render: (activo) => (_jsx(Tag, { color: activo ? 'green' : 'red', children: activo ? 'Activo' : 'Inactivo' })),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar servicios", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); setPage(1); }, onNuevo: () => navigate('/MServicio/nuevo'), onReload: () => refetch(), onExportarExcel: handleExportarExcel, filtros: _jsx(Select, { value: filtroActivo, onChange: handleFiltroActivoChange, style: { width: 130 }, size: "middle", options: [
                                { value: "todos", label: "Todos" },
                                { value: "activos", label: "Solo activos" },
                                { value: "inactivos", label: "Solo inactivos" },
                            ] }) }), _jsx(Table, { columns: columns, dataSource: data?.datos || [], rowKey: "codigo", loading: isLoading, scroll: { x: 1200 }, size: "middle", rowClassName: "paces-row-hover", className: "paces-border-top paces-list-table", locale: {
                            emptyText: isLoading ? ' ' : _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No se encontraron servicios" }) }),
                        }, pagination: {
                            current: page,
                            pageSize: pageSize,
                            total: data?.total || 0,
                            onChange: (p) => setPage(p),
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        } })] }), _jsx(Modal, { title: `Servicio: ${detalleItem?.codigo || ''}`, open: detalleOpen, onCancel: () => setDetalleOpen(false), footer: null, width: 600, children: detalleItem && (_jsxs(Descriptions, { column: 1, bordered: true, size: "small", children: [_jsx(Descriptions.Item, { label: "C\u00F3digo", children: detalleItem.codigo }), _jsx(Descriptions.Item, { label: "Nombre", children: toTitleCase(detalleItem.nombre) }), _jsx(Descriptions.Item, { label: "Precio", children: formatCurrency(detalleItem.precio) }), _jsx(Descriptions.Item, { label: "Moneda", children: detalleItem.moneda || getMonedaSucursalActiva().codigo }), _jsx(Descriptions.Item, { label: "Referencia Interna", children: detalleItem.referenciaInterna || '-' }), _jsx(Descriptions.Item, { label: "Familia", children: detalleItem.familia?.nombre || '-' }), _jsx(Descriptions.Item, { label: "Categor\u00EDa", children: detalleItem.categoria?.nombre || '-' }), _jsx(Descriptions.Item, { label: "Unidad Medida", children: detalleItem.unidadMedida?.nombre || '-' }), _jsx(Descriptions.Item, { label: "Para Vender", children: detalleItem.paraVender ? 'Sí' : 'No' }), _jsx(Descriptions.Item, { label: "Nota", children: detalleItem.nota || '-' }), _jsx(Descriptions.Item, { label: "Activo", children: _jsx(Tag, { color: detalleItem.activo ? 'green' : 'red', children: detalleItem.activo ? 'Activo' : 'Inactivo' }) })] })) })] }));
};
export default Servicios;
