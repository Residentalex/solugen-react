/**
 * Formateadores ESC/POS con comandos de formato reales (negritas, tamaño, alineación).
 * Diseñado para replicar EL CONTENIDO del reporte original de DevExpress.
 *
 * Limitaciones de ESC/POS vs DevExpress:
 * - No se puede incluir logo (solo texto)
 * - La fuente es la que tenga la impresora (Courier/mono), no Segoe UI
 * - No hay bordes visuales complejos, solo texto
 *
 * Configuración:
 * - Las funciones aceptan un tercer parámetro opcional `config` (PlantillaConfig).
 * - Sin config, la salida es IDÉNTICA al formato predeterminado (regresión cero).
 * - Con config, se respetan: ancho de línea, switches de encabezado/totales/cobros,
 *   orden y visibilidad de campos del documento, columnas del detalle y pie.
 */
import type {
  PlantillaConfig,
  PlantillaCamposDTOConfig,
  TipoCampoDTO,
  FormatoItemTicket,
  AlineacionTicket,
  TextoLibreConfig,
  FirmaConfig,
  ZonaTicketConfig,
  LineaZonaConfig,
  TamanoLetraTicket,
  TipoCalculoCampo,
  CalculoCampo,
} from '../types/reportesConfig';
import {
  normalizarConfig,
  normalizarConfigRI,
  normalizarConfigVSNT,
  CAMPOS_DETALLE_LABELS,
  CAMPOS_DETALLE_RI_LABELS,
  CAMPOS_TICKET_LABELS_VSNT,
  calcularAnchosLinea,
} from './ticketPlantillaConfig';
import { evaluarObjeto, evaluarExpresion } from './expresiones';
import type { ContextoDatos } from './expresiones';
import type { FacturaPOSDTO } from '../types/facturaPOS';
import type { ReciboIngresoFullDTO } from '../types/reciboIngreso';
import type { VisanetVoucherInputDTO } from '../types/visanet';
import type { NotaCreditoFullDTO } from '../types/notaCredito';
import type { TurnoDTO, CobroDTO } from '../types/turno';

// ===== Constantes ESC/POS =====
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\n';

const CMD_INIT = ESC + '@';

/**
 * Normalizacion post-init para impresoras termicas de 80mm. Algunos firmwares
 * (clones POS80) arrancan con espaciado de caracter y margenes de fabrica mas
 * anchos, lo que hace que una linea de 48 columnas no quepa y se parta en dos.
 * - ESC SP 0: espaciado derecho de caracter en 0.
 * - GS L 0:   margen izquierdo en 0.
 * - GS W 576: area imprimible completa (576 dots ~ 72mm a 203dpi).
 * - GS ! 0:   tamano de caracter normal 1x1.
 * Debe re-aplicarse despues de cada CMD_INIT porque ESC @ restaura los
 * valores de fabrica de la impresora.
 */
const CMD_NORMALIZAR =
    '\x1B\x20\x00' +     // ESC SP 0
    '\x1D\x4C\x00\x00' + // GS L 0
    '\x1D\x57\x40\x02' + // GS W 576
    '\x1D\x21\x00';      // GS ! 0
const CMD_ALIGN_LEFT = ESC + 'a' + '\x00';
const CMD_ALIGN_CENTER = ESC + 'a' + '\x01';
const CMD_ALIGN_RIGHT = ESC + 'a' + '\x02';
const CMD_BOLD_ON = ESC + 'E' + '\x01';
const CMD_BOLD_OFF = ESC + 'E' + '\x00';
const CMD_CONDENSED = ESC + '!' + '\x01'; // Fuente condensada (más pequeña)
const CMD_CONDENSED_OFF = ESC + '!' + '\x00'; // Restaura fuente condensada
const CMD_FONT_A = ESC + 'M' + '\x00'; // Fuente A (estándar)
const CMD_FONT_B = ESC + 'M' + '\x01'; // Fuente B (más compacta que A)
const CMD_SIZE_DOUBLE = GS + '!' + '\x11';        // 2x alto, 2x ancho
const CMD_SIZE_DOUBLE_ALTURA = GS + '!' + '\x01'; // 1x ancho, 2x alto
const CMD_SIZE_DOUBLE_ANCHO = GS + '!' + '\x10';  // 2x ancho, 1x alto
const CMD_SIZE_TRIPLE = GS + '!' + '\x22';         // 3x alto, 3x ancho
const CMD_SIZE_NORMAL = GS + '!' + '\x00';

export function feed(n: number): string { return ESC + 'd' + String.fromCharCode(n); }
export const CMD_CUT = GS + 'V' + '\x00';
const CMD_J = ESC + 'J'; // Avance de papel de n/216 pulgadas (one-time)
const CMD_UNDERLINE_ON = ESC + '-' + '\x01'; // Subrayado 1-dot
const CMD_UNDERLINE_OFF = ESC + '-' + '\x00';

// ===== Helpers de texto =====
const LINE_LENGTH = 48;

/**
 * Centra un texto sobre el ancho con padding SIMETRICO.
 * - Con `ESC a 1` (centro) el comando centra el bloque completo; al medir el
 *   bloque exactamente `width` (par) o `width - 1` (impar), el centrado del
 *   comando es neutro y es el padding simetrico el que centra el texto visible.
 * - Sin `ESC a` (impresoras basicas) el padding simetrico tambien centra.
 * - ANTES habia padding solo a la izquierda, lo que desplazaba el texto a la
 *   derecha al centrar el bloque (padding + texto) sobre el ancho.
 */
function center(text: string, width: number = LINE_LENGTH, tamano?: TamanoLetraTicket): string {
  const w = (tamano && tamano !== 'normal') ? anchoCaracteresFuente(width, tamano) : width;
  if (text.length >= w) return text.slice(0, w);
  const padding = Math.floor((w - text.length) / 2);
  return ' '.repeat(padding) + text + ' '.repeat(padding);
}

function right(text: string, width: number = LINE_LENGTH, tamano?: TamanoLetraTicket): string {
  // Truncar conservando los ÚLTIMOS caracteres para mantener alineación derecha
  const w = (tamano && tamano !== 'normal') ? anchoCaracteresFuente(width, tamano) : width;
  if (text.length > w) return text.slice(text.length - w);
  return ' '.repeat(w - text.length) + text;
}

function left(text: string, width: number = LINE_LENGTH, tamano?: TamanoLetraTicket): string {
  const w = (tamano && tamano !== 'normal') ? anchoCaracteresFuente(width, tamano) : width;
  if (text.length >= w) return text.slice(0, w);
  return text + ' '.repeat(w - text.length);
}

function leftVisible(text: string, width: number = LINE_LENGTH, tamano?: TamanoLetraTicket): string {
  const visible = largoVisible(text);
  const w = (tamano && tamano !== 'normal') ? anchoCaracteresFuente(width, tamano) : width;
  // C2: Truncar si el texto visible excede el ancho
  if (visible > w) return text.slice(0, w);
  return text + ' '.repeat(w - visible);
}

function lineSep(char: string = '-', width: number = LINE_LENGTH, tamano?: TamanoLetraTicket): string {
  return char.repeat(Math.max(1, anchoCaracteresFuente(width, tamano) - 2));
}

/** Geometría de fuente según tamaño ESC/POS (puntos por carácter y escala). */
function geometriaFuente(tamano?: TamanoLetraTicket): { fuenteB: boolean; escala: number; paso: number } {
  const fuenteB = tamano === 'condensada' || tamano === 'doble_b';
  const escala = tamano === 'triple' ? 3 : ['doble', 'doble_b', 'doble_ancho'].includes(tamano ?? '') ? 2 : 1;
  const paso = (fuenteB ? 9 : 12) * escala;
  return { fuenteB, escala, paso };
}
function pasoFuente(tamano?: TamanoLetraTicket): number {
  return geometriaFuente(tamano).paso;
}
function anchoCaracteresFuente(width: number, tamano?: TamanoLetraTicket): number {
  const paso = pasoFuente(tamano);
  return Math.max(1, Math.floor(width * 12 / paso));
}

function formatMoney(val: number | string | undefined | null): string {
  const num = Number(val) || 0;
  // Usar formato simple: punto decimal fijo, sin separador de miles
  return num.toFixed(2);
}

function formatDate(val: string | undefined | null): string {
  if (!val) return '--';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString('es-DO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return val;
  }
}

/**
 * Fecha corta dd/MM/yy (año de 2 digitos). Mismo patron de fallback que
 * `formatDate`: '--' si no hay valor, valor original si la fecha es invalida.
 * NO modifica `formatDate` (usado por FPV/FRI con 4 digitos de anio).
 */
export function formatFechaCorta(val: string | undefined | null): string {
  if (!val) return '--';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString('es-DO', {
      day: '2-digit', month: '2-digit', year: '2-digit',
    });
  } catch {
    return val;
  }
}

/**
 * Fecha+hora corta dd/MM/yy HH:mm (año de 2 dígitos, hora 24h sin segundos).
 * Combina `formatFechaCorta` + `formatTime` en un solo campo.
 */
export function formatFechaHoraCorta(val: string | undefined | null): string {
  if (!val) return '--';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const fecha = d.toLocaleDateString('es-DO', {
      day: '2-digit', month: '2-digit', year: '2-digit',
    });
    const hora = d.toLocaleTimeString('es-DO', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    return fecha + ' ' + hora;
  } catch {
    return val;
  }
}

function formatTime(val: string | undefined | null): string {
  if (!val) return '--';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleTimeString('es-DO', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch {
    return val;
  }
}

// ===== Resolucion de labels editables y campos DTO =====

/**
 * Devuelve el label a imprimir para un campo estandar.
 * Si `labels[clave]` fue editado (existe, no vacio y distinto del default),
 * usa el editado; si no, el label original (regresion cero).
 */
function etiquetaCampo(
  labels: Record<string, string> | undefined,
  defaultLabels: Record<string, string>,
  clave: string,
): string {
  const lbl = labels?.[clave];
  if (lbl !== undefined && lbl !== '' && lbl !== defaultLabels[clave]) return lbl;
  return defaultLabels[clave] || clave;
}

/** Devuelve el label editado (o undefined si no fue editado). */
function labelEditado(
  labels: Record<string, string> | undefined,
  defaultLabels: Record<string, string>,
  clave: string,
): string | undefined {
  const lbl = labels?.[clave];
  if (lbl !== undefined && lbl !== '' && lbl !== defaultLabels[clave]) return lbl;
  return undefined;
}

/** Resuelve una ruta con puntos sobre un objeto (ej. 'cliente.nombre').
 *  Si un segmento intermedio resuelve a un array y quedan más segmentos,
 *  aplana: 'acquirers.data' devuelve el concat del data de cada acquirer. */
export function resolverRuta(obj: any, ruta: string): any {
  const partes = ruta.split('.');
  let cur: any = obj;
  for (let i = 0; i < partes.length; i++) {
    if (cur == null) return undefined;
    const p = partes[i];
    if (Array.isArray(cur)) {
      // Índice numérico sobre array: acceso directo (comportamiento original)
      if (/^\d+$/.test(p)) { cur = cur[parseInt(p, 10)]; continue; }
      // Array intermedio o final: resolver el resto de la ruta sobre cada
      // elemento y aplanar (ej: 'acquirers.data' → concat del data de cada acquirer)
      const resto = partes.slice(i).join('.');
      const valores = cur
        .map((item: any) => resolverRuta(item, resto))
        .filter((v: any) => v !== undefined && v !== null);
      return valores.length > 0 ? valores.flat() : undefined;
    }
    cur = cur[p];
  }
  return cur;
}

/** Verbos en español para el label por defecto de un campo calculado. */
const VERBOS_CALCULO: Record<TipoCalculoCampo, string> = {
  SUM: 'Suma de',
  AVG: 'Promedio de',
  COUNT: 'Cantidad de',
  MIN: 'Mínimo de',
  MAX: 'Máximo de',
};

/**
 * Agrega un array (o valor escalar) del esquema según el tipo de cálculo.
 * - COUNT cuenta los elementos del array (siempre entero).
 * - SUM/AVG/MIN/MAX operan sobre los valores numéricos de cada elemento;
 *   los elementos objeto se leen por su propiedad `value`.
 * - Array vacío o sin valores numéricos = 0 (consistente con el agente C#).
 */
function agregarArray(tipo: TipoCalculoCampo, objetivo: unknown): number {
  const arr = Array.isArray(objetivo) ? objetivo : objetivo === undefined || objetivo === null ? [] : [objetivo];
  if (tipo === 'COUNT') return arr.length;
  if (arr.length === 0) return 0;

  const numeros: number[] = [];
  for (const x of arr) {
    let n: number | undefined;
    if (typeof x === 'number') n = x;
    else if (typeof x === 'string' && x.trim() !== '') n = Number(x.trim().replace(',', '.'));
    else if (x && typeof x === 'object') {
      const v = (x as { value?: unknown }).value;
      if (typeof v === 'number') n = v;
      else if (typeof v === 'string' && v.trim() !== '') n = Number(v.trim().replace(',', '.'));
    }
    if (n !== undefined && !isNaN(n)) numeros.push(n);
  }
  if (numeros.length === 0) return 0;

  switch (tipo) {
    case 'SUM': return numeros.reduce((a, b) => a + b, 0);
    case 'AVG': return numeros.reduce((a, b) => a + b, 0) / numeros.length;
    case 'MIN': return Math.min(...numeros);
    case 'MAX': return Math.max(...numeros);
    default: return 0;
  }
}

/**
 * Genera datos de ejemplo para un arrayOrigen cuando el dato real no está disponible.
 * Extrae las claves de las líneas DETALLE:* de la zona y crea items sintéticos
 * con valores placeholder para que el preview muestre algo representativo.
 */
function limpiarRutaArray(ruta?: string, predeterminada = ''): string {
  return (ruta || predeterminada)
    .replace(/^ESQUEMA:/, '')
    .replace(/\[\]$/, '')
    .replace(/\.$/, '');
}

function obtenerClaveDetalle(ref: string, origen: string): string | undefined {
  if (ref.startsWith('DETALLE:')) return ref.slice(8);
  if (!ref.startsWith('ESQUEMA:')) return undefined;

  const ruta = ref.slice(8);
  if (origen && ruta.startsWith(`${origen}.`)) {
    return ruta.slice(origen.length + 1);
  }

  const ultimoSegmento = origen.split('.').filter(Boolean).pop();
  if (ultimoSegmento && ruta.startsWith(`${ultimoSegmento}.`)) {
    return ruta.slice(ultimoSegmento.length + 1);
  }

  return undefined;
}

function normalizarZonasDetalle(
  zonas: ZonaTicketConfig[],
  origenPredeterminado: string,
): ZonaTicketConfig[] {
  return zonas.map((zona) => {
    if (zona.tipo !== 'detalle' && zona.tipo !== 'cabecera_grupo_detalle') {
      return zona;
    }

    const origen = limpiarRutaArray(zona.arrayOrigen, origenPredeterminado);
    return {
      ...zona,
      arrayOrigen: zona.arrayOrigen
        ? limpiarRutaArray(zona.arrayOrigen)
        : zona.arrayOrigen,
      lineas: zona.lineas.map((linea) => {
        const clave = obtenerClaveDetalle(linea.ref, origen);
        return clave && !linea.ref.startsWith('DETALLE:')
          ? { ...linea, ref: `DETALLE:${clave}` }
          : linea;
      }),
    };
  });
}

function generarDatosEjemploArray(zona: ZonaTicketConfig, numItems = 2): any[] {
  const clavesDetalle = zona.lineas
    .filter(l => l.ref.startsWith('DETALLE:'))
    .map(l => l.ref.slice(8));
  if (clavesDetalle.length === 0) return [];

  return Array.from({ length: numItems }, (_, i) => {
    const item: Record<string, any> = {};
    for (const clave of clavesDetalle) {
      const partes = clave.split('.');
      // Construir objeto anidado con valores placeholder
      let cur = item;
      for (let p = 0; p < partes.length - 1; p++) {
        if (!cur[partes[p]]) cur[partes[p]] = {};
        cur = cur[partes[p]];
      }
      const hoja = partes[partes.length - 1];
      // Valor placeholder: numérico si la clave sugiere monto/cantidad, texto si no
      if (/^(monto|precio|cantidad|total|subtotal|impuesto|descuento|porcentaje)/i.test(hoja)) {
        cur[hoja] = Number((10 + i * 5.5).toFixed(2));
      } else {
        cur[hoja] = `${hoja} ${i + 1}`;
      }
    }
    return item;
  });
}

/** Formatea el valor de un campo DTO segun su tipo. */
function formatearValorDTO(valor: any, tipo: TipoCampoDTO): string {
  if (valor === undefined || valor === null || valor === '') return '--';
  switch (tipo) {
    case 'fecha': return formatDate(String(valor));
    case 'hora': return formatTime(String(valor));
    case 'dinero': return formatMoney(valor);
    case 'dias_restantes': return (valor !== undefined && valor !== null && valor !== '') ? Math.max(0, Number(valor) || 0).toFixed(0) : '--';
    default: return String(valor);
  }
}

// ===== Formato configurable de items (alineacion / negrita / tamano) =====

/**
 * Largo de una linea contando solo caracteres imprimibles (ignora bytes de
 * control como los comandos ESC/POS embebidos para la negrita del label).
 */
function largoVisible(texto: string): number {
  let n = 0;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    if (c >= 0x20 && c <= 0x7e) n++;
  }
  return n;
}

/**
 * Centra un texto que puede contener comandos ESC/POS embebidos, con padding
 * SIMETRICO (mismo criterio que `center`: evita el desplazamiento a la derecha
 * que producia el padding solo-izquierda al centrar el bloque completo).
 */
function centerVisible(texto: string, width: number = LINE_LENGTH, tamano?: TamanoLetraTicket): string {
  const w = (tamano && tamano !== 'normal') ? anchoCaracteresFuente(width, tamano) : width;
  const n = largoVisible(texto);
  // C2: Truncar si el texto visible excede el ancho
  if (n > w) return texto.slice(0, w);
  const padding = Math.floor((w - n) / 2);
  return ' '.repeat(padding) + texto + ' '.repeat(padding);
}

/** Alinea a la derecha un texto que puede contener comandos ESC/POS embebidos. */
function rightVisible(texto: string, width: number = LINE_LENGTH, tamano?: TamanoLetraTicket): string {
  const w = (tamano && tamano !== 'normal') ? anchoCaracteresFuente(width, tamano) : width;
  const n = largoVisible(texto);
  // C2: Truncar conservando los ÚLTIMOS caracteres para mantener alineación derecha
  if (n > w) return texto.slice(n - w);
  return ' '.repeat(w - n) + texto;
}

/**
 * Quita espacios (0x20) de los extremos de un texto que puede contener
 * comandos ESC/POS embebidos (se respetan los bytes de control).
 */
function trimVisible(texto: string): string {
  let inicio = 0;
  let fin = texto.length;
  while (inicio < fin && texto.charCodeAt(inicio) === 0x20) inicio++;
  while (fin > inicio && texto.charCodeAt(fin - 1) === 0x20) fin--;
  return texto.substring(inicio, fin);
}

/**
 * Calcula el ancho disponible para un campo con mismaLinea.
 * Si el campo tiene anchoCampo, usa ese valor recortado al espacio restante.
 * Si no, usa el espacio restante del ticket.
 * Si el restante es 0, retorna 0 (el campo no se muestra).
 */
function calcularAnchoCampo(linea: LineaZonaConfig, anchoAcumulado: number, width: number): number {
  const restante = Math.max(0, width - anchoAcumulado);
  if (linea.anchoCampo && linea.anchoCampo > 0) {
    // Si el ancho declarado excede el espacio restante, se RECORTE al restante
    // (no se elimina el campo). Ej: pagina 42, acumulado 40, ancho 10 → usa 2.
    return Math.min(linea.anchoCampo, restante);
  }
  // Sin ancho fijo: usar todo el espacio restante
  return restante;
}

/**
 * Rellena el texto al ancho del campo respetando la alineación configurada
 * en modo mismaLinea (formatoValor tiene prioridad sobre formato). Default: izquierda.
 */
function padSegunAlineacion(texto: string, ancho: number, linea: LineaZonaConfig): string {
  const formato = linea.formatoValor ?? linea.formato;
  const tamano = formato?.tamano;
  let fuenteB = tamano === 'condensada' || tamano === 'doble_b';
  let escala = tamano === 'triple' ? 3 : ['doble', 'doble_b', 'doble_ancho'].includes(tamano ?? '') ? 2 : 1;
  const presupuesto = Math.max(0, Math.floor(ancho * 12));
  let usados = 0;
  let contenido = '';
  // Los comandos no consumen ancho. Fuente B se aplica una sola vez (9 puntos frente a 12).
  for (let i = 0; i < texto.length;) {
    const codigo = texto.charCodeAt(i);
    if (codigo === 27 || codigo === 29) {
      const comando = texto[i + 1];
      const longitud = codigo === 27 && (comando === '$' || comando === '\\') ? 4 : 3;
      const secuencia = texto.slice(i, i + longitud);
      const valor = texto.charCodeAt(i + 2);
      if (codigo === 27 && comando === '!') { fuenteB = (valor & 1) !== 0; escala = (valor & 32) !== 0 ? 2 : 1; }
      if (codigo === 27 && comando === 'M') fuenteB = valor === 1 || valor === 49;
      if (codigo === 29 && comando === '!') escala = ((valor >> 4) & 7) + 1;
      // La alineación se resuelve dentro de la columna.
      if (!(codigo === 27 && comando === 'a')) contenido += secuencia;
      i += longitud;
      continue;
    }
    const paso = (fuenteB ? 9 : 12) * escala;
    if (codigo >= 32 && usados + paso <= presupuesto) { contenido += texto[i]; usados += paso; }
    i += 1;
  }
  const al = formato?.alineacion;
  const libre = presupuesto - usados;
  const izquierda = al === 'derecha' ? libre : al === 'centro' ? Math.floor(libre / 2) : 0;
  const mover = (puntos: number) => puntos > 0 ? ESC + '\\' + String.fromCharCode(puntos & 255, (puntos >> 8) & 255) : '';
  return mover(izquierda) + contenido + mover(libre - izquierda);
}
function calcularAnchosGrupo(lineas: LineaZonaConfig[], _largos: number[], width: number): number[] {
  const normalizadas = lineas.map(linea => ({ ...linea, lineaNum: 0,
    anchoTipo: linea.anchoTipo ?? ((linea.anchoCampo ?? linea.tabular?.ancho ?? 0) > 0 ? 'fijo' as const : undefined),
    anchoValor: linea.anchoTipo ? linea.anchoValor : linea.anchoCampo ?? linea.tabular?.ancho,
  }));
  const anchos = calcularAnchosLinea(normalizadas, 0, width);
  return lineas.map((_, i) => anchos.get(i) ?? 0);
}

function renderLineasAgrupadas(
  lineas: LineaZonaConfig[],
  widthLocal: number,
  ctxP: string[],
  emitirLinea: (ln: LineaZonaConfig, enGrupo?: boolean) => void,
) {
  const buffer: string[] = [];
  const flush = () => { if (buffer.length > 0) { ctxP.push(...buffer, LF); buffer.length = 0; } };
  const renderTexto = (ln: LineaZonaConfig): string => {
    const prevLen = ctxP.length;
    emitirLinea(ln, true);
    return ctxP.splice(prevLen).join('').replace(/\x1Ba[\x00-\x02]/g, '').replace(/\n/g, ' ');
  };
  const esLineaEstructural = (linea: LineaZonaConfig) =>
    linea.ref === 'ESPACIO' || linea.ref === 'SEPARADOR';

  let indice = 0;
  while (indice < lineas.length) {
    const ln = lineas[indice];
    if (ln.lineaNum === undefined || esLineaEstructural(ln)) {
      flush();
      emitirLinea(ln);
      indice += 1;
      continue;
    }

    const inicioGrupo = indice;
    const grupo: Array<{ l: LineaZonaConfig; i: number }> = [];
    while (indice < lineas.length) {
      const candidata = lineas[indice];
      if (candidata.lineaNum !== ln.lineaNum || esLineaEstructural(candidata)) {
        break;
      }
      grupo.push({ l: candidata, i: indice });
      indice += 1;
    }

    const anchos = calcularAnchosLinea(lineas, ln.lineaNum, widthLocal, inicioGrupo);
    const piezas: string[] = [];
    grupo.forEach(({ l, i }) => {
      const anchoCampo = anchos.get(i) ?? 0;
      if (anchoCampo === 0) return;
      const texto = trimVisible(renderTexto(l));
      piezas.push(padSegunAlineacion(texto, anchoCampo, l));
    });
    if (piezas.length > 0) { buffer.push(piezas.join('')); flush(); }
  }
  flush();
}

/**
 * Divide el texto multilinea en segmentos de a lo sumo `maxLen` caracteres
 * visibles (wrap por palabra: corta en el ultimo espacio antes del corte; si
 * una palabra supera el limite, se corta por caracter). Conserva los saltos de
 * linea originales. Usa `largoVisible` para no contar caracteres de control.
 */
function wrapTexto(texto: string, maxLen: number, tamano?: TamanoLetraTicket): string[] {
  const maxChars = (tamano && tamano !== 'normal') ? anchoCaracteresFuente(maxLen, tamano) : maxLen;
  const segmentos: string[] = [];
  for (const linea of texto.split('\n')) {
    if (largoVisible(linea) <= maxChars) {
      segmentos.push(linea);
      continue;
    }
    let resto = linea;
    while (largoVisible(resto) > maxChars) {
      const slice = resto.slice(0, maxChars);
      const ultimoEspacio = slice.lastIndexOf(' ');
      const corte = ultimoEspacio > 0 ? ultimoEspacio : maxChars;
      segmentos.push(resto.slice(0, corte));
      resto = resto.slice(corte).replace(/^ /, '');
    }
    if (resto.length > 0) segmentos.push(resto);
  }
  return segmentos;
}

/**
 * Comandos a emitir ANTES y DESPUES de una linea segun su formato.
 * - Sin formato (o solo izquierda/normal/sin negrita explicita): sin comandos,
 *   el item conserva su patron natural (regresion cero).
 * - Alineacion centro/derecha: ESC a n, restaurado con ESC a izquierda.
 * - Tamaño doble/condensada: GS ! 0x30 / ESC ! 0x01, restaurado despues.
 * - Negrita true: toda la linea en negrita; false: asegura apagado.
 */
function comandosFormato(
  fmt: FormatoItemTicket | undefined,
): { antes: string[]; despues: string[] } {
  const antes: string[] = [];
  const despues: string[] = [];
  if (!fmt) return { antes, despues };

  if (fmt.alineacion === 'centro') {
    antes.push(CMD_ALIGN_CENTER);
    despues.push(CMD_ALIGN_LEFT);
  } else if (fmt.alineacion === 'derecha') {
    antes.push(CMD_ALIGN_RIGHT);
    despues.push(CMD_ALIGN_LEFT);
  }

  if (fmt.tamano === 'doble') {
    antes.push(CMD_SIZE_DOUBLE);
    despues.push(CMD_SIZE_NORMAL);
  } else if (fmt.tamano === 'doble_b') {
    // Doble compacto: Fuente B como base + 2x2. Se ve notablemente más
    // pequeño que el doble estándar (Fuente A).
    antes.push(CMD_FONT_B + CMD_SIZE_DOUBLE);
    despues.push(CMD_SIZE_NORMAL + CMD_FONT_A);
  } else if (fmt.tamano === 'doble_altura') {
    antes.push(CMD_SIZE_DOUBLE_ALTURA);
    despues.push(CMD_SIZE_NORMAL);
  } else if (fmt.tamano === 'doble_ancho') {
    antes.push(CMD_SIZE_DOUBLE_ANCHO);
    despues.push(CMD_SIZE_NORMAL);
  } else if (fmt.tamano === 'triple') {
    antes.push(CMD_SIZE_TRIPLE);
    despues.push(CMD_SIZE_NORMAL);
  } else if (fmt.tamano === 'condensada') {
    antes.push(CMD_CONDENSED);
    despues.push(CMD_CONDENSED_OFF);
  }

  if (fmt.negrita === true) {
    antes.push(CMD_BOLD_ON);
    despues.push(CMD_BOLD_OFF);
  } else if (fmt.negrita === false) {
    antes.push(CMD_BOLD_OFF);
  }

  return { antes, despues };
}

/**
 * Aplica formato a un texto base ya construido (puede traer la negrita natural
 * del label embebida). Devuelve la linea completa con LF.
 * - Sin formato: devuelve el texto tal cual (regresion cero).
 * - Con alineacion centro/derecha: agrega padding por espacios (compatible con
 *   impresoras que no soportan ESC a) ademas del comando.
 */
function aplicarFormatoTexto(
  fmt: FormatoItemTicket | undefined,
  texto: string,
  width: number = LINE_LENGTH,
): string {
  if (fmt?.alineacion === 'centro') texto = centerVisible(texto, width, fmt?.tamano);
  else if (fmt?.alineacion === 'derecha') texto = rightVisible(texto, width, fmt?.tamano);

  const { antes, despues } = comandosFormato(fmt);
  return antes.join('') + texto + LF + despues.join('');
}

/**
 * Linea `label: valor` con formato opcional.
 * Sin formato reproduce el patron natural de los campos del documento:
 * label en negrita + ": " + valor (regresion cero).
 * Con `negrita: true` toda la linea va en negrita; con `false`, sin negrita.
 */
function lineaConFormato(
  fmt: FormatoItemTicket | undefined,
  label: string,
  valor: string,
  width: number = LINE_LENGTH,
): string {
  const texto = fmt?.negrita === true
    ? CMD_BOLD_ON + label + CMD_BOLD_OFF + ': ' + valor
    : label + ': ' + valor;
  return aplicarFormatoTexto(fmt, texto, width);
}

/**
 * Version dual de lineaConFormato que permite formato independiente
 * para el label y para el valor (fmtLabel, fmtValor).
 */
function lineaConFormatoDual(
  fmt: FormatoItemTicket | undefined,
  fmtLabel: FormatoItemTicket | undefined,
  fmtValor: FormatoItemTicket | undefined,
  label: string, valor: string, width: number = LINE_LENGTH
): string {
  const w = Math.max(1, width);

  if (fmtLabel || fmtValor) {
    let lblPart = label + ': ';
    if (fmtLabel?.negrita === true) lblPart = CMD_BOLD_ON + lblPart + CMD_BOLD_OFF;
    else if (fmtLabel?.negrita === false) lblPart = CMD_BOLD_OFF + lblPart;

    let valPart = valor;
    if (fmtValor?.negrita === true) valPart = CMD_BOLD_ON + valPart + CMD_BOLD_OFF;
    else if (fmtValor?.negrita === false) valPart = CMD_BOLD_OFF + valPart;

    return aplicarFormatoTexto(fmt, lblPart + valPart, w);
  }

  return lineaConFormato(fmt, label, valor, w);
}

/**
 * Padding por espacios segun la alineacion (para textos libres, que no tienen
 * comandos embebidos). Izquierda devuelve el texto sin padding.
 */
function padLinea(texto: string, alineacion: AlineacionTicket | undefined, width: number = LINE_LENGTH, tamano?: TamanoLetraTicket): string {
  if (alineacion === 'centro') return center(texto, width, tamano);
  if (alineacion === 'derecha') return right(texto, width, tamano);
  return texto;
}

/**
 * Linea tabulada con tracking de estado ESC/POS via Ctx.
 * `label:` + padding a `ancho` + valor. Actualiza ctx para no heredar estado sucio.
 * Empuja directamente a ctx.p (void).
 */
function lineaTabular(ctx: Ctx, label: string, valor: string, ancho: number, fmtLabel?: FormatoItemTicket, fmtValor?: FormatoItemTicket): void {
  // Label format
  if (fmtLabel) {
    if (fmtLabel.negrita !== undefined) _bo(ctx, fmtLabel.negrita);
    if (fmtLabel.tamano === 'condensada') _co(ctx, true);
    else if (fmtLabel.tamano === 'doble') ctx.p.push(CMD_SIZE_DOUBLE);
    else if (fmtLabel.tamano === 'doble_b') ctx.p.push(CMD_FONT_B + CMD_SIZE_DOUBLE);
    else if (fmtLabel.tamano === 'doble_altura') ctx.p.push(CMD_SIZE_DOUBLE_ALTURA);
    else if (fmtLabel.tamano === 'doble_ancho') ctx.p.push(CMD_SIZE_DOUBLE_ANCHO);
    else if (fmtLabel.tamano === 'triple') ctx.p.push(CMD_SIZE_TRIPLE);
  }
  const anchoEtiqueta = Math.max(ancho, label.length + 2);
  ctx.p.push(right(label + ':', anchoEtiqueta));
  if (fmtLabel) {
    if (fmtLabel.tamano === 'doble' || fmtLabel.tamano === 'doble_altura' || fmtLabel.tamano === 'doble_ancho' || fmtLabel.tamano === 'triple') ctx.p.push(CMD_SIZE_NORMAL);
    else if (fmtLabel.tamano === 'doble_b') ctx.p.push(CMD_SIZE_NORMAL + CMD_FONT_A);
    if (fmtLabel.tamano === 'condensada') _co(ctx, false);
    if (fmtLabel.negrita !== undefined) _bo(ctx, false);
  }
  // Valor format
  if (fmtValor) {
    if (fmtValor.negrita !== undefined) _bo(ctx, fmtValor.negrita);
    if (fmtValor.tamano === 'condensada') _co(ctx, true);
    else if (fmtValor.tamano === 'doble') ctx.p.push(CMD_SIZE_DOUBLE);
    else if (fmtValor.tamano === 'doble_b') ctx.p.push(CMD_FONT_B + CMD_SIZE_DOUBLE);
    else if (fmtValor.tamano === 'doble_altura') ctx.p.push(CMD_SIZE_DOUBLE_ALTURA);
    else if (fmtValor.tamano === 'doble_ancho') ctx.p.push(CMD_SIZE_DOUBLE_ANCHO);
    else if (fmtValor.tamano === 'triple') ctx.p.push(CMD_SIZE_TRIPLE);
  }
  ctx.p.push(valor);
  if (fmtValor) {
    if (fmtValor.tamano === 'doble' || fmtValor.tamano === 'doble_altura' || fmtValor.tamano === 'doble_ancho' || fmtValor.tamano === 'triple') ctx.p.push(CMD_SIZE_NORMAL);
    else if (fmtValor.tamano === 'doble_b') ctx.p.push(CMD_SIZE_NORMAL + CMD_FONT_A);
    if (fmtValor.tamano === 'condensada') _co(ctx, false);
    if (fmtValor.negrita !== undefined) _bo(ctx, false);
  }
}

/**
 * Version sin Ctx para callers que no tienen contexto (ej. renderCampoFPV).
 * Solo formatea el texto sin comandos de formato embebidos.
 */
function lineaTabularStr(label: string, valor: string, ancho: number): string {
  const anchoEtiqueta = Math.max(ancho, label.length + 2); // incluye ':' y al menos un espacio antes del valor
  return right(label + ':', anchoEtiqueta) + valor;
}

/**
 * Version de lineaTabular que retorna string (sin Ctx), con soporte
 * de formato dual (fmtLabel/fmtValor) para usar desde renderCampoFPV.
 */
function lineaTabularConFormato(
  label: string, valor: string, ancho: number,
  fmtLabel?: FormatoItemTicket,
  fmtValor?: FormatoItemTicket
): string {
  let lblPart = label + ':';
  if (fmtLabel?.negrita === true) lblPart = CMD_BOLD_ON + lblPart + CMD_BOLD_OFF;
  else if (fmtLabel?.negrita === false) lblPart = CMD_BOLD_OFF + lblPart;

  let valPart = valor;
  if (fmtValor?.negrita === true) valPart = CMD_BOLD_ON + valPart + CMD_BOLD_OFF;
  else if (fmtValor?.negrita === false) valPart = CMD_BOLD_OFF + valPart;

  const anchoEtiqueta = Math.max(ancho, largoVisible(lblPart) + 1);
  return rightVisible(lblPart, anchoEtiqueta) + valPart;
}

/**
 * Emite una linea de total (label + monto) con formato. Sin formato usa el
 * patron natural (alineado a la derecha, regresion cero). Con formato respeta
 * la alineacion configurada.
 */
function emitirTotalLinea(
  parts: string[],
  fmt: FormatoItemTicket | undefined,
  label: string,
  amount: string,
  width: number,
): void {
  let texto: string;
  if (fmt?.alineacion === 'centro') texto = centerVisible(label + ' ' + amount, width, fmt?.tamano);
  else if (fmt?.alineacion === 'derecha') texto = rightVisible(label + ' ' + amount, width, fmt?.tamano);
  else if (fmt?.alineacion === 'izquierda') texto = left(label + ' ' + amount, width, fmt?.tamano);
  else texto = formatTotalLine(label, amount, width, fmt?.tamano);
  if (!fmt) {
    parts.push(texto + LF);
    return;
  }
  const { antes, despues } = comandosFormato(fmt);
  parts.push(...antes);
  parts.push(texto + LF);
  parts.push(...despues);
}

/** Emite los marcadores especiales (ESPACIO/SEPARADOR/LIBRE/DTO/FIRMA). Devuelve true si lo proceso. */
function emitirItemEspecial(
  parts: string[],
  item: string,
  data: any,
  width: number,
  textosLibres: Record<string, string | TextoLibreConfig> | undefined,
  camposDTO: Record<string, PlantillaCamposDTOConfig> | undefined,
  tabular?: { ancho?: number },
  mismaLinea?: boolean,
  firmas?: Record<string, FirmaConfig>,
  linea?: LineaZonaConfig,
  enGrupo?: boolean,
): boolean {
  if (item === 'ESPACIO') {
    parts.push(' ' + LF);
    return true;
  }
  if (item === 'SEPARADOR') {
    parts.push(lineSep('-', width) + LF);
    return true;
  }
  if (item.startsWith('LIBRE:')) {
    const libre = textosLibres?.[item.slice('LIBRE:'.length)];
    const id = item.slice('LIBRE:'.length);
    // Value/content: prefer textosLibres entry (new-style), fallback to linea.label (legacy)
    const conf: TextoLibreConfig = libre ? (typeof libre === 'string' ? { texto: libre, alineacion: 'centro', negrita: true, tamano: 'normal' } : libre) : { texto: linea?.label || '', alineacion: 'centro', negrita: true, tamano: 'normal' };
    const valor = conf.texto || '';
    const fmt: FormatoItemTicket = {
      alineacion: conf.alineacion ?? 'centro',
      negrita: conf.negrita ?? true,
      tamano: conf.tamano ?? 'normal',
    };
    // Label: use linea.label when mostrarLabel is not false; avoid duplicating when label equals value
    const mostrarLabel = linea?.mostrarLabel !== false;
    const esLegacySinTextoLibre = !libre && !!linea?.label;
    const label = (mostrarLabel && !esLegacySinTextoLibre && linea?.label && linea?.label !== valor) ? linea?.label : undefined;
    if (valor || libre || linea?.label) {
      const textoFinal = label ? (label + ': ' + valor) : valor;
      if (enGrupo) {
        // Texto crudo: el grupo lo rellena a su columna con padSegunAlineacion.
        parts.push(textoFinal);
        return true;
      }
      if (mismaLinea) {
        // Sin padding ni comandos de formato: solo el texto crudo (con wrap)
        for (const seg of wrapTexto(textoFinal, width, fmt.tamano)) {
          parts.push(seg + LF);
        }
      } else {
        const { antes, despues } = comandosFormato(fmt);
        parts.push(...antes);
        for (const seg of wrapTexto(textoFinal, width - 2, fmt.tamano)) {
          parts.push(padLinea(seg, fmt.alineacion, width - 2, fmt.tamano) + LF);
        }
        parts.push(...despues);
      }
    }
    return true;
  }
  if (item.startsWith('DTO:')) {
    const def = camposDTO?.[item.slice('DTO:'.length)];
    if (def) {
      const valor = formatearValorDTO(resolverRuta(data, def.ruta), def.tipo);
      const label = def.label || item;
      if (enGrupo) {
        // Texto crudo (sin padding ni wrap): el grupo lo rellena por columna.
        parts.push(def.negrita === true ? CMD_BOLD_ON + label + CMD_BOLD_OFF + ': ' + valor : label + ': ' + valor);
      } else if (tabular) {
        parts.push(lineaTabularStr(label, valor, tabular.ancho ?? 12) + LF);
      } else {
        parts.push(lineaConFormato(def, label, valor, width));
      }
    }
    return true;
  }
  if (item.startsWith('FIRMA:')) {
    const firma = firmas?.[item.slice('FIRMA:'.length)];
    if (firma) {
      const texto = firma.texto || 'Firma autorizada';
      if (enGrupo) {
        // Texto crudo: el grupo lo rellena a su columna con padSegunAlineacion.
        parts.push(texto);
      } else if (firma.linea === 'arriba') {
        parts.push(lineSep('-', width) + LF);
        parts.push(padLinea(texto, 'centro', width - 2) + LF);
      } else {
        const anchoLinea = Math.max(1, width - 2 - texto.length - 1);
        parts.push(padLinea(texto + ' ' + lineSep('-', anchoLinea), 'centro', width - 2) + LF);
      }
    }
    return true;
  }
  return false;
}

function formatTotalLine(label: string, amount: string, width: number = LINE_LENGTH, tamano?: TamanoLetraTicket): string {
  return right(`${label} ${amount}`, Math.max(1, width - 2), tamano);
}

// ===== Información de compañía =====
export interface CompanyInfo {
  nombre?: string;
  direccion?: string;
  telefono?: string;
  rnc?: string;
  fax?: string;
  slogan?: string;
}

// ===== Contexto de impresion con tracking de estado ESC/POS =====

interface Ctx {
  p: string[];
  w: number;
  al: 'left' | 'center' | 'right';
  bo: boolean;
  co: boolean;
  forceAl: boolean;
}

function _al(ctx: Ctx, a: AlineacionTicket | 'left' | 'center' | 'right') {
  // Translate AlineacionTicket (Spanish) to internal English
  let al: 'left' | 'center' | 'right';
  switch (a as string) {
    case 'izquierda': al = 'left'; break;
    case 'centro': al = 'center'; break;
    case 'derecha': al = 'right'; break;
    default: al = a as 'left' | 'center' | 'right';
  }
  if (!ctx.forceAl && ctx.al === al) return;
  ctx.forceAl = false;
  ctx.al = al;
  ctx.p.push(al === 'center' ? CMD_ALIGN_CENTER : al === 'right' ? CMD_ALIGN_RIGHT : CMD_ALIGN_LEFT);
}
function _bo(ctx: Ctx, b: boolean) { if (ctx.bo !== b) { ctx.bo = b; ctx.p.push(b ? CMD_BOLD_ON : CMD_BOLD_OFF); } }
function _co(ctx: Ctx, c: boolean) { if (ctx.co !== c) { ctx.co = c; ctx.p.push(c ? CMD_CONDENSED : CMD_SIZE_NORMAL); } }

function _aplicarFmt(ctx: Ctx, fmt: FormatoItemTicket | undefined) {
  if (!fmt) return;
  if (fmt.alineacion) _al(ctx, fmt.alineacion);
  if (fmt.negrita !== undefined) _bo(ctx, fmt.negrita);
  if (fmt.tamano === 'condensada') _co(ctx, true);
  else if (fmt.tamano === 'doble') { ctx.p.push(CMD_SIZE_DOUBLE); }
  else if (fmt.tamano === 'doble_b') { ctx.p.push(CMD_FONT_B + CMD_SIZE_DOUBLE); }
  else if (fmt.tamano === 'doble_altura') { ctx.p.push(CMD_SIZE_DOUBLE_ALTURA); }
  else if (fmt.tamano === 'doble_ancho') { ctx.p.push(CMD_SIZE_DOUBLE_ANCHO); }
  else if (fmt.tamano === 'triple') { ctx.p.push(CMD_SIZE_TRIPLE); }
}

function _restaurarFmt(ctx: Ctx, fmt: FormatoItemTicket | undefined) {
  if (!fmt) return;
  if (fmt.negrita !== undefined) _bo(ctx, false);
  if (fmt.tamano === 'condensada') _co(ctx, false);
  if (fmt.tamano === 'doble' || fmt.tamano === 'doble_altura' || fmt.tamano === 'doble_ancho' || fmt.tamano === 'triple') ctx.p.push(CMD_SIZE_NORMAL);
  else if (fmt.tamano === 'doble_b') ctx.p.push(CMD_SIZE_NORMAL + CMD_FONT_A);
}

function _emitirSep(ctx: Ctx, linea: LineaZonaConfig) {
  const rawChar = (linea as any).caracter || '-';
  const margen = (linea as any).margen || 0;
  // NO convertir '-' a '_': el guion queda centrado en la celda (sin gap).
  // '_' se mantiene como opcion explicita para separador pegado abajo.
  // '─' (Unicode) se mapea a '_' para compatibilidad ASCII.
  // 'linea' / 'linea_gruesa' usan subrayado ESC- sobre espacios (linea solida).
  const char = rawChar === '─' ? '_' : rawChar === '═' ? '=' : rawChar;
  // Consumir forceAl: el codigo viejo siempre emite ALIGN_LEFT entre secciones
  if (ctx.forceAl) _al(ctx, 'left');
  _aplicarFmt(ctx, linea.formato);
  // Margen superior
  if (margen > 0) ctx.p.push(CMD_J + String.fromCharCode(margen));
  // Calcular ancho del separador (full o parcial) en puntos, luego en chars
  // según la fuente activa para que ocupe el mismo ancho físico.
  const paso = pasoFuente(linea.formato?.tamano);
  let sepWidthChars = Math.max(1, Math.floor(ctx.w * 12 / paso));
  const anchoCfg = linea.ancho;
  if (typeof anchoCfg === 'number' && anchoCfg > 0) {
    sepWidthChars = Math.max(1, Math.floor(anchoCfg * 12 / paso));
  } else if (typeof anchoCfg === 'string' && anchoCfg.endsWith('%')) {
    const pct = parseInt(anchoCfg, 10);
    if (!isNaN(pct)) sepWidthChars = Math.max(1, Math.floor(Math.floor(ctx.w * pct / 100) * 12 / paso));
  }
  const charPage = Math.max(1, Math.floor(ctx.w * 12 / paso));
  // Alineacion horizontal del separador parcial
  const alSep = linea.alineacionSep;
  let charPadIzq = 0;
  if (sepWidthChars < charPage) {
    if (alSep === 'derecha') {
      charPadIzq = charPage - sepWidthChars;
    } else if (alSep === 'izquierda') {
      charPadIzq = 0;
    } else {
      // Default: centro
      charPadIzq = Math.floor((charPage - sepWidthChars) / 2);
    }
  }
  const charPadDer = Math.max(0, charPage - sepWidthChars - charPadIzq);
  // Grosor: cantidad de lineas para linea/linea_gruesa (1-3, default 1)
  const grosor = Math.max(1, Math.min(3, (linea as any).grosor ?? 1));
  if (char === 'linea' || char === 'linea_gruesa') {
    // Linea solida via subrayado ESC- sobre espacios
    const underlineCmd = char === 'linea_gruesa' ? (ESC + '-' + '\x02') : (ESC + '-' + '\x01');
    const lineContent = underlineCmd + ' '.repeat(charPadIzq) + ' '.repeat(sepWidthChars) + ' '.repeat(charPadDer) + CMD_UNDERLINE_OFF;
    for (let g = 0; g < grosor; g++) {
      ctx.p.push(lineContent + LF);
    }
    // Feed posterior para balancear el gap (no quede pegado al campo siguiente)
    ctx.p.push(CMD_J + '\x06');
  } else {
    const sep = char.repeat(sepWidthChars);
    const sepLine = ' '.repeat(charPadIzq) + sep + ' '.repeat(charPadDer);
    for (let g = 0; g < grosor; g++) {
      ctx.p.push(sepLine + LF);
    }
  }
  // Restaurar bold/condensed si el formato los especifico (para no heredar a la sig. linea)
  if (linea.formato?.negrita !== undefined) _bo(ctx, false);
  if (linea.formato?.tamano === 'condensada') _co(ctx, false);
  // Margen inferior
  if (margen > 0) ctx.p.push(CMD_J + String.fromCharCode(margen));
}

function _emitirEspacio(ctx: Ctx) {
  if (ctx.forceAl) _al(ctx, 'left');
  ctx.p.push(' ' + LF);
}

// ===== Factura POS (basado en zonas) =====

function renderDetalleCampo(
  clave: string,
  det: Record<string, any>,
): string {
  switch (clave) {
    case 'CODIGO': return String(det.codigo || '').slice(0, 10);
    case 'ARTICULO': return String(det.articulo || '--');
    case 'CANTIDAD': return formatMoney(Number(det.cantidad || 0));
    case 'PRECIO': return formatMoney(Number(det.precio || 0));
    case 'ITBIS': return formatMoney(Number(det.impuestos || 0));
    case 'TOTAL': return formatMoney(Number(det.total || 0));
    default: {
      // Intentar resolver la clave como ruta en el objeto (para arrayOrigen dinámico).
      // Probar la clave tal cual y luego en minúsculas.
      const valor = resolverRuta(det, clave) ?? resolverRuta(det, clave.toLowerCase());
      if (valor !== undefined && valor !== null) {
        if (typeof valor === 'number') return formatMoney(valor);
        return String(valor);
      }
      return '--';
    }
  }
}

function renderDetalleCampoFRI(
  clave: string,
  det: Record<string, any>,
): string {
  switch (clave) {
    case 'DOCUMENTO': return String(det.documento || '--');
    case 'MONTO_ORIG': return formatMoney(Number(det.montoOriginal || 0));
    case 'PAGADO': return formatMoney(Number(det.pagado || 0));
    case 'APLICADO': return formatMoney(Number(det.monto || 0));
    default: {
      // Intentar resolver la clave como ruta en el objeto (para arrayOrigen dinámico).
      const valor = resolverRuta(det, clave) ?? resolverRuta(det, clave.toLowerCase());
      if (valor !== undefined && valor !== null) {
        if (typeof valor === 'number') return formatMoney(valor);
        return String(valor);
      }
      return '--';
    }
  }
}

/**
 * Aplica el motor de expresiones ({...}) sobre la configuracion de plantilla
 * antes de normalizarla. Ante cualquier error devuelve la config original
 * (retrocompatibilidad total).
 */
function aplicarExpresiones(
  config: PlantillaConfig | undefined,
  data: any,
  company?: CompanyInfo,
): PlantillaConfig | undefined {
  if (!config) return config;
  try {
    const ctx: ContextoDatos = { data, company, config };
    return evaluarObjeto(config, ctx);
  } catch {
    return config;
  }
}

export function formatTicketPOS(data: any, company?: CompanyInfo, config?: PlantillaConfig): string {
  const cfg = normalizarConfig(aplicarExpresiones(config, data, company));
  const width = cfg.opciones?.anchoLinea ?? LINE_LENGTH;
  const zonas = normalizarZonasDetalle(cfg.zonas || [], 'detalles');

  // ── DIAGNÓSTICO TEMPORAL TIPO_COMP ──
  console.error('[DIAG-TIPO_COMP] data.transaccionNCF:', JSON.stringify(data?.transaccionNCF));
  console.error('[DIAG-TIPO_COMP] data.secuenciaNCF:', JSON.stringify(data?.secuenciaNCF));
  console.error('[DIAG-TIPO_COMP] config.raw:', JSON.stringify(config?.zonas?.length ?? 'null/undefined') + ' zonas, ids:', config?.zonas?.map(z => z.id).join(', '));
  console.error('[DIAG-TIPO_COMP] cfg normalizado zonas:', zonas.length, 'ids:', zonas.map(z => z.id).join(', '));
  const tieneTipoComp = zonas.some(z => z.lineas?.some(l => l.ref === 'CAMPO:TIPO_COMP'));
  console.error('[DIAG-TIPO_COMP] tieneCAMPO_TIPO_COMP en cfg normalizado:', tieneTipoComp);
  if (!tieneTipoComp) {
    const todasLineas = zonas.flatMap(z => z.lineas?.map(l => l.ref) || []);
    console.error('[DIAG-TIPO_COMP] todas las refs en zonas:', todasLineas.join(', '));
  }
  // ── FIN DIAGNÓSTICO ──
  const tot = cfg.totales || {};
  const cob = cfg.cobros || {};
  const pie = cfg.pie?.textoPie || '** GRACIAS POR SU COMPRA **';
  const companyName = company?.nombre || data?.sucursal?.nombre || 'SU EMPRESA';
  const tituloTexto = cfg.titulo?.texto || 'FACTURA AL CONTADO';
  const textosLibres = cfg.textosLibres || cfg.campos?.textosLibres;
  const camposDTO = cfg.camposDTO || cfg.campos?.camposDTO;
  const firmas = cfg.firmas;

  const ctx: Ctx = { p: [], w: width, al: 'left', bo: false, co: false, forceAl: false };
  ctx.p.push(CMD_INIT + CMD_NORMALIZAR);

  let maxLabelLenTotales = 0;
  let maxValorLenTotales = 0;
  let maxLabelLenCobros = 0;
  let maxValorLenCobros = 0;

  data.COMPANIA = companyName;
  data.DIRECCION = company?.direccion || '';
  data.TELEFONO = company?.telefono || '';
  data.RNC = company?.rnc || '';
  data.FAX = company?.fax || '';
  data.SLOGAN = company?.slogan || '';
  data.TITULO = tituloTexto;

  function emitirLinea(linea: LineaZonaConfig, enGrupo?: boolean) {
    // Evaluar condición si existe — si es falsy, no emitir nada
    if (linea.condicion && linea.condicion.trim()) {
      try {
        const condResult = evaluarExpresion(linea.condicion, { data, company });
        if (!condResult) return;
      } catch {
        // Si la expresión tiene error, emitir la línea (regresión cero)
      }
    }
    if (linea.ref === 'SEPARADOR') { _emitirSep(ctx, linea); return; }
    if (linea.ref === 'ESPACIO') { _emitirEspacio(ctx); return; }
    if (linea.ref.startsWith('LIBRE:') || linea.ref.startsWith('DTO:') || linea.ref.startsWith('FIRMA:')) {
      emitirItemEspecial(ctx.p, linea.ref, data, width, textosLibres, camposDTO, linea.tabular, linea.mismaLinea, firmas, linea, enGrupo);
      return;
    }

    const ref = linea.ref;
    const lblOv = linea.label;
    const fmtOv = linea.formato;
    const fmtLabel = linea.formatoLabel || linea.formato;
    const fmtValor = linea.formatoValor;

    if (ref.startsWith('CAMPO:')) {
      const clave = ref.slice(6);

      switch (clave) {
        case 'CODIGO_QR': {
          _aplicarFmt(ctx, fmtOv);
          const qrRender = renderCampoFPV(clave, data, lblOv, fmtOv, width, linea.tabular, linea.mostrarLabel, fmtLabel, fmtValor, linea.ruta);
          if (qrRender) ctx.p.push(qrRender);
          _restaurarFmt(ctx, fmtOv);
          ctx.p.push(CMD_INIT + CMD_NORMALIZAR); // Resetear impresora despues del QR (evita corrupcion de estado)
          ctx.al = 'left'; ctx.bo = false; ctx.co = false; // Sincronizar Ctx
          break;
        }
        case 'CODIGO_BARRAS': {
          // Aplicar alineacion (por defecto centrado) antes del barcode; el barcode
          // no lleva formato de texto, pero si respeta la alineacion de la linea.
          const fmtBc = { ...(fmtOv || {}), alineacion: (fmtOv?.alineacion as any) || 'centro' } as FormatoItemTicket;
          _aplicarFmt(ctx, fmtBc);
          const bcRender = renderCampoFPV(clave, data, lblOv, fmtOv, width, linea.tabular, linea.mostrarLabel, fmtLabel, fmtValor, linea.ruta, linea.tipoBarcode);
          if (bcRender) ctx.p.push(bcRender);
          _restaurarFmt(ctx, fmtOv);
          ctx.p.push(CMD_INIT + CMD_NORMALIZAR); // Resetear impresora despues del barcode
          ctx.al = 'left'; ctx.bo = false; ctx.co = false; // Sincronizar Ctx
          break;
        }
        default: {
          const render = renderCampoFPV(clave, data, lblOv, fmtOv, width, linea.tabular, linea.mostrarLabel, fmtLabel, fmtValor, linea.ruta, undefined, linea.tipoDato, linea.formatoDato);
          if (render) ctx.p.push(render);
          _restaurarFmt(ctx, fmtOv);
          break;
        }
      }
      return;
    }

    if (linea.ref.startsWith('ESQUEMA:')) {
      const clave = linea.ref.slice(8);
      const render = renderCampoEsquema(clave, cfg.esquema, lblOv, fmtOv, width, linea.tabular, linea.mostrarLabel, fmtLabel, fmtValor, linea.tipoDato, linea.formatoDato, linea.calculo);
      if (render) ctx.p.push(render);
      _restaurarFmt(ctx, fmtOv);
      return;
    }

    if (ref.startsWith('TOTAL:')) {
      const clave = ref.slice(6);
      const tieneTab = !!linea.tabular;
      // Mismo contrato que CAMPO:: combina formatoLabel + formatoValor + formato
      // para que tamano/negrita por linea si se apliquen en totales.
      const fmtCombTot = { ...(linea.formatoLabel || {}), ...(linea.formatoValor || {}), ...(fmtOv || {}) };
      const fmtSinAlineacion = { ...fmtCombTot, alineacion: undefined };
      _aplicarFmt(ctx, fmtSinAlineacion);
      const totalGravado = Number(data.subTotal) || 0;
      const itbis = Number(data.impuestos) || 0;
      const descuento = Number(data.descuento) || 0;
      const totalExento = Number(data.totalExento) || 0;
      const tabAn = linea.tabular?.ancho ?? 12;
      const lineaLbl = linea.label;

      const emitirTotal = (label: string, monto: string) => {
        if (linea.mostrarLabel === false) {
          if (tieneTab) { lineaTabular(ctx, '', monto, tabAn, undefined, linea.formatoValor || fmtOv); ctx.p.push(LF); }
          else { _aplicarFmt(ctx, linea.formatoValor || fmtOv); ctx.p.push(monto + LF); _restaurarFmt(ctx, linea.formatoValor || fmtOv); }
          return;
        }
        const lbl = lineaLbl || label;
        if (tieneTab) {
        const anchoEtiqueta = Math.max(tabAn, maxLabelLenTotales + 2);
          const texto = right(lbl + ':', anchoEtiqueta) + right(monto, maxValorLenTotales);
          // Alineacion por linea: formatoLabel > formatoValor > formato > zona.
          const alineacion = linea.formatoLabel?.alineacion || linea.formatoValor?.alineacion || linea.formato?.alineacion || zonaActualAlineacion;
          if (alineacion === 'izquierda') {
            ctx.p.push(texto + LF);
          } else if (alineacion === 'centro') {
            ctx.p.push(centerVisible(texto, width, fmtCombTot?.tamano) + LF);
          } else {
            ctx.p.push(rightVisible(texto, width, fmtCombTot?.tamano) + LF);
          }
        } else {
          const texto = right(lbl, maxLabelLenTotales) + ':  ' + right(monto, maxValorLenTotales);
          const alineacion = linea.formatoLabel?.alineacion || linea.formatoValor?.alineacion || linea.formato?.alineacion || zonaActualAlineacion;
          if (alineacion === 'izquierda') {
            ctx.p.push(texto + LF);
          } else if (alineacion === 'centro') {
            ctx.p.push(centerVisible(texto, width, fmtCombTot?.tamano) + LF);
          } else {
            // default: derecha (para totales)
            ctx.p.push(rightVisible(texto, width, fmtCombTot?.tamano) + LF);
          }
        }
      };

      switch (clave) {
        case 'TOTAL_GRAVADO':
          if (tot.mostrarGravado === false) return;
          emitirTotal('Total Gravado', formatMoney(totalGravado));
          break;
        case 'SUBTOTAL':
          if (tot.mostrarSubtotal === false) return;
          emitirTotal('Subtotal', formatMoney(totalGravado));
          break;
        case 'ITBIS':
          if (tot.mostrarItbis === false) return;
          emitirTotal('Itbis', formatMoney(itbis));
          break;
        case 'DESCUENTO':
          if (tot.mostrarDescuento === false || descuento <= 0) return;
          emitirTotal('Descuento', formatMoney(descuento));
          break;
        case 'TOTAL_EXENTO':
          emitirTotal('Total Exento', formatMoney(totalExento));
          break;
        case 'TOTAL':
          emitirTotal('Total', formatMoney(data.total));
          break;
      }
      _restaurarFmt(ctx, fmtSinAlineacion);
      return;
    }

    if (ref.startsWith('COBRO:')) {
      // Mismo contrato que CAMPO:: combina formatoLabel + formatoValor + formato
      // para que tamano/negrita por linea si se apliquen (antes se ignoraban y
      // la condensada configurada en cobros no salia).
      const fmtCombCobro = { ...(linea.formatoLabel || {}), ...(linea.formatoValor || {}), ...(fmtOv || {}), alineacion: undefined } as FormatoItemTicket;
      _aplicarFmt(ctx, fmtCombCobro);
      emitirCobroFPVLinea(ctx, ref.slice(6), data, cob, cfg, width, linea, maxLabelLenCobros, maxValorLenCobros, zonaActualAlineacion, fmtCombCobro);
      _restaurarFmt(ctx, fmtCombCobro);
      return;
    }
  }

  function emitirLineasConBuffer(lineas: LineaZonaConfig[]) {
    if (lineas.some((l) => l.lineaNum !== undefined)) {
      renderLineasAgrupadas(lineas, width, ctx.p, emitirLinea);
      return;
    }
    const buffer: string[] = [];
    let idx = 0;
    while (idx < lineas.length) {
      const linea = lineas[idx];
      if (!linea.mismaLinea) {
        // Linea independiente: flush del buffer y emitir tal cual
        if (buffer.length > 0) { ctx.p.push(...buffer); buffer.length = 0; }
        emitirLinea(linea);
        idx++;
        continue;
      }
      // Grupo: corrida consecutiva de lineas mismaLinea. Se renderiza cada
      // campo para conocer su largo natural y reservar primero los campos
      // alineados a la derecha sin ancho fijo (ej: montos).
      const grupo: LineaZonaConfig[] = [];
      const limpios: string[] = [];
      let j = idx;
      while (j < lineas.length && lineas[j].mismaLinea) {
        const prevLen = ctx.p.length;
        emitirLinea(lineas[j], true);
        const nuevas = ctx.p.splice(prevLen);
        const limpio = nuevas.join('').replace(/\x1Ba[\x00-\x02]/g, '').replace(/\n/g, ' ');
        grupo.push(lineas[j]);
        limpios.push(limpio);
        j++;
      }
      const largos = limpios.map((t) => largoVisible(trimVisible(t)));
      const anchos = calcularAnchosGrupo(grupo, largos, width);
      for (let k = 0; k < grupo.length; k++) {
        if (anchos[k] === 0) continue;
        const lnGrupo = grupo[k];
        const sinFijo = !(lnGrupo.anchoCampo && lnGrupo.anchoCampo > 0) && !((lnGrupo.tabular?.ancho ?? 0) > 0);
        if (k === grupo.length - 1 && sinFijo && largoVisible(trimVisible(limpios[k])) > anchos[k]) {
          // Ultimo campo flexible que excede su espacio: se emite completo (la
          // impresora envuelve) en lugar de truncar el valor (ej: la hora).
          buffer.push(trimVisible(limpios[k]));
          continue;
        }
        buffer.push(padSegunAlineacion(trimVisible(limpios[k]), anchos[k], lnGrupo));
      }
      idx = j;
    }
    if (buffer.length > 0) {
      // La zona terminó en un grupo mismaLinea: cerrar la línea física
      ctx.p.push(...buffer);
      buffer.length = 0;
      ctx.p.push(LF);
    }
  }

  // C1: Pre-computar anchoFill compartido entre cabecera_grupo_detalle y detalle
  // para garantizar que cabecera de columnas y datos queden alineados visualmente.
  const zonaCabFPV = zonas.find(z => z.tipo === 'cabecera_grupo_detalle');
  const zonaDetFPV = zonas.find(z => z.tipo === 'detalle');
  const todasDetFPV = [
    ...(zonaCabFPV?.lineas || []).filter(l => l.ref.startsWith('DETALLE:')),
    ...(zonaDetFPV?.lineas || []).filter(l => l.ref.startsWith('DETALLE:')),
  ];
  const hayTabularGlobalFPV = todasDetFPV.some(l => l.tabular);
  const anchoFillFPV = !hayTabularGlobalFPV && todasDetFPV.length > 0
    ? Math.floor(width / todasDetFPV.length)
    : 0;

  let zonaActualAlineacion: AlineacionTicket | undefined;

  for (const zona of zonas) {
    switch (zona.tipo) {
      case 'encabezado_reporte':
      case 'pie_reporte':
        zonaActualAlineacion = zona.alineacion;
        if (zona.alineacion) _al(ctx, zona.alineacion); else _al(ctx, 'izquierda');
        emitirLineasConBuffer(zona.lineas);
        _bo(ctx, false); _co(ctx, false);
        _al(ctx, 'izquierda');
        ctx.forceAl = true;
        break;
      case 'totales': {
        zonaActualAlineacion = zona.alineacion;
        // Pre-calcular maxLabelLen y maxValorLen para alinear totales
        maxLabelLenTotales = 0;
        maxValorLenTotales = 0;
        for (const linea of zona.lineas) {
          if (linea.ref.startsWith('TOTAL:')) {
            const clave = linea.ref.slice(6);
            let labelDefault = clave;
            let valorTexto = '';
            switch (clave) {
              case 'TOTAL_GRAVADO': labelDefault = 'Total Gravado'; valorTexto = formatMoney(Number(data.subTotal) || 0); break;
              case 'SUBTOTAL': labelDefault = 'Subtotal'; valorTexto = formatMoney(Number(data.subTotal) || 0); break;
              case 'ITBIS': labelDefault = 'Itbis'; valorTexto = formatMoney(Number(data.impuestos) || 0); break;
              case 'DESCUENTO': labelDefault = 'Descuento'; valorTexto = formatMoney(Number(data.descuento) || 0); break;
              case 'TOTAL_EXENTO': labelDefault = 'Total Exento'; valorTexto = formatMoney(Number(data.totalExento) || 0); break;
              case 'TOTAL': labelDefault = 'Total'; valorTexto = formatMoney(Number(data.total) || 0); break;
            }
            const lbl = linea.label || labelDefault;
            if (lbl.length > maxLabelLenTotales) maxLabelLenTotales = lbl.length;
            if (valorTexto.length > maxValorLenTotales) maxValorLenTotales = valorTexto.length;
          }
        }
        if (zona.alineacion) _al(ctx, zona.alineacion); else _al(ctx, 'izquierda');
        emitirLineasConBuffer(zona.lineas);
        _bo(ctx, false); _co(ctx, false);
        _al(ctx, 'izquierda');
        ctx.forceAl = true;
        break;
      }
      case 'pie_detalle':
      case 'encabezado_pagina':
      case 'pie_pagina':
        zonaActualAlineacion = zona.alineacion;
        if (zona.alineacion) _al(ctx, zona.alineacion); else _al(ctx, 'izquierda');
        emitirLineasConBuffer(zona.lineas);
        _bo(ctx, false); _co(ctx, false);
        _al(ctx, 'izquierda');
        ctx.forceAl = true;
        break;
      case 'cobros': {
        zonaActualAlineacion = zona.alineacion;
        // Pre-calcular maxLabelLen y maxValorLen para alinear cobros
        maxLabelLenCobros = 0;
        maxValorLenCobros = 0;
        const crsPre = data.cobros || [];
        const cPre = crsPre.length > 0 ? crsPre[0] : null;
        for (const linea of zona.lineas) {
          if (linea.ref.startsWith('COBRO:')) {
            const nombre = linea.ref.slice(6);
            const label = linea.label || nombre.replace(/_/g, ' ');
            if (label.length > maxLabelLenCobros) maxLabelLenCobros = label.length;
            // Calcular valor
            let valor = '';
            if (cPre) {
              if (nombre === 'DEVUELTA') {
                const dev = Number(cPre.devuelta) || 0;
                if (dev > 0.01) valor = formatMoney(dev);
              } else {
                const mapa: Record<string, number> = {
                  EFECTIVO: Number(cPre.efectivo) || 0,
                  CHEQUE: Number(cPre.cheque) || 0,
                  TARJETA_CREDITO: Number(cPre.tarjetaCredito) || 0,
                  TARJETA_DEBITO: Number(cPre.tarjetaDebito) || 0,
                  TRANSFERENCIA: Number(cPre.transferencia) || 0,
                  BONO: Number(cPre.bono) || 0,
                  TARJETA_REGALO: Number(cPre.tarjetaRegalo) || 0,
                  NOTA_CREDITO: Number(cPre.notaCredito) || 0,
                };
                const monto = mapa[nombre];
                if (monto > 0) valor = formatMoney(monto);
              }
            }
            if (valor.length > maxValorLenCobros) maxValorLenCobros = valor.length;
          }
        }
        if (zona.alineacion) _al(ctx, zona.alineacion); else _al(ctx, 'izquierda');
        const tieneLineasCobro = zona.lineas.some((l) => l.ref.startsWith('COBRO:'));
        // Solo auto-emitir si la zona no tiene líneas COBRO personalizadas
        if (!tieneLineasCobro) {
          const crs = data.cobros || [];
          if (cob.mostrarCobros !== false && crs.length > 0) {
            const c = crs[0];
            const efectivo = Number(c.efectivo) || 0;
            const cheque = Number(c.cheque) || 0;
            const tarjetaCredito = Number(c.tarjetaCredito) || 0;
            const tarjetaDebito = Number(c.tarjetaDebito) || 0;
            const transferencia = Number(c.transferencia) || 0;
            const bono = Number(c.bono) || 0;
            const tarjetaRegalo = Number(c.tarjetaRegalo) || 0;
            const notaCredito = Number(c.notaCredito) || 0;

            if (efectivo > 0) ctx.p.push(formatTotalLine('EFECTIVO', formatMoney(efectivo), width) + LF);
            if (cheque > 0) ctx.p.push(formatTotalLine('CHEQUE', formatMoney(cheque), width) + LF);
            if (tarjetaCredito > 0) ctx.p.push(formatTotalLine('TARJETA CREDITO', formatMoney(tarjetaCredito), width) + LF);
            if (tarjetaDebito > 0) ctx.p.push(formatTotalLine('TARJETA DEBITO', formatMoney(tarjetaDebito), width) + LF);
            if (transferencia > 0) ctx.p.push(formatTotalLine('TRANSFERENCIA', formatMoney(transferencia), width) + LF);
            if (bono > 0) ctx.p.push(formatTotalLine('BONO', formatMoney(bono), width) + LF);
            if (tarjetaRegalo > 0) ctx.p.push(formatTotalLine('TARJETA REGALO', formatMoney(tarjetaRegalo), width) + LF);
            if (notaCredito > 0) ctx.p.push(formatTotalLine('NOTA CREDITO', formatMoney(notaCredito), width) + LF);

            const devuelta = Number(c.devuelta) || 0;
            if (devuelta > 0.01) {
              ctx.p.push(formatTotalLine('DEVUELTA', formatMoney(devuelta), width) + LF);
            }
          }
        }
        emitirLineasConBuffer(zona.lineas);
        _bo(ctx, false); _co(ctx, false);
        _al(ctx, 'izquierda');
        ctx.forceAl = true;
        break;
      }
      case 'cabecera_grupo_detalle': {
        zonaActualAlineacion = zona.alineacion;
        if (zona.alineacion) _al(ctx, zona.alineacion); else _al(ctx, 'izquierda');
        // Procesar líneas en orden: acumular DETALLE:* como cabecera de columnas
        // y emitir no-DETALLE (SEPARADOR, ESPACIO, etc.) en su posición real.
        const cabeceraPartsFPV: string[] = [];
        const flushCabFPV = () => {
          if (cabeceraPartsFPV.length > 0) {
            ctx.p.push(cabeceraPartsFPV.join('') + LF);
            cabeceraPartsFPV.length = 0;
          }
        };
        const anchosCabFPV = new Map<number, number>();
        if (zona.lineas.some((l) => l.lineaNum !== undefined)) {
          const numsCab = new Set<number>();
          zona.lineas.forEach((ln, i) => {
            if (ln.lineaNum === undefined || numsCab.has(ln.lineaNum)) return;
            // Include DETALLE refs and any line with explicit width (fijo/tabular).
            const tieneAncho = ln.ref.startsWith('DETALLE:') || ln.anchoTipo === 'fijo' || (ln.tabular?.ancho ?? 0) > 0;
            if (!tieneAncho) return;
            numsCab.add(ln.lineaNum);
        calcularAnchosLinea(zona.lineas, ln.lineaNum, width, i).forEach((a, idx) => anchosCabFPV.set(idx, a));
          });
        }
        for (const linea of zona.lineas) {
          const idxLa = zona.lineas.indexOf(linea);
          const anchoTabular = (anchosCabFPV.get(idxLa) ?? 0) || linea.tabular?.ancho || 0;
          // Column-like lines: DETALLE refs, or any line with lineaNum and explicit width.
          if (linea.ref.startsWith('DETALLE:') || (linea.lineaNum !== undefined && anchoTabular > 0)) {
            const clave = linea.ref.startsWith('DETALLE:') ? linea.ref.slice(8) : undefined;
            const label = clave
              ? (linea.label || CAMPOS_DETALLE_LABELS[clave] || clave)
              : (linea.label || linea.ref);
            const labelFmt = padSegunAlineacion(label, anchoTabular || width, linea);
            const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: undefined });
            cabeceraPartsFPV.push(antes.join('') + labelFmt + despues.join(''));
          } else {
            // Non-column: flush cabecera acumulada primero, luego emitir línea
            flushCabFPV();
            emitirLinea(linea);
          }
        }
        flushCabFPV();
        _bo(ctx, false); _co(ctx, false);
        _al(ctx, 'izquierda');
        ctx.forceAl = true;
        break;
      }
        case 'detalle': {
          zonaActualAlineacion = zona.alineacion;
          if (zona.alineacion) _al(ctx, zona.alineacion); else _al(ctx, 'izquierda');
          // C1: usar anchoFillFPV compartido (calculado antes del loop de zonas)
          // Si la zona tiene arrayOrigen, iterar ese array dinámicamente (ej: impuestosFactura).
          // Si no, usar data.detalles (comportamiento por defecto).
          const detalles = zona.arrayOrigen
            ? (resolverRuta(data, zona.arrayOrigen) as any[]) || generarDatosEjemploArray(zona)
            : (data.detalles || []);
          let anchoAcumDetFPV = 0;
          for (const det of detalles) {
            const bufferLinea: string[] = [];
            // Pre-render de textos y pre-calculo de anchos por grupo:
            // los campos derecha sin ancho fijo reservan su largo natural primero.
            const textosDet = new Map<number, string>();
            zona.lineas.forEach((ln, idxLn) => {
              if (!ln.ref.startsWith('DETALLE:')) return;
              const clave = ln.ref.slice(8);
              const valor = renderDetalleCampo(clave, det);
              textosDet.set(idxLn, ln.mostrarLabel !== false
                ? (ln.label || CAMPOS_DETALLE_LABELS[clave] || clave) + ': ' + valor
                : valor);
            });
            const anchosPorIdx = new Map<number, number>();
            const conteoDet = new Map<number, number>();
            const usaModeloDetalle = zona.lineas.some((l) => l.lineaNum !== undefined);
            if (usaModeloDetalle) {
              zona.lineas.forEach((ln) => {
                if (!ln.ref.startsWith('DETALLE:') || ln.lineaNum === undefined) return;
                conteoDet.set(ln.lineaNum, (conteoDet.get(ln.lineaNum) ?? 0) + 1);
              });
              const numsDet = new Set<number>();
              zona.lineas.forEach((ln, idxLn) => {
                if (!ln.ref.startsWith('DETALLE:') || ln.lineaNum === undefined || numsDet.has(ln.lineaNum)) return;
                numsDet.add(ln.lineaNum);
        calcularAnchosLinea(zona.lineas, ln.lineaNum, width, idxLn).forEach((ancho, i) => anchosPorIdx.set(i, ancho));
              });
            } else {
              let gi = 0;
              while (gi < zona.lineas.length) {
                if (!zona.lineas[gi].ref.startsWith('DETALLE:') || !zona.lineas[gi].mismaLinea) { gi++; continue; }
                let gj = gi;
                const gLineas: LineaZonaConfig[] = [];
                const gLargos: number[] = [];
                while (gj < zona.lineas.length && zona.lineas[gj].ref.startsWith('DETALLE:') && zona.lineas[gj].mismaLinea) {
                  gLineas.push(zona.lineas[gj]);
                  gLargos.push(largoVisible(trimVisible(textosDet.get(gj) ?? '')));
                  gj++;
                }
                const anchosG = calcularAnchosGrupo(gLineas, gLargos, width);
                for (let k = 0; k < gLineas.length; k++) anchosPorIdx.set(gi + k, anchosG[k]);
                gi = gj;
              }
            }
            for (let li = 0; li < zona.lineas.length; li++) {
              const linea = zona.lineas[li];
            if (li > 0 && linea.lineaNum !== zona.lineas[li - 1].lineaNum && bufferLinea.length > 0) {
              ctx.p.push(...bufferLinea, LF);
              bufferLinea.length = 0;
            }
              if (!linea.ref.startsWith('DETALLE:')) {
                if (bufferLinea.length > 0) { ctx.p.push(...bufferLinea, LF); bufferLinea.length = 0; }
                anchoAcumDetFPV = 0;
                emitirLinea(linea);
                continue;
              }
              const texto = textosDet.get(li) ?? '';
              const esColumnaModelo = linea.lineaNum !== undefined;
              if (linea.mismaLinea || esColumnaModelo) {
                const anchoCampo = anchosPorIdx.get(li) ?? 0;
                if (anchoCampo === 0) continue;
                const textoTrim = trimVisible(texto);
                const textoPad = padSegunAlineacion(textoTrim, anchoCampo, linea);
                const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: undefined });
                bufferLinea.push(antes.join('') + textoPad + despues.join(''));
              } else {
                if (bufferLinea.length > 0) { ctx.p.push(...bufferLinea, LF); bufferLinea.length = 0; }
                anchoAcumDetFPV = 0;
                const al = linea.formato?.alineacion;
                // Respetar tabular.ancho en lineas DETALLE individuales
                // (mismo criterio que la cabecera de columnas).
                const anchoDestino = linea.tabular?.ancho && linea.tabular.ancho > 0
                  ? Math.min(linea.tabular.ancho, width)
                  : width;
                const textoPad = padSegunAlineacion(texto, anchoDestino, linea);
                const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: undefined });
                ctx.p.push(antes.join('') + textoPad + despues.join(''), LF);
              }
            }
            if (bufferLinea.length > 0) { ctx.p.push(...bufferLinea, LF, CMD_J + '\x08'); }
            anchoAcumDetFPV = 0;
          }
          break;
      }
      case 'banda': {
        zonaActualAlineacion = zona.alineacion;
        if (zona.alineacion) _al(ctx, zona.alineacion); else _al(ctx, 'izquierda');
        emitirLineasConBuffer(zona.lineas);
        _bo(ctx, false); _co(ctx, false);
        _al(ctx, 'izquierda');
        ctx.forceAl = true;
        break;
      }
    }
  }

  ctx.p.push(LF);
  return ctx.p.join('');
}

/** Renderiza un campo estandar FPV con label editable y formato. */
function renderCampoFPV(
  clave: string, data: any,
  lblOv?: string,
  fmtOv?: FormatoItemTicket,
  width?: number,
  tabular?: { ancho?: number },
  mostrarLabel?: boolean,
  fmtLabel?: FormatoItemTicket,  // NUEVO
  fmtValor?: FormatoItemTicket,  // NUEVO
  ruta?: string,
  tipoBarcode?: 'CODE' | 'CODE128' | 'EAN13',
  tipoDato?: 'texto' | 'fecha' | 'numero' | 'dinero',
  formato?: string
): string | null {
  const w = width ?? LINE_LENGTH;
  const defaultLabels: Record<string, string> = {
    NCF: 'NCF', TIPO_COMP: 'TIPO COMP',     CAJERO: 'CAJERO', CAJA: 'CAJA',
    TURNO: 'TURNO', FECHA: 'FECHA', HORA: 'HORA', NO: 'NO',
    CLIENTE: 'CLIENTE', RNC_CLIENTE: 'RNC CLIENTE',
    COMPANIA: 'Compañía', DIRECCION: 'Dirección', TELEFONO: 'Teléfono', RNC: 'RNC',
    FAX: 'Fax', SLOGAN: 'Slogan',
    FECHA_VENCIMIENTO_NCF: 'Vence', SECUENCIA_NCF: 'Secuencia NCF',
    CODIGO_SEGURIDAD: 'Código de Seguridad',
    FECHA_FIRMA_DIGITAL: 'Fecha Firma Digital',
  };
  const lbl = (lblOv !== undefined && lblOv !== '' && lblOv !== defaultLabels[clave])
    ? lblOv : (defaultLabels[clave] || clave);
  const fmt = fmtOv;

  function formatearSegunTipo(valor: any, tipo?: string, fmt2?: string): string {
    if (valor === undefined || valor === null) return '--';
    if (valor === '') return '';
    switch (tipo) {
      case 'fecha': {
        const d = new Date(valor);
        if (!isNaN(d.getTime())) {
          if (fmt2) {
            try {
              return d.toLocaleDateString('es-DO', { year: 'numeric', month: '2-digit', day: '2-digit' });
            } catch { return formatDate(String(valor)); }
          }
          return formatDate(String(valor));
        }
        return String(valor);
      }
      case 'numero': {
        const n = Number(valor);
        if (!isNaN(n)) {
          if (fmt2) {
            try { return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); } catch { }
          }
          return String(n);
        }
        return String(valor);
      }
      case 'dinero': {
        const m = Number(valor);
        if (!isNaN(m)) return formatMoney(m);
        return String(valor);
      }
      default: {
        if (typeof valor === 'number') return formatMoney(valor);
        return String(valor);
      }
    }
  }

  function val(): string {
    switch (clave) {
      case 'NCF': return data.ncf || '--';
      case 'TIPO_COMP': {
        const result = data.transaccionNCF?.nombreTipoComprobante
          || data.secuenciaNCF?.nombreTipoComprobante || '--';
        console.error('[DIAG-TIPO_COMP] renderCampoFPV val():', JSON.stringify(result), '| transaccionNCF:', JSON.stringify(data?.transaccionNCF), '| secuenciaNCF keys:', Object.keys(data?.secuenciaNCF || {}));
        return result;
      }
      case 'CAJERO': return data.cajero || '--';
      case 'CAJA': return data.caja || '--';
      case 'TURNO': return data.turno || '--';
      case 'FECHA': return formatDate(data.fechaDocumento);
      case 'HORA': return formatTime(data.fechaDocumento);
      case 'NO': return data.noDocumento || '--';
      case 'CLIENTE': return data.cliente?.nombre || 'Consumidor Final';
      case 'RNC_CLIENTE': {
        const rnc = data.cliente?.identificacion || '';
        return rnc;
      }
      case 'FECHA_IMPRESION': return new Date().toLocaleString('es-DO');
      case 'HORA_IMPRESION': return new Date().toLocaleTimeString('es-DO');
      case 'NUM_DETALLES': return String(data.detalles?.length || 0);
      case 'COMPANIA': return data.COMPANIA || '--';
      case 'DIRECCION': return data.DIRECCION || '';
      case 'TELEFONO': return data.TELEFONO || '';
      case 'RNC': return data.RNC || '';
      case 'FAX': return data.FAX || '';
      case 'SLOGAN': return data.SLOGAN || '';
      case 'TITULO': return data.TITULO || '--';
      case 'FECHA_VENCIMIENTO_NCF': return formatDate(data.transaccionNCF?.fechaVencimiento);
      case 'SECUENCIA_NCF': return data.transaccionNCF?.secuencia || data.secuenciaNCF?.secuencia || '--';
      case 'CODIGO_SEGURIDAD': {
        const qrUrl = data.envioDGII?.codigoQR || data.codigoQR || '';
        if (!qrUrl) return '--';
        const params = new URLSearchParams(qrUrl.split('?')[1] || '');
        return params.get('CodigoSeguridad') || '--';
      }
      case 'FECHA_FIRMA_DIGITAL': {
        const qrUrl = data.envioDGII?.codigoQR || data.codigoQR || '';
        if (qrUrl) {
          const params = new URLSearchParams(qrUrl.split('?')[1] || '');
          const fechaFirma = params.get('FechaFirma');
          if (fechaFirma) return formatDate(fechaFirma);
        }
        return formatDate(data.envioDGII?.fechaEnvio) || '--';
      }
      default: break;
    }
    const dinamico = resolverRuta(data, clave) ?? resolverRuta(data, clave.toLowerCase());
    if (dinamico === undefined || dinamico === null) return '--';
    if (dinamico === '') return '';
    if (Array.isArray(dinamico)) {
      return dinamico.map((v: any) => String(v)).join(', ');
    }
    if (typeof dinamico === 'object') return '--';
    return formatearSegunTipo(dinamico, tipoDato, formato);
  }

  // CODIGO_QR: no es un campo de texto, emite comandos QR directamente
  if (clave === 'CODIGO_QR') {
    const qrData = data.envioDGII?.codigoQR || data.codigoQR;
    if (!qrData) return null;
    return escposQRCode(qrData);
  }

  // CODIGO_BARRAS: no es un campo de texto, emite comandos GS k directamente
  if (clave === 'CODIGO_BARRAS') {
    const bcData = ruta
      ? resolverRuta(data, ruta)
      : (data.codigoBarras || data.transaccionNCF?.secuencia || data.secuenciaNCF?.secuencia);
    if (bcData === undefined || bcData === null || bcData === '') return null;
    return escposBarcode(String(bcData), 100, (tipoBarcode === 'CODE' ? 'CODE128' : tipoBarcode) ?? 'CODE128');
  }

  const v = val();

  // RNC_CLIENTE con label por defecto (solo modo NO tabular): 9 espacios + "RNC: " + valor.
  // Con tabular configurado debe caer al camino tabular para respetar la alineacion
  // de la plantilla (antes este early-return lo interceptaba siempre y se veia desplazado).
  if (clave === 'RNC_CLIENTE' && !lblOv && v !== '' && !tabular) {
    const clienteRnc = data.cliente?.identificacion || '';
    if (!clienteRnc) return null;
    return aplicarFormatoTexto(fmt, '         RNC: ' + clienteRnc, w);
  }

  // RNC_CLIENTE con label custom
  if (clave === 'RNC_CLIENTE' && lblOv) {
    const clienteRnc = data.cliente?.identificacion || '';
    if (!clienteRnc) return null;
    return lineaConFormato(fmt, lbl, clienteRnc, w);
  }

  if (v === '' || v === undefined) return null;

  // Si mostrarLabel es false, emitir solo el valor con el formato del valor (o label, o general)
  if (mostrarLabel === false) {
    return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
  }

  if (tabular) {
    const tabAn = tabular.ancho ?? 12;
    // Para RNC_CLIENTE tabular: usar el mismo formato de 9 espacios que el default
    if (clave === 'RNC_CLIENTE' && !lblOv) {
      const clienteRnc = data.cliente?.identificacion || '';
      if (!clienteRnc) return null;
      if (fmtLabel || fmtValor) {
    const alineacion = fmtLabel?.alineacion || fmtValor?.alineacion || fmt?.alineacion;
        const fmtComb = { ...fmtLabel, ...fmtValor, ...fmt };
        if (alineacion) fmtComb.alineacion = alineacion;
        return aplicarFormatoTexto(fmtComb, lineaTabularConFormato('RNC', clienteRnc, tabAn, fmtLabel || fmt, fmtValor), w);
      }
      return aplicarFormatoTexto(fmt, lineaTabularStr('RNC', clienteRnc, tabAn) + LF, w);
    }
    if (fmtLabel || fmtValor) {
      const alineacion = fmtLabel?.alineacion || fmtValor?.alineacion || fmt?.alineacion;
      const fmtComb = { ...fmtLabel, ...fmtValor, ...fmt };
      if (alineacion) fmtComb.alineacion = alineacion;
      return aplicarFormatoTexto(fmtComb, lineaTabularConFormato(lbl, v, tabAn, fmtLabel || fmt, fmtValor), w);
    }
    return aplicarFormatoTexto(fmt, lineaTabularStr(lbl, v, tabAn), w);
  }

  // Modo no tabular: si hay formato dual (fmtLabel o fmtValor), intercalar comandos
  if (fmtLabel || fmtValor) {
    let lblStr = lbl + ': ';
    if (fmtLabel?.negrita === true) lblStr = CMD_BOLD_ON + lblStr + CMD_BOLD_OFF;
    else if (fmtLabel?.negrita === false) lblStr = CMD_BOLD_OFF + lblStr;

    let valStr = v;
    if (fmtValor?.negrita === true) valStr = CMD_BOLD_ON + valStr + CMD_BOLD_OFF;
    else if (fmtValor?.negrita === false) valStr = CMD_BOLD_OFF + valStr;

    const texto = lblStr + valStr;
    const alineacion = fmtLabel?.alineacion || fmtValor?.alineacion || fmtOv?.alineacion;
    const fmtCombinado = { ...fmtLabel, ...fmtValor, ...fmtOv };
    if (alineacion) fmtCombinado.alineacion = alineacion;
    return aplicarFormatoTexto(fmtCombinado, texto, w);
  }

  if (fmt?.negrita === true || fmt?.negrita === false) {
    const texto = lbl + ': ' + v;
    return aplicarFormatoTexto(fmt, texto, w);
  }
  const texto = CMD_BOLD_ON + lbl + CMD_BOLD_OFF + ': ' + v;
  return aplicarFormatoTexto(fmt, texto, w);
}

/**
 * Renderiza una linea `ESQUEMA:<ruta>` resolviendo la ruta (notacion de puntos)
 * contra `esquema` (el JSON de ejemplo cargado en `config.esquema`).
 * Reutiliza el mismo contrato de formato que renderCampoFPV: label editable,
 * formato dual (label/valor), tabular, tipo de dato y formato numerico/fecha.
 */
function renderCampoEsquema(
  clave: string,
  esquema: any,
  lblOv?: string,
  fmtOv?: FormatoItemTicket,
  width?: number,
  tabular?: { ancho?: number },
  mostrarLabel?: boolean,
  fmtLabel?: FormatoItemTicket,
  fmtValor?: FormatoItemTicket,
  tipoDato?: 'texto' | 'fecha' | 'numero' | 'dinero',
  formato?: string,
  calculo?: CalculoCampo,
): string | null {
  const w = width ?? LINE_LENGTH;
  const fmt = fmtOv;
  const lbl = (lblOv !== undefined && lblOv !== '') ? lblOv : (calculo ? `${VERBOS_CALCULO[calculo.tipo]} ${calculo.ruta}` : clave.replace(/\./g, ' '));

  function formatearSegunTipo(valor: any): string {
    if (valor === undefined || valor === null) return '--';
    if (valor === '') return '';
    switch (tipoDato) {
      case 'fecha': {
        const d = new Date(valor);
        if (!isNaN(d.getTime())) return formatDate(String(valor));
        return String(valor);
      }
      case 'numero': {
        const n = Number(valor);
        if (!isNaN(n)) {
          if (formato) {
            try { return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); } catch { }
          }
          return String(n);
        }
        return String(valor);
      }
      case 'dinero': {
        const m = Number(valor);
        if (!isNaN(m)) return formatMoney(m);
        return String(valor);
      }
      default: {
        if (typeof valor === 'number') return formatMoney(valor);
        return String(valor);
      }
    }
  }

  const dinamico = calculo?.ruta
    ? agregarArray(calculo.tipo, resolverRuta(esquema, calculo.ruta))
    : resolverRuta(esquema, clave);
  if (dinamico === undefined || dinamico === null) return null;
  const v = Array.isArray(dinamico)
    ? dinamico.map((x: any) => String(x)).join(', ')
    : (calculo?.tipo === 'COUNT' && !tipoDato ? String(dinamico) : formatearSegunTipo(dinamico));
  if (v === '' || v === undefined) return null;

  if (mostrarLabel === false) {
    return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
  }

  if (tabular) {
    const tabAn = tabular.ancho ?? 12;
    if (fmtLabel || fmtValor) {
  const alineacion = fmtLabel?.alineacion || fmtValor?.alineacion || fmt?.alineacion;
      const fmtComb = { ...fmtLabel, ...fmtValor, ...fmt };
      if (alineacion) fmtComb.alineacion = alineacion;
      return aplicarFormatoTexto(fmtComb, lineaTabularConFormato(lbl, v, tabAn, fmtLabel || fmt, fmtValor), w);
    }
    return aplicarFormatoTexto(fmt, lineaTabularStr(lbl, v, tabAn), w);
  }

  if (fmtLabel || fmtValor) {
    let lblStr = lbl + ': ';
    if (fmtLabel?.negrita === true) lblStr = CMD_BOLD_ON + lblStr + CMD_BOLD_OFF;
    else if (fmtLabel?.negrita === false) lblStr = CMD_BOLD_OFF + lblStr;

    let valStr = v;
    if (fmtValor?.negrita === true) valStr = CMD_BOLD_ON + valStr + CMD_BOLD_OFF;
    else if (fmtValor?.negrita === false) valStr = CMD_BOLD_OFF + valStr;

    const texto = lblStr + valStr;
    const alineacion = fmtLabel?.alineacion || fmtValor?.alineacion || fmtOv?.alineacion;
    const fmtCombinado = { ...fmtLabel, ...fmtValor, ...fmtOv };
    if (alineacion) fmtCombinado.alineacion = alineacion;
    return aplicarFormatoTexto(fmtCombinado, texto, w);
  }

  if (fmt?.negrita === true || fmt?.negrita === false) {
    return aplicarFormatoTexto(fmt, lbl + ': ' + v, w);
  }
  const texto = CMD_BOLD_ON + lbl + CMD_BOLD_OFF + ': ' + v;
  return aplicarFormatoTexto(fmt, texto, w);
}

/** Emite una linea de cobro FPV por nombre, usando la misma logica de autofill que los totales. */
function emitirCobroFPVLinea(ctx: Ctx, nombre: string, data: any, cob: any, cfg: PlantillaConfig, width: number, linea: LineaZonaConfig, maxLabelLenCobros: number, maxValorLenCobros: number, zonaActualAlineacion: AlineacionTicket | undefined, fmtCombCobro?: FormatoItemTicket) {
  const crs = data.cobros || [];
  if (cob.mostrarCobros === false || crs.length === 0) return;
  const c = crs[0];
  const tieneTab = !!linea.tabular;
  const tabAn = linea.tabular?.ancho ?? 12;
  const lineaLbl = linea.label;
  const fmtOv = linea.formato;

  const mapa: Record<string, number> = {
    EFECTIVO: Number(c.efectivo) || 0,
    CHEQUE: Number(c.cheque) || 0,
    TARJETA_CREDITO: Number(c.tarjetaCredito) || 0,
    TARJETA_DEBITO: Number(c.tarjetaDebito) || 0,
    TRANSFERENCIA: Number(c.transferencia) || 0,
    BONO: Number(c.bono) || 0,
    TARJETA_REGALO: Number(c.tarjetaRegalo) || 0,
    NOTA_CREDITO: Number(c.notaCredito) || 0,
  };

  let monto: number;
  if (nombre === 'DEVUELTA') {
    monto = Number(c.devuelta) || 0;
    if (monto <= 0.01) return;
  } else {
    monto = mapa[nombre];
    if (monto <= 0) return;
  }

  const montoStr = formatMoney(monto);
  const label = lineaLbl || nombre.replace(/_/g, ' ');

  if (linea.mostrarLabel === false) {
    if (tieneTab) { lineaTabular(ctx, '', montoStr, tabAn, undefined, linea.formatoValor || fmtOv); ctx.p.push(LF); }
    else { _aplicarFmt(ctx, linea.formatoValor || fmtOv); ctx.p.push(montoStr + LF); _restaurarFmt(ctx, linea.formatoValor || fmtOv); }
    return;
  }

  if (tieneTab) {
      const anchoEtiqueta = Math.max(tabAn, maxLabelLenCobros + 2);
          const texto = right(label + ':', anchoEtiqueta) + right(montoStr, maxValorLenCobros);
    // Alineacion por linea: formatoLabel > formatoValor > formato > zona.
    const alineacion = linea.formatoLabel?.alineacion || linea.formatoValor?.alineacion || linea.formato?.alineacion || zonaActualAlineacion;
    if (alineacion === 'izquierda') {
      ctx.p.push(texto + LF);
    } else if (alineacion === 'centro') {
      ctx.p.push(centerVisible(texto, width, fmtCombCobro?.tamano) + LF);
    } else {
      ctx.p.push(rightVisible(texto, width, fmtCombCobro?.tamano) + LF);
    }
  } else {
    const texto = right(label, maxLabelLenCobros) + ':  ' + right(montoStr, maxValorLenCobros);
    const alineacion = linea.formatoLabel?.alineacion || linea.formatoValor?.alineacion || linea.formato?.alineacion || zonaActualAlineacion;
    if (alineacion === 'izquierda') {
      ctx.p.push(texto + LF);
    } else if (alineacion === 'centro') {
      ctx.p.push(centerVisible(texto, width, fmtCombCobro?.tamano) + LF);
    } else {
      // default: derecha (para totales)
      ctx.p.push(rightVisible(texto, width, fmtCombCobro?.tamano) + LF);
    }
  }
}

// ===== Recibo Ingreso (basado en zonas) =====

/**
 * Renderiza un campo estandar FRI con label editable y formato.
 * Los campos FRI usan espaciados fijos (NCF+9esp, FECHA+7esp, ENTIDAD+4esp, etc).
 */
function renderCampoFRI(
  clave: string, data: any,
  lblOv?: string,
  fmtOv?: FormatoItemTicket,
  width?: number,
  mostrarLabel?: boolean,
  fmtLabel?: FormatoItemTicket,  // NUEVO
  fmtValor?: FormatoItemTicket   // NUEVO
): string | null {
  const w = width ?? LINE_LENGTH;
  const fmt = fmtOv;

  // Labels por defecto FRI
  const defLabels: Record<string, string> = {
    NCF: 'NCF', FECHA: 'FECHA', TIPO: 'Tipo', CONCEPTO: 'Concepto',
    ENTIDAD: 'ENTIDAD', ENTIDAD_ID: 'ENTIDAD ID', NOTA: 'Nota',
    COMPANIA: 'Compañía', DIRECCION: 'Dirección', TELEFONO: 'Teléfono', RNC: 'RNC',
  };

  const lbl = (lblOv !== undefined && lblOv !== '' && lblOv !== defLabels[clave])
    ? lblOv : (defLabels[clave] || clave);

  switch (clave) {
    case 'COMPANIA': {
      const v = data.COMPANIA || '--';
      if (mostrarLabel === false) return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
      return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
    }
    case 'DIRECCION': {
      const v = data.DIRECCION;
      if (!v) return null;
      if (mostrarLabel === false) return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
      return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
    }
    case 'TELEFONO': {
      const v = data.TELEFONO;
      if (!v) return null;
      if (mostrarLabel === false) return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
      return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
    }
    case 'RNC': {
      const v = data.RNC;
      if (!v) return null;
      if (mostrarLabel === false) return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
      return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
    }
    case 'TITULO': {
      const v = data.TITULO || '--';
      if (!v || v === '--') return null;
      if (mostrarLabel === false) return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
      return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
    }
    case 'NCF':
      if (lblOv) return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, data.ncf || '--', w);
      return aplicarFormatoTexto(fmt, CMD_BOLD_ON + 'NCF' + CMD_BOLD_OFF + '         ' + (data.ncf || '--'), w);
    case 'FECHA':
      if (lblOv) return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, formatDate(data.fechaDocumento), w);
      return aplicarFormatoTexto(fmt, CMD_BOLD_ON + 'FECHA' + CMD_BOLD_OFF + '       ' + formatDate(data.fechaDocumento), w);
    case 'TIPO': {
      if (!(data.tipo?.codigo || data.tipo?.nombre)) return null;
      const texto = (data.tipo.codigo || '') + ' ' + (data.tipo.nombre || '');
      if (lblOv) return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, texto, w);
      return aplicarFormatoTexto(fmt, 'Tipo: ' + texto, w);
    }
    case 'CONCEPTO': {
      if (!data.concepto?.nombre) return null;
      if (lblOv) return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, data.concepto.nombre, w);
      return aplicarFormatoTexto(fmt, 'Concepto: ' + data.concepto.nombre, w);
    }
    case 'ENTIDAD': {
      const nombre = data.entidad?.nombre || data.entidad?.razonSocial || '\u2014';
      if (lblOv) return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, nombre, w);
      return aplicarFormatoTexto(fmt, CMD_BOLD_ON + 'ENTIDAD' + CMD_BOLD_OFF + '    ' + nombre, w);
    }
    case 'ENTIDAD_ID': {
      const id = data.entidad?.identificacion || data.entidad?.rnc || '';
      if (!id) return null;
      if (lblOv) return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, id, w);
      return aplicarFormatoTexto(fmt, '               ' + id, w);
    }
    case 'NOTA': {
      if (!data.nota) return null;
      if (lblOv) return lineSep('-', w) + LF + lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, data.nota, w);
      return lineSep('-', w) + LF + aplicarFormatoTexto(fmt, 'Nota: ' + data.nota, w);
    }
    case 'FECHA_IMPRESION': {
      const lbl = lblOv || 'Fecha imp.';
      const v = new Date().toLocaleString('es-DO');
      return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
    }
    case 'HORA_IMPRESION': {
      const lbl = lblOv || 'Hora imp.';
      const v = new Date().toLocaleTimeString('es-DO');
      return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
    }
    case 'NUM_DETALLES': {
      const lbl = lblOv || 'Transacc.';
      const v = String(data.transaccionesAsociadas?.length || 0);
      return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
    }
    default: return null;
  }
}

export function formatTicketReciboIngreso(data: any, company?: CompanyInfo, config?: PlantillaConfig): string {
  const cfg = normalizarConfigRI(aplicarExpresiones(config, data, company));
  const width = cfg.opciones?.anchoLinea ?? LINE_LENGTH;
  const zonas = cfg.zonas || [];
  const cob = cfg.cobros || {};
  const pie = config?.pie?.textoPie ?? cfg.pie?.textoPie ?? 'Gracias por su preferencia!';
  const companyName = company?.nombre || data?.sucursal?.nombre || 'SU EMPRESA';
  const tituloTexto = cfg.titulo?.texto || 'RECIBO DE INGRESO';
  const textosLibres = cfg.textosLibres || cfg.campos?.textosLibres;
  const camposDTO = cfg.camposDTO || cfg.campos?.camposDTO;
  const firmas = cfg.firmas;

  const ctx: Ctx = { p: [], w: width, al: 'left', bo: false, co: false, forceAl: false };
  ctx.p.push(CMD_INIT + CMD_NORMALIZAR);

  let maxLabelLenTotalesFRI = 0;
  let maxValorLenTotalesFRI = 0;

  data.COMPANIA = companyName;
  data.DIRECCION = company?.direccion || '';
  data.TELEFONO = company?.telefono || '';
  data.RNC = company?.rnc || '';
  data.FAX = company?.fax || '';
  data.SLOGAN = company?.slogan || '';
  data.TITULO = tituloTexto;

  function emitirLinea(linea: LineaZonaConfig, enGrupo?: boolean) {
    if (linea.ref === 'SEPARADOR') { _emitirSep(ctx, linea); return; }
    if (linea.ref === 'ESPACIO') { _emitirEspacio(ctx); return; }
    if (linea.ref.startsWith('LIBRE:') || linea.ref.startsWith('DTO:') || linea.ref.startsWith('FIRMA:')) {
      emitirItemEspecial(ctx.p, linea.ref, data, width, textosLibres, camposDTO, linea.tabular, linea.mismaLinea, firmas, linea, enGrupo);
      return;
    }

    const ref = linea.ref;
    const lblOv = linea.label;
    const fmtOv = linea.formato;
    const fmtLabel = linea.formatoLabel || linea.formato;  // hereda de formato si no hay específico de label
    const fmtValor = linea.formatoValor;                    // sin herencia, solo el específico de valor

    if (ref.startsWith('CAMPO:')) {
      const clave = ref.slice(6);

      switch (clave) {
        case 'CODIGO_QR': {
          const qrData = data.envioDGII?.codigoQR || data.codigoQR;
          if (qrData) {
            _aplicarFmt(ctx, fmtOv);
            ctx.p.push(escposQRCode(qrData));
            _restaurarFmt(ctx, fmtOv);
            ctx.p.push(CMD_INIT + CMD_NORMALIZAR); // Resetear impresora despues del QR
            ctx.al = 'left'; ctx.bo = false; ctx.co = false;
          }
          break;
        }
        default: {
          const render = renderCampoFRI(clave, data, lblOv, fmtOv, width, linea.mostrarLabel, fmtLabel, fmtValor);
          if (render) ctx.p.push(render);
          _restaurarFmt(ctx, fmtOv);
          break;
        }
      }
      return;
    }

    if (ref.startsWith('ESQUEMA:')) {
      const clave = ref.slice(8);
      const render = renderCampoEsquema(clave, cfg.esquema, lblOv, fmtOv, width, linea.tabular, linea.mostrarLabel, fmtLabel, fmtValor, linea.tipoDato, linea.formatoDato, linea.calculo);
      if (render) ctx.p.push(render);
      _restaurarFmt(ctx, fmtOv);
      return;
    }

    if (ref.startsWith('TOTAL:')) {
      const clave = ref.slice(6);
      const lineaLbl = linea.label;
      const tieneTab = !!linea.tabular;
      const tabAn = linea.tabular?.ancho ?? 12;
      const fmtSinAlineacion = tieneTab && fmtOv ? { ...fmtOv, alineacion: undefined } : fmtOv;
      _aplicarFmt(ctx, fmtSinAlineacion);
      switch (clave) {
        case 'TOTAL': {
          const labelDefault = 'Total';
          const lbl = lineaLbl || labelDefault;
          const monto = formatMoney(data.total);
          if (linea.mostrarLabel === false) {
            if (tieneTab) { lineaTabular(ctx, '', monto, tabAn, undefined, linea.formatoValor || fmtOv); ctx.p.push(LF); }
            else { _aplicarFmt(ctx, linea.formatoValor || fmtOv); ctx.p.push(monto + LF); _restaurarFmt(ctx, linea.formatoValor || fmtOv); }
          } else if (tieneTab) {
        const anchoEtiqueta = Math.max(tabAn, maxLabelLenTotalesFRI + 2);
          const texto = right(lbl + ':', anchoEtiqueta) + right(monto, maxValorLenTotalesFRI);
            const alineacion = linea.formatoLabel?.alineacion || linea.formato?.alineacion || fmtOv?.alineacion || zonaActualAlineacionFRI;
            if (alineacion === 'izquierda') {
              ctx.p.push(texto + LF);
            } else if (alineacion === 'centro') {
              ctx.p.push(centerVisible(texto, width, fmtSinAlineacion?.tamano) + LF);
            } else {
              ctx.p.push(rightVisible(texto, width - 2, fmtSinAlineacion?.tamano) + LF);
            }
          } else {
            const texto = right(lbl, maxLabelLenTotalesFRI) + ':  ' + right(monto, maxValorLenTotalesFRI);
            const alineacion = linea.formatoLabel?.alineacion || linea.formato?.alineacion || fmtOv?.alineacion || zonaActualAlineacionFRI;
            if (alineacion === 'izquierda') {
              ctx.p.push(texto + LF);
            } else if (alineacion === 'centro') {
              ctx.p.push(centerVisible(texto, width, fmtSinAlineacion?.tamano) + LF);
            } else {
              // default: derecha (para totales)
              ctx.p.push(rightVisible(texto, width - 2, fmtSinAlineacion?.tamano) + LF);
            }
          }
          break;
        }
      }
      _restaurarFmt(ctx, fmtSinAlineacion);
      return;
    }

    if (ref.startsWith('COBRO:')) {
      _aplicarFmt(ctx, fmtOv);
      const nombre = ref.slice(6);
      const crs = data.cobros || [];
      const cobFmt = cfg.cobros?.formato;
      if (cob.mostrarCobros !== false && crs.length > 0) {
        for (const c of crs) {
          const medio = (c.medioCobro || 'Pago').trim().toUpperCase();
          const monto = Number(c.monto) || 0;
          if (monto > 0 && (nombre === 'MEDIO_COBRO' || medio === nombre)) {
            if (cobFmt) {
              const { antes, despues } = comandosFormato(cobFmt);
              ctx.p.push(...antes);
              ctx.p.push(formatTotalLine(medio, formatMoney(monto), width) + LF);
              ctx.p.push(...despues);
            } else {
              ctx.p.push(formatTotalLine(medio, formatMoney(monto), width) + LF);
            }
          }
        }
      }
      return;
    }
  }

  function emitirLineasConBuffer(lineas: LineaZonaConfig[]) {
    if (lineas.some((l) => l.lineaNum !== undefined)) {
      renderLineasAgrupadas(lineas, width, ctx.p, emitirLinea);
      return;
    }
    const buffer: string[] = [];
    let idx = 0;
    while (idx < lineas.length) {
      const linea = lineas[idx];
      if (!linea.mismaLinea) {
        // Linea independiente: flush del buffer y emitir tal cual
        if (buffer.length > 0) { ctx.p.push(...buffer); buffer.length = 0; }
        emitirLinea(linea);
        idx++;
        continue;
      }
      // Grupo: corrida consecutiva de lineas mismaLinea. Se renderiza cada
      // campo para conocer su largo natural y reservar primero los campos
      // alineados a la derecha sin ancho fijo (ej: montos).
      const grupo: LineaZonaConfig[] = [];
      const limpios: string[] = [];
      let j = idx;
      while (j < lineas.length && lineas[j].mismaLinea) {
        const prevLen = ctx.p.length;
        emitirLinea(lineas[j], true);
        const nuevas = ctx.p.splice(prevLen);
        const limpio = nuevas.join('').replace(/\x1Ba[\x00-\x02]/g, '').replace(/\n/g, ' ');
        grupo.push(lineas[j]);
        limpios.push(limpio);
        j++;
      }
      const largos = limpios.map((t) => largoVisible(trimVisible(t)));
      const anchos = calcularAnchosGrupo(grupo, largos, width);
      for (let k = 0; k < grupo.length; k++) {
        if (anchos[k] === 0) continue;
        const lnGrupo = grupo[k];
        const sinFijo = !(lnGrupo.anchoCampo && lnGrupo.anchoCampo > 0) && !((lnGrupo.tabular?.ancho ?? 0) > 0);
        if (k === grupo.length - 1 && sinFijo && largoVisible(trimVisible(limpios[k])) > anchos[k]) {
          // Ultimo campo flexible que excede su espacio: se emite completo (la
          // impresora envuelve) en lugar de truncar el valor (ej: la hora).
          buffer.push(trimVisible(limpios[k]));
          continue;
        }
        buffer.push(padSegunAlineacion(trimVisible(limpios[k]), anchos[k], lnGrupo));
      }
      idx = j;
    }
    if (buffer.length > 0) {
      // La zona terminó en un grupo mismaLinea: cerrar la línea física
      ctx.p.push(...buffer);
      buffer.length = 0;
      ctx.p.push(LF);
    }
  }

  // C1: Pre-computar anchoFill compartido entre cabecera_grupo_detalle y detalle (FRI)
  // para garantizar que cabecera de columnas y datos queden alineados visualmente.
  const zonaCabFRI = zonas.find(z => z.tipo === 'cabecera_grupo_detalle');
  const zonaDetFRI = zonas.find(z => z.tipo === 'detalle');
  const todasDetFRI = [
    ...(zonaCabFRI?.lineas || []).filter(l => l.ref.startsWith('DETALLE:')),
    ...(zonaDetFRI?.lineas || []).filter(l => l.ref.startsWith('DETALLE:')),
  ];
  const hayTabularGlobalFRI = todasDetFRI.some(l => l.tabular);
  const anchoFillFRI = !hayTabularGlobalFRI && todasDetFRI.length > 0
    ? Math.floor(width / todasDetFRI.length)
    : 0;

  let zonaActualAlineacionFRI: AlineacionTicket | undefined;

  for (const zona of zonas) {
    switch (zona.tipo) {
      case 'encabezado_reporte':
      case 'pie_reporte':
        zonaActualAlineacionFRI = zona.alineacion;
        if (zona.alineacion) _al(ctx, zona.alineacion); else _al(ctx, 'izquierda');
        emitirLineasConBuffer(zona.lineas);
        _bo(ctx, false); _co(ctx, false);
        _al(ctx, 'izquierda');
        ctx.forceAl = true;
        break;
      case 'totales': {
        zonaActualAlineacionFRI = zona.alineacion;
        // Pre-calcular maxLabelLen y maxValorLen para alinear labels de totales (FRI)
        maxLabelLenTotalesFRI = 0;
        maxValorLenTotalesFRI = 0;
        for (const linea of zona.lineas) {
          if (linea.ref.startsWith('TOTAL:')) {
            const clave = linea.ref.slice(6);
            let labelDefault = clave;
            let valorTexto = '';
            switch (clave) {
              case 'TOTAL': labelDefault = 'Total'; valorTexto = formatMoney(Number(data.total) || 0); break;
            }
            const lbl = linea.label || labelDefault;
            if (lbl.length > maxLabelLenTotalesFRI) maxLabelLenTotalesFRI = lbl.length;
            if (valorTexto.length > maxValorLenTotalesFRI) maxValorLenTotalesFRI = valorTexto.length;
          }
        }
        if (zona.alineacion) _al(ctx, zona.alineacion); else _al(ctx, 'izquierda');
        emitirLineasConBuffer(zona.lineas);
        _bo(ctx, false); _co(ctx, false);
        _al(ctx, 'izquierda');
        ctx.forceAl = true;
        break;
      }
      case 'pie_detalle':
      case 'encabezado_pagina':
      case 'pie_pagina':
        zonaActualAlineacionFRI = zona.alineacion;
      if (zona.alineacion) _al(ctx, zona.alineacion); else _al(ctx, 'izquierda');
      emitirLineasConBuffer(zona.lineas);
      _bo(ctx, false); _co(ctx, false);
        _al(ctx, 'izquierda');
        ctx.forceAl = true;
        break;
      case 'cobros': {
        zonaActualAlineacionFRI = zona.alineacion;
        if (zona.alineacion) _al(ctx, zona.alineacion); else _al(ctx, 'izquierda');
        const tieneLineasCobro = zona.lineas.some((l) => l.ref.startsWith('COBRO:'));
        if (!tieneLineasCobro) {
          const crs = data.cobros || [];
        if (cob.mostrarCobros !== false && crs.length > 0) {
          const cobFmt = cfg.cobros?.formato;
          for (const c of crs) {
            const medio = (c.medioCobro || 'Pago').trim().toUpperCase();
            const monto = Number(c.monto) || 0;
            if (monto > 0) {
              if (cobFmt) {
                const { antes, despues } = comandosFormato(cobFmt);
                ctx.p.push(...antes);
                ctx.p.push(formatTotalLine(medio, formatMoney(monto), width) + LF);
                ctx.p.push(...despues);
              } else {
                ctx.p.push(formatTotalLine(medio, formatMoney(monto), width) + LF);
              }
            }
          }
          _bo(ctx, false); _co(ctx, false);
        }
        }
        emitirLineasConBuffer(zona.lineas);
        _bo(ctx, false); _co(ctx, false);
        _al(ctx, 'izquierda');
        ctx.forceAl = true;
        break;
      }
      case 'cabecera_grupo_detalle': {
        zonaActualAlineacionFRI = zona.alineacion;
        if (zona.alineacion) _al(ctx, zona.alineacion); else _al(ctx, 'izquierda');
        // Procesar líneas en orden: acumular DETALLE:* como cabecera de columnas
        // y emitir no-DETALLE (SEPARADOR, ESPACIO, etc.) en su posición real.
        const cabeceraPartsFRI: string[] = [];
        const flushCabFRI = () => {
          if (cabeceraPartsFRI.length > 0) {
            ctx.p.push(cabeceraPartsFRI.join('') + LF);
            cabeceraPartsFRI.length = 0;
          }
        };
        const anchosCabFRI = new Map<number, number>();
        if (zona.lineas.some((l) => l.lineaNum !== undefined)) {
          const numsCab = new Set<number>();
          zona.lineas.forEach((ln, i) => {
            if (!ln.ref.startsWith('DETALLE:') || ln.lineaNum === undefined || numsCab.has(ln.lineaNum)) return;
            numsCab.add(ln.lineaNum);
        calcularAnchosLinea(zona.lineas, ln.lineaNum, width, i).forEach((a, idx) => anchosCabFRI.set(idx, a));
          });
        }
        for (const linea of zona.lineas) {
          if (linea.ref.startsWith('DETALLE:')) {
            const idxLa = zona.lineas.indexOf(linea);
            const clave = linea.ref.slice(8);
            const label = linea.label || CAMPOS_DETALLE_RI_LABELS[clave] || clave;
            const anchoTabular = (anchosCabFRI.get(idxLa) ?? 0) || linea.tabular?.ancho || 0;
            const labelFmt = padSegunAlineacion(label, anchoTabular || width, linea);
            const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: undefined });
            cabeceraPartsFRI.push(antes.join('') + labelFmt + despues.join(''));
          } else {
            // No-DETALLE: flush cabecera acumulada primero, luego emitir línea
            flushCabFRI();
            emitirLinea(linea);
          }
        }
        flushCabFRI();
        _bo(ctx, false); _co(ctx, false);
        _al(ctx, 'izquierda');
        ctx.forceAl = true;
        break;
      }
      case 'detalle': {
          zonaActualAlineacionFRI = zona.alineacion;
          if (zona.alineacion) _al(ctx, zona.alineacion); else _al(ctx, 'izquierda');
          // Si la zona tiene arrayOrigen, iterar ese array dinámicamente.
          // Si no, usar data.transaccionesAsociadas (comportamiento por defecto).
          const transacciones = zona.arrayOrigen
            ? (resolverRuta(data, zona.arrayOrigen) as any[]) || generarDatosEjemploArray(zona)
            : (data.transaccionesAsociadas || []);
          let anchoAcumDetFRI = 0;
          for (const doc of transacciones) {
            const bufferLinea: string[] = [];
            // Pre-render de textos y pre-calculo de anchos por grupo:
            // los campos derecha sin ancho fijo reservan su largo natural primero.
            const textosDet = new Map<number, string>();
            zona.lineas.forEach((ln, idxLn) => {
              if (!ln.ref.startsWith('DETALLE:')) return;
              const clave = ln.ref.slice(8);
              const valor = renderDetalleCampoFRI(clave, doc);
              textosDet.set(idxLn, ln.mostrarLabel !== false
                ? (ln.label || CAMPOS_DETALLE_RI_LABELS[clave] || clave) + ': ' + valor
                : valor);
            });
            const anchosPorIdx = new Map<number, number>();
            const conteoDet = new Map<number, number>();
            const usaModeloDetalle = zona.lineas.some((l) => l.lineaNum !== undefined);
            if (usaModeloDetalle) {
              zona.lineas.forEach((ln) => {
                if (!ln.ref.startsWith('DETALLE:') || ln.lineaNum === undefined) return;
                conteoDet.set(ln.lineaNum, (conteoDet.get(ln.lineaNum) ?? 0) + 1);
              });
              const numsDet = new Set<number>();
              zona.lineas.forEach((ln, idxLn) => {
                if (!ln.ref.startsWith('DETALLE:') || ln.lineaNum === undefined || numsDet.has(ln.lineaNum)) return;
                numsDet.add(ln.lineaNum);
        calcularAnchosLinea(zona.lineas, ln.lineaNum, width, idxLn).forEach((ancho, i) => anchosPorIdx.set(i, ancho));
              });
            } else {
              let gi = 0;
              while (gi < zona.lineas.length) {
                if (!zona.lineas[gi].ref.startsWith('DETALLE:') || !zona.lineas[gi].mismaLinea) { gi++; continue; }
                let gj = gi;
                const gLineas: LineaZonaConfig[] = [];
                const gLargos: number[] = [];
                while (gj < zona.lineas.length && zona.lineas[gj].ref.startsWith('DETALLE:') && zona.lineas[gj].mismaLinea) {
                  gLineas.push(zona.lineas[gj]);
                  gLargos.push(largoVisible(trimVisible(textosDet.get(gj) ?? '')));
                  gj++;
                }
                const anchosG = calcularAnchosGrupo(gLineas, gLargos, width);
                for (let k = 0; k < gLineas.length; k++) anchosPorIdx.set(gi + k, anchosG[k]);
                gi = gj;
              }
            }
            for (let li = 0; li < zona.lineas.length; li++) {
              const linea = zona.lineas[li];
            if (li > 0 && linea.lineaNum !== zona.lineas[li - 1].lineaNum && bufferLinea.length > 0) {
              ctx.p.push(...bufferLinea, LF);
              bufferLinea.length = 0;
            }
              if (!linea.ref.startsWith('DETALLE:')) {
                if (bufferLinea.length > 0) { ctx.p.push(...bufferLinea, LF); bufferLinea.length = 0; }
                anchoAcumDetFRI = 0;
                emitirLinea(linea);
                continue;
              }
              const texto = textosDet.get(li) ?? '';
              const esColumnaModelo = linea.lineaNum !== undefined;
              if (linea.mismaLinea || esColumnaModelo) {
                const anchoCampo = anchosPorIdx.get(li) ?? 0;
                if (anchoCampo === 0) continue;
                const textoTrim = trimVisible(texto);
                const textoPad = padSegunAlineacion(textoTrim, anchoCampo, linea);
                const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: undefined });
                bufferLinea.push(antes.join('') + textoPad + despues.join(''));
              } else {
                if (bufferLinea.length > 0) { ctx.p.push(...bufferLinea, LF); bufferLinea.length = 0; }
                anchoAcumDetFRI = 0;
                const al = linea.formato?.alineacion;
                // Respetar tabular.ancho en lineas DETALLE individuales
                // (mismo criterio que la cabecera de columnas).
                const anchoDestino = linea.tabular?.ancho && linea.tabular.ancho > 0
                  ? Math.min(linea.tabular.ancho, width)
                  : width;
                const textoPad = padSegunAlineacion(texto, anchoDestino, linea);
                const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: undefined });
                ctx.p.push(antes.join('') + textoPad + despues.join(''), LF);
              }
            }
            if (bufferLinea.length > 0) { ctx.p.push(...bufferLinea, LF, CMD_J + '\x08'); }
            anchoAcumDetFRI = 0;
          }
          break;
      }
      case 'banda': {
        zonaActualAlineacionFRI = zona.alineacion;
        if (zona.alineacion) _al(ctx, zona.alineacion); else _al(ctx, 'izquierda');
        emitirLineasConBuffer(zona.lineas);
        _bo(ctx, false); _co(ctx, false);
        _al(ctx, 'izquierda');
        ctx.forceAl = true;
        break;
      }
    }
  }

  ctx.p.push(LF);
  return ctx.p.join('');
}

/**
 * Renderiza un campo estandar VSNT (voucher Visanet) con label editable y formato.
 * Reproduce los campos del voucher: ID_COMERCIO, TIPO_OP, FECHA, ISSUER, TRANS,
 * AUTORIZACION, TOTAL y RESULTADO, ademas de los campos comunes COMPANIA/SUCURSAL
 * y FECHA/HORA de impresion.
 */
function renderCampoVSNT(
  clave: string, data: any,
  lblOv?: string,
  fmtOv?: FormatoItemTicket,
  width?: number,
  mostrarLabel?: boolean,
  fmtLabel?: FormatoItemTicket,
  fmtValor?: FormatoItemTicket,
): string | null {
  const w = width ?? 42;
  const fmt = fmtOv;
  const lbl = (lblOv !== undefined && lblOv !== '' && lblOv !== CAMPOS_TICKET_LABELS_VSNT[clave])
    ? lblOv : (CAMPOS_TICKET_LABELS_VSNT[clave] || clave);

  function val(): string {
    switch (clave) {
      case 'COMPANIA': return data.COMPANIA || data.sucursal?.nombre || '--';
      case 'SUCURSAL': return data.sucursalName || data.sucursal?.nombre || '';
      case 'DIRECCION': return data.DIRECCION || '';
      case 'TELEFONO': return data.TELEFONO || '';
      case 'RNC': return data.RNC || '';
      case 'FAX': return data.FAX || '';
      case 'SLOGAN': return data.SLOGAN || '';
      case 'ID_COMERCIO': return data.merchantId || '000000167391001';
      case 'TIPO_OP': return data.subsidioLabel || 'VENTA';
      case 'FECHA': return formatFechaHoraCorta(data.transactionDate);
      case 'ISSUER': return data.issuerName || '';
      case 'TRANS': return data.tokenECR || '';
      case 'AUTORIZACION': return data.autorizacion || '';
      case 'TOTAL': return (data.simMoneda || 'RD$') + ' ' + (Number(data.montoPesos) || 0).toFixed(2);
      case 'RESULTADO': return data.exitoso ? 'APROBADA' : 'RECHAZADA';
      case 'FECHA_IMPRESION': return new Date().toLocaleString('es-DO');
      case 'HORA_IMPRESION': return new Date().toLocaleTimeString('es-DO');
      default: break;
    }
    // Campo dinámico del esquema importado (ej: CAMPO:authorization,
    // CAMPO:acquirers.batchNumber): resolver la clave como ruta sobre los datos.
    // Arrays aplanados se unen con coma; objetos sin representación → '--'.
    const dinamico = resolverRuta(data, clave) ?? resolverRuta(data, clave.toLowerCase());
    if (dinamico === undefined || dinamico === null) return '--';
    if (dinamico === '') return '';
    if (Array.isArray(dinamico)) {
      // Valores crudos (IDs/códigos suelen venir como números): sin formato dinero
      return dinamico.map((v: any) => String(v)).join(', ');
    }
    if (typeof dinamico === 'object') return '--';
    if (typeof dinamico === 'number') return formatMoney(dinamico);
    return String(dinamico);
  }

  const v = val();
  if (v === '' || v === undefined) return null;

  if (mostrarLabel === false) {
    return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
  }

  if (fmtLabel || fmtValor) {
    let lblStr = lbl + ': ';
    if (fmtLabel?.negrita === true) lblStr = CMD_BOLD_ON + lblStr + CMD_BOLD_OFF;
    else if (fmtLabel?.negrita === false) lblStr = CMD_BOLD_OFF + lblStr;

    let valStr = v;
    if (fmtValor?.negrita === true) valStr = CMD_BOLD_ON + valStr + CMD_BOLD_OFF;
    else if (fmtValor?.negrita === false) valStr = CMD_BOLD_OFF + valStr;

    const texto = lblStr + valStr;
    const alineacion = fmtLabel?.alineacion || fmtValor?.alineacion || fmtOv?.alineacion;
    const fmtCombinado = { ...fmtLabel, ...fmtValor, ...fmtOv };
    if (alineacion) fmtCombinado.alineacion = alineacion;
    return aplicarFormatoTexto(fmtCombinado, texto, w);
  }

  if (fmt?.negrita === true || fmt?.negrita === false) {
    return aplicarFormatoTexto(fmt, lbl + ': ' + v, w);
  }
  const texto = CMD_BOLD_ON + lbl + CMD_BOLD_OFF + ': ' + v;
  return aplicarFormatoTexto(fmt, texto, w);
}

/**
 * Formato hardcodeado del voucher Visanet (regresion cero).
 * Replica EXACTAMENTE la salida de `generarTicketVoucher` de VisanetTest: mismo
 * orden de lineas, mismos comandos ESC/POS y el separador de 42 guiones literal.
 */
function formatoVoucherHardcoded(data: any, company?: CompanyInfo): string {
  const companyName = company?.nombre || data?.sucursal?.nombre || 'SOLUGEN S.R.L.';
  const sucursalName = data?.sucursalName || '';
  const fecha = formatFechaCorta(data?.transactionDate) || '';
  const lines = [
    '\x1B\x40',                          // Init
    '\x1B\x61\x01',                      // Center
    '\x1B\x21\x10',                      // Double
    companyName,
    '\x1B\x21\x00',                      // Normal
    sucursalName,
    ...(company?.direccion ? [company.direccion] : []),
    ...(company?.telefono ? [company.telefono] : []),
    ...(company?.rnc ? [company.rnc] : []),
    '------------------------------------------',
    'ID: ' + (data?.merchantId || '000000167391001'),
    '\x1B\x45\x01',                      // Bold
    data?.subsidioLabel || 'VENTA',
    '\x1B\x45\x00',                      // Bold off
    '------------------------------------------',
    '\x1B\x61\x00',                      // Left
    'FECHA: ' + fecha,
    data?.issuerName || '',
    'Trans # ' + (data?.tokenECR || ''),
    'Autorizacion #: ' + (data?.autorizacion || ''),
    '------------------------------------------',
    '\x1B\x61\x01',                      // Center
    '\x1B\x21\x10',                      // Double
    'Total: ' + (data?.simMoneda || 'RD$') + ' ' + (Number(data?.montoPesos) || 0).toFixed(2),
    '\x1B\x21\x00',
    '\n',
    data?.exitoso ? 'APROBADA' : 'RECHAZADA',
    '\x1D\x56\x41\x03',                  // Cut con feed 3
  ];
  return lines.join('\n') + '\n';
}

/**
 * Formato configurable del voucher Visanet (basado en zonas).
 * Recorre las zonas de la config normalizada (todas encabezado_reporte) y emite
 * los campos VSNT con sus labels y formatos editables.
 */
function formatoVoucherZonas(data: any, company: CompanyInfo | undefined, cfg: PlantillaConfig, width: number): string {
  const zonas = cfg.zonas || [];
  const textosLibres = cfg.textosLibres || cfg.campos?.textosLibres;
  const camposDTO = cfg.camposDTO || cfg.campos?.camposDTO;
  const firmas = cfg.firmas;

  const ctx: Ctx = { p: [], w: width, al: 'left', bo: false, co: false, forceAl: false };
  ctx.p.push(CMD_INIT);

  data.COMPANIA = company?.nombre || data?.sucursal?.nombre || 'SOLUGEN S.R.L.';
  data.DIRECCION = company?.direccion || '';
  data.TELEFONO = company?.telefono || '';
  data.RNC = company?.rnc || '';
  data.FAX = company?.fax || '';
  data.SLOGAN = company?.slogan || '';

  // Fila actual al iterar una zona de detalle con arrayOrigen (ej: acquirers.data)
  let filaActual: Record<string, any> | null = null;

  function emitirLinea(linea: LineaZonaConfig, enGrupo?: boolean) {
    if (linea.ref === 'SEPARADOR') { _emitirSep(ctx, linea); return; }
    if (linea.ref === 'ESPACIO') { _emitirEspacio(ctx); return; }
    if (linea.ref.startsWith('LIBRE:') || linea.ref.startsWith('DTO:') || linea.ref.startsWith('FIRMA:')) {
      emitirItemEspecial(ctx.p, linea.ref, data, width, textosLibres, camposDTO, linea.tabular, linea.mismaLinea, firmas, linea, enGrupo);
      return;
    }
    if (linea.ref.startsWith('CAMPO:')) {
      const clave = linea.ref.slice(6);
      const render = renderCampoVSNT(clave, data, linea.label, linea.formato, width, linea.mostrarLabel, linea.formatoLabel || linea.formato, linea.formatoValor);
      if (render) ctx.p.push(render);
      _restaurarFmt(ctx, linea.formato);
      return;
    }
    if (linea.ref.startsWith('ESQUEMA:')) {
      const clave = linea.ref.slice(8);
      const render = renderCampoEsquema(clave, cfg.esquema, linea.label, linea.formato, width, linea.tabular, linea.mostrarLabel, linea.formatoLabel || linea.formato, linea.formatoValor, linea.tipoDato, linea.formatoDato, linea.calculo);
      if (render) ctx.p.push(render);
      _restaurarFmt(ctx, linea.formato);
      return;
    }
    if (linea.ref.startsWith('DETALLE:')) {
      // Fila de zona detalle (arrayOrigen): valor resuelto de la fila actual
      const clave = linea.ref.slice(8);
      const valor = renderDetalleCampo(clave, filaActual ?? {});
      const texto = linea.mostrarLabel !== false
        ? (linea.label || clave) + ': ' + valor
        : valor;
      const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: undefined });
      ctx.p.push(antes.join('') + texto + despues.join(''), LF);
      return;
    }
  }

  // Emite las lineas acumulando en buffer las marcadas con `mismaLinea` para que
  // se impriman en la misma linea fisica del ticket.
  function emitirLineasConBuffer(lineas: LineaZonaConfig[]) {
    if (lineas.some((l) => l.lineaNum !== undefined)) {
      renderLineasAgrupadas(lineas, width, ctx.p, emitirLinea);
      return;
    }
    const buffer: string[] = [];
    let idx = 0;
    while (idx < lineas.length) {
      const linea = lineas[idx];
      if (!linea.mismaLinea) {
        // Linea independiente: flush del buffer y emitir tal cual
        if (buffer.length > 0) { ctx.p.push(...buffer); buffer.length = 0; }
        emitirLinea(linea);
        idx++;
        continue;
      }
      // Grupo: corrida consecutiva de lineas mismaLinea. Se renderiza cada
      // campo para conocer su largo natural y reservar primero los campos
      // alineados a la derecha sin ancho fijo (ej: montos).
      const grupo: LineaZonaConfig[] = [];
      const limpios: string[] = [];
      let j = idx;
      while (j < lineas.length && lineas[j].mismaLinea) {
        const prevLen = ctx.p.length;
        emitirLinea(lineas[j], true);
        const nuevas = ctx.p.splice(prevLen);
        const limpio = nuevas.join('').replace(/\x1Ba[\x00-\x02]/g, '').replace(/\n/g, ' ');
        grupo.push(lineas[j]);
        limpios.push(limpio);
        j++;
      }
      const largos = limpios.map((t) => largoVisible(trimVisible(t)));
      const anchos = calcularAnchosGrupo(grupo, largos, width);
      for (let k = 0; k < grupo.length; k++) {
        if (anchos[k] === 0) continue;
        const lnGrupo = grupo[k];
        const sinFijo = !(lnGrupo.anchoCampo && lnGrupo.anchoCampo > 0) && !((lnGrupo.tabular?.ancho ?? 0) > 0);
        if (k === grupo.length - 1 && sinFijo && largoVisible(trimVisible(limpios[k])) > anchos[k]) {
          // Ultimo campo flexible que excede su espacio: se emite completo (la
          // impresora envuelve) en lugar de truncar el valor (ej: la hora).
          buffer.push(trimVisible(limpios[k]));
          continue;
        }
        buffer.push(padSegunAlineacion(trimVisible(limpios[k]), anchos[k], lnGrupo));
      }
      idx = j;
    }
    if (buffer.length > 0) {
      // La zona terminó en un grupo mismaLinea: cerrar la línea física
      ctx.p.push(...buffer);
      buffer.length = 0;
      ctx.p.push(LF);
    }
  }

  let zonaActualAlineacion: AlineacionTicket | undefined;

  for (const zona of zonas) {
    zonaActualAlineacion = zona.alineacion;
    if (zona.alineacion) _al(ctx, zona.alineacion); else _al(ctx, 'izquierda');
    if (zona.tipo === 'detalle' && zona.arrayOrigen) {
      // Zona de detalle: iterar el arrayOrigen (ej: 'acquirers.data', con
      // aplanado de arrays anidados) y renderizar las líneas por fila.
      const filas = (resolverRuta(data, zona.arrayOrigen) as any[]) || generarDatosEjemploArray(zona);
      for (const fila of filas) {
        filaActual = fila ?? {};
        emitirLineasConBuffer(zona.lineas);
      }
      filaActual = null;
    } else {
      emitirLineasConBuffer(zona.lineas);
    }
    _bo(ctx, false); _co(ctx, false);
    _al(ctx, 'izquierda');
    ctx.forceAl = true;
  }

  ctx.p.push(LF);
  return ctx.p.join('');
}

/**
 * Formateador del voucher Visanet.
 * - Sin config guardada: salida IDENTICA al hardcode de `generarTicketVoucher`
 *   (regresion cero), incluido el corte \x1D\x56\x41\x03.
 * - Con config: recorre las zonas normalizadas contra el default VSNT (ancho 42,
 *   pie vacio, feed de corte 3) y agrega feed + corte al final.
 */
export function formatTicketVoucherVisanet(data: any, company?: CompanyInfo, config?: PlantillaConfig): string {
  const cfg = normalizarConfigVSNT(aplicarExpresiones(config, data, company));
  const width = cfg.opciones?.anchoLinea ?? 42;

  if (!config) {
    return formatoVoucherHardcoded(data, company);
  }

  const body = formatoVoucherZonas(data, company, cfg, width);
  const feedCorte = cfg.opciones?.feedCorte ?? 3;
  return body + feed(feedCorte) + CMD_CUT;
}

/**
 * Genera comando ESC/POS para imprimir un código QR.
 * Compatible con impresoras Epson y clones (2C-POS80-01).
 */
export function escposQRCode(qrData: string): string {
  const dataBytes = new TextEncoder().encode(qrData);

  const parts: string[] = [];

  // GS ( k — Modelo 2 (estándar QR)
  // pL pH cn fn n1 n2...
  parts.push('\x1D\x28\x6B\x04\x00\x31\x41\x32\x00');

  // GS ( k — Tamaño fijo del módulo QR (no automático)
  // cn=49 ('1'), fn=69 ('E'), m=6 (rango 1-16). 6 dots ≈ 0.75mm por módulo:
  // QR más compacto que entra completo en cámara/escáner.
  parts.push('\x1D\x28\x6B\x03\x00\x31\x45\x06');

  // Error correction level L (7%) — maxima facilidad de escaneo.
  // n DEBE ser 48-51 ('0'=L, '1'=M, '2'=Q, '3'=H) segun especificacion Epson.
  // El valor 0x04 previo era invalido: varios firmwares de clones no lo rechazan
  // y generan un simbolo que parece QR pero no decodifica.
  parts.push('\x1D\x28\x6B\x03\x00\x31\x43\x30');

  // Store QR data — chunked en bloques de max 124 bytes para que pL <= 127.
  // Sin chunking, aBytesImpresora (printTicket.js) corrompe pL > 127 al
  // convertir bytes no-ASCII a caracteres ASCII, rompiendo el comando GS ( k.
  const MAX_CHUNK = 124; // len = 124 + 3 = 127 → pL = 0x7F (seguro)
  for (let offset = 0; offset < dataBytes.length; offset += MAX_CHUNK) {
    const chunk = dataBytes.slice(offset, Math.min(offset + MAX_CHUNK, dataBytes.length));
    const len = chunk.length + 3;
    const pL = len & 0xFF;
    const pH = (len >> 8) & 0xFF;
    parts.push('\x1D\x28\x6B' + String.fromCharCode(pL) + String.fromCharCode(pH) + '\x31\x50\x30');
    // Convertir chunk binario a string preservando bytes
    let chunkStr = '';
    for (let i = 0; i < chunk.length; i++) chunkStr += String.fromCharCode(chunk[i]);
    parts.push(chunkStr);
  }

  // Print QR code
  parts.push('\x1D\x28\x6B\x03\x00\x31\x51\x30');

  return parts.join('');
}

/**
 * Genera comando ESC/POS para imprimir un código de barras (GS k, renderizado por la impresora).
 * Usa CODE128 (m=73) con subset B automático; compatible con impresoras Epson y clones (2C-POS80-01).
 */
/**
 * Genera comando ESC/POS para imprimir un código de barras EAN-13 (GS k, renderizado por la impresora).
 * EAN-13 requiere exactamente 12 o 13 dígitos numéricos (13 = 12 + dígito verificador calculado automáticamente).
 * Si se envían 12 dígitos, la impresora calcula el check digit automáticamente.
 * Compatible con impresoras Epson y clones (2C-POS80-01).
 */
/**
 * Genera comando ESC/POS para imprimir un código de barras (GS k, renderizado por la impresora).
 * Usa CODE128 (m=73) con subset B automático; compatible con impresoras Epson y clones (2C-POS80-01).
 */
/**
 * Genera comando ESC/POS para imprimir un código de barras (GS k, renderizado por la impresora).
 * Soporta CODE128 (m=73) y EAN-13 (m=2).
 * Compatible con impresoras Epson y clones (2C-POS80-01).
 */
export function escposBarcode(barcodeData: string, heightPx: number = 100, tipo: 'CODE' | 'CODE128' | 'EAN13' = 'CODE128'): string {
  const clean = barcodeData.trim();
  if (!clean) return '';

  // Normalizar 'CODE' a 'CODE128'
  const tipoFinal = (tipo === 'CODE' ? 'CODE128' : tipo) as 'CODE128' | 'EAN13';

  // === Validaciones específicas por tipo ===
  if (tipoFinal === 'EAN13') {
    if (!/^\d+$/.test(clean)) {
      console.warn(`[escposBarcode] EAN-13 requiere solo dígitos, recibido: "${clean}". Saltando barcode.`);
      return '';
    }
    if (clean.length !== 12 && clean.length !== 13) {
      console.warn(`[escposBarcode] EAN-13 requiere 12 o 13 dígitos, recibido ${clean.length}: "${clean}". Saltando barcode.`);
      return '';
    }
  }

  const parts: string[] = [];

  // GS h n — altura del código de barras en puntos
  parts.push('\x1D\x68' + String.fromCharCode(Math.max(1, Math.min(255, heightPx))));

  // GS w n — ancho del módulo dinámico para que el barcode ocupe todo el ancho.
  if (tipoFinal === 'CODE128') {
    // CODE39 (usado como reemplazo de CODE128 por compatibilidad):
    // Cada carácter = 15 módulos + 1 gap = 16 módulos. Start/Stop (*) = 2 chars extra.
    const printableWidth = 576; // 80mm = 576 dots estándar
    const totalChars = clean.length + 2; // +2 por start/stop (*)
    const modules = 16 * totalChars;
    const moduleWidth = Math.min(6, Math.max(2, Math.floor(printableWidth / modules)));
    parts.push('\x1D\x77' + String.fromCharCode(moduleWidth));
  } else {
    // EAN-13: ~95 módulos de ancho. Para 80mm (576 dots), moduleWidth = 6 maximiza el papel.
    parts.push('\x1D\x77' + String.fromCharCode(6));
  }

  // GS H n — texto HRI debajo del código (2 = imprimir debajo).
  parts.push('\x1D\x48\x02');

  // Centrado
  parts.push(CMD_ALIGN_CENTER); // ESC a 1

  if (tipoFinal === 'CODE128') {
    // GS k m d1...dk NUL — CODE39 Function B (m=69) con datos en mayúsculas.
    // CODE39 es el formato universal: lo leen TODOS los scanners y TODAS las impresoras.
    // Solo acepta A-Z, 0-9, y caracteres especiales (- . $ / + % SPACE).
    // Function B de Epson para CODE128 (m=73) es notoriamente problemática en clones;
    // CODE39 Function B (m=69) funciona en toda impresora ESC/POS.
    const code39Data = clean.toUpperCase().replace(/[^A-Z0-9\-\.\$\/\+\%\ ]/g, '');
    if (!code39Data) {
      console.warn(`[escposBarcode] CODE39 requiere A-Z, 0-9. Datos "${clean}" no son válidos.`);
      return '';
    }
    parts.push('\x1D\x6B\x45'); // GS k 69 = CODE39 Function B
    parts.push(code39Data);
    parts.push('\x00'); // NUL terminator
  } else {
    // EAN-13: GS k 2 (Function A). Si 12 dígitos, la impresora calcula el check digit.
    // Si 13 dígitos, verificar check digit y enviar solo 12 si es válido.
    let dataToSend = clean;
    if (clean.length === 13) {
      const digits = clean.split('').map(Number);
      const checkDigit = digits.pop()!;
      const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
      const expectedCheck = (10 - (sum % 10)) % 10;
      if (checkDigit !== expectedCheck) {
        console.warn(`[escposBarcode] EAN-13 check digit inválido: recibido ${checkDigit}, esperado ${expectedCheck}. Usando solo los primeros 12 dígitos.`);
      }
      dataToSend = clean.substring(0, 12);
    }
    parts.push('\x1D\x6B\x02'); // GS k 2 = EAN-13 (Function A)
    parts.push(dataToSend);
    parts.push('\x00'); // NUL terminator
  }

  return parts.join('');
}

/**
 * Dispatcher generico: selecciona el formatter correcto segun el tipo de plantilla.
 * Cada tipo de plantilla tipa su propio DTO de entrada; los 3 formatters internos
 * quedan intactos (regresion cero).
 */
export function formatTicket(
  data: FacturaPOSDTO,
  company: CompanyInfo | undefined,
  config: PlantillaConfig | undefined,
  tipoDoc: 'TICKET_POS',
): string;
export function formatTicket(
  data: ReciboIngresoFullDTO,
  company: CompanyInfo | undefined,
  config: PlantillaConfig | undefined,
  tipoDoc: 'TICKET_RI',
): string;
export function formatTicket(
  data: VisanetVoucherInputDTO,
  company: CompanyInfo | undefined,
  config: PlantillaConfig | undefined,
  tipoDoc: 'TICKET_VSNT',
): string;
export function formatTicket(
  data: NotaCreditoFullDTO,
  company: CompanyInfo | undefined,
  config: PlantillaConfig | undefined,
  tipoDoc: 'TICKET_NC',
): string;
export function formatTicket(
  data: TurnoDTO,
  company: CompanyInfo | undefined,
  config: PlantillaConfig | undefined,
  tipoDoc: 'TICKET_TC',
): string;
export function formatTicket(
  data: any,
  company: CompanyInfo | undefined,
  config: PlantillaConfig | undefined,
  tipoDoc: string,
): string;
export function formatTicket(
  data: any,
  company: CompanyInfo | undefined,
  config: PlantillaConfig | undefined,
  tipoDoc: string,
): string {
  switch (tipoDoc) {
    case 'TICKET_POS':
      return formatTicketPOS(data, company, config);
    case 'TICKET_RI':
      return formatTicketReciboIngreso(data, company, config);
    case 'TICKET_VSNT':
      return formatTicketVoucherVisanet(data, company, config);
    case 'TICKET_NC':
      return formatTicketNotaCredito(data, company, config);
    case 'TICKET_TC':
      return formatTicketCierreTurno(data, company, config);
    default:
      return formatTicketPOS(data, company, config);
  }
}

/**
 * Ticket térmico para Nota de Crédito. Reutiliza el motor de zonas de
 * formatTicketPOS (mismos refs CAMPO:/DETALLE:/TOTAL:/SEPARADOR/ESPACIO).
 * Normaliza el shape NC (entidad, detallesMovimiento) al shape FPV (cliente, detalles)
 * antes de delegar. Se pasa una copia porque formatTicketPOS inyecta campos de
 * compañía sobre el objeto data.
 */
function formatTicketNotaCredito(
  data: NotaCreditoFullDTO,
  company?: CompanyInfo,
  config?: PlantillaConfig,
): string {
  const ticketData = {
    ...data,
    cliente: data.entidad,
    detalles: data.detalles || data.detallesMovimiento || [],
  };
  return formatTicketPOS(ticketData as any, company, config);
}

/**
 * Ticket térmico de cierre de turno. Reutiliza el motor de zonas de
 * formatTicketPOS (mismos refs CAMPO:/TOTAL:/DTO:/COBRO:/SEPARADOR/ESPACIO).
 * Normaliza el shape del turno al shape FPV: mapea campos estándar (TURNO,
 * CAJERO, CAJA, FECHA/HORA) y expone agregados de cobros (cobrado, porCobrar,
 * devuelta) consumibles via DTO:<id> en la plantilla. Se pasa una copia porque
 * formatTicketPOS inyecta campos de compañía sobre el objeto data.
 */
function formatTicketCierreTurno(
  data: TurnoDTO,
  company?: CompanyInfo,
  config?: PlantillaConfig,
): string {
  const agregados = agregarCobrosTurno(data.cobros, data.total ?? 0);
  const ticketData: any = {
    ...data,
    cajero: data.usuario?.nombre || '--',
    caja: data.nombrePOS || '--',
    turno: data.noTurno || '--',
    estado: data.cerrado ? 'CERRADO' : 'ABIERTO',
    fechaDocumento: data.fechaCierre || data.fechaApertura,
    detalles: [],
    cobros: agregados.cobros,
    cobrado: agregados.cobrado,
    porCobrar: agregados.porCobrar,
    devuelta: agregados.devuelta,
  };
  return formatTicketPOS(ticketData, company, config);
}

/** Agrega los cobros del turno en un solo elemento y calcula cobrado / porCobrar / devuelta. */
function agregarCobrosTurno(
  cobros: CobroDTO[] | undefined,
  total: number,
): { cobros: [CobroDTO]; cobrado: number; porCobrar: number; devuelta: number } {
  const acc = (cobros || []).reduce(
    (a: CobroDTO, c: CobroDTO) => ({
      efectivo: a.efectivo + (c.efectivo || 0),
      cheque: a.cheque + (c.cheque || 0),
      transferencia: a.transferencia + (c.transferencia || 0),
      tarjetaCredito: a.tarjetaCredito + (c.tarjetaCredito || 0),
      tarjetaDebito: a.tarjetaDebito + (c.tarjetaDebito || 0),
      bono: a.bono + (c.bono || 0),
      tarjetaRegalo: a.tarjetaRegalo + (c.tarjetaRegalo || 0),
      notaCredito: a.notaCredito + (c.notaCredito || 0),
      pago: a.pago + (c.pago || 0),
      devuelta: a.devuelta + (c.devuelta || 0),
      facturaID: 0,
    }),
    { efectivo: 0, cheque: 0, transferencia: 0, tarjetaCredito: 0, tarjetaDebito: 0, bono: 0, tarjetaRegalo: 0, notaCredito: 0, pago: 0, devuelta: 0, facturaID: 0 },
  );
  const cobrado = acc.efectivo + acc.cheque + acc.transferencia +
    acc.tarjetaCredito + acc.tarjetaDebito + acc.bono +
    acc.tarjetaRegalo + acc.notaCredito;
  return {
    cobros: [acc],
    cobrado,
    porCobrar: Math.max(0, Number(total) - cobrado),
    devuelta: acc.devuelta,
  };
}
