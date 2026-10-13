import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Table, Card, Button, Typography, Alert, Input, Spin } from 'antd';
import { Select } from '../../components/Select';
import { SearchOutlined, ReloadOutlined, PlusOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { posicionApi } from '../../api/posicionApi';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import { toTitleCase } from '../../utils/formats';
import PermissionGate from '../../components/PermissionGate';

const { Text } = Typography;

const Posiciones: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['posiciones', sucursalActiva, page, pageSize, searchText],
    queryFn: async () => {
      if (sucursalActiva === undefined) return { datos: [], total: 0 };
      const salto = (page - 1) * pageSize;
      const params: { cantidad: number; salto: number; busqueda?: string } = { cantidad: pageSize, salto };
      if (searchText) params.busqueda = searchText;
      return await posicionApi.filtrar(sucursalActiva, params);
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  const datos = React.useMemo(() => data?.datos ?? [], [data?.datos]);

  useEffect(() => {
    setActiveModule('MPosicion');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleExportarExcel = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    const exportCols = columns.filter((col: any) => col.title && col.title !== '' && col.title !== 'Acciones');
    const columnHeaders = exportCols.map((col: any) => col.title);
    const dataRows = datos.map((item: any) =>
      exportCols.map((col: any) => {
        if (col.dataIndex) {
          const val = item[col.dataIndex];
          return val != null ? String(val) : '';
        }
        return '';
      })
    );
    exportToExcel({
      fileName: `Posiciones_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'Posiciones',
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
            onClick={() => navigate(`/MPosicion/${encodeURIComponent(val)}/editar`)}
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
      title: 'Departamento',
      dataIndex: 'departamento',
      key: 'departamento',
      width: 280,
      render: (val: string) => <Text>{toTitleCase(val ?? '') || '-'}</Text>,
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar posiciones"
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
            <Input.Search placeholder="Buscar..." allowClear onSearch={handleSearch} style={{ width: '100%', maxWidth: 400 }} prefix={<SearchOutlined className="paces-text-icon" />} />
            <div style={{ flex: 1 }} />
            <PermissionGate accion="CREAR">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/MPosicion/nuevo')}>Nuevo</Button>
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
                  {datos.length} posicion{datos.length !== 1 ? 'es' : ''}
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
                dataSource={datos}
                rowKey="codigo"
                pagination={{ pageSize, total: datos.length, showTotal: (t) => `${t} registros` }}
              />
            </>
          )}
        </div>
      </Card>
    </>
  );
};

export default Posiciones;
