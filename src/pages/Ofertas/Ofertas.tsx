import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Table, Card, Button, Typography, Tag, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import FechaColumnCell from '../../components/FechaColumnCell';
import { ofertaApi } from '../../api/ofertaApi';
import type { OfertaDTO } from '../../types/oferta';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';

const { Text } = Typography;

/* ───────── helpers ───────── */

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function getVigencia(item: OfertaDTO): { text: string; color: string } {
  if (!item.activo) return { text: 'Inactiva', color: 'default' };
  const hoy = new Date();
  const fechaFinal = new Date(item.fechaFinal);
  if (fechaFinal < hoy) return { text: 'Expirada', color: 'red' };
  return { text: 'Vigente', color: 'green' };
}

/* ───────── componente ───────── */

const Ofertas: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const prefijoRuta = location.pathname.startsWith('/saas') ? '/saas' : '';

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ofertas', sucursalActiva, page, pageSize, searchText],
    queryFn: async () => {
      if (sucursalActiva === undefined) return { datos: [], total: 0 };
      const salto = (page - 1) * pageSize;
      const params: { cantidad: number; salto: number; busqueda?: string } = { cantidad: pageSize, salto };
      if (searchText) params.busqueda = searchText;

      const [resultados, totalCount] = await Promise.all([
        ofertaApi.filtrar(sucursalActiva, params),
        ofertaApi.obtenerTotal(sucursalActiva, { busqueda: searchText || undefined }),
      ]);
      return { datos: resultados || [], total: totalCount ?? 0 };
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('FOfertas');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleExportarExcel = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    const dataSource = data?.datos || [];
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
      fileName: `Ofertas_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'Ofertas',
      companyName,
      columnHeaders,
      dataRows,
    });
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const abrirDetalle = (item: OfertaDTO) => {
    navigate(`${prefijoRuta}/FOfertas/${encodeURIComponent(item.codigo)}`);
  };

  /* ───────── columnas ───────── */

  const columns: ColumnsType<OfertaDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (val: string, record: OfertaDTO) => (
        <Text
          strong
          className="paces-doc-link"
          style={{ cursor: 'pointer' }}
          onClick={() => abrirDetalle(record)}
        >
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
      title: 'Fecha Inicio',
      dataIndex: 'fechaInicio',
      key: 'fechaInicio',
      width: 140,
      render: (val: string) => <FechaColumnCell fecha={val} />,
    },
    {
      title: 'Fecha Final',
      dataIndex: 'fechaFinal',
      key: 'fechaFinal',
      width: 140,
      render: (val: string) => <FechaColumnCell fecha={val} />,
    },
    {
      title: 'Vigencia',
      dataIndex: 'activo',
      key: 'vigencia',
      width: 160,
      render: (_: boolean, record: OfertaDTO) => {
        const vigencia = getVigencia(record);
        return <Tag color={vigencia.color}>{vigencia.text}</Tag>;
      },
    },
    {
      title: 'Cliente Crédito',
      dataIndex: 'aplicaClienteCredito',
      key: 'aplicaClienteCredito',
      width: 120,
      render: (val: boolean) => <Tag color="blue">{val ? 'Sí' : 'No'}</Tag>,
    },
  ];

  /* ───────── render ───────── */

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar ofertas"
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
          onReload={() => refetch()}
          onExportarExcel={handleExportarExcel}
        />

        <Table<OfertaDTO>
          columns={columns}
          dataSource={data?.datos || []}
          rowKey="codigo"
          loading={isLoading}
          scroll={{ x: 1040 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          pagination={{
            current: page,
            pageSize,
            total: data?.total || 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (t) =>
              `${t} registros`,
          }}
          locale={{
            emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {searchText
                ? <Empty description="No se encontraron ofertas para la búsqueda" />
                : <Empty description="No hay ofertas registradas" />
              }
            </div>,
          }}
        />
      </Card>
    </>
  );
};

export default Ofertas;
