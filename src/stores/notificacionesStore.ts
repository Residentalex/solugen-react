import { create } from 'zustand';
import { notificacionesApi } from '../api/notificacionesApi';
import { notificationClient } from '../services/NotificationClientService';
import { useAuthStore } from './authStore';
import type { NotificacionVista } from '../types/notificaciones';

// Referencia al callback para poder limpiarlo en desconectarSignalR
let _onNuevaCallback: ((notificacion: NotificacionVista) => void) | null = null;

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
      // Suscribirse a eventos del servicio unificado
      _onNuevaCallback = (notificacion: NotificacionVista) => {
        get().agregarNotificacionTiempoReal(notificacion);
      };
      notificationClient.on('nueva', _onNuevaCallback);

      await notificationClient.connect(usuarioID);
      set({ conectado: true });

      // Cargar pendientes iniciales tras conectar
      await get().cargarPendientes();
    } catch (err) {
      console.error('Error al conectar SignalR:', err);
    }
  },

  desconectarSignalR: () => {
    // Limpiar callback del service para evitar duplicados en reconexión
    if (_onNuevaCallback) {
      notificationClient.off('nueva', _onNuevaCallback);
      _onNuevaCallback = null;
    }
    notificationClient.disconnect();
    set({ conectado: false });
  },

  agregarNotificacionTiempoReal: (notificacion) => {
    set((state) => ({
      pendientes: [notificacion, ...state.pendientes],
      cantidadPendientes: state.cantidadPendientes + 1,
    }));
  },
}));
