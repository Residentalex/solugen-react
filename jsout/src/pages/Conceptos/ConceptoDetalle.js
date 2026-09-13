import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tabs, Tag, Row, Col, Grid, Typography, Descriptions, Table } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { conceptosApi } from '../../api/conceptosApi';
import { tipoApi } from '../../api/tipoApi';
import { toTitleCase } from '../../utils/formats';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
const { Text } = Typography;
const TIPO_INGRESO_LABEL = {
    0: 'Ninguno',
    1: 'Operaciones',
    2: 'Financieros',
    3: 'Extraordinarios',
    4: 'Arrendamientos',
    5: 'Venta Activo',
    6: 'Otros Ingresos',
};
const ConceptoDetalle = () => {
    const { codigo } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [tiposMap, setTiposMap] = useState({});
    const [tiposDocMap, setTiposDocMap] = useState({});
    const screens = Grid.useBreakpoint();
    const isLarge = screens.xxl === true;
    const cargarConcepto = useCallback(() => {
        if (!codigo)
            return;
        setLoading(true);
        setLoadingError(false);
        conceptosApi.obtenerConcepto(sucursalActiva, codigo)
            .then((res) => {
            setData(res);
            setPageTitleOverride(res.codigo);
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el concepto';
            //message.error(msg); // commented to match pattern - using Alert instead
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [codigo, sucursalActiva, setPageTitleOverride]);
    useEffect(() => {
        setActiveModule('MConcepto');
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
        }).catch((err) => console.warn('Error al cargar tipos en detalle', err));
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride, sucursalActiva]);
    useEffect(() => {
        if (!codigo)
            return;
        cargarConcepto();
    }, [codigo, cargarConcepto]);
    if (!data)
        return null;
    return (_jsx(DetalleCatalogoLayout, { rutaVolver: "/MConcepto", loading: loading, mensajeLoading: "Cargando concepto...", loadingError: loadingError, mensajeError: "Error al cargar detalle del concepto", onRecargar: cargarConcepto, dataDisponible: !!data, errorSinDatos: false, onEditar: () => navigate(`/MConcepto/${codigo}/editar`), children: isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [_jsxs(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsx(Tag, { color: data.activo ? 'green' : 'default', children: data.activo ? 'Activo' : 'Inactivo' })] }), style: { marginBottom: 16 }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }, children: [_jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "C\u00F3digo" }), _jsx("br", {}), _jsx(Text, { style: { fontFamily: 'monospace', fontSize: 20, fontWeight: 700 }, children: data.codigo })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "Nombre" }), _jsx("br", {}), _jsx(Text, { style: { fontSize: 15, fontWeight: 600 }, children: toTitleCase(data.nombre ?? '') })] })] }), _jsxs(Descriptions, { bordered: true, size: "small", column: isLarge ? 2 : 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Doc. a Generar", children: data.docAGenerar || '-' }), _jsx(Descriptions.Item, { label: "Almac\u00E9n", children: data.almacen?.codigo ? `${data.almacen.codigo} - ${toTitleCase(data.almacen.nombre || '')}` : '-' }), _jsx(Descriptions.Item, { label: "Sucursal Destino", children: data.sucursalDestino?.codigo ? toTitleCase(data.sucursalDestino.nombre || '') || data.sucursalDestino.codigo : '-' }), _jsx(Descriptions.Item, { label: "Concepto Destino", children: data.conceptoDestino && data.conceptoDestinoNombre
                                                ? `${data.conceptoDestino}-${toTitleCase(data.conceptoDestinoNombre)}`
                                                : data.conceptoDestino || '-' })] })] }), _jsx(Tabs, { type: "card", items: [
                                {
                                    key: 'inventario',
                                    label: 'Inventario',
                                    children: (_jsxs(Descriptions, { bordered: true, size: "small", column: isLarge ? 2 : 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Sin Impuesto", children: _jsx(Tag, { color: data.noImpuesto ? 'orange' : 'default', children: data.noImpuesto ? 'Sí' : 'No' }) }), _jsx(Descriptions.Item, { label: "No Actualiza Costos", children: _jsx(Tag, { color: data.noActualizaCostos ? 'orange' : 'default', children: data.noActualizaCostos ? 'Sí' : 'No' }) }), _jsx(Descriptions.Item, { label: "Almac\u00E9n", children: data.almacen?.codigo ? `${data.almacen.codigo} - ${toTitleCase(data.almacen.nombre || '')}` : '-' }), _jsx(Descriptions.Item, { label: "Sucursal Destino", children: data.sucursalDestino?.codigo ? toTitleCase(data.sucursalDestino.nombre || '') || data.sucursalDestino.codigo : '-' }), _jsx(Descriptions.Item, { label: "Concepto Destino", children: data.conceptoDestino && data.conceptoDestinoNombre
                                                    ? `${data.conceptoDestino}-${toTitleCase(data.conceptoDestinoNombre)}`
                                                    : data.conceptoDestino || '-' }), _jsx(Descriptions.Item, { label: "Replicar", children: _jsx(Tag, { color: data.replicar ? 'blue' : 'default', children: data.replicar ? 'Sí' : 'No' }) }), _jsx(Descriptions.Item, { label: "Sucursal R\u00E9plica", children: data.sucursalReplica?.codigo ? toTitleCase(data.sucursalReplica.nombre || '') || data.sucursalReplica.codigo : '-' }), _jsx(Descriptions.Item, { label: "Concepto R\u00E9plica", children: data.conceptoReplica && data.conceptoReplicaNombre
                                                    ? `${data.conceptoReplica}-${toTitleCase(data.conceptoReplicaNombre)}`
                                                    : data.conceptoReplica || '-' })] })),
                                },
                                {
                                    key: 'contabilidad',
                                    label: 'Contabilidad',
                                    children: (_jsxs(Descriptions, { bordered: true, size: "small", column: isLarge ? 2 : 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "No genera asientos", children: _jsx(Tag, { color: data.noAsientos ? 'orange' : 'default', children: data.noAsientos ? 'Sí' : 'No' }) }), _jsx(Descriptions.Item, { label: "Tipo Ingreso", children: TIPO_INGRESO_LABEL[data.tipoIngreso ?? 0] || 'Ninguno' }), _jsx(Descriptions.Item, { label: "Cuenta Contable", children: data.cuentaContable ? (_jsxs(Text, { style: { fontFamily: 'monospace' }, children: [data.cuentaContable.noCuenta, " - ", data.cuentaContable.nombre] })) : '-' }), _jsx(Descriptions.Item, { label: "Moneda", children: data.moneda?.codigo || '-' })] })),
                                },
                                {
                                    key: 'entidad',
                                    label: 'Entidad',
                                    children: (data.entidades && data.entidades.length > 0 ? (_jsx(Table, { dataSource: data.entidades, rowKey: "codigo", size: "small", pagination: false, columns: [
                                            { title: 'Código', dataIndex: 'codigo', width: 120 },
                                            { title: 'Nombre', dataIndex: 'nombre', render: (v) => toTitleCase(v) },
                                            { title: 'Tipo', dataIndex: 'tipo', width: 160, render: (v) => v ? _jsxs(Tag, { children: [v, tiposMap[v] ? ` - ${toTitleCase(tiposMap[v])}` : ''] }) : '-' },
                                        ] })) : (_jsx(Text, { type: "secondary", children: "Ninguna" }))),
                                },
                                {
                                    key: 'documentos',
                                    label: 'Documentos',
                                    children: (data.documentos && data.documentos.length > 0 ? (_jsx(Table, { dataSource: data.documentos, rowKey: "codigo", size: "small", pagination: false, columns: [
                                            { title: 'Código', dataIndex: 'codigo', width: 120 },
                                            { title: 'Nombre', dataIndex: 'nombre', render: (v) => toTitleCase(v) },
                                            { title: 'Tipo', dataIndex: 'tipo', width: 160, render: (v, record) => {
                                                    const docKey = record?.codigo ? `${record.codigo}-${v}` : v;
                                                    return v ? _jsxs(Tag, { color: "geekblue", children: [v, tiposDocMap[docKey] ? ` - ${toTitleCase(tiposDocMap[docKey])}` : tiposMap[v] ? ` - ${toTitleCase(tiposMap[v])}` : ''] }) : '-';
                                                } },
                                        ] })) : (_jsx(Text, { type: "secondary", children: "Ninguno" }))),
                                },
                            ] })] }), _jsx(Col, { xxl: 6, children: _jsx(Card, { className: "paces-card", size: "small", title: _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Configuraci\u00F3n" }), style: { marginBottom: 16 }, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Sin Impuesto" }), _jsx("br", {}), _jsx(Tag, { color: data.noImpuesto ? 'orange' : 'default', children: data.noImpuesto ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "No Actualiza Costos" }), _jsx("br", {}), _jsx(Tag, { color: data.noActualizaCostos ? 'orange' : 'default', children: data.noActualizaCostos ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "No genera asientos" }), _jsx("br", {}), _jsx(Tag, { color: data.noAsientos ? 'orange' : 'default', children: data.noAsientos ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Replicar" }), _jsx("br", {}), _jsx(Tag, { color: data.replicar ? 'blue' : 'default', children: data.replicar ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Activo" }), _jsx("br", {}), _jsx(Tag, { color: data.activo ? 'green' : 'default', children: data.activo ? 'Activo' : 'Inactivo' })] })] }) }) })] })) : (_jsxs("div", { children: [_jsxs(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsx(Tag, { color: data.activo ? 'green' : 'default', children: data.activo ? 'Activo' : 'Inactivo' })] }), style: { marginBottom: 16 }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }, children: [_jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "C\u00F3digo" }), _jsx("br", {}), _jsx(Text, { style: { fontFamily: 'monospace', fontSize: 20, fontWeight: 700 }, children: data.codigo })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "Nombre" }), _jsx("br", {}), _jsx(Text, { style: { fontSize: 15, fontWeight: 600 }, children: toTitleCase(data.nombre ?? '') })] })] }), _jsxs(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Doc. a Generar", children: data.docAGenerar || '-' }), _jsx(Descriptions.Item, { label: "Almac\u00E9n", children: data.almacen?.codigo ? `${data.almacen.codigo} - ${toTitleCase(data.almacen.nombre || '')}` : '-' }), _jsx(Descriptions.Item, { label: "Sucursal Destino", children: data.sucursalDestino?.codigo ? toTitleCase(data.sucursalDestino.nombre || '') || data.sucursalDestino.codigo : '-' }), _jsx(Descriptions.Item, { label: "Concepto Destino", children: data.conceptoDestino && data.conceptoDestinoNombre
                                        ? `${data.conceptoDestino}-${toTitleCase(data.conceptoDestinoNombre)}`
                                        : data.conceptoDestino || '-' })] })] }), _jsx(Tabs, { type: "card", items: [
                        {
                            key: 'inventario',
                            label: 'Inventario',
                            children: (_jsxs(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Sin Impuesto", children: _jsx(Tag, { color: data.noImpuesto ? 'orange' : 'default', children: data.noImpuesto ? 'Sí' : 'No' }) }), _jsx(Descriptions.Item, { label: "No Actualiza Costos", children: _jsx(Tag, { color: data.noActualizaCostos ? 'orange' : 'default', children: data.noActualizaCostos ? 'Sí' : 'No' }) }), _jsx(Descriptions.Item, { label: "Almac\u00E9n", children: data.almacen?.codigo ? `${data.almacen.codigo} - ${toTitleCase(data.almacen.nombre || '')}` : '-' }), _jsx(Descriptions.Item, { label: "Sucursal Destino", children: data.sucursalDestino?.codigo ? toTitleCase(data.sucursalDestino.nombre || '') || data.sucursalDestino.codigo : '-' }), _jsx(Descriptions.Item, { label: "Concepto Destino", children: data.conceptoDestino && data.conceptoDestinoNombre
                                            ? `${data.conceptoDestino}-${toTitleCase(data.conceptoDestinoNombre)}`
                                            : data.conceptoDestino || '-' }), _jsx(Descriptions.Item, { label: "Replicar", children: _jsx(Tag, { color: data.replicar ? 'blue' : 'default', children: data.replicar ? 'Sí' : 'No' }) }), _jsx(Descriptions.Item, { label: "Sucursal R\u00E9plica", children: data.sucursalReplica?.codigo ? toTitleCase(data.sucursalReplica.nombre || '') || data.sucursalReplica.codigo : '-' }), _jsx(Descriptions.Item, { label: "Concepto R\u00E9plica", children: data.conceptoReplica && data.conceptoReplicaNombre
                                            ? `${data.conceptoReplica}-${toTitleCase(data.conceptoReplicaNombre)}`
                                            : data.conceptoReplica || '-' })] })),
                        },
                        {
                            key: 'contabilidad',
                            label: 'Contabilidad',
                            children: (_jsxs(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "No genera asientos", children: _jsx(Tag, { color: data.noAsientos ? 'orange' : 'default', children: data.noAsientos ? 'Sí' : 'No' }) }), _jsx(Descriptions.Item, { label: "Tipo Ingreso", children: TIPO_INGRESO_LABEL[data.tipoIngreso ?? 0] || 'Ninguno' }), _jsx(Descriptions.Item, { label: "Cuenta Contable", children: data.cuentaContable ? (_jsxs(Text, { style: { fontFamily: 'monospace' }, children: [data.cuentaContable.noCuenta, " - ", data.cuentaContable.nombre] })) : '-' }), _jsx(Descriptions.Item, { label: "Moneda", children: data.moneda?.codigo || '-' })] })),
                        },
                        {
                            key: 'entidad',
                            label: 'Entidad',
                            children: (data.entidades && data.entidades.length > 0 ? (_jsx(Table, { dataSource: data.entidades, rowKey: "codigo", size: "small", pagination: false, columns: [
                                    { title: 'Código', dataIndex: 'codigo', width: 120 },
                                    { title: 'Nombre', dataIndex: 'nombre', render: (v) => toTitleCase(v) },
                                    { title: 'Tipo', dataIndex: 'tipo', width: 160, render: (v) => v ? _jsxs(Tag, { children: [v, tiposMap[v] ? ` - ${toTitleCase(tiposMap[v])}` : ''] }) : '-' },
                                ] })) : (_jsx(Text, { type: "secondary", children: "Ninguna" }))),
                        },
                        {
                            key: 'documentos',
                            label: 'Documentos',
                            children: (data.documentos && data.documentos.length > 0 ? (_jsx(Table, { dataSource: data.documentos, rowKey: "codigo", size: "small", pagination: false, columns: [
                                    { title: 'Código', dataIndex: 'codigo', width: 120 },
                                    { title: 'Nombre', dataIndex: 'nombre', render: (v) => toTitleCase(v) },
                                    { title: 'Tipo', dataIndex: 'tipo', width: 160, render: (v, record) => {
                                            const docKey = record?.codigo ? `${record.codigo}-${v}` : v;
                                            return v ? _jsxs(Tag, { color: "geekblue", children: [v, tiposDocMap[docKey] ? ` - ${toTitleCase(tiposDocMap[docKey])}` : tiposMap[v] ? ` - ${toTitleCase(tiposMap[v])}` : ''] }) : '-';
                                        } },
                                ] })) : (_jsx(Text, { type: "secondary", children: "Ninguno" }))),
                        },
                    ] }), _jsx("div", { style: { marginTop: 24 }, children: _jsx(Card, { className: "paces-card", size: "small", title: _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Configuraci\u00F3n" }), children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Sin Impuesto" }), _jsx("br", {}), _jsx(Tag, { color: data.noImpuesto ? 'orange' : 'default', children: data.noImpuesto ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "No Actualiza Costos" }), _jsx("br", {}), _jsx(Tag, { color: data.noActualizaCostos ? 'orange' : 'default', children: data.noActualizaCostos ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "No genera asientos" }), _jsx("br", {}), _jsx(Tag, { color: data.noAsientos ? 'orange' : 'default', children: data.noAsientos ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Replicar" }), _jsx("br", {}), _jsx(Tag, { color: data.replicar ? 'blue' : 'default', children: data.replicar ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Activo" }), _jsx("br", {}), _jsx(Tag, { color: data.activo ? 'green' : 'default', children: data.activo ? 'Activo' : 'Inactivo' })] })] }) }) })] })) }));
};
export default ConceptoDetalle;
