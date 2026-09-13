import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, Table, Button, DatePicker, Typography, Empty, message } from 'antd';
import { SearchOutlined, ReloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { salidaAlmacenApi } from '../../api/salidaAlmacenApi';
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
        render: (_, record) => (_jsx(Text, { children: formatDateRaw(record.fechaDocumento) })),
    },
    {
        title: 'Documento',
        width: 180,
        fixed: 'left',
        render: (_, record) => (_jsx(Link, { to: `/FTRP/${record.id}`, className: "paces-doc-link", children: _jsxs(Text, { strong: true, children: [record.documento?.codigo, "-", record.noDocumento] }) })),
    },
    {
        title: 'Origen',
        width: 150,
        render: (_, record) => toTitleCase(record.codigoAlmacenOrigen ?? ''),
    },
    {
        title: 'Destino',
        width: 150,
        render: (_, record) => toTitleCase(record.codigoAlmacenDestino ?? ''),
    },
    {
        title: 'Total',
        width: 140,
        align: 'right',
        render: (_, record) => (_jsx(Text, { strong: true, className: "paces-text-total", children: formatCurrency(record.total ?? 0) })),
    },
    {
        title: 'Creado por',
        width: 160,
        render: (_, record) => record.creadoPor?.nombre ?? '',
    },
];
const TransferenciaSucursales = () => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    useScreenConfig('RSAPENP');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [fechas, setFechas] = useState([dayjs().startOf('month'), dayjs()]);
    const [hasQueried, setHasQueried] = useState(false);
    useEffect(() => {
        setActiveModule('RSAPENP');
        return () => {
            resetToolbar();
        };
    }, [setActiveModule, resetToolbar]);
    const handleConsultar = useCallback(async () => {
        setLoading(true);
        setLoadingError(false);
        try {
            const desde = fechas[0].startOf('day').format('YYYYMMDDHHmmss');
            const hasta = fechas[1].endOf('day').format('YYYYMMDDHHmmss');
            const items = await salidaAlmacenApi.obtenerTransferencias(sucursalActiva, desde, hasta);
            setData(items || []);
            setHasQueried(true);
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar transferencias';
            message.error(msg);
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva, fechas]);
    const handleRefresh = useCallback(() => {
        if (hasQueried)
            handleConsultar();
    }, [hasQueried, handleConsultar]);
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const exportCols = columnas.filter((col) => col.title && col.title !== '' && col.title !== 'Acciones');
        const columnHeaders = exportCols.map((col) => col.title);
        const dataRows = data.map((item) => exportCols.map((col) => {
            const val = item[col.dataIndex];
            return val != null ? String(val) : '';
        }));
        exportToExcel({
            fileName: `TransferenciaSucursales_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'TransferenciaSucursales',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    return (_jsxs(_Fragment, { children: [loadingError && (_jsx(ListadoErrorAlert, { message: "Error al cargar transferencias", onRetry: handleRefresh })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx(RangePicker, { value: fechas, onChange: (dates) => {
                                        if (dates)
                                            setFechas(dates);
                                    }, format: "DD/MM/YYYY", allowClear: false, presets: [
                                        { label: 'Este mes', value: [dayjs().startOf('month'), dayjs()] },
                                        { label: 'Mes anterior', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
                                        { label: 'Últimos 30 días', value: [dayjs().subtract(30, 'day'), dayjs()] },
                                    ] }), _jsx(Button, { type: "primary", icon: _jsx(SearchOutlined, {}), loading: loading, onClick: handleConsultar, children: "Consultar" }), _jsx("div", { style: { flex: 1 } }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: handleExportarExcel }) }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), disabled: !hasQueried, onClick: handleRefresh })] }) }), _jsx(Table, { className: "paces-border-top paces-list-table", rowKey: "id", size: "middle", columns: columnas, dataSource: data, loading: loading, scroll: { x: 1050 }, locale: {
                            emptyText: hasQueried
                                ? (_jsx(Empty, { description: _jsxs("span", { children: ["No hay transferencias en el per\u00EDodo", _jsx("br", {}), _jsxs(Text, { type: "secondary", style: { fontSize: 12 }, children: [fechas[0].format('DD/MM/YYYY'), " \u2014 ", fechas[1].format('DD/MM/YYYY')] })] }) }))
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
export default TransferenciaSucursales;
