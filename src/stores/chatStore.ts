import { create } from 'zustand';
import { message } from 'antd';
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
  subiendoAdjunto: boolean;
  respondiendoA: { id: number; contenido: string; remitente: string } | null;

  abrir: () => void;
  cerrar: () => void;
  seleccionarConversacion: (id: number) => Promise<void>;
  volverALista: () => void;
  enviarMensaje: (contenido: string, mensajePadreID?: number | null) => Promise<void>;
  subirAdjunto: (conversacionId: number, file: File) => Promise<void>;
  conectarSignalR: () => Promise<void>;
  desconectarSignalR: () => void;
  agregarMensajeTiempoReal: (mensaje: ChatMensajeDTO) => void;
  cargarConversaciones: () => Promise<void>;
  responderAMensaje: (mensaje: { id: number; contenido: string; remitente: string }) => void;
  cancelarRespuesta: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  viewState: 'closed',
  conversaciones: [],
  mensajes: {},
  conversacionActiva: null,
  noLeidos: 0,
  conectado: false,
  cargando: false,
  subiendoAdjunto: false,
  respondiendoA: null,

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
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || 'Error al cargar mensajes';
      console.error(msg);
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

  enviarMensaje: async (contenido: string, mensajePadreID?: number | null) => {
    const convId = get().conversacionActiva;
    if (!convId || !contenido.trim()) return;

    try {
      await chatHub.enviarMensaje(convId, contenido, mensajePadreID);
      set({ respondiendoA: null });
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || 'Error al enviar mensaje';
      message.error(msg);
    }
  },

  subirAdjunto: async (conversacionId: number, file: File) => {
    set({ subiendoAdjunto: true });
    try {
      const mensaje = await chatApi.subirAdjunto(conversacionId, file);
      set((state) => {
        const existentes = state.mensajes[conversacionId] || [];
        // No duplicar si SignalR ya lo entregó
        if (existentes.some(m => m.id === mensaje.id)) {
          return { subiendoAdjunto: false };
        }
        return {
          mensajes: {
            ...state.mensajes,
            [conversacionId]: [...existentes, mensaje],
          },
          subiendoAdjunto: false,
        };
      });
    } catch (err: any) {
      set({ subiendoAdjunto: false });
      message.error(err?.response?.data?.errorMessage || 'Error al subir archivo');
    }
  },

  conectarSignalR: async () => {
    const usuarioID = useAuthStore.getState().usuario?.id;
    if (!usuarioID) return;

    const conectarConReintento = async (intentos = 5): Promise<void> => {
      for (let i = 0; i < intentos; i++) {
        try {
          await chatHub.connect(usuarioID);
          chatHub.onMensajeRecibido((mensaje) => {
            get().agregarMensajeTiempoReal(mensaje);
          });
          set({ conectado: true });
          return;
        } catch (err) {
          console.warn(`[SignalR Chat] Intento ${i + 1}/${intentos} fallido:`, err);
          if (i < intentos - 1) await new Promise((r) => setTimeout(r, 5000));
        }
      }
      console.error('[SignalR Chat] No se pudo conectar después de varios intentos');
    };

    await conectarConReintento();
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

  responderAMensaje: (mensaje) => {
    set({ respondiendoA: mensaje });
  },

  cancelarRespuesta: () => {
    set({ respondiendoA: null });
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
