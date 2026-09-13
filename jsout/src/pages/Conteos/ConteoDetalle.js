import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Tag, Descriptions, Typography, Empty, } from 'antd';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { conteoApi } from '../../api/conteoApi';
import { formatCurrency, formatDate, toTitleCase, formatNumber } from '../../utils/formats';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import SucursalDocumentoSelector from '../../components/SucursalDocumentoSelector';
const ConteoDetalle = () => {
    const { documento } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingError, setLoadingError] = useState(false);
    const [sucursalDestino, setSucursalDestino] = useState(undefined);
    const cargar = useCallback(async () => {
        if (!documento)
            return;
        setLoading(true);
        setLoadingError(false);
        try {
            const result = await conteoApi.obtenerPorDocumento(sucursalActiva, documento);
            setData(result);
            setPageTitleOverride(result.documento);
        }
        catch {
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [documento, sucursalActiva, setPageTitleOverride]);
    useEffect(() => {
        setActiveModule('FConteos');
        cargar();
        return () => setPageTitleOverride('');
    }, [cargar, setActiveModule, setPageTitleOverride]);
    if (!data)
        return null;
    return (_jsxs(DetalleCatalogoLayout, { rutaVolver: "/FConteos", loading: loading, mensajeLoading: "Cargando conteo...", loadingError: loadingError, mensajeError: "Error al cargar detalle del conteo", onRecargar: cargar, dataDisponible: !!data, onEditar: () => navigate(`/FConteos/editar/${documento}`), extraLeft: _jsx(SucursalDocumentoSelector, { value: sucursalDestino, onChange: setSucursalDestino }), extraActions: _jsx(Tag, { color: data.bloqueado ? 'red' : 'green', children: data.bloqueado ? 'Bloqueado' : 'Activo' }), children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 2, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Documento", children: data.documento }), _jsx(Descriptions.Item, { label: "Fecha", children: formatDate(data.fecha) }), _jsx(Descriptions.Item, { label: "Almac\u00E9n", children: toTitleCase(data.almacen) }), _jsx(Descriptions.Item, { label: "Usuario", children: toTitleCase(data.usuario) || '-' }), _jsx(Descriptions.Item, { label: "Suplidor", children: data.nombreSuplidor ? toTitleCase(data.nombreSuplidor) : data.codigoSuplidor || '-' }), _jsx(Descriptions.Item, { label: "Concepto", children: data.concepto || '-' }), _jsx(Descriptions.Item, { label: "Tipo", children: "\u2014" }), _jsx(Descriptions.Item, { label: "Cantidad", children: data.cantidad.toLocaleString('es-DO') }), _jsx(Descriptions.Item, { label: "Costo", children: formatCurrency(data.costo) }), _jsx(Descriptions.Item, { label: "Modo", children: data.modo === 0 ? 'Manual' : data.modo === 1 ? 'Automático' : String(data.modo) }), _jsx(Descriptions.Item, { label: "Per\u00EDodo", children: data.periodo }), _jsx(Descriptions.Item, { label: "Nota", span: 2, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: data.nota || '-' }) })] }) }), _jsx(Card, { className: "paces-card", size: "small", title: _jsxs("span", { style: { fontSize: 16, fontWeight: 600 }, children: ["Detalles (", data.detalles?.length || 0, ")"] }), children: data.detalles?.length > 0 ? (_jsxs(Table, { dataSource: data.detalles, rowKey: "codigo", size: "small", pagination: false, scroll: { x: 600 }, children: [_jsx(Table.Column, { title: "C\u00F3digo", dataIndex: "codigo", width: 100 }), _jsx(Table.Column, { title: "Art\u00EDculo", dataIndex: "articulo", ellipsis: true, render: (v) => toTitleCase(v || '') }), _jsx(Table.Column, { title: "Cantidad", dataIndex: "cantidad", align: "right", width: 100, render: (v) => v.toLocaleString('es-DO') }), _jsx(Table.Column, { title: "Factor", dataIndex: "factor", align: "right", width: 80, render: (v) => formatNumber(v || 1) }), _jsx(Table.Column, { title: "Costo", dataIndex: "ultimoCosto", align: "right", width: 120, render: (v) => formatCurrency(v || 0) }), _jsx(Table.Column, { title: "Medida", dataIndex: ['medida', 'nombre'], width: 100, render: (v) => v || '-' }), _jsx(Table.Column, { title: "Familia", dataIndex: ['familia', 'nombre'], ellipsis: true, render: (v) => (v ? toTitleCase(v) : '-') }), _jsx(Table.Column, { title: "Referencia", dataIndex: "referencia", ellipsis: true, render: (v) => v || '-' })] })) : (_jsx(Empty, { description: "Sin detalles" })) })] }));
};
export default ConteoDetalle;
