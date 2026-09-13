/**
 * Motor de expresiones para plantillas de impresion (tickets ESC/POS).
 *
 * Permite que el disenador de plantillas (ReportesConfig) incluya valores
 * dinamicos dentro de cualquier texto libre usando la sintaxis `{expresion}`.
 * Ejemplos:
 *   "Cierre de Turno {noTurno}"
 *   "Total efectivo: {MONEY(SUM(cobros.efectivo))}"
 *   "{IF({total} > 0, {total}, 0)}"            (los {} internos no: usar sin anidar llaves)
 *   "{COUNT(facturas)} documentos"
 *   "{IF(estado <> 'Aplicado', UPPER(estado), '')}"
 *
 * Diseno:
 * - Parser recursivo descendente propio. NO usa eval() ni Function(): la lista
 *   de funciones es una whitelist cerrada (seguridad).
 * - Resolucion de campos por cadena de ambitos: item iterado (SUMIF/COUNTIF)
 *   -> data -> company -> config. Los campos se buscan exactos y luego
 *   case-insensitive.
 * - Propagacion de nulos: aritmetica o comparacion con null produce null/false.
 *   El operador & y CONCAT tratan null como '' para construir etiquetas.
 * - Comparaciones de texto son case-insensitive ({estado} = 'aplicado' funciona).
 * - Retrocompatibilidad total: un texto sin `{...}` (o con llaves cuyo contenido
 *   no parsea) se deja literal, sin cambios.
 *
 * Este archivo se compila tambien hacia Solugen.Impresion.Service/node via
 * tsconfig.print.json: el servicio de impresion evalua EXACTAMENTE el mismo
 * motor que la vista previa del frontend.
 */

// ===== Tipos publicos =====

/** Contexto de datos contra el que se resuelven los campos. */
export interface ContextoDatos {
  /** DTO del documento (turno, factura, recibo...). Primer ambito de busqueda. */
  data?: any;
  /** Datos de la compania (nombre, direccion, telefono, rnc, fax, slogan). */
  company?: any;
  /** La propia plantilla (permite referenciar otras partes de la config). */
  config?: any;
}

export interface ResultadoValidacion {
  ok: boolean;
  error?: string;
}

export interface FuncionInfo {
  nombre: string;
  firma: string;
  descripcion: string;
}

// ===== Tokenizer =====

type TipoToken = 'num' | 'str' | 'id' | 'op';
interface Token { t: TipoToken; v: string; }

const OPS_DOBLES = ['>=', '<=', '<>', '==', '!='];
const OPS_SIMPLES = '=<>+-*/%&(),';

const ES_LETRA = (c: string): boolean => /[A-Za-z_\u00C0-\u00FF]/.test(c);
const ES_DIGITO = (c: string): boolean => c >= '0' && c <= '9';

function tokenizar(src: string): Token[] {
  const toks: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { i++; continue; }

    if (ES_DIGITO(c) || (c === '.' && ES_DIGITO(src[i + 1]))) {
      let j = i + 1;
      while (j < src.length && (ES_DIGITO(src[j]) || src[j] === '.')) j++;
      toks.push({ t: 'num', v: src.slice(i, j) });
      i = j;
      continue;
    }

    if (c === "'") {
      let j = i + 1;
      let cerrado = false;
      while (j < src.length) {
        if (src[j] === "'") { cerrado = true; break; }
        j++;
      }
      if (!cerrado) throw new Error("Cadena sin cerrar (falta comilla simple).");
      toks.push({ t: 'str', v: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }

    if (ES_LETRA(c)) {
      let j = i + 1;
      while (j < src.length && (ES_LETRA(src[j]) || ES_DIGITO(src[j]) || src[j] === '_')) j++;
      toks.push({ t: 'id', v: src.slice(i, j) });
      i = j;
      continue;
    }

    const dos = src.slice(i, i + 2);
    if (OPS_DOBLES.includes(dos)) { toks.push({ t: 'op', v: dos }); i += 2; continue; }
    if (OPS_SIMPLES.includes(c)) { toks.push({ t: 'op', v: c }); i += 1; continue; }

    throw new Error(`Caracter no valido en expresion: '${c}'.`);
  }
  return toks;
}

// ===== AST =====

type Nodo =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 'campo'; segs: string[] }
  | { k: 'fun'; nombre: string; args: Nodo[] }
  | { k: 'bin'; op: string; l: Nodo; r: Nodo }
  | { k: 'neg'; e: Nodo };

const RESERVADAS = new Set(['AND', 'OR', 'NOT']);

// ===== Parser =====

class Parser {
  private toks: Token[];
  private pos = 0;

  constructor(src: string) {
    this.toks = tokenizar(src);
  }

  private ver(): Token | undefined { return this.toks[this.pos]; }
  private avanzar(): Token {
    const t = this.toks[this.pos];
    if (!t) throw new Error('Expresion incompleta.');
    this.pos++;
    return t;
  }
  private esOp(v: string): boolean {
    const t = this.ver();
    return !!t && t.t === 'op' && t.v === v;
  }
  private comerOp(v: string): boolean {
    if (this.esOp(v)) { this.pos++; return true; }
    return false;
  }
  private esReservada(nombre: string): boolean {
    const t = this.ver();
    return !!t && t.t === 'id' && t.v.toUpperCase() === nombre;
  }

  parsear(): Nodo {
    const n = this.expr();
    if (this.pos < this.toks.length) throw new Error(`Token inesperado al final: '${this.ver()?.v}'.`);
    return n;
  }

  private expr(): Nodo { return this.o(); }

  private o(): Nodo {
    let l = this.y();
    while (this.esReservada('OR')) {
      this.avanzar();
      l = { k: 'fun', nombre: 'OR', args: [l, this.y()] };
    }
    return l;
  }

  private y(): Nodo {
    let l = this.no();
    while (this.esReservada('AND')) {
      this.avanzar();
      l = { k: 'fun', nombre: 'AND', args: [l, this.no()] };
    }
    return l;
  }

  private no(): Nodo {
    if (this.esReservada('NOT')) {
      this.avanzar();
      return { k: 'fun', nombre: 'NOT', args: [this.no()] };
    }
    return this.cmp();
  }

  private cmp(): Nodo {
    const l = this.add();
    const t = this.ver();
    if (t && t.t === 'op' && ['=', '==', '<>', '!=', '>', '<', '>=', '<='].includes(t.v)) {
      this.avanzar();
      const op = t.v === '==' ? '=' : t.v === '!=' ? '<>' : t.v;
      return { k: 'bin', op, l, r: this.add() };
    }
    return l;
  }

  private add(): Nodo {
    let l = this.mul();
    for (;;) {
      if (this.esOp('+')) { this.avanzar(); l = { k: 'bin', op: '+', l, r: this.mul() }; }
      else if (this.esOp('-')) { this.avanzar(); l = { k: 'bin', op: '-', l, r: this.mul() }; }
      else if (this.esOp('&')) { this.avanzar(); l = { k: 'bin', op: '&', l, r: this.mul() }; }
      else return l;
    }
  }

  private mul(): Nodo {
    let l = this.unario();
    for (;;) {
      if (this.esOp('*')) { this.avanzar(); l = { k: 'bin', op: '*', l, r: this.unario() }; }
      else if (this.esOp('/')) { this.avanzar(); l = { k: 'bin', op: '/', l, r: this.unario() }; }
      else if (this.esOp('%')) { this.avanzar(); l = { k: 'bin', op: '%', l, r: this.unario() }; }
      else return l;
    }
  }

  private unario(): Nodo {
    if (this.esOp('-')) { this.avanzar(); return { k: 'neg', e: this.unario() }; }
    if (this.esOp('+')) { this.avanzar(); return this.unario(); }
    return this.primario();
  }

  private primario(): Nodo {
    const t = this.ver();
    if (!t) throw new Error('Se esperaba un valor.');

    if (t.t === 'num') { this.avanzar(); return { k: 'num', v: Number(t.v) }; }
    if (t.t === 'str') { this.avanzar(); return { k: 'str', v: t.v }; }

    if (t.t === 'op' && t.v === '(') {
      this.avanzar();
      const n = this.expr();
      if (!this.comerOp(')')) throw new Error("Falta ')' de cierre.");
      return n;
    }

    if (t.t === 'id') {
      if (RESERVADAS.has(t.v.toUpperCase())) throw new Error(`Palabra reservada mal ubicada: ${t.v}.`);
      const segs = [this.avanzar().v];
      while (this.esOp('.')) {
        this.avanzar();
        const nt = this.ver();
        if (!nt || nt.t !== 'id') throw new Error("Se esperaba un campo despues de '.'.");
        segs.push(this.avanzar().v);
      }
      if (this.esOp('(')) {
        if (segs.length > 1) throw new Error(`Funcion desconocida: ${segs.join('.')}.`);
        const nombre = segs[0].toUpperCase();
        if (!(nombre in FUNCIONES)) throw new Error(`Funcion desconocida o no permitida: ${nombre}.`);
        this.avanzar();
        const args: Nodo[] = [];
        if (!this.esOp(')')) {
          for (;;) {
            args.push(this.expr());
            if (this.comerOp(',')) continue;
            break;
          }
        }
        if (!this.comerOp(')')) throw new Error(`Falta ')' que cierra ${nombre}(...).`);
        return { k: 'fun', nombre, args };
      }
      return { k: 'campo', segs };
    }

    throw new Error(`Token inesperado: '${t.v}'.`);
  }
}

// ===== Utilidades de valores =====

function aNumero(v: any): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const limpio = v.trim().replace(/,/g, '');
    if (limpio === '') return null;
    const n = Number(limpio);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === 'boolean') return v ? 1 : 0;
  return null;
}

function esVacio(v: any): boolean {
  return v === null || v === undefined || v === '';
}

function aTextoInterno(v: any): string {
  if (esVacio(v)) return '';
  if (typeof v === 'boolean') return v ? 'SI' : 'NO';
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return String(v);
    return new Intl.NumberFormat('es-DO', { maximumFractionDigits: 2 }).format(v);
  }
  if (v instanceof Date) return formatearFecha(v, 'dd/MM/yyyy');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** Parsea fechas en los formatos del sistema: yyyyMMddHHmmss, yyyyMMdd, ISO y dd/MM/yyyy. */
function aFecha(v: any): Date | null {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (s === '') return null;

  let m = /^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?$/.exec(s); // yyyyMMdd[HHmm[ss]]
  if (m) {
    return new Date(
      Number(m[1]), Number(m[2]) - 1, Number(m[3]),
      Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0),
    );
  }
  m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s); // ISO
  if (m) {
    return new Date(
      Number(m[1]), Number(m[2]) - 1, Number(m[3]),
      Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0),
    );
  }
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?(?:\s*(am|pm))?$/i.exec(s); // dd/MM/yyyy
  if (m) {
    let h = Number(m[4] ?? 0);
    const pm = (m[6] || '').toLowerCase() === 'pm';
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), h, Number(m[5] ?? 0));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatearFecha(f: Date, patron: string): string {
  const pad = (n: number, l = 2) => String(n).padStart(l, '0');
  const h24 = f.getHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const tt = h24 < 12 ? 'am' : 'pm';
  return patron
    .replace(/yyyy/gi, String(f.getFullYear()))
    .replace(/yy/gi, pad(f.getFullYear() % 100))
    .replace(/MM/g, pad(f.getMonth() + 1))
    .replace(/dd/gi, pad(f.getDate()))
    .replace(/HH/g, pad(h24))
    .replace(/hh/g, pad(h12))
    .replace(/mm/g, pad(f.getMinutes()))
    .replace(/ss/gi, pad(f.getSeconds()))
    .replace(/tt/gi, tt);
}

function formatoMoneda(n: number): string {
  return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatoConPatron(v: any, patron: string): string {
  const p = patron.trim().toUpperCase();
  const mN = /^N(\d)$/.exec(p);
  if (mN) {
    const n = aNumero(v);
    return n === null ? '' : new Intl.NumberFormat('es-DO', { minimumFractionDigits: Number(mN[1]), maximumFractionDigits: Number(mN[1]) }).format(n);
  }
  if (p === 'C2') {
    const n = aNumero(v);
    return n === null ? '' : `RD$ ${formatoMoneda(n)}`;
  }
  const mP = /^P(\d)$/.exec(p);
  if (mP) {
    const n = aNumero(v);
    return n === null ? '' : `${(n * 100).toFixed(Number(mP[1]))}%`;
  }
  return aTextoInterno(v);
}

const UNIDADES_TIEMPO_MS: Record<string, number> = {
  SEGUNDO: 1000, SEGUNDOS: 1000, SEG: 1000, S: 1000,
  MINUTO: 60000, MINUTOS: 60000, MIN: 60000,
  HORA: 3600000, HORAS: 3600000, H: 3600000,
  DIA: 86400000, DIAS: 86400000, D: 86400000,
};

function unidadNormalizada(u: any): string {
  return String(u ?? '').trim().toUpperCase();
}

// ===== Evaluador =====

interface Ambito { raices: any[]; item?: any; }

function obtenerRuta(obj: any, segs: string[]): any {
  let cur = obj;
  for (const seg of segs) {
    if (cur === null || cur === undefined) return undefined;
    if (cur[seg] !== undefined) { cur = cur[seg]; continue; }
    // Fallback case-insensitive (permite {ESTADO} sobre campo 'estado').
    const clave = Object.keys(cur).find(k => k.toLowerCase() === seg.toLowerCase());
    if (clave === undefined) return undefined;
    cur = cur[clave];
  }
  return cur;
}

function resolverCampo(nodo: Nodo, amb: Ambito): any {
  if (nodo.k !== 'campo') return undefined;
  if (amb.item !== undefined && amb.item !== null) {
    const v = obtenerRuta(amb.item, nodo.segs);
    if (v !== undefined) return v;
  }
  return resolverRaices(nodo.segs, amb.raices);
}

function resolverRaices(segs: string[], raices: any[]): any {
  for (const r of raices) {
    if (r === null || r === undefined) continue;
    const v = obtenerRuta(r, segs);
    if (v !== undefined) return v;
  }
  return undefined;
}

function verdad(v: any): boolean {
  if (esVacio(v)) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.toUpperCase() !== 'F';
  return true;
}

function comparar(op: string, a: any, b: any): any {
  if (op === '=' ) {
    if (esVacio(a) && esVacio(b)) return true;
    if (esVacio(a) || esVacio(b)) return false;
  } else if (esVacio(a) || esVacio(b)) {
    return false;
  }
  const na = aNumero(a);
  const nb = aNumero(b);
  let cmpNum: number | null = null;
  if (na !== null && nb !== null) cmpNum = na - nb;
  let res: boolean;
  if (cmpNum !== null) {
    res = op === '=' ? cmpNum === 0 : op === '<>' ? cmpNum !== 0 : op === '>' ? cmpNum > 0 : op === '<' ? cmpNum < 0 : op === '>=' ? cmpNum >= 0 : cmpNum <= 0;
  } else {
    const sa = String(a).toLowerCase();
    const sb = String(b).toLowerCase();
    res = op === '=' ? sa === sb : op === '<>' ? sa !== sb : op === '>' ? sa > sb : op === '<' ? sa < sb : op === '>=' ? sa >= sb : sa <= sb;
  }
  return res;
}

function recorrerItems(nodo: Nodo, amb: Ambito): any[] | null {
  // Acepta {k:'campo'} (lista por ruta) u otra expresion que evalue a array.
  if (nodo.k === 'campo') {
    const arr = nodo.segs.length > 1 && amb.item != null
      ? obtenerRuta(amb.item, nodo.segs)
      : undefined;
    const directo = arr !== undefined ? arr : resolverCampo(nodo, amb);
    return Array.isArray(directo) ? directo : null;
  }
  const v = evaluar(nodo, amb);
  return Array.isArray(v) ? v : null;
}

function valoresCampo(items: any[], nodo: Nodo): any[] {
  if (nodo.k !== 'campo' || nodo.segs.length < 2) return items;
  const resto = nodo.segs.slice(1);
  return items.map(it => obtenerRuta(it, resto));
}

function evaluar(n: Nodo, amb: Ambito): any {
  switch (n.k) {
    case 'num': return n.v;
    case 'str': return n.v;
    case 'campo': return resolverCampo(n, amb);
    case 'neg': {
      const x = aNumero(evaluar(n.e, amb));
      return x === null ? null : -x;
    }
    case 'bin': return evaluarBin(n.op, n.l, n.r, amb);
    case 'fun': return evaluarFun(n.nombre, n.args, amb);
  }
}

function evaluarBin(op: string, ln: Nodo, rn: Nodo, amb: Ambito): any {
  if (op === '&' || op === '+') {
    const a = evaluar(ln, amb);
    const b = evaluar(rn, amb);
    if (op === '&') return aTextoInterno(a) + aTextoInterno(b);
    // '+': suma numerica si ambos lo son; si alguno es texto, concatena.
    const na = aNumero(a);
    const nb = aNumero(b);
    if (na !== null && nb !== null) return na + nb;
    if (typeof a === 'string' || typeof b === 'string') return aTextoInterno(a) + aTextoInterno(b);
    return null;
  }
  const a = evaluar(ln, amb);
  const b = evaluar(rn, amb);
  if (['=', '<>', '>', '<', '>=', '<='].includes(op)) return comparar(op, a, b);

  const na = aNumero(a);
  const nb = aNumero(b);
  if (na === null || nb === null) return null;
  switch (op) {
    case '-': return na - nb;
    case '*': return na * nb;
    case '/': return nb === 0 ? null : na / nb;
    case '%': return nb === 0 ? null : na % nb;
  }
  return null;
}

function evaluarFun(nombre: string, args: Nodo[], amb: Ambito): any {
  const impl = FUNCIONES[nombre];
  if (!impl) throw new Error(`Funcion desconocida: ${nombre}.`);

  // Agregadas: primer argumento es una LISTA (ruta a array).
  if (nombre === 'SUM' || nombre === 'AVG' || nombre === 'MIN' || nombre === 'MAX') {
    if (args.length < 1) throw new Error(`${nombre} requiere la lista.campo a procesar.`);
    const items = recorrerItems(args[0], amb);
    if (!items) return null;
    const vals = valoresCampo(items, args[0])
      .map(aNumero)
      .filter((x): x is number => x !== null);
    if (vals.length === 0) return nombre === 'SUM' || nombre === 'AVG' ? 0 : null;
    if (nombre === 'SUM') return vals.reduce((a, b) => a + b, 0);
    if (nombre === 'AVG') return vals.reduce((a, b) => a + b, 0) / vals.length;
    if (nombre === 'MIN') return Math.min(...vals);
    return Math.max(...vals);
  }

  if (nombre === 'SUMIF') {
    if (args.length < 2) throw new Error('SUMIF requiere lista.campo y condicion.');
    const items = recorrerItems(args[0], amb);
    if (!items) return 0;
    let acc = 0;
    for (const it of items) {
      if (verdad(evaluar(args[1], { ...amb, item: it }))) {
        const v = args[0].k === 'campo' && args[0].segs.length >= 2
          ? aNumero(obtenerRuta(it, args[0].segs.slice(1)))
          : aNumero(it);
        if (v !== null) acc += v;
      }
    }
    return acc;
  }

  if (nombre === 'COUNT') {
    if (args.length < 1) throw new Error('COUNT requiere la lista a contar.');
    const items = recorrerItems(args[0], amb);
    return items ? items.length : 0;
  }

  if (nombre === 'COUNTIF') {
    if (args.length < 2) throw new Error('COUNTIF requiere la lista y la condicion.');
    const items = recorrerItems(args[0], amb);
    if (!items) return 0;
    return items.filter(it => verdad(evaluar(args[1], { ...amb, item: it }))).length;
  }

  const v = args.map(a => evaluar(a, amb));

  switch (nombre) {
    case 'IF':
    case 'IIF':
      return verdad(v[0]) ? v[1] : v[2] !== undefined ? v[2] : null;
    case 'SWITCH': {
      for (let i = 0; i + 1 < v.length; i += 2) {
        if (comparar('=', v[0], v[i + 1]) === true) return v[i + 2];
      }
      return v.length % 2 === 1 ? v[v.length - 1] : null;
    }
    case 'AND': return v.every(verdad);
    case 'OR': return v.some(verdad);
    case 'NOT': return !verdad(v[0]);
    case 'ABS': { const n = aNumero(v[0]); return n === null ? null : Math.abs(n); }
    case 'ROUND': {
      const n = aNumero(v[0]);
      if (n === null) return null;
      const d = v.length > 1 ? (aNumero(v[1]) ?? 2) : 2;
      const f = Math.pow(10, d);
      return Math.round((n + Number.EPSILON) * f) / f;
    }
    case 'CEILING': { const n = aNumero(v[0]); return n === null ? null : Math.ceil(n); }
    case 'FLOOR': { const n = aNumero(v[0]); return n === null ? null : Math.floor(n); }
    case 'MOD': {
      const a = aNumero(v[0]); const b = aNumero(v[1]);
      if (a === null || b === null || b === 0) return null;
      return a % b;
    }
    case 'CONCAT': return v.map(aTextoInterno).join('');
    case 'UPPER': return esVacio(v[0]) ? v[0] : String(v[0]).toUpperCase();
    case 'LOWER': return esVacio(v[0]) ? v[0] : String(v[0]).toLowerCase();
    case 'LEN': return aTextoInterno(v[0]).length;
    case 'TRIM': return aTextoInterno(v[0]).trim();
    case 'SUBSTRING': {
      const t = aTextoInterno(v[0]);
      const ini = Math.max(1, aNumero(v[1]) ?? 1);
      const largo = v.length > 2 ? (aNumero(v[2]) ?? t.length) : t.length;
      return t.slice(ini - 1, ini - 1 + Math.max(0, largo));
    }
    case 'REPLACE': return aTextoInterno(v[0]).split(aTextoInterno(v[1])).join(aTextoInterno(v[2]));
    case 'LEFT': { const t = aTextoInterno(v[0]); const n = aNumero(v[1]) ?? 0; return t.slice(0, Math.max(0, n)); }
    case 'RIGHT': { const t = aTextoInterno(v[0]); const n = aNumero(v[1]) ?? 0; return n <= 0 ? '' : t.slice(-Math.trunc(n)); }
    case 'YEAR': { const f = aFecha(v[0]); return f ? f.getFullYear() : null; }
    case 'MONTH': { const f = aFecha(v[0]); return f ? f.getMonth() + 1 : null; }
    case 'DAY': { const f = aFecha(v[0]); return f ? f.getDate() : null; }
    case 'HOUR': { const f = aFecha(v[0]); return f ? f.getHours() : null; }
    case 'MINUTE': { const f = aFecha(v[0]); return f ? f.getMinutes() : null; }
    case 'DATEDIFF': {
      const u = unidadNormalizada(v[0]);
      const f1 = aFecha(v[1]); const f2 = aFecha(v[2]);
      if (!f1 || !f2) return null;
      if (u === 'MESES' || u === 'MES') return (f2.getFullYear() - f1.getFullYear()) * 12 + (f2.getMonth() - f1.getMonth());
      if (['ANIOS', 'AÑOS', 'YEAR', 'YEARS'].includes(u)) return f2.getFullYear() - f1.getFullYear();
      const ms = UNIDADES_TIEMPO_MS[u];
      if (!ms) return null;
      return Math.round((f2.getTime() - f1.getTime()) / ms);
    }
    case 'DATEADD': {
      const u = unidadNormalizada(v[0]);
      const n = aNumero(v[1]);
      const f = aFecha(v[2]);
      if (!n || !f) return f ?? null;
      const r = new Date(f.getTime());
      if (u === 'MESES' || u === 'MES') { r.setMonth(r.getMonth() + Math.trunc(n)); return r; }
      if (u === 'ANIOS' || u === 'AÑOS' || u === 'YEAR' || u === 'YEARS') { r.setFullYear(r.getFullYear() + Math.trunc(n)); return r; }
      const ms = UNIDADES_TIEMPO_MS[u];
      if (!ms) return null;
      return new Date(r.getTime() + n * ms);
    }
    case 'NOW': return new Date();
    case 'TODAY': { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
    case 'FORMATDATE': {
      const f = aFecha(v[0]);
      return f ? formatearFecha(f, v.length > 1 && !esVacio(v[1]) ? String(v[1]) : 'dd/MM/yyyy') : '';
    }
    case 'ISNULL': return esVacio(v[0]);
    case 'COALESCE': return v.find(x => !esVacio(x)) ?? null;
    case 'TONUMBER': return aNumero(v[0]);
    case 'TOTEXT': return aTextoInterno(v[0]);
    case 'MONEY': { const n = aNumero(v[0]); return n === null ? '' : formatoMoneda(n); }
    case 'FORMAT': return formatoConPatron(v[0], aTextoInterno(v.length > 1 ? v[1] : ''));
  }
  return null;
}

// ===== Whitelist de funciones (con metadatos para el panel de ayuda) =====

interface FuncionDef { firma: string; descripcion: string; }

const FUNCIONES: Record<string, FuncionDef> = {
  // Agregadas (sobre listas)
  SUM:     { firma: 'SUM(lista.campo)', descripcion: 'Sumatoria de un campo sobre toda la lista.' },
  SUMIF:   { firma: 'SUMIF(lista.campo, condicion)', descripcion: 'Suma solo los elementos que cumplen la condicion.' },
  COUNT:   { firma: 'COUNT(lista)', descripcion: 'Cantidad de elementos de la lista.' },
  COUNTIF: { firma: 'COUNTIF(lista, condicion)', descripcion: 'Cantidad de elementos que cumplen la condicion.' },
  AVG:     { firma: 'AVG(lista.campo)', descripcion: 'Promedio del campo sobre la lista.' },
  MIN:     { firma: 'MIN(lista.campo)', descripcion: 'Valor minimo del campo.' },
  MAX:     { firma: 'MAX(lista.campo)', descripcion: 'Valor maximo del campo.' },
  // Condicionales
  IF:      { firma: 'IF(cond, valorSi, valorNo)', descripcion: 'Condicional. Alias: IIF.' },
  IIF:     { firma: 'IIF(cond, valorSi, valorNo)', descripcion: 'Alias de IF.' },
  SWITCH:  { firma: 'SWITCH(valor, caso1, resultado1, ..., default)', descripcion: 'Multiples casos con resultado opcional por defecto.' },
  AND:     { firma: 'AND(a, b, ...)', descripcion: 'Verdadero si TODOS los argumentos son verdaderos.' },
  OR:      { firma: 'OR(a, b, ...)', descripcion: 'Verdadero si ALGUNO es verdadero.' },
  NOT:     { firma: 'NOT(a)', descripcion: 'Negacion logica.' },
  // Matematicas
  ABS:     { firma: 'ABS(x)', descripcion: 'Valor absoluto.' },
  ROUND:   { firma: 'ROUND(x, decimales=2)', descripcion: 'Redondeo a N decimales (default 2).' },
  CEILING: { firma: 'CEILING(x)', descripcion: 'Redondeo hacia arriba.' },
  FLOOR:   { firma: 'FLOOR(x)', descripcion: 'Redondeo hacia abajo.' },
  MOD:     { firma: 'MOD(a, b)', descripcion: 'Residuo de la division.' },
  // Texto
  CONCAT:  { firma: 'CONCAT(a, b, ...)', descripcion: 'Une textos (ignora vacios). Tambien con el operador &' },
  UPPER:   { firma: 'UPPER(texto)', descripcion: 'Mayusculas.' },
  LOWER:   { firma: 'LOWER(texto)', descripcion: 'Minusculas.' },
  LEN:     { firma: 'LEN(texto)', descripcion: 'Longitud del texto.' },
  TRIM:    { firma: 'TRIM(texto)', descripcion: 'Quita espacios de los extremos.' },
  SUBSTRING: { firma: 'SUBSTRING(texto, inicio, largo)', descripcion: 'Subcadena. Posicion inicial 1-based.' },
  REPLACE: { firma: 'REPLACE(texto, buscar, reemplazo)', descripcion: 'Reemplaza todas las apariciones.' },
  LEFT:    { firma: 'LEFT(texto, n)', descripcion: 'Primeros n caracteres.' },
  RIGHT:   { firma: 'RIGHT(texto, n)', descripcion: 'Ultimos n caracteres.' },
  // Fechas
  YEAR:    { firma: 'YEAR(fecha)', descripcion: 'Anio de la fecha.' },
  MONTH:   { firma: 'MONTH(fecha)', descripcion: 'Mes (1-12).' },
  DAY:     { firma: 'DAY(fecha)', descripcion: 'Dia del mes.' },
  HOUR:    { firma: 'HOUR(fecha)', descripcion: 'Hora (0-23).' },
  MINUTE:  { firma: 'MINUTE(fecha)', descripcion: 'Minuto (0-59).' },
  DATEDIFF:{ firma: 'DATEDIFF(unidad, fecha1, fecha2)', descripcion: 'fecha2 - fecha1 en DIAS/HORAS/MINUTOS/SEGUNDOS/MESES/ANIOS.' },
  DATEADD: { firma: 'DATEADD(unidad, cantidad, fecha)', descripcion: 'Suma tiempo a la fecha.' },
  NOW:     { firma: 'NOW()', descripcion: 'Fecha y hora actual.' },
  TODAY:   { firma: 'TODAY()', descripcion: 'Fecha de hoy (sin hora).' },
  FORMATDATE: { firma: 'FORMATDATE(fecha, patron)', descripcion: "Formato personalizado. Patron default 'dd/MM/yyyy'." },
  // Nulos y conversion
  ISNULL:  { firma: 'ISNULL(valor)', descripcion: 'Verdadero si es nulo o vacio.' },
  COALESCE:{ firma: 'COALESCE(a, b, ...)', descripcion: 'Primer valor no vacio.' },
  TONUMBER:{ firma: 'TONUMBER(texto)', descripcion: 'Convierte texto a numero (null si no aplica).' },
  TOTEXT:  { firma: 'TOTEXT(valor)', descripcion: 'Convierte cualquier valor a texto.' },
  MONEY:   { firma: 'MONEY(numero)', descripcion: 'Formato moneda con 2 decimales (1,234.56).' },
  FORMAT:  { firma: 'FORMAT(valor, patron)', descripcion: "Patrones: N0-N3 numeros, C2 moneda RD$, P0-P2 porcentaje." },
};

// ===== API publica =====

/** Valida sintaxis y whitelist de una expresion (sin evaluarla contra datos). */
export function validarExpresion(expr: string): ResultadoValidacion {
  try {
    new Parser(expr).parsear();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Expresion invalida.' };
  }
}

/** Evalua una expresion contra el contexto de datos dado. */
export function evaluarExpresion(expr: string, ctx: ContextoDatos): any {
  const ast = new Parser(expr).parsear();
  return evaluar(ast, { raices: [ctx.data, ctx.company, ctx.config] });
}

/**
 * Reemplaza cada `{expresion}` del texto por su valor evaluado.
 * Si una expresion no parsea, el fragmento se deja literal (retrocompatibilidad).
 */
export function evaluarTexto(texto: string, ctx: ContextoDatos): string {
  if (!texto || typeof texto !== 'string' || !texto.includes('{')) return texto;
  const raices = [ctx.data, ctx.company, ctx.config];
  let out = '';
  let i = 0;
  while (i < texto.length) {
    const a = texto.indexOf('{', i);
    if (a < 0) { out += texto.slice(i); break; }
    const b = texto.indexOf('}', a + 1);
    if (b < 0) { out += texto.slice(i); break; }
    const inner = texto.slice(a + 1, b);
    try {
      const ast = new Parser(inner).parsear();
      out += aTextoInterno(evaluar(ast, { raices }));
    } catch {
      out += texto.slice(a, b + 1); // literal: no era una expresion valida
    }
    i = b + 1;
  }
  return out;
}

/**
 * Recorre un objeto/arreglo (como PlantillaConfig) y evalua las expresiones
 * `{...}` contenidas en cada valor de tipo string. Devuelve una copia nueva;
 * si nada cambia devuelve la referencia original.
 */
export function evaluarObjeto<T>(obj: T, ctx: ContextoDatos, profundidad = 0): T {
  if (obj === null || obj === undefined || profundidad > 20) return obj;
  if (typeof obj === 'string') {
    return (obj.includes('{') ? evaluarTexto(obj, ctx) : obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    let cambio = false;
    const r = obj.map(x => {
      const nx = evaluarObjeto(x, ctx, profundidad + 1);
      if (nx !== x) cambio = true;
      return nx;
    });
    return (cambio ? r : obj) as unknown as T;
  }
  if (typeof obj === 'object') {
    let cambio = false;
    const r: Record<string, any> = {};
    for (const [k, val] of Object.entries(obj as Record<string, any>)) {
      const nv = evaluarObjeto(val, ctx, profundidad + 1);
      if (nv !== val) cambio = true;
      r[k] = nv;
    }
    return (cambio ? r : obj) as unknown as T;
  }
  return obj;
}

export interface ErrorExpresion { expr: string; error: string; }

/**
 * Valida todas las expresiones `{...}` encontradas en los strings de una
 * configuracion (para el panel del disenador). Solo valida sintaxis/whitelist,
 * no requiere datos.
 */
export function validarExpresionesDeConfig(obj: any, profundidad = 0): ErrorExpresion[] {
  const errores: ErrorExpresion[] = [];
  const visitar = (nodo: any, prof: number) => {
    if (nodo === null || nodo === undefined || prof > 20) return;
    if (typeof nodo === 'string') {
      if (!nodo.includes('{')) return;
      let i = 0;
      while (i < nodo.length) {
        const a = nodo.indexOf('{', i);
        if (a < 0) break;
        const b = nodo.indexOf('}', a + 1);
        if (b < 0) break;
        const inner = nodo.slice(a + 1, b);
        const res = validarExpresion(inner);
        if (!res.ok) errores.push({ expr: inner, error: res.error || 'Invalida.' });
        i = b + 1;
      }
      return;
    }
    if (Array.isArray(nodo)) { nodo.forEach(x => visitar(x, prof + 1)); return; }
    if (typeof nodo === 'object') {
      for (const val of Object.values(nodo)) visitar(val, prof + 1);
    }
  };
  visitar(obj, profundidad);
  return errores;
}

/** Metadatos de todas las funciones disponibles (panel de ayuda del disenador). */
export function listarFunciones(): FuncionInfo[] {
  return Object.entries(FUNCIONES).map(([nombre, def]) => ({
    nombre,
    firma: def.firma,
    descripcion: def.descripcion,
  }));
}
