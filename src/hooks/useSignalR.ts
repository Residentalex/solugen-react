import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';

export interface ProgresoEvento {
  jobId: string;
  paso: string;
  progreso: number;
  mensaje: string;
  exito?: boolean;
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4003/api';
const hubUrl = apiUrl.replace(/\/api$/, '') + '/hubs/posteo';

export function useSignalR(jobId: string | null) {
  const [conectado, setConectado] = useState(false);
  const [eventos, setEventos] = useState<ProgresoEvento[]>([]);
  const [completado, setCompletado] = useState<{ exito: boolean; error?: string } | null>(null);

  useEffect(() => {
    if (!jobId) return;

    // Resetear estado para un nuevo job
    setConectado(false);
    setEventos([]);
    setCompletado(null);

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();

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
      setCompletado({ exito: data.exito, error: data.error });
      setEventos(prev => [...prev, {
        jobId: data.jobId,
        paso: data.exito ? '✅ Completado' : '❌ Error',
        progreso: 100,
        mensaje: data.error || '',
      }]);
    });

    connection.start()
      .then(async () => {
        await connection.invoke('SuscribirPosteo', jobId);
        setConectado(true);
      })
      .catch(() => {
        setCompletado({ exito: false, error: 'Error de conexión con el servidor' });
      });

    return () => {
      connection.stop();
    };
  }, [jobId]);

  return { conectado, eventos, completado };
}
