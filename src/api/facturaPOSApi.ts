import { apiClient } from './client';
import type { FacturaVistaDTO, FiltroFacturacion } from '../types/facturacion';
import type { FacturaPOSDTO, FacturaPOSResumenDTO, FacturaPOSFormularioDTO } from '../types/facturaPOS';
import type { ApiResponse } from '../types/auth';

const BASE = '/PV';

export const facturaPOSApi = {
  buscarPorDocumento: async (sucursal: number, params?: any): Promise<{ data: FacturaPOSResumenDTO[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<FacturaPOSResumenDTO[]>>(`${BASE}/${sucursal}/buscar-documento`, { params });
    return { data: data.data || [], total: data.total ?? 0 };
  },

  buscarPorNCF: async (sucursal: number, params?: any): Promise<{ data: FacturaPOSResumenDTO[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<FacturaPOSResumenDTO[]>>(`${BASE}/${sucursal}/buscar-ncf`, { params });
    return { data: data.data || [], total: data.total ?? 0 };
  },

  buscarPorTurno: async (sucursal: number, params?: any): Promise<{ data: FacturaPOSResumenDTO[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<FacturaPOSResumenDTO[]>>(`${BASE}/${sucursal}/buscar-turno`, { params });
    return { data: data.data || [], total: data.total ?? 0 };
  },

  buscarPorCliente: async (sucursal: number, params?: any): Promise<{ data: FacturaPOSResumenDTO[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<FacturaPOSResumenDTO[]>>(`${BASE}/${sucursal}/buscar-cliente`, { params });
    return { data: data.data || [], total: data.total ?? 0 };
  },

  buscarPorCampos: async (
    sucursal: number,
    params?: { cantidad?: number; salto?: number; desde?: string; hasta?: string; documento?: string; nCF?: string; cliente?: string; turno?: string }
  ): Promise<{ data: FacturaPOSResumenDTO[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<FacturaPOSResumenDTO[]>>(`${BASE}/${sucursal}/buscar`, { params });
    return { data: data.data || [], total: data.total ?? 0 };
  },

  obtenerResumen: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number,
    estado?: number
  ): Promise<{ data: FacturaPOSResumenDTO[]; total: number }> => {
    const params: Record<string, string | number> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;
    if (estado !== undefined) params.estado = estado;

    const { data } = await apiClient.get<ApiResponse<FacturaPOSResumenDTO[]>>(`${BASE}/${sucursal}/resumen`, { params });
    return { data: data.data || [], total: data.total ?? 0 };
  },

  obtenerVista: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number,
    estado?: number
  ): Promise<{ data: FacturaVistaDTO[]; total: number }> => {
    const params: Record<string, string | number> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;
    if (estado !== undefined) params.estado = estado;

    const { data } = await apiClient.get<ApiResponse<FacturaVistaDTO[]>>(`${BASE}/${sucursal}`, { params });
    return { data: data.data || [], total: data.total ?? 0 };
  },

  filtrar: async (
    sucursal: number,
    filtro: FiltroFacturacion
  ): Promise<{ data: FacturaVistaDTO[]; total: number }> => {
    const params: Record<string, string | number> = {};
    if (filtro.cantidad) params.cantidad = filtro.cantidad;
    if (filtro.salto) params.salto = filtro.salto;
    if (filtro.desde) params.desde = filtro.desde;
    if (filtro.hasta) params.hasta = filtro.hasta;
    if (filtro.documento) params.documento = filtro.documento;
    if (filtro.nCF) params.nCF = filtro.nCF;
    if (filtro.concepto) params.concepto = filtro.concepto;
    if (filtro.entidad) params.cliente = filtro.entidad;
    if (filtro.cliente) params.cliente = filtro.cliente;
    if (filtro.referencia) params.referencia = filtro.referencia;
    if (filtro.almacen) params.almacen = filtro.almacen;

    const { data } = await apiClient.get<ApiResponse<FacturaVistaDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params });
    return { data: data.data || [], total: data.total ?? 0 };
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<FacturaPOSDTO> => {
    const { data } = await apiClient.get<ApiResponse<FacturaPOSDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  obtenerTotal: async (sucursal: number, desde?: string, hasta?: string): Promise<number> => {
    const params: Record<string, string> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/total/${sucursal}`, { params });
    return data.data;
  },

  // ===== CRUD formulario =====
  crear: async (sucursal: number, factura: FacturaPOSFormularioDTO): Promise<FacturaPOSDTO> => {
    const { data } = await apiClient.post<ApiResponse<FacturaPOSDTO>>(`${BASE}/${sucursal}`, factura);
    return data.data;
  },

  actualizar: async (sucursal: number, factura: FacturaPOSFormularioDTO): Promise<FacturaPOSDTO> => {
    const { data } = await apiClient.put<ApiResponse<FacturaPOSDTO>>(`${BASE}/${sucursal}`, factura);
    return data.data;
  },

  anular: async (sucursal: number, factura: FacturaPOSDTO): Promise<FacturaPOSDTO> => {
    const { data } = await apiClient.post<ApiResponse<FacturaPOSDTO>>(`${BASE}/${sucursal}/anular`, factura);
    return data.data;
  },

  aplicar: async (sucursal: number, id: number): Promise<FacturaPOSDTO> => {
    const { data } = await apiClient.put<ApiResponse<FacturaPOSDTO>>(`${BASE}/${sucursal}/aplicar/${id}`);
    return data.data;
  },

  postear: async (sucursal: number, factura: FacturaPOSDTO): Promise<FacturaPOSDTO> => {
    const { data } = await apiClient.post<ApiResponse<FacturaPOSDTO>>(`${BASE}/${sucursal}/postear`, factura);
    return data.data;
  },

  // ===== Catálogos =====
  obtenerConceptos: async (sucursal: number, tipoDocumento?: string): Promise<any[]> => {
    const url = tipoDocumento ? `/Concepto/${sucursal}/documento/${tipoDocumento}` : `/Concepto/${sucursal}`;
    const params: Record<string, string> = {};
    const { data } = await apiClient.get<ApiResponse<any[]>>(url, { params });
    return data.data;
  },

  obtenerAlmacenes: async (sucursal: number): Promise<any[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/Almacen/${sucursal}`);
    return data.data;
  },

  obtenerClientes: async (sucursal: number): Promise<any[]> => {
    const { data } = await apiClient.get<any[]>(`/Cliente/${sucursal}/activos`);
    return data;
  },
};
