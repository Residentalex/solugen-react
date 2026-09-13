/**
 * Tipos para la configuracion de plantillas de reportes (ESC/POS).
 * Corresponde a /reportes/config del backend (ReportePlantillaDTO).
 */

export type AnchoLineaTicket = 32 | 42 | 48 | 54;

/** Secciones opcionales de la plantilla (todas opcionales: el backend guarda el JSON tal cual). */
export interface PlantillaEncabezadoConfig {
  mostrarCompania?: boolean;
  mostrarDireccion?: boolean;
  mostrarTelefono?: boolean;
  mostrarRnc?: boolean;
  /** Formato por línea del encabezado (compañía, dirección, teléfono, RNC). */
  formato?: PlantillaEncabezadoFormatoConfig;
}

export interface PlantillaEncabezadoFormatoConfig {
  compania?: FormatoItemTicket;
  direccion?: FormatoItemTicket;
  telefono?: FormatoItemTicket;
  rnc?: FormatoItemTicket;
}

/** Título del documento: texto editable + formato opcional. */
export interface PlantillaTituloConfig {
  texto?: string;
  formato?: FormatoItemTicket;
}

export type TipoCampoDTO = 'texto' | 'fecha' | 'hora' | 'dinero' | 'numero' | 'dias_restantes';

export type AlineacionTicket = 'izquierda' | 'centro' | 'derecha';

export type TamanoLetraTicket = 'normal' | 'doble' | 'doble_b' | 'doble_altura' | 'doble_ancho' | 'triple' | 'condensada';

/** Formato de impresión opcional de un ítem del ticket. Todos opcionales = formato actual. */
export interface FormatoItemTicket {
  /** Alineación de la línea. Ausente = izquierda. */
  alineacion?: AlineacionTicket;
  /** true = toda la línea en negrita; false = sin negrita; ausente = patrón natural del ítem (label en negrita). */
  negrita?: boolean;
  /** Tamaño de letra. Ausente = normal. */
  tamano?: TamanoLetraTicket;
}

/** Texto libre configurable: texto + formato opcional. */
export interface TextoLibreConfig extends FormatoItemTicket {
  /** Texto multilinea (se divide por '\n'). */
  texto: string;
}

/** Firma configurable: texto + linea de guiones con posicion. */
export interface FirmaConfig {
  /** Texto de la firma (ej: 'Firma autorizada'). */
  texto: string;
  /** Posicion de la linea de guiones respecto al texto. */
  linea: 'arriba' | 'alado';
}

/** Definición de un campo DTO (base de datos) agregable al ticket, con formato opcional. */
export interface PlantillaCamposDTOConfig extends FormatoItemTicket {
  /** Label que se imprime antes del valor (en negrita, como los campos estándar). */
  label: string;
  /** Ruta de la propiedad sobre el data del formateador, con puntos, ej. 'cliente.nombre'. */
  ruta: string;
  /** Formato de salida del valor. */
  tipo: TipoCampoDTO;
}

export interface PlantillaCamposConfig {
  /** Orden de los campos del documento (claves estándar + ítems especiales SEPARADOR/ESPACIO/LIBRE:<id>/DTO:<id>). */
  orden?: string[];
  /** Map campo -> visible. */
  visibles?: Record<string, boolean>;
  /** Labels editables por campo: clave del campo -> label a imprimir. */
  labels?: Record<string, string>;
  /** Formatos por campo estándar: clave del campo -> formato de impresión. */
  formatos?: Record<string, FormatoItemTicket>;
  /** Textos libres fijos: id -> { texto, alineacion?, negrita?, tamano? }. */
  textosLibres?: Record<string, TextoLibreConfig>;
  /** Campos de la base de datos: id -> { label, ruta, tipo, alineacion?, negrita?, tamano? }. */
  camposDTO?: Record<string, PlantillaCamposDTOConfig>;
  /** Tabulación de valores: alinea los valores de los campos en una columna fija. */
  tabular?: { ancho?: number };
}

export interface PlantillaDetalleColumnasConfig {
  codigo?: boolean;
  cantidad?: boolean;
  precio?: boolean;
  itbis?: boolean;
  total?: boolean;
  /** Anchos personalizados por columna (en caracteres). Si no se especifica, se calculan proporcionalmente. */
  anchos?: {
    codigo?: number;
    cantidad?: number;
    precio?: number;
    itbis?: number;
    total?: number;
  };
}

/** Formato por fila del detalle (cabecera de columnas, línea del artículo, fila de valores). */
export interface PlantillaDetalleFormatoConfig {
  /** Fila de títulos de columnas. Solo usa negrita/tamaño (la alineación es interna por columna). */
  cabecera?: FormatoItemTicket;
  /** Línea del nombre del artículo (formato completo). */
  articulo?: FormatoItemTicket;
  /** Fila de números (solo negrita/tamaño; la alineación es interna por columna). */
  valores?: FormatoItemTicket;
}

export interface PlantillaDetalleConfig {
  columnas?: PlantillaDetalleColumnasConfig;
  formato?: PlantillaDetalleFormatoConfig;
}

/** Formato por línea de los totales. */
export interface PlantillaTotalesFormatoConfig {
  gravado?: FormatoItemTicket;
  subtotal?: FormatoItemTicket;
  itbis?: FormatoItemTicket;
  descuento?: FormatoItemTicket;
  total?: FormatoItemTicket;
}

export interface PlantillaTotalesConfig {
  mostrarGravado?: boolean;
  mostrarSubtotal?: boolean;
  mostrarItbis?: boolean;
  mostrarDescuento?: boolean;
  formato?: PlantillaTotalesFormatoConfig;
}

export interface PlantillaCobrosConfig {
  mostrarCobros?: boolean;
  /** Formato de las líneas de cobros (EFECTIVO/CHEQUE/... FPV; medioCobro FRI) y DEVUELTA. */
  formato?: FormatoItemTicket;
}

export interface PlantillaPieConfig {
  textoPie?: string;
}

export type FontFamilyTicket = 'Courier New' | 'Consolas' | 'Lucida Console' | 'Segoe UI Mono';

export interface PlantillaOpcionesConfig {
  anchoLinea?: AnchoLineaTicket;
  /** Cantidad de lineas de feed antes del corte. */
  feedCorte?: number;
  /** Familia de fuente monospace para la vista previa (la impresora real usa su propia fuente). */
  fontFamily?: FontFamilyTicket;
}

/** Logo configurable por plantilla (se imprime al inicio del ticket). */
export interface LogoPlantillaConfig {
  /** Mostrar el logo al imprimir. */
  mostrar: boolean;
  /** Logo en base64 (data URL o base64 puro) — viaja con la plantilla. */
  base64?: string;
  /** URL alternativa (opcional, ej. '/images/visanet.png'). */
  url?: string;
  /** Ancho del logo en px (default 384). */
  anchoPx?: number;
  /** Alineación del logo en el ticket. Default: 'centro'. */
  alineacion?: AlineacionTicket;
  /** Alto del logo en px. Default: 120. */
  altoPx?: number;
}

// ===== Modelo por ZONAS (full manipulable) =====

/** Tipos de zona ordenables y reutilizables del ticket. */
export type TipoZonaTicket =
  | 'encabezado_pagina'        // Encabezado de página
  | 'encabezado_reporte'       // Encabezado de reporte
  | 'cabecera_grupo_detalle'   // Cabecera de grupo de detalle (columnas CODIGO/CANT/PRECIO/ITBIS/TOTAL)
  | 'detalle'                  // Detalle (filas de artículos/transacciones)
  | 'pie_detalle'              // Pie de detalle (subtotales por grupo)
  | 'totales'                  // Totales
  | 'cobros'                   // Cobros
  | 'pie_reporte'              // Pie de reporte
  | 'pie_pagina'               // Pie de página
  | 'banda';                   // Banda libre (area sin comportamiento especifico)

/** Claves de campos del documento imprimibles como CAMPO:<clave>. */
export type ClaveCampoTicket =
  | 'COMPANIA' | 'DIRECCION' | 'TELEFONO' | 'RNC'
  | 'NCF' | 'FECHA' | 'HORA'
  | 'TIPO' | 'TIPO_COMP' | 'CONCEPTO' | 'ENTIDAD' | 'ENTIDAD_ID' | 'NOTA'
  | 'FECHA_VENCIMIENTO_NCF' | 'SECUENCIA_NCF'
  | 'TITULO'
  | 'CAJERO' | 'CAJA' | 'TURNO' | 'NO' | 'CLIENTE' | 'RNC_CLIENTE'
  | 'FECHA_IMPRESION' | 'HORA_IMPRESION' | 'NUM_DETALLES'
  | 'CODIGO_SEGURIDAD' | 'FECHA_FIRMA_DIGITAL' | 'CODIGO_QR' | 'CODIGO_BARRAS'
  | 'FAX' | 'SLOGAN'
  // Voucher Visanet
  | 'SUCURSAL' | 'ID_COMERCIO' | 'TIPO_OP' | 'ISSUER' | 'TRANS' | 'AUTORIZACION' | 'TOTAL' | 'RESULTADO';

/** Claves de líneas sueltas de totales: TOTAL:<clave>. */
export type ClaveTotalTicket =
  | 'TOTAL_GRAVADO' | 'SUBTOTAL' | 'ITBIS' | 'DESCUENTO' | 'TOTAL' | 'TOTAL_EXENTO';

/** Claves de líneas sueltas de cobros: COBRO:<clave>. */
export type ClaveCobroTicket =
  | 'EFECTIVO' | 'CHEQUE' | 'TARJETA_CREDITO' | 'TARJETA_DEBITO' | 'TRANSFERENCIA'
  | 'BONO' | 'TARJETA_REGALO' | 'NOTA_CREDITO' | 'DEVUELTA' | 'MEDIO_COBRO';

/** Caracteres de línea disponibles para SEPARADOR. */
export type CaracterSeparadorTicket = '-' | '=' | '─' | '_' | 'linea' | 'linea_gruesa';

/** Claves de campos de detalle: DETALLE:<clave>. */
export type ClaveCampoDetalleTicket =
  | 'CODIGO' | 'ARTICULO' | 'CANTIDAD' | 'PRECIO' | 'ITBIS' | 'TOTAL'
  | 'DOCUMENTO' | 'MONTO_ORIG' | 'PAGADO' | 'APLICADO';

/** Referencia de una línea dentro de una zona (qué imprime). */
export type RefLineaTicket =
  | 'ESPACIO'
  | 'SEPARADOR'
  | `LIBRE:${string}`               // texto libre referenciado en config.textosLibres
  | `DTO:${string}`                 // campo BD referenciado en config.camposDTO
  | `FIRMA:${string}`               // firma configurable referenciada en config.firmas
  | `CAMPO:${ClaveCampoTicket}`     // campo del documento
  | `TOTAL:${ClaveTotalTicket}`     // línea suelta de total
  | `COBRO:${ClaveCobroTicket}`     // línea suelta de cobro
  | `DETALLE:${string}`            // clave fija (CODIGO, ARTICULO...) o ruta dinámica (impuesto.nombre, monto...)
  | `ESQUEMA:${string}`;           // campo del esquema JSON importado (config.esquema)

/** Tipo de ancho para campos en línea compartida. */
export type TipoAnchoCampo = 'porcentual' | 'fijo';

/** Línea manipulable dentro de una zona. */
export interface LineaZonaConfig {
  ref: RefLineaTicket;
  /** Expresión booleana. Si evalúa a falsy, la línea no se imprime. Ej: 'impuestosFactura.length > 0'. */
  condicion?: string;
  /** Si true, la línea no se imprime cuando el valor resuelto está vacío. */
  ocultarSiVacio?: boolean;
  /** Label editable (CAMPO / TOTAL / COBRO). Ausente = label natural. */
  label?: string;
  /** Si es false, no se emite el label (solo el valor). Default true. */
  mostrarLabel?: boolean;
  /** Formato de la línea: alineacion / negrita / tamano. */
  formato?: FormatoItemTicket;
  /** Formato solo del label (cuando tabulador esta activo). Ausente = hereda formato. */
  formatoLabel?: FormatoItemTicket;
  /** Formato solo del valor (cuando tabulador esta activo). Ausente = sin formato extra. */
  formatoValor?: FormatoItemTicket;
  /** Tabulador por línea: alinea label + valor en columna. Solo TOTAL/COBRO/CAMPO. */
  tabular?: { ancho?: number };
  /** Carácter de la línea SEPARADOR. Default '-'. */
  caracter?: CaracterSeparadorTicket;
  /** Ancho del separador. Número = caracteres exactos. String '50%' = porcentaje del ancho. Ausente = ancho completo. */
  ancho?: number | string;
  /** Alineación horizontal del separador parcial. Default: 'centro'. */
  alineacionSep?: AlineacionTicket;
  /** Grosor (cantidad de líneas) para separadores 'linea' y 'linea_gruesa'. 1-3. Default: 1. */
  grosor?: number;
  /** Número de línea visual (1-indexed). Campos con mismo lineaNum van en la misma línea. Default: siguiente disponible. */
  lineaNum?: number;
  /** Tipo de ancho cuando está en línea compartida. 'porcentual' = % del espacio restante. 'fijo' = caracteres fijos. Default: 'porcentual'. */
  anchoTipo?: TipoAnchoCampo;
  /** Valor del ancho: 5-100 (%) o 1-anchoPagina (caracteres). Default: 100 si solo, equitativo si compartido. */
  anchoValor?: number;
  /** @deprecated Renombrado a lineaNum. Mantenido por compatibilidad. */
  mismaLinea?: boolean;
  /** @deprecated Renombrado a anchoTipo/anchoValor. Mantenido por compatibilidad. */
  anchoCampo?: number;
  /** Ruta JSON (puntos) para código de barras (CAMPO:CODIGO_BARRAS). Si ausente usa la secuencia del NCF. */
  ruta?: string;
  /** Tipo de código de barras para CAMPO:CODIGO_BARRAS. Default: 'CODE128'. */
  tipoBarcode?: 'CODE' | 'CODE128' | 'EAN13';
  /** Tipo de dato para formateo de valor: texto | fecha | numero | dinero. */
  tipoDato?: 'texto' | 'fecha' | 'numero' | 'dinero';
  /** Formato de presentación según tipo:
   * - fecha: 'dd/MM/yyyy', 'yyyy-MM-dd', etc.
   * - numero/dinero: '#,##0.00', '#,##0', etc.
   */
  formatoDato?: string;
  /** Campo calculado sobre un array del esquema (solo líneas ESQUEMA). Si está definido, el valor se obtiene agregando el array de `calculo.ruta`. */
  calculo?: CalculoCampo;
}

/** Operación de agregación para campos calculados (líneas ESQUEMA). */
export type TipoCalculoCampo = 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';

/** Campo calculado estructurado: agrega el array del esquema indicado en `ruta`. */
export interface CalculoCampo {
  tipo: TipoCalculoCampo;
  /** Ruta (notación de puntos) del array en el esquema, ej: 'data.pagos'. */
  ruta: string;
}

/** Zona ordenable del ticket con sus líneas. */
export interface ZonaTicketConfig {
  id: string;
  tipo: TipoZonaTicket;
  /** Override del nombre visible (ausente = label por tipo). */
  nombre?: string;
  lineas: LineaZonaConfig[];
  /** Alineacion por defecto de toda la zona (cada linea puede override). */
  alineacion?: AlineacionTicket;
  /** Dibuja un cuadro ┌─┐│└┘ alrededor de la zona, ajustado al contenido y centrado. */
  enmarcar?: boolean;
  /** Ruta del array del esquema JSON que alimenta esta zona de detalle (ej: 'data.detalles'). */
  arrayOrigen?: string;
}

export interface PlantillaConfig {
  /** Modelo por zonas (fuente de verdad de impresión). */
  zonas?: ZonaTicketConfig[];
  /** Visibilidad de columnas del grupo de detalle. */
  columnasDetalle?: PlantillaDetalleColumnasConfig;
  /** Textos libres referenciados por `LIBRE:<id>` en las zonas (raíz del modelo por zonas). */
  textosLibres?: Record<string, TextoLibreConfig>;
  /** Campos de base de datos referenciados por `DTO:<id>` en las zonas (raíz del modelo por zonas). */
  camposDTO?: Record<string, PlantillaCamposDTOConfig>;
  /** Firmas referenciadas por `FIRMA:<id>` en las zonas (raíz del modelo por zonas). */
  firmas?: Record<string, FirmaConfig>;
  // ---- Secciones del modelo viejo (solo lectura/migración; ya obsoletas) ----
  encabezado?: PlantillaEncabezadoConfig;
  titulo?: PlantillaTituloConfig;
  campos?: PlantillaCamposConfig;
  detalle?: PlantillaDetalleConfig;
  totales?: PlantillaTotalesConfig;
  cobros?: PlantillaCobrosConfig;
  pie?: PlantillaPieConfig;
  opciones?: PlantillaOpcionesConfig;
  /** Logo configurable por plantilla (se imprime al inicio del ticket). */
  logo?: LogoPlantillaConfig;
  /** Esquema de campos disponibles importado desde JSON. No afecta el diseño. */
  esquema?: unknown;
}

/** Item del listado /reportes/config (sin el JSON completo). */
export interface ReportePlantillaListaDTO {
  plantillaId: number;
  codigo: string;
  nombre: string;
  tipo: string;
  activo: boolean;
  tieneConfig: boolean;
  fechaActualizacion: string | null;
}

/** Detalle de plantilla. `config` es el objeto JSON ya parseado o null si usa el predeterminado. */
export interface ReportePlantillaDetalleDTO {
  plantillaId: number;
  codigo: string;
  nombre: string;
  tipo: string;
  activo: boolean;
  config: PlantillaConfig | null;
  fechaActualizacion: string | null;
}

/** Body de PUT /reportes/config/{plantillaId}: `{ "config": {...} | null }`. */
export interface ReportePlantillaConfigRequest {
  config: PlantillaConfig | null;
}

/** Body de POST /reportes/config/{plantillaId}/imprimir. */
export interface PlantillaImprimirRequest {
  tipoDoc?: string;
  data?: unknown;
  company?: unknown;
  /** Si se omite, el backend usa la config guardada en la plantilla. */
  config?: PlantillaConfig | null;
  /** Comando ESC/POS del logo (alineacion + GS v 0) en base64, generado por obtenerLogoEscPosBase64. */
  logoEscPosBase64?: string;
  feedLines?: number;
  cut?: boolean;
  copias?: number;
}

/** Respuesta de POST /reportes/config/{plantillaId}/imprimir. */
export interface ImprimirResultadoDTO {
  ok: boolean;
  bytes: number;
  tipoDoc: string | null;
  copias: number;
  impresora: string | null;
}
