import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync } from 'node:fs';

const formatterPath = new URL('../src/utils/escpos-formatter.ts', import.meta.url).href;
const mod = await import(formatterPath);
const { formatTicketPOS, formatTicketReciboIngreso } = mod;

const company = {
  nombre: 'SU EMPRESA DEMO',
  direccion: 'AV. DEMO 123, SANTO DOMINGO',
  telefono: '809-000-0000',
  rnc: '1-01-00000-1',
};

const posData = {
  ncf: 'B0100000001',
  transaccionNCF: { nombreTipoComprobante: 'CREDITO FISCAL' },
  cajero: 'JUAN PEREZ', caja: 'CAJA 01', turno: 'TURNO A',
  fechaDocumento: '2026-08-02T15:30:00', noDocumento: '0001',
  ncfModificado: 'B0100000002', referencia: 'REF-0001', nota: 'Nota de ejemplo',
  tasa: 1, diasCredito: 30, retenciones: 0, estado: 1,
  cliente: { nombre: 'CONSUMIDOR FINAL', identificacion: '402-1234567-8', telefono: '809-111-2222', direccion: 'AV. CLIENTE 45' },
  secuenciaNCF: { nombre: 'CREDITO FISCAL', tipoComprobante: '30' },
  concepto: { nombre: 'VENTA AL CONTADO' },
  almacen: { nombre: 'ALMACEN PRINCIPAL' },
  moneda: { nombre: 'PESO DOMINICANO' },
  sucursal: { nombre: 'SUCURSAL CENTRAL', telefono: '809-333-4444', direccion: 'AV. SUCURSAL 10' },
  subTotal: 100, impuestos: 18, descuento: 0, total: 118,
  detalles: [
    { articulo: 'ACEITE VEGETAL 1L', codigo: '000123', cantidad: 2, precio: 50, impuestos: 9, total: 100 },
    { articulo: 'ARROZ SELECTO 5LB', codigo: '000456', cantidad: 1, precio: 18, impuestos: 3.24, total: 18 },
  ],
  cobros: [{ efectivo: 200, cheque: 0, tarjetaCredito: 0, tarjetaDebito: 0, transferencia: 0, bono: 0, tarjetaRegalo: 0, notaCredito: 0 }],
};

const riData = {
  ncf: 'B0100000002', fechaDocumento: '2026-08-02T15:30:00', noDocumento: '0002',
  tipo: { codigo: 'RI', nombre: 'Recibo de Ingreso' },
  concepto: { nombre: 'COBRO A CUENTA' },
  entidad: { nombre: 'CLIENTE DEMO', identificacion: '402-1234567-8', telefono: '809-555-6666', direccion: 'AV. ENTIDAD 20' },
  moneda: { nombre: 'PESO DOMINICANO' },
  sucursal: { nombre: 'SUCURSAL CENTRAL' },
  nota: 'Pago parcial', referencia: 'REF-RI-0001',
  tasa: 1, subTotal: 500, descuento: 0, impuestos: 0, retenciones: 0, estado: 1, periodo: 202608, diasCredito: 0, total: 500,
  transaccionesAsociadas: [
    { documento: 'FACT-0001', montoOriginal: 500, pagado: 300, monto: 300 },
    { documento: 'FACT-0002', montoOriginal: 300, pagado: 200, monto: 200 },
  ],
  cobros: [{ medioCobro: 'Efectivo', monto: 500 }],
};

const configConItemsFPV = {
  campos: {
    orden: ['SEPARADOR', 'ESPACIO', 'LIBRE:promo', 'DTO:tel', 'NCF', 'TIPO_COMP', 'RNC_CLIENTE'],
    labels: { NCF: 'COMPROBANTE' },
    textosLibres: { promo: 'OFERTA 2X1\nSOLO HOY' },
    camposDTO: { tel: { label: 'TEL', ruta: 'cliente.telefono', tipo: 'texto' } },
  },
};
const configConItemsFRI = {
  campos: {
    orden: ['SEPARADOR', 'ESPACIO', 'LIBRE:promo', 'DTO:tel', 'NCF', 'FECHA', 'ENTIDAD'],
    labels: { NCF: 'COMPROBANTE' },
    textosLibres: { promo: 'OFERTA 2X1\nSOLO HOY' },
    camposDTO: { tel: { label: 'TEL', ruta: 'entidad.telefono', tipo: 'texto' } },
  },
};

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
    formatos: { NCF: { alineacion: 'derecha', negrita: true }, CLIENTE: { alineacion: 'centro' } },
  },
};
const configFormatosFRI = {
  campos: {
    orden: ['SEPARADOR', 'LIBRE:promoDer', 'DTO:telCond', 'NCF', 'FECHA', 'ENTIDAD'],
    textosLibres: { promoDer: { texto: 'RI DERECHA', alineacion: 'derecha', negrita: true } },
    camposDTO: { telCond: { label: 'TEL COND', ruta: 'entidad.telefono', tipo: 'texto', tamano: 'condensada' } },
    formatos: { NCF: { alineacion: 'derecha', negrita: true } },
  },
};

const configSeccionesFPV = {
  encabezado: { formato: { compania: { tamano: 'doble' } } },
  titulo: { texto: 'FACTURA DE PRUEBA', formato: { alineacion: 'derecha', negrita: true } },
  detalle: { formato: { articulo: { alineacion: 'derecha' } } },
  totales: { formato: { total: { tamano: 'condensada' } } },
  cobros: { formato: { alineacion: 'izquierda' } },
  campos: { tabular: { ancho: 12 } },
};
const configSeccionesFRI = {
  encabezado: { formato: { compania: { tamano: 'doble' } } },
  titulo: { texto: 'RECIBO DE PRUEBA', formato: { alineacion: 'derecha', negrita: true } },
  detalle: { formato: { articulo: { alineacion: 'derecha' } } },
  totales: { formato: { total: { tamano: 'condensada' } } },
  cobros: { formato: { alineacion: 'izquierda' } },
  campos: { tabular: { ancho: 12 } },
};

const sha = (s) => createHash('sha256').update(s, 'latin1').digest('hex').toUpperCase();

const casos = [
  { nombre: 'fpv_sin_config', salida: formatTicketPOS(posData, company, undefined) },
  { nombre: 'fri_sin_config', salida: formatTicketReciboIngreso(riData, company, undefined) },
  { nombre: 'fpv_con_items', salida: formatTicketPOS(posData, company, configConItemsFPV) },
  { nombre: 'fri_con_items', salida: formatTicketReciboIngreso(riData, company, configConItemsFRI) },
  { nombre: 'fpv_con_formatos', salida: formatTicketPOS(posData, company, configFormatosFPV) },
  { nombre: 'fri_con_formatos', salida: formatTicketReciboIngreso(riData, company, configFormatosFRI) },
  { nombre: 'fpv_secciones', salida: formatTicketPOS(posData, company, configSeccionesFPV) },
  { nombre: 'fri_secciones', salida: formatTicketReciboIngreso(riData, company, configSeccionesFRI) },
];

console.log('=== 8 GOLDENS ===');
let allMatch = true;
for (const c of casos) {
  const hash = sha(c.salida);
  let oldHash = '?';
  try {
    const oldRaw = readFileSync(new URL(c.nombre + '.raw.txt', import.meta.url), 'latin1');
    oldHash = sha(oldRaw);
  } catch {}
  const match = hash === oldHash ? '✓ MATCH' : '✗ DIFF';
  if (hash !== oldHash) allMatch = false;
  console.log(`${c.nombre}: ${c.salida.length}c | ${hash} ${match}`);
  writeFileSync(new URL('new_' + c.nombre + '.raw.txt', import.meta.url), c.salida, 'latin1');
}
console.log(allMatch ? '\n🎉 TODOS LOS 8 GOLDENS COINCIDEN!' : '\n⚠️ Hay diferencias');
