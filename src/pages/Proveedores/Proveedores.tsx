import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Table, Card, Input, Button, Typography, Space, Alert } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { proveedorApi } from '../../api/proveedorApi';
import PermissionGate from '../../components/PermissionGate';
import type { SuplidorDTO } from '../../types/entradaAlmacen';

const { Text } = Typography;

const FILAS_POR_PAGINA = 25;

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function getInitials(name: string): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

const Proveedores: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);

  const [data, setData] = useState<SuplidorDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(FILAS_POR_PAGINA);
  const [searchText, setSearchText] = useState('');

  const cargarDatos = useCallback(async (pagina: number, filas: number, busqueda: string) => {
    setLoading(true);
    try {
      let resultados: SuplidorDTO[];
      if (busqueda.length > 2) {
        resultados = await proveedorApi.filtrar(sucursalActiva, busqueda, busqueda);
      } else {
        resultados = await proveedorApi.obtenerListado(sucursalActiva, filas, (pagina - 1) * filas);
      }
      setData(resultados);
      setTotal(resultados.length < filas ? (pagina - 1) * filas + resultados.length : pagina * filas + 1);
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    cargarDatos(page, pageSize, searchText);
  }, [page, pageSize, searchText, cargarDatos]);

  useEffect(() => {
    setActiveModule('MSUP');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleRefresh = () => {
    setLoadingError(false);
    cargarDatos(page, pageSize, searchText);
  };

  const handleTableChange = (pagination: any) => {
    setPage(pagination.current);
  };

  const columns: ColumnsType<SuplidorDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (val: string, record: SuplidorDTO) => (
        <Link to={`/MProveedor/${record.codigo}`} className="paces-doc-link">
          <Text strong>{val}</Text>
        </Link>
      ),
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 300,
      render: (name: string) => (
        <Space>
          <div className="paces-avatar-initials">{getInitials(name)}</div>
          <Text>{toTitleCase(name || '')}</Text>
        </Space>
      ),
    },
    {
      title: 'Identificación',
      dataIndex: 'identificacion',
      key: 'identificacion',
      width: 160,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Teléfono',
      dataIndex: 'telefono',
      key: 'telefono',
      width: 140,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Días Crédito',
      dataIndex: 'diasCredito',
      key: 'diasCredito',
      width: 120,
      align: 'right',
      render: (val: number) => <Text>{val ?? '-'}</Text>,
    },
    {
      title: 'Requiere ORC',
      dataIndex: 'requiereORC',
      key: 'requiereORC',
      width: 130,
      align: 'center',
      render: (val: boolean) => <Text>{val ? 'Sí' : 'No'}</Text>,
    },
  ];

  return (
    <>
      {loadingError && (
        <Alert
          message="Error al cargar proveedores"
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
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
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
          <PermissionGate accion="CREAR">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/MProveedor/nuevo')}>
              Nuevo
            </Button>
          </PermissionGate>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
        </div>
      </div>
      <Table<SuplidorDTO>
        columns={columns}
        dataSource={data}
        rowKey="codigo"
        loading={loading}
        scroll={{ x: 1100 }}
        size="middle"
        rowClassName="paces-row-hover"
        onChange={handleTableChange}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          showTotal: (t) => `${t} registros`,
        }}
        className="paces-border-top paces-list-table"
      />
    </Card>
    </>
  );
};

export default Proveedores;
