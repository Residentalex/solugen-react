import { create } from 'zustand';
import { notificacionesApi } from '../api/notificacionesApi';
import { notificacionesHub } from '../api/notificacionesHub';
import { useAuthStore } from './authStore';
import type { NotificacionVista } from '../types/notificaciones';

interface NotificacionesState {
  pendientes: NotificacionVista[];
  cantidadPendientes: number;
  cargando: boolean;
  conectado: boolean;

  cargarPendientes: () => Promise<void>;
  marcarComoLeida: (id: number) => Promise<void>;
  conectarSignalR: () => Promise<void>;
  desconectarSignalR: () => void;
  agregarNotificacionTiempoReal: (notificacion: NotificacionVista) => void;
}

export const useNotificacionesStore = create<NotificacionesState>((set, get) => ({
  pendientes: [],
  cantidadPendientes: 0,
  cargando: false,
  conectado: false,

  cargarPendientes: async () => {
    const sucursal = useAuthStore.getState().compania;
    const usuarioID = useAuthStore.getState().usuario?.id;
    if (!sucursal || !usuarioID) return;

    set({ cargando: true });
    try {
      const pendientes = await notificacionesApi.obtenerPendientes(sucursal, usuarioID);
      set({ pendientes, cantidadPendientes: pendientes.length });
    } catch (err) {
      console.error('Error al cargar notificaciones:', err);
    } finally {
      set({ cargando: false });
    }
  },

  marcarComoLeida: async (notificacionUsuarioID: number) => {
    const sucursal = useAuthStore.getState().compania;
    if (!sucursal) return;

    try {
      await notificacionesApi.marcarComoLeida(sucursal, notificacionUsuarioID);
      set((state) => {
        const pendientes = state.pendientes.filter(n => n.notificacionUsuarioID !== notificacionUsuarioID);
        return { pendientes, cantidadPendientes: pendientes.length };
      });
    } catch (err) {
      console.error('Error al marcar como leida:', err);
    }
  },

  conectarSignalR: async () => {
    const usuarioID = useAuthStore.getState().usuario?.id;
    if (!usuarioID || get().conectado) return;

    try {
      await notificacionesHub.connect(usuarioID);
      notificacionesHub.onNuevaNotificacion((notificacion) => {
        get().agregarNotificacionTiempoReal(notificacion);
      });
      set({ conectado: true });
    } catch (err) {
      console.error('Error al conectar SignalR:', err);
    }
  },

  desconectarSignalR: () => {
    notificacionesHub.disconnect();
    set({ conectado: false });
  },

  agregarNotificacionTiempoReal: (notificacion) => {
    set((state) => ({
      pendientes: [notificacion, ...state.pendientes],
      cantidadPendientes: state.cantidadPendientes + 1,
    }));
  },
}));
