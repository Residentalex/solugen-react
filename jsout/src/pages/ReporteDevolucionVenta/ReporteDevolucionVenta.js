import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, DatePicker, message, Alert, Typography, Empty, Modal } from 'antd';
import { ArrowLeftOutlined, SearchOutlined, ReloadOutlined, FileTextOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { devolucionVentaApi } from '../../api/devolucionVentaApi';
import { formatCurrency, formatDate } from '../../utils/formats';
import { toTitleCase } from '../../utils/formats';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';
import PermissionGate from '../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import dayjs from 'dayjs';
const { RangePicker } = DatePicker;
const { Text } = Typography;
function formatDateShort(val) {
    if (!val)
        return '-';
    const d = new Date(val);
    if (isNaN(d.getTime()))
        return val;
    return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
const ReporteDevolucionVenta = () => {
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const [data, setData] = useState([]);
    const [consumidas, setConsumidas] = useState([]);
    const [noConsumidas, setNoConsumidas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [fechas, setFechas] = useState([dayjs().startOf('month'), dayjs()]);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [generating, setGenerating] = useState(false);
    const cargar = useCallback(async () => {
        if (!fechas)
            return;
        setSelectedRowKeys([]);
        setLoading(true);
        setLoadingError(false);
        try {
            const desde = fechas[0].format('YYYYMMDDHHmmss');
            const hasta = fechas[1].format('YYYYMMDDHHmmss');
            const res = await devolucionVentaApi.obtenerVista(sucursalActiva, desde, hasta, 1000, 0);
            const items = res.data || [];
            setData(items);
            const consumidasList = [];
            const noConsumidasList = [];
            for (const item of items || []) {
                if ((item.montoConsumido || 0) > 0) {
                    consumidasList.push(item);
                }
                else {
                    noConsumidasList.push(item);
                }
            }
            setConsumidas(consumidasList);
            setNoConsumidas(noConsumidasList);
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el reporte';
            message.error(msg);
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva, fechas]);
    useEffect(() => {
        setActiveModule('RDEV');
        cargar();
    }, [setActiveModule, cargar]);
    const handleGenerarND = useCallback(async () => {
        if (selectedRowKeys.length === 0)
            return;
        const totalMonto = noConsumidas
            .filter((item) => selectedRowKeys.includes(item.id))
            .reduce((sum, item) => sum + (item.total || 0), 0);
        Modal.confirm({
            title: 'Generar Nota de Débito',
            content: `Se generará una Nota de Débito por ${selectedRowKeys.length} devolución(es) por un monto total de ${formatCurrency(totalMonto)}. ¿Continuar?`,
            okText: 'Sí, generar',
            cancelText: 'Cancelar',
            onOk: async () => {
                setGenerating(true);
                try {
                    const nd = await devolucionVentaApi.generarND(sucursalActiva, selectedRowKeys.map(Number));
                    message.success(`Nota de Débito ${nd.noDocumento} generada exitosamente`);
                    setSelectedRowKeys([]);
                    await cargar();
                    navigate(`/FNDCLI/${nd.id}`);
                }
                catch (err) {
                    const msg = err?.response?.data?.errorMessage || 'Error al generar la Nota de Débito';
                    message.error(msg);
                }
                finally {
                    setGenerating(false);
                }
            },
        });
    }, [selectedRowKeys, noConsumidas, sucursalActiva, cargar, navigate]);
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const exportCols = columns.filter((col) => col.title && col.title !== '' && col.title !== 'Acciones');
        const columnHeaders = exportCols.map((col) => col.title);
        const dataRows = data.map((item) => exportCols.map((col) => {
            const val = item[col.dataIndex];
            return val != null ? String(val) : '';
        }));
        exportToExcel({
            fileName: `ReporteDevolucionVenta_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'ReporteDevolucionVenta',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    const columns = [
        {
            title: 'Documento',
            key: 'documento',
            width: 170,
            render: (_, r) => (_jsx("a", { className: "paces-doc-link", onClick: () => navigate(`/FDEV/${r.id}`), children: r.documento || r.id })),
        },
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 110,
            render: (v) => formatDateShort(v),
        },
        {
            title: 'Cliente',
            dataIndex: 'entidad',
            key: 'entidad',
            ellipsis: true,
            render: (v) => toTitleCase(v || '-'),
        },
        {
            title: 'Concepto',
            dataIndex: 'concepto',
            key: 'concepto',
            width: 180,
            render: (v) => toTitleCase(v || '-'),
        },
        {
            title: 'NCF',
            dataIndex: 'ncf',
            key: 'ncf',
            width: 140,
            render: (v) => v || '-',
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 120,
            align: 'right',
            render: (v) => _jsx(Text, { strong: true, children: formatCurrency(v || 0) }),
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 100,
            render: (v) => {
                const num = typeof v === 'string' ? parseInt(v, 10) : v;
                const info = ESTADO_DOCUMENTO_MAP[num] || { label: v ?? 'Desconocido', color: 'default' };
                return _jsx(Tag, { color: info.color, children: info.label });
            },
        },
    ];
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate('/'), children: "Volver" }), _jsx("div", { style: { flex: 1 } }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: handleExportarExcel }) }), _jsx(RangePicker, { value: fechas, onChange: setFechas, format: "YYYY-MM-DD", allowClear: false }), _jsxs(Button, { type: "primary", icon: _jsx(FileTextOutlined, {}), disabled: selectedRowKeys.length === 0, loading: generating, onClick: handleGenerarND, children: ["Generar ND (", selectedRowKeys.length, ")"] }), _jsx(Button, { type: "primary", icon: _jsx(SearchOutlined, {}), onClick: cargar, loading: loading, children: "Consultar" }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: cargar })] }), loadingError && (_jsx(Alert, { message: "Error al cargar el reporte", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: cargar, children: "Reintentar" }) })), _jsxs(Spin, { spinning: loading, children: [_jsx(Row, { gutter: 16, children: _jsx(Col, { span: 24, style: { marginBottom: 16 }, children: _jsx(Card, { className: "paces-card", size: "small", title: _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Resumen" }), children: _jsxs(Space, { size: 24, children: [_jsxs("div", { children: [_jsx("span", { className: "paces-text-secondary", children: "Total devoluciones: " }), _jsx(Text, { strong: true, children: data.length })] }), _jsxs("div", { children: [_jsx("span", { className: "paces-text-secondary", children: "Consumidas: " }), _jsx(Text, { strong: true, style: { color: '#34c38f' }, children: consumidas.length })] }), _jsxs("div", { children: [_jsx("span", { className: "paces-text-secondary", children: "No consumidas: " }), _jsx(Text, { strong: true, style: { color: '#f46a6a' }, children: noConsumidas.length })] }), _jsxs("div", { children: [_jsx("span", { className: "paces-text-secondary", children: "Total monto: " }), _jsx(Text, { strong: true, children: formatCurrency(data.reduce((s, r) => s + (r.total || 0), 0)) })] })] }) }) }) }), _jsx(Tabs, { defaultActiveKey: "noConsumidas", type: "card", items: [
                            {
                                key: 'noConsumidas',
                                label: `No Consumidas (${noConsumidas.length})`,
                                children: noConsumidas.length === 0 ? (_jsx(Empty, { description: "No hay devoluciones no consumidas" })) : (_jsx(Table, { dataSource: noConsumidas, columns: columns, rowKey: "id", size: "small", rowSelection: {
                                        selectedRowKeys,
                                        onChange: (keys) => setSelectedRowKeys(keys),
                                    }, pagination: { pageSize: 20, showTotal: (t) => `${t} registros` }, scroll: { x: 900 } })),
                            },
                            {
                                key: 'consumidas',
                                label: `Consumidas (${consumidas.length})`,
                                children: consumidas.length === 0 ? (_jsx(Empty, { description: "No hay devoluciones consumidas" })) : (_jsx(Table, { dataSource: consumidas, columns: columns, rowKey: "id", size: "small", pagination: { pageSize: 20, showTotal: (t) => `${t} registros` }, scroll: { x: 900 } })),
                            },
                        ] })] })] }));
};
export default ReporteDevolucionVenta;
