import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Tag, Button, Empty, Modal, Descriptions, List, Typography, Spin, Alert, Divider, } from 'antd';
import { ShoppingOutlined, ArrowLeftOutlined, ReloadOutlined, FileExcelOutlined, } from '@ant-design/icons';
import { ecommerceApi } from '../../api/ecommerceApi';
import { useCarritoStore } from '../../stores/useCarritoStore';
import { useAuthStore } from '../../stores/authStore';
import PermissionGate from '../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text, Title } = Typography;
function formatCurrency(value) {
    return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP',
        minimumFractionDigits: 2,
    }).format(value);
}
function formatFecha(fecha) {
    try {
        const d = new Date(fecha);
        return d.toLocaleDateString('es-DO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
    catch {
        return fecha;
    }
}
function formatFechaCorta(fecha) {
    try {
        const d = new Date(fecha);
        return d.toLocaleDateString('es-DO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }
    catch {
        return fecha;
    }
}
function getEstadoColor(estado) {
    const e = estado.toUpperCase();
    if (e === 'PENDIENTE')
        return 'orange';
    if (e === 'COMPLETADA' || e === 'COMPLETADO')
        return 'green';
    if (e === 'CANCELADA' || e === 'CANCELADO')
        return 'red';
    return 'default';
}
const OrdenesPage = () => {
    const navigate = useNavigate();
    const sessionId = useCarritoStore((s) => s.sessionId);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [ordenes, setOrdenes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingError, setLoadingError] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
    const cargarOrdenes = useCallback(async () => {
        setLoading(true);
        setLoadingError(false);
        try {
            const data = await ecommerceApi.listarOrdenes(sessionId);
            setOrdenes(data.map((o) => ({ ...o, key: o.id })));
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar las órdenes';
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [sessionId]);
    useEffect(() => {
        cargarOrdenes();
    }, [cargarOrdenes]);
    const handleVerDetalle = useCallback((orden) => {
        setOrdenSeleccionada(orden);
        setModalOpen(true);
    }, []);
    const handleCloseModal = useCallback(() => {
        setModalOpen(false);
        setOrdenSeleccionada(null);
    }, []);
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const cols = columns.filter((c) => c.key !== 'acciones');
        exportToExcel({
            fileName: `MisOrdenes_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Mis Órdenes',
            companyName,
            columnHeaders: cols.map((c) => c.title),
            dataRows: ordenes.map((item) => cols.map((col) => {
                const val = item[col.dataIndex];
                return val !== null && val !== undefined ? String(val) : '';
            })),
        });
    };
    const handleRefresh = useCallback(() => {
        cargarOrdenes();
    }, [cargarOrdenes]);
    const columns = [
        {
            title: 'No. Orden',
            dataIndex: 'noOrden',
            key: 'noOrden',
            width: 120,
            render: (noOrden, record) => (_jsxs(Button, { type: "link", style: { padding: 0, fontWeight: 700, color: '#556ee6' }, onClick: () => handleVerDetalle(record), children: ["#", noOrden] })),
        },
        {
            title: 'Fecha',
            dataIndex: 'fechaCreacion',
            key: 'fechaCreacion',
            width: 160,
            render: (fecha) => formatFechaCorta(fecha),
        },
        {
            title: 'Cliente',
            dataIndex: 'nombreCliente',
            key: 'nombreCliente',
            ellipsis: true,
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 120,
            render: (estado) => (_jsx(Tag, { color: getEstadoColor(estado), children: estado })),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 130,
            align: 'right',
            render: (total) => formatCurrency(total),
        },
    ];
    return (_jsxs("div", { className: "store-page", children: [_jsxs("div", { className: "store-ordenes-page", children: [_jsxs("div", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 24,
                            flexWrap: 'wrap',
                            gap: 12,
                        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate('/store'), children: "Volver a la tienda" }), _jsx(Title, { level: 3, style: { margin: 0 }, children: "Mis \u00D3rdenes" })] }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: handleExportarExcel }) }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: handleRefresh, children: "Recargar" })] }), loadingError && (_jsx(Alert, { message: "Error al cargar \u00F3rdenes", description: "No se pudieron cargar tus \u00F3rdenes. Intenta recargar la p\u00E1gina.", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, icon: _jsx(ReloadOutlined, {}), children: "Reintentar" }) })), loading ? (_jsx("div", { style: { textAlign: 'center', padding: 48 }, children: _jsx(Spin, { size: "large" }) })) : ordenes.length === 0 ? (_jsx(Empty, { description: "No tienes \u00F3rdenes a\u00FAn", image: Empty.PRESENTED_IMAGE_SIMPLE, style: { marginTop: 48 }, children: _jsx(Button, { type: "primary", icon: _jsx(ShoppingOutlined, {}), onClick: () => navigate('/store'), children: "Ir a comprar" }) })) : (_jsx(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: _jsx(Table, { className: "paces-border-top paces-list-table", columns: columns, dataSource: ordenes, rowKey: "id", pagination: {
                                showTotal: (t) => `${t} orden${t !== 1 ? 'es' : ''}`,
                            }, size: "middle" }) }))] }), _jsx(Modal, { title: `Orden #${ordenSeleccionada?.noOrden}`, open: modalOpen, onCancel: handleCloseModal, footer: [
                    _jsx(Button, { onClick: handleCloseModal, children: "Cerrar" }, "close"),
                ], width: 720, children: ordenSeleccionada && (_jsxs(_Fragment, { children: [_jsxs(Descriptions, { bordered: true, size: "small", column: 1, style: { marginBottom: 16 }, children: [_jsx(Descriptions.Item, { label: "Cliente", children: ordenSeleccionada.nombreCliente }), _jsx(Descriptions.Item, { label: "Email", children: ordenSeleccionada.email }), _jsx(Descriptions.Item, { label: "Tel\u00E9fono", children: ordenSeleccionada.telefono }), _jsx(Descriptions.Item, { label: "Direcci\u00F3n", children: ordenSeleccionada.direccion }), _jsx(Descriptions.Item, { label: "Estado", children: _jsx(Tag, { color: getEstadoColor(ordenSeleccionada.estado), children: ordenSeleccionada.estado }) }), _jsx(Descriptions.Item, { label: "Fecha", children: formatFecha(ordenSeleccionada.fechaCreacion) }), ordenSeleccionada.notas && (_jsx(Descriptions.Item, { label: "Notas", children: ordenSeleccionada.notas }))] }), _jsx(Title, { level: 5, style: { marginBottom: 12 }, children: "Productos" }), _jsx(List, { dataSource: ordenSeleccionada.detalles, renderItem: (item) => (_jsxs(List.Item, { style: {
                                    padding: '10px 0',
                                    borderBottom: '1px solid var(--paces-border)',
                                }, children: [_jsx(List.Item.Meta, { title: _jsx(Text, { strong: true, style: { fontSize: 14 }, children: item.nombreProducto }), description: _jsxs(Text, { type: "secondary", style: { fontSize: 12 }, children: [item.cantidad, " x ", formatCurrency(item.precioUnitario)] }) }), _jsx(Text, { strong: true, children: formatCurrency(item.subtotal) })] })) }), _jsx(Divider, { style: { margin: '16px 0' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsx(Text, { type: "secondary", children: "Subtotal" }), _jsx(Text, { children: formatCurrency(ordenSeleccionada.subtotal) })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsx(Text, { type: "secondary", children: "Impuestos" }), _jsx(Text, { children: formatCurrency(ordenSeleccionada.impuestos) })] }), _jsx(Divider, { style: { margin: '8px 0' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx(Text, { strong: true, style: { fontSize: 16 }, children: "Total" }), _jsx(Text, { strong: true, style: { fontSize: 16, color: 'var(--paces-primary)' }, children: formatCurrency(ordenSeleccionada.total) })] })] })) })] }));
};
export default OrdenesPage;
