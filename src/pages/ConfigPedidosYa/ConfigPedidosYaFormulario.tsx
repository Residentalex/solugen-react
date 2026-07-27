import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, message } from 'antd';
import { configPedidosYaApi } from '../../api/configPedidosYaApi';
import type { ConfigPedidosYaDTO } from '../../types/configPedidosYa';
import { useAuthStore } from '../../stores/authStore';

interface ConfigPedidosYaFormularioProps {
  visible: boolean;
  editItem: ConfigPedidosYaDTO | null;
  onClose: () => void;
  onSaved: () => void;
}

const ConfigPedidosYaFormulario: React.FC<ConfigPedidosYaFormularioProps> = ({
  visible,
  editItem,
  onClose,
  onSaved,
}) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editItem) {
        form.setFieldsValue(editItem);
      } else {
        form.resetFields();
        form.setFieldsValue({ puerto: 22, margenBeneficio: 15 });
      }
    }
  }, [visible, editItem, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload: Partial<ConfigPedidosYaDTO> = {
        servidor: values.servidor,
        puerto: values.puerto,
        usuario: values.usuario,
        contrasena: values.contrasena || undefined,
        archivoClave: values.archivoClave || undefined,
        margenBeneficio: values.margenBeneficio,
        rutaRemota: values.rutaRemota || undefined,
        prefijoArchivo: values.prefijoArchivo || undefined,
        vendorID: values.vendorID || undefined,
      };
      await configPedidosYaApi.guardar(sucursalActiva, payload);
      message.success(editItem
        ? 'Configuración de PedidosYa actualizada correctamente'
        : 'Configuración de PedidosYa creada correctamente');
      onSaved();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar configuración de PedidosYa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editItem ? 'Editar Configuración PedidosYa' : 'Crear Configuración PedidosYa'}
      open={visible}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={saving}
      width={640}
      okText="Guardar"
      cancelText="Cancelar"
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="servidor"
          label="Servidor"
          rules={[{ required: true, message: 'El servidor es obligatorio' }]}
        >
          <Input placeholder="vendor-automation-sftp-live-us.prod.aws.qcommerce.live" />
        </Form.Item>

        <Form.Item
          name="puerto"
          label="Puerto"
          rules={[{ required: true, message: 'El puerto es obligatorio' }]}
        >
          <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="22" />
        </Form.Item>

        <Form.Item
          name="usuario"
          label="Usuario"
          rules={[{ required: true, message: 'El usuario es obligatorio' }]}
        >
          <Input placeholder="usuario SFTP" />
        </Form.Item>

        <Form.Item
          name="contrasena"
          label="Contraseña"
        >
          <Input.Password placeholder="Contraseña SFTP (opcional)" />
        </Form.Item>

        <Form.Item
          name="archivoClave"
          label="Archivo Clave"
        >
          <Input placeholder="Ruta del archivo clave (opcional)" />
        </Form.Item>

        <Form.Item
          name="margenBeneficio"
          label="Margen Beneficio (%)"
          rules={[{ required: true, message: 'El margen de beneficio es obligatorio' }]}
        >
          <InputNumber min={0} max={100} step={0.01} precision={2} style={{ width: '100%' }} placeholder="15" />
        </Form.Item>

        <Form.Item
          name="rutaRemota"
          label="Ruta Remota"
        >
          <Input placeholder="Assortment/miChain_123.csv (opcional)" />
        </Form.Item>

        <Form.Item
          name="prefijoArchivo"
          label="Prefijo Archivo"
        >
          <Input placeholder="miChain (opcional)" />
        </Form.Item>

        <Form.Item
          name="vendorID"
          label="Vendor ID"
        >
          <Input placeholder="ID del vendedor (opcional)" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ConfigPedidosYaFormulario;
