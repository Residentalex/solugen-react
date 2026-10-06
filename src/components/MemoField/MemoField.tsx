import React from 'react';
import { Input } from 'antd';
import FloatingField from '../FloatingLabel/FloatingField';

const { TextArea } = Input;

export interface MemoFieldProps {
  /** Texto visible como label flotante */
  label: string;
  /** Muestra asterisco rojo de requerido */
  required?: boolean;
  /** Lineas visibles al abrir; tambien es el minimo al auto-ajustar */
  rows?: number;
  /** Maximo de lineas al auto-ajustar */
  maxRows?: number;
  /** Limite de caracteres. null para sin limite */
  maxLength?: number | null;
  /** Muestra el contador de caracteres */
  showCount?: boolean;
  /** Inyectado por Form.Item (value) */
  value?: unknown;
  /** Inyectado por Form.Item (onChange) */
  onChange?: (...args: unknown[]) => void;
}

/** Campo de notas multilinea estilo memo: area de texto que crece con el
 *  contenido y se limita a 500 caracteres, alineado con el MemoEdit del
 *  escritorio y con el limite de la columna NOTAS de la base de datos. */
const MemoField: React.FC<MemoFieldProps> = ({
  label,
  required,
  rows = 3,
  maxRows = 8,
  maxLength = 500,
  showCount = true,
  value,
  onChange,
}) => (
  <FloatingField label={label} required={required} value={value} onChange={onChange}>
    <TextArea
      rows={rows}
      autoSize={{ minRows: rows, maxRows }}
      maxLength={maxLength ?? undefined}
      showCount={showCount}
    />
  </FloatingField>
);

export default MemoField;
