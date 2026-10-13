import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid,
  message, Form, Input, InputNumber,  DatePicker, Typography, Modal, Alert, Dropdown, Empty,
} from 'antd';
import { Select } from '../../components/Select';
import {
  InboxOutlined,
  SaveOutlined,
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ClearOutlined,
  ExclamationCircleOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RedoOutlined,
  RollbackOutlined,
  HolderOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { devolucionVentaApi } from '../../api/devolucionVentaApi';
import { facturaPOSApi } from '../../api/facturaPOSApi';
import { productoApi } from '../../api/productoApi';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import type {
  ConceptoDTO, AlmacenDTO,
} from '../../types/entradaAlmacen';
import type { UnidadMedidaDTO } from '../../types/productos';
import type { DetalleDevolucionVentaDTO, DevolucionVentaFullDTO } from '../../types/devolucionVenta';
import LogTable from '../../components/LogTable';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';

import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import { DragHandle, SortableRow } from '../../components/DragSortable';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useDocumentoConfig } from '../../hooks/useDocumentoConfig';
import { useCargaDocumento } from '../../hooks/useCargaDocumento';
import { formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum } from '../../utils/estadoDocumento';
import CamposRestringidosAlert from '../../components/CamposRestringidosAlert';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import AsientosContableTable from '../../components/AsientosContableTable';
import { transaccionApi } from '../../api/transaccionApi';
import MemoField from '../../components/MemoField/MemoField';
import CamposRapidosFila from '../../components/CamposRapidosFila/CamposRapidosFila';

const { Text } = Typography;

// ===== Cálculo de fila para DEV =====
function calcularFila(fila: DetalleDevolucionVentaDTO): DetalleDevolucionVentaDTO {
  const cantidad = fila.cantidad || 0;
  const precio = fila.precio || 0;
  const pctDesc = fila.porcentajeDescuento || 0;
  const pctImp = fila.porcentajeImpuesto || 0;

  const subTotal = Math.round(cantidad * precio * 100) / 100;
  const descuento = Math.round(subTotal * (pctDesc / 100) * 100) / 100;

  // ITBIS por unidad: Round(Precio - Precio / (1 + %Imp/100), 2)
  const itbisUnit = pctImp > 0
    ? Math.round((precio - precio / (1 + pctImp / 100)) * 100) / 100
    : 0;
  const impuestos = Math.round(itbisUnit * cantidad * 100) / 100;
  const montoBase = subTotal - impuestos;
  const total = Math.round((subTotal - descuento) * 100) / 100;

  return {
    ...fila,
    cantidad,
    precio,
    precioNeto: precio,
    montoBase,
    subTotal,
    descuento,
    impuestos,
    total,
  };
}

// ===== Etiqueta legible del documento (factura referencia) =====
function etiquetaDocumento(doc: any, noDocumento?: string): string {
  if (doc && typeof doc === 'object') return `${doc.codigo || ''}-${noDocumento || ''}`;
  return (doc as string) || noDocumento || '';
}

function filaVacia(): DetalleDevolucionVentaDTO {
  return {
    id: 0,
    idTransaccion: 0,
    codigo: '',
    articulo: '',
    referencia: '',
    cantidad: 0,
    costo: 0,
    precio: 0,
    subTotal: 0,
    porcentajeDescuento: 0,
    descuento: 0,
    porcentajeImpuesto: 0,
    impuestos: 0,
    total: 0,
    tipoArticulo: 'Producto',
    tieneVencimiento: false,
  };
}

// ===== Componente BuscarFacturaModal =====
interface BuscarFacturaModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (factura: any) => void;
}

const BuscarFacturaModal: React.FC<BuscarFacturaModalProps> = ({ open, onClose, onSelect }) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [facturas, setFacturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const searchRef = useRef<any>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSearchText('');
    const hoy = dayjs();
    const desde = hoy.subtract(90, 'day');
    const fmt = (d: dayjs.Dayjs) => d.format('YYYYMMDDHHmmss');
    facturaPOSApi.obtenerVista(sucursalActiva, fmt(desde), fmt(hoy), 200, 0)
      // obtenerVista devuelve { data, total }
      .then((res) => setFacturas(Array.isArray(res?.data) ? res.data : []))
      .catch((err) => message.error(extraerMensajeError(err, 'Error al cargar facturas')))
      .finally(() => setLoading(false));
  }, [open, sucursalActiva]);

  // Foco del buscador al abrir (mismo delay de los demas modales de busqueda)
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => { searchRef.current?.focus?.(); }, 100);
    return () => clearTimeout(timer);
  }, [open]);

  const facturasFiltradas = facturas.filter((f) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return [f.documento, f.ncf, f.entidad, f.identificacion, f.referencia, f.concepto]
      .some((v) => (v || '').toString().toLowerCase().includes(q));
  });

  const columns = [
    { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 240 },
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110,
      render: (v: string) => formatDate(v) },
    { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 190 },
    { title: 'Cliente', dataIndex: 'entidad', key: 'entidad', ellipsis: true,
      render: (v: string) => toTitleCase(v || '') },
    { title: 'Total', dataIndex: 'total', key: 'total', width: 130, align: 'right' as const,
      render: (v: number) => formatNumber(v) },
  ];

  return (
    <Modal
      title="Buscar Factura POS"
      open={open}
      onCancel={onClose}
      footer={null}
      width={1280}
      destroyOnHidden
    >
      <Input.Search
        ref={searchRef}
        placeholder="Buscar por documento, NCF, cliente o RNC..."
        allowClear
        onSearch={(value) => setSearchText(value || '')}
        onChange={(e) => { if (!e.target.value) setSearchText(''); }}
        style={{ width: '100%', maxWidth: 500, marginBottom: 16 }}
        prefix={<SearchOutlined className="paces-text-icon" />}
      />
      <Table
        dataSource={facturasFiltradas}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 900 }}
        pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `${t} facturas` }}
        onRow={(record) => ({
          onClick: () => {
            onSelect(record);
            onClose();
          },
          style: { cursor: 'pointer' },
        })}
      />
    </Modal>
  );
};



// ===== Componente principal =====
const DevolucionVentaFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const { screenCode, documentCode } = useScreenConfig('FDEV');
  const documentoConfig = useDocumentoConfig(sucursalActiva, documentCode);

  // ===== Hook de carga de documento (encabezado primero + auto secciones) =====
  const { data, setData: setFullData, loading, loadingError, recargar } = useCargaDocumento<DevolucionVentaFullDTO>({
    id,
    sucursal: sucursalActiva,
    obtenerEncabezado: async (suc: number, docId: number) => {
      return await devolucionVentaApi.obtenerEncabezado(suc, docId) as any;
    },
    secciones: {
      detalles: {
        cargar: (suc: number, docId: number) => devolucionVentaApi.obtenerDetalles(suc, docId),
        prop: 'detalles',
      },
      asientos: {
        cargar: (suc: number, docId: number) => devolucionVentaApi.obtenerAsientos(suc, docId),
        prop: 'asientos',
      },
    },
    onEncabezadoCargado: (enc) => {
      const full: any = enc;
      setDetalles((full.detalles || []).map((d: any) => ({
        ...d,
        porcentajeImpuesto: d.porcentajeImpuesto || (d.impuesto?.porcentaje ?? 0),
        tieneVencimiento: d.tieneVencimiento ?? false,
      })));
      setAsientosLocales(full.asientos || []);
      setSelectedConcepto(full.concepto || null);
      setSelectedCliente(full.cliente || null);
      setSelectedAlmacen(full.almacen || null);
      setSelectedFactura(full.factura || null);

      const fechaDoc = full.fechaDocumento ? parseDateRaw(full.fechaDocumento) : null;
      form.setFieldsValue({
        concepto: full.concepto?.codigo || '',
        cliente: full.cliente?.codigo || '',
        almacen: full.almacen?.codigo || '',
        fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
        ncf: full.ncf || '',
        referencia: full.referencia || '',
        moneda: full.moneda?.nombre || '',
        tasa: full.tasa || 1,
        nota: full.nota || '',
      });

      if (full.concepto?.codigo) {
        devolucionVentaApi.obtenerClientes(sucursalActiva)
          .then((res: any) => setClientesCache(Array.isArray(res) ? res : []))
          .catch(() => {});
      }
    },
  });

  // ===== States =====
  const [saving, setSaving] = useState(false);
  const [detalles, setDetalles] = useState<DetalleDevolucionVentaDTO[]>([]);
  const [clientesCache, setClientesCache] = useState<{ nombre: string; codigo: string; identificacion: string; telefono?: string; direccion?: string }[]>([]);
  const [almacenesCache, setAlmacenesCache] = useState<AlmacenDTO[]>([]);
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<{ nombre: string; codigo: string; identificacion: string; telefono?: string; direccion?: string } | null>(null);
  const [selectedAlmacen, setSelectedAlmacen] = useState<AlmacenDTO | null>(null);
  const [selectedFactura, setSelectedFactura] = useState<any | null>(null);
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [facturaModalOpen, setFacturaModalOpen] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');
  const [medidasCache, setMedidasCache] = useState<UnidadMedidaDTO[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const editingOriginalValue = useRef<string | number>('');
  const editingValueRef = useRef<string | number>('');
  const fieldCloseHandledRef = useRef(false);

  const [searchParams] = useSearchParams();
  const pvId = searchParams.get('pvId');
  // La Factura Referencia es obligatoria: todo el documento se deriva de ella
  const desdePV = !!selectedFactura;

  const [form] = Form.useForm();

  const ncfValue = Form.useWatch('ncf', form) || '';
  const tasaValue = Form.useWatch('tasa', form) ?? 1;

  const monedaDefault = getMonedaSucursalActiva();

  const editValuesRef = useRef<Record<string, any>>({});
  const navigationConfirmedRef = useFormularioNavigation();

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const [activeId, setActiveId] = useState<number | null>(null);

  const detallesFiltrados = detalleSearch
    ? detalles.filter((d) => {
        const q = detalleSearch.toLowerCase();
        return (d.codigo || '').toLowerCase().includes(q) ||
          (d.articulo || '').toLowerCase().includes(q) ||
          (d.referencia || '').toLowerCase().includes(q);
      })
    : detalles;

  const sinOC = true;
  const isLarge = screens.xxl === true;

  // ===== Determinar estado =====
  const estado = data?.estado ?? 0;
  const esCerrado = data?.periodo === 6;
  const esBorrador = estado === 0;
  const esAplicado = estado === 1;
  const esAnulado = estado === 3;

  const usuario = useAuthStore((s: any) => s.usuario);
  const permisoModificarAsientos = usuario?.permisosEspeciales?.some(
    (p: any) => p.codigo?.toUpperCase() === 'PE_MODIFICAR_ASIENTOS' && p.valor === true
  ) ?? false;
  const [generandoAsientos, setGenerandoAsientos] = useState(false);

  // ===== Cargar datos de apoyo al montar =====
  useEffect(() => {
    setActiveModule(screenCode);
    const pageTitle = mode === 'crear' ? 'Nueva Devolución de Venta' : 'Editar Devolución de Venta';
    setPageTitleOverride(pageTitle);

    // Cargar almacenes
    devolucionVentaApi.obtenerAlmacenes(sucursalActiva).then(setAlmacenesCache).catch((err) => console.warn('Error al cargar almacenes cache', err));
    unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch((err) => console.warn('Error al cargar medidas cache', err));

    // Inicializar fechas en modo crear
    if (mode === 'crear') {
      form.setFieldsValue({
        fechaDocumento: dayjs(),
      });
    }

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, sucursalActiva, form]);

  // ===== Asientos editables locales =====
  const [asientosLocales, setAsientosLocales] = useState<any[]>([]);
  const [errorGeneracion, setErrorGeneracion] = useState<string | null>(null);
  const [asientosModificados, setAsientosModificados] = useState(false);

  // ===== Cargar todo el documento a partir de la Factura Referencia =====
  const aplicarFacturaReferencia = useCallback(async (facturaId: number) => {
    const facturaFull = await devolucionVentaApi.obtenerFacturaPOS(sucursalActiva, facturaId);
    if (!facturaFull) {
      message.error('Factura no encontrada');
      return;
    }

    setSelectedFactura({
      id: facturaFull.id,
      documento: facturaFull.documento,
      noDocumento: facturaFull.noDocumento,
      fechaDocumento: facturaFull.fechaDocumento,
    });

    // Concepto, cliente y almacén provienen de la factura
    setSelectedConcepto(facturaFull.concepto || null);
    setSelectedCliente(facturaFull.cliente || null);
    setSelectedAlmacen(facturaFull.almacen || null);

    if (facturaFull.cliente) {
      devolucionVentaApi.obtenerClientes(sucursalActiva)
        .then((res: any) => setClientesCache(Array.isArray(res) ? res : []))
        .catch((err) => console.warn('Error al cargar clientes cache', err));
    }

    const fechaActual = form.getFieldValue('fechaDocumento');
    form.setFieldsValue({
      concepto: facturaFull.concepto?.codigo || '',
      cliente: facturaFull.cliente?.codigo || '',
      almacen: facturaFull.almacen?.codigo || '',
      fechaDocumento: mode === 'crear' ? dayjs() : (fechaActual || dayjs()),
      moneda: facturaFull.moneda?.nombre || 'Peso Dominicano',
      tasa: facturaFull.tasa || 1,
    });

    // Moneda para el TotalesCard
    setFullData((prev: any) => {
      if (!prev) return prev;
      return { ...prev, moneda: facturaFull.moneda || null };
    });

    // Detalles de la factura, con la cantidad a devolver en 0
    const nuevosDetalles: DetalleDevolucionVentaDTO[] = (facturaFull.detalles || []).map((d: any, idx: number) => ({
      id: -(idx + 1),
      idTransaccion: 0,
      idAsociado: d.id,
      codigo: d.codigo || '',
      articulo: d.articulo || '',
      referencia: d.referencia || '',
      cantidad: 0, // El usuario elige cuánto devolver
      cantidadOriginal: d.cantidad || 0, // Cantidad original de la PV
      costo: d.costo || 0,
      precio: d.precio || 0,
      subTotal: 0,
      porcentajeDescuento: d.porcentajeDescuento || 0,
      descuento: 0,
      porcentajeImpuesto: d.porcentajeImpuesto || 0,
      impuestos: 0,
      total: 0,
      tipoArticulo: d.tipoArticulo || 'Producto',
      tieneVencimiento: d.tieneVencimiento || false,
      familia: d.familia,
      medida: d.medida,
      impuesto: d.impuesto,
    }));

    setDetalles(nuevosDetalles.map((d) => calcularFila(d)));
    message.success(
      `Factura ${etiquetaDocumento(facturaFull.documento, facturaFull.noDocumento)} cargada: ${nuevosDetalles.length} detalle(s). Indique la cantidad a devolver.`
    );
  }, [form, mode, sucursalActiva, setFullData]);

  // ===== Precarga desde PV (si viene query param pvId) =====
  useEffect(() => {
    if (mode !== 'crear' || !pvId) return;
    const cargarDesdePV = async () => {
      try {
        await aplicarFacturaReferencia(parseInt(pvId, 10));
      } catch (err: any) {
        const msg = extraerMensajeError(err, 'Error al cargar la factura POS');
        message.error(msg);
      }
    };

    cargarDesdePV();
  }, [mode, pvId, sucursalActiva, aplicarFacturaReferencia]);

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
        setEditingField(null);
        if (mode === 'crear') {
          navigationConfirmedRef.current = true;
          navigate('/FDEV', { replace: true });
        } else {
          navigationConfirmedRef.current = true;
          navigate(`/FDEV/${id}`, { replace: true });
        }
      },
    });
  };

  // Validación del formulario
  const validarFormulario = (): string | null => {
    const values = form.getFieldsValue();
    if (!selectedFactura) return 'Debe seleccionar la Factura Referencia para poder continuar';
    if (!selectedConcepto) return 'Debe elegir un Concepto para poder continuar';
    if (!selectedCliente && !values.cliente) return 'El cliente es requerido';
    if (!selectedAlmacen && !values.almacen) return 'El almacén es requerido';
    if (detalles.length === 0) return 'No se puede crear un documento de DEVOLUCIÓN VENTA sin detalle.';
    if (!detalles.some((d) => (d.cantidad || 0) > 0)) return 'Debe tener al menos un detalle con cantidad > 0';

    // Con factura referencia, ninguna cantidad a devolver puede exceder la original
    if (desdePV) {
      const excedido = detalles.find((d) => (d.cantidadOriginal || 0) > 0 && (d.cantidad || 0) > (d.cantidadOriginal || 0));
      if (excedido) {
        return `La cantidad a devolver del artículo "${excedido.articulo}" (${excedido.cantidad}) excede la cantidad original de la factura (${excedido.cantidadOriginal})`;
      }
      // La nota es obligatoria en devoluciones con factura referencia
      if (!values.nota || !values.nota.trim()) {
        return 'La nota es obligatoria para devoluciones con factura referencia';
      }
    }

    const fecha = values.fechaDocumento;
    if (fecha) {
      const f = typeof fecha === 'object' && fecha.toDate ? fecha.toDate() : new Date(fecha);
      if (f > new Date()) return 'La fecha del documento no puede ser mayor a hoy';
    }

    return null;
  };

  // Construir DTO desde el formulario
  const construirDTO = (): DevolucionVentaFullDTO => {
    const values = form.getFieldsValue();
    const base = data || ({} as any);

    const clienteSel = clientesCache.find((e) => e.codigo === values.cliente) || selectedCliente;

    const fechaDoc = values.fechaDocumento
      ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
        ? toISOFormat(values.fechaDocumento.toDate())
        : values.fechaDocumento)
      : toISOFormat(new Date());

    // Filtrar solo detalles con cantidad > 0 para enviar al backend
    const detallesValidos = detalles
      .filter((d) => (d.cantidad || 0) > 0)
      .map((d) => {
        const calculado = calcularFila(d);
        // Cuando la devolución es desde PV, incluir devuelto (cantidad a devolver)
        if (desdePV) {
          return { ...calculado, devuelto: d.cantidad };
        }
        return calculado;
      });

    const totalSub = detallesValidos.reduce((s, d) => s + (d.subTotal || 0), 0);
    const totalDesc = detallesValidos.reduce((s, d) => s + (d.descuento || 0), 0);
    const totalImp = detallesValidos.reduce((s, d) => s + (d.impuestos || 0), 0);
    const total = detallesValidos.reduce((s, d) => s + (d.total || 0), 0);

    return {
      id: base.id || 0,
      fechaDocumento: fechaDoc,
      noDocumento: base.noDocumento || '',
      estado: base.estado || 0,
      periodo: base.periodo || new Date().getMonth() + 1,
      ncf: values.ncf || '',
      referencia: values.referencia || '',
      nota: values.nota || '',
      subTotal: Math.round(totalSub * 100) / 100,
      descuento: Math.round(totalDesc * 100) / 100,
      impuestos: Math.round(totalImp * 100) / 100,
      total: Math.round(total * 100) / 100,
      tasa: values.tasa || 1,
      tipoDocumento: base.tipoDocumento ?? 20,
      documento: base.documento || { codigo: documentCode },
      concepto: selectedConcepto || { nombre: '', codigo: '' },
      moneda: base.moneda || getMonedaSucursalActiva(),
      almacen: selectedAlmacen || { nombre: '', codigo: '' },
      cliente: clienteSel
        ? { nombre: clienteSel.nombre, codigo: clienteSel.codigo, identificacion: clienteSel.identificacion || '' }
        : { nombre: '', codigo: '', identificacion: '' },
      entidad: clienteSel
        ? { nombre: clienteSel.nombre, codigo: clienteSel.codigo, identificacion: clienteSel.identificacion || '', telefono: clienteSel.telefono, direccion: clienteSel.direccion }
        : { nombre: '', codigo: '', identificacion: '' },
      factura: selectedFactura || null,
      sucursal: base.sucursal || { nombre: '', codigo: '', identificacion: '' },
      detalles: detallesValidos,
      asientos: base.asientos || [],
      logs: base.logs || [],
    };
  };

  // ===== Handlers de campos rápidos =====
  const openFieldEditor = (field: string) => {
    const val = form.getFieldValue(field);
    const defaultVal = field === 'tasa' ? 1 : '';
    editingOriginalValue.current = val ?? defaultVal;
    editingValueRef.current = val ?? defaultVal;
    setEditingField(field);
    fieldCloseHandledRef.current = false;
  };

  const commitFieldEditor = () => {
    if (fieldCloseHandledRef.current) return;
    fieldCloseHandledRef.current = true;
    const field = editingField;
    if (field) {
      const newValue = editingValueRef.current;
      form.setFieldsValue({ [field]: newValue });
    }
    setEditingField(null);
  };

  const cancelFieldEditor = () => {
    if (fieldCloseHandledRef.current) return;
    fieldCloseHandledRef.current = true;
    const field = editingField;
    if (field) {
      form.setFieldsValue({ [field]: editingOriginalValue.current });
    }
    setEditingField(null);
  };

  const handleGuardar = async () => {
    const error = validarFormulario();
    if (error) {
      message.error(error);
      return;
    }

    setSaving(true);
    try {
      if (mode === 'crear') {
        // La factura referencia es obligatoria: el encabezado se arma en el backend desde la PV
        const dto = construirDTO();
        const result = await devolucionVentaApi.crearDesdePV(
          sucursalActiva,
          selectedFactura.id,
          { detalles: dto.detalles || [], nota: dto.nota }
        );
        message.success('Devolución de venta creada exitosamente');
        navigationConfirmedRef.current = true;
        navigate(`/FDEV/${result.id}`, { replace: true });
      } else {
        const dto = construirDTO();
        await devolucionVentaApi.actualizar(sucursalActiva, dto);
        message.success('Devolución de venta actualizada exitosamente');
        navigationConfirmedRef.current = true;
        navigate(`/FDEV/${id}`, { replace: true });
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = (event: any) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDetalles((prev) => {
      const oldIndex = prev.findIndex((d) => d.id === active.id);
      const newIndex = prev.findIndex((d) => d.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(oldIndex, 1);
      updated.splice(newIndex, 0, moved);
      return updated;
    });
  };

  // ===== Handlers de factura referencia =====
  const handleFacturaSelect = (factura: any) => {
    const cargar = async () => {
      try {
        await aplicarFacturaReferencia(factura.id);
      } catch (err: any) {
        message.error(extraerMensajeError(err, 'Error al cargar la factura'));
      }
    };

    // En edición puede haber datos cargados que se reemplazarán
    if (detalles.length > 0 || selectedConcepto) {
      Modal.confirm({
        title: '¿Reemplazar los datos actuales?',
        icon: <ExclamationCircleOutlined />,
        content: 'Al seleccionar la factura se reemplazarán el concepto, cliente, almacén y los detalles actuales por los de la factura. ¿Desea continuar?',
        okText: 'Sí, reemplazar',
        cancelText: 'No',
        onOk: cargar,
      });
    } else {
      cargar();
    }
  };

  const handleFacturaClear = () => {
    // Sin factura referencia no hay documento: se limpia todo lo derivado de ella
    setSelectedFactura(null);
    setSelectedConcepto(null);
    setSelectedCliente(null);
    setSelectedAlmacen(null);
    setClientesCache([]);
    setDetalles([]);
    form.setFieldsValue({
      concepto: '',
      cliente: undefined,
      almacen: undefined,
      referencia: '',
      moneda: getMonedaSucursalActiva().nombre,
      tasa: 1,
    });
  };

  // ===== Handlers de detalles =====
  const handleAgregarFila = () => {
    const newId = -(detalles.length + 1);
    setDetalles((prev) => [calcularFila({ ...filaVacia(), id: newId }), ...prev]);
  };

  const handleEliminarFila = (detId: number) => {
    Modal.confirm({
      title: 'Eliminar detalle',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro de eliminar este detalle?',
      okText: 'Sí',
      cancelText: 'No',
      okButtonProps: { danger: true },
      onOk: () => {
        setDetalles((prev) => prev.filter((d) => d.id !== detId));
      },
    });
  };

  const handleDetalleUpdateValue = (detId: number, field: string, value: any) => {
    setDetalles((prev) =>
      prev.map((d) => (d.id !== detId ? d : { ...d, [field]: value }))
    );
  };

  const handleDetalleCalculate = (detId: number, field: string, value: any) => {
    setDetalles((prev) =>
      prev.map((d) => {
        if (d.id !== detId) return d;
        const updated = { ...d, [field]: value };
        return calcularFila(updated);
      })
    );
  };

  const handleProductoSelect = (producto: any) => {
    const filaVaciaIdx = detalles.findIndex((d) => !d.codigo);
    if (filaVaciaIdx === -1) {
      const nuevoId = -(detalles.length + 1);
      setDetalles((prev) => {
        const filled: DetalleDevolucionVentaDTO = {
          ...filaVacia(),
          id: nuevoId,
          codigo: producto.codigo,
          articulo: producto.articulo,
          referencia: producto.referencia || '',
          costo: producto.costo || 0,
          precio: producto.precio || 0,
          familia: producto.familia,
          medida: producto.medida,
          impuesto: producto.impuesto,
          porcentajeImpuesto: producto.impuesto?.porcentaje || 0,
          tieneVencimiento: producto.tieneVencimiento || false,
          modificaPrecio: producto.modificaPrecio ?? false,
          modificaDescripcion: producto.modificaDescripcion ?? false,
        };
        return [calcularFila(filled), ...prev];
      });
    } else {
      setDetalles((prev) =>
        prev.map((d) => {
          if (d.id !== detalles[filaVaciaIdx].id) return d;
          const filled: DetalleDevolucionVentaDTO = {
            ...d,
            codigo: producto.codigo,
            articulo: producto.articulo,
            referencia: producto.referencia || '',
            costo: producto.costo || 0,
            precio: producto.precio || 0,
            familia: producto.familia,
            medida: producto.medida,
            impuesto: producto.impuesto,
            porcentajeImpuesto: producto.impuesto?.porcentaje || 0,
            tieneVencimiento: producto.tieneVencimiento || false,
            modificaPrecio: producto.modificaPrecio ?? false,
            modificaDescripcion: producto.modificaDescripcion ?? false,
          };
          return calcularFila(filled);
        })
      );
    }
  };

  // ===== Totales calculados =====
  const totales = {
    subTotal: detalles.reduce((s, d) => s + (d.subTotal || 0), 0),
    descuento: detalles.reduce((s, d) => s + (d.descuento || 0), 0),
    impuestos: detalles.reduce((s, d) => s + (d.impuestos || 0), 0),
    total: detalles.reduce((s, d) => s + (d.total || 0), 0),
  };

  // ===== Generar asientos contables =====
  const handleGenerarAsientos = async () => {
    if (sucursalActiva === undefined) return;
    setGenerandoAsientos(true);
    setErrorGeneracion(null);
    try {
      const dto = construirDTO();
      const asientosGenerados = await transaccionApi.generarAsientos(sucursalActiva, dto);
      setAsientosLocales(asientosGenerados);
      message.success(`Se generaron ${asientosGenerados.length} asientos`);
    } catch (err: any) {
      const msg = err?.message || 'Error al generar asientos';
      setErrorGeneracion(msg);
    } finally {
      setGenerandoAsientos(false);
    }
  };

  const handleRefresh = useCallback(() => {
    if (mode === 'crear') return;
    if (!id) return;
    recargar();
  }, [id, mode, recargar]);

  // ===== Loading state =====
  if (loading) {
    return <LoadingSpinner mensaje="Cargando documento..." />;
  }

  // ===== Estado info =====
  const estadoInfo = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Borrador', color: 'default' };

  // ===== Grid de detalles editable =====
  const detalleColumns = [
    {
      title: '',
      key: 'sort',
      width: 40,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: () => <DragHandle />,
    },
    {
      title: 'Código',
      key: 'codigo',
      width: 120,
      fixed: 'left' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13 }}>
          <div>{record.codigo || '-'}</div>
          {record.referencia && (
            <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5 }}>
              {record.referencia}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Artículo',
      key: 'articulo',
      ellipsis: true,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, _record: any, idx: number) => {
        const fila = detalles[idx];
        if (!fila) return null;
        const docPermiteDesc = documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion ?? true;
        if (docPermiteDesc && !desdePV) {
          return (
            <div style={{ fontSize: 13 }}>
              <Input
                size="small"
                style={{ width: '100%' }}
                value={fila.articulo || ''}
                onChange={(e) => handleDetalleUpdateValue(fila.id, 'articulo', e.target.value)}
              />
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }}>
                {fila.familia?.nombre ? <Tag style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>{toTitleCase(fila.familia.nombre)}</Tag> : null}
                {fila.fechaVencimiento && <span>V: {formatDate(fila.fechaVencimiento)}</span>}
              </div>
            </div>
          );
        }
        return (
          <div style={{ fontSize: 13 }}>
            <div>{toTitleCase(fila.articulo || '')}</div>
            <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }}>
              {fila.familia?.nombre ? <Tag style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>{toTitleCase(fila.familia.nombre)}</Tag> : null}
              {fila.fechaVencimiento && <span>V: {formatDate(fila.fechaVencimiento)}</span>}
            </div>
          </div>
        );
      },
    },
    // Columna "Cant. Original" — solo cuando la DEV viene desde PV
    ...(desdePV ? [{
      title: 'Cant. Original',
      key: 'cantidadOriginal',
      width: 100,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: DetalleDevolucionVentaDTO) => (
        <div style={{ fontSize: 13 }}>
          <span>{formatNumber(record.cantidadOriginal || 0)}</span>
          {record.medida?.nombre && (
            <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, textAlign: 'right' }}>
              {toTitleCase(record.medida.nombre)}
            </div>
          )}
        </div>
      ),
    }] : []),
    {
      title: desdePV ? 'A Devolver' : 'Devuelto',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 100,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      shouldCellUpdate: (record: DetalleDevolucionVentaDTO, prevRecord: DetalleDevolucionVentaDTO) =>
        record.cantidad !== prevRecord.cantidad || record.medida?.nombre !== prevRecord.medida?.nombre,
      render: (_: any, _record: DetalleDevolucionVentaDTO, idx: number) => (
        <div>
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            styles={{ input: { textAlign: 'right' } }}
            min={0}
            max={desdePV ? (detalles[idx]?.cantidadOriginal ?? undefined) : undefined}
            step={0.01}
            precision={2}
            controls={false}
            defaultValue={detalles[idx]?.cantidad}
            onChange={(val) => { editValuesRef.current[`${detalles[idx].id}_cantidad`] = val || 0; }}
            onBlur={() => { const val = editValuesRef.current[`${detalles[idx].id}_cantidad`] ?? detalles[idx]?.cantidad; handleDetalleCalculate(detalles[idx].id, 'cantidad', val); }}
            onPressEnter={() => { const val = editValuesRef.current[`${detalles[idx].id}_cantidad`] ?? detalles[idx]?.cantidad; handleDetalleCalculate(detalles[idx].id, 'cantidad', val); }}
          />
          {detalles[idx]?.medida?.nombre && !sinOC && (
            <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 2 }}>
              {toTitleCase(detalles[idx].medida!.nombre)}
            </div>
          )}
        </div>
      ),
    },
    ...(sinOC ? [{
      title: 'Medida',
      key: 'medida',
      width: 160,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any, _idx: number) => {
        if (desdePV) {
          return (
            <Text style={{ fontSize: 13 }}>{toTitleCase(record.medida?.nombre || '')}</Text>
          );
        }
        const curId = record.medida?.idExterno;
        const hasMatch = medidasCache.some((m) => m.idExterno === curId);
        return (
          <Select
            size="small"
            style={{ width: '100%' }}
            key={medidasCache.length}
            value={hasMatch ? curId : undefined}
            onChange={(idExterno) => {
              const medida = medidasCache.find((m) => m.idExterno === idExterno);
              if (medida) {
                handleDetalleCalculate(record.id, 'medida', {
                  nombre: medida.nombre,
                  codigo: medida.codigo,
                  factor: medida.factor,
                  idExterno: medida.idExterno,
                });
              }
            }}
          >
            {medidasCache.map((m) => (
              <Select.Option key={m.idExterno ?? 0} value={m.idExterno}>
                {toTitleCase(m.nombre || '')}
              </Select.Option>
            ))}
          </Select>
        );
      },
    }] : []),
    {
      title: 'Precio',
      dataIndex: 'precio',
      key: 'precio',
      width: 130,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
      shouldCellUpdate: (record: DetalleDevolucionVentaDTO, prevRecord: DetalleDevolucionVentaDTO) => record.precio !== prevRecord.precio || record.porcentajeDescuento !== prevRecord.porcentajeDescuento || record.cantidad !== prevRecord.cantidad || record.medida?.factor !== prevRecord.medida?.factor || record.modificaPrecio !== prevRecord.modificaPrecio,
      render: (_: any, _record: DetalleDevolucionVentaDTO, idx: number) => {
        const fila = detalles[idx];
        if (!fila) return null;
        const precioBase = Number(fila.precio) || 0;
        const pctDesc = Number(fila.porcentajeDescuento) || 0;
        const factor = Number(fila.medida?.factor) || 1;
        const precioConDescuento = precioBase - ((precioBase * pctDesc) / 100);
        const precioUnitario = precioConDescuento / factor;
        const docPermiteEditar = documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio ?? true;
        if (docPermiteEditar && !desdePV) {
          return (
            <div>
              <InputNumber
                size="small"
                style={{ width: '100%' }}
                styles={{ input: { textAlign: 'right' } }}
                min={0}
                step={0.01}
                precision={2}
                controls={false}
                value={fila.precio}
                onChange={(val) => handleDetalleUpdateValue(fila.id, 'precio', val || 0)}
                onBlur={() => handleDetalleCalculate(fila.id, 'precio', fila.precio || 0)}
                onPressEnter={() => handleDetalleCalculate(fila.id, 'precio', fila.precio || 0)}
              />
              <div style={{ fontSize: 11, lineHeight: 1.5, color: '#999' }}>
                {formatNumber(precioUnitario)} × {factor}
              </div>
            </div>
          );
        }
        return (
          <div>
            <Text>{formatNumber(precioBase)}</Text>
            <div style={{ fontSize: 11, lineHeight: 1.5, color: '#999' }}>
              {formatNumber(precioUnitario)} × {factor}
            </div>
          </div>
        );
      },
    },
    {
      title: 'SubTotal',
      dataIndex: 'subTotal',
      key: 'subTotal',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      shouldCellUpdate: (record: DetalleDevolucionVentaDTO, prevRecord: DetalleDevolucionVentaDTO) =>
        record.subTotal !== prevRecord.subTotal,
      render: (_: any, record: DetalleDevolucionVentaDTO) => (
        <Text>{formatNumber(record.subTotal || 0)}</Text>
      ),
    },
    {
      title: '% Desc',
      key: 'porcentajeDescuento',
      width: 90,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, _record: DetalleDevolucionVentaDTO, idx: number) => {
        if (desdePV) {
          return <Text>{formatNumber(detalles[idx]?.porcentajeDescuento || 0)}%</Text>;
        }
        return (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          min={0}
          max={100}
          step={0.01}
          precision={2}
          defaultValue={detalles[idx]?.porcentajeDescuento}
          onChange={(val) => { editValuesRef.current[`${detalles[idx].id}_porcentajeDescuento`] = val || 0; }}
          onBlur={() => { const val = editValuesRef.current[`${detalles[idx].id}_porcentajeDescuento`] ?? detalles[idx]?.porcentajeDescuento; handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', val); }}
          onPressEnter={() => { const val = editValuesRef.current[`${detalles[idx].id}_porcentajeDescuento`] ?? detalles[idx]?.porcentajeDescuento; handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', val); }}
          addonAfter="%"
        />
        );
      },
    },
    {
      title: 'Desc.',
      key: 'descuento',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      shouldCellUpdate: (record: DetalleDevolucionVentaDTO, prevRecord: DetalleDevolucionVentaDTO) =>
        record.descuento !== prevRecord.descuento,
      render: (_: any, record: DetalleDevolucionVentaDTO) => (
        <Text>{formatNumber(record.descuento || 0)}</Text>
      ),
    },
    {
      title: 'Imp.',
      key: 'impuestos',
      width: 140,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      shouldCellUpdate: (record: DetalleDevolucionVentaDTO, prevRecord: DetalleDevolucionVentaDTO) =>
        record.impuestos !== prevRecord.impuestos || record.impuesto?.nombre !== prevRecord.impuesto?.nombre,
      render: (_: any, record: DetalleDevolucionVentaDTO) => (
        <div>
          <div>{formatNumber(record.impuestos || 0)}</div>
          {record.impuesto?.nombre && (
            <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5 }}>{toTitleCase(record.impuesto.nombre)}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      shouldCellUpdate: (record: DetalleDevolucionVentaDTO, prevRecord: DetalleDevolucionVentaDTO) =>
        record.total !== prevRecord.total,
      render: (_: any, record: DetalleDevolucionVentaDTO) => (
        <Text strong>{formatNumber(record.total || 0)}</Text>
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 50,
      onCell: () => ({ style: { paddingRight: 8 } }),
      render: (_: any, _record: DetalleDevolucionVentaDTO, idx: number) => {
        if (desdePV) return null;
        const items = [
          {
            key: 'eliminar',
            label: 'Eliminar',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleEliminarFila(detalles[idx].id),
          },
        ];
        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  // ===== Encabezado del formulario =====
  const renderEncabezado = () => (
    <Card className="paces-card" size="small" title="Datos Generales" extra={<EstadoTag estado={estado} periodo={data?.periodo} />} style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={24} xxl={18}>
          <Form form={form} layout="vertical" size="middle" style={{ paddingTop: 24 }}>
        <Row gutter={[16, 24]}>
          {/* Fila 1: Factura Referencia (obligatoria, punto de partida del documento) */}
          <Col xs={24} sm={12} lg={9}>
            <div>
              <FloatingField label="Factura Referencia" required>
                <Input
                  placeholder=" "
                  value={selectedFactura ? etiquetaDocumento(selectedFactura.documento, selectedFactura.noDocumento) : ''}
                  readOnly
                  suffix={
                    <Space size={4}>
                      <SearchOutlined onClick={() => setFacturaModalOpen(true)} style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }} />
                      {selectedFactura && <ClearOutlined onClick={handleFacturaClear} style={{ cursor: 'pointer' }} />}
                    </Space>
                  }
                  onClick={() => setFacturaModalOpen(true)}
                />
              </FloatingField>
            </div>
          </Col>

          {/* Concepto: proviene de la factura referencia */}
          <Col xs={24} sm={12} lg={15}>
            <div>
              <FloatingField label="Concepto" required>
                <Input
                  placeholder=" "
                  value={selectedConcepto ? `${selectedConcepto.codigo || ''} - ${toTitleCase(selectedConcepto.nombre)}` : ''}
                  readOnly
                />
              </FloatingField>
              <ConceptoInfoLabel concepto={selectedConcepto} />
            </div>
            <Form.Item name="concepto" hidden><Input /></Form.Item>
          </Col>

          {/* Fila 2: Fecha Documento */}
          <Col xs={24} sm={12} lg={9}>
            <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }}>
              <FloatingField label="Fecha Documento" required>
                <DatePicker style={{ width: '100%' }}
                  disabled={desdePV}
                  disabledDate={(current) => {
                    if (!current) return false;
                    const cierre = fechasCierre?.[sucursalActiva];
                    if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day')) return true;
                    const cierreInv = fechasCierreInv?.[sucursalActiva];
                    if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day')) return true;
                    return false;
                  }} />
              </FloatingField>
            </Form.Item>
          </Col>

          {/* Fila 2: Cliente */}
          <Col xs={24} sm={12} lg={15}>
            <Form.Item name="cliente" required style={{ marginBottom: 0 }}>
              <FloatingField label="Cliente" required>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    disabled={desdePV}
                    onChange={(val) => {
                      const ent = clientesCache.find((e) => e.codigo === val);
                      setSelectedCliente(ent || null);
                    }}
                  >
                    {clientesCache.map((ent) => (
                      <Select.Option key={ent.codigo} value={ent.codigo}>
                        {toTitleCase(ent.nombre)}{ent.identificacion ? ` (${ent.identificacion})` : ''}
                      </Select.Option>
                    ))}
                  </Select>
              </FloatingField>
            </Form.Item>
          </Col>

          {/* Fila 3: Fecha Factura */}
          <Col xs={24} sm={12} lg={9}>
            <div>
              <FloatingField label="Fecha Factura">
                <DatePicker
                  style={{ width: '100%' }}
                  disabled
                  value={selectedFactura?.fechaDocumento ? dayjs(selectedFactura.fechaDocumento) : null}
                />
              </FloatingField>
            </div>
          </Col>

          {/* Fila 3: Almacén */}
          <Col xs={24} sm={12} lg={15}>
            <Form.Item name="almacen" required style={{ marginBottom: 0 }}>
              <FloatingField label="Almacén" required>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  disabled={desdePV}
                  onChange={(val) => {
                    const alm = almacenesCache.find((a) => a.codigo === val);
                    setSelectedAlmacen(alm || null);
                  }}
                >
                  {almacenesCache.map((alm) => (
                    <Select.Option key={alm.codigo} value={alm.codigo}>
                      {toTitleCase(alm.nombre)}
                    </Select.Option>
                  ))}
                </Select>
              </FloatingField>
            </Form.Item>
          </Col>

          {/* Fila 4: Botones rápidos NCF + Tasa */}
          <CamposRapidosFila
            ncf={
              desdePV
                ? ncfValue
                  ? {
                      valor: ncfValue,
                      readOnly: true,
                      prefijo: 'NCF: ',
                      onEdit: () => openFieldEditor('ncf'),
                      onCommit: commitFieldEditor,
                      onCancel: cancelFieldEditor,
                    }
                  : undefined
                : {
                    valor: ncfValue,
                    editando: editingField === 'ncf',
                    etiqueta: 'NCF',
                    prefijo: 'NCF: ',
                    placeholder: 'NCF',
                    maxLength: 19,
                    onEdit: () => openFieldEditor('ncf'),
                    onCommit: commitFieldEditor,
                    onCancel: cancelFieldEditor,
                    onChange: (v) => { editingValueRef.current = v; },
                  }
            }
            tasa={{
              tasa: tasaValue,
              editable: !desdePV,
              editando: editingField === 'tasa',
              onEdit: () => openFieldEditor('tasa'),
              onChange: (v) => { editingValueRef.current = v ?? 0; },
              onCommit: commitFieldEditor,
              onCancel: cancelFieldEditor,
            }}
            ocultos={[
              { name: 'ncf' },
              { name: 'tasa', editor: 'number' },
            ]}
          />

          {/* Fila 5: Nota */}
          <Col xs={24}>
            <Form.Item name="nota" style={{ marginBottom: 0 }}>
              <MemoField label="Nota" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
        </Col>
        <Col xs={24} xxl={6}>
          <div style={{ marginTop: 24 }}>
            <TotalesCard
              subTotal={totales.subTotal}
              descuento={totales.descuento}
              impuestos={totales.impuestos}
              total={totales.total}
              hideTitle
              monedaSimbolo={data?.moneda?.simbolo || selectedConcepto?.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={data?.moneda?.nombre || selectedConcepto?.moneda?.nombre || monedaDefault.nombre}
              tasa={tasaValue ?? data?.tasa ?? 1}
            />
          </div>
        </Col>
      </Row>
    </Card>
  );

  return (
    <div>
      <FormularioToolbar saving={saving} estado={estado} periodo={data?.periodo} onGuardar={handleGuardar} onCancelar={handleCancelar} />

      {!selectedFactura && (
        <Alert
          message="Paso 1: seleccione la Factura Referencia"
          description="La devolución se construye a partir de la factura: concepto, cliente, almacén, moneda y productos se cargan automáticamente. Luego indique la cantidad a devolver de cada línea."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          closable={false}
          action={
            <Button size="small" type="primary" icon={<SearchOutlined />} onClick={() => setFacturaModalOpen(true)}>
              Buscar factura
            </Button>
          }
        />
      )}

      {desdePV && selectedFactura && (
        <Alert
          message={
            <span>
              Devolución desde la factura{' '}
              <Text strong>{etiquetaDocumento(selectedFactura.documento, selectedFactura.noDocumento)}</Text>
              {detalles.length > 0 && detalles.every((d) => (d.cantidad || 0) === 0) && ' — indique la cantidad a devolver de cada línea'}
            </span>
          }
          type="info"
          showIcon
          icon={<RollbackOutlined />}
          style={{ marginBottom: 16 }}
          closable={false}
        />
      )}

      {loadingError && (
        <Alert
          message="Error al cargar formulario de devolución de venta"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={handleRefresh}>
              Reintentar
            </Button>
          }
        />
      )}

      {errorGeneracion && (
        <Alert
          message="Error al generar asientos"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          description={errorGeneracion}
          closable
          onClose={() => setErrorGeneracion(null)}
        />
      )}

      <BuscarProductoModal
        open={productoModalOpen}
        onClose={() => setProductoModalOpen(false)}
        onSelect={handleProductoSelect}
        mode="venta"
      />

      <BuscarFacturaModal
        open={facturaModalOpen}
        onClose={() => setFacturaModalOpen(false)}
        onSelect={handleFacturaSelect}
      />

      {isLarge ? (
        /* === DESKTOP LAYOUT (>= lg) === */
        <Row gutter={16}>
          <Col xxl={24}>
            {renderEncabezado()}

            <Tabs
              defaultActiveKey="detalles"
              type="card"
              style={{ borderRadius: 8, padding: '0 16px' }}
              items={[
                {
                  key: 'detalles',
                  icon: <InboxOutlined />, label: `Productos/Servicios (${detalles.length}${detalleSearch ? ` filtrados` : ''})`,
                  children: (
                    <>
                      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {!desdePV && (
                        <Space>
                          <Button
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={handleAgregarFila}
                          >
                            Agregar fila
                          </Button>
                          <Button
                            icon={<SearchOutlined />}
                            onClick={() => setProductoModalOpen(true)}
                          >
                            Buscar Producto
                          </Button>
                        </Space>
                        )}
                        <Input.Search
                          placeholder="Buscar detalle..."
                          allowClear
                          style={{ maxWidth: 250 }}
                          onSearch={(value) => setDetalleSearch(value)}
                          onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                        />
                      </div>
                      {(documentoConfig?.modificaPrecio === false || documentoConfig?.modificaDescripcion === false || data?.documento?.modificaPrecio === false || data?.documento?.modificaDescripcion === false) && detalles.length > 0 && (
                        <CamposRestringidosAlert
                          modificaPrecio={documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio}
                          modificaDescripcion={documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion}
                        />
                      )}
                      <DndContext sensors={sensors} collisionDetection={closestCenter}
                        onDragStart={(event) => setActiveId(event.active.id as number)}
                        onDragEnd={handleDragEnd}
                        onDragCancel={() => setActiveId(null)}>
                        <SortableContext items={detallesFiltrados.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                      <Table
                        dataSource={detallesFiltrados}
                        columns={detalleColumns}
                        rowKey="id"
                        size="small"
                        pagination={false}
                        scroll={{ x: 1300 }}
                        components={{ body: { row: SortableRow } }}
                        locale={{
                          emptyText: (
                            <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Empty description={selectedFactura ? 'Sin registros' : 'Seleccione la factura referencia para cargar los productos'} />
                            </div>
                          ),
                        }}
                      />
                        </SortableContext>
                        <DragOverlay>
                          {activeId ? (
                            <div style={{ padding: '8px 16px', background: '#fff', border: '2px solid #556ee6', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, width: 300 }}>
                              <HolderOutlined style={{ color: '#556ee6' }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {detalles.find((d) => d.id === activeId)?.articulo || 'Arrastrando...'}
                              </span>
                            </div>
                          ) : null}
                        </DragOverlay>
                      </DndContext>
                    </>
                  ),
                },
                {
                  key: 'consumo',
                  label: `Consumo (0)`,
                  children: (
                    <div style={{ padding: 24, textAlign: 'center' }} className="paces-text-secondary">
                      Documentos que han utilizado esta nota de crédito (disponible después de aplicar).
                    </div>
                  ),
                },
                {
                  key: 'asientos',
                  label: `Asientos (${asientosLocales.length || data?.asientos?.length || 0})`,
                  children: (permisoModificarAsientos && estado === 0 && !selectedConcepto?.noAsientos) ? (
<AsientosContableEditables
  asientos={asientosModificados ? asientosLocales : (asientosLocales.length > 0 ? asientosLocales : (data?.asientos || []))}
  onChange={(nuevosAsientos) => {
    setAsientosLocales(nuevosAsientos);
    setAsientosModificados(true);
  }}
  editable={true}
  scroll={{ x: 900 }}
  onGenerar={handleGenerarAsientos}
  generando={generandoAsientos}
/>
                  ) : (
                    <AsientosContableTable asientos={asientosModificados ? asientosLocales : (asientosLocales.length > 0 ? asientosLocales : (data?.asientos || []))} scroll={{ x: 900 }} />
                  ),
                },
                {
                  key: 'historial',
                  icon: <HistoryOutlined />, label: `Historial (${data?.logs?.length || 0})`,
                  children: (
                    <LogTable dataSource={data?.logs || []} scroll={{ x: 900 }} />
                  ),
                },
              ]}
            />
          </Col>

          </Row>
      ) : (
        /* === MOBILE LAYOUT (< lg) === */
        <div>
          {renderEncabezado()}

          <Tabs
            defaultActiveKey="detalles"
            type="card"
            style={{ borderRadius: 8, padding: '0 16px' }}
            items={[
              {
                key: 'detalles',
                icon: <InboxOutlined />, label: `Productos/Servicios (${detalles.length}${detalleSearch ? ` filtrados` : ''})`,
                children: (
                  <>
                    <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {!desdePV && (
                      <Space>
                      <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                        onClick={handleAgregarFila}
                      >
                        Agregar fila
                      </Button>
                      <Button
                      icon={<SearchOutlined />}
                        onClick={() => setProductoModalOpen(true)}
                      >
                        Buscar Prod.
                        </Button>
                        </Space>
                        )}
                      <Input.Search
                        placeholder="Buscar detalle..."
                        allowClear
                        style={{ maxWidth: 250 }}
                        onSearch={(value) => setDetalleSearch(value)}
                        onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                      />
                    </div>
                    {(documentoConfig?.modificaPrecio === false || documentoConfig?.modificaDescripcion === false || data?.documento?.modificaPrecio === false || data?.documento?.modificaDescripcion === false) && detalles.length > 0 && (
                      <CamposRestringidosAlert
                        modificaPrecio={documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio}
                        modificaDescripcion={documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion}
                      />
                    )}
                    <DndContext sensors={sensors} collisionDetection={closestCenter}
                      onDragStart={(event) => setActiveId(event.active.id as number)}
                      onDragEnd={handleDragEnd}
                      onDragCancel={() => setActiveId(null)}>
                      <SortableContext items={detallesFiltrados.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                    <Table
                      dataSource={detallesFiltrados}
                      columns={detalleColumns}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      scroll={{ x: 1300 }}
                      components={{ body: { row: SortableRow } }}
                      locale={{
                        emptyText: (
                          <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Empty description={selectedFactura ? 'Sin registros' : 'Seleccione la factura referencia para cargar los productos'} />
                          </div>
                        ),
                      }}
                    />
                      </SortableContext>
                      <DragOverlay>
                        {activeId ? (
                          <div style={{ padding: '8px 16px', background: '#fff', border: '2px solid #556ee6', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, width: 300 }}>
                            <HolderOutlined style={{ color: '#556ee6' }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {detalles.find((d) => d.id === activeId)?.articulo || 'Arrastrando...'}
                            </span>
                          </div>
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  </>
                ),
                },
                {
                  key: 'consumo',
                  label: `Consumo (0)`,
                children: (
                  <div style={{ padding: 24, textAlign: 'center' }} className="paces-text-secondary">
                    Documentos que han utilizado esta nota de crédito (disponible después de aplicar).
                  </div>
                ),
              },
              {
                key: 'asientos',
                label: `Asientos (${asientosLocales.length || data?.asientos?.length || 0})`,
                children: (permisoModificarAsientos && estado === 0 && !selectedConcepto?.noAsientos) ? (
<AsientosContableEditables
  asientos={asientosModificados ? asientosLocales : (asientosLocales.length > 0 ? asientosLocales : (data?.asientos || []))}
  onChange={(nuevosAsientos) => {
    setAsientosLocales(nuevosAsientos);
    setAsientosModificados(true);
  }}
  editable={true}
  scroll={{ x: 900 }}
  onGenerar={handleGenerarAsientos}
  generando={generandoAsientos}
/>
                ) : (
                  <AsientosContableTable asientos={asientosModificados ? asientosLocales : (asientosLocales.length > 0 ? asientosLocales : (data?.asientos || []))} scroll={{ x: 900 }} />
                ),
              },
              {
                key: 'historial',
                icon: <HistoryOutlined />, label: `Historial (${data?.logs?.length || 0})`,
                children: (
                  <LogTable dataSource={data?.logs || []} scroll={{ x: 900 }} />
                ),
              },
            ]}
          />

          </div>
      )}
    </div>
  );
};

export default DevolucionVentaFormulario;

