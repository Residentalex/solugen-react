export interface MovimientoVistaDTO {
  id: number;
  fecha: string;
  documento: string;
  entidad: string;
  diasCredito: number;
  concepto: string;
  almacenOrigen: string;
  almacenDestino: string;
  ordenCompra: string;
  referencia: string;
  total: number;
  estado: number;
  periodo: number;
}

export interface FiltroDVC {
  cantidad?: number;
  salto?: number;
  desde?: string;
  hasta?: string;
  documento?: string;
  concepto?: string;
  entidad?: string;
  referencia?: string;
  almacen?: string;
}
