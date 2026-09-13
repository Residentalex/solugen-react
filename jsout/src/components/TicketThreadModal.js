import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { Modal, Typography, Select, Input, Button, Space, Spin, Tag, message, Divider, Empty } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { ticketApi } from '../api/ticketApi';
const { TextArea } = Input;
const ESTADO_COLORS = {
    Abierto: 'blue',
    EnProceso: 'gold',
    Resuelto: 'green',
    Cerrado: 'default',
};
const ESTADOS_VALIDOS = ['Abierto', 'EnProceso', 'Resuelto', 'Cerrado'];
function formatFecha(iso) {
    if (!iso)
        return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('es-DO', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}
const TicketThreadModal = ({ open, ticketID, onClose }) => {
    const sucursal = useAuthStore((s) => s.compania);
    const usuarioID = useAuthStore((s) => s.usuario?.id);
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(false);
    const [nuevoMensaje, setNuevoMensaje] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [estadoEdit, setEstadoEdit] = useState('');
    const cargarTicket = async () => {
        if (!sucursal)
            return;
        setLoading(true);
        try {
            const t = await ticketApi.obtener(sucursal, ticketID);
            setTicket(t);
            setEstadoEdit(t.estado);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar ticket');
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (open && ticketID)
            cargarTicket();
    }, [open, ticketID]);
    const handleResponder = async () => {
        if (!sucursal || !usuarioID || !nuevoMensaje.trim())
            return;
        setEnviando(true);
        try {
            await ticketApi.responder(sucursal, ticketID, {
                usuarioID,
                mensaje: nuevoMensaje.trim(),
            });
            setNuevoMensaje('');
            await cargarTicket();
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al enviar respuesta');
        }
        finally {
            setEnviando(false);
        }
    };
    const handleCambiarEstado = async (estado) => {
        if (!sucursal)
            return;
        try {
            await ticketApi.cambiarEstado(sucursal, ticketID, { estado, usuarioID: usuarioID });
            setEstadoEdit(estado);
            message.success(`Estado cambiado a: ${estado}`);
            await cargarTicket();
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cambiar estado');
        }
    };
    return (_jsx(Modal, { title: ticket ? `${ticket.numero || `#${ticket.id}`} - ${ticket.titulo}` : 'Cargando...', open: open, onCancel: onClose, footer: null, width: 640, destroyOnHidden: true, children: loading ? (_jsx("div", { style: { textAlign: 'center', padding: 40 }, children: _jsx(Spin, {}) })) : ticket ? (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }, children: [_jsx(Tag, { style: { fontFamily: 'monospace', fontWeight: 600 }, children: ticket.numero || `#${ticket.id}` }), _jsx(Tag, { color: ESTADO_COLORS[ticket.estado] || 'default', children: ticket.estado }), _jsx(Tag, { children: ticket.prioridad }), _jsx("span", { style: { fontSize: 12, color: '#888' }, children: formatFecha(ticket.fechaCreacion) }), _jsx("span", { style: { fontSize: 12, color: '#888' }, children: ticket.nombreUsuarioOrigen ? `Creado por: ${ticket.nombreUsuarioOrigen}` : '' })] }), _jsx("div", { style: {
                        background: '#fafafa',
                        borderRadius: 6,
                        padding: '12px 16px',
                        marginBottom: 16,
                        border: '1px solid #f0f0f0',
                    }, children: _jsx(Typography.Text, { children: ticket.mensaje }) }), _jsx(Divider, { style: { margin: '12px 0' }, children: "Historial de respuestas" }), _jsx("div", { style: { maxHeight: 300, overflowY: 'auto', marginBottom: 16 }, children: ticket.respuestas.length === 0 ? (_jsx(Empty, { description: "Sin respuestas a\u00FAn", image: Empty.PRESENTED_IMAGE_SIMPLE })) : (_jsx(Space, { direction: "vertical", style: { width: '100%' }, size: 8, children: ticket.respuestas.map((r) => (_jsxs("div", { style: {
                                background: '#fafafa',
                                borderRadius: 6,
                                padding: '10px 14px',
                                border: '1px solid #f0f0f0',
                            }, children: [_jsxs("div", { style: { fontSize: 11, color: '#888', marginBottom: 4 }, children: [r.nombreUsuario || `Usuario #${r.usuarioID}`, " \u00B7 ", formatFecha(r.fechaCreacion)] }), _jsx(Typography.Text, { children: r.mensaje })] }, r.id))) })) }), _jsxs("div", { style: { marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(Typography.Text, { strong: true, style: { fontSize: 13 }, children: "Estado:" }), _jsx(Select, { value: estadoEdit, onChange: handleCambiarEstado, style: { width: 150 }, options: ESTADOS_VALIDOS.map((e) => ({ label: e, value: e })) })] }), ticket.estado !== 'Cerrado' && (_jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx(TextArea, { rows: 2, value: nuevoMensaje, onChange: (e) => setNuevoMensaje(e.target.value), placeholder: "Escribe una respuesta..." }), _jsx(Button, { type: "primary", icon: _jsx(SendOutlined, {}), onClick: handleResponder, loading: enviando, disabled: !nuevoMensaje.trim() })] }))] })) : null }));
};
export default TicketThreadModal;
