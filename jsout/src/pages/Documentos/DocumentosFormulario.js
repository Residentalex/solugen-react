import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout, Menu, Grid, Card, Switch, Button, Modal, Space, Typography, Drawer, Input, Select, InputNumber, message, Row, Col, } from 'antd';
import { DashboardOutlined, ProjectOutlined, RobotOutlined, MessageOutlined, SettingOutlined, MenuOutlined, CloseOutlined, ExclamationCircleOutlined, } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { documentosApi } from '../../api/documentosApi';
import FormularioToolbar from '../../components/FormularioToolbar';
import DetalleToolbar from '../../components/DetalleToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { extraerMensajeError } from '../../utils/formats';
const { Content, Sider } = Layout;
const { Text, Title } = Typography;
// ============================================================
// Sidebar menu items
// ============================================================
const menuItems = [
    { key: 'dashboard', icon: _jsx(DashboardOutlined, {}), label: 'Dashboard' },
    { key: 'projects', icon: _jsx(ProjectOutlined, {}), label: 'Projects' },
    { key: 'ai-assistant', icon: _jsx(RobotOutlined, {}), label: 'AI Assistant' },
    { key: 'chat-history', icon: _jsx(MessageOutlined, {}), label: 'Chat History' },
    { key: 'settings', icon: _jsx(SettingOutlined, {}), label: 'Settings' },
];
// ============================================================
// Sub-component: HoverableCard with subtle lift animation
// ============================================================
const HoverableCard = ({ children, style, noPadding }) => {
    const [hovered, setHovered] = useState(false);
    return (_jsx(Card, { style: {
            borderRadius: 10,
            border: '1px solid #E8EAF0',
            boxShadow: hovered
                ? '0 8px 25px rgba(0,0,0,0.07)'
                : '0 4px 16px rgba(0,0,0,0.04)',
            transition: 'box-shadow 0.2s ease, transform 0.2s ease',
            transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
            ...style,
        }, styles: noPadding ? { body: { padding: 0 } } : undefined, onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false), children: children }));
};
// ============================================================
// Main component
// ============================================================
const DocumentosFormulario = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [guardado, setGuardado] = useState(false);
    const [idGuardado, setIdGuardado] = useState(null);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const mode = id ? 'editar' : 'crear';
    // ----- Form state -----
    const [codigo, setCodigo] = useState('');
    const [nombre, setNombre] = useState('');
    const [tipo, setTipo] = useState(undefined);
    const [longitudCodigo, setLongitudCodigo] = useState(8);
    // ----- Advanced fields -----
    const [origenCuenta, setOrigenCuenta] = useState(0);
    const [tipoImpuesto, setTipoImpuesto] = useState(0);
    const [puedeReimprimir, setPuedeReimprimir] = useState(false);
    const [recibePagos, setRecibePagos] = useState(false);
    const [metodoPosteo, setMetodoPosteo] = useState(0);
    const [fechaPermitida, setFechaPermitida] = useState(0);
    const [excluirEstadoContable, setExcluirEstadoContable] = useState(false);
    const [documentoReverso, setDocumentoReverso] = useState('');
    const [idExterno, setIdExterno] = useState('');
    // ----- Configuration switches -----
    const [estadoCuenta, setEstadoCuenta] = useState(true);
    const [preciosConImpuestos, setPreciosConImpuestos] = useState(false);
    const [afectaInventario, setAfectaInventario] = useState(true);
    const [requiereAsiento, setRequiereAsiento] = useState(true);
    const [modPrecio, setModPrecio] = useState(false);
    const [modDescripcion, setModDescripcion] = useState(true);
    const [trabajarEnUnidad, setTrabajarEnUnidad] = useState(false);
    // ----- Numeración -----
    const [tipoNumeracion, setTipoNumeracion] = useState(0);
    const [metodoAplicar, setMetodoAplicar] = useState(0);
    /** Convierte un valor enum del backend (string o number) a número */
    const toEnum = (value, mapping, defaultVal) => {
        if (value === null || value === undefined)
            return defaultVal;
        if (typeof value === 'number')
            return value;
        const parsed = Number(value);
        if (!isNaN(parsed))
            return parsed;
        return mapping[String(value)] ?? defaultVal;
    };
    // ----- Cargar datos en modo edición -----
    useEffect(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        if (sucursalActiva === undefined)
            return;
        setLoading(true);
        documentosApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((doc) => {
            if (!doc) {
                message.error('No se encontró el documento');
                return;
            }
            setCodigo(doc.codigo || '');
            setNombre(doc.nombre || '');
            setTipo(doc.tipo || undefined);
            setLongitudCodigo(doc.longitudCodigo ?? 8);
            setEstadoCuenta(doc.incluirEstadoCuenta ?? true);
            setPreciosConImpuestos(doc.preciosIncluyenImpuestos ?? false);
            setAfectaInventario(doc.afectaInventario ?? true);
            setRequiereAsiento(doc.requiereAsiento ?? true);
            setModPrecio(doc.modificaPrecio ?? false);
            setModDescripcion(doc.modificaDescripcion ?? true);
            setTrabajarEnUnidad(doc.trabajarEnUnidad ?? false);
            setOrigenCuenta(toEnum(doc.origenCuenta, { Debito: 0, Credito: 1, Desconocido: 2 }, 0));
            setTipoImpuesto(toEnum(doc.tipoImpuesto, { Venta: 0, Compra: 1, Ninguno: 2 }, 0));
            setPuedeReimprimir(doc.puedeReimprimir ?? false);
            setRecibePagos(doc.recibePagos ?? false);
            setMetodoPosteo(toEnum(doc.metodoPosteo, { Manualmente: 0, Guardar: 1, Imprimir: 2, Aplicar: 3 }, 0));
            setFechaPermitida(toEnum(doc.fechaPermitida, { None: 0, Todas: 1, MayorCierre: 2, MayorDocAplicado: 3, FechaDia: 4, MenorIgualFechaDia: 5 }, 0));
            setExcluirEstadoContable(doc.excluirEstadoContable ?? false);
            setDocumentoReverso(doc.documentoReverso ?? '');
            setIdExterno(doc.idExterno ?? '');
            setTipoNumeracion(toEnum(doc.tipoNumeracion, { Manual: 0, Automatica: 1 }, 0));
            setMetodoAplicar(toEnum(doc.metodoAplicar, { Manualmente: 0, Guardar: 1, Imprimir: 2 }, 0));
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
            message.error(msg);
        })
            .finally(() => setLoading(false));
    }, [mode, id, sucursalActiva]);
    // ----- Danger zone -----
    const handleDesactivarDocumento = () => {
        Modal.confirm({
            title: 'Desactivar tipo de documento',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: 'Esta acción desactivará el tipo de documento. Los documentos existentes no se verán afectados, pero no podrá crear nuevos documentos con este tipo. Esta acción puede revertirse posteriormente.',
            okText: 'Sí, desactivar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: () => {
                message.success('Tipo de documento desactivado correctamente');
            },
        });
    };
    // ----- Toolbar handlers -----
    const handleGuardar = async () => {
        if (!codigo.trim()) {
            message.error('El código es requerido');
            return;
        }
        if (!nombre.trim()) {
            message.error('El nombre es requerido');
            return;
        }
        if (sucursalActiva === undefined) {
            message.error('No hay sucursal activa');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                id: mode === 'editar' ? parseInt(id) : 0,
                codigo: codigo.trim(),
                nombre: nombre.trim(),
                tipo,
                longitudCodigo: longitudCodigo ?? undefined,
                incluirEstadoCuenta: estadoCuenta,
                preciosIncluyenImpuestos: preciosConImpuestos,
                afectaInventario,
                requiereAsiento,
                modificaPrecio: modPrecio,
                modificaDescripcion: modDescripcion,
                trabajarEnUnidad,
                tipoNumeracion,
                metodoAplicar,
                origenCuenta,
                tipoImpuesto,
                puedeReimprimir,
                recibePagos,
                metodoPosteo,
                fechaPermitida,
                excluirEstadoContable,
                documentoReverso: documentoReverso || undefined,
                idExterno: idExterno || undefined,
            };
            // Solo modificar en la sucursal activa (no replicar a otras sucursales)
            let primerResultado = null;
            const existente = await documentosApi.obtenerPorCodigo(sucursalActiva, codigo.trim());
            if (existente) {
                const payloadActualizar = { ...payload, id: existente.id };
                await documentosApi.actualizar(sucursalActiva, existente.id, payloadActualizar);
                primerResultado = existente;
            }
            else {
                const resultado = await documentosApi.crear(sucursalActiva, payload);
                primerResultado = resultado;
            }
            message.success('Tipo de documento guardado');
            if (primerResultado) {
                setIdGuardado(primerResultado.id);
            }
            setGuardado(true);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al guardar el tipo de documento');
            message.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    const handleCancelar = () => {
        Modal.confirm({
            title: 'Descartar cambios',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: 'Los cambios no guardados se perderán. ¿Está seguro que desea salir?',
            okText: 'Descartar',
            okType: 'danger',
            cancelText: 'Continuar editando',
            onOk: () => {
                navigate('/MDocumento');
            },
        });
    };
    // ----- Select options -----
    const tipoOptions = [
        { value: 'compra', label: 'Compra' },
        { value: 'venta', label: 'Venta' },
        { value: 'ajuste', label: 'Ajuste' },
        { value: 'transferencia', label: 'Transferencia' },
        { value: 'devolucion', label: 'Devolución' },
        { value: 'consignacion', label: 'Consignación' },
        { value: 'produccion', label: 'Producción' },
    ];
    const tipoNumeracionOptions = [
        { value: 0, label: 'Manual' },
        { value: 1, label: 'Automática' },
    ];
    const metodoAplicarOptions = [
        { value: 0, label: 'Manual' },
        { value: 1, label: 'Al Grabar' },
        { value: 2, label: 'Al Imprimir' },
    ];
    // ----- Sidebar content (shared between desktop Sider and mobile Drawer) -----
    const sidebarContent = (_jsxs(_Fragment, { children: [_jsx("div", { style: {
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid #F0F0F0',
                }, children: _jsxs(Text, { strong: true, style: { fontSize: 18, letterSpacing: '-0.3px' }, children: ["Genesis", _jsx("span", { style: { color: '#556ee6' }, children: "ERP" })] }) }), _jsx(Menu, { mode: "inline", selectedKeys: ['settings'], defaultSelectedKeys: ['settings'], items: menuItems, style: { border: 'none', marginTop: 8 } }), _jsx("div", { style: { flex: 1 } }), _jsxs("div", { style: {
                    padding: '16px 24px',
                    borderTop: '1px solid #F0F0F0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                }, children: [_jsx("div", { style: {
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: 'linear-gradient(135deg, #556ee6, #8b5cf6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: 13,
                        }, children: "CJ" }), _jsxs("div", { style: { lineHeight: 1.3 }, children: [_jsx(Text, { style: { fontSize: 13, fontWeight: 600, display: 'block' }, children: "Carlos Jim\u00E9nez" }), _jsx(Text, { style: { fontSize: 11, color: '#9CA3AF' }, children: "carlos@solugen.do" })] })] })] }));
    if (loading)
        return _jsx(LoadingSpinner, { mensaje: "Cargando documento..." });
    return (_jsxs(Layout, { style: { minHeight: '100vh', background: '#F7F8FA' }, children: [!isMobile && (_jsx(Sider, { width: 240, style: {
                    background: '#fff',
                    borderRight: '1px solid #F0F0F0',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 10,
                }, children: sidebarContent })), isMobile && (_jsx(Drawer, { title: null, placement: "left", closable: false, open: mobileOpen, onClose: () => setMobileOpen(false), width: 260, styles: { body: { padding: 0, display: 'flex', flexDirection: 'column' } }, extra: _jsx(Button, { type: "text", icon: _jsx(CloseOutlined, {}), onClick: () => setMobileOpen(false) }), children: sidebarContent })), _jsxs(Layout, { style: { marginLeft: isMobile ? 0 : 240, background: '#F7F8FA', minHeight: '100vh' }, children: [_jsx("div", { style: {
                            padding: '8px 32px',
                            background: '#fff',
                            borderBottom: '1px solid #F0F0F0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            position: 'sticky',
                            top: 0,
                            zIndex: 9,
                            minHeight: isMobile ? 48 : 40,
                        }, children: isMobile && (_jsx(Button, { type: "text", icon: _jsx(MenuOutlined, { style: { fontSize: 18 } }), onClick: () => setMobileOpen(true) })) }), _jsxs(Content, { style: {
                            padding: isMobile ? 16 : '24px 32px 40px',
                            overflow: 'auto',
                        }, children: [guardado ? (_jsx(DetalleToolbar, { modulo: "MDocumento", estado: 0, periodo: new Date().getMonth() + 1, revisado: false, onVolver: () => navigate('/MDocumento'), onEditar: () => navigate(`/MDocumento/${idGuardado || id}/editar`) })) : (_jsx(FormularioToolbar, { saving: saving, onGuardar: handleGuardar, onCancelar: handleCancelar })), _jsx("div", { style: { marginBottom: 28, animation: 'fadeIn 0.3s ease' }, children: _jsx(Text, { style: { fontSize: 15, color: '#4B5563', display: 'block', maxWidth: 560 }, children: "Configure los par\u00E1metros del tipo de documento, incluyendo identificaci\u00F3n, opciones de configuraci\u00F3n y m\u00E9todo de numeraci\u00F3n." }) }), _jsx(Title, { level: 5, style: { marginBottom: 16, fontSize: 15, fontWeight: 600 }, children: "Identificaci\u00F3n" }), _jsx(HoverableCard, { style: { marginBottom: 32 }, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 20 }, children: [_jsxs("div", { children: [_jsx(Text, { style: { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }, children: "C\u00F3digo" }), _jsx(Input, { placeholder: "C\u00F3digo del tipo de documento", value: codigo, onChange: (e) => setCodigo(e.target.value), maxLength: 10, disabled: mode === 'editar' || guardado })] }), _jsxs("div", { children: [_jsx(Text, { style: { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }, children: "Nombre" }), _jsx(Input, { placeholder: "Nombre del tipo de documento", value: nombre, onChange: (e) => setNombre(e.target.value), maxLength: 100, disabled: guardado })] }), _jsxs(Row, { gutter: 16, children: [_jsx(Col, { xs: 24, md: 12, children: _jsxs("div", { children: [_jsx(Text, { style: { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }, children: "Tipo" }), _jsx(Select, { showSearch: true, placeholder: "Seleccionar tipo", optionFilterProp: "label", value: tipo, onChange: setTipo, style: { width: '100%' }, options: tipoOptions, disabled: guardado })] }) }), _jsx(Col, { xs: 24, md: 12, children: _jsxs("div", { children: [_jsx(Text, { style: { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }, children: "Longitud c\u00F3digo" }), _jsx(InputNumber, { placeholder: "Longitud", value: longitudCodigo, onChange: (val) => setLongitudCodigo(val), min: 1, max: 20, style: { width: '100%' }, disabled: guardado })] }) })] })] }) }), _jsx(Title, { level: 5, style: { marginBottom: 16, fontSize: 15, fontWeight: 600 }, children: "Configuraci\u00F3n" }), _jsx(HoverableCard, { style: { marginBottom: 32 }, children: _jsxs(Row, { gutter: [16, 20], children: [_jsx(Col, { xs: 12, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx(Text, { style: { fontSize: 13, fontWeight: 500, color: '#374151' }, children: "Estado de cuenta" }), _jsx(Switch, { checked: estadoCuenta, onChange: setEstadoCuenta, disabled: guardado })] }) }), _jsx(Col, { xs: 12, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx(Text, { style: { fontSize: 13, fontWeight: 500, color: '#374151' }, children: "Precios con impuestos" }), _jsx(Switch, { checked: preciosConImpuestos, onChange: setPreciosConImpuestos, disabled: guardado })] }) }), _jsx(Col, { xs: 12, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx(Text, { style: { fontSize: 13, fontWeight: 500, color: '#374151' }, children: "Afecta inventario" }), _jsx(Switch, { checked: afectaInventario, onChange: setAfectaInventario, disabled: guardado })] }) }), _jsx(Col, { xs: 12, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx(Text, { style: { fontSize: 13, fontWeight: 500, color: '#374151' }, children: "Requiere asiento" }), _jsx(Switch, { checked: requiereAsiento, onChange: setRequiereAsiento, disabled: guardado })] }) }), _jsx(Col, { xs: 12, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx(Text, { style: { fontSize: 13, fontWeight: 500, color: '#374151' }, children: "Mod. precio" }), _jsx(Switch, { checked: modPrecio, onChange: setModPrecio, disabled: guardado })] }) }), _jsx(Col, { xs: 12, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx(Text, { style: { fontSize: 13, fontWeight: 500, color: '#374151' }, children: "Mod. descripci\u00F3n" }), _jsx(Switch, { checked: modDescripcion, onChange: setModDescripcion, disabled: guardado })] }) }), _jsx(Col, { xs: 12, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx(Text, { style: { fontSize: 13, fontWeight: 500, color: '#374151' }, children: "Trabajar en unidad" }), _jsx(Switch, { checked: trabajarEnUnidad, onChange: setTrabajarEnUnidad, disabled: guardado })] }) })] }) }), _jsx(Title, { level: 5, style: { marginBottom: 16, fontSize: 15, fontWeight: 600 }, children: "Numeraci\u00F3n y m\u00E9todo" }), _jsx(HoverableCard, { style: { marginBottom: 32 }, children: _jsxs(Row, { gutter: 16, children: [_jsx(Col, { xs: 24, md: 12, children: _jsxs("div", { children: [_jsx(Text, { style: { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }, children: "Tipo numeraci\u00F3n" }), _jsx(Select, { showSearch: true, placeholder: "Seleccionar tipo de numeraci\u00F3n", optionFilterProp: "label", value: tipoNumeracion, onChange: setTipoNumeracion, style: { width: '100%' }, options: tipoNumeracionOptions, disabled: guardado })] }) }), _jsx(Col, { xs: 24, md: 12, children: _jsxs("div", { children: [_jsx(Text, { style: { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }, children: "M\u00E9todo aplicar" }), _jsx(Select, { showSearch: true, placeholder: "Seleccionar m\u00E9todo", optionFilterProp: "label", value: metodoAplicar, onChange: setMetodoAplicar, style: { width: '100%' }, options: metodoAplicarOptions, disabled: guardado })] }) })] }) }), _jsx(Title, { level: 5, style: { marginBottom: 16, fontSize: 15, fontWeight: 600 }, children: "Avanzado" }), _jsxs(HoverableCard, { style: { marginBottom: 32 }, children: [_jsxs(Row, { gutter: 16, style: { marginBottom: 20 }, children: [_jsx(Col, { xs: 24, md: 12, children: _jsxs("div", { children: [_jsx(Text, { style: { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }, children: "Origen cuenta" }), _jsx(Select, { showSearch: true, placeholder: "Seleccionar origen", optionFilterProp: "label", value: origenCuenta, onChange: setOrigenCuenta, style: { width: '100%' }, options: [
                                                                { value: 0, label: 'Débito' },
                                                                { value: 1, label: 'Crédito' },
                                                                { value: 2, label: 'Desconocido' },
                                                            ], disabled: guardado })] }) }), _jsx(Col, { xs: 24, md: 12, children: _jsxs("div", { children: [_jsx(Text, { style: { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }, children: "Tipo impuesto" }), _jsx(Select, { showSearch: true, placeholder: "Seleccionar tipo impuesto", optionFilterProp: "label", value: tipoImpuesto, onChange: setTipoImpuesto, style: { width: '100%' }, options: [
                                                                { value: 0, label: 'Venta' },
                                                                { value: 1, label: 'Compra' },
                                                                { value: 2, label: 'Ninguno' },
                                                            ], disabled: guardado })] }) })] }), _jsxs(Row, { gutter: 16, style: { marginBottom: 20 }, children: [_jsx(Col, { xs: 24, md: 12, children: _jsxs("div", { children: [_jsx(Text, { style: { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }, children: "M\u00E9todo posteo" }), _jsx(Select, { showSearch: true, placeholder: "Seleccionar m\u00E9todo posteo", optionFilterProp: "label", value: metodoPosteo, onChange: setMetodoPosteo, style: { width: '100%' }, options: [
                                                                { value: 0, label: 'Manual' },
                                                                { value: 1, label: 'Al Grabar' },
                                                                { value: 2, label: 'Al Imprimir' },
                                                                { value: 3, label: 'Al Aplicar' },
                                                            ], disabled: guardado })] }) }), _jsx(Col, { xs: 24, md: 12, children: _jsxs("div", { children: [_jsx(Text, { style: { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }, children: "Fecha permitida" }), _jsx(Select, { showSearch: true, placeholder: "Seleccionar fecha permitida", optionFilterProp: "label", value: fechaPermitida, onChange: setFechaPermitida, style: { width: '100%' }, options: [
                                                                { value: 0, label: 'Ninguna' },
                                                                { value: 1, label: 'Todas' },
                                                                { value: 2, label: 'Mayor al Cierre' },
                                                                { value: 3, label: 'Mayor Documento Aplicado' },
                                                                { value: 4, label: 'Fecha del Día' },
                                                                { value: 5, label: 'Menor o Igual Fecha' },
                                                            ], disabled: guardado })] }) })] }), _jsxs(Row, { gutter: 16, style: { marginBottom: 20 }, children: [_jsx(Col, { xs: 8, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx(Text, { style: { fontSize: 13, fontWeight: 500, color: '#374151' }, children: "Puede reimprimir" }), _jsx(Switch, { checked: puedeReimprimir, onChange: setPuedeReimprimir, disabled: guardado })] }) }), _jsx(Col, { xs: 8, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx(Text, { style: { fontSize: 13, fontWeight: 500, color: '#374151' }, children: "Recibe pagos" }), _jsx(Switch, { checked: recibePagos, onChange: setRecibePagos, disabled: guardado })] }) }), _jsx(Col, { xs: 8, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx(Text, { style: { fontSize: 13, fontWeight: 500, color: '#374151' }, children: "Excluir estados contables" }), _jsx(Switch, { checked: excluirEstadoContable, onChange: setExcluirEstadoContable, disabled: guardado })] }) })] }), _jsxs(Row, { gutter: 16, children: [_jsx(Col, { xs: 24, md: 12, children: _jsxs("div", { children: [_jsx(Text, { style: { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }, children: "Documento reverso" }), _jsx(Input, { placeholder: "Documento reverso", value: documentoReverso, onChange: (e) => setDocumentoReverso(e.target.value), maxLength: 20, disabled: guardado })] }) }), _jsx(Col, { xs: 24, md: 12, children: _jsxs("div", { children: [_jsx(Text, { style: { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }, children: "ID externo" }), _jsx(Input, { placeholder: "ID externo", value: idExterno, onChange: (e) => setIdExterno(e.target.value), maxLength: 50, disabled: guardado })] }) })] })] }), _jsx(Title, { level: 5, style: { marginBottom: 16, fontSize: 15, fontWeight: 600, color: '#ef4444' }, children: "Danger Zone" }), _jsx(HoverableCard, { style: {
                                    borderColor: '#fecaca',
                                    background: '#FFFBFB',
                                }, children: _jsxs(Space, { direction: "vertical", size: 12, style: { width: '100%' }, children: [_jsxs("div", { style: { display: 'flex', gap: 12 }, children: [_jsx(ExclamationCircleOutlined, { style: { fontSize: 20, color: '#ef4444', marginTop: 2 } }), _jsxs("div", { children: [_jsx(Text, { strong: true, style: { fontSize: 14, color: '#991b1b' }, children: "Desactivar tipo de documento" }), _jsx(Text, { style: { fontSize: 13, color: '#b91c1c', display: 'block', marginTop: 2 }, children: "Esta acci\u00F3n desactivar\u00E1 el tipo de documento. Los documentos existentes no se ver\u00E1n afectados, pero no podr\u00E1 crear nuevos documentos con este tipo. Esta acci\u00F3n puede revertirse posteriormente." })] })] }), _jsx(Button, { danger: true, icon: _jsx(ExclamationCircleOutlined, {}), onClick: handleDesactivarDocumento, style: { borderRadius: 8, alignSelf: 'flex-start' }, children: "Desactivar documento" })] }) }), _jsx("div", { style: { height: 40 } })] })] }), _jsx("style", { children: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

      ` })] }));
};
export default DocumentosFormulario;
