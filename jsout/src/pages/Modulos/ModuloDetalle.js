import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Table, Tag, Modal, Form, Input, Select, message, Typography } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { moduloApi } from '../../api/moduloApi';
import { configModuloApi } from '../../api/configModuloApi';
import { toTitleCase } from '../../utils/formats';
import PermissionGate from '../../components/PermissionGate';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
const { Text, Title } = Typography;
const TIPOS = ['STRING', 'INT', 'DECIMAL', 'BOOL'];
const ModuloDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const { screenCode } = useScreenConfig('MODULOS');
    const [modulo, setModulo] = useState(null);
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [configLoading, setConfigLoading] = useState(false);
    // Modal de edición de config
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState(null);
    const [configForm] = Form.useForm();
    const cargar = useCallback(async () => {
        if (!id)
            return;
        setLoading(true);
        setError(false);
        try {
            const modulos = await moduloApi.obtenerTodo(sucursalActiva);
            const found = modulos.find((m) => m.id === Number(id));
            if (!found) {
                message.error('Módulo no encontrado');
                navigate('/Modulos');
                return;
            }
            setModulo(found);
            setPageTitleOverride(`Módulo: ${found.nombre}`);
            // Cargar configuraciones completas con tipo y descripción
            setConfigLoading(true);
            const configList = await configModuloApi.obtenerListaCompleta(sucursalActiva, found.nombre);
            setConfigs(configList);
        }
        catch {
            setError(true);
        }
        finally {
            setLoading(false);
            setConfigLoading(false);
        }
    }, [id, sucursalActiva, navigate, setPageTitleOverride]);
    useEffect(() => {
        setActiveModule(screenCode);
        cargar();
        return () => { resetToolbar(); setPageTitleOverride(''); };
    }, [setActiveModule, setPageTitleOverride, resetToolbar, screenCode, cargar]);
    // Abrir modal para crear/editar config
    const openConfigModal = (cfg) => {
        setEditingConfig(cfg || null);
        configForm.resetFields();
        if (cfg) {
            configForm.setFieldsValue({
                clave: cfg.clave,
                valor: cfg.valor,
                tipo: cfg.tipo || 'STRING',
                descripcion: cfg.descripcion || '',
            });
        }
        setConfigModalOpen(true);
    };
    const handleConfigGuardar = async () => {
        try {
            const values = await configForm.validateFields();
            const moduloNombre = modulo?.nombre;
            if (!moduloNombre)
                return;
            if (editingConfig) {
                await configModuloApi.actualizar(sucursalActiva, moduloNombre, editingConfig.clave, values);
                message.success('Configuración actualizada');
            }
            else {
                await configModuloApi.crear(sucursalActiva, {
                    modulo: moduloNombre,
                    clave: values.clave,
                    valor: values.valor,
                    tipo: values.tipo || 'STRING',
                    descripcion: values.descripcion || '',
                });
                message.success('Configuración creada');
            }
            setConfigModalOpen(false);
            cargar();
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al guardar configuración');
        }
    };
    const handleConfigEliminar = (cfg) => {
        Modal.confirm({
            title: 'Eliminar configuración',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: `¿Eliminar "${cfg.clave}"?`,
            okText: 'Eliminar',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await configModuloApi.eliminar(sucursalActiva, cfg.modulo, cfg.clave);
                    message.success('Configuración eliminada');
                    cargar();
                }
                catch (err) {
                    message.error(err?.response?.data?.errorMessage || 'Error al eliminar');
                }
            },
        });
    };
    const configColumns = [
        { title: 'Clave', dataIndex: 'clave', key: 'clave', width: 200 },
        { title: 'Valor', dataIndex: 'valor', key: 'valor', width: 150 },
        {
            title: 'Tipo', dataIndex: 'tipo', key: 'tipo', width: 100,
            render: (v) => _jsx(Tag, { children: v }),
        },
        { title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true },
        {
            title: 'Acciones', key: 'acciones', width: 120,
            render: (_, record) => (_jsxs("div", { style: { display: 'flex', gap: 4 }, children: [_jsx(PermissionGate, { accion: "EDITAR", children: _jsx(Button, { type: "link", icon: _jsx(EditOutlined, {}), onClick: () => openConfigModal(record) }) }), _jsx(Button, { type: "link", danger: true, icon: _jsx(DeleteOutlined, {}), onClick: () => handleConfigEliminar(record) })] })),
        },
    ];
    if (!modulo)
        return null;
    return (_jsxs(DetalleCatalogoLayout, { rutaVolver: "/Modulos", loading: loading, mensajeLoading: "Cargando m\u00F3dulo...", loadingError: error, mensajeError: "Error al cargar el m\u00F3dulo", onRecargar: cargar, dataDisponible: !!modulo, onEditar: () => navigate(`/Modulos/${modulo.id}/editar`), children: [_jsxs(Card, { className: "paces-card", style: { marginBottom: 16 }, children: [_jsx("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, children: _jsx(Title, { level: 4, style: { margin: 0 }, children: toTitleCase(modulo.nombre) }) }), _jsxs(Descriptions, { bordered: true, size: "small", column: 2, children: [_jsx(Descriptions.Item, { label: "ID", children: modulo.id }), _jsx(Descriptions.Item, { label: "Orden", children: modulo.orden }), _jsx(Descriptions.Item, { label: "Nombre", children: toTitleCase(modulo.nombre) })] })] }), _jsx(Card, { className: "paces-card", title: "Configuraci\u00F3n del m\u00F3dulo", extra: _jsx(PermissionGate, { accion: "CREAR", children: _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), size: "small", onClick: () => openConfigModal(), children: "Agregar" }) }), children: _jsx(Table, { dataSource: configs, columns: configColumns, rowKey: "clave", loading: configLoading, size: "small", pagination: false, locale: { emptyText: 'Sin configuraciones. Agregue una usando el botón superior.' } }) }), _jsx(Modal, { title: editingConfig ? 'Editar configuración' : 'Nueva configuración', open: configModalOpen, onCancel: () => setConfigModalOpen(false), onOk: handleConfigGuardar, okText: "Guardar", destroyOnHidden: true, children: _jsxs(Form, { form: configForm, layout: "vertical", size: "small", children: [_jsx(Form.Item, { name: "clave", label: "Clave", rules: [{ required: true, message: 'La clave es requerida' }], children: _jsx(Input, { placeholder: "Ej: FACTOR_REDONDEO", disabled: !!editingConfig }) }), _jsx(Form.Item, { name: "valor", label: "Valor", rules: [{ required: true, message: 'El valor es requerido' }], children: _jsx(Input, { placeholder: "Ej: 5" }) }), _jsx(Form.Item, { name: "tipo", label: "Tipo", children: _jsx(Select, { children: TIPOS.map((t) => _jsx(Select.Option, { value: t, children: t }, t)) }) }), _jsx(Form.Item, { name: "descripcion", label: "Descripci\u00F3n", children: _jsx(Input.TextArea, { rows: 2, placeholder: "Descripci\u00F3n del par\u00E1metro" }) })] }) })] }));
};
export default ModuloDetalle;
