import React from 'react';
import { Skeleton } from 'antd';
import { formatCurrency, formatDate, toTitleCase } from '../../utils/formats';
import type { CobroDTO } from '../../types/facturaPOS';

interface CobrosMinimalProps {
  cobrosPOS?: CobroDTO;
  cobrosArray?: any[];
  loading?: boolean;
}

const MEDIOS_POS: { key: keyof CobroDTO; label: string }[] = [
  { key: 'efectivo', label: 'Efectivo' },
  { key: 'cheque', label: 'Cheque' },
  { key: 'transferencia', label: 'Transferencia' },
  { key: 'tarjetaCredito', label: 'Tarjeta Crédito' },
  { key: 'tarjetaDebito', label: 'Tarjeta Débito' },
  { key: 'bono', label: 'Bono' },
  { key: 'tarjetaRegalo', label: 'Tarjeta Regalo' },
  { key: 'notaCredito', label: 'Nota Crédito' },
];

const sectionWrapperStyle: React.CSSProperties = {
  paddingTop: 14,
  borderTop: '1px dashed var(--paces-border)',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--paces-text-secondary)',
  marginBottom: 10,
};

const separatorStyle: React.CSSProperties = {
  height: 1,
  background: 'var(--paces-border-secondary)',
  margin: '10px 0 8px',
};

const totalRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  fontSize: 13,
  fontWeight: 600,
};

function EstadoDot({ estado }: { estado: number | undefined }) {
  if (estado === undefined) return null;
  const color = estado === 1 ? '#52c41a' : estado === 0 ? '#faad14' : '#ff4d4f';
  const label = estado === 1 ? 'Aplicado' : estado === 0 ? 'Pendiente' : 'Anulado';
  return (
    <span style={{ fontSize: 11, color: 'var(--paces-text-secondary)' }}>
      <span style={{
        display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
        background: color, marginRight: 4, verticalAlign: 'middle',
      }} />
      {label}
    </span>
  );
}

const CobrosMinimal: React.FC<CobrosMinimalProps> = ({ cobrosPOS, cobrosArray, loading }) => {

  if (loading) {
    return (
      <div style={sectionWrapperStyle}>
        <div style={sectionLabelStyle}>Cobros</div>
        <Skeleton
          active
          title={false}
          paragraph={{ rows: 2, width: ['80%', '80%'] }}
          style={{ marginBottom: 8 }}
        />
        <div style={separatorStyle} />
        <Skeleton active title={{ width: '60%' }} paragraph={false} />
      </div>
    );
  }

  if (cobrosPOS) {
    const medios = MEDIOS_POS.filter((m) => (cobrosPOS[m.key] || 0) > 0);

    if (medios.length === 0) {
      return (
        <div style={sectionWrapperStyle}>
          <div style={sectionLabelStyle}>Cobros</div>
          <div style={{ fontSize: 12, color: 'var(--paces-text-secondary)', fontStyle: 'italic' }}>
            Sin cobros registrados
          </div>
        </div>
      );
    }

    const totalCobrado = medios.reduce((sum, m) => sum + (cobrosPOS[m.key] || 0), 0);

    return (
      <div style={sectionWrapperStyle}>
        <div style={sectionLabelStyle}>Cobros</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {medios.map((m) => (
            <div key={m.key} style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'baseline', fontSize: 13,
            }}>
              <span style={{ color: 'var(--paces-text-secondary)' }}>{m.label}</span>
              <span style={{ fontWeight: 500, color: 'var(--paces-text)' }}>
                {formatCurrency(cobrosPOS[m.key] || 0)}
              </span>
            </div>
          ))}
        </div>
        <div style={separatorStyle} />
        <div style={totalRowStyle}>
          <span style={{ color: 'var(--paces-text)' }}>Total cobrado</span>
          <span style={{ color: 'var(--paces-primary)', fontWeight: 700 }}>
            {formatCurrency(totalCobrado)}
          </span>
        </div>
      </div>
    );
  }

  if (cobrosArray !== undefined) {
    if (cobrosArray.length === 0) {
      return (
        <div style={sectionWrapperStyle}>
          <div style={sectionLabelStyle}>Cobros</div>
          <div style={{ fontSize: 12, color: 'var(--paces-text-secondary)', fontStyle: 'italic' }}>
            Sin cobros registrados
          </div>
        </div>
      );
    }

    const totalCobrado = cobrosArray.reduce((sum: number, c: any) => sum + (c.monto || 0), 0);

    return (
      <div style={sectionWrapperStyle}>
        <div style={sectionLabelStyle}>Cobros</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cobrosArray.map((c: any, i: number) => (
            <div key={c.id || i}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: '0 8px',
                alignItems: 'baseline',
                fontSize: 13,
              }}>
                <span style={{
                  color: 'var(--paces-text-secondary)', fontSize: 12, whiteSpace: 'nowrap',
                }}>
                  {c.fecha ? formatDate(c.fecha) : '—'}
                </span>
                <span style={{
                  color: 'var(--paces-text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {toTitleCase(c.medioCobro || '')}
                </span>
                <span style={{ fontWeight: 500, color: 'var(--paces-text)', whiteSpace: 'nowrap' }}>
                  {formatCurrency(c.monto || 0)}
                </span>
              </div>
              {c.estado !== undefined && (
                <div style={{ paddingLeft: 0, marginTop: 2 }}>
                  <EstadoDot estado={c.estado} />
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={separatorStyle} />
        <div style={totalRowStyle}>
          <span style={{ color: 'var(--paces-text)' }}>Total cobrado</span>
          <span style={{ color: 'var(--paces-primary)', fontWeight: 700 }}>
            {formatCurrency(totalCobrado)}
          </span>
        </div>
      </div>
    );
  }

  return null;
};

export default CobrosMinimal;
