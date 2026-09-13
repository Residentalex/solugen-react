import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Grid, Tabs, Typography, message, } from 'antd';
import { IdcardOutlined, PhoneOutlined, EnvironmentOutlined, HeartOutlined, TeamOutlined, DollarOutlined, } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { empleadoApi } from '../../api/empleadoApi';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import { formatDate, formatNumber, toTitleCase } from '../../utils/formats';
const { Text } = Typography;
const SEXO_LABEL = {
    0: 'Masculino',
    1: 'Femenino',
};
const ESTADO_CIVIL_LABEL = {
    0: 'Casado(a)',
    1: 'Soltero(a)',
    2: 'Divorciado(a)',
    3: 'Viudo(a)',
};
const TIPO_SANGRE_LABEL = {
    'A+': 'A+',
    'A-': 'A-',
    'B+': 'B+',
    'B-': 'B-',
    'AB+': 'AB+',
    'AB-': 'AB-',
    'O+': 'O+',
    'O-': 'O-',
};
const TIPO_NOMINA_LABEL = {
    0: 'Fijo',
    1: 'Variable',
    2: 'Mixto',
};
function extraerMensajeError(err, fallback) {
    const data = err?.response?.data;
    if (!data)
        return fallback;
    if (data.errorMessage)
        return data.errorMessage;
    if (data.errors && typeof data.errors === 'object') {
        const mensajes = [];
        for (const key of Object.keys(data.errors)) {
            const val = data.errors[key];
            if (Array.isArray(val))
                mensajes.push(...val);
            else if (typeof val === 'string')
                mensajes.push(val);
        }
        if (mensajes.length > 0)
            return mensajes.join('; ');
    }
    return fallback;
}
const EmpleadoDetalle = () => {
    const { codigo } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const screens = Grid.useBreakpoint();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    useEffect(() => {
        setActiveModule('MEMP');
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    useEffect(() => {
        if (!codigo)
            return;
        setLoading(true);
        empleadoApi.obtenerPorCodigo(sucursalActiva, codigo)
            .then((res) => {
            setData(res);
            setPageTitleOverride(`${res.codigo} - ${toTitleCase(res.nombre || '')}`);
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al cargar el empleado');
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [codigo, sucursalActiva, setPageTitleOverride]);
    const handleRefresh = useCallback(() => {
        if (!codigo)
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
            setPageTitleOverride(`${res.codigo} - ${toTitleCase(res.nombre || '')}`);
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al recargar');
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [codigo, sucursalActiva, setPageTitleOverride]);
    const isLarge = screens.xxl === true;
    const renderCampo = (nombre, children, span) => (_jsx(Descriptions.Item, { label: nombre, ...(span ? { span } : {}), children: children }));
    const renderReadonlyText = (valor, formato) => (_jsx(Text, { children: valor != null && valor !== '' ? (formato ? formato(valor) : String(valor)) : '-' }));
    const renderReadonlyMoneda = (valor) => (_jsx(Text, { style: { fontFamily: 'monospace' }, children: valor != null ? `RD$ ${formatNumber(valor)}` : '-' }));
    // ===== Tab 1: Datos Generales =====
    const tabDatosGenerales = (_jsx(Card, { className: "paces-card", style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: isLarge ? 3 : 1, styles: { content: { background: 'transparent' } }, children: [renderCampo('Código', _jsx(Text, { style: { fontFamily: 'monospace' }, children: data?.codigo || '-' })), renderCampo('Nombre Completo', _jsx(Text, { children: toTitleCase(data?.nombre || '') }), isLarge ? 2 : 1), renderCampo('Primer Nombre', renderReadonlyText(data?.nombre1)), renderCampo('Segundo Nombre', renderReadonlyText(data?.nombre2)), renderCampo('Primer Apellido', renderReadonlyText(data?.apellido1)), renderCampo('Segundo Apellido', renderReadonlyText(data?.apellido2)), renderCampo('Identificación', _jsxs("span", { children: [_jsx(IdcardOutlined, { style: { color: '#556ee6', marginRight: 6 } }), data?.identificacion || '-'] })), renderCampo('NSS', renderReadonlyText(data?.nss)), renderCampo('Sexo', _jsx(Text, { children: data?.sexo != null ? (SEXO_LABEL[data.sexo] || '-') : '-' })), renderCampo('Estado Civil', _jsx(Text, { children: data?.estadoCivil != null ? (ESTADO_CIVIL_LABEL[data.estadoCivil] || '-') : '-' })), renderCampo('Fecha Nacimiento', renderReadonlyText(data?.fechaNacimiento, formatDate)), renderCampo('Lugar Nacimiento', renderReadonlyText(data?.lugarNacimiento)), renderCampo('Estado', _jsx(Tag, { color: data?.activo ? 'green' : 'default', children: data?.activo ? 'Activo' : 'Inactivo' }))] }) }));
    // ===== Tab 2: Contacto y Salud =====
    const tabContactoSalud = (_jsxs(_Fragment, { children: [_jsx(Card, { title: "Contacto", className: "paces-card", style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: isLarge ? 2 : 1, styles: { content: { background: 'transparent' } }, children: [renderCampo('Teléfono', _jsxs("span", { children: [_jsx(PhoneOutlined, { style: { color: '#556ee6', marginRight: 6 } }), data?.telefono || '-'] })), renderCampo('Teléfono Adicional', _jsxs("span", { children: [_jsx(PhoneOutlined, { style: { color: '#556ee6', marginRight: 6 } }), data?.telefonoAdicional || '-'] })), renderCampo('Correo Electrónico', renderReadonlyText(data?.correoElectronico)), renderCampo('Dirección', _jsxs("span", { children: [_jsx(EnvironmentOutlined, { style: { color: '#556ee6', marginRight: 6 } }), data?.direccion ? toTitleCase(data.direccion) : '-'] })), renderCampo('Contacto Emergencia', renderReadonlyText(data?.contactoEmergencia))] }) }), _jsx(Card, { title: "Salud", className: "paces-card", style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: isLarge ? 2 : 1, styles: { content: { background: 'transparent' } }, children: [renderCampo('Tipo Sangre', _jsxs("span", { children: [_jsx(HeartOutlined, { style: { color: '#556ee6', marginRight: 6 } }), data?.tipoSangre ? (TIPO_SANGRE_LABEL[data.tipoSangre] || data.tipoSangre) : '-'] })), renderCampo('Alergias', _jsx("div", { style: { whiteSpace: 'pre-wrap' }, children: data?.alergias || '-' })), renderCampo('Enfermedades', _jsx("div", { style: { whiteSpace: 'pre-wrap' }, children: data?.enfermedades || '-' }))] }) })] }));
    // ===== Tab 3: Laborales =====
    const tabLaborales = (_jsx(Card, { className: "paces-card", style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: isLarge ? 2 : 1, styles: { content: { background: 'transparent' } }, children: [renderCampo('Departamento', _jsxs("span", { children: [_jsx(TeamOutlined, { style: { color: '#556ee6', marginRight: 6 } }), data?.departamento?.nombre || '-'] })), renderCampo('Posición / Cargo', renderReadonlyText(data?.posicion?.nombre)), renderCampo('Compañía', renderReadonlyText(data?.compania?.nombre)), renderCampo('Tipo Entidad', renderReadonlyText(data?.tipoEntidad?.nombre)), renderCampo('Horario', renderReadonlyText(data?.horarioId)), renderCampo('Fecha Ingreso', renderReadonlyText(data?.fechaIngreso, formatDate)), renderCampo('Fecha Salida', renderReadonlyText(data?.fechaSalida, formatDate)), renderCampo('Nivel Académico', renderReadonlyText(data?.nivelAcademico)), renderCampo('Grado Alcanzado', renderReadonlyText(data?.gradoAlcanzado))] }) }));
    // ===== Tab 4: Salariales =====
    const tabSalariales = (_jsx(Card, { className: "paces-card", style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: isLarge ? 2 : 1, styles: { content: { background: 'transparent' } }, children: [renderCampo('Tipo Nómina', _jsx(Text, { children: data?.tipoNomina != null ? (TIPO_NOMINA_LABEL[data.tipoNomina] || '-') : '-' })), renderCampo('Salario', _jsxs("span", { children: [_jsx(DollarOutlined, { style: { color: '#556ee6', marginRight: 6 } }), renderReadonlyMoneda(data?.salario)] }))] }) }));
    // ===== Notas =====
    const renderNotas = data?.notas ? (_jsx(Card, { title: "Notas", className: "paces-card", style: { marginBottom: 16 }, children: _jsx("div", { style: { whiteSpace: 'pre-wrap' }, children: data.notas }) })) : null;
    const tabItems = [
        { key: 'generales', label: 'Datos Generales', children: tabDatosGenerales },
        { key: 'contacto', label: 'Contacto y Salud', children: tabContactoSalud },
        { key: 'laborales', label: 'Laborales', children: tabLaborales },
        { key: 'salariales', label: 'Salariales', children: tabSalariales },
    ];
    const handleEditar = () => {
        if (codigo)
            navigate(`/MEMP/${codigo}/editar`);
    };
    return (_jsx(DetalleCatalogoLayout, { rutaVolver: "/MEMP", loading: loading, mensajeLoading: "Cargando empleado...", loadingError: loadingError, mensajeError: "Error al cargar detalle de empleado", onRecargar: handleRefresh, dataDisponible: !!data, onEditar: handleEditar, children: data && (_jsxs(_Fragment, { children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: toTitleCase(data.nombre || '') }), _jsx(Tag, { color: data.activo ? 'green' : 'default', children: data.activo ? 'Activo' : 'Inactivo' })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: isLarge ? 4 : 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "C\u00F3digo", children: _jsx(Text, { style: { fontFamily: 'monospace' }, children: data.codigo || '-' }) }), _jsx(Descriptions.Item, { label: "Departamento", children: data.departamento?.nombre || '-' }), _jsx(Descriptions.Item, { label: "Posici\u00F3n", children: data.posicion?.nombre || '-' }), _jsx(Descriptions.Item, { label: "Identificaci\u00F3n", children: data.identificacion || '-' })] }) }), _jsx(Card, { className: "paces-card", styles: { body: { padding: 0 } }, children: _jsx(Tabs, { defaultActiveKey: "generales", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: tabItems }) }), renderNotas] })) }));
};
export default EmpleadoDetalle;
