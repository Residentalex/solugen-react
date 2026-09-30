import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Empty } from 'antd';
import ChatConversationList from '../../components/ChatWidget/ChatConversationList';
import ChatMessages from '../../components/ChatWidget/ChatMessages';
import { useChatStore } from '../../stores/chatStore';
import './ChatPage.css';

const ChatPage: React.FC = () => {
  const conversacionActiva = useChatStore(
    (state) => state.conversacionActiva
  );

  const seleccionarConversacion = useChatStore(
    (state) => state.seleccionarConversacion
  );

  const { pathname } = useLocation();
  const esSaas = pathname.startsWith('/saas');

  const [mostrarListaMovil, setMostrarListaMovil] = useState(true);

  // Al salir de la pagina el widget flotante debe reaparecer mostrando la
  // conversacion que se estaba viendo, no cerrarse.
  useEffect(() => {
    return () => {
      useChatStore.getState().volverAlWidget();
    };
  }, []);

  const handleSeleccionarConversacion = async (id: number) => {
    await seleccionarConversacion(id);
    setMostrarListaMovil(false);
  };

  return (
    <div
      className={`chat-page ${esSaas ? 'chat-page--saas' : ''} ${
        mostrarListaMovil ? 'chat-page--lista' : 'chat-page--conversacion'
      }`}
    >
      <aside className="chat-page__lista">
        <ChatConversationList
          onSelectConversacion={handleSeleccionarConversacion}
          modoPagina
        />
      </aside>

      <section className="chat-page__contenido">
        {conversacionActiva ? (
          <ChatMessages
            onBack={() => setMostrarListaMovil(true)}
            modoPagina
          />
        ) : (
          <Empty description="Selecciona una conversación" />
        )}
      </section>
    </div>
  );
};

export default ChatPage;
