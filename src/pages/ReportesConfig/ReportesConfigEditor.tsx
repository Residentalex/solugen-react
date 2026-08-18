import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Card, Spin, Alert, Button, Switch, Select, Input, InputNumber, Tag, Row, Col, Grid, message, Modal, Tooltip, Typography, Divider, Space, Popover, Dropdown, Segmented, Radio, Upload,
} from 'antd';
import {
  ArrowUpOutlined, ArrowDownOutlined, SaveOutlined, UndoOutlined, RollbackOutlined, EyeOutlined, EyeInvisibleOutlined,
  ApartmentOutlined, ProfileOutlined, TableOutlined, CalculatorOutlined, WalletOutlined, SettingOutlined,
  LineOutlined, VerticalAlignMiddleOutlined, FontSizeOutlined, DatabaseOutlined, DeleteOutlined,
  EditOutlined, FormatPainterOutlined, PlusOutlined, DownOutlined, RightOutlined,   AppstoreOutlined,
  AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined, BoldOutlined,
  LinkOutlined, DisconnectOutlined, QrcodeOutlined, SyncOutlined, SignatureOutlined,
  UploadOutlined,
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
import { formatTicketPOS, formatTicketReciboIngreso, formatTicketVoucherVisanet } from '../../utils/escpos-formatter';

const { Text } = Typography;

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

interface ReportesConfigEditorProps { plantilla: ReportePlantillaListaDTO; onVolver: () => void; onGuardado: () => void; }

const ReportesConfigEditor: React.FC<ReportesConfigEditorProps> = ({ plantilla, onVolver, onGuardado }) => {
  const screens = Grid.useBreakpoint();
  const isLarge = screens.xxl === true;
  const esFPV = plantilla.codigo === CODIGO_PLANTILLA_FPV_TICKET;
  const esFRI = plantilla.codigo === CODIGO_PLANTILLA_FRI_TICKET;
  const esVSNT = plantilla.codigo === CODIGO_PLANTILLA_VSNT_VOUCHER;
  const esVSNT_ANULACION = plantilla.codigo === CODIGO_PLANTILLA_VSNT_ANULACION;
  const esVSNT_CIERRE = plantilla.codigo === CODIGO_PLANTILLA_VSNT_CIERRE;
  const esVSNT_PLANTILLA = esVSNT || esVSNT_ANULACION || esVSNT_CIERRE;

  const [detalle, setDetalle] = useState<ReportePlantillaDetalleDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [config, setConfig] = useState<PlantillaConfig>(() =>
    esVSNT_CIERRE ? normalizarConfigVSNT_CIERRE(null) : esVSNT_ANULACION ? normalizarConfigVSNT_ANULACION(null) : esVSNT ? normalizarConfigVSNT(null) : esFRI ? normalizarConfigRI(null) : normalizarConfig(null));
  const [configInicial, setConfigInicial] = useState<PlantillaConfig>(() =>
    esVSNT_CIERRE ? normalizarConfigVSNT_CIERRE(null) : esVSNT_ANULACION ? normalizarConfigVSNT_ANULACION(null) : esVSNT ? normalizarConfigVSNT(null) : esFRI ? normalizarConfigRI(null) : normalizarConfig(null));
  const [saving, setSaving] = useState(false);
  const [restableciendo, setRestableciendo] = useState(false);
  const [zonasColapsadas, setZonasColapsadas] = useState<Record<string, boolean>>({});

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

  const labelsDefault = esVSNT_PLANTILLA ? CAMPOS_TICKET_LABELS_VSNT : esFRI ? CAMPOS_TICKET_LABELS_RI : CAMPOS_TICKET_LABELS;
  const catalogoDTO = esVSNT_PLANTILLA ? CAMPOS_DTO_DISPONIBLES.VSNT : esFRI ? CAMPOS_DTO_DISPONIBLES.FRI : CAMPOS_DTO_DISPONIBLES.FPV;
  const normalizarSegunPlantilla = (cfg: PlantillaConfig | null | undefined): PlantillaConfig =>
    esVSNT_CIERRE ? normalizarConfigVSNT_CIERRE(cfg) : esVSNT_ANULACION ? normalizarConfigVSNT_ANULACION(cfg) : esVSNT ? normalizarConfigVSNT(cfg) : esFRI ? normalizarConfigRI(cfg) : normalizarConfig(cfg);

  useEffect(() => {
    let activo = true; setLoading(true); setLoadingError(false);
    reportesConfigApi.obtenerPorId(plantilla.plantillaId)
      .then((d) => { if (!activo) return; setDetalle(d); const cfg = normalizarSegunPlantilla(d.config); setConfig(cfg); setConfigInicial(cfg); setPreviewConfig({ ...cfg }); })
      .catch(() => { if (activo) setLoadingError(true); })
      .finally(() => { if (activo) setLoading(false); });
    return () => { activo = false; };
  }, [plantilla.plantillaId]);

  const tieneConfig = detalle?.config != null;
  const dirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(configInicial), [config, configInicial]);
  const anchoLineaPreview = config.opciones?.anchoLinea ?? 48;

  const [previewConfig, setPreviewConfig] = useState(config);
  const prevPreviewRef = useRef('');
  const configRef = useRef(config);
  configRef.current = config;

  const handleRefreshPreview = useCallback(() => {
    setPreviewConfig({ ...configRef.current });
  }, []);

  // Auto-refrescar preview solo al cerrar modales
  useEffect(() => {
    if (!modalLibreAbierto && !modalDTOAbierto && !modalFirmaAbierto) {
      setPreviewConfig({ ...configRef.current });
    }
  }, [modalLibreAbierto, modalDTOAbierto, modalFirmaAbierto]);

  // Sincronizar previewConfig cuando cambian propiedades del logo (no pasan por modales)
  useEffect(() => {
    setPreviewConfig({ ...config });
  }, [config.logo?.mostrar, config.logo?.base64, config.logo?.url, config.logo?.anchoPx, config.logo?.alineacion, config.logo?.altoPx]);

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
      const html = escposToHtml(raw);
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
    } catch { return prevPreviewRef.current; }
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

  const agregarLinea = (zIdx: number, ref: string) => {
    updZonaLineas(zIdx, (l) => [...l, { ref: ref as LineaZonaConfig['ref'] }]);
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
    updZonaLineas(zIdx, (l) => { l[lIdx] = { ...l[lIdx], label: label || undefined }; return l; });
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
    // Validaciones no bloqueantes
    if (!(config.zonas || []).some((z) => z.tipo === 'detalle')) message.warning('No hay zona de tipo "Detalle"');
    if (!(config.zonas || []).some((z) => z.tipo === 'totales')) message.warning('No hay zona de tipo "Totales"');
    setSaving(true);
    try {
      const toSave = (config.zonas && config.zonas.length > 0) ? config : null;
      const d = await reportesConfigApi.actualizarConfig(plantilla.plantillaId, toSave as any);
      limpiarCachePlantilla(); message.success('Configuración guardada correctamente');
      // Recargar desde API para confirmar persistencia
      setDetalle(d); const cfg = normalizarSegunPlantilla(d.config); setConfig(cfg); setConfigInicial(cfg);
      setPreviewConfig({ ...cfg });
      onGuardado();
    } catch (err: any) { message.error(err?.response?.data?.errorMessage || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleRestablecer = () => {
    Modal.confirm({
      title: 'Restablecer plantilla',
      content: `¿Desea restablecer "${plantilla.nombre}" a su configuración predeterminada?`,
      okText: 'Restablecer', okButtonProps: { danger: true }, cancelText: 'Cancelar',
      onOk: async () => {
        setRestableciendo(true);
        try {
          await reportesConfigApi.actualizarConfig(plantilla.plantillaId, null);
          limpiarCachePlantilla(); message.success('Plantilla restablecida');
          const d = await reportesConfigApi.obtenerPorId(plantilla.plantillaId);
          setDetalle(d); const cfg = normalizarSegunPlantilla(d.config); setConfig(cfg); setConfigInicial(cfg);
          onGuardado();
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
  if (loadingError || !detalle) {
    return <Card className="paces-card-erp paces-card-erp-padded" style={{ borderRadius: 8 }}>
      <Alert message="Error al cargar la plantilla" type="error" showIcon
        action={<Button size="small" onClick={onVolver}>Volver</Button>} />
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
    return ref;
  };

  /* ===== Componente FilaLinea: render unificado de linea ===== */
  const FilaLinea = React.memo(function FilaLinea({
    zonaIdx, lineaIdx, linea, zonaLineas, tipo,
  }: {
    zonaIdx: number; lineaIdx: number; linea: LineaZonaConfig;
    zonaLineas: LineaZonaConfig[]; tipo: TipoZonaTicket;
  }) {
    const ref = linea.ref;
    const esCampo = ref.startsWith('CAMPO:');
    const esTotal = ref.startsWith('TOTAL:');
    const esCobro = ref.startsWith('COBRO:');
    const tieneFormato = esCampo || esTotal || esCobro;
    const tieneTabular = esCampo || esTotal || esCobro;

    // Contenido variable segun tipo
    let contenido: React.ReactNode;
    let formato: React.ReactNode = null;
    let tabularControl: React.ReactNode = null;

    if (ref === 'ESPACIO') {
      contenido = (
        <Text>Espacio (línea en blanco)</Text>
      );
    } else if (ref === 'SEPARADOR') {
      const car = (linea as any).caracter || '-';
      contenido = (
        <>
          <Text>Separador</Text>
          <Select<CaracterSeparadorTicket> size="small" style={{ width: 80 }}
            value={car} onChange={(v) => setLineaSeparador(zonaIdx, lineaIdx, v)}
            options={[{ label: '─ (guion fino)', value: '─' as CaracterSeparadorTicket },
              { label: '- (guion)', value: '-' as CaracterSeparadorTicket },
              { label: '= (igual)', value: '=' as CaracterSeparadorTicket }]} />
          <Text type="secondary" style={{ fontSize: 11 }}>Margen</Text>
          <InputNumber size="small" min={0} max={48} style={{ width: 56 }}
            value={(linea as any).margen ?? 0}
            onChange={(v) => {
              updZonaLineas(zonaIdx, (l) => { l[lineaIdx] = { ...l[lineaIdx], margen: v ?? 0 } as any; return l; });
            }} />
          <Text type="secondary" style={{ fontSize: 11 }}>dots</Text>
        </>
      );
      formato = (
        <FormatoPopoverDual
          formatoLabel={linea.formato}
          formatoValor={undefined}
          onAplicarLabel={(f) => setLineaFormato(zonaIdx, lineaIdx, f)}
          onAplicarValor={() => {}}
          dual={false}
        />
      );
    } else if (ref === 'CAMPO:CODIGO_QR') {
      contenido = (
        <Text>Código QR (se imprime si hay datos disponibles)</Text>
      );
      formato = (
        <FormatoPopoverDual
          formatoLabel={linea.formato}
          formatoValor={undefined}
          onAplicarLabel={(f) => setLineaFormato(zonaIdx, lineaIdx, f)}
          onAplicarValor={() => {}}
          dual={false}
        />
      );
    } else if (ref.startsWith('LIBRE:')) {
      const id = ref.slice(6);
      const libreObj = textoLibrePorId(id);
      contenido = (
        <Input size="small" className="rc-zona-linea-input" value={libreObj?.texto ?? ''}
          onChange={(e) => {
            const t = e.target.value;
            setConfig((prev) => {
              const textos = { ...(prev.textosLibres || {}) };
              if (!t) delete textos[id];
              else textos[id] = { ...(textos[id] as any || {}), texto: t };
              return { ...prev, textosLibres: textos };
            });
          }}
          placeholder="Texto libre" />
      );
      formato = (
        <>
          {tagsFormato(libreObj)}
          <Tooltip title="Editar formato"><Button size="small" type="text" icon={<EditOutlined />} onClick={() => abrirModalLibre(id)} /></Tooltip>
        </>
      );
    } else if (ref.startsWith('DTO:')) {
      const id = ref.slice(6);
      const def = dtoDefPorId(id);
      contenido = (
        <div className="rc-zona-linea-label">
          <Text style={{ display: 'block' }}>{def?.label || 'Campo DTO'}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{def ? `${def.ruta} · ${def.tipo}` : 'Definición no encontrada'}</Text>
        </div>
      );
      formato = (
        <>
          {tagsFormato(def)}
          <Tooltip title="Editar formato"><Button size="small" type="text" icon={<EditOutlined />} onClick={() => abrirModalDTO(id)} /></Tooltip>
        </>
      );
    } else if (ref.startsWith('FIRMA:')) {
      const id = ref.slice(6);
      const firma = config.firmas?.[id];
      contenido = (
        <div className="rc-zona-linea-label">
          <Text style={{ display: 'block' }}>{firma?.texto || 'Firma'}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{firma ? (firma.linea === 'arriba' ? 'Línea de guiones arriba' : 'Línea de guiones al lado') : 'Definición no encontrada'}</Text>
        </div>
      );
      formato = (
        <>
          {firma && <Tag className="rc-campo-formato-tag">{firma.linea === 'arriba' ? 'Arriba' : 'Al lado'}</Tag>}
          <Tooltip title="Editar firma"><Button size="small" type="text" icon={<EditOutlined />} onClick={() => abrirModalFirma(id)} /></Tooltip>
        </>
      );
    } else if (ref.startsWith('DETALLE:')) {
      const clave = ref.slice(8);
      const labelDefault = CAMPOS_DETALLE_LABELS[clave] || clave;
      contenido = (
        <>
          <Tooltip title={linea.mostrarLabel !== false ? 'Ocultar label' : 'Mostrar label'}>
            <Button size="small" type="text"
              icon={linea.mostrarLabel !== false ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              onClick={(e) => { e.stopPropagation(); setLineaMostrarLabel(zonaIdx, lineaIdx, linea.mostrarLabel === false); }} />
          </Tooltip>
          <Input size="small" className="rc-zona-linea-input"
            value={linea.label || labelDefault}
            onChange={(e) => setLineaLabel(zonaIdx, lineaIdx, e.target.value)}
            placeholder={labelDefault} />
        </>
      );
      formato = (
        <FormatoPopoverDual
          formatoLabel={linea.formato}
          formatoValor={undefined}
          onAplicarLabel={(f) => setLineaFormato(zonaIdx, lineaIdx, f)}
          onAplicarValor={() => {}}
          dual={false}
        />
      );
      tabularControl = (
        <div className="rc-zona-tabular">
          <Switch size="small" checked={!!linea.tabular} onChange={(v) => setLineaTabular(zonaIdx, lineaIdx, v)} />
          {linea.tabular && (
            <InputNumber size="small" min={4} max={config.opciones?.anchoLinea ?? 48}
              value={linea.tabular.ancho ?? 12} style={{ width: 64 }}
              onChange={(v) => setLineaTabular(zonaIdx, lineaIdx, true, v ?? 12)} />
          )}
        </div>
      );
    } else {
      // CAMPO, TOTAL, COBRO
      const clave = ref.slice(ref.indexOf(':') + 1);
      const labelDefault = esCampo ? (labelsDefault[clave] || clave) : labelRef(ref);
      contenido = (
        <>
          <Tooltip title={linea.mostrarLabel !== false ? 'Ocultar label en el ticket' : 'Mostrar label en el ticket'}>
            <Button size="small" type="text"
              icon={linea.mostrarLabel !== false ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              onClick={(e) => { e.stopPropagation(); setLineaMostrarLabel(zonaIdx, lineaIdx, linea.mostrarLabel === false); }} />
          </Tooltip>
          <Input size="small" className="rc-zona-linea-input"
            value={linea.label || labelDefault}
            onChange={(e) => setLineaLabel(zonaIdx, lineaIdx, e.target.value)}
            placeholder={labelDefault} />
        </>
      );
      formato = (
        <FormatoPopoverDual
          formatoLabel={linea.formatoLabel || linea.formato}
          formatoValor={linea.formatoValor}
          onAplicarLabel={(f) => setLineaFormatoLabel(zonaIdx, lineaIdx, f)}
          onAplicarValor={(f) => setLineaFormatoValor(zonaIdx, lineaIdx, f)}
          dual={true}
        />
      );
      tabularControl = (
        <div className="rc-zona-tabular">
          <Switch size="small" checked={!!linea.tabular} onChange={(v) => setLineaTabular(zonaIdx, lineaIdx, v)} />
          {linea.tabular && (
            <InputNumber size="small" min={4} max={config.opciones?.anchoLinea ?? 48}
              value={linea.tabular.ancho ?? 12} style={{ width: 64 }}
              onChange={(v) => setLineaTabular(zonaIdx, lineaIdx, true, v ?? 12)} />
          )}
        </div>
      );
    }

    return (
      <div className="rc-zona-linea">
        <Tooltip title="Mover arriba"><Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={lineaIdx === 0} onClick={() => moverLinea(zonaIdx, lineaIdx, -1)} /></Tooltip>
        <Tooltip title="Mover abajo"><Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={lineaIdx === zonaLineas.length - 1} onClick={() => moverLinea(zonaIdx, lineaIdx, 1)} /></Tooltip>
        <span style={{ color: '#556ee6' }}>{iconoLinea(ref)}</span>
        {contenido}
        {formato}
        <Tooltip title={linea.mismaLinea ? 'Separar de línea anterior' : 'Juntar con línea anterior'}>
          <Button
            size="small"
            type="text"
            icon={linea.mismaLinea ? <LinkOutlined /> : <DisconnectOutlined />}
            style={{ color: linea.mismaLinea ? '#556ee6' : '#8c8c8c' }}
            onClick={() => {
              const nuevoValor = !linea.mismaLinea;
              updZonas((zs) => {
                const copia = [...zs];
                const lineas = [...copia[zonaIdx].lineas];
                lineas[lineaIdx] = { ...lineas[lineaIdx], mismaLinea: nuevoValor || undefined };
                copia[zonaIdx] = { ...copia[zonaIdx], lineas };
                return copia;
              });
            }}
          />
        </Tooltip>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {tabularControl}
          <Tooltip title="Quitar"><Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => quitarLinea(zonaIdx, lineaIdx)} /></Tooltip>
        </div>
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
          <Button icon={<RollbackOutlined />} onClick={onVolver}>Volver</Button>
          <div style={{ flex: 1 }} />
          {tieneConfig ? <Tag color="blue">Personalizada</Tag> : <Tag color="default">Predeterminada</Tag>}
          {dirty && <Tag color="orange">Cambios sin guardar</Tag>}
          <Button icon={<UndoOutlined />} loading={restableciendo} onClick={handleRestablecer}>Restablecer predeterminado</Button>
          <Tooltip title="Refrescar vista previa"><Button icon={<SyncOutlined />} onClick={handleRefreshPreview} /></Tooltip>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleGuardar}>Guardar</Button>
        </div>
      </Card>

      <Row gutter={16}>
        <Col xxl={15} span={24}>
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
                    {/* Lineas de la zona */}
                    {zona.lineas.length === 0 && (
                      <div className="rc-zona-vacia">
                        Zona vacía — agregue líneas con el botón de abajo
                      </div>
                    )}
                    {zona.lineas.map((linea, lIdx) => <FilaLinea key={`${zIdx}-${lIdx}`} zonaIdx={zIdx} lineaIdx={lIdx} linea={linea} zonaLineas={zona.lineas} tipo={zona.tipo} />)}

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

                          // 6. Especiales (Texto libre, Campo DTO y Firma)
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
        </Col>

        {/* Vista previa */}
        <Col xxl={9} span={24}>
          <Card className="paces-card-erp paces-card-erp-padded"
            style={{ borderRadius: 8, position: isLarge ? 'sticky' : undefined, top: 16 }}
            title={<Space size={6}><EyeOutlined /><span>Vista previa</span><Tag color="green">En vivo</Tag></Space>}
            extra={<Text type="secondary" style={{ fontSize: 12 }}>{esVSNT_ANULACION ? 'Anulación Visanet' : esVSNT_CIERRE ? 'Cierre Lote Visanet' : esVSNT ? 'Voucher Visanet' : esFRI ? 'Recibo Ingreso' : 'Factura POS'}</Text>}>
            <div style={{
              background: '#fff', width: `${anchoLineaPreview * 10}px`, minWidth: `${anchoLineaPreview * 8.5}px`, maxWidth: '100%', margin: '0 auto',
              padding: '16px 20px', fontFamily: config.opciones?.fontFamily ? `'${config.opciones.fontFamily}', monospace` : "'Courier New', Courier, monospace", fontSize: 14, lineHeight: 1.5,
              border: '1px solid #d9d9d9', borderRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }} dangerouslySetInnerHTML={{ __html: frozenPreview }} />
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <Tag color={esVSNT_CIERRE ? 'red' : esVSNT_ANULACION ? 'volcano' : esVSNT ? 'orange' : esFPV ? 'blue' : 'purple'}>{esVSNT_ANULACION ? 'VSNT_ANULACION' : esVSNT_CIERRE ? 'VSNT_CIERRE' : esVSNT ? 'VSNT_VOUCHER' : esFPV ? 'FPV_TICKET' : 'FRI_TICKET'}</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Última actualización: {detalle.fechaActualizacion ? new Date(detalle.fechaActualizacion).toLocaleString('es-DO') : '—'}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

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
    </>
  );
};

export default ReportesConfigEditor;
