import React, { useEffect, useState, useCallback } from 'react';
import { Table, Input, Tag, Button, message, Space, Row, Col, Card, Select } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { productoApi } from '../../api/productoApi';
import type { ProductoListaDTO } from '../../types/productos';

function formatCurrency(n: number): string {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const Productos: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [data, setData] = useState<ProductoListaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<string>('todos');

  const cargarDatos = useCallback(async (busqueda?: string, soloActivos?: boolean) => {
    setLoading(true);
    try {
      const params: { filas?: number; codigo?: string; activo?: boolean } = { filas: 200 };
      if (soloActivos !== undefined) params.activo = soloActivos;
      if (busqueda) params.codigo = busqueda;
      const result = await productoApi.obtenerListado(sucursalActiva, params);
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MProducto');
    updateToolbar({});
    cargarDatos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos]);

  const handleSearch = () => {
    const soloActivos = filtroActivo === 'activos' ? true : filtroActivo === 'inactivos' ? false : undefined;
    cargarDatos(searchText.trim() || undefined, soloActivos);
  };

  const columns: ColumnsType<ProductoListaDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (val: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{val}</span>,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 280,
      render: (val: string) => <span style={{ fontWeight: 500 }}>{val}</span>,
    },
    {
      title: 'Referencia',
      dataIndex: 'referencia',
      key: 'referencia',
      width: 140,
      render: (val: string) => <span style={{ fontSize: 12, color: '#6c757d' }}>{val || '-'}</span>,
    },
    {
      title: 'Familia',
      dataIndex: 'familia',
      key: 'familia',
      width: 140,
      render: (val: string) => val ? <Tag style={{ fontSize: 11 }}>{val}</Tag> : '-',
    },
    {
      title: 'Precio',
      dataIndex: 'precio',
      key: 'precio',
      width: 110,
      align: 'right',
      render: (val: number) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{formatCurrency(val)}</span>,
    },
    {
      title: 'Ult. Costo',
      dataIndex: 'ultimoCosto',
      key: 'ultimoCosto',
      width: 110,
      align: 'right',
      render: (val: number) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{formatCurrency(val)}</span>,
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      width: 80,
      render: (activo: boolean) => (
        <Tag color={activo ? 'green' : 'default'}>{activo ? 'Activo' : 'Inactivo'}</Tag>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Productos</h4>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
        <Col>
          <Input
            placeholder="Buscar por código..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 260 }}
            allowClear
            onClear={() => { setSearchText(''); cargarDatos(); }}
          />
        </Col>
        <Col>
          <Select
            value={filtroActivo}
            onChange={setFiltroActivo}
            style={{ width: 130 }}
            size="middle"
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'activos', label: 'Solo activos' },
              { value: 'inactivos', label: 'Solo inactivos' },
            ]}
          />
        </Col>
        <Col>
          <Button icon={<SearchOutlined />} onClick={handleSearch}>Buscar</Button>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={() => { setSearchText(''); setFiltroActivo('todos'); cargarDatos(); }}>
            Recargar
          </Button>
        </Col>
      </Row>

      <Card style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }} styles={{ body: { padding: 0 } }}>
        <Table<ProductoListaDTO>
          columns={columns}
          dataSource={data}
          rowKey="codigo"
          loading={loading}
          scroll={{ x: 1000 }}
          size="middle"
          pagination={{
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} productos`,
            pageSizeOptions: ['10', '20', '50', '100'],
            defaultPageSize: 20,
          }}
        />
      </Card>
    </>
  );
};

export default Productos;
