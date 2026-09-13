import { useCompanyStore } from '../stores/companyStore';
import { useAuthStore } from '../stores/authStore';
export function getMonedaSucursalActiva() {
    const sucursalActiva = useAuthStore.getState().sucursalActiva;
    const sucursales = useCompanyStore.getState().data.sucursales;
    const sucursal = sucursales.find((s) => s.sucursal === sucursalActiva);
    const moneda = sucursal?.parametro?.moneda;
    return {
        simbolo: moneda?.simbolo || 'RD$',
        nombre: moneda?.nombre || 'Peso Dominicano',
        codigo: moneda?.codigo || 'DOP',
    };
}
