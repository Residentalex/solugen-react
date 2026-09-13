import { create } from 'zustand';
import { message } from 'antd';
import { dashboardApi } from '../api/dashboardApi';
import type { DashboardWidgetDto, DashboardWidgetConfigDto } from '../types/dashboard';
import { useAuthStore } from './authStore';
import { Sucursal } from '../types/auth';

interface DashboardWidgetState {
  catalog: DashboardWidgetDto[];
  widgetsPorRol: Map<number, DashboardWidgetDto[]>;
  misWidgets: DashboardWidgetDto[];
  loading: boolean;
  saving: boolean;
  error: string | null;

  // Acciones
  fetchCatalog: () => Promise<void>;
  fetchWidgetsPorRol: (rolId: number) => Promise<void>;
  fetchMisWidgets: () => Promise<void>;
  guardarConfiguracion: (rolId: number, configs: DashboardWidgetConfigDto[]) => Promise<boolean>;
  clearError: () => void;
}

export const useDashboardWidgetStore = create<DashboardWidgetState>((set, get) => ({
  catalog: [],
  widgetsPorRol: new Map(),
  misWidgets: [],
  loading: false,
  saving: false,
  error: null,

  fetchCatalog: async () => {
    set({ loading: true, error: null });
    try {
      const catalog = await dashboardApi.obtenerCatalogoWidgets();
      set({ catalog, loading: false });
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al cargar catálogo de widgets';
      set({ error: msg, loading: false });
      message.error(msg);
    }
  },

  fetchWidgetsPorRol: async (rolId: number) => {
    set({ loading: true, error: null });
    try {
      const widgets = await dashboardApi.obtenerWidgetsPorRol(rolId);
      const map = new Map(get().widgetsPorRol);
      map.set(rolId, widgets);
      set({ widgetsPorRol: map, loading: false });
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al cargar widgets del rol';
      set({ error: msg, loading: false });
      message.error(msg);
    }
  },

  fetchMisWidgets: async () => {
    set({ loading: true, error: null });
    try {
      // Obtener roles y sucursal del usuario logueado
      const usuario = useAuthStore.getState().usuario;
      const sucursalActiva = useAuthStore.getState().sucursalActiva;

      if (!usuario || !usuario.roles || usuario.roles.length === 0) {
        set({ loading: false });
        return;
      }

      // Usar TODOS los roles del usuario para obtener widgets
      const rolIds = usuario.roles.map(r => r.id);
      // Convertir sucursal activa a número
      const suc = typeof sucursalActiva === 'number' ? sucursalActiva : Sucursal[sucursalActiva as keyof typeof Sucursal];

      const misWidgets = await dashboardApi.obtenerMisWidgets(rolIds, suc);
      set({ misWidgets, loading: false });
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al cargar mis widgets';
      set({ error: msg, loading: false });
      message.error(msg);
    }
  },

  guardarConfiguracion: async (rolId: number, configs: DashboardWidgetConfigDto[]) => {
    set({ saving: true, error: null });
    try {
      await dashboardApi.guardarConfiguracion(rolId, configs);
      message.success('Configuración guardada correctamente');
      set({ saving: false });
      // Refrescar los widgets del rol
      await get().fetchWidgetsPorRol(rolId);
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al guardar configuración';
      set({ error: msg, saving: false });
      message.error(msg);
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
