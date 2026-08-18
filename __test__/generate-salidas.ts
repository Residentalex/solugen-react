/**
 * Harness de regresion: genera la salida ESC/POS con config: null (sin config)
 * para FPV y FRI usando los mismos datos de ejemplo del preview del editor
 * (ReportesConfigEditor.tsx). La salida debe coincidir byte a byte con el
 * formato predeterminado (regresion cero).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { formatTicketPOS, formatTicketReciboIngreso } from 'D:/Developer/Genesis/solugen-react/src/utils/escpos-formatter';
import { escposToHtml } from 'D:/Developer/Genesis/solugen-react/src/utils/escposToHtml';

const companyEjemplo = {
  nombre: 'SU EMPRESA DEMO',
  direccion: 'AV. DEMO 123, SANTO DOMINGO',
  telefono: '809-000-0000',
  rnc: '1-01-00000-1',
};

const datosEjemploPOS = {
  ncf: 'B0100000001',
  transaccionNCF: { nombreTipoComprobante: 'CREDITO FISCAL' },
  cajero: 'JUAN PEREZ',
  caja: 'CAJA 01',
  turno: 'TURNO A',
  fechaDocumento: '2026-08-02T15:30:00',
  noDocumento: '0001',
  ncfModificado: 'B0100000002',
  referencia: 'REF-0001',
  nota: 'Nota de ejemplo',
  tasa: 1,
  diasCredito: 30,
  retenciones: 0,
  estado: 1,
  cliente: {
    nombre: 'CONSUMIDOR FINAL',
    identificacion: '402-1234567-8',
    telefono: '809-111-2222',
    direccion: 'AV. CLIENTE 45',
  },
  secuenciaNCF: { nombre: 'CREDITO FISCAL', tipoComprobante: '30' },
  concepto: { nombre: 'VENTA AL CONTADO' },
  almacen: { nombre: 'ALMACEN PRINCIPAL' },
  moneda: { nombre: 'PESO DOMINICANO' },
  sucursal: { nombre: 'SUCURSAL CENTRAL', telefono: '809-333-4444', direccion: 'AV. SUCURSAL 10' },
  subTotal: 100.0,
  impuestos: 18.0,
  descuento: 0,
  total: 118.0,
  detalles: [
    { articulo: 'ACEITE VEGETAL 1L', codigo: '000123', cantidad: 2, precio: 50.0, impuestos: 9.0, total: 100.0 },
    { articulo: 'ARROZ SELECTO 5LB', codigo: '000456', cantidad: 1, precio: 18.0, impuestos: 3.24, total: 18.0 },
  ],
  cobros: [{
    efectivo: 200, cheque: 0, tarjetaCredito: 0, tarjetaDebito: 0,
    transferencia: 0, bono: 0, tarjetaRegalo: 0, notaCredito: 0,
  }],
};

const datosEjemploRecibo = {
  ncf: 'B0100000002',
  fechaDocumento: '2026-08-02T15:30:00',
  noDocumento: '0002',
  tipo: { codigo: 'RI', nombre: 'Recibo de Ingreso' },
  concepto: { nombre: 'COBRO A CUENTA' },
  entidad: {
    nombre: 'CLIENTE DEMO',
    identificacion: '402-1234567-8',
    telefono: '809-555-6666',
    direccion: 'AV. ENTIDAD 20',
  },
  moneda: { nombre: 'PESO DOMINICANO' },
  sucursal: { nombre: 'SUCURSAL CENTRAL' },
  nota: 'Pago parcial',
  referencia: 'REF-RI-0001',
  tasa: 1,
  subTotal: 500.0,
  descuento: 0,
  impuestos: 0,
  retenciones: 0,
  estado: 1,
  periodo: 202608,
  diasCredito: 0,
  total: 500.0,
  transaccionesAsociadas: [
    { documento: 'FACT-0001', montoOriginal: 500.0, pagado: 300.0, monto: 300.0 },
    { documento: 'FACT-0002', montoOriginal: 300.0, pagado: 200.0, monto: 200.0 },
  ],
  cobros: [{ medioCobro: 'Efectivo', monto: 500.0 }],
};

/** Version legible: todos los bytes de control visibles y saltos explícitos. */
function legible(raw: string): string {
  return raw
    .replace(/\x1B/g, '<ESC>')
    .replace(/\x1D/g, '<GS>')
    .replace(/\n/g, '<LF>\n')
    .replace(/[\x00-\x1F]/g, (c) => `[${c.charCodeAt(0).toString(16).toUpperCase()}]`);
}

const salidaFPV = formatTicketPOS(datosEjemploPOS, companyEjemplo, undefined);
const salidaFRI = formatTicketReciboIngreso(datosEjemploRecibo, companyEjemplo, undefined);

/* Config representativa con labels editados + items especiales + texto libre + campo DTO. */
const configConItemsFPV = {
  campos: {
    orden: ['SEPARADOR', 'ESPACIO', 'LIBRE:promo', 'DTO:tel', 'NCF', 'TIPO_COMP', 'RNC_CLIENTE'],
    labels: { NCF: 'COMPROBANTE' },
    textosLibres: { promo: 'OFERTA 2X1\nSOLO HOY' },
    camposDTO: { tel: { label: 'TEL', ruta: 'cliente.telefono', tipo: 'texto' } },
  },
} as any;
const configConItemsFRI = {
  campos: {
    orden: ['SEPARADOR', 'ESPACIO', 'LIBRE:promo', 'DTO:tel', 'NCF', 'FECHA', 'ENTIDAD'],
    labels: { NCF: 'COMPROBANTE' },
    textosLibres: { promo: 'OFERTA 2X1\nSOLO HOY' },
    camposDTO: { tel: { label: 'TEL', ruta: 'entidad.telefono', tipo: 'texto' } },
  },
} as any;

const salidaFPVItems = formatTicketPOS(datosEjemploPOS, companyEjemplo, configConItemsFPV);
const salidaFRIItems = formatTicketReciboIngreso(datosEjemploRecibo, companyEjemplo, configConItemsFRI);

/* Config con formatos: alineacion/negrita/tamano en LIBRE, DTO y campos estandar. */
const configFormatosFPV = {
  campos: {
    orden: ['SEPARADOR', 'LIBRE:promo', 'LIBRE:promoDer', 'LIBRE:promoDoble', 'DTO:tel', 'DTO:telCond', 'NCF', 'CLIENTE'],
    textosLibres: {
      promo: { texto: 'OFERTA 2X1\nSOLO HOY' },
      promoDer: { texto: 'PROMO DERECHA', alineacion: 'derecha', negrita: true, tamano: 'normal' },
      promoDoble: { texto: 'PROMO DOBLE', alineacion: 'derecha', negrita: true, tamano: 'doble' },
    },
    camposDTO: {
      tel: { label: 'TEL', ruta: 'cliente.telefono', tipo: 'texto' },
      telCond: { label: 'TEL COND', ruta: 'cliente.telefono', tipo: 'texto', tamano: 'condensada' },
    },
    formatos: {
      NCF: { alineacion: 'derecha', negrita: true },
      CLIENTE: { alineacion: 'centro' },
    },
  },
} as any;
const configFormatosFRI = {
  campos: {
    orden: ['SEPARADOR', 'LIBRE:promoDer', 'DTO:telCond', 'NCF', 'FECHA', 'ENTIDAD'],
    textosLibres: { promoDer: { texto: 'RI DERECHA', alineacion: 'derecha', negrita: true } },
    camposDTO: { telCond: { label: 'TEL COND', ruta: 'entidad.telefono', tipo: 'texto', tamano: 'condensada' } },
    formatos: { NCF: { alineacion: 'derecha', negrita: true } },
  },
} as any;

const salidaFPVFormatos = formatTicketPOS(datosEjemploPOS, companyEjemplo, configFormatosFPV);
const salidaFRIFormatos = formatTicketReciboIngreso(datosEjemploRecibo, companyEjemplo, configFormatosFRI);

/* Config de secciones + tabular: encabezado compania doble, titulo personalizado,
   detalle articulo derecha, totales total condensada, cobros izquierda, tabular 12. */
const configSeccionesFPV = {
  encabezado: { formato: { compania: { tamano: 'doble' } } },
  titulo: { texto: 'FACTURA DE PRUEBA', formato: { alineacion: 'derecha', negrita: true } },
  detalle: { formato: { articulo: { alineacion: 'derecha' } } },
  totales: { formato: { total: { tamano: 'condensada' } } },
  cobros: { formato: { alineacion: 'izquierda' } },
  campos: { tabular: { ancho: 12 } },
} as any;
const configSeccionesFRI = {
  encabezado: { formato: { compania: { tamano: 'doble' } } },
  titulo: { texto: 'RECIBO DE PRUEBA', formato: { alineacion: 'derecha', negrita: true } },
  detalle: { formato: { articulo: { alineacion: 'derecha' } } },
  totales: { formato: { total: { tamano: 'condensada' } } },
  cobros: { formato: { alineacion: 'izquierda' } },
  campos: { tabular: { ancho: 12 } },
} as any;

const salidaFPVSecciones = formatTicketPOS(datosEjemploPOS, companyEjemplo, configSeccionesFPV);
const salidaFRISecciones = formatTicketReciboIngreso(datosEjemploRecibo, companyEjemplo, configSeccionesFRI);

const dir = __dirname;
writeFileSync(join(dir, 'fpv_sin_config.raw.txt'), salidaFPV, 'latin1');
writeFileSync(join(dir, 'fri_sin_config.raw.txt'), salidaFRI, 'latin1');
writeFileSync(join(dir, 'fpv_sin_config.leido.txt'), legible(salidaFPV), 'utf8');
writeFileSync(join(dir, 'fri_sin_config.leido.txt'), legible(salidaFRI), 'utf8');
writeFileSync(join(dir, 'fpv_con_items.leido.txt'), legible(salidaFPVItems), 'utf8');
writeFileSync(join(dir, 'fri_con_items.leido.txt'), legible(salidaFRIItems), 'utf8');
writeFileSync(join(dir, 'fpv_con_formatos.leido.txt'), legible(salidaFPVFormatos), 'utf8');
writeFileSync(join(dir, 'fri_con_formatos.leido.txt'), legible(salidaFRIFormatos), 'utf8');
writeFileSync(join(dir, 'fpv_con_formatos.html'), escposToHtml(salidaFPVFormatos), 'utf8');

const bytes = (s: string) => new TextEncoder().encode(s).length;
const sha = (s: string) => createHash('sha256').update(s, 'latin1').digest('hex').toUpperCase();

console.log('=== REGRESION CERO (sin config) ===');
console.log('FPV:', salidaFPV.length, 'chars |', bytes(salidaFPV), 'bytes | SHA256:', sha(salidaFPV));
console.log('FRI:', salidaFRI.length, 'chars |', bytes(salidaFRI), 'bytes | SHA256:', sha(salidaFRI));
console.log('(baseline previo FPV: 18303BB3BACC6AAF1D61AF4C41E0F034CDF54385368B4CE3645293D3EC4412C8)');
console.log('(baseline previo FRI: E2D7CFB5740E270788675B1A5242C826DB46E9C9617C37320E49F9481227B02C)');

console.log('\n=== FPV con formatos (seccion inicial) ===');
console.log(legible(salidaFPVFormatos).slice(0, 1200));

console.log('\n=== FRI con formatos (seccion inicial) ===');
console.log(legible(salidaFRIFormatos).slice(0, 900));

console.log('\n=== FPV con formatos -> HTML (condensada/doble en el preview) ===');
const html = escposToHtml(salidaFPVFormatos);
const countOf = (needle: string) => html.split(needle).length - 1;
console.log('ocurrencias font-size:11px (condensada):', countOf('font-size:11px'));
console.log('ocurrencias font-size:28px (doble):', countOf('font-size:28px'));
console.log('ocurrencias text-align:center:', countOf('text-align:center'));
console.log('ocurrencias text-align:right:', countOf('text-align:right'));

console.log('\n=== FPV con formatos -> HTML: divs condensados (fragmentos) ===');
const reCond = /<div style="[^"]*font-size:11px[^"]*">[^<]*/g;
const frags = html.match(reCond) || [];
frags.slice(0, 6).forEach((f) => console.log('  ', f.slice(0, 110)));

console.log('\n=== FPV secciones + tabular (fragmentos) ===');
console.log(legible(salidaFPVSecciones).slice(0, 1400));
console.log('\n=== FRI secciones + tabular (fragmentos) ===');
console.log(legible(salidaFRISecciones).slice(0, 1100));

console.log('\nArchivos escritos en', dir);
