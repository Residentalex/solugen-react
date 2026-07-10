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
  Table,
  Tooltip,
  Tabs,
  Empty,
} from 'antd';
import { ExclamationCircleOutlined, DeleteOutlined, FileTextOutlined, TagOutlined, SearchOutlined, PlusOutlined, CheckOutlined, InboxOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { Sucursal } from '../../types/auth';
import { pantallaApi } from '../../api/pantallaApi';
import { permisoEspecialApi } from '../../api/permisoEspecialApi';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import type { PantallaDTO, PantallaEntidadDTO, ModuloDTO, EntidadDocumentoDTO, PermisoEspecialConAsignacionDTO } from '../../types/auth';
import FormularioToolbar from '../../components/FormularioToolbar';
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

const PantallaFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const esEditar = Boolean(id);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.usuario?.sucursalActiva);
  const securitySucursal = useAuthStore((s) => s.securitySucursal);

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

  // Estados de la sección Entidades/Documentos Asociados
  const [tabActivo, setTabActivo] = useState<string>('documentos');
  const [busquedaDocs, setBusquedaDocs] = useState('');
  const [busquedaEnts, setBusquedaEnts] = useState('');

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
      const result = await permisoEspecialApi.obtenerPorPantalla(securitySucursal, pantallaId);
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
      await permisoEspecialApi.asignarAPantalla(securitySucursal, pantallaId, selectedPermisosEspeciales);

      navigationConfirmedRef.current = true;
      navigate(`/MPantalla/${pantallaId}`, { replace: true });
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
        if (esEditar && data) navigate(`/MPantalla/${data.id}`, { replace: true });
        else navigate('/MPantalla', { replace: true });
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
        <Button onClick={() => navigate('/MPantalla', { replace: true })}>Volver a pantallas</Button>
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

      <FormularioToolbar
        saving={guardando}
        mode={esEditar ? 'editar' : 'crear'}
        onGuardar={guardar}
        onCancelar={handleCancelar}
      />

      {/* Datos Generales */}
      <Form form={form} layout="vertical" size="small" style={{ marginBottom: 16 }}>
      <Card title="Datos Generales" className="paces-card" style={{ marginBottom: 16 }}>
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
      <Card title="Módulos" className="paces-card" style={{ marginBottom: 16 }}>
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
      </Form>

      {/* Acciones de la Pantalla */}
      <Card title="Acciones de la Pantalla" className="paces-card" style={{ marginBottom: 16 }}>
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
                  <Tooltip title={`Código: ${accion.codigo}`}>
                    <Checkbox value={accion.codigo}>{accion.nombre}</Checkbox>
                  </Tooltip>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        )}
      </Card>

      {esEditar && (
        <Card title="Permisos Especiales" className="paces-card" style={{ marginBottom: 16 }}>
          {permisosEspecialesCatalogo.length === 0 ? (
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
      )}

      {!esEditar && (
        <Alert
          message="Los permisos especiales se asignan después de guardar la pantalla."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Entidades/Documentos Asociados */}
      <Card title="Entidades/Documentos Asociados" className="paces-card" style={{ marginBottom: 16 }}>
        <Row gutter={[24, 16]}>
          {/* ZONA A — Selector */}
          <Col xs={24} lg={10}>
            <Tabs
              type="line"
              activeKey={tabActivo}
              onChange={setTabActivo}
              items={[
                {
                  key: 'documentos',
                  label: <span><FileTextOutlined /> Documentos ({entidadesCatalogo.filter(e => e.tipo === 'D').length})</span>,
                  children: (
                    <div>
                      <Input
                        placeholder="Buscar documento..."
                        prefix={<SearchOutlined />}
                        allowClear
                        size="small"
                        style={{ marginBottom: 8 }}
                        value={busquedaDocs}
                        onChange={(e) => setBusquedaDocs(e.target.value)}
                      />
                      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                        {entidadesCatalogo
                          .filter(e => e.tipo === 'D')
                          .filter(e => !busquedaDocs || e.codigo.toLowerCase().includes(busquedaDocs.toLowerCase()) || e.descripcion.toLowerCase().includes(busquedaDocs.toLowerCase()))
                          .sort((a, b) => a.codigo.localeCompare(b.codigo))
                          .map(e => {
                            const yaSeleccionado = entidadesSeleccion.some(s => s.entidadCodigo === e.codigo);
                            return (
                              <div key={e.codigo}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 4, marginBottom: 2, cursor: 'default' }}
                                className="paces-row-hover"
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                                  <FileTextOutlined style={{ color: '#556ee6', flexShrink: 0 }} />
                                  <div style={{ overflow: 'hidden' }}>
                                    <Text style={{ fontSize: 13 }}>{e.codigo}</Text>
                                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 6, display: 'inline-block' }} ellipsis>{e.descripcion}</Text>
                                  </div>
                                </div>
                                {yaSeleccionado ? (
                                  <Button type="text" size="small" disabled icon={<CheckOutlined style={{ color: '#34c38f' }} />} />
                                ) : (
                                  <Button type="link" size="small" icon={<PlusOutlined />}
                                    onClick={() => setEntidadesSeleccion(prev => [...prev, { id: 0, entidadCodigo: e.codigo, tipoEntidad: undefined, orden: prev.length + 1 }])}
                                  />
                                )}
                              </div>
                            );
                          })}
                        {entidadesCatalogo.filter(e => e.tipo === 'D').length === 0 && (
                          <Empty description="Cargando..." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'entidades',
                  label: <span><TagOutlined style={{ color: '#f1734f' }} /> Entidades ({entidadesCatalogo.filter(e => e.tipo === 'E').length})</span>,
                  children: (
                    <div>
                      <Input
                        placeholder="Buscar entidad..."
                        prefix={<SearchOutlined />}
                        allowClear
                        size="small"
                        style={{ marginBottom: 8 }}
                        value={busquedaEnts}
                        onChange={(e) => setBusquedaEnts(e.target.value)}
                      />
                      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                        {entidadesCatalogo
                          .filter(e => e.tipo === 'E')
                          .filter(e => !busquedaEnts || e.codigo.toLowerCase().includes(busquedaEnts.toLowerCase()) || e.descripcion.toLowerCase().includes(busquedaEnts.toLowerCase()))
                          .sort((a, b) => a.codigo.localeCompare(b.codigo))
                          .map(e => {
                            const yaSeleccionado = entidadesSeleccion.some(s => s.entidadCodigo === e.codigo);
                            return (
                              <div key={e.codigo}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 4, marginBottom: 2, cursor: 'default' }}
                                className="paces-row-hover"
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                                  <TagOutlined style={{ color: '#f1734f', flexShrink: 0 }} />
                                  <div style={{ overflow: 'hidden' }}>
                                    <Text style={{ fontSize: 13 }}>{e.codigo}</Text>
                                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 6, display: 'inline-block' }} ellipsis>{e.descripcion}</Text>
                                  </div>
                                </div>
                                {yaSeleccionado ? (
                                  <Button type="text" size="small" disabled icon={<CheckOutlined style={{ color: '#34c38f' }} />} />
                                ) : (
                                  <Button type="link" size="small" icon={<PlusOutlined />}
                                    onClick={() => setEntidadesSeleccion(prev => [...prev, { id: 0, entidadCodigo: e.codigo, tipoEntidad: undefined, orden: prev.length + 1 }])}
                                  />
                                )}
                              </div>
                            );
                          })}
                        {entidadesCatalogo.filter(e => e.tipo === 'E').length === 0 && (
                          <Empty description="Cargando..." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        )}
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </Col>

          {/* ZONA B — Lista de seleccionados */}
          <Col xs={24} lg={14}>
            <Text strong style={{ fontSize: 14 }}>Asociaciones configuradas</Text>
            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>· {entidadesSeleccion.length} ítems</Text>
            
            {entidadesSeleccion.length === 0 ? (
              <div style={{ marginTop: 16 }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Sin asociaciones configuradas"
                />
              </div>
            ) : (
              <>
                <Table
                  dataSource={entidadesSeleccion}
                  rowKey="entidadCodigo"
                  size="small"
                  pagination={false}
                  className="paces-list-table"
                  style={{ marginTop: 8 }}
                  columns={[
                    {
                      title: 'Código',
                      dataIndex: 'entidadCodigo',
                      width: 200,
                      render: (codigo: string, record: PantallaEntidadDTO) => {
                        const entidad = entidadesCatalogo.find(e => e.codigo === codigo);
                        const esDocumento = entidad?.tipo === 'D';
                        return (
                          <span>
                            {esDocumento ? (
                              <FileTextOutlined style={{ color: '#556ee6', marginRight: 6 }} />
                            ) : (
                              <TagOutlined style={{ color: '#f1734f', marginRight: 6 }} />
                            )}
                            <Text code>{codigo}</Text>
                            {entidad && <Text type="secondary" style={{ marginLeft: 6, fontSize: 12 }}>{entidad.descripcion}</Text>}
                          </span>
                        );
                      },
                    },
                    {
                      title: 'Entidad opcional',
                      width: 200,
                      render: (_: any, _record: PantallaEntidadDTO, index: number) => {
                        const entidad = entidadesCatalogo.find(e => e.codigo === _record.entidadCodigo);
                        const esDocumento = entidad?.tipo === 'D';
                        return esDocumento ? (
                          <Select
                            size="small"
                            style={{ width: '100%' }}
                            placeholder="Sin entidad"
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            value={_record.tipoEntidad}
                            onChange={(val) => handleTipoEntidadChange(index, val)}
                            options={entidadesCatalogo
                              .filter(e => e.tipo === 'E')
                              .map(e => ({
                                value: e.codigo,
                                label: `${e.codigo} · ${e.descripcion}`,
                              }))
                            }
                          />
                        ) : (
                          <Tooltip title="Solo aplica a documentos">
                            <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
                          </Tooltip>
                        );
                      },
                    },
                    {
                      title: 'Orden',
                      width: 80,
                      render: (_: any, _record: PantallaEntidadDTO, index: number) => (
                        <InputNumber
                          size="small"
                          min={0}
                          precision={0}
                          controls={false}
                          style={{ width: 60 }}
                          value={_record.orden}
                          onChange={(val) => {
                            const nuevos = [...entidadesSeleccion];
                            nuevos[index] = { ...nuevos[index], orden: val ?? 0 };
                            setEntidadesSeleccion(nuevos);
                          }}
                        />
                      ),
                    },
                    {
                      title: '',
                      width: 50,
                      render: (_: any, record: PantallaEntidadDTO) => (
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            setEntidadesSeleccion(prev => prev.filter(e => e.entidadCodigo !== record.entidadCodigo));
                          }}
                        />
                      ),
                    },
                  ]}
                />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <FileTextOutlined style={{ marginRight: 4 }} /> Documento &nbsp;
                    <TagOutlined style={{ marginRight: 4 }} /> Entidad &nbsp;·&nbsp;
                    La entidad opcional solo aplica a documentos
                  </Text>
                </div>
              </>
            )}
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default PantallaFormulario;
