import React from 'react';
import {
  AccountBookOutlined,
  AlertOutlined,
  ApiOutlined,
  AppstoreOutlined,
  AreaChartOutlined,
  AuditOutlined,
  BankOutlined,
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  BuildOutlined,
  CalculatorOutlined,
  CarOutlined,
  CalendarOutlined,
  ClusterOutlined,
  CloudServerOutlined,
  CodeOutlined,
  CompassOutlined,
  ContainerOutlined,
  ControlOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  DollarOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FileExcelOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FireOutlined,
  FlagOutlined,
  FolderOpenOutlined,
  GiftOutlined,
  GoldOutlined,
  HeartOutlined,
  HomeOutlined,
  IdcardOutlined,
  InboxOutlined,
  KeyOutlined,
  LaptopOutlined,
  LayoutOutlined,
  LineChartOutlined,
  LockOutlined,
  MailOutlined,
  MobileOutlined,
  MoneyCollectOutlined,
  NodeIndexOutlined,
  NotificationOutlined,
  PaperClipOutlined,
  PartitionOutlined,
  PhoneOutlined,
  PieChartOutlined,
  PrinterOutlined,
  ProfileOutlined,
  PushpinOutlined,
  QrcodeOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  ScheduleOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  StockOutlined,
  SolutionOutlined,
  StarOutlined,
  TagsOutlined,
  TeamOutlined,
  ToolOutlined,
  TruckOutlined,
  UploadOutlined,
  UserOutlined,
  VideoCameraOutlined,
  WalletOutlined,
} from '@ant-design/icons';

export type ComponenteIcono = React.ComponentType<{ style?: React.CSSProperties }>;

/**
 * Catalogo de iconos disponibles para los modulos.
 *
 * La clave es el nombre del componente en @ant-design/icons y es lo que se
 * persiste en AUTH_MODULO.ICONO. Solo se pueden elegir keys de este mapa:
 * si la BD tiene un nombre que no existe aqui, se cae al icono por defecto.
 */
export const CATALOGO_ICONOS_MODULO: Record<string, ComponenteIcono> = {
  AccountBookOutlined,
  AlertOutlined,
  ApiOutlined,
  AppstoreOutlined,
  AreaChartOutlined,
  AuditOutlined,
  BankOutlined,
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  BuildOutlined,
  CalculatorOutlined,
  CarOutlined,
  CalendarOutlined,
  ClusterOutlined,
  CloudServerOutlined,
  CodeOutlined,
  CompassOutlined,
  ContainerOutlined,
  ControlOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  DollarOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FileExcelOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FireOutlined,
  FlagOutlined,
  FolderOpenOutlined,
  GiftOutlined,
  GoldOutlined,
  HeartOutlined,
  HomeOutlined,
  IdcardOutlined,
  InboxOutlined,
  KeyOutlined,
  LaptopOutlined,
  LayoutOutlined,
  LineChartOutlined,
  LockOutlined,
  MailOutlined,
  MobileOutlined,
  MoneyCollectOutlined,
  NodeIndexOutlined,
  NotificationOutlined,
  PaperClipOutlined,
  PartitionOutlined,
  PhoneOutlined,
  PieChartOutlined,
  PrinterOutlined,
  ProfileOutlined,
  PushpinOutlined,
  QrcodeOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  ScheduleOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  StockOutlined,
  SolutionOutlined,
  StarOutlined,
  TagsOutlined,
  TeamOutlined,
  ToolOutlined,
  TruckOutlined,
  UploadOutlined,
  UserOutlined,
  VideoCameraOutlined,
  WalletOutlined,
};

export const CLAVES_ICONOS_MODULO = Object.keys(CATALOGO_ICONOS_MODULO);

export const ICONO_DEFAULT = <AppstoreOutlined />;

/** Normaliza el nombre del modulo para comparar sin tildes, espacios y mayusculas. */
function normalizar(texto?: string | null): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

/** Fallback por nombre, para modulos todavia sin ICONO en AUTH_MODULO. */
const ICONOS_POR_NOMBRE: Record<string, string> = {
  ADMINISTRACION: 'ControlOutlined',
  CONTABILIDAD: 'AuditOutlined',
  INVENTARIO: 'InboxOutlined',
  FACTURACION: 'FileTextOutlined',
  COMPRAS: 'ShoppingCartOutlined',
  'CUENTAS POR PAGAR': 'WalletOutlined',
  'CUENTAS POR COBRAR': 'DollarOutlined',
  BANCOS: 'BankOutlined',
  'RECURSOS HUMANOS': 'TeamOutlined',
  PRODUCCION: 'ExperimentOutlined',
  ECOMMERCE: 'ShopOutlined',
  'ACTIVOS FIJOS': 'ToolOutlined',
};

export interface ModuloIconoLike {
  nombre?: string | null;
  icono?: string | null;
}

/**
 * Resuelve el icono de un modulo. Prioridad:
 * 1. `icono` persistido en AUTH_MODULO (editable desde Mmodulo).
 * 2. Fallback por nombre, para modulos previos a la columna ICONO.
 * 3. AppstoreOutlined.
 */
export function obtenerIconoModulo(modulo?: ModuloIconoLike | string | null): React.ReactNode {
  if (!modulo) return ICONO_DEFAULT;

  if (typeof modulo === 'string') {
    return obtenerIconoModulo({ nombre: modulo });
  }

  const nombreIcono = (modulo.icono || '').trim();
  if (nombreIcono && CATALOGO_ICONOS_MODULO[nombreIcono]) {
    const Componente = CATALOGO_ICONOS_MODULO[nombreIcono];
    return <Componente />;
  }

  const porNombre = ICONOS_POR_NOMBRE[normalizar(modulo.nombre)];
  if (porNombre) {
    const Componente = CATALOGO_ICONOS_MODULO[porNombre];
    if (Componente) return <Componente />;
  }

  return ICONO_DEFAULT;
}

/** Devuelve el componente del icono de un modulo, sin renderizar, para previews. */
export function obtenerComponenteIconoModulo(modulo?: ModuloIconoLike | null): ComponenteIcono {
  if (!modulo) return CATALOGO_ICONOS_MODULO.AppstoreOutlined;

  const nombreIcono = (modulo.icono || '').trim();
  if (nombreIcono && CATALOGO_ICONOS_MODULO[nombreIcono]) {
    return CATALOGO_ICONOS_MODULO[nombreIcono];
  }

  const porNombre = ICONOS_POR_NOMBRE[normalizar(modulo.nombre)];
  if (porNombre && CATALOGO_ICONOS_MODULO[porNombre]) {
    return CATALOGO_ICONOS_MODULO[porNombre];
  }

  return CATALOGO_ICONOS_MODULO.AppstoreOutlined;
}