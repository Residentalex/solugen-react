import { useState, useCallback, useEffect, useRef } from 'react';
import { message } from 'antd';
import * as signalR from '@microsoft/signalr';
import { apiClient } from '../api/client';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4003/api';
const hubUrl = apiUrl.replace(/\/api$/, '') + '/hubs/posteo';

/** Tiempo máximo de espera para una operación (5 minutos) antes de considerar fallo */
const TIMEOUT_OPERACION_MS = 5 * 60 * 1000;

export interface ProgresoEvento {
  jobId: string;
  paso: string;
  progreso: number;
  mensaje: string;
  exito?: boolean;
}

export function useAplicar() {
  const [loading, setLoading] = useState(false);
  const [eventos, setEventos] = useState<ProgresoEvento[]>([]);
  const [completado, setCompletado] = useState<{ exito: boolean; error?: string } | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const [conectado, setConectado] = useState(false);
  const callbackRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completadoRef = useRef<boolean>(false);
  const loadingRef = useRef<boolean>(false);

  // Mantener loadingRef sincronizado para que los closures de SignalR tengan el valor actual
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  // Limpiar timeout de seguridad
  const limpiarTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Marcar la operación como fallida por pérdida de conexión
  const marcarErrorConexion = useCallback((errorMsg?: string) => {
    if (completadoRef.current) return;
    completadoRef.current = true;
    setCompletado({
      exito: false,
      error: errorMsg || 'Se perdió la conexión con el servidor. La operación puede haber quedado incompleta.',
    });
    setEventos(prev => [...prev, {
      jobId: '',
      paso: 'Error de conexión',
      progreso: 0,
      mensaje: errorMsg || 'Conexión perdida',
    }]);
    setLoading(false);
    limpiarTimeout();
  }, [limpiarTimeout]);

  // Conectar SignalR una vez al montar el hook
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build();

    connection.onreconnecting(() => {
      console.warn('[SignalR useAplicar] Reconectando...');
    });

    connection.onreconnected(() => {
      console.log('[SignalR useAplicar] Reconectado');
    });

    connection.onclose(() => {
      console.warn('[SignalR useAplicar] Conexión cerrada definitivamente');
      setConectado(false);
      // Si había una operación en curso, marcarla como fallida
      // Usamos loadingRef en vez de loading para evitar stale closure
      if (loadingRef.current || !completadoRef.current) {
        marcarErrorConexion('El servidor dejó de responder. La operación se ha interrumpido.');
      }
    });

    connection.on('AplicarIniciado', (data: any) => {
      setEventos([{ paso: 'Iniciando...', progreso: 0, mensaje: '', jobId: data.jobId }]);
    });

    connection.on('AplicarProgreso', (data: any) => {
      setEventos(prev => [...prev, {
        jobId: data.jobId,
        paso: data.paso,
        progreso: data.progreso,
        mensaje: data.mensaje,
      }]);
    });

    connection.on('AplicarCompletado', (data: any) => {
      completadoRef.current = true;
      setCompletado(prev => {
        // Evitar duplicados - si ya se estableció completado, ignorar
        if (prev) return prev;
        return { exito: data.exito, error: data.errorMessage };
      });
      setEventos(prev => [...prev, {
        jobId: data.jobId,
        paso: data.exito ? 'Completado' : 'Error',
        progreso: 100,
        mensaje: data.errorMessage || '',
      }]);
      limpiarTimeout();
    });

    connection.start()
      .then(() => setConectado(true))
      .catch((err) => {
        console.warn('[SignalR useAplicar] Error inicial de conexión, se reintentará automáticamente:', err);
      });

    connectionRef.current = connection;

    return () => {
      limpiarTimeout();
      connection.stop();
    };
  }, [marcarErrorConexion, limpiarTimeout]);

  const ejecutar = useCallback(async (url: string, onCompletado?: () => void, body?: any) => {
    setLoading(true);
    loadingRef.current = true;
    setEventos([]);
    setCompletado(null);
    completadoRef.current = false;
    callbackRef.current = onCompletado || null;

    // Timeout de seguridad: si la operación no se completa en X tiempo, forzar error
    limpiarTimeout();
    timeoutRef.current = setTimeout(() => {
      if (!completadoRef.current) {
        console.warn('[SignalR useAplicar] Timeout de operación alcanzado');
        marcarErrorConexion('La operación tardó demasiado en completarse. Verifique el estado del servidor.');
      }
    }, TIMEOUT_OPERACION_MS);

    // Esperar conexión SignalR con reintento
    const conn = connectionRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) {
      let intentos = 0;
      const maxIntentos = 5;
      while (intentos < maxIntentos) {
        try {
          await conn?.start();
          setConectado(true);
          break;
        } catch (err) {
          intentos++;
          console.warn(`[SignalR useAplicar] Intento ${intentos}/${maxIntentos} de conexión fallido`);
          if (intentos >= maxIntentos) {
            limpiarTimeout();
            setCompletado({ exito: false, error: 'Error de conexión con el servidor después de varios intentos' });
            setLoading(false);
            return;
          }
          await new Promise(r => setTimeout(r, 2000 * intentos));
        }
      }
    }

    try {
      const { data } = body
        ? await apiClient.post(url, body)
        : await apiClient.put(url);
      if (data?.isSuccess && data?.data?.jobId) {
        const jobId = data.data.jobId;
        await conn!.invoke('SuscribirPosteo', jobId);
      } else if (data?.isSuccess) {
        limpiarTimeout();
        completadoRef.current = true;
        setCompletado({ exito: true });
        setLoading(false);
        callbackRef.current?.();
        callbackRef.current = null;
      } else {
        throw new Error(data?.errorMessage || 'Error al iniciar operación');
      }
    } catch (err: any) {
      limpiarTimeout();
      const msg = err?.response?.data?.errorMessage || err?.message || 'Error al iniciar operación';
      setCompletado({ exito: false, error: msg });
      setLoading(false);
    }
  }, [marcarErrorConexion, limpiarTimeout]);

  useEffect(() => {
    if (completado) {
      setLoading(false);
      if (completado.exito) {
        message.success('Operación completada exitosamente');
        callbackRef.current?.();
        callbackRef.current = null;
      }
      // El error se muestra en el ModalProgreso, no es necesario message.error()
    }
  }, [completado]);

  const reset = useCallback(() => {
    setEventos([]);
    setCompletado(null);
    setLoading(false);
    completadoRef.current = false;
    callbackRef.current = null;
    limpiarTimeout();
  }, [limpiarTimeout]);

  return { loading, eventos, completado, ejecutar, reset };
}
