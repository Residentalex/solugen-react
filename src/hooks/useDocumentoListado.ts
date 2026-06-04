import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { apiClient } from '../api/client';
import { formatDateParam } from '../utils/formats';

const DIAS_POR_DEFECTO = 30;
const FILAS_POR_PAGINA = 25;

export interface DocumentoListadoConfig<T> {
  modulo: string;

  fetchVista: (
    sucursal: number,
    desde: string,
    hasta: string,
    filas: number,
    salto: number,
    estado?: number
  ) => Promise<T[]>;

  fetchFiltrar: (
    sucursal: number,
    params: Record<string, any>
  ) => Promise<T[]>;

  reporteUrl: (sucursal: number, id: number) => string;
  tituloReporte: string;
  tituloError: string;
}

export interface DocumentoListadoState<T> {
  data: T[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  searchText: string;
  selectedRow: T | null;
  pdfPreview: { url: string; title: string } | null;
  loadingError: boolean;
  filtros: { desde?: string; hasta?: string; estado?: number };
}

export function useDocumentoListado<T extends { id: number; documento?: string }>(
  config: DocumentoListadoConfig<T>
) {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);

  const configRef = useRef(config);
  configRef.current = config;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(FILAS_POR_PAGINA);
  const [searchText, setSearchText] = useState('');
  const [selectedRow, setSelectedRow] = useState<T | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null);
  const [loadingError, setLoadingError] = useState(false);
  const [filtros, setFiltros] = useState<{ desde?: string; hasta?: string; estado?: number }>({});

  const rangoDefault = useMemo(() => ({
    desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
    hasta: formatDateParam(new Date()),
  }), []);

  const cargarDatos = useCallback(async (pagina: number, filas: number, busqueda: string) => {
    setLoading(true);
    try {
      const desde = filtros.desde ?? rangoDefault.desde;
      const hasta = filtros.hasta ?? rangoDefault.hasta;
      const cfg = configRef.current;
      let resultados: T[];

      if (busqueda.length > 2) {
        resultados = await cfg.fetchFiltrar(sucursalActiva, {
          cantidad: filas,
          salto: (pagina - 1) * filas,
          desde,
          hasta,
          documento: busqueda,
          nCF: busqueda,
          concepto: busqueda,
          entidad: busqueda,
          almacen: busqueda,
        });
      } else {
        resultados = await cfg.fetchVista(
          sucursalActiva,
          desde,
          hasta,
          filas,
          (pagina - 1) * filas,
          filtros.estado
        );
      }

      setData(resultados);
      setTotal(resultados.length < filas ? (pagina - 1) * filas + resultados.length : pagina * filas + 1);
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, filtros.desde, filtros.hasta, filtros.estado]);

  useEffect(() => {
    cargarDatos(page, pageSize, searchText);
  }, [page, pageSize, searchText, refreshTrigger, filtros, cargarDatos]);

  useEffect(() => {
    const cfg = configRef.current;
    setActiveModule(cfg.modulo);
    return () => {
      resetToolbar();
    };
  }, [setActiveModule, resetToolbar, navigate]);

  const handleSearch = useCallback((value: string) => {
    setSearchText(value);
    setPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    setLoadingError(false);
    setRefreshTrigger(n => n + 1);
  }, []);

  const handleImprimir = useCallback(async () => {
    if (!selectedRow) {
      message.warning('Seleccione un documento primero');
      return;
    }
    const cfg = configRef.current;
    try {
      const res = await apiClient.get(cfg.reporteUrl(sucursalActiva, selectedRow.id), {
        responseType: 'blob',
      });
      const blobUrl = URL.createObjectURL(res.data);
      setPdfPreview({ url: blobUrl, title: `${cfg.tituloReporte}-${selectedRow.documento}` });
    } catch {
      message.error('Error al generar el PDF');
    }
  }, [selectedRow, sucursalActiva]);

  const handleTableChange = useCallback((pagination: any) => {
    setPage(pagination.current);
  }, []);

  const handleRowClick = useCallback((record: T) => {
    setSelectedRow(record);
  }, []);

  const handlePageSizeChange = useCallback((value: number) => {
    setPageSize(value);
    setPage(1);
  }, []);

  const handleFiltrosAplicar = useCallback((nuevos: { desde?: string; hasta?: string; estado?: number }) => {
    setFiltros(nuevos);
    setPage(1);
  }, []);

  const handlePdfClose = useCallback(() => {
    if (pdfPreview) URL.revokeObjectURL(pdfPreview.url);
    setPdfPreview(null);
  }, [pdfPreview]);

  const goToPage = useCallback((page: number) => {
    setPage(page);
  }, []);

  const puedeEditar = selectedRow
    ? (selectedRow as any).periodo !== 6 && (selectedRow as any).estado === 0
    : false;

  return {
    state: {
      data, loading, total, page, pageSize, searchText,
      selectedRow, pdfPreview, loadingError, filtros,
    } as DocumentoListadoState<T>,
    rangoDefault,
    puedeEditar,
    actions: {
      cargarDatos,
      handleSearch,
      handleRefresh,
      handleImprimir,
      handleTableChange,
      handleRowClick,
      handlePageSizeChange,
      handleFiltrosAplicar,
      handlePdfClose,
      goToPage,
      setSelectedRow,
      setPage,
      setPageSize,
    },
  };
}
