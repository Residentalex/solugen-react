import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

export interface MayorAuxiliarFiltros {
  fechaInicial: string;
  fechaFinal: string;
  noCuenta?: string;
  tipoDocumento?: string;
  balanceAnterior?: boolean;
  detallado?: boolean;
}

export interface MayorAuxiliarItem {
  fechaDocumento: string;
  documentoCodigo: string;
  documentoNoDocumento: string;
  documentoNombre: string;
  cuentaContableNoCuenta: string;
  cuentaContableNombre: string;
  tipoAsiento: string;
  monto: number;
  montoAlterno: number;
  balance: number;
  ordenDocumento: number;
  balanceDocumento: number;
  origenCuenta: string;
}

export interface MayorAuxiliarDatosResponse {
  items: MayorAuxiliarItem[];
  balanceInicial: number;
  balanceInicialAlterno: number;
  balanceInicialDebito: number;
  balanceInicialCredito: number;
  balanceFinal: number;
  balanceFinalAlterno: number;
}

const buildParams = (filtros: MayorAuxiliarFiltros): URLSearchParams => {
  const params = new URLSearchParams();
  params.set('desde', filtros.fechaInicial);
  params.set('hasta', filtros.fechaFinal);
  if (filtros.noCuenta) params.set('noCuenta', filtros.noCuenta);
  if (filtros.tipoDocumento) params.set('tipoDocumento', filtros.tipoDocumento);
  if (filtros.balanceAnterior !== undefined) params.set('balanceAnterior', String(filtros.balanceAnterior));
  if (filtros.detallado !== undefined) params.set('detallado', String(filtros.detallado));
  return params;
};

export const mayorAuxiliarApi = {
  generarPDF: async (sucursal: number, filtros: MayorAuxiliarFiltros): Promise<Blob> => {
    const params = buildParams(filtros);
    const { data } = await apiClient.get<Blob>(
      `/reportes/mayor-auxiliar/${sucursal}?${params.toString()}`,
      { responseType: 'blob' }
    );
    return data;
  },

  obtenerDatos: async (sucursal: number, filtros: MayorAuxiliarFiltros): Promise<MayorAuxiliarDatosResponse> => {
    const params = buildParams(filtros);
    const { data } = await apiClient.get<ApiResponse<MayorAuxiliarDatosResponse>>(
      `/reportes/mayor-auxiliar/${sucursal}/datos?${params.toString()}`
    );
    return data.data ?? { items: [], balanceInicial: 0, balanceInicialAlterno: 0, balanceInicialDebito: 0, balanceInicialCredito: 0, balanceFinal: 0, balanceFinalAlterno: 0 };
  },

  imprimir: async (sucursal: number, filtros: MayorAuxiliarFiltros, items: MayorAuxiliarItem[], balances: { balanceInicial: number; balanceInicialAlterno: number; balanceInicialDebito: number; balanceInicialCredito: number; balanceFinal: number; balanceFinalAlterno: number }): Promise<Blob> => {
    const { data } = await apiClient.post<Blob>(
      `/reportes/mayor-auxiliar/${sucursal}/imprimir`,
      { items, balanceInicial: balances.balanceInicial, balanceInicialAlterno: balances.balanceInicialAlterno, balanceInicialDebito: balances.balanceInicialDebito, balanceInicialCredito: balances.balanceInicialCredito, balanceFinal: balances.balanceFinal, balanceFinalAlterno: balances.balanceFinalAlterno, fechaInicial: filtros.fechaInicial, fechaFinal: filtros.fechaFinal, noCuenta: filtros.noCuenta ?? '', tipoDocumento: filtros.tipoDocumento ?? '', balanceAnterior: filtros.balanceAnterior ?? true, detallado: filtros.detallado ?? true },
      { responseType: 'blob' }
    );
    return data;
  }
};
