import { create } from 'zustand';
import { ecommerceApi } from '../api/ecommerceApi';
import { generarUUID } from '../utils/uuid';
const SESSION_ID_KEY = 'ecom_session_id';
function getSessionId() {
    let id = localStorage.getItem(SESSION_ID_KEY);
    if (!id) {
        id = generarUUID();
        localStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
}
export const useCarritoStore = create((set, get) => ({
    items: [],
    totalItems: 0,
    subtotal: 0,
    impuestos: 0,
    total: 0,
    loading: false,
    sessionId: getSessionId(),
    cargarCarrito: async () => {
        const { sessionId } = get();
        try {
            const resumen = await ecommerceApi.obtenerCarrito(sessionId);
            set({
                items: resumen.items,
                totalItems: resumen.totalItems,
                subtotal: resumen.subtotal,
                impuestos: resumen.impuestos,
                total: resumen.total,
            });
        }
        catch (error) {
            console.warn('No se pudo cargar el carrito', error);
        }
    },
    agregarProducto: async (codigoProducto, cantidad) => {
        const { sessionId } = get();
        set({ loading: true });
        try {
            await ecommerceApi.agregarAlCarrito({ sessionId, codigoProducto, cantidad });
            await get().cargarCarrito();
        }
        finally {
            set({ loading: false });
        }
    },
    actualizarCantidad: async (id, cantidad) => {
        const { sessionId } = get();
        set({ loading: true });
        try {
            await ecommerceApi.actualizarCantidad(id, { sessionId, cantidad });
            await get().cargarCarrito();
        }
        finally {
            set({ loading: false });
        }
    },
    eliminarItem: async (id) => {
        const { sessionId } = get();
        set({ loading: true });
        try {
            await ecommerceApi.eliminarDelCarrito(id, sessionId);
            await get().cargarCarrito();
        }
        finally {
            set({ loading: false });
        }
    },
    vaciarCarrito: async () => {
        const { sessionId } = get();
        set({ loading: true });
        try {
            await ecommerceApi.vaciarCarrito(sessionId);
            set({ items: [], totalItems: 0, subtotal: 0, impuestos: 0, total: 0 });
        }
        finally {
            set({ loading: false });
        }
    },
}));
