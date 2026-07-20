import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Card, Table, Input, InputNumber, Select, Button, Typography, message, Spin, DatePicker,
  Modal, Space, Row, Col, Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined, ReloadOutlined, DownloadOutlined, CloseOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { proveedorApi } from '../../api/proveedorApi';
import { formatCurrency, formatDateParam } from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import { facturasVencidasApi } from '../../api/facturasVencidasApi';
import type { FacturaVencidaDTO } from '../../api/facturasVencidasApi';
import type { SuplidorDTO } from '../../types/entradaAlmacen';

const { Text } = Typography;

/* ───── Helpers de formato ───── */

function formatDate(val: string): string {
  if (!val) return '';
  const d = dayjs(val);
  if (!d.isValid()) return val;
  return d.format('DD/MM/YYYY');
}

const FILAS_POR_PAGINA = 25;

/* ───── Componente principal ───── */

const FacturasVencidas: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  /* ───── Estados ───── */

  // Filtros
  const [fechaCorte, setFechaCorte] = useState<dayjs.Dayjs>(dayjs());
  const [codSuplidor, setCodSuplidor] = useState<string>('');
  const [nomSuplidor, setNomSuplidor] = useState<string>('');
  const [diasMinimo, setDiasMinimo] = useState<number>(1);

  // Datos
  const [data, setData] = useState<FacturaVencidaDTO[]>([]);
  const [loading, setLoading] = useState(false);

  // Búsqueda y paginación
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(FILAS_POR_PAGINA);

  // Modal de búsqueda de suplidor
  const [modalSuplidorAbierto, setModalSuplidorAbierto] = useState(false);
  const [suplidores, setSuplidores] = useState<SuplidorDTO[]>([]);
  const [suplidoresOrig, setSuplidoresOrig] = useState<SuplidorDTO[]>([]);
  const [buscandoSuplidor, setBuscandoSuplidor] = useState(false);
  const [_searchSuplidor, setSearchSuplidor] = useState('');

  const suplidorSearchRef = useRef<any>(null);

  useEffect(() => {
    if (modalSuplidorAbierto) {
      const timer = setTimeout(() => {
        suplidorSearchRef.current?.focus?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [modalSuplidorAbierto]);

  /* ───── Cargar datos ───── */

  const generarReporte = useCallback(async () => {
    setLoading(true);
    try {
      const corte = formatDateParam(fechaCorte.toDate());
      const resultados = await facturasVencidasApi.obtenerFacturasVencidas(
        sucursalActiva,
        corte,
        codSuplidor || undefined,
        diasMinimo,
      );
      setData(resultados || []);
      setSearchText('');
      setPage(1);
      if (!resultados || resultados.length === 0) {
        message.info('No se encontraron registros para los filtros seleccionados');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, fechaCorte, codSuplidor, diasMinimo]);

  /* ───── UI setup ───── */

  useEffect(() => {
    setActiveModule('RFACVEN');
    setPageTitleOverride('Reporte de Facturas de Suplidor Vencidas');
    updateToolbar({});
    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, updateToolbar, resetToolbar]);

  /* ───── Handlers ───── */

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleRefresh = () => {
    generarReporte();
  };

  const limpiarFiltros = () => {
    setFechaCorte(dayjs());
    setCodSuplidor('');
    setNomSuplidor('');
    setDiasMinimo(1);
    setData([]);
    setSearchText('');
    setPage(1);
  };

  /* ───── Handlers de búsqueda de suplidor ───── */

  const abrirModalSuplidor = async () => {
    setModalSuplidorAbierto(true);
    setSearchSuplidor('');
    setBuscandoSuplidor(true);
    try {
      const lista = await proveedorApi.obtenerListado(sucursalActiva);
      setSuplidores(lista || []);
      setSuplidoresOrig(lista || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar suplidores');
    } finally {
      setBuscandoSuplidor(false);
    }
  };

  const buscarSuplidor = (valor: string) => {
    setSearchSuplidor(valor);
    if (!valor) {
      setSuplidores([...suplidoresOrig]);
      return;
    }
    const term = valor.toLowerCase();
    const filtradas = suplidoresOrig.filter(
      (e) =>
        e.codigo?.toLowerCase().includes(term) ||
        e.nombre?.toLowerCase().includes(term),
    );
    setSuplidores(filtradas);
  };

  const seleccionarSuplidor = (item: SuplidorDTO) => {
    setCodSuplidor(item.codigo);
    setNomSuplidor(item.nombre);
    setModalSuplidorAbierto(false);
  };

  const limpiarSuplidor = () => {
    setCodSuplidor('');
    setNomSuplidor('');
  };

  /* ───── Procesar datos: filtro local ───── */

  const filteredData = useMemo(() => {
    if (!searchText) return data;
    const term = searchText.toLowerCase();
    return data.filter(
      (item) =>
        (item.noDocumento || '').toLowerCase().includes(term) ||
        (item.ncf || '').toLowerCase().includes(term) ||
        (item.nombreSuplidor || '').toLowerCase().includes(term)
      );
  }, [data, searchText]);

  /* ───── Totales para summary ───── */

  const summaryTotals = useMemo(() => {
    let total = 0;
    let saldo = 0;
    for (const item of filteredData) {
      total += item.total || 0;
      saldo += item.saldoPendiente || 0;
    }
    return { total, saldo };
  }, [filteredData]);

  /* ───── Exportar Excel ───── */

  const exportarExcel = useCallback(async () => {
    if (filteredData.length === 0) {
      message.warning('No hay datos para exportar');
      return;
    }

    const companyName = await getCompanyName(sucursalActiva);
    const columnHeaders = ['Documento', 'Fecha Doc.', 'Suplidor', 'Días Crédito', 'Fecha Vence', 'Días Vencidos', 'Total', 'Saldo Pendiente', 'NCF'];
    const dataRows = filteredData.map((item) => [
      item.noDocumento || '',
      formatDate(item.fechaDocumento),
      item.nombreSuplidor || '',
      item.diasCredito ?? 0,
      formatDate(item.fechaVence),
      item.diasVencidos ?? 0,
      item.total ?? 0,
      item.saldoPendiente ?? 0,
      item.ncf || '',
    ]);
    dataRows.push([
      'Totales', '', '', '', '', '', summaryTotals.total, summaryTotals.saldo, '',
    ]);
    exportToExcel({
      companyName,
      columnHeaders,
      dataRows,
      sheetName: 'Facturas Vencidas',
      columnWidths: columnHeaders.map(() => ({ wch: 18 })),
    });
  }, [sucursalActiva, filteredData, summaryTotals]);

  /* ───── Columnas ───── */

  const columns: ColumnsType<FacturaVencidaDTO> = [
    {
      title: 'Documento',
      dataIndex: 'noDocumento',
      key: 'noDocumento',
      width: 150,
      render: (doc: string) => <Text strong>{doc || ''}</Text>,
    },
    {
      title: 'Fecha Doc.',
      dataIndex: 'fechaDocumento',
      key: 'fechaDocumento',
      width: 110,
      render: (f: string) => <Text>{formatDate(f)}</Text>,
    },
    {
      title: 'Suplidor',
      dataIndex: 'nombreSuplidor',
      key: 'nombreSuplidor',
      render: (nombre: string) => <Text>{nombre || ''}</Text>,
    },
    {
      title: 'Días Crédito',
      dataIndex: 'diasCredito',
      key: 'diasCredito',
      width: 100,
      align: 'right',
      render: (val: number) => <Text>{val ?? 0}</Text>,
    },
    {
      title: 'Fecha Vence',
      dataIndex: 'fechaVence',
      key: 'fechaVence',
      width: 110,
      render: (f: string) => <Text>{formatDate(f)}</Text>,
    },
    {
      title: 'Días Vencidos',
      dataIndex: 'diasVencidos',
      key: 'diasVencidos',
      width: 120,
      align: 'right',
      render: (val: number) => (
        <Text style={{ color: (val || 0) > 0 ? '#ff4d4f' : undefined, fontWeight: (val || 0) > 0 ? 600 : undefined }}>
          {val ?? 0}
        </Text>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 140,
      align: 'right',
      render: (val: number) => <Text strong className="paces-text-total">{formatCurrency(val || 0)}</Text>,
    },
    {
      title: 'Saldo Pendiente',
      dataIndex: 'saldoPendiente',
      key: 'saldoPendiente',
      width: 140,
      align: 'right',
      render: (val: number) => <Text strong className="paces-text-total">{formatCurrency(val || 0)}</Text>,
    },
    {
      title: 'NCF',
      dataIndex: 'ncf',
      key: 'ncf',
      width: 150,
      render: (ncf: string) => <Text>{ncf || ''}</Text>,
    },
  ];

  /* ───── Summary row ───── */

  const renderSummary = () => (
    <Table.Summary fixed>
      <Table.Summary.Row>
        <Table.Summary.Cell index={0} colSpan={3}>
          <Text strong style={{ fontSize: 13 }}>Totales</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={3} />
        <Table.Summary.Cell index={4} />
        <Table.Summary.Cell index={5} />
        <Table.Summary.Cell index={6} align="right">
          <Text strong className="paces-text-total">{formatCurrency(summaryTotals.total)}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={7} align="right">
          <Text strong className="paces-text-total">{formatCurrency(summaryTotals.saldo)}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={8} />
      </Table.Summary.Row>
    </Table.Summary>
  );

  /* ───── Paginación ───── */

  const paginationProps = {
    current: page,
    pageSize,
    showSizeChanger: false,
    showTotal: (t: number) => `${t} registros`,
    onChange: (p: number) => setPage(p),
  };

  /* ───── Render ───── */

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .paces-card-erp { box-shadow: none !important; border: none !important; }
          .paces-card { box-shadow: none !important; border: none !important; }
          .ant-table { font-size: 9pt; }
          .ant-table-thead > tr > th { background: #f0f0f0 !important; }
          .ant-table-pagination { display: none !important; }
          .ant-spin-nested-loading { overflow: visible !important; }
        }
      `}</style>

      {/* ───── Filtros ───── */}
      <Card className="paces-card no-print" style={{ marginBottom: 16 }}>
        <div style={{ padding: '16px 24px' }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={12} md={4}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Fecha corte</Text>
              </div>
              <DatePicker
                value={fechaCorte}
                onChange={(d) => d && setFechaCorte(d)}
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
              />
            </Col>

            <Col xs={24} sm={12} md={5}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Suplidor</Text>
              </div>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="Buscar suplidor..."
                  value={nomSuplidor}
                  readOnly
                  style={{ width: '100%' }}
                />
                <Button icon={<SearchOutlined />} onClick={abrirModalSuplidor} />
                {nomSuplidor ? (
                  <Button icon={<CloseOutlined />} onClick={limpiarSuplidor} />
                ) : null}
              </Space.Compact>
            </Col>

            <Col xs={24} sm={12} md={3}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Días mínimo vencidos</Text>
              </div>
              <InputNumber
                value={diasMinimo}
                onChange={(v) => setDiasMinimo(v ?? 1)}
                min={1}
                style={{ width: '100%' }}
              />
            </Col>

            <Col xs={24} sm={12} md={2}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>&nbsp;</Text>
              </div>
              <Space>
                <Button type="primary" onClick={generarReporte} loading={loading}>
                  Generar
                </Button>
                <Button icon={<ReloadOutlined />} onClick={limpiarFiltros} />
              </Space>
            </Col>
          </Row>
        </div>
      </Card>

      {/* ───── Resultados ───── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : data.length > 0 ? (
        <Card
          className="paces-card-erp"
          styles={{ body: { padding: 0 } }}
          style={{ borderRadius: 8, overflow: 'hidden' }}
        >
          {/* Barra de búsqueda y acciones (no-print) */}
          <div className="no-print" style={{ padding: '16px 24px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
              <Input.Search
                placeholder="Buscar por documento, suplidor o NCF..."
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
              <Button icon={<DownloadOutlined />} onClick={exportarExcel}>
                Exportar
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
            </div>
          </div>

          {/* Tabla */}
          <Table<FacturaVencidaDTO>
            columns={columns}
            dataSource={filteredData}
            rowKey="transacId"
            loading={false}
            scroll={{ x: 1300 }}
            size="middle"
            pagination={paginationProps}
            summary={renderSummary}
            className="paces-border-top paces-list-table"
          />
        </Card>
      ) : (
        data.length === 0 && !loading && (
          <Card
            className="paces-card-erp"
            styles={{ body: { padding: 0 } }}
            style={{ borderRadius: 8, overflow: 'hidden' }}
          >
            <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description="Presione 'Generar' para obtener el reporte" />
            </div>
          </Card>
        )
      )}

      {/* ───── Modal búsqueda suplidor ───── */}
      <Modal
        title="Buscar Suplidor"
        open={modalSuplidorAbierto}
        onCancel={() => setModalSuplidorAbierto(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Input.Search
          ref={suplidorSearchRef}
          placeholder="Buscar por nombre o código..."
          allowClear
          onSearch={buscarSuplidor}
          style={{ marginBottom: 12 }}
        />
        <Table
          columns={[
            { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 100 },
            { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
          ]}
          dataSource={suplidores}
          rowKey="codigo"
          loading={buscandoSuplidor}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          onRow={(record: any) => ({
            onClick: () => seleccionarSuplidor(record),
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="Sin resultados" /></div> }}
        />
      </Modal>
    </>
  );
};

export default FacturasVencidas;
