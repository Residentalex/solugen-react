import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Dropdown, Popover, Alert, Empty,
} from 'antd';
import {
  SaveOutlined,
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ClearOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  MoreOutlined,
  CalendarOutlined,
  HolderOutlined,
  BarcodeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RedoOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { devolucionCompraApi } from '../../api/devolucionCompraApi';
import { productoApi } from '../../api/productoApi';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import { BuscarEntradaModal } from '../../components/BuscarEntradaModal';
import ScannerModal from '../../components/ScannerModal/ScannerModal';
import ProductosOrigenModal from '../../components/ProductosOrigenModal/ProductosOrigenModal';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import PermissionGate from '../../components/PermissionGate';
import '../../components/FloatingLabel/FloatingField.css';
import type {
  ConceptoDTO, AlmacenDTO, SuplidorDTO,
  AsientoContableDTO,
} from '../../types/entradaAlmacen';
import type { UnidadMedidaDTO } from '../../types/productos';
import type {
  DetalleDevolucionCompraDTO, DevolucionCompraFullDTO, TipoDTO,
} from '../../types/devolucionCompra';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import LogTable from '../../components/LogTable';

import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { DragHandle, SortableRow, DragListenersContext } from '../../components/DragSortable';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useDocumentoConfig } from '../../hooks/useDocumentoConfig';
import { formatCurrency, formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import CamposRestringidosAlert from '../../components/CamposRestringidosAlert';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';

const { Text } = Typography;
const { TextArea } = Input;

// ===== Cálculo de fila SAP (misma fórmula) =====
function calcularFila(fila: DetalleDevolucionCompraDTO): DetalleDevolucionCompraDTO {
  const cantidad = fila.cantidad || 0;
  const costo = fila.costo || 0;
  const pctDesc = fila.porcentajeDescuento || 0;
  const pctImp = fila.impuesto?.porcentaje || 0;

  const subTotal = Math.round(cantidad * costo * 100) / 100;
  const descuento = Math.round(subTotal * (pctDesc / 100) * 100) / 100;
  const baseImponible = subTotal - descuento;
  const impuestos = Math.round(baseImponible * (pctImp / 100) * 100) / 100;
  const total = Math.round((baseImponible + impuestos) * 100) / 100;

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

function filaVacia(): DetalleDevolucionCompraDTO {
  return {
    id: 0,
    codigo: '',
    articulo: '',
    referencia: '',
    cantidad: 0,
    devuelto: 0,
    costo: 0,
    subTotal: 0,
    porcentajeDescuento: 0,
    descuento: 0,
    impuestos: 0,
    total: 0,
    tipoArticulo: 'Producto',
    nota: '',
  };
}


// ===== Componente principal =====
const DevolucionCompraFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const entradaId = (location.state as any)?.entradaId;
  const cloneData = (location.state as any)?.cloneData;
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const { screenCode, documentCode } = useScreenConfig('FDVC');
  const documentoConfig = useDocumentoConfig(sucursalActiva, documentCode);
  const monedaDefault = getMonedaSucursalActiva();

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<DevolucionCompraFullDTO | null>(null);
  const [detalles, setDetalles] = useState<DetalleDevolucionCompraDTO[]>([]);
  const [suplidoresCache, setSuplidoresCache] = useState<SuplidorDTO[]>([]);
  const [almacenesCache, setAlmacenesCache] = useState<AlmacenDTO[]>([]);
  const [tiposCache, setTiposCache] = useState<TipoDTO[]>([]);
  const [selectedTipo, setSelectedTipo] = useState<TipoDTO | null>(null);
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [selectedEntidad, setSelectedEntidad] = useState<SuplidorDTO | null>(null);
  const [selectedAlmacen, setSelectedAlmacen] = useState<AlmacenDTO | null>(null);
  const [selectedEntrada, setSelectedEntrada] = useState<any>(null);

  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
  const [conceptoSearchText, setConceptoSearchText] = useState('');
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [entradaModalOpen, setEntradaModalOpen] = useState(false);
  const [entradaDetallesData, setEntradaDetallesData] = useState<any[]>([]);
  const [comodines, setComodines] = useState<any[]>([]);
  const [productosOrigenModalOpen, setProductosOrigenModalOpen] = useState(false);
  const [modoDescuento, setModoDescuento] = useState<'porcentaje' | 'pesos'>('porcentaje');
  const [detalleSearch, setDetalleSearch] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [fechaVencimientoModal, setFechaVencimientoModal] = useState<{ open: boolean; detalleId: number }>({ open: false, detalleId: 0 });
  const [medidasCache, setMedidasCache] = useState<UnidadMedidaDTO[]>([]);

  const editValuesRef = useRef<Record<string, any>>({});
  const impuestosBackupRef = useRef<Map<number, { impuesto?: any; porcentajeImpuesto: number }>>(new Map());
  const navigationConfirmedRef = useFormularioNavigation();

  // Refs para la guía
  const tipoRef = useRef<HTMLDivElement>(null);
  const conceptoRef = useRef<HTMLDivElement>(null);
  const suplidorRef = useRef<HTMLDivElement>(null);
  const almacenRef = useRef<HTMLDivElement>(null);
  const agregarFilaRef = useRef<HTMLDivElement>(null);
  const entradaRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

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

  // ===== Estado para campos rápidos (NCF, Tasa) =====
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

      // Si se cambió la tasa y hay detalles, preguntar si actualizar costos
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
  const tasaValue = Form.useWatch('tasa', form) ?? 1;

  const sinOC = entradaDetallesData.length === 0;
  const isLarge = screens.xl ?? true;

  // ===== Determinar estado =====
  const estado = data?.estado ?? 0;
  const esCerrado = data?.periodo === 6;
  const esBorrador = estado === 0;
  const esAplicado = estado === 1;
  const esAnulado = estado === 3;

  // ===== Cargar datos de apoyo al montar =====
  useEffect(() => {
    setActiveModule(screenCode);
    const pageTitle = mode === 'crear' ? 'Nueva Devolución de Compra' : 'Editar Devolución de Compra';
    setPageTitleOverride(pageTitle);

    const cleanup = () => {
      resetToolbar();
      setPageTitleOverride('');
    };

    // === Si viene de Clonar ===
    if (cloneData) {
      setDetalles((cloneData.detalles || []).map((d: DetalleDevolucionCompraDTO) => calcularFila(d)));
      setSelectedTipo(cloneData.tipo || null);
      setSelectedConcepto(cloneData.concepto || null);
      setConceptoSearchText(`${cloneData.concepto?.codigo || ''} - ${toTitleCase(cloneData.concepto?.nombre || '')}`);
      setSelectedEntidad(cloneData.suplidor || cloneData.entidad || null);
      setSelectedAlmacen(cloneData.almacen || null);
      setSelectedEntrada(cloneData.entrada || null);

      const fechaDoc = cloneData.fechaDocumento ? parseDateRaw(cloneData.fechaDocumento) : null;
      form.setFieldsValue({
        tipo: cloneData.tipo?.codigo || '',
        concepto: cloneData.concepto?.codigo || '',
        suplidor: cloneData.suplidor?.codigo || cloneData.entidad?.codigo || '',
        almacen: cloneData.almacen?.codigo || '',
        fechaDocumento: fechaDoc ? dayjs(fechaDoc) : dayjs(),
        ncf: cloneData.ncf || '',
        referencia: cloneData.referencia || '',
        moneda: cloneData.moneda?.nombre || '',
        tasa: cloneData.tasa || 1,
        nota: cloneData.nota || '',
      });
      return cleanup;
    }

    // Cargar catálogos iniciales
    devolucionCompraApi.obtenerAlmacenes(sucursalActiva).then(r => setAlmacenesCache(r || [])).catch((err) => { console.warn('Error al cargar almacenes cache en devolucion compra', err); });
    devolucionCompraApi.obtenerTipos(sucursalActiva).then(r => setTiposCache(r || [])).catch((err) => { console.warn('Error al cargar tipos cache en devolucion compra', err); });
    devolucionCompraApi.obtenerSuplidores(sucursalActiva).then(r => setSuplidoresCache(r || [])).catch((err) => { console.warn('Error al cargar suplidores cache en devolucion compra', err); });
    unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch((err) => { console.warn('Error al cargar medidas cache en devolucion compra', err); });

    // Inicializar fecha en modo crear
    if (mode === 'crear') {
      form.setFieldsValue({
        fechaDocumento: dayjs(),
      });
    }

    return cleanup;
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, sucursalActiva, form, cloneData]);

  // ===== Cargar datos si es modo editar =====
  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;

    setLoading(true);
    devolucionCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setDetalles(res.detalles || []);
        setSelectedTipo(res.tipo || null);
        setSelectedConcepto(res.concepto || null);
        setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
        setSelectedEntidad(res.suplidor || res.entidad || null);
        setSelectedAlmacen(res.almacen || null);
        setSelectedEntrada(res.entrada || null);

        const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;

        form.setFieldsValue({
          tipo: res.tipo?.codigo || '',
          concepto: res.concepto?.codigo || '',
          suplidor: res.suplidor?.codigo || res.entidad?.codigo || '',
          almacen: res.almacen?.codigo || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          ncf: res.ncf || '',
          referencia: res.referencia || '',
          moneda: res.moneda?.nombre || '',
          tasa: res.tasa || 1,
          nota: res.nota || '',
        });

        // Cargar suplidores
        devolucionCompraApi.obtenerSuplidores(sucursalActiva)
          .then(r => setSuplidoresCache(r || []))
          .catch((err) => { console.warn('Error al cargar suplidores cache al editar devolucion', err); });
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar el documento');
        message.error(msg);
        setLoadingError(true);
        navigationConfirmedRef.current = true;
        navigate('/FDVC', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate]);

  // ===== Pre-cargar entrada si viene de EntradaAlmacenDetalle =====
  useEffect(() => {
    if (mode !== 'crear' || !entradaId) return;

    const loadFromEntrada = async () => {
      try {
        const detalleEntrada = await devolucionCompraApi.obtenerDetalleEntrada(sucursalActiva, entradaId);

        setSelectedEntrada({
          id: detalleEntrada.id,
          noDocumento: detalleEntrada.noDocumento || '',
          documento: detalleEntrada.documento ?? { codigo: 'ENP', nombre: '' },
        });

        if (detalleEntrada.suplidor?.codigo) {
          setSelectedEntidad(detalleEntrada.suplidor);
          form.setFieldsValue({
            suplidor: detalleEntrada.suplidor.codigo,
            referencia: `${detalleEntrada.documento?.codigo || 'ENP'}-${detalleEntrada.noDocumento || ''}`,
          });
        }

        // Precargar almacén desde la ENP
        if (detalleEntrada.almacen?.codigo) {
          setSelectedAlmacen(detalleEntrada.almacen);
          form.setFieldsValue({ almacen: detalleEntrada.almacen.codigo });
        }

        // Precargar tipo por defecto desde configuración de empresa
        try {
          const tipoDefecto = await devolucionCompraApi.obtenerTipoDVCDefecto(sucursalActiva);
          if (tipoDefecto?.codigo) {
            setSelectedTipo(tipoDefecto);
            form.setFieldsValue({ tipo: tipoDefecto.codigo });

            // Los conceptos se cargarán al abrir el modal de concepto
          }
        } catch (err: any) {
          // Silencioso - si falla, el usuario puede seleccionar manualmente
          console.warn('No se pudo cargar el tipo por defecto:', err);
        }

        const nuevosDetalles = (detalleEntrada.detalles || []).map((d: any, idx: number) => ({
          ...filaVacia(),
          id: -(idx + 1),
          idExterno: d.idExterno || d.id,
          codigo: d.codigo || '',
          articulo: d.articulo || '',
          referencia: d.referencia || '',
          cantidad: d.cantidad || 0,
          devuelto: d.devuelto || 0,
          costo: d.costo || 0,
          porcentajeDescuento: d.porcentajeDescuento || 0,
          familia: d.familia,
          medida: d.medida,
          impuesto: d.impuesto,
          tieneVencimiento: d.tieneVencimiento,
        }));
        setDetalles(nuevosDetalles.map((d: DetalleDevolucionCompraDTO) => calcularFila(d)));
      } catch (err: any) {
        const msg = extraerMensajeError(err, 'Error al cargar la entrada seleccionada');
        message.error(msg);
      }
    };

    loadFromEntrada();
  }, [mode, entradaId, sucursalActiva, form]);

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
          navigate('/FDVC', { replace: true });
        } else {
          if (id) {
            setLoading(true);
            devolucionCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
              .then((res) => {
                setData(res);
        if (res.concepto?.noImpuesto) {
          setDetalles((res.detalles || []).map((d: any) => calcularFila({ ...d, impuesto: undefined })));
        } else {
          setDetalles(res.detalles || []);
        }
                setSelectedTipo(res.tipo || null);
                setSelectedConcepto(res.concepto || null);
                setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
                setSelectedEntidad(res.suplidor || res.entidad || null);
                setSelectedAlmacen(res.almacen || null);
                setSelectedEntrada(res.entrada || null);

                const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;

                form.setFieldsValue({
                  tipo: res.tipo?.codigo || '',
                  concepto: res.concepto?.codigo || '',
                  suplidor: res.suplidor?.codigo || res.entidad?.codigo || '',
                  almacen: res.almacen?.codigo || '',
                  fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                  ncf: res.ncf || '',
                  referencia: res.referencia || '',
                  moneda: res.moneda?.nombre || '',
                  tasa: res.tasa || 1,
                  nota: res.nota || '',
                });

                devolucionCompraApi.obtenerSuplidores(sucursalActiva)
                  .then(r => setSuplidoresCache(r || []))
                  .catch((err) => { console.warn('Error al recargar suplidores cache al cambiar concepto en devolucion', err); });
              })
              .catch((err: any) => {
                const msg = extraerMensajeError(err, 'Error al recargar el documento');
                message.error(msg);
              })
              .finally(() => setLoading(false));
          }
          navigationConfirmedRef.current = true;
          navigate(`/FDVC/${id}`, { replace: true });
        }
      },
    });
  };

  // Validación del formulario (reglas desde ValidarDatos DVC)
  const validarFormulario = (): string | null => {
    const values = form.getFieldsValue();
    if (!selectedTipo) return 'Debe seleccionar un Tipo de Documento antes de elegir un Concepto.';
    if (!selectedConcepto) return 'Debe elegir un Concepto para poder continuar.';
    if (!selectedAlmacen && !values.almacen) return 'El almacén es requerido.';
    if (suplidoresCache.length > 0 && !values.suplidor && !selectedEntidad) return 'El suplidor es requerido.';
    if (detalles.length === 0) return 'No se puede crear un documento de DEVOLUCION COMPRA sin detalle.';
    if (!detalles.some((d) => (d.cantidad || 0) > 0)) return 'Debe tener al menos un detalle con cantidad > 0';

    return null;
  };

  // Construir DTO desde el formulario
  const construirDTO = (): DevolucionCompraFullDTO => {
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
    const total = detalles.reduce((s, d) => s + (d.total || 0), 0);

    // Saneamiento de campos largos para evitar "string right truncation" en Firebird
    const nota = (values.nota || '').slice(0, 1500);
    const ncf = (values.ncf || '').slice(0, 19);
    const referencia = (selectedEntrada?.documento
      ? `${selectedEntrada.documento.codigo || 'ENP'}-${selectedEntrada.noDocumento || ''}`
      : (values.referencia || '')).slice(0, 50);
    const nombreEntidad = (entidadSel?.nombre || '').slice(0, 60);
    const identificacionEntidad = (entidadSel?.identificacion || '').slice(0, 15);

    // Sanea los detalles (DTRANSAC): COD_PRO=VARCHAR(10), DESCRIPCION=VARCHAR(120), REFERENCIA=VARCHAR(50)
    const detallesSeguros = detalles.map((d) => ({
      ...calcularFila(d),
      codigo: (d.codigo || '').slice(0, 10),
      articulo: (d.articulo || '').slice(0, 120),
      referencia: (d.referencia || '').slice(0, 50),
      medida: d.medida ? {
        ...d.medida,
        idExterno: typeof d.medida.idExterno === 'number'
          ? d.medida.idExterno
          : (String(d.medida.idExterno || '')).slice(0, 10),
      } : undefined,
      familia: (d.familia && /^\d+$/.test(String(d.familia.idExterno || '')))
        ? d.familia
        : undefined,
    }));

    return {
      id: base.id || 0,
      fechaDocumento: fechaDoc,
      noDocumento: base.noDocumento || '',
      estado: base.estado || 0,
      periodo: base.periodo || new Date().getMonth() + 1,
      ncf,
      referencia,
      nota,
      subTotal: Math.round(totalSub * 100) / 100,
      descuento: Math.round(totalDesc * 100) / 100,
      impuestos: Math.round(totalImp * 100) / 100,
      total: Math.round(total * 100) / 100,
      retenciones: base.retenciones || 0,
      sucursal: base.sucursal || { nombre: '', codigo: '', identificacion: '' },
      tasa: values.tasa || 1,
      diasCredito: entidadSel?.diasCredito || base.diasCredito || 0,
      tipoDocumento: base.tipoDocumento ?? 24,
      tipoDocumentoExterno: selectedTipo?.idExterno,
      documento: base.documento || { codigo: documentCode },
      concepto: selectedConcepto || { nombre: '', codigo: '' },
      moneda: base.moneda || getMonedaSucursalActiva(),
      almacen: selectedAlmacen || { nombre: '', codigo: '' },
      suplidor: entidadSel ? { ...entidadSel, nombre: nombreEntidad, identificacion: identificacionEntidad } : { nombre: '', codigo: '', identificacion: '' },
      entidad: entidadSel
        ? { nombre: nombreEntidad, codigo: entidadSel.codigo, identificacion: identificacionEntidad, telefono: entidadSel.telefono, direccion: entidadSel.direccion }
        : { nombre: '', codigo: '', identificacion: '' },
      codigoTipo: selectedTipo?.codigo || '',
      entrada: selectedEntrada || null,
      detalles: detallesSeguros,
      asientos: base.asientos || [],
      logs: base.logs || [],
    };
  };

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
        const result = await devolucionCompraApi.crear(sucursalActiva, dto);
        message.success('Devolución de compra creada exitosamente');
        navigationConfirmedRef.current = true;
        navigate(`/FDVC/${result.id}`, { replace: true });
      } else {
        await devolucionCompraApi.actualizar(sucursalActiva, dto);
        message.success('Devolución de compra actualizada exitosamente');
        navigationConfirmedRef.current = true;
        navigate(`/FDVC/${id}`, { replace: true });
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== Handlers de Tipo =====
  const handleTipoSelect = (tipoCodigo: string) => {
    const tipo = tiposCache.find((t) => t.codigo === tipoCodigo) || null;
    setSelectedTipo(tipo);
    setSelectedConcepto(null);
    setConceptoSearchText('');
    form.setFieldsValue({ concepto: '' });
  };

  const handleTipoClear = () => {
    setSelectedTipo(null);
    setSelectedConcepto(null);
    setConceptoSearchText('');
    form.setFieldsValue({ tipo: '', concepto: '' });
  };

  // ===== Handlers de Concepto =====
  const handleConceptoSelect = (concepto: ConceptoDTO) => {
    setSelectedConcepto(concepto);
    setConceptoSearchText(`${concepto.codigo || ''} - ${toTitleCase(concepto.nombre)}`);
    setEditingField(null);

    // Cargar suplidores
    devolucionCompraApi.obtenerSuplidores(sucursalActiva)
      .then((ents) => setSuplidoresCache(ents))
      .catch((err) => { console.warn('Error al cargar suplidores cache al seleccionar concepto en devolucion', err); });

    // === ValidarImpuestosProducto (con backup/restore) ===
    const prevNoImpuesto = selectedConcepto?.noImpuesto;

    if (concepto.noImpuesto) {
      // Guardar backup de impuestos actuales antes de limpiarlos
      const hayImpuestos = detalles.some((d) => (d.impuesto?.porcentaje || 0) > 0);
      if (hayImpuestos) {
        const backup = new Map<number, { impuesto?: any; porcentajeImpuesto: number }>();
        detalles.forEach((d) => {
          if ((d.impuesto?.porcentaje || 0) > 0) {
            backup.set(d.id, { impuesto: d.impuesto, porcentajeImpuesto: 0 });
          }
        });
        impuestosBackupRef.current = backup;

        message.warning('El Concepto no acepta Impuestos, por lo que serán eliminados.');
        setDetalles((prev) =>
          prev.map((d) => calcularFila({ ...d, impuesto: undefined }))
        );
      }
    } else if (prevNoImpuesto && !concepto.noImpuesto) {
      // Restaurar impuestos desde backup
      const backup = impuestosBackupRef.current;
      if (backup.size > 0) {
        setDetalles((prev) =>
          prev.map((d) => {
            const saved = backup.get(d.id);
            if (saved) {
              return calcularFila({ ...d, impuesto: saved.impuesto });
            }
            return d;
          })
        );
        impuestosBackupRef.current = new Map();
      }
    }

    // === ConfigurarMoneda (siempre desde concepto) ===
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

    // Auto-asignar almacén si el concepto trae uno
    if (concepto.almacen) {
      setSelectedAlmacen(concepto.almacen);
      form.setFieldsValue({ almacen: concepto.almacen.codigo });
    }
  };

  const handleConceptoClear = () => {
    setSelectedConcepto(null);
    setConceptoSearchText('');
    setSuplidoresCache([]);
    form.setFieldsValue({ concepto: '', suplidor: undefined });
  };

  const handleConceptoSearchClick = () => {
    setConceptoModalOpen(true);
  };

  // ===== Handlers de Entrada Referencia =====
  const handleEntradaSelect = async (entrada: any) => {
    try {
      const detalleEntrada = await devolucionCompraApi.obtenerDetalleEntrada(sucursalActiva, entrada.id);

      // Guardar productos de la entrada en memoria para el modal compartido
      setEntradaDetallesData(detalleEntrada.detalles || []);
      productoApi.obtenerComodines(sucursalActiva).then(setComodines).catch((err) => { console.warn('Error al cargar comodines al seleccionar entrada en devolucion', err); });

      // Auto-asignar entrada
      setSelectedEntrada({
        id: detalleEntrada.id,
        noDocumento: detalleEntrada.noDocumento || '',
        documento: detalleEntrada.documento ?? { codigo: 'ENP', nombre: '' },
      });

      // Auto-asignar suplidor desde la entrada
      if (detalleEntrada.suplidor?.codigo) {
        setSelectedEntidad(detalleEntrada.suplidor);
        form.setFieldsValue({ suplidor: detalleEntrada.suplidor.codigo });
      }

      // Auto-asignar almacén desde la entrada
      if (detalleEntrada.almacen?.codigo) {
        setSelectedAlmacen(detalleEntrada.almacen);
        form.setFieldsValue({ almacen: detalleEntrada.almacen.codigo });
      }

      // Auto-asignar moneda y tasa desde la entrada (fallback si suplidor no tiene moneda)
      if (detalleEntrada.moneda?.codigo) {
        form.setFieldsValue({
          moneda: detalleEntrada.moneda.nombre,
          tasa: detalleEntrada.tasa || 1,
        });
      }

      // Preguntar si desea importar detalles si ya existen
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
          const nuevosDetalles = (detalleEntrada.detalles || []).map((d: any, idx: number) => ({
            ...filaVacia(),
            id: -(idx + 1),
            idExterno: d.idExterno || d.id,
            codigo: d.codigo || '',
            articulo: d.articulo || '',
            referencia: d.referencia || '',
            cantidad: d.cantidad || 0,
            devuelto: d.devuelto || 0,
            costo: d.costo || 0,
            porcentajeDescuento: d.porcentajeDescuento || 0,
            familia: d.familia,
            medida: d.medida,
            impuesto: d.impuesto,
            tieneVencimiento: d.tieneVencimiento,
          }));
          setDetalles(nuevosDetalles.map((d: DetalleDevolucionCompraDTO) => calcularFila(d)));
        }
      } else {
        Modal.confirm({
          title: '¿Desea Cargar todos los registros?',
          icon: <ExclamationCircleOutlined />,
          content: '¿Desea cargar los productos de la entrada seleccionada?',
          okText: 'Sí, cargar',
          cancelText: 'No',
          onOk: () => {
            const nuevosDetalles = (detalleEntrada.detalles || []).map((d: any, idx: number) => ({
              ...filaVacia(),
              id: -(idx + 1),
              idExterno: d.idExterno || d.id,
              codigo: d.codigo || '',
              articulo: d.articulo || '',
              referencia: d.referencia || '',
              cantidad: d.cantidad || 0,
              devuelto: d.devuelto || 0,
              costo: d.costo || 0,
              porcentajeDescuento: d.porcentajeDescuento || 0,
              familia: d.familia,
              medida: d.medida,
              impuesto: d.impuesto,
              tieneVencimiento: d.tieneVencimiento,
            }));
            setDetalles(nuevosDetalles.map((d: DetalleDevolucionCompraDTO) => calcularFila(d)));
          },
        });
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al cargar la entrada seleccionada');
      message.error(msg);
    }
  };

  const handleEntradaClear = () => {
    setSelectedEntrada(null);
    setEntradaDetallesData([]);
    form.setFieldsValue({ referencia: '' });
  };

  // ===== Handlers de detalles =====
  const handleAgregarFila = () => {
    setDetalles((prev) => [{ ...filaVacia(), id: -(prev.length + 1) }, ...prev]);
  };

  const handleEliminarFila = (idFila: number) => {
    Modal.confirm({
      title: 'Eliminar detalle',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro de eliminar este detalle?',
      okText: 'Sí',
      cancelText: 'No',
      okButtonProps: { danger: true },
      onOk: () => {
        setDetalles((prev) => prev.filter((d) => d.id !== idFila));
      },
    });
  };

  const handleDetalleUpdateValue = (idFila: number, field: string, value: any) => {
    setDetalles((prev) =>
      prev.map((d) => (d.id !== idFila ? d : { ...d, [field]: value }))
    );
  };

  const handleDetalleCalculate = (idFila: number, field: string, value: any) => {
    if (field === 'cantidad' && entradaDetallesData.length > 0) {
      const detalle = detalles.find((d) => d.id === idFila);
      if (detalle) {
        const entradaDetalle = entradaDetallesData.find((d: any) => d.codigo === detalle.codigo);
        if (entradaDetalle) {
          const disponible = Number(entradaDetalle.cantidad) || 0;
          if (Number(value) > disponible) {
            message.warning(`La cantidad disponible en la entrada es ${disponible}. Se ajustará automáticamente.`);
            value = disponible;
          }
        }
      }
    }
    setDetalles((prev) =>
      prev.map((d) => {
        if (d.id !== idFila) return d;
        let updated = { ...d, [field]: value };
        // Si el campo es 'descuento' (modo pesos), calcular porcentaje equivalente
        if (field === 'descuento') {
          const subTotal = (updated.cantidad || 0) * (updated.costo || 0);
          const pctDesc = subTotal > 0 ? (Number(value) / subTotal) * 100 : 0;
          updated.porcentajeDescuento = Math.round(pctDesc * 100) / 100;
        }
        return calcularFila(updated);
      })
    );
  };

  const handleDescuentoGlobal = () => {
    let pct = 0;
    Modal.confirm({
      title: 'Descuento global',
      content: (
        <div style={{ marginTop: 8 }}>
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            max={100}
            step={0.01}
            precision={2}
            placeholder="Porcentaje de descuento"
            addonAfter="%"
            onChange={(val) => { pct = val ?? 0; }}
            autoFocus
          />
        </div>
      ),
      onOk: () => {
        setDetalles((prev) => prev.map((d) => {
          const updated = calcularFila({ ...d, porcentajeDescuento: pct });
          return updated;
        }));
      },
    });
  };

  const handleAddProductoClick = () => {
    if (selectedEntrada) {
      setProductosOrigenModalOpen(true);
    } else {
      setProductoModalOpen(true);
    }
  };

  const handleProductoSelect = (producto: any) => {
    const filaVaciaIdx = detalles.findIndex((d) => !d.codigo);
    if (filaVaciaIdx === -1) {
      const nuevaFila = filaVacia();
      const nuevoId = -(detalles.length + 1);
      setDetalles((prev) => {
        const filled: DetalleDevolucionCompraDTO = {
          ...nuevaFila,
          id: nuevoId,
          codigo: producto.codigo,
          articulo: producto.articulo,
          referencia: producto.referencia || '',
          costo: producto.costo || 0,
          familia: producto.familia,
          medida: producto.medida,
          impuesto: selectedConcepto?.noImpuesto ? undefined : producto.impuesto,
          tieneVencimiento: producto.tieneVencimiento,
          modificaPrecio: producto.modificaPrecio ?? false,
          modificaDescripcion: producto.modificaDescripcion ?? false,
        };
        return [calcularFila(filled), ...prev];
      });
    } else {
      setDetalles((prev) =>
        prev.map((d) => {
          if (d.id !== detalles[filaVaciaIdx].id) return d;
          const filled: DetalleDevolucionCompraDTO = {
            ...d,
            codigo: producto.codigo,
            articulo: producto.articulo,
            referencia: producto.referencia || '',
            costo: producto.costo || 0,
            familia: producto.familia,
            medida: producto.medida,
            impuesto: selectedConcepto?.noImpuesto ? undefined : producto.impuesto,
            tieneVencimiento: producto.tieneVencimiento,
            modificaPrecio: producto.modificaPrecio ?? false,
            modificaDescripcion: producto.modificaDescripcion ?? false,
          };
          return calcularFila(filled);
        })
      );
    }
  };

  const handleScannerProducto = (producto: any) => {
    if (entradaDetallesData.length > 0) {
      const existeEnEntrada = entradaDetallesData.some((d: any) => d.codigo === producto.codigo);
      const esComodin = comodines.some((c: any) => (c.codigo || c.idExterno) === producto.codigo);
      if (!existeEnEntrada && !esComodin) {
        message.warning(`El producto ${producto.codigo} no pertenece a la entrada seleccionada ni es un comodín`);
        return;
      }
    }
    const nuevaFila = filaVacia();
    const nuevoId = -(detalles.length + 1);
    setDetalles((prev) => {
      const filled: DetalleDevolucionCompraDTO = {
        ...nuevaFila,
        id: nuevoId,
        codigo: producto.codigo,
        articulo: producto.articulo,
        referencia: producto.referencia || '',
        costo: producto.costo || 0,
        cantidad: producto.cantidad || 1,
        familia: producto.familia,
        medida: producto.medida,
        impuesto: selectedConcepto?.noImpuesto ? undefined : producto.impuesto,
      };
      return [calcularFila(filled), ...prev];
    });
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

  // ===== Totales calculados =====
  const totales = {
    subTotal: detalles.reduce((s, d) => s + (d.subTotal || 0), 0),
    descuento: detalles.reduce((s, d) => s + (d.descuento || 0), 0),
    impuestos: detalles.reduce((s, d) => s + (d.impuestos || 0), 0),
    total: detalles.reduce((s, d) => s + (d.total || 0), 0),
  };

  const handleRefresh = useCallback(() => {
    if (mode === 'crear') return;
    if (!id) return;
    setLoadingError(false);
    setLoading(true);
    devolucionCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setDetalles(res.detalles || []);
        setSelectedTipo(res.tipo || null);
        setSelectedConcepto(res.concepto || null);
        setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
        setSelectedEntidad(res.suplidor || res.entidad || null);
        setSelectedAlmacen(res.almacen || null);
        setSelectedEntrada(res.entrada || null);
        const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
        form.setFieldsValue({
          tipo: res.tipo?.codigo || '',
          concepto: res.concepto?.codigo || '',
          suplidor: res.suplidor?.codigo || res.entidad?.codigo || '',
          almacen: res.almacen?.codigo || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          ncf: res.ncf || '',
          referencia: res.referencia || '',
          moneda: res.moneda?.nombre || '',
          tasa: res.tasa || 1,
          nota: res.nota || '',
        });
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al recargar');
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, form, mode]);

  // ===== Columnas de la tabla de asientos =====
  function esDebito(tipo: any): boolean { return tipo === 'D' || tipo === 0; }
  function esCredito(tipo: any): boolean { return tipo === 'C' || tipo === 1; }
  const totalDebitos = (data?.asientos || []).reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
  const totalCreditos = (data?.asientos || []).reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);

  const asientoColumns = [
    { title: 'Cuenta', key: 'cuenta', width: 120,
      render: (_: any, r: AsientoContableDTO) => r.cuentaContable?.noCuenta || '-' },
    { title: 'Nombre', key: 'nombre', ellipsis: true,
      render: (_: any, r: AsientoContableDTO) => r.cuentaContable?.nombre ? toTitleCase(r.cuentaContable.nombre) : '-' },
    { title: 'Descripcion', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true,
      render: (v: string) => v ? toTitleCase(v) : '-' },
    { title: 'Debito', key: 'debito', width: 130, align: 'right' as const,
      render: (_: any, r: AsientoContableDTO) => esDebito(r.tipoAsiento) ? formatNumber(r.monto) : '' },
    { title: 'Credito', key: 'credito', width: 130, align: 'right' as const,
      render: (_: any, r: AsientoContableDTO) => esCredito(r.tipoAsiento) ? formatNumber(r.monto) : '' },
  ];

  // ===== Loading state =====
  if (loading) {
    return <LoadingSpinner mensaje="Cargando documento..." />;
  }

  // ===== Estado info =====
  const estadoInfo = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Borrador', color: 'default' };

  // ===== Encabezado del formulario =====
  const documentoTieneTipos = tiposCache.length > 0;
  const renderEncabezado = () => (
    <Card className="paces-card" size="small" title="Datos Generales" extra={<EstadoTag estado={estado} periodo={data?.periodo} />} style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={24} xxl={18}>
          <Form form={form} layout="vertical" size="middle" style={{ paddingTop: 24 }}>
        <Row gutter={[16, 24]}>
          {/* Fila 1: Tipo de Documento + Suplidor */}
          <Col xs={24} sm={12} lg={9}>
            <div ref={tipoRef} style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
              <div style={{ flex: 1 }}>
                <Form.Item name="tipo" required style={{ marginBottom: 0 }}>
                  <FloatingField label="Tipo de Documento" required>
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      placeholder=" "
                      onChange={handleTipoSelect}
                      onClear={handleTipoClear}
                    >
                      {tiposCache.map((t) => (
                        <Select.Option key={t.codigo} value={t.codigo}>
                          {t.codigo} - {toTitleCase(t.nombre)}
                        </Select.Option>
                      ))}
                    </Select>
                  </FloatingField>
                </Form.Item>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} lg={15}>
            <div ref={suplidorRef}>
              <Form.Item name="suplidor" required style={{ marginBottom: 0 }}>
                <FloatingField label="Suplidor" required>
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      placeholder=" "
                      value={selectedEntidad?.codigo || undefined}
                      onChange={(val) => {
                        const ent = suplidoresCache.find((e) => e.codigo === val);
                        setSelectedEntidad(ent || null);
                      }}
                    >
                      {suplidoresCache.map((ent) => (
                        <Select.Option key={ent.codigo} value={ent.codigo}>
                          {toTitleCase(ent.nombre)}{ent.identificacion ? ` (${ent.identificacion})` : ''}
                        </Select.Option>
                      ))}
                    </Select>
                </FloatingField>
              </Form.Item>
            </div>
          </Col>

          {/* Fila 2: Entrada de Referencia + Concepto */}
          <Col xs={24} sm={12} lg={9}>
            <div ref={entradaRef}>
            <FloatingField label="Entrada de Referencia">
              <Input
                placeholder=" "
                value={selectedEntrada?.documento 
                  ? `${selectedEntrada.documento.codigo || 'ENP'}-${selectedEntrada.noDocumento || ''}` 
                  : (form.getFieldValue('referencia') || '')}
                readOnly
                suffix={
                  <Space size={4}>
                    <SearchOutlined onClick={() => setEntradaModalOpen(true)} style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }} />
                    {selectedEntrada && <ClearOutlined onClick={handleEntradaClear} style={{ cursor: 'pointer' }} />}
                  </Space>
                }
                onClick={() => setEntradaModalOpen(true)}
              />
            </FloatingField>
            </div>
            <Form.Item name="referencia" hidden><Input /></Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={15}>
            <div ref={conceptoRef}>
              <FloatingField label="Concepto" required externalValue={conceptoSearchText}>
                <Input
                  placeholder=" "
                  value={conceptoSearchText}
                  readOnly
                  disabled={documentoTieneTipos && !selectedTipo}
                  suffix={
                    <SearchOutlined
                      onClick={() => (!documentoTieneTipos || selectedTipo) && handleConceptoSearchClick()}
                      style={{ cursor: (!documentoTieneTipos || selectedTipo) ? 'pointer' : 'not-allowed', color: 'rgba(0,0,0,0.45)' }}
                    />
                  }
                  onClick={() => (!documentoTieneTipos || selectedTipo) && handleConceptoSearchClick()}
                />
              </FloatingField>
            </div>
            <ConceptoInfoLabel concepto={selectedConcepto} />
            <Form.Item name="concepto" hidden><Input /></Form.Item>
          </Col>

          {/* Fila 3: Fecha Documento + Almacén */}
          <Col xs={24} sm={12} lg={9}>
            <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }}>
              <FloatingField label="Fecha Documento" required>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </FloatingField>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={15}>
            <div ref={almacenRef}>
              <Form.Item name="almacen" required style={{ marginBottom: 0 }}>
                <FloatingField label="Almacén" required>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    placeholder=" "
                    value={selectedAlmacen?.codigo || undefined}
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
            </div>
          </Col>

          {/* Fila 4: Nota */}
          <Col xs={24}>
            <Form.Item name="nota" style={{ marginBottom: 0 }}>
              <FloatingField label="Nota">
                <TextArea rows={3} />
              </FloatingField>
            </Form.Item>
          </Col>

          {/* Fila 5: Campos rápidos (NCF, Tasa) */}
          <Col xs={24}>
            <div style={{ marginBottom: 16 }}>
              <Space size={[8, 8]} wrap>
                {/* NCF */}
                <div>
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
                </div>

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
              </Space>
            </div>
            {/* Hidden form items */}
            <Form.Item name="ncf" hidden><Input /></Form.Item>
            <Form.Item name="tasa" hidden><InputNumber /></Form.Item>
            <Form.Item name="moneda" hidden><Input /></Form.Item>
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
      render: (_: any, record: any) => {
        const existeEnEntrada = entradaDetallesData.length > 0 && entradaDetallesData.some((d: any) => d.codigo === record.codigo);
        return (
          <div style={{ fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{record.codigo || '-'}</span>
              {entradaDetallesData.length > 0 && (
                existeEnEntrada
                  ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 14 }} />
                  : <CloseCircleOutlined style={{ color: '#999', fontSize: 14 }} />
              )}
            </div>
            {record.referencia && (
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5 }}>{record.referencia}</div>
            )}
          </div>
        );
      },
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
        if (docPermiteDesc) {
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
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 100,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      shouldCellUpdate: (record: DetalleDevolucionCompraDTO, prevRecord: DetalleDevolucionCompraDTO) =>
        record.cantidad !== prevRecord.cantidad || record.medida?.nombre !== prevRecord.medida?.nombre,
      render: (_: any, _record: DetalleDevolucionCompraDTO, idx: number) => (
        <div>
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            styles={{ input: { textAlign: 'right' } }}
            min={0.01}
            step={0.01}
            precision={2}
            controls={false}
            value={detalles[idx]?.cantidad}
            onChange={(val) => { editValuesRef.current[`${detalles[idx].id}_cantidad`] = val ?? 0; }}
            onBlur={() => { const val = editValuesRef.current[`${detalles[idx].id}_cantidad`] ?? (detalles[idx]?.cantidad || 0); handleDetalleCalculate(detalles[idx].id, 'cantidad', val); }}
            onPressEnter={() => { const val = editValuesRef.current[`${detalles[idx].id}_cantidad`] ?? (detalles[idx]?.cantidad || 0); handleDetalleCalculate(detalles[idx].id, 'cantidad', val); }}
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
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      width: 130,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
      shouldCellUpdate: (record: DetalleDevolucionCompraDTO, prevRecord: DetalleDevolucionCompraDTO) => record.costo !== prevRecord.costo || record.porcentajeDescuento !== prevRecord.porcentajeDescuento || record.cantidad !== prevRecord.cantidad || record.medida?.factor !== prevRecord.medida?.factor || record.modificaPrecio !== prevRecord.modificaPrecio,
      render: (_: any, _record: DetalleDevolucionCompraDTO, idx: number) => {
        const fila = detalles[idx];
        if (!fila) return null;
        const costoBase = Number(fila.costo) || 0;
        const pctDesc = Number(fila.porcentajeDescuento) || 0;
        const factor = Number(fila.medida?.factor) || 1;
        const costoConDescuento = costoBase - ((costoBase * pctDesc) / 100);
        const costoUnitario = costoConDescuento / factor;
        const docPermiteEditar = documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio ?? true;
        if (docPermiteEditar) {
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
                value={fila.costo}
                onChange={(val) => handleDetalleUpdateValue(fila.id, 'costo', val || 0)}
                onBlur={() => handleDetalleCalculate(fila.id, 'costo', fila.costo || 0)}
                onPressEnter={() => handleDetalleCalculate(fila.id, 'costo', fila.costo || 0)}
              />
              <div style={{ fontSize: 11, lineHeight: 1.5, color: '#999' }}>
                {formatNumber(costoUnitario)} × {factor}
              </div>
            </div>
          );
        }
        return (
          <div>
            <div style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(costoBase)}</div>
            <div style={{ fontSize: 11, lineHeight: 1.5, color: '#999' }}>
              {formatNumber(costoUnitario)} × {factor}
            </div>
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
      render: (_: any, _record: DetalleDevolucionCompraDTO, idx: number) =>
        modoDescuento === 'porcentaje' ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }}>
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                key={`pct_${detalles[idx].id}_${modoDescuento}`}
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
              <span onClick={() => setModoDescuento('pesos')} style={{ cursor: 'pointer', display: 'inline-flex' }}>
                <Input size="small" placeholder="%" disabled style={{ width: 36, textAlign: 'center', borderLeft: 'none', pointerEvents: 'none' }} />
              </span>
            </Space.Compact>
            <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 'auto' }}>
              {formatNumber(detalles[idx]?.descuento || 0)}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }}>
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                key={`pesos_${detalles[idx].id}_${modoDescuento}`}
                size="small"
                style={{ width: '100%' }}
                styles={{ input: { textAlign: 'right' } }}
                min={0}
                step={0.01}
                precision={2}
                controls={false}
                defaultValue={detalles[idx]?.descuento}
                onChange={(val) => {
                  editValuesRef.current[`${detalles[idx].id}_descuento_pesos`] = val || 0;
                }}
                onBlur={() => {
                  const val = editValuesRef.current[`${detalles[idx].id}_descuento_pesos`] ?? detalles[idx]?.descuento;
                  handleDetalleCalculate(detalles[idx].id, 'descuento', val);
                }}
                onPressEnter={() => {
                  const val = editValuesRef.current[`${detalles[idx].id}_descuento_pesos`] ?? detalles[idx]?.descuento;
                  handleDetalleCalculate(detalles[idx].id, 'descuento', val);
                }}
              />
              <span onClick={() => setModoDescuento('porcentaje')} style={{ cursor: 'pointer', display: 'inline-flex' }}>
                <Input size="small" placeholder="$" disabled style={{ width: 36, textAlign: 'center', borderLeft: 'none', pointerEvents: 'none' }} />
              </span>
            </Space.Compact>
            <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 'auto' }}>
              {formatNumber(detalles[idx]?.porcentajeDescuento || 0)}%
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
      render: (_: any, record: DetalleDevolucionCompraDTO) => (
        <Text>{formatNumber(record.subTotal || 0)}</Text>
      ),
    },
    {
      title: 'Impuestos',
      key: 'impuestos',
      width: 140,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: DetalleDevolucionCompraDTO) => (
        <div>
          <div>{formatNumber(record.impuestos || 0)}</div>
          <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, minHeight: 18 }}>
            {record.impuesto?.nombre ? toTitleCase(record.impuesto.nombre) : ''}
          </div>
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
      render: (_: any, record: DetalleDevolucionCompraDTO) => (
        <Text strong>{formatNumber(record.total || 0)}</Text>
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 50,
      onCell: () => ({ style: { paddingRight: 8 } }),
      render: (_: any, _record: DetalleDevolucionCompraDTO, idx: number) => {
        const items = [
          {
            key: 'eliminar',
            label: 'Eliminar',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleEliminarFila(detalles[idx].id),
          },
        ];

        if (detalles[idx]?.tieneVencimiento) {
          items.unshift({
            key: 'vencimiento',
            label: detalles[idx].fechaVencimiento ? `Venc: ${formatDate(detalles[idx].fechaVencimiento!)}` : 'Fecha Vencimiento',
            icon: <CalendarOutlined />,
            danger: false,
            onClick: () => setFechaVencimientoModal({ open: true, detalleId: detalles[idx].id }),
          });
        }

        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div>
      <FormularioToolbar saving={saving} estado={estado} periodo={data?.periodo} onGuardar={handleGuardar} onCancelar={handleCancelar} />

      {loadingError && (
        <Alert
          message="Error al cargar formulario de devolución de compra"
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
        onSelect={(concepto) => {
          handleConceptoSelect(concepto);
          setConceptoModalOpen(false);
        }}
        sucursal={sucursalActiva}
        documento="DVC"
        tipo={selectedTipo?.codigo}
      />
      <BuscarProductoModal
        open={productoModalOpen}
        onClose={() => setProductoModalOpen(false)}
        onSelect={handleProductoSelect}
        mode="compra"
      />
      <ProductosOrigenModal
        open={productosOrigenModalOpen}
        onClose={() => setProductosOrigenModalOpen(false)}
        title="Agregar producto"
        sourceLabel="Entrada"
        sourceProducts={entradaDetallesData}
        comodines={comodines}
        addedCodes={detalles.map((d) => d.codigo)}
        sourceColumns={[
          { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
          { title: 'Artículo', dataIndex: 'articulo', key: 'articulo', ellipsis: true },
          { title: 'Cant.', dataIndex: 'cantidad', key: 'cantidad', width: 90, align: 'right' as const },
          { title: 'Costo', dataIndex: 'costo', key: 'costo', width: 100, align: 'right' as const,
            render: (v: number) => formatNumber(v) },
        ]}
        comodinColumns={[
          { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
          { title: 'Artículo', dataIndex: 'nombre', key: 'nombre', ellipsis: true },
          { title: 'Costo', dataIndex: 'ultimoCosto', key: 'ultimoCosto', width: 100, align: 'right' as const,
            render: (v: number) => formatNumber(v || 0) },
        ]}
        onAddSourceProduct={(record) => {
          setDetalles((prev) => [
            calcularFila({
              ...filaVacia(),
              id: -(prev.length + 1),
              codigo: record.codigo,
              articulo: record.articulo,
              referencia: record.referencia || '',
              cantidad: record.cantidad || 0,
              costo: record.costo || 0,
              familia: record.familia,
              medida: record.medida,
              impuesto: record.impuesto,
              tieneVencimiento: record.tieneVencimiento,
            }),
            ...prev,
          ]);
        }}
        onAddComodin={(record) => {
          setDetalles((prev) => [
            calcularFila({
              ...filaVacia(),
              id: -(prev.length + 1),
              codigo: record.codigo || record.idExterno,
              articulo: record.nombre,
              referencia: record.referencia || record.upc || '',
              costo: record.ultimoCosto || 0,
              cantidad: 1,
              familia: record.familia,
              medida: record.unidadMedida || { nombre: '', codigo: '', factor: 1, idExterno: 0 },
              impuesto: record.impuestos?.[0]?.impuesto,
            }),
            ...prev,
          ]);
        }}
      />
      <BuscarEntradaModal
        open={entradaModalOpen}
        onClose={() => setEntradaModalOpen(false)}
        onSelect={handleEntradaSelect}
        entidad={selectedEntidad?.codigo}
        onBuscar={devolucionCompraApi.buscarEntradas}
      />
      <ScannerModal
        open={scannerModalOpen}
        onClose={() => setScannerModalOpen(false)}
        onSelect={handleScannerProducto}
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
                  label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`,
                  children: (
                    <>
                      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} ref={agregarFilaRef}>
                        <Space>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAddProductoClick}>
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
                  key: 'asientos',
                  label: `Asientos (${data?.asientos?.length || 0})`,
                  children: (
                    <Table
                      dataSource={data?.asientos || []}
                      columns={asientoColumns}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      scroll={{ x: 900 }}
                      summary={() => (
                        <Table.Summary fixed>
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={3}><strong>Totales</strong></Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right"><strong>{formatNumber(totalDebitos)}</strong></Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right"><strong>{formatNumber(totalCreditos)}</strong></Table.Summary.Cell>
                          </Table.Summary.Row>
                        </Table.Summary>
                      )}
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
                label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`,
                children: (
                  <>
                    <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} ref={agregarFilaRef}>
                      <Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddProductoClick}>
                          Agregar producto
                        </Button>
                        <Button icon={<BarcodeOutlined />} onClick={() => setScannerModalOpen(true)} />
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
                key: 'asientos',
                label: `Asientos (${data?.asientos?.length || 0})`,
                children: (
                  <Table
                    dataSource={data?.asientos || []}
                    columns={asientoColumns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    scroll={{ x: 900 }}
                    summary={() => (
                      <Table.Summary fixed>
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={3}><strong>Totales</strong></Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right"><strong>{formatNumber(totalDebitos)}</strong></Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right"><strong>{formatNumber(totalCreditos)}</strong></Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    )}
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

      {/* Guía paso a paso (solo en modo crear o editar borrador) */}
      {(mode === 'crear' || esBorrador) && (
        <DevolucionCompraGuide
          mode={mode}
          tipo={selectedTipo}
          concepto={selectedConcepto}
          suplidor={selectedEntidad}
          almacen={selectedAlmacen}
          entrada={selectedEntrada}
          detallesCount={detalles.length}
          tipoRef={tipoRef}
          conceptoRef={conceptoRef}
          suplidorRef={suplidorRef}
          almacenRef={almacenRef}
          agregarFilaRef={agregarFilaRef}
          entradaRef={entradaRef}
          suplidoresDisponibles={suplidoresCache.length > 0}
        />
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
    </div>
  );
};

// ===== Componente Guía paso a paso para DVC =====
interface DevolucionCompraGuideProps {
  mode: 'crear' | 'editar';
  tipo: TipoDTO | null;
  concepto: ConceptoDTO | null;
  suplidor: SuplidorDTO | null;
  almacen: AlmacenDTO | null;
  entrada: any | null;
  detallesCount: number;
  tipoRef: React.RefObject<HTMLDivElement | null>;
  conceptoRef: React.RefObject<HTMLDivElement | null>;
  suplidorRef: React.RefObject<HTMLDivElement | null>;
  almacenRef: React.RefObject<HTMLDivElement | null>;
  agregarFilaRef: React.RefObject<HTMLDivElement | null>;
  entradaRef: React.RefObject<HTMLDivElement | null>;
  suplidoresDisponibles?: boolean;
}

interface GuideStep {
  key: string;
  title: string;
  description: string;
  target: () => HTMLDivElement | null;
}

const DevolucionCompraGuide: React.FC<DevolucionCompraGuideProps> = ({
  tipo,
  concepto,
  suplidor,
  almacen,
  entrada,
  detallesCount,
  tipoRef,
  conceptoRef,
  suplidorRef,
  almacenRef,
  agregarFilaRef,
  entradaRef,
  suplidoresDisponibles,
}) => {
  const [open, setOpen] = useState(false);
  const dismissedStepRef = useRef<string | null>(null);
  const currentStepRef = useRef<GuideStep | null>(null);

  const getCurrentStep = useCallback((): GuideStep | null => {
    const steps: GuideStep[] = [
      {
        key: 'tipo',
        title: 'Paso 1: Tipo de Documento',
        description: 'Debe elegir un tipo de documento antes de seleccionar el concepto.',
        target: () => tipoRef.current,
      },
      {
        key: 'entrada',
        title: 'Paso 2: Entrada de Referencia',
        description: 'Seleccione una Entrada de Almacén de referencia para cargar sus productos.',
        target: () => entradaRef.current,
      },
      {
        key: 'concepto',
        title: 'Paso 3: Concepto',
        description: 'Seleccione un concepto. Las opciones disponibles dependen del tipo seleccionado.',
        target: () => conceptoRef.current,
      },
      {
        key: 'suplidor',
        title: 'Paso 4: Suplidor',
        description: 'Seleccione el suplidor. Puede auto-asignarse al elegir una Entrada de Referencia.',
        target: () => suplidorRef.current,
      },
      {
        key: 'almacen',
        title: 'Paso 5: Almacén',
        description: 'Seleccione el almacén donde se registrará la devolución.',
        target: () => almacenRef.current,
      },
      {
        key: 'productos',
        title: 'Paso 6: Productos',
        description: 'Agregue productos usando "Agregar fila", "Buscar Producto" o importando desde una Entrada de Almacén.',
        target: () => agregarFilaRef.current,
      },
    ];

    // Lógica de prioridad (mismo orden que MostrarGuia del desktop)
    if (!tipo) return steps[0];
    // Paso 2: Entrada solo si el tipo requiere referencia
    if (tipo?.requiereReferencia && !entrada) return steps[1];
    if (!concepto) return steps[2];
    if (suplidoresDisponibles && !suplidor) return steps[3];
    if (!almacen) return steps[4];
    if (detallesCount === 0) return steps[5];

    return null;
  }, [tipo, concepto, almacen, suplidor, entrada, detallesCount, suplidoresDisponibles, tipoRef, conceptoRef, suplidorRef, almacenRef, agregarFilaRef, entradaRef]);

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

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.ant-popover')) return;
      setOpen(false);
      if (currentStepRef.current) {
        dismissedStepRef.current = currentStepRef.current.key;
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const currentStep = getCurrentStep();
  if (!currentStep) return null;

  const targetElement = currentStep.target();
  if (!targetElement) return null;

  const rect = targetElement.getBoundingClientRect();

  return createPortal(
    <Popover
      open={open}
      onOpenChange={(visible: boolean) => {
        if (!visible) {
          setOpen(false);
          dismissedStepRef.current = currentStep.key;
        }
      }}
      title={currentStep.title}
      content={currentStep.description}
      placement="top"
      trigger={[]}
      rootClassName="guide-popover"
    >
      <span
        style={{
          position: 'fixed',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />
    </Popover>,
    document.body,
  );
};

export default DevolucionCompraFormulario;

