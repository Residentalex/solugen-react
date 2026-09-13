import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Table, Card, DatePicker, Input, Tag, Button, Typography, Alert, Empty, } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { conteoApi } from '../../api/conteoApi';
import { formatCurrency } from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
const { Text } = Typography;
const { RangePicker } = DatePicker;
const DIAS_POR_DEFECTO = 30;
const FILAS_POR_PAGINA = 25;
function parseDateRaw(val) {
    if (!val)
        return null;
    const num = val.replace(/\D/g, '');
    if (num.length === 8) {
        const y = parseInt(num.slice(0, 4), 10);
        const m = parseInt(num.slice(4, 6), 10) - 1;
        const d = parseInt(num.slice(6, 8), 10);
        return new Date(y, m, d);
    }
    if (num.length >= 14) {
        const y = parseInt(num.slice(0, 4), 10);
        const m = parseInt(num.slice(4, 6), 10) - 1;
        const d = parseInt(num.slice(6, 8), 10);
        return new Date(y, m, d);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}
function formatDate(val) {
    const d = parseDateRaw(val);
    if (!d)
        return val || '-';
    return d.toLocaleDateString('es-DO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}
function toTitleCase(str) {
    if (!str)
        return str;
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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
const Conteos = () => {
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(FILAS_POR_PAGINA);
    const dateParamsRef = useRef({
        desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
        hasta: formatDateParam(new Date()),
    });
    const [dateTrigger, setDateTrigger] = useState(0);
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['conteos', sucursalActiva, page, pageSize, dateTrigger],
        queryFn: async () => {
            const { desde, hasta } = dateParamsRef.current;
            const resultados = await conteoApi.obtenerListado(sucursalActiva, {
                desde,
                hasta,
                cantidad: pageSize,
                salto: (page - 1) * pageSize,
            });
            const total = resultados.length < pageSize
                ? (page - 1) * pageSize + resultados.length
                : page * pageSize + 1;
            return { datos: resultados || [], total };
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('FConteos');
        updateToolbar({});
        return () => {
            resetToolbar();
        };
    }, [setActiveModule, updateToolbar, resetToolbar]);
    const handleRefresh = () => {
        setPage(1);
        setDateTrigger((n) => n + 1);
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
    const handleTableChange = (pagination) => {
        setPage(pagination.current);
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
            fileName: `Conteos_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Conteos',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    const abrirDetalle = (record) => {
        navigate(`/FConteos/${record.documento}`, { state: record });
    };
    const columns = [
        {
            title: 'Documento',
            dataIndex: 'documento',
            key: 'documento',
            width: 140,
            render: (doc, record) => (_jsx(Text, { strong: true, className: "paces-doc-link", onClick: () => abrirDetalle(record), children: doc })),
        },
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 120,
            render: (f) => _jsx(Text, { children: formatDate(f) }),
        },
        {
            title: 'Almacén',
            dataIndex: 'almacen',
            key: 'almacen',
            width: 150,
            render: (val) => _jsx(Text, { children: toTitleCase(val) }),
        },
        {
            title: 'Usuario',
            dataIndex: 'usuario',
            key: 'usuario',
            width: 150,
            render: (val) => _jsx(Text, { children: toTitleCase(val) || '-' }),
        },
        {
            title: 'Suplidor',
            dataIndex: 'nombreSuplidor',
            key: 'nombreSuplidor',
            width: 200,
            render: (val, record) => _jsx(Text, { children: val ? toTitleCase(val) : record.codigoSuplidor || '-' }),
        },
        {
            title: 'Cantidad',
            dataIndex: 'cantidad',
            key: 'cantidad',
            width: 100,
            align: 'right',
            render: (val) => (_jsx(Text, { children: val.toLocaleString('es-DO') })),
        },
        {
            title: 'Costo',
            dataIndex: 'costo',
            key: 'costo',
            width: 130,
            align: 'right',
            render: (val) => _jsx(Text, { children: formatCurrency(val) }),
        },
        {
            title: 'Bloqueado',
            dataIndex: 'bloqueado',
            key: 'bloqueado',
            width: 100,
            render: (val) => (_jsx(Tag, { color: val ? 'red' : 'green', children: val ? 'Sí' : 'No' })),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar conteos", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsxs(Card, { styles: { body: { padding: 0 } }, className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, children: [_jsx(CatalogoListadoToolbar, { onSearch: () => { }, pageSize: 25, onPageSizeChange: (v) => { }, ocultarPageSize: true, onReload: handleRefresh, onExportarExcel: handleExportarExcel, filtros: _jsx(RangePicker, { style: { width: 180 }, format: "YYYY-MM-DD", onChange: handleDateChange, placeholder: ["Desde", "Hasta"] }) }), _jsx(Table, { columns: columns, dataSource: data?.datos || [], rowKey: "documento", loading: isLoading, scroll: { x: 1200 }, size: "middle", locale: {
                            emptyText: (_jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No hay conteos registrados" }) })),
                        }, onRow: (record) => ({
                            onClick: () => abrirDetalle(record),
                            style: { cursor: 'pointer' },
                        }), onChange: handleTableChange, pagination: {
                            current: page,
                            pageSize,
                            total: data?.total || 0,
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        }, className: "paces-border-top paces-list-table" })] })] }));
};
export default Conteos;
