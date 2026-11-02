import type { ImportarConteoLineaDTO } from './conteo';

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
  /** Costo total del sistema (suma de CostoAlterno) a la fecha de corte. */
  costoSistema?: number;
  costoUnitario: number;
  totalAjuste: number;
  /** Entrada que origino el costo, o 'Maestro'. */
  referencia: string;
  /**
   * Advertencia de la linea (por ejemplo, codigo no encontrado en el maestro
   * de productos). No bloquea el calculo; la pantalla la muestra.
   */
  advertencia?: string | null;
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
  /**
   * Evento que agrupa a los conteos. Opcional: sin evento hay que indicar
   * `fecha`.
   */
  codEvento?: string;
  inventIds: number[];
  almacen: string;
  /** Fecha de corte en formato yyyyMMddHHmmss. Si se omite, se usa la del evento. */
  fecha?: string;
  cuenta?: string;
  /**
   * Cuando es true, agrega al ajuste una linea por cada producto con existencia
   * distinta de cero en el almacen que NO fue contado, para llevarlo a 0.
   */
  incluirNoContados: boolean;
  /**
   * Máximo de productos por documento al materializar el ajuste. El backend
   * divide la EPJ/SPJ en varios documentos si hay más líneas que este límite.
   * Por defecto 200.
   */
  maximoProductosPorDocumento?: number;
  /**
   * Usuario que ejecuta la operacion (USUARIOS.CUENTA). Se resuelve a
   * USUARIOS.USUARIOID y se persiste en INVENTPROC.USUARIOID para trazabilidad
   * del procesable/ajuste.
   */
  usuario?: string;
  /**
   * Lineas del Excel para calcular la revision sin leer DINVENT ni validar
   * conteos. Se usan en la revision previa a persistir el conteo.
   */
  lineas?: ImportarConteoLineaDTO[];
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

  /**
   * Listas cuando el backend dividió el ajuste en varios documentos por el
   * límite `maximoProductosPorDocumento`. Cuando hay un solo documento (o el
   * backend no expone las listas), se usan los campos singulares de arriba.
   */
  entradaIds?: number[];
  salidaIds?: number[];
  entradaDocumentos?: string[];
  salidaDocumentos?: string[];
}

/**
 * Solicitud del flujo completo de conteo fisico: calcular el ajuste, generar
 * los documentos EPJ/SPJ, aplicarlos (mueve stock) y cerrar el inventario.
 */
export interface ProcesarConteoCierreRequestDTO {
  /**
   * Evento que agrupa a los conteos. Opcional: sin evento hay que indicar
   * `fecha`.
   */
  codEvento?: string;
  inventIds: number[];
  almacen: string;
  /** Fecha de corte en formato yyyyMMddHHmmss. Si se omite, se usa la del evento. */
  fecha?: string;
  cuenta?: string;
  usuario?: string;
  /**
   * Cuando es true, lleva a 0 la existencia de los productos del almacen que no
   * fueron contados (agrega una linea de salida por cada uno).
   */
  incluirNoContados: boolean;
  /**
   * Máximo de productos por documento al materializar el ajuste. El backend
   * divide la EPJ/SPJ en varios documentos si hay más líneas que este límite.
   * Por defecto 200.
   */
  maximoProductosPorDocumento?: number;
}

/**
 * Resumen del flujo completo de conteo fisico. Refleja hasta donde llego el
 * flujo: documentos generados/aplicados y si el cierre se ejecuto.
 */
export interface ProcesarConteoCierreResultDTO {
  procesableId: number;
  procesableNo: number;
  entradaId: number | null;
  /** Numero de la Entrada de Ajuste (EPJ-NN). Null si no hubo diferencias positivas. */
  entradaDocumento?: string | null;
  entradaAplicada: boolean;
  salidaId: number | null;
  /** Numero de la Salida de Ajuste (SPJ-NN). Null si no hubo diferencias negativas. */
  salidaDocumento?: string | null;
  salidaAplicada: boolean;
  cierreGenerado: boolean;
  /**
   * Explicacion del resultado del cierre cuando no se genero
   * (cierreGenerado = false), indicando el proximo cierre calculado.
   * Null cuando el cierre se genero normalmente.
   */
  mensajeCierre?: string | null;

  /**
   * Listas cuando el backend dividió el ajuste en varios documentos por el
   * límite `maximoProductosPorDocumento`. Cuando hay un solo documento (o el
   * backend no expone las listas), se usan los campos singulares de arriba.
   */
  entradaIds?: number[];
  salidaIds?: number[];
  entradaDocumentos?: string[];
  salidaDocumentos?: string[];
}