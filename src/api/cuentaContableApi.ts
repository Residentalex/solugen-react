import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { CuentaContableDTO, MovimientoCuentaDTO, BalanceCuentaDTO, TipoCuentaDTO, GrupoCuentaContableDTO } from '../types/contabilidad';

const BASE = '/CuentaContable';

export const cuentaContableApi = {
  obtenerPorId: async (sucursal: number, noCuenta: string): Promise<CuentaContableDTO> => {
    const { data } = await apiClient.get<ApiResponse<CuentaContableDTO>>(`${BASE}/${sucursal}/${noCuenta}`);
    return (data && typeof data === 'object' && 'isSuccess' in data) ? data.data : data as unknown as CuentaContableDTO;
  },
  obtenerListado: async (sucursal: number): Promise<CuentaContableDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<CuentaContableDTO[]>>(`${BASE}/${sucursal}`);
    return data.data;
  },

  obtenerListadoPaginado: async (
    sucursal: number,
    skip = 0,
    take = 25,
    filtro = ''
  ): Promise<{ data: CuentaContableDTO[]; total: number }> => {
    const params = new URLSearchParams({ skip: String(skip), take: String(take), filtro });
    const { data } = await apiClient.get<ApiResponse<CuentaContableDTO[]> & { total: number }>(
      `${BASE}/${sucursal}?${params}`
    );
    return { data: data.data, total: data.total };
  },

  obtenerAuxiliares: async (sucursal: number): Promise<CuentaContableDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<CuentaContableDTO[]>>(`${BASE}/${sucursal}/Auxiliares`);
    return data.data;
  },

  obtenerMovimientos: async (
    sucursal: number,
    noCuenta: string,
    skip = 0,
    take = 25,
    fechaCierre?: string
  ): Promise<{ data: MovimientoCuentaDTO[]; total: number }> => {
    let url = `${BASE}/${sucursal}/${noCuenta}/movimientos?skip=${skip}&take=${take}`;
    if (fechaCierre) {
      url += `&fechaCierre=${fechaCierre}`;
    }
    const { data } = await apiClient.get<ApiResponse<MovimientoCuentaDTO[]> & { total: number }>(url);
    return { data: data.data, total: data.total };
  },

  obtenerBalance: async (sucursal: number, noCuenta: string): Promise<BalanceCuentaDTO> => {
    const { data } = await apiClient.get<ApiResponse<BalanceCuentaDTO>>(
      `${BASE}/${sucursal}/${noCuenta}/balance`
    );
    return data.data;
  },

  crear: async (sucursal: number, dto: Partial<CuentaContableDTO>): Promise<CuentaContableDTO> => {
    const { data } = await apiClient.post<ApiResponse<CuentaContableDTO>>(`${BASE}/${sucursal}`, dto);
    return data.data;
  },

  actualizar: async (sucursal: number, noCuenta: string, dto: Partial<CuentaContableDTO>): Promise<CuentaContableDTO> => {
    const { data } = await apiClient.put<ApiResponse<CuentaContableDTO>>(`${BASE}/${sucursal}/${noCuenta}`, dto);
    return data.data;
  },

  eliminar: async (sucursal: number, noCuenta: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/${noCuenta}`);
  },

  // ===== Catálogos para formulario =====

  obtenerTipos: async (sucursal: number): Promise<TipoCuentaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TipoCuentaDTO[]>>(`/TipoCuenta/${sucursal}`);
    return data.data;
  },

  obtenerGrupos: async (sucursal: number): Promise<GrupoCuentaContableDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<GrupoCuentaContableDTO[]>>(`/GrupoCuentaContable/${sucursal}`);
    return data.data;
  },
};
