import React, { useEffect, useState, useCallback } from 'react';
import { Table, Input, Select, Tag, Button, message, Card, Typography, Modal, Descriptions, Alert, Empty } from 'antd';
import { ReloadOutlined, SearchOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PermissionGate from '../../components/PermissionGate';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { servicioApi } from '../../api/servicioApi';
import type { ServicioDTO } from '../../types/servicio';

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(n);
}

const { Text } = Typography;

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const Servicios: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [data, setData] = useState<ServicioDTO[]>([]);
  const [filteredData, setFilteredData] = useState<ServicioDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [_searchText, setSearchText] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<string>('todos');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [detalleItem, setDetalleItem] = useState<ServicioDTO | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);

  const cargarDatos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const resultados = await servicioApi.obtenerListado(sucursalActiva);
      setData(resultados || []);
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MServicio');
    updateToolbar({});
    cargarDatos();
    return () => resetToolbar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setActiveModule, updateToolbar, resetToolbar, sucursalActiva]);

  // Filtrar datos por búsqueda y estado activo/inactivo
  const aplicarFiltros = useCallback((busqueda: string, activo: string, source: ServicioDTO[]) => {
    let result = source;
    // Filtro por activo/inactivo
    if (activo === 'activos') result = result.filter((i) => i.activo);
    else if (activo === 'inactivos') result = result.filter((i) => !i.activo);
    // Filtro por búsqueda de texto
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      result = result.filter(
        (item) =>
          item.codigo.toLowerCase().includes(q) ||
          item.nombre.toLowerCase().includes(q) ||
          (item.referenciaInterna || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, []);

  // Re-aplicar filtros cuando cambia data, searchText o filtroActivo
  useEffect(() => {
    const result = aplicarFiltros(_searchText, filtroActivo, data);
    setFilteredData(result);
    setTotal(result.length);
    setPage(1);
  }, [data, _searchText, filtroActivo, aplicarFiltros]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleFiltroActivoChange = (val: string) => {
    setFiltroActivo(val);
    setPage(1);
  };

  const handleRefresh = () => {
    setLoadingError(false);
    cargarDatos();
  };

  const abrirDetalle = async (codigo: string) => {
    try {
      const item = await servicioApi.obtenerPorCodigo(sucursalActiva, codigo);
      setDetalleItem(item);
      setDetalleOpen(true);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al obtener detalle del servicio');
    }
  };

  const columns: ColumnsType<ServicioDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (val: string) => (
        <Text strong className="paces-doc-link" onClick={() => abrirDetalle(val)}>
          {val}
        </Text>
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
      title: 'Precio',
      dataIndex: 'precio',
      key: 'precio',
      width: 130,
      align: 'right',
      render: (val: number) => (
        <Text style={{ fontFamily: 'monospace' }}>{formatCurrency(val)}</Text>
      ),
    },
    {
      title: 'Referencia',
      dataIndex: 'referenciaInterna',
      key: 'referenciaInterna',
      width: 180,
      render: (val: string) => <Text type="secondary">{val || '-'}</Text>,
    },
    {
      title: 'Familia',
      dataIndex: 'familia',
      key: 'familia',
      width: 150,
      render: (val: { nombre?: string } | null) =>
        val?.nombre ? <Tag style={{ fontSize: 11 }}>{val.nombre}</Tag> : <Text>{'-'}</Text>,
    },
    {
      title: 'Categoría',
      dataIndex: 'categoria',
      key: 'categoria',
      width: 150,
      render: (val: { nombre?: string } | null) =>
        val?.nombre ? <Tag style={{ fontSize: 11 }}>{toTitleCase(val.nombre)}</Tag> : <Text>{'-'}</Text>,
    },
    {
      title: 'Unidad Medida',
      dataIndex: 'unidadMedida',
      key: 'unidadMedida',
      width: 100,
      render: (val: { nombre?: string } | null) => (
        <Text>{val?.nombre ? toTitleCase(val.nombre) : '-'}</Text>
      ),
    },
    {
      title: 'Activo',
      dataIndex: 'activo',
      key: 'activo',
      width: 90,
      render: (activo: boolean) => (
        <Tag color={activo ? 'green' : 'red'}>{activo ? 'Activo' : 'Inactivo'}</Tag>
      ),
    },
  ];

  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

  return (
    <>
      {loadingError && (
        <Alert
          message="Error al cargar servicios"
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
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Buscar por código, nombre o referencia..."
              allowClear
              onSearch={handleSearch}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  (e.target as HTMLInputElement).blur();
                  handleSearch('');
                }
              }}
            style={{ width: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <Select
              value={filtroActivo}
              onChange={handleFiltroActivoChange}
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
            <PermissionGate accion="CREAR">
              <Button type="primary" icon={<PlusOutlined />}>Nuevo</Button>
            </PermissionGate>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
          </div>
        </div>
        <Table<ServicioDTO>
          columns={columns}
          dataSource={paginatedData}
          rowKey="codigo"
          loading={loading}
          scroll={{ x: 1200 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          locale={{
            emptyText: loading ? ' ' : <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No se encontraron servicios" /></div>,
          }}
          onRow={() => ({
            style: { cursor: 'default' },
          })}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            onChange: (newPage, newPageSize) => {
              if (newPageSize !== pageSize) {
                setPageSize(newPageSize);
                setPage(1);
              } else {
                setPage(newPage);
              }
            },
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
          }}
        />
      </Card>

      <Modal
        title={`Servicio: ${detalleItem?.codigo || ''}`}
        open={detalleOpen}
        onCancel={() => setDetalleOpen(false)}
        footer={null}
        width={600}
      >
        {detalleItem && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Código">{detalleItem.codigo}</Descriptions.Item>
            <Descriptions.Item label="Nombre">{toTitleCase(detalleItem.nombre)}</Descriptions.Item>
            <Descriptions.Item label="Precio">{formatCurrency(detalleItem.precio)}</Descriptions.Item>
            <Descriptions.Item label="Moneda">{detalleItem.moneda || 'DOP'}</Descriptions.Item>
            <Descriptions.Item label="Referencia Interna">
              {detalleItem.referenciaInterna || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Familia">
              {detalleItem.familia?.nombre || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Categoría">
              {detalleItem.categoria?.nombre || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Unidad Medida">
              {detalleItem.unidadMedida?.nombre || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Para Vender">
              {detalleItem.paraVender ? 'Sí' : 'No'}
            </Descriptions.Item>
            <Descriptions.Item label="Nota">{detalleItem.nota || '-'}</Descriptions.Item>
            <Descriptions.Item label="Activo">
              <Tag color={detalleItem.activo ? 'green' : 'red'}>
                {detalleItem.activo ? 'Activo' : 'Inactivo'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );
};

export default Servicios;
