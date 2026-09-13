"use strict";
/**
 * Motor de expresiones para plantillas de tickets ESC/POS.
 *
 * Caracteristicas:
 * - Sintaxis: texto libre con bloques {expresion}.
 * - Parser propio (recursivo descendente) SIN eval() ni Function().
 * - Whitelist cerrada de funciones (ver listarFunciones()).
 * - Resolucion de campos por cadena de ambitos: item -> data -> company -> config,
 *   con fallback case-insensitive en cada nivel.
 * - Retrocompatibilidad: una expresion que no compila/evalua se deja LITERAL
 *   dentro del texto, y evaluarObjeto devuelve el objeto intacto ante cualquier
 *   error inesperado.
 *
 * Este archivo se compila tambien para Node via tsconfig.print.json
 * (Solugen.Impresion.Service), por lo que NO debe depender del DOM ni de
 * librerias externas.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FUNCIONES = void 0;
exports.aString = aString;
exports.validarExpresion = validarExpresion;
exports.evaluarExpresion = evaluarExpresion;
exports.evaluarTexto = evaluarTexto;
exports.evaluarObjeto = evaluarObjeto;
exports.validarExpresionesDeConfig = validarExpresionesDeConfig;
exports.listarFunciones = listarFunciones;
class ParseError extends Error {
    constructor(mensaje, pos) {
        super(mensaje);
        this.pos = pos;
    }
}
function tokenizar(src) {
    const toks = [];
    let i = 0;
    const esDigito = (c) => c >= '0' && c <= '9';
    const esLetra = (c) => /[A-Za-zÑñÁÉÍÓÚáéíóúÜü_]/.test(c);
    const esAlnum = (c) => esLetra(c) || esDigito(c);
    while (i < src.length) {
        const c = src[i];
        if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
            i++;
            continue;
        }
        // Numero (entero o decimal con punto)
        if (esDigito(c) || (c === '.' && esDigito(src[i + 1] ?? ''))) {
            let j = i;
            let puntos = 0;
            while (j < src.length && (esDigito(src[j]) || src[j] === '.')) {
                if (src[j] === '.')
                    puntos++;
                j++;
            }
            if (puntos > 1)
                throw new ParseError('Numero invalido', i);
            toks.push({ t: 'num', v: src.slice(i, j), pos: i });
            i = j;
            continue;
        }
        // Texto entre comillas simples o dobles
        if (c === "'" || c === '"') {
            const fin = src.indexOf(c, i + 1);
            if (fin === -1)
                throw new ParseError('Texto sin cerrar', i);
            toks.push({ t: 'str', v: src.slice(i + 1, fin), pos: i });
            i = fin + 1;
            continue;
        }
        // Identificador (permite acentos y ñ)
        if (esLetra(c)) {
            let j = i;
            while (j < src.length && esAlnum(src[j]))
                j++;
            toks.push({ t: 'id', v: src.slice(i, j), pos: i });
            i = j;
            continue;
        }
        // Operadores de dos caracteres
        const dos = src.slice(i, i + 2);
        if (dos === '<>' || dos === '<=' || dos === '>=' || dos === '!=') {
            toks.push({ t: 'op', v: dos === '!=' ? '<>' : dos, pos: i });
            i += 2;
            continue;
        }
        // Operadores de un caracter
        if ('+-*/%&=<>(),.'.includes(c)) {
            toks.push({ t: 'op', v: c, pos: i });
            i++;
            continue;
        }
        throw new ParseError(`Caracter no valido: '${c}'`, i);
    }
    toks.push({ t: 'fin', v: '', pos: src.length });
    return toks;
}
/* ============================== Parser ============================== */
class Parser {
    constructor(src) {
        this.i = 0;
        this.toks = tokenizar(src);
    }
    peek() {
        return this.toks[this.i];
    }
    avanzar() {
        return this.toks[this.i++];
    }
    esperarOp(v) {
        const t = this.peek();
        if (t.t === 'op' && t.v === v) {
            this.avanzar();
            return;
        }
        throw new ParseError(`Se esperaba '${v}'`, t.pos);
    }
    analizar() {
        const n = this.or();
        const t = this.peek();
        if (t.t !== 'fin')
            throw new ParseError('Sobran caracteres al final de la expresion', t.pos);
        return n;
    }
    or() {
        let a = this.and();
        while (this.peek().t === 'id' && this.peek().v.toUpperCase() === 'OR') {
            this.avanzar();
            a = { k: 'bin', op: 'OR', a, b: this.and() };
        }
        return a;
    }
    and() {
        let a = this.not();
        while (this.peek().t === 'id' && this.peek().v.toUpperCase() === 'AND') {
            this.avanzar();
            a = { k: 'bin', op: 'AND', a, b: this.not() };
        }
        return a;
    }
    not() {
        if (this.peek().t === 'id' && this.peek().v.toUpperCase() === 'NOT') {
            this.avanzar();
            return { k: 'un', op: 'NOT', a: this.not() };
        }
        return this.comparacion();
    }
    comparacion() {
        const a = this.aditivo();
        const t = this.peek();
        if (t.t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(t.v)) {
            this.avanzar();
            return { k: 'bin', op: t.v, a, b: this.aditivo() };
        }
        return a;
    }
    aditivo() {
        let a = this.multiplicativo();
        for (;;) {
            const t = this.peek();
            if (t.t === 'op' && (t.v === '+' || t.v === '-' || t.v === '&')) {
                this.avanzar();
                a = { k: 'bin', op: t.v, a, b: this.multiplicativo() };
            }
            else {
                return a;
            }
        }
    }
    multiplicativo() {
        let a = this.unario();
        for (;;) {
            const t = this.peek();
            if (t.t === 'op' && (t.v === '*' || t.v === '/' || t.v === '%')) {
                this.avanzar();
                a = { k: 'bin', op: t.v, a, b: this.unario() };
            }
            else {
                return a;
            }
        }
    }
    unario() {
        const t = this.peek();
        if (t.t === 'op' && t.v === '-') {
            this.avanzar();
            return { k: 'un', op: '-', a: this.unario() };
        }
        return this.primario();
    }
    primario() {
        const t = this.avanzar();
        if (t.t === 'num')
            return { k: 'num', v: Number(t.v) };
        if (t.t === 'str')
            return { k: 'str', v: t.v };
        if (t.t === 'op' && t.v === '(') {
            const n = this.or();
            this.esperarOp(')');
            return n;
        }
        if (t.t === 'id') {
            const U = t.v.toUpperCase();
            if (U === 'TRUE')
                return { k: 'bool', v: true };
            if (U === 'FALSE')
                return { k: 'bool', v: false };
            if (U === 'NULL')
                return { k: 'nul' };
            // Llamada a funcion de la whitelist
            const nx = this.peek();
            if (nx.t === 'op' && nx.v === '(') {
                if (!NOMBRES_FUNCIONES.has(U)) {
                    throw new ParseError(`Funcion no permitida: ${t.v}`, t.pos);
                }
                const minimo = ARIDAD_MINIMA[U] ?? 0;
                this.avanzar(); // (
                const args = [];
                if (!(this.peek().t === 'op' && this.peek().v === ')')) {
                    args.push(this.or());
                    while (this.peek().t === 'op' && this.peek().v === ',') {
                        this.avanzar();
                        args.push(this.or());
                    }
                }
                this.esperarOp(')');
                if (args.length < minimo) {
                    throw new ParseError(`${U} requiere al menos ${minimo} argumento(s)`, t.pos);
                }
                return { k: 'llam', nombre: U, args, pos: t.pos };
            }
            // Ruta de campos: cliente.nombre, cobros.mefectivo, ...
            const segs = [t.v];
            while (this.peek().t === 'op' && this.peek().v === '.') {
                this.avanzar();
                const s = this.avanzar();
                if (s.t !== 'id')
                    throw new ParseError('Nombre de campo invalido despues de "."', s.pos);
                segs.push(s.v);
            }
            return { k: 'id', segs, pos: t.pos };
        }
        throw new ParseError('Expresion invalida', t.pos);
    }
}
function parseExpresion(src) {
    return new Parser(src).analizar();
}
/* ====================== Resolucion de campos (ambitos) ====================== */
/** Busca una propiedad de forma directa y luego case-insensitive. */
function buscarProp(fuente, nombre) {
    if (fuente === null || fuente === undefined || typeof fuente !== 'object')
        return undefined;
    if (nombre in fuente)
        return fuente[nombre];
    const nl = nombre.toLowerCase();
    for (const k of Object.keys(fuente)) {
        if (k.toLowerCase() === nl)
            return fuente[k];
    }
    return undefined;
}
/**
 * Baja por los segmentos restantes de una ruta. Si el valor actual es un
 * arreglo, la ruta se aplica a cada elemento (mapeo automatico), lo que
 * permite agregaciones como SUM(cobros.mefectivo).
 */
function bajarCampos(base, segs) {
    let v = base;
    for (const s of segs) {
        if (v === null || v === undefined)
            return undefined;
        if (Array.isArray(v)) {
            v = v.map((it) => (it === null || it === undefined ? null : buscarProp(it, s) ?? null));
            continue;
        }
        v = buscarProp(v, s);
        if (v === undefined)
            return undefined;
    }
    return v;
}
/**
 * Resuelve una ruta de campos contra la cadena de ambitos:
 * item iterado -> data -> company -> config.
 */
function resolverPath(segs, ctx) {
    const fuentes = [ctx.item, ctx.data, ctx.company, ctx.config];
    for (const f of fuentes) {
        if (f === null || f === undefined)
            continue;
        const primero = buscarProp(f, segs[0]);
        if (primero !== undefined) {
            return segs.length === 1 ? primero : bajarCampos(primero, segs.slice(1));
        }
    }
    return undefined;
}
/* ======================= Conversion y comparacion de valores ======================= */
/** Convierte a numero; devuelve null si no es numerico. */
function aNumero(v) {
    if (typeof v === 'number')
        return Number.isFinite(v) ? v : null;
    if (typeof v === 'string') {
        const t = v.trim();
        if (t === '')
            return null;
        const n = Number(t);
        return Number.isNaN(n) ? null : n;
    }
    return null;
}
/** Renderiza un valor como texto para el ticket. */
function aString(v) {
    if (v === null || v === undefined)
        return '';
    if (typeof v === 'boolean')
        return v ? 'SI' : 'NO';
    if (v instanceof Date)
        return formatearFecha(v);
    if (Array.isArray(v))
        return v.map(aString).join(', ');
    return String(v);
}
/** Verdad logica: null/''/0 son falsos. */
function truthy(v) {
    if (v === null || v === undefined)
        return false;
    if (typeof v === 'boolean')
        return v;
    if (typeof v === 'number')
        return v !== 0;
    if (typeof v === 'string')
        return v.trim() !== '';
    return true;
}
function aplicarOp(op, a, b) {
    switch (op) {
        case '=': return a === b;
        case '<>': return a !== b;
        case '<': return a < b;
        case '>': return a > b;
        case '<=': return a <= b;
        case '>=': return a >= b;
        default: return false;
    }
}
/** Comparacion con textos case-insensitive; null solo es igual a null. */
function cmp(op, a, b) {
    const aNull = a === null || a === undefined;
    const bNull = b === null || b === undefined;
    if (op === '=') {
        if (aNull && bNull)
            return true;
        if (aNull || bNull)
            return false;
    }
    else if (op === '<>') {
        if (aNull && bNull)
            return false;
        if (aNull || bNull)
            return true;
    }
    else if (aNull || bNull) {
        return false;
    }
    const na = aNumero(a);
    const nb = aNumero(b);
    if (na !== null && nb !== null && typeof a !== 'boolean' && typeof b !== 'boolean') {
        return aplicarOp(op, na, nb);
    }
    return aplicarOp(op, aString(a).toUpperCase(), aString(b).toUpperCase());
}
/* ============================== Fechas ============================== */
/**
 * Acepta: Date, yyyyMMddHHmmss, yyyyMMdd, ISO (2026-08-22T14:30:00)
 * y dd/MM/yyyy [HH:mm[:ss]]. Devuelve null si no reconoce el formato.
 */
function parseFecha(v) {
    if (v instanceof Date)
        return isNaN(v.getTime()) ? null : new Date(v.getTime());
    if (v === null || v === undefined)
        return null;
    const s = String(v).trim();
    if (s === '')
        return null;
    let m = s.match(/^(\d{14})$/);
    if (m) {
        return new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)), Number(s.slice(8, 10)), Number(s.slice(10, 12)), Number(s.slice(12, 14)));
    }
    m = s.match(/^(\d{8})$/);
    if (m) {
        return new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
    }
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
        return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0));
    }
    if (s.includes('-') || s.includes('T')) {
        const t = Date.parse(s);
        if (!Number.isNaN(t))
            return new Date(t);
    }
    return null;
}
function formatearFecha(d) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear()).padStart(4, '0');
    const conHora = d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
    if (!conHora)
        return `${dd}/${mm}/${yyyy}`;
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}
function inicioDia(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
/** Diferencia fa - fb en la unidad indicada (aliases ES/EN). */
function datediff(faVal, fbVal, unidadRaw) {
    const fa = parseFecha(faVal);
    const fb = parseFecha(fbVal);
    if (!fa || !fb)
        return null;
    const u = String(unidadRaw ?? '').trim().toUpperCase();
    const ms = fa.getTime() - fb.getTime();
    if (['HORAS', 'HOUR', 'HOURS'].includes(u))
        return Math.round(ms / 3600000);
    if (['MINUTOS', 'MINUTE', 'MINUTES'].includes(u))
        return Math.round(ms / 60000);
    if (['DIAS', 'DAY', 'DAYS'].includes(u))
        return Math.round(ms / 86400000);
    let meses = (fa.getFullYear() - fb.getFullYear()) * 12 + (fa.getMonth() - fb.getMonth());
    if (fa.getDate() < fb.getDate())
        meses -= 1;
    if (['MESES', 'MONTH', 'MONTHS'].includes(u))
        return meses;
    if (['ANIOS', 'AÑOS', 'YEAR', 'YEARS'].includes(u))
        return Math.floor(meses / 12);
    return null;
}
/* ======================= Whitelist de funciones ======================= */
/** Aridad minima por funcion (validada en parseo para mejores errores). */
const ARIDAD_MINIMA = {
    SUM: 1, AVG: 1, COUNT: 1, MIN: 1, MAX: 1, SUMIF: 2, COUNTIF: 2,
    IF: 3, AND: 1, OR: 1, NOT: 1,
    ROUND: 1, ABS: 1,
    CONCAT: 1, LEFT: 2, RIGHT: 2, SUBSTRING: 2, UPPER: 1, LOWER: 1, TRIM: 1, LEN: 1, REPLACE: 3,
    TODAY: 0, NOW: 0, YEAR: 1, MONTH: 1, DAY: 1, DATEDIFF: 3,
    ISNULL: 1, COALESCE: 1, NUM: 1, TEXT: 1,
};
function reqArgs(args, min, nombre) {
    if (args.length < min)
        throw new Error(`${nombre}: se esperaban al menos ${min} argumento(s)`);
}
/** Extrae los numeros de un valor (arreglo o escalar), ignorando nulos. */
function numerosDe(v) {
    const fuente = Array.isArray(v) ? v : [v];
    const out = [];
    for (const it of fuente) {
        if (it === null || it === undefined || typeof it === 'boolean')
            continue;
        const n = aNumero(it);
        if (n !== null)
            out.push(n);
    }
    return out;
}
function extremos(args, esMin) {
    let pool;
    if (args.length === 1 && Array.isArray(args[0])) {
        pool = numerosDe(args[0]);
    }
    else {
        pool = numerosDe(args);
    }
    if (pool.length === 0)
        return null;
    return esMin ? Math.min(...pool) : Math.max(...pool);
}
/** Criterio de SUMIF/COUNTIF: igualdad exacta u operador prefijo (">100", "<>X"). */
function cumpleCriterio(valor, criterio) {
    if (typeof criterio === 'string') {
        const m = criterio.match(/^(>=|<=|<>|!=|>|<)\s*(.*)$/);
        if (m) {
            const op = m[1] === '!=' ? '<>' : m[1];
            const objetivo = m[2];
            const nv = aNumero(valor);
            const no = aNumero(objetivo);
            if (nv !== null && no !== null && typeof valor !== 'boolean') {
                return aplicarOp(op, nv, no);
            }
            return aplicarOp(op, String(valor ?? '').toUpperCase(), objetivo.toUpperCase());
        }
    }
    return cmp('=', valor, criterio);
}
/** Implementaciones de la whitelist. Cualquier otra funcion esta prohibida. */
const IMPL = {
    // ----- Agregadas -----
    SUM: (a) => numerosDe(a[0]).reduce((x, y) => x + y, 0),
    AVG: (a) => {
        const ns = numerosDe(a[0]);
        return ns.length > 0 ? ns.reduce((x, y) => x + y, 0) / ns.length : null;
    },
    COUNT: (a) => {
        const v = a[0];
        if (Array.isArray(v))
            return v.filter((x) => x !== null && x !== undefined).length;
        return v === null || v === undefined ? 0 : 1;
    },
    MIN: (a) => extremos(a, true),
    MAX: (a) => extremos(a, false),
    SUMIF: (a) => {
        reqArgs(a, 2, 'SUMIF');
        const rango = Array.isArray(a[0]) ? a[0] : [a[0]];
        const suma = Array.isArray(a[2]) ? a[2] : null;
        let total = 0;
        for (let i = 0; i < rango.length; i++) {
            if (!cumpleCriterio(rango[i], a[1]))
                continue;
            const n = aNumero(suma ? suma[i] : rango[i]);
            if (n !== null)
                total += n;
        }
        return total;
    },
    COUNTIF: (a) => {
        reqArgs(a, 2, 'COUNTIF');
        const rango = Array.isArray(a[0]) ? a[0] : [a[0]];
        let cuenta = 0;
        for (const v of rango) {
            if (cumpleCriterio(v, a[1]))
                cuenta++;
        }
        return cuenta;
    },
    // ----- Logica -----
    IF: (a) => {
        reqArgs(a, 3, 'IF');
        return truthy(a[0]) ? a[1] : a[2];
    },
    AND: (a) => a.every(truthy),
    OR: (a) => a.some(truthy),
    NOT: (a) => !truthy(a[0]),
    // ----- Matematicas -----
    ROUND: (a) => {
        const n = aNumero(a[0]);
        if (n === null)
            return null;
        const d = a.length > 1 ? aNumero(a[1]) ?? 2 : 2;
        const f = Math.pow(10, d);
        return Math.round(n * f) / f;
    },
    ABS: (a) => {
        const n = aNumero(a[0]);
        return n === null ? null : Math.abs(n);
    },
    // ----- Texto -----
    CONCAT: (a) => a.map((x) => aString(x)).join(''),
    LEFT: (a) => {
        const s = aString(a[0]);
        const n = aNumero(a[1]) ?? 0;
        return s.slice(0, Math.max(0, n));
    },
    RIGHT: (a) => {
        const s = aString(a[0]);
        const n = aNumero(a[1]) ?? 0;
        return n <= 0 ? '' : s.slice(-n);
    },
    SUBSTRING: (a) => {
        const s = aString(a[0]);
        const ini = Math.max(1, aNumero(a[1]) ?? 1); // base 1
        if (a.length > 2) {
            const largo = Math.max(0, aNumero(a[2]) ?? 0);
            return s.slice(ini - 1, ini - 1 + largo);
        }
        return s.slice(ini - 1);
    },
    UPPER: (a) => aString(a[0]).toUpperCase(),
    LOWER: (a) => aString(a[0]).toLowerCase(),
    TRIM: (a) => aString(a[0]).trim(),
    LEN: (a) => aString(a[0]).length,
    REPLACE: (a) => aString(a[0]).split(aString(a[1])).join(aString(a[2])),
    // ----- Fechas -----
    TODAY: () => inicioDia(new Date()),
    NOW: () => new Date(),
    YEAR: (a) => {
        const f = parseFecha(a[0]);
        return f ? f.getFullYear() : null;
    },
    MONTH: (a) => {
        const f = parseFecha(a[0]);
        return f ? f.getMonth() + 1 : null;
    },
    DAY: (a) => {
        const f = parseFecha(a[0]);
        return f ? f.getDate() : null;
    },
    DATEDIFF: (a, _ctx, nodos) => {
        reqArgs(a, 3, 'DATEDIFF');
        let unidad = a[2];
        // La unidad puede escribirse sin comillas (DIAS); si el identificador no
        // resolvio a ningun campo, se usa su propio nombre como unidad.
        const nodoUnidad = nodos ? nodos[2] : undefined;
        if ((unidad === null || unidad === undefined) &&
            nodoUnidad && nodoUnidad.k === 'id' && nodoUnidad.segs.length === 1) {
            unidad = nodoUnidad.segs[0];
        }
        return datediff(a[0], a[1], unidad);
    },
    // ----- Nulos / conversion -----
    ISNULL: (a) => a[0] === null || a[0] === undefined,
    COALESCE: (a) => {
        for (const v of a) {
            if (v !== null && v !== undefined)
                return v;
        }
        return null;
    },
    NUM: (a) => aNumero(a[0]),
    TEXT: (a) => aString(a[0]),
};
const NOMBRES_FUNCIONES = new Set(Object.keys(IMPL));
/* ======================= Metadatos para ayuda/validacion ======================= */
/** Catalogo de funciones disponibles (fuente del panel de ayuda del editor). */
exports.FUNCIONES = [
    // ----- Agregadas -----
    { nombre: 'SUM', categoria: 'agregadas', params: 'rango', descripcion: 'Suma los valores numericos de un rango (ignora nulos).', ejemplo: '{SUM(cobros.mefectivo)}' },
    { nombre: 'AVG', categoria: 'agregadas', params: 'rango', descripcion: 'Promedio de los valores numericos de un rango.', ejemplo: '{AVG(detalle.total)}' },
    { nombre: 'COUNT', categoria: 'agregadas', params: 'rango', descripcion: 'Cuenta los elementos no nulos de un rango.', ejemplo: '{COUNT(detalle.codigo)}' },
    { nombre: 'MIN', categoria: 'agregadas', params: 'valor1; valor2; ...', descripcion: 'Minimo entre valores o dentro de un rango.', ejemplo: '{MIN(cobros.monto)}' },
    { nombre: 'MAX', categoria: 'agregadas', params: 'valor1; valor2; ...', descripcion: 'Maximo entre valores o dentro de un rango.', ejemplo: '{MAX(cobros.monto)}' },
    { nombre: 'SUMIF', categoria: 'agregadas', params: 'rango; criterio; [rangoSuma]', descripcion: 'Suma los valores que cumplen el criterio. Criterio admite ">100", "<>X", etc.', ejemplo: '{SUMIF(cobros.tipo, "EFECTIVO", cobros.mefectivo)}' },
    { nombre: 'COUNTIF', categoria: 'agregadas', params: 'rango; criterio', descripcion: 'Cuenta los elementos que cumplen el criterio.', ejemplo: '{COUNTIF(detalle.cantidad, ">0")}' },
    // ----- Logica -----
    { nombre: 'IF', categoria: 'logica', params: 'condicion; siVerdadero; siFalso', descripcion: 'Devuelve un valor u otro segun la condicion.', ejemplo: '{IF(total > 10000, "GRANDE", "NORMAL")}' },
    { nombre: 'AND', categoria: 'logica', params: 'cond1; cond2; ...', descripcion: 'Verdadero si todas las condiciones son verdaderas.', ejemplo: '{IF(AND(cerrado = 1, total > 0), "OK", "REVISAR")}' },
    { nombre: 'OR', categoria: 'logica', params: 'cond1; cond2; ...', descripcion: 'Verdadero si alguna condicion es verdadera.', ejemplo: '{IF(OR(tipo = "A", tipo = "B"), "VALIDO", "-")}' },
    { nombre: 'NOT', categoria: 'logica', params: 'condicion', descripcion: 'Niega una condicion.', ejemplo: '{IF(NOT(anulado), "ACTIVO", "ANULADO")}' },
    // ----- Matematicas -----
    { nombre: 'ROUND', categoria: 'matematicas', params: 'numero; [decimales=2]', descripcion: 'Redondea a la cantidad de decimales indicada (2 por defecto).', ejemplo: '{ROUND(SUM(cobros.mtotal) / 1.18)}' },
    { nombre: 'ABS', categoria: 'matematicas', params: 'numero', descripcion: 'Valor absoluto.', ejemplo: '{ABS(diferencia)}' },
    // ----- Texto -----
    { nombre: 'CONCAT', categoria: 'texto', params: 'valor1; valor2; ...', descripcion: 'Une textos; los nulos cuentan como vacio.', ejemplo: '{CONCAT(cliente.nombre, " - ", cliente.rnc)}' },
    { nombre: 'LEFT', categoria: 'texto', params: 'texto; cantidad', descripcion: 'Primeros N caracteres.', ejemplo: '{LEFT(noDocumento, 4)}' },
    { nombre: 'RIGHT', categoria: 'texto', params: 'texto; cantidad', descripcion: 'Ultimos N caracteres.', ejemplo: '{RIGHT(noDocumento, 6)}' },
    { nombre: 'SUBSTRING', categoria: 'texto', params: 'texto; inicio; [largo]', descripcion: 'Subcadena base 1; sin largo llega al final.', ejemplo: '{SUBSTRING(cliente.nombre, 1, 20)}' },
    { nombre: 'UPPER', categoria: 'texto', params: 'texto', descripcion: 'Convierte a mayusculas.', ejemplo: '{UPPER(cliente.nombre)}' },
    { nombre: 'LOWER', categoria: 'texto', params: 'texto', descripcion: 'Convierte a minusculas.', ejemplo: '{LOWER(correo)}' },
    { nombre: 'TRIM', categoria: 'texto', params: 'texto', descripcion: 'Quita espacios al inicio y al final.', ejemplo: '{TRIM(direccion)}' },
    { nombre: 'LEN', categoria: 'texto', params: 'texto', descripcion: 'Longitud del texto.', ejemplo: '{LEN(rnc)}' },
    { nombre: 'REPLACE', categoria: 'texto', params: 'texto; buscar; reemplazo', descripcion: 'Reemplaza todas las apariciones de un texto.', ejemplo: '{REPLACE(telefono, "-", "")}' },
    // ----- Fechas -----
    { nombre: 'TODAY', categoria: 'fechas', params: '', descripcion: 'Fecha actual (sin hora).', ejemplo: '{TODAY()}' },
    { nombre: 'NOW', categoria: 'fechas', params: '', descripcion: 'Fecha y hora actuales.', ejemplo: '{NOW()}' },
    { nombre: 'YEAR', categoria: 'fechas', params: 'fecha', descripcion: 'Anio de una fecha.', ejemplo: '{YEAR(fecha)}' },
    { nombre: 'MONTH', categoria: 'fechas', params: 'fecha', descripcion: 'Mes de una fecha (1-12).', ejemplo: '{MONTH(fecha)}' },
    { nombre: 'DAY', categoria: 'fechas', params: 'fecha', descripcion: 'Dia del mes de una fecha.', ejemplo: '{DAY(fecha)}' },
    { nombre: 'DATEDIFF', categoria: 'fechas', params: 'fechaA; fechaB; unidad', descripcion: 'Diferencia fechaA - fechaB en DIAS/HORAS/MINUTOS/MESES/ANIOS.', ejemplo: '{DATEDIFF(fechafin, fechain, HORAS)}' },
    // ----- Nulos / conversion -----
    { nombre: 'ISNULL', categoria: 'nulos', params: 'valor', descripcion: 'Verdadero si el valor es nulo.', ejemplo: '{IF(ISNULL(nota), "SIN NOTA", nota)}' },
    { nombre: 'COALESCE', categoria: 'nulos', params: 'valor1; valor2; ...', descripcion: 'Devuelve el primer valor no nulo.', ejemplo: '{COALESCE(alias, nombre, "-")}' },
    { nombre: 'NUM', categoria: 'nulos', params: 'valor', descripcion: 'Convierte a numero; null si no es numerico.', ejemplo: '{NUM(cantidad) * NUM(precio)}' },
    { nombre: 'TEXT', categoria: 'nulos', params: 'valor', descripcion: 'Convierte a texto (booleanos como SI/NO).', ejemplo: '{TEXT(total)}' },
];
/* ============================== Evaluador ============================== */
function evaluar(n, ctx) {
    switch (n.k) {
        case 'num':
        case 'str':
        case 'bool':
            return n.v;
        case 'nul':
            return null;
        case 'id': {
            const v = resolverPath(n.segs, ctx);
            return v === undefined ? null : v;
        }
        case 'un': {
            if (n.op === 'NOT')
                return !truthy(evaluar(n.a, ctx));
            const v = aNumero(evaluar(n.a, ctx));
            return v === null ? null : -v;
        }
        case 'llam': {
            const impl = IMPL[n.nombre];
            if (!impl)
                throw new Error(`Funcion no permitida: ${n.nombre}`);
            const args = n.args.map((arg) => evaluar(arg, ctx));
            return impl(args, ctx, n.args);
        }
        case 'bin':
            return evaluarBin(n, ctx);
    }
}
function evaluarBin(n, ctx) {
    // Corto circuito para logicos
    if (n.op === 'AND')
        return truthy(evaluar(n.a, ctx)) && truthy(evaluar(n.b, ctx));
    if (n.op === 'OR')
        return truthy(evaluar(n.a, ctx)) || truthy(evaluar(n.b, ctx));
    if (['=', '<>', '<', '>', '<=', '>='].includes(n.op)) {
        return cmp(n.op, evaluar(n.a, ctx), evaluar(n.b, ctx));
    }
    const a = evaluar(n.a, ctx);
    const b = evaluar(n.b, ctx);
    switch (n.op) {
        case '&':
            // Concatenacion tolerante a nulos
            return aString(a) + aString(b);
        case '+': {
            if (a === null || a === undefined || b === null || b === undefined)
                return null;
            if (typeof a === 'string' || typeof b === 'string')
                return aString(a) + aString(b);
            const na = aNumero(a);
            const nb = aNumero(b);
            return na === null || nb === null ? null : na + nb;
        }
        case '-':
        case '*': {
            const na = aNumero(a);
            const nb = aNumero(b);
            if (na === null || nb === null)
                return null;
            return n.op === '-' ? na - nb : na * nb;
        }
        case '/':
        case '%': {
            const na = aNumero(a);
            const nb = aNumero(b);
            if (na === null || nb === null || nb === 0)
                return null; // division por cero -> null
            return n.op === '/' ? na / nb : na % nb;
        }
        default:
            return null;
    }
}
/* ============================== API publica ============================== */
const RE_EXPRESION = /\{([^{}]*)\}/g;
/** Valida la sintaxis de una expresion (sin evaluarla). */
function validarExpresion(expresion) {
    try {
        parseExpresion(expresion);
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
}
/** Evalua una expresion suelta y devuelve el valor crudo (null si no resuelve). */
function evaluarExpresion(expresion, ctx = {}) {
    const nodo = parseExpresion(expresion);
    return evaluar(nodo, ctx);
}
/**
 * Reemplaza todos los bloques {expresion} de un texto por su valor.
 * Una expresion con error se deja LITERAL (retrocompatibilidad).
 */
function evaluarTexto(texto, ctx = {}) {
    if (!texto || texto.indexOf('{') === -1)
        return texto;
    return texto.replace(RE_EXPRESION, (completo, interior) => {
        const expr = interior.trim();
        if (!expr)
            return completo;
        try {
            return aString(evaluarExpresion(expr, ctx));
        }
        catch {
            return completo;
        }
    });
}
/** Aplica evaluarTexto a todos los strings de un objeto/arreglo (recursivo). */
function evaluarObjeto(obj, ctx = {}) {
    try {
        return recorrer(obj, ctx);
    }
    catch {
        return obj;
    }
}
function recorrer(v, ctx) {
    if (typeof v === 'string')
        return evaluarTexto(v, ctx);
    if (Array.isArray(v))
        return v.map((x) => recorrer(x, ctx));
    if (v !== null && v !== undefined && typeof v === 'object' && !(v instanceof Date)) {
        const out = {};
        for (const k of Object.keys(v))
            out[k] = recorrer(v[k], ctx);
        return out;
    }
    return v;
}
/** Extrae las expresiones {...} de un texto. */
function extraerExpresiones(texto) {
    const out = [];
    for (const m of texto.matchAll(RE_EXPRESION)) {
        const expr = m[1].trim();
        if (expr)
            out.push(expr);
    }
    return out;
}
/**
 * Valida todas las expresiones de una plantilla (textos libres, titulo y pie).
 * Devuelve solo las que tienen error.
 */
function validarExpresionesDeConfig(config) {
    const errores = [];
    const revisar = (texto) => {
        if (!texto || typeof texto !== 'string' || texto.indexOf('{') === -1)
            return;
        for (const expr of extraerExpresiones(texto)) {
            const r = validarExpresion(expr);
            if (!r.ok)
                errores.push({ expresion: expr, error: r.error ?? 'Error desconocido' });
        }
    };
    const tl = config?.textosLibres;
    if (tl && typeof tl === 'object') {
        for (const clave of Object.keys(tl)) {
            const v = tl[clave];
            if (typeof v === 'string')
                revisar(v);
            else if (v && typeof v === 'object')
                revisar(v.texto);
        }
    }
    revisar(config?.titulo?.texto);
    revisar(config?.pie?.textoPie);
    return errores;
}
/** Lista de funciones disponibles ordenada por categoria (panel de ayuda). */
function listarFunciones() {
    return [...exports.FUNCIONES].sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre));
}
