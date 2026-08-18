import { formatTicketPOS } from 'D:/Developer/Genesis/solugen-react/src/utils/escpos-formatter';

const companyEjemplo = {
  nombre: 'SU EMPRESA DEMO',
  direccion: 'AV. DEMO 123, SANTO DOMINGO',
  telefono: '809-000-0000',
  rnc: '1-01-00000-1',
};
const datosEjemploPOS = {
  ncf: 'B0100000001',
  transaccionNCF: { nombreTipoComprobante: 'CREDITO FISCAL' },
  cajero: 'JUAN PEREZ', caja: 'CAJA 01', turno: 'TURNO A',
  fechaDocumento: '2026-08-02T15:30:00', noDocumento: '0001',
  cliente: { nombre: 'CONSUMIDOR FINAL', identificacion: '402-1234567-8' },
  subTotal: 100.0, impuestos: 18.0, descuento: 0, total: 118.0,
  detalles: [
    { articulo: 'ACEITE VEGETAL 1L', codigo: '000123', cantidad: 2, precio: 50.0, impuestos: 9.0, total: 100.0 },
  ],
  cobros: [{ efectivo: 200, cheque: 0, tarjetaCredito: 0, tarjetaDebito: 0, transferencia: 0, bono: 0, tarjetaRegalo: 0, notaCredito: 0 }],
};

const config = {
  encabezado: { formato: { compania: { tamano: 'doble' } } },
  titulo: { texto: 'FACTURA DE PRUEBA', formato: { alineacion: 'derecha', negrita: true } },
  detalle: { formato: { articulo: { alineacion: 'derecha' } } },
  totales: { formato: { total: { tamano: 'condensada' } } },
  cobros: { formato: { alineacion: 'izquierda' } },
  campos: { tabular: { ancho: 12 } },
} as any;

const legible = (raw: string) => raw
  .replace(/\x1B/g, '<ESC>').replace(/\x1D/g, '<GS>')
  .replace(/\n/g, '<LF>\n').replace(/[\x00-\x1F]/g, (c) => `[${c.charCodeAt(0).toString(16).toUpperCase()}]`);

const out = formatTicketPOS(datosEjemploPOS, companyEjemplo, config);
const idx = out.indexOf('TOTAL GRAVADO');
console.log('=== FPV totales/cobros (secciones) ===');
console.log(legible(out.slice(idx)));