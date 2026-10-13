const CENTAVOS_POR_UNIDAD = 100;

export const aCentavos = (valor: unknown): number => {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 0;

  return Math.round((numero + Number.EPSILON) * CENTAVOS_POR_UNIDAD);
};

export const desdeCentavos = (centavos: number): number => centavos / CENTAVOS_POR_UNIDAD;

export const normalizarMonto = (valor: unknown): number => desdeCentavos(aCentavos(valor));

export const sumarMontos = (montos: unknown[]): number =>
  desdeCentavos(montos.reduce<number>((total, monto) => total + aCentavos(monto), 0));

export const restarMontos = (monto: unknown, aplicado: unknown): number =>
  desdeCentavos(aCentavos(monto) - aCentavos(aplicado));

export const limitarMonto = (monto: unknown, limite: unknown): number =>
  desdeCentavos(
    Math.min(Math.max(0, aCentavos(monto)), Math.max(0, aCentavos(limite))),
  );

export const calcularSaldoPendienteSeguro = (
  montoOriginal: unknown,
  pagado: unknown,
  saldoPendiente: unknown,
): number =>
  desdeCentavos(
    Math.max(
      0,
      aCentavos(montoOriginal) - aCentavos(pagado),
      aCentavos(saldoPendiente),
    ),
  );

export const distribuirMonto = (monto: unknown, limites: unknown[]): number[] => {
  let restante = Math.max(0, aCentavos(monto));

  return limites.map((limite) => {
    const aplicado = Math.min(restante, Math.max(0, aCentavos(limite)));
    restante -= aplicado;
    return desdeCentavos(aplicado);
  });
};

export const redistribuirMonto = (
  nuevoTotal: unknown,
  asignaciones: unknown[],
  limites: unknown[],
  preservarAsignaciones: boolean,
): number[] => {
  const asignacionesNormalizadas = limites.map((limite, indice) =>
    limitarMonto(asignaciones[indice] ?? 0, limite),
  );

  if (!preservarAsignaciones) {
    return distribuirMonto(nuevoTotal, limites);
  }

  return aCentavos(sumarMontos(asignacionesNormalizadas)) > aCentavos(nuevoTotal)
    ? distribuirMonto(nuevoTotal, asignacionesNormalizadas)
    : asignacionesNormalizadas;
};
