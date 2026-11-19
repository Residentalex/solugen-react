import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { MovimientoVistaDTO } from '../types/entradaAlmacen';
import type { AjusteAlmacenDTO } from '../types/ajusteAlmacen';

const BASE = '/Ajuste';

/** Tipos de ajuste que expone la pantalla "Ajustes de inventario". */
export type TipoAjuste = 'EPJ' | 'SPJ';

export interface AjusteListadoFiltros {
  /** Obligatorio: EPJ (entrada de ajuste) o SPJ (salida de ajuste). */
  tipo: TipoAjuste;
  desde?: string;
  hasta?: string;
  cantidad?: number;
  salto?: number;
  /** 0 borrador, 1 aplicado, 3 anulado. Solo aplica sin filtros de texto. */
  estado?: number;
  documento?: string;
  nCF?: string;
  concepto?: string;
  entidad?: string;
  referencia?: string;
  almacen?: string;
}

export const ajusteAlmacenApi = {
  /**
   * Listado paginado de ajustes del tipo indicado. Sin filtros de texto el
   * backend usa la vista por rango (que respeta `estado`); con texto usa el
   * filtro OR (documento, nCF, concepto, entidad, referencia, almacen).
   */
  obtenerVista: async (
    sucursal: number,
    filtros: AjusteListadoFiltros
  ): Promise<{ data: MovimientoVistaDTO[]; total: number }> => {
    const params: Record<string, string | number> = {};
    params.tipo = filtros.tipo;
    if (filtros.desde) params.desde = filtros.desde;
    if (filtros.hasta) params.hasta = filtros.hasta;
    if (filtros.cantidad) params.cantidad = filtros.cantidad;
    if (filtros.salto) params.salto = filtros.salto;
    if (filtros.estado !== undefined) params.estado = filtros.estado;
    if (filtros.documento) params.documento = filtros.documento;
    if (filtros.nCF) params.nCF = filtros.nCF;
    if (filtros.concepto) params.concepto = filtros.concepto;
    if (filtros.entidad) params.entidad = filtros.entidad;
    if (filtros.referencia) params.referencia = filtros.referencia;
    if (filtros.almacen) params.almacen = filtros.almacen;

    const { data } = await apiClient.get<ApiResponse<MovimientoVistaDTO[]>>(
      `${BASE}/${sucursal}/ajustes`,
      { params }
    );
    return { data: data.data || [], total: data.total ?? 0 };
  },

  /** Detalle del ajuste: cabecera, concepto, almacen y lineas. */
  obtenerPorId: async (
    sucursal: number,
    tipo: TipoAjuste,
    id: number
  ): Promise<AjusteAlmacenDTO> => {
    const { data } = await apiClient.get<ApiResponse<AjusteAlmacenDTO>>(
      `${BASE}/${sucursal}/ajustes/${tipo}/${id}`
    );
    return data.data;
  },

  /**
   * Actualiza un ajuste en borrador (fecha, nota y lineas cantidad/costo).
   * El tipo, numero y estado los controla el backend.
   */
  actualizar: async (
    sucursal: number,
    tipo: TipoAjuste,
    id: number,
    ajuste: AjusteAlmacenDTO
  ): Promise<AjusteAlmacenDTO> => {
    const { data } = await apiClient.put<ApiResponse<AjusteAlmacenDTO>>(
      `${BASE}/${sucursal}/ajustes/${tipo}/${id}`,
      ajuste
    );
    return data.data;
  },

  /**
   * Quita la aplicación del ajuste (deja de contar para la existencia).
   */
  desaplicar: async (
    sucursal: number,
    tipo: TipoAjuste,
    id: number
  ): Promise<AjusteAlmacenDTO> => {
    const { data } = await apiClient.post<ApiResponse<AjusteAlmacenDTO>>(
      `${BASE}/${sucursal}/ajustes/${tipo}/${id}/desaplicar`
    );
    return data.data;
  },

  /**
   * Anula el ajuste en borrador. Un documento aplicado debe desaplicarse antes.
   */
  anular: async (
    sucursal: number,
    tipo: TipoAjuste,
    id: number
  ): Promise<AjusteAlmacenDTO> => {
    const { data } = await apiClient.post<ApiResponse<AjusteAlmacenDTO>>(
      `${BASE}/${sucursal}/ajustes/${tipo}/${id}/anular`
    );
    return data.data;
  },

  /**
   * Aplica el ajuste (mueve stock) y devuelve el documento actualizado.
   * `cuenta` (USUARIOS.CUENTA) es opcional: el backend la toma del token.
   */
  aplicar: async (
    sucursal: number,
    tipo: TipoAjuste,
    id: number,
    cuenta?: string
  ): Promise<AjusteAlmacenDTO> => {
    const params: Record<string, string> = {};
    if (cuenta) params.cuenta = cuenta;
    const { data } = await apiClient.post<ApiResponse<AjusteAlmacenDTO>>(
      `${BASE}/${sucursal}/ajustes/${tipo}/${id}/aplicar`,
      null,
      { params }
    );
    return data.data;
  },
};
