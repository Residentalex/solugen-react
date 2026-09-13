import { create } from 'zustand';
import { message } from 'antd';
import { ecommerceApi } from '../api/ecommerceApi';
function obtenerUsuario() {
    try {
        const raw = localStorage.getItem('ecom_usuario');
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
export const useEcommerceAuthStore = create((set, get) => ({
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
        if (!token)
            return;
        try {
            const usuario = await ecommerceApi.perfil(token);
            localStorage.setItem('ecom_usuario', JSON.stringify(usuario));
            set({ usuario });
        }
        catch (err) {
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
        }
        catch (err) {
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
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al cambiar la contraseña';
            message.error(msg);
            throw err;
        }
    },
}));
