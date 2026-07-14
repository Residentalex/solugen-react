import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Dropdown, Alert, Popover, Empty, Tooltip,
} from 'antd';
import {
  SaveOutlined,
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  MoreOutlined,
  CalendarOutlined,
  HolderOutlined,
  BarcodeOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import dayjs from 'dayjs';
import { DragHandle, SortableRow } from '../../components/DragSortable';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { facturaSuplidorApi } from '../../api/facturaSuplidorApi';
import { conceptosApi } from '../../api/conceptosApi';
import { productoApi } from '../../api/productoApi';
import { impuestoApi } from '../../api/impuestoApi';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import { BuscarEntradaModal } from '../../components/BuscarEntradaModal';
import ScannerModal from '../../components/ScannerModal/ScannerModal';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import BuscarEntidadSelect from '../../components/BuscarEntidadSelect/BuscarEntidadSelect';
import type {
  ConceptoDTO, SuplidorDTO, AlmacenDTO,
} from '../../types/entradaAlmacen';
import type { UnidadMedidaDTO } from '../../types/productos';
import type {
  DetalleFacturaSuplidorDTO, FacturaSuplidorFullDTO, TipoDTO,
} from '../../types/facturaSuplidor';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import LogTable from '../../components/LogTable';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import SeleccionarImpuestosModal from '../../components/SeleccionarImpuestosModal';
import type { ImpuestoSeleccionado } from '../../components/SeleccionarImpuestosModal';
import AsientosContableTable from '../../components/AsientosContableTable';
import BuscarCuentaContableModal from '../../components/BuscarCuentaContableModal/BuscarCuentaContableModal';

import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import GuidePopover from '../../components/GuidePopover/GuidePopover';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useDocumentoConfig } from '../../hooks/useDocumentoConfig';
import { formatCurrency, formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum } from '../../utils/estadoDocumento';
import CamposRestringidosAlert from '../../components/CamposRestringidosAlert';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';

const { Text } = Typography;
const { TextArea } = Input;

// ===== Cálculo de fila FRDE =====
function calcularFila(fila: DetalleFacturaSuplidorDTO, otros = 0): DetalleFacturaSuplidorDTO {
  const cantidad = fila.cantidad || 0;
  const costo = fila.costo || 0;
  const pctDesc = fila.porcentajeDescuento || 0;
  const pctImp = fila.impuesto?.porcentaje ?? (fila.porcentajeImpuesto || 0);

  const subTotal = Math.round(cantidad * costo * 100) / 100;
  const descuento = Math.round(subTotal * (pctDesc / 100) * 100) / 100;
  const baseImponible = subTotal - descuento;
  const impuestos = Math.round(baseImponible * (pctImp / 100) * 100) / 100;
  const total = Math.round((baseImponible + impuestos + otros) * 100) / 100;

  return {
    ...fila,
    cantidad,
    costo,
    subTotal,
    descuento,
    impuestos,
    total,
  };
}

function filaVacia(): DetalleFacturaSuplidorDTO {
  return {
    id: 0,
    codigo: '',
    articulo: '',
    referencia: '',
    cantidad: 0,
    costo: 0,
    subTotal: 0,
    porcentajeDescuento: 0,
    porcentajeImpuesto: 0,
    descuento: 0,
    impuestos: 0,
    total: 0,
    tipoArticulo: 'Producto',
    nota: '',
  };
}

const esNcfValido = (ncf: string): boolean => {
  if (!ncf) return true; // vacío es válido (opcional)
  const upper = ncf.toUpperCase();
  if (upper.startsWith('B')) return upper.length === 11;
  if (upper.startsWith('E')) return upper.length === 13;
  return false; // no empieza con B ni E
};

// ===== Error Boundary =====
class FacturaSuplidorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[FacturaSuplidorErrorBoundary]', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h2>Error en el formulario</h2>
          <pre style={{ color: 'red', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}
          </pre>
          <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', marginTop: 8 }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ===== Componente principal =====
const FacturaSuplidorFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const { screenCode, documentCode } = useScreenConfig('FRDE');
  const documentoConfig = useDocumentoConfig(sucursalActiva, documentCode);
  const monedaDefault = getMonedaSucursalActiva();

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<FacturaSuplidorFullDTO | null>(null);
  const [detalles, setDetalles] = useState<DetalleFacturaSuplidorDTO[]>([]);
  const [suplidoresCache, setSuplidoresCache] = useState<SuplidorDTO[]>([]);
  const [impuestosCache, setImpuestosCache] = useState<any[]>([]);
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [conceptoSearchText, setConceptoSearchText] = useState('');
  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
  const [selectedEntidad, setSelectedEntidad] = useState<SuplidorDTO | null>(null);
  const [selectedEntrada, setSelectedEntrada] = useState<any>(null);
  const [almacenesCache, setAlmacenesCache] = useState<AlmacenDTO[]>([]);
  const [selectedAlmacen, setSelectedAlmacen] = useState<AlmacenDTO | null>(null);
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [entradaModalOpen, setEntradaModalOpen] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [fechaVencimientoModal, setFechaVencimientoModal] = useState<{ open: boolean; detalleId: number }>({ open: false, detalleId: 0 });
  const [medidasCache, setMedidasCache] = useState<UnidadMedidaDTO[]>([]);
  const [sucursalesCache, setSucursalesCache] = useState<any[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState<any>(null);
  const [tiposCache, setTiposCache] = useState<TipoDTO[]>([]);
  const [selectedTipo, setSelectedTipo] = useState<TipoDTO | null>(null);
  const [asientosLocales, setAsientosLocales] = useState<any[]>([]);
  const [impuestosFactura, setImpuestosFactura] = useState<any[]>([]);
  const [modalImpuestosOpen, setModalImpuestosOpen] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [generandoAsientos, setGenerandoAsientos] = useState(false);
  const [cuentaModalAsientoOpen, setCuentaModalAsientoOpen] = useState(false);
  const [detallesModificados, setDetallesModificados] = useState(false);

  // Refs para la guía
  const entradaRef = useRef<HTMLDivElement>(null);
  const conceptoRef = useRef<HTMLDivElement>(null);
  const suplidorRef = useRef<HTMLDivElement>(null);
  const almacenRef = useRef<HTMLDivElement>(null);
  const agregarFilaRef = useRef<HTMLDivElement>(null);
  const ncfRef = useRef<HTMLDivElement>(null);
  const sucursalRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const editValuesRef = useRef<Record<string, any>>({});

  // Backup de impuestos para restaurar cuando el concepto deje de ser noImpuesto
  const impuestosBackupRef = useRef<Map<number, { impuesto?: any; porcentajeImpuesto: number }>>(new Map());

  // Normalizar impuestosFactura del API (estructura anidada → plana)
  function normalizarImpuestos(items: any[]): any[] {
    return (items || []).map((item: any) => ({
      id: item.impuesto?.codigo || item.id,
      codigo: item.impuesto?.codigo || item.codigo,
      idExterno: item.impuesto?.idExterno || item.idExterno,
      nombre: item.impuesto?.nombre || item.nombre || '',
      porcentaje: item.impuesto?.porcentaje ?? item.porcentaje ?? 0,
      tipo: item.tipo || item.impuesto?.tipo || '',
      asientos: item.asientos ?? item.impuesto?.asientos ?? true,
      noCuenta: item.noCuenta || item.impuesto?.noCuenta || '',
      monto: item.monto ?? 0,
      impuesto: item.impuesto || {
        nombre: item.impuesto?.nombre || item.nombre || '',
        porcentaje: item.impuesto?.porcentaje ?? item.porcentaje ?? 0,
        codigo: item.impuesto?.codigo || item.codigo || '',
        idExterno: item.impuesto?.idExterno || item.idExterno || '',
        asientos: item.asientos ?? item.impuesto?.asientos ?? true,
        noCuenta: item.noCuenta || item.impuesto?.noCuenta || '',
      },
    }));
  }

  // ===== Detalles filtrados por búsqueda =====
  const detallesFiltrados = detalleSearch
    ? detalles.filter((d) => {
        const q = detalleSearch.toLowerCase();
        return (
          (d.codigo || '').toLowerCase().includes(q) ||
          (d.articulo || '').toLowerCase().includes(q) ||
          (d.referencia || '').toLowerCase().includes(q)
        );
      })
    : detalles;

  // ===== Estado para campos rápidos (NCF, Referencia, Tasa) =====
  const [editingField, setEditingField] = useState<string | null>(null);
  const editingOriginalValue = useRef<string | number>('');
  const editingValueRef = useRef<string | number>('');
  const fieldCloseHandledRef = useRef(false);

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
      const oldValue = form.getFieldValue(field);
      const newValue = editingValueRef.current;
      form.setFieldsValue({ [field]: newValue });

      // Mejora F20: Si se cambió la tasa y hay detalles, preguntar si actualizar costos
      if (field === 'tasa' && detalles.length > 0 && oldValue !== newValue) {
        Modal.confirm({
          title: 'Actualizar costos',
          icon: <ExclamationCircleOutlined />,
          content: '¿Desea actualizar los costos en base a la nueva tasa?',
          okText: 'Sí',
          cancelText: 'No',
          onOk: () => {
            const tasaNueva = Number(newValue) || 1;
            setDetalles((prev) =>
              prev.map((d) => calcularFila({ ...d, costo: (d.costo || 0) / tasaNueva }))
            );
          },
        });
      }

      // Mejora F22: Validar formato NCF
      if (field === 'ncf') {
        const ncfStr = String(newValue || '');
        if (!esNcfValido(ncfStr)) {
          message.warning('Formato de NCF incorrecto. B=11 dígitos, E=13 dígitos.');
        }
      }
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

  const [form] = Form.useForm();

  // ===== Watchers reactivos =====
  const ncfValue = Form.useWatch('ncf', form) || '';
  const refValue = Form.useWatch('referencia', form) || '';
  const tasaValue = Form.useWatch('tasa', form) ?? 1;

  const sinOC = true;
  const isLarge = screens.xxl === true;

  const usuario = useAuthStore((s) => s.usuario);
  const permisoModificarAsientos = usuario?.permisosEspeciales?.some(
    (p: any) => p.codigo === 'pe_modificar_asientos' && p.valor === true
  ) ?? false;

  // ===== Determinar estado =====
  const estado = toEstadoNum(data?.estado);
  const esCerrado = data?.periodo === 6;
  const esBorrador = estado === 0;
  const esAplicado = estado === 1;
  const esAnulado = estado === 3;

  // ===== Cargar datos de apoyo al montar =====
  useEffect(() => {
    setActiveModule(screenCode);
    const pageTitle = mode === 'crear' ? 'Nueva Factura de Suplidor' : 'Editar Factura de Suplidor';
    setPageTitleOverride(pageTitle);

    // Cargar catálogos iniciales
    conceptosApi.obtenerAlmacenes(sucursalActiva).then(setAlmacenesCache).catch((err) => console.warn('Error al cargar almacenes cache', err));
    unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch((err) => console.warn('Error al cargar medidas cache', err));

    // Cargar sucursales desde la API (CompanioDTO con codigo/idExterno)
    conceptosApi.obtenerSucursales(sucursalActiva).then(setSucursalesCache).catch((err) => console.warn('Error al cargar sucursales cache', err));

    // Cargar tipos de documento
    facturaSuplidorApi.obtenerTipos(sucursalActiva).then(setTiposCache).catch((err) => console.warn('Error al cargar tipos cache', err));

    // Cargar suplidores
    facturaSuplidorApi.obtenerSuplidores(sucursalActiva).then(setSuplidoresCache).catch((err) => console.warn('Error al cargar suplidores cache', err));

    // Cargar catálogo de impuestos para compras (usado al seleccionar producto)
    impuestoApi.obtenerParaCompras(sucursalActiva).then(setImpuestosCache).catch((err) => console.warn('Error al cargar impuestos cache', err));

    // Inicializar fecha y monto en modo crear
    if (mode === 'crear') {
      form.setFieldsValue({
        fechaDocumento: dayjs(),
        monto: 0,
      });
    }

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, sucursalActiva, form]);

  // ===== Cargar datos si es modo editar =====
  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;

    setLoading(true);
    facturaSuplidorApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((_res) => {
        const res = _res as any;
        setData(res);
        setDetalles(res.detalles || []);
        setAsientosLocales(res.asientos || []);
        setImpuestosFactura(normalizarImpuestos(res.impuestosFactura));
        setSelectedConcepto(res.concepto || null);
        setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
        setSelectedEntidad(res.suplidor || res.entidad || null);
        setSelectedEntrada(res.entradaAlmacen || null);
        setSelectedTipo(res.tipo || null);

        const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;

        form.setFieldsValue({
          concepto: res.concepto?.codigo || '',
          suplidor: res.suplidor?.codigo || res.entidad?.codigo || res.codigoEntidad || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          ncf: res.ncf || '',
          referencia: res.referencia || '',
          moneda: res.moneda?.nombre || '',
          monto: res.total || 0,
          tasa: res.tasa || 1,
          nota: res.nota || '',
          diasCredito: res.diasCredito ?? res.suplidor?.diasCredito ?? 0,
          tipo: res.tipo?.codigo || '',
        });

        // Actualizar título con número de documento
        const docTitle = `${res.documento?.codigo || 'FRDE'}-${res.noDocumento || ''}`;
        setPageTitleOverride(`Editar - ${docTitle}`);

        // Cargar suplidores y actualizar selectedEntidad con datos completos
        facturaSuplidorApi.obtenerSuplidores(sucursalActiva)
          .then((suplidores) => {
            setSuplidoresCache(suplidores);
            const codigoEntidad = (res as any).entidad?.codigo || (res as any).suplidor?.codigo || (res as any).codigoEntidad;
            if (codigoEntidad) {
              const match = suplidores.find((s: any) => s.codigo === codigoEntidad);
              if (match) setSelectedEntidad(match);
            }
          })
          .catch((err) => console.warn('Error al cargar suplidores en modo editar', err));

        // Restaurar sucursal
        if (res.sucursal) {
          setSelectedSucursal(res.sucursal);
        }
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        message.error(msg);
        setLoadingError(true);
        navigate('/FRDE', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate]);

  // ===== Handler del modal de impuestos compartido =====
  const handleConfirmarImpuestos = (items: ImpuestoSeleccionado[]) => {
    const mapeados = items.map((i) => ({
      id: i.codigo,
      codigo: i.codigo,
      idExterno: i.idExterno,
      nombre: i.nombre,
      porcentaje: i.porcentaje,
      tipo: i.tipo,
      asientos: true,
      noCuenta: i.noCuenta || '',
      monto: i.monto,
      impuesto: { nombre: i.nombre, porcentaje: i.porcentaje, idExterno: i.idExterno, codigo: i.codigo, asientos: true, noCuenta: i.noCuenta || '' },
    }));
    setImpuestosFactura((prev: any[]) => {
      const existentes = new Map(prev.map((i: any) => [i.codigo, i]));
      for (const n of mapeados) {
        const existente = existentes.get(n.codigo);
        if (existente) {
          existentes.set(n.codigo, { ...existente, monto: existente.monto ?? n.monto });
        } else {
          existentes.set(n.codigo, n);
        }
      }
      return Array.from(existentes.values());
    });
  };

  // ===== Sincronizar impuesto de detalle con impuestosFactura =====
  const agregarImpuestoAFactura = useCallback((
    codigo: string,
    idExterno: string | undefined,
    nombre: string,
    porcentaje: number,
    tipo: string,
    asientos: boolean = true,
    noCuenta?: string,
  ) => {
    if (!codigo) return;
    setImpuestosFactura((prev: any[]) => {
      const existe = prev.some((i: any) => i.codigo === codigo);
      if (existe) return prev;
      return [
        ...prev,
        {
          id: codigo,
          codigo,
          idExterno: idExterno || codigo,
          nombre,
          porcentaje,
          tipo: tipo || 'Impuesto',
          asientos,
          noCuenta: noCuenta || '',
          monto: 0,
          impuesto: { nombre, porcentaje, idExterno: idExterno || codigo, codigo, asientos, noCuenta: noCuenta || '' },
        },
      ];
    });
  }, []);

  // ===== Recalcular montos de impuestosFactura en base a detalles =====
  const recalcularMontosImpuestosFactura = useCallback(() => {
    setImpuestosFactura((prev) => prev.map((imp: any) => {
      const tipo = imp.tipo || imp.impuesto?.tipo;
      const esItbis = tipo === 'I';
      if (esItbis) {
        // ITBIS: sumar el campo impuestos de los detalles que coincidan por porcentaje
        const montoCalculado = (detalles || [])
          .filter((d: any) => d.impuesto?.porcentaje === imp.porcentaje)
          .reduce((sum: number, d: any) => sum + (d.impuestos || 0), 0);
        return { ...imp, monto: montoCalculado };
      } else {
        // Otros impuestos (V, R, L): calcular desde base * porcentaje
        const baseTotal = (detalles || []).reduce((sum: number, d: any) => {
          return sum + ((d.subTotal || 0) - (d.descuento || 0));
        }, 0);
        const monto = Math.round(baseTotal * ((imp.porcentaje || 0) / 100) * 100) / 100;
        return { ...imp, monto };
      }
    }));
  }, [detalles]);

  // Recalcular montos cada vez que los detalles cambien
  useEffect(() => {
    recalcularMontosImpuestosFactura();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detalles]);

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
        setDetallesModificados(false);
        if (mode === 'crear') {
          navigate('/FRDE', { replace: true });
        } else {
          if (id) {
            setLoading(true);
            facturaSuplidorApi.obtenerPorId(sucursalActiva, parseInt(id))
              .then((_res) => {
                const res = _res as any;
                setData(res);
                setDetalles(res.detalles || []);
                setAsientosLocales(res.asientos || []);
                setImpuestosFactura(normalizarImpuestos(res.impuestosFactura));
                setSelectedConcepto(res.concepto || null);
                setSelectedEntidad(res.suplidor || res.entidad || null);
                setSelectedEntrada(res.entradaAlmacen || null);

                const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;

                form.setFieldsValue({
                  concepto: res.concepto?.codigo || '',
                  suplidor: res.suplidor?.codigo || res.entidad?.codigo || res.codigoEntidad || '',
                  fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                  ncf: res.ncf || '',
                  referencia: res.referencia || '',
                  moneda: res.moneda?.nombre || '',
                  tasa: res.tasa || 1,
                  nota: res.nota || '',
                  monto: res.total || 0,
                  diasCredito: res.diasCredito ?? res.suplidor?.diasCredito ?? 0,
                });

                const docTitle = `${res.documento?.codigo || 'FRDE'}-${res.noDocumento || ''}`;
                setPageTitleOverride(`Editar - ${docTitle}`);

                facturaSuplidorApi.obtenerSuplidores(sucursalActiva)
                  .then((suplidores) => {
                    setSuplidoresCache(suplidores);
                    const codigoEntidad = (res as any).entidad?.codigo || (res as any).suplidor?.codigo || (res as any).codigoEntidad;
                    if (codigoEntidad) {
                      const match = suplidores.find((s: any) => s.codigo === codigoEntidad);
                      if (match) setSelectedEntidad(match);
                    }
                  })
                  .catch((err) => console.warn('Error al cargar suplidores al recargar', err));
              })
              .catch((err: any) => {
                const msg = err?.response?.data?.errorMessage || 'Error al recargar el documento';
                message.error(msg);
              })
              .finally(() => setLoading(false));
          }
          navigate(`/FRDE/${id}`, { replace: true });
        }
      },
    });
  };

  // ===== Validación del formulario =====
  const validarFormulario = (): string | null => {
    const values = form.getFieldsValue();
    if (!selectedConcepto) return 'Debe elegir un Concepto para poder continuar.';
    if (suplidoresCache.length > 0 && !values.suplidor && !selectedEntidad) return 'El suplidor es requerido.';
    if (detalles.length === 0) return 'No se puede crear un documento de FACTURA SUPLIDOR sin detalle.';
    if (!detalles.some((d) => (d.cantidad || 0) > 0)) return 'Debe tener al menos un detalle con cantidad > 0';

    // Validar fecha doc â‰¤ hoy
    const fechaDoc = values.fechaDocumento;
    if (fechaDoc && dayjs.isDayjs(fechaDoc)) {
      if (fechaDoc.isAfter(dayjs(), 'day')) {
        return 'La fecha del documento no puede ser mayor a hoy.';
      }
    }

    // Mejora F15: Validar según FechaPermitida del documento
    if (data?.documento?.codigo) {
      // Si no tenemos data.documento.fechaPermitida, usar la validación simple por defecto
      const fechaPermitida = data?.documento?.fechaPermitida;
      if (fechaPermitida === 'MenorIgualFechaDia' || !fechaPermitida) {
        // La validación de fecha <= hoy ya está implementada arriba (se mantiene)
      }
    }

    // Validar asientos cuadrados si existen
    const asientosAValidar = asientosLocales.length > 0 ? asientosLocales : (data?.asientos || []);
    if (asientosAValidar.length > 0) {
      const totalDebitos = asientosAValidar.reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
      const totalCreditos = asientosAValidar.reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);
      if (Math.abs(totalDebitos - totalCreditos) > 0.01) {
        return 'Los asientos contables no están cuadrados. Los débitos deben ser igual a los créditos.';
      }
    }

    return null;
  };

  // ===== Construir DTO desde el formulario =====
  const construirDTO = (): FacturaSuplidorFullDTO => {
    const values = form.getFieldsValue();
    const base = data || {} as any;

    const entidadSel = suplidoresCache.find((e) => e.codigo === values.suplidor) || selectedEntidad;

    const fechaDoc = values.fechaDocumento
      ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
        ? toISOFormat(values.fechaDocumento.toDate())
        : values.fechaDocumento)
      : toISOFormat(new Date());

    const totalSub = detalles.reduce((s, d) => s + (d.subTotal || 0), 0);
    const totalDesc = detalles.reduce((s, d) => s + (d.descuento || 0), 0);
    const totalImp = detalles.reduce((s, d) => s + (d.impuestos || 0), 0);
    const nuevosDetalles = detalles.map((d) => calcularFila(d, calcularOtros(d)));
    const totalCalculado = nuevosDetalles.reduce((s, d) => s + (d.total || 0), 0);
    const total = detallesModificados || !data?.total
      ? totalCalculado
      : data.total;

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
      retenciones: retencionesTotal,
      total: Math.round(total * 100) / 100,
      tasa: values.tasa || 1,
      tipoDocumento: base.tipoDocumento ?? 60,  // RDE = 60 en enum TipoDocumento
      tipoEntidad: base.tipoEntidad || 'SUP',
      diasCredito: values.diasCredito ?? 0,
      documento: base.documento || { codigo: documentCode },
      concepto: selectedConcepto || { nombre: '', codigo: '' },
      moneda: base.moneda || getMonedaSucursalActiva(),
      suplidor: entidadSel || { nombre: '', codigo: '', identificacion: '' },
      entidad: entidadSel
        ? {
            nombre: entidadSel.nombre,
            codigo: entidadSel.codigo,
            identificacion: entidadSel.identificacion || '',
            telefono: entidadSel.telefono,
            direccion: entidadSel.direccion,
            codigoTipoEntidad: entidadSel.codigoTipoEntidad,
            tipoEntidad: entidadSel.tipoEntidad,
            cuentaContable: entidadSel.cuentaContable,
          }
        : { nombre: '', codigo: '', identificacion: '' },
      tipo: selectedTipo || null,
      entradaAlmacen: selectedEntrada || null,
      fechaRecibo: selectedEntrada?.fechaEntrega
        ? (typeof selectedEntrada.fechaEntrega === 'string'
          ? selectedEntrada.fechaEntrega
          : fechaDoc)
        : fechaDoc,
      sucursal: selectedSucursal
        ? { ...selectedSucursal, codigo: selectedSucursal.codigo || selectedSucursal.idExterno, idExterno: selectedSucursal.idExterno || selectedSucursal.codigo }
        : base.sucursal || { nombre: '', codigo: '', identificacion: '' },
      detalles: nuevosDetalles,
      asientos: asientosLocales.length > 0 ? asientosLocales : (base.asientos || []),
      impuestosFactura: impuestosFactura.map((imp: any) => {
        // Calcular monto automático desde los detalles que tengan este impuesto
        const montoCalculado = detalles
          .filter((d) => d.impuesto?.codigo === imp.codigo || d.impuesto?.idExterno === imp.idExterno)
          .reduce((sum, d) => sum + (d.impuestos || 0), 0);
        return {
          ...imp,
          monto: montoCalculado > 0 ? montoCalculado : (imp.monto ?? 0),
        };
      }),
      logs: base.logs || [],
    };
  };

  // ===== NCF Validation =====
  const validarNCF = useCallback(async (): Promise<string | null> => {
    const ncf = form.getFieldValue('ncf');
    const suplidorCodigo = form.getFieldValue('suplidor');
    if (ncf && suplidorCodigo && selectedEntidad) {
      try {
        const existe = await facturaSuplidorApi.verificarNCF(sucursalActiva, ncf, suplidorCodigo);
        if (existe) {
          return `El NCF "${ncf}" ya existe para este suplidor.`;
        }
      } catch {
        // Si falla la verificación, continuar
      }
    }
    return null;
  }, [sucursalActiva, form, selectedEntidad]);

  const handleGuardar = async () => {
    const error = validarFormulario();
    if (error) {
      message.error(error);
      return;
    }

    // Validar NCF duplicado antes de guardar
    const ncfError = await validarNCF();
    if (ncfError) {
      message.error(ncfError);
      return;
    }

    setSaving(true);
    try {
      const dto = construirDTO();
      if (mode === 'crear') {
        const result = await facturaSuplidorApi.crear(sucursalActiva, dto);
        message.success('Factura de suplidor creada exitosamente');
        navigate(`/FRDE/${result.id}`, { replace: true });
      } else {
        await facturaSuplidorApi.actualizar(sucursalActiva, dto);
        message.success('Factura de suplidor actualizada exitosamente');
        navigate(`/FRDE/${id}`, { replace: true });
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== Handlers de Concepto =====
  const handleConceptoSelect = (concepto: ConceptoDTO) => {
    setSelectedConcepto(concepto);
    setConceptoSearchText(`${concepto.codigo || ''} - ${toTitleCase(concepto.nombre)}`);
    setEditingField(null);

    // === ConfigurarMoneda (unificado con conceptoNombre) ===
    const monedaObj = concepto.moneda || getMonedaSucursalActiva();
    form.setFieldsValue({
      concepto: concepto.codigo,
      moneda: monedaObj.nombre,
      tasa: monedaObj.tasa ?? 1,
    });
    // Actualizar data local para que la UI lo refleje
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, moneda: monedaObj };
    });

    // Cargar suplidores y actualizar selectedEntidad con datos completos
    facturaSuplidorApi.obtenerSuplidores(sucursalActiva)
      .then((suplidores) => {
        setSuplidoresCache(suplidores);
        const codigoEntidad = data?.entidad?.codigo || data?.suplidor?.codigo || data?.codigoEntidad;
        if (codigoEntidad) {
          const match = suplidores.find((s: any) => s.codigo === codigoEntidad);
          if (match) setSelectedEntidad(match);
        }
      })
      .catch((err) => console.warn('Error al cargar suplidores al cambiar concepto', err));

    // Si el concepto es NoImpuesto y hay detalles con impuestos, limpiarlos
    const prevNoImpuesto = selectedConcepto?.noImpuesto;

    if (concepto.noImpuesto) {
      const hayImpuestos = detalles.some((d) => (d.impuesto?.porcentaje || 0) > 0);
      if (hayImpuestos) {
        const backup = new Map<number, { impuesto?: any; porcentajeImpuesto: number }>();
        detalles.forEach((d) => {
          if ((d.impuesto?.porcentaje || 0) > 0) {
            backup.set(d.id, { impuesto: d.impuesto, porcentajeImpuesto: d.porcentajeImpuesto || 0 });
          }
        });
        impuestosBackupRef.current = backup;

        message.warning('El Concepto no acepta Impuestos, por lo que serán eliminados.');
        setDetallesModificados(true);
        setDetalles((prev) =>
          prev.map((d) => calcularFila({ ...d, porcentajeImpuesto: 0, impuesto: undefined }))
        );
      }
    } else if (prevNoImpuesto && !concepto.noImpuesto) {
      const backup = impuestosBackupRef.current;
      if (backup.size > 0) {
        setDetallesModificados(true);
        setDetalles((prev) =>
          prev.map((d) => {
            const saved = backup.get(d.id);
            if (saved) {
              return calcularFila({ ...d, impuesto: saved.impuesto, porcentajeImpuesto: saved.porcentajeImpuesto });
            }
            return d;
          })
        );
        impuestosBackupRef.current = new Map();
      }
    }
  };

  const handleConceptoClear = () => {
    setSelectedConcepto(null);
    setConceptoSearchText('');
    setSuplidoresCache([]);
    form.setFieldsValue({ concepto: '', suplidor: undefined });
  };

  // ===== Handlers de Entrada Referencia =====
  const handleEntradaSelect = async (entrada: any) => {
    if (detalles.length > 0) {
      const shouldReplace = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: '¿Desea Borrar todos los registros?',
          icon: <ExclamationCircleOutlined />,
          content: 'Ya existen detalles en el documento. ¿Desea borrarlos y cargar los de la entrada seleccionada?',
          okText: 'Sí, borrar y cargar',
          cancelText: 'No, mantener',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });

      if (shouldReplace) {
        setDetallesModificados(true);
        try {
          const detalleEntrada = await facturaSuplidorApi.obtenerDetalleEntrada(sucursalActiva, entrada.id);
          const nuevosDetalles = (detalleEntrada.detalles || []).map((d: any, idx: number) => ({
            ...filaVacia(),
            id: -(idx + 1),
            codigo: d.codigo || '',
            articulo: d.articulo || '',
            referencia: d.referencia || '',
            cantidad: d.cantidad || 0,
            costo: d.costo || 0,
            porcentajeDescuento: d.porcentajeDescuento || 0,
            familia: d.familia,
            medida: d.medida,
            impuesto: d.impuesto,
            tieneVencimiento: d.tieneVencimiento,
          }));
          const calculados = nuevosDetalles.map((d: DetalleFacturaSuplidorDTO) => calcularFila(d));
          setDetalles(calculados);
          // Sincronizar impuestos únicos desde los detalles de la ENP
          const impuestosUnicos = new Map<string, any>();
          (calculados as any[]).forEach((d: any) => {
            if (d.impuesto?.codigo && !impuestosUnicos.has(d.impuesto.codigo)) {
          impuestosUnicos.set(d.impuesto.codigo, {
            codigo: d.impuesto.codigo,
            idExterno: d.impuesto.idExterno || d.impuesto.codigo,
            nombre: d.impuesto.nombre,
            porcentaje: d.impuesto.porcentaje,
            tipo: d.impuesto.tipo || 'Impuesto',
            asientos: d.impuesto?.asientos ?? true,
            noCuenta: d.impuesto?.noCuenta || '',
          });
        }
      });
      impuestosUnicos.forEach((imp) => {
        agregarImpuestoAFactura(imp.codigo, imp.idExterno, imp.nombre, imp.porcentaje, imp.tipo, imp.asientos ?? true, imp.noCuenta || '');
      });
      const totalEntrada = calculados.reduce((s, d) => s + (d.total || 0), 0);
      form.setFieldsValue({ monto: totalEntrada });
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al cargar detalles de la entrada');
      message.error(msg);
    }
  }
    } else {
      Modal.confirm({
        title: '¿Desea Cargar todos los registros?',
        icon: <ExclamationCircleOutlined />,
        content: '¿Desea cargar los productos de la entrada seleccionada?',
        okText: 'Sí, cargar',
        cancelText: 'No',
        onOk: async () => {
          setDetallesModificados(true);
          try {
            const detalleEntrada = await facturaSuplidorApi.obtenerDetalleEntrada(sucursalActiva, entrada.id);
            const nuevosDetalles = (detalleEntrada.detalles || []).map((d: any, idx: number) => ({
              ...filaVacia(),
              id: -(idx + 1),
              codigo: d.codigo || '',
              articulo: d.articulo || '',
              referencia: d.referencia || '',
              cantidad: d.cantidad || 0,
              costo: d.costo || 0,
              porcentajeDescuento: d.porcentajeDescuento || 0,
              familia: d.familia,
              medida: d.medida,
              impuesto: d.impuesto,
              tieneVencimiento: d.tieneVencimiento,
            }));
            const calculados = nuevosDetalles.map((d: DetalleFacturaSuplidorDTO) => calcularFila(d));
            setDetalles(calculados);
            // Sincronizar impuestos únicos desde los detalles de la ENP
            const impuestosUnicos = new Map<string, any>();
            (calculados as any[]).forEach((d: any) => {
              if (d.impuesto?.codigo && !impuestosUnicos.has(d.impuesto.codigo)) {
              impuestosUnicos.set(d.impuesto.codigo, {
                codigo: d.impuesto.codigo,
                idExterno: d.impuesto.idExterno || d.impuesto.codigo,
                nombre: d.impuesto.nombre,
                porcentaje: d.impuesto.porcentaje,
                tipo: d.impuesto.tipo || 'Impuesto',
                asientos: d.impuesto?.asientos ?? true,
                noCuenta: d.impuesto?.noCuenta || '',
              });
            }
          });
          impuestosUnicos.forEach((imp) => {
              agregarImpuestoAFactura(imp.codigo, imp.idExterno, imp.nombre, imp.porcentaje, imp.tipo, imp.asientos ?? true, imp.noCuenta || '');
            });
            const totalEntrada = calculados.reduce((s, d) => s + (d.total || 0), 0);
            form.setFieldsValue({ monto: totalEntrada });
          } catch (err: any) {
            const msg = extraerMensajeError(err, 'Error al cargar detalles de la entrada');
            message.error(msg);
          }
        },
      });
    }

    setSelectedEntrada(entrada);
    if (entrada?.suplidor?.codigo) {
      setSelectedEntidad(entrada.suplidor);
      form.setFieldsValue({
        suplidor: entrada.suplidor.codigo,
        diasCredito: entrada.suplidor.diasCredito ?? 0,
      });
    }
  };

  // ===== Handlers de detalles =====
  const handleAgregarFila = () => {
    setDetallesModificados(true);
    setDetalles((prev) => [{ ...filaVacia(), id: -(prev.length + 1) }, ...prev]);
  };

  const handleEliminarFila = (idFila: number) => {
    const detalleEliminado = detalles.find((d) => d.id === idFila);
    Modal.confirm({
      title: 'Eliminar detalle',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro de eliminar este detalle?',
      okText: 'Sí',
      cancelText: 'No',
      okButtonProps: { danger: true },
      onOk: () => {
        setDetallesModificados(true);
        setDetalles((prev) => {
          const nuevos = prev.filter((d) => d.id !== idFila);
          // Limpiar impuestos que ya no usa ningún detalle
          if (detalleEliminado?.impuesto?.codigo) {
            const codImpuesto = detalleEliminado.impuesto.codigo;
            const sigueEnUso = nuevos.some((d) => d.impuesto?.codigo === codImpuesto);
            if (!sigueEnUso) {
              setImpuestosFactura((prevImp) => prevImp.filter((i: any) => i.codigo !== codImpuesto));
            }
          }
          return nuevos;
        });
      },
    });
  };

  const handleDetalleUpdateValue = (idFila: number, field: string, value: any) => {
    setDetallesModificados(true);
    setDetalles((prev) =>
      prev.map((d) => (d.id !== idFila ? d : { ...d, [field]: value }))
    );
  };

  const handleDetalleCalculate = (idFila: number, field: string, value: any) => {
    setDetallesModificados(true);
    const nuevosDetalles = detalles.map((d) => {
      if (d.id !== idFila) return d;
      const updated = { ...d, [field]: value };
      return calcularFila(updated);
    });
    setDetalles(nuevosDetalles);
  };

  const handleProductoSelect = async (producto: any) => {
    setDetallesModificados(true);

    // Cargar impuestos adicionales del producto
    try {
      const detalleProducto = await productoApi.obtenerDetalle(sucursalActiva, producto.codigo);
      if (detalleProducto?.impuestos && detalleProducto.impuestos.length > 0) {
        detalleProducto.impuestos.forEach((imp: any) => {
          // Buscar el impuesto real en el cache por nombre para obtener codigo/idExterno
          const impuestoReal = impuestosCache.find(
            (i: any) => i.nombre?.toLowerCase() === imp.impuesto?.nombre?.toLowerCase()
          );
          const impCodigo = impuestoReal?.codigo || imp.impuesto?.codigo || '';
          const mainCodigo = producto.impuesto?.codigo || producto.impuesto?.nombre?.replace(/\s+/g, '_');
          if (impCodigo && impCodigo !== mainCodigo) {
            const impIdExterno = impuestoReal?.idExterno || imp.impuesto?.idExterno || impCodigo;
            const impTipo = impuestoReal?.tipo || imp.impuesto?.tipo || 'Informativo';
            agregarImpuestoAFactura(
              impCodigo,
              impIdExterno,
              imp.impuesto?.nombre || '',
              imp.impuesto?.porcentaje || 0,
              impTipo,
              impuestoReal?.asientos ?? imp.impuesto?.asientos ?? true,
              impuestoReal?.noCuenta || imp.impuesto?.noCuenta || '',
            );
          }
        });
      }
    } catch {
      // Silencioso: carga periférica de impuestos adicionales
    }

    const filaVaciaIdx = detalles.findIndex((d) => !d.codigo);
    if (filaVaciaIdx === -1) {
      const nuevaFila = filaVacia();
      const nuevoId = -(detalles.length + 1);
      const filled: DetalleFacturaSuplidorDTO = {
        ...nuevaFila,
        id: nuevoId,
        codigo: producto.codigo,
        articulo: producto.articulo,
        referencia: producto.referencia || '',
        cantidad: producto.cantidad || 1,
        costo: producto.costo || 0,
        familia: producto.familia,
        medida: producto.medida,
        impuesto: producto.impuesto,
        porcentajeImpuesto: producto.impuesto?.porcentaje ?? 0,
        tieneVencimiento: producto.tieneVencimiento,
        modificaPrecio: producto.modificaPrecio ?? false,
        modificaDescripcion: producto.modificaDescripcion ?? false,
      };
      const otros = calcularOtros(filled);
      setDetalles((prev) => {
        return [calcularFila(filled, otros), ...prev];
      });
      // Sincronizar impuesto del producto con impuestosFactura
      if (producto.impuesto?.codigo) {
        agregarImpuestoAFactura(
          producto.impuesto.codigo,
          producto.impuesto.idExterno,
          producto.impuesto.nombre,
          producto.impuesto.porcentaje,
          producto.impuesto.tipo || 'Impuesto',
          producto.impuesto.asientos ?? true,
          producto.impuesto.noCuenta || '',
        );
      }
    } else {
      setDetalles((prev) =>
        prev.map((d) => {
          if (d.id !== detalles[filaVaciaIdx].id) return d;
          const filled: DetalleFacturaSuplidorDTO = {
            ...d,
            codigo: producto.codigo,
            articulo: producto.articulo,
            referencia: producto.referencia || '',
            cantidad: producto.cantidad || 1,
            costo: producto.costo || 0,
            familia: producto.familia,
            medida: producto.medida,
            impuesto: producto.impuesto,
            porcentajeImpuesto: producto.impuesto?.porcentaje ?? 0,
            tieneVencimiento: producto.tieneVencimiento,
            modificaPrecio: producto.modificaPrecio ?? false,
            modificaDescripcion: producto.modificaDescripcion ?? false,
          };
          const otros = calcularOtros(filled);
          return calcularFila(filled, otros);
        })
      );
      // Sincronizar impuesto del producto con impuestosFactura
      if (producto.impuesto?.codigo) {
        agregarImpuestoAFactura(
          producto.impuesto.codigo,
          producto.impuesto.idExterno,
          producto.impuesto.nombre,
          producto.impuesto.porcentaje,
          producto.impuesto.tipo || 'Impuesto',
          producto.impuesto.asientos ?? true,
          producto.impuesto.noCuenta || '',
        );
      }
    }
  };

  const handleFechaVencimiento = (date: dayjs.Dayjs | null) => {
    if (fechaVencimientoModal.detalleId) {
      setDetalles((prev) =>
        prev.map((d) => {
          if (d.id !== fechaVencimientoModal.detalleId) return d;
          return { ...d, fechaVencimiento: date ? date.format('YYYY-MM-DD') : undefined };
        })
      );
    }
    setFechaVencimientoModal({ open: false, detalleId: 0 });
  };

  const handleDragEnd = (event: any) => {
    setActiveId(null);
    setDetallesModificados(true);
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

  const handleDescuentoGlobal = () => {
    Modal.confirm({
      title: 'Descuento global',
      content: (
        <InputNumber
          min={0}
          max={100}
          step={0.01}
          precision={2}
          style={{ width: '100%' }}
          placeholder="Porcentaje de descuento"
          id="descuento-global-input"
          onChange={(val) => {
            (window as any).__descuentoGlobal = val;
          }}
        />
      ),
      onOk: () => {
        const pct = (window as any).__descuentoGlobal;
        if (pct === undefined || pct === null) {
          message.warning('Debe ingresar un porcentaje');
          return false;
        }
        setDetallesModificados(true);
        setDetalles((prev) =>
          prev.map((d) => calcularFila({ ...d, porcentajeDescuento: Number(pct) }))
        );
      },
    });
  };

  // ===== Calcular "Otros" impuestos por detalle (solo tipo 'V' informativos) =====
  const calcularOtros = useCallback((detalle: DetalleFacturaSuplidorDTO): number => {
    const baseImponible = (detalle.subTotal || 0) - (detalle.descuento || 0);
    const otrosPct = impuestosFactura
      .filter((imp: any) => (imp.tipo || imp.impuesto?.tipo) === 'V')
      .reduce((sum: number, imp: any) => sum + (imp.porcentaje || 0), 0);
    if (otrosPct <= 0) return 0;
    return Math.round(baseImponible * (otrosPct / 100) * 100) / 100;
  }, [impuestosFactura]);

  // ===== Impuestos informativos para TotalesCard =====
  const impuestosInformativos = React.useMemo(() =>
    impuestosFactura
      .filter((imp: any) => (imp.tipo || imp.impuesto?.tipo) === 'V')
      .map((imp: any) => ({ nombre: imp.nombre || '', monto: imp.monto || 0 })),
    [impuestosFactura]
  );

  // ===== Retenciones calculadas desde impuestosFactura (tipo R) =====
  const retencionesTotal = React.useMemo(() =>
    impuestosFactura
      .filter((imp: any) => (imp.tipo || imp.impuesto?.tipo) === 'R')
      .reduce((sum: number, imp: any) => sum + (imp.monto || 0), 0),
    [impuestosFactura]
  );

  // ===== Totales calculados =====
  const totales = {
    subTotal: detalles.reduce((s, d) => s + (d.subTotal || 0), 0),
    descuento: detalles.reduce((s, d) => s + (d.descuento || 0), 0),
    impuestos: detalles.reduce((s, d) => s + (d.impuestos || 0), 0),
    otros: detalles.reduce((s, d) => s + calcularOtros(d), 0),
    total: detalles.reduce((s, d) => s + (d.total || 0) + calcularOtros(d), 0),
  };

  // ===== Funciones auxiliares para asientos =====
  function esDebito(tipo: any): boolean { return tipo === 'D' || tipo === 0; }
  function esCredito(tipo: any): boolean { return tipo === 'C' || tipo === 1; }

  // ===== Loading state (inline) =====

  // ===== Estado info =====
  const estadoInfo = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Borrador', color: 'default' };

  // ===== Encabezado del formulario =====
  const renderEncabezado = () => (
    <Card className="paces-card" size="small" title="Datos Generales" extra={<EstadoTag estado={estado} periodo={data?.periodo} />} style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={24} xxl={18}>
          <Form form={form} layout="vertical" size="middle" style={{ paddingTop: 24 }}>
            <Row gutter={[16, 24]}>
              {/* Fila 1: Entrada Almacén Ref + Concepto + Tipo */}
              <Col xs={24} sm={12} lg={8}>
                <div ref={entradaRef}>
                  <FloatingField label="Entrada Almacén Ref" externalValue={selectedEntrada?.noDocumento || ''}>
                    <Input
                      placeholder=" "
                      value={selectedEntrada?.noDocumento || ''}
                      readOnly
                      suffix={<SearchOutlined style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }} />}
                      onClick={() => setEntradaModalOpen(true)}
                    />
                  </FloatingField>
                </div>
                <Form.Item name="entradaAlmacen" hidden><Input /></Form.Item>
              </Col>

              <Col xs={24} sm={12} lg={8}>
                <div ref={conceptoRef}>
                  <FloatingField label="Concepto" required externalValue={conceptoSearchText}>
                    <Input
                      placeholder=" "
                      value={conceptoSearchText}
                      readOnly
                      suffix={<SearchOutlined style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }} />}
                      onClick={() => setConceptoModalOpen(true)}
                    />
                  </FloatingField>
                  <ConceptoInfoLabel concepto={selectedConcepto} />
                </div>
                <Form.Item name="concepto" hidden><Input /></Form.Item>
              </Col>

              <Col xs={24} sm={12} lg={8}>
                <Form.Item name="tipo" style={{ marginBottom: 0 }}>
                  <FloatingField label="Tipo">
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      placeholder=" "
                      value={selectedTipo?.codigo || undefined}
                      onChange={(val) => {
                        const tipo = tiposCache.find((t) => t.codigo === val);
                        setSelectedTipo(tipo || null);
                      }}
                    >
                      {tiposCache.map((t) => (
                        <Select.Option key={t.codigo} value={t.codigo}>
                          {t.codigo} - {toTitleCase(t.nombre)}
                        </Select.Option>
                      ))}
                    </Select>
                  </FloatingField>
                </Form.Item>
              </Col>

              {/* Fila 2: Fecha Doc. + Suplidor (2 columnas) */}
              <Col xs={24} sm={12} lg={8}>
                <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }}>
                  <FloatingField label="Fecha Doc." required>
                    <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                  </FloatingField>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={16}>
                <div ref={suplidorRef}>
                  <BuscarEntidadSelect
                    label="Suplidor"
                    required
                    entidades={suplidoresCache}
                    value={form.getFieldValue('suplidor') || selectedEntidad?.codigo || undefined}
                    onChange={(codigo, entidad) => {
                      form.setFieldsValue({ suplidor: codigo || '' });
                      setSelectedEntidad(entidad || null);
                      if (entidad) {
                        form.setFieldsValue({ diasCredito: (entidad as any).diasCredito ?? 0 });
                      }
                    }}
                    conceptoSeleccionado={!!selectedConcepto}
                  />
                </div>
                <Form.Item name="suplidor" hidden><Input /></Form.Item>
              </Col>

              {/* Fila 3: Fecha Recibo + Almacén + Sucursal */}
              <Col xs={24} sm={12} lg={8}>
                <FloatingField label="Fecha Recibo" externalValue={selectedEntrada?.fechaEntrega ? formatDate(selectedEntrada.fechaEntrega) : '-'}>
                  <Input placeholder=" " value={selectedEntrada?.fechaEntrega ? formatDate(selectedEntrada.fechaEntrega) : '-'} readOnly />
                </FloatingField>
              </Col>
              <Col xs={24} sm={12} lg={8}>
                <div ref={almacenRef}>
                  <Form.Item name="almacen" style={{ marginBottom: 0 }}>
                    <FloatingField label="Almacén">
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="children"
                        placeholder=" "
                        onChange={(val) => {
                          const alm = almacenesCache.find((a: any) => a.codigo === val);
                          setSelectedAlmacen(alm || null);
                        }}
                      >
                        {almacenesCache.map((alm: any) => (
                          <Select.Option key={alm.codigo} value={alm.codigo}>
                            {toTitleCase(alm.nombre)}
                          </Select.Option>
                        ))}
                      </Select>
                    </FloatingField>
                  </Form.Item>
                </div>
              </Col>
              <Col xs={24} sm={12} lg={8}>
                <div ref={sucursalRef}>
                  <Form.Item name="sucursal" style={{ marginBottom: 0 }}>
                    <FloatingField label="Sucursal Contable">
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="children"
                        placeholder=" "
                        value={selectedSucursal?.sucursal ?? undefined}
                        onChange={(val) => {
                          const suc = sucursalesCache.find((s: any) => s.sucursal === val);
                          setSelectedSucursal(suc || null);
                        }}
                      >
                        {sucursalesCache.map((suc: any) => (
                          <Select.Option key={suc.sucursal} value={suc.sucursal}>
                            {toTitleCase(suc.nombre || '')}
                          </Select.Option>
                        ))}
                      </Select>
                    </FloatingField>
                  </Form.Item>
                </div>
              </Col>

              {/* Fila 4: Nota */}
              <Col xs={24}>
                <Form.Item name="nota" style={{ marginBottom: 0 }}>
                  <FloatingField label="Nota">
                    <TextArea rows={2} />
                  </FloatingField>
                </Form.Item>
              </Col>

              {/* Hidden items para campos del formulario */}
              <Form.Item name="tasa" hidden><InputNumber /></Form.Item>
              <Form.Item name="moneda" hidden><Input /></Form.Item>
              <Form.Item name="ncf" hidden><Input /></Form.Item>
              <Form.Item name="referencia" hidden><Input /></Form.Item>

              {/* Campos rápidos: NCF, Tasa, Referencia */}
              <Col xs={24}>
                <div style={{ marginBottom: 0, marginTop: 8 }}>
                  <div ref={ncfRef}>
                    <Space size={[8, 8]} wrap>
                      {/* NCF */}
                      {editingField === 'ncf' ? (
                        <Input
                          size="small"
                          style={{ width: 200 }}
                          placeholder="NCF"
                          maxLength={19}
                          autoFocus
                          defaultValue={editingValueRef.current as string}
                          onChange={(e) => { editingValueRef.current = e.target.value; }}
                          onPressEnter={() => commitFieldEditor()}
                          onBlur={() => commitFieldEditor()}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') { e.stopPropagation(); cancelFieldEditor(); }
                          }}
                        />
                      ) : ncfValue ? (
                        <Tag style={{ cursor: 'pointer', fontSize: 14, padding: '6px 16px' }} onClick={() => openFieldEditor('ncf')}>
                          NCF: {ncfValue} <EditOutlined />
                        </Tag>
                      ) : (
                        <Tag style={{ cursor: 'pointer', fontSize: 14, padding: '6px 16px' }} onClick={() => openFieldEditor('ncf')}>
                          <PlusOutlined /> NCF
                        </Tag>
                      )}
                      {/* Tasa */}
                      {editingField === 'tasa' ? (
                        <InputNumber
                          size="small"
                          style={{ width: 120 }}
                          min={0}
                          step={0.01}
                          placeholder="Tasa"
                          autoFocus
                          defaultValue={editingValueRef.current as number}
                          onChange={(val) => { editingValueRef.current = val ?? 1; }}
                          onPressEnter={() => commitFieldEditor()}
                          onBlur={() => commitFieldEditor()}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') { e.stopPropagation(); cancelFieldEditor(); }
                          }}
                        />
                      ) : tasaValue !== 1 ? (
                        <Tag style={{ cursor: 'pointer', fontSize: 14, padding: '6px 16px' }} onClick={() => openFieldEditor('tasa')}>
                          Tasa: {tasaValue} <EditOutlined />
                        </Tag>
                      ) : (
                        <Tag style={{ cursor: 'pointer', fontSize: 14, padding: '6px 16px' }} onClick={() => openFieldEditor('tasa')}>
                          <PlusOutlined /> Tasa
                        </Tag>
                      )}
                      {/* Referencia */}
                      {editingField === 'referencia' ? (
                        <Input
                          size="small"
                          style={{ width: 200 }}
                          placeholder="Referencia"
                          autoFocus
                          defaultValue={editingValueRef.current as string}
                          onChange={(e) => { editingValueRef.current = e.target.value; }}
                          onPressEnter={() => commitFieldEditor()}
                          onBlur={() => commitFieldEditor()}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') { e.stopPropagation(); cancelFieldEditor(); }
                          }}
                        />
                      ) : refValue ? (
                        <Tag style={{ cursor: 'pointer', fontSize: 14, padding: '6px 16px' }} onClick={() => openFieldEditor('referencia')}>
                          Ref: {refValue} <EditOutlined />
                        </Tag>
                      ) : (
                        <Tag style={{ cursor: 'pointer', fontSize: 14, padding: '6px 16px' }} onClick={() => openFieldEditor('referencia')}>
                          <PlusOutlined /> Referencia
                        </Tag>
                      )}
                    </Space>
                  </div>
                </div>
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
              retenciones={retencionesTotal}
              total={totales.total}
              hideTitle
              monedaSimbolo={data?.moneda?.simbolo || selectedConcepto?.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={data?.moneda?.nombre || selectedConcepto?.moneda?.nombre || monedaDefault.nombre}
              tasa={tasaValue ?? data?.tasa ?? 1}
              impuestosInformativos={impuestosInformativos}
            />
          </div>
        </Col>
      </Row>
    </Card>
  );

  // ===== Grid de detalles editable =====
  const detalleColumns = [
    {
      title: '',
      key: 'sort',
      width: 40,
      render: () => <DragHandle />,
    },
    {
      title: 'Código',
      key: 'codigo',
      width: 120,
      fixed: 'left' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: DetalleFacturaSuplidorDTO) => (
        <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <span>{record.codigo || '-'}</span>
          {record.referencia && (
            <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, marginTop: 'auto' }}>
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
      render: (_: any, _record: DetalleFacturaSuplidorDTO, idx: number) => {
        const fila = detalles[idx];
        if (!fila) return null;
        const docPermiteDesc = documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion ?? true;
        if (docPermiteDesc) {
          return (
            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Input
                size="small"
                style={{ width: '100%' }}
                value={fila.articulo || ''}
                onChange={(e) => handleDetalleUpdateValue(fila.id, 'articulo', e.target.value)}
              />
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
                {fila.familia?.nombre ? <Tag style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>{toTitleCase(fila.familia.nombre)}</Tag> : null}
                {fila.fechaVencimiento && <span>V: {formatDate(fila.fechaVencimiento)}</span>}
              </div>
            </div>
          );
        }
        return (
          <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ flex: 1 }}>{toTitleCase(fila.articulo || '')}</span>
            </div>
            <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
              {fila.familia?.nombre ? <Tag style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>{toTitleCase(fila.familia.nombre)}</Tag> : null}
              {fila.fechaVencimiento && <span>V: {formatDate(fila.fechaVencimiento)}</span>}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 100,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, _record: DetalleFacturaSuplidorDTO, idx: number) => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            styles={{ input: { textAlign: 'right' } }}
            min={0}
            step={0.01}
            precision={2}
            controls={false}
            defaultValue={detalles[idx]?.cantidad}
            onChange={(val) => {
              editValuesRef.current[`${detalles[idx].id}_cantidad`] = val || 0;
            }}
            onBlur={() => {
              const val = editValuesRef.current[`${detalles[idx].id}_cantidad`] ?? detalles[idx]?.cantidad;
              handleDetalleCalculate(detalles[idx].id, 'cantidad', val);
            }}
            onPressEnter={() => {
              const val = editValuesRef.current[`${detalles[idx].id}_cantidad`] ?? detalles[idx]?.cantidad;
              handleDetalleCalculate(detalles[idx].id, 'cantidad', val);
            }}
          />
          <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 'auto', minHeight: 18 }}>
            {!sinOC && detalles[idx]?.medida?.nombre ? toTitleCase(detalles[idx].medida.nombre) : ''}
          </div>
        </div>
      ),
    },
    ...(sinOC ? [{
      title: 'Medida',
      key: 'medida',
      width: 160,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: DetalleFacturaSuplidorDTO, _idx: number) => {
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
                handleDetalleUpdateValue(record.id, 'medida', {
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
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      width: 130,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, _record: DetalleFacturaSuplidorDTO, idx: number) => {
        const fila = detalles[idx];
        if (!fila) return null;
        const docPermiteEditar = documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio ?? true;
        if (docPermiteEditar) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }}>
              <InputNumber
                size="small"
                style={{ width: '100%' }}
                styles={{ input: { textAlign: 'right' } }}
                min={0}
                step={0.01}
                precision={4}
                controls={false}
                value={fila.costo}
                onChange={(val) => handleDetalleUpdateValue(fila.id, 'costo', val || 0)}
                onBlur={() => handleDetalleCalculate(fila.id, 'costo', fila.costo || 0)}
                onPressEnter={() => handleDetalleCalculate(fila.id, 'costo', fila.costo || 0)}
              />
              <div style={{ fontSize: 11, lineHeight: 1.5, color: '#999', marginTop: 'auto' }}>&nbsp;</div>
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }}>
            <div style={{ textAlign: 'right', fontWeight: 500 }}>{formatNumber(fila.costo)}</div>
            <div style={{ fontSize: 11, lineHeight: 1.5, color: '#999', marginTop: 'auto' }}>&nbsp;</div>
          </div>
        );
      },
    },
    {
      title: 'Descuento',
      key: 'descuento',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, _record: DetalleFacturaSuplidorDTO, idx: number) => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }}>
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            styles={{ input: { textAlign: 'right' } }}
            min={0}
            max={100}
            step={0.01}
            precision={2}
            controls={false}
            defaultValue={detalles[idx]?.porcentajeDescuento}
            onChange={(val) => {
              editValuesRef.current[`${detalles[idx].id}_descuento`] = val || 0;
            }}
            onBlur={() => {
              const val = editValuesRef.current[`${detalles[idx].id}_descuento`] ?? detalles[idx]?.porcentajeDescuento;
              handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', val);
            }}
            onPressEnter={() => {
              const val = editValuesRef.current[`${detalles[idx].id}_descuento`] ?? detalles[idx]?.porcentajeDescuento;
              handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', val);
            }}
          />
          <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 'auto' }}>
            {formatNumber(detalles[idx]?.descuento || 0)}
          </div>
        </div>
      ),
    },
    {
      title: 'SubTotal',
      dataIndex: 'subTotal',
      key: 'subTotal',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: DetalleFacturaSuplidorDTO) => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Text>{formatNumber(record.subTotal || 0)}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5, marginTop: 'auto' }}>&nbsp;</div>
        </div>
      ),
    },
    {
      title: 'Impuestos',
      key: 'impuestos',
      width: 140,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: DetalleFacturaSuplidorDTO) => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div>{formatNumber(record.impuestos || 0)}</div>
          <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 'auto', minHeight: 18 }}>
            {record.impuesto?.nombre ? toTitleCase(record.impuesto.nombre) : ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Otros',
      key: 'otros',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: DetalleFacturaSuplidorDTO) => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Text>{formatNumber(calcularOtros(record))}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5, marginTop: 'auto' }}>&nbsp;</div>
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
      render: (_: any, record: DetalleFacturaSuplidorDTO) => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Text strong>{formatNumber((record.total || 0) + calcularOtros(record))}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5, marginTop: 'auto' }}>&nbsp;</div>
        </div>
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 50,
      onCell: () => ({ style: { paddingRight: 8 } }),
      render: (_: any, _record: DetalleFacturaSuplidorDTO, idx: number) => (
        <Tooltip title="Quitar producto">
          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleEliminarFila(detalles[idx].id)} />
        </Tooltip>
      ),
    },
  ];

  // ===== Columnas de impuestos =====
  const impuestoColumns = [
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      width: 120,
      render: (v: string) => <Text>{v || '-'}</Text>,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      ellipsis: true,
      render: (v: string) => <Text>{v || '-'}</Text>,
    },
    {
      title: '%',
      dataIndex: 'porcentaje',
      key: 'porcentaje',
      width: 80,
      align: 'right' as const,
      render: (v: number) => <Text>{v != null ? `${v}%` : '-'}</Text>,
    },
    {
      title: 'Monto',
      dataIndex: 'monto',
      key: 'monto',
      width: 140,
      align: 'right' as const,
      render: (_: any, _record: any, idx: number) => (
        <InputNumber
          size="small"
          style={{ width: 120 }}
          min={0}
          step={0.01}
          precision={2}
          value={impuestosFactura[idx]?.monto}
          onChange={(val) => {
            setImpuestosFactura((prev: any[]) => {
              const next = [...prev];
              next[idx] = { ...next[idx], monto: val || 0 };
              return next;
            });
          }}
        />
      ),
    },
    {
      title: '',
      key: 'accion',
      width: 50,
      render: (_: any, record: any, idx: number) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => {
            setImpuestosFactura((prev: any[]) => prev.filter((_: any, i: number) => i !== idx));
          }}
        />
      ),
    },
  ];

  const handleRefresh = useCallback(() => {
    if (mode === 'crear') return;
    if (!id) return;
    setLoadingError(false);
    setLoading(true);
    facturaSuplidorApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((_res) => {
        const res = _res as any;
        setData(res); setDetalles(res.detalles || []);
        setAsientosLocales(res.asientos || []);
        setImpuestosFactura(normalizarImpuestos(res.impuestosFactura));
        setSelectedConcepto(res.concepto || null);
        setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
        setSelectedEntidad(res.suplidor || res.entidad || null);
        setSelectedEntrada(res.entradaAlmacen || null);
        const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
        form.setFieldsValue({
          concepto: res.concepto?.codigo || '',
          suplidor: res.suplidor?.codigo || res.entidad?.codigo || res.codigoEntidad || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          ncf: res.ncf || '', referencia: res.referencia || '',
          moneda: res.moneda?.nombre || '', monto: res.total || 0,
          tasa: res.tasa || 1, nota: res.nota || '',
          diasCredito: res.diasCredito ?? res.suplidor?.diasCredito ?? 0,
        });

        const docTitle = `${res.documento?.codigo || 'FRDE'}-${res.noDocumento || ''}`;
        setPageTitleOverride(`Editar - ${docTitle}`);
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        message.error(msg); setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, form, mode]);

  const handleGenerarAsientos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setGenerandoAsientos(true);
    try {
      const dto = construirDTO();
      const asientosGenerados = await facturaSuplidorApi.generarAsientos(sucursalActiva, dto);
      setAsientosLocales(asientosGenerados);
      message.success(`Se generaron ${asientosGenerados.length} asientos`);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al generar asientos');
      message.error(msg);
    } finally {
      setGenerandoAsientos(false);
    }
  }, [sucursalActiva, construirDTO]);

  const handleAgregarAsientoManual = (cuenta: any) => {
    const nuevoAsiento = {
      id: Date.now(),
      cuentaContable: { noCuenta: cuenta.noCuenta, nombre: cuenta.nombre },
      monto: 0,
      tipoAsiento: 'D',
      generado: false,
      descripcion: '',
    };
    setAsientosLocales((prev: any[]) => [...prev, nuevoAsiento]);
  };

  if (loading) {
    return <LoadingSpinner mensaje="Cargando documento..." />;
  }

  return (
    <div>
      <FormularioToolbar saving={saving} estado={estado} periodo={data?.periodo} onGuardar={handleGuardar} onCancelar={handleCancelar} />

      {loadingError && (
        <Alert
          message="Error al cargar formulario de factura de suplidor"
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

      <BuscarConceptoModal
        open={conceptoModalOpen}
        onClose={() => setConceptoModalOpen(false)}
        onSelect={handleConceptoSelect}
        sucursal={sucursalActiva}
        documento="RDE"
        tipoEntidad="SUP"
      />
      <BuscarProductoModal
        open={productoModalOpen}
        onClose={() => setProductoModalOpen(false)}
        onSelect={handleProductoSelect}
        mode="compra"
      />
      <BuscarEntradaModal
        open={entradaModalOpen}
        onClose={() => setEntradaModalOpen(false)}
        onSelect={handleEntradaSelect}
        entidad={selectedEntidad?.codigo}
        onBuscar={facturaSuplidorApi.obtenerEntradasAlmacen}
      />

      {/* Modal de selección de impuestos */}
      <SeleccionarImpuestosModal
        open={modalImpuestosOpen}
        onClose={() => setModalImpuestosOpen(false)}
        onConfirm={handleConfirmarImpuestos}
        tipoEntidad="SUP"
        sucursal={sucursalActiva}
        existentes={impuestosFactura.map((i: any) => ({
          codigo: i.codigo || '',
          idExterno: i.idExterno || '',
          nombre: i.nombre || '',
          porcentaje: i.porcentaje || 0,
          tipo: i.tipo || 'Impuesto',
          monto: i.monto,
        }))}
      />

      <ScannerModal
        open={scannerModalOpen}
        onClose={() => setScannerModalOpen(false)}
        onSelect={(producto: any) => {
          handleProductoSelect(producto);
          setScannerModalOpen(false);
        }}
      />

      <BuscarCuentaContableModal
        open={cuentaModalAsientoOpen}
        onClose={() => setCuentaModalAsientoOpen(false)}
        onSelect={(cuenta) => {
          handleAgregarAsientoManual(cuenta);
          setCuentaModalAsientoOpen(false);
        }}
        sucursal={sucursalActiva}
      />

      {isLarge ? (
        /* === DESKTOP LAYOUT (>= xxl) === */
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
                  label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`,
                  children: (
                    <>
                      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} ref={agregarFilaRef}>
                        <Space>
                          <Button type="primary" icon={<PlusOutlined />} onClick={() => setProductoModalOpen(true)}>
                            Agregar producto
                          </Button>
                          <Button icon={<BarcodeOutlined />} onClick={() => setScannerModalOpen(true)} />
                          <Button icon={<PercentageOutlined />} onClick={handleDescuentoGlobal}>
                            Dto. global
                          </Button>
                        </Space>
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
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(event) => { setActiveId(event.active.id as number); }} onDragEnd={handleDragEnd}>
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
                                <Empty description="Sin registros" />
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
                  key: 'impuestos',
                  label: `Impuestos (${impuestosFactura.length})`,
                  children: (
                    <>
                      <div style={{ marginBottom: 8 }}>
                        <Button type="primary" ghost icon={<SearchOutlined />} onClick={() => setModalImpuestosOpen(true)}>
                          Seleccionar del catálogo
                        </Button>
                        {impuestosFactura.length > 0 && (
                          <Button type="link" danger style={{ marginLeft: 8 }} onClick={() => setImpuestosFactura([])}>
                            Limpiar todos
                          </Button>
                        )}
                      </div>
                      <Table
                        dataSource={impuestosFactura}
                        columns={impuestoColumns}
                        rowKey={(r: any) => r.id || r.codigo || Math.random()}
                        size="small"
                        pagination={false}
                        scroll={{ x: 600 }}
                        locale={{ emptyText: 'Sin impuestos seleccionados' }}
                      />
                    </>
                  ),
                },
                {
                  key: 'asientos',
                  label: `Asientos (${asientosLocales.length || data?.asientos?.length || 0})`,
                  children: permisoModificarAsientos ? (
                    <>
                      <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
                        <Button icon={<PlusOutlined />} onClick={() => setCuentaModalAsientoOpen(true)}>
                          Agregar asiento manual
                        </Button>
                      </div>
                      <AsientosContableEditables
                        asientos={asientosLocales.length > 0 ? asientosLocales : (data?.asientos || [])}
                        onChange={setAsientosLocales}
                        editable={true}
                        scroll={{ x: 600 }}
                        onGenerar={handleGenerarAsientos}
                        generando={generandoAsientos}
                      />
                    </>
                  ) : (
                    <AsientosContableTable
                      asientos={data?.asientos || []}
                      scroll={{ x: 600 }}
                    />
                  ),
                },
                {
                  key: 'historial',
                  label: `Historial (${data?.logs?.length || 0})`,
                  children: (
                    <LogTable dataSource={data?.logs || []} scroll={{ x: 900 }} />
                  ),
                },
              ]}
            />
          </Col>
        </Row>
      ) : (
        /* === MOBILE LAYOUT (< xxl) === */
        <div>
          {renderEncabezado()}

          <Tabs
            defaultActiveKey="detalles"
            type="card"
            style={{ borderRadius: 8, padding: '0 16px' }}
            items={[
              {
                key: 'detalles',
                label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`,
                children: (
                  <>
                    <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} ref={agregarFilaRef}>
                      <Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setProductoModalOpen(true)}>
                          Agregar producto
                        </Button>
                        <Button icon={<BarcodeOutlined />} onClick={() => setScannerModalOpen(true)} />
                        <Button icon={<PercentageOutlined />} onClick={handleDescuentoGlobal}>
                          Dto. global
                        </Button>
                      </Space>
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
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(event) => { setActiveId(event.active.id as number); }} onDragEnd={handleDragEnd}>
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
                            <Empty description="Sin registros" />
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
                key: 'impuestos',
                label: `Impuestos (${impuestosFactura.length})`,
                children: (
                  <>
                    <div style={{ marginBottom: 8 }}>
                      <Button type="primary" ghost icon={<SearchOutlined />} onClick={() => setModalImpuestosOpen(true)}>
                        Seleccionar del catálogo
                      </Button>
                      {impuestosFactura.length > 0 && (
                        <Button type="link" danger style={{ marginLeft: 8 }} onClick={() => setImpuestosFactura([])}>
                          Limpiar todos
                        </Button>
                      )}
                    </div>
                    <Table
                      dataSource={impuestosFactura}
                      columns={impuestoColumns}
                      rowKey={(r: any) => r.id || r.codigo || Math.random()}
                      size="small"
                      pagination={false}
                      scroll={{ x: 600 }}
                      locale={{ emptyText: 'Sin impuestos seleccionados' }}
                    />
                  </>
                ),
              },
              {
                key: 'asientos',
                label: `Asientos (${asientosLocales.length || data?.asientos?.length || 0})`,
                children: permisoModificarAsientos ? (
                  <>
                    <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
                      <Button icon={<PlusOutlined />} onClick={() => setCuentaModalAsientoOpen(true)}>
                        Agregar asiento manual
                      </Button>
                    </div>
                    <AsientosContableEditables
                      asientos={asientosLocales.length > 0 ? asientosLocales : (data?.asientos || [])}
                      onChange={setAsientosLocales}
                      editable={true}
                      scroll={{ x: 600 }}
                      onGenerar={handleGenerarAsientos}
                      generando={generandoAsientos}
                    />
                  </>
                ) : (
                  <AsientosContableTable
                    asientos={data?.asientos || []}
                    scroll={{ x: 600 }}
                  />
                ),
              },
              {
                key: 'historial',
                label: `Historial (${data?.logs?.length || 0})`,
                children: (
                  <LogTable dataSource={data?.logs || []} scroll={{ x: 900 }} />
                ),
              },
            ]}
          />
        </div>
      )}

      {/* Modal de Fecha de Vencimiento */}
      <Modal
        title="Fecha de Vencimiento"
        open={fechaVencimientoModal.open}
        onCancel={() => setFechaVencimientoModal({ open: false, detalleId: 0 })}
        onOk={() => setFechaVencimientoModal({ open: false, detalleId: 0 })}
        footer={null}
        destroyOnHidden
      >
        <DatePicker
          style={{ width: '100%' }}
          format="YYYY-MM-DD"
          onChange={handleFechaVencimiento}
        />
      </Modal>

      {/* Guía paso a paso */}
      {(mode === 'crear' || esBorrador) && (
        <FacturaSuplidorGuide
          mode={mode}
          concepto={selectedConcepto}
          suplidor={selectedEntidad}
          almacen={selectedAlmacen}
          detallesCount={detalles.length}
          ncf={ncfValue}
          conceptoRef={conceptoRef}
          suplidorRef={suplidorRef}
          almacenRef={almacenRef}
          agregarFilaRef={agregarFilaRef}
          ncfRef={ncfRef}
          suplidoresDisponibles={suplidoresCache.length > 0}
        />
      )}
    </div>
  );
};

// ===== Componente Guía paso a paso para FRDE =====
interface FacturaSuplidorGuideProps {
  mode: 'crear' | 'editar';
  concepto: any | null;
  suplidor: any | null;
  almacen: any | null;
  detallesCount: number;
  ncf?: string;
  conceptoRef: React.RefObject<HTMLDivElement | null>;
  suplidorRef: React.RefObject<HTMLDivElement | null>;
  almacenRef: React.RefObject<HTMLDivElement | null>;
  agregarFilaRef: React.RefObject<HTMLDivElement | null>;
  ncfRef: React.RefObject<HTMLDivElement | null>;
  suplidoresDisponibles?: boolean;
}

interface GuideStep {
  key: string;
  title: string;
  description: string;
  target: () => HTMLDivElement | null;
}

const FacturaSuplidorGuide: React.FC<FacturaSuplidorGuideProps> = ({
  mode: _mode,
  concepto,
  suplidor,
  almacen,
  detallesCount,
  ncf,
  conceptoRef,
  suplidorRef,
  almacenRef,
  agregarFilaRef,
  ncfRef,
  suplidoresDisponibles,
}) => {
  const [open, setOpen] = useState(false);
  const dismissedStepRef = useRef<string | null>(null);
  const currentStepRef = useRef<GuideStep | null>(null);

  const getCurrentStep = useCallback((): GuideStep | null => {
    const steps: GuideStep[] = [
      {
        key: 'concepto',
        title: 'Paso 1: Concepto',
        description: 'Debe elegir un concepto para poder continuar. Los conceptos determinan ciertas acciones del documento.',
        target: () => conceptoRef.current,
      },
      {
        key: 'suplidor',
        title: 'Paso 2: Suplidor',
        description: 'Seleccione el suplidor de la factura.',
        target: () => suplidorRef.current,
      },
      {
        key: 'almacen',
        title: 'Paso 3: Almacén',
        description: 'Seleccione el almacén de destino.',
        target: () => almacenRef.current,
      },
      {
        key: 'productos',
        title: 'Paso 4: Productos',
        description: 'Agregue productos al documento usando el botón "Agregar fila" o "Buscar Producto".',
        target: () => agregarFilaRef.current,
      },
      {
        key: 'ncf',
        title: 'Paso 5: NCF',
        description: 'Debe digitar el NCF de la factura para poder continuar.',
        target: () => ncfRef.current,
      },
    ];

    // Lógica de prioridad
    if (!concepto) return steps[0];
    if (suplidoresDisponibles && !suplidor) return steps[1];
    if (!almacen) return steps[2];
    if (detallesCount === 0) return steps[3];
    if (!ncf) return steps[4];

    return null;
  }, [concepto, suplidor, almacen, detallesCount, ncf, suplidoresDisponibles, conceptoRef, suplidorRef, almacenRef, agregarFilaRef, ncfRef]);

  currentStepRef.current = getCurrentStep();

  useEffect(() => {
    const current = getCurrentStep();
    if (current) {
      if (dismissedStepRef.current !== current.key) {
        setOpen(true);
      }
    } else {
      setOpen(false);
      dismissedStepRef.current = null;
    }
  }, [getCurrentStep]);

  const currentStep = getCurrentStep();
  if (!currentStep) return null;

  return (
    <GuidePopover
      title={currentStep.title}
      description={currentStep.description}
      targetElement={currentStep.target()}
      open={open}
      onClose={() => { setOpen(false); dismissedStepRef.current = currentStepRef.current?.key || ''; }}
    />
  );
};

const FacturaSuplidorFormularioConErrorBoundary: React.FC = () => (
  <FacturaSuplidorErrorBoundary>
    <FacturaSuplidorFormulario />
  </FacturaSuplidorErrorBoundary>
);
export default FacturaSuplidorFormularioConErrorBoundary;

