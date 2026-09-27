import React, { useEffect, useState } from 'react';
import { Modal, Typography, Select, Input, Button, Space, Spin, Tag, message, Divider, Empty, Image } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { ticketApi } from '../api/ticketApi';
import type { TicketDTO, TicketAdjuntoDTO } from '../types/ticket';

const { TextArea } = Input;

const ESTADO_COLORS: Record<string, string> = {
  Abierto: 'blue',
  EnProceso: 'gold',
  Resuelto: 'green',
  Cerrado: 'default',
};

const ESTADOS_VALIDOS = ['Abierto', 'EnProceso', 'Resuelto', 'Cerrado'];

function formatFecha(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('es-DO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

interface Props {
  open: boolean;
  ticketID: number;
  onClose: () => void;
}

const TicketAdjunto: React.FC<{ adjunto: TicketAdjuntoDTO }> = ({ adjunto }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelado = false;

    ticketApi.descargarAdjunto(adjunto.id)
      .then((blob) => {
        if (cancelado) return;
        objectUrl = window.URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelado) setFallo(true);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [adjunto.id]);

  return (
    <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 8, background: '#fafafa' }}>
      {cargando ? (
        <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin size="small" />
        </div>
      ) : fallo || !url ? (
        <div style={{ padding: 8, fontSize: 12, color: '#888' }}>
          No se pudo cargar {adjunto.nombreArchivo}
        </div>
      ) : (
        <Image
          src={url}
          alt={adjunto.nombreArchivo}
          style={{ maxHeight: 240, objectFit: 'contain', objectPosition: 'top', width: '100%' }}
        />
      )}
      <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
        {adjunto.nombreArchivo} · {formatFecha(adjunto.fechaCreacion)}
      </div>
    </div>
  );
};

const TicketThreadModal: React.FC<Props> = ({ open, ticketID, onClose }) => {
  const sucursal = useAuthStore((s) => s.compania);
  const usuarioID = useAuthStore((s) => s.usuario?.id);

  const [ticket, setTicket] = useState<TicketDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [estadoEdit, setEstadoEdit] = useState<string>('');

  const cargarTicket = async () => {
    if (!sucursal) return;
    setLoading(true);
    try {
      const t = await ticketApi.obtener(sucursal, ticketID);
      setTicket(t);
      setEstadoEdit(t.estado);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && ticketID) cargarTicket();
  }, [open, ticketID]);

  const handleResponder = async () => {
    if (!sucursal || !usuarioID || !nuevoMensaje.trim()) return;
    setEnviando(true);
    try {
      await ticketApi.responder(sucursal, ticketID, {
        usuarioID,
        mensaje: nuevoMensaje.trim(),
      });
      setNuevoMensaje('');
      await cargarTicket();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al enviar respuesta');
    } finally {
      setEnviando(false);
    }
  };

  const handleCambiarEstado = async (estado: string) => {
    if (!sucursal) return;
    try {
      await ticketApi.cambiarEstado(sucursal, ticketID, { estado, usuarioID: usuarioID! });
      setEstadoEdit(estado);
      message.success(`Estado cambiado a: ${estado}`);
      await cargarTicket();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cambiar estado');
    }
  };

  return (
    <Modal
      title={ticket ? `${ticket.numero || `#${ticket.id}`} - ${ticket.titulo}` : 'Cargando...'}
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnHidden
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : ticket ? (
        <>
          {/* Header info */}
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Tag style={{ fontFamily: 'monospace', fontWeight: 600 }}>{ticket.numero || `#${ticket.id}`}</Tag>
            <Tag color={ESTADO_COLORS[ticket.estado] || 'default'}>{ticket.estado}</Tag>
            <Tag>{ticket.prioridad}</Tag>
            <span style={{ fontSize: 12, color: '#888' }}>{formatFecha(ticket.fechaCreacion)}</span>
            <span style={{ fontSize: 12, color: '#888' }}>
              {ticket.nombreUsuarioOrigen ? `Creado por: ${ticket.nombreUsuarioOrigen}` : ''}
            </span>
          </div>

          {/* Mensaje original */}
          <div style={{
            background: '#fafafa',
            borderRadius: 6,
            padding: '12px 16px',
            marginBottom: 16,
            border: '1px solid #f0f0f0',
          }}>
            <Typography.Text>{ticket.mensaje}</Typography.Text>
          </div>

          {ticket.adjuntos?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Typography.Text strong style={{ fontSize: 13 }}>
                Adjuntos ({ticket.adjuntos.length})
              </Typography.Text>
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                {ticket.adjuntos.map((a) => (
                  <TicketAdjunto key={a.id} adjunto={a} />
                ))}
              </Space>
            </div>
          )}

          <Divider style={{ margin: '12px 0' }}>Historial de respuestas</Divider>

          {/* Respuestas */}
          <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
            {ticket.respuestas.length === 0 ? (
              <Empty description="Sin respuestas aún" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                {ticket.respuestas.map((r) => (
                  <div key={r.id} style={{
                    background: '#fafafa',
                    borderRadius: 6,
                    padding: '10px 14px',
                    border: '1px solid #f0f0f0',
                  }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
                      {r.nombreUsuario || `Usuario #${r.usuarioID}`} · {formatFecha(r.fechaCreacion)}
                    </div>
                    <Typography.Text>{r.mensaje}</Typography.Text>
                  </div>
                ))}
              </Space>
            )}
          </div>

          {/* Cambiar estado */}
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Typography.Text strong style={{ fontSize: 13 }}>Estado:</Typography.Text>
            <Select
              value={estadoEdit}
              onChange={handleCambiarEstado}
              style={{ width: 150 }}
              options={ESTADOS_VALIDOS.map((e) => ({ label: e, value: e }))}
            />
          </div>

          {/* Responder */}
          {ticket.estado !== 'Cerrado' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <TextArea
                rows={2}
                value={nuevoMensaje}
                onChange={(e) => setNuevoMensaje(e.target.value)}
                placeholder="Escribe una respuesta..."
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleResponder}
                loading={enviando}
                disabled={!nuevoMensaje.trim()}
              />
            </div>
          )}
        </>
      ) : null}
    </Modal>
  );
};

export default TicketThreadModal;
