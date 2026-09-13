import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '../stores/authStore';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4002/api';
const HUB_URL = API_URL.replace(/\/api$/, '') + '/hubs/chat';
class ChatHubService {
    connection = null;
    async connect(usuarioID) {
        if (this.connection?.state === signalR.HubConnectionState.Connected)
            return;
        if (this.connection) {
            try {
                await this.connection.stop();
            }
            catch { /* ignore */ }
            this.connection = null;
        }
        const token = useAuthStore.getState().accessToken;
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(HUB_URL, {
            accessTokenFactory: () => token || '',
        })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .configureLogging(signalR.LogLevel.Warning)
            .build();
        this.connection = connection;
        connection.on('UsuarioConectado', () => { });
        connection.on('UsuarioDesconectado', () => { });
        connection.onreconnecting(() => {
            console.warn('[SignalR Chat] Reconectando...');
        });
        connection.onreconnected(() => {
            console.log('[SignalR Chat] Reconectado');
        });
        connection.onclose(() => {
            console.warn('[SignalR Chat] Conexion cerrada');
            this.connection = null;
        });
        await connection.start();
    }
    async invokeOrThrow(method, ...args) {
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            throw new Error('SignalR no está conectado');
        }
        await this.connection.invoke(method, ...args);
    }
    async invokeBestEffort(method, ...args) {
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected)
            return;
        try {
            await this.connection.invoke(method, ...args);
        }
        catch { /* conexión caída, no crítica */ }
    }
    async unirseAConversacion(conversacionId) {
        await this.invokeOrThrow('UnirseAConversacion', conversacionId);
    }
    async salirDeConversacion(conversacionId) {
        await this.invokeBestEffort('SalirDeConversacion', conversacionId);
    }
    async enviarMensaje(conversacionId, contenido, mensajePadreId) {
        await this.invokeOrThrow('EnviarMensaje', conversacionId, contenido, mensajePadreId ?? null);
    }
    async escribir(conversacionId) {
        await this.invokeBestEffort('Escribiendo', conversacionId);
    }
    async marcarLeido(conversacionId) {
        await this.invokeBestEffort('MarcarLeido', conversacionId);
    }
    onMensajeRecibido(callback) {
        if (!this.connection)
            return;
        this.connection.off('MensajeRecibido');
        this.connection.on('MensajeRecibido', callback);
    }
    onUsuarioEscribiendo(callback) {
        if (!this.connection)
            return;
        this.connection.off('UsuarioEscribiendo');
        this.connection.on('UsuarioEscribiendo', callback);
    }
    onMensajesLeidos(callback) {
        if (!this.connection)
            return;
        this.connection.off('MensajesLeidos');
        this.connection.on('MensajesLeidos', callback);
    }
    async disconnect() {
        if (this.connection) {
            await this.connection.stop();
            this.connection = null;
        }
    }
}
export const chatHub = new ChatHubService();
