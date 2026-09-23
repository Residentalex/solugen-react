import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, message, Form, Input, Switch, Row, Col, Typography,
  Tabs, Descriptions, InputNumber, Tag, Grid, Divider,
} from 'antd';
import { IdcardOutlined, PhoneOutlined, EnvironmentOutlined } from '@ant-design/icons';
import FormularioToolbar from '../../components/FormularioToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { proveedorApi } from '../../api/proveedorApi';
import { apiClient } from '../../api/client';
import type { SuplidorDTO } from '../../types/entradaAlmacen';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import { toTitleCase } from '../../utils/formats';

const { Text, Link } = Typography;

const ProveedorDetalle: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();
  const isLarge = screens.xxl === true;

  const [data, setData] = useState<SuplidorDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form] = Form.useForm();
  const esNuevo = !codigo || codigo === 'nuevo';

  useEffect(() => {
    setActiveModule('MSUP');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (esNuevo) {
      setData({} as SuplidorDTO);
      setPageTitleOverride('Nuevo Proveedor');
      form.setFieldsValue({ activo: true, requiereORC: false, diasCredito: 0 });
      setEditando(true);
      return;
    }
    if (!codigo) return;
    const abortController = new AbortController();
    setLoading(true);
    setLoadingError(false);
    proveedorApi.obtenerPorCodigo(sucursalActiva, codigo)
      .then((res) => {
        if (abortController.signal.aborted) return;
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(res.nombre || codigo);
        form.setFieldsValue({
          nombre: res.nombre,
          identificacion: res.identificacion,
          telefono: res.telefono,
          direccion: res.direccion,
          beneficiario: res.beneficiario,
          diasCredito: res.diasCredito,
          requiereORC: res.requiereORC,
          idExterno: res.idExterno,
        });
      })
      .catch((err: any) => {
        if (err?.name === 'CanceledError' || abortController.signal.aborted) return;
        message.error(err?.response?.data?.errorMessage || 'Error al cargar proveedor');
        setLoadingError(true);
      })
      .finally(() => {
        if (!abortController.signal.aborted) setLoading(false);
      });
    return () => abortController.abort();
  }, [codigo, sucursalActiva, setPageTitleOverride, form]);

  const handleVolver = useCallback(() => navigate('/MSUP'), [navigate]);

  const handleCancelar = useCallback(() => {
    setEditando(false);
    if (esNuevo) navigate('/MSUP');
    else form.resetFields();
  }, [navigate, esNuevo, form]);

  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        nombre: values.nombre,
        identificacion: values.identificacion,
        telefono: values.telefono,
        direccion: values.direccion,
        beneficiario: values.beneficiario,
        diasCredito: values.diasCredito ?? 0,
        requiereORC: values.requiereORC ?? false,
        idExterno: values.idExterno || '',
        codigo: values.codigo,
      } as any;
      if (esNuevo) {
        await apiClient.post('/Proveedor', payload);
        message.success('Proveedor creado');
      } else {
        await apiClient.put(`/Proveedor/${codigo}`, payload);
        message.success('Proveedor actualizado');
      }
      navigate('/MSUP');
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al guardar proveedor');
    }
  };

  const renderCampo = (nombre: string, children: React.ReactNode, span?: number) => (
    <Descriptions.Item label={nombre} {...(span ? { span } : {})}>
      {children}
    </Descriptions.Item>
  );

  const renderReadonlyTag = (activo?: boolean | null) => (
    <Tag color={activo ? 'warning' : 'default'}>{activo ? 'Sí' : 'No'}</Tag>
  );

  const renderDatosGenerales = () => (
    <Card title="Datos Generales" className="paces-card" style={{ marginBottom: 16 }}>
      <Descriptions bordered size="small" column={isLarge ? 3 : 1} styles={{ content: { background: 'transparent' } }}>
        {renderCampo('Nombre', editando ? (
          <Form.Item name="nombre" noStyle rules={[{ required: true, message: 'Obligatorio' }]}>
            <Input placeholder="Nombre del proveedor" maxLength={100} />
          </Form.Item>
        ) : <Text>{data?.nombre || '-'}</Text>, isLarge ? 2 : 1)}
        {renderCampo('Código', editando ? (
          <Form.Item name="codigo" noStyle>
            <Input disabled placeholder="Autogenerado" />
          </Form.Item>
        ) : <Text style={{ fontFamily: 'monospace' }}>{data?.codigo || '-'}</Text>)}
        {renderCampo('Identificación', editando ? (
          <Form.Item name="identificacion" noStyle rules={[{ required: true, message: 'Obligatorio' }]}>
            <Input placeholder="Identificación" maxLength={20} />
          </Form.Item>
        ) : <span><IdcardOutlined style={{ color: '#556ee6', marginRight: 6 }} />{data?.identificacion || '-'}</span>)}
        {renderCampo('Teléfono', editando ? (
          <Form.Item name="telefono" noStyle>
            <Input placeholder="Teléfono" maxLength={20} />
          </Form.Item>
        ) : <span><PhoneOutlined style={{ color: '#556ee6', marginRight: 6 }} />{data?.telefono || '-'}</span>)}
        {renderCampo('Dirección', editando ? (
          <Form.Item name="direccion" noStyle>
            <Input placeholder="Dirección" maxLength={200} />
          </Form.Item>
        ) : <span><EnvironmentOutlined style={{ color: '#556ee6', marginRight: 6 }} />{toTitleCase(data?.direccion || '-')}</span>, isLarge ? 3 : 1)}
        {renderCampo('Beneficiario', editando ? (
          <Form.Item name="beneficiario" noStyle>
            <Input placeholder="Beneficiario" maxLength={100} />
          </Form.Item>
        ) : <Text>{data?.beneficiario ? toTitleCase(data.beneficiario) : '-'}</Text>)}
        {renderCampo('Días Crédito', editando ? (
          <Form.Item name="diasCredito" noStyle initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        ) : <Text>{data?.diasCredito ? `${data.diasCredito} días` : '-'}</Text>)}
        {renderCampo('Requiere ORC', editando ? (
          <Form.Item name="requiereORC" noStyle valuePropName="checked" initialValue={false}>
            <Switch checkedChildren="Sí" unCheckedChildren="No" />
          </Form.Item>
        ) : renderReadonlyTag(data?.requiereORC))}
        {renderCampo('ID Externo', editando ? (
          <Form.Item name="idExterno" noStyle>
            <Input placeholder="ID Externo" maxLength={50} />
          </Form.Item>
        ) : <Text>{data?.idExterno || '-'}</Text>)}
      </Descriptions>
    </Card>
  );

  const renderComercial = () => (
    <Card title="Comercial / Financiero" className="paces-card" style={{ marginBottom: 16 }}>
      <Descriptions bordered size="small" column={2} styles={{ content: { background: 'transparent' } }}>
        {renderCampo('Días Crédito', editando ? (
          <Form.Item name="diasCredito" noStyle initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        ) : <Text>{data?.diasCredito ?? '-'}</Text>)}
        {renderCampo('Requiere ORC', editando ? (
          <Form.Item name="requiereORC" noStyle valuePropName="checked" initialValue={false}>
            <Switch checkedChildren="Sí" unCheckedChildren="No" />
          </Form.Item>
        ) : renderReadonlyTag(data?.requiereORC))}
      </Descriptions>
    </Card>
  );

  const renderSidebar = () => (
    <Card title="Resumen" className="paces-card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Nombre</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{toTitleCase(data?.nombre || '-')}</div>
        </div>
        <Divider style={{ margin: '4px 0' }} />
        <div>
          <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Identificación</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{data?.identificacion || '-'}</div>
        </div>
        <div>
          <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Días Crédito</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{data?.diasCredito ?? '-'}</div>
        </div>
        <div>
          <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Requiere ORC</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{data?.requiereORC ? 'Sí' : 'No'}</div>
        </div>
      </div>
    </Card>
  );

  const renderFormulario = () => (
    <>
      {editando && (
        <FormularioToolbar
          saving={false}
          mode={esNuevo ? 'crear' : 'editar'}
          onGuardar={handleGuardar}
          onCancelar={handleCancelar}
        />
      )}
      <Form form={form} layout="vertical" size="small">
      {isLarge ? (
        <Row gutter={16}>
          <Col xxl={18}>
            {renderDatosGenerales()}
            {renderComercial()}
            <Card className="paces-card" styles={{ body: { padding: 0 } }}>
              <Tabs defaultActiveKey="resumen" type="card" style={{ borderRadius: 8, padding: '0 16px' }} items={[
                { key: 'resumen', label: 'Resumen', children: <div style={{ padding: 16 }}><Text>Detalle del proveedor cargado.</Text></div> },
              ]} />
            </Card>
          </Col>
          <Col xxl={6}>
            {renderSidebar()}
          </Col>
        </Row>
      ) : (
        <div>
          {renderDatosGenerales()}
          {renderComercial()}
          <Card className="paces-card" style={{ marginTop: 24 }}>
            <Tabs defaultActiveKey="resumen" type="card" items={[
              { key: 'resumen', label: 'Resumen', children: <div style={{ padding: 16 }}><Text>Detalle del proveedor cargado.</Text></div> },
            ]} />
          </Card>
          <div style={{ marginTop: 24 }}>{renderSidebar()}</div>
        </div>
      )}
    </Form>
    </>
  );

  return (
    <DetalleCatalogoLayout
      rutaVolver="/MSUP"
      onVolver={handleVolver}
      loading={loading}
      mensajeLoading="Cargando proveedor..."
      loadingError={loadingError}
      mensajeError="Error al cargar detalle de proveedor"
      onRecargar={() => {
        setLoadingError(false);
        setLoading(true);
        proveedorApi.obtenerPorCodigo(sucursalActiva, codigo || '')
          .then((res) => {
            setData(res);
            setPageTitleOverride(res?.nombre || codigo);
          })
          .catch((err: any) => {
            message.error(err?.response?.data?.errorMessage || 'Error al recargar');
            setLoadingError(true);
          })
          .finally(() => setLoading(false));
      }}
      dataDisponible={!!data}
      modo={esNuevo ? 'crear' : (editando ? 'editar' : 'consultar')}
      guardando={false}
    >
      {renderFormulario()}
    </DetalleCatalogoLayout>
  );
};

export default ProveedorDetalle;
