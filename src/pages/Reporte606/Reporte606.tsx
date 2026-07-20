import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Spin, Input, Button, Space, message, Alert, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { reporte606Api } from '../../api/reporte606Api';
import ReporteToolbar from '../../components/ReporteToolbar';
import FiltrosDocumento from '../../components/FiltrosDocumento/FiltrosDocumento';
import { formatCurrency, formatDateRaw, formatDateParam, toTitleCase } from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import type { Reporte606DTO } from '../../types/facturacion';
import dayjs from 'dayjs';

const { Text } = Typography;

const Reporte606: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);

  const [data, setData] = useState<Reporte606DTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [exportando, setExportando] = useState(false);

  const rangoDefault = useMemo(() => ({
    desde: formatDateParam(dayjs().startOf('month').toDate()),
    hasta: formatDateParam(dayjs().toDate()),
  }), []);

  const [filtros, setFiltros] = useState<{ desde?: string; hasta?: string }>({});
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    setActiveModule('R606');
  }, [setActiveModule]);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadingError(false);
    try {
      const desde = filtros.desde ?? rangoDefault.desde;
      const hasta = filtros.hasta ?? rangoDefault.hasta;
      const res = await reporte606Api.obtenerListado(
        sucursalActiva,
        dayjs(desde, 'YYYYMMDDHHmmss'),
        dayjs(hasta, 'YYYYMMDDHHmmss')
      );
      setData(res || []);
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al cargar el Reporte 606';
      message.error(msg);
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, filtros, rangoDefault]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  /* ───── Filtro local ───── */

  const filteredData = useMemo(() => {
    if (!searchText) return data;
    const t = searchText.toLowerCase();
    return data.filter((r) =>
      (r.documento || '').toLowerCase().includes(t) ||
      (r.razonSocial || '').toLowerCase().includes(t) ||
      (r.rnc || '').toLowerCase().includes(t) ||
      (r.ncf || '').toLowerCase().includes(t)
    );
  }, [data, searchText]);

  /* ───── Totales ───── */

  const totalFacturado = filteredData.reduce((sum, r) => sum + (r.totalFacturado || 0), 0);
  const totalItbis = filteredData.reduce((sum, r) => sum + (r.itbisFacturado || 0), 0);
  const totalGeneral = filteredData.reduce((sum, r) => sum + (r.totalFacturado || 0) + (r.itbisFacturado || 0), 0);

  /* ───── Exportar Excel ───── */

  const handleExportarExcel = useCallback(async () => {
    if (filteredData.length === 0) {
      message.warning('No hay datos para exportar');
      return;
    }
    setExportando(true);
    try {
      const companyName = await getCompanyName(sucursalActiva);
      const columnHeaders = [
        'Línea', 'RNC/Cédula', 'Tipo ID', 'Clasificación', 'NCF', 'NCF Modificado',
        'Fecha Comprobante', 'Fecha Pago', 'Monto Servicio', 'Monto Bienes',
        'Total Facturado', 'ITBIS Facturado', 'ITBIS Retenido', 'ITBIS Proporcional',
        'ITBIS al Costo', 'ITBIS por Adelantar', 'ITBIS Percibido',
        'Tipo Retención ISR', 'Monto Retención Renta', 'ISR Percibido',
        'ISC', 'Otros Impuestos', 'Propina Legal', 'Forma de Pago',
        'Razón Social', 'Documento',
      ];
      const dataRows = filteredData.map((item) => [
        item.linea,
        item.rnc,
        item.tipoID,
        item.clasCgncf,
        item.ncf,
        item.ncfModificado || '',
        item.fechaComprobante,
        item.fechaPago,
        item.montoServicio,
        item.montoBienes,
        item.totalFacturado,
        item.itbisFacturado,
        item.itbisRetenido,
        item.itbisProporcional,
        item.itbisCostos,
        item.itbisAdelantar,
        item.itbisPercibido,
        item.tipoRetencionISR,
        item.montoRetencionRenta,
        item.isrPercibido,
        item.isc,
        item.otrosImpuestos,
        item.propinaLegal,
        item.formaPago,
        item.razonSocial,
        item.documento,
      ]);
      exportToExcel({
        companyName,
        columnHeaders,
        dataRows,
        sheetName: 'Reporte606',
        columnWidths: columnHeaders.map(() => ({ wch: 18 })),
      });
      message.success('Reporte exportado exitosamente');
    } finally {
      setExportando(false);
    }
  }, [sucursalActiva, filteredData]);

  /* ───── Columnas ───── */

  const columns: ColumnsType<Reporte606DTO> = [
    {
      title: 'Fecha',
      dataIndex: 'fechaComprobante',
      key: 'fechaComprobante',
      width: 100,
      render: (v: string) => formatDateRaw(v),
    },
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 170,
      render: (v: string) => <a className="paces-doc-link">{v || '-'}</a>,
    },
    {
      title: 'Suplidor',
      dataIndex: 'razonSocial',
      key: 'razonSocial',
      width: 200,
      ellipsis: true,
      render: (v: string) => toTitleCase(v || ''),
    },
    {
      title: 'RNC',
      dataIndex: 'rnc',
      key: 'rnc',
      width: 130,
    },
    {
      title: 'NCF',
      dataIndex: 'ncf',
      key: 'ncf',
      width: 170,
    },
    {
      title: 'Sub Total',
      dataIndex: 'totalFacturado',
      key: 'totalFacturado',
      width: 120,
      align: 'right' as const,
      render: (v: number) => formatCurrency(v || 0),
    },
    {
      title: 'Impuestos',
      dataIndex: 'itbisFacturado',
      key: 'itbisFacturado',
      width: 120,
      align: 'right' as const,
      render: (v: number) => formatCurrency(v || 0),
    },
    {
      title: 'Total',
      key: 'total',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: Reporte606DTO) => (
        <Text strong>{formatCurrency((record.totalFacturado || 0) + (record.itbisFacturado || 0))}</Text>
      ),
    },
  ];

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
              <span className="paces-text-secondary">Total facturado: </span>
              <Text strong>{formatCurrency(totalFacturado)}</Text>
            </div>
            <div>
              <span className="paces-text-secondary">Total ITBIS: </span>
              <Text strong>{formatCurrency(totalItbis)}</Text>
            </div>
            <div>
              <span className="paces-text-secondary">Total general: </span>
              <Text strong>{formatCurrency(totalGeneral)}</Text>
            </div>
          </Space>
        </Card>

        <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }}
          styles={{ body: { padding: 0 } }}>
          <div style={{ padding: '16px 24px 0' }}>
            <Input.Search
              placeholder="Buscar documento, suplidor..."
              allowClear
              onSearch={(val) => setSearchText(val)}
              style={{ width: 400, marginBottom: 16 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
          </div>
          <Table<Reporte606DTO>
            className="paces-border-top paces-list-table"
            dataSource={filteredData}
            columns={columns}
            rowKey="linea"
            size="small"
            pagination={{ pageSize: 20, showTotal: (t) => `${t} registros` }}
            scroll={{ x: 1200 }}
          />
        </Card>
      </Spin>
    </div>
  );
};

export default Reporte606;
