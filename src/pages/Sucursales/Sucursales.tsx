import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Table, Card, Button, Typography, Alert, Empty, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { sucursalApi } from '../../api/sucursalApi';
import type { SucursalCatalogoDTO } from '../../types/sucursal';
import { toTitleCase } from '../../utils/formats';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';

const { Text } = Typography;

const Sucursales: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['sucursales', page, pageSize, searchText],
    queryFn: async () => {
      const salto = (page - 1) * pageSize;
      const params: { cantidad: number; salto: number; busqueda?: string } = { cantidad: pageSize, salto };
      if (searchText) params.busqueda = searchText;

      return await sucursalApi.filtrar(params);
    },
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MSucursal');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleExportarExcel = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    const dataSource = data?.items || [];
    const exportCols = columns.filter((col: any) => col.title && col.title !== '' && col.title !== 'Acciones');
    const columnHeaders = exportCols.map((col: any) => col.title);
    const dataRows = dataSource.map((item: any) =>
      exportCols.map((col: any) => {
        if (col.key === 'activo') return item.activo ? 'Activa' : 'Inactiva';
        if (col.dataIndex) {
          const val = item[col.dataIndex];
          return val != null ? String(val) : '';
        }
        return '';
      })
    );
    exportToExcel({
      fileName: `Sucursales_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'Sucursales',
      companyName,
      columnHeaders,
      dataRows,
    });
  };

  const handleSearch = (value: string) => {
    setPage(1);
    setSearchText(value);
  };

  const columns: ColumnsType<SucursalCatalogoDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 130,
      fixed: 'left',
      render: (val: string) =>
        val ? (
          <Text
            strong
            className="paces-doc-link"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/MSucursal/${encodeURIComponent(val)}/editar`)}
          >
            {val}
          </Text>
        ) : (
          <Text>-</Text>
        ),
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 280,
      render: (val: string) => <Text strong>{toTitleCase(val ?? '')}</Text>,
    },
    {
      title: 'Dirección',
      dataIndex: 'direccion',
      key: 'direccion',
      width: 240,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Gerente',
      dataIndex: 'gerente',
      key: 'gerente',
      width: 200,
      render: (val: string) => <Text>{val ? toTitleCase(val) : '-'}</Text>,
    },
    {
      title: 'Activo',
      dataIndex: 'activo',
      key: 'activo',
      width: 100,
      render: (val: boolean) => (
        <Tag color={val ? 'green' : 'default'}>{val ? 'Activa' : 'Inactiva'}</Tag>
      ),
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar sucursales"
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
          onPageSizeChange={(v) => {
            setPageSize(v);
            setPage(1);
          }}
          onNuevo={() => navigate('/MSucursal/nuevo')}
          onReload={() => refetch()}
          onExportarExcel={handleExportarExcel}
        />
        <Table<SucursalCatalogoDTO>
          columns={columns}
          dataSource={data?.items || []}
          rowKey={(r, index) => `${r.codigo || 'sin-id'}-${index ?? 0}`}
          loading={isLoading}
          scroll={{ x: 950 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          locale={{
            emptyText: (
              <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description="No hay sucursales registradas" />
              </div>
            ),
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

export default Sucursales;
