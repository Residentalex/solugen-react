export interface CotizacionVentaDTO {
  id: number;
  fechaDocumento: string;
  tipoDocumento: number;
  noDocumento: string;
  cliente: string;
  concepto: string;
  total: number;
  estado: number;
  periodo: number;
  nota?: string;
}

export interface FiltroCotizacionVenta {
  cantidad?: number;
  salto?: number;
  desde?: string;
  hasta?: string;
  documento?: string;
  concepto?: string;
  cliente?: string;
}
