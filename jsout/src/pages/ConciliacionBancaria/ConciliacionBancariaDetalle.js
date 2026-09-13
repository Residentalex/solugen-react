import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Grid, Typography, Descriptions, Alert, message, Modal, Input, Divider, } from 'antd';
import { ArrowLeftOutlined, EditOutlined, CheckCircleOutlined, CheckCircleFilled, CloseCircleFilled, SearchOutlined, PrinterOutlined, DownloadOutlined, } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { conciliacionBancariaApi } from '../../api/conciliacionBancariaApi';
import PermissionGate from '../../components/PermissionGate';
import { formatCurrency, formatNumber, formatDate, extraerMensajeError, toTitleCase } from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const ConciliacionBancariaDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const screens = Grid.useBreakpoint();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [imprimiendo, setImprimiendo] = useState(false);
    const [searchMov, setSearchMov] = useState('');
    const [searchSinConcil, setSearchSinConcil] = useState('');
    const [searchTrans, setSearchTrans] = useState('');
    const [enTransito, setEnTransito] = useState([]);
    const [loadingTransito, setLoadingTransito] = useState(false);
    const [searchTransito, setSearchTransito] = useState('');
    const [resumenGeneral, setResumenGeneral] = useState(null);
    const [exportandoLibros, setExportandoLibros] = useState(false);
    const [exportandoTransito, setExportandoTransito] = useState(false);
    const [movimientosDetalle, setMovimientosDetalle] = useState([]);
    const [transaccionesDetalle, setTransaccionesDetalle] = useState([]);
    const [movimientosCargados, setMovimientosCargados] = useState(false);
    const [transaccionesCargadas, setTransaccionesCargadas] = useState(false);
    const [transitoCargado, setTransitoCargado] = useState(false);
    // ===== Carga de datos =====
    const cargarData = useCallback(() => {
        if (!id)
            return;
        setLoading(true);
        setLoadingError(false);
        conciliacionBancariaApi.obtenerEncabezado(sucursalActiva, parseInt(id))
            .then((res) => {
            setData(res);
            setPageTitleOverride(`Conciliación N° ${res.concilID}`);
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al cargar la conciliación');
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride]);
    const cargarEnTransito = useCallback(() => {
        if (!id)
            return;
        setLoadingTransito(true);
        conciliacionBancariaApi.obtenerEnTransito(sucursalActiva, parseInt(id))
            .then((res) => {
            setEnTransito(res);
            setTransitoCargado(true);
        })
            .catch(() => message.error('Error al cargar documentos en tránsito'))
            .finally(() => setLoadingTransito(false));
    }, [id, sucursalActiva]);
    const cargarMovimientosDetalle = useCallback(() => {
        if (!id)
            return;
        conciliacionBancariaApi.obtenerMovimientos(sucursalActiva, parseInt(id))
            .then((res) => {
            setMovimientosDetalle(res);
            setMovimientosCargados(true);
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al cargar los movimientos');
            message.error(msg);
        });
    }, [id, sucursalActiva]);
    const cargarTransaccionesDetalle = useCallback(() => {
        if (!id)
            return;
        conciliacionBancariaApi.obtenerTransaccionesConciliadas(sucursalActiva, parseInt(id))
            .then((res) => {
            setTransaccionesDetalle(res);
            setTransaccionesCargadas(true);
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al cargar las transacciones');
            message.error(msg);
        });
    }, [id, sucursalActiva]);
    const cargarResumenGeneral = useCallback(() => {
        if (!id)
            return;
        conciliacionBancariaApi.obtenerResumenGeneral(sucursalActiva, parseInt(id))
            .then(setResumenGeneral)
            .catch(() => message.error('Error al cargar el resumen general'));
    }, [id, sucursalActiva]);
    useEffect(() => {
        setActiveModule('FConcil');
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    useEffect(() => {
        cargarData();
    }, [cargarData]);
    // Cargar tránsito al montar para que el label del tab muestre el conteo real
    useEffect(() => {
        if (data)
            cargarEnTransito();
    }, [data, cargarEnTransito]);
    // La pestaña activa por defecto es 'movimientos'; onChange no se dispara al montar,
    // así que cargar los movimientos aquí (igual que el efecto de tránsito).
    useEffect(() => {
        if (!data)
            return;
        if (movimientosCargados)
            return;
        cargarMovimientosDetalle();
        cargarResumenGeneral();
    }, [data, movimientosCargados, cargarMovimientosDetalle, cargarResumenGeneral]);
    // ===== Handlers =====
    const handleAplicar = () => {
        if (!data)
            return;
        Modal.confirm({
            title: 'Aplicar conciliación',
            content: `¿Está seguro de aplicar la conciliación N° ${data.concilID}?`,
            okText: 'Sí, aplicar',
            cancelText: 'Cancelar',
            onOk: async () => {
                setSaving(true);
                try {
                    await conciliacionBancariaApi.aplicar(sucursalActiva, data.concilID);
                    message.success('Conciliación aplicada exitosamente');
                    cargarData();
                    if (movimientosCargados)
                        cargarMovimientosDetalle();
                    if (transaccionesCargadas)
                        cargarTransaccionesDetalle();
                }
                catch (err) {
                    const msg = extraerMensajeError(err, 'Error al aplicar');
                    message.error(msg);
                }
                finally {
                    setSaving(false);
                }
            },
        });
    };
    const handleImprimir = async () => {
        setImprimiendo(true);
        try {
            const res = await apiClient.get(`/reportes/conciliacion-bancaria/${sucursalActiva}/${Number(id)}/pdf`, { responseType: 'blob' });
            const blobUrl = URL.createObjectURL(res.data);
            window.open(blobUrl, '_blank');
        }
        catch {
            message.error('Error al generar el PDF');
        }
        finally {
            setImprimiendo(false);
        }
    };
    const handleExportarLibros = async () => {
        if (!id)
            return;
        setExportandoLibros(true);
        try {
            const datos = await conciliacionBancariaApi.exportarLibros(sucursalActiva, parseInt(id));
            if (datos.length === 0) {
                message.warning('No hay movimientos para exportar');
                return;
            }
            const companyName = await getCompanyName(sucursalActiva);
            const columnHeaders = ['Tipo Doc', 'Número', 'Fecha', 'Déb/Créd', 'Monto', 'TransacID', 'Entidad', 'Conciliado'];
            const dataRows = datos.map(d => [
                d.nombreTipoDoc || d.tipoDoc,
                d.numDoc,
                d.fecha ? formatDate(d.fecha) : '',
                d.debCred === 'D' ? 'Débito' : 'Crédito',
                d.monto,
                d.transacId,
                d.entidad || '',
                d.conciliado === 'T' ? 'Sí' : 'No',
            ]);
            exportToExcel({
                companyName,
                extraHeaderRows: [[`Libro del Mayor - Conciliación ${id}`]],
                columnHeaders,
                dataRows,
                sheetName: 'Libro del Mayor',
                fileName: `libro-mayor-${id}.xlsx`,
                columnWidths: [{ wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 40 }, { wch: 12 }],
            });
            message.success('Libro del mayor exportado correctamente');
        }
        catch {
            message.error('Error al exportar libro del mayor');
        }
        finally {
            setExportandoLibros(false);
        }
    };
    const handleExportarTransito = async () => {
        if (!id)
            return;
        setExportandoTransito(true);
        try {
            // Asegurar datos cargados bajo demanda (sin barrer CTRANSAC en el backend)
            let conciliadas = transaccionesDetalle;
            if (!transaccionesCargadas) {
                conciliadas = await conciliacionBancariaApi.obtenerTransaccionesConciliadas(sucursalActiva, parseInt(id));
                setTransaccionesDetalle(conciliadas);
                setTransaccionesCargadas(true);
            }
            let transito = enTransito;
            if (!transitoCargado) {
                transito = await conciliacionBancariaApi.obtenerEnTransito(sucursalActiva, parseInt(id));
                setEnTransito(transito);
                setTransitoCargado(true);
            }
            const datos = [...conciliadas, ...transito];
            if (datos.length === 0) {
                message.warning('No hay documentos en tránsito para exportar');
                return;
            }
            const companyName = await getCompanyName(sucursalActiva);
            const columnHeaders = ['Tipo Doc', 'Número', 'Fecha', 'Monto', 'Déb/Créd', 'Entidad', 'Conciliado'];
            const dataRows = datos.map(d => [
                d.nombreTipoDoc || d.tipoDoc,
                d.numDoc,
                d.fecha ? formatDate(d.fecha) : '',
                d.monto,
                d.debCred === 'D' ? 'Débito' : 'Crédito',
                d.entidad || '',
                d.concil ? 'Sí' : 'No',
            ]);
            exportToExcel({
                companyName,
                extraHeaderRows: [[`Tránsito - Conciliación ${id}`]],
                columnHeaders,
                dataRows,
                sheetName: 'Tránsito',
                fileName: `transito-${id}.xlsx`,
                columnWidths: [{ wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 40 }, { wch: 12 }],
            });
            message.success('Tránsito exportado correctamente');
        }
        catch {
            message.error('Error al exportar tránsito');
        }
        finally {
            setExportandoTransito(false);
        }
    };
    // ===== Loading state =====
    if (loading || (!data && !loadingError)) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando conciliaci\u00F3n..." })] }));
    }
    if (loadingError && !data) {
        return (_jsx("div", { style: { textAlign: 'center', padding: 80 }, children: _jsx(Alert, { message: "Error al cargar la conciliaci\u00F3n", type: "error", showIcon: true, action: _jsx(Button, { size: "small", onClick: cargarData, children: "Reintentar" }) }) }));
    }
    if (!data)
        return null;
    const isLarge = screens.xxl === true;
    const diferencia = data.diferencia ?? (data.balBancos - data.balLibros);
    // ===== Columnas de movimientos bancarios =====
    const movimientoColumns = [
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 110,
            render: (f) => formatDate(f),
        },
        {
            title: 'Referencia',
            dataIndex: 'numRef',
            key: 'numRef',
            width: 130,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        {
            title: 'Concepto',
            dataIndex: 'concepto',
            key: 'concepto',
            ellipsis: true,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        {
            title: 'Total',
            dataIndex: 'monto',
            key: 'monto',
            width: 130,
            align: 'right',
            render: (val) => _jsx(Text, { strong: true, children: formatNumber(val) }),
        },
        {
            title: 'Déb/Créd',
            dataIndex: 'debCred',
            key: 'debCred',
            width: 100,
            render: (val) => (_jsx(Tag, { color: val === 'D' ? '#f50' : '#87d068', children: val === 'D' ? 'Débito' : 'Crédito' })),
        },
        {
            title: 'Cotejado',
            dataIndex: 'cotejado',
            key: 'cotejado',
            width: 100,
            render: (cotejado) => (cotejado
                ? _jsx(CheckCircleFilled, { style: { color: '#34c38f', fontSize: 16 } })
                : _jsx(CloseCircleFilled, { style: { color: '#d9d9d9', fontSize: 16 } })),
        },
    ];
    // ===== Columnas de transacciones conciliadas =====
    const transaccionColumns = [
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 110,
            render: (f) => formatDate(f),
        },
        {
            title: 'Documento',
            key: 'documento',
            width: 160,
            render: (_, record) => (_jsxs(Text, { children: [record.tipoDoc, "-", record.numDoc] })),
        },
        {
            title: 'Entidad',
            dataIndex: 'entidad',
            key: 'entidad',
            render: (val) => _jsx(Text, { children: toTitleCase(val || '-') }),
        },
        {
            title: 'Total',
            dataIndex: 'monto',
            key: 'monto',
            width: 130,
            align: 'right',
            render: (val) => _jsx(Text, { strong: true, children: formatNumber(val) }),
        },
        {
            title: 'Déb/Créd',
            dataIndex: 'debCred',
            key: 'debCred',
            width: 100,
            render: (val) => (_jsx(Tag, { color: val === 'D' ? '#f50' : '#87d068', children: val === 'D' ? 'Débito' : 'Crédito' })),
        },
    ];
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar la conciliaci\u00F3n", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: cargarData, children: "Reintentar" }) })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate('/FConcil'), children: "Volver" }), _jsx("div", { style: { flex: 1 } }), _jsxs(Space, { children: [_jsx(PermissionGate, { accion: "EDITAR", children: _jsx(Button, { type: "primary", icon: _jsx(EditOutlined, {}), onClick: () => navigate(`/FConcil/${data.concilID}/editar`), disabled: data.aplicada, children: "Editar" }) }), _jsx(PermissionGate, { accion: "IMPRIMIR", children: _jsx(Button, { icon: _jsx(PrinterOutlined, {}), onClick: handleImprimir, loading: imprimiendo, children: "Imprimir" }) }), _jsx(PermissionGate, { accion: "APLICAR", children: _jsx(Button, { icon: _jsx(CheckCircleOutlined, {}), onClick: handleAplicar, loading: saving, disabled: data.aplicada, style: data.aplicada ? undefined : { background: '#389e0d', borderColor: '#389e0d', color: '#fff' }, children: "Aplicar" }) })] })] }), isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsx(Tag, { color: data.aplicada ? 'success' : 'warning', children: data.aplicada ? 'Aplicada' : 'Pendiente' })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 3, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "N\u00B0 Conciliaci\u00F3n", children: data.concilID }), _jsx(Descriptions.Item, { label: "Cuenta Bancaria", children: data.numeroCta || '-' }), _jsx(Descriptions.Item, { label: "Fecha", children: formatDate(data.fecha) }), _jsx(Descriptions.Item, { label: "Fecha Per\u00EDodo Anterior", children: data.fechaAnt ? formatDate(data.fechaAnt) : '-' }), _jsx(Descriptions.Item, { label: "Balance Bancos", children: formatCurrency(data.balBancos) }), _jsx(Descriptions.Item, { label: "Balance Libros", children: formatCurrency(data.balLibros) }), _jsx(Descriptions.Item, { label: "Diferencia", children: _jsx(Text, { strong: true, className: diferencia !== 0 ? 'paces-text-error' : '', children: formatCurrency(diferencia) }) }), _jsx(Descriptions.Item, { label: "Archivo", children: data.archivo || '-' }), _jsx(Descriptions.Item, { label: "Estado", children: _jsx(Tag, { color: data.aplicada ? 'success' : 'warning', children: data.aplicada ? 'Aplicada' : 'Pendiente' }) }), _jsx(Descriptions.Item, { label: "Notas", span: 3, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: data.notas || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "resumen", type: "card", onChange: (key) => {
                                    if (key === 'resumen') {
                                        cargarResumenGeneral();
                                    }
                                    else if (key === 'movimientos' || key === 'sinconciliar') {
                                        if (!movimientosCargados)
                                            cargarMovimientosDetalle();
                                    }
                                    else if (key === 'transacciones') {
                                        if (!transaccionesCargadas)
                                            cargarTransaccionesDetalle();
                                    }
                                    else if (key === 'transito') {
                                        cargarEnTransito();
                                    }
                                }, items: [
                                    {
                                        key: 'resumen',
                                        label: 'Resumen General',
                                        children: resumenGeneral ? (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { children: "Libro del Mayor" }), _jsx(Button, { icon: _jsx(DownloadOutlined, {}), size: "small", onClick: handleExportarLibros, loading: exportandoLibros, children: "Exportar" })] }), children: [_jsxs(Descriptions, { bordered: true, size: "small", column: 2, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Balance inicial en libros", children: _jsx(Text, { strong: true, children: formatCurrency(resumenGeneral.balanceInicialLibros) }) }), _jsx(Descriptions.Item, { label: "Per\u00EDodo", children: data.fechaAnt ? `${formatDate(data.fechaAnt)} → ${formatDate(data.fecha)}` : '-' })] }), _jsx(Table, { dataSource: resumenGeneral.resumenLibros, columns: [
                                                                { title: 'Tipo de Documento', key: 'tipo', render: (_, r) => (_jsx(Text, { children: r.nombreTipoDoc || r.tipoDoc })) },
                                                                { title: 'Cantidad', dataIndex: 'cantidad', align: 'right', width: 120,
                                                                    render: (v) => formatNumber(v) },
                                                                { title: 'Monto', dataIndex: 'montoTotal', align: 'right', width: 160,
                                                                    render: (v) => _jsx(Text, { strong: true, children: formatCurrency(v) }) },
                                                            ], rowKey: "tipoDoc", size: "small", pagination: false, style: { marginTop: 12 }, locale: { emptyText: 'No hay movimientos en el período' } }), _jsx(Divider, { style: { margin: '12px 0' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 16, fontSize: 16, fontWeight: 700 }, children: [_jsx("span", { children: "Balance conciliado en libros:" }), _jsx("span", { style: { color: 'var(--paces-primary)' }, children: formatCurrency(resumenGeneral.balanceConciliadoLibros) })] })] }), _jsxs(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { children: "Banco" }), _jsx(Button, { icon: _jsx(DownloadOutlined, {}), size: "small", onClick: handleExportarTransito, loading: exportandoTransito, children: "Exportar" })] }), children: [_jsx(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: _jsx(Descriptions.Item, { label: "Balance seg\u00FAn estado bancario", children: _jsx(Text, { strong: true, children: formatCurrency(resumenGeneral.balanceBancos) }) }) }), _jsx(Table, { dataSource: resumenGeneral.resumenTransito, columns: [
                                                                { title: 'Tipo de Documento', key: 'tipo', render: (_, r) => (_jsx(Text, { children: r.nombreTipoDoc || r.tipoDoc })) },
                                                                { title: 'Cantidad', dataIndex: 'cantidad', align: 'right', width: 120,
                                                                    render: (v) => formatNumber(v) },
                                                                { title: 'Monto', dataIndex: 'montoTotal', align: 'right', width: 160,
                                                                    render: (v) => _jsx(Text, { strong: true, children: formatCurrency(v) }) },
                                                            ], rowKey: "tipoDoc", size: "small", pagination: false, style: { marginTop: 12 }, locale: { emptyText: 'No hay documentos en tránsito' } }), _jsx(Divider, { style: { margin: '12px 0' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 16, fontSize: 16, fontWeight: 700 }, children: [_jsx("span", { children: "Balance conciliado banco + tr\u00E1nsito:" }), _jsx("span", { style: { color: 'var(--paces-primary)' }, children: formatCurrency(resumenGeneral.balanceConciliadoBanco) })] })] }), _jsx(Card, { className: "paces-card", size: "small", style: { borderLeft: `4px solid ${resumenGeneral.diferencia === 0 ? '#34c38f' : '#ff4d4f'}` }, children: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 18, fontWeight: 700 }, children: [_jsx("span", { children: "Diferencia" }), _jsx("span", { style: { color: resumenGeneral.diferencia === 0 ? '#34c38f' : '#ff4d4f' }, children: formatCurrency(resumenGeneral.diferencia) })] }) })] })) : (_jsxs("div", { style: { textAlign: 'center', padding: 40 }, children: [_jsx(Spin, {}), _jsx("div", { style: { marginTop: 8 }, className: "paces-text-secondary", children: "Cargando resumen..." })] })),
                                    },
                                    {
                                        key: 'movimientos',
                                        label: `Movimientos Bancarios (${movimientosDetalle.length})`,
                                        children: (_jsxs(_Fragment, { children: [_jsx(Input.Search, { placeholder: "Buscar en movimientos...", allowClear: true, onSearch: (v) => setSearchMov(v), onChange: (e) => { if (!e.target.value)
                                                        setSearchMov(''); }, style: { width: 300, marginBottom: 12 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx(Table, { dataSource: (() => {
                                                        const items = movimientosDetalle;
                                                        if (!searchMov)
                                                            return items;
                                                        const q = searchMov.toLowerCase();
                                                        return items.filter((m) => (m.concepto && m.concepto.toLowerCase().includes(q)) ||
                                                            (m.numRef && m.numRef.toLowerCase().includes(q)) ||
                                                            (m.documento && m.documento.toLowerCase().includes(q)));
                                                    })(), columns: movimientoColumns, rowKey: "orden", size: "small", pagination: { pageSize: 50, showSizeChanger: true }, scroll: { x: 800 }, locale: { emptyText: 'No hay movimientos bancarios importados' } })] })),
                                    },
                                    {
                                        key: 'sinconciliar',
                                        label: `Importados sin conciliar (${movimientosDetalle.filter((m) => !m.cotejado).length})`,
                                        children: (_jsxs(_Fragment, { children: [_jsx(Input.Search, { placeholder: "Buscar en sin conciliar...", allowClear: true, onSearch: (v) => setSearchSinConcil(v), onChange: (e) => { if (!e.target.value)
                                                        setSearchSinConcil(''); }, style: { width: 300, marginBottom: 12 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx(Table, { dataSource: (() => {
                                                        const items = movimientosDetalle.filter((m) => !m.cotejado);
                                                        if (!searchSinConcil)
                                                            return items;
                                                        const q = searchSinConcil.toLowerCase();
                                                        return items.filter((m) => (m.concepto && m.concepto.toLowerCase().includes(q)) ||
                                                            (m.numRef && m.numRef.toLowerCase().includes(q)) ||
                                                            (m.documento && m.documento.toLowerCase().includes(q)) ||
                                                            (m.entidad && m.entidad.toLowerCase().includes(q)));
                                                    })(), columns: movimientoColumns, rowKey: "orden", size: "small", pagination: { pageSize: 50, showSizeChanger: true }, scroll: { x: 800 }, locale: { emptyText: 'No hay movimientos sin conciliar' } })] })),
                                    },
                                    {
                                        key: 'transacciones',
                                        label: `Transacciones Conciliadas (${transaccionesDetalle.length})`,
                                        children: (_jsxs(_Fragment, { children: [_jsx(Input.Search, { placeholder: "Buscar en documentos...", allowClear: true, onSearch: (v) => setSearchTrans(v), onChange: (e) => { if (!e.target.value)
                                                        setSearchTrans(''); }, style: { width: 300, marginBottom: 12 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx(Table, { dataSource: (() => {
                                                        const items = transaccionesDetalle;
                                                        if (!searchTrans)
                                                            return items;
                                                        const q = searchTrans.toLowerCase();
                                                        return items.filter((t) => (t.tipoDoc && t.tipoDoc.toLowerCase().includes(q)) ||
                                                            (t.numDoc && t.numDoc.toLowerCase().includes(q)) ||
                                                            (t.entidad && t.entidad.toLowerCase().includes(q)));
                                                    })(), columns: transaccionColumns, rowKey: "transacId", size: "small", pagination: { pageSize: 10, showTotal: (t) => `${t} registros`, size: 'small' }, scroll: { x: 700 }, locale: { emptyText: 'No hay transacciones conciliadas' } })] })),
                                    },
                                    {
                                        key: 'transito',
                                        label: `Transacciones en Tránsito (${enTransito.length})`,
                                        children: (_jsxs(_Fragment, { children: [_jsx(Input.Search, { placeholder: "Buscar en tr\u00E1nsito...", allowClear: true, onSearch: (v) => setSearchTransito(v), onChange: (e) => { if (!e.target.value)
                                                        setSearchTransito(''); }, style: { width: 300, marginBottom: 12 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx(Table, { dataSource: (() => {
                                                        const items = enTransito;
                                                        if (!searchTransito)
                                                            return items;
                                                        const q = searchTransito.toLowerCase();
                                                        return items.filter((t) => (t.tipoDoc && t.tipoDoc.toLowerCase().includes(q)) ||
                                                            (t.numDoc && t.numDoc.toLowerCase().includes(q)) ||
                                                            (t.entidad && t.entidad.toLowerCase().includes(q)));
                                                    })(), columns: transaccionColumns, rowKey: "transacId", size: "small", loading: loadingTransito, pagination: { pageSize: 50, showSizeChanger: true }, scroll: { x: 700 }, locale: { emptyText: 'No hay documentos en tránsito' } })] })),
                                    },
                                ] })] }), _jsxs(Col, { xxl: 6, children: [_jsx(Card, { className: "paces-card", style: { marginBottom: 16 }, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 16 }, children: [_jsx("span", { className: "paces-text-secondary", children: "Balance Bancos" }), _jsx("span", { children: formatCurrency(data.balBancos) })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 16 }, children: [_jsx("span", { className: "paces-text-secondary", children: "Balance Libros" }), _jsx("span", { children: formatCurrency(data.balLibros) })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 16, fontWeight: 700 }, children: [_jsx("span", { children: "Diferencia" }), _jsx("span", { style: { color: diferencia !== 0 ? '#ff4d4f' : 'var(--paces-primary)' }, children: formatCurrency(diferencia) })] })] }) }), _jsx(Card, { className: "paces-card", title: _jsx("span", { style: { fontSize: 14, fontWeight: 600 }, children: "Resumen" }), children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx("span", { className: "paces-text-secondary", children: "Total movimientos" }), _jsx("span", { children: movimientosDetalle.length })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx("span", { className: "paces-text-secondary", children: "Cotejados" }), _jsx("span", { children: movimientosDetalle.filter((m) => m.cotejado).length })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx("span", { className: "paces-text-secondary", children: "Documentos conciliados" }), _jsx("span", { children: transaccionesDetalle.length })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx("span", { className: "paces-text-secondary", children: "En tr\u00E1nsito" }), _jsx("span", { children: enTransito.length })] })] }) })] })] })) : (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsx(Tag, { color: data.aplicada ? 'success' : 'warning', children: data.aplicada ? 'Aplicada' : 'Pendiente' })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "N\u00B0 Conciliaci\u00F3n", children: data.concilID }), _jsx(Descriptions.Item, { label: "Cuenta Bancaria", children: data.numeroCta || '-' }), _jsx(Descriptions.Item, { label: "Fecha", children: formatDate(data.fecha) }), _jsx(Descriptions.Item, { label: "Fecha Per\u00EDodo Anterior", children: data.fechaAnt ? formatDate(data.fechaAnt) : '-' }), _jsx(Descriptions.Item, { label: "Balance Bancos", children: formatCurrency(data.balBancos) }), _jsx(Descriptions.Item, { label: "Balance Libros", children: formatCurrency(data.balLibros) }), _jsx(Descriptions.Item, { label: "Diferencia", children: _jsx(Text, { strong: true, className: diferencia !== 0 ? 'paces-text-error' : '', children: formatCurrency(diferencia) }) }), _jsx(Descriptions.Item, { label: "Archivo", children: data.archivo || '-' }), _jsx(Descriptions.Item, { label: "Notas", span: 1, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: data.notas || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "resumen", type: "card", onChange: (key) => {
                            if (key === 'resumen') {
                                cargarResumenGeneral();
                            }
                            else if (key === 'movimientos' || key === 'sinconciliar') {
                                if (!movimientosCargados)
                                    cargarMovimientosDetalle();
                            }
                            else if (key === 'transacciones') {
                                if (!transaccionesCargadas)
                                    cargarTransaccionesDetalle();
                            }
                            else if (key === 'transito') {
                                cargarEnTransito();
                            }
                        }, items: [
                            {
                                key: 'resumen',
                                label: 'Resumen General',
                                children: resumenGeneral ? (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { children: "Libro del Mayor" }), _jsx(Button, { icon: _jsx(DownloadOutlined, {}), size: "small", onClick: handleExportarLibros, loading: exportandoLibros, children: "Exportar" })] }), children: [_jsxs(Descriptions, { bordered: true, size: "small", column: 2, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Balance inicial en libros", children: _jsx(Text, { strong: true, children: formatCurrency(resumenGeneral.balanceInicialLibros) }) }), _jsx(Descriptions.Item, { label: "Per\u00EDodo", children: data.fechaAnt ? `${formatDate(data.fechaAnt)} → ${formatDate(data.fecha)}` : '-' })] }), _jsx(Table, { dataSource: resumenGeneral.resumenLibros, columns: [
                                                        { title: 'Tipo de Documento', key: 'tipo', render: (_, r) => (_jsx(Text, { children: r.nombreTipoDoc || r.tipoDoc })) },
                                                        { title: 'Cantidad', dataIndex: 'cantidad', align: 'right', width: 120,
                                                            render: (v) => formatNumber(v) },
                                                        { title: 'Monto', dataIndex: 'montoTotal', align: 'right', width: 160,
                                                            render: (v) => _jsx(Text, { strong: true, children: formatCurrency(v) }) },
                                                    ], rowKey: "tipoDoc", size: "small", pagination: false, style: { marginTop: 12 }, locale: { emptyText: 'No hay movimientos en el período' } }), _jsx(Divider, { style: { margin: '12px 0' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 16, fontSize: 16, fontWeight: 700 }, children: [_jsx("span", { children: "Balance conciliado en libros:" }), _jsx("span", { style: { color: 'var(--paces-primary)' }, children: formatCurrency(resumenGeneral.balanceConciliadoLibros) })] })] }), _jsxs(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { children: "Banco" }), _jsx(Button, { icon: _jsx(DownloadOutlined, {}), size: "small", onClick: handleExportarTransito, loading: exportandoTransito, children: "Exportar" })] }), children: [_jsx(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: _jsx(Descriptions.Item, { label: "Balance seg\u00FAn estado bancario", children: _jsx(Text, { strong: true, children: formatCurrency(resumenGeneral.balanceBancos) }) }) }), _jsx(Table, { dataSource: resumenGeneral.resumenTransito, columns: [
                                                        { title: 'Tipo de Documento', key: 'tipo', render: (_, r) => (_jsx(Text, { children: r.nombreTipoDoc || r.tipoDoc })) },
                                                        { title: 'Cantidad', dataIndex: 'cantidad', align: 'right', width: 120,
                                                            render: (v) => formatNumber(v) },
                                                        { title: 'Monto', dataIndex: 'montoTotal', align: 'right', width: 160,
                                                            render: (v) => _jsx(Text, { strong: true, children: formatCurrency(v) }) },
                                                    ], rowKey: "tipoDoc", size: "small", pagination: false, style: { marginTop: 12 }, locale: { emptyText: 'No hay documentos en tránsito' } }), _jsx(Divider, { style: { margin: '12px 0' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 16, fontSize: 16, fontWeight: 700 }, children: [_jsx("span", { children: "Balance conciliado banco + tr\u00E1nsito:" }), _jsx("span", { style: { color: 'var(--paces-primary)' }, children: formatCurrency(resumenGeneral.balanceConciliadoBanco) })] })] }), _jsx(Card, { className: "paces-card", size: "small", style: { borderLeft: `4px solid ${resumenGeneral.diferencia === 0 ? '#34c38f' : '#ff4d4f'}` }, children: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 18, fontWeight: 700 }, children: [_jsx("span", { children: "Diferencia" }), _jsx("span", { style: { color: resumenGeneral.diferencia === 0 ? '#34c38f' : '#ff4d4f' }, children: formatCurrency(resumenGeneral.diferencia) })] }) })] })) : (_jsxs("div", { style: { textAlign: 'center', padding: 40 }, children: [_jsx(Spin, {}), _jsx("div", { style: { marginTop: 8 }, className: "paces-text-secondary", children: "Cargando resumen..." })] })),
                            },
                            {
                                key: 'movimientos',
                                label: `Movimientos Bancarios (${movimientosDetalle.length})`,
                                children: (_jsxs(_Fragment, { children: [_jsx(Input.Search, { placeholder: "Buscar en movimientos...", allowClear: true, onSearch: (v) => setSearchMov(v), onChange: (e) => { if (!e.target.value)
                                                setSearchMov(''); }, style: { width: 300, marginBottom: 12 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx(Table, { dataSource: (() => {
                                                const items = movimientosDetalle;
                                                if (!searchMov)
                                                    return items;
                                                const q = searchMov.toLowerCase();
                                                return items.filter((m) => (m.concepto && m.concepto.toLowerCase().includes(q)) ||
                                                    (m.numRef && m.numRef.toLowerCase().includes(q)) ||
                                                    (m.documento && m.documento.toLowerCase().includes(q)));
                                            })(), columns: movimientoColumns, rowKey: "orden", size: "small", pagination: { pageSize: 50, showSizeChanger: true }, scroll: { x: 800 }, locale: { emptyText: 'No hay movimientos bancarios importados' } })] })),
                            },
                            {
                                key: 'sinconciliar',
                                label: `Importados sin conciliar (${movimientosDetalle.filter((m) => !m.cotejado).length})`,
                                children: (_jsxs(_Fragment, { children: [_jsx(Input.Search, { placeholder: "Buscar en sin conciliar...", allowClear: true, onSearch: (v) => setSearchSinConcil(v), onChange: (e) => { if (!e.target.value)
                                                setSearchSinConcil(''); }, style: { width: 300, marginBottom: 12 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx(Table, { dataSource: (() => {
                                                const items = movimientosDetalle.filter((m) => !m.cotejado);
                                                if (!searchSinConcil)
                                                    return items;
                                                const q = searchSinConcil.toLowerCase();
                                                return items.filter((m) => (m.concepto && m.concepto.toLowerCase().includes(q)) ||
                                                    (m.numRef && m.numRef.toLowerCase().includes(q)) ||
                                                    (m.documento && m.documento.toLowerCase().includes(q)) ||
                                                    (m.entidad && m.entidad.toLowerCase().includes(q)));
                                            })(), columns: movimientoColumns, rowKey: "orden", size: "small", pagination: { pageSize: 50, showSizeChanger: true }, scroll: { x: 800 }, locale: { emptyText: 'No hay movimientos sin conciliar' } })] })),
                            },
                            {
                                key: 'transacciones',
                                label: `Transacciones Conciliadas (${transaccionesDetalle.length})`,
                                children: (_jsxs(_Fragment, { children: [_jsx(Input.Search, { placeholder: "Buscar en documentos...", allowClear: true, onSearch: (v) => setSearchTrans(v), onChange: (e) => { if (!e.target.value)
                                                setSearchTrans(''); }, style: { width: 300, marginBottom: 12 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx(Table, { dataSource: (() => {
                                                const items = transaccionesDetalle;
                                                if (!searchTrans)
                                                    return items;
                                                const q = searchTrans.toLowerCase();
                                                return items.filter((t) => (t.tipoDoc && t.tipoDoc.toLowerCase().includes(q)) ||
                                                    (t.numDoc && t.numDoc.toLowerCase().includes(q)) ||
                                                    (t.entidad && t.entidad.toLowerCase().includes(q)));
                                            })(), columns: transaccionColumns, rowKey: "transacId", size: "small", pagination: { pageSize: 10, showTotal: (t) => `${t} registros`, size: 'small' }, scroll: { x: 700 }, locale: { emptyText: 'No hay transacciones conciliadas' } })] })),
                            },
                            {
                                key: 'transito',
                                label: `Transacciones en Tránsito (${enTransito.length})`,
                                children: (_jsxs(_Fragment, { children: [_jsx(Input.Search, { placeholder: "Buscar en tr\u00E1nsito...", allowClear: true, onSearch: (v) => setSearchTransito(v), onChange: (e) => { if (!e.target.value)
                                                setSearchTransito(''); }, style: { width: 300, marginBottom: 12 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx(Table, { dataSource: (() => {
                                                const items = enTransito;
                                                if (!searchTransito)
                                                    return items;
                                                const q = searchTransito.toLowerCase();
                                                return items.filter((t) => (t.tipoDoc && t.tipoDoc.toLowerCase().includes(q)) ||
                                                    (t.numDoc && t.numDoc.toLowerCase().includes(q)) ||
                                                    (t.entidad && t.entidad.toLowerCase().includes(q)));
                                            })(), columns: transaccionColumns, rowKey: "transacId", size: "small", loading: loadingTransito, pagination: { pageSize: 50, showSizeChanger: true }, scroll: { x: 700 }, locale: { emptyText: 'No hay documentos en tránsito' } })] })),
                            },
                        ] }), _jsxs("div", { style: { marginTop: 24 }, children: [_jsx(Card, { className: "paces-card", children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 16 }, children: [_jsx("span", { className: "paces-text-secondary", children: "Balance Bancos" }), _jsx("span", { children: formatCurrency(data.balBancos) })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 16 }, children: [_jsx("span", { className: "paces-text-secondary", children: "Balance Libros" }), _jsx("span", { children: formatCurrency(data.balLibros) })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 16, fontWeight: 700 }, children: [_jsx("span", { children: "Diferencia" }), _jsx("span", { style: { color: diferencia !== 0 ? '#ff4d4f' : 'var(--paces-primary)' }, children: formatCurrency(diferencia) })] })] }) }), _jsx(Card, { className: "paces-card", style: { marginTop: 16 }, title: _jsx("span", { style: { fontSize: 14, fontWeight: 600 }, children: "Resumen" }), children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx("span", { className: "paces-text-secondary", children: "Total movimientos" }), _jsx("span", { children: movimientosDetalle.length })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx("span", { className: "paces-text-secondary", children: "Cotejados" }), _jsx("span", { children: movimientosDetalle.filter((m) => m.cotejado).length })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx("span", { className: "paces-text-secondary", children: "Documentos conciliados" }), _jsx("span", { children: transaccionesDetalle.length })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx("span", { className: "paces-text-secondary", children: "En tr\u00E1nsito" }), _jsx("span", { children: enTransito.length })] })] }) })] })] }))] }));
};
export default ConciliacionBancariaDetalle;
