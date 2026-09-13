import dayjs from 'dayjs';
import { apiClient } from './client';
const BASE = '/DGII';
function formatearFecha(d) {
    return d.format('YYYYMMDDHHmmss');
}
async function extraerDatos(resp) {
    return resp?.data?.data ?? resp?.data ?? resp;
}
export const dgiiApi = {
    obtenerResumen: async (desde, hasta) => {
        const { data } = await apiClient.get(`${BASE}/resumen`, {
            params: { desde: formatearFecha(desde), hasta: formatearFecha(hasta) },
        });
        return data.data;
    },
    obtenerResumenPorSucursal: async (desde, hasta) => {
        const { data } = await apiClient.get(`${BASE}/resumen-sucursal`, {
            params: { desde: formatearFecha(desde), hasta: formatearFecha(hasta) },
        });
        return data.data;
    },
    obtenerEmitidos: async (desde, hasta, skip = 0, take = 25) => {
        const { data } = await apiClient.get(`${BASE}/emitidos`, {
            params: { desde: formatearFecha(desde), hasta: formatearFecha(hasta), skip, take },
        });
        return data.data;
    },
    obtenerPendientes: async (desde, hasta, skip = 0, take = 25) => {
        const { data } = await apiClient.get(`${BASE}/pendientes-dashboard`, {
            params: { desde: formatearFecha(desde), hasta: formatearFecha(hasta), skip, take },
        });
        return data.data;
    },
    marcarEnviado: async (sucursal, transaccionID) => {
        await apiClient.put(`${BASE}/${sucursal}/MarcarEnviado`, null, {
            params: { transaccionID },
        });
    },
    reasignarNCF: async (sucursal, tipoNCF, idTransaccion) => {
        await apiClient.put(`/Transaccion/${sucursal}/ncf`, null, {
            params: { tipoNCF, idTransaccion },
        });
    },
    obtenerMetodoFacturacion: async (sucursal) => {
        const resp = await apiClient.get(`/Parametros/${sucursal}/MetodoFacDGII`);
        const metodo = await extraerDatos(resp);
        return metodo;
    },
    cargarYEnviarFactura: async (sucursal, transaccionID, tipoDocumento) => {
        const MAPA_TIPO_STR = { PV: 52, FAC: 35, DEV: 20, NC: 20 };
        const TIPO_PV = 52;
        const TIPO_FAC = 35;
        const TIPO_DEV = 20;
        const tipoNum = typeof tipoDocumento === 'string'
            ? MAPA_TIPO_STR[tipoDocumento]
            : tipoDocumento;
        if (tipoNum === TIPO_PV || tipoNum === TIPO_FAC) {
            const prefix = tipoNum === TIPO_PV ? 'PV' : 'FAC';
            const loadResp = await apiClient.get(`/${prefix}/${sucursal}/${transaccionID}`);
            const doc = await extraerDatos(loadResp);
            const sendResp = await apiClient.post(`/ecf/${sucursal}/Facturas/enviar`, doc);
            const body = sendResp.data;
            if (!body?.isSuccess)
                throw new Error(body?.errorMessage || 'Error al enviar a DGII');
            const result = await extraerDatos(sendResp);
            return result;
        }
        else if (tipoNum === TIPO_DEV) {
            const loadResp = await apiClient.get(`/DEV/${sucursal}/${transaccionID}`);
            const doc = await extraerDatos(loadResp);
            const sendResp = await apiClient.post(`/ecf/${sucursal}/NotaCredito/enviar`, doc);
            const body = sendResp.data;
            if (!body?.isSuccess)
                throw new Error(body?.errorMessage || 'Error al enviar NC a DGII');
            const result = await extraerDatos(sendResp);
            return result;
        }
        else {
            throw new Error(`Tipo de documento no soportado: ${tipoDocumento}`);
        }
    },
};
