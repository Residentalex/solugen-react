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
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isLoginRequest = originalRequest.url?.includes('/auth/login');

    if (error.response?.status === 401 && !originalRequest._retry && !isLoginRequest) {
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
          sucursalesPermitidas: sesion.sucursalesPermitidas,
        });

        originalRequest.headers.Authorization = `Bearer ${sesion.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(new Error('Sesión expirada'));
      }
    }

    return Promise.reject(error);
  }
);
