/**
 * Catalogo de eventos de inventario (EVENTOS).
 *
 * Distinto del `EventoDTO` declarado en `src/types/conteo.ts`: ese solo trae
 * `{ id, nombre }` porque se usa como objeto anidado del conteo, mientras que
 * este refleja el DTO completo del backend (`DTOs/Administracion/EventoDTO.cs`).
 */
export interface EventoInventarioDTO {
  nombre: string;
  codigo: string;
  fecha: string;
  idExterno: string;
  estado: boolean;
  tipo: string;
}