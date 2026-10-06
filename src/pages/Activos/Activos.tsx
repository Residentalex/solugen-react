import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Alert, Card, Table, Button, Typography, Empty, Tag} from 'antd';
import { Select } from '../../components/Select';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { activoApi } from '../../api/activoApi';
import { formatCurrency, formatDate, formatNumber, toTitleCase } from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import type { ActivoDTO } from '../../types/activo';

const { Text } = Typography;

const Activos: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [retirado, setRetirado] = useState('F');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['activos', page, pageSize, searchText, retirado],
    queryFn: async () => {
      const salto = (page - 1) * pageSize;
      const result = await activoApi.filtrar({
        cantidad: pageSize,
        salto,
        busqueda: searchText || undefined,
        retirado,
      });
      return { datos: result.items, total: result.total };
    },
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('mActivos');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleExportarExcel = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    const dataSource = data?.datos || [];
    exportToExcel({
      fileName: `Activos_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'Activos',
      companyName,
      columnHeaders: [
        'Código', 'Descripción', 'Fecha Adq.', 'Clasificación', 'Tipo', 'Ubicación',
        'Valor Adq.', 'Dep. Acum.', 'Vida Útil', 'Retirado',
      ],
      dataRows: dataSource.map((a) => [
        a.codigo,
        a.descripcion,
        a.fechaAdq ? formatDate(a.fechaAdq) : '',
        a.clasificacionDesc,
        a.tipoDesc,
        a.ubicacionDesc,
        a.valorAdq,
        a.deprAcum,
        a.vidaUtil,
        a.retirado ? 'Retirado' : 'Activo',
      ]),
    });
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const columns: ColumnsType<ActivoDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (val: string, record: ActivoDTO) => (
        <Text
          strong
          className="paces-doc-link"
          style={{ fontFamily: 'monospace', cursor: 'pointer' }}
          onClick={() => navigate(`/mactivos/${record.id}`)}
        >
          {val || '-'}
        </Text>
      ),
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      ellipsis: true,
      render: (val: string) => <Text>{toTitleCase(val ?? '')}</Text>,
    },
    {
      title: 'Fecha Adq.',
      dataIndex: 'fechaAdq',
      key: 'fechaAdq',
      width: 120,
      render: (val: string) => <Text>{val ? formatDate(val) : '-'}</Text>,
    },
    {
      title: 'Clasificación',
      dataIndex: 'clasificacionDesc',
      key: 'clasificacionDesc',
      width: 180,
      ellipsis: true,
      render: (val: string) => <Text>{toTitleCase(val ?? '')}</Text>,
    },
    {
      title: 'Tipo',
      dataIndex: 'tipoDesc',
      key: 'tipoDesc',
      width: 160,
      ellipsis: true,
      render: (val: string) => <Text>{toTitleCase(val ?? '')}</Text>,
    },
    {
      title: 'Ubicación',
      dataIndex: 'ubicacionDesc',
      key: 'ubicacionDesc',
      width: 160,
      ellipsis: true,
      render: (val: string) => <Text>{toTitleCase(val ?? '')}</Text>,
    },
    {
      title: 'Valor Adq.',
      dataIndex: 'valorAdq',
      key: 'valorAdq',
      width: 150,
      align: 'right',
      render: (val: number) => <Text strong className="paces-text-total">{formatCurrency(val)}</Text>,
    },
    {
      title: 'Dep. Acum.',
      dataIndex: 'deprAcum',
      key: 'deprAcum',
      width: 150,
      align: 'right',
      render: (val: number) => <Text>{formatCurrency(val)}</Text>,
    },
    {
      title: 'Vida Útil',
      dataIndex: 'vidaUtil',
      key: 'vidaUtil',
      width: 110,
      align: 'right',
      render: (val: number) => <Text>{formatNumber(val)}</Text>,
    },
    {
      title: 'Retirado',
      dataIndex: 'retirado',
      key: 'retirado',
      width: 110,
      render: (val: boolean) =>
        val ? <Tag color="red">Retirado</Tag> : <Tag color="green">Activo</Tag>,
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar activos fijos"
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
          maxLength={100}
          pageSize={pageSize}
          onPageSizeChange={(v) => {
            setPageSize(v);
            setPage(1);
          }}
          filtros={
            <Select
              value={retirado}
              onChange={(v) => {
                setRetirado(v);
                setPage(1);
              }}
              style={{ width: 150 }}
              options={[
                { value: 'F', label: 'Activos' },
                { value: 'T', label: 'Retirados' },
                { value: '', label: 'Todos' },
              ]}
            />
          }
          onNuevo={() => navigate('/mactivos/nuevo')}
          onReload={() => refetch()}
          onExportarExcel={handleExportarExcel}
        />
        <Table<ActivoDTO>
          columns={columns}
          dataSource={data?.datos || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1200 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          pagination={{
            current: page,
            pageSize,
            total: data?.total || 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
          }}
          locale={{
            emptyText: (
              <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {searchText
                  ? <Empty description="Sin resultados para la búsqueda" />
                  : <Empty description="No hay activos fijos configurados" />
                }
              </div>
            ),
          }}
        />
      </Card>
    </>
  );
};

export default Activos;
