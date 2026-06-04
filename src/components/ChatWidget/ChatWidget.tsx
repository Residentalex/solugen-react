import React, { useEffect, useRef } from 'react';
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

  if (viewState === 'closed') {
    return (
      <>
        {noLeidos > 0 && (
          <div style={{
            position: 'fixed', bottom: 68, right: 20,
            background: '#ff4d4f', color: '#fff', borderRadius: 10,
            padding: '1px 6px', fontSize: 11, fontWeight: 600,
            zIndex: 9999, minWidth: 18, textAlign: 'center',
          }}>
            {noLeidos}
          </div>
        )}
        <button onClick={abrir} title="Chat"
          style={{
            position: 'fixed', bottom: 20, right: 20, width: 48, height: 48,
            borderRadius: '50%', background: '#556ee6', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', boxShadow: '0 4px 12px rgba(85,110,230,0.4)',
            zIndex: 9999, color: '#fff', fontSize: 22, transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
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
