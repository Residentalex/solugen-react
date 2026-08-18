import * as signalR from '@microsoft/signalr';
import { apiClient } from './client';
import { useAuthStore } from '../stores/authStore';
import type { ApiResponse } from '../types/auth';
import type { MonitoreoCajaDTO, ConfigurarCajaRequest, SincronizarRequest } from '../types/monitoreo';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4003/api';
const HUB_URL = API_URL.replace(/\/api$/, '') + '/hubs/monitoreo';
const BASE = '/Monitoreo';

type CajaActualizadaCallback = (caja: MonitoreoCajaDTO) => void;
type CajaDesconectadaCallback = (ip: string) => void;
type CajaConectadaCallback = (caja: MonitoreoCajaDTO) => void;

class MonitoreoApiService {
  private hubConnection: signalR.HubConnection | null = null;
  private _conectado = false;
  private _stateListeners: Array<(conectado: boolean) => void> = [];

  get conectado(): boolean {
    return this._conectado;
  }

  onStateChange(listener: (conectado: boolean) => void): () => void {
    this._stateListeners.push(listener);
    listener(this._conectado);
    return () => {
      this._stateListeners = this._stateListeners.filter(l => l !== listener);
    };
  }

  private _setConectado(conectado: boolean): void {
    this._conectado = conectado;
    this._stateListeners.forEach(l => l(conectado));
  }

  async conectarHub(callbacks: {
    onCajaActualizada: CajaActualizadaCallback;
    onCajaDesconectada: CajaDesconectadaCallback;
    onCajaConectada: CajaConectadaCallback;
  }): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) return;

    if (this.hubConnection) {
      try { await this.hubConnection.stop(); } catch { /* ignore */ }
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

    connection.on('CajaActualizada', (caja: MonitoreoCajaDTO) => {
      callbacks.onCajaActualizada(caja);
    });

    connection.on('CajaDesconectada', (ip: string) => {
      callbacks.onCajaDesconectada(ip);
    });

    connection.on('CajaConectada', (caja: MonitoreoCajaDTO) => {
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
    } catch (err) {
      this._setConectado(false);
      console.error('[SignalR Monitoreo] Error al conectar:', err);
      throw err;
    }
  }

  async desconectarHub(): Promise<void> {
    if (this.hubConnection) {
      try { await this.hubConnection.stop(); } catch { /* ignore */ }
      this.hubConnection = null;
      this._setConectado(false);
    }
  }

  // ─── REST ───────────────────────────────────────────────────

  async obtenerTodas(): Promise<MonitoreoCajaDTO[]> {
    const { data } = await apiClient.get<ApiResponse<MonitoreoCajaDTO[]>>(BASE);
    return data.data ?? [];
  }

  async obtenerPorSucursal(sucursal: number): Promise<MonitoreoCajaDTO[]> {
    const { data } = await apiClient.get<ApiResponse<MonitoreoCajaDTO[]>>(`${BASE}/${sucursal}`);
    return data.data ?? [];
  }

  async obtenerPorIp(ip: string): Promise<MonitoreoCajaDTO | null> {
    const { data } = await apiClient.get<ApiResponse<MonitoreoCajaDTO>>(`${BASE}/caja/${encodeURIComponent(ip)}`);
    return data.data ?? null;
  }

  async sincronizar(ip: string, request: SincronizarRequest): Promise<void> {
    await apiClient.post(`${BASE}/${encodeURIComponent(ip)}/sincronizar`, request);
  }

  async pausar(ip: string): Promise<void> {
    await apiClient.post(`${BASE}/${encodeURIComponent(ip)}/pausar`);
  }

  async pausarTodas(): Promise<void> {
    await apiClient.post(`${BASE}/pausar-todas`);
  }

  async configurar(ip: string, config: ConfigurarCajaRequest): Promise<void> {
    await apiClient.post(`${BASE}/${encodeURIComponent(ip)}/configurar`, config);
  }
}

export const monitoreoApi = new MonitoreoApiService();
