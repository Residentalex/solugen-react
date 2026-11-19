import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { SesionFirebirdDTO } from '../types/sesion';

const BASE = '/Sesiones';

export const sesionesApi = {
  /** Conexiones abiertas contra la base de la sucursal. */
  obtener: async (sucursal: number): Promise<SesionFirebirdDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<SesionFirebirdDTO[]>>(
      `${BASE}/${encodeURIComponent(String(sucursal))}`,
    );
    return data.data ?? [];
  },

  /** Desconecta una conexion (Firebird hace rollback de lo no confirmado). */
  cerrar: async (sucursal: number, attachmentId: number): Promise<void> => {
    await apiClient.delete(
      `${BASE}/${encodeURIComponent(String(sucursal))}/${attachmentId}`,
    );
  },
};
