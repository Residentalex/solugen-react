import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Table, Typography, Select, Input, Button, Spin, Alert, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { transaccionApi } from '../../api/transaccionApi';
import { documentosApi } from '../../api/documentosApi';
import ReporteToolbar from '../../components/ReporteToolbar';
import FiltrosDocumento from '../../components/FiltrosDocumento/FiltrosDocumento';
import { formatCurrency, formatDateRaw, formatDateParam, toTitleCase } from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import dayjs from 'dayjs';
const { Text } = Typography;
const DocumentoSinAsiento = () => {
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const sucursalesDisponibles = useCompanyStore((s) => s.data.sucursales);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [exportando, setExportando] = useState(false);
    const rangoDefault = useMemo(() => ({
        desde: formatDateParam(dayjs().subtract(30, 'day').toDate()),
        hasta: formatDateParam(dayjs().toDate()),
    }), []);
    const [filtros, setFiltros] = useState({});
    const [searchText, setSearchText] = useState('');
    const [sucursalFiltro, setSucursalFiltro] = useState(undefined);
    const [tipoDoc, setTipoDoc] = useState(undefined);
    const [documentos, setDocumentos] = useState([]);
    useEffect(() => {
        documentosApi.obtenerListado(sucursalActiva).then(setDocumentos).catch(() => { });
    }, [sucursalActiva]);
    useEffect(() => {
        setActiveModule('RDocumentoSinAsiento');
    }, [setActiveModule]);
    const cargarDatos = useCallback(async () => {
        setLoading(true);
        setLoadingError(false);
        try {
            const desde = filtros.desde ?? rangoDefault.desde;
            const hasta = filtros.hasta ?? rangoDefault.hasta;
            const result = await transaccionApi.obtenerDocumentosSinAsiento(sucursalActiva, desde, hasta, tipoDoc || undefined, undefined, sucursalFiltro);
            setData(result);
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar documentos sin asiento';
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva, filtros, tipoDoc, sucursalFiltro, rangoDefault]);
    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);
    /* ───── Filtro local ───── */
    const filteredData = useMemo(() => {
        if (!searchText)
            return data;
        const t = searchText.toLowerCase();
        return data.filter((r) => `${r.tipoDocumento || ''}-${r.noDocumento || ''}`.toLowerCase().includes(t) ||
            (r.entidad || '').toLowerCase().includes(t) ||
            (r.concepto || '').toLowerCase().includes(t) ||
            (r.sucursalDocumento || '').toLowerCase().includes(t));
    }, [data, searchText]);
    /* ───── Totales ───── */
    const totalDocumentos = filteredData.length;
    const totalMonto = filteredData.reduce((sum, r) => sum + (r.total || 0), 0);
    /* ───── Exportar Excel ───── */
    const handleExportarExcel = useCallback(async () => {
        if (filteredData.length === 0) {
            return;
        }
        setExportando(true);
        try {
            const companyName = await getCompanyName(sucursalActiva);
            const columnHeaders = ['Documento', 'Fecha', 'Entidad', 'Concepto', 'Sucursal', 'Total', 'Estado'];
            const dataRows = filteredData.map((item) => [
                `${item.tipoDocumento || ''}-${item.noDocumento || ''}`,
                item.fecha,
                item.entidad || '',
                item.concepto || '',
                item.sucursalDocumento || '',
                item.total ?? 0,
                item.estado || '',
            ]);
            exportToExcel({
                companyName,
                columnHeaders,
                dataRows,
                sheetName: 'DocumentosSinAsiento',
                columnWidths: columnHeaders.map(() => ({ wch: 20 })),
            });
        }
        finally {
            setExportando(false);
        }
    }, [sucursalActiva, filteredData]);
    /* ───── Exportar PDF (window.print) ───── */
    const handleExportarPDF = useCallback(() => {
        window.print();
    }, []);
    /* ───── Columnas ───── */
    const columns = [
        {
            title: 'Documento',
            key: 'documento',
            width: 180,
            fixed: 'left',
            render: (_, record) => (_jsx(Link, { to: `/FAsientoContable/${record.id}`, className: "paces-doc-link", children: _jsxs(Text, { strong: true, children: [record.tipoDocumento || '', "-", record.noDocumento || ''] }) })),
        },
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 110,
            render: (v) => _jsx(Text, { children: formatDateRaw(v) }),
        },
        {
            title: 'Entidad',
            key: 'entidad',
            ellipsis: true,
            render: (_, record) => (_jsx(Text, { children: toTitleCase(record.entidad || '') })),
        },
        {
            title: 'Concepto',
            key: 'concepto',
            width: 260,
            ellipsis: true,
            render: (_, record) => (_jsx(Text, { children: toTitleCase(record.concepto || '') })),
        },
        {
            title: 'Sucursal',
            dataIndex: 'sucursalDocumento',
            key: 'sucursal',
            width: 140,
            render: (v) => _jsx(Text, { children: v || '' }),
        },
        {
            title: 'Total',
            key: 'total',
            width: 130,
            align: 'right',
            render: (_, record) => (_jsx(Text, { children: formatCurrency(record.total ?? 0) })),
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 110,
            render: (est) => _jsx(EstadoColumnCell, { estado: est }),
        },
    ];
    /* ───── Opciones tipo doc ───── */
    const docOptions = useMemo(() => documentos.map((d) => ({ value: d.codigo, label: `${d.codigo} - ${d.nombre || ''}` })), [documentos]);
    /* ───── Filtro popover ───── */
    const filtrosPopover = (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("div", { style: { marginBottom: 4, color: '#666', fontSize: 13 }, children: "Sucursal" }), _jsx(Select, { style: { width: '100%' }, placeholder: "Todas", allowClear: true, value: sucursalFiltro, onChange: (val) => setSucursalFiltro(val), options: (sucursalesDisponibles || [])
                            .filter((s) => s.sucursal !== undefined)
                            .map((s) => ({
                            value: String(s.sucursal),
                            label: s.nombre || s.codigo || `Sucursal ${s.sucursal}`,
                        })) })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("div", { style: { marginBottom: 4, color: '#666', fontSize: 13 }, children: "Documento" }), _jsx(Select, { style: { width: '100%' }, placeholder: "Todos", allowClear: true, showSearch: true, value: tipoDoc, onChange: (val) => setTipoDoc(val), options: docOptions, filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()) })] })] }));
    return (_jsxs("div", { children: [_jsx(ReporteToolbar, { onVolver: () => navigate('/'), onConsultar: cargarDatos, loading: loading, onExportarExcel: handleExportarExcel, onExportarPDF: handleExportarPDF, exportando: exportando, extraLeft: _jsx(FiltrosDocumento, { filtros: filtros, onAplicar: (nuevos) => { setFiltros(nuevos); }, opcionesEstado: [], rangoDefault: rangoDefault, extraFiltros: filtrosPopover }) }), loadingError && (_jsx(Alert, { message: "Error al cargar el reporte", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: cargarDatos, children: "Reintentar" }) })), _jsxs(Spin, { spinning: loading, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Resumen" }), style: { marginBottom: 16 }, children: _jsxs(Space, { size: 24, wrap: true, children: [_jsxs("div", { children: [_jsx("span", { className: "paces-text-secondary", children: "Total documentos: " }), _jsx(Text, { strong: true, children: totalDocumentos })] }), _jsxs("div", { children: [_jsx("span", { className: "paces-text-secondary", children: "Total sin asiento: " }), _jsx(Text, { strong: true, children: formatCurrency(totalMonto) })] })] }) }), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsx(Input.Search, { placeholder: "Buscar documento, entidad...", allowClear: true, onSearch: (val) => setSearchText(val), style: { width: 400, marginBottom: 16 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }) }), _jsx(Table, { className: "paces-border-top paces-list-table", dataSource: filteredData, columns: columns, rowKey: "id", size: "small", pagination: { pageSize: 25, showTotal: (t) => `${t} registros` }, scroll: { x: 1100 } })] })] })] }));
};
export default DocumentoSinAsiento;
