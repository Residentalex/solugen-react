import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, Table, Button, DatePicker, Typography, Tooltip, Empty, Space, Checkbox, Tag, message, Input } from 'antd';
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
import { ModalGenerarDocBancario } from '../../components/ModalGenerarDocBancario/ModalGenerarDocBancario';

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

const ASPA: React.FC = () => {
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  useScreenConfig('ASPA');

  const config = useMemo(() => ({
    modulo: 'ASPA' as const,
    fetchDatos: async (sucursal: number, desde: string, hasta: string) => {
      console.log('Consultando documentos no autorizados:', { sucursal, desde, hasta });
      const data = await solicitudPagoApi.obtenerNoAutorizados(sucursal, desde, hasta);
      console.log('Resultado:', data);
      // Excluir documentos en borrador (estado 0)
      const dataFiltrada = (data || []).filter((d: any) => d.estado !== 0);
      return dataFiltrada as any;
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
  const selectedRowKeysRef = useRef<React.Key[]>([]);
  const [generando, setGenerando] = useState(false);
  const [modalGenerarVisible, setModalGenerarVisible] = useState(false);
  const [itemsGenerar, setItemsGenerar] = useState<TransaccionBancariaVistaDTO[]>([]);
  const [searchText, setSearchText] = useState('');

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
      selectedRowKeysRef.current = [];
      handleRefresh();
    } finally {
      setGenerando(false);
    }
  };

  const handleGenerarLote = async () => {
    if (selectedRowKeys.length === 0) return;
    if (selectedRowKeys.length > 1) {
      const itemsSeleccionados = data.filter((x: any) => selectedRowKeys.includes(x.id) && (x as any).autorizado && !(x as any).pagoGenerado);
      setItemsGenerar(itemsSeleccionados as TransaccionBancariaVistaDTO[]);
      setModalGenerarVisible(true);
      return;
    }
    setGenerando(true);
    try {
      let exitos = 0;
      let errores = 0;
      const idsCreados: number[] = [];
      for (const key of selectedRowKeys) {
        const item = data.find(x => x.id === key);
        if (item && (item as any).autorizado && !(item as any).pagoGenerado) {
          try {
            const resultado = await solicitudPagoApi.generarPago(sucursalActiva, Number(key), false);
            idsCreados.push(resultado.id);
            exitos++;
          } catch (err) {
            errores++;
          }
        }
      }
      if (exitos > 0) message.success(`${exitos} documentos bancarios generados correctamente.`);
      if (errores > 0) message.error(`${errores} documentos fallaron.`);
      setSelectedRowKeys([]);
      selectedRowKeysRef.current = [];
      handleRefresh();
      if (idsCreados.length === 1) {
        window.open(`/FTransBanco/${idsCreados[0]}`, '_blank');
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
    const dataRows = datosFiltrados.map((item: any) =>
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

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const datosFiltrados = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return data;
    return data.filter((item: any) => {
      const documento = (item.documento || '').toLowerCase();
      const entidad = (item.entidad || '').toLowerCase();
      const concepto = (item.concepto || '').toLowerCase();
      return documento.includes(term) || entidad.includes(term) || concepto.includes(term);
    });
  }, [data, searchText]);

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
            <Input.Search
              placeholder="Buscar documento, entidad, concepto..."
              allowClear
              onSearch={handleSearch}
              style={{ width: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
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
          dataSource={datosFiltrados}
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys: React.Key[], selectedRows, info) => {
              const prev = selectedRowKeysRef.current;
              // Si preserveSelectedRowKeys no funciona, mantenemos prevKeys y agregamos nuevos
              const newKeys = Array.from(new Set([...prev, ...keys]));
              setSelectedRowKeys(newKeys);
              selectedRowKeysRef.current = newKeys;
            },
            columnWidth: 60,
          }}
          preserveSelectedRowKeys
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
              const totalGlobal = datosFiltrados.reduce((s, r) => s + (r.total || 0), 0);
              return `${range[0]}-${range[1]} de ${total} registros · Total: ${formatCurrency(totalGlobal)}`;
            },
          }}
        />
      <ModalGenerarDocBancario
        visible={modalGenerarVisible}
        onCancel={() => setModalGenerarVisible(false)}
        items={itemsGenerar}
        sucursalActiva={sucursalActiva}
        onRefresh={handleRefresh}
        fechas={fechas}
      />
      </Card>
    </>
  );
};

export default ASPA;