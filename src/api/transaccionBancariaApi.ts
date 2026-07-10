import { apiClient } from './client';
import type { TransaccionDTO, TransaccionBancariaVistaDTO } from '../types/transaccion';
import type { ApiResponse } from '../types/auth';

const BASE = '/Transaccion';

export const transaccionBancariaApi = {
  obtenerPorId: async (sucursal: number, id: number): Promise<TransaccionDTO> => {
    const { data } = await apiClient.get<ApiResponse<TransaccionDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  /** Crea un documento bancario vía POST /Transaccion/{sucursal}/DocBancario */
  crearDocBancario: async (sucursal: number, dto: Partial<TransaccionDTO>, postear: boolean = false): Promise<number> => {
    const { data } = await apiClient.post<ApiResponse<number>>(`${BASE}/${sucursal}/DocBancario`, dto, {
      params: { postear }
    });
    return data.data;
  },

  /** Actualiza una transacción vía PUT /Transaccion/{sucursal} */
  actualizar: async (sucursal: number, dto: Partial<TransaccionDTO>): Promise<TransaccionDTO> => {
    const { data } = await apiClient.put<ApiResponse<TransaccionDTO>>(`${BASE}/${sucursal}`, dto);
    if (!data.data) throw new Error('Error al actualizar transacción bancaria');
    return data.data;
  },

  obtenerVista: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number,
    estado?: number
  ): Promise<{ data: TransaccionBancariaVistaDTO[]; total: number }> => {
    const params: Record<string, string | number> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad !== undefined) params.cantidad = cantidad;
    if (salto !== undefined) params.salto = salto;
    if (estado !== undefined) params.estado = estado;
    const { data } = await apiClient.get<ApiResponse<TransaccionBancariaVistaDTO[]>>(`${BASE}/${sucursal}`, { params });
    return { data: data.data || [], total: data.total ?? 0 };
  },

  filtrar: async (sucursal: number, filtro: {
    cantidad?: number;
    salto?: number;
    desde?: string;
    hasta?: string;
    documento?: string;
    entidad?: string;
    concepto?: string;
  }): Promise<{ data: TransaccionBancariaVistaDTO[]; total: number }> => {
    const params: Record<string, string | number> = {};
    if (filtro.cantidad !== undefined) params.cantidad = filtro.cantidad;
    if (filtro.salto !== undefined) params.salto = filtro.salto;
    if (filtro.desde) params.desde = filtro.desde;
    if (filtro.hasta) params.hasta = filtro.hasta;
    if (filtro.documento) params.documento = filtro.documento;
    if (filtro.entidad) params.entidad = filtro.entidad;
    if (filtro.concepto) params.concepto = filtro.concepto;
    const { data } = await apiClient.get<ApiResponse<TransaccionBancariaVistaDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params });
    return { data: data.data || [], total: data.total ?? 0 };
  },

  aplicar: async (sucursal: number, id: number): Promise<TransaccionDTO> => {
    const { data } = await apiClient.put<ApiResponse<TransaccionDTO>>(`${BASE}/${sucursal}/aplicar/${id}`);
    return data.data;
  },

  anular: async (sucursal: number, dto: Partial<TransaccionDTO>, destino?: number): Promise<TransaccionDTO> => {
    const params: Record<string, number> = {};
    if (destino !== undefined) params.destino = destino;
    const { data } = await apiClient.post<ApiResponse<TransaccionDTO>>(`${BASE}/${sucursal}/anular`, dto, { params });
    return data.data;
  },

  postear: async (sucursal: number, dto: Partial<TransaccionDTO>): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/postear`, dto);
    return data.data;
  },

  desaplicar: async (origen: number, documento: string, destino?: number): Promise<void> => {
    const params: Record<string, string | number> = { origen, documento };
    if (destino !== undefined) params.destino = destino;
    await apiClient.put(`${BASE}/desaplicar`, null, { params });
  },

  /** Desaplica un documento bancario indicando la cuenta bancaria */
  desaplicarDocBancario: async (
    sucursal: number,
    documento: string,
    ctaBancaria: string,
    destino?: number
  ): Promise<void> => {
    const params: Record<string, string | number> = { documento, ctaBancaria };
    if (destino !== undefined) params.destino = destino;
    await apiClient.put(`${BASE}/${sucursal}/DocBancario/desaplicar`, null, { params });
  },

  // Scanner endpoints (existen en TransaccionController)
  verificarScan: async (sucursal: number, id: number): Promise<{ existe: boolean }> => {
    const { data } = await apiClient.get<ApiResponse<{ existe: boolean }>>(`${BASE}/${sucursal}/${id}/scanner/verificar`);
    return data.data;
  },

  descargarScan: async (sucursal: number, id: number): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(`${BASE}/${sucursal}/${id}/scanner/descargar`, {
      responseType: 'blob',
    });
    return data;
  },
};
