import React, { useRef, useState } from 'react';
import { Input } from 'antd';
import type { TextAreaProps } from 'antd/es/input/TextArea';
import { listarFunciones } from '../utils/expresiones';

type TipoSugerencia = 'ruta' | 'funcion';

interface ItemSugerencia {
  label: string;
  descripcion: string;
  texto: string;
  tipo: TipoSugerencia;
}

interface GrupoSugerencia {
  titulo: string;
  items: ItemSugerencia[];
}

interface TextAreaAutocompletarProps extends TextAreaProps {
  opciones?: string[];
}

const FUNCIONES_MOTOR: ItemSugerencia[] = listarFunciones().map((f) => ({
  label: `${f.nombre}(`,
  descripcion: `${f.params && f.params !== '' ? `(${f.params}) ` : ''}${f.descripcion} — ${f.ejemplo}`,
  texto: `${f.nombre}(`,
  tipo: 'funcion' as const,
}));

interface ContextoSugerencia {
  token: string;
  inicio: number;
  doble: boolean;
  enLlamada: boolean;
}

function obtenerContexto(valor: string, pos: number): ContextoSugerencia | null {
  const antes = valor.slice(0, pos);
  const i = antes.lastIndexOf('{');
  if (i < 0) return null;
  if (antes.slice(i).includes('}')) return null;
  const doble = i > 0 && antes[i - 1] === '{';
  const expr = antes.slice(i + (doble ? 2 : 1));
  const enLlamada = expr.includes('(');
  const m = expr.match(/([A-Za-zÑñÁÉÍÓÚáéíóúÜü0-9_.:]+)$/);
  const token = m ? m[1] : '';
  const inicio = m ? i + (doble ? 2 : 1) + (m.index ?? 0) : antes.length;
  return { token, inicio, doble, enLlamada };
}

function construirGrupos(opciones: string[], token: string): GrupoSugerencia[] {
  const t = token.toLowerCase();
  const rutas: ItemSugerencia[] = opciones
    .filter((r) => !t || r.toLowerCase().includes(t))
    .slice(0, 30)
    .map((r) => ({ label: r, descripcion: r, texto: r, tipo: 'ruta' as const }));
  const funciones: ItemSugerencia[] = FUNCIONES_MOTOR.filter(
    (it) => !t || it.label.toLowerCase().includes(t),
  );
  return [
    { titulo: 'Campos', items: rutas },
    { titulo: 'Funciones', items: funciones },
  ];
}

export default function TextAreaAutocompletar({ opciones = [], onChange, onKeyDown, value, ...rest }: TextAreaAutocompletarProps) {
  const domRef = useRef<HTMLTextAreaElement | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [grupos, setGrupos] = useState<GrupoSugerencia[]>([]);
  const [indice, setIndice] = useState(0);

  const aplanadas = grupos.flatMap((g) => g.items);

  const manejarCambio: TextAreaProps['onChange'] = (e) => {
    onChange?.(e);
    const ta = e.target as HTMLTextAreaElement | null;
    if (!ta) return;
    domRef.current = ta;
    const posicion = ta.selectionStart ?? e.target.value.length;
    const ctx = obtenerContexto(e.target.value, posicion);
    if (!ctx) {
      if (abierto) { setAbierto(false); setGrupos([]); }
      return;
    }
    const nuevosGrupos = construirGrupos(opciones, ctx.token);
    const total = nuevosGrupos.reduce((a, g) => a + g.items.length, 0);
    if (total === 0) {
      if (abierto) { setAbierto(false); setGrupos([]); }
      return;
    }
    setGrupos(nuevosGrupos);
    setIndice(0);
    setAbierto(true);
  };

  const aplicarSugerencia = (item: ItemSugerencia) => {
    const ta = domRef.current;
    if (!ta) return;
    const val = value ?? '';
    const posicion = ta.selectionStart ?? val.length;
    const antes = val.slice(0, posicion);
    const despues = val.slice(ta.selectionEnd ?? posicion);
    const ctx = obtenerContexto(antes, antes.length);
    if (!ctx) { setAbierto(false); return; }
    // Dentro de una función (CONCAT(...)), NO agregar el cierre de llave:
    // solo se reemplaza la palabra parcial en curso.
    const cierres = item.tipo === 'ruta' && !ctx.enLlamada ? (ctx.doble ? '}}' : '}') : '';
    let textoFinal = despues;
    if (cierres && textoFinal.startsWith(cierres)) textoFinal = textoFinal.slice(cierres.length);
    const nuevo = antes.slice(0, ctx.inicio) + item.texto + cierres + textoFinal;
    onChange?.({ target: { value: nuevo } } as React.ChangeEvent<HTMLTextAreaElement>);
    const nuevaPos = ctx.inicio + item.texto.length + cierres.length;
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = nuevaPos;
      ta.focus();
    });
    setAbierto(false);
    setGrupos([]);
  };

  const manejarTeclas: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    const ta = e.target as HTMLTextAreaElement | null;
    if (ta) domRef.current = ta;
    if (!abierto) { onKeyDown?.(e); return; }
    const total = aplanadas.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndice((i) => (i + 1) % total); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIndice((i) => (i - 1 + total) % total); return; }
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (total > 0) { e.preventDefault(); aplicarSugerencia(aplanadas[Math.min(indice, total - 1)]); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); setAbierto(false); setGrupos([]); return; }
    onKeyDown?.(e);
  };

  const cerrar = () => setAbierto(false);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <Input.TextArea
        {...rest}
        value={value}
        onChange={manejarCambio}
        onKeyDown={manejarTeclas}
        onBlur={() => setTimeout(cerrar, 120)}
      />
      {abierto && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '100%',
            marginTop: 4,
            width: 260,
            maxHeight: 220,
            overflowY: 'auto',
            background: '#ffffff',
            border: '1px solid #d9d9d9',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: 6,
            zIndex: 1000,
            padding: 4,
          }}
        >
          {grupos.map((g, gi) => (
            <div key={g.titulo}>
              {g.items.length > 0 && (
                <div style={{ fontSize: 10, color: '#8c8c8c', padding: '2px 6px', textTransform: 'uppercase' }}>{g.titulo}</div>
              )}
              {g.items.map((item, j) => {
                const idxGlobal = grupos.reduce((acc, grp, k) => (k < gi ? acc + grp.items.length : acc), 0) + j;
                return (
                  <div
                    key={`${g.titulo}-${item.label}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => aplicarSugerencia(item)}
                    style={{
                      padding: '3px 6px',
                      cursor: 'pointer',
                      background: idxGlobal === indice ? '#e6e9ff' : 'transparent',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                        fontWeight: item.tipo === 'funcion' ? 600 : 400,
                        color: item.tipo === 'funcion' ? '#6a1b9a' : '#556ee6',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.label}
                    </span>
                    {item.descripcion !== item.label && (
                      <span style={{ fontSize: 11, color: '#8c8c8c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.descripcion}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}