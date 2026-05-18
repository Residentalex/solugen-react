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
  revisado: boolean;
  reversar: boolean;
  imprimir: boolean;
  facturaScaneada: boolean;
  envioDGII: boolean;
  marcarEnvioDGII: boolean;
  modificarPagos: boolean;
  recalcular: boolean;
  recibir: boolean;
  anular: boolean;
}

interface UIState {
  sidebarCollapsed: boolean;
  activeModule: string;
  pageTitleOverride: string;
  toolbarState: ToolbarState;
  imprimirCallback?: () => void;
  nuevoCallback?: () => void;
  editarCallback?: () => void;
  guardarCallback?: () => void;
  cancelarCallback?: () => void;
  aplicarCallback?: () => void;
  anularCallback?: () => void;
  postearCallback?: () => void;
  revisadoCallback?: () => void;
  reversarCallback?: () => void;
  isDarkMode: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveModule: (module: string) => void;
  setPageTitleOverride: (title: string) => void;
  updateToolbar: (state: Partial<ToolbarState>) => void;
  resetToolbar: () => void;
  setImprimirCallback: (cb?: () => void) => void;
  setNuevoCallback: (cb?: () => void) => void;
  setEditarCallback: (cb?: () => void) => void;
  setGuardarCallback: (cb?: () => void) => void;
  setCancelarCallback: (cb?: () => void) => void;
  setAplicarCallback: (cb?: () => void) => void;
  setAnularCallback: (cb?: () => void) => void;
  setPostearCallback: (cb?: () => void) => void;
  setRevisadoCallback: (cb?: () => void) => void;
  setReversarCallback: (cb?: () => void) => void;
  toggleDarkMode: () => void;
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
  revisado: false,
  reversar: false,
  imprimir: false,
  facturaScaneada: false,
  envioDGII: false,
  marcarEnvioDGII: false,
  modificarPagos: false,
  recalcular: false,
  recibir: false,
  anular: false,
};

const savedTheme = localStorage.getItem('solugen-theme');
const initialDarkMode = savedTheme === 'dark';

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activeModule: '',
  pageTitleOverride: '',
  toolbarState: { ...defaultToolbarState },
  imprimirCallback: undefined,
  nuevoCallback: undefined,
  editarCallback: undefined,
  guardarCallback: undefined,
  cancelarCallback: undefined,
  aplicarCallback: undefined,
  anularCallback: undefined,
  postearCallback: undefined,
  revisadoCallback: undefined,
  reversarCallback: undefined,
  isDarkMode: initialDarkMode,

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setActiveModule: (module) => set({ activeModule: module }),
  setPageTitleOverride: (title) => set({ pageTitleOverride: title }),
  updateToolbar: (state) =>
    set((prev) => ({
      toolbarState: { ...prev.toolbarState, ...state },
    })),
  resetToolbar: () => set({
    toolbarState: { ...defaultToolbarState },
    imprimirCallback: undefined,
    nuevoCallback: undefined,
    editarCallback: undefined,
    guardarCallback: undefined,
    cancelarCallback: undefined,
    aplicarCallback: undefined,
    anularCallback: undefined,
    postearCallback: undefined,
    revisadoCallback: undefined,
    reversarCallback: undefined,
  }),
  setImprimirCallback: (cb) => set({ imprimirCallback: cb }),
  setNuevoCallback: (cb) => set({ nuevoCallback: cb }),
  setEditarCallback: (cb) => set({ editarCallback: cb }),
  setGuardarCallback: (cb) => set({ guardarCallback: cb }),
  setCancelarCallback: (cb) => set({ cancelarCallback: cb }),
  setAplicarCallback: (cb) => set({ aplicarCallback: cb }),
  setAnularCallback: (cb) => set({ anularCallback: cb }),
  setPostearCallback: (cb) => set({ postearCallback: cb }),
  setRevisadoCallback: (cb) => set({ revisadoCallback: cb }),
  setReversarCallback: (cb) => set({ reversarCallback: cb }),
  toggleDarkMode: () =>
    set((prev) => {
      const next = !prev.isDarkMode;
      localStorage.setItem('solugen-theme', next ? 'dark' : 'light');
      return { isDarkMode: next };
    }),
}));
