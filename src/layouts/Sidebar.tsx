import React from 'react';
import { Menu } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { moduloApi } from '../api/moduloApi';
import { useUIStore } from '../stores/uiStore';
import type { MenuProps } from 'antd';
import type { PantallaDTO, ModuloDTO } from '../types/auth';
import { DashboardOutlined } from '@ant-design/icons';
import { ICONOS_MODULOS, ICONO_DEFAULT } from '../utils/iconosModulo';

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
  const [modulosOcultosIds, setModulosOcultosIds] = React.useState<Set<number>>(new Set());

  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  React.useEffect(() => {
    if (sucursalActiva == null) return;
    let ignored = false;
    moduloApi.obtenerTodo(Number(sucursalActiva)).then((mods) => {
      if (ignored) return;
      const ocultos = new Set(mods.filter((m: any) => !!m.oculto || !!(m as any).Oculto).map((m: any) => m.id));
      setModulosOcultosIds(ocultos);
    }).catch(() => {
      if (!ignored) setModulosOcultosIds(new Set());
    });
    return () => { ignored = true; };
  }, [sucursalActiva]);

  const navigate = useNavigate();
  const location = useLocation();

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
          const oculto = !!m.oculto || !!(m as any).Oculto || modulosOcultosIds.has(m.id);
          if (oculto) continue;
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
      const parentIdsPresent = new Set(
        modPantallas.filter((p) => !p.pantallaPadreID).map((p) => p.id)
      );
      const topLevel = modPantallas.filter(
        (p) => !p.pantallaPadreID || (p.pantallaPadreID && !parentIdsPresent.has(p.pantallaPadreID))
      );
      const childMap = new Map<number, PantallaDTO[]>();
      for (const p of modPantallas) {
        if (p.pantallaPadreID && parentIdsPresent.has(p.pantallaPadreID)) {
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

      const ORDEN_GRUPOS = ['Maestros', 'Operaciones', 'Consultas', 'Reportes'];
      const sortedGrupos = Array.from(grupos.entries()).sort(([aNombre], [bNombre]) => {
        const idxA = ORDEN_GRUPOS.findIndex(g => g.toLowerCase() === aNombre.toLowerCase());
        const idxB = ORDEN_GRUPOS.findIndex(g => g.toLowerCase() === bNombre.toLowerCase());
        const prioA = idxA >= 0 ? idxA : 999;
        const prioB = idxB >= 0 ? idxB : 999;
        return prioA - prioB;
      });

const makeKey = (codigo: string) => `${moduloNombre}__${codigo}`;

      for (const [grupoNombre, grupoPantallas] of sortedGrupos) {
        if (grupoNombre.toLowerCase() === 'reportes') {
          // Grupo de reportes → un solo item que lleva a la página consolidada
          if (grupoPantallas.length > 0) {
            children.push({
              key: makeKey(`Reportes_${moduloNombre}`),
              label: '📊 Reportes',
            });
          }
        } else {
          children.push({
            key: `submenu_${moduloNombre}_${grupoNombre}`,
            label: <span className="menu-group-label">{grupoNombre}</span>,
            className: grupoPantallas.length > 5 ? 'menu-sub-scroll' : undefined,
            children: grupoPantallas.map((p) => {
              const subItems = childMap.get(p.id);
              if (subItems && subItems.length > 0) {
                return {
                  key: makeKey(p.codigo),
                  label: p.nombre,
                  children: subItems.map((child) => ({
                    key: makeKey(child.codigo),
                    label: child.nombre,
                  })),
                };
              }
              return { key: makeKey(p.codigo), label: p.nombre };
            }),
          });
        }
      }

      for (const p of sinGrupo) {
        const subItems = childMap.get(p.id);
        if (subItems && subItems.length > 0) {
          children.push({
            key: makeKey(p.codigo),
            label: p.nombre,
            children: subItems.map((child) => ({
              key: makeKey(child.codigo),
              label: child.nombre,
            })),
          });
        } else {
          children.push({ key: makeKey(p.codigo), label: p.nombre });
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
  }, [usuario?.pantallas, modulosOcultosIds]);

  // Key real del item activo (la pantalla, no el modulo) y cadena de submenus que la contiene
  const selectedPath = React.useMemo<{ key: string; ancestors: string[] }>(() => {
    const vacio = { key: '', ancestors: [] as string[] };
    if (!menuItems?.length) return vacio;

    // Reportes consolidados: la ruta es /Reportes/:modulo y el item es <modulo>__Reportes_<modulo>
    const segmentos = location.pathname.split('/').filter(Boolean);
    if (segmentos[0] === 'Reportes' && segmentos[1]) {
      const moduloNombre = decodeURIComponent(segmentos[1]);
      const itemReporte = menuItems.find(
        (i: any) => i?.key === `${moduloNombre}__Reportes_${moduloNombre}`
      );
      if (itemReporte) return { key: itemReporte.key as string, ancestors: [itemReporte.key as string] };
    }

    if (!activeModule) return vacio;

    const esActivo = (item: any) =>
      !!item?.key && (item.key === activeModule || item.key.endsWith(`__${activeModule}`));

    const recorrer = (
      items: any[],
      ancestors: string[]
    ): { key: string; ancestors: string[] } | null => {
      for (const item of items) {
        if (!item) continue;
        if (esActivo(item)) return { key: item.key as string, ancestors };
        if (item.children?.length) {
          const encontrado = recorrer(item.children, [...ancestors, item.key as string]);
          if (encontrado) return encontrado;
        }
      }
      return null;
    };

    return recorrer(menuItems, []) || vacio;
  }, [menuItems, activeModule, location.pathname]);

  // Mantener abiertos el modulo y el grupo de la pantalla activa
  React.useEffect(() => {
    const { key, ancestors } = selectedPath;
    if (!key || ancestors.length === 0) return;
    setOpenKeys((prev) => {
      const igual = prev.length === ancestors.length && prev.every((k, i) => k === ancestors[i]);
      return igual ? prev : ancestors;
    });
  }, [selectedPath]);

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key.startsWith('_grupo_') || key.startsWith('submenu_')) return;
    const codigo = key.includes('__') ? key.split('__')[1] : key;
    const moduloNombre = key.includes('__') ? key.split('__')[0] : undefined;

    // Reportes consolidados: navegar con ruta amigable
    if (moduloNombre && codigo.startsWith('Reportes_')) {
      setActiveModule(codigo);
      navigate(`/Reportes/${moduloNombre}`);
      return;
    }

    setActiveModule(codigo);
    if (codigo === 'dashboard') {
      navigate('/');
    } else {
      let moduloID: number | undefined;
      if (moduloNombre) {
        const pantalla = usuario?.pantallas?.find((p: any) => p.codigo === codigo);
        const modulo = pantalla?.modulos?.find((m: any) => m.nombre === moduloNombre);
        moduloID = modulo?.id;
      }
      const params = moduloID !== undefined ? `?modulo=${moduloID}` : '';
      navigate(`/${codigo}${params}`);
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
      selectedKeys={selectedPath.key ? [selectedPath.key] : []}
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
