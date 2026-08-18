import React from 'react';
import { Card, Tag } from 'antd';
import type { MonitoreoCajaDTO } from '../../types/monitoreo';

interface CajaCardProps {
  caja: MonitoreoCajaDTO;
  onClick: (caja: MonitoreoCajaDTO) => void;
}

const CajaCard: React.FC<CajaCardProps> = ({ caja, onClick }) => {
  return (
    <Card
      hoverable
      className="paces-card"
      style={{
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
      }}
      styles={{
        body: { padding: 16 },
      }}
      onClick={() => onClick(caja)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Indicador de estado */}
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: caja.conectado ? '#52c41a' : '#ff4d4f',
            flexShrink: 0,
            marginTop: 4,
            boxShadow: caja.conectado
              ? '0 0 6px rgba(82, 196, 26, 0.6)'
              : '0 0 6px rgba(255, 77, 79, 0.6)',
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Nombre */}
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: '#1a1a2e',
              marginBottom: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {caja.nombre}
          </div>

          {/* IP */}
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              color: '#8c8c8c',
              marginBottom: 6,
            }}
          >
            {caja.ip}
          </div>

          {/* Versión + No. Caja */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Tag
              style={{
                fontSize: 11,
                lineHeight: '18px',
                padding: '0 6px',
                borderRadius: 4,
                margin: 0,
              }}
              color={caja.conectado ? 'green' : 'red'}
            >
              v{caja.version}
            </Tag>
            <span style={{ fontSize: 11, color: '#8c8c8c' }}>
              No. {caja.noCaja}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CajaCard;
