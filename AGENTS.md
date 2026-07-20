# AGENTS.md - Solugen React

## Alcance

Aplica a `solugen-react/`. Leer junto con `D:\Desarrollo\AGENTS.md`.

## Esencial

- App visual: Genesis.
- Stack: React 19, TypeScript, Vite, Ant Design, Zustand, Axios, React Router.
- UI: estilo Skote-like, Ant Design + CSS plano, color primario `#556ee6`.
- No agregar Bootstrap, Tailwind, styled-components ni otras librerias CSS.
- Sidebar desde `usuario.pantallas`, agrupado por modulo.
- Orden de grupos en el sidebar: Maestro → Operaciones → Consultas → Reportes. Definido como constante `ORDEN_GRUPOS` en `Sidebar.tsx`. Cualquier grupo nuevo que no esté en esa lista se coloca al final automáticamente.
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
- Al crear o ajustar una vista de listado, cargar y seguir `docs-ai/frontend-patron-listado.md` como referencia obligatoria antes de escribir código.
- Al crear o ajustar una vista de detalle, cargar y seguir `docs-ai/frontend-patron-detalle.md` como referencia obligatoria antes de escribir código.
- Al crear o ajustar un formulario, cargar y seguir `docs-ai/frontend-patron-formulario.md` como referencia obligatoria antes de escribir código.

## Listados sin columna Acciones redundante

- En las vistas de listado, si la columna primaria (Código, Nombre, Documento, Tipo Comprobante, etc.) ya es clickeable para abrir el detalle, **no debe existir una columna "Acciones" separada** con botón `EyeOutlined`.
- La acción de ver detalle se realiza mediante clic en el campo primario de la fila.
- Esto aplica a todos los módulos de catálogo y listados.

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

## Reglas de hooks de React

- Todos los hooks (useState, useEffect, useCallback, useMemo, useContext, etc.) deben declararse SIEMPRE antes de cualquier early return (return condicional).
- Un early return con `if (condicion) return <Componente />` hace que los hooks declarados DESPUES de esa linea no se ejecuten en ese render, rompiendo las Reglas de los Hooks.
- Esto aplica especialmente a hooks como `useCallback` y `useMemo` que suelen definirse tarde en el componente.
- Patron correcto: hooks al inicio, early return despues, handlers y JSX al final.

## Reglas visuales consolidadas del sistema

### Canon visual

Tres pantallas definen el canon visual del sistema. Cualquier pantalla nueva debe alinearse a estos patrones:

- **Listado/visualización**: `src/pages/EntradaAlmacen/EntradaAlmacen.tsx`
- **Detalle/consulta**: `src/pages/EntradaAlmacen/EntradaAlmacenDetalle.tsx`
- **Crear/editar**: `src/pages/EntradaAlmacen/EntradaAlmacenFormulario.tsx`

> **Estos tres archivos son el canon visual y estructural del sistema y no deben modificarse.** Cualquier ajuste visual, nuevo patrón o mejora debe implementarse en el módulo destino correspondiente, no alterando los archivos plantilla `EntradaAlmacen.tsx`, `EntradaAlmacenDetalle.tsx` ni `EntradaAlmacenFormulario.tsx`.

## Tipos TypeScript (DTOs)

- No definir interfaces DTO inline en componentes (`.tsx`). Usar las de `src/types/`.
- Si se necesita un subset, usar `Pick<Tipo, 'prop1' | 'prop2'>` o `Partial<Tipo>`.
- No duplicar tipos entre archivos de `src/types/` (ej: `ImpuestoDTO` solo en `contabilidad.ts`).
- Los nombres de propiedades deben coincidir con el backend DTO en camelCase.
- Referencia completa: `docs-ai/dto-mapeos.md`.

## Exportación a Excel

### Exportación a Excel con nombre de compañía

Toda exportación a Excel debe incluir una fila de encabezado con el nombre de la compañía con las primeras 3 columnas fusionadas (A+B+C). Usar el util compartido `src/utils/exportToExcel.ts` (`exportToExcel()` + `getCompanyName()`) en lugar de llamar directamente a `XLSX.*`. No importar `* as XLSX from 'xlsx'` directamente en páginas; centralizar toda la lógica de exportación en el util.

## Modulos protegidos (no modificar sin notificar)

Los siguientes modulos completos (listado, detalle y formulario) estan protegidos y **no deben modificarse** sin notificar explicitamente al usuario y recibir confirmacion:

- `src/pages/EntradaAlmacen/`
- `src/pages/SalidaAlmacen/`
- `src/pages/DevolucionCompra/`
- `src/pages/TransferenciaAlmacen/`

Cualquier cambio propuesto en estos archivos debe explicarse al usuario y esperar su confirmacion antes de implementarse.

### Patrón de listado (aplica a todas las listas)

Estructura obligatoria:

```tsx
<>
  {loadingError && <Alert ... />}
  <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }}
    styles={{ body: { padding: 0 } }}>
    <div style={{ padding: '16px 24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
        <Input.Search placeholder="Buscar..." allowClear onSearch={handleSearch}
          style={{ width: 400 }} prefix={<SearchOutlined className="paces-text-icon" />} />
        <div style={{ flex: 1 }} />
        <PermissionGate accion="CREAR">
          <Button type="primary" icon={<PlusOutlined />}>Nuevo</Button>
        </PermissionGate>
        <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
      </div>
    </div>
    <Table className="paces-border-top paces-list-table"
      rowClassName={(record) => selectedRow?.id === record.id ? 'paces-row-selected' : 'paces-row-hover'}
      pagination={{ showTotal: (t) => `${t} registros` }} />
  </Card>
</>
```

Reglas:
- Card siempre con `className="paces-card-erp"`, `borderRadius: 8`, `overflow: 'hidden'`, `styles={{ body: { padding: 0 } }}`
- Toolbar con flex, gap 8px, flexWrap wrap
- Search sin `value` controlado, solo `onSearch`, con `allowClear`
- `<div style={{ flex: 1 }} />` como spacer entre filtros y acciones
- Botón Nuevo envuelto en `PermissionGate accion="CREAR"` con `type="primary"` e `icon={<PlusOutlined />}`
- Botón Reload solo icono, sin texto
- Table con `className="paces-border-top paces-list-table"`, `rowClassName` con patrón hover/selected
- Pagination con `showTotal: (t) => \`${t} registros\``
- No usar columna "Acciones" separada si la columna primaria ya es clickeable

### Patrón de detalle (aplica a todas las consultas)

- Toolbar inline con Volver, spacer, acciones contextuales
- Layout responsive: `isLarge = screens.xxl === true` (NO `screens.lg ?? true`)
- Desktop (≥xxl, ≥1600px): `Row gutter={16}` con `Col xxl={18}` (contenido) + `Col xxl={6}` (sidebar)
- Compacto/mobile (<xxl): una columna sin sidebar, TotalesCard debajo de Tabs con `marginTop: 24`
- En compacto NO mostrar EntidadCard ni DocumentosRelacionadosCard
- Datos generales en Card con `Descriptions bordered size="small"`
- Tabs con `type="card"` usando `items={[]}` API (NO TabPane deprecated)
- Columnas estándar: Código (sticky left, width 120) + Artículo (auto) + Cantidad (120) + Costo (130, responsive md+) + Descuento (120, responsive lg+) + SubTotal (120, responsive lg+) + Impuestos (140, responsive lg+) + Total (120)
- `scroll.x`: `1100`
- Primera columna (Código) con `verticalAlign: 'top'`
- Línea secundaria de Artículo: familia como `<Tag>` a la izquierda, fecha vencimiento a la derecha
- Línea secundaria de Código: referencia debajo en 11px

### Patrón de formulario (aplica a todos los crear/editar)

- Toolbar inline con Guardar (primary) + Cancelar, alineados a la derecha
- Encabezado en Card con Form layout vertical, size small
- Layout: Row con Col izquierda (formulario, xxl={18}) + Col derecha (TotalesCard con `hideTitle`, xxl={6})
- En mobile (<xxl): TotalesCard apilado debajo del formulario
- TotalesCard DENTRO del Card Datos Generales, no en sidebar externo
- Tabla de detalles editable con drag-and-drop
- Columnas estándar: Drag(40) + Código(sticky 120) + Artículo(auto) + Cantidad(100) + Medida(160, condicional sinOC) + Costo(130, md+) + Descuento(120, lg+) + SubTotal(120, lg+) + Impuestos(140, lg+) + Total(120) + Acciones(50)
- `scroll.x`: `1300`
- Columna Medida: solo cuando no hay OC. Usar `...(sinOC ? [{...}] : [])`. Select con `idExterno` como value
- Tabs de info secundaria (asientos, historial) con `items={[]}` API

### Clases CSS del sistema

- `paces-card-erp`: Card base para todas las pantallas
- `paces-card`: Card para contenedores secundarios
- `paces-list-table`: Table en vistas de listado (padding estandarizado en celdas)
- `paces-border-top`: Borde superior en tablas listado
- `paces-row-hover`: Hover en filas de tabla
- `paces-row-selected`: Fila seleccionada
- `paces-doc-link`: Enlace de documento (color primario)
- `paces-avatar-initials`: Avatar circular con inicial
- `paces-text-total`: Texto de total (negrita, color heading)
- `paces-text-secondary`: Texto secundario
- `paces-text-dark`: Texto oscuro
- `paces-text-icon`: Icono en toolbar

### Prohibiciones visuales
- No usar TabPane (deprecated en Ant Design v5) - usar `items={[]}` API
- No usar `value` controlado en Input.Search de listados
- No usar `onChange` en Search de listados para búsqueda en tiempo real (usar debounce >= 300ms si es necesario)
- No crear columna "Acciones" redundante si la columna primaria es clickeable
- No duplicar SuplidorCard/TotalesCard - extraer a componentes compartidos si se necesitan en múltiples pantallas
- No usar estilos inline repetidos que puedan reemplazarse con clases CSS existentes
- Todo modal de busqueda o seleccion (BuscarConcepto, BuscarDocumento, BuscarEntidad, etc.) debe ser un componente compartido en `src/components/`, no definido dentro de la misma pagina donde se usa.
- La unica excepcion son modales especificos de una sola pantalla que no se reutilizan en ningun otro modulo.
