import { apiClient } from './client';
import type { MovimientoVistaDTO, FiltroENP, EntradaAlmacenDTO } from '../types/entradaAlmacen';
import type { ApiResponse } from '../types/auth';

const BASE = '/ENP';

export const entradaAlmacenApi = {
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
    filtro: FiltroENP
  ): Promise<{ data: MovimientoVistaDTO[]; total: number }> => {
    const params: Record<string, string | number> = {};
    if (filtro.cantidad) params.cantidad = filtro.cantidad;
    if (filtro.salto) params.salto = filtro.salto;
    if (filtro.desde) params.desde = filtro.desde;
    if (filtro.hasta) params.hasta = filtro.hasta;
    if (filtro.documento) params.documento = filtro.documento;
    if (filtro.nCF) params.nCF = filtro.nCF;
    if (filtro.concepto) params.concepto = filtro.concepto;
    if (filtro.entidad) params.entidad = filtro.entidad;
    if (filtro.referencia) params.referencia = filtro.referencia;
    if (filtro.almacen) params.almacen = filtro.almacen;

    const { data } = await apiClient.get<ApiResponse<MovimientoVistaDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params });
    return { data: data.data || [], total: data.total ?? 0 };
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<EntradaAlmacenDTO> => {
    const { data } = await apiClient.get<ApiResponse<EntradaAlmacenDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  crear: async (sucursal: number, entrada: EntradaAlmacenDTO): Promise<EntradaAlmacenDTO> => {
    const { data } = await apiClient.post<ApiResponse<EntradaAlmacenDTO>>(`${BASE}/${sucursal}`, entrada);
    return data.data;
  },

  actualizar: async (sucursal: number, entrada: EntradaAlmacenDTO): Promise<EntradaAlmacenDTO> => {
    const { data } = await apiClient.put<ApiResponse<EntradaAlmacenDTO>>(`${BASE}/${sucursal}`, entrada);
    return data.data;
  },

  aplicar: async (sucursal: number, id: number, confirmarSobrePrecio?: boolean): Promise<any> => {
    const params: Record<string, string | boolean> = {};
    if (confirmarSobrePrecio) params.confirmarSobrePrecio = true;
    const { data } = await apiClient.put(`${BASE}/${sucursal}/aplicar/${id}`, null, { params });
    return data.data;
  },

  desaplicar: async (origen: string, documento: string): Promise<void> => {
    const params = { origen, documento };
    await apiClient.put(`${BASE}/desaplicar`, null, { params });
  },

  postear: async (sucursal: number, entrada: EntradaAlmacenDTO, destino?: string): Promise<any> => {
    const params: Record<string, string> = {};
    if (destino) params.destino = destino;
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/postear`, entrada, { params });
    return data.data;
  },

  anular: async (sucursal: number, entrada: any, destino?: number): Promise<any> => {
    const params: Record<string, number> = {};
    if (destino !== undefined) params.destino = destino;
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/anular`, entrada, { params });
    return data.data;
  },

  eliminar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/eliminar/${id}`);
  },

  revisado: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.put(`${BASE}/${sucursal}/${id}/revisado`);
  },

  reversar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.post(`${BASE}/${sucursal}/${id}/reversar`);
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

  obtenerUltimaEntrada: async (sucursal: number, codigo: string, sucursalId?: number): Promise<{
    codigo: string;
    nombre: string;
    fecha: string;
    documento: string;
    cantidad: number;
    ventasOP: number;
    ventasHR: number;
    ventasVH: number;
  } | null> => {
    const params: Record<string, number> = {};
    if (sucursalId !== undefined) params.sucursalId = sucursalId;
    const { data } = await apiClient.get<ApiResponse<{
      codigo: string;
      nombre: string;
      fecha: string;
      documento: string;
      cantidad: number;
      ventasOP: number;
      ventasHR: number;
      ventasVH: number;
    }>>(
      `${BASE}/${sucursal}/ultima-entrada/${encodeURIComponent(codigo)}`,
      { params }
    );
    return data.data ?? null;
  },

  obtenerMovimientosProducto: async (sucursal: number, codigo: string): Promise<{ ultimaCompra: any; ventas: any[] }> => {
    const { data } = await apiClient.get<ApiResponse<{ ultimaCompra: any; ventas: any[] }>>(
      `${BASE}/${sucursal}/movimientos-producto/${encodeURIComponent(codigo)}`
    );
    return data.data ?? { ultimaCompra: null, ventas: [] };
  },

  obtenerUltimasEntradasPorSucursal: async (sucursal: number, codigo: string): Promise<Array<{
    sucursal: number;
    sucursalNombre: string;
    codigo: string;
    nombre: string;
    fecha: string;
    documento: string;
    cantidad: number;
  }> | null> => {
    const { data } = await apiClient.get<ApiResponse<Array<{
      sucursal: number;
      sucursalNombre: string;
      codigo: string;
      nombre: string;
      fecha: string;
      documento: string;
      cantidad: number;
    }>>>(
      `${BASE}/${sucursal}/ultimas-entradas-producto/${encodeURIComponent(codigo)}`
    );
    return data.data ?? null;
  },

  obtenerVentasPosteriores: async (sucursal: number, codigo: string, fechaDesde: string, sucursalVentas: number): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(
      `${BASE}/${sucursal}/ventas-posteriores/${encodeURIComponent(codigo)}`,
      { params: { fechaDesde, sucursalVentas } }
    );
    return data.data ?? 0;
  },

  obtenerResumenMovimientosPosteriores: async (
    sucursal: number,
    codigo: string,
    fechaDesde: string,
    sucursalMov: number
  ): Promise<{
    ventas: number;
    salidas: number;
    devolucionesCompra: number;
    devolucionesVenta: number;
  } | null> => {
    const { data } = await apiClient.get<ApiResponse<{
      ventas: number;
      salidas: number;
      devolucionesCompra: number;
      devolucionesVenta: number;
    }>>(
      `${BASE}/${sucursal}/resumen-movimientos-posteriores/${encodeURIComponent(codigo)}`,
      { params: { fechaDesde, sucursalMov } }
    );
    return data.data ?? null;
  },

  obtenerTotalPosteable: async (
    sucursal: number,
    desde: string,
    hasta: string
  ): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/total-posteable/${sucursal}`, {
      params: { desde, hasta }
    });
    return data.data ?? 0;
  },

  obtenerDetalleMovimientosPosteriores: async (
    sucursal: number,
    codigo: string,
    fechaDesde: string,
    sucursalMov: number
  ): Promise<Array<{
    transacid: number;
    tipoDocumento: string;
    fecha: string;
    documento: string;
    cantidad: number;
    descripcion: string;
  }> | null> => {
    const { data } = await apiClient.get<ApiResponse<Array<{
      transacid: number;
      tipoDocumento: string;
      fecha: string;
      documento: string;
      cantidad: number;
      descripcion: string;
    }>>>(
      `${BASE}/${sucursal}/detalle-movimientos-posteriores/${encodeURIComponent(codigo)}`,
      { params: { fechaDesde, sucursalMov } }
    );
    return data.data ?? null;
  },
};
