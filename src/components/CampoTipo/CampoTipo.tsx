import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Select, Input, Button, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { tipoApi } from '../../api/tipoApi';
import FloatingField from '../FloatingLabel/FloatingField';
import BuscarTipoModal from '../BuscarTipoModal/BuscarTipoModal';
import { toTitleCase } from '../../utils/formats';
import type { TipoDocumentoDTO } from '../../types/transaccion';

export interface CampoTipoProps {
  /** Código del tipo de documento (NC, FAC, ND, RI, SP, DBA, etc.) */
  tipoDocumento: string;
  /** Sucursal activa */
  sucursal: number;
  /** Filtro por tipo de entidad (SUP/CLI) - opcional. Si la API lo soporta, recarga al cambiar */
  tipoEntidad?: string;
  /** Valor actual (código del tipo seleccionado) */
  value?: string;
  /** Callback al cambiar */
  onChange?: (codigo: string | null) => void;
  /** Modo de visualización: 'select' (dropdown, default) o 'modal' (ventana de búsqueda) */
  modo?: 'select' | 'modal';
  /** Si el campo está deshabilitado */
  disabled?: boolean;
  /** Label del FloatingField */
  label?: string;
  /** Si es requerido */
  required?: boolean;
  /** Nombre del form item (opcional, si se usa fuera de Form.Item) */
  name?: string;
}

/**
 * Componente compartido para selección de Tipo de Documento.
 *
 * Modo 'select' (default):
 *  - Carga tipos desde tipoApi.obtenerPorDocumento() al montarse.
 *  - Renderiza un <Select> dentro de FloatingField.
 *  - Si disabled=true, muestra <Input disabled> informativo.
 *
 * Modo 'modal':
 *  - Renderiza un <Input readOnly> + botón de búsqueda.
 *  - Al hacer clic abre BuscarTipoModal con los filtros.
 *
 * Integración con Form.Item de Ant Design:
 *  - El componente recibe value/onChange automáticamente desde Form.Item.
 *  - Se coloca como hijo directo de <Form.Item name="tipo">.
 */
const CampoTipo: React.FC<CampoTipoProps> = ({
  tipoDocumento,
  sucursal,
  tipoEntidad,
  value,
  onChange,
  modo = 'select',
  disabled = false,
  label = 'Tipo',
  required = false,
}) => {
  const [tipos, setTipos] = useState<TipoDocumentoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const tiposCacheRef = useRef<TipoDocumentoDTO[]>([]);

  const cargarTipos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tipoApi.obtenerPorDocumento(sucursal, tipoDocumento);
      setTipos(data);
      tiposCacheRef.current = data;
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar tipos');
    } finally {
      setLoading(false);
    }
  }, [sucursal, tipoDocumento]);

  // Handler que adapta la firma de FloatingField a CampoTipoProps
  const handleChange = useCallback(
    (...args: unknown[]) => {
      const val = args[0] as string | null | undefined;
      onChange?.(val ?? null);
    },
    [onChange],
  );

  // Cargar tipos al montar en modo 'select'
  useEffect(() => {
    if (modo === 'select') {
      cargarTipos();
    }
  }, [cargarTipos, modo]);

  // Recargar si cambia tipoEntidad (cuando la API lo soporte)
  useEffect(() => {
    if (modo === 'select' && tipoEntidad) {
      cargarTipos();
    }
  }, [tipoEntidad, cargarTipos, modo]);

  // ===== Modo 'select' =====
  if (modo === 'select') {
    if (disabled) {
      const t = tipos.find(t2 => t2.codigo === value);
      return (
        <FloatingField label={label} required={required} value={value} onChange={handleChange}>
          <Input disabled value={t ? `${t.codigo} - ${toTitleCase(t.nombre)}` : (value || '—')} />
        </FloatingField>
      );
    }

    return (
      <FloatingField label={label} required={required} value={value} onChange={handleChange}>
        <Select
          allowClear
          showSearch
          optionFilterProp="children"
          placeholder=" "
          loading={loading}
          value={value}
          onChange={handleChange}
          labelRender={(labelProps) => {
            const t = tipos.find(t2 => t2.codigo === labelProps.value);
            return t ? `${t.codigo} - ${toTitleCase(t.nombre)}` : labelProps.label;
          }}
        >
          {tipos.map((t) => (
            <Select.Option key={t.codigo} value={t.codigo}>
              {t.codigo} - {toTitleCase(t.nombre)}
            </Select.Option>
          ))}
        </Select>
      </FloatingField>
    );
  }

  // ===== Modo 'modal' =====
  const selectedObj = tiposCacheRef.current.find((t) => t.codigo === value);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
        <div style={{ flex: 1 }}>
          <FloatingField label={label} required={required} value={value} onChange={handleChange}>
            <Input
              readOnly
              value={value ? `${selectedObj?.codigo || value} - ${toTitleCase(selectedObj?.nombre || '')}` : ''}
              placeholder=" "
            />
          </FloatingField>
        </div>
        <Button
          icon={<SearchOutlined />}
          onClick={() => setModalOpen(true)}
          disabled={disabled}
        />
      </div>
      <BuscarTipoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={(tipo) => {
          onChange?.(tipo.codigo);
          setModalOpen(false);
        }}
        tipoDocumento={tipoDocumento}
        tipoEntidad={tipoEntidad}
      />
    </>
  );
};

export default CampoTipo;
