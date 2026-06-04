import React from 'react';
import { Space, Typography } from 'antd';
import { getInitials, toTitleCase, getColorMonograma, getColorFromName } from '../utils/formats';

const { Text } = Typography;

interface EntidadColumnCellProps {
  name: string;
  diasCredito?: number | undefined;
}

const EntidadColumnCell: React.FC<EntidadColumnCellProps> = ({ name, diasCredito }) => {
  const bgColor = diasCredito !== undefined && diasCredito !== null
    ? getColorMonograma(diasCredito)
    : getColorFromName(name);
  return (
    <Space>
      <div
        className="paces-avatar-initials"
        style={{ backgroundColor: bgColor }}
      >
        {getInitials(name)}
      </div>
      <Text>{toTitleCase(name) || ''}</Text>
    </Space>
  );
};

export default EntidadColumnCell;
