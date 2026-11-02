import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, message, Modal, Spin, Upload } from 'antd';
import { DeleteOutlined, PictureOutlined, UploadOutlined } from '@ant-design/icons';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

interface EntidadImagenCardProps {
  codigo?: string;
  editable: boolean;
  onChanged?: () => void;
}

const TIPO = 'CLI';
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

const EntidadImagenCard: React.FC<EntidadImagenCardProps> = ({ codigo, editable, onChanged }) => {
  // Consolidado (mismo criterio que EntidadImagen.tsx), no sucursalActiva.
  const sucursal = useAuthStore((s) => s.compania);

  const [src, setSrc] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  // Evita crear/revocar objectURLs después del desmontaje del componente.
  const canceladoRef = useRef(false);

  const revocarObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const cargar = useCallback(async () => {
    if (!sucursal || !codigo) {
      revocarObjectUrl();
      setSrc(null);
      return;
    }
    setCargando(true);
    try {
      const response = await apiClient.get(`/entidad-imagen/${sucursal}/${TIPO}/codigo/${codigo}`, {
        responseType: 'blob',
        validateStatus: (status) => status === 200 || status === 204,
      });
      if (canceladoRef.current) return;
      if (response.status === 204 || !response.data || response.data.size === 0) {
        revocarObjectUrl();
        setSrc(null);
        return;
      }
      const mimeType = (response.headers['content-type'] as string) || 'image/jpeg';
      const blob = new Blob([response.data], { type: mimeType });
      revocarObjectUrl();
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setSrc(url);
    } catch (err: any) {
      if (canceladoRef.current) return;
      // 404 (sin imagen) es normal: no se muestra error.
      if (err?.response?.status && err.response.status !== 404) {
        message.error('Error al cargar la imagen de la entidad');
      }
      revocarObjectUrl();
      setSrc(null);
    } finally {
      if (!canceladoRef.current) setCargando(false);
    }
  }, [sucursal, codigo]);

  useEffect(() => {
    canceladoRef.current = false;
    cargar();
    return () => {
      canceladoRef.current = true;
      revocarObjectUrl();
    };
  }, [cargar]);

  const subir = async (file: File) => {
    if (subiendo) return;
    if (!sucursal || !codigo) return;
    if (!file.type.startsWith('image/')) {
      message.error('El archivo debe ser una imagen');
      return;
    }
    if (file.size > MAX_SIZE) {
      message.error('La imagen no debe superar los 2 MB');
      return;
    }
    setSubiendo(true);
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      await apiClient.post(`/entidad-imagen/${sucursal}/${TIPO}/codigo/${codigo}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('Imagen actualizada correctamente');
      onChanged?.();
      await cargar();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al subir la imagen');
    } finally {
      setSubiendo(false);
    }
  };

  const eliminar = () => {
    if (!sucursal || !codigo) return;
    Modal.confirm({
      title: '¿Eliminar imagen?',
      content: 'Esta acción no se puede deshacer.',
      okText: 'Eliminar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await apiClient.delete(`/entidad-imagen/${sucursal}/${TIPO}/codigo/${codigo}`);
          message.success('Imagen eliminada');
          onChanged?.();
          await cargar();
        } catch (err: any) {
          message.error(err?.response?.data?.errorMessage || 'Error al eliminar la imagen');
        }
      },
    });
  };

  const inicial = codigo?.trim().charAt(0).toUpperCase() || 'C';

  const renderPreview = () => {
    if (cargando) {
      return (
        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin />
        </div>
      );
    }
    if (src) {
      return (
        <div
          style={{
            height: 180,
            borderRadius: 8,
            border: '1px solid var(--paces-border)',
            overflow: 'hidden',
            background: 'var(--paces-topbar-search-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={src}
            alt="Imagen de la entidad"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      );
    }
    return (
      <div
        style={{
          height: 180,
          borderRadius: 8,
          border: '1px solid var(--paces-border)',
          background: 'var(--paces-topbar-search-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--paces-text-secondary)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 8px',
              borderRadius: '50%',
              background: 'var(--paces-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            {inicial}
          </div>
          <PictureOutlined style={{ fontSize: 16, marginRight: 6 }} />
          Sin imagen
        </div>
      </div>
    );
  };

  // Cliente nuevo (sin código): card deshabilitado.
  if (!codigo) {
    return (
      <div className="paces-card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Imagen de la entidad</div>
        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.55 }}>
          <div style={{ textAlign: 'center' }} className="paces-text-secondary">
            <PictureOutlined style={{ fontSize: 24, marginBottom: 8, display: 'block' }} />
            Guarde el cliente para subir imágenes
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="paces-card" style={{ marginBottom: 16, padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Imagen de la entidad</div>
      {renderPreview()}
      {editable && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <Upload
            showUploadList={false}
            accept="image/*"
            multiple={false}
            maxCount={1}
            beforeUpload={(file) => {
              subir(file);
              return false;
            }}
            disabled={subiendo}
          >
            <Button icon={<UploadOutlined />} loading={subiendo}>
              {src ? 'Cambiar' : 'Subir imagen'}
            </Button>
          </Upload>
          {src && (
            <Button danger icon={<DeleteOutlined />} onClick={eliminar} disabled={subiendo}>
              Eliminar
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EntidadImagenCard;
