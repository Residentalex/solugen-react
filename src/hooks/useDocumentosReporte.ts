import { useState, useCallback } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import { useAuthStore } from '../stores/authStore';
import type { MovimientoVistaDTO } from '../types/entradaAlmacen';

export interface DocumentosReporteConfig {
  modulo: string;
  fetchDatos: (sucursal: number, desde: string, hasta: string) => Promise<MovimientoVistaDTO[]>;
  reporteBlob: (sucursal: number, desde: string, hasta: string) => Promise<Blob>;
  tituloReporte: string;
}

export function useDocumentosReporte(config: DocumentosReporteConfig) {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const [data, setData] = useState<MovimientoVistaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null);
  const [fechas, setFechas] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().startOf('month'), dayjs()]);
  const [hasQueried, setHasQueried] = useState(false);

  const handleConsultar = useCallback(async () => {
    setLoading(true);
    setLoadingError(false);
    try {
      const desde = fechas[0].startOf('day').format('YYYYMMDDHHmmss');
      const hasta = fechas[1].endOf('day').format('YYYYMMDDHHmmss');
      const items = await config.fetchDatos(sucursalActiva, desde, hasta);
      setData(items || []);
      setHasQueried(true);
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al consultar documentos';
      message.error(msg);
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, fechas, config]);

  const handleImprimir = useCallback(async () => {
    if (data.length === 0) return;
    setLoadingPdf(true);
    try {
      const desde = fechas[0].startOf('day').format('YYYYMMDDHHmmss');
      const hasta = fechas[1].endOf('day').format('YYYYMMDDHHmmss');
      const blob = await config.reporteBlob(sucursalActiva, desde, hasta);
      const url = URL.createObjectURL(blob);
      const titulo = `Reporte de Documentos ${config.tituloReporte} - ${fechas[0].format('DD/MM/YYYY')} al ${fechas[1].format('DD/MM/YYYY')}`;
      setPdfPreview({ url, title: titulo });
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al generar el reporte';
      message.error(msg);
    } finally {
      setLoadingPdf(false);
    }
  }, [data, fechas, sucursalActiva, config]);

  const handlePdfClose = useCallback(() => {
    if (pdfPreview) {
      URL.revokeObjectURL(pdfPreview.url);
    }
    setPdfPreview(null);
  }, [pdfPreview]);

  const handleFechasChange = useCallback((nuevas: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
    if (nuevas) {
      setFechas(nuevas);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    if (hasQueried) {
      handleConsultar();
    }
  }, [hasQueried, handleConsultar]);

  return {
    data,
    loading,
    loadingError,
    loadingPdf,
    pdfPreview,
    fechas,
    hasQueried,
    handleConsultar,
    handleImprimir,
    handlePdfClose,
    handleFechasChange,
    handleRefresh,
  };
}
