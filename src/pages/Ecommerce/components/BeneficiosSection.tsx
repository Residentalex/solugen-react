import React from 'react';
import { Row, Col, Card, Typography } from 'antd';
import {
  TruckOutlined,
  SafetyOutlined,
  CustomerServiceOutlined,
  CheckCircleOutlined,
  UndoOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { BeneficioMock } from '../data/mockData';

const { Title, Text } = Typography;

const iconMap: Record<string, React.ReactNode> = {
  TruckOutlined: <TruckOutlined />,
  SafetyOutlined: <SafetyOutlined />,
  CustomerServiceOutlined: <CustomerServiceOutlined />,
  CheckCircleOutlined: <CheckCircleOutlined />,
  UndoOutlined: <UndoOutlined />,
  SafetyCertificateOutlined: <SafetyCertificateOutlined />,
};

interface BeneficiosSectionProps {
  beneficios: BeneficioMock[];
}

const BeneficiosSection: React.FC<BeneficiosSectionProps> = ({ beneficios }) => {
  return (
    <section className="store-section">
      <Title level={4} className="store-section-title">¿Por qué comprar con nosotros?</Title>
      <Row gutter={[24, 24]}>
        {beneficios.map((beneficio) => (
          <Col xs={24} sm={12} lg={8} xl={4} key={beneficio.id}>
            <Card className="store-beneficio-card" bordered={false}>
              <div className="store-beneficio-icon">
                {iconMap[beneficio.icono] || <CheckCircleOutlined />}
              </div>
              <Title level={5} className="store-beneficio-title">{beneficio.titulo}</Title>
              <Text type="secondary" className="store-beneficio-desc">{beneficio.descripcion}</Text>
            </Card>
          </Col>
        ))}
      </Row>
    </section>
  );
};

export default BeneficiosSection;
