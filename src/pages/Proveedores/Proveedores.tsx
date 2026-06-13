import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Table, Card, Button, Typography, Space, Alert, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { proveedorApi } from '../../api/proveedorApi';
import PermissionGate from '../../components/PermissionGate';
import { toTitleCase } from '../../utils/formats';
import type { SuplidorDTO } from '../../types/entradaAlmacen';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const { Text } = Typography;

const Proveedores: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);

  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  React.useEffect(() => {
    setActiveModule('MSUP');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['proveedores', sucursalActiva, page, pageSize, searchText],
    queryFn: async () => {
      const salto = (page - 1) * pageSize;
      let resultados: SuplidorDTO[];
      if (searchText.length > 2) {
        resultados = await proveedorApi.filtrar(sucursalActiva, searchText, searchText);
      } else {
        resultados = await proveedorApi.obtenerListado(sucursalActiva, pageSize, salto);
      }
      const totalCount = resultados.length < pageSize ? (page - 1) * pageSize + resultados.length : page * pageSize + 1;
      setTotal(totalCount);
      return resultados || [];
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
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
          <div className="paces-avatar-initials">{(name || '?').charAt(0).toUpperCase()}</div>
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
      {isError && (
        <Alert
          message="Error al cargar proveedores"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => refetch()}>
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
        <CatalogoListadoToolbar
          onSearch={handleSearch}
          pageSize={pageSize}
          onPageSizeChange={(v) => { setPageSize(v); setPage(1); }}
          onNuevo={() => navigate('/MProveedor/nuevo')}
          onReload={() => refetch()}
        />
        <Table<SuplidorDTO>
          columns={columns}
          dataSource={data || []}
          rowKey="codigo"
          loading={isLoading}
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
          locale={{
            emptyText: <div style={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Empty description="No hay proveedores registrados" />
            </div>,
          }}
          className="paces-border-top paces-list-table"
        />
      </Card>
    </>
  );
};

export default Proveedores;
