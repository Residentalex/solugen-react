/**
 * Captura TOTAL de salidas del formatter ACTUAL (estado pre-cambios) para usarlas
 * como golden de regresion byte-a-byte tras la migracion por zonas.
 * Casos: FPV/FRI x (sin_config, con_items, con_formatos, secciones).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { formatTicketPOS, formatTicketReciboIngreso } from 'D:/Developer/Genesis/solugen-react/src/utils/escpos-formatter';

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

function legible(raw: string): string {
  return raw
    .replace(/\x1B/g, '<ESC>')
    .replace(/\x1D/g, '<GS>')
    .replace(/\n/g, '<LF>\n')
    .replace(/[\x00-\x1F]/g, (c) => `[${c.charCodeAt(0).toString(16).toUpperCase()}]`);
}

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

const casos: Array<{ nombre: string; salida: string }> = [
  { nombre: 'fpv_sin_config', salida: formatTicketPOS(datosEjemploPOS, companyEjemplo, undefined) },
  { nombre: 'fri_sin_config', salida: formatTicketReciboIngreso(datosEjemploRecibo, companyEjemplo, undefined) },
  { nombre: 'fpv_con_items', salida: formatTicketPOS(datosEjemploPOS, companyEjemplo, configConItemsFPV) },
  { nombre: 'fri_con_items', salida: formatTicketReciboIngreso(datosEjemploRecibo, companyEjemplo, configConItemsFRI) },
  { nombre: 'fpv_con_formatos', salida: formatTicketPOS(datosEjemploPOS, companyEjemplo, configFormatosFPV) },
  { nombre: 'fri_con_formatos', salida: formatTicketReciboIngreso(datosEjemploRecibo, companyEjemplo, configFormatosFRI) },
  { nombre: 'fpv_secciones', salida: formatTicketPOS(datosEjemploPOS, companyEjemplo, configSeccionesFPV) },
  { nombre: 'fri_secciones', salida: formatTicketReciboIngreso(datosEjemploRecibo, companyEjemplo, configSeccionesFRI) },
];

const dir = __dirname;
const sha = (s: string) => createHash('sha256').update(s, 'latin1').digest('hex').toUpperCase();

for (const c of casos) {
  writeFileSync(join(dir, c.nombre + '.raw.txt'), c.salida, 'latin1');
  writeFileSync(join(dir, c.nombre + '.leido.txt'), legible(c.salida), 'utf8');
  console.log(`${c.nombre}: ${c.salida.length} chars | SHA256: ${sha(c.salida)}`);
}
console.log('GOLDEN capturado en', dir);
