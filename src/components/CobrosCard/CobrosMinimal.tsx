import React from 'react';
import { Card, Skeleton, Empty, Divider } from 'antd';
import {
  FileTextOutlined, SwapOutlined,
  CreditCardOutlined, GiftOutlined, TagOutlined,
  RollbackOutlined, CreditCardFilled, DollarCircleOutlined,
} from '@ant-design/icons';
import { formatCurrency, formatDate, toTitleCase } from '../../utils/formats';
import type { CobroDTO } from '../../types/facturaPOS';

interface CobrosMinimalProps {
  cobrosPOS?: CobroDTO;
  cobrosArray?: any[];
  loading?: boolean;
}

const MEDIOS_POS: { key: keyof CobroDTO; label: string; icon: React.ReactNode }[] = [
  { key: 'efectivo', label: 'Efectivo', icon: <DollarCircleOutlined /> },
  { key: 'cheque', label: 'Cheque', icon: <FileTextOutlined /> },
  { key: 'transferencia', label: 'Transferencia', icon: <SwapOutlined /> },
  { key: 'tarjetaCredito', label: 'Tarjeta Crédito', icon: <CreditCardOutlined /> },
  { key: 'tarjetaDebito', label: 'Tarjeta Débito', icon: <CreditCardFilled /> },
  { key: 'bono', label: 'Bono', icon: <GiftOutlined /> },
  { key: 'tarjetaRegalo', label: 'Tarjeta Regalo', icon: <TagOutlined /> },
  { key: 'notaCredito', label: 'Nota Crédito', icon: <RollbackOutlined /> },
];

function EstadoBadge({ estado }: { estado: number | undefined }) {
  if (estado === undefined) return null;
  const color = estado === 1 ? '#52c41a' : estado === 0 ? '#faad14' : '#ff4d4f';
  const label = estado === 1 ? 'Pagado' : estado === 0 ? 'Pendiente' : 'Anulado';
  return (
    <span style={{ fontSize: 11, color }}>
      <span style={{
        display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
        background: color, marginRight: 4, verticalAlign: 'middle',
      }} />
      {label}
    </span>
  );
}

const CobrosMinimal: React.FC<CobrosMinimalProps> = ({ cobrosPOS, cobrosArray, loading }) => {
  const renderContent = () => {
    if (loading) {
      return (
        <Skeleton
          active
          title={false}
          paragraph={{ rows: 3, width: ['90%', '90%', '60%'] }}
        />
      );
    }

    if (cobrosPOS) {
      const medios = MEDIOS_POS.filter((m) => (cobrosPOS[m.key] || 0) > 0);

      if (medios.length === 0) {
        return (
          <Empty
            image={<CreditCardOutlined style={{ fontSize: 28, color: '#bfbfbf' }} />}
            imageStyle={{ height: 36 }}
            description={<span style={{ fontSize: 12, color: 'var(--paces-text-secondary)' }}>Sin cobros registrados</span>}
          />
        );
      }

      const totalCobrado = medios.reduce((sum, m) => sum + (cobrosPOS[m.key] || 0), 0);

      return (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {medios.map((m) => (
              <div
                key={m.key}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 10px', borderRadius: 6,
                  background: 'var(--paces-bg-secondary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, color: 'var(--paces-text-secondary)' }}>{m.icon}</span>
                  <span style={{ fontSize: 13, color: 'var(--paces-text-secondary)' }}>{m.label}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{formatCurrency(cobrosPOS[m.key] || 0)}</span>
              </div>
            ))}
          </div>
          <Divider style={{ margin: '10px 0' }} />
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 0',
          }}>
            <span style={{ fontSize: 12, color: 'var(--paces-text-secondary)' }}>Total cobrado</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{formatCurrency(totalCobrado)}</span>
          </div>
        </>
      );
    }

    if (cobrosArray !== undefined) {
      if (cobrosArray.length === 0) {
        return (
          <Empty
            image={<CreditCardOutlined style={{ fontSize: 28, color: '#bfbfbf' }} />}
            imageStyle={{ height: 36 }}
            description={<span style={{ fontSize: 12, color: 'var(--paces-text-secondary)' }}>Sin cobros registrados</span>}
          />
        );
      }

      const totalCobrado = cobrosArray.reduce((sum: number, c: any) => sum + (c.monto || 0), 0);

      return (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cobrosArray.map((c: any, i: number) => (
              <div key={c.id || i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 10px', borderRadius: 6,
                background: 'var(--paces-bg-secondary)',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 12, color: 'var(--paces-text-secondary)' }}>
                    {c.fecha ? formatDate(c.fecha) : '—'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--paces-text-secondary)' }}>
                    {toTitleCase(c.medioCobro || '')}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{formatCurrency(c.monto || 0)}</span>
                  {c.estado !== undefined && <EstadoBadge estado={c.estado} />}
                </div>
              </div>
            ))}
          </div>
          <Divider style={{ margin: '10px 0' }} />
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 0',
          }}>
            <span style={{ fontSize: 12, color: 'var(--paces-text-secondary)' }}>Total cobrado</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{formatCurrency(totalCobrado)}</span>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <Card
      className="paces-card"
      size="small"
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><CreditCardOutlined style={{ color: '#556ee6', marginRight: 8 }} />Cobros</span>
          {cobrosPOS && (
            <EstadoBadge estado={(cobrosPOS as any).estado ?? ((cobrosPOS as any).pago != null && (cobrosPOS as any).pago > 0 ? 1 : undefined)} />
          )}
        </div>
      }
      style={{ marginBottom: 16 }}
    >
      {renderContent()}
    </Card>
  );
};

export default CobrosMinimal;
