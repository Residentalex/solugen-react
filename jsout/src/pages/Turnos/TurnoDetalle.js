import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Tabs, Tag, Spin, Button, Grid, Divider, Descriptions, Alert, Typography, Space, Input, DatePicker, Tooltip, message, Modal, Checkbox } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, FilterOutlined, FilterFilled, DollarCircleOutlined, FileTextOutlined, SwapOutlined, CreditCardOutlined, CreditCardFilled, GiftOutlined, TagOutlined, RollbackOutlined, PrinterOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { turnoApi } from '../../api/turnoApi';
import { formatCurrency, formatDate, formatDateTime, toTitleCase, formatNumber } from '../../utils/formats';
import DetalleToolbar from '../../components/DetalleToolbar';
import AsientosContableTable from '../../components/AsientosContableTable';
import LogTable from '../../components/LogTable';
import FiltroSeleccionDropdown from '../../components/FiltroSeleccionDropdown';
import PermissionGate from '../../components/PermissionGate';
import ModalSeleccionarImpresoraPOS from '../../components/ModalSeleccionarImpresoraPOS/ModalSeleccionarImpresoraPOS';
import { useQZTray } from '../../hooks/useQZTray';
import { formatTicket, feed, CMD_CUT } from '../../utils/escpos-formatter';
import { obtenerConfigPlantilla, CODIGO_PLANTILLA_TURNO_CIERRE } from '../../utils/ticketPlantilla';
import { obtenerLogoEscPosBase64 } from '../../utils/logoEscPos';
import { companiaApi } from '../../api/companiaApi';
const { Text } = Typography;
// ─── Componente de filtro por rango de fechas ─────────────────────────────────
const FiltroFechaDropdown = ({ confirm, clearFilters, filtroKey, filtrosActivos, setFiltrosActivos }) => {
    const [fechas, setFechas] = React.useState(null);
    const handleAplicar = () => {
        if (fechas && fechas[0] && fechas[1]) {
            setFiltrosActivos(prev => ({
                ...prev,
                [filtroKey]: { value: [fechas[0].toISOString(), fechas[1].toISOString()] }
            }));
        }
        else {
            setFiltrosActivos(prev => { const n = { ...prev }; delete n[filtroKey]; return n; });
        }
        confirm();
    };
    const handleLimpiar = () => {
        setFechas(null);
        clearFilters?.();
        setFiltrosActivos(prev => { const n = { ...prev }; delete n[filtroKey]; return n; });
        confirm();
    };
    return (_jsxs("div", { style: { padding: 12, width: 260 }, children: [_jsx(DatePicker.RangePicker, { value: fechas, onChange: dates => setFechas(dates), style: { width: '100%', marginBottom: 8 }, placeholder: ['Fecha desde', 'Fecha hasta'] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx(Button, { size: "small", onClick: handleLimpiar, children: "Limpiar" }), _jsx(Button, { type: "primary", size: "small", onClick: handleAplicar, children: "Aplicar" })] })] }));
};
const TurnoDetalle = () => {
    const { noTurno } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const sucursalContable = useAuthStore((s) => s.sucursalContable);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const screens = Grid.useBreakpoint();
    const isLarge = screens.xxl === true;
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['turnoDetalle', sucursalActiva, noTurno],
        queryFn: async () => {
            if (!noTurno)
                throw new Error('NoTurno es requerido');
            return turnoApi.obtenerPorNoTurno(sucursalActiva, noTurno);
        },
        enabled: !!noTurno && sucursalActiva !== undefined,
    });
    useEffect(() => {
        setActiveModule('FTURNOS');
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    useEffect(() => {
        if (data) {
            setPageTitleOverride(`Turno: ${data.noTurno}`);
        }
    }, [data, setPageTitleOverride]);
    const handleRefresh = useCallback(() => {
        refetch();
    }, [refetch]);
    const handlePostear = () => {
        Modal.confirm({
            title: 'Postear Turno',
            content: `¿Está seguro de generar los asientos contables del turno ${data?.noTurno}?`,
            okText: 'Postear',
            cancelText: 'Cancelar',
            onOk: async () => {
                if (!data)
                    return;
                setPosteando(true);
                try {
                    await turnoApi.postear(sucursalActiva, data.noTurno, sucursalContable);
                    message.success('Turno posteado correctamente');
                    refetch();
                }
                catch (err) {
                    message.error(err?.response?.data?.errorMessage || 'Error al postear el turno');
                }
                finally {
                    setPosteando(false);
                }
            },
        });
    };
    const handleImprimirTicket = async () => {
        if (!data)
            return;
        setImprimiendo(true);
        try {
            // Datos de la compañía desde la sucursal activa
            let companyInfo = { nombre: '', direccion: '', telefono: '', rnc: '', fax: '', slogan: '' };
            try {
                const lista = await companiaApi.obtenerTodas(sucursalActiva);
                if (lista.length > 0) {
                    companyInfo = {
                        nombre: lista[0].nombre ?? '',
                        direccion: lista[0].direccion ?? '',
                        telefono: lista[0].telefono ?? '',
                        rnc: lista[0].rnc ?? '',
                        fax: lista[0].fax ?? '',
                        slogan: lista[0].slogan ?? '',
                    };
                }
            }
            catch {
                const sucursales = useAuthStore.getState().sucursalesPermitidas;
                companyInfo.nombre = sucursales.find((sp) => sp.sucursal === sucursalActiva)?.nombre || '';
            }
            // Config de plantilla de cierre de turno (por codigo fijo TURNO_CIERRE)
            let config = null;
            try {
                config = await obtenerConfigPlantilla(CODIGO_PLANTILLA_TURNO_CIERRE);
            }
            catch {
                config = null;
            }
            // Generar ticket ESC/POS (texto con formato)
            let ticketText = formatTicket(data, companyInfo, config || undefined, 'TICKET_TC');
            // Avance y corte DESPUÉS del contenido
            ticketText += feed(config?.opciones?.feedCorte ?? 4);
            ticketText += CMD_CUT;
            // Logo configurable: generar comando GS v 0 (base64) si la plantilla lo activa.
            let logoBase64 = '';
            if (config?.logo?.mostrar) {
                logoBase64 = await obtenerLogoEscPosBase64(config.logo);
            }
            // Enviar a QZ Tray como texto raw ESC/POS
            await qz.print(ticketText, logoBase64 || undefined);
            message.success(`Imprimiendo en: ${qz.printerName || 'Impresora POS'}`);
        }
        catch (err) {
            if (err.code === 'NO_PRINTER_SELECTED') {
                try {
                    const list = await qz.fetchPrinters();
                    if (list.length === 0) {
                        message.error('No hay impresoras POS disponibles.');
                    }
                    else {
                        setPrinterList(list);
                        setSelectedPrinter(list[0] || '');
                        setPrinterModalOpen(true);
                    }
                }
                catch {
                    message.error('QZ Tray: ' + (err.message || 'Error'));
                }
            }
            else {
                message.error('QZ Tray: ' + (err.message || 'Error'));
            }
        }
        finally {
            setImprimiendo(false);
        }
    };
    // Calcular cobros totales
    const cobrosTotales = React.useMemo(() => {
        if (!data?.cobros?.length)
            return {
                efectivo: 0, cheque: 0, transferencia: 0,
                tarjetaCredito: 0, tarjetaDebito: 0, bono: 0,
                tarjetaRegalo: 0, notaCredito: 0, pago: 0, devuelta: 0, facturaID: 0,
            };
        return data.cobros.reduce((acc, c) => ({
            efectivo: acc.efectivo + (c.efectivo || 0),
            cheque: acc.cheque + (c.cheque || 0),
            transferencia: acc.transferencia + (c.transferencia || 0),
            tarjetaCredito: acc.tarjetaCredito + (c.tarjetaCredito || 0),
            tarjetaDebito: acc.tarjetaDebito + (c.tarjetaDebito || 0),
            bono: acc.bono + (c.bono || 0),
            tarjetaRegalo: acc.tarjetaRegalo + (c.tarjetaRegalo || 0),
            notaCredito: acc.notaCredito + (c.notaCredito || 0),
            pago: acc.pago + (c.pago || 0),
            devuelta: acc.devuelta + (c.devuelta || 0),
            facturaID: 0,
        }), { efectivo: 0, cheque: 0, transferencia: 0, tarjetaCredito: 0, tarjetaDebito: 0, bono: 0, tarjetaRegalo: 0, notaCredito: 0, pago: 0, devuelta: 0, facturaID: 0 });
    }, [data?.cobros]);
    const cobrado = data?.cobros?.reduce((sum, c) => sum +
        (c.efectivo || 0) + (c.cheque || 0) + (c.transferencia || 0) +
        (c.tarjetaCredito || 0) + (c.tarjetaDebito || 0) + (c.bono || 0) +
        (c.tarjetaRegalo || 0) + (c.notaCredito || 0), 0) ?? 0;
    const total = data?.total ?? 0;
    const porCobrar = total - cobrado;
    // Mapa de pagos por factura
    const pagosPorFactura = React.useMemo(() => {
        const mapa = {};
        if (!data?.cobros)
            return mapa;
        data.cobros.forEach((c) => {
            if (!mapa[c.facturaID]) {
                mapa[c.facturaID] = { metodos: [], totalPagado: 0 };
            }
            const metodos = [];
            if (c.efectivo > 0)
                metodos.push({ key: 'efectivo', label: 'Efvo.', monto: c.efectivo });
            if (c.cheque > 0)
                metodos.push({ key: 'cheque', label: 'Cheque', monto: c.cheque });
            if (c.transferencia > 0)
                metodos.push({ key: 'transferencia', label: 'Transf.', monto: c.transferencia });
            if (c.tarjetaCredito > 0)
                metodos.push({ key: 'tarjetaCredito', label: 'T.Créd.', monto: c.tarjetaCredito });
            if (c.tarjetaDebito > 0)
                metodos.push({ key: 'tarjetaDebito', label: 'T.Déb.', monto: c.tarjetaDebito });
            if (c.bono > 0)
                metodos.push({ key: 'bono', label: 'Bono', monto: c.bono });
            if (c.tarjetaRegalo > 0)
                metodos.push({ key: 'tarjetaRegalo', label: 'T.Reg.', monto: c.tarjetaRegalo });
            if (c.notaCredito > 0)
                metodos.push({ key: 'notaCredito', label: 'N.Créd.', monto: c.notaCredito });
            mapa[c.facturaID].metodos.push(...metodos);
            mapa[c.facturaID].totalPagado += metodos.reduce((sum, m) => sum + m.monto, 0);
        });
        return mapa;
    }, [data?.cobros]);
    // Mapas para iconos y labels de métodos de pago
    const METODO_PAGO_LABELS = {
        efectivo: 'Efectivo', cheque: 'Cheque', transferencia: 'Transferencia',
        tarjetaCredito: 'T. Crédito', tarjetaDebito: 'T. Débito',
        bono: 'Bono', tarjetaRegalo: 'T. Regalo', notaCredito: 'N. Crédito',
    };
    const ICONO_MAP = {
        efectivo: _jsx(DollarCircleOutlined, { style: { fontSize: 16, color: '#52c41a' } }),
        cheque: _jsx(FileTextOutlined, { style: { fontSize: 16, color: '#1890ff' } }),
        transferencia: _jsx(SwapOutlined, { style: { fontSize: 16, color: '#722ed1' } }),
        tarjetaCredito: _jsx(CreditCardOutlined, { style: { fontSize: 16, color: '#13c2c2' } }),
        tarjetaDebito: _jsx(CreditCardFilled, { style: { fontSize: 16, color: '#2f54eb' } }),
        bono: _jsx(GiftOutlined, { style: { fontSize: 16, color: '#faad14' } }),
        tarjetaRegalo: _jsx(TagOutlined, { style: { fontSize: 16, color: '#fa8c16' } }),
        notaCredito: _jsx(RollbackOutlined, { style: { fontSize: 16, color: '#ff4d4f' } }),
    };
    // Columnas de facturas con filtro tipo Excel
    const facturaColumns = [
        {
            title: 'No. Documento',
            key: 'noDocumento',
            width: 160,
            filterDropdown: ({ confirm, clearFilters }) => (_jsx(FiltroSeleccionDropdown, { dataSource: data?.facturas || [], dataIndex: "noDocumento", render: (r) => r.noDocumento || r.documento || '', placeholder: "Buscar documento...", filtroKey: "noDocumento", filtrosActivos: filtrosActivos, setFiltrosActivos: setFiltrosActivos, confirm: confirm, clearFilters: clearFilters })),
            filterIcon: () => filtrosActivos.noDocumento
                ? _jsx(FilterFilled, { style: { color: '#556ee6', fontSize: 12 } })
                : _jsx(FilterOutlined, { style: { color: '#8c8c8c', fontSize: 12 } }),
            render: (_, record) => (_jsx(Text, { className: "paces-doc-link", onClick: () => navigate(`/FPV/${record.id}`), style: { cursor: 'pointer' }, children: record.noDocumento || record.documento || '-' })),
        },
        {
            title: 'Fecha',
            dataIndex: 'fechaDocumento',
            key: 'fechaDocumento',
            width: 140,
            filterDropdown: ({ confirm, clearFilters }) => (_jsx(FiltroFechaDropdown, { confirm: confirm, clearFilters: clearFilters, filtroKey: "fechaDocumento", filtrosActivos: filtrosActivos, setFiltrosActivos: setFiltrosActivos })),
            filterIcon: () => filtrosActivos.fechaDocumento
                ? _jsx(FilterFilled, { style: { color: '#556ee6', fontSize: 12 } })
                : _jsx(FilterOutlined, { style: { color: '#8c8c8c', fontSize: 12 } }),
            render: (val) => _jsx(Text, { children: val ? formatDate(val) : '-' }),
        },
        {
            title: 'Entidad/Cliente',
            key: 'cliente',
            width: 250,
            ellipsis: true,
            filterDropdown: ({ confirm, clearFilters }) => (_jsx(FiltroSeleccionDropdown, { dataSource: data?.facturas || [], dataIndex: "cliente", render: (r) => r.cliente?.nombre || '', placeholder: "Buscar cliente...", filtroKey: "cliente", filtrosActivos: filtrosActivos, setFiltrosActivos: setFiltrosActivos, confirm: confirm, clearFilters: clearFilters })),
            filterIcon: () => filtrosActivos.cliente
                ? _jsx(FilterFilled, { style: { color: '#556ee6', fontSize: 12 } })
                : _jsx(FilterOutlined, { style: { color: '#8c8c8c', fontSize: 12 } }),
            render: (_, record) => (_jsx(Text, { children: record.cliente?.nombre || '-' })),
        },
        {
            title: 'Pagos',
            key: 'pagos',
            width: 160,
            filterDropdown: ({ confirm, clearFilters }) => {
                const metodosSet = new Set();
                (data?.facturas || []).forEach((fac) => {
                    const pagos = pagosPorFactura[fac.id];
                    if (pagos?.metodos?.length) {
                        pagos.metodos.forEach((m) => metodosSet.add(m.key));
                    }
                    else {
                        metodosSet.add('sin_pago');
                    }
                });
                const options = Array.from(metodosSet).map(key => ({
                    label: key === 'sin_pago' ? 'Sin pago' : (METODO_PAGO_LABELS[key] || key),
                    value: key,
                }));
                return (_jsxs("div", { style: { padding: 8, minWidth: 180 }, children: [_jsx(Checkbox.Group, { value: filtrosActivos.pagos?.valor || [], onChange: (checkedValues) => {
                                setFiltrosActivos(prev => {
                                    if (checkedValues.length > 0) {
                                        return { ...prev, pagos: { valor: checkedValues } };
                                    }
                                    const n = { ...prev };
                                    delete n.pagos;
                                    return n;
                                });
                            }, children: _jsx(Space, { direction: "vertical", style: { width: '100%' }, children: options.map(opt => (_jsx(Checkbox, { value: opt.value, children: opt.label }, opt.value))) }) }), _jsxs("div", { style: { marginTop: 8, display: 'flex', justifyContent: 'space-between' }, children: [_jsx(Button, { size: "small", onClick: () => {
                                        setFiltrosActivos(prev => { const n = { ...prev }; delete n.pagos; return n; });
                                        clearFilters?.();
                                        confirm();
                                    }, children: "Limpiar" }), _jsx(Button, { type: "primary", size: "small", onClick: () => confirm(), children: "Aceptar" })] })] }));
            },
            filterIcon: () => filtrosActivos.pagos
                ? _jsx(FilterFilled, { style: { color: '#556ee6', fontSize: 12 } })
                : _jsx(FilterOutlined, { style: { color: '#8c8c8c', fontSize: 12 } }),
            render: (_, record) => {
                const pagos = pagosPorFactura[record.id];
                if (!pagos || pagos.metodos.length === 0) {
                    return _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "\u2014" });
                }
                return (_jsx(Space, { size: [2, 0], children: pagos.metodos.map((m) => (_jsx(Tooltip, { title: `${METODO_PAGO_LABELS[m.key] || m.label}: ${formatNumber(m.monto)}`, children: ICONO_MAP[m.key] }, m.key))) }));
            },
        },
        {
            title: 'Pendiente',
            key: 'pendiente',
            width: 130,
            align: 'right',
            filterDropdown: ({ confirm, clearFilters }) => (_jsx(FiltroSeleccionDropdown, { dataSource: data?.facturas || [], dataIndex: "pendiente", render: (record) => {
                    const pagos = pagosPorFactura[record.id];
                    const cobrado = pagos?.totalPagado || 0;
                    const pendiente = record.total - cobrado;
                    return pendiente <= 0.01 ? 'Pagado' : 'Con pendiente';
                }, placeholder: "Buscar...", filtroKey: "pendiente", filtrosActivos: filtrosActivos, setFiltrosActivos: setFiltrosActivos, confirm: confirm, clearFilters: clearFilters })),
            filterIcon: () => filtrosActivos.pendiente
                ? _jsx(FilterFilled, { style: { color: '#556ee6', fontSize: 12 } })
                : _jsx(FilterOutlined, { style: { color: '#8c8c8c', fontSize: 12 } }),
            render: (_, record) => {
                const pagos = pagosPorFactura[record.id];
                const cobrado = pagos?.totalPagado || 0;
                const pendiente = record.total - cobrado;
                if (pendiente <= 0.01) {
                    return _jsx(Text, { style: { color: '#52c41a' }, children: "Pagado" });
                }
                return _jsx(Text, { strong: true, style: { color: '#ff4d4f' }, children: formatNumber(pendiente) });
            },
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 140,
            align: 'right',
            render: (val) => _jsx(Text, { strong: true, children: formatNumber(val) }),
        },
    ];
    // Columnas de desglose cobros
    const metodoPagoColumns = [
        {
            title: 'Método de Pago',
            key: 'metodo',
            render: (_, record) => _jsx(Text, { children: record.metodo }),
        },
        {
            title: 'Monto',
            key: 'monto',
            align: 'right',
            width: 160,
            render: (_, record) => _jsx(Text, { strong: true, children: formatNumber(record.monto) }),
        },
    ];
    const metodosPago = [
        { metodo: 'Efectivo', monto: cobrosTotales.efectivo, key: 'efectivo' },
        { metodo: 'Cheque', monto: cobrosTotales.cheque, key: 'cheque' },
        { metodo: 'Transferencia', monto: cobrosTotales.transferencia, key: 'transferencia' },
        { metodo: 'Tarjeta Crédito', monto: cobrosTotales.tarjetaCredito, key: 'tarjetaCredito' },
        { metodo: 'Tarjeta Débito', monto: cobrosTotales.tarjetaDebito, key: 'tarjetaDebito' },
        { metodo: 'Bono', monto: cobrosTotales.bono, key: 'bono' },
        { metodo: 'Tarjeta Regalo', monto: cobrosTotales.tarjetaRegalo, key: 'tarjetaRegalo' },
        { metodo: 'Nota Crédito', monto: cobrosTotales.notaCredito, key: 'notaCredito' },
    ].filter(m => m.monto !== 0);
    const loading = isLoading;
    const loadingError = isError;
    const [filtrosActivos, setFiltrosActivos] = useState({});
    const [costosFiltrosActivos, setCostosFiltrosActivos] = useState({});
    const [ingresosFiltrosActivos, setIngresosFiltrosActivos] = useState({});
    const [costosSearch, setCostosSearch] = useState('');
    const [ingresosSearch, setIngresosSearch] = useState('');
    const [posteando, setPosteando] = useState(false);
    const qz = useQZTray();
    const [imprimiendo, setImprimiendo] = useState(false);
    const [printerModalOpen, setPrinterModalOpen] = useState(false);
    const [printerList, setPrinterList] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState('');
    const asientos = data?.factura?.asientos || [];
    const logs = data?.factura?.logs || [];
    const detalles = data?.factura?.detalles || [];
    // ─── Helpers de filtros ──────────────────────────────────────────────────────
    const limpiarFiltro = React.useCallback((key) => {
        setFiltrosActivos(prev => { const n = { ...prev }; delete n[key]; return n; });
    }, []);
    const limpiarTodosFiltros = React.useCallback(() => {
        setFiltrosActivos({});
    }, []);
    const limpiarFiltroCostos = React.useCallback((key) => {
        setCostosFiltrosActivos(prev => { const n = { ...prev }; delete n[key]; return n; });
    }, []);
    const limpiarTodosFiltrosCostos = React.useCallback(() => {
        setCostosFiltrosActivos({});
    }, []);
    const limpiarFiltroIngresos = React.useCallback((key) => {
        setIngresosFiltrosActivos(prev => { const n = { ...prev }; delete n[key]; return n; });
    }, []);
    const limpiarTodosFiltrosIngresos = React.useCallback(() => {
        setIngresosFiltrosActivos({});
    }, []);
    const documentosFiltrados = React.useMemo(() => {
        let result = data?.facturas || [];
        Object.entries(filtrosActivos).forEach(([key, filtro]) => {
            if (!filtro)
                return;
            result = result.filter((doc) => {
                if (key === 'noDocumento') {
                    const val = doc.noDocumento || doc.documento || '';
                    return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
                }
                if (key === 'cliente') {
                    const val = doc.cliente?.nombre || '';
                    return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
                }
                if (key === 'fechaDocumento') {
                    const docFecha = doc.fechaDocumento ? new Date(doc.fechaDocumento).getTime() : 0;
                    const desde = filtro.value?.[0] ? new Date(filtro.value[0]).getTime() : 0;
                    const hasta = filtro.value?.[1] ? new Date(filtro.value[1]).getTime() : Infinity;
                    return docFecha >= desde && docFecha <= hasta;
                }
                if (key === 'pagos') {
                    const seleccionados = filtro.valor || [];
                    if (seleccionados.length === 0)
                        return true;
                    const pagos = pagosPorFactura[doc.id];
                    const metodosDoc = pagos?.metodos?.map((m) => m.key) || [];
                    if (metodosDoc.length === 0 && seleccionados.includes('sin_pago'))
                        return true;
                    if (metodosDoc.length > 0)
                        return seleccionados.some((m) => metodosDoc.includes(m));
                    return false;
                }
                if (key === 'pendiente') {
                    const pagos = pagosPorFactura[doc.id];
                    const cobrado = pagos?.totalPagado || 0;
                    const pendiente = doc.total - cobrado;
                    const estado = pendiente <= 0.01 ? 'Pagado' : 'Con pendiente';
                    return Array.isArray(filtro.valor) ? filtro.valor.includes(estado) : true;
                }
                return true;
            });
        });
        return result;
    }, [data?.facturas, filtrosActivos]);
    const costosFiltrados = React.useMemo(() => {
        let result = detalles;
        // Apply column filters
        Object.entries(costosFiltrosActivos).forEach(([key, filtro]) => {
            if (!filtro)
                return;
            result = result.filter((d) => {
                if (key === 'codigo') {
                    const val = d.codigo || '';
                    return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
                }
                if (key === 'articulo') {
                    const val = d.articulo || '';
                    return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
                }
                return true;
            });
        });
        // Apply text search
        if (costosSearch) {
            const q = costosSearch.toLowerCase();
            result = result.filter((d) => (d.codigo?.toLowerCase() || '').includes(q) ||
                (d.articulo?.toLowerCase() || '').includes(q) ||
                (d.referencia?.toLowerCase() || '').includes(q));
        }
        return result;
    }, [costosSearch, detalles, costosFiltrosActivos]);
    const ingresosFiltrados = React.useMemo(() => {
        let result = detalles;
        // Apply column filters
        Object.entries(ingresosFiltrosActivos).forEach(([key, filtro]) => {
            if (!filtro)
                return;
            result = result.filter((d) => {
                if (key === 'codigo') {
                    const val = d.codigo || '';
                    return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
                }
                if (key === 'articulo') {
                    const val = d.articulo || '';
                    return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
                }
                if (key === 'impuesto') {
                    const val = d.impuesto?.nombre || '';
                    return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
                }
                return true;
            });
        });
        // Apply text search
        if (ingresosSearch) {
            const q = ingresosSearch.toLowerCase();
            result = result.filter((d) => (d.codigo?.toLowerCase() || '').includes(q) ||
                (d.articulo?.toLowerCase() || '').includes(q) ||
                (d.referencia?.toLowerCase() || '').includes(q));
        }
        return result;
    }, [ingresosSearch, detalles, ingresosFiltrosActivos]);
    if (loading || (!data && !loadingError)) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando detalle del turno..." })] }));
    }
    if (loadingError && !data) {
        return (_jsxs("div", { children: [_jsx(Alert, { message: "Error al cargar detalle del turno", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) }), _jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate(-1), children: "Volver" })] }));
    }
    if (!data)
        return null;
    const estadoTag = data.cerrado
        ? _jsx(Tag, { color: "green", children: "Cerrado" })
        : _jsx(Tag, { color: "warning", children: "Abierto" });
    const contentCard = (_jsxs(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsx(Space, { children: estadoTag })] }), style: { marginBottom: 16 }, children: [_jsxs(Descriptions, { bordered: true, size: "small", column: isLarge ? 3 : 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "No. Turno", children: data.noTurno }), _jsx(Descriptions.Item, { label: "Cajero", children: toTitleCase(data.usuario?.nombre || '') }), _jsx(Descriptions.Item, { label: "POS", children: data.nombrePOS || '-' }), _jsx(Descriptions.Item, { label: "Fecha Apertura", children: formatDateTime(data.fechaApertura) }), _jsx(Descriptions.Item, { label: "Fecha Cierre", children: data.fechaCierre ? formatDateTime(data.fechaCierre) : '-' }), _jsx(Descriptions.Item, { label: "Cerrado", children: _jsx(Tag, { color: data.cerrado ? 'green' : 'default', children: data.cerrado ? 'Sí' : 'No' }) })] }), _jsx(Divider, { plain: true, style: { margin: '8px 0', fontSize: 12 }, children: "Totales" }), _jsxs("div", { style: { display: 'flex', flexDirection: isLarge ? 'row' : 'column', gap: 16, padding: '0 8px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', flex: 1 }, children: [_jsx("span", { className: "paces-text-secondary", children: "Total Facturado" }), _jsx(Text, { strong: true, children: formatCurrency(total) })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', flex: 1 }, children: [_jsx("span", { className: "paces-text-secondary", children: "Cobrado" }), _jsx(Text, { strong: true, style: { color: '#34c38f' }, children: formatCurrency(cobrado) })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', flex: 1 }, children: [_jsx("span", { className: "paces-text-secondary", children: "Por Cobrar" }), _jsx(Text, { strong: true, style: { color: porCobrar > 0 ? '#f46a6a' : '#595959' }, children: formatCurrency(porCobrar) })] })] })] }));
    const costosColumns = [
        {
            title: 'Código',
            key: 'codigo',
            width: 120,
            fixed: 'left',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            filterDropdown: ({ confirm, clearFilters }) => (_jsx(FiltroSeleccionDropdown, { dataSource: detalles, dataIndex: "codigo", placeholder: "Buscar c\u00F3digo...", filtroKey: "codigo", filtrosActivos: costosFiltrosActivos, setFiltrosActivos: setCostosFiltrosActivos, confirm: confirm, clearFilters: clearFilters })),
            filterIcon: () => costosFiltrosActivos.codigo
                ? _jsx(FilterFilled, { style: { color: '#556ee6', fontSize: 12 } })
                : _jsx(FilterOutlined, { style: { color: '#8c8c8c', fontSize: 12 } }),
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx("div", { children: record.codigo || '-' }), record.referencia && (_jsx(Tooltip, { title: record.referencia, children: _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }, children: record.referencia }) }))] })),
        },
        {
            title: 'Artículo',
            key: 'articulo',
            ellipsis: true,
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            filterDropdown: ({ confirm, clearFilters }) => (_jsx(FiltroSeleccionDropdown, { dataSource: detalles, dataIndex: "articulo", placeholder: "Buscar art\u00EDculo...", filtroKey: "articulo", filtrosActivos: costosFiltrosActivos, setFiltrosActivos: setCostosFiltrosActivos, confirm: confirm, clearFilters: clearFilters })),
            filterIcon: () => costosFiltrosActivos.articulo
                ? _jsx(FilterFilled, { style: { color: '#556ee6', fontSize: 12 } })
                : _jsx(FilterOutlined, { style: { color: '#8c8c8c', fontSize: 12 } }),
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx("div", { children: toTitleCase(record.articulo || '') }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }, children: record.familia?.nombre ? _jsx(Tag, { style: { fontSize: 11, lineHeight: '18px', padding: '0 6px' }, children: toTitleCase(record.familia.nombre) }) : null })] })),
        },
        {
            title: 'Cantidad',
            dataIndex: 'cantidad',
            key: 'cantidad',
            width: 100,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { children: [_jsx("div", { style: { fontSize: 13 }, children: formatNumber(record.cantidad || 0) }), record.medida?.nombre && (_jsx(Tooltip, { title: record.medida.nombre, children: _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: record.medida.nombre }) }))] })),
        },
        {
            title: 'Costo',
            dataIndex: 'costo',
            key: 'costo',
            width: 130,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx("div", { children: formatNumber(record.costo || 0) }), record.medida?.factor && record.medida.factor !== 1 && (_jsxs("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, textAlign: 'right' }, children: ["\u00D7 ", record.medida.factor] }))] })),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top', paddingRight: 16 } }),
            onHeaderCell: () => ({ style: { paddingRight: 16 } }),
            render: (_, record) => (_jsxs("div", { children: [_jsx(Text, { strong: true, style: { fontSize: 13 }, children: formatNumber(record.total || 0) }), _jsx("div", { style: { fontSize: 11, lineHeight: 1.5 }, children: "\u00A0" })] })),
        },
    ];
    const ingresosColumns = [
        {
            title: 'Código',
            key: 'codigo',
            width: 120,
            fixed: 'left',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            filterDropdown: ({ confirm, clearFilters }) => (_jsx(FiltroSeleccionDropdown, { dataSource: detalles, dataIndex: "codigo", placeholder: "Buscar c\u00F3digo...", filtroKey: "codigo", filtrosActivos: ingresosFiltrosActivos, setFiltrosActivos: setIngresosFiltrosActivos, confirm: confirm, clearFilters: clearFilters })),
            filterIcon: () => ingresosFiltrosActivos.codigo
                ? _jsx(FilterFilled, { style: { color: '#556ee6', fontSize: 12 } })
                : _jsx(FilterOutlined, { style: { color: '#8c8c8c', fontSize: 12 } }),
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx("div", { children: record.codigo || '-' }), record.referencia && (_jsx(Tooltip, { title: record.referencia, children: _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }, children: record.referencia }) }))] })),
        },
        {
            title: 'Artículo',
            key: 'articulo',
            ellipsis: true,
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            filterDropdown: ({ confirm, clearFilters }) => (_jsx(FiltroSeleccionDropdown, { dataSource: detalles, dataIndex: "articulo", placeholder: "Buscar art\u00EDculo...", filtroKey: "articulo", filtrosActivos: ingresosFiltrosActivos, setFiltrosActivos: setIngresosFiltrosActivos, confirm: confirm, clearFilters: clearFilters })),
            filterIcon: () => ingresosFiltrosActivos.articulo
                ? _jsx(FilterFilled, { style: { color: '#556ee6', fontSize: 12 } })
                : _jsx(FilterOutlined, { style: { color: '#8c8c8c', fontSize: 12 } }),
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx("div", { children: toTitleCase(record.articulo || '') }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }, children: record.familia?.nombre ? _jsx(Tag, { style: { fontSize: 11, lineHeight: '18px', padding: '0 6px' }, children: toTitleCase(record.familia.nombre) }) : null })] })),
        },
        {
            title: 'Cantidad',
            dataIndex: 'cantidad',
            key: 'cantidad',
            width: 100,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { children: [_jsx("div", { style: { fontSize: 13 }, children: formatNumber(record.cantidad || 0) }), record.medida?.nombre && (_jsx(Tooltip, { title: record.medida.nombre, children: _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: record.medida.nombre }) }))] })),
        },
        {
            title: 'Precio',
            dataIndex: 'precio',
            key: 'precio',
            width: 130,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx("div", { children: formatNumber(record.precio || 0) }), _jsx("div", { style: { fontSize: 11, lineHeight: 1.5 }, children: "\u00A0" })] })),
        },
        {
            title: 'Impuestos',
            dataIndex: 'impuestos',
            key: 'impuestos',
            width: 180,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            filterDropdown: ({ confirm, clearFilters }) => (_jsx(FiltroSeleccionDropdown, { dataSource: detalles, dataIndex: "impuesto", render: (r) => r.impuesto?.nombre || '', placeholder: "Buscar impuesto...", filtroKey: "impuesto", filtrosActivos: ingresosFiltrosActivos, setFiltrosActivos: setIngresosFiltrosActivos, confirm: confirm, clearFilters: clearFilters })),
            filterIcon: () => ingresosFiltrosActivos.impuesto
                ? _jsx(FilterFilled, { style: { color: '#556ee6', fontSize: 12 } })
                : _jsx(FilterOutlined, { style: { color: '#8c8c8c', fontSize: 12 } }),
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx("div", { children: formatNumber(record.impuestos || 0) }), _jsx("div", { style: { fontSize: 11, lineHeight: 1.5 }, children: record.impuesto?.nombre || '' })] })),
        },
        {
            title: 'Descuentos',
            dataIndex: 'descuento',
            key: 'descuento',
            width: 130,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx("div", { children: formatNumber(record.descuento || 0) }), _jsx("div", { style: { fontSize: 11, lineHeight: 1.5 }, children: "\u00A0" })] })),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top', paddingRight: 16 } }),
            onHeaderCell: () => ({ style: { paddingRight: 16 } }),
            render: (_, record) => (_jsxs("div", { children: [_jsx(Text, { strong: true, style: { fontSize: 13 }, children: formatNumber(record.total || 0) }), _jsx("div", { style: { fontSize: 11, lineHeight: 1.5 }, children: "\u00A0" })] })),
        },
    ];
    const nDetalles = detalles.length;
    const tabsItems = [
        {
            key: 'documentos',
            label: `Documentos (${Object.keys(filtrosActivos).length > 0
                ? `${documentosFiltrados.length}/${data?.facturas?.length || 0}`
                : data?.facturas?.length || 0})`,
            children: (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, minHeight: 32 }, children: [Object.keys(filtrosActivos).length > 0 && (_jsxs(_Fragment, { children: [_jsx(Text, { type: "secondary", style: { fontSize: 13 }, children: "Filtros:" }), Object.entries(filtrosActivos).map(([key, f]) => (_jsxs(Tag, { closable: true, onClose: () => limpiarFiltro(key), children: [key === 'noDocumento' ? 'No. Documento' : key === 'cliente' ? 'Entidad/Cliente' : key === 'fechaDocumento' ? 'Fecha' : key === 'pagos' ? 'Pagos' : key === 'pendiente' ? 'Pendiente' : key, ": ", Array.isArray(f?.valor) ? f.valor.map((v) => v === 'sin_pago' ? 'Sin pago' : METODO_PAGO_LABELS[v] || v).join(', ') : f?.valor || `${f?.value?.[0] || ''} - ${f?.value?.[1] || ''}`] }, key))), _jsx(Button, { size: "small", onClick: limpiarTodosFiltros, type: "link", style: { padding: 0 }, children: "Limpiar filtros" })] })), _jsx("div", { style: { flex: 1 } })] }), _jsx(Table, { dataSource: documentosFiltrados, columns: facturaColumns, rowKey: "id", rowClassName: (record) => {
                            const pagos = pagosPorFactura[record.id];
                            const cobrado = pagos?.totalPagado || 0;
                            const pendiente = record.total - cobrado;
                            if (pendiente > 0.01)
                                return 'paces-row-pendiente';
                            return '';
                        }, size: "small", pagination: {
                            pageSize: 25,
                            showSizeChanger: false,
                            showTotal: (total) => `${total} registros`,
                        }, scroll: { x: 1100 }, locale: { emptyText: 'Sin facturas registradas' } })] })),
        },
        {
            key: 'detallesCostos',
            label: `Costos (${costosSearch || Object.keys(costosFiltrosActivos).length > 0
                ? `${costosFiltrados.length}/${detalles.length}`
                : detalles.length})`,
            children: (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, minHeight: 32 }, children: [Object.keys(costosFiltrosActivos).length > 0 && (_jsxs(_Fragment, { children: [_jsx(Text, { type: "secondary", style: { fontSize: 13 }, children: "Filtros:" }), Object.entries(costosFiltrosActivos).map(([key, f]) => (_jsxs(Tag, { closable: true, onClose: () => limpiarFiltroCostos(key), children: [key === 'codigo' ? 'Código' : key === 'articulo' ? 'Artículo' : key, ": ", Array.isArray(f?.valor) ? f.valor.join(', ') : f?.valor || ''] }, key))), _jsx(Button, { size: "small", onClick: limpiarTodosFiltrosCostos, type: "link", style: { padding: 0 }, children: "Limpiar filtros" })] })), _jsx("div", { style: { flex: 1 } }), _jsx(Input.Search, { placeholder: "Buscar producto...", allowClear: true, style: { maxWidth: 250 }, onSearch: (value) => setCostosSearch(value), onChange: (e) => { if (!e.target.value)
                                    setCostosSearch(''); } })] }), _jsx(Table, { dataSource: costosFiltrados, columns: costosColumns, rowKey: "id", size: "small", pagination: {
                            pageSize: 25,
                            showSizeChanger: false,
                            showTotal: (total) => `${total} registros`,
                        }, scroll: { x: 900 }, locale: { emptyText: 'Sin detalles de costo' } })] })),
        },
        {
            key: 'detallesIngresos',
            label: `Ingresos (${ingresosSearch || Object.keys(ingresosFiltrosActivos).length > 0
                ? `${ingresosFiltrados.length}/${detalles.length}`
                : detalles.length})`,
            children: (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, minHeight: 32 }, children: [Object.keys(ingresosFiltrosActivos).length > 0 && (_jsxs(_Fragment, { children: [_jsx(Text, { type: "secondary", style: { fontSize: 13 }, children: "Filtros:" }), Object.entries(ingresosFiltrosActivos).map(([key, f]) => (_jsxs(Tag, { closable: true, onClose: () => limpiarFiltroIngresos(key), children: [key === 'codigo' ? 'Código' : key === 'articulo' ? 'Artículo' : key === 'impuesto' ? 'Impuesto' : key, ": ", Array.isArray(f?.valor) ? f.valor.join(', ') : f?.valor || ''] }, key))), _jsx(Button, { size: "small", onClick: limpiarTodosFiltrosIngresos, type: "link", style: { padding: 0 }, children: "Limpiar filtros" })] })), _jsx("div", { style: { flex: 1 } }), _jsx(Input.Search, { placeholder: "Buscar producto...", allowClear: true, style: { maxWidth: 250 }, onSearch: (value) => setIngresosSearch(value), onChange: (e) => { if (!e.target.value)
                                    setIngresosSearch(''); } })] }), _jsx(Table, { dataSource: ingresosFiltrados, columns: ingresosColumns, rowKey: "id", size: "small", pagination: {
                            pageSize: 25,
                            showSizeChanger: false,
                            showTotal: (total) => `${total} registros`,
                        }, scroll: { x: 1100 }, locale: { emptyText: 'Sin detalles de ingreso' } })] })),
        },
        {
            key: 'cobros',
            label: `Cobros (${data.cobros?.length || 0})`,
            children: (_jsxs("div", { children: [_jsx(Table, { dataSource: metodosPago, columns: metodoPagoColumns, rowKey: "key", size: "small", pagination: false, style: { marginBottom: 16 }, locale: { emptyText: 'Sin cobros registrados' } }), _jsx(Card, { className: "paces-card", size: "small", title: _jsx("span", { style: { fontSize: 14, fontWeight: 600 }, children: "Totales" }), children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 16 }, children: [_jsx("span", { className: "paces-text-secondary", children: "Total Facturado" }), _jsx(Text, { strong: true, children: formatNumber(total) })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 16 }, children: [_jsx("span", { className: "paces-text-secondary", children: "Cobrado" }), _jsx(Text, { strong: true, style: { color: '#34c38f' }, children: formatNumber(cobrado) })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 16 }, children: [_jsx("span", { className: "paces-text-secondary", children: "Devuelta" }), _jsx(Text, { strong: true, children: formatNumber(cobrosTotales.devuelta) })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 16 }, children: [_jsx("span", { className: "paces-text-secondary", children: "Por Cobrar" }), _jsx(Text, { strong: true, style: { color: porCobrar > 0 ? '#f46a6a' : '#595959' }, children: formatNumber(porCobrar) })] })] }) })] })),
        },
        ...(asientos.length > 0 ? [{
                key: 'asientos',
                label: `Asientos (${asientos.length})`,
                children: _jsx(AsientosContableTable, { asientos: asientos, scroll: { x: 800 } }),
            }] : []),
        ...(logs.length > 0 ? [{
                key: 'historial',
                label: `Historial (${logs.length})`,
                children: _jsx(LogTable, { dataSource: logs, scroll: { x: 800 } }),
            }] : []),
    ];
    return (_jsxs("div", { children: [_jsx("style", { children: `
  .paces-row-pendiente {
    background-color: #fff1f0 !important;
  }
  .paces-row-pendiente:hover td {
    background-color: #ffccc7 !important;
  }
` }), loadingError && (_jsx(Alert, { message: "Error al cargar detalle del turno", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(DetalleToolbar, { modulo: "FTURNOS", estado: data.cerrado ? 1 : 0, periodo: data.periodo ?? 0, saving: posteando, onVolver: () => navigate(-1), onPostear: handlePostear, extraButtons: _jsxs(Space, { children: [_jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: handleRefresh }), _jsxs(PermissionGate, { codigoPantalla: "FTURNOS", accion: "IMPRIMIR", children: [_jsx(Button, { icon: _jsx(PrinterOutlined, {}), loading: imprimiendo, onClick: handleImprimirTicket, children: "Ticket Cierre" }), qz.printerName && (_jsxs(Tag, { color: "success", style: { marginLeft: 2, fontSize: 11, lineHeight: '18px' }, children: ["QZ: ", qz.printerName] }))] })] }) }), _jsxs("div", { children: [contentCard, _jsx(Tabs, { defaultActiveKey: "documentos", type: "card", items: tabsItems })] }), _jsx(ModalSeleccionarImpresoraPOS, { open: printerModalOpen, impresoras: printerList, seleccionada: selectedPrinter, onSelect: setSelectedPrinter, onConfirm: async () => {
                    if (!selectedPrinter)
                        return;
                    qz.selectPrinter(selectedPrinter);
                    setPrinterModalOpen(false);
                    handleImprimirTicket();
                }, onClose: () => { setPrinterModalOpen(false); } })] }));
};
export default TurnoDetalle;
