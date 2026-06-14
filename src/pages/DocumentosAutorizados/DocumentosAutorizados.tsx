import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, Table, Button, DatePicker, Typography, Tooltip, Empty } from 'antd';
import { SearchOutlined, PrinterOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useDocumentosReporte } from '../../hooks/useDocumentosReporte';
import { documentosReporteApi } from '../../api/documentosReporteApi';
import type { MovimientoVistaDTO } from '../../types/entradaAlmacen';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import EntidadColumnCell from '../../components/EntidadColumnCell';
import PermissionGate from '../../components/PermissionGate';
import ListadoErrorAlert from '../../components/ListadoErrorAlert';
import PdfPreviewDrawer from '../../components/PdfPreviewDrawer';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const columnas: ColumnsType<MovimientoVistaDTO> = [
  {
    title: 'Fecha Doc.',
    width: 120,
    render: (_, record) => (
      <>
        <Text>{formatDateRaw(record.fecha)}</Text>
        {record.fechaEntrega && (
          <div style={{ fontSize: 10, color: '#888' }}>Entrega: {formatDateRaw(record.fechaEntrega)}</div>
        )}
      </>
    ),
  },
  {
    title: 'Documento',
    width: 180,
    fixed: 'left',
    render: (_, record) => (
      <Link to={`/FENP/${record.id}`} className="paces-doc-link">
        <Text strong>{record.documento}</Text>
      </Link>
    ),
  },
  {
    title: 'Suplidor',
    render: (_, record) => (
      <EntidadColumnCell
        name={record.entidad ?? ''}
        diasCredito={record.diasCredito}
        identificacion={record.identificacion}
      />
    ),
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
    title: 'Creado Por',
    width: 160,
    responsive: ['xl'],
    render: (_, record) => record.creadoPor,
  },
];

const DocumentosAutorizados: React.FC = () => {
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  useScreenConfig('RENA');

  const config = useMemo(() => ({
    modulo: 'RENA' as const,
    fetchDatos: documentosReporteApi.obtenerAutorizados,
    reporteBlob: (sucursal: number, desde: string, hasta: string) =>
      documentosReporteApi.imprimirReporte(sucursal, 'autorizados', desde, hasta),
    tituloReporte: 'Autorizados',
  }), []);

  const {
    data,
    loading,
    loadingError,
    loadingPdf,
    pdfPreview,
    fechas,
    hasQueried,
    handleConsultar,
    handleImprimir,
    handlePdfClose,
    handleFechasChange,
    handleRefresh,
  } = useDocumentosReporte(config);

  useEffect(() => {
    setActiveModule('RENA');
    return () => {
      resetToolbar();
    };
  }, [setActiveModule, resetToolbar]);

  return (
    <>
      {loadingError && (
        <ListadoErrorAlert
          message="Error al cargar documentos autorizados"
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
            <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={handleConsultar}>
              Consultar
            </Button>
            <div style={{ flex: 1 }} />
            <PermissionGate accion="IMPRIMIR">
              <Tooltip title="Imprimir reporte completo del período">
                <Button
                  icon={<PrinterOutlined />}
                  loading={loadingPdf}
                  disabled={data.length === 0}
                  onClick={handleImprimir}
                />
              </Tooltip>
            </PermissionGate>
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
                      No hay documentos autorizados en el período
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
      <PdfPreviewDrawer
        pdfPreview={pdfPreview}
        onClose={handlePdfClose}
      />
    </>
  );
};

export default DocumentosAutorizados;
