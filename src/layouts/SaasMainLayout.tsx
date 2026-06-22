import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import {
  Menu, Avatar, Space, Button, Input, Badge, Typography, Dropdown,
} from 'antd';
import {
  ControlOutlined,
  AuditOutlined,
  InboxOutlined,
  ShopOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  WalletOutlined,
  DollarOutlined,
  BankOutlined,
  ExperimentOutlined,
  AppstoreOutlined,
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  PlusOutlined,
  SearchOutlined,
  BellOutlined,
  SunOutlined,
} from '@ant-design/icons';

// ─── Iconos por modulo ───────────────────────────────────────────
const ICONOS_MODULOS: Record<string, React.ReactNode> = {
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
const ICONO_DEFAULT = <AppstoreOutlined />;

// ─── Helpers ─────────────────────────────────────────────────────
interface ModuloConPantallas {
  modulo: ModuloDTO;
  pantallas: PantallaDTO[];
}

function toTitleCase(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── SaasMainLayout ──────────────────────────────────────────────
const SaasMainLayout: React.FC = () => {
  const navigate = useNavigate();
  const usuario = useAuthStore((s) => s.usuario);
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const activeModule = useUIStore((s) => s.activeModule);
  const setActiveModule = useUIStore((s) => s.setActiveModule);

  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = React.useState(false);

  // ─── Efectos ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated && usuario?.debeCambiarClave) {
      navigate('/cambiar-clave', { replace: true });
    }
  }, [isAuthenticated, usuario?.debeCambiarClave, navigate]);

  // Ctrl+K para busqueda
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── Construir menu desde pantallas ──────────────────────────
  const menuItems: MenuProps['items'] = useMemo(() => {
    const pantallas: PantallaDTO[] = usuario?.pantallas || [];
    const items: MenuProps['items'] = [
      {
        key: 'dashboard',
        icon: <DashboardOutlined />,
        label: 'Dashboard',
      },
    ];

    if (!pantallas.length) return items;

    // Agrupar por modulo
    const modulosMap = new Map<number, ModuloConPantallas>();
    for (const p of pantallas) {
      const modulos = p.modulos || [];
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

    // Ordenar modulos
    const sortedModulos = Array.from(modulosMap.entries())
      .sort(([, a], [, b]) => a.modulo.orden - b.modulo.orden)
      .map(([, entry]) => entry);

    const buildChildren = (
      modPantallas: PantallaDTO[],
      moduloNombre: string,
    ): MenuProps['items'] => {
      // Detectar jerarquia
      const parentIdsPresent = new Set(
        modPantallas.filter((p) => !p.pantallaPadreID).map((p) => p.id),
      );
      const topLevel = modPantallas.filter(
        (p) =>
          !p.pantallaPadreID ||
          (p.pantallaPadreID && !parentIdsPresent.has(p.pantallaPadreID)),
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

      // Agrupar por grupo
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
      for (const [, items] of grupos) items.sort((a, b) => a.orden - b.orden);
      sinGrupo.sort((a, b) => a.orden - b.orden);

      const ORDEN_GRUPOS = ['Maestros', 'Operaciones', 'Consultas', 'Reportes'];
      const sortedGrupos = Array.from(grupos.entries()).sort(
        ([aNombre], [bNombre]) => {
          const idxA = ORDEN_GRUPOS.findIndex(
            (g) => g.toLowerCase() === aNombre.toLowerCase(),
          );
          const idxB = ORDEN_GRUPOS.findIndex(
            (g) => g.toLowerCase() === bNombre.toLowerCase(),
          );
          return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
        },
      );

      const makeKey = (codigo: string) => `${moduloNombre}__${codigo}`;
      const children: MenuProps['items'] = [];

      for (const [grupoNombre, grupoPantallas] of sortedGrupos) {
        children.push({
          key: `submenu_${moduloNombre}_${grupoNombre}`,
          label: grupoNombre,
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

    const modulosItems: MenuProps['items'] = sortedModulos
      .map(({ modulo, pantallas: modPantallas }) => {
        const children = buildChildren(modPantallas, modulo.nombre);
        if (!children || children.length === 0) return null;
        return {
          key: modulo.nombre,
          icon: ICONOS_MODULOS[modulo.nombre] || ICONO_DEFAULT,
          label: modulo.nombre,
          children,
        };
      })
      .filter(Boolean) as MenuProps['items'];

    items.push(...(modulosItems || []));
    return items;
  }, [usuario?.pantallas]);

  // ─── Handlers ────────────────────────────────────────────────
  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key.startsWith('_grupo_') || key.startsWith('submenu_')) return;
    const codigo = key.includes('__') ? key.split('__')[1] : key;
    setActiveModule(codigo);
    if (codigo === 'dashboard') {
      navigate('/saas');
    } else {
      navigate('/saas/' + codigo);
    }
  };

  const handleOpenChange = (keys: string[]) => {
    const topKeys = keys.filter((k) => !k.startsWith('submenu_'));
    const lastTop = topKeys[topKeys.length - 1];
    if (!lastTop) {
      setOpenKeys([]);
      return;
    }
    const related = keys.filter(
      (k) => k === lastTop || k.startsWith('submenu_' + lastTop + '_'),
    );
    setOpenKeys(related);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ─── Selected keys ───────────────────────────────────────────
  const selectedKeys = useMemo(() => {
    if (!activeModule) return [];
    const found = menuItems?.find(
      (item: any) =>
        item?.key === activeModule ||
        item?.key?.endsWith('__' + activeModule) ||
        item?.children?.some(
          (child: any) =>
            child?.key === activeModule ||
            child?.key?.endsWith('__' + activeModule) ||
            child?.children?.some(
              (sub: any) =>
                sub?.key === activeModule ||
                sub?.key?.endsWith('__' + activeModule),
            ),
        ),
    );
    return found ? [found.key as string] : [];
  }, [activeModule, menuItems]);

  // ─── User dropdown ───────────────────────────────────────────
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Mi Perfil',
    },
    { type: 'divider' as const },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Configuracion',
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Cerrar Sesion',
      danger: true,
    },
  ];

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'profile') navigate('/saas/MPerfil');
    if (key === 'settings') navigate('/saas/OConfig');
    if (key === 'logout') handleLogout();
  };

  if (!isAuthenticated) return null;

  const iniciales = usuario?.nombre?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: '#f6f8fa',
        overflow: 'hidden',
      }}
    >
      {/* ═══ SIDEBAR ════════════════════════════════════════════ */}
      <div
        style={{
          width: 240,
          background: '#fff',
          borderRight: '1px solid #e8ecf0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 200,
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e8ecf0',
          }}
        >
          <Space>
            <div
              style={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg, #556ee6, #3b4cb8)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              S
            </div>
            <span
              style={{ fontWeight: 700, fontSize: 18, color: '#1a1d21' }}
            >
              Solugen
            </span>
          </Space>
        </div>

        {/* Perfil usuario */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e8ecf0',
          }}
        >
          <Space>
            <Avatar
              size={36}
              style={{ backgroundColor: '#556ee6', fontWeight: 600 }}
            >
              {iniciales}
            </Avatar>
            <div>
              <div
                style={{ fontWeight: 600, fontSize: 13, color: '#1a1d21' }}
              >
                {toTitleCase(usuario?.nombre) || 'Usuario'}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>
                {usuario?.roles?.map((r) => r.nombre).join(', ') || 'Usuario'}
              </div>
            </div>
          </Space>
        </div>

        {/* Menu de navegacion (scroll) */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            openKeys={openKeys}
            style={{
              borderRight: 0,
              fontSize: 13,
              background: 'transparent',
              borderInlineEnd: 'none',
            }}
            items={menuItems}
            onClick={handleMenuClick}
            onOpenChange={handleOpenChange}
            inlineIndent={16}
          />
        </div>

        {/* Boton accion principal */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e8ecf0' }}>
          <Button
            type="primary"
            block
            shape="round"
            icon={<PlusOutlined />}
            style={{ height: 40, fontWeight: 600, borderRadius: 20 }}
          >
            Nuevo
          </Button>
        </div>
      </div>

      {/* ═══ MAIN ════════════════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          marginLeft: 240,
          height: '100vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 64,
            borderBottom: '1px solid #e8ecf0',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            background: '#fff',
            flexShrink: 0,
          }}
        >
          <Input.Search
            placeholder="Buscar en el sistema..."
            style={{ maxWidth: 320 }}
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            onFocus={(e) => {
              e.target.blur();
              setSearchOpen(true);
            }}
            onSearch={() => setSearchOpen(true)}
          />
          <div style={{ flex: 1 }} />
          <Space size="middle">
            <Badge count={3} size="small">
              <Button
                type="text"
                icon={
                  <BellOutlined style={{ fontSize: 18, color: '#6b7280' }} />
                }
                shape="circle"
              />
            </Badge>
            <Button
              type="text"
              icon={
                <SunOutlined style={{ fontSize: 18, color: '#6b7280' }} />
              }
              shape="circle"
            />
            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: handleUserMenuClick,
              }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Avatar
                size={32}
                style={{
                  backgroundColor: '#556ee6',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {iniciales}
              </Avatar>
            </Dropdown>
          </Space>
        </div>

        {/* Contenido */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            background: '#f6f8fa',
            padding: 24,
          }}
        >
          <Outlet />
        </div>
      </div>

      {/* Buscador global modal — placeholder */}
      {searchOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: 120,
          }}
          onClick={() => setSearchOpen(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              width: 560,
              boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Input.Search
              placeholder="Buscar modulos, documentos..."
              size="large"
              autoFocus
              style={{ width: '100%' }}
              prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
              onSearch={() => setSearchOpen(false)}
            />
            <div style={{ marginTop: 16, fontSize: 12, color: '#9ca3af' }}>
              Presiona Esc para cerrar
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaasMainLayout;
