import { reporteSolicitudPagoApi } from '../api/reporteSolicitudPagoApi';
import type { FiltroImpresionLoteSolicitudPago } from '../types/solicitudPago';

/**
 * Imprime en lote Solicitudes de Pago abriendo el PDF en una pestaña nueva.
 *
 * Lanza un `Error` cuyo `message` es el mensaje real devuelto por el backend
 * cuando la impresión falla (p. ej. un 400), para que el llamador lo muestre
 * con `message.error`. Devuelve sin lanzar cuando el PDF se genera correctamente.
 */
export async function imprimirSolicitudPagoLote(
  sucursal: number,
  params: FiltroImpresionLoteSolicitudPago
): Promise<void> {
  try {
    const blob = await reporteSolicitudPagoApi.imprimirLote(sucursal, params);
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    // No se revoca el blob URL con `URL.revokeObjectURL`: revocarlo justo después
    // de abrir la pestaña puede cortar la carga del PDF antes de que el navegador
    // termine de leerlo. La URL queda viva en la pestaña abierta y se libera al cerrarla.
  } catch (err: any) {
    let mensaje = 'Error al generar la impresión en lote';
    try {
      const data = err?.response?.data;
      const texto = data instanceof Blob ? await data.text() : '';
      if (texto) {
        const parsed = JSON.parse(texto);
        mensaje = parsed?.errorMessage || mensaje;
      } else if (err?.response?.data?.errorMessage) {
        mensaje = err?.response?.data?.errorMessage;
      }
    } catch {
      // Respuesta no JSON o sin detalle: se conserva el mensaje genérico.
      mensaje = err?.message || mensaje;
    }
    throw new Error(mensaje);
  }
}
