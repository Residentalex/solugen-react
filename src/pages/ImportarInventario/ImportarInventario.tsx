import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Row, Col, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal,
} from 'antd';
import {
  SaveOutlined,
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { importarInventarioApi } from '../../api/importarInventarioApi';
import { entradaAlmacenApi } from '../../api/entradaAlmacenApi';
import { salidaAlmacenApi } from '../../api/salidaAlmacenApi';
import { transferenciaAlmacenApi } from '../../api/transferenciaAlmacenApi';
import { devolucionCompraApi } from '../../api/devolucionCompraApi';
import type {
  TipoDocInventario,
  DetalleImportarDTO,
} from '../../types/importarInventario';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import TotalesCard from '../../components/TotalesCard';
import { TIPO_DOC_LABELS, TIPO_DOC_ROUTES } from '../../types/importarInventario';
import type { ConceptoDTO, AlmacenDTO, SuplidorDTO, EntradaAlmacenDTO, DetalleEntradaAlmacenDTO } from '../../types/entradaAlmacen';
import type { SalidaAlmacenFullDTO, DetalleSalidaAlmacenDTO } from '../../types/salidaAlmacen';
import type { TransferenciaAlmacenFullDTO, DetalleTransferenciaAlmacenDTO } from '../../types/transferenciaAlmacen';
import type { DevolucionCompraFullDTO, DetalleDevolucionCompraDTO } from '../../types/devolucionCompra';

const { Text } = Typography;
const { TextArea } = Input;

// ===== Helpers =====
function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function toISOFormat(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}`;
}

function extraerMensajeError(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (data.errorMessage) return data.errorMessage;
  if (data.errors && typeof data.errors === 'object') {
    const mensajes: string[] = [];
    for (const key of Object.keys(data.errors)) {
      const val = data.errors[key];
      if (Array.isArray(val)) mensajes.push(...val);
      else if (typeof val === 'string') mensajes.push(val);
    }
    if (mensajes.length > 0) return mensajes.join('; ');
  }
  return fallback;
}

// ===== Generación de plantilla CSV =====
function generarPlantillaCSV(tipo: TipoDocInventario): string {
  const columnasPorTipo: Record<TipoDocInventario, string[]> = {
    ENP: ['codigo', 'articulo', 'cantidad', 'costo', 'porcentajedescuento', 'porcentajeimpuesto', 'fechaVencimiento'],
    SAP: ['codigo', 'articulo', 'cantidad', 'costo', 'porcentajedescuento', 'porcentajeimpuesto'],
    TRP: ['codigo', 'articulo', 'cantidad', 'costo'],
    DVC: ['codigo', 'articulo', 'cantidad', 'costo', 'porcentajedescuento', 'porcentajeimpuesto'],
  };
  const columnas = columnasPorTipo[tipo] || columnasPorTipo.ENP;
  const sep = (1.1).toLocaleString().indexOf(',') >= 0 ? ';' : ',';
  return '\uFEFF' + columnas.join(sep) + '\n';
}

function handleDescargarPlantilla(tipo: TipoDocInventario) {
  const csv = generarPlantillaCSV(tipo);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const label = TIPO_DOC_LABELS[tipo];
  link.download = `plantilla_${label.replace(/\s+/g, '_')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ===== Cálculo de fila =====
function calcularFila(fila: DetalleImportarDTO): DetalleImportarDTO {
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
    subTotal,
    descuento,
    impuestos,
    total,
  };
}

function filaVacia(): DetalleImportarDTO {
  return {
    id: 0,
    codigo: '',
    articulo: '',
    referencia: '',
    cantidad: 0,
    costo: 0,
    precio: 0,
    subTotal: 0,
    descuento: 0,
    porcentajeDescuento: 0,
    impuestos: 0,
    porcentajeImpuesto: 0,
    total: 0,
    tipoArticulo: 'Producto',
  };
}

// ===== Parser CSV básico =====
function parseCSV(text: string): DetalleImportarDTO[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Inferir headers de la primera línea
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idxCodigo = headers.indexOf('codigo');
  const idxArticulo = headers.indexOf('articulo');
  const idxRef = headers.indexOf('referencia');
  const idxCant = headers.indexOf('cantidad');
  const idxCosto = headers.indexOf('costo');
  const idxPctDesc = headers.indexOf('porcentajedescuento');
  const idxPctImp = headers.indexOf('porcentajeimpuesto');

  const resultados: DetalleImportarDTO[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const fila: DetalleImportarDTO = {
      ...filaVacia(),
      id: -(i),
      codigo: idxCodigo >= 0 ? cols[idxCodigo] || '' : '',
      articulo: idxArticulo >= 0 ? cols[idxArticulo] || '' : '',
      referencia: idxRef >= 0 ? cols[idxRef] || '' : '',
      cantidad: idxCant >= 0 ? parseFloat(cols[idxCant]) || 0 : 0,
      costo: idxCosto >= 0 ? parseFloat(cols[idxCosto]) || 0 : 0,
      porcentajeDescuento: idxPctDesc >= 0 ? parseFloat(cols[idxPctDesc]) || 0 : 0,
      porcentajeImpuesto: idxPctImp >= 0 ? parseFloat(cols[idxPctImp]) || 0 : 0,
    };
    resultados.push(calcularFila(fila));
  }

  return resultados;
}

// ===== Componente principal =====
const ImportarInventario: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();
  const isLarge = screens.lg ?? true;

  // ===== States =====
  const [saving, setSaving] = useState(false);
  const [detalles, setDetalles] = useState<DetalleImportarDTO[]>([]);

  // Tipo documento
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocInventario>('ENP');

  // Concepto
  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [conceptoSearchText, setConceptoSearchText] = useState('');

  // Catálogo de entidades
  const [suplidoresCache, setSuplidoresCache] = useState<SuplidorDTO[]>([]);
  const [almacenesCache, setAlmacenesCache] = useState<AlmacenDTO[]>([]);

  // Entidad Desde/Hasta
  const [entidadDesdeVal, setEntidadDesdeVal] = useState<string>('');
  const [entidadHastaVal, setEntidadHastaVal] = useState<string>('');

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form] = Form.useForm();

  // ===== Determinar labels de entidad según tipo de documento =====
  const entidadLabels = useMemo(() => {
    switch (tipoDocumento) {
      case 'ENP':  return { desde: 'Proveedor', hasta: 'Almacén Destino' };
      case 'SAP':  return { desde: 'Almacén Origen', hasta: 'Suplidor' };
      case 'TRP':  return { desde: 'Almacén Origen', hasta: 'Almacén Destino' };
      case 'DVC':  return { desde: 'Proveedor', hasta: 'Almacén' };
      default:     return { desde: 'Desde', hasta: 'Hasta' };
    }
  }, [tipoDocumento]);

  // ===== Al cambiar tipo de documento =====
  const handleTipoDocumentoChange = (value: TipoDocInventario) => {
    setTipoDocumento(value);
    // Limpiar selecciones dependientes
    setSelectedConcepto(null);
    setConceptoSearchText('');
    setEntidadDesdeVal('');
    setEntidadHastaVal('');
    setDetalles([]);
    form.setFieldsValue({
      conceptoNombre: '',
      entidadDesde: undefined,
      entidadHasta: undefined,
    });
  };

  // ===== Cargar catálogos al montar =====
  useEffect(() => {
    setActiveModule('OImportarINV');
    setPageTitleOverride('Importar Inventario');

    importarInventarioApi.obtenerSuplidores(sucursalActiva)
      .then(setSuplidoresCache)
      .catch(() => {});
    importarInventarioApi.obtenerAlmacenes(sucursalActiva)
      .then(setAlmacenesCache)
      .catch(() => {});

    form.setFieldsValue({ fechaDocumento: dayjs() });

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, sucursalActiva, form]);

  // ===== Handlers =====
  const handleCancelar = () => {
    Modal.confirm({
      title: 'Cancelar',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro que desea cancelar? Se perderán los datos ingresados.',
      okText: 'Si, cancelar',
      cancelText: 'No, continuar',
      okButtonProps: { danger: true },
      onOk: () => navigate('/'),
    });
  };

  // ===== Concepto =====
  const handleConceptoSelect = (concepto: ConceptoDTO) => {
    setSelectedConcepto(concepto);
    setConceptoSearchText(toTitleCase(concepto.nombre));
    form.setFieldsValue({ conceptoNombre: concepto.nombre });

    // === ConfigurarMoneda ===
    const monedaObj = concepto.moneda || { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' };
    form.setFieldsValue({
      moneda: monedaObj.nombre,
      tasa: monedaObj.codigo === 'DOP' ? 1 : 1,
    });
  };

  const handleConceptoSearchClick = () => {
    setConceptoModalOpen(true);
  };

  // ===== Detalles =====
  const handleAgregarFila = () => {
    setDetalles((prev) => [{ ...filaVacia(), id: -(prev.length + 1) }, ...prev]);
  };

  const handleEliminarFila = (id: number) => {
    setDetalles((prev) => prev.filter((d) => d.id !== id));
  };

  const handleDetalleUpdate = (id: number, field: string, value: any) => {
    setDetalles((prev) =>
      prev.map((d) => (d.id !== id ? d : { ...d, [field]: value }))
    );
  };

  const handleDetalleCalculate = (id: number, field: string, value: any) => {
    setDetalles((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const updated = { ...d, [field]: value };
        return calcularFila(updated);
      })
    );
  };

  // ===== Carga de CSV =====
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) {
        message.error('No se pudo leer el archivo');
        return;
      }

      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        message.warning('El archivo no contiene datos válidos. Formato esperado: codigo,articulo,referencia,cantidad,costo,porcentajedescuento,porcentajeimpuesto');
        return;
      }

      setDetalles((prev) => {
        const maxId = prev.length > 0 ? Math.min(...prev.map((d) => d.id)) : 0;
        const nuevos = parsed.map((d, idx) => ({ ...d, id: maxId - 1 - idx }));
        return [...prev, ...nuevos];
      });
      message.success(`${parsed.length} filas cargadas desde el archivo`);
    };
    reader.onerror = () => {
      message.error('Error al leer el archivo');
    };
    reader.readAsText(file);

    // Resetear input para permitir recargar el mismo archivo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ===== Totales calculados con useMemo =====
  const totales = useMemo(() => ({
    subTotal: detalles.reduce((s, d) => s + (d.subTotal || 0), 0),
    descuento: detalles.reduce((s, d) => s + (d.descuento || 0), 0),
    impuestos: detalles.reduce((s, d) => s + (d.impuestos || 0), 0),
    total: detalles.reduce((s, d) => s + (d.total || 0), 0),
  }), [detalles]);

  // ===== Validación =====
  const validarFormulario = (): string | null => {
    if (!selectedConcepto) return 'El concepto es requerido';
    if (!entidadDesdeVal) return `La entidad "${entidadLabels.desde}" es requerida`;
    if (!entidadHastaVal) return `La entidad "${entidadLabels.hasta}" es requerida`;
    if (detalles.length === 0) return 'Debe agregar al menos un detalle';
    if (!detalles.some((d) => (d.cantidad || 0) > 0)) return 'Debe tener al menos un detalle con cantidad > 0';
    return null;
  };

  // ===== Construir DTO según tipo =====
  const construirDTO = (): any => {
    const values = form.getFieldsValue();

    const fechaDoc = values.fechaDocumento
      ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
          ? toISOFormat(values.fechaDocumento.toDate())
          : values.fechaDocumento)
      : toISOFormat(new Date());

    const encabezadoBase = {
      id: 0,
      noDocumento: '',
      estado: 0,
      periodo: new Date().getMonth() + 1,
      referencia: '',
      ncf: '',
      nota: values.nota || '',
      tasa: 1,
      fechaDocumento: fechaDoc,
      documento: { codigo: tipoDocumento },
    };

    switch (tipoDocumento) {
      case 'ENP': {
        const suplidorSel = suplidoresCache.find((s) => s.codigo === entidadDesdeVal);
        const almacenSel = almacenesCache.find((a) => a.codigo === entidadHastaVal);
        return {
          ...encabezadoBase,
          tipoDocumento: 0,
          ncfModificado: '',
          diasCredito: 0,
          retenciones: 0,
          subTotal: detalles.reduce((s, d) => s + (d.subTotal || 0), 0),
          descuento: detalles.reduce((s, d) => s + (d.descuento || 0), 0),
          impuestos: detalles.reduce((s, d) => s + (d.impuestos || 0), 0),
          total: detalles.reduce((s, d) => s + (d.total || 0), 0),
          concepto: selectedConcepto || { nombre: '', codigo: '' },
          suplidor: suplidorSel || { nombre: '', codigo: '', identificacion: '' },
          almacen: almacenSel || { nombre: '', codigo: '' },
          entidad: suplidorSel
            ? { nombre: suplidorSel.nombre, codigo: suplidorSel.codigo, identificacion: suplidorSel.identificacion || '', telefono: suplidorSel.telefono, direccion: suplidorSel.direccion }
            : { nombre: '', codigo: '', identificacion: '' },
          moneda: { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' },
          sucursal: null,
          ordenCompra: { id: 0, noDocumento: '' },
          detalles: detalles.map((d) => ({
            id: d.id,
            codigo: d.codigo,
            articulo: d.articulo,
            referencia: d.referencia,
            cantidad: d.cantidad || 0,
            costo: d.costo || 0,
            precio: d.costo || 0,
            subTotal: d.subTotal || 0,
            descuento: d.descuento || 0,
            porcentajeDescuento: d.porcentajeDescuento || 0,
            impuestos: d.impuestos || 0,
            porcentajeImpuesto: d.porcentajeImpuesto || 0,
            total: d.total || 0,
            tipoArticulo: d.tipoArticulo || 'Producto',
            flete: 0,
            costoActual: 0,
            ajustado: false,
            cantidadBonificable: 0,
          } as DetalleEntradaAlmacenDTO)),
          asientos: [],
          logs: [],
        } as EntradaAlmacenDTO;
      }

      case 'SAP': {
        const almacenSel = almacenesCache.find((a) => a.codigo === entidadDesdeVal);
        return {
          ...encabezadoBase,
          fechaRecibo: undefined,
          subTotal: detalles.reduce((s, d) => s + (d.subTotal || 0), 0),
          descuento: detalles.reduce((s, d) => s + (d.descuento || 0), 0),
          impuestos: detalles.reduce((s, d) => s + (d.impuestos || 0), 0),
          total: detalles.reduce((s, d) => s + (d.total || 0), 0),
          concepto: selectedConcepto || { nombre: '', codigo: '' },
          almacen: almacenSel || { nombre: '', codigo: '' },
          suplidor: { nombre: entidadHastaVal, codigo: '', identificacion: '' },
          entidad: { nombre: entidadHastaVal, codigo: '', identificacion: '' },
          moneda: { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' },
          detalles: detalles.map((d) => ({
            id: d.id,
            codigo: d.codigo,
            articulo: d.articulo,
            referencia: d.referencia,
            cantidad: d.cantidad || 0,
            costo: d.costo || 0,
            subTotal: d.subTotal || 0,
            porcentajeDescuento: d.porcentajeDescuento || 0,
            descuento: d.descuento || 0,
            porcentajeImpuesto: d.porcentajeImpuesto || 0,
            impuestos: d.impuestos || 0,
            total: d.total || 0,
            tipoArticulo: d.tipoArticulo || 'Producto',
          } as DetalleSalidaAlmacenDTO)),
          asientos: [],
          logs: [],
        } as SalidaAlmacenFullDTO;
      }

      case 'TRP': {
        const almacenOrigenSel = almacenesCache.find((a) => a.codigo === entidadDesdeVal);
        const almacenDestinoSel = almacenesCache.find((a) => a.codigo === entidadHastaVal);
        return {
          ...encabezadoBase,
          subTotal: detalles.reduce((s, d) => s + (d.subTotal || 0), 0),
          total: detalles.reduce((s, d) => s + (d.total || 0), 0),
          concepto: selectedConcepto || { nombre: '', codigo: '' },
          almacen: almacenOrigenSel || { nombre: '', codigo: '' },
          almacenDestino: almacenDestinoSel || { nombre: '', codigo: '' },
          moneda: { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' },
          detalles: detalles.map((d) => ({
            id: d.id,
            codigo: d.codigo,
            articulo: d.articulo,
            referencia: d.referencia,
            cantidad: d.cantidad || 0,
            subTotal: d.subTotal || 0,
            total: d.total || 0,
            tipoArticulo: d.tipoArticulo || 'Producto',
          } as DetalleTransferenciaAlmacenDTO)),
          asientos: [],
          logs: [],
        } as TransferenciaAlmacenFullDTO;
      }

      case 'DVC': {
        const suplidorSel = suplidoresCache.find((s) => s.codigo === entidadDesdeVal);
        const almacenSel = almacenesCache.find((a) => a.codigo === entidadHastaVal);
        return {
          ...encabezadoBase,
          subTotal: detalles.reduce((s, d) => s + (d.subTotal || 0), 0),
          descuento: detalles.reduce((s, d) => s + (d.descuento || 0), 0),
          impuestos: detalles.reduce((s, d) => s + (d.impuestos || 0), 0),
          total: detalles.reduce((s, d) => s + (d.total || 0), 0),
          concepto: selectedConcepto || { nombre: '', codigo: '' },
          almacen: almacenSel || { nombre: '', codigo: '' },
          suplidor: suplidorSel || { nombre: '', codigo: '', identificacion: '' },
          entidad: suplidorSel
            ? { nombre: suplidorSel.nombre, codigo: suplidorSel.codigo, identificacion: suplidorSel.identificacion || '', telefono: suplidorSel.telefono, direccion: suplidorSel.direccion }
            : { nombre: '', codigo: '', identificacion: '' },
          tipo: null,
          entrada: null,
          moneda: { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' },
          detalles: detalles.map((d) => ({
            id: d.id,
            codigo: d.codigo,
            articulo: d.articulo,
            referencia: d.referencia,
            cantidad: d.cantidad || 0,
            devuelto: 0,
            costo: d.costo || 0,
            subTotal: d.subTotal || 0,
            porcentajeDescuento: d.porcentajeDescuento || 0,
            descuento: d.descuento || 0,
            impuestos: d.impuestos || 0,
            total: d.total || 0,
            tipoArticulo: d.tipoArticulo || 'Producto',
            nota: '',
          } as DetalleDevolucionCompraDTO)),
          asientos: [],
          logs: [],
        } as DevolucionCompraFullDTO;
      }

      default:
        throw new Error(`Tipo de documento no soportado: ${tipoDocumento}`);
    }
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
      let result: any;

      switch (tipoDocumento) {
        case 'ENP':
          result = await entradaAlmacenApi.crear(sucursalActiva, dto);
          break;
        case 'SAP':
          result = await salidaAlmacenApi.crear(sucursalActiva, dto);
          break;
        case 'TRP':
          result = await transferenciaAlmacenApi.crear(sucursalActiva, dto);
          break;
        case 'DVC':
          result = await devolucionCompraApi.crear(sucursalActiva, dto);
          break;
        default:
          throw new Error(`Tipo de documento no soportado: ${tipoDocumento}`);
      }

      message.success(`${TIPO_DOC_LABELS[tipoDocumento]} creada exitosamente`);
      const ruta = TIPO_DOC_ROUTES[tipoDocumento] + result.id;
      navigate(ruta);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== Toolbar inline =====
  const renderToolbar = () => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
      <div style={{ flex: 1 }} />
      <Space wrap>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleGuardar}>
          Guardar
        </Button>
        <Button icon={<CloseOutlined />} onClick={handleCancelar}>
          Cancelar
        </Button>
      </Space>
    </div>
  );

  // ===== Columnas de detalles =====
  const detalleColumns = [
    {
      title: 'Artículo',
      key: 'articulo',
      ellipsis: true,
      render: (_: any, record: DetalleImportarDTO) => (
        <div style={{ fontSize: 13 }}>
          <Input
            size="small"
            style={{ width: '100%' }}
            placeholder="Código"
            value={record.codigo}
            onChange={(e) => handleDetalleUpdate(record.id, 'codigo', e.target.value)}
          />
          <div className="paces-text-secondary" style={{ fontSize: 11, marginTop: 2 }}>
            {record.articulo && <span>{toTitleCase(record.articulo)}</span>}
            {record.articulo && record.referencia && <span> | </span>}
            {record.referencia && <span>{record.referencia}</span>}
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
      render: (_: any, _record: DetalleImportarDTO, idx: number) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          min={0}
          step={0.01}
          precision={2}
          value={detalles[idx]?.cantidad}
          onChange={(val) => handleDetalleUpdate(detalles[idx].id, 'cantidad', val || 0)}
          onBlur={() => handleDetalleCalculate(detalles[idx].id, 'cantidad', detalles[idx]?.cantidad || 0)}
          onPressEnter={() => handleDetalleCalculate(detalles[idx].id, 'cantidad', detalles[idx]?.cantidad || 0)}
        />
      ),
    },
    {
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      width: 110,
      align: 'right' as const,
      responsive: ['sm' as const, 'md' as const, 'lg' as const],
      render: (_: any, _record: DetalleImportarDTO, idx: number) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          min={0}
          step={0.01}
          precision={2}
          value={detalles[idx]?.costo}
          onChange={(val) => handleDetalleUpdate(detalles[idx].id, 'costo', val || 0)}
          onBlur={() => handleDetalleCalculate(detalles[idx].id, 'costo', detalles[idx]?.costo || 0)}
          onPressEnter={() => handleDetalleCalculate(detalles[idx].id, 'costo', detalles[idx]?.costo || 0)}
        />
      ),
    },
    {
      title: 'Desc %',
      key: 'descuento',
      width: 100,
      align: 'right' as const,
      render: (_: any, _record: DetalleImportarDTO, idx: number) => (
        <div>
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            min={0}
            max={100}
            step={0.01}
            precision={2}
            value={detalles[idx]?.porcentajeDescuento}
            onChange={(val) => handleDetalleUpdate(detalles[idx].id, 'porcentajeDescuento', val || 0)}
            onBlur={() => handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', detalles[idx]?.porcentajeDescuento || 0)}
            onPressEnter={() => handleDetalleCalculate(detalles[idx].id, 'porcentajeDescuento', detalles[idx]?.porcentajeDescuento || 0)}
            addonAfter="%"
          />
          <div className="paces-text-secondary" style={{ fontSize: 12, marginTop: 2 }}>
            {formatNumber(detalles[idx]?.descuento || 0)}
          </div>
        </div>
      ),
    },
    {
      title: 'Imp %',
      key: 'impuestos',
      width: 100,
      align: 'right' as const,
      render: (_: any, _record: DetalleImportarDTO, idx: number) => (
        <div>
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            min={0}
            max={100}
            step={0.01}
            precision={2}
            value={detalles[idx]?.porcentajeImpuesto}
            onChange={(val) => handleDetalleUpdate(detalles[idx].id, 'porcentajeImpuesto', val || 0)}
            onBlur={() => handleDetalleCalculate(detalles[idx].id, 'porcentajeImpuesto', detalles[idx]?.porcentajeImpuesto || 0)}
            onPressEnter={() => handleDetalleCalculate(detalles[idx].id, 'porcentajeImpuesto', detalles[idx]?.porcentajeImpuesto || 0)}
            addonAfter="%"
          />
          <div className="paces-text-secondary" style={{ fontSize: 12, marginTop: 2 }}>
            {formatNumber(detalles[idx]?.impuestos || 0)}
          </div>
        </div>
      ),
    },
    {
      title: 'SubTotal',
      dataIndex: 'subTotal',
      key: 'subTotal',
      width: 110,
      align: 'right' as const,
      responsive: ['md' as const, 'lg' as const],
      render: (_: any, record: DetalleImportarDTO) => (
        <Text>{formatNumber(record.subTotal || 0)}</Text>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 110,
      align: 'right' as const,
      render: (_: any, record: DetalleImportarDTO) => (
        <Text strong>{formatNumber(record.total || 0)}</Text>
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 50,
      render: (_: any, record: DetalleImportarDTO) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleEliminarFila(record.id)}
        />
      ),
    },
  ];

  // ===== Opciones para entidad Desde/Hasta según tipo =====
  const opcionesDesde = useMemo(() => {
    if (tipoDocumento === 'ENP' || tipoDocumento === 'DVC') {
      return suplidoresCache.map((s) => ({
        value: s.codigo,
        label: `${toTitleCase(s.nombre)}${s.identificacion ? ` (${s.identificacion})` : ''}`,
      }));
    }
    // TRP, SAP: desde = Almacén
    return almacenesCache.map((a) => ({
      value: a.codigo,
      label: toTitleCase(a.nombre),
    }));
  }, [tipoDocumento, suplidoresCache, almacenesCache]);

  const opcionesHasta = useMemo(() => {
    if (tipoDocumento === 'SAP') {
      // Para SAP "hasta" podría ser un input de texto o cliente; por ahora input libre
      return [];
    }
    // ENP, DVC, TRP: hasta = Almacén
    return almacenesCache.map((a) => ({
      value: a.codigo,
      label: toTitleCase(a.nombre),
    }));
  }, [tipoDocumento, almacenesCache]);

  // ===== Encabezado del formulario =====
  const renderEncabezado = () => (
    <Card className="paces-card" size="small" title="Datos del Documento" style={{ marginBottom: 16 }}>
      <Form form={form} layout="vertical" size="small" style={{ paddingTop: 24 }}>
        <Row gutter={[16, 24]}>
          {/* Fila 1: Tipo Documento */}
          <Col xs={24} sm={12} lg={8}>
            <Form.Item label="Tipo Documento" required style={{ marginBottom: 0 }}>
              <Select
                value={tipoDocumento}
                onChange={handleTipoDocumentoChange}
                options={[
                  { value: 'ENP', label: 'Entrada de Almacén (ENP)' },
                  { value: 'SAP', label: 'Salida de Almacén (SAP)' },
                  { value: 'TRP', label: 'Transferencia (TRP)' },
                  { value: 'DVC', label: 'Devolución Compra (DVC)' },
                ]}
              />
            </Form.Item>
          </Col>

          {/* Fila 1: Concepto */}
          <Col xs={24} sm={12} lg={16}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
              <div style={{ flex: 1 }}>
                <Form.Item label="Concepto" required style={{ marginBottom: 0 }}>
                  <Input
                    placeholder="Buscar concepto..."
                    value={conceptoSearchText}
                    readOnly
                  />
                </Form.Item>
              </div>
              <Button icon={<SearchOutlined />} onClick={handleConceptoSearchClick} />
            </div>
            <Form.Item name="conceptoNombre" hidden><Input /></Form.Item>
          </Col>

          {/* Fila 2: Entidad Desde */}
          <Col xs={24} sm={12} lg={8}>
            <Form.Item label={entidadLabels.desde} required style={{ marginBottom: 0 }}>
              {tipoDocumento === 'SAP' || tipoDocumento === 'TRP' ? (
                <Select
                  value={entidadDesdeVal || undefined}
                  onChange={setEntidadDesdeVal}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder={`Seleccionar ${entidadLabels.desde}`}
                  options={opcionesDesde}
                />
              ) : (
                <Select
                  value={entidadDesdeVal || undefined}
                  onChange={setEntidadDesdeVal}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder={`Seleccionar ${entidadLabels.desde}`}
                  options={opcionesDesde}
                />
              )}
            </Form.Item>
          </Col>

          {/* Fila 2: Entidad Hasta */}
          <Col xs={24} sm={12} lg={8}>
            <Form.Item label={entidadLabels.hasta} required style={{ marginBottom: 0 }}>
              {tipoDocumento === 'SAP' ? (
                <Input
                  placeholder="Nombre del cliente"
                  value={entidadHastaVal}
                  onChange={(e) => setEntidadHastaVal(e.target.value)}
                />
              ) : (
                <Select
                  value={entidadHastaVal || undefined}
                  onChange={setEntidadHastaVal}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder={`Seleccionar ${entidadLabels.hasta}`}
                  options={opcionesHasta}
                />
              )}
            </Form.Item>
          </Col>

          {/* Fila 2: Fecha */}
          <Col xs={24} sm={12} lg={8}>
            <Form.Item name="fechaDocumento" label="Fecha" required style={{ marginBottom: 0 }}>
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>

          {/* Fila 3: Nota */}
          <Col xs={24}>
            <Form.Item name="nota" label="Nota" style={{ marginBottom: 0 }}>
              <TextArea rows={3} placeholder="Nota opcional del documento..." />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  );

  return (
    <div>
      {renderToolbar()}

      <BuscarConceptoModal
        open={conceptoModalOpen}
        onClose={() => setConceptoModalOpen(false)}
        onSelect={handleConceptoSelect}
        fetchConceptos={() => importarInventarioApi.obtenerConceptos(sucursalActiva, tipoDocumento)}
      />

      {isLarge ? (
        /* === DESKTOP LAYOUT === */
        <Row gutter={16}>
          <Col lg={18}>
            {renderEncabezado()}

            {/* Sección de detalles */}
            <Card
              className="paces-card"
              size="small"
              title={`Detalles (${detalles.length})`}
              style={{ marginBottom: 16 }}
            >
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Space>
                  <Button type="dashed" icon={<PlusOutlined />} onClick={handleAgregarFila}>
                    Agregar fila
                  </Button>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <Button icon={<DownloadOutlined />} onClick={() => handleDescargarPlantilla(tipoDocumento)}>
                    Descargar plantilla
                  </Button>
                  <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>
                    Cargar CSV
                  </Button>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Formato CSV: codigo,articulo,referencia,cantidad,costo,porcentajedescuento,porcentajeimpuesto
                </Text>
              </div>

              <Table
                dataSource={detalles}
                columns={detalleColumns}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ x: 1000 }}
              />
            </Card>
          </Col>

          <Col lg={6}>
            <TotalesCard
              subTotal={totales.subTotal}
              descuento={totales.descuento}
              impuestos={totales.impuestos}
              total={totales.total}
              monedaSimbolo={selectedConcepto?.moneda?.simbolo || 'RD$'}
              monedaNombre={selectedConcepto?.moneda?.nombre || 'Peso Dominicano'}
              tasa={1}
            />
          </Col>
        </Row>
      ) : (
        /* === MOBILE LAYOUT === */
        <div>
          {renderEncabezado()}

          <Card
            className="paces-card"
            size="small"
            title={`Detalles (${detalles.length})`}
            style={{ marginBottom: 16 }}
          >
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Space>
                <Button type="dashed" icon={<PlusOutlined />} onClick={handleAgregarFila}>
                  Agregar fila
                </Button>
                <input
                  type="file"
                  accept=".csv,.txt"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <Button icon={<DownloadOutlined />} onClick={() => handleDescargarPlantilla(tipoDocumento)}>
                  Descargar plantilla
                </Button>
                <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>
                  Cargar CSV
                </Button>
              </Space>
            </div>

            <Table
              dataSource={detalles}
              columns={detalleColumns}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 1000 }}
            />
          </Card>

          <TotalesCard
            subTotal={totales.subTotal}
            descuento={totales.descuento}
            impuestos={totales.impuestos}
            total={totales.total}
            monedaSimbolo={selectedConcepto?.moneda?.simbolo || 'RD$'}
            monedaNombre={selectedConcepto?.moneda?.nombre || 'Peso Dominicano'}
            tasa={1}
            alignRight
          />
        </div>
      )}
    </div>
  );
};

export default ImportarInventario;
