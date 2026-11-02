import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Switch, message } from 'antd';
import { Select } from '../../components/Select';
import { puntoVentaApi } from '../../api/puntoVentaApi';
import type { MetodoPagoDTO, DocumentoTipoDTO } from '../../types/facturacion';
import { useAuthStore } from '../../stores/authStore';
import { toTitleCase } from '../../utils/formats';

interface MetodoPagoFormularioProps {
  visible: boolean;
  editItem: MetodoPagoDTO | null;
  onClose: () => void;
  onSaved: () => void;
}

const MetodoPagoFormulario: React.FC<MetodoPagoFormularioProps> = ({
  visible,
  editItem,
  onClose,
  onSaved,
}) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [documentos, setDocumentos] = useState<DocumentoTipoDTO[]>([]);

  useEffect(() => {
    if (!visible) return;
    if (editItem) {
      form.setFieldsValue({
        ...editItem,
        documento: editItem.codigoDocumento || undefined,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ requiereDocumento: false });
    }
  }, [visible, editItem, form]);

  useEffect(() => {
    if (!visible) return;
    puntoVentaApi
      .obtenerDocumentos(sucursalActiva)
      .then((items) => setDocumentos(items ?? []))
      .catch((err: any) => {
        message.error(err?.response?.data?.errorMessage || 'Error al cargar documentos');
      });
  }, [visible, sucursalActiva]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload: MetodoPagoDTO = {
        id: editItem?.id || 0,
        nombre: values.nombre,
        codigo: values.codigo,
        requiereDocumento: values.requiereDocumento ?? false,
        codigoDocumento: values.documento || '',
      };
      if (editItem) {
        await puntoVentaApi.actualizarMetodoPago(sucursalActiva, payload);
        message.success('Método de pago actualizado correctamente');
      } else {
        await puntoVentaApi.crearMetodoPago(sucursalActiva, payload);
        message.success('Método de pago creado correctamente');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar método de pago');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editItem ? 'Editar Método de Pago' : 'Crear Método de Pago'}
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
          name="nombre"
          label="Nombre"
          rules={[{ required: true, message: 'El nombre es obligatorio' }]}
        >
          <Input placeholder="Ej. Efectivo" maxLength={100} />
        </Form.Item>
        <Form.Item
          name="codigo"
          label="Código"
          rules={[{ required: true, message: 'El código es obligatorio' }]}
        >
          <Input placeholder="Ej. EF" maxLength={50} />
        </Form.Item>
        <Form.Item name="requiereDocumento" label="Requiere Documento" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="documento" label="Documento">
          <Select placeholder="Seleccione documento" allowClear showSearch optionFilterProp="label">
            {documentos.map((d) => {
              const etiqueta = `${d.codigo} — ${toTitleCase(d.descripcion)}`;
              return (
                <Select.Option key={d.codigo} value={d.codigo} label={etiqueta}>
                  {etiqueta}
                </Select.Option>
              );
            })}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default MetodoPagoFormulario;
