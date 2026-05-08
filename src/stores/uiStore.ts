import { create } from 'zustand';

export type RibbonGroups = {
  default: boolean;
  validate: boolean;
  print: boolean;
  factura: boolean;
  pos: boolean;
  dgii: boolean;
};

export interface ToolbarState {
  nuevo: boolean;
  clonar: boolean;
  editar: boolean;
  guardar: boolean;
  cancelar: boolean;
  aplicar: boolean;
  desaplicar: boolean;
  postear: boolean;
  anular: boolean;
  revisado: boolean;
  reversar: boolean;
  imprimir: boolean;
  facturaScaneada: boolean;
  envioDGII: boolean;
  marcarEnvioDGII: boolean;
  modificarPagos: boolean;
  recalcular: boolean;
  recibir: boolean;
}

interface UIState {
  sidebarCollapsed: boolean;
  activeModule: string;
  toolbarState: ToolbarState;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveModule: (module: string) => void;
  updateToolbar: (state: Partial<ToolbarState>) => void;
  resetToolbar: () => void;
}

const defaultToolbarState: ToolbarState = {
  nuevo: false,
  clonar: false,
  editar: false,
  guardar: false,
  cancelar: false,
  aplicar: false,
  desaplicar: false,
  postear: false,
  anular: false,
  revisado: false,
  reversar: false,
  imprimir: false,
  facturaScaneada: false,
  envioDGII: false,
  marcarEnvioDGII: false,
  modificarPagos: false,
  recalcular: false,
  recibir: false,
};

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activeModule: '',
  toolbarState: { ...defaultToolbarState },

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setActiveModule: (module) => set({ activeModule: module }),
  updateToolbar: (state) =>
    set((prev) => ({
      toolbarState: { ...prev.toolbarState, ...state },
    })),
  resetToolbar: () => set({ toolbarState: { ...defaultToolbarState } }),
}));
