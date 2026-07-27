import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type {
  ConciliacionBancariaDTO,
  ConciliacionBancariaVistaDTO,
  MovimientoBancarioDTO,
  CuentaBancariaDTO,
  TransaccionConciliadaDTO,
} from '../types/conciliacionBancaria';

const BASE = '/ConciliacionBancaria';

export const conciliacionBancariaApi = {
  /** Obtener listado paginado con filtros */
  obtenerVista: async (
    sucursal: number,
    params: {
      cantidad?: number;
      salto?: number;
      desde?: string;
      hasta?: string;
      numeroCta?: string;
      aplicada?: string;
    }
  ): Promise<{ data: ConciliacionBancariaVistaDTO[]; total: number }> => {
    const queryParams: Record<string, string | number> = {};
    if (params.cantidad !== undefined) queryParams.cantidad = params.cantidad;
    if (params.salto !== undefined) queryParams.salto = params.salto;
    if (params.desde) queryParams.desde = params.desde;
    if (params.hasta) queryParams.hasta = params.hasta;
    if (params.numeroCta) queryParams.numeroCta = params.numeroCta;
    if (params.aplicada) queryParams.aplicada = params.aplicada;
    const { data } = await apiClient.get<ApiResponse<ConciliacionBancariaVistaDTO[]>>(
      `${BASE}/${sucursal}`,
      { params: queryParams }
    );
    return { data: data.data || [], total: data.total ?? 0 };
  },

  /** Para useDocumentoListado.fetchVista */
  obtenerVistaDocumento: async (
    sucursal: number,
    desde: string,
    hasta: string,
    filas: number,
    salto: number,
    estado?: number
  ): Promise<{ data: ConciliacionBancariaVistaDTO[]; total: number }> => {
    const params: Record<string, string | number> = {
      cantidad: filas,
      salto,
      desde,
      hasta,
    };
    if (estado === 0) params.aplicada = 'F';
    else if (estado === 1) params.aplicada = 'S';
    const { data } = await apiClient.get<ApiResponse<ConciliacionBancariaVistaDTO[]>>(
      `${BASE}/${sucursal}`, { params }
    );
    return { data: data.data || [], total: data.total ?? 0 };
  },

  /** Para useDocumentoListado.fetchFiltrar */
  filtrarDocumento: async (
    sucursal: number,
    params: Record<string, any>
  ): Promise<{ data: ConciliacionBancariaVistaDTO[]; total: number }> => {
    const queryParams: Record<string, string | number> = {
      cantidad: params.cantidad || 25,
      salto: params.salto || 0,
    };
    if (params.desde) queryParams.desde = params.desde;
    if (params.hasta) queryParams.hasta = params.hasta;
    if (params.documento) queryParams.numeroCta = params.documento;
    const { data } = await apiClient.get<ApiResponse<ConciliacionBancariaVistaDTO[]>>(
      `${BASE}/${sucursal}`, { params: queryParams }
    );
    return { data: data.data || [], total: data.total ?? 0 };
  },

  /** Obtener conciliación completa por ID */
  obtenerPorId: async (sucursal: number, id: number): Promise<ConciliacionBancariaDTO> => {
    const { data } = await apiClient.get<ApiResponse<ConciliacionBancariaDTO>>(
      `${BASE}/${sucursal}/${id}`
    );
    if (!data.data) throw new Error('Conciliación no encontrada');
    return data.data;
  },

  /** Crear nueva conciliación */
  crear: async (sucursal: number, dto: Partial<ConciliacionBancariaDTO>): Promise<number> => {
    const { data } = await apiClient.post<ApiResponse<number>>(`${BASE}/${sucursal}`, dto);
    if (!data.data) throw new Error('Error al crear conciliación');
    return data.data;
  },

  /** Actualizar conciliación existente */
  actualizar: async (sucursal: number, dto: Partial<ConciliacionBancariaDTO>): Promise<void> => {
    await apiClient.put(`${BASE}/${sucursal}`, dto);
  },

  /** Eliminar conciliación */
  eliminar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/${id}`);
  },

  /** Aplicar conciliación (cambia estado a aplicada) */
  aplicar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.post(`${BASE}/${sucursal}/${id}/aplicar`);
  },

  /** Importar movimientos bancarios como JSON */
  importarMovimientos: async (
    sucursal: number,
    concilId: number,
    movimientos: Array<{ fecha: string; numRef: string; monto: number; debCred: string; concepto: string }>
  ): Promise<MovimientoBancarioDTO[]> => {
    const { data } = await apiClient.post<ApiResponse<MovimientoBancarioDTO[]>>(
      `${BASE}/${sucursal}/importar/${concilId}`,
      movimientos
    );
    return data.data || [];
  },

  /** Obtener cuentas bancarias disponibles (CTASBANC) */
  obtenerCuentasBancarias: async (sucursal: number): Promise<CuentaBancariaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<CuentaBancariaDTO[]>>(
      `${BASE}/${sucursal}/cuentas`
    );
    return data.data || [];
  },

  /** Obtener transacciones del sistema relacionadas con el CONCILID */
  obtenerTransaccionesConciliadas: async (
    sucursal: number,
    concilId: number
  ): Promise<TransaccionConciliadaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TransaccionConciliadaDTO[]>>(
      `${BASE}/${sucursal}/${concilId}/transacciones`
    );
    return data.data || [];
  },
};
