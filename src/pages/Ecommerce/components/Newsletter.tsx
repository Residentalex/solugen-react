import React, { useState, useCallback } from 'react';
import { Card, Input, Button, Typography, message } from 'antd';
import { MailOutlined, SendOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const Newsletter: React.FC = () => {
  const [email, setEmail] = useState('');

  const handleSubscribe = useCallback(() => {
    if (!email || !email.includes('@')) {
      message.warning('Por favor ingresa un correo válido');
      return;
    }
    message.success('¡Gracias por suscribirte!');
    setEmail('');
  }, [email]);

  return (
    <section className="store-section">
      <Card className="store-newsletter-card" bordered={false}>
        <div className="store-newsletter-content">
          <div className="store-newsletter-icon">
            <MailOutlined />
          </div>
          <Title level={3} className="store-newsletter-title">Suscríbete a nuestro newsletter</Title>
          <Text className="store-newsletter-desc">
            Recibe las mejores ofertas, novedades y descuentos exclusivos directamente en tu correo.
          </Text>
          <div className="store-newsletter-form">
            <Input
              type="email"
              placeholder="Ingresa tu correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onPressEnter={handleSubscribe}
              size="large"
              prefix={<MailOutlined />}
              style={{ maxWidth: 360 }}
            />
            <Button
              type="primary"
              size="large"
              icon={<SendOutlined />}
              onClick={handleSubscribe}
            >
              Suscribirme
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
};

export default Newsletter;
