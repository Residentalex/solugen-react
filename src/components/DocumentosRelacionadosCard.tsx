import React from 'react';
import { Card } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import type { DocumentoRelacionDTO } from '../api/documentoRelacionApi';
import { useAuthStore } from '../stores/authStore';

const RUTA_MAP: Record<string, string> = {
  ENP: 'FENP', SAP: 'FSAP', RDE: 'FRDE',
  ORC: 'FORC', FAC: 'FFAC', PV: 'FPV',
  NCSUP: 'FNCSUP', NCCLI: 'FNCCLI',
  NDSUP: 'FNDSUP', NDCLI: 'FNDCLI',
  DEV: 'FDEV', DVC: 'FDVC', DBA: 'FDBASUP',
  RI: 'FRI',
  COT: 'FCotizacion',
};

interface DocumentosRelacionadosCardProps {
  documentos: DocumentoRelacionDTO[];
  currentId?: number;
  rutaMap?: Record<string, string>;
}

const DocumentosRelacionadosCard: React.FC<DocumentosRelacionadosCardProps> = ({
  documentos, currentId, rutaMap
}) => {
  if (!documentos?.length) return null;

  const map = { ...RUTA_MAP, ...rutaMap };

  return (
    <Card
      title={<span style={{ fontSize: 16, fontWeight: 600 }}>Documentos Relacionados</span>}
      className="paces-card"
      style={{ marginTop: 16 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {documentos.map((rel) => {
          const esOrigen = rel.idOrigen === currentId;
          const tipoDoc = (esOrigen ? rel.destinoTipoDoc : rel.origenTipoDoc) ?? '';

          return (
            <div
              key={rel.id}
              style={{ cursor: 'pointer', fontSize: 13 }}
              onClick={() => {
                const doc = esOrigen
                  ? { tipo: rel.destinoTipoDoc, num: rel.destinoNumDoc, id: rel.idDestino, suc: rel.destinoSucursal }
                  : { tipo: rel.origenTipoDoc, num: rel.origenNumDoc, id: rel.idOrigen, suc: rel.origenSucursal };
                if (doc.suc) {
                  const sucNum = parseInt(doc.suc, 10);
                  if (!isNaN(sucNum) && sucNum >= 0 && sucNum <= 5) {
                    useAuthStore.getState().setSucursalActiva(sucNum as 0 | 1 | 2 | 3 | 4 | 5);
                  }
                }
                window.location.href = `/${map[doc.tipo] || doc.tipo}/${doc.id}`;
              }}
            >
              <FileTextOutlined style={{ marginRight: 6, color: '#556ee6' }} />
              {esOrigen ? '→' : '←'} {esOrigen
                ? `${rel.destinoTipoDoc ?? '?'}-${rel.destinoNumDoc ?? '?'}`
                : `${rel.origenTipoDoc ?? '?'}-${rel.origenNumDoc ?? '?'}`}
              {(esOrigen ? rel.destinoSucursal : rel.origenSucursal) && (
                <span style={{ fontSize: 11, opacity: 0.7 }}>
                  {' '}({(esOrigen ? rel.destinoSucursal : rel.origenSucursal)})
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default DocumentosRelacionadosCard;
