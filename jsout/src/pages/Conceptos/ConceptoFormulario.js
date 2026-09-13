import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tabs, Tag, Button, Space, Row, Col, Grid, message, Form, Input, Select, Switch, Typography, Modal, Alert, Spin, Table, Empty, } from 'antd';
import { SearchOutlined, SaveOutlined, CloseOutlined, ExclamationCircleOutlined, } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { conceptosApi } from '../../api/conceptosApi';
import { documentosApi } from '../../api/documentosApi';
import { cuentaContableApi } from '../../api/cuentaContableApi';
import { entidadApi } from '../../api/entidadApi';
import { tipoApi } from '../../api/tipoApi';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { toTitleCase, extraerMensajeError } from '../../utils/formats';
import PermissionGate from '../../components/PermissionGate';
const { Text } = Typography;
const BuscarCuentaInlineModal = ({ open, onClose, onSelect, buscarCuentas }) => {
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    // Precargar cuentas al abrir el modal
    useEffect(() => {
        if (!open)
            return;
        setSearchText('');
        setLoading(true);
        buscarCuentas('')
            .then(result => {
            setFiltered(result || []);
        })
            .catch(err => {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar cuentas contables');
            setFiltered([]);
        })
            .finally(() => setLoading(false));
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
    const handleSearch = async (val) => {
        const trimmed = (val || '').trim();
        setSearchText(trimmed);
        if (!trimmed) {
            setLoading(true);
            try {
                const result = await buscarCuentas('');
                setFiltered(result || []);
            }
            catch {
                setFiltered([]);
            }
            finally {
                setLoading(false);
            }
            return;
        }
        setLoading(true);
        try {
            const result = await buscarCuentas(trimmed);
            setFiltered(result);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al buscar cuentas contables');
            setFiltered([]);
        }
        finally {
            setLoading(false);
        }
    };
    const handleChange = (e) => {
        if (!e.target.value) {
            setSearchText('');
        }
    };
    const columnas = [
        { title: 'No. Cuenta', dataIndex: 'noCuenta', key: 'noCuenta', width: 140 },
        { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', ellipsis: true },
    ];
    return (_jsxs(Modal, { title: "Buscar Cuenta Contable", open: open, onCancel: onClose, footer: null, width: 600, destroyOnHidden: true, children: [_jsx(Input.Search, { placeholder: "Buscar por n\u00FAmero o nombre...", allowClear: true, onSearch: handleSearch, onChange: handleChange, style: { marginBottom: 16 } }), _jsx(Spin, { spinning: loading, children: _jsx(Table, { dataSource: filtered, columns: columnas, rowKey: "noCuenta", size: "small", pagination: { pageSize: 10, showSizeChanger: false }, onRow: (record) => ({
                        onClick: () => { onSelect(record); },
                        style: { cursor: 'pointer' },
                    }), locale: {
                        emptyText: !searchText
                            ? _jsx(Empty, { description: "Escriba para filtrar cuentas" })
                            : _jsx(Empty, { description: "Sin resultados" }),
                    } }) })] }));
};
const BuscarDocumentoInlineModal = ({ open, onClose, onSelect, documentos }) => {
    const [filtered, setFiltered] = useState(documentos);
    useEffect(() => { setFiltered(documentos); }, [documentos, open]);
    const handleSearch = (val) => {
        if (!val) {
            setFiltered(documentos);
            return;
        }
        const f = val.toLowerCase();
        setFiltered(documentos.filter(d => d.codigo.toLowerCase().includes(f) || (d.nombre || '').toLowerCase().includes(f)));
    };
    const columnas = [
        { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
        { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', ellipsis: true, render: (v) => toTitleCase(v) },
    ];
    return (_jsxs(Modal, { title: "Buscar Documento", open: open, onCancel: onClose, footer: null, width: 600, destroyOnClose: true, children: [_jsx(Input.Search, { placeholder: "Buscar por c\u00F3digo o nombre...", allowClear: true, onSearch: handleSearch, style: { marginBottom: 16 } }), _jsx(Table, { dataSource: filtered, columns: columnas, rowKey: "codigo", size: "small", pagination: { pageSize: 10, showSizeChanger: false }, onRow: (record) => ({
                    onClick: () => { onSelect(record); onClose(); },
                    style: { cursor: 'pointer' },
                }), locale: { emptyText: _jsx(Empty, { description: "No hay documentos" }) } })] }));
};
const TIPO_INGRESO_OPTIONS = [
    { value: 0, label: 'Ninguno' },
    { value: 1, label: 'Operaciones' },
    { value: 2, label: 'Financieros' },
    { value: 3, label: 'Extraordinarios' },
    { value: 4, label: 'Arrendamientos' },
    { value: 5, label: 'Venta Activo' },
    { value: 6, label: 'Otros Ingresos' },
];
const ConceptoFormulario = () => {
    const { codigo } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const screens = Grid.useBreakpoint();
    const mode = codigo && codigo !== 'nuevo' ? 'editar' : 'crear';
    const [form] = Form.useForm();
    const navigationConfirmedRef = useFormularioNavigation();
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState(null);
    // Catálogos
    const [almacenes, setAlmacenes] = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const [documentos, setDocumentos] = useState([]);
    const [tiposMap, setTiposMap] = useState({});
    const [tiposDocMap, setTiposDocMap] = useState({});
    const [tiposList, setTiposList] = useState([]);
    // Modales
    const [docModalOpen, setDocModalOpen] = useState(false);
    const [conceptoDestinoModalOpen, setConceptoDestinoModalOpen] = useState(false);
    const [conceptoReplicaModalOpen, setConceptoReplicaModalOpen] = useState(false);
    const [cuentaContableText, setCuentaContableText] = useState('');
    const [cuentaModalOpen, setCuentaModalOpen] = useState(false);
    // Entidades y Documentos del concepto
    const [entidades, setEntidades] = useState([]);
    const [documentosForm, setDocumentosForm] = useState([]);
    // Modal buscar entidad (inline)
    const [entidadBuscarText, setEntidadBuscarText] = useState('');
    const [entidadResultados, setEntidadResultados] = useState([]);
    const [entidadBuscarModalOpen, setEntidadBuscarModalOpen] = useState(false);
    // Modal agregar documento al concepto
    const [agregarDocModalOpen, setAgregarDocModalOpen] = useState(false);
    // Textos de display
    const [docAGenerarText, setDocAGenerarText] = useState('');
    const [conceptoDestinoText, setConceptoDestinoText] = useState('');
    const [conceptoReplicaText, setConceptoReplicaText] = useState('');
    const isLarge = screens.xxl === true;
    // Watchers reactivos
    const replicarValue = Form.useWatch('replicar', form);
    const sucDestValue = Form.useWatch('sucDest', form);
    const docAGenerarValue = Form.useWatch('docAGenerar', form);
    const noImpuestoValue = Form.useWatch('noImpuesto', form);
    const noActualizaCostosValue = Form.useWatch('noActualizaCostos', form);
    const noAsientosValue = Form.useWatch('noAsientos', form);
    const activoValue = Form.useWatch('activo', form);
    // ===== Cargar catálogos al montar =====
    useEffect(() => {
        setActiveModule('MConcepto');
        const pageTitle = mode === 'crear' ? 'Nuevo Concepto' : '';
        setPageTitleOverride(pageTitle);
        conceptosApi.obtenerAlmacenes(sucursalActiva).then(setAlmacenes).catch((err) => console.warn('Error al cargar almacenes cache', err));
        conceptosApi.obtenerSucursales(sucursalActiva).then(setSucursales).catch((err) => console.warn('Error al cargar sucursales cache', err));
        documentosApi.obtenerListado(sucursalActiva).then(setDocumentos).catch((err) => console.warn('Error al cargar documentos cache', err));
        tipoApi.obtenerTodo(sucursalActiva).then((tipos) => {
            const map = {};
            const docMap = {};
            tipos.forEach((t) => {
                map[t.codigo] = t.nombre;
                if (t.documento)
                    docMap[`${t.documento}-${t.codigo}`] = t.nombre;
            });
            setTiposMap(map);
            setTiposDocMap(docMap);
            setTiposList(tipos);
        }).catch((err) => console.warn('Error al cargar tipos cache', err));
        return () => {
            resetToolbar();
            setPageTitleOverride('');
        };
    }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, sucursalActiva]);
    // ===== Cargar datos si es modo editar =====
    useEffect(() => {
        if (mode === 'crear')
            return;
        if (!codigo || codigo === 'nuevo')
            return;
        setLoading(true);
        conceptosApi.obtenerConcepto(sucursalActiva, codigo)
            .then((res) => {
            setData(res);
            setPageTitleOverride(`Editar - ${res.codigo}`);
            setEntidades(res.entidades || []);
            const docsRaw = res.documentos || [];
            const docsGrouped = [];
            docsRaw.forEach((d) => {
                const existing = docsGrouped.find(x => x.codigo === d.codigo);
                if (existing) {
                    const tiposArr = Array.isArray(existing.tipo) ? existing.tipo : (existing.tipo ? [existing.tipo] : []);
                    if (d.tipo && !tiposArr.includes(d.tipo)) {
                        tiposArr.push(d.tipo);
                    }
                    existing.tipo = tiposArr;
                }
                else {
                    docsGrouped.push({ ...d, tipo: d.tipo ? [d.tipo] : [] });
                }
            });
            setDocumentosForm(docsGrouped);
            // Poblar display texts
            const docGenEncontrado = documentos.find(d => d.codigo === res.docAGenerar);
            setDocAGenerarText(docGenEncontrado
                ? `${docGenEncontrado.codigo} - ${toTitleCase(docGenEncontrado.nombre || '')}`
                : (res.docAGenerar || ''));
            if (res.sucursalDestino?.codigo && res.conceptoDestino) {
                const encontrada = res.sucursalDestino;
                const sucDestSucursal = encontrada?.sucursal ?? encontrada?.id ?? sucursalActiva;
                conceptosApi.obtenerConcepto(sucDestSucursal, res.conceptoDestino)
                    .then(cd => {
                    setConceptoDestinoText(`${cd.codigo}-${toTitleCase(cd.nombre || '')}`);
                })
                    .catch(() => {
                    setConceptoDestinoText(res.conceptoDestino || '');
                });
            }
            if (res.sucursalReplica?.codigo && res.conceptoReplica) {
                const encontrada = res.sucursalReplica;
                const sucReplicaSucursal = encontrada?.sucursal ?? encontrada?.id ?? sucursalActiva;
                conceptosApi.obtenerConcepto(sucReplicaSucursal, res.conceptoReplica)
                    .then(cr => {
                    setConceptoReplicaText(`${cr.codigo}-${toTitleCase(cr.nombre || '')}`);
                })
                    .catch(() => {
                    setConceptoReplicaText(res.conceptoReplica || '');
                });
            }
            // Poblar formulario
            if (res.cuentaContable) {
                setCuentaContableText(`${res.cuentaContable.noCuenta} - ${res.cuentaContable.nombre}`);
            }
            form.setFieldsValue({
                codigo: res.codigo,
                nombre: res.nombre,
                activo: res.activo ?? true,
                docAGenerar: res.docAGenerar,
                noImpuesto: res.noImpuesto ?? false,
                noAsientos: res.noAsientos ?? false,
                noActualizaCostos: res.noActualizaCostos ?? false,
                replicar: res.replicar ?? false,
                sucursalReplica: res.sucursalReplica?.codigo,
                tipoIngreso: res.tipoIngreso,
                codAlm: res.almacen?.codigo,
                sucDest: res.sucursalDestino?.codigo,
                conceptoDestino: res.conceptoDestino,
                conceptoReplica: res.conceptoReplica,
                cuentaContable: res.cuentaContable?.noCuenta,
            });
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al cargar el concepto');
            message.error(msg);
            setLoadingError(true);
            navigationConfirmedRef.current = true;
            navigate('/MConcepto', { replace: true });
        })
            .finally(() => setLoading(false));
    }, [mode, codigo, sucursalActiva, form, navigate, documentos, setPageTitleOverride, navigationConfirmedRef]);
    // ===== Cargar tipos de entidad al abrir el modal =====
    useEffect(() => {
        if (!entidadBuscarModalOpen)
            return;
        setEntidadBuscarText('');
        entidadApi.buscarTipos(sucursalActiva, '')
            .then(setEntidadResultados)
            .catch((err) => console.warn('Error al cargar tipos de entidad', err));
    }, [entidadBuscarModalOpen, sucursalActiva]);
    // ===== Handlers =====
    const handleGuardar = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            // Custom validaciones de negocio
            const docAGenerarVal = values.docAGenerar;
            const sucDestVal = values.sucDest;
            const replicarVal = values.replicar;
            const sucursalReplicaVal = values.sucursalReplica;
            const conceptoReplicaVal = values.conceptoReplica;
            const conceptoDestinoVal = values.conceptoDestino;
            if (docAGenerarVal) {
                if (!sucDestVal) {
                    message.error('Debe seleccionar una Sucursal Destino cuando hay un Documento a Generar');
                    setSaving(false);
                    return;
                }
                // Si sucDest es distinta a la sucursal actual, conceptoDestino es requerido
                const encontrada = sucursales.find(s => s.codigo === sucDestVal);
                const sucDestNum = encontrada?.sucursal ?? encontrada?.id ?? -1;
                if (sucDestNum !== sucursalActiva && !conceptoDestinoVal) {
                    message.error('Debe seleccionar un Concepto Destino cuando la Sucursal Destino es diferente');
                    setSaving(false);
                    return;
                }
            }
            if (replicarVal) {
                if (!sucursalReplicaVal) {
                    message.error('Debe seleccionar una Sucursal Réplica');
                    setSaving(false);
                    return;
                }
                if (!conceptoReplicaVal) {
                    message.error('Debe seleccionar un Concepto Réplica');
                    setSaving(false);
                    return;
                }
            }
            const dto = {
                codigo: values.codigo,
                nombre: values.nombre,
                activo: values.activo,
                docAGenerar: values.docAGenerar,
                noImpuesto: values.noImpuesto,
                noAsientos: values.noAsientos,
                noActualizaCostos: values.noActualizaCostos,
                replicar: values.replicar,
                sucursalReplica: values.sucursalReplica
                    ? sucursales.find(s => s.codigo === values.sucursalReplica)
                    : undefined,
                tipoIngreso: values.tipoIngreso,
                noCuenta: values.cuentaContable,
                almacen: values.codAlm
                    ? almacenes.find(a => a.codigo === values.codAlm)
                    : undefined,
                sucursalDestino: values.sucDest
                    ? sucursales.find(s => s.codigo === values.sucDest)
                    : undefined,
                conceptoDestino: values.conceptoDestino,
                conceptoReplica: values.conceptoReplica,
                entidades: entidades,
                documentos: documentosForm.flatMap(d => {
                    const tipos = Array.isArray(d.tipo) && d.tipo.length > 0 ? d.tipo : [''];
                    return tipos.map(t => ({ codigo: d.codigo, nombre: d.nombre, tipo: t }));
                }),
            };
            if (mode === 'crear') {
                const result = await conceptosApi.crearConcepto(sucursalActiva, dto);
                message.success('Concepto creado exitosamente');
                navigationConfirmedRef.current = true;
                navigate(`/MConcepto/${result.codigo}`, { replace: true });
            }
            else {
                await conceptosApi.actualizarConcepto(sucursalActiva, codigo, dto);
                message.success('Concepto actualizado exitosamente');
                navigationConfirmedRef.current = true;
                navigate(`/MConcepto/${codigo}`, { replace: true });
            }
        }
        catch (err) {
            if (err?.errorFields)
                return; // error de validación del form
            const msg = extraerMensajeError(err, 'Error al guardar el concepto');
            message.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    const handleCancelar = () => {
        if (form.isFieldsTouched()) {
            Modal.confirm({
                title: 'Cancelar',
                icon: _jsx(ExclamationCircleOutlined, {}),
                content: '¿Está seguro que desea descartar los cambios realizados?',
                okText: 'Sí, descartar',
                cancelText: 'No, continuar editando',
                okButtonProps: { danger: true },
                onOk: () => {
                    navigationConfirmedRef.current = true;
                    if (mode === 'editar' && codigo) {
                        navigate(`/MConcepto/${codigo}`, { replace: true });
                    }
                    else {
                        navigate('/MConcepto', { replace: true });
                    }
                },
            });
        }
        else {
            navigationConfirmedRef.current = true;
            if (mode === 'editar' && codigo) {
                navigate(`/MConcepto/${codigo}`, { replace: true });
            }
            else {
                navigate('/MConcepto', { replace: true });
            }
        }
    };
    const handleLimpiarDocAGenerar = () => {
        setDocAGenerarText('');
        form.setFieldsValue({ docAGenerar: undefined });
        // Limpiar dependientes
        handleSucDestChange(undefined);
        setConceptoDestinoText('');
        form.setFieldsValue({ conceptoDestino: undefined });
    };
    const handleDocumentoSelect = (doc) => {
        setDocAGenerarText(`${doc.codigo} - ${toTitleCase(doc.nombre || '')}`);
        form.setFieldsValue({ docAGenerar: doc.codigo });
    };
    const handleCuentaContableSelect = (cta) => {
        setCuentaContableText(`${cta.noCuenta} - ${cta.nombre}`);
        form.setFieldsValue({ cuentaContable: cta.noCuenta });
        setCuentaModalOpen(false);
    };
    const handleCuentaContableClear = () => {
        setCuentaContableText('');
        form.setFieldsValue({ cuentaContable: undefined });
    };
    const handleConceptoDestinoSelect = (concepto) => {
        setConceptoDestinoText(`${concepto.codigo}-${toTitleCase(concepto.nombre)}`);
        form.setFieldsValue({ conceptoDestino: concepto.codigo });
    };
    const handleBuscarConceptoDestino = () => {
        if (!sucDestValue) {
            message.warning('Primero seleccione una Sucursal Destino');
            return;
        }
        const docAGenerar = form.getFieldValue('docAGenerar');
        if (!docAGenerar) {
            message.warning('Primero seleccione un Documento a Generar');
            return;
        }
        setConceptoDestinoModalOpen(true);
    };
    const handleConceptoReplicaSelect = (concepto) => {
        setConceptoReplicaText(`${concepto.codigo}-${toTitleCase(concepto.nombre)}`);
        form.setFieldsValue({ conceptoReplica: concepto.codigo });
    };
    const handleBuscarConceptoReplica = () => {
        const sucReplica = form.getFieldValue('sucursalReplica');
        if (!sucReplica) {
            message.warning('Primero seleccione una Sucursal Réplica');
            return;
        }
        setConceptoReplicaModalOpen(true);
    };
    const handleSucursalReplicaChange = (value) => {
        if (!value) {
            setConceptoReplicaText('');
            form.setFieldValue('conceptoReplica', undefined);
        }
    };
    // ===== Loading state =====
    if (loading) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando concepto..." })] }));
    }
    // ===== Error state =====
    if (loadingError) {
        return (_jsxs("div", { children: [_jsx(Alert, { message: "Error al cargar el formulario", type: "error", showIcon: true, style: { marginBottom: 16 } }), _jsx(Button, { onClick: () => navigate('/MConcepto', { replace: true }), children: "Volver al listado" })] }));
    }
    const handleReplicarChange = (checked) => {
        if (!checked) {
            form.setFieldValue('sucursalReplica', undefined);
            setConceptoReplicaText('');
            form.setFieldValue('conceptoReplica', undefined);
        }
    };
    const handleSucDestChange = (value) => {
        if (!value) {
            setConceptoDestinoText('');
            form.setFieldValue('conceptoDestino', undefined);
        }
    };
    // ===== Handlers para Entidades y Documentos =====
    const handleAgregarEntidad = (ent) => {
        if (entidades.find(e => e.codigo === ent.codigo)) {
            message.warning('El tipo de entidad ya está agregado');
            return;
        }
        setEntidades(prev => [...prev, { codigo: ent.codigo, nombre: ent.nombre, tipo: '' }]);
        setEntidadBuscarModalOpen(false);
        setEntidadBuscarText('');
        setEntidadResultados([]);
    };
    const handleQuitarEntidad = (codigo) => {
        setEntidades(prev => prev.filter(e => e.codigo !== codigo));
    };
    const handleEntidadTipoChange = (codigo, tipo) => {
        setEntidades(prev => prev.map(e => e.codigo === codigo ? { ...e, tipo } : e));
    };
    const handleAgregarDocumentoForm = (doc) => {
        // Permitir mismo documento con distintos tipos
        setDocumentosForm(prev => [...prev, { codigo: doc.codigo, nombre: doc.nombre || '', tipo: '' }]);
    };
    const handleQuitarDocumentoForm = (codigo) => {
        setDocumentosForm(prev => prev.filter(d => d.codigo !== codigo));
    };
    const handleDocumentoTipoChange = (codigo, tipo) => {
        setDocumentosForm(prev => prev.map(d => d.codigo === codigo ? { ...d, tipo } : d));
    };
    const handleBuscarEntidad = async (valor) => {
        const termino = (valor || '').trim();
        setEntidadBuscarText(termino);
        if (!termino) {
            // Recargar todos al limpiar
            try {
                const todos = await entidadApi.buscarTipos(sucursalActiva, '');
                setEntidadResultados(todos);
            }
            catch { /* ignore */ }
            return;
        }
        try {
            const resultados = await entidadApi.buscarTipos(sucursalActiva, termino);
            setEntidadResultados(resultados);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al buscar tipos de entidad');
        }
    };
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }, children: [_jsx("div", { style: { flex: 1 } }), _jsxs(Space, { wrap: true, children: [mode === 'editar' && data && (_jsx(Tag, { color: data.activo ? 'green' : 'default', children: data.activo ? 'Activo' : 'Inactivo' })), _jsx(PermissionGate, { accion: mode === 'editar' ? 'EDITAR' : 'CREAR', children: _jsx(Button, { type: "primary", icon: _jsx(SaveOutlined, {}), loading: saving, onClick: handleGuardar, children: "Guardar" }) }), _jsx(Button, { icon: _jsx(CloseOutlined, {}), onClick: handleCancelar, children: "Cancelar" })] })] }), isLarge ? (_jsx(_Fragment, { children: _jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [_jsx(Card, { className: "paces-card", size: "small", title: "Datos Generales", style: { marginBottom: 16 }, children: _jsx(Form, { form: form, layout: "vertical", size: "middle", style: { paddingTop: 24 }, children: _jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "codigo", label: "C\u00F3digo", children: _jsx(Input, { disabled: true, placeholder: "Auto-generado" }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "nombre", label: "Nombre", rules: [{ required: true, message: 'El nombre es requerido' }], children: _jsx(Input, { placeholder: "Nombre del concepto" }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 4, children: _jsx(Form.Item, { name: "activo", valuePropName: "checked", label: "Activo", initialValue: true, children: _jsx(Switch, { checkedChildren: "Activo", unCheckedChildren: "Inactivo" }) }) })] }) }) }), _jsx(Tabs, { type: "card", items: [
                                        {
                                            key: 'inventario',
                                            label: 'Inventario',
                                            children: (_jsx("div", { style: { paddingTop: 16 }, children: _jsxs(Form, { form: form, layout: "vertical", size: "middle", children: [_jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "noImpuesto", valuePropName: "checked", label: "Sin Impuesto", initialValue: false, children: _jsx(Switch, {}) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "noActualizaCostos", valuePropName: "checked", label: "No Actualiza Costos", initialValue: false, children: _jsx(Switch, {}) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "codAlm", label: "Almac\u00E9n", children: _jsx(Select, { allowClear: true, placeholder: "Seleccionar almac\u00E9n...", showSearch: true, optionFilterProp: "label", options: almacenes.map(a => ({ value: a.codigo, label: a.nombre })) }) }) })] }), _jsx(Card, { className: "paces-card", size: "small", title: "GENERAR DOCUMENTO", style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: [16, 24], children: [_jsxs(Col, { xs: 24, sm: 12, lg: 8, children: [_jsx(Form.Item, { name: "docAGenerar", hidden: true, children: _jsx(Input, {}) }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "Documento a generar" }), _jsxs("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 0 }, children: [_jsx("div", { style: { flex: 1 }, children: _jsx(Input, { placeholder: "Buscar documento...", value: docAGenerarText, readOnly: true, suffix: _jsx(SearchOutlined, {}), onClick: () => setDocModalOpen(true) }) }), docAGenerarText && (_jsx(Button, { icon: _jsx(CloseOutlined, {}), onClick: handleLimpiarDocAGenerar }))] }), _jsx(Text, { type: "secondary", style: { fontSize: 11, display: 'block', marginTop: 2 }, children: "Genera otro documento al aplicar" })] })] }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "sucDest", label: "Sucursal destino", extra: _jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "Obligatorio si hay documento a generar" }), children: _jsx(Select, { allowClear: true, placeholder: "Seleccionar sucursal...", showSearch: true, optionFilterProp: "label", disabled: !docAGenerarValue, options: sucursales.map(s => ({ value: s.codigo, label: toTitleCase(s.nombre) })), onChange: handleSucDestChange }) }) }), _jsxs(Col, { xs: 24, sm: 12, lg: 8, children: [_jsx(Form.Item, { name: "conceptoDestino", hidden: true, children: _jsx(Input, {}) }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "Concepto destino" }), _jsx("div", { children: _jsx(Input, { placeholder: "Buscar concepto destino...", value: conceptoDestinoText, readOnly: true, disabled: !sucDestValue, suffix: _jsx(SearchOutlined, {}), onClick: () => sucDestValue && handleBuscarConceptoDestino() }) }), _jsx(Text, { type: "secondary", style: { fontSize: 11, display: 'block', marginTop: 2 }, children: "Obligatorio si la sucursal destino es diferente" })] })] })] }) }), _jsx(Card, { className: "paces-card", size: "small", title: "REPLICAR A OTRA SUCURSAL", children: _jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "replicar", valuePropName: "checked", label: "Replicar", extra: _jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "Replica el mismo documento a otra sucursal" }), initialValue: false, children: _jsx(Switch, { onChange: handleReplicarChange }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "sucursalReplica", label: "Sucursal r\u00E9plica", extra: _jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "Obligatorio si Replicar est\u00E1 activo" }), rules: replicarValue ? [{ required: true, message: 'Debe seleccionar una sucursal réplica' }] : [], children: _jsx(Select, { allowClear: true, placeholder: "Seleccionar sucursal...", showSearch: true, optionFilterProp: "label", disabled: !replicarValue, options: sucursales.map(s => ({ value: s.codigo, label: toTitleCase(s.nombre) })), onChange: handleSucursalReplicaChange }) }) }), _jsxs(Col, { xs: 24, sm: 12, lg: 8, children: [_jsx(Form.Item, { name: "conceptoReplica", hidden: true, children: _jsx(Input, {}) }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "Concepto r\u00E9plica" }), _jsx("div", { children: _jsx(Input, { placeholder: "Buscar concepto r\u00E9plica...", value: conceptoReplicaText, readOnly: true, disabled: !replicarValue, suffix: _jsx(SearchOutlined, {}), onClick: () => replicarValue && handleBuscarConceptoReplica() }) }), _jsx(Text, { type: "secondary", style: { fontSize: 11, display: 'block', marginTop: 2 }, children: "Concepto que usar\u00E1 en la sucursal r\u00E9plica" })] })] })] }) })] }) })),
                                        },
                                        {
                                            key: 'contabilidad',
                                            label: 'Contabilidad',
                                            children: (_jsx("div", { style: { paddingTop: 16 }, children: _jsx(Form, { form: form, layout: "vertical", size: "middle", children: _jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "noAsientos", valuePropName: "checked", label: "No genera asientos", initialValue: false, children: _jsx(Switch, {}) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "tipoIngreso", label: "Tipo Ingreso", children: _jsx(Select, { allowClear: true, placeholder: "Seleccionar tipo...", options: TIPO_INGRESO_OPTIONS }) }) }), _jsxs(Col, { xs: 24, sm: 12, lg: 8, children: [_jsx(Form.Item, { name: "cuentaContable", hidden: true, children: _jsx(Input, {}) }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "Cuenta Contable" }), _jsxs("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 0 }, children: [_jsx("div", { style: { flex: 1 }, children: _jsx(Input, { placeholder: "Buscar cuenta contable...", value: cuentaContableText, readOnly: true, suffix: _jsx(SearchOutlined, {}), onClick: () => setCuentaModalOpen(true) }) }), cuentaContableText && (_jsx(Button, { icon: _jsx(CloseOutlined, {}), onClick: handleCuentaContableClear }))] })] })] })] }) }) })),
                                        },
                                        {
                                            key: 'entidad',
                                            label: 'Entidad',
                                            children: (_jsxs("div", { style: { paddingTop: 16 }, children: [_jsx(Button, { type: "dashed", icon: _jsx(SearchOutlined, {}), onClick: () => setEntidadBuscarModalOpen(true), style: { marginBottom: 16 }, children: "Agregar Entidad" }), entidades.length > 0 ? (_jsx(Table, { dataSource: entidades, rowKey: "codigo", size: "small", pagination: { pageSize: 10, showSizeChanger: false }, columns: [
                                                            { title: 'Código', dataIndex: 'codigo', width: 120 },
                                                            { title: 'Nombre', dataIndex: 'nombre', render: (v) => toTitleCase(v) },
                                                            {
                                                                title: 'Tipo',
                                                                dataIndex: 'tipo',
                                                                width: 200,
                                                                render: (v, _, idx) => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 4 }, children: [_jsx(Input, { size: "small", value: v, onChange: (e) => {
                                                                                const newEntidades = [...entidades];
                                                                                newEntidades[idx] = { ...newEntidades[idx], tipo: e.target.value };
                                                                                setEntidades(newEntidades);
                                                                            }, placeholder: "Tipo", style: { width: 60 } }), v && tiposMap[v] && (_jsxs(Tag, { style: { margin: 0 }, children: [v, " - ", toTitleCase(tiposMap[v])] }))] })),
                                                            },
                                                            {
                                                                title: 'Acción',
                                                                width: 80,
                                                                render: (_, record) => (_jsx(Button, { size: "small", danger: true, icon: _jsx(CloseOutlined, {}), onClick: () => handleQuitarEntidad(record.codigo) })),
                                                            },
                                                        ] })) : (_jsx(Text, { type: "secondary", children: "No hay entidades agregadas" }))] })),
                                        },
                                        {
                                            key: 'documentos',
                                            label: 'Documentos',
                                            children: (_jsxs("div", { style: { paddingTop: 16 }, children: [_jsx(Button, { type: "dashed", icon: _jsx(SearchOutlined, {}), onClick: () => setAgregarDocModalOpen(true), style: { marginBottom: 16 }, children: "Agregar Documento" }), documentosForm.length > 0 ? (_jsx(Table, { dataSource: documentosForm, rowKey: "codigo", size: "small", pagination: false, columns: [
                                                            { title: 'Código', dataIndex: 'codigo', width: 120 },
                                                            { title: 'Nombre', dataIndex: 'nombre', render: (v) => toTitleCase(v) },
                                                            {
                                                                title: 'Tipos',
                                                                dataIndex: 'tipo',
                                                                width: 300,
                                                                render: (v, record, idx) => {
                                                                    const tiposFiltrados = tiposList.filter(t => t.documento === record?.codigo);
                                                                    const tiposParaSelect = tiposFiltrados.length > 0 ? tiposFiltrados : tiposList;
                                                                    const valor = v ? (Array.isArray(v) ? v : [v]) : [];
                                                                    return (_jsx("div", { style: { display: 'flex', alignItems: 'center', gap: 4 }, children: _jsx(Select, { size: "small", mode: "multiple", value: valor, onChange: (val) => {
                                                                                const newDocs = [...documentosForm];
                                                                                newDocs[idx] = { ...newDocs[idx], tipo: val };
                                                                                setDocumentosForm(newDocs);
                                                                            }, placeholder: "Seleccionar tipos...", style: { width: 250 }, showSearch: true, optionFilterProp: "label", allowClear: true, options: tiposParaSelect.map(t => ({ value: t.codigo, label: `${t.codigo} - ${t.nombre}` })) }) }));
                                                                },
                                                            },
                                                            {
                                                                title: 'Acción',
                                                                width: 80,
                                                                render: (_, record) => (_jsx(Button, { size: "small", danger: true, icon: _jsx(CloseOutlined, {}), onClick: () => handleQuitarDocumentoForm(record.codigo) })),
                                                            },
                                                        ] })) : (_jsx(Text, { type: "secondary", children: "No hay entidades agregadas" }))] })),
                                        },
                                    ] })] }), _jsx(Col, { xxl: 6, children: _jsx(Card, { className: "paces-card", size: "small", title: _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Opciones" }), children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Activo" }), _jsx("br", {}), _jsx(Tag, { color: activoValue !== false ? 'green' : 'default', children: activoValue !== false ? 'Activo' : 'Inactivo' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Sin Impuesto" }), _jsx("br", {}), _jsx(Tag, { color: noImpuestoValue ? 'orange' : 'default', children: noImpuestoValue ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "No Actualiza Costos" }), _jsx("br", {}), _jsx(Tag, { color: noActualizaCostosValue ? 'orange' : 'default', children: noActualizaCostosValue ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "No genera asientos" }), _jsx("br", {}), _jsx(Tag, { color: noAsientosValue ? 'orange' : 'default', children: noAsientosValue ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Replicar" }), _jsx("br", {}), _jsx(Tag, { color: replicarValue ? 'blue' : 'default', children: replicarValue ? 'Sí' : 'No' })] })] }) }) })] }) })) : (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", size: "small", title: "Datos Generales", style: { marginBottom: 16 }, children: _jsx(Form, { form: form, layout: "vertical", size: "middle", style: { paddingTop: 24 }, children: _jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "codigo", label: "C\u00F3digo", children: _jsx(Input, { disabled: true, placeholder: "Auto-generado" }) }) }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "nombre", label: "Nombre", rules: [{ required: true, message: 'El nombre es requerido' }], children: _jsx(Input, { placeholder: "Nombre del concepto" }) }) }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "activo", valuePropName: "checked", label: "Activo", initialValue: true, children: _jsx(Switch, { checkedChildren: "Activo", unCheckedChildren: "Inactivo" }) }) })] }) }) }), _jsx(Tabs, { type: "card", items: [
                            {
                                key: 'inventario',
                                label: 'Inventario',
                                children: (_jsx("div", { style: { paddingTop: 16 }, children: _jsxs(Form, { form: form, layout: "vertical", size: "middle", children: [_jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "noImpuesto", valuePropName: "checked", label: "Sin Impuesto", initialValue: false, children: _jsx(Switch, {}) }) }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "noActualizaCostos", valuePropName: "checked", label: "No Actualiza Costos", initialValue: false, children: _jsx(Switch, {}) }) }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "codAlm", label: "Almac\u00E9n", children: _jsx(Select, { allowClear: true, placeholder: "Seleccionar almac\u00E9n...", showSearch: true, optionFilterProp: "label", options: almacenes.map(a => ({ value: a.codigo, label: a.nombre })) }) }) })] }), _jsx(Card, { className: "paces-card", size: "small", title: "GENERAR DOCUMENTO", style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: [16, 24], children: [_jsxs(Col, { xs: 24, children: [_jsx(Form.Item, { name: "docAGenerar", hidden: true, children: _jsx(Input, {}) }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "Documento a generar" }), _jsxs("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 0 }, children: [_jsx("div", { style: { flex: 1 }, children: _jsx(Input, { placeholder: "Buscar documento...", value: docAGenerarText, readOnly: true, suffix: _jsx(SearchOutlined, {}), onClick: () => setDocModalOpen(true) }) }), docAGenerarText && (_jsx(Button, { icon: _jsx(CloseOutlined, {}), onClick: handleLimpiarDocAGenerar }))] }), _jsx(Text, { type: "secondary", style: { fontSize: 11, display: 'block', marginTop: 2 }, children: "Genera otro documento al aplicar" })] })] }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "sucDest", label: "Sucursal destino", extra: _jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "Obligatorio si hay documento a generar" }), children: _jsx(Select, { allowClear: true, placeholder: "Seleccionar sucursal...", showSearch: true, optionFilterProp: "label", disabled: !docAGenerarValue, options: sucursales.map(s => ({ value: s.codigo, label: toTitleCase(s.nombre) })), onChange: handleSucDestChange }) }) }), _jsxs(Col, { xs: 24, children: [_jsx(Form.Item, { name: "conceptoDestino", hidden: true, children: _jsx(Input, {}) }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "Concepto destino" }), _jsx("div", { children: _jsx(Input, { placeholder: "Buscar concepto destino...", value: conceptoDestinoText, readOnly: true, disabled: !sucDestValue, suffix: _jsx(SearchOutlined, {}), onClick: () => sucDestValue && handleBuscarConceptoDestino() }) }), _jsx(Text, { type: "secondary", style: { fontSize: 11, display: 'block', marginTop: 2 }, children: "Obligatorio si la sucursal destino es diferente" })] })] })] }) }), _jsx(Card, { className: "paces-card", size: "small", title: "REPLICAR A OTRA SUCURSAL", children: _jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "replicar", valuePropName: "checked", label: "Replicar", extra: _jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "Replica el mismo documento a otra sucursal" }), initialValue: false, children: _jsx(Switch, { onChange: handleReplicarChange }) }) }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "sucursalReplica", label: "Sucursal r\u00E9plica", extra: _jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "Obligatorio si Replicar est\u00E1 activo" }), rules: replicarValue ? [{ required: true, message: 'Debe seleccionar una sucursal réplica' }] : [], children: _jsx(Select, { allowClear: true, placeholder: "Seleccionar sucursal...", showSearch: true, optionFilterProp: "label", disabled: !replicarValue, options: sucursales.map(s => ({ value: s.codigo, label: toTitleCase(s.nombre) })), onChange: handleSucursalReplicaChange }) }) }), _jsxs(Col, { xs: 24, children: [_jsx(Form.Item, { name: "conceptoReplica", hidden: true, children: _jsx(Input, {}) }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "Concepto r\u00E9plica" }), _jsx("div", { children: _jsx(Input, { placeholder: "Buscar concepto r\u00E9plica...", value: conceptoReplicaText, readOnly: true, disabled: !replicarValue, suffix: _jsx(SearchOutlined, {}), onClick: () => replicarValue && handleBuscarConceptoReplica() }) }), _jsx(Text, { type: "secondary", style: { fontSize: 11, display: 'block', marginTop: 2 }, children: "Concepto que usar\u00E1 en la sucursal r\u00E9plica" })] })] })] }) })] }) })),
                            },
                            {
                                key: 'contabilidad',
                                label: 'Contabilidad',
                                children: (_jsx("div", { style: { paddingTop: 16 }, children: _jsx(Form, { form: form, layout: "vertical", size: "middle", children: _jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "noAsientos", valuePropName: "checked", label: "No genera asientos", initialValue: false, children: _jsx(Switch, {}) }) }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "tipoIngreso", label: "Tipo Ingreso", children: _jsx(Select, { allowClear: true, placeholder: "Seleccionar tipo...", options: TIPO_INGRESO_OPTIONS }) }) }), _jsxs(Col, { xs: 24, children: [_jsx(Form.Item, { name: "cuentaContable", hidden: true, children: _jsx(Input, {}) }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "Cuenta Contable" }), _jsxs("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 0 }, children: [_jsx("div", { style: { flex: 1 }, children: _jsx(Input, { placeholder: "Buscar cuenta contable...", value: cuentaContableText, readOnly: true, suffix: _jsx(SearchOutlined, {}), onClick: () => setCuentaModalOpen(true) }) }), cuentaContableText && (_jsx(Button, { icon: _jsx(CloseOutlined, {}), onClick: handleCuentaContableClear }))] })] })] })] }) }) })),
                            },
                            {
                                key: 'entidad',
                                label: 'Entidad',
                                children: (_jsxs("div", { style: { paddingTop: 16 }, children: [_jsx(Button, { type: "dashed", icon: _jsx(SearchOutlined, {}), onClick: () => setEntidadBuscarModalOpen(true), style: { marginBottom: 16 }, children: "Agregar Tipo de Entidad" }), entidades.length > 0 ? (_jsx(Table, { dataSource: entidades, rowKey: "codigo", size: "small", pagination: false, columns: [
                                                { title: 'Código', dataIndex: 'codigo', width: 120 },
                                                { title: 'Nombre', dataIndex: 'nombre', render: (v) => toTitleCase(v) },
                                                {
                                                    title: 'Tipo',
                                                    dataIndex: 'tipo',
                                                    render: (v, _, idx) => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }, children: [_jsx(Input, { size: "small", value: v, onChange: (e) => {
                                                                    const newEntidades = [...entidades];
                                                                    newEntidades[idx] = { ...newEntidades[idx], tipo: e.target.value };
                                                                    setEntidades(newEntidades);
                                                                }, placeholder: "Tipo", style: { width: 60 } }), v && tiposMap[v] && (_jsxs(Tag, { style: { margin: 0 }, children: [v, " - ", toTitleCase(tiposMap[v])] }))] })),
                                                },
                                                {
                                                    title: 'Acción',
                                                    width: 80,
                                                    render: (_, record) => (_jsx(Button, { size: "small", danger: true, icon: _jsx(CloseOutlined, {}), onClick: () => handleQuitarEntidad(record.codigo) })),
                                                },
                                            ] })) : (_jsx(Text, { type: "secondary", children: "No hay tipos de entidad agregados" }))] })),
                            },
                            {
                                key: 'documentos',
                                label: 'Documentos',
                                children: (_jsxs("div", { style: { paddingTop: 16 }, children: [_jsx(Button, { type: "dashed", icon: _jsx(SearchOutlined, {}), onClick: () => setAgregarDocModalOpen(true), style: { marginBottom: 16 }, children: "Agregar Documento" }), documentosForm.length > 0 ? (_jsx(Table, { dataSource: documentosForm, rowKey: "codigo", size: "small", pagination: false, columns: [
                                                { title: 'Código', dataIndex: 'codigo', width: 120 },
                                                { title: 'Nombre', dataIndex: 'nombre', render: (v) => toTitleCase(v) },
                                                {
                                                    title: 'Tipo',
                                                    dataIndex: 'tipo',
                                                    render: (v, record, idx) => {
                                                        const docKey = record?.codigo ? `${record.codigo}-${v}` : v;
                                                        const docNombre = tiposDocMap[docKey] || tiposMap[v];
                                                        return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }, children: [_jsx(Input, { size: "small", value: v, onChange: (e) => {
                                                                        const newDocs = [...documentosForm];
                                                                        newDocs[idx] = { ...newDocs[idx], tipo: e.target.value };
                                                                        setDocumentosForm(newDocs);
                                                                    }, placeholder: "Tipo", style: { width: 60 } }), v && docNombre && (_jsxs(Tag, { color: "geekblue", style: { margin: 0 }, children: [v, " - ", toTitleCase(docNombre)] }))] }));
                                                    },
                                                },
                                                {
                                                    title: 'Acción',
                                                    width: 80,
                                                    render: (_, record) => (_jsx(Button, { size: "small", danger: true, icon: _jsx(CloseOutlined, {}), onClick: () => handleQuitarEntidad(record.codigo) })),
                                                },
                                            ] })) : (_jsx(Text, { type: "secondary", children: "No hay documentos agregados" }))] })),
                            },
                        ] }), _jsx("div", { style: { marginTop: 24 }, children: _jsx(Card, { className: "paces-card", size: "small", title: _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Opciones" }), children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Activo" }), _jsx("br", {}), _jsx(Tag, { color: activoValue !== false ? 'green' : 'default', children: activoValue !== false ? 'Activo' : 'Inactivo' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Sin Impuesto" }), _jsx("br", {}), _jsx(Tag, { color: noImpuestoValue ? 'orange' : 'default', children: noImpuestoValue ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "No Actualiza Costos" }), _jsx("br", {}), _jsx(Tag, { color: noActualizaCostosValue ? 'orange' : 'default', children: noActualizaCostosValue ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "No genera asientos" }), _jsx("br", {}), _jsx(Tag, { color: noAsientosValue ? 'orange' : 'default', children: noAsientosValue ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Replicar" }), _jsx("br", {}), _jsx(Tag, { color: replicarValue ? 'blue' : 'default', children: replicarValue ? 'Sí' : 'No' })] })] }) }) })] })), _jsx(BuscarCuentaInlineModal, { open: cuentaModalOpen, onClose: () => setCuentaModalOpen(false), onSelect: handleCuentaContableSelect, buscarCuentas: (filtro) => cuentaContableApi.obtenerListadoPaginado(sucursalActiva, 50, 0, filtro).then(r => r.data) }), _jsx(BuscarDocumentoInlineModal, { open: docModalOpen, onClose: () => setDocModalOpen(false), onSelect: handleDocumentoSelect, documentos: documentos }), _jsx(BuscarDocumentoInlineModal, { open: agregarDocModalOpen, onClose: () => setAgregarDocModalOpen(false), onSelect: handleAgregarDocumentoForm, documentos: documentos }), _jsxs(Modal, { title: "Buscar Tipo de Entidad", open: entidadBuscarModalOpen, onCancel: () => { setEntidadBuscarModalOpen(false); setEntidadBuscarText(''); setEntidadResultados([]); }, footer: null, width: 600, destroyOnClose: true, children: [_jsx(Input.Search, { placeholder: "Buscar tipo de entidad (CLI, SUP, EMP)...", allowClear: true, onSearch: handleBuscarEntidad, style: { marginBottom: 16 } }), entidadResultados.length > 0 ? (_jsx(Table, { dataSource: entidadResultados, rowKey: "codigo", size: "small", pagination: { pageSize: 10, showSizeChanger: false }, columns: [
                            { title: 'Código', dataIndex: 'codigo', width: 100 },
                            { title: 'Descripción', dataIndex: 'nombre', ellipsis: true, render: (v) => toTitleCase(v) },
                        ], onRow: (record) => ({
                            onClick: () => handleAgregarEntidad(record),
                            style: { cursor: 'pointer' },
                        }), locale: { emptyText: _jsx(Empty, { description: "No hay resultados" }) } })) : (entidadBuscarText && _jsx(Empty, { description: "No se encontraron tipos de entidad" }))] }), _jsx(BuscarConceptoModal, { open: conceptoDestinoModalOpen, onClose: () => setConceptoDestinoModalOpen(false), onSelect: handleConceptoDestinoSelect, title: "Buscar Concepto Destino", fetchConceptos: () => {
                    const encontrada = sucDestValue ? sucursales.find(s => s.codigo === sucDestValue) : undefined;
                    const sucDestSucursal = encontrada?.sucursal ?? encontrada?.id ?? sucursalActiva;
                    return conceptosApi.obtenerConceptos(sucDestSucursal);
                } }), _jsx(BuscarConceptoModal, { open: conceptoReplicaModalOpen, onClose: () => setConceptoReplicaModalOpen(false), onSelect: handleConceptoReplicaSelect, title: "Buscar Concepto R\u00E9plica", fetchConceptos: () => {
                    const sucReplicaCod = form.getFieldValue('sucursalReplica');
                    const encontrada = sucReplicaCod ? sucursales.find(s => s.codigo === sucReplicaCod) : undefined;
                    const sucReplicaSucursal = encontrada?.sucursal ?? encontrada?.id ?? sucursalActiva;
                    return conceptosApi.obtenerConceptos(sucReplicaSucursal);
                } })] }));
};
export default ConceptoFormulario;
