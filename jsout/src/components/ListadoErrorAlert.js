import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { Alert, Button } from 'antd';
const ListadoErrorAlert = ({ message, onRetry }) => {
    return (_jsx(Alert, { message: message, type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: onRetry, children: "Reintentar" }) }));
};
export default ListadoErrorAlert;
