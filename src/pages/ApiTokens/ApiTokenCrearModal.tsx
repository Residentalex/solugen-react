import React, { useState, useCallback } from 'react';
import { Modal, Form, Input, Button, Typography, message, Alert } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { apiTokenApi, type AuthApiTokenResponseDTO } from '../../api/apiTokenApi';

const { Text } = Typography;

interface ApiTokenCrearModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type ModalState = 'form' | 'created';

const ApiTokenCrearModal: React.FC<ApiTokenCrearModalProps> = ({ open, onClose, onCreated }) => {
  const usuario = useAuthStore((s) => s.usuario);
  const [form] = Form.useForm();
  const [modalState, setModalState] = useState<ModalState>('form');
  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<AuthApiTokenResponseDTO | null>(null);
  const [copied, setCopied] = useState(false);
  const [closingConfirmed, setClosingConfirmed] = useState(false);

  const handleClose = useCallback(() => {
    if (modalState === 'created' && !copied && !closingConfirmed) {
      Modal.confirm({
        title: 'Â¿Copiaste el token?',
        content: 'El token solo se muestra una vez. Si no lo copiaste, tendrÃ¡s que generar uno nuevo.',
        okText: 'SÃ­, cerrar',
        cancelText: 'Cancelar',
        onOk: () => {
          setClosingConfirmed(true);
          setModalState('form');
          setCreatedToken(null);
          setCopied(false);
          form.resetFields();
          onClose();
        },
      });
      return;
    }
    setModalState('form');
    setCreatedToken(null);
    setCopied(false);
    setClosingConfirmed(false);
    form.resetFields();
    onClose();
  }, [modalState, copied, closingConfirmed, form, onClose]);

  const copiarAlPortapapeles = useCallback(async (texto: string) => {
    // Intentar con Clipboard API moderna
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(texto);
        return true;
      } catch {
        // fallback
      }
    }
    // Fallback: textarea oculto + execCommand
    try {
      const textarea = document.createElement('textarea');
      textarea.value = texto;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (!createdToken?.token) return;
    const exito = await copiarAlPortapapeles(createdToken.token);
    if (exito) {
      setCopied(true);
      message.success('Token copiado al portapapeles');
    } else {
      message.error('No se pudo copiar el token');
    }
  }, [createdToken, copiarAlPortapapeles]);

  const handleGenerate = useCallback(async () => {
    if (!usuario) return;
    try {
      const values = await form.validateFields();
      setCreating(true);
      const result = await apiTokenApi.crear({
        usuarioID: usuario.id,
        nombre: values.nombre,
      });
      setCreatedToken(result);
      setModalState('created');
      onCreated();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al generar token');
    } finally {
      setCreating(false);
    }
  }, [usuario, form, onCreated]);

  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      setModalState('form');
      setCreatedToken(null);
      setCopied(false);
      setClosingConfirmed(false);
      form.resetFields();
    }
  }, [open, form]);

  return (
    <Modal
      title="Nuevo Token API"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={560}
      destroyOnHidden
      closable={modalState !== 'created' || copied}
      mask={{ closable: modalState !== 'created' }}
    >
      {modalState === 'form' && (
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="nombre"
            label="Nombre del token"
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
          >
            <Input placeholder="Ej. IntegraciÃ³n POS" maxLength={100} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button type="primary" loading={creating} onClick={handleGenerate}>
              Generar token
            </Button>
          </div>
        </Form>
      )}

      {modalState === 'created' && createdToken && (
        <div style={{ marginTop: 16 }}>
          <Alert
            type="warning"
            showIcon
            message="Guarda este token. No podrÃ¡s verlo de nuevo."
            style={{ marginBottom: 16 }}
          />

          <div style={{ marginBottom: 8 }}>
            <Text strong>Token generado:</Text>
          </div>
          <Input.TextArea
            value={createdToken.token}
            readOnly
            rows={3}
            style={{ fontFamily: 'monospace', fontSize: 13, marginBottom: 16 }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
            <Button
              type="primary"
              icon={copied ? <CheckOutlined /> : <CopyOutlined />}
              onClick={handleCopy}
            >
              {copied ? 'Copiado' : 'Copiar token'}
            </Button>
            <Button onClick={handleClose}>Cerrar</Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ApiTokenCrearModal;
