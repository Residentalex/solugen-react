import { formatTicketPOS } from './src/utils/escpos-formatter';
import { escposToHtml } from './src/utils/escposToHtml';
import { normalizarConfig } from './src/utils/ticketPlantillaConfig';

const cfg: any = {
  zonas: [
    {
      id: 'z1', tipo: 'encabezado_reporte',
      lineas: [
        { ref: 'CAMPO:NCF', lineaNum: 1, tabular: { ancho: 12 }, formatoLabel: { alineacion: 'izquierda' } },
        { ref: 'CAMPO:FECHA', lineaNum: 2, tabular: { ancho: 12 }, formatoLabel: { alineacion: 'izquierda' } },
      ]
    }
  ],
  opciones: { anchoLinea: 48 }
};

const data: any = { ncf: 'B010', fechaDocumento: '2026-01-01' };

const raw = formatTicketPOS(data, { nombre: 'TEST' }, cfg);
console.log('=== RAW ===');
console.log(raw);
console.log('=== HTML ===');
console.log(escposToHtml(raw, { fontSizeBase: 10 }));
