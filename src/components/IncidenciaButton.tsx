import React from 'react';
import { Tooltip } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import useReporteIncidencia from '../hooks/useReporteIncidencia';

interface Props {
  moduloActual?: string;
}

const IncidenciaButton: React.FC<Props> = ({ moduloActual }) => {
  const { drawer, capturando, abrir } = useReporteIncidencia(moduloActual);

  return (
    <>
      <Tooltip title="Reportar incidencia">
        <button
          className="paces-topbar-action-btn"
          title="Reportar incidencia"
          aria-label="Reportar incidencia"
          disabled={capturando}
          onClick={abrir}
        >
          <WarningOutlined style={{ fontSize: 16 }} />
        </button>
      </Tooltip>

      {drawer}
    </>
  );
};

export default IncidenciaButton;
