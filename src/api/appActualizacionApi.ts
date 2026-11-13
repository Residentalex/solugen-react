import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { AppEstadoDTO, AppPublicacionDTO } from '../types/appActualizacion';

const BASE = '/app';

export const appActualizacionApi = {
  /** Estado de todos los binarios registrados en APP. */
  obtenerEstado: async (): Promise<AppEstadoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<AppEstadoDTO[]>>(`${BASE}/estado`);
    return data.data ?? [];
  },

  /**
   * Publica un binario nuevo. El nombre del archivo se conserva porque
   * electron-updater descarga el `path` que declara latest.yml.
   */
  subir: async (
    appName: string,
    version: string,
    archivo: File,
    latestYml?: File
  ): Promise<AppPublicacionDTO> => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    if (latestYml) formData.append('latestYml', latestYml);

    const { data } = await apiClient.post<ApiResponse<AppPublicacionDTO>>(
      `${BASE}/upload/${appName}?version=${encodeURIComponent(version)}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data.data;
  },

  /** Actualiza solo la version publicada, sin tocar el binario. */
  actualizarVersion: async (appName: string, version: string): Promise<void> => {
    await apiClient.put(`${BASE}/version/${appName}/${encodeURIComponent(version)}`);
  },

  /** URL publica de descarga del binario (endpoint anonimo). */
  urlDescarga: (appName: string): string => {
    const base = (apiClient.defaults.baseURL || '').replace(/\/$/, '');
    return `${base}${BASE}/download/${appName}`;
  },
};
