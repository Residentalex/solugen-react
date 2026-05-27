import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Spin, Button, message, Form, Input, Select, Switch, Row, Col, Typography,
  Tabs, Descriptions, InputNumber, Tag, Alert,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, EditOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { clienteApi } from '../../api/clienteApi';
import type { ClienteDTO } from '../../types/facturacion';
import ErrorBoundary from '../../components/ErrorBoundary';

const { Text } = Typography;

// Helpers de enums
const SEXO_LABEL: Record<number, string> = {
  0: 'Masculino',
  1: 'Femenino',
};

const ESTADO_CIVIL_LABEL: Record<number, string> = {
  0: 'Soltero(a)',
  1: 'Casado(a)',
  2: 'Divorciado(a)',
  3: 'Viudo(a)',
  4: 'Unión Libre',
};

const ClienteDetalle: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);

  const esNuevo = !codigo || codigo === 'nuevo';

  const [data, setData] = useState<ClienteDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    setActiveModule('MCliente');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (esNuevo) {
      setPageTitleOverride('Nuevo Cliente');
      setEditando(true);
      form.setFieldsValue({ activo: true, tipoIdentificacion: 'RNC' });
      return;
    }
    if (!codigo) return;

    const abortController = new AbortController();
    setLoading(true);

    clienteApi.obtenerPorCodigo(sucursalActiva, codigo, abortController.signal)
      .then((res) => {
        if (abortController.signal.aborted) return;
        setData(res);
        setPageTitleOverride(res.nombre || codigo);
        form.setFieldsValue({
          codigo: res.codigo,
          nombre: res.nombre,
          tipoIdentificacion: res.tipoIdentificacion,
          identificacion: res.identificacion,
          telefono: res.telefono,
          telefonoAdicional: res.telefonoAdicional,
          correoElectronico: res.correoElectronico,
          direccion: res.direccion,
          sexo: res.sexo,
          estadoCivil: res.estadoCivil,
          fechaNacimiento: res.fechaNacimiento,
          nota: res.nota,
          activo: res.activo,
          limiteCredito: res.limiteCredito,
          diasCredito: res.diasCredito,
          creditoSuspendido: res.creditoSuspendido,
          exentoImpuesto: res.exentoImpuesto,
          margen: res.margen,
          porcientoDescuento: res.porcientoDescuento,
        });
      })
      .catch((err: any) => {
        if (err?.name === 'CanceledError' || abortController.signal.aborted) return;
        message.error(err?.response?.data?.errorMessage || 'Error al cargar cliente');
        setLoadingError(true);
      })
      .finally(() => {
        if (!abortController.signal.aborted) setLoading(false);
      });

    return () => abortController.abort();
  }, [codigo, sucursalActiva, setPageTitleOverride, esNuevo, form]);

  // Permisos
  const usuario = useAuthStore((s: any) => s.usuario);
  const pantallaActual = usuario?.pantallas.find((p: any) => p.codigo === 'MCliente');
  const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;
  const puedeCrear = pantallaActual?.acciones.includes('CREAR') ?? false;

  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      setGuardando(true);
      const payload: ClienteDTO = {
        codigo: values.codigo,
        nombre: values.nombre,
        tipoIdentificacion: values.tipoIdentificacion || 'RNC',
        identificacion: values.identificacion || '',
        correoElectronico: values.correoElectronico || '',
        telefono: values.telefono || '',
        telefonoAdicional: values.telefonoAdicional || '',
        direccion: values.direccion || '',
        nota: values.nota || '',
        activo: values.activo ?? true,
        sexo: values.sexo,
        estadoCivil: values.estadoCivil,
        fechaNacimiento: values.fechaNacimiento || undefined,
        limiteCredito: values.limiteCredito ?? 0,
        diasCredito: values.diasCredito ?? 0,
        creditoSuspendido: values.creditoSuspendido ?? false,
        exentoImpuesto: values.exentoImpuesto ?? false,
        margen: values.margen ?? 0,
        porcientoDescuento: values.porcientoDescuento ?? 0,
      };
      if (!esNuevo && data) {
        await clienteApi.actualizar(sucursalActiva, { ...data, ...payload });
        message.success('Cliente actualizado correctamente');
      } else {
        await clienteApi.crear(sucursalActiva, payload);
        message.success('Cliente creado correctamente');
      }
      navigate('/MCliente');
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar cliente');
    } finally {
      setGuardando(false);
    }
  };

  if (!esNuevo && loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando cliente...</div>
      </div>
    );
  }

  const esSoloLectura = !esNuevo && !editando;

  const tabItems = [
    {
      key: 'laborales',
      label: 'Datos Laborales',
      children: (
        <div style={{ padding: 16, textAlign: 'center' }} className="paces-text-secondary">
          <Text type="secondary">Información laboral del cliente (próximamente)</Text>
        </div>
      ),
    },
    {
      key: 'movimientos',
      label: 'Movimientos',
      children: (
        <div style={{ padding: 16, textAlign: 'center' }} className="paces-text-secondary">
          <Text type="secondary">Últimas transacciones del cliente (próximamente)</Text>
        </div>
      ),
    },
    {
      key: 'facturacion',
      label: 'Facturación',
      children: (
        <div style={{ padding: 16, textAlign: 'center' }} className="paces-text-secondary">
          <Text type="secondary">Historial de facturación (próximamente)</Text>
        </div>
      ),
    },
    {
      key: 'autorizadas',
      label: 'Personas Autorizadas',
      children: (
        <div style={{ padding: 16, textAlign: 'center' }} className="paces-text-secondary">
          <Text type="secondary">Personas autorizadas para realizar transacciones (próximamente)</Text>
        </div>
      ),
    },
  ];

  const handleRefresh = () => {
    if (esNuevo || !codigo) return;
    setLoadingError(false);
    setLoading(true);
    const abortController = new AbortController();
    clienteApi.obtenerPorCodigo(sucursalActiva, codigo, abortController.signal)
      .then((res) => {
        if (abortController.signal.aborted) return;
        setData(res);
        setPageTitleOverride(res.nombre || codigo);
        form.setFieldsValue({
          codigo: res.codigo, nombre: res.nombre, tipoIdentificacion: res.tipoIdentificacion,
          identificacion: res.identificacion, telefono: res.telefono, telefonoAdicional: res.telefonoAdicional,
          correoElectronico: res.correoElectronico, direccion: res.direccion, sexo: res.sexo,
          estadoCivil: res.estadoCivil, fechaNacimiento: res.fechaNacimiento, nota: res.nota,
          activo: res.activo, limiteCredito: res.limiteCredito, diasCredito: res.diasCredito,
          creditoSuspendido: res.creditoSuspendido, exentoImpuesto: res.exentoImpuesto,
          margen: res.margen, porcientoDescuento: res.porcientoDescuento,
        });
      })
      .catch((err: any) => {
        if (err?.name === 'CanceledError' || abortController.signal.aborted) return;
        message.error(err?.response?.data?.errorMessage || 'Error al recargar');
        setLoadingError(true);
      })
      .finally(() => {
        if (!abortController.signal.aborted) setLoading(false);
      });
  };

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle de cliente"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={handleRefresh}>
              Reintentar
            </Button>
          }
        />
      )}
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/MCliente')}>
          Volver
        </Button>
        <div style={{ flex: 1 }} />
        {esNuevo ? (
          puedeCrear && (
            <Button type="primary" icon={<SaveOutlined />} onClick={handleGuardar} loading={guardando}>
              Guardar
            </Button>
          )
        ) : editando ? (
          puedeEditar && (
            <Button type="primary" icon={<SaveOutlined />} onClick={handleGuardar} loading={guardando}>
              Guardar
            </Button>
          )
        ) : (
          puedeEditar && (
            <Button type="primary" icon={<EditOutlined />} onClick={() => setEditando(true)}>
              Editar
            </Button>
          )
        )}
      </div>

      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col xs={24} lg={8}>
            {/* Datos Generales */}
            <Card title="Datos Generales" className="paces-card" style={{ marginBottom: 16 }}>
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="Código">
                  {esSoloLectura ? (
                    <Text style={{ fontFamily: 'monospace' }}>{data?.codigo}</Text>
                  ) : (
                    <Form.Item name="codigo" noStyle rules={[{ required: true, message: 'Obligatorio' }]}>
                      <Input placeholder="Código" maxLength={20} />
                    </Form.Item>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Nombre">
                  {esSoloLectura ? (
                    <Text>{data?.nombre}</Text>
                  ) : (
                    <Form.Item name="nombre" noStyle rules={[{ required: true, message: 'Obligatorio' }]}>
                      <Input placeholder="Nombre del cliente" maxLength={100} />
                    </Form.Item>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Tipo Identificación">
                  {esSoloLectura ? (
                    <Text>{data?.tipoIdentificacion}</Text>
                  ) : (
                    <Form.Item name="tipoIdentificacion" noStyle initialValue="RNC">
                      <Select style={{ width: '100%' }}
                        options={[
                          { value: 'RNC', label: 'RNC' },
                          { value: 'CEDULA', label: 'Cédula' },
                          { value: 'PASAPORTE', label: 'Pasaporte' },
                        ]}
                      />
                    </Form.Item>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Identificación">
                  {esSoloLectura ? (
                    <Text>{data?.identificacion}</Text>
                  ) : (
                    <Form.Item name="identificacion" noStyle>
                      <Input placeholder="Número de ID" maxLength={20} />
                    </Form.Item>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Teléfono">
                  {esSoloLectura ? (
                    <Text>{data?.telefono}</Text>
                  ) : (
                    <Form.Item name="telefono" noStyle>
                      <Input placeholder="Teléfono" maxLength={20} />
                    </Form.Item>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Teléfono Adicional">
                  {esSoloLectura ? (
                    <Text>{data?.telefonoAdicional}</Text>
                  ) : (
                    <Form.Item name="telefonoAdicional" noStyle>
                      <Input placeholder="Teléfono adicional" maxLength={20} />
                    </Form.Item>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {esSoloLectura ? (
                    <Text>{data?.correoElectronico}</Text>
                  ) : (
                    <Form.Item name="correoElectronico" noStyle>
                      <Input placeholder="correo@ejemplo.com" maxLength={80} />
                    </Form.Item>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Dirección">
                  {esSoloLectura ? (
                    <Text>{data?.direccion}</Text>
                  ) : (
                    <Form.Item name="direccion" noStyle>
                      <Input.TextArea placeholder="Dirección del cliente" rows={2} maxLength={200} />
                    </Form.Item>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Sexo">
                  {esSoloLectura ? (
                    <Text>{SEXO_LABEL[data?.sexo ?? -1] || '-'}</Text>
                  ) : (
                    <Form.Item name="sexo" noStyle>
                      <Select style={{ width: '100%' }} allowClear placeholder="Seleccione sexo"
                        options={[
                          { value: 0, label: 'Masculino' },
                          { value: 1, label: 'Femenino' },
                        ]}
                      />
                    </Form.Item>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Estado Civil">
                  {esSoloLectura ? (
                    <Text>{ESTADO_CIVIL_LABEL[data?.estadoCivil ?? -1] || '-'}</Text>
                  ) : (
                    <Form.Item name="estadoCivil" noStyle>
                      <Select style={{ width: '100%' }} allowClear placeholder="Seleccione estado civil"
                        options={[
                          { value: 0, label: 'Soltero(a)' },
                          { value: 1, label: 'Casado(a)' },
                          { value: 2, label: 'Divorciado(a)' },
                          { value: 3, label: 'Viudo(a)' },
                          { value: 4, label: 'Unión Libre' },
                        ]}
                      />
                    </Form.Item>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha Nacimiento">
                  {esSoloLectura ? (
                    <Text>{data?.fechaNacimiento}</Text>
                  ) : (
                    <Form.Item name="fechaNacimiento" noStyle>
                      <Input placeholder="YYYY-MM-DD" maxLength={10} />
                    </Form.Item>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Nota">
                  {esSoloLectura ? (
                    <Text>{data?.nota}</Text>
                  ) : (
                    <Form.Item name="nota" noStyle>
                      <Input.TextArea placeholder="Notas del cliente" rows={2} maxLength={500} />
                    </Form.Item>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Activo">
                  {esSoloLectura ? (
                    <Tag color={data?.activo ? 'green' : 'default'}>{data?.activo ? 'Activo' : 'Inactivo'}</Tag>
                  ) : (
                    <Form.Item name="activo" noStyle valuePropName="checked" initialValue={true}>
                      <Switch checkedChildren="Sí" unCheckedChildren="No" />
                    </Form.Item>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Datos Financieros */}
            <Card title="Datos Financieros" className="paces-card">
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="Límite Crédito">
                  {esSoloLectura ? (
                    <Text>{typeof data?.limiteCredito === 'number' ? data.limiteCredito.toLocaleString('es-DO', { minimumFractionDigits: 2 }) : '0.00'}</Text>
                  ) : (
                    <Form.Item name="limiteCredito" noStyle initialValue={0}>
                      <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                    </Form.Item>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Días Crédito">
                  {esSoloLectura ? (
                    <Text>{data?.diasCredito ?? 0}</Text>
                  ) : (
                    <Form.Item name="diasCredito" noStyle initialValue={0}>
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="% Descuento">
                  {esSoloLectura ? (
                    <Text>{typeof data?.porcientoDescuento === 'number' ? data.porcientoDescuento.toLocaleString('es-DO', { minimumFractionDigits: 2 }) : '0.00'}</Text>
                  ) : (
                    <Form.Item name="porcientoDescuento" noStyle initialValue={0}>
                      <InputNumber min={0} max={100} step={0.01} style={{ width: '100%' }} />
                    </Form.Item>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Margen">
                  {esSoloLectura ? (
                    <Text>{typeof data?.margen === 'number' ? data.margen.toLocaleString('es-DO', { minimumFractionDigits: 2 }) : '0.00'}</Text>
                  ) : (
                    <Form.Item name="margen" noStyle initialValue={0}>
                      <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                    </Form.Item>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Crédito Suspendido">
                  {esSoloLectura ? (
                    <Text>{data?.creditoSuspendido ? 'Sí' : 'No'}</Text>
                  ) : (
                    <Form.Item name="creditoSuspendido" noStyle valuePropName="checked">
                      <Switch checkedChildren="Sí" unCheckedChildren="No" />
                    </Form.Item>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Exento Impuesto">
                  {esSoloLectura ? (
                    <Text>{data?.exentoImpuesto ? 'Sí' : 'No'}</Text>
                  ) : (
                    <Form.Item name="exentoImpuesto" noStyle valuePropName="checked">
                      <Switch checkedChildren="Sí" unCheckedChildren="No" />
                    </Form.Item>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} lg={16}>
            {/* Tabs laterales */}
            <Card className="paces-card">
              <Tabs defaultActiveKey="laborales" type="card" items={tabItems} />
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

const ClienteDetalleWithBoundary: React.FC = () => (
  <ErrorBoundary>
    <ClienteDetalle />
  </ErrorBoundary>
);

export default ClienteDetalleWithBoundary;
