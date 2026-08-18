/**
 * Verificacion de centrado por ancho (32/42/48) con config de prueba:
 * compania centrada, texto libre centrado, titulo centrado.
 * Confirmar que el padding es simetrico en cada ancho.
 */
import { formatTicketPOS } from 'D:/Developer/Genesis/solugen-react/src/utils/escpos-formatter';

const company = {
  nombre: 'SU EMPRESA DEMO',
  direccion: 'AV. DEMO 123, SANTO DOMINGO',
  telefono: '809-000-0000',
  rnc: '1-01-00000-1',
};

const data = {
  ncf: 'B0100000001',
  transaccionNCF: { nombreTipoComprobante: 'CREDITO FISCAL' },
  cajero: 'JUAN PEREZ',
  caja: 'CAJA 01',
  turno: 'TURNO A',
  fechaDocumento: '2026-08-02T15:30:00',
  noDocumento: '0001',
  cliente: { nombre: 'CONSUMIDOR FINAL', identificacion: '402-1234567-8' },
  secuenciaNCF: { nombre: 'CREDITO FISCAL' },
  concepto: { nombre: 'VENTA AL CONTADO' },
  sucursal: { nombre: 'SUCURSAL CENTRAL' },
  subTotal: 100.0,
  impuestos: 18.0,
  descuento: 0,
  total: 118.0,
  detalles: [
    { articulo: 'ACEITE VEGETAL 1L', codigo: '000123', cantidad: 2, precio: 50.0, impuestos: 9.0, total: 100.0 },
  ],
  cobros: [{ efectivo: 200, cheque: 0, tarjetaCredito: 0, tarjetaDebito: 0, transferencia: 0, bono: 0, tarjetaRegalo: 0, notaCredito: 0 }],
};

/** Quita comandos ESC/GS completos (incluyendo sus parametros) para medir el texto visible. */
function textoVisible(linea: string): string {
  let out = '';
  let i = 0;
  while (i < linea.length) {
    const c = linea.charCodeAt(i);
    if (c === 0x1b && i + 1 < linea.length) {
      const cmd = linea.charCodeAt(i + 1);
      // ESC a n (3 bytes), ESC E n (3), ESC ! n (3), GS ! n (3), GS V m (3), ESC @ (2)
      if (cmd === 0x40) { i += 2; continue; }
      if (cmd === 0x61 || cmd === 0x45 || cmd === 0x21 || cmd === 0x64) { i += 3; continue; }
      i += 2; continue;
    }
    if (c === 0x1d && i + 2 < linea.length) {
      const cmd = linea.charCodeAt(i + 1);
      if (cmd === 0x21 || cmd === 0x56) { i += 3; continue; }
      i += 3; continue;
    }
    if (c >= 0x20 && c <= 0x7e) out += linea[i];
    i++;
  }
  return out;
}

/** Extrae la linea (bruta) que contiene el texto dado, sin LF. */
function lineaCon(raw: string, texto: string): string {
  const idx = raw.indexOf(texto);
  const inicio = raw.lastIndexOf('\n', idx - 1) + 1;
  const fin = raw.indexOf('\n', idx);
  return raw.slice(inicio, fin);
}

for (const ancho of [32, 42, 48]) {
  const config = {
    opciones: { anchoLinea: ancho },
    campos: {
      orden: ['LIBRE:centro', 'NCF'],
      textosLibres: { centro: { texto: 'CENTER ME', alineacion: 'centro', negrita: true, tamano: 'normal' } },
    },
    titulo: { texto: 'TITULO CENTRO' },
  } as any;

  const raw = formatTicketPOS(data, company, config);
  console.log(`\n===== Ancho ${ancho} =====`);

  // Companía (centrada via center() en encabezado sin formato)
  const lCompania = textoVisible(lineaCon(raw, 'SU EMPRESA DEMO'));
  console.log(`compania [${lCompania}] len=${lCompania.length} izq=${lCompania.length - lCompania.trimStart().length} der=${lCompania.length - lCompania.trimEnd().length}`);

  // Texto libre centrado (via padLinea -> center)
  const lLibre = textoVisible(lineaCon(raw, 'CENTER ME'));
  console.log(`libre    [${lLibre}] len=${lLibre.length} izq=${lLibre.length - lLibre.trimStart().length} der=${lLibre.length - lLibre.trimEnd().length}`);

  // Titulo (via emitirLineaFormateada con alineacion default? titulo sin formato usa CMD_ALIGN_CENTER directo)
  const lTitulo = textoVisible(lineaCon(raw, 'TITULO CENTRO'));
  console.log(`titulo   [${lTitulo}] len=${lTitulo.length} izq=${lTitulo.length - lTitulo.trimStart().length} der=${lTitulo.length - lTitulo.trimEnd().length}`);

  const centroExacto = (s: string) => s.length === ancho || s.length === ancho - 1;
  const izq = lLibre.length - lLibre.trimStart().length;
  const der = lLibre.length - lLibre.trimEnd().length;
  const simetrico = Math.abs(izq - der) <= 1;
  console.log(`libre centrado: ocupa ${lLibre.length} (esperado ${ancho} o ${ancho - 1}) -> ${centroExacto(lLibre) ? 'OK' : 'FALLA'} | simetrico ${simetrico ? 'OK' : 'FALLA'}`);
}
