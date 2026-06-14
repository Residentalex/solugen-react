import React from 'react';
import { Card, Tag, Typography, Button, Tooltip, Space, App } from 'antd';
import { CopyOutlined, FileTextOutlined } from '@ant-design/icons';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import type { CuentaBancariaDTO } from '../../api/cuentaBancariaApi';

const { Text } = Typography;

/* ===== Bank Color Palette (deterministic by hash) ===== */

const BANK_COLORS = [
  { bg: 'linear-gradient(135deg, #556ee6 0%, #6c7ff0 100%)' },
  { bg: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)' },
  { bg: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' },
  { bg: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' },
  { bg: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)' },
  { bg: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)' },
  { bg: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)' },
  { bg: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)' },
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

function getBankColor(banco: string): string {
  const index = Math.abs(hashCode(banco || '')) % BANK_COLORS.length;
  return BANK_COLORS[index].bg;
}

function maskAccountNumber(noCuenta: string): string {
  if (!noCuenta) return '';
  const clean = noCuenta.replace(/\s+/g, '');
  if (clean.length <= 4) return clean;
  const last4 = clean.slice(-4);
  return `•••• •••• •••• ${last4}`;
}

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatBalance(value: number | undefined, moneda: string | undefined): string {
  if (value === undefined || value === null) return '';
  const monedaDefault = getMonedaSucursalActiva();
  const symbol = moneda?.toUpperCase() === 'DOLAR' ? 'US$' : (monedaDefault.simbolo || 'RD$');
  return `${symbol} ${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getMonedaInfo(moneda: string | undefined): { label: string; color: string } {
  if (moneda?.toUpperCase() === 'DOLAR') return { label: 'USD', color: '#10b981' };
  const monedaDefault = getMonedaSucursalActiva();
  return { label: monedaDefault.codigo || 'DOP', color: '#556ee6' };
}

/* ===== Component ===== */

interface CuentaBancariaCardProps {
  cuenta: CuentaBancariaDTO;
  onClick?: () => void;
  index?: number;
}

const CuentaBancariaCard: React.FC<CuentaBancariaCardProps> = ({ cuenta, onClick, index = 0 }) => {
  const { message } = App.useApp();
  const isActive = cuenta.activo;
  const esUSD = cuenta.moneda?.toUpperCase() === 'DOLAR' || cuenta.moneda?.toUpperCase() === 'USD';
  const monedaInfo = getMonedaInfo(cuenta.moneda);
  const cardClassName = `cuenta-bancaria-card${!isActive ? ' cuenta-inactiva' : ''}${esUSD ? ' cuenta-usd' : ''}`;
  const balanceDisplay = formatBalance(cuenta.balance, cuenta.moneda);
  const hasBalance = cuenta.balance !== undefined && cuenta.balance !== null;
  const staggerDelay = `${index * 0.05}s`;

  const handleCopyNumber = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(cuenta.noCuenta || '').then(() => {
      message.success('Número de cuenta copiado');
    });
  };

  const handleViewTransactions = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  return (
    <div className="cuenta-card-wrapper" style={{ animationDelay: staggerDelay }}>
      <Card
        className={cardClassName}
        hoverable
        onClick={onClick}
        styles={{ body: { padding: 0 } }}
      >
        {/* Header with gradient + chip */}
        <div className="cuenta-card-header" style={{ background: getBankColor(cuenta.banco) }}>
          <div className="cuenta-card-chip" />
          <div className="cuenta-card-header-top">
            <Text className="cuenta-card-banco" ellipsis={{ tooltip: cuenta.banco }}>
              {toTitleCase(cuenta.banco ?? '')}
            </Text>
            <Space size={4}>
              <span className="cuenta-card-moneda-badge" style={{ background: monedaInfo.color }}>
                {monedaInfo.label}
              </span>
              <Tag color={isActive ? 'success' : 'error'} className="cuenta-card-status-tag">
                {isActive ? 'Activo' : 'Inactivo'}
              </Tag>
            </Space>
          </div>
          <div className="cuenta-card-number">{maskAccountNumber(cuenta.noCuenta)}</div>
        </div>

        {/* Body */}
        <div className="cuenta-card-body">
          {/* Hero balance */}
          <div className="cuenta-card-balance-section">
            {hasBalance ? (
              <>
                <div className={`cuenta-balance-hero${esUSD ? ' balance-usd' : ''}`}>
                  {balanceDisplay}
                </div>
                <Text type="secondary" className="cuenta-balance-label">
                  Saldo disponible
                </Text>
              </>
            ) : (
              <div className="cuenta-balance-hero no-disponible">
                — <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>Saldo no disponible</Text>
              </div>
            )}
          </div>

          <div className="cuenta-card-divider" />

          {/* Account name */}
          <Text strong className="cuenta-card-nombre" ellipsis={{ tooltip: cuenta.nombre }}>
            {toTitleCase(cuenta.nombre ?? '')}
          </Text>

          {/* Secondary data */}
          <div className="cuenta-card-datos">
            <div>
              <span className="cuenta-card-dato-label">Cta. Contable</span>
              <span className="cuenta-card-dato-valor">{cuenta.cuentaContable || '—'}</span>
            </div>
            <div>
              <span className="cuenta-card-dato-label">Agente</span>
              <span className="cuenta-card-dato-valor">{toTitleCase(cuenta.agente ?? '') || '—'}</span>
            </div>
          </div>
        </div>

        {/* Footer with inline actions */}
        <div className="cuenta-card-footer">
          <Space size={2}>
            <Tooltip title="Copiar número de cuenta">
              <Button type="text" size="small" icon={<CopyOutlined />} onClick={handleCopyNumber} className="cuenta-footer-btn" />
            </Tooltip>
            <Tooltip title="Ver movimientos">
              <Button type="text" size="small" icon={<FileTextOutlined />} onClick={handleViewTransactions} className="cuenta-footer-btn" />
            </Tooltip>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default CuentaBancariaCard;
