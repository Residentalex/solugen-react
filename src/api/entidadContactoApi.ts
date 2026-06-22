import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { EntidadTelefonoDTO, EntidadEmailDTO, EntidadContactoDTO, EntidadDireccionDTO } from '../types/facturacion';

const BASE_TEL = '/EntidadTelefono';
const BASE_EMAIL = '/EntidadEmail';
const BASE_CONT = '/EntidadContacto';
const BASE_DIR = '/EntidadDireccion';

export const entidadContactoApi = {
  // Teléfonos
  obtenerTelefonos: async (sucursal: number, codigoEntidad: string): Promise<EntidadTelefonoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<EntidadTelefonoDTO[]>>(`${BASE_TEL}/${sucursal}/${codigoEntidad}`);
    return data.data || [];
  },
  guardarTelefonos: async (sucursal: number, codigoEntidad: string, items: EntidadTelefonoDTO[]): Promise<void> => {
    await apiClient.post(`${BASE_TEL}/${sucursal}/${codigoEntidad}`, items);
  },

  // Emails
  obtenerEmails: async (sucursal: number, codigoEntidad: string): Promise<EntidadEmailDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<EntidadEmailDTO[]>>(`${BASE_EMAIL}/${sucursal}/${codigoEntidad}`);
    return data.data || [];
  },
  guardarEmails: async (sucursal: number, codigoEntidad: string, items: EntidadEmailDTO[]): Promise<void> => {
    await apiClient.post(`${BASE_EMAIL}/${sucursal}/${codigoEntidad}`, items);
  },

  // Contactos
  obtenerContactos: async (sucursal: number, codigoEntidad: string): Promise<EntidadContactoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<EntidadContactoDTO[]>>(`${BASE_CONT}/${sucursal}/${codigoEntidad}`);
    return data.data || [];
  },
  guardarContactos: async (sucursal: number, codigoEntidad: string, items: EntidadContactoDTO[]): Promise<void> => {
    await apiClient.post(`${BASE_CONT}/${sucursal}/${codigoEntidad}`, items);
  },

  // Direcciones
  obtenerDirecciones: async (sucursal: number, codigoEntidad: string): Promise<EntidadDireccionDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<EntidadDireccionDTO[]>>(`${BASE_DIR}/${sucursal}/${codigoEntidad}`);
    return data.data || [];
  },
  guardarDirecciones: async (sucursal: number, codigoEntidad: string, items: EntidadDireccionDTO[]): Promise<void> => {
    await apiClient.post(`${BASE_DIR}/${sucursal}/${codigoEntidad}`, items);
  },
};
