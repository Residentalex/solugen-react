import * as signalR from '@microsoft/signalr';
import { apiClient } from './client';
import { useAuthStore } from '../stores/authStore';
import type { ApiResponse } from '../types/auth';
import type { MonitoreoCajaDTO, ConfigurarCajaRequest, SincronizarRequest, CajaVivoDTO, FacturaCajaEventoDTO } from '../types/monitoreo';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4003/api';
const HUB_URL = API_URL.replace(/\/api$/, '') + '/hubs/monitoreo';
const BASE = '/Monitoreo';

type CajaActualizadaCallback = (caja: MonitoreoCajaDTO) => void;
type CajaDesconectadaCallback = (ip: string) => void;
type CajaConectadaCallback = (caja: MonitoreoCajaDTO) => void;
type FacturaCajaCallback = (evento: FacturaCajaEventoDTO) => void;

export interface ConectarHubCallbacks {
  onCajaActualizada?: CajaActualizadaCallback;
  onCajaDesconectada?: CajaDesconectadaCallback;
  onCajaConectada?: CajaConectadaCallback;
  onFacturaCaja?: FacturaCajaCallback;
}

class MonitoreoApiService {
  private hubConnection: signalR.HubConnection | null = null;
  private _conectado = false;
  private _stateListeners: Array<(conectado: boolean) => void> = [];

  /**
   * Pantallas que estan usando el hub. La conexion solo se detiene cuando se
   * desmonta la ultima: el listado de cajas y la pagina de operaciones en vivo
   * comparten la misma conexion y una no debe cerrarle el hub a la otra.
   */
  private _consumidores = 0;

  /**
   * Cajas suscritas por esta pestana. SignalR no conserva las membresias de
   * grupo al reconectar, por lo que hay que re-suscribirlas en onreconnected.
   */
  private _cajasSuscritas = new Set<string>();

  get conectado(): boolean {
    return this._conectado;
  }

  get estaConectado(): boolean {
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

  async conectarHub(callbacks: ConectarHubCallbacks = {}): Promise<void> {
    // Se registra el consumidor antes de cualquier await: si la pantalla se
    // desmonta mientras conecta, su cleanup debe poder liberar este uso.
    this._consumidores++;

    // Si la conexión ya está activa no la recreamos: solo re-registramos los
    // handlers (off antes de on) para no duplicar callbacks ni dejar de
    // registrar FacturaCaja al volver a llamar con la conexión ya establecida.
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      this._registrarHandlers(this.hubConnection, callbacks);
      this._setConectado(true);
      return;
    }

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

    this._registrarHandlers(connection, callbacks);

    // Los handlers de estado solo aplican a la conexion vigente: una conexion
    // vieja cerrándose no debe alterar el estado de la que la reemplazo.
    connection.onreconnecting(() => {
      if (this.hubConnection !== connection) return;
      console.warn('[SignalR Monitoreo] Reconectando...');
      this._setConectado(false);
    });

    connection.onreconnected(() => {
      if (this.hubConnection !== connection) return;
      console.log('[SignalR Monitoreo] Reconectado');
      this._setConectado(true);
      // SignalR reconecta con un ConnectionId nuevo y sin membresias de grupo.
      void this._resuscribirCajas(connection);
    });

    connection.onclose(() => {
      if (this.hubConnection !== connection) return;
      console.warn('[SignalR Monitoreo] Conexión cerrada');
      this._setConectado(false);
      this.hubConnection = null;
    });

    try {
      await connection.start();
      if (this.hubConnection === connection) this._setConectado(true);
    } catch (err) {
      if (this.hubConnection === connection) this._setConectado(false);
      console.error('[SignalR Monitoreo] Error al conectar:', err);
      throw err;
    }
  }

  /**
   * Reaplica las suscripciones a cajas despues de una reconexion, que pierde
   * los grupos del lado del servidor (`caja-{ip}`).
   */
  private async _resuscribirCajas(conexion: signalR.HubConnection): Promise<void> {
    if (this.hubConnection !== conexion) return;
    if (conexion.state !== signalR.HubConnectionState.Connected) return;

    for (const ip of [...this._cajasSuscritas]) {
      try {
        await conexion.invoke('SuscribirCaja', ip);
      } catch (err) {
        console.warn('[SignalR Monitoreo] No se pudo re-suscribir la caja:', ip, err);
      }
    }
  }

  private _registrarHandlers(
    connection: signalR.HubConnection,
    callbacks: ConectarHubCallbacks
  ): void {
    connection.off('CajaActualizada');
    if (callbacks.onCajaActualizada) {
      connection.on('CajaActualizada', (caja: MonitoreoCajaDTO) => {
        callbacks.onCajaActualizada?.(caja);
      });
    }

    connection.off('CajaDesconectada');
    if (callbacks.onCajaDesconectada) {
      connection.on('CajaDesconectada', (ip: string) => {
        callbacks.onCajaDesconectada?.(ip);
      });
    }

    connection.off('CajaConectada');
    if (callbacks.onCajaConectada) {
      connection.on('CajaConectada', (caja: MonitoreoCajaDTO) => {
        callbacks.onCajaConectada?.(caja);
      });
    }

    connection.off('FacturaCaja');
    if (callbacks.onFacturaCaja) {
      connection.on('FacturaCaja', (evento: FacturaCajaEventoDTO) => {
        callbacks.onFacturaCaja?.(evento);
      });
    }
  }

  async desconectarHub(): Promise<void> {
    if (this._consumidores > 0) this._consumidores--;

    // Otra pantalla sigue usando el hub: no se corta la conexion.
    if (this._consumidores > 0) return;

    const conexion = this.hubConnection;

    // Se suelta la referencia ANTES de esperar el stop: si otra pantalla abre
    // una conexion nueva mientras esta se cierra, no debe quedar pisada por el
    // cierre de la anterior.
    this.hubConnection = null;
    this._cajasSuscritas.clear();
    this._setConectado(false);

    if (!conexion) return;
    try { await conexion.stop(); } catch { /* ignore */ }
  }

  async suscribirCaja(ip: string): Promise<void> {
    if (!ip) return;

    // Se registra la suscripcion aunque la conexion no este lista: asi se puede
    // reaplicar despues de una reconexion.
    this._cajasSuscritas.add(ip);

    try {
      if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
        await this.hubConnection.invoke('SuscribirCaja', ip);
      }
    } catch (err) {
      console.warn('[SignalR Monitoreo] Error al suscribir caja:', ip, err);
    }
  }

  async desuscribirCaja(ip: string): Promise<void> {
    if (!ip) return;

    this._cajasSuscritas.delete(ip);

    try {
      if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
        await this.hubConnection.invoke('DesuscribirCaja', ip);
      }
    } catch (err) {
      console.warn('[SignalR Monitoreo] Error al desuscribir caja:', ip, err);
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

  async obtenerVivo(
    ip: string,
    opciones?: { incluirAnuladas?: boolean; buscar?: string; cantidad?: number; salto?: number }
  ): Promise<CajaVivoDTO> {
    const params: Record<string, string | number | boolean> = {};
    if (opciones?.incluirAnuladas !== undefined) params.incluirAnuladas = opciones.incluirAnuladas;
    if (opciones?.buscar && opciones.buscar.trim() !== '') params.buscar = opciones.buscar.trim();
    if (opciones?.cantidad !== undefined) params.cantidad = opciones.cantidad;
    if (opciones?.salto !== undefined) params.salto = opciones.salto;

    const { data } = await apiClient.get<ApiResponse<CajaVivoDTO>>(
      `${BASE}/caja/${encodeURIComponent(ip)}/vivo`,
      { params }
    );
    return data.data;
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
