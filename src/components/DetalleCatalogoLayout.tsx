import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spin, Alert } from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  SaveOutlined,
  DeleteOutlined,
  StopOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import ToolbarAcciones from './ToolbarAcciones';
import type { ToolbarAccion } from './ToolbarAcciones';
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
  onCancelar?: () => void;
  onEliminar?: () => void;
  onInactivar?: () => void;

  guardando?: boolean;
  eliminando?: boolean;
  bloqueado?: boolean;

  extraLeft?: React.ReactNode;
  /** Slot de información a la derecha (Tag, texto). NO usar para botones de acción:
   *  esos van en `extraAcciones` para respetar el límite de 2 visibles. */
  extraActions?: React.ReactNode;
  extraAcciones?: ToolbarAccion[];

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
  onCancelar,
  onEliminar,
  onInactivar,

  guardando = false,
  eliminando = false,
  bloqueado = false,

  extraLeft,
  extraActions,
  extraAcciones,

  onVolver,

  children,
}) => {
  const navigate = useNavigate();

  const acciones: ToolbarAccion[] = useMemo(() => [
    // Guardar (primary)
    ...(onGuardar
      ? [{
          key: 'guardar',
          label: 'Guardar',
          icon: <SaveOutlined />,
          tipo: 'primary' as const,
          loading: guardando,
          onClick: onGuardar,
          permiso: { accion: modo === 'crear' ? 'CREAR' : 'EDITAR' },
          prioridad: 100,
          disabled: bloqueado || guardando || eliminando,
        }]
      : []),

    // Cancelar
    ...(onCancelar
      ? [{
          key: 'cancelar',
          label: 'Cancelar',
          icon: <CloseOutlined />,
          onClick: onCancelar,
          prioridad: 90,
          disabled: bloqueado || guardando || eliminando,
        }]
      : []),

    // Editar (primary; solo en modo lectura, cuando no hay Guardar)
    ...(onEditar
      ? [{
          key: 'editar',
          label: 'Editar',
          icon: <EditOutlined />,
          tipo: 'primary' as const,
          onClick: onEditar,
          permiso: { accion: 'EDITAR' },
          prioridad: 80,
          disabled: bloqueado || guardando || eliminando,
        }]
      : []),

    // Inactivar (destructiva)
    ...(onInactivar
      ? [{
          key: 'inactivar',
          label: 'Inactivar',
          icon: <StopOutlined />,
          tipo: 'danger' as const,
          destructiva: true,
          onClick: onInactivar,
          permiso: { accion: 'EDITAR' },
          prioridad: 60,
        }]
      : []),

    // Eliminar (destructiva)
    ...(onEliminar
      ? [{
          key: 'eliminar',
          label: 'Eliminar',
          icon: <DeleteOutlined />,
          tipo: 'danger' as const,
          destructiva: true,
          loading: eliminando,
          onClick: onEliminar,
          permiso: { accion: 'ELIMINAR' },
          prioridad: 50,
          disabled: bloqueado || guardando || eliminando,
        }]
      : []),
    ...(extraAcciones ?? []).map((a) => ({ ...a, prioridad: a.prioridad ?? 50 })),
  ], [onGuardar, guardando, modo, bloqueado, eliminando, onCancelar, onEditar, onInactivar, onEliminar, extraAcciones]);

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
          <Button size="small" onClick={onRecargar} disabled={bloqueado}>
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
            <Button size="small" onClick={onRecargar} disabled={bloqueado}>
              Reintentar
            </Button>
          }
        />
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onVolver ?? (() => navigate(rutaVolver))} disabled={bloqueado || guardando || eliminando}>
          Volver
        </Button>
        {extraLeft}
        <div style={{ flex: 1 }} />
        {extraActions}
        <ToolbarAcciones acciones={acciones} />
      </div>

      {/* Contenido */}
      {children}
    </div>
  );
};

export default DetalleCatalogoLayout;
