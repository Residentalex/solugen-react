import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Table, Typography, Select, Input, Button, Spin, Alert, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { transaccionApi } from '../../api/transaccionApi';
import { documentosApi } from '../../api/documentosApi';
import ReporteToolbar from '../../components/ReporteToolbar';
import FiltrosDocumento from '../../components/FiltrosDocumento/FiltrosDocumento';
import { formatCurrency, formatDateRaw, formatDateParam, toTitleCase } from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import type { DocumentoSinAsientoDTO } from '../../types/integridad';
import type { DocumentoDTO } from '../../types/documento';
import dayjs from 'dayjs';

const { Text } = Typography;

const DocumentoSinAsiento: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const sucursalesDisponibles = useCompanyStore((s: any) => s.data.sucursales);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);

  const [data, setData] = useState<DocumentoSinAsientoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [exportando, setExportando] = useState(false);
  const rangoDefault = useMemo(() => ({
    desde: formatDateParam(dayjs().subtract(30, 'day').toDate()),
    hasta: formatDateParam(dayjs().toDate()),
  }), []);

  const [filtros, setFiltros] = useState<{ desde?: string; hasta?: string }>({});
  const [searchText, setSearchText] = useState('');
  const [sucursalFiltro, setSucursalFiltro] = useState<string | undefined>(undefined);
  const [tipoDoc, setTipoDoc] = useState<string | undefined>(undefined);
  const [documentos, setDocumentos] = useState<DocumentoDTO[]>([]);

  useEffect(() => {
    documentosApi.obtenerListado(sucursalActiva).then(setDocumentos).catch(() => {});
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('RDocumentoSinAsiento');
  }, [setActiveModule]);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadingError(false);
    try {
      const desde = filtros.desde ?? rangoDefault.desde;
      const hasta = filtros.hasta ?? rangoDefault.hasta;
      const result = await transaccionApi.obtenerDocumentosSinAsiento(
        sucursalActiva, desde, hasta,
        tipoDoc || undefined,
        undefined,
        sucursalFiltro
      );
      setData(result);
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al cargar documentos sin asiento';
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, filtros, tipoDoc, sucursalFiltro, rangoDefault]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  /* ───── Filtro local ───── */

  const filteredData = useMemo(() => {
    if (!searchText) return data;
    const t = searchText.toLowerCase();
    return data.filter((r) =>
      `${r.tipoDocumento || ''}-${r.noDocumento || ''}`.toLowerCase().includes(t) ||
      (r.entidad || '').toLowerCase().includes(t) ||
      (r.concepto || '').toLowerCase().includes(t) ||
      (r.sucursalDocumento || '').toLowerCase().includes(t)
    );
  }, [data, searchText]);

  /* ───── Totales ───── */

  const totalDocumentos = filteredData.length;
  const totalMonto = filteredData.reduce((sum, r) => sum + (r.total || 0), 0);

  /* ───── Exportar Excel ───── */

  const handleExportarExcel = useCallback(async () => {
    if (filteredData.length === 0) {
      return;
    }
    setExportando(true);
    try {
      const companyName = await getCompanyName(sucursalActiva);
      const columnHeaders = ['Documento', 'Fecha', 'Entidad', 'Concepto', 'Sucursal', 'Total', 'Estado'];
      const dataRows = filteredData.map((item) => [
        `${item.tipoDocumento || ''}-${item.noDocumento || ''}`,
        item.fecha,
        item.entidad || '',
        item.concepto || '',
        item.sucursalDocumento || '',
        item.total ?? 0,
        item.estado || '',
      ]);
      exportToExcel({
        companyName,
        columnHeaders,
        dataRows,
        sheetName: 'DocumentosSinAsiento',
        columnWidths: columnHeaders.map(() => ({ wch: 20 })),
      });
    } finally {
      setExportando(false);
    }
  }, [sucursalActiva, filteredData]);

  /* ───── Exportar PDF (window.print) ───── */

  const handleExportarPDF = useCallback(() => {
    window.print();
  }, []);

  /* ───── Columnas ───── */

  const columns: ColumnsType<DocumentoSinAsientoDTO> = [
    {
      title: 'Documento',
      key: 'documento',
      width: 180,
      fixed: 'left',
      render: (_, record) => (
        <Link to={`/FAsientoContable/${record.id}`} className="paces-doc-link">
          <Text strong>{record.tipoDocumento || ''}-{record.noDocumento || ''}</Text>
        </Link>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (v: string) => <Text>{formatDateRaw(v)}</Text>,
    },
    {
      title: 'Entidad',
      key: 'entidad',
      ellipsis: true,
      render: (_, record) => (
        <Text>{toTitleCase(record.entidad || '')}</Text>
      ),
    },
    {
      title: 'Concepto',
      key: 'concepto',
      width: 260,
      ellipsis: true,
      render: (_, record) => (
        <Text>{toTitleCase(record.concepto || '')}</Text>
      ),
    },
    {
      title: 'Sucursal',
      dataIndex: 'sucursalDocumento',
      key: 'sucursal',
      width: 140,
      render: (v: string) => <Text>{v || ''}</Text>,
    },
    {
      title: 'Total',
      key: 'total',
      width: 130,
      align: 'right' as const,
      render: (_: any, record: DocumentoSinAsientoDTO) => (
        <Text>{formatCurrency(record.total ?? 0)}</Text>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 110,
      render: (est: string | number) => <EstadoColumnCell estado={est} />,
    },
  ];

  /* ───── Opciones tipo doc ───── */

  const docOptions = useMemo(() =>
    documentos.map((d) => ({ value: d.codigo, label: `${d.codigo} - ${d.nombre || ''}` })),
  [documentos]);

  /* ───── Filtro popover ───── */

  const filtrosPopover = (
    <>
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>Sucursal</div>
        <Select
          style={{ width: '100%' }}
          placeholder="Todas"
          allowClear
          value={sucursalFiltro}
          onChange={(val) => setSucursalFiltro(val)}
          options={(sucursalesDisponibles || [])
            .filter((s: any) => s.sucursal !== undefined)
            .map((s: any) => ({
              value: String(s.sucursal),
              label: s.nombre || s.codigo || `Sucursal ${s.sucursal}`,
            }))}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>Documento</div>
        <Select
          style={{ width: '100%' }}
          placeholder="Todos"
          allowClear
          showSearch
          value={tipoDoc}
          onChange={(val) => setTipoDoc(val)}
          options={docOptions}
          filterOption={(input, option) =>
            (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />
      </div>
    </>
  );

  return (
    <div>
      <ReporteToolbar
        onVolver={() => navigate('/')}
        onConsultar={cargarDatos}
        loading={loading}
        onExportarExcel={handleExportarExcel}
        onExportarPDF={handleExportarPDF}
        exportando={exportando}
        extraLeft={
          <FiltrosDocumento
            filtros={filtros}
            onAplicar={(nuevos) => { setFiltros(nuevos); }}
            opcionesEstado={[]}
            rangoDefault={rangoDefault}
            extraFiltros={filtrosPopover}
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
              <Text strong>{totalDocumentos}</Text>
            </div>
            <div>
              <span className="paces-text-secondary">Total sin asiento: </span>
              <Text strong>{formatCurrency(totalMonto)}</Text>
            </div>
          </Space>
        </Card>

        <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }}
          styles={{ body: { padding: 0 } }}>
          <div style={{ padding: '16px 24px 0' }}>
            <Input.Search
              placeholder="Buscar documento, entidad..."
              allowClear
              onSearch={(val) => setSearchText(val)}
              style={{ width: 400, marginBottom: 16 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
          </div>
          <Table<DocumentoSinAsientoDTO>
            className="paces-border-top paces-list-table"
            dataSource={filteredData}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 25, showTotal: (t) => `${t} registros` }}
            scroll={{ x: 1100 }}
          />
        </Card>
      </Spin>
    </div>
  );
};

export default DocumentoSinAsiento;
