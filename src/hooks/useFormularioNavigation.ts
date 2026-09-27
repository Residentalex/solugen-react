import { useEffect, useRef, type RefObject } from 'react';

export function useFormularioNavigation(bloqueoRef?: RefObject<boolean>) {
  const navigationConfirmedRef = useRef(false);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (bloqueoRef?.current) {
        window.history.pushState(null, '', window.location.pathname);
        return;
      }
      const leave = window.confirm('Los cambios no guardados se perderán. ¿Está seguro que desea salir?');
      if (!leave) {
        window.history.pushState(null, '', window.location.pathname);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [bloqueoRef]);

  useEffect(() => {
    const originalPushState = window.history.pushState.bind(window.history);
    window.history.pushState = function (data: any, _unused: string, url?: string | URL | null) {
      if (navigationConfirmedRef.current) {
        return originalPushState(data, _unused, url);
      }
      if (bloqueoRef?.current) return;
      const currentPath = window.location.pathname;
      const newPath = typeof url === 'string' ? url.split('?')[0] : (url instanceof URL ? url.pathname : null);
      if (newPath && currentPath !== newPath && !navigationConfirmedRef.current) {
        const leave = window.confirm('Los cambios no guardados se perderán. ¿Está seguro que desea salir?');
        if (!leave) return;
        navigationConfirmedRef.current = true;
      }
      return originalPushState(data, _unused, url);
    };
    return () => {
      window.history.pushState = originalPushState;
    };
  }, [bloqueoRef]);

  return navigationConfirmedRef;
}
