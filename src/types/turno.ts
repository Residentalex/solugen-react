export interface CompaniaTurnoDTO {
  id: number;
  nombre: string;
}

export interface FacturaTurnoDTO {
  id: number;
  documento: string;
  total: number;
}

export interface TurnoDTO {
  id: number;
  noTurno: string;
  fechaApertura: string;
  fechaCierre: string;
  usuario: { id: number; nombre: string; nombreUsuario: string } | null;
  nombrePOS: string;
  periodo: number;
  cerrado: boolean;
  transferido: boolean;
  total: number;
  sucursal: CompaniaTurnoDTO | null;
  facturas: FacturaTurnoDTO[];
  cobros: any[];
}
