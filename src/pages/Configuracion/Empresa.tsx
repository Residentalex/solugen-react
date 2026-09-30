import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Card, Form, Input, DatePicker, Select, Switch, Button, message, Spin, Space,
  Row, Col, Grid, Descriptions, Alert, Table, Modal, Popconfirm, Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, SaveOutlined, CloseOutlined,
  BankOutlined, CalendarOutlined, SettingOutlined, ShoppingCartOutlined,
  ApiOutlined, PlusOutlined, ReloadOutlined, DeleteOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { configuracionApi, type ConfiguracionEmpresa } from '../../api/configuracionApi';
import { configPedidosYaApi } from '../../api/configPedidosYaApi';
import { dgiiApiConfigApi } from '../../api/dgiiApiConfigApi';
import type { ConfigPedidosYaDTO } from '../../types/configPedidosYa';
import type { DgiiApiConfigDTO, DgiiApiConfigRequest } from '../../types/dgiiApiConfig';
import { extraerMensajeError } from '../../utils/formats';

const Empresa: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [data, setData] = useState<ConfiguracionEmpresa | null>(null);
  const [pedidosYaConfig, setPedidosYaConfig] = useState<ConfigPedidosYaDTO | null>(null);
  const [loadingPedidosYa, setLoadingPedidosYa] = useState(false);
  const [errorPedidosYa, setErrorPedidosYa] = useState<string | null>(null);
  const savingRef = useRef(false);
  const screens = Grid.useBreakpoint();
  const isLarge = screens.xxl === true;

  // Conexiones a la API DGII (configuracion global, no depende de sucursal)
  const [dgiiForm] = Form.useForm<DgiiApiConfigRequest>();
  const [dgiiConexiones, setDgiiConexiones] = useState<DgiiApiConfigDTO[]>([]);
  const [loadingDgii, setLoadingDgii] = useState(false);
  const [dgiiModalAbierto, setDgiiModalAbierto] = useState(false);
  const [dgiiEditando, setDgiiEditando] = useState<DgiiApiConfigDTO | null>(null);
  const [guardandoDgii, setGuardandoDgii] = useState(false);
  const [probandoDgii, setProbandoDgii] = useState(false);
  const [dgiiToggleId, setDgiiToggleId] = useState<number | null>(null);

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
      message.error(extraerMensajeError(err, 'Error al cargar configuración'));
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, form]);

  const cargarPedidosYa = useCallback(async () => {
    setLoadingPedidosYa(true);
    setErrorPedidosYa(null);
    try {
      const config = await configPedidosYaApi.obtener(sucursalActiva);
      setPedidosYaConfig(config);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setPedidosYaConfig(null);
        setErrorPedidosYa(null);
      } else {
        setPedidosYaConfig(null);
        setErrorPedidosYa(extraerMensajeError(err, 'No se pudo consultar la configuración de PedidosYa'));
      }
    } finally {
      setLoadingPedidosYa(false);
    }
  }, [sucursalActiva]);

  const cargarDgii = useCallback(async () => {
    setLoadingDgii(true);
    try {
      setDgiiConexiones(await dgiiApiConfigApi.obtenerTodas());
    } catch (err: any) {
      message.error(extraerMensajeError(err, 'Error al cargar las conexiones DGII'));
    } finally {
      setLoadingDgii(false);
    }
  }, []);

  useEffect(() => { cargar(); cargarPedidosYa(); }, [cargar, cargarPedidosYa]);
  useEffect(() => { cargarDgii(); }, [cargarDgii]);

  const abrirNuevaDgii = () => {
    setDgiiEditando(null);
    dgiiForm.resetFields();
    setDgiiModalAbierto(true);
  };

  const abrirEditarDgii = (registro: DgiiApiConfigDTO) => {
    setDgiiEditando(registro);
    dgiiForm.setFieldsValue({
      nombre: registro.nombre,
      url: registro.url,
      apiKey: '',
      observacion: registro.observacion ?? '',
    });
    setDgiiModalAbierto(true);
  };

  const handleProbarDgii = async () => {
    let values: DgiiApiConfigRequest;
    try {
      values = await dgiiForm.validateFields(['url']);
    } catch {
      return;
    }
    setProbandoDgii(true);
    try {
      const resultado = await dgiiApiConfigApi.probar({
        nombre: values.nombre || 'Conexion sin nombre',
        url: values.url,
        apiKey: values.apiKey ?? '',
        observacion: values.observacion ?? '',
      });
      if (resultado.exitosa) message.success(resultado.mensaje);
      else message.warning(resultado.mensaje);
    } catch (err: any) {
      message.error(extraerMensajeError(err, 'Error al probar la conexion'));
    } finally {
      setProbandoDgii(false);
    }
  };

  const handleGuardarDgii = async () => {
    let values: DgiiApiConfigRequest;
    try {
      values = await dgiiForm.validateFields();
    } catch {
      return;
    }
    setGuardandoDgii(true);
    try {
      if (dgiiEditando) {
        await dgiiApiConfigApi.actualizar(dgiiEditando.id, values);
        message.success('Conexion actualizada');
      } else {
        await dgiiApiConfigApi.crear(values);
        message.success('Conexion creada');
      }
      setDgiiModalAbierto(false);
      dgiiForm.resetFields();
      await cargarDgii();
    } catch (err: any) {
      message.error(extraerMensajeError(err, 'Error al guardar la conexion'));
    } finally {
      setGuardandoDgii(false);
    }
  };

  const handleToggleDgii = async (registro: DgiiApiConfigDTO, activar: boolean) => {
    setDgiiToggleId(registro.id);
    try {
      if (activar) {
        await dgiiApiConfigApi.activar(registro.id);
        message.success(`Conexion "${registro.nombre}" activada`);
      } else {
        await dgiiApiConfigApi.desactivar(registro.id);
        message.success(`Conexion "${registro.nombre}" desactivada`);
      }
      await cargarDgii();
    } catch (err: any) {
      message.error(extraerMensajeError(err, 'Error al cambiar el estado de la conexion'));
    } finally {
      setDgiiToggleId(null);
    }
  };

  const handleEliminarDgii = async (registro: DgiiApiConfigDTO) => {
    try {
      await dgiiApiConfigApi.eliminar(registro.id);
      message.success('Conexion eliminada');
      await cargarDgii();
    } catch (err: any) {
      message.error(extraerMensajeError(err, 'Error al eliminar la conexion'));
    }
  };

  const handleGuardar = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const values = await form.validateFields();
      const config: ConfiguracionEmpresa = {
        ...values,
        fechaCierre: values.fechaCierre ? dayjs(values.fechaCierre).format('YYYYMMDDHHmmss') : null,
        fechaCierreInventario: values.fechaCierreInventario ? dayjs(values.fechaCierreInventario).format('YYYYMMDDHHmmss') : null,
        fechaCierreFiscal: values.fechaCierreFiscal ? dayjs(values.fechaCierreFiscal).format('YYYYMMDDHHmmss') : null,
      };
      await configuracionApi.guardar(sucursalActiva, config);
      message.success('Configuración guardada correctamente');
      setData(config);
      setModoEdicion(false);
    } catch (err: any) {
      if (err.errorFields) return;
      message.error(extraerMensajeError(err, 'Error al guardar configuración'));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleCancelarEdicion = () => {
    if (saving || savingRef.current) return;
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
    if (saving || savingRef.current) return;
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
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <>
      {/* Toolbar inline dinamico */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8, position: 'sticky', top: 0, zIndex: 10, background: 'var(--paces-layout-bg, #f0f2f5)', padding: '8px 0' }}>
        {modoEdicion ? (
          <>
            <div style={{ flex: 1 }} />
            <Space wrap>
              <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={saving} onClick={handleGuardar}>
                Guardar
              </Button>
              <Button icon={<CloseOutlined />} disabled={saving} onClick={handleCancelarEdicion}>
                Cancelar
              </Button>
            </Space>
          </>
        ) : (
          <>
            <Button icon={<ArrowLeftOutlined />} disabled={saving} onClick={handleVolver}>
              Volver
            </Button>
            <div style={{ flex: 1 }} />
            <Button type="primary" icon={<EditOutlined />} disabled={saving} onClick={() => setModoEdicion(true)}>
              Editar
            </Button>
          </>
        )}
      </div>

      <Spin spinning={saving} tip="Guardando configuración…">
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
        <Row gutter={16}>
          <Col xs={24} xxl={18}>
            {modoEdicion ? (
              <Form form={form} layout="vertical" size="small" style={{ padding: 24 }} disabled={saving}>
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
                      <Form.Item name="telefono" label="Teléfono">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} lg={12}>
                      <Form.Item name="fax" label="Fax">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item name="direccion" label="Dirección">
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
                    <span style={{ fontWeight: 600 }}>Parámetros Contables</span>
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
                    <span style={{ fontWeight: 600 }}>Configuración</span>
                  </Space>
                } style={{ marginBottom: 16 }}>
                  <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12} lg={12}>
                      <Form.Item name="metodoFacturacionDGII" label="Método de facturación DGII">
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
                    <Descriptions.Item label="Teléfono">{data?.telefono || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Fax">{data?.fax || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Dirección" span={isLarge ? 3 : 1}>
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
                    <span style={{ fontWeight: 600 }}>Parámetros Contables</span>
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
                    <span style={{ fontWeight: 600 }}>Configuración</span>
                  </Space>
                } style={{ marginBottom: 16 }}>
                  <Descriptions
                    bordered
                    size="small"
                    column={isLarge ? 3 : 1}
                    styles={{ content: { background: 'transparent' } }}
                  >
                    <Descriptions.Item label="Método de facturación DGII">
                      {data?.metodoFacturacionDGII || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="ORC en unidades">
                      {data?.orcEnUnidades ? 'Sí' : 'No'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                {/* Seccion 4: PedidosYa - Detalle */}
                <Card className="paces-card" size="small" title={
                  <Space>
                    <ShoppingCartOutlined className="paces-text-icon" />
                    <span style={{ fontWeight: 600 }}>PedidosYa</span>
                  </Space>
                }
                  extra={
                    <Button type="primary" size="small" icon={<EditOutlined />}
                      onClick={() => navigate('/MConfigPedidosYa')}>
                      Configurar
                    </Button>
                  }
                  style={{ marginBottom: 16 }}>
                  {loadingPedidosYa ? (
                    <Spin />
                  ) : errorPedidosYa ? (
                    <Alert
                      type="warning"
                      showIcon
                      message="No se pudo consultar la configuración de PedidosYa"
                      description={errorPedidosYa}
                      action={
                        <Button size="small" onClick={cargarPedidosYa}>
                          Reintentar
                        </Button>
                      }
                    />
                  ) : pedidosYaConfig ? (
                    <Descriptions
                      bordered
                      size="small"
                      column={isLarge ? 3 : 1}
                      styles={{ content: { background: 'transparent' } }}
                    >
                      <Descriptions.Item label="Servidor">{pedidosYaConfig.servidor}</Descriptions.Item>
                      <Descriptions.Item label="Puerto">{pedidosYaConfig.puerto}</Descriptions.Item>
                      <Descriptions.Item label="Usuario">{pedidosYaConfig.usuario}</Descriptions.Item>
                      <Descriptions.Item label="Margen beneficio">{pedidosYaConfig.margenBeneficio}%</Descriptions.Item>
                      <Descriptions.Item label="Ruta remota">{pedidosYaConfig.rutaRemota || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Prefijo archivo">{pedidosYaConfig.prefijoArchivo || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Vendor ID">{pedidosYaConfig.vendorID || '-'}</Descriptions.Item>
                    </Descriptions>
                  ) : (
                    <div className="paces-text-secondary" style={{ padding: '8px 0' }}>
                      No hay configuración de PedidosYa para esta sucursal.
                    </div>
                  )}
                </Card>
              </div>
            )}
          </Col>

          {/* Sidebar: solo visible en desktop (>= xxl) */}
          {isLarge && (
            <Col xs={24} xxl={6} style={{ padding: 24 }}>
              <Card className="paces-card" size="small" title={<span style={{ fontWeight: 600 }}>Información</span>}>
                <div className="paces-text-secondary" style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <p>Configure los parámetros generales de la empresa.</p>
                  <p>Los cambios en fechas de cierre afectan el procesamiento contable e inventario.</p>
                </div>
              </Card>
            </Col>
          )}
        </Row>
      </Card>

      {/* Configuracion global de conexiones API DGII.
          Fuera del bloque de edicion porque es independiente del formulario
          de empresa y debe estar disponible siempre. */}
      <Card
        className="paces-card"
        size="small"
        style={{ marginTop: 16 }}
        title={
          <Space>
            <ApiOutlined className="paces-text-icon" />
            <span style={{ fontWeight: 600 }}>Conexiones API DGII</span>
          </Space>
        }
        extra={
          <Space>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={abrirNuevaDgii}>
              Nueva
            </Button>
            <Button size="small" icon={<ReloadOutlined />} onClick={cargarDgii} />
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Solo una conexion puede estar activa a la vez"
          description="La conexion marcada como Activa es la que usa el backend para enviar a la DGII. Si desactivas todas, se usara la conexion ClaroEcf definida en appsettings.json. Esta configuracion es global de la instalacion (Consolidado), no por sucursal."
        />
        <Table
          className="paces-list-table"
          size="small"
          rowKey="id"
          loading={loadingDgii}
          dataSource={dgiiConexiones}
          pagination={dgiiConexiones.length > 10 ? { pageSize: 10, showTotal: (t) => `${t} conexiones` } : false}
          locale={{ emptyText: 'No hay conexiones configuradas' }}
          columns={[
            {
              title: 'Nombre',
              dataIndex: 'nombre',
              render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>,
            },
            { title: 'URL', dataIndex: 'url', ellipsis: true },
            {
              title: 'API key',
              dataIndex: 'apiKeyEnmascarada',
              width: 200,
              render: (v: string) => (
                <span className="paces-text-secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {v || '-'}
                </span>
              ),
            },
            {
              title: 'Activa',
              dataIndex: 'activa',
              width: 90,
              align: 'center',
              render: (v: boolean, r: DgiiApiConfigDTO) => (
                <Switch
                  checked={v}
                  loading={dgiiToggleId === r.id}
                  disabled={dgiiToggleId !== null && dgiiToggleId !== r.id}
                  checkedChildren="Si"
                  unCheckedChildren="No"
                  onChange={(checked) => handleToggleDgii(r, checked)}
                />
              ),
            },
            {
              title: 'Acciones',
              key: 'acciones',
              align: 'right',
              width: 90,
              render: (_: unknown, r: DgiiApiConfigDTO) => (
                <Space size={2}>
                  <Tooltip title="Editar">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => abrirEditarDgii(r)}
                    />
                  </Tooltip>
                  <Popconfirm title="Eliminar esta conexion?" onConfirm={() => handleEliminarDgii(r)}>
                    <Tooltip title="Eliminar">
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>
      </Spin>

      <Modal
        open={dgiiModalAbierto}
        title={dgiiEditando ? `Editar conexion: ${dgiiEditando.nombre}` : 'Nueva conexion API DGII'}
        onCancel={() => setDgiiModalAbierto(false)}
        onOk={handleGuardarDgii}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={guardandoDgii}
        maskClosable={false}
        destroyOnHidden
      >
        <Form form={dgiiForm} layout="vertical" size="small" style={{ marginTop: 16 }}>
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'Obligatorio' }]}
          >
            <Input placeholder="Ej: Claro e-CF Produccion" />
          </Form.Item>
          <Form.Item
            name="url"
            label="URL base"
            rules={[
              { required: true, message: 'Obligatorio' },
              { type: 'url', message: 'Debe ser una URL valida (http o https)' },
            ]}
          >
            <Input placeholder="https://e-cfclarocloud.claro.com.do/api/v1/" />
          </Form.Item>
          <Form.Item
            name="apiKey"
            label="API key"
            rules={dgiiEditando ? [] : [{ required: true, message: 'Obligatorio' }]}
          >
            <Input.Password
              placeholder={dgiiEditando ? 'Dejar vacio para conservar la actual' : 'Token de la API'}
              autoComplete="new-password"
            />
          </Form.Item>
          {dgiiEditando && (
            <Alert
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
              message="API key guardada"
              description={
                <>
                  Valor almacenado: <code>{dgiiEditando.apiKeyEnmascarada || '(sin valor)'}</code>.{' '}
                  Deja el campo vacio para conservarla, o escribe un valor nuevo para reemplazarla.
                </>
              }
            />
          )}
          <Form.Item name="observacion" label="Observacion">
            <Input.TextArea rows={2} placeholder="Opcional" />
          </Form.Item>
          <Button
            icon={<ThunderboltOutlined />}
            onClick={handleProbarDgii}
            loading={probandoDgii}
            disabled={guardandoDgii}
          >
            Probar conexion
          </Button>
        </Form>
      </Modal>
    </>
  );
};

export default Empresa;
