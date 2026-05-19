import React from 'react';
import { Row, Col, Typography } from 'antd';
import {
  FileSearchOutlined,
  WarningOutlined,
  FilterOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import type { MetodoPosteo } from './Repostear';

const { Text } = Typography;

interface Props {
  value: MetodoPosteo | null;
  onChange: (metodo: MetodoPosteo) => void;
}

const METODOS: { value: MetodoPosteo; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    value: 'documento',
    label: 'Un Documento',
    description: 'Buscar y repostear un documento individual por su número',
    icon: <FileSearchOutlined />,
    color: '#556ee6',
  },
  {
    value: 'noCuadrados',
    label: 'Asientos No Cuadrados',
    description: 'Buscar documentos con asientos contables que no cuadran',
    icon: <WarningOutlined />,
    color: '#faad14',
  },
  {
    value: 'criterio',
    label: 'Según Criterio',
    description: 'Repostear documentos filtrando por tipo, fecha, entidad, concepto o cuenta bancaria',
    icon: <FilterOutlined />,
    color: '#52c41a',
  },
];

const PasoMetodo: React.FC<Props> = ({ value, onChange }) => {
  const isDarkMode = useUIStore((s) => s.isDarkMode);

  return (
    <div>
      <Text
        style={{
          display: 'block',
          marginBottom: 24,
          fontSize: 16,
          color: '#556ee6',
          fontWeight: 500,
        }}
      >
        Seleccione el método de posteo
      </Text>

      <Row gutter={[20, 20]}>
        {METODOS.map((m) => {
          const isSelected = value === m.value;

          return (
            <Col xs={24} md={8} key={m.value}>
              <div
                className={`repostear-tile ${isSelected ? 'repostear-tile--selected' : ''}`}
                onClick={() => onChange(m.value)}
                style={{ padding: '28px 20px', textAlign: 'center', minHeight: 200 }}
              >
                <CheckCircleFilled className="repostear-tile__check" />

                <div
                  className="repostear-tile__icon-circle"
                  style={isSelected ? {} : { background: isDarkMode ? 'rgba(85,110,230,0.2)' : '#f0f3ff' }}
                >
                  {React.cloneElement(m.icon, {
                    style: { fontSize: 28, color: isSelected ? '#fff' : m.color },
                  })}
                </div>

                <Text
                  strong
                  style={{
                    fontSize: 16,
                    color: isSelected ? '#556ee6' : isDarkMode ? '#e0e0e0' : '#333',
                    display: 'block',
                    marginBottom: 8,
                  }}
                >
                  {m.label}
                </Text>
                <Text
                  type="secondary"
                  style={{ fontSize: 13, lineHeight: 1.5 }}
                >
                  {m.description}
                </Text>
              </div>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default PasoMetodo;