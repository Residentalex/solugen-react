/**
 * Documento procesable de conteo fisico.
 *
 * Un procesable unifica N conteos fisicos (INVENT) de un mismo evento
 * (EVENTOS.CODEVENT) y calcula por producto la diferencia entre la cantidad
 * contada y la existencia del sistema. Un ajuste positivo genera Entrada de
 * Almacen; uno negativo genera Salida de Almacen.
 */

/** Conteo fisico listo para unificarse en un documento procesable. */
export interface ConteoProcesableDTO {
  inventId: number;
  documento: string;
  fecha: string;
  codigoAlmacen: string;
  almacen: string;
  nombreSuplidor: string;
  usuario: string;
  cantidad: number;
  costo: number;
  cantidadDetalles: number;
  bloqueado: boolean;
  /** El conteo ya fue unificado en un procesable vigente. */
  procesado: boolean;
  procesableId: number | null;
  procesableNo: number | null;
}

/** Ajuste de un producto dentro del calculo del conteo. */
export interface AjusteConteoDTO {
  codigo: string;
  /**
   * Descripcion lista para mostrar. El backend la envia con
   * EncodingHelper.Fix, porque DINVENT.DESCRIPCION guarda los bytes Latin-1
   * originales y sin corregir salen como "MO?A DE REGALO".
   */
  articulo: string;
  /**
   * Descripcion sin corregir, tal cual esta en la base. El backend la usa para
   * armar el detalle del documento de ajuste porque EncodingHelper.Fix es
   * destructivo si se aplica dos veces.
   */
  articuloCrudo: string;
  familia: string;
  codigoAlmacen: string;
  almacen: string;
  cantidadContada: number;
  cantidadSistema: number;
  /** cantidadContada - cantidadSistema. Positivo = ENP, negativo = SAP. */
  cantidadAjuste: number;
  costoUnitario: number;
  totalAjuste: number;
  /** Entrada que origino el costo, o 'Maestro'. */
  referencia: string;
  /** Numeros de conteo (INVENT.NOINVENT) que aportaron a esta linea. */
  conteosOrigen: string[];
  /**
   * INVENTID de los conteos que aportaron. Va aparte de conteosOrigen porque es
   * la clave con la que el backend bloquea un conteo para que no se vuelva a
   * procesar, y una linea puede venir de varios conteos a la vez.
   */
  conteosOrigenId: number[];
}

/** Solicitud del calculo de ajuste de un conjunto de conteos unificados. */
export interface AjusteConteoRequestDTO {
  codEvento: string;
  inventIds: number[];
  almacen: string;
  /** Fecha de corte en formato yyyyMMddHHmmss. Si se omite, se usa la del evento. */
  fecha?: string;
  cuenta?: string;
}

/**
 * Resultado de generar los documentos de ajuste de un conteo fisico.
 *
 * Un ajuste positivo genera una Entrada de Ajuste (EPJ) y uno negativo una
 * Salida de Ajuste (SPJ). Ambos nacen en borrador: el stock no cambia hasta
 * que se aplican desde la pantalla de entradas o salidas de almacen.
 */
export interface AjusteConteoGeneradoDTO {
  procesableId: number;
  procesableNo: number;
  codEvento: string;
  codigoAlmacen: string;
  almacen: string;
  fecha: string;

  /** TransacId de la entrada de ajuste. Null si no hubo diferencias positivas. */
  entradaId: number | null;
  /** Documento de la entrada de ajuste, del tipo EPJ-NN. */
  entradaDocumento: string | null;
  conceptoEntrada: string | null;

  /** TransacId de la salida de ajuste. Null si no hubo diferencias negativas. */
  salidaId: number | null;
  /** Documento de la salida de ajuste, del tipo SPJ-NN. */
  salidaDocumento: string | null;
  conceptoSalida: string | null;

  cantidadLineasEntrada: number;
  cantidadLineasSalida: number;
  cantidadEntrada: number;
  cantidadSalida: number;
  totalEntrada: number;
  totalSalida: number;
}