import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Space, Button, Modal } from 'antd';
import { ArrowLeftOutlined, PrinterOutlined, EditOutlined, CheckCircleOutlined, CloseCircleOutlined, RedoOutlined, ExclamationCircleOutlined, } from '@ant-design/icons';
import PermissionGate from './PermissionGate';
import { toEstadoNum, toPeriodoNum } from '../utils/estadoDocumento';
const { confirm } = Modal;
function accionConfirm(titulo, onOk) {
    confirm({
        title: titulo,
        icon: _jsx(ExclamationCircleOutlined, {}),
        content: `¿Está seguro que desea ${titulo.toLowerCase()} este documento?`,
        okText: 'Sí',
        cancelText: 'No',
        onOk,
    });
}
const DetalleToolbar = ({ modulo, estado, periodo, revisado, saving, imprimiendo, operacionLoading, onVolver, onImprimir, onImprimirTicket, onEditar, onAplicar, onAnular, onPostear, onRevisado, onDesaplicar, onReversar, showImprimir = true, confirmActions = true, edicionSinRestricciones = false, extraButtons, }) => {
    const estadoNum = toEstadoNum(estado);
    const periodoNum = toPeriodoNum(periodo);
    const wrapConfirm = (titulo, handler) => {
        if (!handler)
            return undefined;
        if (!confirmActions)
            return handler;
        return () => accionConfirm(titulo, handler);
    };
    return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: onVolver, children: "Volver" }), _jsx("div", { style: { flex: 1 } }), _jsxs(Space, { children: [showImprimir && onImprimir && (_jsx(PermissionGate, { codigoPantalla: modulo, accion: "IMPRIMIR", children: _jsx(Button, { icon: _jsx(PrinterOutlined, {}), loading: imprimiendo, onClick: onImprimir }) })), onImprimirTicket && (_jsx(PermissionGate, { codigoPantalla: modulo, accion: "IMPRIMIR", children: _jsx(Button, { icon: _jsx(PrinterOutlined, {}), onClick: onImprimirTicket, children: "Ticket" }) })), extraButtons, ((estadoNum === 0 && periodoNum !== 6) || edicionSinRestricciones) && revisado !== true && onEditar && (_jsx(PermissionGate, { codigoPantalla: modulo, accion: "EDITAR", children: _jsx(Button, { type: "primary", icon: _jsx(EditOutlined, {}), onClick: onEditar, children: "Editar" }) })), estadoNum === 0 && periodoNum !== 6 && onAplicar && (_jsx(PermissionGate, { codigoPantalla: modulo, accion: "APLICAR", children: _jsx(Button, { style: { background: '#389e0d', borderColor: '#389e0d', color: '#fff' }, icon: _jsx(CheckCircleOutlined, {}), disabled: operacionLoading, onClick: wrapConfirm('Aplicar', onAplicar), children: "Aplicar" }) })), revisado !== true && estadoNum !== 3 && periodoNum !== 6 && onAnular && (_jsx(PermissionGate, { codigoPantalla: modulo, accion: "ANULAR", children: _jsx(Button, { danger: true, icon: _jsx(CloseCircleOutlined, {}), loading: saving, onClick: wrapConfirm('Anular', onAnular), children: "Anular" }) })), (estadoNum === 1 || estadoNum === 3) && revisado !== true && periodoNum !== 6 && onPostear && (_jsx(PermissionGate, { codigoPantalla: modulo, accion: "POSTEAR", children: _jsx(Button, { icon: _jsx(CheckCircleOutlined, {}), disabled: operacionLoading, onClick: wrapConfirm('Postear', onPostear), children: "Postear" }) })), estadoNum === 1 && revisado !== true && periodoNum !== 6 && onRevisado && (_jsx(PermissionGate, { codigoPantalla: modulo, accion: "AUTORIZAR", children: _jsx(Button, { icon: _jsx(CheckCircleOutlined, {}), loading: saving, onClick: wrapConfirm('Marcar como revisado', onRevisado), children: "Revisado" }) })), estadoNum === 1 && revisado !== true && periodoNum !== 6 && onDesaplicar && (_jsx(PermissionGate, { codigoPantalla: modulo, accion: "DESAPLICAR", children: _jsx(Button, { icon: _jsx(RedoOutlined, {}), loading: saving, onClick: wrapConfirm('Desaplicar', onDesaplicar), children: "Desaplicar" }) })), estadoNum === 1 && revisado === true && periodoNum !== 6 && onReversar && (_jsx(PermissionGate, { codigoPantalla: modulo, accion: "REVERSAR", children: _jsx(Button, { danger: true, icon: _jsx(RedoOutlined, {}), loading: saving, onClick: wrapConfirm('Reversar', onReversar), children: "Reversar" }) }))] })] }));
};
export default DetalleToolbar;
