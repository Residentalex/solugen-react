import React from 'react';
import { Row, Col, Typography } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import {
  ShoppingCartOutlined,
  TeamOutlined,
  BankOutlined,
  FileProtectOutlined,
  RiseOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const Dashboard: React.FC = () => {
  const usuario = useAuthStore((s) => s.usuario);
  const companyData = useCompanyStore((s) => s.data);

  const stats = [
    {
      icon: <BankOutlined />,
      color: '#6c5ffc',
      bg: 'rgba(108,95,252,0.1)',
      value: companyData.sucursales.length,
      label: 'Sucursales',
      borderColor: '#6c5ffc',
      change: '+1',
      changeColor: '#34c38f',
    },
    {
      icon: <ShoppingCartOutlined />,
      color: '#34c38f',
      bg: 'rgba(52,195,143,0.1)',
      value: companyData.familias.length,
      label: 'Familias',
      borderColor: '#34c38f',
      change: '+3',
      changeColor: '#34c38f',
    },
    {
      icon: <FileProtectOutlined />,
      color: '#f46a6a',
      bg: 'rgba(244,106,106,0.1)',
      value: companyData.documentos.length,
      label: 'Documentos',
      borderColor: '#f46a6a',
      change: '+2',
      changeColor: '#34c38f',
    },
    {
      icon: <TeamOutlined />,
      color: '#f0b345',
      bg: 'rgba(240,179,69,0.1)',
      value: usuario?.roles?.length || 0,
      label: 'Roles',
      borderColor: '#f0b345',
      change: '0',
      changeColor: '#6c757d',
    },
  ];

  return (
    <div>
      <Row gutter={[24, 24]}>
        {stats.map((s, i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <div
              className="paces-stat-card"
              style={{ borderLeftColor: s.borderColor }}
            >
              <div className="paces-stat-icon" style={{ background: s.bg, color: s.color }}>
                {s.icon}
              </div>
              <div>
                <div className="paces-stat-value">{s.value}</div>
                <p className="paces-stat-label">{s.label}</p>
                <div className="paces-stat-change" style={{ color: s.changeColor }}>
                  <RiseOutlined style={{ fontSize: 11 }} /> {s.change} este mes
                </div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 8 }}>
        <Col xs={24} lg={12}>
          <div className="paces-card">
            <div className="paces-card-header">
              <span>Información del Usuario</span>
            </div>
            <div className="paces-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Text strong style={{ width: 140, color: '#6c757d', fontSize: 13 }}>Nombre:</Text>
                  <Text style={{ fontSize: 13, fontWeight: 500 }}>{usuario?.nombre || '-'}</Text>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Text strong style={{ width: 140, color: '#6c757d', fontSize: 13 }}>Usuario:</Text>
                  <Text style={{ fontSize: 13, fontWeight: 500 }}>{usuario?.nombreUsuario || '-'}</Text>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Text strong style={{ width: 140, color: '#6c757d', fontSize: 13 }}>Roles:</Text>
                  <Text style={{ fontSize: 13, fontWeight: 500 }}>{usuario?.roles?.map(r => r.nombre).join(', ') || 'Sin roles'}</Text>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Text strong style={{ width: 140, color: '#6c757d', fontSize: 13 }}>Pantallas:</Text>
                  <Text style={{ fontSize: 13, fontWeight: 500 }}>{usuario?.pantallas?.length || 0} pantallas asignadas</Text>
                </div>
              </div>
            </div>
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="paces-card">
            <div className="paces-card-header">
              <span>Accesos Rápidos</span>
              <span style={{ fontSize: 12, color: '#6c757d', fontWeight: 400 }}>
                {usuario?.pantallas?.length || 0} pantallas
              </span>
            </div>
            <div className="paces-card-body">
              <Row gutter={[10, 10]}>
                {usuario?.pantallas?.slice(0, 6).map((p) => (
                  <Col span={12} key={p.codigo}>
                    <div className="paces-quick-item">
                      {p.nombre}
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
