import { create } from 'zustand';
import { Sucursal } from '../types/auth';
import type { PantallaDTO, AuthUsuarioSesionDTO, AuthSucursalPermitidaDTO } from '../types/auth';
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

function obtenerTodasLasPantallas(): PantallaDTO[] {
  try {
    const raw = localStorage.getItem('todasLasPantallas');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
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
    const raw = sessionStorage.getItem('sucursalActiva');
    if (raw === null) return SUCURSAL_CONSOLIDADO;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? SUCURSAL_CONSOLIDADO : (parsed as Sucursal);
  } catch {
    return SUCURSAL_CONSOLIDADO;
  }
}

function obtenerSucursalContable(): Sucursal {
  try {
    const raw = sessionStorage.getItem('sucursalContable');
    return raw ? (parseInt(raw, 10) as Sucursal) : SUCURSAL_CONSOLIDADO;
  } catch {
    return SUCURSAL_CONSOLIDADO;
  }
}

function obtenerSucursalActivaInicial(): Sucursal {
  const sucursales = obtenerSucursales();
  if (sucursales.length === 1) {
    return sucursales[0].sucursal as Sucursal;
  }
  return obtenerSucursalActiva();
}

function aplicarAccionesPorSucursal(pantallas: PantallaDTO[], sucursal: Sucursal): PantallaDTO[] {
  return pantallas.map(p => ({
    ...p,
    acciones: p.accionesPorSucursal?.[sucursal] ?? p.acciones,
  }));
}

interface AuthState {
  accessToken: string;
  refreshToken: string;
  usuario: AuthUsuarioSesionDTO | null;
  todasLasPantallas: PantallaDTO[];
  sucursalActiva: Sucursal;
  sucursalContable: Sucursal;
  sucursalesPermitidas: AuthSucursalPermitidaDTO[];
  securitySucursal: number;
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
    sucursalContable: Sucursal;
    sucursalesPermitidas: AuthSucursalPermitidaDTO[];
  }) => void;
  marcarClaveCambiada: () => void;
  setSucursalActiva: (sucursal: Sucursal) => Promise<void>;
  setAppVersion: (version: string) => void;
  setSecuritySucursal: (sucursal: number) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: localStorage.getItem('accessToken') || '',
  refreshToken: localStorage.getItem('refreshToken') || '',
  usuario: obtenerUsuario(),
  todasLasPantallas: obtenerTodasLasPantallas(),
  sucursalActiva: obtenerSucursalActivaInicial(),
  sucursalContable: obtenerSucursalContable(),
  sucursalesPermitidas: obtenerSucursales(),
  securitySucursal: 4,
  compania: SUCURSAL_CONSOLIDADO,
  equipo: localStorage.getItem('equipo') || '',
  ip: localStorage.getItem('ip') || '',
  appVersion: localStorage.getItem('appVersion') || '',
  isAuthenticated: !!localStorage.getItem('accessToken'),

  login: async (request) => {
    const sesion = await authApi.login(request);
    localStorage.setItem('accessToken', sesion.accessToken);
    localStorage.setItem('refreshToken', sesion.refreshToken);
    localStorage.setItem('sucursalesPermitidas', JSON.stringify(sesion.sucursalesPermitidas));
    localStorage.setItem('equipo', request.equipo);
    localStorage.setItem('ip', request.ip);
    const ultimaSucursal = sessionStorage.getItem('ultimaSucursalActiva');
    const ultimaParsed = parseInt(ultimaSucursal ?? '', 10);
    const sucursalFinal = (ultimaSucursal && !isNaN(ultimaParsed)) ? (ultimaParsed as Sucursal) : (sesion.sucursalActiva ?? SUCURSAL_CONSOLIDADO);
    sessionStorage.removeItem('ultimaSucursalActiva');

    sessionStorage.setItem('sucursalActiva', String(sucursalFinal));
    sessionStorage.setItem('sucursalContable', String(sesion.sucursalContable));

    const todasLasPantallas = sesion.usuario.pantallas;
    const pantallasConAcciones = aplicarAccionesPorSucursal(todasLasPantallas, sucursalFinal);
    const usuarioActualizado = { ...sesion.usuario, pantallas: pantallasConAcciones };

    localStorage.setItem('todasLasPantallas', JSON.stringify(todasLasPantallas));
    localStorage.setItem('usuario', JSON.stringify(usuarioActualizado));

    set({
      accessToken: sesion.accessToken,
      refreshToken: sesion.refreshToken,
      usuario: usuarioActualizado,
      todasLasPantallas,
      sucursalActiva: sucursalFinal,
      sucursalContable: sesion.sucursalContable,
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
    localStorage.removeItem('todasLasPantallas');
    localStorage.removeItem('sucursalesPermitidas');
    localStorage.removeItem('equipo');
    localStorage.removeItem('ip');
    sessionStorage.removeItem('sucursalActiva');
    sessionStorage.removeItem('sucursalContable');
    localStorage.removeItem('appVersion');
    set({
      accessToken: '',
      refreshToken: '',
      usuario: null,
      todasLasPantallas: [],
      sucursalActiva: SUCURSAL_CONSOLIDADO,
      sucursalContable: SUCURSAL_CONSOLIDADO,
      sucursalesPermitidas: [],
      compania: SUCURSAL_CONSOLIDADO,
      equipo: '',
      ip: '',
      appVersion: '',
      isAuthenticated: false,
    });
  },

  setSession: (session) => {
    const todasLasPantallas = session.usuario.pantallas;
    const pantallasConAcciones = aplicarAccionesPorSucursal(todasLasPantallas, session.sucursalActiva);
    const usuarioActualizado = { ...session.usuario, pantallas: pantallasConAcciones };

    localStorage.setItem('accessToken', session.accessToken);
    localStorage.setItem('refreshToken', session.refreshToken);
    localStorage.setItem('usuario', JSON.stringify(usuarioActualizado));
    localStorage.setItem('todasLasPantallas', JSON.stringify(todasLasPantallas));
    localStorage.setItem('sucursalesPermitidas', JSON.stringify(session.sucursalesPermitidas));
    const ultimaSucursal = sessionStorage.getItem('ultimaSucursalActiva');
    const ultimaParsed = parseInt(ultimaSucursal ?? '', 10);
    const sucursalFinal = (ultimaSucursal && !isNaN(ultimaParsed)) ? (ultimaParsed as Sucursal) : (session.sucursalActiva ?? SUCURSAL_CONSOLIDADO);
    sessionStorage.removeItem('ultimaSucursalActiva');

    sessionStorage.setItem('sucursalActiva', String(sucursalFinal));
    sessionStorage.setItem('sucursalContable', String(session.sucursalContable ?? SUCURSAL_CONSOLIDADO));
    set({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      usuario: usuarioActualizado,
      todasLasPantallas,
      sucursalActiva: sucursalFinal,
      sucursalContable: session.sucursalContable ?? SUCURSAL_CONSOLIDADO,
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
      return { usuario: updated, todasLasPantallas: state.todasLasPantallas };
    });
  },

  setSucursalActiva: async (sucursal) => {
    sessionStorage.setItem('sucursalActiva', sucursal.toString());
    sessionStorage.setItem('ultimaSucursalActiva', sucursal.toString());
    const state = get();
    const todasLasPantallas = state.todasLasPantallas;
    if (state.usuario && todasLasPantallas.length > 0) {
      const pantallasConAcciones = aplicarAccionesPorSucursal(todasLasPantallas, sucursal);
      const usuarioActualizado: AuthUsuarioSesionDTO = { ...state.usuario, pantallas: pantallasConAcciones };
      localStorage.setItem('usuario', JSON.stringify(usuarioActualizado));
      set({ usuario: usuarioActualizado, sucursalActiva: sucursal });
    } else {
      set({ sucursalActiva: sucursal });
    }
  },

  setAppVersion: (version) => {
    localStorage.setItem('appVersion', version);
    set({ appVersion: version });
  },

  setSecuritySucursal: (sucursal) => {
    set({ securitySucursal: sucursal });
  },
}));
