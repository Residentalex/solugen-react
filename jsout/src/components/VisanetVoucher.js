import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Button, Modal } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { formatFechaCorta } from '../utils/escpos-formatter';
const VisanetVoucher = ({ visible, onClose, respuesta, montoPesos, transacId, onPrintQZ, companyName, sucursalName, simMoneda, subsidioLabel }) => {
    return (_jsxs(Modal, { title: "Voucher", open: visible, onCancel: onClose, footer: [
            _jsx(Button, { onClick: onClose, children: "Cerrar" }, "cancel"),
            _jsx(Button, { type: "primary", icon: _jsx(PrinterOutlined, {}), onClick: onPrintQZ, children: "Imprimir" }, "print"),
        ], width: 400, children: [_jsxs("div", { id: "voucher-content", style: {
                    fontFamily: '"Courier New", Courier, monospace',
                    fontSize: 13,
                    padding: 16,
                    lineHeight: 1.6,
                }, children: [_jsxs("div", { style: { textAlign: 'center', marginBottom: 12 }, children: [_jsx("div", { style: { fontWeight: 'bold', fontSize: 15 }, children: companyName || 'SOLUGEN S.R.L.' }), _jsx("div", { style: { fontSize: 12 }, children: sucursalName })] }), _jsx("div", { style: { borderTop: '1px solid #000', marginBottom: 10 } }), _jsxs("div", { style: { textAlign: 'center', marginBottom: 12 }, children: [_jsxs("div", { children: ["ID: ", respuesta.merchantId || '000000167391001'] }), _jsx("div", { style: { fontWeight: 'bold', fontSize: 14, marginTop: 4 }, children: subsidioLabel })] }), _jsx("div", { style: { borderTop: '1px solid #000', marginBottom: 10 } }), _jsxs("div", { style: { marginBottom: 12 }, children: [_jsxs("div", { children: ["FECHA: ", formatFechaCorta(respuesta.transactionDate) || ''] }), _jsx("div", { children: respuesta.issuerName || '' }), _jsxs("div", { children: ["Trans # ", respuesta.tokenECR || ''] }), _jsxs("div", { children: ["Autorizaci\u00F3n #: ", respuesta.autorizacion || ''] })] }), _jsx("div", { style: { borderTop: '1px solid #000', marginBottom: 10 } }), _jsxs("div", { style: { textAlign: 'center', fontWeight: 'bold', fontSize: 15, marginBottom: 16 }, children: ["Total: ", simMoneda, " ", montoPesos.toFixed(2)] }), _jsx("div", { style: { textAlign: 'center', fontWeight: 'bold', fontSize: 13, color: respuesta.exitoso ? '#52c41a' : '#ff4d4f' }, children: respuesta.exitoso ? 'APROBADA' : 'RECHAZADA' })] }), _jsx("style", { children: `
        @media print {
          body * { visibility: hidden; }
          #voucher-content, #voucher-content * { visibility: visible; }
          #voucher-content { position: absolute; left: 0; top: 0; width: 80mm; padding: 8px; }
          .ant-modal { display: none !important; }
        }
      ` })] }));
};
export default VisanetVoucher;
