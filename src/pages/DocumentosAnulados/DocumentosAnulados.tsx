import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Typography, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { transaccionApi } from '../../api/transaccionApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { formatCurrency, formatDateRaw, formatDateParam, toTitleCase } from '../../utils/formats';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import type { ApiResponse } from '../../types/auth';
import type { TransaccionVistaDTO } from '../../types/transaccion';

interface DocumentoOption {
  codigo: string;
  descripcion: string;
}

const { Text } = Typography;

const CODIGO_PANTALLA = 'RDocumentosAnulados';

const DocumentosAnulados: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const sucursalSeguridad = useAuthStore((s: any) => s.usuario?.sucursalActiva);
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
  const [tipoDoc, setTipoDoc] = useState<string | undefined>(undefined);

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

  useEffect(() => {
    if (moduloID === undefined || sucursalSeguridad === undefined) return;
    apiClient.get<ApiResponse<DocumentoOption[]>>(`/Pantalla/${sucursalSeguridad}/modulo/${moduloID}/documentos`)
      .then((res) => setDocumentos(res.data.data || []))
      .catch(() => {});
  }, [sucursalSeguridad, moduloID]);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const desde = filtros.desde ?? rangoDefault.desde;
      const hasta = filtros.hasta ?? rangoDefault.hasta;
      const docsStr = documentos.length > 0 ? documentos.map((d) => d.codigo).join(',') : '';
      const result = await transaccionApi.obtenerAnulados(sucursalActiva, desde, hasta, tipoDoc || undefined, docsStr, page, pageSize);
      setData(result.data);
      setTotal(result.total);
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, rangoDefault, filtros, tipoDoc, moduloID, documentos, page, pageSize]);

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

  const columns: ColumnsType<TransaccionVistaDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 200,
      fixed: 'left',
      render: (doc: string, record: TransaccionVistaDTO) => (
        <Link to={`/FAsientoContable/${record.id}`} className="paces-doc-link">
          <Text strong>{doc}</Text>
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
      scrollX={1000}
      selectedRowId={selectedRow?.id}
      loadingError={loadingError}
      errorMessage="Error al cargar documentos anulados"
      onRefresh={handleRefresh}
      onRowClick={handleRowClick}
      onPageChange={setPage}
      pdfPreview={null}
      onPdfClose={() => {}}
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
        extraLeft: (
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
        ),
      }}
    />
  );
};

export default DocumentosAnulados;
