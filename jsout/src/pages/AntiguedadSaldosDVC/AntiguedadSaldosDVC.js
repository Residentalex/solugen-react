import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Card, Table, Input, Select, Button, Typography, message, Spin, DatePicker, Checkbox, Modal, Space, Row, Col, Empty, } from 'antd';
import { SearchOutlined, ReloadOutlined, PrinterOutlined, DownloadOutlined, CloseOutlined, } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { antiguedadSaldosDVCApi } from '../../api/antiguedadSaldosDVCApi';
import { conceptosApi } from '../../api/conceptosApi';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { toTitleCase, formatCurrency } from '../../utils/formats';
import PermissionGate from '../../components/PermissionGate';
import ModalBuscarSuplidor from '../../components/ModalBuscarSuplidor/ModalBuscarSuplidor';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
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
function formatDateParam(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${y}${m}${day}${hh}${mm}${ss}`;
}
function procesarBalancesDVC(items) {
    return items
        .map((item) => {
        // 1. Filtrar nulos de transacciones asociadas
        const transaccionesValidas = (item.transaccionesAsociadas || []).filter((x) => x != null);
        // 2. Invertir total si origen cuenta es Credito y no hay transacciones asociadas
        const total = item.documento?.origenCuenta === 'Credito' && transaccionesValidas.length === 0
            ? (item.total || 0) * -1
            : (item.total || 0);
        const creditos = total;
        const debitos = transaccionesValidas.reduce((sum, t) => sum + (t.monto || 0), 0);
        return {
            ...item,
            creditos,
            debitos,
            total: creditos - debitos,
        };
    })
        .filter((item) => Math.abs(item.total) > 1) // 3. Filtrar saldos conciliados
        .sort((a, b) => new Date(a.fechaDocumento).getTime() - new Date(b.fechaDocumento).getTime()); // 4. Ordenar por fecha
}
const FILAS_POR_PAGINA = 25;
/* ───── Componente principal ───── */
const AntiguedadSaldosDVC = () => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const titulo = 'Antigüedad de Saldos - DVC';
    const codigoPantalla = 'RAntiguedadSaldoDVC';
    const entidadLabel = 'Suplidor';
    /* ───── Estados ───── */
    // Filtros
    const [fechaHasta, setFechaHasta] = useState(dayjs());
    const [codEntidad, setCodEntidad] = useState('');
    const [nomEntidad, setNomEntidad] = useState('');
    const [codTipo, setCodTipo] = useState('');
    const [nomTipo, setNomTipo] = useState('');
    const [codSucursalFiltro, setCodSucursalFiltro] = useState('');
    const [nomSucursalFiltro, setNomSucursalFiltro] = useState('');
    const [detallado, setDetallado] = useState(true);
    // Datos
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    // Impresión PDF
    const [imprimiendo, setImprimiendo] = useState(false);
    // Búsqueda y paginación
    const [searchText, setSearchText] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(FILAS_POR_PAGINA);
    // Modal de búsqueda de suplidor
    const [modalEntidadAbierto, setModalEntidadAbierto] = useState(false);
    // Modal de búsqueda de tipo DVC
    const [modalTipoAbierto, setModalTipoAbierto] = useState(false);
    const [tipos, setTipos] = useState([]);
    const [tiposOrig, setTiposOrig] = useState([]);
    const [buscandoTipo, setBuscandoTipo] = useState(false);
    const [_searchTipo, setSearchTipo] = useState('');
    // Modal de búsqueda de sucursal/compañía
    const [modalSucursalAbierto, setModalSucursalAbierto] = useState(false);
    const [sucursales, setSucursales] = useState([]);
    const [sucursalesOrig, setSucursalesOrig] = useState([]);
    const [buscandoSucursal, setBuscandoSucursal] = useState(false);
    const [_searchSucursal, setSearchSucursal] = useState('');
    const tipoSearchRef = useRef(null);
    const sucursalSearchRef = useRef(null);
    useEffect(() => {
        if (modalTipoAbierto) {
            const timer = setTimeout(() => {
                tipoSearchRef.current?.focus?.();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [modalTipoAbierto]);
    useEffect(() => {
        if (modalSucursalAbierto) {
            const timer = setTimeout(() => {
                sucursalSearchRef.current?.focus?.();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [modalSucursalAbierto]);
    /* ───── Cargar datos ───── */
    const generarReporte = useCallback(async () => {
        setLoading(true);
        try {
            const hasta = formatDateParam(fechaHasta.toDate());
            const resultados = await antiguedadSaldosDVCApi.obtenerBalances(sucursalActiva, hasta, codEntidad || undefined, codTipo || undefined, codSucursalFiltro || undefined);
            const procesados = procesarBalancesDVC(resultados || []);
            setData(procesados);
            setSearchText('');
            setPage(1);
            if (!procesados || procesados.length === 0) {
                message.info('No se encontraron registros para los filtros seleccionados');
            }
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al generar el reporte');
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva, fechaHasta, codEntidad, codTipo, codSucursalFiltro]);
    /* ───── UI setup ───── */
    useEffect(() => {
        setActiveModule(codigoPantalla);
        setPageTitleOverride(titulo);
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
    const handlePrint = async () => {
        if (!fechaHasta || data.length === 0) {
            message.warning('No hay datos para imprimir');
            return;
        }
        setImprimiendo(true);
        try {
            const hasta = formatDateParam(fechaHasta.toDate());
            const blob = await antiguedadSaldosDVCApi.generarPDF(sucursalActiva, hasta, codEntidad || undefined, codTipo || undefined, codSucursalFiltro || undefined);
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al generar el PDF');
        }
        finally {
            setImprimiendo(false);
        }
    };
    const limpiarFiltros = () => {
        setFechaHasta(dayjs());
        setCodEntidad('');
        setNomEntidad('');
        setCodTipo('');
        setNomTipo('');
        setCodSucursalFiltro('');
        setNomSucursalFiltro('');
        setDetallado(true);
        setData([]);
        setSearchText('');
        setPage(1);
    };
    /* ───── Handlers de búsqueda de suplidor ───── */
    const seleccionarEntidad = (item) => {
        setCodEntidad(item.codigo);
        setNomEntidad(item.nombre);
        setModalEntidadAbierto(false);
    };
    const limpiarEntidad = () => {
        setCodEntidad('');
        setNomEntidad('');
    };
    /* ───── Handlers de búsqueda de tipo DVC ───── */
    const abrirModalTipo = async () => {
        setModalTipoAbierto(true);
        setSearchTipo('');
        setBuscandoTipo(true);
        try {
            const lista = await antiguedadSaldosDVCApi.obtenerTipos(sucursalActiva);
            setTipos(lista || []);
            setTiposOrig(lista || []);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar tipos');
        }
        finally {
            setBuscandoTipo(false);
        }
    };
    const buscarTipo = (valor) => {
        setSearchTipo(valor);
        if (!valor) {
            setTipos(tiposOrig);
            return;
        }
        const filtradas = tiposOrig.filter((t) => t.nombre?.toLowerCase().includes(valor.toLowerCase()) ||
            t.codigo?.toLowerCase().includes(valor.toLowerCase()));
        setTipos(filtradas);
    };
    const seleccionarTipo = (item) => {
        setCodTipo(item.codigo);
        setNomTipo(item.nombre);
        setModalTipoAbierto(false);
    };
    const limpiarTipo = () => {
        setCodTipo('');
        setNomTipo('');
    };
    /* ───── Handlers de búsqueda de sucursal/compañía ───── */
    const abrirModalSucursal = async () => {
        setModalSucursalAbierto(true);
        setSearchSucursal('');
        setBuscandoSucursal(true);
        try {
            const lista = await conceptosApi.obtenerSucursales(sucursalActiva);
            setSucursales(lista || []);
            setSucursalesOrig(lista || []);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar sucursales');
        }
        finally {
            setBuscandoSucursal(false);
        }
    };
    const buscarSucursal = (valor) => {
        setSearchSucursal(valor);
        if (!valor) {
            setSucursales(sucursalesOrig);
            return;
        }
        const term = valor.toLowerCase();
        const filtradas = sucursalesOrig.filter((s) => s.nombre?.toLowerCase().includes(term) ||
            s.codigo?.toLowerCase().includes(term));
        setSucursales(filtradas);
    };
    const seleccionarSucursal = (item) => {
        setCodSucursalFiltro(item.idExterno || item.codigo);
        setNomSucursalFiltro(item.nombre);
        setModalSucursalAbierto(false);
    };
    const limpiarSucursal = () => {
        setCodSucursalFiltro('');
        setNomSucursalFiltro('');
    };
    /* ───── Procesar datos: filtro local ───── */
    const filteredData = useMemo(() => {
        if (!searchText)
            return data;
        const term = searchText.toLowerCase();
        return data.filter((item) => `${item.tipoDocumento || ''}-${item.noDocumento || ''}`.toLowerCase().includes(term) ||
            (item.ncf || '').toLowerCase().includes(term) ||
            (item.entidad?.nombre || item.nombreEntidad || '').toLowerCase().includes(term));
    }, [data, searchText]);
    /* ───── Procesar datos: aging ───── */
    const calcAging = useCallback((item) => {
        const diff = fechaHasta.diff(dayjs(item.fechaDocumento), 'day');
        const balance = (item.creditos || 0) - (item.debitos || 0);
        return {
            monto0_30: diff >= 0 && diff <= 30 ? balance : 0,
            monto31_60: diff >= 31 && diff <= 60 ? balance : 0,
            monto61_90: diff >= 61 && diff <= 90 ? balance : 0,
            monto91_120: diff >= 91 && diff <= 120 ? balance : 0,
            montoMas120: diff > 120 ? balance : 0,
        };
    }, [fechaHasta]);
    const agingData = useMemo(() => {
        return filteredData.map((item) => ({ ...item, ...calcAging(item) }));
    }, [filteredData, calcAging]);
    const resumenData = useMemo(() => {
        const map = new Map();
        for (const item of filteredData) {
            const key = item.entidad?.codigo || item.codigoEntidad || '';
            const nombre = item.entidad?.nombre || item.nombreEntidad || '';
            const moneda = item.moneda?.nombre || getMonedaSucursalActiva().codigo;
            const aging = calcAging(item);
            const existente = map.get(key);
            if (existente) {
                existente.total += item.total || 0;
                existente.impuestos = (existente.impuestos || 0) + (item.impuestos || 0);
                existente.monto0_30 += aging.monto0_30;
                existente.monto31_60 += aging.monto31_60;
                existente.monto61_90 += aging.monto61_90;
                existente.monto91_120 += aging.monto91_120;
                existente.montoMas120 += aging.montoMas120;
            }
            else {
                map.set(key, {
                    key,
                    codigoEntidad: key,
                    nombreEntidad: nombre,
                    total: item.total || 0,
                    impuestos: item.impuestos || 0,
                    monto0_30: aging.monto0_30,
                    monto31_60: aging.monto31_60,
                    monto61_90: aging.monto61_90,
                    monto91_120: aging.monto91_120,
                    montoMas120: aging.montoMas120,
                    moneda,
                });
            }
        }
        return Array.from(map.values());
    }, [filteredData, calcAging]);
    /* ───── Totales para summary ───── */
    const summaryTotals = useMemo(() => {
        const items = detallado ? agingData : resumenData;
        let total = 0;
        let impuestos = 0;
        let m0_30 = 0;
        let m31_60 = 0;
        let m61_90 = 0;
        let m91_120 = 0;
        let mMas120 = 0;
        for (const item of items) {
            total += item.total || 0;
            impuestos += item.impuestos || 0;
            m0_30 += item.monto0_30 || 0;
            m31_60 += item.monto31_60 || 0;
            m61_90 += item.monto61_90 || 0;
            m91_120 += item.monto91_120 || 0;
            mMas120 += item.montoMas120 || 0;
        }
        return { total, impuestos, m0_30, m31_60, m61_90, m91_120, mMas120 };
    }, [detallado, agingData, resumenData]);
    /* ───── Exportar Excel ───── */
    const exportarExcel = useCallback(async () => {
        const items = detallado ? agingData : resumenData;
        if (items.length === 0) {
            message.warning('No hay datos para exportar');
            return;
        }
        const companyName = await getCompanyName(sucursalActiva);
        if (detallado) {
            const columnHeaders = ['Sucursal', 'Fecha', 'Documento', 'NCF', 'Suplidor', 'Tipo DVC', 'Total', 'Impuestos', 'Moneda', '0-30 días', '31-60 días', '61-90 días', '91-120 días', 'Más 120 días'];
            const dataRows = agingData.map((item) => [
                item.sucursal?.nombre || '',
                formatDate(item.fechaDocumento),
                item.tipoDocumento
                    ? `${item.tipoDocumento}-${item.noDocumento}`
                    : (item.noDocumento || ''),
                item.ncf || '',
                item.entidad?.nombre || item.nombreEntidad || '',
                item.tipo?.nombre || '',
                item.total ?? 0,
                item.impuestos ?? 0,
                item.moneda?.nombre || '',
                item.monto0_30 ?? 0,
                item.monto31_60 ?? 0,
                item.monto61_90 ?? 0,
                item.monto91_120 ?? 0,
                item.montoMas120 ?? 0,
            ]);
            dataRows.push([
                'Totales', '', '', '', '', '', summaryTotals.total, summaryTotals.impuestos, '',
                summaryTotals.m0_30, summaryTotals.m31_60, summaryTotals.m61_90,
                summaryTotals.m91_120, summaryTotals.mMas120,
            ]);
            exportToExcel({
                companyName,
                columnHeaders,
                dataRows,
                sheetName: 'Antigüedad',
                columnWidths: columnHeaders.map(() => ({ wch: 18 })),
            });
        }
        else {
            const columnHeaders = ['Suplidor', 'Código', 'Moneda', 'Total', 'Impuestos', '0-30 días', '31-60 días', '61-90 días', '91-120 días', 'Más 120 días'];
            const dataRows = resumenData.map((item) => [
                item.nombreEntidad,
                item.codigoEntidad,
                item.moneda || '',
                item.total,
                item.impuestos ?? 0,
                item.monto0_30,
                item.monto31_60,
                item.monto61_90,
                item.monto91_120,
                item.montoMas120,
            ]);
            dataRows.push([
                'Totales', '', '', summaryTotals.total, summaryTotals.impuestos,
                summaryTotals.m0_30, summaryTotals.m31_60, summaryTotals.m61_90,
                summaryTotals.m91_120, summaryTotals.mMas120,
            ]);
            exportToExcel({
                companyName,
                columnHeaders,
                dataRows,
                sheetName: 'Antigüedad',
                columnWidths: columnHeaders.map(() => ({ wch: 18 })),
            });
        }
    }, [sucursalActiva, detallado, agingData, resumenData, summaryTotals]);
    const columnsDetallado = [
        {
            title: 'Documento',
            key: 'documento',
            width: 180,
            render: (_, record) => {
                const doc = record.tipoDocumento
                    ? `${record.tipoDocumento}-${record.noDocumento}`
                    : record.noDocumento;
                return _jsx(Text, { strong: true, children: doc });
            },
        },
        {
            title: 'NCF',
            dataIndex: 'ncf',
            key: 'ncf',
            width: 140,
            render: (ncf) => _jsx(Text, { children: toTitleCase(ncf || '') }),
        },
        {
            title: 'Fecha',
            dataIndex: 'fechaDocumento',
            key: 'fechaDocumento',
            width: 110,
            render: (f) => _jsx(Text, { children: formatDate(f) }),
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
            title: '0-30 días',
            dataIndex: 'monto0_30',
            key: 'monto0_30',
            width: 120,
            align: 'right',
            render: (val) => _jsx(Text, { children: formatCurrency(val ?? 0) }),
        },
        {
            title: '31-60 días',
            dataIndex: 'monto31_60',
            key: 'monto31_60',
            width: 120,
            align: 'right',
            render: (val) => _jsx(Text, { children: formatCurrency(val ?? 0) }),
        },
        {
            title: '61-90 días',
            dataIndex: 'monto61_90',
            key: 'monto61_90',
            width: 120,
            align: 'right',
            render: (val) => _jsx(Text, { children: formatCurrency(val ?? 0) }),
        },
        {
            title: '91-120 días',
            dataIndex: 'monto91_120',
            key: 'monto91_120',
            width: 120,
            align: 'right',
            render: (val) => _jsx(Text, { children: formatCurrency(val ?? 0) }),
        },
        {
            title: 'Más 120 días',
            dataIndex: 'montoMas120',
            key: 'montoMas120',
            width: 120,
            align: 'right',
            render: (val) => _jsx(Text, { children: formatCurrency(val ?? 0) }),
        },
    ];
    /* ───── Columnas vista resumida ───── */
    const columnsResumen = [
        {
            title: entidadLabel,
            key: 'entidad',
            width: 260,
            render: (_, record) => (_jsx(Text, { strong: true, children: toTitleCase(record.nombreEntidad || '') })),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 140,
            align: 'right',
            render: (val) => _jsx(Text, { strong: true, className: "paces-text-total", children: formatCurrency(val ?? 0) }),
        },
        {
            title: '0-30 días',
            dataIndex: 'monto0_30',
            key: 'monto0_30',
            width: 120,
            align: 'right',
            render: (val) => _jsx(Text, { children: formatCurrency(val ?? 0) }),
        },
        {
            title: '31-60 días',
            dataIndex: 'monto31_60',
            key: 'monto31_60',
            width: 120,
            align: 'right',
            render: (val) => _jsx(Text, { children: formatCurrency(val ?? 0) }),
        },
        {
            title: '61-90 días',
            dataIndex: 'monto61_90',
            key: 'monto61_90',
            width: 120,
            align: 'right',
            render: (val) => _jsx(Text, { children: formatCurrency(val ?? 0) }),
        },
        {
            title: '91-120 días',
            dataIndex: 'monto91_120',
            key: 'monto91_120',
            width: 120,
            align: 'right',
            render: (val) => _jsx(Text, { children: formatCurrency(val ?? 0) }),
        },
        {
            title: 'Más 120 días',
            dataIndex: 'montoMas120',
            key: 'montoMas120',
            width: 120,
            align: 'right',
            render: (val) => _jsx(Text, { children: formatCurrency(val ?? 0) }),
        },
    ];
    /* ───── Summary row ───── */
    const renderSummaryDetallado = () => (_jsx(Table.Summary, { fixed: true, children: _jsxs(Table.Summary.Row, { children: [_jsx(Table.Summary.Cell, { index: 0, colSpan: 3, children: _jsx(Text, { strong: true, style: { fontSize: 13 }, children: "Totales" }) }), _jsx(Table.Summary.Cell, { index: 3, align: "right", children: _jsx(Text, { strong: true, className: "paces-text-total", children: formatCurrency(summaryTotals.total) }) }), _jsx(Table.Summary.Cell, { index: 4, align: "right", children: _jsx(Text, { strong: true, children: formatCurrency(summaryTotals.m0_30) }) }), _jsx(Table.Summary.Cell, { index: 5, align: "right", children: _jsx(Text, { strong: true, children: formatCurrency(summaryTotals.m31_60) }) }), _jsx(Table.Summary.Cell, { index: 6, align: "right", children: _jsx(Text, { strong: true, children: formatCurrency(summaryTotals.m61_90) }) }), _jsx(Table.Summary.Cell, { index: 7, align: "right", children: _jsx(Text, { strong: true, children: formatCurrency(summaryTotals.m91_120) }) }), _jsx(Table.Summary.Cell, { index: 8, align: "right", children: _jsx(Text, { strong: true, children: formatCurrency(summaryTotals.mMas120) }) })] }) }));
    const renderSummaryResumen = () => (_jsx(Table.Summary, { fixed: true, children: _jsxs(Table.Summary.Row, { children: [_jsx(Table.Summary.Cell, { index: 0, children: _jsx(Text, { strong: true, style: { fontSize: 13 }, children: "Totales" }) }), _jsx(Table.Summary.Cell, { index: 1, align: "right", children: _jsx(Text, { strong: true, className: "paces-text-total", children: formatCurrency(summaryTotals.total) }) }), _jsx(Table.Summary.Cell, { index: 2, align: "right", children: _jsx(Text, { strong: true, children: formatCurrency(summaryTotals.m0_30) }) }), _jsx(Table.Summary.Cell, { index: 3, align: "right", children: _jsx(Text, { strong: true, children: formatCurrency(summaryTotals.m31_60) }) }), _jsx(Table.Summary.Cell, { index: 4, align: "right", children: _jsx(Text, { strong: true, children: formatCurrency(summaryTotals.m61_90) }) }), _jsx(Table.Summary.Cell, { index: 5, align: "right", children: _jsx(Text, { strong: true, children: formatCurrency(summaryTotals.m91_120) }) }), _jsx(Table.Summary.Cell, { index: 6, align: "right", children: _jsx(Text, { strong: true, children: formatCurrency(summaryTotals.mMas120) }) })] }) }));
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
          .ant-table { font-size: 9pt; }
          .ant-table-thead > tr > th { background: #f0f0f0 !important; }
          .ant-table-pagination { display: none !important; }
          .ant-spin-nested-loading { overflow: visible !important; }
        }
      ` }), _jsx(Card, { className: "paces-card no-print", style: { marginBottom: 16 }, children: _jsxs("div", { style: { padding: '16px 24px' }, children: [_jsxs(Row, { gutter: [16, 12], children: [_jsxs(Col, { xs: 24, sm: 12, md: 4, children: [_jsx("div", { style: { marginBottom: 4 }, children: _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Fecha corte" }) }), _jsx(DatePicker, { value: fechaHasta, onChange: (d) => d && setFechaHasta(d), style: { width: '100%' }, format: "DD/MM/YYYY" })] }), _jsxs(Col, { xs: 24, sm: 12, md: 5, children: [_jsx("div", { style: { marginBottom: 4 }, children: _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Suplidor" }) }), _jsxs(Space.Compact, { style: { width: '100%' }, children: [_jsx(Input, { placeholder: "Buscar suplidor...", value: nomEntidad, readOnly: true, style: { width: '100%' } }), _jsx(Button, { icon: _jsx(SearchOutlined, {}), onClick: () => setModalEntidadAbierto(true) }), nomEntidad ? (_jsx(Button, { icon: _jsx(CloseOutlined, {}), onClick: limpiarEntidad })) : null] })] }), _jsxs(Col, { xs: 24, sm: 12, md: 5, children: [_jsx("div", { style: { marginBottom: 4 }, children: _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Tipo DVC" }) }), _jsx(Input, { placeholder: "Buscar tipo...", value: nomTipo, readOnly: true, style: { width: '100%' }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }), suffix: nomTipo ? (_jsx(Button, { type: "text", size: "small", onClick: limpiarTipo, style: { color: '#999' }, children: "\u00D7" })) : undefined, onClick: abrirModalTipo })] }), _jsxs(Col, { xs: 24, sm: 12, md: 5, children: [_jsx("div", { style: { marginBottom: 4 }, children: _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Compa\u00F1\u00EDa/Sucursal" }) }), _jsx(Input, { placeholder: "Buscar sucursal...", value: nomSucursalFiltro, readOnly: true, style: { width: '100%' }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }), suffix: nomSucursalFiltro ? (_jsx(Button, { type: "text", size: "small", onClick: limpiarSucursal, style: { color: '#999' }, children: "\u00D7" })) : undefined, onClick: abrirModalSucursal })] }), _jsxs(Col, { xs: 24, sm: 12, md: 2, children: [_jsx("div", { style: { marginBottom: 4 }, children: _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "\u00A0" }) }), _jsx(Checkbox, { checked: detallado, onChange: (e) => setDetallado(e.target.checked), children: "Detallado" })] })] }), _jsx(Row, { style: { marginTop: 16 }, children: _jsx(Col, { children: _jsxs(Space, { children: [_jsx(Button, { type: "primary", onClick: generarReporte, loading: loading, children: "Generar" }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: limpiarFiltros })] }) }) })] }) }), loading ? (_jsx("div", { style: { textAlign: 'center', padding: 80 }, children: _jsx(Spin, { size: "large" }) })) : data.length > 0 ? (_jsxs(Card, { className: "paces-card-erp", styles: { body: { padding: 0 } }, style: { borderRadius: 8, overflow: 'hidden' }, children: [_jsx("div", { className: "no-print", style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx(Input.Search, { placeholder: "Buscar por documento, suplidor o NCF...", allowClear: true, onSearch: handleSearch, onKeyDown: (e) => {
                                        if (e.key === 'Escape') {
                                            e.target.blur();
                                            handleSearch('');
                                        }
                                    }, style: { width: 400 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx(Select, { style: { width: 65 }, value: pageSize, onChange: (v) => { setPageSize(v); setPage(1); }, options: [
                                        { value: 25, label: '25' },
                                        { value: 50, label: '50' },
                                        { value: 100, label: '100' },
                                    ] }), _jsx("div", { style: { flex: 1 } }), _jsx(Button, { icon: _jsx(PrinterOutlined, {}), onClick: handlePrint, loading: imprimiendo, children: "Imprimir PDF" }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(DownloadOutlined, {}), onClick: exportarExcel, children: "Exportar" }) }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: handleRefresh })] }) }), detallado ? (_jsx(Table, { columns: columnsDetallado, dataSource: agingData, rowKey: "id", loading: false, scroll: { x: 1300 }, size: "middle", pagination: paginationProps, summary: renderSummaryDetallado, className: "paces-border-top paces-list-table" })) : (_jsx(Table, { columns: columnsResumen, dataSource: resumenData, rowKey: "key", loading: false, scroll: { x: 1100 }, size: "middle", pagination: paginationProps, summary: renderSummaryResumen, className: "paces-border-top paces-list-table" }))] })) : null, _jsx(ModalBuscarSuplidor, { open: modalEntidadAbierto, onClose: () => setModalEntidadAbierto(false), onSelect: seleccionarEntidad, buscar: async (filtro) => {
                    const { proveedorApi } = await import('../../api/proveedorApi');
                    const lista = await proveedorApi.obtenerListado(sucursalActiva);
                    if (!filtro)
                        return lista;
                    const term = filtro.toLowerCase();
                    return (lista || []).filter((e) => e.codigo?.toLowerCase().includes(term) ||
                        e.nombre?.toLowerCase().includes(term) ||
                        (e.identificacion?.toLowerCase() || '').includes(term));
                }, autoFocus: true }), _jsxs(Modal, { title: "Buscar Tipo DVC", open: modalTipoAbierto, onCancel: () => setModalTipoAbierto(false), footer: null, width: 500, destroyOnHidden: true, children: [_jsx(Input.Search, { ref: tipoSearchRef, placeholder: "Buscar por nombre o c\u00F3digo...", allowClear: true, onSearch: buscarTipo, style: { marginBottom: 12 } }), _jsx(Table, { columns: [
                            { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 100 },
                            { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
                        ], dataSource: tipos, rowKey: (r) => r.id || r.codigo, loading: buscandoTipo, size: "small", pagination: { pageSize: 10, showSizeChanger: false }, onRow: (record) => ({
                            onClick: () => seleccionarTipo(record),
                            style: { cursor: 'pointer' },
                        }), locale: { emptyText: _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin resultados" }) }) } })] }), _jsxs(Modal, { title: "Buscar Compa\u00F1\u00EDa/Sucursal", open: modalSucursalAbierto, onCancel: () => setModalSucursalAbierto(false), footer: null, width: 500, destroyOnHidden: true, children: [_jsx(Input.Search, { ref: sucursalSearchRef, placeholder: "Buscar por nombre o c\u00F3digo...", allowClear: true, onSearch: buscarSucursal, style: { marginBottom: 12 } }), _jsx(Table, { columns: [
                            { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 100 },
                            { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
                        ], dataSource: sucursales, rowKey: (r) => r.id || r.codigo, loading: buscandoSucursal, size: "small", pagination: { pageSize: 10, showSizeChanger: false }, onRow: (record) => ({
                            onClick: () => seleccionarSucursal(record),
                            style: { cursor: 'pointer' },
                        }), locale: { emptyText: _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin resultados" }) }) } })] })] }));
};
export default AntiguedadSaldosDVC;
