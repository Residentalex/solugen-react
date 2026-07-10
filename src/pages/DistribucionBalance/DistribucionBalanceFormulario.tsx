import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Modal, Alert, Empty,
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
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { distribucionBalanceApi } from '../../api/distribucionBalanceApi';
import { conceptosApi } from '../../api/conceptosApi';
import { tipoApi } from '../../api/tipoApi';
import { clienteApi } from '../../api/clienteApi';
import { parametrosApi } from '../../api/parametrosApi';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import type { ConceptoDTO, AsientoContableDTO, LogDTO } from '../../types/entradaAlmacen';
import type { UnidadMedidaDTO } from '../../types/productos';
import type {
  TransaccionAsociadaDTO,
} from '../../types/distribucionBalance';
import type { TipoDocumentoDTO } from '../../types/transaccion';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import LogTable from '../../components/LogTable';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import BuscarDocumentoModal from '../../components/BuscarDocumentoModal/BuscarDocumentoModal';
import { OrigenCuenta } from '../../types/contabilidad';

import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { formatCurrency, formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum } from '../../utils/estadoDocumento';
import { DistribucionBalanceGuide } from './DistribucionBalanceGuide';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';

const { TextArea } = Input;

// ===== Componente principal =====
interface DistribucionBalanceFormularioProps {
  tipoEntidad: 'SUP' | 'CLI';
}

const DistribucionBalanceFormulario: React.FC<DistribucionBalanceFormularioProps> = ({ tipoEntidad }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const codigoPantalla = tipoEntidad === 'SUP' ? 'FDBASUP' : 'FDBACLI';
  const entidadLabel = tipoEntidad === 'SUP' ? 'Suplidor' : 'Cliente';

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [tiposCache, setTiposCache] = useState<TipoDocumentoDTO[]>([]);
  const [entidadesCache, setEntidadesCache] = useState<any[]>([]);
  const [selectedTipo, setSelectedTipo] = useState<TipoDocumentoDTO | null>(null);
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [selectedEntidad, setSelectedEntidad] = useState<any>(null);
  const [transaccionesAsociadas, setTransaccionesAsociadas] = useState<TransaccionAsociadaDTO[]>([]);
  const [asientos, setAsientos] = useState<AsientoContableDTO[]>([]);
  const [logs, setLogs] = useState<LogDTO[]>([]);
  const [medidasCache, setMedidasCache] = useState<UnidadMedidaDTO[]>([]);
  const [fechaCierreContable, setFechaCierreContable] = useState<string | null>(null);
  const [selectedDebitos, setSelectedDebitos] = useState<React.Key[]>([]);
  const [selectedCreditos, setSelectedCreditos] = useState<React.Key[]>([]);

  // Concepto modal
  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
  const [conceptoSearchText, setConceptoSearchText] = useState('');

  // Documentos pendientes modal
  const [pendientesModalOpen, setPendientesModalOpen] = useState(false);
  const [pendientesOrigen, setPendientesOrigen] = useState<0 | 1>(1); // 0=Debito, 1=Credito
  const [totalDistribucion, setTotalDistribucion] = useState<number>(0);

  const impuestosBackupRef = useRef<Map<number, { impuesto?: any; porcentajeImpuesto: number }>>(new Map());

  // Refs para la guía
  const tipoRef = useRef<HTMLDivElement>(null);
  const conceptoRef = useRef<HTMLDivElement>(null);
  const entidadRef = useRef<HTMLDivElement>(null);

  // Quick fields
  const [editingField, setEditingField] = useState<string | null>(null);
  const editingOriginalValue = useRef<string | number>('');
  const editingValueRef = useRef<string | number>('');
  const fieldCloseHandledRef = useRef(false);

  const [form] = Form.useForm();

  // Watchers
  const ncfValue = Form.useWatch('ncf', form) || '';
  const refValue = Form.useWatch('referencia', form) || '';
  const tasaValue = Form.useWatch('tasa', form) ?? 1;

  const sinOC = true;
  const isLarge = screens.xxl === true;

  // Estado
  const estado = toEstadoNum(data?.estado);
  const esCerrado = data?.periodo === 6;
  const esBorrador = estado === 0;
  const esAplicado = estado === 1;
  const esAnulado = estado === 3;

  // ===== Transacciones separadas por origen =====
  const debitos = transaccionesAsociadas.filter(
    (t) => t.origenCuenta?.toLowerCase() === 'debito' || t.origenCuenta === 'D' || t.origenCuenta === '0'
  );
  const creditos = transaccionesAsociadas.filter(
    (t) => t.origenCuenta?.toLowerCase() === 'credito' || t.origenCuenta === 'C' || t.origenCuenta === '1'
  );

  // ===== Totales DBA =====
  const totalDebitosDBA = debitos.reduce((s, t) => s + (t.monto || 0), 0);
  const totalCreditosDBA = creditos.reduce((s, t) => s + (t.monto || 0), 0);
  const pendienteDBA = totalDebitosDBA - totalCreditosDBA;
  const totales = {
    subTotal: data?.subTotal || 0,
    descuento: data?.descuento || 0,
    impuestos: data?.impuestos || 0,
    total: data?.total || 0,
  };

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

  // ===== Cargar catálogos al montar =====
  useEffect(() => {
    setActiveModule(codigoPantalla);
    const pageTitle = mode === 'crear'
      ? `Nueva Distribución de Balance - ${entidadLabel}`
      : `Editar Distribución de Balance - ${entidadLabel}`;
    setPageTitleOverride(pageTitle);

    // Cargar tipos para DBA
    tipoApi.obtenerPorDocumento(sucursalActiva, 'DBA')
      .then((tipos) => setTiposCache(tipos as any))
      .catch(() => {});
    unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch(() => {});
    parametrosApi.obtenerFechaCierreFiscal(sucursalActiva).then(setFechaCierreContable).catch(() => {});

    if (mode === 'crear') {
      form.setFieldsValue({
        fechaDocumento: dayjs(),
        tasa: 1,
      });
      setTotalDistribucion(0);
    }

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, sucursalActiva, form, codigoPantalla, entidadLabel]);

  // ===== Cargar datos en modo editar =====
  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;

    setLoading(true);
    distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res: any) => {
        setData(res);
        setTransaccionesAsociadas(res.transaccionesAsociadas || []);
        setAsientos(res.asientos || []);
        setLogs(res.logs || []);

        setSelectedConcepto(res.concepto || null);
        setSelectedEntidad(res.entidad || null);

        if (res.tipo) {
          setSelectedTipo(res.tipo);
        }

        const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;

        form.setFieldsValue({
          tipo: res.tipo?.codigo || res.codigoTipo || '',
          concepto: res.concepto?.codigo || '',
          entidad: res.entidad?.codigo || res.codigoEntidad || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          ncf: res.ncf || '',
          referencia: res.referencia || '',
          tasa: res.tasa || 1,
          nota: res.nota || '',
        });

        setTotalDistribucion(res.total || 0);

        // Cargar entidades según el concepto
        if (res.concepto?.codigo) {
          cargarEntidades(res.concepto.codigo);
        }
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        message.error(msg);
        setLoadingError(true);
        navigate(`/${codigoPantalla}`, { replace: true });
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate, codigoPantalla]);

  // ===== Cargar entidades (clientes o suplidores) =====
  const cargarEntidades = async (conceptoCodigo?: string) => {
    try {
      // Cargar desde el endpoint de entidades
      const res = await conceptosApi.obtenerEntidades(sucursalActiva, conceptoCodigo || selectedConcepto?.codigo, true);
      setEntidadesCache(res || []);
    } catch {
      // Fallback
      try {
        if (tipoEntidad === 'CLI') {
          const clientes = await clienteApi.obtenerActivos(sucursalActiva);
          setEntidadesCache(clientes || []);
        } else {
          const suplidores = await conceptosApi.obtenerSuplidores(sucursalActiva);
          setEntidadesCache(suplidores || []);
        }
      } catch {
        message.error(`Error al cargar ${entidadLabel.toLowerCase()}s`);
      }
    }
  };

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
          navigate(`/${codigoPantalla}`, { replace: true });
        } else if (id) {
          navigate(`/${codigoPantalla}/${id}`, { replace: true });
        }
      },
    });
  };

  // ===== Validación =====
  const validarFormulario = async (): Promise<string | null> => {
    const values = form.getFieldsValue();

    if (!selectedConcepto) return 'Debe elegir un Concepto';
    if (!selectedEntidad && !values.entidad) return `Debe elegir un ${entidadLabel}`;

    const fechaDoc = values.fechaDocumento;
    if (fechaDoc) {
      const hoy = dayjs().endOf('day');
      if (dayjs(fechaDoc).isAfter(hoy)) {
        return 'La fecha del documento no puede ser mayor a hoy';
      }
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

    // REGLA CRÍTICA: Total Débitos == Total Créditos
    if (Math.abs(pendienteDBA) > 0.01) {
      return 'El total de Débitos debe ser igual al total de Créditos. Pendiente: ' + formatNumber(pendienteDBA);
    }

    // Validar asientos cuadrados
    if (asientos.length > 0) {
      const totalDebAsientos = asientos.reduce((s, r) => s + (r.tipoAsiento === 'D' || r.tipoAsiento === 0 ? r.monto : 0), 0);
      const totalCreAsientos = asientos.reduce((s, r) => s + (r.tipoAsiento === 'C' || r.tipoAsiento === 1 ? r.monto : 0), 0);
      if (Math.abs(totalDebAsientos - totalCreAsientos) > 0.01) {
        return 'Los asientos contables no están cuadrados';
      }
    }

    if (values.nota && values.nota.length > 500) {
      return 'La nota no puede exceder 500 caracteres';
    }

    return null;
  };

  // ===== Construir DTO =====
  const construirDTO = (): any => {
    const values = form.getFieldsValue();
    const base = data || {};

    const entidadSel = entidadesCache.find((e: any) => e.codigo === values.entidad) || selectedEntidad;

    const fechaDoc = values.fechaDocumento
      ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
        ? toISOFormat(values.fechaDocumento.toDate())
        : values.fechaDocumento)
      : toISOFormat(new Date());

    // Asegurar documento con origenCuenta desde companyStore
    const { documentos } = useCompanyStore.getState().data;
    const docConfig = documentos.find((d: any) => d.codigo === 'DBA');
    const docOrigenCuenta = base.documento?.origenCuenta ?? docConfig?.origenCuenta ?? OrigenCuenta.Desconocido;
    const documento = base.documento?.codigo
      ? { ...base.documento, origenCuenta: docOrigenCuenta }
      : { codigo: 'DBA', origenCuenta: docOrigenCuenta };

    // Asegurar entidad con tipoEntidad
    const tipoEntidadStr = tipoEntidad;
    const entidadBase = entidadSel || { nombre: '', codigo: '', identificacion: '' };
    const entidad = {
      ...entidadBase,
      tipoEntidad: entidadBase.tipoEntidad ?? {
        codigo: tipoEntidadStr,
        origenCuenta: docOrigenCuenta,
      },
    };

    return {
      id: base.id || 0,
      fechaDocumento: fechaDoc,
      noDocumento: base.noDocumento || '',
      estado: base.estado || 0,
      periodo: base.periodo || new Date().getMonth() + 1,
      ncf: values.ncf || '',
      referencia: values.referencia || '',
      nota: values.nota || '',
      tasa: values.tasa || 1,
      total: totalDistribucion,
      subTotal: base.subTotal || 0,
      descuento: base.descuento || 0,
      impuestos: base.impuestos || 0,
      tipoDocumento: 'DBA',
      tipoEntidad,
      documento,
      concepto: selectedConcepto || { nombre: '', codigo: '' },
      entidad,
      moneda: base.moneda || getMonedaSucursalActiva(),
      codigoTipo: selectedTipo?.codigo || values.tipo || '',
      // Colecciones
      transaccionesAsociadas: transaccionesAsociadas.map((t) => ({
        ...t,
        transaccionAsociadaID: t.transaccionAsociadaID || t.id,
      })),
      asientos: asientos || [],
      logs: logs || [],
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
        const result = await distribucionBalanceApi.crear(sucursalActiva, dto);
        message.success('Distribución de Balance creada exitosamente');
        navigate(`/${codigoPantalla}/${result.id}`, { replace: true });
      } else {
        await distribucionBalanceApi.actualizar(sucursalActiva, dto);
        message.success('Distribución de Balance actualizada exitosamente');
        navigate(`/${codigoPantalla}/${id}`, { replace: true });
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerarAsientos = async () => {
    if (sucursalActiva === undefined) return;
    setSaving(true);
    try {
      const dto = construirDTO();
      const asientosGenerados = await distribucionBalanceApi.generarAsientos(sucursalActiva, dto);
      setAsientos(asientosGenerados);
      message.success(`Se generaron ${asientosGenerados.length} asientos`);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al generar asientos');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== Handlers de concepto =====
  const handleConceptoSelect = (concepto: ConceptoDTO) => {
    setSelectedConcepto(concepto);
    setEditingField(null);
    setConceptoSearchText('');

    // Cargar entidades según concepto
    cargarEntidades(concepto.codigo);

    // === ConfigurarMoneda ===
    const monedaObj = concepto.moneda || getMonedaSucursalActiva();
    const monedaFull = { nombre: monedaObj.nombre, simbolo: (monedaObj as any).simbolo || getMonedaSucursalActiva().simbolo, codigo: monedaObj.codigo };
    setData((prev: any) => {
      if (!prev) return prev;
      return { ...prev, moneda: monedaFull };
    });

    form.setFieldsValue({
      concepto: concepto.codigo,
      moneda: monedaObj.nombre,
      tasa: monedaObj.tasa ?? 1,
    });

    // === NoImpuesto: si el concepto no acepta impuestos, mostrar advertencia ===
    if (concepto.noImpuesto) {
      const hayRetenciones = transaccionesAsociadas.some((t) => (t.retencion || 0) > 0);
      if (hayRetenciones) {
        message.warning('El Concepto no acepta Impuestos/Retenciones. Verifique las retenciones en documentos relacionados.');
      }
    }
  };

  const handleConceptoSearchClick = () => setConceptoModalOpen(true);

  // ===== Documentos pendientes =====
  const handleOpenDocumentosPendientes = (origen: 0 | 1) => {
    const entidadCodigo = selectedEntidad?.codigo || form.getFieldValue('entidad');
    if (!entidadCodigo) {
      message.warning(`Debe seleccionar un ${entidadLabel} primero`);
      return;
    }
    setPendientesOrigen(origen);
    setPendientesModalOpen(true);
  };

  const handleSelectDocumentosPendientes = (docs: any[]) => {
    if (!docs || docs.length === 0) return;
    // Asignar origenCuenta según el origen con que se abrió el modal
    // Si origen=1 (Credito) → los docs seleccionados son DÉBITOS en la DBA
    // Si origen=0 (Debito) → los docs seleccionados son CRÉDITOS en la DBA
    const origenStr = pendientesOrigen === 1 ? 'Debito' : 'Credito';
    const docsConOrigen = docs.map((d: any) => ({
      ...d,
      origenCuenta: d.origenCuenta ?? origenStr,
    }));
    setTransaccionesAsociadas((prev) => {
      const existingIds = new Set(
        prev.map((t) => t.transaccionAsociadaID || t.id)
      );
      const nuevos = docsConOrigen.filter(
        (d: any) => !existingIds.has(d.transaccionAsociadaID || d.id)
      );
      return [...prev, ...nuevos];
    });
    setPendientesModalOpen(false);
  };

  const handleConceptoClear = () => {
    setSelectedConcepto(null);
    setConceptoSearchText('');
    setEntidadesCache([]);
    form.setFieldsValue({ concepto: '', entidad: undefined });
  };

  // ===== Handle monto change en transacción asociada =====
  const handleAsociadaMontoChange = (id: number | undefined, value: number | null) => {
    if (!id) return;
    setTransaccionesAsociadas((prev) =>
      prev.map((t) => {
        if ((t.transaccionAsociadaID || t.id) !== id) return t;
        const monto = value ?? 0;
        return { ...t, monto: Math.min(monto, t.saldoPendiente) };
      })
    );
  };

  // ===== Handlers de eliminación =====
  const handleEliminarFila = (id: number | string) => {
    setTransaccionesAsociadas((prev) => prev.filter((t: any) => {
      const tid = t.transaccionAsociadaID || t.id;
      return tid !== id;
    }));
    setSelectedDebitos([]);
    setSelectedCreditos([]);
  };

  const handleEliminarSeleccionados = (tipo: 'debito' | 'credito') => {
    const selected = tipo === 'debito' ? selectedDebitos : selectedCreditos;
    if (selected.length === 0) return;

    Modal.confirm({
      title: 'Eliminar documentos',
      icon: <ExclamationCircleOutlined />,
      content: `¿Está seguro de eliminar ${selected.length} documento(s) seleccionados?`,
      okText: 'Sí, eliminar',
      cancelText: 'No',
      okButtonProps: { danger: true },
      onOk: () => {
        const idsAEliminar = new Set(selected);
        setTransaccionesAsociadas((prev) => prev.filter((t: any) => {
          const tid = t.transaccionAsociadaID || t.id;
          return !idsAEliminar.has(tid);
        }));
        if (tipo === 'debito') setSelectedDebitos([]);
        else setSelectedCreditos([]);
      },
    });
  };

  // ===== Columnas de transacciones asociadas =====
  const asociadasColumns: any[] = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 100, render: (v: string) => formatDate(v) },
    {
      title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140,
      render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span>,
    },
    { title: 'NCF', dataIndex: 'nCF', key: 'nCF', width: 130, render: (v: string) => v || '-' },
    {
      title: 'Monto Original', dataIndex: 'montoOriginal', key: 'montoOriginal', width: 120, align: 'right' as const,
      render: (v: number) => formatNumber(v),
    },
    {
      title: 'Abonado', dataIndex: 'pagado', key: 'pagado', width: 110, align: 'right' as const,
      render: (v: number) => formatNumber(v),
    },
    {
      title: 'Pendiente', dataIndex: 'saldoPendiente', key: 'saldoPendiente', width: 110, align: 'right' as const,
      render: (v: number) => <strong>{formatNumber(v)}</strong>,
    },
    {
      title: 'Retención', dataIndex: 'retencion', key: 'retencion', width: 100, align: 'right' as const,
      render: (v: number) => (v ? formatNumber(v) : '-'),
    },
    {
      title: 'Monto', key: 'monto', width: 120, align: 'right' as const,
      render: (_: any, record: TransaccionAsociadaDTO) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          min={0}
          max={record.saldoPendiente}
          step={0.01}
          precision={2}
          value={record.monto}
          onChange={(val) => handleAsociadaMontoChange(record.transaccionAsociadaID || record.id, val)}
        />
      ),
    },
    {
      title: '',
      key: 'accion',
      width: 50,
      render: (_: any, record: any) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            handleEliminarFila(record.transaccionAsociadaID || record.id);
          }}
        />
      ),
    },
  ];

  // ===== Handle refresh =====
  const handleRefresh = useCallback(() => {
    if (mode === 'crear') return;
    if (!id) return;
    setLoadingError(false);
    setLoading(true);
    distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res: any) => {
        setData(res);
        setTransaccionesAsociadas(res.transaccionesAsociadas || []);
        setAsientos(res.asientos || []);
        setLogs(res.logs || []);
        setSelectedConcepto(res.concepto || null);
        setSelectedEntidad(res.entidad || null);
        if (res.tipo) setSelectedTipo(res.tipo);
        const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
        form.setFieldsValue({
          tipo: res.tipo?.codigo || res.codigoTipo || '',
          concepto: res.concepto?.codigo || '',
          entidad: res.entidad?.codigo || res.codigoEntidad || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          ncf: res.ncf || '', referencia: res.referencia || '',
          tasa: res.tasa || 1, nota: res.nota || '',
        });
        setTotalDistribucion(res.total || 0);
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        message.error(msg); setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, form, mode]);

  // ===== Loading state =====
  if (loading) {
    return <LoadingSpinner mensaje="Cargando documento..." />;
  }

  const estadoInfo = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Borrador', color: 'default' };

  // ===== Encabezado =====
  const documentoTieneTipos = tiposCache.length > 0;
  const renderEncabezado = () => (
    <Card className="paces-card" size="small" title="Datos Generales" extra={<EstadoTag estado={estado} periodo={data?.periodo} />} style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={24} xxl={18}>
          <Form form={form} layout="vertical" size="small" style={{ paddingTop: 24 }}>
        <Row gutter={[16, 24]}>
          {/* Fila 1: Tipo + Concepto */}
          <Col xs={24} sm={12} lg={9} ref={tipoRef}>
            <Form.Item name="tipo" style={{ marginBottom: 0 }}>
              <FloatingField label="Tipo">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  onChange={(val) => {
                    const t = tiposCache.find((tc) => tc.codigo === val);
                    setSelectedTipo(t || null);
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

          <Col xs={24} sm={12} lg={15}>
            <div ref={conceptoRef}>
              <FloatingField label="Concepto" required>
                <Input
                  placeholder=" "
                  value={selectedConcepto ? `${selectedConcepto.codigo || ''} - ${toTitleCase(selectedConcepto.nombre)}` : conceptoSearchText}
                  readOnly
                  disabled={documentoTieneTipos && !selectedTipo}
                  suffix={
                    <Space size={4}>
                      <SearchOutlined
                        onClick={() => (!documentoTieneTipos || selectedTipo) && handleConceptoSearchClick()}
                        style={{ cursor: (!documentoTieneTipos || selectedTipo) ? 'pointer' : 'not-allowed', color: 'rgba(0,0,0,0.45)' }}
                      />
                      {selectedConcepto && <ClearOutlined onClick={handleConceptoClear} style={{ cursor: 'pointer' }} />}
                    </Space>
                  }
                  onClick={() => (!documentoTieneTipos || selectedTipo) && handleConceptoSearchClick()}
                />
              </FloatingField>
            </div>
            <Form.Item name="concepto" hidden><Input /></Form.Item>
            <ConceptoInfoLabel concepto={selectedConcepto} />
          </Col>

          {/* Fila 2: Fecha + Entidad */}
          <Col xs={24} sm={12} lg={9}>
            <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }}>
              <FloatingField label="Fecha" required>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </FloatingField>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={15} ref={entidadRef}>
            <Form.Item name="entidad" required style={{ marginBottom: 0 }}>
              <FloatingField label={entidadLabel} required>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  onChange={(val) => {
                    const ent = entidadesCache.find((e: any) => e.codigo === val);
                    setSelectedEntidad(ent || null);
                  }}
                >
                  {entidadesCache.map((ent: any) => (
                    <Select.Option key={ent.codigo} value={ent.codigo}>
                      {toTitleCase(ent.nombre)}{ent.identificacion ? ` (${ent.identificacion})` : ''}
                    </Select.Option>
                  ))}
                </Select>
              </FloatingField>
            </Form.Item>
          </Col>

          {/* Fila 3: Campos rápidos */}
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
                    <Tag style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => openFieldEditor('ncf')}>
                      NCF: {ncfValue} <EditOutlined />
                    </Tag>
                  ) : (
                    <Tag style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => openFieldEditor('ncf')}>
                      <PlusOutlined /> NCF
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

                {/* Total */}
                <InputNumber
                  size="small"
                  style={{ width: 150 }}
                  min={0}
                  step={0.01}
                  precision={2}
                  placeholder="Total"
                  value={totalDistribucion}
                  onChange={(val) => setTotalDistribucion(val || 0)}
                  addonBefore="Total"
                />
              </Space>
            </div>
            <Form.Item name="ncf" hidden><Input /></Form.Item>
            <Form.Item name="referencia" hidden><Input /></Form.Item>
            <Form.Item name="tasa" hidden><InputNumber /></Form.Item>
            <Form.Item name="moneda" hidden><Input /></Form.Item>
          </Col>

          {/* Fila 4: Nota */}
          <Col xs={24}>
            <Form.Item name="nota" style={{ marginBottom: 0 }}>
              <FloatingField label="Nota">
                <TextArea rows={3} maxLength={500} showCount />
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
            />
          </div>
        </Col>
      </Row>
    </Card>
  );

  // ===== Footer de Totales DBA =====
  const BalanceFooter = () => (
    <Card className="paces-card" size="small" style={{ marginTop: 16 }}>
      <Row gutter={[16, 8]}>
        <Col xs={8} style={{ textAlign: 'center' }}>
          <div className="paces-text-secondary" style={{ fontSize: 12 }}>Total Débitos</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#389e0d' }}>{formatNumber(totalDebitosDBA)}</div>
        </Col>
        <Col xs={8} style={{ textAlign: 'center' }}>
          <div className="paces-text-secondary" style={{ fontSize: 12 }}>Total Créditos</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#389e0d' }}>{formatNumber(totalCreditosDBA)}</div>
        </Col>
        <Col xs={8} style={{ textAlign: 'center' }}>
          <div className="paces-text-secondary" style={{ fontSize: 12 }}>Pendiente</div>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: Math.abs(pendienteDBA) > 0.01 ? '#ff4d4f' : '#389e0d',
          }}>
            {formatNumber(pendienteDBA)}
          </div>
        </Col>
      </Row>
    </Card>
  );



  // ===== Tabs =====
  const tabItems: any[] = [];

  // Tab 1: Débitos
  tabItems.push({
    key: 'debitos',
    label: `Débitos (${debitos.length})`,
    children: (
      <div>
        <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => handleOpenDocumentosPendientes(1)}>
            Agregar documentos
          </Button>
          <div style={{ flex: 1 }} />
          {selectedDebitos.length > 0 && (
            <Button danger icon={<DeleteOutlined />} onClick={() => handleEliminarSeleccionados('debito')}>
              Eliminar ({selectedDebitos.length})
            </Button>
          )}
        </div>
        <Table
          dataSource={debitos}
          columns={asociadasColumns}
          rowKey={(r) => r.transaccionAsociadaID || r.id || Math.random()}
          size="small"
          pagination={false}
          scroll={{ x: 1100 }}
          rowSelection={{
            selectedRowKeys: selectedDebitos,
            onChange: (keys) => setSelectedDebitos(keys),
          }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={7} align="right">
                  <strong>Total Débitos:</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <strong style={{ color: '#389e0d' }}>{formatNumber(totalDebitosDBA)}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
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
  });

  // Tab 2: Créditos
  tabItems.push({
    key: 'creditos',
    label: `Créditos (${creditos.length})`,
    children: (
      <div>
        <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => handleOpenDocumentosPendientes(0)}>
            Agregar documentos
          </Button>
          <div style={{ flex: 1 }} />
          {selectedCreditos.length > 0 && (
            <Button danger icon={<DeleteOutlined />} onClick={() => handleEliminarSeleccionados('credito')}>
              Eliminar ({selectedCreditos.length})
            </Button>
          )}
        </div>
        <Table
          dataSource={creditos}
          columns={asociadasColumns}
          rowKey={(r) => r.transaccionAsociadaID || r.id || Math.random()}
          size="small"
          pagination={false}
          scroll={{ x: 1100 }}
          rowSelection={{
            selectedRowKeys: selectedCreditos,
            onChange: (keys) => setSelectedCreditos(keys),
          }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={7} align="right">
                  <strong>Total Créditos:</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <strong style={{ color: '#389e0d' }}>{formatNumber(totalCreditosDBA)}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
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
  });

  // Tab 3: Asientos Contables
  tabItems.push({
    key: 'asientos',
    label: `Asientos Contables (${asientos.length})`,
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
  });

  // Tab 4: Historial
  tabItems.push({
    key: 'historial',
    label: `Historial (${logs.length})`,
    children: (
      <LogTable dataSource={logs} scroll={{ x: 900 }} />
    ),
  });

  // ===== Render principal =====
  return (
    <div>
      <FormularioToolbar saving={saving} estado={estado} periodo={data?.periodo} onGuardar={handleGuardar} onCancelar={handleCancelar} />

      {loadingError && (
        <Alert
          message="Error al cargar formulario de distribución de balance"
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
        documento="DBA"
        tipo={selectedTipo?.codigo}
      />

      <BuscarDocumentoModal
        open={pendientesModalOpen}
        onClose={() => setPendientesModalOpen(false)}
        onSelect={handleSelectDocumentosPendientes}
        tipoEntidad={tipoEntidad}
        codEntidad={selectedEntidad?.codigo || form.getFieldValue('entidad') || ''}
        origen={pendientesOrigen}  // 0=Debito, 1=Credito
        montoTotal={totalDistribucion}
        puedeAsignar={true}
        documentosIniciales={transaccionesAsociadas
          .map(t => t.id || t.transaccionAsociadaID)
          .filter((id): id is number => id != null && id > 0)}
        documentoEnviado={data?.noDocumento ? `DBA-${data.noDocumento}` : undefined}
      />

      {isLarge ? (
        /* === DESKTOP === */
        <Row gutter={16}>
          <Col xxl={24}>
            {renderEncabezado()}
            <Tabs
              defaultActiveKey="debitos"
              type="card"
              style={{ borderRadius: 8, padding: '0 16px' }}
              items={tabItems}
            />
            <BalanceFooter />
          </Col>
          </Row>
      ) : (
        /* === MOBILE === */
        <div>
          {renderEncabezado()}
          <Tabs
            defaultActiveKey="debitos"
            type="card"
            style={{ borderRadius: 8, padding: '0 16px' }}
            items={tabItems}
          />
          <BalanceFooter />
          </div>
      )}

      {/* Guía paso a paso (solo en modo crear o editar borrador) */}
      {(mode === 'crear' || esBorrador) && (
        <DistribucionBalanceGuide
          mode={mode}
          tipo={selectedTipo}
          concepto={selectedConcepto}
          entidad={selectedEntidad}
          detallesCount={debitos.length + creditos.length}
          tipoRef={tipoRef}
          conceptoRef={conceptoRef}
          entidadRef={entidadRef}
        />
      )}
    </div>
  );
};

export default DistribucionBalanceFormulario;

