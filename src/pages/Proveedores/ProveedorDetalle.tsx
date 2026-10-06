import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, message, Form, Input, Switch, Row, Col, Typography,
  Tabs, Descriptions, InputNumber, Tag, Grid, Divider, 
} from 'antd';
import { Select } from '../../components/Select';
import { IdcardOutlined, PhoneOutlined, EnvironmentOutlined } from '@ant-design/icons';
import FormularioToolbar from '../../components/FormularioToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { proveedorApi } from '../../api/proveedorApi';
import { apiClient } from '../../api/client';
import type { SuplidorDTO } from '../../types/entradaAlmacen';
import type { CategoriaEntidadDTO } from '../../types/facturacion';
import type { MonedaDTO } from '../../types/contabilidad';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import EntidadContactosTab from '../../components/EntidadContactosTab';
import EntidadCuentasBancariasTab from '../../components/EntidadCuentasBancariasTab';
import EntidadGruposProductosTab from '../../components/EntidadGruposProductosTab';
import TabProximamente from '../../components/TabProximamente';
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
  const [guardando, setGuardando] = useState(false);
  const [categorias, setCategorias] = useState<CategoriaEntidadDTO[]>([]);
  const [monedas, setMonedas] = useState<MonedaDTO[]>([]);
  const [form] = Form.useForm();
  const esNuevo = !codigo || codigo === 'nuevo';

  // Permisos
  const usuario = useAuthStore((s: any) => s.usuario);
  const pantallaActual = usuario?.pantallas.find((p: any) => p.codigo === 'MSUP');
  const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;

  useEffect(() => {
    setActiveModule('MSUP');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  // La categoria define el prefijo del codigo del proveedor, por eso solo
  // se necesita en el alta (PL/PI/PS/IC segun DCLASIFIC de ENTDOC 'SUP').
  useEffect(() => {
    if (!esNuevo) return;
    const controller = new AbortController();
    apiClient
      .get(`/categoriaentidad/${sucursalActiva}/tipo/SUP`)
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setCategorias(data?.data ?? []);
      })
      .catch((err: any) => {
        if (controller.signal.aborted) return;
        // Catalogo auxiliar: no bloquea el alta, pero no se oculta el fallo.
        console.error('Error al cargar categorias de proveedor:', err?.response?.data?.errorMessage ?? err);
      });
    return () => controller.abort();
  }, [esNuevo, sucursalActiva]);

  // Moneda del proveedor (SUPLIDORES.CODMON). Se usa tanto en el alta como en
  // la edicion, por eso se carga siempre.
  useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get(`/Moneda/${sucursalActiva}`)
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setMonedas(data?.data ?? []);
      })
      .catch((err: any) => {
        if (controller.signal.aborted) return;
        console.error('Error al cargar monedas:', err?.response?.data?.errorMessage ?? err);
      });
    return () => controller.abort();
  }, [sucursalActiva]);

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
          moneda: res.moneda?.codigo,
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
    if (guardando) return;
    try {
      const values = await form.validateFields();
      setGuardando(true);
      const payload = {
        codigo: esNuevo ? '' : codigo,
        nombre: values.nombre,
        identificacion: values.identificacion,
        telefono: values.telefono || '',
        direccion: values.direccion || '',
        beneficiario: values.beneficiario || '',
        diasCredito: values.diasCredito ?? 0,
        requiereORC: values.requiereORC ?? false,
        categoria: esNuevo && values.categoria ? { codigo: values.categoria } : data?.categoria,
        moneda: values.moneda ? { codigo: values.moneda } : data?.moneda,
      } as SuplidorDTO;

      if (!esNuevo && data) {
        await proveedorApi.actualizar(sucursalActiva, { ...data, ...payload });
        message.success('Proveedor actualizado correctamente');
      } else {
        const creado = await proveedorApi.crear(sucursalActiva, payload);
        message.success('Proveedor creado correctamente');
        navigate(`/MSUP/${creado.codigo}`);
        return;
      }
      navigate('/MSUP');
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar proveedor');
    } finally {
      setGuardando(false);
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
            <Input placeholder="Nombre del proveedor" maxLength={60} />
          </Form.Item>
        ) : <Text>{data?.nombre || '-'}</Text>, isLarge ? 2 : 1)}
        {renderCampo('Categoría', esNuevo ? (
          <Form.Item name="categoria" noStyle rules={[{ required: true, message: 'Obligatorio' }]}>
            <Select
              placeholder="Seleccione la categoría"
              loading={categorias.length === 0}
              options={categorias.map((c) => ({ value: c.codigo, label: `${c.codigo} - ${c.nombre}` }))}
            />
          </Form.Item>
        ) : <Text>{data?.categoria?.codigo ? `${data.categoria.codigo} - ${data.categoria.nombre}` : '-'}</Text>)}
        {renderCampo('Moneda', editando ? (
          <Form.Item name="moneda" noStyle>
            <Select
              placeholder={monedas.length === 0 ? 'Sin catálogo de monedas' : 'Seleccione la moneda'}
              loading={monedas.length === 0}
              allowClear
              options={monedas.map((m) => ({
                value: m.codigo,
                label: `${m.codigo} - ${m.nombre}${m.simbolo ? ` (${m.simbolo})` : ''}`,
              }))}
            />
          </Form.Item>
        ) : <Text>{data?.moneda ? `${data.moneda.codigo} - ${data.moneda.nombre}` : 'Moneda por defecto'}</Text>)}
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
            <Input placeholder="Dirección" maxLength={80} />
          </Form.Item>
        ) : <span><EnvironmentOutlined style={{ color: '#556ee6', marginRight: 6 }} />{toTitleCase(data?.direccion || '-')}</span>, isLarge ? 3 : 1)}
        {renderCampo('Beneficiario', editando ? (
          <Form.Item name="beneficiario" noStyle>
            <Input placeholder="Beneficiario" maxLength={60} />
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

  const renderTabs = () => (
    <Tabs
      defaultActiveKey="resumen"
      type="card"
      items={[
        {
          key: 'resumen',
          label: 'Resumen',
          children: <div style={{ padding: 16 }}><Text>Detalle del proveedor cargado.</Text></div>,
        },
        ...(!esNuevo && codigo
          ? [
              {
                key: 'contactos',
                label: 'Contactos',
                children: <EntidadContactosTab codigoEntidad={codigo} tipoEntidad="SUP" />,
              },
              {
                key: 'bancos',
                label: 'Cuentas Bancarias',
                children: <EntidadCuentasBancariasTab codigoEntidad={codigo} sucursal={sucursalActiva} />,
              },
              {
                key: 'grupos',
                label: 'Grupos de Productos',
                children: <EntidadGruposProductosTab codigoEntidad={codigo} sucursal={sucursalActiva} />,
              },
              {
                key: 'movimientos',
                label: 'Movimientos',
                children: (
                  <TabProximamente
                    titulo="Módulo de Movimientos"
                    descripcion="Aquí se mostrarán las últimas transacciones del proveedor: facturas, notas de crédito y pagos."
                  />
                ),
              },
              {
                key: 'facturacion',
                label: 'Facturación',
                children: (
                  <TabProximamente
                    titulo="Módulo de Facturación"
                    descripcion="Aquí se mostrarán los documentos de facturación asociados al proveedor."
                  />
                ),
              },
            ]
          : []),
      ]}
    />
  );

  const renderFormulario = () => (
    <>
      {editando && (
        <FormularioToolbar
          saving={guardando}
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
              <div style={{ padding: '0 16px' }}>{renderTabs()}</div>
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
            {renderTabs()}
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
      modo={esNuevo ? 'crear' : 'editar'}
      onEditar={!esNuevo && !editando && puedeEditar ? () => setEditando(true) : undefined}
      guardando={guardando}
    >
      {renderFormulario()}
    </DetalleCatalogoLayout>
  );
};

export default ProveedorDetalle;
