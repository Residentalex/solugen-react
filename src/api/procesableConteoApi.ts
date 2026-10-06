import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type {
  AjusteConteoDTO,
  AjusteConteoGeneradoDTO,
  AjusteConteoRequestDTO,
  ConteoProcesableDTO,
} from '../types/procesableConteo';

const BASE = '/Procesable';

export const procesableConteoApi = {
  /**
   * Conteos fisicos de un evento, listos para unificarse en un procesable.
   * Cada fila indica si ya fue consumida por un procesable vigente.
   */
  obtenerConteosPorEvento: async (
    sucursal: number,
    codEvento: string,
    params?: { almacen?: string; familia?: string; cuenta?: string }
  ): Promise<ConteoProcesableDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ConteoProcesableDTO[]>>(
      `${BASE}/${sucursal}/conteos/${encodeURIComponent(codEvento)}`,
      { params }
    );
    return data.data;
  },

  /**
   * Ajuste por producto entre la cantidad contada en los conteos indicados y
   * la existencia del sistema a la fecha de corte. Incluye las lineas sin
   * diferencia para que la revision sea completa.
   */
  obtenerAjustes: async (
    sucursal: number,
    request: AjusteConteoRequestDTO
  ): Promise<AjusteConteoDTO[]> => {
    const { data } = await apiClient.post<ApiResponse<AjusteConteoDTO[]>>(
      `${BASE}/${sucursal}/ajustes`,
      request
    );
    return data.data;
  },

  /**
   * Materializa el calculo del conteo en documentos de ajuste: una Entrada de
   * Ajuste (EPJ) por las diferencias positivas y una Salida de Ajuste (SPJ) por
   * las negativas.
   *
   * Los documentos nacen en BORRADOR. El stock no cambia hasta que se aplican
   * desde la pantalla de entradas o salidas de almacen. Los conteos quedan
   * bloqueados al guardarse el procesable.
   */
  generarAjuste: async (
    sucursal: number,
    request: AjusteConteoRequestDTO
  ): Promise<AjusteConteoGeneradoDTO> => {
    const { data } = await apiClient.post<ApiResponse<AjusteConteoGeneradoDTO>>(
      `${BASE}/${sucursal}/generar-ajuste`,
      request
    );
    return data.data;
  },
};