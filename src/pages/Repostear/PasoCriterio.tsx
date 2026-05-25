import React, { useState, useEffect, useCallback } from 'react';
import { DatePicker, Select, Input, Row, Col, Typography, Space, message } from 'antd';
import {
  UserOutlined,
  BookOutlined,
  BankOutlined,
  CalendarOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { conceptosApi } from '../../api/conceptosApi';
import { useUIStore } from '../../stores/uiStore';
import { hexToRgba } from '../../utils/themeUtils';
import type { SubCriterio } from './Repostear';
import type { Sucursal } from '../../types/auth';

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Search } = Input;

const TIPOS_DOCUMENTO = [
  { value: 'ENP', label: 'ENP - Entrada de Almacén' },
  { value: 'SAP', label: 'SAP - Salida de Almacén' },
  { value: 'FAC', label: 'FAC - Factura a Cliente' },
  { value: 'DEV', label: 'DEV - Devolución de Venta' },
  { value: 'DVC', label: 'DVC - Devolución de Compra' },
  { value: 'RDE', label: 'RDE - Factura de Suplidor' },
  { value: 'TRA', label: 'TRA - Transferencia' },
  { value: 'DEP', label: 'DEP - Documento Bancario' },
  { value: 'EDI', label: 'EDI - Entrada de Diario' },
];

const SUB_CRITERIOS: { value: SubCriterio; label: string; icon: React.ReactNode; description: string; color: string }[] = [
  {
    value: 'entidad',
    label: 'Entidad',
    icon: <UserOutlined />,
    description: 'Filtrar por entidad (cliente, suplidor)',
    color: '#556ee6',
  },
  {
    value: 'concepto',
    label: 'Concepto',
    icon: <BookOutlined />,
    description: 'Filtrar por concepto contable',
    color: '#faad14',
  },
  {
    value: 'cuentaBancaria',
    label: 'Cta. Bancaria',
    icon: <BankOutlined />,
    description: 'Filtrar por cuenta bancaria',
    color: '#13c2c2',
  },
  {
    value: 'soloFecha',
    label: 'Solo Fecha',
    icon: <CalendarOutlined />,
    description: 'Sin filtro adicional, solo rango de fechas',
    color: '#52c41a',
  },
];

interface Props {
  sucursal: Sucursal;
  tipoDoc: string;
  fechaDesde: string;
  fechaHasta: string;
  subCriterio: SubCriterio | null;
  entidadCodigo: string;
  conceptoCodigo: string;
  cuentaBancaria: string;
  onTipoDocChange: (v: string) => void;
  onFechasChange: (desde: string, hasta: string) => void;
  onSubCriterioChange: (sc: SubCriterio) => void;
  onEntidadChange: (v: string) => void;
  onConceptoChange: (v: string) => void;
  onCuentaBancariaChange: (v: string) => void;
  /** Si se pasa, filtra los tipos de documento a solo estos valores */
  tiposPermitidos?: string[];
}

function formatDateParamLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${day}${hh}${mm}${ss}`;
}

const PasoCriterio: React.FC<Props> = ({
  sucursal,
  tipoDoc,
  subCriterio,
  entidadCodigo,
  conceptoCodigo,
  cuentaBancaria,
  onTipoDocChange,
  onFechasChange,
  onSubCriterioChange,
  onEntidadChange,
  onConceptoChange,
  onCuentaBancariaChange,
  tiposPermitidos,
}) => {
  const [conceptos, setConceptos] = useState<{ codigo: string; nombre: string }[]>([]);
  const [loadingConceptos, setLoadingConceptos] = useState(false);
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const primaryColor = useUIStore((s) => s.primaryColor);

  const tiposMostrar = tiposPermitidos
    ? TIPOS_DOCUMENTO.filter((t) => tiposPermitidos.includes(t.value))
    : TIPOS_DOCUMENTO;

  const cargarConceptos = useCallback(async () => {
    if (!tipoDoc) return;
    setLoadingConceptos(true);
    try {
      const result = await conceptosApi.obtenerConceptos(sucursal);
      setConceptos(result.map((c: any) => ({ codigo: c.codigo, nombre: c.nombre })));
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar conceptos');
    } finally {
      setLoadingConceptos(false);
    }
  }, [sucursal, tipoDoc]);

  useEffect(() => {
    if (tipoDoc && subCriterio === 'concepto') {
      cargarConceptos();
    }
  }, [tipoDoc, subCriterio, cargarConceptos]);

  return (
    <div>
      <Text
        style={{
          display: 'block',
          marginBottom: 24,
          fontSize: 16,
          color: primaryColor,
          fontWeight: 500,
        }}
      >
        Configure los criterios de búsqueda para repostear
      </Text>

      {/* Tipo de documento y rango de fechas */}
      <div className="repostear-filters-panel">
        <Space wrap size={12}>
          <Select
            placeholder="Tipo de documento"
            value={tipoDoc || undefined}
            onChange={onTipoDocChange}
            style={{ width: 280 }}
            options={tiposMostrar}
          />
          <RangePicker
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                onFechasChange(
                  formatDateParamLocal(dates[0].toDate()),
                  formatDateParamLocal(dates[1].toDate())
                );
              }
            }}
          />
        </Space>
      </div>

      {/* Sub-criterio */}
      <Text
        style={{
          display: 'block',
          marginBottom: 12,
          marginTop: 20,
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        Sub-criterio de búsqueda
      </Text>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {SUB_CRITERIOS.map((sc) => {
          const isSelected = subCriterio === sc.value;
          return (
            <Col xs={12} sm={6} key={sc.value}>
              <div
                className={`repostear-tile ${isSelected ? 'repostear-tile--selected' : ''}`}
                onClick={() => onSubCriterioChange(sc.value)}
                style={{ padding: '16px 12px', textAlign: 'center' }}
              >
                <CheckCircleFilled className="repostear-tile__check" />
                <div
                  className="repostear-tile__icon-circle"
                  style={{
                    width: 44,
                    height: 44,
                    background: isSelected ? undefined : isDarkMode ? hexToRgba(primaryColor, 0.2) : sc.color + '18',
                  }}
                >
                  {React.isValidElement(sc.icon) && React.cloneElement(sc.icon as React.ReactElement<{style?: React.CSSProperties}>, {
                    style: { fontSize: 20, color: isSelected ? '#fff' : (sc.value === 'entidad' ? primaryColor : sc.color) },
                  })}
                </div>
                <Text
                  strong
                  style={{
                    fontSize: 12,
                    color: isSelected ? primaryColor : isDarkMode ? '#e0e0e0' : '#333',
                    display: 'block',
                    marginTop: 8,
                  }}
                >
                  {sc.label}
                </Text>
                <Text type="secondary" style={{ fontSize: 10 }}>
                  {sc.description}
                </Text>
              </div>
            </Col>
          );
        })}
      </Row>

      {/* Campo adicional según sub-criterio con animación */}
      {subCriterio === 'entidad' && (
        <div className="repostear-expand-enter" style={{ maxWidth: 400 }}>
          <Text style={{ display: 'block', marginBottom: 8 }}>Código de Entidad</Text>
          <Search
            placeholder="Ingrese el código de la entidad"
            value={entidadCodigo}
            onChange={(e) => onEntidadChange(e.target.value)}
            enterButton="Buscar"
          />
        </div>
      )}

      {subCriterio === 'concepto' && (
        <div className="repostear-expand-enter" style={{ maxWidth: 400 }}>
          <Text style={{ display: 'block', marginBottom: 8 }}>Concepto</Text>
          <Select
            showSearch
            placeholder="Seleccione un concepto"
            value={conceptoCodigo || undefined}
            onChange={onConceptoChange}
            loading={loadingConceptos}
            style={{ width: '100%' }}
            options={conceptos.map((c) => ({
              value: c.codigo,
              label: `${c.codigo} - ${c.nombre}`,
            }))}
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase()) ?? false
            }
          />
        </div>
      )}

      {subCriterio === 'cuentaBancaria' && (
        <div className="repostear-expand-enter" style={{ maxWidth: 400 }}>
          <Text style={{ display: 'block', marginBottom: 8 }}>Cuenta Bancaria</Text>
          <Search
            placeholder="Ingrese el número de cuenta bancaria"
            value={cuentaBancaria}
            onChange={(e) => onCuentaBancariaChange(e.target.value)}
            enterButton="Buscar"
          />
        </div>
      )}

      {subCriterio === 'soloFecha' && (
        <div className="repostear-expand-enter">
          <Text type="secondary">
            Se repostearán todos los documentos del tipo seleccionado en el rango de fechas indicado.
          </Text>
        </div>
      )}
    </div>
  );
};

export default PasoCriterio;