import { useEffect, useState } from 'react';
import { documentosApi } from '../api/documentosApi';
import type { DocumentoDTO } from '../types/documento';

/**
 * Hook que obtiene la configuración de un tipo de documento por su código (ej: 'ENP', 'FSAP', 'FFAC').
 * Se usa en formularios de documentos transaccionales para conocer propiedades como
 * modificaDescripcion, modificaPrecio, etc.
 */
export function useDocumentoConfig(sucursal: number, documentCode: string): DocumentoDTO | null {
  const [config, setConfig] = useState<DocumentoDTO | null>(null);

  useEffect(() => {
    if (documentCode == null) return;

    let cancelled = false;
    documentosApi.obtenerPorCodigo(sucursal, documentCode)
      .then((doc) => {
        if (!cancelled) setConfig(doc);
      })
      .catch(() => {
        if (!cancelled) setConfig(null);
      });

    return () => { cancelled = true; };
  }, [sucursal, documentCode]);

  return config;
}
