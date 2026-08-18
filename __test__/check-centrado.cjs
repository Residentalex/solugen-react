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
function normalizarConfig(config) {
  if (!config) return { ...PLANTILLA_CONFIG_DEFAULT };
  return mergeConfig(PLANTILLA_CONFIG_DEFAULT, config);
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
function emitirItemEspecial(parts, item, data2, width, textosLibres, camposDTO, tabular) {
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
      const valor = formatearValorDTO(resolverRuta(data2, def.ruta), def.tipo);
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
function formatTicketPOS(data2, company2, config) {
  const cfg = normalizarConfig(config);
  const width = cfg.opciones?.anchoLinea ?? LINE_LENGTH;
  const enc = cfg.encabezado || {};
  const tot = cfg.totales || {};
  const cob = cfg.cobros || {};
  const pie = cfg.pie?.textoPie || "** GRACIAS POR SU COMPRA **";
  const parts = [];
  parts.push(CMD_INIT);
  const encFormato = enc.formato || {};
  const companyName = company2?.nombre || data2?.sucursal?.nombre || "SU EMPRESA";
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
  if (company2?.direccion && enc.mostrarDireccion !== false) {
    if (encFormato.direccion) {
      emitirLineaFormateada(parts, encFormato.direccion, company2.direccion, width);
    } else {
      parts.push(CMD_CONDENSED);
      parts.push(company2.direccion + LF);
      parts.push(CMD_SIZE_NORMAL);
    }
  }
  if (company2?.telefono && enc.mostrarTelefono !== false) {
    if (encFormato.telefono) {
      emitirLineaFormateada(parts, encFormato.telefono, "Tel.: " + company2.telefono, width);
    } else {
      parts.push(CMD_CONDENSED);
      parts.push("Tel.: " + company2.telefono + LF);
      parts.push(CMD_SIZE_NORMAL);
    }
  }
  if (company2?.rnc && enc.mostrarRnc !== false) {
    if (encFormato.rnc) {
      emitirLineaFormateada(parts, encFormato.rnc, "RNC: " + company2.rnc, width);
    } else {
      parts.push("RNC: " + company2.rnc + LF);
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
    NCF: () => [tabular ? lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "NCF"), data2.ncf || "--", tabularAncho) + LF : lineaConFormato(formatos?.["NCF"], etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "NCF"), data2.ncf || "--", width)],
    TIPO_COMP: () => {
      const tipoComp = data2.transaccionNCF?.nombreTipoComprobante || data2.secuenciaNCF?.nombreTipoComprobante || "";
      return [tabular ? lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "TIPO_COMP"), tipoComp || "--", tabularAncho) + LF : lineaConFormato(formatos?.["TIPO_COMP"], etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "TIPO_COMP"), tipoComp || "--", width)];
    },
    CAJERO: () => [tabular ? lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "CAJERO"), data2.cajero || "--", tabularAncho) + LF : lineaConFormato(formatos?.["CAJERO"], etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "CAJERO"), data2.cajero || "--", width)],
    CAJA: () => [tabular ? lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "CAJA"), data2.caja || "--", tabularAncho) + LF : lineaConFormato(formatos?.["CAJA"], etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "CAJA"), data2.caja || "--", width)],
    TURNO: () => [tabular ? lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "TURNO"), data2.turno || "--", tabularAncho) + LF : lineaConFormato(formatos?.["TURNO"], etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "TURNO"), data2.turno || "--", width)],
    FECHA: () => [tabular ? lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "FECHA"), formatDate(data2.fechaDocumento), tabularAncho) + LF : lineaConFormato(formatos?.["FECHA"], etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "FECHA"), formatDate(data2.fechaDocumento), width)],
    HORA: () => [tabular ? lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "HORA"), formatTime(data2.fechaDocumento), tabularAncho) + LF : lineaConFormato(formatos?.["HORA"], etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "HORA"), formatTime(data2.fechaDocumento), width)],
    NO: () => [tabular ? lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "NO"), data2.noDocumento || "--", tabularAncho) + LF : lineaConFormato(formatos?.["NO"], etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "NO"), data2.noDocumento || "--", width)],
    CLIENTE: () => {
      const clienteNombre = data2.cliente?.nombre || "Consumidor Final";
      return [tabular ? lineaTabular(etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "CLIENTE"), clienteNombre, tabularAncho) + LF : lineaConFormato(formatos?.["CLIENTE"], etiquetaCampo(labels, CAMPOS_TICKET_LABELS, "CLIENTE"), clienteNombre, width)];
    },
    RNC_CLIENTE: () => {
      const clienteRnc = data2.cliente?.identificacion || "";
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
    if (emitirItemEspecial(parts, campo, data2, width, textosLibres, camposDTO, tabular)) continue;
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
  const detalles = data2.detalles || [];
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
  const totalGravado = Number(data2.subTotal) || 0;
  const descuento = Number(data2.descuento) || 0;
  const itbis = Number(data2.impuestos) || 0;
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
    parts.push(formatTotalLine("TOTAL", formatMoney(data2.total), width) + LF);
    parts.push(...despues);
  } else {
    parts.push(CMD_BOLD_ON);
    parts.push(formatTotalLine("TOTAL", formatMoney(data2.total), width) + LF);
    parts.push(CMD_BOLD_OFF);
  }
  parts.push(CMD_ALIGN_LEFT);
  parts.push(lineSep("-", width) + LF);
  const cobros = data2.cobros || [];
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
    const devuelta = totalPagado - Number(data2.total);
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

// check-centrado.ts
var company = {
  nombre: "SU EMPRESA DEMO",
  direccion: "AV. DEMO 123, SANTO DOMINGO",
  telefono: "809-000-0000",
  rnc: "1-01-00000-1"
};
var data = {
  ncf: "B0100000001",
  transaccionNCF: { nombreTipoComprobante: "CREDITO FISCAL" },
  cajero: "JUAN PEREZ",
  caja: "CAJA 01",
  turno: "TURNO A",
  fechaDocumento: "2026-08-02T15:30:00",
  noDocumento: "0001",
  cliente: { nombre: "CONSUMIDOR FINAL", identificacion: "402-1234567-8" },
  secuenciaNCF: { nombre: "CREDITO FISCAL" },
  concepto: { nombre: "VENTA AL CONTADO" },
  sucursal: { nombre: "SUCURSAL CENTRAL" },
  subTotal: 100,
  impuestos: 18,
  descuento: 0,
  total: 118,
  detalles: [
    { articulo: "ACEITE VEGETAL 1L", codigo: "000123", cantidad: 2, precio: 50, impuestos: 9, total: 100 }
  ],
  cobros: [{ efectivo: 200, cheque: 0, tarjetaCredito: 0, tarjetaDebito: 0, transferencia: 0, bono: 0, tarjetaRegalo: 0, notaCredito: 0 }]
};
function textoVisible(linea) {
  let out = "";
  let i = 0;
  while (i < linea.length) {
    const c = linea.charCodeAt(i);
    if (c === 27 && i + 1 < linea.length) {
      const cmd = linea.charCodeAt(i + 1);
      if (cmd === 64) {
        i += 2;
        continue;
      }
      if (cmd === 97 || cmd === 69 || cmd === 33 || cmd === 100) {
        i += 3;
        continue;
      }
      i += 2;
      continue;
    }
    if (c === 29 && i + 2 < linea.length) {
      const cmd = linea.charCodeAt(i + 1);
      if (cmd === 33 || cmd === 86) {
        i += 3;
        continue;
      }
      i += 3;
      continue;
    }
    if (c >= 32 && c <= 126) out += linea[i];
    i++;
  }
  return out;
}
function lineaCon(raw, texto) {
  const idx = raw.indexOf(texto);
  const inicio = raw.lastIndexOf("\n", idx - 1) + 1;
  const fin = raw.indexOf("\n", idx);
  return raw.slice(inicio, fin);
}
for (const ancho of [32, 42, 48]) {
  const config = {
    opciones: { anchoLinea: ancho },
    campos: {
      orden: ["LIBRE:centro", "NCF"],
      textosLibres: { centro: { texto: "CENTER ME", alineacion: "centro", negrita: true, tamano: "normal" } }
    },
    titulo: { texto: "TITULO CENTRO" }
  };
  const raw = formatTicketPOS(data, company, config);
  console.log(`
===== Ancho ${ancho} =====`);
  const lCompania = textoVisible(lineaCon(raw, "SU EMPRESA DEMO"));
  console.log(`compania [${lCompania}] len=${lCompania.length} izq=${lCompania.length - lCompania.trimStart().length} der=${lCompania.length - lCompania.trimEnd().length}`);
  const lLibre = textoVisible(lineaCon(raw, "CENTER ME"));
  console.log(`libre    [${lLibre}] len=${lLibre.length} izq=${lLibre.length - lLibre.trimStart().length} der=${lLibre.length - lLibre.trimEnd().length}`);
  const lTitulo = textoVisible(lineaCon(raw, "TITULO CENTRO"));
  console.log(`titulo   [${lTitulo}] len=${lTitulo.length} izq=${lTitulo.length - lTitulo.trimStart().length} der=${lTitulo.length - lTitulo.trimEnd().length}`);
  const centroExacto = (s) => s.length === ancho || s.length === ancho - 1;
  const izq = lLibre.length - lLibre.trimStart().length;
  const der = lLibre.length - lLibre.trimEnd().length;
  const simetrico = Math.abs(izq - der) <= 1;
  console.log(`libre centrado: ocupa ${lLibre.length} (esperado ${ancho} o ${ancho - 1}) -> ${centroExacto(lLibre) ? "OK" : "FALLA"} | simetrico ${simetrico ? "OK" : "FALLA"}`);
}
