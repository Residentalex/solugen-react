import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, message, Form, Input, Select, Switch, Row, Col, Typography, Tabs, Descriptions, InputNumber, Tag, Grid, Divider, DatePicker, Button, Modal, Table, } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { clienteApi } from '../../api/clienteApi';
import { proveedorApi } from '../../api/proveedorApi';
import { empleadoApi } from '../../api/empleadoApi';
import ErrorBoundary from '../../components/ErrorBoundary';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import { formatCurrency, toISOFormat } from '../../utils/formats';
import PersonasAutorizadasTab from './components/PersonasAutorizadasTab';
import GruposProductosTab from './components/GruposProductosTab';
import CuentasBancariasTab from './components/CuentasBancariasTab';
import LugaresTrabajoTab from './components/LugaresTrabajoTab';
import MovimientosTab from './components/MovimientosTab';
import FacturacionTab from './components/FacturacionTab';
import ContactosTab from './components/ContactosTab';
const { Text } = Typography;
// Helpers de enums
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
const TIPO_IDENTIFICACION_LABEL = {
    0: 'RNC',
    1: 'Cédula',
    2: 'Pasaporte',
};
const ClienteDetalle = () => {
    const { codigo } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const esNuevo = !codigo || codigo === 'nuevo';
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [editando, setEditando] = useState(false);
    const [form] = Form.useForm();
    const screens = Grid.useBreakpoint();
    const isLarge = screens.xxl === true;
    // Estados para catálogos
    const [tiposNCF, setTiposNCF] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [cuentasContables, setCuentasContables] = useState([]);
    const [monedas, setMonedas] = useState([]);
    // Estados de "loaded" para catálogos bajo demanda
    const [categoriasLoaded, setCategoriasLoaded] = useState(false);
    const [tiposNCFLoaded, setTiposNCFLoaded] = useState(false);
    const [cuentasContablesLoaded, setCuentasContablesLoaded] = useState(false);
    const [monedasLoaded, setMonedasLoaded] = useState(false);
    // Estados para modal clonar
    const [modalVisible, setModalVisible] = useState(false);
    const [tiposEntidad, setTiposEntidad] = useState([]);
    const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
    const [entidades, setEntidades] = useState([]);
    const [cargandoEntidades, setCargandoEntidades] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [clonando, setClonando] = useState(false);
    const [searchTexto, setSearchTexto] = useState('');
    useEffect(() => {
        setActiveModule('MCliente');
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    useEffect(() => {
        if (esNuevo) {
            setPageTitleOverride('Nuevo Cliente');
            setEditando(true);
            form.setFieldsValue({ activo: true, tipoIdentificacion: 0 });
            return;
        }
        if (!codigo)
            return;
        const abortController = new AbortController();
        setLoading(true);
        setLoadingError(false);
        clienteApi.obtenerPorCodigo(sucursalActiva, codigo, abortController.signal)
            .then((res) => {
            if (abortController.signal.aborted)
                return;
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            setPageTitleOverride(res.nombre || codigo);
            form.setFieldsValue({
                codigo: res.codigo,
                nombre: res.nombre,
                tipoIdentificacion: res.tipoIdentificacion,
                identificacion: res.identificacion,
                telefono: res.telefono,
                telefonoAdicional: res.telefonoAdicional,
                correoElectronico: res.correoElectronico,
                direccion: res.direccion,
                sexo: res.sexo,
                estadoCivil: res.estadoCivil,
                fechaNacimiento: res.fechaNacimiento ? dayjs(res.fechaNacimiento) : null,
                nota: res.nota,
                activo: res.activo,
                limiteCredito: res.limiteCredito,
                diasCredito: res.diasCredito,
                creditoSuspendido: res.creditoSuspendido,
                exentoImpuesto: res.exentoImpuesto,
                margen: res.margen,
                porcientoDescuento: res.porcientoDescuento,
                // Nuevos campos
                sector: res.sector,
                ciudad: res.ciudad,
                zona: res.zona,
                nombreComercial: res.nombreComercial,
                contacto: res.contacto,
                telefonoContacto: res.telefonoContacto,
                fax: res.fax,
                fechaIngreso: res.fechaIngreso ? dayjs(res.fechaIngreso) : null,
                codigoVendedor: res.codigoVendedor,
                vendedorNombre: res.vendedorNombre,
                codigoListaPrecio: res.codigoListaPrecio,
                listaPrecioNombre: res.listaPrecioNombre,
                perfil: res.perfil,
                comision: res.comision,
                facebook: res.facebook,
                twitter: res.twitter,
                codigoMoneda: res.codigoMoneda,
                balance: res.balance,
                fechaUltimoPago: res.fechaUltimoPago,
                montoUltimoPago: res.montoUltimoPago,
                documentoUltimoPago: res.documentoUltimoPago,
                categoria: res.categoria?.codigo,
                tipoNcf: res.tipoNcf?.codigo,
                cuentaContable: res.cuentaContable?.noCuenta,
            });
        })
            .catch((err) => {
            if (err?.name === 'CanceledError' || abortController.signal.aborted)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al cargar cliente');
            setLoadingError(true);
        })
            .finally(() => {
            if (!abortController.signal.aborted)
                setLoading(false);
        });
        return () => abortController.abort();
    }, [codigo, sucursalActiva, setPageTitleOverride, esNuevo, form]);
    // Bloqueo de navegación con cambios sin guardar
    useEffect(() => {
        const handler = (e) => {
            if (editando && form.isFieldsTouched()) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [editando, form]);
    useEffect(() => {
        const handlePopState = () => {
            if (editando && form.isFieldsTouched()) {
                const leave = window.confirm('Los cambios no guardados se perderán. ¿Está seguro que desea salir?');
                if (!leave) {
                    window.history.pushState(null, '', window.location.pathname);
                }
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [editando, form]);
    const handleVolver = useCallback(() => {
        if (editando && form.isFieldsTouched()) {
            Modal.confirm({
                title: '¿Salir sin guardar?',
                content: 'Los cambios no guardados se perderán.',
                okText: 'Salir',
                cancelText: 'Cancelar',
                onOk: () => navigate('/MCliente'),
            });
        }
        else {
            navigate('/MCliente');
        }
    }, [editando, form, navigate]);
    // Permisos
    const usuario = useAuthStore((s) => s.usuario);
    const pantallaActual = usuario?.pantallas.find((p) => p.codigo === 'MCliente');
    const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;
    const puedeCrear = pantallaActual?.acciones.includes('CREAR') ?? false;
    // Funciones de carga bajo demanda para catálogos
    const cargarCategorias = () => {
        if (categoriasLoaded)
            return;
        apiClient.get(`/categoriaentidad/${sucursalActiva}/tipo/CLI`)
            .then((res) => setCategorias(res.data?.data || []))
            .catch((err) => message.error(err?.response?.data?.errorMessage || 'Error al cargar categorías'))
            .finally(() => setCategoriasLoaded(true));
    };
    const cargarTiposNCF = () => {
        if (tiposNCFLoaded)
            return;
        apiClient.get(`/TipoNCF/${sucursalActiva}`)
            .then((res) => setTiposNCF(res.data?.data || []))
            .catch((err) => message.error(err?.response?.data?.errorMessage || 'Error al cargar tipos NCF'))
            .finally(() => setTiposNCFLoaded(true));
    };
    const cargarCuentasContables = () => {
        if (cuentasContablesLoaded)
            return;
        apiClient.get(`/CuentaContable/${sucursalActiva}/Auxiliares`)
            .then((res) => setCuentasContables(res.data?.data || []))
            .catch((err) => message.error(err?.response?.data?.errorMessage || 'Error al cargar cuentas contables'))
            .finally(() => setCuentasContablesLoaded(true));
    };
    const cargarMonedas = () => {
        if (monedasLoaded)
            return;
        apiClient.get(`/Moneda/${sucursalActiva}`)
            .then((res) => setMonedas(res.data?.data || []))
            .catch((err) => message.error(err?.response?.data?.errorMessage || 'Error al cargar monedas'))
            .finally(() => setMonedasLoaded(true));
    };
    const handleGuardar = async () => {
        try {
            const values = await form.validateFields();
            setGuardando(true);
            const payload = {
                codigo: values.codigo,
                nombre: values.nombre,
                tipoIdentificacion: values.tipoIdentificacion ?? 0,
                identificacion: (values.identificacion || '').replace(/-/g, ''),
                correoElectronico: values.correoElectronico || '',
                telefono: values.telefono || '',
                telefonoAdicional: values.telefonoAdicional || '',
                direccion: values.direccion || '',
                nota: values.nota || '',
                activo: values.activo ?? true,
                sexo: values.sexo,
                estadoCivil: values.estadoCivil,
                fechaNacimiento: values.fechaNacimiento ? toISOFormat(dayjs(values.fechaNacimiento).toDate()) : null,
                limiteCredito: values.limiteCredito ?? 0,
                diasCredito: values.diasCredito ?? 0,
                creditoSuspendido: values.creditoSuspendido ?? false,
                exentoImpuesto: values.exentoImpuesto ?? false,
                margen: values.margen ?? 0,
                porcientoDescuento: values.porcientoDescuento ?? 0,
                // Nuevos campos
                sector: values.sector || '',
                ciudad: values.ciudad || '',
                zona: values.zona || '',
                nombreComercial: values.nombreComercial || '',
                contacto: values.contacto || '',
                telefonoContacto: values.telefonoContacto || '',
                fax: values.fax || '',
                fechaIngreso: values.fechaIngreso ? toISOFormat(dayjs(values.fechaIngreso).toDate()) : null,
                codigoVendedor: values.codigoVendedor || '',
                vendedorNombre: values.vendedorNombre || '',
                codigoListaPrecio: values.codigoListaPrecio || '',
                listaPrecioNombre: values.listaPrecioNombre || '',
                perfil: values.perfil || '',
                comision: values.comision ?? 0,
                facebook: values.facebook || '',
                twitter: values.twitter || '',
                codigoMoneda: values.codigoMoneda || '',
            };
            // Mapear selects de catálogo que el backend espera como objetos anidados
            if (values.categoria)
                payload.categoria = { codigo: values.categoria, descripcion: '' };
            if (values.tipoNcf)
                payload.tipoNcf = { codigo: values.tipoNcf, nombre: '' };
            if (values.cuentaContable)
                payload.cuentaContable = { noCuenta: values.cuentaContable, nombre: '' };
            if (!esNuevo && data) {
                await clienteApi.actualizar(sucursalActiva, { ...data, ...payload });
                message.success('Cliente actualizado correctamente');
                navigate('/MCliente');
            }
            else {
                const creado = await clienteApi.crear(sucursalActiva, payload);
                message.success('Cliente creado correctamente');
                navigate(`/MCliente/${creado.codigo}`);
            }
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al guardar cliente');
        }
        finally {
            setGuardando(false);
        }
    };
    const abrirModalClonar = useCallback(async () => {
        setModalVisible(true);
        setTipoSeleccionado(null);
        setEntidades([]);
        setSelectedEntity(null);
        setSearchTexto('');
        try {
            const { data } = await apiClient.get(`/TipoEntidad/${sucursalActiva}/exportables`);
            setTiposEntidad(data?.data || []);
        }
        catch {
            message.error('Error al cargar tipos de entidad');
        }
    }, [sucursalActiva]);
    useEffect(() => {
        if (!tipoSeleccionado) {
            setEntidades([]);
            setSelectedEntity(null);
            return;
        }
        setCargandoEntidades(true);
        setSelectedEntity(null);
        const carga = searchTexto.trim()
            ? apiClient.get(`/Entidades/${sucursalActiva}/filtrar`, {
                params: { tipo: tipoSeleccionado, entidad: searchTexto.trim() }
            })
            : apiClient.get(`/Entidades/${sucursalActiva}`, {
                params: { tipo: tipoSeleccionado, activo: true, cantidad: 100 }
            });
        carga
            .then((res) => setEntidades(res.data?.data || []))
            .catch(() => message.error('Error al cargar entidades'))
            .finally(() => setCargandoEntidades(false));
    }, [tipoSeleccionado, sucursalActiva, searchTexto]);
    const handleClonar = useCallback(async () => {
        if (!selectedEntity)
            return;
        setClonando(true);
        try {
            // 1. Obtener datos base de la entidad
            const { data: resp } = await apiClient.get(`/Entidades/${sucursalActiva}/${selectedEntity.codigo}`, {
                params: { tipo: tipoSeleccionado }
            });
            const entidad = resp?.data;
            if (!entidad) {
                message.error('No se pudo obtener los datos de la entidad');
                return;
            }
            // 2. Obtener datos específicos según tipo de entidad
            let datosEspecificos = {};
            try {
                if (tipoSeleccionado === 'CLI') {
                    const cli = await clienteApi.obtenerPorCodigo(sucursalActiva, selectedEntity.codigo);
                    if (cli)
                        datosEspecificos = cli;
                }
                else if (tipoSeleccionado === 'SUP') {
                    const sup = await proveedorApi.obtenerPorCodigo(sucursalActiva, selectedEntity.codigo);
                    if (sup)
                        datosEspecificos = sup;
                }
                else if (tipoSeleccionado === 'EMP') {
                    const emp = await empleadoApi.obtenerPorCodigo(sucursalActiva, selectedEntity.codigo);
                    if (emp)
                        datosEspecificos = emp;
                }
            }
            catch {
                // Si falla la carga específica, solo usar datos base
            }
            // 3. Fusionar: datos específicos tienen prioridad
            const fusion = { ...entidad, ...datosEspecificos };
            form.setFieldsValue({
                nombre: fusion.nombre,
                tipoIdentificacion: fusion.tipoIdentificacion ?? 0,
                identificacion: fusion.identificacion || '',
                telefono: fusion.telefono || '',
                telefonoAdicional: fusion.telefonoAdicional || '',
                correoElectronico: fusion.correoElectronico || '',
                direccion: fusion.direccion || '',
                sexo: fusion.sexo,
                estadoCivil: fusion.estadoCivil,
                fechaNacimiento: fusion.fechaNacimiento ? dayjs(fusion.fechaNacimiento) : null,
                nota: fusion.nota || '',
                activo: fusion.activo ?? true,
                sector: fusion.sector || '',
                ciudad: fusion.ciudad || '',
                zona: fusion.zona || '',
                contacto: fusion.contacto || '',
                telefonoContacto: fusion.telefonoContacto || '',
                fax: fusion.fax || '',
                nombreComercial: fusion.nombreComercial || '',
                categoria: fusion.categoria?.codigo,
                cuentaContable: fusion.cuentaContable?.noCuenta,
            });
            message.success(`Datos clonados desde ${fusion.nombre}`);
            setModalVisible(false);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al clonar entidad');
        }
        finally {
            setClonando(false);
        }
    }, [selectedEntity, sucursalActiva, tipoSeleccionado, form]);
    // Nota: loading, loadingError, dataDisponible se manejan via DetalleCatalogoLayout
    const esSoloLectura = !esNuevo && !editando;
    const tabItems = [
        {
            key: 'contactos',
            label: 'Contactos',
            children: !esNuevo && codigo ? (_jsx(ContactosTab, { codigoCliente: codigo })) : (_jsx("div", { style: { padding: 16, textAlign: 'center' }, className: "paces-text-secondary", children: _jsx(Text, { type: "secondary", children: "Guarde el cliente primero para gestionar contactos" }) })),
        },
        {
            key: 'personas',
            label: 'Personas Autorizadas',
            children: !esNuevo && codigo ? (_jsx(PersonasAutorizadasTab, { codigoCliente: codigo, sucursal: sucursalActiva })) : (_jsx("div", { style: { padding: 16, textAlign: 'center' }, className: "paces-text-secondary", children: _jsx(Text, { type: "secondary", children: "Guarde el cliente primero para gestionar personas autorizadas" }) })),
        },
        {
            key: 'grupos',
            label: 'Grupos de Productos',
            children: !esNuevo && codigo ? (_jsx(GruposProductosTab, { codigoCliente: codigo, sucursal: sucursalActiva })) : (_jsx("div", { style: { padding: 16, textAlign: 'center' }, className: "paces-text-secondary", children: _jsx(Text, { type: "secondary", children: "Guarde el cliente primero para gestionar grupos de productos" }) })),
        },
        {
            key: 'bancos',
            label: 'Cuentas Bancarias',
            children: !esNuevo && codigo ? (_jsx(CuentasBancariasTab, { codigoCliente: codigo, sucursal: sucursalActiva })) : (_jsx("div", { style: { padding: 16, textAlign: 'center' }, className: "paces-text-secondary", children: _jsx(Text, { type: "secondary", children: "Guarde el cliente primero para gestionar cuentas bancarias" }) })),
        },
        {
            key: 'lugares',
            label: 'Lugares de Trabajo',
            children: !esNuevo && codigo ? (_jsx(LugaresTrabajoTab, { codigoCliente: codigo, sucursal: sucursalActiva, data: data })) : (_jsx("div", { style: { padding: 16, textAlign: 'center' }, className: "paces-text-secondary", children: _jsx(Text, { type: "secondary", children: "Guarde el cliente primero para ver lugares de trabajo" }) })),
        },
        {
            key: 'movimientos',
            label: 'Movimientos',
            children: _jsx(MovimientosTab, {}),
        },
        {
            key: 'facturacion',
            label: 'Facturación',
            children: _jsx(FacturacionTab, {}),
        },
    ];
    const handleRefresh = () => {
        if (esNuevo || !codigo)
            return;
        setLoadingError(false);
        setLoading(true);
        const abortController = new AbortController();
        clienteApi.obtenerPorCodigo(sucursalActiva, codigo, abortController.signal)
            .then((res) => {
            if (abortController.signal.aborted)
                return;
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            setPageTitleOverride(res.nombre || codigo);
            form.setFieldsValue({
                codigo: res.codigo, nombre: res.nombre, tipoIdentificacion: res.tipoIdentificacion,
                identificacion: res.identificacion, telefono: res.telefono, telefonoAdicional: res.telefonoAdicional,
                correoElectronico: res.correoElectronico, direccion: res.direccion, sexo: res.sexo,
                estadoCivil: res.estadoCivil, fechaNacimiento: res.fechaNacimiento ? dayjs(res.fechaNacimiento) : null, nota: res.nota,
                activo: res.activo, limiteCredito: res.limiteCredito, diasCredito: res.diasCredito,
                creditoSuspendido: res.creditoSuspendido, exentoImpuesto: res.exentoImpuesto,
                margen: res.margen, porcientoDescuento: res.porcientoDescuento,
                // Nuevos campos
                sector: res.sector, ciudad: res.ciudad, zona: res.zona,
                nombreComercial: res.nombreComercial, contacto: res.contacto,
                telefonoContacto: res.telefonoContacto, fax: res.fax, fechaIngreso: res.fechaIngreso ? dayjs(res.fechaIngreso) : null,
                codigoVendedor: res.codigoVendedor, vendedorNombre: res.vendedorNombre,
                codigoListaPrecio: res.codigoListaPrecio, listaPrecioNombre: res.listaPrecioNombre,
                perfil: res.perfil, comision: res.comision,
                facebook: res.facebook, twitter: res.twitter, codigoMoneda: res.codigoMoneda,
                balance: res.balance, fechaUltimoPago: res.fechaUltimoPago,
                montoUltimoPago: res.montoUltimoPago, documentoUltimoPago: res.documentoUltimoPago,
                categoria: res.categoria?.codigo,
                tipoNcf: res.tipoNcf?.codigo, cuentaContable: res.cuentaContable?.noCuenta,
            });
        })
            .catch((err) => {
            if (err?.name === 'CanceledError' || abortController.signal.aborted)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al recargar');
            setLoadingError(true);
        })
            .finally(() => {
            if (!abortController.signal.aborted)
                setLoading(false);
        });
    };
    // ===== Componentes auxiliares render =====
    const renderCampo = (nombre, children, span) => (_jsx(Descriptions.Item, { label: nombre, ...(span ? { span } : {}), children: children }));
    const renderReadonlyText = (valor, formato) => (_jsx(Text, { children: valor != null && valor !== '' ? (formato ? formato(valor) : String(valor)) : '-' }));
    const renderReadonlyMoneda = (valor) => (_jsx(Text, { style: { fontFamily: 'monospace' }, children: valor != null ? formatCurrency(valor) : '-' }));
    const renderReadonlyTag = (activo) => (_jsx(Tag, { color: activo ? 'green' : 'default', children: activo ? 'Sí' : 'No' }));
    // ===== Card: Datos Generales =====
    const renderDatosGenerales = () => (_jsx(Card, { title: "Datos Generales", className: "paces-card", style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 2, styles: { content: { background: 'transparent' } }, children: [renderCampo('Código', esSoloLectura ? (_jsx(Text, { style: { fontFamily: 'monospace' }, children: data?.codigo })) : esNuevo ? (_jsx(Form.Item, { name: "codigo", noStyle: true, children: _jsx(Input, { disabled: true, placeholder: "Autogenerado" }) })) : (_jsx(Form.Item, { name: "codigo", noStyle: true, rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(Input, { placeholder: "C\u00F3digo", maxLength: 20 }) }))), renderCampo('Nombre / Razón Social', esSoloLectura ? (_jsx(Text, { children: data?.nombre })) : (_jsx(Form.Item, { name: "nombre", noStyle: true, rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(Input, { placeholder: "Nombre del cliente", maxLength: 100 }) }))), renderCampo('Tipo Identificación', esSoloLectura ? (_jsx(Text, { children: TIPO_IDENTIFICACION_LABEL[data?.tipoIdentificacion ?? -1] || data?.tipoIdentificacion || '-' })) : (_jsx(Form.Item, { name: "tipoIdentificacion", noStyle: true, initialValue: 0, children: _jsx(Select, { style: { width: '100%' }, options: [
                            { value: 0, label: 'RNC' },
                            { value: 1, label: 'Cédula' },
                            { value: 2, label: 'Pasaporte' },
                        ] }) }))), renderCampo('Identificación', esSoloLectura ? (_jsx(Text, { children: data?.identificacion })) : (_jsx(Form.Item, { name: "identificacion", noStyle: true, rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(Input, { placeholder: "N\u00FAmero de ID", maxLength: 20 }) }))), renderCampo('Sexo', esSoloLectura ? (_jsx(Text, { children: SEXO_LABEL[data?.sexo ?? -1] || '-' })) : (_jsx(Form.Item, { name: "sexo", noStyle: true, children: _jsx(Select, { style: { width: '100%' }, allowClear: true, placeholder: "Seleccione sexo", options: [
                            { value: 0, label: 'Masculino' },
                            { value: 1, label: 'Femenino' },
                        ] }) }))), renderCampo('Estado Civil', esSoloLectura ? (_jsx(Text, { children: ESTADO_CIVIL_LABEL[data?.estadoCivil ?? -1] || '-' })) : (_jsx(Form.Item, { name: "estadoCivil", noStyle: true, children: _jsx(Select, { style: { width: '100%' }, allowClear: true, placeholder: "Seleccione estado civil", options: [
                            { value: 0, label: 'Casado(a)' },
                            { value: 1, label: 'Soltero(a)' },
                            { value: 2, label: 'Divorciado(a)' },
                            { value: 3, label: 'Viudo(a)' },
                        ] }) }))), renderCampo('Fecha Nacimiento', esSoloLectura ? (_jsx(Text, { children: data?.fechaNacimiento || '-' })) : (_jsx(Form.Item, { name: "fechaNacimiento", noStyle: true, children: _jsx(DatePicker, { style: { width: '100%' }, format: "DD/MM/YYYY" }) }))), renderCampo('Fecha Ingreso', esSoloLectura ? (_jsx(Text, { children: data?.fechaIngreso || '-' })) : (_jsx(Form.Item, { name: "fechaIngreso", noStyle: true, children: _jsx(DatePicker, { style: { width: '100%' }, format: "DD/MM/YYYY" }) }))), renderCampo('Nombre Comercial', esSoloLectura ? (_jsx(Text, { children: data?.nombreComercial || '-' })) : (_jsx(Form.Item, { name: "nombreComercial", noStyle: true, children: _jsx(Input, { placeholder: "Nombre comercial", maxLength: 100 }) }))), renderCampo('Activo', esSoloLectura ? (_jsx(Tag, { color: data?.activo ? 'green' : 'default', children: data?.activo ? 'Activo' : 'Inactivo' })) : (_jsx(Form.Item, { name: "activo", noStyle: true, valuePropName: "checked", initialValue: true, children: _jsx(Switch, { checkedChildren: "S\u00ED", unCheckedChildren: "No" }) }))), renderCampo('Categoría', esSoloLectura ? (_jsx(Text, { children: data?.categoria?.nombre || '-' })) : (_jsx(Form.Item, { name: "categoria", noStyle: true, rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(Select, { style: { width: '100%' }, allowClear: true, placeholder: "Seleccione categor\u00EDa", onDropdownVisibleChange: (open) => open && cargarCategorias(), onChange: (val) => {
                            // Auto-poblar cuenta contable desde la categoría seleccionada
                            if (val) {
                                const cat = categorias.find((c) => c.codigo === val);
                                if (cat?.numeroCuenta) {
                                    form.setFieldsValue({ cuentaContable: cat.numeroCuenta });
                                }
                            }
                            else {
                                form.setFieldsValue({ cuentaContable: undefined });
                            }
                        }, options: categorias.map(c => ({ value: c.codigo, label: `${c.codigo} - ${c.nombre}` })) }) }))), renderCampo('Tipo NCF', esSoloLectura ? (_jsx(Text, { children: data?.tipoNcf?.nombre || '-' })) : (_jsx(Form.Item, { name: "tipoNcf", noStyle: true, rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(Select, { style: { width: '100%' }, allowClear: true, placeholder: "Seleccione tipo NCF", onDropdownVisibleChange: (open) => open && cargarTiposNCF(), options: tiposNCF.map(t => ({ value: t.codigo, label: `${t.codigo} - ${t.nombre}` })) }) }))), renderCampo('Cuenta Contable', esSoloLectura ? (_jsx(Text, { children: data?.cuentaContable?.noCuenta ? `${data.cuentaContable.noCuenta} - ${data.cuentaContable.nombre}` : '-' })) : (_jsx(Form.Item, { name: "cuentaContable", noStyle: true, children: _jsx(Select, { style: { width: '100%' }, allowClear: true, showSearch: true, disabled: true, placeholder: "Seleccione cuenta contable", optionFilterProp: "label", onDropdownVisibleChange: (open) => open && cargarCuentasContables(), options: cuentasContables.map(c => ({ value: c.noCuenta, label: `${c.noCuenta} - ${c.nombre}` })) }) }))), renderCampo('Nota', esSoloLectura ? (_jsx("div", { style: { whiteSpace: 'pre-wrap' }, children: data?.nota || '-' })) : (_jsx(Form.Item, { name: "nota", noStyle: true, children: _jsx(Input.TextArea, { placeholder: "Notas del cliente", rows: 2, maxLength: 500 }) })), 2 // span 2 columnas
                )] }) }));
    // ===== Card: Comercial / Financiero =====
    const renderComercialFinanciero = () => (_jsx(Card, { title: "Comercial / Financiero", className: "paces-card", style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 2, styles: { content: { background: 'transparent' } }, children: [renderCampo('Vendedor', esSoloLectura ? (_jsx(Text, { children: data?.vendedorNombre || '-' })) : (_jsx(Form.Item, { name: "vendedorNombre", noStyle: true, children: _jsx(Select, { style: { width: '100%' }, allowClear: true, showSearch: true, placeholder: "Busque vendedor", optionFilterProp: "children", options: [] }) }))), renderCampo('Lista de Precios', esSoloLectura ? (_jsx(Text, { children: data?.listaPrecioNombre || '-' })) : (_jsx(Form.Item, { name: "listaPrecioNombre", noStyle: true, children: _jsx(Select, { style: { width: '100%' }, allowClear: true, placeholder: "Seleccione lista", options: [] }) }))), renderCampo('Perfil', esSoloLectura ? (_jsx(Text, { children: data?.perfil || '-' })) : (_jsx(Form.Item, { name: "perfil", noStyle: true, children: _jsx(Select, { style: { width: '100%' }, allowClear: true, placeholder: "Seleccione perfil", options: [] }) }))), renderCampo('Comisión %', esSoloLectura ? (_jsx(Text, { children: data?.comision != null ? `${data.comision.toFixed(2)}%` : '-' })) : (_jsx(Form.Item, { name: "comision", noStyle: true, initialValue: 0, children: _jsx(InputNumber, { min: 0, max: 100, step: 0.01, style: { width: '100%' } }) }))), renderCampo('Moneda', esSoloLectura ? (_jsx(Text, { children: data?.codigoMoneda || '-' })) : (_jsx(Form.Item, { name: "codigoMoneda", noStyle: true, children: _jsx(Select, { style: { width: '100%' }, allowClear: true, placeholder: "Seleccione moneda", onDropdownVisibleChange: (open) => open && cargarMonedas(), options: monedas.map(m => ({ value: m.codigo, label: `${m.codigo} - ${m.nombre}` })) }) }))), renderCampo('Límite Crédito', esSoloLectura ? (renderReadonlyMoneda(data?.limiteCredito)) : (_jsx(Form.Item, { name: "limiteCredito", noStyle: true, initialValue: 0, children: _jsx(InputNumber, { min: 0, step: 0.01, style: { width: '100%' } }) }))), renderCampo('Días Crédito', esSoloLectura ? (renderReadonlyText(data?.diasCredito)) : (_jsx(Form.Item, { name: "diasCredito", noStyle: true, initialValue: 0, children: _jsx(InputNumber, { min: 0, style: { width: '100%' } }) }))), renderCampo('% Descuento', esSoloLectura ? (renderReadonlyText(data?.porcientoDescuento, (v) => `${v.toFixed(2)}%`)) : (_jsx(Form.Item, { name: "porcientoDescuento", noStyle: true, initialValue: 0, children: _jsx(InputNumber, { min: 0, max: 100, step: 0.01, style: { width: '100%' } }) }))), renderCampo('Margen', esSoloLectura ? (renderReadonlyText(data?.margen)) : (_jsx(Form.Item, { name: "margen", noStyle: true, initialValue: 0, children: _jsx(InputNumber, { min: 0, step: 0.01, style: { width: '100%' } }) }))), renderCampo('Crédito Suspendido', esSoloLectura ? (renderReadonlyTag(data?.creditoSuspendido)) : (_jsx(Form.Item, { name: "creditoSuspendido", noStyle: true, valuePropName: "checked", children: _jsx(Switch, { checkedChildren: "S\u00ED", unCheckedChildren: "No" }) }))), renderCampo('Exento Impuesto', esSoloLectura ? (renderReadonlyTag(data?.exentoImpuesto)) : (_jsx(Form.Item, { name: "exentoImpuesto", noStyle: true, valuePropName: "checked", children: _jsx(Switch, { checkedChildren: "S\u00ED", unCheckedChildren: "No" }) })))] }) }));
    // ===== Sidebar (solo desktop) =====
    const renderSidebar = () => (_jsx(Card, { title: "Resumen Financiero", className: "paces-card", style: { marginBottom: 16 }, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs("div", { children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, marginBottom: 2 }, children: "Balance Actual" }), _jsx("div", { style: { fontSize: 20, fontWeight: 700, color: 'var(--paces-primary)' }, children: formatCurrency(data?.balance ?? 0) })] }), _jsx(Divider, { style: { margin: '4px 0' } }), _jsxs("div", { children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, marginBottom: 2 }, children: "Fecha \u00DAltimo Pago" }), _jsx("div", { style: { fontSize: 14, fontWeight: 500 }, children: data?.fechaUltimoPago || '-' })] }), _jsxs("div", { children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, marginBottom: 2 }, children: "Monto \u00DAltimo Pago" }), _jsx("div", { style: { fontSize: 14, fontWeight: 500 }, children: data?.montoUltimoPago != null ? formatCurrency(data.montoUltimoPago) : '-' })] }), _jsxs("div", { children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, marginBottom: 2 }, children: "Documento \u00DAltimo Pago" }), _jsx("div", { style: { fontSize: 14, fontWeight: 500 }, children: data?.documentoUltimoPago || '-' })] })] }) }));
    // ===== Render Principal =====
    const renderFormulario = () => (_jsx(Form, { form: form, layout: "vertical", size: "small", children: isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [renderDatosGenerales(), renderComercialFinanciero(), _jsx(Card, { className: "paces-card", styles: { body: { padding: 0 } }, children: _jsx(Tabs, { defaultActiveKey: "personas", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: tabItems }) })] }), _jsx(Col, { xxl: 6, children: renderSidebar() })] })) : (_jsxs("div", { children: [renderDatosGenerales(), renderComercialFinanciero(), _jsx(Card, { className: "paces-card", styles: { body: { padding: 0 } }, children: _jsx(Tabs, { defaultActiveKey: "personas", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: tabItems }) })] })) }));
    return (_jsxs(_Fragment, { children: [_jsx(DetalleCatalogoLayout, { rutaVolver: "/MCliente", onVolver: handleVolver, loading: loading, mensajeLoading: "Cargando cliente...", loadingError: loadingError, mensajeError: "Error al cargar detalle de cliente", onRecargar: handleRefresh, dataDisponible: esNuevo || !!data, modo: esNuevo ? 'crear' : 'editar', onEditar: (!esNuevo && !editando && puedeEditar) ? () => { setEditando(true); cargarCategorias(); cargarTiposNCF(); cargarCuentasContables(); cargarMonedas(); } : undefined, onGuardar: (esNuevo || editando) ? handleGuardar : undefined, guardando: guardando, extraActions: esNuevo ? (_jsx(Button, { icon: _jsx(CopyOutlined, {}), onClick: abrirModalClonar, children: "Clonar desde otra entidad" })) : undefined, children: renderFormulario() }), _jsx(Modal, { title: "Clonar desde otra entidad", open: modalVisible, onCancel: () => setModalVisible(false), width: 800, footer: [
                    _jsx(Button, { onClick: () => setModalVisible(false), children: "Cancelar" }, "cancel"),
                    _jsx(Button, { type: "primary", icon: _jsx(CopyOutlined, {}), disabled: !selectedEntity, loading: clonando, onClick: handleClonar, children: "Clonar" }, "clone"),
                ], children: _jsxs(Row, { gutter: 16, children: [_jsxs(Col, { span: 8, children: [_jsx(Typography.Text, { strong: true, children: "Tipo de Entidad" }), _jsx(Table, { dataSource: tiposEntidad, columns: [{ title: 'Código', dataIndex: 'codigo', width: 80 }, { title: 'Descripción', dataIndex: 'descripcion' }], rowKey: "codigo", size: "small", pagination: false, scroll: { y: 400 }, onRow: (record) => ({
                                        onClick: () => setTipoSeleccionado(record.codigo),
                                        style: { cursor: 'pointer', background: tipoSeleccionado === record.codigo ? '#e6f7ff' : undefined }
                                    }) })] }), _jsxs(Col, { span: 16, children: [_jsx(Typography.Text, { strong: true, children: "Entidades" }), _jsx(Input.Search, { placeholder: "Buscar entidad...", allowClear: true, onSearch: (value) => setSearchTexto(value), onClear: () => setSearchTexto(''), style: { marginBottom: 8 } }), _jsx(Table, { dataSource: entidades, loading: cargandoEntidades, columns: [
                                        { title: 'Código', dataIndex: 'codigo', width: 80 },
                                        { title: 'Nombre', dataIndex: 'nombre' },
                                        { title: 'Identificación', dataIndex: 'identificacion', width: 130 },
                                    ], rowKey: "codigo", size: "small", pagination: false, scroll: { y: 400 }, onRow: (record) => ({
                                        onClick: () => setSelectedEntity(record),
                                        style: { cursor: 'pointer', background: selectedEntity?.codigo === record.codigo ? '#e6f7ff' : undefined }
                                    }) })] })] }) })] }));
};
const ClienteDetalleWithBoundary = () => (_jsx(ErrorBoundary, { children: _jsx(ClienteDetalle, {}) }));
export default ClienteDetalleWithBoundary;
