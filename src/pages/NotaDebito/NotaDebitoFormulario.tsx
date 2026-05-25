import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal,
} from 'antd';
import {
  SaveOutlined,
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ClearOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { notaDebitoApi } from '../../api/notaDebitoApi';
import { conceptosApi } from '../../api/conceptosApi';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import type {
  NotaDebitoFullDTO,
  ConceptoDTO,
  TipoDTO,
  EntidadDTO,
  DocumentoRelacionadoDTO,
  DevolucionAsociadaDTO,
  ImpuestoRetencionDTO,
  AsientoDTO,
} from '../../types/notaDebito';

const { Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const ESTADO_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Borrador', color: 'default' },
  1: { label: 'Aplicado', color: 'success' },
  2: { label: 'Autorizado', color: 'processing' },
  3: { label: 'Anulado', color: 'error' },
  4: { label: 'Pagado', color: 'cyan' },
  5: { label: 'Abierto', color: 'warning' },
  6: { label: 'Cerrado', color: 'default' },
};

const ACCION_MAP: Record<number, string> = {
  0: 'Crear', 1: 'Modificar', 2: 'Eliminar', 3: 'Aplicar',
  4: 'Desaplicar', 5: 'Postear', 6: 'Anular', 7: 'Revisar',
  8: 'Reversar', 9: 'Escanear',
};

// ===== Helpers de formato =====
function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(n);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(val: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function parseDateRaw(val: string): Date | null {
  if (!val) return null;
  const num = val.replace(/\D/g, '');
  if (num.length >= 14) {
    const y = parseInt(num.slice(0, 4), 10);
    const m = parseInt(num.slice(4, 6), 10) - 1;
    const d = parseInt(num.slice(6, 8), 10);
    return new Date(y, m, d);
  }
  const dt = new Date(val);
  return isNaN(dt.getTime()) ? null : dt;
}

function toISOFormat(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}`;
}

function extraerMensajeError(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (data.errorMessage) return data.errorMessage;
  if (data.errors && typeof data.errors === 'object') {
    const mensajes: string[] = [];
    for (const key of Object.keys(data.errors)) {
      const val = data.errors[key];
      if (Array.isArray(val)) mensajes.push(...val);
      else if (typeof val === 'string') mensajes.push(val);
    }
    if (mensajes.length > 0) return mensajes.join('; ');
  }
  return fallback;
}

// ===== Calcular totales desde impuestos =====
function calcularTotales(impuestos: ImpuestoRetencionDTO[], total: number) {
  const retenciones = impuestos
    .filter((i) => i.tipo === 'Retencion')
    .reduce((s, i) => s + (i.monto || 0), 0);
  const impuestosCalc = impuestos
    .filter((i) => i.tipo === 'Impuesto' || i.tipo === 'Informativo')
    .reduce((s, i) => s + (i.monto || 0), 0);
  const otrosImpuestos = impuestos
    .filter((i) => i.tipo === 'Otro' || (!i.tipo || (i.tipo !== 'Retencion' && i.tipo !== 'Impuesto' && i.tipo !== 'Informativo')))
    .reduce((s, i) => s + (i.monto || 0), 0);
  const totalImpuestos = impuestosCalc + otrosImpuestos;
  const subTotal = total - totalImpuestos;
  return {
    retenciones: Math.round(retenciones * 100) / 100,
    impuestos: Math.round(totalImpuestos * 100) / 100,
    subTotal: Math.round(subTotal * 100) / 100,
  };
}

// ===== Validación de formato NCF Modificado =====
function validarNcfModificado(val: string): boolean {
  if (!val) return true; // vacío permitido
  // B0 + 9 dígitos o E3 + 10 dígitos
  const b0Pattern = /^B0\d{9}$/;
  const e3Pattern = /^E3\d{10}$/;
  return b0Pattern.test(val) || e3Pattern.test(val);
}

// ===== Modal de búsqueda de Concepto =====
interface BuscarConceptoModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (concepto: ConceptoDTO) => void;
}

const BuscarConceptoModal: React.FC<BuscarConceptoModalProps> = ({ open, onClose, onSelect }) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [conceptos, setConceptos] = useState<ConceptoDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async (filtro?: string) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { documento: 'ND' };
      if (filtro) params.filtro = filtro;
      const res = await conceptosApi.obtenerConceptos(sucursalActiva, filtro);
      setConceptos(res || []);
    } catch {
      message.error('Error al cargar conceptos');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    if (open) cargar();
  }, [open, cargar]);

  const columnas = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', ellipsis: true,
      render: (v: string) => toTitleCase(v) },
  ];

  return (
    <Modal title="Buscar Concepto" open={open} onCancel={onClose} footer={null} width={600} destroyOnHidden>
      <Input.Search
        placeholder="Buscar por código o nombre..."
        allowClear
        onSearch={(val) => cargar(val)}
        style={{ marginBottom: 16 }}
      />
      <Table
        dataSource={conceptos}
        columns={columnas}
        rowKey="codigo"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        onRow={(record) => ({
          onClick: () => { onSelect(record); onClose(); },
          style: { cursor: 'pointer' },
        })}
      />
    </Modal>
  );
};

// ===== Modal de búsqueda de Tipo =====
interface BuscarTipoModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (tipo: TipoDTO) => void;
}

const BuscarTipoModal: React.FC<BuscarTipoModalProps> = ({ open, onClose, onSelect }) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [tipos, setTipos] = useState<TipoDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await import('../../api/client').then(m =>
        m.apiClient.get<any>(`/Tipo/${sucursalActiva}/documento/ND`)
      );
      setTipos(data?.data || []);
    } catch {
      message.error('Error al cargar tipos');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    if (open) cargar();
  }, [open, cargar]);

  const columnas = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', ellipsis: true,
      render: (v: string) => toTitleCase(v) },
  ];

  return (
    <Modal title="Buscar Tipo" open={open} onCancel={onClose} footer={null} width={600} destroyOnHidden>
      <Table
        dataSource={tipos}
        columns={columnas}
        rowKey="codigo"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        onRow={(record) => ({
          onClick: () => { onSelect(record); onClose(); },
          style: { cursor: 'pointer' },
        })}
      />
    </Modal>
  );
};

// ===== Modal de búsqueda de Documentos Relacionados (facturas) =====
interface BuscarDocumentoModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (docs: DocumentoRelacionadoDTO[]) => void;
  tipoEntidad: 'SUP' | 'CLI';
}

const BuscarDocumentoModal: React.FC<BuscarDocumentoModalProps> = ({ open, onClose, onSelect, tipoEntidad }) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const tipoDoc = tipoEntidad === 'SUP' ? 'FRDE' : 'FFAC';
      const desde = dayjs().subtract(1, 'year').format('YYYYMMDD') + '000000';
      const hasta = dayjs().format('YYYYMMDD') + '235959';
      const { data } = await import('../../api/client').then(m =>
        m.apiClient.get<any>(`/Transaccion/${sucursalActiva}/tipo/${tipoDoc}`, {
          params: { desde, hasta, TipoEntidad: tipoEntidad }
        })
      );
      // Filtrar solo facturas con estado >= 1 (aplicadas)
      const facturas = (data?.data || []).filter((f: any) => (f.estado || 0) >= 1);
      setDocumentos(facturas);
    } catch {
      message.error('Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, tipoEntidad]);

  useEffect(() => {
    if (open) { cargar(); setSelectedRowKeys([]); }
  }, [open, cargar]);

  const columnas = [
    { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140 },
    { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 140, render: (v: string) => v || '-' },
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110, render: (v: string) => formatDate(v) },
    { title: 'Total', dataIndex: 'total', key: 'total', width: 120, align: 'right' as const,
      render: (v: number) => formatNumber(v) },
    { title: `Saldo`, key: 'saldo', width: 120, align: 'right' as const,
      render: (_: any, r: any) => formatNumber(r.saldoPendiente || r.total || 0) },
  ];

  const handleConfirm = () => {
    const selected = selectedRowKeys.map((key) => {
      const doc = documentos.find((d) => d.id === key);
      return {
        transaccionAsociadaID: doc?.id,
        documento: doc?.documento,
        nCF: doc?.ncf,
        montoOriginal: doc?.total || 0,
        pagado: doc?.pagado || 0,
        saldoPendiente: doc?.saldoPendiente || doc?.total || 0,
        monto: 0,
      } as DocumentoRelacionadoDTO;
    });
    onSelect(selected);
    onClose();
  };

  return (
    <Modal
      title="Buscar Documentos Relacionados"
      open={open}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="primary" onClick={handleConfirm} disabled={selectedRowKeys.length === 0}>
            Agregar ({selectedRowKeys.length})
          </Button>
        </Space>
      }
      width={800}
      destroyOnHidden
    >
      <Table
        dataSource={documentos}
        columns={columnas}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        scroll={{ x: 600 }}
      />
    </Modal>
  );
};

// ===== Modal de búsqueda de Devoluciones (DVC) =====
interface BuscarDevolucionModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (docs: DevolucionAsociadaDTO[]) => void;
}

const BuscarDevolucionModal: React.FC<BuscarDevolucionModalProps> = ({ open, onClose, onSelect }) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [devoluciones, setDevoluciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await import('../../api/client').then(m =>
        m.apiClient.get<any>(`/DVC/${sucursalActiva}`)
      );
      const items = (data?.data || []).filter((d: any) => (d.estado || 0) >= 1);
      setDevoluciones(items);
    } catch {
      message.error('Error al cargar devoluciones');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    if (open) { cargar(); setSelectedRowKeys([]); }
  }, [open, cargar]);

  const columnas = [
    { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140 },
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110, render: (v: string) => formatDate(v) },
    { title: 'Total', dataIndex: 'total', key: 'total', width: 120, align: 'right' as const,
      render: (v: number) => formatNumber(v) },
  ];

  const handleConfirm = () => {
    const selected = selectedRowKeys.map((key) => {
      const dev = devoluciones.find((d) => d.id === key);
      return {
        id: dev?.id,
        documento: dev?.documento,
        fecha: dev?.fecha,
        monto: dev?.total || 0,
        montoAsignado: 0,
      } as DevolucionAsociadaDTO;
    });
    onSelect(selected);
    onClose();
  };

  return (
    <Modal
      title="Buscar Devoluciones"
      open={open}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="primary" onClick={handleConfirm} disabled={selectedRowKeys.length === 0}>
            Agregar ({selectedRowKeys.length})
          </Button>
        </Space>
      }
      width={700}
      destroyOnHidden
    >
      <Table
        dataSource={devoluciones}
        columns={columnas}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
      />
    </Modal>
  );
};

// ===== Componente EntidadCard =====
const EntidadCard: React.FC<{ entidad: EntidadDTO | null; tipoEntidad: 'SUP' | 'CLI' }> = ({ entidad, tipoEntidad }) => (
  <Card title={<span style={{ fontSize: 16, fontWeight: 600 }}>{tipoEntidad === 'SUP' ? 'Suplidor' : 'Cliente'}</span>}
    className="paces-card" style={{ marginBottom: 16 }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontWeight: 600 }}>{entidad?.nombre ? toTitleCase(entidad.nombre) : '-'}</div>
      <div><span className="paces-text-secondary">RNC: </span><span>{entidad?.identificacion || '-'}</span></div>
      <div><span className="paces-text-secondary">Teléfono: </span><span>{entidad?.telefono || '-'}</span></div>
      <div><span className="paces-text-secondary">Dirección: </span><span>{entidad?.direccion ? toTitleCase(entidad.direccion) : '-'}</span></div>
    </div>
  </Card>
);

// ===== Componente TotalesCard =====
const TotalesCard: React.FC<{
  subTotal: number; impuestos: number; retenciones: number; total: number;
  tasa: number; alignRight: boolean;
  monedaNombre?: string; monedaSimbolo?: string;
}> = ({ subTotal, impuestos, retenciones, total, tasa, alignRight, monedaNombre, monedaSimbolo }) => (
  <Card title={<span style={{ fontSize: 16, fontWeight: 600 }}>Totales</span>}
    className="paces-card" style={{ marginBottom: 16 }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: alignRight ? 'right' : undefined }}>
      {monedaSimbolo && (
        <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16 }}>
          {!alignRight && <span className="paces-text-secondary">Moneda</span>}
          <span>{monedaNombre || 'Peso Dominicano'} ({monedaSimbolo} {formatNumber(tasa ?? 1)})</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16 }}>
        {!alignRight && <span className="paces-text-secondary">Subtotal</span>}
        <span>{formatNumber(subTotal)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16 }}>
        {!alignRight && <span className="paces-text-secondary">Impuestos</span>}
        <span>{formatNumber(impuestos)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16 }}>
        {!alignRight && <span className="paces-text-secondary">Retenciones</span>}
        <span>{formatNumber(retenciones)}</span>
      </div>
    </div>
    <Divider style={{ margin: '12px 0' }} />
    <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16, fontSize: 16, fontWeight: 700 }}>
      {!alignRight && <span>Total</span>}
      <span style={{ color: 'var(--paces-primary)' }}>{formatCurrency(total)}</span>
    </div>
  </Card>
);

// ===== Componente principal =====
interface NotaDebitoFormularioProps {
  tipoEntidad: 'SUP' | 'CLI';
}

const NotaDebitoFormulario: React.FC<NotaDebitoFormularioProps> = ({ tipoEntidad }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const codigoPantalla = tipoEntidad === 'SUP' ? 'FNDSUP' : 'FNDCLI';
  const entidadLabel = tipoEntidad === 'SUP' ? 'Suplidor' : 'Cliente';

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<NotaDebitoFullDTO | null>(null);
  const [entidadesCache, setEntidadesCache] = useState<EntidadDTO[]>([]);
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [selectedTipo, setSelectedTipo] = useState<TipoDTO | null>(null);
  const [selectedEntidad, setSelectedEntidad] = useState<EntidadDTO | null>(null);
  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
  const [tipoModalOpen, setTipoModalOpen] = useState(false);
  const [buscarDocModalOpen, setBuscarDocModalOpen] = useState(false);
  const [buscarDevModalOpen, setBuscarDevModalOpen] = useState(false);

  // Estado para pestañas
  const [documentosRelacionados, setDocumentosRelacionados] = useState<DocumentoRelacionadoDTO[]>([]);
  const [devoluciones, setDevoluciones] = useState<DevolucionAsociadaDTO[]>([]);
  const [impuestosRetenciones, setImpuestosRetenciones] = useState<ImpuestoRetencionDTO[]>([]);

  // NCF
  const [ncfTipo, setNcfTipo] = useState<'documento' | 'modificado'>('documento');
  const [ncfModificadoVal, setNcfModificadoVal] = useState('');

  const [form] = Form.useForm();
  const isLarge = screens.lg ?? true;

  // ===== Watchers =====
  const montoTotalWatch = Form.useWatch('montoTotal', form) || 0;

  // ===== Totales derivados =====
  const totales = calcularTotales(impuestosRetenciones, Number(montoTotalWatch) || 0);

  // ===== Estado info =====
  const estado = data?.estado ?? 0;
  const esCerrado = data?.periodo === 6;
  const esBorrador = estado === 0;
  const esAplicado = estado === 1;
  const esAnulado = estado === 3;

  // ===== Determinar acciones según estado =====
  const puedeGuardar = mode === 'crear' || esBorrador;
  const puedeAplicar = mode === 'editar' && esBorrador && !esCerrado;
  const puedePostear = mode === 'editar' && esAplicado && !esCerrado;
  const puedeAnular = mode === 'editar' && !esAnulado && !esCerrado;

  // ===== Cargar datos de apoyo al montar =====
  useEffect(() => {
    setActiveModule(codigoPantalla);
    const pageTitle = mode === 'crear'
      ? `Nueva Nota de Débito - ${entidadLabel}`
      : `Editar Nota de Débito - ${entidadLabel}`;
    setPageTitleOverride(pageTitle);

    if (mode === 'crear') {
      form.setFieldsValue({
        fecha: dayjs(),
        tasa: 1,
        montoTotal: 0,
      });
    }

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, codigoPantalla, entidadLabel, form]);

  // ===== Cargar datos si es modo editar =====
  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;

    setLoading(true);
    notaDebitoApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res: any) => {
        const full: NotaDebitoFullDTO = {
          id: res.id,
          fechaDocumento: res.fechaDocumento,
          noDocumento: res.noDocumento,
          estado: res.estado,
          periodo: res.periodo,
          referencia: res.referencia || '',
          ncf: res.ncf || '',
          ncfModificado: res.ncfModificado || '',
          nota: res.nota || '',
          total: res.total || 0,
          subTotal: res.subTotal || 0,
          descuento: res.descuento || 0,
          impuestos: res.impuestos || 0,
          retenciones: res.retenciones || 0,
          tasa: res.tasa || 1,
          debitos: res.debitos || 0,
          creditos: res.creditos || 0,
          documento: res.documento || { codigo: 'ND' },
          concepto: res.concepto || null,
          tipo: res.tipo || null,
          entidad: res.entidad || null,
          moneda: res.moneda || null,
          transaccionesAsociadas: res.transaccionesAsociadas || [],
          devoluciones: res.devoluciones || [],
          impuestosRetenciones: res.impuestosRetenciones || [],
          asientos: res.asientos || [],
          logs: res.logs || [],
        };
        setData(full);
        setSelectedConcepto(full.concepto || null);
        setSelectedTipo(full.tipo || null);
        setSelectedEntidad(full.entidad || null);
        setDocumentosRelacionados(full.transaccionesAsociadas || []);
        setDevoluciones(full.devoluciones || []);
        setImpuestosRetenciones(full.impuestosRetenciones || []);
        setNcfModificadoVal(full.ncfModificado || '');
        setNcfTipo(full.ncfModificado ? 'modificado' : 'documento');

        const fechaDoc = full.fechaDocumento ? parseDateRaw(full.fechaDocumento) : null;

        form.setFieldsValue({
          concepto: full.concepto?.codigo || '',
          tipo: full.tipo?.codigo || '',
          entidad: full.entidad?.codigo || '',
          fecha: fechaDoc ? dayjs(fechaDoc) : null,
          montoTotal: full.total || 0,
          ncf: full.ncf || '',
          tasa: full.tasa || 1,
          referencia: full.referencia || '',
          nota: full.nota || '',
        });

        // Cargar entidades según el concepto
        if (full.concepto?.codigo) {
          conceptosApi.obtenerEntidades(sucursalActiva, full.concepto.codigo)
            .then(setEntidadesCache)
            .catch(() => {});
        }
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        message.error(msg);
        navigate(`/${codigoPantalla}`);
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate, codigoPantalla]);

  // ===== Handlers =====
  const handleCancelar = () => {
    Modal.confirm({
      title: 'Cancelar',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro que desea cancelar los cambios realizados?',
      okText: 'Sí, cancelar',
      cancelText: 'No, continuar editando',
      okButtonProps: { danger: true },
      onOk: () => {
        if (mode === 'crear') {
          navigate(`/${codigoPantalla}`);
        } else {
          navigate(`/${codigoPantalla}/${id}`);
        }
      },
    });
  };

  // ===== Handlers de Concepto =====
  const handleConceptoSelect = (concepto: ConceptoDTO) => {
    setSelectedConcepto(concepto);
    form.setFieldsValue({ concepto: concepto.codigo });

    // Cargar entidades según el concepto
    conceptosApi.obtenerEntidades(sucursalActiva, concepto.codigo)
      .then((ents) => setEntidadesCache(ents))
      .catch(() => {});
  };

  const handleConceptoClear = () => {
    setSelectedConcepto(null);
    setEntidadesCache([]);
    form.setFieldsValue({ concepto: '', entidad: undefined });
  };

  // ===== Handlers de Tipo =====
  const handleTipoSelect = (tipo: TipoDTO) => {
    setSelectedTipo(tipo);
    form.setFieldsValue({ tipo: tipo.codigo });
    // Al cambiar tipo, resetear concepto
    setSelectedConcepto(null);
    setEntidadesCache([]);
    form.setFieldsValue({ concepto: '', entidad: undefined });
  };

  const handleTipoClear = () => {
    setSelectedTipo(null);
    form.setFieldsValue({ tipo: '' });
  };

  // ===== Handlers de Entidad =====
  const handleEntidadChange = (value: string) => {
    const entidad = entidadesCache.find((e) => e.codigo === value);
    setSelectedEntidad(entidad || null);
    form.setFieldsValue({ entidad: value });
  };

  // ===== Handlers de Documentos Relacionados =====
  const handleDocRelacionadoSelect = (docs: DocumentoRelacionadoDTO[]) => {
    setDocumentosRelacionados((prev) => {
      const existentes = new Set(prev.map((d) => d.transaccionAsociadaID));
      const nuevos = docs.filter((d) => !existentes.has(d.transaccionAsociadaID));
      // Auto-asignar NCF Modificado del primer documento si no hay
      if (ncfTipo === 'modificado' && !ncfModificadoVal && nuevos.length > 0) {
        const primerNcf = nuevos[0].nCF;
        if (primerNcf) {
          setNcfModificadoVal(primerNcf);
        }
      }
      return [...prev, ...nuevos];
    });
  };

  const handleDocRelacionadoRemove = (id?: number) => {
    setDocumentosRelacionados((prev) => prev.filter((d) => d.transaccionAsociadaID !== id && d.id !== id));
  };

  const handleDocMontoChange = (id: number | undefined, monto: number) => {
    setDocumentosRelacionados((prev) =>
      prev.map((d) => (d.transaccionAsociadaID === id || d.id === id) ? { ...d, monto } : d)
    );
  };

  // ===== Handlers de Devoluciones =====
  const handleDevolucionSelect = (docs: DevolucionAsociadaDTO[]) => {
    setDevoluciones((prev) => {
      const existentes = new Set(prev.map((d) => d.id));
      const nuevos = docs.filter((d) => !existentes.has(d.id));
      return [...prev, ...nuevos];
    });
  };

  const handleDevolucionRemove = (id?: number) => {
    setDevoluciones((prev) => prev.filter((d) => d.id !== id));
  };

  const handleDevMontoChange = (id: number | undefined, montoAsignado: number) => {
    setDevoluciones((prev) =>
      prev.map((d) => d.id === id ? { ...d, montoAsignado } : d)
    );
  };

  // ===== Handlers de Impuestos y Retenciones =====
  const handleImpuestoAdd = () => {
    setImpuestosRetenciones((prev) => [
      ...prev,
      { id: -(prev.length + 1), nombre: '', tipo: 'Impuesto', monto: 0, porcentaje: 0 },
    ]);
  };

  const handleImpuestoRemove = (id?: number) => {
    setImpuestosRetenciones((prev) => prev.filter((i) => i.id !== id));
  };

  const handleImpuestoChange = (id: number | undefined, field: string, value: any) => {
    setImpuestosRetenciones((prev) =>
      prev.map((i) => i.id === id ? { ...i, [field]: value } : i)
    );
  };

  // ===== NCF Modificado =====
  const handleNcfTipoChange = (value: 'documento' | 'modificado') => {
    setNcfTipo(value);
    if (value === 'documento') {
      setNcfModificadoVal('');
    }
  };

  // ===== Validación =====
  const validarFormulario = (): string | null => {
    const values = form.getFieldsValue();

    if (!selectedConcepto) return 'El Concepto es obligatorio';
    if (!values.entidad && !selectedEntidad) return `El ${entidadLabel} es obligatorio`;

    // Fecha ≤ hoy
    const fechaDoc = values.fecha;
    if (fechaDoc) {
      const hoy = dayjs().endOf('day');
      if (dayjs(fechaDoc).isAfter(hoy)) return 'La fecha del documento no puede ser mayor a hoy';
    }

    // Validar NCF Modificado
    if (ncfTipo === 'modificado' && ncfModificadoVal && !validarNcfModificado(ncfModificadoVal)) {
      return 'El formato del NCF Modificado no es válido (B0+9dígitos o E3+10dígitos)';
    }

    // Validar distribución de documentos relacionados
    const totalMonto = Number(values.montoTotal) || 0;
    const sumaDocs = documentosRelacionados.reduce((s, d) => s + (d.monto || 0), 0);
    if (documentosRelacionados.length > 0 && Math.abs(sumaDocs - totalMonto) > 0.01) {
      return 'La distribución de documentos relacionados debe igualar el Total';
    }

    // Validar distribución de devoluciones
    if (devoluciones.length > 0) {
      const sumaDevs = devoluciones.reduce((s, d) => s + (d.montoAsignado || 0), 0);
      if (Math.abs(sumaDevs - totalMonto) > 0.01) {
        return 'La distribución de devoluciones debe igualar el Total';
      }
    }

    // Validar asientos cuadrados (solo en editar si ya existen)
    if (data?.asientos && data.asientos.length > 0) {
      const deb = data.asientos.reduce((s, a) => s + ((typeof a.tipoAsiento === 'number' ? a.tipoAsiento === 0 : a.tipoAsiento === 'D') ? a.monto : 0), 0);
      const cred = data.asientos.reduce((s, a) => s + ((typeof a.tipoAsiento === 'number' ? a.tipoAsiento === 1 : a.tipoAsiento === 'C') ? a.monto : 0), 0);
      if (Math.abs(deb - cred) > 0.01) return 'Los asientos contables no están cuadrados';
    }

    return null;
  };

  // ===== Construir DTO =====
  const construirDTO = (): any => {
    const values = form.getFieldsValue();
    const base = data || {} as any;

    const entidadSel = entidadesCache.find((e) => e.codigo === values.entidad) || selectedEntidad;

    const fechaDoc = values.fecha
      ? (typeof values.fecha === 'object' && values.fecha.toDate
        ? toISOFormat(values.fecha.toDate())
        : values.fecha)
      : toISOFormat(new Date());

    const montoTotal = Number(values.montoTotal) || 0;
    const totalImpuestos = impuestosRetenciones
      .filter((i) => i.tipo === 'Impuesto' || i.tipo === 'Informativo' || i.tipo === 'Otro' || !i.tipo)
      .reduce((s, i) => s + (i.monto || 0), 0);

    return {
      id: base.id || 0,
      fechaDocumento: fechaDoc,
      noDocumento: base.noDocumento || '',
      estado: base.estado || 0,
      periodo: base.periodo || new Date().getMonth() + 1,
      ncf: values.ncf || '',
      ncfModificado: ncfTipo === 'modificado' ? ncfModificadoVal : '',
      referencia: values.referencia || '',
      nota: values.nota || '',
      tasa: values.tasa || 1,
      subTotal: Math.round((montoTotal - totalImpuestos) * 100) / 100,
      descuento: 0,
      impuestos: Math.round(totalImpuestos * 100) / 100,
      retenciones: Math.round(totales.retenciones * 100) / 100,
      total: Math.round(montoTotal * 100) / 100,
      debitos: base.debitos || 0,
      creditos: base.creditos || 0,
      documento: base.documento || { codigo: 'ND' },
      concepto: selectedConcepto || { codigo: '', nombre: '' },
      tipo: selectedTipo || { codigo: '', nombre: '' },
      entidad: entidadSel ? { codigo: entidadSel.codigo, nombre: entidadSel.nombre || '', identificacion: entidadSel.identificacion || '', telefono: entidadSel.telefono } : { codigo: '', nombre: '' },
      moneda: base.moneda || { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' },
      transaccionesAsociadas: documentosRelacionados,
      devoluciones,
      impuestosRetenciones,
      asientos: base.asientos || [],
      logs: base.logs || [],
    };
  };

  // ===== Acciones =====
  const handleGuardar = async () => {
    const error = validarFormulario();
    if (error) {
      message.error(error);
      return;
    }

    setSaving(true);
    try {
      const dto = construirDTO();
      if (mode === 'crear') {
        const result = await notaDebitoApi.crear(sucursalActiva, dto);
        message.success('Nota de Débito creada exitosamente');
        navigate(`/${codigoPantalla}/${result.id}`);
      } else {
        await notaDebitoApi.actualizar(sucursalActiva, dto);
        message.success('Nota de Débito actualizada exitosamente');
        navigate(`/${codigoPantalla}/${id}`);
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAplicar = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await notaDebitoApi.aplicar(sucursalActiva, parseInt(id));
      message.success('Documento aplicado exitosamente');
      navigate(`/${codigoPantalla}/${id}`);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al aplicar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAnular = async () => {
    if (!data) return;
    Modal.confirm({
      title: 'Anular Nota de Débito',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro de anular este documento? Esta acción no se puede deshacer.',
      okText: 'Sí, anular',
      cancelText: 'No',
      okButtonProps: { danger: true },
      onOk: async () => {
        setSaving(true);
        try {
          const dto = construirDTO();
          await notaDebitoApi.anular(sucursalActiva, dto);
          message.success('Documento anulado exitosamente');
          navigate(`/${codigoPantalla}/${id}`);
        } catch (err: any) {
          const msg = extraerMensajeError(err, 'Error al anular');
          message.error(msg);
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const handlePostear = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const dto = construirDTO();
      await notaDebitoApi.postear(sucursalActiva, dto);
      message.success('Documento posteado exitosamente');
      navigate(`/${codigoPantalla}/${id}`);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al postear');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerarAsientos = async () => {
    if (!id) {
      message.warning('Debe guardar el documento antes de generar asientos');
      return;
    }
    if (!data) return;
    setSaving(true);
    try {
      await notaDebitoApi.recalcularPagos(sucursalActiva, parseInt(id));
      const updated = await notaDebitoApi.obtenerPorId(sucursalActiva, parseInt(id));
      setData((prev) => prev ? { ...prev, asientos: updated.asientos || [] } : prev);
      message.success('Asientos generados exitosamente');
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al generar asientos');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== Loader =====
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando documento...</div>
      </div>
    );
  }

  const estadoInfo = ESTADO_MAP[estado] || { label: 'Borrador', color: 'default' };

  // ===== Columnas de pestañas =====
  const docRelColumns = [
    { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140 },
    { title: 'NCF', dataIndex: 'nCF', key: 'nCF', width: 140, render: (v: string) => v || '-' },
    { title: 'Monto Original', dataIndex: 'montoOriginal', key: 'montoOriginal', width: 130, align: 'right' as const, render: (v: number) => formatNumber(v) },
    { title: 'Saldo', dataIndex: 'saldoPendiente', key: 'saldoPendiente', width: 120, align: 'right' as const, render: (v: number) => <strong>{formatNumber(v)}</strong> },
    {
      title: 'Monto a Debitar', dataIndex: 'monto', key: 'monto', width: 140, align: 'right' as const,
      render: (_: any, record: DocumentoRelacionadoDTO, idx: number) => (
        <InputNumber
          size="small"
          style={{ width: 120 }}
          min={0}
          max={record.saldoPendiente || record.montoOriginal || 0}
          step={0.01}
          precision={2}
          value={documentosRelacionados[idx]?.monto}
          onChange={(val) => handleDocMontoChange(record.transaccionAsociadaID || record.id, val || 0)}
        />
      ),
    },
    {
      title: '', key: 'accion', width: 50,
      render: (_: any, record: DocumentoRelacionadoDTO) => (
        <Button type="text" danger size="small" icon={<DeleteOutlined />}
          onClick={() => handleDocRelacionadoRemove(record.transaccionAsociadaID || record.id)} />
      ),
    },
  ];

  const devColumns = [
    { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140 },
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110, render: (v: string) => v ? formatDate(v) : '-' },
    { title: 'Monto', dataIndex: 'monto', key: 'monto', width: 120, align: 'right' as const, render: (v: number) => formatNumber(v) },
    {
      title: 'Monto Asignado', dataIndex: 'montoAsignado', key: 'montoAsignado', width: 140, align: 'right' as const,
      render: (_: any, record: DevolucionAsociadaDTO, idx: number) => (
        <InputNumber
          size="small"
          style={{ width: 120 }}
          min={0}
          max={record.monto || 0}
          step={0.01}
          precision={2}
          value={devoluciones[idx]?.montoAsignado}
          onChange={(val) => handleDevMontoChange(record.id, val || 0)}
        />
      ),
    },
    {
      title: '', key: 'accion', width: 50,
      render: (_: any, record: DevolucionAsociadaDTO) => (
        <Button type="text" danger size="small" icon={<DeleteOutlined />}
          onClick={() => handleDevolucionRemove(record.id)} />
      ),
    },
  ];

  const impuestoColumns = [
    {
      title: 'Tipo', dataIndex: 'tipo', key: 'tipo', width: 140,
      render: (_: any, record: ImpuestoRetencionDTO, idx: number) => (
        <Select
          size="small"
          style={{ width: 130 }}
          value={impuestosRetenciones[idx]?.tipo}
          onChange={(val) => handleImpuestoChange(record.id, 'tipo', val)}
          options={[
            { value: 'Impuesto', label: 'Impuesto' },
            { value: 'Retencion', label: 'Retención' },
            { value: 'Informativo', label: 'Informativo' },
            { value: 'Otro', label: 'Otro' },
          ]}
        />
      ),
    },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', ellipsis: true,
      render: (_: any, record: ImpuestoRetencionDTO, idx: number) => (
        <Input size="small" value={impuestosRetenciones[idx]?.nombre || ''}
          onChange={(e) => handleImpuestoChange(record.id, 'nombre', e.target.value)} />
      ),
    },
    {
      title: '%', dataIndex: 'porcentaje', key: 'porcentaje', width: 80, align: 'right' as const,
      render: (_: any, record: ImpuestoRetencionDTO, idx: number) => (
        <InputNumber size="small" style={{ width: 70 }} min={0} max={100} step={0.01} precision={2}
          value={impuestosRetenciones[idx]?.porcentaje}
          onChange={(val) => handleImpuestoChange(record.id, 'porcentaje', val || 0)}
          addonAfter="%" />
      ),
    },
    {
      title: 'Monto', dataIndex: 'monto', key: 'monto', width: 120, align: 'right' as const,
      render: (_: any, record: ImpuestoRetencionDTO, idx: number) => (
        <InputNumber size="small" style={{ width: 110 }} min={0} step={0.01} precision={2}
          value={impuestosRetenciones[idx]?.monto}
          onChange={(val) => handleImpuestoChange(record.id, 'monto', val || 0)} />
      ),
    },
    {
      title: '', key: 'accion', width: 50,
      render: (_: any, record: ImpuestoRetencionDTO) => (
        <Button type="text" danger size="small" icon={<DeleteOutlined />}
          onClick={() => handleImpuestoRemove(record.id)} />
      ),
    },
  ];

  const asientoColumns = [
    { title: 'Cuenta', key: 'cuenta', width: 120,
      render: (_: any, r: AsientoDTO) => r.cuentaContable?.noCuenta || '-' },
    { title: 'Nombre', key: 'nombre', ellipsis: true,
      render: (_: any, r: AsientoDTO) => r.cuentaContable?.nombre ? toTitleCase(r.cuentaContable.nombre) : '-' },
    { title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true,
      render: (v: string) => v ? toTitleCase(v) : '-' },
    { title: 'Débito', key: 'debito', width: 130, align: 'right' as const,
      render: (_: any, r: AsientoDTO) => (r.tipoAsiento === 0 || r.tipoAsiento === 'D') ? formatNumber(r.monto) : '' },
    { title: 'Crédito', key: 'credito', width: 130, align: 'right' as const,
      render: (_: any, r: AsientoDTO) => (r.tipoAsiento === 1 || r.tipoAsiento === 'C') ? formatNumber(r.monto) : '' },
  ];

  function esDebito(tipo: any): boolean { return tipo === 'D' || tipo === 0; }
  function esCredito(tipo: any): boolean { return tipo === 'C' || tipo === 1; }
  const totalDebitos = (data?.asientos || []).reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
  const totalCreditos = (data?.asientos || []).reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);

  const logColumns = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 160, render: (v: string) => formatDate(v) },
    { title: 'Usuario', dataIndex: 'usuario', key: 'usuario', width: 200,
      render: (v: any) => (v?.nombre ? toTitleCase(v.nombre) : v?.nombreUsuario ? toTitleCase(v.nombreUsuario) : '-') },
    { title: 'Estación', dataIndex: 'estacion', key: 'estacion', width: 200 },
    { title: 'Acción', dataIndex: 'accion', key: 'accion', width: 120,
      render: (v: number) => ACCION_MAP[v] || `Acción ${v}` },
    { title: 'Motivos', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true },
  ];

  // ===== Toolbar =====
  const renderToolbar = () => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
      <div style={{ flex: 1 }} />
      <Space wrap>
        {mode === 'editar' && data && (
          <>
            {esCerrado && <Tag color="geekblue">Cerrado</Tag>}
            <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
          </>
        )}

        {puedeGuardar && (
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleGuardar}>
            Guardar
          </Button>
        )}
        <Button icon={<CloseOutlined />} onClick={handleCancelar}>
          Cancelar
        </Button>
        {puedeAplicar && (
          <Button icon={<ExclamationCircleOutlined />} loading={saving} onClick={handleAplicar}>
            Aplicar
          </Button>
        )}
        {puedePostear && (
          <Button icon={<ExclamationCircleOutlined />} loading={saving} onClick={handlePostear}>
            Postear
          </Button>
        )}
        {puedeAnular && (
          <Button danger icon={<DeleteOutlined />} loading={saving} onClick={handleAnular}>
            Anular
          </Button>
        )}
      </Space>
    </div>
  );

  // ===== Encabezado =====
  const renderEncabezado = () => (
    <Card className="paces-card" size="small" title="Datos Generales" style={{ marginBottom: 16 }}>
      <Form form={form} layout="vertical" size="small" style={{ paddingTop: 24 }}>
        <Row gutter={[16, 24]}>
          {/* Fila 1: Tipo + Concepto */}
          <Col xs={24} sm={12} lg={8}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
              <div style={{ flex: 1 }}>
                <FloatingField label="Tipo" required>
                  <Input placeholder=" " value={selectedTipo?.codigo || ''} readOnly />
                </FloatingField>
              </div>
              <Button icon={<SearchOutlined />} onClick={() => setTipoModalOpen(true)} />
              {selectedTipo && <Button icon={<ClearOutlined />} onClick={handleTipoClear} />}
            </div>
            <Form.Item name="tipo" hidden><Input /></Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
              <div style={{ flex: 1 }}>
                <FloatingField label="Concepto" required>
                  <Input placeholder=" " value={selectedConcepto?.nombre || ''} readOnly />
                </FloatingField>
              </div>
              <Button icon={<SearchOutlined />} onClick={() => setConceptoModalOpen(true)} />
              {selectedConcepto && <Button icon={<ClearOutlined />} onClick={handleConceptoClear} />}
            </div>
            <Form.Item name="concepto" hidden><Input /></Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Form.Item label={entidadLabel} name="entidad" required>
              <Select
                showSearch
                allowClear
                placeholder={`Seleccionar ${entidadLabel}`}
                optionFilterProp="children"
                value={selectedEntidad?.codigo}
                onChange={handleEntidadChange}
                options={entidadesCache.map((e) => ({
                  value: e.codigo,
                  label: `${e.codigo} - ${toTitleCase(e.nombre || '')}`,
                }))}
              />
            </Form.Item>
          </Col>

          {/* Fila 2: RNC + Nombre + Fecha */}
          <Col xs={24} sm={12} lg={6}>
            <Form.Item label="RNC">
              <Input value={selectedEntidad?.identificacion || ''} readOnly />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Form.Item label="Nombre">
              <Input value={selectedEntidad?.nombre ? toTitleCase(selectedEntidad.nombre) : ''} readOnly />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Form.Item label="Fecha" name="fecha" required>
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>

          {/* Fila 3: Monto Total + Tasa + Referencia */}
          <Col xs={24} sm={12} lg={6}>
            <Form.Item label="Monto Total" name="montoTotal" required>
              <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Form.Item label="Tasa" name="tasa">
              <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={4} />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Form.Item label="Referencia" name="referencia">
              <Input placeholder="Referencia del documento" />
            </Form.Item>
          </Col>

          {/* Fila 4: NCF + NCF Modificado */}
          <Col xs={24} sm={12} lg={6}>
            <Form.Item label="NCF" name="ncf">
              <Input placeholder="NCF del documento" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Form.Item label="Tipo NCF">
              <Select
                value={ncfTipo}
                onChange={handleNcfTipoChange}
                options={[
                  { value: 'documento', label: 'NCF Documento' },
                  { value: 'modificado', label: 'NCF Modificado' },
                ]}
              />
            </Form.Item>
          </Col>

          {ncfTipo === 'modificado' && (
            <Col xs={24} sm={12} lg={6}>
              <Form.Item label="NCF Modificado" required={ncfTipo === 'modificado'}
                validateStatus={ncfModificadoVal && !validarNcfModificado(ncfModificadoVal) ? 'error' : undefined}
                help={ncfModificadoVal && !validarNcfModificado(ncfModificadoVal) ? 'Formato: B0+9dígitos o E3+10dígitos' : undefined}
              >
                <Input
                  placeholder="NCF Modificado"
                  value={ncfModificadoVal}
                  onChange={(e) => setNcfModificadoVal(e.target.value)}
                />
              </Form.Item>
            </Col>
          )}

          {/* Fila 5: Nota */}
          <Col xs={24} sm={24} lg={12}>
            <Form.Item label="Nota" name="nota">
              <TextArea rows={2} maxLength={500} showCount placeholder="Nota (máx 500 caracteres)" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  );

  // ===== Layout principal =====
  const contenidoPestanas = (
    <Tabs defaultActiveKey="documentos" type="card">
      <TabPane tab={`Documentos (${documentosRelacionados.length})`} key="documentos">
        <div style={{ marginBottom: 8 }}>
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => setBuscarDocModalOpen(true)}>
            Agregar Documento
          </Button>
        </div>
        <Table
          dataSource={documentosRelacionados}
          columns={docRelColumns}
          rowKey={(r) => r.transaccionAsociadaID || r.id || 0}
          size="small"
          pagination={false}
          scroll={{ x: 800 }}
        />
      </TabPane>

      {tipoEntidad === 'SUP' && (
        <TabPane tab={`Devoluciones (${devoluciones.length})`} key="devoluciones">
          <div style={{ marginBottom: 8 }}>
            <Button type="dashed" icon={<PlusOutlined />} onClick={() => setBuscarDevModalOpen(true)}>
              Agregar Devolución
            </Button>
          </div>
          <Table
            dataSource={devoluciones}
            columns={devColumns}
            rowKey={(r) => r.id || 0}
            size="small"
            pagination={false}
            scroll={{ x: 600 }}
          />
        </TabPane>
      )}

      <TabPane tab={`Impuestos y Retenciones (${impuestosRetenciones.length})`} key="impuestos">
        <div style={{ marginBottom: 8 }}>
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleImpuestoAdd}>
            Agregar
          </Button>
        </div>
        <Table
          dataSource={impuestosRetenciones}
          columns={impuestoColumns}
          rowKey={(r) => r.id || 0}
          size="small"
          pagination={false}
          scroll={{ x: 600 }}
        />
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
          <Text className="paces-text-secondary">SubTotal: <strong>{formatNumber(totales.subTotal)}</strong></Text>
          <Text className="paces-text-secondary">Impuestos: <strong>{formatNumber(totales.impuestos)}</strong></Text>
          <Text className="paces-text-secondary">Retenciones: <strong>{formatNumber(totales.retenciones)}</strong></Text>
        </div>
      </TabPane>

      <TabPane tab={`Asientos (${data?.asientos?.length || 0})`} key="asientos">
        {mode === 'editar' && (
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <Button icon={<ExclamationCircleOutlined />} loading={saving} onClick={handleGenerarAsientos}>
              GENERAR
            </Button>
          </div>
        )}
        <Table
          dataSource={data?.asientos || []}
          columns={asientoColumns}
          rowKey={(r) => r.id || 0}
          size="small"
          pagination={false}
          scroll={{ x: 600 }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3}><strong>Totales</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right"><strong>{formatNumber(totalDebitos)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right"><strong>{formatNumber(totalCreditos)}</strong></Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </TabPane>

      <TabPane tab={`Historial (${data?.logs?.length || 0})`} key="historial">
        <Table
          dataSource={data?.logs || []}
          columns={logColumns}
          rowKey={(r) => r.id || 0}
          size="small"
          pagination={false}
          scroll={{ x: 900 }}
        />
      </TabPane>
    </Tabs>
  );

  return (
    <div>
      {renderToolbar()}

      {isLarge ? (
        /* === DESKTOP LAYOUT (≥ lg) === */
        <Row gutter={16}>
          <Col lg={18}>
            {renderEncabezado()}
            {contenidoPestanas}
          </Col>
          <Col lg={6}>
            <EntidadCard entidad={selectedEntidad} tipoEntidad={tipoEntidad} />
            <TotalesCard
              subTotal={totales.subTotal}
              impuestos={totales.impuestos}
              retenciones={totales.retenciones}
              total={Number(montoTotalWatch) || 0}
              tasa={Form.useWatch('tasa', form) || 1}
              alignRight={false}
              monedaNombre={data?.moneda?.nombre || 'Peso Dominicano'}
              monedaSimbolo={data?.moneda?.simbolo || 'RD$'}
            />
          </Col>
        </Row>
      ) : (
        /* === MOBILE LAYOUT (< lg) === */
        <div>
          {renderEncabezado()}
          <EntidadCard entidad={selectedEntidad} tipoEntidad={tipoEntidad} />
          <TotalesCard
            subTotal={totales.subTotal}
            impuestos={totales.impuestos}
            retenciones={totales.retenciones}
            total={Number(montoTotalWatch) || 0}
            tasa={Form.useWatch('tasa', form) || 1}
            alignRight={true}
            monedaNombre={data?.moneda?.nombre || 'Peso Dominicano'}
            monedaSimbolo={data?.moneda?.simbolo || 'RD$'}
          />
          {contenidoPestanas}
        </div>
      )}

      {/* Modales */}
      <BuscarConceptoModal
        open={conceptoModalOpen}
        onClose={() => setConceptoModalOpen(false)}
        onSelect={handleConceptoSelect}
      />
      <BuscarTipoModal
        open={tipoModalOpen}
        onClose={() => setTipoModalOpen(false)}
        onSelect={handleTipoSelect}
      />
      <BuscarDocumentoModal
        open={buscarDocModalOpen}
        onClose={() => setBuscarDocModalOpen(false)}
        onSelect={handleDocRelacionadoSelect}
        tipoEntidad={tipoEntidad}
      />
      {tipoEntidad === 'SUP' && (
        <BuscarDevolucionModal
          open={buscarDevModalOpen}
          onClose={() => setBuscarDevModalOpen(false)}
          onSelect={handleDevolucionSelect}
        />
      )}
    </div>
  );
};

export default NotaDebitoFormulario;
