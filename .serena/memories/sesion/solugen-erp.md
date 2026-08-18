# Sesión Solugen ERP - Edición completa del Asiento Contable (FAsientoContable)

## Requisito actual (2026-08-16, ampliado por el usuario)
En el formulario de edición del asiento contable (`/FAsientoContable/{id}/editar`) el usuario quiere poder modificar **TODO**:
- Datos Generales ya editables: Concepto, Fecha, Entidad, NCF, Referencia, Nota (ya funcionan).
- **NUEVO pedido**: Moneda, Sucursal, Cuenta Bancaria, Beneficiario, **Detalles** y **Documentos Asociados**.
- Los tabs Detalles y Documentos Asociados hoy son SOLO LECTURA.

## Estado (actualizado)
- **Fase 1 FRONTEND COMPLETADA (16/08/2026)**: `AsientoContableFormulario.tsx` ahora tiene editables Moneda, Sucursal, Cuenta Bancaria, Beneficiario (Datos Generales), tabs Detalles y Documentos Asociados editables (Agregar/editar monto/descuento/eliminar, `BuscarDocumentoModal`), y `construirDTO()` envía `codigoMoneda`, `codigoSucursal`, `ctaBancaria`, `nombreBeneficiario`, `detalles` y `transaccionesAsociadas` completos en el PUT.
- Validado: `npx tsc --noEmit` OK y `npm run build` OK (warnings preexistentes no relacionados).
- Pendiente: prueba real PUT sobre asiento 7043523 (riesgo `REGISTRADO='F'` → puede requerir `UpdateBaseSinValidacion` con autorización) y evaluar cambio SQL CTABANC (backend) con autorización explícita.

## Estado del código frontend (AsientoContableFormulario.tsx)
- Card "Datos Generales": NO tiene campos de Moneda, Sucursal, Cuenta Bancaria ni Beneficiario.
- Card "Asientos Contables" con 5 Tabs:
  - `asientos` (editable, botón Agregar, activo) — ya OK.
  - `detalles` → `DetalleMovimientoTable` SOLO LECTURA (componente compartido `src/components/DetalleMovimientoTable.tsx`).
  - `documentos` → `TransaccionesAsociadasCard ... readOnly` (línea 821). Ese componente (src/components/TransaccionesAsociadasCard/) NO tiene modo edición; la prop `readOnly` solo controla navegación al documento al hacer click.
  - `historial` → LogTable (solo lectura, correcto).
  - `cobros` → CobrosCard (solo lectura, correcto).
- `construirDTO()` NO envía: codigoMoneda, codigoSucursal (usa base.codigoSucursal || ''), ctaBancaria, nombreBeneficiario, detalles, transaccionesAsociadas.
- PUT: `transaccionApi.actualizar(sucursal, dto)` → `PUT /Transaccion/{sucursal}`.

## Backend (PUT /Transaccion/{sucursal} → ServicioTransaccion.Actualizar :244 → repo.Actualizar)
- `RepositorioTransaccion.Actualizar` (:222) usa `UpdateBase` + `TransaccionParamMap`:
  - **SÍ actualiza**: CODMON (@CodigoMoneda), SUCURSAL (@CodigoSucursal, `WHERE s.id = @CodigoSucursal`), NOMBRE2 (@NombreBeneficiario), NUMERO_CTA (@NoCuenta), FECHA, TIPO_ENTIDAD, NOTAS, TOTAL, DOC_REF, CODCONCEPTO, TASA, NCF, NCFM, RNC, DIASCREDITO, DEBCRED, Posteado, MBIENES/MSERVICIOS/MRETENCION, etc.
  - **NO actualiza CTABANC** (cuenta bancaria): no es `.Campo()` en `UpdateBase`/`UpdateBaseSinValidacion`; solo se usa `Where("CTABANC = @CtaBanc")` como condición de concurrencia si viene llena. → Para editar cuenta bancaria hace falta agregar `.Campo("CTABANC", "@CtaBanc")` al UpdateBase (SQL funcional → requiere autorización).
  - **Detalles**: `EliminarDetalle` + `CrearDetalle` en el mismo Actualizar → SÍ persiste detalles editados (estructura `DetalleMovimientoDTO`).
  - **TransaccionesAsociadas**: `EliminarDocumentosAsociados` + `EliminarDocumentosAsociadosInventario` + recrea SOLO si `Count > 0`. → Si el frontend no envía la lista, se pierden las existentes. El frontend DEBE reenviar la lista completa.
  - **Asientos**: `EliminarAsientos` + `CrearAsientos` (el frontend ya los envía).
- **RIESGO CRÍTICO**: `UpdateBase` tiene `Where("REGISTRADO = 'F'")`. Si el documento está REGISTRADO='T' (Aplicado), el UPDATE afecta 0 filas → `GuardarDatos` devuelve null → excepción "El documento ya fue modificado por otro usuario". El asiento 7043523 está REGISTRADO='T'. `UpdateBaseSinValidacion` NO tiene ese WHERE (solo TRANSACID y TIPO_DOC) pero lo usa `ActualizarSinValidacionConcurrencia`. → Si la prueba real falla, evaluar cambio backend (usar UpdateBaseSinValidacion cuando pe_modificar_admin) — requiere autorización.
- `pe_modificar_admin` (servicio :247) solo salta validaciones de fecha/entidad, NO cambia el SQL de actualización.

## Catálogos disponibles (frontend, para los campos nuevos)
- Monedas: `monedaApi.obtenerListado(sucursal)` → `GET /Moneda/{sucursal}` → `MonedaDTO[]`.
- Cuentas bancarias: `cuentaBancariaApi.obtenerListado(sucursal)` → `CuentaBancariaDTO {noCuenta, nombre, banco, cuentaContable, agente, nota, activo, codigo, balance?, moneda?}`.
- Sucursales: `useCompanyStore().data.sucursales` → items con `sucursal` (ID numérico) y `nombre` (helper `getMonedaSucursalActiva()` en src/utils/moneda.ts usa este store).
- Beneficiario: Input libre (string `nombreBeneficiario`).
- Patrón de referencia: `src/pages/TransaccionBancaria/TransaccionBancariaFormulario.tsx`:
  - `codigoSucursal: data?.sucursal?.sucursal ? String(data.sucursal.sucursal) : String(sucursalActiva)` (línea ~519).
  - `ctaBancaria: values.cuentaBancaria`, `nombreBeneficiario: values.beneficiario`, `codigoMoneda` derivado del concepto (líneas ~516-527).
  - Select de Cuenta Bancaria (solo en crear; en editar muestra Text) líneas 865-910.
  - Carga cuentas: `cuentaBancariaApi.obtenerListado` (línea 176).
  - `transaccionesAsociadas` mapeo con `id, transaccionAsociadaID, monto, montoOriginal, descuento, retencion, nCF, documento, pagado, saldoPendiente` (líneas ~528-540).

## Datos de prueba
- Asiento 7043523 (ND 0000045376, 2026-08-12, Consolidado): GET real `Transaccion/4/7043523` → asientos(5), transaccionesAsociadas(2: RDE-0300090798 y DVC-0301006755), logs(3), detalles([]), cobros([]). Estado Aplicado (REGISTRADO='T').
- Sucursales: 0=Orense Plaza, 1=Hiper Romana, 2=Orense Villa Hermosa, 3=El Ofertazo, 4=Consolidado, 5=Compra.
- FECHA_ULTCIERRE Consolidado = 2026-06-30 → período agosto abierto.
- Permisos: pe_modificar_admin en ROLID 11 (Director Financiero), sucursal 4. Usuarios rol 11 suc 4: CARLOS HERNANDEZ (11), CARLUIS JIMENEZ (2). Re-login requerido para refrescar permisos especiales.

## Validación
- Frontend: `npx tsc --noEmit` y `npm run build` (vite 5.4.21). ESLint solo marca no-explicit-any (patrón del proyecto).
- Backend: `dotnet build "SolugenApi 0.2.sln"` (no reiniciar sin autorización).

## Pendientes previos (contexto)
- Re-login rol 11 suc 4 → verificar botón Editar en 7042384/7043523.
- Verificar `/MROL/28/editar` muestra los 2 usuarios como tags (RolFormulario.tsx, ya implementado, build OK).
