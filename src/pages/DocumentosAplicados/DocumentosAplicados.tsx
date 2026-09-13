import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Typography, Select, Segmented, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { transaccionApi } from '../../api/transaccionApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { formatCurrency, formatDateRaw, formatDateParam, toTitleCase } from '../../utils/formats';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { documentosReporteApi } from '../../api/documentosReporteApi';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import type { ApiResponse } from '../../types/auth';
import type { TransaccionVistaDTO } from '../../types/transaccion';

interface DocumentoOption {
  codigo: string;
  descripcion: string;
  tipoEntidad?: string;
}

const { Text } = Typography;

const CODIGO_PANTALLA = 'RDocAplicado';

/** Mapeo de prefijo de documento -> ruta de detalle según la entidad del módulo */
const DOC_ROUTE_MAP_SUP: Record<string, string> = {
  ENP: 'FENP',
  RDE: 'FRDE',
  NC: 'FNCSUP',
  ND: 'FNDSUP',
  DBA: 'FDBASUP',
  SPA: 'FSPA',
};

const DOC_ROUTE_MAP_CLI: Record<string, string> = {
  FAC: 'FFAC',
  NC: 'FNCCLI',
  ND: 'FNDCLI',
  DBA: 'FDBACLI',
  RI: 'FRI',
};

const DocumentosAplicados: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const sucursalSeguridad = useAuthStore((s: any) => s.securitySucursal);
  const pantallas = useAuthStore((s: any) => s.usuario?.pantallas || []);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);

  const [data, setData] = useState<TransaccionVistaDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRow, setSelectedRow] = useState<TransaccionVistaDTO | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filtros, setFiltros] = useState<{ desde?: string; hasta?: string }>({});
  const [documentos, setDocumentos] = useState<DocumentoOption[]>([]);
  const [documentosCargados, setDocumentosCargados] = useState(false);
  const [documentosError, setDocumentosError] = useState(false);
  const [tipoDoc, setTipoDoc] = useState<string | undefined>(undefined);
  const [aplicado, setAplicado] = useState<boolean>(true);

  const moduloID = useMemo(() => {
    const qs = searchParams.get('modulo');
    if (qs) return Number(qs);
    const pantalla = pantallas.find((p: any) => p.codigo === CODIGO_PANTALLA);
    return pantalla?.modulos?.[0]?.id as number | undefined;
  }, [pantallas, searchParams]);

  const rangoDefault = useMemo(() => ({
    desde: formatDateParam(new Date(Date.now() - 30 * 86400000)),
    hasta: formatDateParam(new Date()),
  }), []);

  const tipoEntidad = useMemo(() =>
    documentos.find((d) => d.tipoEntidad?.trim())?.tipoEntidad?.trim() || undefined,
  [documentos]);

  useEffect(() => {
    setDocumentos([]);
    setDocumentosCargados(false);
    setDocumentosError(false);
    setLoadingError(false);
    setData([]);
    setTotal(0);
    setSelectedRow(null);

    if (moduloID === undefined || sucursalSeguridad === undefined) return;

    let activo = true;
    apiClient.get<ApiResponse<DocumentoOption[]>>(`/Pantalla/${sucursalSeguridad}/modulo/${moduloID}/documentos`)
      .then((res) => {
        if (!activo) return;
        setDocumentos(res.data.data || []);
      })
      .catch((err) => {
        if (!activo) return;
        setDocumentosError(true);
        setLoadingError(true);
        console.warn('Error al cargar documentos para filtro', err);
      })
      .finally(() => {
        if (activo) setDocumentosCargados(true);
      });

    return () => { activo = false; };
  }, [sucursalSeguridad, moduloID]);

  const cargarDatos = useCallback(async () => {
    if (moduloID === undefined || !documentosCargados || documentosError || documentos.length === 0) return;

    setLoading(true);
    try {
      const desde = filtros.desde ?? rangoDefault.desde;
      const hasta = filtros.hasta ?? rangoDefault.hasta;
      const docsStr = documentos.length > 0 ? documentos.map((d) => d.codigo).join(',') : '';
      const result = await transaccionApi.obtenerAplicados(sucursalActiva, desde, hasta, aplicado, tipoDoc || undefined, docsStr, page, pageSize, tipoEntidad);
      setData(result.data);
      setTotal(result.total);
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, rangoDefault, filtros, tipoDoc, aplicado, documentos, documentosCargados, documentosError, moduloID, page, pageSize, tipoEntidad]);

  useEffect(() => {
    cargarDatos();
  }, [refreshTrigger, cargarDatos]);

  useEffect(() => {
    setActiveModule(CODIGO_PANTALLA);
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleRefresh = () => {
    setLoadingError(false);
    setRefreshTrigger((n) => n + 1);
  };

  const handleRowClick = (record: TransaccionVistaDTO) => {
    setSelectedRow(record);
  };

  const filteredData = useMemo(() => {
    if (!searchText) return data;
    const t = searchText.toLowerCase();
    return data.filter((r) =>
      (r.documento || '').toLowerCase().includes(t) ||
      (r.entidad || '').toLowerCase().includes(t) ||
      (r.concepto || '').toLowerCase().includes(t)
    );
  }, [data, searchText]);

  const handleImprimir = async () => {
    if (filteredData.length === 0) return;

    try {
      const desde = filtros.desde ?? rangoDefault.desde;
      const hasta = filtros.hasta ?? rangoDefault.hasta;
      const items = filteredData.map((item) => {
        const partes = (item.documento || '').split('-');
        return {
          fechaDocumento: item.fecha,
          fechaEntrega: null,
          tipoDocumento: partes[0] || '',
          noDocumento: partes.slice(1).join('-'),
          total: item.total ?? 0,
          suplidorNombre: item.entidad ?? '',
          creadoPorNombre: item.creadoPor ?? '',
        };
      });
      const titulo = aplicado
        ? 'REPORTE DE DOCUMENTOS APLICADOS'
        : 'REPORTE DE DOCUMENTOS NO APLICADOS';
      const blob = await documentosReporteApi.imprimirReporteConDatos(
        sucursalActiva,
        titulo,
        items,
        desde,
        hasta
      );
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al generar el reporte');
    }
  };

  const handleExportarExcel = async () => {
    if (filteredData.length === 0) return;

    try {
      const companyName = await getCompanyName(sucursalActiva);
      const aplicadoFecha = aplicado ? 'Fecha Aplicado' : 'Fecha Autorizado';
      const aplicadoPor = aplicado ? 'Aplicado por' : 'Autorizado por';
      const dataRows = filteredData.map((item) => [
        item.documento ?? '',
        formatDateRaw(item.fecha),
        toTitleCase(item.entidad ?? ''),
        toTitleCase(item.concepto ?? ''),
        item.total ?? 0,
        item.fechaAccion ? formatDateRaw(item.fechaAccion) : '',
        item.creadoPor ?? '',
        item.estado ?? '',
      ]);

      exportToExcel({
        fileName: `DocumentosAplicados_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        sheetName: 'DocumentosAplicados',
        companyName,
        columnHeaders: ['Documento', 'Fecha', 'Entidad', 'Concepto', 'Total', aplicadoFecha, aplicadoPor, 'Estado'],
        dataRows,
      });
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al exportar a Excel');
    }
  };

  const columns: ColumnsType<TransaccionVistaDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 200,
      fixed: 'left',
      render: (doc: string, record: TransaccionVistaDTO) => {
        const prefijo = (doc || '').split('-')[0] || '';
        const rutas = tipoEntidad === 'CLI' ? DOC_ROUTE_MAP_CLI : DOC_ROUTE_MAP_SUP;
        const ruta = rutas[prefijo] || 'FAsientoContable';
        return (
          <Link to={`/${ruta}/${record.id}`} className="paces-doc-link">
            <Text strong>{doc}</Text>
          </Link>
        );
      },
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
      dataIndex: 'entidad',
      key: 'entidad',
      ellipsis: true,
      render: (v: string) => <Text>{toTitleCase(v || '')}</Text>,
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      key: 'concepto',
      width: 320,
      ellipsis: true,
      render: (v: string) => <Text>{toTitleCase(v || '')}</Text>,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 130,
      align: 'right',
      render: (v: number) => <Text strong>{formatCurrency(v)}</Text>,
    },
    {
      title: aplicado ? 'Fecha Aplicado' : 'Fecha Autorizado',
      dataIndex: 'fechaAccion',
      key: 'fechaAccion',
      width: 130,
      render: (v: string) => (v ? <Text>{formatDateRaw(v)}</Text> : <Text>-</Text>),
    },
    {
      title: aplicado ? 'Aplicado por' : 'Autorizado por',
      dataIndex: 'creadoPor',
      key: 'creadoPor',
      width: 220,
      render: (v: string) => <Text>{v || '-'}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 110,
      render: (est: number) => <EstadoColumnCell estado={est} />,
    },
  ];

  const docOptions = useMemo(() =>
    documentos.map((d) => ({ value: d.codigo, label: `${d.codigo} - ${d.descripcion}` })),
  [documentos]);

  return (
    <DocumentListadoLayout<TransaccionVistaDTO>
      columns={columns}
      data={filteredData}
      rowKey="id"
      loading={loading}
      total={total}
      page={page}
      pageSize={pageSize}
      scrollX={1200}
      selectedRowId={selectedRow?.id}
      loadingError={loadingError}
      errorMessage={aplicado ? 'Error al cargar documentos aplicados' : 'Error al cargar documentos no aplicados'}
      onRefresh={handleRefresh}
      onRowClick={handleRowClick}
      onPageChange={setPage}
      toolbarProps={{
        showFiltros: true,
        filtros,
        rangoDefault,
        opcionesEstado: [],
        onFiltrosAplicar: (nuevos) => { setFiltros(nuevos); setPage(1); },
        searchPlaceholder: 'Buscar documento, entidad...',
        onSearch: handleSearch,
        pageSize,
        onPageSizeChange: (v) => { setPageSize(v); setPage(1); },
        onRefresh: handleRefresh,
        showImprimir: true,
        imprimirDisabled: filteredData.length === 0,
        onImprimir: handleImprimir,
        showExportarExcel: true,
        exportarExcelDisabled: filteredData.length === 0,
        onExportarExcel: handleExportarExcel,
        extraLeft: (
          <>
            <Segmented
              value={aplicado ? 'aplicados' : 'noaplicados'}
              onChange={(val) => {
                setAplicado(val === 'aplicados');
                setPage(1);
              }}
              options={[
                { label: 'Aplicados', value: 'aplicados' },
                { label: 'No aplicados', value: 'noaplicados' },
              ]}
            />
            <Select
              placeholder="Documento"
              allowClear
              showSearch
              style={{ minWidth: 280 }}
              value={tipoDoc}
              onChange={(val) => { setTipoDoc(val); setPage(1); }}
              options={docOptions}
              size="small"
              filterOption={(input, option) =>
                (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </>
        ),
      }}
    />
  );
};

export default DocumentosAplicados;
