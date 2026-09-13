import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Card, Tag } from 'antd';
import { IdcardOutlined, PhoneOutlined, EnvironmentOutlined, UserOutlined } from '@ant-design/icons';
import { toTitleCase } from '../utils/formats';
const EntidadCard = ({ titulo, entidad, entidadSecundaria, fallbackTitulo }) => {
    const nombre = entidad?.nombre || entidadSecundaria?.nombre || fallbackTitulo || '';
    const identificacion = entidad?.identificacion || entidadSecundaria?.identificacion || '';
    const telefono = entidad?.telefono || entidadSecundaria?.telefono || '';
    const direccion = entidad?.direccion
        ? toTitleCase(entidad.direccion)
        : entidadSecundaria?.direccion
            ? toTitleCase(entidadSecundaria.direccion)
            : '-';
    const beneficiario = entidad?.beneficiario || entidadSecundaria?.beneficiario || '';
    return (_jsx(Card, { title: _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: nombre ? toTitleCase(nombre) : (titulo || fallbackTitulo || 'Entidad') }), className: "paces-card", style: { marginBottom: 16 }, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [titulo ? (_jsx(Tag, { color: "blue", style: { marginBottom: 4 }, children: titulo })) : fallbackTitulo && entidad?.nombre ? (_jsx(Tag, { style: { marginBottom: 4 }, children: fallbackTitulo })) : null, identificacion && identificacion !== '-' && (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx(IdcardOutlined, { style: { color: '#556ee6', marginRight: 8 } }), identificacion] })), telefono && telefono !== '-' && (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx(PhoneOutlined, { style: { color: '#556ee6', marginRight: 8 } }), telefono] })), direccion && direccion !== '-' && (_jsxs("div", { style: { fontSize: 13, color: '#595959' }, children: [_jsx(EnvironmentOutlined, { style: { color: '#556ee6', marginRight: 8 } }), direccion] })), beneficiario && beneficiario !== '-' && (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx(UserOutlined, { style: { color: '#556ee6', marginRight: 8 } }), toTitleCase(beneficiario)] })), (entidad?.cuentaContable?.noCuenta || entidad?.noCuenta) && (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx("span", { style: { marginRight: 8 }, children: "\uD83C\uDFE6" }), "Cuenta: ", entidad?.cuentaContable?.noCuenta || entidad?.noCuenta] }))] }) }));
};
export default EntidadCard;
