import { apiClient } from './client';
import type { MovimientoVistaDTO, ConceptoDTO, AlmacenDTO, SuplidorDTO } from '../types/entradaAlmacen';
import type { FiltroSAP, SalidaAlmacenDTO, SalidaAlmacenFullDTO } from '../types/salidaAlmacen';
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
  ): Promise<{ data: MovimientoVistaDTO[]; total: number }> => {
    const params: Record<string, string | number> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;
    if (estado !== undefined) params.estado = estado;

    const { data } = await apiClient.get<ApiResponse<MovimientoVistaDTO[]>>(`${BASE}/${sucursal}`, { params });
    return { data: data.data || [], total: data.total ?? 0 };
  },

  filtrar: async (
    sucursal: number,
    filtro: FiltroSAP
  ): Promise<{ data: MovimientoVistaDTO[]; total: number }> => {
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
    return { data: data.data || [], total: data.total ?? 0 };
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

  desaplicar: async (sucursal: number, documento: string): Promise<any> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`${BASE}/desaplicar`, null, {
      params: { origen: sucursal, documento }
    });
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

  revisado: async (sucursal: number, id: number): Promise<any> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`${BASE}/${sucursal}/${id}/revisado`);
    return data.data;
  },

  reversar: async (sucursal: number, id: number): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/${id}/reversar`);
    return data.data;
  },

  verificarScan: async (sucursal: number, id: number): Promise<{ existe: boolean }> => {
    const { data } = await apiClient.get<ApiResponse<{ existe: boolean }>>(`${BASE}/${sucursal}/${id}/scanner/verificar`);
    return data.data;
  },

  descargarScan: async (sucursal: number, id: number): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(`${BASE}/${sucursal}/${id}/scanner/descargar`, {
      responseType: 'blob',
    });
    return data;
  },

  obtenerTransferencias: async (sucursal: number, desde: string, hasta: string): Promise<SalidaAlmacenDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<SalidaAlmacenDTO[]>>(
      `${BASE}/${sucursal}/Transferencias?desde=${desde}&hasta=${hasta}`
    );
    return data.data;
  },

  // Catálogos para selects
  obtenerConceptos: async (sucursal: number, tipoDocumento?: string): Promise<ConceptoDTO[]> => {
    const url = tipoDocumento ? `/Concepto/${sucursal}/documento/${tipoDocumento}` : `/Concepto/${sucursal}`;
    const params: Record<string, string> = {};
    const { data } = await apiClient.get<ApiResponse<ConceptoDTO[]>>(url, { params });
    return data.data;
  },

  obtenerAlmacenes: async (sucursal: number): Promise<AlmacenDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<AlmacenDTO[]>>(`/Almacen/${sucursal}`);
    return data.data;
  },

  obtenerSuplidores: async (sucursal: number): Promise<SuplidorDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<SuplidorDTO[]>>(`/Proveedor/${sucursal}?activo=true`);
    return data.data;
  },
};
