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
  const nuevoCallback = useUIStore((s) => s.nuevoCallback);
  const editarCallback = useUIStore((s) => s.editarCallback);
  const guardarCallback = useUIStore((s) => s.guardarCallback);
  const cancelarCallback = useUIStore((s) => s.cancelarCallback);
  const aplicarCallback = useUIStore((s) => s.aplicarCallback);
  const anularCallback = useUIStore((s) => s.anularCallback);
  const postearCallback = useUIStore((s) => s.postearCallback);
  const revisadoCallback = useUIStore((s) => s.revisadoCallback);
  const reversarCallback = useUIStore((s) => s.reversarCallback);
  const imprimirCallback = useUIStore((s) => s.imprimirCallback);

  if (!toolbarState.nuevo && !toolbarState.editar && !toolbarState.guardar) {
    return null;
  }

  return (
    <div className="paces-toolbar">
      <Space wrap>
        {toolbarState.nuevo && (
          <Button icon={<PlusOutlined />} type="primary" onClick={nuevoCallback}>
            Nuevo
          </Button>
        )}
        {toolbarState.editar && (
          <Button icon={<EditOutlined />} onClick={editarCallback}>
            Editar
          </Button>
        )}
        {toolbarState.clonar && (
          <Button>
            Clonar
          </Button>
        )}
        {toolbarState.guardar && (
          <Button icon={<SaveOutlined />} type="primary" onClick={guardarCallback}>
            Guardar
          </Button>
        )}
        {toolbarState.cancelar && (
          <Button icon={<CloseOutlined />} onClick={cancelarCallback}>
            Cancelar
          </Button>
        )}
        {toolbarState.aplicar && (
          <Button icon={<CheckCircleOutlined />} type="primary" onClick={aplicarCallback}>
            Aplicar
          </Button>
        )}
        {toolbarState.desaplicar && (
          <Button icon={<CloseCircleOutlined />} onClick={anularCallback}>
            Desaplicar
          </Button>
        )}
        {toolbarState.anular && (
          <Button icon={<CloseCircleOutlined />} danger onClick={anularCallback}>
            Anular
          </Button>
        )}
        {toolbarState.imprimir && (
          <Button icon={<PrinterOutlined />} onClick={imprimirCallback}>
            Imprimir
          </Button>
        )}
        {toolbarState.postear && (
          <Button icon={<CheckCircleOutlined />} onClick={postearCallback}>
            Postear
          </Button>
        )}
        {toolbarState.revisado && (
          <Button icon={<CheckCircleOutlined />} onClick={revisadoCallback}>
            Revisado
          </Button>
        )}
        {toolbarState.reversar && (
          <Button icon={<RedoOutlined />} danger onClick={reversarCallback}>
            Reversar
          </Button>
        )}
      </Space>
    </div>
  );
};

export default Toolbar;
