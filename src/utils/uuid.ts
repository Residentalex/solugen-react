/**
 * Genera un UUID v4 compatible con RFC 4122.
 * Usa crypto.randomUUID() cuando está disponible (HTTPS, navegadores modernos)
 * y fallback a Math.random() en entornos no seguros (HTTP) o navegadores antiguos.
 */
export function generarUUID(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Fallback para entornos no seguros o navegadores antiguos
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
