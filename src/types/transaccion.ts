export interface TransaccionVistaDTO {
  id: number;
  fecha: string;
  documento: string;
  entidad: string;
  concepto: string;
  ncf: string;
  ncfModificado: string;
  referencia: string;
  tipoDocumento: string;
  total: number;
  estado: number;
  periodo: number;
}

export interface FiltroTransaccion {
  cantidad?: number;
  salto?: number;
  desde?: string;
  hasta?: string;
  documento?: string;
  nCF?: string;
  concepto?: string;
  entidad?: string;
  tipoEntidad?: string;
}
