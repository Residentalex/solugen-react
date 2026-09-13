export const OrigenCuenta = {
    Debito: 0,
    Credito: 1,
    Desconocido: 2,
};
// --- Impuestos ---
export const MetodoCalculoImpuesto = {
    Porcentaje: 'Porcentaje',
    Fijo: 'Fijo',
};
export const TipoImpuesto = {
    I: 'I', // Impuesto
    L: 'L', // Liquidación
    V: 'V', // Informativo
    R: 'R', // Retencion
};
export const AmbitoImpuesto = {
    Venta: 'Venta',
    Compra: 'Compra',
    Ninguno: 'Ninguno',
};
export const BaseCalculoImpuesto = {
    Indefinido: 'Indefinido',
    MontoNeto: 'MontoNeto',
    MontoTotal: 'MontoTotal',
};
