import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { Table, Card, Tag, Space, Button, Typography, Popconfirm, message, Empty, Modal, Alert, Input } from 'antd';
import { StopOutlined, KeyOutlined, CopyOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiTokenApi } from '../../api/apiTokenApi';
import PermissionGate from '../../components/PermissionGate';
import ApiTokenCrearModal from './ApiTokenCrearModal';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const ApiTokens = () => {
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const usuario = useAuthStore((s) => s.usuario);
    const [searchText, setSearchText] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [revokingId, setRevokingId] = useState(null);
    const [renovarModal, setRenovarModal] = useState({ open: false, token: '', nombre: '' });
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['apiTokens'],
        queryFn: async () => {
            const result = await apiTokenApi.listar();
            return result || [];
        },
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('MApiToken');
        return () => resetToolbar();
    }, [setActiveModule, resetToolbar]);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const handleSearch = (value) => {
        setSearchText(value);
    };
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const cols = columns.filter((c) => c.key !== 'acciones');
        exportToExcel({
            fileName: `ApiTokens_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'API Tokens',
            companyName,
            columnHeaders: cols.map((c) => c.title),
            dataRows: filteredData.map((item) => cols.map((col) => {
                const val = item[col.dataIndex];
                return val !== null && val !== undefined ? String(val) : '';
            })),
        });
    };
    const handleRevocar = async (id) => {
        setRevokingId(id);
        try {
            await apiTokenApi.revocar(id);
            message.success('Token revocado correctamente');
            refetch();
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al revocar token');
        }
        finally {
            setRevokingId(null);
        }
    };
    const handleTokenCreated = () => {
        refetch();
    };
    const handleRenovar = async (id, nombre) => {
        try {
            const result = await apiTokenApi.renovar(id);
            setRenovarModal({ open: true, token: result.token, nombre });
            message.success('Token renovado correctamente');
            refetch();
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al renovar token');
        }
    };
    const filteredData = useMemo(() => {
        const list = data || [];
        if (!searchText)
            return list;
        const lower = searchText.toLowerCase();
        return list.filter((item) => item.nombre.toLowerCase().includes(lower) ||
            item.nombreUsuario?.toLowerCase().includes(lower));
    }, [data, searchText]);
    const formatFecha = (val) => {
        if (!val)
            return 'Nunca';
        const d = new Date(val);
        if (isNaN(d.getTime()))
            return val;
        return d.toLocaleDateString('es-DO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    const columns = [
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            width: 250,
            render: (nombre) => (_jsxs(Space, { children: [_jsx(KeyOutlined, { style: { color: '#556ee6' } }), _jsx(Text, { strong: true, children: nombre })] })),
        },
        {
            title: 'Creado',
            dataIndex: 'creadoEn',
            key: 'creadoEn',
            width: 180,
            render: (val) => _jsx(Text, { children: formatFecha(val) }),
        },
        {
            title: 'Último uso',
            dataIndex: 'ultimoUso',
            key: 'ultimoUso',
            width: 180,
            render: (val) => (_jsx(Text, { type: val ? undefined : 'secondary', children: formatFecha(val) })),
        },
        {
            title: 'Estado',
            dataIndex: 'activo',
            key: 'activo',
            width: 120,
            align: 'center',
            render: (activo) => activo ? (_jsx(Tag, { color: "success", children: "Activo" })) : (_jsx(Tag, { color: "error", children: "Revocado" })),
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 120,
            align: 'center',
            render: (_, record) => record.activo ? (_jsx(Popconfirm, { title: "Revocar token", description: "\u00BFEst\u00E1s seguro de revocar este token? Los servicios que lo usen dejar\u00E1n de funcionar.", okText: "Revocar", cancelText: "Cancelar", okButtonProps: { danger: true }, onConfirm: () => handleRevocar(record.id), children: _jsx(Button, { type: "text", size: "small", danger: true, icon: _jsx(StopOutlined, {}), loading: revokingId === record.id, children: "Revocar" }) })) : (_jsx(Button, { type: "text", size: "small", icon: _jsx(KeyOutlined, {}), onClick: () => handleRenovar(record.id, record.nombre), children: "Renovar" })),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar API tokens", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: 25, onPageSizeChange: (v) => { }, ocultarPageSize: true, onNuevo: () => setModalOpen(true), onReload: () => refetch(), onExportarExcel: handleExportarExcel }), _jsx(Table, { columns: columns, dataSource: filteredData, rowKey: "id", loading: isLoading, scroll: { x: 850 }, size: "middle", rowClassName: "paces-row-hover", className: "paces-border-top paces-list-table", pagination: {
                            pageSize: 25,
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        }, locale: { emptyText: _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No hay tokens registrados" }) }) } })] }), _jsx(ApiTokenCrearModal, { open: modalOpen, onClose: () => setModalOpen(false), onCreated: handleTokenCreated }), _jsxs(Modal, { title: `Token renovado: ${renovarModal.nombre}`, open: renovarModal.open, onCancel: () => setRenovarModal({ open: false, token: '', nombre: '' }), footer: _jsxs(Space, { children: [_jsx(Button, { onClick: async () => {
                                const texto = renovarModal.token;
                                let exito = false;
                                if (navigator.clipboard?.writeText) {
                                    try {
                                        await navigator.clipboard.writeText(texto);
                                        exito = true;
                                    }
                                    catch { /* fallback */ }
                                }
                                if (!exito) {
                                    try {
                                        const ta = document.createElement('textarea');
                                        ta.value = texto;
                                        ta.style.position = 'fixed';
                                        ta.style.opacity = '0';
                                        ta.style.left = '-9999px';
                                        document.body.appendChild(ta);
                                        ta.select();
                                        document.execCommand('copy');
                                        document.body.removeChild(ta);
                                        exito = true;
                                    }
                                    catch { /* nada */ }
                                }
                                if (exito) {
                                    message.success('Token copiado al portapapeles');
                                }
                                else {
                                    message.error('No se pudo copiar el token');
                                }
                            }, icon: _jsx(CopyOutlined, {}), children: "Copiar" }), _jsx(Button, { type: "primary", onClick: () => setRenovarModal({ open: false, token: '', nombre: '' }), children: "Cerrar" })] }), width: 600, children: [_jsx(Alert, { message: "Guarde este token en un lugar seguro. No podr\u00E1 volver a verlo.", type: "warning", showIcon: true, style: { marginBottom: 16 } }), _jsx(Input.TextArea, { rows: 3, value: renovarModal.token, readOnly: true, style: { fontFamily: 'monospace', fontSize: 13 } })] })] }));
};
export default ApiTokens;
