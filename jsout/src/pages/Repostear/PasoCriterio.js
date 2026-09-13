import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback } from 'react';
import { DatePicker, Select, Input, Row, Col, Typography, Space, message } from 'antd';
import { UserOutlined, BookOutlined, BankOutlined, CalendarOutlined, CheckCircleFilled, } from '@ant-design/icons';
import { conceptosApi } from '../../api/conceptosApi';
import { useUIStore } from '../../stores/uiStore';
import { hexToRgba } from '../../utils/themeUtils';
const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Search } = Input;
const TIPOS_DOCUMENTO = [
    { value: 'ENP', label: 'ENP - Entrada de Almacén' },
    { value: 'SAP', label: 'SAP - Salida de Almacén' },
    { value: 'FAC', label: 'FAC - Factura a Cliente' },
    { value: 'DEV', label: 'DEV - Devolución de Venta' },
    { value: 'DVC', label: 'DVC - Devolución de Compra' },
    { value: 'RDE', label: 'RDE - Factura de Suplidor' },
    { value: 'TRA', label: 'TRA - Transferencia' },
    { value: 'DEP', label: 'DEP - Documento Bancario' },
    { value: 'EDI', label: 'EDI - Entrada de Diario' },
];
const SUB_CRITERIOS = [
    {
        value: 'entidad',
        label: 'Entidad',
        icon: _jsx(UserOutlined, {}),
        description: 'Filtrar por entidad (cliente, suplidor)',
        color: '#556ee6',
    },
    {
        value: 'concepto',
        label: 'Concepto',
        icon: _jsx(BookOutlined, {}),
        description: 'Filtrar por concepto contable',
        color: '#faad14',
    },
    {
        value: 'cuentaBancaria',
        label: 'Cta. Bancaria',
        icon: _jsx(BankOutlined, {}),
        description: 'Filtrar por cuenta bancaria',
        color: '#13c2c2',
    },
    {
        value: 'soloFecha',
        label: 'Solo Fecha',
        icon: _jsx(CalendarOutlined, {}),
        description: 'Sin filtro adicional, solo rango de fechas',
        color: '#52c41a',
    },
];
function formatDateParamLocal(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${y}${m}${day}${hh}${mm}${ss}`;
}
const PasoCriterio = ({ sucursal, tipoDoc, subCriterio, entidadCodigo, conceptoCodigo, cuentaBancaria, onTipoDocChange, onFechasChange, onSubCriterioChange, onEntidadChange, onConceptoChange, onCuentaBancariaChange, tiposPermitidos, }) => {
    const [conceptos, setConceptos] = useState([]);
    const [loadingConceptos, setLoadingConceptos] = useState(false);
    const isDarkMode = useUIStore((s) => s.isDarkMode);
    const primaryColor = useUIStore((s) => s.primaryColor);
    const tiposMostrar = tiposPermitidos
        ? TIPOS_DOCUMENTO.filter((t) => tiposPermitidos.includes(t.value))
        : TIPOS_DOCUMENTO;
    const cargarConceptos = useCallback(async () => {
        if (!tipoDoc)
            return;
        setLoadingConceptos(true);
        try {
            const result = await conceptosApi.obtenerConceptos(sucursal);
            setConceptos(result.map((c) => ({ codigo: c.codigo, nombre: c.nombre })));
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar conceptos');
        }
        finally {
            setLoadingConceptos(false);
        }
    }, [sucursal, tipoDoc]);
    useEffect(() => {
        if (tipoDoc && subCriterio === 'concepto') {
            cargarConceptos();
        }
    }, [tipoDoc, subCriterio, cargarConceptos]);
    return (_jsxs("div", { children: [_jsx(Text, { style: {
                    display: 'block',
                    marginBottom: 24,
                    fontSize: 16,
                    color: primaryColor,
                    fontWeight: 500,
                }, children: "Configure los criterios de b\u00FAsqueda para repostear" }), _jsx("div", { className: "repostear-filters-panel", children: _jsxs(Space, { wrap: true, size: 12, children: [_jsx(Select, { placeholder: "Tipo de documento", value: tipoDoc || undefined, onChange: onTipoDocChange, style: { width: 280 }, options: tiposMostrar }), _jsx(RangePicker, { onChange: (dates) => {
                                if (dates && dates[0] && dates[1]) {
                                    onFechasChange(formatDateParamLocal(dates[0].toDate()), formatDateParamLocal(dates[1].toDate()));
                                }
                            } })] }) }), _jsx(Text, { style: {
                    display: 'block',
                    marginBottom: 12,
                    marginTop: 20,
                    fontSize: 14,
                    fontWeight: 500,
                }, children: "Sub-criterio de b\u00FAsqueda" }), _jsx(Row, { gutter: [16, 16], style: { marginBottom: 24 }, children: SUB_CRITERIOS.map((sc) => {
                    const isSelected = subCriterio === sc.value;
                    return (_jsx(Col, { xs: 12, sm: 6, children: _jsxs("div", { className: `repostear-tile ${isSelected ? 'repostear-tile--selected' : ''}`, onClick: () => onSubCriterioChange(sc.value), style: { padding: '16px 12px', textAlign: 'center' }, children: [_jsx(CheckCircleFilled, { className: "repostear-tile__check" }), _jsx("div", { className: "repostear-tile__icon-circle", style: {
                                        width: 44,
                                        height: 44,
                                        background: isSelected ? undefined : isDarkMode ? hexToRgba(primaryColor, 0.2) : sc.color + '18',
                                    }, children: React.isValidElement(sc.icon) && React.cloneElement(sc.icon, {
                                        style: { fontSize: 20, color: isSelected ? '#fff' : (sc.value === 'entidad' ? primaryColor : sc.color) },
                                    }) }), _jsx(Text, { strong: true, style: {
                                        fontSize: 12,
                                        color: isSelected ? primaryColor : isDarkMode ? '#e0e0e0' : '#333',
                                        display: 'block',
                                        marginTop: 8,
                                    }, children: sc.label }), _jsx(Text, { type: "secondary", style: { fontSize: 10 }, children: sc.description })] }) }, sc.value));
                }) }), subCriterio === 'entidad' && (_jsxs("div", { className: "repostear-expand-enter", style: { maxWidth: 400 }, children: [_jsx(Text, { style: { display: 'block', marginBottom: 8 }, children: "C\u00F3digo de Entidad" }), _jsx(Search, { placeholder: "Ingrese el c\u00F3digo de la entidad", value: entidadCodigo, onChange: (e) => onEntidadChange(e.target.value), enterButton: "Buscar" })] })), subCriterio === 'concepto' && (_jsxs("div", { className: "repostear-expand-enter", style: { maxWidth: 400 }, children: [_jsx(Text, { style: { display: 'block', marginBottom: 8 }, children: "Concepto" }), _jsx(Select, { showSearch: true, placeholder: "Seleccione un concepto", value: conceptoCodigo || undefined, onChange: onConceptoChange, loading: loadingConceptos, style: { width: '100%' }, options: conceptos.map((c) => ({
                            value: c.codigo,
                            label: `${c.codigo} - ${c.nombre}`,
                        })), filterOption: (input, option) => option?.label?.toLowerCase().includes(input.toLowerCase()) ?? false })] })), subCriterio === 'cuentaBancaria' && (_jsxs("div", { className: "repostear-expand-enter", style: { maxWidth: 400 }, children: [_jsx(Text, { style: { display: 'block', marginBottom: 8 }, children: "Cuenta Bancaria" }), _jsx(Search, { placeholder: "Ingrese el n\u00FAmero de cuenta bancaria", value: cuentaBancaria, onChange: (e) => onCuentaBancariaChange(e.target.value), enterButton: "Buscar" })] })), subCriterio === 'soloFecha' && (_jsx("div", { className: "repostear-expand-enter", children: _jsx(Text, { type: "secondary", children: "Se repostear\u00E1n todos los documentos del tipo seleccionado en el rango de fechas indicado." }) }))] }));
};
export default PasoCriterio;
