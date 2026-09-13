import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '../stores/authStore';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4002/api';
// SignalR necesita la URL base sin /api
const HUB_URL = API_URL.replace(/\/api$/, '') + '/hubs/posteo';
class PosteoHubService {
    connection = null;
    _connectionState = signalR.HubConnectionState.Disconnected;
    _stateListeners = [];
    get connectionState() {
        return this._connectionState;
    }
    onStateChange(listener) {
        this._stateListeners.push(listener);
        listener(this._connectionState);
        return () => {
            this._stateListeners = this._stateListeners.filter(l => l !== listener);
        };
    }
    _setConnectionState(state) {
        this._connectionState = state;
        this._stateListeners.forEach(l => l(state));
    }
    async connect(timeoutMs = 15000) {
        if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
            return;
        }
        // Detener conexión existente si hay una
        if (this.connection) {
            try {
                await this.connection.stop();
            }
            catch {
                // Ignorar errores al detener
            }
        }
        const token = useAuthStore.getState().accessToken;
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(HUB_URL, {
            accessTokenFactory: () => token || '',
        })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Warning)
            .build();
        this.connection.onclose(() => {
            this._setConnectionState(signalR.HubConnectionState.Disconnected);
        });
        this.connection.onreconnecting(() => {
            this._setConnectionState(signalR.HubConnectionState.Reconnecting);
        });
        this.connection.onreconnected(() => {
            this._setConnectionState(signalR.HubConnectionState.Connected);
        });
        try {
            const startPromise = this.connection.start();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado al conectar con el servidor')), timeoutMs));
            await Promise.race([startPromise, timeoutPromise]);
            this._setConnectionState(signalR.HubConnectionState.Connected);
        }
        catch (err) {
            this._setConnectionState(signalR.HubConnectionState.Disconnected);
            throw err;
        }
    }
    async subscribeToJob(jobId, onProgress, onCompleted) {
        await this.connect();
        this.connection.on('PosteoIniciado', (progreso) => {
            if (progreso.jobId === jobId)
                onProgress(progreso);
        });
        this.connection.on('PosteoProgreso', (progreso) => {
            if (progreso.jobId === jobId)
                onProgress(progreso);
        });
        this.connection.on('PosteoCompletado', (resultado) => {
            if (resultado.jobId === jobId)
                onCompleted(resultado);
        });
        await this.connection.invoke('SuscribirPosteo', jobId);
    }
    async unsubscribeFromJob(jobId) {
        if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
            await this.connection.invoke('DesuscribirPosteo', jobId);
        }
    }
    async disconnect() {
        if (this.connection) {
            await this.connection.stop();
            this.connection = null;
        }
    }
}
export const posteoHub = new PosteoHubService();
