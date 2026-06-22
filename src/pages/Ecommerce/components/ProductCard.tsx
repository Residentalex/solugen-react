import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Tag, Button, Typography, message } from 'antd';
import {
  ShoppingCartOutlined,
  ShoppingOutlined,
  HeartOutlined,
  HeartFilled,
} from '@ant-design/icons';
import type { CatalogoProductoDTO } from '../../../api/ecommerceApi';
import { useCarritoStore } from '../../../stores/useCarritoStore';
import { useFavoritosStore } from '../../../stores/useFavoritosStore';
import { formatCurrency } from '../data/mockData';

const { Text } = Typography;

interface ProductCardProps {
  producto: CatalogoProductoDTO;
  compact?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ producto, compact = false }) => {
  const navigate = useNavigate();
  const favoritos = useFavoritosStore((state) => state.favoritos);
  const toggleFavorito = useFavoritosStore((state) => state.toggleFavorito);
  const esFav = favoritos.some((f) => f.codigoProducto === producto.codigo);

  const handleClick = useCallback(() => {
    navigate(`/store/producto/${producto.codigo}`);
  }, [navigate, producto.codigo]);

  const handleAddToCart = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await useCarritoStore.getState().agregarProducto(producto.codigo, 1);
      message.success('Agregado al carrito');
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al agregar al carrito');
    }
  }, [producto.codigo]);

  const handleToggleFavorito = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavorito(producto.codigo);
  }, [toggleFavorito, producto.codigo]);



  return (
    <Card
      className={`store-product-card-premium${compact ? ' compact' : ''}`}
      bordered={false}
      onClick={handleClick}
      bodyStyle={{ padding: 0 }}
    >
      {/* Imagen */}
      <div className="store-product-image-wrapper">
        <div className="store-product-image-placeholder">
          <ShoppingOutlined aria-hidden="true" />
        </div>

        {/* Botón favorito */}
        <button
          className="store-product-fav-btn"
          onClick={handleToggleFavorito}
          aria-label={esFav ? 'Eliminar de favoritos' : 'Agregar a favoritos'}
        >
          {esFav ? (
            <HeartFilled style={{ color: '#ff4d4f' }} />
          ) : (
            <HeartOutlined style={{ color: '#fff' }} />
          )}
        </button>

        {/* Badges */}
        <div className="store-product-badges">
          {producto.precioOferta != null && (
            <Tag color="error" className="store-badge">
              -{Math.round((1 - producto.precioOferta / producto.precio) * 100)}%
            </Tag>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="store-product-info-wrapper">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Tag className="store-product-category-tag" style={{ fontSize: 11 }}>
            {producto.categoria}
          </Tag>
          {producto.marca && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {producto.marca}
            </Text>
          )}
        </div>

        <Text className="store-product-name" strong>
          {producto.nombre}
        </Text>

        {/* Existencia */}
        <div style={{ marginTop: 4, minHeight: 18 }}>
          {producto.existencia === 0 && (
            <Tag color="default" style={{ fontSize: 11 }}>Agotado</Tag>
          )}
          {producto.existencia !== null && producto.existencia > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {producto.existencia} disponibles
            </Text>
          )}
        </div>

        {/* Precios */}
        <div className="store-product-prices">
          {producto.precioOferta != null ? (
            <>
              <Text className="store-product-price-offer">
                {formatCurrency(producto.precioOferta)}
              </Text>
              <Text className="store-product-price-old" delete>
                {formatCurrency(producto.precio)}
              </Text>
            </>
          ) : (
            <Text className="store-product-price">
              {formatCurrency(producto.precio)}
            </Text>
          )}
        </div>

        {/* Botón agregar */}
        <Button
          type="primary"
          size="small"
          icon={<ShoppingCartOutlined />}
          className="store-product-add-btn"
          onClick={handleAddToCart}
          block
          disabled={producto.existencia === 0}
        >
          {producto.existencia === 0 ? 'Agotado' : 'Agregar'}
        </Button>
      </div>
    </Card>
  );
};

export default ProductCard;
