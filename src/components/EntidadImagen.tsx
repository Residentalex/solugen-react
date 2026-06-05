import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';

interface Props {
  tipo: string;
  entidadID?: number;
  codigo?: string;
  fallback: string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

const EntidadImagen: React.FC<Props> = ({ tipo, entidadID, codigo, fallback, size = 32, style, className }) => {
  const sucursal = useAuthStore((s) => s.compania);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let objectUrl: string | null = null;

    const cargar = async () => {
      if (!sucursal) {
        if (mountedRef.current) setError(true);
        return;
      }
      try {
        let url: string;
        if (codigo) {
          url = `/entidad-imagen/${sucursal}/${tipo}/codigo/${codigo}`;
        } else if (entidadID && entidadID > 0) {
          url = `/entidad-imagen/${sucursal}/${tipo}/${entidadID}`;
        } else {
          if (mountedRef.current) setError(true);
          return;
        }

        const response = await apiClient.get(url, {
          responseType: 'blob',
          validateStatus: (status) => status === 200 || status === 204,
        });
        if (!mountedRef.current) return;
        if (response.status === 204 || !response.data || response.data.size === 0) {
          setError(true);
          return;
        }
        const mimeType = (response.headers['content-type'] as string) || 'image/jpeg';
        const blob = new Blob([response.data], { type: mimeType });
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setError(false);
      } catch {
        if (mountedRef.current) setError(true);
      }
    };

    setSrc(null);
    setError(false);
    cargar();

    return () => {
      mountedRef.current = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sucursal, tipo, entidadID, codigo]);

  if (error || !src) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'var(--paces-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.45,
          color: '#fff',
          fontWeight: 700,
          flexShrink: 0,
          ...style,
        }}
      >
        {fallback}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0,
        ...style,
      }}
    />
  );
};

export default EntidadImagen;
