import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Table, Button, Input, Select, Empty, message, Modal, Descriptions, Typography } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { puntoVentaApi } from '../../api/puntoVentaApi';
import type { PuntoVentaDTO } from '../../types/facturacion';

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const { Text } = Typography;

const PuntosVenta: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [data, setData] = useState<PuntoVentaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [detalleItem, setDetalleItem] = useState<PuntoVentaDTO | null>(null);

  const cargarDatos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const result = await puntoVentaApi.obtenerListado(sucursalActiva);
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar puntos de venta');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MPOS');
    updateToolbar({});
    cargarDatos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const abrirDetalle = (item: PuntoVentaDTO) => {
    setDetalleItem(item);
    setDetalleVisible(true);
  };

  const handleRefresh = useCallback(() => {
    setSearchText('');
    setPage(1);
    cargarDatos();
  }, [cargarDatos]);

  const filteredData = useMemo(() => {
    if (!searchText.trim()) return data;
    const text = searchText.trim().toLowerCase();
    return data.filter(
      (item) =>
        item.nombre?.toLowerCase().includes(text) ||
        item.ip?.toLowerCase().includes(text) ||
        item.ruta?.toLowerCase().includes(text)
    );
  }, [data, searchText]);

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
      <div style={{ padding: '16px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <Input.Search
            placeholder="Buscar por nombre, IP o ruta..."
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

      <Table<PuntoVentaDTO>
        columns={columns}
        dataSource={filteredData}
        rowKey="nombre"
        loading={loading}
        scroll={{ x: 600 }}
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
            : <Empty description="No hay puntos de venta configurados" />
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
