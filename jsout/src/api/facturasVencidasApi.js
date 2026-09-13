import { apiClient } from './client';
export const facturasVencidasApi = {
    obtenerFacturasVencidas: async (sucursal, fechaCorte, codSuplidor, diasMinimo) => {
        const params = new URLSearchParams();
        params.set('fechaCorte', fechaCorte);
        if (codSuplidor)
            params.set('codSuplidor', codSuplidor);
        if (diasMinimo !== undefined)
            params.set('diasMinimo', diasMinimo.toString());
        const { data } = await apiClient.get(`/reportes/facturas-vencidas/${sucursal}?${params.toString()}`);
        return data.data || [];
    },
};
