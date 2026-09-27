import React, { useEffect, useState, useCallback } from 'react';
import {
  Form,
  Input,
  Select,
  InputNumber,
  Tag,
  Button,
  Typography,
  message,
  Card,
  Modal,
  Table,
  Empty,
  Spin,
} from 'antd';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { SearchOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { conteoApi } from '../../api/conteoApi';
import { almacenApi } from '../../api/almacenApi';
import { conceptosApi } from '../../api/conceptosApi';
import { empleadoApi } from '../../api/empleadoApi';
import type { ConteoFisicoDTO } from '../../types/conteo';
import type { AlmacenDTO, ConceptoDTO } from '../../types/entradaAlmacen';
import type { EmpleadoDTO } from '../../api/empleadoApi';
import { toTitleCase } from '../../utils/formats';

const { Text } = Typography;
const { Option } = Select;

const ConteoFisicoFormulario: React.FC = () => {
  const { documento } = useParams<{ documento: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { record?: ConteoFisicoDTO } || {};
  const record = state.record;

  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const [form] = Form.useForm<ConteoFisicoDTO>();

  // Estados para los buscadores modales
  const [modalAlmacenOpen, setModalAlmacenOpen] = useState(false);
  const [modalUsuarioOpen, setModalUsuarioOpen] = useState(false);
  const [modalSuplidorOpen, setModalSuplidorOpen] = useState(false);
  const [modalConceptoOpen, setModalConceptoOpen] = useState(false);

  // Bloqueo uniforme durante el guardado
  const [saving, setSaving] = useState(false);

  const [campos, setCampos] = useState<Partial<ConteoFisicoDTO>>({
    documento: record?.documento || '',
    fecha: record?.fecha || '',
    almacen: record?.almacen || '',
    usuario: record?.usuario || '',
    nombreSuplidor: record?.nombreSuplidor || '',
    concepto: record?.concepto || '',
    costo: record?.costo ?? 0,
    cantidad: record?.cantidad ?? 0,
    bloqueado: record?.bloqueado ?? false,
    modo: record?.modo ?? 0,
    periodo: record?.periodo ?? 0,
    isFromPlantilla: record?.isFromPlantilla ?? false,
  });

  // Datos para los buscadores
  const [almacenes, setAlmacenes] = useState<AlmacenDTO[]>([]);
  const [loadingAlmacenes, setLoadingAlmacenes] = useState(false);

  const [empleados, setEmpleados] = useState<EmpleadoDTO[]>([]);
  const [loadingEmpleados, setLoadingEmpleados] = useState(false);
  const [searchEmpleado, setSearchEmpleado] = useState('');

  const [suplidores, setSuplidores] = useState<ConceptoDTO[]>([]);
  const [loadingSuplidores, setLoadingSuplidores] = useState(false);

  const [conceptos, setConceptos] = useState<ConceptoDTO[]>([]);
  const [loadingConceptos, setLoadingConceptos] = useState(false);
  const [searchConcepto, setSearchConcepto] = useState('');

  const cargarAlmacenes = useCallback(async () => {
    if (!sucursalActiva) return;
    setLoadingAlmacenes(true);
    try {
      const result = await almacenApi.obtenerListado(sucursalActiva);
      setAlmacenes(result);
    } catch {
      message.error('Error al cargar almacenes');
    } finally {
      setLoadingAlmacenes(false);
    }
  }, [sucursalActiva]);

  const cargarEmpleados = useCallback(async (busqueda?: string) => {
    if (!sucursalActiva) return;
    setLoadingEmpleados(true);
    try {
      const result = await empleadoApi.obtenerListado(sucursalActiva, busqueda || '', 50, 0);
      setEmpleados(result.datos);
    } catch {
      setEmpleados([]);
      message.error('Error al cargar empleados');
    } finally {
      setLoadingEmpleados(false);
    }
  }, [sucursalActiva]);

  const cargarSuplidores = useCallback(async () => {
    if (!sucursalActiva) return;
    setLoadingSuplidores(true);
    try {
      const result = await conceptosApi.obtenerSuplidores(sucursalActiva);
      setSuplidores(result as ConceptoDTO[]);
    } catch {
      message.error('Error al cargar suplidores');
    } finally {
      setLoadingSuplidores(false);
    }
  }, [sucursalActiva]);

  const cargarConceptos = useCallback(async () => {
    if (!sucursalActiva) return;
    setLoadingConceptos(true);
    try {
      const result = await conceptosApi.obtenerConceptos(sucursalActiva);
      setConceptos(result);
    } catch {
      message.error('Error al cargar conceptos');
    } finally {
      setLoadingConceptos(false);
    }
  }, [sucursalActiva]);

  const cargarDatos = useCallback(async () => {
    if (!documento) return;
    try {
      const result = await conteoApi.obtenerPorDocumento(sucursalActiva, documento);
      setCampos({
        documento: result.documento,
        fecha: result.fecha,
        almacen: result.almacen || '',
        usuario: result.usuario || '',
        nombreSuplidor: result.nombreSuplidor || '',
        concepto: result.concepto || '',
        costo: result.costo ?? 0,
        cantidad: result.cantidad ?? 0,
        bloqueado: result.bloqueado ?? false,
        modo: result.modo ?? 0,
        periodo: result.periodo ?? 0,
        isFromPlantilla: result.isFromPlantilla ?? false,
      });
      form.setFieldsValue(result);
    } catch {
      message.error('Error al cargar los datos del conteo');
    }
  }, [documento, sucursalActiva, form]);

  useEffect(() => {
    if (documento) {
      cargarDatos();
      cargarAlmacenes();
      cargarEmpleados();
      cargarSuplidores();
      cargarConceptos();
    }
  }, [documento, cargarDatos, cargarAlmacenes, cargarEmpleados, cargarSuplidores, cargarConceptos]);

  useEffect(() => {
    if (modalAlmacenOpen) {
      cargarAlmacenes();
    }
    if (modalUsuarioOpen) {
      setSearchEmpleado('');
      cargarEmpleados();
    }
    if (modalSuplidorOpen) {
      cargarSuplidores();
    }
    if (modalConceptoOpen) {
      setSearchConcepto('');
      cargarConceptos();
    }
  }, [modalAlmacenOpen, modalUsuarioOpen, modalSuplidorOpen, modalConceptoOpen, cargarAlmacenes, cargarEmpleados, cargarSuplidores, cargarConceptos]);

  // Handlers para buscadores
  const handleAlmacenSelect = useCallback((almacen: AlmacenDTO) => {
    setCampos((prev) => ({ ...prev, almacen: almacen.nombre, codigoAlmacen: almacen.codigo }));
    setModalAlmacenOpen(false);
  }, []);

  const handleUsuarioSelect = useCallback((empleado: EmpleadoDTO) => {
    setCampos((prev) => ({ ...prev, usuario: `${empleado.codigo} - ${empleado.nombre}` }));
    setModalUsuarioOpen(false);
  }, []);

  const handleSuplidorSelect = useCallback((suplidor: ConceptoDTO) => {
    setCampos((prev) => ({ ...prev, nombreSuplidor: suplidor.nombre || '' }));
    setModalSuplidorOpen(false);
  }, []);

  const handleConceptoSelect = useCallback((concepto: ConceptoDTO) => {
    setCampos((prev) => ({ ...prev, concepto: concepto.codigo || '' }));
    setModalConceptoOpen(false);
  }, []);

  const onFinish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      message.success('Conteo actualizado correctamente');
      navigate(`/FConteos/${documento}`);
    } catch {
      message.error('Error al guardar el conteo');
    } finally {
      setSaving(false);
    }
  };

  const onFinishFailed = (errorInfo: unknown) => {
    console.log('Validate failed:', errorInfo);
  };

  if (!documento) {
    message.error('No se especificó un documento de conteo');
    return null;
  }

  // Modal: Buscar Almacén
  const almacenModal = (
    <Modal
      title="Buscar Almacén"
      open={modalAlmacenOpen}
      onCancel={() => setModalAlmacenOpen(false)}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Spin spinning={loadingAlmacenes} tip="Cargando almacenes...">
        <Table
          columns={[
            { title: 'Código', dataIndex: 'codigo', width: 100 },
            { title: 'Nombre', dataIndex: 'nombre', ellipsis: true },
          ]}
          dataSource={almacenes}
          rowKey="codigo"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          onRow={(record) => ({
            onClick: () => handleAlmacenSelect(record),
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No hay almacenes" /></div> }}
        />
      </Spin>
    </Modal>
  );

  // Modal: Buscar Usuario
  const usuarioModal = (
    <Modal
      title="Buscar Usuario"
      open={modalUsuarioOpen}
      onCancel={() => setModalUsuarioOpen(false)}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Spin spinning={loadingEmpleados} tip="Cargando usuarios...">
        <Input.Search
          placeholder="Buscar por nombre o código..."
          allowClear
          value={searchEmpleado}
          onChange={(e) => setSearchEmpleado(e.target.value)}
          onSearch={(val) => cargarEmpleados(val)}
          style={{ marginBottom: 16 }}
          prefix={<SearchOutlined />}
        />
        <Table
          columns={[
            { title: 'Código', dataIndex: 'codigo', width: 100 },
            { title: 'Nombre', dataIndex: 'nombre', ellipsis: true, render: (v: string) => toTitleCase(v) },
            { title: 'Cédula', dataIndex: 'identificacion', width: 130 },
          ]}
          dataSource={empleados}
          rowKey="codigo"
          size="small"
          pagination={false}
          scroll={{ y: 350 }}
          locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No hay usuarios" /></div> }}
          onRow={(record) => ({
            onClick: () => handleUsuarioSelect(record),
            style: { cursor: 'pointer' },
          })}
        />
      </Spin>
    </Modal>
  );

  // Modal: Buscar Suplidor
  const suplidorModal = (
    <Modal
      title="Buscar Suplidor"
      open={modalSuplidorOpen}
      onCancel={() => setModalSuplidorOpen(false)}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Spin spinning={loadingSuplidores} tip="Cargando suplidores...">
        <Table
          columns={[
            { title: 'Código', dataIndex: 'codigo', width: 100 },
            { title: 'Nombre', dataIndex: 'nombre', ellipsis: true },
            { title: 'Identificación', dataIndex: 'identificacion', width: 130 },
          ]}
          dataSource={suplidores}
          rowKey="codigo"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          onRow={(record) => ({
            onClick: () => handleSuplidorSelect(record),
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No hay suplidores" /></div> }}
        />
      </Spin>
    </Modal>
  );

  // Modal: Buscar Concepto
  const conceptoModal = (
    <Modal
      title="Buscar Concepto"
      open={modalConceptoOpen}
      onCancel={() => setModalConceptoOpen(false)}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Spin spinning={loadingConceptos} tip="Cargando conceptos...">
        <Input.Search
          placeholder="Buscar por código o nombre..."
          allowClear
          value={searchConcepto}
          onChange={(e) => setSearchConcepto(e.target.value)}
          onSearch={(val) => setSearchConcepto(val)}
          style={{ marginBottom: 16 }}
          prefix={<SearchOutlined />}
        />
        <Table
          columns={[
            {
              title: 'Concepto',
              key: 'concepto',
              render: (_: unknown, record: ConceptoDTO) => (
                <span>
                  <strong>{record.codigo}</strong> - {toTitleCase(record.nombre || '')}
                </span>
              ),
            },
          ]}
          dataSource={conceptos}
          rowKey="codigo"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          onRow={(record) => ({
            onClick: () => handleConceptoSelect(record),
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No hay conceptos" /></div> }}
        />
      </Spin>
    </Modal>
  );

  // Sección: Documento (siempre visible)
  const documentoSection = (
    <Form.Item label="Documento" rules={[{ required: true, message: 'Por favor ingrese el documento' }]}>
      <Input disabled>{campos.documento}</Input>
    </Form.Item>
  );

  // Sección: Ubicación
  const ubicacionSection = (
    <Form.Item label="Almacén">
      <Input
        disabled
        placeholder="Buscar almacén..."
        onClick={() => setModalAlmacenOpen(true)}
      >
        {campos.almacen || 'Seleccionar almacén'}
      </Input>
    </Form.Item>
  );

  const usuarioSection = (
    <Form.Item label="Usuario">
      <Input
        disabled
        placeholder="Buscar usuario..."
        onClick={() => setModalUsuarioOpen(true)}
      >
        {campos.usuario || 'Seleccionar usuario'}
      </Input>
    </Form.Item>
  );

  const suplidorSection = (
    <Form.Item label="Suplidor">
      <Input
        disabled
        placeholder="Buscar suplidor..."
        onClick={() => setModalSuplidorOpen(true)}
      >
        {campos.nombreSuplidor || 'Seleccionar suplidor'}
      </Input>
    </Form.Item>
  );

  const conceptoSection = (
    <Form.Item label="Concepto">
      <Input
        disabled
        placeholder="Buscar concepto..."
        onClick={() => setModalConceptoOpen(true)}
      >
        {campos.concepto || 'Seleccionar concepto'}
      </Input>
    </Form.Item>
  );

  // Sección: Configuración (con campos avanzados)
  const configSection = (
    <Card
      title="Configuración"
      bordered={false}
      style={{ marginTop: 8, padding: 16 }}
    >
      <Form.Item label="Bloqueado">
        <Tag color={campos.bloqueado ? 'red' : 'green'}>
          {campos.bloqueado ? 'Sí' : 'No'}
        </Tag>
        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
          : Impide modificaciones en el conteo
        </Text>
      </Form.Item>

      <Form.Item label="Modo">
        <Select disabled>
          <Option value={0}>Manual</Option>
          <Option value={1}>Automático</Option>
          <Option value={2}>Consulta</Option>
        </Select>
        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
          : Manual (cuenta física), Automático (sistema), Consulta (solo lectura)
        </Text>
      </Form.Item>

      <Form.Item label="Período">
        <Input disabled>{campos.periodo}</Input>
        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
          : Periodo contable al que pertenece
        </Text>
      </Form.Item>

      <Form.Item label="Es de Plantilla">
        <Select disabled>
          <Option value={false}>No</Option>
          <Option value={true}>Sí</Option>
        </Select>
        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
          : Indica si el conteo se generó desde una plantilla predefinida
        </Text>
      </Form.Item>
    </Card>
  );

  // Controles al final
  const accionesSection = (
    <Form.Item>
      <Button type="primary" htmlType="submit" loading={saving} disabled={saving}>
        Guardar Cambios
      </Button>
      <Button onClick={() => navigate(-1)} style={{ marginLeft: 8 }} disabled={saving}>
        Cancelar
      </Button>
    </Form.Item>
  );

  return (
    <Form
      form={form}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      initialValues={campos}
    >
      {/* Sección: Documento */}
      {documentoSection}

      {/* Sección: Ubicación */}
      {ubicacionSection}

      {/* Sección: Responsable */}
      {usuarioSection}
      {suplidorSection}

      {/* Sección: Configuración */}
      {configSection}

      {/* Sección: Concepto (buscador contextual) */}
      {conceptoSection}

      {/* Detalle de datos */}
      <Form.Item label="Costo">
        <InputNumber
          disabled
          precision={2}
          value={campos.costo}
          formatter={(value) => value?.toFixed(2) || ''}
        />
      </Form.Item>

      <Form.Item label="Cantidad">
        <InputNumber
          disabled
          precision={2}
          value={campos.cantidad}
          formatter={(value) => value?.toFixed(2) || ''}
        />
      </Form.Item>

      {/* Acciones visibles al final */}
      {accionesSection}

      {/* Modales de búsqueda */}
      {almacenModal}
      {usuarioModal}
      {suplidorModal}
      {conceptoModal}
    </Form>
  );
};

export default ConteoFisicoFormulario;