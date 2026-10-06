import React from 'react';
import { Select } from '../components/Select';
import type { MonedaDTO } from '../types/contabilidad';

interface MonedaDocumentoSelectProps {
  /** Codigo de la moneda seleccionada (MONEDAS.CODIGO). */
  value?: string;
  onChange: (codigo: string) => void;
  monedas: MonedaDTO[];
  loading?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

/**
 * Selector de moneda para formularios de documentos.
 * Se ubica junto a los campos rapidos (NCF / Referencia / Tasa) y escribe el
 * objeto completo del catalogo en el documento, no solo el texto.
 *
 * El label arranca por el nombre de la moneda para que el campo siga siendo legible
 * con el ancho minimo; el codigo se conserva en el tooltip y en la busqueda.
 */
const MonedaDocumentoSelect: React.FC<MonedaDocumentoSelectProps> = ({
  value, onChange, monedas, loading, disabled, style,
}) => (
  <Select
    showSearch
    // Busca por nombre (label) y por codigo (value): el codigo ya no esta en el label.
    // No usar `filterOption` propio: Ant Design precarga el label seleccionado en el input
    // al abrir, y eso dejaria una sola opcion visible.
    optionFilterProp={['label', 'value']}
    placeholder="Moneda"
    value={value || undefined}
    onChange={onChange}
    loading={loading}
    disabled={disabled}
    style={{ minWidth: 240, ...style }}
    options={monedas.map((m) => ({
      value: m.codigo,
      label: `${m.nombre}${m.simbolo ? ` (${m.simbolo})` : ''}`,
      title: m.codigo,
    }))}
  />
);

export default MonedaDocumentoSelect;