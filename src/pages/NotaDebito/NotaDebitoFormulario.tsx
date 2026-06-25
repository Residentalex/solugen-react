import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Button, Space, Row, Col, Divider, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Alert,
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
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { notaDebitoApi } from '../../api/notaDebitoApi';

import { conceptosApi } from '../../api/conceptosApi';
import { parametrosApi } from '../../api/parametrosApi';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import type {
  NotaDebitoFullDTO,
  TipoDTO,
  DocumentoRelacionadoDTO,
  DevolucionAsociadaDTO,
  ImpuestoRetencionDTO,
} from '../../types/notaDebito';
import type { ConceptoDTO, EntidadDTO, AsientoContableDTO } from '../../types/entradaAlmacen';
import type { UnidadMedidaDTO } from '../../types/productos';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import LogTable from '../../components/LogTable';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import SeleccionarImpuestosModal from '../../components/SeleccionarImpuestosModal';
import type { ImpuestoSeleccionado } from '../../components/SeleccionarImpuestosModal';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import BuscarTipoModal from '../../components/BuscarTipoModal/BuscarTipoModal';
import BuscarDocumentoModal from '../../components/BuscarDocumentoModal/BuscarDocumentoModal';
import BuscarEntidadSelect from '../../components/BuscarEntidadSelect/BuscarEntidadSelect';

import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { formatCurrency, formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';
import { NotaDebitoGuide } from './NotaDebitoGuide';

const { Text } = Typography;
const { TextArea } = Input;

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



// ===== Componente principal =====
interface NotaDebitoFormularioProps {
  tipoEntidad: 'SUP' | 'CLI';
}

const NotaDebitoFormulario: React.FC<NotaDebitoFormularioProps> = ({ tipoEntidad }) => {
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
  const codigoPantalla = tipoEntidad === 'SUP' ? 'FNDSUP' : 'FNDCLI';
  const entidadLabel = tipoEntidad === 'SUP' ? 'Suplidor' : 'Cliente';

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
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

  // Modal de selección de impuestos
  const [modalImpuestosOpen, setModalImpuestosOpen] = useState(false);

  // NCF
  const [ncfTipo, setNcfTipo] = useState<'documento' | 'modificado'>('documento');
  const [ncfModificadoVal, setNcfModificadoVal] = useState('');
  const [medidasCache, setMedidasCache] = useState<UnidadMedidaDTO[]>([]);

  // Artículos (solo CLI)
  const [detallesMovimiento, setDetallesMovimiento] = useState<any[]>([]);

  // Quick field editors (para NCF, Referencia, Tasa)
  const [editingField, setEditingField] = useState<string | null>(null);
  const editingOriginalValue = useRef<string | number>('');
  const editingValueRef = useRef<string | number>('');
  const fieldCloseHandledRef = useRef(false);

  // Nuevos estados para alineación con NC
  const [asientos, setAsientos] = useState<any[]>([]);
  const [fechaCierreContable, setFechaCierreContable] = useState<string | null>(null);
  const [sucursalesCache, setSucursalesCache] = useState<any[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState<any>(null);
  const [conceptoInfo, setConceptoInfo] = useState<string>('');

  // Refs para la guía
  const conceptoRef = useRef<HTMLDivElement>(null);
  const sucursalRef = useRef<HTMLDivElement>(null);
  const tipoRef = useRef<HTMLDivElement>(null);
  const entidadRef = useRef<HTMLDivElement>(null);
  const documentosRef = useRef<HTMLDivElement>(null);

  const [form] = Form.useForm();
  const sinOC = true;
  const isLarge = screens.xxl === true;

  // ===== Watchers =====
  const montoTotalWatch = Form.useWatch('total', form) || 0;
  const ncfValue = Form.useWatch('ncf', form) || '';
  const refValue = Form.useWatch('referencia', form) || '';
  const tasaValue = Form.useWatch('tasa', form) ?? 1;

  // ===== Totales derivados =====
  const totales = calcularTotales(impuestosRetenciones, Number(montoTotalWatch) || 0);

  // ===== Quick field editors =====
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

  // ===== Estado info =====
  const estado = data?.estado ?? 0;
  const esCerrado = data?.periodo === 6;
  const esBorrador = estado === 0;
  const esAplicado = estado === 1;
  const esAnulado = estado === 3;

  // ===== Determinar acciones según estado =====
  const puedeGuardar = mode === 'crear' || esBorrador;

  // ===== Cargar datos de apoyo al montar =====
  useEffect(() => {
    setActiveModule(codigoPantalla);
    const pageTitle = mode === 'crear'
      ? `Nueva Nota de Débito - ${entidadLabel}`
      : `Editar Nota de Débito - ${entidadLabel}`;
    setPageTitleOverride(pageTitle);

    unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch(() => {});
    parametrosApi.obtenerFechaCierreFiscal(sucursalActiva).then(setFechaCierreContable).catch(() => {});
    conceptosApi.obtenerSucursales(sucursalActiva).then(setSucursalesCache).catch(() => {});

    // === Si viene de Clonar ===
    if (cloneData) {
      setSelectedConcepto(cloneData.concepto || null);
      setSelectedEntidad(cloneData.entidad || null);
      setSelectedSucursal(cloneData.sucursal || null);
      // Separar transaccionesAsociadas en pagos y devoluciones
      const todasAsociadasClone = cloneData.transaccionesAsociadas || [];
      const docsPagoClone = todasAsociadasClone.filter((x: any) => !x.esDocumentoInventario);
      const docsInventarioClone = todasAsociadasClone.filter((x: any) => x.esDocumentoInventario);
      const devsMapeadasClone = docsInventarioClone.map((x: any) => ({
        transaccionAsociadaID: x.transaccionAsociadaID || x.id,
        documento: x.documento,
        fecha: x.fecha,
        montoOriginal: x.montoOriginal,
        monto: x.monto,
        esDocumentoInventario: true,
      }));
      setDocumentosRelacionados(docsPagoClone);
      setDevoluciones(devsMapeadasClone);
      setImpuestosRetenciones(cloneData.impuestosRetenciones || []);
      setAsientos(cloneData.asientos || []);
      setDetallesMovimiento(cloneData.detallesMovimiento || cloneData.detalles || []);
      setNcfModificadoVal(cloneData.ncfModificado || '');
      setNcfTipo(cloneData.ncfModificado ? 'modificado' : 'documento');

      const fechaDoc = cloneData.fechaDocumento ? parseDateRaw(cloneData.fechaDocumento) : null;
      form.setFieldsValue({
        concepto: cloneData.concepto?.codigo || '',
        tipo: cloneData.tipo?.codigo || '',
        entidad: cloneData.entidad?.codigo || '',
        fechaDocumento: fechaDoc ? dayjs(fechaDoc) : dayjs(),
        total: cloneData.total || 0,
        ncf: cloneData.ncf || '',
        tasa: cloneData.tasa || 1,
        referencia: cloneData.referencia || '',
        nota: cloneData.nota || '',
        sucursal: cloneData.sucursal?.codigo || '',
        bienes: cloneData.bienes || 0,
        servicios: cloneData.servicios || 0,
      });
      return () => { resetToolbar(); setPageTitleOverride(''); };
    }

    if (mode === 'crear') {
      form.setFieldsValue({
        fechaDocumento: dayjs(),
        tasa: 1,
        total: 0,
      });
    }

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, codigoPantalla, entidadLabel, form, sucursalActiva, cloneData]);

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
          tipoDocumento: res.tipoDocumento ?? 42,
          tipoEntidad: res.tipoEntidad || tipoEntidad,
          documento: res.documento || { codigo: 'ND' },
          concepto: res.concepto || null,
          tipo: res.tipo || null,
          entidad: res.entidad || null,
          moneda: res.moneda || null,
          transaccionesAsociadas: res.transaccionesAsociadas || [],
          impuestosRetenciones: res.impuestosRetenciones || [],
          asientos: res.asientos || [],
          logs: res.logs || [],
        };
        setData(full);
        setSelectedConcepto(full.concepto || null);
        setSelectedTipo(full.tipo || null);
        setSelectedEntidad(full.entidad || null);
        // Separar transaccionesAsociadas en pagos (esDocumentoInventario=false) y devoluciones (esDocumentoInventario=true)
        const todasAsociadas = res.transaccionesAsociadas || [];
        const docsPago = todasAsociadas.filter((x: any) => !x.esDocumentoInventario);
        const docsInventario = todasAsociadas.filter((x: any) => x.esDocumentoInventario);
        const devsMapeadas = docsInventario.map((x: any) => ({
          transaccionAsociadaID: x.transaccionAsociadaID || x.id,
          documento: x.documento,
          fecha: x.fecha,
          montoOriginal: x.montoOriginal,
          monto: x.monto,
          esDocumentoInventario: true,
        }));
        setDocumentosRelacionados(docsPago);
        setDevoluciones(devsMapeadas);
        setImpuestosRetenciones(full.impuestosRetenciones || []);
        setAsientos(full.asientos || []);
        setDetallesMovimiento(res.detallesMovimiento || res.detalles || []);
        setNcfModificadoVal(full.ncfModificado || '');
        setNcfTipo(full.ncfModificado ? 'modificado' : 'documento');

        const fechaDoc = full.fechaDocumento ? parseDateRaw(full.fechaDocumento) : null;

        form.setFieldsValue({
          concepto: full.concepto?.codigo || '',
          tipo: full.tipo?.codigo || '',
          entidad: full.entidad?.codigo || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          total: full.total || 0,
          ncf: full.ncf || '',
          tasa: full.tasa || 1,
          referencia: full.referencia || '',
          nota: full.nota || '',
          sucursal: full.sucursal?.codigo || full.codigoSucursal || '',
          bienes: full.bienes || 0,
          servicios: full.servicios || 0,
        });

        if (full.sucursal) {
          const encontrada = sucursalesCache.find((x: any) =>
            x.codigo === full.sucursal!.codigo || x.idExterno === full.sucursal!.codigo
          );
          setSelectedSucursal(encontrada || full.sucursal);
        }

        // Cargar entidades seg├║n el concepto
        if (full.concepto?.codigo) {
          conceptosApi.obtenerEntidades(sucursalActiva, full.concepto.codigo, true)
            .then(setEntidadesCache)
            .catch(() => {});
        }
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        message.error(msg);
        setLoadingError(true);
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
    conceptosApi.obtenerEntidades(sucursalActiva, concepto.codigo, true)
      .then((ents) => setEntidadesCache(ents))
      .catch(() => {});

    // === ConfigurarMoneda ===
    const monedaObj = concepto.moneda || getMonedaSucursalActiva();
    const monedaFull = { nombre: monedaObj.nombre, simbolo: (monedaObj as any).simbolo || getMonedaSucursalActiva().simbolo, codigo: monedaObj.codigo };
    form.setFieldsValue({
      moneda: monedaObj.nombre,
      tasa: monedaObj.tasa ?? 1,
    });
    // Actualizar data local para que la UI lo refleje
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, moneda: monedaFull };
    });

    // === Indicadores de concepto ===
    const infoParts: string[] = [];
    if (concepto.noImpuesto) infoParts.push('* No Impuestos *');
    if (concepto.noAsientos) infoParts.push('* No Asientos *');
    if (concepto.activo === false) infoParts.push('* Concepto Inactivo *');
    if (concepto.noActualizaCostos) infoParts.push('* No Actualiza Costos *');
    setConceptoInfo(infoParts.join(''));
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
  const handleDevolucionSelect = (docs: any[]) => {
    setDevoluciones((prev) => {
      const existentes = new Set(prev.map((d) => d.transaccionAsociadaID));
      const nuevos = docs
        .filter((d: any) => !existentes.has(d.transaccionAsociadaID))
        .map((d: any) => ({
          transaccionAsociadaID: d.transaccionAsociadaID,
          documento: `DVC-${d.documento}`,
          fecha: d.fecha,
          montoOriginal: d.montoOriginal,
          monto: d.monto,
          esDocumentoInventario: true,
        }));
      return [...prev, ...nuevos];
    });
  };

  const handleDevolucionRemove = (id?: number) => {
    setDevoluciones((prev) => prev.filter((d) => d.transaccionAsociadaID !== id));
  };

  const handleDevMontoChange = (id: number | undefined, monto: number) => {
    setDevoluciones((prev) =>
      prev.map((d) => d.transaccionAsociadaID === id ? { ...d, monto } : d)
    );
  };

  // ===== Handlers de Impuestos y Retenciones =====
  const handleImpuestoRemove = (id?: number | string) => {
    setImpuestosRetenciones((prev) => prev.filter((i) => i.id !== id && i.codigo !== id));
  };

  const handleImpuestoChange = (id: number | string | undefined, field: string, value: any) => {
    setImpuestosRetenciones((prev) =>
      prev.map((i) => (i.id === id || i.codigo === id) ? { ...i, [field]: value } : i)
    );
  };

  // ===== Handler del modal de impuestos compartido =====
  const handleConfirmarImpuestos = (items: ImpuestoSeleccionado[]) => {
    setImpuestosRetenciones((prev) => {
      const existentes = new Map(prev.map((i) => [i.codigo, i]));
      for (const n of items) {
        const existente = existentes.get(n.codigo);
        if (existente) {
          existentes.set(n.codigo, { ...existente, monto: existente.monto ?? n.monto });
        } else {
          existentes.set(n.codigo, { ...n, id: n.codigo, baseImponible: 0 });
        }
      }
      return Array.from(existentes.values());
    });
  };

  // ===== NCF Modificado =====
  const handleNcfTipoChange = (value: 'documento' | 'modificado') => {
    setNcfTipo(value);
    if (value === 'documento') {
      setNcfModificadoVal('');
    }
  };

  // ===== Validación =====
  const validarFormulario = async (): Promise<string | null> => {
    const values = form.getFieldsValue();

    if (!selectedConcepto) return 'El Concepto es obligatorio';
    if (!values.entidad && !selectedEntidad) return `El ${entidadLabel} es obligatorio`;

    // Fecha ≤ hoy
    const fechaDoc = values.fechaDocumento;
    if (fechaDoc) {
      const hoy = dayjs().endOf('day');
      if (dayjs(fechaDoc).isAfter(hoy)) return 'La fecha del documento no puede ser mayor a hoy';
    }

    // Validar fecha contra cierre contable
    if (fechaCierreContable) {
      const cierreDate = parseDateRaw(fechaCierreContable);
      if (cierreDate) {
        const cierreTs = dayjs(cierreDate).startOf('day').valueOf();
        if (fechaDoc && dayjs(fechaDoc).startOf('day').valueOf() <= cierreTs) {
          return 'La fecha del documento no puede ser menor o igual a la fecha de cierre';
        }
      }
    }

    // Validar NCF Modificado
    if (ncfTipo === 'modificado' && ncfModificadoVal && !validarNcfModificado(ncfModificadoVal)) {
      return 'El formato del NCF Modificado no es válido (B0+9dígitos o E3+10dígitos)';
    }

    // Validar distribución de documentos relacionados
    const totalMonto = Number(values.total) || 0;
    const sumaDocs = documentosRelacionados.reduce((s, d) => s + (d.monto || 0), 0);
    if (documentosRelacionados.length > 0 && Math.abs(sumaDocs - totalMonto) > 0.01) {
      return 'La distribución de documentos relacionados debe igualar el Total';
    }

    // Validar distribución de devoluciones
    if (devoluciones.length > 0) {
      const sumaDevs = devoluciones.reduce((s, d) => s + (d.monto || 0), 0);
      if (Math.abs(sumaDevs - totalMonto) > 0.01) {
        return 'La distribución de devoluciones debe igualar el Total';
      }
    }

    // Validar margen de impuestos
    if (impuestosRetenciones.length > 0) {
      for (const imp of impuestosRetenciones) {
        const porcentaje = imp.porcentaje || 0;
        const montoPromedio = totalMonto * ((porcentaje + 1) / 100);
        if (imp.monto > montoPromedio) {
          return `El monto del impuesto ${imp.nombre || ''} superó el margen permitido.`;
        }
      }
    }

    // Validar asientos cuadrados
    if (asientos.length > 0) {
      const deb = asientos.reduce((s, a) => s + ((typeof a.tipoAsiento === 'number' ? a.tipoAsiento === 0 : a.tipoAsiento === 'D') ? a.monto : 0), 0);
      const cred = asientos.reduce((s, a) => s + ((typeof a.tipoAsiento === 'number' ? a.tipoAsiento === 1 : a.tipoAsiento === 'C') ? a.monto : 0), 0);
      if (Math.abs(deb - cred) > 0.01) return 'Los asientos contables no están cuadrados';
    }

    // Validar NCF duplicado
    const ncfVal = values.ncf?.trim();
    if (ncfVal && selectedEntidad?.codigo) {
      try {
        const ncfExiste = await notaDebitoApi.verificarNCF(sucursalActiva, ncfVal, selectedEntidad.codigo);
        if (ncfExiste) {
          return `El NCF ${ncfVal} ya fue usado en otro documento`;
        }
      } catch {
        // Si falla la verificación, continuar
      }
    }

    return null;
  };

  // ===== Construir DTO =====
  const construirDTO = (): any => {
    const values = form.getFieldsValue();
    const base = data || {} as any;

    const entidadSel = entidadesCache.find((e) => e.codigo === values.entidad) || selectedEntidad;

    const fechaDoc = values.fechaDocumento
      ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
        ? toISOFormat(values.fechaDocumento.toDate())
        : values.fechaDocumento)
      : toISOFormat(new Date());

    const montoTotal = Number(values.total) || 0;
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
      diasCredito: selectedEntidad?.diasCredito || 0,
      bienes: values.bienes || 0,
      servicios: values.servicios || 0,
      subTotal: Math.round((montoTotal - totalImpuestos) * 100) / 100,
      descuento: 0,
      impuestos: Math.round(totalImpuestos * 100) / 100,
      retenciones: Math.round(totales.retenciones * 100) / 100,
      total: Math.round(montoTotal * 100) / 100,
      debitos: base.debitos || 0,
      creditos: base.creditos || 0,
      tipoDocumento: base.tipoDocumento ?? 42,
      tipoEntidad,
      documento: base.documento || { codigo: 'ND' },
      concepto: selectedConcepto || { codigo: '', nombre: '' },
      codigoTipo: selectedTipo?.codigo || '',
      entidad: entidadSel ? { codigo: entidadSel.codigo, nombre: entidadSel.nombre || '', identificacion: entidadSel.identificacion || '', telefono: entidadSel.telefono } : { codigo: '', nombre: '' },
      moneda: base.moneda || getMonedaSucursalActiva(),
      sucursal: selectedSucursal ? { codigo: selectedSucursal.codigo || selectedSucursal.idExterno, nombre: selectedSucursal.nombre || '' } : undefined,
      // Combinar pagos y devoluciones en transaccionesAsociadas (formato TransaccionAsociadaDTO)
      transaccionesAsociadas: [...documentosRelacionados, ...devoluciones.map((d: DevolucionAsociadaDTO) => ({
        transaccionAsociadaID: d.transaccionAsociadaID,
        documento: d.documento,
        fecha: d.fecha,
        montoOriginal: d.montoOriginal,
        monto: d.monto,
        esDocumentoInventario: true,
        tipoDocumento: 24,    // TipoDocumento.DVC = 24
      }))],
      impuestosRetenciones,
      asientos: asientos || [],
      detallesMovimiento: tipoEntidad === 'CLI' ? detallesMovimiento : [],
      logs: base.logs || [],
    };
  };

  // ===== Acciones =====
  const handleGuardar = async () => {
    const error = await validarFormulario();
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

  const handleGenerarAsientos = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const result = await notaDebitoApi.recalcularPagos(sucursalActiva, parseInt(id)) as any;
      if (result?.asientos) {
        setAsientos(result.asientos);
      }
      message.success('Asientos generados automáticamente');
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al generar asientos');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== Loader =====
  if (loading) {
    return <LoadingSpinner mensaje="Cargando documento..." />;
  }

  const estadoInfo = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Borrador', color: 'default' };

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
    { title: 'Monto Original', dataIndex: 'montoOriginal', key: 'montoOriginal', width: 120, align: 'right' as const, render: (v: number) => formatNumber(v || 0) },
    {
      title: 'Monto Asignado', dataIndex: 'monto', key: 'monto', width: 140, align: 'right' as const,
      render: (_: any, record: DevolucionAsociadaDTO, idx: number) => (
        <InputNumber
          size="small"
          style={{ width: 120 }}
          min={0}
          max={record.montoOriginal || record.monto || 0}
          step={0.01}
          precision={2}
          value={devoluciones[idx]?.monto}
          onChange={(val) => handleDevMontoChange(record.transaccionAsociadaID, val || 0)}
        />
      ),
    },
    {
      title: '', key: 'accion', width: 50,
      render: (_: any, record: DevolucionAsociadaDTO) => (
        <Button type="text" danger size="small" icon={<DeleteOutlined />}
          onClick={() => handleDevolucionRemove(record.transaccionAsociadaID)} />
      ),
    },
  ];

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
      render: (_: any, record: ImpuestoRetencionDTO, idx: number) => (
        <InputNumber
          size="small"
          style={{ width: 120 }}
          min={0}
          step={0.01}
          precision={2}
          value={impuestosRetenciones[idx]?.monto}
          onChange={(val) => handleImpuestoChange(record.id ?? record.codigo, 'monto', val || 0)}
        />
      ),
    },
    {
      title: '',
      key: 'accion',
      width: 50,
      render: (_: any, record: ImpuestoRetencionDTO) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleImpuestoRemove(record.id ?? record.codigo)}
        />
      ),
    },
  ];

  // ===== Columnas de Artículos (solo CLI) =====
  const detalleMovimientoColumns = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
    { title: 'Artículo', dataIndex: 'articulo', key: 'articulo', ellipsis: true },
    { title: 'Cantidad', dataIndex: 'cantidad', key: 'cantidad', width: 100, align: 'right' as const,
      render: (v: number) => formatNumber(v || 0) },
    { title: 'Total', dataIndex: 'total', key: 'total', width: 120, align: 'right' as const,
      render: (v: number) => formatNumber(v || 0) },
  ];

  // ===== Toolbar =====

  // ===== Encabezado =====
  const documentoTieneTipos = true;
  const renderEncabezado = () => (
    <Card className="paces-card" size="small" title="Datos Generales" extra={<EstadoTag estado={estado} periodo={data?.periodo} />} style={{ marginBottom: 16, paddingBottom: 32 }}>
      <Row gutter={16}>
        <Col xs={24} xxl={18}>
          <Form form={form} layout="vertical" size="middle" style={{ paddingTop: 24 }}>
        <Row gutter={[16, 24]}>
          {/* Fila 1: Fecha + Concepto */}
          <Col xs={24} sm={12} lg={6}>
            <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }}>
              <FloatingField label="Fecha" required>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </FloatingField>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={18}>
            <div ref={conceptoRef}>
              <FloatingField label="Concepto" required>
                <Input
                  placeholder=" "
                  value={selectedConcepto ? `${selectedConcepto.codigo} - ${toTitleCase(selectedConcepto.nombre)}` : ''}
                  readOnly
                  disabled={documentoTieneTipos && !selectedTipo}
                  suffix={
                    <Space size={4}>
                      <SearchOutlined
                        onClick={() => (!documentoTieneTipos || selectedTipo) && setConceptoModalOpen(true)}
                        style={{ cursor: (!documentoTieneTipos || selectedTipo) ? 'pointer' : 'not-allowed', color: 'rgba(0,0,0,0.45)' }}
                      />
                      {selectedConcepto && <ClearOutlined onClick={handleConceptoClear} style={{ cursor: 'pointer' }} />}
                    </Space>
                  }
                  onClick={() => (!documentoTieneTipos || selectedTipo) && setConceptoModalOpen(true)}
                />
              </FloatingField>
            </div>
            <Form.Item name="concepto" hidden><Input /></Form.Item>
            {conceptoInfo && (
              <Text type="warning" style={{ fontSize: 12 }}>{conceptoInfo}</Text>
            )}
          </Col>

          {/* Fila 2: Tipo + Entidad */}
          <Col xs={24} sm={12} lg={6}>
            <div ref={tipoRef}>
              <FloatingField label="Tipo" required>
                <Input
                  placeholder=" "
                  value={selectedTipo ? `${selectedTipo.codigo} - ${toTitleCase(selectedTipo.nombre)}` : ''}
                  readOnly
                  suffix={
                    <Space size={4}>
                      <SearchOutlined onClick={() => setTipoModalOpen(true)} style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }} />
                      {selectedTipo && <ClearOutlined onClick={handleTipoClear} style={{ cursor: 'pointer' }} />}
                    </Space>
                  }
                  onClick={() => setTipoModalOpen(true)}
                />
              </FloatingField>
            </div>
            <Form.Item name="tipo" hidden><Input /></Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={18}>
            <div ref={entidadRef}>
              <Form.Item name="entidad" required style={{ marginBottom: 0 }}>
                <BuscarEntidadSelect
                  entidades={entidadesCache as any}
                  value={selectedEntidad?.codigo}
                  label={entidadLabel}
                  required
                  tieneDocumentosAsociados={documentosRelacionados.length > 0 || devoluciones.length > 0}
                  conceptoSeleccionado={!!selectedConcepto}
                  onChange={(codigo, entidad) => setSelectedEntidad(entidad || null)}
                />
              </Form.Item>
            </div>
          </Col>

          {/* Fila 3: Sucursal + Monto Total + Bienes + Servicios */}
          <Col xs={24} sm={12} lg={6} ref={sucursalRef}>
            <Form.Item name="sucursal" style={{ marginBottom: 0 }}>
              <FloatingField label="Sucursal">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  onChange={(val) => {
                    const s = sucursalesCache.find((x: any) => x.codigo === val || x.idExterno === val);
                    setSelectedSucursal(s || null);
                  }}
                  options={sucursalesCache.map((s: any) => ({
                    value: s.codigo || s.idExterno,
                    label: toTitleCase(s.nombre || ''),
                  }))}
                />
              </FloatingField>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Form.Item name="total" required style={{ marginBottom: 0 }}>
              <FloatingField label="Monto Total" required>
                <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
              </FloatingField>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Form.Item name="bienes" style={{ marginBottom: 0 }}>
              <FloatingField label="Bienes">
                <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
              </FloatingField>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Form.Item name="servicios" style={{ marginBottom: 0 }}>
              <FloatingField label="Servicios">
                <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
              </FloatingField>
            </Form.Item>
          </Col>

          {/* Fila 4: Nota + Botones rápidos */}
          <Col xs={24} lg={18}>
            <Form.Item name="nota" style={{ marginBottom: 0 }}>
              <FloatingField label="Nota">
                <TextArea rows={2} maxLength={500} showCount placeholder="Nota (máx 500 caracteres)" />
              </FloatingField>
            </Form.Item>
          </Col>

          <Col xs={24} lg={6}>
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
                  <Tag style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => openFieldEditor('ncf')}>
                    NCF: {ncfValue} <EditOutlined />
                  </Tag>
                ) : (
                  <Tag style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => openFieldEditor('ncf')}>
                    <PlusOutlined /> NCF
                  </Tag>
                )}
              </div>

              {/* NCF Modificado como Tag rápido */}
              <div>
                {editingField === 'ncfModificado' ? (
                  <Input
                    size="small"
                    style={{ width: 200 }}
                    placeholder="NCF Modificado"
                    maxLength={20}
                    autoFocus
                    defaultValue={editingValueRef.current as string}
                    onChange={(e) => { editingValueRef.current = e.target.value.toUpperCase(); }}
                    onPressEnter={() => commitFieldEditor()}
                    onBlur={() => commitFieldEditor()}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { e.stopPropagation(); cancelFieldEditor(); }
                    }}
                    status={editingValueRef.current && !validarNcfModificado(editingValueRef.current as string) ? 'error' : undefined}
                  />
                ) : ncfModificadoVal ? (
                  <Tag style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => openFieldEditor('ncfModificado')}>
                    NCF Mod: {ncfModificadoVal} <EditOutlined />
                  </Tag>
                ) : (
                  <Tag style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => { setNcfTipo('modificado'); openFieldEditor('ncfModificado'); }}>
                    <PlusOutlined /> NCF Mod
                  </Tag>
                )}
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
            <Form.Item name="ncf" hidden><Input /></Form.Item>
            <Form.Item name="referencia" hidden><Input /></Form.Item>
            <Form.Item name="tasa" hidden><InputNumber /></Form.Item>
          </Col>

          <Form.Item name="moneda" hidden><Input /></Form.Item>
        </Row>
      </Form>
        </Col>
        <Col xs={24} xxl={6}>
          <div style={{ marginTop: 24 }}>
            <TotalesCard
              subTotal={totales.subTotal}
              descuento={0}
              impuestos={totales.impuestos}
              total={Number(montoTotalWatch) || 0}
              hideTitle
            />
          </div>
        </Col>
      </Row>
    </Card>
  );

  // ===== Layout principal =====
  const tabItems = [
    {
      key: 'documentos',
      label: `Documentos (${documentosRelacionados.length})`,
      children: (
        <div ref={documentosRef}>
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
        </div>
      ),
    },
    // Tab 2: Artículos (solo CLI)
    ...(tipoEntidad === 'CLI' ? [{
      key: 'articulos',
      label: `Artículos (${detallesMovimiento.length})`,
      children: (
        <div>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'flex-start' }}>
            <Button type="dashed" icon={<PlusOutlined />} onClick={() => {
              const nuevoId = -(detallesMovimiento.length + 1);
              setDetallesMovimiento(prev => [...prev, { id: nuevoId, codigo: '', articulo: '', cantidad: 0, total: 0 }]);
            }}>
              Agregar fila
            </Button>
          </div>
          <Table
            dataSource={detallesMovimiento}
            columns={detalleMovimientoColumns}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: 600 }}
            locale={{
              emptyText: (
                <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Empty description="Sin registros" />
                </div>
              ),
            }}
          />
        </div>
      ),
    }] : []),
    ...(tipoEntidad === 'SUP' ? [{
      key: 'devoluciones',
      label: `Devoluciones (${devoluciones.length})`,
      children: (
        <>
          <div style={{ marginBottom: 8 }}>
            <Button type="dashed" icon={<PlusOutlined />} onClick={() => setBuscarDevModalOpen(true)}>
              Agregar Devolución
            </Button>
          </div>
          <Table
            dataSource={devoluciones}
            columns={devColumns}
            rowKey={(r) => r.transaccionAsociadaID || 0}
            size="small"
            pagination={false}
            scroll={{ x: 600 }}
          />
        </>
      ),
    }] : []),
    {
      key: 'impuestos',
      label: `Impuestos y Retenciones (${impuestosRetenciones.length})`,
      children: (
        <>
          <div style={{ marginBottom: 8 }}>
            <Button type="primary" ghost icon={<SearchOutlined />} onClick={() => setModalImpuestosOpen(true)}>
              Seleccionar del catálogo
            </Button>
            {impuestosRetenciones.length > 0 && (
              <Button type="link" danger style={{ marginLeft: 8 }} onClick={() => setImpuestosRetenciones([])}>
                Limpiar todos
              </Button>
            )}
          </div>
          <Table
            dataSource={impuestosRetenciones}
            columns={impuestoColumns}
            rowKey={(r) => r.id || r.codigo || 0}
            size="small"
            pagination={false}
            scroll={{ x: 600 }}
            locale={{ emptyText: 'Sin impuestos seleccionados' }}
          />
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
            <Text className="paces-text-secondary">SubTotal: <strong>{formatNumber(totales.subTotal)}</strong></Text>
            <Text className="paces-text-secondary">Impuestos: <strong>{formatNumber(totales.impuestos)}</strong></Text>
            <Text className="paces-text-secondary">Retenciones: <strong>{formatNumber(totales.retenciones)}</strong></Text>
          </div>
        </>
      ),
    },
    {
      key: 'asientos',
      label: `Asientos (${asientos.length})`,
      children: (
        <AsientosContableEditables
          asientos={asientos}
          onChange={setAsientos}
          editable={estado === 0}
          onGenerar={handleGenerarAsientos}
          generando={saving}
          disableGenerar={!id}
        />
      ),
    },
    {
      key: 'historial',
      label: `Historial (${data?.logs?.length || 0})`,
      children: (
        <LogTable dataSource={(data?.logs || []) as any} scroll={{ x: 900 }} />
      ),
    },
  ];

  const contenidoPestanas = (
    <Tabs defaultActiveKey="documentos" type="card" items={tabItems} />
  );

  const handleRefresh = useCallback(() => {
    if (mode === 'crear') return;
    if (!id) return;
    setLoadingError(false);
    setLoading(true);
    notaDebitoApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res: any) => {
        const full: NotaDebitoFullDTO = {
          id: res.id, fechaDocumento: res.fechaDocumento, noDocumento: res.noDocumento,
          estado: res.estado, periodo: res.periodo, referencia: res.referencia || '',
          ncf: res.ncf || '', ncfModificado: res.ncfModificado || '', nota: res.nota || '',
          total: res.total || 0, subTotal: res.subTotal || 0, descuento: res.descuento || 0,
          impuestos: res.impuestos || 0, retenciones: res.retenciones || 0, tasa: res.tasa || 1,
          debitos: res.debitos || 0, creditos: res.creditos || 0,
          tipoDocumento: res.tipoDocumento ?? 42,
          tipoEntidad: res.tipoEntidad || tipoEntidad,
          documento: res.documento || { codigo: 'ND' }, concepto: res.concepto || null,
          tipo: res.tipo || null, entidad: res.entidad || null, moneda: res.moneda || null,
          transaccionesAsociadas: res.transaccionesAsociadas || [],
          impuestosRetenciones: res.impuestosRetenciones || [],
          asientos: res.asientos || [], logs: res.logs || [],
        };
        setData(full); setSelectedConcepto(full.concepto || null);
        setSelectedTipo(full.tipo || null); setSelectedEntidad(full.entidad || null);
        // Separar transaccionesAsociadas en pagos y devoluciones
        const todasAsociadasRefresh = res.transaccionesAsociadas || [];
        const docsPagoRefresh = todasAsociadasRefresh.filter((x: any) => !x.esDocumentoInventario);
        const docsInventarioRefresh = todasAsociadasRefresh.filter((x: any) => x.esDocumentoInventario);
        const devsMapeadasRefresh = docsInventarioRefresh.map((x: any) => ({
          transaccionAsociadaID: x.transaccionAsociadaID || x.id,
          documento: x.documento,
          fecha: x.fecha,
          montoOriginal: x.montoOriginal,
          monto: x.monto,
          esDocumentoInventario: true,
        }));
        setDocumentosRelacionados(docsPagoRefresh);
        setDevoluciones(devsMapeadasRefresh);
        setImpuestosRetenciones(full.impuestosRetenciones || []);
        setAsientos(full.asientos || []);
        setDetallesMovimiento(res.detallesMovimiento || res.detalles || []);
        setNcfModificadoVal(full.ncfModificado || '');
        setNcfTipo(full.ncfModificado ? 'modificado' : 'documento');
        const fechaDoc = full.fechaDocumento ? parseDateRaw(full.fechaDocumento) : null;
        form.setFieldsValue({
          concepto: full.concepto?.codigo || '', tipo: full.tipo?.codigo || '',
          entidad: full.entidad?.codigo || '', fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          total: full.total || 0, ncf: full.ncf || '', tasa: full.tasa || 1,
          referencia: full.referencia || '', nota: full.nota || '',
          sucursal: full.sucursal?.codigo || full.codigoSucursal || '',
          bienes: full.bienes || 0, servicios: full.servicios || 0,
        });

        if (full.sucursal) {
          const encontrada = sucursalesCache.find((x: any) =>
            x.codigo === full.sucursal!.codigo || x.idExterno === full.sucursal!.codigo
          );
          setSelectedSucursal(encontrada || full.sucursal);
        }
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
          message="Error al cargar formulario de nota de débito"
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

      {isLarge ? (
        /* === DESKTOP LAYOUT (≥ lg) === */
        <Row gutter={16}>
          <Col xxl={24}>
            {renderEncabezado()}
            {contenidoPestanas}
          </Col>
          </Row>
      ) : (
        /* === MOBILE LAYOUT (< lg) === */
        <div>
          {renderEncabezado()}
          {contenidoPestanas}
        </div>
      )}

      {/* Modales */}
      <BuscarConceptoModal
        open={conceptoModalOpen}
        onClose={() => setConceptoModalOpen(false)}
        onSelect={handleConceptoSelect}
        fetchConceptos={() => conceptosApi.obtenerConceptosPorDocumento(sucursalActiva, 'ND')}
        sucursal={sucursalActiva}
        documento="ND"
        tipo={selectedTipo?.codigo}
        tipoEntidad={tipoEntidad}
      />
      <BuscarTipoModal
        open={tipoModalOpen}
        onClose={() => setTipoModalOpen(false)}
        onSelect={handleTipoSelect}
        tipoDocumento="ND"
      />
      <BuscarDocumentoModal
        open={buscarDocModalOpen}
        onClose={() => setBuscarDocModalOpen(false)}
        onSelect={handleDocRelacionadoSelect}
        tipoEntidad={tipoEntidad}
        codEntidad={selectedEntidad?.codigo || ''}
        origen={tipoEntidad === 'SUP' ? 0 : 1}
        montoTotal={Number(montoTotalWatch) || 0}
      />
      {tipoEntidad === 'SUP' && (
        <BuscarDocumentoModal
          open={buscarDevModalOpen}
          onClose={() => setBuscarDevModalOpen(false)}
          onSelect={handleDevolucionSelect}
          tipoEntidad={tipoEntidad}
          codEntidad={selectedEntidad?.codigo || ''}
          origen={tipoEntidad === 'SUP' ? 0 : 1}
          esDocumentoInventario={true}
          montoTotal={Number(montoTotalWatch) || 0}
        />
      )}

      {/* Modal de selección de impuestos / retenciones */}
      <SeleccionarImpuestosModal
        open={modalImpuestosOpen}
        onClose={() => setModalImpuestosOpen(false)}
        onConfirm={handleConfirmarImpuestos}
        tipoEntidad={tipoEntidad}
        sucursal={sucursalActiva}
        existentes={impuestosRetenciones.map((i) => ({
          codigo: i.codigo || '',
          nombre: i.nombre || '',
          porcentaje: i.porcentaje || 0,
          tipo: i.tipo || 'Impuesto',
          monto: i.monto,
        }))}
      />

      {/* Guía paso a paso (solo en modo crear o editar borrador) */}
      {(mode === 'crear' || esBorrador) && (
        <NotaDebitoGuide
          mode={mode}
          concepto={selectedConcepto}
          sucursal={selectedSucursal}
          tipo={selectedTipo}
          entidad={selectedEntidad}
          detallesCount={documentosRelacionados.length + devoluciones.length}
          conceptoRef={conceptoRef}
          sucursalRef={sucursalRef}
          tipoRef={tipoRef}
          entidadRef={entidadRef}
          documentosRef={documentosRef}
        />
      )}
    </div>
  );
};

export default NotaDebitoFormulario;

