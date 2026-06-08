# Salida de Almacén (SAP)

> **📚** Este documento describe el flujo completo de **Salida de Almacén** (código **SAP**). Está dirigido a usuarios finales que gestionan salidas de inventario, consumos internos, decomisos y transferencias entre sucursales.

---

## ¿Qué es una Salida de Almacén?

Una **Salida de Almacén (SAP)** es el documento transaccional que registra la **salida física de mercancías** del inventario. Disminuye el stock disponible y constituye la base para:

- El **control de inventario** (salidas por consumo, decomiso, transferencia)
- La **generación de asientos contables** (posteo automático o manual)
- La **generación de documentos** derivados (movimientos de inventario)

> **💡** La SAP es el documento de salida de inventario más versátil: cubre desde una salida por consumo interno hasta una transferencia entre sucursales.

---

## El Concepto: el corazón de la SAP

El **Concepto** (`Tabla - CONCEPTOS`) es el campo más importante de la SAP porque define **TODO** el comportamiento del documento.

### Campos del Concepto que afectan la SAP

| Campo Técnico | Nombre Visual | Efecto |
|:---|:---|---|
| `Moneda` | Moneda del concepto | Define la moneda de la SAP. Si está vacío, usa la moneda por defecto de la empresa. |
| `Almacen` | Almacén por defecto | Se usa como almacén de origen predeterminado al crear. |
| `NoImpuesto` | Sin Impuestos | Si es **true**, al crear o actualizar la SAP se fuerzan **todos los impuestos de los detalles a 0**. |
| `NoAsientos` | Sin Asientos | Si es **true**, **no se generan asientos contables** al postear. |
| `NoActualizaCostos` | No Actualizar Costos | Si es **true**, **no se actualiza** el costo de los productos al aplicar la SAP. |
| `SucursalDestino` | Sucursal Destino | Si tiene valor, la SAP es una **transferencia entre sucursales**. El reporte de impresión cambia automáticamente al formato de transferencia. |

> **⚠️** El concepto debe configurarse correctamente ANTES de crear SAPs. Cambiar el concepto en una SAP existente puede alterar el comportamiento contable.

---

## Relaciones con otros módulos

La SAP se relaciona con estos documentos:

| Documento | Tipo de relación | Descripción |
|:---|---|:---|
| **Entrada Almacén (ENP)** | Generación automática | Si la SAP es una transferencia entre sucursales (`SucursalDestino`), al aplicar se genera automáticamente una ENP en la sucursal destino. |
| **Movimiento de inventario** | Generación automática | Al postear se genera el movimiento físico de inventario. |
| **Sucursal Consolidado** | Replicación contable | Los asientos se replican en la sucursal Consolidado si está configurado. |

---

## Crear una Salida

### Validaciones al guardar

1. **Fechas de cierre**: La fecha del documento y fecha de recibo no pueden ser **menores o iguales** a la **mayor** entre la fecha de cierre **contable** y la fecha de cierre de **inventario**.
2. **Sin impuestos**: Si `Concepto.NoImpuesto = true`, todos los detalles se guardan con impuestos = 0 automáticamente.
3. **Detalles requeridos**: La SAP debe tener al menos un detalle con cantidad > 0.

### Campos del formulario

| Campo | Descripción | Origen |
|:---|---|:---:|
| Concepto | Define el comportamiento del documento. | Obligatorio |
| Fecha Documento | Fecha contable de la salida. | Obligatorio |
| Fecha Recibo | Fecha en que se recibió la solicitud de salida. | Opcional |
| Almacén | Almacén origen de la mercancía. Se auto-asigna si el concepto tiene almacén definido. | Obligatorio |
| Suplidor / Entidad | Entidad destino de la salida (ej: departamento, empleado, suplidor). | Según concepto |
| Moneda | Moneda del documento. Por defecto la del concepto. | Obligatorio |
| Tasa | Tipo de cambio (si aplica). Al cambiarla, pregunta si desea actualizar los costos. | Opcional |
| Referencia | Documento de referencia externo. | Opcional |
| Nota | Observaciones adicionales. | Opcional |

### Fórmulas de cálculo

Para cada detalle:

| Campo | Fórmula |
|:---|---|
| `SubTotal` | `Cantidad × Costo` |
| `Descuento` | `SubTotal × PorcentajeDescuento / 100` (redondeado a 2 decimales) |
| `Impuestos` | `(SubTotal - Descuento) × PorcentajeImpuesto / 100` (redondeado a 2 decimales) |
| `Total` | `SubTotal + Impuestos - Descuento` |

Totales del encabezado: suma de los valores de todos los detalles.

---

## Aplicar una Salida

Aplicar una SAP significa **confirmar la salida de inventario**: el stock se disminuye, los costos se actualizan y opcionalmente se generan asientos contables.

### Validaciones antes de aplicar

El backend ejecuta estas validaciones **en estricto orden** antes de persistir el cambio de estado:

1. **Scanner obligatorio** (excepto transferencias entre sucursales): Debe existir un PDF escaneado del documento de salida en la ruta configurada (`ScannerPath`).
2. **Fechas de vencimiento**: Si hay productos con fecha de vencimiento configurada, se solicita ingresar la fecha antes de aplicar.
3. **Detalles válidos**: Todos los detalles deben tener producto, cantidad y costo válidos.

### ¿Qué pasa después de aplicar?

| Paso | Descripción |
|:---|:---|
| Estado a **Aplicado** | El documento queda en estado aplicado. |
| Actualizar inventario | Se descuenta del stock del almacén origen. |
| Generar ENP destino (si aplica) | Si es transferencia entre sucursales, se genera una ENP en la sucursal destino. |
| Postear asientos | Si `MetodoPosteo = Aplicar` y `NoAsientos = false`, se generan asientos contables automáticamente. |

---

## Postear (Generar Asientos Contables)

El posteo se ejecuta **automáticamente al aplicar** si `MetodoPosteo = Aplicar` y `Concepto.NoAsientos = false`. También puede hacerse manualmente desde el detalle.

La lógica de generación de asientos es equivalente a la de ENP:
- Asientos por producto (cuenta de costo del producto)
- Asientos por impuesto (si aplica)
- Asiento de contrapartida (suplidor/entidad)
- Ajuste de residuos y cuentas prima

---

## Desaplicar

Desaplicar revierte una SAP que estaba en estado **Aplicado** a **Borrador**, permitiendo su edición.

### Requisitos

- La SAP no debe haber generado una ENP en destino que tenga **pagos asociados**.
- La SAP no debe estar en un período contable cerrado.

### ¿Qué ocurre al desaplicar?

| Acción | Descripción |
|:---|---|
| Reversar inventario | Se revierte el efecto en stock (incrementa el almacén origen). |
| Eliminar asientos | Se eliminan los asientos contables generados. |
| Desaplicar ENP destino | Si generó una ENP, se desaplica también (si es posible). |

---

## Anular

Anular una SAP la cancela por completo, con efecto contable y de inventario.

### Wizard de anulación

El sistema guía al usuario en 3 pasos:

1. **Seleccionar fecha**: Fecha del día, fecha del documento, u otra fecha.
2. **Seleccionar motivo**: Datos Erróneos, Falta de Información, Entrada Duplicada, u Otros Motivos (texto libre).
3. **Confirmar**: Resumen de la anulación con los datos seleccionados.

### ¿Qué hace internamente?

1. Crea un **documento reverso** con asientos contables invertidos.
2. Revierte el efecto en inventario (stock).
3. La SAP pasa a estado **Anulado (3)** y queda solo de consulta.

> **⚠️** Una vez anulada, la SAP no se puede editar, aplicar ni desaplicar.

---

## Imprimir (3 formatos)

La SAP soporta **3 formatos de impresión** según el tipo de salida:

| Formato | ¿Cuándo se usa? | Descripción |
|:---|:---|---|
| **Transferencia** | Cuando el concepto tiene `SucursalDestino` | Reporte de transferencia entre sucursales con datos de la sucursal destino. |
| **Consumo** | Salidas para consumo interno | Reporte estándar de salida por consumo. |
| **Decomiso** | Salidas por pérdida o deterioro | Reporte específico para salidas por decomiso. |

### Comportamiento automático

- Si la SAP es una **transferencia** (`SucursalDestino` definido), imprime automáticamente en formato Transferencia.
- Si no, el usuario **elige** entre **Consumo** o **Decomiso** al hacer clic en Imprimir.

### Sello de estado

El reporte incluye un **sello de agua** (watermark) que indica el estado actual del documento:

| Estado | Sello visible |
|:---|---|
| **Borrador** | "BORRADOR" |
| **Aplicado** | Sin sello |
| **Anulado** | "ANULADO" |

---

## Estados del documento

| Estado | Valor | Descripción | Acciones disponibles |
|:---|---:|---|---|
| **Borrador** | 0 | Documento creado sin efecto en inventario. | Editar, Guardar, Aplicar, Anular |
| **Aplicado** | 1 | Ya afectó inventario. | Ver detalle, Desaplicar, Anular, Postear, Imprimir |
| **Anulado** | 3 | Documento cancelado con reverso contable. | Solo consulta, Imprimir |

### Transiciones de estado

```
[Borrador] ──Aplicar──▶ [Aplicado] ──Anular──▶ [Anulado]
    ▲                      │
    └── Desaplicar ────────┘
```

---

## Tasa y actualización de costos

La SAP permite trabajar con **moneda extranjera** mediante el campo **Tasa**.

### ¿Qué pasa al cambiar la tasa?

1. El usuario edita la tasa (campo inline en el formulario).
2. El sistema pregunta: *"¿Desea actualizar los costos de los detalles en base a la nueva tasa?"*
3. Si el usuario confirma, cada **costo se divide entre la nueva tasa**:
   ```
   CostoNuevo = CostoActual / TasaNueva
   ```
4. Se recalculan automáticamente SubTotal, Descuento, Impuestos y Total de cada detalle.

> **💡** Útil cuando se ingresa una SAP en USD y se necesita convertir los costos a DOP, o viceversa.

---

## Scanner y digitalización

La SAP soporta la digitalización de documentos de salida escaneados.

### ¿Cuándo es obligatorio escanear?

- **SAP de consumo o decomiso** (sin `SucursalDestino`): el scanner es obligatorio para **aplicar**.
- **SAP de transferencia** (con `SucursalDestino`): el scanner **no es obligatorio** porque el documento de respaldo es la transferencia misma.

### Acciones disponibles

Desde la vista de detalle puedes:

- **Verificar**: Comprueba si existe el PDF escaneado.
- **Descargar/Visualizar**: Si existe, puedes verlo en un visor integrado.

---

## Guía paso a paso

Al crear o editar una SAP en estado borrador, una **guía interactiva** te muestra los pasos a seguir:

| Paso | Campo | Descripción |
|:---|:---|---|
| 1 | **Concepto** | Elige el concepto que define el comportamiento del documento. |
| 2 | **Almacén** | Selecciona el almacén desde donde sale la mercancía. |
| 3 | **Entidad** | Selecciona la entidad destino (suplidor, departamento, etc.). |
| 4 | **Productos** | Agrega productos al detalle de la salida. |

La guía aparece automáticamente y puedes descartarla haciendo clic fuera de ella.

---

## Clonar documento

Desde el listado de SAPs puedes **clonar** un documento existente para usarlo como plantilla:

1. Selecciona una SAP en la tabla.
2. Haz clic en el botón **Clonar** (ícono 🗐).
3. Se crea una nueva SAP en modo creación con todos los datos precargados.
4. Modifica lo necesario (fechas, cantidades) y guarda como un documento nuevo.

> **💡** El documento clonado se resetea: ID=0, sin número de documento, en estado Borrador.

---

## Marcar como Revisado

Desde la vista de detalle puedes **marcar la SAP como revisada**. Es un indicador visual que registra que alguien verificó físicamente la salida. No cambia el estado del documento ni bloquea ninguna acción.

---

## Reportes

El sistema genera **reportes PDF** de la SAP con 3 formatos distintos (ver sección [Imprimir](#imprimir-3-formatos)).

### ¿Cómo se imprime?

Desde la vista de detalle, botón **Imprimir**. Si es transferencia imprime automáticamente; si no, pregunta si es Consumo o Decomiso.

---

## Preguntas Frecuentes

### ¿Puedo editar una SAP después de guardarla?
Sí, mientras esté en estado **Borrador**. Una vez **Aplicada**, solo puedes ver detalle, desaplicar o anularla.

### ¿Qué diferencia hay entre SAP de Consumo y SAP de Decomiso?
La diferencia es el **formato del reporte** impreso. El consumo es para salidas normales de inventario (ej: materiales para producción). El decomiso es para salidas por pérdida, deterioro o caducidad. Ambos afectan el inventario de la misma forma.

### ¿Qué es una transferencia entre sucursales?
Cuando el concepto tiene `SucursalDestino`, la SAP se convierte en una **transferencia**: la mercancía sale de un almacén y **automáticamente se genera una ENP** (Entrada de Almacén) en la sucursal destino. El scanner **no es obligatorio** en este caso.

### ¿Por qué el sistema me pide escanear?
Porque la SAP no es una transferencia (no tiene `SucursalDestino`). Para aplicar una SAP de consumo o decomiso, **debes adjuntar el PDF escaneado** del documento de salida como respaldo.

### ¿Qué pasa si cambio la tasa?
El sistema te preguntará si deseas **actualizar los costos** dividiéndolos entre la nueva tasa. Responde **Sí** si quieres convertir los costos a la nueva moneda. Responde **No** si solo quieres registrar la tasa sin alterar los costos.

### ¿Cómo se calcula el costo después de aplicar?
```
costo = ((Costo - Costo × %Descuento/100) / Factor de Medida) × Tasa
```
Este valor se guarda como el nuevo `UltimoCosto` del producto.

### ¿Qué significa "Postear"?
Postear es generar los **asientos contables** de la salida. Si el concepto tiene `MetodoPosteo = Aplicar`, se postea automáticamente al aplicar. Si no, debes postear manualmente desde el detalle.

### ¿Cuál es la diferencia entre Anular y Desaplicar?
**Desaplicar** revierte el documento a Borrador para poder editarlo. **Anular** lo cancela definitivamente (pasa a estado Anulado) y no se puede editar después. Usa Desaplicar si necesitas corregir datos; usa Anular si la salida ya no debe existir.

### ¿Puedo imprimir el comprobante?
Sí, desde la vista de detalle hay un botón **Imprimir** que genera el PDF. Si es transferencia, imprime automáticamente. Si no, puedes elegir entre formato Consumo o Decomiso.

### ¿Qué significa "Marcar como Revisado"?
Es un indicador visual que registra que alguien revisó físicamente la salida de mercancía. No bloquea ninguna acción ni cambia el estado del documento.

### ¿La SAP actualiza el costo de los productos?
Depende del concepto. Si `NoActualizaCostos = false`, al aplicar se actualiza el `UltimoCosto` del producto.

### ¿Puedo clonar una SAP existente?
Sí, desde el listado selecciona una SAP y haz clic en el botón **Clonar**. Se creará una copia en modo Borrador lista para editar.

---

## API Endpoints (para referencia técnica)

### Documento (CRUD + acciones)

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/SAP/{sucursal}` | Crear |
| `PUT` | `/SAP/{sucursal}` | Actualizar |
| `DELETE` | `/SAP/{sucursal}/Eliminar/{id}` | Eliminar por ID |
| `PUT` | `/SAP/{sucursal}/aplicar/{id}` | Aplicar |
| `PUT` | `/SAP/desaplicar` | Desaplicar |
| `POST` | `/SAP/{sucursal}/Anular` | Anular |
| `POST` | `/SAP/{sucursal}/Reversar/{id}` | Reversar (asientos inversos) |
| `POST` | `/SAP/{sucursal}/Revisado/{id}` | Marcar como revisado |

### Posteo contable

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/SAP/{sucursal}/postear` | Postear asientos |

### Consultas

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/SAP/{sucursal}/{id}` | Obtener por ID |
| `GET` | `/SAP/{sucursal}` | Listado resumido (paginado) |
| `GET` | `/SAP/{sucursal}/filtrar` | Listado con filtros |
| `GET` | `/SAP/{sucursal}/detallado` | Listado detallado con productos |
| `GET` | `/SAP/{sucursal}/Transferencias` | Listado de transferencias entre sucursales |
| `GET` | `/SAP/total/{sucursal}` | Total de registros en un rango |

### Scanner

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/SAP/{sucursal}/{id}/scanner/verificar` | Verificar si existe PDF escaneado |
| `GET` | `/SAP/{sucursal}/{id}/scanner/descargar` | Descargar PDF escaneado |

### Reportes

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/reportes/inventario/salida/{sucursal}/{id}` | Generar reporte PDF por ID |
| `POST` | `/reportes/inventario/salida` | Generar reporte PDF desde datos (`formato=general\|consumo\|decomiso`) |

---

## Navegación

← Anterior: [Entrada de Almacén](entrada-almacen) | Siguiente: [Transferencia de Almacén](transferencia-almacen)
