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
