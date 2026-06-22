import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { message, Alert, Button, Tag, Pagination } from 'antd';
import { ecommerceApi } from '../../api/ecommerceApi';
import type { CatalogoProductoDTO, CategoriaCatalogoDTO, MarcaDTO, BannerDTO } from '../../api/ecommerceApi';
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
import {
  mockBeneficios,
} from './data/mockData';
import './Ecommerce.css';

const HomePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const buscar = searchParams.get('buscar') || '';
  const categoria = searchParams.get('categoria') || '';

  const [productos, setProductos] = useState<CatalogoProductoDTO[]>([]);
  const [categorias, setCategorias] = useState<CategoriaCatalogoDTO[]>([]);
  const [marcas, setMarcas] = useState<MarcaDTO[]>([]);
  const [banners, setBanners] = useState<BannerDTO[]>([]);
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
        ecommerceApi.obtenerBanners().catch(() => [] as BannerDTO[]),
      ]);

      setProductos(productosApi.items);
      setTotalPaginas(productosApi.totalPaginas);
      setTotalProductos(productosApi.total);
      setPagina(productosApi.pagina);
      setCategorias(categoriasApi);
      setBanners(bannersApi);
    } catch (err: any) {
      setLoadingError(true);
      message.error(err?.response?.data?.errorMessage || 'Error al cargar los productos');
    } finally {
      setLoading(false);
    }

    // Cargar marcas en segundo plano (no bloquea la página)
    try {
      const marcasApi = await ecommerceApi.obtenerMarcas();
      setMarcas(marcasApi);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar las marcas');
    }
  }, [buscar, categoria, paginaActual]);

  useEffect(() => {
    setPagina(paginaActual);
  }, [paginaActual]);

  useEffect(() => {
    cargarDatos();
    useCarritoStore.getState().cargarCarrito().catch((err: any) => {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar el carrito');
    });
    useFavoritosStore.getState().cargarFavoritos().catch((err: any) => {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar favoritos');
    });
  }, [cargarDatos]);

  const handleClearBuscar = useCallback(() => {
    navigate('/store');
  }, [navigate]);

  const handleClearCategoria = useCallback(() => {
    navigate('/store');
  }, [navigate]);

  const handlePageChange = useCallback((nuevaPagina: number) => {
    const params = new URLSearchParams(searchParams);
    if (nuevaPagina === 1) {
      params.delete('pagina');
    } else {
      params.set('pagina', nuevaPagina.toString());
    }
    navigate(`/store?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams, navigate]);

  const nombreCategoriaActiva = categoria
    ? categorias.find((c) => c.id === categoria)?.nombre || categoria
    : '';

  if (loading) {
    return <SkeletonStore />;
  }

  return (
    <div className="store-page">
      <StoreHeader />
      {loadingError && (
        <Alert
          message="Error al cargar los productos"
          description="No se pudieron cargar los datos desde el servidor."
          type="error"
          showIcon
          action={
            <Button size="small" onClick={cargarDatos}>
              Reintentar
            </Button>
          }
          style={{ margin: '16px 24px 0', borderRadius: 8 }}
        />
      )}
      <main className="store-main">
        <HeroSection />
        {(buscar || categoria) && (
          <div className="store-filters-active">
            {buscar && (
              <Tag className="store-filter-tag" closable onClose={handleClearBuscar}>
                Buscando: {buscar}
              </Tag>
            )}
            {categoria && (
              <Tag className="store-filter-tag" closable onClose={handleClearCategoria}>
                Categoría: {nombreCategoriaActiva}
              </Tag>
            )}
          </div>
        )}
        <CategoriasCarousel categorias={categorias} categoriaActiva={categoria} />
        {banners.length > 0 && <BannersGrid banners={banners} />}
        <ProductosDestacados productos={productos} />
        {totalPaginas > 1 && (
          <div className="store-pagination-container">
            <Pagination
              current={pagina}
              total={totalProductos}
              pageSize={PAGE_SIZE}
              onChange={handlePageChange}
              showSizeChanger={false}
              showTotal={(total) => `${total} producto${total !== 1 ? 's' : ''}`}
            />
          </div>
        )}
        <BeneficiosSection beneficios={mockBeneficios()} />
        <ProductosPorCategoria productos={productos} />
        <MarcasCarousel marcas={marcas} />
        <Newsletter />
      </main>
      <StoreFooter />
    </div>
  );
};

export default HomePage;
