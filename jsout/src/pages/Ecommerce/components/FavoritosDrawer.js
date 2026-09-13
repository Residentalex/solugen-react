import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Drawer, List, Button, Skeleton, Empty, Typography, Tag } from 'antd';
import { DeleteOutlined, ShoppingCartOutlined, HeartOutlined, } from '@ant-design/icons';
import { useFavoritosStore } from '../../../stores/useFavoritosStore';
import { useCarritoStore } from '../../../stores/useCarritoStore';
import { message } from 'antd';
const { Text } = Typography;
function formatCurrency(value) {
    return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP',
        minimumFractionDigits: 2,
    }).format(value);
}
const FavoritosDrawer = ({ open, onClose }) => {
    const { favoritos, totalFavoritos, loading, eliminarFavorito } = useFavoritosStore();
    const handleEliminar = async (id) => {
        try {
            await eliminarFavorito(id);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al eliminar de favoritos');
        }
    };
    const handleAgregarAlCarrito = async (codigoProducto) => {
        try {
            await useCarritoStore.getState().agregarProducto(codigoProducto, 1);
            message.success('Agregado al carrito');
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al agregar al carrito');
        }
    };
    return (_jsx(Drawer, { title: `Favoritos (${totalFavoritos})`, placement: "right", onClose: onClose, open: open, width: 420, styles: { body: { padding: 0 } }, children: loading && favoritos.length === 0 ? (_jsx("div", { style: { padding: 24 }, children: _jsx(Skeleton, { active: true, paragraph: { rows: 4 } }) })) : favoritos.length === 0 ? (_jsx(Empty, { image: _jsx(HeartOutlined, { style: { fontSize: 64, color: '#ccc' } }), description: "No tienes productos en favoritos", style: { marginTop: 48 } })) : (_jsx(List, { dataSource: favoritos, renderItem: (item) => (_jsx(List.Item, { style: { padding: '12px 24px', borderBottom: '1px solid #f0f0f0' }, actions: [
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
                        }, children: _jsx(ShoppingCartOutlined, {}) }), title: _jsx(Text, { strong: true, style: { fontSize: 14 }, children: item.nombreProducto }), description: _jsxs("div", { style: { marginTop: 4 }, children: [_jsx(Tag, { size: "small", style: { fontSize: 11 }, children: item.categoria }), _jsx("div", { style: { marginTop: 4 }, children: item.precioOferta != null ? (_jsxs(_Fragment, { children: [_jsx(Text, { strong: true, style: { color: '#ff4d4f' }, children: formatCurrency(item.precioOferta) }), _jsx(Text, { type: "secondary", delete: true, style: { marginLeft: 8, fontSize: 12 }, children: formatCurrency(item.precio) })] })) : (_jsx(Text, { strong: true, children: formatCurrency(item.precio) })) }), _jsx(Button, { type: "primary", size: "small", icon: _jsx(ShoppingCartOutlined, {}), onClick: () => handleAgregarAlCarrito(item.codigoProducto), style: { marginTop: 8 }, children: "Agregar al carrito" })] }) }) })) })) }));
};
export default FavoritosDrawer;
