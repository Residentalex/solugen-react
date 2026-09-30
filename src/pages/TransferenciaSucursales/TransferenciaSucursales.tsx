import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, Table, Button, DatePicker, Typography, Empty, Tooltip, message } from 'antd';
import { SearchOutlined, ReloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { salidaAlmacenApi } from '../../api/salidaAlmacenApi';
import type { SalidaAlmacenDTO } from '../../types/salidaAlmacen';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import PermissionGate from '../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import ListadoErrorAlert from '../../components/ListadoErrorAlert';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const columnas: ColumnsType<SalidaAlmacenDTO> = [
  {
    title: 'Fecha Doc.',
    dataIndex: 'fechaDocumento',
    width: 120,
    render: (valor: string) => (
      <Text>{formatDateRaw(valor)}</Text>
    ),
  },
  {
    title: 'Documento',
    dataIndex: 'noDocumento',
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
    dataIndex: 'codigoAlmacenOrigen',
    width: 150,
    render: (valor?: string) => toTitleCase(valor ?? ''),
  },
  {
    title: 'Destino',
    dataIndex: 'codigoAlmacenDestino',
    width: 150,
    render: (valor?: string) => toTitleCase(valor ?? ''),
  },
  {
    title: 'Total',
    dataIndex: 'total',
    width: 140,
    align: 'right',
    render: (valor?: number) => (
      <Text strong className="paces-text-total">
        {formatCurrency(valor ?? 0)}
      </Text>
    ),
  },
  {
    title: 'Creado por',
    dataIndex: ['creadoPor', 'nombre'],
    width: 160,
  },
];

type ColumnaExcel = {
  header: string;
  valor: (item: SalidaAlmacenDTO) => string | number;
};

const columnasExcel: ColumnaExcel[] = [
  { header: 'Fecha Doc.', valor: (item) => formatDateRaw(item.fechaDocumento) },
  { header: 'Documento', valor: (item) => `${item.documento?.codigo ?? ''}-${item.noDocumento ?? ''}` },
  { header: 'Origen', valor: (item) => toTitleCase(item.codigoAlmacenOrigen ?? '') },
  { header: 'Destino', valor: (item) => toTitleCase(item.codigoAlmacenDestino ?? '') },
  { header: 'Total', valor: (item) => item.total ?? 0 },
  { header: 'Creado por', valor: (item) => item.creadoPor?.nombre ?? '' },
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
  const [exportando, setExportando] = useState(false);
  const consultandoRef = useRef(false);
  const exportandoRef = useRef(false);

  useEffect(() => {
    setActiveModule('RSAPENP');
    return () => {
      resetToolbar();
    };
  }, [setActiveModule, resetToolbar]);

  const handleConsultar = useCallback(async () => {
    if (consultandoRef.current) return;
    consultandoRef.current = true;
    setLoading(true);
    setLoadingError(false);
    try {
      const desde = fechas[0].startOf('day').format('YYYYMMDDHHmmss');
      const hasta = fechas[1].endOf('day').format('YYYYMMDDHHmmss');
      const items = await salidaAlmacenApi.obtenerTransferencias(sucursalActiva, desde, hasta);
      setData(items || []);
      setHasQueried(true);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { errorMessage?: string } } })?.response?.data?.errorMessage ||
        'Error al cargar transferencias';
      message.error(msg);
      setLoadingError(true);
    } finally {
      setLoading(false);
      consultandoRef.current = false;
    }
  }, [sucursalActiva, fechas]);

  const handleRefresh = useCallback(() => {
    if (consultandoRef.current) return;
    if (hasQueried) handleConsultar();
  }, [hasQueried, handleConsultar]);

  const handleExportarExcel = async () => {
    if (exportandoRef.current) return;
    if (consultandoRef.current) return;
    if (data.length === 0) {
      message.warning('No hay datos para exportar');
      return;
    }

    exportandoRef.current = true;
    setExportando(true);
    try {
      const companyName = await getCompanyName(sucursalActiva);
      exportToExcel({
        fileName: `TransferenciaSucursales_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        sheetName: 'TransferenciaSucursales',
        companyName,
        columnHeaders: columnasExcel.map((c) => c.header),
        dataRows: data.map((item) => columnasExcel.map((c) => c.valor(item))),
      });
    } catch (err) {
      const msg =
        (err as { response?: { data?: { errorMessage?: string } } })?.response?.data?.errorMessage ||
        'Error al exportar a Excel';
      message.error(msg);
    } finally {
      exportandoRef.current = false;
      setExportando(false);
    }
  };

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
              disabled={loading}
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
            <PermissionGate accion="EXPORTAR">
              <Tooltip title="Exportar a Excel">
                <Button
                  icon={<FileExcelOutlined />}
                  aria-label="Exportar a Excel"
                  loading={exportando}
                  disabled={loading || exportando || !hasQueried || data.length === 0}
                  onClick={handleExportarExcel}
                />
              </Tooltip>
            </PermissionGate>
            <Tooltip title="Actualizar">
              <Button
                icon={<ReloadOutlined />}
                aria-label="Actualizar"
                loading={loading}
                disabled={!hasQueried}
                onClick={handleRefresh}
              />
            </Tooltip>
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
