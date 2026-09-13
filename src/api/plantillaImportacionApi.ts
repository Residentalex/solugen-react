import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

const BASE = '/ConciliacionBancaria';

export interface PlantillaImportacionDTO {
  id: number;
  cuentaBanc: string;
  nombre: string;
  mapeoCampos: string;
  filaInicio: number;
  separador: string;
  decimalSeparator: string;
  usarHeader: boolean;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string;
  creadoPor: number | null;
}

export interface PlantillaImportacionCrearDTO {
  cuentaBanc: string;
  nombre: string;
  mapeoCampos: string;
  filaInicio: number;
  separador: string;
  decimalSeparator: string;
  usarHeader: boolean;
  activo: boolean;
}

export const plantillaImportacionApi = {
  obtenerPorCuentaContable: async (
    sucursal: number,
    cuentaBanc: string
  ): Promise<PlantillaImportacionDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<PlantillaImportacionDTO[]>>(
      `${BASE}/${sucursal}/plantillas/${cuentaBanc}`
    );
    return data.data;
  },

  obtenerActiva: async (
    sucursal: number,
    cuentaBanc: string
  ): Promise<PlantillaImportacionDTO | null> => {
    const { data } = await apiClient.get<ApiResponse<PlantillaImportacionDTO | null>>(
      `${BASE}/${sucursal}/plantillas/activa/${cuentaBanc}`
    );
    return data.data;
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<PlantillaImportacionDTO> => {
    const { data } = await apiClient.get<ApiResponse<PlantillaImportacionDTO>>(
      `${BASE}/${sucursal}/plantillas/detalle/${id}`
    );
    return data.data;
  },

  crear: async (
    sucursal: number,
    plantilla: PlantillaImportacionCrearDTO
  ): Promise<number> => {
    const { data } = await apiClient.post<ApiResponse<number>>(
      `${BASE}/${sucursal}/plantillas`,
      plantilla
    );
    return data.data;
  },

  actualizar: async (
    sucursal: number,
    id: number,
    plantilla: PlantillaImportacionCrearDTO
  ): Promise<void> => {
    await apiClient.put(`${BASE}/${sucursal}/plantillas/${id}`, plantilla);
  },

  eliminar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/plantillas/${id}`);
  },
};
