import React from 'react';
import { Space, Button, Tag } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { ESTADO_DOCUMENTO_MAP } from '../utils/estadoDocumento';

interface FormularioToolbarProps {
  saving?: boolean;
  estado?: number;
  periodo?: number;
  onGuardar: () => void;
  onCancelar: () => void;
}

const FormularioToolbar: React.FC<FormularioToolbarProps> = ({
  saving, estado, periodo, onGuardar, onCancelar,
}) => {
  const esCerrado = periodo === 6;
  const estadoInfo = estado !== undefined ? ESTADO_DOCUMENTO_MAP[estado] : undefined;
  const mostrarEstado = estado !== undefined;

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
      <div style={{ flex: 1 }} />
      <Space wrap>
        {mostrarEstado && esCerrado && <Tag color="geekblue">Cerrado</Tag>}
        {mostrarEstado && estadoInfo && (
          <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
        )}
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onGuardar}>
          Guardar
        </Button>
        <Button icon={<CloseOutlined />} onClick={onCancelar}>
          Cancelar
        </Button>
      </Space>
    </div>
  );
};

export default FormularioToolbar;
