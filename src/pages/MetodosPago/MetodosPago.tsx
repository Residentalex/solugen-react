import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Table, Button, Tag, Typography, Empty, Modal, Descriptions, Alert } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { puntoVentaApi } from '../../api/puntoVentaApi';
import type { MetodoPagoDTO } from '../../types/facturacion';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const { Text } = Typography;

const MetodosPago: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [detalleItem, setDetalleItem] = useState<MetodoPagoDTO | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['metodosPago', sucursalActiva, page, pageSize, searchText],
    queryFn: async () => {
      if (sucursalActiva === undefined) return { datos: [], total: 0 };
      const salto = (page - 1) * pageSize;
      const params: { cantidad: number; salto: number; busqueda?: string } = { cantidad: pageSize, salto };
      if (searchText) params.busqueda = searchText;

      const [resultados, totalCount] = await Promise.all([
        puntoVentaApi.filtrarMetodosPago(sucursalActiva, params),
        puntoVentaApi.obtenerTotalMetodosPago(sucursalActiva, { busqueda: searchText || undefined }),
      ]);
      return { datos: resultados || [], total: totalCount ?? 0 };
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MMetodosPago');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const abrirDetalle = (item: MetodoPagoDTO) => {
    setDetalleItem(item);
    setDetalleVisible(true);
  };

  const columns: ColumnsType<MetodoPagoDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      render: (val: string, record: MetodoPagoDTO) => (
        <Text
          strong
          className="paces-doc-link"
          style={{ fontFamily: 'monospace', cursor: 'pointer' }}
          onClick={() => abrirDetalle(record)}
        >
          {val || '-'}
        </Text>
      ),
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (val: string) => <Text strong>{toTitleCase(val ?? '')}</Text>,
    },
    {
      title: 'Requiere Documento',
      dataIndex: 'requiereDocumento',
      key: 'requiereDocumento',
      width: 160,
      render: (val: boolean) => (
        <Tag color={val ? 'blue' : 'default'}>{val ? 'SÃ­' : 'No'}</Tag>
      ),
    },
    {
      title: 'Documento',
      dataIndex: 'codigoDocumento',
      key: 'codigoDocumento',
      width: 120,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          title="Error al cargar mÃ©todos de pago"
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
          onPageSizeChange={(v) => { setPageSize(v); setPage(1); }}
          onReload={() => refetch()}
        />

      <Table<MetodoPagoDTO>
        columns={columns}
        dataSource={data?.datos || []}
        rowKey="id"
        loading={isLoading}
        scroll={{ x: 600 }}
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
          emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {searchText
              ? <Empty description="Sin resultados para la búsqueda" />
              : <Empty description="No hay mÃ©todos de pago configurados" />
            }
          </div>
        }}
      />
      <Modal
        title={`Detalle: ${detalleItem?.nombre || ''}`}
        open={detalleVisible}
        onCancel={() => setDetalleVisible(false)}
        footer={null}
        width={520}
      >
        {detalleItem && (
          <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="Código">{detalleItem.codigo}</Descriptions.Item>
            <Descriptions.Item label="Nombre">{detalleItem.nombre}</Descriptions.Item>
            <Descriptions.Item label="Requiere Documento">
              <Tag color={detalleItem.requiereDocumento ? 'blue' : 'default'}>
                {detalleItem.requiereDocumento ? 'SÃ­' : 'No'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Documento Asociado">
              {detalleItem.codigoDocumento || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
    </>
  );
};

export default MetodosPago;
