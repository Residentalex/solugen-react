import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { Card, Button, Descriptions, Tag, Typography, Alert, Spin, Space, Popconfirm, message, } from 'antd';
import { ReloadOutlined, PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { configPedidosYaApi } from '../../api/configPedidosYaApi';
import { actualizacionPrecioApi } from '../../api/actualizacionPrecioApi';
import ConfigPedidosYaFormulario from './ConfigPedidosYaFormulario';
const { Text } = Typography;
const ConfigPedidosYa = () => {
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [config, setConfig] = useState(null);
    const [noExiste, setNoExiste] = useState(false);
    const [formularioVisible, setFormularioVisible] = useState(false);
    const [eliminando, setEliminando] = useState(false);
    const [subiendo, setSubiendo] = useState(false);
    const cargarConfig = useCallback(async () => {
        setLoading(true);
        setLoadingError(false);
        setNoExiste(false);
        try {
            const data = await configPedidosYaApi.obtener(sucursalActiva);
            setConfig(data);
        }
        catch (err) {
            if (err?.response?.status === 404) {
                setConfig(null);
                setNoExiste(true);
            }
            else {
                setLoadingError(true);
                message.error(err?.response?.data?.errorMessage || 'Error al cargar configuración de PedidosYa');
            }
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva]);
    useEffect(() => {
        setActiveModule('ConfigPedidosYa');
        updateToolbar({});
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar]);
    useEffect(() => {
        cargarConfig();
    }, [cargarConfig]);
    const abrirNuevo = () => {
        setFormularioVisible(true);
    };
    const abrirEditar = () => {
        setFormularioVisible(true);
    };
    const handleEliminar = async () => {
        setEliminando(true);
        try {
            await configPedidosYaApi.eliminar(sucursalActiva);
            message.success('Configuración de PedidosYa eliminada correctamente');
            setConfig(null);
            setNoExiste(true);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al eliminar configuración de PedidosYa');
        }
        finally {
            setEliminando(false);
        }
    };
    const handleGuardar = () => {
        cargarConfig();
    };
    const handleSubir = async () => {
        if (!config)
            return;
        setSubiendo(true);
        try {
            const rutaTemp = `C:\\temp\\pedidosya_${sucursalActiva}_${Date.now()}.csv`;
            await actualizacionPrecioApi.subirArchivoPedidosYa(sucursalActiva, rutaTemp);
            message.success('Archivo subido correctamente a PedidosYa');
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al subir archivo a PedidosYa');
        }
        finally {
            setSubiendo(false);
        }
    };
    // --- Render ---
    if (loading) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando configuraci\u00F3n..." })] }));
    }
    return (_jsxs(_Fragment, { children: [loadingError && (_jsx(Alert, { message: "Error al cargar configuraci\u00F3n de PedidosYa", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: cargarConfig, children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx(Text, { strong: true, style: { fontSize: 16 }, children: "Configuraci\u00F3n PedidosYa" }), _jsx("div", { style: { flex: 1 } }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: cargarConfig }), noExiste ? (_jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: abrirNuevo, children: "Crear configuraci\u00F3n" })) : (_jsxs(Space, { children: [_jsx(Button, { type: "primary", icon: _jsx(UploadOutlined, {}), loading: subiendo, onClick: handleSubir, children: "Subir ahora" }), _jsx(Button, { icon: _jsx(EditOutlined, {}), onClick: abrirEditar, children: "Editar" }), _jsx(Popconfirm, { title: "Eliminar configuraci\u00F3n", description: "\u00BFEst\u00E1s seguro de eliminar la configuraci\u00F3n de PedidosYa para esta sucursal?", onConfirm: handleEliminar, okText: "Eliminar", cancelText: "Cancelar", okButtonProps: { danger: true }, children: _jsx(Button, { danger: true, icon: _jsx(DeleteOutlined, {}), loading: eliminando, children: "Eliminar" }) })] }))] }) }), _jsx("div", { style: { padding: '0 24px 24px' }, children: noExiste ? (_jsxs("div", { style: { textAlign: 'center', padding: '40px 0' }, children: [_jsx(Text, { type: "secondary", style: { fontSize: 15 }, children: "No hay configuraci\u00F3n de PedidosYa para esta sucursal." }), _jsx("div", { style: { marginTop: 16 }, children: _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: abrirNuevo, children: "Crear configuraci\u00F3n" }) })] })) : config ? (_jsxs(Descriptions, { bordered: true, size: "small", column: { xs: 1, sm: 2, md: 2 }, style: { background: '#fff' }, children: [_jsx(Descriptions.Item, { label: "Servidor", span: 2, children: _jsx(Text, { code: true, children: config.servidor }) }), _jsx(Descriptions.Item, { label: "Puerto", children: _jsx(Text, { children: config.puerto }) }), _jsx(Descriptions.Item, { label: "Usuario", children: _jsx(Text, { children: config.usuario }) }), _jsx(Descriptions.Item, { label: "Contrase\u00F1a", children: _jsx(Text, { children: config.contrasena ? '••••••••' : _jsx(Text, { type: "secondary", children: "No definida" }) }) }), _jsx(Descriptions.Item, { label: "Archivo Clave", children: _jsx(Text, { children: config.archivoClave || _jsx(Text, { type: "secondary", children: "No definido" }) }) }), _jsx(Descriptions.Item, { label: "Margen Beneficio", children: _jsxs(Tag, { color: "blue", children: [config.margenBeneficio, "%"] }) }), _jsx(Descriptions.Item, { label: "Ruta Remota", children: _jsx(Text, { children: config.rutaRemota || _jsx(Text, { type: "secondary", children: "No definida" }) }) }), _jsx(Descriptions.Item, { label: "Prefijo Archivo", children: _jsx(Text, { children: config.prefijoArchivo || _jsx(Text, { type: "secondary", children: "No definido" }) }) }), _jsx(Descriptions.Item, { label: "Vendor ID", children: _jsx(Text, { children: config.vendorID || _jsx(Text, { type: "secondary", children: "No definido" }) }) })] })) : !loadingError ? (_jsx("div", { style: { textAlign: 'center', padding: '40px 0' }, children: _jsx(Text, { type: "secondary", children: "No hay configuraci\u00F3n de PedidosYa para esta sucursal." }) })) : null })] }), _jsx(ConfigPedidosYaFormulario, { visible: formularioVisible, editItem: config, onClose: () => setFormularioVisible(false), onSaved: handleGuardar })] }));
};
export default ConfigPedidosYa;
