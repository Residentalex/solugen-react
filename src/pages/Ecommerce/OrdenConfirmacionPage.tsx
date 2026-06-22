import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  List,
  Typography,
  Divider,
  Spin,
  Alert,
  Descriptions,
  Row,
  Col,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  ShoppingOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { ecommerceApi, type OrdenDTO } from '../../api/ecommerceApi';

const { Text, Title } = Typography;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatFecha(fecha: string): string {
  try {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return fecha;
  }
}

const OrdenConfirmacionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [orden, setOrden] = useState<OrdenDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('No se proporcionó un ID de orden');
      setLoading(false);
      return;
    }

    const cargarOrden = async () => {
      try {
        const data = await ecommerceApi.obtenerOrden(id);
        setOrden(data);
      } catch (err: any) {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar la orden';
        setError(msg);
        message.error(msg);
      } finally {
        setLoading(false);
      }
    };

    cargarOrden();
  }, [id]);

  if (loading) {
    return (
      <div className="store-orden-confirmacion">
        <Spin size="large" />
      </div>
    );
  }

  if (error || !orden) {
    return (
      <div className="store-orden-confirmacion">
        <Alert
          message="Error"
          description={error || 'No se encontró la orden'}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
        <Button type="primary" icon={<ShoppingOutlined />} onClick={() => navigate('/store')}>
          Volver a la tienda
        </Button>
      </div>
    );
  }

  return (
    <div className="store-orden-confirmacion">
      <CheckCircleOutlined
        style={{
          fontSize: 64,
          color: '#52c41a',
          marginBottom: 16,
        }}
      />

      <Title level={2} style={{ marginBottom: 8 }}>
        ¡Orden creada exitosamente!
      </Title>

      <Text type="secondary" style={{ fontSize: 16, display: 'block', marginBottom: 16 }}>
        Gracias por tu compra. Hemos recibido tu pedido y lo estamos procesando.
      </Text>

      <div className="store-orden-numero">#{orden.noOrden}</div>

      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        {formatFecha(orden.fechaCreacion)}
      </Text>

      <Card bordered={false} style={{ marginBottom: 24, textAlign: 'left' }}>
        <Title level={5} style={{ marginBottom: 16 }}>
          Resumen de la orden
        </Title>

        <List
          dataSource={orden.detalles}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: '10px 0',
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
                    {item.cantidad} x {formatCurrency(item.precioUnitario)}
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
          <Text>{formatCurrency(orden.subtotal)}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text type="secondary">Impuestos</Text>
          <Text>{formatCurrency(orden.impuestos)}</Text>
        </div>
        <Divider style={{ margin: '8px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text strong style={{ fontSize: 16 }}>
            Total
          </Text>
          <Text strong style={{ fontSize: 16, color: 'var(--paces-primary)' }}>
            {formatCurrency(orden.total)}
          </Text>
        </div>
      </Card>

      <Card bordered={false} style={{ marginBottom: 24, textAlign: 'left' }}>
        <Title level={5} style={{ marginBottom: 16 }}>
          Datos del cliente
        </Title>
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="Nombre">{orden.nombreCliente}</Descriptions.Item>
          <Descriptions.Item label="Email">{orden.email}</Descriptions.Item>
          <Descriptions.Item label="Teléfono">{orden.telefono}</Descriptions.Item>
          <Descriptions.Item label="Dirección">{orden.direccion}</Descriptions.Item>
          {orden.notas && (
            <Descriptions.Item label="Notas">{orden.notas}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Row gutter={[16, 16]} justify="center">
        <Col xs={24} sm={12} md={10} lg={8}>
          <Button
            type="primary"
            block
            size="large"
            icon={<ShoppingOutlined />}
            onClick={() => navigate('/store')}
          >
            Volver a la tienda
          </Button>
        </Col>
        <Col xs={24} sm={12} md={10} lg={8}>
          <Button
            block
            size="large"
            icon={<EyeOutlined />}
            onClick={() => navigate('/store/ordenes')}
          >
            Ver mis órdenes
          </Button>
        </Col>
      </Row>
    </div>
  );
};

export default OrdenConfirmacionPage;
