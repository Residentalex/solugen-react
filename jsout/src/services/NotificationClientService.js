import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '../stores/authStore';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4002/api';
const HUB_URL = API_URL.replace(/\/api$/, '') + '/hubs/notificaciones';
/**
 * Servicio singleton que unifica:
 * 1. SignalR lifecycle (conexión/reconexión al hub de notificaciones)
 * 2. Browser Notification API (toasts nativos del OS)
 * 3. Visibility API (badge en título de pestaña cuando no está visible)
 * 4. Event emitter para que el store de Zustand se suscriba
 * 5. Limpieza completa al logout
 *
 * Reemplaza a notificacionesHub (deprecado).
 */
class NotificationClientService {
    connection = null;
    usuarioID = null;
    listeners = new Map();
    notificationPermission = 'default';
    originalTitle = '';
    badgeCount = 0;
    connected = false;
    visibilityHandler = null;
    // ────────────────────────────── Público ──────────────────────────────
    /**
     * Conecta SignalR al hub /hubs/notificaciones, se une al grupo
     * usuario_{usuarioID}, solicita permiso de Notification API
     * y registra el listener de visibilitychange.
     */
    async connect(usuarioID) {
        // Guardar título original de la pestaña en la primera conexión
        if (!this.originalTitle) {
            this.originalTitle = document.title;
        }
        this.usuarioID = usuarioID;
        // Si ya está conectado activamente, no duplicar
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
        // ── Handlers de SignalR ──
        connection.on('NuevaNotificacion', (notificacion) => {
            this.handleNuevaNotificacion(notificacion);
        });
        connection.onreconnecting(() => {
            console.warn('[NotificationClient] SignalR reconectando...');
            this.connected = false;
            this.emit('desconectado');
        });
        connection.onreconnected(async () => {
            console.log('[NotificationClient] SignalR reconectado');
            this.connected = true;
            try {
                await connection.invoke('UnirseAlGrupo', usuarioID);
            }
            catch {
                console.warn('[NotificationClient] Error al re-unirse al grupo tras reconexión');
            }
            this.emit('conectado');
        });
        connection.onclose(() => {
            console.warn('[NotificationClient] SignalR conexión cerrada');
            this.connection = null;
            this.connected = false;
            this.emit('desconectado');
        });
        // ── Iniciar conexión ──
        try {
            await connection.start();
            await connection.invoke('UnirseAlGrupo', usuarioID);
            this.connected = true;
            this.emit('conectado');
        }
        catch (err) {
            // No limpiamos this.connection para permitir reconexión automática
            console.warn('[NotificationClient] Error inicial de conexión, se reintentará automáticamente:', err);
            this.emit('error', err);
        }
        // ── Browser Notification API ──
        await this.requestNotificationPermission();
        // ── Visibility API ──
        this.visibilityHandler = () => {
            if (!document.hidden) {
                this.resetBadge();
            }
        };
        document.addEventListener('visibilitychange', this.visibilityHandler);
    }
    /**
     * Desconecta SignalR, limpia badge del título y emite evento 'desconectado'.
     */
    async disconnect() {
        // Limpiar listener de visibility
        if (this.visibilityHandler) {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
            this.visibilityHandler = null;
        }
        // Detener SignalR
        if (this.connection) {
            try {
                await this.connection.stop();
            }
            catch {
                // Ignorar errores al detener
            }
            this.connection = null;
        }
        this.usuarioID = null;
        this.connected = false;
        this.resetBadge();
        // Limpiar todos los listeners internos
        this.listeners.clear();
        this.emit('desconectado');
    }
    /** Indica si la conexión SignalR está activa. */
    isConnected() {
        return this.connected;
    }
    // ───────── Event emitter ─────────
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }
    off(event, callback) {
        const set = this.listeners.get(event);
        if (set) {
            set.delete(callback);
            if (set.size === 0) {
                this.listeners.delete(event);
            }
        }
    }
    // ────────────────────────────── Privado ──────────────────────────────
    emit(event, data) {
        const set = this.listeners.get(event);
        if (set) {
            set.forEach((callback) => {
                try {
                    callback(data);
                }
                catch (err) {
                    console.error(`[NotificationClient] Error en listener del evento "${event}":`, err);
                }
            });
        }
    }
    // ───────── Browser Notification API ─────────
    async requestNotificationPermission() {
        if (typeof Notification === 'undefined') {
            this.notificationPermission = 'denied';
            return;
        }
        if (Notification.permission === 'granted') {
            this.notificationPermission = 'granted';
            return;
        }
        if (Notification.permission === 'denied') {
            this.notificationPermission = 'denied';
            return;
        }
        try {
            const permission = await Notification.requestPermission();
            this.notificationPermission = permission;
        }
        catch {
            // Browser no soporta o error silencioso
            this.notificationPermission = 'denied';
        }
    }
    /**
     * Muestra un toast nativo del OS solo si:
     * - El permiso fue concedido
     * - La pestaña NO está visible (document.hidden === true)
     */
    async showBrowserNotification(titulo, opciones) {
        if (this.notificationPermission !== 'granted')
            return;
        if (!document.hidden)
            return;
        try {
            const notification = new Notification(titulo, {
                icon: '/favicon.ico',
                ...opciones,
            });
            notification.onclick = () => {
                window.focus();
                // Si hay una URL de acción en la notificación original, navegar
                notification.close();
            };
        }
        catch (err) {
            console.warn('[NotificationClient] Error al mostrar notificación del navegador:', err);
        }
    }
    // ───────── Badge en título de pestaña (Visibility API) ─────────
    resetBadge() {
        this.badgeCount = 0;
        document.title = this.originalTitle || 'Solugen ERP';
    }
    updateBadge(count) {
        this.badgeCount = count;
        if (count > 0 && document.hidden) {
            document.title = `(${count}) ${this.originalTitle || 'Solugen ERP'}`;
        }
        else {
            document.title = this.originalTitle || 'Solugen ERP';
        }
    }
    // ───────── Manejo de notificación entrante ─────────
    handleNuevaNotificacion(notificacion) {
        // 1. Emitir evento para el store (y cualquier otro suscriptor)
        this.emit('nueva', notificacion);
        // 2. Mostrar notificación nativa del navegador si aplica
        this.showBrowserNotification(notificacion.titulo, {
            body: notificacion.mensaje,
        });
        // 3. Incrementar badge si la pestaña no está visible
        if (document.hidden) {
            this.updateBadge(this.badgeCount + 1);
        }
    }
}
/** Singleton del servicio de notificaciones del cliente. */
export const notificationClient = new NotificationClientService();
