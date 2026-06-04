import { create } from 'zustand';
import { Sucursal } from '../types/auth';
import type { AuthUsuarioSesionDTO, AuthSucursalPermitidaDTO } from '../types/auth';
import { authApi } from '../api/authApi';

const SUCURSAL_CONSOLIDADO = Sucursal.Consolidado;

function obtenerUsuario(): AuthUsuarioSesionDTO | null {
  try {
    const raw = localStorage.getItem('usuario');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function obtenerSucursales(): AuthSucursalPermitidaDTO[] {
  try {
    const raw = localStorage.getItem('sucursalesPermitidas');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function obtenerSucursalActiva(): Sucursal {
  try {
    const raw = localStorage.getItem('sucursalActiva');
    return raw ? (parseInt(raw, 10) as Sucursal) : SUCURSAL_CONSOLIDADO;
  } catch {
    return SUCURSAL_CONSOLIDADO;
  }
}

function obtenerSucursalActivaInicial(): Sucursal {
  const sucursales = obtenerSucursales();
  // Si solo hay 1 sucursal permitida, forzarla como activa
  if (sucursales.length === 1) {
    return sucursales[0].sucursal as Sucursal;
  }
  // Si hay varias, usar la que estaba guardada o Consolidado por defecto
  return obtenerSucursalActiva();
}

interface AuthState {
  accessToken: string;
  refreshToken: string;
  usuario: AuthUsuarioSesionDTO | null;
  sucursalActiva: Sucursal;
  sucursalesPermitidas: AuthSucursalPermitidaDTO[];
  compania: Sucursal;
  equipo: string;
  ip: string;
  appVersion: string;
  isAuthenticated: boolean;

  login: (request: {
    nombreUsuario: string;
    contrasena: string;
    equipo: string;
    ip: string;
    sucursal: Sucursal;
  }) => Promise<void>;

  logout: () => void;
  setSession: (session: {
    accessToken: string;
    refreshToken: string;
    usuario: AuthUsuarioSesionDTO;
    sucursalActiva: Sucursal;
    sucursalesPermitidas: AuthSucursalPermitidaDTO[];
  }) => void;
  marcarClaveCambiada: () => void;
  setSucursalActiva: (sucursal: Sucursal) => void;
  setAppVersion: (version: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: localStorage.getItem('accessToken') || '',
  refreshToken: localStorage.getItem('refreshToken') || '',
  usuario: obtenerUsuario(),
  sucursalActiva: obtenerSucursalActivaInicial(),
  sucursalesPermitidas: obtenerSucursales(),
  compania: SUCURSAL_CONSOLIDADO,
  equipo: localStorage.getItem('equipo') || '',
  ip: localStorage.getItem('ip') || '',
  appVersion: localStorage.getItem('appVersion') || '',
  isAuthenticated: !!localStorage.getItem('accessToken'),

  login: async (request) => {
    const sesion = await authApi.login(request);
    localStorage.setItem('accessToken', sesion.accessToken);
    localStorage.setItem('refreshToken', sesion.refreshToken);
    localStorage.setItem('usuario', JSON.stringify(sesion.usuario));
    localStorage.setItem('sucursalesPermitidas', JSON.stringify(sesion.sucursalesPermitidas));
    localStorage.setItem('equipo', request.equipo);
    localStorage.setItem('ip', request.ip);
    localStorage.setItem('sucursalActiva', String(sesion.sucursalActiva));

    set({
      accessToken: sesion.accessToken,
      refreshToken: sesion.refreshToken,
      usuario: sesion.usuario,
      sucursalActiva: sesion.sucursalActiva,
      sucursalesPermitidas: sesion.sucursalesPermitidas,
      compania: SUCURSAL_CONSOLIDADO,
      equipo: request.equipo,
      ip: request.ip,
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('usuario');
    localStorage.removeItem('sucursalesPermitidas');
    localStorage.removeItem('equipo');
    localStorage.removeItem('ip');
    localStorage.removeItem('sucursalActiva');
    localStorage.removeItem('appVersion');
    set({
      accessToken: '',
      refreshToken: '',
      usuario: null,
      sucursalActiva: SUCURSAL_CONSOLIDADO,
      sucursalesPermitidas: [],
      compania: SUCURSAL_CONSOLIDADO,
      equipo: '',
      ip: '',
      appVersion: '',
      isAuthenticated: false,
    });
  },

  setSession: (session) => {
    localStorage.setItem('accessToken', session.accessToken);
    localStorage.setItem('refreshToken', session.refreshToken);
    localStorage.setItem('usuario', JSON.stringify(session.usuario));
    localStorage.setItem('sucursalesPermitidas', JSON.stringify(session.sucursalesPermitidas));
    localStorage.setItem('sucursalActiva', String(session.sucursalActiva));
    set({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      usuario: session.usuario,
      sucursalActiva: session.sucursalActiva,
      sucursalesPermitidas: session.sucursalesPermitidas,
      compania: SUCURSAL_CONSOLIDADO,
      isAuthenticated: true,
    });
  },

  marcarClaveCambiada: () => {
    set((state) => {
      if (!state.usuario) return state;
      const updated = { ...state.usuario, debeCambiarClave: false };
      localStorage.setItem('usuario', JSON.stringify(updated));
      return { usuario: updated };
    });
  },

  setSucursalActiva: (sucursal) => {
    localStorage.setItem('sucursalActiva', sucursal.toString());
    set({ sucursalActiva: sucursal });
  },

  setAppVersion: (version) => {
    localStorage.setItem('appVersion', version);
    set({ appVersion: version });
  },
}));
