import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Tabs, Tag, Button, Row, Col, Grid, message, Typography, Descriptions, Modal, } from 'antd';
import { ExclamationCircleOutlined, CheckCircleOutlined, PrinterOutlined, } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { plantillaSuplidorApi } from '../../api/plantillaSuplidorApi';
import { analisisCompraApi } from '../../api/analisisCompraApi';
import PermissionGate from '../../components/PermissionGate';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
const { Text } = Typography;
function toTitleCase(str) {
    if (!str)
        return str;
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
function formatDate(val) {
    if (!val)
        return '-';
    const d = new Date(val);
    if (isNaN(d.getTime()))
        return val;
    return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
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
const PlantillaSuplidorDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [generando, setGenerando] = useState(false);
    const [imprimiendo, setImprimiendo] = useState(false);
    const screens = Grid.useBreakpoint();
    const isLarge = screens.xxl === true;
    const handleRefresh = useCallback(() => {
        if (!id)
            return;
        setLoadingError(false);
        setLoading(true);
        plantillaSuplidorApi.obtenerPorId(sucursalActiva, id)
            .then((res) => {
            setData(res);
            setPageTitleOverride(`Plantilla #${res.numero}`);
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al recargar');
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride]);
    useEffect(() => {
        setActiveModule('mplantillasup');
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    useEffect(() => {
        if (!id)
            return;
        setLoading(true);
        plantillaSuplidorApi.obtenerPorId(sucursalActiva, id)
            .then((res) => {
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            setPageTitleOverride(`Plantilla #${res.numero}`);
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al cargar el documento');
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride]);
    const handleEliminar = () => {
        Modal.confirm({
            title: 'Eliminar plantilla',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: '¿Está seguro que desea eliminar esta plantilla de suplidor?',
            okText: 'Sí, eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                if (!id)
                    return;
                setSaving(true);
                try {
                    await plantillaSuplidorApi.eliminar(sucursalActiva, id);
                    message.success('Plantilla eliminada correctamente');
                    navigate('/mplantillasup');
                }
                catch (err) {
                    const msg = extraerMensajeError(err, 'Error al eliminar');
                    message.error(msg);
                }
                finally {
                    setSaving(false);
                }
            },
        });
    };
    const handleGenerarAnalisis = () => {
        if (!data?.detalles?.length) {
            message.warning('La plantilla no tiene productos para procesar');
            return;
        }
        const codigos = data.detalles
            .map((d) => d.codigoProducto)
            .filter(Boolean);
        if (codigos.length === 0) {
            message.warning('No se encontraron códigos de producto válidos');
            return;
        }
        Modal.confirm({
            title: 'Generar Análisis de Compra',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: `Se procesarán ${codigos.length} producto${codigos.length !== 1 ? 's' : ''} en todas las sucursales. El proceso toma varios minutos y se ejecutará en segundo plano. Recibirá una notificación cuando finalice. ¿Desea continuar?`,
            okText: 'Sí, generar',
            cancelText: 'Cancelar',
            onOk: async () => {
                setGenerando(true);
                try {
                    const resultado = await analisisCompraApi.refrescarPorCodigosEnSegundoPlano(codigos);
                    message.success(resultado.mensaje);
                }
                catch (err) {
                    const msg = extraerMensajeError(err, 'Error al iniciar el proceso de análisis');
                    message.error(msg);
                }
                finally {
                    setGenerando(false);
                }
            },
        });
    };
    const handleImprimir = async () => {
        setImprimiendo(true);
        try {
            const res = await plantillaSuplidorApi.imprimir(sucursalActiva, id);
            const blobUrl = URL.createObjectURL(res);
            window.open(blobUrl, '_blank');
        }
        catch {
            message.error('Error al generar el PDF');
        }
        finally {
            setImprimiendo(false);
        }
    };
    if (!data)
        return null;
    const detalleColumns = [
        {
            title: 'Orden',
            dataIndex: 'orden',
            key: 'orden',
            width: 80,
            align: 'right',
            onCell: () => ({ style: { paddingLeft: 16 } }),
            onHeaderCell: () => ({ style: { paddingLeft: 16 } }),
        },
        {
            title: 'Código Producto',
            dataIndex: 'codigoProducto',
            key: 'codigoProducto',
            width: 150,
        },
        {
            title: 'Descripción',
            dataIndex: 'descripcion',
            key: 'descripcion',
            ellipsis: true,
            render: (v) => toTitleCase(v || ''),
        },
        {
            title: 'Referencia',
            dataIndex: 'referencia',
            key: 'referencia',
            width: 130,
            render: (v) => v || '-',
        },
        {
            title: 'Presentación',
            key: 'presentacion',
            width: 130,
            render: (_, record) => {
                return record.nombrePresentacion || '-';
            },
        },
    ];
    return (_jsx(DetalleCatalogoLayout, { rutaVolver: "/mplantillasup", loading: loading, mensajeLoading: "Cargando plantilla...", loadingError: loadingError, mensajeError: "Error al cargar detalle de plantilla de suplidor", onRecargar: handleRefresh, dataDisponible: !!data, onEditar: () => navigate(`/mplantillasup/${id}/editar`), onEliminar: handleEliminar, eliminando: saving, extraActions: _jsxs(_Fragment, { children: [_jsx(PermissionGate, { accion: "PROCESAR", children: _jsx(Button, { icon: _jsx(PrinterOutlined, {}), loading: imprimiendo, onClick: handleImprimir }) }), _jsx(PermissionGate, { accion: "PROCESAR", children: _jsx(Button, { type: "primary", icon: _jsx(CheckCircleOutlined, {}), loading: generando, onClick: handleGenerarAnalisis, style: { background: '#389e0d', borderColor: '#389e0d' }, children: "Generar An\u00E1lisis" }) })] }), children: isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { lg: 18, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 2, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "N\u00FAmero:", children: data.numero || '-' }), _jsx(Descriptions.Item, { label: "Tipo:", children: data.tipo || '—' }), _jsx(Descriptions.Item, { label: "Fecha:", children: formatDate(data.fecha) }), _jsx(Descriptions.Item, { label: "Suplidor:", span: 2, children: toTitleCase(data.nombreSuplidor || '-') }), _jsx(Descriptions.Item, { label: "Notas:", span: 2, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: data.notas || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", items: [
                                {
                                    key: 'detalles',
                                    label: `Detalles (${data.detalles?.length || 0})`,
                                    children: (_jsx(Table, { dataSource: data.detalles || [], columns: detalleColumns, rowKey: (r) => r.id || r.codigoProducto, size: "small", pagination: false, scroll: { x: 700 } })),
                                },
                            ] })] }), _jsx(Col, { lg: 6, children: _jsx(Card, { title: _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Informaci\u00F3n" }), className: "paces-card", style: { marginBottom: 16 }, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsxs("div", { children: [_jsx("span", { className: "paces-text-secondary", children: "C\u00F3digo Suplidor: " }), _jsx("span", { children: data.codigoSuplidor || '-' })] }), _jsxs("div", { children: [_jsx("span", { className: "paces-text-secondary", children: "Productos: " }), _jsx("span", { children: data.detalles?.length || 0 })] })] }) }) })] })) : (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "N\u00FAmero:", children: data.numero || '-' }), _jsx(Descriptions.Item, { label: "Tipo:", children: data.tipo || '—' }), _jsx(Descriptions.Item, { label: "Fecha:", children: formatDate(data.fecha) }), _jsx(Descriptions.Item, { label: "Suplidor:", children: toTitleCase(data.nombreSuplidor || '-') }), _jsx(Descriptions.Item, { label: "Notas:", children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: data.notas || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", items: [
                        {
                            key: 'detalles',
                            label: `Detalles (${data.detalles?.length || 0})`,
                            children: (_jsx(Table, { dataSource: data.detalles || [], columns: detalleColumns, rowKey: (r) => r.id || r.codigoProducto, size: "small", pagination: false, scroll: { x: 700 } })),
                        },
                    ] })] })) }));
};
export default PlantillaSuplidorDetalle;
