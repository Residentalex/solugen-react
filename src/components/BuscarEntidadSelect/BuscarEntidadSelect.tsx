import type React from 'react';
import { Select, Modal, message } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import FloatingField from '../FloatingLabel/FloatingField';
import { toTitleCase } from '../../utils/formats';

interface EntidadOption {
  codigo: string;
  nombre: string;
  identificacion?: string;
  activo?: boolean;
}

interface BuscarEntidadSelectProps {
  /** Lista de entidades a mostrar */
  entidades: EntidadOption[];
  /** Código de la entidad seleccionada */
  value?: string;
  /** Callback cuando cambia la entidad seleccionada */
  onChange?: (codigo: string | undefined, entidad: EntidadOption | null) => void;
  /** Si hay documentos asociados, mostrar confirmación al cambiar */
  tieneDocumentosAsociados?: boolean;
  /** Label del campo */
  label?: string;
  /** Si el campo es requerido */
  required?: boolean;
  /** Si está deshabilitado */
  disabled?: boolean;
  /** Placeholder */
  placeholder?: string;
  /** Ref pasada al FloatingField */
  ref?: React.Ref<HTMLDivElement>;
  /** Callback cuando se abre/cierra el dropdown */
  onOpenChange?: (open: boolean) => void;
  /** Si no se ha seleccionado concepto aún, mostrar mensaje */
  conceptoSeleccionado?: boolean;
}

const BuscarEntidadSelect: React.FC<BuscarEntidadSelectProps> = ({
  entidades,
  value,
  onChange,
  tieneDocumentosAsociados = false,
  label = 'Entidad',
  required = false,
  disabled = false,
  placeholder = ' ',
  onOpenChange,
  conceptoSeleccionado = true,
}) => {
  const handleChange = (val: string | undefined) => {
    if (!val) {
      onChange?.(undefined, null);
      return;
    }

    const ent = entidades.find((e: any) => e.codigo === val);
    if (!ent) return;

    if (tieneDocumentosAsociados && value && value !== val) {
      Modal.confirm({
        title: 'Cambiar entidad',
        icon: <ExclamationCircleOutlined />,
        content: `La entidad ${ent.nombre} tiene documentos asignados. Se borrarán los documentos agregados. ¿Está seguro?`,
        okText: 'Sí, cambiar',
        cancelText: 'No',
        okButtonProps: { danger: true },
        onOk: () => onChange?.(val, ent),
        onCancel: () => {
          // No cambiar, el Select mantiene el valor anterior automáticamente
        },
      });
    } else {
      onChange?.(val, ent);
    }
  };

  const handleDropdownVisibleChange = (open: boolean) => {
    if (open && !conceptoSeleccionado) {
      message.info('Seleccione un concepto primero');
    }
    onOpenChange?.(open);
  };

  return (
    <FloatingField label={label} required={required}>
      <Select
        showSearch
        allowClear
        placeholder={placeholder}
        optionFilterProp="children"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        onOpenChange={handleDropdownVisibleChange}
        notFoundContent={!conceptoSeleccionado ? 'Seleccione un concepto primero' : undefined}
        filterOption={(input, option) =>
          (option?.label as string)?.toLowerCase()?.includes(input.toLowerCase()) ?? false
        }
      >
        {entidades.map((ent) => (
          <Select.Option
            key={ent.codigo}
            value={ent.codigo}
            label={`${ent.codigo} - ${toTitleCase(ent.nombre)}${ent.identificacion ? ` (${ent.identificacion})` : ''}`}
          >
            {ent.codigo} - {toTitleCase(ent.nombre)}{ent.identificacion ? ` (${ent.identificacion})` : ''}
          </Select.Option>
        ))}
      </Select>
    </FloatingField>
  );
};

export default BuscarEntidadSelect;
