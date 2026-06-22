import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer, List, Button, InputNumber, Skeleton, Empty, Typography, Divider } from 'antd';
import { DeleteOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useCarritoStore } from '../../../stores/useCarritoStore';
import { message } from 'antd';

const { Text, Title } = Typography;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(value);
}

interface CarritoDrawerProps {
  open: boolean;
  onClose: () => void;
}

const CarritoDrawer: React.FC<CarritoDrawerProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { items, totalItems, subtotal, impuestos, total, loading, actualizarCantidad, eliminarItem, vaciarCarrito } = useCarritoStore();

  const handleCantidadChange = async (id: string, cantidad: number | null) => {
    if (!cantidad || cantidad < 1) return;
    try {
      await actualizarCantidad(id, cantidad);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al actualizar cantidad');
    }
  };

  const handleEliminar = async (id: string) => {
    try {
      await eliminarItem(id);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al eliminar el producto');
    }
  };

  const handleVaciar = async () => {
    try {
      await vaciarCarrito();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al vaciar el carrito');
    }
  };

  const handlePagar = () => {
    onClose();
    navigate('/store/checkout');
  };

  return (
    <Drawer
      title={`Carrito (${totalItems})`}
      placement="right"
      onClose={onClose}
      open={open}
      width={420}
      styles={{ body: { padding: 0 } }}
    >
      {loading && items.length === 0 ? (
        <div style={{ padding: 24 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      ) : items.length === 0 ? (
        <Empty
          image={<ShoppingCartOutlined style={{ fontSize: 64, color: '#ccc' }} />}
          description="Tu carrito está vacío"
          style={{ marginTop: 48 }}
        />
      ) : (
        <>
          <List
            dataSource={items}
            renderItem={(item) => (
              <List.Item
                style={{ padding: '12px 24px', borderBottom: '1px solid #f0f0f0' }}
                actions={[
                  <Button
                    key="delete"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleEliminar(item.id)}
                  />,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        background: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24,
                        color: '#bbb',
                      }}
                    >
                      <ShoppingCartOutlined />
                    </div>
                  }
                  title={
                    <Text strong style={{ fontSize: 14 }}>
                      {item.nombreProducto}
                    </Text>
                  }
                  description={
                    <div style={{ marginTop: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <InputNumber
                          min={1}
                          max={999}
                          value={item.cantidad}
                          onChange={(val) => handleCantidadChange(item.id, val)}
                          size="small"
                          style={{ width: 70 }}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          x {formatCurrency(item.precioOferta ?? item.precioUnitario)}
                        </Text>
                      </div>
                      <Text strong style={{ fontSize: 13, display: 'block', marginTop: 4 }}>
                        Subtotal: {formatCurrency(item.subtotal)}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />

          <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="secondary">Subtotal</Text>
              <Text>{formatCurrency(subtotal)}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="secondary">Impuestos</Text>
              <Text>{formatCurrency(impuestos)}</Text>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text strong style={{ fontSize: 16 }}>Total</Text>
              <Text strong style={{ fontSize: 16 }}>{formatCurrency(total)}</Text>
            </div>

            <Button
              type="primary"
              block
              size="large"
              onClick={handlePagar}
              style={{ marginBottom: 8 }}
            >
              Proceder al pago
            </Button>
            <Button
              block
              danger
              ghost
              onClick={handleVaciar}
              disabled={items.length === 0}
            >
              Vaciar carrito
            </Button>
          </div>
        </>
      )}
    </Drawer>
  );
};

export default CarritoDrawer;
