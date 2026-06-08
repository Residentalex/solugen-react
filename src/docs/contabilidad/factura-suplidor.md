# Factura Suplidor (RDE)

> **📚** Este documento describe el flujo completo de **Factura Suplidor** (código **RDE**). Está dirigido a usuarios finales que gestionan compras, contabilidad y cuentas por pagar.

---

## ¿Qué es una Factura Suplidor?

Una **Factura Suplidor (RDE)** es el documento contable que registra la **deuda con un proveedor/suplidor** por la compra de bienes o servicios. Constituye la base para:

- El registro de la **cuenta por pagar** (CxP)
- La **generación de asientos contables** de compra
- El **cálculo de retenciones** (ITBIS, ISR, etc.)
- La **gestión de pagos** a suplidores

> **💡** La RDE se genera automáticamente desde una Entrada de Almacén (ENP) cuando el concepto tiene `DocAGenerar = "RDE"`. También puede crearse manualmente para servicios sin inventario.

---

## El Concepto: el corazón de la RDE

El **Concepto** (`Tabla - CONCEPTOS`) define el comportamiento contable de la factura.

### Campos del Concepto que afectan la RDE

| Campo Técnico | Nombre Visual | Efecto |
|:---|:---|---|
| `Moneda` | Moneda del concepto | Define la moneda de la RDE. |
| `NoImpuesto` | Sin Impuestos | Si es **true**, se fuerzan los impuestos a 0. |
| `NoAsientos` | Sin Asientos | Si es **true**, no se generan asientos contables al postear. |
| `DocAGenerar` | Documento a Generar | Define qué documento se genera al postear. |
| `NoCuenta` | Cuenta Suplidor | Cuenta contable del suplidor. Si está vacío, usa la cuenta del suplidor. |
| `Replicar` | Replicar a otra sucursal | Si es **true**, los asientos se replican en la sucursal indicada. |

---

## Tipo de Documento

La RDE tiene un campo **Tipo de Documento** (`Tabla - TIPOS`) que debe seleccionarse **antes** del concepto.

| Campo | Efecto |
|:---|---|
| `RequiereReferencia` | Si es **true**, la RDE debe tener una ENP de referencia. |
| `Codigo` | Código del tipo (ej: "COMPRA", "SERVICIO"). |

---

## Relaciones con otros módulos

| Documento | Tipo de relación | Descripción |
|:---|---|:---|
| **Entrada de Almacén (ENP)** | Origen | La RDE se genera automáticamente desde la ENP si el concepto tiene `DocAGenerar = "RDE"`. |
| **Nota Débito (ND) / Nota Crédito (NC)** | Pago asociado | Documentos de ajuste o pago vinculados a la RDE. |
| **Transacciones (TRN)** | Pago | Pagos parciales o totales aplicados a la factura. |

---

## Crear una Factura Suplidor

### Desde una Entrada de Almacén (automático)

Cuando una ENP se **aplica** y su concepto tiene `DocAGenerar = "RDE"`, el sistema:
1. Crea automáticamente la RDE con los mismos datos de la ENP
2. Copia los detalles de la ENP como líneas de la RDE
3. Asigna el NCF (si se ingresó en la ENP)
4. La RDE queda en estado **Borrador** lista para revisar

### Manualmente (servicios o compras sin ENP)

1. Seleccionar **Tipo de Documento**
2. Seleccionar **Concepto**
3. Seleccionar **Suplidor**
4. Seleccionar **Sucursal Contable**
5. Ingresar **Fecha Documento**, **Fecha Vencimiento**, **Fecha Entrega**
6. Agregar productos manualmente o desde una ENP de referencia
7. Configurar **NCF** y **retenciones** en la pestaña Impuestos

### Campos del formulario

| Campo | Descripción | Origen |
|:---|---|:---:|
| Tipo de Documento | Define el tipo de compra. | Obligatorio |
| Concepto | Define el comportamiento contable. | Obligatorio |
| Suplidor | Proveedor de los bienes/servicios. | Obligatorio |
| Sucursal Contable | Sucursal donde se registra la factura. | Obligatorio |
| Fecha Documento | Fecha contable de la factura. | Obligatorio |
| Fecha Vencimiento | Fecha de vencimiento del pago. | Opcional |
| Fecha Entrega | Fecha de recepción de bienes. | Opcional |
| Entrada de Referencia | ENP asociada (si aplica). | Según tipo |
| Días Crédito | Plazo de crédito en días. | Opcional |
| NCF | Número de Comprobante Fiscal. | Opcional |
| Referencia | Documento de referencia externo. | Opcional |
| Tasa | Tipo de cambio (si aplica). | Según moneda |
| Nota | Observaciones adicionales. | Opcional |

### Pestaña Impuestos

La pestaña **Impuestos** permite gestionar los impuestos de la factura a nivel de encabezado:

| Tipo | Descripción |
|:---|---|
| **Impuesto** | ITBIS u otros impuestos sobre la compra. |
| **Retención** | Retenciones aplicadas (ITBIS, ISR, etc.). |
| **Informativo** | Impuestos informativos sin efecto contable. |

Cada línea de impuesto tiene: Tipo, Nombre, Porcentaje y Monto.

### Fórmulas de Recalcular

Para cada detalle:

| Campo | Fórmula |
|:---|---|
| `SubTotal` | `Cantidad × Costo` |
| `Descuento` | `SubTotal × PorcentajeDescuento / 100` |
| `Impuestos` | `(SubTotal - Descuento) × PorcentajeImpuesto / 100` |
| `Total` | `SubTotal + Impuestos - Descuento` |

Totales del encabezado:

| Campo | Fórmula |
|:---|---|
| `SubTotal` | `Total - Impuestos` |
| `Impuestos` | `Suma(ImpuestosFactura tipo Impuesto e Informativo)` |
| `Retenciones` | `Suma(ImpuestosFactura tipo Retención)` |
| `Total` | `Suma(Total detalles)` |

---

## Aplicar una Factura

Aplicar una RDE confirma la deuda con el suplidor y actualiza las cuentas por pagar.

### Validaciones antes de aplicar

1. **Scanner obligatorio**: Si aplica, debe existir el PDF escaneado.
2. **Concepto requerido**: Debe tener un concepto válido.
3. **Suplidor requerido**: Debe tener un suplidor.
4. **FechaPermitida**: Si el documento tiene `FechaPermitida = MenorIgualFechaDia`, la fecha no puede ser mayor a hoy. También se valida que la fecha de entrega no supere la fecha del documento.
5. **Detalles**: Al menos un detalle con cantidad > 0.

---

## Postear (Generar Asientos Contables)

La RDE genera asientos contables que registran la deuda y los impuestos.

### ¿Cómo se generan los asientos?

1. **Asientos de productos**: Por cada detalle, se genera un asiento a la cuenta de costo/activo correspondiente.
2. **Asientos de impuestos**: Por cada impuesto configurado, se genera el asiento correspondiente.
3. **Asiento del suplidor**: Contrapartida que registra la deuda.

> **💡** Los asientos pueden editarse manualmente desde la pestaña Asientos en modo edición.

### Validación de cuadratura

Al guardar, el sistema verifica que el **total de débitos** sea igual al **total de créditos**. Si no cuadran, se muestra un error impidiendo guardar.

---

## Desaplicar

Desaplicar revierte una RDE de **Aplicado** a **Borrador**.

### Restricciones

1. **Pagos asociados**: Si la RDE tiene pagos vinculados, los botones Desaplicar y Anular se deshabilitan automáticamente.
2. **Documentos generados**: Si generó documentos derivados aplicados, no se puede desaplicar.

---

## Anular

Anular una RDE la cancela por completo. El usuario selecciona **motivo** y **fecha** mediante el diálogo `ModalAnular`, y el sistema:

1. Crea un documento reverso
2. Genera asientos de reversión a través del pipeline completo
3. La RDE pasa a estado **Anulado** y queda solo de consulta

---

## Recalcular

El botón **Recalcular** en el detalle de la RDE ajusta los pagos asociados cuando hay diferencias contra el total de la factura. Disponible solo cuando la RDE está en estado **Aplicado**.

---

## Estados del documento

| Estado | Valor | Descripción | Acciones disponibles |
|:---|---:|---|---|
| **Borrador** | 0 | Documento creado sin efecto contable. | Editar, Guardar, Aplicar, Anular |
| **Aplicado** | 1 | Deuda registrada. Cuentas por pagar actualizadas. | Desaplicar\*, Anular, Postear\*\*, Recalcular, Imprimir |
| **Anulado** | 3 | Documento cancelado con reverso contable. | Solo consulta, Imprimir |

> **⚠️** (\*) Desaplicar solo si no tiene restricciones (pagos asociados).
> **⚠️** (\*\*) Postear manual si no se posteó automáticamente al aplicar.

---

## Documentos Asociados

Los documentos de pago vinculados a la RDE (Notas Débito, Transacciones, etc.) se muestran en la pestaña **Documentos** del detalle.

Cada fila es **clickeable** para navegar al documento correspondiente:

| Tipo Documento | Ruta de navegación |
|:---|---|
| ND (Nota Débito) | `/FNDSUP/:id` |
| NC (Nota Crédito) | `/FNCSUP/:id` |
| TRN (Transacción) | `/FTRN/:id` |

---

## Reportes

El sistema genera un **reporte PDF** de la RDE que puedes imprimir o guardar.

---

## API Endpoints (para referencia técnica)

### Documento (CRUD + acciones)

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/RDE/{sucursal}` | Crear |
| `PUT` | `/RDE/{sucursal}` | Actualizar |
| `PUT` | `/RDE/{sucursal}/aplicar/{id}` | Aplicar |
| `PUT` | `/RDE/desaplicar` | Desaplicar |
| `POST` | `/RDE/{sucursal}/anular` | Anular |
| `POST` | `/RDE/{sucursal}/{id}/Reversar` | Reversar |
| `POST` | `/RDE/{sucursal}/{id}/Revisado` | Marcar revisado |

### Posteo contable

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/RDE/{sucursal}/postear` | Postear asientos |

### Recalcular

| Método | Ruta | Acción |
|:---|---:|---|
| `PUT` | `/Transaccion/{sucursal}/recalcularPagos/{id}` | Recalcular pagos |

### Consultas

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/RDE/{sucursal}/{id}` | Obtener por ID |
| `GET` | `/RDE/{sucursal}` | Listado resumido |
| `GET` | `/RDE/{sucursal}/filtrar` | Listado con filtros |

### Scanner

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/RDE/{sucursal}/{id}/scanner/verificar` | Verificar si existe PDF |
| `GET` | `/RDE/{sucursal}/{id}/scanner/descargar` | Descargar PDF |

### Reportes

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/reportes/contabilidad/facturaSuplidor/{sucursal}/{id}` | Reporte PDF por ID |
| `POST` | `/reportes/contabilidad/facturaSuplidor` | Reporte desde datos del documento |

---

## Navegación

← Anterior: [Devolución de Compra](/documentacion/devolucion-compra) | Siguiente: (en desarrollo)
