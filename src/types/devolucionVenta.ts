export interface EntidadDTO {
  nombre: string;
  codigo: string;
  idExterno: string;
  identificacion: string;
}

export interface ConceptoDTO {
  id: number;
  codigo: string;
  nombre: string;
  descrip?: string;
}

export interface FacturaDTO {
  id: number;
  noDocumento: string;
  fechaDocumento: string;
}

export interface AlmacenDTO {
  codigo: string;
  nombre: string;
}

export interface DevolucionVentaDTO {
  id: number;
  fechaDocumento: string;
  tipoDocumento: number;
  noDocumento: string;
  entidad: EntidadDTO;
  cliente: EntidadDTO;
  concepto: ConceptoDTO;
  factura: FacturaDTO;
  almacen: AlmacenDTO;
  ncf: string;
  diasCredito: number;
  total: number;
  estado: number;
  periodo: number;
}

export interface FiltroDevVenta {
  cantidad?: number;
  salto?: number;
  desde?: string;
  hasta?: string;
  documento?: string;
  nCF?: string;
  concepto?: string;
  cliente?: string;
  factura?: string;
  almacen?: string;
}
