import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Spin, Input, Button, Space, message, Alert, Typography } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Sucursal } from '../../types/auth';
import { reporte607Api } from '../../api/reporte607Api';
import ReporteToolbar from '../../components/ReporteToolbar';
import FiltrosDocumento from '../../components/FiltrosDocumento/FiltrosDocumento';
import { formatCurrency, formatDateParam, formatDateRaw } from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import type { Reporte607DTO } from '../../types/facturacion';
import ColumnVisibilityToggle from '../../components/ColumnVisibilityToggle';
import type { ColumnConfig } from '../../components/ColumnVisibilityToggle';
import dayjs from 'dayjs';

const { Text } = Typography;

/** Columna de moneda estandar: monto alineado a la derecha. */
const columnaMoneda = (title: string, dataIndex: string, width = 130): ColumnsType<Reporte607DTO>[number] => ({
  title,
  dataIndex,
  key: dataIndex,
  width,
  align: 'right',
  render: (v: number) => formatCurrency(v || 0),
});

const COLUMNS_CONFIG: ColumnConfig[] = [
  { key: 'sucursal', label: 'Sucursal', defaultVisible: true },
  { key: 'rnc', label: 'RNC', defaultVisible: true },
  { key: 'rncid', label: 'Tipo ID', defaultVisible: false },
  { key: 'documento', label: 'Documento', defaultVisible: true },
  { key: 'razonSocial', label: 'Razón Social', defaultVisible: true },
  { key: 'ncf', label: 'NCF', defaultVisible: true },
  { key: 'ncfModificado', label: 'NCF Modificado', defaultVisible: false },
  { key: 'tipoIngreso', label: 'Tipo Ingreso', defaultVisible: false },
  { key: 'fechaNCF', label: 'Fecha', defaultVisible: true },
  { key: 'fechaRetencion', label: 'Fecha Retención', defaultVisible: false },
  { key: 'monto', label: 'Monto Facturado', defaultVisible: true },
  { key: 'impuestoFacturado', label: 'ITBIS Facturado', defaultVisible: true },
  { key: 'isc', label: 'ISC', defaultVisible: false },
  { key: 'otrosImpuestos', label: 'Otros Impuestos', defaultVisible: false },
  { key: 'propinaLegal', label: 'Propina Legal', defaultVisible: false },
  { key: 'efectivo', label: 'Efectivo', defaultVisible: false },
  { key: 'banco', label: 'Banco', defaultVisible: false },
  { key: 'tarjetas', label: 'Tarjetas', defaultVisible: false },
  { key: 'ventasCredito', label: 'Venta Crédito', defaultVisible: false },
  { key: 'bonos', label: 'Bonos', defaultVisible: false },
  { key: 'otrasFormasVenta', label: 'Otras Ventas', defaultVisible: false },
  { key: 'turno', label: 'Turno', defaultVisible: false },
  { key: 'total', label: 'Total', defaultVisible: true },
];

const DEFAULT_VISIBLE_KEYS = COLUMNS_CONFIG
  .filter((c) => c.defaultVisible !== false)
  .map((c) => c.key);

const LS_VISIBLE_COLUMNS_KEY = 'reporte607_visibleColumns';

const Reporte607: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);

  const [data, setData] = useState<Reporte607DTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [exportando, setExportando] = useState(false);

  const rangoDefault = useMemo(() => ({
    desde: formatDateParam(dayjs().startOf('month').toDate()),
    hasta: formatDateParam(dayjs().toDate()),
  }), []);

  const [filtros, setFiltros] = useState<{ desde?: string; hasta?: string }>({});
  const [searchText, setSearchText] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LS_VISIBLE_COLUMNS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignorar */ }
    return DEFAULT_VISIBLE_KEYS;
  });

  useEffect(() => {
    setActiveModule('R607');
  }, [setActiveModule]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_VISIBLE_COLUMNS_KEY, JSON.stringify(visibleKeys));
    } catch { /* ignorar */ }
  }, [visibleKeys]);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadingError(false);
    try {
      const desde = filtros.desde ?? rangoDefault.desde;
      const hasta = filtros.hasta ?? rangoDefault.hasta;

      const [op, hr, vh, cons] = await Promise.all([
        reporte607Api.obtenerListado(Sucursal.OrensePlaza, desde, hasta),
        reporte607Api.obtenerListado(Sucursal.HiperRomana, desde, hasta),
        reporte607Api.obtenerListado(Sucursal.OrenseVillaHermosa, desde, hasta),
        reporte607Api.obtenerListado(Sucursal.Consolidado, desde, hasta, 'FAC,NC,ND'),
      ]);
      setData([...(op || []), ...(hr || []), ...(vh || []), ...(cons || [])]);
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al cargar el Reporte 607';
      message.error(msg);
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [filtros, rangoDefault]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  /* ───── Filtro local ───── */

  const filteredData = useMemo(() => {
    if (!searchText) return data;
    const t = searchText.toLowerCase();
    return data.filter((r) =>
      (r.rnc || '').toLowerCase().includes(t) ||
      (r.ncf || '').toLowerCase().includes(t) ||
      (r.ncfModificado || '').toLowerCase().includes(t) ||
      (r.documento || '').toLowerCase().includes(t) ||
      (r.razonSocial || '').toLowerCase().includes(t)
    );
  }, [data, searchText]);

  /* ───── Totales (recalculados sobre datos filtrados) ───── */

  const totalMonto = filteredData.reduce((sum, r) => sum + (r.monto || 0), 0);
  const totalItbis = filteredData.reduce((sum, r) => sum + (r.impuestoFacturado || 0), 0);
  const totalFormasPago = filteredData.reduce(
    (sum, r) =>
      sum +
      (r.efectivo || 0) +
      (r.banco || 0) +
      (r.tarjetas || 0) +
      (r.ventasCredito || 0) +
      (r.otrasFormasVenta || 0) +
      (r.bonos || 0),
    0
  );

  /* ───── Exportar Excel ───── */

  const handleExportarExcel = useCallback(async () => {
    if (data.length === 0) {
      message.warning('No hay datos para exportar');
      return;
    }
    setExportando(true);
    try {
      const companyName = await getCompanyName(sucursalActiva);
      const columnHeaders = [
        'Sucursal', 'RNC', 'Tipo ID', 'Documento', 'Razón Social',
        'NCF', 'NCF Modificado', 'Tipo Ingreso',
        'Fecha Comprobante', 'Fecha Retención',
        'Monto Facturado', 'ITBIS Facturado', 'ISC', 'Otros Impuestos', 'Propina Legal',
        'Efectivo', 'Banco', 'Tarjetas', 'Venta Crédito', 'Bonos', 'Otras Ventas', 'Turno',
      ];
      const dataRows = data.map((item) => [
        item.sucursal || '',
        item.rnc,
        item.rncid,
        item.documento || '',
        item.razonSocial || '',
        item.ncf,
        item.ncfModificado || '',
        item.tipoIngreso || '',
        item.fechaNCF,
        item.fechaRetencion,
        item.monto,
        item.impuestoFacturado,
        item.isc,
        item.otrosImpuestos,
        item.propinaLegal,
        item.efectivo,
        item.banco,
        item.tarjetas,
        item.ventasCredito,
        item.bonos,
        item.otrasFormasVenta,
        item.turno || '',
      ]);
      exportToExcel({
        companyName,
        columnHeaders,
        dataRows,
        sheetName: 'Reporte607',
        fileName: `Reporte607_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        columnWidths: columnHeaders.map(() => ({ wch: 18 })),
      });
      message.success('Reporte exportado exitosamente');
    } finally {
      setExportando(false);
    }
  }, [sucursalActiva, data]);

  /* ───── Columnas ───── */

  const allColumns: ColumnsType<Reporte607DTO> = [
    {
      title: 'Sucursal',
      dataIndex: 'sucursal',
      key: 'sucursal',
      width: 110,
    },
    {
      title: 'RNC',
      dataIndex: 'rnc',
      key: 'rnc',
      width: 130,
    },
    {
      title: 'Tipo ID',
      dataIndex: 'rncid',
      key: 'rncid',
      width: 90,
      align: 'center' as const,
    },
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 160,
      ellipsis: true,
    },
    {
      title: 'Razón Social',
      dataIndex: 'razonSocial',
      key: 'razonSocial',
      width: 220,
      ellipsis: true,
    },
    {
      title: 'NCF',
      dataIndex: 'ncf',
      key: 'ncf',
      width: 170,
    },
    {
      title: 'NCF Modificado',
      dataIndex: 'ncfModificado',
      key: 'ncfModificado',
      width: 170,
      render: (v: string) => v || '-',
    },
    {
      title: 'Tipo Ingreso',
      dataIndex: 'tipoIngreso',
      key: 'tipoIngreso',
      width: 110,
      render: (v: string) => v || '-',
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaNCF',
      key: 'fechaNCF',
      width: 120,
      render: (v: string) => formatDateRaw(v) || '-',
    },
    {
      title: 'Fecha Retención',
      dataIndex: 'fechaRetencion',
      key: 'fechaRetencion',
      width: 120,
      render: (v: string) => formatDateRaw(v) || '-',
    },
    columnaMoneda('Monto Facturado', 'monto'),
    columnaMoneda('ITBIS Facturado', 'impuestoFacturado'),
    columnaMoneda('ISC', 'isc'),
    columnaMoneda('Otros Impuestos', 'otrosImpuestos'),
    columnaMoneda('Propina Legal', 'propinaLegal'),
    columnaMoneda('Efectivo', 'efectivo'),
    columnaMoneda('Banco', 'banco'),
    columnaMoneda('Tarjetas', 'tarjetas'),
    columnaMoneda('Venta Crédito', 'ventasCredito'),
    columnaMoneda('Bonos', 'bonos'),
    columnaMoneda('Otras Ventas', 'otrasFormasVenta'),
    {
      title: 'Turno',
      dataIndex: 'turno',
      key: 'turno',
      width: 110,
    },
    {
      title: 'Total',
      key: 'total',
      width: 130,
      align: 'right' as const,
      render: (_: any, record: Reporte607DTO) => (
        <Text strong>{formatCurrency((record.monto || 0) + (record.impuestoFacturado || 0))}</Text>
      ),
    },
  ];

  const columns = allColumns.filter((col) => visibleKeys.includes(String(col.key)));

  const scrollX = Math.max(
    900,
    columns.reduce((sum, col) => sum + (typeof col.width === 'number' ? col.width : 120), 0)
  );

  return (
    <div>
      <ReporteToolbar
        onVolver={() => navigate('/')}
        onConsultar={cargarDatos}
        loading={loading}
        onExportarExcel={handleExportarExcel}
        exportando={exportando}
        extraLeft={
          <FiltrosDocumento
            filtros={filtros}
            onAplicar={(nuevos) => { setFiltros(nuevos); }}
            opcionesEstado={[]}
            rangoDefault={rangoDefault}
          />
        }
      />

      {loadingError && (
        <Alert
          message="Error al cargar el reporte"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={cargarDatos}>Reintentar</Button>}
        />
      )}

      <Spin spinning={loading}>
        <Card className="paces-card" size="small" title={
          <span style={{ fontSize: 16, fontWeight: 600 }}>Resumen</span>
        } style={{ marginBottom: 16 }}>
          <Space size={24} wrap>
            <div>
              <span className="paces-text-secondary">Total documentos: </span>
              <Text strong>{filteredData.length}</Text>
            </div>
            <div>
              <span className="paces-text-secondary">Monto facturado: </span>
              <Text strong>{formatCurrency(totalMonto)}</Text>
            </div>
            <div>
              <span className="paces-text-secondary">ITBIS facturado: </span>
              <Text strong>{formatCurrency(totalItbis)}</Text>
            </div>
            <div>
              <span className="paces-text-secondary">Total formas de pago: </span>
              <Text strong>{formatCurrency(totalFormasPago)}</Text>
            </div>
          </Space>
        </Card>

        <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }}
          styles={{ body: { padding: 0 } }}>
          <div style={{ padding: '16px 24px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
              <Input.Search
                placeholder="Buscar documento, RNC, NCF..."
                allowClear
                onSearch={(val) => setSearchText(val)}
                style={{ width: '100%', maxWidth: 400 }}
                prefix={<SearchOutlined className="paces-text-icon" />}
              />
              <div style={{ flex: 1 }} />
              <ColumnVisibilityToggle columns={COLUMNS_CONFIG} visibleKeys={visibleKeys} onChange={setVisibleKeys} iconOnly />
              <Button icon={<ReloadOutlined />} onClick={cargarDatos} />
            </div>
          </div>
          <Table<Reporte607DTO>
            className="paces-border-top paces-list-table"
            dataSource={filteredData}
            columns={columns}
            rowKey={(_, index) => `${index}`}
            size="small"
            pagination={{ pageSize: 20, showTotal: (t) => `${t} registros` }}
            scroll={{ x: scrollX }}
          />
        </Card>
      </Spin>
    </div>
  );
};

export default Reporte607;
