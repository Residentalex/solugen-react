import React from 'react';
import { Card, Divider } from 'antd';
import { formatNumber, toTitleCase } from '../utils/formats';
import { getMonedaSucursalActiva } from '../utils/moneda';

interface ImpuestoInformativo {
  nombre: string;
  monto: number;
}

interface TotalesCardProps {
  subTotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  retenciones?: number;
  nota?: string;
  alignRight?: boolean;
  monedaSimbolo?: string;
  monedaNombre?: string;
  tasa?: number;
  hideTitle?: boolean;
  children?: React.ReactNode;
  impuestosInformativos?: ImpuestoInformativo[];
}

const TotalesCard: React.FC<TotalesCardProps> = ({
  subTotal, descuento, impuestos, total, retenciones, nota,
  alignRight = false, monedaSimbolo, monedaNombre, tasa, hideTitle = false,
  impuestosInformativos = [],
  children,
}) => {
  const monedaDefault = getMonedaSucursalActiva();
  const simboloFinal = monedaSimbolo || monedaDefault.simbolo;
  const nombreFinal = monedaNombre || monedaDefault.nombre;

  return (
    <Card
    title={hideTitle ? null : <span style={{ fontSize: 16, fontWeight: 600 }}>Totales</span>}
    className="paces-card"
    style={{ marginBottom: 16 }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: alignRight ? 'right' : undefined }}>
      {monedaSimbolo && tasa !== undefined && (
        <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16 }}>
          {!alignRight && <span className="paces-text-secondary">Moneda</span>}
          <span>{toTitleCase(nombreFinal)} ({simboloFinal} {formatNumber(tasa ?? 1)})</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16, fontSize: 14 }}>
        {!alignRight && <span className="paces-text-secondary">Subtotal</span>}
        <span>{formatNumber(subTotal)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16, fontSize: 14 }}>
        {!alignRight && <span className="paces-text-secondary">Descuento</span>}
        <span>{formatNumber(descuento)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16, fontSize: 14 }}>
        {!alignRight && <span className="paces-text-secondary">Impuestos</span>}
        <span>{formatNumber(impuestos)}</span>
      </div>
      {impuestosInformativos && impuestosInformativos.length > 0 && impuestosInformativos.map((imp) => (
        <div key={imp.nombre} style={{
          display: 'flex',
          justifyContent: alignRight ? 'flex-end' : 'space-between',
          gap: 16,
          fontSize: 14,
          paddingLeft: alignRight ? 0 : 24,
        }}>
          {!alignRight && <span className="paces-text-secondary">{imp.nombre}</span>}
          <span>{formatNumber(imp.monto)}</span>
        </div>
      ))}
      {retenciones !== undefined && (
        <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16, fontSize: 14 }}>
          {!alignRight && <span className="paces-text-secondary">Retenciones</span>}
          <span>{formatNumber(retenciones)}</span>
        </div>
      )}
    </div>

    <Divider style={{ margin: '12px 0' }} />

    <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16, fontSize: 16, fontWeight: 700 }}>
      {!alignRight && <span>Total</span>}
      <span style={{ color: 'var(--paces-primary)' }}>{simboloFinal} {formatNumber(total)}</span>
    </div>

    {nota && (
      <>
        <Divider style={{ margin: '12px 0' }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, textAlign: alignRight ? 'right' : undefined }} className="paces-text-secondary">Notas</div>
          <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5, textAlign: alignRight ? 'right' : undefined }} className="paces-text-dark">
            {nota}
          </div>
        </div>
      </>
    )}

    {children}
  </Card>
  );
};

export default TotalesCard;
