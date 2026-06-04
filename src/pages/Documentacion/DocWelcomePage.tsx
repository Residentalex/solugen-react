import React from 'react';
import { Typography, Row, Col, Card, Tag } from 'antd';
import {
  BookOutlined,
  FileTextOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import DOCS_INDEX from '../../docs/index';

const { Title, Text, Paragraph } = Typography;

const DocWelcomePage: React.FC = () => {
  const navigate = useNavigate();

  const totalDocs = DOCS_INDEX.reduce((acc, mod) => acc + mod.docs.length, 0);

  return (
    <div className="doc-welcome">
      <div style={{ textAlign: 'center', marginBottom: 48, marginTop: 32 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: 'var(--paces-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <BookOutlined style={{ fontSize: 32, color: '#fff' }} />
        </div>
        <Title level={1} style={{ marginBottom: 8, fontSize: 32 }}>
          Documentación de Solugen ERP
        </Title>
        <Paragraph
          style={{
            fontSize: 16,
            color: 'var(--paces-text-secondary)',
            maxWidth: 560,
            margin: '0 auto',
          }}
        >
          Explora la documentación completa de los módulos y procesos del sistema.
          Selecciona un documento del índice lateral para comenzar.
        </Paragraph>

        <div style={{ marginTop: 16 }}>
          <Tag icon={<FileTextOutlined />} color="blue" style={{ fontSize: 13, padding: '4px 12px' }}>
            {totalDocs} documentos disponibles
          </Tag>
          <Tag style={{ fontSize: 13, padding: '4px 12px' }}>
            {DOCS_INDEX.length} módulos
          </Tag>
        </div>
      </div>

      {/* Cards de módulos */}
      <Row gutter={[16, 16]}>
        {DOCS_INDEX.map((mod) => (
          <Col xs={24} sm={12} md={8} key={mod.key}>
            <Card
              hoverable
              className="doc-module-card"
              onClick={() => {
                if (mod.docs.length > 0) {
                  navigate(`/documentacion/${mod.docs[0].key}`);
                }
              }}
              styles={{
                body: {
                  padding: 24,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                },
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'var(--paces-hover-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  color: 'var(--paces-primary)',
                  flexShrink: 0,
                }}
              >
                {mod.icon}
              </div>
              <div style={{ flex: 1 }}>
                <Text strong style={{ fontSize: 15, display: 'block' }}>
                  {mod.label}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {mod.docs.length} documento{mod.docs.length !== 1 ? 's' : ''}
                </Text>
              </div>
              {mod.docs.length > 0 && (
                <RightOutlined style={{ color: 'var(--paces-text-secondary)', fontSize: 12 }} />
              )}
            </Card>
          </Col>
        ))}
      </Row>

      {/* Documentos recientes */}
      {totalDocs > 0 && (
        <div style={{ marginTop: 48 }}>
          <Title level={3} style={{ marginBottom: 16 }}>Documentos disponibles</Title>
          <Row gutter={[12, 12]}>
            {DOCS_INDEX.filter((m) => m.docs.length > 0).map((mod) =>
              mod.docs.map((doc) => (
                <Col xs={24} sm={12} md={8} key={doc.key}>
                  <Card
                    hoverable
                    size="small"
                    className="doc-recent-card"
                    onClick={() => navigate(`/documentacion/${doc.key}`)}
                    styles={{ body: { padding: '12px 16px' } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <FileTextOutlined style={{ color: 'var(--paces-primary)', fontSize: 16 }} />
                      <div>
                        <Text style={{ fontSize: 13, display: 'block' }}>{doc.label}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{mod.label}</Text>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))
            )}
          </Row>
        </div>
      )}
    </div>
  );
};

export default DocWelcomePage;
