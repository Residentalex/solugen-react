import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '../stores/authStore';
import type { ChatMensajeDTO } from '../types/chat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4002/api';
const HUB_URL = API_URL.replace(/\/api$/, '') + '/hubs/chat';

type MensajeRecibidoCallback = (mensaje: ChatMensajeDTO) => void;
type EscribiendoCallback = (data: { conversacionId: number; usuarioId: number; nombre: string }) => void;
type LeidoCallback = (data: { conversacionId: number; usuarioId: number }) => void;

class ChatHubService {
  private connection: signalR.HubConnection | null = null;

  async connect(usuarioID: number): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      return;
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

    try {
      await connection.start();
    } catch (err) {
      console.warn('[SignalR Chat] Error inicial de conexion:', err);
    }
  }

  async unirseAConversacion(conversacionId: number): Promise<void> {
    try {
      await this.connection?.invoke('UnirseAConversacion', conversacionId);
    } catch { /* ignore */ }
  }

  async salirDeConversacion(conversacionId: number): Promise<void> {
    try {
      await this.connection?.invoke('SalirDeConversacion', conversacionId);
    } catch { /* ignore */ }
  }

  async enviarMensaje(conversacionId: number, contenido: string): Promise<void> {
    try {
      await this.connection?.invoke('EnviarMensaje', conversacionId, contenido);
    } catch { /* ignore */ }
  }

  async escribir(conversacionId: number): Promise<void> {
    try {
      await this.connection?.invoke('Escribiendo', conversacionId);
    } catch { /* ignore */ }
  }

  async marcarLeido(conversacionId: number): Promise<void> {
    try {
      await this.connection?.invoke('MarcarLeido', conversacionId);
    } catch { /* ignore */ }
  }

  onMensajeRecibido(callback: MensajeRecibidoCallback): void {
    if (!this.connection) return;
    this.connection.off('MensajeRecibido');
    this.connection.on('MensajeRecibido', callback);
  }

  onUsuarioEscribiendo(callback: EscribiendoCallback): void {
    if (!this.connection) return;
    this.connection.off('UsuarioEscribiendo');
    this.connection.on('UsuarioEscribiendo', callback);
  }

  onMensajesLeidos(callback: LeidoCallback): void {
    if (!this.connection) return;
    this.connection.off('MensajesLeidos');
    this.connection.on('MensajesLeidos', callback);
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }
}

export const chatHub = new ChatHubService();
