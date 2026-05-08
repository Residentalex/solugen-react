import React from 'react';
import { Menu } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import type { MenuProps } from 'antd';
import type { PantallaDTO } from '../types/auth';
import {
  BankOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  SettingOutlined,
  DollarOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  ToolOutlined,
  BuildOutlined,
  DashboardOutlined,
} from '@ant-design/icons';

const ICONOS_MODULOS: Record<string, React.ReactNode> = {
  Administracion: <SettingOutlined />,
  Contabilidad: <BankOutlined />,
  Inventario: <ShoppingCartOutlined />,
  Ventas: <ShoppingOutlined />,
  Facturacion: <ShoppingOutlined />,
  Compras: <ShoppingCartOutlined />,
  'Recursos humanos': <TeamOutlined />,
  'Cuentas por pagar': <DollarOutlined />,
  'Cuentas por cobrar': <CreditCardOutlined />,
  Bancos: <BankOutlined />,
  Produccion: <BuildOutlined />,
};

const ICONO_DEFAULT = <FileTextOutlined />;

const Sidebar: React.FC = () => {
  const usuario = useAuthStore((s: any) => s.usuario);
  const activeModule = useUIStore((s: any) => s.activeModule);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const sidebarCollapsed = useUIStore((s: any) => s.sidebarCollapsed);
  const navigate = useNavigate();

  const menuItems: MenuProps['items'] = React.useMemo(() => {
    const pantallas: PantallaDTO[] = usuario?.pantallas || [];

    const items: MenuProps['items'] = [
      {
        key: 'dashboard',
        icon: <DashboardOutlined />,
        label: 'Dashboard',
      },
    ];

    if (!pantallas.length) return items;

    const modulosMap = new Map<string, PantallaDTO[]>();

    for (const p of pantallas) {
      const modulos = p.modulos || [];
      if (modulos.length > 0) {
        for (const m of modulos) {
          const nombre = m.nombre || 'Otros';
          if (!modulosMap.has(nombre)) modulosMap.set(nombre, []);
          modulosMap.get(nombre)!.push(p);
        }
      } else {
        const nombre = 'Otros';
        if (!modulosMap.has(nombre)) modulosMap.set(nombre, []);
        modulosMap.get(nombre)!.push(p);
      }
    }

    const modulosItems = Array.from(modulosMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([moduloNombre, pantallasModulo]) => {
        const children = pantallasModulo
          .filter((p, i, arr) => arr.findIndex((x) => x.codigo === p.codigo) === i)
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
          .map((p) => ({
            key: p.codigo,
            label: p.nombre,
          }));

        if (children.length === 0) return null;

        return {
          key: moduloNombre,
          icon: ICONOS_MODULOS[moduloNombre] || ICONO_DEFAULT,
          label: moduloNombre,
          children,
        };
      })
      .filter(Boolean) as MenuProps['items'];

    items.push(...modulosItems);
    return items;
  }, [usuario?.pantallas]);

  const handleMenuClick = ({ key }: { key: string }) => {
    setActiveModule(key);
    if (key === 'dashboard') {
      navigate('/');
    } else {
      navigate(`/${key}`);
    }
  };

  return (
    <Menu
      mode="inline"
      selectedKeys={activeModule ? [activeModule] : []}
      defaultOpenKeys={[]}
      style={{ borderRight: 0, fontSize: 14 }}
      items={menuItems}
      onClick={handleMenuClick}
      inlineIndent={sidebarCollapsed ? 8 : 20}
    />
  );
};

export default Sidebar;
