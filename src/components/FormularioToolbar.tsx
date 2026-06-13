import React from 'react';
import { Space, Button, Tag } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { ESTADO_DOCUMENTO_MAP } from '../utils/estadoDocumento';
import PermissionGate from './PermissionGate';

interface FormularioToolbarProps {
  saving?: boolean;
  estado?: number;
  periodo?: number;
  mode?: 'crear' | 'editar';
  onGuardar: () => void;
  onCancelar: () => void;
  children?: React.ReactNode;
}

const FormularioToolbar: React.FC<FormularioToolbarProps> = ({
  saving, estado, periodo, mode = 'crear', onGuardar, onCancelar, children,
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
      {children}
      <div style={{ flex: 1 }} />
      <Space wrap>
        <PermissionGate accion={mode === 'editar' ? 'EDITAR' : 'CREAR'}>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onGuardar}>
            Guardar
          </Button>
        </PermissionGate>
        <Button icon={<CloseOutlined />} onClick={onCancelar}>
          Cancelar
        </Button>
      </Space>
    </div>
  );
};

export function EstadoTag({ estado, periodo }: { estado?: number; periodo?: number }) {
  const esCerrado = periodo === 6;
  const estadoInfo = estado !== undefined ? ESTADO_DOCUMENTO_MAP[estado] : undefined;
  if (estado === undefined) return null;
  return (
    <Space>
      {esCerrado && <Tag color="geekblue">Cerrado</Tag>}
      {estadoInfo && <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>}
    </Space>
  );
}

export default FormularioToolbar;
