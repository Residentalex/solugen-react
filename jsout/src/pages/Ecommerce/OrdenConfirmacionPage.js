import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, List, Typography, Divider, Spin, Alert, Descriptions, Row, Col, message, } from 'antd';
import { CheckCircleOutlined, ShoppingOutlined, EyeOutlined, } from '@ant-design/icons';
import { ecommerceApi } from '../../api/ecommerceApi';
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
const OrdenConfirmacionPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [orden, setOrden] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!id) {
            setError('No se proporcionó un ID de orden');
            setLoading(false);
            return;
        }
        const cargarOrden = async () => {
            try {
                const data = await ecommerceApi.obtenerOrden(id);
                setOrden(data);
            }
            catch (err) {
                const msg = err?.response?.data?.errorMessage || 'Error al cargar la orden';
                setError(msg);
                message.error(msg);
            }
            finally {
                setLoading(false);
            }
        };
        cargarOrden();
    }, [id]);
    if (loading) {
        return (_jsx("div", { className: "store-orden-confirmacion", children: _jsx(Spin, { size: "large" }) }));
    }
    if (error || !orden) {
        return (_jsxs("div", { className: "store-orden-confirmacion", children: [_jsx(Alert, { message: "Error", description: error || 'No se encontró la orden', type: "error", showIcon: true, style: { marginBottom: 24 } }), _jsx(Button, { type: "primary", icon: _jsx(ShoppingOutlined, {}), onClick: () => navigate('/store'), children: "Volver a la tienda" })] }));
    }
    return (_jsxs("div", { className: "store-orden-confirmacion", children: [_jsx(CheckCircleOutlined, { style: {
                    fontSize: 64,
                    color: '#52c41a',
                    marginBottom: 16,
                } }), _jsx(Title, { level: 2, style: { marginBottom: 8 }, children: "\u00A1Orden creada exitosamente!" }), _jsx(Text, { type: "secondary", style: { fontSize: 16, display: 'block', marginBottom: 16 }, children: "Gracias por tu compra. Hemos recibido tu pedido y lo estamos procesando." }), _jsxs("div", { className: "store-orden-numero", children: ["#", orden.noOrden] }), _jsx(Text, { type: "secondary", style: { display: 'block', marginBottom: 24 }, children: formatFecha(orden.fechaCreacion) }), _jsxs(Card, { bordered: false, style: { marginBottom: 24, textAlign: 'left' }, children: [_jsx(Title, { level: 5, style: { marginBottom: 16 }, children: "Resumen de la orden" }), _jsx(List, { dataSource: orden.detalles, renderItem: (item) => (_jsxs(List.Item, { style: {
                                padding: '10px 0',
                                borderBottom: '1px solid var(--paces-border)',
                            }, children: [_jsx(List.Item.Meta, { title: _jsx(Text, { strong: true, style: { fontSize: 14 }, children: item.nombreProducto }), description: _jsxs(Text, { type: "secondary", style: { fontSize: 12 }, children: [item.cantidad, " x ", formatCurrency(item.precioUnitario)] }) }), _jsx(Text, { strong: true, children: formatCurrency(item.subtotal) })] })) }), _jsx(Divider, { style: { margin: '16px 0' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsx(Text, { type: "secondary", children: "Subtotal" }), _jsx(Text, { children: formatCurrency(orden.subtotal) })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsx(Text, { type: "secondary", children: "Impuestos" }), _jsx(Text, { children: formatCurrency(orden.impuestos) })] }), _jsx(Divider, { style: { margin: '8px 0' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx(Text, { strong: true, style: { fontSize: 16 }, children: "Total" }), _jsx(Text, { strong: true, style: { fontSize: 16, color: 'var(--paces-primary)' }, children: formatCurrency(orden.total) })] })] }), _jsxs(Card, { bordered: false, style: { marginBottom: 24, textAlign: 'left' }, children: [_jsx(Title, { level: 5, style: { marginBottom: 16 }, children: "Datos del cliente" }), _jsxs(Descriptions, { bordered: true, size: "small", column: 1, children: [_jsx(Descriptions.Item, { label: "Nombre", children: orden.nombreCliente }), _jsx(Descriptions.Item, { label: "Email", children: orden.email }), _jsx(Descriptions.Item, { label: "Tel\u00E9fono", children: orden.telefono }), _jsx(Descriptions.Item, { label: "Direcci\u00F3n", children: orden.direccion }), orden.notas && (_jsx(Descriptions.Item, { label: "Notas", children: orden.notas }))] })] }), _jsxs(Row, { gutter: [16, 16], justify: "center", children: [_jsx(Col, { xs: 24, sm: 12, md: 10, lg: 8, children: _jsx(Button, { type: "primary", block: true, size: "large", icon: _jsx(ShoppingOutlined, {}), onClick: () => navigate('/store'), children: "Volver a la tienda" }) }), _jsx(Col, { xs: 24, sm: 12, md: 10, lg: 8, children: _jsx(Button, { block: true, size: "large", icon: _jsx(EyeOutlined, {}), onClick: () => navigate('/store/ordenes'), children: "Ver mis \u00F3rdenes" }) })] })] }));
};
export default OrdenConfirmacionPage;
