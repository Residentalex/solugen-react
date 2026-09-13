import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Input, Button, Typography, message, Spin, DatePicker, Checkbox, Space, Row, Col, Table, Empty, Statistic, Tag, } from 'antd';
import { PrinterOutlined, SearchOutlined, CloseOutlined, TableOutlined, ArrowUpOutlined, ArrowDownOutlined, SwapOutlined, FileExcelOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { mayorAuxiliarApi } from '../../api/mayorAuxiliarApi';
import { companiaApi } from '../../api/companiaApi';
import { formatDateParam } from '../../utils/formats';
import PermissionGate from '../../components/PermissionGate';
import BuscarCuentaContableModal from '../../components/BuscarCuentaContableModal/BuscarCuentaContableModal';
import { exportToExcel, exportToExcelMultiSheet } from '../../utils/exportToExcel';
const { Text } = Typography;
const { RangePicker } = DatePicker;
const toTitleCase = (str) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
const calcularKpi = (items, balances) => {
    const trimmed = items.map((r) => ({
        ...r,
        tipoAsiento: r.tipoAsiento.trim(),
        origenCuenta: r.origenCuenta.trim(),
    }));
    const totalDebe = trimmed.filter((r) => r.tipoAsiento === 'Debito').reduce((s, r) => s + r.montoAlterno, 0);
    const totalHaber = trimmed.filter((r) => r.tipoAsiento === 'Credito').reduce((s, r) => s + r.montoAlterno, 0);
    return {
        totalDebe,
        totalHaber,
        balanceInicial: balances.balanceInicial,
        balanceInicialDebito: balances.balanceInicialDebito,
        balanceInicialCredito: balances.balanceInicialCredito,
        balanceFinal: balances.balanceFinal,
    };
};
const ordenarItems = (items) => {
    return [...items].sort((a, b) => {
        if (a.documentoCodigo === 'Existencia' && b.documentoCodigo !== 'Existencia')
            return -1;
        if (a.documentoCodigo !== 'Existencia' && b.documentoCodigo === 'Existencia')
            return 1;
        return a.fechaDocumento.localeCompare(b.fechaDocumento);
    });
};
const filtrarItems = (items, busqueda) => {
    if (!busqueda)
        return items;
    const term = busqueda.toLowerCase();
    return items.filter((r) => r.documentoCodigo.toLowerCase().includes(term) ||
        r.documentoNoDocumento.toLowerCase().includes(term) ||
        r.cuentaContableNoCuenta.toLowerCase().includes(term) ||
        r.cuentaContableNombre.toLowerCase().includes(term) ||
        r.tipoAsiento.trim().toLowerCase().includes(term));
};
const agruparPorDocumento = (items) => {
    if (items.length === 0)
        return [];
    const grupos = [];
    const map = new Map();
    for (const item of items) {
        if (!map.has(item.documentoCodigo))
            map.set(item.documentoCodigo, []);
        map.get(item.documentoCodigo).push(item);
    }
    for (const [codigo, itemsDoc] of map) {
        grupos.push({
            key: codigo,
            codigo,
            nombre: itemsDoc[0].documentoNombre,
            minFecha: itemsDoc[0].fechaDocumento,
            maxFecha: itemsDoc[itemsDoc.length - 1].fechaDocumento,
            totalDebe: itemsDoc.filter((i) => i.tipoAsiento.trim() === 'Debito').reduce((s, i) => s + i.montoAlterno, 0),
            totalHaber: itemsDoc.filter((i) => i.tipoAsiento.trim() === 'Credito').reduce((s, i) => s + i.montoAlterno, 0),
            items: itemsDoc,
        });
    }
    return grupos.sort((a, b) => a.minFecha.localeCompare(b.minFecha));
};
const columnasDetallado = [
    { title: 'Fecha', dataIndex: 'fechaDocumento', key: 'fechaDocumento', width: 100, render: (v) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Documento', key: 'documento', width: 140, render: (_, r) => r.documentoCodigo === 'Existencia' ? 'Balance Anterior' : `${r.documentoCodigo}-${r.documentoNoDocumento}` },
    { title: 'No. Cuenta', dataIndex: 'cuentaContableNoCuenta', key: 'cuentaContableNoCuenta', width: 120 },
    { title: 'Nombre Cuenta', key: 'cuentaContableNombre', width: 200, render: (_, r) => toTitleCase(r.cuentaContableNombre) },
    { title: 'Tipo', dataIndex: 'tipoAsiento', key: 'tipoAsiento', width: 80 },
    { title: 'Monto Débito', key: 'montoDebito', width: 130, align: 'right', render: (_, r) => r.tipoAsiento.trim() === 'Debito' ? r.montoAlterno.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-' },
    { title: 'Monto Crédito', key: 'montoCredito', width: 130, align: 'right', render: (_, r) => r.tipoAsiento.trim() === 'Credito' ? r.montoAlterno.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-' },
    { title: 'Balance', dataIndex: 'balance', key: 'balance', width: 130, align: 'right', render: (v) => v.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
];
const MayorAuxiliar = () => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    /* ──── Estados ──── */
    // Filtros
    const [fechas, setFechas] = useState([dayjs().startOf('month'), dayjs()]);
    const [cuentasSeleccionadas, setCuentasSeleccionadas] = useState([]);
    const [nomCuenta, setNomCuenta] = useState('');
    const [tipoDocumento, setTipoDocumento] = useState('');
    const [balanceAnterior, setBalanceAnterior] = useState(true);
    const [detallado, setDetallado] = useState(true);
    // Datos de tabla (una sola cuenta)
    const [datos, setDatos] = useState([]);
    const [balances, setBalances] = useState(null);
    const [consultando, setConsultando] = useState(false);
    const [busquedaTabla, setBusquedaTabla] = useState('');
    // Datos por cuenta (multiples cuentas)
    const [resultadosPorCuenta, setResultadosPorCuenta] = useState([]);
    const [busquedaPorCuenta, setBusquedaPorCuenta] = useState({});
    // Generacion PDF
    const [generando, setGenerando] = useState(false);
    // Modal de busqueda de cuenta contable
    const [modalCuentaAbierto, setModalCuentaAbierto] = useState(false);
    /* ──── UI setup ──── */
    useEffect(() => {
        setActiveModule('RMayorAux');
        setPageTitleOverride('Mayor Auxiliar');
        updateToolbar({});
        return () => {
            resetToolbar();
            setPageTitleOverride('');
        };
    }, [setActiveModule, setPageTitleOverride, updateToolbar, resetToolbar]);
    /* ──── Derivados ──── */
    const esMultiCuenta = cuentasSeleccionadas.length > 1;
    /* ──── Handlers ──── */
    const handlePrint = useCallback(async () => {
        if (cuentasSeleccionadas.length === 0) {
            message.warning('Debe seleccionar al menos una cuenta contable');
            return;
        }
        setGenerando(true);
        try {
            const filtros = {
                fechaInicial: formatDateParam(fechas[0].toDate()),
                fechaFinal: formatDateParam(fechas[1].toDate()),
                noCuentas: cuentasSeleccionadas.map((c) => c.noCuenta),
                tipoDocumento: tipoDocumento || undefined,
                balanceAnterior,
                detallado,
            };
            let blob;
            if (esMultiCuenta && resultadosPorCuenta.length > 0) {
                // Multi-cuenta: enviar todos los items de la pantalla via imprimir
                const todosItems = resultadosPorCuenta.flatMap((r) => r.items);
                const balancesGlobales = {
                    balanceInicial: resultadosPorCuenta.reduce((s, r) => s + r.balances.balanceInicial, 0),
                    balanceInicialAlterno: resultadosPorCuenta.reduce((s, r) => s + r.balances.balanceInicialAlterno, 0),
                    balanceInicialDebito: resultadosPorCuenta.reduce((s, r) => s + r.balances.balanceInicialDebito, 0),
                    balanceInicialCredito: resultadosPorCuenta.reduce((s, r) => s + r.balances.balanceInicialCredito, 0),
                    balanceFinal: resultadosPorCuenta.reduce((s, r) => s + r.balances.balanceFinal, 0),
                    balanceFinalAlterno: resultadosPorCuenta.reduce((s, r) => s + r.balances.balanceFinalAlterno, 0),
                };
                blob = await mayorAuxiliarApi.imprimir(sucursalActiva, filtros, todosItems, balancesGlobales);
            }
            else if (datos.length > 0 && balances) {
                // Una sola cuenta: usar imprimir con datos de la pantalla
                blob = await mayorAuxiliarApi.imprimir(sucursalActiva, filtros, datos, balances);
            }
            else {
                // Sin datos en pantalla: generar desde backend
                blob = await mayorAuxiliarApi.generarPDF(sucursalActiva, filtros);
            }
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al generar el PDF');
        }
        finally {
            setGenerando(false);
        }
    }, [sucursalActiva, fechas, cuentasSeleccionadas, tipoDocumento, balanceAnterior, detallado, datos, balances, esMultiCuenta, resultadosPorCuenta]);
    const handleConsultar = useCallback(async () => {
        if (cuentasSeleccionadas.length === 0) {
            message.warning('Debe seleccionar al menos una cuenta contable');
            return;
        }
        setConsultando(true);
        setDatos([]);
        setBalances(null);
        setResultadosPorCuenta([]);
        setBusquedaPorCuenta({});
        try {
            const filtrosBase = {
                fechaInicial: formatDateParam(fechas[0].toDate()),
                fechaFinal: formatDateParam(fechas[1].toDate()),
                tipoDocumento: tipoDocumento || undefined,
                balanceAnterior,
                detallado,
            };
            if (cuentasSeleccionadas.length === 1) {
                // Una sola cuenta: comportamiento original
                const filtros = {
                    ...filtrosBase,
                    noCuentas: [cuentasSeleccionadas[0].noCuenta],
                };
                const res = await mayorAuxiliarApi.obtenerDatos(sucursalActiva, filtros);
                const items = Array.isArray(res) ? res : (res.items ?? []);
                const sorted = ordenarItems(items);
                setDatos(sorted);
                setBalances({
                    balanceInicial: Array.isArray(res) ? 0 : (res.balanceInicial ?? 0),
                    balanceInicialAlterno: Array.isArray(res) ? 0 : (res.balanceInicialAlterno ?? 0),
                    balanceInicialDebito: Array.isArray(res) ? 0 : (res.balanceInicialDebito ?? 0),
                    balanceInicialCredito: Array.isArray(res) ? 0 : (res.balanceInicialCredito ?? 0),
                    balanceFinal: Array.isArray(res) ? 0 : (res.balanceFinal ?? 0),
                    balanceFinalAlterno: Array.isArray(res) ? 0 : (res.balanceFinalAlterno ?? 0),
                });
            }
            else {
                // Multiples cuentas: una llamada por cuenta
                const promesas = cuentasSeleccionadas.map(async (cuenta) => {
                    const filtros = {
                        ...filtrosBase,
                        noCuenta: cuenta.noCuenta,
                    };
                    const res = await mayorAuxiliarApi.obtenerDatos(sucursalActiva, filtros);
                    const items = Array.isArray(res) ? res : (res.items ?? []);
                    return {
                        cuenta,
                        items: ordenarItems(items),
                        balances: {
                            balanceInicial: Array.isArray(res) ? 0 : (res.balanceInicial ?? 0),
                            balanceInicialAlterno: Array.isArray(res) ? 0 : (res.balanceInicialAlterno ?? 0),
                            balanceInicialDebito: Array.isArray(res) ? 0 : (res.balanceInicialDebito ?? 0),
                            balanceInicialCredito: Array.isArray(res) ? 0 : (res.balanceInicialCredito ?? 0),
                            balanceFinal: Array.isArray(res) ? 0 : (res.balanceFinal ?? 0),
                            balanceFinalAlterno: Array.isArray(res) ? 0 : (res.balanceFinalAlterno ?? 0),
                        },
                    };
                });
                const resultados = await Promise.all(promesas);
                setResultadosPorCuenta(resultados);
            }
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al consultar los datos');
        }
        finally {
            setConsultando(false);
        }
    }, [sucursalActiva, fechas, cuentasSeleccionadas, tipoDocumento, balanceAnterior, detallado]);
    /* ──── KPIs y filtro de tabla (una sola cuenta) ──── */
    const kpi = useMemo(() => {
        if (datos.length === 0 || !balances)
            return null;
        return calcularKpi(datos, balances);
    }, [datos, balances]);
    const datosFiltrados = useMemo(() => {
        return filtrarItems(datos, busquedaTabla);
    }, [datos, busquedaTabla]);
    const gruposDocumento = useMemo(() => agruparPorDocumento(datosFiltrados), [datosFiltrados]);
    /* ──── Exportar Excel ──── */
    const obtenerCompanyInfo = useCallback(async () => {
        let companyInfo = { nombre: 'SOLUGEN S.R.L.', direccion: '', telefono: '', rnc: '' };
        try {
            const lista = await companiaApi.obtenerTodas(sucursalActiva);
            if (lista.length > 0) {
                companyInfo.nombre = lista[0].nombre ?? companyInfo.nombre;
                companyInfo.direccion = lista[0].direccion ?? '';
                companyInfo.telefono = lista[0].telefono ?? '';
                companyInfo.rnc = lista[0].rnc ?? '';
            }
        }
        catch { /* ignora */ }
        return companyInfo;
    }, [sucursalActiva]);
    const handleExportExcel = useCallback(async () => {
        const companyInfo = await obtenerCompanyInfo();
        const desdeStr = dayjs(fechas[0]).format('DD/MM/YYYY');
        const hastaStr = dayjs(fechas[1]).format('DD/MM/YYYY');
        const filtroCta = cuentasSeleccionadas.length > 0
            ? cuentasSeleccionadas.map((c) => `${c.noCuenta} - ${toTitleCase(c.nombre)}`).join(' | ')
            : 'Todas';
        const filtroDoc = tipoDocumento || 'Todos';
        if (detallado) {
            const columnHeaders = ['Fecha', 'Documento', 'Entidad', 'No. Cuenta', 'Nombre Cuenta', 'Tipo', 'Debito', 'Credito', 'Balance'];
            const dataRows = datosFiltrados.map((r) => [
                dayjs(r.fechaDocumento).format('DD/MM/YYYY'),
                r.documentoCodigo === 'Existencia' ? 'Balance Anterior' : `${r.documentoCodigo}-${r.documentoNoDocumento}`,
                r.entidadNombre,
                r.cuentaContableNoCuenta,
                r.cuentaContableNombre,
                r.tipoAsiento.trim(),
                r.tipoAsiento.trim() === 'Debito' ? r.montoAlterno : 0,
                r.tipoAsiento.trim() === 'Credito' ? r.montoAlterno : 0,
                r.balance,
            ]);
            exportToExcel({
                companyName: companyInfo.nombre,
                extraHeaderRows: [
                    [companyInfo.direccion],
                    [`Tel.: ${companyInfo.telefono}`],
                    [`RNC: ${companyInfo.rnc}`],
                    ['REPORTE MAYOR AUXILIAR'],
                    [`Periodo: ${desdeStr} - ${hastaStr}  |  Cuenta: ${filtroCta}  |  Doc: ${filtroDoc}`],
                    [],
                ],
                columnHeaders,
                dataRows,
                sheetName: 'MayorAuxiliar',
                columnWidths: [{ wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 22 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 16 }],
            });
        }
        else {
            const columnHeaders = ['Codigo', 'Nombre', 'Desde', 'Hasta', 'Total Debito', 'Total Credito'];
            const dataRows = gruposDocumento.map((g) => [
                g.codigo,
                g.codigo === 'Existencia' ? 'Balance Anterior' : g.nombre,
                dayjs(g.minFecha).format('DD/MM/YYYY'),
                dayjs(g.maxFecha).format('DD/MM/YYYY'),
                g.totalDebe,
                g.totalHaber,
            ]);
            exportToExcel({
                companyName: companyInfo.nombre,
                extraHeaderRows: [
                    [companyInfo.direccion],
                    [`Tel.: ${companyInfo.telefono}`],
                    [`RNC: ${companyInfo.rnc}`],
                    ['REPORTE MAYOR AUXILIAR'],
                    [`Periodo: ${desdeStr} - ${hastaStr}  |  Cuenta: ${filtroCta}  |  Doc: ${filtroDoc}`],
                    [],
                ],
                columnHeaders,
                dataRows,
                sheetName: 'MayorAuxiliar',
                columnWidths: [{ wch: 8 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }],
            });
        }
    }, [obtenerCompanyInfo, datosFiltrados, gruposDocumento, detallado, fechas, cuentasSeleccionadas, tipoDocumento]);
    const handleExportExcelCuenta = useCallback(async (resultado) => {
        const companyInfo = await obtenerCompanyInfo();
        const desdeStr = dayjs(fechas[0]).format('DD/MM/YYYY');
        const hastaStr = dayjs(fechas[1]).format('DD/MM/YYYY');
        const filtroCta = `${resultado.cuenta.noCuenta} - ${toTitleCase(resultado.cuenta.nombre)}`;
        const filtroDoc = tipoDocumento || 'Todos';
        const busqueda = busquedaPorCuenta[resultado.cuenta.noCuenta] || '';
        const itemsCuenta = filtrarItems(resultado.items, busqueda);
        const columnHeaders = ['Fecha', 'Documento', 'Entidad', 'No. Cuenta', 'Nombre Cuenta', 'Tipo', 'Debito', 'Credito', 'Balance'];
        const dataRows = itemsCuenta.map((r) => [
            dayjs(r.fechaDocumento).format('DD/MM/YYYY'),
            r.documentoCodigo === 'Existencia' ? 'Balance Anterior' : `${r.documentoCodigo}-${r.documentoNoDocumento}`,
            r.entidadNombre,
            r.cuentaContableNoCuenta,
            r.cuentaContableNombre,
            r.tipoAsiento.trim(),
            r.tipoAsiento.trim() === 'Debito' ? r.montoAlterno : 0,
            r.tipoAsiento.trim() === 'Credito' ? r.montoAlterno : 0,
            r.balance,
        ]);
        exportToExcel({
            companyName: companyInfo.nombre,
            extraHeaderRows: [
                [companyInfo.direccion],
                [`Tel.: ${companyInfo.telefono}`],
                [`RNC: ${companyInfo.rnc}`],
                ['REPORTE MAYOR AUXILIAR'],
                [`Periodo: ${desdeStr} - ${hastaStr}  |  Cuenta: ${filtroCta}  |  Doc: ${filtroDoc}`],
                [],
            ],
            columnHeaders,
            dataRows,
            sheetName: `Cuenta_${resultado.cuenta.noCuenta}`,
            columnWidths: [{ wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 22 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 16 }],
        });
    }, [obtenerCompanyInfo, fechas, tipoDocumento, busquedaPorCuenta]);
    const handleExportExcelTodas = useCallback(async () => {
        const companyInfo = await obtenerCompanyInfo();
        const desdeStr = dayjs(fechas[0]).format('DD/MM/YYYY');
        const hastaStr = dayjs(fechas[1]).format('DD/MM/YYYY');
        const filtroDoc = tipoDocumento || 'Todos';
        const columnHeaders = ['Fecha', 'Documento', 'Entidad', 'No. Cuenta', 'Nombre Cuenta', 'Tipo', 'Debito', 'Credito', 'Balance'];
        const columnWidths = [{ wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 22 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
        const sheets = resultadosPorCuenta.map((resultado) => {
            const filtroCta = `${resultado.cuenta.noCuenta} - ${toTitleCase(resultado.cuenta.nombre)}`;
            const dataRows = resultado.items.map((r) => [
                dayjs(r.fechaDocumento).format('DD/MM/YYYY'),
                r.documentoCodigo === 'Existencia' ? 'Balance Anterior' : `${r.documentoCodigo}-${r.documentoNoDocumento}`,
                r.entidadNombre,
                r.cuentaContableNoCuenta,
                r.cuentaContableNombre,
                r.tipoAsiento.trim(),
                r.tipoAsiento.trim() === 'Debito' ? r.montoAlterno : 0,
                r.tipoAsiento.trim() === 'Credito' ? r.montoAlterno : 0,
                r.balance,
            ]);
            return {
                sheetName: resultado.cuenta.noCuenta,
                extraHeaderRows: [
                    [companyInfo.direccion],
                    [`Tel.: ${companyInfo.telefono}`],
                    [`RNC: ${companyInfo.rnc}`],
                    ['REPORTE MAYOR AUXILIAR'],
                    [`Periodo: ${desdeStr} - ${hastaStr}  |  Cuenta: ${filtroCta}  |  Doc: ${filtroDoc}`],
                    [],
                ],
                columnHeaders,
                dataRows,
                columnWidths,
            };
        });
        exportToExcelMultiSheet({
            companyName: companyInfo.nombre,
            sheets,
        });
    }, [obtenerCompanyInfo, fechas, tipoDocumento, resultadosPorCuenta]);
    /* ──── Handlers de busqueda de cuenta ──── */
    const actualizarDisplayCuentas = (cuentas) => {
        if (cuentas.length === 0) {
            setNomCuenta('');
            return;
        }
        if (cuentas.length === 1) {
            setNomCuenta(`${cuentas[0].noCuenta} - ${toTitleCase(cuentas[0].nombre)}`);
        }
        else {
            setNomCuenta(`${cuentas.length} cuentas (${cuentas.map((c) => c.noCuenta).join(', ')})`);
        }
    };
    const limpiarResultados = () => {
        setDatos([]);
        setBalances(null);
        setResultadosPorCuenta([]);
        setBusquedaPorCuenta({});
    };
    const seleccionarCuenta = (item) => {
        const cuentas = [item];
        setCuentasSeleccionadas(cuentas);
        actualizarDisplayCuentas(cuentas);
        limpiarResultados();
        setModalCuentaAbierto(false);
    };
    const seleccionarMultiples = (cuentas) => {
        setCuentasSeleccionadas(cuentas);
        actualizarDisplayCuentas(cuentas);
        limpiarResultados();
    };
    const quitarCuenta = (noCuentaAEliminar) => {
        const nuevas = cuentasSeleccionadas.filter((c) => c.noCuenta !== noCuentaAEliminar);
        setCuentasSeleccionadas(nuevas);
        actualizarDisplayCuentas(nuevas);
        limpiarResultados();
    };
    const limpiarCuenta = () => {
        setCuentasSeleccionadas([]);
        setNomCuenta('');
        limpiarResultados();
    };
    /* ──── Render KPIs ──── */
    const renderKpis = (kpiData) => (_jsxs(Row, { gutter: [16, 16], children: [_jsx(Col, { xs: 12, sm: 8, md: 4, children: _jsx(Statistic, { title: "Balance Inicial", value: kpiData.balanceInicial, precision: 2, prefix: _jsx(SwapOutlined, { style: { color: '#556ee6' } }), valueStyle: { color: '#556ee6', fontSize: 18, fontWeight: 600 } }) }), _jsx(Col, { xs: 12, sm: 8, md: 4, children: _jsx(Statistic, { title: "Sdo. Anterior D\u00E9bito", value: kpiData.balanceInicialDebito, precision: 2, prefix: _jsx(ArrowDownOutlined, { style: { color: kpiData.balanceInicialDebito < 0 ? '#f5222d' : '#52c41a' } }), valueStyle: { color: kpiData.balanceInicialDebito < 0 ? '#f5222d' : '#52c41a', fontSize: 18 } }) }), _jsx(Col, { xs: 12, sm: 8, md: 4, children: _jsx(Statistic, { title: "Sdo. Anterior Cr\u00E9dito", value: kpiData.balanceInicialCredito, precision: 2, prefix: _jsx(ArrowUpOutlined, { style: { color: kpiData.balanceInicialCredito < 0 ? '#f5222d' : '#52c41a' } }), valueStyle: { color: kpiData.balanceInicialCredito < 0 ? '#f5222d' : '#52c41a', fontSize: 18 } }) }), _jsx(Col, { xs: 12, sm: 8, md: 4, children: _jsx(Statistic, { title: "Total D\u00E9bitos", value: kpiData.totalDebe, precision: 2, prefix: _jsx(ArrowDownOutlined, { style: { color: '#f5222d' } }), valueStyle: { color: '#f5222d', fontSize: 18 } }) }), _jsx(Col, { xs: 12, sm: 8, md: 4, children: _jsx(Statistic, { title: "Total Cr\u00E9ditos", value: kpiData.totalHaber, precision: 2, prefix: _jsx(ArrowUpOutlined, { style: { color: '#52c41a' } }), valueStyle: { color: '#52c41a', fontSize: 18 } }) }), _jsx(Col, { xs: 12, sm: 8, md: 4, children: _jsx(Statistic, { title: "Balance Final", value: kpiData.balanceFinal, precision: 2, prefix: _jsx(SwapOutlined, { style: { color: '#556ee6' } }), valueStyle: { color: '#556ee6', fontSize: 18, fontWeight: 600 } }) })] }));
    /* ──── Render ──── */
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: `
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .paces-card-erp { box-shadow: none !important; border: none !important; }
        }
      ` }), _jsx(Card, { className: "paces-card no-print", style: { marginBottom: 16 }, children: _jsxs("div", { style: { padding: '16px 24px' }, children: [_jsxs(Row, { gutter: [16, 12], children: [_jsxs(Col, { xs: 24, sm: 12, md: 6, children: [_jsx("div", { style: { marginBottom: 4 }, children: _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Rango de Fechas" }) }), _jsx(RangePicker, { value: fechas, onChange: (dates) => {
                                                if (dates && dates[0] && dates[1])
                                                    setFechas([dates[0], dates[1]]);
                                            }, format: "YYYY-MM-DD", allowClear: false, style: { width: '100%' } })] }), _jsxs(Col, { xs: 24, sm: 12, md: 6, children: [_jsx("div", { style: { marginBottom: 4 }, children: _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Cuenta(s)" }) }), _jsxs(Space.Compact, { style: { width: '100%' }, children: [_jsx(Input, { placeholder: "Buscar cuenta...", value: nomCuenta, readOnly: true, style: { width: '100%' } }), _jsx(Button, { icon: _jsx(SearchOutlined, {}), onClick: () => setModalCuentaAbierto(true) }), cuentasSeleccionadas.length > 0 ? (_jsx(Button, { icon: _jsx(CloseOutlined, {}), onClick: limpiarCuenta })) : null] }), cuentasSeleccionadas.length > 0 && (_jsx("div", { style: { marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }, children: cuentasSeleccionadas.map((c) => (_jsxs(Tag, { closable: true, onClose: (e) => {
                                                    e.preventDefault();
                                                    quitarCuenta(c.noCuenta);
                                                }, style: { marginInlineEnd: 0 }, children: [c.noCuenta, " - ", toTitleCase(c.nombre)] }, c.noCuenta))) }))] }), _jsxs(Col, { xs: 24, sm: 12, md: 6, children: [_jsx("div", { style: { marginBottom: 4 }, children: _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Tipo Documento" }) }), _jsx(Input, { placeholder: "Ej: FAC, NCR, NDB...", value: tipoDocumento, onChange: (e) => setTipoDocumento(e.target.value), style: { width: '100%' } })] })] }), _jsxs(Row, { gutter: [16, 12], style: { marginTop: 12 }, children: [_jsx(Col, { xs: 24, sm: 12, md: 6, children: _jsx(Checkbox, { checked: balanceAnterior, onChange: (e) => setBalanceAnterior(e.target.checked), children: "Incluir Balance Anterior" }) }), _jsx(Col, { xs: 24, sm: 12, md: 6, children: _jsx(Checkbox, { checked: detallado, onChange: (e) => setDetallado(e.target.checked), children: "Vista Detallada" }) })] }), _jsx(Row, { style: { marginTop: 16 }, children: _jsx(Col, { children: _jsxs(Space, { children: [_jsx(Button, { type: "primary", icon: _jsx(TableOutlined, {}), onClick: handleConsultar, loading: consultando, children: "Consultar" }), _jsx(Button, { icon: _jsx(PrinterOutlined, {}), onClick: handlePrint, loading: generando, children: "Generar PDF" })] }) }) })] }) }), consultando && (_jsx("div", { style: { textAlign: 'center', padding: 80 }, children: _jsx(Spin, { size: "large", tip: "Consultando datos..." }) })), !consultando && !esMultiCuenta && datos.length > 0 && kpi && (_jsxs(_Fragment, { children: [_jsx(Card, { className: "paces-card", style: { marginBottom: 16 }, children: renderKpis(kpi) }), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsxs("div", { style: { padding: '16px 24px 0', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }, children: [_jsx(Input.Search, { placeholder: "Buscar por documento, cuenta o nombre...", allowClear: true, onSearch: (v) => setBusquedaTabla(v), onChange: (e) => !e.target.value && setBusquedaTabla(''), style: { width: 400 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx("div", { style: { flex: 1 } }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: handleExportExcel }) })] }), detallado ? (_jsx(Table, { className: "paces-list-table", dataSource: datosFiltrados, rowKey: (r) => `${r.fechaDocumento}-${r.documentoCodigo}-${r.cuentaContableNoCuenta}-${r.tipoAsiento}-${r.monto}`, size: "small", pagination: { pageSize: 50, showTotal: (t) => `${t} registros` }, scroll: { x: 1400 }, columns: columnasDetallado, locale: { emptyText: _jsx(Empty, { description: "Sin resultados" }) } })) : (_jsx(Table, { className: "paces-list-table", dataSource: gruposDocumento, rowKey: "key", size: "small", pagination: { pageSize: 25, showTotal: (t) => `${t} documentos` }, columns: [
                                    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 80 },
                                    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', width: 200 },
                                    { title: 'Desde', dataIndex: 'minFecha', key: 'minFecha', width: 100, render: (v) => dayjs(v).format('DD/MM/YYYY') },
                                    { title: 'Hasta', dataIndex: 'maxFecha', key: 'maxFecha', width: 100, render: (v) => dayjs(v).format('DD/MM/YYYY') },
                                    { title: 'Total Débito', dataIndex: 'totalDebe', key: 'totalDebe', width: 130, align: 'right', render: (v) => v.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
                                    { title: 'Total Crédito', dataIndex: 'totalHaber', key: 'totalHaber', width: 130, align: 'right', render: (v) => v.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
                                ], locale: { emptyText: _jsx(Empty, { description: "Sin resultados" }) } }))] })] })), !consultando && esMultiCuenta && resultadosPorCuenta.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', marginBottom: 16 }, children: [_jsxs(Text, { strong: true, style: { fontSize: 14 }, children: [resultadosPorCuenta.length, " cuentas consultadas"] }), _jsx("div", { style: { flex: 1 } }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: handleExportExcelTodas, children: "Exportar Excel (todas)" }) })] }), resultadosPorCuenta.map((resultado) => {
                        const kpiCuenta = calcularKpi(resultado.items, resultado.balances);
                        const busqueda = busquedaPorCuenta[resultado.cuenta.noCuenta] || '';
                        const itemsFiltradosCuenta = filtrarItems(resultado.items, busqueda);
                        return (_jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden', marginBottom: 16 }, styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }, children: _jsxs(Text, { strong: true, style: { fontSize: 16, color: '#556ee6' }, children: [resultado.cuenta.noCuenta, " - ", toTitleCase(resultado.cuenta.nombre)] }) }), _jsx("div", { style: { padding: '16px 24px' }, children: renderKpis(kpiCuenta) }), _jsxs("div", { style: { padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }, children: [_jsx(Input.Search, { placeholder: "Buscar por documento, cuenta o nombre...", allowClear: true, onSearch: (v) => setBusquedaPorCuenta((prev) => ({ ...prev, [resultado.cuenta.noCuenta]: v })), onChange: (e) => !e.target.value && setBusquedaPorCuenta((prev) => ({ ...prev, [resultado.cuenta.noCuenta]: '' })), style: { width: 400 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx("div", { style: { flex: 1 } }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: () => handleExportExcelCuenta(resultado) }) })] }), detallado ? (_jsx(Table, { className: "paces-list-table", dataSource: itemsFiltradosCuenta, rowKey: (r) => `${r.fechaDocumento}-${r.documentoCodigo}-${r.cuentaContableNoCuenta}-${r.tipoAsiento}-${r.monto}`, size: "small", pagination: { pageSize: 50, showTotal: (t) => `${t} registros` }, scroll: { x: 1400 }, columns: columnasDetallado, locale: { emptyText: _jsx(Empty, { description: "Sin resultados" }) } })) : (_jsx(Table, { className: "paces-list-table", dataSource: agruparPorDocumento(itemsFiltradosCuenta), rowKey: "key", size: "small", pagination: { pageSize: 25, showTotal: (t) => `${t} documentos` }, columns: [
                                        { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 80 },
                                        { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', width: 200 },
                                        { title: 'Desde', dataIndex: 'minFecha', key: 'minFecha', width: 100, render: (v) => dayjs(v).format('DD/MM/YYYY') },
                                        { title: 'Hasta', dataIndex: 'maxFecha', key: 'maxFecha', width: 100, render: (v) => dayjs(v).format('DD/MM/YYYY') },
                                        { title: 'Total Débito', dataIndex: 'totalDebe', key: 'totalDebe', width: 130, align: 'right', render: (v) => v.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
                                        { title: 'Total Crédito', dataIndex: 'totalHaber', key: 'totalHaber', width: 130, align: 'right', render: (v) => v.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
                                    ], locale: { emptyText: _jsx(Empty, { description: "Sin resultados" }) } }))] }, resultado.cuenta.noCuenta));
                    })] })), _jsx(BuscarCuentaContableModal, { open: modalCuentaAbierto, onClose: () => setModalCuentaAbierto(false), onSelect: seleccionarCuenta, onSeleccionarMultiples: seleccionarMultiples, multiple: true, sucursal: sucursalActiva })] }));
};
export default MayorAuxiliar;
