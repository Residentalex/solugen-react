import { apiClient } from './client';
import type { FacturaVistaDTO, FiltroFacturacion } from '../types/facturacion';
import type { DevolucionVentaDTO, DevolucionVentaFullDTO } from '../types/devolucionVenta';
import type { ConceptoDTO, AlmacenDTO } from '../types/entradaAlmacen';
import type { ClienteDTO } from '../types/facturaPOS';
import type { ApiResponse } from '../types/auth';

const BASE = '/DEV';

export const devolucionVentaApi = {
  obtenerVista: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number,
    estado?: number
  ): Promise<FacturaVistaDTO[]> => {
    const params: Record<string, string | number> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;
    if (estado !== undefined) params.estado = estado;

    const { data } = await apiClient.get<ApiResponse<FacturaVistaDTO[]>>(`${BASE}/${sucursal}`, { params });
    return data.data;
  },

  filtrar: async (
    sucursal: number,
    filtro: FiltroFacturacion
  ): Promise<FacturaVistaDTO[]> => {
    const params: Record<string, string | number> = {};
    if (filtro.cantidad) params.cantidad = filtro.cantidad;
    if (filtro.salto) params.salto = filtro.salto;
    if (filtro.desde) params.desde = filtro.desde;
    if (filtro.hasta) params.hasta = filtro.hasta;
    if (filtro.documento) params.documento = filtro.documento;
    if (filtro.nCF) params.nCF = filtro.nCF;
    if (filtro.concepto) params.concepto = filtro.concepto;
    if (filtro.cliente) params.cliente = filtro.cliente;
    if (filtro.referencia) params.referencia = filtro.referencia;
    if (filtro.almacen) params.almacen = filtro.almacen;

    const { data } = await apiClient.get<ApiResponse<FacturaVistaDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params });
    return data.data;
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<DevolucionVentaDTO> => {
    const { data } = await apiClient.get<ApiResponse<DevolucionVentaDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  crear: async (sucursal: number, devolucion: DevolucionVentaFullDTO): Promise<DevolucionVentaFullDTO> => {
    const { data } = await apiClient.post<ApiResponse<DevolucionVentaFullDTO>>(`${BASE}/${sucursal}`, devolucion);
    return data.data;
  },

  actualizar: async (sucursal: number, devolucion: DevolucionVentaFullDTO): Promise<DevolucionVentaFullDTO> => {
    const { data } = await apiClient.put<ApiResponse<DevolucionVentaFullDTO>>(`${BASE}/${sucursal}`, devolucion);
    return data.data;
  },

  aplicar: async (sucursal: number, id: number): Promise<any> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`${BASE}/${sucursal}/aplicar/${id}`);
    return data.data;
  },

  desaplicar: async (sucursal: number, documento: string): Promise<any> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`${BASE}/desaplicar?sucursal=${sucursal}&documento=${documento}`);
    return data.data;
  },

  postear: async (sucursal: number, devolucion: any, destino?: number): Promise<any> => {
    const params: Record<string, string | number> = {};
    if (destino) params.destino = destino;
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/postear`, devolucion, { params });
    return data.data;
  },

  postearMovimiento: async (sucursal: number, movimiento: any, destino?: number): Promise<any> => {
    const params: Record<string, string | number> = {};
    if (destino) params.destino = destino;
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/postearMovimiento`, movimiento, { params });
    return data.data;
  },

  anular: async (sucursal: number, devolucion: any): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/anular`, devolucion);
    return data.data;
  },

  // ===== Catálogos para selects =====
  obtenerConceptos: async (sucursal: number, tipoDocumento?: string): Promise<ConceptoDTO[]> => {
    const url = tipoDocumento ? `/Concepto/${sucursal}/documento/${tipoDocumento}` : `/Concepto/${sucursal}`;
    const params: Record<string, string> = {};
    const { data } = await apiClient.get<ApiResponse<ConceptoDTO[]>>(url, { params });
    return data.data;
  },

  obtenerClientes: async (sucursal: number): Promise<ClienteDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ClienteDTO[]>>(`/Cliente/${sucursal}`);
    return data.data;
  },

  obtenerAlmacenes: async (sucursal: number): Promise<AlmacenDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<AlmacenDTO[]>>(`/Almacen/${sucursal}`);
    return data.data;
  },

  obtenerFacturaPOS: async (sucursal: number, id: number): Promise<any> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/FPV/${sucursal}/${id}`);
    return data.data;
  },
};
