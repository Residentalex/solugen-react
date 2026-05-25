import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Table, Card, Input, Button, message, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { cuentaBancariaApi } from '../../api/cuentaBancariaApi';
import type { CuentaBancariaDTO } from '../../api/cuentaBancariaApi';

const { Text } = Typography;

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const CuentasBancarias: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [data, setData] = useState<CuentaBancariaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const cargarDatos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const result = await cuentaBancariaApi.obtenerListado(sucursalActiva);
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar cuentas bancarias');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MCuentaBanco');
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
        item.nombre?.toLowerCase().includes(lower) ||
        item.noCuenta?.toLowerCase().includes(lower)
    );
  }, [data, searchText]);

  const columns: ColumnsType<CuentaBancariaDTO> = [
    {
      title: 'No. Cuenta',
      dataIndex: 'noCuenta',
      key: 'noCuenta',
      width: 160,
      fixed: 'left',
      render: (val: string) => <Text strong>{val}</Text>,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 260,
      render: (val: string) => <Text>{toTitleCase(val ?? '')}</Text>,
    },
    {
      title: 'Banco',
      dataIndex: 'banco',
      key: 'banco',
      width: 200,
      render: (val: string) => <Text>{toTitleCase(val ?? '')}</Text>,
    },
    {
      title: 'Cuenta Contable',
      dataIndex: 'cuentaContable',
      key: 'cuentaContable',
      width: 160,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Agente',
      dataIndex: 'agente',
      key: 'agente',
      width: 150,
      render: (val: string) => <Text>{toTitleCase(val ?? '') || '-'}</Text>,
    },
    {
      title: 'Activo',
      dataIndex: 'activo',
      key: 'activo',
      width: 90,
      align: 'center',
      render: (val: boolean) => (
        <Tag color={val ? 'success' : 'error'}>{val ? 'Sí' : 'No'}</Tag>
      ),
    },
    {
      title: 'Nota',
      dataIndex: 'nota',
      key: 'nota',
      width: 200,
      ellipsis: true,
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
            placeholder="Buscar por código, nombre o cuenta..."
            allowClear
            onSearch={handleSearch}
            style={{ width: 400 }}
            prefix={<SearchOutlined className="paces-text-icon" />}
          />
          <div style={{ flex: 1 }} />
          <Button icon={<ReloadOutlined />} onClick={() => cargarDatos()} />
        </div>
      </div>
      <Table<CuentaBancariaDTO>
        columns={columns}
        dataSource={filteredData}
        rowKey="codigo"
        loading={loading}
        scroll={{ x: 1200 }}
        size="middle"
        pagination={{
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} cuentas bancarias`,
          pageSizeOptions: ['10', '20', '50', '100'],
          defaultPageSize: 10,
        }}
      />
    </Card>
  );
};

export default CuentasBancarias;
