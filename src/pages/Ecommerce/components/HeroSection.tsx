import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Button, Typography } from 'antd';
import { ShoppingOutlined, ArrowRightOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="store-hero">
      <Row gutter={[24, 24]} align="middle">
        <Col xs={24} lg={12}>
          <div className="store-hero-content">
            <Title level={1} className="store-hero-title">
              Todo lo que necesitas para tu negocio
            </Title>
            <Text className="store-hero-description">
              Descubre miles de productos de tecnología, oficina y hogar con los mejores precios del mercado. Envío rápido y garantía real en todas tus compras.
            </Text>
            <div className="store-hero-buttons">
              <Button
                type="primary"
                size="large"
                icon={<ShoppingOutlined />}
                onClick={() => navigate('/store?nuevos=true')}
              >
                Explorar Productos
              </Button>
              <Button
                size="large"
                icon={<ArrowRightOutlined />}
                onClick={() => navigate('/store?ofertas=true')}
              >
                Ver Ofertas
              </Button>
            </div>
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="store-hero-card">
            <div className="store-hero-image">
              <ShoppingOutlined />
            </div>
            <div className="store-hero-overlay">
              <Text strong className="store-hero-overlay-title">Nuevos ingresos cada semana</Text>
              <Text className="store-hero-overlay-desc">Más de 500 productos disponibles</Text>
            </div>
          </div>
        </Col>
      </Row>
    </section>
  );
};

export default HeroSection;
