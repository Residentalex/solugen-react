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
  ncf: string;
  total: number;
  estado: number;
  periodo: number;
}

export interface FiltroTRP {
  cantidad?: number;
  salto?: number;
  desde?: string;
  hasta?: string;
  documento?: string;
  concepto?: string;
  almacen?: string;
}