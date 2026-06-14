import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Dropdown, Alert, Popover, Empty,
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
} from '@ant-design/icons';
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import dayjs from 'dayjs';
import { DragHandle, SortableRow } from '../../components/DragSortable';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { facturaSuplidorApi } from '../../api/facturaSuplidorApi';
import { productoApi } from '../../api/productoApi';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import { BuscarEntradaModal } from '../../components/BuscarEntradaModal';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import type {
  ConceptoDTO, SuplidorDTO,
} from '../../types/entradaAlmacen';
import type { UnidadMedidaDTO } from '../../types/productos';
import type {
  DetalleFacturaSuplidorDTO, FacturaSuplidorFullDTO, TipoDTO,
} from '../../types/facturaSuplidor';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import LogTable from '../../components/LogTable';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import ImpuestosFacturaEditables from '../../components/ImpuestosFacturaEditables';

import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { formatCurrency, formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';

const { Text } = Typography;
const { TextArea } = Input;

// ===== Cálculo de fila FRDE =====
function calcularFila(fila: DetalleFacturaSuplidorDTO): DetalleFacturaSuplidorDTO {
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
  const monedaDefault = getMonedaSucursalActiva();

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<FacturaSuplidorFullDTO | null>(null);
  const [detalles, setDetalles] = useState<DetalleFacturaSuplidorDTO[]>([]);
  const [suplidoresCache, setSuplidoresCache] = useState<SuplidorDTO[]>([]);
  const [tiposCache, setTiposCache] = useState<TipoDTO[]>([]);
  const [selectedTipo, setSelectedTipo] = useState<TipoDTO | null>(null);
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [conceptoSearchText, setConceptoSearchText] = useState('');
  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
  const [selectedEntidad, setSelectedEntidad] = useState<SuplidorDTO | null>(null);
  const [selectedEntrada, setSelectedEntrada] = useState<any>(null);
  const [conceptoInfo, setConceptoInfo] = useState<string>('');
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [entradaModalOpen, setEntradaModalOpen] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [fechaVencimientoModal, setFechaVencimientoModal] = useState<{ open: boolean; detalleId: number }>({ open: false, detalleId: 0 });
  const [medidasCache, setMedidasCache] = useState<UnidadMedidaDTO[]>([]);
  const [sucursalesCache, setSucursalesCache] = useState<any[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState<any>(null);
  const [asientosLocales, setAsientosLocales] = useState<any[]>([]);
  const [impuestosFactura, setImpuestosFactura] = useState<any[]>([]);

  // Refs para la guía
  const tipoRef = useRef<HTMLDivElement>(null);
  const conceptoRef = useRef<HTMLDivElement>(null);
  const suplidorRef = useRef<HTMLDivElement>(null);
  const agregarFilaRef = useRef<HTMLDivElement>(null);
  const ncfRef = useRef<HTMLDivElement>(null);

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

  // ===== Determinar estado =====
  const estado = data?.estado ?? 0;
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
    facturaSuplidorApi.obtenerTipos(sucursalActiva).then(setTiposCache).catch(() => {});
    unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch(() => {});

    // Cargar sucursales desde el auth store
    const authSucursales = useAuthStore.getState().sucursalesPermitidas;
    if (authSucursales.length > 0) {
      setSucursalesCache(authSucursales);
    }

    // Inicializar fecha en modo crear
    if (mode === 'crear') {
      form.setFieldsValue({
        fechaDocumento: dayjs(),
        fechaVencimiento: dayjs(),
        fechaEntrega: dayjs(),
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
        setImpuestosFactura(res.impuestosFactura || []);
        setSelectedTipo(res.tipo || null);
        setSelectedConcepto(res.concepto || null);
        setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
        setSelectedEntidad(res.suplidor || res.entidad || null);
        setSelectedEntrada(res.entradaAlmacen || null);

        const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;

        form.setFieldsValue({
          tipo: res.tipo?.codigo || '',
          concepto: res.concepto?.codigo || '',
          suplidor: res.suplidor?.codigo || res.entidad?.codigo || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          fechaVencimiento: res.fechaVencimiento ? dayjs(parseDateRaw(res.fechaVencimiento)) : null,
          fechaEntrega: res.fechaEntrega ? dayjs(parseDateRaw(res.fechaEntrega)) : null,
          ncf: res.ncf || '',
          referencia: res.referencia || '',
          diasCredito: res.diasCredito || 0,
          moneda: res.moneda?.nombre || '',
          tasa: res.tasa || 1,
          nota: res.nota || '',
        });

        // Cargar suplidores
        facturaSuplidorApi.obtenerSuplidores(sucursalActiva)
          .then(setSuplidoresCache)
          .catch(() => {});

        // Restaurar sucursal
        if (res.sucursal) {
          setSelectedSucursal(res.sucursal);
        }
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        message.error(msg);
        setLoadingError(true);
        navigate('/FRDE');
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate]);

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
          navigate('/FRDE');
        } else {
          if (id) {
            setLoading(true);
            facturaSuplidorApi.obtenerPorId(sucursalActiva, parseInt(id))
              .then((_res) => {
                const res = _res as any;
                setData(res);
                setDetalles(res.detalles || []);
                setAsientosLocales(res.asientos || []);
                setImpuestosFactura(res.impuestosFactura || []);
                setSelectedTipo(res.tipo || null);
                setSelectedConcepto(res.concepto || null);
                setSelectedEntidad(res.suplidor || res.entidad || null);
                setSelectedEntrada(res.entradaAlmacen || null);

                const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;

                form.setFieldsValue({
                  tipo: res.tipo?.codigo || '',
                  concepto: res.concepto?.codigo || '',
                  suplidor: res.suplidor?.codigo || res.entidad?.codigo || '',
                  fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                  fechaVencimiento: res.fechaVencimiento ? dayjs(parseDateRaw(res.fechaVencimiento)) : null,
                  fechaEntrega: res.fechaEntrega ? dayjs(parseDateRaw(res.fechaEntrega)) : null,
                  ncf: res.ncf || '',
                  referencia: res.referencia || '',
                  diasCredito: res.diasCredito || 0,
                  moneda: res.moneda?.nombre || '',
                  tasa: res.tasa || 1,
                  nota: res.nota || '',
                });

                if (res.tipo?.idExterno) {
                  setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
                }
                facturaSuplidorApi.obtenerSuplidores(sucursalActiva)
                  .then(setSuplidoresCache)
                  .catch(() => {});
              })
              .catch((err: any) => {
                const msg = err?.response?.data?.errorMessage || 'Error al recargar el documento';
                message.error(msg);
              })
              .finally(() => setLoading(false));
          }
          navigate(`/FRDE/${id}`);
        }
      },
    });
  };

  // ===== Validación del formulario =====
  const validarFormulario = (): string | null => {
    const values = form.getFieldsValue();
    if (!selectedTipo) return 'Debe seleccionar un Tipo de Documento.';
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

    // Validar fecha entrega â‰¤ fecha doc
    const fechaEntrega = values.fechaEntrega;
    if (fechaDoc && dayjs.isDayjs(fechaDoc) && fechaEntrega && dayjs.isDayjs(fechaEntrega)) {
      if (fechaEntrega.isAfter(fechaDoc, 'day')) {
        return 'La fecha de entrega no puede ser mayor a la fecha del documento.';
      }
    }

    // Validar asientos cuadrados si existen
    const asientosAValidar = asientosLocales.length > 0 ? asientosLocales : (data?.asientos || []);
    if (asientosAValidar.length > 0) {
      const totalDebitos = asientosAValidar.reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
      const totalCreditos = asientosAValidar.reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);
      if (Math.abs(totalDebitos - totalCreditos) > 0.01) {
        return 'Los asientos contables no estÃ¡n cuadrados. Los dÃ©bitos deben ser igual a los crÃ©ditos.';
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

    const fechaVenc = values.fechaVencimiento
      ? (typeof values.fechaVencimiento === 'object' && values.fechaVencimiento.toDate
          ? toISOFormat(values.fechaVencimiento.toDate())
          : values.fechaVencimiento)
      : undefined;

    const fechaEnt = values.fechaEntrega
      ? (typeof values.fechaEntrega === 'object' && values.fechaEntrega.toDate
          ? toISOFormat(values.fechaEntrega.toDate())
          : values.fechaEntrega)
      : undefined;

    const totalSub = detalles.reduce((s, d) => s + (d.subTotal || 0), 0);
    const totalDesc = detalles.reduce((s, d) => s + (d.descuento || 0), 0);
    const totalImp = detalles.reduce((s, d) => s + (d.impuestos || 0), 0);
    const total = detalles.reduce((s, d) => s + (d.total || 0), 0);

    return {
      id: base.id || 0,
      fechaDocumento: fechaDoc,
      fechaVencimiento: fechaVenc || '',
      fechaEntrega: fechaEnt || '',
      noDocumento: base.noDocumento || '',
      estado: base.estado || 0,
      periodo: base.periodo || new Date().getMonth() + 1,
      ncf: values.ncf || '',
      referencia: values.referencia || '',
      nota: values.nota || '',
      subTotal: Math.round(totalSub * 100) / 100,
      descuento: Math.round(totalDesc * 100) / 100,
      impuestos: Math.round(totalImp * 100) / 100,
      retenciones: base.retenciones || 0,
      total: Math.round(total * 100) / 100,
      tasa: values.tasa || 1,
      diasCredito: values.diasCredito || 0,
      documento: base.documento || { codigo: documentCode },
      concepto: selectedConcepto || { nombre: '', codigo: '' },
      moneda: base.moneda || getMonedaSucursalActiva(),
      suplidor: entidadSel || { nombre: '', codigo: '', identificacion: '' },
      entidad: entidadSel
        ? { nombre: entidadSel.nombre, codigo: entidadSel.codigo, identificacion: entidadSel.identificacion || '', telefono: entidadSel.telefono, direccion: entidadSel.direccion }
        : { nombre: '', codigo: '', identificacion: '' },
      tipo: selectedTipo || null,
      entradaAlmacen: selectedEntrada || null,
      sucursal: selectedSucursal || base.sucursal || { nombre: '', codigo: '', identificacion: '' },
      detalles: detalles.map((d) => calcularFila(d)),
      asientos: asientosLocales.length > 0 ? asientosLocales : (base.asientos || []),
      impuestosFactura: impuestosFactura,
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
        // Si falla la verificaciÃ³n, continuar
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
        navigate(`/FRDE/${result.id}`);
      } else {
        await facturaSuplidorApi.actualizar(sucursalActiva, dto);
        message.success('Factura de suplidor actualizada exitosamente');
        navigate(`/FRDE/${id}`);
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
    setConceptoInfo('');
    form.setFieldsValue({ concepto: '' });
  };

  const handleTipoClear = () => {
    setSelectedTipo(null);
    setSelectedConcepto(null);
    setConceptoSearchText('');
    setConceptoInfo('');
    form.setFieldsValue({ tipo: '', concepto: '' });
  };

  // ===== Handlers de Concepto =====
  const handleConceptoSelect = (concepto: ConceptoDTO) => {
    setSelectedConcepto(concepto);
    setConceptoSearchText(`${concepto.codigo || ''} - ${toTitleCase(concepto.nombre)}`);
    setEditingField(null);
    form.setFieldsValue({ concepto: concepto.codigo });

    // Cargar suplidores
    facturaSuplidorApi.obtenerSuplidores(sucursalActiva)
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
    if (concepto.noImpuesto && detalles.some((d) => (d.impuesto?.porcentaje || 0) > 0)) {
      message.warning('El Concepto no acepta Impuestos, por lo que serÃ¡n eliminados.');
      setDetalles((prev) =>
        prev.map((d) => calcularFila({ ...d, impuesto: undefined }))
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
            familia: d.familia,
            medida: d.medida,
            impuesto: d.impuesto,
            tieneVencimiento: d.tieneVencimiento,
          }));
          setDetalles(nuevosDetalles.map((d: DetalleFacturaSuplidorDTO) => calcularFila(d)));
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
              familia: d.familia,
              medida: d.medida,
              impuesto: d.impuesto,
              tieneVencimiento: d.tieneVencimiento,
            }));
            setDetalles(nuevosDetalles.map((d: DetalleFacturaSuplidorDTO) => calcularFila(d)));
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
      form.setFieldsValue({ suplidor: entrada.suplidor.codigo });
    }
  };

  const handleEntradaClear = () => {
    setSelectedEntrada(null);
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
    setDetalles((prev) =>
      prev.map((d) => {
        if (d.id !== idFila) return d;
        const updated = { ...d, [field]: value };
        return calcularFila(updated);
      })
    );
  };

  const handleProductoSelect = (producto: any) => {
    const filaVaciaIdx = detalles.findIndex((d) => !d.codigo);
    if (filaVaciaIdx === -1) {
      const nuevaFila = filaVacia();
      const nuevoId = -(detalles.length + 1);
      setDetalles((prev) => {
        const filled: DetalleFacturaSuplidorDTO = {
          ...nuevaFila,
          id: nuevoId,
          codigo: producto.codigo,
          articulo: producto.articulo,
          referencia: producto.referencia || '',
          costo: producto.costo || 0,
          familia: producto.familia,
          medida: producto.medida,
          impuesto: producto.impuesto,
          tieneVencimiento: producto.tieneVencimiento,
        };
        return [calcularFila(filled), ...prev];
      });
    } else {
      setDetalles((prev) =>
        prev.map((d) => {
          if (d.id !== detalles[filaVaciaIdx].id) return d;
          const filled: DetalleFacturaSuplidorDTO = {
            ...d,
            codigo: producto.codigo,
            articulo: producto.articulo,
            referencia: producto.referencia || '',
            costo: producto.costo || 0,
            familia: producto.familia,
            medida: producto.medida,
            impuesto: producto.impuesto,
            tieneVencimiento: producto.tieneVencimiento,
          };
          return calcularFila(filled);
        })
      );
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

  // ===== Funciones auxiliares para asientos =====
  function esDebito(tipo: any): boolean { return tipo === 'D' || tipo === 0; }
  function esCredito(tipo: any): boolean { return tipo === 'C' || tipo === 1; }

  // ===== Loading state =====
  if (loading) {
    return <LoadingSpinner mensaje="Cargando documento..." />;
  }

  // ===== Estado info =====
  const estadoInfo = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Borrador', color: 'default' };

  // ===== Encabezado del formulario =====
  const renderEncabezado = () => (
    <Card className="paces-card" size="small" title="Datos Generales" extra={<EstadoTag estado={estado} periodo={data?.periodo} />} style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={24} xxl={18}>
          <Form form={form} layout="vertical" size="middle" style={{ paddingTop: 24 }}>
        <Row gutter={[16, 24]}>
          {/* Fila 1: Tipo + Concepto + Suplidor */}
          <Col xs={24} sm={12} lg={8}>
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
                          {toTitleCase(t.nombre)}
                        </Select.Option>
                      ))}
                    </Select>
                  </FloatingField>
                </Form.Item>
              </div>
            </div>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <div ref={conceptoRef} style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
              <div style={{ flex: 1 }}>
                <FloatingField label="Concepto" required externalValue={conceptoSearchText}>
                  <Input
                    placeholder=" "
                    value={conceptoSearchText}
                    readOnly
                    disabled={!selectedTipo}
                    suffix={
                      <Space size={4}>
                        <SearchOutlined onClick={() => setConceptoModalOpen(true)} style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }} />
                        {selectedConcepto && <ClearOutlined onClick={handleConceptoClear} style={{ cursor: 'pointer' }} />}
                      </Space>
                    }
                    onClick={() => setConceptoModalOpen(true)}
                  />
                </FloatingField>
              </div>
            </div>
            <Form.Item name="concepto" hidden><Input /></Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={8}>
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

          {conceptoInfo && (
            <Col xs={24}>
              <Text type="warning" style={{ fontSize: 12 }}>{conceptoInfo}</Text>
            </Col>
          )}

          {/* Fila 2: Fecha Doc + Fecha Vencimiento + Fecha Entrega */}
          <Col xs={24} sm={12} lg={8}>
            <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }}>
              <FloatingField label="Fecha Documento" required>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </FloatingField>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Form.Item name="fechaVencimiento" style={{ marginBottom: 0 }}>
              <FloatingField label="Fecha Vencimiento">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </FloatingField>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Form.Item name="fechaEntrega" style={{ marginBottom: 0 }}>
              <FloatingField label="Fecha Entrega">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </FloatingField>
            </Form.Item>
          </Col>

          {/* Fila 3: Entrada Referencia + Días Crédito */}
          <Col xs={24} sm={12} lg={8}>
            <FloatingField label="Entrada Almacén de Referencia">
              <Input
                placeholder=" "
                value={selectedEntrada?.documento || ''}
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
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Form.Item name="diasCredito" style={{ marginBottom: 0 }}>
              <FloatingField label="Días Crédito">
                <InputNumber style={{ width: '100%' }} min={0} precision={0} placeholder=" " />
              </FloatingField>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={8}>
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
          </Col>

          {/* Fila 4: Botones rápidos para campos opcionales */}
          <Col xs={24}>
            <div style={{ marginBottom: 16 }}>
              <Space size={[8, 8]} wrap>
                <div ref={ncfRef}>
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
                      <Tag style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => openFieldEditor('ncf')}>
                        NCF: {ncfValue} <EditOutlined />
                      </Tag>
                    ) : (
                      <Tag style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => openFieldEditor('ncf')}>
                        <PlusOutlined /> NCF
                      </Tag>
                    )}
                  </div>
                </div>

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
                  <Tag style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => openFieldEditor('referencia')}>
                    Ref: {refValue} <EditOutlined />
                  </Tag>
                ) : (
                  <Tag style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => openFieldEditor('referencia')}>
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
                  <Tag style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => openFieldEditor('tasa')}>
                    Tasa: {tasaValue} <EditOutlined />
                  </Tag>
                ) : (
                  <Tag style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => openFieldEditor('tasa')}>
                    <PlusOutlined /> Tasa
                  </Tag>
                )}
              </Space>
            </div>
            {/* Hidden form items para campos rápidos */}
            <Form.Item name="ncf" hidden><Input /></Form.Item>
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
      shouldCellUpdate: (record: DetalleFacturaSuplidorDTO, prevRecord: DetalleFacturaSuplidorDTO) =>
        record.cantidad !== prevRecord.cantidad || record.medida?.nombre !== prevRecord.medida?.nombre,
      render: (_: any, _record: DetalleFacturaSuplidorDTO, idx: number) => (
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
            onChange={(val) => handleDetalleUpdateValue(detalles[idx].id, 'cantidad', val || 0)}
            onBlur={() => handleDetalleCalculate(detalles[idx].id, 'cantidad', detalles[idx]?.cantidad || 0)}
            onPressEnter={() => handleDetalleCalculate(detalles[idx].id, 'cantidad', detalles[idx]?.cantidad || 0)}
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
      shouldCellUpdate: (record: DetalleFacturaSuplidorDTO, prevRecord: DetalleFacturaSuplidorDTO) => record.costo !== prevRecord.costo || record.porcentajeDescuento !== prevRecord.porcentajeDescuento || record.cantidad !== prevRecord.cantidad || record.medida?.factor !== prevRecord.medida?.factor,
      render: (_: any, record: DetalleFacturaSuplidorDTO, idx: number) => {
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
              value={detalles[idx]?.costo}
              onChange={(val) => handleDetalleUpdateValue(detalles[idx].id, 'costo', val || 0)}
              onBlur={() => handleDetalleCalculate(detalles[idx].id, 'costo', detalles[idx]?.costo || 0)}
              onPressEnter={() => handleDetalleCalculate(detalles[idx].id, 'costo', detalles[idx]?.costo || 0)}
            />
            <div style={{ fontSize: 11, lineHeight: 1.5, color: '#999' }}>
              {formatNumber(costoUnitario)} × {factor}
            </div>
          </div>
        );
      },
    },
    {
      title: '% Desc',
      key: 'porcentajeDescuento',
      width: 90,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, _record: DetalleFacturaSuplidorDTO, idx: number) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          min={0}
          max={100}
          step={0.01}
          precision={2}
          controls={false}
          value={detalles[idx]?.porcentajeDescuento}
          onChange={(val) => handleDetalleUpdateValue(detalles[idx].id, 'porcentajeDescuento', val || 0)}
          onBlur={() => handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', detalles[idx]?.porcentajeDescuento || 0)}
          onPressEnter={() => handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', detalles[idx]?.porcentajeDescuento || 0)}
          addonAfter="%"
        />
      ),
    },
    {
      title: 'Descuento',
      key: 'descuento',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: DetalleFacturaSuplidorDTO) => (
        <Text>{formatNumber(record.descuento || 0)}</Text>
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
      render: (_: any, record: DetalleFacturaSuplidorDTO) => (
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
      render: (_: any, record: DetalleFacturaSuplidorDTO) => (
        <Text strong>{formatNumber(record.total || 0)}</Text>
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 50,
      onCell: () => ({ style: { paddingRight: 8 } }),
      render: (_: any, _record: DetalleFacturaSuplidorDTO, idx: number) => {
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
        setImpuestosFactura(res.impuestosFactura || []);
        setSelectedTipo(res.tipo || null); setSelectedConcepto(res.concepto || null);
        setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
        setSelectedEntidad(res.suplidor || res.entidad || null);
        setSelectedEntrada(res.entradaAlmacen || null);
        const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
        form.setFieldsValue({
          tipo: res.tipo?.codigo || '', concepto: res.concepto?.codigo || '',
          suplidor: res.suplidor?.codigo || res.entidad?.codigo || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          fechaVencimiento: res.fechaVencimiento ? dayjs(parseDateRaw(res.fechaVencimiento)) : null,
          fechaEntrega: res.fechaEntrega ? dayjs(parseDateRaw(res.fechaEntrega)) : null,
          ncf: res.ncf || '', referencia: res.referencia || '',
          diasCredito: res.diasCredito || 0, moneda: res.moneda?.nombre || '',
          tasa: res.tasa || 1, nota: res.nota || '',
        });
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        message.error(msg); setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, form, mode]);

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
        tipo={selectedTipo?.codigo}
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
                  key: 'impuestos',
                  label: `Impuestos (${impuestosFactura.length})`,
                  children: (
                    <ImpuestosFacturaEditables
                      impuestos={impuestosFactura}
                      onChange={setImpuestosFactura}
                      editable={mode === 'crear' || mode === 'editar'}
                    />
                  ),
                },
                {
                  key: 'asientos',
                  label: `Asientos (${asientosLocales.length || data?.asientos?.length || 0})`,
                  children: (
                    <AsientosContableEditables
                      asientos={asientosLocales.length > 0 ? asientosLocales : (data?.asientos || [])}
                      onChange={setAsientosLocales}
                      editable={mode === 'editar' || mode === 'crear'}
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
                  <ImpuestosFacturaEditables
                    impuestos={impuestosFactura}
                    onChange={setImpuestosFactura}
                    editable={mode === 'crear' || mode === 'editar'}
                  />
                ),
              },
              {
                key: 'asientos',
                label: `Asientos (${asientosLocales.length || data?.asientos?.length || 0})`,
                children: (
                  <AsientosContableEditables
                    asientos={asientosLocales.length > 0 ? asientosLocales : (data?.asientos || [])}
                    onChange={setAsientosLocales}
                    editable={mode === 'editar' || mode === 'crear'}
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
          tipo={selectedTipo}
          concepto={selectedConcepto}
          suplidor={selectedEntidad}
          detallesCount={detalles.length}
          ncf={ncfValue}
          tipoRef={tipoRef}
          conceptoRef={conceptoRef}
          suplidorRef={suplidorRef}
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
  tipo: any | null;
  concepto: any | null;
  suplidor: any | null;
  detallesCount: number;
  ncf?: string;
  tipoRef: React.RefObject<HTMLDivElement | null>;
  conceptoRef: React.RefObject<HTMLDivElement | null>;
  suplidorRef: React.RefObject<HTMLDivElement | null>;
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
  tipo,
  concepto,
  suplidor,
  detallesCount,
  ncf,
  tipoRef,
  conceptoRef,
  suplidorRef,
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
        key: 'tipo',
        title: 'Paso 1: Tipo de Documento',
        description: 'Debe seleccionar el tipo de documento de la factura. Los tipos definen ciertas acciones del documento.',
        target: () => tipoRef.current,
      },
      {
        key: 'concepto',
        title: 'Paso 2: Concepto',
        description: 'Debe elegir un concepto para poder continuar. Los conceptos determinan ciertas acciones del documento.',
        target: () => conceptoRef.current,
      },
      {
        key: 'suplidor',
        title: 'Paso 3: Suplidor',
        description: 'Seleccione el suplidor de la factura.',
        target: () => suplidorRef.current,
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
    if (!tipo) return steps[0];
    if (!concepto) return steps[1];
    if (suplidoresDisponibles && !suplidor) return steps[2];
    if (detallesCount === 0) return steps[3];
    if (!ncf) return steps[4];

    return null;
  }, [tipo, concepto, suplidor, detallesCount, ncf, suplidoresDisponibles, tipoRef, conceptoRef, suplidorRef, agregarFilaRef, ncfRef]);

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

export default FacturaSuplidorFormulario;

