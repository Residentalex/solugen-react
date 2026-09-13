"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZONAS_DEFAULT_VSNT_CIERRE = exports.ZONAS_DEFAULT_VSNT_ANULACION = exports.ZONAS_DEFAULT_VSNT = exports.ZONAS_DEFAULT_FRI = exports.ZONAS_DEFAULT_FPV = exports.CAMPOS_DTO_DISPONIBLES = exports.PLANTILLA_CONFIG_DEFAULT_VSNT_CIERRE = exports.PLANTILLA_CONFIG_DEFAULT_VSNT_ANULACION = exports.PLANTILLA_CONFIG_DEFAULT_VSNT = exports.PLANTILLA_CONFIG_DEFAULT_RI = exports.PLANTILLA_CONFIG_DEFAULT = exports.ANCHO_LINEA_OPCIONES = exports.CAMPOS_DETALLE_RI_LABELS = exports.CAMPOS_DETALLE_LABELS = exports.CAMPOS_TICKET_LABELS_VSNT = exports.CAMPOS_TICKET_LABELS_RI = exports.CAMPOS_TICKET_ORDEN_RI = exports.CAMPOS_TICKET_ORDEN = exports.CAMPOS_TICKET_LABELS = void 0;
exports.normalizarTextosLibres = normalizarTextosLibres;
exports.normalizarConfig = normalizarConfig;
exports.normalizarConfigRI = normalizarConfigRI;
exports.normalizarConfigVSNT = normalizarConfigVSNT;
exports.normalizarConfigVSNT_ANULACION = normalizarConfigVSNT_ANULACION;
exports.normalizarConfigVSNT_CIERRE = normalizarConfigVSNT_CIERRE;
exports.migrarConfigAZonas = migrarConfigAZonas;
/** Labels fijos de los campos del documento (Factura POS). */
exports.CAMPOS_TICKET_LABELS = {
    NCF: 'NCF',
    TIPO_COMP: 'TIPO COMP',
    CAJERO: 'CAJERO',
    CAJA: 'CAJA',
    TURNO: 'TURNO',
    FECHA: 'FECHA',
    HORA: 'HORA',
    NO: 'NO',
    CLIENTE: 'CLIENTE',
    RNC_CLIENTE: 'RNC CLIENTE',
    FECHA_IMPRESION: 'FECHA IMP.',
    HORA_IMPRESION: 'HORA IMP.',
    NUM_DETALLES: 'ARTÍCULOS',
    FECHA_VENCIMIENTO_NCF: 'Vence',
    SECUENCIA_NCF: 'Secuencia NCF',
    CODIGO_SEGURIDAD: 'Código de Seguridad',
    FECHA_FIRMA_DIGITAL: 'Fecha Firma Digital',
    CODIGO_QR: 'Código QR',
    FAX: 'Fax',
    SLOGAN: 'Slogan',
};
/** Orden por defecto de los campos del documento (Factura POS). */
exports.CAMPOS_TICKET_ORDEN = [
    'NCF', 'TIPO_COMP', 'CAJERO', 'CAJA', 'TURNO',
    'FECHA', 'HORA', 'NO', 'CLIENTE', 'RNC_CLIENTE',
];
exports.CAMPOS_TICKET_ORDEN_RI = [
    'NCF', 'FECHA', 'TIPO', 'CONCEPTO', 'ENTIDAD', 'ENTIDAD_ID', 'NOTA',
];
/** Labels originales de los campos del documento (Recibo Ingreso). */
exports.CAMPOS_TICKET_LABELS_RI = {
    NCF: 'NCF',
    FECHA: 'FECHA',
    TIPO: 'Tipo',
    CONCEPTO: 'Concepto',
    ENTIDAD: 'ENTIDAD',
    ENTIDAD_ID: 'ENTIDAD ID',
    NOTA: 'Nota',
    FECHA_IMPRESION: 'FECHA IMP.',
    HORA_IMPRESION: 'HORA IMP.',
    NUM_DETALLES: 'TRANSACC.',
};
/** Labels de los campos del voucher Visanet. */
exports.CAMPOS_TICKET_LABELS_VSNT = {
    COMPANIA: 'Compañía',
    SUCURSAL: 'Sucursal',
    DIRECCION: 'Dirección',
    TELEFONO: 'Teléfono',
    RNC: 'RNC',
    FAX: 'Fax',
    SLOGAN: 'Slogan',
    ID_COMERCIO: 'ID COMERCIO',
    TIPO_OP: 'TIPO OP',
    FECHA: 'FECHA',
    ISSUER: 'BANCO',
    TRANS: 'TRANS #',
    AUTORIZACION: 'AUTORIZACION #',
    TOTAL: 'TOTAL',
    RESULTADO: 'RESULTADO',
    FECHA_IMPRESION: 'FECHA IMP.',
    HORA_IMPRESION: 'HORA IMP.',
};
/** Labels para campos de detalle (Factura POS). */
exports.CAMPOS_DETALLE_LABELS = {
    CODIGO: 'Código',
    ARTICULO: 'Artículo',
    CANTIDAD: 'Cantidad',
    PRECIO: 'Precio',
    ITBIS: 'ITBIS',
    TOTAL: 'Total',
};
/** Labels para campos de detalle (Recibo Ingreso). */
exports.CAMPOS_DETALLE_RI_LABELS = {
    DOCUMENTO: 'Documento',
    MONTO_ORIG: 'Monto Orig',
    PAGADO: 'Pagado',
    APLICADO: 'Aplicado',
};
/** Anchos de linea soportados. */
exports.ANCHO_LINEA_OPCIONES = [32, 42, 48];
exports.PLANTILLA_CONFIG_DEFAULT = {
    encabezado: {
        mostrarCompania: true,
        mostrarDireccion: true,
        mostrarTelefono: true,
        mostrarRnc: true,
    },
    campos: {
        orden: exports.CAMPOS_TICKET_ORDEN,
        visibles: Object.fromEntries(exports.CAMPOS_TICKET_ORDEN.map((c) => [c, true])),
    },
    detalle: {
        columnas: {
            codigo: true,
            cantidad: true,
            precio: true,
            itbis: true,
            total: true,
        },
    },
    totales: {
        mostrarGravado: true,
        mostrarSubtotal: true,
        mostrarItbis: true,
        mostrarDescuento: true,
    },
    cobros: {
        mostrarCobros: true,
    },
    pie: {
        textoPie: '** GRACIAS POR SU COMPRA **',
    },
    opciones: {
        anchoLinea: 48,
        feedCorte: 4,
    },
};
/**
 * Default de Recibo Ingreso. Comparte encabezado/detalle/totales/cobros con el
 * default FPV, pero el orden de campos usa las claves propias del RI y conserva
 * el pie original del recibo ("Gracias por su preferencia!") para regresion cero.
 */
exports.PLANTILLA_CONFIG_DEFAULT_RI = {
    ...exports.PLANTILLA_CONFIG_DEFAULT,
    campos: {
        orden: exports.CAMPOS_TICKET_ORDEN_RI,
        visibles: Object.fromEntries(exports.CAMPOS_TICKET_ORDEN_RI.map((c) => [c, true])),
    },
    pie: {
        textoPie: 'Gracias por su preferencia!',
    },
};
/**
 * Default de Voucher Visanet. Reproduce el formato hardcodeado de
 * `generarTicketVoucher` (ancho 42, separador de 42 guiones, compania centrada
 * en doble, resultado APROBADA/RECHAZADA). El pie queda vacio (el voucher no
 * imprime pie) y el feed de corte es 3 (equivalente al corte con feed del
 * hardcodeado `\x1D\x56\x41\x03`).
 */
exports.PLANTILLA_CONFIG_DEFAULT_VSNT = {
    encabezado: {
        mostrarCompania: true,
        mostrarDireccion: true,
        mostrarTelefono: true,
        mostrarRnc: true,
    },
    campos: {
        orden: ['ID_COMERCIO', 'TIPO_OP', 'FECHA', 'ISSUER', 'TRANS', 'AUTORIZACION', 'TOTAL', 'RESULTADO'],
        visibles: Object.fromEntries(['ID_COMERCIO', 'TIPO_OP', 'FECHA', 'ISSUER', 'TRANS', 'AUTORIZACION', 'TOTAL', 'RESULTADO'].map((c) => [c, true])),
    },
    pie: {
        textoPie: '',
    },
    opciones: {
        anchoLinea: 42,
        feedCorte: 3,
    },
};
/**
 * Default de Voucher Visanet - Anulacion.
 * Similar al voucher de venta, pero RESULTADO muestra ANULADO.
 */
exports.PLANTILLA_CONFIG_DEFAULT_VSNT_ANULACION = {
    ...exports.PLANTILLA_CONFIG_DEFAULT_VSNT,
    pie: { textoPie: '' },
    opciones: { anchoLinea: 42, feedCorte: 3 },
};
/**
 * Default de Voucher Visanet - Cierre de Lote.
 * Diferente estructura: titulo de cierre, datos de lote, resultado.
 */
exports.PLANTILLA_CONFIG_DEFAULT_VSNT_CIERRE = {
    encabezado: {
        mostrarCompania: true,
        mostrarDireccion: true,
        mostrarTelefono: true,
        mostrarRnc: true,
    },
    pie: { textoPie: '' },
    opciones: { anchoLinea: 42, feedCorte: 3 },
    textosLibres: {
        cierre_titulo: { texto: 'CIERRE DE LOTE', alineacion: 'centro', negrita: true, tamano: 'doble' },
    },
};
/**
 * Normaliza los textos libres guardados.
 * Acepta configs antiguas donde cada id guardaba un string plano y las convierte
 * a la forma actual `{ texto, alineacion, negrita, tamano }`.
 * Para configs legacy se conserva el comportamiento historico del formateador:
 * centrado + negrita + tamaño normal (regresion cero).
 */
function normalizarTextosLibres(textos) {
    if (!textos)
        return undefined;
    const out = {};
    for (const [id, valor] of Object.entries(textos)) {
        if (typeof valor === 'string') {
            out[id] = { texto: valor, alineacion: 'centro', negrita: true, tamano: 'normal' };
        }
        else {
            out[id] = { ...valor };
        }
    }
    return out;
}
/** Merge profundo parcial: completa `config` con los valores por defecto de `base`. */
function mergeConfig(base, config) {
    const out = { ...base };
    out.encabezado = { ...(base.encabezado || {}), ...(config.encabezado || {}) };
    out.encabezado.formato = {
        ...(base.encabezado?.formato || {}),
        ...(config.encabezado?.formato || {}),
    };
    out.titulo = { ...(base.titulo || {}), ...(config.titulo || {}) };
    out.titulo.formato = {
        ...(base.titulo?.formato || {}),
        ...(config.titulo?.formato || {}),
    };
    out.campos = { ...(base.campos || {}), ...(config.campos || {}) };
    if (config.campos?.orden)
        out.campos.orden = [...config.campos.orden];
    if (config.campos?.visibles)
        out.campos.visibles = { ...config.campos.visibles };
    if (config.campos?.labels)
        out.campos.labels = { ...config.campos.labels };
    if (config.campos?.formatos)
        out.campos.formatos = { ...config.campos.formatos };
    if (config.campos?.textosLibres) {
        out.campos.textosLibres = normalizarTextosLibres(config.campos.textosLibres);
    }
    if (config.campos?.camposDTO) {
        out.campos.camposDTO = Object.fromEntries(Object.entries(config.campos.camposDTO).map(([id, def]) => [id, { ...def }]));
    }
    if (config.campos?.tabular)
        out.campos.tabular = { ...config.campos.tabular };
    out.detalle = { ...(base.detalle || {}), ...(config.detalle || {}) };
    out.detalle.columnas = { ...(base.detalle?.columnas || {}), ...(config.detalle?.columnas || {}) };
    out.detalle.formato = {
        ...(base.detalle?.formato || {}),
        ...(config.detalle?.formato || {}),
    };
    out.totales = { ...(base.totales || {}), ...(config.totales || {}) };
    out.totales.formato = {
        ...(base.totales?.formato || {}),
        ...(config.totales?.formato || {}),
    };
    out.cobros = { ...(base.cobros || {}), ...(config.cobros || {}) };
    out.cobros.formato = {
        ...(base.cobros?.formato || {}),
        ...(config.cobros?.formato || {}),
    };
    out.pie = { ...(base.pie || {}), ...(config.pie || {}) };
    out.opciones = { ...(base.opciones || {}), ...(config.opciones || {}) };
    if (config.firmas)
        out.firmas = { ...config.firmas };
    if (config.logo)
        out.logo = { ...config.logo };
    return out;
}
/** Indica si un item del orden es un marcador especial (o clave estandar de RI). */
function esItemOrdenRI(item) {
    return (exports.CAMPOS_TICKET_ORDEN_RI.includes(item)
        || item === 'ESPACIO'
        || item === 'SEPARADOR'
        || item.startsWith('LIBRE:')
        || item.startsWith('DTO:'));
}
/**
 * Normaliza una config guardada (puede venir parcial o null) contra el default FPV.
 * Si `config` es null/undefined, devuelve el default completo FPV.
 */
function normalizarConfig(config) {
    if (!config)
        return { ...exports.PLANTILLA_CONFIG_DEFAULT, zonas: [...exports.ZONAS_DEFAULT_FPV] };
    const out = mergeConfig(exports.PLANTILLA_CONFIG_DEFAULT, config);
    // columnasDetalle en raiz como alias de detalle.columnas
    if (config.columnasDetalle && !config.detalle?.columnas) {
        out.detalle = { ...(out.detalle || {}), columnas: { ...config.columnasDetalle } };
    }
    // Manejo de zonas
    if (config.zonas === null) {
        // null explicito → usar defaults
        out.zonas = [...exports.ZONAS_DEFAULT_FPV];
    }
    else if (config.zonas && config.zonas.length > 0) {
        // Tiene zonas → usar tal cual
        out.zonas = config.zonas;
        // Preservar textos libres y campos DTO del config guardado
        if (config.textosLibres)
            out.textosLibres = { ...config.textosLibres };
        if (config.camposDTO)
            out.camposDTO = { ...config.camposDTO };
        if (config.firmas)
            out.firmas = { ...config.firmas };
        if (config.logo)
            out.logo = { ...config.logo };
    }
    else {
        // Sin zonas → migrar de config vieja
        out.zonas = migrarConfigAZonas(config, 'FPV');
        if (config.campos?.textosLibres) {
            out.textosLibres = normalizarTextosLibres(config.campos.textosLibres);
        }
        if (config.campos?.camposDTO) {
            out.camposDTO = { ...config.campos.camposDTO };
        }
        if (config.firmas)
            out.firmas = { ...config.firmas };
        if (config.logo)
            out.logo = { ...config.logo };
    }
    return out;
}
/**
 * Normaliza una config guardada contra el default de Recibo Ingreso.
 * Si la config guardada trae un `orden` que no contiene claves de RI ni marcadores
 * especiales (ej. configs guardadas con el editor antiguo que usaba claves FPV),
 * se reemplaza por el orden default de RI para mantener la regresion cero.
 */
function normalizarConfigRI(config) {
    if (!config)
        return { ...exports.PLANTILLA_CONFIG_DEFAULT_RI, zonas: [...exports.ZONAS_DEFAULT_FRI] };
    const out = mergeConfig(exports.PLANTILLA_CONFIG_DEFAULT_RI, config);
    const orden = out.campos?.orden || [];
    if (orden.length > 0 && !orden.some((k) => esItemOrdenRI(k))) {
        out.campos = { ...(out.campos || {}), orden: [...exports.CAMPOS_TICKET_ORDEN_RI] };
    }
    // columnasDetalle en raiz como alias de detalle.columnas
    if (config.columnasDetalle && !config.detalle?.columnas) {
        out.detalle = { ...(out.detalle || {}), columnas: { ...config.columnasDetalle } };
    }
    // Manejo de zonas
    if (config.zonas === null) {
        out.zonas = [...exports.ZONAS_DEFAULT_FRI];
    }
    else if (config.zonas && config.zonas.length > 0) {
        out.zonas = config.zonas;
        // Preservar textos libres y campos DTO del config guardado
        if (config.textosLibres)
            out.textosLibres = { ...config.textosLibres };
        if (config.camposDTO)
            out.camposDTO = { ...config.camposDTO };
        if (config.firmas)
            out.firmas = { ...config.firmas };
        if (config.logo)
            out.logo = { ...config.logo };
    }
    else {
        out.zonas = migrarConfigAZonas(config, 'FRI');
        if (config.campos?.textosLibres) {
            out.textosLibres = normalizarTextosLibres(config.campos.textosLibres);
        }
        if (config.campos?.camposDTO) {
            out.camposDTO = { ...config.campos.camposDTO };
        }
        if (config.firmas)
            out.firmas = { ...config.firmas };
        if (config.logo)
            out.logo = { ...config.logo };
    }
    return out;
}
/**
 * Normaliza una config guardada contra el default de Voucher Visanet.
 * Si `config` es null/undefined, devuelve el default completo VSNT.
 */
function normalizarConfigVSNT(config) {
    if (!config)
        return { ...exports.PLANTILLA_CONFIG_DEFAULT_VSNT, zonas: [...exports.ZONAS_DEFAULT_VSNT] };
    const out = mergeConfig(exports.PLANTILLA_CONFIG_DEFAULT_VSNT, config);
    return finalizarNormalizacionVSNT(out, config, exports.ZONAS_DEFAULT_VSNT);
}
/**
 * Normaliza una config guardada contra el default de Voucher Visanet - Anulacion.
 */
function normalizarConfigVSNT_ANULACION(config) {
    if (!config)
        return { ...exports.PLANTILLA_CONFIG_DEFAULT_VSNT_ANULACION, zonas: [...exports.ZONAS_DEFAULT_VSNT_ANULACION] };
    const out = mergeConfig(exports.PLANTILLA_CONFIG_DEFAULT_VSNT_ANULACION, config);
    return finalizarNormalizacionVSNT(out, config, exports.ZONAS_DEFAULT_VSNT_ANULACION);
}
/**
 * Normaliza una config guardada contra el default de Voucher Visanet - Cierre.
 */
function normalizarConfigVSNT_CIERRE(config) {
    if (!config)
        return { ...exports.PLANTILLA_CONFIG_DEFAULT_VSNT_CIERRE, zonas: [...exports.ZONAS_DEFAULT_VSNT_CIERRE] };
    const out = mergeConfig(exports.PLANTILLA_CONFIG_DEFAULT_VSNT_CIERRE, config);
    return finalizarNormalizacionVSNT(out, config, exports.ZONAS_DEFAULT_VSNT_CIERRE);
}
/** Helper comun a todos los normalizadores VSNT (zonas + textos + DTO + firmas + logo). */
function finalizarNormalizacionVSNT(out, config, zonasDefault) {
    if (config.columnasDetalle && !config.detalle?.columnas) {
        out.detalle = { ...(out.detalle || {}), columnas: { ...config.columnasDetalle } };
    }
    if (config.zonas === null) {
        out.zonas = [...zonasDefault];
    }
    else if (config.zonas && config.zonas.length > 0) {
        out.zonas = config.zonas;
        if (config.textosLibres)
            out.textosLibres = { ...config.textosLibres };
        if (config.camposDTO)
            out.camposDTO = { ...config.camposDTO };
        if (config.firmas)
            out.firmas = { ...config.firmas };
        if (config.logo)
            out.logo = { ...config.logo };
    }
    else {
        out.zonas = migrarConfigAZonas(config, 'VSNT');
        if (config.campos?.textosLibres) {
            out.textosLibres = normalizarTextosLibres(config.campos.textosLibres);
        }
        if (config.campos?.camposDTO) {
            out.camposDTO = { ...config.campos.camposDTO };
        }
        if (config.firmas)
            out.firmas = { ...config.firmas };
        if (config.logo)
            out.logo = { ...config.logo };
    }
    return out;
}
/**
 * Catalogo de campos reales de FacturaPOSDTO y ReciboIngresoFullDTO.
 * Las rutas existen en los tipos; se evita duplicar campos que ya muestran
 * los campos estandar del ticket (NCF, CAJERO, CAJA, TURNO, CLIENTE, RNC_CLIENTE, ...).
 */
exports.CAMPOS_DTO_DISPONIBLES = {
    FPV: [
        { id: 'cliente_telefono', label: 'Teléfono cliente', ruta: 'cliente.telefono', tipo: 'texto' },
        { id: 'cliente_direccion', label: 'Dirección cliente', ruta: 'cliente.direccion', tipo: 'texto' },
        { id: 'secuenciaNCF_nombre', label: 'Secuencia NCF', ruta: 'secuenciaNCF.nombre', tipo: 'texto' },
        { id: 'secuenciaNCF_tipoComprobante', label: 'Tipo comprobante secuencia', ruta: 'secuenciaNCF.tipoComprobante', tipo: 'texto' },
        { id: 'concepto_nombre', label: 'Concepto', ruta: 'concepto.nombre', tipo: 'texto' },
        { id: 'almacen_nombre', label: 'Almacén', ruta: 'almacen.nombre', tipo: 'texto' },
        { id: 'moneda_nombre', label: 'Moneda', ruta: 'moneda.nombre', tipo: 'texto' },
        { id: 'sucursal_telefono', label: 'Teléfono sucursal', ruta: 'sucursal.telefono', tipo: 'texto' },
        { id: 'sucursal_direccion', label: 'Dirección sucursal', ruta: 'sucursal.direccion', tipo: 'texto' },
        { id: 'referencia', label: 'Referencia', ruta: 'referencia', tipo: 'texto' },
        { id: 'nota', label: 'Nota', ruta: 'nota', tipo: 'texto' },
        { id: 'tasa', label: 'Tasa', ruta: 'tasa', tipo: 'numero' },
        { id: 'diasCredito', label: 'Días crédito', ruta: 'diasCredito', tipo: 'numero' },
        { id: 'ncfModificado', label: 'NCF modificado', ruta: 'ncfModificado', tipo: 'texto' },
        { id: 'retenciones', label: 'Retenciones', ruta: 'retenciones', tipo: 'dinero' },
        { id: 'estado', label: 'Estado', ruta: 'estado', tipo: 'numero' },
    ],
    FRI: [
        { id: 'concepto_nombre', label: 'Concepto', ruta: 'concepto.nombre', tipo: 'texto' },
        { id: 'entidad_telefono', label: 'Teléfono entidad', ruta: 'entidad.telefono', tipo: 'texto' },
        { id: 'entidad_direccion', label: 'Dirección entidad', ruta: 'entidad.direccion', tipo: 'texto' },
        { id: 'moneda_nombre', label: 'Moneda', ruta: 'moneda.nombre', tipo: 'texto' },
        { id: 'sucursal_nombre', label: 'Sucursal', ruta: 'sucursal.nombre', tipo: 'texto' },
        { id: 'noDocumento', label: 'No. documento', ruta: 'noDocumento', tipo: 'texto' },
        { id: 'referencia', label: 'Referencia', ruta: 'referencia', tipo: 'texto' },
        { id: 'tasa', label: 'Tasa', ruta: 'tasa', tipo: 'numero' },
        { id: 'subTotal', label: 'Subtotal', ruta: 'subTotal', tipo: 'dinero' },
        { id: 'descuento', label: 'Descuento', ruta: 'descuento', tipo: 'dinero' },
        { id: 'impuestos', label: 'Impuestos', ruta: 'impuestos', tipo: 'dinero' },
        { id: 'retenciones', label: 'Retenciones', ruta: 'retenciones', tipo: 'dinero' },
        { id: 'estado', label: 'Estado', ruta: 'estado', tipo: 'numero' },
        { id: 'periodo', label: 'Periodo', ruta: 'periodo', tipo: 'numero' },
        { id: 'diasCredito', label: 'Días crédito', ruta: 'diasCredito', tipo: 'numero' },
    ],
    VSNT: [
        { id: 'merchantId', label: 'ID comercio', ruta: 'merchantId', tipo: 'texto' },
        { id: 'transactionDate', label: 'Fecha transaccion', ruta: 'transactionDate', tipo: 'fecha' },
        { id: 'issuerName', label: 'Banco emisor', ruta: 'issuerName', tipo: 'texto' },
        { id: 'tokenECR', label: 'Trans #', ruta: 'tokenECR', tipo: 'texto' },
        { id: 'autorizacion', label: 'Autorizacion', ruta: 'autorizacion', tipo: 'texto' },
        { id: 'totalAmount', label: 'Total', ruta: 'totalAmount', tipo: 'dinero' },
        { id: 'panMasked', label: 'PAN', ruta: 'panMasked', tipo: 'texto' },
        { id: 'cardHolderName', label: 'Tarjetahabiente', ruta: 'cardHolderName', tipo: 'texto' },
        { id: 'rrn', label: 'RRN', ruta: 'rrn', tipo: 'texto' },
        { id: 'batchNumber', label: 'Lote', ruta: 'batchNumber', tipo: 'texto' },
        { id: 'terminalId', label: 'Terminal', ruta: 'terminalId', tipo: 'texto' },
        { id: 'processingHost', label: 'Host', ruta: 'processingHost', tipo: 'texto' },
        { id: 'stan', label: 'STAN', ruta: 'stan', tipo: 'texto' },
        { id: 'entryMode', label: 'Entry mode', ruta: 'entryMode', tipo: 'texto' },
        { id: 'exchangeRate', label: 'Tasa', ruta: 'exchangeRate', tipo: 'numero' },
        { id: 'transactionCurrency', label: 'Moneda', ruta: 'transactionCurrency', tipo: 'texto' },
    ],
};
// ===== Zonas por defecto (fuente de verdad futura para el formateador) =====
/**
 * Zonas por defecto para Factura POS.
 * Reproduce el orden de emision de `formatTicketPOS` actual (regresion cero).
 */
exports.ZONAS_DEFAULT_FPV = [
    {
        id: 'zona_fpv_encabezado',
        tipo: 'encabezado_reporte',
        lineas: [
            { ref: 'CAMPO:COMPANIA' },
            { ref: 'CAMPO:DIRECCION' },
            { ref: 'CAMPO:TELEFONO' },
            { ref: 'CAMPO:RNC' },
            { ref: 'SEPARADOR', caracter: '=', formato: { negrita: true } },
        ],
    },
    {
        id: 'zona_fpv_campos_titulo',
        tipo: 'encabezado_reporte',
        lineas: [
            { ref: 'CAMPO:NCF' },
            { ref: 'CAMPO:TIPO_COMP' },
            { ref: 'CAMPO:CAJERO' },
            { ref: 'CAMPO:CAJA' },
            { ref: 'CAMPO:TURNO' },
            { ref: 'CAMPO:FECHA' },
            { ref: 'CAMPO:HORA' },
            { ref: 'CAMPO:NO' },
            { ref: 'CAMPO:CLIENTE' },
            { ref: 'CAMPO:RNC_CLIENTE' },
            { ref: 'SEPARADOR', caracter: '─' },
            { ref: 'CAMPO:TITULO' },
            { ref: 'SEPARADOR', caracter: '=', formato: { negrita: true } },
        ],
    },
    {
        id: 'zona_fpv_cabecera_detalle',
        tipo: 'cabecera_grupo_detalle',
        // Cabecera de columnas del detalle (se emiten en negrita como titulos)
        lineas: [
            { ref: 'DETALLE:CODIGO', label: 'COD', formato: { negrita: true, alineacion: 'izquierda' } },
            { ref: 'DETALLE:ARTICULO', label: 'ARTICULO', formato: { negrita: true, alineacion: 'izquierda' } },
            { ref: 'DETALLE:CANTIDAD', label: 'CANT', formato: { negrita: true, alineacion: 'derecha' } },
            { ref: 'DETALLE:PRECIO', label: 'PRECIO', formato: { negrita: true, alineacion: 'derecha' } },
            { ref: 'DETALLE:TOTAL', label: 'TOTAL', formato: { negrita: true, alineacion: 'derecha' } },
        ],
    },
    {
        id: 'zona_fpv_detalle',
        tipo: 'detalle',
        // Filas de datos del detalle (sin label para que ocupen el ancho de columna)
        lineas: [
            { ref: 'DETALLE:CODIGO', mostrarLabel: false, formato: { alineacion: 'izquierda' } },
            { ref: 'DETALLE:ARTICULO', mostrarLabel: false, formato: { alineacion: 'izquierda' } },
            { ref: 'DETALLE:CANTIDAD', mostrarLabel: false, formato: { alineacion: 'derecha' } },
            { ref: 'DETALLE:PRECIO', mostrarLabel: false, formato: { alineacion: 'derecha' } },
            { ref: 'DETALLE:TOTAL', mostrarLabel: false, formato: { alineacion: 'derecha' } },
        ],
    },
    {
        id: 'zona_fpv_totales',
        tipo: 'totales',
        lineas: [
            { ref: 'SEPARADOR', caracter: '-' },
            { ref: 'TOTAL:TOTAL_GRAVADO' },
            { ref: 'TOTAL:SUBTOTAL' },
            { ref: 'TOTAL:ITBIS' },
            { ref: 'TOTAL:DESCUENTO' },
            { ref: 'SEPARADOR', caracter: '─' },
            { ref: 'TOTAL:TOTAL', formato: { negrita: true } },
            { ref: 'SEPARADOR', caracter: '-' },
        ],
    },
    {
        id: 'zona_fpv_cobros',
        tipo: 'cobros',
        lineas: [],
    },
    {
        id: 'zona_fpv_pie',
        tipo: 'pie_reporte',
        lineas: [
            { ref: 'CAMPO:TITULO', label: '** GRACIAS POR SU COMPRA **' },
        ],
    },
];
/**
 * Zonas por defecto para Recibo Ingreso.
 * Reproduce el orden de emision de `formatTicketReciboIngreso` actual (regresion cero).
 * Diferencias vs FPV: TITULO al inicio, espaciados fijos en campos, pie distinto,
 * transacciones en detalle en lugar de articulos.
 */
exports.ZONAS_DEFAULT_FRI = [
    {
        id: 'zona_fri_encabezado',
        tipo: 'encabezado_reporte',
        lineas: [
            { ref: 'CAMPO:COMPANIA' },
            { ref: 'CAMPO:DIRECCION' },
            { ref: 'CAMPO:TELEFONO' },
            { ref: 'CAMPO:RNC' },
            { ref: 'SEPARADOR', caracter: '=', formato: { negrita: true } },
        ],
    },
    {
        id: 'zona_fri_titulo',
        tipo: 'encabezado_reporte',
        lineas: [
            { ref: 'CAMPO:TITULO' },
            { ref: 'SEPARADOR', caracter: '=', formato: { negrita: true } },
        ],
    },
    {
        id: 'zona_fri_campos',
        tipo: 'encabezado_reporte',
        lineas: [
            { ref: 'CAMPO:NCF' },
            { ref: 'CAMPO:FECHA' },
            { ref: 'CAMPO:TIPO' },
            { ref: 'CAMPO:CONCEPTO' },
            { ref: 'CAMPO:ENTIDAD' },
            { ref: 'CAMPO:ENTIDAD_ID' },
            { ref: 'CAMPO:NOTA' },
        ],
    },
    {
        id: 'zona_fri_cabecera_detalle',
        tipo: 'cabecera_grupo_detalle',
        // Cabecera de columnas del detalle (FRI: documentos asociados)
        lineas: [
            { ref: 'DETALLE:DOCUMENTO', label: 'DOCUMENTO', formato: { negrita: true, alineacion: 'izquierda' } },
            { ref: 'DETALLE:MONTO_ORIG', label: 'M. ORIG', formato: { negrita: true, alineacion: 'derecha' } },
            { ref: 'DETALLE:PAGADO', label: 'PAGADO', formato: { negrita: true, alineacion: 'derecha' } },
            { ref: 'DETALLE:APLICADO', label: 'APLICADO', formato: { negrita: true, alineacion: 'derecha' } },
        ],
    },
    {
        id: 'zona_fri_detalle',
        tipo: 'detalle',
        // Filas de datos del detalle FRI (sin label)
        lineas: [
            { ref: 'DETALLE:DOCUMENTO', mostrarLabel: false, formato: { alineacion: 'izquierda' } },
            { ref: 'DETALLE:MONTO_ORIG', mostrarLabel: false, formato: { alineacion: 'derecha' } },
            { ref: 'DETALLE:PAGADO', mostrarLabel: false, formato: { alineacion: 'derecha' } },
            { ref: 'DETALLE:APLICADO', mostrarLabel: false, formato: { alineacion: 'derecha' } },
        ],
    },
    {
        id: 'zona_fri_totales',
        tipo: 'totales',
        lineas: [
            { ref: 'SEPARADOR', caracter: '-' },
        ],
    },
    {
        id: 'zona_fri_cobros',
        tipo: 'cobros',
        lineas: [],
    },
    {
        id: 'zona_fri_pie',
        tipo: 'pie_reporte',
        lineas: [
            { ref: 'CAMPO:TITULO', label: 'Gracias por su preferencia!' },
        ],
    },
];
/**
 * Zonas por defecto para Voucher Visanet.
 * Reproduce el orden de emision de `generarTicketVoucher` actual (regresion cero):
 * compania centrada en doble + sucursal, comercio (ID + tipo op en negrita),
 * detalle (FECHA/ISSUER/TRANS/AUTORIZACION), total centrado en doble y resultado.
 */
exports.ZONAS_DEFAULT_VSNT = [
    {
        id: 'zona_vsnt_encabezado',
        tipo: 'encabezado_reporte',
        alineacion: 'centro',
        lineas: [
            { ref: 'CAMPO:COMPANIA', formato: { alineacion: 'centro', tamano: 'doble' } },
            { ref: 'CAMPO:DIRECCION' },
            { ref: 'CAMPO:TELEFONO' },
            { ref: 'CAMPO:RNC' },
            { ref: 'CAMPO:SUCURSAL' },
        ],
    },
    {
        id: 'zona_vsnt_comercio',
        tipo: 'encabezado_reporte',
        alineacion: 'centro',
        lineas: [
            { ref: 'CAMPO:ID_COMERCIO' },
            { ref: 'CAMPO:TIPO_OP', formato: { negrita: true } },
            { ref: 'SEPARADOR', caracter: '-' },
        ],
    },
    {
        id: 'zona_vsnt_detalle',
        tipo: 'encabezado_reporte',
        alineacion: 'izquierda',
        lineas: [
            { ref: 'CAMPO:FECHA' },
            { ref: 'CAMPO:ISSUER' },
            { ref: 'CAMPO:TRANS' },
            { ref: 'CAMPO:AUTORIZACION' },
            { ref: 'SEPARADOR', caracter: '-' },
        ],
    },
    {
        id: 'zona_vsnt_total',
        tipo: 'encabezado_reporte',
        alineacion: 'centro',
        lineas: [
            { ref: 'CAMPO:TOTAL', formato: { alineacion: 'centro', tamano: 'doble' } },
        ],
    },
    {
        id: 'zona_vsnt_resultado',
        tipo: 'encabezado_reporte',
        alineacion: 'centro',
        lineas: [
            { ref: 'ESPACIO' },
            { ref: 'CAMPO:RESULTADO' },
        ],
    },
];
/**
 * Zonas por defecto para Voucher Visanet - Anulacion.
 * Identico al voucher de venta, pero el resultado es ANULADO.
 */
exports.ZONAS_DEFAULT_VSNT_ANULACION = [
    {
        id: 'zona_vsnta_encabezado',
        tipo: 'encabezado_reporte',
        alineacion: 'centro',
        lineas: [
            { ref: 'CAMPO:COMPANIA', formato: { alineacion: 'centro', tamano: 'doble' } },
            { ref: 'CAMPO:DIRECCION' },
            { ref: 'CAMPO:TELEFONO' },
            { ref: 'CAMPO:RNC' },
            { ref: 'CAMPO:SUCURSAL' },
        ],
    },
    {
        id: 'zona_vsnta_comercio',
        tipo: 'encabezado_reporte',
        alineacion: 'centro',
        lineas: [
            { ref: 'CAMPO:ID_COMERCIO' },
            { ref: 'CAMPO:TIPO_OP', formato: { negrita: true } },
            { ref: 'SEPARADOR', caracter: '-' },
        ],
    },
    {
        id: 'zona_vsnta_detalle',
        tipo: 'encabezado_reporte',
        alineacion: 'izquierda',
        lineas: [
            { ref: 'CAMPO:FECHA' },
            { ref: 'CAMPO:ISSUER' },
            { ref: 'CAMPO:TRANS' },
            { ref: 'CAMPO:AUTORIZACION' },
            { ref: 'SEPARADOR', caracter: '-' },
        ],
    },
    {
        id: 'zona_vsnta_total',
        tipo: 'encabezado_reporte',
        alineacion: 'centro',
        lineas: [
            { ref: 'CAMPO:TOTAL', formato: { alineacion: 'centro', tamano: 'doble' } },
        ],
    },
    {
        id: 'zona_vsnta_resultado',
        tipo: 'encabezado_reporte',
        alineacion: 'centro',
        lineas: [
            { ref: 'ESPACIO' },
            { ref: 'CAMPO:RESULTADO' },
        ],
    },
];
/**
 * Zonas por defecto para Voucher Visanet - Cierre de Lote.
 * Enfocada en datos de cierre: encabezado, titulo de cierre, datos y resultado.
 */
exports.ZONAS_DEFAULT_VSNT_CIERRE = [
    {
        id: 'zona_vsntc_encabezado',
        tipo: 'encabezado_reporte',
        alineacion: 'centro',
        lineas: [
            { ref: 'CAMPO:COMPANIA', formato: { alineacion: 'centro', tamano: 'doble' } },
            { ref: 'CAMPO:DIRECCION' },
            { ref: 'CAMPO:TELEFONO' },
            { ref: 'CAMPO:RNC' },
            { ref: 'CAMPO:SUCURSAL' },
        ],
    },
    {
        id: 'zona_vsntc_titulo',
        tipo: 'encabezado_reporte',
        alineacion: 'centro',
        lineas: [
            { ref: 'LIBRE:cierre_titulo' },
            { ref: 'SEPARADOR', caracter: '=' },
        ],
    },
    {
        id: 'zona_vsntc_datos',
        tipo: 'encabezado_reporte',
        alineacion: 'izquierda',
        lineas: [
            { ref: 'CAMPO:ID_COMERCIO' },
            { ref: 'CAMPO:FECHA' },
            { ref: 'SEPARADOR', caracter: '-' },
        ],
    },
    {
        id: 'zona_vsntc_resultado',
        tipo: 'encabezado_reporte',
        alineacion: 'centro',
        lineas: [
            { ref: 'ESPACIO' },
            { ref: 'CAMPO:RESULTADO' },
        ],
    },
];
// ===== Migracion de config vieja a zonas =====
/**
 * Convierte una config vieja (secciones encabezado/campos/titulo/detalle/totales/
 * cobros/pie + campos.orden/labels/formatos/textosLibres/camposDTO) a un arreglo
 * de ZonaTicketConfig con el mismo orden y labels.
 */
function migrarConfigAZonas(config, tipo) {
    const enc = config.encabezado || {};
    const tit = config.titulo || {};
    const cam = config.campos || {};
    const tot = config.totales || {};
    const pie = config.pie || {};
    if (tipo === 'FPV') {
        const zonas = [];
        // 1. Encabezado reporte (compania + direccion + telefono + rnc + separador)
        const lineasEnc = [];
        if (enc.mostrarCompania !== false)
            lineasEnc.push({ ref: 'CAMPO:COMPANIA' });
        if (enc.mostrarDireccion !== false)
            lineasEnc.push({ ref: 'CAMPO:DIRECCION' });
        if (enc.mostrarTelefono !== false)
            lineasEnc.push({ ref: 'CAMPO:TELEFONO' });
        if (enc.mostrarRnc !== false)
            lineasEnc.push({ ref: 'CAMPO:RNC' });
        lineasEnc.push({ ref: 'SEPARADOR', caracter: '=', formato: { negrita: true } });
        zonas.push({ id: 'zona_fpv_encabezado', tipo: 'encabezado_reporte', lineas: lineasEnc });
        // 2. Campos del documento + titulo
        const orden = (cam.orden && cam.orden.length > 0) ? cam.orden : exports.CAMPOS_TICKET_ORDEN;
        const visibles = cam.visibles || {};
        const labels = cam.labels || {};
        const formatos = cam.formatos || {};
        const lineasCampos = [];
        for (const item of orden) {
            if (item === 'ESPACIO') {
                lineasCampos.push({ ref: 'ESPACIO' });
                continue;
            }
            if (item === 'SEPARADOR') {
                lineasCampos.push({ ref: 'SEPARADOR' });
                continue;
            }
            if (item.startsWith('LIBRE:')) {
                lineasCampos.push({ ref: item });
                continue;
            }
            if (item.startsWith('DTO:')) {
                lineasCampos.push({ ref: item });
                continue;
            }
            if (visibles[item] === false)
                continue;
            const ref = `CAMPO:${item}`;
            const linea = { ref };
            const lbl = labels[item];
            if (lbl !== undefined && lbl !== '' && lbl !== exports.CAMPOS_TICKET_LABELS[item]) {
                linea.label = lbl;
            }
            if (formatos[item])
                linea.formato = { ...formatos[item] };
            lineasCampos.push(linea);
        }
        lineasCampos.push({ ref: 'SEPARADOR', caracter: '─' });
        const titLinea = { ref: 'CAMPO:TITULO' };
        if (tit.texto)
            titLinea.label = tit.texto;
        if (tit.formato)
            titLinea.formato = { ...tit.formato };
        lineasCampos.push(titLinea);
        lineasCampos.push({ ref: 'SEPARADOR', caracter: '=', formato: { negrita: true } });
        zonas.push({ id: 'zona_fpv_campos_titulo', tipo: 'encabezado_reporte', lineas: lineasCampos });
        // 3. Cabecera de grupo detalle (el handler auto-emite los separadores)
        zonas.push({
            id: 'zona_fpv_cabecera_detalle',
            tipo: 'cabecera_grupo_detalle',
            lineas: [],
        });
        // 4. Detalle
        zonas.push({ id: 'zona_fpv_detalle', tipo: 'detalle', lineas: [] });
        // 5. Totales
        const lineasTot = [];
        lineasTot.push({ ref: 'SEPARADOR', caracter: '-' });
        if (tot.mostrarGravado !== false)
            lineasTot.push({ ref: 'TOTAL:TOTAL_GRAVADO' });
        if (tot.mostrarSubtotal !== false)
            lineasTot.push({ ref: 'TOTAL:SUBTOTAL' });
        if (tot.mostrarItbis !== false)
            lineasTot.push({ ref: 'TOTAL:ITBIS' });
        if (tot.mostrarDescuento !== false)
            lineasTot.push({ ref: 'TOTAL:DESCUENTO' });
        lineasTot.push({ ref: 'SEPARADOR', caracter: '─' });
        lineasTot.push({ ref: 'TOTAL:TOTAL' });
        lineasTot.push({ ref: 'SEPARADOR', caracter: '-' });
        zonas.push({ id: 'zona_fpv_totales', tipo: 'totales', lineas: lineasTot });
        // 6. Cobros
        zonas.push({ id: 'zona_fpv_cobros', tipo: 'cobros', lineas: [] });
        // 7. Pie
        const pieLabel = pie.textoPie || '** GRACIAS POR SU COMPRA **';
        zonas.push({
            id: 'zona_fpv_pie',
            tipo: 'pie_reporte',
            lineas: [{ ref: 'CAMPO:TITULO', label: pieLabel }],
        });
        return zonas;
    }
    // === VSNT ===
    // El voucher Visanet es nuevo y no tiene formato legacy de config; la migracion
    // devuelve las zonas por defecto VSNT (regresion cero).
    if (tipo === 'VSNT') {
        return [...exports.ZONAS_DEFAULT_VSNT];
    }
    // === FRI ===
    const zonas = [];
    // 1. Encabezado reporte
    const lineasEnc = [];
    if (enc.mostrarCompania !== false)
        lineasEnc.push({ ref: 'CAMPO:COMPANIA' });
    if (enc.mostrarDireccion !== false)
        lineasEnc.push({ ref: 'CAMPO:DIRECCION' });
    if (enc.mostrarTelefono !== false)
        lineasEnc.push({ ref: 'CAMPO:TELEFONO' });
    if (enc.mostrarRnc !== false)
        lineasEnc.push({ ref: 'CAMPO:RNC' });
    lineasEnc.push({ ref: 'SEPARADOR', caracter: '=', formato: { negrita: true } });
    zonas.push({ id: 'zona_fri_encabezado', tipo: 'encabezado_reporte', lineas: lineasEnc });
    // 2. Titulo (al inicio en FRI, antes de los campos)
    const lineasTit = [];
    const titLinea = { ref: 'CAMPO:TITULO' };
    if (tit.texto)
        titLinea.label = tit.texto;
    if (tit.formato)
        titLinea.formato = { ...tit.formato };
    lineasTit.push(titLinea);
    lineasTit.push({ ref: 'SEPARADOR', caracter: '=', formato: { negrita: true } });
    zonas.push({ id: 'zona_fri_titulo', tipo: 'encabezado_reporte', lineas: lineasTit });
    // 3. Campos del documento
    const ordenRI = (cam.orden && cam.orden.length > 0 && cam.orden.some((k) => esItemOrdenRI(k)))
        ? cam.orden
        : exports.CAMPOS_TICKET_ORDEN_RI;
    const visRI = cam.visibles || {};
    const lblRI = cam.labels || {};
    const fmtRI = cam.formatos || {};
    const lineasCam = [];
    for (const item of ordenRI) {
        if (item === 'ESPACIO') {
            lineasCam.push({ ref: 'ESPACIO' });
            continue;
        }
        if (item === 'SEPARADOR') {
            lineasCam.push({ ref: 'SEPARADOR' });
            continue;
        }
        if (item.startsWith('LIBRE:')) {
            lineasCam.push({ ref: item });
            continue;
        }
        if (item.startsWith('DTO:')) {
            lineasCam.push({ ref: item });
            continue;
        }
        if (visRI[item] === false)
            continue;
        const ref = `CAMPO:${item}`;
        const linea = { ref };
        const lbl = lblRI[item];
        if (lbl !== undefined && lbl !== '' && lbl !== exports.CAMPOS_TICKET_LABELS_RI[item]) {
            linea.label = lbl;
        }
        if (fmtRI[item])
            linea.formato = { ...fmtRI[item] };
        lineasCam.push(linea);
    }
    zonas.push({ id: 'zona_fri_campos', tipo: 'encabezado_reporte', lineas: lineasCam });
    // 4. Cabecera grupo detalle (el handler auto-emite los separadores)
    zonas.push({
        id: 'zona_fri_cabecera_detalle',
        tipo: 'cabecera_grupo_detalle',
        lineas: [],
    });
    // 5. Detalle (transacciones)
    zonas.push({ id: 'zona_fri_detalle', tipo: 'detalle', lineas: [] });
    // 6. Totales (el handler hardcodea la emision para FRI)
    zonas.push({ id: 'zona_fri_totales', tipo: 'totales', lineas: [] });
    // 7. Cobros
    zonas.push({ id: 'zona_fri_cobros', tipo: 'cobros', lineas: [] });
    // 8. Pie
    const pieText = pie.textoPie || 'Gracias por su preferencia!';
    zonas.push({
        id: 'zona_fri_pie',
        tipo: 'pie_reporte',
        lineas: [{ ref: 'CAMPO:TITULO', label: pieText }],
    });
    return zonas;
}
