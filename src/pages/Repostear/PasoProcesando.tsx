import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Progress, Typography, Button, Result } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined, CopyOutlined, ClearOutlined } from '@ant-design/icons';
import { transaccionApi } from '../../api/transaccionApi';
import { repostearApi } from '../../api/repostearApi';
import { posteoHub } from '../../api/posteoHub';
import type { WizardState } from './Repostear';
import './Repostear.css';

const { Text } = Typography;

interface LogEntry {
  documento: string;
  exito: boolean;
  mensaje?: string;
  timestamp: string;
}

interface Props {
  wizard: WizardState;
  onTerminado: () => void;
}

const PasoProcesando: React.FC<Props> = ({ wizard, onTerminado }) => {
  const [progreso, setProgreso] = useState(0);
  const [total, setTotal] = useState(0);
  const [exitosos, setExitosos] = useState(0);
  const [erroresCount, setErroresCount] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [errores, setErrores] = useState<string[]>([]);
  const [cancelado, setCancelado] = useState(false);
  const [procesando, setProcesando] = useState(true);
  const jobIdRef = useRef<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const agregarLog = useCallback((entry: LogEntry) => {
    setLog((prev) => [...prev, entry]);
  }, []);

  useEffect(() => {
    procesarDocumentos();
    return () => {
      // Cleanup: desuscribir y desconectar SignalR
      if (jobIdRef.current) {
        posteoHub.unsubscribeFromJob(jobIdRef.current).catch(() => {});
      }
      posteoHub.disconnect().catch(() => {});
    };
  }, []);

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
      setProcesando(false);
    }
  };

  // ─── Flujo nuevo: Rango de Fechas con SignalR ───────────────────────────
  const procesarPorRangoFechas = async (sucursal: number) => {
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
        (progreso) => {
          // Callback de progreso
          setTotal(progreso.totalDocumentos);
          setProgreso(
            progreso.totalDocumentos > 0
              ? Math.round((progreso.documentosProcesados / progreso.totalDocumentos) * 100)
              : 0
          );
          agregarLog({
            documento: progreso.documentoActual || `Doc ${progreso.documentosProcesados}`,
            exito: progreso.exitoso,
            mensaje: progreso.mensaje || undefined,
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
      await transaccionApi.postear(sucursal, t);
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

    let exitososCount = 0;
    let erroresList: string[] = [];

    for (let i = 0; i < docs.length; i++) {
      if (cancelado) break;

      const doc = docs[i];
      try {
        await transaccionApi.postear(sucursal, doc);
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

      setProgreso(Math.round(((i + 1) / docs.length) * 100));
    }

    setExitosos(exitososCount);
    setErroresCount(erroresList.length);
    setErrores(erroresList);
    setProcesando(false);
  };

  const procesarPorCriterio = async (sucursal: number) => {
    if (wizard.tipoDoc === 'DEP') {
      await procesarDocBancario(sucursal);
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

      for (let i = 0; i < transacciones.length; i++) {
        if (cancelado) break;

        const vista = transacciones[i];
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

        setProgreso(Math.round(((i + 1) / transacciones.length) * 100));
      }

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
    } finally {
      setProcesando(false);
    }
  };

  const handleCancelar = async () => {
    setCancelado(true);
    if (jobIdRef.current) {
      await posteoHub.unsubscribeFromJob(jobIdRef.current).catch(() => {});
    }
    await posteoHub.disconnect().catch(() => {});
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

  // Resultado final visual
  if (!procesando && !cancelado && (progreso >= 100 || total > 0)) {
    const hasErrors = erroresCount > 0 || errores.length > 0;
    const totalProcesados = exitosos + erroresCount;
    return (
      <div className="repostear-result">
        <Result
          status={hasErrors ? 'warning' : 'success'}
          title={hasErrors ? 'Proceso completado con errores' : 'Proceso completado exitosamente'}
          subTitle={
            hasErrors
              ? `Se procesaron ${totalProcesados} documentos: ${exitosos} exitosos y ${erroresCount} con errores.`
              : `Se procesaron ${totalProcesados} documentos exitosamente.`
          }
          extra={[
            <Button key="log" icon={<FileTextOutlined />} onClick={() => {}}>
              Ver Log Completo
            </Button>,
            <Button key="fin" type="primary" onClick={onTerminado}>
              Finalizar
            </Button>,
          ]}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Card de progreso con gradiente */}
      <div className="repostear-progress-card">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Text
            className={procesando ? 'repostear-pulse' : ''}
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: procesando ? '#556ee6' : erroresCount > 0 ? '#faad14' : '#52c41a',
            }}
          >
            {procesando ? 'Procesando documentos...' : cancelado ? 'Proceso cancelado' : 'Proceso completado'}
          </Text>
        </div>

        <Progress
          percent={progreso}
          status={procesando ? 'active' : erroresCount > 0 ? 'exception' : 'success'}
          strokeColor="#556ee6"
          strokeWidth={12}
          style={{ marginBottom: 16 }}
        />

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

      {/* Log tipo terminal GitHub dark */}
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

      {/* Botones de acción */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {procesando && (
          <Button danger onClick={handleCancelar}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
};

export default PasoProcesando;