import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Button, Space, Row, Col, Divider, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Alert,
  Switch, Empty,
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
import { notaDebitoApi } from '../../api/notaDebitoApi';
import { devolucionCompraApi } from '../../api/devolucionCompraApi';

import { conceptosApi } from '../../api/conceptosApi';
import { entidadApi } from '../../api/entidadApi';
import { parametrosApi } from '../../api/parametrosApi';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import type {
  NotaDebitoFullDTO,
  TipoDTO,
  DocumentoRelacionadoDTO,
  DevolucionAsociadaDTO,
} from '../../types/notaDebito';
import type { ConceptoDTO, EntidadDTO, AsientoContableDTO } from '../../types/entradaAlmacen';
import type { UnidadMedidaDTO } from '../../types/productos';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import LogTable from '../../components/LogTable';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import SeleccionarImpuestosModal from '../../components/SeleccionarImpuestosModal';
import type { ImpuestoSeleccionado } from '../../components/SeleccionarImpuestosModal';
import { OrigenCuenta } from '../../types/contabilidad';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import BuscarTipoModal from '../../components/BuscarTipoModal/BuscarTipoModal';
import BuscarDocumentoModal from '../../components/BuscarDocumentoModal/BuscarDocumentoModal';
import BuscarEntidadSelect from '../../components/BuscarEntidadSelect/BuscarEntidadSelect';
import BuscarCuentaContableModal from '../../components/BuscarCuentaContableModal/BuscarCuentaContableModal';
import AsientosContableTable from '../../components/AsientosContableTable';

import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { formatCurrency, formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum } from '../../utils/estadoDocumento';
import { NotaDebitoGuide } from './NotaDebitoGuide';

const { Text } = Typography;
const { TextArea } = Input;
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';

// ===== Calcular totales desde impuestos =====
function calcularTotales(impuestos: any[], total: number, perdidas: number = 0) {
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
    perdidas: Math.round(perdidas * 100) / 100,
  };
}

// ===== Sub-componente para mostrar totales =====
const TotalesSection: React.FC<{
  impuestosRetenciones: any[];
  montoTotal: number;
  perdidas?: number;
}> = React.memo(({ impuestosRetenciones, montoTotal, perdidas = 0 }) => {
  const totales = calcularTotales(impuestosRetenciones, Number(montoTotal) || 0, perdidas);
  return (
    <div style={{ marginTop: 24 }}>
      <TotalesCard
        subTotal={totales.subTotal}
        descuento={0}
        impuestos={totales.impuestos}
        total={Number(montoTotal) || 0}
        hideTitle
      />
      {perdidas > 0 && (
        <div style={{ marginTop: 8, textAlign: 'right' }}>
          <Text type="warning" strong>Pérdida: {formatCurrency(perdidas)}</Text>
        </div>
      )}
    </div>
  );
});




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
  const usuario = useAuthStore((s: any) => s.usuario);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const codigoPantalla = tipoEntidad === 'SUP' ? 'FNDSUP' : 'FNDCLI';
  const entidadLabel = tipoEntidad === 'SUP' ? 'Suplidor' : 'Cliente';
  const pantallaActiva = usuario?.pantallas?.find((p: any) => p.codigo?.toUpperCase() === codigoPantalla?.toUpperCase());
  const tienePermisoPostear = pantallaActiva?.acciones?.includes('POSTEAR') ?? false;

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
  const [impuestosRetenciones, setImpuestosRetenciones] = useState<any[]>([]);

  // Modal de selección de impuestos
  const [modalImpuestosOpen, setModalImpuestosOpen] = useState(false);

  // Modal de búsqueda de cuenta contable para asientos manuales
  const [cuentaModalAsientoOpen, setCuentaModalAsientoOpen] = useState(false);

  // Estado para total confirmado (se actualiza solo al salir del campo o presionar Enter)
  const [montoTotalConfirmado, setMontoTotalConfirmado] = useState<number>(0);

  // NCF
  const [ncfTipo, setNcfTipo] = useState<'documento' | 'modificado'>('documento');
  const [ncfModificadoVal, setNcfModificadoVal] = useState('');
  const [medidasCache, setMedidasCache] = useState<UnidadMedidaDTO[]>([]);

  // Artículos (solo CLI)
  const [detallesMovimiento, setDetallesMovimiento] = useState<any[]>([]);

  const impuestosBackupRef = useRef<Map<number, { impuesto?: any; porcentajeImpuesto: number }>>(new Map());

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
  const ncfValue = Form.useWatch('ncf', form) || '';
  const refValue = Form.useWatch('referencia', form) || '';
  const tasaValue = Form.useWatch('tasa', form) ?? 1;

  // ===== Totales derivados (usando getFieldValue para no causar re-render en cada tecla) =====
  const totales = calcularTotales(
    impuestosRetenciones,
    Number(form.getFieldValue('total')) || 0,
    devoluciones.reduce((s, d) => s + (d.perdida || 0), 0)
  );

  // ===== Quick field editors =====
  const openFieldEditor = (field: string) => {
    let val;
    if (field === 'ncfModificado') {
      val = ncfModificadoVal;
    } else {
      val = form.getFieldValue(field);
    }
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
      if (field === 'ncfModificado') {
        setNcfModificadoVal(editingValueRef.current as string);
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

  // ===== Estado info =====
  const estado = toEstadoNum(data?.estado);
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
    conceptosApi.obtenerSucursales(sucursalActiva).then(setSucursalesCache).catch(() => message.error('Error al cargar sucursales'));

    // === Si viene de Clonar ===
    if (cloneData) {
      setSelectedConcepto(cloneData.concepto || null);
      const entidadCloneNorm = cloneData.entidad ? {
        ...cloneData.entidad,
        codigo: cloneData.entidad.codigo || cloneData.entidad.idExterno || '',
      } : null;
      setSelectedEntidad(entidadCloneNorm);
      // Normalizar sucursal (clonado)
      const sucursalCloneNorm = cloneData.sucursal ? {
        ...cloneData.sucursal,
        codigo: cloneData.sucursal.codigo || cloneData.sucursal.idExterno || '',
      } : null;
      if (sucursalCloneNorm) {
        setSucursalesCache(prev => {
          const existe = prev.find((x: any) => x.codigo === sucursalCloneNorm!.codigo || x.idExterno === sucursalCloneNorm!.codigo);
          if (existe) return prev;
          return [...prev, sucursalCloneNorm as any];
        });
        setSelectedSucursal(sucursalCloneNorm);
      } else {
        setSelectedSucursal(null);
      }
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
        impuesto: x.impuesto || 0,
        esDocumentoInventario: true,
        perdida: x.perdida || 0,
        generarPerdida: false,
      }));
      setDocumentosRelacionados(docsPagoClone);
      setDevoluciones(devsMapeadasClone);
      // Normalizar desde impuestosFactura (anidado) si viene de clon
      setImpuestosRetenciones((cloneData.impuestosFactura || []).map((imp: any) => ({
        codigo: imp.impuesto?.codigo,
        idExterno: imp.impuesto?.idExterno,
        nombre: imp.impuesto?.nombre,
        porcentaje: imp.impuesto?.porcentaje,
        tipo: imp.tipo,
        monto: imp.monto,
      })));

      setAsientos(cloneData.asientos || []);
      setDetallesMovimiento(cloneData.detallesMovimiento || cloneData.detalles || []);
      setNcfModificadoVal(cloneData.ncfModificado || '');
      setNcfTipo(cloneData.ncfModificado ? 'modificado' : 'documento');

      const fechaDoc = cloneData.fechaDocumento ? parseDateRaw(cloneData.fechaDocumento) : null;
      form.setFieldsValue({
        concepto: cloneData.concepto?.codigo || '',
        tipo: cloneData.tipo?.codigo || '',
        entidad: entidadCloneNorm?.codigo || '',
        fechaDocumento: fechaDoc ? dayjs(fechaDoc) : dayjs(),
        total: cloneData.total || 0,
        ncf: cloneData.ncf || '',
        tasa: cloneData.tasa || 1,
        referencia: cloneData.referencia || '',
        nota: cloneData.nota || '',
        sucursal: sucursalCloneNorm?.codigo || '',
        bienes: cloneData.bienes || 0,
        servicios: cloneData.servicios || 0,
      });
      setMontoTotalConfirmado(Number(cloneData.total) || 0);
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
          impuestosFactura: res.impuestosFactura || [],
          asientos: res.asientos || [],
          logs: res.logs || [],
          sucursal: res.sucursal,
          bienes: res.bienes || 0,
          servicios: res.servicios || 0,
        };
        setData(full);
        setSelectedConcepto(full.concepto || null);
        setSelectedTipo(full.tipo || null);
        const entidadNormalizada = full.entidad ? {
          ...full.entidad,
          codigo: full.entidad.codigo || full.entidad.idExterno || '',
        } : null;
        setSelectedEntidad(entidadNormalizada);
        setEntidadesCache(entidadNormalizada ? [entidadNormalizada as any] : []);
        // Separar transaccionesAsociadas en pagos (esDocumentoInventario=false) y devoluciones (esDocumentoInventario=true)
        const todasAsociadas = res.transaccionesAsociadas || [];
        const docsPago = todasAsociadas
          .filter((x: any) => !x.esDocumentoInventario)
          .map((x: any) => ({ ...x, nCF: x.nCF || x.ncf || '' }));
        const docsInventario = todasAsociadas.filter((x: any) => x.esDocumentoInventario);
        const devsMapeadas = docsInventario.map((x: any) => ({
          transaccionAsociadaID: x.transaccionAsociadaID || x.id,
          documento: x.documento,
          fecha: x.fecha,
          montoOriginal: x.montoOriginal,
          monto: x.monto,
          impuesto: x.impuesto || 0,
          esDocumentoInventario: true,
          perdida: x.perdida || 0,
          generarPerdida: false,
        }));
        setDocumentosRelacionados(docsPago);
        setDevoluciones(devsMapeadas);
        // Normalizar de estructura anidada → plana para la UI
        setImpuestosRetenciones((full.impuestosFactura || []).map((imp: any) => ({
          codigo: imp.impuesto?.codigo,
          idExterno: imp.impuesto?.idExterno,
          nombre: imp.impuesto?.nombre,
          porcentaje: imp.impuesto?.porcentaje,
          tipo: imp.tipo,
          monto: imp.monto,
        })));
        setAsientos(full.asientos || []);
        setDetallesMovimiento(res.detallesMovimiento || res.detalles || []);
        setNcfModificadoVal(full.ncfModificado || '');
        setNcfTipo(full.ncfModificado ? 'modificado' : 'documento');
        // Auto-asignar ncfModificado desde el primer documento relacionado (no inventario) que tenga NCF
        if (!full.ncfModificado && docsPago.length > 0) {
          const docNcf = docsPago[0].ncf || docsPago[0].nCF || '';
          if (docNcf) {
            setNcfModificadoVal(docNcf);
            setNcfTipo('modificado');
          }
        }

        const fechaDoc = full.fechaDocumento ? parseDateRaw(full.fechaDocumento) : null;

        const entidadCodigo = full.entidad?.codigo || full.entidad?.idExterno || '';

        // Normalizar sucursal
        const sucursalData = full.sucursal ? {
          ...full.sucursal,
          codigo: full.sucursal.codigo || full.sucursal.idExterno || '',
        } : null;

        if (sucursalData) {
          setSucursalesCache(prev => {
            const existe = prev.find((x: any) => x.codigo === sucursalData!.codigo || x.idExterno === sucursalData!.codigo);
            if (existe) return prev;
            return [...prev, sucursalData as any];
          });
          setSelectedSucursal(sucursalData);
        }

        form.setFieldsValue({
          concepto: full.concepto?.codigo || '',
          tipo: full.tipo?.codigo || '',
          entidad: entidadCodigo,
          fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          total: full.total || 0,
          ncf: full.ncf || '',
          tasa: full.tasa || 1,
          referencia: full.referencia || '',
          nota: full.nota || '',
          sucursal: sucursalData?.codigo || '',
          bienes: full.bienes || 0,
          servicios: full.servicios || 0,
        });
        setMontoTotalConfirmado(Number(full.total) || 0);

        // Cargar entidades según el concepto
        if (full.concepto?.codigo) {
          entidadApi.obtenerEntidades(sucursalActiva, full.concepto.codigo, true, tipoEntidad)
            .then((ents: any[]) => {
              if (full.entidad && !ents.find((e: any) => e.codigo === entidadCodigo)) {
                ents = [entidadNormalizada as any, ...ents];
              }
              setEntidadesCache(ents);
            })
            .catch(() => {
              if (full.entidad) {
                setEntidadesCache([full.entidad as any]);
              }
            });
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
          navigate(`/${codigoPantalla}`, { replace: true });
        } else {
          navigate(`/${codigoPantalla}/${id}`, { replace: true });
        }
      },
    });
  };

  // ===== Handlers de Concepto =====
  const handleConceptoSelect = (concepto: ConceptoDTO) => {
    setSelectedConcepto(concepto);

    // Cargar entidades según el concepto
    entidadApi.obtenerEntidades(sucursalActiva, concepto.codigo, true, tipoEntidad)
      .then((ents) => setEntidadesCache(ents))
      .catch(() => {});

    // === ConfigurarMoneda ===
    const monedaObj = concepto.moneda || getMonedaSucursalActiva();
    const monedaFull = { nombre: monedaObj.nombre, simbolo: (monedaObj as any).simbolo || getMonedaSucursalActiva().simbolo, codigo: monedaObj.codigo };
    // Actualizar data local para que la UI lo refleje
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, moneda: monedaFull };
    });

    form.setFieldsValue({
      concepto: concepto.codigo,
      moneda: monedaObj.nombre,
      tasa: monedaObj.tasa ?? 1,
    });

    // === NoImpuesto: si el concepto no acepta impuestos, limpiarlos ===
    const prevNoImpuesto = selectedConcepto?.noImpuesto;
    if (concepto.noImpuesto) {
      // Limpiar impuestosRetenciones si existe alguno
      const hayImpuestos = impuestosRetenciones.length > 0;
      if (hayImpuestos) {
        const backup = new Map<number, { impuesto?: any; porcentajeImpuesto: number }>();
        impuestosRetenciones.forEach((i, idx) => {
          if ((i.monto || 0) > 0) {
            backup.set(idx, { impuesto: i, porcentajeImpuesto: i.porcentaje || 0 });
          }
        });
        (impuestosBackupRef as any).current = backup;
        message.warning('El Concepto no acepta Impuestos, por lo que serán eliminados.');
        setImpuestosRetenciones([]);
      }
    } else if (prevNoImpuesto && !concepto.noImpuesto) {
      // Restoration not implemented for ND since impuestosRetenciones are managed via modal
    }
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
    if (docs.length === 0) return;
    const d = docs[0]; // solo el primer documento seleccionado
    setDocumentosRelacionados([{
      transaccionAsociadaID: d.transaccionAsociadaID,
      id: d.id,
      documento: d.documento,
      nCF: d.nCF,
      montoOriginal: d.montoOriginal,
      pagado: d.pagado,
      saldoPendiente: d.saldoPendiente,
      monto: d.monto,
    }]);
    // Auto-asignar NCF Modificado desde el documento
    if (d.nCF) {
      setNcfTipo('modificado');
      setNcfModificadoVal(d.nCF);
    }
  };

  const handleDocRelacionadoRemove = (id?: number) => {
    setDocumentosRelacionados([]);
    setNcfModificadoVal('');
    if (ncfTipo === 'modificado') {
      setNcfTipo('documento');
    }
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
          documento: d.documento,
          fecha: d.fecha,
          montoOriginal: d.montoOriginal,
          monto: d.monto,
          impuesto: d.impuesto || 0,
          esDocumentoInventario: true,
          perdida: 0,
          generarPerdida: false,
        }));
      return [...prev, ...nuevos];
    });

    // Auto-cargar impuestos desde devoluciones calientes
    const tipoCalienteCodigo = useCompanyStore.getState().tipoDevolucionCaliente?.codigo;
    docs.forEach((d: any) => {
      const noDoc = d.documento?.includes('-') ? d.documento.split('-').slice(1).join('-') : (d.documento || '');
      console.warn('NotaDebito: devolucion seleccionada', { documento: d.documento, noDoc, sucursal: sucursalActiva });
      if (noDoc) {
        devolucionCompraApi.obtenerPorNoDocumento(sucursalActiva, noDoc)
          .then((devolucion: any) => {
            if (devolucion?.detalles && (!tipoCalienteCodigo || devolucion?.tipo?.codigo === tipoCalienteCodigo)) {
                const impuestosMap = new Map<string, { codigo: string; nombre: string; porcentaje: number; tipo: string; monto: number }>();
                devolucion.detalles
                  .filter((det: any) => det.impuesto != null && det.impuestos > 0)
                  .forEach((det: any) => {
                    const key = det.impuesto.idExterno || det.impuesto.codigo;
                    if (impuestosMap.has(key)) {
                      impuestosMap.get(key)!.monto += det.impuestos;
                    } else {
                      impuestosMap.set(key, {
                        codigo: det.impuesto.codigo,
                        nombre: det.impuesto.nombre,
                        porcentaje: det.impuesto.porcentaje,
                        tipo: 'Impuesto',
                        monto: det.impuestos,
                      });
                    }
                  });
                if (impuestosMap.size > 0) {
                  setImpuestosRetenciones((prev) => {
                    const nuevos = Array.from(impuestosMap.values());
                    const existentes = new Map(prev.map((i) => [i.codigo, i]));
                    for (const n of nuevos) {
                      const existente = existentes.get(n.codigo);
                      if (existente) {
                        existente.monto = (existente.monto || 0) + n.monto;
                      } else {
                        existentes.set(n.codigo, { ...n, id: n.codigo, baseImponible: 0 });
                      }
                    }
                    return Array.from(existentes.values());
                  });
                }
              }
            })
            .catch((err: any) => {
              console.warn('NotaDebito: error al cargar devolución para impuestos', err?.response?.data || err?.message || err);
            });
        }
      });
  };

  const handleDevolucionRemove = (id?: number) => {
    setDevoluciones((prev) => prev.filter((d) => d.transaccionAsociadaID !== id));
  };

  const handleDevMontoChange = (id: number | undefined, monto: number) => {
    setDevoluciones((prev) =>
      prev.map((d) =>
        d.transaccionAsociadaID === id
          ? {
              ...d,
              monto,
              perdida: ((d.montoOriginal || 0) + (d.impuesto || 0)) - monto,
              generarPerdida: false,
            }
          : d
      )
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

  // ===== Handler para agregar asiento manual =====
  const handleAgregarAsientoManual = (cuenta: any) => {
    const nuevoAsiento = {
      id: Date.now(),
      cuentaContable: { noCuenta: cuenta.noCuenta, nombre: cuenta.nombre },
      monto: 0,
      tipoAsiento: 'D',
      generado: false,
      descripcion: '',
    };
    setAsientos((prev: any[]) => [...prev, nuevoAsiento]);
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

    const entidadSel = entidadesCache.find((e) => e.codigo === values.entidad || e.idExterno === values.entidad) || selectedEntidad;

    const fechaDoc = values.fechaDocumento
      ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
        ? toISOFormat(values.fechaDocumento.toDate())
        : values.fechaDocumento)
      : toISOFormat(new Date());

    const montoTotal = Number(values.total) || 0;
    const totalImpuestos = impuestosRetenciones
      .filter((i) => i.tipo === 'Impuesto' || i.tipo === 'Informativo' || i.tipo === 'Otro' || !i.tipo)
      .reduce((s, i) => s + (i.monto || 0), 0);

    // Asegurar documento con origenCuenta desde companyStore
    const { documentos } = useCompanyStore.getState().data;
    const docConfig = documentos.find((d: any) => d.codigo === 'ND');
    const docOrigenCuenta = base.documento?.origenCuenta ?? docConfig?.origenCuenta ?? OrigenCuenta.Desconocido;
    const documento = base.documento?.codigo
      ? { ...base.documento, origenCuenta: docOrigenCuenta }
      : { codigo: 'ND', origenCuenta: docOrigenCuenta };

    // Asegurar entidad con tipoEntidad
    const tipoEntidadStr = tipoEntidad;
    const entidadBaseObj = base.entidad || entidadSel || { nombre: '', codigo: '', identificacion: '' };
    const entidad = {
      ...entidadBaseObj,
      cuentaContable: entidadBaseObj.cuentaContable,
      tipoEntidad: entidadBaseObj.tipoEntidad ?? {
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
      documento,
      concepto: selectedConcepto || { codigo: '', nombre: '' },
      codigoTipo: selectedTipo?.codigo || '',
      entidad,
      moneda: base.moneda || getMonedaSucursalActiva(),
      sucursal: selectedSucursal ? { codigo: selectedSucursal.codigo || selectedSucursal.idExterno, idExterno: selectedSucursal.idExterno, nombre: selectedSucursal.nombre || '' } : undefined,
      // Combinar pagos y devoluciones en transaccionesAsociadas (formato TransaccionAsociadaDTO)
      transaccionesAsociadas: [...documentosRelacionados, ...devoluciones.map((d: DevolucionAsociadaDTO) => ({
        transaccionAsociadaID: d.transaccionAsociadaID,
        documento: d.documento,
        fecha: d.fecha,
        montoOriginal: d.montoOriginal,
        monto: d.monto,
        perdida: d.perdida || 0,
        esDocumentoInventario: true,
        tipoDocumento: 24,    // TipoDocumento.DVC = 24
      }))],
      // Transformar estructura plana → anidada para el backend
      impuestosFactura: impuestosRetenciones.map((imp) => ({
        monto: imp.monto || 0,
        tipo: imp.tipo || 'Impuesto',
        impuesto: {
          codigo: imp.codigo || '',
          idExterno: imp.idExterno || (imp.codigo || '').replace(/^IMP-0*/, '') || null,
          nombre: imp.nombre || '',
          porcentaje: imp.porcentaje || 0,
        },
      })),
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
        navigate(`/${codigoPantalla}/${result.id}`, { replace: true });
      } else {
        await notaDebitoApi.actualizar(sucursalActiva, dto);
        message.success('Nota de Débito actualizada exitosamente');
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
      const asientosGenerados = await notaDebitoApi.generarAsientos(sucursalActiva, dto);
      setAsientos(asientosGenerados);
      message.success(`Se generaron ${asientosGenerados.length} asientos`);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al generar asientos');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== handleRefresh =====
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
          impuestosFactura: res.impuestosFactura || [],
          asientos: res.asientos || [], logs: res.logs || [],
          sucursal: res.sucursal,
          bienes: res.bienes || 0,
          servicios: res.servicios || 0,
        };
        setData(full); setSelectedConcepto(full.concepto || null);
        setSelectedTipo(full.tipo || null);
        const entidadRefreshNorm = full.entidad ? {
          ...full.entidad,
          codigo: full.entidad.codigo || full.entidad.idExterno || '',
        } : null;
        setSelectedEntidad(entidadRefreshNorm);
        // Separar transaccionesAsociadas en pagos y devoluciones
        const todasAsociadasRefresh = res.transaccionesAsociadas || [];
        const docsPagoRefresh = todasAsociadasRefresh
          .filter((x: any) => !x.esDocumentoInventario)
          .map((x: any) => ({ ...x, nCF: x.nCF || x.ncf || '' }));
        const docsInventarioRefresh = todasAsociadasRefresh.filter((x: any) => x.esDocumentoInventario);
        const devsMapeadasRefresh = docsInventarioRefresh.map((x: any) => ({
          transaccionAsociadaID: x.transaccionAsociadaID || x.id,
          documento: x.documento,
          fecha: x.fecha,
          montoOriginal: x.montoOriginal,
          monto: x.monto,
          impuesto: x.impuesto || 0,
          esDocumentoInventario: true,
          perdida: x.perdida || 0,
          generarPerdida: false,
        }));
        setDocumentosRelacionados(docsPagoRefresh);
        setDevoluciones(devsMapeadasRefresh);
        // Normalizar de estructura anidada → plana para la UI
        setImpuestosRetenciones((full.impuestosFactura || []).map((imp: any) => ({
          codigo: imp.impuesto?.codigo,
          idExterno: imp.impuesto?.idExterno,
          nombre: imp.impuesto?.nombre,
          porcentaje: imp.impuesto?.porcentaje,
          tipo: imp.tipo,
          monto: imp.monto,
        })));
        setAsientos(full.asientos || []);
        setDetallesMovimiento(res.detallesMovimiento || res.detalles || []);
        setNcfModificadoVal(full.ncfModificado || '');
        setNcfTipo(full.ncfModificado ? 'modificado' : 'documento');
        // Auto-asignar ncfModificado desde el primer documento relacionado (no inventario) que tenga NCF
        if (!full.ncfModificado && docsPagoRefresh.length > 0) {
          const docNcf = docsPagoRefresh[0].ncf || docsPagoRefresh[0].nCF || '';
          if (docNcf) {
            setNcfModificadoVal(docNcf);
            setNcfTipo('modificado');
          }
        }
        const fechaDoc = full.fechaDocumento ? parseDateRaw(full.fechaDocumento) : null;

        // Normalizar sucursal (handleRefresh)
        const sucursalRefreshData = full.sucursal ? {
          ...full.sucursal,
          codigo: full.sucursal.codigo || full.sucursal.idExterno || '',
        } : null;

        if (sucursalRefreshData) {
          setSucursalesCache(prev => {
            const existe = prev.find((x: any) => x.codigo === sucursalRefreshData!.codigo || x.idExterno === sucursalRefreshData!.codigo);
            if (existe) return prev;
            return [...prev, sucursalRefreshData as any];
          });
          setSelectedSucursal(sucursalRefreshData);
        }

        form.setFieldsValue({
          concepto: full.concepto?.codigo || '', tipo: full.tipo?.codigo || '',
          entidad: entidadRefreshNorm?.codigo || '', fechaDocumento: fechaDoc ? dayjs(fechaDoc) : null,
          total: full.total || 0, ncf: full.ncf || '', tasa: full.tasa || 1,
          referencia: full.referencia || '', nota: full.nota || '',
          sucursal: sucursalRefreshData?.codigo || '',
          bienes: full.bienes || 0, servicios: full.servicios || 0,
        });
        setMontoTotalConfirmado(Number(full.total) || 0);
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        message.error(msg); setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, form, mode]);

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
    {
      title: 'Monto Original', dataIndex: 'montoOriginal', key: 'montoOriginal', width: 140, align: 'right' as const,
      render: (_: any, record: DevolucionAsociadaDTO) => formatNumber((record.montoOriginal || 0) + (record.impuesto || 0)),
    },
    {
      title: 'Monto Asignado', dataIndex: 'monto', key: 'monto', width: 220, align: 'right' as const,
      render: (_: any, record: DevolucionAsociadaDTO, idx: number) => {
        const montoSub = devoluciones[idx]?.monto || 0;
        const imp = record.impuesto || 0;
        return (
          <Space size={4}>
            <InputNumber
              size="small"
              style={{ width: 120 }}
              min={0}
              step={0.01}
              precision={2}
              value={montoSub}
              onChange={(val) => handleDevMontoChange(record.transaccionAsociadaID, val || 0)}
            />
            <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
              Total: {formatNumber(montoSub + imp)}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Pérdida',
      dataIndex: 'perdida',
      key: 'perdida',
      width: 130,
      align: 'right' as const,
      render: (v: number) => {
        const val = v ?? 0;
        if (val === 0) return <Text style={{ color: '#8c8c8c' }}>-</Text>;
        return (
          <Text style={{ color: val > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
            {val > 0 ? '− ' : '+ '}{formatCurrency(Math.abs(val))}
          </Text>
        );
      },
    },
    {
      title: 'Gen. Pérdida',
      dataIndex: 'generarPerdida',
      key: 'generarPerdida',
      width: 110,
      render: (_: any, record: DevolucionAsociadaDTO, idx: number) => (
        <Switch
          size="small"
          checked={record.generarPerdida}
          onChange={(checked) => {
            setDevoluciones((prev) =>
              prev.map((d, i) => i === idx ? { ...d, generarPerdida: checked } : d)
            );
          }}
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
      render: (_: any, record: any, idx: number) => (
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
      render: (_: any, record: any) => (
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
            <ConceptoInfoLabel concepto={selectedConcepto} />
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
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={0.01}
                  precision={2}
                  onBlur={() => {
                    const val = form.getFieldValue('total') || 0;
                    setMontoTotalConfirmado(Number(val));
                  }}
                  onPressEnter={() => {
                    const val = form.getFieldValue('total') || 0;
                    setMontoTotalConfirmado(Number(val));
                  }}
                />
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
          <TotalesSection
            impuestosRetenciones={impuestosRetenciones}
            montoTotal={montoTotalConfirmado}
            perdidas={devoluciones.reduce((s, d) => s + (d.perdida || 0), 0)}
          />
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
            {(() => {
              const totales = calcularTotales(impuestosRetenciones, Number(montoTotalConfirmado) || 0);
              return (
                <>
                  <Text className="paces-text-secondary">SubTotal: <strong>{formatNumber(totales.subTotal)}</strong></Text>
                  <Text className="paces-text-secondary">Impuestos: <strong>{formatNumber(totales.impuestos)}</strong></Text>
                  <Text className="paces-text-secondary">Retenciones: <strong>{formatNumber(totales.retenciones)}</strong></Text>
                </>
              );
            })()}
          </div>
        </>
      ),
    },
    {
      key: 'asientos',
      label: `Asientos (${asientos.length})`,
      children: (estado === 0 && tienePermisoPostear) ? (
        <>
          <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
            <Button icon={<PlusOutlined />} onClick={() => setCuentaModalAsientoOpen(true)}>
              Agregar asiento manual
            </Button>
          </div>
          <AsientosContableEditables
            asientos={asientos}
            onChange={setAsientos}
            editable={true}
            onGenerar={handleGenerarAsientos}
            generando={saving}
            disableGenerar={!id}
          />
        </>
      ) : (
        <AsientosContableTable
          asientos={asientos}
          scroll={{ x: 600 }}
          rowKey={(r: any) => r.id || r.asientoID}
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
        origen={(() => { const { documentos } = useCompanyStore.getState().data; const ndConfig = documentos.find((d: any) => d.codigo === 'ND'); const ndOrigen = ndConfig?.origenCuenta ?? OrigenCuenta.Desconocido; return typeof ndOrigen === 'number' ? ndOrigen : (ndOrigen === 'Credito' ? OrigenCuenta.Credito : OrigenCuenta.Debito); })()}
        montoTotal={Number(form.getFieldValue('total')) || 0}
      />
      {tipoEntidad === 'SUP' && (
        <BuscarDocumentoModal
          open={buscarDevModalOpen}
          onClose={() => setBuscarDevModalOpen(false)}
          onSelect={handleDevolucionSelect}
          tipoEntidad={tipoEntidad}
          codEntidad={selectedEntidad?.codigo || ''}
          origen={(() => { const { documentos } = useCompanyStore.getState().data; const ndConfig = documentos.find((d: any) => d.codigo === 'ND'); const ndOrigen = ndConfig?.origenCuenta ?? OrigenCuenta.Desconocido; return typeof ndOrigen === 'number' ? ndOrigen : (ndOrigen === 'Credito' ? OrigenCuenta.Credito : OrigenCuenta.Debito); })()}
          esDocumentoInventario={true}
          montoTotal={Number(form.getFieldValue('total')) || 0}
        />
      )}

      {/* Modal de selección de impuestos / retenciones */}
      <SeleccionarImpuestosModal
        open={modalImpuestosOpen}
        onClose={() => setModalImpuestosOpen(false)}
        onConfirm={handleConfirmarImpuestos}
        tipoEntidad={tipoEntidad}
        sucursal={sucursalActiva}
        existentes={impuestosRetenciones.map((i: any) => ({
          codigo: i.codigo || '',
          nombre: i.nombre || '',
          porcentaje: i.porcentaje || 0,
          tipo: i.tipo || 'Impuesto',
          monto: i.monto,
        }))}
      />

      {/* Modal de búsqueda de cuenta contable para asientos manuales */}
      <BuscarCuentaContableModal
        open={cuentaModalAsientoOpen}
        onClose={() => setCuentaModalAsientoOpen(false)}
        onSelect={(cuenta) => {
          handleAgregarAsientoManual(cuenta);
          setCuentaModalAsientoOpen(false);
        }}
        sucursal={sucursalActiva}
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

