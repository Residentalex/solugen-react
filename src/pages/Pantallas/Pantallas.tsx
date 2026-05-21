import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card,
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
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
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
  const [form] = Form.useForm();

  // Catálogos para el modal
  const [modulosCatalogo, setModulosCatalogo] = useState<ModuloDTO[]>([]);
  const [accionesCatalogo, setAccionesCatalogo] = useState<AccionDTO[]>([]);
  const [selectedAcciones, setSelectedAcciones] = useState<string[]>([]);
  const [catalogosLoading, setCatalogosLoading] = useState(false);

  const cargarDatos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const result = await pantallaApi.obtenerListado(sucursalActiva);
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar pantallas');
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
      result = result.filter((p) => p.moduloID === filtroModulo);
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

  const abrirNuevo = () => {
    setEditando(null);
    form.resetFields();
    form.setFieldsValue({ activo: true, esReporte: false, orden: 0 });
    setSelectedAcciones(['VISUALIZAR']);
    setModalVisible(true);
  };

  const abrirEditar = (pantalla: PantallaDTO) => {
    setEditando(pantalla);
    form.setFieldsValue({
      codigo: pantalla.codigo,
      nombre: pantalla.nombre,
      moduloID: pantalla.moduloID,
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
        moduloID: values.moduloID,
        grupo: values.grupo || undefined,
        orden: values.orden ?? 0,
        esReporte: values.esReporte ?? false,
        activo: values.activo ?? true,
        modulos: [],
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
      width: 120,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
    },
    {
      title: 'Módulo',
      dataIndex: 'modulos',
      key: 'modulo',
      width: 150,
      render: (modulos: ModuloDTO[]) => modulos?.[0]?.nombre || '-',
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
            onSearch={handleSearch}
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

      <Card
        className="paces-card-erp"
        style={{ borderRadius: 8 }}
        styles={{ body: { padding: 0 } }}
      >
        <Table<PantallaDTO>
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
            defaultPageSize: 10,
          }}
          locale={{
            emptyText: <Empty description="No hay pantallas registradas" />,
          }}
        />
      </Card>

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
              <Form.Item
                name="moduloID"
                label="Módulo"
                rules={[
                  { required: true, message: 'Debe seleccionar un módulo' },
                ]}
              >
                <Select
                  placeholder="Seleccione un módulo"
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
    </>
  );
};

export default Pantallas;
