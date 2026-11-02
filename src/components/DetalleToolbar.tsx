import React from 'react';
import { Button, Modal } from 'antd';
import {
  ArrowLeftOutlined, PrinterOutlined, EditOutlined,
  CheckCircleOutlined, CloseCircleOutlined, RedoOutlined,
  ExclamationCircleOutlined, DeleteOutlined,
} from '@ant-design/icons';
import ToolbarAcciones from './ToolbarAcciones';
import type { ToolbarAccion } from './ToolbarAcciones';
import { toEstadoNum, toPeriodoNum } from '../utils/estadoDocumento';

interface DetalleToolbarProps {
  modulo: string;
  estado: string | number;
  periodo: string | number;
  revisado?: boolean;
  saving?: boolean;
  imprimiendo?: boolean;
  operacionLoading?: boolean;
  onVolver: () => void;
  onImprimir?: () => Promise<void>;
  onImprimirTicket?: () => Promise<void>;
  onEditar?: () => void;
  onAplicar?: () => void;
  onAnular?: () => Promise<void>;
  onPostear?: () => void;
  onRevisado?: () => Promise<void>;
  onDesaplicar?: () => Promise<void>;
  onReversar?: () => Promise<void>;
  onEliminar?: () => Promise<void>;
  showImprimir?: boolean;
  confirmActions?: boolean;
  edicionSinRestricciones?: boolean;
  /** Slot SOLO para controles no-acción (Switch "Reverso/Original", Tag, Select,
   *  Divider). Los botones de acción deben ir en `extraAcciones`. */
  extraButtons?: React.ReactNode;
  /** Acciones adicionales que se fusionan con las de estado respetando la regla
   *  de máximo 2 visibles. Cada botón de acción suelto va aquí, no en `extraButtons`. */
  extraAcciones?: ToolbarAccion[];
}

const { confirm } = Modal;

function accionConfirm(titulo: string, onOk: () => void): void {
  confirm({
    title: titulo,
    icon: <ExclamationCircleOutlined />,
    content: `¿Está seguro que desea ${titulo.toLowerCase()} este documento?`,
    okText: 'Sí',
    cancelText: 'No',
    onOk,
  });
}

const DetalleToolbar: React.FC<DetalleToolbarProps> = ({
  modulo, estado, periodo, revisado,
  saving, imprimiendo, operacionLoading,
  onVolver, onImprimir, onImprimirTicket, onEditar, onAplicar, onAnular,
  onPostear, onRevisado, onDesaplicar, onReversar, onEliminar,
  showImprimir = true, confirmActions = true, edicionSinRestricciones = false,
  extraButtons, extraAcciones,
}) => {
  const estadoNum = toEstadoNum(estado);
  const periodoNum = toPeriodoNum(periodo);
  // Bloqueo uniforme de la barra durante cualquier operación en vuelo
  const bloqueado = !!(saving || imprimiendo || operacionLoading);

  const wrapConfirm = (titulo: string, handler?: () => void): (() => void) | undefined => {
    if (!handler) return undefined;
    if (!confirmActions) return handler;
    return () => accionConfirm(titulo, handler);
  };

  const acciones: ToolbarAccion[] = [
    // Editar (primary)
    ...((((estadoNum === 0 && periodoNum !== 6) || edicionSinRestricciones) && revisado !== true && onEditar)
      ? [{
          key: 'editar',
          label: 'Editar',
          icon: <EditOutlined />,
          tipo: 'primary' as const,
          onClick: onEditar,
          permiso: { codigoPantalla: modulo, accion: 'EDITAR' },
          prioridad: 100,
          disabled: bloqueado,
        }]
      : []),

    // Aplicar
    ...((estadoNum === 0 && periodoNum !== 6 && onAplicar)
      ? [{
          key: 'aplicar',
          label: 'Aplicar',
          icon: <CheckCircleOutlined />,
          onClick: wrapConfirm('Aplicar', onAplicar),
          permiso: { codigoPantalla: modulo, accion: 'APLICAR' },
          prioridad: 90,
          disabled: bloqueado,
          estilo: { background: '#389e0d', borderColor: '#389e0d', color: '#fff' } as React.CSSProperties,
        }]
      : []),

    // Imprimir
    ...((showImprimir && onImprimir)
      ? [{
          key: 'imprimir',
          label: 'Imprimir',
          icon: <PrinterOutlined />,
          soloIcono: true,
          tooltip: 'Imprimir',
          loading: imprimiendo,
          onClick: onImprimir,
          permiso: { codigoPantalla: modulo, accion: 'IMPRIMIR' },
          prioridad: 80,
          disabled: bloqueado,
        }]
      : []),

    // Postear
    ...(((estadoNum === 1 || estadoNum === 3) && revisado !== true && periodoNum !== 6 && onPostear)
      ? [{
          key: 'postear',
          label: 'Postear',
          icon: <CheckCircleOutlined />,
          onClick: wrapConfirm('Postear', onPostear),
          permiso: { codigoPantalla: modulo, accion: 'POSTEAR' },
          prioridad: 70,
          disabled: bloqueado,
        }]
      : []),

    // Revisado
    ...((estadoNum === 1 && revisado !== true && periodoNum !== 6 && onRevisado)
      ? [{
          key: 'revisado',
          label: 'Revisado',
          icon: <CheckCircleOutlined />,
          loading: saving,
          onClick: wrapConfirm('Marcar como revisado', onRevisado),
          permiso: { codigoPantalla: modulo, accion: 'AUTORIZAR' },
          prioridad: 60,
          disabled: bloqueado,
        }]
      : []),

    // Desaplicar
    ...((estadoNum === 1 && revisado !== true && periodoNum !== 6 && onDesaplicar)
      ? [{
          key: 'desaplicar',
          label: 'Desaplicar',
          icon: <RedoOutlined />,
          loading: saving,
          onClick: wrapConfirm('Desaplicar', onDesaplicar),
          permiso: { codigoPantalla: modulo, accion: 'DESAPLICAR' },
          prioridad: 50,
          disabled: bloqueado,
        }]
      : []),

    // Ticket
    ...(onImprimirTicket
      ? [{
          key: 'ticket',
          label: 'Ticket',
          icon: <PrinterOutlined />,
          onClick: onImprimirTicket,
          permiso: { codigoPantalla: modulo, accion: 'IMPRIMIR' },
          prioridad: 40,
          disabled: bloqueado,
        }]
      : []),

    // Anular (destructiva)
    ...((revisado !== true && estadoNum !== 3 && periodoNum !== 6 && onAnular)
      ? [{
          key: 'anular',
          label: 'Anular',
          icon: <CloseCircleOutlined />,
          tipo: 'danger' as const,
          destructiva: true,
          loading: saving,
          onClick: wrapConfirm('Anular', onAnular),
          permiso: { codigoPantalla: modulo, accion: 'ANULAR' },
          prioridad: 30,
          disabled: bloqueado,
        }]
      : []),

    // Reversar (destructiva)
    ...((estadoNum === 1 && revisado === true && periodoNum !== 6 && onReversar)
      ? [{
          key: 'reversar',
          label: 'Reversar',
          icon: <RedoOutlined />,
          tipo: 'danger' as const,
          destructiva: true,
          loading: saving,
          onClick: wrapConfirm('Reversar', onReversar),
          permiso: { codigoPantalla: modulo, accion: 'REVERSAR' },
          prioridad: 20,
          disabled: bloqueado,
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
          loading: saving,
          onClick: wrapConfirm('Eliminar', onEliminar),
          permiso: { codigoPantalla: modulo, permisoEspecial: 'pe_modificar_admin' },
          prioridad: 10,
          disabled: bloqueado,
        }]
      : []),
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={onVolver} disabled={bloqueado}>
        Volver
      </Button>
      <div style={{ flex: 1 }} />
      {extraButtons}
      <ToolbarAcciones
        acciones={[...acciones, ...(extraAcciones ?? []).map((a) => ({ ...a, prioridad: a.prioridad ?? 40, disabled: a.disabled || bloqueado }))]}
      />
    </div>
  );
};

export default DetalleToolbar;
