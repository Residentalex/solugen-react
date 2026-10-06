import { useCallback, useState } from 'react';
import { message } from 'antd';
import IncidenciaDrawer from '../components/IncidenciaDrawer';
import { capturarPantalla } from '../utils/capturaPantalla';
import type { CapturaPantalla } from '../utils/capturaPantalla';

export function useReporteIncidencia(moduloActual?: string) {
  const [abierto, setAbierto] = useState(false);
  const [capturando, setCapturando] = useState(false);
  const [captura, setCaptura] = useState<CapturaPantalla | null>(null);

  const ejecutarCaptura = useCallback(async () => {
    setCapturando(true);
    try {
      const resultado = await capturarPantalla();
      setCaptura(resultado);
      setAbierto(true);
      if (!resultado) {
        message.warning('No se pudo capturar la pantalla. Puedes enviar el ticket de todos modos.');
      }
    } catch (err) {
      console.error('Error al capturar pantalla', err);
      message.warning('No se pudo capturar la pantalla. Puedes enviar el ticket de todos modos.');
      setCaptura(null);
      setAbierto(true);
    } finally {
      setCapturando(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    setAbierto(false);
    setCaptura(null);
  }, []);

  const handleQuitarCaptura = useCallback(() => setCaptura(null), []);

  const drawer = (
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
  );

  return { drawer, capturando, abrir: ejecutarCaptura };
}

export default useReporteIncidencia;
