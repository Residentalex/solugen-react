import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

export interface EcommerceUsuario {
  id: string;
  email: string;
  nombre: string;
  telefono: string;
  direccion: string;
  fechaRegistro: string;
}

export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface LoginResponseDTO {
  token: string;
  refreshToken: string;
  usuario: EcommerceUsuario;
}

export interface RegistroRequestDTO {
  email: string;
  password: string;
  nombre: string;
  telefono: string;
  direccion: string;
}

export interface ActualizarPerfilRequestDTO {
  nombre: string;
  telefono: string;
  direccion: string;
}

export interface CambiarClaveRequestDTO {
  passwordActual: string;
  passwordNueva: string;
}


export interface CategoriaCatalogoDTO {
  id: string;
  nombre: string;
  totalProductos: number;
}

export interface ProductosPaginadoDTO {
  items: CatalogoProductoDTO[];
  total: number;
  pagina: number;
  tamanoPagina: number;
  totalPaginas: number;
}

export interface MarcaDTO {
  id: string;
  nombre: string;
}

export interface BannerDTO {
  id: string;
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  ctaTexto: string;
  ctaLink: string;
  orden: number;
  activo: boolean;
}

export interface CarritoItemDTO {
  id: string;
  sessionId: string;
  codigoProducto: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  precioOferta: number | null;
  subtotal: number;
  fechaAgregado: string;
}

export interface CarritoResumenDTO {
  items: CarritoItemDTO[];
  totalItems: number;
  subtotal: number;
  impuestos: number;
  total: number;
}

export interface AgregarAlCarritoDTO {
  sessionId: string;
  codigoProducto: string;
  cantidad: number;
}

export interface ActualizarCantidadDTO {
  sessionId: string;
  cantidad: number;
}

export interface FavoritoDTO {
  id: string;
  sessionId: string;
  codigoProducto: string;
  nombreProducto: string;
  precio: number;
  precioOferta: number | null;
  categoria: string;
  fechaAgregado: string;
}

export interface AgregarFavoritoDTO {
  sessionId: string;
  codigoProducto: string;
}

export interface OrdenDTO {
  id: string;
  sessionId: string;
  noOrden: number;
  nombreCliente: string;
  email: string;
  telefono: string;
  direccion: string;
  notas: string;
  subtotal: number;
  impuestos: number;
  total: number;
  estado: string;
  fechaCreacion: string;
  detalles: OrdenDetalleDTO[];
}

export interface OrdenDetalleDTO {
  id: string;
  ordenId: string;
  codigoProducto: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface CrearOrdenDTO {
  sessionId: string;
  nombreCliente: string;
  email: string;
  telefono: string;
  direccion: string;
  notas: string;
}

// ─── Admin DTOs ────────────────────────────────────────────────

export interface AdminConfigDTO {
  clave: string;
  valor: string;
  descripcion: string;
}

export interface AdminActualizarConfigResponseDTO {
  mensaje: string;
  totalFilasAfectadas: number;
  detalles: { clave: string; filasAfectadas: number }[];
}

export interface AdminProductoListadoDTO {
  id: string;
  codPro: string;
  nombre: string;
  precioBase: number;
  precioVenta: number;
  precioOferta: number | null;
  existencia: number;
  enCatalogo: boolean;
  destacado: boolean;
  categoriaNombre: string;
  imagenUrl?: string;
}

export interface AdminProductosPaginadoDTO {
  items: AdminProductoListadoDTO[];
  total: number;
  pagina: number;
  tamanoPagina: number;
  totalPaginas: number;
}

export interface AdminCategoriaDTO {
  id: string;
  nombre: string;
  descripcion: string;
  orden: number;
  activo: boolean;
  totalProductos: number;
}

export interface AdminBannerDTO {
  id: string;
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  ctaTexto: string;
  ctaLink: string;
  orden: number;
  activo: boolean;
}

export interface AdminOrdenListadoDTO {
  id: string;
  noOrden: number;
  nombreCliente: string;
  email: string;
  total: number;
  estado: string;
  fechaCreacion: string;
}

export interface AdminOrdenesPaginadoDTO {
  items: AdminOrdenListadoDTO[];
  total: number;
  pagina: number;
  tamanoPagina: number;
  totalPaginas: number;
}

export interface AdminOrdenDetalleDTO {
  id: string;
  noOrden: number;
  nombreCliente: string;
  email: string;
  telefono: string;
  direccion: string;
  notas: string;
  subtotal: number;
  impuestos: number;
  total: number;
  estado: string;
  fechaCreacion: string;
  detalles: OrdenDetalleDTO[];
}

export interface AdminDashboardResumenDTO {
  totalProductosCatalogo: number;
  totalOrdenesPendientes: number;
  totalCategorias: number;
  totalBannersActivos: number;
}

const BASE = '/Ecommerce';

export const ecommerceApi = {
  /** Obtener listado paginado de productos del catálogo */
  obtenerProductos: async (params?: {
    categoria?: string;
    buscar?: string;
    pagina?: number;
    tamano?: number;
  }): Promise<ProductosPaginadoDTO> => {
    const { data } = await apiClient.get<ApiResponse<ProductosPaginadoDTO>>(`${BASE}/productos`, { params });
    return data.data;
  },

  /** Obtener detalle de un producto por código */
  obtenerProductoPorCodigo: async (codigo: string): Promise<CatalogoProductoDTO> => {
    const { data } = await apiClient.get<ApiResponse<CatalogoProductoDTO>>(`${BASE}/productos/${codigo}`);
    return data.data;
  },

  /** Obtener lista de categorías del catálogo */
  obtenerCategorias: async (): Promise<CategoriaCatalogoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<CategoriaCatalogoDTO[]>>(`${BASE}/categorias`);
    return data.data;
  },

  /** Obtener productos con ofertas activas */
  obtenerOfertas: async (params?: { pagina?: number; tamano?: number }): Promise<ProductosPaginadoDTO> => {
    const { data } = await apiClient.get<ApiResponse<ProductosPaginadoDTO>>(`${BASE}/productos/ofertas`, { params });
    return data.data;
  },

  /** Obtener listado de marcas */
  obtenerMarcas: async (): Promise<MarcaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<MarcaDTO[]>>(`${BASE}/marcas`);
    return data.data;
  },

  /** Obtener banners configurables del ecommerce */
  obtenerBanners: async (): Promise<BannerDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<BannerDTO[]>>(`${BASE}/banners`);
    return data.data;
  },

  /** Obtener carrito por sessionId */
  obtenerCarrito: async (sessionId: string): Promise<CarritoResumenDTO> => {
    const { data } = await apiClient.get<ApiResponse<CarritoResumenDTO>>(`${BASE}/carrito`, { params: { sessionId } });
    return data.data;
  },

  /** Agregar o actualizar producto en el carrito */
  agregarAlCarrito: async (dto: AgregarAlCarritoDTO): Promise<void> => {
    await apiClient.post(`${BASE}/carrito`, dto);
  },

  /** Actualizar cantidad de un item del carrito */
  actualizarCantidad: async (id: string, dto: ActualizarCantidadDTO): Promise<void> => {
    await apiClient.put(`${BASE}/carrito/${id}`, dto);
  },

  /** Eliminar un item del carrito */
  eliminarDelCarrito: async (id: string, sessionId: string): Promise<void> => {
    await apiClient.delete(`${BASE}/carrito/${id}`, { params: { sessionId } });
  },

  /** Vaciar carrito completo */
  vaciarCarrito: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`${BASE}/carrito`, { params: { sessionId } });
  },

  /** Contar items en el carrito */
  contarItemsCarrito: async (sessionId: string): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/carrito/contar`, { params: { sessionId } });
    return data.data;
  },

  /** Obtener favoritos por sessionId */
  obtenerFavoritos: async (sessionId: string): Promise<FavoritoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<FavoritoDTO[]>>(`${BASE}/favoritos`, { params: { sessionId } });
    return data.data;
  },

  /** Agregar producto a favoritos */
  agregarFavorito: async (dto: AgregarFavoritoDTO): Promise<void> => {
    await apiClient.post(`${BASE}/favoritos`, dto);
  },

  /** Eliminar favorito por id */
  eliminarFavorito: async (id: string, sessionId: string): Promise<void> => {
    await apiClient.delete(`${BASE}/favoritos/${id}`, { params: { sessionId } });
  },

  /** Eliminar favorito por código de producto */
  eliminarFavoritoPorProducto: async (sessionId: string, codigoProducto: string): Promise<void> => {
    await apiClient.delete(`${BASE}/favoritos`, { params: { sessionId, codigoProducto } });
  },

  /** Contar favoritos */
  contarFavoritos: async (sessionId: string): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/favoritos/contar`, { params: { sessionId } });
    return data.data;
  },

  /** Verificar si un producto es favorito */
  esFavorito: async (sessionId: string, codigoProducto: string): Promise<boolean> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/favoritos/es-favorito`, { params: { sessionId, codigoProducto } });
    return data.data > 0;
  },

  /** Crear una nueva orden de compra */
  crearOrden: async (dto: CrearOrdenDTO): Promise<OrdenDTO> => {
    const { data } = await apiClient.post<ApiResponse<OrdenDTO>>(`${BASE}/ordenes`, dto);
    return data.data;
  },

  /** Obtener orden por id */
  obtenerOrden: async (id: string): Promise<OrdenDTO> => {
    const { data } = await apiClient.get<ApiResponse<OrdenDTO>>(`${BASE}/ordenes/${id}`);
    return data.data;
  },

  /** Listar órdenes por sessionId */
  listarOrdenes: async (sessionId: string): Promise<OrdenDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<OrdenDTO[]>>(`${BASE}/ordenes`, { params: { sessionId } });
    return data.data;
  },

  /** Registro de usuario en el ecommerce */
  registro: async (dto: RegistroRequestDTO): Promise<void> => {
    await apiClient.post(`${BASE}/auth/registro`, dto);
  },

  /** Login de usuario en el ecommerce */
  login: async (dto: LoginRequestDTO): Promise<LoginResponseDTO> => {
    const { data } = await apiClient.post<ApiResponse<LoginResponseDTO>>(`${BASE}/auth/login`, dto);
    return data.data;
  },

  /** Obtener perfil del usuario autenticado */
  perfil: async (token: string): Promise<EcommerceUsuario> => {
    const { data } = await apiClient.get<ApiResponse<EcommerceUsuario>>(`${BASE}/auth/perfil`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.data;
  },

  /** Actualizar perfil del usuario autenticado */
  actualizarPerfil: async (token: string, dto: ActualizarPerfilRequestDTO): Promise<EcommerceUsuario> => {
    const { data } = await apiClient.put<ApiResponse<EcommerceUsuario>>(`${BASE}/auth/perfil`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.data;
  },

  /** Cambiar contraseña del usuario autenticado */
  cambiarClave: async (token: string, dto: CambiarClaveRequestDTO): Promise<void> => {
    await apiClient.post(`${BASE}/auth/cambiar-clave`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  // ═══════════════════════════════════════════════════════════════
  // ADMIN
  // ═══════════════════════════════════════════════════════════════

  /** Resumen del dashboard de admin */
  adminObtenerResumen: async (): Promise<AdminDashboardResumenDTO> => {
    const { data } = await apiClient.get<ApiResponse<AdminDashboardResumenDTO>>(`${BASE}/admin/resumen`);
    return data.data;
  },

  /** Obtener configuración del ecommerce */
  adminObtenerConfig: async (): Promise<AdminConfigDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<AdminConfigDTO[]>>(`${BASE}/admin/config`);
    return data.data;
  },

  /** Actualizar configuración del ecommerce */
  adminActualizarConfig: async (dto: { clave: string; valor: string }[]): Promise<AdminActualizarConfigResponseDTO> => {
    const { data } = await apiClient.put<ApiResponse<AdminActualizarConfigResponseDTO>>(`${BASE}/admin/config`, dto);
    return data.data;
  },

  /** Obtener productos paginados para admin */
  adminObtenerProductos: async (params?: {
    buscar?: string;
    categoria?: string;
    enCatalogo?: boolean;
    destacado?: boolean;
    pagina?: number;
    tamano?: number;
  }): Promise<AdminProductosPaginadoDTO> => {
    const { data } = await apiClient.get<ApiResponse<AdminProductosPaginadoDTO>>(`${BASE}/admin/productos`, { params });
    return data.data;
  },

  /** Toggle producto en catálogo */
  adminToggleCatalogo: async (id: string, enCatalogo: boolean): Promise<void> => {
    await apiClient.put(`${BASE}/admin/productos/${id}/catalogo`, { enCatalogo });
  },

  /** Toggle producto destacado */
  adminToggleDestacado: async (id: string, destacado: boolean): Promise<void> => {
    await apiClient.put(`${BASE}/admin/productos/${id}/destacado`, { destacado });
  },

  /** Actualizar precio de oferta */
  adminActualizarPrecioOferta: async (id: string, precioOferta: number | null): Promise<void> => {
    await apiClient.put(`${BASE}/admin/productos/${id}/precio-oferta`, { precioOferta });
  },

  /** Obtener categorías */
  adminObtenerCategorias: async (): Promise<AdminCategoriaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<AdminCategoriaDTO[]>>(`${BASE}/admin/categorias`);
    return data.data;
  },

  /** Crear categoría */
  adminCrearCategoria: async (dto: { nombre: string; descripcion: string; orden: number }): Promise<AdminCategoriaDTO> => {
    const { data } = await apiClient.post<ApiResponse<AdminCategoriaDTO>>(`${BASE}/admin/categorias`, dto);
    return data.data;
  },

  /** Actualizar categoría */
  adminActualizarCategoria: async (id: string, dto: { nombre: string; descripcion: string; orden: number; activo: boolean }): Promise<AdminCategoriaDTO> => {
    const { data } = await apiClient.put<ApiResponse<AdminCategoriaDTO>>(`${BASE}/admin/categorias/${id}`, dto);
    return data.data;
  },

  /** Eliminar categoría */
  adminEliminarCategoria: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/admin/categorias/${id}`);
  },

  /** Obtener banners */
  adminObtenerBanners: async (): Promise<AdminBannerDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<AdminBannerDTO[]>>(`${BASE}/admin/banners`);
    return data.data;
  },

  /** Crear banner */
  adminCrearBanner: async (dto: { titulo: string; descripcion: string; imagenUrl: string; ctaTexto: string; ctaLink: string; orden: number }): Promise<AdminBannerDTO> => {
    const { data } = await apiClient.post<ApiResponse<AdminBannerDTO>>(`${BASE}/admin/banners`, dto);
    return data.data;
  },

  /** Actualizar banner */
  adminActualizarBanner: async (id: string, dto: { titulo: string; descripcion: string; imagenUrl: string; ctaTexto: string; ctaLink: string; orden: number; activo: boolean }): Promise<AdminBannerDTO> => {
    const { data } = await apiClient.put<ApiResponse<AdminBannerDTO>>(`${BASE}/admin/banners/${id}`, dto);
    return data.data;
  },

  /** Eliminar banner */
  adminEliminarBanner: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/admin/banners/${id}`);
  },

  /** Obtener órdenes paginadas */
  adminObtenerOrdenes: async (params?: {
    estado?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    pagina?: number;
    tamano?: number;
  }): Promise<AdminOrdenesPaginadoDTO> => {
    const { data } = await apiClient.get<ApiResponse<AdminOrdenesPaginadoDTO>>(`${BASE}/admin/ordenes`, { params });
    return data.data;
  },

  /** Obtener detalle de orden */
  adminObtenerOrdenDetalle: async (id: string): Promise<AdminOrdenDetalleDTO> => {
    const { data } = await apiClient.get<ApiResponse<AdminOrdenDetalleDTO>>(`${BASE}/admin/ordenes/${id}`);
    return data.data;
  },

  /** Actualizar estado de orden */
  adminActualizarEstadoOrden: async (id: string, estado: string): Promise<void> => {
    await apiClient.put(`${BASE}/admin/ordenes/${id}/estado`, { estado });
  },

  /** Subir imagen de producto */
  adminSubirImagen: async (id: string, file: File): Promise<{ imagenUrl: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post<ApiResponse<{ imagenUrl: string }>>(
      `${BASE}/admin/productos/${id}/imagen`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data.data;
  },

  /** Sincronizar productos manualmente */
  adminSincronizar: async (): Promise<void> => {
    await apiClient.post(`${BASE}/admin/sincronizar`);
  },
};
