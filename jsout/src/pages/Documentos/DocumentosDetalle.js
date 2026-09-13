import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Row, Col, Grid, Typography, Descriptions } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { documentosApi } from '../../api/documentosApi';
import { toTitleCase } from '../../utils/formats';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
const { Text } = Typography;
const METODO_POSTEO_LABEL = {
    0: 'Manual',
    1: 'Al Grabar',
    2: 'Al Imprimir',
    3: 'Al Aplicar',
};
const METODO_APLICAR_LABEL = {
    0: 'Manual',
    1: 'Al Grabar',
    2: 'Al Imprimir',
};
const FECHA_PERMITIDA_LABEL = {
    0: 'Fecha Actual',
    1: 'Cualquier Fecha',
    2: 'Período Abierto',
};
const TIPO_NUMERACION_LABEL = {
    0: 'Manual',
    1: 'Automática',
};
const TIPO_IMPUESTO_LABEL = {
    0: 'Ninguno',
    1: 'ITBIS',
    2: 'ISC',
};
const DocumentosDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const screens = Grid.useBreakpoint();
    const isLarge = screens.xxl === true;
    const cargarDocumento = useCallback(() => {
        if (!id)
            return;
        setLoading(true);
        setLoadingError(false);
        documentosApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((doc) => {
            setData(doc);
            if (doc)
                setPageTitleOverride(doc.codigo);
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride]);
    useEffect(() => {
        setActiveModule('MDocumento');
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    useEffect(() => {
        if (!id)
            return;
        cargarDocumento();
    }, [id, cargarDocumento]);
    const renderConfigSidebar = () => (_jsx(Card, { className: "paces-card", size: "small", title: _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Configuraci\u00F3n" }), style: { marginBottom: 16 }, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "M\u00E9todo Aplicar" }), _jsx("br", {}), _jsx(Tag, { color: "blue", children: METODO_APLICAR_LABEL[data.metodoAplicar ?? 0] || '-' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Recibe Pagos" }), _jsx("br", {}), _jsx(Tag, { color: data.recibePagos ? 'green' : 'default', children: data.recibePagos ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Puede Reimprimir" }), _jsx("br", {}), _jsx(Tag, { color: data.puedeReimprimir ? 'blue' : 'default', children: data.puedeReimprimir ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Documento Contable" }), _jsx("br", {}), _jsx(Tag, { color: data.documentoContable ? 'geekblue' : 'default', children: data.documentoContable ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Incluir Estados Cuenta" }), _jsx("br", {}), _jsx(Tag, { color: data.incluirEstadoCuenta ? 'green' : 'default', children: data.incluirEstadoCuenta ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Precios Incluyen Impuestos" }), _jsx("br", {}), _jsx(Tag, { color: data.preciosIncluyenImpuestos ? 'green' : 'default', children: data.preciosIncluyenImpuestos ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Afecta Inventario" }), _jsx("br", {}), _jsx(Tag, { color: data.afectaInventario ? 'green' : 'default', children: data.afectaInventario ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Requiere Asiento" }), _jsx("br", {}), _jsx(Tag, { color: data.requiereAsiento ? 'green' : 'default', children: data.requiereAsiento ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Modifica Precio" }), _jsx("br", {}), _jsx(Tag, { color: data.modificaPrecio ? 'blue' : 'default', children: data.modificaPrecio ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Modifica Descripci\u00F3n" }), _jsx("br", {}), _jsx(Tag, { color: data.modificaDescripcion ? 'blue' : 'default', children: data.modificaDescripcion ? 'Sí' : 'No' })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Trabajar en Unidad" }), _jsx("br", {}), _jsx(Tag, { color: data.trabajarEnUnidad ? 'green' : 'default', children: data.trabajarEnUnidad ? 'Sí' : 'No' })] })] }) }));
    const renderDatosGenerales = (columnCount) => (_jsxs(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), data.tipo && _jsx(Tag, { color: "geekblue", children: data.tipo })] }), style: { marginBottom: 16 }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }, children: [_jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "C\u00F3digo" }), _jsx("br", {}), _jsx(Text, { style: { fontFamily: 'monospace', fontSize: 20, fontWeight: 700 }, children: data.codigo })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "Nombre" }), _jsx("br", {}), _jsx(Text, { style: { fontSize: 15, fontWeight: 600 }, children: toTitleCase(data.nombre ?? '') })] })] }), _jsxs(Descriptions, { bordered: true, size: "small", column: columnCount, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Tipo", children: data.tipo || '-' }), _jsx(Descriptions.Item, { label: "Longitud C\u00F3digo", children: data.longitudCodigo ?? '-' }), _jsx(Descriptions.Item, { label: "Documento Reverso", children: data.documentoReverso || '-' }), _jsx(Descriptions.Item, { label: "M\u00E9todo Posteo", children: METODO_POSTEO_LABEL[data.metodoPosteo ?? 0] || data.metodoPosteo?.toString() || '-' }), _jsx(Descriptions.Item, { label: "Fecha Permitida", children: FECHA_PERMITIDA_LABEL[data.fechaPermitida ?? 0] || data.fechaPermitida?.toString() || '-' }), _jsx(Descriptions.Item, { label: "Tipo Impuesto", children: TIPO_IMPUESTO_LABEL[data.tipoImpuesto ?? 0] || data.tipoImpuesto?.toString() || '-' }), _jsx(Descriptions.Item, { label: "Origen Cuenta", children: data.origenCuenta ?? '-' }), _jsx(Descriptions.Item, { label: "ID Externo", children: data.idExterno || '-' }), _jsx(Descriptions.Item, { label: "Tipo Numeraci\u00F3n", children: TIPO_NUMERACION_LABEL[data.tipoNumeracion ?? 0] || '-' })] })] }));
    return (_jsx(DetalleCatalogoLayout, { rutaVolver: "/MDocumento", loading: loading, mensajeLoading: "Cargando documento...", loadingError: loadingError, mensajeError: "Error al cargar detalle del documento", onRecargar: cargarDocumento, dataDisponible: !!data, onEditar: () => navigate(`/MDocumento/${id}/editar`), children: data && (isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsx(Col, { xxl: 18, children: renderDatosGenerales(2) }), _jsx(Col, { xxl: 6, children: renderConfigSidebar() })] })) : (_jsxs("div", { children: [renderDatosGenerales(1), _jsx("div", { style: { marginTop: 24 }, children: renderConfigSidebar() })] }))) }));
};
export default DocumentosDetalle;
