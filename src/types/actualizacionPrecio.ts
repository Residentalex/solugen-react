export interface ActualizacionPrecioDTO {
  idExterno: string;
  documento: string;
  fecha: string;
  fechaParaAplicar: string;
  almacen: string;
  familia: string;
  docReferencia: string;
  estado: string;
  redondear: boolean;
  ajuste: number;
  autorizado: boolean;
}

export interface ActualizacionPrecioLineaDTO {
  id: string;
  actPrecioId: string;
  codPro: string;
  descripcion: string;
  precio: number;
  pAumento: number;
  aumento: number;
  precioSug: number;
  marcada: boolean;
  costoPiv: number;
  pMargen: number;
  impMargen: number;
  pMargPM: number;
  precioMinSug: number;
  precioMin: number;
}

export interface ActualizacionPrecioDetalleDTO {
  idExterno: string;
  documento: string;
  fecha: string;
  fechaParaAplicar: string;
  almacenId: string;
  almacenNombre: string;
  familiaId: string;
  familiaNombre: string;
  docReferencia: string;
  estado: string;
  redondear: boolean;
  ajuste: number;
  autorizado: boolean;
  codPro1: string;
  codPro2: string;
  base: string;
  porPivote: number;
  porPrecioMin: number;
  precioAct: boolean;
  todosAlm: boolean;
  todasFam: boolean;
  sucursal: string;
  usuarioId: number;
  lineas: ActualizacionPrecioLineaDTO[];
}

export interface ActualizacionPrecioLineaCrearDTO {
  codPro: string;
  descripcion: string;
  precio: number;
  pAumento: number;
  aumento: number;
  precioSug: number;
  marcada: boolean;
  costoPiv: number;
  pMargen: number;
  impMargen: number;
  pMargPM: number;
  precioMinSug: number;
  precioMin: number;
}

export interface ActualizacionPrecioCrearDTO {
  fecha: string;
  fechaParaAplicar: string;
  almacenId?: string;
  familiaId?: string;
  docReferencia: string;
  redondear: boolean;
  ajuste: number;
  codPro1?: string;
  codPro2?: string;
  base: string;
  porPivote: number;
  porPrecioMin: number;
  precioAct: boolean;
  todosAlm: boolean;
  todasFam: boolean;
  lineas: ActualizacionPrecioLineaCrearDTO[];
}
