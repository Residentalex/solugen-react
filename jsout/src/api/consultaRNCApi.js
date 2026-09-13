import { apiClient } from './client';
const BASE = '/ConsultaRNC';
// El controller usa `Sucursal sucursal` como tipo simple (enum) en ambos
// endpoints, por lo que se enlaza por query string: ?sucursal=<número>.
export const consultaRNCApi = {
    consultar: async (sucursal, rnc) => {
        const { data } = await apiClient.get(`${BASE}/${encodeURIComponent(rnc)}`, { params: { sucursal } });
        return data.data ?? null;
    },
    guardar: async (sucursal, rnc) => {
        const { data } = await apiClient.post(`${BASE}/${encodeURIComponent(rnc)}/guardar`, null, { params: { sucursal } });
        return data.data ?? null;
    },
};
