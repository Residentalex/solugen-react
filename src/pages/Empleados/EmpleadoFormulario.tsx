import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Form, Input, Select, Switch, Row, Col, Typography,
  Descriptions, InputNumber, Tag, Grid, DatePicker, message,
} from 'antd';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { empleadoApi, type EmpleadoDTO } from '../../api/empleadoApi';
import { apiClient } from '../../api/client';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import { extraerMensajeError, toTitleCase } from '../../utils/formats';

const { Text } = Typography;

const SEXO_OPTIONS = [
  { value: 0, label: 'Masculino' },
  { value: 1, label: 'Femenino' },
];

const ESTADO_CIVIL_OPTIONS = [
  { value: 0, label: 'Casado(a)' },
  { value: 1, label: 'Soltero(a)' },
  { value: 2, label: 'Divorciado(a)' },
  { value: 3, label: 'Viudo(a)' },
];

const TIPO_SANGRE_OPTIONS = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

const TIPO_NOMINA_OPTIONS = [
  { value: 0, label: 'Fijo' },
  { value: 1, label: 'Variable' },
  { value: 2, label: 'Mixto' },
];

interface CatalogoItem {
  codigo: string;
  nombre: string;
}

const EmpleadoFormulario: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();
  const [form] = Form.useForm();

  const esNuevo = !codigo || codigo === 'nuevo';
  const isLarge = screens.xxl === true;

  const [data, setData] = useState<EmpleadoDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Catálogos
  const [departamentos, setDepartamentos] = useState<CatalogoItem[]>([]);
  const [posiciones, setPosiciones] = useState<CatalogoItem[]>([]);
  const [categorias, setCategorias] = useState<CatalogoItem[]>([]);

  useEffect(() => {
    setActiveModule('MEMP');
    if (esNuevo) {
      setPageTitleOverride('Nuevo Empleado');
    }
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride, esNuevo]);

  // Cargar catálogos
  useEffect(() => {
    apiClient.get(`/Departamento/${sucursalActiva}`)
      .then((res) => setDepartamentos(res.data?.data || []))
      .catch(() => {});
    apiClient.get(`/Posicion/${sucursalActiva}`)
      .then((res) => setPosiciones(res.data?.data || []))
      .catch(() => {});
    apiClient.get(`/categoriaentidad/${sucursalActiva}/tipo/CLI`)
      .then((res) => setCategorias(res.data?.data || []))
      .catch(() => {});
  }, [sucursalActiva]);

  // Cargar datos en edición
  useEffect(() => {
    if (esNuevo) {
      form.setFieldsValue({ activo: true, sexo: 0 });
      return;
    }
    if (!codigo) return;

    const abortController = new AbortController();
    setLoading(true);
    setLoadingError(false);

    empleadoApi.obtenerPorCodigo(sucursalActiva, codigo)
      .then((res) => {
        if (abortController.signal.aborted) return;
        if (!res) {
          message.error('Empleado no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`Editando: ${res.codigo} - ${toTitleCase(res.nombre || '')}`);
        form.setFieldsValue({
          codigo: res.codigo,
          nombre: res.nombre,
          nombre1: res.nombre1,
          nombre2: res.nombre2,
          apellido1: res.apellido1,
          apellido2: res.apellido2,
          identificacion: res.identificacion,
          nss: res.nss,
          telefono: res.telefono,
          telefonoAdicional: res.telefonoAdicional,
          correoElectronico: res.correoElectronico,
          direccion: res.direccion,
          activo: res.activo,
          sexo: res.sexo,
          fechaNacimiento: res.fechaNacimiento ? dayjs(res.fechaNacimiento) : null,
          estadoCivil: res.estadoCivil,
          fechaIngreso: res.fechaIngreso ? dayjs(res.fechaIngreso) : null,
          fechaSalida: res.fechaSalida ? dayjs(res.fechaSalida) : null,
          salario: res.salario,
          tipoNomina: res.tipoNomina,
          tipoSangre: res.tipoSangre,
          alergias: res.alergias,
          enfermedades: res.enfermedades,
          contactoEmergencia: res.contactoEmergencia,
          nivelAcademico: res.nivelAcademico,
          gradoAlcanzado: res.gradoAlcanzado,
          lugarNacimiento: res.lugarNacimiento,
          departamento: res.departamento?.codigo,
          posicion: res.posicion?.codigo,
          categoria: res.categoria?.codigo,
          horarioId: res.horarioId,
          notas: res.notas,
        });
      })
      .catch((err: any) => {
        if (err?.name === 'CanceledError' || abortController.signal.aborted) return;
        message.error(extraerMensajeError(err, 'Error al cargar empleado'));
        setLoadingError(true);
      })
      .finally(() => {
        if (!abortController.signal.aborted) setLoading(false);
      });

    return () => abortController.abort();
  }, [codigo, sucursalActiva, setPageTitleOverride, esNuevo, form]);

  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      setGuardando(true);

      const payload: EmpleadoDTO = {
        codigo: values.codigo || '',
        nombre: values.nombre || '',
        nombre1: values.nombre1 || '',
        nombre2: values.nombre2 || '',
        apellido1: values.apellido1 || '',
        apellido2: values.apellido2 || '',
        identificacion: values.identificacion || '',
        nss: values.nss || '',
        telefono: values.telefono || '',
        telefonoAdicional: values.telefonoAdicional || '',
        correoElectronico: values.correoElectronico || '',
        direccion: values.direccion || '',
        activo: values.activo ?? true,
        sexo: values.sexo != null ? values.sexo : 0,
        estadoCivil: values.estadoCivil,
        fechaNacimiento: values.fechaNacimiento ? dayjs(values.fechaNacimiento).format('YYYYMMDDHHmmss') : undefined,
        fechaIngreso: values.fechaIngreso ? dayjs(values.fechaIngreso).format('YYYYMMDDHHmmss') : undefined,
        fechaSalida: values.fechaSalida ? dayjs(values.fechaSalida).format('YYYYMMDDHHmmss') : undefined,
        salario: values.salario ?? 0,
        tipoNomina: values.tipoNomina,
        tipoSangre: values.tipoSangre || '',
        alergias: values.alergias || '',
        enfermedades: values.enfermedades || '',
        contactoEmergencia: values.contactoEmergencia || '',
        nivelAcademico: values.nivelAcademico || '',
        gradoAlcanzado: values.gradoAlcanzado || '',
        lugarNacimiento: values.lugarNacimiento || '',
        horarioId: values.horarioId || '',
        notas: values.notas || '',
      };

      // Mapear referencias
      if (values.departamento) payload.departamento = { codigo: values.departamento };
      if (values.posicion) payload.posicion = { codigo: values.posicion };
      if (values.categoria) payload.categoria = { codigo: values.categoria };

      if (!esNuevo && data) {
        await empleadoApi.actualizar(sucursalActiva, data.codigo, { ...data, ...payload });
        message.success('Empleado actualizado correctamente');
      } else {
        const nuevo = await empleadoApi.crear(sucursalActiva, payload);
        message.success('Empleado creado correctamente');
        if (nuevo?.codigo) {
          navigate(`/MEMP/${nuevo.codigo}`, { replace: true });
          return;
        }
      }
      navigate('/MEMP', { replace: true });
    } catch (err: any) {
      if (err?.errorFields) return; // errores de validación del form
      message.error(extraerMensajeError(err, 'Error al guardar empleado'));
    } finally {
      setGuardando(false);
    }
  };

  const handleRefresh = useCallback(() => {
    if (esNuevo || !codigo) return;
    setLoadingError(false);
    setLoading(true);
    empleadoApi.obtenerPorCodigo(sucursalActiva, codigo)
      .then((res) => {
        if (!res) {
          message.error('Empleado no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`Editando: ${res.codigo} - ${toTitleCase(res.nombre || '')}`);
        form.setFieldsValue({
          codigo: res.codigo, nombre: res.nombre, nombre1: res.nombre1,
          nombre2: res.nombre2, apellido1: res.apellido1, apellido2: res.apellido2,
          identificacion: res.identificacion, nss: res.nss,
          telefono: res.telefono, telefonoAdicional: res.telefonoAdicional,
          correoElectronico: res.correoElectronico, direccion: res.direccion,
          activo: res.activo, sexo: res.sexo,
          fechaNacimiento: res.fechaNacimiento ? dayjs(res.fechaNacimiento) : null,
          estadoCivil: res.estadoCivil,
          fechaIngreso: res.fechaIngreso ? dayjs(res.fechaIngreso) : null,
          fechaSalida: res.fechaSalida ? dayjs(res.fechaSalida) : null,
          salario: res.salario, tipoNomina: res.tipoNomina,
          tipoSangre: res.tipoSangre, alergias: res.alergias,
          enfermedades: res.enfermedades, contactoEmergencia: res.contactoEmergencia,
          nivelAcademico: res.nivelAcademico, gradoAlcanzado: res.gradoAlcanzado,
          lugarNacimiento: res.lugarNacimiento,
          departamento: res.departamento?.codigo, posicion: res.posicion?.codigo,
          categoria: res.categoria?.codigo,
          horarioId: res.horarioId, notas: res.notas,
        });
      })
      .catch((err: any) => {
        message.error(extraerMensajeError(err, 'Error al recargar'));
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [codigo, sucursalActiva, setPageTitleOverride, esNuevo, form]);

  // ===== Helper: campo en formulario =====
  const renderFormItem = (
    name: string,
    label: string,
    component: React.ReactNode,
    rules?: any[],
    span?: number,
  ) => (
    <Col xs={24} sm={12} lg={span || 8}>
      <Form.Item name={name} label={label} rules={rules}>
        {component}
      </Form.Item>
    </Col>
  );

  // ===== Card: Datos Personales =====
  const renderDatosPersonales = () => (
    <Card title="Datos Personales" className="paces-card" style={{ marginBottom: 16 }}>
      <Row gutter={[16, 0]}>
        {renderFormItem('codigo', 'Código',
          <Input disabled placeholder="Autogenerado" />,
          esNuevo ? undefined : [{ required: true, message: 'Obligatorio' }],
        )}
        {renderFormItem('nombre', 'Nombre Completo',
          <Input placeholder="Nombre completo" maxLength={100} />,
          [{ required: true, message: 'Obligatorio' }],
          12,
        )}
        {renderFormItem('nombre1', 'Primer Nombre',
          <Input placeholder="Primer nombre" maxLength={50} />,
        )}
        {renderFormItem('nombre2', 'Segundo Nombre',
          <Input placeholder="Segundo nombre" maxLength={50} />,
        )}
        {renderFormItem('apellido1', 'Primer Apellido',
          <Input placeholder="Primer apellido" maxLength={50} />,
        )}
        {renderFormItem('apellido2', 'Segundo Apellido',
          <Input placeholder="Segundo apellido" maxLength={50} />,
        )}
        {renderFormItem('identificacion', 'Cédula / Identificación',
          <Input placeholder="Número de identificación" maxLength={20} />,
        )}
        {renderFormItem('nss', 'NSS',
          <Input placeholder="Número de seguro social" maxLength={20} />,
        )}
        {renderFormItem('sexo', 'Sexo',
          <Select options={SEXO_OPTIONS} />
        )}
        {renderFormItem('estadoCivil', 'Estado Civil',
          <Select allowClear placeholder="Seleccione estado civil" options={ESTADO_CIVIL_OPTIONS} />
        )}
        {renderFormItem('lugarNacimiento', 'Lugar de Nacimiento',
          <Input placeholder="Ciudad / Provincia" maxLength={100} />
        )}
        <Col xs={24} sm={12} lg={8}>
          <Form.Item name="activo" label="Activo" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Sí" unCheckedChildren="No" />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  // ===== Card: Fechas =====
  const renderFechas = () => (
    <Card title="Fechas" className="paces-card" style={{ marginBottom: 16 }}>
      <Row gutter={[16, 0]}>
        {renderFormItem('fechaNacimiento', 'Fecha de Nacimiento',
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        )}
        {renderFormItem('fechaIngreso', 'Fecha de Ingreso',
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        )}
        {renderFormItem('fechaSalida', 'Fecha de Salida',
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        )}
      </Row>
    </Card>
  );

  // ===== Card: Contacto y Salud =====
  const renderContactoSalud = () => (
    <Card title="Contacto y Salud" className="paces-card" style={{ marginBottom: 16 }}>
      <Row gutter={[16, 0]}>
        {renderFormItem('telefono', 'Teléfono',
          <Input placeholder="809-555-2003" maxLength={15} />
        )}
        {renderFormItem('telefonoAdicional', 'Teléfono Adicional',
          <Input placeholder="809-555-2003" maxLength={15} />
        )}
        {renderFormItem('correoElectronico', 'Correo Electrónico',
          <Input placeholder="correo@ejemplo.com" maxLength={80} />
        )}
        {renderFormItem('contactoEmergencia', 'Contacto Emergencia',
          <Input placeholder="Nombre y teléfono" maxLength={100} />
        )}
        {renderFormItem('tipoSangre', 'Tipo de Sangre',
          <Select allowClear placeholder="Seleccione tipo de sangre" options={TIPO_SANGRE_OPTIONS} />
        )}
      </Row>
      <Row gutter={[16, 0]}>
        <Col xs={24}>
          <Form.Item name="direccion" label="Dirección">
            <Input placeholder="Dirección completa" maxLength={200} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={[16, 0]}>
        <Col xs={24} sm={12}>
          <Form.Item name="alergias" label="Alergias">
            <Input.TextArea placeholder="Alergias conocidas" rows={2} maxLength={500} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="enfermedades" label="Enfermedades">
            <Input.TextArea placeholder="Enfermedades preexistentes" rows={2} maxLength={500} />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  // ===== Card: Laborales =====
  const renderLaborales = () => (
    <Card title="Laborales" className="paces-card" style={{ marginBottom: 16 }}>
      <Row gutter={[16, 0]}>
        {renderFormItem('departamento', 'Departamento',
          <Select allowClear showSearch placeholder="Seleccione departamento" optionFilterProp="children"
            options={departamentos.map(d => ({ value: d.codigo, label: `${d.codigo} - ${d.nombre}` }))}
          />
        )}
        {renderFormItem('posicion', 'Posición / Cargo',
          <Select allowClear showSearch placeholder="Seleccione posición" optionFilterProp="children"
            options={posiciones.map(p => ({ value: p.codigo, label: `${p.codigo} - ${p.nombre}` }))}
          />
        )}
        {renderFormItem('categoria', 'Categoría',
          <Select allowClear placeholder="Seleccionar categoría"
            options={categorias.map(c => ({ value: c.codigo, label: c.nombre }))}
          />
        )}
        {renderFormItem('horarioId', 'Horario',
          <Input placeholder="ID del horario" maxLength={20} />
        )}
        {renderFormItem('nivelAcademico', 'Nivel Académico',
          <Input placeholder="Ej: Universitario, Técnico" maxLength={100} />
        )}
        {renderFormItem('gradoAlcanzado', 'Grado Alcanzado',
          <Input placeholder="Ej: Licenciatura, Maestría" maxLength={100} />
        )}
      </Row>
    </Card>
  );

  // ===== Card: Salariales =====
  const renderSalariales = () => (
    <Card title="Salariales" className="paces-card" style={{ marginBottom: 16 }}>
      <Row gutter={[16, 0]}>
        {renderFormItem('tipoNomina', 'Tipo de Nómina',
          <Select allowClear placeholder="Seleccione tipo de nómina" options={TIPO_NOMINA_OPTIONS} />
        )}
        {renderFormItem('salario', 'Salario',
          <InputNumber min={0} step={0.01} style={{ width: '100%' }}
            formatter={(value) => `RD$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value?.replace(/RD\$\s?|(,*)/g, '') as any}
          />
        )}
      </Row>
    </Card>
  );

  // ===== Card: Notas =====
  const renderNotas = () => (
    <Card title="Notas" className="paces-card" style={{ marginBottom: 16 }}>
      <Row gutter={[16, 0]}>
        <Col xs={24}>
          <Form.Item name="notas" label="Notas">
            <Input.TextArea placeholder="Notas sobre el empleado" rows={3} maxLength={1000} />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  // ===== Render formulario principal =====
  const renderFormulario = () => (
    <Form form={form} layout="vertical" size="small">
      {renderDatosPersonales()}
      {renderFechas()}
      {renderContactoSalud()}
      {renderLaborales()}
      {renderSalariales()}
      {renderNotas()}
    </Form>
  );

  return (
    <DetalleCatalogoLayout
      rutaVolver="/MEMP"
      loading={loading}
      mensajeLoading={esNuevo ? 'Preparando formulario...' : 'Cargando empleado...'}
      loadingError={loadingError}
      mensajeError="Error al cargar formulario de empleado"
      onRecargar={handleRefresh}
      dataDisponible={esNuevo || !!data}
      modo={esNuevo ? 'crear' : 'editar'}
      onGuardar={handleGuardar}
      guardando={guardando}
    >
      {renderFormulario()}
    </DetalleCatalogoLayout>
  );
};

export default EmpleadoFormulario;
