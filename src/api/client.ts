import axios from 'axios';
import type { AuthSesionDTO } from '../types/auth';
import type { AuthRefreshRequest } from '../types/auth';
import { useAuthStore } from '../stores/authStore';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4002/api';

export const apiClient = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';
if (useMocks) {
  import('./mockAdapter').then(({ setupMocks }) => setupMocks());
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    // Verificar si el token ya expiró ANTES de enviar el request
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        // Token expirado → guardar sucursal activa antes de logout
        const sucursalActual = useAuthStore.getState().sucursalActiva;
        sessionStorage.setItem('ultimaSucursalActiva', String(sucursalActual));
        useAuthStore.getState().logout();
        sessionStorage.setItem('returnUrl', window.location.pathname + window.location.search);
        window.location.href = '/login';
        return Promise.reject(new Error('Sesión expirada'));
      }
    } catch {
      // Si falla decodificar el token, continuar normalmente
    }

    config.headers.Authorization = `Bearer ${token}`;
  }

  // Identificar origen web para el historial
  config.headers['X-Client-App'] = 'WEB';

  const appVersion = useAuthStore.getState().appVersion;
  if (appVersion) {
    config.headers['X-Client-Version'] = appVersion;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isLoginRequest = originalRequest.url?.includes('/auth/login');

    if (error.response?.status === 401 && !isLoginRequest) {
      // Ya se intentó refrescar y sigue dando 401 → forzar redirect
      if (originalRequest._retry) {
        const sucursalActual = useAuthStore.getState().sucursalActiva;
        sessionStorage.setItem('ultimaSucursalActiva', String(sucursalActual));
        useAuthStore.getState().logout();
        sessionStorage.setItem('returnUrl', window.location.pathname + window.location.search);
        window.location.href = '/login';
        return Promise.reject(new Error('Sesión expirada'));
      }

      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        const equipo = useAuthStore.getState().equipo;
        const ip = useAuthStore.getState().ip;
        const compania = useAuthStore.getState().compania;

        if (!refreshToken) throw new Error('No refresh token');

        const refreshData: AuthRefreshRequest = {
          refreshToken,
          equipo,
          ip,
          sucursal: compania,
        };

        const { data } = await axios.post(`${apiUrl}/auth/refresh`, refreshData);
        const sesion: AuthSesionDTO = data.data;

        useAuthStore.getState().setSession({
          accessToken: sesion.accessToken,
          refreshToken: sesion.refreshToken,
          usuario: sesion.usuario,
          sucursalActiva: sesion.sucursalActiva,
          sucursalContable: sesion.sucursalContable,
          sucursalesPermitidas: sesion.sucursalesPermitidas,
        });

        originalRequest.headers.Authorization = `Bearer ${sesion.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        const sucursalActual = useAuthStore.getState().sucursalActiva;
        sessionStorage.setItem('ultimaSucursalActiva', String(sucursalActual));
        useAuthStore.getState().logout();
        sessionStorage.setItem('returnUrl', window.location.pathname + window.location.search);
        window.location.href = '/login';
        return Promise.reject(new Error('Sesión expirada'));
      }
    }

    return Promise.reject(error);
  }
);
