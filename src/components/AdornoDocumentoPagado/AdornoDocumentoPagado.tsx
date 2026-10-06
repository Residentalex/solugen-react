import './AdornoDocumentoPagado.css';

interface AdornoDocumentoPagadoProps {
  total: string | number | null | undefined;
  saldoPendiente: string | number | null | undefined;
}

const TOLERANCIA_SALDO = 0.01;

const AdornoDocumentoPagado = ({ total, saldoPendiente }: AdornoDocumentoPagadoProps) => {
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

  return (
    <div
      className="adorno-documento-pagado"
      role="status"
      aria-label="Documento pagado"
    >
      <span className="adorno-documento-pagado__texto">PAGADO</span>
    </div>
  );
};

export default AdornoDocumentoPagado;
