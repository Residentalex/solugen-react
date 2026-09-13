import React from 'react';
import { Card, Tag } from 'antd';
import { IdcardOutlined, PhoneOutlined, EnvironmentOutlined, UserOutlined, TagOutlined } from '@ant-design/icons';
import { toTitleCase } from '../utils/formats';

const TIPO_IDENTIFICACION_LABEL: Record<string, string> = {
  '0': 'RNC',
  '1': 'Cédula',
  '2': 'Pasaporte',
  rnc: 'RNC',
  cedula: 'Cédula',
  pasaporte: 'Pasaporte',
};

interface EntidadCardData {
  nombre?: string;
  codigo?: string;
  identificacion?: string;
  tipoIdentificacion?: string | number;
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
  const codigo = entidad?.codigo || entidadSecundaria?.codigo || '';
  const identificacion = entidad?.identificacion || entidadSecundaria?.identificacion || '';
  const tipoIdentificacionRaw = entidad?.tipoIdentificacion ?? entidadSecundaria?.tipoIdentificacion;
  const tipoIdentLabel = tipoIdentificacionRaw !== undefined && tipoIdentificacionRaw !== null && tipoIdentificacionRaw !== ''
    ? TIPO_IDENTIFICACION_LABEL[String(tipoIdentificacionRaw).toLowerCase()]
    : undefined;
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
        {codigo && (
          <div style={{ fontSize: 13 }}>
            <TagOutlined style={{ color: '#556ee6', marginRight: 8 }} />
            {codigo}
          </div>
        )}
        {identificacion && identificacion !== '-' && (
          <div style={{ fontSize: 13 }}>
            <IdcardOutlined style={{ color: '#556ee6', marginRight: 8 }} />
            {tipoIdentLabel && <span style={{ color: '#8c8c8c', marginRight: 4 }}>{tipoIdentLabel}:</span>}
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
