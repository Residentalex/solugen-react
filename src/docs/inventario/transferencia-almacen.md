# Transferencia de Almacén (TRP)

> **📚** Este documento describe el flujo completo de **Transferencia de Almacén** (código **TRP**). Está dirigido a usuarios finales que gestionan movimientos de inventario entre almacenes.

---

## ¿Qué es una Transferencia de Almacén?

Una **Transferencia de Almacén (TRP)** es el documento transaccional que registra el **traslado físico de mercancías** entre dos almacenes. Disminuye el stock del almacén origen y lo incrementa en el almacén destino, todo en un solo movimiento.

> **💡** La TRP es la forma correcta de mover inventario entre almacenes: en lugar de hacer una Salida y una Entrada por separado, una TRP hace ambas cosas automáticamente.

---

## El Concepto: el corazón de la TRP

El **Concepto** (`Tabla - CONCEPTOS`) es el campo más importante de la TRP porque define **TODO** el comportamiento del documento.

### Campos del Concepto que afectan la TRP

| Campo Técnico | Nombre Visual | Efecto |
|:---|:---|---|
| `Moneda` | Moneda del concepto | Define la moneda de la TRP. |
| `Almacen` | Almacén por defecto | Se usa como almacén origen predeterminado al crear. |
| `NoAsientos` | Sin Asientos | Si es **true**, **no se generan asientos contables** al postear. |
| `NoActualizaCostos` | No Actualizar Costos | Si es **true**, **no se actualiza** el costo de los productos al aplicar la TRP. |
| `SucursalDestino` | Sucursal Destino | Define la sucursal donde se generará la entrada automática. |
| `ConceptoDestino` | Concepto Destino | Concepto contable equivalente en la sucursal destino. |

> **⚠️** El concepto debe configurarse correctamente ANTES de crear TRPs. Cambiar el concepto en una TRP existente puede alterar el comportamiento contable.

---

## Relaciones con otros módulos

La TRP se relaciona con estos documentos:

| Documento | Tipo de relación | Descripción |
|:---|---|:---|
| **Entrada Almacén (ENP)** | Generación automática | Al aplicar una TRP, se genera automáticamente una ENP en la sucursal/almacén destino. |
| **Salida Almacén (SAP)** | Naturaleza | La TRP funciona como una SAP para el almacén origen y como una ENP para el almacén destino. |
| **Sucursal Consolidado** | Replicación | Si aplica, los asientos se replican en Consolidado. |

---

## Crear una Transferencia

### Validaciones al guardar

1. **Fechas de cierre**: La fecha del documento no puede ser **menor o igual** a la **mayor** entre la fecha de cierre **contable** y la fecha de cierre de **inventario**.
2. **Almacenes distintos**: El almacén origen y el almacén destino **deben ser diferentes**.
3. **Detalles requeridos**: La TRP debe tener al menos un detalle con cantidad > 0.

### Campos del formulario

| Campo | Descripción | Origen |
|:---|---|:---:|
| Concepto | Define el comportamiento del documento. Se auto-asigna almacén origen si el concepto tiene almacén definido. | Obligatorio |
| Fecha Documento | Fecha contable de la transferencia. | Obligatorio |
| Almacén Origen | Almacén desde donde sale la mercancía. | Obligatorio |
| Almacén Destino | Almacén que recibe la mercancía (debe ser diferente al origen). | Obligatorio |
| Moneda | Moneda del documento. | Obligatorio |
| Tasa | Tipo de cambio (si aplica). Al cambiarla, pregunta si desea actualizar los costos. | Opcional |
| NCF | Número de Comprobante Fiscal (opcional). | Opcional |
| Referencia | Documento de referencia externo. | Opcional |
| Nota | Observaciones adicionales. | Opcional |

### Fórmulas de cálculo

A diferencia de otros módulos, la TRP **no maneja descuentos ni impuestos**. El cálculo es simple:

| Campo | Fórmula |
|:---|---|
| `SubTotal` | `Cantidad × Costo` |
| `Total` | `SubTotal` (no hay descuentos ni impuestos) |

---

## Aplicar una Transferencia

Aplicar una TRP significa **confirmar el movimiento de inventario**: el stock del almacén origen disminuye y el del almacén destino aumenta.

### Validaciones antes de aplicar

1. **Almacenes distintos**: Se valida que origen y destino no sean el mismo almacén.
2. **Detalles válidos**: Todos los detalles deben tener producto y cantidad válidos.
3. **Scanner**: No es obligatorio para transferencias (el documento de respaldo es la transferencia misma).

### ¿Qué pasa después de aplicar?

| Paso | Descripción |
|:---|:---|
| Estado a **Aplicado** | El documento queda en estado aplicado. |
| Descontar stock origen | Se descuenta del almacén origen. |
| Incrementar stock destino | Se agrega al almacén destino. |
| Generar ENP destino | Se genera automáticamente una Entrada de Almacén en el destino. |
| Postear asientos | Si aplica, se generan asientos contables. |

---

## Desaplicar

Desaplicar revierte una TRP que estaba en estado **Aplicado** a **Borrador**.

### Requisitos

- La TRP no debe estar en un período contable cerrado.
- La ENP generada en destino no debe tener restricciones (pagos asociados, etc.).

### ¿Qué ocurre al desaplicar?

| Acción | Descripción |
|:---|---|
| Reversar inventario | Se revierte el efecto en ambos almacenes. |
| Eliminar asientos | Se eliminan los asientos contables generados. |
| Eliminar ENP destino | Se elimina la Entrada de Almacén generada en destino. |

---

## Anular

Anular una TRP la cancela por completo, con efecto contable y de inventario.

### Wizard de anulación

El sistema guía al usuario en 3 pasos:

1. **Seleccionar fecha**: Fecha del día, fecha del documento, u otra fecha.
2. **Seleccionar motivo**: Datos Erróneos, Falta de Información, Entrada Duplicada, u Otros Motivos (texto libre).
3. **Confirmar**: Resumen de la anulación.

### ¿Qué hace internamente?

1. Crea un **documento reverso** con asientos contables invertidos.
2. Revierte el efecto en inventario en ambos almacenes.
3. La TRP pasa a estado **Anulado (3)** y queda solo de consulta.

> **⚠️** Una vez anulada, la TRP no se puede editar, aplicar ni desaplicar.

---

## Tasa y actualización de costos

La TRP permite trabajar con **moneda extranjera** mediante el campo **Tasa**.

### ¿Qué pasa al cambiar la tasa?

1. El usuario edita la tasa (campo inline en el formulario).
2. El sistema pregunta: *"¿Desea actualizar los costos de los detalles en base a la nueva tasa?"*
3. Si el usuario confirma, cada **costo se divide entre la nueva tasa**.

---

## Guía paso a paso

Al crear o editar una TRP en estado borrador, una **guía interactiva** te muestra los pasos a seguir:

| Paso | Campo | Descripción |
|:---|:---|---|
| 1 | **Concepto** | Elige el concepto que define el comportamiento del documento. |
| 2 | **Almacén Origen** | Selecciona el almacén desde donde sale la mercancía. |
| 3 | **Almacén Destino** | Selecciona el almacén que recibe la mercancía. |
| 4 | **Productos** | Agrega productos al detalle de la transferencia. |

La guía aparece automáticamente y puedes descartarla haciendo clic fuera de ella.

---

## Estados del documento

| Estado | Valor | Descripción | Acciones disponibles |
|:---|---:|---|---|
| **Borrador** | 0 | Documento creado sin efecto en inventario. | Editar, Guardar, Aplicar, Anular |
| **Aplicado** | 1 | Ya afectó inventario en ambos almacenes. | Ver detalle, Desaplicar, Anular, Postear, Imprimir |
| **Anulado** | 3 | Documento cancelado con reverso contable. | Solo consulta, Imprimir |

### Transiciones de estado

```
[Borrador] ──Aplicar──▶ [Aplicado] ──Anular──▶ [Anulado]
    ▲                      │
    └── Desaplicar ────────┘
```

---

## Marcar como Revisado

Desde la vista de detalle puedes **marcar la TRP como revisada**. Es un indicador visual que registra que alguien verificó físicamente la transferencia. No cambia el estado del documento ni bloquea ninguna acción.

---

## Scanner y digitalización

La TRP soporta la digitalización de documentos, pero **no es obligatoria** (a diferencia de otros módulos).

### Acciones disponibles

Desde la vista de detalle puedes:

- **Verificar**: Comprueba si existe el PDF escaneado.
- **Descargar/Visualizar**: Si existe, puedes verlo en un visor integrado.

---

## Clonar documento

Desde el listado de TRPs puedes **clonar** un documento existente para usarlo como plantilla:

1. Selecciona una TRP en la tabla.
2. Haz clic en el botón **Clonar** (ícono 🗐).
3. Se crea una nueva TRP en modo creación con todos los datos precargados.
4. Modifica lo necesario y guarda como un documento nuevo.

---

## Reportes

El sistema genera un **reporte PDF** de la TRP.

### ¿Cómo se imprime?

Desde la vista de detalle, botón **Imprimir**. El reporte incluye: encabezado con datos del documento, detalle de productos con cantidades, almacenes origen y destino, y un sello de agua que indica el estado.

### Sello de estado

| Estado | Sello visible |
|:---|---|
| **Borrador** | "BORRADOR" |
| **Aplicado** | Sin sello |
| **Anulado** | "ANULADO" |

---

## Preguntas Frecuentes

### ¿Puedo editar una TRP después de guardarla?
Sí, mientras esté en estado **Borrador**. Una vez **Aplicada**, solo puedes ver detalle, desaplicar o anularla.

### ¿Qué diferencia hay entre una TRP y hacer una SAP + ENP por separado?
La TRP hace ambas cosas en un solo documento: descuenta del almacén origen y acredita en el almacén destino automáticamente. Además, genera una ENP en el destino de forma automática.

### ¿Puedo transferir al mismo almacén?
No. El sistema valida que los almacenes origen y destino sean diferentes.

### ¿Por qué el scanner no es obligatorio?
Porque la transferencia genera automáticamente una ENP en el destino, que sirve como respaldo del movimiento. No se requiere un documento externo escaneado.

### ¿Qué pasa si cambio la tasa?
El sistema te preguntará si deseas **actualizar los costos** dividiéndolos entre la nueva tasa.

### ¿Qué significa "Postear"?
Postear es generar los **asientos contables** de la transferencia. Si el concepto tiene `MetodoPosteo = Aplicar`, se postea automáticamente al aplicar.

### ¿Cuál es la diferencia entre Anular y Desaplicar?
**Desaplicar** revierte el documento a Borrador para poder editarlo. **Anular** lo cancela definitivamente (pasa a estado Anulado).

### ¿Qué significa "Marcar como Revisado"?
Es un indicador visual que registra que alguien revisó físicamente la transferencia. No bloquea ninguna acción.

### ¿Puedo clonar una TRP existente?
Sí, desde el listado selecciona una TRP y haz clic en el botón **Clonar**. Se creará una copia en modo Borrador lista para editar.

---

## API Endpoints (para referencia técnica)

### Documento (CRUD + acciones)

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/TRP/{sucursal}` | Crear |
| `PUT` | `/TRP/{sucursal}` | Actualizar |
| `PUT` | `/TRP/{sucursal}/aplicar/{id}` | Aplicar |
| `PUT` | `/TRP/desaplicar` | Desaplicar |
| `POST` | `/TRP/{sucursal}/Anular` | Anular |
| `POST` | `/TRP/{sucursal}/Reversar/{id}` | Reversar |
| `POST` | `/TRP/{sucursal}/Revisado/{id}` | Marcar como revisado |

### Posteo contable

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/TRP/{sucursal}/postear` | Postear asientos |

### Consultas

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/TRP/{sucursal}/{id}` | Obtener por ID |
| `GET` | `/TRP/{sucursal}` | Listado resumido (paginado) |
| `GET` | `/TRP/{sucursal}/filtrar` | Listado con filtros |

### Scanner

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/TRP/{sucursal}/{id}/scanner/verificar` | Verificar si existe PDF escaneado |
| `GET` | `/TRP/{sucursal}/{id}/scanner/descargar` | Descargar PDF escaneado |

### Reportes

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/reportes/inventario/transferencia/{sucursal}/{id}` | Generar reporte PDF por ID |
| `POST` | `/reportes/inventario/transferencia` | Generar reporte PDF desde datos del documento |

---

## Navegación

← Anterior: [Salida de Almacén](salida-almacen) | Siguiente: (en desarrollo)
