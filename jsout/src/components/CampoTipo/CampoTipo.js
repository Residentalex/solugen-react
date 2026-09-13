import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Select, Input, Button, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { tipoApi } from '../../api/tipoApi';
import FloatingField from '../FloatingLabel/FloatingField';
import BuscarTipoModal from '../BuscarTipoModal/BuscarTipoModal';
import { toTitleCase } from '../../utils/formats';
/**
 * Componente compartido para selección de Tipo de Documento.
 *
 * Modo 'select' (default):
 *  - Carga tipos desde tipoApi.obtenerPorDocumento() al montarse.
 *  - Renderiza un <Select> dentro de FloatingField.
 *  - Si disabled=true, muestra <Input disabled> informativo.
 *
 * Modo 'modal':
 *  - Renderiza un <Input readOnly> + botón de búsqueda.
 *  - Al hacer clic abre BuscarTipoModal con los filtros.
 *
 * Integración con Form.Item de Ant Design:
 *  - El componente recibe value/onChange automáticamente desde Form.Item.
 *  - Se coloca como hijo directo de <Form.Item name="tipo">.
 */
const CampoTipo = ({ tipoDocumento, sucursal, tipoEntidad, value, onChange, modo = 'select', disabled = false, label = 'Tipo', required = false, }) => {
    const [tipos, setTipos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const tiposCacheRef = useRef([]);
    const cargarTipos = useCallback(async () => {
        setLoading(true);
        try {
            const data = await tipoApi.obtenerPorDocumento(sucursal, tipoDocumento);
            setTipos(data);
            tiposCacheRef.current = data;
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar tipos');
        }
        finally {
            setLoading(false);
        }
    }, [sucursal, tipoDocumento]);
    // Handler que adapta la firma de FloatingField a CampoTipoProps
    const handleChange = useCallback((...args) => {
        const val = args[0];
        onChange?.(val ?? null);
    }, [onChange]);
    // Cargar tipos al montar en modo 'select'
    useEffect(() => {
        if (modo === 'select') {
            cargarTipos();
        }
    }, [cargarTipos, modo]);
    // Recargar si cambia tipoEntidad (cuando la API lo soporte)
    useEffect(() => {
        if (modo === 'select' && tipoEntidad) {
            cargarTipos();
        }
    }, [tipoEntidad, cargarTipos, modo]);
    // ===== Modo 'select' =====
    if (modo === 'select') {
        if (disabled) {
            const t = tipos.find(t2 => t2.codigo === value);
            return (_jsx(FloatingField, { label: label, required: required, value: value, onChange: handleChange, children: _jsx(Input, { disabled: true, value: t ? `${t.codigo} - ${toTitleCase(t.nombre)}` : (value || '—') }) }));
        }
        return (_jsx(FloatingField, { label: label, required: required, value: value, onChange: handleChange, children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", placeholder: " ", loading: loading, value: value, onChange: handleChange, labelRender: (labelProps) => {
                    const t = tipos.find(t2 => t2.codigo === labelProps.value);
                    return t ? `${t.codigo} - ${toTitleCase(t.nombre)}` : labelProps.label;
                }, children: tipos.map((t) => (_jsxs(Select.Option, { value: t.codigo, children: [t.codigo, " - ", toTitleCase(t.nombre)] }, t.codigo))) }) }));
    }
    // ===== Modo 'modal' =====
    const selectedObj = tiposCacheRef.current.find((t) => t.codigo === value);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 4 }, children: [_jsx("div", { style: { flex: 1 }, children: _jsx(FloatingField, { label: label, required: required, value: value, onChange: handleChange, children: _jsx(Input, { readOnly: true, value: value ? `${selectedObj?.codigo || value} - ${toTitleCase(selectedObj?.nombre || '')}` : '', placeholder: " " }) }) }), _jsx(Button, { icon: _jsx(SearchOutlined, {}), onClick: () => setModalOpen(true), disabled: disabled })] }), _jsx(BuscarTipoModal, { open: modalOpen, onClose: () => setModalOpen(false), onSelect: (tipo) => {
                    onChange?.(tipo.codigo);
                    setModalOpen(false);
                }, tipoDocumento: tipoDocumento, tipoEntidad: tipoEntidad })] }));
};
export default CampoTipo;
