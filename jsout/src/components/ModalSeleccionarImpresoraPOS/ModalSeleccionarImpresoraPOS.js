import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { Modal, Radio, Select, Space } from 'antd';
const ModalSeleccionarImpresoraPOS = ({ open, impresoras, seleccionada, onSelect, onConfirm, onClose, titulo = 'Seleccionar impresora POS', okText = 'Imprimir', cancelText = 'Cancelar', deshabilitarOkSinSeleccion = true, usarSelect = false, }) => {
    return (_jsx(Modal, { title: titulo, open: open, onOk: onConfirm, onCancel: onClose, okText: okText, cancelText: cancelText, okButtonProps: { disabled: deshabilitarOkSinSeleccion ? !seleccionada : undefined }, children: usarSelect ? (_jsx(Select, { style: { width: '100%' }, value: seleccionada, onChange: (v) => onSelect(v), options: impresoras.map((p) => ({ label: p, value: p })) })) : (_jsx(Radio.Group, { onChange: (e) => onSelect(e.target.value), value: seleccionada, children: _jsx(Space, { direction: "vertical", style: { width: '100%' }, children: impresoras.map((name) => (_jsx(Radio, { value: name, style: { width: '100%' }, children: name }, name))) }) })) }));
};
export default ModalSeleccionarImpresoraPOS;
