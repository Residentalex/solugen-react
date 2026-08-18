import { create } from 'zustand';
import type { MonitoreoCajaDTO } from '../types/monitoreo';

interface MonitoreoState {
  /** Cajas indexadas por IP */
  cajasMap: Record<string, MonitoreoCajaDTO>;
  /** IDs de sucursales disponibles */
  sucursalesList: number[];
  /** Conexión SignalR activa */
  signalRConectado: boolean;
  /** Timestamp de la última actualización recibida */
  ultimaActualizacion: string | null;

  // Acciones
  setCajas: (cajas: MonitoreoCajaDTO[]) => void;
  actualizarCaja: (caja: MonitoreoCajaDTO) => void;
  marcarDesconectada: (ip: string) => void;
  setSignalRConectado: (conectado: boolean) => void;
  setUltimaActualizacion: (fecha: string) => void;

  // Selectores (como funciones del store)
  obtenerCajasPorSucursal: (sucursal: number) => MonitoreoCajaDTO[];
  obtenerCajasList: () => MonitoreoCajaDTO[];
  obtenerSucursalesList: () => number[];
  hayCajasConectadas: () => boolean;
}

export const useMonitoreoStore = create<MonitoreoState>((set, get) => ({
  cajasMap: {},
  sucursalesList: [],
  signalRConectado: false,
  ultimaActualizacion: null,

  setCajas: (cajas) => {
    const cajasMap: Record<string, MonitoreoCajaDTO> = {};
    const sucursalesSet = new Set<number>();
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
      if (!caja) return state;
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
