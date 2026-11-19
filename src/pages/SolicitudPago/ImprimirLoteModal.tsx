import React, { useEffect, useState, useMemo } from 'react';
import { Modal, Input, Segmented, DatePicker, Typography, Space, message } from 'antd';
import { SearchOutlined, CloseOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { ConceptoDTO } from '../../types/entradaAlmacen';
import type {
  CriterioImpresionLoteSolicitudPago,
  FiltroImpresionLoteSolicitudPago,
} from '../../types/solicitudPago';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import { toTitleCase } from '../../utils/formats';

const { RangePicker } = DatePicker;
const { Text } = Typography;

/** Convierte un parámetro de fecha (`yyyyMMddHHmmss` o `yyyyMMdd`) a dayjs. */
function parseFechaParam(val: string): Dayjs | null {
  if (!val) return null;
  const num = val.replace(/\D/g, '');
  if (num.length >= 14) {
    const y = parseInt(num.slice(0, 4), 10);
    const m = parseInt(num.slice(4, 6), 10) - 1;
    const d = parseInt(num.slice(6, 8), 10);
    const hh = parseInt(num.slice(8, 10), 10);
    const mm = parseInt(num.slice(10, 12), 10);
    const ss = parseInt(num.slice(12, 14), 10);
    return dayjs(new Date(y, m, d, hh, mm, ss));
  }
  if (num.length === 8) {
    const y = parseInt(num.slice(0, 4), 10);
    const m = parseInt(num.slice(4, 6), 10) - 1;
    const d = parseInt(num.slice(6, 8), 10);
    return dayjs(new Date(y, m, d));
  }
  return null;
}

/** Formatea un dayjs a `yyyyMMddHHmmss` (formato esperado por el backend). */
function formatFechaParam(d: Dayjs): string {
  return d.format('YYYYMMDDHHmmss');
}

/** Normaliza un número de documento SPA (`SPA-00020070`, `00020070`, `20070`) a su valor numérico.
 *  Igual que `ServicioSolicitudPago.NormalizarNumeroDocumento`: conserva solo dígitos y devuelve null si no quedan. */
function normalizarNumeroDocumento(valor: string): number | null {
  const soloDigitos = valor.replace(/\D/g, '');
  if (!soloDigitos) return null;
  const numero = Number(soloDigitos);
  return Number.isNaN(numero) ? null : numero;
}

interface ImprimirLoteModalProps {
  open: boolean;
  onClose: () => void;
  sucursal: number;
  /** Rango por defecto del listado (`{ desde, hasta }` en `yyyyMMddHHmmss`). */
  rangoDefault: { desde: string; hasta: string };
  /** Código de documento para el buscador de concepto. */
  documento: string;
  /** Ejecuta la impresión en lote. No lanza: los errores ya se muestran al usuario.
   *  Devuelve `true` si el PDF se generó correctamente (para cerrar el modal) o `false` si hubo error. */
  onImprimir: (params: FiltroImpresionLoteSolicitudPago) => Promise<boolean>;
}

const ImprimirLoteModal: React.FC<ImprimirLoteModalProps> = ({
  open,
  onClose,
  sucursal,
  rangoDefault,
  documento,
  onImprimir,
}) => {
  const [criterio, setCriterio] = useState<CriterioImpresionLoteSolicitudPago>('fecha');
  const [documentoDesde, setDocumentoDesde] = useState('');
  const [documentoHasta, setDocumentoHasta] = useState('');
  const [rangoFecha, setRangoFecha] = useState<[Dayjs, Dayjs] | null>(null);
  const [concepto, setConcepto] = useState<ConceptoDTO | null>(null);
  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);

  const rangoDefaultDayjs = useMemo<[Dayjs, Dayjs] | null>(() => {
    const desde = parseFechaParam(rangoDefault.desde);
    const hasta = parseFechaParam(rangoDefault.hasta);
    return desde && hasta ? [desde, hasta] : null;
  }, [rangoDefault]);

  // Reset de estado al abrir/cerrar.
  useEffect(() => {
    if (!open) {
      setImprimiendo(false);
      return;
    }
    setCriterio('fecha');
    setDocumentoDesde('');
    setDocumentoHasta('');
    setRangoFecha(rangoDefaultDayjs);
    setConcepto(null);
    setConceptoModalOpen(false);
    setImprimiendo(false);
  }, [open, rangoDefaultDayjs]);

  /** Valida los campos del criterio activo y construye los params de impresión. */
  const construirParams = (): FiltroImpresionLoteSolicitudPago | null => {
    if (criterio === 'documento') {
      const desde = documentoDesde.trim();
      const hasta = documentoHasta.trim();
      if (!desde || !hasta) {
        message.warning('Debe indicar el documento desde y hasta');
        return null;
      }
      const desdeNum = normalizarNumeroDocumento(desde);
      const hastaNum = normalizarNumeroDocumento(hasta);
      if (desdeNum === null || hastaNum === null) {
        message.warning('Los documentos deben ser numéricos');
        return null;
      }
      if (desdeNum > hastaNum) {
        message.warning('El documento desde no puede ser mayor que el documento hasta');
        return null;
      }
      return { criterio: 'documento', documentoDesde: desde, documentoHasta: hasta };
    }

    if (criterio === 'fecha') {
      if (!rangoFecha || !rangoFecha[0] || !rangoFecha[1]) {
        message.warning('Debe seleccionar un rango de fechas');
        return null;
      }
      return {
        criterio: 'fecha',
        desde: formatFechaParam(rangoFecha[0]),
        hasta: formatFechaParam(rangoFecha[1]),
      };
    }

    // criterio === 'concepto'
    if (!concepto?.codigo) {
      message.warning('Debe seleccionar un concepto');
      return null;
    }
    return {
      criterio: 'concepto',
      concepto: concepto.codigo,
      conceptoTexto: concepto.nombre || '',
    };
  };

  const handleConfirmar = async () => {
    const params = construirParams();
    if (!params) return;
    setImprimiendo(true);
    try {
      const ok = await onImprimir(params);
      if (ok) onClose();
    } finally {
      setImprimiendo(false);
    }
  };

  return (
    <Modal
      title="Imprimir en lote"
      open={open}
      onCancel={() => { if (!imprimiendo) onClose(); }}
      onOk={handleConfirmar}
      okText="Imprimir"
      cancelText="Cancelar"
      okButtonProps={{ loading: imprimiendo, disabled: imprimiendo }}
      cancelButtonProps={{ disabled: imprimiendo }}
      maskClosable={!imprimiendo}
      width={480}
      destroyOnHidden
    >
      <div style={{ marginBottom: 16 }}>
        <Segmented
          block
          value={criterio}
          onChange={(val) => setCriterio(val as CriterioImpresionLoteSolicitudPago)}
          options={[
            { label: 'Rango de documento', value: 'documento' },
            { label: 'Rango de fecha', value: 'fecha' },
            { label: 'Concepto', value: 'concepto' },
          ]}
        />
      </div>

      {criterio === 'documento' && (
        <div>
          <div style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>
            Documento <Text type="secondary" style={{ fontSize: 12 }}>(ej. 00020070 o SPA-00020070)</Text>
          </div>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="Desde (ej. 00020070)"
              value={documentoDesde}
              onChange={(e) => setDocumentoDesde(e.target.value)}
              maxLength={20}
            />
            <Input
              placeholder="Hasta (ej. SPA-00020070)"
              value={documentoHasta}
              onChange={(e) => setDocumentoHasta(e.target.value)}
              maxLength={20}
            />
          </Space.Compact>
        </div>
      )}

      {criterio === 'fecha' && (
        <div>
          <div style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>Rango de fecha</div>
          <RangePicker
            value={rangoFecha}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setRangoFecha([dates[0], dates[1]]);
              } else {
                setRangoFecha(null);
              }
            }}
            style={{ width: '100%' }}
            placeholder={['Desde', 'Hasta']}
            allowClear
          />
        </div>
      )}

      {criterio === 'concepto' && (
        <div>
          <div style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>Concepto</div>
          <Input
            readOnly
            placeholder="Seleccione un concepto"
            value={concepto ? `${concepto.codigo} - ${toTitleCase(concepto.nombre)}` : ''}
            onClick={() => setConceptoModalOpen(true)}
            suffix={
              <Space size={4}>
                {concepto && (
                  <CloseOutlined
                    onClick={(e) => { e.stopPropagation(); setConcepto(null); }}
                    style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }}
                  />
                )}
                <SearchOutlined style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }} />
              </Space>
            }
          />
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Máximo 200 documentos por impresión.
        </Text>
      </div>

      <BuscarConceptoModal
        open={conceptoModalOpen}
        onClose={() => setConceptoModalOpen(false)}
        onSelect={(c) => setConcepto(c)}
        sucursal={sucursal}
        documento={documento}
      />
    </Modal>
  );
};

export default ImprimirLoteModal;
