# AGENTS.md - Solugen React

## Alcance

Aplica a `solugen-react/`. Leer junto con `D:\Desarrollo\AGENTS.md`.

## Esencial

- App visual: Genesis.
- Stack: React 19, TypeScript, Vite, Ant Design, Zustand, Axios, React Router.
- UI: estilo Skote-like, Ant Design + CSS plano, color primario `#556ee6`.
- No agregar Bootstrap, Tailwind, styled-components ni otras librerias CSS.
- Sidebar desde `usuario.pantallas`, agrupado por modulo.
- En formularios de edicion con toolbar contextual que cambia segun el estado del documento, usar toolbar inline (dentro del componente) en lugar del toolbar global, para evitar duplicacion de botones Guardar/Cancelar.
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

## Manejo de errores de API

- En llamadas a API dentro de `useEffect` o handlers, los errores deben mostrarse al usuario via Ant Design `message.error()`.
- Usar el mensaje devuelto por el backend: `err?.response?.data?.errorMessage`.
- No usar `catch` vacíos (`.catch(() => {})`) porque ocultan fallos al usuario.

## Búsqueda en listados

- La barra de búsqueda en todas las vistas de listado debe ser consistente con Entrada Almacén:
  - `Input.Search` **sin** `value` controlado (no usar `value={searchText}`).
  - La búsqueda se activa **al presionar Enter o el botón de lupa** (`onSearch`), no al escribir cada tecla.
  - `handleSearch` actualiza `searchText` y resetea la página a 1.
  - El botón limpiar (X) de `allowClear` dispara `onSearch('')`, que restaura el listado completo.
  - No usar `onChange` para actualizar `searchText` en tiempo real; solo `onSearch`.
  - Si se necesita búsqueda automática al escribir, usar debounce con al menos 300ms.
- Visualmente, la barra de búsqueda debe replicar EXACTAMENTE el layout de `EntradaAlmacen.tsx`:
  - `Input.Search` sin `enterButton`, con `prefix={<SearchOutlined className="paces-text-icon" />}` y `style={{ width: 400 }}`.
  - Botón de recargar con solo icono `ReloadOutlined`, sin texto.
  - Layout flex con `gap: '8px'`, `flexWrap: 'wrap'`, `<div style={{ flex: 1 }} />` como spacer antes de botones.
  - Ver `docs-ai/frontend-patron-listado.md` sección "Barra de búsqueda y filtros (layout visual)" para el patrón completo.
