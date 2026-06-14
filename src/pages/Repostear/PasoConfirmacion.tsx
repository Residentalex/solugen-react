import React from 'react';
import { Typography } from 'antd';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency } from '../../utils/formats';
import type { WizardState } from './Repostear';

const { Text } = Typography;

const TIPOS_DOCUMENTO: Record<string, string> = {
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

const METODO_LABEL: Record<string, string> = {
  rangoFechas: 'Rango de Fechas',
  documento: 'Documento Individual',
  noCuadrados: 'No Cuadrados',
  criterio: 'Por Criterio',
};

function formatFecha(fecha: string): string {
  if (!fecha || fecha.length < 8) return fecha || '-';
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

function getFiltroAdicional(wizard: WizardState): string | null {
  if (!wizard.subCriterio) return null;
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

interface Props {
  wizard: WizardState;
}

const PasoConfirmacion: React.FC<Props> = ({ wizard }) => {
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const sucursalesPermitidas = useAuthStore((s) => s.sucursalesPermitidas);

  /* ---- Datos del resumen ---- */
  const sucursalNombre =
    wizard.sucursal !== null
      ? sucursalesPermitidas.find((s) => s.sucursal === wizard.sucursal)?.nombre ||
        `Sucursal ${wizard.sucursal}`
      : 'No especificada';

  const tipoDocNombre = TIPOS_DOCUMENTO[wizard.tipoDoc] || wizard.tipoDoc || '-';
  const metodoLabel = wizard.metodo ? METODO_LABEL[wizard.metodo] || wizard.metodo : '-';
  const tieneRangoFechas = !!(wizard.fechaDesde && wizard.fechaHasta);
  const filtroAdicional = getFiltroAdicional(wizard);

  const documentosCount =
    wizard.metodo === 'noCuadrados'
      ? String(wizard.documentosSeleccionados.length)
      : wizard.metodo === 'documento'
        ? wizard.transaccionEncontrada
          ? '1'
          : '0'
        : 'Por procesar';

  const mostrarTotales =
    wizard.metodo === 'noCuadrados' && wizard.documentosSeleccionados.length > 0;
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

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div
      className="repostear-summary-card__row"
      style={{ borderBottomColor: rowBorderColor }}
    >
      <span className="repostear-summary-card__label" style={{ color: labelColor }}>
        {label}
      </span>
      <span className="repostear-summary-card__value" style={{ color: valueColor }}>
        {value}
      </span>
    </div>
  );

  /* ---- Estado sin método ---- */
  if (!wizard.metodo) {
    return (
      <div>
        <Text
          style={{
            display: 'block',
            marginBottom: 24,
            fontSize: 16,
            fontWeight: 500,
            color: isDarkMode ? '#e0e0e0' : undefined,
          }}
        >
          Confirme los datos antes de procesar
        </Text>
        <Text type="secondary">Seleccione un método de posteo para ver el resumen.</Text>
      </div>
    );
  }

  /* ---- Resumen unificado ---- */
  return (
    <div>
      <Text
        style={{
          display: 'block',
          marginBottom: 24,
          fontSize: 16,
          fontWeight: 500,
          color: isDarkMode ? '#e0e0e0' : undefined,
        }}
      >
        Confirme los datos antes de procesar
      </Text>

      <div
        className="repostear-summary-card"
        style={{ background: cardBg, borderColor: cardBorder }}
      >
        <div className="repostear-summary-card__title" style={{ color: titleColor }}>
          📋 Resumen de Reposteo
        </div>

        <Row label="Sucursal" value={sucursalNombre} />
        <Row label="Tipo Documento" value={tipoDocNombre} />
        <Row label="Método" value={metodoLabel} />
        {tieneRangoFechas && (
          <Row label="Rango Fechas" value={`${formatFecha(wizard.fechaDesde)} - ${formatFecha(wizard.fechaHasta)}`} />
        )}
        {filtroAdicional && <Row label="Filtro adicional" value={filtroAdicional} />}

        <div className="repostear-summary-card__divider" style={{ background: dividerColor }} />

        <Row label="Documentos a repostear" value={documentosCount} />
        {mostrarTotales && (
          <>
            <Row label="Total Débitos" value={formatCurrency(totalDebitos)} />
            <Row label="Total Créditos" value={formatCurrency(totalCreditos)} />
          </>
        )}
      </div>
    </div>
  );
};

export default PasoConfirmacion;
