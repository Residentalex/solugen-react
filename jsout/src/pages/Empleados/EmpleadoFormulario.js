import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Select, Switch, Row, Col, Typography, Descriptions, InputNumber, Tag, Grid, DatePicker, message, } from 'antd';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { empleadoApi } from '../../api/empleadoApi';
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
const EmpleadoFormulario = () => {
    const { codigo } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const screens = Grid.useBreakpoint();
    const [form] = Form.useForm();
    const esNuevo = !codigo || codigo === 'nuevo';
    const isLarge = screens.xxl === true;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [guardando, setGuardando] = useState(false);
    // Catálogos
    const [departamentos, setDepartamentos] = useState([]);
    const [posiciones, setPosiciones] = useState([]);
    const [categorias, setCategorias] = useState([]);
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
            .catch((err) => console.warn('Error al cargar departamentos', err));
        apiClient.get(`/Posicion/${sucursalActiva}`)
            .then((res) => setPosiciones(res.data?.data || []))
            .catch((err) => console.warn('Error al cargar posiciones', err));
        apiClient.get(`/categoriaentidad/${sucursalActiva}/tipo/CLI`)
            .then((res) => setCategorias(res.data?.data || []))
            .catch((err) => console.warn('Error al cargar categorias', err));
    }, [sucursalActiva]);
    // Cargar datos en edición
    useEffect(() => {
        if (esNuevo) {
            form.setFieldsValue({ activo: true, sexo: 0 });
            return;
        }
        if (!codigo)
            return;
        const abortController = new AbortController();
        setLoading(true);
        setLoadingError(false);
        empleadoApi.obtenerPorCodigo(sucursalActiva, codigo)
            .then((res) => {
            if (abortController.signal.aborted)
                return;
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
            .catch((err) => {
            if (err?.name === 'CanceledError' || abortController.signal.aborted)
                return;
            message.error(extraerMensajeError(err, 'Error al cargar empleado'));
            setLoadingError(true);
        })
            .finally(() => {
            if (!abortController.signal.aborted)
                setLoading(false);
        });
        return () => abortController.abort();
    }, [codigo, sucursalActiva, setPageTitleOverride, esNuevo, form]);
    const handleGuardar = async () => {
        try {
            const values = await form.validateFields();
            setGuardando(true);
            const payload = {
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
            if (values.departamento)
                payload.departamento = { codigo: values.departamento };
            if (values.posicion)
                payload.posicion = { codigo: values.posicion };
            if (values.categoria)
                payload.categoria = { codigo: values.categoria };
            if (!esNuevo && data) {
                await empleadoApi.actualizar(sucursalActiva, data.codigo, { ...data, ...payload });
                message.success('Empleado actualizado correctamente');
            }
            else {
                const nuevo = await empleadoApi.crear(sucursalActiva, payload);
                message.success('Empleado creado correctamente');
                if (nuevo?.codigo) {
                    navigate(`/MEMP/${nuevo.codigo}`, { replace: true });
                    return;
                }
            }
            navigate('/MEMP', { replace: true });
        }
        catch (err) {
            if (err?.errorFields)
                return; // errores de validación del form
            message.error(extraerMensajeError(err, 'Error al guardar empleado'));
        }
        finally {
            setGuardando(false);
        }
    };
    const handleRefresh = useCallback(() => {
        if (esNuevo || !codigo)
            return;
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
            .catch((err) => {
            message.error(extraerMensajeError(err, 'Error al recargar'));
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [codigo, sucursalActiva, setPageTitleOverride, esNuevo, form]);
    // ===== Helper: campo en formulario =====
    const renderFormItem = (name, label, component, rules, span) => (_jsx(Col, { xs: 24, sm: 12, lg: span || 8, children: _jsx(Form.Item, { name: name, label: label, rules: rules, children: component }) }));
    // ===== Card: Datos Personales =====
    const renderDatosPersonales = () => (_jsx(Card, { title: "Datos Personales", className: "paces-card", style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: [16, 0], children: [renderFormItem('codigo', 'Código', _jsx(Input, { disabled: true, placeholder: "Autogenerado" }), esNuevo ? undefined : [{ required: true, message: 'Obligatorio' }]), renderFormItem('nombre', 'Nombre Completo', _jsx(Input, { placeholder: "Nombre completo", maxLength: 100 }), [{ required: true, message: 'Obligatorio' }], 12), renderFormItem('nombre1', 'Primer Nombre', _jsx(Input, { placeholder: "Primer nombre", maxLength: 50 })), renderFormItem('nombre2', 'Segundo Nombre', _jsx(Input, { placeholder: "Segundo nombre", maxLength: 50 })), renderFormItem('apellido1', 'Primer Apellido', _jsx(Input, { placeholder: "Primer apellido", maxLength: 50 })), renderFormItem('apellido2', 'Segundo Apellido', _jsx(Input, { placeholder: "Segundo apellido", maxLength: 50 })), renderFormItem('identificacion', 'Cédula / Identificación', _jsx(Input, { placeholder: "N\u00FAmero de identificaci\u00F3n", maxLength: 20 })), renderFormItem('nss', 'NSS', _jsx(Input, { placeholder: "N\u00FAmero de seguro social", maxLength: 20 })), renderFormItem('sexo', 'Sexo', _jsx(Select, { options: SEXO_OPTIONS })), renderFormItem('estadoCivil', 'Estado Civil', _jsx(Select, { allowClear: true, placeholder: "Seleccione estado civil", options: ESTADO_CIVIL_OPTIONS })), renderFormItem('lugarNacimiento', 'Lugar de Nacimiento', _jsx(Input, { placeholder: "Ciudad / Provincia", maxLength: 100 })), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "activo", label: "Activo", valuePropName: "checked", initialValue: true, children: _jsx(Switch, { checkedChildren: "S\u00ED", unCheckedChildren: "No" }) }) })] }) }));
    // ===== Card: Fechas =====
    const renderFechas = () => (_jsx(Card, { title: "Fechas", className: "paces-card", style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: [16, 0], children: [renderFormItem('fechaNacimiento', 'Fecha de Nacimiento', _jsx(DatePicker, { style: { width: '100%' }, format: "DD/MM/YYYY" })), renderFormItem('fechaIngreso', 'Fecha de Ingreso', _jsx(DatePicker, { style: { width: '100%' }, format: "DD/MM/YYYY" })), renderFormItem('fechaSalida', 'Fecha de Salida', _jsx(DatePicker, { style: { width: '100%' }, format: "DD/MM/YYYY" }))] }) }));
    // ===== Card: Contacto y Salud =====
    const renderContactoSalud = () => (_jsxs(Card, { title: "Contacto y Salud", className: "paces-card", style: { marginBottom: 16 }, children: [_jsxs(Row, { gutter: [16, 0], children: [renderFormItem('telefono', 'Teléfono', _jsx(Input, { placeholder: "809-555-2003", maxLength: 15 })), renderFormItem('telefonoAdicional', 'Teléfono Adicional', _jsx(Input, { placeholder: "809-555-2003", maxLength: 15 })), renderFormItem('correoElectronico', 'Correo Electrónico', _jsx(Input, { placeholder: "correo@ejemplo.com", maxLength: 80 })), renderFormItem('contactoEmergencia', 'Contacto Emergencia', _jsx(Input, { placeholder: "Nombre y tel\u00E9fono", maxLength: 100 })), renderFormItem('tipoSangre', 'Tipo de Sangre', _jsx(Select, { allowClear: true, placeholder: "Seleccione tipo de sangre", options: TIPO_SANGRE_OPTIONS }))] }), _jsx(Row, { gutter: [16, 0], children: _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "direccion", label: "Direcci\u00F3n", children: _jsx(Input, { placeholder: "Direcci\u00F3n completa", maxLength: 200 }) }) }) }), _jsxs(Row, { gutter: [16, 0], children: [_jsx(Col, { xs: 24, sm: 12, children: _jsx(Form.Item, { name: "alergias", label: "Alergias", children: _jsx(Input.TextArea, { placeholder: "Alergias conocidas", rows: 2, maxLength: 500 }) }) }), _jsx(Col, { xs: 24, sm: 12, children: _jsx(Form.Item, { name: "enfermedades", label: "Enfermedades", children: _jsx(Input.TextArea, { placeholder: "Enfermedades preexistentes", rows: 2, maxLength: 500 }) }) })] })] }));
    // ===== Card: Laborales =====
    const renderLaborales = () => (_jsx(Card, { title: "Laborales", className: "paces-card", style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: [16, 0], children: [renderFormItem('departamento', 'Departamento', _jsx(Select, { allowClear: true, showSearch: true, placeholder: "Seleccione departamento", optionFilterProp: "children", options: departamentos.map(d => ({ value: d.codigo, label: `${d.codigo} - ${d.nombre}` })) })), renderFormItem('posicion', 'Posición / Cargo', _jsx(Select, { allowClear: true, showSearch: true, placeholder: "Seleccione posici\u00F3n", optionFilterProp: "children", options: posiciones.map(p => ({ value: p.codigo, label: `${p.codigo} - ${p.nombre}` })) })), renderFormItem('categoria', 'Categoría', _jsx(Select, { allowClear: true, placeholder: "Seleccionar categor\u00EDa", options: categorias.map(c => ({ value: c.codigo, label: c.nombre })) })), renderFormItem('horarioId', 'Horario', _jsx(Input, { placeholder: "ID del horario", maxLength: 20 })), renderFormItem('nivelAcademico', 'Nivel Académico', _jsx(Input, { placeholder: "Ej: Universitario, T\u00E9cnico", maxLength: 100 })), renderFormItem('gradoAlcanzado', 'Grado Alcanzado', _jsx(Input, { placeholder: "Ej: Licenciatura, Maestr\u00EDa", maxLength: 100 }))] }) }));
    // ===== Card: Salariales =====
    const renderSalariales = () => (_jsx(Card, { title: "Salariales", className: "paces-card", style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: [16, 0], children: [renderFormItem('tipoNomina', 'Tipo de Nómina', _jsx(Select, { allowClear: true, placeholder: "Seleccione tipo de n\u00F3mina", options: TIPO_NOMINA_OPTIONS })), renderFormItem('salario', 'Salario', _jsx(InputNumber, { min: 0, step: 0.01, style: { width: '100%' }, formatter: (value) => `RD$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','), parser: (value) => value?.replace(/RD\$\s?|(,*)/g, '') }))] }) }));
    // ===== Card: Notas =====
    const renderNotas = () => (_jsx(Card, { title: "Notas", className: "paces-card", style: { marginBottom: 16 }, children: _jsx(Row, { gutter: [16, 0], children: _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "notas", label: "Notas", children: _jsx(Input.TextArea, { placeholder: "Notas sobre el empleado", rows: 3, maxLength: 1000 }) }) }) }) }));
    // ===== Render formulario principal =====
    const renderFormulario = () => (_jsxs(Form, { form: form, layout: "vertical", size: "small", children: [renderDatosPersonales(), renderFechas(), renderContactoSalud(), renderLaborales(), renderSalariales(), renderNotas()] }));
    return (_jsx(DetalleCatalogoLayout, { rutaVolver: "/MEMP", loading: loading, mensajeLoading: esNuevo ? 'Preparando formulario...' : 'Cargando empleado...', loadingError: loadingError, mensajeError: "Error al cargar formulario de empleado", onRecargar: handleRefresh, dataDisponible: esNuevo || !!data, modo: esNuevo ? 'crear' : 'editar', onGuardar: handleGuardar, guardando: guardando, children: renderFormulario() }));
};
export default EmpleadoFormulario;
