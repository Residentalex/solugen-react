import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Button, Space, Row, Col, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Tag, Alert,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  BankOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { transaccionApi } from '../../api/transaccionApi';
import { conceptosApi } from '../../api/conceptosApi';
import { cuentaContableApi } from '../../api/cuentaContableApi';
import { monedaApi } from '../../api/monedaApi';
import { cuentaBancariaApi, type CuentaBancariaDTO } from '../../api/cuentaBancariaApi';
import type { TransaccionDTO, TransaccionAsientoDTO } from '../../types/transaccion';
import type { ConceptoDTO, EntidadDTO } from '../../types/entradaAlmacen';
import type { CuentaContableResumenDTO, MonedaDTO } from '../../types/contabilidad';
import { OrigenCuenta } from '../../types/contabilidad';
import type { DetalleMovimientoDTO } from '../../types/notaCredito';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { toTitleCase, formatNumber, extraerMensajeError, toISOFormat } from '../../utils/formats';
import { toPeriodoNum } from '../../utils/estadoDocumento';
import { esDebito, esCredito } from '../../utils/contabilidad';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import BuscarDocumentoModal from '../../components/BuscarDocumentoModal/BuscarDocumentoModal';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import LogTable from '../../components/LogTable';
import CobrosCard from '../../components/CobrosCard';

const { TextArea } = Input;
const { Text } = Typography;

// ===== Helper: asiento vacío =====
function asientoVacio(): TransaccionAsientoDTO {
  return {
    id: 0,
    noCuenta: '',
    monto: 0,
    tipoAsiento: 0,
    descripcion: '',
  };
}

// ===== Helper: pendiente efectivo por fila de documento asociado =====
// DOCASOC.PENDIENTE puede venir mal (0) cuando en realidad DEBITADO - ACREDITADO != 0.
// El pendiente efectivo se calcula como max(montoOriginal - pagado, saldoPendiente), nunca negativo.
function pendienteEfectivo(t: any): number {
  const v = Math.max(0, (t?.montoOriginal || 0) - (t?.pagado || 0), t?.saldoPendiente || t?.pendiente || 0);
  return Math.round(v * 100) / 100;
}

// ===== Componente principal =====
const AsientoContableFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const usuario = useAuthStore((s: any) => s.usuario);
  const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const { screenCode, documentCode } = useScreenConfig('FAsientoContable');

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<TransaccionDTO | null>(null);
  const [asientos, setAsientos] = useState<TransaccionAsientoDTO[]>([]);
  const [entidadesCache, setEntidadesCache] = useState<EntidadDTO[]>([]);
  const [cuentasCache, setCuentasCache] = useState<CuentaContableResumenDTO[]>([]);
  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
  const [conceptoSearchText, setConceptoSearchText] = useState('');
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [selectedEntidad, setSelectedEntidad] = useState<EntidadDTO | null>(null);

  // ===== Campos editables nuevos (Moneda, Sucursal, Cta Bancaria, Beneficiario, Detalles, Docs) =====
  const [monedasCache, setMonedasCache] = useState<MonedaDTO[]>([]);
  const [selectedMoneda, setSelectedMoneda] = useState<string>('');
  const [sucursalesCache, setSucursalesCache] = useState<any[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState<string>('');
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancariaDTO[]>([]);
  const [selectedCuenta, setSelectedCuenta] = useState<string>('');
  const [detallesEditable, setDetallesEditable] = useState<DetalleMovimientoDTO[]>([]);
  const [documentosAsociados, setDocumentosAsociados] = useState<any[]>([]);
  const [buscarDocModalOpen, setBuscarDocModalOpen] = useState(false);

  // Campos rápidos (NCF, Referencia)
  const [editingField, setEditingField] = useState<string | null>(null);
  const editingOriginalValue = useRef<string | number>('');
  const editingValueRef = useRef<string | number>('');
  const fieldCloseHandledRef = useRef(false);

  const [form] = Form.useForm();
  const ncfValue = Form.useWatch('ncf', form) || '';
  const refValue = Form.useWatch('referencia', form) || '';

  // ===== Totales derivados =====
  const totalDebitos = useMemo(
    () => asientos.reduce((s, a) => s + (esDebito(a.tipoAsiento) ? (a.monto || 0) : 0), 0),
    [asientos]
  );
  const totalCreditos = useMemo(
    () => asientos.reduce((s, a) => s + (esCredito(a.tipoAsiento) ? (a.monto || 0) : 0), 0),
    [asientos]
  );
  const diferencia = Math.abs(totalDebitos - totalCreditos);
  const esCuadrado = diferencia < 0.01;

  // ===== Carga inicial =====
  useEffect(() => {
    setActiveModule(screenCode);
    const pageTitle = mode === 'crear' ? 'Nuevo Asiento Contable' : '';
    setPageTitleOverride(pageTitle);

    // Cargar cuentas contables auxiliares
    cuentaContableApi.obtenerAuxiliares(sucursalActiva)
      .then(setCuentasCache)
      .catch((err: any) => {
        console.warn('Error al cargar cuentas contables', err);
      });

    // Cargar catálogos editables: monedas, cuentas bancarias y sucursales
    monedaApi.obtenerListado(sucursalActiva)
      .then(setMonedasCache)
      .catch((err: any) => console.warn('Error al cargar monedas', err));
    cuentaBancariaApi.obtenerListado(sucursalActiva)
      .then(setCuentasBancarias)
      .catch((err: any) => console.warn('Error al cargar cuentas bancarias', err));
    conceptosApi.obtenerSucursales(sucursalActiva)
      .then(setSucursalesCache)
      .catch((err: any) => console.warn('Error al cargar sucursales', err));

    // Inicializar fecha en modo crear
    if (mode === 'crear') {
      form.setFieldsValue({ fechaDocumento: dayjs() });
    }

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, sucursalActiva, form, screenCode]);

  // ===== Cargar datos si es modo editar =====
  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      message.error('ID de transacción inválido');
      return;
    }

    setLoading(true);
    transaccionApi.obtenerPorId(sucursalActiva, idNum)
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`Editar - ${res.noDocumento || `Transacción #${res.id}`}`);
        setAsientos((res.asientos || []).map((a: TransaccionAsientoDTO) => ({
          ...a,
          noCuenta: a.cuentaContable?.noCuenta || a.noCuenta || '',
          cuentaContable: a.cuentaContable || { noCuenta: a.noCuenta || '', nombre: '' },
        })));
        setSelectedConcepto(res.concepto ? { codigo: res.concepto.codigo || '', nombre: res.concepto.nombre || '' } : null);
        setConceptoSearchText(res.concepto?.codigo ? `${res.concepto.codigo} - ${toTitleCase(res.concepto.nombre || '')}` : '');

        const entidad: EntidadDTO | null = res.entidad
          ? { codigo: res.entidad.codigo || res.codigoEntidad || '', nombre: res.entidad.nombre || res.nombreEntidad || '', identificacion: '' }
          : null;
        setSelectedEntidad(entidad);

        // Inicializar campos editables nuevos desde el documento
        setSelectedMoneda(res.codigoMoneda || getMonedaSucursalActiva().codigo);
        setSelectedSucursal(res.codigoSucursal || res.sucursal?.codigo || '');
        setSelectedCuenta(res.ctaBancaria || '');
        setDocumentosAsociados((res.transaccionesAsociadas || []).map((d: any) => ({
          id: d.transaccionAsociadaID ?? d.id ?? Math.random(),
          transaccionAsociadaID: d.transaccionAsociadaID ?? d.id,
          transaccionID: d.id,
          fecha: d.fecha ? dayjs(d.fecha).format('YYYY-MM-DD') : '',
          documento: d.documento || '',
          nCF: d.nCF || d.ncf || '',
          montoOriginal: d.montoOriginal ?? 0,
          monto: d.monto ?? d.montoOriginal ?? 0,
          descuento: d.descuento ?? 0,
          retencion: d.retencion ?? 0,
          pagado: d.pagado ?? 0,
          pendiente: pendienteEfectivo(d),
        })));
        setDetallesEditable(res.detalles || []);

        // Poblar formulario
        const fechaDoc = res.fechaDocumento ? dayjs(res.fechaDocumento) : null;
        form.setFieldsValue({
          fechaDocumento: fechaDoc,
          conceptoNombre: res.concepto?.nombre || '',
          concepto: res.concepto?.codigo || '',
          entidad: entidad?.codigo || '',
          ncf: res.ncf || '',
          referencia: res.referencia || '',
          nota: res.nota || '',
          tipoDocumento: res.documento?.codigo || documentCode,
          noDocumento: res.noDocumento || '',
          moneda: res.codigoMoneda || getMonedaSucursalActiva().codigo,
          sucursal: res.codigoSucursal || res.sucursal?.codigo || '',
          cuentaBancaria: res.ctaBancaria || '',
          beneficiario: res.nombreBeneficiario || '',
        });
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el asiento contable';
        message.error(msg);
        setLoadingError(true);
        navigationConfirmedRef.current = true;
        navigate('/FAsientoContable', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate, setPageTitleOverride, documentCode]);

  // ===== Cargar entidades al seleccionar concepto =====
  useEffect(() => {
    if (!selectedConcepto?.codigo) return;
    conceptosApi.obtenerEntidadesActivas(sucursalActiva, selectedConcepto.codigo)
      .then(setEntidadesCache)
      .catch((err: any) => {
        console.warn('Error al cargar entidades para concepto', err);
      });
  }, [selectedConcepto?.codigo, sucursalActiva]);

  const navigationConfirmedRef = useFormularioNavigation();

  // ===== Handlers de campos rápidos =====
  const openFieldEditor = (field: string) => {
    const val = form.getFieldValue(field);
    editingOriginalValue.current = val ?? '';
    editingValueRef.current = val ?? '';
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

  // ===== Handlers de navegación =====
  const handleCancelar = () => {
    Modal.confirm({
      title: 'Cancelar',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro que desea cancelar los cambios realizados?',
      okText: 'Si, cancelar',
      cancelText: 'No, continuar editando',
      okButtonProps: { danger: true },
      onOk: () => {
        if (mode === 'crear') {
          navigationConfirmedRef.current = true;
          navigate('/FAsientoContable', { replace: true });
        } else {
          navigationConfirmedRef.current = true;
          navigate(`/FAsientoContable/${id}`, { replace: true });
        }
      },
    });
  };

  // ===== Validación =====
  const validarFormulario = (): string | null => {
    const values = form.getFieldsValue();
    if (!values.fechaDocumento) return 'La fecha es requerida';
    if (!selectedConcepto) return 'El concepto es requerido';
    if (!selectedEntidad) return 'La entidad es requerida';
    if (asientos.length === 0) return 'Debe agregar al menos un asiento';
    if (!esCuadrado) return `Los asientos no cuadran. Diferencia: ${formatNumber(diferencia)}`;

    // Validar que todos los asientos tengan cuenta contable
    const sinCuenta = asientos.some((a) => !a.noCuenta);
    if (sinCuenta) return 'Todos los asientos deben tener una cuenta contable';

    // Validar que todos los asientos tengan monto > 0
    const sinMonto = asientos.some((a) => !a.monto || a.monto <= 0);
    if (sinMonto) return 'Todos los asientos deben tener un monto mayor a 0';

    return null;
  };

  // ===== Construir DTO =====
  const construirDTO = (): any => {
    const values = form.getFieldsValue();
    const base = data || {};

    const fechaDoc = values.fechaDocumento
      ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
        ? toISOFormat(values.fechaDocumento.toDate())
        : values.fechaDocumento)
      : toISOFormat(new Date());

    return {
      id: (base as any).id || 0,
      fechaDocumento: fechaDoc,
      noDocumento: (base as any).noDocumento || '',
      codigoEntidad: selectedEntidad?.codigo || '',
      nombreEntidad: selectedEntidad?.nombre || '',
      codigoConcepto: selectedConcepto?.codigo || '',
      ncf: values.ncf || '',
      ncfModificado: (base as any).ncfModificado || '',
      referencia: values.referencia || '',
      nota: values.nota || '',
      codigoMoneda: selectedMoneda || getMonedaSucursalActiva().codigo,
      codigoSucursal: selectedSucursal || (base as any).codigoSucursal || '',
      ctaBancaria: selectedCuenta || '',
      nombreBeneficiario: values.beneficiario || '',
      debitos: totalDebitos,
      creditos: totalCreditos,
      subTotal: totalDebitos,
      descuento: 0,
      impuestos: 0,
      retenciones: 0,
      total: totalDebitos,
      tasa: 1,
      estado: (base as any).estado || 0,
      periodo: (base as any).periodo || new Date().getMonth() + 1,
      documento: (base as any).documento || { codigo: documentCode },
      concepto: selectedConcepto ? { codigo: selectedConcepto.codigo, nombre: selectedConcepto.nombre } : { codigo: '', nombre: '' },
      entidad: selectedEntidad ? { codigo: selectedEntidad.codigo, nombre: selectedEntidad.nombre } : { codigo: '', nombre: '' },
      asientos: asientos.map((a) => ({
        id: a.id || 0,
        noCuenta: a.noCuenta || '',
        monto: a.monto || 0,
        tipoAsiento: a.tipoAsiento ?? 0,
        descripcion: a.descripcion || '',
        cuentaContable: a.noCuenta ? { noCuenta: a.noCuenta, nombre: cuentasCache.find((c) => c.noCuenta === a.noCuenta)?.nombre || '' } : undefined,
      })),
      detalles: detallesEditable.map((d) => ({
        id: d.id || 0,
        codigo: d.codigo || '',
        articulo: d.articulo || '',
        cantidad: d.cantidad || 0,
        precio: d.precio || 0,
        subTotal: d.subTotal ?? Math.round((d.cantidad || 0) * (d.precio || 0) * 100) / 100,
        impuestos: d.impuestos || 0,
        descuento: d.descuento || 0,
        total: d.total ?? Math.round(((d.cantidad || 0) * (d.precio || 0) - (d.descuento || 0)) * 100) / 100,
        referencia: d.referencia || '',
      })),
      transaccionesAsociadas: documentosAsociados.map((d) => ({
        id: d.transaccionID ?? (base as any).id ?? 0,
        transaccionAsociadaID: d.transaccionAsociadaID ?? d.id,
        monto: d.monto ?? 0,
        montoOriginal: d.montoOriginal ?? 0,
        descuento: d.descuento ?? 0,
        retencion: d.retencion ?? 0,
        nCF: d.nCF,
        documento: d.documento,
        pagado: d.pagado ?? 0,
        saldoPendiente: pendienteEfectivo(d),
      })),
      logs: (base as any).logs || [],
      impuestosFactura: (base as any).impuestosFactura || [],
    };
  };

  // ===== Guardar =====
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
        const result = await transaccionApi.crear(sucursalActiva, dto);
        message.success('Asiento contable creado exitosamente');
        navigationConfirmedRef.current = true;
        navigate(`/FAsientoContable/${result.id}`, { replace: true });
      } else {
        await transaccionApi.actualizar(sucursalActiva, dto);
        message.success('Asiento contable actualizado exitosamente');
        navigationConfirmedRef.current = true;
        navigate(`/FAsientoContable/${id}`, { replace: true });
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
    form.setFieldsValue({ conceptoNombre: concepto.nombre, concepto: concepto.codigo });
    setEditingField(null);

    // Cargar entidades del concepto
    conceptosApi.obtenerEntidadesActivas(sucursalActiva, concepto.codigo)
      .then(setEntidadesCache)
      .catch((err: any) => {
        console.warn('Error al cargar entidades para concepto', err);
      });
  };

  const handleConceptoSearchClick = () => {
    setConceptoModalOpen(true);
  };

  // ===== Handlers de asientos =====
  const handleAgregarAsiento = () => {
    setAsientos((prev) => [...prev, { ...asientoVacio(), id: -(prev.length + 1) }]);
  };

  const handleEliminarAsiento = (idx: number) => {
    Modal.confirm({
      title: 'Eliminar asiento',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro de eliminar este asiento?',
      okText: 'Sí',
      cancelText: 'No',
      okButtonProps: { danger: true },
      onOk: () => {
        setAsientos((prev) => prev.filter((_, i) => i !== idx));
      },
    });
  };

  const handleAsientoChange = (idx: number, field: string, value: any) => {
    setAsientos((prev) =>
      prev.map((a, i) => (i !== idx ? a : { ...a, [field]: value }))
    );
  };

  // ===== Handlers de detalles editables =====
  const handleAgregarDetalle = () => {
    setDetallesEditable((prev) => [
      ...prev,
      {
        id: -(prev.length + 1),
        codigo: '',
        articulo: '',
        cantidad: 1,
        precio: 0,
        subTotal: 0,
        impuestos: 0,
        descuento: 0,
        total: 0,
      },
    ]);
  };

  const handleEliminarDetalle = (idx: number) => {
    setDetallesEditable((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDetalleChange = (idx: number, field: string, value: any) => {
    setDetallesEditable((prev) =>
      prev.map((d, i) => {
        if (i !== idx) return d;
        const next = { ...d, [field]: value };
        const cantidad = Number(next.cantidad || 0);
        const precio = Number(next.precio || 0);
        const descuento = Number(next.descuento || 0);
        next.subTotal = Math.round(cantidad * precio * 100) / 100;
        next.total = Math.round((cantidad * precio - descuento) * 100) / 100;
        return next;
      })
    );
  };

  // ===== Handlers de documentos asociados editables =====
  const handleMontoChange = (id: number, value: number | null) => {
    setDocumentosAsociados((prev) =>
      prev.map((d) => (d.transaccionAsociadaID ?? d.id) === id ? { ...d, monto: Math.min(value ?? 0, pendienteEfectivo(d)) } : d)
    );
  };

  const handleDescuentoChange = (id: number, value: number | null) => {
    setDocumentosAsociados((prev) =>
      prev.map((d) => (d.transaccionAsociadaID ?? d.id) === id ? { ...d, descuento: value ?? 0 } : d)
    );
  };

  const handleRemoveDoc = (id: number) => {
    setDocumentosAsociados((prev) =>
      prev.filter((d) => (d.transaccionAsociadaID ?? d.id) !== id)
    );
  };

  const handleDocumentosSeleccionados = (docs: any[]) => {
    setDocumentosAsociados((prev) => {
      const existingIds = new Set(prev.map((d) => d.transaccionAsociadaID ?? d.id));
      const nuevos = docs.filter((d: any) => !existingIds.has(d.transaccionAsociadaID ?? d.id));
      return [...prev, ...nuevos.map((d: any) => ({
        id: d.transaccionAsociadaID ?? d.id,
        transaccionAsociadaID: d.transaccionAsociadaID ?? d.id,
        transaccionID: d.transaccionID,
        fecha: d.fecha ? dayjs(d.fecha).format('YYYY-MM-DD') : '',
        documento: d.documento || '',
        nCF: d.ncf || d.nCF || '',
        montoOriginal: d.montoOriginal || 0,
        monto: d.monto ?? d.montoOriginal ?? 0,
        descuento: 0,
        retencion: d.retencion ?? 0,
        pagado: d.pagado ?? d.acreditado ?? 0,
        pendiente: pendienteEfectivo(d),
      }))];
    });
  };

  // ===== Estado y periodo cerrado =====
  const estado = data?.estado ?? 0;
  const estadoNum = typeof estado === 'number' ? estado : 0;
  const esCerrado = toPeriodoNum(data?.periodo) === 6;
  const permisoModificarAdmin = usuario?.permisosEspeciales?.some(
    (p: any) => p.codigo === 'pe_modificar_admin' && p.valor === true
  ) ?? false;

  if (loading) return <LoadingSpinner mensaje="Cargando asiento contable..." />;

  // ===== Columnas de la tabla de asientos editable =====
  const asientoColumns = [
    {
      title: '#',
      key: 'index',
      width: 44,
      align: 'center' as const,
      render: (_: any, __: any, idx: number) => (
        <span className="paces-text-secondary" style={{ fontSize: 11 }}>{idx + 1}</span>
      ),
    },
    {
      title: 'No. Cuenta',
      key: 'noCuenta',
      width: 150,
      render: (_: any, __: any, idx: number) => {
        const fila = asientos[idx];
        if (!fila) return null;
        return (
          <Select
            size="small"
            style={{ width: '100%' }}
            showSearch
            allowClear
            placeholder="Buscar cuenta..."
            optionFilterProp="label"
            value={fila.noCuenta || undefined}
            onChange={(val) => handleAsientoChange(idx, 'noCuenta', val || '')}
            options={cuentasCache.map((c) => ({
              value: c.noCuenta,
              label: `${c.noCuenta} - ${toTitleCase(c.nombre || '')}`,
            }))}
          />
        );
      },
    },
    {
      title: 'Nombre',
      key: 'nombre',
      render: (_: any, __: any, idx: number) => {
        const fila = asientos[idx];
        if (!fila) return null;
        const cuenta = cuentasCache.find((c) => c.noCuenta === fila.noCuenta);
        return (
          <div style={{ fontSize: 13 }}>
            {cuenta ? toTitleCase(cuenta.nombre) : (
              <span className="paces-text-secondary">Seleccione una cuenta</span>
            )}
            {fila.descripcion && (
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.4 }}>
                {fila.descripcion}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Tipo',
      key: 'tipo',
      width: 100,
      align: 'center' as const,
      render: (_: any, __: any, idx: number) => {
        const fila = asientos[idx];
        if (!fila) return null;
        return (
          <Select
            size="small"
            style={{ width: 80 }}
            value={fila.tipoAsiento ?? 0}
            onChange={(val) => handleAsientoChange(idx, 'tipoAsiento', val)}
            options={[
              { value: 0, label: 'Debe' },
              { value: 1, label: 'Haber' },
            ]}
          />
        );
      },
    },
    {
      title: 'Monto',
      key: 'monto',
      width: 140,
      align: 'right' as const,
      render: (_: any, __: any, idx: number) => {
        const fila = asientos[idx];
        if (!fila) return null;
        return (
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            styles={{ input: { textAlign: 'right' } }}
            min={0}
            step={0.01}
            precision={2}
            controls={false}
            value={fila.monto}
            onChange={(val) => handleAsientoChange(idx, 'monto', val || 0)}
          />
        );
      },
    },
    {
      title: 'Descripción',
      key: 'descripcion',
      width: 200,
      render: (_: any, __: any, idx: number) => {
        const fila = asientos[idx];
        if (!fila) return null;
        return (
          <Input
            size="small"
            style={{ width: '100%' }}
            placeholder="Descripción opcional"
            value={fila.descripcion || ''}
            onChange={(e) => handleAsientoChange(idx, 'descripcion', e.target.value)}
          />
        );
      },
    },
    {
      title: '',
      key: 'acciones',
      width: 50,
      render: (_: any, __: any, idx: number) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleEliminarAsiento(idx)}
        />
      ),
    },
  ];

  // ===== Render =====
  return (
    <div>
      <FormularioToolbar
        saving={saving}
        estado={mode === 'editar' ? estadoNum : undefined}
        periodo={data?.periodo}
        mode={mode}
        onGuardar={handleGuardar}
        onCancelar={handleCancelar}
      />

      {loadingError && (
        <Alert
          message="Error al cargar formulario de asiento contable"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => { setLoadingError(false); window.location.reload(); }}>
              Reintentar
            </Button>
          }
        />
      )}

      {esCerrado && mode === 'editar' && !permisoModificarAdmin && (
        <Alert
          message="Este documento pertenece a un período contable cerrado. Los cambios podrían estar restringidos."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <BuscarConceptoModal
        open={conceptoModalOpen}
        onClose={() => setConceptoModalOpen(false)}
        onSelect={handleConceptoSelect}
        sucursal={sucursalActiva}
        documento={documentCode}
      />

      <BuscarDocumentoModal
        open={buscarDocModalOpen}
        onClose={() => setBuscarDocModalOpen(false)}
        onSelect={handleDocumentosSeleccionados}
        tipoEntidad={(selectedEntidad?.tipoEntidad?.codigo as 'SUP' | 'CLI') || 'SUP'}
        codEntidad={selectedEntidad?.codigo || ''}
        origen={(() => {
          const { documentos } = useCompanyStore.getState().data;
          const docCodigo = selectedConcepto?.docAGenerar || data?.documento?.codigo || '';
          const docConfig = docCodigo ? documentos.find((d: any) => d.codigo === docCodigo) : undefined;
          const docOrigen = docConfig?.origenCuenta ?? OrigenCuenta.Desconocido;
          return typeof docOrigen === 'number' ? docOrigen : (docOrigen === 'Credito' ? OrigenCuenta.Credito : OrigenCuenta.Debito);
        })()}
        documentosIniciales={documentosAsociados.map((d: any) => d.transaccionAsociadaID ?? d.id)}
        puedeAsignar={true}
      />

      {/* Encabezado */}
      <Card
        className="paces-card"
        size="small"
        title="Datos Generales"
        extra={mode === 'editar' ? <EstadoTag estado={estadoNum} periodo={data?.periodo} /> : undefined}
        style={{ marginBottom: 16 }}
      >
        <Row gutter={16}>
          <Col xs={24} xxl={18}>
            <Form form={form} layout="vertical" size="middle" style={{ paddingTop: 24 }}>
              <Row gutter={[16, 24]}>
                {/* Fila 1: Concepto + Fecha */}
                <Col xs={24} sm={12} lg={15}>
                  <FloatingField label="Concepto" required externalValue={conceptoSearchText}>
                    <Input
                      placeholder=" "
                      value={conceptoSearchText}
                      readOnly
                      suffix={<SearchOutlined style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }} />}
                      onClick={handleConceptoSearchClick}
                    />
                  </FloatingField>
                  <Form.Item name="concepto" hidden><Input /></Form.Item>
                  <Form.Item name="conceptoNombre" hidden><Input /></Form.Item>
                </Col>
                <Col xs={24} sm={12} lg={9}>
                  <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }}>
                    <FloatingField label="Fecha" required>
                      <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD"
                        disabledDate={(current) => {
                          if (permisoModificarAdmin) return false;
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

                {/* Fila 2: Entidad + Tipo Documento */}
                <Col xs={24} sm={12} lg={15}>
                  <Form.Item name="entidad" required style={{ marginBottom: 0 }}>
                    <FloatingField label="Entidad" required>
                      <Select
                        allowClear
                        showSearch
                        placeholder="Seleccionar entidad"
                        optionFilterProp="children"
                        onChange={(val) => {
                          const ent = entidadesCache.find((e) => e.codigo === val);
                          setSelectedEntidad(ent || null);
                        }}
                      >
                        {entidadesCache.map((ent) => (
                          <Select.Option key={ent.codigo} value={ent.codigo}>
                            {toTitleCase(ent.nombre)}{ent.identificacion ? ` (${ent.identificacion})` : ''}
                          </Select.Option>
                        ))}
                      </Select>
                    </FloatingField>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} lg={9}>
                  <Form.Item name="tipoDocumento" style={{ marginBottom: 0 }}>
                    <FloatingField label="Tipo Documento">
                      <Input placeholder=" " value={documentCode || ''} readOnly />
                    </FloatingField>
                  </Form.Item>
                </Col>

                {/* Fila 3: No Documento */}
                <Col xs={24} sm={12} lg={9}>
                  <Form.Item name="noDocumento" style={{ marginBottom: 0 }}>
                    <FloatingField label="No. Documento">
                      <Input
                        placeholder=" "
                        readOnly
                      />
                    </FloatingField>
                  </Form.Item>
                </Col>

                {/* Fila 3.5: Moneda + Sucursal + Cta Bancaria + Beneficiario */}
                <Col xs={24} sm={12} lg={6}>
                  <Form.Item name="moneda" style={{ marginBottom: 0 }}>
                    <FloatingField label="Moneda">
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="Seleccionar moneda"
                        value={selectedMoneda || undefined}
                        onChange={(val) => setSelectedMoneda(val || '')}
                        options={monedasCache.map((m) => ({
                          value: m.codigo,
                          label: `${m.codigo} - ${m.nombre}${m.simbolo ? ` (${m.simbolo})` : ''}`,
                        }))}
                      />
                    </FloatingField>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Form.Item name="sucursal" style={{ marginBottom: 0 }}>
                    <FloatingField label="Sucursal">
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="children"
                        placeholder="Seleccionar sucursal"
                        value={selectedSucursal || undefined}
                        onChange={(val) => setSelectedSucursal(val || '')}
                      >
                        {sucursalesCache.map((s: any) => (
                          <Select.Option key={s.codigo || s.idExterno} value={s.codigo || s.idExterno}>
                            {toTitleCase(s.nombre)}
                          </Select.Option>
                        ))}
                      </Select>
                    </FloatingField>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Form.Item name="cuentaBancaria" style={{ marginBottom: 0 }}>
                    <FloatingField label="Cuenta Bancaria">
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="children"
                        placeholder="Seleccionar cuenta bancaria"
                        value={selectedCuenta || undefined}
                        onChange={(val) => setSelectedCuenta(val || '')}
                        notFoundContent={cuentasBancarias.length === 0 ? 'No hay cuentas disponibles' : undefined}
                      >
                        {cuentasBancarias.map((cta) => (
                          <Select.Option key={cta.noCuenta} value={cta.noCuenta}>
                            <BankOutlined style={{ marginRight: 6, color: '#556ee6' }} />
                            {cta.noCuenta} - {toTitleCase(cta.nombre)} {cta.banco ? `(${toTitleCase(cta.banco)})` : ''}
                          </Select.Option>
                        ))}
                      </Select>
                    </FloatingField>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Form.Item name="beneficiario" style={{ marginBottom: 0 }}>
                    <FloatingField label="Beneficiario">
                      <Input placeholder="Nombre del beneficiario" />
                    </FloatingField>
                  </Form.Item>
                </Col>

                {/* Fila 4: Campos rápidos (NCF, Referencia) */}
                <Col xs={24}>
                  <div style={{ marginBottom: 16 }}>
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
                  <Form.Item name="ncf" hidden><Input /></Form.Item>
                  <Form.Item name="referencia" hidden><Input /></Form.Item>
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

          {/* Sidebar: Totales Debe/Haber */}
          <Col xs={24} xxl={6}>
            <div style={{ marginTop: 24 }}>
              <Card className="paces-card" size="small">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span className="paces-text-secondary">Total Débito</span>
                    <span style={{ color: '#f46a6a', fontWeight: 600 }}>{formatNumber(totalDebitos)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span className="paces-text-secondary">Total Crédito</span>
                    <span style={{ color: '#34c38f', fontWeight: 600 }}>{formatNumber(totalCreditos)}</span>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #f0f0f0', margin: '12px 0 8px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                  <span>Diferencia</span>
                  <span style={{ color: esCuadrado ? '#34c38f' : '#f46a6a' }}>
                    {formatNumber(diferencia)}
                    {esCuadrado ? ' ✓' : ' ✗'}
                  </span>
                </div>
                {esCuadrado && (
                  <div style={{ fontSize: 12, color: '#34c38f', marginTop: 4, textAlign: 'right' }}>
                    Asiento cuadrado
                  </div>
                )}
              </Card>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Asientos + info secundaria */}
      <Card
        className="paces-card"
        size="small"
        title="Asientos Contables"
        style={{ marginBottom: 16 }}
      >
        <Tabs
          defaultActiveKey="asientos"
          type="card"
          items={[
            {
              key: 'asientos',
              label: `Asientos (${asientos.length})`,
              children: (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAgregarAsiento}>
                      Agregar asiento
                    </Button>
                  </div>
                  <Table
                    dataSource={asientos}
                    columns={asientoColumns}
                    rowKey={(_, idx) => `${idx}`}
                    size="small"
                    pagination={false}
                    scroll={{ x: 900 }}
                    locale={{
                      emptyText: (
                        <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography.Text className="paces-text-secondary">
                            No hay asientos. Haga clic en "Agregar asiento" para comenzar.
                          </Typography.Text>
                        </div>
                      ),
                    }}
                  />
                </>
              ),
            },
            {
              key: 'detalles',
              label: `Detalles (${detallesEditable.length})`,
              children: (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAgregarDetalle}>
                      Agregar detalle
                    </Button>
                  </div>
                  <Table
                    dataSource={detallesEditable}
                    rowKey={(r: any) => String(r.id)}
                    size="small"
                    pagination={false}
                    scroll={{ x: 1000 }}
                    locale={{
                      emptyText: (
                        <Typography.Text className="paces-text-secondary">
                          No hay detalles. Haga clic en "Agregar detalle" para comenzar.
                        </Typography.Text>
                      ),
                    }}
                    columns={[
                      {
                        title: 'Código',
                        dataIndex: 'codigo',
                        key: 'codigo',
                        width: 120,
                        render: (v: string, _: any, idx: number) => (
                          <Input size="small" value={v || ''} onChange={(e) => handleDetalleChange(idx, 'codigo', e.target.value)} />
                        ),
                      },
                      {
                        title: 'Artículo',
                        dataIndex: 'articulo',
                        key: 'articulo',
                        render: (v: string, _: any, idx: number) => (
                          <Input size="small" value={v || ''} onChange={(e) => handleDetalleChange(idx, 'articulo', e.target.value)} />
                        ),
                      },
                      {
                        title: 'Cantidad',
                        dataIndex: 'cantidad',
                        key: 'cantidad',
                        width: 110,
                        align: 'right' as const,
                        render: (v: number, _: any, idx: number) => (
                          <InputNumber
                            size="small"
                            style={{ width: '100%' }}
                            styles={{ input: { textAlign: 'right' } }}
                            min={0}
                            step={0.01}
                            precision={2}
                            value={v}
                            onChange={(val) => handleDetalleChange(idx, 'cantidad', val || 0)}
                          />
                        ),
                      },
                      {
                        title: 'Costo',
                        dataIndex: 'precio',
                        key: 'precio',
                        width: 120,
                        align: 'right' as const,
                        render: (v: number, _: any, idx: number) => (
                          <InputNumber
                            size="small"
                            style={{ width: '100%' }}
                            styles={{ input: { textAlign: 'right' } }}
                            min={0}
                            step={0.01}
                            precision={2}
                            value={v}
                            onChange={(val) => handleDetalleChange(idx, 'precio', val || 0)}
                          />
                        ),
                      },
                      {
                        title: 'Total',
                        dataIndex: 'total',
                        key: 'total',
                        width: 120,
                        align: 'right' as const,
                        render: (v: number, record: any) => (
                          <Text strong>{formatNumber(record?.total ?? v ?? 0)}</Text>
                        ),
                      },
                      {
                        title: '',
                        key: 'acciones',
                        width: 50,
                        render: (_: any, __: any, idx: number) => (
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleEliminarDetalle(idx)}
                          />
                        ),
                      },
                    ]}
                  />
                </>
              ),
            },
            {
              key: 'documentos',
              label: `Documentos Asociados (${documentosAsociados.length})`,
              children: (
                <>
                  <style>{`.input-number-right .ant-input-number-input { text-align: right !important; }`}</style>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      <BankOutlined style={{ marginRight: 6, color: '#556ee6' }} />
                      Documentos Asociados
                    </span>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        if (!selectedEntidad?.codigo) {
                          message.warning('Seleccione una entidad primero');
                          return;
                        }
                        setBuscarDocModalOpen(true);
                      }}
                    >
                      Agregar
                    </Button>
                  </div>
                  <Table
                    dataSource={documentosAsociados}
                    rowKey={(r: any) => r.transaccionAsociadaID ?? r.id}
                    size="small"
                    pagination={false}
                    scroll={{ x: 1260 }}
                    locale={{ emptyText: 'No hay documentos asociados' }}
                    columns={[
                      {
                        title: 'Fecha',
                        dataIndex: 'fecha',
                        key: 'fecha',
                        width: 110,
                        render: (v: string) => v || '-',
                      },
                      {
                        title: 'Documento',
                        dataIndex: 'documento',
                        key: 'documento',
                        width: 160,
                      },
                      {
                        title: 'NCF',
                        dataIndex: 'nCF',
                        key: 'nCF',
                        width: 130,
                        render: (v: string) => v || '-',
                      },
                      {
                        title: 'Monto Original',
                        dataIndex: 'montoOriginal',
                        key: 'montoOriginal',
                        width: 130,
                        align: 'right' as const,
                        render: (v: number) => formatNumber(v ?? 0),
                      },
                      {
                        title: 'Abonado',
                        key: 'pagado',
                        width: 140,
                        align: 'right' as const,
                        render: (_: any, record: any) => (
                          <Text type="secondary">{formatNumber(record.pagado ?? 0)}</Text>
                        ),
                      },
                      {
                        title: 'Pendiente',
                        key: 'pendiente',
                        width: 130,
                        align: 'right' as const,
                        render: (_: any, record: any) => (
                          <Text style={{ color: pendienteEfectivo(record) > 0 ? '#fa8c16' : undefined }}>
                            {formatNumber(pendienteEfectivo(record))}
                          </Text>
                        ),
                      },
                      {
                        title: 'Retenciones',
                        key: 'retencion',
                        width: 120,
                        align: 'right' as const,
                        render: (_: any, record: any) => formatNumber(record.retencion ?? 0),
                      },
                      {
                        title: 'Descuento',
                        key: 'descuento',
                        width: 140,
                        align: 'right' as const,
                        render: (_: any, record: any) => (
                          <InputNumber
                            size="small"
                            style={{ width: '100%' }}
                            inputStyle={{ textAlign: 'right' as const }}
                            className="input-number-right"
                            min={0}
                            step={0.01}
                            precision={2}
                            value={record.descuento}
                            onChange={(val) => handleDescuentoChange(record.transaccionAsociadaID ?? record.id, val)}
                          />
                        ),
                      },
                      {
                        title: 'Monto',
                        key: 'monto',
                        width: 140,
                        align: 'right' as const,
                        render: (_: any, record: any) => (
                          <InputNumber
                            size="small"
                            style={{ width: '100%' }}
                            inputStyle={{ textAlign: 'right' as const }}
                            className="input-number-right"
                            min={0}
                            max={pendienteEfectivo(record)}
                            step={0.01}
                            precision={2}
                            value={record.monto}
                            onChange={(val) => handleMontoChange(record.transaccionAsociadaID ?? record.id, val)}
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
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveDoc(record.transaccionAsociadaID ?? record.id)}
                          />
                        ),
                      },
                    ]}
                  />
                </>
              ),
            },
            {
              key: 'historial',
              label: `Historial (${data?.logs?.length || 0})`,
              children: (
                <LogTable dataSource={data?.logs || []} scroll={{ x: 800 }} />
              ),
            },
            {
              key: 'cobros',
              label: `Cobros (${data?.cobros?.length || 0})`,
              children: (
                <CobrosCard cobros={data?.cobros || []} />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default AsientoContableFormulario;
