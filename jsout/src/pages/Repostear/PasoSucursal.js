import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Row, Col, Typography } from 'antd';
import { BankOutlined, CheckCircleFilled, ShopOutlined, HomeOutlined, PieChartOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { Sucursal } from '../../types/auth';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useCompanyStore } from '../../stores/companyStore';
const { Text } = Typography;
const ICONOS_SUCURSAL = {
    OrensePlaza: _jsx(ShopOutlined, {}),
    HiperRomana: _jsx(BankOutlined, {}),
    OrenseVillaHermosa: _jsx(HomeOutlined, {}),
    ElOfertazo: _jsx(ShoppingCartOutlined, {}),
    Consolidado: _jsx(PieChartOutlined, {}),
    Compra: _jsx(PieChartOutlined, {}),
};
/** Convierte el valor numérico Sucursal a su clave string (ej: 0 → "OrensePlaza") */
function sucursalKey(valor) {
    return Object.keys(Sucursal).find((k) => Sucursal[k] === valor);
}
/** Obtiene la lista de sucursales incluyendo siempre la Consolidado al inicio */
function obtenerSucursalesConConsolidado(sucursalesData) {
    // 1. Obtener sucursales de la empresa como de costumbre
    const baseSucursales = (sucursalesData || [])
        .filter((s) => s.sucursal !== undefined && s.sucursal !== null)
        .map((s) => ({
        value: s.sucursal,
        label: s.nombre,
        icon: ICONOS_SUCURSAL[sucursalKey(s.sucursal) || ''] || _jsx(BankOutlined, {}),
    }));
    // 2. Verificar si ya viene Consolidado de la empresa
    const yaTieneConsolidado = baseSucursales.some((s) => s.value === Sucursal.Consolidado);
    // 3. Si no, agregarlo al inicio con su etiqueta y ícono
    if (!yaTieneConsolidado) {
        return [
            {
                value: Sucursal.Consolidado,
                label: 'Consolidado',
                icon: ICONOS_SUCURSAL.Consolidado || _jsx(PieChartOutlined, {}),
            },
            ...baseSucursales,
        ];
    }
    // 4. Si ya venía, devolver tal como está
    return baseSucursales;
}
const PasoSucursal = ({ value, onChange }) => {
    const sucursalesPermitidas = useAuthStore((s) => s.sucursalesPermitidas);
    const isDarkMode = useUIStore((s) => s.isDarkMode);
    const primaryColor = useUIStore((s) => s.primaryColor);
    const sucursalesData = useCompanyStore((s) => s.data.sucursales);
    const SUCURSALES = obtenerSucursalesConConsolidado(sucursalesData);
    const sucursalesMostrar = SUCURSALES.filter((s) => sucursalesPermitidas.some((sp) => typeof sp.sucursal === 'string'
        ? sucursalId(sp.sucursal) === s.value
        : sp.sucursal === s.value));
    return (_jsxs("div", { children: [_jsx(Text, { style: {
                    display: 'block',
                    marginBottom: 24,
                    fontSize: 16,
                    color: primaryColor,
                    fontWeight: 500,
                }, children: "Seleccione la sucursal sobre la cual desea repostear documentos" }), _jsx(Row, { gutter: [16, 16], children: sucursalesMostrar.map((s) => {
                    const isSelected = value === s.value;
                    return (_jsx(Col, { xs: 24, sm: 12, md: 6, children: _jsxs("div", { className: `repostear-tile ${isSelected ? 'repostear-tile--selected' : ''}`, onClick: () => onChange(s.value), style: { padding: '24px 16px', textAlign: 'center', minHeight: 160 }, children: [_jsx(CheckCircleFilled, { className: "repostear-tile__check" }), _jsx("div", { className: "repostear-tile__icon-circle", children: React.isValidElement(s.icon) && React.cloneElement(s.icon, {
                                        style: { fontSize: 24, color: primaryColor },
                                    }) }), _jsx(Text, { strong: true, className: "repostear-tile__label", style: {
                                        fontSize: 14,
                                        color: isSelected ? primaryColor : isDarkMode ? '#e0e0e0' : '#333',
                                        display: 'block',
                                        marginBottom: 6,
                                    }, children: s.label })] }) }, s.value));
                }) })] }));
};
export default PasoSucursal;
