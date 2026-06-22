import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Input, Button, Card, Select, Tag, Typography, Modal, Descriptions, DatePicker, message, Tooltip,
} from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { ecommerceApi } from '../../../api/ecommerceApi';
import type { AdminOrdenListadoDTO, AdminOrdenDetalleDTO } from '../../../api/ecommerceApi';
import { formatCurrency } from '../../../utils/formats';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE: 'orange',
  PROCESANDO: 'blue',
  ENVIADO: 'cyan',
  COMPLETADO: 'green',
  CANCELADO: 'red',
};

const ESTADOS_OPCIONES = [
  { value: '', label: 'Todos' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'PROCESANDO', label: 'Procesando' },
  { value: 'ENVIADO', label: 'Enviado' },
  { value: 'COMPLETADO', label: 'Completado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

const EcommerceAdminOrdenes: React.FC = () => {
  const [data, setData] = useState<AdminOrdenListadoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchText, setSearchText] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [rangoFecha, setRangoFecha] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [detalle, setDetalle] = useState<AdminOrdenDetalleDTO | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState<string>('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        estado?: string;
        fechaDesde?: string;
        fechaHasta?: string;
        pagina?: number;
        tamano?: number;
      } = { pagina: page, tamano: pageSize };

      if (estadoFiltro) params.estado = estadoFiltro;
      if (rangoFecha && rangoFecha[0] && rangoFecha[1]) {
        params.fechaDesde = rangoFecha[0].format('YYYY-MM-DD');
        params.fechaHasta = rangoFecha[1].format('YYYY-MM-DD');
      }

      const result = await ecommerceApi.adminObtenerOrdenes(params);
      setData(result.items);
      setTotal(result.total);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar órdenes');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, estadoFiltro, rangoFecha]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleRefresh = () => {
    setPage(1);
    cargar();
  };

  const openDetalle = async (record: AdminOrdenListadoDTO) => {
    try {
      const data = await ecommerceApi.adminObtenerOrdenDetalle(record.id);
      setDetalle(data);
      setNuevoEstado(data.estado);
      setModalOpen(true);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar detalle');
    }
  };

  const handleCambiarEstado = async () => {
    if (!detalle || !nuevoEstado) return;
    try {
      await ecommerceApi.adminActualizarEstadoOrden(detalle.id, nuevoEstado);
      message.success('Estado actualizado');
      setModalOpen(false);
      cargar();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cambiar estado');
    }
  };

  const columns: ColumnsType<AdminOrdenListadoDTO> = [
    {
      title: 'No. Orden',
      dataIndex: 'noOrden',
      key: 'noOrden',
      width: 110,
      fixed: 'left',
      render: (val: number, record: AdminOrdenListadoDTO) => (
        <Text strong style={{ color: '#556ee6', cursor: 'pointer' }} onClick={() => openDetalle(record)}>
          #{val}
        </Text>
      ),
    },
    {
      title: 'Cliente',
      dataIndex: 'nombreCliente',
      key: 'nombreCliente',
      render: (val: string, record: AdminOrdenListadoDTO) => (
        <div>
          <Text>{val}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>{record.email}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 130,
      align: 'right',
      render: (val: number) => <Text strong>{formatCurrency(val)}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 120,
      render: (val: string) => <Tag color={ESTADO_COLOR[val] || 'default'}>{val}</Tag>,
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaCreacion',
      key: 'fechaCreacion',
      width: 160,
      render: (val: string) => (
        <Text>{val ? new Date(val).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</Text>
      ),
    },
  ];

  return (
    <>
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Buscar orden..."
              allowClear
              onSearch={handleSearch}
              style={{ width: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <Select
              placeholder="Estado"
              style={{ width: 150 }}
              value={estadoFiltro || undefined}
              onChange={(v) => { setEstadoFiltro(v); setPage(1); }}
              options={ESTADOS_OPCIONES}
            />
            <RangePicker
              placeholder={['Desde', 'Hasta']}
              value={rangoFecha}
              onChange={(dates) => { setRangoFecha(dates as any); setPage(1); }}
              format="DD/MM/YYYY"
            />
            <div style={{ flex: 1 }} />
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
          </div>
        </div>
        <Table<AdminOrdenListadoDTO>
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          size="middle"
          scroll={{ x: 900 }}
          className="paces-border-top paces-list-table"
          rowClassName="paces-row-hover"
          onRow={(record) => ({
            onClick: () => openDetalle(record),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p, ps) => {
              if (ps !== pageSize) {
                setPageSize(ps || 25);
                setPage(1);
              } else {
                setPage(p);
              }
            },
            showTotal: (t) => `${t} registros`,
          }}
        />
      </Card>

      <Modal
        title={`Orden #${detalle?.noOrden ?? ''}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={800}
        footer={[
          <Button key="cerrar" onClick={() => setModalOpen(false)}>
            Cerrar
          </Button>,
          <Button key="guardar" type="primary" onClick={handleCambiarEstado}>
            Guardar Estado
          </Button>,
        ]}
      >
        {detalle && (
          <div>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Cliente">{detalle.nombreCliente}</Descriptions.Item>
              <Descriptions.Item label="Email">{detalle.email}</Descriptions.Item>
              <Descriptions.Item label="Teléfono">{detalle.telefono || '-'}</Descriptions.Item>
              <Descriptions.Item label="Fecha">
                {new Date(detalle.fechaCreacion).toLocaleString('es-DO')}
              </Descriptions.Item>
              <Descriptions.Item label="Dirección" span={2}>{detalle.direccion || '-'}</Descriptions.Item>
              <Descriptions.Item label="Notas" span={2}>{detalle.notas || '-'}</Descriptions.Item>
            </Descriptions>

            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text strong>Estado:</Text>
              <Select
                style={{ width: 180 }}
                value={nuevoEstado}
                onChange={setNuevoEstado}
                options={ESTADOS_OPCIONES.filter((o) => o.value !== '')}
              />
            </div>

            <Text strong>Items</Text>
            <Table
              size="small"
              bordered
              dataSource={detalle.detalles}
              rowKey="id"
              pagination={false}
              style={{ marginTop: 8 }}
              columns={[
                { title: 'Código', dataIndex: 'codigoProducto', width: 120 },
                { title: 'Producto', dataIndex: 'nombreProducto' },
                { title: 'Cantidad', dataIndex: 'cantidad', width: 90, align: 'right' },
                {
                  title: 'Precio',
                  dataIndex: 'precioUnitario',
                  width: 120,
                  align: 'right',
                  render: (v: number) => formatCurrency(v),
                },
                {
                  title: 'Subtotal',
                  dataIndex: 'subtotal',
                  width: 120,
                  align: 'right',
                  render: (v: number) => formatCurrency(v),
                },
              ]}
            />

            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <div>Subtotal: <Text strong>{formatCurrency(detalle.subtotal)}</Text></div>
              <div>Impuestos: <Text>{formatCurrency(detalle.impuestos)}</Text></div>
              <div style={{ fontSize: 16, marginTop: 4 }}>
                Total: <Text strong style={{ color: '#556ee6' }}>{formatCurrency(detalle.total)}</Text>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default EcommerceAdminOrdenes;
