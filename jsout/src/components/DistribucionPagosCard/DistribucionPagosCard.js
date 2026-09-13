import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Card, Table, Tag, Typography, Empty, Divider, Space, Skeleton } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { formatCurrency, formatDate } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';
const { Text } = Typography;
const DistribucionPagosCard = ({ documentos = [], totalDocumento, monedaSimbolo, loading = false, onDocumentoClick, title = 'Distribuci\u00f3n de Pagos', }) => {
    const monedaSimboloFinal = monedaSimbolo || getMonedaSucursalActiva().simbolo;
    const distribuido = documentos.reduce((acc, doc) => {
        const monto = doc.monto ?? doc.montoTotal ?? 0;
        return acc + monto;
    }, 0);
    const pendiente = totalDocumento - distribuido;
    const estaPagado = pendiente <= 0;
    const hayExceso = pendiente < 0;
    const columns = [
        {
            title: 'Documento',
            key: 'documento',
            width: 130,
            render: (_, record) => {
                const label = record.documento || `${record.tipoDocumento || '?'}-${record.noDocumento || '?'}`;
                return _jsx("span", { className: "paces-doc-link", children: label });
            },
        },
        {
            title: 'Fecha',
            dataIndex: 'fechaDocumento',
            key: 'fecha',
            width: 100,
            render: (v) => formatDate(v),
        },
        {
            title: 'Monto',
            key: 'monto',
            width: 120,
            align: 'right',
            render: (_, record) => {
                const monto = record.monto ?? record.montoTotal ?? 0;
                return _jsx(Text, { strong: true, children: formatCurrency(monto) });
            },
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 100,
            align: 'center',
            render: (v) => {
                const info = ESTADO_DOCUMENTO_MAP[v] || { label: 'Desconocido', color: 'default' };
                return _jsx(Tag, { color: info.color, children: info.label });
            },
        },
    ];
    const renderContent = () => {
        if (loading) {
            return (_jsxs(_Fragment, { children: [_jsx(Skeleton, { active: true, paragraph: { rows: 3 } }), _jsx(Divider, { style: { margin: '12px 0' } }), _jsx(Skeleton.Input, { active: true, style: { width: '100%' } }), _jsx("div", { style: { marginTop: 4 }, children: _jsx(Skeleton.Input, { active: true, style: { width: '100%' } }) }), _jsx(Divider, { style: { margin: '8px 0' } }), _jsx(Skeleton.Input, { active: true, style: { width: '100%' } })] }));
        }
        if (!documentos.length) {
            return (_jsx("div", { style: { minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { image: _jsx(DollarOutlined, { style: { fontSize: 32, color: '#bfbfbf' } }), imageStyle: { height: 40 }, description: _jsxs("span", { children: [_jsx("div", { style: { fontSize: 13, color: '#8c8c8c' }, children: "Sin pagos asociados" }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "No hay pagos registrados" })] }) }) }));
        }
        return (_jsx(Table, { dataSource: documentos, rowKey: "id", size: "small", pagination: false, scroll: { x: 480 }, onRow: (record) => ({
                onClick: () => onDocumentoClick?.(record),
                style: { cursor: onDocumentoClick ? 'pointer' : 'default' },
                className: 'paces-row-hover',
            }), columns: columns }));
    };
    return (_jsxs(Card, { className: "paces-card", size: "small", style: { marginTop: 16 }, title: _jsxs(Space, { children: [_jsx(DollarOutlined, { style: { color: '#556ee6' } }), _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: title })] }), children: [renderContent(), _jsx(Divider, { style: { margin: '12px 0' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 }, children: [_jsx(Text, { className: "paces-text-secondary", style: { fontSize: 13 }, children: "Total documento:" }), _jsx(Text, { style: { fontSize: 13 }, children: formatCurrency(totalDocumento) })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 }, children: [_jsx(Text, { className: "paces-text-secondary", style: { fontSize: 13 }, children: "Distribuido:" }), _jsx(Text, { style: { fontSize: 13, color: '#34c38f' }, children: formatCurrency(distribuido) })] }), _jsx(Divider, { style: { margin: '8px 0' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Text, { className: "paces-text-secondary", style: { fontSize: 13 }, children: "Pendiente:" }), _jsxs(Space, { children: [_jsx(Tag, { color: hayExceso ? 'error' : (estaPagado ? 'success' : 'warning'), children: hayExceso ? 'Exceso' : (estaPagado ? 'Pagado' : 'Pendiente') }), _jsx(Text, { strong: true, style: { fontSize: 14, color: hayExceso ? '#ff4d4f' : (estaPagado ? '#34c38f' : '#faad14') }, children: formatCurrency(Math.max(pendiente, 0)) })] })] })] }));
};
export default DistribucionPagosCard;
