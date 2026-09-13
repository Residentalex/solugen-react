import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Typography, Spin, Descriptions, Empty, Button, Space, Input, } from 'antd';
import { ArrowLeftOutlined, SearchOutlined, CalendarOutlined, NumberOutlined, DollarOutlined, ReloadOutlined, } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { cierreInventarioApi } from '../../api/cierreInventarioApi';
import { formatCurrency } from '../../utils/formats';
import SucursalDocumentoSelector from '../../components/SucursalDocumentoSelector';
const { Text, Title } = Typography;
// ===== Helpers =====
function formatDateDisplay(dateStr) {
    if (!dateStr)
        return '—';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime()))
            return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
    catch {
        return dateStr;
    }
}
function formatNumber(val) {
    if (val == null)
        return '—';
    return val.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
const CierreDetalle = () => {
    const { cierreId } = useParams();
    const navigate = useNavigate();
    const sucursal = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const [loading, setLoading] = useState(false);
    const [detalle, setDetalle] = useState([]);
    const [error, setError] = useState(null);
    const [cierreInfo, setCierreInfo] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [sucursalDestino, setSucursalDestino] = useState(undefined);
    const cargarDetalle = async () => {
        if (!cierreId)
            return;
        setLoading(true);
        setError(null);
        try {
            const id = parseInt(cierreId, 10);
            if (isNaN(id)) {
                setError('ID de cierre inválido');
                return;
            }
            const data = await cierreInventarioApi.obtenerDetalleCierre(sucursal, id);
            if (!data) {
                setError('Documento no encontrado en la sucursal seleccionada.');
                return;
            }
            setDetalle(data);
            // Intentar obtener info del cierre del primer elemento o de una llamada separada
            // Si el detalle incluye info del encabezado, la usamos
            if (data.length > 0 && data[0].fechaCierre) {
                setCierreInfo(data[0]);
            }
            else {
                // Si no, cargamos los cierres para obtener metadata
                try {
                    const cierres = await cierreInventarioApi.obtenerCierres(sucursal);
                    const found = cierres.find((c) => c.cierreId === id);
                    if (found)
                        setCierreInfo(found);
                }
                catch {
                    // Silencioso, no crítico
                }
            }
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || err?.message || 'Error al cargar detalle del cierre';
            setError(msg);
        }
        finally {
            setLoading(false);
        }
    };
    const handleSearch = (value) => {
        setSearchText(value);
    };
    const handleRefresh = () => {
        setSearchText('');
        cargarDetalle();
    };
    const filteredDetalle = searchText
        ? detalle.filter((item) => {
            const cod = (item.codpro || '').toLowerCase();
            const desc = (item.descripcion || '').toLowerCase();
            const search = searchText.toLowerCase();
            return cod.includes(search) || desc.includes(search);
        })
        : detalle;
    useEffect(() => {
        setActiveModule('OCierreINV');
        setPageTitleOverride('Detalle del Cierre de Inventario');
        cargarDetalle();
        return () => {
            resetToolbar();
            setPageTitleOverride('');
        };
    }, [cierreId, sucursal, setActiveModule, setPageTitleOverride, resetToolbar]);
    const columns = [
        {
            title: 'Código',
            dataIndex: 'codpro',
            key: 'codpro',
            width: 100,
            render: (val) => _jsx(Text, { style: { fontSize: 12 }, children: val || '—' }),
        },
        {
            title: 'Descripción',
            dataIndex: 'descripcion',
            key: 'descripcion',
            render: (val) => _jsx(Text, { style: { fontSize: 12 }, children: val || '—' }),
        },
        {
            title: 'Familia',
            dataIndex: 'familiaNombre',
            key: 'familiaNombre',
            width: 120,
            render: (val) => (_jsx(Text, { style: { fontSize: 12 }, children: val || '—' })),
        },
        {
            title: 'Cantidad',
            dataIndex: 'cantidad',
            key: 'cantidad',
            width: 120,
            align: 'right',
            render: (val) => (_jsx(Text, { style: { fontSize: 12 }, children: formatNumber(val) })),
        },
        {
            title: 'Costo',
            dataIndex: 'costo',
            key: 'costo',
            width: 140,
            align: 'right',
            render: (val) => (_jsx(Text, { style: { fontSize: 12 }, children: formatCurrency(val ?? 0) })),
        },
    ];
    return (_jsxs("div", { children: [_jsx("div", { style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24,
                    flexWrap: 'wrap',
                    gap: 8,
                }, children: _jsxs(Space, { children: [_jsx(SucursalDocumentoSelector, { value: sucursalDestino, onChange: setSucursalDestino }), _jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate('/OCierreINV'), children: "Volver" }), _jsxs(Title, { level: 5, style: { margin: 0 }, children: ["Detalle del Cierre #", cierreId] })] }) }), _jsxs(Spin, { spinning: loading, children: [cierreInfo && (_jsx(Card, { className: "paces-card", size: "small", style: { marginBottom: 16, borderRadius: 8 }, children: _jsxs(Descriptions, { size: "small", column: { xs: 1, sm: 2, md: 4 }, colon: false, children: [_jsx(Descriptions.Item, { label: _jsxs(Space, { size: 4, children: [_jsx(CalendarOutlined, { style: { color: '#556ee6', fontSize: 13 } }), _jsx("span", { style: { fontSize: 12 }, children: "Cierre" })] }), children: _jsx(Text, { strong: true, style: { fontSize: 13 }, children: formatDateDisplay(cierreInfo.fechaCierre) }) }), _jsx(Descriptions.Item, { label: _jsxs(Space, { size: 4, children: [_jsx(CalendarOutlined, { style: { color: '#34c38f', fontSize: 13 } }), _jsx("span", { style: { fontSize: 12 }, children: "Realizado" })] }), children: _jsx(Text, { strong: true, style: { fontSize: 13 }, children: formatDateDisplay(cierreInfo.fechaRealizado) }) }), _jsx(Descriptions.Item, { label: _jsxs(Space, { size: 4, children: [_jsx(NumberOutlined, { style: { color: '#f1b44c', fontSize: 13 } }), _jsx("span", { style: { fontSize: 12 }, children: "Cantidad" })] }), children: _jsx(Text, { strong: true, style: { fontSize: 13 }, children: formatNumber(cierreInfo.cantidad) }) }), _jsx(Descriptions.Item, { label: _jsxs(Space, { size: 4, children: [_jsx(DollarOutlined, { style: { color: '#34c38f', fontSize: 13 } }), _jsx("span", { style: { fontSize: 12 }, children: "Total" })] }), children: _jsx(Text, { strong: true, style: { fontSize: 13, color: '#34c38f' }, children: formatCurrency(cierreInfo.total ?? 0) }) }), _jsx(Descriptions.Item, { label: _jsx("span", { style: { fontSize: 12 }, children: "Tipo" }), children: "\u2014" })] }) })), _jsxs(Card, { className: "paces-card", size: "small", title: _jsxs("span", { style: { fontSize: 13, fontWeight: 600 }, children: ["Productos ", searchText ? `(${filteredDetalle.length} de ${detalle.length})` : `(${detalle.length})`] }), style: { borderRadius: 8 }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx(Input.Search, { placeholder: "Buscar por c\u00F3digo o descripci\u00F3n...", allowClear: true, onSearch: handleSearch, style: { width: 320 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx("div", { style: { flex: 1 } }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: handleRefresh })] }) }), error ? (_jsx("div", { style: { textAlign: 'center', padding: '24px 0' }, children: _jsx(Text, { type: "danger", style: { fontSize: 13 }, children: error }) })) : filteredDetalle.length === 0 && !loading ? (_jsx(Empty, { description: "No se encontraron productos en este cierre", image: Empty.PRESENTED_IMAGE_SIMPLE })) : (_jsx(Table, { dataSource: filteredDetalle, rowKey: (_, index) => index?.toString() ?? '0', columns: columns, pagination: false, size: "small", style: { borderRadius: 6 }, scroll: { y: 480 } }))] })] })] }));
};
export default CierreDetalle;
