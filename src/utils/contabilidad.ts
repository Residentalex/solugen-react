export function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function esDebito(tipo: any): boolean {
  return tipo === 'D' || tipo === 0;
}

export function esCredito(tipo: any): boolean {
  return tipo === 'C' || tipo === 1;
}
