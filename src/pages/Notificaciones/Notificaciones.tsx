import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tabs, Tag, Button, Tooltip, message, Card, Input, Empty } from 'antd';
import { SearchOutlined, ReloadOutlined, SendOutlined, CheckOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useNotificacionesStore } from '../../stores/notificacionesStore';
import { notificacionesApi } from '../../api/notificacionesApi';
import type { NotificacionVista } from '../../types/notificaciones';
import EnviarNotificacionModal from './EnviarNotificacionModal';

function formatFecha(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const tipoColor: Record<string, string> = {
  Alerta: 'gold',
  Info: 'blue',
  Error: 'red',
  Advertencia: 'orange',
  Exito: 'green',
};

const Notificaciones: React.FC = () => {
  const sucursal = useAuthStore((s: any) => s.compania);
  const usuarioID = useAuthStore((s: any) => s.usuario?.id);

  const pendientes = useNotificacionesStore((s) => s.pendientes);
  const cargarPendientes = useNotificacionesStore((s) => s.cargarPendientes);
  const marcarComoLeida = useNotificacionesStore((s) => s.marcarComoLeida);

  const [enviadas, setEnviadas] = useState<NotificacionVista[]>([]);
  const [loadingEnviadas, setLoadingEnviadas] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [tabActiva, setTabActiva] = useState('pendientes');

  const cargarEnviadas = useCallback(async () => {
    if (!sucursal || !usuarioID) return;
    setLoadingEnviadas(true);
    try {
      const data = await notificacionesApi.obtenerEnviadas(sucursal, usuarioID);
      setEnviadas(data || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar notificaciones enviadas');
    } finally {
      setLoadingEnviadas(false);
    }
  }, [sucursal, usuarioID]);

  useEffect(() => {
    cargarPendientes();
    cargarEnviadas();
  }, [cargarPendientes, cargarEnviadas]);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleRefresh = () => {
    cargarPendientes();
    if (tabActiva === 'enviadas') {
      cargarEnviadas();
    }
  };

  const handleMarcarLeida = async (notificacionUsuarioID: number) => {
    await marcarComoLeida(notificacionUsuarioID);
  };

  const getDataSource = () => {
    const source = tabActiva === 'pendientes' ? pendientes : enviadas;
    if (!searchText) return source;
    const term = searchText.toLowerCase();
    return source.filter(
      (n) =>
        n.titulo.toLowerCase().includes(term) ||
        n.mensaje.toLowerCase().includes(term) ||
        n.modulo?.toLowerCase().includes(term)
    );
  };

  const columns: ColumnsType<NotificacionVista> = [
    {
      title: 'Título',
      dataIndex: 'titulo',
      key: 'titulo',
      width: 200,
      ellipsis: true,
      render: (text: string, record) => (
        <span style={{ fontWeight: record.leida ? 400 : 600, color: 'var(--paces-text-heading)' }}>
          {text}
        </span>
      ),
    },
    {
      title: 'Mensaje',
      dataIndex: 'mensaje',
      key: 'mensaje',
      width: 280,
      ellipsis: true,
      render: (text: string) => (
        <span className="paces-text-secondary">{text}</span>
      ),
    },
    {
      title: 'Módulo',
      dataIndex: 'modulo',
      key: 'modulo',
      width: 130,
      render: (text: string) => text ? <Tag style={{ fontSize: 11 }}>{text}</Tag> : '-',
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      width: 110,
      render: (text: string) => (
        <Tag color={tipoColor[text] || 'default'} style={{ fontSize: 11 }}>
          {text || 'Info'}
        </Tag>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaCreacion',
      key: 'fechaCreacion',
      width: 170,
      render: (text: string) => (
        <span className="paces-text-secondary" style={{ fontSize: 12 }}>
          <ClockCircleOutlined style={{ marginRight: 4, fontSize: 10 }} />
          {formatFecha(text)}
        </span>
      ),
    },
    {
      title: 'Estado',
      key: 'estado',
      width: 100,
      render: (_, record) => (
        <Tag color={record.leida ? 'default' : 'blue'} style={{ fontSize: 11 }}>
          {record.leida ? 'Leída' : 'No leída'}
        </Tag>
      ),
    },
    ...(tabActiva === 'pendientes'
      ? [
          {
            title: 'Acciones',
            key: 'acciones',
            width: 110,
            fixed: 'right' as const,
            render: (_: any, record: NotificacionVista) => (
              !record.leida ? (
                <Tooltip title="Marcar como leída">
                  <Button
                    type="text"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={() => handleMarcarLeida(record.notificacionUsuarioID)}
                  >
                    Leer
                  </Button>
                </Tooltip>
              ) : null
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Bandeja de Notificaciones</h4>
        <Button type="primary" icon={<SendOutlined />} onClick={() => setModalVisible(true)}>
          Enviar Notificación
        </Button>
      </div>

      <Card className="paces-card-erp" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        {/* Toolbar interna */}
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Buscar por título, mensaje o módulo..."
              allowClear
              onSearch={handleSearch}
              style={{ width: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <div style={{ flex: 1 }} />
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
          </div>
        </div>

        <Tabs
          activeKey={tabActiva}
          onChange={(key) => setTabActiva(key)}
          style={{ padding: '0 24px' }}
          className="paces-tabs"
          items={[
            {
              key: 'pendientes',
              label: `Pendientes (${pendientes.length})`,
              children: (
                <Table<NotificacionVista>
                  columns={columns}
                  dataSource={getDataSource()}
                  rowKey="notificacionUsuarioID"
                  loading={useNotificacionesStore((s) => s.cargando)}
                  scroll={{ x: 1100 }}
                  size="middle"
                  locale={{
                    emptyText: <Empty description="No hay notificaciones pendientes" />,
                  }}
                  pagination={{
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}`,
                    pageSizeOptions: ['10', '20', '50'],
                    defaultPageSize: 10,
                  }}
                />
              ),
            },
            {
              key: 'enviadas',
              label: 'Enviadas',
              children: (
                <Table<NotificacionVista>
                  columns={columns}
                  dataSource={getDataSource()}
                  rowKey="id"
                  loading={loadingEnviadas}
                  scroll={{ x: 1100 }}
                  size="middle"
                  locale={{
                    emptyText: <Empty description="No has enviado notificaciones" />,
                  }}
                  pagination={{
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}`,
                    pageSizeOptions: ['10', '20', '50'],
                    defaultPageSize: 10,
                  }}
                />
              ),
            },
          ]}
        />
      </Card>

      <EnviarNotificacionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onEnviado={() => {
          cargarEnviadas();
        }}
      />
    </>
  );
};

export default Notificaciones;
