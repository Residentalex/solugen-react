import { describe, it } from 'vitest';
import * as fs from 'fs';
import { formatTicketPOS } from './escpos-formatter';
import { normalizarConfig } from './ticketPlantillaConfig';

const companyEjemplo = {
  nombre: 'SU EMPRESA DEMO', direccion: 'AV. DEMO 123, SANTO DOMINGO', telefono: '809-000-0000',
  rnc: '1-01-00000-1', fax: '809-550-6157', slogan: 'PRECIOS BAJOS, MAYOR CALIDAD!!',
};
const datosEjemploPOS = {
  ncf: 'B0100000001',
  envioDGII: { codigoQR: 'https://ejemplo.com/qr/123456', fechaEnvio: new Date().toISOString() },
  transaccionNCF: { nombreTipoComprobante: 'CREDITO FISCAL', fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), secuencia: 'B0100000101' },
  cajero: 'JUAN PEREZ', caja: 'CAJA 01', turno: 'TURNO A',
  fechaDocumento: '2026-08-02T15:30:00', noDocumento: '0001',
  ncfModificado: 'B0100000002', referencia: 'REF-0001', nota: 'Nota de ejemplo',
  tasa: 1, diasCredito: 30, retenciones: 0, estado: 1,
  cliente: { nombre: 'CONSUMIDOR FINAL', identificacion: '402-1234567-8', telefono: '809-111-2222', direccion: 'AV. CLIENTE 45' },
  secuenciaNCF: { nombre: 'CREDITO FISCAL', tipoComprobante: '30' },
  concepto: { nombre: 'VENTA AL CONTADO' }, almacen: { nombre: 'ALMACEN PRINCIPAL' },
  moneda: { nombre: 'PESO DOMINICANO' },
  sucursal: { nombre: 'SUCURSAL CENTRAL', telefono: '809-333-4444', direccion: 'AV. SUCURSAL 10' },
  subTotal: 100, impuestos: 18, descuento: 0, total: 118,
  detalles: [
    { articulo: 'ACEITE VEGETAL 1L', codigo: '000123', cantidad: 2, precio: 50, impuestos: 9, total: 100 },
    { articulo: 'ARROZ SELECTO 5LB', codigo: '000456', cantidad: 1, precio: 18, impuestos: 3.24, total: 18 },
  ],
  cobros: [{ efectivo: 200, cheque: 0, tarjetaCredito: 0, tarjetaDebito: 0, transferencia: 0, bono: 0, tarjetaRegalo: 0, notaCredito: 0 }],
};

describe('diag preview real FPV_TICKET', () => {
  it('no lanza y muestra ancho de cabecera', () => {
    const config = JSON.parse(fs.readFileSync('C:/Users/cjimenez/AppData/Local/Temp/opencode/fpv_config.json', 'utf8'));
    let raw = '';
    try {
      raw = formatTicketPOS(datosEjemploPOS as any, companyEjemplo, normalizarConfig(config));
      console.error('[DIAG-PREVIEW-OK] longitud raw:', raw.length);
    } catch (e: any) {
      console.error('[DIAG-PREVIEW-THROW]', e?.stack || String(e));
    }
    if (raw.length) console.error('[DIAG-RAW-PREVIEW]', JSON.stringify(raw));
  });
});