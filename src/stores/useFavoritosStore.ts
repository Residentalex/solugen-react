import { create } from 'zustand';
import { message } from 'antd';
import { ecommerceApi } from '../api/ecommerceApi';
import type { FavoritoDTO } from '../api/ecommerceApi';
import { generarUUID } from '../utils/uuid';

const SESSION_ID_KEY = 'ecom_session_id';

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = generarUUID();
    localStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

interface FavoritosState {
  favoritos: FavoritoDTO[];
  totalFavoritos: number;
  loading: boolean;
  sessionId: string;

  cargarFavoritos: () => Promise<void>;
  agregarFavorito: (codigoProducto: string) => Promise<boolean>;
  eliminarFavorito: (id: string) => Promise<void>;
  toggleFavorito: (codigoProducto: string) => Promise<boolean>;
  esFavorito: (codigoProducto: string) => boolean;
}

export const useFavoritosStore = create<FavoritosState>((set, get) => ({
  favoritos: [],
  totalFavoritos: 0,
  loading: false,
  sessionId: getSessionId(),

  cargarFavoritos: async () => {
    const { sessionId } = get();
    set({ loading: true });
    try {
      const favoritos = await ecommerceApi.obtenerFavoritos(sessionId);
      set({ favoritos, totalFavoritos: favoritos.length });
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar favoritos');
    } finally {
      set({ loading: false });
    }
  },

  agregarFavorito: async (codigoProducto) => {
    const { sessionId } = get();
    try {
      await ecommerceApi.agregarFavorito({ sessionId, codigoProducto });
      await get().cargarFavoritos();
      message.success('Agregado a favoritos');
      return true;
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al agregar a favoritos');
      return false;
    }
  },

  eliminarFavorito: async (id) => {
    const { sessionId } = get();
    try {
      await ecommerceApi.eliminarFavorito(id, sessionId);
      await get().cargarFavoritos();
      message.info('Eliminado de favoritos');
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al eliminar de favoritos');
    }
  },

  toggleFavorito: async (codigoProducto) => {
    const { sessionId, favoritos } = get();
    const existe = favoritos.find((f) => f.codigoProducto === codigoProducto);

    if (existe) {
      try {
        await ecommerceApi.eliminarFavoritoPorProducto(sessionId, codigoProducto);
        await get().cargarFavoritos();
        message.info('Eliminado de favoritos');
        return false;
      } catch (err: any) {
        message.error(err?.response?.data?.errorMessage || 'Error al eliminar de favoritos');
        return true;
      }
    } else {
      try {
        await ecommerceApi.agregarFavorito({ sessionId, codigoProducto });
        await get().cargarFavoritos();
        message.success('Agregado a favoritos');
        return true;
      } catch (err: any) {
        message.error(err?.response?.data?.errorMessage || 'Error al agregar a favoritos');
        return false;
      }
    }
  },

  esFavorito: (codigoProducto) => {
    return get().favoritos.some((f) => f.codigoProducto === codigoProducto);
  },
}));
