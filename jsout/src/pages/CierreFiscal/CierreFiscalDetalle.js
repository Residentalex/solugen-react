import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Table, Typography, Button, Spin, Descriptions, Empty, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { cierreFiscalApi } from '../../api/cierreFiscalApi';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { formatCurrency, formatDateRaw, formatDate } from '../../utils/formats';
const { Text } = Typography;
const CierreFiscalDetalle = () => {
    const { transacId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    // Obtener info del cierre desde el estado de navegación (pasado desde el listado)
    const cierreState = location.state?.cierre;
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [resultados, setResultados] = useState([]);
    useEffect(() => {
        setActiveModule('RCIERREFISCAL');
    }, [setActiveModule]);
    useEffect(() => {
        if (!transacId || sucursalActiva === undefined)
            return;
        const transacIdNum = parseInt(transacId, 10);
        if (isNaN(transacIdNum))
            return;
        setLoading(true);
        setLoadingError(false);
        cierreFiscalApi.obtenerResultadosPorCierre(sucursalActiva, transacIdNum)
            .then((results) => {
            setResultados(results);
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar resultados del cierre';
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [transacId, sucursalActiva]);
    const columnas = [
        {
            title: 'Cuenta',
            dataIndex: 'numeroCuenta',
            key: 'numeroCuenta',
            width: 120,
            fixed: 'left',
            render: (val) => _jsx(Text, { strong: true, children: val }),
        },
        { title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true },
        {
            title: 'Balance Anterior',
            dataIndex: 'balanceAnterior',
            key: 'balanceAnterior',
            width: 140,
            align: 'right',
            render: (val) => formatCurrency(val),
        },
        {
            title: 'Débitos',
            dataIndex: 'debitosAcum',
            key: 'debitosAcum',
            width: 140,
            align: 'right',
            render: (val) => formatCurrency(val),
        },
        {
            title: 'Créditos',
            dataIndex: 'creditosAcum',
            key: 'creditosAcum',
            width: 140,
            align: 'right',
            render: (val) => formatCurrency(val),
        },
        {
            title: 'Balance Cierre',
            dataIndex: 'balanceCierre',
            key: 'balanceCierre',
            width: 140,
            align: 'right',
            render: (val) => _jsx(Text, { strong: true, children: formatCurrency(val) }),
        },
    ];
    return (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate('/RCIERREFISCAL'), children: "Volver" }), _jsx("div", { style: { flex: 1 } }), cierreState && (_jsxs(Text, { type: "secondary", style: { fontSize: 13 }, children: ["Cierre: ", cierreState.numeroDocumento] }))] }), _jsxs(Spin, { spinning: loading, children: [_jsx(Card, { className: "paces-card-erp", style: { borderRadius: 8, marginBottom: 24 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: { xs: 1, md: 2, lg: 4 }, children: [_jsx(Descriptions.Item, { label: "No. Documento", span: 1, children: _jsx(Text, { strong: true, children: cierreState?.numeroDocumento || `#${transacId}` }) }), _jsx(Descriptions.Item, { label: "Fecha", span: 1, children: _jsx(Text, { children: cierreState?.fecha ? formatDate(cierreState.fecha) : '---' }) }), _jsx(Descriptions.Item, { label: "D\u00E9bitos", span: 1, children: _jsx(Text, { children: cierreState?.totalDebitos !== undefined ? formatCurrency(cierreState.totalDebitos) : '---' }) }), _jsx(Descriptions.Item, { label: "Cr\u00E9ditos", span: 1, children: _jsx(Text, { children: cierreState?.totalCreditos !== undefined ? formatCurrency(cierreState.totalCreditos) : '---' }) })] }) }), _jsx(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, title: "Resultados del Cierre", children: _jsx(Table, { columns: columnas, dataSource: resultados, rowKey: "numeroCuenta", pagination: { showTotal: (t) => `${t} registros`, pageSize: 50 }, size: "middle", className: "paces-border-top paces-list-table", rowClassName: "paces-row-hover", scroll: { x: 1000 }, locale: {
                                emptyText: (_jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: loading ? 'Cargando...' : 'No hay resultados disponibles' }) })),
                            } }) })] })] }));
};
export default CierreFiscalDetalle;
