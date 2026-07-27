import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid,
  Typography, Descriptions, Alert, Modal, Input, message,
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, CloseCircleOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { actualizacionPrecioApi } from '../../api/actualizacionPrecioApi';
import PermissionGate from '../../components/PermissionGate';
import TotalesCard from '../../components/TotalesCard';
import { formatDate, formatNumber, toTitleCase, extraerMensajeError } from '../../utils/formats';
import type { ActualizacionPrecioDetalleDTO, ActualizacionPrecioLineaDTO } from '../../types/actualizacionPrecio';

const { Text } = Typography;

const ESTADO_TAG: Record<string, { color: string; label: string }> = {
  Pendiente: { color: 'warning', label: 'Pendiente' },
  P: { color: 'warning', label: 'Pendiente' },
  Aplicado: { color: 'success', label: 'Aplicado' },
  A: { color: 'success', label: 'Aplicado' },
  Anulado: { color: 'error', label: 'Anulado' },
  N: { color: 'error', label: 'Anulado' },
};

const ActualizacionPrecioDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);

  const [data, setData] = useState<ActualizacionPrecioDetalleDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');

  const screens = Grid.useBreakpoint();

  useEffect(() => {
    setActiveModule('FActPrecio');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    actualizacionPrecioApi.obtenerDetalle(sucursalActiva, id)
      .then((res) => {
        setData(res);
        setPageTitleOverride(`Actualización ${res.documento}`);
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar el detalle');
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  const handleRefresh = useCallback(() => {
    if (!id) return;
    setLoadingError(false);
    setLoading(true);
    actualizacionPrecioApi.obtenerDetalle(sucursalActiva, id)
      .then((res) => {
        setData(res);
        setPageTitleOverride(`Actualización ${res.documento}`);
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al recargar');
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  const handleAnular = () => {
    if (!id || !data) return;
    Modal.confirm({
      title: 'Anular Actualización de Precio',
      icon: <ExclamationCircleOutlined />,
      content: `¿Está seguro que desea anular la actualización ${data.documento}?`,
      okText: 'Sí, anular',
      okButtonProps: { danger: true },
      cancelText: 'No',
      onOk: async () => {
        setSaving(true);
        try {
          await actualizacionPrecioApi.anular(sucursalActiva, id);
          message.success('Actualización anulada exitosamente');
          handleRefresh();
        } catch (err: any) {
          const msg = extraerMensajeError(err, 'Error al anular');
          message.error(msg);
        } finally {
          setSaving(false);
        }
      },
    });
  };

  if (loading || (!data && !loadingError)) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando documento...</div>
      </div>
    );
  }

  if (loadingError && !data) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Alert
          message="Error al cargar el detalle"
          type="error"
          showIcon
          action={<Button size="small" onClick={handleRefresh}>Reintentar</Button>}
        />
      </div>
    );
  }

  if (!data) return null;

  const isLarge = screens.xxl === true;
  const estadoInfo = ESTADO_TAG[data.estado] || { color: 'default', label: data.estado };
  const esPendiente = data.estado === 'Pendiente' || data.estado === 'P';

  // Líneas filtradas
  const lineasFiltradas = detalleSearch
    ? data.lineas.filter((l) => {
        const q = detalleSearch.toLowerCase();
        return (
          (l.codPro || '').toLowerCase().includes(q) ||
          (l.descripcion || '').toLowerCase().includes(q)
        );
      })
    : data.lineas;

  const totalCostoPiv = data.lineas.reduce((s, l) => s + (l.costoPiv || 0), 0);
  const totalPrecioSug = data.lineas.reduce((s, l) => s + (l.precioSug || 0), 0);
  const totalAumento = data.lineas.reduce((s, l) => s + (l.aumento || 0), 0);

  const columnas = [
    {
      title: 'Código',
      key: 'codPro',
      width: 120,
      fixed: 'left' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: ActualizacionPrecioLineaDTO) => (
        <Text>{record.codPro || '-'}</Text>
      ),
    },
    {
      title: 'Descripción',
      key: 'descripcion',
      ellipsis: true,
      render: (_: any, record: ActualizacionPrecioLineaDTO) => (
        <Text>{toTitleCase(record.descripcion || '')}</Text>
      ),
    },
    {
      title: 'Precio Actual',
      dataIndex: 'precio',
      key: 'precio',
      width: 130,
      align: 'right' as const,
      render: (val: number) => <Text style={{ fontFamily: 'monospace' }}>{formatNumber(val)}</Text>,
    },
    {
      title: '% Aumento',
      dataIndex: 'pAumento',
      key: 'pAumento',
      width: 110,
      align: 'right' as const,
      render: (val: number) => <Text style={{ fontFamily: 'monospace' }}>{formatNumber(val)}%</Text>,
    },
    {
      title: 'Aumento',
      dataIndex: 'aumento',
      key: 'aumento',
      width: 110,
      align: 'right' as const,
      render: (val: number) => <Text style={{ fontFamily: 'monospace' }}>{formatNumber(val)}</Text>,
    },
    {
      title: 'Precio Sugerido',
      dataIndex: 'precioSug',
      key: 'precioSug',
      width: 130,
      align: 'right' as const,
      render: (val: number) => <Text strong style={{ fontFamily: 'monospace' }}>{formatNumber(val)}</Text>,
    },
    {
      title: 'Costo Pivote',
      dataIndex: 'costoPiv',
      key: 'costoPiv',
      width: 130,
      align: 'right' as const,
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (val: number) => <Text style={{ fontFamily: 'monospace' }}>{formatNumber(val)}</Text>,
    },
    {
      title: 'Margen %',
      dataIndex: 'pMargen',
      key: 'pMargen',
      width: 110,
      align: 'right' as const,
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (val: number) => <Text style={{ fontFamily: 'monospace' }}>{formatNumber(val)}%</Text>,
    },
  ];

  const contenidoDetalle = (
    <>
      <Card className="paces-card" size="small" title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
          <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
        </div>
      } style={{ marginBottom: 16 }}>
        <Descriptions bordered size="small" column={isLarge ? 3 : 1}
          styles={{ content: { background: 'transparent' } }}>
          <Descriptions.Item label="Documento">{data.documento || '-'}</Descriptions.Item>
          <Descriptions.Item label="Fecha">{formatDate(data.fecha)}</Descriptions.Item>
          <Descriptions.Item label="Fecha Aplicar">{formatDate(data.fechaParaAplicar)}</Descriptions.Item>
          <Descriptions.Item label="Almacén">{data.almacenNombre || '-'}</Descriptions.Item>
          <Descriptions.Item label="Familia">{data.familiaNombre || '-'}</Descriptions.Item>
          <Descriptions.Item label="Doc. Referencia">{data.docReferencia || '-'}</Descriptions.Item>
          <Descriptions.Item label="Ajuste %">{formatNumber(data.ajuste)}%</Descriptions.Item>
          <Descriptions.Item label="Redondear">{data.redondear ? 'Sí' : 'No'}</Descriptions.Item>
          <Descriptions.Item label="Base">{data.base || '-'}</Descriptions.Item>
          <Descriptions.Item label="Todos Almacenes">{data.todosAlm ? 'Sí' : 'No'}</Descriptions.Item>
          <Descriptions.Item label="Todas Familias">{data.todasFam ? 'Sí' : 'No'}</Descriptions.Item>
          <Descriptions.Item label="Autorizado">
            <Tag color={data.autorizado ? 'blue' : 'default'}>{data.autorizado ? 'Sí' : 'No'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="% Pivote">{formatNumber(data.porPivote)}%</Descriptions.Item>
          <Descriptions.Item label="% Precio Mín">{formatNumber(data.porPrecioMin)}%</Descriptions.Item>
          <Descriptions.Item label="Precio Actual">
            <Tag color={data.precioAct ? 'blue' : 'default'}>{data.precioAct ? 'Sí' : 'No'}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Tabs
        defaultActiveKey="lineas"
        type="card"
        tabBarExtraContent={
          <Input.Search
            placeholder="Buscar línea..."
            allowClear
            style={{ width: isLarge ? 320 : 220 }}
            onSearch={(value) => setDetalleSearch(value)}
            onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
          />
        }
        items={[
          {
            key: 'lineas',
            label: `Líneas (${lineasFiltradas.length}${detalleSearch ? `/${data.lineas.length}` : ''})`,
            children: (
              <Table
                dataSource={lineasFiltradas}
                columns={columnas}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ x: 1100 }}
              />
            ),
          },
          {
            key: 'historial',
            label: 'Historial',
            children: (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Text type="secondary">Historial próximamente</Text>
              </div>
            ),
          },
        ]}
      />
    </>
  );

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle de actualización de precio"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={handleRefresh}>Reintentar</Button>}
        />
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/FActPrecio')}>Volver</Button>
        <div style={{ flex: 1 }} />
        <Space>
          {esPendiente && (
            <>
              <PermissionGate accion="EDITAR">
                <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/FActPrecio/${id}/editar`)}>
                  Editar
                </Button>
              </PermissionGate>
              <PermissionGate accion="ANULAR">
                <Button danger icon={<CloseCircleOutlined />} loading={saving} onClick={handleAnular}>
                  Anular
                </Button>
              </PermissionGate>
            </>
          )}
        </Space>
      </div>

      {isLarge ? (
        <Row gutter={16}>
          <Col xxl={18}>{contenidoDetalle}</Col>
          <Col xxl={6}>
            <TotalesCard
              subTotal={totalCostoPiv}
              descuento={0}
              impuestos={0}
              total={totalPrecioSug}
              nota={`Aumento total: ${formatNumber(totalAumento)}`}
              monedaSimbolo="RD$"
              monedaNombre="Peso Dominicano"
              tasa={1}
            />
          </Col>
        </Row>
      ) : (
        <div>
          {contenidoDetalle}
          <div style={{ marginTop: 24 }}>
            <TotalesCard
              subTotal={totalCostoPiv}
              descuento={0}
              impuestos={0}
              total={totalPrecioSug}
              alignRight
              nota={`Aumento total: ${formatNumber(totalAumento)}`}
              monedaSimbolo="RD$"
              monedaNombre="Peso Dominicano"
              tasa={1}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ActualizacionPrecioDetalle;
