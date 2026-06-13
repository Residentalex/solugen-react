import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Checkbox,
  Spin,
  message,
  Tag,
  Space,
  Typography,
  Alert,
  Modal,
} from 'antd';
import { SaveOutlined, CloseOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { Sucursal } from '../../types/auth';
import { pantallaApi } from '../../api/pantallaApi';
import { permisoEspecialApi } from '../../api/permisoEspecialApi';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import PermissionGate from '../../components/PermissionGate';
import type { PantallaDTO, PantallaEntidadDTO, ModuloDTO, EntidadDocumentoDTO, PermisoEspecialConAsignacionDTO } from '../../types/auth';
import type { AccionDTO } from '../../types/administracion';

const { Text } = Typography;

const OPCIONES_GRUPO = [
  'Maestros',
  'Operaciones',
  'Reportes',
  'Procesos',
  'Configuracion',
  'POS',
  'Equipos',
];

const SUCURSAL_SEGURIDAD = Sucursal.Consolidado;

const PantallaFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const esEditar = Boolean(id);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.usuario?.sucursalActiva);

  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [data, setData] = useState<PantallaDTO | null>(null);

  // Catálogos
  const [modulosCatalogo, setModulosCatalogo] = useState<ModuloDTO[]>([]);
  const [accionesCatalogo, setAccionesCatalogo] = useState<AccionDTO[]>([]);
  const [entidadesCatalogo, setEntidadesCatalogo] = useState<EntidadDocumentoDTO[]>([]);
  const [catalogosLoading, setCatalogosLoading] = useState(false);
  const navigationConfirmedRef = useFormularioNavigation();

  // Acciones seleccionadas
  const [selectedAcciones, setSelectedAcciones] = useState<string[]>([]);

  // Entidades seleccionadas
  const [entidadesSeleccion, setEntidadesSeleccion] = useState<PantallaEntidadDTO[]>([]);

  // Permisos especiales
  const [permisosEspecialesCatalogo, setPermisosEspecialesCatalogo] = useState<PermisoEspecialConAsignacionDTO[]>([]);
  const [selectedPermisosEspeciales, setSelectedPermisosEspeciales] = useState<number[]>([]);

  const [form] = Form.useForm();

  const cargarCatalogos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setCatalogosLoading(true);
    try {
      const [modulos, acciones, entidades] = await Promise.all([
        pantallaApi.obtenerModulos(sucursalActiva),
        pantallaApi.obtenerAcciones(sucursalActiva),
        pantallaApi.obtenerEntidadesCatalogo(sucursalActiva),
      ]);
      setModulosCatalogo(modulos || []);
      setAccionesCatalogo(acciones || []);
      setEntidadesCatalogo(entidades || []);
    } catch {
      setLoadingError(true);
    } finally {
      setCatalogosLoading(false);
    }
  }, [sucursalActiva]);

  const cargarPermisosPorPantalla = async (pantallaId: number) => {
    try {
      const result = await permisoEspecialApi.obtenerPorPantalla(SUCURSAL_SEGURIDAD, pantallaId);
      setPermisosEspecialesCatalogo(result || []);
      setSelectedPermisosEspeciales(
        (result || []).filter(p => p.asignado).map(p => p.id)
      );
    } catch {
      // no crítico
    }
  };

  const cargarPantalla = useCallback(async (pantallaId: number) => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    setLoadingError(false);
    try {
      const res = await pantallaApi.obtenerPorId(sucursalActiva, pantallaId);
      setData(res);
      form.setFieldsValue({
        codigo: res.codigo,
        nombre: res.nombre,
        tipo: res.tipo,
        modulos: res.modulos?.map((m) => m.id) || [],
        grupo: res.grupo,
        ruta: res.ruta,
        orden: res.orden,
        esReporte: res.esReporte,
        activo: res.activo,
      });
      setSelectedAcciones(res.acciones || []);
      setEntidadesSeleccion(res.entidades?.map((e) => ({ ...e })) || []);
      cargarPermisosPorPantalla(pantallaId);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar pantalla');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, form]);

  useEffect(() => {
    setActiveModule('MPantalla');
    updateToolbar({});
    cargarCatalogos();
    if (id) cargarPantalla(parseInt(id));
    else {
      form.setFieldsValue({ activo: true, esReporte: false, orden: 0, modulos: [] });
      setSelectedAcciones(['VISUALIZAR']);
      setEntidadesSeleccion([]);
    }
    return () => resetToolbar();
  }, [id, setActiveModule, updateToolbar, resetToolbar, cargarCatalogos, cargarPantalla, form]);

  const handleEntidadesChange = (selectedCodes: string[]) => {
    setEntidadesSeleccion((prev) =>
      selectedCodes.map((codigo, index) => {
        const existing = prev.find((e) => e.entidadCodigo === codigo);
        return existing || { id: 0, entidadCodigo: codigo, tipoEntidad: undefined, orden: index };
      }),
    );
  };

  const handleTipoEntidadChange = (index: number, value: string | undefined) => {
    setEntidadesSeleccion((prev) =>
      prev.map((e, i) => (i === index ? { ...e, tipoEntidad: value || undefined } : e)),
    );
  };

  const guardar = async () => {
    try {
      const values = await form.validateFields();
      if (sucursalActiva === undefined) return;
      setGuardando(true);

      const payload: PantallaDTO = {
        id: data?.id || 0,
        codigo: values.codigo,
        nombre: values.nombre,
        ruta: values.ruta || '',
        tipo: values.tipo || '',
        grupo: values.grupo || '',
        orden: values.orden ?? 0,
        esReporte: values.esReporte ?? false,
        activo: values.activo ?? true,
        modulos: (values.modulos || []).map((modId: number) => ({ id: modId, nombre: '', orden: 0 })),
        acciones: selectedAcciones,
      };

      let pantallaId: number;
      if (esEditar && data) {
        await pantallaApi.actualizar(sucursalActiva, payload);
        pantallaId = data.id;
        message.success('Pantalla actualizada correctamente');
      } else {
        const creada = await pantallaApi.crear(sucursalActiva, payload);
        pantallaId = creada.id;
        message.success('Pantalla creada correctamente');
      }

      // Asociar entidades después de guardar la pantalla
      if (entidadesSeleccion.length > 0) {
        await pantallaApi.asociarEntidades(sucursalActiva, pantallaId, entidadesSeleccion);
      } else if (esEditar && data && data.entidades && data.entidades.length > 0) {
        await pantallaApi.eliminarEntidades(sucursalActiva, pantallaId);
      }

      // Asignar permisos especiales
      await permisoEspecialApi.asignarAPantalla(SUCURSAL_SEGURIDAD, pantallaId, selectedPermisosEspeciales);

      navigationConfirmedRef.current = true;
      navigate(`/MPantalla/${pantallaId}`);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar pantalla');
    } finally {
      setGuardando(false);
    }
  };

  const handleCancelar = () => {
    Modal.confirm({
      title: 'Cancelar',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro que desea cancelar los cambios realizados?',
      okText: 'Si, cancelar',
      cancelText: 'No, continuar editando',
      okButtonProps: { danger: true },
      onOk: () => {
        navigationConfirmedRef.current = true;
        if (esEditar && data) navigate(`/MPantalla/${data.id}`);
        else navigate('/MPantalla');
      },
    });
  };

  if (esEditar && loading) {
    return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  }
  if (esEditar && loadingError) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Alert message="Error al cargar la pantalla" type="error" showIcon style={{ marginBottom: 16 }} />
        <Button onClick={() => navigate('/MPantalla')}>Volver a pantallas</Button>
      </div>
    );
  }
  if (esEditar && !data) return null;

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle de pantalla"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={() => id && cargarPantalla(parseInt(id))}>Reintentar</Button>}
        />
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          {esEditar ? `Editar Pantalla: ${data?.codigo || ''}` : 'Nueva Pantalla'}
        </h4>
        <Space>
          <PermissionGate accion={esEditar ? 'EDITAR' : 'CREAR'}>
            <Button type="primary" icon={<SaveOutlined />} onClick={guardar} loading={guardando}>
              Guardar
            </Button>
          </PermissionGate>
          <Button icon={<CloseOutlined />} onClick={handleCancelar} disabled={guardando}>
            Cancelar
          </Button>
        </Space>
      </div>

      {/* Datos Generales */}
      <Form form={form} layout="vertical" size="small" style={{ marginBottom: 16 }}>
      <Card title="Datos Generales" style={{ borderRadius: 8, marginBottom: 0 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="codigo"
                label="Código"
                rules={[{ required: true, message: 'El código es obligatorio' }]}
              >
                <Input placeholder="Ej. MPantalla" maxLength={30} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="nombre"
                label="Nombre"
                rules={[{ required: true, message: 'El nombre es obligatorio' }]}
              >
                <Input placeholder="Ej. Pantallas del Sistema" maxLength={100} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="tipo" label="Tipo">
                <Select placeholder="Seleccione tipo" allowClear>
                  {['MAESTRO', 'DOCUMENTO', 'CONFIGURACION', 'CONSULTA', 'OPERACION', 'REPORTE', 'ENCABEZADO'].map((t) => (
                    <Select.Option key={t} value={t}>{t}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="grupo" label="Grupo">
                <Select placeholder="Seleccione grupo" allowClear>
                  {OPCIONES_GRUPO.map((g) => (
                    <Select.Option key={g} value={g}>{g}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="orden" label="Orden">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="ruta" label="Ruta">
                <Input placeholder="Ej. /admin/pantallas" maxLength={200} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} lg={4}>
              <Form.Item name="activo" label="Activo" valuePropName="checked" initialValue={true}>
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} lg={4}>
              <Form.Item name="esReporte" label="¿Es reporte?" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
      </Card>

      {/* Módulos */}
      <Card title="Módulos" style={{ borderRadius: 8, marginBottom: 16, marginTop: 16 }}>
          <Form.Item name="modulos" label="Módulos">
            <Select
              mode="multiple"
              placeholder="Seleccione módulos"
              showSearch
              optionFilterProp="children"
              loading={catalogosLoading}
            >
              {modulosCatalogo.map((m) => (
                <Select.Option key={m.id} value={m.id}>
                  {m.nombre}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Card>

      {/* Acciones de la Pantalla */}
      <Card title="Acciones de la Pantalla" style={{ borderRadius: 8, marginBottom: 16 }}>
        {accionesCatalogo.length === 0 && !catalogosLoading ? (
          <Text type="secondary">No hay acciones disponibles. Consulte con su administrador.</Text>
        ) : (
          <Checkbox.Group
            value={selectedAcciones}
            onChange={(checkedValues) => setSelectedAcciones(checkedValues as string[])}
          >
            <Row gutter={[16, 8]}>
              {accionesCatalogo.map((accion) => (
                <Col xs={12} sm={8} md={6} lg={4} key={accion.codigo}>
                  <Checkbox value={accion.codigo}>{accion.nombre}</Checkbox>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        )}
      </Card>

      {/* Permisos Especiales */}
      <Card title="Permisos Especiales" style={{ borderRadius: 8, marginBottom: 16 }}>
        {!esEditar ? (
          <Text type="secondary">Los permisos especiales se asignan después de crear la pantalla.</Text>
        ) : permisosEspecialesCatalogo.length === 0 ? (
          <Text type="secondary">No hay permisos especiales disponibles.</Text>
        ) : (
          <Checkbox.Group
            value={selectedPermisosEspeciales}
            onChange={(checkedValues) => setSelectedPermisosEspeciales(checkedValues as number[])}
          >
            <Row gutter={[16, 8]}>
              {permisosEspecialesCatalogo
                .filter(p => p.activo)
                .map((permiso) => (
                  <Col xs={12} sm={8} md={6} lg={4} key={permiso.id}>
                    <Checkbox value={permiso.id}>
                      {permiso.nombre || permiso.codigo}
                    </Checkbox>
                  </Col>
                ))}
            </Row>
          </Checkbox.Group>
        )}
      </Card>

      {/* Entidades/Documentos Asociados */}
      <Card title="Entidades/Documentos Asociados" style={{ borderRadius: 8, marginBottom: 16 }}>
        <Select
          mode="multiple"
          placeholder="Seleccione entidades/documentos"
          style={{ width: '100%' }}
          value={entidadesSeleccion.map((e) => e.entidadCodigo)}
          onChange={handleEntidadesChange}
          loading={catalogosLoading}
          filterOption={(input, option) =>
            (option?.label as string)?.toLowerCase()?.includes(input.toLowerCase()) ?? false
          }
          options={entidadesCatalogo.map((e) => ({
            value: e.codigo,
            label: `${e.codigo} - ${e.descripcion}`,
          }))}
        />

        {entidadesSeleccion.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {entidadesSeleccion.map((ent, index) => (
              <div
                key={ent.entidadCodigo}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 4,
                  padding: '4px 0',
                }}
              >
                <Tag>{ent.entidadCodigo}</Tag>
                <Select
                  style={{ width: 140 }}
                  placeholder="Tipo (opcional)"
                  allowClear
                  value={ent.tipoEntidad}
                  onChange={(val) => handleTipoEntidadChange(index, val)}
                  options={[
                    { value: 'CLI', label: 'Cliente' },
                    { value: 'SUP', label: 'Suplidor' },
                  ]}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Orden: {ent.orden}
                </Text>
              </div>
            ))}
          </div>
        )}
      </Card>
      </Form>
    </div>
  );
};

export default PantallaFormulario;
