import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { message, Alert, Button, Tag, Pagination } from 'antd';
import { ecommerceApi } from '../../api/ecommerceApi';
import { useCarritoStore } from '../../stores/useCarritoStore';
import { useFavoritosStore } from '../../stores/useFavoritosStore';
import StoreHeader from './components/StoreHeader';
import HeroSection from './components/HeroSection';
import CategoriasCarousel from './components/CategoriasCarousel';
import BannersGrid from './components/BannersGrid';
import ProductosDestacados from './components/ProductosDestacados';
import BeneficiosSection from './components/BeneficiosSection';
import ProductosPorCategoria from './components/ProductosPorCategoria';
import MarcasCarousel from './components/MarcasCarousel';
import Newsletter from './components/Newsletter';
import StoreFooter from './components/StoreFooter';
import SkeletonStore from './components/SkeletonStore';
import { mockBeneficios, } from './data/mockData';
import './Ecommerce.css';
const HomePage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const buscar = searchParams.get('buscar') || '';
    const categoria = searchParams.get('categoria') || '';
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [marcas, setMarcas] = useState([]);
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingError, setLoadingError] = useState(false);
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(0);
    const [totalProductos, setTotalProductos] = useState(0);
    const PAGE_SIZE = 20;
    const paginaParam = parseInt(searchParams.get('pagina') || '1', 10);
    const paginaActual = isNaN(paginaParam) || paginaParam < 1 ? 1 : paginaParam;
    const cargarDatos = useCallback(async () => {
        setLoading(true);
        setLoadingError(false);
        try {
            const [productosApi, categoriasApi, bannersApi] = await Promise.all([
                ecommerceApi.obtenerProductos({
                    pagina: paginaActual,
                    tamano: PAGE_SIZE,
                    buscar: buscar || undefined,
                    categoria: categoria || undefined,
                }),
                ecommerceApi.obtenerCategorias(),
                ecommerceApi.obtenerBanners().catch(() => []),
            ]);
            setProductos(productosApi.items);
            setTotalPaginas(productosApi.totalPaginas);
            setTotalProductos(productosApi.total);
            setPagina(productosApi.pagina);
            setCategorias(categoriasApi);
            setBanners(bannersApi);
        }
        catch (err) {
            setLoadingError(true);
            message.error(err?.response?.data?.errorMessage || 'Error al cargar los productos');
        }
        finally {
            setLoading(false);
        }
        // Cargar marcas en segundo plano (no bloquea la página)
        try {
            const marcasApi = await ecommerceApi.obtenerMarcas();
            setMarcas(marcasApi);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar las marcas');
        }
    }, [buscar, categoria, paginaActual]);
    useEffect(() => {
        setPagina(paginaActual);
    }, [paginaActual]);
    useEffect(() => {
        cargarDatos();
        useCarritoStore.getState().cargarCarrito().catch((err) => {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar el carrito');
        });
        useFavoritosStore.getState().cargarFavoritos().catch((err) => {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar favoritos');
        });
    }, [cargarDatos]);
    const handleClearBuscar = useCallback(() => {
        navigate('/store');
    }, [navigate]);
    const handleClearCategoria = useCallback(() => {
        navigate('/store');
    }, [navigate]);
    const handlePageChange = useCallback((nuevaPagina) => {
        const params = new URLSearchParams(searchParams);
        if (nuevaPagina === 1) {
            params.delete('pagina');
        }
        else {
            params.set('pagina', nuevaPagina.toString());
        }
        navigate(`/store?${params.toString()}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [searchParams, navigate]);
    const nombreCategoriaActiva = categoria
        ? categorias.find((c) => c.id === categoria)?.nombre || categoria
        : '';
    if (loading) {
        return _jsx(SkeletonStore, {});
    }
    return (_jsxs("div", { className: "store-page", children: [_jsx(StoreHeader, {}), loadingError && (_jsx(Alert, { message: "Error al cargar los productos", description: "No se pudieron cargar los datos desde el servidor.", type: "error", showIcon: true, action: _jsx(Button, { size: "small", onClick: cargarDatos, children: "Reintentar" }), style: { margin: '16px 24px 0', borderRadius: 8 } })), _jsxs("main", { className: "store-main", children: [_jsx(HeroSection, {}), (buscar || categoria) && (_jsxs("div", { className: "store-filters-active", children: [buscar && (_jsxs(Tag, { className: "store-filter-tag", closable: true, onClose: handleClearBuscar, children: ["Buscando: ", buscar] })), categoria && (_jsxs(Tag, { className: "store-filter-tag", closable: true, onClose: handleClearCategoria, children: ["Categor\u00EDa: ", nombreCategoriaActiva] }))] })), _jsx(CategoriasCarousel, { categorias: categorias, categoriaActiva: categoria }), banners.length > 0 && _jsx(BannersGrid, { banners: banners }), _jsx(ProductosDestacados, { productos: productos }), totalPaginas > 1 && (_jsx("div", { className: "store-pagination-container", children: _jsx(Pagination, { current: pagina, total: totalProductos, pageSize: PAGE_SIZE, onChange: handlePageChange, showSizeChanger: false, showTotal: (total) => `${total} producto${total !== 1 ? 's' : ''}` }) })), _jsx(BeneficiosSection, { beneficios: mockBeneficios() }), _jsx(ProductosPorCategoria, { productos: productos }), _jsx(MarcasCarousel, { marcas: marcas }), _jsx(Newsletter, {})] }), _jsx(StoreFooter, {})] }));
};
export default HomePage;
