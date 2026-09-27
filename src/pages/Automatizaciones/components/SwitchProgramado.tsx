import React from 'react';
import { Switch, Tooltip, Typography } from 'antd';

const { Text } = Typography;

interface SwitchProgramadoProps {
  activo: boolean;
  onCambio?: (activo: boolean) => void;
}

export const SwitchProgramado: React.FC<SwitchProgramadoProps> = ({
  activo,
  onCambio,
}) => {
  if (onCambio) {
    return (
      <Switch
        size="small"
        checked={activo}
        onChange={onCambio}
        title={activo ? 'Programado' : 'No programado'}
      />
    );
  }

  return (
    <Tooltip title={activo ? 'Programado' : 'No programado'}>
      <Switch size="small" checked={activo} disabled />
    </Tooltip>
  );
};