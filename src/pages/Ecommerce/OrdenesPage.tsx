import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Tag,
  Button,
  Empty,
  Modal,
  Descriptions,
  List,
  Typography,
  Spin,
  Alert,
  Divider,
} from 'antd';
import {
  ShoppingOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { ecommerceApi, type OrdenDTO, type OrdenDetalleDTO } from '../../api/ecommerceApi';
import { useCarritoStore } from '../../stores/useCarritoStore';

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

function formatFechaCorta(fecha: string): string {
  try {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return fecha;
  }
}

function getEstadoColor(estado: string): string {
  const e = estado.toUpperCase();
  if (e === 'PENDIENTE') return 'orange';
  if (e === 'COMPLETADA' || e === 'COMPLETADO') return 'green';
  if (e === 'CANCELADA' || e === 'CANCELADO') return 'red';
  return 'default';
}

interface OrdenConKey extends OrdenDTO {
  key: string;
}

const OrdenesPage: React.FC = () => {
  const navigate = useNavigate();
  const sessionId = useCarritoStore((s) => s.sessionId);

  const [ordenes, setOrdenes] = useState<OrdenConKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenDTO | null>(null);

  const cargarOrdenes = useCallback(async () => {
    setLoading(true);
    setLoadingError(false);
    try {
      const data = await ecommerceApi.listarOrdenes(sessionId);
      setOrdenes(data.map((o) => ({ ...o, key: o.id })));
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al cargar las órdenes';
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    cargarOrdenes();
  }, [cargarOrdenes]);

  const handleVerDetalle = useCallback((orden: OrdenDTO) => {
    setOrdenSeleccionada(orden);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setOrdenSeleccionada(null);
  }, []);

  const handleRefresh = useCallback(() => {
    cargarOrdenes();
  }, [cargarOrdenes]);

  const columns = [
    {
      title: 'No. Orden',
      dataIndex: 'noOrden',
      key: 'noOrden',
      width: 120,
      render: (noOrden: number, record: OrdenConKey) => (
        <Button
          type="link"
          style={{ padding: 0, fontWeight: 700, color: '#556ee6' }}
          onClick={() => handleVerDetalle(record)}
        >
          #{noOrden}
        </Button>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaCreacion',
      key: 'fechaCreacion',
      width: 160,
      render: (fecha: string) => formatFechaCorta(fecha),
    },
    {
      title: 'Cliente',
      dataIndex: 'nombreCliente',
      key: 'nombreCliente',
      ellipsis: true,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 120,
      render: (estado: string) => (
        <Tag color={getEstadoColor(estado)}>{estado}</Tag>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 130,
      align: 'right' as const,
      render: (total: number) => formatCurrency(total),
    },
  ];

  return (
    <div className="store-page">
      <div className="store-ordenes-page">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/store')}
            >
              Volver a la tienda
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              Mis Órdenes
            </Title>
          </div>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            Recargar
          </Button>
        </div>

        {loadingError && (
          <Alert
            message="Error al cargar órdenes"
            description="No se pudieron cargar tus órdenes. Intenta recargar la página."
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" onClick={handleRefresh} icon={<ReloadOutlined />}>
                Reintentar
              </Button>
            }
          />
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : ordenes.length === 0 ? (
          <Empty
            description="No tienes órdenes aún"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ marginTop: 48 }}
          >
            <Button
              type="primary"
              icon={<ShoppingOutlined />}
              onClick={() => navigate('/store')}
            >
              Ir a comprar
            </Button>
          </Empty>
        ) : (
          <Card
            className="paces-card-erp"
            style={{ borderRadius: 8, overflow: 'hidden' }}
            styles={{ body: { padding: 0 } }}
          >
            <Table
              className="paces-border-top paces-list-table"
              columns={columns}
              dataSource={ordenes}
              rowKey="id"
              pagination={{
                showTotal: (t) => `${t} orden${t !== 1 ? 'es' : ''}`,
              }}
              size="middle"
            />
          </Card>
        )}
      </div>

      <Modal
        title={`Orden #${ordenSeleccionada?.noOrden}`}
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={[
          <Button key="close" onClick={handleCloseModal}>
            Cerrar
          </Button>,
        ]}
        width={720}
      >
        {ordenSeleccionada && (
          <>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Cliente">{ordenSeleccionada.nombreCliente}</Descriptions.Item>
              <Descriptions.Item label="Email">{ordenSeleccionada.email}</Descriptions.Item>
              <Descriptions.Item label="Teléfono">{ordenSeleccionada.telefono}</Descriptions.Item>
              <Descriptions.Item label="Dirección">{ordenSeleccionada.direccion}</Descriptions.Item>
              <Descriptions.Item label="Estado">
                <Tag color={getEstadoColor(ordenSeleccionada.estado)}>
                  {ordenSeleccionada.estado}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Fecha">
                {formatFecha(ordenSeleccionada.fechaCreacion)}
              </Descriptions.Item>
              {ordenSeleccionada.notas && (
                <Descriptions.Item label="Notas">{ordenSeleccionada.notas}</Descriptions.Item>
              )}
            </Descriptions>

            <Title level={5} style={{ marginBottom: 12 }}>
              Productos
            </Title>
            <List
              dataSource={ordenSeleccionada.detalles}
              renderItem={(item: OrdenDetalleDTO) => (
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
              <Text>{formatCurrency(ordenSeleccionada.subtotal)}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="secondary">Impuestos</Text>
              <Text>{formatCurrency(ordenSeleccionada.impuestos)}</Text>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong style={{ fontSize: 16 }}>
                Total
              </Text>
              <Text strong style={{ fontSize: 16, color: 'var(--paces-primary)' }}>
                {formatCurrency(ordenSeleccionada.total)}
              </Text>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default OrdenesPage;
