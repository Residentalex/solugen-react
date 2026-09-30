import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { ActividadDTO } from '../../../types/actividad';

export type VistaCalendario = 'mes' | 'semana' | 'dia' | 'ano';
export type CriterioColor = 'servicio' | 'responsable';

// Primer dia de la semana es LUNES en todo el calendario (no domingo).
export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;
export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;

export const ALTURA_HORA = 48;
export const HORAS_DIA: number[] = Array.from({ length: 24 }, (_, i) => i);

export function inicioSemana(fecha: Dayjs): Dayjs {
  const dia = fecha.day(); // 0 = domingo, 1 = lunes...
  const diff = dia === 0 ? -6 : 1 - dia;
  return fecha.startOf('day').add(diff, 'day');
}

/**
 * Rango SEMIABIERTO [desde, hasta) para cada vista.
 *
 * - Mes: [inicioDelMes, inicioDelMesSiguiente)
 * - Semana: [inicioSemana (lunes), inicioSemanaSiguiente)
 * - Dia: [inicioDelDia, inicioDelDiaSiguiente)
 * - Ano: [inicioDelAno, inicioDelAnoSiguiente)
 *
 * Decision para la grilla de Mes: el rango es SOLO el mes visible (no los
 * dias del mes anterior/siguiente que rellenan la grilla de 6 semanas). Asi
 * el borde derecho (inicio del mes siguiente) nunca se duplica al navegar y
 * las celdas de relleno se pintan vacias/mudas. Se mantiene la grilla lunes-domingo
 * por estetica, pero sin actividades en las celdas fuera del mes.
 */
export function calcularRango(vista: VistaCalendario, fecha: Dayjs): { desde: Dayjs; hasta: Dayjs } {
  switch (vista) {
    case 'mes':
      return { desde: fecha.startOf('month'), hasta: fecha.add(1, 'month').startOf('month') };
    case 'semana': {
      const desde = inicioSemana(fecha);
      return { desde, hasta: desde.add(1, 'week') };
    }
    case 'dia':
      return { desde: fecha.startOf('day'), hasta: fecha.add(1, 'day') };
    case 'ano':
      return { desde: fecha.startOf('year'), hasta: fecha.add(1, 'year').startOf('year') };
  }
}

export function navegarPeriodo(vista: VistaCalendario, fecha: Dayjs, direccion: 1 | -1): Dayjs {
  switch (vista) {
    case 'mes': return fecha.add(direccion, 'month');
    case 'semana': return fecha.add(direccion, 'week');
    case 'dia': return fecha.add(direccion, 'day');
    case 'ano': return fecha.add(direccion, 'year');
  }
}

export function tituloPeriodo(vista: VistaCalendario, fecha: Dayjs): string {
  switch (vista) {
    case 'mes':
      return fecha.format('MMMM YYYY');
    case 'semana': {
      const inicio = inicioSemana(fecha);
      const fin = inicio.add(6, 'day');
      if (inicio.year() === fin.year() && inicio.month() === fin.month()) {
        return `${inicio.format('D')} - ${fin.format('D')} de ${inicio.format('MMMM YYYY')}`;
      }
      if (inicio.year() === fin.year()) {
        return `${inicio.format('D MMM')} - ${fin.format('D MMM YYYY')}`;
      }
      return `${inicio.format('D MMM YYYY')} - ${fin.format('D MMM YYYY')}`;
    }
    case 'dia':
      return fecha.format('dddd, D [de] MMMM YYYY');
    case 'ano':
      return fecha.format('YYYY');
  }
}

export function claveDia(dia: Dayjs): string {
  return dia.format('YYYY-MM-DD');
}

export function agruparPorDia(actividades: ActividadDTO[]): Map<string, ActividadDTO[]> {
  const mapa = new Map<string, ActividadDTO[]>();
  actividades.forEach((a) => {
    const d = dayjs(a.fechaInicio);
    if (!d.isValid()) return;
    const clave = claveDia(d);
    const lista = mapa.get(clave) ?? [];
    lista.push(a);
    mapa.set(clave, lista);
  });
  mapa.forEach((lista) =>
    lista.sort((x, y) => dayjs(x.fechaInicio).valueOf() - dayjs(y.fechaInicio).valueOf())
  );
  return mapa;
}

/* ── Colores ─────────────────────────────────────────────────────────── */

function hexARgb(hex: string): [number, number, number] | null {
  const limpio = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) return null;
  return [
    parseInt(limpio.slice(0, 2), 16),
    parseInt(limpio.slice(2, 4), 16),
    parseInt(limpio.slice(4, 6), 16),
  ];
}

function hexARgba(hex: string, alpha: number): string {
  const rgb = hexARgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

// Aclara un color hex (#RRGGBB) hacia el blanco para obtener el tono pastel
// de fondo de un bloque. No se usa una paleta fija: se deriva del color real.
export function aclararColor(hex: string): string {
  const rgb = hexARgb(hex);
  if (!rgb) return hex;
  const mezclar = (c: number) => Math.round(c + (255 - c) * 0.82);
  return `rgb(${mezclar(rgb[0])}, ${mezclar(rgb[1])}, ${mezclar(rgb[2])})`;
}

function hslARgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbAHex(r: number, g: number, b: number): string {
  const a = (n: number) => n.toString(16).padStart(2, '0');
  return `#${a(r)}${a(g)}${a(b)}`;
}

// Color estable derivado del id del responsable (rueda de color por angulo dorado).
export function colorDesdeNumero(n: number): string {
  const hue = Math.abs((n * 137.508) % 360);
  const [r, g, b] = hslARgb(hue, 0.6, 0.45);
  return rgbAHex(r, g, b);
}

// Color base de un bloque segun el criterio activo.
export function colorBaseActividad(
  actividad: ActividadDTO,
  criterio: CriterioColor,
  colorPrimario: string,
): string {
  if (criterio === 'servicio') {
    return actividad.servicioColor || colorPrimario;
  }
  return colorDesdeNumero(actividad.responsableId ?? 0);
}

// Densidad de color por dia (vista Anual).
export function densidadDia(cantidad: number, colorPrimario: string): string {
  if (cantidad <= 0) return 'transparent';
  if (cantidad === 1) return hexARgba(colorPrimario, 0.16);
  if (cantidad === 2) return hexARgba(colorPrimario, 0.32);
  if (cantidad === 3) return hexARgba(colorPrimario, 0.5);
  return hexARgba(colorPrimario, 0.7);
}

/* ── Posicionamiento en vistas de horas (Semana / Dia) ──────────────── */

export interface BloqueHora {
  top: number;
  alto: number;
  delgada: boolean;
}

// Calcula la posicion/altura vertical de una actividad dentro de un dia concreto.
// Las actividades multi-dia se anclan a su dia de inicio y se recortan al borde del dia.
export function calcularBloqueHora(actividad: ActividadDTO, dia: Dayjs): BloqueHora {
  const inicioDia = dia.startOf('day');
  const finDia = dia.endOf('day');
  const ini = dayjs(actividad.fechaInicio);
  const fin = actividad.fechaFin ? dayjs(actividad.fechaFin) : null;

  const inicioEfectivo = ini.isBefore(inicioDia) ? inicioDia : ini;
  const top = (inicioEfectivo.hour() + inicioEfectivo.minute() / 60) * ALTURA_HORA;

  if (!fin) {
    // Sin FECHA_FIN: barra delgada en la hora de inicio.
    return { top, alto: 4, delgada: true };
  }

  const finEfectivo = fin.isAfter(finDia) ? finDia : fin;
  if (!finEfectivo.isAfter(inicioEfectivo)) {
    return { top, alto: 4, delgada: true };
  }

  const horas = finEfectivo.diff(inicioEfectivo, 'minute') / 60;
  return { top, alto: Math.max(18, horas * ALTURA_HORA), delgada: false };
}
