import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Table, Card, Input, Button, message, Typography, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { categoriaArticuloApi } from '../../api/categoriaArticuloApi';
import type { CategoriaArticuloDTO } from '../../types/productos';

const { Text } = Typography;

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const CategoriasArticulo: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [data, setData] = useState<CategoriaArticuloDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const cargarDatos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const result = await categoriaArticuloApi.obtenerListado(sucursalActiva);
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MCategoria');
    updateToolbar({});
    cargarDatos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos]);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const filteredData = useMemo(() => {
    if (!searchText) return data;
    const lower = searchText.toLowerCase();
    return data.filter(
      (item) =>
        item.codigo?.toLowerCase().includes(lower) ||
        item.nombre?.toLowerCase().includes(lower)
    );
  }, [data, searchText]);

  const columns: ColumnsType<CategoriaArticuloDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (val: string) => <Text strong>{val || '-'}</Text>,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 280,
      render: (val: string) => <Text>{toTitleCase(val ?? '')}</Text>,
    },
    {
      title: 'Grupo',
      key: 'grupo',
      width: 200,
      render: (_: any, record: CategoriaArticuloDTO) => (
        <Text>{record.grupo?.nombre ? toTitleCase(record.grupo.nombre) : '-'}</Text>
      ),
    },
    {
      title: 'Control',
      key: 'control',
      width: 200,
      render: (_: any, record: CategoriaArticuloDTO) => (
        <Text>{record.control?.nombre ? toTitleCase(record.control.nombre) : '-'}</Text>
      ),
    },
    {
      title: 'ID Externo',
      dataIndex: 'idExterno',
      key: 'idExterno',
      width: 120,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
  ];

  return (
    <Card
      className="paces-card-erp"
      style={{ borderRadius: 8 }}
      styles={{ body: { padding: 0 } }}
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
          <Button icon={<ReloadOutlined />} onClick={() => cargarDatos()} />
        </div>
      </div>
      <Table<CategoriaArticuloDTO>
        columns={columns}
        dataSource={filteredData}
        rowKey={(r) => r.codigo || r.nombre || ''}
        loading={loading}
        scroll={{ x: 900 }}
        size="middle"
        pagination={{
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} categorías`,
          pageSizeOptions: ['10', '20', '50', '100'],
          defaultPageSize: 10,
        }}
      />
    </Card>
  );
};

export default CategoriasArticulo;
