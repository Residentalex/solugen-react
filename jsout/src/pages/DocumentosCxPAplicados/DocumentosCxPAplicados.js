import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Table, Button, DatePicker, Typography, Tooltip, Empty, Select } from 'antd';
import { SearchOutlined, PrinterOutlined, ReloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useDocumentosReporte } from '../../hooks/useDocumentosReporte';
import { documentosCxPReporteApi } from '../../api/documentosCxPReporteApi';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import PermissionGate from '../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import ListadoErrorAlert from '../../components/ListadoErrorAlert';
const { RangePicker } = DatePicker;
const { Text } = Typography;
const DOC_ROUTE_MAP = {
    RDE: 'FRDE',
    NC: 'FNCSUP',
    ND: 'FNDSUP',
    DBA: 'FDBASUP',
    SPA: 'FSPA',
};
const OPCIONES_TIPO_DOCUMENTO = [
    { value: '', label: 'Todos los tipos' },
    { value: 'RDE', label: 'Factura Proveedor (RDE)' },
    { value: 'NC', label: 'Nota Crédito (NC)' },
    { value: 'ND', label: 'Nota Débito (ND)' },
    { value: 'DBA', label: 'Dist. Balance (DBA)' },
    { value: 'SPA', label: 'Solicitud Pago (SPA)' },
];
const columnas = [
    {
        title: 'Fecha Doc.',
        width: 120,
        render: (_, record) => (_jsx(Text, { children: formatDateRaw(record.fecha) })),
    },
    {
        title: 'Documento',
        width: 180,
        fixed: 'left',
        render: (_, record) => {
            const prefijo = record.documento?.split('-')[0] || '';
            const ruta = DOC_ROUTE_MAP[prefijo] || 'FRDE';
            return (_jsx(Link, { to: `/${ruta}/${record.id}`, className: "paces-doc-link", children: _jsx(Text, { strong: true, children: record.documento }) }));
        },
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
        title: 'Fecha Aplicado',
        width: 130,
        render: (_, record) => (record.fechaAccion ? formatDateRaw(record.fechaAccion) : '-'),
    },
    {
        title: 'Aplicado por',
        width: 220,
        render: (_, record) => record.creadoPor,
    },
];
const DocumentosCxPAplicados = () => {
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    useScreenConfig('RDocCxPAplicado');
    const MODULO_ID = 5;
    const [tipoDocumento, setTipoDocumento] = useState('');
    const config = useMemo(() => ({
        modulo: 'RDocCxPAplicado',
        fetchDatos: (sucursal, desde, hasta) => documentosCxPReporteApi.obtenerAplicados(sucursal, MODULO_ID, desde, hasta, tipoDocumento || undefined),
        reporteBlob: (sucursal, desde, hasta) => documentosCxPReporteApi.imprimirReporte(sucursal, MODULO_ID, 'aplicados', desde, hasta, tipoDocumento || undefined),
        tituloReporte: 'CXP Aplicados',
    }), [tipoDocumento]);
    const { data, loading, loadingError, loadingPdf, fechas, hasQueried, handleConsultar, handleImprimir, handleFechasChange, handleRefresh, } = useDocumentosReporte(config);
    useEffect(() => {
        setActiveModule('RDocCxPAplicado');
        return () => {
            resetToolbar();
        };
    }, [setActiveModule, resetToolbar]);
    useEffect(() => {
        if (hasQueried) {
            handleConsultar();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tipoDocumento]);
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
            fileName: `DocumentosCxPAplicados_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'DocumentosCxPAplicados',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    return (_jsxs(_Fragment, { children: [loadingError && (_jsx(ListadoErrorAlert, { message: "Error al cargar documentos CXP aplicados", onRetry: handleRefresh })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx(RangePicker, { value: fechas, onChange: (dates) => handleFechasChange(dates), format: "DD/MM/YYYY", allowClear: false, presets: [
                                        { label: 'Este mes', value: [dayjs().startOf('month'), dayjs()] },
                                        { label: 'Mes anterior', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
                                        { label: 'Últimos 30 días', value: [dayjs().subtract(30, 'day'), dayjs()] },
                                    ] }), _jsx(Select, { value: tipoDocumento, onChange: (val) => setTipoDocumento(val), options: OPCIONES_TIPO_DOCUMENTO, style: { width: 220 } }), _jsx(Button, { type: "primary", icon: _jsx(SearchOutlined, {}), loading: loading, onClick: handleConsultar, children: "Consultar" }), _jsx("div", { style: { flex: 1 } }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: handleExportarExcel }) }), _jsx(Tooltip, { title: tooltipTitle, children: _jsx(Button, { icon: _jsx(PrinterOutlined, {}), loading: loadingPdf, disabled: data.length === 0 && selectedRowKeys.length === 0, onClick: () => handleImprimir(selectedRowKeys.length > 0 ? selectedRowKeys.map(Number) : undefined) }) }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), disabled: !hasQueried, onClick: handleRefresh })] }) }), _jsx(Table, { className: "paces-border-top paces-list-table", rowKey: "id", size: "middle", columns: columnas, dataSource: data, loading: loading, rowSelection: {
                            selectedRowKeys,
                            onChange: (keys) => setSelectedRowKeys(keys),
                            columnWidth: 60,
                        }, scroll: { x: 1050 }, locale: {
                            emptyText: hasQueried
                                ? (_jsx(Empty, { description: _jsxs("span", { children: ["No hay documentos CXP aplicados en el per\u00EDodo", _jsx("br", {}), _jsxs(Text, { type: "secondary", style: { fontSize: 12 }, children: [fechas[0].format('DD/MM/YYYY'), " \u2014 ", fechas[1].format('DD/MM/YYYY')] })] }) }))
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
export default DocumentosCxPAplicados;
