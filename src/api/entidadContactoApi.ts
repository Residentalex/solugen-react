import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { EntidadTelefonoDTO, EntidadEmailDTO, EntidadContactoDTO, EntidadDireccionDTO } from '../types/facturacion';

const BASE_TEL = '/EntidadTelefono';
const BASE_EMAIL = '/EntidadEmail';
const BASE_CONT = '/EntidadContacto';
const BASE_DIR = '/EntidadDireccion';

// CLIENTES.codigo y SUPLIDORES.codigo comparten espacio de nombres, por lo que
// las tablas de contacto exigen el tipo de entidad para no mezclar datos entre
// un cliente y un proveedor homonimos.
export type TipoEntidadContacto = 'CLI' | 'SUP';

const params = (tipoEntidad: TipoEntidadContacto) => ({ tipoEntidad });

export const entidadContactoApi = {
  // Teléfonos
  obtenerTelefonos: async (sucursal: number, codigoEntidad: string, tipoEntidad: TipoEntidadContacto): Promise<EntidadTelefonoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<EntidadTelefonoDTO[]>>(`${BASE_TEL}/${sucursal}/${codigoEntidad}`, { params: params(tipoEntidad) });
    return data.data || [];
  },
  guardarTelefonos: async (sucursal: number, codigoEntidad: string, items: EntidadTelefonoDTO[], tipoEntidad: TipoEntidadContacto): Promise<void> => {
    await apiClient.post(`${BASE_TEL}/${sucursal}/${codigoEntidad}`, items, { params: params(tipoEntidad) });
  },

  // Emails
  obtenerEmails: async (sucursal: number, codigoEntidad: string, tipoEntidad: TipoEntidadContacto): Promise<EntidadEmailDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<EntidadEmailDTO[]>>(`${BASE_EMAIL}/${sucursal}/${codigoEntidad}`, { params: params(tipoEntidad) });
    return data.data || [];
  },
  guardarEmails: async (sucursal: number, codigoEntidad: string, items: EntidadEmailDTO[], tipoEntidad: TipoEntidadContacto): Promise<void> => {
    await apiClient.post(`${BASE_EMAIL}/${sucursal}/${codigoEntidad}`, items, { params: params(tipoEntidad) });
  },

  // Contactos
  obtenerContactos: async (sucursal: number, codigoEntidad: string, tipoEntidad: TipoEntidadContacto): Promise<EntidadContactoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<EntidadContactoDTO[]>>(`${BASE_CONT}/${sucursal}/${codigoEntidad}`, { params: params(tipoEntidad) });
    return data.data || [];
  },
  guardarContactos: async (sucursal: number, codigoEntidad: string, items: EntidadContactoDTO[], tipoEntidad: TipoEntidadContacto): Promise<void> => {
    await apiClient.post(`${BASE_CONT}/${sucursal}/${codigoEntidad}`, items, { params: params(tipoEntidad) });
  },

  // Direcciones
  obtenerDirecciones: async (sucursal: number, codigoEntidad: string, tipoEntidad: TipoEntidadContacto): Promise<EntidadDireccionDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<EntidadDireccionDTO[]>>(`${BASE_DIR}/${sucursal}/${codigoEntidad}`, { params: params(tipoEntidad) });
    return data.data || [];
  },
  guardarDirecciones: async (sucursal: number, codigoEntidad: string, items: EntidadDireccionDTO[], tipoEntidad: TipoEntidadContacto): Promise<void> => {
    await apiClient.post(`${BASE_DIR}/${sucursal}/${codigoEntidad}`, items, { params: params(tipoEntidad) });
  },
};