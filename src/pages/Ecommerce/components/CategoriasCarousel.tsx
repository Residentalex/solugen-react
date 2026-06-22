import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography } from 'antd';
import { ShoppingOutlined } from '@ant-design/icons';
import type { CategoriaCatalogoDTO } from '../../../api/ecommerceApi';

const { Title } = Typography;

interface CategoriasCarouselProps {
  categorias: CategoriaCatalogoDTO[];
  categoriaActiva?: string;
  onCategoriaClick?: (id: string) => void;
}

const CategoriasCarousel: React.FC<CategoriasCarouselProps> = ({
  categorias,
  categoriaActiva,
  onCategoriaClick,
}) => {
  const navigate = useNavigate();

  const handleClick = useCallback((id: string) => {
    if (onCategoriaClick) {
      onCategoriaClick(id);
    } else {
      navigate(`/store?categoria=${encodeURIComponent(id)}`);
    }
  }, [navigate, onCategoriaClick]);

  return (
    <section className="store-section">
      <Title level={4} className="store-section-title">Categorías Populares</Title>
      <div className="store-categorias-scroll">
        {categorias.map((cat) => {
          const isActive = categoriaActiva === cat.id;
          return (
            <div
              key={cat.id}
              className={`store-categoria-card${isActive ? ' active' : ''}`}
              onClick={() => handleClick(cat.id)}
              role="button"
              tabIndex={0}
              aria-label={`Categoría ${cat.nombre}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClick(cat.id);
                }
              }}
            >
              <div className="store-categoria-icon">
                <ShoppingOutlined />
              </div>
              <div className="store-categoria-name">{cat.nombre}</div>
              <div className="store-categoria-count">{cat.totalProductos} productos</div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default CategoriasCarousel;
