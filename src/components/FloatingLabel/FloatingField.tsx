import React, { useState } from 'react';
import './FloatingField.css';

interface FloatingFieldProps {
  /** Texto visible como placeholder / label flotante */
  label: string;
  /** Muestra asterisco rojo de requerido */
  required?: boolean;
  /** Componente Ant Design: Input, Select, DatePicker, InputNumber, TextArea */
  children: React.ReactElement;
  /** Inyectado por Form.Item (value) */
  value?: unknown;
  /** Inyectado por Form.Item (onChange) */
  onChange?: (...args: unknown[]) => void;
  /** Valor externo para determinar si el label debe flotar (útil cuando el valor no viene por Form.Item) */
  externalValue?: string;
}

/** Wrapper que transforma el placeholder de cualquier input Ant Design
 *  en un floating label estilo Material Design. */
const FloatingField = React.forwardRef<HTMLDivElement, FloatingFieldProps>(
  ({ label, required, children, value, onChange, externalValue }, ref) => {
    const [focused, setFocused] = useState(false);

    // El label siempre se muestra arriba
    const hasValue = true;

    // Detecta TextArea / multiline por la presencia del prop "rows"
    const childProps = children.props as Record<string, unknown>;
    const isMultiline = childProps.rows !== undefined;

    const handleFocus = (e: React.FocusEvent) => {
      setFocused(true);
      (childProps.onFocus as ((e: React.FocusEvent) => void) | undefined)?.(e);
    };

    const handleBlur = (e: React.FocusEvent) => {
      setFocused(false);
      (childProps.onBlur as ((e: React.FocusEvent) => void) | undefined)?.(e);
    };

    const handleChange = (...args: unknown[]) => {
      onChange?.(...args);
      (childProps.onChange as ((...args: unknown[]) => void) | undefined)?.(...args);
    };

    // El placeholder interno del input se asigna como espacio en blanco
    // para que no compita visualmente con el floating label.
    const internalPlaceholder = ' ';

    // Clonamos el hijo inyectando los props del formulario y los handlers
    const newChild = React.cloneElement(
      children,
      Object.assign(
        {},
        value !== undefined ? { value } : {},
        {
          onFocus: handleFocus,
          onBlur: handleBlur,
          onChange: handleChange,
          placeholder: internalPlaceholder,
        },
      ) as Record<string, unknown>,
    );

    const classes = [
      'floating-field',
      focused ? 'floating-focused' : '',
      hasValue ? 'floating-has-value' : '',
      required ? 'floating-required' : '',
      isMultiline ? 'floating-multiline' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classes}>
        {newChild}
        <span className="floating-label">
          {label}
          {required && ' *'}
        </span>
      </div>
    );
  },
);

FloatingField.displayName = 'FloatingField';

export default FloatingField;
