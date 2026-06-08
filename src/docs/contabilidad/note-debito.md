# Nota de Débito (ND)

> **📚** Este documento describe el flujo completo de **Nota de Débito** (códigos **NDSUP** para Suplidor, **NDCLI** para Cliente). Está dirigido a usuarios finales que gestionan ajustes contables, recargos y compensaciones.

---

## ¿Qué es una Nota de Débito?

Una **Nota de Débito (ND)** es un documento contable que registra un **ajuste en contra del cliente o del suplidor**. Incrementa el saldo pendiente de facturas asociadas y puede:

- Registrar recargos o intereses sobre facturas
- Ajustar diferencias contables por errores
- Cobrar diferencias no facturadas
- Generar asientos contables de compensación

> **💡** La ND es el documento gemelo de la Nota de Crédito (NC). Mientras la NC reduce una deuda, la ND la incrementa.

---

## El Concepto: el corazón de la ND

El **Concepto** (`Tabla - CONCEPTOS`) es el campo más importante de la ND porque define **TODO** el comportamiento del documento.

### Campos del Concepto que afectan la ND

| Campo Técnico | Nombre Visual | Efecto |
|:---|:---|---|
| `Moneda` | Moneda del concepto | Define la moneda de la ND. |
| `NoImpuesto` | Sin Impuestos | Si es **true**, se fuerzan **todos los impuestos a 0**. |
| `NoAsientos` | Sin Asientos | Si es **true**, **no se generan asientos contables** al postear. |
| `NoActualizaCostos` | No Actualizar Costos | Si es **true**, **no se actualiza** el costo de los productos. |

> **⚠️** El concepto debe configurarse correctamente ANTES de crear NDs.

---

## Tipos de Nota de Débito

| Tipo | Código Pantalla | Uso |
|:---|---:|:---|
| **ND de Suplidor** | `FNDSUP` | Nota de débito a proveedores (recargos, ajustes de facturas) |
| **ND de Cliente** | `FNDCLI` | Nota de débito a clientes (intereses, diferencias) |

### Diferencias entre SUP y CLI

| Aspecto | ND Suplidor (SUP) | ND Cliente (CLI) |
|:---|---|:---|
| Documentos asociados | Facturas de suplidor (RDE) | Facturas de cliente (FAC/PV) |
| Devoluciones | ✅ Tab de Devoluciones (DVCs) | ❌ No aplica |
| Entidad | Suplidor/Proveedor | Cliente |

---

## Relaciones con otros módulos

| Documento | Tipo de relación | Descripción |
|:---|---|:---|
| **Factura Suplidor (RDE)** | Asociación | NDSUP se asocia a facturas de suplidor para incrementar su saldo. |
| **Factura Cliente (FAC/PV)** | Asociación | NDCLI se asocia a facturas de cliente para incrementar su saldo. |
| **Devolución Compra (DVC)** | Referencia | NDSUP puede incluir devoluciones de compra como documentos asociados. |
| **Nota de Crédito (NC)** | Contraparte | La ND y NC son documentos complementarios en ajustes contables. |

---

## Crear una Nota de Débito

### Validaciones al guardar

1. **Fecha de cierre**: La fecha del documento no puede ser **menor o igual** a la fecha de cierre **contable** de la sucursal.
2. **Entidad requerida**: Debe seleccionarse un suplidor o cliente según el tipo de ND.
3. **Tipo requerido**: Debe seleccionarse el tipo de nota de débito.
4. **Documentos asociados**: La suma de montos en Documentos Relacionados debe coincidir con el Total.
5. **Devoluciones** (SUP): La suma de montos en Devoluciones debe coincidir con el Total.
6. **Asientos cuadrados**: Si hay asientos contables, los débitos deben ser igual a los créditos.
7. **Margen de impuestos**: Cada impuesto no puede superar `Total × (porcentaje + 1) / 100`.
8. **NCF duplicado**: Si se ingresa un NCF, se verifica que no haya sido usado por otra transacción de la misma entidad.

### Campos del formulario

| Campo | Descripción | Origen |
|:---|---|:---:|
| Tipo | Tipo de nota de débito (define el comportamiento). | Obligatorio |
| Concepto | Define el comportamiento contable del documento. | Obligatorio |
| Sucursal | Sucursal a la que pertenece la ND. | Obligatorio |
| Entidad | Suplidor o cliente según el tipo. | Obligatorio |
| Fecha | Fecha contable del documento. | Obligatorio |
| Monto Total | Monto total de la nota de débito. | Obligatorio |
| Bienes | Desglose del monto correspondiente a bienes. | Opcional |
| Servicios | Desglose del monto correspondiente a servicios. | Opcional |
| Moneda | Moneda del documento. | Obligatorio |
| Tasa | Tipo de cambio (si aplica). | Opcional |
| NCF | Número de Comprobante Fiscal. | Opcional |
| NCF Modificado | NCF de la factura original que se está modificando. | Opcional |
| Referencia | Documento de referencia externo. | Opcional |
| Nota | Observaciones adicionales. | Opcional |

### Documentos Relacionados

La ND se asocia a facturas existentes para incrementar su saldo pendiente. Se agregan mediante el modal **Buscar Documentos**:

| Campo | Descripción |
|:---|---|
| Documento | Identificador de la factura asociada. |
| Monto Original | Valor original de la factura. |
| Saldo Pendiente | Monto aún no pagado de la factura. |
| Monto a Debitar | Cantidad que se debitará desde la ND (editable). |

---

## Aplicar una Nota de Débito

Aplicar una ND significa **confirmar el ajuste contable**: se incrementa el saldo de las facturas asociadas y se actualizan los registros contables.

### Validaciones antes de aplicar

1. **Scanner obligatorio**: Debe existir el PDF escaneado del documento de soporte.
2. **Documentos distribuidos**: Los montos aplicados a cada factura deben sumar el total de la ND.
3. **NCF válido**: Si tiene NCF, se valida formato (B0=11 dígitos, E3=13 dígitos).

### ¿Qué pasa después de aplicar?

| Paso | Descripción |
|:---|:---|
| Estado a **Aplicado** | El documento queda en estado aplicado. |
| Actualizar saldos | Se incrementan los saldos pendientes de las facturas asociadas. |
| Postear asientos | Si `MetodoPosteo = Aplicar`, se generan asientos contables automáticamente. |

---

## Desaplicar

Desaplicar revierte una ND que estaba en estado **Aplicado** a **Borrador**.

### Requisitos

- La ND no debe estar en un período contable cerrado.
- Las facturas asociadas no deben tener pagos vinculados a esta ND.

El sistema solicita un **motivo de desaplicación** antes de proceder.

---

## Anular

Anular una ND la cancela por completo, con efecto contable.

### Wizard de anulación

El sistema guía al usuario en 3 pasos:

1. **Seleccionar fecha**: Fecha del día, fecha del documento, u otra fecha.
2. **Seleccionar motivo**: Datos Erróneos, Falta de Información, Entrada Duplicada, u Otros Motivos (texto libre).
3. **Confirmar**: Resumen de la anulación.

> **⚠️** Una vez anulada, la ND no se puede editar, aplicar ni desaplicar.

---

## Recalcular

El botón **Recalcular** en la vista de detalle ejecuta una recalculación completa:

1. Detecta diferencias de **pérdida o ganancia** en las devoluciones asociadas.
2. Si detecta una diferencia, pregunta al usuario si desea registrarla como pérdida/ganancia contable.
3. Ajusta los valores en la transacción asociada de inventario.
4. Recalcula los totales y asientos contables.

---

## Asientos Contables

La ND genera asientos contables que pueden ser:

- **Automáticos**: Generados por el sistema al aplicar/postear.
- **Manuales**: Creados o modificados por el usuario (identificados con la marca "Manual" en la columna Generado).

Los asientos solo son editables si:
1. El documento está en estado **Borrador**.
2. El usuario tiene permiso **POSTEAR**.

### Validación de asientos

- Los débitos y créditos deben estar **cuadrados** (suma igual).
- Si no lo están, el sistema bloquea el guardado.

---

## Estados del documento

| Estado | Valor | Descripción | Acciones disponibles |
|:---|---:|---|---|
| **Borrador** | 0 | Documento creado sin efecto contable. | Editar, Guardar, Aplicar, Anular |
| **Aplicado** | 1 | Ya afectó saldos de facturas. | Ver detalle, Desaplicar, Anular, Postear, Recalcular, Imprimir |
| **Anulado** | 3 | Documento cancelado con reverso contable. | Solo consulta, Imprimir |

### Transiciones de estado

```
[Borrador] ──Aplicar──▶ [Aplicado] ──Anular──▶ [Anulado]
    ▲                      │
    └── Desaplicar ────────┘
```

---

## Guía paso a paso

Al crear o editar una ND en estado borrador, una **guía interactiva** te muestra los pasos a seguir:

| Paso | Campo | Descripción |
|:---|:---|---|
| 1 | **Concepto** | Elige el concepto que define el comportamiento del documento. |
| 2 | **Sucursal** | Selecciona la sucursal de la nota de débito. |
| 3 | **Entidad** | Selecciona el suplidor o cliente según el tipo. |
| 4 | **Documentos** | Agrega los documentos asociados a la ND. |

La guía aparece automáticamente y puedes descartarla haciendo clic fuera de ella.

---

## Clonar documento

Desde el listado puedes **clonar** un documento existente para usarlo como plantilla:

1. Selecciona una ND en la tabla.
2. Haz clic en el botón **Clonar** (ícono 🗐).
3. Se crea una nueva ND en modo creación con todos los datos precargados.
4. Modifica lo necesario y guarda como un documento nuevo.

---

## Marcar como Revisado

Desde la vista de detalle puedes **marcar la ND como revisada**. Es un indicador visual que registra que alguien verificó el documento. No cambia el estado ni bloquea ninguna acción.

---

## Reportes

El sistema genera un **reporte PDF** de la ND.

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

### ¿Puedo editar una ND después de guardarla?
Sí, mientras esté en estado **Borrador**. Una vez **Aplicada**, solo puedes ver detalle, desaplicar o anularla.

### ¿Cuál es la diferencia entre ND de Suplidor y ND de Cliente?
La ND de **Suplidor (FNDSUP)** se usa para recargos o ajustes de facturas de proveedores. Incluye un tab de **Devoluciones**. La ND de **Cliente (FNDCLI)** se usa para ajustes a favor de la empresa contra el cliente.

### ¿Qué es el NCF Modificado?
Es el NCF de la factura original que se está modificando con la nota de débito. Se usa para fines fiscales cuando la ND modifica un comprobante fiscal existente.

### ¿Qué significa que un asiento sea "Manual"?
En la columna **Generado** de la tabla de asientos, "Manual" indica que el asiento fue creado o modificado por el usuario. "Auto" indica que fue generado automáticamente por el sistema.

### ¿Qué pasa si cambio la entidad después de agregar documentos?
El sistema te advertirá que los documentos asignados se borrarán. Si confirmas, se limpian las listas de documentos y devoluciones asociadas.

### ¿Qué significa "Recalcular"?
Ejecuta una recalculación completa que detecta diferencias de pérdida/ganancia en devoluciones y ajusta los valores contables.

### ¿Qué significa "Postear"?
Postear es generar los **asientos contables** de la ND. Si el concepto tiene `MetodoPosteo = Aplicar`, se postea automáticamente al aplicar.

### ¿Cuál es la diferencia entre Anular y Desaplicar?
**Desaplicar** revierte el documento a Borrador para poder editarlo. **Anular** lo cancela definitivamente (pasa a estado Anulado).

### ¿Puedo clonar una ND existente?
Sí, desde el listado selecciona una ND y haz clic en el botón **Clonar**. Se creará una copia en modo Borrador lista para editar.

---

## API Endpoints (para referencia técnica)

### Documento (CRUD + acciones) — NDSUP

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/NDSUP/{sucursal}` | Crear |
| `PUT` | `/NDSUP/{sucursal}` | Actualizar |
| `PUT` | `/NDSUP/{sucursal}/aplicar/{id}` | Aplicar |
| `PUT` | `/NDSUP/desaplicar` | Desaplicar |
| `POST` | `/NDSUP/{sucursal}/Anular` | Anular |
| `POST` | `/NDSUP/{sucursal}/Reversar/{id}` | Reversar |
| `POST` | `/NDSUP/{sucursal}/Revisado/{id}` | Marcar como revisado |

### Documento (CRUD + acciones) — NDCLI

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/NDCLI/{sucursal}` | Crear |
| `PUT` | `/NDCLI/{sucursal}` | Actualizar |
| `PUT` | `/NDCLI/{sucursal}/aplicar/{id}` | Aplicar |
| `PUT` | `/NDCLI/desaplicar` | Desaplicar |
| `POST` | `/NDCLI/{sucursal}/Anular` | Anular |
| `POST` | `/NDCLI/{sucursal}/Reversar/{id}` | Reversar |
| `POST` | `/NDCLI/{sucursal}/Revisado/{id}` | Marcar como revisado |

### Posteo contable

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/Transaccion/{sucursal}/postear` | Postear asientos |
| `POST` | `/Transaccion/{sucursal}/generarAsiento` | Generar asientos |
| `GET` | `/Transaccion/{sucursal}/recalcularPagos/{id}` | Recalcular |

### Consultas

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/NDSUP/{sucursal}/{id}` | Obtener NDSUP por ID |
| `GET` | `/NDCLI/{sucursal}/{id}` | Obtener NDCLI por ID |
| `GET` | `/Transaccion/{sucursal}/tipo/{TipoDoc}` | Listado resumido por tipo |
| `GET` | `/Transaccion/{sucursal}/tipo/{tipoDoc}/filtrar` | Listado con filtros |

### Ajustes

| Método | Ruta | Acción |
|:---|---:|---|
| `PUT` | `/Transaccion/{sucursal}/ajustarAsociadaINV/{id}/{asociadaID}/{monto}/{perdida}` | Ajustar pérdida/ganancia |
| `GET` | `/Transaccion/{sucursal}/ncf` | Verificar NCF por entidad |

### Scanner

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/NDSUP/{sucursal}/{id}/scanner/verificar` | Verificar si existe PDF escaneado |
| `GET` | `/NDSUP/{sucursal}/{id}/scanner/descargar` | Descargar PDF escaneado |

### Reportes

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/reportes/contabilidad/nota-debito/{sucursal}/{id}` | Generar reporte PDF |

---

## Navegación

← Anterior: [Nota de Crédito](note-credito) | Siguiente: [Distribución de Balance](distribucion-balance)
