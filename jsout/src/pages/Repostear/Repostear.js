import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import PasoConfirmacion from './PasoConfirmacion';
import './Repostear.css';
const INITIAL_STATE = {
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
const STEP_SUBTITLES = {
    Sucursal: 'Seleccione la sucursal sobre la que desea operar',
    Método: 'Elija cómo desea buscar los documentos',
    Documento: 'Busque un documento individual por su número',
    'No Cuadrados': 'Encuentre documentos con asientos descuadrados',
    Criterio: 'Configure los filtros para el reposteo masivo',
    Confirmación: 'Revise y confirme el proceso de reposteo',
    Configuración: 'Complete los pasos anteriores para continuar',
};
const Repostear = () => {
    const [current, setCurrent] = useState(0);
    const [wizard, setWizard] = useState(INITIAL_STATE);
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
    const updateWizard = useCallback((partial) => {
        setWizard((prev) => ({ ...prev, ...partial }));
    }, []);
    /** Determina los pasos dinámicos según el método seleccionado */
    const getSteps = useCallback(() => {
        const base = [{ title: 'Sucursal' }, { title: 'Método' }];
        if (!wizard.metodo)
            return [...base, { title: 'Configuración' }];
        switch (wizard.metodo) {
            case 'rangoFechas':
                return [...base, { title: 'Criterio' }, { title: 'Confirmación' }];
            case 'documento':
                return [...base, { title: 'Documento' }, { title: 'Confirmación' }];
            case 'noCuadrados':
                return [...base, { title: 'No Cuadrados' }, { title: 'Confirmación' }];
            case 'criterio':
                return [...base, { title: 'Criterio' }, { title: 'Confirmación' }];
        }
    }, [wizard.metodo]);
    const steps = getSteps();
    const canGoNext = useCallback(() => {
        switch (current) {
            case 0:
                return wizard.sucursal !== null;
            case 1:
                return wizard.metodo !== null;
            case 2:
                if (wizard.metodo === 'rangoFechas') {
                    if (!wizard.tipoDoc || !wizard.fechaDesde || !wizard.fechaHasta)
                        return false;
                    if (wizard.subCriterio === 'entidad' && !wizard.entidadCodigo)
                        return false;
                    if (wizard.subCriterio === 'concepto' && !wizard.conceptoCodigo)
                        return false;
                    if (wizard.subCriterio === 'cuentaBancaria' && !wizard.cuentaBancaria)
                        return false;
                    return true;
                }
                if (wizard.metodo === 'documento')
                    return wizard.transaccionEncontrada !== null;
                if (wizard.metodo === 'noCuadrados')
                    return wizard.documentosSeleccionados.length > 0;
                if (wizard.metodo === 'criterio') {
                    if (!wizard.tipoDoc || !wizard.fechaDesde || !wizard.fechaHasta)
                        return false;
                    if (wizard.subCriterio === 'entidad' && !wizard.entidadCodigo)
                        return false;
                    if (wizard.subCriterio === 'concepto' && !wizard.conceptoCodigo)
                        return false;
                    if (wizard.subCriterio === 'cuentaBancaria' && !wizard.cuentaBancaria)
                        return false;
                    return true;
                }
                return false;
            case 3:
                return true;
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
            return (_jsx(PasoProcesando, { wizard: wizard, onTerminado: handleTerminado, onReiniciar: handleReiniciar }));
        }
        switch (current) {
            case 0:
                return (_jsx(PasoSucursal, { value: wizard.sucursal, onChange: (s) => updateWizard({ sucursal: s }) }));
            case 1:
                return (_jsx(PasoMetodo, { value: wizard.metodo, onChange: (m) => updateWizard({ metodo: m }) }));
            case 2:
                if (wizard.metodo === 'rangoFechas') {
                    return (_jsx(PasoCriterio, { sucursal: wizard.sucursal, tipoDoc: wizard.tipoDoc, fechaDesde: wizard.fechaDesde, fechaHasta: wizard.fechaHasta, subCriterio: wizard.subCriterio, entidadCodigo: wizard.entidadCodigo, conceptoCodigo: wizard.conceptoCodigo, cuentaBancaria: wizard.cuentaBancaria, onTipoDocChange: (v) => updateWizard({ tipoDoc: v }), onFechasChange: (d, h) => updateWizard({ fechaDesde: d, fechaHasta: h }), onSubCriterioChange: (sc) => updateWizard({ subCriterio: sc }), onEntidadChange: (v) => updateWizard({ entidadCodigo: v }), onConceptoChange: (v) => updateWizard({ conceptoCodigo: v }), onCuentaBancariaChange: (v) => updateWizard({ cuentaBancaria: v }), tiposPermitidos: ['ENP', 'DEV', 'FAC', 'SAP', 'DVC'] }));
                }
                if (wizard.metodo === 'documento') {
                    return (_jsx(PasoDocumento, { sucursal: wizard.sucursal, documento: wizard.documento, transaccion: wizard.transaccionEncontrada, onDocumentoChange: (d) => updateWizard({ documento: d, transaccionEncontrada: null }), onTransaccionEncontrada: (t) => updateWizard({ transaccionEncontrada: t }) }));
                }
                if (wizard.metodo === 'noCuadrados') {
                    return (_jsx(PasoNoCuadrados, { sucursal: wizard.sucursal, tipoDoc: wizard.tipoDoc, fechaDesde: wizard.fechaDesde, fechaHasta: wizard.fechaHasta, documentos: wizard.documentosNoCuadrados, seleccionados: wizard.documentosSeleccionados, onTipoDocChange: (v) => updateWizard({ tipoDoc: v }), onFechasChange: (d, h) => updateWizard({ fechaDesde: d, fechaHasta: h }), onDocumentosChange: (docs) => updateWizard({ documentosNoCuadrados: docs }), onSeleccionChange: (sel) => updateWizard({ documentosSeleccionados: sel }) }));
                }
                if (wizard.metodo === 'criterio') {
                    return (_jsx(PasoCriterio, { sucursal: wizard.sucursal, tipoDoc: wizard.tipoDoc, fechaDesde: wizard.fechaDesde, fechaHasta: wizard.fechaHasta, subCriterio: wizard.subCriterio, entidadCodigo: wizard.entidadCodigo, conceptoCodigo: wizard.conceptoCodigo, cuentaBancaria: wizard.cuentaBancaria, onTipoDocChange: (v) => updateWizard({ tipoDoc: v }), onFechasChange: (d, h) => updateWizard({ fechaDesde: d, fechaHasta: h }), onSubCriterioChange: (sc) => updateWizard({ subCriterio: sc }), onEntidadChange: (v) => updateWizard({ entidadCodigo: v }), onConceptoChange: (v) => updateWizard({ conceptoCodigo: v }), onCuentaBancariaChange: (v) => updateWizard({ cuentaBancaria: v }) }));
                }
                return null;
            case 3:
                return (_jsx(PasoConfirmacion, { wizard: wizard }));
            default:
                return null;
        }
    };
    if (terminado) {
        return (_jsx("div", { className: "repostear-wizard", children: _jsx("div", { className: "repostear-result", children: _jsx(Result, { status: "success", title: "Proceso completado", subTitle: "El reposteo de documentos ha finalizado. Revise el log para detalles.", extra: [
                        _jsx(Button, { type: "primary", onClick: handleReiniciar, children: "Nuevo Reposteo" }, "reiniciar"),
                    ] }) }) }));
    }
    const activeStepTitle = steps[current]?.title || '';
    const activeStepSubtitle = STEP_SUBTITLES[activeStepTitle] || '';
    return (_jsx("div", { className: "repostear-wizard", children: _jsxs("div", { className: "repostear-wizard__card", children: [_jsxs("div", { className: "repostear-wizard__header", children: [_jsx("div", { className: "repostear-wizard__header-icon", children: _jsx(RetweetOutlined, {}) }), _jsxs("div", { className: "repostear-wizard__header-text", children: [_jsx("h2", { children: "Repostear Documentos" }), _jsx("p", { children: "Procese y re-postee documentos contables" })] })] }), _jsxs("div", { className: "repostear-wizard__body", children: [_jsxs("div", { className: "repostear-wizard__steps", children: [_jsx(Steps, { direction: "vertical", size: "small", current: current, items: steps.map((s) => ({ title: s.title })) }), activeStepSubtitle && (_jsx("div", { className: "repostear-wizard__step-subtitle", children: activeStepSubtitle }))] }), _jsx("div", { className: "repostear-wizard__content repostear-step-enter", children: renderStepContent() }, current)] }), _jsx("div", { className: "repostear-wizard__divider" }), !procesando && !terminado && (_jsxs("div", { className: "repostear-wizard__footer", children: [_jsx(Button, { disabled: current === 0, onClick: handlePrev, children: "Atr\u00E1s" }), _jsxs(Space, { children: [current < steps.length - 1 && (_jsx(Button, { type: "primary", disabled: !canGoNext(), onClick: handleNext, children: "Siguiente" })), current === steps.length - 1 && (_jsx(Button, { className: "repostear-btn-procesar", icon: _jsx(CheckOutlined, {}), disabled: !canGoNext(), onClick: handleProcesar, children: "Procesar" }))] })] }))] }) }));
};
export default Repostear;
