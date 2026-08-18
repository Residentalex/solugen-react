/**
 * Parsea comandos ESC/POS y genera HTML con formato real.
 * Soporta: negrita intra-linea (segmentos), alineacion, tamaño doble, condensada.
 */
export function escposToHtml(raw: string): string {
  const parts: string[] = [];
  let i = 0;
  let bold = false;
  let doubleSize = false;
  let condensed = false;
  let underline = false;
  let underlineThick = false;
  let scaleH = 1; // multiplicador horizontal (ancho)
  let scaleV = 1; // multiplicador vertical (alto)
  let align = 'left';
  let segments: Array<{ text: string; bold: boolean; condensed: boolean; underline: boolean; underlineThick: boolean }> = [];
  let lineBuffer = '';

  function flushSegment() {
    if (!lineBuffer) return;
    segments.push({ text: lineBuffer, bold, condensed, underline, underlineThick });
    lineBuffer = '';
  }

  function flushLine() {
    flushSegment();
    if (segments.length === 0) return;

    const style: string[] = [];
    if (scaleV > 1 || scaleH > 1) {
      const sx = scaleH;
      const sy = scaleV;
      style.push(`font-size:${12 * sy}px;line-height:1.3`);
      if (sx !== sy) style.push(`display:inline-block;transform:scaleX(${sx});transform-origin:left center`);
    }
    if (align === 'center') style.push('text-align:center');
    else if (align === 'right') style.push('text-align:right');
    else style.push('text-align:left');
    style.push('white-space:pre');

    const inner = segments.map((s) => {
      const sStyle: string[] = [];
      if (s.bold) sStyle.push('font-weight:700;text-shadow:0 0 0.5px currentColor');
      if (s.condensed && scaleV <= 1 && scaleH <= 1) sStyle.push('font-size:11px;line-height:1.3');
      if (s.underline || s.underlineThick) sStyle.push('border-bottom:3px solid currentColor;display:inline');
      return sStyle.length > 0
        ? `<span style="${sStyle.join(';')}">${s.text}</span>`
        : `<span>${s.text}</span>`;
    }).join('');

    const styled = style.length > 0 ? ` style="${style.join(';')}"` : '';
    parts.push(`<div${styled}>${inner}</div>`);

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
        underline = false;
        underlineThick = false;
        scaleH = 1;
        scaleV = 1;
        align = 'left';
        segments = [];
        i += 2;
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
