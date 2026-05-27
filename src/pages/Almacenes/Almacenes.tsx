import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Alert, Card, Table, Input, Select, Button, Modal, Descriptions, message, Typography, Empty } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { almacenApi } from '../../api/almacenApi';
import type { AlmacenDTO } from '../../types/entradaAlmacen';

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const { Text } = Typography;

const Almacenes: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [data, setData] = useState<AlmacenDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [detalleItem, setDetalleItem] = useState<AlmacenDTO | null>(null);
  const [loadingError, setLoadingError] = useState(false);

  const cargarDatos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const result = await almacenApi.obtenerListado(sucursalActiva);
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar almacenes');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MAlmacen');
    updateToolbar({});
    cargarDatos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleRefresh = useCallback(() => {
    setLoadingError(false);
    setSearchText('');
    setPage(1);
    cargarDatos();
  }, [cargarDatos]);

  const abrirDetalle = (item: AlmacenDTO) => {
    setDetalleItem(item);
    setDetalleVisible(true);
  };

  const filteredData = useMemo(() => {
    if (!searchText.trim()) return data;
    const text = searchText.trim().toLowerCase();
    return data.filter(
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
      {loadingError && (
        <Alert
          message="Error al cargar almacenes"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={handleRefresh}>
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
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Buscar por código o nombre..."
              allowClear
              onSearch={handleSearch}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  (e.target as HTMLInputElement).blur();
                  handleSearch('');
                }
              }}
              style={{ width: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <Select
              style={{ width: 65 }}
              value={pageSize}
              onChange={(v) => { setPageSize(v); setPage(1); }}
              options={[
                { value: 25, label: '25' },
                { value: 50, label: '50' },
                { value: 100, label: '100' },
              ]}
            />
            <div style={{ flex: 1 }} />
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
          </div>
        </div>

        <Table<AlmacenDTO>
          columns={columns}
          dataSource={filteredData}
          rowKey="codigo"
          loading={loading}
          scroll={{ x: 500 }}
          size="middle"
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
            emptyText: searchText
              ? <Empty description="Sin resultados para la búsqueda" />
              : <Empty description="No hay almacenes configurados" />
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
