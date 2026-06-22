import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spin, Alert } from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  SaveOutlined,
  DeleteOutlined,
  StopOutlined,
} from '@ant-design/icons';
import PermissionGate from './PermissionGate';
import ErrorDetalle from './ErrorDetalle';

interface DetalleCatalogoLayoutProps {
  rutaVolver: string;

  loading: boolean;
  mensajeLoading?: string;

  loadingError: boolean;
  mensajeError?: string;
  onRecargar: () => void;
  errorSinDatos?: boolean;

  dataDisponible: boolean;

  modo?: 'crear' | 'editar';
  onEditar?: () => void;
  onGuardar?: () => void;
  onEliminar?: () => void;
  onInactivar?: () => void;

  guardando?: boolean;
  eliminando?: boolean;

  extraLeft?: React.ReactNode;
  extraActions?: React.ReactNode;

  onVolver?: () => void;

  children: React.ReactNode;
}

const DetalleCatalogoLayout: React.FC<DetalleCatalogoLayoutProps> = ({
  rutaVolver,

  loading,
  mensajeLoading = 'Cargando...',

  loadingError,
  mensajeError = 'Error al cargar el documento',
  onRecargar,
  errorSinDatos = true,

  dataDisponible,

  modo = 'editar',
  onEditar,
  onGuardar,
  onEliminar,
  onInactivar,

  guardando = false,
  eliminando = false,

  extraLeft,
  extraActions,

  onVolver,

  children,
}) => {
  const navigate = useNavigate();

  // Estado LOADING inicial (sin datos previos)
  if (loading && !dataDisponible) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">
          {mensajeLoading}
        </div>
      </div>
    );
  }

  // Estado ERROR inicial (sin datos)
  if (loadingError && !dataDisponible) {
    if (errorSinDatos) {
      return (
        <ErrorDetalle
          mensaje={mensajeError}
          rutaVolver={rutaVolver}
          onRecargar={onRecargar}
        />
      );
    }
    return (
      <Alert
        message={mensajeError}
        type="error"
        showIcon
        style={{ marginBottom: 16 }}
        action={
          <Button size="small" onClick={onRecargar}>
            Reintentar
          </Button>
        }
      />
    );
  }

  // Sin datos (ni loading, ni error, ni data)
  if (!dataDisponible) {
    return null;
  }

  return (
    <div>
      {/* Alert de error cuando ya hay datos en pantalla */}
      {loadingError && (
        <Alert
          message={mensajeError}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={onRecargar}>
              Reintentar
            </Button>
          }
        />
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onVolver ?? (() => navigate(rutaVolver))}>
          Volver
        </Button>
        {extraLeft}
        <div style={{ flex: 1 }} />
        {extraActions}

        {onEditar && (
          <PermissionGate accion="EDITAR">
            <Button type="primary" icon={<EditOutlined />} onClick={onEditar}>
              Editar
            </Button>
          </PermissionGate>
        )}

        {onGuardar && (
          <PermissionGate accion={modo === 'crear' ? 'CREAR' : 'EDITAR'}>
            <Button type="primary" icon={<SaveOutlined />} loading={guardando} onClick={onGuardar}>
              Guardar
            </Button>
          </PermissionGate>
        )}

        {onEliminar && (
          <PermissionGate accion="ELIMINAR">
            <Button danger icon={<DeleteOutlined />} loading={eliminando} onClick={onEliminar}>
              Eliminar
            </Button>
          </PermissionGate>
        )}

        {onInactivar && (
          <PermissionGate accion="EDITAR">
            <Button icon={<StopOutlined />} onClick={onInactivar}>
              Inactivar
            </Button>
          </PermissionGate>
        )}
      </div>

      {/* Contenido */}
      {children}
    </div>
  );
};

export default DetalleCatalogoLayout;
