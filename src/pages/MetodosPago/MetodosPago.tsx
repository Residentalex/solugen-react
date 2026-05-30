import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Table, Input, Select, Button, Tag, message, Typography, Empty, Modal, Descriptions, Alert } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { puntoVentaApi } from '../../api/puntoVentaApi';
import type { MetodoPagoDTO } from '../../types/facturacion';

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const { Text } = Typography;

const MetodosPago: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [data, setData] = useState<MetodoPagoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loadingError, setLoadingError] = useState(false);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [detalleItem, setDetalleItem] = useState<MetodoPagoDTO | null>(null);

  const cargarDatos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const result = await puntoVentaApi.obtenerMetodosPago(sucursalActiva);
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar métodos de pago');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MMetodosPago');
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

  const abrirDetalle = (item: MetodoPagoDTO) => {
    setDetalleItem(item);
    setDetalleVisible(true);
  };

  const filteredData = useMemo(() => {
    if (!searchText.trim()) return data;
    const text = searchText.trim().toLowerCase();
    return data.filter(
      (item) =>
        item.nombre?.toLowerCase().includes(text) ||
        item.codigo?.toLowerCase().includes(text)
    );
  }, [data, searchText]);

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
        <Tag color={val ? 'blue' : 'default'}>{val ? 'Sí' : 'No'}</Tag>
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
      {loadingError && (
        <Alert
          title="Error al cargar métodos de pago"
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
            placeholder="Buscar por nombre o código..."
            allowClear
            onSearch={handleSearch}
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

      <Table<MetodoPagoDTO>
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        loading={loading}
        scroll={{ x: 600 }}
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
          emptyText: searchText
            ? <Empty description="Sin resultados para la búsqueda" />
            : <Empty description="No hay métodos de pago configurados" />
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
                {detalleItem.requiereDocumento ? 'Sí' : 'No'}
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
