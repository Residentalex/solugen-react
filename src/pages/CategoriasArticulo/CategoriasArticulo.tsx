import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { useNavigate } from 'react-router-dom';
import { Alert, Table, Card, Button, Typography, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import PermissionGate from '../../components/PermissionGate';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { categoriaArticuloApi } from '../../api/categoriaArticuloApi';
import { toTitleCase } from '../../utils/formats';
import type { CategoriaArticuloDTO } from '../../types/productos';

const { Text } = Typography;

const CategoriasArticulo: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['categoriasArticulo', sucursalActiva],
    queryFn: async () => {
      if (sucursalActiva === undefined) return [];
      const result = await categoriaArticuloApi.obtenerListado(sucursalActiva);
      return result || [];
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MCategoria');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setPage(1);
    setSearchText(value);
  };

  const filteredData = useMemo(() => {
    const list = data || [];
    if (!searchText) return list;
    const lower = searchText.toLowerCase();
    return list.filter(
      (item) =>
        item.codigo?.toLowerCase().includes(lower) ||
        item.nombre?.toLowerCase().includes(lower)
    );
  }, [data, searchText]);

  const paginatedData = useMemo(() => {
    if (!filteredData) return [];
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const columns: ColumnsType<CategoriaArticuloDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (val: string) => <Text strong>{val || '-'}</Text>,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 280,
      render: (val: string) => <Text>{toTitleCase(val ?? '')}</Text>,
    },
    {
      title: 'Grupo',
      key: 'grupo',
      width: 200,
      render: (_: any, record: CategoriaArticuloDTO) => (
        <Text>{record.grupo?.nombre ? toTitleCase(record.grupo.nombre) : '-'}</Text>
      ),
    },
    {
      title: 'Control',
      key: 'control',
      width: 200,
      render: (_: any, record: CategoriaArticuloDTO) => (
        <Text>{record.control?.nombre ? toTitleCase(record.control.nombre) : '-'}</Text>
      ),
    },
    {
      title: 'ID Externo',
      dataIndex: 'idExterno',
      key: 'idExterno',
      width: 120,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
  ];

  return (<>
    {isError && (
      <Alert
        message="Error al cargar categorías de artículo"
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
            onPageSizeChange={(v) => { setPageSize(v); }}
            onNuevo={() => navigate('/MCategoria/nuevo')}
            onReload={() => refetch()}
          />
      <Table<CategoriaArticuloDTO>
        columns={columns}
        dataSource={paginatedData}
        rowKey={(r) => r.codigo || r.nombre || ''}
        loading={isLoading}
        scroll={{ x: 900 }}
        size="middle"
        rowClassName="paces-row-hover"
        className="paces-border-top paces-list-table"
        locale={{
          emptyText: <div style={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Empty description="No hay categorías de artículo registradas" />
          </div>,
        }}
          pagination={{
            current: page,
            pageSize,
            total: filteredData?.length || 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
        }}
      />
    </Card>
    </>
  );
};

export default CategoriasArticulo;
