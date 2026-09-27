/**
 * Captura de pantalla del DOM de la aplicacion (equivalente a un printscreen
 * del ERP) usando html2canvas con import dinamico, igual que VisanetTest.tsx.
 *
 * Uso:
 *   const captura = await capturarPantalla();
 *   if (captura) { new File([captura.blob], captura.nombreArchivo, { type: captura.tipoMime }) }
 */

export interface CapturaPantalla {
  blob: Blob;
  nombreArchivo: string;
  tipoMime: string;
  dataUrl: string;
}

const ANCHO_MAXIMO = 1600;
const CALIDAD_JPEG = 0.82;

export async function capturarPantalla(): Promise<CapturaPantalla | null> {
  const { default: html2canvas } = await import('html2canvas');

  const alturaVentana = window.innerHeight;
  const escala = window.devicePixelRatio >= 1.5 ? 2 : 1;

  const canvas = await html2canvas(document.body, {
    scale: escala,
    y: 0,
    height: alturaVentana,
    windowHeight: alturaVentana,
    scrollX: 0,
    scrollY: 0,
    useCORS: true,
    logging: false,
    backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff',
    ignoreElements: (el) => el.hasAttribute('data-captura-ocultar'),
    onclone: (doc) => {
      doc.querySelectorAll('[data-captura-ocultar]').forEach((el) => el.remove());
      doc.querySelectorAll('.ant-drawer-root, .ant-modal-root, .ant-message').forEach((el) => el.remove());
    },
  });

  const comprimida = comprimirCanvas(canvas, ANCHO_MAXIMO);
  const dataUrl = comprimida.toDataURL('image/jpeg', CALIDAD_JPEG);
  const blob = await (await fetch(dataUrl)).blob();

  const fecha = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');

  return {
    blob,
    dataUrl,
    tipoMime: 'image/jpeg',
    nombreArchivo: `incidencia_${fecha}.jpg`,
  };
}

function comprimirCanvas(canvas: HTMLCanvasElement, anchoMaximo: number): HTMLCanvasElement {
  if (canvas.width <= anchoMaximo) return canvas;

  const escala = anchoMaximo / canvas.width;
  const destino = document.createElement('canvas');
  destino.width = anchoMaximo;
  destino.height = Math.round(canvas.height * escala);

  const ctx = destino.getContext('2d');
  if (!ctx) return canvas;
  ctx.drawImage(canvas, 0, 0, destino.width, destino.height);
  return destino;
}
