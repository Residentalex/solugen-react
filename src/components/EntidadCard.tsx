import React from 'react';
import { Card, Tag } from 'antd';
import { IdcardOutlined, PhoneOutlined, EnvironmentOutlined, UserOutlined } from '@ant-design/icons';
import { toTitleCase } from '../utils/formats';

interface EntidadCardData {
  nombre?: string;
  identificacion?: string;
  telefono?: string;
  direccion?: string;
  beneficiario?: string;
  cuentaContable?: { noCuenta?: string; nombre?: string };
  noCuenta?: string;
}

interface EntidadCardProps {
  titulo?: string;
  entidad: EntidadCardData | null;
  entidadSecundaria?: EntidadCardData | null;
  fallbackTitulo?: string;
}

const EntidadCard: React.FC<EntidadCardProps> = ({ titulo, entidad, entidadSecundaria, fallbackTitulo }) => {
  const nombre = entidad?.nombre || entidadSecundaria?.nombre || fallbackTitulo || '';
  const identificacion = entidad?.identificacion || entidadSecundaria?.identificacion || '';
  const telefono = entidad?.telefono || entidadSecundaria?.telefono || '';
  const direccion = entidad?.direccion
    ? toTitleCase(entidad.direccion)
      : entidadSecundaria?.direccion
        ? toTitleCase(entidadSecundaria.direccion)
        : '-';
  const beneficiario = entidad?.beneficiario || entidadSecundaria?.beneficiario || '';

  return (
    <Card
      title={<span style={{ fontSize: 16, fontWeight: 600 }}>{nombre ? toTitleCase(nombre) : (titulo || fallbackTitulo || 'Entidad')}</span>}
      className="paces-card"
      style={{ marginBottom: 16 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {titulo ? (
          <Tag color="blue" style={{ marginBottom: 4 }}>{titulo}</Tag>
        ) : fallbackTitulo && entidad?.nombre ? (
          <Tag style={{ marginBottom: 4 }}>{fallbackTitulo}</Tag>
        ) : null}
        {identificacion && identificacion !== '-' && (
          <div style={{ fontSize: 13 }}>
            <IdcardOutlined style={{ color: '#556ee6', marginRight: 8 }} />
            {identificacion}
          </div>
        )}
        {telefono && telefono !== '-' && (
          <div style={{ fontSize: 13 }}>
            <PhoneOutlined style={{ color: '#556ee6', marginRight: 8 }} />
            {telefono}
          </div>
        )}
        {direccion && direccion !== '-' && (
          <div style={{ fontSize: 13, color: '#595959' }}>
            <EnvironmentOutlined style={{ color: '#556ee6', marginRight: 8 }} />
            {direccion}
          </div>
        )}
        {beneficiario && beneficiario !== '-' && (
          <div style={{ fontSize: 13 }}>
            <UserOutlined style={{ color: '#556ee6', marginRight: 8 }} />
            {toTitleCase(beneficiario)}
          </div>
        )}

        {(entidad?.cuentaContable?.noCuenta || entidad?.noCuenta) && (
          <div style={{ fontSize: 13 }}>
            <span style={{ marginRight: 8 }}>🏦</span>
            Cuenta: {entidad?.cuentaContable?.noCuenta || entidad?.noCuenta}
          </div>
        )}
      </div>
    </Card>
  );
};

export default EntidadCard;
