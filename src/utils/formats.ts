/**
 * Convierte un string a Title Case (primera letra de cada palabra en mayúscula,
 * el resto en minúscula).
 */
export function toTitleCase(s: string): string {
  if (!s) return '';
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}
