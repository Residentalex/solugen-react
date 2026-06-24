import React from 'react';
import { Tooltip, Typography } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { codigoSucursalANumero, obtenerNombreSucursal } from '../utils/sucursalEnumMapper';
import type { Sucursal } from '../types/auth';

const { Text } = Typography;

interface Props {
  codigoSucursal?: string | null;
}

const SucursalField: React.FC<Props> = ({ codigoSucursal }) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setSucursalActiva = useAuthStore((s) => s.setSucursalActiva);
  const sucursalesPermitidas = useAuthStore((s) => s.sucursalesPermitidas);

  const sucursalNumero = codigoSucursalANumero(codigoSucursal);
  const nombre = obtenerNombreSucursal(codigoSucursal);

  if (sucursalNumero === null) return <>{'Consolidado'}</>;

  const esMismaSucursal = sucursalNumero === sucursalActiva;
  const tienePermiso = sucursalesPermitidas.some((s: any) => s.sucursal === sucursalNumero);

  const handleClick = async () => {
    if (esMismaSucursal || !tienePermiso) return;
    await setSucursalActiva(sucursalNumero as Sucursal);
    window.location.reload();
  };

  if (esMismaSucursal || !tienePermiso) {
    return <span>{nombre}</span>;
  }

  return (
    <Tooltip title={`Haz clic para cambiar a ${nombre}`}>
      <a onClick={handleClick} style={{ cursor: 'pointer', color: '#556ee6' }}>
        {nombre} <SwapOutlined />
      </a>
    </Tooltip>
  );
};

export default SucursalField;
