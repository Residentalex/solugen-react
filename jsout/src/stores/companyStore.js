import { create } from 'zustand';
import { apiClient } from '../api/client';
import { Sucursal } from '../types/auth';
const initialState = {
    familias: [],
    medidas: [],
    documentos: [],
    tiposDocumento: [],
    tipoEntidades: [],
    sucursales: [],
    tipoDevolucionCaliente: null,
    facturasElectronicas: {},
    fechasCierre: {},
    fechasCierreInv: {},
    fechasCierreFiscal: {},
    securitySucursal: 4,
    unidadBase: null,
    sucursalClientes: Sucursal.Consolidado,
    sucursalProductos: Sucursal.Compra,
};
export const useCompanyStore = create((set) => ({
    data: initialState,
    loading: false,
    error: '',
    fetchInitialConfig: async (sucursalCompra, sucursalContable) => {
        set({ loading: true, error: '' });
        try {
            const { data: json } = await apiClient.get('/app/configuracion-inicial', { params: { sucursalCompra, sucursalContable } });
            if (!json.isSuccess)
                throw new Error(json.errorMessage || 'Error desconocido');
            const config = json.data;
            // Procesar fechas de cierre desde configuracionesSucursales
            const fechasCierre = {};
            const fechasCierreInv = {};
            const fechasCierreFiscal = {};
            if (config.configuracionesSucursales) {
                for (const cs of config.configuracionesSucursales) {
                    const sucursalNum = Sucursal[cs.sucursal];
                    if (cs.fechaCierre && sucursalNum !== undefined)
                        fechasCierre[sucursalNum] = cs.fechaCierre;
                    if (cs.fechaCierreInventario && sucursalNum !== undefined)
                        fechasCierreInv[sucursalNum] = cs.fechaCierreInventario;
                    if (cs.fechaCierreFiscal && sucursalNum !== undefined)
                        fechasCierreFiscal[sucursalNum] = cs.fechaCierreFiscal;
                }
            }
            set({
                data: {
                    familias: config.familias || [],
                    medidas: config.medidas || [],
                    documentos: config.documentos || [],
                    tiposDocumento: config.tiposDocumento || [],
                    tipoEntidades: config.tipoEntidades || [],
                    sucursales: config.sucursales || [],
                    tipoDevolucionCaliente: config.tipoDevolucionCaliente || null,
                    facturasElectronicas: {},
                    fechasCierre,
                    fechasCierreInv,
                    fechasCierreFiscal,
                    securitySucursal: config.securitySucursal ?? 4,
                    unidadBase: config.unidadBase || null,
                    sucursalClientes: config.sucursalClientes ?? Sucursal.Consolidado,
                    sucursalProductos: config.sucursalProductos ?? Sucursal.Compra,
                },
                loading: false,
            });
        }
        catch (err) {
            set({ error: err.message, loading: false });
        }
    },
    clear: () => set({ data: initialState, loading: false, error: '' }),
}));
