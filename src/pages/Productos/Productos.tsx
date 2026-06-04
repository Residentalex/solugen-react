import React, { useEffect, useState, useCallback } from 'react';
import { Table, Input, Tag, Button, Card, Select, Typography, Tooltip, Alert } from 'antd';
import { ReloadOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { productoApi } from '../../api/productoApi';
import type { ProductoListaDTO } from '../../types/productos';

function formatCurrency(n: number): string {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const { Text } = Typography;

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const Productos: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [data, setData] = useState<ProductoListaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<string>('todos');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  const usuario = useAuthStore((s: any) => s.usuario);
  const pantallaActual = usuario?.pantallas.find((p: any) => p.codigo === 'MProducto');
  const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;

  const cargarDatos = useCallback(async (
    busqueda?: string,
    soloActivos?: boolean,
    pagina?: number,
    tamano?: number
  ) => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const currentPage = pagina ?? page;
      const currentSize = tamano ?? pageSize;
      const salto = (currentPage - 1) * currentSize;

      let resultados: ProductoListaDTO[];
      let totalCount: number;

      if (busqueda && busqueda.length > 2) {
        resultados = await productoApi.filtrar(sucursalActiva, {
          cantidad: currentSize,
          salto,
          codigo: busqueda,
          referencia: busqueda,
          sku: busqueda,
          familia: busqueda,
          activo: soloActivos,
        });
        totalCount = await productoApi.obtenerTotal(sucursalActiva, { codigo: busqueda, activo: soloActivos });
      } else {
        const params: { filas?: number; salto?: number; codigo?: string; activo?: boolean } = {
          filas: currentSize,
          salto,
        };
        if (soloActivos !== undefined) params.activo = soloActivos;
        resultados = await productoApi.obtenerListado(sucursalActiva, params);
        totalCount = await productoApi.obtenerTotal(sucursalActiva, { activo: soloActivos });
      }

      setData((resultados || []).sort((a, b) => b.codigo.localeCompare(a.codigo)));
      setTotal(totalCount ?? 0);
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, page, pageSize]);

  useEffect(() => {
    setActiveModule('MProducto');
    updateToolbar({});
    cargarDatos(undefined, undefined, 1, pageSize);
    return () => resetToolbar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setActiveModule, updateToolbar, resetToolbar, sucursalActiva]);

  // Recargar cuando cambian filtroActivo, page o pageSize (no searchText, eso va por onSearch)
  useEffect(() => {
    const soloActivos = filtroActivo === 'activos' ? true : filtroActivo === 'inactivos' ? false : undefined;
    cargarDatos(searchText.trim() || undefined, soloActivos, page, pageSize);
  }, [filtroActivo, page, pageSize]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
    const soloActivos = filtroActivo === 'activos' ? true : filtroActivo === 'inactivos' ? false : undefined;
    cargarDatos(value.trim() || undefined, soloActivos, 1, pageSize);
  };

  const handleReload = () => {
    setLoadingError(false);
    const soloActivos = filtroActivo === 'activos' ? true : filtroActivo === 'inactivos' ? false : undefined;
    cargarDatos(searchText.trim() || undefined, soloActivos, page, pageSize);
  };

  const handlePageChange = (newPage: number, newPageSize: number) => {
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setPage(1);
      const soloActivos = filtroActivo === 'activos' ? true : filtroActivo === 'inactivos' ? false : undefined;
      cargarDatos(searchText.trim() || undefined, soloActivos, 1, newPageSize);
    } else {
      setPage(newPage);
      const soloActivos = filtroActivo === 'activos' ? true : filtroActivo === 'inactivos' ? false : undefined;
      cargarDatos(searchText.trim() || undefined, soloActivos, newPage, pageSize);
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
      {loadingError && (
        <Alert
          message="Error al cargar productos"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={handleReload}>
              Reintentar
            </Button>
          }
        />
      )}
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
      <div style={{ padding: '16px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
          <Input.Search
            placeholder="Buscar por código o nombre..."
            allowClear
            onSearch={handleSearch}
            style={{ width: 400 }}
            prefix={<SearchOutlined className="paces-text-icon" />}
          />
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
          <Select
            style={{ width: 65 }}
            value={pageSize}
            onChange={(v) => { setPageSize(v); setPage(1); }}
            options={[
              { value: 25, label: '25' },
              { value: 50, label: '50' },
              { value: 100, label: '100' },
            ]}
          />
          <div style={{ flex: 1 }} />
          <Button icon={<ReloadOutlined />} onClick={handleReload} />
          <Tooltip title="Importar desde Excel">
            <Button icon={<UploadOutlined />} onClick={() => navigate('/MProducto/importar')} />
          </Tooltip>
        </div>
      </div>
      <Table<ProductoListaDTO>
        columns={columns}
        dataSource={data}
        rowKey="codigo"
        loading={loading}
        scroll={{ x: 1240 }}
        size="middle"
        rowClassName="paces-row-hover"
        className="paces-border-top paces-list-table"
        onRow={() => ({
          style: { cursor: 'default' },
        })}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: total,
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
