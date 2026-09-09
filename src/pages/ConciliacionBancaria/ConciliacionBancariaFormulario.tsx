import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Button, Space, Row, Col, Grid, Form, Input, InputNumber, Select, DatePicker, Typography, message, Modal, Alert, Spin, Upload, Divider, Checkbox, Descriptions,
} from 'antd';
import {
  SaveOutlined, CloseOutlined, UploadOutlined, PlusOutlined, DeleteOutlined, CheckCircleFilled, SearchOutlined, ArrowUpOutlined, ArrowDownOutlined, DownloadOutlined, FilterFilled, FilterOutlined, FileTextOutlined, ReloadOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { conciliacionBancariaApi } from '../../api/conciliacionBancariaApi';
import { transaccionBancariaApi } from '../../api/transaccionBancariaApi';
import { conceptosApi } from '../../api/conceptosApi';
import { entidadApi } from '../../api/entidadApi';
import BuscarEntidadSelect from '../../components/BuscarEntidadSelect/BuscarEntidadSelect';
import { extraerMensajeError, formatCurrency, formatNumber, formatDate } from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import FiltroSeleccionDropdown from '../../components/FiltroSeleccionDropdown';
import type {
  ConciliacionBancariaDTO, MovimientoBancarioDTO, CuentaBancariaDTO, TransaccionConciliadaDTO, ResumenTipoDocumentoDTO, ResumenGeneralConciliacionDTO, PlantillaImportacionDTO,
} from '../../types/conciliacionBancaria';
import type { ConceptoDTO } from '../../types/entradaAlmacen';

const { Text } = Typography;
const { TextArea } = Input;

const TIPOS_DOC_BANCARIO = [
  { codigo: 'CHK', nombre: 'Cheque' },
  { codigo: 'DEP', nombre: 'Depósito Bancario' },
  { codigo: 'TRB', nombre: 'Transferencia Bancaria' },
  { codigo: 'NCB', nombre: 'Nota Crédito Bancaria' },
  { codigo: 'NDB', nombre: 'Nota Débito Bancaria' },
  { codigo: 'CBI', nombre: 'Crédito Bancario Importado' },
  { codigo: 'DBI', nombre: 'Débito Bancario Importado' },
  { codigo: 'VD', nombre: 'Venta de Divisas' },
];

const normalizarFechaMatching = (valor: string): string => {
  const texto = (valor || '').trim();
  if (!texto) return '';

  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const diaMesAnio = texto.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})/);
  if (diaMesAnio) return `${diaMesAnio[3]}-${diaMesAnio[2]}-${diaMesAnio[1]}`;

  const fecha = dayjs(texto);
  return fecha.isValid() ? fecha.format('YYYY-MM-DD') : '';
};

const obtenerClaveMatching = (referencia: string, fecha: string, monto: number): string => {
  const referenciaNormalizada = (referencia || '').trim().replace(/^0+/, '');
  const fechaNormalizada = normalizarFechaMatching(fecha);
  if (!referenciaNormalizada || !fechaNormalizada) return '';
  return `${referenciaNormalizada}|${fechaNormalizada}|${Number(monto).toFixed(2)}`;
};

const ConciliacionBancariaFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ConciliacionBancariaDTO | null>(null);
  const [resumenGeneral, setResumenGeneral] = useState<ResumenGeneralConciliacionDTO | null>(null);
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancariaDTO[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoBancarioDTO[]>([]);
  const [archivoImportado, setArchivoImportado] = useState<File | null>(null);
  const [hashArchivoImportado, setHashArchivoImportado] = useState<string>('');
  // Hashes de archivos importados en esta sesión de edición (sin guardar): evita duplicar el mismo archivo.
  const hashesImportadosRef = useRef<Set<string>>(new Set());
  const [importando, setImportando] = useState(false);
  // Transacciones sin conciliar de la cuenta (tab in tránsito)
  const [transaccionesSinConciliar, setTransaccionesSinConciliar] = useState<TransaccionConciliadaDTO[]>([]);
  const [cargandoTransito, setCargandoTransito] = useState(false);
  // Carga bajo demanda (modo editar): banderas para no recargar movimientos/tránsito al cambiar de tab.
  const [movimientosCargados, setMovimientosCargados] = useState(false);
  const [transitoCargado, setTransitoCargado] = useState(false);
  // Transacciones conciliadas + en tránsito de ESTA conciliación (para exportar sin barrer CTRANSAC).
  const [transaccionesDetalle, setTransaccionesDetalle] = useState<TransaccionConciliadaDTO[]>([]);
  const [enTransito, setEnTransito] = useState<TransaccionConciliadaDTO[]>([]);
  const [transaccionesCargadas, setTransaccionesCargadas] = useState(false);
  const [enTransitoCargado, setEnTransitoCargado] = useState(false);
  // Movimiento cuyo modal de candidatos (mismo monto) está abierto; null = cerrado.
  const [movimientoModal, setMovimientoModal] = useState<MovimientoBancarioDTO | null>(null);
  // Modal de conciliación automática (movimientos con un solo candidato exacto).
  const [modalAuto, setModalAuto] = useState(false);
  const [seleccionAuto, setSeleccionAuto] = useState<number[]>([]);
  const [searchConcil, setSearchConcil] = useState('');
  const [searchSinConcil, setSearchSinConcil] = useState('');
  const [searchResumen, setSearchResumen] = useState('');
  const [searchResumenTransito, setSearchResumenTransito] = useState('');
  const [searchTransito, setSearchTransito] = useState('');
  const [exportandoLibros, setExportandoLibros] = useState(false);
  const [exportandoTransito, setExportandoTransito] = useState(false);
  const [recargandoFecha, setRecargandoFecha] = useState(false);
  // Modal crear documento bancario
  const [modalCrearDoc, setModalCrearDoc] = useState<MovimientoBancarioDTO | null>(null);
  const [tipoDocSeleccionado, setTipoDocSeleccionado] = useState<string>('');
  const [fechaDocSeleccionada, setFechaDocSeleccionada] = useState<dayjs.Dayjs | null>(null);
  const [conceptoSeleccionado, setConceptoSeleccionado] = useState<string>('');
  const [conceptosDoc, setConceptosDoc] = useState<ConceptoDTO[]>([]);
  const [creandoDoc, setCreandoDoc] = useState(false);
  const [entidadSeleccionada, setEntidadSeleccionada] = useState<{ codigo: string; nombre: string; identificacion?: string; activo?: boolean } | null>(null);
  const [entidadesCache, setEntidadesCache] = useState<{ codigo: string; nombre: string; identificacion?: string; activo?: boolean }[]>([]);
  // Filtros tipo Excel
  const [filtrosConciliadas, setFiltrosConciliadas] = useState<Record<string, { valor: string[] }>>({});
  const [filtrosSinConciliar, setFiltrosSinConciliar] = useState<Record<string, { valor: string[] }>>({});
  const [filtrosTransito, setFiltrosTransito] = useState<Record<string, { valor: string[] }>>({});
  const [filtrosResumen, setFiltrosResumen] = useState<Record<string, { valor: string[] }>>({});
  const [filtrosResumenTransito, setFiltrosResumenTransito] = useState<Record<string, { valor: string[] }>>({});

  const [form] = Form.useForm();
  const fechaInicialCargada = useRef(false);
const balLibrosInicialCargado = useRef(false);
  const [balBancosResumen, setBalBancosResumen] = useState<number>(0);

  const isLarge = screens.xxl === true;

  // ===== Cargar cuentas bancarias =====
  useEffect(() => {
    if (sucursalActiva) {
      conciliacionBancariaApi.obtenerCuentasBancarias(sucursalActiva)
        .then(setCuentasBancarias)
        .catch(() => message.warning('No se pudieron cargar las cuentas bancarias'));
    }
  }, [sucursalActiva]);

  // ===== Cargar datos si es modo editar =====
  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;

    setLoading(true);
    // Solo encabezado: los movimientos y el tránsito se cargan bajo demanda al abrir sus tabs.
    conciliacionBancariaApi.obtenerEncabezado(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setPageTitleOverride(`Editar Conciliación N° ${res.concilID}`);
        setBalBancosResumen(res.balBancos);

        form.setFieldsValue({
          numeroCta: res.numeroCta,
          fecha: res.fecha ? dayjs(res.fecha) : null,
          fechaAnt: res.fechaAnt ? dayjs(res.fechaAnt) : null,
          balBancos: res.balBancos,
          balLibros: res.balLibros,
          notas: res.notas || '',
        });
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar la conciliación');
        message.error(msg);
        setLoadingError(true);
        navigate('/FConcil', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate, setPageTitleOverride]);

  // ===== Module & cleanup =====
  useEffect(() => {
    setActiveModule('FConcil');
    const title = mode === 'crear' ? 'Nueva Conciliación Bancaria' : '';
    setPageTitleOverride(title);
    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, resetToolbar, setPageTitleOverride, mode]);

  // ===== Handlers =====
  const handleCancelar = () => {
    Modal.confirm({
      title: 'Cancelar',
      content: 'Los cambios no guardados se perderán. ¿Está seguro que desea salir?',
      okText: 'Sí, cancelar',
      cancelText: 'No, continuar',
      okButtonProps: { danger: true },
      onOk: () => {
        navigate('/FConcil', { replace: true });
      },
    });
  };

  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // Recalcular balLibros antes de guardar (mismo comportamiento que al cambiar fecha)
      let balLibrosCalculado = values.balLibros || 0;
      if (numeroCtaForm && fechaConciliacion) {
        try {
          const fechaStr = fechaConciliacion.format('YYYY-MM-DD');
          balLibrosCalculado = await conciliacionBancariaApi.obtenerSaldoLibros(sucursalActiva, numeroCtaForm, fechaStr);
        } catch {
          // Si falla, usar el valor del formulario
        }
      }

      const dto: Partial<ConciliacionBancariaDTO> = {
        numeroCta: values.numeroCta,
        fecha: values.fecha ? values.fecha.format('YYYY-MM-DD') : '',
        fechaAnt: values.fechaAnt ? values.fechaAnt.format('YYYY-MM-DD') : '',
        balBancos: values.balBancos || 0,
        balLibros: balLibrosCalculado,
        notas: values.notas || '',
        aplicada: false,
      };

      let forceImport = false;
      if (mode === 'crear') {
        const nuevoId = await conciliacionBancariaApi.crear(sucursalActiva, dto);
        // Si hay movimientos importados, guardarlos en DARCHCON
        if (movimientos.length > 0) {
          await conciliacionBancariaApi.guardarMovimientosImportados(sucursalActiva, nuevoId, movimientos, archivoImportado?.name || '', hashArchivoImportado, false, fechaConciliacion?.format('YYYY-MM-DD'));
        }
        hashesImportadosRef.current.clear();
        message.success('Conciliación creada exitosamente');
        navigate(`/FConcil/${nuevoId}`, { replace: true });
      } else {
        // En edición, si los movimientos aún no se cargaron (no se abrió la tab de movimientos),
        // cargarlos antes de guardar para no perder el guardado de DARCHCON.
        if (!movimientosCargados) {
          await cargarMovimientos();
        }
        dto.concilID = parseInt(id!);
        // Precheck: si ya hay movimientos importados y el usuario está reemplazando, pedir confirmación.
        // Se obtiene el hash fresco de la BD para asegurar que esté disponible aunque el useEffect
        // aún no lo haya cargado.
        let hashParaCheck = hashArchivoImportado;
        if (!hashParaCheck && movimientos.length > 0) {
          try {
            hashParaCheck = await conciliacionBancariaApi.obtenerHashImportacion(sucursalActiva, parseInt(id!)) || '';
          } catch { /* si falla, se omite el precheck */ }
        }
        if (movimientos.length > 0 && hashParaCheck) {
          try {
            const hayMovimientos = await conciliacionBancariaApi.tieneMovimientosImportados(sucursalActiva, parseInt(id!));
            if (hayMovimientos) {
              const confirmed = await new Promise<boolean>((resolve) => {
                Modal.confirm({
                  title: 'Reemplazar movimientos importados',
                  icon: <ExclamationCircleOutlined />,
                  content: 'Ya existen movimientos importados para esta conciliación. Si continúas, se reemplazarán y perderás la conciliación actual. ¿Deseas continuar?',
                  okText: 'Continuar',
                  cancelText: 'Cancelar',
                  onOk: () => resolve(true),
                  onCancel: () => resolve(false),
                });
              });
              if (!confirmed) {
                setSaving(false);
                return;
              }
              forceImport = true;
            }
          } catch (e) {
            // Si falla el precheck, continuar sin force (el backend throw si hay conflicto real)
          }
        }
        // Guardar movimientos PRIMERO: si la validación de movimientos falla (ej: documento sin
        // conciliar), el encabezado no queda persistido → sin estado parcial (mismo patrón que handleGuardarYAplicar).
        const hashAEnviar = hashArchivoImportado || hashParaCheck || '';
        if (movimientos.length > 0) {
          await conciliacionBancariaApi.guardarMovimientosImportados(sucursalActiva, parseInt(id!), movimientos, archivoImportado?.name || '', hashAEnviar, forceImport, fechaConciliacion?.format('YYYY-MM-DD'));
        }
        await conciliacionBancariaApi.actualizar(sucursalActiva, parseInt(id!), dto);
        hashesImportadosRef.current.clear();
        message.success('Conciliación actualizada exitosamente');
        navigate(`/FConcil/${id}`, { replace: true });
      }
    } catch (err: any) {
      if (err?.errorFields) return; // Validation error
      const msg = extraerMensajeError(err, 'Error al guardar');
      // Mensaje de duplicado: mostrar como warning, no como error
      if (msg.includes('Ya se realizó una importación') || msg.includes('importación duplicada') || msg.includes('Este archivo ya fue importado')) {
        message.warning(msg);
      } else {
        message.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarYAplicar = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // Recalcular balLibros antes de guardar (mismo comportamiento que al cambiar fecha)
      let balLibrosCalculado = values.balLibros || 0;
      if (numeroCtaForm && fechaConciliacion) {
        try {
          const fechaStr = fechaConciliacion.format('YYYY-MM-DD');
          balLibrosCalculado = await conciliacionBancariaApi.obtenerSaldoLibros(sucursalActiva, numeroCtaForm, fechaStr);
        } catch {
          // Si falla, usar el valor del formulario
        }
      }

      const dto: Partial<ConciliacionBancariaDTO> = {
        numeroCta: values.numeroCta,
        fecha: values.fecha ? values.fecha.format('YYYY-MM-DD') : '',
        fechaAnt: values.fechaAnt ? values.fechaAnt.format('YYYY-MM-DD') : '',
        balBancos: values.balBancos || 0,
        balLibros: balLibrosCalculado,
        notas: values.notas || '',
        aplicada: true,
      };

      let forceImport = false;
      if (mode === 'crear') {
        const nuevoId = await conciliacionBancariaApi.crear(sucursalActiva, dto);
        // Si hay movimientos importados, guardarlos en DARCHCON
        if (movimientos.length > 0) {
          await conciliacionBancariaApi.guardarMovimientosImportados(sucursalActiva, nuevoId, movimientos, archivoImportado?.name || '', hashArchivoImportado, false, fechaConciliacion?.format('YYYY-MM-DD'));
        }
        await conciliacionBancariaApi.aplicar(sucursalActiva, nuevoId);
        hashesImportadosRef.current.clear();
        message.success('Conciliación creada y aplicada exitosamente');
        navigate(`/FConcil/${nuevoId}`, { replace: true });
      } else {
        // En edición, cargar movimientos antes de guardar si aún no se cargaron (ver handleGuardar).
        if (!movimientosCargados) {
          await cargarMovimientos();
        }
        dto.concilID = parseInt(id!);
        // Precheck: si ya hay movimientos importados y el usuario está reemplazando, pedir confirmación.
        // Se obtiene el hash fresco de la BD para asegurar que esté disponible aunque el useEffect
        // aún no lo haya cargado.
        let hashParaCheckYG = hashArchivoImportado;
        if (!hashParaCheckYG && movimientos.length > 0) {
          try {
            hashParaCheckYG = await conciliacionBancariaApi.obtenerHashImportacion(sucursalActiva, parseInt(id!)) || '';
          } catch { /* si falla, se omite el precheck */ }
        }
        if (movimientos.length > 0 && hashParaCheckYG) {
          try {
            const hayMovimientos = await conciliacionBancariaApi.tieneMovimientosImportados(sucursalActiva, parseInt(id!));
            if (hayMovimientos) {
              const confirmed = await new Promise<boolean>((resolve) => {
                Modal.confirm({
                  title: 'Reemplazar movimientos importados',
                  icon: <ExclamationCircleOutlined />,
                  content: 'Ya existen movimientos importados para esta conciliación. Si continúas, se reemplazarán y perderás la conciliación actual. ¿Deseas continuar?',
                  okText: 'Continuar',
                  cancelText: 'Cancelar',
                  onOk: () => resolve(true),
                  onCancel: () => resolve(false),
                });
              });
              if (!confirmed) {
                setSaving(false);
                return;
              }
              forceImport = true;
            }
          } catch (e) {
            // Si falla el precheck, continuar sin force (el backend throw si hay conflicto real)
          }
        }
        // Guardar movimientos PRIMERO: si la validación de movimientos falla (ej: documento sin
        // conciliar), el encabezado no queda persistido → sin estado parcial. El concilId ya existe
        // y el guardado de movimientos no depende del header actualizado (usa existente de BD).
        const hashAEnviarYG = hashArchivoImportado || hashParaCheckYG || '';
        if (movimientos.length > 0) {
          await conciliacionBancariaApi.guardarMovimientosImportados(sucursalActiva, parseInt(id!), movimientos, archivoImportado?.name || '', hashAEnviarYG, forceImport, fechaConciliacion?.format('YYYY-MM-DD'));
        }
        await conciliacionBancariaApi.actualizar(sucursalActiva, parseInt(id!), dto);
        await conciliacionBancariaApi.aplicar(sucursalActiva, parseInt(id!));
        hashesImportadosRef.current.clear();
        message.success('Conciliación actualizada y aplicada exitosamente');
        navigate(`/FConcil/${id}`, { replace: true });
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      const msg = extraerMensajeError(err, 'Error al guardar y aplicar');
      // Mensaje de duplicado: mostrar como warning, no como error
      if (msg.includes('Ya se realizó una importación') || msg.includes('importación duplicada') || msg.includes('Este archivo ya fue importado')) {
        message.warning(msg);
      } else {
        message.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleExportarLibros = async () => {
    if (!id) return;
    setExportandoLibros(true);
    try {
      const datos = await conciliacionBancariaApi.exportarLibros(sucursalActiva, parseInt(id));
      if (datos.length === 0) {
        message.warning('No hay movimientos para exportar');
        return;
      }
      const companyName = await getCompanyName(sucursalActiva);
      const columnHeaders = ['Tipo Doc', 'Número', 'Fecha', 'Déb/Créd', 'Monto', 'TransacID', 'Entidad', 'Conciliado'];
      const dataRows = datos.map(d => [
        d.nombreTipoDoc || d.tipoDoc,
        d.numDoc,
        d.fecha ? formatDate(d.fecha) : '',
        d.debCred === 'D' ? 'Débito' : 'Crédito',
        d.monto,
        d.transacId,
        d.entidad || '',
        d.conciliado === 'T' ? 'Sí' : 'No',
      ]);
      exportToExcel({
        companyName,
        extraHeaderRows: [[`Libro del Mayor - Conciliación ${id}`]],
        columnHeaders,
        dataRows,
        sheetName: 'Libro del Mayor',
        fileName: `libro-mayor-${id}.xlsx`,
        columnWidths: [{ wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 40 }, { wch: 12 }],
      });
      message.success('Libro del mayor exportado correctamente');
    } catch {
      message.error('Error al exportar libro del mayor');
    } finally {
      setExportandoLibros(false);
    }
  };

  const handleExportarTransito = async () => {
    if (!id) return;
    setExportandoTransito(true);
    try {
      // Usar datos ya disponibles (precargados al abrir la conciliación). Si por algún motivo
      // no están cargados, traerlos bajo demanda para no dejar el botón sin datos.
      let conciliadas = transaccionesDetalle;
      let transito = enTransito;
      if (!transaccionesCargadas) {
        conciliadas = await conciliacionBancariaApi.obtenerTransaccionesConciliadas(sucursalActiva, parseInt(id));
        setTransaccionesDetalle(conciliadas);
        setTransaccionesCargadas(true);
      }
      if (!enTransitoCargado) {
        transito = await conciliacionBancariaApi.obtenerTransaccionesSinConciliarSimple(sucursalActiva, cuentaTransito, fechaStr), conciliacionBancariaApi.obtenerEnTransito(sucursalActiva, parseInt(id));
        setEnTransito(transito);
        setEnTransitoCargado(true);
      }
      const datos = [...conciliadas, ...transito];
      if (datos.length === 0) {
        message.warning('No hay documentos en tránsito para exportar');
        return;
      }
      const companyName = await getCompanyName(sucursalActiva);
      const columnHeaders = ['Tipo Doc', 'Número', 'Fecha', 'Monto', 'Déb/Créd', 'Entidad', 'Conciliado'];
      const dataRows = datos.map(d => [
        d.nombreTipoDoc || d.tipoDoc,
        d.numDoc,
        d.fecha ? formatDate(d.fecha) : '',
        d.monto,
        d.debCred === 'D' ? 'Débito' : 'Crédito',
        d.entidad || '',
        d.concil ? 'Sí' : 'No',
      ]);
      exportToExcel({
        companyName,
        extraHeaderRows: [[`Tránsito - Conciliación ${id}`]],
        columnHeaders,
        dataRows,
        sheetName: 'Tránsito',
        fileName: `transito-${id}.xlsx`,
        columnWidths: [{ wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 40 }, { wch: 12 }],
      });
      message.success('Tránsito exportado correctamente');
    } catch {
      message.error('Error al exportar tránsito');
    } finally {
      setExportandoTransito(false);
    }
  };

  // ===== Parsear CSV a movimientos =====
  // Quita los ceros de relleno a la izquierda; devuelve "" si el valor es solo ceros.
  const normalizarCeros = (valor: string): string => {
    if (!valor.trim()) return '';
    return valor.replace(/^0+/, '');
  };

  // Normaliza un documento completo "TIPO-NUM" quitando los ceros a la izquierda del número.
  // Ej: "FAC-0100009581" -> "FAC-109581".
  const normalizarDocCompleto = (doc: string): string => {
    if (!doc) return '';
    const idx = doc.lastIndexOf('-');
    if (idx <= 0) return normalizarCeros(doc);
    return `${doc.slice(0, idx)}-${normalizarCeros(doc.slice(idx + 1))}`;
  };

  // Extrae el número de cheque del concepto: el último token numérico de exactamente 6 dígitos.
  const extraerNumeroCheque = (concepto: string): string | null => {
    const coincidencias = concepto.match(/\b\d{6}\b/g);
    return coincidencias && coincidencias.length > 0 ? coincidencias[coincidencias.length - 1] : null;
  };

  // Divide una línea CSV por el separador indicado respetando campos entrecomillados
  // con comillas dobles (ej: "16,176,711.50" no se parte por las comas internas).
  const splitCsvLine = (linea: string, separador: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < linea.length; i++) {
      const c = linea[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === separador && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += c;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseCSVaMovimientos = (text: string): MovimientoBancarioDTO[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    // Saltar encabezado si la primera línea contiene encabezados conocidos
    const firstLower = lines[0]?.toLowerCase() || '';
    const startIdx = (firstLower.includes('fecha') || firstLower.includes('fec') || firstLower.includes('numref')) ? 1 : 0;
    return lines.slice(startIdx).map((line, idx) => {
      const parts = splitCsvLine(line, ',').map(p => p.replace(/^["']|["']$/g, ''));
      // Formato Banco Popular Dominicano (BPD): 6+ columnas y columna 4 = tipo DB/CR.
      const esBpd = parts.length >= 6 && (parts[4].toUpperCase() === 'DB' || parts[4].toUpperCase() === 'CR');
      if (esBpd) {
        const numeroCheque = extraerNumeroCheque(parts[5] || '');
        const refBancoNormalizada = normalizarCeros(parts[2] || '');
        const refSecundaria = normalizarCeros(parts[7] || '');
        let numRef: string;
        let referencia: string;
        if (numeroCheque != null && refBancoNormalizada === '') {
          // La referencia del banco no aporta valor: usar el número de cheque
          numRef = numeroCheque;
          referencia = refSecundaria;
        } else {
          numRef = refBancoNormalizada;
          // La referencia del banco sí aporta: agregar el cheque como parte de la referencia
          referencia = numeroCheque != null
            ? (refSecundaria === '' ? numeroCheque : `${refSecundaria} ${numeroCheque}`)
            : refSecundaria;
        }
        return {
          orden: idx + 1,
          ctaBanc: normalizarCeros(parts[0] || ''),
          fecha: parts[1] || '',
          numRef,
          monto: parseFloat(parts[3]) || 0,
          debCred: parts[4].toUpperCase() === 'CR' ? 'C' : 'D',
          concepto: parts[5] || '',
          cotejado: false,
          referencia,
        };
      }
      return {
        orden: idx + 1,
        ctaBanc: '',
        fecha: parts[0] || '',
        numRef: parts[1] || '',
        monto: parseFloat(parts[2]?.replace(/[^0-9.\-]/g, '')) || 0,
        debCred: (parts[3] || 'D').toUpperCase() === 'C' ? 'C' : 'D',
        concepto: parts[4] || '',
        cotejado: false,
        referencia: '',
      };
    });
  };

  // ===== Importar archivo (preview en editar, parseo local en creación) =====
  const handleImportarArchivo = async (file: File) => {
    setImportando(true);
    let errorCarga = false;
    try {
      // 1. Verificar overlap de fechas en DOCTRANS (solo en modo editar con id)
      //    El hash SHA256 se calcula en el backend durante el preview
      if (id) {
        // Leer contenido del archivo para extraer fechas
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Error al leer el archivo'));
          reader.readAsText(file);
        });

        // Obtener plantilla activa para usar su mapeo de campos
        let plantilla: PlantillaImportacionDTO | null = null;
        if (cuentaTransito) {
          try {
            plantilla = await conciliacionBancariaApi.obtenerPlantillaActiva(sucursalActiva, cuentaTransito);
          } catch (e) {
            // Si falla, continuar sin plantilla (usará fallback BPD)
            console.warn('No se pudo obtener plantilla de importación:', e);
          }
        }

        // Parsear mapeo de campos si existe
        let mapeoCampos: Record<string, number> = {};
        if (plantilla?.mapeoCampos) {
          try {
            mapeoCampos = JSON.parse(plantilla.mapeoCampos);
          } catch (e) {
            mapeoCampos = {};
          }
        }

        // Determinar separador y si tiene header
        const separador = plantilla?.separador || ',';
        const usarHeader = plantilla?.usarHeader ?? true;
        const filaInicio = plantilla?.filaInicio ?? 1;

        // Encontrar índice de la columna fecha
        let idxFecha = -1;
        if (mapeoCampos) {
          const idxFechaNum = Object.entries(mapeoCampos).find(([, nombre]) => nombre === 'fecha')?.[0];
          if (idxFechaNum) idxFecha = parseInt(idxFechaNum, 10);
        }

        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        // Saltar encabezado si la plantilla lo indica o si la primera línea contiene encabezados conocidos
        const firstLower = lines[0]?.toLowerCase() || '';
        const startIdx = (usarHeader && (firstLower.includes('fecha') || firstLower.includes('fec') || firstLower.includes('numref'))) ? 1 : 0;
        const dataLines = lines.slice(Math.max(startIdx, filaInicio - 1));

        // Extraer fechas de la primera y última línea con datos
        let fechaDesde = '';
        let fechaHasta = '';
        if (dataLines.length > 0 && idxFecha >= 0) {
          // Usar plantilla: idxFecha已知
          const firstParts = dataLines[0].split(separador).map(p => p.trim());
          fechaDesde = firstParts[idxFecha]?.trim() || '';

          const lastParts = dataLines[dataLines.length - 1].split(separador).map(p => p.trim());
          fechaHasta = lastParts[idxFecha]?.trim() || '';
        } else if (dataLines.length > 0) {
          // Fallback BPD hardcodeado
          const firstParts = dataLines[0].split(',').map(p => p.trim());
          const esBpdFirst = firstParts.length >= 6 && (firstParts[4]?.toUpperCase() === 'DB' || firstParts[4]?.toUpperCase() === 'CR');
          fechaDesde = esBpdFirst ? firstParts[1]?.trim() : firstParts[0]?.trim();

          const lastParts = dataLines[dataLines.length - 1].split(',').map(p => p.trim());
          const esBpdLast = lastParts.length >= 6 && (lastParts[4]?.toUpperCase() === 'DB' || lastParts[4]?.toUpperCase() === 'CR');
          fechaHasta = esBpdLast ? lastParts[1]?.trim() : lastParts[0]?.trim();
        }

        // Normalizar fechas a yyyy-MM-dd para el backend
        const normalizarFecha = (fecha: string): string => {
          if (!fecha) return '';
          // dd/MM/yyyy -> yyyy-MM-dd
          const match = fecha.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
          if (match) {
            return `${match[3]}-${match[2]}-${match[1]}`;
          }
          // Si ya está en formato yyyy-MM-dd, retornar tal cual
          if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return fecha;
          }
          // Intentar con dayjs
          const d = dayjs(fecha);
          return d.isValid() ? d.format('YYYY-MM-DD') : '';
        };

        const fechaDesdeNorm = normalizarFecha(fechaDesde);
        const fechaHastaNorm = normalizarFecha(fechaHasta);

        if (fechaDesdeNorm && fechaHastaNorm) {
          const tieneOverlap = await conciliacionBancariaApi.verificarOverlapFechas(
            sucursalActiva,
            parseInt(id),
            fechaDesdeNorm,
            fechaHastaNorm
          );

          if (tieneOverlap) {
            setImportando(false);
            // Limpiar selección del archivo
            setArchivoImportado(null);
            setHashArchivoImportado('');
            Modal.confirm({
              title: 'Aviso',
              icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
              content: 'Ya existen movimientos conciliados para este período. Si continúas, se perderá la conciliación existente y tendrás que conciliar de nuevo. ¿Deseas continuar?',
              okText: 'Continuar',
              cancelText: 'Cancelar',
              onOk: async () => {
                // Usuario confirmó: repetir el flujo de importación
                setImportando(true);
                try {
                  setArchivoImportado(file);

                  let cantidadImportada = 0;

                  if (mode === 'editar' && id) {
                    if (!movimientosCargados) {
                      try {
                        await cargarMovimientos();
                      } catch (e) {
                        errorCarga = true;
                        throw e;
                      }
                    }
                    const { movimientos: movsDesdeApi, hashArchivo } = await conciliacionBancariaApi.importarPreview(sucursalActiva, file, parseInt(id), undefined, fechaConciliacion?.format('YYYY-MM-DD'));
                    if (hashesImportadosRef.current.has(hashArchivo)) {
                      message.warning('Este archivo ya fue importado en esta edición. No se cargará de nuevo.');
                      return;
                    }
                    hashesImportadosRef.current.add(hashArchivo);
                    setHashArchivoImportado(hashArchivo);
                    setMovimientos(prev => {
                      const maxOrden = prev.length > 0 ? Math.max(...prev.map(m => m.orden)) : 0;
                      return [...prev, ...movsDesdeApi.map((m, i) => ({ ...m, orden: maxOrden + i + 1 }))];
                    });
                    setMovimientosCargados(true);
                    cantidadImportada = movsDesdeApi.length;
                  } else {
                    const movsLocal = parseCSVaMovimientos(text);
                    setMovimientos(movsLocal);
                    cantidadImportada = movsLocal.length;
                  }
                  message.success(`${cantidadImportada} movimientos importados`);
                } catch (err: any) {
                  if (!errorCarga) {
                    const msg = extraerMensajeError(err, 'Error al importar archivo');
                    message.error(msg);
                  }
                } finally {
                  setImportando(false);
                }
              },
              onCancel: () => {
                // Usuario canceló: no hacer nada, la selección del archivo ya se limpió
              },
            });
            return;
          }
        }
      }

      // 4. Archivo válido: guardar archivo y proceder con la importación (hash viene del backend)
      setArchivoImportado(file);

      let cantidadImportada = 0;

      if (mode === 'editar' && id) {
        // Asegurar que los movimientos de BD estén cargados antes de acumular
        if (!movimientosCargados) {
          try {
            await cargarMovimientos();
          } catch (e) {
            errorCarga = true;
            throw e;
          }
        }
        // Preview: backend parsea + matching CTRANSAC + calcula hash SHA256
        const { movimientos: movsDesdeApi, hashArchivo } = await conciliacionBancariaApi.importarPreview(sucursalActiva, file, parseInt(id), undefined, fechaConciliacion?.format('YYYY-MM-DD'));
        if (hashesImportadosRef.current.has(hashArchivo)) {
          message.warning('Este archivo ya fue importado en esta edición. No se cargará de nuevo.');
          return;
        }
        hashesImportadosRef.current.add(hashArchivo);
        setHashArchivoImportado(hashArchivo);
        setMovimientos(prev => {
          const maxOrden = prev.length > 0 ? Math.max(...prev.map(m => m.orden)) : 0;
          return [...prev, ...movsDesdeApi.map((m, i) => ({ ...m, orden: maxOrden + i + 1 }))];
        });
        setMovimientosCargados(true);
        cantidadImportada = movsDesdeApi.length;
      } else {
        // Creación: usar backend con numeroCta para parseo con plantilla
        const { movimientos: movsDesdeApi, hashArchivo } = await conciliacionBancariaApi.importarPreview(sucursalActiva, file, undefined, cuentaTransito, fechaConciliacion?.format('YYYY-MM-DD'));
        setHashArchivoImportado(hashArchivo);
        setMovimientos(movsDesdeApi.map((m, i) => ({ ...m, orden: i + 1 })));
        setMovimientosCargados(true);
        cantidadImportada = movsDesdeApi.length;
      }
      message.success(`${cantidadImportada} movimientos importados`);
    } catch (err: any) {
      if (!errorCarga) {
        const msg = extraerMensajeError(err, 'Error al importar archivo');
        message.error(msg);
      }
    } finally {
      setImportando(false);
    }
  };

  // Elimina un movimiento importado. Si es un movimiento cotejado de un documento importado,
  // lo desmarca (vuelve a tránsito) en lugar de eliminarlo; si fue creado por checkbox (sin datos
  // de banco), se elimina y la transacción vuelve a tránsito sola.
  const handleEliminarMovimiento = (orden: number) => {
    const mov = movimientos.find((m) => m.orden === orden);
    if (!mov) return;

    // Si tiene transacIdConciliado, restaurar la transacción a transaccionesSinConciliar
    if (mov.cotejado && mov.transacIdConciliado) {
      const transacRecreada: TransaccionConciliadaDTO = {
        transacId: mov.transacIdConciliado,
        tipoDoc: mov.tipoDocConciliado || '',
        numDoc: mov.numDocConciliado || '',
        entidad: mov.entidad || '',
        fecha: mov.fecha,
        monto: mov.monto,
        concil: false,
        debCred: mov.debCred,
      };
      setTransaccionesSinConciliar(prev => [...prev, transacRecreada]);
    }

    setMovimientos((prev) => {
      // Movimiento cotejado de un documento importado: desmarcar para volver a tránsito.
      if (mov.cotejado && (mov.numRef || mov.concepto || mov.ctaBanc)) {
        return prev.map((m) =>
          m.orden === orden
            ? { ...m, cotejado: false, documento: '', tipoDoc: '', nombreTipoDoc: '', entidad: '', transacIdConciliado: undefined, tipoDocConciliado: undefined, numDocConciliado: undefined }
            : m
        );
      }
      // Movimiento creado por checkbox (sin datos de banco): eliminar; la transacción vuelve a tránsito sola.
      return prev.filter((m) => m.orden !== orden);
    });
  };

  // Elimina o desmarca los movimientos seleccionados.
  const handleEliminarSeleccionados = () => {
    // Primero recolectar las transacciones a restaurar
    const transaccionesARestaurar: TransaccionConciliadaDTO[] = [];
    seleccionAuto.forEach((orden) => {
      const mov = movimientos.find((m) => m.orden === orden);
      if (mov?.cotejado && mov?.transacIdConciliado) {
        transaccionesARestaurar.push({
          transacId: mov.transacIdConciliado,
          tipoDoc: mov.tipoDocConciliado || '',
          numDoc: mov.numDocConciliado || '',
          entidad: mov.entidad || '',
          fecha: mov.fecha,
          monto: mov.monto,
          concil: false,
          debCred: mov.debCred,
        });
      }
    });

    // Restaurar transacciones a transaccionesSinConciliar
    if (transaccionesARestaurar.length > 0) {
      setTransaccionesSinConciliar(prev => [...prev, ...transaccionesARestaurar]);
    }

    setMovimientos((prev) => {
      let next = [...prev];
      seleccionAuto.forEach((orden) => {
        const mov = next.find((m) => m.orden === orden);
        if (!mov) return;
        // Movimiento cotejado: desmarcar para volver a tránsito.
        if (mov.cotejado && (mov.numRef || mov.concepto || mov.ctaBanc)) {
          next = next.map((m) =>
            m.orden === orden
              ? { ...m, cotejado: false, documento: '', tipoDoc: '', nombreTipoDoc: '', entidad: '', transacIdConciliado: undefined, tipoDocConciliado: undefined, numDocConciliado: undefined }
              : m
          );
        } else {
          // Movimiento creado por checkbox: eliminar.
          next = next.filter((m) => m.orden !== orden);
        }
      });
      return next;
    });
    setSeleccionAuto([]);
  };

  // Concilia un movimiento importado con una transacción en tránsito seleccionada del modal.
  const handleConciliar = async (candidato: TransaccionConciliadaDTO) => {
    if (!movimientoModal || !id) return;
    const mov = movimientoModal;
    setMovimientos((prev) => prev.map((m) =>
      m.orden === mov.orden
        ? {
            ...m,
            documento: `${candidato.tipoDoc}-${candidato.numDoc}`,
            cotejado: true,
            tipoDoc: candidato.tipoDoc,
            nombreTipoDoc: candidato.nombreTipoDoc || '',
            entidad: candidato.entidad,
            transacIdConciliado: candidato.transacId,
            tipoDocConciliado: candidato.tipoDoc,
            numDocConciliado: candidato.numDoc,
          }
        : m
    ));
    setMovimientoModal(null);
    try {
      await conciliacionBancariaApi.conciliarTransacciones(sucursalActiva, parseInt(id), [candidato.transacId]);
      cargarTodo();
    } catch (err) {
      message.error('Error al conciliar la transacción');
    }
  };

  const handleConciliarAutomaticos = async () => {
    const transacIds: number[] = [];
    setMovimientos((prev) => {
      let next = [...prev];
      seleccionAuto.forEach((orden) => {
        const mov = next.find((m) => m.orden === orden);
        if (!mov) return;
        const candidatos = candidatosPorMonto.get(mov.monto) || [];
        if (candidatos.length !== 1) return;
        const candidato = candidatos[0];
        transacIds.push(candidato.transacId);
        next = next.map((m) =>
          m.orden === mov.orden
            ? {
                ...m,
                documento: `${candidato.tipoDoc}-${candidato.numDoc}`,
                cotejado: true,
                tipoDoc: candidato.tipoDoc,
                nombreTipoDoc: candidato.nombreTipoDoc || '',
                entidad: candidato.entidad,
              }
            : m
        );
      });
      return next;
    });
    setModalAuto(false);
    setSeleccionAuto([]);
    if (transacIds.length === 0) {
      cargarTodo();
      return;
    }
    try {
      await conciliacionBancariaApi.conciliarTransacciones(sucursalActiva, parseInt(id), transacIds);
      cargarTodo();
    } catch (err) {
      message.error('Error al conciliar las transacciones');
    }
  };

  // Abre modal para crear documento bancario desde un movimiento sin conciliar.
  const handleAbrirModalCrearDoc = async (mov: MovimientoBancarioDTO) => {
    setModalCrearDoc(mov);
    setTipoDocSeleccionado('');
    setFechaDocSeleccionada(mov.fecha ? dayjs(mov.fecha) : dayjs());
    setConceptoSeleccionado('');
    setConceptosDoc([]);
    setEntidadSeleccionada(null);
    setEntidadesCache([]);
  };

  // Carga conceptos disponibles para el tipo de documento seleccionado.
  useEffect(() => {
    if (!tipoDocSeleccionado || !sucursalActiva) {
      setConceptosDoc([]);
      return;
    }
    conceptosApi.obtenerConceptosPorDocumento(sucursalActiva, tipoDocSeleccionado)
      .then(setConceptosDoc)
      .catch(() => message.warning('No se pudieron cargar los conceptos para este tipo de documento'));
  }, [tipoDocSeleccionado, sucursalActiva]);

  // Carga entidades disponibles para el concepto seleccionado.
  useEffect(() => {
    if (!conceptoSeleccionado || !sucursalActiva) {
      setEntidadesCache([]);
      return;
    }
    entidadApi.obtenerActivos(sucursalActiva, conceptoSeleccionado)
      .then((ents) => setEntidadesCache(ents || []))
      .catch(() => {});
  }, [conceptoSeleccionado, sucursalActiva]);

  // Crea un documento bancario aplicado y posteado desde un movimiento importado.
  const handleCrearDocBancario = async () => {
    if (!modalCrearDoc || !tipoDocSeleccionado || !fechaDocSeleccionada || !conceptoSeleccionado || !entidadSeleccionada || !numeroCtaForm) {
      message.warning('Complete todos los campos para crear el documento, incluyendo la cuenta bancaria');
      return;
    }
    setCreandoDoc(true);
    try {
      const dto = {
        tipoDocumento: tipoDocSeleccionado,
        fechaDocumento: fechaDocSeleccionada.format('YYYY-MM-DD'),
        codigoConcepto: conceptoSeleccionado,
        codigoEntidad: entidadSeleccionada.codigo,
        nombreEntidad: entidadSeleccionada.nombre,
        subTotal: modalCrearDoc.monto,
        referencia: modalCrearDoc.numRef,
        ctaBancaria: numeroCtaForm || data?.numeroCta || '',
        nota: modalCrearDoc.concepto,
        estado: 1, // Validado (aplicado)
        total: modalCrearDoc.monto,
        tasa: 1,
        descuento: 0,
        impuestos: 0,
      };
      const nuevoId = await transaccionBancariaApi.crearDocBancario(sucursalActiva, dto, true);
      // Obtener el documento para usar el numero real generado por el backend
      const docCreado = await transaccionBancariaApi.obtenerPorId(sucursalActiva, nuevoId);
      const noDocumentoReal = docCreado.noDocumento;
      const documentoCompleto = `${tipoDocSeleccionado}-${noDocumentoReal}`;
      const entidadNombre = entidadSeleccionada.nombre;
      // Abrir nueva pestaña con el documento creado
      window.open(`/FTransBanco/${nuevoId}`, '_blank');
      // Marcar movimiento como conciliado y agregar documento creado a movimientos
      const tipoInfo = TIPOS_DOC_BANCARIO.find(t => t.codigo === tipoDocSeleccionado);
      setMovimientos(prev => prev.map(m =>
        m.orden === modalCrearDoc.orden
          ? {
              ...m,
              cotejado: true,
              documento: documentoCompleto,
              tipoDoc: tipoDocSeleccionado,
              nombreTipoDoc: tipoInfo?.nombre || '',
              entidad: entidadNombre,
            }
          : m
      ));
      message.success(`Documento ${documentoCompleto} creado y conciliado`);
      setModalCrearDoc(null);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al crear documento bancario');
      message.error(msg);
    } finally {
      setCreandoDoc(false);
    }
  };

  // Marca una transacción en tránsito como conciliada: la agrega a movimientos como cotejada.
  const handleMarcarConciliado = (t: TransaccionConciliadaDTO) => {
    const documento = `${t.tipoDoc}-${t.numDoc}`;
    setMovimientos((prev) => {
      if (prev.some((m) => m.documento === documento)) return prev; // evitar duplicados
      const nuevo: MovimientoBancarioDTO = {
        orden: prev.length > 0 ? Math.max(...prev.map((m) => m.orden)) + 1 : 1,
        ctaBanc: '',
        fecha: t.fecha,
        numRef: '',
        monto: t.monto,
        debCred: t.debCred,
        concepto: '',
        cotejado: true,
        referencia: '',
        documento,
        tipoDoc: t.tipoDoc,
        nombreTipoDoc: t.nombreTipoDoc || '',
        entidad: t.entidad,
        esManual: true,
        transacIdConciliado: t.transacId,
        tipoDocConciliado: t.tipoDoc,
        numDocConciliado: t.numDoc,
      };
      return [...prev, nuevo];
    });
  };

  // ===== Derivaciones para tabs (conciliadas / resumen / tránsito) =====
  // Deriva el tipo de documento del movimiento; si viene vacío, lo extrae del documento "FAC-0100009581".
  const derivarTipoDoc = (m: MovimientoBancarioDTO): string => {
    if (m.tipoDoc) return m.tipoDoc;
    const doc = m.documento || '';
    const idx = doc.indexOf('-');
    return idx > 0 ? doc.slice(0, idx) : '';
  };

  // Cuenta de la conciliación o, en su defecto, la cuenta del TXT normalizada.
  const cuentaTransito = data?.numeroCta || (movimientos[0]?.ctaBanc ? normalizarCeros(movimientos[0].ctaBanc) : '');

  // Saldos y fecha de la conciliación (usados por el tránsito y los totales).
  const balBancos = Form.useWatch('balBancos', form) || 0;
  const balLibros = Form.useWatch('balLibros', form) || 0;
  const fechaConciliacion = Form.useWatch('fecha', form);
  const numeroCtaForm = Form.useWatch('numeroCta', form);
  const diferencia = Number(balBancos) - Number(balLibros);

  // Auto-popular balLibros en modo crear: cuando se selecciona cuenta bancaria y fecha,
  // obtener el saldo según libros (DTRANS_CONT) hasta la fecha seleccionada.
  const [cargandoSaldoLibros, setCargandoSaldoLibros] = useState(false);
// Auto-calcular fechaAnt al seleccionar cuenta bancaria en modo crear.
const [cargandoFechaAnt, setCargandoFechaAnt] = useState(false);
  useEffect(() => {
    if (mode !== 'crear') return;
    if (!numeroCtaForm || !fechaConciliacion) return;

    // Auto-calcular fechaAnt: un mes antes de la fecha de conciliación.
    const fechaAntCalculada = fechaConciliacion.add(-1, 'month');
    form.setFieldsValue({ fechaAnt: fechaAntCalculada });

    const fechaStr = fechaConciliacion.format('YYYY-MM-DD');
    setCargandoSaldoLibros(true);
    conciliacionBancariaApi.obtenerSaldoLibros(sucursalActiva, numeroCtaForm, fechaStr)
      .then((saldo) => {
        form.setFieldsValue({ balLibros: saldo });
      })
      .catch(() => {
        // Si falla, no interrumpir el flujo: el usuario puede ingresar manualmente.
      })
      .finally(() => {
        setCargandoSaldoLibros(false);
        setCargandoFechaAnt(false);
      });
  }, [numeroCtaForm, fechaConciliacion, mode, sucursalActiva, form]);

  // Cargar transacciones sin conciliar al cambiar cuenta o fecha en modo crear.
  useEffect(() => {
    if (mode !== 'crear') return;
    if (!numeroCtaForm || !fechaConciliacion) return;

    const fechaStr = fechaConciliacion.format('YYYY-MM-DD');
    setCargandoTransito(true);
    conciliacionBancariaApi.obtenerTransaccionesSinConciliarSimple(sucursalActiva, numeroCtaForm, fechaStr)
      .then(setTransaccionesSinConciliar)
      .catch(() => message.error('Error al cargar transacciones en tránsito'))
      .finally(() => setCargandoTransito(false));
  }, [mode, numeroCtaForm, fechaConciliacion, sucursalActiva]);

  // Cargar movimientos de DARCHCON bajo demanda (modo editar): se invoca al abrir las tabs de
  // movimientos o antes de guardar, para no traer todo el detalle al montar el formulario.
  const cargarMovimientos = useCallback(async () => {
    if (mode !== 'editar' || !id) return;
    try {
      const res = await conciliacionBancariaApi.obtenerMovimientos(sucursalActiva, parseInt(id));
      setMovimientos(res);
      setMovimientosCargados(true);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al cargar los movimientos');
      message.error(msg);
      // Re-lanzar para que handleGuardar/handleGuardarYAplicar aborten el guardado si la carga falla.
      throw err;
    }
  }, [mode, id, sucursalActiva]);

  // Función unificada para cargar todos los datos de la conciliación en modo edición:
  // transacciones conciliadas, transacciones sin conciliar/en tránsito, y resumen general.
  const cargarTodo = useCallback(async () => {
    if (!id || !cuentaTransito) return;
    setCargandoTransito(true);
    setTransitoCargado(false);
    setTransaccionesCargadas(false);
    setEnTransitoCargado(false);
    try {
      const fechaStr = fechaConciliacion.format('YYYY-MM-DD');
      const [conc, sinConciliar, enTransito] = await Promise.all([
        conciliacionBancariaApi.obtenerTransaccionesConciliadas(sucursalActiva, parseInt(id)),
        conciliacionBancariaApi.obtenerTransaccionesSinConciliarSimple(sucursalActiva, cuentaTransito, fechaStr),
        conciliacionBancariaApi.obtenerEnTransito(sucursalActiva, parseInt(id))
      ]);
      // Eliminar duplicados por transacId
      const combined = [...sinConciliar, ...enTransito];
      const trans = combined.filter((item, index, self) => 
        index === self.findIndex(t => t.transacId === item.transacId)
      );
      setTransaccionesDetalle(conc);
      setTransaccionesCargadas(true);
      setEnTransito(trans);
      setEnTransitoCargado(true);
      setTransaccionesSinConciliar(trans);
      setTransitoCargado(true);
      // Cargar resumen general después de cargar los datos de tránsito
      await cargarResumenGeneral();
    } catch {
      message.warning('No se pudieron cargar los datos de la conciliación');
    } finally {
      setCargandoTransito(false);
    }
  }, [id, sucursalActiva, cuentaTransito, fechaConciliacion]);

  // Cargar resumen general de la conciliación (solo modo editar: la conciliación ya está guardada
  // con fecha/fechaAnt y el backend puede calcular el resumen).
  const cargarResumenGeneral = useCallback(() => {
    if (!id) return Promise.resolve();
    return conciliacionBancariaApi.obtenerResumenGeneral(sucursalActiva, parseInt(id))
      .then(setResumenGeneral)
      .catch(() => message.error('Error al cargar el resumen general'));
  }, [id, sucursalActiva]);

  // Cargar todos los datos de la conciliación al abrir en modo edición.
  // Unifica la carga de transacciones conciliadas, en tránsito y resumen general.
  useEffect(() => {
    if (mode !== 'editar') return;
    if (!data) return;
    if (transitoCargado && transaccionesCargadas) return;
    cargarTodo();
  }, [mode, data, transitoCargado, transaccionesCargadas, cargarTodo]);

  // Cargar movimientos de DARCHCON automáticamente en modo editar: sin esto, las tabs de
  // movimientos no se renderizan (dependen de movimientos.length > 0) y nunca se dispara
  // la carga bajo demanda del onChange del Tabs.
  useEffect(() => {
    if (mode !== 'editar') return;
    if (!data) return;
    if (movimientosCargados) return;
    cargarMovimientos()
      .then(() => {
        if (id) {
          conciliacionBancariaApi.obtenerHashImportacion(sucursalActiva, parseInt(id))
            .then((hash) => setHashArchivoImportado(hash || ''))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [mode, data, movimientosCargados, cargarMovimientos, id, sucursalActiva]);

  // Cargar el resumen general automáticamente en modo editar: la pestaña 'resumenGeneral' es la
  // activa por defecto y el onChange del Tabs solo se dispara al CAMBIAR de pestaña, así que sin
  // este efecto la pestaña quedaría vacía al abrir la edición.
  useEffect(() => {
    if (mode !== 'editar') return;
    if (!data) return;
    cargarResumenGeneral();
  }, [mode, data, cargarResumenGeneral]);

  // Recargar balLibros al entrar en modo editar con datos disponibles.
  useEffect(() => {
    if (mode !== 'editar') return;
    if (!data) return;
    if (balLibrosInicialCargado.current) return;
    if (!numeroCtaForm || !fechaConciliacion) return;
    balLibrosInicialCargado.current = true;
    setCargandoSaldoLibros(true);
    const fechaStr = fechaConciliacion.format('YYYY-MM-DD');
    conciliacionBancariaApi.obtenerSaldoLibros(sucursalActiva, numeroCtaForm, fechaStr)
      .then(saldo => form.setFieldsValue({ balLibros: saldo }))
      .catch(() => {/* mantener valor actual */})
      .finally(() => setCargandoSaldoLibros(false));
  }, [mode, data, sucursalActiva, numeroCtaForm, fechaConciliacion, form]);

  // Recargar documentos al cambiar la fecha en modo edición (después de la carga inicial).
  // La primera vez que fechaConciliacion pasa de undefined a un valor es por el form.setFieldsValue
  // del useEffect de carga inicial, no por edición del usuario. El ref evita la recarga en ese caso.
  useEffect(() => {
    if (mode !== 'editar') return;
    if (!data) return;
    if (!fechaInicialCargada.current) {
      fechaInicialCargada.current = true;
      return;
    }
    // La fecha cambió por edición del usuario → recargar todo con loading unificado.
    let cancelado = false;
    const recargar = async () => {
      setRecargandoFecha(true);
      setTransitoCargado(false);
      setTransaccionesCargadas(false);
      setEnTransitoCargado(false);
      try {
        // Recalcular balLibros con la nueva fecha (sin tocar fechaAnt).
        if (numeroCtaForm && fechaConciliacion) {
          const fechaStr = fechaConciliacion.format('YYYY-MM-DD');
          setCargandoSaldoLibros(true);
          try {
            const saldo = await conciliacionBancariaApi.obtenerSaldoLibros(sucursalActiva, numeroCtaForm, fechaStr);
            if (!cancelado) form.setFieldsValue({ balLibros: saldo });
          } catch {
            // Si falla, no interrumpir el flujo: el usuario puede ingresar manualmente.
          } finally {
            if (!cancelado) setCargandoSaldoLibros(false);
          }
        }
        // Recargar todos los datos de la conciliación con la nueva fecha.
        await cargarTodo();
      } finally {
        if (!cancelado) setRecargandoFecha(false);
      }
    };
    recargar();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaConciliacion]);

  // Claves de los documentos cotejados para excluir del tránsito.
  // Se usa el documento completo, no solo la referencia, para no ocultar otros documentos
  // distintos que compartan el mismo NUM_DOC.
  const clavesCotejados = useMemo(() => {
    const set = new Set<string>();
    movimientos.filter((m) => m.cotejado && m.documento).forEach((m) => {
      set.add(normalizarDocCompleto(m.documento!));
    });
    return set;
  }, [movimientos]);

  // Transacciones en tránsito (DOCTRANS) que NO matchearon con los movimientos cotejados.
  const transaccionesEnTransito = useMemo(() => {
    return transaccionesSinConciliar.filter((t) => {
      if (!t.tipoDoc || !t.numDoc) return true;
      return !clavesCotejados.has(normalizarDocCompleto(`${t.tipoDoc}-${t.numDoc}`));
    });
  }, [transaccionesSinConciliar, clavesCotejados]);

  // Índice de transacciones en tránsito por monto: se conserva para la selección manual.
  const candidatosPorMonto = useMemo(() => {
    const map = new Map<number, TransaccionConciliadaDTO[]>();
    transaccionesEnTransito.forEach((t) => {
      const arr = map.get(t.monto) || [];
      arr.push(t);
      map.set(t.monto, arr);
    });
    return map;
  }, [transaccionesEnTransito]);

  // Índice de candidatos exactos (fecha calendario + monto + referencia) para la conciliación automática.
  const candidatosPorClave = useMemo(() => {
    const map = new Map<string, TransaccionConciliadaDTO[]>();
    transaccionesEnTransito.forEach((t) => {
      const clave = obtenerClaveMatching(t.numDoc, t.fecha, t.monto);
      if (!clave) return;
      const arr = map.get(clave) || [];
      arr.push(t);
      map.set(clave, arr);
    });
    return map;
  }, [transaccionesEnTransito]);

  // Movimientos sin conciliar con EXACTAMENTE 1 documento candidato exacto.
  const movimientosUnSoloCandidato = useMemo(() => {
    return movimientos.filter((m) => {
      if (m.cotejado) return false;
      const candidatos = candidatosPorClave.get(obtenerClaveMatching(m.numRef, m.fecha, m.monto)) || [];
      return candidatos.length === 1;
    });
  }, [movimientos, candidatosPorClave]);

  // Verifica si TODOS los movimientos seleccionados tienen exactamente 1 candidato por MONTO exacto
  // Y que los candidatos no se repitan entre los movimientos seleccionados.
  const puedeAutoConciliar = useMemo(() => {
    if (seleccionAuto.length === 0) return false;
    
    // Verificar que cada movimiento tenga exactamente 1 candidato
    const allHaveOne = seleccionAuto.every((orden) => {
      const mov = movimientos.find((m) => m.orden === orden);
      if (!mov) return false;
      const candidatos = candidatosPorMonto.get(mov.monto) || [];
      return candidatos.length === 1;
    });
    if (!allHaveOne) return false;
    
    // Verificar que los candidatos no se repitan entre los movimientos seleccionados
    // (cada documento en tránsito solo puede ser usado una vez)
    const candidatosSeleccionados = seleccionAuto.map((orden) => {
      const mov = movimientos.find((m) => m.orden === orden);
      if (!mov) return null;
      const candidatos = candidatosPorMonto.get(mov.monto) || [];
      return candidatos[0] ? `${candidatos[0].tipoDoc}-${candidatos[0].numDoc}` : null;
    }).filter(Boolean);
    
    const uniqueCandidatos = new Set(candidatosSeleccionados);
    return uniqueCandidatos.size === candidatosSeleccionados.length;
  }, [seleccionAuto, movimientos, candidatosPorMonto]);

  // Candidatos visibles en el modal abierto (mismo monto; selección manual).
  const candidatosModal = useMemo(() => {
    if (!movimientoModal) return [];
    return candidatosPorMonto.get(movimientoModal.monto) || [];
  }, [movimientoModal, candidatosPorMonto]);

  // Resumen del Libro del Mayor "en vivo": agrupa por tipo de documento los movimientos
  // cotejados del estado (se actualiza mientras se concilia, sin guardar). El signo sigue el
  // criterio del backend (débito negativo, crédito positivo).
  const resumenLibrosEnVivo = useMemo<ResumenTipoDocumentoDTO[]>(() => {
    const map = new Map<string, ResumenTipoDocumentoDTO>();
    movimientos.filter((m) => m.cotejado).forEach((m) => {
      const tipoDoc = derivarTipoDoc(m);
      if (!tipoDoc) return;
      const montoConSigno = (m.debCred || 'D') === 'D'
        ? -(Number(m.monto) || 0)
        : (Number(m.monto) || 0);
      const existing = map.get(tipoDoc);
      if (existing) {
        existing.cantidad += 1;
        existing.montoTotal += montoConSigno;
      } else {
        map.set(tipoDoc, {
          tipoDoc,
          nombreTipoDoc: m.nombreTipoDoc || '',
          cantidad: 1,
          montoTotal: montoConSigno,
        });
      }
    });
    return Array.from(map.values());
  }, [movimientos]);

  // Resumen de transacciones en tránsito agrupadas por tipo de documento.
  // El signo sigue el criterio del backend (débito negativo, crédito positivo).
  const resumenTransito = useMemo<ResumenTipoDocumentoDTO[]>(() => {
    const map = new Map<string, ResumenTipoDocumentoDTO>();
    transaccionesEnTransito.forEach((t) => {
      if (!t.tipoDoc) return;
      const montoConSigno = t.debCred === 'D'
        ? -(Number(t.monto) || 0)
        : (Number(t.monto) || 0);
      const existing = map.get(t.tipoDoc);
      if (existing) {
        existing.cantidad += 1;
        existing.montoTotal += montoConSigno;
      } else {
        map.set(t.tipoDoc, {
          tipoDoc: t.tipoDoc,
          nombreTipoDoc: t.nombreTipoDoc || '',
          cantidad: 1,
          montoTotal: montoConSigno,
        });
      }
    });
    return Array.from(map.values());
  }, [transaccionesEnTransito]);

  // Resumen general "en vivo" para la pestaña Resumen General: combina los valores fijos
  // del backend (balanceInicialLibros, balanceBancos) con los datos en memoria del formulario
  // (movimientos cotejados y tránsito), de modo que los cards se actualicen en tiempo real
  // mientras el usuario concilia, sin necesidad de guardar.
  // El tránsito se suma con signo (débito negativo, crédito positivo) igual que el backend
  // (ObtenerResumenGeneral: d.DebCred == "D" ? -d.Monto : d.Monto).
  const resumenGeneralEnVivo = useMemo<ResumenGeneralConciliacionDTO | null>(() => {
    if (!resumenGeneral) return null;

    // Resumen de tránsito en vivo con signo por debCred (D negativo, C positivo).
    const resumenTransitoEnVivo: ResumenTipoDocumentoDTO[] = (() => {
      const map = new Map<string, ResumenTipoDocumentoDTO>();
      transaccionesEnTransito.forEach((t) => {
        if (!t.tipoDoc) return;
        const montoConSigno = t.debCred === 'D' ? -t.monto : t.monto;
        const existing = map.get(t.tipoDoc);
        if (existing) {
          existing.cantidad += 1;
          existing.montoTotal += montoConSigno;
        } else {
          map.set(t.tipoDoc, {
            tipoDoc: t.tipoDoc,
            nombreTipoDoc: t.nombreTipoDoc || '',
            cantidad: 1,
            montoTotal: montoConSigno,
          });
        }
      });
      return Array.from(map.values());
    })();

    const balanceConciliadoLibros = resumenGeneral.balanceInicialLibros + resumenLibrosEnVivo.reduce((s, r) => s + r.montoTotal, 0);
    const balanceConciliadoBanco = balBancosResumen + resumenTransitoEnVivo.reduce((s, r) => s + r.montoTotal, 0);

    return {
      balanceInicialLibros: resumenGeneral.balanceInicialLibros,
      resumenLibros: resumenLibrosEnVivo,
      balanceConciliadoLibros,
      balanceBancos: balBancosResumen,
      resumenTransito: resumenTransitoEnVivo,
      balanceConciliadoBanco,
      diferencia: balanceConciliadoBanco - balanceConciliadoLibros,
    };
  }, [resumenGeneral, resumenLibrosEnVivo, transaccionesEnTransito, balBancosResumen]);

  // ===== Datos filtrados por tab (búsqueda + filtros tipo Excel) =====
  const datosConciliadas = useMemo(() => {
    let result = movimientos.filter((m) => m.cotejado);
    if (searchConcil) {
      const q = searchConcil.toLowerCase();
      result = result.filter((m) =>
        (m.concepto && m.concepto.toLowerCase().includes(q)) ||
        (m.numRef && m.numRef.toLowerCase().includes(q)) ||
        (m.documento && m.documento.toLowerCase().includes(q))
      );
    }
    Object.entries(filtrosConciliadas).forEach(([key, filtro]) => {
      if (!filtro?.valor?.length) return;
      result = result.filter((m) => {
        if (key === 'fecha') return filtro.valor.includes(formatDate(m.fecha));
        if (key === 'numRef') return filtro.valor.includes(m.numRef || '');
        if (key === 'documento') return filtro.valor.includes(m.documento || '');
        if (key === 'concepto') return filtro.valor.includes(m.concepto || '');
        if (key === 'monto') return filtro.valor.includes(formatCurrency(m.monto));
        return true;
      });
    });
    return result;
  }, [movimientos, searchConcil, filtrosConciliadas, formatCurrency]);

  const datosSinConciliar = useMemo(() => {
    let result = movimientos.filter((m) => !m.cotejado);
    if (searchSinConcil) {
      const q = searchSinConcil.toLowerCase();
      result = result.filter((m) =>
        (m.concepto && m.concepto.toLowerCase().includes(q)) ||
        (m.numRef && m.numRef.toLowerCase().includes(q)) ||
        (m.documento && m.documento.toLowerCase().includes(q)) ||
        (m.entidad && m.entidad.toLowerCase().includes(q))
      );
    }
    Object.entries(filtrosSinConciliar).forEach(([key, filtro]) => {
      if (!filtro?.valor?.length) return;
      result = result.filter((m) => {
        if (key === 'fecha') return filtro.valor.includes(formatDate(m.fecha));
        if (key === 'numRef') return filtro.valor.includes(m.numRef || '');
        if (key === 'documento') return filtro.valor.includes(m.documento || '');
        if (key === 'concepto') return filtro.valor.includes(m.concepto || '');
        if (key === 'entidad') return filtro.valor.includes(m.entidad || '');
        if (key === 'monto') return filtro.valor.includes(formatCurrency(m.monto));
        return true;
      });
    });
    return result;
  }, [movimientos, searchSinConcil, filtrosSinConciliar, formatCurrency]);

  const datosResumen = useMemo(() => {
    let result = resumenLibrosEnVivo;
    if (searchResumen) {
      const q = searchResumen.toLowerCase();
      result = result.filter((r) =>
        (r.nombreTipoDoc && r.nombreTipoDoc.toLowerCase().includes(q)) ||
        (r.tipoDoc && r.tipoDoc.toLowerCase().includes(q))
      );
    }
    Object.entries(filtrosResumen).forEach(([key, filtro]) => {
      if (!filtro?.valor?.length) return;
      if (key === 'tipo') {
        result = result.filter((r) => filtro.valor.includes(r.nombreTipoDoc || r.tipoDoc));
      }
    });
    return result;
  }, [resumenLibrosEnVivo, searchResumen, filtrosResumen]);

  const datosTransito = useMemo(() => {
    let result = transaccionesEnTransito;
    if (searchTransito) {
      const q = searchTransito.toLowerCase();
      result = result.filter((t) =>
        (t.tipoDoc && t.tipoDoc.toLowerCase().includes(q)) ||
        (t.numDoc && t.numDoc.toLowerCase().includes(q)) ||
        (t.entidad && t.entidad.toLowerCase().includes(q))
      );
    }
    Object.entries(filtrosTransito).forEach(([key, filtro]) => {
      if (!filtro?.valor?.length) return;
      result = result.filter((t) => {
        if (key === 'fecha') return filtro.valor.includes(formatDate(t.fecha));
        if (key === 'documento') return filtro.valor.includes(`${t.tipoDoc}-${t.numDoc}`);
        if (key === 'entidad') return filtro.valor.includes(t.entidad || '');
        if (key === 'debCred') return filtro.valor.includes(t.debCred === 'D' ? 'Débito' : 'Crédito');
        return true;
      });
    });
    return result;
  }, [transaccionesEnTransito, searchTransito, filtrosTransito]);

  const datosResumenTransito = useMemo(() => {
    let result = resumenTransito;
    if (searchResumenTransito) {
      const q = searchResumenTransito.toLowerCase();
      result = result.filter((r) =>
        (r.nombreTipoDoc && r.nombreTipoDoc.toLowerCase().includes(q)) ||
        (r.tipoDoc && r.tipoDoc.toLowerCase().includes(q))
      );
    }
    Object.entries(filtrosResumenTransito).forEach(([key, filtro]) => {
      if (!filtro?.valor?.length) return;
      if (key === 'tipo') {
        result = result.filter((r) => filtro.valor.includes(r.nombreTipoDoc || r.tipoDoc));
      }
    });
    return result;
  }, [resumenTransito, searchResumenTransito, filtrosResumenTransito]);

  // ===== Totales (filas de resumen al pie de las tablas) =====
  const totalMovimientos = (rows: MovimientoBancarioDTO[]) => {
    let debitos = 0;
    let creditos = 0;
    for (const r of rows) {
      const m = Number(r.monto) || 0;
      if ((r.debCred || 'D') === 'D') debitos += m;
      else creditos += m;
    }
    return { debitos, creditos, monto: creditos - debitos };
  };

  const resumenMovimientosSummary = (rows: MovimientoBancarioDTO[], conSeleccion = false) => {
    const t = totalMovimientos(rows);
    const ini = conSeleccion ? 1 : 0;
    return (
      <Table.Summary.Row>
        {conSeleccion && <Table.Summary.Cell index={0} />}
        <Table.Summary.Cell index={ini} colSpan={4}>
          <Text strong>Totales</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={ini + 4}>
          <Space size={12}>
            <Text>Débitos <Text strong>{formatCurrency(t.debitos)}</Text></Text>
            <Text>Créditos <Text strong>{formatCurrency(t.creditos)}</Text></Text>
          </Space>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={ini + 5} align="right">
          <Text strong style={{ color: 'var(--paces-primary)' }}>{formatCurrency(t.monto)}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={ini + 6} />
      </Table.Summary.Row>
    );
  };

  const transitoSummary = (rows: TransaccionConciliadaDTO[]) => {
    let debitos = 0;
    let creditos = 0;
    for (const r of rows) {
      const m = Number(r.monto) || 0;
      if ((r.debCred || 'D') === 'D') debitos += m;
      else creditos += m;
    }
    const monto = creditos - debitos;
    return (
      <Table.Summary.Row>
        <Table.Summary.Cell index={0} colSpan={5}>
          <Text strong>Totales</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={5} align="right">
          <Text strong style={{ color: 'var(--paces-primary)' }}>{formatCurrency(monto)}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={6} />
      </Table.Summary.Row>
    );
  };

  const resumenTipoDocSummary = (rows: ResumenTipoDocumentoDTO[]) => {
    const cantidad = rows.reduce((s, r) => s + (Number(r.cantidad) || 0), 0);
    const monto = rows.reduce((s, r) => s + (Number(r.montoTotal) || 0), 0);
    return (
      <Table.Summary.Row>
        <Table.Summary.Cell index={0}>
          <Text strong>Totales</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={1} align="right">
          <Text>{formatNumber(cantidad)}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={2} align="right">
          <Text strong style={{ color: 'var(--paces-primary)' }}>{formatCurrency(monto)}</Text>
        </Table.Summary.Cell>
      </Table.Summary.Row>
    );
  };

  // ===== Columnas =====
  const construirColumnasMovimiento = (
    filtrosActivos: Record<string, { valor: string[] }>,
    setFiltrosActivos: React.Dispatch<React.SetStateAction<Record<string, { valor: string[] }>>>
  ) => [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (f: string) => formatDate(f),
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={movimientos}
          dataIndex="fecha"
          render={(r: MovimientoBancarioDTO) => formatDate(r.fecha)}
          placeholder="Buscar fecha..."
          filtroKey="fecha"
          filtrosActivos={filtrosActivos}
          setFiltrosActivos={setFiltrosActivos}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => filtrosActivos.fecha
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
    },
    {
      title: 'Referencia',
      dataIndex: 'numRef',
      key: 'numRef',
      width: 120,
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={movimientos}
          dataIndex="numRef"
          placeholder="Buscar referencia..."
          filtroKey="numRef"
          filtrosActivos={filtrosActivos}
          setFiltrosActivos={setFiltrosActivos}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => filtrosActivos.numRef
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      key: 'concepto',
      ellipsis: true,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'D/C',
      dataIndex: 'debCred',
      key: 'debCred',
      width: 80,
      render: (val: string) => (
        <Space size={4}>
          {val === 'C'
            ? <ArrowUpOutlined style={{ color: '#52c41a' }} />
            : <ArrowDownOutlined style={{ color: '#ff4d4f' }} />}
          <Text>{val === 'C' ? 'Crédito' : 'Débito'}</Text>
        </Space>
      ),
    },
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 160,
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={movimientos}
          dataIndex="documento"
          placeholder="Buscar documento..."
          filtroKey="documento"
          filtrosActivos={filtrosActivos}
          setFiltrosActivos={setFiltrosActivos}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => filtrosActivos.documento
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
      render: (val: string, record: MovimientoBancarioDTO) => {
        // Movimientos cotejados: documento + check verde.
        if (record.cotejado) {
          return (
            <Space size={6}>
              <Text>{val || '-'}</Text>
              <CheckCircleFilled style={{ color: '#52c41a', fontSize: 14 }} />
            </Space>
          );
        }
        // Sin conciliar: si hay transacciones en tránsito con el mismo monto, enlace al modal.
        const candidatos = candidatosPorMonto.get(record.monto) || [];
        if (candidatos.length > 0) {
          return (
            <Button
              type="link"
              style={{ padding: 0, height: 'auto', color: '#556ee6' }}
              onClick={() => setMovimientoModal(record)}
            >
              {candidatos.length} documentos con el mismo monto
            </Button>
          );
        }
        return <Text>-</Text>;
      },
    },
    {
      title: 'Monto',
      dataIndex: 'monto',
      key: 'monto',
      width: 200,
      align: 'right' as const,
      render: (val: number, record: MovimientoBancarioDTO) => {
        const monto = Number(val) || 0;
        const signo = (record.debCred === 'C' ? 1 : -1);
        return <Text strong>{formatCurrency(signo * monto)}</Text>;
      },
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={movimientos}
          dataIndex="monto"
          render={(r: MovimientoBancarioDTO) => formatCurrency(r.monto)}
          placeholder="Monto..."
          filtroKey="monto"
          filtrosActivos={filtrosActivos}
          setFiltrosActivos={setFiltrosActivos}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => filtrosActivos.monto
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
    },
    {
      title: 'Acción',
      key: 'accion',
      width: 90,
      render: (_: any, record: MovimientoBancarioDTO) => (
        <Space size={0}>
          {!record.cotejado && (
            <Button
              type="text"
              size="small"
              title="Crear documento bancario"
              icon={<FileTextOutlined />}
              onClick={() => handleAbrirModalCrearDoc(record)}
            />
          )}
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleEliminarMovimiento(record.orden)}
          />
        </Space>
      ),
    },
  ];

  const columnasMovimientoConciliadas = construirColumnasMovimiento(filtrosConciliadas, setFiltrosConciliadas);
  const columnasMovimientoSinConciliar = construirColumnasMovimiento(filtrosSinConciliar, setFiltrosSinConciliar);

  // Constructor de columnas del resumen por tipo de documento con filtro tipo Excel.
  const construirColumnasResumen = (
    filtrosActivos: Record<string, { valor: string[] }>,
    setFiltrosActivos: React.Dispatch<React.SetStateAction<Record<string, { valor: string[] }>>>,
    dataSource: ResumenTipoDocumentoDTO[]
  ) => [
    {
      title: 'Tipo / Nombre',
      key: 'tipo',
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={dataSource}
          dataIndex="nombreTipoDoc"
          render={(r: ResumenTipoDocumentoDTO) => r.nombreTipoDoc || r.tipoDoc}
          placeholder="Buscar tipo..."
          filtroKey="tipo"
          filtrosActivos={filtrosActivos}
          setFiltrosActivos={setFiltrosActivos}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => filtrosActivos.tipo
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
      render: (_: unknown, r: ResumenTipoDocumentoDTO) => (
        <Text>{r.nombreTipoDoc || r.tipoDoc}</Text>
      ),
    },
    {
      title: 'Cantidad de documentos',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 180,
      align: 'right' as const,
      render: (val: number) => <Text>{formatNumber(val)}</Text>,
    },
    {
      title: 'Monto total',
      dataIndex: 'montoTotal',
      key: 'montoTotal',
      width: 150,
      align: 'right' as const,
      render: (val: number) => <Text strong>{formatCurrency(val)}</Text>,
    },
  ];

  const columnasResumenConciliados = construirColumnasResumen(filtrosResumen, setFiltrosResumen, resumenLibrosEnVivo);
  const columnasResumenTransitoTab = construirColumnasResumen(filtrosResumenTransito, setFiltrosResumenTransito, resumenTransito);

  // Columnas de transacciones en tránsito (con filtros tipo Excel)
  const transitoColumns = [
    {
      title: '',
      key: 'conciliar',
      width: 50,
      render: (_: unknown, record: TransaccionConciliadaDTO) => (
        <Checkbox onChange={(e) => { if (e.target.checked) handleMarcarConciliado(record); }} />
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (f: string) => formatDate(f),
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={transaccionesEnTransito}
          dataIndex="fecha"
          render={(r: TransaccionConciliadaDTO) => formatDate(r.fecha)}
          placeholder="Buscar fecha..."
          filtroKey="fecha"
          filtrosActivos={filtrosTransito}
          setFiltrosActivos={setFiltrosTransito}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => filtrosTransito.fecha
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
    },
    {
      title: 'Documento',
      key: 'documento',
      width: 160,
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={transaccionesEnTransito}
          dataIndex="numDoc"
          render={(r: TransaccionConciliadaDTO) => `${r.tipoDoc}-${r.numDoc}`}
          placeholder="Buscar documento..."
          filtroKey="documento"
          filtrosActivos={filtrosTransito}
          setFiltrosActivos={setFiltrosTransito}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => filtrosTransito.documento
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
      render: (_: unknown, record: TransaccionConciliadaDTO) => (
        <Text>{record.tipoDoc}-{record.numDoc}</Text>
      ),
    },
    {
      title: 'Referencia',
      dataIndex: 'referencia',
      key: 'referencia',
      width: 140,
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={transaccionesEnTransito}
          dataIndex="referencia"
          placeholder="Buscar referencia..."
          filtroKey="referencia"
          filtrosActivos={filtrosTransito}
          setFiltrosActivos={setFiltrosTransito}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => filtrosTransito.referencia
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Entidad',
      dataIndex: 'entidad',
      key: 'entidad',
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={transaccionesEnTransito}
          dataIndex="entidad"
          placeholder="Buscar entidad..."
          filtroKey="entidad"
          filtrosActivos={filtrosTransito}
          setFiltrosActivos={setFiltrosTransito}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => filtrosTransito.entidad
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Monto',
      dataIndex: 'monto',
      key: 'monto',
      width: 130,
      align: 'right' as const,
      render: (val: number) => <Text strong>{formatCurrency(val)}</Text>,
    },
    {
      title: 'D/C',
      dataIndex: 'debCred',
      key: 'debCred',
      width: 80,
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={transaccionesEnTransito}
          dataIndex="debCred"
          render={(r: TransaccionConciliadaDTO) => (r.debCred === 'D' ? 'Débito' : 'Crédito')}
          placeholder="Buscar..."
          filtroKey="debCred"
          filtrosActivos={filtrosTransito}
          setFiltrosActivos={setFiltrosTransito}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => filtrosTransito.debCred
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
      render: (val: string) => (val === 'D' ? 'Débito' : 'Crédito'),
    },
  ];

  // Columnas del modal de candidatos con el mismo monto (específico de esta pantalla)
  const candidatosColumns = [
    {
      title: 'Documento',
      key: 'documento',
      render: (_: unknown, r: TransaccionConciliadaDTO) => (
        <Text>{r.tipoDoc}-{r.numDoc}</Text>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (f: string) => formatDate(f),
    },
    {
      title: 'Beneficiario',
      dataIndex: 'entidad',
      key: 'entidad',
      render: (val: string, r: TransaccionConciliadaDTO) => (
        <div>
          <Text>{val || '-'}</Text>
          {r.nota ? (
            <div className="paces-text-secondary" style={{ fontSize: 12, marginTop: 2 }}>{r.nota}</div>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Monto',
      dataIndex: 'monto',
      key: 'monto',
      width: 130,
      align: 'right' as const,
      render: (val: number) => <Text strong>{formatCurrency(val)}</Text>,
    },
    {
      title: '',
      key: 'accion',
      width: 100,
      render: (_: unknown, r: TransaccionConciliadaDTO) => (
        <Button type="primary" size="small" onClick={() => handleConciliar(r)}>
          Conciliar
        </Button>
      ),
    },
  ];

  // ===== Loading =====
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando conciliación...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Alert de error */}
      {loadingError && (
        <Alert
          message="Error al cargar formulario"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={() => window.location.reload()}>Reintentar</Button>}
        />
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <div style={{ flex: 1 }} />
        <Space wrap>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={cargarTodo}
            loading={cargandoTransito}
          >
            Actualizar
          </Button>
          <Upload
            accept=".csv,.txt"
            showUploadList={false}
            beforeUpload={(file) => {
              handleImportarArchivo(file);
              return false;
            }}
            disabled={importando}
          >
            <Button icon={<UploadOutlined />} loading={importando}>
              {archivoImportado ? 'Reemplazar archivo...' : 'Importar'}
            </Button>
          </Upload>
          {archivoImportado && (
            <Text className="paces-text-secondary">{archivoImportado.name}</Text>
          )}
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleGuardar}>
            Guardar
          </Button>
          {mode === 'crear' && (
            <Button icon={<SaveOutlined />} loading={saving} onClick={handleGuardarYAplicar}>
              Guardar y Aplicar
            </Button>
          )}
          <Button icon={<CloseOutlined />} onClick={handleCancelar}>
            Cancelar
          </Button>
        </Space>
      </div>

      {/* Formulario */}
      {isLarge ? (
        <Row gutter={16}>
          <Col xxl={18}>
            <Card className="paces-card" size="small" title="Datos Generales" style={{ marginBottom: 16 }}>
              <Form form={form} layout="vertical" size="small">
                <Row gutter={[16, 8]}>
                  {/* Primera columna */}
                  <Col xs={24} sm={12} lg={9}>
                    {/* Cuenta bancaria */}
                    <Form.Item
                      name="numeroCta"
                      label="Cuenta Bancaria"
                      rules={[{ required: true, message: 'Seleccione una cuenta bancaria' }]}
                    >
                      <Select
                        showSearch
                        placeholder="Seleccionar cuenta"
                        optionFilterProp="children"
                        disabled={mode === 'editar'}
                      >
                        {cuentasBancarias.map((cta) => (
                          <Select.Option key={cta.numeroCta} value={cta.numeroCta}>
                            {cta.numeroCta} - {cta.nombre}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={9}>
                    <Form.Item
                      name="fecha"
                      label="Fecha"
                      rules={[{ required: true, message: 'Seleccione la fecha' }]}
                    >
                      <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD"
                        disabledDate={(current) => {
                          if (!current) return false;
                          const cierre = fechasCierre?.[sucursalActiva];
                          if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day')) return true;
                          const cierreInv = fechasCierreInv?.[sucursalActiva];
                          if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day')) return true;
                          return false;
                        }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Form.Item name="fechaAnt" label="Fecha Período Anterior">
                      <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabled
                        disabledDate={(current) => {
                          if (!current) return false;
                          const cierre = fechasCierre?.[sucursalActiva];
                          if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day')) return true;
                          const cierreInv = fechasCierreInv?.[sucursalActiva];
                          if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day')) return true;
                          return false;
                        }} />
                    </Form.Item>
                  </Col>

                  {/* Segunda fila */}
                  <Col xs={24} sm={12} lg={12}>
                    <Form.Item
                      name="balBancos"
                      label="Balance según Banco"
                      rules={[{ required: true, message: 'Ingrese el balance' }]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        step={0.01}
                        precision={2}
                        onBlur={() => {
                          const val = form.getFieldValue('balBancos');
                          setBalBancosResumen(Number(val) || 0);
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={12}>
                    <Form.Item
                      name="balLibros"
                      label="Balance según Libros"
                      rules={[{ required: true, message: 'Ingrese el balance' }]}
                    >
                      <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} disabled={mode === 'editar' || cargandoSaldoLibros} />
                    </Form.Item>
                  </Col>
                  {/* Nota */}
                  <Col xs={24}>
                    <Form.Item name="notas" label="Notas">
                      <TextArea rows={1} />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Card>
          </Col>

          <Col xxl={6}>
            {/* Sidebar: Totales */}
            <Card className="paces-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span className="paces-text-secondary">Balance Bancos</span>
                  <span>{formatCurrency(Number(balBancos))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span className="paces-text-secondary">Balance Libros</span>
                  <span>{formatCurrency(Number(balLibros))}</span>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 16, fontWeight: 700 }}>
                  <span>Diferencia</span>
                  <span style={{ color: diferencia !== 0 ? '#ff4d4f' : 'var(--paces-primary)' }}>
                    {formatCurrency(diferencia)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Resumen */}
            <Card className="paces-card" style={{ marginTop: 16 }} title={<span style={{ fontSize: 14, fontWeight: 600 }}>Movimientos</span>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">Total</span>
                  <span>{movimientos.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">Cotejados</span>
                  <span>{movimientos.filter((m) => m.cotejado).length}</span>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      ) : (
        /* Mobile */
        <div>
          <Card className="paces-card" size="small" title="Datos Generales" style={{ marginBottom: 16 }}>
            <Form form={form} layout="vertical" size="small">
              <Row gutter={[16, 8]}>
                <Col xs={24}>
                  <Form.Item
                    name="numeroCta"
                    label="Cuenta Bancaria"
                    rules={[{ required: true, message: 'Seleccione una cuenta bancaria' }]}
                  >
                    <Select
                      showSearch
                      placeholder="Seleccionar cuenta"
                      optionFilterProp="children"
                      disabled={mode === 'editar'}
                    >
                      {cuentasBancarias.map((cta) => (
                        <Select.Option key={cta.numeroCta} value={cta.numeroCta}>
                          {cta.numeroCta} - {cta.nombre}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="fecha"
                    label="Fecha"
                    rules={[{ required: true, message: 'Seleccione la fecha' }]}
                  >
                    <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD"
                      disabledDate={(current) => {
                        if (!current) return false;
                        const cierre = fechasCierre?.[sucursalActiva];
                        if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day')) return true;
                        const cierreInv = fechasCierreInv?.[sucursalActiva];
                        if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day')) return true;
                        return false;
                      }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="fechaAnt" label="Fecha Período Anterior">
                    <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabled
                      disabledDate={(current) => {
                        if (!current) return false;
                        const cierre = fechasCierre?.[sucursalActiva];
                        if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day')) return true;
                        const cierreInv = fechasCierreInv?.[sucursalActiva];
                        if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day')) return true;
                        return false;
                      }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="balBancos"
                    label="Balance según Banco"
                    rules={[{ required: true, message: 'Ingrese el balance' }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="balLibros"
                    label="Balance según Libros"
                    rules={[{ required: true, message: 'Ingrese el balance' }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} disabled={mode === 'editar' || cargandoSaldoLibros} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="notas" label="Notas">
                    <TextArea rows={1} />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>

          {/* Diferencia card */}
          <Card className="paces-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 16, fontWeight: 700 }}>
              <span>Diferencia</span>
              <span style={{ color: diferencia !== 0 ? '#ff4d4f' : 'var(--paces-primary)' }}>
                {formatCurrency(diferencia)}
              </span>
            </div>
          </Card>

        </div>
      )}

      {/* Tabs de movimientos importados (conciliadas / sin conciliar / resumen / tránsito) */}
      <Card className="paces-card" size="small" title={movimientos.length > 0 ? `Movimientos Importados (${movimientos.length})` : 'Documentos'} style={{ marginTop: 16 }}>
        <Spin spinning={recargandoFecha} tip="Recargando documentos...">
        {movimientos.length > 0 && (() => {
          const total = movimientos.length;
          const cotejados = movimientos.filter((m) => m.cotejado).length;
          const sinConciliar = total - cotejados;
          return sinConciliar === 0
            ? (
              <Alert
                type="success"
                showIcon
                message={`Todos los ${total} movimientos conciliados`}
                style={{ marginBottom: 12 }}
              />
            )
            : (
              <Alert
                type="warning"
                showIcon
                message={`${sinConciliar} de ${total} movimientos sin conciliar`}
                style={{ marginBottom: 12 }}
              />
            );
        })()}
        <Tabs
          defaultActiveKey={mode === 'editar' ? 'resumenGeneral' : (movimientos.length > 0 ? 'conciliadas' : 'transito')}
          type="card"
          onChange={(key) => {
            // Carga bajo demanda: movimientos y tránsito se traen al abrir su tab (modo editar).
            // En modo crear los movimientos vienen del archivo importado localmente y el tránsito
            // también queda bajo demanda (solo si ya hay cuenta de la que cargar).
            if (key === 'conciliadas' || key === 'sinconciliar' || key === 'resumen') {
              // void + catch: cargarMovimientos re-lanza errores (para abortar el guardado); aquí el
              // error ya se notifica con message.error dentro de la función, así que solo evitamos
              // el unhandled promise rejection al cambiar de pestaña.
              if (mode === 'editar' && !movimientosCargados) void cargarMovimientos().catch(() => {});
            } else if (key === 'transito' || key === 'resumentransito') {
              if (!transitoCargado) cargarTodo();
            }
          }}
          items={[
            ...(mode === 'editar' ? [
              {
                key: 'resumenGeneral',
                label: 'Resumen General',
                children: resumenGeneral ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Sección Libro del Mayor */}
                    <Card className="paces-card" size="small" title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Libro del Mayor</span>
                        <Button
                          icon={<DownloadOutlined />}
                          size="small"
                          onClick={handleExportarLibros}
                          loading={exportandoLibros}
                        >
                          Exportar
                        </Button>
                      </div>
                    }>
                      <Descriptions bordered size="small" column={2} styles={{ content: { background: 'transparent' } }}>
                        <Descriptions.Item label="Balance inicial en libros">
                          <Text strong>{formatCurrency(resumenGeneralEnVivo!.balanceInicialLibros)}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Período">
                          {data?.fechaAnt ? `${formatDate(data?.fechaAnt ?? '')} → ${formatDate(data?.fecha ?? '')}` : '-'}
                        </Descriptions.Item>
                      </Descriptions>

                      {/* Tabla resumen por tipo doc */}
                      <Table
                        dataSource={resumenGeneralEnVivo!.resumenLibros}
                        columns={[
                          { title: 'Tipo de Documento', key: 'tipo', render: (_: unknown, r: ResumenTipoDocumentoDTO) => (
                            <Text>{r.nombreTipoDoc || r.tipoDoc}</Text>
                          )},
                          { title: 'Cantidad', dataIndex: 'cantidad', align: 'right' as const, width: 120,
                            render: (v: number) => formatNumber(v) },
                          { title: 'Monto', dataIndex: 'montoTotal', align: 'right' as const, width: 160,
                            render: (v: number) => <Text strong>{formatCurrency(v)}</Text> },
                        ]}
                        rowKey="tipoDoc"
                        size="small"
                        pagination={false}
                        style={{ marginTop: 12 }}
                        locale={{ emptyText: 'No hay movimientos en el período' }}
                        summary={resumenTipoDocSummary}
                      />

                      <Divider style={{ margin: '12px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, fontSize: 16, fontWeight: 700 }}>
                        <span>Balance conciliado en libros:</span>
                        <span style={{ color: 'var(--paces-primary)' }}>{formatCurrency(resumenGeneralEnVivo!.balanceConciliadoLibros)}</span>
                      </div>
                    </Card>

                    {/* Sección Banco */}
                    <Card className="paces-card" size="small" title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Banco</span>
                        <Button
                          icon={<DownloadOutlined />}
                          size="small"
                          onClick={handleExportarTransito}
                          loading={exportandoTransito}
                        >
                          Exportar
                        </Button>
                      </div>
                    }>
                      <Descriptions bordered size="small" column={1} styles={{ content: { background: 'transparent' } }}>
                        <Descriptions.Item label="Balance según estado bancario">
                          <Text strong>{formatCurrency(resumenGeneralEnVivo!.balanceBancos)}</Text>
                        </Descriptions.Item>
                      </Descriptions>

                      {/* Tabla tránsito */}
                      <Table
                        dataSource={resumenGeneralEnVivo!.resumenTransito}
                        columns={[
                          { title: 'Tipo de Documento', key: 'tipo', render: (_: unknown, r: ResumenTipoDocumentoDTO) => (
                            <Text>{r.nombreTipoDoc || r.tipoDoc}</Text>
                          )},
                          { title: 'Cantidad', dataIndex: 'cantidad', align: 'right' as const, width: 120,
                            render: (v: number) => formatNumber(v) },
                          { title: 'Monto', dataIndex: 'montoTotal', align: 'right' as const, width: 160,
                            render: (v: number) => <Text strong>{formatCurrency(v)}</Text> },
                        ]}
                        rowKey="tipoDoc"
                        size="small"
                        pagination={false}
                        style={{ marginTop: 12 }}
                        locale={{ emptyText: 'No hay documentos en tránsito' }}
                        summary={resumenTipoDocSummary}
                      />

                      <Divider style={{ margin: '12px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, fontSize: 16, fontWeight: 700 }}>
                        <span>Balance conciliado banco + tránsito:</span>
                        <span style={{ color: 'var(--paces-primary)' }}>{formatCurrency(resumenGeneralEnVivo!.balanceConciliadoBanco)}</span>
                      </div>
                    </Card>

                    {/* Diferencia */}
                    <Card className="paces-card" size="small"
                      style={{ borderLeft: `4px solid ${resumenGeneralEnVivo!.diferencia === 0 ? '#34c38f' : '#ff4d4f'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 18, fontWeight: 700 }}>
                        <span>Diferencia</span>
                        <span style={{ color: resumenGeneralEnVivo!.diferencia === 0 ? '#34c38f' : '#ff4d4f' }}>
                          {formatCurrency(resumenGeneralEnVivo!.diferencia)}
                        </span>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <Spin />
                    <div style={{ marginTop: 8 }} className="paces-text-secondary">Cargando resumen...</div>
                  </div>
                ),
              },
            ] : []),
            {
              key: 'conciliadas',
              label: `Transacciones Conciliadas (${movimientos.filter((m) => m.cotejado).length})`,
                children: (
                  <>
                    <Input.Search
                      placeholder="Buscar en conciliadas..."
                      allowClear
                      onSearch={(v) => setSearchConcil(v)}
                      onChange={(e) => { if (!e.target.value) setSearchConcil(''); }}
                      style={{ width: 300, marginBottom: 12 }}
                      prefix={<SearchOutlined className="paces-text-icon" />}
                    />
                    <Table
                      dataSource={datosConciliadas}
                      columns={columnasMovimientoConciliadas}
                      rowKey="orden"
                      size="small"
                      pagination={{ pageSize: 50, showSizeChanger: true }}
                      scroll={{ x: 800 }}
                      locale={{ emptyText: 'No hay transacciones conciliadas' }}
                      summary={resumenMovimientosSummary}
                    />
                  </>
                ),
              },
              {
                key: 'sinconciliar',
                label: `Importados sin conciliar (${movimientos.filter((m) => !m.cotejado).length})`,
                children: (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 12, flexWrap: 'wrap' }}>
                      <Input.Search
                        placeholder="Buscar en sin conciliar..."
                        allowClear
                        onSearch={(v) => setSearchSinConcil(v)}
                        onChange={(e) => { if (!e.target.value) setSearchSinConcil(''); }}
                        style={{ width: 300 }}
                        prefix={<SearchOutlined className="paces-text-icon" />}
                      />
                      <div style={{ flex: 1 }} />
                      <Button
                        type="primary"
                        disabled={!puedeAutoConciliar}
                        onClick={handleConciliarAutomaticos}
                      >
                        Conciliar automáticos ({seleccionAuto.length})
                      </Button>
                      <Button
                        danger
                        disabled={seleccionAuto.length === 0}
                        onClick={handleEliminarSeleccionados}
                      >
                        Eliminar ({seleccionAuto.length})
                      </Button>
                    </div>
                    <Table
                      dataSource={datosSinConciliar}
                      columns={columnasMovimientoSinConciliar}
                      rowKey="orden"
                      size="small"
                      pagination={{ pageSize: 50, showSizeChanger: true }}
                      scroll={{ x: 800 }}
                      rowSelection={{ selectedRowKeys: seleccionAuto, onChange: (keys) => setSeleccionAuto(keys as number[]) }}
                      locale={{ emptyText: 'No hay movimientos sin conciliar' }}
                      summary={(rows) => resumenMovimientosSummary(rows, true)}
                    />
                  </>
                ),
              },
              {
                key: 'resumen',
                label: 'Resumen Documentos Conciliados',
                children: (
                  <>
                    <Input.Search
                      placeholder="Buscar por tipo de documento..."
                      allowClear
                      onSearch={(v) => setSearchResumen(v)}
                      onChange={(e) => { if (!e.target.value) setSearchResumen(''); }}
                      style={{ width: 300, marginBottom: 12 }}
                      prefix={<SearchOutlined className="paces-text-icon" />}
                    />
                    <Table
                      dataSource={datosResumen}
                      columns={columnasResumenConciliados}
                      rowKey="tipoDoc"
                      size="small"
                      pagination={false}
                      scroll={{ x: 600 }}
                      locale={{ emptyText: 'No hay documentos conciliados para resumir' }}
                      summary={resumenTipoDocSummary}
                    />
                  </>
                ),
              },
            {
              key: 'transito',
              label: `Transacciones en Tránsito (${transaccionesEnTransito.length})`,
              children: (
                <>
                  <Input.Search
                    placeholder="Buscar en tránsito..."
                    allowClear
                    onSearch={(v) => setSearchTransito(v)}
                    onChange={(e) => { if (!e.target.value) setSearchTransito(''); }}
                    style={{ width: 300, marginBottom: 12 }}
                    prefix={<SearchOutlined className="paces-text-icon" />}
                  />
                  <Table
                    dataSource={datosTransito}
                    columns={transitoColumns}
                    rowKey="transacId"
                    size="small"
                    loading={cargandoTransito}
                    pagination={{ pageSize: 50, showSizeChanger: true }}
                    scroll={{ x: 700 }}
                    locale={{ emptyText: 'No hay transacciones en tránsito' }}
                    summary={transitoSummary}
                  />
                </>
              ),
            },
            {
              key: 'resumentransito',
              label: 'Resumen Documentos en Tránsito',
              children: (
                <>
                  <Input.Search
                    placeholder="Buscar por tipo de documento..."
                    allowClear
                    onSearch={(v) => setSearchResumenTransito(v)}
                    onChange={(e) => { if (!e.target.value) setSearchResumenTransito(''); }}
                    style={{ width: 300, marginBottom: 12 }}
                    prefix={<SearchOutlined className="paces-text-icon" />}
                  />
                  <Table
                    dataSource={datosResumenTransito}
                    columns={columnasResumenTransitoTab}
                    rowKey="tipoDoc"
                    size="small"
                    pagination={false}
                    scroll={{ x: 600 }}
                    locale={{ emptyText: 'No hay documentos en tránsito para resumir' }}
                    summary={resumenTipoDocSummary}
                  />
                </>
              ),
            },
          ]}
        />
        </Spin>
      </Card>

      {/* Modal de documentos candidatos con el mismo monto (específico de esta pantalla) */}
      <Modal
        title={movimientoModal
          ? `Documentos con el mismo monto (${formatCurrency(movimientoModal.monto)})`
          : 'Documentos con el mismo monto'}
        open={!!movimientoModal}
        onCancel={() => setMovimientoModal(null)}
        footer={null}
        width={900}
      >
        {candidatosModal.length === 0 ? (
          <Text className="paces-text-secondary">No hay documentos candidatos para este monto.</Text>
        ) : (
          <Table
            dataSource={candidatosModal}
            columns={candidatosColumns}
            rowKey="transacId"
            size="small"
            pagination={false}
            scroll={{ x: 850 }}
            locale={{ emptyText: 'No hay documentos candidatos' }}
            summary={(rows: TransaccionConciliadaDTO[]) => {
              const monto = rows.reduce((s, r) => s + (Number(r.monto) || 0), 0);
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <Text strong>Totales</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <Text strong style={{ color: 'var(--paces-primary)' }}>{formatCurrency(monto)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} />
                </Table.Summary.Row>
              );
            }}
          />
        )}
      </Modal>

      {/* Modal crear documento bancario desde movimiento sin conciliar */}
      <Modal
        title="Crear documento bancario"
        open={!!modalCrearDoc}
        onCancel={() => setModalCrearDoc(null)}
        onOk={handleCrearDocBancario}
        confirmLoading={creandoDoc}
        okText="Crear"
        width={480}
      >
        {modalCrearDoc && (
          <>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Monto">
                <Text strong>{formatCurrency(modalCrearDoc.monto)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Referencia">{modalCrearDoc.numRef || '-'}</Descriptions.Item>
            </Descriptions>
            <Form layout="vertical" size="small">
              <Form.Item label="Tipo de documento" required>
                <Select
                  value={tipoDocSeleccionado || undefined}
                  placeholder="Seleccione tipo de documento"
                  onChange={(v) => { setTipoDocSeleccionado(v); setConceptoSeleccionado(''); }}
                  options={TIPOS_DOC_BANCARIO.map((t) => ({ value: t.codigo, label: t.nombre }))}
                />
              </Form.Item>
              <Form.Item label="Fecha del documento" required>
                <DatePicker
                  value={fechaDocSeleccionada}
                  onChange={(v) => setFechaDocSeleccionada(v)}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item label="Concepto" required>
                <Select
                  value={conceptoSeleccionado || undefined}
                  placeholder={tipoDocSeleccionado ? 'Seleccione concepto' : 'Seleccione primero el tipo de documento'}
                  disabled={!tipoDocSeleccionado}
                  onChange={(v) => { setConceptoSeleccionado(v); setEntidadSeleccionada(null); }}
                  options={conceptosDoc.map((c) => ({ value: c.codigo, label: c.nombre }))}
                />
              </Form.Item>
              <Form.Item label="Entidad" required>
                <BuscarEntidadSelect
                  entidades={entidadesCache}
                  value={entidadSeleccionada?.codigo}
                  onChange={(_codigo, entidad) => setEntidadSeleccionada(entidad)}
                  conceptoSeleccionado={!!conceptoSeleccionado}
                  placeholder="Seleccione entidad"
                />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default ConciliacionBancariaFormulario;
