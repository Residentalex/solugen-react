import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tabs, Tag, Row, Col, Typography, message, } from 'antd';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { productoApi } from '../../api/productoApi';
import ErrorBoundary from '../../components/ErrorBoundary';
import { formatCurrency } from '../../utils/formats';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
const { Text } = Typography;
const TIPO_IMPUESTO_MAP = {
    0: 'Exento',
    1: 'Gravado',
    2: 'No Gravado',
};
const AMBITO_IMPUESTO_MAP = {
    0: 'Venta',
    1: 'Compra',
    2: 'Ambos',
};
function formatNumber(n) {
    return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function toTitleCase(str) {
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
const ProductoDetalle = () => {
    const { codigo } = useParams();
    const navigate = useNavigate();
    const sucursalProductos = useCompanyStore((s) => s.data.sucursalProductos);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    useEffect(() => {
        setActiveModule('MProducto');
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    useEffect(() => {
        if (!codigo)
            return;
        const abortController = new AbortController();
        setLoading(true);
        productoApi.obtenerDetalle(sucursalProductos, codigo, abortController.signal)
            .then((res) => {
            if (abortController.signal.aborted)
                return;
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            setPageTitleOverride(res.nombre || codigo);
        })
            .catch((err) => {
            if (err?.name === 'CanceledError' || abortController.signal.aborted)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al cargar el producto');
            setLoadingError(true);
        })
            .finally(() => {
            if (!abortController.signal.aborted)
                setLoading(false);
        });
        return () => abortController.abort();
    }, [codigo, sucursalProductos, setPageTitleOverride]);
    const handleRefresh = () => {
        if (!codigo)
            return;
        setLoadingError(false);
        setLoading(true);
        const abortController = new AbortController();
        productoApi.obtenerDetalle(sucursalProductos, codigo, abortController.signal)
            .then((res) => {
            if (abortController.signal.aborted)
                return;
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            setPageTitleOverride(res.nombre || codigo);
        })
            .catch((err) => {
            if (err?.name === 'CanceledError' || abortController.signal.aborted)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al recargar');
            setLoadingError(true);
        })
            .finally(() => {
            if (!abortController.signal.aborted)
                setLoading(false);
        });
    };
    if (!data)
        return null;
    const impuestoColumns = [
        { title: 'Nombre', key: 'nombre', render: (_, r) => r.impuesto?.nombre ? toTitleCase(r.impuesto.nombre) : '-' },
        { title: 'Porcentaje (%)', key: 'porcentaje', width: 130, align: 'right', render: (_, r) => r.impuesto?.porcentaje !== undefined && r.impuesto?.porcentaje !== null ? formatNumber(r.impuesto.porcentaje) : '-' },
        { title: 'Tipo', key: 'tipo', width: 120, render: (_, r) => r.impuesto?.tipo !== undefined && r.impuesto?.tipo !== null ? (TIPO_IMPUESTO_MAP[r.impuesto.tipo] || `Tipo ${r.impuesto.tipo}`) : '-' },
        { title: 'Ámbito', key: 'ambito', width: 100, render: (_, r) => r.impuesto?.ambito !== undefined && r.impuesto?.ambito !== null ? (AMBITO_IMPUESTO_MAP[r.impuesto.ambito] || `Ámbito ${r.impuesto.ambito}`) : '-' },
    ];
    const renderBoolTag = (valor) => {
        if (valor)
            return _jsx(Tag, { color: "green", children: "S\u00ED" });
        return _jsx(Tag, { children: "No" });
    };
    const tabItems = [
        {
            key: 'impuestos',
            label: `Impuestos (${data.impuestos?.length || 0})`,
            children: data.impuestos && data.impuestos.length > 0 ? (_jsx(Table, { dataSource: data.impuestos, columns: impuestoColumns, rowKey: (_, idx) => String(idx), size: "small", pagination: false, scroll: { x: 500 } })) : (_jsx("div", { style: { padding: 24, textAlign: 'center' }, className: "paces-text-secondary", children: _jsx(Text, { type: "secondary", children: "Sin impuestos configurados" }) })),
        },
        {
            key: 'movimientos',
            label: 'Movimientos',
            children: (_jsx("div", { style: { padding: 24, textAlign: 'center' }, className: "paces-text-secondary", children: _jsx(Text, { type: "secondary", children: "Movimientos del producto (pr\u00F3ximamente)" }) })),
        },
        {
            key: 'ofertas',
            label: 'Ofertas',
            children: (_jsx("div", { style: { padding: 24, textAlign: 'center' }, className: "paces-text-secondary", children: _jsx(Text, { type: "secondary", children: "Ofertas del producto (pr\u00F3ximamente)" }) })),
        },
        {
            key: 'componentes',
            label: 'Componentes/Ingredientes',
            children: (_jsx("div", { style: { padding: 24, textAlign: 'center' }, className: "paces-text-secondary", children: _jsx(Text, { type: "secondary", children: "Componentes e ingredientes del producto (pr\u00F3ximamente)" }) })),
        },
        {
            key: 'variacionCostos',
            label: 'Variación Costos',
            children: (_jsx("div", { style: { padding: 24, textAlign: 'center' }, className: "paces-text-secondary", children: _jsx(Text, { type: "secondary", children: "Variaci\u00F3n de costos del producto (pr\u00F3ximamente)" }) })),
        },
        {
            key: 'variacionPrecios',
            label: 'Variación Precios',
            children: (_jsx("div", { style: { padding: 24, textAlign: 'center' }, className: "paces-text-secondary", children: _jsx(Text, { type: "secondary", children: "Variaci\u00F3n de precios del producto (pr\u00F3ximamente)" }) })),
        },
    ];
    return (_jsx(DetalleCatalogoLayout, { rutaVolver: "/MProducto", loading: loading, mensajeLoading: "Cargando producto...", loadingError: loadingError, mensajeError: "Error al cargar detalle de producto", onRecargar: handleRefresh, dataDisponible: !!data, onEditar: () => navigate(`/MProducto/${codigo}/editar`), children: _jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xs: 24, lg: 8, children: [_jsx(Card, { title: "Datos Generales", className: "paces-card", style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 1, children: [_jsx(Descriptions.Item, { label: "C\u00F3digo", children: _jsx(Text, { style: { fontFamily: 'monospace' }, children: data.codigo }) }), _jsx(Descriptions.Item, { label: "Nombre", children: data.nombre ? toTitleCase(data.nombre) : '-' }), _jsx(Descriptions.Item, { label: "Referencia Interna", children: data.referenciaInterna || '-' }), _jsx(Descriptions.Item, { label: "UPC", children: data.upc || '-' }), _jsx(Descriptions.Item, { label: "Categor\u00EDa", children: data.categoria?.nombre ? toTitleCase(data.categoria.nombre) : '-' }), _jsx(Descriptions.Item, { label: "Familia", children: data.familia?.nombre ? toTitleCase(data.familia.nombre) : '-' }), _jsx(Descriptions.Item, { label: "C\u00F3digo Control", children: data.datosExtra?.codigoControl || '-' }), _jsx(Descriptions.Item, { label: "\u00DAltimo Costo", children: formatCurrency(data.ultimoCosto) }), _jsx(Descriptions.Item, { label: "Precio", children: formatCurrency(data.precio) }), _jsx(Descriptions.Item, { label: "Nota", children: data.nota || '-' }), _jsx(Descriptions.Item, { label: "Fecha Creaci\u00F3n", children: data.fechaCreacion ? formatDate(data.fechaCreacion) : '-' })] }) }), _jsx(Card, { title: "Configuraci\u00F3n", className: "paces-card", style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 1, children: [_jsx(Descriptions.Item, { label: "Para Vender", children: renderBoolTag(data.paraVender) }), _jsx(Descriptions.Item, { label: "Para Comprar", children: renderBoolTag(data.paraComprar) }), _jsx(Descriptions.Item, { label: "Pesado", children: renderBoolTag(data.pesado) }), _jsx(Descriptions.Item, { label: "Requiere Fecha Venc.", children: renderBoolTag(data.requiereFechaVenc) }), _jsx(Descriptions.Item, { label: "D\u00EDas Vencimiento", children: data.diasVencimiento ?? '-' }), _jsx(Descriptions.Item, { label: "Margen Beneficio (%)", children: data.datosExtra?.margenBeneficio !== undefined && data.datosExtra?.margenBeneficio !== null
                                            ? `${formatNumber(data.datosExtra.margenBeneficio)}%`
                                            : '-' }), _jsx(Descriptions.Item, { label: "Garant\u00EDa (d\u00EDas)", children: data.datosExtra?.garantia !== undefined && data.datosExtra?.garantia !== null
                                            ? data.datosExtra.garantia
                                            : '-' }), _jsx(Descriptions.Item, { label: "Es Comod\u00EDn", children: renderBoolTag(data.datosExtra?.esComodin) }), _jsx(Descriptions.Item, { label: "Activo", children: _jsx(Tag, { color: data.activo ? 'green' : 'default', children: data.activo ? 'Activo' : 'Inactivo' }) })] }) })] }), _jsx(Col, { xs: 24, lg: 16, children: _jsx(Card, { className: "paces-card", children: _jsx(Tabs, { defaultActiveKey: "impuestos", type: "card", items: tabItems }) }) })] }) }));
};
const ProductoDetalleWithBoundary = () => (_jsx(ErrorBoundary, { children: _jsx(ProductoDetalle, {}) }));
export default ProductoDetalleWithBoundary;
