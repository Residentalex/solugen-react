import { getMonedaSucursalActiva } from './moneda';

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

export function formatDateTime(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatCurrency(n: number, currency?: string): string {
  const c = currency || getMonedaSucursalActiva().codigo;
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: c, minimumFractionDigits: 2 }).format(n);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
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
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}`;
}

export function extraerMensajeError(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (data.errorMessage) return data.errorMessage;
  if (data.errors && typeof data.errors === 'object') {
    const mensajes: string[] = [];
    for (const key of Object.keys(data.errors)) {
      const val = data.errors[key];
      if (Array.isArray(val)) mensajes.push(...val);
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
