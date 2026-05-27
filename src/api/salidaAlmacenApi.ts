import { apiClient } from './client';
import type { MovimientoVistaDTO, ConceptoDTO, AlmacenDTO, SuplidorDTO } from '../types/entradaAlmacen';
import type { FiltroSAP, SalidaAlmacenFullDTO } from '../types/salidaAlmacen';
import type { ApiResponse } from '../types/auth';

const BASE = '/SAP';

export const salidaAlmacenApi = {
  obtenerVista: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number,
    estado?: number
  ): Promise<MovimientoVistaDTO[]> => {
    const params: Record<string, string | number> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;
    if (estado !== undefined) params.estado = estado;

    const { data } = await apiClient.get<ApiResponse<MovimientoVistaDTO[]>>(`${BASE}/${sucursal}`, { params });
    return data.data;
  },

  filtrar: async (
    sucursal: number,
    filtro: FiltroSAP
  ): Promise<MovimientoVistaDTO[]> => {
    const params: Record<string, string | number> = {};
    if (filtro.cantidad) params.cantidad = filtro.cantidad;
    if (filtro.salto) params.salto = filtro.salto;
    if (filtro.desde) params.desde = filtro.desde;
    if (filtro.hasta) params.hasta = filtro.hasta;
    if (filtro.documento) params.documento = filtro.documento;
    if (filtro.concepto) params.concepto = filtro.concepto;
    if (filtro.suplidor) params.suplidor = filtro.suplidor;
    if (filtro.almacen) params.almacen = filtro.almacen;

    const { data } = await apiClient.get<ApiResponse<MovimientoVistaDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params });
    return data.data;
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<SalidaAlmacenFullDTO> => {
    const { data } = await apiClient.get<ApiResponse<SalidaAlmacenFullDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  crear: async (sucursal: number, salida: SalidaAlmacenFullDTO): Promise<SalidaAlmacenFullDTO> => {
    const { data } = await apiClient.post<ApiResponse<SalidaAlmacenFullDTO>>(`${BASE}/${sucursal}`, salida);
    return data.data;
  },

  actualizar: async (sucursal: number, salida: SalidaAlmacenFullDTO): Promise<SalidaAlmacenFullDTO> => {
    const { data } = await apiClient.put<ApiResponse<SalidaAlmacenFullDTO>>(`${BASE}/${sucursal}`, salida);
    return data.data;
  },

  aplicar: async (sucursal: number, id: number): Promise<SalidaAlmacenFullDTO> => {
    const { data } = await apiClient.put<ApiResponse<SalidaAlmacenFullDTO>>(`${BASE}/${sucursal}/aplicar/${id}`);
    return data.data;
  },

  postear: async (sucursal: number, salida: SalidaAlmacenFullDTO): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/postear`, salida);
    return data.data;
  },

  anular: async (sucursal: number, salida: any): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/anular`, salida);
    return data.data;
  },

  eliminar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/eliminar/${id}`);
  },

  // Catálogos para selects
  obtenerConceptos: async (sucursal: number, tipoDocumento?: string): Promise<ConceptoDTO[]> => {
    const params: Record<string, string> = {};
    if (tipoDocumento) params.documento = tipoDocumento;
    const { data } = await apiClient.get<ApiResponse<ConceptoDTO[]>>(`/Concepto/${sucursal}`, { params });
    return data.data;
  },

  obtenerAlmacenes: async (sucursal: number): Promise<AlmacenDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<AlmacenDTO[]>>(`/Almacen/${sucursal}`);
    return data.data;
  },

  obtenerSuplidores: async (sucursal: number): Promise<SuplidorDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<SuplidorDTO[]>>(`/Proveedor/${sucursal}`);
    return data.data;
  },
};
