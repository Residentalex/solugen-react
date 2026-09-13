import { apiClient } from './client';
const BASE = '/AnalisisCompra';
export const analisisCompraApi = {
    obtenerPorPlantilla: async (sucursal, codigoPlantilla) => {
        const { data } = await apiClient.get(`${BASE}/Obtener/${sucursal}/plantilla`, { params: { codigoPlantilla } });
        return data.data;
    },
    obtenerMovimientosPorCodigos: async (sucursal, codigos) => {
        console.log('API analisisCompra: llamada recibida, sucursal=', sucursal, 'codigos=', codigos?.length);
        if (!codigos || codigos.length === 0) {
            console.log('API analisisCompra: sin codigos, retornando []');
            return [];
        }
        try {
            const url = `${BASE}/Obtener/${sucursal}/movimientos/codigos`;
            console.log('API analisisCompra: POST', url, 'body length:', codigos.length);
            const { data } = await apiClient.post(url, codigos);
            console.log('API analisisCompra: respuesta recibida', data);
            return data.data ?? [];
        }
        catch (e) {
            console.log('API analisisCompra: ERROR', e);
            return [];
        }
    },
    refrescarPorCodigos: async (sucursal, codigos) => {
        await apiClient.post(`${BASE}/RefrescarPorCodigos/${sucursal}`, codigos);
    },
    refrescarPorCodigosTodasSucursales: async (codigos) => {
        const { data } = await apiClient.post('/Sucursales/RefrescarAnalisisCompra', codigos);
        return data.data;
    },
    refrescarPorCodigosEnSegundoPlano: async (codigos) => {
        const { data } = await apiClient.post('/Sucursales/RefrescarAnalisisCompra', codigos);
        return data.data;
    },
};
