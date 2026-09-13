import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, Table, Input, Button, DatePicker, Row, Col, Modal, Space, message, Alert, Empty, Tag, } from 'antd';
import { ThunderboltOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { movimientoApi } from '../../api/movimientoApi';
import { conteoApi } from '../../api/conteoApi';
import dayjs, { Dayjs } from 'dayjs';
// ---------------------------------------------------------------------------
// Helpers de formato
// ---------------------------------------------------------------------------
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
    return d.toLocaleDateString('es-DO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}
function formatNumber(n) {
    return new Intl.NumberFormat('es-DO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n);
}
function calcularTiempo(ultimaVenta, ultimaCompra) {
    const fechas = [];
    if (ultimaVenta) {
        const d = new Date(ultimaVenta);
        if (!isNaN(d.getTime()))
            fechas.push(d);
    }
    if (ultimaCompra) {
        const d = new Date(ultimaCompra);
        if (!isNaN(d.getTime()))
            fechas.push(d);
    }
    if (fechas.length === 0)
        return '-';
    const masReciente = new Date(Math.max(...fechas.map(f => f.getTime())));
    const ahora = new Date();
    const diffMs = ahora.getTime() - masReciente.getTime();
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDias >= 1)
        return `${diffDias} día${diffDias !== 1 ? 's' : ''}`;
    if (diffHoras >= 1)
        return `${diffHoras} hora${diffHoras !== 1 ? 's' : ''}`;
    return 'Hoy';
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
const BuscarPlantillaModal = ({ open, onClose, onSelect, }) => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [resultados, setResultados] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const buscar = useCallback(async () => {
        setLoading(true);
        try {
            const res = await conteoApi.obtenerPlantillas(sucursalActiva);
            setResultados(res || []);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al buscar plantillas');
            message.error(msg);
            setResultados([]);
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva]);
    useEffect(() => {
        if (open) {
            setSearchText('');
            buscar();
        }
    }, [open, buscar]);
    const filtered = useMemo(() => {
        if (!searchText.trim())
            return resultados;
        const term = searchText.trim().toLowerCase();
        return resultados.filter((r) => r.codigo?.toLowerCase().includes(term));
    }, [resultados, searchText]);
    const columnas = [
        {
            title: 'Código',
            dataIndex: 'codigo',
            key: 'codigo',
            width: 150,
        },
        {
            title: 'Suplidor',
            dataIndex: 'suplidor',
            key: 'suplidor',
            ellipsis: true,
            render: (v) => toTitleCase(v || ''),
        },
    ];
    return (_jsxs(Modal, { title: "Buscar Plantilla", open: open, onCancel: onClose, footer: null, width: 700, destroyOnHidden: true, children: [_jsx(Input.Search, { placeholder: "Buscar por c\u00F3digo...", allowClear: true, value: searchText, onChange: (e) => setSearchText(e.target.value), onSearch: (value) => setSearchText(value), style: { marginBottom: 16 } }), _jsx(Table, { dataSource: filtered, columns: columnas, rowKey: "id", loading: loading, size: "small", locale: {
                    emptyText: _jsx("div", { style: { minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsx(Empty, { description: "No hay plantillas disponibles" }) }),
                }, pagination: { pageSize: 10, showSizeChanger: false }, scroll: { y: 400 }, onRow: (record) => ({
                    onClick: () => {
                        onSelect(record);
                        onClose();
                    },
                    style: { cursor: 'pointer' },
                }) })] }));
};
// ---------------------------------------------------------------------------
// Página principal: Movimiento por Plantilla
// ---------------------------------------------------------------------------
const MovimientoPorPlantilla = () => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    // Filtros
    const [plantillaCodigo, setPlantillaCodigo] = useState('');
    const [suplidorNombre, setSuplidorNombre] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    // Datos
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    // Fecha seleccionada
    const [fechaSeleccionada, setFechaSeleccionada] = useState(dayjs());
    // Búsqueda local en resultados
    const [searchText, setSearchText] = useState('');
    useEffect(() => {
        setActiveModule('RMOVPLAN');
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    useEffect(() => {
        if (plantillaCodigo) {
            setPageTitleOverride(`Movimiento por Plantilla #${plantillaCodigo}`);
        }
        else {
            setPageTitleOverride('');
        }
    }, [plantillaCodigo, setPageTitleOverride]);
    // Generar reporte
    const handleGenerar = useCallback(async () => {
        if (!plantillaCodigo) {
            message.warning('Debe seleccionar una plantilla primero');
            return;
        }
        setLoadingError(false);
        setLoading(true);
        try {
            const res = await movimientoApi.obtenerPorPlantilla(sucursalActiva, plantillaCodigo, fechaSeleccionada.format('YYYYMMDD') + '000000');
            // Agrupar los movimientos individuales en el formato que espera la tabla
            const agrupadoMap = new Map();
            res.forEach((item) => {
                const key = `${item.codigo}|${item.sucursal}`;
                if (!agrupadoMap.has(key)) {
                    agrupadoMap.set(key, {
                        codigo: item.codigo,
                        articulo: item.articulo || '',
                        sucursal: item.sucursal || '',
                        prefijo: '',
                        compras: 0,
                        ventas: 0,
                        transferencias: 0,
                        ultimaCompra: null,
                        ultimaVenta: null,
                        existencia: 0,
                        tiempo: '-',
                    });
                }
                const entry = agrupadoMap.get(key);
                const tipoDoc = (item.tipoDocumento || '').toUpperCase();
                if (tipoDoc === 'ENP') {
                    entry.compras += Math.abs(item.cantidad);
                    if (!entry.ultimaCompra || item.fecha > entry.ultimaCompra) {
                        entry.ultimaCompra = item.fecha;
                    }
                }
                else if (tipoDoc === 'SAP' || tipoDoc === 'TRP') {
                    entry.transferencias += Math.abs(item.cantidad);
                }
                else if (tipoDoc === 'PV' || tipoDoc === 'FAC') {
                    entry.ventas += Math.abs(item.cantidad);
                    if (!entry.ultimaVenta || item.fecha > entry.ultimaVenta) {
                        entry.ultimaVenta = item.fecha;
                    }
                }
                entry.existencia += item.cantidad;
            });
            // Calcular tiempo para cada grupo
            const dataAgrupada = Array.from(agrupadoMap.values());
            dataAgrupada.forEach((item) => {
                item.tiempo = calcularTiempo(item.ultimaVenta, item.ultimaCompra);
            });
            setData(dataAgrupada);
            if (!dataAgrupada || dataAgrupada.length === 0) {
                message.info('No se encontraron resultados para esta plantilla');
            }
        }
        catch (err) {
            setLoadingError(true);
            setData(null);
            const msg = extraerMensajeError(err, 'Error al cargar los datos');
            message.error(msg);
        }
        finally {
            setLoading(false);
        }
    }, [plantillaCodigo, sucursalActiva, fechaSeleccionada]);
    // Seleccionar plantilla desde el modal
    const handleSeleccionarPlantilla = useCallback(async (plantilla) => {
        setPlantillaCodigo(plantilla.codigo);
        try {
            const detalle = await conteoApi.obtenerPlantilla(sucursalActiva, plantilla.id);
            if (detalle?.suplidor) {
                setSuplidorNombre(detalle.suplidor);
            }
            else if (plantilla.suplidor) {
                setSuplidorNombre(plantilla.suplidor);
            }
        }
        catch {
            if (plantilla.suplidor) {
                setSuplidorNombre(plantilla.suplidor);
            }
        }
    }, [sucursalActiva]);
    // Datos a mostrar (tal cual vienen del API, con sucursal)
    const displayData = useMemo(() => data ?? [], [data]);
    // Datos filtrados por búsqueda local
    const filteredData = useMemo(() => {
        if (!data)
            return [];
        if (!searchText.trim())
            return data;
        const term = searchText.trim().toLowerCase();
        return data.filter((item) => (item.codigo || '').toLowerCase().includes(term) ||
            (item.articulo || '').toLowerCase().includes(term) ||
            (item.sucursal || '').toLowerCase().includes(term));
    }, [data, searchText]);
    // Columnas de la tabla
    const columns = useMemo(() => {
        const cols = [
            {
                title: 'Sucursal',
                dataIndex: 'sucursal',
                key: 'sucursal',
                width: 140,
                render: (v) => toTitleCase(v || ''),
            },
            {
                title: 'Código',
                key: 'codigo',
                width: 130,
                render: (_, record) => record.codigo,
            },
            {
                title: 'Artículo',
                dataIndex: 'articulo',
                key: 'articulo',
                ellipsis: true,
                render: (v) => toTitleCase(v || ''),
            },
            {
                title: 'Compras',
                dataIndex: 'compras',
                key: 'compras',
                width: 110,
                align: 'right',
                render: (v) => formatNumber(v || 0),
            },
            {
                title: 'Ventas',
                dataIndex: 'ventas',
                key: 'ventas',
                width: 110,
                align: 'right',
                render: (v) => formatNumber(v || 0),
            },
            {
                title: 'Transferencias',
                dataIndex: 'transferencias',
                key: 'transferencias',
                width: 120,
                align: 'right',
                render: (v) => formatNumber(v || 0),
            },
            {
                title: 'Última Compra',
                dataIndex: 'ultimaCompra',
                key: 'ultimaCompra',
                width: 120,
                render: (v) => formatDate(v),
            },
            {
                title: 'Última Venta',
                dataIndex: 'ultimaVenta',
                key: 'ultimaVenta',
                width: 120,
                render: (v) => formatDate(v),
            },
            {
                title: 'Tiempo',
                dataIndex: 'tiempo',
                key: 'tiempo',
                width: 100,
            },
            {
                title: 'Existencia',
                dataIndex: 'existencia',
                key: 'existencia',
                width: 110,
                align: 'right',
                render: (v) => formatNumber(v || 0),
            },
        ];
        return cols;
    }, []);
    return (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", style: { borderRadius: 8, marginBottom: 16 }, title: _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Filtros de consulta" }), children: _jsxs(Row, { gutter: [16, 0], align: "middle", children: [_jsxs(Col, { span: 7, children: [_jsx("div", { style: { fontSize: 14, marginBottom: 6 }, children: "Plantilla" }), _jsxs(Space.Compact, { style: { width: '100%' }, children: [_jsx(Input, { disabled: true, value: plantillaCodigo, placeholder: "Seleccione una plantilla" }), _jsx(Button, { icon: _jsx(SearchOutlined, {}), onClick: () => setModalVisible(true), title: "Buscar plantilla" })] })] }), _jsxs(Col, { span: 7, children: [_jsx("div", { style: { fontSize: 14, marginBottom: 6 }, children: "Suplidor" }), _jsx(Input, { disabled: true, value: suplidorNombre ? toTitleCase(suplidorNombre) : '', placeholder: "Se selecciona autom\u00E1ticamente" })] }), _jsxs(Col, { span: 5, children: [_jsx("div", { style: { fontSize: 14, marginBottom: 6 }, children: "Fecha" }), _jsx(DatePicker, { format: "DD/MM/YYYY", style: { width: '100%' }, value: fechaSeleccionada, onChange: (date) => setFechaSeleccionada(date || dayjs()), disabledDate: (current) => {
                                        if (!current)
                                            return false;
                                        const cierre = fechasCierre?.[sucursalActiva];
                                        if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                            return true;
                                        const cierreInv = fechasCierreInv?.[sucursalActiva];
                                        if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                            return true;
                                        return false;
                                    } })] }), _jsx(Col, { span: 5, style: { display: 'flex', justifyContent: 'flex-end' }, children: _jsx(Button, { type: "primary", icon: _jsx(ThunderboltOutlined, {}), loading: loading, disabled: !plantillaCodigo, onClick: handleGenerar, style: {
                                    background: '#389e0d',
                                    borderColor: '#389e0d',
                                    minWidth: 140,
                                }, children: "Generar" }) })] }) }), loadingError && (_jsx(Alert, { message: "Error al cargar los datos", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleGenerar, children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card", style: { borderRadius: 8 }, title: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Resultados" }), filteredData.length > 0 && (_jsxs(Tag, { color: "blue", children: [filteredData.length, " registros"] }))] }), children: [_jsx("div", { style: { padding: '0 0 16px' }, children: _jsx(Input.Search, { placeholder: "Buscar por c\u00F3digo, art\u00EDculo o sucursal...", allowClear: true, onSearch: (value) => setSearchText(value), onKeyDown: (e) => {
                                if (e.key === 'Escape') {
                                    e.target.blur();
                                    setSearchText('');
                                }
                            }, style: { width: 400 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }) }), filteredData.length === 0 && !loading ? (_jsx("div", { style: { minHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: _jsx("span", { children: !plantillaCodigo
                                    ? 'Seleccione una plantilla usando el botón ðŸ” y presione Generar'
                                    : searchText.trim()
                                        ? 'No hay resultados que coincidan con la búsqueda'
                                        : 'No se encontraron movimientos para esta plantilla' }) }) })) : (_jsx(Table, { dataSource: filteredData, columns: columns, rowKey: (record, idx) => `${record.codigo}-${record.sucursal}-${idx}`, loading: loading && !data, size: "small", scroll: { x: 900 }, style: { minHeight: 420 }, pagination: {
                            pageSize: 20,
                            showSizeChanger: false,
                            showTotal: (total) => `${total} registros`,
                        } }))] }), _jsx(BuscarPlantillaModal, { open: modalVisible, onClose: () => setModalVisible(false), onSelect: handleSeleccionarPlantilla })] }));
};
export default MovimientoPorPlantilla;
