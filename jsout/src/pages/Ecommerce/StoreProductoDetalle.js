import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Button, Tag, InputNumber, Skeleton, Alert, Result, Typography, Divider, Space, message, } from 'antd';
import { ArrowLeftOutlined, ShoppingCartOutlined, ShoppingOutlined, ReloadOutlined, HeartOutlined, HeartFilled, } from '@ant-design/icons';
import { ecommerceApi } from '../../api/ecommerceApi';
import { useCarritoStore } from '../../stores/useCarritoStore';
import { useFavoritosStore } from '../../stores/useFavoritosStore';
import StoreHeader from './components/StoreHeader';
import './Ecommerce.css';
const { Text, Title } = Typography;
/** Formatear moneda en RD$ */
function formatCurrency(value) {
    return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP',
        minimumFractionDigits: 2,
    }).format(value);
}
const StoreProductoDetalle = () => {
    const { codigo } = useParams();
    const navigate = useNavigate();
    // Hooks de estado (siempre antes de cualquier early return)
    const [producto, setProducto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingError, setLoadingError] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [cantidad, setCantidad] = useState(1);
    // Hooks de favoritos (SIEMPRE antes de cualquier early return)
    const favoritos = useFavoritosStore((state) => state.favoritos);
    const toggleFavorito = useFavoritosStore((state) => state.toggleFavorito);
    const esFav = producto ? favoritos.some((f) => f.codigoProducto === producto.codigo) : false;
    const cargarProducto = useCallback(async () => {
        if (!codigo)
            return;
        setLoading(true);
        setLoadingError(false);
        setNotFound(false);
        try {
            const result = await ecommerceApi.obtenerProductoPorCodigo(codigo);
            if (!result) {
                setNotFound(true);
            }
            else {
                setProducto(result);
            }
        }
        catch (err) {
            if (err?.response?.status === 404) {
                setNotFound(true);
            }
            else {
                setLoadingError(true);
                message.error(err?.response?.data?.errorMessage || 'Error al cargar el producto');
            }
        }
        finally {
            setLoading(false);
        }
    }, [codigo]);
    useEffect(() => {
        cargarProducto();
    }, [cargarProducto]);
    const handleAddToCart = useCallback(async () => {
        if (!producto)
            return;
        try {
            await useCarritoStore.getState().agregarProducto(producto.codigo, cantidad);
            message.success('Agregado al carrito');
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al agregar al carrito');
        }
    }, [cantidad, producto]);
    const handleToggleFavorito = useCallback(async () => {
        if (!producto)
            return;
        await toggleFavorito(producto.codigo);
    }, [toggleFavorito, producto]);
    // Loading
    if (loading) {
        return (_jsxs("div", { style: { minHeight: '100vh', background: '#f5f7fa' }, children: [_jsx(StoreHeader, {}), _jsx("main", { className: "store-content", children: _jsxs("div", { className: "store-detail-container", children: [_jsx(Skeleton, { active: true, paragraph: { rows: 1 } }), _jsxs(Row, { gutter: [24, 24], style: { marginTop: 16 }, children: [_jsx(Col, { xs: 24, md: 12, children: _jsx(Skeleton.Node, { active: true, style: { width: '100%', aspectRatio: '1', borderRadius: 12, height: 'auto' } }) }), _jsx(Col, { xs: 24, md: 12, children: _jsx(Skeleton, { active: true, paragraph: { rows: 6 } }) })] })] }) })] }));
    }
    // Not found 404
    if (notFound) {
        return (_jsxs("div", { style: { minHeight: '100vh', background: '#f5f7fa' }, children: [_jsx(StoreHeader, {}), _jsx("main", { className: "store-content", children: _jsx(Result, { status: "404", title: "Producto no encontrado", subTitle: "El producto que buscas no existe o ha sido eliminado.", extra: _jsx(Button, { type: "primary", onClick: () => navigate('/store'), children: "Volver al cat\u00E1logo" }) }) })] }));
    }
    return (_jsxs("div", { style: { minHeight: '100vh', background: '#f5f7fa' }, children: [_jsx(StoreHeader, {}), _jsx("main", { className: "store-content", children: _jsxs("div", { className: "store-detail-container", children: [loadingError && (_jsx(Alert, { message: "Error al cargar el producto", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: cargarProducto, icon: _jsx(ReloadOutlined, {}), children: "Reintentar" }) })), producto && !loadingError && (_jsxs(_Fragment, { children: [_jsx(Button, { type: "text", icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate('/store'), className: "store-back-btn", children: "Volver al cat\u00E1logo" }), _jsxs(Row, { gutter: [24, 24], children: [_jsx(Col, { xs: 24, md: 12, children: _jsx("div", { className: "store-detail-image", children: _jsx(ShoppingOutlined, {}) }) }), _jsxs(Col, { xs: 24, md: 12, children: [_jsx(Title, { level: 2, className: "store-detail-name", style: { marginTop: 0 }, children: producto.nombre }), _jsxs(Text, { type: "secondary", className: "store-detail-reference", children: ["Referencia: ", producto.referencia || '-'] }), _jsx("div", { style: { marginTop: 8, marginBottom: 16 }, children: _jsxs(Space, { children: [producto.familia && _jsx(Tag, { color: "blue", children: producto.familia }), producto.categoria && _jsx(Tag, { children: producto.categoria }), producto.marca && _jsx(Tag, { color: "purple", children: producto.marca }), producto.porcentajeImpuesto != null && (_jsxs(Tag, { color: "orange", children: ["ITBIS ", producto.porcentajeImpuesto, "%"] }))] }) }), _jsx(Divider, { style: { margin: '12px 0' } }), _jsx("div", { className: "store-detail-prices", children: producto.precioOferta != null ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "store-detail-price-old", children: formatCurrency(producto.precio) }), _jsx("span", { className: "store-detail-price-offer", children: formatCurrency(producto.precioOferta) })] })) : (_jsx("span", { className: "store-detail-price", children: formatCurrency(producto.precio) })) }), _jsxs(Text, { type: "secondary", children: ["Por ", producto.unidadMedida || 'unidad'] }), _jsxs("div", { style: { marginTop: 8 }, children: [producto.existencia === 0 && (_jsx(Text, { type: "danger", strong: true, children: "Agotado" })), producto.existencia !== null && producto.existencia > 0 && (_jsxs(Text, { type: "secondary", children: [producto.existencia, " unidades disponibles"] }))] }), producto.especificaciones && (_jsxs(_Fragment, { children: [_jsx(Divider, { style: { margin: '16px 0' } }), _jsxs("div", { children: [_jsx(Text, { strong: true, style: { display: 'block', marginBottom: 8 }, children: "Especificaciones" }), _jsx(Text, { type: "secondary", style: { whiteSpace: 'pre-line' }, children: producto.especificaciones })] })] })), _jsx(Divider, { style: { margin: '16px 0' } }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx(Text, { strong: true, style: { display: 'block', marginBottom: 8 }, children: "Cantidad" }), _jsx(InputNumber, { min: 1, max: 999, value: cantidad, onChange: (val) => setCantidad(val || 1), size: "large", style: { width: 120 } })] }), _jsxs("div", { style: { display: 'flex', gap: 12, flexWrap: 'wrap' }, children: [_jsx(Button, { type: "primary", size: "large", icon: _jsx(ShoppingCartOutlined, {}), onClick: handleAddToCart, disabled: producto.existencia === 0, style: {
                                                                height: 48,
                                                                paddingInline: 32,
                                                                fontSize: 16,
                                                                borderRadius: 8,
                                                            }, children: producto.existencia === 0 ? 'Agotado' : 'Agregar al carrito' }), _jsx(Button, { size: "large", icon: esFav ? _jsx(HeartFilled, { style: { color: '#ff4d4f' } }) : _jsx(HeartOutlined, {}), onClick: handleToggleFavorito, style: {
                                                                height: 48,
                                                                width: 48,
                                                                borderRadius: 8,
                                                            } })] })] })] })] }))] }) })] }));
};
export default StoreProductoDetalle;
