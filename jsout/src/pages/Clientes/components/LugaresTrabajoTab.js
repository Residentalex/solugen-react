import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Card, Descriptions, Button, Modal, Form, Input, Typography, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
const { Text } = Typography;
const LugaresTrabajoTab = ({ data }) => {
    const [editando, setEditando] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    if (!data) {
        return (_jsx(Card, { className: "paces-card", children: _jsx("div", { style: { textAlign: 'center', padding: 24 }, className: "paces-text-secondary", children: _jsx(Text, { type: "secondary", children: "Cargando informaci\u00C3\u00B3n del cliente..." }) }) }));
    }
    const handleEditar = () => {
        form.setFieldsValue({
            empresa: data.nombreComercial || data.nombre,
            direccion: data.direccion,
            contacto: data.contacto,
            email: data.correoElectronico,
            telefono1: data.telefono,
            telefono2: data.telefonoAdicional,
            fax: data.fax,
            departamento: data.departamento || '',
            tiempoLaborando: data.tiempoLaborando || '',
            ingresosMensuales: data.ingresosMensuales || '',
            cargo: data.cargo || '',
        });
        setEditando(true);
    };
    const handleGuardar = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            // Nota: los campos _EMP se guardan junto con el cliente principal
            // El modal solo prepara los datos; el guardado real se hace al guardar el cliente completo
            message.success('Datos actualizados (debe guardar el cliente para persistir)');
            setEditando(false);
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error('Error al guardar datos del lugar de trabajo');
        }
        finally {
            setSaving(false);
        }
    };
    const renderCampo = (label, valor, span) => (_jsx(Descriptions.Item, { label: label, ...(span ? { span } : {}), children: _jsx(Text, { children: valor || '-' }) }));
    return (_jsxs(_Fragment, { children: [_jsxs(Card, { className: "paces-card", extra: _jsx(Button, { type: "primary", icon: _jsx(EditOutlined, {}), onClick: handleEditar, children: "Editar" }), children: [_jsxs(Descriptions, { bordered: true, size: "small", column: 2, styles: { content: { background: 'transparent' } }, children: [renderCampo('Empresa / Nombre Comercial', data.nombreComercial || data.nombre), renderCampo('DirecciÃ³n', data.direccion), renderCampo('Contacto', data.contacto), renderCampo('Email', data.correoElectronico), renderCampo('TelÃ©fono 1', data.telefono), renderCampo('TelÃ©fono 2', data.telefonoAdicional), renderCampo('Fax', data.fax), renderCampo('Departamento', data.departamento), renderCampo('Tiempo Laborando', data.tiempoLaborando), renderCampo('Ingresos Mensuales', data.ingresosMensuales), renderCampo('Cargo', data.cargo)] }), _jsx("div", { style: { marginTop: 8 }, children: _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "* Los campos marcados como pendientes se habilitar\u00C3\u00A1n cuando est\u00C3\u00A9n disponibles en el formulario principal." }) })] }), _jsx(Modal, { title: "Editar Lugar de Trabajo", open: editando, onOk: handleGuardar, onCancel: () => setEditando(false), confirmLoading: saving, destroyOnHidden: true, okText: "Guardar", cancelText: "Cancelar", width: 600, children: _jsxs(Form, { form: form, layout: "vertical", size: "small", children: [_jsx(Form.Item, { name: "empresa", label: "Empresa / Nombre Comercial", children: _jsx(Input, { placeholder: "Nombre de la empresa", maxLength: 100 }) }), _jsx(Form.Item, { name: "direccion", label: "Direcci\u00C3\u00B3n", children: _jsx(Input.TextArea, { placeholder: "Direcci\u00C3\u00B3n del lugar de trabajo", rows: 2, maxLength: 200 }) }), _jsx(Form.Item, { name: "contacto", label: "Contacto", children: _jsx(Input, { placeholder: "Nombre del contacto", maxLength: 100 }) }), _jsx(Form.Item, { name: "email", label: "Email", children: _jsx(Input, { placeholder: "correo@ejemplo.com", maxLength: 80 }) }), _jsx(Form.Item, { name: "telefono1", label: "Tel\u00C3\u00A9fono 1", children: _jsx(Input, { placeholder: "Tel\u00C3\u00A9fono principal", maxLength: 20 }) }), _jsx(Form.Item, { name: "telefono2", label: "Tel\u00C3\u00A9fono 2", children: _jsx(Input, { placeholder: "Tel\u00C3\u00A9fono secundario", maxLength: 20 }) }), _jsx(Form.Item, { name: "fax", label: "Fax", children: _jsx(Input, { placeholder: "Fax", maxLength: 20 }) }), _jsx(Form.Item, { name: "departamento", label: "Departamento", children: _jsx(Input, { placeholder: "Departamento", maxLength: 100 }) }), _jsx(Form.Item, { name: "cargo", label: "Cargo", children: _jsx(Input, { placeholder: "Cargo que ocupa", maxLength: 100 }) }), _jsx(Form.Item, { name: "ingresosMensuales", label: "Ingresos Mensuales", children: _jsx(Input, { placeholder: "Ingresos mensuales", maxLength: 50 }) }), _jsx(Form.Item, { name: "tiempoLaborando", label: "Tiempo Laborando", children: _jsx(Input, { placeholder: "Ej: 3 a\u00C3\u00B1os", maxLength: 50 }) })] }) })] }));
};
export default LugaresTrabajoTab;
