import React, { useCallback, useEffect, useState } from 'react';
import { Drawer, Button, Form, Input, Select, Tag, Typography, message, Spin, Tooltip } from 'antd';
import { SendOutlined, ReloadOutlined, DeleteOutlined, PictureOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { usuarioApi } from '../api/usuarioApi';
import { ticketApi } from '../api/ticketApi';
import type { CrearTicketRequest } from '../types/ticket';
import type { UsuarioDTO } from '../types/administracion';
import type { CapturaPantalla } from '../utils/capturaPantalla';

const { Text } = Typography;
const { TextArea } = Input;

interface Props {
  open: boolean;
  captura: CapturaPantalla | null;
  capturando: boolean;
  moduloActual?: string;
  onClose: () => void;
  onRecapturar: () => void;
  onQuitarCaptura: () => void;
  onCreado: () => void;
}

const IncidenciaDrawer: React.FC<Props> = ({
  open, captura, capturando, moduloActual, onClose, onRecapturar, onQuitarCaptura, onCreado,
}) => {
  const navigate = useNavigate();
  const sucursal = useAuthStore((s) => s.compania);
  const usuarioID = useAuthStore((s) => s.usuario?.id);

  const [form] = Form.useForm();
  const [usuarios, setUsuarios] = useState<UsuarioDTO[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!open || !sucursal) return;
    usuarioApi.obtenerListado(sucursal)
      .then(setUsuarios)
      .catch((err) => message.error(err?.response?.data?.errorMessage || 'Error al cargar usuarios'));
  }, [open, sucursal]);

  const handleClose = useCallback(() => {
    if (enviando) return;
    onClose();
  }, [enviando, onClose]);

  const handleVerTickets = useCallback(() => {
    onClose();
    navigate('/MTicket');
  }, [navigate, onClose]);

  const handleEnviar = useCallback(async () => {
    if (!sucursal || !usuarioID) {
      message.error('No hay una sucursal o usuario activo.');
      return;
    }
    try {
      const values = await form.validateFields();
      setEnviando(true);

      const request: CrearTicketRequest = {
        titulo: values.titulo,
        mensaje: values.mensaje,
        prioridad: values.prioridad || 'Normal',
        modulo: moduloActual || 'General',
        usuarioOrigenID: usuarioID,
        usuarioAsignadoID: values.usuarioAsignadoID || usuarioID,
      };

      const ticket = await ticketApi.crear(sucursal, request);

      if (captura) {
        const archivo = new File([captura.blob], captura.nombreArchivo, { type: captura.tipoMime });
        await ticketApi.subirAdjunto(sucursal, ticket.id, archivo);
      }

      message.success(`Ticket ${ticket.numero || ticket.id} creado correctamente`);
      form.resetFields();
      onCreado();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al crear la incidencia');
    } finally {
      setEnviando(false);
    }
  }, [sucursal, usuarioID, form, captura, moduloActual, onCreado]);

  return (
    <Drawer
      title="Reportar incidencia"
      placement="right"
      open={open}
      onClose={handleClose}
      width={460}
      closable={!enviando}
      maskClosable={!enviando}
      keyboard={!enviando}
      destroyOnHidden
      footer={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button type="link" size="small" onClick={handleVerTickets} disabled={enviando}>
            Ver todos los tickets
          </Button>
          <div style={{ flex: 1 }} />
          <Button onClick={handleClose} disabled={enviando}>Cancelar</Button>
          <Button type="primary" icon={<SendOutlined />} loading={enviando} onClick={handleEnviar}>
            Enviar ticket
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" size="small" disabled={enviando} initialValues={{ prioridad: 'Normal' }}>
        <Form.Item label="Módulo">
          <Tag color="blue" style={{ marginInlineEnd: 0 }}>{moduloActual || 'General'}</Tag>
        </Form.Item>

        <Form.Item name="titulo" label="Título" rules={[{ required: true, message: 'Obligatorio' }]}>
          <Input placeholder="Resumen de la incidencia" maxLength={200} />
        </Form.Item>

        <Form.Item name="mensaje" label="Descripción" rules={[{ required: true, message: 'Obligatorio' }]}>
          <TextArea rows={4} placeholder="Describe qué ocurrió, qué esperabas y cómo reproducirlo..." />
        </Form.Item>

        <Form.Item name="prioridad" label="Prioridad">
          <Select
            options={[
              { label: 'Baja', value: 'Baja' },
              { label: 'Normal', value: 'Normal' },
              { label: 'Alta', value: 'Alta' },
            ]}
          />
        </Form.Item>

        <Form.Item name="usuarioAsignadoID" label="Asignar a" initialValue={usuarioID}>
          <Select
            showSearch
            placeholder="Buscar usuario..."
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={usuarios
              .filter((u) => u.activo)
              .map((u) => ({ label: `${u.nombre} (${u.nombreUsuario})`, value: u.id }))}
          />
        </Form.Item>

        <Form.Item label="Captura de pantalla">
          <div
            style={{
              border: '1px dashed var(--paces-border)',
              borderRadius: 8,
              padding: 8,
              background: 'var(--paces-bg-elevated)',
            }}
          >
            {capturando ? (
              <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Spin size="small" />
                <Text type="secondary" style={{ fontSize: 12 }}>Capturando la pantalla...</Text>
              </div>
            ) : captura ? (
              <>
                <img
                  src={captura.dataUrl}
                  alt="Captura de pantalla"
                  style={{
                    width: '100%',
                    maxHeight: 200,
                    objectFit: 'contain',
                    objectPosition: 'top',
                    borderRadius: 4,
                    display: 'block',
                    background: '#fff',
                  }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                  <Tooltip title="Volver a capturar">
                    <Button size="small" icon={<ReloadOutlined />} onClick={onRecapturar} disabled={enviando}>
                      Recapturar
                    </Button>
                  </Tooltip>
                  <Tooltip title="Quitar captura">
                    <Button size="small" icon={<DeleteOutlined />} onClick={onQuitarCaptura} disabled={enviando} />
                  </Tooltip>
                </div>
              </>
            ) : (
              <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <PictureOutlined style={{ fontSize: 24, color: 'var(--paces-text-secondary)' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>Sin captura</Text>
                <Button size="small" icon={<PictureOutlined />} onClick={onRecapturar} disabled={enviando}>
                  Capturar pantalla
                </Button>
              </div>
            )}
          </div>
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default IncidenciaDrawer;
