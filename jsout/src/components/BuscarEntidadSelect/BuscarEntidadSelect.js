import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Select, Modal, message } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import FloatingField from '../FloatingLabel/FloatingField';
import { toTitleCase } from '../../utils/formats';
const BuscarEntidadSelect = ({ entidades, value, onChange, tieneDocumentosAsociados = false, label = 'Entidad', required = false, disabled = false, placeholder = ' ', onOpenChange, conceptoSeleccionado = true, }) => {
    const entidadesActivas = (Array.isArray(entidades) ? entidades : []).filter((e) => e.activo !== false);
    const handleChange = (val) => {
        if (!val) {
            onChange?.(undefined, null);
            return;
        }
        const ent = entidadesActivas.find((e) => e.codigo === val);
        if (!ent)
            return;
        if (tieneDocumentosAsociados && value && value !== val) {
            Modal.confirm({
                title: 'Cambiar entidad',
                icon: _jsx(ExclamationCircleOutlined, {}),
                content: `La entidad ${ent.nombre} tiene documentos asignados. Se borrarán los documentos agregados. ¿Está seguro?`,
                okText: 'Sí, cambiar',
                cancelText: 'No',
                okButtonProps: { danger: true },
                onOk: () => onChange?.(val, ent),
                onCancel: () => {
                    // No cambiar, el Select mantiene el valor anterior automáticamente
                },
            });
        }
        else {
            onChange?.(val, ent);
        }
    };
    const handleDropdownVisibleChange = (open) => {
        if (open && !conceptoSeleccionado) {
            message.info('Seleccione un concepto primero');
        }
        onOpenChange?.(open);
    };
    return (_jsx(FloatingField, { label: label, required: required, children: _jsx(Select, { showSearch: true, allowClear: true, placeholder: placeholder, style: { width: '100%' }, optionFilterProp: "children", value: value, onChange: handleChange, disabled: disabled, onOpenChange: handleDropdownVisibleChange, notFoundContent: !conceptoSeleccionado ? 'Seleccione un concepto primero' : undefined, filterOption: (input, option) => option?.label?.toLowerCase()?.includes(input.toLowerCase()) ?? false, children: entidadesActivas.map((ent) => (_jsxs(Select.Option, { value: ent.codigo, label: `${ent.codigo} - ${toTitleCase(ent.nombre)}${ent.identificacion ? ` (${ent.identificacion})` : ''}`, children: [ent.codigo, " - ", toTitleCase(ent.nombre), ent.identificacion ? ` (${ent.identificacion})` : ''] }, ent.codigo))) }) }));
};
export default BuscarEntidadSelect;
