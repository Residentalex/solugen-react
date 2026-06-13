import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { useNavigate } from 'react-router-dom';
import { Alert, Card, Table, Button, Modal, Descriptions, Typography, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { almacenApi } from '../../api/almacenApi';
import PermissionGate from '../../components/PermissionGate';
import { toTitleCase } from '../../utils/formats';
import type { AlmacenDTO } from '../../types/entradaAlmacen';

const { Text } = Typography;

const Almacenes: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [detalleItem, setDetalleItem] = useState<AlmacenDTO | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['almacenes', sucursalActiva],
    queryFn: async () => {
      if (sucursalActiva === undefined) return [];
      const result = await almacenApi.obtenerListado(sucursalActiva);
      return result || [];
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MAlmacen');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const abrirDetalle = (item: AlmacenDTO) => {
    setDetalleItem(item);
    setDetalleVisible(true);
  };

  const filteredData = useMemo(() => {
    const list = data || [];
    if (!searchText.trim()) return list;
    const text = searchText.trim().toLowerCase();
    return list.filter(
      (item) =>
        item.codigo?.toLowerCase().includes(text) ||
        item.nombre?.toLowerCase().includes(text)
    );
  }, [data, searchText]);

  const columns: ColumnsType<AlmacenDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (val: string, record: AlmacenDTO) => (
        <Text strong className="paces-doc-link" style={{ fontFamily: 'monospace', cursor: 'pointer' }} onClick={() => abrirDetalle(record)}>
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
      title: 'Cuenta Contable',
      dataIndex: 'cuentaContable',
      key: 'cuentaContable',
      width: 160,
      render: (val: string) => <Text style={{ fontFamily: 'monospace' }}>{val || '-'}</Text>,
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar almacenes"
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
          onNuevo={() => navigate('/MAlmacen/nuevo')}
          onReload={() => refetch()}
        />
        <Table<AlmacenDTO>
          columns={columns}
          dataSource={filteredData}
          rowKey="codigo"
          loading={isLoading}
          scroll={{ x: 500 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          pagination={{
            current: page,
            pageSize,
            total: filteredData.length,
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
          }}
          onChange={(pagination) => {
            setPage(pagination.current || 1);
          }}
          locale={{
            emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {searchText
                ? <Empty description="Sin resultados para la búsqueda" />
                : <Empty description="No hay almacenes configurados" />
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
            <Descriptions.Item label="Código">{detalleItem.codigo}</Descriptions.Item>
            <Descriptions.Item label="Nombre">{detalleItem.nombre}</Descriptions.Item>
            <Descriptions.Item label="Cuenta Contable">
              <Text style={{ fontFamily: 'monospace' }}>{detalleItem.cuentaContable || '-'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="ID Externo">{detalleItem.idExterno || '-'}</Descriptions.Item>
            <Descriptions.Item label="Fecha Inicial">
              {detalleItem.fechaInicial ? new Date(detalleItem.fechaInicial).toLocaleDateString('es-DO') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Fecha Cierre">
              {detalleItem.fechaCierre ? new Date(detalleItem.fechaCierre).toLocaleDateString('es-DO') : '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );
};

export default Almacenes;
