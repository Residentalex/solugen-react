import React from 'react';
import { Menu } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import type { MenuProps } from 'antd';
import type { PantallaDTO, ModuloDTO } from '../types/auth';
import {
  BankOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  SettingOutlined,
  DollarOutlined,
  CreditCardOutlined,
  BuildOutlined,
  DashboardOutlined,
  AppstoreOutlined,
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
  Administracion: <SettingOutlined />,
};

const ICONO_DEFAULT = <AppstoreOutlined />;

interface ModuloConPantallas {
  modulo: ModuloDTO;
  pantallas: PantallaDTO[];
}

const Sidebar: React.FC = () => {
  const usuario = useAuthStore((s: any) => s.usuario);
  const activeModule = useUIStore((s: any) => s.activeModule);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const sidebarCollapsed = useUIStore((s: any) => s.sidebarCollapsed);
  const [openKeys, setOpenKeys] = React.useState<string[]>([]);
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

    const modulosMap = new Map<number, ModuloConPantallas>();

    for (const p of pantallas) {
      const modulos = p.modulos || [];
      if (modulos.length > 0) {
        for (const m of modulos) {
          if (!modulosMap.has(m.id)) {
            modulosMap.set(m.id, { modulo: m, pantallas: [] });
          }
          const entry = modulosMap.get(m.id)!;
          if (!entry.pantallas.some((x) => x.codigo === p.codigo)) {
            entry.pantallas.push(p);
          }
        }
      }
    }

    const buildChildren = (modPantallas: PantallaDTO[], moduloNombre: string): MenuProps['items'] => {
      const topLevel = modPantallas.filter((p) => !p.pantallaPadreID);
      const childMap = new Map<number, PantallaDTO[]>();
      for (const p of modPantallas) {
        if (p.pantallaPadreID) {
          const pid = p.pantallaPadreID;
          if (!childMap.has(pid)) childMap.set(pid, []);
          childMap.get(pid)!.push(p);
        }
      }
      for (const [, children] of childMap) {
        children.sort((a, b) => a.orden - b.orden);
      }

      const grupos = new Map<string, PantallaDTO[]>();
      const sinGrupo: PantallaDTO[] = [];

      for (const p of topLevel) {
        if (p.grupo) {
          if (!grupos.has(p.grupo)) grupos.set(p.grupo, []);
          grupos.get(p.grupo)!.push(p);
        } else {
          sinGrupo.push(p);
        }
      }

      for (const [, items] of grupos) {
        items.sort((a, b) => a.orden - b.orden);
      }
      sinGrupo.sort((a, b) => a.orden - b.orden);

      const children: MenuProps['items'] = [];

      const sortedGrupos = Array.from(grupos.entries()).sort(([a], [b]) => a.localeCompare(b));

      for (const [grupoNombre, grupoPantallas] of sortedGrupos) {
        children.push({
          key: `submenu_${moduloNombre}_${grupoNombre}`,
          label: <span className="menu-group-label">{grupoNombre}</span>,
          children: grupoPantallas.map((p) => {
            const subItems = childMap.get(p.id);
            if (subItems && subItems.length > 0) {
              return {
                key: p.codigo,
                label: p.nombre,
                children: subItems.map((child) => ({
                  key: child.codigo,
                  label: child.nombre,
                })),
              };
            }
            return { key: p.codigo, label: p.nombre };
          }),
        });
      }

      for (const p of sinGrupo) {
        const subItems = childMap.get(p.id);
        if (subItems && subItems.length > 0) {
          children.push({
            key: p.codigo,
            label: p.nombre,
            children: subItems.map((child) => ({
              key: child.codigo,
              label: child.nombre,
            })),
          });
        } else {
          children.push({ key: p.codigo, label: p.nombre });
        }
      }

      return children;
    };

    const sortedModulos = Array.from(modulosMap.entries())
      .sort(([, a], [, b]) => a.modulo.orden - b.modulo.orden)
      .map(([, entry]) => entry);

    const modulosItems: MenuProps['items'] = sortedModulos
      .map(({ modulo, pantallas: modPantallas }) => {
        const children = buildChildren(modPantallas, modulo.nombre);
        if (!children || children.length === 0) return null;

        return {
          key: modulo.nombre,
          icon: ICONOS_MODULOS[modulo.nombre] || ICONO_DEFAULT,
          label: <span className="menu-module-label">{modulo.nombre}</span>,
          children,
        };
      })
      .filter(Boolean) as MenuProps['items'];

    items.push(...(modulosItems || []));
    return items;
  }, [usuario?.pantallas]);

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key.startsWith('_grupo_') || key.startsWith('submenu_')) return;
    setActiveModule(key);
    if (key === 'dashboard') {
      navigate('/');
    } else {
      navigate(`/${key}`);
    }
  };

  const handleOpenChange = (keys: string[]) => {
    const topKeys = keys.filter(k => !k.startsWith('submenu_'));
    const lastTop = topKeys[topKeys.length - 1];
    if (!lastTop) { setOpenKeys([]); return; }
    const related = keys.filter(k => k === lastTop || k.startsWith(`submenu_${lastTop}_`));
    setOpenKeys(related);
  };

  return (
    <Menu
      mode="inline"
      theme="dark"
      selectedKeys={activeModule ? [activeModule] : []}
      openKeys={openKeys}
      defaultOpenKeys={[]}
      style={{ borderRight: 0, fontSize: 13, background: 'transparent' }}
      items={menuItems}
      onClick={handleMenuClick}
      onOpenChange={handleOpenChange}
      inlineIndent={sidebarCollapsed ? 8 : 16}
      className="sidebar-menu"
    />
  );
};

export default Sidebar;
