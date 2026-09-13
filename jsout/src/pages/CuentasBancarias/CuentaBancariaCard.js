import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { Card, Tag, Typography, Button, Tooltip, Space, App } from 'antd';
import { CopyOutlined, FileTextOutlined } from '@ant-design/icons';
import { getMonedaSucursalActiva } from '../../utils/moneda';
const { Text } = Typography;
/* ===== Bank Color Palette (deterministic by hash) ===== */
const BANK_COLORS = [
    { bg: 'linear-gradient(135deg, #556ee6 0%, #6c7ff0 100%)' },
    { bg: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)' },
    { bg: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' },
    { bg: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' },
    { bg: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)' },
    { bg: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)' },
    { bg: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)' },
    { bg: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)' },
];
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return hash;
}
function getBankColor(banco) {
    const index = Math.abs(hashCode(banco || '')) % BANK_COLORS.length;
    return BANK_COLORS[index].bg;
}
function maskAccountNumber(noCuenta) {
    if (!noCuenta)
        return '';
    const clean = noCuenta.replace(/\s+/g, '');
    if (clean.length <= 4)
        return clean;
    const last4 = clean.slice(-4);
    return `•••• •••• •••• ${last4}`;
}
function toTitleCase(str) {
    if (!str)
        return str;
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
function formatBalance(value, moneda) {
    if (value === undefined || value === null)
        return '';
    const monedaDefault = getMonedaSucursalActiva();
    const symbol = moneda?.toUpperCase() === 'DOLAR' ? 'US$' : (monedaDefault.simbolo || 'RD$');
    return `${symbol} ${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function getMonedaInfo(moneda) {
    if (moneda?.toUpperCase() === 'DOLAR')
        return { label: 'USD', color: '#10b981' };
    const monedaDefault = getMonedaSucursalActiva();
    return { label: monedaDefault.codigo || 'DOP', color: '#556ee6' };
}
const CuentaBancariaCard = ({ cuenta, onClick, index = 0 }) => {
    const { message } = App.useApp();
    const isActive = cuenta.activo;
    const esUSD = cuenta.moneda?.toUpperCase() === 'DOLAR' || cuenta.moneda?.toUpperCase() === 'USD';
    const monedaInfo = getMonedaInfo(cuenta.moneda);
    const cardClassName = `cuenta-bancaria-card${!isActive ? ' cuenta-inactiva' : ''}${esUSD ? ' cuenta-usd' : ''}`;
    const balanceDisplay = formatBalance(cuenta.balance, cuenta.moneda);
    const hasBalance = cuenta.balance !== undefined && cuenta.balance !== null;
    const staggerDelay = `${index * 0.05}s`;
    const handleCopyNumber = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(cuenta.noCuenta || '').then(() => {
            message.success('Número de cuenta copiado');
        });
    };
    const handleViewTransactions = (e) => {
        e.stopPropagation();
        onClick?.();
    };
    return (_jsx("div", { className: "cuenta-card-wrapper", style: { animationDelay: staggerDelay }, children: _jsxs(Card, { className: cardClassName, hoverable: true, onClick: onClick, styles: { body: { padding: 0 } }, children: [_jsxs("div", { className: "cuenta-card-header", style: { background: getBankColor(cuenta.banco) }, children: [_jsx("div", { className: "cuenta-card-chip" }), _jsxs("div", { className: "cuenta-card-header-top", children: [_jsx(Text, { className: "cuenta-card-banco", ellipsis: { tooltip: cuenta.banco }, children: toTitleCase(cuenta.banco ?? '') }), _jsxs(Space, { size: 4, children: [_jsx("span", { className: "cuenta-card-moneda-badge", style: { background: monedaInfo.color }, children: monedaInfo.label }), _jsx(Tag, { color: isActive ? 'success' : 'error', className: "cuenta-card-status-tag", children: isActive ? 'Activo' : 'Inactivo' })] })] }), _jsx("div", { className: "cuenta-card-number", children: maskAccountNumber(cuenta.noCuenta) })] }), _jsxs("div", { className: "cuenta-card-body", children: [_jsx("div", { className: "cuenta-card-balance-section", children: hasBalance ? (_jsxs(_Fragment, { children: [_jsx("div", { className: `cuenta-balance-hero${esUSD ? ' balance-usd' : ''}`, children: balanceDisplay }), _jsx(Text, { type: "secondary", className: "cuenta-balance-label", children: "Saldo disponible" })] })) : (_jsxs("div", { className: "cuenta-balance-hero no-disponible", children: ["\u2014 ", _jsx(Text, { type: "secondary", style: { fontSize: 12, fontWeight: 400 }, children: "Saldo no disponible" })] })) }), _jsx("div", { className: "cuenta-card-divider" }), _jsx(Text, { strong: true, className: "cuenta-card-nombre", ellipsis: { tooltip: cuenta.nombre }, children: toTitleCase(cuenta.nombre ?? '') }), _jsxs("div", { className: "cuenta-card-datos", children: [_jsxs("div", { children: [_jsx("span", { className: "cuenta-card-dato-label", children: "Cta. Contable" }), _jsx("span", { className: "cuenta-card-dato-valor", children: cuenta.cuentaContable || '—' })] }), _jsxs("div", { children: [_jsx("span", { className: "cuenta-card-dato-label", children: "Agente" }), _jsx("span", { className: "cuenta-card-dato-valor", children: toTitleCase(cuenta.agente ?? '') || '—' })] })] })] }), _jsx("div", { className: "cuenta-card-footer", children: _jsxs(Space, { size: 2, children: [_jsx(Tooltip, { title: "Copiar n\u00FAmero de cuenta", children: _jsx(Button, { type: "text", size: "small", icon: _jsx(CopyOutlined, {}), onClick: handleCopyNumber, className: "cuenta-footer-btn" }) }), _jsx(Tooltip, { title: "Ver movimientos", children: _jsx(Button, { type: "text", size: "small", icon: _jsx(FileTextOutlined, {}), onClick: handleViewTransactions, className: "cuenta-footer-btn" }) })] }) })] }) }));
};
export default CuentaBancariaCard;
