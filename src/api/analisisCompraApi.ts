import { apiClient } from './client';
import type { MovimientoArticuloAgrupadoDTO } from '../types/movimientoPorPlantilla';

export interface DetalleResultadoDTO {
  sucursal: string;
  exito: boolean;
  error: string | null;
  registrosProcesados: number;
}

export interface RefrescarAnalisisResultadoDTO {
  totalSucursales: number;
  exitosas: number;
  fallidas: number;
  detalles: DetalleResultadoDTO[];
}

export interface RefrescarAnalisisEncoladoDTO {
  jobId: string;
  mensaje: string;
}

const BASE = '/AnalisisCompra';

export const analisisCompraApi = {
  obtenerPorPlantilla: async (sucursal: number, codigoPlantilla: string): Promise<MovimientoArticuloAgrupadoDTO[]> => {
    const { data } = await apiClient.get<{ isSuccess: boolean; data: MovimientoArticuloAgrupadoDTO[] }>(
      `${BASE}/Obtener/${sucursal}/plantilla`,
      { params: { codigoPlantilla } }
    );
    return data.data;
  },

  obtenerMovimientosPorCodigos: async (sucursal: number, codigos: string[]): Promise<MovimientoArticuloAgrupadoDTO[]> => {
    console.log('API analisisCompra: llamada recibida, sucursal=', sucursal, 'codigos=', codigos?.length);
    if (!codigos || codigos.length === 0) { console.log('API analisisCompra: sin codigos, retornando []'); return []; }
    try {
      const url = `${BASE}/Obtener/${sucursal}/movimientos/codigos`;
      console.log('API analisisCompra: POST', url, 'body length:', codigos.length);
      const { data } = await apiClient.post<{ isSuccess: boolean; data: MovimientoArticuloAgrupadoDTO[] }>(url, codigos);
      console.log('API analisisCompra: respuesta recibida', data);
      return data.data ?? [];
    } catch (e) {
      console.log('API analisisCompra: ERROR', e);
      return [];
    }
  },

  refrescarPorCodigos: async (sucursal: number, codigos: string[]): Promise<void> => {
    await apiClient.post(`${BASE}/RefrescarPorCodigos/${sucursal}`, codigos);
  },

  refrescarPorCodigosTodasSucursales: async (codigos: string[]): Promise<RefrescarAnalisisResultadoDTO> => {
    const { data } = await apiClient.post<{ isSuccess: boolean; data: RefrescarAnalisisResultadoDTO }>(
      '/Sucursales/RefrescarAnalisisCompra',
      codigos
    );
    return data.data;
  },

  refrescarPorCodigosEnSegundoPlano: async (codigos: string[]): Promise<RefrescarAnalisisEncoladoDTO> => {
    const { data } = await apiClient.post<{ isSuccess: boolean; data: RefrescarAnalisisEncoladoDTO }>(
      '/Sucursales/RefrescarAnalisisCompra',
      codigos
    );
    return data.data;
  },
};
