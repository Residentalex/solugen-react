import React, { useState, useMemo } from 'react';
import { Input, Checkbox, Button } from 'antd';

export interface FiltroSeleccionDropdownProps {
  dataSource: any[];
  dataIndex: string;
  render?: (record: any) => string;
  placeholder?: string;
  filtroKey: string;
  filtrosActivos: Record<string, any>;
  setFiltrosActivos: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  confirm: () => void;
  clearFilters: () => void;
}

const FiltroSeleccionDropdown: React.FC<FiltroSeleccionDropdownProps> = ({
  dataSource,
  dataIndex,
  render,
  placeholder = 'Buscar...',
  filtroKey,
  filtrosActivos,
  setFiltrosActivos,
  confirm,
  clearFilters,
}) => {
  const [searchText, setSearchText] = useState('');
  const activos = filtrosActivos[filtroKey];
  const [selectedValues, setSelectedValues] = useState<string[]>(
    Array.isArray(activos?.valor) ? activos.valor : []
  );

  // Extraer valores únicos del dataSource
  const valoresUnicos = useMemo(() => {
    const set = new Set<string>();
    dataSource.forEach((item: any) => {
      const val = render ? render(item) : item?.[dataIndex];
      if (val != null && val !== '') {
        set.add(String(val));
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [dataSource, dataIndex, render]);

  // Filtrar opciones según el texto de búsqueda
  const opcionesFiltradas = useMemo(() => {
    if (!searchText) return valoresUnicos;
    const q = searchText.toLowerCase();
    return valoresUnicos.filter(v => v.toLowerCase().includes(q));
  }, [valoresUnicos, searchText]);

  const handleCheck = (valor: string, checked: boolean) => {
    setSelectedValues(prev =>
      checked ? [...prev, valor] : prev.filter(v => v !== valor)
    );
  };

  const handleAceptar = () => {
    setFiltrosActivos((prev: Record<string, any>) => {
      const next = { ...prev };
      if (selectedValues.length > 0) {
        next[filtroKey] = { valor: selectedValues };
      } else {
        delete next[filtroKey];
      }
      return next;
    });
    confirm();
  };

  const handleLimpiar = () => {
    setSelectedValues([]);
    setSearchText('');
    clearFilters?.();
    setFiltrosActivos((prev: Record<string, any>) => {
      const next = { ...prev };
      delete next[filtroKey];
      return next;
    });
    confirm();
  };

  const isChecked = (valor: string) => selectedValues.includes(valor);

  return (
    <div style={{ padding: 8, width: 280 }}>
      <Input.Search
        placeholder={placeholder}
        value={searchText}
        onChange={e => setSearchText(e.target.value)}
        style={{ marginBottom: 8 }}
        allowClear
        onClear={() => setSearchText('')}
      />
      <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 8 }}>
        {opcionesFiltradas.map(valor => (
          <div key={valor} style={{ padding: '2px 0' }}>
            <Checkbox
              checked={isChecked(valor)}
              onChange={e => handleCheck(valor, e.target.checked)}
            >
              <span style={{ fontSize: 13 }}>{valor}</span>
            </Checkbox>
          </div>
        ))}
        {opcionesFiltradas.length === 0 && (
          <div style={{ padding: '8px 0', textAlign: 'center' }} className="paces-text-secondary">
            Sin opciones
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
        <Button size="small" onClick={handleLimpiar}>Limpiar</Button>
        <Button type="primary" size="small" onClick={handleAceptar}>Aceptar</Button>
      </div>
    </div>
  );
};

export default FiltroSeleccionDropdown;
