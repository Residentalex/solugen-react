import { getMonedaSucursalActiva, simboloMoneda } from './moneda';

export function toTitleCase(s: string): string {
  if (!s) return '';
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export function formatDate(val: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function parseDateRaw(val: string): Date | null {
  if (!val) return null;
  const num = val.replace(/\D/g, '');
  if (num.length === 8) {
    const y = parseInt(num.slice(0, 4), 10);
    const m = parseInt(num.slice(4, 6), 10) - 1;
    const d = parseInt(num.slice(6, 8), 10);
    return new Date(y, m, d);
  }
  if (num.length >= 14) {
    const y = parseInt(num.slice(0, 4), 10);
    const m = parseInt(num.slice(4, 6), 10) - 1;
    const d = parseInt(num.slice(6, 8), 10);
    return new Date(y, m, d);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateRaw(val: string): string {
  const d = parseDateRaw(val);
  if (!d) return val || '';
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateShort(val: string): string {
  const d = parseDateRaw(val);
  if (!d) return val || '';
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatCurrency(n: number, currency?: string): string {
  const c = currency || getMonedaSucursalActiva().codigo;
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: c, minimumFractionDigits: 2 }).format(n);
}

/**
 * Formatea un monto con el simbolo de la moneda indicada por el documento.
 * A diferencia de `formatCurrency`, no usa `Intl` con codigo ISO, porque los
 * codigos de `MONEDAS` no son necesariamente ISO validos (ej: 'RD$') y
 * `Intl.NumberFormat` lanza RangeError con esos valores.
 *
 * @param n       Monto a formatear
 * @param simbolo Simbolo de la moneda (ej: 'US$', 'RD$'). Si falta, usa el de la sucursal activa.
 * @param codigo  Codigo de moneda. Solo se usa para derivar el simbolo si no viene `simbolo`.
 */
export function formatMoneda(
  n: number,
  simbolo?: string | null,
  codigo?: string | null
): string {
  const simboloFinal =
    (simbolo && simbolo.trim()) ||
    (codigo ? simboloMoneda(codigo) : '') ||
    getMonedaSucursalActiva().simbolo ||
    'RD$';
  return `${simboloFinal} ${formatNumber(n)}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

/**
 * `formatter` de `InputNumber` para montos: inyecta el simbolo real y aplica
 * `formatNumber` (separador de miles y 2 decimales).
 *
 * Usar siempre junto con `crearParserMoneda`.
 */
export function crearFormatterMoneda(simbolo?: string | null) {
  const simboloFinal = (simbolo?.trim() || getMonedaSucursalActiva().simbolo) + ' ';
  return (value?: string | number): string | undefined => {
    if (value === undefined || value === null || value === '') return '';
    const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
    if (!Number.isFinite(n)) return String(value);
    return simboloFinal + formatNumber(n);
  };
}

/**
 * `parser` de `InputNumber` para montos.
 *
 * Descarta todo lo que no sea parte del numero (simbolo, espacios, letras) en vez de
 * buscar el simbolo esperado con un replace. Asi el campo sigue funcionando cuando el
 * simbolo cambia y no hay que actualizarlo en cada catalogo de moneda nuevo.
 */
export function crearParserMoneda() {
  return (value?: string): string | undefined => {
    if (value === undefined || value === null) return value;
    const limpio = value.replace(/[^\d,.-]/g, '').replace(/,/g, '');
    return limpio === '' ? undefined : limpio;
  };
}

/**
 * Redondea un número a 2 decimales con criterio AwayFromZero (el mismo que usa
 * el backend al persistir montos). Evita los residuos de coma flotante del tipo
 * `2167.92000000001` que aparecen al restar montos en JavaScript.
 *
 * PRECONDICIÓN: la entrada debe tener como máximo 2 decimales significativos
 * (ser múltiplo de 0.01 o venir ya redondeada del backend). Usa `Math.round`,
 * que sufre el bug clásico `redondear2(1.005) === 1` porque
 * `1.005 * 100 === 100.49999999999999`. Hoy esa entrada no es alcanzable porque
 * todas las fuentes son decimales exactos del backend o resultados ya redondeados.
 * No cambies su semántica: el backend usa `decimal` exacto y ambos deben coincidir.
 */
export function redondear2(val: number): number {
  const signo = val < 0 ? -1 : 1;
  return (signo * Math.round(Math.abs(val) * 100)) / 100;
}

export function getInitials(name: string): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

const PALETA_NOMBRES = [
  '#E05252', '#4A8FD4', '#2BA88C', '#F0A030',
  '#9B59B6', '#1ABC9C', '#E67E22', '#3498DB',
  '#E84393', '#00B894', '#6C5CE7', '#FD79A8',
  '#0984E3', '#00CEC9', '#D63031', '#636E72',
];

export function getColorFromName(name: string): string {
  if (!name) return '#8C8C8C';
  const clean = name.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) | 0;
  }
  return PALETA_NOMBRES[Math.abs(hash) % PALETA_NOMBRES.length];
}

export function getColorMonograma(diasCredito: number | undefined): string {
  if (diasCredito === undefined || diasCredito === null) return '#8C8C8C';
  if (diasCredito < 15) return '#E05252';
  if (diasCredito < 30) return '#4A8FD4';
  return '#2BA88C';
}

export function truncateEmpaque(val: string, maxLen = 12): string {
  if (!val || val.length <= maxLen) return val || '';
  return `...${val.slice(-maxLen)}`;
}

export function truncateText(val: string, maxLen: number = 50): string {
  if (!val) return '';
  if (val.length <= maxLen) return val;
  return `${val.slice(0, maxLen)}...`;
}

export function toISOFormat(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function esObjeto(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null;
}

export function extraerMensajeError(err: unknown, fallback: string): string {
  if (!esObjeto(err)) return fallback;
  const response = err.response;
  if (!esObjeto(response)) return fallback;
  const data = response.data;
  if (!esObjeto(data)) return fallback;
  if (typeof data.errorMessage === 'string' && data.errorMessage) return data.errorMessage;
  const errors = data.errors;
  if (esObjeto(errors)) {
    const mensajes: string[] = [];
    for (const key of Object.keys(errors)) {
      const val = errors[key];
      if (Array.isArray(val)) mensajes.push(...val.map((m) => String(m)));
      else if (typeof val === 'string') mensajes.push(val);
    }
    if (mensajes.length > 0) return mensajes.join('; ');
  }
  return fallback;
}

export function formatDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${day}${hh}${mm}${ss}`;
}
