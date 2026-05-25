import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, Input, message } from 'antd';
import { notificacionesApi } from '../../api/notificacionesApi';
import { useAuthStore } from '../../stores/authStore';

interface EnviarNotificacionModalProps {
  visible: boolean;
  onClose: () => void;
  onEnviado: () => void;
}

interface UsuarioSimple {
  id: number;
  nombre: string;
  nombreUsuario: string;
}

const EnviarNotificacionModal: React.FC<EnviarNotificacionModalProps> = ({ visible, onClose, onEnviado }) => {
  const [form] = Form.useForm();
  const [usuarios, setUsuarios] = useState<UsuarioSimple[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const sucursal = useAuthStore((s) => s.compania);
  const usuarioActual = useAuthStore((s) => s.usuario);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      cargarUsuarios();
    }
  }, [visible]);

  const cargarUsuarios = async () => {
    setCargandoUsuarios(true);
    try {
      const data = await notificacionesApi.obtenerUsuarios();
      setUsuarios(data || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar usuarios');
    } finally {
      setCargandoUsuarios(false);
    }
  };

  const handleEnviar = async () => {
    try {
      const values = await form.validateFields();
      if (!usuarioActual?.id) {
        message.error('No se pudo identificar el usuario actual');
        return;
      }
      setGuardando(true);
      await notificacionesApi.enviar(sucursal, {
        deUsuarioID: usuarioActual.id,
        paraUsuarioID: values.paraUsuarioID,
        titulo: values.titulo,
        mensaje: values.mensaje,
      });
      message.success('Notificación enviada correctamente');
      form.resetFields();
      onEnviado();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al enviar notificación');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      title="Enviar Notificación"
      open={visible}
      onCancel={onClose}
      onOk={handleEnviar}
      confirmLoading={guardando}
      okText="Enviar"
      cancelText="Cancelar"
      width={520}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="paraUsuarioID"
          label="Destinatario"
          rules={[{ required: true, message: 'Seleccione un destinatario' }]}
        >
          <Select
            showSearch
            placeholder="Buscar usuario..."
            loading={cargandoUsuarios}
            filterOption={(input, option) =>
              (option?.label || '').toLowerCase().includes(input.toLowerCase())
            }
            options={usuarios.map((u) => ({
              value: u.id,
              label: `${u.nombre} (${u.nombreUsuario})`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="titulo"
          label="Título"
          rules={[{ required: true, message: 'El título es obligatorio' }]}
        >
          <Input placeholder="Título de la notificación" maxLength={200} />
        </Form.Item>

        <Form.Item
          name="mensaje"
          label="Mensaje"
          rules={[{ required: true, message: 'El mensaje es obligatorio' }]}
        >
          <Input.TextArea
            placeholder="Escriba el mensaje..."
            rows={4}
            maxLength={500}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EnviarNotificacionModal;
