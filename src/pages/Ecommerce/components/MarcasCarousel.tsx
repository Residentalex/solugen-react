import React from 'react';
import { Typography } from 'antd';
import type { MarcaDTO } from '../../../api/ecommerceApi';

const { Title } = Typography;

interface MarcasCarouselProps {
  marcas: MarcaDTO[];
}

const MarcasCarousel: React.FC<MarcasCarouselProps> = ({ marcas }) => {
  if (!marcas || marcas.length === 0) {
    return null;
  }

  return (
    <section className="store-section">
      <Title level={4} className="store-section-title">Marcas Destacadas</Title>
      <div className="store-marcas-scroll">
        {marcas.map((marca) => (
          <div
            key={marca.id}
            className="store-marca-item"
            role="button"
            tabIndex={0}
            aria-label={`Marca ${marca.nombre}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
              }
            }}
          >
            <div className="store-marca-logo">
              <span>{marca.nombre.charAt(0).toUpperCase()}</span>
            </div>
            <div className="store-marca-name">{marca.nombre}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default MarcasCarousel;
