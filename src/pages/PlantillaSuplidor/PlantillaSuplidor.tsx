import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Table, Card, Input, Button, Typography, Alert, Space, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { plantillaSuplidorApi } from '../../api/plantillaSuplidorApi';
import PermissionGate from '../../components/PermissionGate';
import type { PlantillaSuplidorDTO } from '../../types/plantillaSuplidor';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const { Text } = Typography;

const FILAS_POR_PAGINA = 25;

function formatDate(val: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const PlantillaSuplidor: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setNuevoCallback = useUIStore((s) => s.setNuevoCallback);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(FILAS_POR_PAGINA);
  const [searchText, setSearchText] = useState('');
  const [selectedRow, setSelectedRow] = useState<PlantillaSuplidorDTO | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['plantillaSuplidor', sucursalActiva, searchText],
    queryFn: async () => {
      const resultados = await plantillaSuplidorApi.obtenerTodo(sucursalActiva);

      let filtrados = resultados;
      if (searchText.length > 0) {
        const q = searchText.toLowerCase();
        filtrados = resultados.filter(
          (r) =>
            (r.numero || '').toLowerCase().includes(q) ||
            (r.nombreSuplidor || '').toLowerCase().includes(q) ||
            (r.fecha || '').toLowerCase().includes(q)
        );
      }

      return filtrados;
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('mplantillasup');
    setNuevoCallback(() => navigate('/mplantillasup/nuevo'));
    return () => {
      resetToolbar();
      setNuevoCallback(undefined);
    };
  }, [setActiveModule, resetToolbar, setNuevoCallback, navigate]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleTableChange = (pagination: any) => {
    setPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const handleRowClick = (record: PlantillaSuplidorDTO) => {
    setSelectedRow(record);
  };

  const columns: ColumnsType<PlantillaSuplidorDTO> = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 120,
      render: (f: string) => <Text>{formatDate(f)}</Text>,
    },
    {
      title: 'Número',
      dataIndex: 'numero',
      key: 'numero',
      width: 160,
      render: (num: string, record: PlantillaSuplidorDTO) => (
        <Link to={`/mplantillasup/${record.id}`} className="paces-doc-link">
          <Text strong>{num}</Text>
        </Link>
      ),
    },
    {
      title: 'Suplidor',
      dataIndex: 'nombreSuplidor',
      key: 'nombreSuplidor',
      ellipsis: true,
      render: (nombre: string) => (
        <Text>{toTitleCase(nombre) || ''}</Text>
      ),
    },
  ];

  const paginatedData = useMemo(() => {
    const list = data || [];
    return list.slice((page - 1) * pageSize, page * pageSize);
  }, [data, page, pageSize]);

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar plantillas de suplidores"
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
          pageSize={25}
          onPageSizeChange={(v) => {}}
          ocultarPageSize
          onNuevo={() => navigate('/mplantillasup/nuevo')}
          onReload={() => refetch()}
        />

        <Table<PlantillaSuplidorDTO>
          columns={columns}
          dataSource={paginatedData}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 600 }}
          size="middle"
          rowClassName={(record) =>
            selectedRow?.id === record.id ? 'paces-row-selected' : 'paces-row-hover'
          }
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: { cursor: 'pointer' },
          })}
          onChange={handleTableChange}
          pagination={{
            current: page,
            pageSize,
            total: (data || []).length,
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
          }}
          locale={{
            emptyText: <div style={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Empty description="No hay plantillas de suplidor registradas" />
            </div>,
          }}
          className="paces-border-top paces-list-table"
        />
      </Card>
    </>
  );
};

export default PlantillaSuplidor;
