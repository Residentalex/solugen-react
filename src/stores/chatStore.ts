import { create } from 'zustand';
import { chatApi } from '../api/chatApi';
import { chatHub } from '../api/chatHub';
import { useAuthStore } from './authStore';
import type { ChatConversacionListDTO, ChatMensajeDTO } from '../types/chat';

// --- Helper para notificaciones del navegador ---
function mostrarNotificacionChat(remitenteNombre: string, contenido: string, conversacionId: number): void {
  const truncar = (texto: string, max: number) =>
    texto.length > max ? texto.substring(0, max) + '...' : texto;

  const mostrar = () => {
    if (Notification.permission !== 'granted') return;
    const notification = new Notification(`Nuevo mensaje de ${remitenteNombre}`, {
      body: truncar(contenido, 100),
    });
    notification.onclick = () => {
      window.focus();
      useChatStore.getState().abrir();
      useChatStore.getState().seleccionarConversacion(conversacionId);
      notification.close();
    };
  };

  if (Notification.permission === 'granted') {
    mostrar();
  } else if (Notification.permission === 'default') {
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') mostrar();
    });
  }
}

type ViewState = 'closed' | 'list' | 'chat';

interface ChatState {
  viewState: ViewState;
  conversaciones: ChatConversacionListDTO[];
  mensajes: Record<number, ChatMensajeDTO[]>;
  conversacionActiva: number | null;
  noLeidos: number;
  conectado: boolean;
  cargando: boolean;

  abrir: () => void;
  cerrar: () => void;
  seleccionarConversacion: (id: number) => Promise<void>;
  volverALista: () => void;
  enviarMensaje: (contenido: string) => Promise<void>;
  conectarSignalR: () => Promise<void>;
  desconectarSignalR: () => void;
  agregarMensajeTiempoReal: (mensaje: ChatMensajeDTO) => void;
  cargarConversaciones: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  viewState: 'closed',
  conversaciones: [],
  mensajes: {},
  conversacionActiva: null,
  noLeidos: 0,
  conectado: false,
  cargando: false,

  abrir: () => {
    // Solicitar permiso de notificaciones (disparado por click del usuario en la burbuja)
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    set({ viewState: 'list' });
    get().cargarConversaciones();
  },

  cerrar: () => {
    const activeConv = get().conversacionActiva;
    if (activeConv) {
      chatHub.salirDeConversacion(activeConv);
    }
    set({ viewState: 'closed', conversacionActiva: null });
  },

  seleccionarConversacion: async (id: number) => {
    set({ conversacionActiva: id, cargando: true });

    const conv = get().conversaciones.find(c => c.id === id);
    const noLeidos = conv?.noLeidos ?? 0;

    if (noLeidos > 0) {
      chatApi.marcarLeido(id);
      chatHub.marcarLeido(id);
      set((state) => ({
        conversaciones: state.conversaciones.map(c =>
          c.id === id ? { ...c, noLeidos: 0 } : c
        ),
        noLeidos: Math.max(0, state.noLeidos - noLeidos),
      }));
    }

    try {
      const mensajes = await chatApi.obtenerMensajes(id);
      if (mensajes) {
        set((state) => ({
          mensajes: { ...state.mensajes, [id]: mensajes },
        }));
      }
      await chatHub.unirseAConversacion(id);
    } catch {
      console.error('Error al cargar mensajes');
    } finally {
      set({ cargando: false, viewState: 'chat' });
    }
  },

  volverALista: () => {
    const activeConv = get().conversacionActiva;
    if (activeConv) {
      chatHub.salirDeConversacion(activeConv);
    }
    set({ conversacionActiva: null, viewState: 'list' });
    get().cargarConversaciones();
  },

  enviarMensaje: async (contenido: string) => {
    const convId = get().conversacionActiva;
    if (!convId || !contenido.trim()) return;

    try {
      await chatHub.enviarMensaje(convId, contenido);
    } catch (err: any) {
      console.error('Error al enviar mensaje:', err?.response?.data?.errorMessage || err);
    }
  },

  conectarSignalR: async () => {
    const usuarioID = useAuthStore.getState().usuario?.id;
    if (!usuarioID || get().conectado) return;

    try {
      await chatHub.connect(usuarioID);
      chatHub.onMensajeRecibido((mensaje) => {
        get().agregarMensajeTiempoReal(mensaje);
      });
      set({ conectado: true });
    } catch (err) {
      console.error('Error al conectar SignalR chat:', err);
    }
  },

  desconectarSignalR: () => {
    chatHub.disconnect();
    set({ conectado: false });
  },

  agregarMensajeTiempoReal: (mensaje: ChatMensajeDTO) => {
    const convId = mensaje.conversacionID;
    const estado = get();
    const currentUser = useAuthStore.getState().usuario?.id;
    const isActive = estado.conversacionActiva === convId && estado.viewState === 'chat';

    if (isActive && currentUser !== mensaje.remitenteID) {
      chatApi.marcarLeido(convId);
      chatHub.marcarLeido(convId);
    }

    set((state) => {
      const existentes = state.mensajes[convId] || [];
      if (existentes.some(m => m.id === mensaje.id)) return state;

      const mensajesActualizados = {
        ...state.mensajes,
        [convId]: [...existentes, mensaje],
      };

      if (isActive) {
        return {
          mensajes: mensajesActualizados,
          conversaciones: state.conversaciones.map(c =>
            c.id === convId ? { ...c, ultimoMensaje: mensaje.contenido, ultimaFecha: mensaje.fechaEnvio, ultimoMensajeRemitenteID: mensaje.remitenteID, ultimoMensajeRemitente: mensaje.remitenteNombre } : c
          ),
        };
      }

      return {
        mensajes: mensajesActualizados,
        noLeidos: isActive ? state.noLeidos : state.noLeidos + 1,
        conversaciones: state.conversaciones.map(c =>
          c.id === convId
            ? {
                ...c,
                ultimoMensaje: mensaje.contenido,
                ultimaFecha: mensaje.fechaEnvio,
                ultimoMensajeRemitenteID: mensaje.remitenteID,
                ultimoMensajeRemitente: mensaje.remitenteNombre,
                noLeidos: isActive ? 0 : c.noLeidos + 1,
              }
            : c
        ),
      };
    });

    // Mostrar notificación del navegador si el chat está cerrado y no es mi propio mensaje
    if (currentUser !== mensaje.remitenteID && !isActive) {
      mostrarNotificacionChat(mensaje.remitenteNombre, mensaje.contenido, convId);
    }
  },

  cargarConversaciones: async () => {
    try {
      const conversaciones = await chatApi.obtenerConversaciones();
      if (!conversaciones) return;
      const noLeidos = conversaciones.reduce((sum, c) => sum + c.noLeidos, 0);
      set({ conversaciones, noLeidos });
    } catch (err) {
      console.error('Error al cargar conversaciones:', err);
    }
  },
}));
