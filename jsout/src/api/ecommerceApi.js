import { apiClient } from './client';
const BASE = '/Ecommerce';
export const ecommerceApi = {
    /** Obtener listado paginado de productos del catálogo */
    obtenerProductos: async (params) => {
        const { data } = await apiClient.get(`${BASE}/productos`, { params });
        return data.data;
    },
    /** Obtener detalle de un producto por código */
    obtenerProductoPorCodigo: async (codigo) => {
        const { data } = await apiClient.get(`${BASE}/productos/${codigo}`);
        return data.data;
    },
    /** Obtener lista de categorías del catálogo */
    obtenerCategorias: async () => {
        const { data } = await apiClient.get(`${BASE}/categorias`);
        return data.data;
    },
    /** Obtener productos con ofertas activas */
    obtenerOfertas: async (params) => {
        const { data } = await apiClient.get(`${BASE}/productos/ofertas`, { params });
        return data.data;
    },
    /** Obtener listado de marcas */
    obtenerMarcas: async () => {
        const { data } = await apiClient.get(`${BASE}/marcas`);
        return data.data;
    },
    /** Obtener banners configurables del ecommerce */
    obtenerBanners: async () => {
        const { data } = await apiClient.get(`${BASE}/banners`);
        return data.data;
    },
    /** Obtener carrito por sessionId */
    obtenerCarrito: async (sessionId) => {
        const { data } = await apiClient.get(`${BASE}/carrito`, { params: { sessionId } });
        return data.data;
    },
    /** Agregar o actualizar producto en el carrito */
    agregarAlCarrito: async (dto) => {
        await apiClient.post(`${BASE}/carrito`, dto);
    },
    /** Actualizar cantidad de un item del carrito */
    actualizarCantidad: async (id, dto) => {
        await apiClient.put(`${BASE}/carrito/${id}`, dto);
    },
    /** Eliminar un item del carrito */
    eliminarDelCarrito: async (id, sessionId) => {
        await apiClient.delete(`${BASE}/carrito/${id}`, { params: { sessionId } });
    },
    /** Vaciar carrito completo */
    vaciarCarrito: async (sessionId) => {
        await apiClient.delete(`${BASE}/carrito`, { params: { sessionId } });
    },
    /** Contar items en el carrito */
    contarItemsCarrito: async (sessionId) => {
        const { data } = await apiClient.get(`${BASE}/carrito/contar`, { params: { sessionId } });
        return data.data;
    },
    /** Obtener favoritos por sessionId */
    obtenerFavoritos: async (sessionId) => {
        const { data } = await apiClient.get(`${BASE}/favoritos`, { params: { sessionId } });
        return data.data;
    },
    /** Agregar producto a favoritos */
    agregarFavorito: async (dto) => {
        await apiClient.post(`${BASE}/favoritos`, dto);
    },
    /** Eliminar favorito por id */
    eliminarFavorito: async (id, sessionId) => {
        await apiClient.delete(`${BASE}/favoritos/${id}`, { params: { sessionId } });
    },
    /** Eliminar favorito por código de producto */
    eliminarFavoritoPorProducto: async (sessionId, codigoProducto) => {
        await apiClient.delete(`${BASE}/favoritos`, { params: { sessionId, codigoProducto } });
    },
    /** Contar favoritos */
    contarFavoritos: async (sessionId) => {
        const { data } = await apiClient.get(`${BASE}/favoritos/contar`, { params: { sessionId } });
        return data.data;
    },
    /** Verificar si un producto es favorito */
    esFavorito: async (sessionId, codigoProducto) => {
        const { data } = await apiClient.get(`${BASE}/favoritos/es-favorito`, { params: { sessionId, codigoProducto } });
        return data.data > 0;
    },
    /** Crear una nueva orden de compra */
    crearOrden: async (dto) => {
        const { data } = await apiClient.post(`${BASE}/ordenes`, dto);
        return data.data;
    },
    /** Obtener orden por id */
    obtenerOrden: async (id) => {
        const { data } = await apiClient.get(`${BASE}/ordenes/${id}`);
        return data.data;
    },
    /** Listar órdenes por sessionId */
    listarOrdenes: async (sessionId) => {
        const { data } = await apiClient.get(`${BASE}/ordenes`, { params: { sessionId } });
        return data.data;
    },
    /** Registro de usuario en el ecommerce */
    registro: async (dto) => {
        await apiClient.post(`${BASE}/auth/registro`, dto);
    },
    /** Login de usuario en el ecommerce */
    login: async (dto) => {
        const { data } = await apiClient.post(`${BASE}/auth/login`, dto);
        return data.data;
    },
    /** Obtener perfil del usuario autenticado */
    perfil: async (token) => {
        const { data } = await apiClient.get(`${BASE}/auth/perfil`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return data.data;
    },
    /** Actualizar perfil del usuario autenticado */
    actualizarPerfil: async (token, dto) => {
        const { data } = await apiClient.put(`${BASE}/auth/perfil`, dto, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return data.data;
    },
    /** Cambiar contraseña del usuario autenticado */
    cambiarClave: async (token, dto) => {
        await apiClient.post(`${BASE}/auth/cambiar-clave`, dto, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },
    // ═══════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════
    /** Resumen del dashboard de admin */
    adminObtenerResumen: async () => {
        const { data } = await apiClient.get(`${BASE}/admin/resumen`);
        return data.data;
    },
    /** Obtener configuración del ecommerce */
    adminObtenerConfig: async () => {
        const { data } = await apiClient.get(`${BASE}/admin/config`);
        return data.data;
    },
    /** Actualizar configuración del ecommerce */
    adminActualizarConfig: async (dto) => {
        const { data } = await apiClient.put(`${BASE}/admin/config`, dto);
        return data.data;
    },
    /** Obtener productos paginados para admin */
    adminObtenerProductos: async (params) => {
        const { data } = await apiClient.get(`${BASE}/admin/productos`, { params });
        return data.data;
    },
    /** Toggle producto en catálogo */
    adminToggleCatalogo: async (id, enCatalogo) => {
        await apiClient.put(`${BASE}/admin/productos/${id}/catalogo`, { enCatalogo });
    },
    /** Toggle producto destacado */
    adminToggleDestacado: async (id, destacado) => {
        await apiClient.put(`${BASE}/admin/productos/${id}/destacado`, { destacado });
    },
    /** Actualizar precio de oferta */
    adminActualizarPrecioOferta: async (id, precioOferta) => {
        await apiClient.put(`${BASE}/admin/productos/${id}/precio-oferta`, { precioOferta });
    },
    /** Obtener categorías */
    adminObtenerCategorias: async () => {
        const { data } = await apiClient.get(`${BASE}/admin/categorias`);
        return data.data;
    },
    /** Crear categoría */
    adminCrearCategoria: async (dto) => {
        const { data } = await apiClient.post(`${BASE}/admin/categorias`, dto);
        return data.data;
    },
    /** Actualizar categoría */
    adminActualizarCategoria: async (id, dto) => {
        const { data } = await apiClient.put(`${BASE}/admin/categorias/${id}`, dto);
        return data.data;
    },
    /** Eliminar categoría */
    adminEliminarCategoria: async (id) => {
        await apiClient.delete(`${BASE}/admin/categorias/${id}`);
    },
    /** Obtener banners */
    adminObtenerBanners: async () => {
        const { data } = await apiClient.get(`${BASE}/admin/banners`);
        return data.data;
    },
    /** Crear banner */
    adminCrearBanner: async (dto) => {
        const { data } = await apiClient.post(`${BASE}/admin/banners`, dto);
        return data.data;
    },
    /** Actualizar banner */
    adminActualizarBanner: async (id, dto) => {
        const { data } = await apiClient.put(`${BASE}/admin/banners/${id}`, dto);
        return data.data;
    },
    /** Eliminar banner */
    adminEliminarBanner: async (id) => {
        await apiClient.delete(`${BASE}/admin/banners/${id}`);
    },
    /** Obtener órdenes paginadas */
    adminObtenerOrdenes: async (params) => {
        const { data } = await apiClient.get(`${BASE}/admin/ordenes`, { params });
        return data.data;
    },
    /** Obtener detalle de orden */
    adminObtenerOrdenDetalle: async (id) => {
        const { data } = await apiClient.get(`${BASE}/admin/ordenes/${id}`);
        return data.data;
    },
    /** Actualizar estado de orden */
    adminActualizarEstadoOrden: async (id, estado) => {
        await apiClient.put(`${BASE}/admin/ordenes/${id}/estado`, { estado });
    },
    /** Subir imagen de producto */
    adminSubirImagen: async (id, file) => {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await apiClient.post(`${BASE}/admin/productos/${id}/imagen`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        return data.data;
    },
    /** Sincronizar productos manualmente */
    adminSincronizar: async () => {
        await apiClient.post(`${BASE}/admin/sincronizar`);
    },
};
