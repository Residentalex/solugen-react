# Distribución de Balance (DBA)

> **📚** Este documento describe el flujo completo de **Distribución de Balance** (códigos **DBASUP** para Suplidor, **DBACLI** para Cliente). Está dirigido a usuarios finales que gestionan distribución de montos entre cuentas contables.

---

## ¿Qué es una Distribución de Balance?

Una **Distribución de Balance (DBA)** es un documento contable que permite **distribuir un monto total entre múltiples facturas o documentos**, separando la distribución en Débitos y Créditos. Es la herramienta principal para:

- Compensar facturas de suplidores y clientes
- Distribuir pagos entre múltiples documentos
- Registrar ajustes contables de balance
- Generar asientos contables automáticos

> **💡** La DBA es el documento central para la distribución de pagos: recibe un monto total y lo reparte entre documentos de débito y crédito, asegurando que ambos lados cuadren.

---

## Tipos de Distribución de Balance

| Tipo | Código Pantalla | Uso |
|:---|---:|:---|
| **DBA de Suplidor** | `FDBASUP` | Distribución de balance para proveedores |
| **DBA de Cliente** | `FDBACLI` | Distribución de balance para clientes |

---

## Relaciones con otros módulos

| Documento | Tipo de relación | Descripción |
|:---|---|:---|
| **Factura Suplidor (FRDE)** | Asociación | Documento asociado como débito o crédito en la distribución |
| **Factura Cliente (FFAC)** | Asociación | Documento asociado como débito o crédito en la distribución |
| **Devolución Compra (DVC)** | Asociación | Documento asociado en la distribución |
| **Nota de Crédito (NC)** | Asociación | Documento asociado en la distribución |
| **Nota de Débito (ND)** | Asociación | Documento asociado en la distribución |

---

## Crear una Distribución de Balance

### Validaciones al guardar

1. **Fecha de cierre**: La fecha del documento no puede ser **menor o igual** a la fecha de cierre **contable** de la sucursal.
2. **Concepto requerido**: Debe seleccionarse un concepto.
3. **Entidad requerida**: Debe seleccionarse un suplidor o cliente.
4. **Débitos = Créditos**: El total de los montos en Débitos debe ser **exactamente igual** al total de los montos en Créditos.
5. **Asientos cuadrados**: Si hay asientos contables, los débitos deben ser igual a los créditos.
6. **Nota**: Máximo 500 caracteres.

### Campos del formulario

| Campo | Descripción | Origen |
|:---|---|:---:|
| Tipo | Tipo de distribución. | Obligatorio |
| Concepto | Define el comportamiento contable del documento. | Obligatorio |
| Entidad | Suplidor o cliente según el tipo. | Obligatorio |
| Fecha | Fecha contable del documento. | Obligatorio |
| Moneda | Moneda del documento. | Obligatorio |
| Tasa | Tipo de cambio (si aplica). | Opcional |
| NCF | Número de Comprobante Fiscal. | Opcional |
| Referencia | Documento de referencia externo. | Opcional |
| Nota | Observaciones adicionales (máx. 500 caracteres). | Opcional |

### Débitos y Créditos

La DBA se compone de dos listas de documentos asociados:

| Pestaña | Descripción |
|:---|---|
| **Débitos** | Documentos que aumentan el saldo (facturas, notas de débito) |
| **Créditos** | Documentos que disminuyen el saldo (notas de crédito, pagos) |

Cada documento en las listas tiene:

| Campo | Descripción |
|:---|---|
| Documento | Identificador del documento asociado (link navegable). |
| NCF | Número de Comprobante Fiscal del documento. |
| Monto Original | Valor original del documento. |
| Abonado | Monto ya pagado del documento. |
| Pendiente | Saldo restante. |
| Retención | Monto de retención aplicada. |
| Monto | Cantidad distribuida en esta operación (editable). |

> **⚠️** El total de Débitos debe ser **exactamente igual** al total de Créditos. Si no cuadran, el sistema bloquea el guardado.

---

## Aplicar una Distribución de Balance

Aplicar una DBA significa **confirmar la distribución**: se actualizan los saldos de los documentos asociados y se generan los asientos contables.

### Validaciones antes de aplicar

1. **Débitos = Créditos**: La regla principal de la DBA.
2. **Asientos cuadrados**: Los débitos y créditos de los asientos deben coincidir.

### ¿Qué pasa después de aplicar?

| Paso | Descripción |
|:---|:---|
| Estado a **Aplicado** | El documento queda en estado aplicado. |
| Actualizar saldos | Se actualizan los saldos de los documentos asociados. |
| Postear asientos | Se generan asientos contables automáticamente. |

---

## Desaplicar

Desaplicar revierte una DBA que estaba en estado **Aplicado** a **Borrador**.

### Requisitos

- La DBA no debe estar en un período contable cerrado.
- Los documentos asociados no deben tener restricciones.

El sistema solicita un **motivo de desaplicación** antes de proceder.

---

## Anular

Anular una DBA la cancela por completo, con efecto contable.

### Wizard de anulación

El sistema guía al usuario en 3 pasos:

1. **Seleccionar fecha**: Fecha del día, fecha del documento, u otra fecha.
2. **Seleccionar motivo**: Datos Erróneos, Falta de Información, Entrada Duplicada, u Otros Motivos (texto libre).
3. **Confirmar**: Resumen de la anulación.

> **⚠️** Una vez anulada, la DBA no se puede editar, aplicar ni desaplicar.

---

## Recalcular

El botón **Recalcular** en la vista de detalle ejecuta una recalculación completa de los asientos contables basados en los montos distribuidos.

---

## Asientos Contables

La DBA genera asientos contables que pueden ser:

- **Automáticos**: Generados por el sistema al aplicar/postear.
- **Manuales**: Creados o modificados por el usuario (identificados con la marca "Manual" en la columna Generado).

Los asientos solo son editables si:
1. El documento está en estado **Borrador**.
2. El usuario tiene permiso **POSTEAR**.

---

## Estados del documento

| Estado | Valor | Descripción | Acciones disponibles |
|:---|---:|---|---|
| **Borrador** | 0 | Documento creado sin efecto contable. | Editar, Guardar, Aplicar, Anular |
| **Aplicado** | 1 | Ya afectó saldos de documentos. | Ver detalle, Desaplicar, Anular, Postear, Recalcular, Revisar, Reversar, Imprimir |
| **Anulado** | 3 | Documento cancelado con reverso contable. | Solo consulta, Imprimir |

### Transiciones de estado

```
[Borrador] ──Aplicar──▶ [Aplicado] ──Anular──▶ [Anulado]
    ▲                      │
    └── Desaplicar ────────┘
```

---

## Guía paso a paso

Al crear o editar una DBA en estado borrador, una **guía interactiva** te muestra los pasos a seguir:

| Paso | Campo | Descripción |
|:---|:---|---|
| 1 | **Concepto** | Elige el concepto que define el comportamiento del documento. |
| 2 | **Entidad** | Selecciona el suplidor o cliente. |
| 3 | **Débitos/Créditos** | Agrega los montos a distribuir en las pestañas correspondientes. |

La guía aparece automáticamente y puedes descartarla haciendo clic fuera de ella.

---

## Marcar como Revisado

Desde la vista de detalle puedes **marcar la DBA como revisada**. Es un indicador visual que registra que alguien verificó el documento.

---

## Reversar

**Reversar** crea un **asiento contable inverso** que neutraliza el efecto contable original sin alterar el estado del documento. Útil cuando se necesita corregir contabilidad sin desaplicar.

---

## Reportes

El sistema genera un **reporte PDF** de la DBA.

### ¿Cómo se imprime?

Desde la vista de detalle, botón **Imprimir**.

### Sello de estado

| Estado | Sello visible |
|:---|---|
| **Borrador** | "BORRADOR" |
| **Aplicado** | Sin sello |
| **Anulado** | "ANULADO" |

---

## Preguntas Frecuentes

### ¿Puedo editar una DBA después de guardarla?
Sí, mientras esté en estado **Borrador**. Una vez **Aplicada**, solo puedes ver detalle, desaplicar o anularla.

### ¿Qué significa que Débitos y Créditos deben ser iguales?
La DBA es un documento de balance: los montos que se debitan deben compensarse exactamente con los montos que se acreditan. Si no son iguales, el documento no se puede guardar.

### ¿Qué diferencia hay entre Débito y Crédito en una DBA?
En una DBA de **Suplidor**, los Débitos representan lo que se le debe (facturas) y los Créditos representan pagos o notas de crédito. En una DBA de **Cliente**, es al revés.

### ¿Qué es el campo Retención?
Muestra el monto de retención aplicada al documento. Se usa para control fiscal de retenciones de ISR o ITBIS.

### ¿Cómo se agregan documentos a Débitos o Créditos?
Los documentos pendientes se agregan desde el modal **Buscar Documentos**, que lista las facturas, notas de crédito/débito y devoluciones pendientes de la entidad seleccionada.

### ¿Qué significa "Recalcular"?
Regenera los asientos contables basados en los montos actuales de débitos y créditos. Útil después de modificar montos.

### ¿Qué significa "Postear"?
Postear es generar los **asientos contables** de la DBA. Si el concepto tiene `MetodoPosteo = Aplicar`, se postea automáticamente al aplicar.

### ¿Cuál es la diferencia entre Anular y Desaplicar?
**Desaplicar** revierte el documento a Borrador para poder editarlo. **Anular** lo cancela definitivamente (pasa a estado Anulado).

### ¿Qué significa "Reversar"?
Crea asientos contables inversos para neutralizar el efecto contable sin cambiar el estado del documento.

### ¿Puedo eliminar documentos de la distribución?
Sí, cada fila en Débitos y Créditos tiene un botón de eliminar individual. También puedes seleccionar múltiples filas con checkboxes y eliminarlas todas a la vez.

---

## API Endpoints (para referencia técnica)

### Documento (CRUD + acciones)

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/DBA/{sucursal}` | Crear |
| `PUT` | `/DBA/{sucursal}` | Actualizar |
| `PUT` | `/DBA/{sucursal}/aplicar/{id}` | Aplicar |
| `PUT` | `/DBA/desaplicar` | Desaplicar |
| `POST` | `/DBA/{sucursal}/Anular` | Anular |
| `POST` | `/DBA/{sucursal}/Reversar/{id}` | Reversar |
| `POST` | `/DBA/{sucursal}/Revisado/{id}` | Marcar como revisado |

### Posteo contable

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/DBA/{sucursal}/postear` | Postear asientos |
| `PUT` | `/DBA/{sucursal}/recalcularPagos/{id}` | Recalcular |

### Consultas

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/DBA/{sucursal}/{id}` | Obtener por ID |
| `GET` | `/DBA/{sucursal}` | Listado resumido (paginado) |
| `GET` | `/DBA/{sucursal}/filtrar` | Listado con filtros |

### Reportes

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/reportes/contabilidad/distribucionBalance/{sucursal}/{id}` | Generar reporte PDF |

---

## Navegación

← Anterior: [Nota de Débito](note-debito) | Siguiente: (en desarrollo)
