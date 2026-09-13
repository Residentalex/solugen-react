import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Grid, message, } from 'antd';
import { IdcardOutlined, PhoneOutlined, EnvironmentOutlined, } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { proveedorApi } from '../../api/proveedorApi';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
function toTitleCase(str) {
    if (!str)
        return str;
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
const ProveedorDetalle = () => {
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
        setActiveModule('MSUP');
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    useEffect(() => {
        if (!codigo)
            return;
        setLoading(true);
        proveedorApi.obtenerPorCodigo(sucursalActiva, codigo)
            .then((res) => {
            setData(res);
            setPageTitleOverride(toTitleCase(res.nombre || codigo));
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el proveedor';
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
        proveedorApi.obtenerPorCodigo(sucursalActiva, codigo)
            .then((res) => {
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            setPageTitleOverride(toTitleCase(res.nombre || codigo));
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al recargar';
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [codigo, sucursalActiva, setPageTitleOverride]);
    if (!data)
        return null;
    const isLarge = screens.xxl === true;
    return (_jsx(DetalleCatalogoLayout, { rutaVolver: "/MProveedor", loading: loading, mensajeLoading: "Cargando proveedor...", loadingError: loadingError, mensajeError: "Error al cargar detalle de proveedor", onRecargar: handleRefresh, dataDisponible: !!data, children: _jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos del Proveedor" }), _jsx(Tag, { color: "blue", children: data.codigo })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: isLarge ? 3 : 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Nombre", span: isLarge ? 2 : 1, children: toTitleCase(data.nombre || '-') }), _jsx(Descriptions.Item, { label: "C\u00F3digo", children: data.codigo || '-' }), _jsx(Descriptions.Item, { label: "Identificaci\u00F3n", children: _jsxs("span", { children: [_jsx(IdcardOutlined, { style: { color: '#556ee6', marginRight: 6 } }), data.identificacion || '-'] }) }), _jsx(Descriptions.Item, { label: "Tel\u00E9fono", children: _jsxs("span", { children: [_jsx(PhoneOutlined, { style: { color: '#556ee6', marginRight: 6 } }), data.telefono || '-'] }) }), _jsx(Descriptions.Item, { label: "Beneficiario", children: data.beneficiario ? toTitleCase(data.beneficiario) : '-' }), _jsx(Descriptions.Item, { label: "D\u00EDas Cr\u00E9dito", children: data.diasCredito ? `${data.diasCredito} días` : '-' }), _jsx(Descriptions.Item, { label: "Requiere ORC", children: _jsx(Tag, { color: data.requiereORC ? 'warning' : 'default', children: data.requiereORC ? 'Sí' : 'No' }) }), _jsx(Descriptions.Item, { label: "Direcci\u00F3n", span: 3, children: _jsxs("span", { children: [_jsx(EnvironmentOutlined, { style: { color: '#556ee6', marginRight: 6 } }), data.direccion ? toTitleCase(data.direccion) : '-'] }) }), data.idExterno && (_jsx(Descriptions.Item, { label: "ID Externo", children: data.idExterno }))] }) }) }));
};
export default ProveedorDetalle;
