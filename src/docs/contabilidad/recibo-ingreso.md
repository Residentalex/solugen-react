# Recibo de Ingreso (RI)

> **📚** Este documento describe el flujo completo de **Recibo de Ingreso** (código **RI**). Está dirigido a usuarios finales que gestionan cobros, cuentas por cobrar y tesorería.

---

## ¿Qué es un Recibo de Ingreso?

Un **Recibo de Ingreso (RI)** es el documento contable que registra el **cobro o ingreso de efectivo** de parte de un cliente o entidad. Constituye la base para:

- La **aplicación de pagos** a facturas pendientes
- La **actualización de saldos** de cuentas por cobrar
- La **generación de asientos contables** de ingreso
- El **control de tesorería** y arqueo de caja

> **💡** El RI es el documento inverso al Recibo de Egreso. Mientras el RI registra entradas de efectivo, el RE registra salidas.

---

## El Concepto: el corazón del RI

El **Concepto** (`Tabla - CONCEPTOS`) define el comportamiento contable del recibo.

### Campos del Concepto que afectan el RI

| Campo Técnico | Nombre Visual | Efecto |
|:---|:---|---|
| `Moneda` | Moneda del concepto | Define la moneda del RI. |
| `NoImpuesto` | Sin Impuestos | Si es **true**, se fuerzan los impuestos a 0. |
| `NoAsientos` | Sin Asientos | Si es **true**, no se generan asientos contables al postear. |

---

## Tipo de Documento

El RI tiene un campo **Tipo de Documento** (`Tabla - TIPOS`) que debe seleccionarse **antes** del concepto.

| Campo | Efecto |
|:---|---|
| `RequiereReferencia` | Si es **true**, el RI debe tener una referencia. |

---

## Relaciones con otros módulos

| Documento | Tipo de relación | Descripción |
|:---|---|:---|
| **Factura Cliente (FAC/PV)** | Pago | El RI aplica pagos a facturas de cliente. |
| **Nota Débito (NDCLI)** | Pago | Puede incluir notas de débito como parte del cobro. |
| **Transacciones (TRN)** | Contraparte | Los asientos contables se registran como transacciones. |

---

## Crear un Recibo de Ingreso

### Campos del formulario

| Campo | Descripción | Origen |
|:---|---|:---:|
| Tipo de Documento | Define el tipo de recibo. | Obligatorio |
| Concepto | Define el comportamiento contable. | Obligatorio |
| Entidad | Cliente o entidad que realiza el pago. | Obligatorio |
| Sucursal Contable | Sucursal donde se registra el ingreso. | Obligatorio |
| Fecha Documento | Fecha contable del recibo. | Obligatorio |
| Total | Monto total del recibo (editable manualmente). | Obligatorio |
| Tasa | Tipo de cambio (si aplica). | Según moneda |
| NCF | Número de Comprobante Fiscal. | Opcional |
| Referencia | Documento de referencia externo. | Opcional |
| Nota | Observaciones adicionales. | Opcional |

### Documentos Relacionados (Distribución)

Los documentos a los que se aplica el pago se agregan en la pestaña **Documentos Relacionados**:

| Campo | Descripción |
|:---|---|
| Documento | Factura, ND u otro documento a pagar. |
| Monto Original | Valor original del documento. |
| Saldo Pendiente | Monto aún no pagado del documento. |
| Monto a Pagar | Cantidad que se aplica desde el RI (editable). |

> **⚠️** La suma de los montos distribuidos no puede superar el total del recibo.

### Cobros (Medios de Pago)

Los medios de cobro se registran en la pestaña **Cobros**:

| Medio de Cobro | Descripción |
|:---|---|
| Efectivo | Pago en efectivo. |
| Cheque | Pago con cheque. |
| Transferencia | Pago por transferencia bancaria. |
| Tarjeta Crédito | Pago con tarjeta de crédito. |
| Tarjeta Débito | Pago con tarjeta de débito. |
| Nota Crédito | Pago con nota de crédito. |

---

## Aplicar un Recibo de Ingreso

Aplicar un RI confirma el cobro y actualiza los saldos de las facturas asociadas.

### Validaciones antes de aplicar

1. **Scanner obligatorio**: Debe existir el PDF escaneado del comprobante.
2. **FechaPermitida**: Si el documento tiene `FechaPermitida = MenorIgualFechaDia`, la fecha no puede ser mayor a hoy.
3. **Concepto requerido**: Debe tener un concepto válido.
4. **Entidad requerida**: Debe tener una entidad/cliente.
5. **Distribución válida**: El monto distribuido en facturas no puede superar el total.
6. **No hay cobros**: Si no hay medios de cobro, se genera un cobro por defecto.

---

## Postear (Generar Asientos Contables)

El RI genera asientos contables que registran el ingreso de efectivo.

### ¿Cómo se generan los asientos?

1. **Asiento de ingreso**: Por el monto total del recibo.
2. **Asientos de descuento**: Si aplican descuentos por pronto pago.
3. **Asientos de impuestos**: Por retenciones aplicadas.

### Validación de cuadratura

Al guardar, el sistema verifica que el **total de débitos** sea igual al **total de créditos**.

---

## Desaplicar

Desaplicar revierte un RI de **Aplicado** a **Borrador**. Se solicita un **motivo** antes de proceder.

### Restricciones

- **Documentos generados**: Si generó documentos derivados aplicados, no se puede desaplicar.

---

## Anular

Anular un RI lo cancela por completo. El usuario selecciona **motivo** y **fecha** mediante el diálogo `ModalAnular`, y el sistema:

1. Crea un documento reverso
2. Genera asientos de reversión a través del pipeline completo
3. El RI pasa a estado **Anulado**

---

## Cambio de Entidad

Al cambiar la entidad/cliente en el formulario, si existen documentos relacionados asignados, el sistema muestra una advertencia:

> *"La entidad tiene documentos asignados. Se borrarán los documentos agregados."*

Si el usuario confirma, se limpian los documentos y se asigna la nueva entidad.

---

## Estados del documento

| Estado | Valor | Descripción | Acciones disponibles |
|:---|---:|---|---|
| **Borrador** | 0 | Documento creado sin efecto contable. | Editar, Guardar, Aplicar, Anular |
| **Aplicado** | 1 | Cobro registrado. Saldos actualizados. | Desaplicar\*, Anular, Postear\*\*, Imprimir |
| **Anulado** | 3 | Documento cancelado con reverso contable. | Solo consulta, Imprimir |

> **⚠️** (\*) Desaplicar solo si no tiene restricciones.

---

## Guía paso a paso

Al crear o editar un RI en estado borrador, una **guía interactiva** muestra los pasos a seguir:

| Paso | Campo | Descripción |
|:---|:---|---|
| 1 | **Tipo de Documento** | Elige el tipo de recibo. |
| 2 | **Concepto** | Elige el concepto que define el comportamiento contable. |
| 3 | **Entidad** | Selecciona el cliente o entidad. |
| 4 | **Monto** | Ingresa el monto total del recibo. |
| 5 | **Documentos** | Agrega los documentos a los que se aplica el pago. |

---

## API Endpoints (para referencia técnica)

### Documento (CRUD + acciones)

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/RI/{sucursal}` | Crear |
| `PUT` | `/RI/{sucursal}` | Actualizar |
| `PUT` | `/RI/{sucursal}/aplicar/{id}` | Aplicar |
| `PUT` | `/RI/desaplicar` | Desaplicar |
| `POST` | `/RI/{sucursal}/anular` | Anular |
| `POST` | `/RI/{sucursal}/{id}/Reversar` | Reversar |
| `POST` | `/RI/{sucursal}/{id}/Revisado` | Marcar revisado |

### Posteo contable

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/RI/{sucursal}/postear` | Postear asientos |

### Consultas

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/RI/{sucursal}/{id}` | Obtener por ID |
| `GET` | `/RI/{sucursal}` | Listado resumido |
| `GET` | `/RI/{sucursal}/filtrar` | Listado con filtros |

### Scanner

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/RI/{sucursal}/{id}/scanner/verificar` | Verificar PDF |
| `GET` | `/RI/{sucursal}/{id}/scanner/descargar` | Descargar PDF |

### Reportes

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/reportes/contabilidad/recibo-ingreso` | Generar reporte PDF |

---

## Navegación

← Anterior: [Factura Cliente](factura-cliente) | Siguiente: (en desarrollo)
