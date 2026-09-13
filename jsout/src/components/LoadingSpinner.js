import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Spin } from 'antd';
const LoadingSpinner = ({ mensaje = 'Cargando...' }) => (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: mensaje })] }));
export default LoadingSpinner;
