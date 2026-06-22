import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input, Badge, Drawer, Button, message, Dropdown, Divider } from 'antd';
import {
  SearchOutlined,
  ShoppingCartOutlined,
  HeartOutlined,
  SwapOutlined,
  BellOutlined,
  UserOutlined,
  MenuOutlined,
  CloseOutlined,
  ShoppingOutlined,
  EyeOutlined,
  LoginOutlined,
  UserAddOutlined,
  LogoutOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useCarritoStore } from '../../../stores/useCarritoStore';
import { useFavoritosStore } from '../../../stores/useFavoritosStore';
import { useEcommerceAuthStore } from '../../../stores/ecommerceAuthStore';
import CarritoDrawer from './CarritoDrawer';
import FavoritosDrawer from './FavoritosDrawer';

const StoreHeader: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const buscarActual = searchParams.get('buscar') || '';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [carritoOpen, setCarritoOpen] = useState(false);
  const [favoritosOpen, setFavoritosOpen] = useState(false);
  const totalItems = useCarritoStore((state) => state.totalItems);
  const cargarCarrito = useCarritoStore((state) => state.cargarCarrito);
  const totalFavoritos = useFavoritosStore((state) => state.totalFavoritos);
  const cargarFavoritos = useFavoritosStore((state) => state.cargarFavoritos);

  const isAuthenticated = useEcommerceAuthStore((state) => state.isAuthenticated);
  const usuario = useEcommerceAuthStore((state) => state.usuario);
  const logout = useEcommerceAuthStore((state) => state.logout);

  useEffect(() => {
    cargarCarrito().catch((err: any) => {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar el carrito');
    });
    cargarFavoritos().catch((err: any) => {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar favoritos');
    });
  }, [cargarCarrito, cargarFavoritos]);

  const handleSearch = useCallback((value: string) => {
    if (value.trim()) {
      navigate(`/store?buscar=${encodeURIComponent(value)}`);
    } else {
      navigate('/store');
    }
  }, [navigate]);

  const handleLogout = useCallback(() => {
    logout();
    message.info('Sesión cerrada');
    navigate('/store');
  }, [logout, navigate]);

  const menuItems = [
    { label: 'Inicio', href: '/store' },
    { label: 'Categorías', href: '/store#categorias' },
    { label: 'Ofertas', href: '/store?ofertas=true' },
  ];

  const userDropdownItems = {
    items: [
      {
        key: 'perfil',
        label: 'Mi Perfil',
        icon: <UserOutlined />,
        onClick: () => navigate('/store/perfil'),
      },
      {
        key: 'ordenes',
        label: 'Mis Pedidos',
        icon: <EyeOutlined />,
        onClick: () => navigate('/store/ordenes'),
      },
      {
        key: 'logout',
        label: 'Cerrar Sesión',
        icon: <LogoutOutlined />,
        danger: true,
        onClick: handleLogout,
      },
    ],
  };

  return (
    <>
      <header className="store-header-premium">
        {/* Logo */}
        <div className="store-header-logo" onClick={() => navigate('/store')}>
          <div className="genesis-logo-box" style={{ width: 32, height: 32, borderRadius: 8, fontSize: 16 }}>
            G
          </div>
          <span>Genesis Store</span>
        </div>

        {/* Menú Desktop */}
        <nav className="store-header-nav">
          {menuItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="store-header-nav-link"
              onClick={(e) => {
                e.preventDefault();
                navigate(item.href);
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Buscador */}
        <div className="store-header-search-premium">
          <Input.Search
            placeholder="Buscar productos..."
            allowClear
            defaultValue={buscarActual}
            onSearch={handleSearch}
            prefix={<SearchOutlined className="paces-text-icon" />}
          />
        </div>

        {/* Iconos derecha - Desktop */}
        <div className="store-header-actions">
          <button className="store-header-action-btn" aria-label="Favoritos" onClick={() => setFavoritosOpen(true)}>
            <Badge count={totalFavoritos} size="small" showZero={false}>
              <HeartOutlined />
            </Badge>
          </button>
          <button className="store-header-action-btn" aria-label="Comparar">
            <SwapOutlined />
          </button>
          <button className="store-header-action-btn" aria-label="Notificaciones">
            <Badge count={3} size="small">
              <BellOutlined />
            </Badge>
          </button>
          <button className="store-header-action-btn" aria-label="Carrito" onClick={() => setCarritoOpen(true)}>
            <Badge count={totalItems} size="small" showZero={false}>
              <ShoppingCartOutlined />
            </Badge>
          </button>

          {isAuthenticated ? (
            <Dropdown menu={userDropdownItems} placement="bottomRight">
              <button className="store-header-action-btn" aria-label="Perfil" style={{ width: 'auto', padding: '0 12px', gap: 6, borderRadius: 20 }}>
                <UserOutlined />
                <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {usuario?.nombre?.split(' ')[0] || 'Usuario'}
                </span>
                <DownOutlined style={{ fontSize: 10 }} />
              </button>
            </Dropdown>
          ) : (
            <>
              <button
                className="store-header-action-btn"
                aria-label="Iniciar sesión"
                onClick={() => navigate('/store/login')}
                title="Iniciar sesión"
              >
                <LoginOutlined />
              </button>
              <Button
                type="primary"
                size="small"
                icon={<UserAddOutlined />}
                onClick={() => navigate('/store/registro')}
                style={{ marginLeft: 4, borderRadius: 20 }}
              >
                Crear Cuenta
              </Button>
            </>
          )}
        </div>

        {/* Mobile: Hamburguesa + Logo + Carrito */}
        <div className="store-header-mobile">
          <button
            className="store-header-action-btn"
            aria-label="Menú"
            onClick={() => setMobileMenuOpen(true)}
          >
            <MenuOutlined />
          </button>
          <div className="store-header-logo store-header-mobile-logo" onClick={() => navigate('/store')}>
            <ShoppingOutlined style={{ fontSize: 24, color: 'var(--paces-primary)' }} />
          </div>
          <button className="store-header-action-btn store-header-mobile-cart" aria-label="Carrito" onClick={() => setCarritoOpen(true)}>
            <Badge count={totalItems} size="small" showZero={false}>
              <ShoppingCartOutlined />
            </Badge>
          </button>
        </div>
      </header>

      {/* Drawer Mobile */}
      <Drawer
        placement="left"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width={280}
        closable={false}
        styles={{ body: { padding: 0, background: 'var(--paces-bg-container)' } }}
      >
        <div style={{ padding: 16, borderBottom: '1px solid var(--paces-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="store-header-logo" onClick={() => { navigate('/store'); setMobileMenuOpen(false); }}>
            <div className="genesis-logo-box" style={{ width: 32, height: 32, borderRadius: 8, fontSize: 16 }}>G</div>
            <span>Genesis Store</span>
          </div>
          <Button type="text" icon={<CloseOutlined />} onClick={() => setMobileMenuOpen(false)} />
        </div>
        <nav style={{ padding: 8 }}>
          {menuItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="store-mobile-nav-link"
              onClick={(e) => {
                e.preventDefault();
                navigate(item.href);
                setMobileMenuOpen(false);
              }}
            >
              {item.label}
            </a>
          ))}
          <a
            href="/store/ordenes"
            className="store-mobile-nav-link"
            onClick={(e) => {
              e.preventDefault();
              navigate('/store/ordenes');
              setMobileMenuOpen(false);
            }}
          >
            <EyeOutlined style={{ marginRight: 8 }} />
            Mis Órdenes
          </a>
          <Divider style={{ margin: '8px 0' }} />
          {isAuthenticated ? (
            <>
              <a
                href="/store/perfil"
                className="store-mobile-nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/store/perfil');
                  setMobileMenuOpen(false);
                }}
              >
                <UserOutlined style={{ marginRight: 8 }} />
                Mi Perfil
              </a>
              <a
                href="#"
                className="store-mobile-nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
              >
                <LogoutOutlined style={{ marginRight: 8 }} />
                Cerrar Sesión
              </a>
            </>
          ) : (
            <>
              <a
                href="/store/login"
                className="store-mobile-nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/store/login');
                  setMobileMenuOpen(false);
                }}
              >
                <LoginOutlined style={{ marginRight: 8 }} />
                Iniciar Sesión
              </a>
              <a
                href="/store/registro"
                className="store-mobile-nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/store/registro');
                  setMobileMenuOpen(false);
                }}
              >
                <UserAddOutlined style={{ marginRight: 8 }} />
                Crear Cuenta
              </a>
            </>
          )}
        </nav>
      </Drawer>

      <CarritoDrawer open={carritoOpen} onClose={() => setCarritoOpen(false)} />
      <FavoritosDrawer open={favoritosOpen} onClose={() => setFavoritosOpen(false)} />
    </>
  );
};

export default StoreHeader;
