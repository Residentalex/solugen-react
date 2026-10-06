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
  /** Catalogo MONEDAS indexado por sucursal. Se carga una vez por sucursal y se reutiliza. */
  monedas: Record<number, MonedaDTO[]>;
}

interface CompanyState {
  data: CompanyData;
  loading: boolean;
  error: string;
  monedasCargando: number[];
  fetchInitialConfig: (sucursalCompra: number, sucursalContable: number) => Promise<void>;
  fetchMonedas: (sucursal: number, force?: boolean) => Promise<void>;
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
  monedas: {},
};

export const useCompanyStore = create<CompanyState>((set, get) => ({
  data: initialState,
  loading: false,
  error: '',
  monedasCargando: [],

  fetchInitialConfig: async (sucursalCompra, sucursalContable) => {
    set({ loading: true, error: '' });
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
          // El catalogo de monedas no viene en la configuracion inicial: se conserva
          // lo ya descargado para no obligar a los formularios a pedirlo otra vez.
          monedas: get().data.monedas,
        },
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchMonedas: async (sucursal, force = false) => {
    // OJO: Sucursal.OrensePlaza es 0, hay que comparar por null/undefined y no por
    // falsy o el catalogo nunca se carga en esa sucursal.
    if (sucursal === null || sucursal === undefined) return;

    const { monedas, monedasCargando } = get();
    if (!force && (monedas[sucursal] || monedasCargando.includes(sucursal))) return;

    set({ monedasCargando: [...monedasCargando, sucursal] });
    try {
      const { data: json } = await apiClient.get(`/Moneda/${sucursal}`);
      const lista: MonedaDTO[] = Array.isArray(json?.data) ? json.data : [];
      set((state) => ({
        data: {
          ...state.data,
          monedas: { ...state.data.monedas, [sucursal]: lista },
        },
        monedasCargando: state.monedasCargando.filter((s) => s !== sucursal),
      }));
    } catch (err: any) {
      set((state) => ({ monedasCargando: state.monedasCargando.filter((s) => s !== sucursal) }));
      set({ error: err?.response?.data?.errorMessage || err.message || 'Error al cargar las monedas' });
    }
  },

  clear: () => set({ data: initialState, loading: false, error: '', monedasCargando: [] }),
}));
