import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Dropdown, Alert, Empty, } from 'antd';
import { SaveOutlined, CloseOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, ClearOutlined, ExclamationCircleOutlined, EditOutlined, MoreOutlined, BarcodeOutlined, CreditCardOutlined, FileTextOutlined, } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { facturaPOSApi } from '../../api/facturaPOSApi';
import { devolucionVentaApi } from '../../api/devolucionVentaApi';
import { productoApi } from '../../api/productoApi';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import { visanetApi } from '../../api/visanetApi';
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
// ===== Cálculo de fila POS (Precio incluye ITBIS) =====
function calcularFilaPOS(fila) {
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
function filaVacia() {
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
function cobrosVacios() {
    return {
        efectivo: 0,
        cheque: 0,
        transferencia: 0,
        tarjetaCredito: 0,
        tarjetaDebito: 0,
        bono: 0,
        tarjetaRegalo: 0,
        notaCredito: 0,
        documentosAsociados: [],
    };
}
// ===== Componente principal =====
const FacturaPOSFormulario = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const authUser = useAuthStore((s) => s.usuario);
    const clienteDefectoPOS = useAuthStore((s) => s.clienteDefectoPOS);
    const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const screens = Grid.useBreakpoint();
    const mode = id ? 'editar' : 'crear';
    const { screenCode, documentCode } = useScreenConfig('FPV');
    const documentoConfig = useDocumentoConfig(sucursalActiva, documentCode);
    // ===== States =====
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState(null);
    const [detalles, setDetalles] = useState([]);
    const [cobros, setCobros] = useState(cobrosVacios());
    const [clientesCache, setClientesCache] = useState([]);
    const [almacenesCache, setAlmacenesCache] = useState([]);
    const [selectedConcepto, setSelectedConcepto] = useState(null);
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [selectedAlmacen, setSelectedAlmacen] = useState(null);
    const [productoModalOpen, setProductoModalOpen] = useState(false);
    const [detalleSearch, setDetalleSearch] = useState('');
    const [medidasCache, setMedidasCache] = useState([]);
    const [visanetModalOpen, setVisanetModalOpen] = useState(false);
    const [visanetProcessing, setVisanetProcessing] = useState(false);
    const [visanetResult, setVisanetResult] = useState(null);
    // ===== Estados para selección NC/DEV =====
    const [ncModalOpen, setNcModalOpen] = useState(false);
    const [ncDocumentosDisponibles, setNcDocumentosDisponibles] = useState([]);
    const [ncDocsSeleccionados, setNcDocsSeleccionados] = useState([]);
    const [loadingNC, setLoadingNC] = useState(false);
    // Refs para la guía
    const conceptoRef = useRef(null);
    // ===== Estado para campos rápidos (NCF, Referencia, Tasa, Días Crédito) =====
    const [editingField, setEditingField] = useState(null);
    const editingOriginalValue = useRef('');
    const editingValueRef = useRef('');
    const fieldCloseHandledRef = useRef(false);
    // Backup de impuestos para restaurar cuando el concepto deje de ser noImpuesto
    const impuestosBackupRef = useRef(new Map());
    const openFieldEditor = (field) => {
        const val = form.getFieldValue(field);
        const defaultVal = field === 'tasa' ? 1 : field === 'diasCredito' ? 0 : '';
        editingOriginalValue.current = val ?? defaultVal;
        editingValueRef.current = val ?? defaultVal;
        setEditingField(field);
        fieldCloseHandledRef.current = false;
    };
    const commitFieldEditor = () => {
        if (fieldCloseHandledRef.current)
            return;
        fieldCloseHandledRef.current = true;
        const field = editingField;
        if (field) {
            form.setFieldsValue({ [field]: editingValueRef.current });
        }
        setEditingField(null);
    };
    const cancelFieldEditor = () => {
        if (fieldCloseHandledRef.current)
            return;
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
        setActiveModule(screenCode);
        const pageTitle = mode === 'crear' ? 'Nueva Factura POS' : 'Editar Factura POS';
        setPageTitleOverride(pageTitle);
        // Cargar almacenes
        facturaPOSApi.obtenerAlmacenes(sucursalActiva).then(setAlmacenesCache).catch((err) => console.warn('Error al cargar almacenes cache', err));
        unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch((err) => console.warn('Error al cargar medidas cache', err));
        // Inicializar valores por defecto en modo crear
        if (mode === 'crear') {
            form.setFieldsValue({
                fechaDocumento: dayjs(),
                tasa: 1,
                diasCredito: 0,
                turno: 'POS-001', // Placeholder: vendrá del contexto de caja
            });
            // Pre-seleccionar cliente por defecto POS si existe
            if (clienteDefectoPOS && !selectedCliente) {
                facturaPOSApi.obtenerClientes(sucursalActiva).then((clientes) => {
                    setClientesCache(clientes);
                    const match = clientes.find((c) => c.codigo === clienteDefectoPOS.codigo);
                    if (match) {
                        setSelectedCliente(match);
                        form.setFieldsValue({ cliente: match.codigo });
                    }
                }).catch((err) => console.warn('Error al precargar cliente por defecto POS', err));
            }
        }
        return () => {
            resetToolbar();
            setPageTitleOverride('');
        };
    }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, sucursalActiva, form, clienteDefectoPOS, selectedCliente]);
    // ===== Cargar datos si es modo editar =====
    useEffect(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoading(true);
        facturaPOSApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            const full = {
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
                cobros: (res.cobros || cobrosVacios()),
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
                    .catch((err) => console.warn('Error al cargar clientes cache en editar', err));
            }
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
            message.error(msg);
            setLoadingError(true);
            navigate('/FPV', { replace: true });
        })
            .finally(() => setLoading(false));
    }, [mode, id, sucursalActiva, form, navigate]);
    // ===== Handlers =====
    const handleCancelar = () => {
        Modal.confirm({
            title: 'Cancelar',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: '¿Está seguro que desea cancelar los cambios realizados?',
            okText: 'Sí, cancelar',
            cancelText: 'No, continuar editando',
            okButtonProps: { danger: true },
            onOk: () => {
                setEditingField(null);
                if (mode === 'crear') {
                    navigate('/FPV', { replace: true });
                }
                else if (id) {
                    navigate(`/FPV/${id}`, { replace: true });
                }
            },
        });
    };
    // Validación del formulario
    const validarFormulario = () => {
        const values = form.getFieldsValue();
        if (!selectedConcepto)
            return 'Debe elegir un Concepto para poder continuar';
        if (!values.cliente && !selectedCliente)
            return 'Debe elegir un Cliente para poder continuar';
        if (tieneProductos && !selectedAlmacen && !values.almacen)
            return 'Debe elegir un Almacén (hay productos en los detalles)';
        const fechaDoc = values.fechaDocumento;
        if (fechaDoc) {
            const hoy = dayjs().endOf('day');
            if (dayjs(fechaDoc).isAfter(hoy)) {
                return 'La fecha del documento no puede ser mayor a hoy';
            }
        }
        if (detalles.length === 0)
            return 'No se puede crear una factura sin detalle.';
        if (!detalles.some((d) => (d.cantidad || 0) > 0))
            return 'Debe tener al menos un detalle con cantidad > 0';
        return null;
    };
    // Construir DTO desde el formulario
    const construirDTO = () => {
        const values = form.getFieldsValue();
        const base = data || {};
        const clienteSel = clientesCache.find((e) => e.codigo === values.cliente) || selectedCliente;
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
            documento: base.documento || { codigo: documentCode },
            concepto: selectedConcepto || { nombre: '', codigo: '' },
            moneda: base.moneda || getMonedaSucursalActiva(),
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
                navigate(`/FPV/${result.id}`, { replace: true });
            }
            else {
                await facturaPOSApi.actualizar(sucursalActiva, dto);
                message.success('Factura POS actualizada exitosamente');
                navigate(`/FPV/${id}`, { replace: true });
            }
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al guardar');
            message.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    // ===== Handlers de concepto =====
    const handleConceptoSelect = (concepto) => {
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
            if (!prev)
                return prev;
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
                const backup = new Map();
                detalles.forEach((d) => {
                    if ((d.porcentajeImpuesto || 0) > 0) {
                        backup.set(d.id, { impuesto: d.impuesto, porcentajeImpuesto: d.porcentajeImpuesto || 0 });
                    }
                });
                impuestosBackupRef.current = backup;
                message.warning('El Concepto no acepta Impuestos, por lo que serán eliminados.');
                setDetalles((prev) => prev.map((d) => calcularFilaPOS({ ...d, porcentajeImpuesto: 0, impuesto: undefined })));
            }
        }
        else if (prevNoImpuesto && !concepto.noImpuesto) {
            const backup = impuestosBackupRef.current;
            if (backup.size > 0) {
                setDetalles((prev) => prev.map((d) => {
                    const saved = backup.get(d.id);
                    if (saved) {
                        return calcularFilaPOS({ ...d, impuesto: saved.impuesto, porcentajeImpuesto: saved.porcentajeImpuesto });
                    }
                    return d;
                }));
                impuestosBackupRef.current = new Map();
            }
        }
        // Auto-asignar almacén del concepto si tiene
        if (concepto.almacen) {
            const alm = concepto.almacen;
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
    const handleEliminarFila = (detalleId) => {
        Modal.confirm({
            title: 'Eliminar detalle',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: '¿Está seguro de eliminar este detalle?',
            okText: 'Sí',
            cancelText: 'No',
            okButtonProps: { danger: true },
            onOk: () => {
                setDetalles((prev) => prev.filter((d) => d.id !== detalleId));
            },
        });
    };
    const handleDetalleUpdateValue = (detalleId, field, value) => {
        setDetalles((prev) => prev.map((d) => (d.id !== detalleId ? d : { ...d, [field]: value })));
    };
    const handleDetalleCalculate = (detalleId, field, value) => {
        setDetalles((prev) => prev.map((d) => {
            if (d.id !== detalleId)
                return d;
            const updated = { ...d, [field]: value };
            return calcularFilaPOS(updated);
        }));
    };
    const handleProductoSelect = (producto) => {
        const filaVaciaIdx = detalles.findIndex((d) => !d.codigo);
        if (filaVaciaIdx === -1) {
            const nuevaFila = filaVacia();
            const nuevoId = -(detalles.length + 1);
            setDetalles((prev) => {
                const filled = {
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
                return [calcularFilaPOS(filled), ...prev];
            });
        }
        else {
            setDetalles((prev) => prev.map((d) => {
                if (d.id !== detalles[filaVaciaIdx].id)
                    return d;
                const filled = {
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
                return calcularFilaPOS(filled);
            }));
        }
    };
    // ===== Handlers de cobros =====
    const handleCobroChange = (field, value) => {
        setCobros((prev) => {
            // Si se edita notaCredito manualmente, limpiar documentos asociados
            if (field === 'notaCredito') {
                return { ...prev, notaCredito: value || 0, documentosAsociados: [] };
            }
            return { ...prev, [field]: value || 0 };
        });
    };
    // ===== Handler para pago con tarjeta Visanet ECRT =====
    const handlePagarConTarjeta = async () => {
        const dto = construirDTO();
        if (!dto.id && mode !== 'editar') {
            message.warning('Debe guardar la factura primero antes de procesar el pago con tarjeta');
            return;
        }
        const idFactura = dto.id || 0;
        if (!idFactura) {
            message.warning('La factura debe estar creada para procesar el pago');
            return;
        }
        setVisanetResult(null);
        setVisanetModalOpen(true);
        setVisanetProcessing(true);
        try {
            // El monto va directo en pesos (el backend lo convierte a centavos)
            const response = await visanetApi.vender(sucursalActiva, idFactura, totales.total);
            setVisanetResult(response);
            if (response.exitoso) {
                // Si la transacción fue exitosa, llenar el cobro con tarjeta
                const montoPagado = parseFloat(response.totalAmount || '0');
                setCobros((prev) => ({
                    ...prev,
                    tarjetaCredito: (prev.tarjetaCredito || 0) + montoPagado,
                }));
                message.success(`Pago aprobado: ${response.autorizacion}`);
            }
            else {
                message.error(response.mensajeRespuesta || 'Transacción rechazada');
            }
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al comunicar con el terminal');
            message.error(msg);
            setVisanetResult({ exitoso: false, mensajeRespuesta: msg });
        }
        finally {
            setVisanetProcessing(false);
        }
    };
    // ===== Handler para seleccionar NC / Devoluciones =====
    const handleAbrirSelectorNC = async () => {
        if (!selectedCliente?.codigo) {
            message.warning('Debe seleccionar un cliente primero');
            return;
        }
        try {
            setLoadingNC(true);
            const result = await devolucionVentaApi.filtrar(sucursalActiva, {
                cliente: selectedCliente.codigo,
                cantidad: 50,
                salto: 0,
            });
            // Filtrar solo documentos no anulados
            const disponibles = (result.data || []).filter((d) => (d.estado || '').toUpperCase() !== 'ANULADO');
            setNcDocumentosDisponibles(disponibles);
            setNcDocsSeleccionados([]);
            setNcModalOpen(true);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al cargar NC disponibles');
            message.error(msg);
        }
        finally {
            setLoadingNC(false);
        }
    };
    // ===== Totales calculados =====
    const totales = {
        subTotal: detalles.reduce((s, d) => s + (d.subTotal || 0), 0),
        descuento: detalles.reduce((s, d) => s + (d.descuento || 0), 0),
        impuestos: detalles.reduce((s, d) => s + (d.impuestos || 0), 0),
        total: detalles.reduce((s, d) => s + (d.total || 0), 0),
    };
    const cobradoTotal = (cobros.efectivo || 0) +
        (cobros.cheque || 0) +
        (cobros.transferencia || 0) +
        (cobros.tarjetaCredito || 0) +
        (cobros.tarjetaDebito || 0) +
        (cobros.bono || 0) +
        (cobros.tarjetaRegalo || 0) +
        (cobros.notaCredito || 0);
    const diferencia = Math.round((totales.total - cobradoTotal) * 100) / 100;
    // ===== Columnas de la tabla de asientos =====
    function esDebito(tipo) { return tipo === 'D' || tipo === 0; }
    function esCredito(tipo) { return tipo === 'C' || tipo === 1; }
    const totalDebitos = (data?.asientos || []).reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
    const totalCreditos = (data?.asientos || []).reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);
    const asientoColumns = [
        { title: 'Cuenta', key: 'cuenta', width: 120,
            render: (_, r) => r.cuentaContable?.noCuenta || '-' },
        { title: 'Nombre', key: 'nombre', ellipsis: true,
            render: (_, r) => r.cuentaContable?.nombre ? toTitleCase(r.cuentaContable.nombre) : '-' },
        { title: 'Descripcion', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true,
            render: (v) => v ? toTitleCase(v) : '-' },
        { title: 'Debito', key: 'debito', width: 130, align: 'right',
            render: (_, r) => esDebito(r.tipoAsiento) ? formatNumber(r.monto) : '' },
        { title: 'Credito', key: 'credito', width: 130, align: 'right',
            render: (_, r) => esCredito(r.tipoAsiento) ? formatNumber(r.monto) : '' },
    ];
    const handleRefresh = useCallback(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoadingError(false);
        setLoading(true);
        facturaPOSApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            const full = {
                id: res.id, fechaDocumento: res.fechaDocumento, noDocumento: res.noDocumento,
                estado: res.estado, periodo: res.periodo, ncf: res.ncf || '', nota: res.nota || '',
                referencia: res.referencia || '', tasa: res.tasa || 1, diasCredito: res.diasCredito || 0,
                turno: res.turno || '', concepto: res.concepto || null, cliente: res.cliente || null,
                almacen: res.almacen || null, moneda: res.moneda || null, documento: res.documento,
                subTotal: res.subTotal, descuento: res.descuento, impuestos: res.impuestos, total: res.total,
                detalles: (res.detalles || []).map((d) => ({
                    ...d, porcentajeImpuesto: d.porcentajeImpuesto || (d.impuesto?.porcentaje ?? 0),
                    tieneVencimiento: d.tieneVencimiento ?? false,
                })),
                cobros: (res.cobros || cobrosVacios()),
                asientos: res.asientos || [], logs: res.logs || [],
            };
            setData(full);
            setDetalles(full.detalles);
            setCobros(full.cobros || cobrosVacios());
            setSelectedConcepto(full.concepto);
            setSelectedCliente(full.cliente);
            setSelectedAlmacen(full.almacen);
            const fechaDoc = full.fechaDocumento ? parseDateRaw(full.fechaDocumento) : null;
            form.setFieldsValue({
                concepto: full.concepto?.codigo || '', cliente: full.cliente?.codigo || '',
                almacen: full.almacen?.codigo || '', fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
                turno: full.turno || '', ncf: full.ncf || '', referencia: full.referencia || '',
                diasCredito: full.diasCredito || 0, tasa: full.tasa || 1, nota: full.nota || '',
            });
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al recargar';
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, form, mode]);
    // ===== Loading state =====
    if (loading) {
        return _jsx(LoadingSpinner, { mensaje: "Cargando documento..." });
    }
    // ===== Estado info =====
    const estadoInfo = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Borrador', color: 'default' };
    // ===== Grid de detalles editable =====
    const detalleColumns = [
        {
            title: 'Código',
            key: 'codigo',
            width: 120,
            fixed: 'left',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx("div", { children: record.codigo || '-' }), record.referencia && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5 }, children: record.referencia }))] })),
        },
        {
            title: 'Artículo',
            key: 'articulo',
            ellipsis: true,
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, _record, idx) => {
                const fila = detalles[idx];
                if (!fila)
                    return null;
                const docPermiteDesc = documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion ?? true;
                if (docPermiteDesc) {
                    return (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx(Input, { size: "small", style: { width: '100%' }, value: fila.articulo || '', onChange: (e) => handleDetalleUpdateValue(fila.id, 'articulo', e.target.value) }), _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }, children: [fila.familia?.nombre ? _jsx(Tag, { style: { fontSize: 11, lineHeight: '18px', padding: '0 6px' }, children: toTitleCase(fila.familia.nombre) }) : null, fila.fechaVencimiento && _jsxs("span", { children: ["V: ", formatDate(fila.fechaVencimiento)] })] })] }));
                }
                return (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx("div", { children: toTitleCase(fila.articulo || '') }), _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }, children: [fila.familia?.nombre ? _jsx(Tag, { style: { fontSize: 11, lineHeight: '18px', padding: '0 6px' }, children: toTitleCase(fila.familia.nombre) }) : null, fila.fechaVencimiento && _jsxs("span", { children: ["V: ", formatDate(fila.fechaVencimiento)] })] })] }));
            },
        },
        {
            title: 'Cantidad',
            dataIndex: 'cantidad',
            key: 'cantidad',
            width: 100,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, _record, idx) => (_jsxs("div", { children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0.01, step: 0.01, precision: 2, controls: false, value: detalles[idx]?.cantidad, onChange: (val) => handleDetalleUpdateValue(detalles[idx].id, 'cantidad', val || 0), onBlur: () => handleDetalleCalculate(detalles[idx].id, 'cantidad', detalles[idx]?.cantidad || 0), onPressEnter: () => handleDetalleCalculate(detalles[idx].id, 'cantidad', detalles[idx]?.cantidad || 0) }), detalles[idx]?.medida?.nombre && !sinOC && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5, marginTop: 2 }, children: toTitleCase(detalles[idx].medida.nombre) }))] })),
        },
        ...(sinOC ? [{
                title: 'Medida',
                key: 'medida',
                width: 160,
                onCell: () => ({ style: { verticalAlign: 'top' } }),
                render: (_, record, _idx) => {
                    const curId = record.medida?.idExterno;
                    const hasMatch = medidasCache.some((m) => m.idExterno === curId);
                    return (_jsx(Select, { size: "small", style: { width: '100%' }, value: hasMatch ? curId : undefined, onChange: (idExterno) => {
                            const medida = medidasCache.find((m) => m.idExterno === idExterno);
                            if (medida) {
                                handleDetalleCalculate(record.id, 'medida', {
                                    nombre: medida.nombre,
                                    codigo: medida.codigo,
                                    factor: medida.factor,
                                    idExterno: medida.idExterno,
                                });
                            }
                        }, children: medidasCache.map((m) => (_jsx(Select.Option, { value: m.idExterno, children: toTitleCase(m.nombre || '') }, m.idExterno ?? 0))) }, medidasCache.length));
                },
            }] : []),
        {
            title: 'Precio',
            dataIndex: 'precio',
            key: 'precio',
            width: 130,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['md', 'lg', 'xl', 'xxl'],
            shouldCellUpdate: (record, prevRecord) => record.precio !== prevRecord.precio || record.porcentajeDescuento !== prevRecord.porcentajeDescuento || record.cantidad !== prevRecord.cantidad || record.medida?.factor !== prevRecord.medida?.factor || record.modificaPrecio !== prevRecord.modificaPrecio,
            render: (_, _record, idx) => {
                const fila = detalles[idx];
                if (!fila)
                    return null;
                const precioBase = Number(fila.precio) || 0;
                const pctDesc = Number(fila.porcentajeDescuento) || 0;
                const factor = Number(fila.medida?.factor) || 1;
                const precioConDescuento = precioBase - ((precioBase * pctDesc) / 100);
                const precioUnitario = precioConDescuento / factor;
                const docPermiteEditar = documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio ?? true;
                if (docPermiteEditar) {
                    return (_jsxs("div", { children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, step: 0.01, precision: 2, controls: false, value: fila.precio, onChange: (val) => handleDetalleUpdateValue(fila.id, 'precio', val || 0), onBlur: () => handleDetalleCalculate(fila.id, 'precio', fila.precio || 0), onPressEnter: () => handleDetalleCalculate(fila.id, 'precio', fila.precio || 0) }), _jsxs("div", { style: { fontSize: 11, lineHeight: 1.5, color: '#999' }, children: [formatNumber(precioUnitario), " \u00D7 ", factor] })] }));
                }
                return (_jsxs("div", { children: [_jsx(Text, { children: formatNumber(precioBase) }), _jsxs("div", { style: { fontSize: 11, lineHeight: 1.5, color: '#999' }, children: [formatNumber(precioUnitario), " \u00D7 ", factor] })] }));
            },
        },
        {
            title: '% Desc',
            key: 'porcentajeDescuento',
            width: 90,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, _record, idx) => (_jsx(InputNumber, { size: "small", style: { width: '100%' }, min: 0, max: 100, step: 0.01, precision: 2, value: detalles[idx]?.porcentajeDescuento, onChange: (val) => handleDetalleUpdateValue(detalles[idx].id, 'porcentajeDescuento', val || 0), onBlur: () => handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', detalles[idx]?.porcentajeDescuento || 0), onPressEnter: () => handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', detalles[idx]?.porcentajeDescuento || 0), addonAfter: "%" })),
        },
        {
            title: 'Descuento $',
            key: 'descuento',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => (_jsx("div", { children: _jsx(Text, { children: formatNumber(record.descuento || 0) }) })),
        },
        {
            title: 'SubTotal',
            dataIndex: 'subTotal',
            key: 'subTotal',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => (_jsx(Text, { children: formatNumber(record.subTotal || 0) })),
        },
        {
            title: 'Imp.',
            key: 'impuestos',
            width: 140,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => (_jsxs("div", { children: [_jsx("div", { children: formatNumber(record.impuestos || 0) }), record.impuesto?.nombre && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5 }, children: toTitleCase(record.impuesto.nombre) }))] })),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsx(Text, { strong: true, children: formatNumber(record.total || 0) })),
        },
        {
            title: '',
            key: 'acciones',
            width: 50,
            onCell: () => ({ style: { paddingRight: 8 } }),
            render: (_, _record, idx) => {
                const items = [
                    {
                        key: 'eliminar',
                        label: 'Eliminar',
                        icon: _jsx(DeleteOutlined, {}),
                        danger: true,
                        onClick: () => handleEliminarFila(detalles[idx].id),
                    },
                ];
                return (_jsx(Dropdown, { menu: { items }, trigger: ['click'], children: _jsx(Button, { type: "text", size: "small", icon: _jsx(MoreOutlined, {}) }) }));
            },
        },
    ];
    // ===== Detalles filtrados por búsqueda =====
    const detallesFiltrados = detalleSearch
        ? detalles.filter((d) => {
            const q = detalleSearch.toLowerCase();
            return ((d.codigo || '').toLowerCase().includes(q) ||
                (d.articulo || '').toLowerCase().includes(q) ||
                (d.referencia || '').toLowerCase().includes(q));
        })
        : detalles;
    // ===== Encabezado del formulario =====
    const renderEncabezado = () => (_jsx(Card, { className: "paces-card", size: "small", title: "Datos Generales", extra: _jsx(EstadoTag, { estado: estado, periodo: data?.periodo }), style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: 16, children: [_jsx(Col, { xs: 24, xxl: 18, children: _jsx(Form, { form: form, layout: "vertical", size: "small", style: { paddingTop: 24 }, children: _jsxs(Row, { gutter: [16, 24], children: [_jsxs(Col, { xs: 24, sm: 12, lg: 12, children: [_jsxs("div", { ref: conceptoRef, children: [_jsx(FloatingField, { label: "Concepto", required: true, children: _jsx(Input, { placeholder: " ", value: selectedConcepto ? toTitleCase(selectedConcepto.nombre) : '', readOnly: true, suffix: _jsxs(Space, { size: 4, children: [_jsx(SearchOutlined, { onClick: handleConceptoSearchClick, style: { cursor: 'pointer', color: 'rgba(0,0,0,0.45)' } }), selectedConcepto && _jsx(ClearOutlined, { onClick: handleConceptoClear, style: { cursor: 'pointer' } })] }), onClick: handleConceptoSearchClick }) }), _jsx(ConceptoInfoLabel, { concepto: selectedConcepto })] }), _jsx(Form.Item, { name: "concepto", hidden: true, children: _jsx(Input, {}) })] }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "fechaDocumento", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Fecha Documento", required: true, children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabledDate: (current) => {
                                                    if (!current)
                                                        return false;
                                                    const cierre = fechasCierre?.[sucursalActiva];
                                                    if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                                        return true;
                                                    const cierreInv = fechasCierreInv?.[sucursalActiva];
                                                    if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                                        return true;
                                                    return false;
                                                } }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 16, children: _jsx(Form.Item, { name: "cliente", required: true, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Cliente", required: true, children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", onChange: (val) => {
                                                    const cli = clientesCache.find((e) => e.codigo === val);
                                                    setSelectedCliente(cli || null);
                                                }, children: clientesCache.map((cli) => (_jsxs(Select.Option, { value: cli.codigo, children: [toTitleCase(cli.nombre), cli.identificacion ? ` (${cli.identificacion})` : ''] }, cli.codigo))) }) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 12, children: _jsx(Form.Item, { name: "almacen", required: tieneProductos, style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Almac\u00E9n", required: tieneProductos, children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", onChange: (val) => {
                                                    const alm = almacenesCache.find((a) => a.codigo === val);
                                                    setSelectedAlmacen(alm || null);
                                                }, children: almacenesCache.map((alm) => (_jsx(Select.Option, { value: alm.codigo, children: toTitleCase(alm.nombre) }, alm.codigo))) }) }) }) }), _jsxs(Col, { xs: 24, children: [_jsx("div", { style: { marginBottom: 16 }, children: _jsxs(Space, { size: [8, 8], wrap: true, children: [_jsxs(Tag, { style: { fontSize: 14 }, children: ["NCF: ", ncfValue || 'Autogenerado'] }), editingField === 'referencia' ? (_jsx(Input, { size: "small", style: { width: 200 }, placeholder: "Referencia", autoFocus: true, defaultValue: editingValueRef.current, onChange: (e) => { editingValueRef.current = e.target.value; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                            if (e.key === 'Escape') {
                                                                e.stopPropagation();
                                                                cancelFieldEditor();
                                                            }
                                                        } })) : refValue ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => openFieldEditor('referencia'), children: ["Ref: ", refValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => openFieldEditor('referencia'), children: [_jsx(PlusOutlined, {}), " Referencia"] })), editingField === 'tasa' ? (_jsx(InputNumber, { size: "small", style: { width: 120 }, min: 0, step: 0.01, placeholder: "Tasa", autoFocus: true, defaultValue: editingValueRef.current, onChange: (val) => { editingValueRef.current = val ?? 1; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                            if (e.key === 'Escape') {
                                                                e.stopPropagation();
                                                                cancelFieldEditor();
                                                            }
                                                        } })) : tasaValue !== 1 ? (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => openFieldEditor('tasa'), children: ["Tasa: ", tasaValue, " ", _jsx(EditOutlined, {})] })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => openFieldEditor('tasa'), children: [_jsx(PlusOutlined, {}), " Tasa"] })), editingField === 'diasCredito' ? (_jsx(InputNumber, { size: "small", style: { width: 120 }, min: 0, max: 365, step: 1, placeholder: "D\u00EDas Cr\u00E9dito", autoFocus: true, defaultValue: editingValueRef.current, onChange: (val) => { editingValueRef.current = val ?? 0; }, onPressEnter: () => commitFieldEditor(), onBlur: () => commitFieldEditor(), onKeyDown: (e) => {
                                                            if (e.key === 'Escape') {
                                                                e.stopPropagation();
                                                                cancelFieldEditor();
                                                            }
                                                        } })) : (_jsxs(Tag, { style: { cursor: 'pointer', fontSize: 14 }, onClick: () => openFieldEditor('diasCredito'), children: [form.getFieldValue('diasCredito') !== undefined && form.getFieldValue('diasCredito') !== null
                                                                ? `Crédito: ${form.getFieldValue('diasCredito')} días`
                                                                : _jsxs(_Fragment, { children: [_jsx(PlusOutlined, {}), " D\u00EDas Cr\u00E9dito"] }), form.getFieldValue('diasCredito') !== undefined && form.getFieldValue('diasCredito') !== null && form.getFieldValue('diasCredito') !== '' && _jsx(EditOutlined, {})] }))] }) }), _jsx(Form.Item, { name: "ncf", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "referencia", hidden: true, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "tasa", hidden: true, children: _jsx(InputNumber, {}) }), _jsx(Form.Item, { name: "diasCredito", hidden: true, children: _jsx(InputNumber, {}) }), _jsx(Form.Item, { name: "moneda", hidden: true, children: _jsx(Input, {}) })] }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "nota", style: { marginBottom: 0 }, children: _jsx(FloatingField, { label: "Nota", children: _jsx(TextArea, { rows: 3, maxLength: 500 }) }) }) })] }) }) }), _jsx(Col, { xs: 24, xxl: 6, children: _jsx("div", { style: { marginTop: 24 }, children: _jsx(TotalesCard, { subTotal: totales.subTotal, descuento: totales.descuento, impuestos: totales.impuestos, total: totales.total, hideTitle: true, monedaSimbolo: data?.moneda?.simbolo || selectedConcepto?.moneda?.simbolo || getMonedaSucursalActiva().simbolo, monedaNombre: data?.moneda?.nombre || selectedConcepto?.moneda?.nombre || getMonedaSucursalActiva().nombre, tasa: tasaValue ?? data?.tasa ?? 1 }) }) })] }) }));
    // ===== Tabla de Cobros =====
    const METODOS_PAGO = [
        { field: 'efectivo', label: 'Efectivo' },
        { field: 'cheque', label: 'Cheque' },
        { field: 'transferencia', label: 'Transferencia' },
        { field: 'tarjetaCredito', label: 'Tarjeta Crédito' },
        { field: 'tarjetaDebito', label: 'Tarjeta Débito' },
        { field: 'bono', label: 'Bono', readonly: true },
        { field: 'tarjetaRegalo', label: 'Tarjeta Regalo' },
        { field: 'notaCredito', label: 'Nota Crédito', readonly: true },
    ];
    const renderCobros = () => (_jsxs("div", { style: { padding: '8px 0' }, children: [_jsx(Row, { gutter: [16, 16], children: METODOS_PAGO.map((metodo) => (_jsx(Col, { xs: 12, sm: 12, md: 8, lg: 6, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: [_jsx("label", { style: { fontSize: 13, fontWeight: 500 }, children: metodo.label }), _jsx(InputNumber, { size: "middle", style: { width: '100%' }, min: 0, step: 0.01, precision: 2, value: cobros[metodo.field], onChange: (val) => handleCobroChange(metodo.field, val), readOnly: metodo.readonly, disabled: metodo.readonly, formatter: (value) => formatNumber(Number(value || 0)), parser: (value) => Number(value?.replace(/[^0-9.-]/g, '') || '0') }), metodo.readonly && (_jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: "Solo lectura" }))] }) }, metodo.field))) }), _jsxs(Row, { gutter: [16, 16], children: [_jsx(Col, { xs: 24, children: _jsx(Button, { type: "primary", icon: _jsx(CreditCardOutlined, {}), onClick: handlePagarConTarjeta, disabled: esAnulado || esCerrado || detalles.length === 0 || totales.total <= 0, size: "large", block: true, style: { marginTop: 8 }, children: "Pagar con Tarjeta" }) }), _jsx(Col, { xs: 24, children: _jsx(Button, { type: "default", icon: _jsx(FileTextOutlined, {}), onClick: handleAbrirSelectorNC, disabled: esAnulado || esCerrado || !selectedCliente?.codigo, block: true, style: { marginTop: 8 }, children: "Seleccionar NC / Devoluciones" }) })] }), _jsx(Divider, {}), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 32, fontSize: 15 }, children: [_jsxs("span", { children: [_jsx("strong", { children: "Cobrado:" }), " ", formatNumber(cobradoTotal)] }), _jsxs("span", { style: { color: diferencia > 0 ? '#ff4d4f' : '#52c41a' }, children: [_jsx("strong", { children: "Diferencia:" }), " ", formatNumber(diferencia)] })] })] }));
    return (_jsxs("div", { children: [_jsx(FormularioToolbar, { saving: saving, estado: estado, periodo: data?.periodo, onGuardar: handleGuardar, onCancelar: handleCancelar }), loadingError && (_jsx(Alert, { message: "Error al cargar formulario de factura POS", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(BuscarConceptoModal, { open: conceptoModalOpen, onClose: () => setConceptoModalOpen(false), onSelect: handleConceptoSelect, sucursal: sucursalActiva, documento: "FPV" }), _jsx(BuscarProductoModal, { open: productoModalOpen, onClose: () => setProductoModalOpen(false), onSelect: handleProductoSelect, mode: "venta" }), _jsx(Modal, { title: "Pago con Tarjeta", open: visanetModalOpen, onCancel: () => {
                    if (!visanetProcessing) {
                        setVisanetModalOpen(false);
                    }
                }, footer: [
                    _jsx(Button, { onClick: () => setVisanetModalOpen(false), disabled: visanetProcessing, children: "Cerrar" }, "cerrar"),
                ], closable: !visanetProcessing, maskClosable: false, children: visanetProcessing ? (_jsxs("div", { style: { textAlign: 'center', padding: '24px 0' }, children: [_jsx(Spin, { size: "large" }), _jsx("p", { style: { marginTop: 16, fontSize: 16 }, children: "Procesando pago en el terminal POS..." }), _jsx("p", { style: { color: '#999' }, children: "Inserte la tarjeta en el terminal o ac\u00E9rquela al lector NFC" }), _jsxs("p", { style: { fontSize: 13, color: '#666' }, children: ["Monto: ", formatCurrency(totales.total)] })] })) : visanetResult ? (_jsx("div", { style: { padding: '16px 0' }, children: visanetResult.exitoso ? (_jsx(_Fragment, { children: _jsx(Alert, { type: "success", showIcon: true, message: "Transacci\u00F3n Aprobada", description: _jsxs("div", { children: [_jsxs("p", { children: [_jsx("strong", { children: "Autorizaci\u00F3n:" }), " ", visanetResult.autorizacion] }), _jsxs("p", { children: [_jsx("strong", { children: "Tarjeta:" }), " ", visanetResult.panMasked] }), _jsxs("p", { children: [_jsx("strong", { children: "Titular:" }), " ", visanetResult.cardHolderName || 'N/A'] }), _jsxs("p", { children: [_jsx("strong", { children: "Monto:" }), " ", visanetResult.totalAmount ? parseFloat(visanetResult.totalAmount).toFixed(2) : '0.00'] }), _jsxs("p", { children: [_jsx("strong", { children: "Voucher:" }), " ", visanetResult.stan] }), _jsxs("p", { children: [_jsx("strong", { children: "RRN:" }), " ", visanetResult.rrn] }), _jsxs("p", { children: [_jsx("strong", { children: "Lote:" }), " ", visanetResult.batchNumber] }), visanetResult.isDcc && (_jsxs("p", { children: [_jsx("strong", { children: "DCC:" }), " ", visanetResult.exchangeRate, " - ", visanetResult.totalTransactionAmount, " ", visanetResult.transactionCurrency] }))] }) }) })) : (_jsx(Alert, { type: "error", showIcon: true, message: "Transacci\u00F3n Rechazada", description: visanetResult.mensajeRespuesta || 'Error desconocido' })) })) : null }), _jsx(Modal, { title: "Seleccionar Notas de Cr\u00E9dito / Devoluciones disponibles", open: ncModalOpen, onCancel: () => { setNcDocsSeleccionados([]); setNcModalOpen(false); }, onOk: () => {
                    // Sumar montos
                    const totalNC = ncDocsSeleccionados.reduce((s, d) => s + (d.montoAplicar || 0), 0);
                    // Actualizar cobros
                    setCobros((prev) => ({
                        ...prev,
                        notaCredito: totalNC,
                        documentosAsociados: ncDocsSeleccionados.map((d) => ({
                            transaccionID: d.record.id,
                            tipoDocumento: d.record.documento?.startsWith('DEV') ? 'DEV' : 'NC',
                            noDocumento: d.record.documento || '',
                            monto: d.montoAplicar,
                        })),
                    }));
                    setNcModalOpen(false);
                }, width: 700, children: _jsx(Table, { dataSource: ncDocumentosDisponibles, rowKey: "id", rowSelection: {
                        type: 'checkbox',
                        onChange: (selectedRowKeys, selectedRows) => {
                            // Inicializar montos al seleccionar
                            setNcDocsSeleccionados(selectedRows.map((r) => ({
                                record: r,
                                montoAplicar: ncDocsSeleccionados.find((d) => d.record.id === r.id)?.montoAplicar || r.total,
                            })));
                        },
                    }, columns: [
                        { title: 'Documento', dataIndex: 'documento', width: 140 },
                        { title: 'Fecha', dataIndex: 'fecha', width: 110 },
                        {
                            title: 'Total', dataIndex: 'total', width: 120, align: 'right',
                            render: (v) => formatNumber(v),
                        },
                        {
                            title: 'Monto a Aplicar', key: 'monto', width: 150,
                            render: (_, record) => {
                                const item = ncDocsSeleccionados.find((d) => d.record.id === record.id);
                                return (_jsx(InputNumber, { size: "small", min: 0, max: record.total, step: 0.01, precision: 2, value: item?.montoAplicar || 0, onChange: (val) => {
                                        setNcDocsSeleccionados((prev) => prev.map((d) => d.record.id === record.id
                                            ? { ...d, montoAplicar: val || 0 }
                                            : d));
                                    } }));
                            },
                        },
                    ], pagination: false, size: "small" }) }), isLarge ? (_jsx(Row, { gutter: 16, children: _jsxs(Col, { xxl: 24, children: [renderEncabezado(), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: [
                                {
                                    key: 'detalles',
                                    label: `Productos/Servicios (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`,
                                    children: (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs(Space, { children: [_jsx(Button, { type: "dashed", icon: _jsx(PlusOutlined, {}), onClick: handleAgregarFila, children: "Agregar fila" }), _jsx(Button, { icon: _jsx(SearchOutlined, {}), onClick: () => setProductoModalOpen(true), children: "Buscar Producto" }), _jsx(Button, { icon: _jsx(BarcodeOutlined, {}), onClick: () => setProductoModalOpen(true), children: "Scanner" })] }), _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { maxWidth: 250 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                                            setDetalleSearch(''); } })] }), (documentoConfig?.modificaPrecio === false || documentoConfig?.modificaDescripcion === false || data?.documento?.modificaPrecio === false || data?.documento?.modificaDescripcion === false) && detalles.length > 0 && (_jsx(CamposRestringidosAlert, { modificaPrecio: documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio, modificaDescripcion: documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion })), _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 1300 }, locale: {
                                                    emptyText: (_jsx("div", { style: { minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin registros" }) })),
                                                } })] })),
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
                                            children: (_jsx(Table, { dataSource: data?.asientos || [], columns: asientoColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 900 }, summary: () => (_jsx(Table.Summary, { fixed: true, children: _jsxs(Table.Summary.Row, { children: [_jsx(Table.Summary.Cell, { index: 0, colSpan: 3, children: _jsx("strong", { children: "Totales" }) }), _jsx(Table.Summary.Cell, { index: 1, align: "right", children: _jsx("strong", { children: formatNumber(totalDebitos) }) }), _jsx(Table.Summary.Cell, { index: 2, align: "right", children: _jsx("strong", { children: formatNumber(totalCreditos) }) })] }) })) })),
                                        }]
                                    : []),
                                ...(data?.logs && data.logs.length > 0
                                    ? [{
                                            key: 'historial',
                                            label: `Historial (${data?.logs?.length || 0})`,
                                            children: (_jsx(LogTable, { dataSource: data?.logs || [], scroll: { x: 900 } })),
                                        }]
                                    : []),
                            ] })] }) })) : (_jsxs("div", { children: [renderEncabezado(), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", style: { borderRadius: 8, padding: '0 16px' }, items: [
                            {
                                key: 'detalles',
                                label: `Productos/Servicios (${detallesFiltrados.length}${detalleSearch ? `/${detalles.length}` : ''})`,
                                children: (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs(Space, { children: [_jsx(Button, { type: "dashed", icon: _jsx(PlusOutlined, {}), onClick: handleAgregarFila, children: "Agregar fila" }), _jsx(Button, { icon: _jsx(SearchOutlined, {}), onClick: () => setProductoModalOpen(true), children: "Buscar Prod." })] }), _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { maxWidth: 250 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                                        setDetalleSearch(''); } })] }), (documentoConfig?.modificaPrecio === false || documentoConfig?.modificaDescripcion === false || data?.documento?.modificaPrecio === false || data?.documento?.modificaDescripcion === false) && detalles.length > 0 && (_jsx(CamposRestringidosAlert, { modificaPrecio: documentoConfig?.modificaPrecio ?? data?.documento?.modificaPrecio, modificaDescripcion: documentoConfig?.modificaDescripcion ?? data?.documento?.modificaDescripcion })), _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 1300 }, locale: {
                                                emptyText: (_jsx("div", { style: { minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin registros" }) })),
                                            } })] })),
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
                                        children: (_jsx(Table, { dataSource: data?.asientos || [], columns: asientoColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 900 }, summary: () => (_jsx(Table.Summary, { fixed: true, children: _jsxs(Table.Summary.Row, { children: [_jsx(Table.Summary.Cell, { index: 0, colSpan: 3, children: _jsx("strong", { children: "Totales" }) }), _jsx(Table.Summary.Cell, { index: 1, align: "right", children: _jsx("strong", { children: formatNumber(totalDebitos) }) }), _jsx(Table.Summary.Cell, { index: 2, align: "right", children: _jsx("strong", { children: formatNumber(totalCreditos) }) })] }) })) })),
                                    }]
                                : []),
                            ...(data?.logs && data.logs.length > 0
                                ? [{
                                        key: 'historial',
                                        label: `Historial (${data?.logs?.length || 0})`,
                                        children: (_jsx(LogTable, { dataSource: data?.logs || [], scroll: { x: 900 } })),
                                    }]
                                : []),
                        ] })] }))] }));
};
export default FacturaPOSFormulario;
