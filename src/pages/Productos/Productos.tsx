import React, { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Input, Tag, Button, Card, Select, Typography, Tooltip, Alert, Empty } from 'antd';
import { ReloadOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { productoApi } from '../../api/productoApi';
import PermissionGate from '../../components/PermissionGate';
import { toTitleCase, formatCurrency } from '../../utils/formats';
import type { ProductoListaDTO } from '../../types/productos';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const { Text } = Typography;

const Productos: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [searchText, setSearchText] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<string>('todos');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const usuario = useAuthStore((s: any) => s.usuario);
  const pantallaActual = usuario?.pantallas.find((p: any) => p.codigo === 'MProducto');
  const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;

  const soloActivos = filtroActivo === 'activos' ? true : filtroActivo === 'inactivos' ? false : undefined;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['productos', sucursalActiva, page, pageSize, searchText, filtroActivo],
    queryFn: async () => {
      if (sucursalActiva === undefined) return { data: [], total: 0 };
      const salto = (page - 1) * pageSize;

      let resultados: ProductoListaDTO[];
      let totalCount: number;

      if (searchText && searchText.length > 2) {
        resultados = await productoApi.filtrar(sucursalActiva, {
          cantidad: pageSize,
          salto,
          codigo: searchText,
          referencia: searchText,
          sku: searchText,
          familia: searchText,
          activo: soloActivos,
        });
        totalCount = await productoApi.obtenerTotal(sucursalActiva, { codigo: searchText, activo: soloActivos });
      } else {
        const params: { cantidad?: number; salto?: number; codigo?: string; activo?: boolean } = {
          cantidad: pageSize,
          salto,
        };
        if (soloActivos !== undefined) params.activo = soloActivos;
        resultados = await productoApi.obtenerListado(sucursalActiva, params);
        totalCount = await productoApi.obtenerTotal(sucursalActiva, { activo: soloActivos });
      }

      return {
        data: (resultados || []).sort((a, b) => b.codigo.localeCompare(a.codigo)),
        total: totalCount ?? 0,
      };
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MProducto');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

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

  const columns: ColumnsType<ProductoListaDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (val: string, record: ProductoListaDTO) =>
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
      width: 280,
      render: (val: string) => <Text>{toTitleCase(val ?? '')}</Text>,
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
      dataIndex: 'familia',
      key: 'familia',
      width: 140,
      render: (val: { nombre?: string } | null) => val?.nombre ? <Tag style={{ fontSize: 11 }}>{val.nombre}</Tag> : <Text>{'-'}</Text>,
    },
    {
      title: 'Categoría',
      dataIndex: 'categoria',
      key: 'categoria',
      width: 140,
      render: (val: { nombre?: string } | null) => val?.nombre ? <Tag style={{ fontSize: 11 }}>{toTitleCase(val.nombre)}</Tag> : <Text>{'-'}</Text>,
    },
    {
      title: 'U. Medida',
      dataIndex: 'unidadMedida',
      key: 'unidadMedida',
      width: 100,
      render: (val: { nombre?: string } | null) => <Text>{val?.nombre ? toTitleCase(val.nombre) : '-'}</Text>,
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
      <Table<ProductoListaDTO>
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
