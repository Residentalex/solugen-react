import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Table, Button, DatePicker, Typography, Tooltip, Empty, Select } from 'antd';
import { SearchOutlined, PrinterOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useDocumentosReporte } from '../../hooks/useDocumentosReporte';
import { documentosCxPReporteApi } from '../../api/documentosCxPReporteApi';
import type { MovimientoVistaDTO } from '../../types/entradaAlmacen';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';

import ListadoErrorAlert from '../../components/ListadoErrorAlert';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const DOC_ROUTE_MAP: Record<string, string> = {
  RDE: 'FRDE',
  NC: 'FNCSUP',
  ND: 'FNDSUP',
  DBA: 'FDBASUP',
  SPA: 'FSPA',
};

const OPCIONES_TIPO_DOCUMENTO = [
  { value: '', label: 'Todos los tipos' },
  { value: 'RDE', label: 'Factura Proveedor (RDE)' },
  { value: 'NC', label: 'Nota Crédito (NC)' },
  { value: 'ND', label: 'Nota Débito (ND)' },
  { value: 'DBA', label: 'Dist. Balance (DBA)' },
  { value: 'SPA', label: 'Solicitud Pago (SPA)' },
];

const columnas: ColumnsType<MovimientoVistaDTO> = [
  {
    title: 'Fecha Doc.',
    width: 120,
    render: (_, record) => (
      <Text>{formatDateRaw(record.fecha)}</Text>
    ),
  },
  {
    title: 'Documento',
    width: 180,
    fixed: 'left',
    render: (_, record) => {
      const prefijo = record.documento?.split('-')[0] || '';
      const ruta = DOC_ROUTE_MAP[prefijo] || 'FRDE';
      return (
        <Link to={`/${ruta}/${record.id}`} className="paces-doc-link">
          <Text strong>{record.documento}</Text>
        </Link>
      );
    },
  },
  {
    title: 'Suplidor',
    render: (_, record) => toTitleCase(record.entidad ?? ''),
  },
  {
    title: 'Concepto',
    width: 220,
    responsive: ['lg'],
    ellipsis: true,
    render: (_, record) => toTitleCase(record.concepto ?? ''),
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
    title: 'Fecha Autorizado',
    width: 130,
    render: (_, record) => (record.fechaAccion ? formatDateRaw(record.fechaAccion) : '-'),
  },
  {
    title: 'Autorizado por',
    width: 220,
    render: (_, record) => record.creadoPor,
  },
];

const DocumentosCxPAutorizados: React.FC = () => {
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  useScreenConfig('RDocCxPAutorizado');

  const MODULO_ID = 5;

  const [tipoDocumento, setTipoDocumento] = useState('');

  const config = useMemo(() => ({
    modulo: 'RDocCxPAutorizado' as const,
    fetchDatos: (sucursal: number, desde: string, hasta: string) =>
      documentosCxPReporteApi.obtenerAutorizados(sucursal, MODULO_ID, desde, hasta, tipoDocumento || undefined),
    reporteBlob: (sucursal: number, desde: string, hasta: string) =>
      documentosCxPReporteApi.imprimirReporte(sucursal, MODULO_ID, 'autorizados', desde, hasta, tipoDocumento || undefined),
    tituloReporte: 'CXP Autorizados',
  }), [tipoDocumento]);

  const {
    data,
    loading,
    loadingError,
    loadingPdf,
    fechas,
    hasQueried,
    handleConsultar,
    handleImprimir,
    handleFechasChange,
    handleRefresh,
  } = useDocumentosReporte(config);

  useEffect(() => {
    setActiveModule('RDocCxPAutorizado');
    return () => {
      resetToolbar();
    };
  }, [setActiveModule, resetToolbar]);

  useEffect(() => {
    if (hasQueried) {
      handleConsultar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoDocumento]);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const tooltipTitle = selectedRowKeys.length > 0
    ? `Imprimir seleccionados (${selectedRowKeys.length})`
    : 'Imprimir reporte completo del período';

  return (
    <>
      {loadingError && (
        <ListadoErrorAlert
          message="Error al cargar documentos CXP autorizados"
          onRetry={handleRefresh}
        />
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
              onChange={(dates) => handleFechasChange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
              format="DD/MM/YYYY"
              allowClear={false}
              presets={[
                { label: 'Este mes', value: [dayjs().startOf('month'), dayjs()] as [dayjs.Dayjs, dayjs.Dayjs] },
                { label: 'Mes anterior', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] as [dayjs.Dayjs, dayjs.Dayjs] },
                { label: 'Últimos 30 días', value: [dayjs().subtract(30, 'day'), dayjs()] as [dayjs.Dayjs, dayjs.Dayjs] },
              ]}
            />
            <Select
              value={tipoDocumento}
              onChange={(val) => setTipoDocumento(val)}
              options={OPCIONES_TIPO_DOCUMENTO}
              style={{ width: 220 }}
            />
            <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={handleConsultar}>
              Consultar
            </Button>
            <div style={{ flex: 1 }} />
            <Tooltip title={tooltipTitle}>
              <Button
                icon={<PrinterOutlined />}
                loading={loadingPdf}
                disabled={data.length === 0 && selectedRowKeys.length === 0}
                onClick={() => handleImprimir(selectedRowKeys.length > 0 ? selectedRowKeys.map(Number) : undefined)}
              />
            </Tooltip>
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
          rowSelection={{
            selectedRowKeys,
            onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
            columnWidth: 60,
          }}
          scroll={{ x: 1050 }}
          locale={{
            emptyText: hasQueried
              ? (
                <Empty
                  description={
                    <span>
                      No hay documentos CXP autorizados en el período
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

export default DocumentosCxPAutorizados;
