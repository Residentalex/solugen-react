import React from 'react';
import { Row, Col, Card, Typography } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import {
  ShoppingCartOutlined,
  TeamOutlined,
  BankOutlined,
  FileProtectOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const Dashboard: React.FC = () => {
  const usuario = useAuthStore((s) => s.usuario);
  const companyData = useCompanyStore((s) => s.data);

  const stats = [
    {
      icon: <BankOutlined />,
      color: '#556ee6',
      bg: '#eef0fc',
      value: companyData.sucursales.length,
      label: 'Sucursales',
    },
    {
      icon: <ShoppingCartOutlined />,
      color: '#34c38f',
      bg: '#e6f7f0',
      value: companyData.familias.length,
      label: 'Familias',
    },
    {
      icon: <FileProtectOutlined />,
      color: '#f46a6a',
      bg: '#fde8e8',
      value: companyData.documentos.length,
      label: 'Documentos',
    },
    {
      icon: <TeamOutlined />,
      color: '#f0b345',
      bg: '#fef3e0',
      value: usuario?.roles?.length || 0,
      label: 'Roles',
    },
  ];

  return (
    <div>
      <Row gutter={[20, 20]}>
        {stats.map((s, i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
                {s.icon}
              </div>
              <div>
                <div className="stat-value">{s.value}</div>
                <p className="stat-label">{s.label}</p>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      <Row gutter={[20, 20]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title="Información del Usuario"
            styles={{ header: { fontWeight: 600, fontSize: 15, borderBottom: '1px solid #e9ecef' } }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Text strong style={{ width: 120, color: '#6c757d' }}>Nombre:</Text>
                <Text>{usuario?.nombre || '-'}</Text>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Text strong style={{ width: 120, color: '#6c757d' }}>Usuario:</Text>
                <Text>{usuario?.nombreUsuario || '-'}</Text>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Text strong style={{ width: 120, color: '#6c757d' }}>Roles:</Text>
                <Text>{usuario?.roles?.map(r => r.nombre).join(', ') || 'Sin roles'}</Text>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Text strong style={{ width: 120, color: '#6c757d' }}>Pantallas:</Text>
                <Text>{usuario?.pantallas?.length || 0} pantallas asignadas</Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="Accesos Rápidos"
            styles={{ header: { fontWeight: 600, fontSize: 15, borderBottom: '1px solid #e9ecef' } }}
          >
            <Row gutter={[12, 12]}>
              {usuario?.pantallas?.slice(0, 6).map((p) => (
                <Col span={12} key={p.codigo}>
                  <div
                    style={{
                      padding: '10px 14px',
                      background: '#f8f9fa',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 13,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#eef0fc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#f8f9fa')}
                  >
                    {p.nombre}
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
