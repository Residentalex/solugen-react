import { jsx as _jsx } from "react/jsx-runtime";
import React, { useMemo } from 'react';
import { Modal } from 'antd';
import { escposToHtml } from '../utils/escposToHtml';
const TicketPreviewModal = ({ open, ticketText, onClose, onPrint, }) => {
    const html = useMemo(() => escposToHtml(ticketText), [ticketText]);
    return (_jsx(Modal, { title: "Vista previa del ticket", open: open, onCancel: onClose, onOk: onPrint, okText: "Imprimir", cancelText: "Cerrar", width: 480, children: _jsx("div", { style: {
                background: '#fff',
                padding: '16px 24px',
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: 14,
                lineHeight: 1.5,
                maxHeight: 500,
                overflow: 'auto',
                border: '1px solid #d9d9d9',
                borderRadius: 4,
            }, dangerouslySetInnerHTML: { __html: html } }) }));
};
export default TicketPreviewModal;
