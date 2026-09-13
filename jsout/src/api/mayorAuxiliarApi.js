import { apiClient } from './client';
const buildParams = (filtros) => {
    const params = new URLSearchParams();
    params.set('desde', filtros.fechaInicial);
    params.set('hasta', filtros.fechaFinal);
    if (filtros.noCuentas && filtros.noCuentas.length > 0) {
        filtros.noCuentas.forEach((c) => params.append('noCuentas', c));
    }
    else if (filtros.noCuenta) {
        params.set('noCuenta', filtros.noCuenta);
    }
    if (filtros.tipoDocumento)
        params.set('tipoDocumento', filtros.tipoDocumento);
    if (filtros.balanceAnterior !== undefined)
        params.set('balanceAnterior', String(filtros.balanceAnterior));
    if (filtros.detallado !== undefined)
        params.set('detallado', String(filtros.detallado));
    return params;
};
export const mayorAuxiliarApi = {
    generarPDF: async (sucursal, filtros) => {
        const params = buildParams(filtros);
        const { data } = await apiClient.get(`/reportes/mayor-auxiliar/${sucursal}?${params.toString()}`, { responseType: 'blob' });
        return data;
    },
    obtenerDatos: async (sucursal, filtros) => {
        const params = buildParams(filtros);
        const { data } = await apiClient.get(`/reportes/mayor-auxiliar/${sucursal}/datos?${params.toString()}`);
        return data.data ?? { items: [], balanceInicial: 0, balanceInicialAlterno: 0, balanceInicialDebito: 0, balanceInicialCredito: 0, balanceFinal: 0, balanceFinalAlterno: 0 };
    },
    imprimir: async (sucursal, filtros, items, balances) => {
        const { data } = await apiClient.post(`/reportes/mayor-auxiliar/${sucursal}/imprimir`, { items, balanceInicial: balances.balanceInicial, balanceInicialAlterno: balances.balanceInicialAlterno, balanceInicialDebito: balances.balanceInicialDebito, balanceInicialCredito: balances.balanceInicialCredito, balanceFinal: balances.balanceFinal, balanceFinalAlterno: balances.balanceFinalAlterno, fechaInicial: filtros.fechaInicial, fechaFinal: filtros.fechaFinal, noCuenta: filtros.noCuenta ?? '', noCuentas: filtros.noCuentas ?? [], tipoDocumento: filtros.tipoDocumento ?? '', balanceAnterior: filtros.balanceAnterior ?? true, detallado: filtros.detallado ?? true }, { responseType: 'blob' });
        return data;
    }
};
