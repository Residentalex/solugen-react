# AGENTS.md - Solugen React

## Información del Proyecto

- **Nombre de la app:** enesis (la **G** del logo + "enesis" = **Genesis**)
- **Logo:** Una letra **G** en un cuadro con degradado azul, seguida del texto "enesis"
- **Propósito:** Frontend del ERP Solugen
- **Stack:** React 19, TypeScript 6, Vite 5, Ant Design v6, Zustand 5, Axios, React Router v7

## Diseño UI

- Estilo **Skote-like**: sidebar claro, topbar claro, page header, dashboard con widgets
- Tema personalizado de Ant Design vía `ConfigProvider` en `src/main.tsx`
- Color primario: `#556ee6` (azul Skote)
- Sidebar colapsable (250px → 80px)
- El logo muestra una **G** + "enesis" = **Genesis**

## Estructura

```
src/
├── api/          → Axios client + authApi
├── components/   → GenesisLogo, PermissionGate
├── layouts/      → MainLayout, Sidebar, Toolbar
├── pages/        → Login, Dashboard, Home (legacy)
├── stores/       → authStore, uiStore, companyStore (Zustand)
├── types/        → auth.ts (Sucursal, DTOs, ApiResponse)
├── App.tsx       → Router principal
├── main.tsx      → Entry point + ConfigProvider
└── index.css     → Estilos globales
```

## Comandos

```bash
npm run dev      # Vite dev server (puerto 5173)
npm run build    # tsc -b + vite build
npm run lint     # ESLint
```

## API

- URL: `http://localhost:4002/api` (definida en `.env` como `VITE_API_URL`)
- Autenticación: JWT + refresh token
- Formato respuesta: `{ isSuccess, data, errorMessage }`

## Importante

Después de cada modificación en el código, ejecutar `npm run dev` (o `npx tsc --noEmit` para solo verificar tipos) para probar los cambios. No asumir que el frontend está corriendo — siempre reiniciar el servidor de desarrollo.

## Reglas

- No proponer Bootstrap, Tailwind, styled-components, ni otras librerías CSS — solo Ant Design v6 + CSS plano
- Los nombres de módulos/pantallas vienen directamente de la BD (tablas `AUTH_MODULO`, `AUTH_PANTALLA`)
- El Sidebar se construye dinámicamente desde `usuario.pantallas` agrupado por módulo
- No se requiere migración de datos
