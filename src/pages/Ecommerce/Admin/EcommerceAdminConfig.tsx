import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Form, Input, InputNumber, Button, message, Spin, Space, Row, Col, Switch,
} from 'antd';
import {
  SaveOutlined, ReloadOutlined, ArrowLeftOutlined, ShopOutlined, ContactsOutlined, DollarOutlined, SyncOutlined,
} from '@ant-design/icons';
import { ecommerceApi } from '../../../api/ecommerceApi';
import type { AdminConfigDTO } from '../../../api/ecommerceApi';

interface ConfigField {
  clave: string;
  label: string;
  tipo: 'texto' | 'numero' | 'switch';
  descripcion: string;
}

const CAMPOS_CONFIG: ConfigField[] = [
  { clave: 'NOMBRE_TIENDA', label: 'Nombre de la Tienda', tipo: 'texto', descripcion: 'Nombre que aparece en el header y emails del ecommerce.' },
  { clave: 'PORCENTAJE_MARKUP', label: 'Porcentaje Markup (%)', tipo: 'numero', descripcion: 'Margen de ganancia aplicado sobre el costo para calcular el precio base.' },
  { clave: 'ENVIO_GRATIS_MINIMO', label: 'Envío Gratis Mínimo', tipo: 'numero', descripcion: 'Monto mínimo de compra para aplicar envío gratis. 0 para desactivar.' },
  { clave: 'ITBIS_PORCENTAJE', label: 'ITBIS %', tipo: 'numero', descripcion: 'Porcentaje de impuesto aplicado a las órdenes.' },
  { clave: 'TELEFONO_CONTACTO', label: 'Teléfono de Contacto', tipo: 'texto', descripcion: 'Teléfono mostrado en el footer y página de contacto.' },
  { clave: 'EMAIL_CONTACTO', label: 'Email de Contacto', tipo: 'texto', descripcion: 'Email para notificaciones y soporte al cliente.' },
  { clave: 'MENSAJE_HOME', label: 'Mensaje Home', tipo: 'texto', descripcion: 'Texto promocional mostrado en la página principal del ecommerce.' },
  { clave: 'SOLO_CON_EXISTENCIA', label: 'Solo productos con existencia', tipo: 'switch', descripcion: 'Si está activo, solo se sincronizan productos con stock disponible (> 0).' },
  { clave: 'RUTA_IMAGENES', label: 'Ruta para imágenes', tipo: 'texto', descripcion: 'Ruta absoluta de la carpeta donde se guardarán las imágenes de productos. Ej: D:\\GenesisUploads\\Ecommerce\\' },
];

const EcommerceAdminConfig: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configMap, setConfigMap] = useState<Record<string, AdminConfigDTO>>({});
  const navigate = useNavigate();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const result = await ecommerceApi.adminObtenerConfig();
      const map: Record<string, AdminConfigDTO> = {};
      result.forEach((c) => { map[c.clave] = c; });
      setConfigMap(map);

      const valores: Record<string, string | number | boolean> = {};
      CAMPOS_CONFIG.forEach((campo) => {
        const valor = map[campo.clave]?.valor ?? '';
        if (campo.tipo === 'numero') {
          valores[campo.clave] = valor ? Number(valor) : 0;
        } else if (campo.tipo === 'switch') {
          valores[campo.clave] = valor === '1' || valor === 1 || valor === true;
        } else {
          valores[campo.clave] = valor;
        }
      });
      form.setFieldsValue(valores);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleGuardar = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = CAMPOS_CONFIG.map((c) => ({
        clave: c.clave,
        valor: String(c.tipo === 'switch' ? (values[c.clave] ? '1' : '0') : (values[c.clave] ?? '')),
      }));
      const respuesta = await ecommerceApi.adminActualizarConfig(payload);
      message.success(respuesta.mensaje);
      if (respuesta.totalFilasAfectadas === 0) {
        message.warning('Ninguna fila fue actualizada.');
      } else {
        const clavesFallidas = respuesta.detalles
          .filter((d) => d.filasAfectadas === 0)
          .map((d) => d.clave);
        if (clavesFallidas.length > 0) {
          message.warning(`Las siguientes claves no se actualizaron: ${clavesFallidas.join(', ')}`);
        }
      }
      message.info(`Total filas afectadas: ${respuesta.totalFilasAfectadas}`);
      cargar();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Spin spinning={loading}>
      <Card
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
        title="Configuración del Ecommerce"
      >
        <Form form={form} layout="vertical" style={{ padding: 24 }} onFinish={handleGuardar}>
          {/* Card secundario 1: General */}
          <Card
            className="paces-card"
            size="small"
            title={
              <Space>
                <ShopOutlined className="paces-text-icon" />
                <span style={{ fontWeight: 600 }}>General</span>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12} lg={12}>
                <Form.Item
                  name="NOMBRE_TIENDA"
                  label="Nombre de la Tienda"
                  extra={<span className="paces-text-secondary" style={{ fontSize: 12 }}>Nombre que aparece en el header y emails del ecommerce.</span>}
                  rules={[{ required: true, message: 'Requerido' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={12}>
                <Form.Item
                  name="MENSAJE_HOME"
                  label="Mensaje Home"
                  extra={<span className="paces-text-secondary" style={{ fontSize: 12 }}>Texto promocional mostrado en la página principal del ecommerce.</span>}
                  rules={[{ required: true, message: 'Requerido' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Card secundario 2: Contacto */}
          <Card
            className="paces-card"
            size="small"
            title={
              <Space>
                <ContactsOutlined className="paces-text-icon" />
                <span style={{ fontWeight: 600 }}>Contacto</span>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12} lg={12}>
                <Form.Item
                  name="TELEFONO_CONTACTO"
                  label="Teléfono de Contacto"
                  extra={<span className="paces-text-secondary" style={{ fontSize: 12 }}>Teléfono mostrado en el footer y página de contacto.</span>}
                  rules={[{ required: true, message: 'Requerido' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={12}>
                <Form.Item
                  name="EMAIL_CONTACTO"
                  label="Email de Contacto"
                  extra={<span className="paces-text-secondary" style={{ fontSize: 12 }}>Email para notificaciones y soporte al cliente.</span>}
                  rules={[{ required: true, message: 'Requerido' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Card secundario 3: Financiero */}
          <Card
            className="paces-card"
            size="small"
            title={
              <Space>
                <DollarOutlined className="paces-text-icon" />
                <span style={{ fontWeight: 600 }}>Financiero</span>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12} lg={8}>
                <Form.Item
                  name="PORCENTAJE_MARKUP"
                  label="Porcentaje Markup (%)"
                  extra={<span className="paces-text-secondary" style={{ fontSize: 12 }}>Margen de ganancia aplicado sobre el costo para calcular el precio base.</span>}
                  rules={[{ required: true, message: 'Requerido' }]}
                >
                  <InputNumber style={{ width: '100%' }} min={0} precision={2} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={8}>
                <Form.Item
                  name="ENVIO_GRATIS_MINIMO"
                  label="Envío Gratis Mínimo"
                  extra={<span className="paces-text-secondary" style={{ fontSize: 12 }}>Monto mínimo de compra para aplicar envío gratis. 0 para desactivar.</span>}
                  rules={[{ required: true, message: 'Requerido' }]}
                >
                  <InputNumber style={{ width: '100%' }} min={0} precision={2} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={8}>
                <Form.Item
                  name="ITBIS_PORCENTAJE"
                  label="ITBIS %"
                  extra={<span className="paces-text-secondary" style={{ fontSize: 12 }}>Porcentaje de impuesto aplicado a las órdenes.</span>}
                  rules={[{ required: true, message: 'Requerido' }]}
                >
                  <InputNumber style={{ width: '100%' }} min={0} precision={2} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Card secundario 4: Sincronización */}
          <Card
            className="paces-card"
            size="small"
            title={
              <Space>
                <SyncOutlined className="paces-text-icon" />
                <span style={{ fontWeight: 600 }}>Sincronización</span>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12} lg={12}>
                <Form.Item
                  name="SOLO_CON_EXISTENCIA"
                  label="Solo productos con existencia"
                  valuePropName="checked"
                  extra={<span className="paces-text-secondary" style={{ fontSize: 12 }}>Si está activo, solo se sincronizan productos con stock disponible (mayor a 0).</span>}
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={12}>
                <Form.Item
                  name="RUTA_IMAGENES"
                  label="Ruta para imágenes"
                  extra={<span className="paces-text-secondary" style={{ fontSize: 12 }}>Ruta absoluta de la carpeta donde se guardarán las imágenes de productos. Ej: D:\\GenesisUploads\\Ecommerce\\</span>}
                  rules={[{ required: true, message: 'Requerido' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 24, flexWrap: 'wrap' }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/EDashboard')}>
              Volver
            </Button>
            <div style={{ flex: 1 }} />
            <Button icon={<ReloadOutlined />} onClick={cargar}>
              Restaurar
            </Button>
            <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={saving}>
              Guardar
            </Button>
          </div>
        </Form>
      </Card>
    </Spin>
  );
};

export default EcommerceAdminConfig;
