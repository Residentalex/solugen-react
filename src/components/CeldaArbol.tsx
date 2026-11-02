import React from 'react';
import { CaretRightOutlined } from '@ant-design/icons';

export interface CeldaArbolProps {
  nivel?: number;
  tieneHijos?: boolean;
  expandido?: boolean;
  onToggle?: () => void;
  icono?: React.ReactNode;
  children: React.ReactNode;
}

const CeldaArbol: React.FC<CeldaArbolProps> = ({ nivel = 0, tieneHijos, expandido, onToggle, icono, children }) => (
  <span className={`paces-tree-cell${expandido ? ' paces-tree-cell--abierto' : ''}`}>
    {Array.from({ length: Math.max(0, nivel) }).map((_, i) => (
      <span key={i} className="paces-tree-gap" />
    ))}
    <span className={`paces-tree-toggle${nivel > 0 ? ' paces-tree-toggle--hijo' : ''}`}>
      {tieneHijos ? (
        <CaretRightOutlined
          className="paces-tree-caret"
          rotate={expandido ? 90 : 0}
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
        />
      ) : null}
    </span>
    {icono ? <span className="paces-tree-icono">{icono}</span> : null}
    <span className="paces-tree-texto">{children}</span>
  </span>
);

export default CeldaArbol;
