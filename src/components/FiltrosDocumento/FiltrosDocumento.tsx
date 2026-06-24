import React, { useState, useMemo } from 'react';
import { Button, Popover, DatePicker, Select, Badge } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

interface FiltrosDocumentoProps {
  /** Filtros actualmente aplicados */
  filtros: {
    desde?: string;
    hasta?: string;
    estado?: string | number;
  };
  /** Callback al aplicar filtros (recibe los nuevos valores) */
  onAplicar: (filtros: { desde?: string; hasta?: string; estado?: string | number }) => void;
  /** Opciones de estado disponibles */
  opcionesEstado: { value: string | number; label: string }[];
  /** Rango de fechas por defecto (para no contarlo como filtro activo) */
  rangoDefault?: { desde: string; hasta: string };
}

function parseDateParam(val: string): dayjs.Dayjs | null {
  if (!val) return null;
  const num = val.replace(/\D/g, '');
  if (num.length >= 14) {
    const y = parseInt(num.slice(0, 4), 10);
    const m = parseInt(num.slice(4, 6), 10) - 1;
    const d = parseInt(num.slice(6, 8), 10);
    const hh = parseInt(num.slice(8, 10), 10);
    const mm = parseInt(num.slice(10, 12), 10);
    const ss = parseInt(num.slice(12, 14), 10);
    return dayjs(new Date(y, m, d, hh, mm, ss));
  }
  if (num.length === 8) {
    const y = parseInt(num.slice(0, 4), 10);
    const m = parseInt(num.slice(4, 6), 10) - 1;
    const d = parseInt(num.slice(6, 8), 10);
    return dayjs(new Date(y, m, d));
  }
  return null;
}

function formatDateParam(d: dayjs.Dayjs): string {
  return d.format('YYYYMMDDHHmmss');
}

const FiltrosDocumento: React.FC<FiltrosDocumentoProps> = ({
  filtros,
  onAplicar,
  opcionesEstado,
  rangoDefault,
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ desde?: string; hasta?: string; estado?: string | number }>({});

  const abrirPopover = () => {
    setDraft({ ...filtros });
    setOpen(true);
  };

  const handleAplicar = () => {
    setOpen(false);
    onAplicar(draft);
  };

  const handleLimpiar = () => {
    setDraft({});
  };

  const activeCount = useMemo(() => {
    let count = 0;
    if (rangoDefault) {
      const desdeChanged = filtros.desde !== undefined && filtros.desde !== rangoDefault.desde;
      const hastaChanged = filtros.hasta !== undefined && filtros.hasta !== rangoDefault.hasta;
      if (desdeChanged || hastaChanged) count++;
    } else if (filtros.desde || filtros.hasta) {
      count++;
    }
    if (filtros.estado !== undefined) count++;
    return count;
  }, [filtros, rangoDefault]);

  return (
    <Popover
      open={open}
      trigger="click"
      placement="bottomRight"
      onOpenChange={(visible) => {
        if (!visible) setOpen(false);
      }}
      content={
        <div style={{ width: 320 }}>
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>
            <FilterOutlined style={{ marginRight: 8 }} />
            Filtros
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>Período</div>
            <RangePicker
              value={
                draft.desde && draft.hasta
                  ? [parseDateParam(draft.desde), parseDateParam(draft.hasta)]
                  : undefined
              }
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDraft({
                    ...draft,
                    desde: formatDateParam(dates[0]),
                    hasta: formatDateParam(dates[1]),
                  });
                } else {
                  const { desde, hasta, ...rest } = draft;
                  setDraft(rest);
                }
              }}
              style={{ width: '100%' }}
              placeholder={['Desde', 'Hasta']}
              allowClear
              renderExtraFooter={() => (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button type="link" size="small" style={{ padding: 0 }}
                    onClick={() => {
                      const hoy = dayjs();
                      setDraft({ ...draft, desde: formatDateParam(hoy), hasta: formatDateParam(hoy) });
                    }}>
                    Hoy
                  </Button>
                  <Button type="link" size="small" style={{ padding: 0 }}
                    onClick={() => {
                      const inicio = dayjs().startOf('month');
                      const fin = dayjs();
                      setDraft({ ...draft, desde: formatDateParam(inicio), hasta: formatDateParam(fin) });
                    }}>
                    Este mes
                  </Button>
                  <Button type="link" size="small" style={{ padding: 0 }}
                    onClick={() => {
                      const inicio = dayjs().subtract(30, 'day');
                      const fin = dayjs();
                      setDraft({ ...draft, desde: formatDateParam(inicio), hasta: formatDateParam(fin) });
                    }}>
                    30 días
                  </Button>
                </div>
              )}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>Estado</div>
            <Select
              style={{ width: '100%' }}
              value={draft.estado}
              onChange={(val) => setDraft({ ...draft, estado: val })}
              placeholder="Todos"
              allowClear
              options={opcionesEstado}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
            <Button onClick={handleLimpiar}>Limpiar</Button>
            <Button type="primary" onClick={handleAplicar}>
              Aplicar
            </Button>
          </div>
        </div>
      }
    >
      <Badge count={activeCount} size="small" offset={[-5, 5]}>
        <Button
          icon={<FilterOutlined />}
          onClick={abrirPopover}
          style={activeCount > 0 ? { borderColor: '#556ee6', color: '#556ee6' } : undefined}
        >
          Filtros
        </Button>
      </Badge>
    </Popover>
  );
};

export default FiltrosDocumento;
