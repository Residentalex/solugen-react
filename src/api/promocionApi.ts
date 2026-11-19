import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type {
  PromocionListadoDTO,
  PromocionDTO,
  PromocionCatalogoFamiliaDTO,
  PromocionCatalogoGrupoDTO,
} from '../types/promocion';

const BASE = '/Promocion';

/**
 * Extrae el mensaje de error devuelto por el backend de Promociones.
 * Los endpoints de DTO/catálogos devuelven texto plano (`BadRequest(string)`),
 * mientras que `total`, `filtrar` y `cupones` devuelven un `ApiResponse`.
 * Por eso soporta ambos formatos.
 */
export function mensajeErrorPromocion(err: unknown, fallback: string): string {
  const data = (err as any)?.response?.data;
  if (typeof data === 'string') return data;
  return data?.errorMessage || fallback;
}

export const promocionApi = {
  obtenerListado: async (sucursal: number): Promise<PromocionListadoDTO[]> => {
    const { data } = await apiClient.get<PromocionListadoDTO[]>(`${BASE}/${sucursal}`);
    return data;
  },

  obtenerTotal: async (sucursal: number, params?: { busqueda?: string }): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/${sucursal}/total`, { params });
    return data.data;
  },

  filtrar: async (
    sucursal: number,
    filtro: { cantidad?: number; salto?: number; busqueda?: string }
  ): Promise<{ items: PromocionListadoDTO[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<PromocionListadoDTO[]>>(
      `${BASE}/${sucursal}/filtrar`,
      { params: filtro }
    );
    return { items: data.data ?? [], total: data.total ?? 0 };
  },

  obtenerPorId: async (sucursal: number, id: string): Promise<PromocionDTO> => {
    const { data } = await apiClient.get<PromocionDTO>(
      `${BASE}/${sucursal}/${encodeURIComponent(id)}`
    );
    return data;
  },

  crear: async (sucursal: number, promocion: PromocionDTO): Promise<PromocionDTO> => {
    const { data } = await apiClient.post<PromocionDTO>(`${BASE}/${sucursal}`, promocion);
    return data;
  },

  actualizar: async (sucursal: number, id: string, promocion: PromocionDTO): Promise<PromocionDTO> => {
    const { data } = await apiClient.put<PromocionDTO>(
      `${BASE}/${sucursal}/${encodeURIComponent(id)}`,
      promocion
    );
    return data;
  },

  cambiarActiva: async (sucursal: number, id: string, activa: boolean): Promise<PromocionDTO> => {
    const { data } = await apiClient.patch<PromocionDTO>(
      `${BASE}/${sucursal}/${encodeURIComponent(id)}/activa`,
      { activa }
    );
    return data;
  },

  obtenerCupones: async (sucursal: number, id: string): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(
      `${BASE}/${sucursal}/${encodeURIComponent(id)}/cupones`
    );
    return data.data;
  },

  catalogoFamilias: async (sucursal: number): Promise<PromocionCatalogoFamiliaDTO[]> => {
    const { data } = await apiClient.get<PromocionCatalogoFamiliaDTO[]>(
      `${BASE}/${sucursal}/catalogo/familias`
    );
    return data;
  },

  catalogoGrupos: async (
    sucursal: number,
    params?: { busqueda?: string; cantidad?: number }
  ): Promise<PromocionCatalogoGrupoDTO[]> => {
    const { data } = await apiClient.get<PromocionCatalogoGrupoDTO[]>(
      `${BASE}/${sucursal}/catalogo/grupos`,
      { params }
    );
    return data;
  },
};
