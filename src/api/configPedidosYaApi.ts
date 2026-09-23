import { apiClient } from './client';
import type { ConfigPedidosYaDTO } from '../types/configPedidosYa';

const BASE = '/ConfigPedidosYa';

export const configPedidosYaApi = {
  obtener: async (sucursal: number): Promise<ConfigPedidosYaDTO> => {
    const { data } = await apiClient.get<ConfigPedidosYaDTO>(`${BASE}/${sucursal}`);
    return data;
  },

  guardar: async (sucursal: number, config: Partial<ConfigPedidosYaDTO>): Promise<void> => {
    await apiClient.post(`${BASE}/${sucursal}`, config);
  },

  eliminar: async (sucursal: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}`);
  },

  probarConexion: async (sucursal: number, config: Partial<ConfigPedidosYaDTO>): Promise<{ exito: boolean; mensaje: string; fechaPrueba?: string; detalle?: string }> => {
    const { data } = await apiClient.post(`${BASE}/${sucursal}/probar`, config);
    return data;
  },
};
