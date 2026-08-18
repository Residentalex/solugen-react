import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Button, Space, Row, Col, Grid, Form, Input, InputNumber, Select, DatePicker, Typography, message, Modal, Alert, Spin, Upload, Divider, Checkbox, Descriptions,
} from 'antd';
import {
  SaveOutlined, CloseOutlined, UploadOutlined, PlusOutlined, DeleteOutlined, CheckCircleFilled, SearchOutlined, ArrowUpOutlined, ArrowDownOutlined, DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { conciliacionBancariaApi } from '../../api/conciliacionBancariaApi';
import { extraerMensajeError, formatCurrency, formatNumber, formatDate } from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import type {
  ConciliacionBancariaDTO, MovimientoBancarioDTO, CuentaBancariaDTO, TransaccionConciliadaDTO, ResumenTipoDocumentoDTO, ResumenGeneralConciliacionDTO,
} from '../../types/conciliacionBancaria';

const { Text } = Typography;
const { TextArea } = Input;

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
  const [importando, setImportando] = useState(false);
  // Transacciones sin conciliar de la cuenta (tab en tránsito)
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
  // Modal de conciliación automática (movimientos con un solo candidato del mismo monto).
  const [modalAuto, setModalAuto] = useState(false);
  const [seleccionAuto, setSeleccionAuto] = useState<number[]>([]);
  const [searchConcil, setSearchConcil] = useState('');
  const [searchSinConcil, setSearchSinConcil] = useState('');
  const [searchResumen, setSearchResumen] = useState('');
  const [searchResumenTransito, setSearchResumenTransito] = useState('');
  const [searchTransito, setSearchTransito] = useState('');
  const [exportandoLibros, setExportandoLibros] = useState(false);
  const [exportandoTransito, setExportandoTransito] = useState(false);

  const [form] = Form.useForm();

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

      const dto: Partial<ConciliacionBancariaDTO> = {
        numeroCta: values.numeroCta,
        fecha: values.fecha ? values.fecha.format('YYYY-MM-DD') : '',
        fechaAnt: values.fechaAnt ? values.fechaAnt.format('YYYY-MM-DD') : '',
        balBancos: values.balBancos || 0,
        balLibros: values.balLibros || 0,
        notas: values.notas || '',
        aplicada: false,
      };

      if (mode === 'crear') {
        const nuevoId = await conciliacionBancariaApi.crear(sucursalActiva, dto);
        // Si hay movimientos importados, guardarlos en DARCHCON
        if (movimientos.length > 0) {
          await conciliacionBancariaApi.guardarMovimientosImportados(sucursalActiva, nuevoId, movimientos);
        }
        message.success('Conciliación creada exitosamente');
        navigate(`/FConcil/${nuevoId}`, { replace: true });
      } else {
        // En edición, si los movimientos aún no se cargaron (no se abrió la tab de movimientos),
        // cargarlos antes de guardar para no perder el guardado de DARCHCON.
        if (!movimientosCargados) {
          await cargarMovimientos();
        }
        dto.concilID = parseInt(id!);
        // Guardar movimientos PRIMERO: si la validación de movimientos falla (ej: documento sin
        // conciliar), el encabezado no queda persistido → sin estado parcial (mismo patrón que handleGuardarYAplicar).
        if (movimientos.length > 0) {
          await conciliacionBancariaApi.guardarMovimientosImportados(sucursalActiva, parseInt(id!), movimientos);
        }
        await conciliacionBancariaApi.actualizar(sucursalActiva, parseInt(id!), dto);
        message.success('Conciliación actualizada exitosamente');
        navigate(`/FConcil/${id}`, { replace: true });
      }
    } catch (err: any) {
      if (err?.errorFields) return; // Validation error
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarYAplicar = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const dto: Partial<ConciliacionBancariaDTO> = {
        numeroCta: values.numeroCta,
        fecha: values.fecha ? values.fecha.format('YYYY-MM-DD') : '',
        fechaAnt: values.fechaAnt ? values.fechaAnt.format('YYYY-MM-DD') : '',
        balBancos: values.balBancos || 0,
        balLibros: values.balLibros || 0,
        notas: values.notas || '',
        aplicada: true,
      };

      if (mode === 'crear') {
        const nuevoId = await conciliacionBancariaApi.crear(sucursalActiva, dto);
        // Si hay movimientos importados, guardarlos en DARCHCON
        if (movimientos.length > 0) {
          await conciliacionBancariaApi.guardarMovimientosImportados(sucursalActiva, nuevoId, movimientos);
        }
        await conciliacionBancariaApi.aplicar(sucursalActiva, nuevoId);
        message.success('Conciliación creada y aplicada exitosamente');
        navigate(`/FConcil/${nuevoId}`, { replace: true });
      } else {
        // En edición, cargar movimientos antes de guardar si aún no se cargaron (ver handleGuardar).
        if (!movimientosCargados) {
          await cargarMovimientos();
        }
        dto.concilID = parseInt(id!);
        // Guardar movimientos PRIMERO: si la validación de movimientos falla (ej: documento sin
        // conciliar), el encabezado no queda persistido → sin estado parcial. El concilId ya existe
        // y el guardado de movimientos no depende del header actualizado (usa existente de BD).
        if (movimientos.length > 0) {
          await conciliacionBancariaApi.guardarMovimientosImportados(sucursalActiva, parseInt(id!), movimientos);
        }
        await conciliacionBancariaApi.actualizar(sucursalActiva, parseInt(id!), dto);
        await conciliacionBancariaApi.aplicar(sucursalActiva, parseInt(id!));
        message.success('Conciliación actualizada y aplicada exitosamente');
        navigate(`/FConcil/${id}`, { replace: true });
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      const msg = extraerMensajeError(err, 'Error al guardar y aplicar');
      message.error(msg);
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
        transito = await conciliacionBancariaApi.obtenerEnTransito(sucursalActiva, parseInt(id));
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

  const parseCSVaMovimientos = (text: string): MovimientoBancarioDTO[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    // Saltar encabezado si la primera línea contiene encabezados conocidos
    const firstLower = lines[0]?.toLowerCase() || '';
    const startIdx = (firstLower.includes('fecha') || firstLower.includes('fec') || firstLower.includes('numref')) ? 1 : 0;
    return lines.slice(startIdx).map((line, idx) => {
      const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
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
    setArchivoImportado(file);
    setImportando(true);
    // cargarMovimientos muestra su propio message.error al fallar: se marca errorCarga para
    // no duplicar el toast en el catch externo (el aborto del import se mantiene vía re-throw).
    let errorCarga = false;
    try {
      let cantidadImportada = 0;

      if (mode === 'editar' && id) {
        // Asegurar que los movimientos de BD estén cargados antes de acumular: si la carga
        // falla, cargarMovimientos muestra el error y re-lanza, abortando el import sin marcar
        // movimientosCargados(true) con datos incompletos (evita borrar DARCHCON al guardar).
        if (!movimientosCargados) {
          try {
            await cargarMovimientos();
          } catch (e) {
            errorCarga = true;
            throw e;
          }
        }
        // Preview: backend parsea + matching CTRANSAC (pasa concilId para filtrar por CTABANC)
        const movsDesdeApi = await conciliacionBancariaApi.importarPreview(sucursalActiva, file, parseInt(id));
        // Acumular en vez de reemplazar: importar día a día en la misma conciliación.
        // Se reasignan órdenes únicos para evitar colisión de rowKey="orden" en las tablas.
        setMovimientos(prev => {
          const base = prev.length > 0 ? Math.max(...prev.map((m) => m.orden)) : 0;
          return [...prev, ...movsDesdeApi.map((m, i) => ({ ...m, orden: base + i + 1 }))];
        });
        // El estado ya tiene los movimientos del preview: no recargar desde BD al guardar ni al cambiar de tab.
        setMovimientosCargados(true);
        cantidadImportada = movsDesdeApi.length;
      } else {
        // Creación: parseo local (sin id)
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Error al leer el archivo'));
          reader.readAsText(file);
        });
        const movsLocal = parseCSVaMovimientos(text);
        setMovimientos(movsLocal);
        cantidadImportada = movsLocal.length;
      }
      message.success(`${cantidadImportada} movimientos importados`);
    } catch (err: any) {
      // Si el fallo vino de cargarMovimientos, el toast ya se mostró ahí: no duplicar.
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
    setMovimientos((prev) => {
      const mov = prev.find((m) => m.orden === orden);
      if (!mov) return prev;
      // Movimiento cotejado de un documento importado: desmarcar para volver a tránsito.
      if (mov.cotejado && (mov.numRef || mov.concepto || mov.ctaBanc)) {
        return prev.map((m) =>
          m.orden === orden
            ? { ...m, cotejado: false, documento: '', tipoDoc: '', nombreTipoDoc: '', entidad: '' }
            : m
        );
      }
      // Movimiento creado por checkbox (sin datos de banco): eliminar; la transacción vuelve a tránsito sola.
      return prev.filter((m) => m.orden !== orden);
    });
  };

  // Concilia un movimiento importado con una transacción en tránsito seleccionada del modal.
  const handleConciliar = (candidato: TransaccionConciliadaDTO) => {
    if (!movimientoModal) return;
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
          }
        : m
    ));
    setMovimientoModal(null);
  };

  // Concilia en lote los movimientos seleccionados que tienen un único candidato del mismo monto.
  const handleConciliarAutomaticos = () => {
    setMovimientos((prev) => {
      let next = [...prev];
      seleccionAuto.forEach((orden) => {
        const mov = next.find((m) => m.orden === orden);
        if (!mov) return;
        const candidatos = candidatosPorMonto.get(mov.monto) || [];
        if (candidatos.length !== 1) return;
        const candidato = candidatos[0];
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
  const diferencia = Number(balBancos) - Number(balLibros);

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

  // Cargar transacciones sin conciliar de la cuenta bajo demanda (tab tránsito).
  // En modo editar se pasa el concilID para incluir los documentos CONCIL='T' de la conciliación en tránsito.
  // Se pasa la fecha de la conciliación para excluir documentos con fecha posterior a ella.
  const cargarTransito = useCallback(() => {
    if (!cuentaTransito) return;
    setCargandoTransito(true);
    const fechaStr = fechaConciliacion ? fechaConciliacion.format('YYYYMMDDHHmmss') : '';
    conciliacionBancariaApi.obtenerTransaccionesSinConciliar(sucursalActiva, cuentaTransito, id ? parseInt(id) : 0, fechaStr)
      .then((res) => {
        setTransaccionesSinConciliar(res);
        setTransitoCargado(true);
      })
      .catch(() => message.warning('No se pudieron cargar las transacciones en tránsito'))
      .finally(() => setCargandoTransito(false));
  }, [cuentaTransito, sucursalActiva, id, fechaConciliacion]);

  // Cargar transacciones conciliadas + en tránsito de ESTA conciliación (para el export de tránsito).
  // Se precargan al abrir la edición para evitar barrer toda CTRANSAC al pulsar Exportar.
  const cargarConciliadasYTransito = useCallback(() => {
    if (!id) return;
    Promise.all([
      conciliacionBancariaApi.obtenerTransaccionesConciliadas(sucursalActiva, parseInt(id)),
      conciliacionBancariaApi.obtenerEnTransito(sucursalActiva, parseInt(id)),
    ])
      .then(([conc, trans]) => {
        setTransaccionesDetalle(conc);
        setTransaccionesCargadas(true);
        setEnTransito(trans);
        setEnTransitoCargado(true);
      })
      .catch(() => message.warning('No se pudieron cargar las transacciones conciliadas/tránsito'));
  }, [id, sucursalActiva]);

  // Cargar resumen general de la conciliación (solo modo editar: la conciliación ya está guardada
  // con fecha/fechaAnt y el backend puede calcular el resumen).
  const cargarResumenGeneral = useCallback(() => {
    if (!id) return;
    conciliacionBancariaApi.obtenerResumenGeneral(sucursalActiva, parseInt(id))
      .then(setResumenGeneral)
      .catch(() => message.error('Error al cargar el resumen general'));
  }, [id, sucursalActiva]);

  // Cargar el tránsito automáticamente en modo editar: la pestaña activa por defecto es 'transito'
  // cuando no hay movimientos (movimientos.length === 0) y el onChange del Tabs solo se dispara al
  // CAMBIAR de pestaña, así que sin este efecto la tabla de tránsito quedaría vacía al abrir la edición.
  // Se ejecuta cuando data pasa de null a valor (cuentaTransito ya derivada) y !transitoCargado.
  useEffect(() => {
    if (mode !== 'editar') return;
    if (!data) return;
    if (transitoCargado) return;
    cargarTransito();
  }, [mode, data, transitoCargado, cargarTransito]);

  // Precargar transacciones conciliadas + en tránsito al abrir la edición (no al exportar).
  useEffect(() => {
    if (mode !== 'editar') return;
    if (!data) return;
    if (transaccionesCargadas && enTransitoCargado) return;
    cargarConciliadasYTransito();
  }, [mode, data, transaccionesCargadas, enTransitoCargado, cargarConciliadasYTransito]);

  // Cargar movimientos de DARCHCON automáticamente en modo editar: sin esto, las tabs de
  // movimientos no se renderizan (dependen de movimientos.length > 0) y nunca se dispara
  // la carga bajo demanda del onChange del Tabs.
  useEffect(() => {
    if (mode !== 'editar') return;
    if (!data) return;
    if (movimientosCargados) return;
    cargarMovimientos().catch(() => {});
  }, [mode, data, movimientosCargados, cargarMovimientos]);

  // Cargar el resumen general automáticamente en modo editar: la pestaña 'resumenGeneral' es la
  // activa por defecto y el onChange del Tabs solo se dispara al CAMBIAR de pestaña, así que sin
  // este efecto la pestaña quedaría vacía al abrir la edición.
  useEffect(() => {
    if (mode !== 'editar') return;
    if (!data) return;
    cargarResumenGeneral();
  }, [mode, data, cargarResumenGeneral]);

  // Claves normalizadas de los movimientos cotejados del preview (para excluir del tránsito).
  // Incluye la referencia del banco (numRef) y el documento completo resuelto (documento).
  const clavesCotejados = useMemo(() => {
    const set = new Set<string>();
    movimientos.filter((m) => m.cotejado).forEach((m) => {
      // Clave por referencia del banco (numRef) vs numDoc de CTRANSAC.
      set.add(normalizarCeros(m.numRef || ''));
      // Clave por documento completo resuelto (ej: "FAC-0100009581") vs tipoDoc-numDoc.
      if (m.documento) set.add(normalizarDocCompleto(m.documento));
    });
    return set;
  }, [movimientos]);

  // Transacciones sin conciliar que NO matchearon con los movimientos cotejados.
  const transaccionesEnTransito = useMemo(() => {
    return transaccionesSinConciliar.filter((t) => {
      if (clavesCotejados.has(normalizarCeros(t.numDoc || ''))) return false;
      if (t.tipoDoc && clavesCotejados.has(normalizarDocCompleto(`${t.tipoDoc}-${t.numDoc || ''}`))) return false;
      return true;
    });
  }, [transaccionesSinConciliar, clavesCotejados]);

  // Índice de transacciones en tránsito por monto: candidatos "mismo monto" por movimiento.
  const candidatosPorMonto = useMemo(() => {
    const map = new Map<number, TransaccionConciliadaDTO[]>();
    transaccionesEnTransito.forEach((t) => {
      const arr = map.get(t.monto) || [];
      arr.push(t);
      map.set(t.monto, arr);
    });
    return map;
  }, [transaccionesEnTransito]);

  // Movimientos sin conciliar con EXACTAMENTE 1 documento candidato del mismo monto.
  const movimientosUnSoloCandidato = useMemo(() => {
    return movimientos.filter((m) => {
      if (m.cotejado) return false;
      const candidatos = candidatosPorMonto.get(m.monto) || [];
      return candidatos.length === 1;
    });
  }, [movimientos, candidatosPorMonto]);

  // Candidatos visibles en el modal abierto (mismo monto que el movimiento seleccionado).
  const candidatosModal = useMemo(() => {
    if (!movimientoModal) return [];
    return candidatosPorMonto.get(movimientoModal.monto) || [];
  }, [movimientoModal, candidatosPorMonto]);

  // Resumen de movimientos conciliados agrupados por tipo de documento.
  const resumenTipoDoc = useMemo<ResumenTipoDocumentoDTO[]>(() => {
    const map = new Map<string, ResumenTipoDocumentoDTO>();
    movimientos.filter((m) => m.cotejado).forEach((m) => {
      const tipoDoc = derivarTipoDoc(m);
      if (!tipoDoc) return;
      const existing = map.get(tipoDoc);
      if (existing) {
        existing.cantidad += 1;
        existing.montoTotal += m.monto;
      } else {
        map.set(tipoDoc, {
          tipoDoc,
          nombreTipoDoc: m.nombreTipoDoc || '',
          cantidad: 1,
          montoTotal: m.monto,
        });
      }
    });
    return Array.from(map.values());
  }, [movimientos]);

  // Resumen de transacciones en tránsito agrupadas por tipo de documento.
  const resumenTransito = useMemo<ResumenTipoDocumentoDTO[]>(() => {
    const map = new Map<string, ResumenTipoDocumentoDTO>();
    transaccionesEnTransito.forEach((t) => {
      if (!t.tipoDoc) return;
      const existing = map.get(t.tipoDoc);
      if (existing) {
        existing.cantidad += 1;
        existing.montoTotal += t.monto;
      } else {
        map.set(t.tipoDoc, {
          tipoDoc: t.tipoDoc,
          nombreTipoDoc: t.nombreTipoDoc || '',
          cantidad: 1,
          montoTotal: t.monto,
        });
      }
    });
    return Array.from(map.values());
  }, [transaccionesEnTransito]);

  // ===== Columnas =====
  const movimientoColumns = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (f: string) => formatDate(f),
    },
    {
      title: 'Referencia',
      dataIndex: 'numRef',
      key: 'numRef',
      width: 120,
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      key: 'concepto',
      ellipsis: true,
      render: (val: string, record: MovimientoBancarioDTO) => (
        <Space size={4}>
          {record.debCred === 'C'
            ? <ArrowUpOutlined style={{ color: '#52c41a' }} />
            : <ArrowDownOutlined style={{ color: '#ff4d4f' }} />}
          <Text>{val || '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 160,
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
      render: (val: number) => <Text strong>{formatCurrency(val)}</Text>,
    },
    {
      title: 'Acción',
      key: 'accion',
      width: 60,
      render: (_: any, record: MovimientoBancarioDTO) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleEliminarMovimiento(record.orden)}
        />
      ),
    },
  ];

  // Columnas del resumen por tipo de documento
  const resumenColumns = [
    {
      title: 'Tipo / Nombre',
      key: 'tipo',
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

  // Columnas de transacciones en tránsito
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
    },
    {
      title: 'Documento',
      key: 'documento',
      width: 160,
      render: (_: unknown, record: TransaccionConciliadaDTO) => (
        <Text>{record.tipoDoc}-{record.numDoc}</Text>
      ),
    },
    {
      title: 'Entidad',
      dataIndex: 'entidad',
      key: 'entidad',
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
                        disabled={mode === 'editar'}
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
                      <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={12}>
                    <Form.Item
                      name="balLibros"
                      label="Balance según Libros"
                      rules={[{ required: true, message: 'Ingrese el balance' }]}
                    >
                      <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} disabled={mode === 'editar'} />
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
                      disabled={mode === 'editar'}
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
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} disabled={mode === 'editar'} />
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
              if (!transitoCargado) cargarTransito();
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
                          <Text strong>{formatCurrency(resumenGeneral.balanceInicialLibros)}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Período">
                          {data?.fechaAnt ? `${formatDate(data?.fechaAnt ?? '')} → ${formatDate(data?.fecha ?? '')}` : '-'}
                        </Descriptions.Item>
                      </Descriptions>

                      {/* Tabla resumen por tipo doc */}
                      <Table
                        dataSource={resumenGeneral.resumenLibros}
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
                      />

                      <Divider style={{ margin: '12px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, fontSize: 16, fontWeight: 700 }}>
                        <span>Balance conciliado en libros:</span>
                        <span style={{ color: 'var(--paces-primary)' }}>{formatCurrency(resumenGeneral.balanceConciliadoLibros)}</span>
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
                          <Text strong>{formatCurrency(resumenGeneral.balanceBancos)}</Text>
                        </Descriptions.Item>
                      </Descriptions>

                      {/* Tabla tránsito */}
                      <Table
                        dataSource={resumenGeneral.resumenTransito}
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
                      />

                      <Divider style={{ margin: '12px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, fontSize: 16, fontWeight: 700 }}>
                        <span>Balance conciliado banco + tránsito:</span>
                        <span style={{ color: 'var(--paces-primary)' }}>{formatCurrency(resumenGeneral.balanceConciliadoBanco)}</span>
                      </div>
                    </Card>

                    {/* Diferencia */}
                    <Card className="paces-card" size="small"
                      style={{ borderLeft: `4px solid ${resumenGeneral.diferencia === 0 ? '#34c38f' : '#ff4d4f'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 18, fontWeight: 700 }}>
                        <span>Diferencia</span>
                        <span style={{ color: resumenGeneral.diferencia === 0 ? '#34c38f' : '#ff4d4f' }}>
                          {formatCurrency(resumenGeneral.diferencia)}
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
            ...(movimientos.length > 0 ? [
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
                      dataSource={(() => {
                        const items = movimientos.filter((m) => m.cotejado);
                        if (!searchConcil) return items;
                        const q = searchConcil.toLowerCase();
                        return items.filter((m) =>
                          (m.concepto && m.concepto.toLowerCase().includes(q)) ||
                          (m.numRef && m.numRef.toLowerCase().includes(q)) ||
                          (m.documento && m.documento.toLowerCase().includes(q))
                        );
                      })()}
                      columns={movimientoColumns}
                      rowKey="orden"
                      size="small"
                      pagination={{ pageSize: 50, showSizeChanger: true }}
                      scroll={{ x: 800 }}
                      locale={{ emptyText: 'No hay transacciones conciliadas' }}
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
                        disabled={movimientosUnSoloCandidato.length === 0}
                        onClick={() => {
                          setSeleccionAuto(movimientosUnSoloCandidato.map((m) => m.orden));
                          setModalAuto(true);
                        }}
                      >
                        Conciliar automáticos ({movimientosUnSoloCandidato.length})
                      </Button>
                    </div>
                    <Table
                      dataSource={(() => {
                        const items = movimientos.filter((m) => !m.cotejado);
                        if (!searchSinConcil) return items;
                        const q = searchSinConcil.toLowerCase();
                        return items.filter((m) =>
                          (m.concepto && m.concepto.toLowerCase().includes(q)) ||
                          (m.numRef && m.numRef.toLowerCase().includes(q)) ||
                          (m.documento && m.documento.toLowerCase().includes(q)) ||
                          (m.entidad && m.entidad.toLowerCase().includes(q))
                        );
                      })()}
                      columns={movimientoColumns}
                      rowKey="orden"
                      size="small"
                      pagination={{ pageSize: 50, showSizeChanger: true }}
                      scroll={{ x: 800 }}
                      locale={{ emptyText: 'No hay movimientos sin conciliar' }}
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
                      dataSource={(() => {
                        const items = resumenTipoDoc;
                        if (!searchResumen) return items;
                        const q = searchResumen.toLowerCase();
                        return items.filter((r) =>
                          (r.nombreTipoDoc && r.nombreTipoDoc.toLowerCase().includes(q)) ||
                          (r.tipoDoc && r.tipoDoc.toLowerCase().includes(q))
                        );
                      })()}
                      columns={resumenColumns}
                      rowKey="tipoDoc"
                      size="small"
                      pagination={false}
                      scroll={{ x: 600 }}
                      locale={{ emptyText: 'No hay documentos conciliados para resumir' }}
                    />
                  </>
                ),
              },
            ] : []),
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
                    dataSource={(() => {
                      const items = transaccionesEnTransito;
                      if (!searchTransito) return items;
                      const q = searchTransito.toLowerCase();
                      return items.filter((t) =>
                        (t.tipoDoc && t.tipoDoc.toLowerCase().includes(q)) ||
                        (t.numDoc && t.numDoc.toLowerCase().includes(q)) ||
                        (t.entidad && t.entidad.toLowerCase().includes(q))
                      );
                    })()}
                    columns={transitoColumns}
                    rowKey="transacId"
                    size="small"
                    loading={cargandoTransito}
                    pagination={{ pageSize: 50, showSizeChanger: true }}
                    scroll={{ x: 700 }}
                    locale={{ emptyText: 'No hay transacciones en tránsito' }}
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
                    dataSource={(() => {
                      const items = resumenTransito;
                      if (!searchResumenTransito) return items;
                      const q = searchResumenTransito.toLowerCase();
                      return items.filter((r) =>
                        (r.nombreTipoDoc && r.nombreTipoDoc.toLowerCase().includes(q)) ||
                        (r.tipoDoc && r.tipoDoc.toLowerCase().includes(q))
                      );
                    })()}
                    columns={resumenColumns}
                    rowKey="tipoDoc"
                    size="small"
                    pagination={false}
                    scroll={{ x: 600 }}
                    locale={{ emptyText: 'No hay documentos en tránsito para resumir' }}
                  />
                </>
              ),
            },
          ]}
        />
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
          />
        )}
      </Modal>

      {/* Modal de conciliación automática: movimientos con un solo documento del mismo monto */}
      <Modal
        title={`Conciliar automáticos (${movimientosUnSoloCandidato.length})`}
        open={modalAuto}
        onCancel={() => { setModalAuto(false); setSeleccionAuto([]); }}
        width={1200}
        footer={[
          <Button key="todos" onClick={() => setSeleccionAuto(movimientosUnSoloCandidato.map((m) => m.orden))}>
            Seleccionar todos
          </Button>,
          <Button key="ninguno" onClick={() => setSeleccionAuto([])}>
            Ninguno
          </Button>,
          <Button key="cancelar" onClick={() => { setModalAuto(false); setSeleccionAuto([]); }}>
            Cancelar
          </Button>,
          <Button
            key="conciliar"
            type="primary"
            disabled={seleccionAuto.length === 0}
            onClick={handleConciliarAutomaticos}
          >
            Conciliar ({seleccionAuto.length})
          </Button>,
        ]}
      >
        <Table
          dataSource={movimientosUnSoloCandidato}
          rowKey="orden"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} movimientos` }}
          scroll={{ x: 850 }}
          rowSelection={{
            selectedRowKeys: seleccionAuto,
            onChange: (keys) => setSeleccionAuto(keys as number[]),
          }}
          locale={{ emptyText: 'No hay movimientos con un solo documento del mismo monto' }}
          columns={[
            { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110, render: (f: string) => formatDate(f) },
            { title: 'Concepto', dataIndex: 'concepto', key: 'concepto', ellipsis: true, render: (val: string) => <Text>{val || '-'}</Text> },
            { title: 'Monto', dataIndex: 'monto', key: 'monto', width: 130, align: 'right' as const, render: (val: number) => <Text strong>{formatCurrency(val)}</Text> },
            {
              title: 'Documento',
              key: 'documentoCandidato',
              width: 160,
              render: (_: unknown, r: MovimientoBancarioDTO) => {
                const candidatos = candidatosPorMonto.get(r.monto) || [];
                const c = candidatos[0];
                return <Text>{c ? `${c.tipoDoc}-${c.numDoc}` : '-'}</Text>;
              },
            },
            {
              title: 'Beneficiario',
              key: 'beneficiarioCandidato',
              ellipsis: true,
              render: (_: unknown, r: MovimientoBancarioDTO) => {
                const candidatos = candidatosPorMonto.get(r.monto) || [];
                const c = candidatos[0];
                return <Text>{c ? (c.entidad || '-') : '-'}</Text>;
              },
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default ConciliacionBancariaFormulario;
