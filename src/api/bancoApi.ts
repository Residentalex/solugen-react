import { apiClient } from './client';

const BASE = '/Banco';

export interface BancoDTO {
  nombre: string;
  tipoEntidad: string;
  correoElectronico: string;
  idExterno: string;
  codigo: string;
}

export const bancoApi = {
  obtenerListado: async (sucursal: number): Promise<BancoDTO[]> => {
    const { data } = await apiClient.get<BancoDTO[]>(`${BASE}/${sucursal}`);
    return data;
  },
};
