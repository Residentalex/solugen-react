import './AdornoDocumentoPagado.css';
import type { DocumentoRelacionDTO } from '../../api/documentoRelacionApi';

interface AdornoDocumentoPagadoProps {
  total: string | number | null | undefined;
  saldoPendiente: string | number | null | undefined;
  documentosRelacionados: DocumentoRelacionDTO[];
  idDocumento: number;
}

const TOLERANCIA_SALDO = 0.01;

const AdornoDocumentoPagado = ({
  total,
  saldoPendiente,
  documentosRelacionados,
  idDocumento,
}: AdornoDocumentoPagadoProps) => {
  const totalNumerico = Number(total ?? 0);
  const saldoNumerico = Number(saldoPendiente);

  if (
    !Number.isFinite(totalNumerico)
    || !Number.isFinite(saldoNumerico)
    || totalNumerico <= 0
    || saldoNumerico > TOLERANCIA_SALDO
  ) {
    return null;
  }

  const tieneNotaCreditoRelacionada = documentosRelacionados.some((relacion) => {
    const tipoDocumentoRelacionado = relacion.idOrigen === idDocumento
      ? relacion.destinoTipoDoc
      : relacion.idDestino === idDocumento
        ? relacion.origenTipoDoc
        : '';

    return tipoDocumentoRelacionado === 'NCCLI' || tipoDocumentoRelacionado === 'NCSUP';
  });
  const etiqueta = tieneNotaCreditoRelacionada ? 'CANCELADO' : 'PAGADO';

  return (
    <div
      className="adorno-documento-pagado"
      role="status"
      aria-label={`Documento ${etiqueta.toLowerCase()}`}
    >
      <span className="adorno-documento-pagado__texto">{etiqueta}</span>
    </div>
  );
};

export default AdornoDocumentoPagado;
