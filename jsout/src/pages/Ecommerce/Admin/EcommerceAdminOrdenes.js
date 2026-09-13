import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { Table, Input, Button, Card, Select, Tag, Typography, Modal, Descriptions, DatePicker, message, Tooltip, } from 'antd';
import { SearchOutlined, ReloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ecommerceApi } from '../../../api/ecommerceApi';
import { formatCurrency } from '../../../utils/formats';
import { useAuthStore } from '../../../stores/authStore';
import PermissionGate from '../../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../../utils/exportToExcel';
const { Text } = Typography;
const { RangePicker } = DatePicker;
const ESTADO_COLOR = {
    PENDIENTE: 'orange',
    PROCESANDO: 'blue',
    ENVIADO: 'cyan',
    COMPLETADO: 'green',
    CANCELADO: 'red',
};
const ESTADOS_OPCIONES = [
    { value: '', label: 'Todos' },
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'PROCESANDO', label: 'Procesando' },
    { value: 'ENVIADO', label: 'Enviado' },
    { value: 'COMPLETADO', label: 'Completado' },
    { value: 'CANCELADO', label: 'Cancelado' },
];
const EcommerceAdminOrdenes = () => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [searchText, setSearchText] = useState('');
    const [estadoFiltro, setEstadoFiltro] = useState('');
    const [rangoFecha, setRangoFecha] = useState(null);
    const [detalle, setDetalle] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [nuevoEstado, setNuevoEstado] = useState('');
    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const params = { pagina: page, tamano: pageSize };
            if (estadoFiltro)
                params.estado = estadoFiltro;
            if (rangoFecha && rangoFecha[0] && rangoFecha[1]) {
                params.fechaDesde = rangoFecha[0].format('YYYY-MM-DD');
                params.fechaHasta = rangoFecha[1].format('YYYY-MM-DD');
            }
            const result = await ecommerceApi.adminObtenerOrdenes(params);
            setData(result.items);
            setTotal(result.total);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar órdenes');
        }
        finally {
            setLoading(false);
        }
    }, [page, pageSize, estadoFiltro, rangoFecha]);
    useEffect(() => {
        cargar();
    }, [cargar]);
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const cols = columns.filter((c) => c.key !== 'acciones');
        exportToExcel({
            fileName: `OrdenesEcommerce_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Órdenes Ecommerce',
            companyName,
            columnHeaders: cols.map((c) => c.title),
            dataRows: data.map((item) => cols.map((col) => {
                const val = item[col.dataIndex];
                return val !== null && val !== undefined ? String(val) : '';
            })),
        });
    };
    const handleSearch = (value) => {
        setSearchText(value);
        setPage(1);
    };
    const handleRefresh = () => {
        setPage(1);
        cargar();
    };
    const openDetalle = async (record) => {
        try {
            const data = await ecommerceApi.adminObtenerOrdenDetalle(record.id);
            setDetalle(data);
            setNuevoEstado(data.estado);
            setModalOpen(true);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar detalle');
        }
    };
    const handleCambiarEstado = async () => {
        if (!detalle || !nuevoEstado)
            return;
        try {
            await ecommerceApi.adminActualizarEstadoOrden(detalle.id, nuevoEstado);
            message.success('Estado actualizado');
            setModalOpen(false);
            cargar();
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cambiar estado');
        }
    };
    const columns = [
        {
            title: 'No. Orden',
            dataIndex: 'noOrden',
            key: 'noOrden',
            width: 110,
            fixed: 'left',
            render: (val, record) => (_jsxs(Text, { strong: true, style: { color: '#556ee6', cursor: 'pointer' }, onClick: () => openDetalle(record), children: ["#", val] })),
        },
        {
            title: 'Cliente',
            dataIndex: 'nombreCliente',
            key: 'nombreCliente',
            render: (val, record) => (_jsxs("div", { children: [_jsx(Text, { children: val }), _jsx("div", { children: _jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: record.email }) })] })),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 130,
            align: 'right',
            render: (val) => _jsx(Text, { strong: true, children: formatCurrency(val) }),
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 120,
            render: (val) => _jsx(Tag, { color: ESTADO_COLOR[val] || 'default', children: val }),
        },
        {
            title: 'Fecha',
            dataIndex: 'fechaCreacion',
            key: 'fechaCreacion',
            width: 160,
            render: (val) => (_jsx(Text, { children: val ? new Date(val).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' }) : '-' })),
        },
    ];
    return (_jsxs(_Fragment, { children: [_jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx(Input.Search, { placeholder: "Buscar orden...", allowClear: true, onSearch: handleSearch, style: { width: 400 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx(Select, { placeholder: "Estado", style: { width: 150 }, value: estadoFiltro || undefined, onChange: (v) => { setEstadoFiltro(v); setPage(1); }, options: ESTADOS_OPCIONES }), _jsx(RangePicker, { placeholder: ['Desde', 'Hasta'], value: rangoFecha, onChange: (dates) => { setRangoFecha(dates); setPage(1); }, format: "DD/MM/YYYY" }), _jsx("div", { style: { flex: 1 } }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: handleExportarExcel }) }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: handleRefresh })] }) }), _jsx(Table, { columns: columns, dataSource: data, rowKey: "id", loading: loading, size: "middle", scroll: { x: 900 }, className: "paces-border-top paces-list-table", rowClassName: "paces-row-hover", onRow: (record) => ({
                            onClick: () => openDetalle(record),
                            style: { cursor: 'pointer' },
                        }), pagination: {
                            current: page,
                            pageSize,
                            total,
                            onChange: (p, ps) => {
                                if (ps !== pageSize) {
                                    setPageSize(ps || 25);
                                    setPage(1);
                                }
                                else {
                                    setPage(p);
                                }
                            },
                            showTotal: (t) => `${t} registros`,
                        } })] }), _jsx(Modal, { title: `Orden #${detalle?.noOrden ?? ''}`, open: modalOpen, onCancel: () => setModalOpen(false), width: 800, footer: [
                    _jsx(Button, { onClick: () => setModalOpen(false), children: "Cerrar" }, "cerrar"),
                    _jsx(Button, { type: "primary", onClick: handleCambiarEstado, children: "Guardar Estado" }, "guardar"),
                ], children: detalle && (_jsxs("div", { children: [_jsxs(Descriptions, { bordered: true, size: "small", column: 2, style: { marginBottom: 16 }, children: [_jsx(Descriptions.Item, { label: "Cliente", children: detalle.nombreCliente }), _jsx(Descriptions.Item, { label: "Email", children: detalle.email }), _jsx(Descriptions.Item, { label: "Tel\u00E9fono", children: detalle.telefono || '-' }), _jsx(Descriptions.Item, { label: "Fecha", children: new Date(detalle.fechaCreacion).toLocaleString('es-DO') }), _jsx(Descriptions.Item, { label: "Direcci\u00F3n", span: 2, children: detalle.direccion || '-' }), _jsx(Descriptions.Item, { label: "Notas", span: 2, children: detalle.notas || '-' })] }), _jsxs("div", { style: { marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(Text, { strong: true, children: "Estado:" }), _jsx(Select, { style: { width: 180 }, value: nuevoEstado, onChange: setNuevoEstado, options: ESTADOS_OPCIONES.filter((o) => o.value !== '') })] }), _jsx(Text, { strong: true, children: "Items" }), _jsx(Table, { size: "small", bordered: true, dataSource: detalle.detalles, rowKey: "id", pagination: false, style: { marginTop: 8 }, columns: [
                                { title: 'Código', dataIndex: 'codigoProducto', width: 120 },
                                { title: 'Producto', dataIndex: 'nombreProducto' },
                                { title: 'Cantidad', dataIndex: 'cantidad', width: 90, align: 'right' },
                                {
                                    title: 'Precio',
                                    dataIndex: 'precioUnitario',
                                    width: 120,
                                    align: 'right',
                                    render: (v) => formatCurrency(v),
                                },
                                {
                                    title: 'Subtotal',
                                    dataIndex: 'subtotal',
                                    width: 120,
                                    align: 'right',
                                    render: (v) => formatCurrency(v),
                                },
                            ] }), _jsxs("div", { style: { marginTop: 16, textAlign: 'right' }, children: [_jsxs("div", { children: ["Subtotal: ", _jsx(Text, { strong: true, children: formatCurrency(detalle.subtotal) })] }), _jsxs("div", { children: ["Impuestos: ", _jsx(Text, { children: formatCurrency(detalle.impuestos) })] }), _jsxs("div", { style: { fontSize: 16, marginTop: 4 }, children: ["Total: ", _jsx(Text, { strong: true, style: { color: '#556ee6' }, children: formatCurrency(detalle.total) })] })] })] })) })] }));
};
export default EcommerceAdminOrdenes;
