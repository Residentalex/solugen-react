import React, { useMemo } from 'react';
import { Button, Dropdown, Grid, Space, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { verificarPermiso } from './PermissionGate';

export interface ToolbarAccion {
  key: string;
  label: string;
  icon?: React.ReactNode;
  tipo?: 'primary' | 'default' | 'danger';
  soloIcono?: boolean;
  tooltip?: string;
  disabled?: boolean;
  loading?: boolean;
  visible?: boolean;
  onClick?: () => void;
  permiso?: { codigoPantalla?: string; accion?: string; permisoEspecial?: string };
  prioridad?: number;
  destructiva?: boolean;
  /** Estilo extra para el boton visible (p. ej. Aplicar en verde). */
  estilo?: React.CSSProperties;
  /** Submenú: si la acción queda visible se renderiza como Dropdown.Button; si
   *  cae al menú "⋯" se renderiza como submenú. */
  menu?: { items: MenuProps['items']; onClick?: MenuProps['onClick'] };
}

interface ToolbarAccionesProps {
  acciones: ToolbarAccion[];
  maxVisibles?: number; // default 2
}

const ToolbarAcciones: React.FC<ToolbarAccionesProps> = ({ acciones, maxVisibles = 2 }) => {
  const usuario = useAuthStore((s) => s.usuario);
  const activeModule = useUIStore((s) => s.activeModule);
  const screens = Grid.useBreakpoint();
  // En <sm solo 1 visible (la primaria) + dropdown; desde sm, maxVisibles visibles.
  const limite = screens.sm === false ? 1 : maxVisibles;

  // 1) Filtrar por permiso y por `visible === false`.
  const filtradas = useMemo(() => {
    return acciones.filter((a) => {
      if (a.visible === false) return false;
      if (!a.permiso) return true;
      const { codigoPantalla, accion, permisoEspecial } = a.permiso;
      return verificarPermiso({ usuario, activeModule, codigoPantalla, accion, permisoEspecial });
    });
  }, [acciones, usuario, activeModule]);

  // 2) Ordenar por prioridad descendente (estable: conserva el orden original ante empate).
  const ordenadas = useMemo(() => {
    return [...filtradas].sort((a, b) => (b.prioridad ?? 0) - (a.prioridad ?? 0));
  }, [filtradas]);

  const esDestructiva = (a: ToolbarAccion) => a.tipo === 'danger' || a.destructiva === true;

  // Aplica el `onClick` de nivel Dropdown a cada item hoja, para poder anidar
  // los items como submenú dentro del menú "⋯" sin perder el ruteo por key.
  const aplicarMenuOnClick = (
    items: MenuProps['items'],
    onClick?: MenuProps['onClick'],
  ): MenuProps['items'] => {
    if (!onClick || !items) return items;
    return items.map((item: any): any => {
      if (!item) return null;
      if (item.children) {
        return { ...item, children: aplicarMenuOnClick(item.children, onClick) };
      }
      return { ...item, onClick: item.onClick ?? onClick };
    });
  };

  // 3) Repartir entre visibles y dropdown.
  const { visibles, dropdown } = useMemo(() => {
    const visibles: ToolbarAccion[] = [];
    const dropdown: ToolbarAccion[] = [];

    for (const a of ordenadas) {
      if (esDestructiva(a)) {
        dropdown.push(a);
        continue;
      }
      if (a.tipo === 'primary') {
        // Solo la primaria de mayor prioridad es visible; el resto al dropdown.
        if (!visibles.some((v) => v.tipo === 'primary')) {
          visibles.push(a);
        } else {
          dropdown.push(a);
        }
        continue;
      }
      // No destructiva, no primaria: rellena los huecos visibles por prioridad.
      if (visibles.length < limite) {
        visibles.push(a);
      } else {
        dropdown.push(a);
      }
    }

    return { visibles, dropdown };
  }, [ordenadas, limite]);

  const renderBoton = (a: ToolbarAccion) => {
    if (a.menu && a.onClick) {
      const dropdownBtn = (
        <Dropdown.Button
          type={a.tipo === 'primary' ? 'primary' : undefined}
          danger={a.tipo === 'danger'}
          icon={a.icon}
          loading={a.loading}
          disabled={a.disabled || a.loading}
          onClick={a.onClick}
          menu={a.menu}
          style={a.estilo}
        >
          {!a.soloIcono && a.label}
        </Dropdown.Button>
      );
      return a.soloIcono ? (
        <Tooltip title={a.tooltip ?? a.label}>{dropdownBtn}</Tooltip>
      ) : dropdownBtn;
    }

    if (a.menu) {
      // menu sin onClick: Dropdown simple, todo el botón abre el menú (sin zona muerta).
      const botonMenu = (
        <Button
          type={a.tipo === 'primary' ? 'primary' : undefined}
          danger={a.tipo === 'danger'}
          icon={a.icon}
          loading={a.loading}
          disabled={a.disabled || a.loading}
          aria-label={a.soloIcono ? a.label : undefined}
          style={a.estilo}
        >
          {!a.soloIcono && a.label}
        </Button>
      );
      return (
        <Dropdown menu={a.menu} trigger={['click']}>
          {a.soloIcono ? <Tooltip title={a.tooltip ?? a.label}>{botonMenu}</Tooltip> : botonMenu}
        </Dropdown>
      );
    }

    const boton = (
      <Button
        type={a.tipo === 'primary' ? 'primary' : undefined}
        danger={a.tipo === 'danger'}
        icon={a.icon}
        loading={a.loading}
        disabled={a.disabled || a.loading}
        onClick={a.onClick}
        aria-label={a.soloIcono ? a.label : undefined}
        style={a.estilo}
      >
        {!a.soloIcono && a.label}
      </Button>
    );
    return a.soloIcono ? (
      <Tooltip title={a.tooltip ?? a.label}>{boton}</Tooltip>
    ) : boton;
  };

  const menuItems: MenuProps['items'] = dropdown.map((a) => {
    if (a.menu) {
      const hijos: NonNullable<MenuProps['items']> = [
        ...(a.onClick
          ? [{ key: `${a.key}__default`, icon: a.icon, label: a.label, onClick: a.onClick }]
          : []),
        ...(aplicarMenuOnClick(a.menu.items, a.menu.onClick) ?? []),
      ];
      return {
        key: a.key,
        icon: a.icon,
        label: a.label,
        danger: a.tipo === 'danger' || a.destructiva === true,
        disabled: a.disabled || a.loading,
        children: hijos,
      };
    }
    return {
      key: a.key,
      icon: a.icon,
      label: a.label,
      danger: a.tipo === 'danger' || a.destructiva === true,
      disabled: a.disabled || a.loading,
      onClick: a.onClick,
    };
  });

  return (
    <Space wrap size={8}>
      {visibles.map((a) => (
        <React.Fragment key={a.key}>{renderBoton(a)}</React.Fragment>
      ))}
      {menuItems.length > 0 && (
        <Dropdown menu={{ items: menuItems }} trigger={['click']}>
          <Tooltip title="Más acciones">
            <Button icon={<MoreOutlined />} aria-label="Más acciones" />
          </Tooltip>
        </Dropdown>
      )}
    </Space>
  );
};

export default ToolbarAcciones;
