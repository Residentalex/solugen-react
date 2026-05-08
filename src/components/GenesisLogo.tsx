import React from 'react';

interface GenesisLogoProps {
  size?: number;
  color?: string;
  showText?: boolean;
}

const GenesisLogo: React.FC<GenesisLogoProps> = ({ size = 30, color = '#556ee6', showText = true }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(135deg, #556ee6, #3645b3)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 700,
          fontSize: size * 0.55,
          boxShadow: '0 2px 6px rgba(85,110,230,0.3)',
          flexShrink: 0,
        }}
      >
        G
      </div>
      {showText && (
        <span style={{ fontSize: size * 0.6, fontWeight: 600, color }}>
          enesis
        </span>
      )}
    </div>
  );
};

export default GenesisLogo;
