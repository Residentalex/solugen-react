import React, { useState, useCallback, useEffect } from 'react';
import { Steps, Button, Space, Result } from 'antd';
import { RetweetOutlined, CheckOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import PasoSucursal from './PasoSucursal';
import PasoMetodo from './PasoMetodo';
import PasoDocumento from './PasoDocumento';
import PasoNoCuadrados from './PasoNoCuadrados';
import PasoCriterio from './PasoCriterio';
import PasoProcesando from './PasoProcesando';
import type { Sucursal as SucursalType } from '../../types/auth';
import type { TransaccionDTO } from '../../types/transaccion';
import './Repostear.css';

export type MetodoPosteo = 'documento' | 'noCuadrados' | 'criterio';
export type SubCriterio = 'entidad' | 'concepto' | 'cuentaBancaria' | 'soloFecha';

export interface WizardState {
  sucursal: SucursalType | null;
  metodo: MetodoPosteo | null;
  subCriterio: SubCriterio | null;
  tipoDoc: string;
  fechaDesde: string;
  fechaHasta: string;
  documento: string;
  entidadCodigo: string;
  conceptoCodigo: string;
  cuentaBancaria: string;
  transaccionEncontrada: TransaccionDTO | null;
  documentosNoCuadrados: TransaccionDTO[];
  documentosSeleccionados: TransaccionDTO[];
}

const INITIAL_STATE: WizardState = {
  sucursal: null,
  metodo: null,
  subCriterio: null,
  tipoDoc: '',
  fechaDesde: '',
  fechaHasta: '',
  documento: '',
  entidadCodigo: '',
  conceptoCodigo: '',
  cuentaBancaria: '',
  transaccionEncontrada: null,
  documentosNoCuadrados: [],
  documentosSeleccionados: [],
};

const STEP_SUBTITLES: Record<string, string> = {
  Sucursal: 'Seleccione la sucursal sobre la que desea operar',
  Método: 'Elija cómo desea buscar los documentos',
  Documento: 'Busque un documento individual por su número',
  'No Cuadrados': 'Encuentre documentos con asientos descuadrados',
  Criterio: 'Configure los filtros para el reposteo masivo',
  Procesar: 'Revise y confirme el proceso de reposteo',
  Configuración: 'Complete los pasos anteriores para continuar',
};

const Repostear: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [wizard, setWizard] = useState<WizardState>(INITIAL_STATE);
  const [procesando, setProcesando] = useState(false);
  const [terminado, setTerminado] = useState(false);

  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  useEffect(() => {
    setActiveModule('ORepostear');
    setPageTitleOverride('Repostear Documentos');
    setWizard((prev) => ({ ...prev, sucursal: sucursalActiva }));
    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, sucursalActiva]);

  const updateWizard = useCallback((partial: Partial<WizardState>) => {
    setWizard((prev) => ({ ...prev, ...partial }));
  }, []);

  /** Determina los pasos dinámicos según el método seleccionado */
  const getSteps = useCallback((): { title: string }[] => {
    const base = [{ title: 'Sucursal' }, { title: 'Método' }];

    if (!wizard.metodo) return [...base, { title: 'Configuración' }];

    switch (wizard.metodo) {
      case 'documento':
        return [...base, { title: 'Documento' }, { title: 'Procesar' }];
      case 'noCuadrados':
        return [...base, { title: 'No Cuadrados' }, { title: 'Procesar' }];
      case 'criterio':
        return [...base, { title: 'Criterio' }, { title: 'Procesar' }];
    }
  }, [wizard.metodo]);

  const steps = getSteps();

  const canGoNext = useCallback((): boolean => {
    switch (current) {
      case 0:
        return wizard.sucursal !== null;
      case 1:
        return wizard.metodo !== null;
      case 2:
        if (wizard.metodo === 'documento') return wizard.transaccionEncontrada !== null;
        if (wizard.metodo === 'noCuadrados') return wizard.documentosSeleccionados.length > 0;
        if (wizard.metodo === 'criterio') {
          if (!wizard.tipoDoc || !wizard.fechaDesde || !wizard.fechaHasta) return false;
          if (wizard.subCriterio === 'entidad' && !wizard.entidadCodigo) return false;
          if (wizard.subCriterio === 'concepto' && !wizard.conceptoCodigo) return false;
          if (wizard.subCriterio === 'cuentaBancaria' && !wizard.cuentaBancaria) return false;
          return true;
        }
        return false;
      default:
        return false;
    }
  }, [current, wizard]);

  const handleNext = useCallback(() => {
    if (current < steps.length - 1) {
      setCurrent(current + 1);
    }
  }, [current, steps.length]);

  const handlePrev = useCallback(() => {
    if (current > 0) {
      setCurrent(current - 1);
    }
  }, [current]);

  const handleProcesar = useCallback(() => {
    setProcesando(true);
    setCurrent(steps.length - 1);
  }, [steps.length]);

  const handleTerminado = useCallback(() => {
    setTerminado(true);
    setProcesando(false);
  }, []);

  const handleReiniciar = useCallback(() => {
    setWizard({ ...INITIAL_STATE, sucursal: sucursalActiva });
    setCurrent(0);
    setProcesando(false);
    setTerminado(false);
  }, [sucursalActiva]);

  const renderStepContent = () => {
    if (procesando || terminado) {
      return (
        <PasoProcesando
          wizard={wizard}
          onTerminado={handleTerminado}
        />
      );
    }

    switch (current) {
      case 0:
        return (
          <PasoSucursal
            value={wizard.sucursal}
            onChange={(s) => updateWizard({ sucursal: s })}
          />
        );
      case 1:
        return (
          <PasoMetodo
            value={wizard.metodo}
            onChange={(m) => updateWizard({ metodo: m })}
          />
        );
      case 2:
        if (wizard.metodo === 'documento') {
          return (
            <PasoDocumento
              sucursal={wizard.sucursal!}
              documento={wizard.documento}
              transaccion={wizard.transaccionEncontrada}
              onDocumentoChange={(d) => updateWizard({ documento: d, transaccionEncontrada: null })}
              onTransaccionEncontrada={(t) => updateWizard({ transaccionEncontrada: t })}
            />
          );
        }
        if (wizard.metodo === 'noCuadrados') {
          return (
            <PasoNoCuadrados
              sucursal={wizard.sucursal!}
              tipoDoc={wizard.tipoDoc}
              fechaDesde={wizard.fechaDesde}
              fechaHasta={wizard.fechaHasta}
              documentos={wizard.documentosNoCuadrados}
              seleccionados={wizard.documentosSeleccionados}
              onTipoDocChange={(v) => updateWizard({ tipoDoc: v })}
              onFechasChange={(d, h) => updateWizard({ fechaDesde: d, fechaHasta: h })}
              onDocumentosChange={(docs) => updateWizard({ documentosNoCuadrados: docs })}
              onSeleccionChange={(sel) => updateWizard({ documentosSeleccionados: sel })}
            />
          );
        }
        if (wizard.metodo === 'criterio') {
          return (
            <PasoCriterio
              sucursal={wizard.sucursal!}
              tipoDoc={wizard.tipoDoc}
              fechaDesde={wizard.fechaDesde}
              fechaHasta={wizard.fechaHasta}
              subCriterio={wizard.subCriterio}
              entidadCodigo={wizard.entidadCodigo}
              conceptoCodigo={wizard.conceptoCodigo}
              cuentaBancaria={wizard.cuentaBancaria}
              onTipoDocChange={(v) => updateWizard({ tipoDoc: v })}
              onFechasChange={(d, h) => updateWizard({ fechaDesde: d, fechaHasta: h })}
              onSubCriterioChange={(sc) => updateWizard({ subCriterio: sc })}
              onEntidadChange={(v) => updateWizard({ entidadCodigo: v })}
              onConceptoChange={(v) => updateWizard({ conceptoCodigo: v })}
              onCuentaBancariaChange={(v) => updateWizard({ cuentaBancaria: v })}
            />
          );
        }
        return null;
      default:
        return null;
    }
  };

  if (terminado) {
    return (
      <div className="repostear-wizard">
        <div className="repostear-result">
          <Result
            status="success"
            title="Proceso completado"
            subTitle="El reposteo de documentos ha finalizado. Revise el log para detalles."
            extra={[
              <Button key="reiniciar" type="primary" onClick={handleReiniciar}>
                Nuevo Reposteo
              </Button>,
            ]}
          />
        </div>
      </div>
    );
  }

  const activeStepTitle = steps[current]?.title || '';
  const activeStepSubtitle = STEP_SUBTITLES[activeStepTitle] || '';

  return (
    <div className="repostear-wizard">
      <div className="repostear-wizard__card">
        {/* Cabecera con icono */}
        <div className="repostear-wizard__header">
          <div className="repostear-wizard__header-icon">
            <RetweetOutlined />
          </div>
          <div className="repostear-wizard__header-text">
            <h2>Repostear Documentos</h2>
            <p>Procese y re-postee documentos contables</p>
          </div>
        </div>

        {/* Body: Steps a la izquierda, contenido a la derecha */}
        <div className="repostear-wizard__body">
          <div className="repostear-wizard__steps">
            <Steps
              direction="vertical"
              size="small"
              current={current}
              items={steps.map((s) => ({ title: s.title }))}
            />
            {activeStepSubtitle && (
              <div className="repostear-wizard__step-subtitle">
                {activeStepSubtitle}
              </div>
            )}
          </div>

          {/* Contenido del paso con animación */}
          <div className="repostear-wizard__content repostear-step-enter" key={current}>
            {renderStepContent()}
          </div>
        </div>

        <div className="repostear-wizard__divider" />

        {/* Footer */}
        {!procesando && !terminado && (
          <div className="repostear-wizard__footer">
            <Button
              disabled={current === 0}
              onClick={handlePrev}
            >
              Atrás
            </Button>
            <Space>
              {current < steps.length - 1 && (
                <Button
                  type="primary"
                  disabled={!canGoNext()}
                  onClick={handleNext}
                >
                  Siguiente
                </Button>
              )}
              {current === steps.length - 1 && (
                <Button
                  className="repostear-btn-procesar"
                  icon={<CheckOutlined />}
                  disabled={!canGoNext()}
                  onClick={handleProcesar}
                >
                  Procesar
                </Button>
              )}
            </Space>
          </div>
        )}
      </div>
    </div>
  );
};

export default Repostear;