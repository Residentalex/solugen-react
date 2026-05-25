import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Badge, Button, Empty } from 'antd';
import { BellOutlined, CheckOutlined, RightOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useNotificacionesStore } from '../stores/notificacionesStore';
import type { NotificacionVista } from '../types/notificaciones';

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

const POLLING_INTERVAL = 30000; // 30 segundos

const NotificacionDropdown: React.FC = () => {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pendientes = useNotificacionesStore((s) => s.pendientes);
  const cantidadPendientes = useNotificacionesStore((s) => s.cantidadPendientes);
  const cargarPendientes = useNotificacionesStore((s) => s.cargarPendientes);
  const marcarComoLeida = useNotificacionesStore((s) => s.marcarComoLeida);
  const conectado = useNotificacionesStore((s) => s.conectado);

  // Carga inicial
  useEffect(() => {
    cargarPendientes();
  }, [cargarPendientes]);

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

  const handleMarcarLeida = useCallback(async (e: React.MouseEvent, notificacionUsuarioID: number) => {
    e.stopPropagation();
    await marcarComoLeida(notificacionUsuarioID);
  }, [marcarComoLeida]);

  const handleVerTodas = useCallback(() => {
    setAbierto(false);
    navigate('/notificaciones');
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid var(--paces-border)',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--paces-text-heading)' }}>
              Notificaciones
            </span>
            <Button type="link" size="small" onClick={handleVerTodas} style={{ fontSize: 12 }}>
              Ver todas <RightOutlined style={{ fontSize: 10 }} />
            </Button>
          </div>

          {/* Lista */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {pendientes.length === 0 ? (
              <div style={{ padding: '32px 16px' }}>
                <Empty description="No hay notificaciones pendientes" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : (
              pendientes.slice(0, 5).map((notif) => (
                <NotificacionItem
                  key={notif.notificacionUsuarioID}
                  notificacion={notif}
                  onMarcarLeida={handleMarcarLeida}
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
    </div>
  );
};

// Item individual de notificacion
const NotificacionItem: React.FC<{
  notificacion: NotificacionVista;
  onMarcarLeida: (e: React.MouseEvent, id: number) => void;
}> = ({ notificacion, onMarcarLeida }) => {
  const tipoColor: Record<string, string> = {
    Alerta: '#f1b44c',
    Info: '#556ee6',
    Error: '#f46a6a',
    Advertencia: '#f1b44c',
    Exito: '#34c38f',
  };

  return (
    <div
      className="paces-row-hover"
      style={{
        display: 'flex',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid var(--paces-border-secondary)',
        cursor: 'default',
        alignItems: 'flex-start',
      }}
    >
      {/* Indicador de tipo (circulo) */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: tipoColor[notificacion.tipo] || '#556ee6',
          marginTop: 6,
          flexShrink: 0,
        }}
      />

      {/* Contenido */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--paces-text-heading)', marginBottom: 2 }}>
          {truncar(notificacion.titulo, 60)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--paces-text-secondary)', marginBottom: 4, lineHeight: 1.4 }}>
          {truncar(notificacion.mensaje, 100)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--paces-text-secondary)' }}>
          <ClockCircleOutlined style={{ fontSize: 10 }} />
          <span>{formatFechaRelativa(notificacion.fechaCreacion)}</span>
          <span style={{ color: 'var(--paces-border)' }}>|</span>
          <span style={{ color: tipoColor[notificacion.tipo] || '#556ee6' }}>{notificacion.tipo}</span>
        </div>
      </div>

      {/* Boton leer */}
      <Button
        type="text"
        size="small"
        icon={<CheckOutlined />}
        onClick={(e) => onMarcarLeida(e, notificacion.notificacionUsuarioID)}
        style={{ flexShrink: 0, marginTop: 2 }}
        title="Marcar como leída"
      />
    </div>
  );
};

export default NotificacionDropdown;
