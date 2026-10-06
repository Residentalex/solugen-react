import React from 'react';
import { InputNumber, Tag } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';

interface TagTasaDocumentoProps {
  /** Valor actual de la tasa. */
  tasa: number;
  /** false cuando el documento esta en la moneda de la empresa: la tasa no se puede editar. */
  editable: boolean;
  /** El editor inline esta abierto. */
  editando: boolean;
  onEdit: () => void;
  onChange?: (valor: number) => void;
  onCommit: () => void;
  onCancel: () => void;
}

/**
 * Campo rapido de tipo de cambio de los formularios de documentos.
 *
 * El tipo de cambio solo tiene sentido en documentos en divisa: cuando la moneda es la
 * de la empresa el campo se muestra informative, sin icono de edicion ni cursor de
 * puntero, con el tooltip que explica por que.
 */
const TagTasaDocumento: React.FC<TagTasaDocumentoProps> = ({
  tasa, editable, editando, onEdit, onChange, onCommit, onCancel,
}) => {
  const estiloTag: React.CSSProperties = {
    fontSize: 14,
    padding: '6px 16px',
    cursor: editable ? 'pointer' : 'default',
  };

  if (editando) {
    return (
      <InputNumber
        size="small"
        style={{ width: 120 }}
        min={0}
        step={0.01}
        placeholder="Tasa"
        autoFocus
        defaultValue={tasa}
        onChange={(val) => onChange?.(val ?? 1)}
        onPressEnter={onCommit}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onCancel();
          }
        }}
      />
    );
  }

  if (!editable) {
    return (
      <Tag style={estiloTag} title="La tasa solo se modifica en documentos en divisa">
        Tasa: {tasa}
      </Tag>
    );
  }

  if (tasa !== 1) {
    return (
      <Tag style={estiloTag} onClick={onEdit}>
        Tasa: {tasa} <EditOutlined />
      </Tag>
    );
  }

  return (
    <Tag style={estiloTag} onClick={onEdit}>
      <PlusOutlined /> Tasa
    </Tag>
  );
};

export default TagTasaDocumento;