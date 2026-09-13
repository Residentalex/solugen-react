import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer, List, Button, InputNumber, Skeleton, Empty, Typography, Divider } from 'antd';
import { DeleteOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useCarritoStore } from '../../../stores/useCarritoStore';
import { message } from 'antd';
const { Text, Title } = Typography;
function formatCurrency(value) {
    return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP',
        minimumFractionDigits: 2,
    }).format(value);
}
const CarritoDrawer = ({ open, onClose }) => {
    const navigate = useNavigate();
    const { items, totalItems, subtotal, impuestos, total, loading, actualizarCantidad, eliminarItem, vaciarCarrito } = useCarritoStore();
    const handleCantidadChange = async (id, cantidad) => {
        if (!cantidad || cantidad < 1)
            return;
        try {
            await actualizarCantidad(id, cantidad);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al actualizar cantidad');
        }
    };
    const handleEliminar = async (id) => {
        try {
            await eliminarItem(id);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al eliminar el producto');
        }
    };
    const handleVaciar = async () => {
        try {
            await vaciarCarrito();
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al vaciar el carrito');
        }
    };
    const handlePagar = () => {
        onClose();
        navigate('/store/checkout');
    };
    return (_jsx(Drawer, { title: `Carrito (${totalItems})`, placement: "right", onClose: onClose, open: open, width: 420, styles: { body: { padding: 0 } }, children: loading && items.length === 0 ? (_jsx("div", { style: { padding: 24 }, children: _jsx(Skeleton, { active: true, paragraph: { rows: 4 } }) })) : items.length === 0 ? (_jsx(Empty, { image: _jsx(ShoppingCartOutlined, { style: { fontSize: 64, color: '#ccc' } }), description: "Tu carrito est\u00E1 vac\u00EDo", style: { marginTop: 48 } })) : (_jsxs(_Fragment, { children: [_jsx(List, { dataSource: items, renderItem: (item) => (_jsx(List.Item, { style: { padding: '12px 24px', borderBottom: '1px solid #f0f0f0' }, actions: [
                            _jsx(Button, { type: "text", danger: true, icon: _jsx(DeleteOutlined, {}), onClick: () => handleEliminar(item.id) }, "delete"),
                        ], children: _jsx(List.Item.Meta, { avatar: _jsx("div", { style: {
                                    width: 64,
                                    height: 64,
                                    borderRadius: 8,
                                    background: '#f5f5f5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 24,
                                    color: '#bbb',
                                }, children: _jsx(ShoppingCartOutlined, {}) }), title: _jsx(Text, { strong: true, style: { fontSize: 14 }, children: item.nombreProducto }), description: _jsxs("div", { style: { marginTop: 4 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }, children: [_jsx(InputNumber, { min: 1, max: 999, value: item.cantidad, onChange: (val) => handleCantidadChange(item.id, val), size: "small", style: { width: 70 } }), _jsxs(Text, { type: "secondary", style: { fontSize: 12 }, children: ["x ", formatCurrency(item.precioOferta ?? item.precioUnitario)] })] }), _jsxs(Text, { strong: true, style: { fontSize: 13, display: 'block', marginTop: 4 }, children: ["Subtotal: ", formatCurrency(item.subtotal)] })] }) }) })) }), _jsxs("div", { style: { padding: '16px 24px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsx(Text, { type: "secondary", children: "Subtotal" }), _jsx(Text, { children: formatCurrency(subtotal) })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsx(Text, { type: "secondary", children: "Impuestos" }), _jsx(Text, { children: formatCurrency(impuestos) })] }), _jsx(Divider, { style: { margin: '8px 0' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 16 }, children: [_jsx(Text, { strong: true, style: { fontSize: 16 }, children: "Total" }), _jsx(Text, { strong: true, style: { fontSize: 16 }, children: formatCurrency(total) })] }), _jsx(Button, { type: "primary", block: true, size: "large", onClick: handlePagar, style: { marginBottom: 8 }, children: "Proceder al pago" }), _jsx(Button, { block: true, danger: true, ghost: true, onClick: handleVaciar, disabled: items.length === 0, children: "Vaciar carrito" })] })] })) }));
};
export default CarritoDrawer;
