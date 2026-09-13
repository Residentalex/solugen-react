import { apiClient } from './client';
const BASE_TEL = '/EntidadTelefono';
const BASE_EMAIL = '/EntidadEmail';
const BASE_CONT = '/EntidadContacto';
const BASE_DIR = '/EntidadDireccion';
export const entidadContactoApi = {
    // Teléfonos
    obtenerTelefonos: async (sucursal, codigoEntidad) => {
        const { data } = await apiClient.get(`${BASE_TEL}/${sucursal}/${codigoEntidad}`);
        return data.data || [];
    },
    guardarTelefonos: async (sucursal, codigoEntidad, items) => {
        await apiClient.post(`${BASE_TEL}/${sucursal}/${codigoEntidad}`, items);
    },
    // Emails
    obtenerEmails: async (sucursal, codigoEntidad) => {
        const { data } = await apiClient.get(`${BASE_EMAIL}/${sucursal}/${codigoEntidad}`);
        return data.data || [];
    },
    guardarEmails: async (sucursal, codigoEntidad, items) => {
        await apiClient.post(`${BASE_EMAIL}/${sucursal}/${codigoEntidad}`, items);
    },
    // Contactos
    obtenerContactos: async (sucursal, codigoEntidad) => {
        const { data } = await apiClient.get(`${BASE_CONT}/${sucursal}/${codigoEntidad}`);
        return data.data || [];
    },
    guardarContactos: async (sucursal, codigoEntidad, items) => {
        await apiClient.post(`${BASE_CONT}/${sucursal}/${codigoEntidad}`, items);
    },
    // Direcciones
    obtenerDirecciones: async (sucursal, codigoEntidad) => {
        const { data } = await apiClient.get(`${BASE_DIR}/${sucursal}/${codigoEntidad}`);
        return data.data || [];
    },
    guardarDirecciones: async (sucursal, codigoEntidad, items) => {
        await apiClient.post(`${BASE_DIR}/${sucursal}/${codigoEntidad}`, items);
    },
};
