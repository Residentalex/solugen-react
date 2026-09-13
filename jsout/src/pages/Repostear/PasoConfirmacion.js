import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { Typography, message } from 'antd';
import { useUIStore } from '../../stores/uiStore';
import { useCompanyStore } from '../../stores/companyStore';
import { formatCurrency } from '../../utils/formats';
import { Sucursal } from '../../types/auth';
import { transaccionApi } from '../../api/transaccionApi';
const { Text } = Typography;
const TIPOS_DOCUMENTO = {
    ENP: 'ENP - Entrada de Almacén',
    SAP: 'SAP - Salida de Almacén',
    FAC: 'FAC - Factura a Cliente',
    DEV: 'DEV - Devolución de Venta',
    DVC: 'DVC - Devolución de Compra',
    RDE: 'RDE - Factura de Suplidor',
    TRA: 'TRA - Transferencia',
    DEP: 'DEP - Documento Bancario',
    EDI: 'EDI - Entrada de Diario',
};
const METODO_LABEL = {
    rangoFechas: 'Rango de Fechas',
    documento: 'Documento Individual',
    noCuadrados: 'No Cuadrados',
    criterio: 'Por Criterio',
};
function formatFecha(fecha) {
    if (!fecha || fecha.length < 8)
        return fecha || '-';
    // Si viene en formato yyyyMMddHHmmss
    if (fecha.length === 14) {
        const dia = fecha.substring(6, 8);
        const mes = fecha.substring(4, 6);
        const anio = fecha.substring(0, 4);
        return `${dia}/${mes}/${anio}`;
    }
    // Si viene en formato ISO (yyyy-MM-dd)
    if (fecha.includes('-')) {
        const [anio, mes, dia] = fecha.split('T')[0].split('-');
        return `${dia}/${mes}/${anio}`;
    }
    // Fallback: mostrar como está
    return fecha;
}
function getFiltroAdicional(wizard) {
    if (!wizard.subCriterio)
        return null;
    switch (wizard.subCriterio) {
        case 'entidad':
            return `Entidad: ${wizard.entidadCodigo || '(no especificado)'}`;
        case 'concepto':
            return `Concepto: ${wizard.conceptoCodigo || '(no especificado)'}`;
        case 'cuentaBancaria':
            return `Cuenta Bancaria: ${wizard.cuentaBancaria || '(no especificado)'}`;
        case 'soloFecha':
            return 'Solo Fecha';
        default:
            return null;
    }
}
const PasoConfirmacion = ({ wizard }) => {
    const isDarkMode = useUIStore((s) => s.isDarkMode);
    const sucursalesData = useCompanyStore((s) => s.data.sucursales);
    // ── Bug 2: Estado y efecto para conteo de documentos ──
    const [documentCountLabel, setDocumentCountLabel] = useState('Por procesar');
    useEffect(() => {
        if (!wizard.metodo)
            return;
        // Métodos con conteo síncrono
        if (wizard.metodo === 'noCuadrados') {
            setDocumentCountLabel(String(wizard.documentosSeleccionados.length));
            return;
        }
        if (wizard.metodo === 'documento') {
            setDocumentCountLabel(wizard.transaccionEncontrada ? '1' : '0');
            return;
        }
        // Métodos que requieren API: rangoFechas, criterio
        const puedeUsarApi = wizard.sucursal !== null && wizard.tipoDoc && wizard.fechaDesde && wizard.fechaHasta;
        if (!puedeUsarApi) {
            setDocumentCountLabel('Por determinar');
            return;
        }
        // Para criterio con subcriterio avanzado, no hay endpoint de conteo específico
        if (wizard.metodo === 'criterio' && wizard.subCriterio && wizard.subCriterio !== 'soloFecha') {
            setDocumentCountLabel('Por determinar (consulte el progreso)');
            return;
        }
        // Llamar API contarPosteable
        setDocumentCountLabel('Calculando…');
        transaccionApi
            .contarPosteable(wizard.sucursal, wizard.tipoDoc, wizard.fechaDesde, wizard.fechaHasta)
            .then((count) => setDocumentCountLabel(String(count)))
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al contar documentos';
            message.error(msg);
            setDocumentCountLabel('No disponible');
        });
    }, [
        wizard.metodo,
        wizard.sucursal,
        wizard.tipoDoc,
        wizard.fechaDesde,
        wizard.fechaHasta,
        wizard.subCriterio,
        wizard.documentosSeleccionados.length,
        wizard.transaccionEncontrada,
    ]);
    // ── Bug 1: Corregir sucursalNombre ──
    const sucursalNombre = (() => {
        if (wizard.sucursal === null)
            return 'No especificada';
        // Primero buscar en sucursalesData por número (CompaniaDTO.sucursal es entero)
        const encontrada = sucursalesData?.find((s) => s.sucursal === wizard.sucursal);
        if (encontrada?.nombre)
            return encontrada.nombre;
        // Fallback: nombre canónico desde el enum Sucursal
        const enumKey = Object.entries(Sucursal).find(([, v]) => v === wizard.sucursal)?.[0];
        return enumKey || `Sucursal ${wizard.sucursal}`;
    })();
    const tipoDocNombre = TIPOS_DOCUMENTO[wizard.tipoDoc] || wizard.tipoDoc || '-';
    const metodoLabel = wizard.metodo ? METODO_LABEL[wizard.metodo] || wizard.metodo : '-';
    const tieneRangoFechas = !!(wizard.fechaDesde && wizard.fechaHasta);
    const filtroAdicional = getFiltroAdicional(wizard);
    const mostrarTotales = wizard.metodo === 'noCuadrados' && wizard.documentosSeleccionados.length > 0;
    const totalDebitos = mostrarTotales
        ? wizard.documentosSeleccionados.reduce((sum, d) => sum + d.debitos, 0)
        : 0;
    const totalCreditos = mostrarTotales
        ? wizard.documentosSeleccionados.reduce((sum, d) => sum + d.creditos, 0)
        : 0;
    /* ---- Estilos ---- */
    const cardBg = isDarkMode ? '#2d2d44' : '#f8f9fa';
    const cardBorder = isDarkMode ? '#3d3d5c' : '#e8ecf0';
    const titleColor = isDarkMode ? '#e0e0e0' : '#333';
    const labelColor = isDarkMode ? '#a2a3b7' : '#8c8c8c';
    const valueColor = isDarkMode ? '#e0e0e0' : '#333';
    const dividerColor = isDarkMode ? '#3d3d5c' : '#e8ecf0';
    const rowBorderColor = isDarkMode ? '#3d3d5c' : '#f0f0f0';
    const Row = ({ label, value }) => (_jsxs("div", { className: "repostear-summary-card__row", style: { borderBottomColor: rowBorderColor }, children: [_jsx("span", { className: "repostear-summary-card__label", style: { color: labelColor }, children: label }), _jsx("span", { className: "repostear-summary-card__value", style: { color: valueColor }, children: value })] }));
    /* ---- Estado sin método ---- */
    if (!wizard.metodo) {
        return (_jsxs("div", { children: [_jsx(Text, { style: {
                        display: 'block',
                        marginBottom: 24,
                        fontSize: 16,
                        fontWeight: 500,
                        color: isDarkMode ? '#e0e0e0' : undefined,
                    }, children: "Confirme los datos antes de procesar" }), _jsx(Text, { type: "secondary", children: "Seleccione un m\u00E9todo de posteo para ver el resumen." })] }));
    }
    /* ---- Resumen unificado ---- */
    return (_jsxs("div", { children: [_jsx(Text, { style: {
                    display: 'block',
                    marginBottom: 24,
                    fontSize: 16,
                    fontWeight: 500,
                    color: isDarkMode ? '#e0e0e0' : undefined,
                }, children: "Confirme los datos antes de procesar" }), _jsxs("div", { className: "repostear-summary-card", style: { background: cardBg, borderColor: cardBorder }, children: [_jsx("div", { className: "repostear-summary-card__title", style: { color: titleColor }, children: "\uD83D\uDCCB Resumen de Reposteo" }), _jsx(Row, { label: "Sucursal", value: sucursalNombre }), _jsx(Row, { label: "Tipo Documento", value: tipoDocNombre }), _jsx(Row, { label: "M\u00E9todo", value: metodoLabel }), tieneRangoFechas && (_jsx(Row, { label: "Rango Fechas", value: `${formatFecha(wizard.fechaDesde)} - ${formatFecha(wizard.fechaHasta)}` })), filtroAdicional && _jsx(Row, { label: "Filtro adicional", value: filtroAdicional }), _jsx("div", { className: "repostear-summary-card__divider", style: { background: dividerColor } }), _jsx(Row, { label: "Documentos a repostear", value: documentCountLabel }), mostrarTotales && (_jsxs(_Fragment, { children: [_jsx(Row, { label: "Total D\u00E9bitos", value: formatCurrency(totalDebitos) }), _jsx(Row, { label: "Total Cr\u00E9ditos", value: formatCurrency(totalCreditos) })] }))] })] }));
};
export default PasoConfirmacion;
