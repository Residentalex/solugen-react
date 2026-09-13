import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Card, Spin, Alert, Button, Switch, Select, Input, InputNumber, Tag, Row, Col, Grid, message, Modal, Tooltip, Typography, Divider, Space, Popover, Dropdown, Segmented, Radio, Upload,
} from 'antd';
import {
  ArrowUpOutlined, ArrowDownOutlined, SaveOutlined, UndoOutlined, RollbackOutlined, EyeOutlined, EyeInvisibleOutlined,
  CodeOutlined, FileTextOutlined, CopyOutlined,
  ApartmentOutlined, ProfileOutlined, TableOutlined, CalculatorOutlined, WalletOutlined, SettingOutlined,
  LineOutlined, VerticalAlignMiddleOutlined, FontSizeOutlined, DatabaseOutlined, DeleteOutlined,
  EditOutlined, FormatPainterOutlined, PlusOutlined, DownOutlined, RightOutlined, AppstoreOutlined,
  AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined, BoldOutlined,
  LinkOutlined, DisconnectOutlined, QrcodeOutlined, SyncOutlined, SignatureOutlined,
  UploadOutlined, ReloadOutlined,
} from '@ant-design/icons';
import './ReportesConfig.css';
import { reportesConfigApi } from '../../api/reportesConfigApi';
import type {
  ReportePlantillaListaDTO,
  ReportePlantillaDetalleDTO,
  PlantillaConfig,
  AnchoLineaTicket,
  PlantillaDetalleColumnasConfig,
  FormatoItemTicket,
  AlineacionTicket,
  TamanoLetraTicket,
  TextoLibreConfig,
  FirmaConfig,
  ZonaTicketConfig,
  LineaZonaConfig,
  TipoZonaTicket,
  ClaveCampoTicket,
  CaracterSeparadorTicket,
  TipoAnchoCampo,
  TipoCalculoCampo,
  CalculoCampo,
} from '../../types/reportesConfig';
import {
  normalizarConfig,
  normalizarConfigRI,
  normalizarConfigVSNT,
  normalizarConfigVSNT_ANULACION,
  normalizarConfigVSNT_CIERRE,
  CAMPOS_TICKET_LABELS,
  CAMPOS_TICKET_LABELS_RI,
  CAMPOS_TICKET_LABELS_VSNT,
  CAMPOS_DETALLE_LABELS,
  CAMPOS_DTO_DISPONIBLES,
  ANCHO_LINEA_OPCIONES,
  calcularAnchosLinea as calcularAnchosLineaCompartida,
} from '../../utils/ticketPlantillaConfig';
import {
  limpiarCachePlantilla,
  CODIGO_PLANTILLA_FPV_TICKET,
  CODIGO_PLANTILLA_FRI_TICKET,
  CODIGO_PLANTILLA_VSNT_VOUCHER,
  CODIGO_PLANTILLA_VSNT_ANULACION,
  CODIGO_PLANTILLA_VSNT_CIERRE,
} from '../../utils/ticketPlantilla';
import { escposToHtml } from '../../utils/escposToHtml';
import { formatTicketPOS, formatTicketReciboIngreso, formatTicketVoucherVisanet, resolverRuta } from '../../utils/escpos-formatter';

const { Text } = Typography;

const TAMANO_FUENTE_PREVIEW = 14;
const TAMANO_FUENTE_B_PREVIEW = 11;
const FACTOR_ANCHO_CARACTER_MONOESPACIADO = 0.61;
const PADDING_HORIZONTAL_PREVIEW = 40;

/* ===== Campos calculados (líneas ESQUEMA) ===== */
const OPCIONES_CALCULO: { label: string; value: TipoCalculoCampo }[] = [
  { label: 'Suma (SUM)', value: 'SUM' },
  { label: 'Promedio (AVG)', value: 'AVG' },
  { label: 'Cantidad (COUNT)', value: 'COUNT' },
  { label: 'Mínimo (MIN)', value: 'MIN' },
  { label: 'Máximo (MAX)', value: 'MAX' },
];

const VERBOS_CALCULO: Record<TipoCalculoCampo, string> = {
  SUM: 'Suma de',
  AVG: 'Promedio de',
  COUNT: 'Cantidad de',
  MIN: 'Mínimo de',
  MAX: 'Máximo de',
};

/* ===== Datos de ejemplo ===== */
const companyEjemplo = {
  nombre: 'SU EMPRESA DEMO',
  direccion: 'AV. DEMO 123, SANTO DOMINGO',
  telefono: '809-000-0000',
  rnc: '1-01-00000-1',
  fax: '809-550-6157',
  slogan: 'PRECIOS BAJOS, MAYOR CALIDAD!!',
};
const datosEjemploPOS = {
  ncf: 'B0100000001',
  envioDGII: { codigoQR: 'https://ejemplo.com/qr/123456', fechaEnvio: new Date().toISOString() },
  transaccionNCF: {
    nombreTipoComprobante: 'CREDITO FISCAL',
    fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    secuencia: 'B0100000101',
  },
  cajero: 'JUAN PEREZ', caja: 'CAJA 01', turno: 'TURNO A',
  fechaDocumento: '2026-08-02T15:30:00', noDocumento: '0001',
  ncfModificado: 'B0100000002', referencia: 'REF-0001', nota: 'Nota de ejemplo',
  tasa: 1, diasCredito: 30, retenciones: 0, estado: 1,
  cliente: { nombre: 'CONSUMIDOR FINAL', identificacion: '402-1234567-8', telefono: '809-111-2222', direccion: 'AV. CLIENTE 45' },
  secuenciaNCF: { nombre: 'CREDITO FISCAL', tipoComprobante: '30' },
  concepto: { nombre: 'VENTA AL CONTADO' }, almacen: { nombre: 'ALMACEN PRINCIPAL' },
  moneda: { nombre: 'PESO DOMINICANO' },
  sucursal: { nombre: 'SUCURSAL CENTRAL', telefono: '809-333-4444', direccion: 'AV. SUCURSAL 10' },
  subTotal: 100, impuestos: 18, descuento: 0, total: 118,
  detalles: [
    { articulo: 'ACEITE VEGETAL 1L', codigo: '000123', cantidad: 2, precio: 50, impuestos: 9, total: 100 },
    { articulo: 'ARROZ SELECTO 5LB', codigo: '000456', cantidad: 1, precio: 18, impuestos: 3.24, total: 18 },
  ],
  cobros: [{ efectivo: 200, cheque: 0, tarjetaCredito: 0, tarjetaDebito: 0, transferencia: 0, bono: 0, tarjetaRegalo: 0, notaCredito: 0 }],
};
const datosEjemploRecibo = {
  ncf: 'B0100000002', fechaDocumento: '2026-08-02T15:30:00', noDocumento: '0002',
  tipo: { codigo: 'RI', nombre: 'Recibo de Ingreso' },
  concepto: { nombre: 'COBRO A CUENTA' },
  entidad: { nombre: 'CLIENTE DEMO', identificacion: '402-1234567-8', telefono: '809-555-6666', direccion: 'AV. ENTIDAD 20' },
  moneda: { nombre: 'PESO DOMINICANO' }, sucursal: { nombre: 'SUCURSAL CENTRAL' },
  nota: 'Pago parcial', referencia: 'REF-RI-0001',
  tasa: 1, subTotal: 500, descuento: 0, impuestos: 0, retenciones: 0, estado: 1, periodo: 202608, diasCredito: 0, total: 500,
  transaccionesAsociadas: [
    { documento: 'FACT-0001', montoOriginal: 500, pagado: 300, monto: 300 },
    { documento: 'FACT-0002', montoOriginal: 300, pagado: 200, monto: 200 },
  ],
  cobros: [{ medioCobro: 'Efectivo', monto: 500 }],
};
const datosEjemploVoucher = {
  merchantId: '0000002107391001',
  transactionDate: '2026-08-02T15:30:00',
  issuerName: 'BANCO DEMO',
  tokenECR: 'T0001',
  autorizacion: '123456',
  exitoso: true,
  simMoneda: 'RD$',
  montoPesos: 118.0,
  sucursalName: 'SUCURSAL CENTRAL',
  subsidioLabel: 'VENTA',
  panMasked: '************1234',
  cardHolderName: 'CLIENTE DEMO',
  rrn: '123456789',
  batchNumber: '001',
  terminalId: 'TERM001',
  processingHost: 'HOST DEMO',
  stan: '000001',
  entryMode: 'SWIPE',
  exchangeRate: 1,
  transactionCurrency: 'DOP',
};
const datosEjemploAnulacion = {
  ...datosEjemploVoucher,
  subsidioLabel: 'ANULACION',
};
const datosEjemploCierre = {
  merchantId: '0000002107391001',
  transactionDate: '2026-08-02T15:30:00',
  issuerName: 'BANCO DEMO',
  exitoso: true,
  simMoneda: 'RD$',
  montoPesos: 0,
  sucursalName: 'SUCURSAL CENTRAL',
  subsidioLabel: 'CIERRE DE LOTE',
  panMasked: '',
  cardHolderName: '',
  rrn: '',
  batchNumber: '001',
  terminalId: 'TERM001',
  processingHost: 'HOST DEMO',
  stan: '',
  entryMode: '',
  exchangeRate: 1,
  transactionCurrency: 'DOP',
};

/* ===== Zonas: iconos y labels ===== */
const ICONO_ZONA: Record<TipoZonaTicket, React.ReactNode> = {
  encabezado_pagina: <ApartmentOutlined />,
  encabezado_reporte: <ApartmentOutlined />,
  cabecera_grupo_detalle: <TableOutlined />,
  detalle: <TableOutlined />,
  pie_detalle: <TableOutlined />,
  totales: <CalculatorOutlined />,
  cobros: <WalletOutlined />,
  pie_reporte: <FontSizeOutlined />,
  pie_pagina: <FontSizeOutlined />,
  banda: <AppstoreOutlined />,
};
const LABEL_ZONA: Record<TipoZonaTicket, string> = {
  encabezado_pagina: 'Encabezado página',
  encabezado_reporte: 'Encabezado reporte',
  cabecera_grupo_detalle: 'Cabecera grupo detalle',
  detalle: 'Detalle',
  pie_detalle: 'Pie detalle',
  totales: 'Totales',
  cobros: 'Cobros',
  pie_reporte: 'Pie reporte',
  pie_pagina: 'Pie página',
  banda: 'Banda libre',
};
const DESC_ZONA: Record<TipoZonaTicket, string> = {
  encabezado_pagina: 'Encabezado que se repite en cada página',
  encabezado_reporte: 'Encabezado al inicio del reporte',
  cabecera_grupo_detalle: 'Títulos de columnas del detalle',
  detalle: 'Filas de artículos / transacciones',
  pie_detalle: 'Subtotales por grupo de detalle',
  totales: 'Totales del documento',
  cobros: 'Líneas de cobro',
  pie_reporte: 'Pie del reporte',
  pie_pagina: 'Pie que se repite en cada página',
  banda: 'Área de libre edición sin comportamiento específico',
};
const LINEAS_SUGERIDAS: Record<TipoZonaTicket, LineaZonaConfig[]> = {
  encabezado_reporte: [
    { ref: 'CAMPO:COMPANIA' }, { ref: 'CAMPO:DIRECCION' },
    { ref: 'CAMPO:TELEFONO' }, { ref: 'CAMPO:RNC' },
    { ref: 'SEPARADOR', caracter: '=', formato: { negrita: true } },
  ],
  pie_reporte: [
    { ref: 'CAMPO:TITULO', label: '** GRACIAS POR SU COMPRA **' },
    { ref: 'SEPARADOR', caracter: '-' },
  ],
  encabezado_pagina: [],
  cabecera_grupo_detalle: [],
  detalle: [],
  pie_detalle: [],
  totales: [
    { ref: 'TOTAL:TOTAL_GRAVADO' }, { ref: 'TOTAL:SUBTOTAL' },
    { ref: 'TOTAL:ITBIS' }, { ref: 'TOTAL:DESCUENTO' },
    { ref: 'TOTAL:TOTAL' },
  ],
  cobros: [
    { ref: 'COBRO:EFECTIVO' }, { ref: 'COBRO:CHEQUE' },
    { ref: 'COBRO:TARJETA_CREDITO' }, { ref: 'COBRO:TARJETA_DEBITO' },
    { ref: 'COBRO:TRANSFERENCIA' }, { ref: 'COBRO:DEVUELTA' },
  ],
  pie_pagina: [],
  banda: [],
};

/* ===== Helpers ===== */
function actualizarOpcion(prev: PlantillaConfig, patch: Partial<PlantillaConfig>): PlantillaConfig {
  return { ...prev, ...patch };
}

function migrarLinea(linea: LineaZonaConfig, grupoIdx: number): LineaZonaConfig {
  if (linea.lineaNum !== undefined) return linea;
  if (linea.mismaLinea) {
    return {
      ...linea,
      lineaNum: grupoIdx,
      anchoTipo: linea.anchoCampo ? 'fijo' : 'porcentual',
      anchoValor: linea.anchoCampo ?? 100,
      mismaLinea: undefined,
      anchoCampo: undefined,
    };
  }
  return { ...linea, lineaNum: grupoIdx + 1 };
}

/**
 * Extrae las rutas (notacion de puntos) disponibles de un esquema JSON.
 * - Objetos anidados se recorren recursivamente (ej: `cliente.nombre`).
 * - Arrays de objetos exponen las subclaves sin indice (ej: `detalles.articulo`)
 *   porque el formateador aplana arrays al resolver; ademas se expone el array
 *   en si para imprimir los valores concatenados (ej: `detalles`).
 * - Arrays de primitivos u objetos vacios solo exponen la ruta del array.
 */
function extraerRutasEsquema(esquema: unknown, prefijo = ''): string[] {
  const rutas: string[] = [];
  const recorrer = (obj: any, pref: string) => {
    if (obj == null) return;
    if (Array.isArray(obj)) {
      if (pref) rutas.push(pref);
      const primero = obj[0];
      if (primero && typeof primero === 'object' && !Array.isArray(primero)) recorrer(primero, pref);
      return;
    }
    if (typeof obj !== 'object') {
      if (pref) rutas.push(pref);
      return;
    }
    for (const [k, v] of Object.entries(obj)) {
      const ruta = pref ? `${pref}.${k}` : k;
      if (v !== null && typeof v === 'object') {
        recorrer(v, ruta);
      } else {
        rutas.push(ruta);
      }
    }
  };
  recorrer(esquema, prefijo);
  return rutas;
}

function migrarConfig(cfg: PlantillaConfig): PlantillaConfig {
  if (!cfg.zonas) return cfg;
  let grupoActual = 0;
  const zonas = cfg.zonas.map((zona) => {
    const lineas = zona.lineas.map((linea, idx) => {
      if (linea.ref === 'ESPACIO' || linea.ref === 'SEPARADOR') {
        if (linea.lineaNum !== undefined) return linea;
        grupoActual++;
        return { ...linea, lineaNum: grupoActual };
      }
      if (linea.mismaLinea) {
        const migrada = migrarLinea(linea, grupoActual);
        return migrada;
      }
      grupoActual++;
      return { ...linea, lineaNum: linea.lineaNum ?? grupoActual };
    });
    return { ...zona, lineas };
  });
  return { ...cfg, zonas };
}

function construirFormato(
  alineacion: AlineacionTicket, negrita: boolean | undefined, tamano: TamanoLetraTicket, omitirNegritaTrue: boolean,
): FormatoItemTicket | null {
  const fmt: FormatoItemTicket = {};
  if (alineacion !== 'izquierda') fmt.alineacion = alineacion;
  if (negrita === false) fmt.negrita = false;
  else if (negrita === true && !omitirNegritaTrue) fmt.negrita = true;
  if (tamano !== 'normal') fmt.tamano = tamano;
  return Object.keys(fmt).length > 0 ? fmt : null;
}

function tagsFormato(fmt: FormatoItemTicket | undefined): React.ReactNode {
  if (!fmt) return null;
  const partes: string[] = [];
  if (fmt.alineacion === 'centro') partes.push('C');
  else if (fmt.alineacion === 'derecha') partes.push('D');
  if (fmt.negrita === true) partes.push('N');
  else if (fmt.negrita === false) partes.push('sin N');
  if (fmt.tamano === 'doble') partes.push('2x');
  else if (fmt.tamano === 'doble_altura') partes.push('2x↑');
  else if (fmt.tamano === 'doble_ancho') partes.push('2x→');
  else if (fmt.tamano === 'triple') partes.push('3x');
  else if (fmt.tamano === 'condensada') partes.push('cond');
  if (partes.length === 0) return null;
  return <Tag className="rc-campo-formato-tag">{partes.join(' · ')}</Tag>;
}

function FormatoToolbar({ formato, onChange, deshabilitarAlineacion }: {
  formato?: FormatoItemTicket;
  onChange: (f: FormatoItemTicket | null) => void;
  deshabilitarAlineacion?: boolean;
}) {
  const update = (patch: Partial<FormatoItemTicket>) => {
    const next = { ...formato, ...patch };
    const limpio: FormatoItemTicket = {};
    if (next.alineacion) limpio.alineacion = next.alineacion;
    if (next.negrita !== undefined) limpio.negrita = next.negrita;
    if (next.tamano) limpio.tamano = next.tamano;
    onChange(Object.keys(limpio).length > 0 ? limpio : null);
  };

  return (
    <Space size={4} wrap>
      {!deshabilitarAlineacion && (
        <Space.Compact>
          <Tooltip title="Izquierda">
            <Button size="small" type={formato?.alineacion === 'izquierda' ? 'primary' : 'default'}
              icon={<AlignLeftOutlined />}
              onClick={() => update({ alineacion: formato?.alineacion === 'izquierda' ? undefined : 'izquierda' })} />
          </Tooltip>
          <Tooltip title="Centro">
            <Button size="small" type={formato?.alineacion === 'centro' ? 'primary' : 'default'}
              icon={<AlignCenterOutlined />}
              onClick={() => update({ alineacion: formato?.alineacion === 'centro' ? undefined : 'centro' })} />
          </Tooltip>
          <Tooltip title="Derecha">
            <Button size="small" type={formato?.alineacion === 'derecha' ? 'primary' : 'default'}
              icon={<AlignRightOutlined />}
              onClick={() => update({ alineacion: formato?.alineacion === 'derecha' ? undefined : 'derecha' })} />
          </Tooltip>
        </Space.Compact>
      )}
      <Tooltip title={formato?.negrita ? 'Quitar negrita' : 'Negrita'}>
        <Button size="small" type={formato?.negrita ? 'primary' : 'default'}
          icon={<BoldOutlined />}
          onClick={() => update({ negrita: formato?.negrita ? false : true })} />
      </Tooltip>
      <Select<TamanoLetraTicket | ''>
        size="small" style={{ width: 110 }}
        value={formato?.tamano || ''}
        onChange={(v) => update({ tamano: (v || undefined) as TamanoLetraTicket | undefined })}
        options={[
          { label: 'Normal', value: '' as const },
          { label: 'Doble (2×2)', value: 'doble' as const },
          { label: 'Doble altura', value: 'doble_altura' as const },
          { label: 'Doble ancho', value: 'doble_ancho' as const },
          { label: 'Triple (3×3)', value: 'triple' as const },
          { label: 'Condensada', value: 'condensada' as const },
        ]} />
      <Tooltip title="Quitar formato">
        <Button size="small" danger type="text" icon={<DeleteOutlined />}
          onClick={() => onChange(null)} />
      </Tooltip>
    </Space>
  );
}

function FormatoPopoverDual({ formatoLabel, formatoValor, onAplicarLabel, onAplicarValor, deshabilitarAlineacion, dual }: {
  formatoLabel?: FormatoItemTicket;
  formatoValor?: FormatoItemTicket;
  onAplicarLabel: (f: FormatoItemTicket | null) => void;
  onAplicarValor: (f: FormatoItemTicket | null) => void;
  deshabilitarAlineacion?: boolean;
  dual?: boolean;
}) {
  const [localLabel, setLocalLabel] = useState<FormatoItemTicket | undefined>(formatoLabel);
  const [localValor, setLocalValor] = useState<FormatoItemTicket | undefined>(formatoValor);
  const [open, setOpen] = useState(false);

  const hasFormat = dual
    ? !!(formatoLabel || formatoValor)
    : !!formatoLabel;

  const content = dual ? (
    <div style={{ width: 280 }}>
      <Text strong style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Label</Text>
      <FormatoToolbar formato={localLabel} onChange={setLocalLabel} deshabilitarAlineacion={deshabilitarAlineacion} />
      <Divider style={{ margin: '8px 0' }} />
      <Text strong style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Valor</Text>
      <FormatoToolbar formato={localValor} onChange={setLocalValor} deshabilitarAlineacion={deshabilitarAlineacion} />
      <Divider style={{ margin: '8px 0' }} />
      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
        <Button size="small" onClick={() => { setLocalLabel(undefined); setLocalValor(undefined); setOpen(false); onAplicarLabel(null); onAplicarValor(null); }}>
          Quitar
        </Button>
        <Button type="primary" size="small" onClick={() => { onAplicarLabel(localLabel ?? null); onAplicarValor(localValor ?? null); setOpen(false); }}>
          Aplicar
        </Button>
      </Space>
    </div>
  ) : (
    <div style={{ width: 280 }}>
      <FormatoToolbar formato={localLabel} onChange={setLocalLabel} deshabilitarAlineacion={deshabilitarAlineacion} />
      <Divider style={{ margin: '8px 0' }} />
      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
        <Button size="small" onClick={() => { setLocalLabel(undefined); setOpen(false); onAplicarLabel(null); }}>
          Quitar
        </Button>
        <Button type="primary" size="small" onClick={() => { onAplicarLabel(localLabel ?? null); setOpen(false); }}>
          Aplicar
        </Button>
      </Space>
    </div>
  );

  const tags = dual ? (
    <>{tagsFormato(formatoLabel)}{tagsFormato(formatoValor)}</>
  ) : tagsFormato(formatoLabel);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {tags}
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) { setLocalLabel(formatoLabel); setLocalValor(formatoValor); } }}
        trigger="click" placement="bottomRight" destroyOnHidden
        title={<Text style={{ fontSize: 12 }}>Formato</Text>}
        content={content}>
        <Button size="small" type="text" icon={<FormatPainterOutlined />}
          className={hasFormat ? 'rc-campo-formato-btn rc-campo-formato-btn-activo' : 'rc-campo-formato-btn'} />
      </Popover>
    </div>
  );
}

function FilaFormato({ label, formato, onAplicar, deshabilitarAlineacion }: {
  label: string; formato?: FormatoItemTicket; onAplicar: (fmt: FormatoItemTicket | null) => void; deshabilitarAlineacion?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <Text>{label}</Text>
      <FormatoPopoverDual
        formatoLabel={formato}
        formatoValor={undefined}
        onAplicarLabel={onAplicar}
        onAplicarValor={() => {}}
        deshabilitarAlineacion={deshabilitarAlineacion}
        dual={false}
      />
    </div>
  );
}

/** Modal aislado para evitar re-renders del editor al escribir */
const ModalTextoLibre = React.memo(function ModalTextoLibre({
  open, editId, zonaIdx, valorInicial, onGuardar, onCancel,
}: {
  open: boolean; editId?: string; zonaIdx?: number; valorInicial?: TextoLibreConfig;
  onGuardar: (texto: string, alineacion: AlineacionTicket, negrita: boolean, tamano: TamanoLetraTicket) => void;
  onCancel: () => void;
}) {
  const [texto, setTexto] = useState('');
  const [alineacion, setAlineacion] = useState<AlineacionTicket>('centro');
  const [negrita, setNegrita] = useState(true);
  const [tamano, setTamano] = useState<TamanoLetraTicket>('normal');

  useEffect(() => {
    if (open) {
      setTexto(valorInicial?.texto ?? '');
      setAlineacion(valorInicial?.alineacion ?? 'centro');
      setNegrita(valorInicial?.negrita ?? true);
      setTamano(valorInicial?.tamano ?? 'normal');
    }
  }, [open, valorInicial]);

  const handleOk = () => {
    const txt = texto.trim();
    if (!txt) { message.warning('Escriba el texto libre'); return; }
    onGuardar(txt, alineacion, negrita, tamano);
  };

  return (
    <Modal title={editId ? 'Editar texto libre' : 'Agregar texto libre'}
      open={open} onOk={handleOk} onCancel={onCancel}
      okText={editId ? 'Guardar' : 'Agregar'} width={460}>
      <Input.TextArea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)}
        placeholder="Use Enter para varias líneas." />
      <Divider style={{ margin: '12px 0' }} />
      <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>Formato del texto libre</Text>
      <FormatoToolbar
        formato={{
          alineacion: alineacion !== 'centro' ? alineacion : undefined,
          negrita: negrita ? true : undefined,
          tamano: tamano !== 'normal' ? tamano : undefined,
        }}
        onChange={(f) => {
          setAlineacion(f?.alineacion ?? 'centro');
          setNegrita(f?.negrita ?? true);
          setTamano(f?.tamano ?? 'normal');
        }} />
    </Modal>
  );
});

/** Modal aislado de firma configurable (texto + linea de guiones con posicion). */
const ModalFirma = React.memo(function ModalFirma({
  open, editId, valorInicial, onGuardar, onCancel,
}: {
  open: boolean; editId?: string; valorInicial?: FirmaConfig;
  onGuardar: (texto: string, linea: 'arriba' | 'alado') => void;
  onCancel: () => void;
}) {
  const [texto, setTexto] = useState('');
  const [linea, setLinea] = useState<'arriba' | 'alado'>('arriba');

  useEffect(() => {
    if (open) {
      setTexto(valorInicial?.texto ?? '');
      setLinea(valorInicial?.linea ?? 'arriba');
    }
  }, [open, valorInicial]);

  const handleOk = () => {
    const txt = texto.trim();
    if (!txt) { message.warning('Escriba el texto de la firma'); return; }
    onGuardar(txt, linea);
  };

  return (
    <Modal title={editId ? 'Editar firma' : 'Agregar firma'}
      open={open} onOk={handleOk} onCancel={onCancel}
      okText={editId ? 'Guardar' : 'Agregar'} width={460}>
      <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>Texto de la firma</Text>
      <Input.TextArea rows={2} value={texto} onChange={(e) => setTexto(e.target.value)}
        placeholder="Ej: Firma autorizada" />
      <Divider style={{ margin: '12px 0' }} />
      <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>Posición de la línea de guiones</Text>
      <Radio.Group value={linea} onChange={(e) => setLinea(e.target.value)}>
        <Radio value="arriba">Arriba del texto</Radio>
        <Radio value="alado">Al lado del texto</Radio>
      </Radio.Group>
    </Modal>
  );
});

interface ReportesConfigEditorProps {
  plantillas: ReportePlantillaListaDTO[];
  entdocAsignaciones: Record<string, number | null>;
  onSelectPlantilla: (id: number) => void;
  onNuevaPlantilla: () => void;
  onAsignarEntdoc: (plantillaId: number, entdocCodigo: string | null) => void;
  onRefresh: () => void;
}

const ReportesConfigEditor: React.FC<ReportesConfigEditorProps> = ({
  plantillas,
  entdocAsignaciones,
  onNuevaPlantilla,
  onAsignarEntdoc,
  onRefresh,
}) => {
  const screens = Grid.useBreakpoint();
  const isLarge = screens.xxl === true;

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const plantillaActual = plantillas.find((p) => p.plantillaId === selectedId) ?? null;

  const esFPV = plantillaActual?.codigo === CODIGO_PLANTILLA_FPV_TICKET;
  const esFRI = plantillaActual?.codigo === CODIGO_PLANTILLA_FRI_TICKET;
  const esVSNT = plantillaActual?.codigo === CODIGO_PLANTILLA_VSNT_VOUCHER;
  const esVSNT_ANULACION = plantillaActual?.codigo === CODIGO_PLANTILLA_VSNT_ANULACION;
  const esVSNT_CIERRE = plantillaActual?.codigo === CODIGO_PLANTILLA_VSNT_CIERRE;
  const esVSNT_PLANTILLA = esVSNT || esVSNT_ANULACION || esVSNT_CIERRE;

  const [detalle, setDetalle] = useState<ReportePlantillaDetalleDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [config, setConfig] = useState<PlantillaConfig>(() =>
    migrarConfig(esVSNT_CIERRE ? normalizarConfigVSNT_CIERRE(null) : esVSNT_ANULACION ? normalizarConfigVSNT_ANULACION(null) : esVSNT ? normalizarConfigVSNT(null) : esFRI ? normalizarConfigRI(null) : normalizarConfig(null)));
  const [configInicial, setConfigInicial] = useState<PlantillaConfig>(() =>
    migrarConfig(esVSNT_CIERRE ? normalizarConfigVSNT_CIERRE(null) : esVSNT_ANULACION ? normalizarConfigVSNT_ANULACION(null) : esVSNT ? normalizarConfigVSNT(null) : esFRI ? normalizarConfigRI(null) : normalizarConfig(null)));
  const [saving, setSaving] = useState(false);
  const [restableciendo, setRestableciendo] = useState(false);
  const [zonasColapsadas, setZonasColapsadas] = useState<Record<string, boolean>>({});
  const [lineaActiva, setLineaActiva] = useState<{ zonaIdx: number; lineaIdx: number } | null>(null);

  // Modales
  const [modalLibreAbierto, setModalLibreAbierto] = useState(false);
  const [libreTempEditId, setLibreTempEditId] = useState<string | undefined>(undefined);
  const [libreTempZonaIdx, setLibreTempZonaIdx] = useState<number | undefined>(undefined);
  const [libreTempValorInicial, setLibreTempValorInicial] = useState<TextoLibreConfig | undefined>(undefined);
  const [modalDTOAbierto, setModalDTOAbierto] = useState(false);
  const [dtoTempEditId, setDtoTempEditId] = useState<string | undefined>(undefined);
  const [dtoTempZonaIdx, setDtoTempZonaIdx] = useState<number | undefined>(undefined);
  const [dtoTempId, setDtoTempId] = useState<string | undefined>(undefined);
  const [dtoTempLabel, setDtoTempLabel] = useState('');
  const [dtoTempAlineacion, setDtoTempAlineacion] = useState<AlineacionTicket>('izquierda');
  const [dtoTempNegrita, setDtoTempNegrita] = useState(false);
  const [dtoTempNegritaTocada, setDtoTempNegritaTocada] = useState(false);
  const [dtoTempTamano, setDtoTempTamano] = useState<TamanoLetraTicket>('normal');
  const [modalFirmaAbierto, setModalFirmaAbierto] = useState(false);
  const [firmaTempEditId, setFirmaTempEditId] = useState<string | undefined>(undefined);
  const [firmaTempZonaIdx, setFirmaTempZonaIdx] = useState<number | undefined>(undefined);
  const [firmaTempValorInicial, setFirmaTempValorInicial] = useState<FirmaConfig | undefined>(undefined);

  // Modales JSON
  const [modalJsonConfigOpen, setModalJsonConfigOpen] = useState(false);
  const [modalJsonPayloadOpen, setModalJsonPayloadOpen] = useState(false);
  const [jsonPayloadContent, setJsonPayloadContent] = useState('');
  const [loadingPayload, setLoadingPayload] = useState(false);

  const labelsDefault = esVSNT_PLANTILLA ? CAMPOS_TICKET_LABELS_VSNT : esFRI ? CAMPOS_TICKET_LABELS_RI : CAMPOS_TICKET_LABELS;
  const catalogoDTO = esVSNT_PLANTILLA ? CAMPOS_DTO_DISPONIBLES.VSNT : esFRI ? CAMPOS_DTO_DISPONIBLES.FRI : CAMPOS_DTO_DISPONIBLES.FPV;
  const normalizarSegunPlantilla = (cfg: PlantillaConfig | null | undefined): PlantillaConfig =>
    esVSNT_CIERRE ? normalizarConfigVSNT_CIERRE(cfg) : esVSNT_ANULACION ? normalizarConfigVSNT_ANULACION(cfg) : esVSNT ? normalizarConfigVSNT(cfg) : esFRI ? normalizarConfigRI(cfg) : normalizarConfig(cfg);

  const obtenerEtiquetaPredeterminada = (referencia: string): string | undefined => {
    if (referencia.startsWith('CAMPO:')) {
      const campo = referencia.slice(6);
      return labelsDefault[campo] || campo;
    }
    if (referencia.startsWith('DETALLE:')) {
      const campo = referencia.slice(8);
      return CAMPOS_DETALLE_LABELS[campo] || campo;
    }
    if (referencia.startsWith('TOTAL:') || referencia.startsWith('COBRO:')) {
      return referencia.slice(referencia.indexOf(':') + 1).replace(/_/g, ' ');
    }
    if (referencia.startsWith('ESQUEMA:')) {
      return referencia.slice(8);
    }
    return undefined;
  };

  const completarEtiquetasPredeterminadas = (configuracion: PlantillaConfig): PlantillaConfig => ({
    ...configuracion,
    zonas: (configuracion.zonas || []).map((zona) => ({
      ...zona,
      lineas: (zona.lineas || []).map((linea) => {
        if (linea.label?.trim()) return linea;
        const etiqueta = obtenerEtiquetaPredeterminada(linea.ref || '');
        return etiqueta ? { ...linea, label: etiqueta } : linea;
      }),
    })),
  });

  useEffect(() => {
    if (!selectedId) { setDetalle(null); setConfig(migrarConfig(esVSNT_CIERRE ? normalizarConfigVSNT_CIERRE(null) : esVSNT_ANULACION ? normalizarConfigVSNT_ANULACION(null) : esVSNT ? normalizarConfigVSNT(null) : esFRI ? normalizarConfigRI(null) : normalizarConfig(null))); setConfigInicial(config); return; }
    let activo = true; setLoading(true); setLoadingError(false);
    reportesConfigApi.obtenerPorId(selectedId)
      .then((d) => { if (!activo) return; setDetalle(d); const cfg = migrarConfig(normalizarSegunPlantilla(d.config)); setConfig(cfg); setConfigInicial(cfg); setPreviewConfig({ ...cfg }); })
      .catch(() => { if (activo) setLoadingError(true); })
      .finally(() => { if (activo) setLoading(false); });
    return () => { activo = false; };
  }, [selectedId, esVSNT_CIERRE, esVSNT_ANULACION, esVSNT, esFRI]);

  useEffect(() => {
    if (!selectedId && plantillas.length > 0) {
      setSelectedId(plantillas[0].plantillaId);
    }
  }, [plantillas, selectedId]);

  const tieneConfig = detalle?.config != null;
  const dirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(configInicial), [config, configInicial]);
  const rutasEsquema = useMemo(() => extraerRutasEsquema(config.esquema), [config.esquema]);
  // Solo rutas que resuelven a un array: únicas seleccionables como campo calculado.
  const rutasArrayEsquema = useMemo(
    () => rutasEsquema.filter((r) => Array.isArray(resolverRuta(config.esquema, r))),
    [rutasEsquema, config.esquema],
  );
  const hayLineasEsquema = useMemo(
    () => (config.zonas || []).some((z) => (z.lineas || []).some((l) => l.ref.startsWith('ESQUEMA:'))),
    [config.zonas],
  );
const anchoLineaPreview = config.opciones?.anchoLinea ?? 48;
const anchoPapelPreview = Math.ceil(
  anchoLineaPreview * TAMANO_FUENTE_PREVIEW * FACTOR_ANCHO_CARACTER_MONOESPACIADO,
) + PADDING_HORIZONTAL_PREVIEW;

  const [previewConfig, setPreviewConfig] = useState(config);
  const [previewAgenteUrl, setPreviewAgenteUrl] = useState<string | null>(null);
  const [previewAgenteCargando, setPreviewAgenteCargando] = useState(false);
  const [previewAgenteError, setPreviewAgenteError] = useState<string | null>(null);
  const prevPreviewRef = useRef('');
  const previewAgenteUrlRef = useRef<string | null>(null);
  const previewSolicitudRef = useRef(0);
  const previewErrorNotificadoRef = useRef<string | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const handleRefreshPreview = useCallback(() => {
    setPreviewConfig({ ...configRef.current });
  }, []);

  // Vista previa en vivo: sincroniza con cada cambio de config, manteniendo el
  // congelado mientras un modal de edicion esta abierto (se libera al cerrar).
  useEffect(() => {
    if (!modalLibreAbierto && !modalDTOAbierto && !modalFirmaAbierto) {
      setPreviewConfig({ ...config });
    }
  }, [config, modalLibreAbierto, modalDTOAbierto, modalFirmaAbierto]);

  const previewHtml = useMemo(() => {
    if (!detalle) return '';
    try {
      const raw = esVSNT_ANULACION
        ? formatTicketVoucherVisanet(datosEjemploAnulacion, companyEjemplo, previewConfig)
        : esVSNT_CIERRE
          ? formatTicketVoucherVisanet(datosEjemploCierre, companyEjemplo, previewConfig)
          : esVSNT
            ? formatTicketVoucherVisanet(datosEjemploVoucher, companyEjemplo, previewConfig)
            : esFRI
          ? formatTicketReciboIngreso(datosEjemploRecibo, companyEjemplo, previewConfig)
          : formatTicketPOS(datosEjemploPOS, companyEjemplo, previewConfig);
      const html = escposToHtml(raw, {
        fontSizeBase: TAMANO_FUENTE_PREVIEW,
        fontSizeFuenteB: TAMANO_FUENTE_B_PREVIEW,
        escalaCondensada: 0.75,
      });
      // Logo configurable: anteponer al contenido convertido si esta activo y hay fuente.
      const logo = previewConfig.logo;
      let logoHtml = '';
      if (logo?.mostrar) {
        const logoSrc = logo.base64
          ? (logo.base64.startsWith('data:') ? logo.base64 : `data:image/png;base64,${logo.base64}`)
          : logo.url;
        if (logoSrc) {
          const ancho = logo.anchoPx ?? 384;
          const alto = logo.altoPx ?? 120;
          const alineacion = logo.alineacion ?? 'centro';
          const alineacionCSS = alineacion === 'izquierda' ? 'left' : alineacion === 'derecha' ? 'right' : 'center';
          logoHtml = `<div style="text-align:${alineacionCSS};margin-bottom:8px"><img src="${logoSrc}" style="max-width:${ancho}px;max-height:${alto}px;object-fit:contain" /></div>`;
        }
      }
      const htmlConLogo = logoHtml + html;
      prevPreviewRef.current = htmlConLogo;
      return htmlConLogo;
    } catch (error) {
      console.error('No se pudo generar la vista previa del ticket:', error);
      return prevPreviewRef.current || '<div style="padding:16px;color:#b42318;font-family:sans-serif">No se pudo generar la vista previa.</div>';
    }
  }, [detalle, previewConfig, esFRI, esVSNT, esVSNT_ANULACION, esVSNT_CIERRE]);

  // Congelar preview visualmente mientras el modal esta abierto
  const frozenPreview = modalLibreAbierto || modalDTOAbierto || modalFirmaAbierto ? prevPreviewRef.current : previewHtml;

  const zonas = config.zonas || [];
  const encFormato = config.encabezado?.formato;

  /* ===== Handlers de zona ===== */
  const updZonas = useCallback((fn: (z: ZonaTicketConfig[]) => ZonaTicketConfig[]) => {
    setConfig((prev) => actualizarOpcion(prev, { zonas: fn([...(prev.zonas || [])]) }));
  }, []);

  const agregarZona = (tipo: TipoZonaTicket) => {
    updZonas((z) => {
      const sugeridas = LINEAS_SUGERIDAS[tipo] || [];
      return [...z, { id: `zona_${Date.now()}`, tipo, lineas: [...sugeridas] }];
    });
  };

  const quitarZona = (idx: number) => {
    Modal.confirm({
      title: 'Eliminar zona',
      content: `¿Eliminar la zona "${zonas[idx]?.nombre || LABEL_ZONA[zonas[idx]?.tipo || 'encabezado_reporte']}"?`,
      okText: 'Eliminar', okButtonProps: { danger: true }, cancelText: 'Cancelar',
      onOk: () => {
        updZonas((z) => { z.splice(idx, 1); return z; });
        limpiarHuerfanos();
      },
    });
  };

  const moverZona = (idx: number, delta: number) => {
    updZonas((z) => {
      const dest = idx + delta;
      if (dest < 0 || dest >= z.length) return z;
      const [item] = z.splice(idx, 1);
      z.splice(dest, 0, item);
      return z;
    });
  };

  const setZonaAlineacion = (idx: number, al: AlineacionTicket | undefined) => {
    updZonas((z) => { z[idx] = { ...z[idx], alineacion: al }; return z; });
  };

  const setZonaNombre = useCallback((zIdx: number, nombre: string) => {
    updZonas((zs) => {
      const copia = [...zs];
      copia[zIdx] = { ...copia[zIdx], nombre };
      return copia;
    });
  }, [updZonas]);

  const setZonaArrayOrigen = useCallback((zIdx: number, arrayOrigen: string) => {
    updZonas((zs) => {
      const copia = [...zs];
      copia[zIdx] = { ...copia[zIdx], arrayOrigen: arrayOrigen || undefined };
      return copia;
    });
  }, [updZonas]);

  const toggleZona = (id: string) => {
    setZonasColapsadas((prev) => {
      const expandida = !prev[id]; // va a expandirse
      if (expandida) {
        // Acordeón: colapsar todas, expandir solo esta
        const nuevo: Record<string, boolean> = {};
        for (const z of zonas) {
          nuevo[z.id] = z.id !== id; // true = colapsada
        }
        return nuevo;
      } else {
        // Colapsar esta
        return { ...prev, [id]: true };
      }
    });
  };

  /* ===== Handlers de linea ===== */
  const updZonaLineas = (zIdx: number, fn: (l: LineaZonaConfig[]) => LineaZonaConfig[]) => {
    updZonas((z) => { z[zIdx] = { ...z[zIdx], lineas: fn([...z[zIdx].lineas]) }; return z; });
  };

  const quitarLinea = (zIdx: number, lIdx: number) => {
    updZonaLineas(zIdx, (l) => { l.splice(lIdx, 1); return l; });
    limpiarHuerfanos();
  };

  const moverLinea = (zIdx: number, lIdx: number, delta: number) => {
    updZonaLineas(zIdx, (l) => {
      const dest = lIdx + delta;
      if (dest < 0 || dest >= l.length) return l;
      const [item] = l.splice(lIdx, 1);
      l.splice(dest, 0, item);
      return l;
    });
  };

  const setLineaLabel = (zIdx: number, lIdx: number, label: string) => {
    setConfig(prev => {
      const zonas = [...(prev.zonas || [])];
      const zonaActual = zonas[zIdx];
      const lineaActual = zonaActual?.lineas?.[lIdx];
      if (!zonaActual || !lineaActual) return prev;

      const lineas = [...zonaActual.lineas];
      lineas[lIdx] = { ...lineaActual, label: label || undefined };
      zonas[zIdx] = { ...zonaActual, lineas };

      // Para LIBRE:, el label (etiqueta) es independiente del contenido
      return actualizarOpcion(prev, { zonas });
    });
  };

  const setContenidoLibre = (zIdx: number, lIdx: number, contenido: string) => {
    setConfig(prev => {
      const zonas = [...(prev.zonas || [])];
      const zonaActual = zonas[zIdx];
      const lineaActual = zonaActual?.lineas?.[lIdx];
      if (!zonaActual || !lineaActual) return prev;
      const ref = String(lineaActual.ref || '');
      if (!ref.startsWith('LIBRE:')) return actualizarOpcion(prev, { zonas });
      const id = ref.slice('LIBRE:'.length);
      const textos = { ...(prev.textosLibres || prev.campos?.textosLibres || {}) };
      const actual = textos[id] as TextoLibreConfig;
      textos[id] = {
        ...(actual && typeof actual !== 'string' ? actual : {}),
        texto: contenido,
      };
      return actualizarOpcion(prev, { zonas, textosLibres: textos });
    });
  };

  const setLineaFormato = (zIdx: number, lIdx: number, fmt: FormatoItemTicket | null) => {
    updZonaLineas(zIdx, (l) => { l[lIdx] = { ...l[lIdx], formato: fmt || undefined }; return l; });
  };

  const setLineaFormatoLabel = (zIdx: number, lIdx: number, fmt: FormatoItemTicket | null) => {
    updZonaLineas(zIdx, (l) => { l[lIdx] = { ...l[lIdx], formatoLabel: fmt || undefined }; return l; });
  };

  const setLineaFormatoValor = (zIdx: number, lIdx: number, fmt: FormatoItemTicket | null) => {
    updZonaLineas(zIdx, (l) => { l[lIdx] = { ...l[lIdx], formatoValor: fmt || undefined }; return l; });
  };

  const setLineaCalculo = (zIdx: number, lIdx: number, calculo: CalculoCampo | null | undefined) => {
    updZonaLineas(zIdx, (l) => { l[lIdx] = { ...l[lIdx], calculo: calculo || undefined }; return l; });
  };

  const setLineaTabular = (zIdx: number, lIdx: number, active: boolean, ancho?: number) => {
    updZonaLineas(zIdx, (l) => {
      if (!active) { l[lIdx] = { ...l[lIdx], tabular: undefined }; }
      else { l[lIdx] = { ...l[lIdx], tabular: { ancho: ancho ?? l[lIdx].tabular?.ancho ?? 12 } }; }
      return l;
    });
  };

  const setLineaSeparador = (zIdx: number, lIdx: number, caracter: CaracterSeparadorTicket) => {
    updZonaLineas(zIdx, (l) => { l[lIdx] = { ...l[lIdx], caracter } as LineaZonaConfig; return l; });
  };

  const setLineaMostrarLabel = useCallback((zIdx: number, lIdx: number, mostrar: boolean) => {
    updZonas((zs) => {
      const copia = [...zs];
      const lineas = [...copia[zIdx].lineas];
      lineas[lIdx] = { ...lineas[lIdx], mostrarLabel: mostrar };
      copia[zIdx] = { ...copia[zIdx], lineas };
      return copia;
    });
  }, [updZonas]);

  const getSiguienteLineaNum = useCallback((zIdx: number): number => {
    const zona = zonas[zIdx];
    if (!zona || !zona.lineas || zona.lineas.length === 0) return 1;
    const maxNum = zona.lineas.reduce((max, l) => Math.max(max, l.lineaNum ?? 0), 0);
    return maxNum + 1;
  }, [zonas]);

  const agregarLinea = useCallback((zIdx: number, ref: string) => {
    const sigNum = getSiguienteLineaNum(zIdx);
    updZonaLineas(zIdx, (l) => [...l, { ref: ref as LineaZonaConfig['ref'], lineaNum: sigNum }]);
  }, [getSiguienteLineaNum, updZonaLineas]);

  const setLineaNum = useCallback((zIdx: number, lIdx: number, nuevoNum: number): Promise<'empujar' | 'compartir' | 'cancel'> => {
    return new Promise((resolve) => {
      const zona = zonas[zIdx];
      if (!zona) { resolve('cancel'); return; }
      const lineasEnNuevoNum = zona.lineas.filter((l, i) => i !== lIdx && l.lineaNum === nuevoNum);
      if (lineasEnNuevoNum.length === 0) {
        updZonaLineas(zIdx, (l) => { l[lIdx] = { ...l[lIdx], lineaNum: nuevoNum }; return l; });
        resolve('compartir');
        return;
      }
      Modal.confirm({
        title: `Línea ${nuevoNum} ya existe`,
        content: `¿Qué desea hacer con los campos en la línea ${nuevoNum}?`,
        okText: 'Empujar', cancelText: 'Compartir', okButtonProps: { danger: false },
        onOk: () => {
          updZonaLineas(zIdx, (l) => {
            l.forEach((linea, idx) => {
              if (idx !== lIdx && linea.lineaNum !== undefined && linea.lineaNum >= nuevoNum) {
                l[idx] = { ...l[idx], lineaNum: linea.lineaNum + 1 };
              }
            });
            l[lIdx] = { ...l[lIdx], lineaNum: nuevoNum };
            return [...l];
          });
          resolve('empujar');
        },
        onCancel: () => {
          updZonaLineas(zIdx, (l) => { l[lIdx] = { ...l[lIdx], lineaNum: nuevoNum }; return l; });
          resolve('compartir');
        },
      });
    });
  }, [zonas, updZonaLineas]);

  const calcularAnchosLinea = useCallback((zIdx: number, lineaNum: number): Map<number, number> => {
    const zona = zonas[zIdx];
    if (!zona) return new Map();
    return calcularAnchosLineaCompartida(zona.lineas, lineaNum, config.opciones?.anchoLinea ?? 48);
  }, [zonas, config.opciones?.anchoLinea]);

  /** Limpia definiciones huerfanas de LIBRE:/DTO:/FIRMA: al quitar zonas o lineas */
  const limpiarHuerfanos = () => {
    setConfig((prev) => {
      const todasLasRefs = new Set((prev.zonas || []).flatMap((z) => z.lineas.map((l) => l.ref)));
      const textos = prev.textosLibres ? { ...prev.textosLibres } : undefined;
      const dtos = prev.camposDTO ? { ...prev.camposDTO } : undefined;
      const firmas = prev.firmas ? { ...prev.firmas } : undefined;
      let changed = false;
      if (textos) {
        for (const k of Object.keys(textos)) {
          if (!todasLasRefs.has(`LIBRE:${k}` as any)) { delete textos[k]; changed = true; }
        }
      }
      if (dtos) {
        for (const k of Object.keys(dtos)) {
          if (!todasLasRefs.has(`DTO:${k}` as any)) { delete dtos[k]; changed = true; }
        }
      }
      if (firmas) {
        for (const k of Object.keys(firmas)) {
          if (!todasLasRefs.has(`FIRMA:${k}` as any)) { delete firmas[k]; changed = true; }
        }
      }
      if (!changed) return prev;
      return { ...prev, textosLibres: textos, camposDTO: dtos, firmas };
    });
  };

  /* ===== Config vieja: handlers globales que aun se usan ===== */
  const setEncabezadoFormato = (campo: 'compania' | 'direccion' | 'telefono' | 'rnc', fmt: FormatoItemTicket | null) => {
    setConfig((prev) => {
      const encabezado = { ...(prev.encabezado || {}) };
      const formato = { ...(encabezado.formato || {}) };
      if (!fmt) delete formato[campo]; else formato[campo] = fmt;
      encabezado.formato = formato;
      return actualizarOpcion(prev, { encabezado });
    });
  };

  const setAnchoLinea = (valor: AnchoLineaTicket) => {
    setConfig((prev) => actualizarOpcion(prev, { opciones: { ...(prev.opciones || {}), anchoLinea: valor } }));
  };
  const setFeedCorte = (valor: number | null) => {
    setConfig((prev) => actualizarOpcion(prev, { opciones: { ...(prev.opciones || {}), feedCorte: valor ?? 0 } }));
  };
  const setFontFamily = (valor: string) => {
    setConfig((prev) => actualizarOpcion(prev, { opciones: { ...(prev.opciones || {}), fontFamily: valor || undefined } }));
  };

  /* ===== Logo configurable ===== */
  const setLogo = (patch: Partial<NonNullable<PlantillaConfig['logo']>>) => {
    setConfig((prev) => actualizarOpcion(prev, { logo: { mostrar: false, ...(prev.logo || {}), ...patch } }));
  };

  /* ===== Modales ===== */
  const abrirModalLibre = (id?: string, zonaIdx?: number) => {
    setLibreTempZonaIdx(zonaIdx);
    setLibreTempEditId(id);
    if (id) {
      const t = config.textosLibres?.[id] || config.campos?.textosLibres?.[id];
      setLibreTempValorInicial(t && typeof t !== 'string' ? t : undefined);
    } else {
      setLibreTempValorInicial(undefined);
    }
    setModalLibreAbierto(true);
  };

  const guardarLibre = (texto: string, alineacion: AlineacionTicket, negrita: boolean, tamano: TamanoLetraTicket) => {
    const fmt = construirFormato(alineacion, negrita, tamano, true);
    setConfig((prev) => {
      const textos = { ...(prev.textosLibres || prev.campos?.textosLibres || {}) };
      const id = libreTempEditId;
      if (!id) {
        const nuevo = `libre_${Date.now()}`;
        textos[nuevo] = { texto, ...(fmt || {}) };
        const patch: Partial<PlantillaConfig> = { textosLibres: textos };
        if (libreTempZonaIdx !== undefined && prev.zonas) {
          const zonas = [...prev.zonas];
          zonas[libreTempZonaIdx] = { ...zonas[libreTempZonaIdx], lineas: [...zonas[libreTempZonaIdx].lineas, { ref: `LIBRE:${nuevo}` as LineaZonaConfig['ref'] }] };
          patch.zonas = zonas;
        }
        return actualizarOpcion(prev, patch);
      }
      const actual = textos[id] as TextoLibreConfig;
      textos[id] = { ...(actual && typeof actual !== 'string' ? actual : {}), texto, ...(fmt || {}) };
      return actualizarOpcion(prev, { textosLibres: textos });
    });
    setModalLibreAbierto(false); setLibreTempEditId(undefined); setLibreTempZonaIdx(undefined);
  };

  const abrirModalFirma = (id?: string, zonaIdx?: number) => {
    setFirmaTempZonaIdx(zonaIdx);
    setFirmaTempEditId(id);
    setFirmaTempValorInicial(id ? config.firmas?.[id] : undefined);
    setModalFirmaAbierto(true);
  };

  const guardarFirma = (texto: string, linea: 'arriba' | 'alado') => {
    setConfig((prev) => {
      const firmas = { ...(prev.firmas || {}) };
      const id = firmaTempEditId;
      if (!id) {
        const nuevo = `firma_${Date.now()}`;
        firmas[nuevo] = { texto, linea };
        const patch: Partial<PlantillaConfig> = { firmas };
        if (firmaTempZonaIdx !== undefined && prev.zonas) {
          const zonas = [...prev.zonas];
          zonas[firmaTempZonaIdx] = { ...zonas[firmaTempZonaIdx], lineas: [...zonas[firmaTempZonaIdx].lineas, { ref: `FIRMA:${nuevo}` as LineaZonaConfig['ref'] }] };
          patch.zonas = zonas;
        }
        return actualizarOpcion(prev, patch);
      }
      firmas[id] = { ...(firmas[id] || {}), texto, linea };
      return actualizarOpcion(prev, { firmas });
    });
    setModalFirmaAbierto(false); setFirmaTempEditId(undefined); setFirmaTempZonaIdx(undefined); setFirmaTempValorInicial(undefined);
  };

  const abrirModalDTO = (id?: string, zonaIdx?: number) => {
    setDtoTempZonaIdx(zonaIdx);
    if (id) {
      const def = config.camposDTO?.[id] || config.campos?.camposDTO?.[id];
      const itemCatalogo = def ? catalogoDTO.find((c) => c.ruta === def.ruta && c.tipo === def.tipo) : undefined;
      setDtoTempEditId(id); setDtoTempId(itemCatalogo?.id); setDtoTempLabel(def?.label ?? '');
      setDtoTempAlineacion(def?.alineacion ?? 'izquierda'); setDtoTempNegrita(def?.negrita === true);
      setDtoTempNegritaTocada(def?.negrita !== undefined); setDtoTempTamano(def?.tamano ?? 'normal');
    } else {
      setDtoTempEditId(undefined); setDtoTempId(undefined); setDtoTempLabel('');
      setDtoTempAlineacion('izquierda'); setDtoTempNegrita(false); setDtoTempNegritaTocada(false); setDtoTempTamano('normal');
    }
    setModalDTOAbierto(true);
  };

  const guardarDTO = () => {
    const item = catalogoDTO.find((c) => c.id === dtoTempId);
    if (!item && !dtoTempEditId) { message.warning('Seleccione un campo de la base de datos'); return; }
    const fmt = construirFormato(dtoTempAlineacion, dtoTempNegritaTocada ? dtoTempNegrita : undefined, dtoTempTamano, false);
    setConfig((prev) => {
      const dtos = { ...(prev.camposDTO || prev.campos?.camposDTO || {}) };
      const id = dtoTempEditId;
      const prevDef = id ? dtos[id] : undefined;
      const def = {
        label: dtoTempLabel.trim() || item?.label || prevDef?.label || 'Campo DTO',
        ruta: item?.ruta ?? prevDef?.ruta ?? '',
        tipo: item?.tipo ?? prevDef?.tipo ?? 'texto',
        ...(fmt || {}),
      };
      if (!id) {
        const nuevo = `dto_${Date.now()}`;
        dtos[nuevo] = def;
        const patch: Partial<PlantillaConfig> = { camposDTO: dtos };
        if (dtoTempZonaIdx !== undefined && prev.zonas) {
          const zonas = [...prev.zonas];
          zonas[dtoTempZonaIdx] = { ...zonas[dtoTempZonaIdx], lineas: [...zonas[dtoTempZonaIdx].lineas, { ref: `DTO:${nuevo}` as LineaZonaConfig['ref'] }] };
          patch.zonas = zonas;
        }
        return actualizarOpcion(prev, patch);
      }
      dtos[id] = { ...(dtos[id] || {}), ...def };
      return actualizarOpcion(prev, { camposDTO: dtos });
    });
    setModalDTOAbierto(false); setDtoTempEditId(undefined); setDtoTempZonaIdx(undefined); setDtoTempId(undefined); setDtoTempLabel('');
  };

  /* ===== Acciones ===== */
  const handleGuardar = async () => {
    if (!plantillaActual) { message.warning('Seleccione una plantilla primero'); return; }
    // Validaciones no bloqueantes
  if (!(config.zonas || []).some((z) => z.tipo === 'detalle')) message.warning('No hay zona de tipo "Detalle"');
  if (!(config.zonas || []).some((z) => z.tipo === 'totales')) message.warning('No hay zona de tipo "Totales"');
  const configuracionParaGuardar = completarEtiquetasPredeterminadas(config);
  setConfig(configuracionParaGuardar);
  setSaving(true);
  try {
    const toSave = (configuracionParaGuardar.zonas && configuracionParaGuardar.zonas.length > 0) ? configuracionParaGuardar : null;
      const d = await reportesConfigApi.actualizarConfig(plantillaActual.plantillaId, toSave as any);
      limpiarCachePlantilla(); message.success('Configuración guardada correctamente');
      // Recargar desde API para confirmar persistencia
      setDetalle(d); const cfg = normalizarSegunPlantilla(d.config); setConfig(cfg); setConfigInicial(cfg);
      setPreviewConfig({ ...cfg });
      onRefresh();
    } catch (err: any) { message.error(err?.response?.data?.errorMessage || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleVerJsonConfig = () => {
    setModalJsonConfigOpen(true);
  };

  const handleCargarEsquema = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const esquema = JSON.parse(String(reader.result));
        if (esquema === null || typeof esquema !== 'object' || Array.isArray(esquema)) {
          message.error('El archivo debe contener un objeto JSON');
          return;
        }
        const rutas = extraerRutasEsquema(esquema);
        setConfig((c) => ({ ...c, esquema }));
        message.success(rutas.length > 0 ? `Esquema cargado: ${rutas.length} campos disponibles` : 'Esquema cargado (objeto sin campos)');
      } catch {
        message.error('JSON inválido');
      }
    };
    reader.readAsText(file);
    return false; // no subir al servidor
  };

  const handleVerJsonPayload = async () => {
    if (!plantillaActual) { message.warning('Seleccione una plantilla primero'); return; }
    setLoadingPayload(true);
    try {
      const datosEjemplo = esVSNT_ANULACION
        ? datosEjemploAnulacion
        : esVSNT_CIERRE
          ? datosEjemploCierre
          : esVSNT
            ? datosEjemploVoucher
            : esFRI
              ? datosEjemploRecibo
              : datosEjemploPOS;

      const payload = await reportesConfigApi.obtenerPayloadImpresion(plantillaActual.plantillaId, {
        PlantillaId: plantillaActual.plantillaId,
        Data: datosEjemplo,
        Company: companyEjemplo,
      });
      setJsonPayloadContent(JSON.stringify(payload, null, 2));
      setModalJsonPayloadOpen(true);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al obtener payload');
    } finally {
      setLoadingPayload(false);
    }
  };

  const handleCopiarJson = (json: string) => {
    navigator.clipboard.writeText(json).then(() => {
      message.success('Copiado al portapapeles');
    });
  };

  const handleProbarPayload = async () => {
    if (!jsonPayloadContent) return;
    try {
      const payload = JSON.parse(jsonPayloadContent);
      const resultado = await reportesConfigApi.imprimirLocal(payload);
      if (resultado.ok) {
        message.success(`Impresión enviada a ${resultado.impresora || 'impresora'}`);
      } else {
        message.error(resultado.error || 'Error al enviar a impresión');
      }
    } catch (err: any) {
      message.error('Error al procesar payload: ' + (err?.message || 'Error desconocido'));
    }
  };

  const handleRestablecer = () => {
    Modal.confirm({
      title: 'Restablecer plantilla',
      content: `¿Desea restablecer "${plantillaActual?.nombre}" a su configuración predeterminada?`,
      okText: 'Restablecer', okButtonProps: { danger: true }, cancelText: 'Cancelar',
      onOk: async () => {
        setRestableciendo(true);
        try {
          await reportesConfigApi.actualizarConfig(plantillaActual?.plantillaId ?? 0, null);
          limpiarCachePlantilla(); message.success('Plantilla restablecida');
          const d = await reportesConfigApi.obtenerPorId(plantillaActual?.plantillaId ?? 0);
          setDetalle(d); const cfg = normalizarSegunPlantilla(d.config); setConfig(cfg); setConfigInicial(cfg);
          onRefresh();
        } catch (err: any) { message.error(err?.response?.data?.errorMessage || 'Error al restablecer'); }
        finally { setRestableciendo(false); }
      },
    });
  };

  /* ===== Datos de linea para tipo especial ===== */
  const textoLibrePorId = (id: string) => {
    const t = config.textosLibres?.[id] || config.campos?.textosLibres?.[id];
    return t && typeof t !== 'string' ? t : undefined;
  };
  const dtoDefPorId = (id: string) => config.camposDTO?.[id] || config.campos?.camposDTO?.[id];

  if (loading) {
    return <Card className="paces-card-erp paces-card-erp-padded" style={{ borderRadius: 8, minHeight: 320 }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 280 }}><Spin /></div>
    </Card>;
  }
  if (!selectedId) {
    return <Card className="paces-card-erp paces-card-erp-padded" style={{ borderRadius: 8 }}>
      <Alert message="Selecciona una plantilla para comenzar a editarla" type="info" showIcon />
    </Card>;
  }
  if (loadingError) {
    return <Card className="paces-card-erp paces-card-erp-padded" style={{ borderRadius: 8 }}>
      <Alert message="Error al cargar la plantilla" type="error" showIcon />
    </Card>;
  }

  /* ===== Icono por tipo de ref ===== */
  const iconoLinea = (ref: string) => {
    if (ref === 'SEPARADOR') return <LineOutlined />;
    if (ref === 'ESPACIO') return <VerticalAlignMiddleOutlined />;
    if (ref === 'CAMPO:CODIGO_QR') return <QrcodeOutlined />;
    if (ref.startsWith('LIBRE:')) return <FontSizeOutlined />;
    if (ref.startsWith('DTO:')) return <DatabaseOutlined />;
    if (ref.startsWith('FIRMA:')) return <SignatureOutlined />;
    if (ref.startsWith('DETALLE:')) return <TableOutlined />;
    if (ref.startsWith('ESQUEMA:')) return <ApartmentOutlined />;
    return null;
  };

  const labelRef = (ref: string) => {
    if (ref === 'ESPACIO') return 'Espacio';
    if (ref === 'SEPARADOR') return 'Separador';
    if (ref === 'CAMPO:CODIGO_QR') return 'Código QR';
    if (ref.startsWith('CAMPO:')) return labelsDefault[ref.slice(6)] || ref.slice(6);
    if (ref.startsWith('TOTAL:')) return ref.slice(6).replace(/_/g, ' ');
    if (ref.startsWith('COBRO:')) return ref.slice(6).replace(/_/g, ' ');
    if (ref.startsWith('DETALLE:')) return CAMPOS_DETALLE_LABELS[ref.slice(8)] || ref.slice(8);
    if (ref.startsWith('FIRMA:')) return 'Firma';
    if (ref.startsWith('ESQUEMA:')) return ref.slice(8);
    return ref;
  };

  /* ===== Componente FilaLinea: render unificado de linea ===== */
  const FilaLinea = React.memo(function FilaLinea({
    zonaIdx, lineaIdx, linea, zonaLineas, tipo, esActiva, onSeleccionarLinea,
  }: {
    zonaIdx: number; lineaIdx: number; linea: LineaZonaConfig;
    zonaLineas: LineaZonaConfig[]; tipo: TipoZonaTicket;
    esActiva?: boolean; onSeleccionarLinea?: () => void;
  }) {
    const ref = linea.ref;

    let labelMostrar = '';
    if (ref === 'ESPACIO') {
      labelMostrar = 'Espacio';
    } else if (ref === 'SEPARADOR') {
      labelMostrar = 'Separador';
    } else if (ref === 'CAMPO:CODIGO_QR') {
      labelMostrar = 'Código QR';
    } else if (ref.startsWith('LIBRE:')) {
      const id = ref.slice(6);
      const libreObj = textoLibrePorId(id);
      labelMostrar = libreObj?.texto || 'Texto libre';
    } else if (ref.startsWith('DTO:')) {
      const id = ref.slice(6);
      const def = dtoDefPorId(id);
      labelMostrar = def?.label || 'Campo DTO';
    } else if (ref.startsWith('FIRMA:')) {
      const id = ref.slice(6);
      const firma = config.firmas?.[id];
      labelMostrar = firma?.texto || 'Firma';
    } else if (ref.startsWith('DETALLE:')) {
      const clave = ref.slice(8);
      labelMostrar = linea.label || CAMPOS_DETALLE_LABELS[clave] || clave;
    } else {
      const clave = ref.slice(ref.indexOf(':') + 1);
      const esCampo = ref.startsWith('CAMPO:');
      labelMostrar = linea.label || (esCampo ? (labelsDefault[clave] || clave) : labelRef(ref));
    }

    return (
      <div className={`rc-zona-linea ${esActiva ? 'is-activa' : ''}`} onClick={onSeleccionarLinea}>
        <Tag color="orange" style={{ margin: 0, fontSize: 11, minWidth: 20, textAlign: 'center' }}>
          {linea.lineaNum ?? '?'}
        </Tag>
        <span style={{ color: '#556ee6' }}>{iconoLinea(ref)}</span>
        <Text ellipsis style={{ flex: 1, minWidth: 0 }}>{labelMostrar}</Text>
        {linea.tabular && <Tag style={{ margin: 0, fontSize: 10 }}>Tab</Tag>}
        {linea.anchoTipo === 'fijo' && <Tag style={{ margin: 0, fontSize: 10 }}>🔒</Tag>}
      </div>
    );
  }, (prev, next) => prev.zonaIdx === next.zonaIdx && prev.lineaIdx === next.lineaIdx && prev.tipo === next.tipo && prev.zonaLineas === next.zonaLineas && JSON.stringify(prev.linea) === JSON.stringify(next.linea));

  /* ===== Dropdown items para agregar zona ===== */
  const tiposZonaAgregar: TipoZonaTicket[] = [
    'encabezado_reporte', 'encabezado_pagina', 'cabecera_grupo_detalle', 'detalle',
    'pie_detalle', 'totales', 'cobros', 'pie_reporte', 'pie_pagina', 'banda',
  ];
  const menuAgregarZona = {
    items: tiposZonaAgregar.map((t) => ({
      key: t, icon: ICONO_ZONA[t],
      label: <div><Text strong>{LABEL_ZONA[t]}</Text><br /><Text type="secondary" style={{ fontSize: 11 }}>{DESC_ZONA[t]}</Text></div>,
      onClick: () => agregarZona(t),
    })),
  };

  return (
    <>
      {/* Toolbar */}
      <Card className="paces-card-erp paces-card-erp-padded" style={{ borderRadius: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Select
            showSearch
            size="small"
            style={{ width: 280 }}
            placeholder="Seleccionar plantilla"
            value={selectedId}
            onChange={(id) => setSelectedId(id as number)}
            filterOption={(input, option) =>
              (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
            options={plantillas.map((p) => ({
              value: p.plantillaId,
              label: (
                <span>
                  {p.nombre}
                  {(() => {
                    const asignacion = Object.entries(entdocAsignaciones).find(([, pid]) => pid === p.plantillaId)?.[0];
                    return asignacion ? <Tag color="blue" style={{ marginLeft: 8, fontSize: 10 }}>{asignacion}</Tag> : null;
                  })()}
                </span>
              ),
            }))}
          />
          <Button size="small" icon={<PlusOutlined />} onClick={onNuevaPlantilla}>Nueva</Button>
          <div style={{ flex: 1 }} />
          {plantillaActual && (
            <>
              <Tag color={plantillaActual.tieneConfig ? 'blue' : 'default'} style={{ margin: 0, fontSize: 11 }}>
                {plantillaActual.tieneConfig ? 'Personalizada' : 'Predeterminada'}
              </Tag>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {plantillaActual.codigo}
              </Text>
            </>
          )}
          {dirty && <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>Sin guardar</Tag>}
          <Tooltip title="Refrescar vista previa">
            <Button size="small" icon={<SyncOutlined />} onClick={handleRefreshPreview} />
          </Tooltip>
          <Tooltip title="Recargar plantillas">
            <Button size="small" icon={<ReloadOutlined />} onClick={onRefresh} />
          </Tooltip>
          <Tooltip title="Cargar Esquema JSON">
            <Upload accept="application/json,.json" showUploadList={false} beforeUpload={handleCargarEsquema}>
              <Button size="small" icon={<UploadOutlined />} />
            </Upload>
          </Tooltip>
          {config.esquema !== undefined && (
            <Tag color="green" style={{ margin: 0, fontSize: 11 }}>
              Esquema: {rutasEsquema.length} campos
            </Tag>
          )}
          <Tooltip title="Ver JSON Config">
            <Button size="small" icon={<CodeOutlined />} onClick={handleVerJsonConfig} />
          </Tooltip>
          <Tooltip title="Ver JSON Payload">
            <Button size="small" icon={<FileTextOutlined />} loading={loadingPayload} onClick={handleVerJsonPayload} />
          </Tooltip>
          <Button size="small" type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleGuardar}>
            Guardar
          </Button>
          {dirty && (
            <Button size="small" danger icon={<RollbackOutlined />} onClick={() => { setConfig({ ...configInicial }); setPreviewConfig({ ...configInicial }); message.info('Cambios descartados'); }}>
              Descartar
            </Button>
          )}
        </div>
      </Card>

      {!plantillaActual && (
        <Alert type="info" message="Selecciona una plantilla para comenzar a editarla" showIcon style={{ marginBottom: 16 }} />
      )}

      <div className="rc-editor-secciones">
        <div className="rc-editor-seccion rc-editor-seccion-campos">
          {/* Zonas */}
          {zonas.map((zona, zIdx) => {
            const colapsada = zonasColapsadas[zona.id] === true;

            return (
              <Card key={zona.id} className={`paces-card-erp rc-zona ${!colapsada ? 'is-activa' : ''}`}
                style={{ borderRadius: 8, marginBottom: 16 }}
                title={
                  <div className="rc-zona-header" onClick={() => toggleZona(zona.id)}>
                    <span style={{ color: '#556ee6', marginRight: 4 }}>{ICONO_ZONA[zona.tipo] || <SettingOutlined />}</span>
                    <Input size="small" style={{ width: 140, fontWeight: 600 }} bordered={false}
                      value={zona.nombre || ''}
                      placeholder={LABEL_ZONA[zona.tipo]}
                      onChange={(e) => setZonaNombre(zIdx, e.target.value)}
                      onClick={(e: any) => e.stopPropagation()} />
                    <Tooltip title="Alinea las líneas editables de esta zona. Las columnas del detalle y cabecera usan su propia alineación.">
                      <Segmented
                        size="small"
                        value={zona.alineacion || 'izquierda'}
                        onChange={(v) => setZonaAlineacion(zIdx, v as AlineacionTicket)}
                        onClick={(e: any) => e.stopPropagation()}
                        options={[
                          { value: 'izquierda', icon: <AlignLeftOutlined />, title: 'Izquierda' },
                          { value: 'centro', icon: <AlignCenterOutlined />, title: 'Centro' },
                          { value: 'derecha', icon: <AlignRightOutlined />, title: 'Derecha' },
                        ]}
                      />
                    </Tooltip>
                    <Text type="secondary" style={{ fontSize: 12 }}>{zona.lineas.length} líneas</Text>
                    <div className="rc-zona-header-actions" onClick={(e: any) => e.stopPropagation()}>
                      <Button size="small" type="text" icon={colapsada ? <RightOutlined /> : <DownOutlined />}
                        onClick={() => toggleZona(zona.id)} />
                      <Tooltip title="Mover arriba">
                        <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={zIdx === 0} onClick={() => moverZona(zIdx, -1)} />
                      </Tooltip>
                      <Tooltip title="Mover abajo">
                        <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={zIdx === zonas.length - 1} onClick={() => moverZona(zIdx, 1)} />
                      </Tooltip>
                      <Tooltip title="Eliminar zona">
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => quitarZona(zIdx)} />
                      </Tooltip>
                    </div>
                  </div>
                }
              >
                {!colapsada && (
                  <div className="rc-zona-body">
                    {/* Campo arrayOrigen para zonas de detalle */}
                    {zona.tipo === 'detalle' && (
                      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>Origen array:</Text>
                        <Select size="small" style={{ width: 260 }} bordered={false}
                          value={zona.arrayOrigen || undefined}
                          placeholder={rutasArrayEsquema.length > 0 ? 'Seleccione un array…' : 'No hay arrays en el esquema'}
                          options={rutasArrayEsquema.map((r) => ({ label: r, value: r }))}
                          allowClear
                          onChange={(v) => setZonaArrayOrigen(zIdx, v || '')}
                          onClick={(e: any) => e.stopPropagation()} />
                      </div>
                    )}

                    {/* Lineas de la zona */}
                    {zona.lineas.length === 0 && (
                      <div className="rc-zona-vacia">
                        Zona vacía — agregue líneas con el botón de abajo
                      </div>
                    )}
                    {zona.lineas.map((linea, lIdx) => <FilaLinea key={`${zIdx}-${lIdx}`} zonaIdx={zIdx} lineaIdx={lIdx} linea={linea} zonaLineas={zona.lineas} tipo={zona.tipo} esActiva={lineaActiva?.zonaIdx === zIdx && lineaActiva?.lineaIdx === lIdx} onSeleccionarLinea={() => setLineaActiva({ zonaIdx: zIdx, lineaIdx: lIdx })} />)}

                    {/* Boton agregar linea */}
                    <div className="rc-zona-agregar-linea">
                      <Dropdown menu={{
                        items: (() => {
                          const items: any[] = [];

                          // 1. Separadores
                          const separadoresChildren = [
                            { key: 'ESPACIO', icon: iconoLinea('ESPACIO'), label: labelRef('ESPACIO'), onClick: () => agregarLinea(zIdx, 'ESPACIO') },
                            { key: 'SEPARADOR', icon: iconoLinea('SEPARADOR'), label: labelRef('SEPARADOR'), onClick: () => agregarLinea(zIdx, 'SEPARADOR') },
                            { key: 'CAMPO:CODIGO_QR', icon: iconoLinea('CAMPO:CODIGO_QR'), label: labelRef('CAMPO:CODIGO_QR'), onClick: () => agregarLinea(zIdx, 'CAMPO:CODIGO_QR') },
                          ];
                          items.push({ key: 'separadores', label: 'Separadores', icon: <LineOutlined />, children: separadoresChildren });

                          // 2. Detalle
                          const detalleChildren = Object.keys(CAMPOS_DETALLE_LABELS).map((k) => {
                            const ref = `DETALLE:${k}`;
                            return { key: ref, icon: iconoLinea(ref), label: labelRef(ref), onClick: () => agregarLinea(zIdx, ref) };
                          });
                          if (detalleChildren.length > 0) {
                            items.push({ key: 'detalle', label: 'Detalle', icon: <TableOutlined />, children: detalleChildren });
                          }

                          // 3. Campos (incluye CAMPO:TITULO)
                          const camposChildren = Object.keys(labelsDefault).map((k) => {
                            const ref = `CAMPO:${k}`;
                            return { key: ref, icon: iconoLinea(ref), label: labelRef(ref), onClick: () => agregarLinea(zIdx, ref) };
                          });
                          if (camposChildren.length > 0) {
                            items.push({ key: 'campos', label: 'Campos', icon: <EditOutlined />, children: camposChildren });
                          }

                          // 4. Totales
                          const totalesChildren = ['TOTAL:TOTAL_GRAVADO', 'TOTAL:SUBTOTAL', 'TOTAL:ITBIS', 'TOTAL:DESCUENTO', 'TOTAL:TOTAL', 'TOTAL:TOTAL_EXENTO'].map((ref) => {
                            return { key: ref, icon: iconoLinea(ref), label: labelRef(ref), onClick: () => agregarLinea(zIdx, ref) };
                          });
                          if (totalesChildren.length > 0) {
                            items.push({ key: 'totales', label: 'Totales', icon: <CalculatorOutlined />, children: totalesChildren });
                          }

                          // 5. Cobros
                          const cobrosChildren = ['COBRO:EFECTIVO', 'COBRO:CHEQUE', 'COBRO:TARJETA_CREDITO', 'COBRO:TARJETA_DEBITO', 'COBRO:TRANSFERENCIA', 'COBRO:BONO', 'COBRO:TARJETA_REGALO', 'COBRO:NOTA_CREDITO', 'COBRO:DEVUELTA'].map((ref) => {
                            return { key: ref, icon: iconoLinea(ref), label: labelRef(ref), onClick: () => agregarLinea(zIdx, ref) };
                          });
                          if (cobrosChildren.length > 0) {
                            items.push({ key: 'cobros', label: 'Cobros', icon: <WalletOutlined />, children: cobrosChildren });
                          }

                          // 6. Esquema (campo del JSON de ejemplo importado; la propiedad se elige en Propiedades)
                          if (rutasEsquema.length > 0) {
                            const ref = `ESQUEMA:${rutasEsquema[0]}`;
                            items.push({ key: 'esquema', label: 'Campo de esquema', icon: <ApartmentOutlined />, onClick: () => agregarLinea(zIdx, ref) });
                          }

                          // 7. Especiales (Texto libre, Campo DTO y Firma)
                          const especialesChildren = [
                            { key: 'TEXTO_LIBRE', icon: <FontSizeOutlined />, label: 'Texto libre', onClick: () => abrirModalLibre(undefined, zIdx) },
                            { key: 'CAMPO_DTO', icon: <DatabaseOutlined />, label: 'Campo DTO', onClick: () => abrirModalDTO(undefined, zIdx) },
                            { key: 'FIRMA', icon: <SignatureOutlined />, label: 'Firma', onClick: () => abrirModalFirma(undefined, zIdx) },
                          ];
                          items.push({ key: 'especiales', label: 'Especiales', icon: <AppstoreOutlined />, children: especialesChildren });

                          return items;
                        })(),
                      }} trigger={['click']} overlayStyle={{ maxHeight: 480, overflow: 'auto' }}>
                        <Button type="dashed" size="small" icon={<PlusOutlined />} block>
                          Agregar línea
                        </Button>
                      </Dropdown>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          {/* Boton agregar zona */}
          <div style={{ marginBottom: 16 }}>
            <Dropdown menu={menuAgregarZona} trigger={['click']}>
              <Button type="dashed" icon={<PlusOutlined />} block>
                Agregar zona
              </Button>
            </Dropdown>
          </div>

          {/* Pie y opciones (card fija al final) */}
          <Card className="paces-card-erp paces-card-erp-padded" style={{ borderRadius: 8, marginBottom: 16 }}
            title={<Space size={6}><SettingOutlined /><span>Opciones de impresión</span></Space>}>
            <Row gutter={[16, 12]}>
              <Col xs={12} md={8}>
                <Text style={{ display: 'block', marginBottom: 4 }}>Ancho de línea</Text>
                <Select<AnchoLineaTicket> style={{ width: '100%' }}
                  value={config.opciones?.anchoLinea ?? 48}
                  options={ANCHO_LINEA_OPCIONES.map((w) => ({ label: `${w} caracteres`, value: w }))}
                  onChange={setAnchoLinea} />
              </Col>
              <Col xs={12} md={8}>
                <Text style={{ display: 'block', marginBottom: 4 }}>Feed antes del corte</Text>
                <InputNumber style={{ width: '100%' }} min={0} max={10}
                  value={config.opciones?.feedCorte ?? 4} onChange={setFeedCorte} />
              </Col>
              <Col xs={12} md={8}>
                <Text style={{ display: 'block', marginBottom: 4 }}>Fuente del preview</Text>
                <Select<string>
                  size="small"
                  style={{ width: 160 }}
                  value={config.opciones?.fontFamily ?? 'Courier New'}
                  onChange={setFontFamily}
                  options={[
                    { label: 'Courier New', value: 'Courier New' },
                    { label: 'Consolas', value: 'Consolas' },
                    { label: 'Lucida Console', value: 'Lucida Console' },
                    { label: 'Segoe UI Mono', value: 'Segoe UI Mono' },
                  ]}
                />
              </Col>
            </Row>
            <Divider style={{ margin: '16px 0' }} />
            <Row gutter={[16, 12]}>
              {(['compania', 'direccion', 'telefono', 'rnc'] as const).map((k) => (
                <Col xs={12} md={6} key={k}>
                  <FilaFormato label={{ compania: 'Compañía', direccion: 'Dirección', telefono: 'Teléfono', rnc: 'RNC' }[k]}
                    formato={encFormato?.[k]} onAplicar={(f) => setEncabezadoFormato(k, f)} />
                </Col>
              ))}
            </Row>
            <Divider style={{ margin: '16px 0' }} />
            {/* Logo configurable por plantilla */}
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong>Logo</Text>
                <Switch checked={config.logo?.mostrar ?? false} onChange={(v) => setLogo({ mostrar: v })} />
                <Text type="secondary" style={{ fontSize: 12 }}>Mostrar logo al inicio del ticket</Text>
              </div>
              {config.logo?.mostrar && (
                <>
                  <Row gutter={[16, 12]}>
                    <Col xs={24} md={8}>
                      <Text style={{ display: 'block', marginBottom: 4 }}>Imagen (PNG/JPG)</Text>
                      <Upload
                        accept="image/png,image/jpeg"
                        showUploadList={false}
                        beforeUpload={(file) => {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setLogo({ base64: String(reader.result) });
                          };
                          reader.readAsDataURL(file);
                          return false; // no subir al servidor
                        }}
                      >
                        <Button icon={<UploadOutlined />}>Subir logo</Button>
                      </Upload>
                    </Col>
                    <Col xs={12} md={4}>
                      <Text style={{ display: 'block', marginBottom: 4 }}>Ancho del logo (px)</Text>
                      <InputNumber style={{ width: '100%' }} min={100} max={576}
                        value={config.logo?.anchoPx ?? 384}
                        onChange={(v) => setLogo({ anchoPx: v ?? 384 })} />
                    </Col>
                    <Col xs={12} md={4}>
                      <Text style={{ display: 'block', marginBottom: 4 }}>Alto del logo (px)</Text>
                      <InputNumber style={{ width: '100%' }} min={20} max={500}
                        value={config.logo?.altoPx ?? 120}
                        onChange={(v) => setLogo({ altoPx: v ?? 120 })} />
                    </Col>
                    <Col xs={24} md={8}>
                      <Text style={{ display: 'block', marginBottom: 4 }}>Alineación</Text>
                      <Segmented
                        value={config.logo?.alineacion ?? 'centro'}
                        onChange={(v) => setLogo({ alineacion: v as AlineacionTicket })}
                        options={[
                          { label: <><AlignLeftOutlined /> Izq</>, value: 'izquierda' },
                          { label: <><AlignCenterOutlined /> Centro</>, value: 'centro' },
                          { label: <><AlignRightOutlined /> Der</>, value: 'derecha' },
                        ]}
                      />
                    </Col>
                  </Row>
                  <Row gutter={[16, 12]}>
                    <Col xs={24} md={24}>
                      <Text style={{ display: 'block', marginBottom: 4 }}>URL del logo (opcional)</Text>
                      <Input placeholder="Ej: /images/visanet.png"
                        value={config.logo?.url ?? ''}
                        onChange={(e) => setLogo({ url: e.target.value || undefined })} />
                    </Col>
                  </Row>
                </>
              )}
              {(config.logo?.base64 || config.logo?.url) && (
                <div style={{ textAlign: 'center', padding: 8, background: '#fafafa', borderRadius: 4 }}>
                  <img
                    src={config.logo.base64
                      ? (config.logo.base64.startsWith('data:') ? config.logo.base64 : `data:image/png;base64,${config.logo.base64}`)
                      : config.logo.url}
                    alt="Logo"
                    style={{ maxWidth: (config.logo?.anchoPx ?? 384), maxHeight: (config.logo?.altoPx ?? 120), objectFit: 'contain' }}
                  />
                </div>
              )}
            </Space>
          </Card>
        </div>

        {/* Panel de propiedades */}
        <div className="rc-editor-seccion rc-editor-seccion-propiedades">
          <Card className="paces-card-erp paces-card-erp-padded" style={{ borderRadius: 8, position: isLarge ? 'sticky' : undefined, top: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Propiedades</span>
              {lineaActiva && <Button size="small" type="text" onClick={() => setLineaActiva(null)}>×</Button>}
            </div>
            {lineaActiva ? (() => {
              const zona = config.zonas?.[lineaActiva.zonaIdx];
              const linea = zona?.lineas[lineaActiva.lineaIdx];
              if (!linea) return <Text type="secondary">Línea no encontrada</Text>;
              const ref = linea.ref;
              const esCampo = ref.startsWith('CAMPO:');
              const esTotal = ref.startsWith('TOTAL:');
              const esCobro = ref.startsWith('COBRO:');
              const esSeparador = ref === 'SEPARADOR';
              const esEspacio = ref === 'ESPACIO';
              const esDetalle = ref.startsWith('DETALLE:');
              const esEsquema = ref.startsWith('ESQUEMA:');
              const tieneLabel = !esEspacio && !esSeparador && ref !== 'CAMPO:CODIGO_QR' && ref !== 'CAMPO:CODIGO_BARRAS';
              const puedeVincularEsquema = tieneLabel && rutasEsquema.length > 0;
              const clave = ref.includes(':') ? ref.slice(ref.indexOf(':') + 1) : '';
              const labelDefault = esCampo ? (labelsDefault[clave] || clave) : esEsquema && linea.calculo ? `${VERBOS_CALCULO[linea.calculo.tipo]} ${linea.calculo.ruta}` : esDetalle ? (CAMPOS_DETALLE_LABELS[clave] || clave) : labelRef(ref);

              return (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>Referencia</Text>
                    <Select size="small" style={{ width: '100%', marginTop: 2 }} value={ref.startsWith('LIBRE:') ? 'texto_libre' : 'referencia'} onChange={(v) => {
                      if (v === 'texto_libre') {
                        const nuevoId = `LIBRE-${Date.now()}`;
                        updZonaLineas(lineaActiva.zonaIdx, (l) => {
                          l[lineaActiva.lineaIdx] = { ...l[lineaActiva.lineaIdx], ref: `LIBRE:${nuevoId}` } as any;
                          return l;
                        });
                      }
                    }} options={[{ label: 'Referencia', value: 'referencia' }, { label: 'Texto libre', value: 'texto_libre' }]} />
                    {ref.startsWith('LIBRE:') ? (
                      <div style={{ marginTop: 6 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Contenido libre</Text>
                        <Input.TextArea rows={3} style={{ width: '100%', marginTop: 2 }} value={(textoLibrePorId(ref.slice('LIBRE:'.length))?.texto || '')} onChange={(e) => setContenidoLibre(lineaActiva.zonaIdx, lineaActiva.lineaIdx, e.target.value)} placeholder="Escribe el texto libre (Enter para varias líneas)..." />
                      </div>
                    ) : (
                      <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#556ee6', marginTop: 2 }}>{ref}</div>
                    )}
                    {puedeVincularEsquema && (
                      <div style={{ marginTop: 6 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Campo del esquema</Text>
                        <Select
                          size="small"
                          style={{ width: '100%', marginTop: 2 }}
                          showSearch
                          optionFilterProp="label"
                          placeholder={esEsquema ? undefined : 'Asociar campo del esquema…'}
                          value={esEsquema ? clave : undefined}
                          onChange={(v) => updZonaLineas(lineaActiva.zonaIdx, (l) => {
                            l[lineaActiva.lineaIdx] = { ...l[lineaActiva.lineaIdx], ref: `ESQUEMA:${v}` } as any;
                            return l;
                          })}
                          options={rutasEsquema.map((r) => ({ label: r, value: r }))}
                        />
                      </div>
                    )}
                    {esEsquema && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>Campo calculado</Text>
                          <Switch size="small" checked={!!linea.calculo} onChange={(v) => setLineaCalculo(lineaActiva.zonaIdx, lineaActiva.lineaIdx, v ? { tipo: 'SUM', ruta: rutasArrayEsquema.includes(clave) ? clave : (rutasArrayEsquema[0] || '') } : null)} />
                        </div>
                        {linea.calculo && (
                          <Space direction="vertical" style={{ width: '100%', marginTop: 4 }} size={4}>
                            <Text type="secondary" style={{ fontSize: 11 }}>Operación</Text>
                            <Select size="small" style={{ width: '100%' }} value={linea.calculo.tipo}
                              onChange={(tipo) => setLineaCalculo(lineaActiva.zonaIdx, lineaActiva.lineaIdx, { ...linea.calculo, tipo })}
                              options={OPCIONES_CALCULO} />
                            <Text type="secondary" style={{ fontSize: 11 }}>Ruta (array del esquema)</Text>
                            <Select size="small" style={{ width: '100%' }} showSearch optionFilterProp="label" value={linea.calculo.ruta}
                              onChange={(ruta) => setLineaCalculo(lineaActiva.zonaIdx, lineaActiva.lineaIdx, { ...linea.calculo, ruta })}
                              options={rutasArrayEsquema.map((r) => ({ label: r, value: r }))} placeholder={rutasArrayEsquema.length > 0 ? 'Seleccione un array…' : 'No hay arrays en el esquema'} />
                          </Space>
                        )}
                      </div>
                    )}
                  </div>

                  <Divider style={{ margin: '4px 0' }} />

                  <div>
                    <Text strong style={{ fontSize: 12 }}>Etiqueta</Text>
                    <Space direction="vertical" style={{ width: '100%', marginTop: 6 }} size={6}>
                      <Input size="small" style={{ width: '100%' }} value={linea.label || ''}
                        onChange={(e) => setLineaLabel(lineaActiva.zonaIdx, lineaActiva.lineaIdx, e.target.value)}
                        placeholder={labelDefault} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Switch size="small" checked={linea.mostrarLabel !== false} onChange={(v) => setLineaMostrarLabel(lineaActiva.zonaIdx, lineaActiva.lineaIdx, v)} />
                        <span style={{ fontSize: 12 }}>Mostrar</span>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>Alineación</Text>
                        <Space size={4} style={{ marginTop: 2 }}>
                          <Button size="small" type={linea.formatoLabel?.alineacion === 'izquierda' ? 'primary' : 'default'} icon={<AlignLeftOutlined />} onClick={() => setLineaFormatoLabel(lineaActiva.zonaIdx, lineaActiva.lineaIdx, { ...linea.formatoLabel, alineacion: 'izquierda' } as FormatoItemTicket)} />
                          <Button size="small" type={linea.formatoLabel?.alineacion === 'centro' ? 'primary' : 'default'} icon={<AlignCenterOutlined />} onClick={() => setLineaFormatoLabel(lineaActiva.zonaIdx, lineaActiva.lineaIdx, { ...linea.formatoLabel, alineacion: 'centro' } as FormatoItemTicket)} />
                          <Button size="small" type={linea.formatoLabel?.alineacion === 'derecha' ? 'primary' : 'default'} icon={<AlignRightOutlined />} onClick={() => setLineaFormatoLabel(lineaActiva.zonaIdx, lineaActiva.lineaIdx, { ...linea.formatoLabel, alineacion: 'derecha' } as FormatoItemTicket)} />
                        </Space>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>Estilo</Text>
                        <Space size={4} style={{ marginTop: 2 }}>
                          <Button size="small" type={linea.formatoLabel?.negrita ? 'primary' : 'default'} onClick={() => setLineaFormatoLabel(lineaActiva.zonaIdx, lineaActiva.lineaIdx, { ...linea.formatoLabel, negrita: !linea.formatoLabel?.negrita } as FormatoItemTicket)}>N</Button>
                        </Space>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>Tamaño</Text>
                        <Select size="small" style={{ width: '100%', marginTop: 2 }} value={linea.formatoLabel?.tamano || 'normal'}
                          onChange={(v) => setLineaFormatoLabel(lineaActiva.zonaIdx, lineaActiva.lineaIdx, { ...linea.formatoLabel, tamano: v } as FormatoItemTicket)}
                          options={[
                            { label: 'Normal', value: 'normal' },
                            { label: 'Doble', value: 'doble' },
                            { label: 'Doble alto', value: 'doble_altura' },
                            { label: 'Doble ancho', value: 'doble_ancho' },
                            { label: 'Triple', value: 'triple' },
                            { label: 'Condensada', value: 'condensada' },
                          ]} />
                      </div>
                    </Space>
                  </div>

                  <Divider style={{ margin: '4px 0' }} />

                  <div>
                    <Text strong style={{ fontSize: 12 }}>Valor</Text>
                    <Space direction="vertical" style={{ width: '100%', marginTop: 6 }} size={6}>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>Tipo de dato</Text>
                        <Select size="small" style={{ width: '100%', marginTop: 2 }} value={linea.tipoDato || 'texto'}
                          onChange={(v) => updZonaLineas(lineaActiva.zonaIdx, (l) => { l[lineaActiva.lineaIdx] = { ...l[lineaActiva.lineaIdx], tipoDato: v } as any; return l; })}
                          options={[
                            { label: 'Texto', value: 'texto' },
                            { label: 'Fecha', value: 'fecha' },
                            { label: 'Número', value: 'numero' },
                            { label: 'Dinero', value: 'dinero' },
                          ]} />
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>Formato</Text>
                        <Input size="small" style={{ width: '100%', marginTop: 2 }} value={linea.formatoDato || ''}
                          onChange={(e) => updZonaLineas(lineaActiva.zonaIdx, (l) => { l[lineaActiva.lineaIdx] = { ...l[lineaActiva.lineaIdx], formatoDato: e.target.value } as any; return l; })}
                          placeholder={linea.tipoDato === 'fecha' ? 'dd/MM/yyyy' : '#,##0.00'} />
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>Alineación</Text>
                        <Space size={4} style={{ marginTop: 2 }}>
                          <Button size="small" type={linea.formatoValor?.alineacion === 'izquierda' || (!linea.formatoValor && linea.formato?.alineacion === 'izquierda') ? 'primary' : 'default'} icon={<AlignLeftOutlined />} onClick={() => setLineaFormatoValor(lineaActiva.zonaIdx, lineaActiva.lineaIdx, { ...linea.formatoValor, alineacion: 'izquierda' } as FormatoItemTicket)} />
                          <Button size="small" type={linea.formatoValor?.alineacion === 'centro' || (!linea.formatoValor && linea.formato?.alineacion === 'centro') ? 'primary' : 'default'} icon={<AlignCenterOutlined />} onClick={() => setLineaFormatoValor(lineaActiva.zonaIdx, lineaActiva.lineaIdx, { ...linea.formatoValor, alineacion: 'centro' } as FormatoItemTicket)} />
                          <Button size="small" type={linea.formatoValor?.alineacion === 'derecha' || (!linea.formatoValor && linea.formato?.alineacion === 'derecha') ? 'primary' : 'default'} icon={<AlignRightOutlined />} onClick={() => setLineaFormatoValor(lineaActiva.zonaIdx, lineaActiva.lineaIdx, { ...linea.formatoValor, alineacion: 'derecha' } as FormatoItemTicket)} />
                        </Space>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>Estilo</Text>
                        <Space size={4} style={{ marginTop: 2 }}>
                          <Button size="small" type={linea.formatoValor?.negrita || linea.formato?.negrita ? 'primary' : 'default'} onClick={() => setLineaFormatoValor(lineaActiva.zonaIdx, lineaActiva.lineaIdx, { ...linea.formatoValor, negrita: !linea.formatoValor?.negrita } as FormatoItemTicket)}>N</Button>
                        </Space>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>Tamaño</Text>
                        <Select size="small" style={{ width: '100%', marginTop: 2 }} value={linea.formatoValor?.tamano || linea.formato?.tamano || 'normal'}
                          onChange={(v) => setLineaFormatoValor(lineaActiva.zonaIdx, lineaActiva.lineaIdx, { ...linea.formatoValor, tamano: v } as FormatoItemTicket)}
                          options={[
                            { label: 'Normal', value: 'normal' },
                            { label: 'Doble', value: 'doble' },
                            { label: 'Doble alto', value: 'doble_altura' },
                            { label: 'Doble ancho', value: 'doble_ancho' },
                            { label: 'Triple', value: 'triple' },
                            { label: 'Condensada', value: 'condensada' },
                          ]} />
                      </div>
                    </Space>
                  </div>

                  <Divider style={{ margin: '4px 0' }} />

                  <div>
                    <Text strong style={{ fontSize: 12 }}>General</Text>
                    <Space direction="vertical" style={{ width: '100%', marginTop: 6 }} size={4}>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>Número de línea</Text>
                        <Select
                          size="small"
                          style={{ width: '100%', marginTop: 2 }}
                          value={linea.lineaNum ?? 1}
                          onChange={async (v) => {
                            await setLineaNum(lineaActiva.zonaIdx, lineaActiva.lineaIdx, v);
                          }}
                          options={Array.from({ length: getSiguienteLineaNum(lineaActiva.zonaIdx) + 2 }, (_, i) => ({
                            label: `Línea ${i + 1}`,
                            value: i + 1,
                          }))}
                          dropdownRender={(menu) => (
                            <>
                              {menu}
                              <Divider style={{ margin: '4px 0' }} />
                              <Button size="small" type="link" icon={<PlusOutlined />} style={{ padding: '0 8px' }}
                                onClick={() => {
                                  const sig = getSiguienteLineaNum(lineaActiva.zonaIdx);
                                  setLineaNum(lineaActiva.zonaIdx, lineaActiva.lineaIdx, sig);
                                }}>
                                Nueva línea {getSiguienteLineaNum(lineaActiva.zonaIdx)}
                              </Button>
                            </>
                          )}
                        />
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>Tipo de ancho</Text>
                        <Select<TipoAnchoCampo>
                          size="small"
                          style={{ width: '100%', marginTop: 2 }}
                          value={linea.anchoTipo ?? 'porcentual'}
                          onChange={(v) => {
                            const maximo = v === 'fijo' ? (config.opciones?.anchoLinea ?? 48) : 100;
                            updZonaLineas(lineaActiva.zonaIdx, (l) => {
                              l[lineaActiva.lineaIdx] = { ...l[lineaActiva.lineaIdx], anchoTipo: v, anchoValor: v === 'porcentual' ? 100 : maximo };
                              return l;
                            });
                          }}
                          options={[
                            { label: 'Porcentual (%)', value: 'porcentual' },
                            { label: 'Fijo (caracteres)', value: 'fijo' },
                          ]}
                        />
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          Ancho {linea.anchoTipo === 'fijo' ? '(caracteres)' : '(%)'}
                        </Text>
                        <InputNumber
                          size="small"
                          min={5}
                          max={linea.anchoTipo === 'fijo' ? (config.opciones?.anchoLinea ?? 48) : 100}
                          style={{ width: '100%', marginTop: 2 }}
                          value={linea.anchoValor ?? (() => {
                            const enLinea = (config.zonas?.[lineaActiva.zonaIdx]?.lineas ?? []).filter(l => l.lineaNum === linea.lineaNum);
                            return enLinea.length <= 1 ? 100 : Math.round(100 / enLinea.length);
                          })()}
                          onChange={(v) => {
                            updZonaLineas(lineaActiva.zonaIdx, (l) => {
                              l[lineaActiva.lineaIdx] = { ...l[lineaActiva.lineaIdx], anchoValor: v ?? undefined };
                              return l;
                            });
                          }}
                        />
                      </div>
                      {(() => {
                        const anchoPagina = config.opciones?.anchoLinea ?? 48;
                        const totalFijo = (config.zonas?.[lineaActiva.zonaIdx]?.lineas ?? [])
                          .filter((item) =>
                            item.lineaNum === linea.lineaNum &&
                            item.anchoTipo === 'fijo' &&
                            item.ref !== 'ESPACIO' &&
                            item.ref !== 'SEPARADOR')
                          .reduce((total, item) => total + (item.anchoValor ?? 0), 0);

                        return totalFijo > anchoPagina ? (
                          <Text type="warning" style={{ display: 'block', fontSize: 11 }}>
                            Los anchos fijos suman {totalFijo} y exceden el ancho de linea ({anchoPagina}). Al imprimir se repartiran proporcionalmente.
                          </Text>
                        ) : null;
                      })()}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Switch size="small" checked={!!linea.tabular} onChange={(v) => setLineaTabular(lineaActiva.zonaIdx, lineaActiva.lineaIdx, v)} />
                        <span style={{ fontSize: 12 }}>Espacio label-valor</span>
                        {linea.tabular && (
                          <InputNumber size="small" min={1} max={48} style={{ width: 50, marginLeft: 4 }}
                            value={linea.tabular.ancho ?? 12}
                            onChange={(v) => setLineaTabular(lineaActiva.zonaIdx, lineaActiva.lineaIdx, true, v ?? 12)} />
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Switch size="small" checked={!!linea.ocultarSiVacio} onChange={(v) => updZonaLineas(lineaActiva.zonaIdx, (l) => { l[lineaActiva.lineaIdx] = { ...l[lineaActiva.lineaIdx], ocultarSiVacio: v || undefined }; return l; })} />
                        <span style={{ fontSize: 12 }}>Ocultar si vacío</span>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>Ubicación (padding izq)</Text>
                        <InputNumber size="small" min={0} max={48} style={{ width: 60, marginTop: 2 }}
                          value={(linea as any).margen ?? 0}
                          onChange={(v) => updZonaLineas(lineaActiva.zonaIdx, (l) => { l[lineaActiva.lineaIdx] = { ...l[lineaActiva.lineaIdx], margen: v ?? 0 } as any; return l; })} />
                      </div>
                    </Space>
                  </div>

                  <Divider style={{ margin: '4px 0' }} />

                  <Space>
                    <Button size="small" icon={<ArrowUpOutlined />} disabled={lineaActiva.lineaIdx === 0}
                      onClick={() => moverLinea(lineaActiva.zonaIdx, lineaActiva.lineaIdx, -1)} />
                    <Button size="small" icon={<ArrowDownOutlined />} disabled={lineaActiva.lineaIdx === (config.zonas?.[lineaActiva.zonaIdx]?.lineas.length ?? 0) - 1}
                      onClick={() => moverLinea(lineaActiva.zonaIdx, lineaActiva.lineaIdx, 1)} />
                    <Button size="small" danger icon={<DeleteOutlined />}
                      onClick={() => { quitarLinea(lineaActiva.zonaIdx, lineaActiva.lineaIdx); setLineaActiva(null); }} />
                  </Space>
                </Space>
              );
})() : (
              <Text type="secondary">Selecciona una línea para editar sus propiedades</Text>
            )}
          </Card>
        </div>

        {/* Vista previa */}
        <div className="rc-editor-seccion rc-editor-seccion-preview">
          <Card className="paces-card-erp paces-card-erp-padded"
            style={{ borderRadius: 8, position: isLarge ? 'sticky' : undefined, top: 16 }}
            title={
  <Space size={6}>
    <EyeOutlined />
    <span>Vista previa</span>
    <Tag color="green">En vivo</Tag>
  </Space>
}
            extra={<Text type="secondary" style={{ fontSize: 12 }}>{esVSNT_ANULACION ? 'Anulación Visanet' : esVSNT_CIERRE ? 'Cierre Lote Visanet' : esVSNT ? 'Voucher Visanet' : esFRI ? 'Recibo Ingreso' : 'Factura POS'}</Text>}>
            {hayLineasEsquema && !config.esquema && (
              <Alert
                style={{ marginBottom: 12 }}
                type="warning"
                showIcon
                message="Esquema no cargado"
                description="Hay líneas ESQUEMA (incluidos campos calculados) pero aún no se ha cargado el JSON de ejemplo. Use 'Cargar esquema' para ver su contenido en la vista previa."
              />
            )}
                  <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
                    <div style={{
                      background: '#fff', width: `${anchoPapelPreview}px`, minWidth: `${anchoPapelPreview}px`, boxSizing: 'border-box', margin: '0 auto',
                      padding: '16px 20px', fontFamily: config.opciones?.fontFamily ? `'${config.opciones.fontFamily}', monospace` : "'Courier New', Courier, monospace", fontSize: TAMANO_FUENTE_PREVIEW, lineHeight: 1.2,
                      border: '1px solid #d9d9d9', borderRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    }} dangerouslySetInnerHTML={{ __html: frozenPreview }} />
                  </div>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <Tag color={esVSNT_CIERRE ? 'red' : esVSNT_ANULACION ? 'volcano' : esVSNT ? 'orange' : esFPV ? 'blue' : 'purple'}>{esVSNT_ANULACION ? 'VSNT_ANULACION' : esVSNT_CIERRE ? 'VSNT_CIERRE' : esVSNT ? 'VSNT_VOUCHER' : esFPV ? 'FPV_TICKET' : 'FRI_TICKET'}</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Última actualización: {detalle?.fechaActualizacion ? new Date(detalle.fechaActualizacion).toLocaleString('es-DO') : '—'}
              </Text>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal: texto libre */}
      <ModalTextoLibre
        open={modalLibreAbierto}
        editId={libreTempEditId}
        zonaIdx={libreTempZonaIdx}
        valorInicial={libreTempValorInicial}
        onGuardar={guardarLibre}
        onCancel={() => { setModalLibreAbierto(false); setLibreTempEditId(undefined); setLibreTempZonaIdx(undefined); }}
      />

      {/* Modal: firma */}
      <ModalFirma
        open={modalFirmaAbierto}
        editId={firmaTempEditId}
        valorInicial={firmaTempValorInicial}
        onGuardar={guardarFirma}
        onCancel={() => { setModalFirmaAbierto(false); setFirmaTempEditId(undefined); setFirmaTempZonaIdx(undefined); setFirmaTempValorInicial(undefined); }}
      />

      {/* Modal: campo DTO */}
      <Modal title={dtoTempEditId ? 'Editar campo DTO' : 'Agregar campo DTO'}
        open={modalDTOAbierto} onOk={guardarDTO}
        onCancel={() => { setModalDTOAbierto(false); setDtoTempEditId(undefined); setDtoTempZonaIdx(undefined); setDtoTempId(undefined); setDtoTempLabel(''); }}
        okText={dtoTempEditId ? 'Guardar' : 'Agregar'} width={480}>
        <div style={{ marginBottom: 12 }}>
          <Text style={{ display: 'block', marginBottom: 4 }}>Campo</Text>
          <Select style={{ width: '100%' }} placeholder="Seleccionar campo" value={dtoTempId}
            disabled={!!dtoTempEditId}
            onChange={(id) => { const item = catalogoDTO.find((c) => c.id === id); setDtoTempId(id); setDtoTempLabel(item?.label ?? ''); }}
            showSearch optionFilterProp="label"
            options={catalogoDTO.map((c) => ({ value: c.id, label: `${c.label} — ${c.ruta}` }))} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <Text style={{ display: 'block', marginBottom: 4 }}>Label mostrado</Text>
          <Input value={dtoTempLabel} onChange={(e) => setDtoTempLabel(e.target.value)} placeholder="Texto que se imprime antes del valor" />
        </div>
        <Divider style={{ margin: '12px 0' }} />
        <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>Formato del campo</Text>
        <FormatoToolbar
          formato={{
            alineacion: dtoTempAlineacion !== 'izquierda' ? dtoTempAlineacion : undefined,
            negrita: dtoTempNegritaTocada ? dtoTempNegrita : undefined,
            tamano: dtoTempTamano !== 'normal' ? dtoTempTamano : undefined,
          }}
          onChange={(f) => {
            setDtoTempAlineacion(f?.alineacion ?? 'izquierda');
            if (f?.negrita !== undefined) {
              setDtoTempNegrita(f.negrita);
              setDtoTempNegritaTocada(true);
            } else {
              setDtoTempNegrita(false);
              setDtoTempNegritaTocada(false);
            }
            setDtoTempTamano(f?.tamano ?? 'normal');
          }} />
      </Modal>

      {/* Modal: Ver JSON Config */}
      <Modal
        title="JSON Config"
        open={modalJsonConfigOpen}
        onCancel={() => setModalJsonConfigOpen(false)}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={() => handleCopiarJson(JSON.stringify(config, null, 2))}>
            Copiar
          </Button>,
          <Button key="close" onClick={() => setModalJsonConfigOpen(false)}>
            Cerrar
          </Button>,
        ]}
        width={800}
      >
        <Input.TextArea
          readOnly
          value={JSON.stringify(config, null, 2)}
          style={{ fontFamily: 'monospace', minHeight: 400 }}
          rows={20}
        />
      </Modal>

      {/* Modal: Ver JSON Payload */}
      <Modal
        title="JSON Payload"
        open={modalJsonPayloadOpen}
        onCancel={() => setModalJsonPayloadOpen(false)}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={() => handleCopiarJson(jsonPayloadContent)}>
            Copiar
          </Button>,
          <Button key="test" type="primary" onClick={handleProbarPayload}>
            Probar Impresión
          </Button>,
          <Button key="close" onClick={() => setModalJsonPayloadOpen(false)}>
            Cerrar
          </Button>,
        ]}
        width={800}
      >
        <Input.TextArea
          value={jsonPayloadContent}
          onChange={(e) => setJsonPayloadContent(e.target.value)}
          style={{ fontFamily: 'monospace', minHeight: 400 }}
          rows={20}
        />
      </Modal>
    </>
  );
};

export default ReportesConfigEditor;
