import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Typography } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import ProductCard from './ProductCard';
import type { CatalogoProductoDTO } from '../../../api/ecommerceApi';

const { Title, Text } = Typography;

interface ProductosPorCategoriaProps {
  productos: CatalogoProductoDTO[];
}

const ProductosPorCategoria: React.FC<ProductosPorCategoriaProps> = ({ productos }) => {
  const navigate = useNavigate();

  const categoriasConProductos = useMemo(() => {
    const map = new Map<string, CatalogoProductoDTO[]>();
    productos.forEach((p) => {
      const list = map.get(p.categoria) || [];
      list.push(p);
      map.set(p.categoria, list);
    });
    return Array.from(map.entries()).slice(0, 4);
  }, [productos]);

  return (
    <>
      {categoriasConProductos.map(([categoria, items]) => (
        <section className="store-section" key={categoria}>
          <div className="store-section-header">
            <Title level={4} className="store-section-title">{categoria}</Title>
            <a
              className="store-section-link"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/store?categoria=${encodeURIComponent(categoria)}`);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/store?categoria=${encodeURIComponent(categoria)}`);
                }
              }}
            >
              Ver más <RightOutlined className="store-section-link-icon" />
            </a>
          </div>
          <div className="store-horizontal-scroll">
            <Row gutter={[16, 16]} wrap={false} style={{ flexWrap: 'nowrap' }}>
              {items.slice(0, 5).map((producto) => (
                <Col key={producto.codigo} style={{ minWidth: 220, maxWidth: 220, flex: '0 0 auto' }}>
                  <ProductCard producto={producto} compact />
                </Col>
              ))}
            </Row>
          </div>
        </section>
      ))}
    </>
  );
};

export default ProductosPorCategoria;
