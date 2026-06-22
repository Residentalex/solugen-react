import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Row, Col, Tabs, Typography, Skeleton, message } from 'antd';
import ProductCard from './ProductCard';
import { ecommerceApi } from '../../../api/ecommerceApi';
import type { CatalogoProductoDTO } from '../../../api/ecommerceApi';

const { Title, Text } = Typography;

interface ProductosDestacadosProps {
  productos: CatalogoProductoDTO[];
}

const tabs = [
  { key: 'todos', label: 'Todos' },
  { key: 'ofertas', label: 'Ofertas' },
];

const ProductosDestacados: React.FC<ProductosDestacadosProps> = ({ productos }) => {
  const [searchParams] = useSearchParams();
  const ofertasParam = searchParams.get('ofertas') === 'true';
  const [tabActiva, setTabActiva] = useState(ofertasParam ? 'ofertas' : 'todos');
  const [ofertas, setOfertas] = useState<CatalogoProductoDTO[]>([]);
  const [loadingOfertas, setLoadingOfertas] = useState(false);
  const [errorOfertas, setErrorOfertas] = useState(false);

  const cargarOfertas = useCallback(async () => {
    setLoadingOfertas(true);
    setErrorOfertas(false);
    try {
      const result = await ecommerceApi.obtenerOfertas({ pagina: 1, tamano: 20 });
      setOfertas(result.items);
    } catch (err: any) {
      setErrorOfertas(true);
      message.error(err?.response?.data?.errorMessage || 'Error al cargar las ofertas');
    } finally {
      setLoadingOfertas(false);
    }
  }, []);

  useEffect(() => {
    if (tabActiva === 'ofertas') {
      cargarOfertas();
    }
  }, [tabActiva, cargarOfertas]);

  const handleTabChange = useCallback((key: string) => {
    setTabActiva(key);
  }, []);

  const productosMostrar = tabActiva === 'ofertas' ? ofertas : productos;

  return (
    <section className="store-section">
      <div className="store-section-header">
        <Title level={4} className="store-section-title">Productos Destacados</Title>
      </div>
      <Tabs
        activeKey={tabActiva}
        onChange={handleTabChange}
        items={tabs}
        className="store-tabs"
      />
      {tabActiva === 'ofertas' && loadingOfertas && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Col xs={12} sm={12} md={8} lg={6} xl={4} key={i}>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Col>
          ))}
        </Row>
      )}
      {tabActiva === 'ofertas' && !loadingOfertas && !errorOfertas && productosMostrar.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Text type="secondary">No hay ofertas activas en este momento</Text>
        </div>
      )}
      {!(tabActiva === 'ofertas' && loadingOfertas) && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {productosMostrar.map((producto) => (
            <Col xs={12} sm={12} md={8} lg={6} xl={4} key={producto.codigo}>
              <ProductCard producto={producto} />
            </Col>
          ))}
        </Row>
      )}
    </section>
  );
};

export default ProductosDestacados;
