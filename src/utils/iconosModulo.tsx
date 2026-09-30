import React from 'react';
import {
  BankOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
  ControlOutlined,
  AuditOutlined,
  ShopOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  InboxOutlined,
  TeamOutlined,
  WalletOutlined,
  DollarOutlined,
} from '@ant-design/icons';

export const ICONOS_MODULOS: Record<string, React.ReactNode> = {
  Administracion: <ControlOutlined />,
  Contabilidad: <AuditOutlined />,
  Inventario: <InboxOutlined />,
  Ventas: <ShopOutlined />,
  Facturacion: <FileTextOutlined />,
  Compras: <ShoppingCartOutlined />,
  'Recursos Humanos': <TeamOutlined />,
  'Cuentas por Pagar': <WalletOutlined />,
  'Cuentas por Cobrar': <DollarOutlined />,
  Bancos: <BankOutlined />,
  Produccion: <ExperimentOutlined />,
};

export const ICONO_DEFAULT = <AppstoreOutlined />;

export function obtenerIconoModulo(nombreModulo?: string | null): React.ReactNode {
  if (!nombreModulo) return ICONO_DEFAULT;
  return ICONOS_MODULOS[nombreModulo] || ICONO_DEFAULT;
}
