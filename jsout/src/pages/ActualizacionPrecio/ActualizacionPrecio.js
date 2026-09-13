import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Table, Input, Tag, Button, Card, Typography, DatePicker, Alert, Empty } from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { actualizacionPrecioApi } from '../../api/actualizacionPrecioApi';
import PermissionGate from '../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const { RangePicker } = DatePicker;
const DIAS_POR_DEFECTO = 30;
const FILAS_POR_PAGINA = 25;
const ESTADO_TAG = {
    Pendiente: { color: 'warning', label: 'Pendiente' },
    P: { color: 'warning', label: 'Pendiente' },
    Aplicado: { color: 'success', label: 'Aplicado' },
    A: { color: 'success', label: 'Aplicado' },
    Anulado: { color: 'error', label: 'Anulado' },
    N: { color: 'error', label: 'Anulado' },
};
function formatDate(dateStr) {
    if (!dateStr)
        return '-';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime()))
            return dateStr;
        return d.toLocaleDateString('es-DO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }
    catch {
        return dateStr;
    }
}
function formatDateParam(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${y}${m}${day}${hh}${mm}${ss}`;
}
const ActualizacionPrecio = () => {
    const navigate = useNavigate();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [searchText, setSearchText] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(FILAS_POR_PAGINA);
    const dateParamsRef = useRef({
        desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
        hasta: formatDateParam(new Date()),
    });
    const [dateTrigger, setDateTrigger] = useState(0);
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['actualizacionPrecio', sucursalActiva, page, pageSize, searchText, dateTrigger],
        queryFn: async () => {
            const { desde, hasta } = dateParamsRef.current;
            let resultados;
            if (searchText.length > 2) {
                resultados = await actualizacionPrecioApi.filtrar(sucursalActiva, {
                    cantidad: pageSize,
                    salto: (page - 1) * pageSize,
                    desde,
                    hasta,
                    documento: searchText,
                });
            }
            else {
                resultados = await actualizacionPrecioApi.obtenerResumido(sucursalActiva, desde, hasta, pageSize, (page - 1) * pageSize);
            }
            return { datos: resultados };
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    const { data: totalData } = useQuery({
        queryKey: ['actualizacionPrecioTotal', sucursalActiva, dateTrigger, searchText],
        queryFn: () => actualizacionPrecioApi.obtenerTotal(sucursalActiva, dateParamsRef.current.desde, dateParamsRef.current.hasta),
        enabled: sucursalActiva !== undefined,
    });
    useEffect(() => {
        setActiveModule('FActPrecio');
        updateToolbar({});
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar]);
    const handleSearch = (value) => {
        setSearchText(value);
        setPage(1);
    };
    const handleRefresh = () => {
        setDateTrigger((n) => n + 1);
    };
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const dataSource = data?.datos || [];
        const exportCols = columns.filter((col) => col.title && col.title !== '' && col.title !== 'Acciones');
        const columnHeaders = exportCols.map((col) => col.title);
        const dataRows = dataSource.map((item) => exportCols.map((col) => {
            const val = item[col.dataIndex];
            return val != null ? String(val) : '';
        }));
        exportToExcel({
            fileName: `ActualizacionPrecio_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'ActualizacionPrecio',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    const handleDateChange = (dates) => {
        if (dates && dates[0] && dates[1]) {
            const d = dates[0].format('YYYYMMDD') + '000000';
            const h = dates[1].format('YYYYMMDD') + '000000';
            dateParamsRef.current = { desde: d, hasta: h };
        }
        else {
            dateParamsRef.current = {
                desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
                hasta: formatDateParam(new Date()),
            };
        }
        setPage(1);
        setDateTrigger((n) => n + 1);
    };
    const columns = [
        {
            title: 'Documento',
            dataIndex: 'documento',
            key: 'documento',
            width: 140,
            fixed: 'left',
            render: (val, record) => (_jsx(Text, { strong: true, className: "paces-doc-link", style: { cursor: 'pointer' }, onClick: () => navigate(`/FActPrecio/${record.idExterno}`), children: val })),
        },
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 120,
            render: (val) => _jsx(Text, { children: formatDate(val) }),
        },
        {
            title: 'Fecha Aplicar',
            dataIndex: 'fechaParaAplicar',
            key: 'fechaParaAplicar',
            width: 120,
            render: (val) => _jsx(Text, { children: formatDate(val) }),
        },
        {
            title: 'Doc. Referencia',
            dataIndex: 'docReferencia',
            key: 'docReferencia',
            width: 150,
            render: (val) => _jsx(Text, { type: "secondary", children: val || '-' }),
        },
        {
            title: 'Ajuste',
            dataIndex: 'ajuste',
            key: 'ajuste',
            width: 100,
            align: 'right',
            render: (val) => (_jsx(Text, { style: { fontFamily: 'monospace' }, children: val.toLocaleString('es-DO') })),
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 110,
            render: (val) => {
                const info = ESTADO_TAG[val] || { color: 'default', label: val };
                return _jsx(Tag, { color: info.color, children: info.label });
            },
        },
        {
            title: 'Autorizado',
            dataIndex: 'autorizado',
            key: 'autorizado',
            width: 100,
            render: (val) => (_jsx(Tag, { color: "blue", children: val ? 'Sí' : 'No' })),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar actualizaciones de precio", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx(Input.Search, { placeholder: "Buscar documento...", allowClear: true, onSearch: handleSearch, style: { width: 400 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx(RangePicker, { style: { width: 220 }, format: "YYYY-MM-DD", onChange: handleDateChange, placeholder: ["Desde", "Hasta"] }), _jsx("div", { style: { flex: 1 } }), _jsx(PermissionGate, { accion: "CREAR", children: _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: () => navigate('/FActPrecio/nuevo'), children: "Nuevo" }) }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: handleExportarExcel }) }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: handleRefresh })] }) }), _jsx(Table, { className: "paces-border-top paces-list-table", columns: columns, dataSource: data?.datos || [], rowKey: "idExterno", loading: isLoading, scroll: { x: 1200 }, size: "middle", locale: {
                            emptyText: isLoading ? ' ' : _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No se encontraron actualizaciones de precio" }) }),
                        }, pagination: {
                            current: page,
                            pageSize: pageSize,
                            total: totalData || 0,
                            onChange: (newPage, newPageSize) => {
                                if (newPageSize !== pageSize) {
                                    setPageSize(newPageSize);
                                    setPage(1);
                                }
                                else {
                                    setPage(newPage);
                                }
                            },
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        } })] })] }));
};
export default ActualizacionPrecio;
