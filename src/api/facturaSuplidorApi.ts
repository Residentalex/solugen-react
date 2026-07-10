import { apiClient } from './client';
import type { TransaccionVistaDTO, FiltroTransaccion } from '../types/transaccion';
import type { TipoDTO } from '../types/facturaSuplidor';
import type { ConceptoDTO, SuplidorDTO } from '../types/entradaAlmacen';
import type { ApiResponse } from '../types/auth';

const BASE = '/Transaccion';
const TIPO_DOC = 'RDE';


export const facturaSuplidorApi = {
  obtenerVista: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number,
    estado?: number,
    documentCode = TIPO_DOC,
    tipoEntidad = 'SUP'
  ): Promise<{ data: TransaccionVistaDTO[]; total: number }> => {
    const params: Record<string, string | number> = { TipoEntidad: tipoEntidad };
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;
    if (estado !== undefined) params.estado = estado;

    const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO[]>>(
      `${BASE}/${sucursal}/tipo/${documentCode}`, { params }
    );
    return { data: data.data || [], total: data.total ?? 0 };
  },

  filtrar: async (
    sucursal: number,
    filtro: FiltroTransaccion,
    documentCode = TIPO_DOC,
    tipoEntidad = 'SUP'
  ): Promise<{ data: TransaccionVistaDTO[]; total: number }> => {
    const params: Record<string, string | number> = { tipoEntidad };
    if (filtro.cantidad) params.cantidad = filtro.cantidad;
    if (filtro.salto) params.salto = filtro.salto;
    if (filtro.desde) params.desde = filtro.desde;
    if (filtro.hasta) params.hasta = filtro.hasta;
    if (filtro.documento) params.documento = filtro.documento;
    if (filtro.nCF) params.nCF = filtro.nCF;
    if (filtro.concepto) params.concepto = filtro.concepto;
    if (filtro.entidad) params.entidad = filtro.entidad;

    const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO[]>>(
      `${BASE}/${sucursal}/tipo/${documentCode}/filtrar`, { params }
    );
    return { data: data.data || [], total: data.total ?? 0 };
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<TransaccionVistaDTO> => {
    const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO>>(`/RDE/${sucursal}/${id}`);
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
    const { data } = await apiClient.post<ApiResponse<T>>(`/RDE/${sucursal}/postear`, transaccion);
    return data.data;
  },

  // ===== Catálogos para formulario =====
  obtenerTipos: async (sucursal: number): Promise<TipoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TipoDTO[]>>(`/Tipo/${sucursal}/documento/RDE`);
    return data.data;
  },

  obtenerConceptos: async (sucursal: number, tipoId?: number): Promise<ConceptoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ConceptoDTO[]>>(`/Concepto/${sucursal}/documento/RDE`);
    return data.data;
  },

  obtenerSuplidores: async (sucursal: number): Promise<SuplidorDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<SuplidorDTO[]>>(`/Proveedor/${sucursal}?activo=true`);
    return data.data;
  },

  obtenerEntradasAlmacen: async (sucursal: number, params?: any): Promise<any[]> => {
    const { entidad, ...restParams } = params || {};
    let url: string;
    if (entidad) {
      url = `/ENP/${sucursal}/PorSuplidor`;
      restParams.codigoEntidad = entidad;
    } else {
      url = `/ENP/${sucursal}`;
    }
    const { data } = await apiClient.get<ApiResponse<any[]>>(url, { params: restParams });
    return data.data;
  },

  obtenerDetalleEntrada: async (sucursal: number, id: number): Promise<any> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/ENP/${sucursal}/${id}`);
    return data.data;
  },

  verificarNCF: async (sucursal: number, ncf: string, suplidorCodigo: string): Promise<boolean> => {
    const { data } = await apiClient.get<ApiResponse<boolean>>(
      `${BASE}/${sucursal}/ncf?ncf=${encodeURIComponent(ncf)}&idEntidad=${encodeURIComponent(suplidorCodigo)}`
    );
    return data.data;
  },

  obtenerPorDocumento: async (sucursal: number, noDocumento: string): Promise<any> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/RDE/${sucursal}/documento/${noDocumento}`);
    return data.data;
  },

  // ===== Scanner =====
  verificarScan: async (sucursal: number, id: number): Promise<{ existe: boolean }> => {
    const { data } = await apiClient.get<ApiResponse<{ existe: boolean }>>(`/Transaccion/${sucursal}/${id}/scanner/verificar`);
    return data.data;
  },

  descargarScan: async (sucursal: number, id: number): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(`/Transaccion/${sucursal}/${id}/scanner/descargar`, {
      responseType: 'blob',
    });
    return data;
  },

  generarAsientos: async (sucursal: number, transaccion: any): Promise<any[]> => {
    const { data } = await apiClient.post<ApiResponse<any[]>>(`/RDE/${sucursal}/generarAsiento`, transaccion);
    return data.data;
  },

  // ===== Acciones de estado =====
  desaplicar: async (origen: string, documento: string): Promise<void> => {
    const params = { origen, documento };
    await apiClient.put(`/RDE/desaplicar`, null, { params });
  },

  revisado: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.post(`/RDE/${sucursal}/${id}/Revisado`);
  },

  reversar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.post(`/RDE/${sucursal}/${id}/Reversar`);
  },
};
