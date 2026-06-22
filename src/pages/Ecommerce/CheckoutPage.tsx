import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Row,
  Col,
  Empty,
  List,
  Typography,
  Divider,
  Spin,
  message,
} from 'antd';
import { CheckCircleOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useCarritoStore } from '../../stores/useCarritoStore';
import { ecommerceApi } from '../../api/ecommerceApi';
import { useEcommerceAuthStore } from '../../stores/ecommerceAuthStore';

const { Text, Title } = Typography;
const { TextArea } = Input;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(value);
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { items, totalItems, subtotal, impuestos, total, sessionId, cargarCarrito } = useCarritoStore();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const isAuthenticated = useEcommerceAuthStore((s) => s.isAuthenticated);
  const usuario = useEcommerceAuthStore((s) => s.usuario);

  useEffect(() => {
    if (!isAuthenticated) {
      sessionStorage.setItem('ecom_returnUrl', window.location.pathname + window.location.search);
      navigate('/store/login');
      return;
    }
    cargarCarrito().finally(() => setInitialLoading(false));
  }, [isAuthenticated, cargarCarrito, navigate]);

  useEffect(() => {
    if (usuario && isAuthenticated) {
      form.setFieldsValue({
        nombreCliente: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono,
        direccion: usuario.direccion,
      });
    }
  }, [usuario, isAuthenticated, form]);

  const handleSubmit = async (values: {
    nombreCliente: string;
    email: string;
    telefono: string;
    direccion: string;
    notas: string;
  }) => {
    setLoading(true);
    try {
      const orden = await ecommerceApi.crearOrden({
        sessionId,
        nombreCliente: values.nombreCliente,
        email: values.email,
        telefono: values.telefono,
        direccion: values.direccion,
        notas: values.notas || '',
      });
      message.success('¡Orden creada exitosamente!');
      navigate(`/store/orden/${orden.id}`);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al crear la orden');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="store-checkout-page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="store-checkout-page">
        <Empty
          image={<ShoppingOutlined style={{ fontSize: 64, color: '#ccc' }} />}
          description="Tu carrito está vacío"
        >
          <Button type="primary" onClick={() => navigate('/store')}>
            Ir a la tienda
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="store-checkout-page">
      <Title level={3} style={{ marginBottom: 24 }}>
        Checkout
      </Title>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card className="store-checkout-resumen" bordered={false}>
            <Title level={5} style={{ marginBottom: 16 }}>
              Resumen del pedido
            </Title>

            <List
              dataSource={items}
              renderItem={(item) => (
                <List.Item
                  style={{
                    padding: '12px 0',
                    borderBottom: '1px solid var(--paces-border)',
                  }}
                >
                  <List.Item.Meta
                    title={
                      <Text strong style={{ fontSize: 14 }}>
                        {item.nombreProducto}
                      </Text>
                    }
                    description={
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.cantidad} x {formatCurrency(item.precioOferta ?? item.precioUnitario)}
                      </Text>
                    }
                  />
                  <Text strong>{formatCurrency(item.subtotal)}</Text>
                </List.Item>
              )}
            />

            <Divider style={{ margin: '16px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="secondary">Subtotal</Text>
              <Text>{formatCurrency(subtotal)}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="secondary">Impuestos</Text>
              <Text>{formatCurrency(impuestos)}</Text>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong style={{ fontSize: 16 }}>
                Total ({totalItems} {totalItems === 1 ? 'producto' : 'productos'})
              </Text>
              <Text strong style={{ fontSize: 16, color: 'var(--paces-primary)' }}>
                {formatCurrency(total)}
              </Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card className="store-checkout-form" bordered={false}>
            <Title level={5} style={{ marginBottom: 16 }}>
              Datos del cliente
            </Title>

            <Form
              form={form}
              layout="vertical"
              size="large"
              onFinish={handleSubmit}
              autoComplete="off"
            >
              <Form.Item
                label="Nombre completo"
                name="nombreCliente"
                rules={[{ required: true, message: 'El nombre es obligatorio' }]}
              >
                <Input placeholder="Ej. Juan Pérez" />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'El email es obligatorio' },
                  { type: 'email', message: 'Ingresa un email válido' },
                ]}
              >
                <Input placeholder="ejemplo@correo.com" />
              </Form.Item>

              <Form.Item
                label="Teléfono"
                name="telefono"
                rules={[{ required: true, message: 'El teléfono es obligatorio' }]}
              >
                <Input placeholder="Ej. 809-555-1234" />
              </Form.Item>

              <Form.Item
                label="Dirección de entrega"
                name="direccion"
                rules={[{ required: true, message: 'La dirección es obligatoria' }]}
              >
                <TextArea rows={3} placeholder="Calle, número, sector, ciudad..." />
              </Form.Item>

              <Form.Item label="Notas adicionales" name="notas">
                <TextArea rows={2} placeholder="Instrucciones especiales, referencias, etc. (opcional)" />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  icon={<CheckCircleOutlined />}
                  loading={loading}
                >
                  Confirmar Orden
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CheckoutPage;
