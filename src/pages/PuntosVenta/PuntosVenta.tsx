import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Table, Button, Empty, Modal, Descriptions, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { puntoVentaApi } from '../../api/puntoVentaApi';
import type { PuntoVentaDTO } from '../../types/facturacion';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const { Text } = Typography;

const PuntosVenta: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [detalleItem, setDetalleItem] = useState<PuntoVentaDTO | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['puntosVenta', sucursalActiva, page, pageSize, searchText],
    queryFn: async () => {
      if (sucursalActiva === undefined) return { datos: [], total: 0 };
      const salto = (page - 1) * pageSize;
      const params: { cantidad: number; salto: number; busqueda?: string } = { cantidad: pageSize, salto };
      if (searchText) params.busqueda = searchText;

      const [resultados, totalCount] = await Promise.all([
        puntoVentaApi.filtrarPuntosVenta(sucursalActiva, params),
        puntoVentaApi.obtenerTotalPuntosVenta(sucursalActiva, { busqueda: searchText || undefined }),
      ]);
      return { datos: resultados || [], total: totalCount ?? 0 };
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MPOS');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const abrirDetalle = (item: PuntoVentaDTO) => {
    setDetalleItem(item);
    setDetalleVisible(true);
  };

  const columns: ColumnsType<PuntoVentaDTO> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (val: string, record: PuntoVentaDTO) => (
        <Text strong className="paces-doc-link" style={{ cursor: 'pointer' }} onClick={() => abrirDetalle(record)}>
          {toTitleCase(val ?? '')}
        </Text>
      ),
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 180,
      render: (val: string) => <Text style={{ fontFamily: 'monospace' }}>{val || '-'}</Text>,
    },
    {
      title: 'Ruta',
      dataIndex: 'ruta',
      key: 'ruta',
      width: 280,
      render: (val: string) => <Text type="secondary" style={{ fontFamily: 'monospace' }}>{val || '-'}</Text>,
    },
  ];

  return (
    <><Card
      className="paces-card-erp"
      style={{ borderRadius: 8, overflow: 'hidden' }}
      styles={{ body: { padding: 0 } }}
    >
      <CatalogoListadoToolbar
          onSearch={handleSearch}
          pageSize={pageSize}
          onPageSizeChange={(v) => { setPageSize(v); setPage(1); }}
          onReload={() => refetch()}
        />

      <Table<PuntoVentaDTO>
        columns={columns}
        dataSource={data?.datos || []}
        rowKey="nombre"
        loading={isLoading}
        scroll={{ x: 600 }}
        size="middle"
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
          emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {searchText
              ? <Empty description="Sin resultados para la búsqueda" />
              : <Empty description="No hay puntos de venta configurados" />
            }
          </div>
        }}
      />
      </Card>

      <Modal
        title={`Detalle: ${detalleItem?.nombre || ''}`}
        open={detalleVisible}
        onCancel={() => setDetalleVisible(false)}
        footer={null}
        width={520}
      >
        {detalleItem && (
          <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="Nombre">{toTitleCase(detalleItem.nombre ?? '')}</Descriptions.Item>
            <Descriptions.Item label="IP">{detalleItem.ip || '-'}</Descriptions.Item>
            <Descriptions.Item label="Ruta">{detalleItem.ruta || '-'}</Descriptions.Item>
            <Descriptions.Item label="ID Externo">{detalleItem.idExterno || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );
};

export default PuntosVenta;
