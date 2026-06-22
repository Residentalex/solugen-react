import { useState, useCallback } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import { useAuthStore } from '../stores/authStore';
import { documentosReporteApi } from '../api/documentosReporteApi';
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

  const handleImprimir = useCallback(async (selectedIds?: number[]) => {
    if (data.length === 0 && (!selectedIds || selectedIds.length === 0)) return;
    setLoadingPdf(true);
    try {
      let blob: Blob;
      const desde = fechas[0].startOf('day').format('YYYYMMDDHHmmss');
      const hasta = fechas[1].endOf('day').format('YYYYMMDDHHmmss');

      if (selectedIds && selectedIds.length > 0) {
        // Mapear los objetos seleccionados desde la data en memoria (sin consultar BD)
        const items = data
          .filter((item) => selectedIds.includes(item.id))
          .map((item) => {
            const partes = (item.documento || '').split('-');
            return {
              fechaDocumento: item.fecha,
              fechaEntrega: null,
              tipoDocumento: partes.length > 0 ? partes[0] : '',
              noDocumento: partes.slice(1).join('-'),
              total: item.total ?? 0,
              suplidorNombre: item.entidad ?? '',
              creadoPorNombre: item.creadoPor ?? '',
            };
          });
        const titulo = `Reporte de Documentos ${config.tituloReporte} (SELECCIONADOS)`;
        blob = await documentosReporteApi.imprimirReporteConDatos(sucursalActiva, titulo, items);
      } else {
        // Sin selección: usar endpoint GET por período (comportamiento original)
        blob = await config.reporteBlob(sucursalActiva, desde, hasta);
      }

      // Abrir impresión del navegador como en EntradaAlmacenDetalle
      const blobUrl = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(blobUrl);
        }, 30000);
      }, 2000);
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al generar el reporte';
      message.error(msg);
    } finally {
      setLoadingPdf(false);
    }
  }, [data, fechas, sucursalActiva, config]);

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
    fechas,
    hasQueried,
    handleConsultar,
    handleImprimir,
    handleFechasChange,
    handleRefresh,
  };
}
