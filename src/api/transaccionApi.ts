import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { TransaccionDTO, TransaccionVistaDTO, FiltroTransaccion } from '../types/transaccion';

const BASE = '/Transaccion';

function formatDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${day}${hh}${mm}${ss}`;
}

export const transaccionApi = {
  /** Obtener transacción por ID */
  obtenerPorId: async (sucursal: number, id: number): Promise<TransaccionDTO> => {
    const { data } = await apiClient.get<ApiResponse<TransaccionDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  /** Obtener transacciones con asientos no cuadrados */
  obtenerNoCuadrados: async (
    sucursal: number,
    desde: string,
    hasta: string,
    tipoDoc?: string
  ): Promise<TransaccionDTO[]> => {
    const params: Record<string, string> = { desde, hasta };
    if (tipoDoc) params.tipoDoc = tipoDoc;

    const { data } = await apiClient.get<ApiResponse<TransaccionDTO[]>>(
      `${BASE}/${sucursal}/asientosnoCuadrado`,
      { params }
    );
    return data.data || [];
  },

  /** Postear una transacción individual */
  postear: async (
    sucursal: number,
    transaccion: TransaccionDTO,
    destino?: number
  ): Promise<any> => {
    const params: Record<string, string> = {};
    if (destino !== undefined) params.destino = String(destino);

    const { data } = await apiClient.post<ApiResponse<any>>(
      `${BASE}/${sucursal}/postear`,
      transaccion,
      { params }
    );
    return data.data;
  },

  /** Postear documentos bancarios */
  postearDocBancario: async (
    sucursal: number,
    desde: string,
    hasta: string,
    tipoDoc?: string,
    ctaBanc?: string
  ): Promise<number[]> => {
    const params: Record<string, string> = { desde, hasta };
    if (tipoDoc) params.tipoDoc = tipoDoc;
    if (ctaBanc) params.ctaBanc = ctaBanc;

    const { data } = await apiClient.post<ApiResponse<number[]>>(
      `${BASE}/${sucursal}/DocBancario/postear`,
      null,
      { params }
    );
    return data.data || [];
  },

  /** Filtrar transacciones */
  filtrar: async (
    sucursal: number,
    filtro: FiltroTransaccion
  ): Promise<TransaccionVistaDTO[]> => {
    const params: Record<string, string | number> = {};
    if (filtro.cantidad) params.cantidad = filtro.cantidad;
    if (filtro.salto) params.salto = filtro.salto;
    if (filtro.desde) params.desde = filtro.desde;
    if (filtro.hasta) params.hasta = filtro.hasta;
    if (filtro.documento) params.documento = filtro.documento;
    if (filtro.nCF) params.nCF = filtro.nCF;
    if (filtro.concepto) params.concepto = filtro.concepto;
    if (filtro.entidad) params.entidad = filtro.entidad;
    if (filtro.tipoEntidad) params.tipoEntidad = filtro.tipoEntidad;

    const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO[]>>(
      `${BASE}/${sucursal}/filtrar`,
      { params }
    );
    return data.data || [];
  },

  /** Obtener transacciones por tipo y rango de fecha */
  obtenerPorRangoFecha: async (
    sucursal: number,
    tipoDoc: string,
    desde: string,
    hasta: string
  ): Promise<TransaccionDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TransaccionDTO[]>>(
      `${BASE}/${sucursal}/${tipoDoc}/RangoFecha`,
      { params: { desde, hasta } }
    );
    return data.data || [];
  },

  /** Obtener transacciones por tipo de documento (vista resumida) */
  obtenerResumidoPorTipo: async (
    sucursal: number,
    tipoDoc: string,
    desde?: string,
    hasta?: string,
    tipoEntidad?: string
  ): Promise<TransaccionVistaDTO[]> => {
    const params: Record<string, string> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (tipoEntidad) params.TipoEntidad = tipoEntidad;

    const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO[]>>(
      `${BASE}/${sucursal}/tipo/${tipoDoc}`,
      { params }
    );
    return data.data || [];
  },
};

export { formatDateParam };