import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Select, Popover, Button } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { empleadoApi, type EmpleadoDTO } from '../../api/empleadoApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import EntidadImagen from '../../components/EntidadImagen';

const { Text } = Typography;

function letraInicial(nombre: string): string {
  return (nombre || '?').charAt(0).toUpperCase();
}

const FILAS_POR_PAGINA = 25;

const Empleados: React.FC = () => {
  const navigate = useNavigate();
  const sucursal = useAuthStore((s) => s.compania);
  const setActiveModule = useUIStore((s) => s.setActiveModule);

  const [data, setData] = useState<EmpleadoDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filtroDepartamento, setFiltroDepartamento] = useState('');
  const [filtroPosicion, setFiltroPosicion] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(FILAS_POR_PAGINA);

  useEffect(() => {
    setActiveModule('MEMP');
  }, [setActiveModule]);

  const cargar = useCallback(async (pagina: number, filas: number, busqueda: string) => {
    if (!sucursal) return;
    setLoading(true);
    setLoadingError(false);
    try {
      const salto = (pagina - 1) * filas;
      const result = await empleadoApi.obtenerListado(sucursal, busqueda, filas, salto);
      setData(result.datos);
      setTotal(result.total);
    } catch {
      setLoadingError(true);
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [sucursal]);

  useEffect(() => {
    cargar(page, pageSize, searchText);
  }, [cargar, page, pageSize, searchText]);

  const handleSearch = useCallback((val: string) => {
    setSearchText(val);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((pagina: number) => {
    setPage(pagina);
  }, []);

  const handleRefresh = useCallback(() => {
    cargar(page, pageSize, searchText);
  }, [cargar, page, pageSize, searchText]);

  const columns: ColumnsType<EmpleadoDTO> = [
    {
      title: 'Empleado',
      key: 'empleado',
      width: 280,
      fixed: 'left',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <EntidadImagen
            tipo="EMPLEADO"
            codigo={record.codigo}
            fallback={letraInicial(record.nombre)}
            size={34}
          />
          <div>
            <Text strong style={{ fontSize: 13, lineHeight: 1.3 }}>
              {record.codigo}
            </Text>
            <br />
            <Text type="secondary" style={{ lineHeight: 1.3 }}>{record.nombre}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Cédula',
      key: 'identificacion',
      width: 130,
      render: (_, record) => record.identificacion || '-',
    },
    {
      title: 'Departamento',
      key: 'departamento',
      width: 160,
      render: (_, record) => record.departamento?.nombre || '-',
    },
    {
      title: 'Cargo',
      key: 'posicion',
      width: 160,
      render: (_, record) => record.posicion?.nombre || '-',
    },
  ];

  const contentFiltros = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
      <Select
        placeholder="Departamento"
        style={{ width: '100%' }}
        allowClear
        value={filtroDepartamento || undefined}
        onChange={(val) => setFiltroDepartamento(val || '')}
        onClear={() => setFiltroDepartamento('')}
      />
      <Select
        placeholder="Cargo"
        style={{ width: '100%' }}
        allowClear
        value={filtroPosicion || undefined}
        onChange={(val) => setFiltroPosicion(val || '')}
        onClear={() => setFiltroPosicion('')}
      />
      <Select
        placeholder="Estado"
        style={{ width: '100%' }}
        allowClear
        value={filtroActivo || undefined}
        onChange={(val) => setFiltroActivo(val || '')}
        onClear={() => setFiltroActivo('')}
        options={[
          { value: 'activos', label: 'Solo activos' },
          { value: 'inactivos', label: 'Solo inactivos' },
        ]}
      />
    </div>
  );

  return (
    <DocumentListadoLayout<EmpleadoDTO>
      columns={columns}
      data={data}
      rowKey="codigo"
      loading={loading}
      total={total}
      page={page}
      pageSize={pageSize}
      scrollX={800}
      loadingError={loadingError}
      errorMessage="Error al cargar empleados"
      onRefresh={handleRefresh}
      onRowClick={(record) => navigate(`/MEMP/${record.codigo}`)}
      onPageChange={handlePageChange}
      pdfPreview={null}
      onPdfClose={() => {}}
      toolbarProps={{
        searchPlaceholder: 'Buscar empleado...',
        onSearch: handleSearch,
        pageSize,
        onPageSizeChange: (v) => { setPageSize(v); setPage(1); },
        onRefresh: handleRefresh,
        extraLeft: (
          <Popover title="Filtros" trigger="click" placement="bottomLeft" content={contentFiltros}>
            <Button icon={<FilterOutlined />}>Filtros</Button>
          </Popover>
        ),
      }}
    />
  );
};

export default Empleados;
