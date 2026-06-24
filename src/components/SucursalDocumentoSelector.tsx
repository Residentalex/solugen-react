import React from 'react';
import { Select, Typography } from 'antd';
import { useAuthStore } from '../stores/authStore';
import { useCompanyStore } from '../stores/companyStore';
import { Sucursal } from '../types/auth';

const { Text } = Typography;

interface Props {
  value?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  showAllOption?: boolean;
}

const SucursalDocumentoSelector: React.FC<Props> = ({ value, onChange, disabled, style, showAllOption }) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const sucursalContable = useAuthStore((s) => s.sucursalContable);
  const sucursales = useCompanyStore((s) => s.data.sucursales);

  if (sucursalActiva !== sucursalContable) return null;

  const baseOptions = (sucursales || [])
    .filter((s: any) => s.sucursal !== undefined)
    .map((s: any) => ({
      value: s.sucursal as number,
      label: s.nombre || s.codigo || `Sucursal ${s.sucursal}`,
    }));

  const options = showAllOption
    ? [{ value: -1, label: 'Todas' }, ...baseOptions]
    : baseOptions;

  if (options.length === 0) return null;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...style }}>
      <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>Sucursal:</Text>
      <Select
        value={value ?? options[0]?.value}
        onChange={onChange}
        disabled={disabled}
        size="small"
        style={{ minWidth: 160 }}
        options={options}
        placeholder="Seleccionar sucursal"
      />
    </div>
  );
};

export default SucursalDocumentoSelector;
