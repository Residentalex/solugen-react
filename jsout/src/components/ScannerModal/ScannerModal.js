import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Modal, Input, Card, Button, InputNumber, Divider, Spin, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { productoApi } from '../../api/productoApi';
import { useAuthStore } from '../../stores/authStore';
// ===== Helpers locales =====
function formatNumber(n) {
    return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function toTitleCase(str) {
    if (!str)
        return str;
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
const ScannerModal = ({ open, onClose, onSelect }) => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [codigo, setCodigo] = useState('');
    const [loading, setLoading] = useState(false);
    const [productoEncontrado, setProductoEncontrado] = useState(null);
    const [cantidad, setCantidad] = useState(1);
    useEffect(() => {
        if (open) {
            setCodigo('');
            setProductoEncontrado(null);
            setCantidad(1);
        }
    }, [open]);
    const handleBuscar = async () => {
        if (!codigo.trim())
            return;
        setLoading(true);
        try {
            const res = await productoApi.obtenerDetalle(sucursalActiva, codigo.trim());
            setProductoEncontrado({
                codigo: res.idExterno || codigo,
                articulo: res.nombre,
                referencia: res.referenciaInterna || '',
                costo: res.ultimoCosto || 0,
                familia: res.familia,
                medida: res.unidadMedida
                    ? { nombre: res.unidadMedida.nombre || '', codigo: '', factor: 1, idExterno: res.unidadMedida.idExterno || 0 }
                    : undefined,
            });
        }
        catch {
            message.error('Producto no encontrado');
            setProductoEncontrado(null);
        }
        finally {
            setLoading(false);
        }
    };
    const handleAgregar = () => {
        if (!productoEncontrado)
            return;
        onSelect({ ...productoEncontrado, cantidad: cantidad || 1 });
        onClose();
    };
    return (_jsx(Modal, { title: "Scanner - C\u00F3digo de Barras", open: open, onCancel: onClose, footer: null, width: 450, destroyOnHidden: true, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsx(Input, { size: "large", placeholder: "Escanea o digita el c\u00F3digo...", value: codigo, onChange: (e) => setCodigo(e.target.value), onPressEnter: handleBuscar, suffix: loading ? _jsx(Spin, { size: "small" }) : _jsx(SearchOutlined, {}), autoFocus: true, style: { fontFamily: 'monospace', fontSize: 16 } }), productoEncontrado && (_jsx(Card, { className: "paces-card", size: "small", children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsxs("div", { children: [_jsx("strong", { children: "C\u00F3digo:" }), " ", productoEncontrado.codigo] }), _jsxs("div", { children: [_jsx("strong", { children: "Art\u00EDculo:" }), " ", toTitleCase(productoEncontrado.articulo)] }), productoEncontrado.referencia && (_jsxs("div", { children: [_jsx("strong", { children: "Ref:" }), " ", productoEncontrado.referencia] })), _jsxs("div", { children: [_jsx("strong", { children: "Costo:" }), " ", formatNumber(productoEncontrado.costo)] }), productoEncontrado.familia && (_jsxs("div", { children: [_jsx("strong", { children: "Familia:" }), " ", productoEncontrado.familia.nombre || productoEncontrado.familia] })), _jsx(Divider, { style: { margin: '4px 0' } }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontWeight: 600 }, children: "Cantidad:" }), _jsx(InputNumber, { size: "small", style: { width: 120 }, styles: { input: { textAlign: 'right' } }, min: 0.01, step: 0.01, precision: 2, controls: false, value: cantidad, onChange: (val) => setCantidad(val || 1), onPressEnter: handleAgregar }), _jsx(Button, { type: "primary", onClick: handleAgregar, children: "Agregar" })] })] }) }))] }) }));
};
export default ScannerModal;
