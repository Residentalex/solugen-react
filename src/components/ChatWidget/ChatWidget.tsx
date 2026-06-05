import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import ChatConversationList from './ChatConversationList';
import ChatMessages from './ChatMessages';

const CHAT_WIDTH = 360;
const CHAT_HEIGHT = 480;

const ChatWidget: React.FC = () => {
  const viewState = useChatStore((s) => s.viewState);
  const noLeidos = useChatStore((s) => s.noLeidos);
  const abrir = useChatStore((s) => s.abrir);
  const cerrar = useChatStore((s) => s.cerrar);
  const seleccionarConversacion = useChatStore((s) => s.seleccionarConversacion);
  const volverALista = useChatStore((s) => s.volverALista);
  const widgetRef = useRef<HTMLDivElement>(null);

  // --- Estado y refs para arrastre de la burbuja ---
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem('chat-pos');
      return saved ? JSON.parse(saved) : { bottom: 20, right: 20 };
    } catch {
      return { bottom: 20, right: 20 };
    }
  });
  const posRef = useRef(pos);
  posRef.current = pos;
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOrigin = useRef({ bottom: 20, right: 20 });
  // --- fin arrastre ---

  useEffect(() => {
    if (viewState === 'closed') return;
    const handleClickOutside = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        cerrar();
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [viewState, cerrar]);

  // --- Arrastre de la burbuja (solo cuando está cerrada) ---
  useEffect(() => {
    if (viewState !== 'closed') return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const deltaX = e.clientX - dragStart.current.x;
      const deltaY = e.clientY - dragStart.current.y;
      const newRight = Math.max(20, Math.min(
        dragOrigin.current.right - deltaX,
        window.innerWidth - 68
      ));
      const newBottom = Math.max(20, Math.min(
        dragOrigin.current.bottom - deltaY,
        window.innerHeight - 68
      ));
      const newPos = { bottom: newBottom, right: newRight };
      setPos(newPos);
      posRef.current = newPos;
    };

    const handleMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      localStorage.setItem('chat-pos', JSON.stringify(posRef.current));
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStart.current.x;
      const deltaY = touch.clientY - dragStart.current.y;
      const newRight = Math.max(20, Math.min(
        dragOrigin.current.right - deltaX,
        window.innerWidth - 68
      ));
      const newBottom = Math.max(20, Math.min(
        dragOrigin.current.bottom - deltaY,
        window.innerHeight - 68
      ));
      const newPos = { bottom: newBottom, right: newRight };
      setPos(newPos);
      posRef.current = newPos;
    };

    const handleTouchEnd = () => {
      if (!dragging.current) return;
      dragging.current = false;
      localStorage.setItem('chat-pos', JSON.stringify(posRef.current));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [viewState]);
  // --- fin arrastre ---

  if (viewState === 'closed') {
    return (
      <>
        {noLeidos > 0 && (
          <div style={{
            position: 'fixed', bottom: pos.bottom + 48, right: pos.right,
            background: '#ff4d4f', color: '#fff', borderRadius: 10,
            padding: '1px 6px', fontSize: 11, fontWeight: 600,
            zIndex: 9999, minWidth: 18, textAlign: 'center',
          }}>
            {noLeidos}
          </div>
        )}
        <button onClick={abrir} title="Chat"
          style={{
            position: 'fixed', bottom: pos.bottom, right: pos.right,
            width: 48, height: 48,
            borderRadius: '50%', background: '#556ee6', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', boxShadow: '0 4px 12px rgba(85,110,230,0.4)',
            zIndex: 9999, color: '#fff', fontSize: 22, transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseDown={(e) => {
            if (viewState !== 'closed') return;
            e.preventDefault();
            dragging.current = true;
            dragStart.current = { x: e.clientX, y: e.clientY };
            dragOrigin.current = { ...pos };
          }}
          onTouchStart={(e) => {
            if (viewState !== 'closed') return;
            const touch = e.touches[0];
            dragging.current = true;
            dragStart.current = { x: touch.clientX, y: touch.clientY };
            dragOrigin.current = { ...pos };
          }}
        >
          💬
        </button>
      </>
    );
  }

  return (
    <div ref={widgetRef} style={{
      position: 'fixed', bottom: 20, right: 20, width: CHAT_WIDTH,
      height: CHAT_HEIGHT, background: 'var(--paces-bg-elevated)',
      borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      border: '1px solid var(--paces-card-border)',
      zIndex: 9999, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', animation: 'fadeIn 0.2s ease',
    }}>
      {viewState === 'list' && (
        <ChatConversationList
          onSelectConversacion={seleccionarConversacion}
        />
      )}
      {viewState === 'chat' && (
        <ChatMessages
          onBack={volverALista}
        />
      )}
    </div>
  );
};

export default ChatWidget;
