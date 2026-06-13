import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Table, Card, Input, Tag, Button, Typography, message, Space, Alert, Empty
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { conceptosApi } from '../../api/conceptosApi';
import type { ConceptoDTO } from '../../types/entradaAlmacen';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const { Text } = Typography;

const toTitleCase = (str: string): string =>
  str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const Conceptos: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['conceptos', sucursalActiva, searchText],
    queryFn: async () => {
      if (sucursalActiva === undefined) return [];
      const filtro = searchText || undefined;
      const result = await conceptosApi.obtenerConceptos(sucursalActiva, filtro);
      return result || [];
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MConcepto');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setPage(1);
    setSearchText(value);
  };

  const paginatedData = useMemo(() => {
    if (!data) return [];
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  const columns: ColumnsType<ConceptoDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (val: string, record: ConceptoDTO) => (
        <Text
          style={{ fontFamily: 'monospace', cursor: 'pointer', color: '#556ee6' }}
          onClick={() => navigate(`/MConcepto/${record.codigo}`)}
        >
          {val}
        </Text>
      ),
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      ellipsis: true,
      render: (val: string) => <Text strong ellipsis>{toTitleCase(val ?? '')}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      width: 90,
      align: 'center',
      render: (val: boolean | undefined) => (
        <Tag color={val ? 'green' : 'default'}>{val ? 'Activo' : 'Inactivo'}</Tag>
      ),
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          title="Error al cargar conceptos"
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
        styles={{ body: { padding: 0 } }}
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
      >
        <CatalogoListadoToolbar
          onSearch={handleSearch}
          pageSize={pageSize}
          onPageSizeChange={(v) => { setPageSize(v); }}
          onNuevo={() => navigate('/MConcepto/nuevo')}
          onReload={() => refetch()}
        />
        <Table
          columns={columns}
          dataSource={paginatedData}
          rowKey="codigo"
          loading={isLoading}
          scroll={{ x: 700 }}
          size="middle"
          pagination={{
            current: page,
            pageSize,
            total: data?.length || 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
          }}
          locale={{
            emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No hay conceptos registrados" /></div>,
          }}
          className="paces-border-top paces-list-table"
        />
      </Card>
    </>
  );
};

export default Conceptos;
