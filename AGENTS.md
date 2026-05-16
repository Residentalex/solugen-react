# AGENTS.md - Solugen React

## Alcance

Aplica a `solugen-react/`. Leer junto con `D:\Desarrollo\AGENTS.md`.

## Esencial

- App visual: Genesis.
- Stack: React 19, TypeScript, Vite, Ant Design, Zustand, Axios, React Router.
- UI: estilo Skote-like, Ant Design + CSS plano, color primario `#556ee6`.
- No agregar Bootstrap, Tailwind, styled-components ni otras librerias CSS.
- Sidebar desde `usuario.pantallas`, agrupado por modulo.
- Modulos/pantallas vienen de `AUTH_MODULO` y `AUTH_PANTALLA`.
- Si el backend espera fecha string, enviar `yyyyMMddHHmmss`.
- Despues de modificar frontend, ejecutar `npm run build` o `npx tsc --noEmit`.

## Comandos

```bash
npm run dev
npm run build
npm run lint
npx tsc --noEmit
```

## Referencia bajo demanda

- Cargar `docs-ai/frontend.md` solo si el cambio requiere detalles de estructura, UI o API.
