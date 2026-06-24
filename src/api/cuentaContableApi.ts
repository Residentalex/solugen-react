import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { CuentaContableDTO, CuentaContableResumenDTO, MovimientoCuentaDTO, BalanceCuentaDTO, TipoCuentaDTO, GrupoCuentaContableDTO } from '../types/contabilidad';

const BASE = '/CuentaContable';

export const cuentaContableApi = {
  obtenerPorId: async (sucursal: number, noCuenta: string): Promise<CuentaContableDTO> => {
    const { data } = await apiClient.get<ApiResponse<CuentaContableDTO>>(`${BASE}/${sucursal}/${noCuenta}`);
    return (data && typeof data === 'object' && 'isSuccess' in data) ? data.data : data as unknown as CuentaContableDTO;
  },
  obtenerListado: async (sucursal: number): Promise<CuentaContableResumenDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<CuentaContableResumenDTO[]>>(`${BASE}/${sucursal}`);
    return data.data;
  },

  obtenerListadoPaginado: async (
    sucursal: number,
    cantidad = 25,
    salto = 0,
    filtro = ''
  ): Promise<{ data: CuentaContableResumenDTO[]; total: number }> => {
    const params = new URLSearchParams({ take: String(cantidad), skip: String(salto), filtro });
    const { data } = await apiClient.get<ApiResponse<CuentaContableResumenDTO[]> & { total: number }>(
      `${BASE}/${sucursal}?${params}`
    );
    return { data: data.data, total: data.total };
  },

  obtenerAuxiliares: async (sucursal: number): Promise<CuentaContableResumenDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<CuentaContableResumenDTO[]>>(`${BASE}/${sucursal}/Auxiliares`);
    return data.data;
  },

  obtenerMovimientos: async (
    sucursal: number,
    noCuenta: string,
    cantidad = 25,
    salto = 0,
    fechaCierre?: string
  ): Promise<{ data: MovimientoCuentaDTO[]; total: number }> => {
    let url = `${BASE}/${sucursal}/${noCuenta}/movimientos?cantidad=${cantidad}&salto=${salto}`;
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
