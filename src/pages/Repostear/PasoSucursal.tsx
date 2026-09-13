import React from 'react';
import { Row, Col, Typography } from 'antd';
import { BankOutlined, CheckCircleFilled, ShopOutlined, HomeOutlined, PieChartOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { Sucursal } from '../../types/auth';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useCompanyStore } from '../../stores/companyStore';

const { Text } = Typography;

interface Props {
  value: Sucursal | null;
  onChange: (sucursal: Sucursal) => void;
}

const ICONOS_SUCURSAL: Record<string, React.ReactNode> = {
  OrensePlaza: <ShopOutlined />,
  HiperRomana: <BankOutlined />,
  OrenseVillaHermosa: <HomeOutlined />,
  ElOfertazo: <ShoppingCartOutlined />,
  Consolidado: <PieChartOutlined />,
  Compra: <PieChartOutlined />,
};

/** Convierte el valor numérico Sucursal a su clave string (ej: 0 → "OrensePlaza") */
function sucursalKey(valor: number): string | undefined {
  return (Object.keys(Sucursal) as (keyof typeof Sucursal)[]).find(
    (k) => Sucursal[k] === valor,
  );
}

/** Obtiene la lista de sucursales incluyendo siempre la Consolidado al inicio */
function obtenerSucursalesConConsolidado(sucursalesData: any[]): {
  value: Sucursal;
  label: string;
  icon: React.ReactNode;
}[] {
  // 1. Obtener sucursales de la empresa como de costumbre
  const baseSucursales: {
    value: Sucursal;
    label: string;
    icon: React.ReactNode;
  }[] = (sucursalesData || [])
    .filter((s: any) => s.sucursal !== undefined && s.sucursal !== null)
    .map((s: any) => ({
      value: s.sucursal as Sucursal,
      label: s.nombre,
      icon: ICONOS_SUCURSAL[sucursalKey(s.sucursal) || ''] || <BankOutlined />,
    }));

  // 2. Verificar si ya viene Consolidado de la empresa
  const yaTieneConsolidado = baseSucursales.some(
    (s) => s.value === Sucursal.Consolidado,
  );

  // 3. Si no, agregarlo al inicio con su etiqueta y ícono
  if (!yaTieneConsolidado) {
    return [
      {
        value: Sucursal.Consolidado,
        label: 'Consolidado',
        icon: ICONOS_SUCURSAL.Consolidado || <PieChartOutlined />,
      },
      ...baseSucursales,
    ];
  }

  // 4. Si ya venía, devolver tal como está
  return baseSucursales;
}

const PasoSucursal: React.FC<Props> = ({ value, onChange }) => {
  const sucursalesPermitidas = useAuthStore((s) => s.sucursalesPermitidas);
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const primaryColor = useUIStore((s) => s.primaryColor);
  const sucursalesData = useCompanyStore((s) => s.data.sucursales);

  const SUCURSALES: { value: Sucursal; label: string; icon: React.ReactNode }[] = obtenerSucursalesConConsolidado(sucursalesData);

  const sucursalesMostrar = SUCURSALES.filter((s) =>
    sucursalesPermitidas.some((sp) =>
      typeof sp.sucursal === 'string'
        ? sucursalId(sp.sucursal) === s.value
        : sp.sucursal === s.value
    )
  );

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
        Seleccione la sucursal sobre la cual desea repostear documentos
      </Text>

      <Row gutter={[16, 16]}>
        {sucursalesMostrar.map((s) => {
          const isSelected = value === s.value;

          return (
            <Col xs={24} sm={12} md={6} key={s.value}>
              <div
                className={`repostear-tile ${isSelected ? 'repostear-tile--selected' : ''}`}
                onClick={() => onChange(s.value)}
                style={{ padding: '24px 16px', textAlign: 'center', minHeight: 160 }}
              >
                <CheckCircleFilled className="repostear-tile__check" />

                <div className="repostear-tile__icon-circle">
                  {React.isValidElement(s.icon) && React.cloneElement(s.icon as React.ReactElement<{style?: React.CSSProperties}>, {
                    style: { fontSize: 24, color: primaryColor },
                  })}
                </div>

                <Text
                  strong
                  className="repostear-tile__label"
                  style={{
                    fontSize: 14,
                    color: isSelected ? primaryColor : isDarkMode ? '#e0e0e0' : '#333',
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  {s.label}
                </Text>
              </div>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default PasoSucursal;