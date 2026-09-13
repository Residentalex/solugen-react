export function formatNumber(n) {
    return new Intl.NumberFormat('es-DO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n);
}
export function esDebito(tipo) {
    return tipo === 'D' || tipo === 0;
}
export function esCredito(tipo) {
    return tipo === 'C' || tipo === 1;
}
