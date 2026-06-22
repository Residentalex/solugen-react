export interface BeneficioMock {
  id: string;
  icono: string;
  titulo: string;
  descripcion: string;
}

export const mockBeneficios = (): BeneficioMock[] => [
  { id: 'B1', icono: 'TruckOutlined', titulo: 'Envío Rápido', descripcion: 'Entrega en 24-48 horas en todo el país' },
  { id: 'B2', icono: 'SafetyOutlined', titulo: 'Pago Seguro', descripcion: 'Transacciones protegidas con encriptación SSL' },
  { id: 'B3', icono: 'CustomerServiceOutlined', titulo: 'Soporte 24/7', descripcion: 'Atención al cliente todos los días del año' },
  { id: 'B4', icono: 'CheckCircleOutlined', titulo: 'Garantía Real', descripcion: 'Todos los productos con garantía del fabricante' },
  { id: 'B5', icono: 'UndoOutlined', titulo: 'Devoluciones Fáciles', descripcion: '30 días para devolver sin complicaciones' },
  { id: 'B6', icono: 'SafetyCertificateOutlined', titulo: 'Productos Originales', descripcion: 'Solo vendemos productos 100% originales' },
];

/** Formatear moneda en RD$ */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(value);
}
