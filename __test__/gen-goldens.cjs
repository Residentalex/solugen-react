// generate-salidas.ts
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var import_node_crypto = require("node:crypto");

// D:/Developer/Genesis/solugen-react/src/utils/ticketPlantillaConfig.ts
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
  RNC_CLIENTE: "RNC CLIENTE"
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
var CAMPOS_TICKET_LABELS_RI = {
  NCF: "NCF",
  FECHA: "FECHA",
  TIPO: "Tipo",
  CONCEPTO: "Concepto",
  ENTIDAD: "ENTIDAD",
  ENTIDAD_ID: "ENTIDAD ID",
  NOTA: "Nota"
};
var CAMPOS_TICKET_ORDEN_RI = [
  "NCF",
  "FECHA",
  "TIPO",
  "CONCEPTO",
  "ENTIDAD",
  "ENTIDAD_ID",
  "NOTA"
];
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
  return out;
}
function esItemOrdenRI(item) {
  return CAMPOS_TICKET_ORDEN_RI.includes(item) || item === "ESPACIO" || item === "SEPARADOR" || item.startsWith("LIBRE:") || item.startsWith("DTO:");
}
function normalizarConfig(config) {
  if (!config) return { ...PLANTILLA_CONFIG_DEFAULT };
  return mergeConfig(PLANTILLA_CONFIG_DEFAULT, config);
}
function normalizarConfigRI(config) {
  if (!config) return { ...PLANTILLA_CONFIG_DEFAULT_RI };
  const out = mergeConfig(PLANTILLA_CONFIG_DEFAULT_RI, config);
  const orden = out.campos?.orden || [];
  if (orden.length > 0 && !orden.some((k) => esItemOrdenRI(k))) {
    out.campos = { ...out.campos || {}, orden: [...CAMPOS_TICKET_ORDEN_RI] };
  }
  return out;
}

// D:/Developer/Genesis/solugen-react/src/utils/escpos-formatter.ts
var ESC = "\x1B";
var GS = "";
var LF = "\n";
var CMD_INIT = ESC + "@";
var CMD_ALIGN_LEFT = ESC + "a\0";
var CMD_ALIGN_CENTER = ESC + "a";
var CMD_ALIGN_RIGHT = ESC + "a";
var CMD_BOLD_ON = ESC + "E";
var CMD_BOLD_OFF = ESC + "E\0";
var CMD_CONDENSED = ESC + "!";
var CMD_CONDENSED_OFF = ESC + "!\0";
var CMD_SIZE_DOUBLE = GS + "!0";
var CMD_SIZE_NORMAL = GS + "!\0";
var CMD_CUT = GS + "V\0";
var LINE_LENGTH = 48;
function center(text, width = LINE_LENGTH) {
  if (text.length >= width) return text.slice(0, width);
  const padding = Math.floor((width - text.length) / 2);
  return " ".repeat(padding) + text + " ".repeat(padding);
}
function right(text, width = LINE_LENGTH) {
  if (text.length >= width) return text.slice(0, width);
  return " ".repeat(width - text.length) + text;
}
function left(text, width = LINE_LENGTH) {
  if (text.length >= width) return text.slice(0, width);
  return text + " ".repeat(width - text.length);
}
function lineSep(char = "-", width = LINE_LENGTH) {
  return char.repeat(width);
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
function etiquetaCampo(labels, defaultLabels, clave) {
  const lbl = labels?.[clave];
  if (lbl !== void 0 && lbl !== "" && lbl !== defaultLabels[clave]) return lbl;
  return defaultLabels[clave] || clave;
}
function labelEditado(labels, defaultLabels, clave) {
  const lbl = labels?.[clave];
  if (lbl !== void 0 && lbl !== "" && lbl !== defaultLabels[clave]) return lbl;
  return void 0;
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
  if (n >= width) return texto;
  const padding = Math.floor((width - n) / 2);
  return " ".repeat(padding) + texto + " ".repeat(padding);
}
function rightVisible(texto, width = LINE_LENGTH) {
  const n = largoVisible(texto);
  if (n >= width) return texto;
  return " ".repeat(width - n) + texto;
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
  let texto;
  if (fmt?.negrita === true || fmt?.negrita === false) {
    texto = label + ": " + valor;
  } else {
    texto = CMD_BOLD_ON + label + CMD_BOLD_OFF + ": " + valor;
  }
  return aplicarFormatoTexto(fmt, texto, width);
}
function padLinea(texto, alineacion, width = LINE_LENGTH) {
  if (alineacion === "centro") return center(texto, width);
  if (alineacion === "derecha") return right(texto, width);
  return texto;
}
function lineaTabular(label, valor, ancho) {
  return CMD_BOLD_ON + left(label + ":", ancho) + CMD_BOLD_OFF + valor;
}
function emitirLineaFormateada(parts, fmt, texto, width) {
  if (!fmt) {
    parts.push(texto + LF);
    return;
  }
  const { antes, despues } = comandosFormato(fmt);
  parts.push(...antes);
  if (fmt.alineacion === "centro") parts.push(centerVisible(texto, width) + LF);
  else if (fmt.alineacion === "derecha") parts.push(rightVisible(texto, width) + LF);
  else parts.push(texto + LF);
  parts.push(...despues);
}
function emitirTotalLinea(parts, fmt, label, amount, width) {
  let texto;
  if (fmt?.alineacion === "centro") texto = centerVisible(label + " " + amount, width);
  else if (fmt?.alineacion === "derecha") texto = rightVisible(label + " " + amount, width);
  else if (fmt?.alineacion === "izquierda") texto = left(label + " " + amount, width);
  else texto = formatTotalLine(label, amount, width);
  if (!fmt) {
    parts.push(texto + LF);
    return;
  }
  const { antes, despues } = comandosFormato(fmt);
  parts.push(...antes);
  parts.push(texto + LF);
  parts.push(...despues);
}
function emitirItemEspecial(parts, item, data, width, textosLibres, camposDTO, tabular) {
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
      const { antes, despues } = comandosFormato(fmt);
      parts.push(...antes);
      for (const linea of conf.texto.split("\n")) {
        parts.push(padLinea(linea, fmt.alineacion, width) + LF);
      }
      parts.push(...despues);
    }
    return true;
  }
  if (item.startsWith("DTO:")) {
    const def = camposDTO?.[item.slice("DTO:".length)];
    if (def) {
      const valor = formatearValorDTO(resolverRuta(data, def.ruta), def.tipo);
      if (tabular) {
        parts.push(lineaTabular(def.label || item, valor, tabular.ancho ?? 12) + LF);
      } else {
        parts.push(lineaConFormato(def, def.label || item, valor, width));
      }
    }
    return true;
  }
  return false;
}
var COLUMNAS_DETALLE_BASE = {
  codigo: 9,
  cantidad: 7,
  precio: 8,
  itbis: 9,
  total: 10
};
var COLUMNAS_DETALLE_ORDEN = [
  "codigo",
  "cantidad",
  "precio",
  "itbis",
  "total"
];
function calcularAnchosColumnas(columnas, width) {
  const visibles = COLUMNAS_DETALLE_ORDEN.filter((c) => columnas?.[c] !== false);
  if (visibles.length === COLUMNAS_DETALLE_ORDEN.length && width === 48) {
    return visibles.map((c) => ({ clave: c, ancho: COLUMNAS_DETALLE_BASE[c] }));
  }
  if (visibles.length === 0) return [];
  const separadores = visibles.length - 1;
  const disponible = Math.max(width - separadores, visibles.length);
  const totalBase = visibles.reduce((acc, c) => acc + COLUMNAS_DETALLE_BASE[c], 0);
  const anchos = visibles.map(
    (c) => Math.max(1, Math.round(COLUMNAS_DETALLE_BASE[c] / totalBase * disponible))
  );
  const suma = anchos.reduce((a, b) => a + b, 0);
  if (suma !== disponible) {
    anchos[anchos.length - 1] += disponible - suma;
  }
  return visibles.map((c, i) => ({ clave: c, ancho: anchos[i] }));
}
function formatLineaDetalle(anchos, valores) {
  if (anchos.length === 0) return "";
  return anchos.map(({ clave, ancho }) => {
    const texto = valores[clave];
    return clave === "codigo" ? left(texto, ancho) : right(texto, ancho);
  }).join(" ");
}
function formatTotalLine(label, amount, width = LINE_LENGTH) {
  const full = `${label} ${amount}`;
  return right(full, width);
}
function formatTicketPOS(data, company, config) {
  const cfg = normalizarConfig(config);
  const width = cfg.opciones?.anchoLinea ?? LINE_LENGTH;
  const enc = cfg.encabezado || {};
  const tot = cfg.totales || {};
  const cob = cfg.cobros || {};
  const pie = cfg.pie?.textoPie || "** GRACIAS POR SU COMPRA **";
  const parts = [];
  parts.push(CMD_INIT);
  const encFormato = enc.formato || {};
  const companyName = company?.nombre || data?.sucursal?.nombre || "SU EMPRESA";
  if (enc.mostrarCompania !== false) {
    if (encFormato.compania) {
      emitirLineaFormateada(parts, encFormato.compania, companyName, width);
    } else {
      parts.push(CMD_ALIGN_CENTER);
      parts.push(CMD_BOLD_ON);
      parts.push(center(companyName, width) + LF);
      parts.push(CMD_BOLD_OFF);
    }
  }
  if (company?.direccion && enc.mostrarDireccion !== false) {
    if (encFormato.direccion) {
      emitirLineaFormateada(parts, encFormato.direccion, company.direccion, width);
    } else {
      parts.push(CMD_CONDENSED);
      parts.push(company.direccion + LF);
      parts.push(CMD_SIZE_NORMAL);
    }
  }
  if (company?.telefono && enc.mostrarTelefono !== false) {
    if (encFormato.telefono) {
      emitirLineaFormateada(parts, encFormato.telefono, "Tel.: " + company.telefono, width);
    } else {
      parts.push(CMD_CONDENSED);
      parts.push("Tel.: " + company.telefono + LF);
      parts.push(CMD_SIZE_NORMAL);
    }
  }
  if (company?.rnc && enc.mostrarRnc !== false) {
    if (encFormato.rnc) {
      emitirLineaFormateada(parts, encFormato.rnc, "RNC: " + company.rnc, width);
    } else {
      parts.push("RNC: " + company.rnc + LF);
    }
  }
  parts.push(CMD_BOLD_ON);
  parts.push(lineSep("=", width) + LF);
  parts.push(CMD_BOLD_OFF);
  parts.push(CMD_ALIGN_LEFT);
  const orden = cfg.campos?.orden && cfg.campos.orden.length > 0 ? cfg.campos.orden : CAMPOS_TICKET_ORDEN;
  const visibles = cfg.campos?.visibles || {};
  const labels = cfg.campos?.labels || {};
  const formatos = cfg.campos?.formatos;
  const textosLibres = cfg.campos?.textosLibres;
  const camposDTO = cfg.campos?.camposDTO;
  const tabular = cfg.campos?.tabular;
  const tabularAncho = tabular ? Math.min(Math.max(tabular.ancho ?? 12, 4), width) : 0;
  const renderesCampos = {
    NCF: () => [tabular ? lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "NCF"), data.ncf || "--", tabularAncho) + LF : lineaConFormato(formatos?.["NCF"], etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "NCF"), data.ncf || "--", width)],
    TIPO_COMP: () => {
      const tipoComp = data.transaccionNCF?.nombreTipoComprobante || data.secuenciaNCF?.nombreTipoComprobante || "";
      return [tabular ? lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "TIPO_COMP"), tipoComp || "--", tabularAncho) + LF : lineaConFormato(formatos?.["TIPO_COMP"], etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "TIPO_COMP"), tipoComp || "--", width)];
    },
    CAJERO: () => [tabular ? lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "CAJERO"), data.cajero || "--", tabularAncho) + LF : lineaConFormato(formatos?.["CAJERO"], etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "CAJERO"), data.cajero || "--", width)],
    CAJA: () => [tabular ? lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "CAJA"), data.caja || "--", tabularAncho) + LF : lineaConFormato(formatos?.["CAJA"], etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "CAJA"), data.caja || "--", width)],
    TURNO: () => [tabular ? lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "TURNO"), data.turno || "--", tabularAncho) + LF : lineaConFormato(formatos?.["TURNO"], etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "TURNO"), data.turno || "--", width)],
    FECHA: () => [tabular ? lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "FECHA"), formatDate(data.fechaDocumento), tabularAncho) + LF : lineaConFormato(formatos?.["FECHA"], etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "FECHA"), formatDate(data.fechaDocumento), width)],
    HORA: () => [tabular ? lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "HORA"), formatTime(data.fechaDocumento), tabularAncho) + LF : lineaConFormato(formatos?.["HORA"], etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "HORA"), formatTime(data.fechaDocumento), width)],
    NO: () => [tabular ? lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "NO"), data.noDocumento || "--", tabularAncho) + LF : lineaConFormato(formatos?.["NO"], etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "NO"), data.noDocumento || "--", width)],
    CLIENTE: () => {
      const clienteNombre = data.cliente?.nombre || "Consumidor Final";
      return [tabular ? lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "CLIENTE"), clienteNombre, tabularAncho) + LF : lineaConFormato(formatos?.["CLIENTE"], etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "CLIENTE"), clienteNombre, width)];
    },
    RNC_CLIENTE: () => {
      const clienteRnc = data.cliente?.identificacion || "";
      if (!clienteRnc) return [];
      if (tabular) {
        return [lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "RNC_CLIENTE"), clienteRnc, tabularAncho) + LF];
      }
      const fmt = formatos?.["RNC_CLIENTE"];
      const lbl = labelEditado(labels, CAMPOS_TICKET_LABELS, "RNC_CLIENTE");
      if (lbl) return [lineaConFormato(fmt, lbl, clienteRnc, width)];
      return [aplicarFormatoTexto(fmt, "         RNC: " + clienteRnc, width)];
    }
  };
  for (const campo of orden) {
    if (emitirItemEspecial(parts, campo, data, width, textosLibres, camposDTO, tabular)) continue;
    if (visibles[campo] === false) continue;
    const render = renderesCampos[campo];
    if (!render) continue;
    for (const linea of render()) parts.push(linea);
  }
  const tituloTexto = cfg.titulo?.texto || "FACTURA AL CONTADO";
  const tituloFmt = cfg.titulo?.formato;
  parts.push(lineSep("\u2500", width) + LF);
  if (tituloFmt) {
    emitirLineaFormateada(parts, tituloFmt, tituloTexto, width);
  } else {
    parts.push(CMD_ALIGN_CENTER);
    parts.push(CMD_BOLD_ON);
    parts.push(tituloTexto + LF);
    parts.push(CMD_BOLD_OFF);
  }
  parts.push(CMD_BOLD_ON);
  parts.push(lineSep("=", width) + LF);
  parts.push(CMD_BOLD_OFF);
  parts.push(CMD_ALIGN_LEFT);
  const anchosColumnas = calcularAnchosColumnas(cfg.detalle?.columnas, width);
  const detFmt = cfg.detalle?.formato || {};
  parts.push(lineSep("-", width) + LF);
  const cabeceraFmt = detFmt.cabecera;
  if (cabeceraFmt) {
    const { antes, despues } = comandosFormato({ ...cabeceraFmt, alineacion: void 0 });
    parts.push(...antes);
    parts.push(formatLineaDetalle(anchosColumnas, {
      codigo: "CODIGO",
      cantidad: "CANT",
      precio: "PRECIO",
      itbis: "ITBIS",
      total: "TOTAL"
    }) + LF);
    parts.push(...despues);
  } else {
    parts.push(CMD_BOLD_ON);
    parts.push(formatLineaDetalle(anchosColumnas, {
      codigo: "CODIGO",
      cantidad: "CANT",
      precio: "PRECIO",
      itbis: "ITBIS",
      total: "TOTAL"
    }) + LF);
    parts.push(CMD_BOLD_OFF);
  }
  parts.push(lineSep("-", width) + LF);
  const detalles = data.detalles || [];
  for (const det of detalles) {
    const articuloFmt = detFmt.articulo;
    if (articuloFmt) {
      emitirLineaFormateada(parts, articuloFmt, det.articulo || "--", width);
    } else {
      parts.push((det.articulo || "--") + LF);
    }
    const valoresFmt = detFmt.valores;
    const valoresLinea = formatLineaDetalle(anchosColumnas, {
      codigo: (det.codigo || "").slice(0, 10),
      cantidad: formatMoney(det.cantidad),
      precio: formatMoney(det.precio),
      itbis: formatMoney(det.impuestos || 0),
      total: formatMoney(det.total)
    });
    if (valoresFmt) {
      const { antes, despues } = comandosFormato({ ...valoresFmt, alineacion: void 0 });
      parts.push(...antes);
      parts.push(valoresLinea + LF);
      parts.push(...despues);
    } else {
      parts.push(valoresLinea + LF);
    }
  }
  parts.push(lineSep("-", width) + LF);
  parts.push(CMD_ALIGN_RIGHT);
  const totalExento = 0;
  const totalGravado = Number(data.subTotal) || 0;
  const descuento = Number(data.descuento) || 0;
  const itbis = Number(data.impuestos) || 0;
  const totFmt = cfg.totales?.formato || {};
  if (totalExento > 0) {
    emitirTotalLinea(parts, totFmt.total, "TOTAL EXENTO", formatMoney(totalExento), width);
  }
  if (tot.mostrarGravado !== false) {
    emitirTotalLinea(parts, totFmt.gravado, "TOTAL GRAVADO", formatMoney(totalGravado), width);
  }
  if (tot.mostrarSubtotal !== false) {
    emitirTotalLinea(parts, totFmt.subtotal, "SUBTOTAL", formatMoney(totalGravado), width);
  }
  if (tot.mostrarItbis !== false) {
    emitirTotalLinea(parts, totFmt.itbis, "ITBIS", formatMoney(itbis), width);
  }
  if (descuento > 0 && tot.mostrarDescuento !== false) {
    emitirTotalLinea(parts, totFmt.descuento, "DESCUENTO", formatMoney(descuento), width);
  }
  parts.push("\u2500".repeat(width) + LF);
  const totalFmt = totFmt.total;
  if (totalFmt) {
    const { antes, despues } = comandosFormato(totalFmt);
    parts.push(...antes);
    parts.push(formatTotalLine("TOTAL", formatMoney(data.total), width) + LF);
    parts.push(...despues);
  } else {
    parts.push(CMD_BOLD_ON);
    parts.push(formatTotalLine("TOTAL", formatMoney(data.total), width) + LF);
    parts.push(CMD_BOLD_OFF);
  }
  parts.push(CMD_ALIGN_LEFT);
  parts.push(lineSep("-", width) + LF);
  const cobros = data.cobros || [];
  if (cob.mostrarCobros !== false && cobros.length > 0) {
    const c = cobros[0];
    const efectivo = Number(c.efectivo) || 0;
    const cheque = Number(c.cheque) || 0;
    const tarjetaCredito = Number(c.tarjetaCredito) || 0;
    const tarjetaDebito = Number(c.tarjetaDebito) || 0;
    const transferencia = Number(c.transferencia) || 0;
    const bono = Number(c.bono) || 0;
    const tarjetaRegalo = Number(c.tarjetaRegalo) || 0;
    const notaCredito = Number(c.notaCredito) || 0;
    parts.push(CMD_ALIGN_RIGHT);
    const cobFmt = cfg.cobros?.formato;
    const devueltaFmt = cfg.totales?.formato?.total || cobFmt;
    if (efectivo > 0) emitirTotalLinea(parts, cobFmt, "EFECTIVO", formatMoney(efectivo), width);
    if (cheque > 0) emitirTotalLinea(parts, cobFmt, "CHEQUE", formatMoney(cheque), width);
    if (tarjetaCredito > 0) emitirTotalLinea(parts, cobFmt, "TARJETA CREDITO", formatMoney(tarjetaCredito), width);
    if (tarjetaDebito > 0) emitirTotalLinea(parts, cobFmt, "TARJETA DEBITO", formatMoney(tarjetaDebito), width);
    if (transferencia > 0) emitirTotalLinea(parts, cobFmt, "TRANSFERENCIA", formatMoney(transferencia), width);
    if (bono > 0) emitirTotalLinea(parts, cobFmt, "BONO", formatMoney(bono), width);
    if (tarjetaRegalo > 0) emitirTotalLinea(parts, cobFmt, "TARJETA REGALO", formatMoney(tarjetaRegalo), width);
    if (notaCredito > 0) emitirTotalLinea(parts, cobFmt, "NOTA CREDITO", formatMoney(notaCredito), width);
    const totalPagado = efectivo + cheque + tarjetaCredito + tarjetaDebito + transferencia + bono + tarjetaRegalo + notaCredito;
    const devuelta = totalPagado - Number(data.total);
    if (devuelta > 0.01) {
      emitirTotalLinea(parts, devueltaFmt, "DEVUELTA", formatMoney(devuelta), width);
    }
    parts.push(CMD_ALIGN_LEFT);
    parts.push(lineSep("-", width) + LF);
  }
  parts.push(CMD_ALIGN_CENTER);
  parts.push(CMD_BOLD_ON);
  parts.push(pie + LF);
  parts.push(CMD_BOLD_OFF);
  parts.push(LF);
  return parts.join("");
}
function formatRIRow(documento, montoOrig, pagado, monto, width = LINE_LENGTH) {
  if (width < 48) {
    const factor = (width - 3) / 45;
    const doc = Math.max(5, Math.round(14 * factor));
    const orig = Math.max(4, Math.round(10 * factor));
    const pag = Math.max(4, Math.round(9 * factor));
    const mont = Math.max(5, Math.round(11 * factor));
    return left(documento, doc) + " " + right(montoOrig, orig) + " " + right(pagado, pag) + " " + right(monto, mont);
  }
  const docStr = left(documento, 14);
  const origStr = right(montoOrig, 10);
  const pagStr = right(pagado, 9);
  const montStr = right(monto, 11);
  return docStr + " " + origStr + " " + pagStr + " " + montStr;
}
function riHeader(width = LINE_LENGTH) {
  return formatRIRow("DOCUMENTO", "MONTO ORIG", "PAGADO", "APLICADO", width);
}
function formatTicketReciboIngreso(data, company, config) {
  const cfg = normalizarConfigRI(config);
  const width = cfg.opciones?.anchoLinea ?? LINE_LENGTH;
  const enc = cfg.encabezado || {};
  const cob = cfg.cobros || {};
  const pie = config?.pie?.textoPie ?? cfg.pie?.textoPie ?? "Gracias por su preferencia!";
  const parts = [];
  parts.push(CMD_INIT);
  const encFormato = enc.formato || {};
  const companyName = company?.nombre || data?.sucursal?.nombre || "SU EMPRESA";
  if (enc.mostrarCompania !== false) {
    if (encFormato.compania) {
      emitirLineaFormateada(parts, encFormato.compania, companyName, width);
    } else {
      parts.push(CMD_ALIGN_CENTER);
      parts.push(CMD_BOLD_ON);
      parts.push(companyName + LF);
      parts.push(CMD_BOLD_OFF);
    }
  }
  if (company?.direccion && enc.mostrarDireccion !== false) {
    if (encFormato.direccion) {
      emitirLineaFormateada(parts, encFormato.direccion, company.direccion, width);
    } else {
      parts.push(CMD_CONDENSED);
      parts.push(company.direccion + LF);
      parts.push(CMD_SIZE_NORMAL);
    }
  }
  if (company?.telefono && enc.mostrarTelefono !== false) {
    if (encFormato.telefono) {
      emitirLineaFormateada(parts, encFormato.telefono, "Tel.: " + company.telefono, width);
    } else {
      parts.push(CMD_CONDENSED);
      parts.push("Tel.: " + company.telefono + LF);
      parts.push(CMD_SIZE_NORMAL);
    }
  }
  if (company?.rnc && enc.mostrarRnc !== false) {
    if (encFormato.rnc) {
      emitirLineaFormateada(parts, encFormato.rnc, company.rnc, width);
    } else {
      parts.push(CMD_BOLD_ON);
      parts.push(company.rnc + LF);
      parts.push(CMD_BOLD_OFF);
    }
  }
  parts.push(CMD_BOLD_ON);
  parts.push(lineSep("=", width) + LF);
  parts.push(CMD_BOLD_OFF);
  const tituloTexto = cfg.titulo?.texto || "RECIBO DE INGRESO";
  const tituloFmt = cfg.titulo?.formato;
  if (tituloFmt) {
    emitirLineaFormateada(parts, tituloFmt, tituloTexto, width);
  } else {
    parts.push(CMD_ALIGN_CENTER);
    parts.push(CMD_BOLD_ON);
    parts.push(tituloTexto + LF);
    parts.push(CMD_BOLD_OFF);
  }
  parts.push(CMD_BOLD_ON);
  parts.push(lineSep("=", width) + LF);
  parts.push(CMD_BOLD_OFF);
  const visibles = cfg.campos?.visibles || {};
  const labels = cfg.campos?.labels || {};
  const formatos = cfg.campos?.formatos;
  const textosLibres = cfg.campos?.textosLibres;
  const camposDTO = cfg.campos?.camposDTO;
  const tabular = cfg.campos?.tabular;
  const tabularAncho = tabular ? Math.min(Math.max(tabular.ancho ?? 12, 4), width) : 0;
  const ordenRI = cfg.campos?.orden && cfg.campos.orden.some((k) => CAMPOS_TICKET_ORDEN_RI.includes(k) || k === "ESPACIO" || k === "SEPARADOR" || k.startsWith("LIBRE:") || k.startsWith("DTO:")) ? cfg.campos.orden : CAMPOS_TICKET_ORDEN_RI;
  const renderesRI = {
    NCF: () => {
      if (tabular) {
        return [lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS_RI, "NCF"), data.ncf || "--", tabularAncho) + LF];
      }
      const fmt = formatos?.["NCF"];
      const lbl = labelEditado(labels, CAMPOS_TICKET_LABELS_RI, "NCF");
      if (lbl) return [lineaConFormato(fmt, lbl, data.ncf || "--", width)];
      return [aplicarFormatoTexto(fmt, CMD_BOLD_ON + "NCF" + CMD_BOLD_OFF + "         " + (data.ncf || "--"), width)];
    },
    FECHA: () => {
      if (tabular) {
        return [lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS_RI, "FECHA"), formatDate(data.fechaDocumento), tabularAncho) + LF];
      }
      const fmt = formatos?.["FECHA"];
      const lbl = labelEditado(labels, CAMPOS_TICKET_LABELS_RI, "FECHA");
      if (lbl) return [lineaConFormato(fmt, lbl, formatDate(data.fechaDocumento), width)];
      return [aplicarFormatoTexto(fmt, CMD_BOLD_ON + "FECHA" + CMD_BOLD_OFF + "       " + formatDate(data.fechaDocumento), width)];
    },
    TIPO: () => {
      if (!(data.tipo?.codigo || data.tipo?.nombre)) return [];
      const texto = (data.tipo.codigo || "") + " " + (data.tipo.nombre || "");
      if (tabular) {
        return [lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS_RI, "TIPO"), texto, tabularAncho) + LF];
      }
      const fmt = formatos?.["TIPO"];
      const lbl = labelEditado(labels, CAMPOS_TICKET_LABELS_RI, "TIPO");
      if (lbl) return [lineaConFormato(fmt, lbl, texto, width)];
      return [aplicarFormatoTexto(fmt, "Tipo: " + texto, width)];
    },
    CONCEPTO: () => {
      if (!data.concepto?.nombre) return [];
      if (tabular) {
        return [lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS_RI, "CONCEPTO"), data.concepto.nombre, tabularAncho) + LF];
      }
      const fmt = formatos?.["CONCEPTO"];
      const lbl = labelEditado(labels, CAMPOS_TICKET_LABELS_RI, "CONCEPTO");
      if (lbl) return [lineaConFormato(fmt, lbl, data.concepto.nombre, width)];
      return [aplicarFormatoTexto(fmt, "Concepto: " + data.concepto.nombre, width)];
    },
    ENTIDAD: () => {
      const entidadNombre = data.entidad?.nombre || data.entidad?.razonSocial || "\u2014";
      if (tabular) {
        return [lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS_RI, "ENTIDAD"), entidadNombre, tabularAncho) + LF];
      }
      const fmt = formatos?.["ENTIDAD"];
      const lbl = labelEditado(labels, CAMPOS_TICKET_LABELS_RI, "ENTIDAD");
      if (lbl) return [lineaConFormato(fmt, lbl, entidadNombre, width)];
      return [aplicarFormatoTexto(fmt, CMD_BOLD_ON + "ENTIDAD" + CMD_BOLD_OFF + "    " + entidadNombre, width)];
    },
    ENTIDAD_ID: () => {
      const entidadId = data.entidad?.identificacion || data.entidad?.rnc || "";
      if (!entidadId) return [];
      if (tabular) {
        return [lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS_RI, "ENTIDAD_ID"), entidadId, tabularAncho) + LF];
      }
      const fmt = formatos?.["ENTIDAD_ID"];
      const lbl = labelEditado(labels, CAMPOS_TICKET_LABELS_RI, "ENTIDAD_ID");
      if (lbl) return [lineaConFormato(fmt, lbl, entidadId, width)];
      return [aplicarFormatoTexto(fmt, "               " + entidadId, width)];
    },
    NOTA: () => {
      if (!data.nota) return [];
      const lineas = [lineSep("-", width) + LF];
      if (tabular) {
        const lbl2 = etiquetaCampo(labels, CAMPOS_TICKET_LABELS_RI, "NOTA");
        const lineasNota = String(data.nota).split("\n");
        lineasNota.forEach((ln, i) => {
          if (i === 0) lineas.push(lineaTabular(lbl2, ln, tabularAncho) + LF);
          else lineas.push(" ".repeat(tabularAncho) + ln + LF);
        });
        return lineas;
      }
      const fmt = formatos?.["NOTA"];
      const lbl = labelEditado(labels, CAMPOS_TICKET_LABELS_RI, "NOTA");
      if (lbl) lineas.push(aplicarFormatoTexto(fmt, CMD_BOLD_ON + lbl + CMD_BOLD_OFF + ": " + data.nota, width));
      else lineas.push(aplicarFormatoTexto(fmt, "Nota: " + data.nota, width));
      return lineas;
    }
  };
  parts.push(CMD_ALIGN_LEFT);
  for (const campo of ordenRI) {
    if (emitirItemEspecial(parts, campo, data, width, textosLibres, camposDTO, tabular)) continue;
    if (visibles[campo] === false) continue;
    const render = renderesRI[campo];
    if (!render) continue;
    for (const linea of render()) parts.push(linea);
  }
  const transacciones = data.transaccionesAsociadas || [];
  if (transacciones.length > 0) {
    const detFmt = cfg.detalle?.formato || {};
    parts.push(lineSep("-", width) + LF);
    const cabeceraFmt = detFmt.cabecera;
    if (cabeceraFmt) {
      const { antes, despues } = comandosFormato({ ...cabeceraFmt, alineacion: void 0 });
      parts.push(...antes);
      parts.push(riHeader(width) + LF);
      parts.push(...despues);
    } else {
      parts.push(CMD_BOLD_ON);
      parts.push(riHeader(width) + LF);
      parts.push(CMD_BOLD_OFF);
    }
    parts.push(lineSep("-", width) + LF);
    const articuloFmt = detFmt.articulo;
    for (const doc of transacciones) {
      const fila = formatRIRow(
        (doc.documento || "").slice(0, 14),
        formatMoney(doc.montoOriginal),
        formatMoney(doc.pagado),
        formatMoney(doc.monto),
        width
      );
      if (articuloFmt) {
        emitirLineaFormateada(parts, articuloFmt, fila, width);
      } else {
        parts.push(fila + LF);
      }
    }
    parts.push(lineSep("-", width) + LF);
  }
  parts.push(CMD_ALIGN_RIGHT);
  const totalFmt = cfg.totales?.formato?.total;
  if (totalFmt) {
    const { antes, despues } = comandosFormato(totalFmt);
    parts.push(...antes);
    parts.push("\u2500".repeat(width) + LF);
    parts.push(formatTotalLine("TOTAL", formatMoney(data.total), width) + LF);
    parts.push(...despues);
  } else {
    parts.push(CMD_BOLD_ON);
    parts.push("\u2500".repeat(width) + LF);
    parts.push(formatTotalLine("TOTAL", formatMoney(data.total), width) + LF);
    parts.push(CMD_BOLD_OFF);
  }
  parts.push(CMD_ALIGN_LEFT);
  parts.push(lineSep("-", width) + LF);
  const cobros = data.cobros || [];
  if (cob.mostrarCobros !== false && cobros.length > 0) {
    parts.push(CMD_ALIGN_RIGHT);
    const cobFmt = cfg.cobros?.formato;
    for (const c of cobros) {
      const medio = (c.medioCobro || "Pago").trim();
      const monto = Number(c.monto) || 0;
      if (monto > 0) {
        emitirTotalLinea(parts, cobFmt, medio.toUpperCase(), formatMoney(monto), width);
      }
    }
    parts.push(CMD_ALIGN_LEFT);
    parts.push(lineSep("-", width) + LF);
  }
  parts.push(CMD_ALIGN_CENTER);
  parts.push(CMD_BOLD_ON);
  parts.push(pie + LF);
  parts.push(CMD_BOLD_OFF);
  parts.push(LF);
  return parts.join("");
}

// D:/Developer/Genesis/solugen-react/src/utils/escposToHtml.ts
function escposToHtml(raw) {
  const parts = [];
  let i = 0;
  let bold = false;
  let doubleSize = false;
  let condensed = false;
  let align = "left";
  let lineBuffer = "";
  function flushLine() {
    if (!lineBuffer) return;
    const style = [];
    if (bold) style.push("font-weight:700");
    if (doubleSize) style.push("font-size:28px;line-height:1.3");
    else if (condensed) style.push("font-size:11px;line-height:1.3");
    if (align === "center") style.push("text-align:center");
    else if (align === "right") style.push("text-align:right");
    else style.push("text-align:left");
    style.push("white-space:pre-wrap");
    const styled = style.length > 0 ? ` style="${style.join(";")}"` : "";
    parts.push(`<div${styled}>${lineBuffer}</div>`);
    lineBuffer = "";
  }
  while (i < raw.length) {
    const char = raw.charCodeAt(i);
    if (char === 27 && i + 1 < raw.length) {
      const cmd = raw.charCodeAt(i + 1);
      if (cmd === 97 && i + 2 < raw.length) {
        flushLine();
        const n = raw.charCodeAt(i + 2);
        if (n === 0) align = "left";
        else if (n === 1) align = "center";
        else if (n === 2) align = "right";
        i += 3;
        continue;
      }
      if (cmd === 69 && i + 2 < raw.length) {
        const n = raw.charCodeAt(i + 2);
        if (n === 1) bold = true;
        else if (n === 0) bold = false;
        i += 3;
        continue;
      }
      if (cmd === 33 && i + 2 < raw.length) {
        const n = raw.charCodeAt(i + 2);
        condensed = (n & 1) === 1;
        i += 3;
        continue;
      }
      if (cmd === 100 && i + 2 < raw.length) {
        flushLine();
        const n = raw.charCodeAt(i + 2);
        for (let f = 0; f < n; f++) {
          parts.push("<div>&nbsp;</div>");
        }
        i += 3;
        continue;
      }
      if (cmd === 64) {
        flushLine();
        bold = false;
        doubleSize = false;
        condensed = false;
        align = "left";
        i += 2;
        continue;
      }
      if (cmd >= 0 && cmd <= 127) {
        i += 2;
        continue;
      }
    }
    if (char === 29 && i + 2 < raw.length) {
      const cmd = raw.charCodeAt(i + 1);
      if (cmd === 33) {
        const n = raw.charCodeAt(i + 2);
        if ((n & 48) === 48) {
          doubleSize = true;
          condensed = false;
        } else {
          doubleSize = false;
          condensed = false;
        }
        i += 3;
        continue;
      }
      if (cmd === 86 && i + 2 < raw.length) {
        i += 3;
        continue;
      }
      if (cmd >= 0 && cmd <= 127) {
        i += i + 2 < raw.length ? 3 : 2;
        continue;
      }
    }
    if (char === 10) {
      flushLine();
      i++;
      continue;
    }
    if (char < 32 || char >= 127 && char <= 159) {
      i++;
      continue;
    }
    lineBuffer += raw[i];
    i++;
  }
  flushLine();
  return parts.join("");
}

// generate-salidas.ts
var companyEjemplo = {
  nombre: "SU EMPRESA DEMO",
  direccion: "AV. DEMO 123, SANTO DOMINGO",
  telefono: "809-000-0000",
  rnc: "1-01-00000-1"
};
var datosEjemploPOS = {
  ncf: "B0100000001",
  transaccionNCF: { nombreTipoComprobante: "CREDITO FISCAL" },
  cajero: "JUAN PEREZ",
  caja: "CAJA 01",
  turno: "TURNO A",
  fechaDocumento: "2026-08-02T15:30:00",
  noDocumento: "0001",
  ncfModificado: "B0100000002",
  referencia: "REF-0001",
  nota: "Nota de ejemplo",
  tasa: 1,
  diasCredito: 30,
  retenciones: 0,
  estado: 1,
  cliente: {
    nombre: "CONSUMIDOR FINAL",
    identificacion: "402-1234567-8",
    telefono: "809-111-2222",
    direccion: "AV. CLIENTE 45"
  },
  secuenciaNCF: { nombre: "CREDITO FISCAL", tipoComprobante: "30" },
  concepto: { nombre: "VENTA AL CONTADO" },
  almacen: { nombre: "ALMACEN PRINCIPAL" },
  moneda: { nombre: "PESO DOMINICANO" },
  sucursal: { nombre: "SUCURSAL CENTRAL", telefono: "809-333-4444", direccion: "AV. SUCURSAL 10" },
  subTotal: 100,
  impuestos: 18,
  descuento: 0,
  total: 118,
  detalles: [
    { articulo: "ACEITE VEGETAL 1L", codigo: "000123", cantidad: 2, precio: 50, impuestos: 9, total: 100 },
    { articulo: "ARROZ SELECTO 5LB", codigo: "000456", cantidad: 1, precio: 18, impuestos: 3.24, total: 18 }
  ],
  cobros: [{
    efectivo: 200,
    cheque: 0,
    tarjetaCredito: 0,
    tarjetaDebito: 0,
    transferencia: 0,
    bono: 0,
    tarjetaRegalo: 0,
    notaCredito: 0
  }]
};
var datosEjemploRecibo = {
  ncf: "B0100000002",
  fechaDocumento: "2026-08-02T15:30:00",
  noDocumento: "0002",
  tipo: { codigo: "RI", nombre: "Recibo de Ingreso" },
  concepto: { nombre: "COBRO A CUENTA" },
  entidad: {
    nombre: "CLIENTE DEMO",
    identificacion: "402-1234567-8",
    telefono: "809-555-6666",
    direccion: "AV. ENTIDAD 20"
  },
  moneda: { nombre: "PESO DOMINICANO" },
  sucursal: { nombre: "SUCURSAL CENTRAL" },
  nota: "Pago parcial",
  referencia: "REF-RI-0001",
  tasa: 1,
  subTotal: 500,
  descuento: 0,
  impuestos: 0,
  retenciones: 0,
  estado: 1,
  periodo: 202608,
  diasCredito: 0,
  total: 500,
  transaccionesAsociadas: [
    { documento: "FACT-0001", montoOriginal: 500, pagado: 300, monto: 300 },
    { documento: "FACT-0002", montoOriginal: 300, pagado: 200, monto: 200 }
  ],
  cobros: [{ medioCobro: "Efectivo", monto: 500 }]
};
function legible(raw) {
  return raw.replace(/\x1B/g, "<ESC>").replace(/\x1D/g, "<GS>").replace(/\n/g, "<LF>\n").replace(/[\x00-\x1F]/g, (c) => `[${c.charCodeAt(0).toString(16).toUpperCase()}]`);
}
var salidaFPV = formatTicketPOS(datosEjemploPOS, companyEjemplo, void 0);
var salidaFRI = formatTicketReciboIngreso(datosEjemploRecibo, companyEjemplo, void 0);
var configConItemsFPV = {
  campos: {
    orden: ["SEPARADOR", "ESPACIO", "LIBRE:promo", "DTO:tel", "NCF", "TIPO_COMP", "RNC_CLIENTE"],
    labels: { NCF: "COMPROBANTE" },
    textosLibres: { promo: "OFERTA 2X1\nSOLO HOY" },
    camposDTO: { tel: { label: "TEL", ruta: "cliente.telefono", tipo: "texto" } }
  }
};
var configConItemsFRI = {
  campos: {
    orden: ["SEPARADOR", "ESPACIO", "LIBRE:promo", "DTO:tel", "NCF", "FECHA", "ENTIDAD"],
    labels: { NCF: "COMPROBANTE" },
    textosLibres: { promo: "OFERTA 2X1\nSOLO HOY" },
    camposDTO: { tel: { label: "TEL", ruta: "entidad.telefono", tipo: "texto" } }
  }
};
var salidaFPVItems = formatTicketPOS(datosEjemploPOS, companyEjemplo, configConItemsFPV);
var salidaFRIItems = formatTicketReciboIngreso(datosEjemploRecibo, companyEjemplo, configConItemsFRI);
var configFormatosFPV = {
  campos: {
    orden: ["SEPARADOR", "LIBRE:promo", "LIBRE:promoDer", "LIBRE:promoDoble", "DTO:tel", "DTO:telCond", "NCF", "CLIENTE"],
    textosLibres: {
      promo: { texto: "OFERTA 2X1\nSOLO HOY" },
      promoDer: { texto: "PROMO DERECHA", alineacion: "derecha", negrita: true, tamano: "normal" },
      promoDoble: { texto: "PROMO DOBLE", alineacion: "derecha", negrita: true, tamano: "doble" }
    },
    camposDTO: {
      tel: { label: "TEL", ruta: "cliente.telefono", tipo: "texto" },
      telCond: { label: "TEL COND", ruta: "cliente.telefono", tipo: "texto", tamano: "condensada" }
    },
    formatos: {
      NCF: { alineacion: "derecha", negrita: true },
      CLIENTE: { alineacion: "centro" }
    }
  }
};
var configFormatosFRI = {
  campos: {
    orden: ["SEPARADOR", "LIBRE:promoDer", "DTO:telCond", "NCF", "FECHA", "ENTIDAD"],
    textosLibres: { promoDer: { texto: "RI DERECHA", alineacion: "derecha", negrita: true } },
    camposDTO: { telCond: { label: "TEL COND", ruta: "entidad.telefono", tipo: "texto", tamano: "condensada" } },
    formatos: { NCF: { alineacion: "derecha", negrita: true } }
  }
};
var salidaFPVFormatos = formatTicketPOS(datosEjemploPOS, companyEjemplo, configFormatosFPV);
var salidaFRIFormatos = formatTicketReciboIngreso(datosEjemploRecibo, companyEjemplo, configFormatosFRI);
var configSeccionesFPV = {
  encabezado: { formato: { compania: { tamano: "doble" } } },
  titulo: { texto: "FACTURA DE PRUEBA", formato: { alineacion: "derecha", negrita: true } },
  detalle: { formato: { articulo: { alineacion: "derecha" } } },
  totales: { formato: { total: { tamano: "condensada" } } },
  cobros: { formato: { alineacion: "izquierda" } },
  campos: { tabular: { ancho: 12 } }
};
var configSeccionesFRI = {
  encabezado: { formato: { compania: { tamano: "doble" } } },
  titulo: { texto: "RECIBO DE PRUEBA", formato: { alineacion: "derecha", negrita: true } },
  detalle: { formato: { articulo: { alineacion: "derecha" } } },
  totales: { formato: { total: { tamano: "condensada" } } },
  cobros: { formato: { alineacion: "izquierda" } },
  campos: { tabular: { ancho: 12 } }
};
var salidaFPVSecciones = formatTicketPOS(datosEjemploPOS, companyEjemplo, configSeccionesFPV);
var salidaFRISecciones = formatTicketReciboIngreso(datosEjemploRecibo, companyEjemplo, configSeccionesFRI);
var dir = __dirname;
(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fpv_sin_config.raw.txt"), salidaFPV, "latin1");
(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fri_sin_config.raw.txt"), salidaFRI, "latin1");
(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fpv_con_items.raw.txt"), salidaFPVItems, "latin1");
(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fri_con_items.raw.txt"), salidaFRIItems, "latin1");
(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fpv_con_formatos.raw.txt"), salidaFPVFormatos, "latin1");
(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fri_con_formatos.raw.txt"), salidaFRIFormatos, "latin1");
(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fpv_secciones.raw.txt"), salidaFPVSecciones, "latin1");
(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fri_secciones.raw.txt"), salidaFRISecciones, "latin1");

(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fpv_sin_config.leido.txt"), legible(salidaFPV), "utf8");
(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fri_sin_config.leido.txt"), legible(salidaFRI), "utf8");
(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fpv_con_items.leido.txt"), legible(salidaFPVItems), "utf8");
(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fri_con_items.leido.txt"), legible(salidaFRIItems), "utf8");
(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fpv_con_formatos.leido.txt"), legible(salidaFPVFormatos), "utf8");
(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fri_con_formatos.leido.txt"), legible(salidaFRIFormatos), "utf8");
(0, import_node_fs.writeFileSync)((0, import_node_path.join)(dir, "fpv_con_formatos.html"), escposToHtml(salidaFPVFormatos), "utf8");
var bytes = (s) => new TextEncoder().encode(s).length;
var sha = (s) => (0, import_node_crypto.createHash)("sha256").update(s, "latin1").digest("hex").toUpperCase();
console.log("=== REGRESION CERO (sin config) ===");
console.log("FPV:", salidaFPV.length, "chars |", bytes(salidaFPV), "bytes | SHA256:", sha(salidaFPV));
console.log("FRI:", salidaFRI.length, "chars |", bytes(salidaFRI), "bytes | SHA256:", sha(salidaFRI));
console.log("(baseline previo FPV: 18303BB3BACC6AAF1D61AF4C41E0F034CDF54385368B4CE3645293D3EC4412C8)");
console.log("(baseline previo FRI: E2D7CFB5740E270788675B1A5242C826DB46E9C9617C37320E49F9481227B02C)");
console.log("\n=== FPV con formatos (seccion inicial) ===");
console.log(legible(salidaFPVFormatos).slice(0, 1200));
console.log("\n=== FRI con formatos (seccion inicial) ===");
console.log(legible(salidaFRIFormatos).slice(0, 900));
console.log("\n=== FPV con formatos -> HTML (condensada/doble en el preview) ===");
var html = escposToHtml(salidaFPVFormatos);
var countOf = (needle) => html.split(needle).length - 1;
console.log("ocurrencias font-size:11px (condensada):", countOf("font-size:11px"));
console.log("ocurrencias font-size:28px (doble):", countOf("font-size:28px"));
console.log("ocurrencias text-align:center:", countOf("text-align:center"));
console.log("ocurrencias text-align:right:", countOf("text-align:right"));
console.log("\n=== FPV con formatos -> HTML: divs condensados (fragmentos) ===");
var reCond = /<div style="[^"]*font-size:11px[^"]*">[^<]*/g;
var frags = html.match(reCond) || [];
frags.slice(0, 6).forEach((f) => console.log("  ", f.slice(0, 110)));
console.log("\n=== FPV secciones + tabular (fragmentos) ===");
console.log(legible(salidaFPVSecciones).slice(0, 1400));
console.log("\n=== FRI secciones + tabular (fragmentos) ===");
console.log(legible(salidaFRISecciones).slice(0, 1100));
console.log("\nArchivos escritos en", dir);
