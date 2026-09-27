import React, { useCallback, useState } from 'react';
import { Tooltip, message } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import IncidenciaDrawer from './IncidenciaDrawer';
import { capturarPantalla } from '../utils/capturaPantalla';
import type { CapturaPantalla } from '../utils/capturaPantalla';

interface Props {
  moduloActual?: string;
}

const IncidenciaButton: React.FC<Props> = ({ moduloActual }) => {
  const [abierto, setAbierto] = useState(false);
  const [capturando, setCapturando] = useState(false);
  const [captura, setCaptura] = useState<CapturaPantalla | null>(null);

  const ejecutarCaptura = useCallback(async () => {
    setCapturando(true);
    try {
      const resultado = await capturarPantalla();
      if (!resultado) {
        message.warning('No se pudo capturar la pantalla.');
        return;
      }
      setCaptura(resultado);
      setAbierto(true);
    } catch (err) {
      console.error('Error al capturar pantalla', err);
      message.error('Error al capturar la pantalla.');
    } finally {
      setCapturando(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    setAbierto(false);
    setCaptura(null);
  }, []);

  const handleQuitarCaptura = useCallback(() => setCaptura(null), []);

  return (
    <>
      <Tooltip title="Reportar incidencia">
        <button
          className="paces-topbar-action-btn"
          title="Reportar incidencia"
          aria-label="Reportar incidencia"
          disabled={capturando}
          onClick={ejecutarCaptura}
        >
          <WarningOutlined style={{ fontSize: 16 }} />
        </button>
      </Tooltip>

      <IncidenciaDrawer
        open={abierto}
        captura={captura}
        capturando={capturando}
        moduloActual={moduloActual}
        onClose={handleClose}
        onRecapturar={ejecutarCaptura}
        onQuitarCaptura={handleQuitarCaptura}
        onCreado={handleClose}
      />
    </>
  );
};

export default IncidenciaButton;
