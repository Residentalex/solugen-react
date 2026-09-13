import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { useAuthStore } from '../stores/authStore';
const PermissionEspecialGate = ({ permiso, children }) => {
    const usuario = useAuthStore((s) => s.usuario);
    if (!usuario || !permiso) {
        return null;
    }
    const tienePermiso = usuario.permisosEspeciales?.some((p) => p.codigo?.toUpperCase() === permiso.toUpperCase() && p.valor === true);
    if (!tienePermiso) {
        return null;
    }
    return _jsx(_Fragment, { children: children });
};
export default PermissionEspecialGate;
