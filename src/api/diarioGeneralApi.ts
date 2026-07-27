import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

export interface DiarioGeneralFiltros {
  fechaInicial: string;
  fechaFinal: string;
  tipoDocumento?: string;
}

export interface DiarioGeneralItem {
  fechaDocumento: string;
  transaccionID: number;
  documentoCodigo: string;
  documentoNoDocumento: string;
  conceptoNombre: string;
  cuentaContableNoCuenta: string;
  cuentaContableNombre: string;
  tipoAsiento: string;
  monto: number;
  montoAlterno: number;
}

export interface DiarioGeneralDatosResponse {
  items: DiarioGeneralItem[];
}

const buildParams = (filtros: DiarioGeneralFiltros): URLSearchParams => {
  const params = new URLSearchParams();
  params.set('desde', filtros.fechaInicial);
  params.set('hasta', filtros.fechaFinal);
  if (filtros.tipoDocumento) params.set('tipoDocumento', filtros.tipoDocumento);
  return params;
};

export const diarioGeneralApi = {
  generarPDF: async (sucursal: number, filtros: DiarioGeneralFiltros): Promise<Blob> => {
    const params = buildParams(filtros);
    const { data } = await apiClient.get<Blob>(
      `/reportes/diario-general/${sucursal}?${params.toString()}`,
      { responseType: 'blob' }
    );
    return data;
  },

  obtenerDatos: async (sucursal: number, filtros: DiarioGeneralFiltros): Promise<DiarioGeneralDatosResponse> => {
    const params = buildParams(filtros);
    const { data } = await apiClient.get<ApiResponse<DiarioGeneralDatosResponse>>(
      `/reportes/diario-general/${sucursal}/datos?${params.toString()}`
    );
    return data.data ?? { items: [] };
  },

  imprimir: async (sucursal: number, filtros: DiarioGeneralFiltros, items: DiarioGeneralItem[]): Promise<Blob> => {
    const { data } = await apiClient.post<Blob>(
      `/reportes/diario-general/${sucursal}/imprimir`,
      {
        items,
        fechaInicial: filtros.fechaInicial,
        fechaFinal: filtros.fechaFinal,
        tipoDocumento: filtros.tipoDocumento ?? '',
      },
      { responseType: 'blob' }
    );
    return data;
  }
};
