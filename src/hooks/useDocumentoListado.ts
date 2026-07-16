import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { apiClient } from '../api/client';
import { formatDateParam } from '../utils/formats';

const DIAS_POR_DEFECTO = 30;
const FILAS_POR_PAGINA = 25;

export interface DocumentoListadoConfig<T> {
  modulo: string;
  rangoDefaultOverride?: { desde: string; hasta: string };

  fetchVista: (
    sucursal: number,
    desde: string,
    hasta: string,
    filas: number,
    salto: number,
    estado?: number
  ) => Promise<{ data: T[]; total: number }>;

  fetchFiltrar: (
    sucursal: number,
    params: Record<string, any>
  ) => Promise<{ data: T[]; total: number }>;

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

  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(FILAS_POR_PAGINA);
  const [searchText, setSearchText] = useState(() => searchParams.get('busqueda') || '');
  const [selectedRow, setSelectedRow] = useState<T | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null);
  const [loadingError, setLoadingError] = useState(false);
  const filtros = useMemo(() => ({
    desde: searchParams.get('desde') || undefined,
    hasta: searchParams.get('hasta') || undefined,
    estado: searchParams.has('estado') ? Number(searchParams.get('estado')) : undefined,
  }), [searchParams]);

  const tipoDoc = useMemo(() => searchParams.get('tipoDoc') || undefined, [searchParams]);

  const rangoDefault = useMemo(() =>
    configRef.current.rangoDefaultOverride ?? {
      desde: formatDateParam(new Date(Date.now() - 30 * 86400000)),
      hasta: formatDateParam(new Date()),
    }, []);

  const filtrosRef = useRef(filtros);
  filtrosRef.current = filtros;

  const cargarDatos = useCallback(async (pagina: number, filas: number, busqueda: string) => {
    setLoading(true);
    try {
      const cfg = configRef.current;
      const f = filtrosRef.current;
      let desde = f.desde ?? rangoDefault.desde;
      let hasta = f.hasta ?? rangoDefault.hasta;

      if (busqueda.length > 2 && cfg.modulo !== 'FPV') {
        if (!f.desde) desde = '19000101000000';
        if (!f.hasta) hasta = '20991231235959';
      }

      let result: { data: T[]; total: number };

      if (busqueda.length > 2) {
        result = await cfg.fetchFiltrar(sucursalActiva, {
          cantidad: filas,
          salto: (pagina - 1) * filas,
          desde,
          hasta,
          documento: busqueda,
          nCF: busqueda,
          concepto: busqueda,
          entidad: busqueda,
          referencia: busqueda,
          almacen: busqueda,
        });
      } else {
        result = await cfg.fetchVista(
          sucursalActiva,
          desde,
          hasta,
          filas,
          (pagina - 1) * filas,
          f.estado
        );
      }

      setData(result.data);
      setTotal(result.total);
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, rangoDefault, config.modulo]);

  useEffect(() => {
    cargarDatos(page, pageSize, searchText);
  }, [page, pageSize, searchText, refreshTrigger, filtros, tipoDoc, cargarDatos]);

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
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('busqueda', value);
    } else {
      params.delete('busqueda');
    }
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

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
    const params = new URLSearchParams();
    if (nuevos.desde) params.set('desde', nuevos.desde);
    if (nuevos.hasta) params.set('hasta', nuevos.hasta);
    if (nuevos.estado !== undefined && nuevos.estado !== null) params.set('estado', nuevos.estado.toString());
    const curBusqueda = searchParams.get('busqueda');
    if (curBusqueda) params.set('busqueda', curBusqueda);
    const curTipoDoc = searchParams.get('tipoDoc');
    if (curTipoDoc) params.set('tipoDoc', curTipoDoc);
    setSearchParams(params, { replace: true });
    setPage(1);
  }, [searchParams, setSearchParams]);

  const handleSetTipoDoc = useCallback((value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('tipoDoc', value);
    } else {
      params.delete('tipoDoc');
    }
    setSearchParams(params, { replace: true });
    setPage(1);
  }, [searchParams, setSearchParams]);

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
    tipoDoc,
    actions: {
      cargarDatos,
      handleSearch,
      handleRefresh,
      handleImprimir,
      handleTableChange,
      handleRowClick,
      handlePageSizeChange,
      handleFiltrosAplicar,
      handleSetTipoDoc,
      handlePdfClose,
      goToPage,
      setSelectedRow,
      setPage,
      setPageSize,
    },
  };
}
