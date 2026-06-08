# Devolución de Compra (DVC)

> **📚** Este documento describe el flujo completo de **Devolución de Compra** (código **DVC**). Está dirigido a usuarios finales que gestionan compras, inventario y contabilidad.

---

## ¿Qué es una Devolución de Compra?

Una **Devolución de Compra (DVC)** es el documento transaccional que registra la **devolución de mercancía al suplidor**. Disminuye el stock disponible y constituye la base para:

- La **actualización de costos** de los productos
- La **generación de asientos contables** (posteo automático o manual)
- La **generación de documentos derivados** (Nota Débito, etc.)

> **💡** La DVC es el documento inverso a la Entrada de Almacén (ENP): mientras la ENP recibe mercancía, la DVC la devuelve.

---

## El Concepto: el corazón de la DVC

El **Concepto** (`Tabla - CONCEPTOS`) es el campo más importante de la DVC porque define **TODO** el comportamiento del documento.

### Campos del Concepto que afectan la DVC

| Campo Técnico | Nombre Visual | Efecto |
|:---|:---|---|
| `Moneda` | Moneda del concepto | Define la moneda de la DVC. Si está vacío, usa la moneda por defecto de la empresa. |
| `Almacen` | Almacén por defecto | Se usa como almacén predeterminado al crear. |
| `NoImpuesto` | Sin Impuestos | Si es **true**, al **crear** o **actualizar** la DVC se fuerzan **todos los impuestos de los detalles a 0**. |
| `NoAsientos` | Sin Asientos | Si es **true**, **no se generan asientos contables** al postear. |
| `NoActualizaCostos` | No Actualizar Costos | Si es **true**, **no se actualiza** el costo de los productos al aplicar la DVC. |
| `DocAGenerar` | Documento a Generar | Define qué documento se genera automáticamente al postear. |
| `NoCuenta` | Cuenta Suplidor | Cuenta contable del suplidor. Si está vacío, usa la cuenta del suplidor directamente. |
| `Replicar` | Replicar a otra sucursal | Si es **true**, al postear los asientos se replican en la sucursal indicada. |

> **⚠️** El concepto debe configurarse correctamente ANTES de crear DVCs. Cambiar el concepto en una DVC existente puede alterar el comportamiento contable.

---

## Tipo de Documento

La DVC tiene un campo adicional **Tipo de Documento** (`Tabla - TIPOS`) que debe seleccionarse **antes** del concepto.

### Campos del Tipo que afectan la DVC

| Campo | Efecto |
|:---|---|
| `RequiereReferencia` | Si es **true**, la DVC **debe** tener una Entrada de Almacén (ENP) de referencia. |
| `Codigo` | Código del tipo (ej: "DEV-COMPRA", "DEV-CALIENTE"). |

> **💡** El tipo "DEV-CALIENTE" se usa para devoluciones rápidas que no requieren ENP de referencia. El tipo "DEV-COMPRA" requiere una ENP como origen.

### Flujo de selección

```
Paso 1: Seleccionar Tipo de Documento
Paso 2: (Si el tipo requiere referencia) Seleccionar Entrada de Almacén
Paso 3: Seleccionar Concepto
```

---

## Relaciones con otros módulos

La DVC no funciona aislada. Estos son los documentos con los que se relaciona:

| Documento | Tipo de relación | Descripción |
|:---|---|:---|
| **Entrada de Almacén (ENP)** | Referencia | La DVC puede (o debe) referenciar una ENP como origen de la mercancía devuelta. |
| **Nota Débito (ND)** | Generación automática | Si el Concepto tiene `DocAGenerar`, al postear se genera un documento derivado. |
| **Transacciones** | Pago asociado | Las DVCs aplicadas pueden tener transacciones de pago asociadas (Notas Débito). |

---

## Crear una Devolución

### Desde cero (Tipo que NO requiere referencia)

1. Seleccionar **Tipo de Documento** que no requiera referencia.
2. Seleccionar **Concepto**.
3. Seleccionar **Suplidor**.
4. Seleccionar **Almacén**.
5. Agregar productos manualmente vía "Agregar producto" o scanner.

### Desde una Entrada de Almacén (Tipo que SÍ requiere referencia)

1. Seleccionar **Tipo de Documento** que requiera referencia.
2. Hacer clic en **"Buscar Entrada"** para seleccionar la ENP de origen.
3. El sistema **auto-asigna** el suplidor desde la ENP.
4. Pregunta si desea **cargar los productos** de la ENP.
5. Seleccionar **Concepto** (depende del tipo).
6. Ajustar cantidades a devolver (no pueden superar el disponible de la ENP).

### Validaciones al guardar

1. **Tipo de Documento**: Obligatorio (debe seleccionarse antes del concepto).
2. **Concepto**: Obligatorio.
3. **Suplidor**: Obligatorio (se auto-asigna desde la ENP si aplica).
4. **Almacén**: Obligatorio.
5. **Detalles**: Al menos un detalle con cantidad > 0.
6. **Scanner**: Si el tipo requiere scanner, el PDF debe existir para poder aplicar.

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
| Tipo de Documento | Define si requiere ENP de referencia. | Obligatorio |
| Entrada de Referencia | ENP origen de la mercancía devuelta. | Según tipo |
| Concepto | Define el comportamiento del documento. | Obligatorio |
| Suplidor | Proveedor al que se devuelve. | Según tipo/ENP |
| Almacén | Almacén desde donde se devuelve. | Obligatorio |
| Fecha Documento | Fecha contable del movimiento. | Obligatorio |
| Moneda | Moneda del documento. | Obligatorio |
| NCF | Número de Comprobante Fiscal. | Opcional |
| Observaciones | Notas adicionales. | Opcional |

---

## Aplicar una Devolución

Aplicar una DVC significa **confirmar la salida de inventario**: el stock disminuye, y opcionalmente se generan asientos contables.

### Validaciones antes de aplicar

1. **Scanner obligatorio**: Si el tipo de documento requiere scanner, la DVC **debe tener un PDF escaneado** para poder aplicar.
2. **Tipo, Concepto, Suplidor, Almacén requeridos**: Todos deben estar configurados.
3. **Detalles**: No puede estar vacía.

### ¿Qué pasa después de aplicar?

| Paso | Descripción |
|:---|---|
| Marcar como aplicada | La DVC pasa a estado **Aplicado**. |
| Actualizar inventario | Disminuye el stock de los productos devueltos. |
| Postear asientos | Si `MetodoPosteo = Aplicar` y `NoAsientos = false`, genera asientos contables automáticamente. |
| Replicar | Si el concepto tiene réplica configurada, se replica en la sucursal destino. |

---

## Postear (Generar Asientos Contables)

El posteo se ejecuta **automáticamente al aplicar** si `MetodoPosteo = Aplicar` y `Concepto.NoAsientos = false`. También puede hacerse manualmente después.

### Pre-validaciones del posteo

1. **Concepto requerido**: La DVC debe tener concepto.
2. **Suplidor requerido**: La DVC debe tener suplidor.
3. **NoAsientos**: Si `Concepto.NoAsientos = true`, no se generan asientos (retorna lista vacía).
4. **Fecha de cierre**: La fecha del documento no puede ser menor o igual a la fecha de cierre de la sucursal.

---

## Desaplicar

Desaplicar revierte una DVC que estaba en estado **Aplicado** a **Borrador**.

### Restricciones

1. **Documentos generados aplicados**: Si la DVC generó documentos derivados (ND) que están aplicados, no se puede desaplicar.
2. **Pagos asociados**: Si la DVC tiene transacciones de pago asociadas, los botones Desaplicar y Anular se deshabilitan automáticamente.

### ¿Qué ocurre al desaplicar?

| Acción | Descripción |
|:---|---|
| Reversar inventario | Se repone el stock de los productos devueltos. |
| Eliminar asientos | Se eliminan los asientos contables generados. |
| Reversar ENP referenciada | Si tiene ENP de referencia, se reversa la cantidad devuelta. |

---

## Anular

Anular una DVC la cancela por completo, con efecto contable y de inventario.

1. El usuario selecciona **motivo** y **fecha** de anulación mediante el diálogo `ModalAnular`.
2. Se crea un **documento reverso**.
3. Se generan **asientos de reversión** a través del pipeline completo (PosteoCore).
4. La DVC pasa a estado **Anulado (3)** y queda solo de consulta.

> **⚠️** Una vez anulada, la DVC no se puede editar, aplicar ni desaplicar.

---

## Estados del documento

| Estado | Valor | Descripción | Acciones disponibles |
|:---|---:|---|---|
| **Borrador** | 0 | Documento creado pero sin efecto en inventario. | Editar, Guardar, Aplicar, Anular |
| **Aplicado** | 1 | Ya afectó inventario. Stock actualizado. | Ver detalle, Desaplicar\*, Anular, Postear\*\*, Imprimir |
| **Anulado** | 3 | Documento cancelado con reverso contable. | Solo consulta, Imprimir |

> **⚠️** (\*) Desaplicar solo disponible si no tiene restricciones (documentos generados o pagos asociados).
> **⚠️** (\*\*) Postear manual si no se posteó automáticamente al aplicar.

---

## Distribución de Pagos

Cuando una DVC tiene pagos asociados (Notas Débito, Transacciones), el sistema muestra la **Distribución de Pagos** en la vista de detalle.

### Componente: DistribucionPagosCard

Esta tarjeta en la sidebar del detalle muestra:

| Indicador | Descripción |
|:---|---|
| **Total documento** | Monto total de la DVC. |
| **Distribuido** | Suma de montos de todos los pagos/documentos relacionados. |
| **Pendiente** | Total - Distribuido. Indica cuánto falta por pagar. |

### Estados visuales

| Estado | Tag | Color |
|:---|---|:---:|
| Pagado (pendiente ≤ 0) | `Pagado` | ✅ Verde |
| Pendiente (pendiente > 0) | `Pendiente` | 🟡 Amarillo |
| Exceso (pendiente < 0) | `Exceso` | 🔴 Rojo |

Cada fila del grid de pagos es **clickeable** para navegar al documento de pago correspondiente (Nota Débito, Transacción, etc.).

---

## Scanner y digitalización

La DVC soporta la digitalización de documentos escaneados.

### ¿Cuándo es obligatorio escanear?

Depende del tipo de documento configurado. Si el tipo requiere scanner, es **obligatorio** tener el PDF escaneado para poder **aplicar** la DVC.

### Acciones disponibles

Desde la vista de detalle puedes:

- **Verificar**: Comprueba si existe el PDF escaneado para el documento.
- **Descargar**: Si existe, puedes descargarlo para visualizarlo o imprimirlo.

---

## Reportes

El sistema genera un **reporte PDF** de la DVC que puedes imprimir o guardar.

---

## API Endpoints (para referencia técnica)

### Documento (CRUD + acciones)

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/DVC/{sucursal}` | Crear |
| `PUT` | `/DVC/{sucursal}` | Actualizar |
| `DELETE` | `/DVC/{sucursal}/eliminar/{id}` | Eliminar por ID |
| `PUT` | `/DVC/{sucursal}/aplicar/{id}` | Aplicar |
| `PUT` | `/DVC/desaplicar` | Desaplicar |
| `POST` | `/DVC/{sucursal}/anular` | Anular |
| `POST` | `/DVC/{sucursal}/{id}/Reversar` | Reversar (asientos inversos) |
| `POST` | `/DVC/{sucursal}/{id}/Revisado` | Marcar como revisado |

### Posteo contable

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/DVC/{sucursal}/postear` | Postear asientos |

### Consultas

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/DVC/{sucursal}/{id}` | Obtener por ID |
| `GET` | `/DVC/{sucursal}` | Listado resumido (paginado) |
| `GET` | `/DVC/{sucursal}/filtrar` | Listado con filtros |
| `GET` | `/DVC/{sucursal}/total` | Total de registros |

### Scanner

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/DVC/{sucursal}/{id}/scanner/verificar` | Verificar si existe PDF escaneado |
| `GET` | `/DVC/{sucursal}/{id}/scanner/descargar` | Descargar PDF escaneado |

### Reportes

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/reportes/inventario/devolucion-compra` | Generar reporte PDF |

---

## Navegación

← Anterior: [Entrada de Almacén](/documentacion/entrada-almacen) | Siguiente: (en desarrollo)
