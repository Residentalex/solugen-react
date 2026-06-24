import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card, Table, Button, Select, Tag, Typography, Alert, Empty, Space,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { clienteApi } from '../../api/clienteApi';
import { toTitleCase, formatCurrency } from '../../utils/formats';
import type { ClienteVistaDTO } from '../../types/facturacion';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const { Text } = Typography;



const Clientes: React.FC = () => {

  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalClientes = useCompanyStore((s) => s.data.sucursalClientes);
  const usuario = useAuthStore((s: any) => s.usuario);

  const pantallaActual = usuario?.pantallas.find((p: any) => p.codigo === 'MCliente');
  const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;

  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filtroActivo, setFiltroActivo] = useState<string>('todos');

  React.useEffect(() => {
    setActiveModule('MCliente');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['clientes', sucursalClientes, page, pageSize, searchText, filtroActivo],
    queryFn: async () => {
      const salto = (page - 1) * pageSize;
      const soloActivos = filtroActivo === 'todos' ? undefined : filtroActivo === 'activos';
      const params: { cantidad?: number; salto?: number; codigo?: string; nombre?: string; activo?: boolean } = {
        cantidad: pageSize, salto,
      };
      if (soloActivos !== undefined) params.activo = soloActivos;
      if (searchText) {
        params.codigo = searchText;
        params.nombre = searchText;
      }

      const { items, total } = await clienteApi.obtenerVista(sucursalClientes, params);
      return { datos: items || [], total };
    },
    enabled: sucursalClientes !== undefined,
  });

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const abrirNuevo = () => window.location.href = '/MCliente/nuevo';

  const columns: ColumnsType<ClienteVistaDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (val: string, record: ClienteVistaDTO) =>
        puedeEditar ? (
          <Link to={`/MCliente/${record.codigo}`} className="paces-doc-link" style={{ fontWeight: 500 }}>
            {val}
          </Link>
        ) : (
          <Text style={{ fontFamily: 'monospace' }}>{val}</Text>
        ),
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 320,
      render: (name: string) => (
        <Space>
          <div className="paces-avatar-initials">{(name || '?').charAt(0).toUpperCase()}</div>
          <Text>{toTitleCase(name || '')}</Text>
        </Space>
      ),
    },
    {
      title: 'Teléfono',
      dataIndex: 'telefono',
      key: 'telefono',
      width: 130,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      width: 90,
      render: (activo: boolean) => (
        <Tag color={activo ? 'green' : 'default'}>{activo ? 'Activo' : 'Inactivo'}</Tag>
      ),
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      width: 130,
      align: 'right',
      render: (val: number) => (
        <Text style={{ fontFamily: 'monospace' }}>{val != null ? formatCurrency(val) : '-'}</Text>
      ),
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar clientes"
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
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
        <CatalogoListadoToolbar
          onSearch={handleSearch}
          pageSize={pageSize}
          onPageSizeChange={(v) => { setPageSize(v); setPage(1); }}
          onNuevo={abrirNuevo}
          onReload={() => refetch()}
          filtros={
            <Select
              value={filtroActivo}
              onChange={(val) => { setFiltroActivo(val); setPage(1); }}
              style={{ width: 130 }}
              size="middle"
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'activos', label: 'Solo activos' },
                { value: 'inactivos', label: 'Solo inactivos' },
              ]}
            />
          }
        />
        <Table<ClienteVistaDTO>
          columns={columns}
          dataSource={data?.datos || []}
          rowKey="codigo"
          loading={isLoading}
          scroll={{ x: 1000 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          locale={{
            emptyText: <div style={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Empty description="No hay clientes registrados" />
            </div>,
          }}
          pagination={{
            current: page,
            pageSize,
            total: data?.total || 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
          }}
        />
      </Card>
    </>
  );
};

export default Clientes;
