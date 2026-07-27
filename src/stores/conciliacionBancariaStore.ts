import { create } from 'zustand';
import type { ConciliacionBancariaVistaDTO, CuentaBancariaDTO } from '../types/conciliacionBancaria';

interface ConciliacionBancariaState {
  // Datos del listado
  data: ConciliacionBancariaVistaDTO[];
  total: number;
  loading: boolean;
  loadingError: boolean;
  page: number;
  pageSize: number;
  searchText: string;
  selectedRow: ConciliacionBancariaVistaDTO | null;

  // Filtros
  cuentaFiltro: string;
  fechaDesde: string;
  fechaHasta: string;
  aplicadaFiltro: string; // 'todas' | 'aplicada' | 'no-aplicada'

  // Catálogos
  cuentasBancarias: CuentaBancariaDTO[];

  // Acciones
  setData: (data: ConciliacionBancariaVistaDTO[]) => void;
  setTotal: (total: number) => void;
  setLoading: (loading: boolean) => void;
  setLoadingError: (error: boolean) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearchText: (text: string) => void;
  setSelectedRow: (row: ConciliacionBancariaVistaDTO | null) => void;
  setCuentaFiltro: (cuenta: string) => void;
  setFechaDesde: (fecha: string) => void;
  setFechaHasta: (fecha: string) => void;
  setAplicadaFiltro: (filtro: string) => void;
  setCuentasBancarias: (cuentas: CuentaBancariaDTO[]) => void;
  resetFiltros: () => void;
}

const initialState = {
  data: [],
  total: 0,
  loading: false,
  loadingError: false,
  page: 1,
  pageSize: 25,
  searchText: '',
  selectedRow: null,
  cuentaFiltro: '',
  fechaDesde: '',
  fechaHasta: '',
  aplicadaFiltro: 'todas',
  cuentasBancarias: [],
};

export const useConciliacionBancariaStore = create<ConciliacionBancariaState>((set) => ({
  ...initialState,

  setData: (data) => set({ data }),
  setTotal: (total) => set({ total }),
  setLoading: (loading) => set({ loading }),
  setLoadingError: (loadingError) => set({ loadingError }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize }),
  setSearchText: (searchText) => set({ searchText }),
  setSelectedRow: (selectedRow) => set({ selectedRow }),
  setCuentaFiltro: (cuentaFiltro) => set({ cuentaFiltro }),
  setFechaDesde: (fechaDesde) => set({ fechaDesde }),
  setFechaHasta: (fechaHasta) => set({ fechaHasta }),
  setAplicadaFiltro: (aplicadaFiltro) => set({ aplicadaFiltro }),
  setCuentasBancarias: (cuentasBancarias) => set({ cuentasBancarias }),
  resetFiltros: () =>
    set({
      cuentaFiltro: '',
      fechaDesde: '',
      fechaHasta: '',
      aplicadaFiltro: 'todas',
      searchText: '',
      page: 1,
    }),
}));
