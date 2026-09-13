import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Table, Button, DatePicker, Typography, Tooltip, Empty, Space, Checkbox, Tag, message } from 'antd';
import { SearchOutlined, PrinterOutlined, ReloadOutlined, FileExcelOutlined, CheckCircleOutlined, CloseCircleOutlined, FileAddOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useDocumentosReporte } from '../../hooks/useDocumentosReporte';
import { solicitudPagoApi } from '../../api/solicitudPagoApi';
import { documentosReporteApi } from '../../api/documentosReporteApi';
import type { MovimientoVistaDTO } from '../../types/entradaAlmacen';
import type { TransaccionBancariaVistaDTO } from '../../types/transaccion';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import PermissionGate from '../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';

import ListadoErrorAlert from '../../components/ListadoErrorAlert';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const columnas: ColumnsType<TransaccionBancariaVistaDTO> = [
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
    render: (_, record) => (
      <Link to={`/FSPA/${record.id}`} className="paces-doc-link">
        <Text strong>{record.documento}</Text>
      </Link>
    ),
  },
  {
    title: 'Entidad',
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
    title: 'Estado',
    width: 130,
    render: (_, record) => (
      <Space direction="vertical" size={0}>
        {record.autorizado ? (
          <Tag color="green">AUTORIZADO</Tag>
        ) : (
          <Tag color="red">NO AUTORIZADO</Tag>
        )}
        {record.pagoGenerado && <Tag color="blue">PAGO GENERADO</Tag>}
      </Space>
    ),
  },
  {
    title: 'Fecha Acción',
    width: 130,
    render: (_, record) => (record.fechaAccion ? formatDateRaw(record.fechaAccion) : '-'),
  },
  {
    title: 'Autorizado por',
    width: 220,
    render: (_, record) => record.creadoPor,
  },
];

const RDocNoAutorizado: React.FC = () => {
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  useScreenConfig('ASPA');

  const config = useMemo(() => ({
    modulo: 'ASPA' as const,
    fetchDatos: async (sucursal: number, desde: string, hasta: string) => {
      console.log('Consultando documentos no autorizados:', { sucursal, desde, hasta });
      const data = await solicitudPagoApi.obtenerNoAutorizados(sucursal, desde, hasta);
      console.log('Resultado:', data);
      return data as any;
    },
    reporteBlob: (sucursal: number, desde: string, hasta: string) =>
      documentosReporteApi.imprimirReporte(sucursal, 'autorizados', desde, hasta),
    tituloReporte: 'No Autorizados',
  }), []);

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
  } = useDocumentosReporte(config as any);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [generando, setGenerando] = useState(false);

  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const handleAutorizarLote = async () => {
    if (selectedRowKeys.length === 0) return;
    setGenerando(true);
    try {
      let exitos = 0;
      let errores = 0;
      for (const key of selectedRowKeys) {
        const item = data.find(x => x.id === key);
        if (item && !(item as any).autorizado) {
          try {
            await solicitudPagoApi.autorizar(sucursalActiva, Number(key));
            exitos++;
          } catch (err) {
            errores++;
          }
        }
      }
      if (exitos > 0) message.success(`${exitos} documentos autorizados correctamente.`);
      if (errores > 0) message.error(`${errores} documentos fallaron.`);
      setSelectedRowKeys([]);
      handleRefresh();
    } finally {
      setGenerando(false);
    }
  };

  const handleGenerarLote = async () => {
    if (selectedRowKeys.length === 0) return;
    setGenerando(true);
    try {
      let exitos = 0;
      let errores = 0;
      const idsCreados: number[] = [];
      for (const key of selectedRowKeys) {
        const item = data.find(x => x.id === key);
        if (item && (item as any).autorizado && !(item as any).pagoGenerado) {
          try {
            const idDocBancario = await solicitudPagoApi.generarPago(sucursalActiva, Number(key), true);
            idsCreados.push(idDocBancario);
            exitos++;
          } catch (err) {
            errores++;
          }
        }
      }
      if (exitos > 0) message.success(`${exitos} documentos bancarios generados correctamente.`);
      if (errores > 0) message.error(`${errores} documentos fallaron.`);
      setSelectedRowKeys([]);
      handleRefresh();
      if (idsCreados.length === 1) {
        window.open(`/FTransBanco/${idsCreados[0]}`, '_blank');
      } else if (idsCreados.length > 1) {
        window.open(`/FTransBanco/${idsCreados[idsCreados.length - 1]}`, '_blank');
      }
    } finally {
      setGenerando(false);
    }
  };

  useEffect(() => {
    setActiveModule('ASPA');
    return () => {
      resetToolbar();
    };
  }, [setActiveModule, resetToolbar]);

  const handleExportarExcel = async () => {
    const sucursalActiva = useAuthStore.getState().sucursalActiva;
    const companyName = await getCompanyName(sucursalActiva);
    const exportCols = columnas.filter((col: any) => col.title && col.title !== '' && col.title !== 'Acciones');
    const columnHeaders = exportCols.map((col: any) => col.title);
    const dataRows = data.map((item: any) =>
      exportCols.map((col: any) => {
        const val = item[col.dataIndex];
        return val != null ? String(val) : '';
      })
    );
    exportToExcel({
      fileName: `DocumentosNoAutorizados_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'DocumentosNoAutorizados',
      companyName,
      columnHeaders,
      dataRows,
    });
  };

  const tooltipTitle = selectedRowKeys.length > 0
    ? `Imprimir seleccionados (${selectedRowKeys.length})`
    : 'Imprimir reporte completo del período';

  return (
    <>
      {loadingError && (
        <ListadoErrorAlert
          message="Error al cargar documentos no autorizados"
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
            <PermissionGate accion="AUTORIZAR">
              {selectedRowKeys.length > 0 && data.some(x => selectedRowKeys.includes(x.id) && !(x as any).autorizado) && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={generando}
                  onClick={handleAutorizarLote}
                >
                  Autorizar Seleccionados
                </Button>
              )}
            </PermissionGate>
            <PermissionGate permisoEspecial="pe_generar_DocBancario">
              {selectedRowKeys.length > 0 && data.some(x => selectedRowKeys.includes(x.id) && (x as any).autorizado && !(x as any).pagoGenerado) && (
                <Button
                  type="primary"
                  icon={<FileAddOutlined />}
                  loading={generando}
                  onClick={handleGenerarLote}
                  style={{ backgroundColor: '#556ee6' }}
                >
                  Generar Documento Bancario
                </Button>
              )}
            </PermissionGate>
            <div style={{ flex: 1 }} />
            <PermissionGate accion="EXPORTAR">
              <Button icon={<FileExcelOutlined />} onClick={handleExportarExcel} />
            </PermissionGate>
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
                      No hay documentos no autorizados en el período
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

export default RDocNoAutorizado;