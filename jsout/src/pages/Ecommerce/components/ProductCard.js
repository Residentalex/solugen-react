import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Tag, Button, Typography, message } from 'antd';
import { ShoppingCartOutlined, ShoppingOutlined, HeartOutlined, HeartFilled, } from '@ant-design/icons';
import { useCarritoStore } from '../../../stores/useCarritoStore';
import { useFavoritosStore } from '../../../stores/useFavoritosStore';
import { formatCurrency } from '../data/mockData';
const { Text } = Typography;
const ProductCard = ({ producto, compact = false }) => {
    const navigate = useNavigate();
    const favoritos = useFavoritosStore((state) => state.favoritos);
    const toggleFavorito = useFavoritosStore((state) => state.toggleFavorito);
    const esFav = favoritos.some((f) => f.codigoProducto === producto.codigo);
    const handleClick = useCallback(() => {
        navigate(`/store/producto/${producto.codigo}`);
    }, [navigate, producto.codigo]);
    const handleAddToCart = useCallback(async (e) => {
        e.stopPropagation();
        try {
            await useCarritoStore.getState().agregarProducto(producto.codigo, 1);
            message.success('Agregado al carrito');
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al agregar al carrito');
        }
    }, [producto.codigo]);
    const handleToggleFavorito = useCallback(async (e) => {
        e.stopPropagation();
        await toggleFavorito(producto.codigo);
    }, [toggleFavorito, producto.codigo]);
    return (_jsxs(Card, { className: `store-product-card-premium${compact ? ' compact' : ''}`, bordered: false, onClick: handleClick, bodyStyle: { padding: 0 }, children: [_jsxs("div", { className: "store-product-image-wrapper", children: [_jsx("div", { className: "store-product-image-placeholder", children: _jsx(ShoppingOutlined, { "aria-hidden": "true" }) }), _jsx("button", { className: "store-product-fav-btn", onClick: handleToggleFavorito, "aria-label": esFav ? 'Eliminar de favoritos' : 'Agregar a favoritos', children: esFav ? (_jsx(HeartFilled, { style: { color: '#ff4d4f' } })) : (_jsx(HeartOutlined, { style: { color: '#fff' } })) }), _jsx("div", { className: "store-product-badges", children: producto.precioOferta != null && (_jsxs(Tag, { color: "error", className: "store-badge", children: ["-", Math.round((1 - producto.precioOferta / producto.precio) * 100), "%"] })) })] }), _jsxs("div", { className: "store-product-info-wrapper", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Tag, { className: "store-product-category-tag", style: { fontSize: 11 }, children: producto.categoria }), producto.marca && (_jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: producto.marca }))] }), _jsx(Text, { className: "store-product-name", strong: true, children: producto.nombre }), _jsxs("div", { style: { marginTop: 4, minHeight: 18 }, children: [producto.existencia === 0 && (_jsx(Tag, { color: "default", style: { fontSize: 11 }, children: "Agotado" })), producto.existencia !== null && producto.existencia > 0 && (_jsxs(Text, { type: "secondary", style: { fontSize: 12 }, children: [producto.existencia, " disponibles"] }))] }), _jsx("div", { className: "store-product-prices", children: producto.precioOferta != null ? (_jsxs(_Fragment, { children: [_jsx(Text, { className: "store-product-price-offer", children: formatCurrency(producto.precioOferta) }), _jsx(Text, { className: "store-product-price-old", delete: true, children: formatCurrency(producto.precio) })] })) : (_jsx(Text, { className: "store-product-price", children: formatCurrency(producto.precio) })) }), _jsx(Button, { type: "primary", size: "small", icon: _jsx(ShoppingCartOutlined, {}), className: "store-product-add-btn", onClick: handleAddToCart, block: true, disabled: producto.existencia === 0, children: producto.existencia === 0 ? 'Agotado' : 'Agregar' })] })] }));
};
export default ProductCard;
