import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type {
  ConciliacionBancariaDTO,
  ConciliacionBancariaVistaDTO,
  MovimientoBancarioDTO,
  CuentaBancariaDTO,
  TransaccionConciliadaDTO,
  ResumenGeneralConciliacionDTO,
  MovimientoLibroExportarDTO,
  TransitoExportarDTO,
} from '../types/conciliacionBancaria';

const BASE = '/ConciliacionBancaria';

export const conciliacionBancariaApi = {
  /** Obtener listado paginado con filtros */
  obtenerVista: async (
    sucursal: number,
    params: {
      cantidad?: number;
      salto?: number;
      desde?: string;
      hasta?: string;
      numeroCta?: string;
      aplicada?: string;
    }
  ): Promise<{ data: ConciliacionBancariaVistaDTO[]; total: number }> => {
    const queryParams: Record<string, string | number> = {};
    if (params.cantidad !== undefined) queryParams.cantidad = params.cantidad;
    if (params.salto !== undefined) queryParams.salto = params.salto;
    if (params.desde) queryParams.desde = params.desde;
    if (params.hasta) queryParams.hasta = params.hasta;
    if (params.numeroCta) queryParams.numeroCta = params.numeroCta;
    if (params.aplicada) queryParams.aplicada = params.aplicada;
    const { data } = await apiClient.get<ApiResponse<ConciliacionBancariaVistaDTO[]>>(
      `${BASE}/${sucursal}`,
      { params: queryParams }
    );
    return { data: data.data || [], total: data.total ?? 0 };
  },

  /** Para useDocumentoListado.fetchVista */
  obtenerVistaDocumento: async (
    sucursal: number,
    desde: string,
    hasta: string,
    filas: number,
    salto: number,
    estado?: number
  ): Promise<{ data: ConciliacionBancariaVistaDTO[]; total: number }> => {
    const params: Record<string, string | number> = {
      cantidad: filas,
      salto,
      desde,
      hasta,
    };
    if (estado === 0) params.aplicada = 'F';
    else if (estado === 1) params.aplicada = 'T';
    const { data } = await apiClient.get<ApiResponse<ConciliacionBancariaVistaDTO[]>>(
      `${BASE}/${sucursal}`, { params }
    );
    return { data: data.data || [], total: data.total ?? 0 };
  },

  /** Para useDocumentoListado.fetchFiltrar */
  filtrarDocumento: async (
    sucursal: number,
    params: Record<string, any>
  ): Promise<{ data: ConciliacionBancariaVistaDTO[]; total: number }> => {
    const queryParams: Record<string, string | number> = {
      cantidad: params.cantidad || 25,
      salto: params.salto || 0,
    };
    if (params.desde) queryParams.desde = params.desde;
    if (params.hasta) queryParams.hasta = params.hasta;
    if (params.documento) {
      queryParams.numeroCta = params.documento;
      const id = parseInt(params.documento, 10);
      if (!isNaN(id) && id > 0) queryParams.concilID = id;
    }
    const { data } = await apiClient.get<ApiResponse<ConciliacionBancariaVistaDTO[]>>(
      `${BASE}/${sucursal}`, { params: queryParams }
    );
    return { data: data.data || [], total: data.total ?? 0 };
  },

  /** Obtener conciliación completa por ID */
  obtenerPorId: async (sucursal: number, id: number): Promise<ConciliacionBancariaDTO> => {
    const { data } = await apiClient.get<ApiResponse<ConciliacionBancariaDTO>>(
      `${BASE}/${sucursal}/${id}`
    );
    if (!data.data) throw new Error('Conciliación no encontrada');
    return data.data;
  },

  /** Obtener solo el encabezado de la conciliación (rápido: sin movimientos ni transacciones) */
  obtenerEncabezado: async (sucursal: number, id: number): Promise<ConciliacionBancariaDTO> => {
    const { data } = await apiClient.get<ApiResponse<ConciliacionBancariaDTO>>(
      `${BASE}/${sucursal}/${id}/encabezado`
    );
    if (!data.data) throw new Error('Conciliación no encontrada');
    return data.data;
  },

  /** Obtener movimientos de DARCHCON de la conciliación */
  obtenerMovimientos: async (sucursal: number, id: number): Promise<MovimientoBancarioDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<MovimientoBancarioDTO[]>>(
      `${BASE}/${sucursal}/${id}/movimientos`
    );
    return data.data || [];
  },

  /** Crear nueva conciliación */
  crear: async (sucursal: number, dto: Partial<ConciliacionBancariaDTO>): Promise<number> => {
    const { data } = await apiClient.post<ApiResponse<number>>(`${BASE}/${sucursal}`, dto);
    if (!data.data) throw new Error('Error al crear conciliación');
    return data.data;
  },

  /** Actualizar conciliación existente */
  actualizar: async (sucursal: number, id: number, dto: Partial<ConciliacionBancariaDTO>): Promise<void> => {
    await apiClient.put(`${BASE}/${sucursal}/${id}`, dto);
  },

  /** Eliminar conciliación */
  eliminar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/${id}`);
  },

  /** Aplicar conciliación (cambia estado a aplicada) */
  aplicar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.post(`${BASE}/${sucursal}/${id}/aplicar`);
  },

  /** Importar movimientos bancarios desde archivo (multipart/form-data) */
  importarMovimientos: async (
    sucursal: number,
    concilId: number,
    file: File
  ): Promise<MovimientoBancarioDTO[]> => {
    const formData = new FormData();
    formData.append('archivo', file);
    const { data } = await apiClient.post<ApiResponse<MovimientoBancarioDTO[]>>(
      `${BASE}/${sucursal}/importar/${concilId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data.data || [];
  },

  /** Preview: sube archivo, devuelve movimientos con Documento resuelto */
  importarPreview: async (
    sucursal: number,
    file: File,
    concilId?: number
  ): Promise<MovimientoBancarioDTO[]> => {
    const formData = new FormData();
    formData.append('archivo', file);
    const url = concilId
      ? `${BASE}/${sucursal}/importar/preview?concilId=${concilId}`
      : `${BASE}/${sucursal}/importar/preview`;
    const { data } = await apiClient.post<ApiResponse<MovimientoBancarioDTO[]>>(
      url,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data.data || [];
  },

  /** Guardar: envía movimientos (JSON) para insertar en DARCHCON */
  guardarMovimientosImportados: async (
    sucursal: number,
    concilId: number,
    movimientos: MovimientoBancarioDTO[]
  ): Promise<number> => {
    const { data } = await apiClient.post<ApiResponse<number>>(
      `${BASE}/${sucursal}/importar/guardar/${concilId}`,
      movimientos
    );
    return data.data || 0;
  },

  /** Obtener cuentas bancarias disponibles (CTASBANC) */
  obtenerCuentasBancarias: async (sucursal: number): Promise<CuentaBancariaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<CuentaBancariaDTO[]>>(
      `${BASE}/${sucursal}/cuentas`
    );
    return data.data || [];
  },

  /** Obtener transacciones del sistema relacionadas con el CONCILID */
  obtenerTransaccionesConciliadas: async (
    sucursal: number,
    concilId: number
  ): Promise<TransaccionConciliadaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TransaccionConciliadaDTO[]>>(
      `${BASE}/${sucursal}/${concilId}/transacciones`
    );
    return data.data || [];
  },

  /** Obtener documentos en tránsito desde DOCTRANS */
  obtenerEnTransito: async (
    sucursal: number,
    concilId: number
  ): Promise<TransaccionConciliadaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TransaccionConciliadaDTO[]>>(
      `${BASE}/${sucursal}/${concilId}/en-transito`
    );
    return data.data || [];
  },

  /** Obtener transacciones sin conciliar de la cuenta (CONCIL='F'/NULL o CONCIL='T' del concilID en edición) */
  obtenerTransaccionesSinConciliar: async (
    sucursal: number,
    numeroCta: string,
    concilID: number = 0,
    fecha?: string
  ): Promise<TransaccionConciliadaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TransaccionConciliadaDTO[]>>(
      `${BASE}/${sucursal}/transacciones-sin-conciliar`,
      { params: { numeroCta, concilID, ...(fecha ? { fecha } : {}) } }
    );
    return data.data || [];
  },

  /** Obtener resumen general de conciliación */
  obtenerResumenGeneral: async (sucursal: number, concilId: number): Promise<ResumenGeneralConciliacionDTO> => {
    const { data } = await apiClient.get<ApiResponse<ResumenGeneralConciliacionDTO>>(
      `${BASE}/${sucursal}/${concilId}/resumen-general`
    );
    return data.data!;
  },

  /** Exportar movimientos del libro del mayor */
  exportarLibros: async (sucursal: number, concilId: number): Promise<MovimientoLibroExportarDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<MovimientoLibroExportarDTO[]>>(
      `${BASE}/${sucursal}/${concilId}/exportar-libros`
    );
    return data.data || [];
  },

  /** Exportar documentos en tránsito */
  exportarTransito: async (sucursal: number, concilId: number): Promise<TransitoExportarDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TransitoExportarDTO[]>>(
      `${BASE}/${sucursal}/${concilId}/exportar-transito`
    );
    return data.data || [];
  },
};
