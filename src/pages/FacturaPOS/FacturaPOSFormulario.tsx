import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Dropdown, Alert, Empty,
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
  BarcodeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { facturaPOSApi } from '../../api/facturaPOSApi';
import { productoApi } from '../../api/productoApi';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import type {
  ConceptoDTO, ClienteDTO,
  AsientoContableDTO, DetalleFacturaPOSDTO, FacturaPOSFormularioDTO, CobroDTO,
} from '../../types/facturaPOS';
import type { UnidadMedidaDTO } from '../../types/productos';
import LogTable from '../../components/LogTable';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';

import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { formatCurrency, formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';

const { Text } = Typography;
const { TextArea } = Input;

// ===== Cálculo de fila POS (Precio incluye ITBIS) =====
function calcularFilaPOS(fila: DetalleFacturaPOSDTO): DetalleFacturaPOSDTO {
  const cantidad = fila.cantidad || 0;
  const precio = fila.precio || 0;
  const pctDesc = fila.porcentajeDescuento || 0;
  const pctImp = fila.porcentajeImpuesto || 0;

  // PrecioNeto = Precio / (1 + %Imp/100)
  const factorImp = 1 + pctImp / 100;
  const precioNeto = factorImp > 0 ? Math.round((precio / factorImp) * 100) / 100 : precio;

  const subTotal = Math.round(cantidad * precioNeto * 100) / 100;
  const descuento = Math.round(subTotal * (pctDesc / 100) * 100) / 100;
  const impuestos = Math.round((precio - precioNeto) * cantidad * 100) / 100;
  const total = Math.round((subTotal - descuento) * 100) / 100;

  return {
    ...fila,
    cantidad,
    precio,
    precioNeto,
    subTotal,
    descuento,
    impuestos,
    total,
  };
}

function filaVacia(): DetalleFacturaPOSDTO {
  return {
    id: 0,
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
    idTransaccion: 0,
  };
}

function cobrosVacios(): CobroDTO {
  return {
    efectivo: 0,
    cheque: 0,
    transferencia: 0,
    tarjetaCredito: 0,
    tarjetaDebito: 0,
    bono: 0,
    tarjetaRegalo: 0,
    notaCredito: 0,
  };
}



// ===== Componente principal =====
const FacturaPOSFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const authUser = useAuthStore((s) => s.usuario);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<FacturaPOSFormularioDTO | null>(null);
  const [detalles, setDetalles] = useState<DetalleFacturaPOSDTO[]>([]);
  const [cobros, setCobros] = useState<CobroDTO>(cobrosVacios());
  const [clientesCache, setClientesCache] = useState<any[]>([]);
  const [almacenesCache, setAlmacenesCache] = useState<any[]>([]);
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<ClienteDTO | null>(null);
  const [selectedAlmacen, setSelectedAlmacen] = useState<any | null>(null);
  const [conceptoInfo, setConceptoInfo] = useState<string>('');
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');
  const [medidasCache, setMedidasCache] = useState<UnidadMedidaDTO[]>([]);

  // Refs para la guía
  const conceptoRef = useRef<HTMLDivElement>(null);

  // ===== Estado para campos rápidos (NCF, Referencia, Tasa, Días Crédito) =====
  const [editingField, setEditingField] = useState<string | null>(null);
  const editingOriginalValue = useRef<string | number>('');
  const editingValueRef = useRef<string | number>('');
  const fieldCloseHandledRef = useRef(false);

  const openFieldEditor = (field: string) => {
    const val = form.getFieldValue(field);
    const defaultVal = field === 'tasa' ? 1 : field === 'diasCredito' ? 0 : '';
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

  // ===== Determinar si almacén es obligatorio =====
  const tieneProductos = detalles.some((d) => d.tipoArticulo === 'P' || d.tipoArticulo === 'Producto');

  // ===== Cargar datos de apoyo al montar =====
  useEffect(() => {
    setActiveModule('FPV');
    const pageTitle = mode === 'crear' ? 'Nueva Factura POS' : 'Editar Factura POS';
    setPageTitleOverride(pageTitle);

    // Cargar almacenes
    facturaPOSApi.obtenerAlmacenes(sucursalActiva).then(setAlmacenesCache).catch(() => {});
    unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch(() => {});

    // Inicializar valores por defecto en modo crear
    if (mode === 'crear') {
      form.setFieldsValue({
        fechaDocumento: dayjs(),
        tasa: 1,
        diasCredito: 0,
        turno: 'POS-001', // Placeholder: vendrá del contexto de caja
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
    facturaPOSApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        const full: FacturaPOSFormularioDTO = {
          id: res.id,
          fechaDocumento: res.fechaDocumento,
          noDocumento: res.noDocumento,
          estado: res.estado,
          periodo: res.periodo,
          ncf: res.ncf || '',
          nota: res.nota || '',
          referencia: res.referencia || '',
          tasa: res.tasa || 1,
          diasCredito: res.diasCredito || 0,
          turno: res.turno || '',
          concepto: res.concepto || null,
          cliente: res.cliente || null,
          almacen: res.almacen || null,
          moneda: res.moneda || null,
          documento: res.documento,
          subTotal: res.subTotal,
          descuento: res.descuento,
          impuestos: res.impuestos,
          total: res.total,
          detalles: (res.detalles || []).map((d) => ({
            ...d,
            porcentajeImpuesto: d.porcentajeImpuesto || (d.impuesto?.porcentaje ?? 0),
            tieneVencimiento: d.tieneVencimiento ?? false,
          })),
          cobros: (res.cobros || cobrosVacios()) as unknown as CobroDTO,
          asientos: res.asientos || [],
          logs: res.logs || [],
        };
        setData(full);
        setDetalles(full.detalles);
        setCobros(full.cobros || cobrosVacios());
        setSelectedConcepto(full.concepto);
        setSelectedCliente(full.cliente);
        setSelectedAlmacen(full.almacen);

        const fechaDoc = full.fechaDocumento ? parseDateRaw(full.fechaDocumento) : null;

        form.setFieldsValue({
          concepto: full.concepto?.codigo || '',
          cliente: full.cliente?.codigo || '',
          almacen: full.almacen?.codigo || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          turno: full.turno || '',
          ncf: full.ncf || '',
          referencia: full.referencia || '',
          diasCredito: full.diasCredito || 0,
          tasa: full.tasa || 1,
          nota: full.nota || '',
        });

        if (full.concepto?.codigo) {
          facturaPOSApi.obtenerClientes(sucursalActiva)
            .then(setClientesCache)
            .catch(() => {});
        }
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        message.error(msg);
        setLoadingError(true);
        navigate('/FPV');
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
          navigate('/FPV');
        } else if (id) {
          navigate(`/FPV/${id}`);
        }
      },
    });
  };

  // Validación del formulario
  const validarFormulario = (): string | null => {
    const values = form.getFieldsValue();

    if (!selectedConcepto) return 'Debe elegir un Concepto para poder continuar';
    if (!values.cliente && !selectedCliente) return 'Debe elegir un Cliente para poder continuar';
    if (tieneProductos && !selectedAlmacen && !values.almacen) return 'Debe elegir un Almacén (hay productos en los detalles)';

    const fechaDoc = values.fechaDocumento;
    if (fechaDoc) {
      const hoy = dayjs().endOf('day');
      if (dayjs(fechaDoc).isAfter(hoy)) {
        return 'La fecha del documento no puede ser mayor a hoy';
      }
    }

    if (detalles.length === 0) return 'No se puede crear una factura sin detalle.';
    if (!detalles.some((d) => (d.cantidad || 0) > 0)) return 'Debe tener al menos un detalle con cantidad > 0';

    return null;
  };

  // Construir DTO desde el formulario
  const construirDTO = (): FacturaPOSFormularioDTO => {
    const values = form.getFieldsValue();
    const base = data || {} as any;

    const clienteSel = clientesCache.find((e: any) => e.codigo === values.cliente) || selectedCliente;

    const fechaDoc = values.fechaDocumento
      ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
        ? toISOFormat(values.fechaDocumento.toDate())
        : values.fechaDocumento)
      : toISOFormat(new Date());

    const totalSub = detalles.reduce((s, d) => s + (d.subTotal || 0), 0);
    const totalDesc = detalles.reduce((s, d) => s + (d.descuento || 0), 0);
    const totalImp = detalles.reduce((s, d) => s + (d.impuestos || 0), 0);
    const total = detalles.reduce((s, d) => s + (d.total || 0), 0);

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
      diasCredito: values.diasCredito || 0,
      turno: values.turno || 'POS-001',
      subTotal: Math.round(totalSub * 100) / 100,
      descuento: Math.round(totalDesc * 100) / 100,
      impuestos: Math.round(totalImp * 100) / 100,
      total: Math.round(total * 100) / 100,
      documento: base.documento || { codigo: 'FPV' },
      concepto: selectedConcepto || { nombre: '', codigo: '' },
      moneda: base.moneda || { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' },
      almacen: selectedAlmacen || { nombre: '', codigo: '' },
      cliente: clienteSel || { nombre: '', codigo: '', identificacion: '' },
      detalles: detalles.map((d) => calcularFilaPOS(d)),
      cobros,
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
        const result = await facturaPOSApi.crear(sucursalActiva, dto);
        message.success('Factura POS creada exitosamente');
        navigate(`/FPV/${result.id}`);
      } else {
        await facturaPOSApi.actualizar(sucursalActiva, dto);
        message.success('Factura POS actualizada exitosamente');
        navigate(`/FPV/${id}`);
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
    setEditingField(null);
    form.setFieldsValue({ concepto: concepto.codigo });

    // Cargar clientes
    facturaPOSApi.obtenerClientes(sucursalActiva)
      .then((ents) => setClientesCache(ents))
      .catch(() => {});

    // Mostrar avisos si el concepto tiene flags especiales
    const infoParts: string[] = [];
    if (concepto.noImpuesto) infoParts.push(' * No Impuestos * ');
    if (concepto.noAsientos) infoParts.push(' * No Asientos * ');
    if (concepto.activo === false) infoParts.push(' * Concepto Inactivo * ');
    setConceptoInfo(infoParts.join(''));

    // Si el concepto es NoImpuesto y hay detalles con impuestos, limpiarlos
    if (concepto.noImpuesto && detalles.some((d) => (d.porcentajeImpuesto || 0) > 0)) {
      message.warning('El Concepto no acepta Impuestos, por lo que serán eliminados.');
      setDetalles((prev) =>
        prev.map((d) => calcularFilaPOS({ ...d, porcentajeImpuesto: 0 }))
      );
    }

    // === ConfigurarMoneda ===
    const monedaObj = concepto.moneda || { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' };
    form.setFieldsValue({
      moneda: monedaObj.nombre,
      tasa: monedaObj.codigo === 'DOP' ? 1 : 1,
    });
    // Actualizar data local para que la UI lo refleje
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, moneda: monedaObj };
    });

    // Auto-asignar almacén del concepto si tiene
    if ((concepto as any).almacen) {
      const alm = (concepto as any).almacen;
      setSelectedAlmacen(alm);
      form.setFieldsValue({ almacen: alm.codigo });
    }
  };

  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);

  const handleConceptoClear = () => {
    setSelectedConcepto(null);
    setClientesCache([]);
    form.setFieldsValue({ concepto: '', cliente: undefined });
  };

  const handleConceptoSearchClick = () => {
    setConceptoModalOpen(true);
  };

  // ===== Handlers de detalles =====
  const handleAgregarFila = () => {
    setDetalles((prev) => [{ ...filaVacia(), id: -(prev.length + 1) }, ...prev]);
  };

  const handleEliminarFila = (detalleId: number) => {
    Modal.confirm({
      title: 'Eliminar detalle',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro de eliminar este detalle?',
      okText: 'Sí',
      cancelText: 'No',
      okButtonProps: { danger: true },
      onOk: () => {
        setDetalles((prev) => prev.filter((d) => d.id !== detalleId));
      },
    });
  };

  const handleDetalleUpdateValue = (detalleId: number, field: string, value: any) => {
    setDetalles((prev) =>
      prev.map((d) => (d.id !== detalleId ? d : { ...d, [field]: value }))
    );
  };

  const handleDetalleCalculate = (detalleId: number, field: string, value: any) => {
    setDetalles((prev) =>
      prev.map((d) => {
        if (d.id !== detalleId) return d;
        const updated = { ...d, [field]: value };
        return calcularFilaPOS(updated);
      })
    );
  };

  const handleProductoSelect = (producto: any) => {
    const filaVaciaIdx = detalles.findIndex((d) => !d.codigo);
    if (filaVaciaIdx === -1) {
      const nuevaFila = filaVacia();
      const nuevoId = -(detalles.length + 1);
      setDetalles((prev) => {
        const filled: DetalleFacturaPOSDTO = {
          ...nuevaFila,
          id: nuevoId,
          codigo: producto.codigo,
          articulo: producto.articulo,
          referencia: producto.referencia || '',
          precio: producto.precio || 0,
          familia: producto.familia,
          medida: producto.medida,
          impuesto: producto.impuesto,
          porcentajeImpuesto: producto.impuesto?.porcentaje || 0,
          tieneVencimiento: producto.tieneVencimiento,
        };
        return [calcularFilaPOS(filled), ...prev];
      });
    } else {
      setDetalles((prev) =>
        prev.map((d) => {
          if (d.id !== detalles[filaVaciaIdx].id) return d;
          const filled: DetalleFacturaPOSDTO = {
            ...d,
            codigo: producto.codigo,
            articulo: producto.articulo,
            referencia: producto.referencia || '',
            precio: producto.precio || 0,
            familia: producto.familia,
            medida: producto.medida,
            impuesto: producto.impuesto,
            porcentajeImpuesto: producto.impuesto?.porcentaje || 0,
            tieneVencimiento: producto.tieneVencimiento,
          };
          return calcularFilaPOS(filled);
        })
      );
    }
  };

  // ===== Handlers de cobros =====
  const handleCobroChange = (field: keyof CobroDTO, value: number | null) => {
    setCobros((prev) => ({ ...prev, [field]: value || 0 }));
  };

  // ===== Totales calculados =====
  const totales = {
    subTotal: detalles.reduce((s, d) => s + (d.subTotal || 0), 0),
    descuento: detalles.reduce((s, d) => s + (d.descuento || 0), 0),
    impuestos: detalles.reduce((s, d) => s + (d.impuestos || 0), 0),
    total: detalles.reduce((s, d) => s + (d.total || 0), 0),
  };

  const cobradoTotal =
    (cobros.efectivo || 0) +
    (cobros.cheque || 0) +
    (cobros.transferencia || 0) +
    (cobros.tarjetaCredito || 0) +
    (cobros.tarjetaDebito || 0) +
    (cobros.bono || 0) +
    (cobros.tarjetaRegalo || 0) +
    (cobros.notaCredito || 0);

  const diferencia = Math.round((totales.total - cobradoTotal) * 100) / 100;

  // ===== Columnas de la tabla de asientos =====
  function esDebito(tipo: any): boolean { return tipo === 'D' || tipo === 0; }
  function esCredito(tipo: any): boolean { return tipo === 'C' || tipo === 1; }
  const totalDebitos = (data?.asientos || []).reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
  const totalCreditos = (data?.asientos || []).reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);

  const asientoColumns = [
    { title: 'Cuenta', key: 'cuenta', width: 120,
      render: (_: any, r: AsientoContableDTO) => (r as any).cuentaContable?.noCuenta || '-' },
    { title: 'Nombre', key: 'nombre', ellipsis: true,
      render: (_: any, r: AsientoContableDTO) => (r as any).cuentaContable?.nombre ? toTitleCase((r as any).cuentaContable.nombre) : '-' },
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
      render: (_: any, _record: DetalleFacturaPOSDTO, idx: number) => (
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
      title: 'Precio',
      dataIndex: 'precio',
      key: 'precio',
      width: 130,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
      shouldCellUpdate: (record: DetalleFacturaPOSDTO, prevRecord: DetalleFacturaPOSDTO) => record.precio !== prevRecord.precio || record.porcentajeDescuento !== prevRecord.porcentajeDescuento || record.cantidad !== prevRecord.cantidad || record.medida?.factor !== prevRecord.medida?.factor,
      render: (_: any, record: DetalleFacturaPOSDTO, idx: number) => {
        const precioBase = Number(detalles[idx]?.precio) || 0;
        const pctDesc = Number(detalles[idx]?.porcentajeDescuento) || 0;
        const factor = Number(detalles[idx]?.medida?.factor) || 1;
        const precioConDescuento = precioBase - ((precioBase * pctDesc) / 100);
        const precioUnitario = precioConDescuento / factor;
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
              value={detalles[idx]?.precio}
              onChange={(val) => handleDetalleUpdateValue(detalles[idx].id, 'precio', val || 0)}
              onBlur={() => handleDetalleCalculate(detalles[idx].id, 'precio', detalles[idx]?.precio || 0)}
              onPressEnter={() => handleDetalleCalculate(detalles[idx].id, 'precio', detalles[idx]?.precio || 0)}
            />
            <div style={{ fontSize: 11, lineHeight: 1.5, color: '#999' }}>
              {formatNumber(precioUnitario)} × {factor}
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
      render: (_: any, _record: DetalleFacturaPOSDTO, idx: number) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          min={0}
          max={100}
          step={0.01}
          precision={2}
          value={detalles[idx]?.porcentajeDescuento}
          onChange={(val) => handleDetalleUpdateValue(detalles[idx].id, 'porcentajeDescuento', val || 0)}
          onBlur={() => handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', detalles[idx]?.porcentajeDescuento || 0)}
          onPressEnter={() => handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', detalles[idx]?.porcentajeDescuento || 0)}
          addonAfter="%"
        />
      ),
    },
    {
      title: 'Descuento $',
      key: 'descuento',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: DetalleFacturaPOSDTO) => (
        <div>
          <Text>{formatNumber(record.descuento || 0)}</Text>
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
      render: (_: any, record: DetalleFacturaPOSDTO) => (
        <Text>{formatNumber(record.subTotal || 0)}</Text>
      ),
    },
    {
      title: 'Imp.',
      key: 'impuestos',
      width: 140,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: DetalleFacturaPOSDTO) => (
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
      render: (_: any, record: DetalleFacturaPOSDTO) => (
        <Text strong>{formatNumber(record.total || 0)}</Text>
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 50,
      onCell: () => ({ style: { paddingRight: 8 } }),
      render: (_: any, _record: DetalleFacturaPOSDTO, idx: number) => {
        const items: any[] = [
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

  // ===== Encabezado del formulario =====
  const renderEncabezado = () => (
    <Card className="paces-card" size="small" title="Datos Generales" extra={<EstadoTag estado={estado} periodo={data?.periodo} />} style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={24} xxl={18}>
          <Form form={form} layout="vertical" size="small" style={{ paddingTop: 24 }}>
        <Row gutter={[16, 24]}>
          {/* Fila 1: Concepto */}
          <Col xs={24} sm={12} lg={12}>
            <div ref={conceptoRef}>
              <FloatingField label="Concepto" required>
                <Input
                  placeholder=" "
                  value={selectedConcepto ? toTitleCase(selectedConcepto.nombre) : ''}
                  readOnly
                  suffix={
                    <Space size={4}>
                      <SearchOutlined onClick={handleConceptoSearchClick} style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }} />
                      {selectedConcepto && <ClearOutlined onClick={handleConceptoClear} style={{ cursor: 'pointer' }} />}
                    </Space>
                  }
                  onClick={handleConceptoSearchClick}
                />
              </FloatingField>
            </div>
            <Form.Item name="concepto" hidden><Input /></Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={12}>
            <Form.Item name="turno" style={{ marginBottom: 0 }}>
              <FloatingField label="Turno" required>
                <Input
                  placeholder="Turno POS"
                  value={form.getFieldValue('turno') || 'POS-001'}
                  readOnly
                />
              </FloatingField>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} lg={12}>
            <FloatingField label="Cajero">
              <Input
                placeholder=" "
                value={mode === 'crear' ? (authUser?.nombre || '') : (data?.cajero || '')}
                readOnly
              />
            </FloatingField>
          </Col>
          <Col xs={24} sm={12} lg={12}>
            <FloatingField label="Caja">
              <Input
                placeholder=" "
                value={(() => {
                  const turnoVal = form.getFieldValue('turno') || '';
                  return turnoVal.length >= 3 ? turnoVal.substring(1, 3) : (data?.caja || '');
                })()}
                readOnly
              />
            </FloatingField>
          </Col>

          {conceptoInfo && (
            <Col xs={24}>
              <Text type="warning" style={{ fontSize: 12 }}>{conceptoInfo}</Text>
            </Col>
          )}

          {/* Fila 2: Fecha + Cliente */}
          <Col xs={24} sm={12} lg={8}>
            <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }}>
              <FloatingField label="Fecha Documento" required>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </FloatingField>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={16}>
            <Form.Item name="cliente" required style={{ marginBottom: 0 }}>
              <FloatingField label="Cliente" required>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  onChange={(val) => {
                    const cli = clientesCache.find((e: any) => e.codigo === val);
                    setSelectedCliente(cli || null);
                  }}
                >
                  {clientesCache.map((cli: any) => (
                    <Select.Option key={cli.codigo} value={cli.codigo}>
                      {toTitleCase(cli.nombre)}{cli.identificacion ? ` (${cli.identificacion})` : ''}
                    </Select.Option>
                  ))}
                </Select>
              </FloatingField>
            </Form.Item>
          </Col>

          {/* Fila 3: Almacén */}
          <Col xs={24} sm={12} lg={12}>
            <Form.Item name="almacen" required={tieneProductos} style={{ marginBottom: 0 }}>
              <FloatingField label="Almacén" required={tieneProductos}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="children"
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
          </Col>

          {/* Fila 4: Campos rápidos (NCF, Referencia, Tasa, Días Crédito) */}
          <Col xs={24}>
            <div style={{ marginBottom: 16 }}>
              <Space size={[8, 8]} wrap>
                {/* NCF - readonly */}
                <Tag style={{ fontSize: 14 }}>
                  NCF: {ncfValue || 'Autogenerado'}
                </Tag>

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

                {/* Días Crédito */}
                {editingField === 'diasCredito' ? (
                  <InputNumber
                    size="small"
                    style={{ width: 120 }}
                    min={0}
                    max={365}
                    step={1}
                    placeholder="Días Crédito"
                    autoFocus
                    defaultValue={editingValueRef.current as number}
                    onChange={(val) => { editingValueRef.current = val ?? 0; }}
                    onPressEnter={() => commitFieldEditor()}
                    onBlur={() => commitFieldEditor()}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { e.stopPropagation(); cancelFieldEditor(); }
                    }}
                  />
                ) : (
                  <Tag style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => openFieldEditor('diasCredito')}>
                    {form.getFieldValue('diasCredito') !== undefined && form.getFieldValue('diasCredito') !== null
                      ? `Crédito: ${form.getFieldValue('diasCredito')} días`
                      : <><PlusOutlined /> Días Crédito</>}
                    {form.getFieldValue('diasCredito') !== undefined && form.getFieldValue('diasCredito') !== null && form.getFieldValue('diasCredito') !== '' && <EditOutlined />}
                  </Tag>
                )}
              </Space>
            </div>
            {/* Hidden form items */}
            <Form.Item name="ncf" hidden><Input /></Form.Item>
            <Form.Item name="referencia" hidden><Input /></Form.Item>
            <Form.Item name="tasa" hidden><InputNumber /></Form.Item>
            <Form.Item name="diasCredito" hidden><InputNumber /></Form.Item>
            <Form.Item name="moneda" hidden><Input /></Form.Item>
          </Col>

          {/* Fila 5: Nota */}
          <Col xs={24}>
            <Form.Item name="nota" style={{ marginBottom: 0 }}>
              <FloatingField label="Nota">
                <TextArea rows={3} maxLength={500} />
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

  // ===== Tabla de Cobros =====
  const METODOS_PAGO: { field: keyof CobroDTO; label: string; readonly?: boolean }[] = [
    { field: 'efectivo', label: 'Efectivo' },
    { field: 'cheque', label: 'Cheque' },
    { field: 'transferencia', label: 'Transferencia' },
    { field: 'tarjetaCredito', label: 'Tarjeta Crédito' },
    { field: 'tarjetaDebito', label: 'Tarjeta Débito' },
    { field: 'bono', label: 'Bono', readonly: true },
    { field: 'tarjetaRegalo', label: 'Tarjeta Regalo' },
    { field: 'notaCredito', label: 'Nota Crédito', readonly: true },
  ];

  const renderCobros = () => (
    <div style={{ padding: '8px 0' }}>
      <Row gutter={[16, 16]}>
        {METODOS_PAGO.map((metodo) => (
          <Col xs={12} sm={12} md={8} lg={6} key={metodo.field}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 500 }}>{metodo.label}</label>
              <InputNumber
                size="middle"
                style={{ width: '100%' }}
                min={0}
                step={0.01}
                precision={2}
                value={cobros[metodo.field]}
                onChange={(val) => handleCobroChange(metodo.field, val)}
                readOnly={metodo.readonly}
                disabled={metodo.readonly}
                formatter={(value) => formatNumber(Number(value || 0))}
                parser={(value) => Number(value?.replace(/[^0-9.-]/g, '') || '0')}
              />
              {metodo.readonly && (
                <Text type="secondary" style={{ fontSize: 11 }}>Solo lectura</Text>
              )}
            </div>
          </Col>
        ))}
      </Row>
      <Divider />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 32, fontSize: 15 }}>
        <span>
          <strong>Cobrado:</strong> {formatCurrency(cobradoTotal)}
        </span>
        <span style={{ color: diferencia > 0 ? '#ff4d4f' : '#52c41a' }}>
          <strong>Diferencia:</strong> {formatCurrency(diferencia)}
        </span>
      </div>
    </div>
  );

  const handleRefresh = useCallback(() => {
    if (mode === 'crear') return;
    if (!id) return;
    setLoadingError(false);
    setLoading(true);
    facturaPOSApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        const full: FacturaPOSFormularioDTO = {
          id: res.id, fechaDocumento: res.fechaDocumento, noDocumento: res.noDocumento,
          estado: res.estado, periodo: res.periodo, ncf: res.ncf || '', nota: res.nota || '',
          referencia: res.referencia || '', tasa: res.tasa || 1, diasCredito: res.diasCredito || 0,
          turno: res.turno || '', concepto: res.concepto || null, cliente: res.cliente || null,
          almacen: res.almacen || null, moneda: res.moneda || null, documento: res.documento,
          subTotal: res.subTotal, descuento: res.descuento, impuestos: res.impuestos, total: res.total,
          detalles: (res.detalles || []).map((d: any) => ({
            ...d, porcentajeImpuesto: d.porcentajeImpuesto || (d.impuesto?.porcentaje ?? 0),
            tieneVencimiento: d.tieneVencimiento ?? false,
          })),
          cobros: (res.cobros || cobrosVacios()) as unknown as CobroDTO,
          asientos: res.asientos || [], logs: res.logs || [],
        };
        setData(full); setDetalles(full.detalles); setCobros(full.cobros || cobrosVacios());
        setSelectedConcepto(full.concepto); setSelectedCliente(full.cliente); setSelectedAlmacen(full.almacen);
        const fechaDoc = full.fechaDocumento ? parseDateRaw(full.fechaDocumento) : null;
        form.setFieldsValue({
          concepto: full.concepto?.codigo || '', cliente: full.cliente?.codigo || '',
          almacen: full.almacen?.codigo || '', fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          turno: full.turno || '', ncf: full.ncf || '', referencia: full.referencia || '',
          diasCredito: full.diasCredito || 0, tasa: full.tasa || 1, nota: full.nota || '',
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
          message="Error al cargar formulario de factura POS"
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
        documento="FPV"
      />
      <BuscarProductoModal
        open={productoModalOpen}
        onClose={() => setProductoModalOpen(false)}
        onSelect={handleProductoSelect}
        mode="venta"
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
                  label: `Productos/Servicios (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`,
                  children: (
                    <>
                      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                          <Button
                            icon={<BarcodeOutlined />}
                            onClick={() => setProductoModalOpen(true)}
                          >
                            Scanner
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
                      <Table
                        dataSource={detallesFiltrados}
                        columns={detalleColumns}
                        rowKey="id"
                        size="small"
                        pagination={false}
                        scroll={{ x: 1300 }}
                        locale={{
                          emptyText: (
                            <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Empty description="Sin registros" />
                            </div>
                          ),
                        }}
                      />
                    </>
                  ),
                },
                {
                  key: 'cobros',
                  label: `Cobros`,
                  children: renderCobros(),
                },
                ...(data?.asientos && data.asientos.length > 0
                  ? [{
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
                    }]
                  : []),
                ...(data?.logs && data.logs.length > 0
                  ? [{
                      key: 'historial',
                      label: `Historial (${data?.logs?.length || 0})`,
                      children: (
                        <LogTable dataSource={data?.logs || []} scroll={{ x: 900 }} />
                      ),
                    }]
                  : []),
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
                label: `Productos/Servicios (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`,
                children: (
                  <>
                    <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                    <Table
                      dataSource={detallesFiltrados}
                      columns={detalleColumns}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      scroll={{ x: 1300 }}
                      locale={{
                        emptyText: (
                          <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Empty description="Sin registros" />
                          </div>
                        ),
                      }}
                    />
                  </>
                ),
              },
              {
                key: 'cobros',
                label: 'Cobros',
                children: renderCobros(),
              },
              ...(data?.asientos && data.asientos.length > 0
                ? [{
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
                  }]
                : []),
              ...(data?.logs && data.logs.length > 0
                ? [{
                    key: 'historial',
                    label: `Historial (${data?.logs?.length || 0})`,
                    children: (
                      <LogTable dataSource={data?.logs || []} scroll={{ x: 900 }} />
                    ),
                  }]
                : []),
            ]}
          />

          </div>
      )}
    </div>
  );
};

export default FacturaPOSFormulario;

