import { create } from 'zustand';
import { THEMES, getIsDarkFromTheme } from '../themes';
const defaultToolbarState = {
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
const validThemes = [
    'light-default', 'dark-default',
    'light-ocean', 'dark-ocean',
    'light-midnight', 'dark-midnight',
    'light-rose', 'dark-rose',
    'light-amber', 'dark-amber',
    'light-genesis',
    'light-spa',
    'basic-devexpress',
];
let initialTheme = 'light-default';
if (savedRaw && validThemes.includes(savedRaw)) {
    initialTheme = savedRaw;
}
else if (savedRaw === 'dark' || savedRaw === 'light') {
    initialTheme = savedRaw === 'dark' ? 'dark-default' : 'light-default';
}
export const useUIStore = create((set) => ({
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
    updateToolbar: (state) => set((prev) => ({
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
