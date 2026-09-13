import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { Card, Skeleton, Empty, Divider } from 'antd';
import { FileTextOutlined, SwapOutlined, CreditCardOutlined, GiftOutlined, TagOutlined, RollbackOutlined, CreditCardFilled, DollarCircleOutlined, } from '@ant-design/icons';
import { formatCurrency, formatDate, toTitleCase } from '../../utils/formats';
const MEDIOS_POS = [
    { key: 'efectivo', label: 'Efectivo', icon: _jsx(DollarCircleOutlined, {}) },
    { key: 'cheque', label: 'Cheque', icon: _jsx(FileTextOutlined, {}) },
    { key: 'transferencia', label: 'Transferencia', icon: _jsx(SwapOutlined, {}) },
    { key: 'tarjetaCredito', label: 'Tarjeta Crédito', icon: _jsx(CreditCardOutlined, {}) },
    { key: 'tarjetaDebito', label: 'Tarjeta Débito', icon: _jsx(CreditCardFilled, {}) },
    { key: 'bono', label: 'Bono', icon: _jsx(GiftOutlined, {}) },
    { key: 'tarjetaRegalo', label: 'Tarjeta Regalo', icon: _jsx(TagOutlined, {}) },
    { key: 'notaCredito', label: 'Nota Crédito', icon: _jsx(RollbackOutlined, {}) },
];
function EstadoBadge({ estado }) {
    if (estado === undefined)
        return null;
    const color = estado === 1 ? '#52c41a' : estado === 0 ? '#faad14' : '#ff4d4f';
    const label = estado === 1 ? 'Pagado' : estado === 0 ? 'Pendiente' : 'Anulado';
    return (_jsxs("span", { style: { fontSize: 11, color }, children: [_jsx("span", { style: {
                    display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                    background: color, marginRight: 4, verticalAlign: 'middle',
                } }), label] }));
}
const CobrosMinimal = ({ cobrosPOS, cobrosArray, loading }) => {
    const renderContent = () => {
        if (loading) {
            return (_jsx(Skeleton, { active: true, title: false, paragraph: { rows: 3, width: ['90%', '90%', '60%'] } }));
        }
        if (cobrosPOS) {
            const medios = MEDIOS_POS.filter((m) => (cobrosPOS[m.key] || 0) > 0);
            if (medios.length === 0) {
                return (_jsx(Empty, { image: _jsx(CreditCardOutlined, { style: { fontSize: 28, color: '#bfbfbf' } }), imageStyle: { height: 36 }, description: _jsx("span", { style: { fontSize: 12, color: 'var(--paces-text-secondary)' }, children: "Sin cobros registrados" }) }));
            }
            const totalCobrado = medios.reduce((sum, m) => sum + (cobrosPOS[m.key] || 0), 0);
            return (_jsxs(_Fragment, { children: [_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: medios.map((m) => (_jsxs("div", { style: {
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '6px 10px', borderRadius: 6,
                                background: 'var(--paces-bg-secondary)',
                            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontSize: 14, color: 'var(--paces-text-secondary)' }, children: m.icon }), _jsx("span", { style: { fontSize: 13, color: 'var(--paces-text-secondary)' }, children: m.label })] }), _jsx("span", { style: { fontSize: 13, fontWeight: 500 }, children: formatCurrency(cobrosPOS[m.key] || 0) })] }, m.key))) }), _jsx(Divider, { style: { margin: '10px 0' } }), _jsxs("div", { style: {
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 0',
                        }, children: [_jsx("span", { style: { fontSize: 12, color: 'var(--paces-text-secondary)' }, children: "Total cobrado" }), _jsx("span", { style: { fontSize: 14, fontWeight: 600 }, children: formatCurrency(totalCobrado) })] })] }));
        }
        if (cobrosArray !== undefined) {
            if (cobrosArray.length === 0) {
                return (_jsx(Empty, { image: _jsx(CreditCardOutlined, { style: { fontSize: 28, color: '#bfbfbf' } }), imageStyle: { height: 36 }, description: _jsx("span", { style: { fontSize: 12, color: 'var(--paces-text-secondary)' }, children: "Sin cobros registrados" }) }));
            }
            const totalCobrado = cobrosArray.reduce((sum, c) => sum + (c.monto || 0), 0);
            return (_jsxs(_Fragment, { children: [_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: cobrosArray.map((c, i) => (_jsxs("div", { style: {
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '6px 10px', borderRadius: 6,
                                background: 'var(--paces-bg-secondary)',
                            }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 2 }, children: [_jsx("div", { style: { fontSize: 12, color: 'var(--paces-text-secondary)' }, children: c.fecha ? formatDate(c.fecha) : '—' }), _jsx("div", { style: { fontSize: 13, color: 'var(--paces-text-secondary)' }, children: toTitleCase(c.medioCobro || '') })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }, children: [_jsx("span", { style: { fontSize: 13, fontWeight: 500 }, children: formatCurrency(c.monto || 0) }), c.estado !== undefined && _jsx(EstadoBadge, { estado: c.estado })] })] }, c.id || i))) }), _jsx(Divider, { style: { margin: '10px 0' } }), _jsxs("div", { style: {
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 0',
                        }, children: [_jsx("span", { style: { fontSize: 12, color: 'var(--paces-text-secondary)' }, children: "Total cobrado" }), _jsx("span", { style: { fontSize: 14, fontWeight: 600 }, children: formatCurrency(totalCobrado) })] })] }));
        }
        return null;
    };
    return (_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs("span", { children: [_jsx(CreditCardOutlined, { style: { color: '#556ee6', marginRight: 8 } }), "Cobros"] }), cobrosPOS && (_jsx(EstadoBadge, { estado: cobrosPOS.estado ?? (cobrosPOS.pago != null && cobrosPOS.pago > 0 ? 1 : undefined) }))] }), style: { marginBottom: 16 }, children: renderContent() }));
};
export default CobrosMinimal;
