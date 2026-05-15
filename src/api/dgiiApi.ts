import dayjs from 'dayjs';
import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { ResumenTipoNcfDTO, ResumenTipoNcfSucursalDTO, EnvioDGIIDTO } from '../types/facturacion';

const BASE = '/DGII';

function formatearFecha(d: dayjs.Dayjs): string {
  return d.format('YYYYMMDDHHmmss');
}

async function extraerDatos<T>(resp: any): Promise<T> {
  return resp?.data?.data ?? resp?.data ?? resp;
}

export const dgiiApi = {
  obtenerResumen: async (desde: dayjs.Dayjs, hasta: dayjs.Dayjs): Promise<ResumenTipoNcfDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ResumenTipoNcfDTO[]>>(`${BASE}/resumen`, {
      params: { desde: formatearFecha(desde), hasta: formatearFecha(hasta) },
    });
    return data.data;
  },

  obtenerResumenPorSucursal: async (desde: dayjs.Dayjs, hasta: dayjs.Dayjs): Promise<ResumenTipoNcfSucursalDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ResumenTipoNcfSucursalDTO[]>>(`${BASE}/resumen-sucursal`, {
      params: { desde: formatearFecha(desde), hasta: formatearFecha(hasta) },
    });
    return data.data;
  },

  obtenerEmitidos: async (desde: dayjs.Dayjs, hasta: dayjs.Dayjs, skip = 0, take = 25): Promise<EnvioDGIIDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<EnvioDGIIDTO[]>>(`${BASE}/emitidos`, {
      params: { desde: formatearFecha(desde), hasta: formatearFecha(hasta), skip, take },
    });
    return data.data;
  },

  obtenerPendientes: async (desde: dayjs.Dayjs, hasta: dayjs.Dayjs, skip = 0, take = 25): Promise<EnvioDGIIDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<EnvioDGIIDTO[]>>(`${BASE}/pendientes-dashboard`, {
      params: { desde: formatearFecha(desde), hasta: formatearFecha(hasta), skip, take },
    });
    return data.data;
  },

  marcarEnviado: async (sucursal: number, transaccionID: number): Promise<void> => {
    await apiClient.put(`${BASE}/${sucursal}/MarcarEnviado`, null, {
      params: { transaccionID },
    });
  },

  reasignarNCF: async (sucursal: number, tipoNCF: string, idTransaccion: number): Promise<void> => {
    await apiClient.put(`/Transaccion/${sucursal}/ncf`, null, {
      params: { tipoNCF, idTransaccion },
    });
  },

  obtenerMetodoFacturacion: async (sucursal: number): Promise<number> => {
    const resp = await apiClient.get(`/Parametros/${sucursal}/MetodoFacDGII`);
    const metodo = await extraerDatos<number>(resp);
    return metodo;
  },

  cargarYEnviarFactura: async (sucursal: number, transaccionID: number, tipoDocumento: number): Promise<void> => {
    const TIPO_PV = 52;
    const TIPO_FAC = 35;
    const TIPO_DEV = 20;

    if (tipoDocumento === TIPO_PV || tipoDocumento === TIPO_FAC) {
      const prefix = tipoDocumento === TIPO_PV ? 'PV' : 'FAC';
      const loadResp = await apiClient.get(`/${prefix}/${sucursal}/${transaccionID}`);
      const doc = await extraerDatos(loadResp);
      const sendResp = await apiClient.post(`/ecf/${sucursal}/Facturas/enviar`, doc);
      const result = await extraerDatos<{ isSuccess: boolean; errorMessage?: string }>(sendResp);
      if (!result?.isSuccess) throw new Error(result?.errorMessage || 'Error al enviar a DGII');
    } else if (tipoDocumento === TIPO_DEV) {
      const loadResp = await apiClient.get(`/DEV/${sucursal}/${transaccionID}`);
      const doc = await extraerDatos(loadResp);
      const sendResp = await apiClient.post(`/ecf/${sucursal}/NotaCredito/enviar`, doc);
      const result = await extraerDatos<{ isSuccess: boolean; errorMessage?: string }>(sendResp);
      if (!result?.isSuccess) throw new Error(result?.errorMessage || 'Error al enviar NC a DGII');
    } else {
      throw new Error(`Tipo de documento no soportado: ${tipoDocumento}`);
    }
  },
};
