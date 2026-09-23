import { formatTicketPOS } from './src/utils/escpos-formatter';
import { escposToHtml } from './src/utils/escposToHtml';

const cfg: any = {
  zonas: [
    {
      id: 'z1', tipo: 'encabezado_reporte',
      lineas: [
        { ref: 'CAMPO:NCF', lineaNum: 1, tabular: { ancho: 12 }, formatoLabel: { alineacion: 'derecha' } },
        { ref: 'CAMPO:FECHA', lineaNum: 2, tabular: { ancho: 12 }, formatoLabel: { alineacion: 'derecha' } },
      ]
    }
  ],
  opciones: { anchoLinea: 48 }
};

const data: any = { ncf: 'B010', fechaDocumento: '2026-01-01' };

const raw = formatTicketPOS(data, { nombre: 'TEST' }, cfg);
console.log('=== RAW DERECHA ===');
console.log(raw);
console.log('=== HTML DERECHA ===');
console.log(escposToHtml(raw, { fontSizeBase: 10 }));
