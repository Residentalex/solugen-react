export interface DenominacionDTO {
  id?: number;
  descripcion: string;
  valor: number;
  tipo: 'B' | 'M';
  activo: boolean;
  orden: number;
}
