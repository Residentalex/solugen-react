import { useState, useCallback, useEffect } from 'react';
// ===== Puerto compartido a nivel de modulo =====
// Persiste entre renders del mismo componente y entre componentes diferentes
let sharedPort = null;
/**
 * Hook para imprimir en impresoras POS termicas via Web Serial API (ESC/POS).
 *
 * - Solo funciona en Chrome / Edge 89+ con HTTPS (localhost tambien funciona).
 * - Fallback transparente: si Web Serial no esta disponible,
 *   `connect()` y `print()` lanzan error que debe capturarse para caer a PDF.
 * - El puerto se comparte a nivel de modulo (una unica conexion para toda la app).
 */
export function useSerialPrinter() {
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState(null);
    // Sincronizar estado con el puerto compartido al montar
    useEffect(() => {
        if (sharedPort) {
            try {
                setConnected(sharedPort.writable !== null);
            }
            catch {
                sharedPort = null;
                setConnected(false);
            }
        }
    }, []);
    const obtenerSerial = useCallback(() => {
        const nav = navigator;
        if (typeof nav.serial === 'undefined' || typeof nav.serial.requestPort !== 'function') {
            return null;
        }
        return nav.serial;
    }, []);
    const connect = useCallback(async () => {
        const serial = obtenerSerial();
        if (!serial) {
            const msg = 'Web Serial API no está disponible. Usa Chrome o Edge con HTTPS.';
            setError(msg);
            setConnected(false);
            throw new Error(msg);
        }
        setConnecting(true);
        setError(null);
        try {
            const port = await serial.requestPort();
            // Intentar con varios baudRates (el orden importa: 9600 es el más común, luego variantes)
            const baudRates = [9600, 19200, 38400, 115200, 57600, 4800];
            let opened = false;
            let lastError = null;
            for (const rate of baudRates) {
                try {
                    const TIMEOUT_MS = 5000; // 5 segundos por intento
                    const openPromise = port.open({
                        baudRate: rate,
                        dataBits: 8,
                        stopBits: 1,
                        parity: 'none',
                    });
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout (${rate} baud)`)), TIMEOUT_MS));
                    await Promise.race([openPromise, timeoutPromise]);
                    opened = true;
                    console.log(`Puerto abierto exitosamente a ${rate} baud`);
                    break; // Salir del bucle, éxito
                }
                catch (err) {
                    lastError = err.message || `Error con baudRate ${rate}`;
                    // Intentar cerrar si quedó abierto (ignorar error)
                    try {
                        await port.close();
                    }
                    catch { /* ignora error al cerrar tras fallo */ }
                }
            }
            if (!opened) {
                throw new Error(`No se pudo abrir el puerto. Probados: ${baudRates.join(', ')}. Último error: ${lastError}`);
            }
            sharedPort = port;
            setConnected(true);
        }
        catch (err) {
            if (err.name === 'NotFoundError' || err.code === 8) {
                const msg = 'No se seleccionó ningún puerto.';
                setError(msg);
            }
            else {
                setError(err.message || 'Error al conectar con la impresora.');
            }
            setConnected(false);
            throw err;
        }
        finally {
            setConnecting(false);
        }
    }, [obtenerSerial]);
    const disconnect = useCallback(async () => {
        if (sharedPort) {
            try {
                await sharedPort.close();
            }
            catch {
                // Ignorar errores al cerrar
            }
            sharedPort = null;
            setConnected(false);
            setError(null);
        }
    }, []);
    const print = useCallback(async (text) => {
        if (!sharedPort) {
            const msg = 'Impresora no conectada. Conecta primero.';
            setError(msg);
            throw new Error(msg);
        }
        const writer = sharedPort.writable?.getWriter();
        if (!writer) {
            const msg = 'No se pudo obtener acceso de escritura al puerto.';
            setError(msg);
            throw new Error(msg);
        }
        try {
            const encoder = new TextEncoder();
            const textBytes = encoder.encode(text);
            // Comandos ESC/POS
            const CMD_INIT = new Uint8Array([0x1B, 0x40]); // ESC @ — inicializar impresora
            const CMD_FEED = new Uint8Array([0x1B, 0x64, 0x04]); // ESC d 4 — avanzar 4 líneas
            const CMD_CUT = new Uint8Array([0x1B, 0x56, 0x41]); // ESC V A — corte (más universal)
            // Alternativa: const CMD_CUT = new Uint8Array([0x1B, 0x6D]); // ESC m — corte parcial
            // Combinar todo en un solo buffer
            const totalLength = CMD_INIT.length + textBytes.length + CMD_FEED.length + CMD_CUT.length;
            const payload = new Uint8Array(totalLength);
            let offset = 0;
            payload.set(CMD_INIT, offset);
            offset += CMD_INIT.length;
            payload.set(textBytes, offset);
            offset += textBytes.length;
            payload.set(CMD_FEED, offset);
            offset += CMD_FEED.length;
            payload.set(CMD_CUT, offset);
            // Timeout de 10 segundos para evitar cuelgues
            const TIMEOUT_MS = 10000;
            const writePromise = writer.write(payload);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: la impresora no respondió en 10s')), TIMEOUT_MS));
            await Promise.race([writePromise, timeoutPromise]);
            await writer.close(); // Forzar flush — esto hace que se envíen los datos realmente
        }
        catch (err) {
            const msg = err.message || 'Error de escritura en el puerto serial.';
            setError(msg);
            throw err;
        }
        finally {
            try {
                writer.releaseLock();
            }
            catch { /* ignora error al liberar lock */ }
        }
    }, []);
    return { connect, disconnect, print, connected, connecting, error };
}
