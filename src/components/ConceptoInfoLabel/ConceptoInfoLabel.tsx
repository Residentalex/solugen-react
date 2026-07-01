import type { ConceptoDTO } from '../../types/entradaAlmacen';

interface ConceptoInfoLabelProps {
  concepto: ConceptoDTO | null;
}

function ConceptoInfoLabel({ concepto }: ConceptoInfoLabelProps) {
  if (!concepto) return null;

  const flags: string[] = [];
  if (concepto.noImpuesto) flags.push('No Impuestos');
  if (concepto.noAsientos) flags.push('No Asientos');
  if (concepto.noActualizaCostos) flags.push('No Actualiza Costos');

  if (flags.length === 0) return null;

  return (
    <div style={{ marginTop: 2, fontSize: 12, color: '#faad14', lineHeight: '18px' }}>
      {flags.map((flag, i) => (
        <span key={flag}>
          {i > 0 && <span> · </span>}
          * {flag} *
        </span>
      ))}
    </div>
  );
}

export default ConceptoInfoLabel;
