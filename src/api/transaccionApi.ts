import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { TransaccionDTO, TransaccionVistaDTO, FiltroTransaccion } from '../types/transaccion';

const BASE = '/Transaccion';

function formatDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${day}${hh}${mm}${ss}`;
}

export const transaccionApi = {
  /** Obtener transacción por ID */
  obtenerPorId: async (sucursal: number, id: number): Promise<TransaccionDTO> => {
    const { data } = await apiClient.get<ApiResponse<TransaccionDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  /** Obtener transacciones con asientos no cuadrados */
  obtenerNoCuadrados: async (
    sucursal: number,
    desde: string,
    hasta: string,
    tipoDoc?: string
  ): Promise<TransaccionDTO[]> => {
    const params: Record<string, string> = { desde, hasta };
    if (tipoDoc) params.tipoDoc = tipoDoc;

    const { data } = await apiClient.get<ApiResponse<TransaccionDTO[]>>(
      `${BASE}/${sucursal}/asientosnoCuadrado`,
      { params }
    );
    return data.data || [];
  },

  /** Obtener transacciones con cuentas inválidas (inexistentes o de control) */
  obtenerCuentasInvalidas: async (
    sucursal: number,
    desde: string,
    hasta: string,
    tipoDoc?: string
  ): Promise<TransaccionDTO[]> => {
    const params: Record<string, string> = { desde, hasta };
    if (tipoDoc) params.tipoDoc = tipoDoc;

    const { data } = await apiClient.get<ApiResponse<TransaccionDTO[]>>(
      `${BASE}/${sucursal}/asientosintegridad`,
      { params }
    );
    return data.data || [];
  },

  /** Obtener transacciones anuladas (paginado) */
  obtenerAnulados: async (
    sucursal: number,
    desde: string,
    hasta: string,
    tipoDoc?: string,
    moduloDocs?: string,
    page: number = 1,
    pageSize: number = 25
  ): Promise<{ data: TransaccionVistaDTO[]; total: number }> => {
    const params: Record<string, string> = { desde, hasta };
    if (tipoDoc) params.tipoDoc = tipoDoc;
    if (moduloDocs) params.moduloDocs = moduloDocs;
    params.cantidad = String(pageSize);
    params.salto = String((page - 1) * pageSize);

    const { data } = await apiClient.get<ApiResponse<{ data: TransaccionVistaDTO[]; total: number }>>(
      `${BASE}/${sucursal}/anulados`,
      { params }
    );
    return data.data || { data: [], total: 0 };
  },

  /** Postear una transacción individual */
  postear: async (
    sucursal: number,
    transaccion: TransaccionDTO,
    destino?: number
  ): Promise<any> => {
    const params: Record<string, string> = {};
    if (destino !== undefined) params.destino = String(destino);

    const { data } = await apiClient.post<ApiResponse<any>>(
      `${BASE}/${sucursal}/postear`,
      transaccion,
      { params }
    );
    return data.data;
  },

  /** Postear documentos bancarios */
  postearDocBancario: async (
    sucursal: number,
    desde: string,
    hasta: string,
    tipoDoc?: string,
    ctaBanc?: string
  ): Promise<number[]> => {
    const params: Record<string, string> = { desde, hasta };
    if (tipoDoc) params.tipoDoc = tipoDoc;
    if (ctaBanc) params.ctaBanc = ctaBanc;

    const { data } = await apiClient.post<ApiResponse<number[]>>(
      `${BASE}/${sucursal}/DocBancario/postear`,
      null,
      { params }
    );
    return data.data || [];
  },

  /** Filtrar transacciones */
  filtrar: async (
    sucursal: number,
    filtro: FiltroTransaccion
  ): Promise<TransaccionVistaDTO[]> => {
    const params: Record<string, string | number> = {};
    if (filtro.cantidad) params.cantidad = filtro.cantidad;
    if (filtro.salto) params.salto = filtro.salto;
    if (filtro.desde) params.desde = filtro.desde;
    if (filtro.hasta) params.hasta = filtro.hasta;
    if (filtro.documento) params.documento = filtro.documento;
    if (filtro.nCF) params.nCF = filtro.nCF;
    if (filtro.concepto) params.concepto = filtro.concepto;
    if (filtro.entidad) params.entidad = filtro.entidad;
    if (filtro.tipoEntidad) params.tipoEntidad = filtro.tipoEntidad;

    const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO[]>>(
      `${BASE}/${sucursal}/filtrar`,
      { params }
    );
    return data.data || [];
  },

  /** Obtener transacciones por tipo y rango de fecha */
  obtenerPorRangoFecha: async (
    sucursal: number,
    tipoDoc: string,
    desde: string,
    hasta: string
  ): Promise<TransaccionDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TransaccionDTO[]>>(
      `${BASE}/${sucursal}/${tipoDoc}/RangoFecha`,
      { params: { desde, hasta } }
    );
    return data.data || [];
  },

  /** Obtener transacciones por tipo de documento (vista resumida) */
  obtenerResumidoPorTipo: async (
    sucursal: number,
    tipoDoc: string,
    desde?: string,
    hasta?: string,
    tipoEntidad?: string
  ): Promise<TransaccionVistaDTO[]> => {
    const params: Record<string, string> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (tipoEntidad) params.TipoEntidad = tipoEntidad;

    const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO[]>>(
      `${BASE}/${sucursal}/tipo/${tipoDoc}`,
      { params }
    );
    return data.data || [];
  },

  /** Buscar transacciones por campo específico (documento, ncf, doc_ref) */
  buscarPorCampo: async (
    sucursal: number,
    campo: 'documento' | 'ncf' | 'doc_ref',
    valor: string,
    cantidad: number = 10,
    tipoDoc?: string
  ): Promise<TransaccionVistaDTO[]> => {
    const params: Record<string, string | number> = { campo, valor, cantidad };
    if (tipoDoc) params.tipoDoc = tipoDoc;
    const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO[]>>(
      `${BASE}/${sucursal}/buscar`,
      { params }
    );
    return data.data;
  },

  /** Obtener transacciones asociadas de inventario (pagos) */
  obtenerAsociadasInventario: async (sucursal: number, id: number): Promise<any[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(`${BASE}/${sucursal}/asociadasINV/${id}`);
    return data.data || [];
  },

  /** Obtener transacciones asociadas desde DOCASOC */
  obtenerAsociadas: async (sucursal: number, id: number, origen?: string, todas?: boolean): Promise<any[]> => {
    const params: Record<string, string> = {};
    if (origen) params.origen = origen;
    if (todas) params.todas = 'true';
    const { data } = await apiClient.get<ApiResponse<any[]>>(`${BASE}/${sucursal}/asociadas/${id}`, { params });
    return data.data || [];
  },

  /** Obtener documentos que consumieron a un documento (sin filtro EXCREPSA) */
  contarPosteable: async (
    sucursal: number,
    tipoDoc: string,
    desde: string,
    hasta: string
  ): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/${sucursal}/total-posteable/${tipoDoc}`, {
      params: { desde, hasta }
    });
    return data.data ?? 0;
  },

  obtenerConsumidores: async (sucursal: number, id: number): Promise<any[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(`${BASE}/${sucursal}/consumidores/${id}`);
    return data.data || [];
  },

  /** Obtener documentos que fueron consumidos por un documento (sin filtro EXCREPSA) */
  obtenerConsumidos: async (sucursal: number, id: number): Promise<any[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(`${BASE}/${sucursal}/consumidos/${id}`);
    return data.data || [];
  },

  /** Obtener devoluciones (DEV) vinculadas a un PV via DTRANSIDASOC */
  obtenerDevolucionesPorPV: async (sucursal: number, id: number): Promise<any[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(`${BASE}/${sucursal}/devolucionesPV/${id}`);
    return data.data || [];
  },

  /** Crear una nueva transaccion */
  crear: async (sucursal: number, dto: any): Promise<TransaccionDTO> => {
    const { data } = await apiClient.post<ApiResponse<TransaccionDTO>>(`${BASE}/${sucursal}`, dto);
    return data.data;
  },

  /** Actualizar una transaccion existente */
  actualizar: async (sucursal: number, dto: any): Promise<TransaccionDTO> => {
    const { data } = await apiClient.put<ApiResponse<TransaccionDTO>>(`${BASE}/${sucursal}`, dto);
    return data.data;
  },

  /** Aplicar un documento por ID */
  aplicar: async (sucursal: number, id: number): Promise<TransaccionDTO> => {
    const { data } = await apiClient.put<ApiResponse<TransaccionDTO>>(`${BASE}/${sucursal}/aplicar/${id}`);
    return data.data;
  },

  /** Desaplicar un documento */
  desaplicar: async (sucursal: number, documento: string): Promise<void> => {
    await apiClient.put(`${BASE}/desaplicar?origen=${sucursal}&documento=${encodeURIComponent(documento)}`);
  },

  /** Anular un documento */
  anular: async (sucursal: number, transaccion: TransaccionDTO): Promise<TransaccionDTO> => {
    const { data } = await apiClient.post<ApiResponse<TransaccionDTO>>(`${BASE}/${sucursal}/anular`, transaccion);
    return data.data;
  },

  /** Obtener documentos pendientes de una entidad */
  obtenerDocumentosPendientes: async (
    sucursal: number,
    codEntidad: string,
    tipoEntidad: string
  ): Promise<TransaccionDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TransaccionDTO[]>>(
      `${BASE}/${sucursal}/pendiente/${codEntidad}`,
      { params: { tipoEntidad } }
    );
    return data.data || [];
  },
};

export { formatDateParam };