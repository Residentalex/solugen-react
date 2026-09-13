var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/utils/escpos-formatter.ts
var escpos_formatter_exports = {};
__export(escpos_formatter_exports, {
  CMD_CUT: () => CMD_CUT,
  escposBarcode: () => escposBarcode,
  escposQRCode: () => escposQRCode,
  feed: () => feed,
  formatFechaCorta: () => formatFechaCorta,
  formatTicket: () => formatTicket,
  formatTicketPOS: () => formatTicketPOS,
  formatTicketReciboIngreso: () => formatTicketReciboIngreso,
  formatTicketVoucherVisanet: () => formatTicketVoucherVisanet
});
module.exports = __toCommonJS(escpos_formatter_exports);

// src/utils/ticketPlantillaConfig.ts
var CAMPOS_TICKET_LABELS = {
  NCF: "NCF",
  TIPO_COMP: "TIPO COMP",
  CAJERO: "CAJERO",
  CAJA: "CAJA",
  TURNO: "TURNO",
  FECHA: "FECHA",
  HORA: "HORA",
  NO: "NO",
  CLIENTE: "CLIENTE",
  RNC_CLIENTE: "RNC CLIENTE",
  FECHA_IMPRESION: "FECHA IMP.",
  HORA_IMPRESION: "HORA IMP.",
  NUM_DETALLES: "ART\xCDCULOS",
  FECHA_VENCIMIENTO_NCF: "Vence",
  SECUENCIA_NCF: "Secuencia NCF",
  CODIGO_SEGURIDAD: "C\xF3digo de Seguridad",
  FECHA_FIRMA_DIGITAL: "Fecha Firma Digital",
  CODIGO_QR: "C\xF3digo QR",
  FAX: "Fax",
  SLOGAN: "Slogan"
};
var CAMPOS_TICKET_ORDEN = [
  "NCF",
  "TIPO_COMP",
  "CAJERO",
  "CAJA",
  "TURNO",
  "FECHA",
  "HORA",
  "NO",
  "CLIENTE",
  "RNC_CLIENTE"
];
var CAMPOS_TICKET_ORDEN_RI = [
  "NCF",
  "FECHA",
  "TIPO",
  "CONCEPTO",
  "ENTIDAD",
  "ENTIDAD_ID",
  "NOTA"
];
var CAMPOS_TICKET_LABELS_RI = {
  NCF: "NCF",
  FECHA: "FECHA",
  TIPO: "Tipo",
  CONCEPTO: "Concepto",
  ENTIDAD: "ENTIDAD",
  ENTIDAD_ID: "ENTIDAD ID",
  NOTA: "Nota",
  FECHA_IMPRESION: "FECHA IMP.",
  HORA_IMPRESION: "HORA IMP.",
  NUM_DETALLES: "TRANSACC."
};
var CAMPOS_TICKET_LABELS_VSNT = {
  COMPANIA: "Compa\xF1\xEDa",
  SUCURSAL: "Sucursal",
  DIRECCION: "Direcci\xF3n",
  TELEFONO: "Tel\xE9fono",
  RNC: "RNC",
  FAX: "Fax",
  SLOGAN: "Slogan",
  ID_COMERCIO: "ID COMERCIO",
  TIPO_OP: "TIPO OP",
  FECHA: "FECHA",
  ISSUER: "BANCO",
  TRANS: "TRANS #",
  AUTORIZACION: "AUTORIZACION #",
  TOTAL: "TOTAL",
  RESULTADO: "RESULTADO",
  FECHA_IMPRESION: "FECHA IMP.",
  HORA_IMPRESION: "HORA IMP."
};
var CAMPOS_DETALLE_LABELS = {
  CODIGO: "C\xF3digo",
  ARTICULO: "Art\xEDculo",
  CANTIDAD: "Cantidad",
  PRECIO: "Precio",
  ITBIS: "ITBIS",
  TOTAL: "Total"
};
var CAMPOS_DETALLE_RI_LABELS = {
  DOCUMENTO: "Documento",
  MONTO_ORIG: "Monto Orig",
  PAGADO: "Pagado",
  APLICADO: "Aplicado"
};
var PLANTILLA_CONFIG_DEFAULT = {
  encabezado: {
    mostrarCompania: true,
    mostrarDireccion: true,
    mostrarTelefono: true,
    mostrarRnc: true
  },
  campos: {
    orden: CAMPOS_TICKET_ORDEN,
    visibles: Object.fromEntries(CAMPOS_TICKET_ORDEN.map((c) => [c, true]))
  },
  detalle: {
    columnas: {
      codigo: true,
      cantidad: true,
      precio: true,
      itbis: true,
      total: true
    }
  },
  totales: {
    mostrarGravado: true,
    mostrarSubtotal: true,
    mostrarItbis: true,
    mostrarDescuento: true
  },
  cobros: {
    mostrarCobros: true
  },
  pie: {
    textoPie: "** GRACIAS POR SU COMPRA **"
  },
  opciones: {
    anchoLinea: 48,
    feedCorte: 4
  }
};
var PLANTILLA_CONFIG_DEFAULT_RI = {
  ...PLANTILLA_CONFIG_DEFAULT,
  campos: {
    orden: CAMPOS_TICKET_ORDEN_RI,
    visibles: Object.fromEntries(CAMPOS_TICKET_ORDEN_RI.map((c) => [c, true]))
  },
  pie: {
    textoPie: "Gracias por su preferencia!"
  }
};
var PLANTILLA_CONFIG_DEFAULT_VSNT = {
  encabezado: {
    mostrarCompania: true,
    mostrarDireccion: true,
    mostrarTelefono: true,
    mostrarRnc: true
  },
  campos: {
    orden: ["ID_COMERCIO", "TIPO_OP", "FECHA", "ISSUER", "TRANS", "AUTORIZACION", "TOTAL", "RESULTADO"],
    visibles: Object.fromEntries(
      ["ID_COMERCIO", "TIPO_OP", "FECHA", "ISSUER", "TRANS", "AUTORIZACION", "TOTAL", "RESULTADO"].map((c) => [c, true])
    )
  },
  pie: {
    textoPie: ""
  },
  opciones: {
    anchoLinea: 42,
    feedCorte: 3
  }
};
var PLANTILLA_CONFIG_DEFAULT_VSNT_ANULACION = {
  ...PLANTILLA_CONFIG_DEFAULT_VSNT,
  pie: { textoPie: "" },
  opciones: { anchoLinea: 42, feedCorte: 3 }
};
function normalizarTextosLibres(textos) {
  if (!textos) return void 0;
  const out = {};
  for (const [id, valor] of Object.entries(textos)) {
    if (typeof valor === "string") {
      out[id] = { texto: valor, alineacion: "centro", negrita: true, tamano: "normal" };
    } else {
      out[id] = { ...valor };
    }
  }
  return out;
}
function mergeConfig(base, config) {
  const out = { ...base };
  out.encabezado = { ...base.encabezado || {}, ...config.encabezado || {} };
  out.encabezado.formato = {
    ...base.encabezado?.formato || {},
    ...config.encabezado?.formato || {}
  };
  out.titulo = { ...base.titulo || {}, ...config.titulo || {} };
  out.titulo.formato = {
    ...base.titulo?.formato || {},
    ...config.titulo?.formato || {}
  };
  out.campos = { ...base.campos || {}, ...config.campos || {} };
  if (config.campos?.orden) out.campos.orden = [...config.campos.orden];
  if (config.campos?.visibles) out.campos.visibles = { ...config.campos.visibles };
  if (config.campos?.labels) out.campos.labels = { ...config.campos.labels };
  if (config.campos?.formatos) out.campos.formatos = { ...config.campos.formatos };
  if (config.campos?.textosLibres) {
    out.campos.textosLibres = normalizarTextosLibres(config.campos.textosLibres);
  }
  if (config.campos?.camposDTO) {
    out.campos.camposDTO = Object.fromEntries(
      Object.entries(config.campos.camposDTO).map(([id, def]) => [id, { ...def }])
    );
  }
  if (config.campos?.tabular) out.campos.tabular = { ...config.campos.tabular };
  out.detalle = { ...base.detalle || {}, ...config.detalle || {} };
  out.detalle.columnas = { ...base.detalle?.columnas || {}, ...config.detalle?.columnas || {} };
  out.detalle.formato = {
    ...base.detalle?.formato || {},
    ...config.detalle?.formato || {}
  };
  out.totales = { ...base.totales || {}, ...config.totales || {} };
  out.totales.formato = {
    ...base.totales?.formato || {},
    ...config.totales?.formato || {}
  };
  out.cobros = { ...base.cobros || {}, ...config.cobros || {} };
  out.cobros.formato = {
    ...base.cobros?.formato || {},
    ...config.cobros?.formato || {}
  };
  out.pie = { ...base.pie || {}, ...config.pie || {} };
  out.opciones = { ...base.opciones || {}, ...config.opciones || {} };
  if (config.firmas) out.firmas = { ...config.firmas };
  if (config.logo) out.logo = { ...config.logo };
  if (config.esquema !== void 0) out.esquema = config.esquema;
  return out;
}
function esItemOrdenRI(item) {
  return CAMPOS_TICKET_ORDEN_RI.includes(item) || item === "ESPACIO" || item === "SEPARADOR" || item.startsWith("LIBRE:") || item.startsWith("DTO:");
}
function migrarFormatoDetalleZonas(zonas) {
  return zonas.map((z) => ({
    ...z,
    lineas: z.lineas.map(
      (l) => l.ref.startsWith("DETALLE:") && !l.formato && l.formatoLabel ? { ...l, formato: l.formatoLabel } : l
    )
  }));
}
function normalizarConfig(config) {
  if (!config) return { ...PLANTILLA_CONFIG_DEFAULT, zonas: [...ZONAS_DEFAULT_FPV] };
  const out = mergeConfig(PLANTILLA_CONFIG_DEFAULT, config);
  if (config.columnasDetalle && !config.detalle?.columnas) {
    out.detalle = { ...out.detalle || {}, columnas: { ...config.columnasDetalle } };
  }
  if (config.zonas === null) {
    out.zonas = [...ZONAS_DEFAULT_FPV];
  } else if (config.zonas && config.zonas.length > 0) {
    out.zonas = migrarFormatoDetalleZonas(config.zonas);
    if (config.textosLibres) out.textosLibres = { ...config.textosLibres };
    if (config.camposDTO) out.camposDTO = { ...config.camposDTO };
    if (config.firmas) out.firmas = { ...config.firmas };
    if (config.logo) out.logo = { ...config.logo };
  } else {
    out.zonas = migrarConfigAZonas(config, "FPV");
    if (config.campos?.textosLibres) {
      out.textosLibres = normalizarTextosLibres(config.campos.textosLibres);
    }
    if (config.campos?.camposDTO) {
      out.camposDTO = { ...config.campos.camposDTO };
    }
    if (config.firmas) out.firmas = { ...config.firmas };
    if (config.logo) out.logo = { ...config.logo };
  }
  return out;
}
function normalizarConfigRI(config) {
  if (!config) return { ...PLANTILLA_CONFIG_DEFAULT_RI, zonas: [...ZONAS_DEFAULT_FRI] };
  const out = mergeConfig(PLANTILLA_CONFIG_DEFAULT_RI, config);
  const orden = out.campos?.orden || [];
  if (orden.length > 0 && !orden.some((k) => esItemOrdenRI(k))) {
    out.campos = { ...out.campos || {}, orden: [...CAMPOS_TICKET_ORDEN_RI] };
  }
  if (config.columnasDetalle && !config.detalle?.columnas) {
    out.detalle = { ...out.detalle || {}, columnas: { ...config.columnasDetalle } };
  }
  if (config.zonas === null) {
    out.zonas = [...ZONAS_DEFAULT_FRI];
  } else if (config.zonas && config.zonas.length > 0) {
    out.zonas = migrarFormatoDetalleZonas(config.zonas);
    if (config.textosLibres) out.textosLibres = { ...config.textosLibres };
    if (config.camposDTO) out.camposDTO = { ...config.camposDTO };
    if (config.firmas) out.firmas = { ...config.firmas };
    if (config.logo) out.logo = { ...config.logo };
  } else {
    out.zonas = migrarConfigAZonas(config, "FRI");
    if (config.campos?.textosLibres) {
      out.textosLibres = normalizarTextosLibres(config.campos.textosLibres);
    }
    if (config.campos?.camposDTO) {
      out.camposDTO = { ...config.campos.camposDTO };
    }
    if (config.firmas) out.firmas = { ...config.firmas };
    if (config.logo) out.logo = { ...config.logo };
  }
  return out;
}
function normalizarConfigVSNT(config) {
  if (!config) return { ...PLANTILLA_CONFIG_DEFAULT_VSNT, zonas: [...ZONAS_DEFAULT_VSNT] };
  const out = mergeConfig(PLANTILLA_CONFIG_DEFAULT_VSNT, config);
  return finalizarNormalizacionVSNT(out, config, ZONAS_DEFAULT_VSNT);
}
function finalizarNormalizacionVSNT(out, config, zonasDefault) {
  if (config.columnasDetalle && !config.detalle?.columnas) {
    out.detalle = { ...out.detalle || {}, columnas: { ...config.columnasDetalle } };
  }
  if (config.zonas === null) {
    out.zonas = [...zonasDefault];
  } else if (config.zonas && config.zonas.length > 0) {
    out.zonas = migrarFormatoDetalleZonas(config.zonas);
    if (config.textosLibres) out.textosLibres = { ...config.textosLibres };
    if (config.camposDTO) out.camposDTO = { ...config.camposDTO };
    if (config.firmas) out.firmas = { ...config.firmas };
    if (config.logo) out.logo = { ...config.logo };
  } else {
    out.zonas = migrarConfigAZonas(config, "VSNT");
    if (config.campos?.textosLibres) {
      out.textosLibres = normalizarTextosLibres(config.campos.textosLibres);
    }
    if (config.campos?.camposDTO) {
      out.camposDTO = { ...config.campos.camposDTO };
    }
    if (config.firmas) out.firmas = { ...config.firmas };
    if (config.logo) out.logo = { ...config.logo };
  }
  return out;
}
var ZONAS_DEFAULT_FPV = [
  {
    id: "zona_fpv_encabezado",
    tipo: "encabezado_reporte",
    lineas: [
      { ref: "CAMPO:COMPANIA" },
      { ref: "CAMPO:DIRECCION" },
      { ref: "CAMPO:TELEFONO" },
      { ref: "CAMPO:RNC" },
      { ref: "SEPARADOR", caracter: "=", formato: { negrita: true } }
    ]
  },
  {
    id: "zona_fpv_campos_titulo",
    tipo: "encabezado_reporte",
    lineas: [
      { ref: "CAMPO:NCF" },
      { ref: "CAMPO:TIPO_COMP" },
      { ref: "CAMPO:CAJERO" },
      { ref: "CAMPO:CAJA" },
      { ref: "CAMPO:TURNO" },
      { ref: "CAMPO:FECHA" },
      { ref: "CAMPO:HORA" },
      { ref: "CAMPO:NO" },
      { ref: "CAMPO:CLIENTE" },
      { ref: "CAMPO:RNC_CLIENTE" },
      { ref: "SEPARADOR", caracter: "\u2500" },
      { ref: "CAMPO:TITULO" },
      { ref: "SEPARADOR", caracter: "=", formato: { negrita: true } }
    ]
  },
  {
    id: "zona_fpv_cabecera_detalle",
    tipo: "cabecera_grupo_detalle",
    // Cabecera de columnas del detalle (se emiten en negrita como titulos)
    lineas: [
      { ref: "DETALLE:CODIGO", label: "COD", formato: { negrita: true, alineacion: "izquierda" } },
      { ref: "DETALLE:ARTICULO", label: "ARTICULO", formato: { negrita: true, alineacion: "izquierda" } },
      { ref: "DETALLE:CANTIDAD", label: "CANT", formato: { negrita: true, alineacion: "derecha" } },
      { ref: "DETALLE:PRECIO", label: "PRECIO", formato: { negrita: true, alineacion: "derecha" } },
      { ref: "DETALLE:TOTAL", label: "TOTAL", formato: { negrita: true, alineacion: "derecha" } }
    ]
  },
  {
    id: "zona_fpv_detalle",
    tipo: "detalle",
    // Filas de datos del detalle (sin label para que ocupen el ancho de columna)
    lineas: [
      { ref: "DETALLE:CODIGO", mostrarLabel: false, formato: { alineacion: "izquierda" } },
      { ref: "DETALLE:ARTICULO", mostrarLabel: false, formato: { alineacion: "izquierda" } },
      { ref: "DETALLE:CANTIDAD", mostrarLabel: false, formato: { alineacion: "derecha" } },
      { ref: "DETALLE:PRECIO", mostrarLabel: false, formato: { alineacion: "derecha" } },
      { ref: "DETALLE:TOTAL", mostrarLabel: false, formato: { alineacion: "derecha" } }
    ]
  },
  {
    id: "zona_fpv_totales",
    tipo: "totales",
    lineas: [
      { ref: "SEPARADOR", caracter: "-" },
      { ref: "TOTAL:TOTAL_GRAVADO" },
      { ref: "TOTAL:SUBTOTAL" },
      { ref: "TOTAL:ITBIS" },
      { ref: "TOTAL:DESCUENTO" },
      { ref: "SEPARADOR", caracter: "\u2500" },
      { ref: "TOTAL:TOTAL", formato: { negrita: true } },
      { ref: "SEPARADOR", caracter: "-" }
    ]
  },
  {
    id: "zona_fpv_cobros",
    tipo: "cobros",
    lineas: []
  },
  {
    id: "zona_fpv_pie",
    tipo: "pie_reporte",
    lineas: [
      { ref: "CAMPO:TITULO", label: "** GRACIAS POR SU COMPRA **" }
    ]
  }
];
var ZONAS_DEFAULT_FRI = [
  {
    id: "zona_fri_encabezado",
    tipo: "encabezado_reporte",
    lineas: [
      { ref: "CAMPO:COMPANIA" },
      { ref: "CAMPO:DIRECCION" },
      { ref: "CAMPO:TELEFONO" },
      { ref: "CAMPO:RNC" },
      { ref: "SEPARADOR", caracter: "=", formato: { negrita: true } }
    ]
  },
  {
    id: "zona_fri_titulo",
    tipo: "encabezado_reporte",
    lineas: [
      { ref: "CAMPO:TITULO" },
      { ref: "SEPARADOR", caracter: "=", formato: { negrita: true } }
    ]
  },
  {
    id: "zona_fri_campos",
    tipo: "encabezado_reporte",
    lineas: [
      { ref: "CAMPO:NCF" },
      { ref: "CAMPO:FECHA" },
      { ref: "CAMPO:TIPO" },
      { ref: "CAMPO:CONCEPTO" },
      { ref: "CAMPO:ENTIDAD" },
      { ref: "CAMPO:ENTIDAD_ID" },
      { ref: "CAMPO:NOTA" }
    ]
  },
  {
    id: "zona_fri_cabecera_detalle",
    tipo: "cabecera_grupo_detalle",
    // Cabecera de columnas del detalle (FRI: documentos asociados)
    lineas: [
      { ref: "DETALLE:DOCUMENTO", label: "DOCUMENTO", formato: { negrita: true, alineacion: "izquierda" } },
      { ref: "DETALLE:MONTO_ORIG", label: "M. ORIG", formato: { negrita: true, alineacion: "derecha" } },
      { ref: "DETALLE:PAGADO", label: "PAGADO", formato: { negrita: true, alineacion: "derecha" } },
      { ref: "DETALLE:APLICADO", label: "APLICADO", formato: { negrita: true, alineacion: "derecha" } }
    ]
  },
  {
    id: "zona_fri_detalle",
    tipo: "detalle",
    // Filas de datos del detalle FRI (sin label)
    lineas: [
      { ref: "DETALLE:DOCUMENTO", mostrarLabel: false, formato: { alineacion: "izquierda" } },
      { ref: "DETALLE:MONTO_ORIG", mostrarLabel: false, formato: { alineacion: "derecha" } },
      { ref: "DETALLE:PAGADO", mostrarLabel: false, formato: { alineacion: "derecha" } },
      { ref: "DETALLE:APLICADO", mostrarLabel: false, formato: { alineacion: "derecha" } }
    ]
  },
  {
    id: "zona_fri_totales",
    tipo: "totales",
    lineas: [
      { ref: "SEPARADOR", caracter: "-" }
    ]
  },
  {
    id: "zona_fri_cobros",
    tipo: "cobros",
    lineas: []
  },
  {
    id: "zona_fri_pie",
    tipo: "pie_reporte",
    lineas: [
      { ref: "CAMPO:TITULO", label: "Gracias por su preferencia!" }
    ]
  }
];
var ZONAS_DEFAULT_VSNT = [
  {
    id: "zona_vsnt_encabezado",
    tipo: "encabezado_reporte",
    alineacion: "centro",
    lineas: [
      { ref: "CAMPO:COMPANIA", formato: { alineacion: "centro", tamano: "doble" } },
      { ref: "CAMPO:DIRECCION" },
      { ref: "CAMPO:TELEFONO" },
      { ref: "CAMPO:RNC" },
      { ref: "CAMPO:SUCURSAL" }
    ]
  },
  {
    id: "zona_vsnt_comercio",
    tipo: "encabezado_reporte",
    alineacion: "centro",
    lineas: [
      { ref: "CAMPO:ID_COMERCIO" },
      { ref: "CAMPO:TIPO_OP", formato: { negrita: true } },
      { ref: "SEPARADOR", caracter: "-" }
    ]
  },
  {
    id: "zona_vsnt_detalle",
    tipo: "encabezado_reporte",
    alineacion: "izquierda",
    lineas: [
      { ref: "CAMPO:FECHA" },
      { ref: "CAMPO:ISSUER" },
      { ref: "CAMPO:TRANS" },
      { ref: "CAMPO:AUTORIZACION" },
      { ref: "SEPARADOR", caracter: "-" }
    ]
  },
  {
    id: "zona_vsnt_total",
    tipo: "encabezado_reporte",
    alineacion: "centro",
    lineas: [
      { ref: "CAMPO:TOTAL", formato: { alineacion: "centro", tamano: "doble" } }
    ]
  },
  {
    id: "zona_vsnt_resultado",
    tipo: "encabezado_reporte",
    alineacion: "centro",
    lineas: [
      { ref: "ESPACIO" },
      { ref: "CAMPO:RESULTADO" }
    ]
  }
];
function migrarConfigAZonas(config, tipo) {
  const enc = config.encabezado || {};
  const tit = config.titulo || {};
  const cam = config.campos || {};
  const tot = config.totales || {};
  const pie = config.pie || {};
  if (tipo === "FPV") {
    const zonas2 = [];
    const lineasEnc2 = [];
    if (enc.mostrarCompania !== false) lineasEnc2.push({ ref: "CAMPO:COMPANIA" });
    if (enc.mostrarDireccion !== false) lineasEnc2.push({ ref: "CAMPO:DIRECCION" });
    if (enc.mostrarTelefono !== false) lineasEnc2.push({ ref: "CAMPO:TELEFONO" });
    if (enc.mostrarRnc !== false) lineasEnc2.push({ ref: "CAMPO:RNC" });
    lineasEnc2.push({ ref: "SEPARADOR", caracter: "=", formato: { negrita: true } });
    zonas2.push({ id: "zona_fpv_encabezado", tipo: "encabezado_reporte", lineas: lineasEnc2 });
    const orden = cam.orden && cam.orden.length > 0 ? cam.orden : CAMPOS_TICKET_ORDEN;
    const visibles = cam.visibles || {};
    const labels = cam.labels || {};
    const formatos = cam.formatos || {};
    const lineasCampos = [];
    for (const item of orden) {
      if (item === "ESPACIO") {
        lineasCampos.push({ ref: "ESPACIO" });
        continue;
      }
      if (item === "SEPARADOR") {
        lineasCampos.push({ ref: "SEPARADOR" });
        continue;
      }
      if (item.startsWith("LIBRE:")) {
        lineasCampos.push({ ref: item });
        continue;
      }
      if (item.startsWith("DTO:")) {
        lineasCampos.push({ ref: item });
        continue;
      }
      if (visibles[item] === false) continue;
      const ref = `CAMPO:${item}`;
      const linea = { ref };
      const lbl = labels[item];
      if (lbl !== void 0 && lbl !== "" && lbl !== CAMPOS_TICKET_LABELS[item]) {
        linea.label = lbl;
      }
      if (formatos[item]) linea.formato = { ...formatos[item] };
      lineasCampos.push(linea);
    }
    lineasCampos.push({ ref: "SEPARADOR", caracter: "\u2500" });
    const titLinea2 = { ref: "CAMPO:TITULO" };
    if (tit.texto) titLinea2.label = tit.texto;
    if (tit.formato) titLinea2.formato = { ...tit.formato };
    lineasCampos.push(titLinea2);
    lineasCampos.push({ ref: "SEPARADOR", caracter: "=", formato: { negrita: true } });
    zonas2.push({ id: "zona_fpv_campos_titulo", tipo: "encabezado_reporte", lineas: lineasCampos });
    zonas2.push({
      id: "zona_fpv_cabecera_detalle",
      tipo: "cabecera_grupo_detalle",
      lineas: []
    });
    zonas2.push({ id: "zona_fpv_detalle", tipo: "detalle", lineas: [] });
    const lineasTot = [];
    lineasTot.push({ ref: "SEPARADOR", caracter: "-" });
    if (tot.mostrarGravado !== false) lineasTot.push({ ref: "TOTAL:TOTAL_GRAVADO" });
    if (tot.mostrarSubtotal !== false) lineasTot.push({ ref: "TOTAL:SUBTOTAL" });
    if (tot.mostrarItbis !== false) lineasTot.push({ ref: "TOTAL:ITBIS" });
    if (tot.mostrarDescuento !== false) lineasTot.push({ ref: "TOTAL:DESCUENTO" });
    lineasTot.push({ ref: "SEPARADOR", caracter: "\u2500" });
    lineasTot.push({ ref: "TOTAL:TOTAL" });
    lineasTot.push({ ref: "SEPARADOR", caracter: "-" });
    zonas2.push({ id: "zona_fpv_totales", tipo: "totales", lineas: lineasTot });
    zonas2.push({ id: "zona_fpv_cobros", tipo: "cobros", lineas: [] });
    const pieLabel = pie.textoPie || "** GRACIAS POR SU COMPRA **";
    zonas2.push({
      id: "zona_fpv_pie",
      tipo: "pie_reporte",
      lineas: [{ ref: "CAMPO:TITULO", label: pieLabel }]
    });
    return zonas2;
  }
  if (tipo === "VSNT") {
    return [...ZONAS_DEFAULT_VSNT];
  }
  const zonas = [];
  const lineasEnc = [];
  if (enc.mostrarCompania !== false) lineasEnc.push({ ref: "CAMPO:COMPANIA" });
  if (enc.mostrarDireccion !== false) lineasEnc.push({ ref: "CAMPO:DIRECCION" });
  if (enc.mostrarTelefono !== false) lineasEnc.push({ ref: "CAMPO:TELEFONO" });
  if (enc.mostrarRnc !== false) lineasEnc.push({ ref: "CAMPO:RNC" });
  lineasEnc.push({ ref: "SEPARADOR", caracter: "=", formato: { negrita: true } });
  zonas.push({ id: "zona_fri_encabezado", tipo: "encabezado_reporte", lineas: lineasEnc });
  const lineasTit = [];
  const titLinea = { ref: "CAMPO:TITULO" };
  if (tit.texto) titLinea.label = tit.texto;
  if (tit.formato) titLinea.formato = { ...tit.formato };
  lineasTit.push(titLinea);
  lineasTit.push({ ref: "SEPARADOR", caracter: "=", formato: { negrita: true } });
  zonas.push({ id: "zona_fri_titulo", tipo: "encabezado_reporte", lineas: lineasTit });
  const ordenRI = cam.orden && cam.orden.length > 0 && cam.orden.some((k) => esItemOrdenRI(k)) ? cam.orden : CAMPOS_TICKET_ORDEN_RI;
  const visRI = cam.visibles || {};
  const lblRI = cam.labels || {};
  const fmtRI = cam.formatos || {};
  const lineasCam = [];
  for (const item of ordenRI) {
    if (item === "ESPACIO") {
      lineasCam.push({ ref: "ESPACIO" });
      continue;
    }
    if (item === "SEPARADOR") {
      lineasCam.push({ ref: "SEPARADOR" });
      continue;
    }
    if (item.startsWith("LIBRE:")) {
      lineasCam.push({ ref: item });
      continue;
    }
    if (item.startsWith("DTO:")) {
      lineasCam.push({ ref: item });
      continue;
    }
    if (visRI[item] === false) continue;
    const ref = `CAMPO:${item}`;
    const linea = { ref };
    const lbl = lblRI[item];
    if (lbl !== void 0 && lbl !== "" && lbl !== CAMPOS_TICKET_LABELS_RI[item]) {
      linea.label = lbl;
    }
    if (fmtRI[item]) linea.formato = { ...fmtRI[item] };
    lineasCam.push(linea);
  }
  zonas.push({ id: "zona_fri_campos", tipo: "encabezado_reporte", lineas: lineasCam });
  zonas.push({
    id: "zona_fri_cabecera_detalle",
    tipo: "cabecera_grupo_detalle",
    lineas: []
  });
  zonas.push({ id: "zona_fri_detalle", tipo: "detalle", lineas: [] });
  zonas.push({ id: "zona_fri_totales", tipo: "totales", lineas: [] });
  zonas.push({ id: "zona_fri_cobros", tipo: "cobros", lineas: [] });
  const pieText = pie.textoPie || "Gracias por su preferencia!";
  zonas.push({
    id: "zona_fri_pie",
    tipo: "pie_reporte",
    lineas: [{ ref: "CAMPO:TITULO", label: pieText }]
  });
  return zonas;
}

// src/utils/expresiones.ts
var ParseError = class extends Error {
  pos;
  constructor(mensaje, pos) {
    super(mensaje);
    this.pos = pos;
  }
};
function tokenizar(src) {
  const toks = [];
  let i = 0;
  const esDigito = (c) => c >= "0" && c <= "9";
  const esLetra = (c) => /[A-Za-zÑñÁÉÍÓÚáéíóúÜü_]/.test(c);
  const esAlnum = (c) => esLetra(c) || esDigito(c);
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "	" || c === "\r" || c === "\n") {
      i++;
      continue;
    }
    if (esDigito(c) || c === "." && esDigito(src[i + 1] ?? "")) {
      let j = i;
      let puntos = 0;
      while (j < src.length && (esDigito(src[j]) || src[j] === ".")) {
        if (src[j] === ".") puntos++;
        j++;
      }
      if (puntos > 1) throw new ParseError("Numero invalido", i);
      toks.push({ t: "num", v: src.slice(i, j), pos: i });
      i = j;
      continue;
    }
    if (c === "'" || c === '"') {
      const fin = src.indexOf(c, i + 1);
      if (fin === -1) throw new ParseError("Texto sin cerrar", i);
      toks.push({ t: "str", v: src.slice(i + 1, fin), pos: i });
      i = fin + 1;
      continue;
    }
    if (esLetra(c)) {
      let j = i;
      while (j < src.length && esAlnum(src[j])) j++;
      toks.push({ t: "id", v: src.slice(i, j), pos: i });
      i = j;
      continue;
    }
    const dos = src.slice(i, i + 2);
    if (dos === "<>" || dos === "<=" || dos === ">=" || dos === "!=") {
      toks.push({ t: "op", v: dos === "!=" ? "<>" : dos, pos: i });
      i += 2;
      continue;
    }
    if ("+-*/%&=<>(),.".includes(c)) {
      toks.push({ t: "op", v: c, pos: i });
      i++;
      continue;
    }
    throw new ParseError(`Caracter no valido: '${c}'`, i);
  }
  toks.push({ t: "fin", v: "", pos: src.length });
  return toks;
}
var Parser = class {
  toks;
  i = 0;
  constructor(src) {
    this.toks = tokenizar(src);
  }
  peek() {
    return this.toks[this.i];
  }
  avanzar() {
    return this.toks[this.i++];
  }
  esperarOp(v) {
    const t = this.peek();
    if (t.t === "op" && t.v === v) {
      this.avanzar();
      return;
    }
    throw new ParseError(`Se esperaba '${v}'`, t.pos);
  }
  analizar() {
    const n = this.or();
    const t = this.peek();
    if (t.t !== "fin") throw new ParseError("Sobran caracteres al final de la expresion", t.pos);
    return n;
  }
  or() {
    let a = this.and();
    while (this.peek().t === "id" && this.peek().v.toUpperCase() === "OR") {
      this.avanzar();
      a = { k: "bin", op: "OR", a, b: this.and() };
    }
    return a;
  }
  and() {
    let a = this.not();
    while (this.peek().t === "id" && this.peek().v.toUpperCase() === "AND") {
      this.avanzar();
      a = { k: "bin", op: "AND", a, b: this.not() };
    }
    return a;
  }
  not() {
    if (this.peek().t === "id" && this.peek().v.toUpperCase() === "NOT") {
      this.avanzar();
      return { k: "un", op: "NOT", a: this.not() };
    }
    return this.comparacion();
  }
  comparacion() {
    const a = this.aditivo();
    const t = this.peek();
    if (t.t === "op" && ["=", "<>", "<", ">", "<=", ">="].includes(t.v)) {
      this.avanzar();
      return { k: "bin", op: t.v, a, b: this.aditivo() };
    }
    return a;
  }
  aditivo() {
    let a = this.multiplicativo();
    for (; ; ) {
      const t = this.peek();
      if (t.t === "op" && (t.v === "+" || t.v === "-" || t.v === "&")) {
        this.avanzar();
        a = { k: "bin", op: t.v, a, b: this.multiplicativo() };
      } else {
        return a;
      }
    }
  }
  multiplicativo() {
    let a = this.unario();
    for (; ; ) {
      const t = this.peek();
      if (t.t === "op" && (t.v === "*" || t.v === "/" || t.v === "%")) {
        this.avanzar();
        a = { k: "bin", op: t.v, a, b: this.unario() };
      } else {
        return a;
      }
    }
  }
  unario() {
    const t = this.peek();
    if (t.t === "op" && t.v === "-") {
      this.avanzar();
      return { k: "un", op: "-", a: this.unario() };
    }
    return this.primario();
  }
  primario() {
    const t = this.avanzar();
    if (t.t === "num") return { k: "num", v: Number(t.v) };
    if (t.t === "str") return { k: "str", v: t.v };
    if (t.t === "op" && t.v === "(") {
      const n = this.or();
      this.esperarOp(")");
      return n;
    }
    if (t.t === "id") {
      const U = t.v.toUpperCase();
      if (U === "TRUE") return { k: "bool", v: true };
      if (U === "FALSE") return { k: "bool", v: false };
      if (U === "NULL") return { k: "nul" };
      const nx = this.peek();
      if (nx.t === "op" && nx.v === "(") {
        if (!NOMBRES_FUNCIONES.has(U)) {
          throw new ParseError(`Funcion no permitida: ${t.v}`, t.pos);
        }
        const minimo = ARIDAD_MINIMA[U] ?? 0;
        this.avanzar();
        const args = [];
        if (!(this.peek().t === "op" && this.peek().v === ")")) {
          args.push(this.or());
          while (this.peek().t === "op" && this.peek().v === ",") {
            this.avanzar();
            args.push(this.or());
          }
        }
        this.esperarOp(")");
        if (args.length < minimo) {
          throw new ParseError(`${U} requiere al menos ${minimo} argumento(s)`, t.pos);
        }
        return { k: "llam", nombre: U, args, pos: t.pos };
      }
      const segs = [t.v];
      while (this.peek().t === "op" && this.peek().v === ".") {
        this.avanzar();
        const s = this.avanzar();
        if (s.t !== "id") throw new ParseError('Nombre de campo invalido despues de "."', s.pos);
        segs.push(s.v);
      }
      return { k: "id", segs, pos: t.pos };
    }
    throw new ParseError("Expresion invalida", t.pos);
  }
};
function parseExpresion(src) {
  return new Parser(src).analizar();
}
function buscarProp(fuente, nombre) {
  if (fuente === null || fuente === void 0 || typeof fuente !== "object") return void 0;
  if (nombre in fuente) return fuente[nombre];
  const nl = nombre.toLowerCase();
  for (const k of Object.keys(fuente)) {
    if (k.toLowerCase() === nl) return fuente[k];
  }
  return void 0;
}
function bajarCampos(base, segs) {
  let v = base;
  for (const s of segs) {
    if (v === null || v === void 0) return void 0;
    if (Array.isArray(v)) {
      v = v.map((it) => it === null || it === void 0 ? null : buscarProp(it, s) ?? null);
      continue;
    }
    v = buscarProp(v, s);
    if (v === void 0) return void 0;
  }
  return v;
}
function resolverPath(segs, ctx) {
  const fuentes = [ctx.item, ctx.data, ctx.company, ctx.config];
  for (const f of fuentes) {
    if (f === null || f === void 0) continue;
    const primero = buscarProp(f, segs[0]);
    if (primero !== void 0) {
      return segs.length === 1 ? primero : bajarCampos(primero, segs.slice(1));
    }
  }
  return void 0;
}
function aNumero(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}
function aString(v) {
  if (v === null || v === void 0) return "";
  if (typeof v === "boolean") return v ? "SI" : "NO";
  if (v instanceof Date) return formatearFecha(v);
  if (Array.isArray(v)) return v.map(aString).join(", ");
  return String(v);
}
function truthy(v) {
  if (v === null || v === void 0) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v.trim() !== "";
  return true;
}
function aplicarOp(op, a, b) {
  switch (op) {
    case "=":
      return a === b;
    case "<>":
      return a !== b;
    case "<":
      return a < b;
    case ">":
      return a > b;
    case "<=":
      return a <= b;
    case ">=":
      return a >= b;
    default:
      return false;
  }
}
function cmp(op, a, b) {
  const aNull = a === null || a === void 0;
  const bNull = b === null || b === void 0;
  if (op === "=") {
    if (aNull && bNull) return true;
    if (aNull || bNull) return false;
  } else if (op === "<>") {
    if (aNull && bNull) return false;
    if (aNull || bNull) return true;
  } else if (aNull || bNull) {
    return false;
  }
  const na = aNumero(a);
  const nb = aNumero(b);
  if (na !== null && nb !== null && typeof a !== "boolean" && typeof b !== "boolean") {
    return aplicarOp(op, na, nb);
  }
  return aplicarOp(op, aString(a).toUpperCase(), aString(b).toUpperCase());
}
function parseFecha(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : new Date(v.getTime());
  if (v === null || v === void 0) return null;
  const s = String(v).trim();
  if (s === "") return null;
  let m = s.match(/^(\d{14})$/);
  if (m) {
    return new Date(
      Number(s.slice(0, 4)),
      Number(s.slice(4, 6)) - 1,
      Number(s.slice(6, 8)),
      Number(s.slice(8, 10)),
      Number(s.slice(10, 12)),
      Number(s.slice(12, 14))
    );
  }
  m = s.match(/^(\d{8})$/);
  if (m) {
    return new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    return new Date(
      Number(m[3]),
      Number(m[2]) - 1,
      Number(m[1]),
      Number(m[4] ?? 0),
      Number(m[5] ?? 0),
      Number(m[6] ?? 0)
    );
  }
  if (s.includes("-") || s.includes("T")) {
    const t = Date.parse(s);
    if (!Number.isNaN(t)) return new Date(t);
  }
  return null;
}
function formatearFecha(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear()).padStart(4, "0");
  const conHora = d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
  if (!conHora) return `${dd}/${mm}/${yyyy}`;
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}
function inicioDia(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function datediff(faVal, fbVal, unidadRaw) {
  const fa = parseFecha(faVal);
  const fb = parseFecha(fbVal);
  if (!fa || !fb) return null;
  const u = String(unidadRaw ?? "").trim().toUpperCase();
  const ms = fa.getTime() - fb.getTime();
  if (["HORAS", "HOUR", "HOURS"].includes(u)) return Math.round(ms / 36e5);
  if (["MINUTOS", "MINUTE", "MINUTES"].includes(u)) return Math.round(ms / 6e4);
  if (["DIAS", "DAY", "DAYS"].includes(u)) return Math.round(ms / 864e5);
  let meses = (fa.getFullYear() - fb.getFullYear()) * 12 + (fa.getMonth() - fb.getMonth());
  if (fa.getDate() < fb.getDate()) meses -= 1;
  if (["MESES", "MONTH", "MONTHS"].includes(u)) return meses;
  if (["ANIOS", "A\xD1OS", "YEAR", "YEARS"].includes(u)) return Math.floor(meses / 12);
  return null;
}
var ARIDAD_MINIMA = {
  SUM: 1,
  AVG: 1,
  COUNT: 1,
  MIN: 1,
  MAX: 1,
  SUMIF: 2,
  COUNTIF: 2,
  IF: 3,
  AND: 1,
  OR: 1,
  NOT: 1,
  ROUND: 1,
  ABS: 1,
  CONCAT: 1,
  LEFT: 2,
  RIGHT: 2,
  SUBSTRING: 2,
  UPPER: 1,
  LOWER: 1,
  TRIM: 1,
  LEN: 1,
  REPLACE: 3,
  TODAY: 0,
  NOW: 0,
  YEAR: 1,
  MONTH: 1,
  DAY: 1,
  DATEDIFF: 3,
  ISNULL: 1,
  COALESCE: 1,
  NUM: 1,
  TEXT: 1
};
function reqArgs(args, min, nombre) {
  if (args.length < min) throw new Error(`${nombre}: se esperaban al menos ${min} argumento(s)`);
}
function numerosDe(v) {
  const fuente = Array.isArray(v) ? v : [v];
  const out = [];
  for (const it of fuente) {
    if (it === null || it === void 0 || typeof it === "boolean") continue;
    const n = aNumero(it);
    if (n !== null) out.push(n);
  }
  return out;
}
function extremos(args, esMin) {
  let pool;
  if (args.length === 1 && Array.isArray(args[0])) {
    pool = numerosDe(args[0]);
  } else {
    pool = numerosDe(args);
  }
  if (pool.length === 0) return null;
  return esMin ? Math.min(...pool) : Math.max(...pool);
}
function cumpleCriterio(valor, criterio) {
  if (typeof criterio === "string") {
    const m = criterio.match(/^(>=|<=|<>|!=|>|<)\s*(.*)$/);
    if (m) {
      const op = m[1] === "!=" ? "<>" : m[1];
      const objetivo = m[2];
      const nv = aNumero(valor);
      const no = aNumero(objetivo);
      if (nv !== null && no !== null && typeof valor !== "boolean") {
        return aplicarOp(op, nv, no);
      }
      return aplicarOp(op, String(valor ?? "").toUpperCase(), objetivo.toUpperCase());
    }
  }
  return cmp("=", valor, criterio);
}
var IMPL = {
  // ----- Agregadas -----
  SUM: (a) => numerosDe(a[0]).reduce((x, y) => x + y, 0),
  AVG: (a) => {
    const ns = numerosDe(a[0]);
    return ns.length > 0 ? ns.reduce((x, y) => x + y, 0) / ns.length : null;
  },
  COUNT: (a) => {
    const v = a[0];
    if (Array.isArray(v)) return v.filter((x) => x !== null && x !== void 0).length;
    return v === null || v === void 0 ? 0 : 1;
  },
  MIN: (a) => extremos(a, true),
  MAX: (a) => extremos(a, false),
  SUMIF: (a) => {
    reqArgs(a, 2, "SUMIF");
    const rango = Array.isArray(a[0]) ? a[0] : [a[0]];
    const suma = Array.isArray(a[2]) ? a[2] : null;
    let total = 0;
    for (let i = 0; i < rango.length; i++) {
      if (!cumpleCriterio(rango[i], a[1])) continue;
      const n = aNumero(suma ? suma[i] : rango[i]);
      if (n !== null) total += n;
    }
    return total;
  },
  COUNTIF: (a) => {
    reqArgs(a, 2, "COUNTIF");
    const rango = Array.isArray(a[0]) ? a[0] : [a[0]];
    let cuenta = 0;
    for (const v of rango) {
      if (cumpleCriterio(v, a[1])) cuenta++;
    }
    return cuenta;
  },
  // ----- Logica -----
  IF: (a) => {
    reqArgs(a, 3, "IF");
    return truthy(a[0]) ? a[1] : a[2];
  },
  AND: (a) => a.every(truthy),
  OR: (a) => a.some(truthy),
  NOT: (a) => !truthy(a[0]),
  // ----- Matematicas -----
  ROUND: (a) => {
    const n = aNumero(a[0]);
    if (n === null) return null;
    const d = a.length > 1 ? aNumero(a[1]) ?? 2 : 2;
    const f = Math.pow(10, d);
    return Math.round(n * f) / f;
  },
  ABS: (a) => {
    const n = aNumero(a[0]);
    return n === null ? null : Math.abs(n);
  },
  // ----- Texto -----
  CONCAT: (a) => a.map((x) => aString(x)).join(""),
  LEFT: (a) => {
    const s = aString(a[0]);
    const n = aNumero(a[1]) ?? 0;
    return s.slice(0, Math.max(0, n));
  },
  RIGHT: (a) => {
    const s = aString(a[0]);
    const n = aNumero(a[1]) ?? 0;
    return n <= 0 ? "" : s.slice(-n);
  },
  SUBSTRING: (a) => {
    const s = aString(a[0]);
    const ini = Math.max(1, aNumero(a[1]) ?? 1);
    if (a.length > 2) {
      const largo = Math.max(0, aNumero(a[2]) ?? 0);
      return s.slice(ini - 1, ini - 1 + largo);
    }
    return s.slice(ini - 1);
  },
  UPPER: (a) => aString(a[0]).toUpperCase(),
  LOWER: (a) => aString(a[0]).toLowerCase(),
  TRIM: (a) => aString(a[0]).trim(),
  LEN: (a) => aString(a[0]).length,
  REPLACE: (a) => aString(a[0]).split(aString(a[1])).join(aString(a[2])),
  // ----- Fechas -----
  TODAY: () => inicioDia(/* @__PURE__ */ new Date()),
  NOW: () => /* @__PURE__ */ new Date(),
  YEAR: (a) => {
    const f = parseFecha(a[0]);
    return f ? f.getFullYear() : null;
  },
  MONTH: (a) => {
    const f = parseFecha(a[0]);
    return f ? f.getMonth() + 1 : null;
  },
  DAY: (a) => {
    const f = parseFecha(a[0]);
    return f ? f.getDate() : null;
  },
  DATEDIFF: (a, _ctx, nodos) => {
    reqArgs(a, 3, "DATEDIFF");
    let unidad = a[2];
    const nodoUnidad = nodos ? nodos[2] : void 0;
    if ((unidad === null || unidad === void 0) && nodoUnidad && nodoUnidad.k === "id" && nodoUnidad.segs.length === 1) {
      unidad = nodoUnidad.segs[0];
    }
    return datediff(a[0], a[1], unidad);
  },
  // ----- Nulos / conversion -----
  ISNULL: (a) => a[0] === null || a[0] === void 0,
  COALESCE: (a) => {
    for (const v of a) {
      if (v !== null && v !== void 0) return v;
    }
    return null;
  },
  NUM: (a) => aNumero(a[0]),
  TEXT: (a) => aString(a[0])
};
var NOMBRES_FUNCIONES = new Set(Object.keys(IMPL));
function evaluar(n, ctx) {
  switch (n.k) {
    case "num":
    case "str":
    case "bool":
      return n.v;
    case "nul":
      return null;
    case "id": {
      const v = resolverPath(n.segs, ctx);
      return v === void 0 ? null : v;
    }
    case "un": {
      if (n.op === "NOT") return !truthy(evaluar(n.a, ctx));
      const v = aNumero(evaluar(n.a, ctx));
      return v === null ? null : -v;
    }
    case "llam": {
      const impl = IMPL[n.nombre];
      if (!impl) throw new Error(`Funcion no permitida: ${n.nombre}`);
      const args = n.args.map((arg) => evaluar(arg, ctx));
      return impl(args, ctx, n.args);
    }
    case "bin":
      return evaluarBin(n, ctx);
  }
}
function evaluarBin(n, ctx) {
  if (n.op === "AND") return truthy(evaluar(n.a, ctx)) && truthy(evaluar(n.b, ctx));
  if (n.op === "OR") return truthy(evaluar(n.a, ctx)) || truthy(evaluar(n.b, ctx));
  if (["=", "<>", "<", ">", "<=", ">="].includes(n.op)) {
    return cmp(n.op, evaluar(n.a, ctx), evaluar(n.b, ctx));
  }
  const a = evaluar(n.a, ctx);
  const b = evaluar(n.b, ctx);
  switch (n.op) {
    case "&":
      return aString(a) + aString(b);
    case "+": {
      if (a === null || a === void 0 || b === null || b === void 0) return null;
      if (typeof a === "string" || typeof b === "string") return aString(a) + aString(b);
      const na = aNumero(a);
      const nb = aNumero(b);
      return na === null || nb === null ? null : na + nb;
    }
    case "-":
    case "*": {
      const na = aNumero(a);
      const nb = aNumero(b);
      if (na === null || nb === null) return null;
      return n.op === "-" ? na - nb : na * nb;
    }
    case "/":
    case "%": {
      const na = aNumero(a);
      const nb = aNumero(b);
      if (na === null || nb === null || nb === 0) return null;
      return n.op === "/" ? na / nb : na % nb;
    }
    default:
      return null;
  }
}
var RE_EXPRESION = /\{([^{}]*)\}/g;
function evaluarExpresion(expresion, ctx = {}) {
  const nodo = parseExpresion(expresion);
  return evaluar(nodo, ctx);
}
function evaluarTexto(texto, ctx = {}) {
  if (!texto || texto.indexOf("{") === -1) return texto;
  return texto.replace(RE_EXPRESION, (completo, interior) => {
    const expr = interior.trim();
    if (!expr) return completo;
    try {
      return aString(evaluarExpresion(expr, ctx));
    } catch {
      return completo;
    }
  });
}
function evaluarObjeto(obj, ctx = {}) {
  try {
    return recorrer(obj, ctx);
  } catch {
    return obj;
  }
}
function recorrer(v, ctx) {
  if (typeof v === "string") return evaluarTexto(v, ctx);
  if (Array.isArray(v)) return v.map((x) => recorrer(x, ctx));
  if (v !== null && v !== void 0 && typeof v === "object" && !(v instanceof Date)) {
    const out = {};
    for (const k of Object.keys(v)) out[k] = recorrer(v[k], ctx);
    return out;
  }
  return v;
}

// src/utils/escpos-formatter.ts
var ESC = "\x1B";
var GS = "";
var LF = "\n";
var CMD_INIT = ESC + "@";
var CMD_NORMALIZAR = "\x1B \0L\0\0W@!\0";
var CMD_ALIGN_LEFT = ESC + "a\0";
var CMD_ALIGN_CENTER = ESC + "a";
var CMD_ALIGN_RIGHT = ESC + "a";
var CMD_BOLD_ON = ESC + "E";
var CMD_BOLD_OFF = ESC + "E\0";
var CMD_CONDENSED = ESC + "!";
var CMD_CONDENSED_OFF = ESC + "!\0";
var CMD_FONT_A = ESC + "M\0";
var CMD_FONT_B = ESC + "M";
var CMD_SIZE_DOUBLE = GS + "!";
var CMD_SIZE_DOUBLE_ALTURA = GS + "!";
var CMD_SIZE_DOUBLE_ANCHO = GS + "!";
var CMD_SIZE_TRIPLE = GS + '!"';
var CMD_SIZE_NORMAL = GS + "!\0";
function feed(n) {
  return ESC + "d" + String.fromCharCode(n);
}
var CMD_CUT = GS + "V\0";
var CMD_J = ESC + "J";
var CMD_UNDERLINE_ON = ESC + "-";
var CMD_UNDERLINE_OFF = ESC + "-\0";
var LINE_LENGTH = 48;
function center(text, width = LINE_LENGTH) {
  if (text.length >= width) return text.slice(0, width);
  const padding = Math.floor((width - text.length) / 2);
  return " ".repeat(padding) + text + " ".repeat(padding);
}
function right(text, width = LINE_LENGTH) {
  if (text.length > width) return text.slice(text.length - width);
  return " ".repeat(width - text.length) + text;
}
function left(text, width = LINE_LENGTH) {
  if (text.length >= width) return text.slice(0, width);
  return text + " ".repeat(width - text.length);
}
function leftVisible(text, width = LINE_LENGTH) {
  const visible = largoVisible(text);
  if (visible > width) return text.slice(0, width);
  return text + " ".repeat(width - visible);
}
function lineSep(char = "-", width = LINE_LENGTH) {
  return char.repeat(Math.max(1, width - 2));
}
function formatMoney(val) {
  const num = Number(val) || 0;
  return num.toFixed(2);
}
function formatDate(val) {
  if (!val) return "--";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  } catch {
    return val;
  }
}
function formatFechaCorta(val) {
  if (!val) return "--";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit"
    });
  } catch {
    return val;
  }
}
function formatTime(val) {
  if (!val) return "--";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleTimeString("es-DO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  } catch {
    return val;
  }
}
function resolverRuta(obj, ruta) {
  const partes = ruta.split(".");
  let cur = obj;
  for (const p of partes) {
    if (cur == null) return void 0;
    cur = cur[p];
  }
  return cur;
}
function generarDatosEjemploArray(zona, numItems = 2) {
  const clavesDetalle = zona.lineas.filter((l) => l.ref.startsWith("DETALLE:")).map((l) => l.ref.slice(8));
  if (clavesDetalle.length === 0) return [];
  return Array.from({ length: numItems }, (_, i) => {
    const item = {};
    for (const clave of clavesDetalle) {
      const partes = clave.split(".");
      let cur = item;
      for (let p = 0; p < partes.length - 1; p++) {
        if (!cur[partes[p]]) cur[partes[p]] = {};
        cur = cur[partes[p]];
      }
      const hoja = partes[partes.length - 1];
      if (/^(monto|precio|cantidad|total|subtotal|impuesto|descuento|porcentaje)/i.test(hoja)) {
        cur[hoja] = Number((10 + i * 5.5).toFixed(2));
      } else {
        cur[hoja] = `${hoja} ${i + 1}`;
      }
    }
    return item;
  });
}
function formatearValorDTO(valor, tipo) {
  if (valor === void 0 || valor === null || valor === "") return "--";
  switch (tipo) {
    case "fecha":
      return formatDate(String(valor));
    case "hora":
      return formatTime(String(valor));
    case "dinero":
      return formatMoney(valor);
    default:
      return String(valor);
  }
}
function largoVisible(texto) {
  let n = 0;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    if (c >= 32 && c <= 126) n++;
  }
  return n;
}
function centerVisible(texto, width = LINE_LENGTH) {
  const n = largoVisible(texto);
  if (n > width) return texto.slice(0, width);
  const padding = Math.floor((width - n) / 2);
  return " ".repeat(padding) + texto + " ".repeat(padding);
}
function rightVisible(texto, width = LINE_LENGTH) {
  const n = largoVisible(texto);
  if (n > width) return texto.slice(n - width);
  return " ".repeat(width - n) + texto;
}
function trimVisible(texto) {
  let inicio = 0;
  let fin = texto.length;
  while (inicio < fin && texto.charCodeAt(inicio) === 32) inicio++;
  while (fin > inicio && texto.charCodeAt(fin - 1) === 32) fin--;
  return texto.substring(inicio, fin);
}
function calcularAnchoCampo(linea, anchoAcumulado, width) {
  if (linea.anchoCampo && linea.anchoCampo > 0) {
    return anchoAcumulado + linea.anchoCampo <= width ? linea.anchoCampo : 0;
  }
  return Math.max(0, width - anchoAcumulado);
}
function wrapTexto(texto, maxLen) {
  const segmentos = [];
  for (const linea of texto.split("\n")) {
    if (largoVisible(linea) <= maxLen) {
      segmentos.push(linea);
      continue;
    }
    let resto = linea;
    while (largoVisible(resto) > maxLen) {
      const slice = resto.slice(0, maxLen);
      const ultimoEspacio = slice.lastIndexOf(" ");
      const corte = ultimoEspacio > 0 ? ultimoEspacio : maxLen;
      segmentos.push(resto.slice(0, corte));
      resto = resto.slice(corte).replace(/^ /, "");
    }
    if (resto.length > 0) segmentos.push(resto);
  }
  return segmentos;
}
function comandosFormato(fmt) {
  const antes = [];
  const despues = [];
  if (!fmt) return { antes, despues };
  if (fmt.alineacion === "centro") {
    antes.push(CMD_ALIGN_CENTER);
    despues.push(CMD_ALIGN_LEFT);
  } else if (fmt.alineacion === "derecha") {
    antes.push(CMD_ALIGN_RIGHT);
    despues.push(CMD_ALIGN_LEFT);
  }
  if (fmt.tamano === "doble") {
    antes.push(CMD_SIZE_DOUBLE);
    despues.push(CMD_SIZE_NORMAL);
  } else if (fmt.tamano === "doble_b") {
    antes.push(CMD_FONT_B + CMD_SIZE_DOUBLE);
    despues.push(CMD_SIZE_NORMAL + CMD_FONT_A);
  } else if (fmt.tamano === "doble_altura") {
    antes.push(CMD_SIZE_DOUBLE_ALTURA);
    despues.push(CMD_SIZE_NORMAL);
  } else if (fmt.tamano === "doble_ancho") {
    antes.push(CMD_SIZE_DOUBLE_ANCHO);
    despues.push(CMD_SIZE_NORMAL);
  } else if (fmt.tamano === "triple") {
    antes.push(CMD_SIZE_TRIPLE);
    despues.push(CMD_SIZE_NORMAL);
  } else if (fmt.tamano === "condensada") {
    antes.push(CMD_CONDENSED);
    despues.push(CMD_CONDENSED_OFF);
  }
  if (fmt.negrita === true) {
    antes.push(CMD_BOLD_ON);
    despues.push(CMD_BOLD_OFF);
  } else if (fmt.negrita === false) {
    antes.push(CMD_BOLD_OFF);
  }
  return { antes, despues };
}
function aplicarFormatoTexto(fmt, texto, width = LINE_LENGTH) {
  if (fmt?.alineacion === "centro") texto = centerVisible(texto, width);
  else if (fmt?.alineacion === "derecha") texto = rightVisible(texto, width);
  const { antes, despues } = comandosFormato(fmt);
  return antes.join("") + texto + LF + despues.join("");
}
function lineaConFormato(fmt, label, valor, width = LINE_LENGTH) {
  const texto = fmt?.negrita === true ? CMD_BOLD_ON + label + CMD_BOLD_OFF + ": " + valor : label + ": " + valor;
  return aplicarFormatoTexto(fmt, texto, width);
}
function lineaConFormatoDual(fmt, fmtLabel, fmtValor, label, valor, width = LINE_LENGTH) {
  const w = Math.max(1, width);
  if (fmtLabel || fmtValor) {
    let lblPart = label + ": ";
    if (fmtLabel?.negrita === true) lblPart = CMD_BOLD_ON + lblPart + CMD_BOLD_OFF;
    else if (fmtLabel?.negrita === false) lblPart = CMD_BOLD_OFF + lblPart;
    let valPart = valor;
    if (fmtValor?.negrita === true) valPart = CMD_BOLD_ON + valPart + CMD_BOLD_OFF;
    else if (fmtValor?.negrita === false) valPart = CMD_BOLD_OFF + valPart;
    return aplicarFormatoTexto(fmt, lblPart + valPart, w);
  }
  return lineaConFormato(fmt, label, valor, w);
}
function padLinea(texto, alineacion, width = LINE_LENGTH) {
  if (alineacion === "centro") return center(texto, width);
  if (alineacion === "derecha") return right(texto, width);
  return texto;
}
function lineaTabular(ctx, label, valor, ancho, fmtLabel, fmtValor) {
  if (fmtLabel) {
    if (fmtLabel.negrita !== void 0) _bo(ctx, fmtLabel.negrita);
    if (fmtLabel.tamano === "condensada") _co(ctx, true);
    else if (fmtLabel.tamano === "doble") ctx.p.push(CMD_SIZE_DOUBLE);
    else if (fmtLabel.tamano === "doble_b") ctx.p.push(CMD_FONT_B + CMD_SIZE_DOUBLE);
    else if (fmtLabel.tamano === "doble_altura") ctx.p.push(CMD_SIZE_DOUBLE_ALTURA);
    else if (fmtLabel.tamano === "doble_ancho") ctx.p.push(CMD_SIZE_DOUBLE_ANCHO);
    else if (fmtLabel.tamano === "triple") ctx.p.push(CMD_SIZE_TRIPLE);
  }
  ctx.p.push(right(label + ":", ancho));
  if (fmtLabel) {
    if (fmtLabel.tamano === "doble" || fmtLabel.tamano === "doble_altura" || fmtLabel.tamano === "doble_ancho" || fmtLabel.tamano === "triple") ctx.p.push(CMD_SIZE_NORMAL);
    else if (fmtLabel.tamano === "doble_b") ctx.p.push(CMD_SIZE_NORMAL + CMD_FONT_A);
    if (fmtLabel.tamano === "condensada") _co(ctx, false);
    if (fmtLabel.negrita !== void 0) _bo(ctx, false);
  }
  if (fmtValor) {
    if (fmtValor.negrita !== void 0) _bo(ctx, fmtValor.negrita);
    if (fmtValor.tamano === "condensada") _co(ctx, true);
    else if (fmtValor.tamano === "doble") ctx.p.push(CMD_SIZE_DOUBLE);
    else if (fmtValor.tamano === "doble_b") ctx.p.push(CMD_FONT_B + CMD_SIZE_DOUBLE);
    else if (fmtValor.tamano === "doble_altura") ctx.p.push(CMD_SIZE_DOUBLE_ALTURA);
    else if (fmtValor.tamano === "doble_ancho") ctx.p.push(CMD_SIZE_DOUBLE_ANCHO);
    else if (fmtValor.tamano === "triple") ctx.p.push(CMD_SIZE_TRIPLE);
  }
  ctx.p.push(valor);
  if (fmtValor) {
    if (fmtValor.tamano === "doble" || fmtValor.tamano === "doble_altura" || fmtValor.tamano === "doble_ancho" || fmtValor.tamano === "triple") ctx.p.push(CMD_SIZE_NORMAL);
    else if (fmtValor.tamano === "doble_b") ctx.p.push(CMD_SIZE_NORMAL + CMD_FONT_A);
    if (fmtValor.tamano === "condensada") _co(ctx, false);
    if (fmtValor.negrita !== void 0) _bo(ctx, false);
  }
}
function lineaTabularStr(label, valor, ancho) {
  const anchoLabel = label.length + 1;
  const columnaValor = Math.max(anchoLabel + 2, ancho);
  return right(label + ":", anchoLabel) + " ".repeat(columnaValor - anchoLabel) + valor;
}
function lineaTabularConFormato(label, valor, ancho, fmtLabel, fmtValor) {
  let lblPart = label + ":";
  if (fmtLabel?.negrita === true) lblPart = CMD_BOLD_ON + lblPart + CMD_BOLD_OFF;
  else if (fmtLabel?.negrita === false) lblPart = CMD_BOLD_OFF + lblPart;
  let valPart = valor;
  if (fmtValor?.negrita === true) valPart = CMD_BOLD_ON + valPart + CMD_BOLD_OFF;
  else if (fmtValor?.negrita === false) valPart = CMD_BOLD_OFF + valPart;
  const anchoLabel = largoVisible(lblPart);
  const columnaValor = Math.max(anchoLabel + 2, ancho);
  return rightVisible(lblPart, anchoLabel) + " ".repeat(columnaValor - anchoLabel) + valPart;
}
function emitirItemEspecial(parts, item, data, width, textosLibres, camposDTO, tabular, mismaLinea, firmas) {
  if (item === "ESPACIO") {
    parts.push(" " + LF);
    return true;
  }
  if (item === "SEPARADOR") {
    parts.push(lineSep("-", width) + LF);
    return true;
  }
  if (item.startsWith("LIBRE:")) {
    const libre = textosLibres?.[item.slice("LIBRE:".length)];
    if (libre) {
      const conf = typeof libre === "string" ? { texto: libre, alineacion: "centro", negrita: true, tamano: "normal" } : libre;
      const fmt = {
        alineacion: conf.alineacion ?? "centro",
        negrita: conf.negrita ?? true,
        tamano: conf.tamano ?? "normal"
      };
      if (mismaLinea) {
        for (const seg of wrapTexto(conf.texto, width)) {
          parts.push(seg + LF);
        }
      } else {
        const { antes, despues } = comandosFormato(fmt);
        parts.push(...antes);
        for (const seg of wrapTexto(conf.texto, width - 2)) {
          parts.push(padLinea(seg, fmt.alineacion, width - 2) + LF);
        }
        parts.push(...despues);
      }
    }
    return true;
  }
  if (item.startsWith("DTO:")) {
    const def = camposDTO?.[item.slice("DTO:".length)];
    if (def) {
      const valor = formatearValorDTO(resolverRuta(data, def.ruta), def.tipo);
      if (tabular) {
        parts.push(lineaTabularStr(def.label || item, valor, tabular.ancho ?? 12) + LF);
      } else {
        parts.push(lineaConFormato(def, def.label || item, valor, width));
      }
    }
    return true;
  }
  if (item.startsWith("FIRMA:")) {
    const firma = firmas?.[item.slice("FIRMA:".length)];
    if (firma) {
      const texto = firma.texto || "Firma autorizada";
      if (firma.linea === "arriba") {
        parts.push(lineSep("-", width) + LF);
        parts.push(padLinea(texto, "centro", width - 2) + LF);
      } else {
        const anchoLinea = Math.max(1, width - 2 - texto.length - 1);
        parts.push(padLinea(texto + " " + lineSep("-", anchoLinea), "centro", width - 2) + LF);
      }
    }
    return true;
  }
  return false;
}
function formatTotalLine(label, amount, width = LINE_LENGTH) {
  const full = `${label} ${amount}`;
  return right(full, Math.max(1, width - 2));
}
function _al(ctx, a) {
  let al;
  switch (a) {
    case "izquierda":
      al = "left";
      break;
    case "centro":
      al = "center";
      break;
    case "derecha":
      al = "right";
      break;
    default:
      al = a;
  }
  if (!ctx.forceAl && ctx.al === al) return;
  ctx.forceAl = false;
  ctx.al = al;
  ctx.p.push(al === "center" ? CMD_ALIGN_CENTER : al === "right" ? CMD_ALIGN_RIGHT : CMD_ALIGN_LEFT);
}
function _bo(ctx, b) {
  if (ctx.bo !== b) {
    ctx.bo = b;
    ctx.p.push(b ? CMD_BOLD_ON : CMD_BOLD_OFF);
  }
}
function _co(ctx, c) {
  if (ctx.co !== c) {
    ctx.co = c;
    ctx.p.push(c ? CMD_CONDENSED : CMD_SIZE_NORMAL);
  }
}
function _aplicarFmt(ctx, fmt) {
  if (!fmt) return;
  if (fmt.alineacion) _al(ctx, fmt.alineacion);
  if (fmt.negrita !== void 0) _bo(ctx, fmt.negrita);
  if (fmt.tamano === "condensada") _co(ctx, true);
  else if (fmt.tamano === "doble") {
    ctx.p.push(CMD_SIZE_DOUBLE);
  } else if (fmt.tamano === "doble_b") {
    ctx.p.push(CMD_FONT_B + CMD_SIZE_DOUBLE);
  } else if (fmt.tamano === "doble_altura") {
    ctx.p.push(CMD_SIZE_DOUBLE_ALTURA);
  } else if (fmt.tamano === "doble_ancho") {
    ctx.p.push(CMD_SIZE_DOUBLE_ANCHO);
  } else if (fmt.tamano === "triple") {
    ctx.p.push(CMD_SIZE_TRIPLE);
  }
}
function _restaurarFmt(ctx, fmt) {
  if (!fmt) return;
  if (fmt.negrita !== void 0) _bo(ctx, false);
  if (fmt.tamano === "condensada") _co(ctx, false);
  if (fmt.tamano === "doble" || fmt.tamano === "doble_altura" || fmt.tamano === "doble_ancho" || fmt.tamano === "triple") ctx.p.push(CMD_SIZE_NORMAL);
  else if (fmt.tamano === "doble_b") ctx.p.push(CMD_SIZE_NORMAL + CMD_FONT_A);
}
function _emitirSep(ctx, linea) {
  const rawChar = linea.caracter || "-";
  const margen = linea.margen || 0;
  const char = rawChar === "\u2500" ? "_" : rawChar === "\u2550" ? "=" : rawChar;
  if (ctx.forceAl) _al(ctx, "left");
  _aplicarFmt(ctx, linea.formato);
  if (margen > 0) ctx.p.push(CMD_J + String.fromCharCode(margen));
  let sepWidth = ctx.w;
  const anchoCfg = linea.ancho;
  if (typeof anchoCfg === "number" && anchoCfg > 0) {
    sepWidth = Math.min(anchoCfg, ctx.w);
  } else if (typeof anchoCfg === "string" && anchoCfg.endsWith("%")) {
    const pct = parseInt(anchoCfg, 10);
    if (!isNaN(pct)) sepWidth = Math.max(1, Math.floor(ctx.w * pct / 100));
  }
  const alSep = linea.alineacionSep;
  let padIzq = 0;
  if (sepWidth < ctx.w) {
    if (alSep === "derecha") {
      padIzq = ctx.w - sepWidth;
    } else if (alSep === "izquierda") {
      padIzq = 0;
    } else {
      padIzq = Math.floor((ctx.w - sepWidth) / 2);
    }
  }
  const grosor = Math.max(1, Math.min(3, linea.grosor ?? 1));
  if (char === "linea" || char === "linea_gruesa") {
    const underlineCmd = char === "linea_gruesa" ? ESC + "-" : ESC + "-";
    const padDer = ctx.w - sepWidth - padIzq;
    const lineContent = underlineCmd + " ".repeat(padIzq) + " ".repeat(sepWidth) + " ".repeat(padDer) + CMD_UNDERLINE_OFF;
    for (let g = 0; g < grosor; g++) {
      ctx.p.push(lineContent + LF);
    }
    ctx.p.push(CMD_J + "");
  } else {
    const sep = char.repeat(sepWidth);
    const sepLine = " ".repeat(padIzq) + sep + " ".repeat(ctx.w - sepWidth - padIzq);
    for (let g = 0; g < grosor; g++) {
      ctx.p.push(sepLine + LF);
    }
  }
  if (linea.formato?.negrita !== void 0) _bo(ctx, false);
  if (linea.formato?.tamano === "condensada") _co(ctx, false);
  if (margen > 0) ctx.p.push(CMD_J + String.fromCharCode(margen));
}
function _emitirEspacio(ctx) {
  if (ctx.forceAl) _al(ctx, "left");
  ctx.p.push(" " + LF);
}
function renderDetalleCampo(clave, det) {
  switch (clave) {
    case "CODIGO":
      return String(det.codigo || "").slice(0, 10);
    case "ARTICULO":
      return String(det.articulo || "--");
    case "CANTIDAD":
      return formatMoney(Number(det.cantidad || 0));
    case "PRECIO":
      return formatMoney(Number(det.precio || 0));
    case "ITBIS":
      return formatMoney(Number(det.impuestos || 0));
    case "TOTAL":
      return formatMoney(Number(det.total || 0));
    default: {
      const valor = resolverRuta(det, clave) ?? resolverRuta(det, clave.toLowerCase());
      if (valor !== void 0 && valor !== null) {
        if (typeof valor === "number") return formatMoney(valor);
        return String(valor);
      }
      return "--";
    }
  }
}
function renderDetalleCampoFRI(clave, det) {
  switch (clave) {
    case "DOCUMENTO":
      return String(det.documento || "--");
    case "MONTO_ORIG":
      return formatMoney(Number(det.montoOriginal || 0));
    case "PAGADO":
      return formatMoney(Number(det.pagado || 0));
    case "APLICADO":
      return formatMoney(Number(det.monto || 0));
    default: {
      const valor = resolverRuta(det, clave) ?? resolverRuta(det, clave.toLowerCase());
      if (valor !== void 0 && valor !== null) {
        if (typeof valor === "number") return formatMoney(valor);
        return String(valor);
      }
      return "--";
    }
  }
}
function aplicarExpresiones(config, data, company) {
  if (!config) return config;
  try {
    const ctx = { data, company, config };
    return evaluarObjeto(config, ctx);
  } catch {
    return config;
  }
}
function formatTicketPOS(data, company, config) {
  const cfg = normalizarConfig(aplicarExpresiones(config, data, company));
  const width = cfg.opciones?.anchoLinea ?? LINE_LENGTH;
  const zonas = cfg.zonas || [];
  const tot = cfg.totales || {};
  const cob = cfg.cobros || {};
  const pie = cfg.pie?.textoPie || "** GRACIAS POR SU COMPRA **";
  const companyName = company?.nombre || data?.sucursal?.nombre || "SU EMPRESA";
  const tituloTexto = cfg.titulo?.texto || "FACTURA AL CONTADO";
  const textosLibres = cfg.textosLibres || cfg.campos?.textosLibres;
  const camposDTO = cfg.camposDTO || cfg.campos?.camposDTO;
  const firmas = cfg.firmas;
  const ctx = { p: [], w: width, al: "left", bo: false, co: false, forceAl: false };
  ctx.p.push(CMD_INIT + CMD_NORMALIZAR);
  let maxLabelLenTotales = 0;
  let maxValorLenTotales = 0;
  let maxLabelLenCobros = 0;
  let maxValorLenCobros = 0;
  data.COMPANIA = companyName;
  data.DIRECCION = company?.direccion || "";
  data.TELEFONO = company?.telefono || "";
  data.RNC = company?.rnc || "";
  data.FAX = company?.fax || "";
  data.SLOGAN = company?.slogan || "";
  data.TITULO = tituloTexto;
  function emitirLinea(linea) {
    if (linea.ref === "SEPARADOR") {
      _emitirSep(ctx, linea);
      return;
    }
    if (linea.ref === "ESPACIO") {
      _emitirEspacio(ctx);
      return;
    }
    if (linea.ref.startsWith("LIBRE:") || linea.ref.startsWith("DTO:") || linea.ref.startsWith("FIRMA:")) {
      emitirItemEspecial(ctx.p, linea.ref, data, width, textosLibres, camposDTO, linea.tabular, linea.mismaLinea, firmas);
      return;
    }
    const ref = linea.ref;
    const lblOv = linea.label;
    const fmtOv = linea.formato;
    const fmtLabel = linea.formatoLabel || linea.formato;
    const fmtValor = linea.formatoValor;
    if (ref.startsWith("CAMPO:")) {
      const clave = ref.slice(6);
      switch (clave) {
        case "CODIGO_QR": {
          _aplicarFmt(ctx, fmtOv);
          const qrRender = renderCampoFPV(clave, data, lblOv, fmtOv, width, linea.tabular, linea.mostrarLabel, fmtLabel, fmtValor, linea.ruta);
          if (qrRender) ctx.p.push(qrRender);
          _restaurarFmt(ctx, fmtOv);
          ctx.p.push(CMD_INIT + CMD_NORMALIZAR);
          ctx.al = "left";
          ctx.bo = false;
          ctx.co = false;
          break;
        }
        case "CODIGO_BARRAS": {
          const fmtBc = { ...fmtOv || {}, alineacion: fmtOv?.alineacion || "centro" };
          _aplicarFmt(ctx, fmtBc);
          const bcRender = renderCampoFPV(clave, data, lblOv, fmtOv, width, linea.tabular, linea.mostrarLabel, fmtLabel, fmtValor, linea.ruta);
          if (bcRender) ctx.p.push(bcRender);
          _restaurarFmt(ctx, fmtOv);
          ctx.p.push(CMD_INIT + CMD_NORMALIZAR);
          ctx.al = "left";
          ctx.bo = false;
          ctx.co = false;
          break;
        }
        default: {
          const render = renderCampoFPV(clave, data, lblOv, fmtOv, width, linea.tabular, linea.mostrarLabel, fmtLabel, fmtValor, linea.ruta);
          if (render) ctx.p.push(render);
          _restaurarFmt(ctx, fmtOv);
          break;
        }
      }
      return;
    }
    if (ref.startsWith("TOTAL:")) {
      const clave = ref.slice(6);
      const tieneTab = !!linea.tabular;
      const fmtCombTot = { ...linea.formatoLabel || {}, ...linea.formatoValor || {}, ...fmtOv || {} };
      const fmtSinAlineacion = { ...fmtCombTot, alineacion: void 0 };
      _aplicarFmt(ctx, fmtSinAlineacion);
      const totalGravado = Number(data.subTotal) || 0;
      const itbis = Number(data.impuestos) || 0;
      const descuento = Number(data.descuento) || 0;
      const totalExento = Number(data.totalExento) || 0;
      const tabAn = linea.tabular?.ancho ?? 12;
      const lineaLbl = linea.label;
      const emitirTotal = (label, monto) => {
        if (linea.mostrarLabel === false) {
          if (tieneTab) {
            lineaTabular(ctx, "", monto, tabAn, void 0, linea.formatoValor || fmtOv);
            ctx.p.push(LF);
          } else {
            _aplicarFmt(ctx, linea.formatoValor || fmtOv);
            ctx.p.push(monto + LF);
            _restaurarFmt(ctx, linea.formatoValor || fmtOv);
          }
          return;
        }
        const lbl = lineaLbl || label;
        if (tieneTab) {
          const anchoLabel = maxLabelLenTotales;
          const columnaValor = Math.max(anchoLabel + 3, tabAn);
          const texto = right(lbl, anchoLabel) + ":  " + " ".repeat(columnaValor - anchoLabel - 3) + right(monto, maxValorLenTotales);
          const alineacion = linea.formatoLabel?.alineacion || linea.formatoValor?.alineacion || linea.formato?.alineacion || zonaActualAlineacion;
          if (alineacion === "izquierda") {
            ctx.p.push(texto + LF);
          } else if (alineacion === "centro") {
            ctx.p.push(centerVisible(texto, width) + LF);
          } else {
            ctx.p.push(rightVisible(texto, width) + LF);
          }
        } else {
          const texto = right(lbl, maxLabelLenTotales) + ":  " + right(monto, maxValorLenTotales);
          const alineacion = linea.formatoLabel?.alineacion || linea.formatoValor?.alineacion || linea.formato?.alineacion || zonaActualAlineacion;
          if (alineacion === "izquierda") {
            ctx.p.push(texto + LF);
          } else if (alineacion === "centro") {
            ctx.p.push(centerVisible(texto, width) + LF);
          } else {
            ctx.p.push(rightVisible(texto, width) + LF);
          }
        }
      };
      switch (clave) {
        case "TOTAL_GRAVADO":
          if (tot.mostrarGravado === false) return;
          emitirTotal("Total Gravado", formatMoney(totalGravado));
          break;
        case "SUBTOTAL":
          if (tot.mostrarSubtotal === false) return;
          emitirTotal("Subtotal", formatMoney(totalGravado));
          break;
        case "ITBIS":
          if (tot.mostrarItbis === false) return;
          emitirTotal("Itbis", formatMoney(itbis));
          break;
        case "DESCUENTO":
          if (tot.mostrarDescuento === false || descuento <= 0) return;
          emitirTotal("Descuento", formatMoney(descuento));
          break;
        case "TOTAL_EXENTO":
          emitirTotal("Total Exento", formatMoney(totalExento));
          break;
        case "TOTAL":
          emitirTotal("Total", formatMoney(data.total));
          break;
      }
      _restaurarFmt(ctx, fmtSinAlineacion);
      return;
    }
    if (ref.startsWith("COBRO:")) {
      const fmtCombCobro = { ...linea.formatoLabel || {}, ...linea.formatoValor || {}, ...fmtOv || {}, alineacion: void 0 };
      _aplicarFmt(ctx, fmtCombCobro);
      emitirCobroFPVLinea(ctx, ref.slice(6), data, cob, cfg, width, linea, maxLabelLenCobros, maxValorLenCobros, zonaActualAlineacion);
      _restaurarFmt(ctx, fmtCombCobro);
      return;
    }
  }
  function emitirLineasConBuffer(lineas) {
    const buffer = [];
    let anchoAcumulado = 0;
    for (let idx = 0; idx < lineas.length; idx++) {
      const linea = lineas[idx];
      const prevLen = ctx.p.length;
      emitirLinea(linea);
      const nuevas = ctx.p.splice(prevLen);
      if (linea.mismaLinea) {
        const anchoCampo = calcularAnchoCampo(linea, anchoAcumulado, width);
        if (anchoCampo === 0) {
          continue;
        }
        const limpio = nuevas.join("").replace(/\x1Ba[\x00-\x02]/g, "").replace(/\n/g, " ");
        const textoTrim = trimVisible(limpio);
        buffer.push(leftVisible(textoTrim, anchoCampo));
        anchoAcumulado += anchoCampo;
      } else {
        if (buffer.length > 0) {
          ctx.p.push(...buffer);
          buffer.length = 0;
        }
        ctx.p.push(...nuevas);
        anchoAcumulado = 0;
      }
    }
    if (buffer.length > 0) ctx.p.push(...buffer);
  }
  const zonaCabFPV = zonas.find((z) => z.tipo === "cabecera_grupo_detalle");
  const zonaDetFPV = zonas.find((z) => z.tipo === "detalle");
  const todasDetFPV = [
    ...(zonaCabFPV?.lineas || []).filter((l) => l.ref.startsWith("DETALLE:")),
    ...(zonaDetFPV?.lineas || []).filter((l) => l.ref.startsWith("DETALLE:"))
  ];
  const hayTabularGlobalFPV = todasDetFPV.some((l) => l.tabular);
  const anchoFillFPV = !hayTabularGlobalFPV && todasDetFPV.length > 0 ? Math.floor(width / todasDetFPV.length) : 0;
  let zonaActualAlineacion;
  for (const zona of zonas) {
    switch (zona.tipo) {
      case "encabezado_reporte":
      case "pie_reporte":
        zonaActualAlineacion = zona.alineacion;
        if (zona.alineacion) _al(ctx, zona.alineacion);
        else _al(ctx, "izquierda");
        emitirLineasConBuffer(zona.lineas);
        _bo(ctx, false);
        _co(ctx, false);
        _al(ctx, "izquierda");
        ctx.forceAl = true;
        break;
      case "totales": {
        zonaActualAlineacion = zona.alineacion;
        maxLabelLenTotales = 0;
        maxValorLenTotales = 0;
        for (const linea of zona.lineas) {
          if (linea.ref.startsWith("TOTAL:")) {
            const clave = linea.ref.slice(6);
            let labelDefault = clave;
            let valorTexto = "";
            switch (clave) {
              case "TOTAL_GRAVADO":
                labelDefault = "Total Gravado";
                valorTexto = formatMoney(Number(data.subTotal) || 0);
                break;
              case "SUBTOTAL":
                labelDefault = "Subtotal";
                valorTexto = formatMoney(Number(data.subTotal) || 0);
                break;
              case "ITBIS":
                labelDefault = "Itbis";
                valorTexto = formatMoney(Number(data.impuestos) || 0);
                break;
              case "DESCUENTO":
                labelDefault = "Descuento";
                valorTexto = formatMoney(Number(data.descuento) || 0);
                break;
              case "TOTAL_EXENTO":
                labelDefault = "Total Exento";
                valorTexto = formatMoney(Number(data.totalExento) || 0);
                break;
              case "TOTAL":
                labelDefault = "Total";
                valorTexto = formatMoney(Number(data.total) || 0);
                break;
            }
            const lbl = linea.label || labelDefault;
            if (lbl.length > maxLabelLenTotales) maxLabelLenTotales = lbl.length;
            if (valorTexto.length > maxValorLenTotales) maxValorLenTotales = valorTexto.length;
          }
        }
        if (zona.alineacion) _al(ctx, zona.alineacion);
        else _al(ctx, "izquierda");
        emitirLineasConBuffer(zona.lineas);
        _bo(ctx, false);
        _co(ctx, false);
        _al(ctx, "izquierda");
        ctx.forceAl = true;
        break;
      }
      case "pie_detalle":
      case "encabezado_pagina":
      case "pie_pagina":
        zonaActualAlineacion = zona.alineacion;
        if (zona.alineacion) _al(ctx, zona.alineacion);
        else _al(ctx, "izquierda");
        emitirLineasConBuffer(zona.lineas);
        _bo(ctx, false);
        _co(ctx, false);
        _al(ctx, "izquierda");
        ctx.forceAl = true;
        break;
      case "cobros": {
        zonaActualAlineacion = zona.alineacion;
        maxLabelLenCobros = 0;
        maxValorLenCobros = 0;
        const crsPre = data.cobros || [];
        const cPre = crsPre.length > 0 ? crsPre[0] : null;
        for (const linea of zona.lineas) {
          if (linea.ref.startsWith("COBRO:")) {
            const nombre = linea.ref.slice(6);
            const label = linea.label || nombre.replace(/_/g, " ");
            if (label.length > maxLabelLenCobros) maxLabelLenCobros = label.length;
            let valor = "";
            if (cPre) {
              if (nombre === "DEVUELTA") {
                const dev = Number(cPre.devuelta) || 0;
                if (dev > 0.01) valor = formatMoney(dev);
              } else {
                const mapa = {
                  EFECTIVO: Number(cPre.efectivo) || 0,
                  CHEQUE: Number(cPre.cheque) || 0,
                  TARJETA_CREDITO: Number(cPre.tarjetaCredito) || 0,
                  TARJETA_DEBITO: Number(cPre.tarjetaDebito) || 0,
                  TRANSFERENCIA: Number(cPre.transferencia) || 0,
                  BONO: Number(cPre.bono) || 0,
                  TARJETA_REGALO: Number(cPre.tarjetaRegalo) || 0,
                  NOTA_CREDITO: Number(cPre.notaCredito) || 0
                };
                const monto = mapa[nombre];
                if (monto > 0) valor = formatMoney(monto);
              }
            }
            if (valor.length > maxValorLenCobros) maxValorLenCobros = valor.length;
          }
        }
        if (zona.alineacion) _al(ctx, zona.alineacion);
        else _al(ctx, "izquierda");
        const tieneLineasCobro = zona.lineas.some((l) => l.ref.startsWith("COBRO:"));
        if (!tieneLineasCobro) {
          const crs = data.cobros || [];
          if (cob.mostrarCobros !== false && crs.length > 0) {
            const c = crs[0];
            const efectivo = Number(c.efectivo) || 0;
            const cheque = Number(c.cheque) || 0;
            const tarjetaCredito = Number(c.tarjetaCredito) || 0;
            const tarjetaDebito = Number(c.tarjetaDebito) || 0;
            const transferencia = Number(c.transferencia) || 0;
            const bono = Number(c.bono) || 0;
            const tarjetaRegalo = Number(c.tarjetaRegalo) || 0;
            const notaCredito = Number(c.notaCredito) || 0;
            if (efectivo > 0) ctx.p.push(formatTotalLine("EFECTIVO", formatMoney(efectivo), width) + LF);
            if (cheque > 0) ctx.p.push(formatTotalLine("CHEQUE", formatMoney(cheque), width) + LF);
            if (tarjetaCredito > 0) ctx.p.push(formatTotalLine("TARJETA CREDITO", formatMoney(tarjetaCredito), width) + LF);
            if (tarjetaDebito > 0) ctx.p.push(formatTotalLine("TARJETA DEBITO", formatMoney(tarjetaDebito), width) + LF);
            if (transferencia > 0) ctx.p.push(formatTotalLine("TRANSFERENCIA", formatMoney(transferencia), width) + LF);
            if (bono > 0) ctx.p.push(formatTotalLine("BONO", formatMoney(bono), width) + LF);
            if (tarjetaRegalo > 0) ctx.p.push(formatTotalLine("TARJETA REGALO", formatMoney(tarjetaRegalo), width) + LF);
            if (notaCredito > 0) ctx.p.push(formatTotalLine("NOTA CREDITO", formatMoney(notaCredito), width) + LF);
            const devuelta = Number(c.devuelta) || 0;
            if (devuelta > 0.01) {
              ctx.p.push(formatTotalLine("DEVUELTA", formatMoney(devuelta), width) + LF);
            }
          }
        }
        emitirLineasConBuffer(zona.lineas);
        _bo(ctx, false);
        _co(ctx, false);
        _al(ctx, "izquierda");
        ctx.forceAl = true;
        break;
      }
      case "cabecera_grupo_detalle": {
        zonaActualAlineacion = zona.alineacion;
        if (zona.alineacion) _al(ctx, zona.alineacion);
        else _al(ctx, "izquierda");
        const cabeceraPartsFPV = [];
        const flushCabFPV = () => {
          if (cabeceraPartsFPV.length > 0) {
            ctx.p.push(cabeceraPartsFPV.join("") + LF);
            cabeceraPartsFPV.length = 0;
          }
        };
        for (const linea of zona.lineas) {
          if (linea.ref.startsWith("DETALLE:")) {
            const clave = linea.ref.slice(8);
            const label = linea.label || CAMPOS_DETALLE_LABELS[clave] || clave;
            const anchoTabular = linea.tabular?.ancho || 0;
            let labelFmt;
            if (anchoTabular > 0) {
              const al = linea.formato?.alineacion;
              if (al === "derecha") labelFmt = right(label, anchoTabular);
              else if (al === "centro") labelFmt = center(label, anchoTabular);
              else labelFmt = left(label, anchoTabular);
            } else if (anchoFillFPV > 0) {
              const al = linea.formato?.alineacion;
              if (al === "derecha") labelFmt = right(label, anchoFillFPV);
              else if (al === "centro") labelFmt = center(label, anchoFillFPV);
              else labelFmt = left(label, anchoFillFPV);
            } else {
              labelFmt = label;
            }
            const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: void 0 });
            cabeceraPartsFPV.push(antes.join("") + labelFmt + despues.join(""));
          } else {
            flushCabFPV();
            emitirLinea(linea);
          }
        }
        flushCabFPV();
        _bo(ctx, false);
        _co(ctx, false);
        _al(ctx, "izquierda");
        ctx.forceAl = true;
        break;
      }
      case "detalle": {
        zonaActualAlineacion = zona.alineacion;
        if (zona.alineacion) _al(ctx, zona.alineacion);
        else _al(ctx, "izquierda");
        const detalles = zona.arrayOrigen ? resolverRuta(data, zona.arrayOrigen) || generarDatosEjemploArray(zona) : data.detalles || [];
        let anchoAcumDetFPV = 0;
        for (const det of detalles) {
          const bufferLinea = [];
          for (const linea of zona.lineas) {
            if (!linea.ref.startsWith("DETALLE:")) {
              if (bufferLinea.length > 0) {
                ctx.p.push(...bufferLinea, LF);
                bufferLinea.length = 0;
              }
              anchoAcumDetFPV = 0;
              emitirLinea(linea);
              continue;
            }
            const clave = linea.ref.slice(8);
            const valor = renderDetalleCampo(clave, det);
            const texto = linea.mostrarLabel !== false ? (linea.label || CAMPOS_DETALLE_LABELS[clave] || clave) + ": " + valor : valor;
            if (linea.mismaLinea) {
              const anchoCampo = calcularAnchoCampo(linea, anchoAcumDetFPV, width);
              if (anchoCampo === 0) continue;
              const textoTrim = trimVisible(texto);
              const textoPad = leftVisible(textoTrim, anchoCampo);
              const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: void 0 });
              bufferLinea.push(antes.join("") + textoPad + despues.join(""));
              anchoAcumDetFPV += anchoCampo;
            } else {
              if (bufferLinea.length > 0) {
                ctx.p.push(...bufferLinea, LF);
                bufferLinea.length = 0;
              }
              anchoAcumDetFPV = 0;
              const al = linea.formato?.alineacion;
              let textoPad;
              if (al === "derecha") textoPad = rightVisible(texto, width);
              else if (al === "centro") textoPad = centerVisible(texto, width);
              else textoPad = leftVisible(texto, width);
              const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: void 0 });
              ctx.p.push(antes.join("") + textoPad + despues.join(""), LF);
            }
          }
          if (bufferLinea.length > 0) {
            ctx.p.push(...bufferLinea, LF, CMD_J + "\b");
          }
          anchoAcumDetFPV = 0;
        }
        break;
      }
      case "banda": {
        zonaActualAlineacion = zona.alineacion;
        if (zona.alineacion) _al(ctx, zona.alineacion);
        else _al(ctx, "izquierda");
        emitirLineasConBuffer(zona.lineas);
        _bo(ctx, false);
        _co(ctx, false);
        _al(ctx, "izquierda");
        ctx.forceAl = true;
        break;
      }
    }
  }
  ctx.p.push(LF);
  return ctx.p.join("");
}
function renderCampoFPV(clave, data, lblOv, fmtOv, width, tabular, mostrarLabel, fmtLabel, fmtValor, ruta) {
  const w = width ?? LINE_LENGTH;
  const defaultLabels = {
    NCF: "NCF",
    TIPO_COMP: "TIPO COMP",
    CAJERO: "CAJERO",
    CAJA: "CAJA",
    TURNO: "TURNO",
    FECHA: "FECHA",
    HORA: "HORA",
    NO: "NO",
    CLIENTE: "CLIENTE",
    RNC_CLIENTE: "RNC CLIENTE",
    COMPANIA: "Compa\xF1\xEDa",
    DIRECCION: "Direcci\xF3n",
    TELEFONO: "Tel\xE9fono",
    RNC: "RNC",
    FAX: "Fax",
    SLOGAN: "Slogan",
    FECHA_VENCIMIENTO_NCF: "Vence",
    SECUENCIA_NCF: "Secuencia NCF",
    CODIGO_SEGURIDAD: "C\xF3digo de Seguridad",
    FECHA_FIRMA_DIGITAL: "Fecha Firma Digital"
  };
  const lbl = lblOv !== void 0 && lblOv !== "" && lblOv !== defaultLabels[clave] ? lblOv : defaultLabels[clave] || clave;
  const fmt = fmtOv;
  function val() {
    switch (clave) {
      case "NCF":
        return data.ncf || "--";
      case "TIPO_COMP":
        return data.transaccionNCF?.nombreTipoComprobante || data.secuenciaNCF?.nombreTipoComprobante || "--";
      case "CAJERO":
        return data.cajero || "--";
      case "CAJA":
        return data.caja || "--";
      case "TURNO":
        return data.turno || "--";
      case "FECHA":
        return formatDate(data.fechaDocumento);
      case "HORA":
        return formatTime(data.fechaDocumento);
      case "NO":
        return data.noDocumento || "--";
      case "CLIENTE":
        return data.cliente?.nombre || "Consumidor Final";
      case "RNC_CLIENTE": {
        const rnc = data.cliente?.identificacion || "";
        return rnc;
      }
      case "FECHA_IMPRESION":
        return (/* @__PURE__ */ new Date()).toLocaleString("es-DO");
      case "HORA_IMPRESION":
        return (/* @__PURE__ */ new Date()).toLocaleTimeString("es-DO");
      case "NUM_DETALLES":
        return String(data.detalles?.length || 0);
      case "COMPANIA":
        return data.COMPANIA || "--";
      case "DIRECCION":
        return data.DIRECCION || "";
      case "TELEFONO":
        return data.TELEFONO || "";
      case "RNC":
        return data.RNC || "";
      case "FAX":
        return data.FAX || "";
      case "SLOGAN":
        return data.SLOGAN || "";
      case "TITULO":
        return data.TITULO || "--";
      case "FECHA_VENCIMIENTO_NCF":
        return formatDate(data.transaccionNCF?.fechaVencimiento);
      case "SECUENCIA_NCF":
        return data.transaccionNCF?.secuencia || data.secuenciaNCF?.secuencia || "--";
      case "CODIGO_SEGURIDAD": {
        const qrUrl = data.envioDGII?.codigoQR || data.codigoQR || "";
        if (!qrUrl) return "--";
        const params = new URLSearchParams(qrUrl.split("?")[1] || "");
        return params.get("CodigoSeguridad") || "--";
      }
      case "FECHA_FIRMA_DIGITAL": {
        const qrUrl = data.envioDGII?.codigoQR || data.codigoQR || "";
        if (qrUrl) {
          const params = new URLSearchParams(qrUrl.split("?")[1] || "");
          const fechaFirma = params.get("FechaFirma");
          if (fechaFirma) return formatDate(fechaFirma);
        }
        return formatDate(data.envioDGII?.fechaEnvio) || "--";
      }
      default:
        return "--";
    }
  }
  if (clave === "CODIGO_QR") {
    const qrData = data.envioDGII?.codigoQR || data.codigoQR;
    if (!qrData) return null;
    return escposQRCode(qrData);
  }
  if (clave === "CODIGO_BARRAS") {
    const bcData = ruta ? resolverRuta(data, ruta) : data.codigoBarras || data.transaccionNCF?.secuencia || data.secuenciaNCF?.secuencia;
    if (bcData === void 0 || bcData === null || bcData === "") return null;
    return escposBarcode(String(bcData));
  }
  const v = val();
  if (clave === "RNC_CLIENTE" && !lblOv && v !== "" && !tabular) {
    const clienteRnc = data.cliente?.identificacion || "";
    if (!clienteRnc) return null;
    return aplicarFormatoTexto(fmt, "         RNC: " + clienteRnc, w);
  }
  if (clave === "RNC_CLIENTE" && lblOv) {
    const clienteRnc = data.cliente?.identificacion || "";
    if (!clienteRnc) return null;
    return lineaConFormato(fmt, lbl, clienteRnc, w);
  }
  if (v === "" || v === void 0) return null;
  if (mostrarLabel === false) {
    return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
  }
  if (tabular) {
    const tabAn = tabular.ancho ?? 12;
    if (clave === "RNC_CLIENTE" && !lblOv) {
      const clienteRnc = data.cliente?.identificacion || "";
      if (!clienteRnc) return null;
      if (fmtLabel || fmtValor) {
        const fmtComb = { ...fmtLabel, ...fmtValor, ...fmt, alineacion: void 0 };
        return aplicarFormatoTexto(fmtComb, lineaTabularConFormato("RNC", clienteRnc, tabAn, fmtLabel || fmt, fmtValor), w);
      }
      return aplicarFormatoTexto(fmt, lineaTabularStr("RNC", clienteRnc, tabAn) + LF, w);
    }
    if (fmtLabel || fmtValor) {
      const fmtComb = { ...fmtLabel, ...fmtValor, ...fmt, alineacion: void 0 };
      return aplicarFormatoTexto(fmtComb, lineaTabularConFormato(lbl, v, tabAn, fmtLabel || fmt, fmtValor), w);
    }
    return aplicarFormatoTexto(fmt, lineaTabularStr(lbl, v, tabAn), w);
  }
  if (fmtLabel || fmtValor) {
    let lblStr = lbl + ": ";
    if (fmtLabel?.negrita === true) lblStr = CMD_BOLD_ON + lblStr + CMD_BOLD_OFF;
    else if (fmtLabel?.negrita === false) lblStr = CMD_BOLD_OFF + lblStr;
    let valStr = v;
    if (fmtValor?.negrita === true) valStr = CMD_BOLD_ON + valStr + CMD_BOLD_OFF;
    else if (fmtValor?.negrita === false) valStr = CMD_BOLD_OFF + valStr;
    const texto2 = lblStr + valStr;
    const alineacion = fmtLabel?.alineacion || fmtValor?.alineacion || fmtOv?.alineacion;
    const fmtCombinado = { ...fmtLabel, ...fmtValor, ...fmtOv };
    if (alineacion) fmtCombinado.alineacion = alineacion;
    return aplicarFormatoTexto(fmtCombinado, texto2, w);
  }
  if (fmt?.negrita === true || fmt?.negrita === false) {
    const texto2 = lbl + ": " + v;
    return aplicarFormatoTexto(fmt, texto2, w);
  }
  const texto = CMD_BOLD_ON + lbl + CMD_BOLD_OFF + ": " + v;
  return aplicarFormatoTexto(fmt, texto, w);
}
function emitirCobroFPVLinea(ctx, nombre, data, cob, cfg, width, linea, maxLabelLenCobros, maxValorLenCobros, zonaActualAlineacion) {
  const crs = data.cobros || [];
  if (cob.mostrarCobros === false || crs.length === 0) return;
  const c = crs[0];
  const tieneTab = !!linea.tabular;
  const tabAn = linea.tabular?.ancho ?? 12;
  const lineaLbl = linea.label;
  const fmtOv = linea.formato;
  const mapa = {
    EFECTIVO: Number(c.efectivo) || 0,
    CHEQUE: Number(c.cheque) || 0,
    TARJETA_CREDITO: Number(c.tarjetaCredito) || 0,
    TARJETA_DEBITO: Number(c.tarjetaDebito) || 0,
    TRANSFERENCIA: Number(c.transferencia) || 0,
    BONO: Number(c.bono) || 0,
    TARJETA_REGALO: Number(c.tarjetaRegalo) || 0,
    NOTA_CREDITO: Number(c.notaCredito) || 0
  };
  let monto;
  if (nombre === "DEVUELTA") {
    monto = Number(c.devuelta) || 0;
    if (monto <= 0.01) return;
  } else {
    monto = mapa[nombre];
    if (monto <= 0) return;
  }
  const montoStr = formatMoney(monto);
  const label = lineaLbl || nombre.replace(/_/g, " ");
  if (linea.mostrarLabel === false) {
    if (tieneTab) {
      lineaTabular(ctx, "", montoStr, tabAn, void 0, linea.formatoValor || fmtOv);
      ctx.p.push(LF);
    } else {
      _aplicarFmt(ctx, linea.formatoValor || fmtOv);
      ctx.p.push(montoStr + LF);
      _restaurarFmt(ctx, linea.formatoValor || fmtOv);
    }
    return;
  }
  if (tieneTab) {
    const anchoLabel = maxLabelLenCobros;
    const columnaValor = Math.max(anchoLabel + 3, tabAn);
    const texto = right(label, anchoLabel) + ":  " + " ".repeat(columnaValor - anchoLabel - 3) + right(montoStr, maxValorLenCobros);
    const alineacion = linea.formatoLabel?.alineacion || linea.formatoValor?.alineacion || linea.formato?.alineacion || zonaActualAlineacion;
    if (alineacion === "izquierda") {
      ctx.p.push(texto + LF);
    } else if (alineacion === "centro") {
      ctx.p.push(centerVisible(texto, width) + LF);
    } else {
      ctx.p.push(rightVisible(texto, width) + LF);
    }
  } else {
    const texto = right(label, maxLabelLenCobros) + ":  " + right(montoStr, maxValorLenCobros);
    const alineacion = linea.formatoLabel?.alineacion || linea.formatoValor?.alineacion || linea.formato?.alineacion || zonaActualAlineacion;
    if (alineacion === "izquierda") {
      ctx.p.push(texto + LF);
    } else if (alineacion === "centro") {
      ctx.p.push(centerVisible(texto, width) + LF);
    } else {
      ctx.p.push(rightVisible(texto, width) + LF);
    }
  }
}
function renderCampoFRI(clave, data, lblOv, fmtOv, width, mostrarLabel, fmtLabel, fmtValor) {
  const w = width ?? LINE_LENGTH;
  const fmt = fmtOv;
  const defLabels = {
    NCF: "NCF",
    FECHA: "FECHA",
    TIPO: "Tipo",
    CONCEPTO: "Concepto",
    ENTIDAD: "ENTIDAD",
    ENTIDAD_ID: "ENTIDAD ID",
    NOTA: "Nota",
    COMPANIA: "Compa\xF1\xEDa",
    DIRECCION: "Direcci\xF3n",
    TELEFONO: "Tel\xE9fono",
    RNC: "RNC"
  };
  const lbl = lblOv !== void 0 && lblOv !== "" && lblOv !== defLabels[clave] ? lblOv : defLabels[clave] || clave;
  switch (clave) {
    case "COMPANIA": {
      const v = data.COMPANIA || "--";
      if (mostrarLabel === false) return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
      return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
    }
    case "DIRECCION": {
      const v = data.DIRECCION;
      if (!v) return null;
      if (mostrarLabel === false) return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
      return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
    }
    case "TELEFONO": {
      const v = data.TELEFONO;
      if (!v) return null;
      if (mostrarLabel === false) return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
      return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
    }
    case "RNC": {
      const v = data.RNC;
      if (!v) return null;
      if (mostrarLabel === false) return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
      return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
    }
    case "TITULO": {
      const v = data.TITULO || "--";
      if (!v || v === "--") return null;
      if (mostrarLabel === false) return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
      return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
    }
    case "NCF":
      if (lblOv) return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, data.ncf || "--", w);
      return aplicarFormatoTexto(fmt, CMD_BOLD_ON + "NCF" + CMD_BOLD_OFF + "         " + (data.ncf || "--"), w);
    case "FECHA":
      if (lblOv) return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, formatDate(data.fechaDocumento), w);
      return aplicarFormatoTexto(fmt, CMD_BOLD_ON + "FECHA" + CMD_BOLD_OFF + "       " + formatDate(data.fechaDocumento), w);
    case "TIPO": {
      if (!(data.tipo?.codigo || data.tipo?.nombre)) return null;
      const texto = (data.tipo.codigo || "") + " " + (data.tipo.nombre || "");
      if (lblOv) return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, texto, w);
      return aplicarFormatoTexto(fmt, "Tipo: " + texto, w);
    }
    case "CONCEPTO": {
      if (!data.concepto?.nombre) return null;
      if (lblOv) return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, data.concepto.nombre, w);
      return aplicarFormatoTexto(fmt, "Concepto: " + data.concepto.nombre, w);
    }
    case "ENTIDAD": {
      const nombre = data.entidad?.nombre || data.entidad?.razonSocial || "\u2014";
      if (lblOv) return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, nombre, w);
      return aplicarFormatoTexto(fmt, CMD_BOLD_ON + "ENTIDAD" + CMD_BOLD_OFF + "    " + nombre, w);
    }
    case "ENTIDAD_ID": {
      const id = data.entidad?.identificacion || data.entidad?.rnc || "";
      if (!id) return null;
      if (lblOv) return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, id, w);
      return aplicarFormatoTexto(fmt, "               " + id, w);
    }
    case "NOTA": {
      if (!data.nota) return null;
      if (lblOv) return lineSep("-", w) + LF + lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, data.nota, w);
      return lineSep("-", w) + LF + aplicarFormatoTexto(fmt, "Nota: " + data.nota, w);
    }
    case "FECHA_IMPRESION": {
      const lbl2 = lblOv || "Fecha imp.";
      const v = (/* @__PURE__ */ new Date()).toLocaleString("es-DO");
      return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl2, v, w);
    }
    case "HORA_IMPRESION": {
      const lbl2 = lblOv || "Hora imp.";
      const v = (/* @__PURE__ */ new Date()).toLocaleTimeString("es-DO");
      return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl2, v, w);
    }
    case "NUM_DETALLES": {
      const lbl2 = lblOv || "Transacc.";
      const v = String(data.transaccionesAsociadas?.length || 0);
      return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl2, v, w);
    }
    default:
      return null;
  }
}
function formatTicketReciboIngreso(data, company, config) {
  const cfg = normalizarConfigRI(aplicarExpresiones(config, data, company));
  const width = cfg.opciones?.anchoLinea ?? LINE_LENGTH;
  const zonas = cfg.zonas || [];
  const cob = cfg.cobros || {};
  const pie = config?.pie?.textoPie ?? cfg.pie?.textoPie ?? "Gracias por su preferencia!";
  const companyName = company?.nombre || data?.sucursal?.nombre || "SU EMPRESA";
  const tituloTexto = cfg.titulo?.texto || "RECIBO DE INGRESO";
  const textosLibres = cfg.textosLibres || cfg.campos?.textosLibres;
  const camposDTO = cfg.camposDTO || cfg.campos?.camposDTO;
  const firmas = cfg.firmas;
  const ctx = { p: [], w: width, al: "left", bo: false, co: false, forceAl: false };
  ctx.p.push(CMD_INIT + CMD_NORMALIZAR);
  let maxLabelLenTotalesFRI = 0;
  let maxValorLenTotalesFRI = 0;
  data.COMPANIA = companyName;
  data.DIRECCION = company?.direccion || "";
  data.TELEFONO = company?.telefono || "";
  data.RNC = company?.rnc || "";
  data.FAX = company?.fax || "";
  data.SLOGAN = company?.slogan || "";
  data.TITULO = tituloTexto;
  function emitirLinea(linea) {
    if (linea.ref === "SEPARADOR") {
      _emitirSep(ctx, linea);
      return;
    }
    if (linea.ref === "ESPACIO") {
      _emitirEspacio(ctx);
      return;
    }
    if (linea.ref.startsWith("LIBRE:") || linea.ref.startsWith("DTO:") || linea.ref.startsWith("FIRMA:")) {
      emitirItemEspecial(ctx.p, linea.ref, data, width, textosLibres, camposDTO, linea.tabular, linea.mismaLinea, firmas);
      return;
    }
    const ref = linea.ref;
    const lblOv = linea.label;
    const fmtOv = linea.formato;
    const fmtLabel = linea.formatoLabel || linea.formato;
    const fmtValor = linea.formatoValor;
    if (ref.startsWith("CAMPO:")) {
      const clave = ref.slice(6);
      switch (clave) {
        case "CODIGO_QR": {
          const qrData = data.envioDGII?.codigoQR || data.codigoQR;
          if (qrData) {
            _aplicarFmt(ctx, fmtOv);
            ctx.p.push(escposQRCode(qrData));
            _restaurarFmt(ctx, fmtOv);
            ctx.p.push(CMD_INIT + CMD_NORMALIZAR);
            ctx.al = "left";
            ctx.bo = false;
            ctx.co = false;
          }
          break;
        }
        default: {
          const render = renderCampoFRI(clave, data, lblOv, fmtOv, width, linea.mostrarLabel, fmtLabel, fmtValor);
          if (render) ctx.p.push(render);
          _restaurarFmt(ctx, fmtOv);
          break;
        }
      }
      return;
    }
    if (ref.startsWith("TOTAL:")) {
      const clave = ref.slice(6);
      const lineaLbl = linea.label;
      const tieneTab = !!linea.tabular;
      const tabAn = linea.tabular?.ancho ?? 12;
      const fmtSinAlineacion = tieneTab && fmtOv ? { ...fmtOv, alineacion: void 0 } : fmtOv;
      _aplicarFmt(ctx, fmtSinAlineacion);
      switch (clave) {
        case "TOTAL": {
          const labelDefault = "Total";
          const lbl = lineaLbl || labelDefault;
          const monto = formatMoney(data.total);
          if (linea.mostrarLabel === false) {
            if (tieneTab) {
              lineaTabular(ctx, "", monto, tabAn, void 0, linea.formatoValor || fmtOv);
              ctx.p.push(LF);
            } else {
              _aplicarFmt(ctx, linea.formatoValor || fmtOv);
              ctx.p.push(monto + LF);
              _restaurarFmt(ctx, linea.formatoValor || fmtOv);
            }
          } else if (tieneTab) {
            const anchoLabel = maxLabelLenTotalesFRI;
            const columnaValor = Math.max(anchoLabel + 3, tabAn);
            const texto = right(lbl, anchoLabel) + ":  " + " ".repeat(columnaValor - anchoLabel - 3) + right(monto, maxValorLenTotalesFRI);
            const alineacion = linea.formatoLabel?.alineacion || linea.formato?.alineacion || fmtOv?.alineacion || zonaActualAlineacionFRI;
            if (alineacion === "izquierda") {
              ctx.p.push(texto + LF);
            } else if (alineacion === "centro") {
              ctx.p.push(centerVisible(texto, width) + LF);
            } else {
              ctx.p.push(rightVisible(texto, width - 2) + LF);
            }
          } else {
            const texto = right(lbl, maxLabelLenTotalesFRI) + ":  " + right(monto, maxValorLenTotalesFRI);
            const alineacion = linea.formatoLabel?.alineacion || linea.formato?.alineacion || fmtOv?.alineacion || zonaActualAlineacionFRI;
            if (alineacion === "izquierda") {
              ctx.p.push(texto + LF);
            } else if (alineacion === "centro") {
              ctx.p.push(centerVisible(texto, width) + LF);
            } else {
              ctx.p.push(rightVisible(texto, width - 2) + LF);
            }
          }
          break;
        }
      }
      _restaurarFmt(ctx, fmtSinAlineacion);
      return;
    }
    if (ref.startsWith("COBRO:")) {
      _aplicarFmt(ctx, fmtOv);
      const nombre = ref.slice(6);
      const crs = data.cobros || [];
      const cobFmt = cfg.cobros?.formato;
      if (cob.mostrarCobros !== false && crs.length > 0) {
        for (const c of crs) {
          const medio = (c.medioCobro || "Pago").trim().toUpperCase();
          const monto = Number(c.monto) || 0;
          if (monto > 0 && (nombre === "MEDIO_COBRO" || medio === nombre)) {
            if (cobFmt) {
              const { antes, despues } = comandosFormato(cobFmt);
              ctx.p.push(...antes);
              ctx.p.push(formatTotalLine(medio, formatMoney(monto), width) + LF);
              ctx.p.push(...despues);
            } else {
              ctx.p.push(formatTotalLine(medio, formatMoney(monto), width) + LF);
            }
          }
        }
      }
      return;
    }
  }
  function emitirLineasConBuffer(lineas) {
    const buffer = [];
    let anchoAcumulado = 0;
    for (let idx = 0; idx < lineas.length; idx++) {
      const linea = lineas[idx];
      const prevLen = ctx.p.length;
      emitirLinea(linea);
      const nuevas = ctx.p.splice(prevLen);
      if (linea.mismaLinea) {
        const anchoCampo = calcularAnchoCampo(linea, anchoAcumulado, width);
        if (anchoCampo === 0) {
          continue;
        }
        const limpio = nuevas.join("").replace(/\x1Ba[\x00-\x02]/g, "").replace(/\n/g, " ");
        const textoTrim = trimVisible(limpio);
        buffer.push(leftVisible(textoTrim, anchoCampo));
        anchoAcumulado += anchoCampo;
      } else {
        if (buffer.length > 0) {
          ctx.p.push(...buffer);
          buffer.length = 0;
        }
        ctx.p.push(...nuevas);
        anchoAcumulado = 0;
      }
    }
    if (buffer.length > 0) ctx.p.push(...buffer);
  }
  const zonaCabFRI = zonas.find((z) => z.tipo === "cabecera_grupo_detalle");
  const zonaDetFRI = zonas.find((z) => z.tipo === "detalle");
  const todasDetFRI = [
    ...(zonaCabFRI?.lineas || []).filter((l) => l.ref.startsWith("DETALLE:")),
    ...(zonaDetFRI?.lineas || []).filter((l) => l.ref.startsWith("DETALLE:"))
  ];
  const hayTabularGlobalFRI = todasDetFRI.some((l) => l.tabular);
  const anchoFillFRI = !hayTabularGlobalFRI && todasDetFRI.length > 0 ? Math.floor(width / todasDetFRI.length) : 0;
  let zonaActualAlineacionFRI;
  for (const zona of zonas) {
    switch (zona.tipo) {
      case "encabezado_reporte":
      case "pie_reporte":
        zonaActualAlineacionFRI = zona.alineacion;
        if (zona.alineacion) _al(ctx, zona.alineacion);
        else _al(ctx, "izquierda");
        emitirLineasConBuffer(zona.lineas);
        _bo(ctx, false);
        _co(ctx, false);
        _al(ctx, "izquierda");
        ctx.forceAl = true;
        break;
      case "totales": {
        zonaActualAlineacionFRI = zona.alineacion;
        maxLabelLenTotalesFRI = 0;
        maxValorLenTotalesFRI = 0;
        for (const linea of zona.lineas) {
          if (linea.ref.startsWith("TOTAL:")) {
            const clave = linea.ref.slice(6);
            let labelDefault = clave;
            let valorTexto = "";
            switch (clave) {
              case "TOTAL":
                labelDefault = "Total";
                valorTexto = formatMoney(Number(data.total) || 0);
                break;
            }
            const lbl = linea.label || labelDefault;
            if (lbl.length > maxLabelLenTotalesFRI) maxLabelLenTotalesFRI = lbl.length;
            if (valorTexto.length > maxValorLenTotalesFRI) maxValorLenTotalesFRI = valorTexto.length;
          }
        }
        if (zona.alineacion) _al(ctx, zona.alineacion);
        else _al(ctx, "izquierda");
        emitirLineasConBuffer(zona.lineas);
        _bo(ctx, false);
        _co(ctx, false);
        _al(ctx, "izquierda");
        ctx.forceAl = true;
        break;
      }
      case "pie_detalle":
      case "encabezado_pagina":
      case "pie_pagina":
        zonaActualAlineacionFRI = zona.alineacion;
        if (zona.alineacion) _al(ctx, zona.alineacion);
        else _al(ctx, "izquierda");
        emitirLineasConBuffer(zona.lineas);
        _bo(ctx, false);
        _co(ctx, false);
        _al(ctx, "izquierda");
        ctx.forceAl = true;
        break;
      case "cobros": {
        zonaActualAlineacionFRI = zona.alineacion;
        if (zona.alineacion) _al(ctx, zona.alineacion);
        else _al(ctx, "izquierda");
        const tieneLineasCobro = zona.lineas.some((l) => l.ref.startsWith("COBRO:"));
        if (!tieneLineasCobro) {
          const crs = data.cobros || [];
          if (cob.mostrarCobros !== false && crs.length > 0) {
            const cobFmt = cfg.cobros?.formato;
            for (const c of crs) {
              const medio = (c.medioCobro || "Pago").trim().toUpperCase();
              const monto = Number(c.monto) || 0;
              if (monto > 0) {
                if (cobFmt) {
                  const { antes, despues } = comandosFormato(cobFmt);
                  ctx.p.push(...antes);
                  ctx.p.push(formatTotalLine(medio, formatMoney(monto), width) + LF);
                  ctx.p.push(...despues);
                } else {
                  ctx.p.push(formatTotalLine(medio, formatMoney(monto), width) + LF);
                }
              }
            }
            _bo(ctx, false);
            _co(ctx, false);
          }
        }
        emitirLineasConBuffer(zona.lineas);
        _bo(ctx, false);
        _co(ctx, false);
        _al(ctx, "izquierda");
        ctx.forceAl = true;
        break;
      }
      case "cabecera_grupo_detalle": {
        zonaActualAlineacionFRI = zona.alineacion;
        if (zona.alineacion) _al(ctx, zona.alineacion);
        else _al(ctx, "izquierda");
        const cabeceraPartsFRI = [];
        const flushCabFRI = () => {
          if (cabeceraPartsFRI.length > 0) {
            ctx.p.push(cabeceraPartsFRI.join("") + LF);
            cabeceraPartsFRI.length = 0;
          }
        };
        for (const linea of zona.lineas) {
          if (linea.ref.startsWith("DETALLE:")) {
            const clave = linea.ref.slice(8);
            const label = linea.label || CAMPOS_DETALLE_RI_LABELS[clave] || clave;
            const anchoTabular = linea.tabular?.ancho || 0;
            let labelFmt;
            if (anchoTabular > 0) {
              const al = linea.formato?.alineacion;
              if (al === "derecha") labelFmt = right(label, anchoTabular);
              else if (al === "centro") labelFmt = center(label, anchoTabular);
              else labelFmt = left(label, anchoTabular);
            } else if (anchoFillFRI > 0) {
              const al = linea.formato?.alineacion;
              if (al === "derecha") labelFmt = right(label, anchoFillFRI);
              else if (al === "centro") labelFmt = center(label, anchoFillFRI);
              else labelFmt = left(label, anchoFillFRI);
            } else {
              labelFmt = label;
            }
            const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: void 0 });
            cabeceraPartsFRI.push(antes.join("") + labelFmt + despues.join(""));
          } else {
            flushCabFRI();
            emitirLinea(linea);
          }
        }
        flushCabFRI();
        _bo(ctx, false);
        _co(ctx, false);
        _al(ctx, "izquierda");
        ctx.forceAl = true;
        break;
      }
      case "detalle": {
        zonaActualAlineacionFRI = zona.alineacion;
        if (zona.alineacion) _al(ctx, zona.alineacion);
        else _al(ctx, "izquierda");
        const transacciones = zona.arrayOrigen ? resolverRuta(data, zona.arrayOrigen) || generarDatosEjemploArray(zona) : data.transaccionesAsociadas || [];
        let anchoAcumDetFRI = 0;
        for (const doc of transacciones) {
          const bufferLinea = [];
          for (const linea of zona.lineas) {
            if (!linea.ref.startsWith("DETALLE:")) {
              if (bufferLinea.length > 0) {
                ctx.p.push(...bufferLinea, LF);
                bufferLinea.length = 0;
              }
              anchoAcumDetFRI = 0;
              emitirLinea(linea);
              continue;
            }
            const clave = linea.ref.slice(8);
            const valor = renderDetalleCampoFRI(clave, doc);
            const texto = linea.mostrarLabel !== false ? (linea.label || CAMPOS_DETALLE_RI_LABELS[clave] || clave) + ": " + valor : valor;
            if (linea.mismaLinea) {
              const anchoCampo = calcularAnchoCampo(linea, anchoAcumDetFRI, width);
              if (anchoCampo === 0) continue;
              const textoTrim = trimVisible(texto);
              const textoPad = leftVisible(textoTrim, anchoCampo);
              const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: void 0 });
              bufferLinea.push(antes.join("") + textoPad + despues.join(""));
              anchoAcumDetFRI += anchoCampo;
            } else {
              if (bufferLinea.length > 0) {
                ctx.p.push(...bufferLinea, LF);
                bufferLinea.length = 0;
              }
              anchoAcumDetFRI = 0;
              const al = linea.formato?.alineacion;
              let textoPad;
              if (al === "derecha") textoPad = rightVisible(texto, width);
              else if (al === "centro") textoPad = centerVisible(texto, width);
              else textoPad = leftVisible(texto, width);
              const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: void 0 });
              ctx.p.push(antes.join("") + textoPad + despues.join(""), LF);
            }
          }
          if (bufferLinea.length > 0) {
            ctx.p.push(...bufferLinea, LF, CMD_J + "\b");
          }
          anchoAcumDetFRI = 0;
        }
        break;
      }
      case "banda": {
        zonaActualAlineacionFRI = zona.alineacion;
        if (zona.alineacion) _al(ctx, zona.alineacion);
        else _al(ctx, "izquierda");
        emitirLineasConBuffer(zona.lineas);
        _bo(ctx, false);
        _co(ctx, false);
        _al(ctx, "izquierda");
        ctx.forceAl = true;
        break;
      }
    }
  }
  ctx.p.push(LF);
  return ctx.p.join("");
}
function renderCampoVSNT(clave, data, lblOv, fmtOv, width, mostrarLabel, fmtLabel, fmtValor) {
  const w = width ?? 42;
  const fmt = fmtOv;
  const lbl = lblOv !== void 0 && lblOv !== "" && lblOv !== CAMPOS_TICKET_LABELS_VSNT[clave] ? lblOv : CAMPOS_TICKET_LABELS_VSNT[clave] || clave;
  function val() {
    switch (clave) {
      case "COMPANIA":
        return data.COMPANIA || data.sucursal?.nombre || "--";
      case "SUCURSAL":
        return data.sucursalName || data.sucursal?.nombre || "";
      case "DIRECCION":
        return data.DIRECCION || "";
      case "TELEFONO":
        return data.TELEFONO || "";
      case "RNC":
        return data.RNC || "";
      case "FAX":
        return data.FAX || "";
      case "SLOGAN":
        return data.SLOGAN || "";
      case "ID_COMERCIO":
        return data.merchantId || "000000167391001";
      case "TIPO_OP":
        return data.subsidioLabel || "VENTA";
      case "FECHA":
        return formatFechaCorta(data.transactionDate);
      case "ISSUER":
        return data.issuerName || "";
      case "TRANS":
        return data.tokenECR || "";
      case "AUTORIZACION":
        return data.autorizacion || "";
      case "TOTAL":
        return (data.simMoneda || "RD$") + " " + (Number(data.montoPesos) || 0).toFixed(2);
      case "RESULTADO":
        return data.exitoso ? "APROBADA" : "RECHAZADA";
      case "FECHA_IMPRESION":
        return (/* @__PURE__ */ new Date()).toLocaleString("es-DO");
      case "HORA_IMPRESION":
        return (/* @__PURE__ */ new Date()).toLocaleTimeString("es-DO");
      default:
        return "--";
    }
  }
  const v = val();
  if (v === "" || v === void 0) return null;
  if (mostrarLabel === false) {
    return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
  }
  if (fmtLabel || fmtValor) {
    let lblStr = lbl + ": ";
    if (fmtLabel?.negrita === true) lblStr = CMD_BOLD_ON + lblStr + CMD_BOLD_OFF;
    else if (fmtLabel?.negrita === false) lblStr = CMD_BOLD_OFF + lblStr;
    let valStr = v;
    if (fmtValor?.negrita === true) valStr = CMD_BOLD_ON + valStr + CMD_BOLD_OFF;
    else if (fmtValor?.negrita === false) valStr = CMD_BOLD_OFF + valStr;
    const texto2 = lblStr + valStr;
    const alineacion = fmtLabel?.alineacion || fmtValor?.alineacion || fmtOv?.alineacion;
    const fmtCombinado = { ...fmtLabel, ...fmtValor, ...fmtOv };
    if (alineacion) fmtCombinado.alineacion = alineacion;
    return aplicarFormatoTexto(fmtCombinado, texto2, w);
  }
  if (fmt?.negrita === true || fmt?.negrita === false) {
    return aplicarFormatoTexto(fmt, lbl + ": " + v, w);
  }
  const texto = CMD_BOLD_ON + lbl + CMD_BOLD_OFF + ": " + v;
  return aplicarFormatoTexto(fmt, texto, w);
}
function formatoVoucherHardcoded(data, company) {
  const companyName = company?.nombre || data?.sucursal?.nombre || "SOLUGEN S.R.L.";
  const sucursalName = data?.sucursalName || "";
  const fecha = formatFechaCorta(data?.transactionDate) || "";
  const lines = [
    "\x1B@",
    // Init
    "\x1Ba",
    // Center
    "\x1B!",
    // Double
    companyName,
    "\x1B!\0",
    // Normal
    sucursalName,
    ...company?.direccion ? [company.direccion] : [],
    ...company?.telefono ? [company.telefono] : [],
    ...company?.rnc ? [company.rnc] : [],
    "------------------------------------------",
    "ID: " + (data?.merchantId || "000000167391001"),
    "\x1BE",
    // Bold
    data?.subsidioLabel || "VENTA",
    "\x1BE\0",
    // Bold off
    "------------------------------------------",
    "\x1Ba\0",
    // Left
    "FECHA: " + fecha,
    data?.issuerName || "",
    "Trans # " + (data?.tokenECR || ""),
    "Autorizacion #: " + (data?.autorizacion || ""),
    "------------------------------------------",
    "\x1Ba",
    // Center
    "\x1B!",
    // Double
    "Total: " + (data?.simMoneda || "RD$") + " " + (Number(data?.montoPesos) || 0).toFixed(2),
    "\x1B!\0",
    "\n",
    data?.exitoso ? "APROBADA" : "RECHAZADA",
    "VA"
    // Cut con feed 3
  ];
  return lines.join("\n") + "\n";
}
function formatoVoucherZonas(data, company, cfg, width) {
  const zonas = cfg.zonas || [];
  const textosLibres = cfg.textosLibres || cfg.campos?.textosLibres;
  const camposDTO = cfg.camposDTO || cfg.campos?.camposDTO;
  const firmas = cfg.firmas;
  const ctx = { p: [], w: width, al: "left", bo: false, co: false, forceAl: false };
  ctx.p.push(CMD_INIT);
  data.COMPANIA = company?.nombre || data?.sucursal?.nombre || "SOLUGEN S.R.L.";
  data.DIRECCION = company?.direccion || "";
  data.TELEFONO = company?.telefono || "";
  data.RNC = company?.rnc || "";
  data.FAX = company?.fax || "";
  data.SLOGAN = company?.slogan || "";
  function emitirLinea(linea) {
    if (linea.ref === "SEPARADOR") {
      _emitirSep(ctx, linea);
      return;
    }
    if (linea.ref === "ESPACIO") {
      _emitirEspacio(ctx);
      return;
    }
    if (linea.ref.startsWith("LIBRE:") || linea.ref.startsWith("DTO:") || linea.ref.startsWith("FIRMA:")) {
      emitirItemEspecial(ctx.p, linea.ref, data, width, textosLibres, camposDTO, linea.tabular, linea.mismaLinea, firmas);
      return;
    }
    if (linea.ref.startsWith("CAMPO:")) {
      const clave = linea.ref.slice(6);
      const render = renderCampoVSNT(clave, data, linea.label, linea.formato, width, linea.mostrarLabel, linea.formatoLabel || linea.formato, linea.formatoValor);
      if (render) ctx.p.push(render);
      _restaurarFmt(ctx, linea.formato);
      return;
    }
  }
  function emitirLineasConBuffer(lineas) {
    const buffer = [];
    let anchoAcumulado = 0;
    for (let idx = 0; idx < lineas.length; idx++) {
      const linea = lineas[idx];
      const prevLen = ctx.p.length;
      emitirLinea(linea);
      const nuevas = ctx.p.splice(prevLen);
      if (linea.mismaLinea) {
        const anchoCampo = calcularAnchoCampo(linea, anchoAcumulado, width);
        if (anchoCampo === 0) {
          continue;
        }
        const limpio = nuevas.join("").replace(/\x1Ba[\x00-\x02]/g, "").replace(/\n/g, " ");
        const textoTrim = trimVisible(limpio);
        buffer.push(leftVisible(textoTrim, anchoCampo));
        anchoAcumulado += anchoCampo;
      } else {
        if (buffer.length > 0) {
          ctx.p.push(...buffer);
          buffer.length = 0;
        }
        ctx.p.push(...nuevas);
        anchoAcumulado = 0;
      }
    }
    if (buffer.length > 0) ctx.p.push(...buffer);
  }
  let zonaActualAlineacion;
  for (const zona of zonas) {
    zonaActualAlineacion = zona.alineacion;
    if (zona.alineacion) _al(ctx, zona.alineacion);
    else _al(ctx, "izquierda");
    emitirLineasConBuffer(zona.lineas);
    _bo(ctx, false);
    _co(ctx, false);
    _al(ctx, "izquierda");
    ctx.forceAl = true;
  }
  ctx.p.push(LF);
  return ctx.p.join("");
}
function formatTicketVoucherVisanet(data, company, config) {
  const cfg = normalizarConfigVSNT(aplicarExpresiones(config, data, company));
  const width = cfg.opciones?.anchoLinea ?? 42;
  if (!config) {
    return formatoVoucherHardcoded(data, company);
  }
  const body = formatoVoucherZonas(data, company, cfg, width);
  const feedCorte = cfg.opciones?.feedCorte ?? 3;
  return body + feed(feedCorte) + CMD_CUT;
}
function escposQRCode(qrData) {
  const dataBytes = new TextEncoder().encode(qrData);
  const parts = [];
  parts.push("(k\x001A2\0");
  parts.push("(k\x001E\b");
  parts.push("(k\x001C");
  const MAX_CHUNK = 124;
  for (let offset = 0; offset < dataBytes.length; offset += MAX_CHUNK) {
    const chunk = dataBytes.slice(offset, Math.min(offset + MAX_CHUNK, dataBytes.length));
    const len = chunk.length + 3;
    const pL = len & 255;
    const pH = len >> 8 & 255;
    parts.push("(k" + String.fromCharCode(pL) + String.fromCharCode(pH) + "1P0");
    let chunkStr = "";
    for (let i = 0; i < chunk.length; i++) chunkStr += String.fromCharCode(chunk[i]);
    parts.push(chunkStr);
  }
  parts.push("(k\x001Q0");
  return parts.join("");
}
function escposBarcode(barcodeData, heightPx = 60) {
  const clean = barcodeData.trim();
  if (!clean) return "";
  const parts = [];
  parts.push("h" + String.fromCharCode(Math.max(1, Math.min(255, heightPx))));
  const printableWidth = 576;
  const modules = 11 * clean.length + 57;
  const moduleWidth = Math.min(6, Math.max(1, Math.floor(printableWidth / modules)));
  parts.push("w" + String.fromCharCode(moduleWidth));
  parts.push("H\0");
  parts.push(CMD_ALIGN_CENTER);
  parts.push("\x1Bl\0");
  const payload = "{B" + clean;
  const payloadBytes = new TextEncoder().encode(payload);
  parts.push("kI" + String.fromCharCode(payloadBytes.length));
  parts.push(payload);
  parts.push("\0");
  return parts.join("");
}
function formatTicket(data, company, config, tipoDoc) {
  switch (tipoDoc) {
    case "TICKET_POS":
      return formatTicketPOS(data, company, config);
    case "TICKET_RI":
      return formatTicketReciboIngreso(data, company, config);
    case "TICKET_VSNT":
      return formatTicketVoucherVisanet(data, company, config);
    case "TICKET_NC":
      return formatTicketNotaCredito(data, company, config);
    case "TICKET_TC":
      return formatTicketCierreTurno(data, company, config);
    default:
      return formatTicketPOS(data, company, config);
  }
}
function formatTicketNotaCredito(data, company, config) {
  const ticketData = {
    ...data,
    cliente: data.entidad,
    detalles: data.detalles || data.detallesMovimiento || []
  };
  return formatTicketPOS(ticketData, company, config);
}
function formatTicketCierreTurno(data, company, config) {
  const agregados = agregarCobrosTurno(data.cobros, data.total ?? 0);
  const ticketData = {
    ...data,
    cajero: data.usuario?.nombre || "--",
    caja: data.nombrePOS || "--",
    turno: data.noTurno || "--",
    estado: data.cerrado ? "CERRADO" : "ABIERTO",
    fechaDocumento: data.fechaCierre || data.fechaApertura,
    detalles: [],
    cobros: agregados.cobros,
    cobrado: agregados.cobrado,
    porCobrar: agregados.porCobrar,
    devuelta: agregados.devuelta
  };
  return formatTicketPOS(ticketData, company, config);
}
function agregarCobrosTurno(cobros, total) {
  const acc = (cobros || []).reduce(
    (a, c) => ({
      efectivo: a.efectivo + (c.efectivo || 0),
      cheque: a.cheque + (c.cheque || 0),
      transferencia: a.transferencia + (c.transferencia || 0),
      tarjetaCredito: a.tarjetaCredito + (c.tarjetaCredito || 0),
      tarjetaDebito: a.tarjetaDebito + (c.tarjetaDebito || 0),
      bono: a.bono + (c.bono || 0),
      tarjetaRegalo: a.tarjetaRegalo + (c.tarjetaRegalo || 0),
      notaCredito: a.notaCredito + (c.notaCredito || 0),
      pago: a.pago + (c.pago || 0),
      devuelta: a.devuelta + (c.devuelta || 0),
      facturaID: 0
    }),
    { efectivo: 0, cheque: 0, transferencia: 0, tarjetaCredito: 0, tarjetaDebito: 0, bono: 0, tarjetaRegalo: 0, notaCredito: 0, pago: 0, devuelta: 0, facturaID: 0 }
  );
  const cobrado = acc.efectivo + acc.cheque + acc.transferencia + acc.tarjetaCredito + acc.tarjetaDebito + acc.bono + acc.tarjetaRegalo + acc.notaCredito;
  return {
    cobros: [acc],
    cobrado,
    porCobrar: Math.max(0, Number(total) - cobrado),
    devuelta: acc.devuelta
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CMD_CUT,
  escposBarcode,
  escposQRCode,
  feed,
  formatFechaCorta,
  formatTicket,
  formatTicketPOS,
  formatTicketReciboIngreso,
  formatTicketVoucherVisanet
});
