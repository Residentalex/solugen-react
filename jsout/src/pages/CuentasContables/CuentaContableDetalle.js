import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, message, Row, Col, Table, Statistic, Typography, Empty, Spin, Skeleton } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, SwapOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { cuentaContableApi } from '../../api/cuentaContableApi';
import { OrigenCuenta } from '../../types/contabilidad';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
const { Text } = Typography;
const ORIGEN_LABEL = {
    [OrigenCuenta.Debito]: 'Débito',
    [OrigenCuenta.Credito]: 'Crédito',
    [OrigenCuenta.Desconocido]: 'Desconocido',
};
const CuentaContableDetalle = () => {
    const { noCuenta } = useParams();
    const navigate = useNavigate();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [item, setItem] = useState(null);
    const [movimientos, setMovimientos] = useState([]);
    const [totalMovimientos, setTotalMovimientos] = useState(0);
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [loadingMovimientos, setLoadingMovimientos] = useState(false);
    const [loadingBalance, setLoadingBalance] = useState(false);
    const [pagina, setPagina] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    // Carga inicial en dos fases: datos básicos primero, balance pesado después
    useEffect(() => {
        setActiveModule('MCuentaContable');
        if (sucursalActiva === undefined || !noCuenta)
            return;
        setLoading(true);
        cuentaContableApi.obtenerPorId(sucursalActiva, noCuenta)
            .then(cta => {
            if (!cta) {
                message.error('Cuenta contable no encontrada en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setItem(cta);
            setPageTitleOverride(cta.noCuenta);
            setLoading(false);
            // Fase 2: balance pesado
            setLoadingBalance(true);
            return cuentaContableApi.obtenerBalance(sucursalActiva, noCuenta);
        })
            .then(bal => {
            if (bal)
                setBalance(bal);
        })
            .catch((err) => {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar datos');
            setLoadingError(true);
            navigate('/MCuentaContable');
        })
            .finally(() => {
            setLoading(false);
            setLoadingBalance(false);
        });
        return () => setPageTitleOverride('');
    }, [noCuenta, sucursalActiva]);
    // Carga de movimientos paginada
    const cargarMovimientos = useCallback(async (pag, size) => {
        if (!sucursalActiva || !noCuenta)
            return;
        setLoadingMovimientos(true);
        try {
            const skip = (pag - 1) * size;
            const result = await cuentaContableApi.obtenerMovimientos(sucursalActiva, noCuenta, skip, size, balance?.fechaUltimoCierre ?? undefined);
            setMovimientos(result.data);
            setTotalMovimientos(result.total);
        }
        catch {
            message.error('Error al cargar movimientos');
        }
        finally {
            setLoadingMovimientos(false);
        }
    }, [sucursalActiva, noCuenta, balance?.fechaUltimoCierre]);
    useEffect(() => {
        cargarMovimientos(pagina, pageSize);
    }, [pagina, pageSize, cargarMovimientos]);
    const handleRefresh = useCallback(() => {
        if (!noCuenta)
            return;
        setLoadingError(false);
        setLoading(true);
        cuentaContableApi.obtenerPorId(sucursalActiva, noCuenta)
            .then(cta => {
            if (!cta) {
                message.error('Cuenta contable no encontrada en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setItem(cta);
            setPageTitleOverride(cta.noCuenta);
            setLoading(false);
            setLoadingBalance(true);
            return cuentaContableApi.obtenerBalance(sucursalActiva, noCuenta);
        })
            .then(bal => {
            if (bal)
                setBalance(bal);
        })
            .catch((err) => {
            message.error(err?.response?.data?.errorMessage || 'Error al recargar');
            setLoadingError(true);
        })
            .finally(() => {
            setLoading(false);
            setLoadingBalance(false);
        });
    }, [noCuenta, sucursalActiva]);
    const columnsMovimientos = [
        { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 90,
            render: (v) => v ? v.substring(0, 10) : '-' },
        { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140 },
        { title: 'Entidad', dataIndex: 'entidad', key: 'entidad' },
        { title: 'Débito', dataIndex: 'debe', key: 'debe', width: 120, align: 'right',
            render: (v) => v ? v.toLocaleString('es-DO', { minimumFractionDigits: 2 }) : '-' },
        { title: 'Crédito', dataIndex: 'haber', key: 'haber', width: 120, align: 'right',
            render: (v) => v ? v.toLocaleString('es-DO', { minimumFractionDigits: 2 }) : '-' },
    ];
    return (_jsx(DetalleCatalogoLayout, { rutaVolver: "/MCuentaContable", loading: loading, mensajeLoading: "Cargando cuenta contable...", loadingError: loadingError, mensajeError: "Error al cargar detalle de cuenta contable", onRecargar: handleRefresh, dataDisponible: !!item, onEditar: () => navigate('/MCuentaContable', { state: { editarNoCuenta: noCuenta } }), children: _jsxs(Row, { gutter: [16, 16], children: [_jsx(Col, { xs: 24, lg: 8, children: _jsx(Card, { className: "paces-card", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { children: "Datos Generales" }), _jsx(Tag, { color: item?.activo ? 'green' : 'default', children: item?.activo ? 'Activo' : 'Inactivo' })] }), children: _jsxs(Descriptions, { column: 1, bordered: true, size: "small", children: [_jsx(Descriptions.Item, { label: "Nombre", children: item?.nombre }), _jsx(Descriptions.Item, { label: "Tipo", children: "\u2014" }), _jsx(Descriptions.Item, { label: "Tipo Cuenta", children: item?.tipoCuenta?.nombre || '-' }), _jsx(Descriptions.Item, { label: "Grupo", children: item?.grupo?.nombre || '-' }), _jsx(Descriptions.Item, { label: "Moneda", children: item?.moneda?.codigo || '-' }), _jsx(Descriptions.Item, { label: "Origen", children: ORIGEN_LABEL[item?.origen ?? -1] || 'Desconocido' }), _jsx(Descriptions.Item, { label: "Cuenta Control", children: item?.cuentaControl?.noCuenta
                                        ? `${item.cuentaControl.noCuenta} - ${item.cuentaControl.nombre}`
                                        : '-' }), _jsx(Descriptions.Item, { label: "Cuenta Prima", children: item?.cuentaPrima?.noCuenta
                                        ? `${item.cuentaPrima.noCuenta} - ${item.cuentaPrima.nombre}`
                                        : '-' }), _jsx(Descriptions.Item, { label: "Centro Costo", children: item?.utilizaCentroCosto ? 'Sí' : 'No' }), _jsx(Descriptions.Item, { label: "Nota", children: item?.nota || '-' })] }) }) }), _jsxs(Col, { xs: 24, lg: 16, children: [_jsx(Card, { className: "paces-card", title: "Resumen", style: { marginBottom: 16 }, children: loadingBalance && balance === null ? (_jsx(Row, { gutter: [16, 16], children: [0, 1, 2].map(i => (_jsx(Col, { xs: 12, sm: 8, children: _jsx(Card, { size: "small", className: "paces-card", children: _jsx(Skeleton, { active: true, paragraph: false, title: { width: '60%' } }) }) }, i))) })) : (_jsxs(_Fragment, { children: [_jsxs(Row, { gutter: [16, 16], children: [_jsx(Col, { xs: 12, sm: 8, children: _jsx(Statistic, { title: "Total D\u00E9bitos", value: balance?.totalDebe ?? 0, precision: 2, prefix: _jsx(ArrowDownOutlined, { style: { color: '#f5222d' } }), valueStyle: { color: '#f5222d', fontSize: 18 } }) }), _jsx(Col, { xs: 12, sm: 8, children: _jsx(Statistic, { title: "Total Cr\u00E9ditos", value: balance?.totalHaber ?? 0, precision: 2, prefix: _jsx(ArrowUpOutlined, { style: { color: '#52c41a' } }), valueStyle: { color: '#52c41a', fontSize: 18 } }) }), _jsx(Col, { xs: 12, sm: 8, children: _jsx(Statistic, { title: "Saldo Actual", value: balance?.saldo ?? 0, precision: 2, prefix: _jsx(SwapOutlined, { style: { color: '#556ee6' } }), valueStyle: { color: '#556ee6', fontSize: 18, fontWeight: 600 } }) })] }), balance?.fechaUltimoCierre && (_jsx(Row, { gutter: [16, 16], style: { marginTop: 16 }, children: _jsx(Col, { span: 24, children: _jsx(Card, { size: "small", className: "paces-card", style: { background: '#fafafa' }, children: _jsxs(Text, { type: "secondary", children: ["\u00DAltimo cierre: ", _jsx(Text, { strong: true, children: balance.fechaUltimoCierre?.split('-').reverse().join('/') }), balance.balanceBase != null && (_jsxs(_Fragment, { children: [" \u2014 Balance al cierre: ", _jsx(Text, { strong: true, children: balance.balanceBase.toLocaleString('es-DO', { minimumFractionDigits: 2 }) })] }))] }) }) }) }))] })) }), _jsx(Card, { className: "paces-card", title: `Movimientos (${totalMovimientos})`, children: totalMovimientos === 0 && loadingMovimientos ? (_jsx("div", { style: { textAlign: 'center', padding: '60px 0' }, children: _jsx(Spin, { size: "large", tip: "Cargando movimientos..." }) })) : (_jsx(Table, { columns: columnsMovimientos, dataSource: movimientos, rowKey: "id", size: "middle", className: "paces-list-table", locale: {
                                    emptyText: loadingMovimientos
                                        ? _jsx(Skeleton, { active: true, paragraph: { rows: 5 } })
                                        : _jsx(Empty, { description: "No hay movimientos registrados" }),
                                }, pagination: {
                                    current: pagina,
                                    pageSize: pageSize,
                                    total: totalMovimientos,
                                    showSizeChanger: true,
                                    pageSizeOptions: ['10', '25', '50', '100'],
                                    showTotal: (t) => `${t} registros`,
                                    onChange: (pag, size) => {
                                        setPagina(pag);
                                        setPageSize(size);
                                    },
                                }, scroll: { x: 550 } })) })] })] }) }));
};
export default CuentaContableDetalle;
