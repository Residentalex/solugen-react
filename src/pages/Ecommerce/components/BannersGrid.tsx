import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Button, Typography } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import type { BannerDTO } from '../../../api/ecommerceApi';

const { Text } = Typography;

interface BannersGridProps {
  banners: BannerDTO[];
}

const BannersGrid: React.FC<BannersGridProps> = ({ banners }) => {
  const navigate = useNavigate();

  return (
    <section className="store-section">
      <Row gutter={[16, 16]}>
        {banners.map((banner) => (
          <Col xs={24} md={8} key={banner.id}>
            <Card
              className="store-banner-card"
              bordered={false}
              styles={{ body: { padding: 0, height: '100%' } }}
              onClick={() => navigate(banner.ctaLink)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(banner.ctaLink);
                }
              }}
            >
              <div className="store-banner-content">
                <div className="store-banner-text">
                  <Text strong className="store-banner-title">{banner.titulo}</Text>
                  <Text className="store-banner-desc">{banner.descripcion}</Text>
                  <Button type="primary" size="small" icon={<ArrowRightOutlined />} className="store-banner-btn">
                    {banner.ctaTexto}
                  </Button>
                </div>
                <div className="store-banner-image">
                  <ArrowRightOutlined style={{ fontSize: 48, opacity: 0.3 }} />
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </section>
  );
};

export default BannersGrid;
