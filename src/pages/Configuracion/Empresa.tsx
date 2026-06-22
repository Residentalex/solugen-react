import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Form, Input, DatePicker, Select, Switch, Button, message, Spin, Space,
  Row, Col, Grid, Descriptions,
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, SaveOutlined, CloseOutlined,
  BankOutlined, CalendarOutlined, SettingOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { configuracionApi, type ConfiguracionEmpresa } from '../../api/configuracionApi';
import { extraerMensajeError } from '../../utils/formats';

const Empresa: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [data, setData] = useState<ConfiguracionEmpresa | null>(null);
  const screens = Grid.useBreakpoint();
  const isLarge = screens.xxl === true;

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const config = await configuracionApi.obtener(sucursalActiva);
      if (config) {
        setData(config);
        form.setFieldsValue({
          ...config,
          fechaCierre: config.fechaCierre ? dayjs(config.fechaCierre) : null,
          fechaCierreInventario: config.fechaCierreInventario ? dayjs(config.fechaCierreInventario) : null,
          fechaCierreFiscal: config.fechaCierreFiscal ? dayjs(config.fechaCierreFiscal) : null,
        });
      }
    } catch (err: any) {
      message.error(extraerMensajeError(err, 'Error al cargar configuracion'));
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, form]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const config: ConfiguracionEmpresa = {
        ...values,
        fechaCierre: values.fechaCierre ? dayjs(values.fechaCierre).format('YYYYMMDDHHmmss') : null,
        fechaCierreInventario: values.fechaCierreInventario ? dayjs(values.fechaCierreInventario).format('YYYYMMDDHHmmss') : null,
        fechaCierreFiscal: values.fechaCierreFiscal ? dayjs(values.fechaCierreFiscal).format('YYYYMMDDHHmmss') : null,
      };
      await configuracionApi.guardar(sucursalActiva, config);
      message.success('Configuracion guardada correctamente');
      setData(config);
      setModoEdicion(false);
    } catch (err: any) {
      if (err.errorFields) return;
      message.error(extraerMensajeError(err, 'Error al guardar configuracion'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelarEdicion = () => {
    if (data) {
      form.setFieldsValue({
        ...data,
        fechaCierre: data.fechaCierre ? dayjs(data.fechaCierre) : null,
        fechaCierreInventario: data.fechaCierreInventario ? dayjs(data.fechaCierreInventario) : null,
        fechaCierreFiscal: data.fechaCierreFiscal ? dayjs(data.fechaCierreFiscal) : null,
      });
    }
    setModoEdicion(false);
  };

  const handleVolver = () => {
    navigate('/dashboard');
  };

  const formatFecha = (fecha?: string | null) => {
    if (!fecha) return '-';
    const d = dayjs(fecha, 'YYYYMMDDHHmmss');
    return d.isValid() ? d.format('DD/MM/YYYY') : fecha;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando configuracion...</div>
      </div>
    );
  }

  return (
    <>
      {/* Toolbar inline dinamico */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        {modoEdicion ? (
          <>
            <div style={{ flex: 1 }} />
            <Space wrap>
              <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleGuardar}>
                Guardar
              </Button>
              <Button icon={<CloseOutlined />} onClick={handleCancelarEdicion}>
                Cancelar
              </Button>
            </Space>
          </>
        ) : (
          <>
            <Button icon={<ArrowLeftOutlined />} onClick={handleVolver}>
              Volver
            </Button>
            <div style={{ flex: 1 }} />
            <Button type="primary" icon={<EditOutlined />} onClick={() => setModoEdicion(true)}>
              Editar
            </Button>
          </>
        )}
      </div>

      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
        <Row gutter={16}>
          <Col xs={24} xxl={18}>
            {modoEdicion ? (
              <Form form={form} layout="vertical" size="small" style={{ padding: 24 }}>
                {/* Seccion 1: Datos Generales */}
                <Card className="paces-card" size="small" title={
                  <Space>
                    <BankOutlined className="paces-text-icon" />
                    <span style={{ fontWeight: 600 }}>Datos Generales</span>
                  </Space>
                } style={{ marginBottom: 16 }}>
                  <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12} lg={12}>
                      <Form.Item
                        name="nombre"
                        label="Nombre de la empresa"
                        rules={[{ required: true, message: 'Obligatorio' }]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} lg={12}>
                      <Form.Item name="rnc" label="RNC">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} lg={12}>
                      <Form.Item name="telefono" label="Telefono">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} lg={12}>
                      <Form.Item name="fax" label="Fax">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item name="direccion" label="Direccion">
                        <Input.TextArea rows={2} />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item name="slogan" label="Slogan">
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>

                {/* Seccion 2: Parametros Contables */}
                <Card className="paces-card" size="small" title={
                  <Space>
                    <CalendarOutlined className="paces-text-icon" />
                    <span style={{ fontWeight: 600 }}>Parametros Contables</span>
                  </Space>
                } style={{ marginBottom: 16 }}>
                  <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12} lg={8}>
                      <Form.Item name="fechaCierre" label="Cierre contable">
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <Form.Item name="fechaCierreInventario" label="Cierre inventario">
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <Form.Item name="fechaCierreFiscal" label="Cierre fiscal">
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>

                {/* Seccion 3: Configuracion */}
                <Card className="paces-card" size="small" title={
                  <Space>
                    <SettingOutlined className="paces-text-icon" />
                    <span style={{ fontWeight: 600 }}>Configuracion</span>
                  </Space>
                } style={{ marginBottom: 16 }}>
                  <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12} lg={12}>
                      <Form.Item name="metodoFacturacionDGII" label="Metodo de facturacion DGII">
                        <Select
                          allowClear
                          showSearch
                          optionFilterProp="children"
                          options={[
                            { value: 'Normal', label: 'Normal' },
                            { value: 'ConsumidorFinal', label: 'Consumidor Final' },
                            { value: 'eCF', label: 'eCF (Factura Electronica)' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} lg={12}>
                      <Form.Item
                        name="orcEnUnidades"
                        label="ORC en unidades"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              </Form>
            ) : (
              <div style={{ padding: 24 }}>
                {/* Seccion 1: Datos Generales - Detalle */}
                <Card className="paces-card" size="small" title={
                  <Space>
                    <BankOutlined className="paces-text-icon" />
                    <span style={{ fontWeight: 600 }}>Datos Generales</span>
                  </Space>
                } style={{ marginBottom: 16 }}>
                  <Descriptions
                    bordered
                    size="small"
                    column={isLarge ? 3 : 1}
                    styles={{ content: { background: 'transparent' } }}
                  >
                    <Descriptions.Item label="Nombre">{data?.nombre || '-'}</Descriptions.Item>
                    <Descriptions.Item label="RNC">{data?.rnc || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Telefono">{data?.telefono || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Fax">{data?.fax || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Direccion" span={isLarge ? 3 : 1}>
                      <span style={{ whiteSpace: 'pre-wrap' }}>{data?.direccion || '-'}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Slogan" span={isLarge ? 3 : 1}>
                      {data?.slogan || '-'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                {/* Seccion 2: Parametros Contables - Detalle */}
                <Card className="paces-card" size="small" title={
                  <Space>
                    <CalendarOutlined className="paces-text-icon" />
                    <span style={{ fontWeight: 600 }}>Parametros Contables</span>
                  </Space>
                } style={{ marginBottom: 16 }}>
                  <Descriptions
                    bordered
                    size="small"
                    column={isLarge ? 3 : 1}
                    styles={{ content: { background: 'transparent' } }}
                  >
                    <Descriptions.Item label="Cierre contable">
                      {formatFecha(data?.fechaCierre)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Cierre inventario">
                      {formatFecha(data?.fechaCierreInventario)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Cierre fiscal">
                      {formatFecha(data?.fechaCierreFiscal)}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                {/* Seccion 3: Configuracion - Detalle */}
                <Card className="paces-card" size="small" title={
                  <Space>
                    <SettingOutlined className="paces-text-icon" />
                    <span style={{ fontWeight: 600 }}>Configuracion</span>
                  </Space>
                } style={{ marginBottom: 16 }}>
                  <Descriptions
                    bordered
                    size="small"
                    column={isLarge ? 3 : 1}
                    styles={{ content: { background: 'transparent' } }}
                  >
                    <Descriptions.Item label="Metodo de facturacion DGII">
                      {data?.metodoFacturacionDGII || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="ORC en unidades">
                      {data?.orcEnUnidades ? 'Si' : 'No'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </div>
            )}
          </Col>

          {/* Sidebar: solo visible en desktop (>= xxl) */}
          {isLarge && (
            <Col xs={24} xxl={6} style={{ padding: 24 }}>
              <Card className="paces-card" size="small" title={<span style={{ fontWeight: 600 }}>Informacion</span>}>
                <div className="paces-text-secondary" style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <p>Configure los parametros generales de la empresa.</p>
                  <p>Los cambios en fechas de cierre afectan el procesamiento contable e inventario.</p>
                </div>
              </Card>
            </Col>
          )}
        </Row>
      </Card>
    </>
  );
};

export default Empresa;
