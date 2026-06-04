import React from 'react';
import { Space, Button, Modal } from 'antd';
import {
  ArrowLeftOutlined, PrinterOutlined, EditOutlined,
  CheckCircleOutlined, CloseCircleOutlined, RedoOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import PermissionGate from './PermissionGate';

interface DetalleToolbarProps {
  modulo: string;
  estado: number;
  periodo: number;
  revisado?: boolean;
  saving?: boolean;
  imprimiendo?: boolean;
  operacionLoading?: boolean;
  onVolver: () => void;
  onImprimir?: () => Promise<void>;
  onEditar?: () => void;
  onAplicar?: () => void;
  onAnular?: () => Promise<void>;
  onPostear?: () => void;
  onRevisado?: () => Promise<void>;
  onDesaplicar?: () => Promise<void>;
  onReversar?: () => Promise<void>;
  showImprimir?: boolean;
  confirmActions?: boolean;
  extraButtons?: React.ReactNode;
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
  onVolver, onImprimir, onEditar, onAplicar, onAnular,
  onPostear, onRevisado, onDesaplicar, onReversar,
  showImprimir = true, confirmActions = true,
  extraButtons,
}) => {
  const wrapConfirm = (titulo: string, handler?: () => any) => {
    if (!handler) return undefined;
    if (!confirmActions) return handler;
    return () => accionConfirm(titulo, handler);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={onVolver}>
        Volver
      </Button>
      <div style={{ flex: 1 }} />
      <Space>
        {showImprimir && onImprimir && (
          <PermissionGate accion="IMPRIMIR">
            <Button icon={<PrinterOutlined />} loading={imprimiendo} onClick={onImprimir} />
          </PermissionGate>
        )}

        {extraButtons}

        {estado === 0 && periodo !== 6 && revisado !== true && onEditar && (
          <PermissionGate accion="EDITAR">
            <Button type="primary" icon={<EditOutlined />} onClick={onEditar}>Editar</Button>
          </PermissionGate>
        )}

        {estado === 0 && periodo !== 6 && onAplicar && (
          <PermissionGate accion="APLICAR">
            <Button
              style={{ background: '#389e0d', borderColor: '#389e0d', color: '#fff' }}
              icon={<CheckCircleOutlined />}
              disabled={operacionLoading}
              onClick={wrapConfirm('Aplicar', onAplicar)}
            >
              Aplicar
            </Button>
          </PermissionGate>
        )}

        {revisado !== true && estado !== 3 && onAnular && (
          <PermissionGate accion="ANULAR">
            <Button
              danger
              icon={<CloseCircleOutlined />}
              loading={saving}
              onClick={wrapConfirm('Anular', onAnular)}
            >
              Anular
            </Button>
          </PermissionGate>
        )}

        {estado === 1 && revisado !== true && onPostear && (
          <PermissionGate accion="POSTEAR">
            <Button
              icon={<CheckCircleOutlined />}
              disabled={operacionLoading}
              onClick={wrapConfirm('Postear', onPostear)}
            >
              Postear
            </Button>
          </PermissionGate>
        )}

        {estado === 1 && revisado !== true && onRevisado && (
          <PermissionGate accion="AUTORIZAR">
            <Button
              icon={<CheckCircleOutlined />}
              loading={saving}
              onClick={wrapConfirm('Marcar como revisado', onRevisado)}
            >
              Revisado
            </Button>
          </PermissionGate>
        )}

        {estado === 1 && revisado !== true && onDesaplicar && (
          <PermissionGate accion="DESAPLICAR">
            <Button
              icon={<RedoOutlined />}
              loading={saving}
              onClick={wrapConfirm('Desaplicar', onDesaplicar)}
            >
              Desaplicar
            </Button>
          </PermissionGate>
        )}

        {estado === 1 && revisado === true && onReversar && (
          <PermissionGate accion="REVERSAR">
            <Button
              danger
              icon={<RedoOutlined />}
              loading={saving}
              onClick={wrapConfirm('Reversar', onReversar)}
            >
              Reversar
            </Button>
          </PermissionGate>
        )}
      </Space>
    </div>
  );
};

export default DetalleToolbar;
