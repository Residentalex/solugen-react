import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '../stores/authStore';
import type { NotificacionSignalR } from '../types/notificaciones';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4002/api';
const HUB_URL = API_URL.replace(/\/api$/, '') + '/hubs/notificaciones';

type NuevaNotificacionCallback = (notificacion: NotificacionSignalR) => void;

class NotificacionesHubService {
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
      console.warn('[SignalR Notificaciones] Reconectando...');
    });

    connection.onreconnected(async () => {
      console.log('[SignalR Notificaciones] Reconectado');
      try {
        await connection.invoke('UnirseAlGrupo', usuarioID);
      } catch {
        console.warn('[SignalR Notificaciones] Error al re-unirse al grupo tras reconexión');
      }
    });

    connection.onclose(async () => {
      console.warn('[SignalR Notificaciones] Conexión cerrada, reintentando...');
      this.connection = null;
    });

    try {
      await connection.start();
      await connection.invoke('UnirseAlGrupo', usuarioID);
    } catch (err) {
      // No limpiamos this.connection para permitir reconexión automática
      console.warn('[SignalR Notificaciones] Error inicial de conexión, se reintentará automáticamente:', err);
    }
  }

  async reconectar(usuarioID: number): Promise<void> {
    await this.disconnect();
    await this.connect(usuarioID);
  }

  onNuevaNotificacion(callback: NuevaNotificacionCallback): void {
    if (!this.connection) return;
    this.connection.off('NuevaNotificacion');
    this.connection.on('NuevaNotificacion', callback);
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }
}

export const notificacionesHub = new NotificacionesHubService();
