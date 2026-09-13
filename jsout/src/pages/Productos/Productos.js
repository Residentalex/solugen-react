import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Tag, Button, Card, Select, Typography, Tooltip, Alert, Empty, Space } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { productoApi } from '../../api/productoApi';
import PermissionGate from '../../components/PermissionGate';
import { toTitleCase, formatCurrency } from '../../utils/formats';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const Productos = () => {
    const navigate = useNavigate();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const sucursalProductos = useCompanyStore((s) => s.data.sucursalProductos);
    const [searchText, setSearchText] = useState('');
    const [filtroActivo, setFiltroActivo] = useState('todos');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const usuario = useAuthStore((s) => s.usuario);
    const pantallaActual = usuario?.pantallas.find((p) => p.codigo === 'MProducto');
    const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;
    const soloActivos = filtroActivo === 'activos' ? true : filtroActivo === 'inactivos' ? false : undefined;
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['productos', sucursalProductos, page, pageSize, searchText, filtroActivo],
        queryFn: async () => {
            if (sucursalProductos === undefined)
                return { data: [], total: 0 };
            const salto = (page - 1) * pageSize;
            const params = {
                cantidad: pageSize, salto,
            };
            if (soloActivos !== undefined)
                params.activo = soloActivos;
            if (searchText) {
                params.codigo = searchText;
                params.nombre = searchText;
            }
            const { items, total } = await productoApi.obtenerVista(sucursalProductos, params);
            return { data: items || [], total };
        },
        enabled: sucursalProductos !== undefined,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('MProducto');
        updateToolbar({});
        setPageTitleOverride('');
        return () => {
            resetToolbar();
            setPageTitleOverride('');
        };
    }, [setActiveModule, updateToolbar, resetToolbar, setPageTitleOverride]);
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalProductos);
        const dataSource = data?.data || [];
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
            fileName: `Productos_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Productos',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    const handleSearch = (value) => {
        setSearchText(value);
        setPage(1);
    };
    const handlePageChange = (newPage, newPageSize) => {
        if (newPageSize !== pageSize) {
            setPageSize(newPageSize);
            setPage(1);
        }
        else {
            setPage(newPage);
        }
    };
    const columns = [
        {
            title: 'Código',
            dataIndex: 'codigo',
            key: 'codigo',
            width: 120,
            fixed: 'left',
            render: (val, record) => puedeEditar ? (_jsx(Link, { to: `/MProducto/${record.codigo}`, className: "paces-doc-link", style: { fontWeight: 500 }, children: val })) : (_jsx(Text, { style: { fontFamily: 'monospace' }, children: val })),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            width: 320,
            render: (name) => (_jsxs(Space, { children: [_jsx("div", { className: "paces-avatar-initials", children: (name || '?').charAt(0).toUpperCase() }), _jsx(Text, { children: toTitleCase(name || '') })] })),
        },
        {
            title: 'Referencia',
            dataIndex: 'referencia',
            key: 'referencia',
            width: 140,
            render: (val) => _jsx(Text, { type: "secondary", children: val || '-' }),
        },
        {
            title: 'Familia',
            dataIndex: 'familiaNombre',
            key: 'familiaNombre',
            width: 140,
            render: (val) => val ? _jsx(Tag, { style: { fontSize: 11 }, children: val }) : _jsx(Text, { children: '-' }),
        },
        {
            title: 'Categoría',
            dataIndex: 'categoriaNombre',
            key: 'categoriaNombre',
            width: 140,
            render: (val) => val ? _jsx(Tag, { style: { fontSize: 11 }, children: toTitleCase(val) }) : _jsx(Text, { children: '-' }),
        },
        {
            title: 'U. Medida',
            dataIndex: 'unidadMedidaNombre',
            key: 'unidadMedidaNombre',
            width: 100,
            render: (val) => _jsx(Text, { children: val ? toTitleCase(val) : '-' }),
        },
        {
            title: 'Precio',
            dataIndex: 'precio',
            key: 'precio',
            width: 110,
            align: 'right',
            render: (val) => _jsx(Text, { style: { fontFamily: 'monospace' }, children: formatCurrency(val) }),
        },
        {
            title: 'Ult. Costo',
            dataIndex: 'ultimoCosto',
            key: 'ultimoCosto',
            width: 110,
            align: 'right',
            render: (val) => _jsx(Text, { style: { fontFamily: 'monospace' }, children: formatCurrency(val) }),
        },
        {
            title: 'Estado',
            dataIndex: 'activo',
            key: 'activo',
            width: 80,
            render: (activo) => (_jsx(Tag, { color: activo ? 'green' : 'default', children: activo ? 'Activo' : 'Inactivo' })),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar productos", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); setPage(1); }, onReload: () => refetch(), onNuevo: () => navigate('/MProducto/nuevo'), onExportarExcel: handleExportarExcel, filtros: _jsx(Select, { value: filtroActivo, onChange: (val) => { setFiltroActivo(val); setPage(1); }, style: { width: 130 }, size: "middle", options: [
                                { value: "todos", label: "Todos" },
                                { value: "activos", label: "Solo activos" },
                                { value: "inactivos", label: "Solo inactivos" },
                            ] }), acciones: _jsx(PermissionGate, { permisoEspecial: "pe_importar", children: _jsx(Tooltip, { title: "Importar desde Excel", children: _jsx(Button, { icon: _jsx(UploadOutlined, {}), onClick: () => navigate("/MProducto/importar") }) }) }) }), _jsx(Table, { columns: columns, dataSource: data?.data || [], rowKey: "codigo", loading: isLoading, scroll: { x: 1240 }, size: "middle", rowClassName: "paces-row-hover", className: "paces-border-top paces-list-table", onRow: () => ({
                            style: { cursor: 'default' },
                        }), locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsx(Empty, { description: "No hay productos registrados" }) }),
                        }, pagination: {
                            current: page,
                            pageSize: pageSize,
                            total: data?.total || 0,
                            onChange: handlePageChange,
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        } })] })] }));
};
export default Productos;
