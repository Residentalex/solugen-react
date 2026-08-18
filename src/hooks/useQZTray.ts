import { useState, useCallback, useEffect, useRef } from 'react';

/** Global QZ Tray object loaded from local script */
declare var qz: any;

// ===== Fuentes del script QZ Tray (en orden de preferencia) =====
const QZ_SCRIPT_SOURCES = [
  '/qz-tray.js',                            // 1. Local (public/ del proyecto) — más confiable
  'http://localhost:4244/qz-2.2.min.js',    // 2. Servidor embebido QZ Tray
  'https://files.qz.io/2.2/qz-2.2.min.js', // 3. CDN alternativa de QZ
  'https://qz.io/api/2.2/qz-2.2.min.js',   // 4. CDN original (puede no funcionar)
];

export interface UseQZTrayReturn {
  /** Imprime el texto ESC/POS en la impresora POS via QZ Tray. `logoBase64` opcional: comando GS v 0 (base64) que se imprime antes del texto. */
  print: (text: string, logoBase64?: string) => Promise<void>;
  /** Imprime un PDF en la impresora POS via QZ Tray (lo renderiza como imagen) */
  printPDF: (pdfBlob: Blob) => Promise<void>;
  /** Obtiene la lista de impresoras disponibles desde QZ Tray */
  fetchPrinters: () => Promise<string[]>;
  /** Guarda la impresora seleccionada en localStorage */
  selectPrinter: (name: string) => void;
  /** Indica si QZ Tray esta conectado y listo */
  ready: boolean;
  /** Ultimo error (null si no hay error) */
  error: string | null;
  /** Nombre de la impresora seleccionada (null si aun no se selecciono) */
  printerName: string | null;
  /** Lista de impresoras disponibles */
  availablePrinters: string[];
}

const STORAGE_KEY = 'qz_printer_name';

// ===== Carga del script QZ Tray (singleton a nivel de modulo) =====
let qzScriptLoaded = false;
let qzScriptLoading = false;
let qzLoadCallbacks: Array<() => void> = [];
let lastScriptError: string | null = null;

function loadQZScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Si ya está cargado y activo, resolver inmediatamente
    if (typeof qz !== 'undefined' && qz?.websocket?.isActive?.()) {
      resolve();
      return;
    }
    if (qzScriptLoaded) {
      resolve();
      return;
    }

    qzLoadCallbacks.push(resolve);
    if (qzScriptLoading) return; // Ya se está cargando

    qzScriptLoading = true;
    let currentIndex = 0;

    function tryLoadNext() {
      if (currentIndex >= QZ_SCRIPT_SOURCES.length) {
        // Todas las fuentes fallaron
        qzScriptLoading = false;
        qzLoadCallbacks = [];
        const msg =
          lastScriptError ||
          'No se pudo cargar la librería de QZ Tray desde ninguna fuente. ' +
          'Verifica que QZ Tray esté instalado y corriendo.';
        reject(new Error(msg));
        return;
      }

      const url = QZ_SCRIPT_SOURCES[currentIndex];
      const script = document.createElement('script');
      script.src = url;
      script.async = true;

      script.onload = () => {
        qzScriptLoaded = true;
        qzScriptLoading = false;
        qzLoadCallbacks.forEach((cb) => cb());
        qzLoadCallbacks = [];
      };

      script.onerror = () => {
        lastScriptError = `No se pudo cargar desde: ${url}`;
        currentIndex++;
        document.head.removeChild(script);
        tryLoadNext();
      };

      document.head.appendChild(script);
    }

    tryLoadNext();
  });
}

/**
 * Hook para imprimir tickets POS via QZ Tray.
 *
 * QZ Tray es un plugin de escritorio (6MB) que se comunica via websocket
 * con localhost y permite enviar comandos ESC/POS a cualquier impresora.
 *
 * - El script de QZ se carga localmente (no requiere internet).
 * - QZ Tray debe estar instalado y corriendo en la PC del usuario.
 * - Si QZ no está corriendo, qz.websocket.connect() lanzará error.
 * - La conexión es persistente (no reconectar en cada impresión).
 * - Al desmontar el componente, se desconecta.
 */
export function useQZTray(): UseQZTrayReturn {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printerName, setPrinterName] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const connectedRef = useRef(false);

  const fetchPrinters = useCallback(async (): Promise<string[]> => {
    await loadQZScript();
    if (!connectedRef.current) {
      const isSecure = window.location.protocol === 'https:';
      await qz.websocket.connect({
        host: ['localhost'],
        usingSecure: isSecure,
        port: isSecure
          ? { secure: [8181, 8282, 8383, 8484] }
          : { insecure: [8182, 8283, 8384, 8485] },
      });
      connectedRef.current = true;
      setReady(true);
    }
    const printers: string[] = await qz.printers.find();
    setAvailablePrinters(printers);
    return printers;
  }, []);

  const selectPrinter = useCallback((name: string) => {
    localStorage.setItem(STORAGE_KEY, name);
    setPrinterName(name);
  }, []);

  const print = useCallback(async (text: string, logoBase64?: string) => {
    try {
      // Verificar si hay una impresora seleccionada
      const name = printerName || localStorage.getItem(STORAGE_KEY);
      if (!name) {
        const err = new Error('NO_PRINTER_SELECTED') as any;
        err.code = 'NO_PRINTER_SELECTED';
        throw err;
      }

      // Asegurar que el script de QZ esté cargado
      await loadQZScript();

      // Conectar con QZ Tray (si no está conectado)
      if (!connectedRef.current) {
        // Detectar automáticamente si usar conexión segura o insegura
        const isSecure = window.location.protocol === 'https:';
        await qz.websocket.connect({
          host: ['localhost'],
          usingSecure: isSecure,
          port: isSecure
            ? { secure: [8181, 8282, 8383, 8484] }
            : { insecure: [8182, 8283, 8384, 8485] },
        });
        connectedRef.current = true;
        setReady(true);
      }

      // Configurar impresión con la impresora guardada
      const config = qz.configs.create(name);

      // El texto ya incluye comandos ESC/POS (init, formato, corte) desde el formateador.
      // El logo (GS v 0) supera 127 en sus bytes, por eso va como base64; el texto sigue como plain.
      const data = logoBase64
        ? [
            { type: 'raw', format: 'base64', data: logoBase64 },
            { type: 'raw', format: 'plain', data: text },
          ]
        : [{ type: 'raw', format: 'plain', data: text }];

      await qz.print(config, data);
      setError(null);
    } catch (err: any) {
      // Si ya es el error especial, relanzar sin modificar
      if (err.code === 'NO_PRINTER_SELECTED') throw err;
      const msg = err.message || 'Error al imprimir con QZ Tray';
      setError(msg);
      throw err;
    }
  }, [printerName]);

  const printPDF = useCallback(async (pdfBlob: Blob) => {
    try {
      // Verificar si hay impresora seleccionada
      const name = printerName || localStorage.getItem(STORAGE_KEY);
      if (!name) {
        const err = new Error('NO_PRINTER_SELECTED') as any;
        err.code = 'NO_PRINTER_SELECTED';
        throw err;
      }

      // Asegurar que el script de QZ esté cargado
      await loadQZScript();

      // Conectar con QZ Tray (si no está conectado)
      if (!connectedRef.current) {
        await qz.websocket.connect({
          host: ['localhost'],
          usingSecure: false,
          port: { insecure: [8182, 8283, 8384, 8485] },
        });
        connectedRef.current = true;
        setReady(true);
      }

      // Convertir Blob a base64
      const buffer = await pdfBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      // Configurar impresión optimizada para POS térmica
      const config = qz.configs.create(name, {
        density: 203,              // DPI máximo de impresora POS
        units: 'mm',               // Usar milímetros para mejor precisión
        margins: 0,                // Sin márgenes
        rasterize: false,          // QZ ya renderiza el PDF
        size: { width: 80, height: 200 },  // Ancho rollo 80mm
      });
      const data = [{ type: 'pixel', format: 'pdf', flavor: 'base64', data: base64 }];
      await qz.print(config, data);
      setError(null);
    } catch (err: any) {
      if (err.code === 'NO_PRINTER_SELECTED') throw err;
      const msg = err.message || 'Error al imprimir PDF con QZ Tray';
      setError(msg);
      throw err;
    }
  }, [printerName]);

  // Limpiar conexión al desmontar
  useEffect(() => {
    return () => {
      if (connectedRef.current) {
        try {
          qz.websocket.disconnect();
        } catch {
          /* ignora error al desconectar */
        }
        connectedRef.current = false;
      }
    };
  }, []);

  return { print, printPDF, fetchPrinters, selectPrinter, ready, error, printerName, availablePrinters };
}
