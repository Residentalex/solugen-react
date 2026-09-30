import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Input,
  Row,
  Col,
  Card,
  Tag,
  Pagination,
  Skeleton,
  Result,
  Alert,
  Button,
  Spin,
} from 'antd';
import {
  SearchOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { ecommerceApi } from '../../api/ecommerceApi';
import type { CatalogoProductoDTO, CategoriaCatalogoDTO } from '../../api/ecommerceApi';
import './Ecommerce.css';

/** Formatear moneda en RD$ */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(value);
}

const PAGE_SIZE = 20;

const Store: React.FC = () => {
  const navigate = useNavigate();

  // Hooks de estado (siempre antes de cualquier early return)
  const [productos, setProductos] = useState<CatalogoProductoDTO[]>([]);
  const [categorias, setCategorias] = useState<CategoriaCatalogoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('');

  // Cancela la petición en vuelo e ignora respuestas de consultas anteriores que llegan tarde.
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  // Carga de categorías
  const cargarCategorias = useCallback(async () => {
    try {
      const cats = await ecommerceApi.obtenerCategorias();
      setCategorias(cats);
    } catch {
      // Las categorías son secundarias, no bloquear la página
    }
  }, []);

  // Carga de productos
  const cargarProductos = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setLoadingError(false);
    try {
      const params: {
        pagina?: number;
        tamano?: number;
        buscar?: string;
        categoria?: string;
      } = {
        pagina,
        tamano: PAGE_SIZE,
      };
      if (searchText) params.buscar = searchText;
      if (categoriaActiva) params.categoria = categoriaActiva;

      const result = await ecommerceApi.obtenerProductos(params, controller.signal);
      if (requestId !== requestIdRef.current) return;
      setProductos(result.items);
      setTotal(result.total);
    } catch {
      // Petición cancelada o respondida después de una consulta más reciente: no es un fallo.
      if (requestId !== requestIdRef.current || controller.signal.aborted) return;
      setLoadingError(true);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [pagina, searchText, categoriaActiva]);

  useEffect(() => {
    cargarCategorias();
  }, [cargarCategorias]);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      requestIdRef.current += 1;
    };
  }, []);

  // Handlers
  const handleSearch = useCallback((value: string) => {
    setSearchText(value);
    setPagina(1);
  }, []);

  const handleRefresh = useCallback(() => {
    cargarProductos();
  }, [cargarProductos]);

  const handleCategoryClick = useCallback((catId: string) => {
    setCategoriaActiva((prev) => (prev === catId ? '' : catId));
    setPagina(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setPagina(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const hasPreviousData = productos.length > 0;
  const disabledControls = loading;

  // Render de tarjeta de producto
  const renderProductCard = (producto: CatalogoProductoDTO) => (
    <Card
      className="store-product-card"
      bordered={false}
      onClick={() => navigate(`/store/producto/${producto.codigo}`)}
    >
      <div className="store-product-image">
        <ShoppingOutlined />
      </div>
      <div className="store-product-info">
        <div className="store-product-name">{producto.nombre}</div>
        <div className="store-product-prices">
          {producto.precioOferta != null ? (
            <>
              <span className="store-product-price-old">{formatCurrency(producto.precio)}</span>
              <span className="store-product-price-offer">{formatCurrency(producto.precioOferta)}</span>
            </>
          ) : (
            <span className="store-product-price">{formatCurrency(producto.precio)}</span>
          )}
        </div>
        <div className="store-product-category">
          <Tag>{producto.categoria || producto.familia}</Tag>
        </div>
      </div>
    </Card>
  );

  // Render de skeleton cards
  const renderSkeletonCards = () => (
    <Row gutter={[16, 16]}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Col xs={24} sm={12} lg={6} key={i}>
          <div className="store-skeleton-card">
            <Skeleton.Image active style={{ width: '100%', height: 'auto' }} />
            <div className="ant-skeleton-content">
              <Skeleton active paragraph={{ rows: 2 }} title={{ width: '60%' }} />
            </div>
          </div>
        </Col>
      ))}
    </Row>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      {/* ===== Header público ===== */}
      <header className="store-header">
        <div className="store-header-logo" onClick={() => navigate('/store')}>
          <img src="/images/logo.png" alt="Genesis" />
          <span>Genesis Store</span>
        </div>

        <div className="store-header-search">
          <Input.Search
            placeholder="Buscar productos..."
            allowClear
            onSearch={handleSearch}
            disabled={disabledControls}
            prefix={<SearchOutlined className="paces-text-icon" />}
          />
        </div>

        <ShoppingCartOutlined className="store-header-cart" />
      </header>

      {/* ===== Contenido ===== */}
      <main className="store-content">
        {/* Error alert */}
        {loadingError && (
          <Alert
            message="Error al cargar productos"
            description={
              hasPreviousData
                ? 'No se pudieron cargar los productos de la búsqueda o categoría actual. Se mantienen los productos anteriores.'
                : 'No se pudieron cargar los productos. Verifica la conexión e intenta de nuevo.'
            }
            type={hasPreviousData ? 'warning' : 'error'}
            showIcon
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" onClick={handleRefresh} disabled={disabledControls} icon={<ReloadOutlined />}>
                Reintentar
              </Button>
            }
          />
        )}

        {/* Categorías */}
        {categorias.length > 0 && (
          <div
            className="store-categories"
            style={{
              opacity: disabledControls ? 0.6 : 1,
              pointerEvents: disabledControls ? 'none' : 'auto',
              transition: 'opacity .2s',
            }}
          >
            {categorias.map((cat) => (
              <div
                key={cat.id}
                className={`store-category-chip${categoriaActiva === cat.id ? ' active' : ''}`}
                onClick={() => handleCategoryClick(cat.id)}
              >
                {cat.nombre} ({cat.totalProductos})
              </div>
            ))}
          </div>
        )}

        {/* Loading: skeletons solo en la carga inicial */}
        {loading && !hasPreviousData && renderSkeletonCards()}

        {/* Empty */}
        {!loading && !loadingError && productos.length === 0 && (
          <Result
            icon={<ShoppingOutlined />}
            title="Sin resultados"
            subTitle={
              searchText || categoriaActiva
                ? 'No se encontraron productos con los filtros actuales.'
                : 'No hay productos disponibles en este momento.'
            }
            extra={
              (searchText || categoriaActiva) && (
                <Button
                  onClick={() => {
                    setSearchText('');
                    setCategoriaActiva('');
                    setPagina(1);
                  }}
                >
                  Limpiar filtros
                </Button>
              )
            }
          />
        )}

        {/* Grid de productos: se conserva la cuadrícula con capa de carga durante las recargas */}
        {productos.length > 0 && (
          <Spin spinning={loading} tip="Cargando productos..." size="small">
            <Row gutter={[16, 16]}>
              {productos.map((prod) => (
                <Col xs={24} sm={12} lg={6} key={prod.codigo}>
                  {renderProductCard(prod)}
                </Col>
              ))}
            </Row>

            {/* Paginación */}
            {total > PAGE_SIZE && (
              <div
                className="store-pagination"
                style={{
                  opacity: disabledControls ? 0.6 : 1,
                  pointerEvents: disabledControls ? 'none' : 'auto',
                  transition: 'opacity .2s',
                }}
              >
                <Pagination
                  current={pagina}
                  total={total}
                  pageSize={PAGE_SIZE}
                  onChange={disabledControls ? () => {} : handlePageChange}
                  showSizeChanger={false}
                  showTotal={(t) => `${t} producto${t !== 1 ? 's' : ''}`}
                />
              </div>
            )}
          </Spin>
        )}
      </main>
    </div>
  );
};

export default Store;
