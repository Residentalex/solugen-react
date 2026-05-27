import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Checkbox,
  Tag,
  message,
  Space,
  Tooltip,
  Empty,
  Row,
  Col,
  Descriptions,
  Spin,
  Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';

const FILAS_POR_PAGINA = 25;
import { useUIStore } from '../../stores/uiStore';
import { Typography } from 'antd';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;
import { pantallaApi } from '../../api/pantallaApi';
import type { PantallaDTO, ModuloDTO } from '../../types/auth';
import type { AccionDTO } from '../../types/administracion';

const OPCIONES_GRUPO = [
  'Maestros',
  'Operaciones',
  'Reportes',
  'Procesos',
  'Configuracion',
  'POS',
  'Equipos',
];

const Pantallas: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.usuario?.sucursalActiva);

  const [data, setData] = useState<PantallaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filtroModulo, setFiltroModulo] = useState<number | undefined>();
  const [filtroGrupo, setFiltroGrupo] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<PantallaDTO | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [detalleItem, setDetalleItem] = useState<PantallaDTO | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [form] = Form.useForm();

  // Catálogos para el modal
  const [modulosCatalogo, setModulosCatalogo] = useState<ModuloDTO[]>([]);
  const [accionesCatalogo, setAccionesCatalogo] = useState<AccionDTO[]>([]);
  const [selectedAcciones, setSelectedAcciones] = useState<string[]>([]);
  const [catalogosLoading, setCatalogosLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);

  const cargarDatos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const result = await pantallaApi.obtenerListado(sucursalActiva);
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar pantallas');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  const cargarCatalogos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setCatalogosLoading(true);
    try {
      const [modulos, acciones] = await Promise.all([
        pantallaApi.obtenerModulos(sucursalActiva),
        pantallaApi.obtenerAcciones(sucursalActiva),
      ]);
      setModulosCatalogo(modulos || []);
      setAccionesCatalogo(acciones || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar catálogos');
      setLoadingError(true);
    } finally {
      setCatalogosLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MPantalla');
    updateToolbar({});
    cargarDatos();
    cargarCatalogos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos, cargarCatalogos]);

  // Filtrado y búsqueda cliente
  const filteredData = useMemo(() => {
    let result = data;
    if (filtroModulo !== undefined) {
      result = result.filter((p) => p.modulos?.some((m) => m.id === filtroModulo));
    }
    if (filtroGrupo) {
      result = result.filter((p) => p.grupo === filtroGrupo);
    }
    if (searchText) {
      const term = searchText.toLowerCase();
      result = result.filter(
        (p) =>
          p.nombre.toLowerCase().includes(term) ||
          p.codigo.toLowerCase().includes(term),
      );
    }
    return result;
  }, [data, filtroModulo, filtroGrupo, searchText]);

  // Grupos únicos disponibles en los datos
  const gruposDisponibles = useMemo(() => {
    const grupos = new Set(data.map((p) => p.grupo).filter(Boolean) as string[]);
    return Array.from(grupos).sort();
  }, [data]);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const abrirDetalle = async (pantalla: PantallaDTO) => {
    setDetalleItem(pantalla);
    setDetalleVisible(true);
    setCargandoDetalle(true);
    try {
      const completo = await pantallaApi.obtenerPorId(sucursalActiva, pantalla.id);
      setDetalleItem(completo);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar detalle de pantalla');
    } finally {
      setCargandoDetalle(false);
    }
  };

  const abrirNuevo = () => {
    setEditando(null);
    form.resetFields();
    form.setFieldsValue({ activo: true, esReporte: false, orden: 0, modulos: [] });
    setSelectedAcciones(['VISUALIZAR']);
    setModalVisible(true);
  };

  const abrirEditar = (pantalla: PantallaDTO) => {
    setEditando(pantalla);
    form.setFieldsValue({
      codigo: pantalla.codigo,
      nombre: pantalla.nombre,
      tipo: pantalla.tipo,
      modulos: pantalla.modulos?.map((m) => m.id) || [],
      grupo: pantalla.grupo,
      ruta: pantalla.ruta,
      orden: pantalla.orden,
      esReporte: pantalla.esReporte,
      activo: pantalla.activo,
    });
    setSelectedAcciones(pantalla.acciones || []);
    setModalVisible(true);
  };

  const guardar = async () => {
    try {
      const values = await form.validateFields();
      if (sucursalActiva === undefined) return;
      setGuardando(true);

      const payload: PantallaDTO = {
        id: editando?.id || 0,
        codigo: values.codigo,
        nombre: values.nombre,
        ruta: values.ruta,
        tipo: values.tipo || undefined,
        grupo: values.grupo || undefined,
        orden: values.orden ?? 0,
        esReporte: values.esReporte ?? false,
        activo: values.activo ?? true,
        modulos: (values.modulos || []).map((id: number) => ({ id, nombre: '', orden: 0 })),
        acciones: selectedAcciones,
      };

      if (editando) {
        await pantallaApi.actualizar(sucursalActiva, payload);
        message.success('Pantalla actualizada correctamente');
      } else {
        await pantallaApi.crear(sucursalActiva, payload);
        message.success('Pantalla creada correctamente');
      }
      setModalVisible(false);
      cargarDatos();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar pantalla');
    } finally {
      setGuardando(false);
    }
  };

  const columns: ColumnsType<PantallaDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      fixed: 'left',
      width: 240,
      render: (val: string, record: PantallaDTO) => (
        <Text strong className="paces-doc-link" style={{ cursor: 'pointer' }} onClick={() => abrirDetalle(record)}>
          {val}
        </Text>
      ),
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
    },
    {
      title: 'Módulos',
      dataIndex: 'modulos',
      key: 'modulo',
      width: 400,
      render: (modulos: ModuloDTO[]) =>
        modulos && modulos.length > 0
          ? modulos.map((m) => <Tag key={m.id} style={{ marginBottom: 2 }}>{m.nombre}</Tag>)
          : <Tag style={{ color: '#999' }}>Sin módulo</Tag>,
    },
    {
      title: 'Grupo',
      dataIndex: 'grupo',
      key: 'grupo',
      width: 140,
    },
    {
      title: 'Ruta',
      dataIndex: 'ruta',
      key: 'ruta',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Activo',
      dataIndex: 'activo',
      key: 'activo',
      width: 90,
      align: 'center',
      render: (activo: boolean) =>
        activo ? (
          <Tag color="green">Activo</Tag>
        ) : (
          <Tag color="red">Inactivo</Tag>
        ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      fixed: 'right',
      width: 80,
      render: (_, record) => (
        <Space size={0}>
          <Tooltip title="Editar pantalla">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => abrirEditar(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      {loadingError && (
        <Alert
          title="Error al cargar pantallas"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => { setLoadingError(false); cargarDatos(); }}>
              Reintentar
            </Button>
          }
        />
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          Pantallas del Sistema
        </h4>
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
          Nueva Pantalla
        </Button>
      </div>

      {/* Filtros */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Input.Search
            placeholder="Buscar por nombre o código"
            allowClear
            prefix={<SearchOutlined className="paces-text-icon" />}
            onSearch={handleSearch}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                (e.target as HTMLInputElement).blur();
                handleSearch('');
              }
            }}
          />
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Select
            placeholder="Módulo"
            allowClear
            style={{ width: '100%' }}
            value={filtroModulo}
            onChange={(val) => setFiltroModulo(val)}
          >
            {modulosCatalogo.map((m) => (
              <Select.Option key={m.id} value={m.id}>
                {m.nombre}
              </Select.Option>
            ))}
          </Select>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Select
            placeholder="Grupo"
            allowClear
            style={{ width: '100%' }}
            value={filtroGrupo}
            onChange={(val) => setFiltroGrupo(val)}
          >
            {gruposDisponibles.map((g) => (
              <Select.Option key={g} value={g}>
                {g}
              </Select.Option>
            ))}
          </Select>
        </Col>
      </Row>

      <div className="paces-border-top">
        <Table<PantallaDTO>
          className="paces-list-table"
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          scroll={{ x: 900 }}
          size="middle"
          pagination={{
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} de ${total} pantallas`,
            pageSizeOptions: ['10', '20', '50'],
            defaultPageSize: FILAS_POR_PAGINA,
          }}
          locale={{
            emptyText: <Empty description="No hay pantallas registradas" />,
          }}
        />
      </div>

      <Modal
        title={editando ? 'Editar Pantalla' : 'Nueva Pantalla'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={guardar}
        confirmLoading={guardando}
        width={640}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="codigo"
                label="Código"
                rules={[{ required: true, message: 'El código es obligatorio' }]}
              >
                <Input placeholder="Ej. MPantalla" maxLength={30} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="nombre"
                label="Nombre"
                rules={[{ required: true, message: 'El nombre es obligatorio' }]}
              >
                <Input placeholder="Ej. Pantallas del Sistema" maxLength={100} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
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
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="grupo" label="Grupo">
                <Select placeholder="Seleccione un grupo" allowClear>
                  {OPCIONES_GRUPO.map((g) => (
                    <Select.Option key={g} value={g}>
                      {g}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="tipo" label="Tipo">
                <Select placeholder="Seleccione tipo" allowClear>
                  {['MAESTRO','DOCUMENTO','CONFIGURACION','CONSULTA','OPERACION','REPORTE','ENCABEZADO'].map((t) => (
                    <Select.Option key={t} value={t}>{t}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="ruta" label="Ruta">
                <Input placeholder="Ej. /admin/pantallas" maxLength={200} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="orden" label="Orden" initialValue={0}>
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={12}>
              <Form.Item
                name="esReporte"
                label="¿Es reporte?"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={12}>
              <Form.Item
                name="activo"
                label="Activo"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginTop: 16, marginBottom: 8 }}>
            <strong>Acciones de la pantalla</strong>
          </div>

          {accionesCatalogo.length === 0 && !catalogosLoading && (
            <span style={{ color: '#999' }}>
              No hay acciones disponibles. Consulte con su administrador.
            </span>
          )}

          <Checkbox.Group
            value={selectedAcciones}
            onChange={(checkedValues) =>
              setSelectedAcciones(checkedValues as string[])
            }
          >
            <Row gutter={[16, 8]}>
              {accionesCatalogo.map((accion) => (
                <Col xs={12} sm={8} md={6} key={accion.codigo}>
                  <Checkbox value={accion.codigo}>{accion.nombre}</Checkbox>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        </Form>
      </Modal>

      <Modal
        title={`Detalle: ${detalleItem?.codigo || ''}`}
        open={detalleVisible}
        onCancel={() => setDetalleVisible(false)}
        footer={null}
        width={640}
      >
        <Spin spinning={cargandoDetalle}>
          {detalleItem && (
            <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
              <Descriptions.Item label="Código">{detalleItem.codigo}</Descriptions.Item>
              <Descriptions.Item label="Nombre">{detalleItem.nombre}</Descriptions.Item>
              <Descriptions.Item label="Ruta">{detalleItem.ruta || '-'}</Descriptions.Item>
              <Descriptions.Item label="Grupo">{detalleItem.grupo || '-'}</Descriptions.Item>
              <Descriptions.Item label="Tipo">{detalleItem.tipo || '-'}</Descriptions.Item>
              <Descriptions.Item label="Orden">{detalleItem.orden}</Descriptions.Item>
              <Descriptions.Item label="¿Es Reporte?">{detalleItem.esReporte ? 'Sí' : 'No'}</Descriptions.Item>
              <Descriptions.Item label="Módulos">
                {detalleItem.modulos?.length
                  ? detalleItem.modulos.map((m) => <Tag key={m.id} style={{ marginBottom: 2 }}>{m.nombre}</Tag>)
                  : <Tag>Sin módulo</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Acciones">
                {detalleItem.acciones?.length
                  ? detalleItem.acciones.map((a) => <Tag key={a} color="blue">{a}</Tag>)
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Activo">
                <Tag color={detalleItem.activo ? 'green' : 'red'}>{detalleItem.activo ? 'Activo' : 'Inactivo'}</Tag>
              </Descriptions.Item>
            </Descriptions>
          )}
        </Spin>
      </Modal>
    </>
  );
};

export default Pantallas;
