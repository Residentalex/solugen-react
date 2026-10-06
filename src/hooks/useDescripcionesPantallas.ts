import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pantallaApi } from '../api/pantallaApi';
import { useAuthStore } from '../stores/authStore';

/**
 * Descripciones (AUTH_PANTALLA.DESCRIPCION) de todas las pantallas, indexadas por codigo.
 *
 * `usuario.pantallas` y los endpoints de rol/usuario no devuelven la descripcion, asi que
 * se pide el catalogo completo una vez (`Pantalla/{sucursal}`) y se arma un mapa
 * codigo -> descripcion. React Query mantiene el cache, asi que el request se repite
 * una sola vez por sucursal mientras la sesion siga viva.
 *
 * Se omiten las pantallas sin descripcion: las que no aparecen en el mapa no muestran
 * texto bajo el breadcrumb.
 */
export function useDescripcionesPantallas(): Record<string, string> {
  const sucursalActiva = useAuthStore((s) => s.usuario?.sucursalActiva);

  const { data } = useQuery({
    queryKey: ['pantallas-descripciones', sucursalActiva],
    queryFn: () => pantallaApi.obtenerListado(sucursalActiva as number),
    enabled: sucursalActiva !== null && sucursalActiva !== undefined,
  });

  return useMemo<Record<string, string>>(() => {
    const mapa: Record<string, string> = {};
    (data || []).forEach((p) => {
      const codigo = p.codigo?.trim().toUpperCase();
      const descripcion = p.descripcion?.trim();
      if (codigo && descripcion) {
        mapa[codigo] = descripcion;
      }
    });
    return mapa;
  }, [data]);
}