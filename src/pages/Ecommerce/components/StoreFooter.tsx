import React from 'react';
import { Row, Col, Typography, Divider } from 'antd';
import {
  FacebookOutlined,
  InstagramOutlined,
  WhatsAppOutlined,
  MailOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const StoreFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    empresa: [
      { label: 'Sobre Nosotros', href: '#' },
      { label: 'Nuestra Historia', href: '#' },
      { label: 'Equipo', href: '#' },
      { label: 'Trabaja con Nosotros', href: '#' },
    ],
    ayuda: [
      { label: 'Preguntas Frecuentes', href: '#' },
      { label: 'Envíos y Entregas', href: '#' },
      { label: 'Devoluciones', href: '#' },
      { label: 'Contacto', href: '#' },
    ],
    categorias: [
      { label: 'Tecnología', href: '/store?categoria=TEC' },
      { label: 'Oficina', href: '/store?categoria=OFI' },
      { label: 'Hogar', href: '/store?categoria=HOG' },
      { label: 'Deportes', href: '/store?categoria=DEP' },
    ],
    legal: [
      { label: 'Términos y Condiciones', href: '#' },
      { label: 'Política de Privacidad', href: '#' },
      { label: 'Política de Cookies', href: '#' },
    ],
  };

  return (
    <footer className="store-footer">
      <div className="store-footer-content">
        <Row gutter={[32, 32]}>
          <Col xs={24} sm={12} md={6}>
            <Text strong className="store-footer-title">Empresa</Text>
            <ul className="store-footer-list">
              {footerLinks.empresa.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="store-footer-link">{link.label}</a>
                </li>
              ))}
            </ul>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text strong className="store-footer-title">Ayuda</Text>
            <ul className="store-footer-list">
              {footerLinks.ayuda.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="store-footer-link">{link.label}</a>
                </li>
              ))}
            </ul>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text strong className="store-footer-title">Categorías</Text>
            <ul className="store-footer-list">
              {footerLinks.categorias.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="store-footer-link">{link.label}</a>
                </li>
              ))}
            </ul>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text strong className="store-footer-title">Legal</Text>
            <ul className="store-footer-list">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="store-footer-link">{link.label}</a>
                </li>
              ))}
            </ul>
            <div className="store-footer-social">
              <a href="#" className="store-footer-social-link" aria-label="Facebook">
                <FacebookOutlined />
              </a>
              <a href="#" className="store-footer-social-link" aria-label="Instagram">
                <InstagramOutlined />
              </a>
              <a href="#" className="store-footer-social-link" aria-label="WhatsApp">
                <WhatsAppOutlined />
              </a>
              <a href="#" className="store-footer-social-link" aria-label="Correo">
                <MailOutlined />
              </a>
            </div>
          </Col>
        </Row>
        <Divider style={{ borderColor: 'var(--paces-border)', margin: '32px 0 16px' }} />
        <div className="store-footer-bottom">
          <Text type="secondary" style={{ fontSize: 13 }}>
            © {currentYear} Genesis Store. Todos los derechos reservados.
          </Text>
        </div>
      </div>
    </footer>
  );
};

export default StoreFooter;
