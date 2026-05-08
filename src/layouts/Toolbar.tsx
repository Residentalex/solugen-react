import React from 'react';
import { Button, Space } from 'antd';
import { useUIStore } from '../stores/uiStore';
import {
  PlusOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PrinterOutlined,
  RedoOutlined,
} from '@ant-design/icons';

const Toolbar: React.FC = () => {
  const toolbarState = useUIStore((s: any) => s.toolbarState);

  if (!toolbarState.nuevo && !toolbarState.editar && !toolbarState.guardar) {
    return null;
  }

  return (
    <div style={{ background: '#f0f2f5', padding: '8px 24px', borderBottom: '1px solid #d9d9d9' }}>
      <Space>
        {toolbarState.nuevo && (
          <Button icon={<PlusOutlined />} type="primary">
            Nuevo
          </Button>
        )}
        {toolbarState.editar && (
          <Button icon={<EditOutlined />}>
            Editar
          </Button>
        )}
        {toolbarState.clonar && (
          <Button>
            Clonar
          </Button>
        )}
        {toolbarState.guardar && (
          <Button icon={<SaveOutlined />} type="primary">
            Guardar
          </Button>
        )}
        {toolbarState.cancelar && (
          <Button icon={<CloseOutlined />}>
            Cancelar
          </Button>
        )}
        {toolbarState.aplicar && (
          <Button icon={<CheckCircleOutlined />} type="primary">
            Aplicar
          </Button>
        )}
        {toolbarState.desaplicar && (
          <Button icon={<CloseCircleOutlined />}>
            Desaplicar
          </Button>
        )}
        {toolbarState.anular && (
          <Button danger>
            Anular
          </Button>
        )}
        {toolbarState.imprimir && (
          <Button icon={<PrinterOutlined />}>
            Imprimir
          </Button>
        )}
        {toolbarState.reversar && (
          <Button icon={<RedoOutlined />} danger>
            Reversar
          </Button>
        )}
      </Space>
    </div>
  );
};

export default Toolbar;
