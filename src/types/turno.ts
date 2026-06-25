export interface CompaniaTurnoDTO {
  id: number;
  nombre: string;
}

export interface FacturaTurnoDTO {
  id: number;
  noDocumento?: string;
  documento?: string;
  total: number;
  fechaDocumento?: string;
  cliente?: {
    nombre: string;
    codigo: string;
  };
  [key: string]: any;
}

export interface CobroDTO {
  efectivo: number;
  cheque: number;
  transferencia: number;
  tarjetaCredito: number;
  tarjetaDebito: number;
  bono: number;
  tarjetaRegalo: number;
  notaCredito: number;
  pago: number;
  devuelta: number;
  facturaId: number;
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
  cobros: CobroDTO[];
  factura?: {
    asientos?: any[];
    logs?: any[];
    [key: string]: any;
  };
  [key: string]: any;
}
