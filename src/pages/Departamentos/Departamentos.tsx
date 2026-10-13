import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Table, Card, Button, Typography, Alert, Empty, Switch, Input, Select, Spin } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { departamentoApi } from '../../api/departamentoApi';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import { toTitleCase } from '../../utils/formats';
import PermissionGate from '../../components/PermissionGate';

const { Text } = Typography;

const Departamentos: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [activoFilter, setActivoFilter] = useState<string>('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['departamentos', sucursalActiva, page, pageSize, searchText, activoFilter],
    queryFn: async () => {
      if (sucursalActiva === undefined) return { datos: [], total: 0 };
      const salto = (page - 1) * pageSize;
      const params: { cantidad: number; salto: number; busqueda?: string } = { cantidad: pageSize, salto };
      if (searchText) params.busqueda = searchText;
      const result = await departamentoApi.filtrar(sucursalActiva, params);
      return result;
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  const filteredData = React.useMemo(() => {
    if (!data?.datos) return [];
    if (activoFilter === '') return data.datos;
    const activoBool = activoFilter === 'true';
    return data.datos.filter((d: any) => d.activo === activoBool);
  }, [data?.datos, activoFilter]);

  useEffect(() => {
    setActiveModule('MDepto');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleExportarExcel = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    const dataSource = filteredData;
    const exportCols = columns.filter((col: any) => col.title && col.title !== '' && col.title !== 'Acciones');
    const columnHeaders = exportCols.map((col: any) => col.title);
    const dataRows = dataSource.map((item: any) =>
      exportCols.map((col: any) => {
        if (col.dataIndex) {
          const val = item[col.dataIndex];
          return val != null ? String(val) : '';
        }
        return '';
      })
    );
    exportToExcel({
      fileName: `Departamentos_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'Departamentos',
      companyName,
      columnHeaders,
      dataRows,
    });
  };

  const handleSearch = (value: string) => {
    setPage(1);
    setSearchText(value);
  };

  const handlePageSizeChange = (value: string) => {
    setPage(1);
    setPageSize(Number(value));
  };

  const columns: ColumnsType<any> = [
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
            onClick={() => navigate(`/MDepto/${encodeURIComponent(val)}/editar`)}
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

  ];

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar departamentos"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => refetch()}>Reintentar</Button>
          }
        />
      )}
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text type="secondary">Estado:</Text>
              <Select style={{ width: 120 }} value={activoFilter} onChange={setActivoFilter} options={[
                { label: 'Todos', value: '' },
                { label: 'Activos', value: 'true' },
                { label: 'Inactivos', value: 'false' },
              ]} showSearch />
            </div>
            <Input.Search placeholder="Buscar..." allowClear onSearch={handleSearch} style={{ width: '100%', maxWidth: 400 }} prefix={<SearchOutlined className="paces-text-icon" />} />
            <div style={{ flex: 1 }} />
            <PermissionGate accion="CREAR">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/MDepto/nuevo')}>Nuevo</Button>
            </PermissionGate>
            <Button icon={<ReloadOutlined />} onClick={refetch} />
            <Button icon={<FileExcelOutlined />} onClick={handleExportarExcel} />
          </div>
        </div>
        <div style={{ padding: '0 24px 24px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
          ) : (
            <>
              <div style={{ padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {filteredData.length} departamento{filteredData.length !== 1 ? 's' : ''}
                </Text>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Select style={{ width: 60 }} value={pageSize.toString()} onChange={handlePageSizeChange}>
                    <Select.Option value="10">10</Select.Option>
                    <Select.Option value="25">25</Select.Option>
                    <Select.Option value="50">50</Select.Option>
                    <Select.Option value="100">100</Select.Option>
                  </Select>
                </div>
              </div>
              <Table
                className="paces-border-top paces-list-table"
                columns={columns}
                dataSource={filteredData}
                rowKey="codigo"
                pagination={{ pageSize, total: filteredData.length, showTotal: (t) => `${t} registros` }}
              />
            </>
          )}
        </div>
      </Card>
    </>
  );
};

export default Departamentos;
