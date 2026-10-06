import React from 'react';
import { Button, Empty, Input, Popover, Tooltip } from 'antd';
import {
  CATALOGO_ICONOS_MODULO,
  CLAVES_ICONOS_MODULO,
  obtenerComponenteIconoModulo,
} from '../../utils/iconosModulo';

interface SelectorIconoModuloProps {
  /** Clave del icono (nombre del componente en @ant-design/icons). */
  value?: string | null;
  /** Callback con la clave elegida, o undefined para volver al icono por defecto. */
  onChange?: (value: string | undefined) => void;
  /** Si esta deshabilitado. */
  disabled?: boolean;
  /** Tamano del control. */
  size?: 'small' | 'middle' | 'large';
}

const SelectorIconoModulo: React.FC<SelectorIconoModuloProps> = ({
  value,
  onChange,
  disabled,
  size = 'small',
}) => {
  const [abierto, setAbierto] = React.useState(false);
  const [filtro, setFiltro] = React.useState('');

  const seleccionar = (clave: string) => {
    onChange?.(clave);
    setAbierto(false);
    setFiltro('');
  };

  const limpiar = () => {
    onChange?.(undefined);
    setAbierto(false);
    setFiltro('');
  };

  const claveActual = (value || '').trim();
  const iconoActual = React.createElement(obtenerComponenteIconoModulo({ icono: claveActual }));
  const esDefault = !claveActual || !CATALOGO_ICONOS_MODULO[claveActual];

  const visibles = React.useMemo(() => {
    const term = filtro.trim().toLowerCase();
    if (!term) return CLAVES_ICONOS_MODULO;
    return CLAVES_ICONOS_MODULO.filter((c) => c.toLowerCase().includes(term));
  }, [filtro]);

  const contenido = (
    <div style={{ width: 320 }}>
      <Input.Search
        placeholder="Buscar icono..."
        allowClear
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        style={{ marginBottom: 8 }}
        autoFocus
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 4,
          maxHeight: 240,
          overflowY: 'auto',
        }}
      >
        {visibles.map((clave) => {
          const Componente = CATALOGO_ICONOS_MODULO[clave];
          const seleccionado = clave === claveActual;
          return (
            <Tooltip key={clave} title={clave} mouseEnterDelay={0.4}>
              <button
                type="button"
                onClick={() => seleccionar(clave)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 32,
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 15,
                  color: seleccionado ? '#fff' : 'inherit',
                  background: seleccionado ? '#556ee6' : 'transparent',
                  border: seleccionado ? '1px solid #556ee6' : '1px solid #e8e8e8',
                }}
              >
                <Componente />
              </button>
            </Tooltip>
          );
        })}
      </div>
      {visibles.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin resultados" />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <span className="paces-text-secondary" style={{ fontSize: 12 }}>
          {esDefault ? 'Icono por defecto' : claveActual}
        </span>
        {!esDefault && (
          <Button size="small" onClick={limpiar} disabled={disabled}>
            Usar icono por defecto
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Popover
      open={abierto}
      onOpenChange={(next) => {
        setAbierto(next);
        if (!next) setFiltro('');
      }}
      content={contenido}
      trigger="click"
      placement="bottomLeft"
    >
      <Button
        disabled={disabled}
        size={size}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 200, justifyContent: 'flex-start' }}
        icon={iconoActual}
      >
        {esDefault ? 'Icono por defecto' : claveActual}
      </Button>
    </Popover>
  );
};

export default SelectorIconoModulo;