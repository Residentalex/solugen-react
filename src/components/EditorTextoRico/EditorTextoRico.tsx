import React, { useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import './EditorTextoRico.css';

interface EditorTextoRicoProps {
  value?: string;
  onChange?: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  minHeight?: number;
}

// Toolbar mínima: negrita, cursiva, subrayado, viñetas, numerada, enlace y limpiar formato.
const modules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'bullet' }, { list: 'ordered' }],
    ['link'],
    ['clean'],
  ],
};

// Solo se considera "markup" si aparecen etiquetas conocidas del editor. Evita
// falsos positivos con textos como `<http://...>` o `<nombre@dominio>`.
const ETIQUETAS_CONOCIDAS = /<\s*\/?\s*(p|br|div|strong|b|em|i|u|ul|ol|li|a|span)(\s[^>]*)?>/i;

/**
 * Devuelve '' cuando el HTML no tiene contenido visible. Quill deja `<p><br></p>`
 * (o variantes con espacios / `&nbsp;`) al borrar todo el contenido.
 */
function normalizarHtmlVacio(html: string): string {
  const v = html ?? '';
  const textoVisible = v
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return textoVisible === '' ? '' : v;
}

/**
 * Convierte el valor guardado (HTML del editor o texto plano legacy) a HTML seguro.
 * - Si no contiene markup conocido, se escapa y los saltos de línea se convierten en <br>.
 * - Si es HTML, se sanea con DOMPurify.
 * - El resultado vacío se normaliza a ''.
 */
function sanitizarNota(raw: string | undefined): string {
  const v = raw ?? '';
  if (!v) return '';
  let html: string;
  if (!ETIQUETAS_CONOCIDAS.test(v)) {
    const escaped = v
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    html = escaped.replace(/\r?\n/g, '<br>');
  } else {
    html = DOMPurify.sanitize(v);
  }
  return normalizarHtmlVacio(html);
}

const EditorTextoRico: React.FC<EditorTextoRicoProps> = ({
  value,
  onChange,
  readOnly = false,
  placeholder,
  minHeight = 120,
}) => {
  const safeHtml = useMemo(() => sanitizarNota(value), [value]);

  if (readOnly) {
    if (!safeHtml) {
      return <div className="paces-nota-html">-</div>;
    }
    return (
      <div
        className="paces-nota-html"
        style={{ minHeight }}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    );
  }

  return (
    <div
      className="editor-texto-rico"
      style={{ '--etr-min-height': `${minHeight}px` } as React.CSSProperties}
    >
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={(html, _delta, source) => {
          // Quill emite onChange al montar/normalizar con source 'api'/'silent';
          // solo propagamos ediciones reales del usuario para no marcar el
          // formulario como modificado sin haber escrito.
          if (source !== 'user') return;
          onChange?.(normalizarHtmlVacio(html));
        }}
        placeholder={placeholder}
        modules={modules}
        readOnly={false}
      />
    </div>
  );
};

export default EditorTextoRico;
