import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Badge, Button, Empty, Modal, message, Tooltip, Descriptions, Tag } from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  RightOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useNotificacionesStore } from '../stores/notificacionesStore';
import { useAuthStore } from '../stores/authStore';
import { ticketApi } from '../api/ticketApi';
import type { NotificacionVista } from '../types/notificaciones';
import TicketThreadModal from './TicketThreadModal';

function formatFechaRelativa(iso?: string): string {
  if (!iso) return '';
  const ahora = Date.now();
  const fecha = new Date(iso).getTime();
  const diffMs = ahora - fecha;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `Hace ${diffHoras} h`;
  const diffDias = Math.floor(diffHoras / 24);
  if (diffDias < 7) return `Hace ${diffDias} d`;
  return new Date(iso).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' });
}

function truncar(texto: string, max: number): string {
  if (!texto) return '';
  return texto.length > max ? texto.substring(0, max) + '...' : texto;
}

// Mapa de tipo → icono y color
const TIPO_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  Alerta: { icon: <WarningOutlined />, color: '#f1b44c' },
  Info: { icon: <InfoCircleOutlined />, color: '#556ee6' },
  Error: { icon: <CloseCircleOutlined />, color: '#f46a6a' },
  Advertencia: { icon: <ExclamationCircleOutlined />, color: '#f1b44c' },
  Exito: { icon: <CheckCircleOutlined />, color: '#34c38f' },
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const POLLING_INTERVAL = 30000; // 30 segundos

const NotificacionDropdown: React.FC = () => {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [ticketModalID, setTicketModalID] = useState<number | null>(null);
  const [verNotificacion, setVerNotificacion] = useState<NotificacionVista | null>(null);
  const [cargandoEstado, setCargandoEstado] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sucursal = useAuthStore((s) => s.compania);
  const usuario = useAuthStore((s) => s.usuario);

  const pendientes = useNotificacionesStore((s) => s.pendientes);
  const cantidadPendientes = useNotificacionesStore((s) => s.cantidadPendientes);
  const cargarPendientes = useNotificacionesStore((s) => s.cargarPendientes);
  const marcarComoLeida = useNotificacionesStore((s) => s.marcarComoLeida);
  const conectado = useNotificacionesStore((s) => s.conectado);

  // Carga inicial
  useEffect(() => {
    cargarPendientes();
  }, [cargarPendientes]);

  // Recargar cuando se conecte SignalR (para asegurar datos frescos)
  useEffect(() => {
    if (conectado) {
      cargarPendientes();
    }
  }, [conectado, cargarPendientes]);

  // Polling cada 30s cuando no hay SignalR
  useEffect(() => {
    if (!conectado) {
      intervalRef.current = setInterval(() => {
        cargarPendientes();
      }, POLLING_INTERVAL);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [conectado, cargarPendientes]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    if (abierto) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [abierto]);

  const handleMarcarLeida = useCallback(async (notificacionUsuarioID: number) => {
    await marcarComoLeida(notificacionUsuarioID);
  }, [marcarComoLeida]);

  const handleMarcarTodas = useCallback(() => {
    Modal.confirm({
      title: 'Marcar todas como leídas',
      content: '¿Marcar todas las notificaciones como leídas?',
      okText: 'Sí, marcar todas',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await Promise.all(
            pendientes.map((n) => marcarComoLeida(n.notificacionUsuarioID))
          );
          message.success('Todas marcadas como leídas');
          await cargarPendientes();
        } catch (err: any) {
          message.error(err?.response?.data?.errorMessage || 'Error al marcar notificaciones');
        }
      },
    });
  }, [pendientes, marcarComoLeida, cargarPendientes]);

  const handleNavigate = useCallback((url: string) => {
    setAbierto(false);
    navigate(url);
  }, [navigate]);

  const handleVerTodas = useCallback(() => {
    setAbierto(false);
    navigate('/notificaciones', { state: { tab: 'historial' } });
  }, [navigate]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="paces-topbar-action-btn"
        title="Notificaciones"
        onClick={() => setAbierto(!abierto)}
        style={{ position: 'relative' }}
      >
        <Badge count={cantidadPendientes} size="small" offset={[-2, 2]}>
          <BellOutlined style={{ fontSize: 16 }} />
        </Badge>
      </button>

      {abierto && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 380,
            maxHeight: 480,
            background: 'var(--paces-bg-elevated)',
            borderRadius: 12,
            boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid var(--paces-border)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--paces-border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--paces-text-heading)' }}>
                Notificaciones
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {pendientes.length > 0 && (
                  <Button type="link" size="small" onClick={handleMarcarTodas} style={{ fontSize: 12 }}>
                    ✓ Marcar todas
                  </Button>
                )}
                <Button type="link" size="small" onClick={handleVerTodas} style={{ fontSize: 12 }}>
                  Ver todas <RightOutlined style={{ fontSize: 10 }} />
                </Button>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--paces-text-secondary)', marginTop: 2 }}>
              {cantidadPendientes > 0 ? `${cantidadPendientes} nueva${cantidadPendientes !== 1 ? 's' : ''}` : '0 nuevas'}
              {' · '}
              {conectado ? (
                <span style={{ color: '#34c38f' }}>● Conectado</span>
              ) : (
                <Tooltip title="Las notificaciones se actualizan cada 30 segundos">
                  <span style={{ color: 'var(--paces-text-secondary)' }}>◌ Sin conexión en tiempo real</span>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Lista */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {pendientes.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <Empty description={<>Estás al día <span role="img" aria-label="fiesta">🎉</span></>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                <Button type="link" size="small" onClick={handleVerTodas} style={{ marginTop: 4 }}>
                  Ver historial
                </Button>
              </div>
            ) : (
              pendientes.slice(0, 5).map((notif) => (
                <NotificacionItem
                  key={notif.notificacionUsuarioID}
                  notificacion={notif}
                  onMarcarLeida={handleMarcarLeida}
                  onNavigate={handleNavigate}
                  onAbrirTicket={setTicketModalID}
                  onAbrirDetalle={setVerNotificacion}
                />
              ))
            )}
          </div>

          {pendientes.length > 5 && (
            <div
              style={{
                padding: '10px 16px',
                borderTop: '1px solid var(--paces-border)',
                textAlign: 'center',
              }}
            >
              <Button type="link" size="small" onClick={handleVerTodas} style={{ fontSize: 12 }}>
                Ver todas las notificaciones ({pendientes.length})
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modal detalle de notificacion */}
      <Modal
        title={verNotificacion?.titulo || 'Notificación'}
        open={!!verNotificacion}
        onCancel={() => setVerNotificacion(null)}
        footer={null}
        width={520}
      >
        {verNotificacion && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Mensaje">
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 300, overflowY: 'auto' }}>
                  {verNotificacion.mensaje}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Módulo">{verNotificacion.modulo || '-'}</Descriptions.Item>
              <Descriptions.Item label="Tipo">
                <Tag color={TIPO_CONFIG[verNotificacion.tipo]?.color || '#556ee6'}>{verNotificacion.tipo || 'Info'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Fecha">
                {verNotificacion.fechaCreacion ? new Date(verNotificacion.fechaCreacion).toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Estado">
                <Tag color={verNotificacion.leida ? 'default' : 'blue'}>{verNotificacion.leida ? 'Leída' : 'No leída'}</Tag>
              </Descriptions.Item>
            </Descriptions>

            {verNotificacion.tipo === 'Ticket' && verNotificacion.referenciaID && (
              <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button type="primary" onClick={() => {
                  const id = verNotificacion.referenciaID!;
                  setVerNotificacion(null);
                  setTicketModalID(id);
                }}>
                  Ver ticket
                </Button>
                <Button
                  style={{ borderColor: '#34c38f', color: '#34c38f' }}
                  onClick={async () => {
                    if (!sucursal || !verNotificacion?.referenciaID || !usuario) return;
                    setCargandoEstado(true);
                    try {
                      await ticketApi.cambiarEstado(sucursal, verNotificacion.referenciaID, { estado: 'Resuelto', usuarioID: usuario.id });
                      message.success('Ticket marcado como resuelto');
                      setVerNotificacion(null);
                    } catch (err: any) {
                      message.error(err?.response?.data?.errorMessage || 'Error al marcar como resuelto');
                    } finally {
                      setCargandoEstado(false);
                    }
                  }}
                  loading={cargandoEstado}
                >
                  ✓ Resolver
                </Button>
              </div>
            )}

            {verNotificacion?.referenciaTipo === 'NotificacionSQL' && verNotificacion?.referenciaID && (
              <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button type="primary" onClick={() => {
                  const id = verNotificacion.referenciaID!;
                  setVerNotificacion(null);
                  navigate(`/visualizar-consulta/${id}`);
                }}>
                  Visualizar datos
                </Button>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Modal de hilo de ticket */}
      <TicketThreadModal
        open={ticketModalID !== null}
        ticketID={ticketModalID ?? 0}
        onClose={() => setTicketModalID(null)}
      />
    </div>
  );
};

// ───────── Item individual de notificacion ─────────
const NotificacionItem: React.FC<{
  notificacion: NotificacionVista;
  onMarcarLeida: (id: number) => Promise<void>;
  onNavigate?: (url: string) => void;
  onAbrirTicket?: (ticketID: number) => void;
  onAbrirDetalle?: (n: NotificacionVista) => void;
}> = ({ notificacion, onMarcarLeida, onNavigate, onAbrirTicket, onAbrirDetalle }) => {
  const [eliminando, setEliminando] = useState(false);

  const config = TIPO_CONFIG[notificacion.tipo] || { icon: <BellOutlined />, color: '#556ee6' };

  const handleClickLeida = useCallback(async () => {
    setEliminando(true);
    await new Promise((resolve) => setTimeout(resolve, 250));
    await onMarcarLeida(notificacion.notificacionUsuarioID);
  }, [onMarcarLeida, notificacion.notificacionUsuarioID]);

  const handleClickBody = useCallback(() => {
    if (!notificacion.leida) {
      onMarcarLeida(notificacion.notificacionUsuarioID);
    }
    if (notificacion.tipo === 'Ticket' && notificacion.referenciaID && onAbrirTicket) {
      onAbrirTicket(notificacion.referenciaID);
    } else if (notificacion.urlAccion && onNavigate) {
      onNavigate(notificacion.urlAccion);
    } else if (onAbrirDetalle) {
      onAbrirDetalle(notificacion);
    }
  }, [notificacion, onMarcarLeida, onNavigate, onAbrirTicket, onAbrirDetalle]);

  const tieneUrl = !!notificacion.urlAccion;
  const esTicket = notificacion.tipo === 'Ticket' && !!notificacion.referenciaID;
  const clickeable = tieneUrl || esTicket || !!onAbrirDetalle;

  return (
    <div
      className="paces-row-hover"
      style={{
        display: 'flex', gap: 12, padding: '12px 16px',
        borderBottom: '1px solid var(--paces-border-secondary)',
        cursor: 'default', alignItems: 'flex-start',
        opacity: eliminando ? 0 : notificacion.leida ? 0.65 : 1,
        transition: 'opacity 0.25s ease',
        pointerEvents: eliminando ? ('none' as const) : undefined,
      }}
    >
      <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
        {!notificacion.leida && (
          <div style={{
            position: 'absolute', top: -2, left: -2,
            width: 6, height: 6, borderRadius: '50%',
            backgroundColor: '#556ee6', zIndex: 1,
          }} />
        )}
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: hexToRgba(config.color, 0.12),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: config.color, flexShrink: 0,
        }}>
          {config.icon}
        </div>
      </div>

      <div
        onClick={clickeable ? handleClickBody : undefined}
        style={{ flex: 1, minWidth: 0, cursor: clickeable ? 'pointer' : 'default' }}
      >
        <div style={{
          fontWeight: 600, fontSize: 13, color: 'var(--paces-text-heading)',
          marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {truncar(notificacion.titulo, 60)}
          </span>
          {tieneUrl && !esTicket && (
            <RightOutlined style={{ fontSize: 10, flexShrink: 0, color: 'var(--paces-text-secondary)' }} />
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--paces-text-secondary)', marginBottom: 4, lineHeight: 1.4 }}>
          {truncar(notificacion.mensaje, 100)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--paces-text-secondary)' }}>
          <ClockCircleOutlined style={{ fontSize: 10 }} />
          <span>{formatFechaRelativa(notificacion.fechaCreacion)}</span>
          <span style={{ color: 'var(--paces-border)' }}>|</span>
          <span style={{ color: config.color }}>{notificacion.tipo}</span>
        </div>

        {esTicket && (
          <Button
            type="primary" size="small"
            onClick={() => {
              if (!notificacion.leida) onMarcarLeida(notificacion.notificacionUsuarioID);
              onAbrirTicket?.(notificacion.referenciaID!);
            }}
            style={{ marginTop: 6, fontSize: 12 }}
          >
            Ver ticket
          </Button>
        )}
      </div>

      <Button
        type="text" size="small" icon={<CheckOutlined />}
        onClick={handleClickLeida}
        style={{ flexShrink: 0, marginTop: 2 }}
        title="Marcar como leída"
      />
    </div>
  );
};

export default NotificacionDropdown;
