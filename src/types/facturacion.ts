export interface FacturaVistaDTO {
  id: number;
  fecha: string;
  documento: string;
  entidad: string;
  diasCredito: number;
  concepto: string;
  almacen: string;
  ordenCompra: string;
  referencia: string;
  ncf: string;
  ncfModificado: string;
  turnoID: string;
  tipoDocumento: string;
  total: number;
  estado: number;
  periodo: number;
}

export interface FiltroFacturacion {
  cantidad?: number;
  salto?: number;
  desde?: string;
  hasta?: string;
  documento?: string;
  nCF?: string;
  concepto?: string;
  cliente?: string;
  referencia?: string;
  almacen?: string;
}
