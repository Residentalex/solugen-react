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
import type { PosteoProgreso } from '../../api/posteoHub';
import type { WizardState } from './Repostear';
import './Repostear.css';

const { Text } = Typography;

const ETAPAS_LOADER = [
  'Iniciando proceso...',
  'Conectando con el servidor...',
  'Esperando respuesta...',
  'Preparando documentos...',
];

interface LogEntry {
  documento: string;
  exito: boolean;
  mensaje?: string;
  timestamp: string;
}

interface Props {
  wizard: WizardState;
  onTerminado: () => void;
  onReiniciar: () => void;
}

// Helper: Procesa items en lotes paralelos con límite de concurrencia
async function procesarEnParalelo<T>(
  items: T[],
  concurrency: number,
  procesarItem: (item: T, index: number) => Promise<void>,
  onChunkCompletado: (completados: number, total: number) => void,
  canceladoRef: React.MutableRefObject<boolean>
): Promise<void> {
  let completados = 0;
  for (let i = 0; i < items.length; i += concurrency) {
    if (canceladoRef.current) break;
    const chunk = items.slice(i, i + concurrency);
    await Promise.all(chunk.map((item, idx) => procesarItem(item, i + idx)));
    completados += chunk.length;
    onChunkCompletado(completados, items.length);
  }
}

const PasoProcesando: React.FC<Props> = ({ wizard, onTerminado, onReiniciar }) => {
  const primaryColor = useUIStore((s) => s.primaryColor);
  const [progreso, setProgreso] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [exitosos, setExitosos] = useState(0);
  const [erroresCount, setErroresCount] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [errores, setErrores] = useState<string[]>([]);
  const [cancelado, setCancelado] = useState(false);
  const [procesando, setProcesando] = useState(true);
  const [showLog, setShowLog] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [conexionEstado, setConexionEstado] = useState<string>('Desconectado');
  const [etapaLoaderIdx, setEtapaLoaderIdx] = useState(0);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState('00:00');
  const [velocidadDocs, setVelocidadDocs] = useState(0);
  const [watchdogActivo, setWatchdogActivo] = useState(false);
  const jobIdRef = useRef<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const canceladoRef = useRef(false);
  const tiempoInicioRef = useRef(Date.now());
  const velocidadRef = useRef({ docs: 0, time: Date.now() });
  const ultimoProgresoRef = useRef<PosteoProgreso | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificacionMostradaRef = useRef(false);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const agregarLog = useCallback((entry: LogEntry) => {
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
  const API_ESPECIFICA: Record<string, {
    obtenerPorId: (sucursal: number, id: number) => Promise<any>;
    postear: (sucursal: number, doc: any, destino?: any) => Promise<any>;
  }> = {
    DEV: devolucionVentaApi,
    ENP: entradaAlmacenApi,
    FAC: facturaClienteApi,
  };

  useEffect(() => {
    if (startedRef.current) return;
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
    if (!procesando) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - tiempoInicioRef.current) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      setTiempoTranscurrido(
        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [procesando]);

  // Rotación de etapas del loader inicial
  useEffect(() => {
    if (progreso !== null || !procesando) return;
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
    if (progreso !== null) setWatchdogActivo(false);
    watchdogRef.current = setTimeout(() => {
      setWatchdogActivo(true);
    }, 20000);
    return () => {
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, [procesando, progreso, cancelado]);

  // Timeout total de conexión inicial (45s sin progreso → error automático)
  useEffect(() => {
    if (!procesando || cancelado || progreso !== null) return;
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
    const sucursal = wizard.sucursal!;
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
    } catch (err: any) {
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
  const procesarPorRangoFechas = async (sucursal: number) => {
    // Obtener total posteable real (excluye borradores) antes de iniciar el job
    try {
      const totalPosteable = await transaccionApi.contarPosteable(
        sucursal,
        wizard.tipoDoc || '',
        wizard.fechaDesde,
        wizard.fechaHasta
      );
      setTotal(totalPosteable);
    } catch {
      // Silencioso: se usará el total de SignalR
    }

    try {
      const jobId = await repostearApi.repostear(
        wizard.tipoDoc,
        sucursal,
        wizard.fechaDesde,
        wizard.fechaHasta
      );
      jobIdRef.current = jobId;

      agregarLog({
        documento: 'Sistema',
        exito: true,
        mensaje: `Posteo iniciado (Job: ${jobId.substring(0, 8)}...)`,
        timestamp: new Date().toLocaleTimeString(),
      });

      await posteoHub.subscribeToJob(
        jobId,
        (progresoSignalR) => {
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
            } else {
              setErroresCount(prev => prev + 1);
            }
          }
          // Solo usar el total de SignalR si no lo tenemos ya (por si el endpoint falló)
          setTotal(prev => prev > 0 ? prev : progresoSignalR.totalDocumentos);
          const totalDocs = total > 0 ? total : progresoSignalR.totalDocumentos;
          setProgreso(
            totalDocs > 0
              ? Math.round((progresoSignalR.documentosProcesados / totalDocs) * 100)
              : 0
          );
          agregarLog({
            documento: progresoSignalR.documentoActual || `Doc ${progresoSignalR.documentosProcesados}`,
            exito: progresoSignalR.exitoso,
            mensaje: progresoSignalR.mensaje || undefined,
            timestamp: new Date().toLocaleTimeString(),
          });
        },
        (resultado) => {
          // Callback de completado
          setExitosos(resultado.totalExitosos);
          setErroresCount(resultado.totalErrores);
          setProcesando(false);
          setProgreso(100);

          if (resultado.totalErrores > 0) {
            setErrores(resultado.errores);
            resultado.errores.forEach((err) =>
              agregarLog({
                documento: 'ERROR',
                exito: false,
                mensaje: err,
                timestamp: new Date().toLocaleTimeString(),
              })
            );
          }

          agregarLog({
            documento: 'Sistema',
            exito: resultado.totalErrores === 0,
            mensaje: `Completado: ${resultado.totalExitosos} exitosos, ${resultado.totalErrores} errores`,
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      );
    } catch (err: any) {
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

  const procesarDocumentoIndividual = async (sucursal: number) => {
    const t = wizard.transaccionEncontrada;
    if (!t) return;

    setTotal(1);
    setProgreso(0);

    try {
      const api = API_ESPECIFICA[wizard.tipoDoc];
      if (api) {
        const dto = await api.obtenerPorId(sucursal, t.id);
        await api.postear(sucursal, dto);
      } else {
        await transaccionApi.postear(sucursal, t);
      }
      agregarLog({
        documento: t.noDocumento || `ID: ${t.id}`,
        exito: true,
        timestamp: new Date().toLocaleTimeString(),
      });
      setExitosos(1);
      setProgreso(100);
    } catch (err: any) {
      agregarLog({
        documento: t.noDocumento || `ID: ${t.id}`,
        exito: false,
        mensaje: err?.response?.data?.errorMessage || err?.message || 'Error al postear',
        timestamp: new Date().toLocaleTimeString(),
      });
      setErrores((prev) => [...prev, t.noDocumento || `ID: ${t.id}`]);
      setErroresCount(1);
    } finally {
      setProcesando(false);
    }
  };

  const procesarNoCuadrados = async (sucursal: number) => {
    const docs = wizard.documentosSeleccionados;
    setTotal(docs.length);
    setProgreso(0);

    const api = API_ESPECIFICA[wizard.tipoDoc];
    let exitososCount = 0;
    let erroresList: string[] = [];

    await procesarEnParalelo(
      docs,
      5,
      async (doc, _index) => {
        try {
          if (api) {
            const dto = await api.obtenerPorId(sucursal, doc.id);
            await api.postear(sucursal, dto);
          } else {
            const t = await transaccionApi.obtenerPorId(sucursal, doc.id);
            await transaccionApi.postear(sucursal, t);
          }
          agregarLog({
            documento: doc.noDocumento || `ID: ${doc.id}`,
            exito: true,
            timestamp: new Date().toLocaleTimeString(),
          });
          exitososCount++;
        } catch (err: any) {
          agregarLog({
            documento: doc.noDocumento || `ID: ${doc.id}`,
            exito: false,
            mensaje: err?.response?.data?.errorMessage || err?.message || 'Error al postear',
            timestamp: new Date().toLocaleTimeString(),
          });
          erroresList.push(doc.noDocumento || `ID: ${doc.id}`);
        }
      },
      (completados, totalDocs) => {
        setProgreso(Math.round((completados / totalDocs) * 100));
      },
      canceladoRef
    );

    setExitosos(exitososCount);
    setErroresCount(erroresList.length);
    setErrores(erroresList);
    setProcesando(false);
  };

  const procesarPorCriterio = async (sucursal: number) => {
    if (wizard.tipoDoc === 'DEP') {
      await procesarDocBancario(sucursal);
    } else if (repostearApi.tieneRutaEspecifica(wizard.tipoDoc)) {
      await procesarPorRangoFechas(sucursal);
    } else {
      await procesarPorTipoYFecha(sucursal);
    }
  };

  const procesarDocBancario = async (sucursal: number) => {
    setTotal(1);
    setProgreso(0);

    try {
      const result = await transaccionApi.postearDocBancario(
        sucursal,
        wizard.fechaDesde,
        wizard.fechaHasta,
        wizard.tipoDoc || undefined,
        wizard.subCriterio === 'cuentaBancaria' ? wizard.cuentaBancaria : undefined
      );

      agregarLog({
        documento: `Doc Bancario (${result.length} documentos)`,
        exito: true,
        timestamp: new Date().toLocaleTimeString(),
      });
      setExitosos(1);
      setProgreso(100);
    } catch (err: any) {
      agregarLog({
        documento: 'Doc Bancario',
        exito: false,
        mensaje: err?.response?.data?.errorMessage || err?.message || 'Error al postear',
        timestamp: new Date().toLocaleTimeString(),
      });
      setErrores((prev) => [...prev, 'Doc Bancario']);
      setErroresCount(1);
    } finally {
      setProcesando(false);
    }
  };

  const procesarPorTipoYFecha = async (sucursal: number) => {
    try {
      const transacciones = await transaccionApi.obtenerResumidoPorTipo(
        sucursal,
        wizard.tipoDoc,
        wizard.fechaDesde,
        wizard.fechaHasta,
        wizard.subCriterio === 'entidad' ? wizard.entidadCodigo : undefined
      );

      setTotal(transacciones.length);
      setProgreso(0);

      let exitososCount = 0;
      let erroresList: string[] = [];

      await procesarEnParalelo(
        transacciones,
        5,
        async (vista, _index) => {
          try {
            const t = await transaccionApi.obtenerPorId(sucursal, vista.id);
            await transaccionApi.postear(sucursal, t);
            agregarLog({
              documento: vista.documento || `ID: ${vista.id}`,
              exito: true,
              timestamp: new Date().toLocaleTimeString(),
            });
            exitososCount++;
          } catch (err: any) {
            agregarLog({
              documento: vista.documento || `ID: ${vista.id}`,
              exito: false,
              mensaje: err?.response?.data?.errorMessage || err?.message || 'Error al postear',
              timestamp: new Date().toLocaleTimeString(),
            });
            erroresList.push(vista.documento || `ID: ${vista.id}`);
          }
        },
        (completados, totalDocs) => {
          setProgreso(Math.round((completados / totalDocs) * 100));
        },
        canceladoRef
      );

      setExitosos(exitososCount);
      setErroresCount(erroresList.length);
      setErrores(erroresList);
    } catch (err: any) {
      agregarLog({
        documento: 'ERROR',
        exito: false,
        mensaje: err?.response?.data?.errorMessage || err?.message || 'Error al obtener documentos',
        timestamp: new Date().toLocaleTimeString(),
      });
      setErrores((prev) => [...prev, 'Error general']);
      setErroresCount(1);
      setJobError(err?.response?.data?.errorMessage || err?.message || 'Error al obtener documentos');
    } finally {
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
    return (
      <div>
        <div className="repostear-result">
          <Result
            status="error"
            title="Error al iniciar el proceso"
            subTitle={jobError}
            extra={[
              <Button key="reiniciar" icon={<RetweetOutlined />} onClick={onReiniciar}>
                Reintentar
              </Button>,
              <Button key="fin" type="primary" onClick={onTerminado}>
                Finalizar
              </Button>,
            ]}
          />
        </div>
      </div>
    );
  }

  // Resultado final visual
  if (!procesando && !cancelado && progreso !== null && (progreso >= 100 || total > 0)) {
    const hasErrors = erroresCount > 0 || errores.length > 0;
    const totalProcesados = exitosos + erroresCount;
    return (
      <div>
        <div className="repostear-result">
          <Result
            status={hasErrors ? 'warning' : 'success'}
            title={hasErrors ? 'Proceso completado con errores' : 'Proceso completado exitosamente'}
            subTitle={
              hasErrors
                ? `Se procesaron ${totalProcesados} documentos: ${exitosos} exitosos y ${erroresCount} con errores. Tiempo: ${tiempoTranscurrido}`
                : `Se procesaron ${totalProcesados} documentos exitosamente. Tiempo: ${tiempoTranscurrido}`
            }
            extra={[
              <Button key="log" icon={<FileTextOutlined />} onClick={() => setShowLog(!showLog)}>
                {showLog ? 'Ocultar Log' : 'Ver Log Completo'}
              </Button>,
              <Button key="reiniciar" icon={<RetweetOutlined />} onClick={onReiniciar}>
                Nuevo Reposteo
              </Button>,
              <Button key="fin" type="primary" onClick={onTerminado}>
                Finalizar
              </Button>,
            ]}
          />
        </div>

        {/* Mostrar log cuando hay errores o cuando el usuario hace clic en Ver Log */}
        {(hasErrors || showLog) && (
          <div style={{ marginTop: 16 }}>
            <div className="repostear-terminal">
              <div className="repostear-terminal__header">
                <span className="repostear-terminal__header-title">
                  📋 Log de procesamiento
                </span>
                <div className="repostear-terminal__header-actions">
                  <Button
                    size="small"
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={handleCopiarLog}
                    style={{ color: '#8b949e', fontSize: 12 }}
                  >
                    Copiar
                  </Button>
                  <Button
                    size="small"
                    type="text"
                    icon={<ClearOutlined />}
                    onClick={handleLimpiarLog}
                    style={{ color: '#8b949e', fontSize: 12 }}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
              <div className="repostear-terminal__body" ref={logRef}>
                {log.map((entry, idx) => (
                  <div key={idx} style={{ marginBottom: 2 }}>
                    <span className="repostear-terminal__timestamp">[{entry.timestamp}]</span>
                    <span className={entry.exito ? 'repostear-terminal__success' : 'repostear-terminal__error'}>
                      {entry.exito ? '✅' : '❌'}
                    </span>
                    <span className="repostear-terminal__text" style={{ marginLeft: 4 }}>
                      {entry.documento}
                    </span>
                    {entry.mensaje && (
                      <span className="repostear-terminal__error-msg"> — {entry.mensaje}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Colores/iconos del badge de conexión
  const cxColor = conexionEstado === 'Connected' ? 'success' : conexionEstado === 'Reconnecting' ? 'processing' : 'error';
  const cxIcon = conexionEstado === 'Connected' ? '🟢' : conexionEstado === 'Reconnecting' ? '🟡' : '🔴';
  const cxText = conexionEstado === 'Connected' ? 'En vivo' : conexionEstado === 'Reconnecting' ? 'Conectando...' : 'Desconectado';

  return (
    <div>
      {/* Badge de conexión SignalR */}
      {procesando && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <Tag color={cxColor} className="repostear-conexion-badge">
            {cxIcon} {cxText}
          </Tag>
        </div>
      )}

      {/* Loader inicial: mientras no hay progreso y estamos en procesamiento */}
      {progreso === null && procesando && !jobError && (
        <div className="repostear-loader-inicial">
          <Spin size="large" />
          <div className="repostear-loader-texto">
            {ETAPAS_LOADER[etapaLoaderIdx]}
          </div>
          <div className="repostear-loader-tiempo">
            ⏱ {tiempoTranscurrido}
          </div>
        </div>
      )}

      {/* Card de progreso con gradiente: solo cuando progreso tiene valor */}
      {progreso !== null && (
        <div className="repostear-progress-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
            <Text
              className={procesando ? 'repostear-pulse' : ''}
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: procesando ? primaryColor : erroresCount > 0 ? '#faad14' : '#52c41a',
              }}
            >
              {procesando ? 'Procesando documentos...' : cancelado ? 'Proceso cancelado' : 'Proceso completado'}
            </Text>
            {procesando && (
              <Button
                size="small"
                type="text"
                icon={<FileTextOutlined />}
                onClick={() => setShowLog((prev) => !prev)}
                style={{ fontSize: 12, color: '#8b949e' }}
              >
                {showLog ? 'Ocultar Log' : 'Log'}
              </Button>
            )}
          </div>

          <Progress
            percent={progreso}
            status={procesando ? 'active' : erroresCount > 0 ? 'exception' : 'success'}
            strokeColor={primaryColor}
            strokeWidth={12}
            style={{ marginBottom: 16 }}
          />

          {/* Velocidad y tiempo estimado */}
          {procesando && !cancelado && (
            <div className="repostear-detalle-progreso">
              <Text type="secondary">
                Documento actual: {ultimoProgresoRef.current?.documentoActual || '—'}
              </Text>
              <Text type="secondary">
                Velocidad: {velocidadDocs} docs/seg
              </Text>
              <Text type="secondary">
                Transcurrido: {tiempoTranscurrido}
                {(() => {
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
                })()}
              </Text>
            </div>
          )}

          {/* Stats grandes */}
          <div className="repostear-stats">
            <div className="repostear-stat repostear-stat--total">
              <div className="repostear-stat__value">{total}</div>
              <div className="repostear-stat__label">Total</div>
            </div>
            <div className="repostear-stat repostear-stat--success">
              <div className="repostear-stat__value">{exitosos}</div>
              <div className="repostear-stat__label">
                <CheckCircleOutlined style={{ marginRight: 4 }} />
                Exitosos
              </div>
            </div>
            {erroresCount > 0 && (
              <div className="repostear-stat repostear-stat--error">
                <div className="repostear-stat__value">{erroresCount}</div>
                <div className="repostear-stat__label">
                  <CloseCircleOutlined style={{ marginRight: 4 }} />
                  Errores
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Watchdog de inactividad */}
      {watchdogActivo && (
        <Alert
          type="warning"
          message="Sin actividad"
          showIcon
          description="El servidor no ha reportado actividad en los últimos 30 segundos. El proceso podría haberse detenido."
          action={<Button size="small" onClick={handleCancelar}>Cancelar</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Log tipo terminal GitHub dark (oculto por defecto) */}
      {showLog && (
        <div className="repostear-terminal" style={{ marginBottom: 16 }}>
          <div className="repostear-terminal__header">
            <span className="repostear-terminal__header-title">
              📋 Log de procesamiento
            </span>
            <div className="repostear-terminal__header-actions">
              <Button
                size="small"
                type="text"
                icon={<CopyOutlined />}
                onClick={handleCopiarLog}
                style={{ color: '#8b949e', fontSize: 12 }}
              >
                Copiar
              </Button>
              <Button
                size="small"
                type="text"
                icon={<ClearOutlined />}
                onClick={handleLimpiarLog}
                style={{ color: '#8b949e', fontSize: 12 }}
              >
                Limpiar
              </Button>
            </div>
          </div>
          <div className="repostear-terminal__body" ref={logRef}>
            {log.length === 0 && procesando && (
              <Text style={{ color: '#8b949e', fontFamily: 'inherit', fontSize: 12 }}>
                Iniciando proceso...
              </Text>
            )}
            {log.map((entry, idx) => (
              <div key={idx} style={{ marginBottom: 2 }}>
                <span className="repostear-terminal__timestamp">[{entry.timestamp}]</span>
                <span className={entry.exito ? 'repostear-terminal__success' : 'repostear-terminal__error'}>
                  {entry.exito ? '✅' : '❌'}
                </span>
                <span className="repostear-terminal__text" style={{ marginLeft: 4 }}>
                  {entry.documento}
                </span>
                {entry.mensaje && (
                  <span className="repostear-terminal__error-msg"> — {entry.mensaje}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {procesando && (
          <Button danger onClick={handleCancelar}>
            Cancelar
          </Button>
        )}
        {!procesando && cancelado && (
          <Button icon={<RetweetOutlined />} onClick={onReiniciar}>
            Nuevo Reposteo
          </Button>
        )}
      </div>
    </div>
  );
};

export default PasoProcesando;