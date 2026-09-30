import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { message, Alert, Button, Tag, Pagination, Spin } from 'antd';
import { ecommerceApi } from '../../api/ecommerceApi';
import type { CatalogoProductoDTO, CategoriaCatalogoDTO, MarcaDTO, BannerDTO } from '../../api/ecommerceApi';
import { extraerMensajeError } from '../../utils/formats';
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

  // Cancela la petición en vuelo e ignora respuestas de consultas anteriores que llegan tarde.
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const cargarDatos = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setLoadingError(false);
    try {
      const [productosApi, categoriasApi, bannersApi] = await Promise.all([
        ecommerceApi.obtenerProductos({
          pagina: paginaActual,
          tamano: PAGE_SIZE,
          buscar: buscar || undefined,
          categoria: categoria || undefined,
        }, controller.signal),
        ecommerceApi.obtenerCategorias(),
        ecommerceApi.obtenerBanners().catch(() => [] as BannerDTO[]),
      ]);

      if (requestId !== requestIdRef.current) return;

      setProductos(productosApi.items);
      setTotalPaginas(productosApi.totalPaginas);
      setTotalProductos(productosApi.total);
      setPagina(productosApi.pagina);
      setCategorias(categoriasApi);
      setBanners(bannersApi);
    } catch (err: unknown) {
      // Petición cancelada o respondida después de una consulta más reciente: no es un fallo.
      if (requestId !== requestIdRef.current || controller.signal.aborted) return;
      setLoadingError(true);
      message.error(extraerMensajeError(err, 'Error al cargar los productos'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }

    // Cargar marcas en segundo plano (no bloquea la página)
    try {
      const marcasApi = await ecommerceApi.obtenerMarcas();
      if (requestId !== requestIdRef.current) return;
      setMarcas(marcasApi);
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current || controller.signal.aborted) return;
      message.error(extraerMensajeError(err, 'Error al cargar las marcas'));
    }
  }, [buscar, categoria, paginaActual]);

  useEffect(() => {
    setPagina(paginaActual);
  }, [paginaActual]);

  useEffect(() => {
    cargarDatos();
    useCarritoStore.getState().cargarCarrito().catch((err: unknown) => {
      message.error(extraerMensajeError(err, 'Error al cargar el carrito'));
    });
    useFavoritosStore.getState().cargarFavoritos().catch((err: unknown) => {
      message.error(extraerMensajeError(err, 'Error al cargar favoritos'));
    });
  }, [cargarDatos]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      requestIdRef.current += 1;
    };
  }, []);

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

  const hasPreviousData = productos.length > 0 || categorias.length > 0 || banners.length > 0;
  const disabledControls = loading || (loadingError && hasPreviousData);

  if (loading && !hasPreviousData) {
    return <SkeletonStore />;
  }

  if (loadingError && !hasPreviousData) {
    return (
      <div className="store-page">
        <StoreHeader />
        <main className="store-main" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 420, padding: '0 24px' }}>
          <Alert
            message="Error al cargar los productos"
            description="No se pudieron cargar los datos desde el servidor. Intente de nuevo."
            type="error"
            showIcon
            style={{ maxWidth: 480, textAlign: 'center' }}
          />
          <Button type="primary" onClick={cargarDatos} style={{ marginTop: 24 }}>
            Reintentar
          </Button>
        </main>
        <StoreFooter />
      </div>
    );
  }

  return (
    <div className="store-page">
      <StoreHeader buscarDisabled={disabledControls} />
      {loadingError && (
        <Alert
          message="Error al cargar los productos"
          description={
            hasPreviousData
              ? 'No se pudieron cargar los datos nuevos. Se muestran productos de una búsqueda o categoría previa.'
              : 'No se pudieron cargar los datos desde el servidor.'
          }
          type={hasPreviousData ? 'warning' : 'error'}
          showIcon
          action={
            <Button size="small" onClick={cargarDatos} disabled={loading}>
              Reintentar
            </Button>
          }
          style={{ margin: '16px 24px 0', borderRadius: 8 }}
        />
      )}
      {loadingError && hasPreviousData && (
        <div style={{ margin: '8px 24px 0', padding: '8px 12px', background: '#fff7e6', border: '1px solid #ffc53d', borderRadius: 8, color: '#d46b08', fontWeight: 500 }}>
          Mostrando datos anteriores — no corresponden necesariamente a la búsqueda o categoría activa.
        </div>
      )}
      <main className="store-main">
        <HeroSection />
        {(buscar || categoria) && (
          <div className="store-filters-active" style={{ opacity: disabledControls ? 0.6 : 1, pointerEvents: disabledControls ? 'none' : 'auto' }}>
            {buscar && (
              <Tag className="store-filter-tag" closable={!disabledControls} onClose={!disabledControls ? handleClearBuscar : undefined}>
                Buscando: {buscar}
              </Tag>
            )}
            {categoria && (
              <Tag className="store-filter-tag" closable={!disabledControls} onClose={!disabledControls ? handleClearCategoria : undefined}>
                Categoría: {nombreCategoriaActiva}
              </Tag>
            )}
          </div>
        )}
        <CategoriasCarousel categorias={categorias} categoriaActiva={categoria} disabled={disabledControls} />
        {banners.length > 0 && <BannersGrid banners={banners} />}
        <Spin spinning={loading} tip="Cargando productos..." size="small">
          <ProductosDestacados productos={productos} />
        </Spin>
        {totalPaginas > 1 && (
          <div className="store-pagination-container" style={{ opacity: disabledControls ? 0.6 : 1, pointerEvents: disabledControls ? 'none' : 'auto', transition: 'opacity .2s' }}>
            <Pagination
              current={pagina}
              total={totalProductos}
              pageSize={PAGE_SIZE}
              onChange={disabledControls ? () => {} : handlePageChange}
              showSizeChanger={false}
              showTotal={(total) => `${total} producto${total !== 1 ? 's' : ''}`}
            />
          </div>
        )}
        <BeneficiosSection beneficios={mockBeneficios()} />
        <Spin spinning={loading} tip="Cargando productos..." size="small">
          <ProductosPorCategoria productos={productos} />
        </Spin>
        <MarcasCarousel marcas={marcas} />
        <Newsletter />
      </main>
      <StoreFooter />
    </div>
  );
};

export default HomePage;
