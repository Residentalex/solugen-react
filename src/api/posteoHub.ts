import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4002/api';
// SignalR necesita la URL base sin /api
const HUB_URL = API_URL.replace(/\/api$/, '') + '/hubs/posteo';

export interface PosteoProgreso {
  jobId: string;
  tipoDocumento: string;
  sucursal: string;
  totalDocumentos: number;
  documentosProcesados: number;
  documentoActual: string;
  exitoso: boolean;
  mensaje: string;
}

export interface PosteoResultado {
  jobId: string;
  totalExitosos: number;
  totalErrores: number;
  errores: string[];
}

type ProgressCallback = (progreso: PosteoProgreso) => void;
type CompletedCallback = (resultado: PosteoResultado) => void;

class PosteoHubService {
  private connection: signalR.HubConnection | null = null;

  async connect(): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      return;
    }

    const token = useAuthStore.getState().accessToken;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => token || '',
      })
      .withAutomaticReconnect()
      .build();

    await this.connection.start();
  }

  async subscribeToJob(
    jobId: string,
    onProgress: ProgressCallback,
    onCompleted: CompletedCallback
  ): Promise<void> {
    await this.connect();

    this.connection!.on('PosteoIniciado', (progreso: PosteoProgreso) => {
      if (progreso.jobId === jobId) onProgress(progreso);
    });

    this.connection!.on('PosteoProgreso', (progreso: PosteoProgreso) => {
      if (progreso.jobId === jobId) onProgress(progreso);
    });

    this.connection!.on('PosteoCompletado', (resultado: PosteoResultado) => {
      if (resultado.jobId === jobId) onCompleted(resultado);
    });

    await this.connection!.invoke('SuscribirPosteo', jobId);
  }

  async unsubscribeFromJob(jobId: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('DesuscribirPosteo', jobId);
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }
}

export const posteoHub = new PosteoHubService();