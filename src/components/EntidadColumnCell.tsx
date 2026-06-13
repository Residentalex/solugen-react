import React from 'react';
import { Typography } from 'antd';
import { getInitials, toTitleCase, getColorMonograma, getColorFromName } from '../utils/formats';

const { Text } = Typography;

interface EntidadColumnCellProps {
  name: string;
  diasCredito?: number | undefined;
  identificacion?: string | null;
}

const EntidadColumnCell: React.FC<EntidadColumnCellProps> = ({ name, diasCredito, identificacion }) => {
  const bgColor = diasCredito !== undefined && diasCredito !== null
    ? getColorMonograma(diasCredito)
    : getColorFromName(name);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 36 }}>
      <div
        className="paces-avatar-initials"
        style={{ backgroundColor: bgColor, flexShrink: 0 }}
      >
        {getInitials(name)}
      </div>
      <div>
        <div><Text>{toTitleCase(name) || ''}</Text></div>
        {identificacion && (
          <div className="paces-text-secondary" style={{ fontSize: 10, lineHeight: 1.4, marginTop: 1 }}>
            RNC: {identificacion}
          </div>
        )}
      </div>
    </div>
  );
};

export default EntidadColumnCell;
