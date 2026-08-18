import React from 'react';
import { Button, Modal } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import type { VisanetResponseDTO } from '../types/visanet';
import { formatFechaCorta } from '../utils/escpos-formatter';

interface VisanetVoucherProps {
  visible: boolean;
  onClose: () => void;
  respuesta: VisanetResponseDTO;
  montoPesos: number;
  transacId?: number;
  onPrintQZ: () => Promise<void>;
  companyName: string;
  sucursalName: string;
  simMoneda: string;
  subsidioLabel: string;
}

const VisanetVoucher: React.FC<VisanetVoucherProps> = ({ visible, onClose, respuesta, montoPesos, transacId, onPrintQZ, companyName, sucursalName, simMoneda, subsidioLabel }) => {

  return (
    <Modal
      title="Voucher"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>Cerrar</Button>,
        <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={onPrintQZ}>
          Imprimir
        </Button>,
      ]}
      width={400}
    >
      {/* Contenido del voucher */}
      <div id="voucher-content" style={{
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: 13,
        padding: 16,
        lineHeight: 1.6,
      }}>
        {/* Encabezado - Empresa */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 'bold', fontSize: 15 }}>{companyName || 'SOLUGEN S.R.L.'}</div>
          <div style={{ fontSize: 12 }}>{sucursalName}</div>
        </div>

        <div style={{ borderTop: '1px solid #000', marginBottom: 10 }} />

        {/* Comercio y tipo */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div>ID: {respuesta.merchantId || '000000167391001'}</div>
          <div style={{ fontWeight: 'bold', fontSize: 14, marginTop: 4 }}>
            {subsidioLabel}
          </div>
        </div>

        <div style={{ borderTop: '1px solid #000', marginBottom: 10 }} />

        {/* Detalle */}
        <div style={{ marginBottom: 12 }}>
          <div>FECHA: {formatFechaCorta(respuesta.transactionDate) || ''}</div>
          <div>{respuesta.issuerName || ''}</div>
          <div>Trans # {respuesta.tokenECR || ''}</div>
          <div>Autorización #: {respuesta.autorizacion || ''}</div>
        </div>

        <div style={{ borderTop: '1px solid #000', marginBottom: 10 }} />

        {/* Total */}
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 15, marginBottom: 16 }}>
          Total: {simMoneda} {montoPesos.toFixed(2)}
        </div>

        {/* Pie */}
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 13, color: respuesta.exitoso ? '#52c41a' : '#ff4d4f' }}>
          {respuesta.exitoso ? 'APROBADA' : 'RECHAZADA'}
        </div>
      </div>

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #voucher-content, #voucher-content * { visibility: visible; }
          #voucher-content { position: absolute; left: 0; top: 0; width: 80mm; padding: 8px; }
          .ant-modal { display: none !important; }
        }
      `}</style>
    </Modal>
  );
};

export default VisanetVoucher;
