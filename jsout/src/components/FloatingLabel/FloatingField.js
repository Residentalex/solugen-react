import { jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import './FloatingField.css';
/** Wrapper que transforma el placeholder de cualquier input Ant Design
 *  en un floating label estilo Material Design. */
const FloatingField = React.forwardRef(({ label, required, children, value, onChange, externalValue: _externalValue }, ref) => {
    const [focused, setFocused] = useState(false);
    // El label siempre se muestra arriba
    const hasValue = true;
    // Detecta TextArea / multiline por la presencia del prop "rows"
    const childProps = children.props;
    const isMultiline = childProps.rows !== undefined;
    const handleFocus = (e) => {
        setFocused(true);
        childProps.onFocus?.(e);
    };
    const handleBlur = (e) => {
        setFocused(false);
        childProps.onBlur?.(e);
    };
    const handleChange = (...args) => {
        onChange?.(...args);
        childProps.onChange?.(...args);
    };
    // El placeholder interno del input se asigna como espacio en blanco
    // para que no compita visualmente con el floating label.
    const internalPlaceholder = ' ';
    // Clonamos el hijo inyectando los props del formulario y los handlers
    const newChild = React.cloneElement(children, Object.assign({}, value !== undefined ? { value } : {}, {
        onFocus: handleFocus,
        onBlur: handleBlur,
        onChange: handleChange,
        placeholder: internalPlaceholder,
    }));
    const classes = [
        'floating-field',
        focused ? 'floating-focused' : '',
        hasValue ? 'floating-has-value' : '',
        required ? 'floating-required' : '',
        isMultiline ? 'floating-multiline' : '',
    ]
        .filter(Boolean)
        .join(' ');
    return (_jsxs("div", { ref: ref, className: classes, children: [newChild, _jsxs("span", { className: "floating-label", children: [label, required && ' *'] })] }));
});
FloatingField.displayName = 'FloatingField';
export default FloatingField;
