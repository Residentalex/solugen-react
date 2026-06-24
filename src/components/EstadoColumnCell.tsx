import React from 'react';
import { Tag, Tooltip } from 'antd';
import { CheckCircleFilled, LockFilled } from '@ant-design/icons';
import { resolveEstado } from '../utils/estadoDocumento';

interface EstadoColumnCellProps {
  estado: string | number;
  periodo?: number | string;
  revisado?: boolean;
}

const LOCK_COLOR: Record<string, string> = {
  success: '#1b5e1b',
  error: '#9a0310',
  default: '#404040',
  processing: '#0035a0',
  warning: '#9e5c00',
  cyan: '#006666',
};

const EstadoColumnCell: React.FC<EstadoColumnCellProps> = ({ estado, periodo, revisado }) => {
  const esCerrado = typeof periodo === 'string' ? periodo === 'Cerrado' : Number(periodo) === 6;
  const info = resolveEstado(estado);
  const lockColor = LOCK_COLOR[info.color] || '#404040';
  return (
    <Tag color={info.color}>
      {info.label}
      {revisado && (
        <Tooltip title="Documento revisado">
          <CheckCircleFilled style={{ marginLeft: 4, fontSize: 12, color: '#52c41a' }} />
        </Tooltip>
      )}
      {esCerrado && (
        <Tooltip title="Período contable cerrado">
          <LockFilled style={{ marginLeft: 4, fontSize: 12, color: lockColor }} />
        </Tooltip>
      )}
    </Tag>
  );
};

export default EstadoColumnCell;
