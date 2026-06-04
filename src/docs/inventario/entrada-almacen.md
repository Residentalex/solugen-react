---
modulo: Inventario
titulo: Entrada de Almacén (ENP)
fecha: 2025-05-31
codigo: ENP
---

# Entrada de Almacén (ENP)

> **📚** Este documento describe el flujo completo de **Entrada de Almacén** (código **ENP**) en Solugen ERP. Está dirigido a usuarios finales que gestionan compras, inventario y contabilidad.

---

## ¿Qué es una Entrada de Almacén?

Una **Entrada de Almacén (ENP)** es el documento transaccional que registra el ingreso físico de mercancías al inventario. Incrementa el stock disponible y constituye la base para:

- La **actualización de costos** de los productos
- La **generación de asientos contables** (posteo automático o manual)
- La **generación automática de documentos** derivados (Factura Suplidor, Entrada Diario, etc.)

> **💡** La ENP es el punto de partida del ciclo de compras: recibe mercancía, actualiza costos, y dispara la contabilización.

---

## El Concepto: el corazón de la ENP

El **Concepto** (`CONCEPTOS`) es el campo más importante de la ENP porque define **TODO** el comportamiento del documento.

### Campos del Concepto que afectan la ENP

| Campo Técnico | Nombre Visual | Efecto |
|:---|:---|---|
| `Moneda` | Moneda del concepto | Define la moneda de la ENP. Si está vacío, usa la moneda por defecto de `PARAMETROS`. |
| `Almacen` | Almacén por defecto | Se usa como almacén predeterminado al crear. Si no tiene, usa el de `PARAMETROS`. |
| `NoImpuesto` (`cp.noimpuest`) | Sin Impuestos | Si es `true`, al **crear** o **actualizar** la ENP se fuerzan **todos los impuestos de los detalles a 0**. |
| `NoAsientos` (`cp.sinasiento`) | Sin Asientos | Si es `true`, **no se generan asientos contables** al postear. |
| `NoActualizaCostos` (`cp.noactcost`) | No Actualizar Costos | Si es `true`, **no se actualiza** el costo de los productos al aplicar la ENP. |
| `DocAGenerar` (`cp.docgen`) | Documento a Generar | Define qué documento se genera automáticamente al postear. Ej: `RDE` genera Factura Suplidor, `EDI` genera Entrada Diario Inventario. |
| `NoCuenta` (`cp.numero_cta`) | Cuenta Suplidor | Cuenta contable del suplidor. Si está vacío, usa la cuenta del suplidor directamente. |
| `SucursalDestino` | Sucursal Destino | Para transferencias entre sucursales. |
| `ConceptoDestino` | Concepto Destino | Concepto contable equivalente en la sucursal destino para replicación. |

> **⚠️** El concepto debe configurarse correctamente ANTES de crear ENPs. Cambiar el concepto en una ENP existente puede alterar el comportamiento contable.

### ¿Qué significa `DocAGenerar`?

Cuando el concepto tiene `DocAGenerar`, al **postear** la ENP se genera automáticamente un documento hijo:

| Valor | Documento Generado | Propósito |
|:---|:---|---|
| `RDE` | Factura Suplidor (Compra) | Registra la deuda con el suplidor. **Obliga a ingresar NCF**. |
| `EDI` | Entrada Diario Inventario | Asiento de diario de inventario (sin suplidor). |
| *(vacío)* | Ninguno | Solo afecta inventario, sin documento derivado. |

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

### Replicación en Consolidado

Si la sucursal actual **no es Consolidado** y el concepto tiene asientos habilitados, los asientos se **replican automáticamente** en la sucursal **Consolidado**, usando el concepto contable equivalente.

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
| Reversar inventario | Se elimina el efecto en stock (vía `Desaplicar` genérico). |
| Eliminar asientos | Se eliminan los asientos contables generados. |
| Reversar OC | Si tiene OC, se reversan los recibidos (`ReversarRecibidos`). |
| Eliminar RDE generado | Si el RDE no tiene pagos, se elimina. Si tiene pagos, se desaplica (no se elimina). |
| Replicar en destino | Si la ENP existe en Consolidado, también se desaplica/allí. |

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
```

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
No directamente. Pero se encola un job en Hangfire que actualiza los costos en documentos PV (facturación) existentes con fecha posterior, reflejando el nuevo costo en los márgenes.

---

## API Endpoints (para referencia técnica)

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/ENP/{sucursal}` | Crear |
| `PUT` | `/ENP/{sucursal}` | Actualizar |
| `DELETE` | `/ENP/{sucursal}/eliminar/{id}` | Eliminar por ID |
| `PUT` | `/ENP/{sucursal}/aplicar/{id}` | Aplicar (asíncrono, retorna jobId) |
| `PUT` | `/ENP/desaplicar` | Desaplicar |
| `POST` | `/ENP/{sucursal}/anular` | Anular |
| `POST` | `/ENP/{sucursal}/postear` | Postear asientos (asíncrono) |
| `GET` | `/ENP/{sucursal}/{id}` | Obtener por ID |
| `GET` | `/ENP/{sucursal}/noDoc/{noDoc}` | Obtener por No Documento |
| `GET` | `/ENP/{sucursal}` | Listado resumido |
| `GET` | `/ENP/{sucursal}/filtrar` | Listado con filtros |
| `GET` | `/ENP/{sucursal}/{id}/scanner/verificar` | Verificar si existe PDF escaneado |
| `GET` | `/ENP/{sucursal}/{id}/scanner/descargar` | Descargar PDF escaneado |

---

## Navegación

← Anterior: [Volver al índice](/documentacion) | Siguiente: (en desarrollo)
