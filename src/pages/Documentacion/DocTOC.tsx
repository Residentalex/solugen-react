import React, { useState, useEffect } from 'react';
import { Anchor, Typography } from 'antd';

const { Text } = Typography;

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

interface DocTOCProps {
  headings: TocHeading[];
}

const DocTOC: React.FC<DocTOCProps> = ({ headings }) => {
  if (!headings || headings.length === 0) return null;

  return (
    <div className="doc-toc">
      <Text strong style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 12, color: 'var(--paces-text-secondary)' }}>
        En esta página
      </Text>
      <div className="doc-toc-list">
        {headings.map((h) => (
          <a
            key={h.id}
            href={`#${h.id}`}
            className={`doc-toc-item doc-toc-level-${h.level}`}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(h.id);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Actualizar URL sin recargar
                window.history.replaceState(null, '', `#${h.id}`);
              }
            }}
          >
            {h.text}
          </a>
        ))}
      </div>
    </div>
  );
};

export default DocTOC;
