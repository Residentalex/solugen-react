import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Table, Card, Input, Button, message, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { familiaArticuloApi } from '../../api/familiaArticuloApi';
import type { FamiliaArticuloDTO } from '../../types/productos';

const { Text } = Typography;

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const FamiliasArticulo: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [data, setData] = useState<FamiliaArticuloDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const cargarDatos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const result = await familiaArticuloApi.obtenerTodo(sucursalActiva);
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar familias de artículos');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MFamilia');
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
        item.nombre?.toLowerCase().includes(lower) ||
        item.idExterno?.toLowerCase().includes(lower)
    );
  }, [data, searchText]);

  const columns: ColumnsType<FamiliaArticuloDTO> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 200,
      fixed: 'left',
      render: (val: string) => <Text strong>{toTitleCase(val ?? '')}</Text>,
    },
    {
      title: 'ID Externo',
      dataIndex: 'idExterno',
      key: 'idExterno',
      width: 120,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Aumento Precio Máx.',
      dataIndex: 'aumentoPrecioMaximo',
      key: 'aumentoPrecioMaximo',
      width: 160,
      align: 'right',
      render: (val: number) => <Text>{(val ?? 0).toLocaleString()}</Text>,
    },
    {
      title: 'Cta. Costo Venta',
      dataIndex: 'cuentaCostoVenta',
      key: 'cuentaCostoVenta',
      width: 150,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Cta. Ingresos Venta',
      dataIndex: 'cuentaIngresosVenta',
      key: 'cuentaIngresosVenta',
      width: 150,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Cta. Descuento Venta',
      dataIndex: 'cuentaDescuentoVenta',
      key: 'cuentaDescuentoVenta',
      width: 160,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Cta. Devolución Venta',
      dataIndex: 'cuentaDeVolucionVenta',
      key: 'cuentaDeVolucionVenta',
      width: 170,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Cta. Costo Compra',
      dataIndex: 'cuentaCostoCompra',
      key: 'cuentaCostoCompra',
      width: 150,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Cta. Devolución Compra',
      dataIndex: 'cuentaDevolucionCompra',
      key: 'cuentaDevolucionCompra',
      width: 170,
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
            placeholder="Buscar por nombre o ID externo..."
            allowClear
            onSearch={handleSearch}
            style={{ width: 400 }}
            prefix={<SearchOutlined className="paces-text-icon" />}
          />
          <div style={{ flex: 1 }} />
          <Button icon={<ReloadOutlined />} onClick={() => cargarDatos()} />
        </div>
      </div>
      <Table<FamiliaArticuloDTO>
        columns={columns}
        dataSource={filteredData}
        rowKey={(r) => r.idExterno || r.nombre || ''}
        loading={loading}
        scroll={{ x: 1450 }}
        size="middle"
        pagination={{
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} familias`,
          pageSizeOptions: ['10', '20', '50', '100'],
          defaultPageSize: 10,
        }}
      />
    </Card>
  );
};

export default FamiliasArticulo;
