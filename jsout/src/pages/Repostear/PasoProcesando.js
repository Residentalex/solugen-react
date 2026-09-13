import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Progress, Typography, Button, Result, Spin, Tag, Alert } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined, CopyOutlined, ClearOutlined, RetweetOutlined } from '@ant-design/icons';
import { transaccionApi } from '../../api/transaccionApi';
import { repostearApi } from '../../api/repostearApi';
import { devolucionVentaApi } from '../../api/devolucionVentaApi';
import { entradaAlmacenApi } from '../../api/entradaAlmacenApi';
import { facturaClienteApi } from '../../api/facturaClienteApi';
import { useUIStore } from '../../stores/uiStore';
import { posteoHub } from '../../api/posteoHub';
import './Repostear.css';
const { Text } = Typography;
const ETAPAS_LOADER = [
    'Iniciando proceso...',
    'Conectando con el servidor...',
    'Esperando respuesta...',
    'Preparando documentos...',
];
// Helper: Procesa items en lotes paralelos con límite de concurrencia
async function procesarEnParalelo(items, concurrency, procesarItem, onChunkCompletado, canceladoRef) {
    let completados = 0;
    for (let i = 0; i < items.length; i += concurrency) {
        if (canceladoRef.current)
            break;
        const chunk = items.slice(i, i + concurrency);
        await Promise.all(chunk.map((item, idx) => procesarItem(item, i + idx)));
        completados += chunk.length;
        onChunkCompletado(completados, items.length);
    }
}
const PasoProcesando = ({ wizard, onTerminado, onReiniciar }) => {
    const primaryColor = useUIStore((s) => s.primaryColor);
    const [progreso, setProgreso] = useState(null);
    const [total, setTotal] = useState(0);
    const [exitosos, setExitosos] = useState(0);
    const [erroresCount, setErroresCount] = useState(0);
    const [log, setLog] = useState([]);
    const [errores, setErrores] = useState([]);
    const [cancelado, setCancelado] = useState(false);
    const [procesando, setProcesando] = useState(true);
    const [showLog, setShowLog] = useState(false);
    const [jobError, setJobError] = useState(null);
    const [conexionEstado, setConexionEstado] = useState('Desconectado');
    const [etapaLoaderIdx, setEtapaLoaderIdx] = useState(0);
    const [tiempoTranscurrido, setTiempoTranscurrido] = useState('00:00');
    const [velocidadDocs, setVelocidadDocs] = useState(0);
    const [watchdogActivo, setWatchdogActivo] = useState(false);
    const jobIdRef = useRef(null);
    const logRef = useRef(null);
    const startedRef = useRef(false);
    const canceladoRef = useRef(false);
    const tiempoInicioRef = useRef(Date.now());
    const velocidadRef = useRef({ docs: 0, time: Date.now() });
    const ultimoProgresoRef = useRef(null);
    const watchdogRef = useRef(null);
    const notificacionMostradaRef = useRef(false);
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [log]);
    const agregarLog = useCallback((entry) => {
        setLog((prev) => [...prev, entry]);
    }, []);
    // Suscripción al estado de conexión SignalR
    useEffect(() => {
        const unsub = posteoHub.onStateChange((state) => {
            setConexionEstado(state);
        });
        return unsub;
    }, []);
    // Mapa de APIs específicas por tipo de documento para posteo individual
    const API_ESPECIFICA = {
        DEV: devolucionVentaApi,
        ENP: entradaAlmacenApi,
        FAC: facturaClienteApi,
    };
    useEffect(() => {
        if (startedRef.current)
            return;
        startedRef.current = true;
        procesarDocumentos();
        return () => {
            // Cleanup: desuscribir y desconectar SignalR
            if (jobIdRef.current) {
                posteoHub.unsubscribeFromJob(jobIdRef.current).catch((err) => console.warn('Error al desuscribir SignalR en cleanup', err));
            }
            posteoHub.disconnect().catch((err) => console.warn('Error al desconectar SignalR en cleanup', err));
            document.title = 'Solugen ERP';
        };
    }, []);
    // Timer de tiempo transcurrido
    useEffect(() => {
        if (!procesando)
            return;
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - tiempoInicioRef.current) / 1000);
            const mins = Math.floor(elapsed / 60);
            const secs = elapsed % 60;
            setTiempoTranscurrido(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
        }, 1000);
        return () => clearInterval(interval);
    }, [procesando]);
    // Rotación de etapas del loader inicial
    useEffect(() => {
        if (progreso !== null || !procesando)
            return;
        const interval = setInterval(() => {
            setEtapaLoaderIdx((prev) => (prev + 1) % ETAPAS_LOADER.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [progreso, procesando]);
    // Watchdog de inactividad (20s sin cambios en progreso)
    useEffect(() => {
        if (!procesando || cancelado) {
            setWatchdogActivo(false);
            return;
        }
        if (progreso !== null)
            setWatchdogActivo(false);
        watchdogRef.current = setTimeout(() => {
            setWatchdogActivo(true);
        }, 20000);
        return () => {
            if (watchdogRef.current)
                clearTimeout(watchdogRef.current);
        };
    }, [procesando, progreso, cancelado]);
    // Timeout total de conexión inicial (45s sin progreso → error automático)
    useEffect(() => {
        if (!procesando || cancelado || progreso !== null)
            return;
        const timerId = setTimeout(() => {
            setJobError('No se pudo conectar con el servidor de proceso. Verifique que el servicio esté disponible o intente nuevamente.');
            setProcesando(false);
        }, 45000);
        return () => clearTimeout(timerId);
    }, [procesando, cancelado, progreso]);
    // Notificación al completar + título
    useEffect(() => {
        if (!procesando && !cancelado && progreso !== null && (progreso >= 100 || total > 0) && !notificacionMostradaRef.current) {
            notificacionMostradaRef.current = true;
            const hasErrors = erroresCount > 0;
            document.title = hasErrors
                ? '❌ Error en posteo - Solugen ERP'
                : '✅ Posteo completado - Solugen ERP';
        }
    }, [procesando, cancelado, progreso, total, exitosos, erroresCount]);
    // Título durante el procesamiento
    useEffect(() => {
        if (procesando) {
            document.title = '🔄 Posteando... - Solugen ERP';
        }
        return () => {
            if (!procesando) {
                document.title = 'Solugen ERP';
            }
        };
    }, [procesando]);
    const procesarDocumentos = async () => {
        const sucursal = wizard.sucursal;
        setProcesando(true);
        try {
            switch (wizard.metodo) {
                case 'rangoFechas':
                    await procesarPorRangoFechas(sucursal);
                    break;
                case 'documento':
                    await procesarDocumentoIndividual(sucursal);
                    break;
                case 'noCuadrados':
                    await procesarNoCuadrados(sucursal);
                    break;
                case 'criterio':
                    await procesarPorCriterio(sucursal);
                    break;
            }
        }
        catch (err) {
            agregarLog({
                documento: 'ERROR',
                exito: false,
                mensaje: err?.message || 'Error inesperado en el proceso',
                timestamp: new Date().toLocaleTimeString(),
            });
            setErrores((prev) => [...prev, err?.message || 'Error inesperado']);
            setJobError(err?.message || 'Error inesperado en el proceso');
            setProcesando(false);
        }
    };
    // ─── Flujo nuevo: Rango de Fechas con SignalR ───────────────────────────
    const procesarPorRangoFechas = async (sucursal) => {
        // Obtener total posteable real (excluye borradores) antes de iniciar el job
        try {
            const totalPosteable = await transaccionApi.contarPosteable(sucursal, wizard.tipoDoc || '', wizard.fechaDesde, wizard.fechaHasta);
            setTotal(totalPosteable);
        }
        catch {
            // Silencioso: se usará el total de SignalR
        }
        try {
            const jobId = await repostearApi.repostear(wizard.tipoDoc, sucursal, wizard.fechaDesde, wizard.fechaHasta);
            jobIdRef.current = jobId;
            agregarLog({
                documento: 'Sistema',
                exito: true,
                mensaje: `Posteo iniciado (Job: ${jobId.substring(0, 8)}...)`,
                timestamp: new Date().toLocaleTimeString(),
            });
            await posteoHub.subscribeToJob(jobId, (progresoSignalR) => {
                // Guardar último progreso para velocidad y detalle
                ultimoProgresoRef.current = progresoSignalR;
                // Calcular velocidad
                const ahora = Date.now();
                const diffDocs = progresoSignalR.documentosProcesados - velocidadRef.current.docs;
                const diffTime = (ahora - velocidadRef.current.time) / 1000;
                if (diffTime >= 1 && diffDocs > 0) {
                    setVelocidadDocs(Math.round(diffDocs / diffTime));
                    velocidadRef.current = { docs: progresoSignalR.documentosProcesados, time: ahora };
                }
                // Callback de progreso
                // Actualizar contadores en vivo
                if (progresoSignalR.documentoActual) {
                    if (progresoSignalR.exitoso) {
                        setExitosos(prev => prev + 1);
                    }
                    else {
                        setErroresCount(prev => prev + 1);
                    }
                }
                // Solo usar el total de SignalR si no lo tenemos ya (por si el endpoint falló)
                setTotal(prev => prev > 0 ? prev : progresoSignalR.totalDocumentos);
                const totalDocs = total > 0 ? total : progresoSignalR.totalDocumentos;
                setProgreso(totalDocs > 0
                    ? Math.round((progresoSignalR.documentosProcesados / totalDocs) * 100)
                    : 0);
                agregarLog({
                    documento: progresoSignalR.documentoActual || `Doc ${progresoSignalR.documentosProcesados}`,
                    exito: progresoSignalR.exitoso,
                    mensaje: progresoSignalR.mensaje || undefined,
                    timestamp: new Date().toLocaleTimeString(),
                });
            }, (resultado) => {
                // Callback de completado
                setExitosos(resultado.totalExitosos);
                setErroresCount(resultado.totalErrores);
                setProcesando(false);
                setProgreso(100);
                if (resultado.totalErrores > 0) {
                    setErrores(resultado.errores);
                    resultado.errores.forEach((err) => agregarLog({
                        documento: 'ERROR',
                        exito: false,
                        mensaje: err,
                        timestamp: new Date().toLocaleTimeString(),
                    }));
                }
                agregarLog({
                    documento: 'Sistema',
                    exito: resultado.totalErrores === 0,
                    mensaje: `Completado: ${resultado.totalExitosos} exitosos, ${resultado.totalErrores} errores`,
                    timestamp: new Date().toLocaleTimeString(),
                });
            });
        }
        catch (err) {
            agregarLog({
                documento: 'ERROR',
                exito: false,
                mensaje: err?.response?.data?.errorMessage || err?.message || 'Error al iniciar el reposteo',
                timestamp: new Date().toLocaleTimeString(),
            });
            setErrores((prev) => [...prev, err?.message || 'Error al iniciar reposteo']);
            setJobError(err?.message || 'Error al iniciar reposteo');
            setProcesando(false);
        }
    };
    // ─── Flujos existentes (sin cambios) ────────────────────────────────────
    const procesarDocumentoIndividual = async (sucursal) => {
        const t = wizard.transaccionEncontrada;
        if (!t)
            return;
        setTotal(1);
        setProgreso(0);
        try {
            const api = API_ESPECIFICA[wizard.tipoDoc];
            if (api) {
                const dto = await api.obtenerPorId(sucursal, t.id);
                await api.postear(sucursal, dto);
            }
            else {
                await transaccionApi.postear(sucursal, t);
            }
            agregarLog({
                documento: t.noDocumento || `ID: ${t.id}`,
                exito: true,
                timestamp: new Date().toLocaleTimeString(),
            });
            setExitosos(1);
            setProgreso(100);
        }
        catch (err) {
            agregarLog({
                documento: t.noDocumento || `ID: ${t.id}`,
                exito: false,
                mensaje: err?.response?.data?.errorMessage || err?.message || 'Error al postear',
                timestamp: new Date().toLocaleTimeString(),
            });
            setErrores((prev) => [...prev, t.noDocumento || `ID: ${t.id}`]);
            setErroresCount(1);
        }
        finally {
            setProcesando(false);
        }
    };
    const procesarNoCuadrados = async (sucursal) => {
        const docs = wizard.documentosSeleccionados;
        setTotal(docs.length);
        setProgreso(0);
        const api = API_ESPECIFICA[wizard.tipoDoc];
        let exitososCount = 0;
        let erroresList = [];
        await procesarEnParalelo(docs, 5, async (doc, _index) => {
            try {
                if (api) {
                    const dto = await api.obtenerPorId(sucursal, doc.id);
                    await api.postear(sucursal, dto);
                }
                else {
                    const t = await transaccionApi.obtenerPorId(sucursal, doc.id);
                    await transaccionApi.postear(sucursal, t);
                }
                agregarLog({
                    documento: doc.noDocumento || `ID: ${doc.id}`,
                    exito: true,
                    timestamp: new Date().toLocaleTimeString(),
                });
                exitososCount++;
            }
            catch (err) {
                agregarLog({
                    documento: doc.noDocumento || `ID: ${doc.id}`,
                    exito: false,
                    mensaje: err?.response?.data?.errorMessage || err?.message || 'Error al postear',
                    timestamp: new Date().toLocaleTimeString(),
                });
                erroresList.push(doc.noDocumento || `ID: ${doc.id}`);
            }
        }, (completados, totalDocs) => {
            setProgreso(Math.round((completados / totalDocs) * 100));
        }, canceladoRef);
        setExitosos(exitososCount);
        setErroresCount(erroresList.length);
        setErrores(erroresList);
        setProcesando(false);
    };
    const procesarPorCriterio = async (sucursal) => {
        if (wizard.tipoDoc === 'DEP') {
            await procesarDocBancario(sucursal);
        }
        else if (repostearApi.tieneRutaEspecifica(wizard.tipoDoc)) {
            await procesarPorRangoFechas(sucursal);
        }
        else {
            await procesarPorTipoYFecha(sucursal);
        }
    };
    const procesarDocBancario = async (sucursal) => {
        setTotal(1);
        setProgreso(0);
        try {
            const result = await transaccionApi.postearDocBancario(sucursal, wizard.fechaDesde, wizard.fechaHasta, wizard.tipoDoc || undefined, wizard.subCriterio === 'cuentaBancaria' ? wizard.cuentaBancaria : undefined);
            agregarLog({
                documento: `Doc Bancario (${result.length} documentos)`,
                exito: true,
                timestamp: new Date().toLocaleTimeString(),
            });
            setExitosos(1);
            setProgreso(100);
        }
        catch (err) {
            agregarLog({
                documento: 'Doc Bancario',
                exito: false,
                mensaje: err?.response?.data?.errorMessage || err?.message || 'Error al postear',
                timestamp: new Date().toLocaleTimeString(),
            });
            setErrores((prev) => [...prev, 'Doc Bancario']);
            setErroresCount(1);
        }
        finally {
            setProcesando(false);
        }
    };
    const procesarPorTipoYFecha = async (sucursal) => {
        try {
            const transacciones = await transaccionApi.obtenerResumidoPorTipo(sucursal, wizard.tipoDoc, wizard.fechaDesde, wizard.fechaHasta, wizard.subCriterio === 'entidad' ? wizard.entidadCodigo : undefined);
            setTotal(transacciones.length);
            setProgreso(0);
            let exitososCount = 0;
            let erroresList = [];
            await procesarEnParalelo(transacciones, 5, async (vista, _index) => {
                try {
                    const t = await transaccionApi.obtenerPorId(sucursal, vista.id);
                    await transaccionApi.postear(sucursal, t);
                    agregarLog({
                        documento: vista.documento || `ID: ${vista.id}`,
                        exito: true,
                        timestamp: new Date().toLocaleTimeString(),
                    });
                    exitososCount++;
                }
                catch (err) {
                    agregarLog({
                        documento: vista.documento || `ID: ${vista.id}`,
                        exito: false,
                        mensaje: err?.response?.data?.errorMessage || err?.message || 'Error al postear',
                        timestamp: new Date().toLocaleTimeString(),
                    });
                    erroresList.push(vista.documento || `ID: ${vista.id}`);
                }
            }, (completados, totalDocs) => {
                setProgreso(Math.round((completados / totalDocs) * 100));
            }, canceladoRef);
            setExitosos(exitososCount);
            setErroresCount(erroresList.length);
            setErrores(erroresList);
        }
        catch (err) {
            agregarLog({
                documento: 'ERROR',
                exito: false,
                mensaje: err?.response?.data?.errorMessage || err?.message || 'Error al obtener documentos',
                timestamp: new Date().toLocaleTimeString(),
            });
            setErrores((prev) => [...prev, 'Error general']);
            setErroresCount(1);
            setJobError(err?.response?.data?.errorMessage || err?.message || 'Error al obtener documentos');
        }
        finally {
            setProcesando(false);
        }
    };
    const handleCancelar = async () => {
        canceladoRef.current = true;
        setCancelado(true);
        if (jobIdRef.current) {
            await posteoHub.unsubscribeFromJob(jobIdRef.current).catch((err) => console.warn('Error al desuscribir SignalR al cancelar', err));
        }
        await posteoHub.disconnect().catch((err) => console.warn('Error al desconectar SignalR al cancelar', err));
        setProcesando(false);
    };
    const handleCopiarLog = () => {
        const texto = log
            .map((e) => `[${e.timestamp}] ${e.exito ? '✅' : '❌'} ${e.documento}${e.mensaje ? ` — ${e.mensaje}` : ''}`)
            .join('\n');
        navigator.clipboard.writeText(texto);
    };
    const handleLimpiarLog = () => {
        setLog([]);
    };
    // Error antes de obtener jobId o en la creación del job
    if (jobError && progreso === null && !procesando) {
        return (_jsx("div", { children: _jsx("div", { className: "repostear-result", children: _jsx(Result, { status: "error", title: "Error al iniciar el proceso", subTitle: jobError, extra: [
                        _jsx(Button, { icon: _jsx(RetweetOutlined, {}), onClick: onReiniciar, children: "Reintentar" }, "reiniciar"),
                        _jsx(Button, { type: "primary", onClick: onTerminado, children: "Finalizar" }, "fin"),
                    ] }) }) }));
    }
    // Resultado final visual
    if (!procesando && !cancelado && progreso !== null && (progreso >= 100 || total > 0)) {
        const hasErrors = erroresCount > 0 || errores.length > 0;
        const totalProcesados = exitosos + erroresCount;
        return (_jsxs("div", { children: [_jsx("div", { className: "repostear-result", children: _jsx(Result, { status: hasErrors ? 'warning' : 'success', title: hasErrors ? 'Proceso completado con errores' : 'Proceso completado exitosamente', subTitle: hasErrors
                            ? `Se procesaron ${totalProcesados} documentos: ${exitosos} exitosos y ${erroresCount} con errores. Tiempo: ${tiempoTranscurrido}`
                            : `Se procesaron ${totalProcesados} documentos exitosamente. Tiempo: ${tiempoTranscurrido}`, extra: [
                            _jsx(Button, { icon: _jsx(FileTextOutlined, {}), onClick: () => setShowLog(!showLog), children: showLog ? 'Ocultar Log' : 'Ver Log Completo' }, "log"),
                            _jsx(Button, { icon: _jsx(RetweetOutlined, {}), onClick: onReiniciar, children: "Nuevo Reposteo" }, "reiniciar"),
                            _jsx(Button, { type: "primary", onClick: onTerminado, children: "Finalizar" }, "fin"),
                        ] }) }), (hasErrors || showLog) && (_jsx("div", { style: { marginTop: 16 }, children: _jsxs("div", { className: "repostear-terminal", children: [_jsxs("div", { className: "repostear-terminal__header", children: [_jsx("span", { className: "repostear-terminal__header-title", children: "\uD83D\uDCCB Log de procesamiento" }), _jsxs("div", { className: "repostear-terminal__header-actions", children: [_jsx(Button, { size: "small", type: "text", icon: _jsx(CopyOutlined, {}), onClick: handleCopiarLog, style: { color: '#8b949e', fontSize: 12 }, children: "Copiar" }), _jsx(Button, { size: "small", type: "text", icon: _jsx(ClearOutlined, {}), onClick: handleLimpiarLog, style: { color: '#8b949e', fontSize: 12 }, children: "Limpiar" })] })] }), _jsx("div", { className: "repostear-terminal__body", ref: logRef, children: log.map((entry, idx) => (_jsxs("div", { style: { marginBottom: 2 }, children: [_jsxs("span", { className: "repostear-terminal__timestamp", children: ["[", entry.timestamp, "]"] }), _jsx("span", { className: entry.exito ? 'repostear-terminal__success' : 'repostear-terminal__error', children: entry.exito ? '✅' : '❌' }), _jsx("span", { className: "repostear-terminal__text", style: { marginLeft: 4 }, children: entry.documento }), entry.mensaje && (_jsxs("span", { className: "repostear-terminal__error-msg", children: [" \u2014 ", entry.mensaje] }))] }, idx))) })] }) }))] }));
    }
    // Colores/iconos del badge de conexión
    const cxColor = conexionEstado === 'Connected' ? 'success' : conexionEstado === 'Reconnecting' ? 'processing' : 'error';
    const cxIcon = conexionEstado === 'Connected' ? '🟢' : conexionEstado === 'Reconnecting' ? '🟡' : '🔴';
    const cxText = conexionEstado === 'Connected' ? 'En vivo' : conexionEstado === 'Reconnecting' ? 'Conectando...' : 'Desconectado';
    return (_jsxs("div", { children: [procesando && (_jsx("div", { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }, children: _jsxs(Tag, { color: cxColor, className: "repostear-conexion-badge", children: [cxIcon, " ", cxText] }) })), progreso === null && procesando && !jobError && (_jsxs("div", { className: "repostear-loader-inicial", children: [_jsx(Spin, { size: "large" }), _jsx("div", { className: "repostear-loader-texto", children: ETAPAS_LOADER[etapaLoaderIdx] }), _jsxs("div", { className: "repostear-loader-tiempo", children: ["\u23F1 ", tiempoTranscurrido] })] })), progreso !== null && (_jsxs("div", { className: "repostear-progress-card", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }, children: [_jsx(Text, { className: procesando ? 'repostear-pulse' : '', style: {
                                    fontSize: 18,
                                    fontWeight: 600,
                                    color: procesando ? primaryColor : erroresCount > 0 ? '#faad14' : '#52c41a',
                                }, children: procesando ? 'Procesando documentos...' : cancelado ? 'Proceso cancelado' : 'Proceso completado' }), procesando && (_jsx(Button, { size: "small", type: "text", icon: _jsx(FileTextOutlined, {}), onClick: () => setShowLog((prev) => !prev), style: { fontSize: 12, color: '#8b949e' }, children: showLog ? 'Ocultar Log' : 'Log' }))] }), _jsx(Progress, { percent: progreso, status: procesando ? 'active' : erroresCount > 0 ? 'exception' : 'success', strokeColor: primaryColor, strokeWidth: 12, style: { marginBottom: 16 } }), procesando && !cancelado && (_jsxs("div", { className: "repostear-detalle-progreso", children: [_jsxs(Text, { type: "secondary", children: ["Documento actual: ", ultimoProgresoRef.current?.documentoActual || '—'] }), _jsxs(Text, { type: "secondary", children: ["Velocidad: ", velocidadDocs, " docs/seg"] }), _jsxs(Text, { type: "secondary", children: ["Transcurrido: ", tiempoTranscurrido, (() => {
                                        const docsRestantes = total - (ultimoProgresoRef.current?.documentosProcesados ?? 0);
                                        const segundosRestantes = velocidadDocs > 0 && docsRestantes > 0
                                            ? Math.ceil(docsRestantes / velocidadDocs)
                                            : 0;
                                        if (segundosRestantes > 0) {
                                            const mins = Math.floor(segundosRestantes / 60);
                                            const secs = segundosRestantes % 60;
                                            return ` | Restante: ~${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                                        }
                                        return '';
                                    })()] })] })), _jsxs("div", { className: "repostear-stats", children: [_jsxs("div", { className: "repostear-stat repostear-stat--total", children: [_jsx("div", { className: "repostear-stat__value", children: total }), _jsx("div", { className: "repostear-stat__label", children: "Total" })] }), _jsxs("div", { className: "repostear-stat repostear-stat--success", children: [_jsx("div", { className: "repostear-stat__value", children: exitosos }), _jsxs("div", { className: "repostear-stat__label", children: [_jsx(CheckCircleOutlined, { style: { marginRight: 4 } }), "Exitosos"] })] }), erroresCount > 0 && (_jsxs("div", { className: "repostear-stat repostear-stat--error", children: [_jsx("div", { className: "repostear-stat__value", children: erroresCount }), _jsxs("div", { className: "repostear-stat__label", children: [_jsx(CloseCircleOutlined, { style: { marginRight: 4 } }), "Errores"] })] }))] })] })), watchdogActivo && (_jsx(Alert, { type: "warning", message: "Sin actividad", showIcon: true, description: "El servidor no ha reportado actividad en los \u00FAltimos 30 segundos. El proceso podr\u00EDa haberse detenido.", action: _jsx(Button, { size: "small", onClick: handleCancelar, children: "Cancelar" }), style: { marginBottom: 16 } })), showLog && (_jsxs("div", { className: "repostear-terminal", style: { marginBottom: 16 }, children: [_jsxs("div", { className: "repostear-terminal__header", children: [_jsx("span", { className: "repostear-terminal__header-title", children: "\uD83D\uDCCB Log de procesamiento" }), _jsxs("div", { className: "repostear-terminal__header-actions", children: [_jsx(Button, { size: "small", type: "text", icon: _jsx(CopyOutlined, {}), onClick: handleCopiarLog, style: { color: '#8b949e', fontSize: 12 }, children: "Copiar" }), _jsx(Button, { size: "small", type: "text", icon: _jsx(ClearOutlined, {}), onClick: handleLimpiarLog, style: { color: '#8b949e', fontSize: 12 }, children: "Limpiar" })] })] }), _jsxs("div", { className: "repostear-terminal__body", ref: logRef, children: [log.length === 0 && procesando && (_jsx(Text, { style: { color: '#8b949e', fontFamily: 'inherit', fontSize: 12 }, children: "Iniciando proceso..." })), log.map((entry, idx) => (_jsxs("div", { style: { marginBottom: 2 }, children: [_jsxs("span", { className: "repostear-terminal__timestamp", children: ["[", entry.timestamp, "]"] }), _jsx("span", { className: entry.exito ? 'repostear-terminal__success' : 'repostear-terminal__error', children: entry.exito ? '✅' : '❌' }), _jsx("span", { className: "repostear-terminal__text", style: { marginLeft: 4 }, children: entry.documento }), entry.mensaje && (_jsxs("span", { className: "repostear-terminal__error-msg", children: [" \u2014 ", entry.mensaje] }))] }, idx)))] })] })), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 }, children: [procesando && (_jsx(Button, { danger: true, onClick: handleCancelar, children: "Cancelar" })), !procesando && cancelado && (_jsx(Button, { icon: _jsx(RetweetOutlined, {}), onClick: onReiniciar, children: "Nuevo Reposteo" }))] })] }));
};
export default PasoProcesando;
