import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, Table, Button, DatePicker, Typography, Empty, message } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { salidaAlmacenApi } from '../../api/salidaAlmacenApi';
import type { SalidaAlmacenDTO } from '../../types/salidaAlmacen';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import ListadoErrorAlert from '../../components/ListadoErrorAlert';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const columnas: ColumnsType<SalidaAlmacenDTO> = [
  {
    title: 'Fecha Doc.',
    width: 120,
    render: (_, record) => (
      <Text>{formatDateRaw(record.fechaDocumento)}</Text>
    ),
  },
  {
    title: 'Documento',
    width: 180,
    fixed: 'left',
    render: (_, record) => (
      <Link to={`/FTRP/${record.id}`} className="paces-doc-link">
        <Text strong>{record.documento?.codigo}-{record.noDocumento}</Text>
      </Link>
    ),
  },
  {
    title: 'Origen',
    width: 150,
    render: (_, record) => toTitleCase(record.codigoAlmacenOrigen ?? ''),
  },
  {
    title: 'Destino',
    width: 150,
    render: (_, record) => toTitleCase(record.codigoAlmacenDestino ?? ''),
  },
  {
    title: 'Total',
    width: 140,
    align: 'right',
    render: (_, record) => (
      <Text strong className="paces-text-total">
        {formatCurrency(record.total ?? 0)}
      </Text>
    ),
  },
  {
    title: 'Creado por',
    width: 160,
    render: (_, record) => record.creadoPor?.nombre ?? '',
  },
];

const TransferenciaSucursales: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  useScreenConfig('RSAPENP');

  const [data, setData] = useState<SalidaAlmacenDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [fechas, setFechas] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().startOf('month'), dayjs()]);
  const [hasQueried, setHasQueried] = useState(false);

  useEffect(() => {
    setActiveModule('RSAPENP');
    return () => {
      resetToolbar();
    };
  }, [setActiveModule, resetToolbar]);

  const handleConsultar = useCallback(async () => {
    setLoading(true);
    setLoadingError(false);
    try {
      const desde = fechas[0].startOf('day').format('YYYYMMDDHHmmss');
      const hasta = fechas[1].endOf('day').format('YYYYMMDDHHmmss');
      const items = await salidaAlmacenApi.obtenerTransferencias(sucursalActiva, desde, hasta);
      setData(items || []);
      setHasQueried(true);
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al cargar transferencias';
      message.error(msg);
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, fechas]);

  const handleRefresh = useCallback(() => {
    if (hasQueried) handleConsultar();
  }, [hasQueried, handleConsultar]);

  return (
    <>
      {loadingError && (
        <ListadoErrorAlert message="Error al cargar transferencias" onRetry={handleRefresh} />
      )}
      <Card
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <RangePicker
              value={fechas}
              onChange={(dates) => {
                if (dates) setFechas(dates as [dayjs.Dayjs, dayjs.Dayjs]);
              }}
              format="DD/MM/YYYY"
              allowClear={false}
              presets={[
                { label: 'Este mes', value: [dayjs().startOf('month'), dayjs()] as [dayjs.Dayjs, dayjs.Dayjs] },
                { label: 'Mes anterior', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] as [dayjs.Dayjs, dayjs.Dayjs] },
                { label: 'Últimos 30 días', value: [dayjs().subtract(30, 'day'), dayjs()] as [dayjs.Dayjs, dayjs.Dayjs] },
              ]}
            />
            <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={handleConsultar}>
              Consultar
            </Button>
            <div style={{ flex: 1 }} />
            <Button icon={<ReloadOutlined />} disabled={!hasQueried} onClick={handleRefresh} />
          </div>
        </div>
        <Table
          className="paces-border-top paces-list-table"
          rowKey="id"
          size="middle"
          columns={columnas}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1050 }}
          locale={{
            emptyText: hasQueried
              ? (
                <Empty
                  description={
                    <span>
                      No hay transferencias en el período
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {fechas[0].format('DD/MM/YYYY')} — {fechas[1].format('DD/MM/YYYY')}
                      </Text>
                    </span>
                  }
                />
              )
              : (
                <Empty description="Seleccione un rango de fechas y presione Consultar" />
              ),
          }}
          pagination={{
            pageSize: 25,
            showSizeChanger: false,
            showTotal: (total, range) => {
              const totalGlobal = data.reduce((s, r) => s + (r.total || 0), 0);
              return `${range[0]}-${range[1]} de ${total} registros · Total: ${formatCurrency(totalGlobal)}`;
            },
          }}
        />
      </Card>
    </>
  );
};

export default TransferenciaSucursales;
