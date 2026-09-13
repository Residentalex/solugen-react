import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Table, Button, DatePicker, Typography, Tooltip, Empty } from 'antd';
import { SearchOutlined, PrinterOutlined, ReloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useDocumentosReporte } from '../../hooks/useDocumentosReporte';
import { documentosReporteApi } from '../../api/documentosReporteApi';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import PermissionGate from '../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import ListadoErrorAlert from '../../components/ListadoErrorAlert';
const { RangePicker } = DatePicker;
const { Text } = Typography;
const columnas = [
    {
        title: 'Fecha Doc.',
        width: 120,
        render: (_, record) => (_jsx(Text, { children: formatDateRaw(record.fecha) })),
    },
    {
        title: 'Fecha Recibo',
        width: 120,
        render: (_, record) => (_jsx(Text, { children: record.fechaEntrega ? formatDateRaw(record.fechaEntrega) : '-' })),
    },
    {
        title: 'Documento',
        width: 180,
        fixed: 'left',
        render: (_, record) => (_jsx(Link, { to: `/FENP/${record.id}`, className: "paces-doc-link", children: _jsx(Text, { strong: true, children: record.documento }) })),
    },
    {
        title: 'Suplidor',
        render: (_, record) => toTitleCase(record.entidad ?? ''),
    },
    {
        title: 'Concepto',
        width: 220,
        responsive: ['lg'],
        ellipsis: true,
        render: (_, record) => toTitleCase(record.concepto ?? ''),
    },
    {
        title: 'Total',
        width: 140,
        align: 'right',
        render: (_, record) => (_jsx(Text, { strong: true, className: "paces-text-total", children: formatCurrency(record.total ?? 0) })),
    },
    {
        title: 'Fecha Autorizado',
        width: 130,
        render: (_, record) => (record.fechaAccion ? formatDateRaw(record.fechaAccion) : '-'),
    },
    {
        title: 'Autorizado por',
        width: 220,
        render: (_, record) => record.creadoPor,
    },
];
const DocumentosAutorizados = () => {
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    useScreenConfig('RDocAutorizado');
    const config = useMemo(() => ({
        modulo: 'RDocAutorizado',
        fetchDatos: documentosReporteApi.obtenerAutorizados,
        reporteBlob: (sucursal, desde, hasta) => documentosReporteApi.imprimirReporte(sucursal, 'autorizados', desde, hasta),
        tituloReporte: 'Autorizados',
    }), []);
    const { data, loading, loadingError, loadingPdf, fechas, hasQueried, handleConsultar, handleImprimir, handleFechasChange, handleRefresh, } = useDocumentosReporte(config);
    useEffect(() => {
        setActiveModule('RDocAutorizado');
        return () => {
            resetToolbar();
        };
    }, [setActiveModule, resetToolbar]);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const tooltipTitle = selectedRowKeys.length > 0
        ? `Imprimir seleccionados (${selectedRowKeys.length})`
        : 'Imprimir reporte completo del período';
    const handleExportarExcel = async () => {
        const sucursalActiva = useAuthStore.getState().sucursalActiva;
        const companyName = await getCompanyName(sucursalActiva);
        const exportCols = columnas.filter((col) => col.title && col.title !== '' && col.title !== 'Acciones');
        const columnHeaders = exportCols.map((col) => col.title);
        const dataRows = data.map((item) => exportCols.map((col) => {
            const val = item[col.dataIndex];
            return val != null ? String(val) : '';
        }));
        exportToExcel({
            fileName: `DocumentosAutorizados_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'DocumentosAutorizados',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    return (_jsxs(_Fragment, { children: [loadingError && (_jsx(ListadoErrorAlert, { message: "Error al cargar documentos autorizados", onRetry: handleRefresh })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx(RangePicker, { value: fechas, onChange: (dates) => handleFechasChange(dates), format: "DD/MM/YYYY", allowClear: false, presets: [
                                        { label: 'Este mes', value: [dayjs().startOf('month'), dayjs()] },
                                        { label: 'Mes anterior', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
                                        { label: 'Últimos 30 días', value: [dayjs().subtract(30, 'day'), dayjs()] },
                                    ] }), _jsx(Button, { type: "primary", icon: _jsx(SearchOutlined, {}), loading: loading, onClick: handleConsultar, children: "Consultar" }), _jsx("div", { style: { flex: 1 } }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: handleExportarExcel }) }), _jsx(Tooltip, { title: tooltipTitle, children: _jsx(Button, { icon: _jsx(PrinterOutlined, {}), loading: loadingPdf, disabled: data.length === 0 && selectedRowKeys.length === 0, onClick: () => handleImprimir(selectedRowKeys.length > 0 ? selectedRowKeys.map(Number) : undefined) }) }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), disabled: !hasQueried, onClick: handleRefresh })] }) }), _jsx(Table, { className: "paces-border-top paces-list-table", rowKey: "id", size: "middle", columns: columnas, dataSource: data, loading: loading, rowSelection: {
                            selectedRowKeys,
                            onChange: (keys) => setSelectedRowKeys(keys),
                            columnWidth: 60,
                        }, scroll: { x: 1050 }, locale: {
                            emptyText: hasQueried
                                ? (_jsx(Empty, { description: _jsxs("span", { children: ["No hay documentos autorizados en el per\u00EDodo", _jsx("br", {}), _jsxs(Text, { type: "secondary", style: { fontSize: 12 }, children: [fechas[0].format('DD/MM/YYYY'), " \u2014 ", fechas[1].format('DD/MM/YYYY')] })] }) }))
                                : (_jsx(Empty, { description: "Seleccione un rango de fechas y presione Consultar" })),
                        }, pagination: {
                            pageSize: 25,
                            showSizeChanger: false,
                            showTotal: (total, range) => {
                                const totalGlobal = data.reduce((s, r) => s + (r.total || 0), 0);
                                return `${range[0]}-${range[1]} de ${total} registros · Total: ${formatCurrency(totalGlobal)}`;
                            },
                        } })] })] }));
};
export default DocumentosAutorizados;
