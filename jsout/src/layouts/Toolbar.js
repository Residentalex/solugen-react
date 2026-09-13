import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Button, Space } from 'antd';
import { useUIStore } from '../stores/uiStore';
import { PlusOutlined, EditOutlined, SaveOutlined, CloseOutlined, CheckCircleOutlined, CloseCircleOutlined, PrinterOutlined, RedoOutlined, } from '@ant-design/icons';
const Toolbar = () => {
    const toolbarState = useUIStore((s) => s.toolbarState);
    const nuevoCallback = useUIStore((s) => s.nuevoCallback);
    const editarCallback = useUIStore((s) => s.editarCallback);
    const guardarCallback = useUIStore((s) => s.guardarCallback);
    const cancelarCallback = useUIStore((s) => s.cancelarCallback);
    const aplicarCallback = useUIStore((s) => s.aplicarCallback);
    const anularCallback = useUIStore((s) => s.anularCallback);
    const postearCallback = useUIStore((s) => s.postearCallback);
    const revisadoCallback = useUIStore((s) => s.revisadoCallback);
    const reversarCallback = useUIStore((s) => s.reversarCallback);
    const imprimirCallback = useUIStore((s) => s.imprimirCallback);
    if (!toolbarState.nuevo && !toolbarState.editar && !toolbarState.guardar) {
        return null;
    }
    return (_jsx("div", { className: "paces-toolbar", children: _jsxs(Space, { wrap: true, children: [toolbarState.nuevo && (_jsx(Button, { icon: _jsx(PlusOutlined, {}), type: "primary", onClick: nuevoCallback, children: "Nuevo" })), toolbarState.editar && (_jsx(Button, { icon: _jsx(EditOutlined, {}), onClick: editarCallback, children: "Editar" })), toolbarState.clonar && (_jsx(Button, { children: "Clonar" })), toolbarState.guardar && (_jsx(Button, { icon: _jsx(SaveOutlined, {}), type: "primary", onClick: guardarCallback, children: "Guardar" })), toolbarState.cancelar && (_jsx(Button, { icon: _jsx(CloseOutlined, {}), onClick: cancelarCallback, children: "Cancelar" })), toolbarState.aplicar && (_jsx(Button, { icon: _jsx(CheckCircleOutlined, {}), type: "primary", onClick: aplicarCallback, children: "Aplicar" })), toolbarState.desaplicar && (_jsx(Button, { icon: _jsx(CloseCircleOutlined, {}), onClick: anularCallback, children: "Desaplicar" })), toolbarState.anular && (_jsx(Button, { icon: _jsx(CloseCircleOutlined, {}), danger: true, onClick: anularCallback, children: "Anular" })), toolbarState.imprimir && (_jsx(Button, { icon: _jsx(PrinterOutlined, {}), onClick: imprimirCallback, children: "Imprimir" })), toolbarState.postear && (_jsx(Button, { icon: _jsx(CheckCircleOutlined, {}), onClick: postearCallback, children: "Postear" })), toolbarState.revisado && (_jsx(Button, { icon: _jsx(CheckCircleOutlined, {}), onClick: revisadoCallback, children: "Revisado" })), toolbarState.reversar && (_jsx(Button, { icon: _jsx(RedoOutlined, {}), danger: true, onClick: reversarCallback, children: "Reversar" }))] }) }));
};
export default Toolbar;
