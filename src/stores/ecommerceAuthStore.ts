import { create } from 'zustand';
import { message } from 'antd';
import { ecommerceApi } from '../api/ecommerceApi';

export interface EcommerceUsuario {
  id: string;
  email: string;
  nombre: string;
  telefono: string;
  direccion: string;
  fechaRegistro: string;
}

export interface RegistroDTO {
  email: string;
  password: string;
  nombre: string;
  telefono: string;
  direccion: string;
}

export interface ActualizarPerfilDTO {
  nombre: string;
  telefono: string;
  direccion: string;
}

export interface CambiarClaveDTO {
  passwordActual: string;
  passwordNueva: string;
}

function obtenerUsuario(): EcommerceUsuario | null {
  try {
    const raw = localStorage.getItem('ecom_usuario');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

interface EcommerceAuthState {
  usuario: EcommerceUsuario | null;
  token: string;
  refreshToken: string;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  registro: (datos: RegistroDTO) => Promise<void>;
  logout: () => void;
  cargarPerfil: () => Promise<void>;
  actualizarPerfil: (datos: ActualizarPerfilDTO) => Promise<void>;
  cambiarClave: (datos: CambiarClaveDTO) => Promise<void>;
}

export const useEcommerceAuthStore = create<EcommerceAuthState>((set, get) => ({
  usuario: obtenerUsuario(),
  token: localStorage.getItem('ecom_token') || '',
  refreshToken: localStorage.getItem('ecom_refreshToken') || '',
  isAuthenticated: !!localStorage.getItem('ecom_token'),

  login: async (email, password) => {
    const response = await ecommerceApi.login({ email, password });
    const { token, refreshToken, usuario } = response;

    localStorage.setItem('ecom_token', token);
    localStorage.setItem('ecom_refreshToken', refreshToken);
    localStorage.setItem('ecom_usuario', JSON.stringify(usuario));

    set({ usuario, token, refreshToken, isAuthenticated: true });
  },

  registro: async (datos) => {
    await ecommerceApi.registro(datos);
    // Auto-login después del registro
    await get().login(datos.email, datos.password);
  },

  logout: () => {
    localStorage.removeItem('ecom_token');
    localStorage.removeItem('ecom_refreshToken');
    localStorage.removeItem('ecom_usuario');
    set({ usuario: null, token: '', refreshToken: '', isAuthenticated: false });
  },

  cargarPerfil: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const usuario = await ecommerceApi.perfil(token);
      localStorage.setItem('ecom_usuario', JSON.stringify(usuario));
      set({ usuario });
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al cargar el perfil';
      message.error(msg);
      // Si 401, limpiar sesión
      if (err?.response?.status === 401) {
        get().logout();
      }
      throw err;
    }
  },

  actualizarPerfil: async (datos) => {
    const { token } = get();
    if (!token) {
      message.error('No hay sesión activa');
      throw new Error('No hay sesión activa');
    }
    try {
      const usuario = await ecommerceApi.actualizarPerfil(token, datos);
      localStorage.setItem('ecom_usuario', JSON.stringify(usuario));
      set({ usuario });
      message.success('Perfil actualizado correctamente');
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al actualizar el perfil';
      message.error(msg);
      throw err;
    }
  },

  cambiarClave: async (datos) => {
    const { token } = get();
    if (!token) {
      message.error('No hay sesión activa');
      throw new Error('No hay sesión activa');
    }
    try {
      await ecommerceApi.cambiarClave(token, datos);
      message.success('Contraseña cambiada correctamente');
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al cambiar la contraseña';
      message.error(msg);
      throw err;
    }
  },
}));
