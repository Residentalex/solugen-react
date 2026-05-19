import { create } from 'zustand';
import type { ThemeName } from '../themes';
import { THEMES, getIsDarkFromTheme } from '../themes';

export type { ThemeName };

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
  themeName: ThemeName;
  isDarkMode: boolean;
  primaryColor: string;
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
  setTheme: (name: ThemeName) => void;
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

const savedRaw = localStorage.getItem('solugen-theme');
const validThemes: ThemeName[] = [
  'light-default', 'dark-default',
  'light-ocean', 'dark-ocean',
  'light-midnight', 'dark-midnight',
  'light-rose', 'dark-rose',
  'light-amber', 'dark-amber',
];
let initialTheme: ThemeName = 'light-default';
if (savedRaw && (validThemes as readonly string[]).includes(savedRaw)) {
  initialTheme = savedRaw as ThemeName;
} else if (savedRaw === 'dark' || savedRaw === 'light') {
  initialTheme = savedRaw === 'dark' ? 'dark-default' : 'light-default';
}

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
  themeName: initialTheme,
  isDarkMode: getIsDarkFromTheme(initialTheme),
  primaryColor: THEMES[initialTheme].primaryColor,

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
  setTheme: (name) => {
    localStorage.setItem('solugen-theme', name);
    set({
      themeName: name,
      isDarkMode: getIsDarkFromTheme(name),
      primaryColor: THEMES[name].primaryColor,
    });
  },
}));
