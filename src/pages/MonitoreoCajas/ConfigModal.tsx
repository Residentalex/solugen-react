import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Button, Space, message } from 'antd';
import { monitoreoApi } from '../../api/monitoreoApi';
import type { MonitoreoCajaDTO, ConfigurarCajaRequest } from '../../types/monitoreo';

interface ConfigModalProps {
  caja: MonitoreoCajaDTO | null;
  open: boolean;
  onClose: () => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ caja, open, onClose }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (open && caja) {
      form.setFieldsValue({
        ip: caja.ip,
        noCaja: caja.noCaja,
        version: caja.version,
        delayTime: parseInt(caja.delayTime, 10) || 0,
        serverConnection: caja.connectionStrings.serverConnection,
        clientConnection: caja.connectionStrings.clientConnection,
        rncConnection: caja.connectionStrings.rncConnection,
        rncClienteConnection: caja.connectionStrings.rncClienteConnection,
      });
    }
  }, [open, caja, form]);

  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      if (!caja) return;

      setLoading(true);
      const config: ConfigurarCajaRequest = {
        noCaja: values.noCaja,
        version: values.version,
        delayTime: String(values.delayTime),
        connectionStrings: {
          serverConnection: values.serverConnection,
          clientConnection: values.clientConnection,
          rncConnection: values.rncConnection,
          rncClienteConnection: values.rncClienteConnection,
        },
      };

      await monitoreoApi.configurar(caja.ip, config);
      message.success('Configuración guardada correctamente');
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return; // Error de validación del form
      message.error(err?.response?.data?.errorMessage || 'Error al guardar configuración');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Configurar - ${caja?.nombre || ''}`}
      open={open}
      onCancel={onClose}
      width={600}
      footer={
        <Space>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="primary" loading={loading} onClick={handleGuardar}>
            Guardar
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" size="small" style={{ marginTop: 16 }}>
        <Form.Item label="IP" name="ip">
          <Input disabled />
        </Form.Item>

        <Form.Item
          label="No. Caja"
          name="noCaja"
          rules={[{ required: true, message: 'Ingrese el número de caja' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Versión"
          name="version"
          rules={[{ required: true, message: 'Ingrese la versión' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="DelayTime"
          name="delayTime"
          rules={[{ required: true, message: 'Ingrese el delay time' }]}
        >
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>

        <Form.Item
          label="ServerConnection"
          name="serverConnection"
          rules={[{ required: true, message: 'Ingrese la conexión del servidor' }]}
        >
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item
          label="ClientConnection"
          name="clientConnection"
          rules={[{ required: true, message: 'Ingrese la conexión del cliente' }]}
        >
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item
          label="RNCConnection"
          name="rncConnection"
          rules={[{ required: true, message: 'Ingrese la conexión RNC' }]}
        >
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item
          label="RNCClienteConnection"
          name="rncClienteConnection"
          rules={[{ required: true, message: 'Ingrese la conexión RNC Cliente' }]}
        >
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ConfigModal;
