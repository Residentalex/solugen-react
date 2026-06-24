import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch, message } from 'antd';
import { denominacionApi } from '../../api/denominacionApi';
import type { DenominacionDTO } from '../../types/denominacion';
import { useAuthStore } from '../../stores/authStore';

interface DenominacionFormularioProps {
  visible: boolean;
  editItem: DenominacionDTO | null;
  onClose: () => void;
  onSaved: () => void;
}

const DenominacionFormulario: React.FC<DenominacionFormularioProps> = ({
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
        form.setFieldsValue({ activo: true, orden: 0 });
      }
    }
  }, [visible, editItem, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload: DenominacionDTO = {
        id: editItem?.id || 0,
        descripcion: values.descripcion,
        valor: values.valor,
        tipo: values.tipo,
        activo: values.activo,
        orden: values.orden,
      };
      if (editItem) {
        await denominacionApi.actualizar(sucursalActiva, payload);
        message.success('Denominación actualizada correctamente');
      } else {
        await denominacionApi.crear(sucursalActiva, payload);
        message.success('Denominación creada correctamente');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar denominación');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editItem ? 'Editar Denominación' : 'Crear Denominación'}
      open={visible}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={saving}
      width={520}
      okText="Guardar"
      cancelText="Cancelar"
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="descripcion"
          label="Descripción"
          rules={[{ required: true, message: 'La descripción es obligatoria' }]}
        >
          <Input placeholder="Ej. Billete 2000" maxLength={100} />
        </Form.Item>
        <Form.Item
          name="valor"
          label="Valor"
          rules={[{ required: true, message: 'El valor es obligatorio' }]}
        >
          <InputNumber
            min={0.01}
            step={0.01}
            precision={2}
            style={{ width: '100%' }}
            prefix="$"
            placeholder="0.00"
          />
        </Form.Item>
        <Form.Item
          name="tipo"
          label="Tipo"
          rules={[{ required: true, message: 'El tipo es obligatorio' }]}
        >
          <Select placeholder="Seleccione tipo">
            <Select.Option value="B">Billete</Select.Option>
            <Select.Option value="M">Moneda</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="activo" label="Activo" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item
          name="orden"
          label="Orden"
          rules={[{ required: true, message: 'El orden es obligatorio' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DenominacionFormulario;
