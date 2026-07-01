import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { ConceptoDTO, EntidadDTO, AlmacenDTO, SuplidorDTO, CompaniaDTO } from '../types/entradaAlmacen';

const CONCEPTOS_BASE = '/Concepto';
const PROVEEDORES_BASE = '/Proveedor';
const ALMACENES_BASE = '/Almacen';

export const conceptosApi = {
  obtenerConceptos: async (
    sucursal: number,
    filtro?: string
  ): Promise<ConceptoDTO[]> => {
    const params: Record<string, string> = {};
    if (filtro) params.filtro = filtro;

    const { data } = await apiClient.get<ApiResponse<ConceptoDTO[]>>(
      `${CONCEPTOS_BASE}/${sucursal}`,
      { params }
    );
    return data.data;
  },

  filtrar: async (
    sucursal: number,
    filtro: { cantidad?: number; salto?: number; busqueda?: string }
  ): Promise<ConceptoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ConceptoDTO[]>>(`${CONCEPTOS_BASE}/${sucursal}/filtrar`, { params: filtro });
    return data.data;
  },

  obtenerTotal: async (
    sucursal: number,
    params?: { busqueda?: string }
  ): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${CONCEPTOS_BASE}/total/${sucursal}`, { params });
    return data.data;
  },

  obtenerConceptosPorDocumento: async (sucursal: number, documento: string, filtro?: string): Promise<ConceptoDTO[]> => {
    const params: Record<string, string> = {};
    if (filtro) params.filtro = filtro;
    const { data } = await apiClient.get<ApiResponse<ConceptoDTO[]>>(`${CONCEPTOS_BASE}/${sucursal}/documento/${documento}`, { params });
    return data.data;
  },

  obtenerConcepto: async (sucursal: number, codigo: string): Promise<ConceptoDTO> => {
    const { data } = await apiClient.get<ApiResponse<ConceptoDTO>>(
      `${CONCEPTOS_BASE}/${sucursal}/${codigo}`
    );
    return data.data;
  },

  obtenerEntidades: async (
    sucursal: number,
    conceptoCodigo?: string,
    activo?: boolean,
    tipo?: string
  ): Promise<EntidadDTO[]> => {
    const params: Record<string, string> = {};
    if (conceptoCodigo) params.concepto = conceptoCodigo;
    if (activo !== undefined) params.activo = String(activo);
    if (tipo) params.tipo = tipo;

    const { data } = await apiClient.get<ApiResponse<EntidadDTO[]>>(
      `/Entidad/${sucursal}`,
      { params }
    );
    return data.data;
  },

  obtenerSuplidores: async (sucursal: number): Promise<SuplidorDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<SuplidorDTO[]>>(
      `${PROVEEDORES_BASE}/${sucursal}?activo=true`
    );
    return data.data;
  },

  obtenerAlmacenes: async (sucursal: number): Promise<AlmacenDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<AlmacenDTO[]>>(
      `${ALMACENES_BASE}/${sucursal}`
    );
    return data.data;
  },

  obtenerSucursales: async (sucursal: number): Promise<CompaniaDTO[]> => {
    const { data } = await apiClient.get<CompaniaDTO[]>(`/Compania/todas/${sucursal}`);
    return data;
  },

  obtenerConceptosPorDocumentoTipo: async (
    sucursal: number,
    documento: string,
    tipo?: string,
    tipoEntidad?: string
  ): Promise<ConceptoDTO[]> => {
    const params: Record<string, string> = { documento };
    if (tipo) params.tipo = tipo;
    if (tipoEntidad) params.tipoEntidad = tipoEntidad;
    const { data } = await apiClient.get<ApiResponse<ConceptoDTO[]>>(
      `${CONCEPTOS_BASE}/${sucursal}/documentoporTipo`,
      { params }
    );
    return data.data;
  },

  obtenerConceptosPorSucursalDestino: async (sucursal: number, codSucDest: string): Promise<ConceptoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ConceptoDTO[]>>(
      `${CONCEPTOS_BASE}/${sucursal}/porSucursalDestino/${codSucDest}`
    );
    return data.data;
  },

  actualizarConcepto: async (sucursal: number, codigo: string, dto: ConceptoDTO): Promise<ConceptoDTO> => {
    const { data } = await apiClient.put<ApiResponse<ConceptoDTO>>(`${CONCEPTOS_BASE}/${sucursal}/${codigo}`, dto);
    return data.data;
  },

  crearConcepto: async (sucursal: number, dto: ConceptoDTO): Promise<ConceptoDTO> => {
    const { data } = await apiClient.post<ApiResponse<ConceptoDTO>>(`${CONCEPTOS_BASE}/${sucursal}`, dto);
    return data.data;
  },
};
