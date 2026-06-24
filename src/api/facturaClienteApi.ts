import { apiClient } from './client';
import type { FacturaVistaDTO, FiltroFacturacion } from '../types/facturacion';
import type { FacturaClienteDTO, FacturaClienteFullDTO, FacturaClienteResumenDTO, TipoDTO, ConceptoDTO, AlmacenDTO, ClienteDTO } from '../types/facturaCliente';
import type { ApiResponse } from '../types/auth';

const BASE = '/FAC';

export const facturaClienteApi = {
  obtenerResumen: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number,
    estado?: number
  ): Promise<{ data: FacturaClienteResumenDTO[]; total: number }> => {
    const params: Record<string, string | number> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;
    if (estado !== undefined) params.estado = estado;

    const { data } = await apiClient.get<ApiResponse<FacturaClienteResumenDTO[]>>(`${BASE}/${sucursal}/resumen`, { params });
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

  obtenerPorId: async (sucursal: number, id: number): Promise<FacturaClienteDTO> => {
    const { data } = await apiClient.get<ApiResponse<FacturaClienteDTO>>(`${BASE}/${sucursal}/${id}`);
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
  crear: async (sucursal: number, factura: FacturaClienteFullDTO): Promise<FacturaClienteFullDTO> => {
    const { data } = await apiClient.post<ApiResponse<FacturaClienteFullDTO>>(`${BASE}/${sucursal}`, factura);
    return data.data;
  },

  actualizar: async (sucursal: number, factura: FacturaClienteFullDTO): Promise<FacturaClienteFullDTO> => {
    const { data } = await apiClient.put<ApiResponse<FacturaClienteFullDTO>>(`${BASE}/${sucursal}`, factura);
    return data.data;
  },

  anular: async (sucursal: number, factura: any): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/anular`, factura);
    return data.data;
  },

  aplicar: async (sucursal: number, id: number): Promise<any> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`${BASE}/${sucursal}/aplicar/${id}`);
    return data.data;
  },

  postear: async (sucursal: number, factura: any, destino?: number): Promise<any> => {
    const params: Record<string, string | number> = {};
    if (destino) params.destino = destino;
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/postear`, factura, { params });
    return data.data;
  },

  desaplicar: async (origen: string, documento: string): Promise<void> => {
    const params = { origen, documento };
    await apiClient.put(`${BASE}/desaplicar`, null, { params });
  },

  revisado: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.post(`${BASE}/${sucursal}/${id}/Revisado`);
  },

  reversar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.post(`${BASE}/${sucursal}/${id}/Reversar`);
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

  eliminar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/Eliminar/${id}`);
  },

  // ===== Catálogos =====
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

  obtenerClientes: async (sucursal: number): Promise<ClienteDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ClienteDTO[]>>(`/Cliente/${sucursal}/activos`);
    return data.data ?? [];
  },

  obtenerTipos: async (sucursal: number): Promise<TipoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TipoDTO[]>>(`/Tipo/${sucursal}/documento/FFAC`);
    return data.data;
  },
};
