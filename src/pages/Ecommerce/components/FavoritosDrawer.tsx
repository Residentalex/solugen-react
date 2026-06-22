import React from 'react';
import { Drawer, List, Button, Skeleton, Empty, Typography, Tag } from 'antd';
import {
  DeleteOutlined,
  ShoppingCartOutlined,
  HeartOutlined,
} from '@ant-design/icons';
import { useFavoritosStore } from '../../../stores/useFavoritosStore';
import { useCarritoStore } from '../../../stores/useCarritoStore';
import { message } from 'antd';

const { Text } = Typography;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(value);
}

interface FavoritosDrawerProps {
  open: boolean;
  onClose: () => void;
}

const FavoritosDrawer: React.FC<FavoritosDrawerProps> = ({ open, onClose }) => {
  const { favoritos, totalFavoritos, loading, eliminarFavorito } = useFavoritosStore();

  const handleEliminar = async (id: string) => {
    try {
      await eliminarFavorito(id);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al eliminar de favoritos');
    }
  };

  const handleAgregarAlCarrito = async (codigoProducto: string) => {
    try {
      await useCarritoStore.getState().agregarProducto(codigoProducto, 1);
      message.success('Agregado al carrito');
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al agregar al carrito');
    }
  };

  return (
    <Drawer
      title={`Favoritos (${totalFavoritos})`}
      placement="right"
      onClose={onClose}
      open={open}
      width={420}
      styles={{ body: { padding: 0 } }}
    >
      {loading && favoritos.length === 0 ? (
        <div style={{ padding: 24 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      ) : favoritos.length === 0 ? (
        <Empty
          image={<HeartOutlined style={{ fontSize: 64, color: '#ccc' }} />}
          description="No tienes productos en favoritos"
          style={{ marginTop: 48 }}
        />
      ) : (
        <List
          dataSource={favoritos}
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
                    <Tag size="small" style={{ fontSize: 11 }}>
                      {item.categoria}
                    </Tag>
                    <div style={{ marginTop: 4 }}>
                      {item.precioOferta != null ? (
                        <>
                          <Text strong style={{ color: '#ff4d4f' }}>
                            {formatCurrency(item.precioOferta)}
                          </Text>
                          <Text type="secondary" delete style={{ marginLeft: 8, fontSize: 12 }}>
                            {formatCurrency(item.precio)}
                          </Text>
                        </>
                      ) : (
                        <Text strong>{formatCurrency(item.precio)}</Text>
                      )}
                    </div>
                    <Button
                      type="primary"
                      size="small"
                      icon={<ShoppingCartOutlined />}
                      onClick={() => handleAgregarAlCarrito(item.codigoProducto)}
                      style={{ marginTop: 8 }}
                    >
                      Agregar al carrito
                    </Button>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
};

export default FavoritosDrawer;
