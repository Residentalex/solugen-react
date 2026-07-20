import React, { useRef, useEffect, useState } from 'react';
import { message, Modal } from 'antd';
import { LoadingOutlined, FileOutlined, FilePdfOutlined, FileExcelOutlined, FileImageOutlined, FileWordOutlined, DownloadOutlined, CloseOutlined } from '@ant-design/icons';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { chatApi } from '../../api/chatApi';
import type { ChatAdjuntoDTO } from '../../types/chat';

interface ChatMessagesProps {
  onBack: () => void;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ onBack }) => {
  const conversacionActiva = useChatStore((s) => s.conversacionActiva);
  const mensajes = useChatStore((s) => s.mensajes);
  const enviarMensaje = useChatStore((s) => s.enviarMensaje);
  const respondiendoA = useChatStore((s) => s.respondiendoA);
  const responderAMensaje = useChatStore((s) => s.responderAMensaje);
  const cancelarRespuesta = useChatStore((s) => s.cancelarRespuesta);
  const subirAdjunto = useChatStore((s) => s.subirAdjunto);
  const subiendoAdjunto = useChatStore((s) => s.subiendoAdjunto);
  const conversaciones = useChatStore((s) => s.conversaciones);
  const cargando = useChatStore((s) => s.cargando);
  const conectado = useChatStore((s) => s.conectado);
  const usuarioID = useAuthStore((s) => s.usuario?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; nombre: string; id: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [texto, setTexto] = React.useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    const loadImages = async () => {
      const urls: Record<number, string> = {};
      for (const m of mensajesActuales) {
        if (!m.adjuntos) continue;
        for (const adj of m.adjuntos) {
          const ext = adj.nombreArchivo.split('.').pop()?.toLowerCase();
          const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
          if (!isImage) continue;
          if (imageUrls[adj.id]) continue;
          try {
            const blob = await chatApi.descargarAdjunto(adj.id);
            urls[adj.id] = URL.createObjectURL(blob);
          } catch {
            // si falla la descarga, no mostramos preview
          }
        }
      }
      if (Object.keys(urls).length > 0) {
        setImageUrls(prev => ({ ...prev, ...urls }));
      }
    };
    loadImages();
  }, [mensajesActuales]);

  useEffect(() => {
    return () => {
      Object.values(imageUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

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

  const handleAdjuntarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversacionActiva) return;

    if (file.size > 20 * 1024 * 1024) {
      message.error('El archivo no puede superar los 20MB');
      e.target.value = '';
      return;
    }

    subirAdjunto(conversacionActiva, file);
    e.target.value = '';
  };

  const handleDescargar = async (adjunto: ChatAdjuntoDTO) => {
    try {
      const blob = await chatApi.descargarAdjunto(adjunto.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = adjunto.nombreArchivo;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al descargar el archivo');
    }
  };

  const getIconoArchivo = (nombre: string) => {
    const ext = nombre.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />;
      case 'xls': case 'xlsx': return <FileExcelOutlined style={{ color: '#52c41a', fontSize: 20 }} />;
      case 'doc': case 'docx': return <FileWordOutlined style={{ color: '#1890ff', fontSize: 20 }} />;
      case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': return <FileImageOutlined style={{ color: '#faad14', fontSize: 20 }} />;
      default: return <FileOutlined style={{ color: '#8c8c8c', fontSize: 20 }} />;
    }
  };

  const esImagen = (nombre: string) => {
    const ext = nombre.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
  };

  const formatTamano = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleEnviar = () => {
    if (!texto.trim()) return;
    enviarMensaje(texto, respondiendoA?.id);
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
          const mensajePadre = m.mensajePadreID ? mensajesActuales.find(p => p.id === m.mensajePadreID) : null;
          const tieneRespuestas = mensajesActuales.some(msg => msg.mensajePadreID === m.id);
          const cantRespuestas = mensajesActuales.filter(msg => msg.mensajePadreID === m.id).length;
          return (
            <div id={`msg-${m.id}`} key={m.id} style={{ alignSelf: esPropio ? 'flex-end' : 'flex-start', maxWidth: '80%' }}
              onMouseEnter={() => setHoveredMessageId(m.id)}
              onMouseLeave={() => setHoveredMessageId(null)}>
              {!esPropio && <div style={{ fontSize: 11, color: 'var(--paces-text-secondary)', marginBottom: 2, paddingLeft: 4 }}>{m.remitenteNombre}</div>}
              {respondiendoA?.id === m.id && (
                <div style={{ fontSize: 10, color: '#556ee6', marginBottom: 2, fontWeight: 600, paddingLeft: 4 }}>↩ Respondiendo...</div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: esPropio ? 'row-reverse' : 'row' }}>
                {hoveredMessageId === m.id && (
                  <span onClick={() => responderAMensaje({ id: m.id, contenido: m.contenido, remitente: m.remitenteNombre })}
                    style={{
                      cursor: 'pointer', fontSize: 14, lineHeight: 1, flexShrink: 0,
                      color: '#556ee6',
                      background: 'var(--paces-bg-elevated)',
                      borderRadius: 6, padding: '4px 7px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      marginBottom: 2,
                    }}
                    title="Responder">↩</span>
                )}
                <div style={{
                  background: esPropio ? '#556ee6' : 'var(--paces-bg-container)',
                color: esPropio ? '#fff' : 'var(--paces-text)',
                padding: '8px 12px', borderRadius: 12,
                borderBottomRightRadius: esPropio ? 4 : 12,
                borderBottomLeftRadius: esPropio ? 12 : 4,
                fontSize: 13, lineHeight: 1.4, wordBreak: 'break-word',
                boxShadow: hoveredMessageId === m.id ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 2px rgba(0,0,0,0.08)',
                transition: 'box-shadow 0.2s',
                outline: respondiendoA?.id === m.id ? `3px solid ${esPropio ? '#fff' : '#556ee6'}` : 'none',
                outlineOffset: 3,
              }}>
              {m.mensajePadreID && (
                <div style={{ marginBottom: 6, padding: '6px 8px',
                  borderLeft: `3px solid ${esPropio ? 'rgba(255,255,255,0.5)' : '#556ee6'}`,
                  borderRadius: 4,
                  background: esPropio ? 'rgba(255,255,255,0.1)' : 'rgba(85,110,230,0.06)',
                  fontSize: 12, lineHeight: 1.3,
                }}>
                  <div style={{ fontWeight: 600, fontSize: 11, color: esPropio ? 'rgba(255,255,255,0.8)' : '#556ee6', marginBottom: 2 }}>
                    {mensajePadre?.remitenteNombre || m.mensajePadreRemitente || 'Mensaje anterior'}
                  </div>
                  <div style={{ color: esPropio ? 'rgba(255,255,255,0.7)' : 'var(--paces-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 250 }}>
                    {mensajePadre?.contenido || m.mensajePadreContenido || '(contenido no disponible)'}
                  </div>
                </div>
              )}
              {m.contenido && m.contenido.length > 0 && <div>{m.contenido}</div>}
              {(!m.contenido || m.contenido.length === 0) && m.mensajePadreID && <div>📎 Archivo adjunto</div>}
                {m.adjuntos && m.adjuntos.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {m.adjuntos.map((adj) => {
                      const esImagenAdj = esImagen(adj.nombreArchivo);
                      if (esImagenAdj && imageUrls[adj.id]) {
                        return (
                          <div key={adj.id} onClick={() => setPreviewImage({ url: imageUrls[adj.id], nombre: adj.nombreArchivo, id: adj.id })}
                            style={{
                              cursor: 'pointer', borderRadius: 8, overflow: 'hidden',
                              maxWidth: 200, border: '1px solid var(--paces-card-border)',
                            }}>
                            <img src={imageUrls[adj.id]} alt={adj.nombreArchivo}
                              style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                            <div style={{
                              padding: '4px 8px', fontSize: 11,
                              background: esPropio ? 'rgba(255,255,255,0.1)' : 'var(--paces-bg-layout)',
                              color: esPropio ? 'rgba(255,255,255,0.8)' : 'var(--paces-text-secondary)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {adj.nombreArchivo}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={adj.id} onClick={() => handleDescargar(adj)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                            background: esPropio ? 'rgba(255,255,255,0.15)' : 'var(--paces-bg-layout)',
                            borderRadius: 6, cursor: 'pointer', transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = esPropio ? 'rgba(255,255,255,0.25)' : 'var(--paces-bg-elevated)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = esPropio ? 'rgba(255,255,255,0.15)' : 'var(--paces-bg-layout)')}
                          title="Descargar"
                        >
                          {getIconoArchivo(adj.nombreArchivo)}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 12, fontWeight: 500,
                              color: esPropio ? '#fff' : 'var(--paces-text)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {adj.nombreArchivo}
                            </div>
                            {adj.tamano && (
                              <div style={{ fontSize: 10, color: esPropio ? 'rgba(255,255,255,0.7)' : 'var(--paces-text-secondary)' }}>
                                {formatTamano(adj.tamano)}
                              </div>
                            )}
                          </div>
                          <DownloadOutlined style={{ color: esPropio ? 'rgba(255,255,255,0.7)' : 'var(--paces-text-secondary)', fontSize: 14 }} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--paces-text-secondary)', textAlign: esPropio ? 'right' : 'left', padding: '2px 4px 0' }}>
                {formatFecha(m.fechaEnvio)}
              </div>
              {tieneRespuestas && (
                <div style={{ fontSize: 10, color: '#556ee6', marginTop: 1, paddingLeft: 4, fontWeight: 500, cursor: 'pointer' }}
                  onClick={() => {
                    const replyMsg = mensajesActuales.find(msg => msg.mensajePadreID === m.id);
                    if (replyMsg) setTimeout(() => document.getElementById(`msg-${replyMsg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
                  }}
                  title="Ver respuesta">
                  ↩ {cantRespuestas} {cantRespuestas === 1 ? 'respuesta' : 'respuestas'}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div style={{
        padding: '8px 12px', borderTop: '1px solid var(--paces-card-border)',
        background: 'var(--paces-bg-container)', borderRadius: '0 0 12px 12px',
      }}>
        {subiendoAdjunto && (
          <div style={{ padding: '4px 0', fontSize: 12, color: 'var(--paces-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <LoadingOutlined /> Subiendo archivo...
          </div>
        )}
        {respondiendoA && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', marginBottom: 4,
            background: 'rgba(85,110,230,0.06)', borderRadius: 8,
            fontSize: 12, color: 'var(--paces-text-secondary)',
          }}>
            <span style={{ color: '#556ee6', fontSize: 14 }}>↩</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 600, color: '#556ee6' }}>{respondiendoA.remitente}</span>
              <span style={{ marginLeft: 4 }}>{respondiendoA.contenido.length > 60 ? respondiendoA.contenido.substring(0, 60) + '...' : respondiendoA.contenido}</span>
            </div>
            <CloseOutlined onClick={cancelarRespuesta}
              style={{ cursor: 'pointer', color: 'var(--paces-text-secondary)', fontSize: 12 }} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <button onClick={handleAdjuntarClick}
            style={{
              background: 'none', border: '1px solid var(--paces-card-border)', borderRadius: 8,
              padding: '6px 10px', cursor: 'pointer', color: 'var(--paces-text-secondary)',
              fontSize: 16, lineHeight: 1,
            }}
            title="Adjuntar archivo"
          >
            📎
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect}
            style={{ display: 'none' }} />
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
      <Modal
        title={null}
        open={previewImage !== null}
        onCancel={() => setPreviewImage(null)}
        footer={null}
        width="auto"
        centered
        styles={{ body: { padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', maxHeight: '85vh' } }}
        closeIcon={
          <div style={{
            position: 'fixed', top: 16, right: 16, zIndex: 1050,
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 18, border: 'none',
          }}>
            ✕
          </div>
        }
      >
        {previewImage && (
          <div style={{ position: 'relative', textAlign: 'center', maxWidth: '90vw' }}>
            <img src={previewImage.url} alt={previewImage.nombre}
              style={{
                maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain',
                display: 'block', borderRadius: 8,
              }} />
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px', background: 'rgba(0,0,0,0.6)',
              borderRadius: '0 0 8px 8px', marginTop: -4,
            }}>
              <span style={{ color: '#fff', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                {previewImage.nombre}
              </span>
              <button onClick={() => {
                const adj = mensajesActuales.flatMap(m => m.adjuntos || []).find(a => a.id === previewImage.id);
                if (adj) handleDescargar(adj);
              }}
                style={{
                  background: '#556ee6', border: 'none', borderRadius: 6, padding: '6px 14px',
                  color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                <DownloadOutlined /> Descargar
              </button>
            </div>
          </div>
        )}
      </Modal>
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
