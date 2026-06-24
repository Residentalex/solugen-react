import React, { useRef, useEffect, useState } from 'react';
import { message } from 'antd';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { chatApi } from '../../api/chatApi';

interface ChatMessagesProps {
  onBack: () => void;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ onBack }) => {
  const conversacionActiva = useChatStore((s) => s.conversacionActiva);
  const mensajes = useChatStore((s) => s.mensajes);
  const enviarMensaje = useChatStore((s) => s.enviarMensaje);
  const conversaciones = useChatStore((s) => s.conversaciones);
  const cargando = useChatStore((s) => s.cargando);
  const conectado = useChatStore((s) => s.conectado);
  const usuarioID = useAuthStore((s) => s.usuario?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [texto, setTexto] = React.useState('');

  const mensajesActuales = conversacionActiva ? mensajes[conversacionActiva] || [] : [];
  const conversacion = conversaciones.find((c) => c.id === conversacionActiva);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajesActuales.length]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleEliminar = async () => {
    if (!conversacionActiva) return;
    try {
      await chatApi.eliminarConversacion(conversacionActiva);
      message.success('Conversacion eliminada');
      setMenuOpen(false);
      onBack();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al eliminar');
    }
  };

  const handleEnviar = () => {
    if (!texto.trim()) return;
    enviarMensaje(texto);
    setTexto('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar(); }
  };

  const titulo = conversacion?.titulo || (conversacion?.participantes || [])
    .filter((p) => p.usuarioID !== usuarioID)
    .map((p) => p.nombre)
    .join(', ') || 'Chat';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--paces-card-border)',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--paces-bg-container)',
        borderRadius: '12px 12px 0 0',
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 16, color: '#556ee6' }}>
          ←
        </button>
        {!conectado && (
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4d4f', flexShrink: 0 }} title="Desconectado" />
        )}
        <div style={{ flex: 1, fontWeight: 600, fontSize: 14, color: 'var(--paces-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {titulo}
        </div>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', fontSize: 18, color: 'var(--paces-text-secondary)', borderRadius: 4 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paces-bg-layout)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
            ⋮
          </button>
          {menuOpen && (
            <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--paces-bg-elevated)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10, minWidth: 180, overflow: 'hidden' }}>
              <div onClick={handleEliminar}
                style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 13, color: '#ff4d4f', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paces-bg-layout)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                🗑 Eliminar conversacion
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8,
        background: 'var(--paces-bg-layout)',
      }}>
        {!conectado && <div style={{ textAlign: 'center', color: '#ff4d4f', padding: 8, fontSize: 12, background: 'rgba(255,77,79,0.08)', borderRadius: 6, marginBottom: 4 }}>Sin conexión con el servidor</div>}
        {cargando && <div style={{ textAlign: 'center', color: 'var(--paces-text-secondary)', padding: 20 }}>Cargando mensajes...</div>}
        {!cargando && mensajesActuales.length === 0 && <div style={{ textAlign: 'center', color: 'var(--paces-text-secondary)', padding: 20 }}>No hay mensajes aun. ¡Envia el primero!</div>}
        {mensajesActuales.map((m) => {
          const esPropio = m.remitenteID === usuarioID;
          return (
            <div key={m.id} style={{ alignSelf: esPropio ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              {!esPropio && <div style={{ fontSize: 11, color: 'var(--paces-text-secondary)', marginBottom: 2, paddingLeft: 4 }}>{m.remitenteNombre}</div>}
              <div style={{
                background: esPropio ? '#556ee6' : 'var(--paces-bg-container)',
                color: esPropio ? '#fff' : 'var(--paces-text)',
                padding: '8px 12px', borderRadius: 12,
                borderBottomRightRadius: esPropio ? 4 : 12,
                borderBottomLeftRadius: esPropio ? 12 : 4,
                fontSize: 13, lineHeight: 1.4, wordBreak: 'break-word',
                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
              }}>
                {m.contenido}
              </div>
              <div style={{ fontSize: 10, color: 'var(--paces-text-secondary)', textAlign: esPropio ? 'right' : 'left', padding: '2px 4px 0' }}>
                {formatFecha(m.fechaEnvio)}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div style={{
        padding: '8px 12px', borderTop: '1px solid var(--paces-card-border)',
        background: 'var(--paces-bg-container)', borderRadius: '0 0 12px 12px',
        display: 'flex', gap: 8, alignItems: 'flex-end',
      }}>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)}
          onKeyDown={handleKeyDown} placeholder="Escribe un mensaje..." rows={1}
          style={{
            flex: 1, border: '1px solid var(--paces-card-border)', borderRadius: 8,
            padding: '8px 12px', fontSize: 13, resize: 'none', outline: 'none',
            fontFamily: 'inherit', maxHeight: 80, background: 'var(--paces-bg-elevated)',
            color: 'var(--paces-text)',
          }}
        />
        <button onClick={handleEnviar} disabled={!texto.trim()}
          style={{
            background: texto.trim() ? '#556ee6' : 'var(--paces-card-border)',
            border: 'none', borderRadius: 8, padding: '8px 16px',
            color: '#fff', cursor: texto.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 600,
          }}>
          Enviar
        </button>
      </div>
    </div>
  );
};

function formatFecha(fecha: string): string {
  try {
    const d = new Date(fecha);
    const horas = Math.floor((Date.now() - d.getTime()) / 3600000);
    if (horas < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  } catch { return ''; }
}

export default ChatMessages;
