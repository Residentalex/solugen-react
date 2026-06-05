import React, { useState, useCallback, useRef, useEffect } from 'react';
import { message } from 'antd';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { chatApi } from '../../api/chatApi';
import type { ChatParticipanteDTO, ChatConversacionListDTO } from '../../types/chat';

interface ChatConversationListProps {
  onSelectConversacion: (id: number) => void;
}

type CreationMode = null | 'individual' | 'grupal';

const ChatConversationList: React.FC<ChatConversationListProps> = ({ onSelectConversacion }) => {
  const conversaciones = useChatStore((s) => s.conversaciones);
  const cargarConversaciones = useChatStore((s) => s.cargarConversaciones);
  const usuarioID = useAuthStore((s) => s.usuario?.id);
  const [creationMode, setCreationMode] = useState<CreationMode>(null);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<ChatParticipanteDTO[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [seleccionados, setSeleccionados] = useState<ChatParticipanteDTO[]>([]);
  const [tituloGrupo, setTituloGrupo] = useState('');
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    cargarConversaciones();
  }, [cargarConversaciones]);

  useEffect(() => {
    if (!plusMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) setPlusMenuOpen(false);
    };
    setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [plusMenuOpen]);

  useEffect(() => {
    if (creationMode && searchRef.current) {
      searchRef.current.focus();
    }
  }, [creationMode]);

  const buscar = useCallback(async (q: string) => {
    if (q.length < 2) { setResultados([]); return; }
    setBuscando(true);
    try {
      const users = await chatApi.buscarUsuarios(q);
      setResultados(users.filter(u => u.usuarioID !== usuarioID));
    } catch { setResultados([]); }
    finally { setBuscando(false); }
  }, [usuarioID]);

  const handleBusquedaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBusqueda(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(val), 300);
  };

  const seleccionarUsuario = (user: ChatParticipanteDTO) => {
    if (creationMode === 'individual') { crearIndividual(user.usuarioID); return; }
    if (!seleccionados.find(s => s.usuarioID === user.usuarioID)) setSeleccionados(prev => [...prev, user]);
    setBusqueda(''); setResultados([]);
  };

  const quitarSeleccionado = (userId: number) => setSeleccionados(prev => prev.filter(s => s.usuarioID !== userId));

  const crearIndividual = async (targetId: number) => {
    try {
      const convId = await chatApi.crearConversacion({ titulo: '', tipo: 'I', participantes: [targetId] });
      setCreationMode(null); setBusqueda(''); setResultados([]);
      message.success('Conversacion creada');
      await cargarConversaciones();
      onSelectConversacion(convId);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al crear conversacion');
    }
  };

  const crearGrupal = async () => {
    const ids = seleccionados.map(s => s.usuarioID);
    if (ids.length < 2) { message.warning('Selecciona al menos 2 participantes'); return; }
    try {
      const convId = await chatApi.crearConversacion({
        titulo: tituloGrupo || `Grupo (${ids.length + 1})`, tipo: 'G', participantes: ids,
      });
      setCreationMode(null); setSeleccionados([]); setTituloGrupo(''); setBusqueda('');
      message.success('Grupo creado');
      await cargarConversaciones();
      onSelectConversacion(convId);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al crear grupo');
    }
  };

  if (creationMode) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--paces-card-border)',
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--paces-bg-container)',
          borderRadius: '12px 12px 0 0',
        }}>
          <button onClick={() => { setCreationMode(null); setBusqueda(''); setResultados([]); setSeleccionados([]); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 16, color: '#556ee6' }}>
            ←
          </button>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--paces-text)' }}>
            {creationMode === 'individual' ? 'Nuevo chat' : 'Nuevo grupo'}
          </span>
        </div>

        {creationMode === 'grupal' && (
          <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--paces-card-border)' }}>
            <input placeholder="Nombre del grupo (opcional)" value={tituloGrupo}
              onChange={(e) => setTituloGrupo(e.target.value)}
              style={{ width: '100%', border: '1px solid var(--paces-card-border)', borderRadius: 6,
                padding: '7px 10px', fontSize: 13, outline: 'none', background: 'var(--paces-bg-container)', color: 'var(--paces-text)' }} />
          </div>
        )}

        {seleccionados.length > 0 && (
          <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--paces-card-border)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {seleccionados.map(s => (
              <span key={s.usuarioID} style={{ background: 'rgba(85,110,230,0.1)', color: '#556ee6', borderRadius: 4, padding: '2px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                {s.nombre}
                <span onClick={() => quitarSeleccionado(s.usuarioID)} style={{ cursor: 'pointer', fontWeight: 700 }}>×</span>
              </span>
            ))}
          </div>
        )}

        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--paces-card-border)' }}>
          <input ref={searchRef} placeholder="Buscar usuarios por nombre..." value={busqueda}
            onChange={handleBusquedaChange}
            style={{ width: '100%', border: '1px solid var(--paces-card-border)', borderRadius: 6,
              padding: '7px 10px', fontSize: 13, outline: 'none', background: 'var(--paces-bg-container)', color: 'var(--paces-text)' }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {buscando && <div style={{ textAlign: 'center', color: 'var(--paces-text-secondary)', padding: 16, fontSize: 13 }}>Buscando...</div>}
          {!buscando && busqueda.length >= 2 && resultados.length === 0 && <div style={{ textAlign: 'center', color: 'var(--paces-text-secondary)', padding: 24, fontSize: 13 }}>Sin resultados</div>}
          {!buscando && busqueda.length < 2 && <div style={{ textAlign: 'center', color: 'var(--paces-text-secondary)', padding: 24, fontSize: 13 }}>Escribe al menos 2 caracteres para buscar</div>}
          {resultados.map(user => (
            <div key={user.usuarioID} onClick={() => seleccionarUsuario(user)}
              style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--paces-card-border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paces-bg-layout)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#556ee6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                {user.nombre.charAt(0).toUpperCase()}
              </div>
              <div style={{ fontSize: 13, color: 'var(--paces-text)' }}>{user.nombre}</div>
            </div>
          ))}
        </div>

        {creationMode === 'grupal' && seleccionados.length >= 2 && (
          <div style={{ padding: '8px 16px', borderTop: '1px solid var(--paces-card-border)', background: 'var(--paces-bg-container)' }}>
            <button onClick={crearGrupal} style={{ width: '100%', background: '#556ee6', border: 'none', borderRadius: 6, color: '#fff', padding: '8px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Crear grupo ({seleccionados.length + 1} participantes)
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--paces-card-border)',
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--paces-bg-container)', borderRadius: '12px 12px 0 0',
      }}>
        <span style={{ fontWeight: 600, fontSize: 14, flex: 1, color: 'var(--paces-text)' }}>Chat</span>
        <div ref={plusMenuRef} style={{ position: 'relative' }}>
          <button onClick={() => setPlusMenuOpen(!plusMenuOpen)} title="Nuevo"
            style={{
              width: 32, height: 32, borderRadius: '50%', background: '#556ee6', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 18, fontWeight: 600,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            +
          </button>
          {plusMenuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 4px)', minWidth: 200,
              background: 'var(--paces-bg-elevated)', borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 20, overflow: 'hidden',
            }}>
              <div onClick={() => { setPlusMenuOpen(false); setCreationMode('individual'); }}
                style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 13, color: 'var(--paces-text)', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paces-bg-layout)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                💬 Nuevo chat individual
              </div>
              <div onClick={() => { setPlusMenuOpen(false); setCreationMode('grupal'); }}
                style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 13, color: 'var(--paces-text)', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paces-bg-layout)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                👥 Nuevo grupo
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {conversaciones.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--paces-text-secondary)', padding: 24, fontSize: 13 }}>
            No tienes conversaciones activas
          </div>
        )}
        {conversaciones.map((conv) => (
          <SwipeableItem key={conv.id} onDelete={async () => {
            try {
              await chatApi.eliminarConversacion(conv.id);
              cargarConversaciones();
            } catch (err: any) { message.error(err?.response?.data?.errorMessage || 'Error al eliminar'); }
          }}>
            <div onClick={() => onSelectConversacion(conv.id)}
              style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--paces-card-border)', background: 'var(--paces-bg-elevated)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paces-bg-layout)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--paces-bg-elevated)')}>
              <AvatarCircle conv={conv} usuarioID={usuarioID} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--paces-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <ConversacionNombre conv={conv} usuarioID={usuarioID} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--paces-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conv.ultimoMensaje || 'Sin mensajes'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                {conv.ultimaFecha && <span style={{ fontSize: 10, color: 'var(--paces-text-secondary)' }}>{formatHora(conv.ultimaFecha)}</span>}
                {conv.noLeidos > 0 && (
                  <span style={{ background: '#ff4d4f', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 600, minWidth: 18, textAlign: 'center' }}>
                    {conv.noLeidos}
                  </span>
                )}
              </div>
            </div>
          </SwipeableItem>
        ))}
      </div>
    </div>
  );
};

function formatHora(fecha: string): string {
  try {
    const d = new Date(fecha);
    const diff = Date.now() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  } catch { return ''; }
}

function AvatarCircle({ conv, usuarioID }: { conv: ChatConversacionListDTO; usuarioID?: number }) {
  const otros = conv.participantes.filter((p) => p.usuarioID !== usuarioID);
  const inicial = otros[0]?.nombre?.charAt(0)?.toUpperCase() || conv.titulo?.charAt(0)?.toUpperCase() || '?';
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#556ee6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
      {inicial}
    </div>
  );
}

function ConversacionNombre({ conv, usuarioID }: { conv: ChatConversacionListDTO; usuarioID?: number }) {
  const otros = conv.participantes.filter((p) => p.usuarioID !== usuarioID);
  return <>{conv.titulo || otros.map((p) => p.nombre).join(', ') || 'Chat'}</>;
}

function SwipeableItem({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isSwiped = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => {
    currentX.current = e.touches[0].clientX - startX.current;
    if (currentX.current < 0 && contentRef.current) contentRef.current.style.transform = `translateX(${Math.max(currentX.current, -80)}px)`;
  };
  const handleTouchEnd = () => {
    if (currentX.current < -50) { isSwiped.current = true; if (contentRef.current) contentRef.current.style.transform = 'translateX(-80px)'; }
    else { isSwiped.current = false; if (contentRef.current) contentRef.current.style.transform = 'translateX(0)'; }
  };
  const handleDelete = () => { onDelete(); if (contentRef.current) contentRef.current.style.transform = 'translateX(0)'; isSwiped.current = false; };
  const handleClick = () => {
    if (isSwiped.current) { isSwiped.current = false; if (contentRef.current) contentRef.current.style.transform = 'translateX(0)'; }
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div ref={contentRef} onClick={handleClick}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        style={{ transition: 'transform 0.2s', position: 'relative', zIndex: 1 }}>
        {children}
      </div>
      <div onClick={handleDelete} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, background: '#ff4d4f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, fontWeight: 600, zIndex: 0 }}>
        Eliminar
      </div>
    </div>
  );
}

export default ChatConversationList;
