import { useState, useEffect, useRef, useCallback } from 'react';
import { message } from 'antd';
import { preferenciaUsuarioApi } from '../api/preferenciaUsuarioApi';
import type { ColumnConfig } from '../components/ColumnVisibilityToggle';

interface UseColumnasVisiblesParams {
  pantalla: string;
  columns: ColumnConfig[];
  clave?: string;
  legacyStorageKey?: string;
}

interface UseColumnasVisiblesResult {
  visibleKeys: string[];
  setVisibleKeys: (keys: string[]) => void;
  loading: boolean;
}

/**
 * Anexa al listado guardado las columnas nuevas marcadas como visibles por
 * defecto, sin pisar las que el usuario haya ocultado explicitamente.
 */
function fusionarColumnasVisibles(columns: ColumnConfig[], guardadas: string[]): string[] {
  const validas = new Set(columns.map((c) => c.key));
  const guardadasValidas = guardadas.filter((k) => validas.has(k));
  const faltantes = columns
    .filter((c) => c.defaultVisible !== false && !guardadasValidas.includes(c.key))
    .map((c) => c.key);
  return [...guardadasValidas, ...faltantes];
}

/** Intenta interpretar `valor` como un JSON array de strings. Devuelve null si no es valido. */
function parsearJsonArray(valor: string | null | undefined): string[] | null {
  if (!valor) return null;
  try {
    const parsed = JSON.parse(valor);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

const DEBOUNCE_MS = 600;

/**
 * Gestiona la visibilidad de columnas de una pantalla persistiendola en la API
 * (PreferenciaUsuario, clave `columnas`). localStorage solo se usa como
 * migracion one-shot desde una clave legacy.
 */
export function useColumnasVisibles({
  pantalla,
  columns,
  clave = 'columnas',
  legacyStorageKey,
}: UseColumnasVisiblesParams): UseColumnasVisiblesResult {
  const [visibleKeys, setVisibleKeysState] = useState<string[]>(() =>
    columns.filter((c) => c.defaultVisible !== false).map((c) => c.key),
  );
  const [loading, setLoading] = useState(true);
  const cargadoRef = useRef(false);
  const cambioUsuarioRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendienteRef = useRef<string[] | null>(null);

  // `columns` puede declararse inline en cada pantalla; usar una firma estable
  // evita recargar la preferencia en cada render.
  const columnsRef = useRef(columns);
  columnsRef.current = columns;
  const columnsSignature = columns
    .map((c) => `${c.key}:${c.defaultVisible !== false ? 1 : 0}`)
    .join('|');

  // Carga inicial (o al cambiar pantalla/clave)
  useEffect(() => {
    let activo = true;
    cargadoRef.current = false;
    cambioUsuarioRef.current = false;
    setLoading(true);

    preferenciaUsuarioApi
      .obtener(pantalla, clave)
      .then((dto) => {
        if (!activo || cambioUsuarioRef.current) return;
        const guardadas = parsearJsonArray(dto?.valor ?? null);
        if (guardadas) {
          setVisibleKeysState(fusionarColumnasVisibles(columnsRef.current, guardadas));
          return;
        }

        // Sin preferencia en la API -> intentar migracion one-shot desde localStorage
        if (legacyStorageKey) {
          const legacy = parsearJsonArray(localStorage.getItem(legacyStorageKey));
          if (legacy) {
            const fusionado = fusionarColumnasVisibles(columnsRef.current, legacy);
            setVisibleKeysState(fusionado);
            localStorage.removeItem(legacyStorageKey);
            preferenciaUsuarioApi
              .guardar(pantalla, clave, JSON.stringify(fusionado))
              .catch((err: any) => {
                message.error(err?.response?.data?.errorMessage || 'No se pudieron guardar las columnas');
              });
          }
        }
      })
      .catch((err: any) => {
        if (!activo) return;
        message.error(err?.response?.data?.errorMessage || 'No se pudieron cargar las columnas');
      })
      .finally(() => {
        if (!activo) return;
        cargadoRef.current = true;
        setLoading(false);

        // Si el usuario cambio columnas mientras cargaba, persistir ese cambio.
        const pendiente = pendienteRef.current;
        if (pendiente && cambioUsuarioRef.current) {
          pendienteRef.current = null;
          preferenciaUsuarioApi
            .guardar(pantalla, clave, JSON.stringify(pendiente))
            .catch((err: any) => {
              message.error(err?.response?.data?.errorMessage || 'No se pudieron guardar las columnas');
            });
        }
      });

    return () => {
      activo = false;
    };
  }, [pantalla, clave, columnsSignature, legacyStorageKey]);

  // Persistir el ultimo cambio pendiente y limpiar el debounce al desmontar
  // o al cambiar de pantalla/clave.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const pendiente = pendienteRef.current;
      pendienteRef.current = null;
      if (pendiente) {
        preferenciaUsuarioApi
          .guardar(pantalla, clave, JSON.stringify(pendiente))
          .catch((err: any) => {
            message.error(err?.response?.data?.errorMessage || 'No se pudieron guardar las columnas');
          });
      }
    };
  }, [pantalla, clave]);

  const setVisibleKeys = useCallback(
    (keys: string[]) => {
      cambioUsuarioRef.current = true;
      setVisibleKeysState(keys);
      pendienteRef.current = keys;
      if (!cargadoRef.current) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        pendienteRef.current = null;
        preferenciaUsuarioApi
          .guardar(pantalla, clave, JSON.stringify(keys))
          .catch((err: any) => {
            message.error(err?.response?.data?.errorMessage || 'No se pudieron guardar las columnas');
          });
      }, DEBOUNCE_MS);
    },
    [pantalla, clave],
  );

  return { visibleKeys, setVisibleKeys, loading };
}
