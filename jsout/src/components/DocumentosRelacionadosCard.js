import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Card } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
const RUTA_MAP = {
    ENP: 'FENP', SAP: 'FSAP', RDE: 'FRDE',
    ORC: 'FORC', FAC: 'FFAC', PV: 'FPV',
    NCSUP: 'FNCSUP', NCCLI: 'FNCCLI',
    NDSUP: 'FNDSUP', NDCLI: 'FNDCLI',
    DEV: 'FDEV', DVC: 'FDVC', DBA: 'FDBASUP',
    RI: 'FRI',
    COT: 'FCotizacion',
};
const DocumentosRelacionadosCard = ({ documentos, currentId, rutaMap }) => {
    if (!documentos?.length)
        return null;
    const map = { ...RUTA_MAP, ...rutaMap };
    return (_jsx(Card, { title: _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Documentos Relacionados" }), className: "paces-card", style: { marginTop: 16 }, children: _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: documentos.map((rel) => {
                const esOrigen = rel.idOrigen === currentId;
                const tipoDoc = (esOrigen ? rel.destinoTipoDoc : rel.origenTipoDoc) ?? '';
                return (_jsxs("div", { style: { cursor: 'pointer', fontSize: 13 }, onClick: () => {
                        const doc = esOrigen
                            ? { tipo: rel.destinoTipoDoc, num: rel.destinoNumDoc, id: rel.idDestino, suc: rel.destinoSucursal }
                            : { tipo: rel.origenTipoDoc, num: rel.origenNumDoc, id: rel.idOrigen, suc: rel.origenSucursal };
                        if (doc.suc) {
                            const sucNum = parseInt(doc.suc, 10);
                            if (!isNaN(sucNum) && sucNum >= 0 && sucNum <= 5) {
                                useAuthStore.getState().setSucursalActiva(sucNum);
                            }
                        }
                        window.location.href = `/${map[doc.tipo] || doc.tipo}/${doc.id}`;
                    }, children: [_jsx(FileTextOutlined, { style: { marginRight: 6, color: '#556ee6' } }), esOrigen ? '→' : '←', " ", esOrigen
                            ? `${rel.destinoTipoDoc ?? '?'}-${rel.destinoNumDoc ?? '?'}`
                            : `${rel.origenTipoDoc ?? '?'}-${rel.origenNumDoc ?? '?'}`, (esOrigen ? rel.destinoSucursal : rel.origenSucursal) && (_jsxs("span", { style: { fontSize: 11, opacity: 0.7 }, children: [' ', "(", (esOrigen ? rel.destinoSucursal : rel.origenSucursal), ")"] }))] }, rel.id));
            }) }) }));
};
export default DocumentosRelacionadosCard;
