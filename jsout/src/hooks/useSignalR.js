import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4003/api';
const hubUrl = apiUrl.replace(/\/api$/, '') + '/hubs/posteo';
export function useSignalR(jobId) {
    const [conectado, setConectado] = useState(false);
    const [eventos, setEventos] = useState([]);
    const [completado, setCompletado] = useState(null);
    useEffect(() => {
        if (!jobId)
            return;
        // Resetear estado para un nuevo job
        setConectado(false);
        setEventos([]);
        setCompletado(null);
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl)
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Warning)
            .build();
        connection.on('AplicarIniciado', (data) => {
            setEventos([{ paso: 'Iniciando...', progreso: 0, mensaje: '', jobId: data.jobId }]);
        });
        connection.on('AplicarProgreso', (data) => {
            setEventos(prev => [...prev, {
                    jobId: data.jobId,
                    paso: data.paso,
                    progreso: data.progreso,
                    mensaje: data.mensaje,
                }]);
        });
        connection.on('AplicarCompletado', (data) => {
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
