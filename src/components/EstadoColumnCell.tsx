import React from 'react';
import { Tag, Tooltip } from 'antd';
import { LockFilled } from '@ant-design/icons';
import { ESTADO_DOCUMENTO_MAP } from '../utils/estadoDocumento';

interface EstadoColumnCellProps {
  estado: number;
  periodo?: number | string;
}

const EstadoColumnCell: React.FC<EstadoColumnCellProps> = ({ estado, periodo }) => {
  const esCerrado = Number(periodo) === 6;
  const info = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Desconocido', color: 'default' };
  return (
    <Tag color={info.color}>
      {info.label}
      {esCerrado && (
        <Tooltip title="Período contable cerrado">
          <LockFilled style={{ marginLeft: 4, fontSize: 12, color: '#595959' }} />
        </Tooltip>
      )}
    </Tag>
  );
};

export default EstadoColumnCell;
