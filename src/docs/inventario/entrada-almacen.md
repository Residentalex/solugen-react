# Entrada de Almacén (ENP)

> **📚** Este documento describe el flujo completo de **Entrada de Almacén** (código **ENP**). Está dirigido a usuarios finales que gestionan compras, inventario y contabilidad.

---

## ¿Qué es una Entrada de Almacén?

Una **Entrada de Almacén (ENP)** es el documento transaccional que registra el ingreso físico de mercancías al inventario. Incrementa el stock disponible y constituye la base para:

- La **actualización de costos** de los productos
- La **generación de asientos contables** (posteo automático o manual)
- La **generación automática de documentos** derivados (Factura Suplidor, Entrada Diario, etc.)

> **💡** La ENP es el punto de partida del ciclo de compras: recibe mercancía, actualiza costos, y dispara la contabilización.

---

## El Concepto: el corazón de la ENP

El **Concepto**  `Tabla - CONCEPTOS` es el campo más importante de la ENP porque define **TODO** el comportamiento del documento.

### Campos del Concepto que afectan la ENP

| Campo Técnico | Nombre Visual | Efecto |
|:---|:---|---|
| `Moneda` | Moneda del concepto | Define la moneda de la ENP. Si está vacío, usa la moneda por defecto de la empresa. |
| `Almacen` | Almacén por defecto | Se usa como almacén predeterminado al crear. Si no tiene, usa el almacen defecto de la Empresa. |
| `NoImpuesto` | Sin Impuestos | Si es **true**, al **crear** o **actualizar** la ENP se fuerzan **todos los impuestos de los detalles a 0**. |
| `NoAsientos` | Sin Asientos | Si es **true**, **no se generan asientos contables** al postear. |
| `NoActualizaCostos` | No Actualizar Costos | Si es **true**, **no se actualiza** el costo de los productos al aplicar la ENP. |
| `DocAGenerar` | Documento a Generar | Define qué documento se genera automáticamente al postear. Ejemplo: `RDE` genera Factura Suplidor, `EDI` genera Entrada Diario Inventario. |
| `NoCuenta` | Cuenta Suplidor | Cuenta contable del suplidor. Si está vacío, usa la cuenta del suplidor directamente. |
| `Replicar` | Replicar a otra sucursal | Si es **true**, al postear los asientos se replican automáticamente en la sucursal indicada en `SucursalRéplica`. |
| `SucursalRéplica` | Sucursal Réplica | Sucursal destino donde se replican los asientos contables si `Replicar = true`. |
| `SucursalDestino` | Sucursal Destino | Para transferencias entre sucursales (no confundir con réplica contable). |
| `ConceptoDestino` | Concepto Destino | Concepto contable equivalente en la sucursal destino. |

> **⚠️** El concepto debe configurarse correctamente ANTES de crear ENPs. Cambiar el concepto en una ENP existente puede alterar el comportamiento contable.

### ¿Qué significa `DocAGenerar`?

Cuando el concepto tiene `DocAGenerar`, al **postear** la ENP se genera automáticamente un documento hijo:

| Valor | Documento Generado | Propósito |
|:---|:---|---|
| `RDE` | Factura Suplidor (Compra) | Registra la deuda con el suplidor. **Obliga a ingresar NCF**. |
| `EDI` | Entrada Diario Inventario | Asiento de diario de inventario (sin suplidor). |
| *(vacío)* | Ninguno | Solo afecta inventario, sin documento derivado. |

---

## Relaciones con otros módulos

La ENP no funciona aislada. Estos son los documentos con los que se relaciona:

| Documento | Tipo de relación | Descripción |
|:---|---|:---|
| **Orden de Compra (ORC)** | Asociación | La ENP puede (o debe) asociarse a una OC. Ver sección correspondiente. |
| **Factura Suplidor (RDE)** | Generación automática | Si el Concepto tiene `DocAGenerar = "RDE"`, al postear se genera una Factura Suplidor. |
| **Entrada Diario Inventario (EDI)** | Generación automática | Si el Concepto tiene `DocAGenerar = "EDI"`, al postear se genera un asiento de diario. |
| **Salida Almacén (SAP)** | Origen | Una ENP puede generarse automáticamente desde una SAP (transferencia entre almacenes). En ese caso, **no se puede desaplicar** directamente. |
| **Devolución Compra (DVC)** | Referencia | Una devolución al suplidor puede referenciar una ENP como origen de la mercancía devuelta. |
| **Sucursal Réplica** | Replicación | Si el concepto tiene `Replicar = true`, los asientos se replican en la sucursal configurada como `SucursalRéplica`. Ver sección Postear. |

---

## Orden de Compra (OC)

La ENP puede (y en algunos casos **debe**) asociarse a una **Orden de Compra (ORC)**.

### ¿Cuándo es obligatoria la OC?

Depende de la configuración del suplidor:

- Si el suplidor tiene marcado **No Requiere OC** = `false`, la ENP **debe** tener una OC asociada.
- Si el suplidor no exige OC, la asociación es opcional.

> **💡** Esta configuración está en el catálogo de Suplidores, campo `noreqorc`.

### Comportamiento cuando hay OC

Cuando la ENP tiene una OC asociada:

1. **Productos restringidos**: Solo se pueden agregar productos que estén en la OC.
2. **Costos controlados**: Los costos deben coincidir con los de la OC, con una **tolerancia de ±1 unidad**.
3. **Productos "Pesados"**: Si un detalle de la OC está marcado como `Pesado`, se salta la validación de costo (flexible).
4. **Aumento de precio**: Si la familia del producto tiene `AumentoPrecioMaximo > 0`, se valida que el nuevo costo no supere el último costo * (1 + aumento%). Si lo supera, se bloquea la aplicación.

### Al aplicar

Cuando la ENP se aplica teniendo una OC:
- Se llama a `ActualizarRecibidos()` en la OC, marcando las cantidades recibidas.
- Al desaplicar, se revierte esa actualización.

---

## Crear una Entrada

### Validaciones al guardar

1. **Fecha de cierre**: Si la fecha del documento es **menor o igual** a la fecha de cierre de la sucursal → error: *"La fecha de entrada es menor o igual a la fecha de cierre"*.
2. **Sin impuestos**: Si `Concepto.NoImpuesto = true`, todos los detalles se guardan con impuestos = 0 automáticamente.
3. **Actualizar Costos**: Si el flag `ActualizarCostos` está activo (desde el frontend):
   - Se llama a `PrepararENP()` que carga el concepto completo, el suplidor, y para cada detalle:
     - Obtiene el producto completo de BD
     - Asigna el **impuesto de compra** del producto (primer impuesto con ámbito `Compra`)
     - Asigna el **último costo** del producto como costo unitario
     - Asigna la **familia** del producto
   - Luego `Recalcular()`: calcula SubTotal, Descuento, Impuestos y Total de cada detalle y del encabezado.

### Fórmulas de Recalcular

Para cada detalle:

| Campo | Fórmula |
|:---|---|
| `SubTotal` | `Cantidad × Costo` |
| `Descuento` | `SubTotal × PorcentajeDescuento / 100` (redondeado a 2 decimales) |
| `Impuestos` | `(SubTotal - Descuento) × PorcentajeImpuesto / 100` (redondeado a 2 decimales) |
| `Total` | `SubTotal + Impuestos - Descuento` |

Totales del encabezado: suma de los valores de todos los detalles.

#### Costo efectivo con bonificable

Si un detalle tiene **cantidad bonificable** (ej: "compre 10, lleve 12"), el costo unitario se recalcula automáticamente para distribuir el costo original entre todas las unidades recibidas:

```
CantidadEfectiva = Cantidad + CantidadBonificable
CostoEfectivo    = SubTotalOriginal / CantidadEfectiva
```

Esto evita que los productos bonificados distorsionen el costo del inventario.

### Campos del formulario

| Campo | Descripción | Origen |
|:---|---|:---:|
| Concepto | Define el comportamiento del documento. | Obligatorio |
| Almacén | Almacén destino. Por defecto el del concepto o PARAMETROS. | Obligatorio |
| Fecha Documento | Fecha contable del movimiento. | Obligatorio |
| Suplidor | Proveedor de la mercancía. | Según concepto |
| Moneda | Moneda del documento. Por defecto la del concepto o PARAMETROS. | Obligatorio |
| Orden de Compra | OC asociada (si aplica). | Según suplidor |
| NCF | Número de Comprobante Fiscal. Obligatorio si Concepto.DocAGenerar = "RDE". | Condicional |
| Referencia | Documento de referencia externo. | Opcional |
| Observaciones | Notas adicionales. | Opcional |
| Fecha Entrega | Fecha en que se recibió físicamente. | Opcional |

---

## Aplicar una Entrada

Aplicar una ENP significa **confirmar el ingreso a inventario**: el stock se incrementa, los costos se actualizan y opcionalmente se generan asientos contables.

### Orden de validaciones (TODAS antes de persistir)

El backend ejecuta estas validaciones **en estricto orden** y solo persiste el cambio de estado si todas pasan:

#### 1. Scanner obligatorio (si tiene Orden de Compra)
Si la ENP tiene una OC asociada, **debe existir un PDF escaneado** de la factura en la ruta configurada (`ScannerPath` en `appsettings.json`).
La ruta esperada es: `{ScannerPath}/{Sucursal}/ENP/{NoDocumento}.pdf`

> **⚠️** Si el scanner no está configurado o el PDF no existe, se rechaza la aplicación con: *"Debe escanear la factura antes de aplicarla"*.

#### 2. Fecha permitida
Si el documento tiene `FechaPermitida = MenorIgualFechaDia`, la fecha del documento **no puede ser mayor a hoy**. Se valida tanto `FechaDocumento` como `FechaEntrega`.

#### 3. NCF obligatorio
Si el concepto tiene `DocAGenerar = "RDE"`, el NCF es **obligatorio**. Si está vacío, se rechaza.

#### 4. NCF duplicado
Si la ENP tiene NCF, el sistema busca en **Factura Suplidor (RDE)** si ya existe ese NCF para el mismo suplidor. Si encuentra coincidencia, rechaza: *"Este NCF fue usado en el documento X"*.

#### 5. Validación contra Orden de Compra
Si la ENP tiene OC, por cada detalle de la ENP que coincida con un detalle de la OC:

- **Aumento de precio**: Si la familia del producto tiene `AumentoPrecioMaximo > 0`, calcula si `CostoNuevo > UltimoCosto × (1 + Aumento%/100)`. Si supera, bloquea.
- **Coincidencia de costo** (solo si el producto NO es "Pesado" en la OC):
  - Válido si `|CostoOC - CostoENP| <= 1`, **o**
  - Válido si la línea tiene **cantidad bonificable** (`CantidadBonificable != 0`).

> **💡** Los productos "Pesados" en la OC tienen validación flexible de costo, pensado para productos cuyo peso varía.

### ¿Qué pasa después de aplicar?

Una vez superadas todas las validaciones y persistido el cambio:

| Paso | ¿Cuándo? | Descripción |
|:---|:---:|---|
| Marcar registrado | Siempre | `registrado = 'T'` en BD. La ENP pasa a estado **Aplicado**. |
| Actualizar OC | Si tiene OC | `ActualizarRecibidos()`: registra las cantidades recibidas contra la OC. |
| Asignar suplidor a productos | Si `DocAGenerar = "RDE"` | `ActualizarSuplidores()`: asigna el suplidor de la ENP a cada producto del detalle. |
| Actualizar costo de productos | Si `NoActualizaCostos = false` | `ActualizarCosto()`: **fórmula** → `costo = ((Costo - Costo × %Descuento/100) / Medida.Factor) × Tasa` |
| Postear asientos | Si `MetodoPosteo = Aplicar` y `NoAsientos = false` | Genera asientos contables automáticamente (ver sección Postear). |
| Refrescar análisis de compra | Siempre | Job en **Hangfire** para actualizar análisis de compra (background). |
| Actualizar costos en PV | Siempre | Job en **Hangfire** que actualiza `COSTO` y `COSTOX` en `DTRANSAC` de documentos PV con fecha ≥ fecha documento. |

---

## Postear (Generar Asientos Contables)

El posteo se ejecuta **automáticamente al aplicar** si `MetodoPosteo = Aplicar` y `Concepto.NoAsientos = false`. También puede hacerse manualmente después.

### ¿Cómo se generan los asientos?

La lógica está en `GenerarAsientos()`:

#### Paso 1: Asientos por producto
Por cada detalle de tipo **"Producto"** que tenga familia:

| Elemento | Cuenta Contable | Tipo Asiento |
|:---|---|:---:|
| **Costo del producto** | `Familia.CuentaCostoCompra` si existe, si no `Almacen.CuentaContable` | `D` (Débito) si `OrigenCuenta = Crédito`, `C` (Crédito) si `OrigenCuenta = Débito` |
| **Monto** | `(SubTotal - Descuento + Flete) × Tasa` | |

Si **varios productos** comparten la misma cuenta contable, se **agrupan** en un solo asiento sumando los montos.

#### Paso 2: Asientos por impuesto
Si el detalle tiene impuesto (`Impuestos > 0`) **y** el impuesto tiene cuenta contable, se crea un asiento adicional por el monto del impuesto.

> **ℹ️** Si `Concepto.NoImpuesto = true` o el suplidor tiene `IncluyeImpuesto = false`, los impuestos se excluyen del total antes de generar asientos.

#### Paso 3: Asiento del Suplidor
- **Cuenta**: usa `Concepto.NoCuenta` si tiene valor; si no, usa `Suplidor.CuentaContable`.
- **Monto**: suma del `Total` de todos los detalles (SubTotal - Descuento + Impuestos).
- **Tipo Asiento**: **contrario** al de los productos (el que balancea).

> **⚠️** Si el suplidor no tiene cuenta contable asignada, el posteo falla con: *"El suplidor X no tiene cuenta contable asignada"*.

#### Paso 4: Cuenta Prima
Si alguna cuenta contable tiene configurada una `CuentaPrima` (cuenta de redondeo), se genera un asiento adicional por la diferencia:
- `MontoPrima = (Monto × Tasa) - Round(Monto, 2)`

#### Paso 5: Ajuste de residuos
Si después de generar todos los asientos hay una diferencia **menor a 1** entre `(Total × Tasa)` y la suma de débitos o créditos, se ajusta en el **primer asiento** de cada lado.

### Replicación de asientos a otra sucursal

Si el concepto de la ENP tiene `Replicar = true` y una `SucursalRéplica` definida, al postear los asientos se **replican automáticamente** en esa sucursal destino:

1. Se clona el documento y se busca el concepto contable equivalente en la sucursal destino.
2. Se postean los asientos en ambas sucursales.
3. Al desaplicar o anular, también se replica la operación en la sucursal destino.

> **💡** Es común configurar la réplica hacia la sucursal **Consolidado** para centralizar la contabilidad. Pero puede ser cualquier sucursal del sistema.

---

## Desaplicar

Desaplicar revierte una ENP que estaba en estado **Aplicado** a **Borrador**, permitiendo su edición.

### Restricciones (nuevas)

El sistema **bloquea** la desaplicación si:

1. **Generada desde Salida Almacén (SAP)**: Si la ENP fue creada automáticamente desde una SAP o transferencia (relación en `DOCUMENTOS_RELACION` con tipo `GENERA` o `TRASPASO`), no se puede desaplicar. Mensaje: *"No se puede desaplicar porque esta entrada fue generada desde X"*.
2. **Factura (RDE) con pagos**: Si el RDE generado desde la ENP tiene **pagos asociados** (`DOCASOC`), no se puede desaplicar. Mensaje: *"No se puede desaplicar porque la factura X tiene pagos o documentos asociados"*.

### ¿Qué ocurre al desaplicar?

| Acción | Descripción |
|:---|---|
| Reversar inventario | Se elimina el efecto en stock. |
| Eliminar asientos | Se eliminan los asientos contables generados. |
| Reversar OC | Si tiene OC, se reversan las cantidades recibidas. |
| Eliminar o desaplicar RDE generado | Si el RDE no tiene pagos, se elimina. Si tiene pagos, se desaplica (no se elimina). |
| Replicar en Consolidado | Si la ENP existe en Consolidado, también se desaplica allí. |

---

## Reversar

**Reversar** es diferente de **Anular**. Mientras que anular cancela el documento completo, reversar crea un **asiento contable inverso** que neutraliza el efecto contable original sin alterar el inventario ni el estado del documento.

### ¿Cuándo se usa?

- Cuando se necesita corregir un error contable sin perder el registro de inventario.
- Cuando el periodo contable ya está cerrado y no se puede desaplicar.

### ¿Qué hace?

- Crea un nuevo documento con asientos en sentido contrario (débitos ↔ créditos).
- El documento original permanece en estado **Aplicado**.
- No afecta el stock ni los costos de los productos.

> **💡** Si lo que necesitas es cancelar la entrada por completo (devolución de mercancía), usa **Anular** o **Desaplicar** según corresponda.

---

## Estados del documento

| Estado | Valor | Descripción | Acciones disponibles |
|:---|---:|---|---|
| **Borrador** | 0 | Documento creado pero sin efecto en inventario. | Editar, Guardar, Aplicar, Anular, Eliminar |
| **Aplicado** | 1 | Ya afectó inventario. Stock y costos actualizados. | Ver detalle, Desaplicar\*, Anular, Postear\*\*, Imprimir |
| **Anulado** | 3 | Documento cancelado con reverso contable. | Solo consulta, Imprimir |

> **⚠️** (\*) Desaplicar solo disponible si no tiene restricciones (SAP origen o pagos asociados).
> **⚠️** (\*\*) Postear manual si no se posteó automáticamente al aplicar.

### Transiciones de estado

```
[Borrador] ──Aplicar──▶ [Aplicado] ──Anular──▶ [Anulado]
    ▲                      │
    └── Desaplicar ────────┘

---

## Anular

Anular una ENP la cancela por completo, con efecto contable y de inventario. A diferencia de **Reversar** (que solo crea asientos inversos), anular:

1. Crea un **documento reverso** cuyo tipo se define en la configuración del documento ENP.
2. Revierte el efecto en inventario (stock).
3. Si aplica, replica la anulación en la **sucursal Consolidado**.
4. La ENP pasa a estado **Anulado (3)** y queda solo de consulta.

> **⚠️** Una vez anulada, la ENP no se puede editar, aplicar ni desaplicar.

---

## Marcar como Revisado

Desde la vista de detalle puedes **marcar la ENP como revisada**. Es un indicador visual que registra que alguien verificó físicamente la mercancía contra la factura. No cambia el estado del documento ni bloquea ninguna acción.

---

## Transferencia entre sucursales

Si la mercancía de la ENP debe transferirse a otra sucursal, puedes usar la acción **Transferir** desde el detalle. Esto prepara el documento para su replicación en la sucursal destino. El concepto debe tener una sucursal destino configurada para que esta opción esté disponible.

---

## Actualizaciones automáticas

### 1. Actualización de costos

Al aplicar, si `NoActualizaCostos = false`, se actualiza el costo de **cada producto** en el maestro de productos:

```
costo = ((detalle.Costo - detalle.Costo × detalle.PorcentajeDescuento / 100) / detalle.Medida.Factor) × Tasa
```

### 2. Asignación de suplidor a productos

Si `DocAGenerar = "RDE"`, al aplicar se actualiza el **suplidor por defecto** de cada producto recibido en el maestro de productos. Esto facilita futuras compras del mismo producto.

### 3. Actualización de costos en PV (Precio de Venta)

En segundo plano (Hangfire), se actualizan los campos `COSTO` y `COSTOX` en todas las transacciones de tipo **PV** (Facturación) cuya fecha sea **posterior** a la fecha de la ENP. Esto asegura que las facturas reflejen el costo actualizado.

### 4. Refresco de Análisis de Compra

También en segundo plano, se refresca el módulo de **Análisis de Compra** con los nuevos costos y suplidores.

---

## Scanner y digitalización

La ENP soporta la digitalización de facturas escaneadas. Esto es especialmente útil cuando la entrada está asociada a una **Orden de Compra**, ya que la aplicación **exige** el PDF escaneado.

### ¿Cuándo es obligatorio escanear?

- Si la ENP tiene una **Orden de Compra (OC)** asociada → es **obligatorio** tener el PDF escaneado para poder **aplicar** el documento.
- Si no tiene OC, el escaneo es opcional pero recomendado para respaldo.

### Acciones disponibles

Desde la vista de detalle de la ENP puedes:

- **Verificar**: Comprueba si existe el PDF escaneado para el documento.
- **Descargar**: Si existe, puedes descargarlo para visualizarlo o imprimirlo.

---

## Reportes

El sistema genera un **reporte PDF** de la ENP que puedes imprimir o guardar.

### ¿Cómo se imprime?

Desde la vista de detalle, hay un botón **Imprimir** que genera el PDF al instante.

### Sello de estado

El reporte incluye un **sello de agua** (watermark) que indica el estado actual del documento:

| Estado del documento | Sello visible en el reporte |
|:---|---|
| **Borrador** | "BORRADOR" |
| **Aplicado** | Sin sello (documento en firme) |
| **Anulado** | "ANULADO" |

Esto permite identificar rápidamente si un comprobante impreso está vigente o fue cancelado.

---

## Preguntas Frecuentes

### ¿Puedo editar una ENP después de guardarla?
Sí, mientras esté en estado **Borrador**. Una vez **Aplicada**, solo puedes ver detalle, desaplicar (si aplica) o anularla.

### ¿Qué pasa si el concepto tiene "Sin Impuestos" marcado?
Al crear o modificar la ENP, todos los impuestos de los detalles se fuerzan a 0 automáticamente. No podrás agregar impuestos aunque el producto los tenga configurados.

### ¿Por qué no me deja aplicar si tengo Orden de Compra?
Revisa:
1. Que exista el PDF escaneado en la ruta del scanner.
2. Que los costos de los detalles coincidan con la OC (tolerancia ±1).
3. Que el aumento de precio no supere el máximo permitido por la familia del producto.

### ¿Por qué el NCF es obligatorio?
Porque el concepto tiene `DocAGenerar = "RDE"`, que genera una **Factura Suplidor**. En República Dominicana, el NCF es obligatorio en facturas de compra.

### ¿Cómo se calcula el costo después de aplicar?
```
costo = ((Costo - Costo × %Descuento/100) / Factor de Medida) × Tasa
```
Este valor se guarda como el nuevo `UltimoCosto` del producto.

### ¿Qué significa "Postear"?
Postear es generar los **asientos contables** del documento. Si el documento tiene `MetodoPosteo = Aplicar`, se postea automáticamente al aplicar. Si no, debes postear manualmente desde el detalle.

### ¿Puedo imprimir el comprobante?
Sí, desde la vista de detalle hay una opción para **Imprimir** el reporte de la ENP.

### ¿Qué hago si la ENP tiene una SAP como origen?
No puedes desaplicarla directamente. La ENP fue generada automáticamente desde una **Salida de Almacén** (SAP). Debes desaplicar la SAP origen primero.

### ¿La ENP afecta el precio de venta de los productos?

No directamente. Pero se encola un proceso en segundo plano que actualiza los costos en documentos de facturación existentes con fecha posterior, reflejando el nuevo costo en los márgenes.

### ¿Cuál es la diferencia entre Anular y Reversar?

**Anular** cancela el documento completo: revierte el inventario, elimina asientos y pasa a estado Anulado. **Reversar** solo crea asientos contables inversos, sin alterar el inventario ni el estado del documento. Úsalo cuando necesites corregir contabilidad sin perder el registro de inventario.

### ¿Qué significa "Marcar como Revisado"?

Es un indicador visual que registra que alguien revisó físicamente la mercancía. No bloquea ninguna acción ni cambia el estado del documento.

### ¿Por qué no puedo desaplicar una ENP?

Puede deberse a:
1. **La ENP fue generada desde una Salida de Almacén (SAP)** — debes desaplicar la SAP origen primero.
2. **La Factura Suplidor (RDE) generada tiene pagos asociados** — primero debes anular los pagos.

### ¿Qué información viene en el reporte impreso?

El reporte incluye: encabezado con datos del documento, detalle de productos con cantidades y costos, totales, y un sello de agua que indica el estado (Borrador / Aplicado / Anulado).

---

## API Endpoints (para referencia técnica)

### Documento (CRUD + acciones)

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/ENP/{sucursal}` | Crear |
| `PUT` | `/ENP/{sucursal}` | Actualizar |
| `DELETE` | `/ENP/{sucursal}/eliminar/{id}` | Eliminar por ID |
| `PUT` | `/ENP/{sucursal}/aplicar/{id}` | Aplicar |
| `PUT` | `/ENP/desaplicar` | Desaplicar |
| `POST` | `/ENP/{sucursal}/anular` | Anular |
| `POST` | `/ENP/{sucursal}/{id}/Reversar` | Reversar (asientos inversos) |
| `POST` | `/ENP/{sucursal}/{id}/Revisado` | Marcar como revisado |
| `POST` | `/ENP/{sucursal}/{id}/Transferir` | Marcar para transferencia |

### Posteo contable

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/ENP/{sucursal}/postear` | Postear asientos |
| `PUT` | `/ENP/{sucursal}/repostear` | Repostear asientos en rango de fechas |
| `POST` | `/ENP/{sucursal}/postearMovimiento` | Postear asientos de un movimiento específico |

### Consultas

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/ENP/{sucursal}/{id}` | Obtener por ID |
| `GET` | `/ENP/{sucursal}/noDoc/{noDoc}` | Obtener por número de documento |
| `GET` | `/ENP/{sucursal}` | Listado resumido (paginado) |
| `GET` | `/ENP/{sucursal}/filtrar` | Listado con filtros |
| `GET` | `/ENP/{sucursal}/PorSuplidor` | Listado filtrado por suplidor |
| `GET` | `/ENP/{sucursal}/autorizados` | Documentos en estado autorizado |
| `GET` | `/ENP/{sucursal}/aplicados` | Documentos en estado aplicado |
| `GET` | `/ENP/{sucursal}/detallado` | Listado detallado con productos y familias |
| `GET` | `/ENP/total/{sucursal}` | Total de registros en un rango |

### Scanner

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/ENP/{sucursal}/{id}/scanner/verificar` | Verificar si existe PDF escaneado |
| `GET` | `/ENP/{sucursal}/{id}/scanner/descargar` | Descargar PDF escaneado |

### Reportes

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/reportes/inventario/entrada/{sucursal}/{id}` | Generar reporte PDF por ID |
| `POST` | `/reportes/inventario/entrada` | Generar reporte PDF desde datos del documento |

---

## Pendientes conocidos

Estas son mejoras planificadas para el módulo ENP:

1. **Sucursal configurable para consulta de RDE**: Actualmente la consulta de la Factura Suplidor (RDE) desde la ENP se realiza contra la sucursal Consolidado de forma fija. Se planea hacer configurable desde qué sucursal consultar los RDE.
2. **Múltiples notas por documento**: Se planea permitir agregar varias notas o comentarios a un mismo documento, en lugar de una sola observación.

---

## Navegación

← Anterior: [Volver al índice](/documentacion) | Siguiente: (en desarrollo)
