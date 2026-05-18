import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Layout, Typography, Button, Card, Space, Select, Tag } from 'antd';
import type { SelectProps } from 'antd';
import GenesisLogo from '../../components/GenesisLogo';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const SUCURSALES: SelectProps['options'] = [
  { value: 1, label: 'Compra' },
  { value: 2, label: 'Orense Plaza' },
  { value: 3, label: 'Hiper Romana' },
  { value: 4, label: 'Orense Villa Hermosa' },
  { value: 5, label: 'El Ofertazo' },
];

const Home: React.FC = () => {
  const usuario = useAuthStore((s) => s.usuario);
  const logout = useAuthStore((s) => s.logout);
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setSucursalActiva = useAuthStore((s) => s.setSucursalActiva);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleSucursalChange = (value: number) => {
    setSucursalActiva(value as any);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="paces-home-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <GenesisLogo />
      </Header>
      <Content style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
        <Card style={{ width: 500, marginTop: 50 }}>
          <Title level={3}>Bienvenido, {usuario?.nombre || 'Usuario'}</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text><strong>Nombre:</strong> {usuario?.nombre || usuario?.nombreUsuario}</Text>
            <div>
              <Text><strong>Compañía:</strong> <Tag color="blue">Consolidado</Tag></Text>
            </div>
            <div>
              <Text><strong>Sucursal Activa:</strong></Text>
              <Select
                value={sucursalActiva}
                onChange={handleSucursalChange}
                options={SUCURSALES}
                style={{ width: 200, marginLeft: 8 }}
              />
            </div>
            <Button type="primary" danger onClick={handleLogout} style={{ marginTop: 16 }}>
              Cerrar Sesión
            </Button>
          </Space>
        </Card>
      </Content>
    </Layout>
  );
};

export default Home;
