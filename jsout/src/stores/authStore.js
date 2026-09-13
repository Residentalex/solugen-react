import { create } from 'zustand';
import { Sucursal } from '../types/auth';
import { authApi } from '../api/authApi';
const SUCURSAL_CONSOLIDADO = Sucursal.Consolidado;
function obtenerUsuario() {
    try {
        const raw = localStorage.getItem('usuario');
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
function obtenerTodasLasPantallas() {
    try {
        const raw = localStorage.getItem('todasLasPantallas');
        return raw ? JSON.parse(raw) : [];
    }
    catch {
        return [];
    }
}
function obtenerSucursales() {
    try {
        const raw = localStorage.getItem('sucursalesPermitidas');
        return raw ? JSON.parse(raw) : [];
    }
    catch {
        return [];
    }
}
function obtenerSucursalActiva() {
    try {
        const raw = sessionStorage.getItem('sucursalActiva');
        if (raw === null)
            return SUCURSAL_CONSOLIDADO;
        const parsed = parseInt(raw, 10);
        return isNaN(parsed) ? SUCURSAL_CONSOLIDADO : parsed;
    }
    catch {
        return SUCURSAL_CONSOLIDADO;
    }
}
function obtenerSucursalContable() {
    try {
        const raw = sessionStorage.getItem('sucursalContable');
        return raw ? parseInt(raw, 10) : SUCURSAL_CONSOLIDADO;
    }
    catch {
        return SUCURSAL_CONSOLIDADO;
    }
}
function obtenerSucursalActivaInicial() {
    const sucursales = obtenerSucursales();
    if (sucursales.length === 1) {
        return sucursales[0].sucursal;
    }
    return obtenerSucursalActiva();
}
function aplicarAccionesPorSucursal(pantallas, sucursal) {
    return pantallas.map(p => ({
        ...p,
        acciones: p.accionesPorSucursal?.[sucursal] ?? p.acciones,
    }));
}
export const useAuthStore = create((set, get) => ({
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
    clienteDefectoPOS: null,
    login: async (request) => {
        const sesion = await authApi.login(request);
        localStorage.setItem('accessToken', sesion.accessToken);
        localStorage.setItem('refreshToken', sesion.refreshToken);
        localStorage.setItem('sucursalesPermitidas', JSON.stringify(sesion.sucursalesPermitidas));
        localStorage.setItem('equipo', request.equipo);
        localStorage.setItem('ip', request.ip);
        const ultimaSucursal = sessionStorage.getItem('ultimaSucursalActiva');
        const ultimaParsed = parseInt(ultimaSucursal ?? '', 10);
        const sucursalFinal = (ultimaSucursal && !isNaN(ultimaParsed)) ? ultimaParsed : (sesion.sucursalActiva ?? SUCURSAL_CONSOLIDADO);
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
            clienteDefectoPOS: sesion.clienteDefectoPOS || null,
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
            clienteDefectoPOS: null,
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
        const sucursalFinal = (ultimaSucursal && !isNaN(ultimaParsed)) ? ultimaParsed : (session.sucursalActiva ?? SUCURSAL_CONSOLIDADO);
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
            clienteDefectoPOS: session.clienteDefectoPOS || null,
        });
    },
    marcarClaveCambiada: () => {
        set((state) => {
            if (!state.usuario)
                return state;
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
            const usuarioActualizado = { ...state.usuario, pantallas: pantallasConAcciones };
            localStorage.setItem('usuario', JSON.stringify(usuarioActualizado));
            set({ usuario: usuarioActualizado, sucursalActiva: sucursal });
        }
        else {
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
