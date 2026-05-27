import { apiClient } from './client';
import type { TransaccionVistaDTO, FiltroTransaccion } from '../types/transaccion';
import type { TipoDTO } from '../types/facturaSuplidor';
import type { ConceptoDTO, SuplidorDTO } from '../types/entradaAlmacen';
import type { ApiResponse } from '../types/auth';

const BASE = '/Transaccion';
const TIPO_DOC = 'RDE';
const TIPO_ENTIDAD = 'SUP';

export const facturaSuplidorApi = {
  obtenerVista: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number,
    estado?: number
  ): Promise<TransaccionVistaDTO[]> => {
    const params: Record<string, string | number> = { TipoEntidad: TIPO_ENTIDAD };
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;
    if (estado !== undefined) params.estado = estado;

    const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO[]>>(
      `${BASE}/${sucursal}/tipo/${TIPO_DOC}`, { params }
    );
    return data.data;
  },

  filtrar: async (
    sucursal: number,
    filtro: FiltroTransaccion
  ): Promise<TransaccionVistaDTO[]> => {
    const params: Record<string, string | number> = { tipoEntidad: TIPO_ENTIDAD };
    if (filtro.cantidad) params.cantidad = filtro.cantidad;
    if (filtro.salto) params.salto = filtro.salto;
    if (filtro.desde) params.desde = filtro.desde;
    if (filtro.hasta) params.hasta = filtro.hasta;
    if (filtro.documento) params.documento = filtro.documento;
    if (filtro.nCF) params.nCF = filtro.nCF;
    if (filtro.concepto) params.concepto = filtro.concepto;
    if (filtro.entidad) params.entidad = filtro.entidad;

    const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO[]>>(
      `${BASE}/${sucursal}/tipo/${TIPO_DOC}/filtrar`, { params }
    );
    return data.data;
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<TransaccionVistaDTO> => {
    const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  crear: async <T>(sucursal: number, transaccion: T): Promise<T> => {
    const { data } = await apiClient.post<ApiResponse<T>>(`${BASE}/${sucursal}`, transaccion);
    return data.data;
  },

  actualizar: async <T>(sucursal: number, transaccion: T): Promise<T> => {
    const { data } = await apiClient.put<ApiResponse<T>>(`${BASE}/${sucursal}`, transaccion);
    return data.data;
  },

  anular: async <T>(sucursal: number, transaccion: T): Promise<T> => {
    const { data } = await apiClient.post<ApiResponse<T>>(`${BASE}/${sucursal}/anular`, transaccion);
    return data.data;
  },

  aplicar: async (sucursal: number, id: number): Promise<TransaccionVistaDTO> => {
    const { data } = await apiClient.put<ApiResponse<TransaccionVistaDTO>>(`${BASE}/${sucursal}/aplicar/${id}`);
    return data.data;
  },

  postear: async <T>(sucursal: number, transaccion: T): Promise<T> => {
    const { data } = await apiClient.post<ApiResponse<T>>(`${BASE}/${sucursal}/postear`, transaccion);
    return data.data;
  },

  // ===== Catálogos para formulario =====
  obtenerTipos: async (sucursal: number): Promise<TipoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TipoDTO[]>>(`/Tipo/${sucursal}/documento/RDE`);
    return data.data;
  },

  obtenerConceptos: async (sucursal: number, tipoId?: number): Promise<ConceptoDTO[]> => {
    const params: Record<string, any> = { documento: 'RDE' };
    if (tipoId) params.tipoId = tipoId;
    const { data } = await apiClient.get<ApiResponse<ConceptoDTO[]>>(`/Concepto/${sucursal}`, { params });
    return data.data;
  },

  obtenerSuplidores: async (sucursal: number): Promise<SuplidorDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<SuplidorDTO[]>>(`/Proveedor/${sucursal}`);
    return data.data;
  },

  obtenerEntradasAlmacen: async (sucursal: number, params?: any): Promise<any[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/ENP/${sucursal}/vista`, { params });
    return data.data;
  },

  obtenerDetalleEntrada: async (sucursal: number, id: number): Promise<any> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/ENP/${sucursal}/${id}`);
    return data.data;
  },

  verificarNCF: async (sucursal: number, ncf: string, suplidorCodigo: string): Promise<boolean> => {
    const { data } = await apiClient.get<ApiResponse<boolean>>(
      `${BASE}/${sucursal}/ncf-verificar?ncf=${encodeURIComponent(ncf)}&suplidor=${encodeURIComponent(suplidorCodigo)}`
    );
    return data.data;
  },
};
