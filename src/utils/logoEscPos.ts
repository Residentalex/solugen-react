/**
 * Util para imprimir un logo configurable por plantilla al inicio del ticket ESC/POS.
 *
 * El logo se guarda en la config de la plantilla (base64 o URL) y se convierte a
 * un comando ESC/POS `GS v 0` (imagen en modo 0, 1-bit) que se envía a QZ Tray
 * como `raw` en base64 (los bytes superan 127).
 */
import type { LogoPlantillaConfig } from '../types/reportesConfig';

/** Ancho por defecto del logo en px. */
const ANCHO_DEFAULT_PX = 384;

/** Alto por defecto del logo en px. */
const ALTO_DEFAULT_PX = 120;

/** Umbral de luminancia para convertir a 1-bit (negro = bit 1). */
const THRESHOLD = 128;

/**
 * Carga una imagen desde una data URL base64 o una URL normal.
 * Resuelve con el elemento HTMLImageElement listo para dibujar.
 */
export function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen del logo'));
    img.src = src;
  });
}

/**
 * Convierte una imagen a un mapa de bits 1-bit empaquetado por fila.
 * - Dibuja en canvas con ancho = anchoPx y alto dado o proporcional (mantiene aspect ratio si no se especifica).
 * - Cada pixel: luminancia < 128 = negro = bit 1.
 * - Empaqueta por fila: cada byte = 8 pixeles HORIZONTALES (bit 7 = pixel más a la izquierda).
 * - anchoBytes = ceil(anchoPx / 8). Total = anchoBytes * alto.
 */
export function imagenABits(
  img: HTMLImageElement,
  anchoPx: number,
  altoPx?: number,
): { bits: Uint8Array; anchoBytes: number; alto: number } {
  const ancho = Math.max(1, Math.round(anchoPx));
  const alto = Math.max(1, Math.round(altoPx ?? (img.naturalHeight / img.naturalWidth) * ancho));
  const anchoBytes = Math.ceil(ancho / 8);

  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo obtener el contexto del canvas');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(img, 0, 0, ancho, alto);

  const imageData = ctx.getImageData(0, 0, ancho, alto).data;
  const bits = new Uint8Array(anchoBytes * alto);

  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const idx = (y * ancho + x) * 4;
      const r = imageData[idx];
      const g = imageData[idx + 1];
      const b = imageData[idx + 2];
      // Luminancia ponderada (Rec. 601)
      const luminancia = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luminancia < THRESHOLD) {
        // Negro = bit 1. bit 7 = pixel más a la izquierda.
        const byteIdx = y * anchoBytes + Math.floor(x / 8);
        bits[byteIdx] |= 0x80 >> (x % 8);
      }
    }
  }

  return { bits, anchoBytes, alto };
}

/**
 * Genera el comando ESC/POS `GS v 0` (modo 0) y lo devuelve como base64.
 * Formato: \x1D\x76\x30\x00 + xL xH (anchoBytes LE) + yL yH (alto LE) + datos.
 */
export function generarGSV0Base64(bits: Uint8Array, anchoBytes: number, alto: number): string {
  const header = new Uint8Array(8);
  header[0] = 0x1d; // GS
  header[1] = 0x76; // v
  header[2] = 0x30; // 0
  header[3] = 0x00; // modo 0
  header[4] = anchoBytes & 0xff; // xL
  header[5] = (anchoBytes >> 8) & 0xff; // xH
  header[6] = alto & 0xff; // yL
  header[7] = (alto >> 8) & 0xff; // yH

  const total = header.length + bits.length;
  const bytes = new Uint8Array(total);
  bytes.set(header, 0);
  bytes.set(bits, header.length);

  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Obtiene el base64 del comando ESC/POS completo (alineacion + GS v 0) para el logo de la plantilla.
 * Antepone el comando ESC a N (justificacion) para que la impresora respete la alineacion.
 * Devuelve '' si no hay logo configurado, no se debe mostrar o falla la carga.
 */
export async function obtenerLogoEscPosBase64(logo: LogoPlantillaConfig | undefined): Promise<string> {
  if (!logo?.mostrar) return '';

  // Fuente: base64 (data URL o base64 puro) o URL alternativa.
  let src = '';
  if (logo.base64) {
    src = logo.base64.startsWith('data:') ? logo.base64 : `data:image/png;base64,${logo.base64}`;
  } else if (logo.url) {
    src = logo.url;
  }
  if (!src) return '';

  const anchoPx = logo.anchoPx ?? ANCHO_DEFAULT_PX;

  try {
    const img = await cargarImagen(src);
    const { bits, anchoBytes, alto } = imagenABits(img, anchoPx, logo.altoPx);

    // Comando de alineacion ESC a N (justificacion)
    const alineacion = logo.alineacion ?? 'centro';
    const alineacionCmd: Record<string, string> = {
      izquierda: '\x1B\x61\x00',
      centro: '\x1B\x61\x01',
      derecha: '\x1B\x61\x02',
    };
    const cmdAlineacion = alineacionCmd[alineacion] || alineacionCmd.centro;

    const cmdGSV0 = generarGSV0Base64(bits, anchoBytes, alto);

    // Anteponer comando de alineacion antes del GS v 0
    const fullBytes = cmdAlineacion + atob(cmdGSV0);
    return btoa(fullBytes);
  } catch {
    return '';
  }
}
