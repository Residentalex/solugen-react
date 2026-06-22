import React from 'react';
import { Tag, Tooltip } from 'antd';
import { CheckCircleFilled, LockFilled } from '@ant-design/icons';
import { resolveEstado } from '../utils/estadoDocumento';

interface EstadoColumnCellProps {
  estado: string | number;
  periodo?: number | string;
  revisado?: boolean;
}

const EstadoColumnCell: React.FC<EstadoColumnCellProps> = ({ estado, periodo, revisado }) => {
  const esCerrado = Number(periodo) === 6;
  const info = resolveEstado(estado);
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
          <LockFilled style={{ marginLeft: 4, fontSize: 12, color: '#595959' }} />
        </Tooltip>
      )}
    </Tag>
  );
};

export default EstadoColumnCell;
