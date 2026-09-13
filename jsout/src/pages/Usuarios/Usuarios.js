import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Input, Select, Tag, Button, message, Space, Card, Typography, Alert, Empty } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import EntidadImagen from '../../components/EntidadImagen';
import { useNavigate, Link } from 'react-router-dom';
import { Sucursal } from '../../types/auth';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { formatDateTime } from '../../utils/formats';
import { usuarioApi } from '../../api/usuarioApi';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
function letraInicial(nombre) {
    return (nombre || '?').charAt(0).toUpperCase();
}
const { Text } = Typography;
const Usuarios = () => {
    const navigate = useNavigate();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const securitySucursal = useAuthStore((s) => s.securitySucursal);
    const [searchText, setSearchText] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['usuarios', searchText],
        queryFn: async () => {
            let result;
            if (searchText) {
                result = await usuarioApi.filtrar(securitySucursal, searchText, searchText);
            }
            else {
                result = await usuarioApi.obtenerListado(securitySucursal);
            }
            return result || [];
        },
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('MUsuario');
        updateToolbar({});
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar]);
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(securitySucursal);
        const dataSource = data || [];
        const cols = columns.filter((c) => c.key !== 'acciones');
        exportToExcel({
            fileName: `Usuarios_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Usuarios',
            companyName,
            columnHeaders: cols.map((c) => c.title),
            dataRows: dataSource.map((item) => cols.map((col) => {
                if (col.key === 'usuario') {
                    return `${item.nombreUsuario || ''} - ${item.nombre || ''}`;
                }
                if (col.key === 'roles') {
                    const roles = item.roles || [];
                    return roles.map((r) => r.nombre).join(', ');
                }
                if (col.key === 'sucursales') {
                    const sucs = item.sucursalesRoles || [];
                    return sucs.map((s) => s.nombreSucursal).join(', ');
                }
                const val = item[col.dataIndex];
                return val !== null && val !== undefined ? String(val) : '';
            })),
        });
    };
    const handleSearch = (value) => {
        setSearchText(value);
    };
    const abrirNuevo = () => {
        navigate('/MUsuario/nuevo');
    };
    const columns = [
        {
            title: 'Usuario',
            key: 'usuario',
            width: 220,
            fixed: 'left',
            render: (_, record) => (_jsxs(Link, { to: `/MUsuario/${record.id}`, style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx(EntidadImagen, { tipo: "USUARIO", entidadID: record.id, fallback: letraInicial(record.nombre), size: 34 }), _jsxs("div", { children: [_jsxs(Text, { className: "paces-text-primary", strong: true, style: { fontSize: 13, lineHeight: 1.3 }, children: [record.nombreUsuario, _jsx(RightOutlined, { style: { fontSize: 10, marginLeft: 4, opacity: 0.5 } })] }), _jsx("br", {}), _jsx(Text, { type: "secondary", style: { lineHeight: 1.3 }, children: record.nombre })] })] })),
        },
        {
            title: 'Roles',
            key: 'roles',
            width: 200,
            render: (_, record) => {
                const roles = record.roles || [];
                const mostrar = roles.slice(0, 3);
                const restantes = roles.length - 3;
                return (_jsxs(Space, { wrap: true, size: 4, children: [mostrar.map((r) => (_jsx(Tag, { color: "blue", style: { fontSize: 11 }, children: r.nombre }, r.id))), restantes > 0 && (_jsxs(Tag, { color: "default", style: { fontSize: 11 }, children: ["+", restantes] }))] }));
            },
        },
        {
            title: 'Sucursales',
            key: 'sucursales',
            width: 200,
            render: (_, record) => (_jsx(Space, { wrap: true, size: 2, children: (record.sucursalesRoles || []).map((sr) => (_jsx(Tag, { style: { fontSize: 11 }, children: sr.nombreSucursal }, sr.sucursal))) })),
        },
        {
            title: 'Último inicio',
            dataIndex: 'ultimoLogin',
            key: 'ultimoLogin',
            width: 170,
            render: (val) => (_jsx(Text, { type: "secondary", children: formatDateTime(val) })),
        },
        {
            title: 'Estado',
            dataIndex: 'activo',
            key: 'activo',
            width: 90,
            render: (activo) => (_jsx(Tag, { color: activo ? 'green' : 'default', children: activo ? 'Activo' : 'Inactivo' })),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar usuarios", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => { setSearchText(''); refetch(); }, children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); setPage(1); }, onNuevo: abrirNuevo, onReload: () => { setSearchText(""); refetch(); }, onExportarExcel: handleExportarExcel }), _jsx(Table, { columns: columns, dataSource: data || [], rowKey: "id", loading: isLoading, scroll: { x: 920 }, size: "middle", rowClassName: "paces-row-hover", className: "paces-border-top paces-list-table", locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsx(Empty, { description: "No hay usuarios registrados" }) }),
                        }, pagination: {
                            current: page,
                            pageSize,
                            onChange: (p) => setPage(p),
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        } })] })] }));
};
export default Usuarios;
