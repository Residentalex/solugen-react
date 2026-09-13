import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Badge, Button, Empty, Modal, message, Tooltip, Descriptions, Tag } from 'antd';
import { BellOutlined, CheckOutlined, RightOutlined, ClockCircleOutlined, WarningOutlined, InfoCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, CheckCircleOutlined, } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useNotificacionesStore } from '../stores/notificacionesStore';
import { useAuthStore } from '../stores/authStore';
import { ticketApi } from '../api/ticketApi';
import TicketThreadModal from './TicketThreadModal';
function formatFechaRelativa(iso) {
    if (!iso)
        return '';
    const ahora = Date.now();
    const fecha = new Date(iso).getTime();
    const diffMs = ahora - fecha;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)
        return 'Ahora';
    if (diffMin < 60)
        return `Hace ${diffMin} min`;
    const diffHoras = Math.floor(diffMin / 60);
    if (diffHoras < 24)
        return `Hace ${diffHoras} h`;
    const diffDias = Math.floor(diffHoras / 24);
    if (diffDias < 7)
        return `Hace ${diffDias} d`;
    return new Date(iso).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' });
}
function truncar(texto, max) {
    if (!texto)
        return '';
    return texto.length > max ? texto.substring(0, max) + '...' : texto;
}
// Mapa de tipo → icono y color
const TIPO_CONFIG = {
    Alerta: { icon: _jsx(WarningOutlined, {}), color: '#f1b44c' },
    Info: { icon: _jsx(InfoCircleOutlined, {}), color: '#556ee6' },
    Error: { icon: _jsx(CloseCircleOutlined, {}), color: '#f46a6a' },
    Advertencia: { icon: _jsx(ExclamationCircleOutlined, {}), color: '#f1b44c' },
    Exito: { icon: _jsx(CheckCircleOutlined, {}), color: '#34c38f' },
};
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
const POLLING_INTERVAL = 30000; // 30 segundos
const NotificacionDropdown = () => {
    const navigate = useNavigate();
    const [abierto, setAbierto] = useState(false);
    const [ticketModalID, setTicketModalID] = useState(null);
    const [verNotificacion, setVerNotificacion] = useState(null);
    const [cargandoEstado, setCargandoEstado] = useState(false);
    const dropdownRef = useRef(null);
    const intervalRef = useRef(null);
    const sucursal = useAuthStore((s) => s.compania);
    const usuario = useAuthStore((s) => s.usuario);
    const pendientes = useNotificacionesStore((s) => s.pendientes);
    const cantidadPendientes = useNotificacionesStore((s) => s.cantidadPendientes);
    const cargarPendientes = useNotificacionesStore((s) => s.cargarPendientes);
    const marcarComoLeida = useNotificacionesStore((s) => s.marcarComoLeida);
    const conectado = useNotificacionesStore((s) => s.conectado);
    // Carga inicial
    useEffect(() => {
        cargarPendientes();
    }, [cargarPendientes]);
    // Recargar cuando se conecte SignalR (para asegurar datos frescos)
    useEffect(() => {
        if (conectado) {
            cargarPendientes();
        }
    }, [conectado, cargarPendientes]);
    // Polling cada 30s cuando no hay SignalR
    useEffect(() => {
        if (!conectado) {
            intervalRef.current = setInterval(() => {
                cargarPendientes();
            }, POLLING_INTERVAL);
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [conectado, cargarPendientes]);
    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setAbierto(false);
            }
        };
        if (abierto) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [abierto]);
    const handleMarcarLeida = useCallback(async (notificacionUsuarioID) => {
        await marcarComoLeida(notificacionUsuarioID);
    }, [marcarComoLeida]);
    const handleMarcarTodas = useCallback(() => {
        Modal.confirm({
            title: 'Marcar todas como leídas',
            content: '¿Marcar todas las notificaciones como leídas?',
            okText: 'Sí, marcar todas',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await Promise.all(pendientes.map((n) => marcarComoLeida(n.notificacionUsuarioID)));
                    message.success('Todas marcadas como leídas');
                    await cargarPendientes();
                }
                catch (err) {
                    message.error(err?.response?.data?.errorMessage || 'Error al marcar notificaciones');
                }
            },
        });
    }, [pendientes, marcarComoLeida, cargarPendientes]);
    const handleNavigate = useCallback((url) => {
        setAbierto(false);
        navigate(url);
    }, [navigate]);
    const handleVerTodas = useCallback(() => {
        setAbierto(false);
        navigate('/notificaciones', { state: { tab: 'historial' } });
    }, [navigate]);
    return (_jsxs("div", { ref: dropdownRef, style: { position: 'relative', display: 'inline-block' }, children: [_jsx("button", { className: "paces-topbar-action-btn", title: "Notificaciones", onClick: () => setAbierto(!abierto), style: { position: 'relative' }, children: _jsx(Badge, { count: cantidadPendientes, size: "small", offset: [-2, 2], children: _jsx(BellOutlined, { style: { fontSize: 16 } }) }) }), abierto && (_jsxs("div", { style: {
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 380,
                    maxHeight: 480,
                    background: 'var(--paces-bg-elevated)',
                    borderRadius: 12,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                    border: '1px solid var(--paces-border)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }, children: [_jsxs("div", { style: {
                            padding: '14px 16px',
                            borderBottom: '1px solid var(--paces-border)',
                        }, children: [_jsxs("div", { style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }, children: [_jsx("span", { style: { fontWeight: 600, fontSize: 14, color: 'var(--paces-text-heading)' }, children: "Notificaciones" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 4 }, children: [pendientes.length > 0 && (_jsx(Button, { type: "link", size: "small", onClick: handleMarcarTodas, style: { fontSize: 12 }, children: "\u2713 Marcar todas" })), _jsxs(Button, { type: "link", size: "small", onClick: handleVerTodas, style: { fontSize: 12 }, children: ["Ver todas ", _jsx(RightOutlined, { style: { fontSize: 10 } })] })] })] }), _jsxs("div", { style: { fontSize: 11, color: 'var(--paces-text-secondary)', marginTop: 2 }, children: [cantidadPendientes > 0 ? `${cantidadPendientes} nueva${cantidadPendientes !== 1 ? 's' : ''}` : '0 nuevas', ' · ', conectado ? (_jsx("span", { style: { color: '#34c38f' }, children: "\u25CF Conectado" })) : (_jsx(Tooltip, { title: "Las notificaciones se actualizan cada 30 segundos", children: _jsx("span", { style: { color: 'var(--paces-text-secondary)' }, children: "\u25CC Sin conexi\u00F3n en tiempo real" }) }))] })] }), _jsx("div", { style: { overflowY: 'auto', flex: 1 }, children: pendientes.length === 0 ? (_jsxs("div", { style: { padding: '32px 16px', textAlign: 'center' }, children: [_jsx(Empty, { description: _jsxs(_Fragment, { children: ["Est\u00E1s al d\u00EDa ", _jsx("span", { role: "img", "aria-label": "fiesta", children: "\uD83C\uDF89" })] }), image: Empty.PRESENTED_IMAGE_SIMPLE }), _jsx(Button, { type: "link", size: "small", onClick: handleVerTodas, style: { marginTop: 4 }, children: "Ver historial" })] })) : (pendientes.slice(0, 5).map((notif) => (_jsx(NotificacionItem, { notificacion: notif, onMarcarLeida: handleMarcarLeida, onNavigate: handleNavigate, onAbrirTicket: setTicketModalID, onAbrirDetalle: setVerNotificacion }, notif.notificacionUsuarioID)))) }), pendientes.length > 5 && (_jsx("div", { style: {
                            padding: '10px 16px',
                            borderTop: '1px solid var(--paces-border)',
                            textAlign: 'center',
                        }, children: _jsxs(Button, { type: "link", size: "small", onClick: handleVerTodas, style: { fontSize: 12 }, children: ["Ver todas las notificaciones (", pendientes.length, ")"] }) }))] })), _jsx(Modal, { title: verNotificacion?.titulo || 'Notificación', open: !!verNotificacion, onCancel: () => setVerNotificacion(null), footer: null, width: 520, children: verNotificacion && (_jsxs(_Fragment, { children: [_jsxs(Descriptions, { column: 1, bordered: true, size: "small", children: [_jsx(Descriptions.Item, { label: "Mensaje", children: _jsx("div", { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 300, overflowY: 'auto' }, children: verNotificacion.mensaje }) }), _jsx(Descriptions.Item, { label: "M\u00F3dulo", children: verNotificacion.modulo || '-' }), _jsx(Descriptions.Item, { label: "Tipo", children: _jsx(Tag, { color: TIPO_CONFIG[verNotificacion.tipo]?.color || '#556ee6', children: verNotificacion.tipo || 'Info' }) }), _jsx(Descriptions.Item, { label: "Fecha", children: verNotificacion.fechaCreacion ? new Date(verNotificacion.fechaCreacion).toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-' }), _jsx(Descriptions.Item, { label: "Estado", children: _jsx(Tag, { color: verNotificacion.leida ? 'default' : 'blue', children: verNotificacion.leida ? 'Leída' : 'No leída' }) })] }), verNotificacion.tipo === 'Ticket' && verNotificacion.referenciaID && (_jsxs("div", { style: { marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }, children: [_jsx(Button, { type: "primary", onClick: () => {
                                        const id = verNotificacion.referenciaID;
                                        setVerNotificacion(null);
                                        setTicketModalID(id);
                                    }, children: "Ver ticket" }), _jsx(Button, { style: { borderColor: '#34c38f', color: '#34c38f' }, onClick: async () => {
                                        if (!sucursal || !verNotificacion?.referenciaID || !usuario)
                                            return;
                                        setCargandoEstado(true);
                                        try {
                                            await ticketApi.cambiarEstado(sucursal, verNotificacion.referenciaID, { estado: 'Resuelto', usuarioID: usuario.id });
                                            message.success('Ticket marcado como resuelto');
                                            setVerNotificacion(null);
                                        }
                                        catch (err) {
                                            message.error(err?.response?.data?.errorMessage || 'Error al marcar como resuelto');
                                        }
                                        finally {
                                            setCargandoEstado(false);
                                        }
                                    }, loading: cargandoEstado, children: "\u2713 Resolver" })] })), verNotificacion?.referenciaTipo === 'NotificacionSQL' && verNotificacion?.referenciaID && (_jsx("div", { style: { marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }, children: _jsx(Button, { type: "primary", onClick: () => {
                                    const id = verNotificacion.referenciaID;
                                    setVerNotificacion(null);
                                    navigate(`/visualizar-consulta/${id}`);
                                }, children: "Visualizar datos" }) }))] })) }), _jsx(TicketThreadModal, { open: ticketModalID !== null, ticketID: ticketModalID ?? 0, onClose: () => setTicketModalID(null) })] }));
};
// ───────── Item individual de notificacion ─────────
const NotificacionItem = ({ notificacion, onMarcarLeida, onNavigate, onAbrirTicket, onAbrirDetalle }) => {
    const [eliminando, setEliminando] = useState(false);
    const config = TIPO_CONFIG[notificacion.tipo] || { icon: _jsx(BellOutlined, {}), color: '#556ee6' };
    const handleClickLeida = useCallback(async () => {
        setEliminando(true);
        await new Promise((resolve) => setTimeout(resolve, 250));
        await onMarcarLeida(notificacion.notificacionUsuarioID);
    }, [onMarcarLeida, notificacion.notificacionUsuarioID]);
    const handleClickBody = useCallback(() => {
        if (!notificacion.leida) {
            onMarcarLeida(notificacion.notificacionUsuarioID);
        }
        if (notificacion.tipo === 'Ticket' && notificacion.referenciaID && onAbrirTicket) {
            onAbrirTicket(notificacion.referenciaID);
        }
        else if (notificacion.urlAccion && onNavigate) {
            onNavigate(notificacion.urlAccion);
        }
        else if (onAbrirDetalle) {
            onAbrirDetalle(notificacion);
        }
    }, [notificacion, onMarcarLeida, onNavigate, onAbrirTicket, onAbrirDetalle]);
    const tieneUrl = !!notificacion.urlAccion;
    const esTicket = notificacion.tipo === 'Ticket' && !!notificacion.referenciaID;
    const clickeable = tieneUrl || esTicket || !!onAbrirDetalle;
    return (_jsxs("div", { className: "paces-row-hover", style: {
            display: 'flex', gap: 12, padding: '12px 16px',
            borderBottom: '1px solid var(--paces-border-secondary)',
            cursor: 'default', alignItems: 'flex-start',
            opacity: eliminando ? 0 : notificacion.leida ? 0.65 : 1,
            transition: 'opacity 0.25s ease',
            pointerEvents: eliminando ? 'none' : undefined,
        }, children: [_jsxs("div", { style: { position: 'relative', width: 28, height: 28, flexShrink: 0 }, children: [!notificacion.leida && (_jsx("div", { style: {
                            position: 'absolute', top: -2, left: -2,
                            width: 6, height: 6, borderRadius: '50%',
                            backgroundColor: '#556ee6', zIndex: 1,
                        } })), _jsx("div", { style: {
                            width: 28, height: 28, borderRadius: '50%',
                            background: hexToRgba(config.color, 0.12),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, color: config.color, flexShrink: 0,
                        }, children: config.icon })] }), _jsxs("div", { onClick: clickeable ? handleClickBody : undefined, style: { flex: 1, minWidth: 0, cursor: clickeable ? 'pointer' : 'default' }, children: [_jsxs("div", { style: {
                            fontWeight: 600, fontSize: 13, color: 'var(--paces-text-heading)',
                            marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4,
                        }, children: [_jsx("span", { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: truncar(notificacion.titulo, 60) }), tieneUrl && !esTicket && (_jsx(RightOutlined, { style: { fontSize: 10, flexShrink: 0, color: 'var(--paces-text-secondary)' } }))] }), _jsx("div", { style: { fontSize: 12, color: 'var(--paces-text-secondary)', marginBottom: 4, lineHeight: 1.4 }, children: truncar(notificacion.mensaje, 100) }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--paces-text-secondary)' }, children: [_jsx(ClockCircleOutlined, { style: { fontSize: 10 } }), _jsx("span", { children: formatFechaRelativa(notificacion.fechaCreacion) }), _jsx("span", { style: { color: 'var(--paces-border)' }, children: "|" }), _jsx("span", { style: { color: config.color }, children: notificacion.tipo })] }), esTicket && (_jsx(Button, { type: "primary", size: "small", onClick: () => {
                            if (!notificacion.leida)
                                onMarcarLeida(notificacion.notificacionUsuarioID);
                            onAbrirTicket?.(notificacion.referenciaID);
                        }, style: { marginTop: 6, fontSize: 12 }, children: "Ver ticket" }))] }), _jsx(Button, { type: "text", size: "small", icon: _jsx(CheckOutlined, {}), onClick: handleClickLeida, style: { flexShrink: 0, marginTop: 2 }, title: "Marcar como le\u00EDda" })] }));
};
export default NotificacionDropdown;
