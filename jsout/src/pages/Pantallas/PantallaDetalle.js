import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Space, message, Alert, Tabs, Table, Typography, Grid, Row, Col } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { Sucursal } from '../../types/auth';
import { pantallaApi } from '../../api/pantallaApi';
import { permisoEspecialApi } from '../../api/permisoEspecialApi';
import { ErrorDetalle } from '../../components';
import PermissionGate from '../../components/PermissionGate';
import DetalleToolbar from '../../components/DetalleToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
const { Text } = Typography;
const PantallaDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const sucursalActiva = useAuthStore((s) => s.usuario?.sucursalActiva);
    const securitySucursal = useAuthStore((s) => s.securitySucursal);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [data, setData] = useState(null);
    const [permisosEspeciales, setPermisosEspeciales] = useState([]);
    useEffect(() => {
        setActiveModule('MPantalla');
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    const cargarPantalla = useCallback(async () => {
        if (!id || sucursalActiva === undefined)
            return;
        setLoading(true);
        setLoadingError(false);
        try {
            const res = await pantallaApi.obtenerPorId(sucursalActiva, parseInt(id));
            if (!res) {
                message.error('Pantalla no encontrada');
                setLoadingError(true);
                return;
            }
            setData(res);
            setPageTitleOverride(res.codigo);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar pantalla');
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [id, sucursalActiva, setPageTitleOverride]);
    const cargarPermisos = useCallback(async () => {
        if (!id)
            return;
        try {
            const result = await permisoEspecialApi.obtenerPorPantalla(securitySucursal, parseInt(id));
            setPermisosEspeciales(result || []);
        }
        catch {
            // no crítico
        }
    }, [id]);
    useEffect(() => {
        cargarPantalla();
        cargarPermisos();
    }, [cargarPantalla, cargarPermisos]);
    const screens = Grid.useBreakpoint();
    const isLarge = screens.xxl === true;
    if (loading || (!data && !loadingError)) {
        return _jsx(LoadingSpinner, { mensaje: "Cargando pantalla..." });
    }
    if (loadingError && !data) {
        return _jsx(ErrorDetalle, { mensaje: "Error al cargar la pantalla", rutaVolver: "/MPantalla" });
    }
    if (!data)
        return null;
    const modulosItems = (data.modulos || []).length > 0 ? (_jsx(Table, { dataSource: data.modulos, rowKey: "id", size: "small", pagination: false, columns: [
            { title: 'Nombre', dataIndex: 'nombre', render: (t) => _jsx(Text, { strong: true, children: t }) },
            { title: 'Orden', dataIndex: 'orden', width: 80, align: 'center' },
        ] })) : (_jsx(Text, { type: "secondary", children: "Sin m\u00F3dulos asignados" }));
    const entidadesItems = (data.entidades || []).length > 0 ? (_jsx(Table, { dataSource: data.entidades, rowKey: (r) => r.entidadCodigo + (r.tipoEntidad || ''), size: "small", pagination: false, columns: [
            { title: 'Código', dataIndex: 'entidadCodigo', width: 140, render: (t) => _jsx(Text, { code: true, children: t }) },
            { title: 'Tipo', dataIndex: 'tipoEntidad', width: 100, render: (t) => t ? _jsx(Tag, { children: t }) : _jsx(Tag, { style: { color: '#999' }, children: "\u2014" }) },
            { title: 'Orden', dataIndex: 'orden', width: 80, align: 'center' },
        ] })) : (_jsx(Text, { type: "secondary", children: "Sin entidades asociadas" }));
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle de pantalla", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: cargarPantalla, children: "Reintentar" }) })), _jsx(DetalleToolbar, { modulo: "", estado: 0, periodo: 0, onVolver: () => navigate('/MPantalla'), onEditar: data ? () => navigate(`/MPantalla/${data.id}/editar`) : undefined, extraButtons: _jsx(PermissionGate, { accion: "CREAR", children: _jsx(Button, { icon: _jsx(PlusOutlined, {}), onClick: () => navigate('/MPantalla/nuevo'), children: "Nuevo" }) }) }), _jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, xs: 24, children: [_jsx(Card, { title: "Datos Generales", className: "paces-card", style: { marginBottom: 16 }, children: _jsxs(Descriptions, { column: isLarge ? 3 : 1, size: "small", bordered: true, styles: { label: { fontWeight: 500 } }, children: [_jsx(Descriptions.Item, { label: "C\u00F3digo", children: _jsx(Text, { code: true, children: data.codigo }) }), _jsx(Descriptions.Item, { label: "Nombre", children: data.nombre }), _jsx(Descriptions.Item, { label: "Ruta", children: data.ruta || '-' }), _jsx(Descriptions.Item, { label: "Grupo", children: data.grupo || '-' }), _jsx(Descriptions.Item, { label: "Tipo", children: data.tipo || '-' }), _jsx(Descriptions.Item, { label: "Orden", children: data.orden }), _jsx(Descriptions.Item, { label: "\u00BFEs Reporte?", children: data.esReporte ? 'Sí' : 'No' }), _jsx(Descriptions.Item, { label: "Activo", children: _jsx(Tag, { color: data.activo ? 'green' : 'red', children: data.activo ? 'Activo' : 'Inactivo' }) })] }) }), _jsx(Tabs, { type: "card", defaultActiveKey: "acciones", items: [
                                    {
                                        key: 'acciones',
                                        label: 'Acciones',
                                        children: (_jsx("div", { style: { padding: '16px 0' }, children: data.acciones && data.acciones.length > 0 ? (_jsx(Space, { wrap: true, size: 4, children: data.acciones.map((a) => (_jsx(Tag, { color: "processing", children: a }, a))) })) : (_jsx(Text, { type: "secondary", children: "Sin acciones asignadas" })) })),
                                    },
                                    {
                                        key: 'modulos',
                                        label: 'Módulos',
                                        children: (_jsx("div", { style: { padding: '16px 0' }, children: modulosItems })),
                                    },
                                    {
                                        key: 'permisos',
                                        label: 'Permisos Especiales',
                                        children: (_jsx("div", { style: { padding: '16px 0' }, children: (() => {
                                                const asignados = permisosEspeciales.filter((p) => p.asignado);
                                                return asignados.length > 0 ? (_jsx(Space, { wrap: true, size: 4, children: asignados.map((p) => (_jsx(Tag, { color: "green", children: p.nombre || p.codigo }, p.id))) })) : (_jsx(Text, { type: "secondary", children: "No hay permisos especiales asignados" }));
                                            })() })),
                                    },
                                    {
                                        key: 'entidades',
                                        label: 'Entidades',
                                        children: (_jsx("div", { style: { padding: '16px 0' }, children: entidadesItems })),
                                    },
                                ] })] }), isLarge && (_jsx(Col, { xxl: 6, children: _jsx(Card, { className: "paces-card", title: "Resumen", children: _jsxs(Descriptions, { column: 1, size: "small", bordered: true, children: [_jsx(Descriptions.Item, { label: "C\u00F3digo", children: data.codigo }), _jsx(Descriptions.Item, { label: "Grupo", children: data.grupo || '-' }), _jsx(Descriptions.Item, { label: "Tipo", children: data.tipo || '-' }), _jsx(Descriptions.Item, { label: "Activo", children: _jsx(Tag, { color: data.activo ? 'green' : 'red', children: data.activo ? 'Activo' : 'Inactivo' }) })] }) }) }))] })] }));
};
export default PantallaDetalle;
