import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { Modal, DatePicker } from 'antd';
const ModalFechaVencimiento = ({ open, onClose, onFechaChange }) => {
    return (_jsx(Modal, { title: "Fecha de Vencimiento", open: open, onCancel: onClose, onOk: onClose, footer: null, destroyOnHidden: true, children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", onChange: onFechaChange }) }));
};
export default ModalFechaVencimiento;
