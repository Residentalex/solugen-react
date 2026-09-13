import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Table, Checkbox, Button, Spin, Empty, Tag } from 'antd';
import { impuestoApi } from '../../api/impuestoApi';
import { toTitleCase } from '../../utils/formats';
function mapTipoImpuesto(tipo) {
    const map = {
        I: 'Impuesto',
        R: 'Retencion',
        V: 'Informativo',
        L: 'Otro',
    };
    return map[tipo] || 'Otro';
}
const SeleccionarImpuestosModal = ({ open, onClose, onConfirm, tipoEntidad, sucursal, existentes = [], }) => {
    const [catalogo, setCatalogo] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedKeys, setSelectedKeys] = useState(new Set());
    useEffect(() => {
        if (!open)
            return;
        setLoading(true);
        setSelectedKeys(new Set(existentes.map((e) => e.codigo || e.idExterno)));
        const cargar = async () => {
            try {
                let lista = [];
                if (tipoEntidad === 'SUP') {
                    // Solo compras
                    lista = (await impuestoApi.obtenerParaCompras(sucursal)) || [];
                }
                else if (tipoEntidad === 'CLI') {
                    // Solo ventas
                    lista = (await impuestoApi.obtenerParaVentas(sucursal)) || [];
                }
                else {
                    // Ambos — llamar a las dos APIs independientemente y deduplicar
                    const [compras, ventas] = await Promise.all([
                        impuestoApi.obtenerParaCompras(sucursal).catch(() => []),
                        impuestoApi.obtenerParaVentas(sucursal).catch(() => []),
                    ]);
                    const mapa = new Map();
                    for (const imp of [...(compras || []), ...(ventas || [])]) {
                        const key = imp.codigo || imp.idExterno;
                        if (key && !mapa.has(key)) {
                            mapa.set(key, imp);
                        }
                    }
                    lista = Array.from(mapa.values());
                }
                setCatalogo(lista || []);
            }
            catch {
                setCatalogo([]);
            }
            finally {
                setLoading(false);
            }
        };
        cargar();
    }, [open, tipoEntidad, sucursal, existentes]);
    const handleConfirmar = useCallback(() => {
        const nuevos = catalogo
            .filter((imp) => selectedKeys.has(imp.codigo || imp.idExterno))
            .map((imp) => ({
            codigo: imp.codigo,
            idExterno: imp.idExterno,
            nombre: imp.nombre,
            porcentaje: imp.porcentaje,
            tipo: mapTipoImpuesto(imp.tipo),
            monto: 0,
            noCuenta: imp.noCuenta || '',
        }));
        // Mezclar con existentes: conservar montos previos
        const mapaExistentes = new Map(existentes.map((e) => [e.codigo || e.idExterno, e.monto]));
        for (const n of nuevos) {
            if (mapaExistentes.has(n.codigo || n.idExterno)) {
                n.monto = mapaExistentes.get(n.codigo || n.idExterno);
            }
        }
        onConfirm(nuevos);
        onClose();
    }, [catalogo, selectedKeys, existentes, onConfirm, onClose]);
    const toggleKey = (key, checked) => {
        setSelectedKeys((prev) => {
            const next = new Set(prev);
            if (checked)
                next.add(key);
            else
                next.delete(key);
            return next;
        });
    };
    return (_jsx(Modal, { title: "Seleccionar impuestos / retenciones", open: open, onCancel: onClose, width: 680, footer: [
            _jsx(Button, { onClick: onClose, children: "Cancelar" }, "cancel"),
            _jsxs(Button, { type: "primary", onClick: handleConfirmar, disabled: selectedKeys.size === 0, children: ["Agregar seleccionados (", selectedKeys.size, ")"] }, "ok"),
        ], children: loading ? (_jsx("div", { style: { textAlign: 'center', padding: 40 }, children: _jsx(Spin, {}) })) : catalogo.length === 0 ? (_jsx(Empty, { description: "No hay impuestos disponibles" })) : (_jsx(Table, { dataSource: catalogo, rowKey: (r) => r.codigo || r.idExterno, size: "small", pagination: false, scroll: { y: 400 }, columns: [
                {
                    title: '',
                    key: 'selection',
                    width: 50,
                    render: (_, record) => {
                        const key = record.codigo || record.idExterno;
                        return (_jsx(Checkbox, { checked: selectedKeys.has(key), onChange: (e) => toggleKey(key, e.target.checked) }));
                    },
                },
                {
                    title: 'Nombre',
                    dataIndex: 'nombre',
                    key: 'nombre',
                    ellipsis: true,
                    render: (v) => toTitleCase(v || ''),
                },
                {
                    title: 'Tipo',
                    key: 'tipo',
                    width: 120,
                    render: (_, record) => {
                        const labels = {
                            I: 'Impuesto', R: 'Retención', V: 'Informativo', L: 'Liquidación',
                        };
                        return _jsx(Tag, { children: labels[record.tipo] || record.tipo });
                    },
                },
                {
                    title: '%',
                    dataIndex: 'porcentaje',
                    key: 'porcentaje',
                    width: 80,
                    align: 'right',
                    render: (v) => (v ? `${v}%` : '-'),
                },
            ] })) }));
};
export default SeleccionarImpuestosModal;
