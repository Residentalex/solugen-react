import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Row, Col, Card, Tag, Pagination, Skeleton, Result, Alert, Button, Typography, } from 'antd';
import { SearchOutlined, ShoppingCartOutlined, ShoppingOutlined, ReloadOutlined, } from '@ant-design/icons';
import { ecommerceApi } from '../../api/ecommerceApi';
import './Ecommerce.css';
const { Text } = Typography;
/** Formatear moneda en RD$ */
function formatCurrency(value) {
    return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP',
        minimumFractionDigits: 2,
    }).format(value);
}
const PAGE_SIZE = 20;
const Store = () => {
    const navigate = useNavigate();
    // Hooks de estado (siempre antes de cualquier early return)
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingError, setLoadingError] = useState(false);
    const [total, setTotal] = useState(0);
    const [pagina, setPagina] = useState(1);
    const [searchText, setSearchText] = useState('');
    const [categoriaActiva, setCategoriaActiva] = useState('');
    // Carga de categorías
    const cargarCategorias = useCallback(async () => {
        try {
            const cats = await ecommerceApi.obtenerCategorias();
            setCategorias(cats);
        }
        catch {
            // Las categorías son secundarias, no bloquear la página
        }
    }, []);
    // Carga de productos
    const cargarProductos = useCallback(async () => {
        setLoading(true);
        setLoadingError(false);
        try {
            const params = {
                pagina,
                tamano: PAGE_SIZE,
            };
            if (searchText)
                params.buscar = searchText;
            if (categoriaActiva)
                params.categoria = categoriaActiva;
            const result = await ecommerceApi.obtenerProductos(params);
            setProductos(result.items);
            setTotal(result.total);
        }
        catch {
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [pagina, searchText, categoriaActiva]);
    useEffect(() => {
        cargarCategorias();
    }, [cargarCategorias]);
    useEffect(() => {
        cargarProductos();
    }, [cargarProductos]);
    // Handlers
    const handleSearch = useCallback((value) => {
        setSearchText(value);
        setPagina(1);
    }, []);
    const handleRefresh = useCallback(() => {
        cargarProductos();
    }, [cargarProductos]);
    const handleCategoryClick = useCallback((catId) => {
        setCategoriaActiva((prev) => (prev === catId ? '' : catId));
        setPagina(1);
    }, []);
    const handlePageChange = useCallback((page) => {
        setPagina(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);
    // Render de tarjeta de producto
    const renderProductCard = (producto) => (_jsxs(Card, { className: "store-product-card", bordered: false, onClick: () => navigate(`/store/producto/${producto.codigo}`), children: [_jsx("div", { className: "store-product-image", children: _jsx(ShoppingOutlined, {}) }), _jsxs("div", { className: "store-product-info", children: [_jsx("div", { className: "store-product-name", children: producto.nombre }), _jsx("div", { className: "store-product-prices", children: producto.precioOferta != null ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "store-product-price-old", children: formatCurrency(producto.precio) }), _jsx("span", { className: "store-product-price-offer", children: formatCurrency(producto.precioOferta) })] })) : (_jsx("span", { className: "store-product-price", children: formatCurrency(producto.precio) })) }), _jsx("div", { className: "store-product-category", children: _jsx(Tag, { children: producto.categoria || producto.familia }) })] })] }));
    // Render de skeleton cards
    const renderSkeletonCards = () => (_jsx(Row, { gutter: [16, 16], children: Array.from({ length: 8 }).map((_, i) => (_jsx(Col, { xs: 24, sm: 12, lg: 6, children: _jsxs("div", { className: "store-skeleton-card", children: [_jsx(Skeleton.Image, { active: true, style: { width: '100%', height: 'auto' } }), _jsx("div", { className: "ant-skeleton-content", children: _jsx(Skeleton, { active: true, paragraph: { rows: 2 }, title: { width: '60%' } }) })] }) }, i))) }));
    return (_jsxs("div", { style: { minHeight: '100vh', background: '#f5f7fa' }, children: [_jsxs("header", { className: "store-header", children: [_jsxs("div", { className: "store-header-logo", onClick: () => navigate('/store'), children: [_jsx("img", { src: "/images/logo.png", alt: "Genesis" }), _jsx("span", { children: "Genesis Store" })] }), _jsx("div", { className: "store-header-search", children: _jsx(Input.Search, { placeholder: "Buscar productos...", allowClear: true, onSearch: handleSearch, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }) }), _jsx(ShoppingCartOutlined, { className: "store-header-cart" })] }), _jsxs("main", { className: "store-content", children: [loadingError && (_jsx(Alert, { message: "Error al cargar productos", description: "No se pudieron cargar los productos. Verifica la conexi\u00F3n e intenta de nuevo.", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, icon: _jsx(ReloadOutlined, {}), children: "Reintentar" }) })), categorias.length > 0 && (_jsx("div", { className: "store-categories", children: categorias.map((cat) => (_jsxs("div", { className: `store-category-chip${categoriaActiva === cat.id ? ' active' : ''}`, onClick: () => handleCategoryClick(cat.id), children: [cat.nombre, " (", cat.totalProductos, ")"] }, cat.id))) })), loading && renderSkeletonCards(), !loading && !loadingError && productos.length === 0 && (_jsx(Result, { icon: _jsx(ShoppingOutlined, {}), title: "Sin resultados", subTitle: searchText || categoriaActiva
                            ? 'No se encontraron productos con los filtros actuales.'
                            : 'No hay productos disponibles en este momento.', extra: (searchText || categoriaActiva) && (_jsx(Button, { onClick: () => {
                                setSearchText('');
                                setCategoriaActiva('');
                                setPagina(1);
                            }, children: "Limpiar filtros" })) })), !loading && !loadingError && productos.length > 0 && (_jsxs(_Fragment, { children: [_jsx(Row, { gutter: [16, 16], children: productos.map((prod) => (_jsx(Col, { xs: 24, sm: 12, lg: 6, children: renderProductCard(prod) }, prod.codigo))) }), total > PAGE_SIZE && (_jsx("div", { className: "store-pagination", children: _jsx(Pagination, { current: pagina, total: total, pageSize: PAGE_SIZE, onChange: handlePageChange, showSizeChanger: false, showTotal: (t) => `${t} producto${t !== 1 ? 's' : ''}` }) }))] }))] })] }));
};
export default Store;
