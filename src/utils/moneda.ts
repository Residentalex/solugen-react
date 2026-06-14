import { useCompanyStore } from '../stores/companyStore';
import { useAuthStore } from '../stores/authStore';

export function getMonedaSucursalActiva(): { simbolo: string; nombre: string; codigo: string } {
  const sucursalActiva = useAuthStore.getState().sucursalActiva;
  const sucursales = useCompanyStore.getState().data.sucursales;
  const sucursal = sucursales.find((s: any) => s.sucursal === sucursalActiva);
  const moneda = sucursal?.parametro?.moneda;
  return {
    simbolo: moneda?.simbolo || 'RD$',
    nombre: moneda?.nombre || 'Peso Dominicano',
    codigo: moneda?.codigo || 'DOP',
  };
}
