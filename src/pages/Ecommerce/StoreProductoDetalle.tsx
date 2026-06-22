import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Button,
  Tag,
  InputNumber,
  Skeleton,
  Alert,
  Result,
  Typography,
  Divider,
  Space,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  ReloadOutlined,
  HeartOutlined,
  HeartFilled,
} from '@ant-design/icons';
import { ecommerceApi } from '../../api/ecommerceApi';
import type { CatalogoProductoDTO } from '../../api/ecommerceApi';
import { useCarritoStore } from '../../stores/useCarritoStore';
import { useFavoritosStore } from '../../stores/useFavoritosStore';
import StoreHeader from './components/StoreHeader';
import './Ecommerce.css';

const { Text, Title } = Typography;

/** Formatear moneda en RD$ */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(value);
}

const StoreProductoDetalle: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();

  // Hooks de estado (siempre antes de cualquier early return)
  const [producto, setProducto] = useState<CatalogoProductoDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [cantidad, setCantidad] = useState(1);

  // Hooks de favoritos (SIEMPRE antes de cualquier early return)
  const favoritos = useFavoritosStore((state) => state.favoritos);
  const toggleFavorito = useFavoritosStore((state) => state.toggleFavorito);
  const esFav = producto ? favoritos.some((f) => f.codigoProducto === producto.codigo) : false;

  const cargarProducto = useCallback(async () => {
    if (!codigo) return;
    setLoading(true);
    setLoadingError(false);
    setNotFound(false);
    try {
      const result = await ecommerceApi.obtenerProductoPorCodigo(codigo);
      if (!result) {
        setNotFound(true);
      } else {
        setProducto(result);
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setNotFound(true);
      } else {
        setLoadingError(true);
        message.error(err?.response?.data?.errorMessage || 'Error al cargar el producto');
      }
    } finally {
      setLoading(false);
    }
  }, [codigo]);

  useEffect(() => {
    cargarProducto();
  }, [cargarProducto]);

  const handleAddToCart = useCallback(async () => {
    if (!producto) return;
    try {
      await useCarritoStore.getState().agregarProducto(producto.codigo, cantidad);
      message.success('Agregado al carrito');
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al agregar al carrito');
    }
  }, [cantidad, producto]);

  const handleToggleFavorito = useCallback(async () => {
    if (!producto) return;
    await toggleFavorito(producto.codigo);
  }, [toggleFavorito, producto]);

  // Loading
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fa' }}>
        <StoreHeader />
        <main className="store-content">
          <div className="store-detail-container">
            <Skeleton active paragraph={{ rows: 1 }} />
            <Row gutter={[24, 24]} style={{ marginTop: 16 }}>
              <Col xs={24} md={12}>
                <Skeleton.Node active style={{ width: '100%', aspectRatio: '1', borderRadius: 12, height: 'auto' }} />
              </Col>
              <Col xs={24} md={12}>
                <Skeleton active paragraph={{ rows: 6 }} />
              </Col>
            </Row>
          </div>
        </main>
      </div>
    );
  }

  // Not found 404
  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fa' }}>
        <StoreHeader />
        <main className="store-content">
          <Result
            status="404"
            title="Producto no encontrado"
            subTitle="El producto que buscas no existe o ha sido eliminado."
            extra={
              <Button type="primary" onClick={() => navigate('/store')}>
                Volver al catálogo
              </Button>
            }
          />
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <StoreHeader />

      <main className="store-content">
        <div className="store-detail-container">
          {/* Error alert */}
          {loadingError && (
            <Alert
              message="Error al cargar el producto"
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              action={
                <Button size="small" onClick={cargarProducto} icon={<ReloadOutlined />}>
                  Reintentar
                </Button>
              }
            />
          )}

          {producto && !loadingError && (
            <>
              {/* Botón volver */}
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/store')}
                className="store-back-btn"
              >
                Volver al catálogo
              </Button>

              <Row gutter={[24, 24]}>
                {/* Imagen placeholder */}
                <Col xs={24} md={12}>
                  <div className="store-detail-image">
                    <ShoppingOutlined />
                  </div>
                </Col>

                {/* Información del producto */}
                <Col xs={24} md={12}>
                  <Title level={2} className="store-detail-name" style={{ marginTop: 0 }}>
                    {producto.nombre}
                  </Title>

                  <Text type="secondary" className="store-detail-reference">
                    Referencia: {producto.referencia || '-'}
                  </Text>

                  <div style={{ marginTop: 8, marginBottom: 16 }}>
                    <Space>
                      {producto.familia && <Tag color="blue">{producto.familia}</Tag>}
                      {producto.categoria && <Tag>{producto.categoria}</Tag>}
                      {producto.marca && <Tag color="purple">{producto.marca}</Tag>}
                      {producto.porcentajeImpuesto != null && (
                        <Tag color="orange">ITBIS {producto.porcentajeImpuesto}%</Tag>
                      )}
                    </Space>
                  </div>

                  <Divider style={{ margin: '12px 0' }} />

                  <div className="store-detail-prices">
                    {producto.precioOferta != null ? (
                      <>
                        <span className="store-detail-price-old">{formatCurrency(producto.precio)}</span>
                        <span className="store-detail-price-offer">{formatCurrency(producto.precioOferta)}</span>
                      </>
                    ) : (
                      <span className="store-detail-price">{formatCurrency(producto.precio)}</span>
                    )}
                  </div>

                  <Text type="secondary">
                    Por {producto.unidadMedida || 'unidad'}
                  </Text>

                  {/* Existencia */}
                  <div style={{ marginTop: 8 }}>
                    {producto.existencia === 0 && (
                      <Text type="danger" strong>Agotado</Text>
                    )}
                    {producto.existencia !== null && producto.existencia > 0 && (
                      <Text type="secondary">{producto.existencia} unidades disponibles</Text>
                    )}
                  </div>

                  {/* Especificaciones */}
                  {producto.especificaciones && (
                    <>
                      <Divider style={{ margin: '16px 0' }} />
                      <div>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>
                          Especificaciones
                        </Text>
                        <Text type="secondary" style={{ whiteSpace: 'pre-line' }}>
                          {producto.especificaciones}
                        </Text>
                      </div>
                    </>
                  )}

                  <Divider style={{ margin: '16px 0' }} />

                  <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      Cantidad
                    </Text>
                    <InputNumber
                      min={1}
                      max={999}
                      value={cantidad}
                      onChange={(val) => setCantidad(val || 1)}
                      size="large"
                      style={{ width: 120 }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <Button
                      type="primary"
                      size="large"
                      icon={<ShoppingCartOutlined />}
                      onClick={handleAddToCart}
                      disabled={producto.existencia === 0}
                      style={{
                        height: 48,
                        paddingInline: 32,
                        fontSize: 16,
                        borderRadius: 8,
                      }}
                    >
                      {producto.existencia === 0 ? 'Agotado' : 'Agregar al carrito'}
                    </Button>
                    <Button
                      size="large"
                      icon={esFav ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
                      onClick={handleToggleFavorito}
                      style={{
                        height: 48,
                        width: 48,
                        borderRadius: 8,
                      }}
                    />
                  </div>
                </Col>
              </Row>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default StoreProductoDetalle;
