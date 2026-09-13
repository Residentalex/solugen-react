import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Typography, Descriptions, Alert, Modal, Input, message, } from 'antd';
import { ArrowLeftOutlined, EditOutlined, CloseCircleOutlined, ExclamationCircleOutlined, } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { actualizacionPrecioApi } from '../../api/actualizacionPrecioApi';
import PermissionGate from '../../components/PermissionGate';
import TotalesCard from '../../components/TotalesCard';
import { formatDate, formatNumber, toTitleCase, extraerMensajeError } from '../../utils/formats';
const { Text } = Typography;
const ESTADO_TAG = {
    Pendiente: { color: 'warning', label: 'Pendiente' },
    P: { color: 'warning', label: 'Pendiente' },
    Aplicado: { color: 'success', label: 'Aplicado' },
    A: { color: 'success', label: 'Aplicado' },
    Anulado: { color: 'error', label: 'Anulado' },
    N: { color: 'error', label: 'Anulado' },
};
const ActualizacionPrecioDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [detalleSearch, setDetalleSearch] = useState('');
    const screens = Grid.useBreakpoint();
    useEffect(() => {
        setActiveModule('FActPrecio');
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    useEffect(() => {
        if (!id)
            return;
        setLoading(true);
        actualizacionPrecioApi.obtenerDetalle(sucursalActiva, id)
            .then((res) => {
            setData(res);
            setPageTitleOverride(`Actualización ${res.documento}`);
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al cargar el detalle');
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride]);
    const handleRefresh = useCallback(() => {
        if (!id)
            return;
        setLoadingError(false);
        setLoading(true);
        actualizacionPrecioApi.obtenerDetalle(sucursalActiva, id)
            .then((res) => {
            setData(res);
            setPageTitleOverride(`Actualización ${res.documento}`);
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al recargar');
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride]);
    const handleAnular = () => {
        if (!id || !data)
            return;
        Modal.confirm({
            title: 'Anular Actualización de Precio',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: `¿Está seguro que desea anular la actualización ${data.documento}?`,
            okText: 'Sí, anular',
            okButtonProps: { danger: true },
            cancelText: 'No',
            onOk: async () => {
                setSaving(true);
                try {
                    await actualizacionPrecioApi.anular(sucursalActiva, id);
                    message.success('Actualización anulada exitosamente');
                    handleRefresh();
                }
                catch (err) {
                    const msg = extraerMensajeError(err, 'Error al anular');
                    message.error(msg);
                }
                finally {
                    setSaving(false);
                }
            },
        });
    };
    if (loading || (!data && !loadingError)) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando documento..." })] }));
    }
    if (loadingError && !data) {
        return (_jsx("div", { style: { textAlign: 'center', padding: 80 }, children: _jsx(Alert, { message: "Error al cargar el detalle", type: "error", showIcon: true, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) }) }));
    }
    if (!data)
        return null;
    const isLarge = screens.xxl === true;
    const estadoInfo = ESTADO_TAG[data.estado] || { color: 'default', label: data.estado };
    const esPendiente = data.estado === 'Pendiente' || data.estado === 'P';
    // Líneas filtradas
    const lineasFiltradas = detalleSearch
        ? data.lineas.filter((l) => {
            const q = detalleSearch.toLowerCase();
            return ((l.codPro || '').toLowerCase().includes(q) ||
                (l.descripcion || '').toLowerCase().includes(q));
        })
        : data.lineas;
    const totalCostoPiv = data.lineas.reduce((s, l) => s + (l.costoPiv || 0), 0);
    const totalPrecioSug = data.lineas.reduce((s, l) => s + (l.precioSug || 0), 0);
    const totalAumento = data.lineas.reduce((s, l) => s + (l.aumento || 0), 0);
    const columnas = [
        {
            title: 'Código',
            key: 'codPro',
            width: 120,
            fixed: 'left',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsx(Text, { children: record.codPro || '-' })),
        },
        {
            title: 'Descripción',
            key: 'descripcion',
            ellipsis: true,
            render: (_, record) => (_jsx(Text, { children: toTitleCase(record.descripcion || '') })),
        },
        {
            title: 'Precio Actual',
            dataIndex: 'precio',
            key: 'precio',
            width: 130,
            align: 'right',
            render: (val) => _jsx(Text, { style: { fontFamily: 'monospace' }, children: formatNumber(val) }),
        },
        {
            title: '% Aumento',
            dataIndex: 'pAumento',
            key: 'pAumento',
            width: 110,
            align: 'right',
            render: (val) => _jsxs(Text, { style: { fontFamily: 'monospace' }, children: [formatNumber(val), "%"] }),
        },
        {
            title: 'Aumento',
            dataIndex: 'aumento',
            key: 'aumento',
            width: 110,
            align: 'right',
            render: (val) => _jsx(Text, { style: { fontFamily: 'monospace' }, children: formatNumber(val) }),
        },
        {
            title: 'Precio Sugerido',
            dataIndex: 'precioSug',
            key: 'precioSug',
            width: 130,
            align: 'right',
            render: (val) => _jsx(Text, { strong: true, style: { fontFamily: 'monospace' }, children: formatNumber(val) }),
        },
        {
            title: 'Costo Pivote',
            dataIndex: 'costoPiv',
            key: 'costoPiv',
            width: 130,
            align: 'right',
            responsive: ['lg', 'xl', 'xxl'],
            render: (val) => _jsx(Text, { style: { fontFamily: 'monospace' }, children: formatNumber(val) }),
        },
        {
            title: 'Margen %',
            dataIndex: 'pMargen',
            key: 'pMargen',
            width: 110,
            align: 'right',
            responsive: ['lg', 'xl', 'xxl'],
            render: (val) => _jsxs(Text, { style: { fontFamily: 'monospace' }, children: [formatNumber(val), "%"] }),
        },
    ];
    const contenidoDetalle = (_jsxs(_Fragment, { children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: isLarge ? 3 : 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Documento", children: data.documento || '-' }), _jsx(Descriptions.Item, { label: "Fecha", children: formatDate(data.fecha) }), _jsx(Descriptions.Item, { label: "Fecha Aplicar", children: formatDate(data.fechaParaAplicar) }), _jsx(Descriptions.Item, { label: "Almac\u00E9n", children: data.almacenNombre || '-' }), _jsx(Descriptions.Item, { label: "Familia", children: data.familiaNombre || '-' }), _jsx(Descriptions.Item, { label: "Doc. Referencia", children: data.docReferencia || '-' }), _jsxs(Descriptions.Item, { label: "Ajuste %", children: [formatNumber(data.ajuste), "%"] }), _jsx(Descriptions.Item, { label: "Redondear", children: data.redondear ? 'Sí' : 'No' }), _jsx(Descriptions.Item, { label: "Base", children: data.base || '-' }), _jsx(Descriptions.Item, { label: "Todos Almacenes", children: data.todosAlm ? 'Sí' : 'No' }), _jsx(Descriptions.Item, { label: "Todas Familias", children: data.todasFam ? 'Sí' : 'No' }), _jsx(Descriptions.Item, { label: "Autorizado", children: _jsx(Tag, { color: data.autorizado ? 'blue' : 'default', children: data.autorizado ? 'Sí' : 'No' }) }), _jsxs(Descriptions.Item, { label: "% Pivote", children: [formatNumber(data.porPivote), "%"] }), _jsxs(Descriptions.Item, { label: "% Precio M\u00EDn", children: [formatNumber(data.porPrecioMin), "%"] }), _jsx(Descriptions.Item, { label: "Precio Actual", children: _jsx(Tag, { color: data.precioAct ? 'blue' : 'default', children: data.precioAct ? 'Sí' : 'No' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "lineas", type: "card", tabBarExtraContent: _jsx(Input.Search, { placeholder: "Buscar l\u00EDnea...", allowClear: true, style: { width: isLarge ? 320 : 220 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                        setDetalleSearch(''); } }), items: [
                    {
                        key: 'lineas',
                        label: `Líneas (${lineasFiltradas.length}${detalleSearch ? `/${data.lineas.length}` : ''})`,
                        children: (_jsx(Table, { dataSource: lineasFiltradas, columns: columnas, rowKey: "id", size: "small", pagination: false, scroll: { x: 1100 } })),
                    },
                    {
                        key: 'historial',
                        label: 'Historial',
                        children: (_jsx("div", { style: { textAlign: 'center', padding: 40 }, children: _jsx(Text, { type: "secondary", children: "Historial pr\u00F3ximamente" }) })),
                    },
                ] })] }));
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle de actualizaci\u00F3n de precio", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate('/FActPrecio'), children: "Volver" }), _jsx("div", { style: { flex: 1 } }), _jsx(Space, { children: esPendiente && (_jsxs(_Fragment, { children: [_jsx(PermissionGate, { accion: "EDITAR", children: _jsx(Button, { type: "primary", icon: _jsx(EditOutlined, {}), onClick: () => navigate(`/FActPrecio/${id}/editar`), children: "Editar" }) }), _jsx(PermissionGate, { accion: "ANULAR", children: _jsx(Button, { danger: true, icon: _jsx(CloseCircleOutlined, {}), loading: saving, onClick: handleAnular, children: "Anular" }) })] })) })] }), isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsx(Col, { xxl: 18, children: contenidoDetalle }), _jsx(Col, { xxl: 6, children: _jsx(TotalesCard, { subTotal: totalCostoPiv, descuento: 0, impuestos: 0, total: totalPrecioSug, nota: `Aumento total: ${formatNumber(totalAumento)}`, monedaSimbolo: "RD$", monedaNombre: "Peso Dominicano", tasa: 1 }) })] })) : (_jsxs("div", { children: [contenidoDetalle, _jsx("div", { style: { marginTop: 24 }, children: _jsx(TotalesCard, { subTotal: totalCostoPiv, descuento: 0, impuestos: 0, total: totalPrecioSug, alignRight: true, nota: `Aumento total: ${formatNumber(totalAumento)}`, monedaSimbolo: "RD$", monedaNombre: "Peso Dominicano", tasa: 1 }) })] }))] }));
};
export default ActualizacionPrecioDetalle;
