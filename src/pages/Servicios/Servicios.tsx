import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Select, Tag, Button, message, Card, Typography, Modal, Descriptions, Alert, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { servicioApi } from '../../api/servicioApi';
import type { ServicioDTO } from '../../types/servicio';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

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
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [searchText, setSearchText] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<string>('todos');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [detalleItem, setDetalleItem] = useState<ServicioDTO | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);

  const soloActivos = filtroActivo === 'activos' ? true : filtroActivo === 'inactivos' ? false : undefined;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['servicios', sucursalActiva, page, pageSize, searchText, filtroActivo],
    queryFn: async () => {
      if (sucursalActiva === undefined) return { datos: [], total: 0 };
      const salto = (page - 1) * pageSize;
      const params: { cantidad: number; salto: number; busqueda?: string; activo?: boolean } = { cantidad: pageSize, salto };
      if (searchText) params.busqueda = searchText;
      if (soloActivos !== undefined) params.activo = soloActivos;

      const [resultados, totalCount] = await Promise.all([
        servicioApi.filtrar(sucursalActiva, params),
        servicioApi.obtenerTotal(sucursalActiva, { busqueda: searchText || undefined, activo: soloActivos }),
      ]);
      return { datos: resultados || [], total: totalCount ?? 0 };
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MServicio');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleFiltroActivoChange = (val: string) => {
    setFiltroActivo(val);
    setPage(1);
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

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar servicios"
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
          onNuevo={() => navigate('/MServicio/nuevo')}
          onReload={() => refetch()}
          filtros={
            <Select
              value={filtroActivo}
              onChange={handleFiltroActivoChange}
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
        />
        <Table<ServicioDTO>
          columns={columns}
          dataSource={data?.datos || []}
          rowKey="codigo"
          loading={isLoading}
          scroll={{ x: 1200 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          locale={{
            emptyText: isLoading ? ' ' : <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No se encontraron servicios" /></div>,
          }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: data?.total || 0,
            onChange: (p) => setPage(p),
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
