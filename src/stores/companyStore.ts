import { create } from 'zustand';

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
}

interface CompanyState {
  data: CompanyData;
  loading: boolean;
  error: string;
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
};

export const useCompanyStore = create<CompanyState>((set) => ({
  data: initialState,
  loading: false,
  error: '',

  fetchInitialConfig: async (sucursalCompra, sucursalContable) => {
    set({ loading: true, error: '' });
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4002/api';
      const res = await fetch(
        `${apiUrl}/configuracion-inicial?sucursalCompra=${sucursalCompra}&sucursalContable=${sucursalContable}`
      );
      if (!res.ok) throw new Error('Error al cargar configuración inicial');
      const json = await res.json();
      if (!json.isSuccess) throw new Error(json.errorMessage || 'Error desconocido');

      const config = json.data;
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
          fechasCierre: {},
          fechasCierreInv: {},
          fechasCierreFiscal: {},
        },
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  clear: () => set({ data: initialState, loading: false, error: '' }),
}));
