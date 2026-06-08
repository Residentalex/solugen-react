# Nota de Crédito (NC)

> **📚** Este documento describe el flujo completo de **Nota de Crédito** (códigos **NCSUP** para Suplidor, **NCCLI** para Cliente). Está dirigido a usuarios finales que gestionan ajustes contables, devoluciones y compensaciones.

---

## ¿Qué es una Nota de Crédito?

Una **Nota de Crédito (NC)** es un documento contable que registra un **ajuste a favor del cliente o del suplidor**. Reduce el saldo pendiente de facturas asociadas y puede:

- Cancelar total o parcialmente una factura
- Registrar devoluciones de mercancía (suplidor)
- Ajustar diferencias contables
- Generar asientos contables de compensación

> **💡** La NC es el documento gemelo de la Nota de Débito (ND). Mientras la ND incrementa una deuda, la NC la reduce.

---

## El Concepto: el corazón de la NC

El **Concepto** (`Tabla - CONCEPTOS`) es el campo más importante de la NC porque define **TODO** el comportamiento del documento.

### Campos del Concepto que afectan la NC

| Campo Técnico | Nombre Visual | Efecto |
|:---|:---|---|
| `Moneda` | Moneda del concepto | Define la moneda de la NC. |
| `NoImpuesto` | Sin Impuestos | Si es **true**, se fuerzan **todos los impuestos a 0**. |
| `NoAsientos` | Sin Asientos | Si es **true**, **no se generan asientos contables** al postear. |
| `NoActualizaCostos` | No Actualizar Costos | Si es **true**, **no se actualiza** el costo de los productos. |

> **⚠️** El concepto debe configurarse correctamente ANTES de crear NCs.

---

## Tipos de Nota de Crédito

| Tipo | Código Pantalla | Uso |
|:---|---:|:---|
| **NC de Suplidor** | `FNCSUP` | Nota de crédito a proveedores (devolución de compras, ajustes de facturas) |
| **NC de Cliente** | `FNCCLI` | Nota de crédito a clientes (descuentos, ajustes de facturación) |

### Diferencias entre SUP y CLI

| Aspecto | NC Suplidor (SUP) | NC Cliente (CLI) |
|:---|---|:---|
| Documentos asociados | Facturas de suplidor (RDE) | Facturas de cliente (FAC/PV) |
| Devoluciones | ✅ Tab de Devoluciones (DVCs) | ❌ No aplica |
| Artículos | ❌ No aplica | ✅ Tab de Artículos con detalle de productos |
| Entidad | Suplidor/Proveedor | Cliente |

---

## Relaciones con otros módulos

| Documento | Tipo de relación | Descripción |
|:---|---|:---|
| **Factura Suplidor (RDE)** | Asociación | NCSUP se asocia a facturas de suplidor para reducir su saldo. |
| **Factura Cliente (FAC/PV)** | Asociación | NCCLI se asocia a facturas de cliente para reducir su saldo. |
| **Devolución Compra (DVC)** | Referencia | NCSUP puede incluir devoluciones de compra como documentos asociados. |
| **Nota de Débito (ND)** | Contraparte | La NC y ND son documentos complementarios en ajustes contables. |

---

## Crear una Nota de Crédito

### Validaciones al guardar

1. **Fecha de cierre**: La fecha del documento no puede ser **menor o igual** a la fecha de cierre **contable** de la sucursal.
2. **Entidad requerida**: Debe seleccionarse un suplidor o cliente según el tipo de NC.
3. **Documentos asociados**: La suma de montos en Documentos Relacionados debe coincidir con el Total.
4. **Devoluciones** (SUP): La suma de montos en Devoluciones debe coincidir con el Total.
5. **Asientos cuadrados**: Si hay asientos contables, los débitos deben ser igual a los créditos.
6. **Margen de impuestos**: Cada impuesto no puede superar `Total × (porcentaje + 1) / 100`.
7. **NCF duplicado**: Si se ingresa un NCF, se verifica que no haya sido usado por otra transacción de la misma entidad.
8. **Nota**: Máximo 500 caracteres.

### Campos del formulario

| Campo | Descripción | Origen |
|:---|---|:---:|
| Concepto | Define el comportamiento del documento. | Obligatorio |
| Sucursal | Sucursal a la que pertenece la NC. | Obligatorio |
| Entidad | Suplidor o cliente según el tipo. | Obligatorio |
| Fecha | Fecha contable del documento. | Obligatorio |
| Monto Total | Monto total de la nota de crédito. | Obligatorio |
| Bienes | Desglose del monto correspondiente a bienes. | Opcional |
| Servicios | Desglose del monto correspondiente a servicios. | Opcional |
| Moneda | Moneda del documento. | Obligatorio |
| Tasa | Tipo de cambio (si aplica). | Opcional |
| NCF | Número de Comprobante Fiscal. | Opcional |
| Referencia | Documento de referencia externo. | Opcional |
| Nota | Observaciones adicionales (máx. 500 caracteres). | Opcional |

### Documentos Relacionados

La NC se asocia a facturas existentes para reducir su saldo pendiente. Por cada documento:

| Campo | Descripción |
|:---|---|
| Documento | Identificador de la factura asociada. |
| Monto Original | Valor original de la factura. |
| Pagado/Abonado | Monto ya pagado de la factura. |
| Pendiente | Saldo restante por pagar. |
| Monto a Aplicar | Cantidad que se aplicará desde la NC (editable). |

---

## Aplicar una Nota de Crédito

Aplicar una NC significa **confirmar el ajuste contable**: se reduce el saldo de las facturas asociadas y se actualizan los registros contables.

### Validaciones antes de aplicar

1. **Scanner obligatorio**: Debe existir el PDF escaneado del documento de soporte.
2. **Documentos distribuidos**: Los montos aplicados a cada factura deben sumar el total de la NC.
3. **NCF válido**: Si tiene NCF, se valida formato (B0=11 dígitos, E3=13 dígitos).

### ¿Qué pasa después de aplicar?

| Paso | Descripción |
|:---|:---|
| Estado a **Aplicado** | El documento queda en estado aplicado. |
| Actualizar saldos | Se reducen los saldos pendientes de las facturas asociadas. |
| Postear asientos | Si `MetodoPosteo = Aplicar`, se generan asientos contables automáticamente. |

---

## Desaplicar

Desaplicar revierte una NC que estaba en estado **Aplicado** a **Borrador**.

### Requisitos

- La NC no debe estar en un período contable cerrado.
- Las facturas asociadas no deben tener pagos vinculados a esta NC.

El sistema solicita un **motivo de desaplicación** antes de proceder.

---

## Anular

Anular una NC la cancela por completo, con efecto contable.

### Wizard de anulación

El sistema guía al usuario en 3 pasos:

1. **Seleccionar fecha**: Fecha del día, fecha del documento, u otra fecha.
2. **Seleccionar motivo**: Datos Erróneos, Falta de Información, Entrada Duplicada, u Otros Motivos (texto libre).
3. **Confirmar**: Resumen de la anulación.

> **⚠️** Una vez anulada, la NC no se puede editar, aplicar ni desaplicar.

---

## Recalcular

El botón **Recalcular** en la vista de detalle ejecuta una recalculación completa:

1. Detecta diferencias de **pérdida o ganancia** en las devoluciones asociadas.
2. Si detecta una diferencia, pregunta al usuario si desea registrarla como pérdida/ganancia contable.
3. Ajusta los valores en la transacción asociada de inventario.
4. Recalcula los totales y asientos contables.

---

## Asientos Contables

La NC genera asientos contables que pueden ser:

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

Al crear o editar una NC en estado borrador, una **guía interactiva** te muestra los pasos a seguir:

| Paso | Campo | Descripción |
|:---|:---|---|
| 1 | **Concepto** | Elige el concepto que define el comportamiento del documento. |
| 2 | **Sucursal** | Selecciona la sucursal de la nota de crédito. |
| 3 | **Entidad** | Selecciona el suplidor o cliente según el tipo. |
| 4 | **Documentos** | Agrega los documentos asociados a la NC. |

La guía aparece automáticamente y puedes descartarla haciendo clic fuera de ella.

---

## Clonar documento

Desde el listado puedes **clonar** un documento existente para usarlo como plantilla:

1. Selecciona una NC en la tabla.
2. Haz clic en el botón **Clonar** (ícono 🗐).
3. Se crea una nueva NC en modo creación con todos los datos precargados.
4. Modifica lo necesario y guarda como un documento nuevo.

---

## Marcar como Revisado

Desde la vista de detalle puedes **marcar la NC como revisada**. Es un indicador visual que registra que alguien verificó el documento. No cambia el estado ni bloquea ninguna acción.

---

## Reportes

El sistema genera un **reporte PDF** de la NC.

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

### ¿Puedo editar una NC después de guardarla?
Sí, mientras esté en estado **Borrador**. Una vez **Aplicada**, solo puedes ver detalle, desaplicar o anularla.

### ¿Cuál es la diferencia entre NC de Suplidor y NC de Cliente?
La NC de **Suplidor (FNCSUP)** se usa para devoluciones de compras o ajustes de facturas de proveedores. Incluye un tab de **Devoluciones**. La NC de **Cliente (FNCCLI)** se usa para ajustes a favor del cliente. Incluye un tab de **Artículos** con detalle de productos.

### ¿Qué es el campo Bienes/Servicios?
Es un desglose opcional del monto total para fines fiscales. Separa la parte correspondiente a bienes físicos de la correspondiente a servicios.

### ¿Qué significa que un asiento sea "Manual"?
En la columna **Generado** de la tabla de asientos, "Manual" indica que el asiento fue creado o modificado por el usuario. "Auto" indica que fue generado automáticamente por el sistema. Los asientos manuales persisten incluso después de un recalcular.

### ¿Qué pasa si cambio la entidad después de agregar documentos?
El sistema te advertirá que los documentos asignados se borrarán. Si confirmas, se limpian las listas de documentos y devoluciones asociadas.

### ¿Qué significa "Recalcular"?
Ejecuta una recalculación completa que detecta diferencias de pérdida/ganancia en devoluciones y ajusta los valores contables. Es útil después de modificar montos de documentos asociados.

### ¿Qué significa "Postear"?
Postear es generar los **asientos contables** de la NC. Si el concepto tiene `MetodoPosteo = Aplicar`, se postea automáticamente al aplicar.

### ¿Cuál es la diferencia entre Anular y Desaplicar?
**Desaplicar** revierte el documento a Borrador para poder editarlo. **Anular** lo cancela definitivamente (pasa a estado Anulado).

### ¿Puedo clonar una NC existente?
Sí, desde el listado selecciona una NC y haz clic en el botón **Clonar**. Se creará una copia en modo Borrador lista para editar.

---

## API Endpoints (para referencia técnica)

### Documento (CRUD + acciones) — NCSUP

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/NCSUP/{sucursal}` | Crear |
| `PUT` | `/NCSUP/{sucursal}` | Actualizar |
| `PUT` | `/NCSUP/{sucursal}/aplicar/{id}` | Aplicar |
| `PUT` | `/NCSUP/desaplicar` | Desaplicar |
| `POST` | `/NCSUP/{sucursal}/Anular` | Anular |
| `POST` | `/NCSUP/{sucursal}/Reversar/{id}` | Reversar |
| `POST` | `/NCSUP/{sucursal}/Revisado/{id}` | Marcar como revisado |

### Documento (CRUD + acciones) — NCCLI

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/NCCLI/{sucursal}` | Crear |
| `PUT` | `/NCCLI/{sucursal}` | Actualizar |
| `PUT` | `/NCCLI/{sucursal}/aplicar/{id}` | Aplicar |
| `PUT` | `/NCCLI/desaplicar` | Desaplicar |
| `POST` | `/NCCLI/{sucursal}/Anular` | Anular |
| `POST` | `/NCCLI/{sucursal}/Reversar/{id}` | Reversar |
| `POST` | `/NCCLI/{sucursal}/Revisado/{id}` | Marcar como revisado |

### Posteo contable

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/Transaccion/{sucursal}/postear` | Postear asientos |
| `POST` | `/Transaccion/{sucursal}/generarAsiento` | Generar asientos |
| `GET` | `/Transaccion/{sucursal}/recalcularPagos/{id}` | Recalcular |

### Consultas

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/NCSUP/{sucursal}/{id}` | Obtener NCSUP por ID |
| `GET` | `/NCCLI/{sucursal}/{id}` | Obtener NCCLI por ID |
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
| `GET` | `/NCSUP/{sucursal}/{id}/scanner/verificar` | Verificar si existe PDF escaneado |
| `GET` | `/NCSUP/{sucursal}/{id}/scanner/descargar` | Descargar PDF escaneado |

### Reportes

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/reportes/contabilidad/nota-credito/{sucursal}/{id}` | Generar reporte PDF |

---

## Navegación

← Anterior: [Transferencia de Almacén](../inventario/transferencia-almacen) | Siguiente: (en desarrollo)
