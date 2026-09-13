import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Drawer, Descriptions, Row, Col, Button, Space, Spin, Input, Modal, message, Typography, Badge, } from 'antd';
import { ReloadOutlined, PauseCircleOutlined, SyncOutlined, SettingOutlined, SignalFilled, SearchOutlined, DatabaseOutlined, CreditCardOutlined, } from '@ant-design/icons';
import { useMonitoreoStore } from '../../stores/monitoreoStore';
import { useAuthStore } from '../../stores/authStore';
import { monitoreoApi } from '../../api/monitoreoApi';
import { consultaRNCApi } from '../../api/consultaRNCApi';
import CajaCard from './CajaCard';
import SyncModal from './SyncModal';
import ConfigModal from './ConfigModal';
const { Text } = Typography;
const connectionStringLabels = {
    serverConnection: 'Server',
    clientConnection: 'Client',
    rncConnection: 'RNC',
    rncClienteConnection: 'RNC Cliente',
};
const MonitoreoCajas = () => {
    // ─── Estado local ──────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [drawerCaja, setDrawerCaja] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [syncModalOpen, setSyncModalOpen] = useState(false);
    const [syncAllModalOpen, setSyncAllModalOpen] = useState(false);
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [signalRReady, setSignalRReady] = useState(false);
    const [rncBuscado, setRncBuscado] = useState('');
    const [resultadoRNC, setResultadoRNC] = useState(null);
    const [buscandoRNC, setBuscandoRNC] = useState(false);
    const [guardandoRNC, setGuardandoRNC] = useState(false);
    const [registroGuardado, setRegistroGuardado] = useState(null);
    const [rncModalOpen, setRncModalOpen] = useState(false);
    const signalRReadyRef = useRef(false);
    // ─── Store ─────────────────────────────────────────────────
    const { cajasMap, signalRConectado, ultimaActualizacion, setCajas, actualizarCaja, marcarDesconectada, setSignalRConectado, setUltimaActualizacion, } = useMonitoreoStore();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const navigate = useNavigate();
    // ─── Handlers ──────────────────────────────────────────────
    const handleRefresh = useCallback(async () => {
        setLoading(true);
        try {
            const cajas = sucursalActiva != null
                ? await monitoreoApi.obtenerPorSucursal(sucursalActiva)
                : await monitoreoApi.obtenerTodas();
            setCajas(cajas);
            setUltimaActualizacion(new Date().toISOString());
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar cajas');
        }
        finally {
            setLoading(false);
        }
    }, [setCajas, setUltimaActualizacion, sucursalActiva]);
    const handleCajaClick = useCallback((caja) => {
        setDrawerCaja(caja);
        setDrawerOpen(true);
    }, []);
    const handlePausar = useCallback(async () => {
        if (!drawerCaja)
            return;
        try {
            await monitoreoApi.pausar(drawerCaja.ip);
            message.success(`Caja ${drawerCaja.nombre} pausada`);
            handleRefresh();
            setDrawerOpen(false);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al pausar caja');
        }
    }, [drawerCaja, handleRefresh]);
    const handlePausarTodas = useCallback(async () => {
        try {
            await monitoreoApi.pausarTodas();
            message.success('Todas las cajas pausadas');
            handleRefresh();
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al pausar todas las cajas');
        }
    }, [handleRefresh]);
    // ─── Consulta de RNC / Cédula ─────────────────────────────
    const handleBuscarRNC = useCallback(async (valor) => {
        const rnc = (valor || '').trim();
        setRncBuscado(rnc);
        setResultadoRNC(null);
        setRegistroGuardado(null);
        if (!rnc)
            return;
        setBuscandoRNC(true);
        try {
            const resultado = await consultaRNCApi.consultar(sucursalActiva, rnc);
            setResultadoRNC(resultado);
            if (!resultado) {
                message.warning('RNC no encontrado en BD local ni en DGII');
            }
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al consultar RNC');
        }
        finally {
            setBuscandoRNC(false);
        }
    }, [sucursalActiva]);
    const handleGuardarRNC = useCallback(async () => {
        if (!rncBuscado)
            return;
        setGuardandoRNC(true);
        try {
            const registro = await consultaRNCApi.guardar(sucursalActiva, rncBuscado);
            setRegistroGuardado(registro);
            message.success('Guardado en BD central correctamente');
            setRncModalOpen(false);
            // Sincronizar RNC a todas las cajas conectadas de la sucursal activa
            const cajasConectadas = Object.values(cajasMap).filter((c) => c.sucursal === sucursalActiva && c.conectado);
            if (cajasConectadas.length > 0) {
                message.loading({ content: `Enviando comando de sincronización a ${cajasConectadas.length} cajas...`, key: 'syncRNC', duration: 0 });
                let errores = 0;
                for (const caja of cajasConectadas) {
                    try {
                        await monitoreoApi.sincronizar(caja.ip, { tipos: ['RNC'], syncAll: false });
                    }
                    catch {
                        errores++;
                    }
                }
                message.destroy('syncRNC');
                if (errores === 0) {
                    message.success(`Comando de sincronización enviado a ${cajasConectadas.length} cajas`);
                }
                else {
                    message.warning(`Comando enviado a ${cajasConectadas.length - errores} de ${cajasConectadas.length} cajas; ${errores} caja(s) aparecían conectadas pero no respondieron`);
                }
            }
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al guardar RNC');
        }
        finally {
            setGuardandoRNC(false);
        }
    }, [sucursalActiva, rncBuscado, cajasMap]);
    // ─── SignalR setup ─────────────────────────────────────────
    useEffect(() => {
        const conectar = async () => {
            try {
                await monitoreoApi.conectarHub({
                    onCajaActualizada: (caja) => {
                        actualizarCaja(caja);
                        setUltimaActualizacion(new Date().toISOString());
                    },
                    onCajaDesconectada: (ip) => {
                        marcarDesconectada(ip);
                        setUltimaActualizacion(new Date().toISOString());
                    },
                    onCajaConectada: (caja) => {
                        actualizarCaja(caja);
                        setUltimaActualizacion(new Date().toISOString());
                    },
                });
                setSignalRReady(true);
                signalRReadyRef.current = true;
            }
            catch {
                // SignalR no crítico para la funcionalidad base
                console.warn('[Monitoreo] SignalR no disponible, funcionando solo con REST');
            }
        };
        // Escuchar cambios de estado de conexión SignalR
        const unsubscribe = monitoreoApi.onStateChange((conectado) => {
            setSignalRConectado(conectado);
        });
        conectar();
        return () => {
            unsubscribe();
            monitoreoApi.desconectarHub();
        };
    }, [actualizarCaja, marcarDesconectada, setSignalRConectado, setUltimaActualizacion]);
    // ─── Carga inicial ─────────────────────────────────────────
    useEffect(() => {
        handleRefresh();
    }, [handleRefresh]);
    // ─── Auto-refresh periódico ────────────────────────────────
    useEffect(() => {
        const intervalo = setInterval(() => {
            if (!loading) {
                handleRefresh();
            }
        }, 30000); // 30 segundos
        return () => clearInterval(intervalo);
    }, [handleRefresh, loading]);
    // ─── Filtrar cajas por sucursal activa ─────────────────────
    const cajasFiltradas = useMemo(() => Object.values(cajasMap).filter((c) => c.sucursal === sucursalActiva), [cajasMap, sucursalActiva]);
    const conectadasCount = useMemo(() => cajasFiltradas.filter((c) => c.conectado).length, [cajasFiltradas]);
    const ipsConectadas = useMemo(() => cajasFiltradas.filter((c) => c.conectado).map((c) => c.ip), [cajasFiltradas]);
    // ─── Render ────────────────────────────────────────────────
    const hayConectadas = Object.values(cajasMap).some((c) => c.conectado);
    return (_jsxs(_Fragment, { children: [_jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                marginBottom: 16,
                                flexWrap: 'wrap',
                            }, children: [_jsx(Typography.Title, { level: 5, style: { margin: 0, whiteSpace: 'nowrap' }, children: "Monitoreo de Cajas" }), _jsx(Badge, { status: signalRConectado ? 'success' : 'error', text: _jsx(Text, { style: { fontSize: 12, color: '#8c8c8c' }, children: signalRConectado ? 'Servicio activo' : 'Servicio desconectado' }) }), _jsx("div", { style: { flex: 1 } }), _jsxs(Space, { size: 8, children: [_jsx(Button, { icon: _jsx(SearchOutlined, {}), onClick: () => {
                                                setRncBuscado('');
                                                setResultadoRNC(null);
                                                setRegistroGuardado(null);
                                                setRncModalOpen(true);
                                            }, children: "Consultar RNC" }), _jsx(Button, { icon: _jsx(CreditCardOutlined, {}), onClick: () => navigate('/TVISANET'), size: "small", children: "Visanet" }), hayConectadas && (_jsx(Button, { icon: _jsx(PauseCircleOutlined, {}), onClick: handlePausarTodas, size: "small", children: "Pausar todas" })), hayConectadas && (_jsx(Button, { icon: _jsx(SyncOutlined, {}), onClick: () => setSyncAllModalOpen(true), size: "small", children: "Actualizar todas" })), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: handleRefresh, loading: loading })] })] }) }), _jsxs(Modal, { title: "Consulta de RNC / C\u00E9dula", open: rncModalOpen, onCancel: () => setRncModalOpen(false), footer: null, width: 560, children: [_jsxs("div", { style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    flexWrap: 'wrap',
                                    marginBottom: 16,
                                }, children: [_jsx(Input.Search, { placeholder: "Buscar RNC o C\u00E9dula...", allowClear: true, onSearch: handleBuscarRNC, style: { width: 380 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }), enterButton: "Buscar", loading: buscandoRNC }), _jsx(Button, { type: "primary", icon: _jsx(DatabaseOutlined, {}), onClick: handleGuardarRNC, disabled: !resultadoRNC, loading: guardandoRNC, children: "Actualizar BD" })] }), resultadoRNC && (_jsxs(Descriptions, { bordered: true, size: "small", column: 1, children: [_jsx(Descriptions.Item, { label: "Nombre / Raz\u00F3n Social", children: resultadoRNC.nombre || '—' }), _jsx(Descriptions.Item, { label: "RNC / C\u00E9dula", children: resultadoRNC.identificacion || rncBuscado }), resultadoRNC.tipoNCF && (_jsx(Descriptions.Item, { label: "Tipo NCF", children: resultadoRNC.tipoNCF })), resultadoRNC.nombreTipoComprobante && (_jsx(Descriptions.Item, { label: "Tipo Comprobante", children: resultadoRNC.nombreTipoComprobante })), registroGuardado && (_jsxs(_Fragment, { children: [_jsx(Descriptions.Item, { label: "R\u00E9gimen de pago", children: registroGuardado.regPago || '—' }), _jsx(Descriptions.Item, { label: "Estado", children: registroGuardado.estatus || '—' })] }))] }))] }), _jsx("div", { style: { padding: '0 24px 16px' }, children: _jsx(Spin, { spinning: loading, children: cajasFiltradas.length === 0 ? (_jsx("div", { style: { textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }, children: "No hay cajas en esta sucursal" })) : (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 12, fontSize: 13, color: '#8c8c8c' }, children: [conectadasCount, " de ", cajasFiltradas.length, " cajas conectadas"] }), _jsx(Row, { gutter: [12, 12], children: cajasFiltradas.map((caja) => (_jsx(Col, { xs: 24, sm: 12, md: 8, lg: 6, xl: 6, xxl: 4, children: _jsx(CajaCard, { caja: caja, onClick: handleCajaClick }) }, caja.ip))) })] })) }) })] }), _jsxs("div", { style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 24px',
                    marginTop: 8,
                    fontSize: 12,
                    color: '#8c8c8c',
                    borderTop: '1px solid #f0f0f0',
                }, children: [_jsxs(Space, { size: 12, children: [_jsx(SignalFilled, { style: { color: signalRConectado ? '#52c41a' : '#ff4d4f', fontSize: 14 } }), _jsxs("span", { children: ["SignalR:", ' ', signalRConectado ? 'Conectado' : 'Desconectado'] })] }), _jsx("span", { children: ultimaActualizacion
                            ? `Última actualización: ${new Date(ultimaActualizacion).toLocaleTimeString()}`
                            : 'Sin actualización' })] }), _jsx(Drawer, { title: drawerCaja?.nombre || 'Detalle de Caja', open: drawerOpen, onClose: () => setDrawerOpen(false), width: 500, footer: _jsxs(Space, { style: { float: 'right' }, children: [_jsx(Button, { icon: _jsx(SyncOutlined, {}), onClick: () => {
                                setSyncModalOpen(true);
                            }, children: "Sincronizar" }), _jsx(Button, { icon: _jsx(PauseCircleOutlined, {}), onClick: handlePausar, children: "Pausar" }), _jsx(Button, { icon: _jsx(SettingOutlined, {}), onClick: () => {
                                setConfigModalOpen(true);
                            }, children: "Configurar" })] }), children: drawerCaja && (_jsxs(_Fragment, { children: [_jsxs(Descriptions, { bordered: true, size: "small", column: 1, style: { marginBottom: 16 }, children: [_jsx(Descriptions.Item, { label: "Nombre", children: drawerCaja.nombre }), _jsx(Descriptions.Item, { label: "IP", children: _jsx(Text, { code: true, children: drawerCaja.ip }) }), _jsx(Descriptions.Item, { label: "Versi\u00F3n", children: drawerCaja.version }), _jsx(Descriptions.Item, { label: "No. Caja", children: drawerCaja.noCaja }), _jsx(Descriptions.Item, { label: "Estado", children: _jsx(Badge, { status: drawerCaja.conectado ? 'success' : 'error', text: drawerCaja.conectado ? 'Conectado' : 'Desconectado' }) }), _jsx(Descriptions.Item, { label: "DelayTime", children: drawerCaja.delayTime }), _jsx(Descriptions.Item, { label: "UpdaterServiceStatus", children: drawerCaja.updaterServiceStatus || '—' })] }), _jsx(Typography.Title, { level: 5, style: { marginTop: 16, marginBottom: 12 }, children: "ConnectionStrings" }), _jsx(Descriptions, { bordered: true, size: "small", column: 1, children: Object.entries(drawerCaja.connectionStrings).map(([key, value]) => (_jsx(Descriptions.Item, { label: connectionStringLabels[key] || key, children: _jsx(Text, { code: true, style: {
                                        fontSize: 11,
                                        wordBreak: 'break-all',
                                        whiteSpace: 'pre-wrap',
                                    }, children: value || '—' }) }, key))) })] })) }), drawerCaja && (_jsxs(_Fragment, { children: [_jsx(SyncModal, { ip: drawerCaja.ip, nombre: drawerCaja.nombre, open: syncModalOpen, onClose: () => setSyncModalOpen(false) }), _jsx(ConfigModal, { caja: drawerCaja, open: configModalOpen, onClose: () => setConfigModalOpen(false) })] })), _jsx(SyncModal, { ipList: ipsConectadas, open: syncAllModalOpen, onClose: () => setSyncAllModalOpen(false) })] }));
};
export default MonitoreoCajas;
