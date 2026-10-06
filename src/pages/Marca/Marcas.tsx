import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Table, Card, Button, Typography, Alert, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { marcaApi } from '../../api/marcaApi';
import { proveedorApi } from '../../api/proveedorApi';
import type { MarcaDTO } from '../../types/marca';
import type { SuplidorDTO } from '../../types/entradaAlmacen';
import { toTitleCase } from '../../utils/formats';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';

const { Text } = Typography;

const Marcas: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['marcas', sucursalActiva, page, pageSize, searchText],
    queryFn: async () => {
      if (sucursalActiva === undefined) return { items: [], total: 0 };
      const salto = (page - 1) * pageSize;
      const params: { cantidad: number; salto: number; busqueda?: string } = { cantidad: pageSize, salto };
      if (searchText) params.busqueda = searchText;

      return await marcaApi.filtrar(sucursalActiva, params);
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedoresParaMarca', sucursalActiva],
    queryFn: async (): Promise<SuplidorDTO[]> => {
      if (sucursalActiva === undefined) return [];
      return (await proveedorApi.obtenerListado(sucursalActiva)) || [];
    },
    enabled: sucursalActiva !== undefined,
  });

  useEffect(() => {
    setActiveModule('MMarca');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const nombreProveedor = (codigo?: string): string => {
    if (!codigo) return '-';
    const proveedor = proveedores.find((p) => p.codigo === codigo || p.idExterno === codigo);
    return proveedor?.nombre || codigo;
  };

  const handleExportarExcel = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    const dataSource = data?.items || [];
    const exportCols = columns.filter((col: any) => col.title && col.title !== '' && col.title !== 'Acciones');
    const columnHeaders = exportCols.map((col: any) => col.title);
    const dataRows = dataSource.map((item: any) =>
      exportCols.map((col: any) => {
        if (col.key === 'proveedor') return nombreProveedor(item.proveedor);
        if (col.dataIndex) {
          const val = item[col.dataIndex];
          return val != null ? String(val) : '';
        }
        return '';
      })
    );
    exportToExcel({
      fileName: `Marcas_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'Marcas',
      companyName,
      columnHeaders,
      dataRows,
    });
  };

  const handleSearch = (value: string) => {
    setPage(1);
    setSearchText(value);
  };

  const columns: ColumnsType<MarcaDTO> = [
    {
      title: 'Código',
      dataIndex: 'idExterno',
      key: 'idExterno',
      width: 130,
      fixed: 'left',
      render: (val: string) =>
        val ? (
          <Text
            strong
            className="paces-doc-link"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/MMarca/${encodeURIComponent(val)}/editar`)}
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
      title: 'Proveedor',
      dataIndex: 'proveedor',
      key: 'proveedor',
      width: 240,
      render: (val: string) => <Text>{nombreProveedor(val)}</Text>,
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar marcas"
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
          onNuevo={() => navigate('/MMarca/nuevo')}
          onReload={() => refetch()}
          onExportarExcel={handleExportarExcel}
        />
        <Table<MarcaDTO>
          columns={columns}
          dataSource={data?.items || []}
          rowKey={(r, index) => `${r.idExterno || 'sin-id'}-${index ?? 0}`}
          loading={isLoading}
          scroll={{ x: 650 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          locale={{
            emptyText: (
              <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description="No hay marcas registradas" />
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

export default Marcas;
