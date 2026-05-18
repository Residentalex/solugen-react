import React, { useEffect, useState, useCallback } from 'react';
import { Table, Input, Tag, Button, message, Row, Col, Card, Select } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { productoApi } from '../../api/productoApi';
import type { ProductoListaDTO } from '../../types/productos';

function formatCurrency(n: number): string {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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
  const [searchText, setSearchText] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<string>('todos');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

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

      setData(resultados || []);
      setTotal(totalCount ?? 0);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar productos');
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
      render: (val: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{val}</span>,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 280,
      render: (val: string) => <span style={{ fontWeight: 500 }}>{toTitleCase(val ?? '')}</span>,
    },
    {
      title: 'Referencia',
      dataIndex: 'referencia',
      key: 'referencia',
      width: 140,
      render: (val: string) => <span className="paces-text-muted" style={{ fontSize: 12 }}>{val || '-'}</span>,
    },
    {
      title: 'Familia',
      dataIndex: 'familia',
      key: 'familia',
      width: 140,
      render: (val: { nombre?: string } | null) => val?.nombre ? <Tag style={{ fontSize: 11 }}>{val.nombre}</Tag> : '-',
    },
    {
      title: 'Categoría',
      dataIndex: 'categoria',
      key: 'categoria',
      width: 140,
      render: (val: { nombre?: string } | null) => val?.nombre ? <Tag style={{ fontSize: 11 }}>{toTitleCase(val.nombre)}</Tag> : '-',
    },
    {
      title: 'U. Medida',
      dataIndex: 'unidadMedida',
      key: 'unidadMedida',
      width: 100,
      render: (val: { nombre?: string } | null) => val?.nombre ? toTitleCase(val.nombre) : '-',
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
          <Input.Search
            placeholder="Buscar por código, nombre, categoría, familia..."
            allowClear
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
        </Col>
        <Col>
          <Select
            value={filtroActivo}
            onChange={(val) => {
              setFiltroActivo(val);
              setPage(1);
            }}
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
          <Button icon={<ReloadOutlined />} onClick={handleReload}>
            Recargar
          </Button>
        </Col>
      </Row>

      <Card className="paces-card-erp" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <Table<ProductoListaDTO>
          columns={columns}
          dataSource={data}
          rowKey="codigo"
          loading={loading}
          scroll={{ x: 1240 }}
          size="middle"
          onRow={(record) => ({
            onClick: () => navigate(`/MProducto/${record.codigo}`),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            onChange: handlePageChange,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} productos`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
        />
      </Card>
    </>
  );
};

export default Productos;
