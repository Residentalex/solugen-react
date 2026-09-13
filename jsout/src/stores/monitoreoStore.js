import { create } from 'zustand';
export const useMonitoreoStore = create((set, get) => ({
    cajasMap: {},
    sucursalesList: [],
    signalRConectado: false,
    ultimaActualizacion: null,
    setCajas: (cajas) => {
        const cajasMap = {};
        const sucursalesSet = new Set();
        for (const caja of cajas) {
            cajasMap[caja.ip] = caja;
            sucursalesSet.add(caja.sucursal);
        }
        set({
            cajasMap,
            sucursalesList: Array.from(sucursalesSet).sort((a, b) => a - b),
        });
    },
    actualizarCaja: (caja) => {
        set((state) => {
            const newMap = { ...state.cajasMap, [caja.ip]: caja };
            const sucursalesSet = new Set(state.sucursalesList);
            sucursalesSet.add(caja.sucursal);
            return {
                cajasMap: newMap,
                sucursalesList: Array.from(sucursalesSet).sort((a, b) => a - b),
            };
        });
    },
    marcarDesconectada: (ip) => {
        set((state) => {
            const caja = state.cajasMap[ip];
            if (!caja)
                return state;
            return {
                cajasMap: { ...state.cajasMap, [ip]: { ...caja, conectado: false } },
            };
        });
    },
    setSignalRConectado: (conectado) => set({ signalRConectado: conectado }),
    setUltimaActualizacion: (fecha) => set({ ultimaActualizacion: fecha }),
    obtenerCajasPorSucursal: (sucursal) => {
        return Object.values(get().cajasMap).filter((c) => c.sucursal === sucursal);
    },
    obtenerCajasList: () => {
        return Object.values(get().cajasMap);
    },
    obtenerSucursalesList: () => {
        return get().sucursalesList;
    },
    hayCajasConectadas: () => {
        return Object.values(get().cajasMap).some((c) => c.conectado);
    },
}));
