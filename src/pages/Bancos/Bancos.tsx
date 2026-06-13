import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Table, Card, Button, Modal, Descriptions, Typography, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { toTitleCase } from '../../utils/formats';
import { bancoApi } from '../../api/bancoApi';
import type { BancoDTO } from '../../api/bancoApi';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const { Text } = Typography;

const Bancos: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [detalleItem, setDetalleItem] = useState<BancoDTO | null>(null);

  React.useEffect(() => {
    setActiveModule('MBanco');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['bancos', sucursalActiva, page, pageSize, searchText],
    queryFn: async () => {
      const salto = (page - 1) * pageSize;
      const params: { cantidad?: number; salto?: number; busqueda?: string } = { cantidad: pageSize, salto };
      if (searchText) params.busqueda = searchText;
      const [resultados, totalCount] = await Promise.all([
        bancoApi.obtenerListado(sucursalActiva, params),
        bancoApi.obtenerTotal(sucursalActiva, { busqueda: searchText || undefined }),
      ]);
      return { datos: resultados || [], total: totalCount ?? 0 };
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const abrirDetalle = (item: BancoDTO) => {
    setDetalleItem(item);
    setDetalleVisible(true);
  };

  const columns: ColumnsType<BancoDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (val: string, record: BancoDTO) => (
        <Text strong className="paces-doc-link" style={{ cursor: 'pointer' }} onClick={() => abrirDetalle(record)}>
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
      title: 'Tipo Entidad',
      dataIndex: 'tipoEntidad',
      key: 'tipoEntidad',
      width: 150,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Correo Electrónico',
      dataIndex: 'correoElectronico',
      key: 'correoElectronico',
      width: 250,
      ellipsis: true,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'ID Externo',
      dataIndex: 'idExterno',
      key: 'idExterno',
      width: 120,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar bancos"
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
          onNuevo={() => navigate('/MBanco/nuevo')}
          onReload={() => refetch()}
        />
        <Table<BancoDTO>
          columns={columns}
          dataSource={data?.datos || []}
          rowKey="codigo"
          loading={isLoading}
          scroll={{ x: 900 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          locale={{
            emptyText: <div style={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Empty description="No hay bancos registrados" />
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

      <Modal
        title={`Detalle: ${detalleItem?.codigo || ''}`}
        open={detalleVisible}
        onCancel={() => setDetalleVisible(false)}
        footer={null}
        width={520}
      >
        {detalleItem && (
          <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="Código">{detalleItem.codigo}</Descriptions.Item>
            <Descriptions.Item label="Nombre">{toTitleCase(detalleItem.nombre ?? '')}</Descriptions.Item>
            <Descriptions.Item label="Tipo Entidad">{detalleItem.tipoEntidad || '-'}</Descriptions.Item>
            <Descriptions.Item label="Correo Electrónico">{detalleItem.correoElectronico || '-'}</Descriptions.Item>
            <Descriptions.Item label="ID Externo">{detalleItem.idExterno || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );
};

export default Bancos;
