import { describe, expect, it } from 'vitest';
import {
  calcularSaldoPendienteSeguro,
  distribuirMonto,
  redistribuirMonto,
  sumarMontos,
} from './distribucionMontos';

describe('distribución de montos de documentos relacionados', () => {
  it('calcula el pendiente desde el mayor saldo financiero válido', () => {
    expect(calcularSaldoPendienteSeguro(1059.9, 529.95, 0)).toBe(529.95);
    expect(calcularSaldoPendienteSeguro(1059.9, 529.95, 529.94)).toBe(529.95);
  });

  it('conserva el pendiente de una factura parcialmente abonada', () => {
    expect(calcularSaldoPendienteSeguro(7788, 7431.6, 356.4)).toBe(356.4);
  });

  it('no pierde el centavo al restar montos con residuo flotante', () => {
    expect(calcularSaldoPendienteSeguro(1005.63, 907.12, 0)).toBe(98.51);
  });

  it('redistribuye automáticamente cuando cambia el total', () => {
    expect(redistribuirMonto(8, [6, 4], [6, 6], false)).toEqual([6, 2]);
    expect(redistribuirMonto(12, [6, 2], [6, 6], false)).toEqual([6, 6]);
  });

  it('preserva asignaciones manuales parciales y sólo las recorta si exceden el total', () => {
    expect(redistribuirMonto(12, [2.15, 1.05], [10, 10], true)).toEqual([2.15, 1.05]);
    expect(redistribuirMonto(2, [2.15, 1.05], [10, 10], true)).toEqual([2, 0]);
  });

  it('no pierde centavos al distribuir importes pequeños', () => {
    const distribucion = distribuirMonto(0.39, Array.from({ length: 39 }, () => 0.01));

    expect(distribucion).toHaveLength(39);
    expect(distribucion.every((monto) => monto === 0.01)).toBe(true);
    expect(sumarMontos(distribucion)).toBe(0.39);
  });

  it('conserva el total al quitar todos los documentos y llamarlos nuevamente', () => {
    const totalDocumento = 9329.85;
    const pendientes = [8401.68, 682.44, 824.1];
    const primeraLlamada = distribuirMonto(totalDocumento, pendientes);

    expect(sumarMontos(primeraLlamada)).toBe(totalDocumento);

    const documentosEliminados = primeraLlamada.map(() => 0);
    expect(sumarMontos(documentosEliminados)).toBe(0);

    const segundaLlamada = distribuirMonto(totalDocumento, pendientes);
    expect(segundaLlamada).toEqual(primeraLlamada);
    expect(sumarMontos(segundaLlamada)).toBe(totalDocumento);
  });
});
