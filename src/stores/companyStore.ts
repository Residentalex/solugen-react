import { create } from 'zustand';
import { apiClient } from '../api/client';
import { Sucursal } from '../types/auth';
import type { MonedaDTO } from '../types/contabilidad';

interface CompanyData {
  familias: any[];
  medidas: any[];
  documentos: any[];
  tiposDocumento: any[];
  tipoEntidades: any[];
  sucursales: any[];
  tipoDevolucionCaliente: any;
  facturasElectronicas: Record<number, any>;
  fechasCierre: Record<number, any>;
  fechasCierreInv: Record<number, any>;
  fechasCierreFiscal: Record<number, any>;
  securitySucursal: number;
  unidadBase: any;
  sucursalClientes: number;
  sucursalProductos: number;
  /** Catalogo MONEDAS global. Se carga una vez al iniciar sesion junto con la configuracion. */
  monedas: MonedaDTO[];
}

interface CompanyState {
  data: CompanyData;
  loading: boolean;
  error: string;
  monedasCargando: boolean;
  fetchInitialConfig: (sucursalCompra: number, sucursalContable: number) => Promise<void>;
  clear: () => void;
}

const initialState: CompanyData = {
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
  monedas: [],
};

export const useCompanyStore = create<CompanyState>((set) => ({
  data: initialState,
  loading: false,
  error: '',
  monedasCargando: false,

  fetchInitialConfig: async (sucursalCompra, sucursalContable) => {
    set({ loading: true, error: '', monedasCargando: true });
    try {
      const { data: json } = await apiClient.get(
        '/app/configuracion-inicial',
        { params: { sucursalCompra, sucursalContable } }
      );
      if (!json.isSuccess) throw new Error(json.errorMessage || 'Error desconocido');

      const config = json.data;

      // Procesar fechas de cierre desde configuracionesSucursales
      const fechasCierre: Record<number, any> = {};
      const fechasCierreInv: Record<number, any> = {};
      const fechasCierreFiscal: Record<number, any> = {};
      if (config.configuracionesSucursales) {
        for (const cs of config.configuracionesSucursales) {
          const sucursalNum = Sucursal[cs.sucursal as keyof typeof Sucursal];
          if (cs.fechaCierre && sucursalNum !== undefined) fechasCierre[sucursalNum] = cs.fechaCierre;
          if (cs.fechaCierreInventario && sucursalNum !== undefined) fechasCierreInv[sucursalNum] = cs.fechaCierreInventario;
          if (cs.fechaCierreFiscal && sucursalNum !== undefined) fechasCierreFiscal[sucursalNum] = cs.fechaCierreFiscal;
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
          // El catalogo MONEDAS es global y viene dentro de la configuracion inicial.
          monedas: config.monedas || [],
        },
        loading: false,
        monedasCargando: false,
      });
    } catch (err: any) {
      set({ error: err.message, loading: false, monedasCargando: false });
    }
  },

  clear: () => set({ data: initialState, loading: false, error: '', monedasCargando: false }),
}));
