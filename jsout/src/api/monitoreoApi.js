import * as signalR from '@microsoft/signalr';
import { apiClient } from './client';
import { useAuthStore } from '../stores/authStore';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4003/api';
const HUB_URL = API_URL.replace(/\/api$/, '') + '/hubs/monitoreo';
const BASE = '/Monitoreo';
class MonitoreoApiService {
    hubConnection = null;
    _conectado = false;
    _stateListeners = [];
    get conectado() {
        return this._conectado;
    }
    onStateChange(listener) {
        this._stateListeners.push(listener);
        listener(this._conectado);
        return () => {
            this._stateListeners = this._stateListeners.filter(l => l !== listener);
        };
    }
    _setConectado(conectado) {
        this._conectado = conectado;
        this._stateListeners.forEach(l => l(conectado));
    }
    async conectarHub(callbacks) {
        if (this.hubConnection?.state === signalR.HubConnectionState.Connected)
            return;
        if (this.hubConnection) {
            try {
                await this.hubConnection.stop();
            }
            catch { /* ignore */ }
            this.hubConnection = null;
        }
        const token = useAuthStore.getState().accessToken;
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(HUB_URL, {
            accessTokenFactory: () => token || '',
        })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .configureLogging(signalR.LogLevel.Warning)
            .build();
        this.hubConnection = connection;
        connection.on('CajaActualizada', (caja) => {
            callbacks.onCajaActualizada(caja);
        });
        connection.on('CajaDesconectada', (ip) => {
            callbacks.onCajaDesconectada(ip);
        });
        connection.on('CajaConectada', (caja) => {
            callbacks.onCajaConectada(caja);
        });
        connection.onreconnecting(() => {
            console.warn('[SignalR Monitoreo] Reconectando...');
            this._setConectado(false);
        });
        connection.onreconnected(() => {
            console.log('[SignalR Monitoreo] Reconectado');
            this._setConectado(true);
        });
        connection.onclose(() => {
            console.warn('[SignalR Monitoreo] Conexión cerrada');
            this._setConectado(false);
            this.hubConnection = null;
        });
        try {
            await connection.start();
            this._setConectado(true);
        }
        catch (err) {
            this._setConectado(false);
            console.error('[SignalR Monitoreo] Error al conectar:', err);
            throw err;
        }
    }
    async desconectarHub() {
        if (this.hubConnection) {
            try {
                await this.hubConnection.stop();
            }
            catch { /* ignore */ }
            this.hubConnection = null;
            this._setConectado(false);
        }
    }
    // ─── REST ───────────────────────────────────────────────────
    async obtenerTodas() {
        const { data } = await apiClient.get(BASE);
        return data.data ?? [];
    }
    async obtenerPorSucursal(sucursal) {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`);
        return data.data ?? [];
    }
    async obtenerPorIp(ip) {
        const { data } = await apiClient.get(`${BASE}/caja/${encodeURIComponent(ip)}`);
        return data.data ?? null;
    }
    async sincronizar(ip, request) {
        await apiClient.post(`${BASE}/${encodeURIComponent(ip)}/sincronizar`, request);
    }
    async pausar(ip) {
        await apiClient.post(`${BASE}/${encodeURIComponent(ip)}/pausar`);
    }
    async pausarTodas() {
        await apiClient.post(`${BASE}/pausar-todas`);
    }
    async configurar(ip, config) {
        await apiClient.post(`${BASE}/${encodeURIComponent(ip)}/configurar`, config);
    }
}
export const monitoreoApi = new MonitoreoApiService();
