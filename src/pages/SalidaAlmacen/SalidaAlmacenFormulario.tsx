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
  ExclamationCircleOutlined,
  EditOutlined,
  MoreOutlined,
  CalendarOutlined,
  HolderOutlined,
  BarcodeOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { salidaAlmacenApi } from '../../api/salidaAlmacenApi';
import { productoApi } from '../../api/productoApi';
import { parametrosApi } from '../../api/parametrosApi';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import ScannerModal from '../../components/ScannerModal/ScannerModal';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import PermissionGate from '../../components/PermissionGate';
import '../../components/FloatingLabel/FloatingField.css';
import type {
  ConceptoDTO, AlmacenDTO, SuplidorDTO,
  AsientoContableDTO,
} from '../../types/entradaAlmacen';
import type { UnidadMedidaDTO } from '../../types/productos';
import type { DetalleSalidaAlmacenDTO, SalidaAlmacenFullDTO } from '../../types/salidaAlmacen';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import LogTable from '../../components/LogTable';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { DragHandle, SortableRow, DragListenersContext } from '../../components/DragSortable';
import { SalidaAlmacenGuide } from './SalidaAlmacenGuide';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { formatCurrency, formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';

const { Text } = Typography;
const { TextArea } = Input;

// ===== Cálculo de fila para SAP (sin bonificable, sin flete) =====
function calcularFila(fila: DetalleSalidaAlmacenDTO): DetalleSalidaAlmacenDTO {
  const cantidad = fila.cantidad || 0;
  const costo = fila.costo || 0;
  const pctDesc = fila.porcentajeDescuento || 0;
  const pctImp = fila.porcentajeImpuesto || 0;

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

function filaVacia(): DetalleSalidaAlmacenDTO {
  return {
    id: 0,
    codigo: '',
    articulo: '',
    referencia: '',
    cantidad: 0,
    costo: 0,
    subTotal: 0,
    porcentajeDescuento: 0,
    descuento: 0,
    porcentajeImpuesto: 0,
    impuestos: 0,
    total: 0,
    tipoArticulo: 'Producto',
  };
}



// ===== Componente principal =====
const SalidaAlmacenFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const cloneData = (location.state as any)?.cloneData;
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const { screenCode, documentCode } = useScreenConfig('FSAP');
  const monedaDefault = getMonedaSucursalActiva();

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<SalidaAlmacenFullDTO | null>(null);
  const [detalles, setDetalles] = useState<DetalleSalidaAlmacenDTO[]>([]);
  const [suplidoresCache, setSuplidoresCache] = useState<SuplidorDTO[]>([]);
  const [almacenesCache, setAlmacenesCache] = useState<AlmacenDTO[]>([]);
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [selectedEntidad, setSelectedEntidad] = useState<SuplidorDTO | null>(null);
  const [selectedAlmacen, setSelectedAlmacen] = useState<AlmacenDTO | null>(null);
  const [conceptoInfo, setConceptoInfo] = useState<string>('');
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [fechaVencimientoModal, setFechaVencimientoModal] = useState<{ open: boolean; detalleId: number }>({ open: false, detalleId: 0 });
  const [medidasCache, setMedidasCache] = useState<UnidadMedidaDTO[]>([]);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [modoDescuento, setModoDescuento] = useState<'porcentaje' | 'pesos'>('porcentaje');
  const [verificados, setVerificados] = useState<Set<number>>(new Set());
  const [fechaCierreContable, setFechaCierreContable] = useState<string | null>(null);
  const [fechaCierreInventario, setFechaCierreInventario] = useState<string | null>(null);

  const editValuesRef = useRef<Record<string, any>>({});
  const tasaAnteriorRef = useRef<number>(1);
  const navigationConfirmedRef = useFormularioNavigation();

  // Refs para la guía
  const conceptoRef = useRef<HTMLDivElement>(null);
  const suplidorRef = useRef<HTMLDivElement>(null);
  const almacenRef = useRef<HTMLDivElement>(null);
  const agregarFilaRef = useRef<HTMLDivElement>(null);

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
      form.setFieldsValue({ [field]: editingValueRef.current });
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
  const refValue = Form.useWatch('referencia', form) || '';
  const tasaValue = Form.useWatch('tasa', form) ?? 1;

  const sinOC = true;
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
    const pageTitle = mode === 'crear' ? 'Nuevo Salida de Almacén' : 'Editar Salida de Almacén';
    setPageTitleOverride(pageTitle);

    const cleanup = () => {
      resetToolbar();
      setPageTitleOverride('');
    };

    // === Si viene de Clonar ===
    if (cloneData) {
      setDetalles((cloneData.detalles || []).map((d: DetalleSalidaAlmacenDTO) => calcularFila(d)));
      setSelectedConcepto(cloneData.concepto || null);
      setConceptoSearchText(`${cloneData.concepto?.codigo || ''} - ${toTitleCase(cloneData.concepto?.nombre || '')}`);
      setSelectedEntidad(cloneData.suplidor || cloneData.entidad || null);
      setSelectedAlmacen(cloneData.almacen || null);

      const fechaDoc = cloneData.fechaDocumento ? parseDateRaw(cloneData.fechaDocumento) : null;
      form.setFieldsValue({
        concepto: cloneData.concepto?.codigo || '',
        suplidor: cloneData.suplidor?.codigo || cloneData.entidad?.codigo || '',
        almacen: cloneData.almacen?.codigo || '',
        fechaDocumento: fechaDoc ? dayjs(fechaDoc) : dayjs(),
        fechaRecibo: cloneData.fechaRecibo ? dayjs(parseDateRaw(cloneData.fechaRecibo)) : dayjs(),
        ncf: cloneData.ncf || '',
        referencia: cloneData.referencia || '',
        moneda: cloneData.moneda?.nombre || '',
        tasa: cloneData.tasa || 1,
        nota: cloneData.nota || '',
      });
      return cleanup;
    }

    // Cargar almacenes
    salidaAlmacenApi.obtenerAlmacenes(sucursalActiva).then(setAlmacenesCache).catch(() => {});
    unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch(() => {});
    // Obtener fechas de cierre (contable e inventario)
    parametrosApi.obtenerFechaCierreInventario(sucursalActiva).then(setFechaCierreInventario).catch(() => {});
    parametrosApi.obtenerFechaCierreFiscal(sucursalActiva).then(setFechaCierreContable).catch(() => {});

    // Inicializar fechas en modo crear
    if (mode === 'crear') {
      form.setFieldsValue({
        fechaDocumento: dayjs(),
        fechaRecibo: dayjs(),
      });
    }

    return cleanup;
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, sucursalActiva, form, cloneData]);

  // ===== Cargar datos si es modo editar =====
  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;

    setLoading(true);
    salidaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setPageTitleOverride(`Editar - ${res.documento?.codigo || 'SAP'}-${res.noDocumento || ''}`);
        setDetalles((res.detalles || []).map((d: DetalleSalidaAlmacenDTO) => calcularFila(d)));
        setSelectedConcepto(res.concepto || null);
        setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
        setSelectedEntidad(res.suplidor || res.entidad || null);
        setSelectedAlmacen(res.almacen || null);

        const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;

        form.setFieldsValue({
          concepto: res.concepto?.codigo || '',
          suplidor: res.suplidor?.codigo || res.entidad?.codigo || '',
          almacen: res.almacen?.codigo || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          fechaRecibo: res.fechaRecibo
            ? dayjs(parseDateRaw(res.fechaRecibo))
            : null,
          ncf: res.ncf || '',
          referencia: res.referencia || '',
          moneda: res.moneda?.nombre || '',
          tasa: res.tasa || 1,
          nota: res.nota || '',
        });

        // Cargar suplidores según el concepto
        if (res.concepto?.codigo) {
          salidaAlmacenApi.obtenerSuplidores(sucursalActiva)
            .then(setSuplidoresCache)
            .catch(() => {});
        }
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        message.error(msg);
        setLoadingError(true);
        navigate('/FSAP');
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate]);

  // ===== Efecto para detectar cambios en la tasa y preguntar por actualización de costos =====
  useEffect(() => {
    const nuevaTasa = tasaValue;
    const tasaAnterior = tasaAnteriorRef.current;

    // Solo si cambió realmente y no es el valor inicial
    if (tasaAnterior !== nuevaTasa && tasaAnterior !== 1 && editingField === null) {
      Modal.confirm({
        title: 'Actualizar costos',
        icon: <ExclamationCircleOutlined />,
        content: `¿Desea actualizar los costos de los detalles en base a la nueva tasa (${tasaAnterior} → ${nuevaTasa})?`,
        onOk: () => {
          setDetalles((prev) =>
            prev.map((d) => {
              const costoActual = d.costo || 0;
              const nuevoCosto = Math.round((costoActual / nuevaTasa) * 100) / 100;
              return calcularFila({ ...d, costo: nuevoCosto });
            })
          );
          message.success('Costos actualizados correctamente');
        },
        onCancel: () => {
          // No hacer nada, solo mantener la tasa nueva sin actualizar costos
        },
      });
    }

    tasaAnteriorRef.current = nuevaTasa;
  }, [tasaValue, editingField]);

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
          navigate('/FSAP');
        } else {
          if (id) {
            setLoading(true);
    salidaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setPageTitleOverride(`Editar - ${res.documento?.codigo || 'SAP'}-${res.noDocumento || ''}`);
        setDetalles(res.detalles || []);
        setSelectedConcepto(res.concepto || null);
        setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
        setSelectedEntidad(res.suplidor || res.entidad || null);
        setSelectedAlmacen(res.almacen || null);

                const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;

                form.setFieldsValue({
                  concepto: res.concepto?.codigo || '',
                  suplidor: res.suplidor?.codigo || res.entidad?.codigo || '',
                  almacen: res.almacen?.codigo || '',
                  fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                  fechaRecibo: res.fechaRecibo
                    ? dayjs(parseDateRaw(res.fechaRecibo))
                    : null,
                  ncf: res.ncf || '',
                  referencia: res.referencia || '',
                  moneda: res.moneda?.nombre || '',
                  tasa: res.tasa || 1,
                  nota: res.nota || '',
                });

                if (res.concepto?.codigo) {
                  salidaAlmacenApi.obtenerSuplidores(sucursalActiva)
                    .then(setSuplidoresCache)
                    .catch(() => {});
                }
              })
              .catch((err: any) => {
                const msg = err?.response?.data?.errorMessage || 'Error al recargar el documento';
                message.error(msg);
              })
              .finally(() => setLoading(false));
          }
          navigationConfirmedRef.current = true;
          navigate(`/FSAP/${id}`);
        }
      },
    });
  };

  // Validación del formulario
  const validarFormulario = (): string | null => {
    const values = form.getFieldsValue();
    if (!selectedConcepto) return 'Debe elegir un Concepto para poder continuar';
    if (!selectedAlmacen && !values.almacen) return 'El almacén es requerido';
    if (suplidoresCache.length > 0 && !values.suplidor && !selectedEntidad) return 'El suplidor es requerido';
    if (detalles.length === 0) return 'No se puede crear un documento de SALIDA ALMACEN sin detalle.';
    if (!detalles.some((d) => (d.cantidad || 0) > 0)) return 'Debe tener al menos un detalle con cantidad > 0';

    // Validar fecha contra cierre contable e inventario (usar la mayor)
    const fechas: (string | null)[] = [fechaCierreContable, fechaCierreInventario];
    const fechasValidas = fechas.filter((f): f is string => f !== null);
    if (fechasValidas.length > 0) {
      const timestamps = fechasValidas.map((f) => {
        const d = parseDateRaw(f);
        return d ? dayjs(d).startOf('day').valueOf() : 0;
      }).filter((t) => t > 0);

      if (timestamps.length > 0) {
        const cierreMaxTs = Math.max(...timestamps);

        const fechaDoc = values.fechaDocumento;
        if (fechaDoc && dayjs(fechaDoc).startOf('day').valueOf() <= cierreMaxTs) {
          return 'La fecha del documento no puede ser menor o igual a la fecha de cierre (contable o de inventario)';
        }

        const fechaRec = values.fechaRecibo;
        if (fechaRec && dayjs(fechaRec).startOf('day').valueOf() <= cierreMaxTs) {
          return 'La fecha de recibo no puede ser menor o igual a la fecha de cierre (contable o de inventario)';
        }
      }
    }

    // Validar productos con vencimiento
    const sinVencimiento = detalles.filter((d) => d.tieneVencimiento && !d.fechaVencimiento);
    if (sinVencimiento.length > 0) {
      return `Los siguientes productos requieren fecha de vencimiento: ${sinVencimiento.map((d) => d.articulo).join(', ')}`;
    }

    return null;
  };

  // Construir DTO desde el formulario
  const construirDTO = (): SalidaAlmacenFullDTO => {
    const values = form.getFieldsValue();
    const base = data || {} as any;

    const entidadSel = suplidoresCache.find((e) => e.codigo === values.suplidor) || selectedEntidad;

    const fechaDoc = values.fechaDocumento
      ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
        ? toISOFormat(values.fechaDocumento.toDate())
        : values.fechaDocumento)
      : toISOFormat(new Date());

    const fechaRecibo = values.fechaRecibo
      ? (typeof values.fechaRecibo === 'object' && values.fechaRecibo.toDate
          ? toISOFormat(values.fechaRecibo.toDate())
          : values.fechaRecibo)
      : undefined;

    const totalSub = detalles.reduce((s, d) => s + (d.subTotal || 0), 0);
    const totalDesc = detalles.reduce((s, d) => s + (d.descuento || 0), 0);
    const totalImp = detalles.reduce((s, d) => s + (d.impuestos || 0), 0);
    const total = detalles.reduce((s, d) => s + (d.total || 0), 0);

    return {
      id: base.id || 0,
      fechaDocumento: fechaDoc,
      fechaRecibo,
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
      documento: base.documento || { codigo: documentCode },
      concepto: selectedConcepto || { nombre: '', codigo: '' },
      moneda: base.moneda || getMonedaSucursalActiva(),
      almacen: selectedAlmacen || { nombre: '', codigo: '' },
      suplidor: entidadSel || { nombre: '', codigo: '', identificacion: '' },
      entidad: entidadSel
        ? { nombre: entidadSel.nombre, codigo: entidadSel.codigo, identificacion: entidadSel.identificacion || '', telefono: entidadSel.telefono, direccion: entidadSel.direccion }
        : { nombre: '', codigo: '', identificacion: '' },
      detalles: detalles.map((d) => calcularFila(d)),
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
        const result = await salidaAlmacenApi.crear(sucursalActiva, dto);
        message.success('Salida de almacén creada exitosamente');
        navigationConfirmedRef.current = true;
        navigate(`/FSAP/${result.id}`);
      } else {
        await salidaAlmacenApi.actualizar(sucursalActiva, dto);
        message.success('Salida de almacén actualizada exitosamente');
        navigationConfirmedRef.current = true;
        navigate(`/FSAP/${id}`);
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== Handlers de concepto =====
  const handleConceptoSelect = (concepto: ConceptoDTO) => {
    setSelectedConcepto(concepto);
    setConceptoSearchText(`${concepto.codigo || ''} - ${toTitleCase(concepto.nombre)}`);
    setEditingField(null);
    form.setFieldsValue({ concepto: concepto.codigo });

    // Cargar suplidores
    salidaAlmacenApi.obtenerSuplidores(sucursalActiva)
      .then((ents) => setSuplidoresCache(ents))
      .catch(() => {});

    // Mostrar avisos si el concepto tiene flags especiales
    const infoParts: string[] = [];
    if (concepto.noImpuesto) infoParts.push(' * No Impuestos * ');
    if (concepto.noAsientos) infoParts.push(' * No Asientos * ');
    if (concepto.activo === false) infoParts.push(' * Concepto Inactivo * ');
    if (concepto.noActualizaCostos) infoParts.push(' * No Actualiza Costos * ');
    setConceptoInfo(infoParts.join(''));

    // Si el concepto es NoImpuesto y hay detalles con impuestos, limpiarlos
    if (concepto.noImpuesto && detalles.some((d) => (d.porcentajeImpuesto || 0) > 0)) {
      message.warning('El Concepto no acepta Impuestos, por lo que serán eliminados.');
      setDetalles((prev) =>
        prev.map((d) => calcularFila({ ...d, porcentajeImpuesto: 0 }))
      );
    }

    // === ConfigurarMoneda ===
    const monedaObj = concepto.moneda || getMonedaSucursalActiva();
    form.setFieldsValue({
      moneda: monedaObj.nombre,
      tasa: monedaObj.tasa ?? 1,
    });
    // Actualizar data local para que la UI lo refleje
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, moneda: monedaObj };
    });

    // === Auto-asignar almacén del concepto ===
    if (concepto.almacen?.codigo) {
      const al = almacenesCache.find(a => a.codigo === concepto.almacen!.codigo);
      if (al) {
        setSelectedAlmacen(al);
        form.setFieldsValue({ almacen: al.codigo });
      }
    }
  };

  const handleConceptoSearchClick = () => {
    // Usamos el mismo modal inline que el del listado de conceptos
    setConceptoModalOpen(true);
  };

  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
  const [conceptoSearchText, setConceptoSearchText] = useState('');

  const handleConceptoClear = () => {
    setSelectedConcepto(null);
    setConceptoSearchText('');
    setSuplidoresCache([]);
    form.setFieldsValue({ concepto: '', suplidor: undefined });
  };

  const handleRefresh = useCallback(() => {
    if (mode === 'crear') return;
    if (!id) return;
    setLoadingError(false);
    setLoading(true);
    salidaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setPageTitleOverride(`Editar - ${res.documento?.codigo || 'SAP'}-${res.noDocumento || ''}`);
        setDetalles((res.detalles || []).map((d: DetalleSalidaAlmacenDTO) => calcularFila(d)));
        setSelectedConcepto(res.concepto || null);
        setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
        setSelectedEntidad(res.suplidor || res.entidad || null);
        setSelectedAlmacen(res.almacen || null);

        const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
        form.setFieldsValue({
          concepto: res.concepto?.codigo || '',
          suplidor: res.suplidor?.codigo || res.entidad?.codigo || '',
          almacen: res.almacen?.codigo || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          fechaRecibo: res.fechaRecibo ? dayjs(parseDateRaw(res.fechaRecibo)) : null,
          ncf: res.ncf || '',
          referencia: res.referencia || '',
          moneda: res.moneda?.nombre || '',
          tasa: res.tasa || 1,
          nota: res.nota || '',
        });
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, form, mode]);

  // ===== Handlers de detalles =====
  const handleAgregarFila = () => {
    setDetalles((prev) => [{ ...filaVacia(), id: -(prev.length + 1) }, ...prev]);
  };

  const handleEliminarFila = (id: number) => {
    Modal.confirm({
      title: 'Eliminar detalle',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro de eliminar este detalle?',
      okText: 'Sí',
      cancelText: 'No',
      okButtonProps: { danger: true },
      onOk: () => {
        setDetalles((prev) => prev.filter((d) => d.id !== id));
      },
    });
  };

  const handleDetalleUpdateValue = (id: number, field: string, value: any) => {
    setDetalles((prev) =>
      prev.map((d) => (d.id !== id ? d : { ...d, [field]: value }))
    );
  };

  const handleDetalleCalculate = (id: number, field: string, value: any) => {
    setDetalles((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        if (field === 'descuento') {
          const subTotal = (d.cantidad || 0) * (d.costo || 0);
          const pctCalculado = subTotal > 0 ? Math.round((Number(value) / subTotal) * 100 * 100) / 100 : 0;
          const updated = { ...d, descuento: Number(value), porcentajeDescuento: pctCalculado };
          return calcularFila(updated);
        }
        const updated = { ...d, [field]: value };
        return calcularFila(updated);
      })
    );
  };

  const handleProductoSelect = (producto: any) => {
    // Buscar la primera fila vacía (sin código) y llenarla
    const filaVaciaIdx = detalles.findIndex((d) => !d.codigo);
    if (filaVaciaIdx === -1) {
      // Agregar nueva fila
      const nuevaFila = filaVacia();
      const nuevoId = -(detalles.length + 1);
      setDetalles((prev) => {
        const filled: DetalleSalidaAlmacenDTO = {
          ...nuevaFila,
          id: nuevoId,
          codigo: producto.codigo,
          articulo: producto.articulo,
          referencia: producto.referencia || '',
          costo: producto.costo || 0,
          familia: producto.familia,
          medida: producto.medida,
          impuesto: producto.impuesto,
          porcentajeImpuesto: producto.impuesto?.porcentaje || 0,
          tieneVencimiento: producto.tieneVencimiento,
        };
        return [calcularFila(filled), ...prev];
      });
    } else {
      setDetalles((prev) =>
        prev.map((d) => {
          if (d.id !== detalles[filaVaciaIdx].id) return d;
          const filled: DetalleSalidaAlmacenDTO = {
            ...d,
            codigo: producto.codigo,
            articulo: producto.articulo,
            referencia: producto.referencia || '',
            costo: producto.costo || 0,
            familia: producto.familia,
            medida: producto.medida,
            impuesto: producto.impuesto,
            porcentajeImpuesto: producto.impuesto?.porcentaje || 0,
            tieneVencimiento: producto.tieneVencimiento,
          };
          return calcularFila(filled);
        })
      );
    }
  };

  const handleScannerProducto = (producto: any) => {
    const nuevaFila = filaVacia();
    const nuevoId = -(detalles.length + 1);
    setDetalles((prev) => {
      const filled: DetalleSalidaAlmacenDTO = {
        ...nuevaFila,
        id: nuevoId,
        codigo: producto.codigo,
        articulo: producto.articulo,
        referencia: producto.referencia || '',
        costo: producto.costo || 0,
        cantidad: producto.cantidad || 1,
        familia: producto.familia,
        medida: producto.medida,
      };
      return [calcularFila(filled), ...prev];
    });
  };

  const handleToggleVerificar = (id: number) => {
    setVerificados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
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
      render: (_: any, record: DetalleSalidaAlmacenDTO) => {
        const verificado = verificados.has(record.id);
        return (
          <div style={{ fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{record.codigo || '-'}</span>
              {verificado ? (
                <CheckCircleFilled style={{ color: '#4fc3f7', fontSize: 14 }} />
              ) : null}
            </div>
            {record.referencia && (
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5 }}>
                {record.referencia}
              </div>
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
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13 }}>
          <div>{toTitleCase(record.articulo || '')}</div>
          <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }}>
            {record.familia?.nombre ? <Tag style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>{toTitleCase(record.familia.nombre)}</Tag> : null}
            {record.fechaVencimiento && <span>V: {formatDate(record.fechaVencimiento)}</span>}
          </div>
        </div>
      ),
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 100,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      shouldCellUpdate: (record: DetalleSalidaAlmacenDTO, prevRecord: DetalleSalidaAlmacenDTO) =>
        record.cantidad !== prevRecord.cantidad || record.medida?.nombre !== prevRecord.medida?.nombre,
      render: (_: any, _record: DetalleSalidaAlmacenDTO, idx: number) => (
        <div>
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            styles={{ input: { textAlign: 'right' } }}
            min={0}
            step={0.01}
            precision={2}
            controls={false}
            defaultValue={detalles[idx]?.cantidad}
            onChange={(val) => { editValuesRef.current[`${detalles[idx].id}_cantidad`] = val || 0; }}
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
      shouldCellUpdate: (record: DetalleSalidaAlmacenDTO, prevRecord: DetalleSalidaAlmacenDTO) => record.costo !== prevRecord.costo || record.porcentajeDescuento !== prevRecord.porcentajeDescuento || record.cantidad !== prevRecord.cantidad || record.medida?.factor !== prevRecord.medida?.factor,
      render: (_: any, record: DetalleSalidaAlmacenDTO, idx: number) => {
        const costoBase = Number(detalles[idx]?.costo) || 0;
        const pctDesc = Number(detalles[idx]?.porcentajeDescuento) || 0;
        const factor = Number(detalles[idx]?.medida?.factor) || 1;
        const costoConDescuento = costoBase - ((costoBase * pctDesc) / 100);
        const costoUnitario = costoConDescuento / factor;
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
              defaultValue={detalles[idx]?.costo}
              onChange={(val) => { editValuesRef.current[`${detalles[idx].id}_costo`] = val || 0; }}
              onBlur={() => { const val = editValuesRef.current[`${detalles[idx].id}_costo`] ?? (detalles[idx]?.costo || 0); handleDetalleCalculate(detalles[idx].id, 'costo', val); }}
              onPressEnter={() => { const val = editValuesRef.current[`${detalles[idx].id}_costo`] ?? (detalles[idx]?.costo || 0); handleDetalleCalculate(detalles[idx].id, 'costo', val); }}
            />
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
      render: (_: any, _record: DetalleSalidaAlmacenDTO, idx: number) =>
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
                onChange={(val) => { editValuesRef.current[`${detalles[idx].id}_descuento`] = val || 0; }}
                onBlur={() => { const val = editValuesRef.current[`${detalles[idx].id}_descuento`] ?? detalles[idx]?.porcentajeDescuento; handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', val); }}
                onPressEnter={() => { const val = editValuesRef.current[`${detalles[idx].id}_descuento`] ?? detalles[idx]?.porcentajeDescuento; handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', val); }}
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
                onChange={(val) => { editValuesRef.current[`${detalles[idx].id}_descuento_pesos`] = val || 0; }}
                onBlur={() => { const val = editValuesRef.current[`${detalles[idx].id}_descuento_pesos`] ?? detalles[idx]?.descuento; handleDetalleCalculate(detalles[idx].id, 'descuento', val); }}
                onPressEnter={() => { const val = editValuesRef.current[`${detalles[idx].id}_descuento_pesos`] ?? detalles[idx]?.descuento; handleDetalleCalculate(detalles[idx].id, 'descuento', val); }}
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
      render: (_: any, record: DetalleSalidaAlmacenDTO) => (
        <div>
          <Text>{formatNumber(record.subTotal || 0)}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
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
      render: (_: any, record: DetalleSalidaAlmacenDTO) => (
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
      render: (_: any, record: DetalleSalidaAlmacenDTO) => (
        <div>
          <Text strong>{formatNumber(record.total || 0)}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 50,
      onCell: () => ({ style: { paddingRight: 8 } }),
      render: (_: any, _record: DetalleSalidaAlmacenDTO, idx: number) => {
        const verificado = verificados.has(detalles[idx].id);
        const items = [
          {
            key: 'eliminar',
            label: 'Eliminar',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleEliminarFila(detalles[idx].id),
          },
        ];

        items.unshift({
          key: 'verificar',
          label: verificado ? 'Desverificar' : 'Verificar',
          icon: <CheckCircleOutlined style={{ color: verificado ? '#4fc3f7' : undefined }} />,
          danger: false,
          onClick: () => handleToggleVerificar(detalles[idx].id),
        });

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

  // ===== Encabezado del formulario =====
  const renderEncabezado = () => (
    <Card className="paces-card" size="small" title="Datos Generales" extra={<EstadoTag estado={estado} periodo={data?.periodo} />} style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={24} xxl={18}>
          <Form form={form} layout="vertical" size="middle" style={{ paddingTop: 24 }}>
            <Row gutter={[16, 24]}>
          {/* Fila 1: Fecha Documento + Concepto */}
          <Col xs={24} sm={12} lg={9}>
            <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }}>
              <FloatingField label="Fecha Documento" required>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </FloatingField>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={15}>
            <div ref={conceptoRef}>
              <FloatingField label="Concepto" required externalValue={conceptoSearchText}>
                <Input
                  placeholder=" "
                  value={conceptoSearchText}
                  readOnly
                  suffix={<SearchOutlined style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }} />}
                  onClick={handleConceptoSearchClick}
                />
              </FloatingField>
            </div>
            <Form.Item name="concepto" hidden><Input /></Form.Item>
          </Col>

          {conceptoInfo && (
            <Col xs={24}>
              <Text type="warning" style={{ fontSize: 12 }}>{conceptoInfo}</Text>
            </Col>
          )}

          {/* Fila 2: Fecha Recibo + Almacén */}
          <Col xs={24} sm={12} lg={9}>
            <Form.Item name="fechaRecibo" style={{ marginBottom: 0 }}>
              <FloatingField label="Fecha Recibo">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </FloatingField>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={15}>
            <Form.Item name="almacen" required style={{ marginBottom: 0 }}>
              <FloatingField label="Almacén" required ref={almacenRef}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="children"
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

          {/* Fila 3: Suplidor */}
          <Col xs={24}>
            <Form.Item name="suplidor" required style={{ marginBottom: 0 }}>
              <FloatingField label="Suplidor / Entidad" required ref={suplidorRef}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="children"
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
          </Col>

          {/* Fila 4: Campos rápidos (Referencia, Tasa, Moneda) */}
          <Col xs={24}>
            <div style={{ marginBottom: 16 }}>
              <Space size={[8, 8]} wrap>
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
            {/* Hidden form items para campos rápidos */}
            <Form.Item name="referencia" hidden><Input /></Form.Item>
            <Form.Item name="tasa" hidden><InputNumber /></Form.Item>
            <Form.Item name="moneda" hidden><Input /></Form.Item>
          </Col>

          {/* Fila 5: Nota */}
          <Col xs={24}>
            <Form.Item name="nota" style={{ marginBottom: 0 }}>
              <FloatingField label="Nota">
                <TextArea rows={3} />
              </FloatingField>
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

      {loadingError && (
        <Alert
          message="Error al cargar formulario de salida de almacén"
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
        documento="SAP"
      />
      <BuscarProductoModal
        open={productoModalOpen}
        onClose={() => setProductoModalOpen(false)}
        onSelect={handleProductoSelect}
        mode="inventario"
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
                          <Button type="primary" icon={<PlusOutlined />} onClick={() => setProductoModalOpen(true)}>
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
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setProductoModalOpen(true)}>
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
        <SalidaAlmacenGuide
          mode={mode}
          concepto={selectedConcepto}
          suplidor={selectedEntidad}
          almacen={selectedAlmacen}
          detallesCount={detalles.length}
          conceptoRef={conceptoRef}
          suplidorRef={suplidorRef}
          almacenRef={almacenRef}
          agregarFilaRef={agregarFilaRef}
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



export default SalidaAlmacenFormulario;

