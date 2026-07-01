import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Tag, Button, Card, Select, Typography, Tooltip, Alert, Empty, Space } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { productoApi } from '../../api/productoApi';
import PermissionGate from '../../components/PermissionGate';
import { toTitleCase, formatCurrency } from '../../utils/formats';
import type { ProductoVistaDTO } from '../../types/productos';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const { Text } = Typography;

const Productos: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const sucursalProductos = useCompanyStore((s) => s.data.sucursalProductos);

  const [searchText, setSearchText] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<string>('todos');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const usuario = useAuthStore((s: any) => s.usuario);
  const pantallaActual = usuario?.pantallas.find((p: any) => p.codigo === 'MProducto');
  const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;

  const soloActivos = filtroActivo === 'activos' ? true : filtroActivo === 'inactivos' ? false : undefined;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['productos', sucursalProductos, page, pageSize, searchText, filtroActivo],
    queryFn: async () => {
      if (sucursalProductos === undefined) return { data: [], total: 0 };
      const salto = (page - 1) * pageSize;
      const params: { cantidad?: number; salto?: number; codigo?: string; nombre?: string; activo?: boolean } = {
        cantidad: pageSize, salto,
      };
      if (soloActivos !== undefined) params.activo = soloActivos;
      if (searchText) {
        params.codigo = searchText;
        params.nombre = searchText;
      }

      const { items, total } = await productoApi.obtenerVista(sucursalProductos, params);
      return { data: items || [], total };
    },
    enabled: sucursalProductos !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MProducto');
    updateToolbar({});
    setPageTitleOverride('');
    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, updateToolbar, resetToolbar, setPageTitleOverride]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handlePageChange = (newPage: number, newPageSize: number) => {
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setPage(1);
    } else {
      setPage(newPage);
    }
  };

  const columns: ColumnsType<ProductoVistaDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (val: string, record: ProductoVistaDTO) =>
        puedeEditar ? (
          <Link to={`/MProducto/${record.codigo}`} className="paces-doc-link" style={{ fontWeight: 500 }}>
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
      title: 'Referencia',
      dataIndex: 'referencia',
      key: 'referencia',
      width: 140,
      render: (val: string) => <Text type="secondary">{val || '-'}</Text>,
    },
    {
      title: 'Familia',
      dataIndex: 'familiaNombre',
      key: 'familiaNombre',
      width: 140,
      render: (val: string) => val ? <Tag style={{ fontSize: 11 }}>{val}</Tag> : <Text>{'-'}</Text>,
    },
    {
      title: 'Categoría',
      dataIndex: 'categoriaNombre',
      key: 'categoriaNombre',
      width: 140,
      render: (val: string) => val ? <Tag style={{ fontSize: 11 }}>{toTitleCase(val)}</Tag> : <Text>{'-'}</Text>,
    },
    {
      title: 'U. Medida',
      dataIndex: 'unidadMedidaNombre',
      key: 'unidadMedidaNombre',
      width: 100,
      render: (val: string) => <Text>{val ? toTitleCase(val) : '-'}</Text>,
    },
    {
      title: 'Precio',
      dataIndex: 'precio',
      key: 'precio',
      width: 110,
      align: 'right',
      render: (val: number) => <Text style={{ fontFamily: 'monospace' }}>{formatCurrency(val)}</Text>,
    },
    {
      title: 'Ult. Costo',
      dataIndex: 'ultimoCosto',
      key: 'ultimoCosto',
      width: 110,
      align: 'right',
      render: (val: number) => <Text style={{ fontFamily: 'monospace' }}>{formatCurrency(val)}</Text>,
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
      {isError && (
        <Alert
          message="Error al cargar productos"
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
          onReload={() => refetch()}
          onNuevo={() => navigate('/MProducto/nuevo')}
          filtros={
            <Select
              value={filtroActivo}
              onChange={(val) => { setFiltroActivo(val); setPage(1); }}
              style={{ width: 130 }}
              size="middle"
              options={
                [
                  { value: "todos", label: "Todos" },
                  { value: "activos", label: "Solo activos" },
                  { value: "inactivos", label: "Solo inactivos" },
                ]
              }
            />
          }
          acciones={
            <PermissionGate permisoEspecial="pe_importar">
              <Tooltip title="Importar desde Excel">
                <Button icon={<UploadOutlined />} onClick={() => navigate("/MProducto/importar")} />
              </Tooltip>
            </PermissionGate>
          }
        />
      <Table<ProductoVistaDTO>
        columns={columns}
        dataSource={data?.data || []}
        rowKey="codigo"
        loading={isLoading}
        scroll={{ x: 1240 }}
        size="middle"
        rowClassName="paces-row-hover"
        className="paces-border-top paces-list-table"
        onRow={() => ({
          style: { cursor: 'default' },
        })}
        locale={{
          emptyText: <div style={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Empty description="No hay productos registrados" />
          </div>,
        }}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: data?.total || 0,
          onChange: handlePageChange,
          showSizeChanger: false,
          showTotal: (t) => `${t} registros`,
        }}
      />
    </Card>
    </>
  );
};

export default Productos;
