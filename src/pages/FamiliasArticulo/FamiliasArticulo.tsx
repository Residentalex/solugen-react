import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Table, Card, Button, Typography, Alert, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { familiaArticuloApi } from '../../api/familiaArticuloApi';
import { toTitleCase } from '../../utils/formats';
import type { FamiliaArticuloDTO } from '../../types/productos';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const { Text } = Typography;

const FamiliasArticulo: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['familiasArticulo', sucursalActiva, page, pageSize, searchText],
    queryFn: async () => {
      if (sucursalActiva === undefined) return { datos: [], total: 0 };
      const salto = (page - 1) * pageSize;
      const params: { cantidad: number; salto: number; busqueda?: string } = { cantidad: pageSize, salto };
      if (searchText) params.busqueda = searchText;

      const { items, total } = await familiaArticuloApi.filtrar(sucursalActiva, params);
      return { datos: items, total };
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MFamilia');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setPage(1);
    setSearchText(value);
  };

  const columns: ColumnsType<FamiliaArticuloDTO> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 200,
      fixed: 'left',
      render: (val: string) => <Text strong>{toTitleCase(val ?? '')}</Text>,
    },
    {
      title: 'ID Externo',
      dataIndex: 'idExterno',
      key: 'idExterno',
      width: 120,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Aumento Precio Máx.',
      dataIndex: 'aumentoPrecioMaximo',
      key: 'aumentoPrecioMaximo',
      width: 160,
      align: 'right',
      render: (val: number) => <Text>{(val ?? 0).toLocaleString()}</Text>,
    },
    {
      title: 'Cuenta Costo Venta',
      dataIndex: 'cuentaCostoVenta',
      key: 'cuentaCostoVenta',
      width: 150,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Cuenta Ingresos Venta',
      dataIndex: 'cuentaIngresosVenta',
      key: 'cuentaIngresosVenta',
      width: 150,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Cuenta Descuento Venta',
      dataIndex: 'cuentaDescuentoVenta',
      key: 'cuentaDescuentoVenta',
      width: 160,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Cuenta Devolución Venta',
      dataIndex: 'cuentaDeVolucionVenta',
      key: 'cuentaDeVolucionVenta',
      width: 170,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Cuenta Costo Compra',
      dataIndex: 'cuentaCostoCompra',
      key: 'cuentaCostoCompra',
      width: 150,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Cuenta Devolución Compra',
      dataIndex: 'cuentaDevolucionCompra',
      key: 'cuentaDevolucionCompra',
      width: 170,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          title="Error al cargar familias de artículos"
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
            onNuevo={() => navigate('/MFamilia/nuevo')}
            onReload={() => refetch()}
          />
      <Table<FamiliaArticuloDTO>
        columns={columns}
        dataSource={data?.datos || []}
        rowKey={(r) => r.idExterno || r.nombre || ''}
        loading={isLoading}
        scroll={{ x: 1450 }}
        size="middle"
        rowClassName="paces-row-hover"
        className="paces-border-top paces-list-table"
        locale={{
          emptyText: <div style={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Empty description="No hay familias de artículo registradas" />
          </div>,
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

export default FamiliasArticulo;