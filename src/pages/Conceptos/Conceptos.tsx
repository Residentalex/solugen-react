import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Card, Input, Tag, Button, Typography, message, Space, Alert, Empty
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { conceptosApi } from '../../api/conceptosApi';
import type { ConceptoDTO } from '../../types/entradaAlmacen';

const { Text } = Typography;

const toTitleCase = (str: string): string =>
  str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const Conceptos: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [data, setData] = useState<ConceptoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);

  const cargarDatos = useCallback(async (filtro?: string) => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const result = await conceptosApi.obtenerConceptos(sucursalActiva, filtro);
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar conceptos');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MConcepto');
    updateToolbar({});
    cargarDatos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos]);

  const handleSearch = (value: string) => {
    cargarDatos(value || undefined);
  };

  const handleRefresh = () => {
    setLoadingError(false);
    cargarDatos();
  };

  const columns: ColumnsType<ConceptoDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (val: string, record: ConceptoDTO) => (
        <Text
          style={{ fontFamily: 'monospace', cursor: 'pointer', color: '#556ee6' }}
          onClick={() => navigate(`/MConcepto/${record.codigo}`)}
        >
          {val}
        </Text>
      ),
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      ellipsis: true,
      render: (val: string) => <Text strong ellipsis>{toTitleCase(val ?? '')}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      width: 90,
      align: 'center',
      render: (val: boolean | undefined) => (
        <Tag color={val ? 'green' : 'default'}>{val ? 'Activo' : 'Inactivo'}</Tag>
      ),
    },
  ];

  return (
    <>
      {loadingError && (
        <Alert
          title="Error al cargar conceptos"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={handleRefresh}>
              Reintentar
            </Button>
          }
        />
      )}
      <Card
        styles={{ body: { padding: 0 } }}
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
      >
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Buscar por código o nombre..."
              allowClear
              onSearch={handleSearch}
              style={{ width: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <div style={{ flex: 1 }} />
            <PermissionGate accion="CREAR">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/MConcepto/nuevo')}>
                Nuevo
              </Button>
            </PermissionGate>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
          </div>
        </div>
        <Table<ConceptoDTO>
          columns={columns}
          dataSource={data}
          rowKey="codigo"
          loading={loading}
          scroll={{ x: 700 }}
          size="middle"
          pagination={{
            showSizeChanger: false,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} de ${total} conceptos`,
          }}
          locale={{
            emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No hay conceptos registrados" /></div>,
          }}
          className="paces-border-top paces-list-table"
        />
      </Card>
    </>
  );
};

export default Conceptos;
