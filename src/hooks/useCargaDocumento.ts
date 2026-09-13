import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { extraerMensajeError } from '../utils/formats';

/** Definicion de una seccion de documento que se carga junto al encabezado */
export interface SeccionDocumentoDef {
  /** Trae los datos de la seccion (aplicar transformaciones aqui si aplica) */
  cargar: (sucursal: number, id: number) => Promise<any>;
  /** Propiedad del documento donde se mergea el resultado */
  prop: string;
}

export interface UseCargaDocumentoOptions<TEnc> {
  /** ID del documento (useParams) */
  id?: string;
  /** Sucursal activa */
  sucursal: number;
  /** Obtiene el encabezado del documento */
  obtenerEncabezado: (sucursal: number, id: number) => Promise<TEnc | null>;
  /**
   * Secciones que se cargan automaticamente despues del encabezado
   * (detalles, asientos, cobros, impuestos, relacionados, vouchers, etc.)
   */
  secciones?: Record<string, SeccionDocumentoDef>;
  /** Callback tras recibir el encabezado (titulo, reverso, scan, DGII, etc.) */
  onEncabezadoCargado?: (enc: TEnc) => void;
  /** Mensaje cuando el documento no existe */
  mensajeNoEncontrado?: string;
}

/**
 * Patron estandar de carga de documentos transaccionales:
 * 1. Encabezado primero (pinta el documento de inmediato).
 * 2. Todas las secciones en paralelo y automatico (sin clics del usuario),
 *    con guards anti doble fetch y refs pendientes para la carrera
 *    "seccion llega antes que el encabezado".
 *
 * Reemplaza el par cargarEncabezado()/cargarSeccion() replicado en los detalles.
 */
export function useCargaDocumento<TEnc>(options: UseCargaDocumentoOptions<TEnc>) {
  const {
    id,
    sucursal,
    obtenerEncabezado,
    secciones = {},
    onEncabezadoCargado,
    mensajeNoEncontrado = 'Documento no encontrado en la sucursal seleccionada.',
  } = options;

  const [data, setData] = useState<TEnc | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [seccionesCargando, setSeccionesCargando] = useState<Set<string>>(new Set());

  // Guards anti doble fetch por seccion
  const cargadasRef = useRef<Set<string>>(new Set());
  // Resultados de secciones que llegaron antes que el encabezado
  const pendientesRef = useRef<Record<string, any>>({});

  const aplicarResultado = useCallback((prop: string, resultado: any) => {
    setData(prev => {
      if (!prev) {
        // El encabezado aun no llego: guardar para aplicarlo al crear data
        pendientesRef.current[prop] = resultado;
        return prev;
      }
      return { ...prev, [prop]: resultado };
    });
  }, []);

  const cargarSeccionInterna = useCallback(async (nombre: string, def: SeccionDocumentoDef, forzar = false) => {
    if (!id) return;
    // Guard anti doble fetch ANTES de cualquier setState
    if (!forzar && cargadasRef.current.has(nombre)) return;
    cargadasRef.current.add(nombre);
    setSeccionesCargando(prev => new Set(prev).add(nombre));
    try {
      const resultado = await def.cargar(sucursal, parseInt(id));
      aplicarResultado(def.prop, resultado);
    } catch (err: any) {
      cargadasRef.current.delete(nombre);
      message.error(extraerMensajeError(err, `Error al cargar ${def.prop}`));
    } finally {
      setSeccionesCargando(prev => {
        const next = new Set(prev);
        next.delete(nombre);
        return next;
      });
    }
  }, [id, sucursal, aplicarResultado]);

  /** Encabezado primero + todas las secciones en paralelo */
  const cargarTodo = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadingError(false);
    try {
      const res = await obtenerEncabezado(sucursal, parseInt(id));
      if (!res) {
        message.error(mensajeNoEncontrado);
        setLoadingError(true);
        return;
      }
      setData(prev => {
        const merged: any = { ...(prev ?? {}), ...res };
        // Aplicar secciones que llegaron antes que el encabezado
        for (const def of Object.values(secciones)) {
          if (pendientesRef.current[def.prop] !== undefined) {
            merged[def.prop] = pendientesRef.current[def.prop];
            delete pendientesRef.current[def.prop];
          }
        }
        return merged;
      });
      onEncabezadoCargado?.(res);
    } catch (err: any) {
      message.error(extraerMensajeError(err, 'Error al cargar el documento'));
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
    // Todas las secciones, siempre, sin interaccion del usuario
    Object.entries(secciones).forEach(([nombre, def]) => {
      cargarSeccionInterna(nombre, def);
    });
  }, [id, sucursal, obtenerEncabezado, secciones, onEncabezadoCargado, mensajeNoEncontrado, cargarSeccionInterna]);

  /** Recarga completa: limpia guards y vuelve a traer encabezado + secciones */
  const recargar = useCallback(() => {
    cargadasRef.current.clear();
    pendientesRef.current = {};
    cargarTodo();
  }, [cargarTodo]);

  /** Reintenta una seccion aunque ya este marcada como cargada */
  const reintentarSeccion = useCallback((nombre: string) => {
    const def = secciones[nombre];
    if (!def) return;
    cargadasRef.current.delete(nombre);
    cargarSeccionInterna(nombre, def, true);
  }, [secciones, cargarSeccionInterna]);

  // Montaje / cambio de documento o sucursal
  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sucursal]);

  return {
    data,
    setData,
    loading,
    loadingError,
    seccionesCargando,
    cargarTodo,
    recargar,
    reintentarSeccion,
  };
}
