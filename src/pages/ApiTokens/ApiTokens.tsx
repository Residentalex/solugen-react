import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Table, Card, Input, Tag, Space, Button, Typography, Popconfirm, message, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined, ReloadOutlined, StopOutlined, KeyOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiTokenApi, type AuthApiTokenListadoDTO } from '../../api/apiTokenApi';
import ApiTokenCrearModal from './ApiTokenCrearModal';

const { Text } = Typography;

const ApiTokens: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const usuario = useAuthStore((s) => s.usuario);

  const [data, setData] = useState<AuthApiTokenListadoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiTokenApi.listar();
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar tokens');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setActiveModule('MApiToken');
    cargarDatos();
    return () => resetToolbar();
  }, [setActiveModule, resetToolbar, cargarDatos]);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleRefresh = () => {
    cargarDatos();
  };

  const handleRevocar = async (id: number) => {
    setRevokingId(id);
    try {
      await apiTokenApi.revocar(id);
      message.success('Token revocado correctamente');
      cargarDatos();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al revocar token');
    } finally {
      setRevokingId(null);
    }
  };

  const handleTokenCreated = () => {
    cargarDatos();
  };

  const filteredData = useMemo(() => {
    if (!searchText) return data;
    const lower = searchText.toLowerCase();
    return data.filter(
      (item) =>
        item.nombre.toLowerCase().includes(lower) ||
        item.nombreUsuario?.toLowerCase().includes(lower)
    );
  }, [data, searchText]);

  const formatFecha = (val: string | null): string => {
    if (!val) return 'Nunca';
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns: ColumnsType<AuthApiTokenListadoDTO> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 250,
      render: (nombre: string) => (
        <Space>
          <KeyOutlined style={{ color: '#556ee6' }} />
          <Text strong>{nombre}</Text>
        </Space>
      ),
    },
    {
      title: 'Creado',
      dataIndex: 'creadoEn',
      key: 'creadoEn',
      width: 180,
      render: (val: string) => <Text>{formatFecha(val)}</Text>,
    },
    {
      title: 'Último uso',
      dataIndex: 'ultimoUso',
      key: 'ultimoUso',
      width: 180,
      render: (val: string | null) => (
        <Text type={val ? undefined : 'secondary'}>{formatFecha(val)}</Text>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      width: 120,
      align: 'center',
      render: (activo: boolean) =>
        activo ? (
          <Tag color="success">Activo</Tag>
        ) : (
          <Tag color="error">Revocado</Tag>
        ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 120,
      align: 'center',
      render: (_: unknown, record: AuthApiTokenListadoDTO) =>
        record.activo ? (
          <Popconfirm
            title="Revocar token"
            description="¿Estás seguro de revocar este token? Los servicios que lo usen dejarán de funcionar."
            okText="Revocar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleRevocar(record.id)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<StopOutlined />}
              loading={revokingId === record.id}
            >
              Revocar
            </Button>
          </Popconfirm>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ];

  return (
    <>
      <Card
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Buscar por nombre..."
              allowClear
              onSearch={handleSearch}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  (e.target as HTMLInputElement).blur();
                  handleSearch('');
                }
              }}
              style={{ width: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <div style={{ flex: 1 }} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              Nuevo token
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
          </div>
        </div>
        <Table<AuthApiTokenListadoDTO>
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          scroll={{ x: 850 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          pagination={{
            pageSize: 25,
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
          }}
          locale={{ emptyText: <Empty description="No hay tokens registrados" /> }}
        />
      </Card>

      <ApiTokenCrearModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleTokenCreated}
      />
    </>
  );
};

export default ApiTokens;
