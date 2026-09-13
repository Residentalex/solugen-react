"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CMD_CUT = void 0;
exports.feed = feed;
exports.formatFechaCorta = formatFechaCorta;
exports.formatTicketPOS = formatTicketPOS;
exports.formatTicketReciboIngreso = formatTicketReciboIngreso;
exports.formatTicketVoucherVisanet = formatTicketVoucherVisanet;
exports.escposQRCode = escposQRCode;
exports.escposBarcode = escposBarcode;
exports.formatTicket = formatTicket;
const ticketPlantillaConfig_1 = require("./ticketPlantillaConfig");
const expresiones_1 = require("./expresiones");
// ===== Constantes ESC/POS =====
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\n';
const CMD_INIT = ESC + '@';
/**
 * Normalizacion post-init para impresoras termicas de 80mm. Algunos firmwares
 * (clones POS80) arrancan con espaciado de caracter y margenes de fabrica mas
 * anchos, lo que hace que una linea de 48 columnas no quepa y se parta en dos.
 * - ESC SP 0: espaciado derecho de caracter en 0.
 * - GS L 0:   margen izquierdo en 0.
 * - GS W 576: area imprimible completa (576 dots ~ 72mm a 203dpi).
 * - GS ! 0:   tamano de caracter normal 1x1.
 * Debe re-aplicarse despues de cada CMD_INIT porque ESC @ restaura los
 * valores de fabrica de la impresora.
 */
const CMD_NORMALIZAR = '\x1B\x20\x00' + // ESC SP 0
    '\x1D\x4C\x00\x00' + // GS L 0
    '\x1D\x57\x40\x02' + // GS W 576
    '\x1D\x21\x00'; // GS ! 0
const CMD_ALIGN_LEFT = ESC + 'a' + '\x00';
const CMD_ALIGN_CENTER = ESC + 'a' + '\x01';
const CMD_ALIGN_RIGHT = ESC + 'a' + '\x02';
const CMD_BOLD_ON = ESC + 'E' + '\x01';
const CMD_BOLD_OFF = ESC + 'E' + '\x00';
const CMD_CONDENSED = ESC + '!' + '\x01'; // Fuente condensada (más pequeña)
const CMD_CONDENSED_OFF = ESC + '!' + '\x00'; // Restaura fuente condensada
const CMD_FONT_A = ESC + 'M' + '\x00'; // Fuente A (estándar)
const CMD_FONT_B = ESC + 'M' + '\x01'; // Fuente B (más compacta que A)
const CMD_SIZE_DOUBLE = GS + '!' + '\x11'; // 2x alto, 2x ancho
const CMD_SIZE_DOUBLE_ALTURA = GS + '!' + '\x01'; // 1x ancho, 2x alto
const CMD_SIZE_DOUBLE_ANCHO = GS + '!' + '\x10'; // 2x ancho, 1x alto
const CMD_SIZE_TRIPLE = GS + '!' + '\x22'; // 3x alto, 3x ancho
const CMD_SIZE_NORMAL = GS + '!' + '\x00';
function feed(n) { return ESC + 'd' + String.fromCharCode(n); }
exports.CMD_CUT = GS + 'V' + '\x00';
const CMD_J = ESC + 'J'; // Avance de papel de n/216 pulgadas (one-time)
const CMD_UNDERLINE_ON = ESC + '-' + '\x01'; // Subrayado 1-dot
const CMD_UNDERLINE_OFF = ESC + '-' + '\x00';
// ===== Helpers de texto =====
const LINE_LENGTH = 48;
/**
 * Centra un texto sobre el ancho con padding SIMETRICO.
 * - Con `ESC a 1` (centro) el comando centra el bloque completo; al medir el
 *   bloque exactamente `width` (par) o `width - 1` (impar), el centrado del
 *   comando es neutro y es el padding simetrico el que centra el texto visible.
 * - Sin `ESC a` (impresoras basicas) el padding simetrico tambien centra.
 * - ANTES habia padding solo a la izquierda, lo que desplazaba el texto a la
 *   derecha al centrar el bloque (padding + texto) sobre el ancho.
 */
function center(text, width = LINE_LENGTH) {
    if (text.length >= width)
        return text.slice(0, width);
    const padding = Math.floor((width - text.length) / 2);
    return ' '.repeat(padding) + text + ' '.repeat(padding);
}
function right(text, width = LINE_LENGTH) {
    // Truncar conservando los ÚLTIMOS caracteres para mantener alineación derecha
    if (text.length > width)
        return text.slice(text.length - width);
    return ' '.repeat(width - text.length) + text;
}
function left(text, width = LINE_LENGTH) {
    if (text.length >= width)
        return text.slice(0, width);
    return text + ' '.repeat(width - text.length);
}
function leftVisible(text, width = LINE_LENGTH) {
    const visible = largoVisible(text);
    // C2: Truncar si el texto visible excede el ancho
    if (visible > width)
        return text.slice(0, width);
    return text + ' '.repeat(width - visible);
}
function lineSep(char = '-', width = LINE_LENGTH) {
    return char.repeat(Math.max(1, width - 2));
}
function formatMoney(val) {
    const num = Number(val) || 0;
    // Usar formato simple: punto decimal fijo, sin separador de miles
    return num.toFixed(2);
}
function formatDate(val) {
    if (!val)
        return '--';
    try {
        const d = new Date(val);
        if (isNaN(d.getTime()))
            return val;
        return d.toLocaleDateString('es-DO', {
            day: '2-digit', month: '2-digit', year: 'numeric',
        });
    }
    catch {
        return val;
    }
}
/**
 * Fecha corta dd/MM/yy (año de 2 digitos). Mismo patron de fallback que
 * `formatDate`: '--' si no hay valor, valor original si la fecha es invalida.
 * NO modifica `formatDate` (usado por FPV/FRI con 4 digitos de anio).
 */
function formatFechaCorta(val) {
    if (!val)
        return '--';
    try {
        const d = new Date(val);
        if (isNaN(d.getTime()))
            return val;
        return d.toLocaleDateString('es-DO', {
            day: '2-digit', month: '2-digit', year: '2-digit',
        });
    }
    catch {
        return val;
    }
}
function formatTime(val) {
    if (!val)
        return '--';
    try {
        const d = new Date(val);
        if (isNaN(d.getTime()))
            return val;
        return d.toLocaleTimeString('es-DO', {
            hour: '2-digit', minute: '2-digit', hour12: false,
        });
    }
    catch {
        return val;
    }
}
// ===== Resolucion de labels editables y campos DTO =====
/**
 * Devuelve el label a imprimir para un campo estandar.
 * Si `labels[clave]` fue editado (existe, no vacio y distinto del default),
 * usa el editado; si no, el label original (regresion cero).
 */
function etiquetaCampo(labels, defaultLabels, clave) {
    const lbl = labels?.[clave];
    if (lbl !== undefined && lbl !== '' && lbl !== defaultLabels[clave])
        return lbl;
    return defaultLabels[clave] || clave;
}
/** Devuelve el label editado (o undefined si no fue editado). */
function labelEditado(labels, defaultLabels, clave) {
    const lbl = labels?.[clave];
    if (lbl !== undefined && lbl !== '' && lbl !== defaultLabels[clave])
        return lbl;
    return undefined;
}
/** Resuelve una ruta con puntos sobre un objeto (ej. 'cliente.nombre'). */
function resolverRuta(obj, ruta) {
    const partes = ruta.split('.');
    let cur = obj;
    for (const p of partes) {
        if (cur == null)
            return undefined;
        cur = cur[p];
    }
    return cur;
}
/**
 * Genera datos de ejemplo para un arrayOrigen cuando el dato real no está disponible.
 * Extrae las claves de las líneas DETALLE:* de la zona y crea items sintéticos
 * con valores placeholder para que el preview muestre algo representativo.
 */
function generarDatosEjemploArray(zona, numItems = 2) {
    const clavesDetalle = zona.lineas
        .filter(l => l.ref.startsWith('DETALLE:'))
        .map(l => l.ref.slice(8));
    if (clavesDetalle.length === 0)
        return [];
    return Array.from({ length: numItems }, (_, i) => {
        const item = {};
        for (const clave of clavesDetalle) {
            const partes = clave.split('.');
            // Construir objeto anidado con valores placeholder
            let cur = item;
            for (let p = 0; p < partes.length - 1; p++) {
                if (!cur[partes[p]])
                    cur[partes[p]] = {};
                cur = cur[partes[p]];
            }
            const hoja = partes[partes.length - 1];
            // Valor placeholder: numérico si la clave sugiere monto/cantidad, texto si no
            if (/^(monto|precio|cantidad|total|subtotal|impuesto|descuento|porcentaje)/i.test(hoja)) {
                cur[hoja] = Number((10 + i * 5.5).toFixed(2));
            }
            else {
                cur[hoja] = `${hoja} ${i + 1}`;
            }
        }
        return item;
    });
}
/** Formatea el valor de un campo DTO segun su tipo. */
function formatearValorDTO(valor, tipo) {
    if (valor === undefined || valor === null || valor === '')
        return '--';
    switch (tipo) {
        case 'fecha': return formatDate(String(valor));
        case 'hora': return formatTime(String(valor));
        case 'dinero': return formatMoney(valor);
        default: return String(valor);
    }
}
// ===== Formato configurable de items (alineacion / negrita / tamano) =====
/**
 * Largo de una linea contando solo caracteres imprimibles (ignora bytes de
 * control como los comandos ESC/POS embebidos para la negrita del label).
 */
function largoVisible(texto) {
    let n = 0;
    for (let i = 0; i < texto.length; i++) {
        const c = texto.charCodeAt(i);
        if (c >= 0x20 && c <= 0x7e)
            n++;
    }
    return n;
}
/**
 * Centra un texto que puede contener comandos ESC/POS embebidos, con padding
 * SIMETRICO (mismo criterio que `center`: evita el desplazamiento a la derecha
 * que producia el padding solo-izquierda al centrar el bloque completo).
 */
function centerVisible(texto, width = LINE_LENGTH) {
    const n = largoVisible(texto);
    // C2: Truncar si el texto visible excede el ancho
    if (n > width)
        return texto.slice(0, width);
    const padding = Math.floor((width - n) / 2);
    return ' '.repeat(padding) + texto + ' '.repeat(padding);
}
/** Alinea a la derecha un texto que puede contener comandos ESC/POS embebidos. */
function rightVisible(texto, width = LINE_LENGTH) {
    const n = largoVisible(texto);
    // C2: Truncar conservando los ÚLTIMOS caracteres para mantener alineación derecha
    if (n > width)
        return texto.slice(n - width);
    return ' '.repeat(width - n) + texto;
}
/**
 * Quita espacios (0x20) de los extremos de un texto que puede contener
 * comandos ESC/POS embebidos (se respetan los bytes de control).
 */
function trimVisible(texto) {
    let inicio = 0;
    let fin = texto.length;
    while (inicio < fin && texto.charCodeAt(inicio) === 0x20)
        inicio++;
    while (fin > inicio && texto.charCodeAt(fin - 1) === 0x20)
        fin--;
    return texto.substring(inicio, fin);
}
/**
 * Escanea un grupo de lineas con mismaLinea buscando una con columna definida.
 * Si la encuentra, retorna { izquierda: anchoIzq, derecha: anchoDer }.
 * Si no, retorna null.
 */
function detectarColumnaEnGrupo(lineas, startIndex) {
    for (let i = startIndex; i < lineas.length; i++) {
        const linea = lineas[i];
        if (linea.columna) {
            return { izquierda: linea.columna.izquierda.ancho, derecha: linea.columna.derecha.ancho };
        }
        if (!linea.mismaLinea)
            break;
    }
    return null;
}
/**
 * Divide el texto multilinea en segmentos de a lo sumo `maxLen` caracteres
 * visibles (wrap por palabra: corta en el ultimo espacio antes del corte; si
 * una palabra supera el limite, se corta por caracter). Conserva los saltos de
 * linea originales. Usa `largoVisible` para no contar caracteres de control.
 */
function wrapTexto(texto, maxLen) {
    const segmentos = [];
    for (const linea of texto.split('\n')) {
        if (largoVisible(linea) <= maxLen) {
            segmentos.push(linea);
            continue;
        }
        let resto = linea;
        while (largoVisible(resto) > maxLen) {
            const slice = resto.slice(0, maxLen);
            const ultimoEspacio = slice.lastIndexOf(' ');
            const corte = ultimoEspacio > 0 ? ultimoEspacio : maxLen;
            segmentos.push(resto.slice(0, corte));
            resto = resto.slice(corte).replace(/^ /, '');
        }
        if (resto.length > 0)
            segmentos.push(resto);
    }
    return segmentos;
}
/**
 * Comandos a emitir ANTES y DESPUES de una linea segun su formato.
 * - Sin formato (o solo izquierda/normal/sin negrita explicita): sin comandos,
 *   el item conserva su patron natural (regresion cero).
 * - Alineacion centro/derecha: ESC a n, restaurado con ESC a izquierda.
 * - Tamaño doble/condensada: GS ! 0x30 / ESC ! 0x01, restaurado despues.
 * - Negrita true: toda la linea en negrita; false: asegura apagado.
 */
function comandosFormato(fmt) {
    const antes = [];
    const despues = [];
    if (!fmt)
        return { antes, despues };
    if (fmt.alineacion === 'centro') {
        antes.push(CMD_ALIGN_CENTER);
        despues.push(CMD_ALIGN_LEFT);
    }
    else if (fmt.alineacion === 'derecha') {
        antes.push(CMD_ALIGN_RIGHT);
        despues.push(CMD_ALIGN_LEFT);
    }
    if (fmt.tamano === 'doble') {
        antes.push(CMD_SIZE_DOUBLE);
        despues.push(CMD_SIZE_NORMAL);
    }
    else if (fmt.tamano === 'doble_b') {
        // Doble compacto: Fuente B como base + 2x2. Se ve notablemente más
        // pequeño que el doble estándar (Fuente A).
        antes.push(CMD_FONT_B + CMD_SIZE_DOUBLE);
        despues.push(CMD_SIZE_NORMAL + CMD_FONT_A);
    }
    else if (fmt.tamano === 'doble_altura') {
        antes.push(CMD_SIZE_DOUBLE_ALTURA);
        despues.push(CMD_SIZE_NORMAL);
    }
    else if (fmt.tamano === 'doble_ancho') {
        antes.push(CMD_SIZE_DOUBLE_ANCHO);
        despues.push(CMD_SIZE_NORMAL);
    }
    else if (fmt.tamano === 'triple') {
        antes.push(CMD_SIZE_TRIPLE);
        despues.push(CMD_SIZE_NORMAL);
    }
    else if (fmt.tamano === 'condensada') {
        antes.push(CMD_CONDENSED);
        despues.push(CMD_CONDENSED_OFF);
    }
    if (fmt.negrita === true) {
        antes.push(CMD_BOLD_ON);
        despues.push(CMD_BOLD_OFF);
    }
    else if (fmt.negrita === false) {
        antes.push(CMD_BOLD_OFF);
    }
    return { antes, despues };
}
/**
 * Aplica formato a un texto base ya construido (puede traer la negrita natural
 * del label embebida). Devuelve la linea completa con LF.
 * - Sin formato: devuelve el texto tal cual (regresion cero).
 * - Con alineacion centro/derecha: agrega padding por espacios (compatible con
 *   impresoras que no soportan ESC a) ademas del comando.
 */
function aplicarFormatoTexto(fmt, texto, width = LINE_LENGTH) {
    if (fmt?.alineacion === 'centro')
        texto = centerVisible(texto, width);
    else if (fmt?.alineacion === 'derecha')
        texto = rightVisible(texto, width);
    const { antes, despues } = comandosFormato(fmt);
    return antes.join('') + texto + LF + despues.join('');
}
/**
 * Linea `label: valor` con formato opcional.
 * Sin formato reproduce el patron natural de los campos del documento:
 * label en negrita + ": " + valor (regresion cero).
 * Con `negrita: true` toda la linea va en negrita; con `false`, sin negrita.
 */
function lineaConFormato(fmt, label, valor, width = LINE_LENGTH) {
    const texto = fmt?.negrita === true
        ? CMD_BOLD_ON + label + CMD_BOLD_OFF + ': ' + valor
        : label + ': ' + valor;
    return aplicarFormatoTexto(fmt, texto, width);
}
/**
 * Version dual de lineaConFormato que permite formato independiente
 * para el label y para el valor (fmtLabel, fmtValor).
 */
function lineaConFormatoDual(fmt, fmtLabel, fmtValor, label, valor, width = LINE_LENGTH) {
    const w = Math.max(1, width);
    if (fmtLabel || fmtValor) {
        let lblPart = label + ': ';
        if (fmtLabel?.negrita === true)
            lblPart = CMD_BOLD_ON + lblPart + CMD_BOLD_OFF;
        else if (fmtLabel?.negrita === false)
            lblPart = CMD_BOLD_OFF + lblPart;
        let valPart = valor;
        if (fmtValor?.negrita === true)
            valPart = CMD_BOLD_ON + valPart + CMD_BOLD_OFF;
        else if (fmtValor?.negrita === false)
            valPart = CMD_BOLD_OFF + valPart;
        return aplicarFormatoTexto(fmt, lblPart + valPart, w);
    }
    return lineaConFormato(fmt, label, valor, w);
}
/**
 * Padding por espacios segun la alineacion (para textos libres, que no tienen
 * comandos embebidos). Izquierda devuelve el texto sin padding.
 */
function padLinea(texto, alineacion, width = LINE_LENGTH) {
    if (alineacion === 'centro')
        return center(texto, width);
    if (alineacion === 'derecha')
        return right(texto, width);
    return texto;
}
/**
 * Linea tabulada con tracking de estado ESC/POS via Ctx.
 * `label:` + padding a `ancho` + valor. Actualiza ctx para no heredar estado sucio.
 * Empuja directamente a ctx.p (void).
 */
function lineaTabular(ctx, label, valor, ancho, fmtLabel, fmtValor) {
    // Label format
    if (fmtLabel) {
        if (fmtLabel.negrita !== undefined)
            _bo(ctx, fmtLabel.negrita);
        if (fmtLabel.tamano === 'condensada')
            _co(ctx, true);
        else if (fmtLabel.tamano === 'doble')
            ctx.p.push(CMD_SIZE_DOUBLE);
        else if (fmtLabel.tamano === 'doble_b')
            ctx.p.push(CMD_FONT_B + CMD_SIZE_DOUBLE);
        else if (fmtLabel.tamano === 'doble_altura')
            ctx.p.push(CMD_SIZE_DOUBLE_ALTURA);
        else if (fmtLabel.tamano === 'doble_ancho')
            ctx.p.push(CMD_SIZE_DOUBLE_ANCHO);
        else if (fmtLabel.tamano === 'triple')
            ctx.p.push(CMD_SIZE_TRIPLE);
    }
    ctx.p.push(right(label + ':', ancho));
    if (fmtLabel) {
        if (fmtLabel.tamano === 'doble' || fmtLabel.tamano === 'doble_altura' || fmtLabel.tamano === 'doble_ancho' || fmtLabel.tamano === 'triple')
            ctx.p.push(CMD_SIZE_NORMAL);
        else if (fmtLabel.tamano === 'doble_b')
            ctx.p.push(CMD_SIZE_NORMAL + CMD_FONT_A);
        if (fmtLabel.tamano === 'condensada')
            _co(ctx, false);
        if (fmtLabel.negrita !== undefined)
            _bo(ctx, false);
    }
    // Valor format
    if (fmtValor) {
        if (fmtValor.negrita !== undefined)
            _bo(ctx, fmtValor.negrita);
        if (fmtValor.tamano === 'condensada')
            _co(ctx, true);
        else if (fmtValor.tamano === 'doble')
            ctx.p.push(CMD_SIZE_DOUBLE);
        else if (fmtValor.tamano === 'doble_b')
            ctx.p.push(CMD_FONT_B + CMD_SIZE_DOUBLE);
        else if (fmtValor.tamano === 'doble_altura')
            ctx.p.push(CMD_SIZE_DOUBLE_ALTURA);
        else if (fmtValor.tamano === 'doble_ancho')
            ctx.p.push(CMD_SIZE_DOUBLE_ANCHO);
        else if (fmtValor.tamano === 'triple')
            ctx.p.push(CMD_SIZE_TRIPLE);
    }
    ctx.p.push(valor);
    if (fmtValor) {
        if (fmtValor.tamano === 'doble' || fmtValor.tamano === 'doble_altura' || fmtValor.tamano === 'doble_ancho' || fmtValor.tamano === 'triple')
            ctx.p.push(CMD_SIZE_NORMAL);
        else if (fmtValor.tamano === 'doble_b')
            ctx.p.push(CMD_SIZE_NORMAL + CMD_FONT_A);
        if (fmtValor.tamano === 'condensada')
            _co(ctx, false);
        if (fmtValor.negrita !== undefined)
            _bo(ctx, false);
    }
}
/**
 * Version sin Ctx para callers que no tienen contexto (ej. renderCampoFPV).
 * Solo formatea el texto sin comandos de formato embebidos.
 */
function lineaTabularStr(label, valor, ancho) {
    const anchoLabel = label.length + 1; // +1 para el ':'
    const columnaValor = Math.max(anchoLabel + 2, ancho); // +2 para ': '
    return right(label + ':', anchoLabel) + ' '.repeat(columnaValor - anchoLabel) + valor;
}
/**
 * Version de lineaTabular que retorna string (sin Ctx), con soporte
 * de formato dual (fmtLabel/fmtValor) para usar desde renderCampoFPV.
 */
function lineaTabularConFormato(label, valor, ancho, fmtLabel, fmtValor) {
    let lblPart = label + ':';
    if (fmtLabel?.negrita === true)
        lblPart = CMD_BOLD_ON + lblPart + CMD_BOLD_OFF;
    else if (fmtLabel?.negrita === false)
        lblPart = CMD_BOLD_OFF + lblPart;
    let valPart = valor;
    if (fmtValor?.negrita === true)
        valPart = CMD_BOLD_ON + valPart + CMD_BOLD_OFF;
    else if (fmtValor?.negrita === false)
        valPart = CMD_BOLD_OFF + valPart;
    const anchoLabel = largoVisible(lblPart);
    const columnaValor = Math.max(anchoLabel + 2, ancho); // +2 para ': '
    return rightVisible(lblPart, anchoLabel) + ' '.repeat(columnaValor - anchoLabel) + valPart;
}
/**
 * Emite una linea de total (label + monto) con formato. Sin formato usa el
 * patron natural (alineado a la derecha, regresion cero). Con formato respeta
 * la alineacion configurada.
 */
function emitirTotalLinea(parts, fmt, label, amount, width) {
    let texto;
    if (fmt?.alineacion === 'centro')
        texto = centerVisible(label + ' ' + amount, width);
    else if (fmt?.alineacion === 'derecha')
        texto = rightVisible(label + ' ' + amount, width);
    else if (fmt?.alineacion === 'izquierda')
        texto = left(label + ' ' + amount, width);
    else
        texto = formatTotalLine(label, amount, width);
    if (!fmt) {
        parts.push(texto + LF);
        return;
    }
    const { antes, despues } = comandosFormato(fmt);
    parts.push(...antes);
    parts.push(texto + LF);
    parts.push(...despues);
}
/** Emite los marcadores especiales (ESPACIO/SEPARADOR/LIBRE/DTO/FIRMA). Devuelve true si lo proceso. */
function emitirItemEspecial(parts, item, data, width, textosLibres, camposDTO, tabular, mismaLinea, firmas) {
    if (item === 'ESPACIO') {
        parts.push(' ' + LF);
        return true;
    }
    if (item === 'SEPARADOR') {
        parts.push(lineSep('-', width) + LF);
        return true;
    }
    if (item.startsWith('LIBRE:')) {
        const libre = textosLibres?.[item.slice('LIBRE:'.length)];
        if (libre) {
            // Configs legacy guardan el texto como string plano: se migra al formato
            // historico (centrado + negrita) para regresion cero.
            const conf = typeof libre === 'string'
                ? { texto: libre, alineacion: 'centro', negrita: true, tamano: 'normal' }
                : libre;
            const fmt = {
                alineacion: conf.alineacion ?? 'centro',
                negrita: conf.negrita ?? true,
                tamano: conf.tamano ?? 'normal',
            };
            if (mismaLinea) {
                // Sin padding ni comandos de formato: solo el texto crudo (con wrap)
                for (const seg of wrapTexto(conf.texto, width)) {
                    parts.push(seg + LF);
                }
            }
            else {
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
    if (item.startsWith('DTO:')) {
        const def = camposDTO?.[item.slice('DTO:'.length)];
        if (def) {
            const valor = formatearValorDTO(resolverRuta(data, def.ruta), def.tipo);
            if (tabular) {
                parts.push(lineaTabularStr(def.label || item, valor, tabular.ancho ?? 12) + LF);
            }
            else {
                parts.push(lineaConFormato(def, def.label || item, valor, width));
            }
        }
        return true;
    }
    if (item.startsWith('FIRMA:')) {
        const firma = firmas?.[item.slice('FIRMA:'.length)];
        if (firma) {
            const texto = firma.texto || 'Firma autorizada';
            if (firma.linea === 'arriba') {
                parts.push(lineSep('-', width) + LF);
                parts.push(padLinea(texto, 'centro', width - 2) + LF);
            }
            else {
                const anchoLinea = Math.max(1, width - 2 - texto.length - 1);
                parts.push(padLinea(texto + ' ' + lineSep('-', anchoLinea), 'centro', width - 2) + LF);
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
    // Translate AlineacionTicket (Spanish) to internal English
    let al;
    switch (a) {
        case 'izquierda':
            al = 'left';
            break;
        case 'centro':
            al = 'center';
            break;
        case 'derecha':
            al = 'right';
            break;
        default: al = a;
    }
    if (!ctx.forceAl && ctx.al === al)
        return;
    ctx.forceAl = false;
    ctx.al = al;
    ctx.p.push(al === 'center' ? CMD_ALIGN_CENTER : al === 'right' ? CMD_ALIGN_RIGHT : CMD_ALIGN_LEFT);
}
function _bo(ctx, b) { if (ctx.bo !== b) {
    ctx.bo = b;
    ctx.p.push(b ? CMD_BOLD_ON : CMD_BOLD_OFF);
} }
function _co(ctx, c) { if (ctx.co !== c) {
    ctx.co = c;
    ctx.p.push(c ? CMD_CONDENSED : CMD_SIZE_NORMAL);
} }
function _aplicarFmt(ctx, fmt) {
    if (!fmt)
        return;
    if (fmt.alineacion)
        _al(ctx, fmt.alineacion);
    if (fmt.negrita !== undefined)
        _bo(ctx, fmt.negrita);
    if (fmt.tamano === 'condensada')
        _co(ctx, true);
    else if (fmt.tamano === 'doble') {
        ctx.p.push(CMD_SIZE_DOUBLE);
    }
    else if (fmt.tamano === 'doble_b') {
        ctx.p.push(CMD_FONT_B + CMD_SIZE_DOUBLE);
    }
    else if (fmt.tamano === 'doble_altura') {
        ctx.p.push(CMD_SIZE_DOUBLE_ALTURA);
    }
    else if (fmt.tamano === 'doble_ancho') {
        ctx.p.push(CMD_SIZE_DOUBLE_ANCHO);
    }
    else if (fmt.tamano === 'triple') {
        ctx.p.push(CMD_SIZE_TRIPLE);
    }
}
function _restaurarFmt(ctx, fmt) {
    if (!fmt)
        return;
    if (fmt.negrita !== undefined)
        _bo(ctx, false);
    if (fmt.tamano === 'condensada')
        _co(ctx, false);
    if (fmt.tamano === 'doble' || fmt.tamano === 'doble_altura' || fmt.tamano === 'doble_ancho' || fmt.tamano === 'triple')
        ctx.p.push(CMD_SIZE_NORMAL);
    else if (fmt.tamano === 'doble_b')
        ctx.p.push(CMD_SIZE_NORMAL + CMD_FONT_A);
}
function _emitirSep(ctx, linea) {
    const rawChar = linea.caracter || '-';
    const margen = linea.margen || 0;
    // NO convertir '-' a '_': el guion queda centrado en la celda (sin gap).
    // '_' se mantiene como opcion explicita para separador pegado abajo.
    // '─' (Unicode) se mapea a '_' para compatibilidad ASCII.
    // 'linea' / 'linea_gruesa' usan subrayado ESC- sobre espacios (linea solida).
    const char = rawChar === '─' ? '_' : rawChar === '═' ? '=' : rawChar;
    // Consumir forceAl: el codigo viejo siempre emite ALIGN_LEFT entre secciones
    if (ctx.forceAl)
        _al(ctx, 'left');
    _aplicarFmt(ctx, linea.formato);
    // Margen superior
    if (margen > 0)
        ctx.p.push(CMD_J + String.fromCharCode(margen));
    // Calcular ancho del separador (full o parcial)
    let sepWidth = ctx.w;
    const anchoCfg = linea.ancho;
    if (typeof anchoCfg === 'number' && anchoCfg > 0) {
        sepWidth = Math.min(anchoCfg, ctx.w);
    }
    else if (typeof anchoCfg === 'string' && anchoCfg.endsWith('%')) {
        const pct = parseInt(anchoCfg, 10);
        if (!isNaN(pct))
            sepWidth = Math.max(1, Math.floor(ctx.w * pct / 100));
    }
    // Alineacion horizontal del separador parcial
    const alSep = linea.alineacionSep;
    let padIzq = 0;
    if (sepWidth < ctx.w) {
        if (alSep === 'derecha') {
            padIzq = ctx.w - sepWidth;
        }
        else if (alSep === 'izquierda') {
            padIzq = 0;
        }
        else {
            // Default: centro
            padIzq = Math.floor((ctx.w - sepWidth) / 2);
        }
    }
    // Grosor: cantidad de lineas para linea/linea_gruesa (1-3, default 1)
    const grosor = Math.max(1, Math.min(3, linea.grosor ?? 1));
    if (char === 'linea' || char === 'linea_gruesa') {
        // Linea solida via subrayado ESC- sobre espacios
        const underlineCmd = char === 'linea_gruesa' ? (ESC + '-' + '\x02') : (ESC + '-' + '\x01');
        const padDer = ctx.w - sepWidth - padIzq;
        const lineContent = underlineCmd + ' '.repeat(padIzq) + ' '.repeat(sepWidth) + ' '.repeat(padDer) + CMD_UNDERLINE_OFF;
        for (let g = 0; g < grosor; g++) {
            ctx.p.push(lineContent + LF);
        }
        // Feed posterior para balancear el gap (no quede pegado al campo siguiente)
        ctx.p.push(CMD_J + '\x06');
    }
    else {
        const sep = char.repeat(sepWidth);
        const sepLine = ' '.repeat(padIzq) + sep + ' '.repeat(ctx.w - sepWidth - padIzq);
        for (let g = 0; g < grosor; g++) {
            ctx.p.push(sepLine + LF);
        }
    }
    // Restaurar bold/condensed si el formato los especifico (para no heredar a la sig. linea)
    if (linea.formato?.negrita !== undefined)
        _bo(ctx, false);
    if (linea.formato?.tamano === 'condensada')
        _co(ctx, false);
    // Margen inferior
    if (margen > 0)
        ctx.p.push(CMD_J + String.fromCharCode(margen));
}
function _emitirEspacio(ctx) {
    if (ctx.forceAl)
        _al(ctx, 'left');
    ctx.p.push(' ' + LF);
}
// ===== Factura POS (basado en zonas) =====
function renderDetalleCampo(clave, det) {
    switch (clave) {
        case 'CODIGO': return String(det.codigo || '').slice(0, 10);
        case 'ARTICULO': return String(det.articulo || '--');
        case 'CANTIDAD': return formatMoney(Number(det.cantidad || 0));
        case 'PRECIO': return formatMoney(Number(det.precio || 0));
        case 'ITBIS': return formatMoney(Number(det.impuestos || 0));
        case 'TOTAL': return formatMoney(Number(det.total || 0));
        default: {
            // Intentar resolver la clave como ruta en el objeto (para arrayOrigen dinámico).
            // Probar la clave tal cual y luego en minúsculas.
            const valor = resolverRuta(det, clave) ?? resolverRuta(det, clave.toLowerCase());
            if (valor !== undefined && valor !== null) {
                if (typeof valor === 'number')
                    return formatMoney(valor);
                return String(valor);
            }
            return '--';
        }
    }
}
function renderDetalleCampoFRI(clave, det) {
    switch (clave) {
        case 'DOCUMENTO': return String(det.documento || '--');
        case 'MONTO_ORIG': return formatMoney(Number(det.montoOriginal || 0));
        case 'PAGADO': return formatMoney(Number(det.pagado || 0));
        case 'APLICADO': return formatMoney(Number(det.monto || 0));
        default: {
            // Intentar resolver la clave como ruta en el objeto (para arrayOrigen dinámico).
            const valor = resolverRuta(det, clave) ?? resolverRuta(det, clave.toLowerCase());
            if (valor !== undefined && valor !== null) {
                if (typeof valor === 'number')
                    return formatMoney(valor);
                return String(valor);
            }
            return '--';
        }
    }
}
/**
 * Aplica el motor de expresiones ({...}) sobre la configuracion de plantilla
 * antes de normalizarla. Ante cualquier error devuelve la config original
 * (retrocompatibilidad total).
 */
function aplicarExpresiones(config, data, company) {
    if (!config)
        return config;
    try {
        const ctx = { data, company, config };
        return (0, expresiones_1.evaluarObjeto)(config, ctx);
    }
    catch {
        return config;
    }
}
function formatTicketPOS(data, company, config) {
    const cfg = (0, ticketPlantillaConfig_1.normalizarConfig)(aplicarExpresiones(config, data, company));
    const width = cfg.opciones?.anchoLinea ?? LINE_LENGTH;
    const zonas = cfg.zonas || [];
    const tot = cfg.totales || {};
    const cob = cfg.cobros || {};
    const pie = cfg.pie?.textoPie || '** GRACIAS POR SU COMPRA **';
    const companyName = company?.nombre || data?.sucursal?.nombre || 'SU EMPRESA';
    const tituloTexto = cfg.titulo?.texto || 'FACTURA AL CONTADO';
    const textosLibres = cfg.textosLibres || cfg.campos?.textosLibres;
    const camposDTO = cfg.camposDTO || cfg.campos?.camposDTO;
    const firmas = cfg.firmas;
    const ctx = { p: [], w: width, al: 'left', bo: false, co: false, forceAl: false };
    ctx.p.push(CMD_INIT + CMD_NORMALIZAR);
    let maxLabelLenTotales = 0;
    let maxValorLenTotales = 0;
    let maxLabelLenCobros = 0;
    let maxValorLenCobros = 0;
    data.COMPANIA = companyName;
    data.DIRECCION = company?.direccion || '';
    data.TELEFONO = company?.telefono || '';
    data.RNC = company?.rnc || '';
    data.FAX = company?.fax || '';
    data.SLOGAN = company?.slogan || '';
    data.TITULO = tituloTexto;
    function emitirLinea(linea) {
        if (linea.ref === 'SEPARADOR') {
            _emitirSep(ctx, linea);
            return;
        }
        if (linea.ref === 'ESPACIO') {
            _emitirEspacio(ctx);
            return;
        }
        if (linea.ref.startsWith('LIBRE:') || linea.ref.startsWith('DTO:') || linea.ref.startsWith('FIRMA:')) {
            emitirItemEspecial(ctx.p, linea.ref, data, width, textosLibres, camposDTO, linea.tabular, linea.mismaLinea, firmas);
            return;
        }
        const ref = linea.ref;
        const lblOv = linea.label;
        const fmtOv = linea.formato;
        const fmtLabel = linea.formatoLabel || linea.formato;
        const fmtValor = linea.formatoValor;
        if (ref.startsWith('CAMPO:')) {
            const clave = ref.slice(6);
            switch (clave) {
                case 'CODIGO_QR': {
                    _aplicarFmt(ctx, fmtOv);
                    const qrRender = renderCampoFPV(clave, data, lblOv, fmtOv, width, linea.tabular, linea.mostrarLabel, fmtLabel, fmtValor, linea.ruta);
                    if (qrRender)
                        ctx.p.push(qrRender);
                    _restaurarFmt(ctx, fmtOv);
                    ctx.p.push(CMD_INIT + CMD_NORMALIZAR); // Resetear impresora despues del QR (evita corrupcion de estado)
                    ctx.al = 'left';
                    ctx.bo = false;
                    ctx.co = false; // Sincronizar Ctx
                    break;
                }
                case 'CODIGO_BARRAS': {
                    // Aplicar alineacion (por defecto centrado) antes del barcode; el barcode
                    // no lleva formato de texto, pero si respeta la alineacion de la linea.
                    const fmtBc = { ...(fmtOv || {}), alineacion: fmtOv?.alineacion || 'centro' };
                    _aplicarFmt(ctx, fmtBc);
                    const bcRender = renderCampoFPV(clave, data, lblOv, fmtOv, width, linea.tabular, linea.mostrarLabel, fmtLabel, fmtValor, linea.ruta);
                    if (bcRender)
                        ctx.p.push(bcRender);
                    _restaurarFmt(ctx, fmtOv);
                    ctx.p.push(CMD_INIT + CMD_NORMALIZAR); // Resetear impresora despues del barcode
                    ctx.al = 'left';
                    ctx.bo = false;
                    ctx.co = false; // Sincronizar Ctx
                    break;
                }
                default: {
                    const render = renderCampoFPV(clave, data, lblOv, fmtOv, width, linea.tabular, linea.mostrarLabel, fmtLabel, fmtValor, linea.ruta);
                    if (render)
                        ctx.p.push(render);
                    _restaurarFmt(ctx, fmtOv);
                    break;
                }
            }
            return;
        }
        if (ref.startsWith('TOTAL:')) {
            const clave = ref.slice(6);
            const tieneTab = !!linea.tabular;
            // Mismo contrato que CAMPO:: combina formatoLabel + formatoValor + formato
            // para que tamano/negrita por linea si se apliquen en totales.
            const fmtCombTot = { ...(linea.formatoLabel || {}), ...(linea.formatoValor || {}), ...(fmtOv || {}) };
            const fmtSinAlineacion = { ...fmtCombTot, alineacion: undefined };
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
                        lineaTabular(ctx, '', monto, tabAn, undefined, linea.formatoValor || fmtOv);
                        ctx.p.push(LF);
                    }
                    else {
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
                    const texto = right(lbl, anchoLabel) + ':  ' + ' '.repeat(columnaValor - anchoLabel - 3) + right(monto, maxValorLenTotales);
                    // Alineacion por linea: formatoLabel > formatoValor > formato > zona.
                    const alineacion = linea.formatoLabel?.alineacion || linea.formatoValor?.alineacion || linea.formato?.alineacion || zonaActualAlineacion;
                    if (alineacion === 'izquierda') {
                        ctx.p.push(texto + LF);
                    }
                    else if (alineacion === 'centro') {
                        ctx.p.push(centerVisible(texto, width) + LF);
                    }
                    else {
                        ctx.p.push(rightVisible(texto, width) + LF);
                    }
                }
                else {
                    const texto = right(lbl, maxLabelLenTotales) + ':  ' + right(monto, maxValorLenTotales);
                    const alineacion = linea.formatoLabel?.alineacion || linea.formatoValor?.alineacion || linea.formato?.alineacion || zonaActualAlineacion;
                    if (alineacion === 'izquierda') {
                        ctx.p.push(texto + LF);
                    }
                    else if (alineacion === 'centro') {
                        ctx.p.push(centerVisible(texto, width) + LF);
                    }
                    else {
                        // default: derecha (para totales)
                        ctx.p.push(rightVisible(texto, width) + LF);
                    }
                }
            };
            switch (clave) {
                case 'TOTAL_GRAVADO':
                    if (tot.mostrarGravado === false)
                        return;
                    emitirTotal('Total Gravado', formatMoney(totalGravado));
                    break;
                case 'SUBTOTAL':
                    if (tot.mostrarSubtotal === false)
                        return;
                    emitirTotal('Subtotal', formatMoney(totalGravado));
                    break;
                case 'ITBIS':
                    if (tot.mostrarItbis === false)
                        return;
                    emitirTotal('Itbis', formatMoney(itbis));
                    break;
                case 'DESCUENTO':
                    if (tot.mostrarDescuento === false || descuento <= 0)
                        return;
                    emitirTotal('Descuento', formatMoney(descuento));
                    break;
                case 'TOTAL_EXENTO':
                    emitirTotal('Total Exento', formatMoney(totalExento));
                    break;
                case 'TOTAL':
                    emitirTotal('Total', formatMoney(data.total));
                    break;
            }
            _restaurarFmt(ctx, fmtSinAlineacion);
            return;
        }
        if (ref.startsWith('COBRO:')) {
            // Mismo contrato que CAMPO:: combina formatoLabel + formatoValor + formato
            // para que tamano/negrita por linea si se apliquen (antes se ignoraban y
            // la condensada configurada en cobros no salia).
            const fmtCombCobro = { ...(linea.formatoLabel || {}), ...(linea.formatoValor || {}), ...(fmtOv || {}), alineacion: undefined };
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
            const columnaInfo = linea.mismaLinea ? detectarColumnaEnGrupo(lineas, idx) : null;
            const flexWidthLocal = columnaInfo?.izquierda ?? 0;
            const prevLen = ctx.p.length;
            emitirLinea(linea);
            const nuevas = ctx.p.splice(prevLen);
            if (linea.mismaLinea) {
                if (columnaInfo && linea.columna) {
                    // ── Columna derecha: alinear al ancho fijo de la columna derecha ──
                    const limpio = nuevas.join('').replace(/\x1Ba[\x00-\x02]/g, '').replace(/\n/g, ' ');
                    const textoTrim = trimVisible(limpio);
                    buffer.push(rightVisible(textoTrim, columnaInfo.derecha));
                    anchoAcumulado += columnaInfo.derecha;
                }
                else if (columnaInfo && !linea.columna) {
                    // ── Flex item: truncar al ancho de la columna izquierda ──
                    for (let i = 0; i < nuevas.length; i++) {
                        const str = nuevas[i].replace(/\n/g, ' ');
                        const vis = trimVisible(str);
                        if (largoVisible(vis) > flexWidthLocal && flexWidthLocal > 0) {
                            nuevas[i] = vis.substring(0, flexWidthLocal);
                        }
                    }
                    buffer.push(...nuevas);
                    anchoAcumulado += Math.min(largoVisible(nuevas.join('')), flexWidthLocal);
                }
                else {
                    // ── Sin columna: comportamiento original ──
                    const alineacion = linea.formatoLabel?.alineacion || linea.formato?.alineacion || zonaActualAlineacion;
                    const unido = nuevas.join('');
                    if ((alineacion === 'centro' || alineacion === 'derecha') && /\x1Ba[\x00-\x02]/.test(unido)) {
                        const limpio = unido.replace(/\x1Ba[\x00-\x02]/g, '').replace(/\n/g, ' ');
                        const textoTrim = trimVisible(limpio);
                        const disponible = Math.max(1, width - anchoAcumulado);
                        const segmento = alineacion === 'centro'
                            ? centerVisible(textoTrim, disponible)
                            : rightVisible(textoTrim, disponible);
                        buffer.push(segmento);
                        anchoAcumulado += largoVisible(segmento);
                    }
                    else {
                        for (let i = 0; i < nuevas.length; i++) {
                            const idxN = nuevas[i].indexOf('\n');
                            if (idxN !== -1) {
                                nuevas[i] = nuevas[i].substring(0, idxN) + ' ' + nuevas[i].substring(idxN + 1);
                                break;
                            }
                        }
                        buffer.push(...nuevas);
                        anchoAcumulado += largoVisible(nuevas.join(''));
                    }
                }
            }
            else {
                if (buffer.length > 0) {
                    ctx.p.push(...buffer);
                    buffer.length = 0;
                }
                ctx.p.push(...nuevas);
                anchoAcumulado = 0;
            }
        }
        if (buffer.length > 0)
            ctx.p.push(...buffer);
    }
    // C1: Pre-computar anchoFill compartido entre cabecera_grupo_detalle y detalle
    // para garantizar que cabecera de columnas y datos queden alineados visualmente.
    const zonaCabFPV = zonas.find(z => z.tipo === 'cabecera_grupo_detalle');
    const zonaDetFPV = zonas.find(z => z.tipo === 'detalle');
    const todasDetFPV = [
        ...(zonaCabFPV?.lineas || []).filter(l => l.ref.startsWith('DETALLE:')),
        ...(zonaDetFPV?.lineas || []).filter(l => l.ref.startsWith('DETALLE:')),
    ];
    const hayTabularGlobalFPV = todasDetFPV.some(l => l.tabular);
    const anchoFillFPV = !hayTabularGlobalFPV && todasDetFPV.length > 0
        ? Math.floor(width / todasDetFPV.length)
        : 0;
    let zonaActualAlineacion;
    for (const zona of zonas) {
        switch (zona.tipo) {
            case 'encabezado_reporte':
            case 'pie_reporte':
                zonaActualAlineacion = zona.alineacion;
                if (zona.alineacion)
                    _al(ctx, zona.alineacion);
                else
                    _al(ctx, 'izquierda');
                emitirLineasConBuffer(zona.lineas);
                _bo(ctx, false);
                _co(ctx, false);
                _al(ctx, 'izquierda');
                ctx.forceAl = true;
                break;
            case 'totales': {
                zonaActualAlineacion = zona.alineacion;
                // Pre-calcular maxLabelLen y maxValorLen para alinear totales
                maxLabelLenTotales = 0;
                maxValorLenTotales = 0;
                for (const linea of zona.lineas) {
                    if (linea.ref.startsWith('TOTAL:')) {
                        const clave = linea.ref.slice(6);
                        let labelDefault = clave;
                        let valorTexto = '';
                        switch (clave) {
                            case 'TOTAL_GRAVADO':
                                labelDefault = 'Total Gravado';
                                valorTexto = formatMoney(Number(data.subTotal) || 0);
                                break;
                            case 'SUBTOTAL':
                                labelDefault = 'Subtotal';
                                valorTexto = formatMoney(Number(data.subTotal) || 0);
                                break;
                            case 'ITBIS':
                                labelDefault = 'Itbis';
                                valorTexto = formatMoney(Number(data.impuestos) || 0);
                                break;
                            case 'DESCUENTO':
                                labelDefault = 'Descuento';
                                valorTexto = formatMoney(Number(data.descuento) || 0);
                                break;
                            case 'TOTAL_EXENTO':
                                labelDefault = 'Total Exento';
                                valorTexto = formatMoney(Number(data.totalExento) || 0);
                                break;
                            case 'TOTAL':
                                labelDefault = 'Total';
                                valorTexto = formatMoney(Number(data.total) || 0);
                                break;
                        }
                        const lbl = linea.label || labelDefault;
                        if (lbl.length > maxLabelLenTotales)
                            maxLabelLenTotales = lbl.length;
                        if (valorTexto.length > maxValorLenTotales)
                            maxValorLenTotales = valorTexto.length;
                    }
                }
                if (zona.alineacion)
                    _al(ctx, zona.alineacion);
                else
                    _al(ctx, 'izquierda');
                emitirLineasConBuffer(zona.lineas);
                _bo(ctx, false);
                _co(ctx, false);
                _al(ctx, 'izquierda');
                ctx.forceAl = true;
                break;
            }
            case 'pie_detalle':
            case 'encabezado_pagina':
            case 'pie_pagina':
                zonaActualAlineacion = zona.alineacion;
                if (zona.alineacion)
                    _al(ctx, zona.alineacion);
                else
                    _al(ctx, 'izquierda');
                emitirLineasConBuffer(zona.lineas);
                _bo(ctx, false);
                _co(ctx, false);
                _al(ctx, 'izquierda');
                ctx.forceAl = true;
                break;
            case 'cobros': {
                zonaActualAlineacion = zona.alineacion;
                // Pre-calcular maxLabelLen y maxValorLen para alinear cobros
                maxLabelLenCobros = 0;
                maxValorLenCobros = 0;
                const crsPre = data.cobros || [];
                const cPre = crsPre.length > 0 ? crsPre[0] : null;
                for (const linea of zona.lineas) {
                    if (linea.ref.startsWith('COBRO:')) {
                        const nombre = linea.ref.slice(6);
                        const label = linea.label || nombre.replace(/_/g, ' ');
                        if (label.length > maxLabelLenCobros)
                            maxLabelLenCobros = label.length;
                        // Calcular valor
                        let valor = '';
                        if (cPre) {
                            if (nombre === 'DEVUELTA') {
                                const dev = Number(cPre.devuelta) || 0;
                                if (dev > 0.01)
                                    valor = formatMoney(dev);
                            }
                            else {
                                const mapa = {
                                    EFECTIVO: Number(cPre.efectivo) || 0,
                                    CHEQUE: Number(cPre.cheque) || 0,
                                    TARJETA_CREDITO: Number(cPre.tarjetaCredito) || 0,
                                    TARJETA_DEBITO: Number(cPre.tarjetaDebito) || 0,
                                    TRANSFERENCIA: Number(cPre.transferencia) || 0,
                                    BONO: Number(cPre.bono) || 0,
                                    TARJETA_REGALO: Number(cPre.tarjetaRegalo) || 0,
                                    NOTA_CREDITO: Number(cPre.notaCredito) || 0,
                                };
                                const monto = mapa[nombre];
                                if (monto > 0)
                                    valor = formatMoney(monto);
                            }
                        }
                        if (valor.length > maxValorLenCobros)
                            maxValorLenCobros = valor.length;
                    }
                }
                if (zona.alineacion)
                    _al(ctx, zona.alineacion);
                else
                    _al(ctx, 'izquierda');
                const tieneLineasCobro = zona.lineas.some((l) => l.ref.startsWith('COBRO:'));
                // Solo auto-emitir si la zona no tiene líneas COBRO personalizadas
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
                        if (efectivo > 0)
                            ctx.p.push(formatTotalLine('EFECTIVO', formatMoney(efectivo), width) + LF);
                        if (cheque > 0)
                            ctx.p.push(formatTotalLine('CHEQUE', formatMoney(cheque), width) + LF);
                        if (tarjetaCredito > 0)
                            ctx.p.push(formatTotalLine('TARJETA CREDITO', formatMoney(tarjetaCredito), width) + LF);
                        if (tarjetaDebito > 0)
                            ctx.p.push(formatTotalLine('TARJETA DEBITO', formatMoney(tarjetaDebito), width) + LF);
                        if (transferencia > 0)
                            ctx.p.push(formatTotalLine('TRANSFERENCIA', formatMoney(transferencia), width) + LF);
                        if (bono > 0)
                            ctx.p.push(formatTotalLine('BONO', formatMoney(bono), width) + LF);
                        if (tarjetaRegalo > 0)
                            ctx.p.push(formatTotalLine('TARJETA REGALO', formatMoney(tarjetaRegalo), width) + LF);
                        if (notaCredito > 0)
                            ctx.p.push(formatTotalLine('NOTA CREDITO', formatMoney(notaCredito), width) + LF);
                        const devuelta = Number(c.devuelta) || 0;
                        if (devuelta > 0.01) {
                            ctx.p.push(formatTotalLine('DEVUELTA', formatMoney(devuelta), width) + LF);
                        }
                    }
                }
                emitirLineasConBuffer(zona.lineas);
                _bo(ctx, false);
                _co(ctx, false);
                _al(ctx, 'izquierda');
                ctx.forceAl = true;
                break;
            }
            case 'cabecera_grupo_detalle': {
                zonaActualAlineacion = zona.alineacion;
                if (zona.alineacion)
                    _al(ctx, zona.alineacion);
                else
                    _al(ctx, 'izquierda');
                // Procesar líneas en orden: acumular DETALLE:* como cabecera de columnas
                // y emitir no-DETALLE (SEPARADOR, ESPACIO, etc.) en su posición real.
                const cabeceraPartsFPV = [];
                const flushCabFPV = () => {
                    if (cabeceraPartsFPV.length > 0) {
                        ctx.p.push(cabeceraPartsFPV.join('') + LF);
                        cabeceraPartsFPV.length = 0;
                    }
                };
                for (const linea of zona.lineas) {
                    if (linea.ref.startsWith('DETALLE:')) {
                        const clave = linea.ref.slice(8);
                        const label = linea.label || ticketPlantillaConfig_1.CAMPOS_DETALLE_LABELS[clave] || clave;
                        const anchoTabular = linea.tabular?.ancho || 0;
                        let labelFmt;
                        if (anchoTabular > 0) {
                            const al = linea.formato?.alineacion;
                            if (al === 'derecha')
                                labelFmt = right(label, anchoTabular);
                            else if (al === 'centro')
                                labelFmt = center(label, anchoTabular);
                            else
                                labelFmt = left(label, anchoTabular);
                        }
                        else if (anchoFillFPV > 0) {
                            const al = linea.formato?.alineacion;
                            if (al === 'derecha')
                                labelFmt = right(label, anchoFillFPV);
                            else if (al === 'centro')
                                labelFmt = center(label, anchoFillFPV);
                            else
                                labelFmt = left(label, anchoFillFPV);
                        }
                        else {
                            labelFmt = label;
                        }
                        const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: undefined });
                        cabeceraPartsFPV.push(antes.join('') + labelFmt + despues.join(''));
                    }
                    else {
                        // No-DETALLE: flush cabecera acumulada primero, luego emitir línea
                        flushCabFPV();
                        emitirLinea(linea);
                    }
                }
                flushCabFPV();
                _bo(ctx, false);
                _co(ctx, false);
                _al(ctx, 'izquierda');
                ctx.forceAl = true;
                break;
            }
            case 'detalle': {
                zonaActualAlineacion = zona.alineacion;
                if (zona.alineacion)
                    _al(ctx, zona.alineacion);
                else
                    _al(ctx, 'izquierda');
                // C1: usar anchoFillFPV compartido (calculado antes del loop de zonas)
                // Si la zona tiene arrayOrigen, iterar ese array dinámicamente (ej: impuestosFactura).
                // Si no, usar data.detalles (comportamiento por defecto).
                const detalles = zona.arrayOrigen
                    ? resolverRuta(data, zona.arrayOrigen) || generarDatosEjemploArray(zona)
                    : (data.detalles || []);
                // Detectar si alguna línea del grupo tiene columna derecha (layout flex)
                const columnaInfoFPV = detectarColumnaEnGrupo(zona.lineas, 0);
                const flexWidthFPV = columnaInfoFPV?.izquierda ?? 0;
                for (const det of detalles) {
                    const bufferLinea = [];
                    for (const linea of zona.lineas) {
                        if (!linea.ref.startsWith('DETALLE:')) {
                            // Flush buffer acumulado antes de emitir línea no-DETALLE (SEPARADOR, ESPACIO, etc.)
                            if (bufferLinea.length > 0) {
                                ctx.p.push(...bufferLinea, LF);
                                bufferLinea.length = 0;
                            }
                            emitirLinea(linea);
                            continue;
                        }
                        const clave = linea.ref.slice(8);
                        const valor = renderDetalleCampo(clave, det);
                        const texto = linea.mostrarLabel !== false
                            ? (linea.label || ticketPlantillaConfig_1.CAMPOS_DETALLE_LABELS[clave] || clave) + ': ' + valor
                            : valor;
                        const anchoTabularFPV = linea.tabular?.ancho || 0;
                        if (anchoTabularFPV > 0 || (columnaInfoFPV && linea.mismaLinea)) {
                            // Tabular clásico o columna flex-right: usar ancho fijo del campo
                            const esColumna = !!linea.columna;
                            const alineacion = linea.formato?.alineacion;
                            let anchoUsar;
                            if (esColumna) {
                                anchoUsar = columnaInfoFPV.derecha;
                            }
                            else if (columnaInfoFPV && linea.mismaLinea) {
                                anchoUsar = flexWidthFPV; // flex: ancho de la columna izquierda
                            }
                            else {
                                anchoUsar = anchoTabularFPV;
                            }
                            let textoPad;
                            if (esColumna && alineacion !== 'izquierda') {
                                // Columna derecha: siempre alinear al ancho asignado
                                textoPad = rightVisible(texto, anchoUsar);
                            }
                            else if (alineacion === 'derecha') {
                                textoPad = rightVisible(texto, anchoUsar);
                            }
                            else if (alineacion === 'centro') {
                                textoPad = centerVisible(texto, anchoUsar);
                            }
                            else {
                                textoPad = leftVisible(texto, anchoUsar);
                            }
                            const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: undefined });
                            const formateado = antes.join('') + textoPad + despues.join('');
                            if (linea.mismaLinea) {
                                // Con columna flex: sin espacio entre items (ya están dimensionados)
                                if (bufferLinea.length > 0 && !columnaInfoFPV)
                                    bufferLinea.push(' ');
                                bufferLinea.push(formateado);
                            }
                            else {
                                if (bufferLinea.length > 0) {
                                    ctx.p.push(...bufferLinea, LF);
                                    bufferLinea.length = 0;
                                }
                                ctx.p.push(formateado, LF);
                            }
                        }
                        else if (anchoFillFPV > 0) {
                            // Auto-fill: cuando NO hay tabular, las lineas DETALLE:* se distribuyen
                            // con ancho proporcional. Respeta mismaLinea:
                            //   true  → se acumula en bufferLinea (varias columnas en una fila)
                            //   false → se emite sola con ancho width (un campo por fila completa)
                            const anchoReal = columnaInfoFPV && linea.mismaLinea ? flexWidthFPV : anchoFillFPV;
                            const al = linea.formato?.alineacion;
                            let textoPad;
                            if (al === 'derecha')
                                textoPad = rightVisible(texto, anchoReal);
                            else if (al === 'centro')
                                textoPad = centerVisible(texto, anchoReal);
                            else
                                textoPad = leftVisible(texto, anchoReal);
                            const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: undefined });
                            const formateado = antes.join('') + textoPad + despues.join('');
                            if (linea.mismaLinea) {
                                if (bufferLinea.length > 0 && !columnaInfoFPV)
                                    bufferLinea.push(' ');
                                bufferLinea.push(formateado);
                            }
                            else {
                                if (bufferLinea.length > 0) {
                                    ctx.p.push(...bufferLinea, LF);
                                    bufferLinea.length = 0;
                                }
                                ctx.p.push(formateado, LF);
                            }
                        }
                        else {
                            const al = linea.formato?.alineacion;
                            const anchoReal = columnaInfoFPV && linea.mismaLinea ? flexWidthFPV : width;
                            let textoPad;
                            if (al === 'derecha')
                                textoPad = rightVisible(texto, anchoReal);
                            else if (al === 'centro')
                                textoPad = centerVisible(texto, anchoReal);
                            else
                                textoPad = leftVisible(texto, anchoReal);
                            const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: undefined });
                            const formateado = antes.join('') + textoPad + despues.join('');
                            if (linea.mismaLinea) {
                                if (bufferLinea.length > 0 && !columnaInfoFPV)
                                    bufferLinea.push(' ');
                                bufferLinea.push(formateado);
                            }
                            else {
                                if (bufferLinea.length > 0) {
                                    ctx.p.push(...bufferLinea, LF);
                                    bufferLinea.length = 0;
                                }
                                ctx.p.push(formateado, LF);
                            }
                        }
                    }
                    if (bufferLinea.length > 0) {
                        ctx.p.push(...bufferLinea, LF, CMD_J + '\x08');
                    }
                }
                break;
            }
            case 'banda': {
                zonaActualAlineacion = zona.alineacion;
                if (zona.alineacion)
                    _al(ctx, zona.alineacion);
                else
                    _al(ctx, 'izquierda');
                emitirLineasConBuffer(zona.lineas);
                _bo(ctx, false);
                _co(ctx, false);
                _al(ctx, 'izquierda');
                ctx.forceAl = true;
                break;
            }
        }
    }
    ctx.p.push(LF);
    return ctx.p.join('');
}
/** Renderiza un campo estandar FPV con label editable y formato. */
function renderCampoFPV(clave, data, lblOv, fmtOv, width, tabular, mostrarLabel, fmtLabel, // NUEVO
fmtValor, // NUEVO
ruta) {
    const w = width ?? LINE_LENGTH;
    const defaultLabels = {
        NCF: 'NCF', TIPO_COMP: 'TIPO COMP', CAJERO: 'CAJERO', CAJA: 'CAJA',
        TURNO: 'TURNO', FECHA: 'FECHA', HORA: 'HORA', NO: 'NO',
        CLIENTE: 'CLIENTE', RNC_CLIENTE: 'RNC CLIENTE',
        COMPANIA: 'Compañía', DIRECCION: 'Dirección', TELEFONO: 'Teléfono', RNC: 'RNC',
        FAX: 'Fax', SLOGAN: 'Slogan',
        FECHA_VENCIMIENTO_NCF: 'Vence', SECUENCIA_NCF: 'Secuencia NCF',
        CODIGO_SEGURIDAD: 'Código de Seguridad',
        FECHA_FIRMA_DIGITAL: 'Fecha Firma Digital',
    };
    const lbl = (lblOv !== undefined && lblOv !== '' && lblOv !== defaultLabels[clave])
        ? lblOv : (defaultLabels[clave] || clave);
    const fmt = fmtOv;
    function val() {
        switch (clave) {
            case 'NCF': return data.ncf || '--';
            case 'TIPO_COMP': return data.transaccionNCF?.nombreTipoComprobante
                || data.secuenciaNCF?.nombreTipoComprobante || '--';
            case 'CAJERO': return data.cajero || '--';
            case 'CAJA': return data.caja || '--';
            case 'TURNO': return data.turno || '--';
            case 'FECHA': return formatDate(data.fechaDocumento);
            case 'HORA': return formatTime(data.fechaDocumento);
            case 'NO': return data.noDocumento || '--';
            case 'CLIENTE': return data.cliente?.nombre || 'Consumidor Final';
            case 'RNC_CLIENTE': {
                const rnc = data.cliente?.identificacion || '';
                return rnc;
            }
            case 'FECHA_IMPRESION': return new Date().toLocaleString('es-DO');
            case 'HORA_IMPRESION': return new Date().toLocaleTimeString('es-DO');
            case 'NUM_DETALLES': return String(data.detalles?.length || 0);
            case 'COMPANIA': return data.COMPANIA || '--';
            case 'DIRECCION': return data.DIRECCION || '';
            case 'TELEFONO': return data.TELEFONO || '';
            case 'RNC': return data.RNC || '';
            case 'FAX': return data.FAX || '';
            case 'SLOGAN': return data.SLOGAN || '';
            case 'TITULO': return data.TITULO || '--';
            case 'FECHA_VENCIMIENTO_NCF': return formatDate(data.transaccionNCF?.fechaVencimiento);
            case 'SECUENCIA_NCF': return data.transaccionNCF?.secuencia || data.secuenciaNCF?.secuencia || '--';
            case 'CODIGO_SEGURIDAD': {
                const qrUrl = data.envioDGII?.codigoQR || data.codigoQR || '';
                if (!qrUrl)
                    return '--';
                const params = new URLSearchParams(qrUrl.split('?')[1] || '');
                return params.get('CodigoSeguridad') || '--';
            }
            case 'FECHA_FIRMA_DIGITAL': {
                const qrUrl = data.envioDGII?.codigoQR || data.codigoQR || '';
                if (qrUrl) {
                    const params = new URLSearchParams(qrUrl.split('?')[1] || '');
                    const fechaFirma = params.get('FechaFirma');
                    if (fechaFirma)
                        return formatDate(fechaFirma);
                }
                return formatDate(data.envioDGII?.fechaEnvio) || '--';
            }
            default: return '--';
        }
    }
    // CODIGO_QR: no es un campo de texto, emite comandos QR directamente
    if (clave === 'CODIGO_QR') {
        const qrData = data.envioDGII?.codigoQR || data.codigoQR;
        if (!qrData)
            return null;
        return escposQRCode(qrData);
    }
    // CODIGO_BARRAS: no es un campo de texto, emite comandos GS k directamente
    if (clave === 'CODIGO_BARRAS') {
        const bcData = ruta
            ? resolverRuta(data, ruta)
            : (data.codigoBarras || data.transaccionNCF?.secuencia || data.secuenciaNCF?.secuencia);
        if (bcData === undefined || bcData === null || bcData === '')
            return null;
        return escposBarcode(String(bcData));
    }
    const v = val();
    // RNC_CLIENTE con label por defecto (solo modo NO tabular): 9 espacios + "RNC: " + valor.
    // Con tabular configurado debe caer al camino tabular para respetar la alineacion
    // de la plantilla (antes este early-return lo interceptaba siempre y se veia desplazado).
    if (clave === 'RNC_CLIENTE' && !lblOv && v !== '' && !tabular) {
        const clienteRnc = data.cliente?.identificacion || '';
        if (!clienteRnc)
            return null;
        return aplicarFormatoTexto(fmt, '         RNC: ' + clienteRnc, w);
    }
    // RNC_CLIENTE con label custom
    if (clave === 'RNC_CLIENTE' && lblOv) {
        const clienteRnc = data.cliente?.identificacion || '';
        if (!clienteRnc)
            return null;
        return lineaConFormato(fmt, lbl, clienteRnc, w);
    }
    if (v === '' || v === undefined)
        return null;
    // Si mostrarLabel es false, emitir solo el valor con el formato del valor (o label, o general)
    if (mostrarLabel === false) {
        return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
    }
    if (tabular) {
        const tabAn = tabular.ancho ?? 12;
        // Para RNC_CLIENTE tabular: usar el mismo formato de 9 espacios que el default
        if (clave === 'RNC_CLIENTE' && !lblOv) {
            const clienteRnc = data.cliente?.identificacion || '';
            if (!clienteRnc)
                return null;
            if (fmtLabel || fmtValor) {
                const fmtComb = { ...fmtLabel, ...fmtValor, ...fmt, alineacion: undefined };
                return aplicarFormatoTexto(fmtComb, lineaTabularConFormato('RNC', clienteRnc, tabAn, fmtLabel || fmt, fmtValor), w);
            }
            return aplicarFormatoTexto(fmt, lineaTabularStr('RNC', clienteRnc, tabAn) + LF, w);
        }
        if (fmtLabel || fmtValor) {
            const fmtComb = { ...fmtLabel, ...fmtValor, ...fmt, alineacion: undefined };
            return aplicarFormatoTexto(fmtComb, lineaTabularConFormato(lbl, v, tabAn, fmtLabel || fmt, fmtValor), w);
        }
        return aplicarFormatoTexto(fmt, lineaTabularStr(lbl, v, tabAn), w);
    }
    // Modo no tabular: si hay formato dual (fmtLabel o fmtValor), intercalar comandos
    if (fmtLabel || fmtValor) {
        let lblStr = lbl + ': ';
        if (fmtLabel?.negrita === true)
            lblStr = CMD_BOLD_ON + lblStr + CMD_BOLD_OFF;
        else if (fmtLabel?.negrita === false)
            lblStr = CMD_BOLD_OFF + lblStr;
        let valStr = v;
        if (fmtValor?.negrita === true)
            valStr = CMD_BOLD_ON + valStr + CMD_BOLD_OFF;
        else if (fmtValor?.negrita === false)
            valStr = CMD_BOLD_OFF + valStr;
        const texto = lblStr + valStr;
        const alineacion = fmtLabel?.alineacion || fmtValor?.alineacion || fmtOv?.alineacion;
        const fmtCombinado = { ...fmtLabel, ...fmtValor, ...fmtOv };
        if (alineacion)
            fmtCombinado.alineacion = alineacion;
        return aplicarFormatoTexto(fmtCombinado, texto, w);
    }
    if (fmt?.negrita === true || fmt?.negrita === false) {
        const texto = lbl + ': ' + v;
        return aplicarFormatoTexto(fmt, texto, w);
    }
    const texto = CMD_BOLD_ON + lbl + CMD_BOLD_OFF + ': ' + v;
    return aplicarFormatoTexto(fmt, texto, w);
}
/** Emite una linea de cobro FPV por nombre, usando la misma logica de autofill que los totales. */
function emitirCobroFPVLinea(ctx, nombre, data, cob, cfg, width, linea, maxLabelLenCobros, maxValorLenCobros, zonaActualAlineacion) {
    const crs = data.cobros || [];
    if (cob.mostrarCobros === false || crs.length === 0)
        return;
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
        NOTA_CREDITO: Number(c.notaCredito) || 0,
    };
    let monto;
    if (nombre === 'DEVUELTA') {
        monto = Number(c.devuelta) || 0;
        if (monto <= 0.01)
            return;
    }
    else {
        monto = mapa[nombre];
        if (monto <= 0)
            return;
    }
    const montoStr = formatMoney(monto);
    const label = lineaLbl || nombre.replace(/_/g, ' ');
    if (linea.mostrarLabel === false) {
        if (tieneTab) {
            lineaTabular(ctx, '', montoStr, tabAn, undefined, linea.formatoValor || fmtOv);
            ctx.p.push(LF);
        }
        else {
            _aplicarFmt(ctx, linea.formatoValor || fmtOv);
            ctx.p.push(montoStr + LF);
            _restaurarFmt(ctx, linea.formatoValor || fmtOv);
        }
        return;
    }
    if (tieneTab) {
        const anchoLabel = maxLabelLenCobros;
        const columnaValor = Math.max(anchoLabel + 3, tabAn);
        const texto = right(label, anchoLabel) + ':  ' + ' '.repeat(columnaValor - anchoLabel - 3) + right(montoStr, maxValorLenCobros);
        // Alineacion por linea: formatoLabel > formatoValor > formato > zona.
        const alineacion = linea.formatoLabel?.alineacion || linea.formatoValor?.alineacion || linea.formato?.alineacion || zonaActualAlineacion;
        if (alineacion === 'izquierda') {
            ctx.p.push(texto + LF);
        }
        else if (alineacion === 'centro') {
            ctx.p.push(centerVisible(texto, width) + LF);
        }
        else {
            ctx.p.push(rightVisible(texto, width) + LF);
        }
    }
    else {
        const texto = right(label, maxLabelLenCobros) + ':  ' + right(montoStr, maxValorLenCobros);
        const alineacion = linea.formatoLabel?.alineacion || linea.formatoValor?.alineacion || linea.formato?.alineacion || zonaActualAlineacion;
        if (alineacion === 'izquierda') {
            ctx.p.push(texto + LF);
        }
        else if (alineacion === 'centro') {
            ctx.p.push(centerVisible(texto, width) + LF);
        }
        else {
            ctx.p.push(rightVisible(texto, width) + LF);
        }
    }
}
// ===== Recibo Ingreso (basado en zonas) =====
/**
 * Renderiza un campo estandar FRI con label editable y formato.
 * Los campos FRI usan espaciados fijos (NCF+9esp, FECHA+7esp, ENTIDAD+4esp, etc).
 */
function renderCampoFRI(clave, data, lblOv, fmtOv, width, mostrarLabel, fmtLabel, // NUEVO
fmtValor // NUEVO
) {
    const w = width ?? LINE_LENGTH;
    const fmt = fmtOv;
    // Labels por defecto FRI
    const defLabels = {
        NCF: 'NCF', FECHA: 'FECHA', TIPO: 'Tipo', CONCEPTO: 'Concepto',
        ENTIDAD: 'ENTIDAD', ENTIDAD_ID: 'ENTIDAD ID', NOTA: 'Nota',
        COMPANIA: 'Compañía', DIRECCION: 'Dirección', TELEFONO: 'Teléfono', RNC: 'RNC',
    };
    const lbl = (lblOv !== undefined && lblOv !== '' && lblOv !== defLabels[clave])
        ? lblOv : (defLabels[clave] || clave);
    switch (clave) {
        case 'COMPANIA': {
            const v = data.COMPANIA || '--';
            if (mostrarLabel === false)
                return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
            return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
        }
        case 'DIRECCION': {
            const v = data.DIRECCION;
            if (!v)
                return null;
            if (mostrarLabel === false)
                return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
            return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
        }
        case 'TELEFONO': {
            const v = data.TELEFONO;
            if (!v)
                return null;
            if (mostrarLabel === false)
                return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
            return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
        }
        case 'RNC': {
            const v = data.RNC;
            if (!v)
                return null;
            if (mostrarLabel === false)
                return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
            return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
        }
        case 'TITULO': {
            const v = data.TITULO || '--';
            if (!v || v === '--')
                return null;
            if (mostrarLabel === false)
                return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
            return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
        }
        case 'NCF':
            if (lblOv)
                return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, data.ncf || '--', w);
            return aplicarFormatoTexto(fmt, CMD_BOLD_ON + 'NCF' + CMD_BOLD_OFF + '         ' + (data.ncf || '--'), w);
        case 'FECHA':
            if (lblOv)
                return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, formatDate(data.fechaDocumento), w);
            return aplicarFormatoTexto(fmt, CMD_BOLD_ON + 'FECHA' + CMD_BOLD_OFF + '       ' + formatDate(data.fechaDocumento), w);
        case 'TIPO': {
            if (!(data.tipo?.codigo || data.tipo?.nombre))
                return null;
            const texto = (data.tipo.codigo || '') + ' ' + (data.tipo.nombre || '');
            if (lblOv)
                return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, texto, w);
            return aplicarFormatoTexto(fmt, 'Tipo: ' + texto, w);
        }
        case 'CONCEPTO': {
            if (!data.concepto?.nombre)
                return null;
            if (lblOv)
                return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, data.concepto.nombre, w);
            return aplicarFormatoTexto(fmt, 'Concepto: ' + data.concepto.nombre, w);
        }
        case 'ENTIDAD': {
            const nombre = data.entidad?.nombre || data.entidad?.razonSocial || '\u2014';
            if (lblOv)
                return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, nombre, w);
            return aplicarFormatoTexto(fmt, CMD_BOLD_ON + 'ENTIDAD' + CMD_BOLD_OFF + '    ' + nombre, w);
        }
        case 'ENTIDAD_ID': {
            const id = data.entidad?.identificacion || data.entidad?.rnc || '';
            if (!id)
                return null;
            if (lblOv)
                return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, id, w);
            return aplicarFormatoTexto(fmt, '               ' + id, w);
        }
        case 'NOTA': {
            if (!data.nota)
                return null;
            if (lblOv)
                return lineSep('-', w) + LF + lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, data.nota, w);
            return lineSep('-', w) + LF + aplicarFormatoTexto(fmt, 'Nota: ' + data.nota, w);
        }
        case 'FECHA_IMPRESION': {
            const lbl = lblOv || 'Fecha imp.';
            const v = new Date().toLocaleString('es-DO');
            return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
        }
        case 'HORA_IMPRESION': {
            const lbl = lblOv || 'Hora imp.';
            const v = new Date().toLocaleTimeString('es-DO');
            return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
        }
        case 'NUM_DETALLES': {
            const lbl = lblOv || 'Transacc.';
            const v = String(data.transaccionesAsociadas?.length || 0);
            return lineaConFormatoDual(fmt, fmtLabel, fmtValor, lbl, v, w);
        }
        default: return null;
    }
}
function formatTicketReciboIngreso(data, company, config) {
    const cfg = (0, ticketPlantillaConfig_1.normalizarConfigRI)(aplicarExpresiones(config, data, company));
    const width = cfg.opciones?.anchoLinea ?? LINE_LENGTH;
    const zonas = cfg.zonas || [];
    const cob = cfg.cobros || {};
    const pie = config?.pie?.textoPie ?? cfg.pie?.textoPie ?? 'Gracias por su preferencia!';
    const companyName = company?.nombre || data?.sucursal?.nombre || 'SU EMPRESA';
    const tituloTexto = cfg.titulo?.texto || 'RECIBO DE INGRESO';
    const textosLibres = cfg.textosLibres || cfg.campos?.textosLibres;
    const camposDTO = cfg.camposDTO || cfg.campos?.camposDTO;
    const firmas = cfg.firmas;
    const ctx = { p: [], w: width, al: 'left', bo: false, co: false, forceAl: false };
    ctx.p.push(CMD_INIT + CMD_NORMALIZAR);
    let maxLabelLenTotalesFRI = 0;
    let maxValorLenTotalesFRI = 0;
    data.COMPANIA = companyName;
    data.DIRECCION = company?.direccion || '';
    data.TELEFONO = company?.telefono || '';
    data.RNC = company?.rnc || '';
    data.FAX = company?.fax || '';
    data.SLOGAN = company?.slogan || '';
    data.TITULO = tituloTexto;
    function emitirLinea(linea) {
        if (linea.ref === 'SEPARADOR') {
            _emitirSep(ctx, linea);
            return;
        }
        if (linea.ref === 'ESPACIO') {
            _emitirEspacio(ctx);
            return;
        }
        if (linea.ref.startsWith('LIBRE:') || linea.ref.startsWith('DTO:') || linea.ref.startsWith('FIRMA:')) {
            emitirItemEspecial(ctx.p, linea.ref, data, width, textosLibres, camposDTO, linea.tabular, linea.mismaLinea, firmas);
            return;
        }
        const ref = linea.ref;
        const lblOv = linea.label;
        const fmtOv = linea.formato;
        const fmtLabel = linea.formatoLabel || linea.formato; // hereda de formato si no hay específico de label
        const fmtValor = linea.formatoValor; // sin herencia, solo el específico de valor
        if (ref.startsWith('CAMPO:')) {
            const clave = ref.slice(6);
            switch (clave) {
                case 'CODIGO_QR': {
                    const qrData = data.envioDGII?.codigoQR || data.codigoQR;
                    if (qrData) {
                        _aplicarFmt(ctx, fmtOv);
                        ctx.p.push(escposQRCode(qrData));
                        _restaurarFmt(ctx, fmtOv);
                        ctx.p.push(CMD_INIT + CMD_NORMALIZAR); // Resetear impresora despues del QR
                        ctx.al = 'left';
                        ctx.bo = false;
                        ctx.co = false;
                    }
                    break;
                }
                default: {
                    const render = renderCampoFRI(clave, data, lblOv, fmtOv, width, linea.mostrarLabel, fmtLabel, fmtValor);
                    if (render)
                        ctx.p.push(render);
                    _restaurarFmt(ctx, fmtOv);
                    break;
                }
            }
            return;
        }
        if (ref.startsWith('TOTAL:')) {
            const clave = ref.slice(6);
            const lineaLbl = linea.label;
            const tieneTab = !!linea.tabular;
            const tabAn = linea.tabular?.ancho ?? 12;
            const fmtSinAlineacion = tieneTab && fmtOv ? { ...fmtOv, alineacion: undefined } : fmtOv;
            _aplicarFmt(ctx, fmtSinAlineacion);
            switch (clave) {
                case 'TOTAL': {
                    const labelDefault = 'Total';
                    const lbl = lineaLbl || labelDefault;
                    const monto = formatMoney(data.total);
                    if (linea.mostrarLabel === false) {
                        if (tieneTab) {
                            lineaTabular(ctx, '', monto, tabAn, undefined, linea.formatoValor || fmtOv);
                            ctx.p.push(LF);
                        }
                        else {
                            _aplicarFmt(ctx, linea.formatoValor || fmtOv);
                            ctx.p.push(monto + LF);
                            _restaurarFmt(ctx, linea.formatoValor || fmtOv);
                        }
                    }
                    else if (tieneTab) {
                        const anchoLabel = maxLabelLenTotalesFRI;
                        const columnaValor = Math.max(anchoLabel + 3, tabAn);
                        const texto = right(lbl, anchoLabel) + ':  ' + ' '.repeat(columnaValor - anchoLabel - 3) + right(monto, maxValorLenTotalesFRI);
                        const alineacion = linea.formatoLabel?.alineacion || linea.formato?.alineacion || fmtOv?.alineacion || zonaActualAlineacionFRI;
                        if (alineacion === 'izquierda') {
                            ctx.p.push(texto + LF);
                        }
                        else if (alineacion === 'centro') {
                            ctx.p.push(centerVisible(texto, width) + LF);
                        }
                        else {
                            ctx.p.push(rightVisible(texto, width - 2) + LF);
                        }
                    }
                    else {
                        const texto = right(lbl, maxLabelLenTotalesFRI) + ':  ' + right(monto, maxValorLenTotalesFRI);
                        const alineacion = linea.formatoLabel?.alineacion || linea.formato?.alineacion || fmtOv?.alineacion || zonaActualAlineacionFRI;
                        if (alineacion === 'izquierda') {
                            ctx.p.push(texto + LF);
                        }
                        else if (alineacion === 'centro') {
                            ctx.p.push(centerVisible(texto, width) + LF);
                        }
                        else {
                            // default: derecha (para totales)
                            ctx.p.push(rightVisible(texto, width - 2) + LF);
                        }
                    }
                    break;
                }
            }
            _restaurarFmt(ctx, fmtSinAlineacion);
            return;
        }
        if (ref.startsWith('COBRO:')) {
            _aplicarFmt(ctx, fmtOv);
            const nombre = ref.slice(6);
            const crs = data.cobros || [];
            const cobFmt = cfg.cobros?.formato;
            if (cob.mostrarCobros !== false && crs.length > 0) {
                for (const c of crs) {
                    const medio = (c.medioCobro || 'Pago').trim().toUpperCase();
                    const monto = Number(c.monto) || 0;
                    if (monto > 0 && (nombre === 'MEDIO_COBRO' || medio === nombre)) {
                        if (cobFmt) {
                            const { antes, despues } = comandosFormato(cobFmt);
                            ctx.p.push(...antes);
                            ctx.p.push(formatTotalLine(medio, formatMoney(monto), width) + LF);
                            ctx.p.push(...despues);
                        }
                        else {
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
            const columnaInfo = linea.mismaLinea ? detectarColumnaEnGrupo(lineas, idx) : null;
            const flexWidthLocal = columnaInfo?.izquierda ?? 0;
            const prevLen = ctx.p.length;
            emitirLinea(linea);
            const nuevas = ctx.p.splice(prevLen);
            if (linea.mismaLinea) {
                if (columnaInfo && linea.columna) {
                    const limpio = nuevas.join('').replace(/\x1Ba[\x00-\x02]/g, '').replace(/\n/g, ' ');
                    const textoTrim = trimVisible(limpio);
                    buffer.push(rightVisible(textoTrim, columnaInfo.derecha));
                    anchoAcumulado += columnaInfo.derecha;
                }
                else if (columnaInfo && !linea.columna) {
                    for (let i = 0; i < nuevas.length; i++) {
                        const str = nuevas[i].replace(/\n/g, ' ');
                        const vis = trimVisible(str);
                        if (largoVisible(vis) > flexWidthLocal && flexWidthLocal > 0) {
                            nuevas[i] = vis.substring(0, flexWidthLocal);
                        }
                    }
                    buffer.push(...nuevas);
                    anchoAcumulado += Math.min(largoVisible(nuevas.join('')), flexWidthLocal);
                }
                else {
                    const alineacion = linea.formatoLabel?.alineacion || linea.formato?.alineacion || zonaActualAlineacionFRI;
                    const unido = nuevas.join('');
                    if ((alineacion === 'centro' || alineacion === 'derecha') && /\x1Ba[\x00-\x02]/.test(unido)) {
                        const limpio = unido.replace(/\x1Ba[\x00-\x02]/g, '').replace(/\n/g, ' ');
                        const textoTrim = trimVisible(limpio);
                        const disponible = Math.max(1, width - anchoAcumulado);
                        const segmento = alineacion === 'centro'
                            ? centerVisible(textoTrim, disponible)
                            : rightVisible(textoTrim, disponible);
                        buffer.push(segmento);
                        anchoAcumulado += largoVisible(segmento);
                    }
                    else {
                        for (let i = 0; i < nuevas.length; i++) {
                            const idxN = nuevas[i].indexOf('\n');
                            if (idxN !== -1) {
                                nuevas[i] = nuevas[i].substring(0, idxN) + ' ' + nuevas[i].substring(idxN + 1);
                                break;
                            }
                        }
                        buffer.push(...nuevas);
                        anchoAcumulado += largoVisible(nuevas.join(''));
                    }
                }
            }
            else {
                if (buffer.length > 0) {
                    ctx.p.push(...buffer);
                    buffer.length = 0;
                }
                ctx.p.push(...nuevas);
                anchoAcumulado = 0;
            }
        }
        if (buffer.length > 0)
            ctx.p.push(...buffer);
    }
    // C1: Pre-computar anchoFill compartido entre cabecera_grupo_detalle y detalle (FRI)
    // para garantizar que cabecera de columnas y datos queden alineados visualmente.
    const zonaCabFRI = zonas.find(z => z.tipo === 'cabecera_grupo_detalle');
    const zonaDetFRI = zonas.find(z => z.tipo === 'detalle');
    const todasDetFRI = [
        ...(zonaCabFRI?.lineas || []).filter(l => l.ref.startsWith('DETALLE:')),
        ...(zonaDetFRI?.lineas || []).filter(l => l.ref.startsWith('DETALLE:')),
    ];
    const hayTabularGlobalFRI = todasDetFRI.some(l => l.tabular);
    const anchoFillFRI = !hayTabularGlobalFRI && todasDetFRI.length > 0
        ? Math.floor(width / todasDetFRI.length)
        : 0;
    let zonaActualAlineacionFRI;
    for (const zona of zonas) {
        switch (zona.tipo) {
            case 'encabezado_reporte':
            case 'pie_reporte':
                zonaActualAlineacionFRI = zona.alineacion;
                if (zona.alineacion)
                    _al(ctx, zona.alineacion);
                else
                    _al(ctx, 'izquierda');
                emitirLineasConBuffer(zona.lineas);
                _bo(ctx, false);
                _co(ctx, false);
                _al(ctx, 'izquierda');
                ctx.forceAl = true;
                break;
            case 'totales': {
                zonaActualAlineacionFRI = zona.alineacion;
                // Pre-calcular maxLabelLen y maxValorLen para alinear labels de totales (FRI)
                maxLabelLenTotalesFRI = 0;
                maxValorLenTotalesFRI = 0;
                for (const linea of zona.lineas) {
                    if (linea.ref.startsWith('TOTAL:')) {
                        const clave = linea.ref.slice(6);
                        let labelDefault = clave;
                        let valorTexto = '';
                        switch (clave) {
                            case 'TOTAL':
                                labelDefault = 'Total';
                                valorTexto = formatMoney(Number(data.total) || 0);
                                break;
                        }
                        const lbl = linea.label || labelDefault;
                        if (lbl.length > maxLabelLenTotalesFRI)
                            maxLabelLenTotalesFRI = lbl.length;
                        if (valorTexto.length > maxValorLenTotalesFRI)
                            maxValorLenTotalesFRI = valorTexto.length;
                    }
                }
                if (zona.alineacion)
                    _al(ctx, zona.alineacion);
                else
                    _al(ctx, 'izquierda');
                emitirLineasConBuffer(zona.lineas);
                _bo(ctx, false);
                _co(ctx, false);
                _al(ctx, 'izquierda');
                ctx.forceAl = true;
                break;
            }
            case 'pie_detalle':
            case 'encabezado_pagina':
            case 'pie_pagina':
                zonaActualAlineacionFRI = zona.alineacion;
                if (zona.alineacion)
                    _al(ctx, zona.alineacion);
                else
                    _al(ctx, 'izquierda');
                emitirLineasConBuffer(zona.lineas);
                _bo(ctx, false);
                _co(ctx, false);
                _al(ctx, 'izquierda');
                ctx.forceAl = true;
                break;
            case 'cobros': {
                zonaActualAlineacionFRI = zona.alineacion;
                if (zona.alineacion)
                    _al(ctx, zona.alineacion);
                else
                    _al(ctx, 'izquierda');
                const tieneLineasCobro = zona.lineas.some((l) => l.ref.startsWith('COBRO:'));
                if (!tieneLineasCobro) {
                    const crs = data.cobros || [];
                    if (cob.mostrarCobros !== false && crs.length > 0) {
                        const cobFmt = cfg.cobros?.formato;
                        for (const c of crs) {
                            const medio = (c.medioCobro || 'Pago').trim().toUpperCase();
                            const monto = Number(c.monto) || 0;
                            if (monto > 0) {
                                if (cobFmt) {
                                    const { antes, despues } = comandosFormato(cobFmt);
                                    ctx.p.push(...antes);
                                    ctx.p.push(formatTotalLine(medio, formatMoney(monto), width) + LF);
                                    ctx.p.push(...despues);
                                }
                                else {
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
                _al(ctx, 'izquierda');
                ctx.forceAl = true;
                break;
            }
            case 'cabecera_grupo_detalle': {
                zonaActualAlineacionFRI = zona.alineacion;
                if (zona.alineacion)
                    _al(ctx, zona.alineacion);
                else
                    _al(ctx, 'izquierda');
                // Procesar líneas en orden: acumular DETALLE:* como cabecera de columnas
                // y emitir no-DETALLE (SEPARADOR, ESPACIO, etc.) en su posición real.
                const cabeceraPartsFRI = [];
                const flushCabFRI = () => {
                    if (cabeceraPartsFRI.length > 0) {
                        ctx.p.push(cabeceraPartsFRI.join('') + LF);
                        cabeceraPartsFRI.length = 0;
                    }
                };
                for (const linea of zona.lineas) {
                    if (linea.ref.startsWith('DETALLE:')) {
                        const clave = linea.ref.slice(8);
                        const label = linea.label || ticketPlantillaConfig_1.CAMPOS_DETALLE_RI_LABELS[clave] || clave;
                        const anchoTabular = linea.tabular?.ancho || 0;
                        let labelFmt;
                        if (anchoTabular > 0) {
                            const al = linea.formato?.alineacion;
                            if (al === 'derecha')
                                labelFmt = right(label, anchoTabular);
                            else if (al === 'centro')
                                labelFmt = center(label, anchoTabular);
                            else
                                labelFmt = left(label, anchoTabular);
                        }
                        else if (anchoFillFRI > 0) {
                            const al = linea.formato?.alineacion;
                            if (al === 'derecha')
                                labelFmt = right(label, anchoFillFRI);
                            else if (al === 'centro')
                                labelFmt = center(label, anchoFillFRI);
                            else
                                labelFmt = left(label, anchoFillFRI);
                        }
                        else {
                            labelFmt = label;
                        }
                        const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: undefined });
                        cabeceraPartsFRI.push(antes.join('') + labelFmt + despues.join(''));
                    }
                    else {
                        // No-DETALLE: flush cabecera acumulada primero, luego emitir línea
                        flushCabFRI();
                        emitirLinea(linea);
                    }
                }
                flushCabFRI();
                _bo(ctx, false);
                _co(ctx, false);
                _al(ctx, 'izquierda');
                ctx.forceAl = true;
                break;
            }
            case 'detalle': {
                zonaActualAlineacionFRI = zona.alineacion;
                if (zona.alineacion)
                    _al(ctx, zona.alineacion);
                else
                    _al(ctx, 'izquierda');
                // C1: usar anchoFillFRI compartido (calculado antes del loop de zonas)
                // Si la zona tiene arrayOrigen, iterar ese array dinámicamente.
                // Si no, usar data.transaccionesAsociadas (comportamiento por defecto).
                const transacciones = zona.arrayOrigen
                    ? resolverRuta(data, zona.arrayOrigen) || generarDatosEjemploArray(zona)
                    : (data.transaccionesAsociadas || []);
                // Detectar si alguna línea del grupo tiene columna derecha (layout flex)
                const columnaInfoFRI = detectarColumnaEnGrupo(zona.lineas, 0);
                const flexWidthFRI = columnaInfoFRI?.izquierda ?? 0;
                for (const doc of transacciones) {
                    const bufferLinea = [];
                    for (const linea of zona.lineas) {
                        if (!linea.ref.startsWith('DETALLE:')) {
                            // Flush buffer acumulado antes de emitir línea no-DETALLE (SEPARADOR, ESPACIO, etc.)
                            if (bufferLinea.length > 0) {
                                ctx.p.push(...bufferLinea, LF);
                                bufferLinea.length = 0;
                            }
                            emitirLinea(linea);
                            continue;
                        }
                        const clave = linea.ref.slice(8);
                        const valor = renderDetalleCampoFRI(clave, doc);
                        const texto = linea.mostrarLabel !== false
                            ? (linea.label || ticketPlantillaConfig_1.CAMPOS_DETALLE_RI_LABELS[clave] || clave) + ': ' + valor
                            : valor;
                        const anchoTabularFRI = linea.tabular?.ancho || 0;
                        if (anchoTabularFRI > 0 || (columnaInfoFRI && linea.mismaLinea)) {
                            // Tabular clásico o columna flex-right: usar ancho fijo del campo
                            const esColumna = !!linea.columna;
                            const alineacion = linea.formato?.alineacion;
                            let anchoUsar;
                            if (esColumna) {
                                anchoUsar = columnaInfoFRI.derecha;
                            }
                            else if (columnaInfoFRI && linea.mismaLinea) {
                                anchoUsar = flexWidthFRI; // flex: ancho de la columna izquierda
                            }
                            else {
                                anchoUsar = anchoTabularFRI;
                            }
                            let textoPad;
                            if (esColumna && alineacion !== 'izquierda') {
                                textoPad = rightVisible(texto, anchoUsar);
                            }
                            else if (alineacion === 'derecha') {
                                textoPad = rightVisible(texto, anchoUsar);
                            }
                            else if (alineacion === 'centro') {
                                textoPad = centerVisible(texto, anchoUsar);
                            }
                            else {
                                textoPad = leftVisible(texto, anchoUsar);
                            }
                            const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: undefined });
                            const formateado = antes.join('') + textoPad + despues.join('');
                            if (linea.mismaLinea) {
                                // Con columna flex: sin espacio entre items (ya están dimensionados)
                                if (bufferLinea.length > 0 && !columnaInfoFRI)
                                    bufferLinea.push(' ');
                                bufferLinea.push(formateado);
                            }
                            else {
                                if (bufferLinea.length > 0) {
                                    ctx.p.push(...bufferLinea, LF);
                                    bufferLinea.length = 0;
                                }
                                ctx.p.push(formateado, LF);
                            }
                        }
                        else if (anchoFillFRI > 0) {
                            const anchoReal = columnaInfoFRI && linea.mismaLinea ? flexWidthFRI : anchoFillFRI;
                            const al = linea.formato?.alineacion;
                            let textoPad;
                            if (al === 'derecha')
                                textoPad = rightVisible(texto, anchoReal);
                            else if (al === 'centro')
                                textoPad = centerVisible(texto, anchoReal);
                            else
                                textoPad = leftVisible(texto, anchoReal);
                            const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: undefined });
                            const formateado = antes.join('') + textoPad + despues.join('');
                            if (linea.mismaLinea) {
                                if (bufferLinea.length > 0 && !columnaInfoFRI)
                                    bufferLinea.push(' ');
                                bufferLinea.push(formateado);
                            }
                            else {
                                if (bufferLinea.length > 0) {
                                    ctx.p.push(...bufferLinea, LF);
                                    bufferLinea.length = 0;
                                }
                                ctx.p.push(formateado, LF);
                            }
                        }
                        else {
                            const al = linea.formato?.alineacion;
                            const anchoReal = columnaInfoFRI && linea.mismaLinea ? flexWidthFRI : width;
                            let textoPad;
                            if (al === 'derecha')
                                textoPad = rightVisible(texto, anchoReal);
                            else if (al === 'centro')
                                textoPad = centerVisible(texto, anchoReal);
                            else
                                textoPad = leftVisible(texto, anchoReal);
                            const { antes, despues } = comandosFormato({ ...linea.formato, alineacion: undefined });
                            const formateado = antes.join('') + textoPad + despues.join('');
                            if (linea.mismaLinea) {
                                if (bufferLinea.length > 0 && !columnaInfoFRI)
                                    bufferLinea.push(' ');
                                bufferLinea.push(formateado);
                            }
                            else {
                                if (bufferLinea.length > 0) {
                                    ctx.p.push(...bufferLinea, LF);
                                    bufferLinea.length = 0;
                                }
                                ctx.p.push(formateado, LF);
                            }
                        }
                    }
                    if (bufferLinea.length > 0) {
                        ctx.p.push(...bufferLinea, LF);
                    }
                }
                break;
            }
            case 'banda': {
                zonaActualAlineacionFRI = zona.alineacion;
                if (zona.alineacion)
                    _al(ctx, zona.alineacion);
                else
                    _al(ctx, 'izquierda');
                emitirLineasConBuffer(zona.lineas);
                _bo(ctx, false);
                _co(ctx, false);
                _al(ctx, 'izquierda');
                ctx.forceAl = true;
                break;
            }
        }
    }
    ctx.p.push(LF);
    return ctx.p.join('');
}
/**
 * Renderiza un campo estandar VSNT (voucher Visanet) con label editable y formato.
 * Reproduce los campos del voucher: ID_COMERCIO, TIPO_OP, FECHA, ISSUER, TRANS,
 * AUTORIZACION, TOTAL y RESULTADO, ademas de los campos comunes COMPANIA/SUCURSAL
 * y FECHA/HORA de impresion.
 */
function renderCampoVSNT(clave, data, lblOv, fmtOv, width, mostrarLabel, fmtLabel, fmtValor) {
    const w = width ?? 42;
    const fmt = fmtOv;
    const lbl = (lblOv !== undefined && lblOv !== '' && lblOv !== ticketPlantillaConfig_1.CAMPOS_TICKET_LABELS_VSNT[clave])
        ? lblOv : (ticketPlantillaConfig_1.CAMPOS_TICKET_LABELS_VSNT[clave] || clave);
    function val() {
        switch (clave) {
            case 'COMPANIA': return data.COMPANIA || data.sucursal?.nombre || '--';
            case 'SUCURSAL': return data.sucursalName || data.sucursal?.nombre || '';
            case 'DIRECCION': return data.DIRECCION || '';
            case 'TELEFONO': return data.TELEFONO || '';
            case 'RNC': return data.RNC || '';
            case 'FAX': return data.FAX || '';
            case 'SLOGAN': return data.SLOGAN || '';
            case 'ID_COMERCIO': return data.merchantId || '000000167391001';
            case 'TIPO_OP': return data.subsidioLabel || 'VENTA';
            case 'FECHA': return formatFechaCorta(data.transactionDate);
            case 'ISSUER': return data.issuerName || '';
            case 'TRANS': return data.tokenECR || '';
            case 'AUTORIZACION': return data.autorizacion || '';
            case 'TOTAL': return (data.simMoneda || 'RD$') + ' ' + (Number(data.montoPesos) || 0).toFixed(2);
            case 'RESULTADO': return data.exitoso ? 'APROBADA' : 'RECHAZADA';
            case 'FECHA_IMPRESION': return new Date().toLocaleString('es-DO');
            case 'HORA_IMPRESION': return new Date().toLocaleTimeString('es-DO');
            default: return '--';
        }
    }
    const v = val();
    if (v === '' || v === undefined)
        return null;
    if (mostrarLabel === false) {
        return aplicarFormatoTexto(fmtValor || fmtLabel || fmt, v, w);
    }
    if (fmtLabel || fmtValor) {
        let lblStr = lbl + ': ';
        if (fmtLabel?.negrita === true)
            lblStr = CMD_BOLD_ON + lblStr + CMD_BOLD_OFF;
        else if (fmtLabel?.negrita === false)
            lblStr = CMD_BOLD_OFF + lblStr;
        let valStr = v;
        if (fmtValor?.negrita === true)
            valStr = CMD_BOLD_ON + valStr + CMD_BOLD_OFF;
        else if (fmtValor?.negrita === false)
            valStr = CMD_BOLD_OFF + valStr;
        const texto = lblStr + valStr;
        const alineacion = fmtLabel?.alineacion || fmtValor?.alineacion || fmtOv?.alineacion;
        const fmtCombinado = { ...fmtLabel, ...fmtValor, ...fmtOv };
        if (alineacion)
            fmtCombinado.alineacion = alineacion;
        return aplicarFormatoTexto(fmtCombinado, texto, w);
    }
    if (fmt?.negrita === true || fmt?.negrita === false) {
        return aplicarFormatoTexto(fmt, lbl + ': ' + v, w);
    }
    const texto = CMD_BOLD_ON + lbl + CMD_BOLD_OFF + ': ' + v;
    return aplicarFormatoTexto(fmt, texto, w);
}
/**
 * Formato hardcodeado del voucher Visanet (regresion cero).
 * Replica EXACTAMENTE la salida de `generarTicketVoucher` de VisanetTest: mismo
 * orden de lineas, mismos comandos ESC/POS y el separador de 42 guiones literal.
 */
function formatoVoucherHardcoded(data, company) {
    const companyName = company?.nombre || data?.sucursal?.nombre || 'SOLUGEN S.R.L.';
    const sucursalName = data?.sucursalName || '';
    const fecha = formatFechaCorta(data?.transactionDate) || '';
    const lines = [
        '\x1B\x40', // Init
        '\x1B\x61\x01', // Center
        '\x1B\x21\x10', // Double
        companyName,
        '\x1B\x21\x00', // Normal
        sucursalName,
        ...(company?.direccion ? [company.direccion] : []),
        ...(company?.telefono ? [company.telefono] : []),
        ...(company?.rnc ? [company.rnc] : []),
        '------------------------------------------',
        'ID: ' + (data?.merchantId || '000000167391001'),
        '\x1B\x45\x01', // Bold
        data?.subsidioLabel || 'VENTA',
        '\x1B\x45\x00', // Bold off
        '------------------------------------------',
        '\x1B\x61\x00', // Left
        'FECHA: ' + fecha,
        data?.issuerName || '',
        'Trans # ' + (data?.tokenECR || ''),
        'Autorizacion #: ' + (data?.autorizacion || ''),
        '------------------------------------------',
        '\x1B\x61\x01', // Center
        '\x1B\x21\x10', // Double
        'Total: ' + (data?.simMoneda || 'RD$') + ' ' + (Number(data?.montoPesos) || 0).toFixed(2),
        '\x1B\x21\x00',
        '\n',
        data?.exitoso ? 'APROBADA' : 'RECHAZADA',
        '\x1D\x56\x41\x03', // Cut con feed 3
    ];
    return lines.join('\n') + '\n';
}
/**
 * Formato configurable del voucher Visanet (basado en zonas).
 * Recorre las zonas de la config normalizada (todas encabezado_reporte) y emite
 * los campos VSNT con sus labels y formatos editables.
 */
function formatoVoucherZonas(data, company, cfg, width) {
    const zonas = cfg.zonas || [];
    const textosLibres = cfg.textosLibres || cfg.campos?.textosLibres;
    const camposDTO = cfg.camposDTO || cfg.campos?.camposDTO;
    const firmas = cfg.firmas;
    const ctx = { p: [], w: width, al: 'left', bo: false, co: false, forceAl: false };
    ctx.p.push(CMD_INIT);
    data.COMPANIA = company?.nombre || data?.sucursal?.nombre || 'SOLUGEN S.R.L.';
    data.DIRECCION = company?.direccion || '';
    data.TELEFONO = company?.telefono || '';
    data.RNC = company?.rnc || '';
    data.FAX = company?.fax || '';
    data.SLOGAN = company?.slogan || '';
    function emitirLinea(linea) {
        if (linea.ref === 'SEPARADOR') {
            _emitirSep(ctx, linea);
            return;
        }
        if (linea.ref === 'ESPACIO') {
            _emitirEspacio(ctx);
            return;
        }
        if (linea.ref.startsWith('LIBRE:') || linea.ref.startsWith('DTO:') || linea.ref.startsWith('FIRMA:')) {
            emitirItemEspecial(ctx.p, linea.ref, data, width, textosLibres, camposDTO, linea.tabular, linea.mismaLinea, firmas);
            return;
        }
        if (linea.ref.startsWith('CAMPO:')) {
            const clave = linea.ref.slice(6);
            const render = renderCampoVSNT(clave, data, linea.label, linea.formato, width, linea.mostrarLabel, linea.formatoLabel || linea.formato, linea.formatoValor);
            if (render)
                ctx.p.push(render);
            _restaurarFmt(ctx, linea.formato);
            return;
        }
    }
    // Emite las lineas acumulando en buffer las marcadas con `mismaLinea` para que
    // se impriman en la misma linea fisica del ticket. Soporta columna.flex-right.
    function emitirLineasConBuffer(lineas) {
        const buffer = [];
        let anchoAcumulado = 0;
        for (let idx = 0; idx < lineas.length; idx++) {
            const linea = lineas[idx];
            const columnaInfo = linea.mismaLinea ? detectarColumnaEnGrupo(lineas, idx) : null;
            const flexWidthLocal = columnaInfo?.izquierda ?? 0;
            const prevLen = ctx.p.length;
            emitirLinea(linea);
            const nuevas = ctx.p.splice(prevLen);
            if (linea.mismaLinea) {
                if (columnaInfo && linea.columna) {
                    const limpio = nuevas.join('').replace(/\x1Ba[\x00-\x02]/g, '').replace(/\n/g, ' ');
                    const textoTrim = trimVisible(limpio);
                    buffer.push(rightVisible(textoTrim, columnaInfo.derecha));
                    anchoAcumulado += columnaInfo.derecha;
                }
                else if (columnaInfo && !linea.columna) {
                    for (let i = 0; i < nuevas.length; i++) {
                        const str = nuevas[i].replace(/\n/g, ' ');
                        const vis = trimVisible(str);
                        if (largoVisible(vis) > flexWidthLocal && flexWidthLocal > 0) {
                            nuevas[i] = vis.substring(0, flexWidthLocal);
                        }
                    }
                    buffer.push(...nuevas);
                    anchoAcumulado += Math.min(largoVisible(nuevas.join('')), flexWidthLocal);
                }
                else {
                    const alineacion = linea.formatoLabel?.alineacion || linea.formato?.alineacion || zonaActualAlineacion;
                    const unido = nuevas.join('');
                    if ((alineacion === 'centro' || alineacion === 'derecha') && /\x1Ba[\x00-\x02]/.test(unido)) {
                        const limpio = unido.replace(/\x1Ba[\x00-\x02]/g, '').replace(/\n/g, ' ');
                        const textoTrim = trimVisible(limpio);
                        const disponible = Math.max(1, width - anchoAcumulado);
                        const segmento = alineacion === 'centro'
                            ? centerVisible(textoTrim, disponible)
                            : rightVisible(textoTrim, disponible);
                        buffer.push(segmento);
                        anchoAcumulado += largoVisible(segmento);
                    }
                    else {
                        for (let i = 0; i < nuevas.length; i++) {
                            const idxN = nuevas[i].indexOf('\n');
                            if (idxN !== -1) {
                                nuevas[i] = nuevas[i].substring(0, idxN) + ' ' + nuevas[i].substring(idxN + 1);
                                break;
                            }
                        }
                        buffer.push(...nuevas);
                        anchoAcumulado += largoVisible(nuevas.join(''));
                    }
                }
            }
            else {
                if (buffer.length > 0) {
                    ctx.p.push(...buffer);
                    buffer.length = 0;
                }
                ctx.p.push(...nuevas);
                anchoAcumulado = 0;
            }
        }
        if (buffer.length > 0)
            ctx.p.push(...buffer);
    }
    let zonaActualAlineacion;
    for (const zona of zonas) {
        zonaActualAlineacion = zona.alineacion;
        if (zona.alineacion)
            _al(ctx, zona.alineacion);
        else
            _al(ctx, 'izquierda');
        emitirLineasConBuffer(zona.lineas);
        _bo(ctx, false);
        _co(ctx, false);
        _al(ctx, 'izquierda');
        ctx.forceAl = true;
    }
    ctx.p.push(LF);
    return ctx.p.join('');
}
/**
 * Formateador del voucher Visanet.
 * - Sin config guardada: salida IDENTICA al hardcode de `generarTicketVoucher`
 *   (regresion cero), incluido el corte \x1D\x56\x41\x03.
 * - Con config: recorre las zonas normalizadas contra el default VSNT (ancho 42,
 *   pie vacio, feed de corte 3) y agrega feed + corte al final.
 */
function formatTicketVoucherVisanet(data, company, config) {
    const cfg = (0, ticketPlantillaConfig_1.normalizarConfigVSNT)(aplicarExpresiones(config, data, company));
    const width = cfg.opciones?.anchoLinea ?? 42;
    if (!config) {
        return formatoVoucherHardcoded(data, company);
    }
    const body = formatoVoucherZonas(data, company, cfg, width);
    const feedCorte = cfg.opciones?.feedCorte ?? 3;
    return body + feed(feedCorte) + exports.CMD_CUT;
}
/**
 * Genera comando ESC/POS para imprimir un código QR.
 * Compatible con impresoras Epson y clones (2C-POS80-01).
 */
function escposQRCode(qrData) {
    const dataBytes = new TextEncoder().encode(qrData);
    const parts = [];
    // GS ( k — Modelo 2 (estándar QR)
    // pL pH cn fn n1 n2...
    parts.push('\x1D\x28\x6B\x04\x00\x31\x41\x32\x00');
    // GS ( k — Tamaño fijo del módulo QR (no automático)
    // cn=49 ('1'), fn=69 ('E'), m=8 (rango 1-16)
    // Sin esto, en facturas largas la impresora comprime el QR por presión de buffer.
    parts.push('\x1D\x28\x6B\x03\x00\x31\x45\x08');
    // Error correction level M (15%)
    parts.push('\x1D\x28\x6B\x03\x00\x31\x43\x04');
    // Store QR data — chunked en bloques de max 124 bytes para que pL <= 127.
    // Sin chunking, aBytesImpresora (printTicket.js) corrompe pL > 127 al
    // convertir bytes no-ASCII a caracteres ASCII, rompiendo el comando GS ( k.
    const MAX_CHUNK = 124; // len = 124 + 3 = 127 → pL = 0x7F (seguro)
    for (let offset = 0; offset < dataBytes.length; offset += MAX_CHUNK) {
        const chunk = dataBytes.slice(offset, Math.min(offset + MAX_CHUNK, dataBytes.length));
        const len = chunk.length + 3;
        const pL = len & 0xFF;
        const pH = (len >> 8) & 0xFF;
        parts.push('\x1D\x28\x6B' + String.fromCharCode(pL) + String.fromCharCode(pH) + '\x31\x50\x30');
        // Convertir chunk binario a string preservando bytes
        let chunkStr = '';
        for (let i = 0; i < chunk.length; i++)
            chunkStr += String.fromCharCode(chunk[i]);
        parts.push(chunkStr);
    }
    // Print QR code
    parts.push('\x1D\x28\x6B\x03\x00\x31\x51\x30');
    return parts.join('');
}
/**
 * Genera comando ESC/POS para imprimir un código de barras (GS k, renderizado por la impresora).
 * Usa CODE128 (m=73) con subset B automático; compatible con impresoras Epson y clones (2C-POS80-01).
 */
function escposBarcode(barcodeData, heightPx = 60) {
    const clean = barcodeData.trim();
    if (!clean)
        return '';
    const parts = [];
    // GS h n — altura del código de barras en puntos
    parts.push('\x1D\x68' + String.fromCharCode(Math.max(1, Math.min(255, heightPx))));
    // GS w n — ancho del módulo dinámico para que el barcode ocupe todo el ancho.
    // CODE128: modules ≈ 11 * len + 57. barcodeWidth = modules * moduleWidth.
    // Calculamos el moduleWidth (1-6) que más se acerca al ancho sin excederlo.
    const printableWidth = 576; // 80mm = 576 dots estándar
    const modules = 11 * clean.length + 57;
    const moduleWidth = Math.min(6, Math.max(1, Math.floor(printableWidth / modules)));
    parts.push('\x1D\x77' + String.fromCharCode(moduleWidth));
    // GS H n — texto HRI debajo del código (0 = no imprimir)
    parts.push('\x1D\x48\x00');
    // Centrado: ESC a 1 para preview e impresoras que lo honran.
    // El barcode ocupa casi todo el ancho, así que el centrado es menos crítico.
    // ESC l 0 asegura que el barcode empiece desde el borde izquierdo real.
    parts.push(CMD_ALIGN_CENTER); // ESC a 1
    parts.push('\x1B\x6C\x00'); // ESC l 0 — margen izquierdo 0
    // GS k m d1...dk NUL — CODE128 (m=73); los datos deben iniciar con subset {B
    const payload = '{B' + clean;
    const payloadBytes = new TextEncoder().encode(payload);
    parts.push('\x1D\x6B\x49' + String.fromCharCode(payloadBytes.length));
    parts.push(payload);
    parts.push('\x00');
    return parts.join('');
}
function formatTicket(data, company, config, tipoDoc) {
    switch (tipoDoc) {
        case 'TICKET_POS':
            return formatTicketPOS(data, company, config);
        case 'TICKET_RI':
            return formatTicketReciboIngreso(data, company, config);
        case 'TICKET_VSNT':
            return formatTicketVoucherVisanet(data, company, config);
        case 'TICKET_NC':
            return formatTicketNotaCredito(data, company, config);
        case 'TICKET_TC':
            return formatTicketCierreTurno(data, company, config);
        default:
            return formatTicketPOS(data, company, config);
    }
}
/**
 * Ticket térmico para Nota de Crédito. Reutiliza el motor de zonas de
 * formatTicketPOS (mismos refs CAMPO:/DETALLE:/TOTAL:/SEPARADOR/ESPACIO).
 * Normaliza el shape NC (entidad, detallesMovimiento) al shape FPV (cliente, detalles)
 * antes de delegar. Se pasa una copia porque formatTicketPOS inyecta campos de
 * compañía sobre el objeto data.
 */
function formatTicketNotaCredito(data, company, config) {
    const ticketData = {
        ...data,
        cliente: data.entidad,
        detalles: data.detalles || data.detallesMovimiento || [],
    };
    return formatTicketPOS(ticketData, company, config);
}
/**
 * Ticket térmico de cierre de turno. Reutiliza el motor de zonas de
 * formatTicketPOS (mismos refs CAMPO:/TOTAL:/DTO:/COBRO:/SEPARADOR/ESPACIO).
 * Normaliza el shape del turno al shape FPV: mapea campos estándar (TURNO,
 * CAJERO, CAJA, FECHA/HORA) y expone agregados de cobros (cobrado, porCobrar,
 * devuelta) consumibles via DTO:<id> en la plantilla. Se pasa una copia porque
 * formatTicketPOS inyecta campos de compañía sobre el objeto data.
 */
function formatTicketCierreTurno(data, company, config) {
    const agregados = agregarCobrosTurno(data.cobros, data.total ?? 0);
    const ticketData = {
        ...data,
        cajero: data.usuario?.nombre || '--',
        caja: data.nombrePOS || '--',
        turno: data.noTurno || '--',
        estado: data.cerrado ? 'CERRADO' : 'ABIERTO',
        fechaDocumento: data.fechaCierre || data.fechaApertura,
        detalles: [],
        cobros: agregados.cobros,
        cobrado: agregados.cobrado,
        porCobrar: agregados.porCobrar,
        devuelta: agregados.devuelta,
    };
    return formatTicketPOS(ticketData, company, config);
}
/** Agrega los cobros del turno en un solo elemento y calcula cobrado / porCobrar / devuelta. */
function agregarCobrosTurno(cobros, total) {
    const acc = (cobros || []).reduce((a, c) => ({
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
        facturaID: 0,
    }), { efectivo: 0, cheque: 0, transferencia: 0, tarjetaCredito: 0, tarjetaDebito: 0, bono: 0, tarjetaRegalo: 0, notaCredito: 0, pago: 0, devuelta: 0, facturaID: 0 });
    const cobrado = acc.efectivo + acc.cheque + acc.transferencia +
        acc.tarjetaCredito + acc.tarjetaDebito + acc.bono +
        acc.tarjetaRegalo + acc.notaCredito;
    return {
        cobros: [acc],
        cobrado,
        porCobrar: Math.max(0, Number(total) - cobrado),
        devuelta: acc.devuelta,
    };
}
