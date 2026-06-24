import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { Table, Card, Tag, Space, Button, Typography, Popconfirm, message, Empty, Modal, Alert, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { StopOutlined, KeyOutlined, CopyOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiTokenApi, type AuthApiTokenListadoDTO } from '../../api/apiTokenApi';
import PermissionGate from '../../components/PermissionGate';
import ApiTokenCrearModal from './ApiTokenCrearModal';

const { Text } = Typography;

const ApiTokens: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const usuario = useAuthStore((s) => s.usuario);

  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [renovarModal, setRenovarModal] = useState<{ open: boolean; token: string; nombre: string }>({ open: false, token: '', nombre: '' });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['apiTokens'],
    queryFn: async () => {
      const result = await apiTokenApi.listar();
      return result || [];
    },
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MApiToken');
    return () => resetToolbar();
  }, [setActiveModule, resetToolbar]);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleRevocar = async (id: number) => {
    setRevokingId(id);
    try {
      await apiTokenApi.revocar(id);
      message.success('Token revocado correctamente');
      refetch();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al revocar token');
    } finally {
      setRevokingId(null);
    }
  };

  const handleTokenCreated = () => {
    refetch();
  };

  const handleRenovar = async (id: number, nombre: string) => {
    try {
      const result = await apiTokenApi.renovar(id);
      setRenovarModal({ open: true, token: result.token, nombre });
      message.success('Token renovado correctamente');
      refetch();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al renovar token');
    }
  };

  const filteredData = useMemo(() => {
    const list = data || [];
    if (!searchText) return list;
    const lower = searchText.toLowerCase();
    return list.filter(
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
      title: 'Ãšltimo uso',
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
          <Button type="text" size="small" icon={<KeyOutlined />} onClick={() => handleRenovar(record.id, record.nombre)}>
            Renovar
          </Button>
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
        <CatalogoListadoToolbar
          onSearch={handleSearch}
          pageSize={25}
          onPageSizeChange={(v) => {}}
          ocultarPageSize
          onNuevo={() => setModalOpen(true)}
          onReload={() => refetch()}
        />
        <Table<AuthApiTokenListadoDTO>
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 850 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          pagination={{
            pageSize: 25,
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
          }}
          locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No hay tokens registrados" /></div> }}
        />
      </Card>

      <ApiTokenCrearModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleTokenCreated}
      />

      <Modal
        title={`Token renovado: ${renovarModal.nombre}`}
        open={renovarModal.open}
        onCancel={() => setRenovarModal({ open: false, token: '', nombre: '' })}
        footer={
          <Space>
            <Button onClick={async () => {
              const texto = renovarModal.token;
              let exito = false;
              if (navigator.clipboard?.writeText) {
                try {
                  await navigator.clipboard.writeText(texto);
                  exito = true;
                } catch { /* fallback */ }
              }
              if (!exito) {
                try {
                  const ta = document.createElement('textarea');
                  ta.value = texto;
                  ta.style.position = 'fixed';
                  ta.style.opacity = '0';
                  ta.style.left = '-9999px';
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand('copy');
                  document.body.removeChild(ta);
                  exito = true;
                } catch { /* nada */ }
              }
              if (exito) {
                message.success('Token copiado al portapapeles');
              } else {
                message.error('No se pudo copiar el token');
              }
            }} icon={<CopyOutlined />}>
              Copiar
            </Button>
            <Button type="primary" onClick={() => setRenovarModal({ open: false, token: '', nombre: '' })}>
              Cerrar
            </Button>
          </Space>
        }
        width={600}
      >
        <Alert
          message="Guarde este token en un lugar seguro. No podrÃ¡ volver a verlo."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Input.TextArea
          rows={3}
          value={renovarModal.token}
          readOnly
          style={{ fontFamily: 'monospace', fontSize: 13 }}
        />
      </Modal>
    </>
  );
};

export default ApiTokens;
