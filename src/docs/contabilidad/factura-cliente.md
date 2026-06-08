# Factura Cliente (FAC)

> **📚** Este documento describe el flujo completo de **Factura Cliente** (código **FAC**). Está dirigido a usuarios finales que gestionan ventas, cuentas por cobrar y facturación electrónica.

---

## ¿Qué es una Factura Cliente?

Una **Factura Cliente (FAC)** es el documento contable que registra la **deuda de un cliente** por la compra de bienes o servicios. Constituye la base para:

- El registro de la **cuenta por cobrar** (CxC)
- La **generación de asientos contables** de venta
- El **cálculo de impuestos** (ITBIS)
- El **envío a la DGII** (facturación electrónica)
- La **gestión de cobros**

> **💡** La FAC es el documento principal de facturación a clientes. Para facturación rápida en punto de venta, existe **Factura POS (PV)**.

---

## El Concepto: el corazón de la FAC

El **Concepto** (`Tabla - CONCEPTOS`) define el comportamiento contable de la factura.

### Campos del Concepto que afectan la FAC

| Campo Técnico | Nombre Visual | Efecto |
|:---|:---|---|
| `Moneda` | Moneda del concepto | Define la moneda de la FAC. |
| `NoImpuesto` | Sin Impuestos | Si es **true**, se fuerzan los impuestos a 0. |
| `NoAsientos` | Sin Asientos | Si es **true**, no se generan asientos contables al postear. |
| `DocAGenerar` | Documento a Generar | Define qué documento se genera al postear. |
| `NoCuenta` | Cuenta Cliente | Cuenta contable del cliente. |
| `Replicar` | Replicar a otra sucursal | Si es **true**, los asientos se replican en la sucursal indicada. |

---

## Tipo de Documento

La FAC tiene un campo **Tipo de Documento** (`Tabla - TIPOS`) que debe seleccionarse **antes** del concepto.

| Campo | Efecto |
|:---|---|
| `RequiereNCF` | Si es **true**, la factura requiere NCF. |
| `EnvioDGII` | Si es **true**, la factura debe enviarse a la DGII antes de aplicar. |
| `RequiereReferencia` | Si es **true**, la factura debe tener una referencia. |

---

## Envío a la DGII (Facturación Electrónica)

Si el tipo de documento tiene marcado **EnvioDGII**, la factura debe enviarse a la DGII antes de poder aplicarla.

### Flujo DGII

```
1. Crear factura en Borrador
2. Configurar NCF y datos fiscales
3. Hacer clic en "Enviar DGII"
4. El sistema registra el envío y obtiene el código QR
5. Una vez con QR, se habilita "Aplicar"
6. Si no tiene QR, el sistema BLOQUEA la aplicación
```

### Botones DGII en el detalle

| Botón | Descripción |
|:---|---|
| **Enviar DGII** | Envía la factura a la DGII y registra la respuesta (código QR). |
| **Reasignar NCF** | Asigna un nuevo NCF a la factura (conversión física → electrónica). |

> **⚠️** Si el tipo de documento NO tiene `EnvioDGII`, estos botones no se muestran.

---

## Relaciones con otros módulos

| Documento | Tipo de relación | Descripción |
|:---|---|:---|
| **Factura POS (PV)** | Alternativa | Facturación rápida para punto de venta. |
| **Nota Débito (NDCLI)** | Ajuste | Incrementa el saldo de la factura. |
| **Nota Crédito (NCCLI)** | Ajuste | Reduce el saldo de la factura. |
| **Cobros** | Pago | Pagos parciales o totales aplicados a la factura. |
| **Transacciones (TRN)** | Pago | Pagos registrados contra la factura. |

---

## Crear una Factura Cliente

### Campos del formulario

| Campo | Descripción | Origen |
|:---|---|:---:|
| Tipo de Documento | Define el tipo de factura y si requiere DGII. | Obligatorio |
| Concepto | Define el comportamiento contable. | Obligatorio |
| Cliente | Cliente al que se factura. | Obligatorio |
| Sucursal Contable | Sucursal donde se registra la factura. | Obligatorio |
| Almacén | Almacén de salida (solo si hay productos). | Según tipo |
| Fecha Documento | Fecha contable de la factura. | Obligatorio |
| Fecha Vencimiento | Fecha de vencimiento del pago. | Opcional |
| NCF | Número de Comprobante Fiscal. | Según tipo |
| Referencia | Documento de referencia externo. | Opcional |
| Tasa | Tipo de cambio (si aplica). | Según moneda |
| Nota | Observaciones adicionales. | Opcional |

### Pestaña Impuestos

La pestaña **Impuestos** permite gestionar los impuestos de la factura a nivel de encabezado:

| Tipo | Descripción |
|:---|---|
| **Impuesto** | ITBIS u otros impuestos sobre la venta. |
| **Retención** | Retenciones aplicadas. |

> **💡** Si el cliente está marcado como **Exento de Impuestos**, al seleccionarlo se limpian automáticamente los impuestos de todos los detalles.

### Fórmulas de Recalcular

Para cada detalle:

| Campo | Fórmula |
|:---|---|
| `SubTotal` | `Cantidad × Precio` |
| `Descuento` | `SubTotal × PorcentajeDescuento / 100` |
| `Impuestos` | `(SubTotal - Descuento) × PorcentajeImpuesto / 100` |
| `Total` | `SubTotal + Impuestos - Descuento` |

---

## Aplicar una Factura

Aplicar una FAC confirma la deuda del cliente y actualiza las cuentas por cobrar.

### Validaciones antes de aplicar

1. **Scanner obligatorio**: Si aplica, debe existir el PDF escaneado.
2. **DGII**: Si el tipo tiene `EnvioDGII = true`, la factura debe tener un código QR de la DGII. Si no, se bloquea.
3. **FechaPermitida**: Si el documento tiene `FechaPermitida = MenorIgualFechaDia`, la fecha no puede ser mayor a hoy.
4. **Concepto requerido**: Debe tener un concepto válido.
5. **Cliente requerido**: Debe tener un cliente.
6. **Almacén**: Requerido solo si hay productos (no servicios).
7. **Detalles**: Al menos un detalle con cantidad > 0.

---

## Postear (Generar Asientos Contables)

La FAC genera asientos contables que registran el ingreso y los impuestos.

### ¿Cómo se generan los asientos?

1. **Asientos de productos**: Por cada detalle, se genera un asiento a la cuenta de ingreso correspondiente.
2. **Asientos de impuestos**: Por cada impuesto configurado, se genera el asiento correspondiente.
3. **Asiento del cliente**: Contrapartida que registra la cuenta por cobrar.

### Validación de cuadratura

Al guardar, el sistema verifica que el **total de débitos** sea igual al **total de créditos**.

---

## Desaplicar

Desaplicar revierte una FAC de **Aplicado** a **Borrador**. Se solicita un **motivo** antes de proceder.

### Restricciones

- **Documentos generados**: Si generó documentos derivados aplicados, no se puede desaplicar.

---

## Anular

Anular una FAC la cancela por completo. El usuario selecciona **motivo** y **fecha** mediante el diálogo `ModalAnular`, y el sistema:

1. Crea un documento reverso
2. Genera asientos de reversión a través del pipeline completo
3. La FAC pasa a estado **Anulado**

---

## Cobros

Los cobros aplicados a la factura se muestran en la pestaña **Cobros** del detalle:

| Columna | Descripción |
|:---|---|
| Fecha | Fecha del cobro. |
| Medio Cobro | Efectivo, Transferencia, etc. |
| Monto | Monto del cobro. |
| Estado | Estado del cobro. |

---

## Notas de Seguimiento

Las notas de seguimiento permiten registrar comentarios y eventos sobre la factura. Se muestran en la pestaña **Notas** del detalle como una línea de tiempo.

---

## Estados del documento

| Estado | Valor | Descripción | Acciones disponibles |
|:---|---:|---|---|
| **Borrador** | 0 | Documento creado sin efecto contable. | Editar, Guardar, Aplicar, Anular |
| **Aplicado** | 1 | Deuda registrada. Cuentas por cobrar actualizadas. | Desaplicar\*, Anular, Postear\*\*, Imprimir, Enviar DGII |
| **Anulado** | 3 | Documento cancelado con reverso contable. | Solo consulta, Imprimir |

> **⚠️** (\*) Desaplicar solo si no tiene restricciones.
> **⚠️** (\*\*) Postear manual si no se posteó automáticamente al aplicar.

---

## Documentos Asociados

Los documentos de pago vinculados a la FAC (Transacciones, Notas Débito/Crédito) se muestran en la pestaña **Documentos** del detalle. Cada fila es clickeable para navegar al documento correspondiente.

---

## Guía paso a paso

Al crear o editar una FAC en estado borrador, una **guía interactiva** muestra los pasos a seguir:

| Paso | Campo | Descripción |
|:---|:---|---|
| 1 | **Tipo de Documento** | Elige el tipo que define el comportamiento fiscal. |
| 2 | **Concepto** | Elige el concepto que define el comportamiento contable. |
| 3 | **Cliente** | Selecciona el cliente. El RNC se muestra automáticamente. |
| 4 | **Productos** | Agrega productos a la factura. |

---

## Reportes

El sistema genera un **reporte PDF** de la FAC.

### Sello de estado

| Estado | Sello visible |
|:---|---|
| **Borrador** | "BORRADOR" |
| **Aplicado** | Sin sello |
| **Anulado** | "ANULADO" |

---

## API Endpoints (para referencia técnica)

### Documento (CRUD + acciones)

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/FAC/{sucursal}` | Crear |
| `PUT` | `/FAC/{sucursal}` | Actualizar |
| `PUT` | `/FAC/{sucursal}/aplicar/{id}` | Aplicar |
| `PUT` | `/FAC/desaplicar` | Desaplicar |
| `POST` | `/FAC/{sucursal}/anular` | Anular |
| `POST` | `/FAC/{sucursal}/{id}/Reversar` | Reversar |
| `POST` | `/FAC/{sucursal}/{id}/Revisado` | Marcar revisado |

### Posteo contable

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/FAC/{sucursal}/postear` | Postear asientos |

### DGII

| Método | Ruta | Acción |
|:---|---:|---|
| `PUT` | `/EnvioDGII/{sucursal}/MarcarEnviado` | Marcar como enviado a DGII |
| `GET` | `/EnvioDGII/{sucursal}/{id}` | Obtener estado DGII |
| `PUT` | `/Transaccion/{sucursal}/reasignarNCF/{id}` | Reasignar NCF |

### Consultas

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/FAC/{sucursal}/{id}` | Obtener por ID |
| `GET` | `/FAC/{sucursal}` | Listado resumido |
| `GET` | `/FAC/{sucursal}/filtrar` | Listado con filtros |

### Scanner

| Método | Ruta | Acción |
|:---|---:|---|
| `GET` | `/FAC/{sucursal}/{id}/scanner/verificar` | Verificar PDF |
| `GET` | `/FAC/{sucursal}/{id}/scanner/descargar` | Descargar PDF |

### Reportes

| Método | Ruta | Acción |
|:---|---:|---|
| `POST` | `/reportes/contabilidad/factura-cliente` | Generar reporte PDF |

---

## Navegación

← Anterior: [Factura Suplidor](factura-suplidor) | Siguiente: [Nota de Débito](note-debito)
