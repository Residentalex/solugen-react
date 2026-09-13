/**
 * Parsea comandos ESC/POS y genera HTML con formato real.
 * Soporta: negrita intra-linea (segmentos), alineacion, tamaño doble, condensada.
 */
export interface EscposHtmlOptions {
  fontSizeBase?: number;
  fontSizeFuenteB?: number;
  escalaCondensada?: number;
  /** @deprecated La medición usa unidades `ch` para conservar la cuadrícula ESC/POS. */
  factorAnchoCaracter?: number;
}

const PUNTOS_POR_CARACTER_NORMAL = 12;

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface SegmentoEscpos {
  text: string;
  bold: boolean;
  condensed: boolean;
  underline: boolean;
  underlineThick: boolean;
  fontB: boolean;
  scaleH: number;
  scaleV: number;
  desplazamientoPuntos?: number;
}

export function escposToHtml(raw: string, opciones: EscposHtmlOptions = {}): string {
  const fontSizeBase = opciones.fontSizeBase ?? 14;
  const fontSizeFuenteB = opciones.fontSizeFuenteB ?? 11;
  const escalaCondensada = opciones.escalaCondensada ?? 0.75;
  const parts: string[] = [];
  let i = 0;
  let bold = false;
  let doubleSize = false;
  let condensed = false;
  let fontB = false; // Fuente B (más compacta que la A)
  let underline = false;
  let underlineThick = false;
  let scaleH = 1; // multiplicador horizontal (ancho)
  let scaleV = 1; // multiplicador vertical (alto)
  let align = 'left';
  let segments: SegmentoEscpos[] = [];
  let lineBuffer = '';

  function flushSegment() {
    if (!lineBuffer) return;
    segments.push({
      text: lineBuffer,
      bold,
      condensed,
      underline,
      underlineThick,
      fontB,
      scaleH,
      scaleV,
    });
    lineBuffer = '';
  }

  function flushLine() {
    flushSegment();
    if (segments.length === 0) return;

    const altoLinea = Math.max(
      fontSizeBase,
      ...segments.map((s) =>
        s.desplazamientoPuntos !== undefined
          ? fontSizeBase
          : (s.fontB ? fontSizeFuenteB : fontSizeBase) * Math.max(s.scaleV, 1),
      ),
    );
    const style: string[] = [
      `font-size:${fontSizeBase}px`,
      `line-height:${Math.ceil(altoLinea * 1.1)}px`,
    ];
    if (align === 'center') style.push('text-align:center');
    else if (align === 'right') style.push('text-align:right');
    else style.push('text-align:left');
    style.push('white-space:pre');

    const inner = segments.map((s) => {
      if (s.desplazamientoPuntos !== undefined) {
        const anchoCaracteres = s.desplazamientoPuntos / PUNTOS_POR_CARACTER_NORMAL;
        return `<span aria-hidden="true" style="display:inline-block;font-family:'Courier New',monospace;font-size:${fontSizeBase}px;width:${anchoCaracteres}ch"></span>`;
      }

      const tamanoBase = s.fontB ? fontSizeFuenteB : fontSizeBase;
      const escalaVertical = Math.max(s.scaleV, 1);
        // ESC/POS avanza sobre una rejilla basada en la fuente normal. Tanto la
        // fuente B como el modo condensado usan el mismo paso reducido; no se
        // acumulan entre sí.
        const factorPaso =
          s.fontB || s.condensed ? escalaCondensada : 1;
        const escalaHorizontal = Math.max(s.scaleH, 1) * factorPaso;
        const tamanoFuente = tamanoBase * escalaVertical;
        const escalaX =
          (fontSizeBase / tamanoBase) *
          (escalaHorizontal / escalaVertical);
        const anchoReservadoCaracteres = s.text.length * escalaHorizontal;
        const exteriorStyle = [
          'display:inline-block',
          "font-family:'Courier New',monospace",
          `font-size:${fontSizeBase}px`,
        `width:${anchoReservadoCaracteres}ch`,
        `height:${Math.ceil(tamanoFuente * 1.1)}px`,
        'vertical-align:top',
      ];
      const textoStyle = [
        'display:inline-block',
        `font-size:${tamanoFuente}px`,
        `line-height:${Math.ceil(tamanoFuente * 1.1)}px`,
        'white-space:pre',
      ];
      if (escalaX !== 1) {
        textoStyle.push(`transform:scaleX(${escalaX})`, 'transform-origin:left top');
      }
      if (s.bold) textoStyle.push('font-weight:700');
      if (s.underline || s.underlineThick) {
        const thickness = s.underlineThick ? 2 : 1;
        textoStyle.push(`border-bottom:${thickness}px solid currentColor`);
      }
      return `<span style="${exteriorStyle.join(';')}"><span style="${textoStyle.join(';')}">${escaparHtml(s.text)}</span></span>`;
    }).join('');

    parts.push(`<div style="${style.join(';')}">${inner}</div>`);

    segments = [];
    lineBuffer = '';
  }

  while (i < raw.length) {
    const char = raw.charCodeAt(i);

    // ESC \x1B (0x1B)
    if (char === 0x1b && i + 1 < raw.length) {
      const cmd = raw.charCodeAt(i + 1);

      if (cmd === 0x61 && i + 2 < raw.length) {
        // ESC a n → alineación
        flushLine();
        const n = raw.charCodeAt(i + 2);
        if (n === 0x00) align = 'left';
        else if (n === 0x01) align = 'center';
        else if (n === 0x02) align = 'right';
        i += 3;
        continue;
      }

      if (cmd === 0x24 && i + 3 < raw.length) {
        // ESC $ nL nH → posición absoluta de impresión.
        // Nosotros la usamos para centrar el código de barras (muchas
        // impresoras ignoran ESC a para GS k). Centramos el marcador.
        flushLine();
        align = 'center';
        i += 4;
        continue;
      }

      if (cmd === 0x45 && i + 2 < raw.length) {
        // ESC E n → negrita
        flushSegment();
        const n = raw.charCodeAt(i + 2);
        bold = n === 0x01;
        i += 3;
        continue;
      }

      if (cmd === 0x21 && i + 2 < raw.length) {
        // ESC ! n → fuente condensada
        flushSegment();
        const n = raw.charCodeAt(i + 2);
        condensed = (n & 0x01) === 0x01;
        i += 3;
        continue;
      }

      if (cmd === 0x2D && i + 2 < raw.length) {
        // ESC - n → subrayado
        flushSegment();
        const n = raw.charCodeAt(i + 2);
        underline = n === 0x01;
        underlineThick = n === 0x02;
        i += 3;
        continue;
      }

      if (cmd === 0x4A && i + 2 < raw.length) {
        // ESC J n → avance de n/216 pulgadas
        flushLine();
        const n = raw.charCodeAt(i + 2);
        if (n > 0) {
          parts.push(`<div style="height:${Math.ceil(n / 3)}px"></div>`);
        }
        i += 3;
        continue;
      }

      if (cmd === 0x64 && i + 2 < raw.length) {
        // ESC d n → avance n lineas
        flushLine();
        const n = raw.charCodeAt(i + 2);
        for (let f = 0; f < n; f++) {
          parts.push('<div>&nbsp;</div>');
        }
        i += 3;
        continue;
      }

      if (cmd === 0x40) {
        // ESC @ → reset
        flushLine();
        bold = false;
        doubleSize = false;
        condensed = false;
        fontB = false;
        underline = false;
        underlineThick = false;
        scaleH = 1;
        scaleV = 1;
        align = 'left';
        segments = [];
        i += 2;
        continue;
      }

      if (cmd === 0x4D && i + 2 < raw.length) {
        // ESC M n → selección de fuente (0=A estándar, 1=B compacta)
        flushSegment();
        fontB = raw.charCodeAt(i + 2) === 0x01;
        i += 3;
        continue;
      }

      if (cmd === 0x6C && i + 2 < raw.length) {
        // ESC l n — margen izquierdo (lo usamos para centrar barcode). Ignorar en preview.
        i += 3;
        continue;
      }

      if (cmd === 0x5C && i + 3 < raw.length) {
        // ESC \ xx yy → posición relativa horizontal (mover cursor xx+yy*256 puntos a la derecha)
        // Reproducir el avance físico del agente: 12 puntos equivalen a un carácter normal.
        flushSegment();
        const puntos = raw.charCodeAt(i + 2) | (raw.charCodeAt(i + 3) << 8);
        if (puntos > 0) {
          segments.push({
            text: '',
            bold,
            condensed,
            underline,
            underlineThick,
            fontB,
            scaleH,
            scaleV,
            desplazamientoPuntos: puntos,
          });
        }
        i += 4;
        continue;
      }

      if (cmd >= 0x00 && cmd <= 0x7f) {
        i += 2;
        continue;
      }
    }

    // GS \x1D (0x1D)
    if (char === 0x1d && i + 2 < raw.length) {
      const cmd = raw.charCodeAt(i + 1);

      if (cmd === 0x21) {
        // GS ! n → tamaño. Low nibble = altura (1-8), high nibble = ancho (1-8)
        flushSegment();
        const n = raw.charCodeAt(i + 2);
        const v = (n & 0x0f) + 1;  // multiplicador vertical
        const h = ((n >> 4) & 0x0f) + 1;  // multiplicador horizontal
        if (h > 1 || v > 1) {
          scaleH = h;
          scaleV = v;
          condensed = false;
        } else {
          scaleH = 1;
          scaleV = 1;
          condensed = false;
        }
        i += 3;
        continue;
      }

      if (cmd === 0x56 && i + 2 < raw.length) {
        i += 3;
        continue;
      }

      // GS ( k — comando QR (ej. escposQRCode)
      // Formato: \x1D\x28\x6B pL pH cn fn [data]
      // Longitud total = 5 + (pL + pH * 256)
      if (cmd === 0x28 && i + 4 < raw.length && raw.charCodeAt(i + 2) === 0x6b) {
        flushLine();
        const pL = raw.charCodeAt(i + 3);
        const pH = raw.charCodeAt(i + 4);
        const dataLen = pL + pH * 256;
        const cmdLen = Math.max(5 + dataLen, 0);
        parts.push('<div style="text-align:center;margin:4px 0"><span style="background:#f0f0f0;padding:2px 12px;border-radius:4px;font-size:12px;color:#888">[Código QR]</span></div>');
        segments = [];
        lineBuffer = '';
        i += Math.min(cmdLen, raw.length - i);
        continue;
      }

      // GS h / GS w / GS H → parámetros de barcode (altura/ancho/HRI), ignorar
      if (cmd === 0x68 || cmd === 0x77 || cmd === 0x48) {
        i += 3;
        continue;
      }

      // GS k → código de barras.
      // Formatos:
      //   m=0x49 (73): CODE128 Función I → GS k m len data NUL (longitud explícita)
      //   m=0x45 (69): CODE39 Función B  → GS k m data NUL (terminado en NUL)
      //   m=0x02 (2):  EAN-13 Función A  → GS k m data NUL (terminado en NUL)
      //   m=0x00 (0):  UPC-A Función A   → GS k m data NUL (terminado en NUL)
      //   Otros:       mismos formatos Función A/B → terminado en NUL
      if (cmd === 0x6b) {
        flushLine();
        const m = raw.charCodeAt(i + 2);
        const bcAlign = align === 'right' ? 'right' : align === 'center' ? 'center' : 'left';
        parts.push(`<div style="text-align:${bcAlign};margin:4px 0"><span style="background:#f0f0f0;padding:2px 12px;border-radius:4px;font-size:12px;color:#888">[Código de barras]</span></div>`);
        if (m === 0x49) {
          // CODE128 Función I: longitud explícita en byte i+3
          const len = raw.charCodeAt(i + 3);
          i += 4 + len + 1; // GS k m len data NUL
        } else {
          // Todos los demás: buscar NUL terminator desde i+3
          let end = i + 3;
          while (end < raw.length && raw.charCodeAt(end) !== 0x00) {
            end++;
          }
          i = end + 1; // saltar el NUL
        }
        segments = [];
        lineBuffer = '';
        continue;
      }

      if (cmd >= 0x00 && cmd <= 0x7f) {
        i += (i + 2 < raw.length) ? 3 : 2;
        continue;
      }
    }

    // Salto de línea
    if (char === 0x0a) {
      flushLine();
      i++;
      continue;
    }

    // Caracteres de control
    if (char < 0x20 || (char >= 0x7f && char <= 0x9f)) {
      i++;
      continue;
    }

    // Caracter imprimible
    lineBuffer += raw[i];
    i++;
  }

  flushLine();
  return parts.join('');
}
