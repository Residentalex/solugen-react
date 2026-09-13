import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Table, Card, Button, Typography, Space, Alert, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { proveedorApi } from '../../api/proveedorApi';
import PermissionGate from '../../components/PermissionGate';
import { toTitleCase } from '../../utils/formats';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const Proveedores = () => {
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const [searchText, setSearchText] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [total, setTotal] = useState(0);
    React.useEffect(() => {
        setActiveModule('MSUP');
        updateToolbar({});
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar]);
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['proveedores', sucursalActiva, page, pageSize, searchText],
        queryFn: async () => {
            const salto = (page - 1) * pageSize;
            let resultados;
            if (searchText.length > 2) {
                resultados = await proveedorApi.filtrar(sucursalActiva, searchText, searchText);
            }
            else {
                resultados = await proveedorApi.obtenerListado(sucursalActiva, pageSize, salto);
            }
            const totalCount = resultados.length < pageSize ? (page - 1) * pageSize + resultados.length : page * pageSize + 1;
            setTotal(totalCount);
            return resultados || [];
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
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
            fileName: `Proveedores_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Proveedores',
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
    };
    const columns = [
        {
            title: 'Código',
            dataIndex: 'codigo',
            key: 'codigo',
            width: 120,
            fixed: 'left',
            render: (val, record) => (_jsx(Link, { to: `/MProveedor/${record.codigo}`, className: "paces-doc-link", children: _jsx(Text, { strong: true, children: val }) })),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            width: 300,
            render: (name) => (_jsxs(Space, { children: [_jsx("div", { className: "paces-avatar-initials", children: (name || '?').charAt(0).toUpperCase() }), _jsx(Text, { children: toTitleCase(name || '') })] })),
        },
        {
            title: 'Identificación',
            dataIndex: 'identificacion',
            key: 'identificacion',
            width: 160,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        {
            title: 'Teléfono',
            dataIndex: 'telefono',
            key: 'telefono',
            width: 140,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        {
            title: 'Días Crédito',
            dataIndex: 'diasCredito',
            key: 'diasCredito',
            width: 120,
            align: 'right',
            render: (val) => _jsx(Text, { children: val ?? '-' }),
        },
        {
            title: 'Requiere ORC',
            dataIndex: 'requiereORC',
            key: 'requiereORC',
            width: 130,
            align: 'center',
            render: (val) => _jsx(Text, { children: val ? 'Sí' : 'No' }),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar proveedores", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); setPage(1); }, onNuevo: () => navigate('/MProveedor/nuevo'), onReload: () => refetch(), onExportarExcel: handleExportarExcel }), _jsx(Table, { columns: columns, dataSource: data || [], rowKey: "codigo", loading: isLoading, scroll: { x: 1100 }, size: "middle", rowClassName: "paces-row-hover", onChange: handleTableChange, pagination: {
                            current: page,
                            pageSize,
                            total,
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        }, locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsx(Empty, { description: "No hay proveedores registrados" }) }),
                        }, className: "paces-border-top paces-list-table" })] })] }));
};
export default Proveedores;
