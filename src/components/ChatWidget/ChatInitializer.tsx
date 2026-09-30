import React, { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';

/**
 * Unica fuente de inicializacion del chat interno: conexion SignalR y carga de
 * conversaciones. Se monta en MainLayout y en SaasMainLayout para que /chat y
 * /saas/chat compartan exactamente la misma conexion y el mismo store.
 *
 * No montar dentro de ChatPage: el desmontaje de la pagina cortaria la
 * conexion y cada navegacion volveria a abrirla.
 */
const ChatInitializer: React.FC = () => {
  const usuarioID = useAuthStore((state) => state.usuario?.id);
  const conectarSignalR = useChatStore((state) => state.conectarSignalR);
  const desconectarSignalR = useChatStore((state) => state.desconectarSignalR);
  const cargarConversaciones = useChatStore(
    (state) => state.cargarConversaciones
  );

  useEffect(() => {
    if (!usuarioID) return;

    void conectarSignalR().then(() => cargarConversaciones());

    return () => {
      desconectarSignalR();
    };
  }, [usuarioID, conectarSignalR, desconectarSignalR, cargarConversaciones]);

  return null;
};

export default ChatInitializer;
