import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Input, Select, message, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../../stores/authStore';
import { entidadContactoApi } from '../../../api/entidadContactoApi';
const TIPOS_TELEFONO = ['Principal', 'Oficina', 'Celular', 'Fax', 'Otro'];
const TIPOS_EMAIL = ['Principal', 'Facturación', 'Cobros', 'Otro'];
const TIPOS_DIRECCION = ['Principal', 'Cobros', 'Envío', 'Otra'];
const ContactosTab = ({ codigoCliente }) => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    // Teléfonos
    const [telefonos, setTelefonos] = useState([]);
    const [loadingTel, setLoadingTel] = useState(false);
    // Emails
    const [emails, setEmails] = useState([]);
    const [loadingEmail, setLoadingEmail] = useState(false);
    // Direcciones
    const [direcciones, setDirecciones] = useState([]);
    const [loadingDir, setLoadingDir] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const cargarTodo = useCallback(async () => {
        setLoadingTel(true);
        setLoadingEmail(true);
        setLoadingDir(true);
        try {
            const [tels, mails, dirs] = await Promise.all([
                entidadContactoApi.obtenerTelefonos(sucursalActiva, codigoCliente),
                entidadContactoApi.obtenerEmails(sucursalActiva, codigoCliente),
                entidadContactoApi.obtenerDirecciones(sucursalActiva, codigoCliente),
            ]);
            setTelefonos(tels.length > 0 ? tels : [{ id: 0, codigoEntidad: codigoCliente, tipo: 'Principal', numero: '', extension: '', principal: true }]);
            setEmails(mails.length > 0 ? mails : [{ id: 0, codigoEntidad: codigoCliente, tipo: 'Principal', email: '', principal: true }]);
            setDirecciones(dirs.length > 0 ? dirs : [{ id: 0, codigoEntidad: codigoCliente, tipo: 'Principal', direccion: '', ciudad: '', provincia: '', sector: '', principal: true }]);
        }
        catch {
            message.error('Error al cargar datos de contacto');
        }
        finally {
            setLoadingTel(false);
            setLoadingEmail(false);
            setLoadingDir(false);
        }
    }, [sucursalActiva, codigoCliente]);
    useEffect(() => { cargarTodo(); }, [cargarTodo]);
    const handleGuardar = async () => {
        // Validar: al menos un teléfono, email o dirección con datos
        const tieneTel = telefonos.some(t => t.numero);
        const tieneEmail = emails.some(e => e.email);
        const tieneDir = direcciones.some(d => d.direccion);
        if (!tieneTel && !tieneEmail && !tieneDir) {
            message.warning('Debe agregar al menos un teléfono, un correo electrónico o una dirección.');
            return;
        }
        setGuardando(true);
        try {
            await Promise.all([
                entidadContactoApi.guardarTelefonos(sucursalActiva, codigoCliente, telefonos.filter(t => t.numero)),
                entidadContactoApi.guardarEmails(sucursalActiva, codigoCliente, emails.filter(e => e.email)),
                entidadContactoApi.guardarDirecciones(sucursalActiva, codigoCliente, direcciones.filter(d => d.direccion)),
            ]);
            message.success('Datos de contacto guardados correctamente');
        }
        catch {
            message.error('Error al guardar datos de contacto');
        }
        finally {
            setGuardando(false);
        }
    };
    return (_jsxs("div", { style: { padding: 16 }, children: [_jsx(Alert, { message: "Debe agregar al menos un tel\u00E9fono, un correo electr\u00F3nico o una direcci\u00F3n.", type: "info", showIcon: true, style: { marginBottom: 16 } }), _jsx(Card, { size: "small", title: "Tel\u00E9fonos", extra: _jsx(Button, { size: "small", icon: _jsx(PlusOutlined, {}), onClick: () => setTelefonos([...telefonos, { id: 0, codigoEntidad: codigoCliente, tipo: 'Celular', numero: '', extension: '', principal: false }]), children: "Agregar" }), style: { marginBottom: 16 }, children: _jsx(Table, { dataSource: telefonos, columns: [
                        { title: 'Tipo', dataIndex: 'tipo', width: 120, render: (v, _, idx) => (_jsx(Select, { size: "small", value: v, onChange: (val) => { const c = [...telefonos]; c[idx].tipo = val; setTelefonos(c); }, style: { width: 120 }, options: TIPOS_TELEFONO.map(t => ({ value: t, label: t })) })) },
                        { title: 'Número', dataIndex: 'numero', render: (v, _, idx) => (_jsx(Input, { size: "small", value: v, onChange: (e) => { const c = [...telefonos]; c[idx].numero = e.target.value; setTelefonos(c); }, placeholder: "Tel\u00E9fono" })) },
                        { title: 'Extensión', dataIndex: 'extension', width: 100, render: (v, _, idx) => (_jsx(Input, { size: "small", value: v, onChange: (e) => { const c = [...telefonos]; c[idx].extension = e.target.value; setTelefonos(c); }, placeholder: "Ext" })) },
                        { title: '', width: 50, render: (_, __, idx) => telefonos.length > 1 ? (_jsx(Button, { type: "text", danger: true, icon: _jsx(DeleteOutlined, {}), onClick: () => setTelefonos(telefonos.filter((_, i) => i !== idx)) })) : null },
                    ], rowKey: (_, idx) => String(idx), pagination: false, size: "small", loading: loadingTel }) }), _jsx(Card, { size: "small", title: "Correos Electr\u00F3nicos", extra: _jsx(Button, { size: "small", icon: _jsx(PlusOutlined, {}), onClick: () => setEmails([...emails, { id: 0, codigoEntidad: codigoCliente, tipo: 'Otro', email: '', principal: false }]), children: "Agregar" }), style: { marginBottom: 16 }, children: _jsx(Table, { dataSource: emails, columns: [
                        { title: 'Tipo', dataIndex: 'tipo', width: 130, render: (v, _, idx) => (_jsx(Select, { size: "small", value: v, onChange: (val) => { const c = [...emails]; c[idx].tipo = val; setEmails(c); }, style: { width: 130 }, options: TIPOS_EMAIL.map(t => ({ value: t, label: t })) })) },
                        { title: 'Email', dataIndex: 'email', render: (v, _, idx) => (_jsx(Input, { size: "small", value: v, onChange: (e) => { const c = [...emails]; c[idx].email = e.target.value; setEmails(c); }, placeholder: "correo@ejemplo.com" })) },
                        { title: '', width: 50, render: (_, __, idx) => emails.length > 1 ? (_jsx(Button, { type: "text", danger: true, icon: _jsx(DeleteOutlined, {}), onClick: () => setEmails(emails.filter((_, i) => i !== idx)) })) : null },
                    ], rowKey: (_, idx) => String(idx), pagination: false, size: "small", loading: loadingEmail }) }), _jsx(Card, { size: "small", title: "Direcciones", extra: _jsx(Button, { size: "small", icon: _jsx(PlusOutlined, {}), onClick: () => setDirecciones([...direcciones, { id: 0, codigoEntidad: codigoCliente, tipo: 'Otra', direccion: '', ciudad: '', provincia: '', sector: '', principal: false }]), children: "Agregar" }), style: { marginBottom: 16 }, children: _jsx(Table, { dataSource: direcciones, columns: [
                        { title: 'Tipo', dataIndex: 'tipo', width: 100, render: (v, _, idx) => (_jsx(Select, { size: "small", value: v, onChange: (val) => { const c = [...direcciones]; c[idx].tipo = val; setDirecciones(c); }, style: { width: 100 }, options: TIPOS_DIRECCION.map(t => ({ value: t, label: t })) })) },
                        { title: 'Dirección', dataIndex: 'direccion', render: (v, _, idx) => (_jsx(Input, { size: "small", value: v, onChange: (e) => { const c = [...direcciones]; c[idx].direccion = e.target.value; setDirecciones(c); }, placeholder: "Direcci\u00F3n" })) },
                        { title: 'Ciudad', dataIndex: 'ciudad', width: 120, render: (v, _, idx) => (_jsx(Input, { size: "small", value: v, onChange: (e) => { const c = [...direcciones]; c[idx].ciudad = e.target.value; setDirecciones(c); }, placeholder: "Ciudad" })) },
                        { title: 'Provincia', dataIndex: 'provincia', width: 120, render: (v, _, idx) => (_jsx(Input, { size: "small", value: v, onChange: (e) => { const c = [...direcciones]; c[idx].provincia = e.target.value; setDirecciones(c); }, placeholder: "Provincia" })) },
                        { title: 'Sector', dataIndex: 'sector', width: 120, render: (v, _, idx) => (_jsx(Input, { size: "small", value: v, onChange: (e) => { const c = [...direcciones]; c[idx].sector = e.target.value; setDirecciones(c); }, placeholder: "Sector" })) },
                        { title: '', width: 50, render: (_, __, idx) => direcciones.length > 1 ? (_jsx(Button, { type: "text", danger: true, icon: _jsx(DeleteOutlined, {}), onClick: () => setDirecciones(direcciones.filter((_, i) => i !== idx)) })) : null },
                    ], rowKey: (_, idx) => String(idx), pagination: false, size: "small", loading: loadingDir }) }), _jsx(Button, { type: "primary", loading: guardando, onClick: handleGuardar, children: "Guardar Datos de Contacto" })] }));
};
export default ContactosTab;
