import { apiClient } from './client';

export interface MayorAuxiliarFiltros {
  fechaInicial: string;
  fechaFinal: string;
  noCuenta?: string;
  tipoDocumento?: string;
  balanceAnterior?: boolean;
  detallado?: boolean;
}

export const mayorAuxiliarApi = {
  generarPDF: async (sucursal: number, filtros: MayorAuxiliarFiltros): Promise<Blob> => {
    const params = new URLSearchParams();
    params.set('fechaInicial', filtros.fechaInicial);
    params.set('fechaFinal', filtros.fechaFinal);
    if (filtros.noCuenta) params.set('noCuenta', filtros.noCuenta);
    if (filtros.tipoDocumento) params.set('tipoDocumento', filtros.tipoDocumento);
    if (filtros.balanceAnterior !== undefined) params.set('balanceAnterior', String(filtros.balanceAnterior));
    if (filtros.detallado !== undefined) params.set('detallado', String(filtros.detallado));

    const { data } = await apiClient.get<Blob>(
      `/reportes/mayor-auxiliar/${sucursal}?${params.toString()}`,
      { responseType: 'blob' }
    );
    return data;
  }
};
