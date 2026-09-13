import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Table, Button, Select, Tag, Typography, Alert, Empty, Space, } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { clienteApi } from '../../api/clienteApi';
import { formatCurrency } from '../../utils/formats';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import EntidadColumnCell from '../../components/EntidadColumnCell';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const Clientes = () => {
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalClientes = useCompanyStore((s) => s.data.sucursalClientes);
    const usuario = useAuthStore((s) => s.usuario);
    const pantallaActual = usuario?.pantallas.find((p) => p.codigo === 'MCliente');
    const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;
    const [searchText, setSearchText] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [filtroActivo, setFiltroActivo] = useState('todos');
    React.useEffect(() => {
        setActiveModule('MCliente');
        updateToolbar({});
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar]);
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['clientes', sucursalClientes, page, pageSize, searchText, filtroActivo],
        queryFn: async () => {
            const salto = (page - 1) * pageSize;
            const soloActivos = filtroActivo === 'todos' ? undefined : filtroActivo === 'activos';
            const params = {
                cantidad: pageSize, salto,
            };
            if (soloActivos !== undefined)
                params.activo = soloActivos;
            if (searchText) {
                params.codigo = searchText;
                params.nombre = searchText;
            }
            const { items, total } = await clienteApi.obtenerVista(sucursalClientes, params);
            return { datos: items || [], total };
        },
        enabled: sucursalClientes !== undefined,
    });
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalClientes);
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
            fileName: `Clientes_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Clientes',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    const handleSearch = (value) => {
        setSearchText(value);
        setPage(1);
    };
    const abrirNuevo = () => window.location.href = '/MCliente/nuevo';
    const columns = [
        {
            title: 'Código',
            dataIndex: 'codigo',
            key: 'codigo',
            width: 120,
            fixed: 'left',
            render: (val, record) => puedeEditar ? (_jsx(Link, { to: `/MCliente/${record.codigo}`, className: "paces-doc-link", style: { fontWeight: 500 }, children: val })) : (_jsx(Text, { style: { fontFamily: 'monospace' }, children: val })),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            width: 320,
            render: (name, record) => (_jsx(EntidadColumnCell, { name: name, diasCredito: record.diasCredito, identificacion: record.identificacion })),
        },
        {
            title: 'Teléfono',
            dataIndex: 'telefono',
            key: 'telefono',
            width: 130,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        {
            title: 'Estado',
            dataIndex: 'activo',
            key: 'activo',
            width: 90,
            render: (activo) => (_jsx(Tag, { color: activo ? 'green' : 'default', children: activo ? 'Activo' : 'Inactivo' })),
        },
        {
            title: 'Balance',
            dataIndex: 'balance',
            key: 'balance',
            width: 130,
            align: 'right',
            render: (val) => (_jsx(Text, { style: { fontFamily: 'monospace' }, children: val != null ? formatCurrency(val) : '-' })),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar clientes", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); setPage(1); }, onNuevo: abrirNuevo, onReload: () => refetch(), onExportarExcel: handleExportarExcel, filtros: _jsx(Select, { value: filtroActivo, onChange: (val) => { setFiltroActivo(val); setPage(1); }, style: { width: 130 }, size: "middle", options: [
                                { value: 'todos', label: 'Todos' },
                                { value: 'activos', label: 'Solo activos' },
                                { value: 'inactivos', label: 'Solo inactivos' },
                            ] }) }), _jsx(Table, { columns: columns, dataSource: data?.datos || [], rowKey: "codigo", loading: isLoading, scroll: { x: 1000 }, size: "middle", rowClassName: "paces-row-hover", className: "paces-border-top paces-list-table", locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsx(Empty, { description: "No hay clientes registrados" }) }),
                        }, pagination: {
                            current: page,
                            pageSize,
                            total: data?.total || 0,
                            onChange: (p) => setPage(p),
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        } }), _jsxs("div", { style: { display: 'flex', gap: 16, flexWrap: 'wrap', padding: '8px 16px' }, children: [_jsxs(Space, { size: 4, children: [_jsx("div", { style: { width: 12, height: 12, borderRadius: '50%', backgroundColor: '#E05252' } }), _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "0-14 d\u00EDas" })] }), _jsxs(Space, { size: 4, children: [_jsx("div", { style: { width: 12, height: 12, borderRadius: '50%', backgroundColor: '#4A8FD4' } }), _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "15-29 d\u00EDas" })] }), _jsxs(Space, { size: 4, children: [_jsx("div", { style: { width: 12, height: 12, borderRadius: '50%', backgroundColor: '#2BA88C' } }), _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "30+ d\u00EDas" })] })] })] })] }));
};
export default Clientes;
