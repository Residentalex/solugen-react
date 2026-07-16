import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tag, Spin, Button, Space, Row, Col, Divider, Grid,
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
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { cotizacionVentaApi } from '../../api/cotizacionVentaApi';
import { facturaPOSApi } from '../../api/facturaPOSApi';
import { productoApi } from '../../api/productoApi';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import type { ConceptoDTO, ClienteDTO, DetalleFacturaPOSDTO } from '../../types/facturaPOS';
import type { CotizacionVentaDetalleDTO } from '../../types/cotizacionVenta';
import type { UnidadMedidaDTO } from '../../types/productos';
import LogTable from '../../components/LogTable';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';

import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
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

// ===== Cálculo de fila estándar (sin IVBIS incluido en precio) =====
function calcularFila(fila: DetalleFacturaPOSDTO): DetalleFacturaPOSDTO {
  const cantidad = fila.cantidad || 0;
  const precio = fila.precio || 0;
  const pctDesc = fila.porcentajeDescuento || 0;
  const pctImp = fila.porcentajeImpuesto || 0;

  const subTotal = Math.round(cantidad * precio * 100) / 100;
  const descuento = Math.round(subTotal * (pctDesc / 100) * 100) / 100;
  const impuestos = Math.round(subTotal * (pctImp / 100) * 100) / 100;
  const total = Math.round((subTotal - descuento) * 100) / 100;

  return {
    ...fila,
    cantidad,
    precio,
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



// ===== Componente principal =====
const CotizacionVentaFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const { screenCode, documentCode } = useScreenConfig('FCotizacion');
  const documentoConfig = useDocumentoConfig(sucursalActiva, documentCode);

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<CotizacionVentaDetalleDTO | null>(null);
  const [detalles, setDetalles] = useState<DetalleFacturaPOSDTO[]>([]);
  const [clientesCache, setClientesCache] = useState<any[]>([]);
  const [almacenesCache, setAlmacenesCache] = useState<any[]>([]);
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<ClienteDTO | null>(null);
  const [selectedAlmacen, setSelectedAlmacen] = useState<any | null>(null);
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');
  const [medidasCache, setMedidasCache] = useState<UnidadMedidaDTO[]>([]);

  // ===== Estado para campos rápidos (NCF, Referencia, Tasa) =====
  const [editingField, setEditingField] = useState<string | null>(null);
  const editingOriginalValue = useRef<string | number>('');
  const editingValueRef = useRef<string | number>('');
  const fieldCloseHandledRef = useRef(false);

  // Backup de impuestos para restaurar cuando el concepto deje de ser noImpuesto
  const impuestosBackupRef = useRef<Map<number, { impuesto?: any; porcentajeImpuesto: number }>>(new Map());

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
  const ncfValue = Form.useWatch('ncf', form) || '';
  const refValue = Form.useWatch('referencia', form) || '';
  const tasaValue = Form.useWatch('tasa', form) ?? 1;

  const sinOC = true;
  const isLarge = screens.xxl === true;

  // ===== Determinar estado =====
  const estado = toEstadoNum(data?.estado);
  const esCerrado = data?.periodo === 6;
  const esBorrador = estado === 0;
  const esAnulado = estado === 3;

  // ===== Determinar si almacén es obligatorio =====
  const tieneProductos = detalles.some((d) => d.tipoArticulo === 'P' || d.tipoArticulo === 'Producto');

  // ===== Cargar datos de apoyo al montar =====
  useEffect(() => {
    setActiveModule(screenCode);
    const pageTitle = mode === 'crear' ? 'Nueva Cotización' : 'Editar Cotización';
    setPageTitleOverride(pageTitle);

    // Cargar almacenes
    facturaPOSApi.obtenerAlmacenes(sucursalActiva).then(setAlmacenesCache).catch((err) => console.warn('Error al cargar almacenes cache', err));
    unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch((err) => console.warn('Error al cargar medidas cache', err));

    // Inicializar valores por defecto en modo crear
    if (mode === 'crear') {
      form.setFieldsValue({
        fechaDocumento: dayjs(),
        tasa: 1,
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
    cotizacionVentaApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res: any) => {
        setData(res);
        const detallesMapeados: DetalleFacturaPOSDTO[] = (res.detalles || []).map((d: any) => ({
          id: d.id,
          codigo: d.codigo || '',
          articulo: d.articulo || '',
          referencia: d.referencia || '',
          cantidad: d.cantidad || 0,
          costo: d.costo || 0,
          precio: d.precio || 0,
          subTotal: d.subTotal || 0,
          porcentajeDescuento: d.porcentajeDescuento || 0,
          descuento: d.descuento || 0,
          porcentajeImpuesto: d.porcentajeImpuesto || (d.impuesto?.porcentaje ?? 0),
          impuestos: d.impuestos || 0,
          total: d.total || 0,
          tipoArticulo: d.tipoArticulo || 'Producto',
          tieneVencimiento: d.tieneVencimiento ?? false,
          idTransaccion: d.idTransaccion || 0,
          impuesto: d.impuesto,
          familia: d.familia,
          medida: d.medida,
        }));
        setDetalles(detallesMapeados);
        setSelectedConcepto(res.concepto || null);
        setSelectedAlmacen(res.almacen || null);

        // Buscar cliente en cache o asignar desde entidad
        const clienteObj: ClienteDTO = {
          nombre: res.entidad?.nombre || res.cliente || '',
          codigo: res.entidad?.codigo || '',
          identificacion: res.entidad?.identificacion || '',
          telefono: res.entidad?.telefono || '',
          direccion: res.entidad?.direccion || '',
        };
        setSelectedCliente(clienteObj);

        const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;

        form.setFieldsValue({
          concepto: res.concepto?.codigo || '',
          cliente: res.entidad?.codigo || '',
          almacen: res.almacen?.codigo || '',
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          ncf: res.ncf || '',
          referencia: res.referencia || '',
          tasa: res.tasa || 1,
          nota: res.nota || '',
        });

        if (res.concepto?.codigo) {
          // Cargar clientes para el select
          facturaPOSApi.obtenerClientes(sucursalActiva)
            .then(setClientesCache)
            .catch((err) => console.warn('Error al cargar clientes cache en editar', err));
        }
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar la cotización';
        message.error(msg);
        setLoadingError(true);
        navigate('/FCotizacion', { replace: true });
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
          navigate('/FCotizacion', { replace: true });
        } else if (id) {
          navigate(`/FCotizacion/${id}`, { replace: true });
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

    if (detalles.length === 0) return 'No se puede crear una cotización sin detalle.';
    if (!detalles.some((d) => (d.cantidad || 0) > 0)) return 'Debe tener al menos un detalle con cantidad > 0';

    return null;
  };

  // Construir DTO desde el formulario
  const construirDTO = (): any => {
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
      subTotal: Math.round(totalSub * 100) / 100,
      descuento: Math.round(totalDesc * 100) / 100,
      impuestos: Math.round(totalImp * 100) / 100,
      total: Math.round(total * 100) / 100,
      documento: base.documento || { codigo: documentCode },
      concepto: selectedConcepto || { nombre: '', codigo: '' },
      moneda: base.moneda || getMonedaSucursalActiva(),
      almacen: selectedAlmacen || { nombre: '', codigo: '' },
      cliente: clienteSel?.nombre || '',
      entidad: clienteSel ? {
        nombre: clienteSel.nombre,
        codigo: clienteSel.codigo,
        identificacion: clienteSel.identificacion,
        telefono: clienteSel.telefono || '',
        direccion: clienteSel.direccion || '',
      } : { nombre: '', codigo: '', identificacion: '' },
      detalles: detalles.map((d) => calcularFila(d)),
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
        const result = await cotizacionVentaApi.crear(sucursalActiva, dto);
        message.success('Cotización creada exitosamente');
        navigate(`/FCotizacion/${result.id}`, { replace: true });
      } else {
        await cotizacionVentaApi.actualizar(sucursalActiva, parseInt(id!), dto);
        message.success('Cotización actualizada exitosamente');
        navigate(`/FCotizacion/${id}`, { replace: true });
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

    // Cargar clientes
    facturaPOSApi.obtenerClientes(sucursalActiva)
      .then((ents) => setClientesCache(ents))
      .catch((err) => console.warn('Error al cargar clientes cache al cambiar concepto', err));

    // Si el concepto es NoImpuesto y hay detalles con impuestos, limpiarlos
    const prevNoImpuesto = selectedConcepto?.noImpuesto;

    if (concepto.noImpuesto) {
      const hayImpuestos = detalles.some((d) => (d.porcentajeImpuesto || 0) > 0);
      if (hayImpuestos) {
        const backup = new Map<number, { impuesto?: any; porcentajeImpuesto: number }>();
        detalles.forEach((d) => {
          if ((d.porcentajeImpuesto || 0) > 0) {
            backup.set(d.id, { impuesto: d.impuesto, porcentajeImpuesto: d.porcentajeImpuesto || 0 });
          }
        });
        impuestosBackupRef.current = backup;

        message.warning('El Concepto no acepta Impuestos, por lo que serán eliminados.');
        setDetalles((prev) =>
          prev.map((d) => calcularFila({ ...d, porcentajeImpuesto: 0, impuesto: undefined }))
        );
      }
    } else if (prevNoImpuesto && !concepto.noImpuesto) {
      const backup = impuestosBackupRef.current;
      if (backup.size > 0) {
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
          modificaPrecio: producto.modificaPrecio ?? false,
          modificaDescripcion: producto.modificaDescripcion ?? false,
        };
        return [calcularFila(filled), ...prev];
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

  // ===== Columnas de la tabla de asientos =====
  function esDebito(tipo: any): boolean { return tipo === 'D' || tipo === 0; }
  function esCredito(tipo: any): boolean { return tipo === 'C' || tipo === 1; }
  const totalDebitos = (data?.asientos || []).reduce((s: number, r: any) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
  const totalCreditos = (data?.asientos || []).reduce((s: number, r: any) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);

  const asientoColumns = [
    { title: 'Cuenta', key: 'cuenta', width: 120,
      render: (_: any, r: any) => (r as any).cuentaContable?.noCuenta || '-' },
    { title: 'Nombre', key: 'nombre', ellipsis: true,
      render: (_: any, r: any) => (r as any).cuentaContable?.nombre ? toTitleCase((r as any).cuentaContable.nombre) : '-' },
    { title: 'Descripcion', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true,
      render: (v: string) => v ? toTitleCase(v) : '-' },
    { title: 'Debito', key: 'debito', width: 130, align: 'right' as const,
      render: (_: any, r: any) => esDebito(r.tipoAsiento) ? formatNumber(r.monto) : '' },
    { title: 'Credito', key: 'credito', width: 130, align: 'right' as const,
      render: (_: any, r: any) => esCredito(r.tipoAsiento) ? formatNumber(r.monto) : '' },
  ];

  const handleRefresh = useCallback(() => {
    if (mode === 'crear') return;
    if (!id) return;
    setLoadingError(false);
    setLoading(true);
    cotizacionVentaApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res: any) => {
        setData(res);
        const detallesMapeados: DetalleFacturaPOSDTO[] = (res.detalles || []).map((d: any) => ({
          id: d.id, codigo: d.codigo || '', articulo: d.articulo || '', referencia: d.referencia || '',
          cantidad: d.cantidad || 0, costo: d.costo || 0, precio: d.precio || 0,
          subTotal: d.subTotal || 0, porcentajeDescuento: d.porcentajeDescuento || 0,
          descuento: d.descuento || 0, porcentajeImpuesto: d.porcentajeImpuesto || (d.impuesto?.porcentaje ?? 0),
          impuestos: d.impuestos || 0, total: d.total || 0, tipoArticulo: d.tipoArticulo || 'Producto',
          tieneVencimiento: d.tieneVencimiento ?? false, idTransaccion: d.idTransaccion || 0,
          impuesto: d.impuesto, familia: d.familia, medida: d.medida,
        }));
        setDetalles(detallesMapeados);
        setSelectedConcepto(res.concepto || null);
        setSelectedAlmacen(res.almacen || null);
        const clienteObj: ClienteDTO = {
          nombre: res.entidad?.nombre || res.cliente || '', codigo: res.entidad?.codigo || '',
          identificacion: res.entidad?.identificacion || '', telefono: res.entidad?.telefono || '',
          direccion: res.entidad?.direccion || '',
        };
        setSelectedCliente(clienteObj);
        const fechaDoc = res.fechaDocumento ? parseDateRaw(res.fechaDocumento) : null;
        form.setFieldsValue({
          concepto: res.concepto?.codigo || '', cliente: res.entidad?.codigo || '',
          almacen: res.almacen?.codigo || '', fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          ncf: res.ncf || '', referencia: res.referencia || '', tasa: res.tasa || 1, nota: res.nota || '',
        });
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, form, mode]);

  // ===== Loading state =====
  if (loading) {
    return <LoadingSpinner mensaje="Cargando cotización..." />;
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
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      key: 'precio',
      width: 130,
      align: 'right' as const,
      responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
      shouldCellUpdate: (record: DetalleFacturaPOSDTO, prevRecord: DetalleFacturaPOSDTO) => record.precio !== prevRecord.precio || record.porcentajeDescuento !== prevRecord.porcentajeDescuento || record.cantidad !== prevRecord.cantidad || record.medida?.factor !== prevRecord.medida?.factor || record.modificaPrecio !== prevRecord.modificaPrecio,
      render: (_: any, _record: DetalleFacturaPOSDTO, idx: number) => {
        const fila = detalles[idx];
        if (!fila) return null;
        const precioBase = Number(fila.precio) || 0;
        const pctDesc = Number(fila.porcentajeDescuento) || 0;
        const factor = Number(fila.medida?.factor) || 1;
        const precioConDescuento = precioBase - ((precioBase * pctDesc) / 100);
        const precioUnitario = precioConDescuento / factor;
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
            <Text>{formatCurrency(precioBase)}</Text>
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
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      width: 90,
      align: 'right' as const,
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
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      width: 120,
      align: 'right' as const,
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
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      key: 'subTotal',
      width: 120,
      align: 'right' as const,
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: DetalleFacturaPOSDTO) => (
        <Text>{formatNumber(record.subTotal || 0)}</Text>
      ),
    },
    {
      title: 'Imp.',
      key: 'impuestos',
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      width: 140,
      align: 'right' as const,
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
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      key: 'total',
      width: 120,
      align: 'right' as const,
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
            <div>
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
              <ConceptoInfoLabel concepto={selectedConcepto} />
            </div>
            <Form.Item name="concepto" hidden><Input /></Form.Item>
          </Col>

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

          {/* Fila 4: Campos rápidos (NCF, Referencia, Tasa) */}
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
              </Space>
            </div>
            {/* Hidden form items */}
            <Form.Item name="ncf" hidden><Input /></Form.Item>
            <Form.Item name="referencia" hidden><Input /></Form.Item>
            <Form.Item name="tasa" hidden><InputNumber /></Form.Item>
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
              monedaSimbolo={data?.moneda?.simbolo || selectedConcepto?.moneda?.simbolo || getMonedaSucursalActiva().simbolo}
              monedaNombre={data?.moneda?.nombre || selectedConcepto?.moneda?.nombre || getMonedaSucursalActiva().nombre}
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
          message="Error al cargar formulario de cotización de venta"
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
        documento="COT"
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

            {/* Tab Details / Asientos / Historial */}
            {(() => {
              const tabItems: any[] = [
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
                        </Space>
                        <Input.Search
                          placeholder="Buscar detalle..."
                          allowClear
                          style={{ maxWidth: 250 }}
                          onSearch={(value) => setDetalleSearch(value)}
                          onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                        />
                      </div>
                      {(documentoConfig?.modificaPrecio === false || documentoConfig?.modificaDescripcion === false) && detalles.length > 0 && (
                        <CamposRestringidosAlert
                          modificaPrecio={documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio}
                          modificaDescripcion={documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion}
                        />
                      )}
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
              ];

              if (data?.asientos && data.asientos.length > 0) {
                tabItems.push({
                  key: 'asientos',
                  label: `Asientos (${data.asientos.length})`,
                  children: (
                    <Table
                      dataSource={data.asientos}
                      columns={asientoColumns}
                      rowKey={(r: any) => r.id || r.asientoID}
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
                });
              }

              if (data?.logs && data.logs.length > 0) {
                tabItems.push({
                  key: 'historial',
                  label: `Historial (${data.logs.length})`,
                  children: (
                    <LogTable dataSource={data.logs} scroll={{ x: 900 }} />
                  ),
                });
              }

              return (
                <div style={{ borderRadius: 8, padding: '0 16px' }}>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>Detalles</div>
                  {tabItems[0].children}
                  {tabItems.length > 1 && tabItems.slice(1).map((item) => (
                    <div key={item.key} style={{ marginTop: 16 }}>
                      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{item.label}</div>
                      {item.children}
                    </div>
                  ))}
                </div>
              );
            })()}
          </Col>

          </Row>
      ) : (
        /* === MOBILE LAYOUT (< lg) === */
        <div>
          {renderEncabezado()}

          {/* Detalles mobile */}
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
          {(documentoConfig?.modificaPrecio === false || documentoConfig?.modificaDescripcion === false) && detalles.length > 0 && (
            <CamposRestringidosAlert
              modificaPrecio={documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio}
              modificaDescripcion={documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion}
            />
          )}
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

          </div>
      )}
    </div>
  );
};

export default CotizacionVentaFormulario;

