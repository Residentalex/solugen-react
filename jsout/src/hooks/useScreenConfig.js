import { useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
export function useScreenConfig(screenCodeOverride) {
    const activeModule = useUIStore((s) => s.activeModule);
    const usuario = useAuthStore((s) => s.usuario);
    return useMemo(() => {
        const code = screenCodeOverride || activeModule || '';
        const pantalla = usuario?.pantallas?.find((p) => p.codigo?.toUpperCase() === code.toUpperCase());
        const screenCode = pantalla?.codigo || code;
        const entidad = pantalla?.entidades?.[0];
        const documentCode = entidad?.entidadCodigo || screenCode.replace(/^F/, '');
        const typeEntity = entidad?.tipoEntidad;
        return { screenCode, documentCode, typeEntity, pantalla };
    }, [screenCodeOverride, activeModule, usuario]);
}
