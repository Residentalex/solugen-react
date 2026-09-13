import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Tooltip, Typography } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { codigoSucursalANumero, obtenerNombreSucursal } from '../utils/sucursalEnumMapper';
const { Text } = Typography;
const SucursalField = ({ codigoSucursal, sucursal }) => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setSucursalActiva = useAuthStore((s) => s.setSucursalActiva);
    const sucursalesPermitidas = useAuthStore((s) => s.sucursalesPermitidas);
    const codigo = codigoSucursal || sucursal?.idExterno;
    const sucursalNumero = codigoSucursalANumero(codigo);
    const nombre = obtenerNombreSucursal(codigo);
    if (sucursalNumero === null)
        return _jsx(_Fragment, { children: 'Consolidado' });
    const esMismaSucursal = sucursalNumero === sucursalActiva;
    const tienePermiso = sucursalesPermitidas.some((s) => s.sucursal === sucursalNumero);
    const handleClick = async () => {
        if (esMismaSucursal || !tienePermiso)
            return;
        await setSucursalActiva(sucursalNumero);
        window.location.reload();
    };
    if (esMismaSucursal || !tienePermiso) {
        return _jsx("span", { children: nombre });
    }
    return (_jsx(Tooltip, { title: `Haz clic para cambiar a ${nombre}`, children: _jsxs("a", { onClick: handleClick, style: { cursor: 'pointer', color: '#556ee6' }, children: [nombre, " ", _jsx(SwapOutlined, {})] }) }));
};
export default SucursalField;
