import React from 'react';

interface GenesisLogoProps {
  size?: number;
  color?: string;
  showText?: boolean;
  dark?: boolean;
}

const GenesisLogo: React.FC<GenesisLogoProps> = ({ size = 30, showText = true, dark = false }) => {
  const boxSize = Math.max(size, 28);
  const fontSize = boxSize * 0.5;
  const textSize = Math.max(size * 0.65, 16);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: boxSize,
          height: boxSize,
          background: 'linear-gradient(135deg, #6c5ffc, #9b8cff)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 700,
          fontSize,
          boxShadow: '0 3px 8px rgba(108,95,252,0.3)',
          flexShrink: 0,
        }}
      >
        G
      </div>
      {showText && (
        <span
          style={{
            fontSize: textSize,
            fontWeight: 700,
            color: dark ? '#ffffff' : '#1e1e2d',
            letterSpacing: '-0.5px',
          }}
        >
          enesis
        </span>
      )}
    </div>
  );
};

export default GenesisLogo;
