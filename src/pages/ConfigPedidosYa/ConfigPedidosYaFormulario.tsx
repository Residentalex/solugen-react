import React, { useEffect, useRef, useState } from 'react';
import { Modal, Form, Input, InputNumber, message, Radio, Space, Divider, Typography, Button } from 'antd';
import { configPedidosYaApi } from '../../api/configPedidosYaApi';
import type { ConfigPedidosYaDTO } from '../../types/configPedidosYa';
import { useAuthStore } from '../../stores/authStore';
import { toTitleCase } from '../../utils/formats';

interface ConfigPedidosYaFormularioProps {
  visible: boolean;
  editItem: ConfigPedidosYaDTO | null;
  onClose: () => void;
  onSaved: () => void;
  onOcupadoChange?: (ocupado: boolean) => void;
}

const ConfigPedidosYaFormulario: React.FC<ConfigPedidosYaFormularioProps> = ({
  visible,
  editItem,
  onClose,
  onSaved,
  onOcupadoChange,
}) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [authMethod, setAuthMethod] = useState<'password' | 'private_key'>('password');
  const [probando, setProbando] = useState(false);
  const [resultadoPrueba, setResultadoPrueba] = useState<{ exito: boolean; mensaje: string; fechaPrueba?: string; detalle?: string } | null>(null);
  const ocupado = saving || probando;
  const ocupadoRef = useRef(false);

  useEffect(() => {
    onOcupadoChange?.(ocupado);
  }, [ocupado, onOcupadoChange]);

  useEffect(() => {
    if (visible) {
      if (editItem) {
        form.setFieldsValue(editItem);
        setAuthMethod(editItem.archivoClave ? 'private_key' : 'password');
        setResultadoPrueba(null);
      } else {
        form.resetFields();
        form.setFieldsValue({ puerto: 22, margenBeneficio: 15 });
        setAuthMethod('password');
        setResultadoPrueba(null);
      }
    }
  }, [visible, editItem, form]);

  const handleProbar = async () => {
    if (ocupadoRef.current) return;
    ocupadoRef.current = true;
    try {
      const values = await form.validateFields(['servidor', 'puerto', 'usuario']);
      setProbando(true);
      setResultadoPrueba(null);
      const payload: Partial<ConfigPedidosYaDTO> = {
        servidor: values.servidor,
        puerto: values.puerto,
        usuario: values.usuario,
        contrasena: authMethod === 'password' ? values.contrasena || undefined : undefined,
        archivoClave: authMethod === 'private_key' ? values.archivoClave || undefined : undefined,
      };
      const res = await configPedidosYaApi.probarConexion(sucursalActiva, payload);
      setResultadoPrueba(res);
      message[res.exito ? 'success' : 'error'](res.exito ? 'Conexión exitosa' : 'Fallo en la conexión');
    } catch (err: any) {
      if (err?.errorFields) return;
      const msg = err?.response?.data?.errorMessage || err?.message || 'Error al probar conexión';
      setResultadoPrueba({ exito: false, mensaje: 'Error al probar', fechaPrueba: new Date().toISOString(), detalle: msg });
      message.error(msg);
    } finally {
      setProbando(false);
      ocupadoRef.current = false;
    }
  };

  const handleOk = async () => {
    if (ocupadoRef.current) return;
    ocupadoRef.current = true;
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
      ocupadoRef.current = false;
    }
  };

  const handleCancelarSeguro = () => {
    if (ocupadoRef.current) return;
    onClose();
  };

  return (
    <Modal
      title={editItem ? 'Editar Configuración PedidosYa' : 'Crear Configuración PedidosYa'}
      open={visible}
      onCancel={handleCancelarSeguro}
      onOk={handleOk}
      confirmLoading={saving}
      width={640}
      okText="Guardar"
      cancelText="Cancelar"
      destroyOnClose
      closable={!ocupado}
      maskClosable={!ocupado}
      keyboard={!ocupado}
      okButtonProps={{ disabled: ocupado, loading: saving }}
      cancelButtonProps={{ disabled: ocupado }}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} disabled={ocupado}>
        {/* Sección: Conexión SFTP */}
        <Typography.Title level={5} style={{ marginBottom: 4, fontWeight: 600 }}>Conexión SFTP</Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 12, marginBottom: 12, display: 'block' }}>
          Datos para conectarse al servidor de PedidosYa. Usa contraseña o llave privada, no ambas.
        </Typography.Text>

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
          <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="22 (puerto SFTP estándar)" />
        </Form.Item>

        <Form.Item
          name="usuario"
          label="Usuario"
          rules={[{ required: true, message: 'El usuario es obligatorio' }]}
        >
          <Input placeholder="usuario SFTP (ej: mi_usuario)" />
        </Form.Item>

        <Form.Item label="Método de autenticación">
          <Radio.Group value={authMethod} onChange={(e) => setAuthMethod(e.target.value)}>
            <Space direction="vertical">
              <Radio value="password">Contraseña</Radio>
              <Radio value="private_key">Llave privada (archivo)</Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        {authMethod === 'password' ? (
          <Form.Item
            name="contrasena"
            label="Contraseña"
            help="Contraseña del usuario SFTP (no se guarda en texto plano en el formulario)"
          >
            <Input.Password placeholder="Contraseña SFTP" />
          </Form.Item>
        ) : (
          <Form.Item
            name="archivoClave"
            label="Archivo Clave"
            help="Ruta al archivo de llave privada (ej: /home/user/.ssh/id_rsa)"
          >
            <Input placeholder="Ruta de archivo clave (ej: /etc/pedidosya/key)" />
          </Form.Item>
        )}

        <Divider style={{ margin: '8px 0' }} />
        <Space>
          <Button type="default" loading={probando} onClick={handleProbar} disabled={ocupado}>
            Probar conexión
          </Button>
        </Space>

        {resultadoPrueba && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 6, background: resultadoPrueba.exito ? '#f6ffed' : '#fff2f0', border: `1px solid ${resultadoPrueba.exito ? '#b7eb8f' : '#ffccc7'}` }}>
            <Typography.Text strong style={{ color: resultadoPrueba.exito ? '#52c41a' : '#ff4d4f' }}>
              {resultadoPrueba.exito ? 'Conexión exitosa' : 'Conexión fallida'}
            </Typography.Text>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              {resultadoPrueba.fechaPrueba ? `Fecha: ${new Date(resultadoPrueba.fechaPrueba).toLocaleString()}` : ''}
            </div>
            <div style={{ fontSize: 12, color: '#595959', marginTop: 2 }}>
              {resultadoPrueba.mensaje}
            </div>
            {resultadoPrueba.detalle && (
              <div style={{ fontSize: 11, color: '#bfbfbf', marginTop: 4, whiteSpace: 'pre-wrap' }}>
                {resultadoPrueba.detalle}
              </div>
            )}
          </div>
        )}

        <Divider style={{ margin: '16px 0 8px' }} />

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
          help="Directorio remoto donde se encuentra el archivo (ej: Assortment/miChain_123.csv)"
        >
          <Input placeholder="Assortment/miChain_123.csv" />
        </Form.Item>

        <Form.Item
          name="prefijoArchivo"
          label="Prefijo Archivo"
          help="Prefijo del archivo descargado (ej: miChain)"
        >
          <Input placeholder="miChain" />
        </Form.Item>

        <Form.Item
          name="vendorID"
          label="Vendor ID"
          help="Identificador del vendedor en PedidosYa"
        >
          <Input placeholder="ID del vendedor" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ConfigPedidosYaFormulario;