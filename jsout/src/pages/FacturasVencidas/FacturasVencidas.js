import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Table, Input, InputNumber, Select, Button, Typography, message, Spin, DatePicker, Space, Row, Col, Empty, } from 'antd';
import { SearchOutlined, ReloadOutlined, DownloadOutlined, CloseOutlined, } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { formatCurrency, formatDateParam } from '../../utils/formats';
import PermissionGate from '../../components/PermissionGate';
import ModalBuscarSuplidor from '../../components/ModalBuscarSuplidor/ModalBuscarSuplidor';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import { facturasVencidasApi } from '../../api/facturasVencidasApi';
const { Text } = Typography;
/* ───── Helpers de formato ───── */
function formatDate(val) {
    if (!val)
        return '';
    const d = dayjs(val);
    if (!d.isValid())
        return val;
    return d.format('DD/MM/YYYY');
}
const FILAS_POR_PAGINA = 25;
/* ───── Componente principal ───── */
const FacturasVencidas = () => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    /* ───── Estados ───── */
    // Filtros
    const [fechaCorte, setFechaCorte] = useState(dayjs());
    const [codSuplidor, setCodSuplidor] = useState('');
    const [nomSuplidor, setNomSuplidor] = useState('');
    const [diasMinimo, setDiasMinimo] = useState(1);
    // Datos
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    // Búsqueda y paginación
    const [searchText, setSearchText] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(FILAS_POR_PAGINA);
    // Modal de búsqueda de suplidor
    const [modalSuplidorAbierto, setModalSuplidorAbierto] = useState(false);
    /* ───── Cargar datos ───── */
    const generarReporte = useCallback(async () => {
        setLoading(true);
        try {
            const corte = formatDateParam(fechaCorte.toDate());
            const resultados = await facturasVencidasApi.obtenerFacturasVencidas(sucursalActiva, corte, codSuplidor || undefined, diasMinimo);
            setData(resultados || []);
            setSearchText('');
            setPage(1);
            if (!resultados || resultados.length === 0) {
                message.info('No se encontraron registros para los filtros seleccionados');
            }
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al generar el reporte');
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva, fechaCorte, codSuplidor, diasMinimo]);
    /* ───── UI setup ───── */
    useEffect(() => {
        setActiveModule('RFACVEN');
        setPageTitleOverride('Reporte de Facturas de Suplidor Vencidas');
        updateToolbar({});
        return () => {
            resetToolbar();
            setPageTitleOverride('');
        };
    }, [setActiveModule, setPageTitleOverride, updateToolbar, resetToolbar]);
    /* ───── Handlers ───── */
    const handleSearch = (value) => {
        setSearchText(value);
        setPage(1);
    };
    const handleRefresh = () => {
        generarReporte();
    };
    const limpiarFiltros = () => {
        setFechaCorte(dayjs());
        setCodSuplidor('');
        setNomSuplidor('');
        setDiasMinimo(1);
        setData([]);
        setSearchText('');
        setPage(1);
    };
    /* ───── Handlers de búsqueda de suplidor ───── */
    const seleccionarSuplidor = (item) => {
        setCodSuplidor(item.codigo);
        setNomSuplidor(item.nombre);
        setModalSuplidorAbierto(false);
    };
    const limpiarSuplidor = () => {
        setCodSuplidor('');
        setNomSuplidor('');
    };
    /* ───── Procesar datos: filtro local ───── */
    const filteredData = useMemo(() => {
        if (!searchText)
            return data;
        const term = searchText.toLowerCase();
        return data.filter((item) => (item.noDocumento || '').toLowerCase().includes(term) ||
            (item.ncf || '').toLowerCase().includes(term) ||
            (item.nombreSuplidor || '').toLowerCase().includes(term));
    }, [data, searchText]);
    /* ───── Totales para summary ───── */
    const summaryTotals = useMemo(() => {
        let total = 0;
        let saldo = 0;
        for (const item of filteredData) {
            total += item.total || 0;
            saldo += item.saldoPendiente || 0;
        }
        return { total, saldo };
    }, [filteredData]);
    /* ───── Exportar Excel ───── */
    const exportarExcel = useCallback(async () => {
        if (filteredData.length === 0) {
            message.warning('No hay datos para exportar');
            return;
        }
        const companyName = await getCompanyName(sucursalActiva);
        const columnHeaders = ['Documento', 'Fecha Doc.', 'Suplidor', 'Días Crédito', 'Fecha Vence', 'Días Vencidos', 'Total', 'Saldo Pendiente', 'NCF'];
        const dataRows = filteredData.map((item) => [
            item.noDocumento || '',
            formatDate(item.fechaDocumento),
            item.nombreSuplidor || '',
            item.diasCredito ?? 0,
            formatDate(item.fechaVence),
            item.diasVencidos ?? 0,
            item.total ?? 0,
            item.saldoPendiente ?? 0,
            item.ncf || '',
        ]);
        dataRows.push([
            'Totales', '', '', '', '', '', summaryTotals.total, summaryTotals.saldo, '',
        ]);
        exportToExcel({
            companyName,
            columnHeaders,
            dataRows,
            sheetName: 'Facturas Vencidas',
            columnWidths: columnHeaders.map(() => ({ wch: 18 })),
        });
    }, [sucursalActiva, filteredData, summaryTotals]);
    /* ───── Columnas ───── */
    const columns = [
        {
            title: 'Documento',
            dataIndex: 'noDocumento',
            key: 'noDocumento',
            width: 150,
            render: (doc) => _jsx(Text, { strong: true, children: doc || '' }),
        },
        {
            title: 'Fecha Doc.',
            dataIndex: 'fechaDocumento',
            key: 'fechaDocumento',
            width: 110,
            render: (f) => _jsx(Text, { children: formatDate(f) }),
        },
        {
            title: 'Suplidor',
            dataIndex: 'nombreSuplidor',
            key: 'nombreSuplidor',
            render: (nombre) => _jsx(Text, { children: nombre || '' }),
        },
        {
            title: 'Días Crédito',
            dataIndex: 'diasCredito',
            key: 'diasCredito',
            width: 100,
            align: 'right',
            render: (val) => _jsx(Text, { children: val ?? 0 }),
        },
        {
            title: 'Fecha Vence',
            dataIndex: 'fechaVence',
            key: 'fechaVence',
            width: 110,
            render: (f) => _jsx(Text, { children: formatDate(f) }),
        },
        {
            title: 'Días Vencidos',
            dataIndex: 'diasVencidos',
            key: 'diasVencidos',
            width: 120,
            align: 'right',
            render: (val) => (_jsx(Text, { style: { color: (val || 0) > 0 ? '#ff4d4f' : undefined, fontWeight: (val || 0) > 0 ? 600 : undefined }, children: val ?? 0 })),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 140,
            align: 'right',
            render: (val) => _jsx(Text, { strong: true, className: "paces-text-total", children: formatCurrency(val || 0) }),
        },
        {
            title: 'Saldo Pendiente',
            dataIndex: 'saldoPendiente',
            key: 'saldoPendiente',
            width: 140,
            align: 'right',
            render: (val) => _jsx(Text, { strong: true, className: "paces-text-total", children: formatCurrency(val || 0) }),
        },
        {
            title: 'NCF',
            dataIndex: 'ncf',
            key: 'ncf',
            width: 150,
            render: (ncf) => _jsx(Text, { children: ncf || '' }),
        },
    ];
    /* ───── Summary row ───── */
    const renderSummary = () => (_jsx(Table.Summary, { fixed: true, children: _jsxs(Table.Summary.Row, { children: [_jsx(Table.Summary.Cell, { index: 0, colSpan: 3, children: _jsx(Text, { strong: true, style: { fontSize: 13 }, children: "Totales" }) }), _jsx(Table.Summary.Cell, { index: 3 }), _jsx(Table.Summary.Cell, { index: 4 }), _jsx(Table.Summary.Cell, { index: 5 }), _jsx(Table.Summary.Cell, { index: 6, align: "right", children: _jsx(Text, { strong: true, className: "paces-text-total", children: formatCurrency(summaryTotals.total) }) }), _jsx(Table.Summary.Cell, { index: 7, align: "right", children: _jsx(Text, { strong: true, className: "paces-text-total", children: formatCurrency(summaryTotals.saldo) }) }), _jsx(Table.Summary.Cell, { index: 8 })] }) }));
    /* ───── Paginación ───── */
    const paginationProps = {
        current: page,
        pageSize,
        showSizeChanger: false,
        showTotal: (t) => `${t} registros`,
        onChange: (p) => setPage(p),
    };
    /* ───── Render ───── */
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: `
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .paces-card-erp { box-shadow: none !important; border: none !important; }
          .paces-card { box-shadow: none !important; border: none !important; }
          .ant-table { font-size: 9pt; }
          .ant-table-thead > tr > th { background: #f0f0f0 !important; }
          .ant-table-pagination { display: none !important; }
          .ant-spin-nested-loading { overflow: visible !important; }
        }
      ` }), _jsx(Card, { className: "paces-card no-print", style: { marginBottom: 16 }, children: _jsx("div", { style: { padding: '16px 24px' }, children: _jsxs(Row, { gutter: [16, 12], children: [_jsxs(Col, { xs: 24, sm: 12, md: 4, children: [_jsx("div", { style: { marginBottom: 4 }, children: _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Fecha corte" }) }), _jsx(DatePicker, { value: fechaCorte, onChange: (d) => d && setFechaCorte(d), style: { width: '100%' }, format: "DD/MM/YYYY" })] }), _jsxs(Col, { xs: 24, sm: 12, md: 5, children: [_jsx("div", { style: { marginBottom: 4 }, children: _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Suplidor" }) }), _jsxs(Space.Compact, { style: { width: '100%' }, children: [_jsx(Input, { placeholder: "Buscar suplidor...", value: nomSuplidor, readOnly: true, style: { width: '100%' } }), _jsx(Button, { icon: _jsx(SearchOutlined, {}), onClick: () => setModalSuplidorAbierto(true) }), nomSuplidor ? (_jsx(Button, { icon: _jsx(CloseOutlined, {}), onClick: limpiarSuplidor })) : null] })] }), _jsxs(Col, { xs: 24, sm: 12, md: 3, children: [_jsx("div", { style: { marginBottom: 4 }, children: _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "D\u00EDas m\u00EDnimo vencidos" }) }), _jsx(InputNumber, { value: diasMinimo, onChange: (v) => setDiasMinimo(v ?? 1), min: 1, style: { width: '100%' } })] }), _jsxs(Col, { xs: 24, sm: 12, md: 2, children: [_jsx("div", { style: { marginBottom: 4 }, children: _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "\u00A0" }) }), _jsxs(Space, { children: [_jsx(Button, { type: "primary", onClick: generarReporte, loading: loading, children: "Generar" }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: limpiarFiltros })] })] })] }) }) }), loading ? (_jsx("div", { style: { textAlign: 'center', padding: 80 }, children: _jsx(Spin, { size: "large" }) })) : data.length > 0 ? (_jsxs(Card, { className: "paces-card-erp", styles: { body: { padding: 0 } }, style: { borderRadius: 8, overflow: 'hidden' }, children: [_jsx("div", { className: "no-print", style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx(Input.Search, { placeholder: "Buscar por documento, suplidor o NCF...", allowClear: true, onSearch: handleSearch, onKeyDown: (e) => {
                                        if (e.key === 'Escape') {
                                            e.target.blur();
                                            handleSearch('');
                                        }
                                    }, style: { width: 400 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx(Select, { style: { width: 65 }, value: pageSize, onChange: (v) => { setPageSize(v); setPage(1); }, options: [
                                        { value: 25, label: '25' },
                                        { value: 50, label: '50' },
                                        { value: 100, label: '100' },
                                    ] }), _jsx("div", { style: { flex: 1 } }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(DownloadOutlined, {}), onClick: exportarExcel, children: "Exportar" }) }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: handleRefresh })] }) }), _jsx(Table, { columns: columns, dataSource: filteredData, rowKey: "transacId", loading: false, scroll: { x: 1300 }, size: "middle", pagination: paginationProps, summary: renderSummary, className: "paces-border-top paces-list-table" })] })) : (data.length === 0 && !loading && (_jsx(Card, { className: "paces-card-erp", styles: { body: { padding: 0 } }, style: { borderRadius: 8, overflow: 'hidden' }, children: _jsx("div", { style: { minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Presione 'Generar' para obtener el reporte" }) }) }))), _jsx(ModalBuscarSuplidor, { open: modalSuplidorAbierto, onClose: () => setModalSuplidorAbierto(false), onSelect: seleccionarSuplidor, buscar: async (filtro) => {
                    const { proveedorApi } = await import('../../api/proveedorApi');
                    const lista = await proveedorApi.obtenerListado(sucursalActiva);
                    if (!filtro)
                        return lista;
                    const term = filtro.toLowerCase();
                    return (lista || []).filter((e) => e.codigo?.toLowerCase().includes(term) ||
                        e.nombre?.toLowerCase().includes(term));
                }, mostrarRnc: false, destroyOnClose: true, autoFocus: true })] }));
};
export default FacturasVencidas;
