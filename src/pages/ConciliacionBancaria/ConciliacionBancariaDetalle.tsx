import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Grid, Typography, Descriptions, Alert, message, Modal, Input, Divider, Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, CheckCircleOutlined, CheckCircleFilled, CloseCircleFilled, SearchOutlined, PrinterOutlined, DownloadOutlined, FileExcelOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { conciliacionBancariaApi } from '../../api/conciliacionBancariaApi';
import PermissionGate from '../../components/PermissionGate';
import { formatCurrency, formatNumber, formatDate, extraerMensajeError, toTitleCase } from '../../utils/formats';
import dayjs from 'dayjs';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import type { ConciliacionBancariaDTO, MovimientoBancarioDTO, TransaccionConciliadaDTO, ResumenTipoDocumentoDTO, ResumenGeneralConciliacionDTO } from '../../types/conciliacionBancaria';

const { Text } = Typography;

const ConciliacionBancariaDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const [data, setData] = useState<ConciliacionBancariaDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [searchMov, setSearchMov] = useState('');
  const [searchSinConcil, setSearchSinConcil] = useState('');
  const [searchTrans, setSearchTrans] = useState('');
  const [enTransito, setEnTransito] = useState<TransaccionConciliadaDTO[]>([]);
  const [loadingTransito, setLoadingTransito] = useState(false);
  const [searchTransito, setSearchTransito] = useState('');
  const [resumenGeneral, setResumenGeneral] = useState<ResumenGeneralConciliacionDTO | null>(null);
  const [exportandoLibros, setExportandoLibros] = useState(false);
  const [exportandoTransito, setExportandoTransito] = useState(false);
  const [exportandoMovimientos, setExportandoMovimientos] = useState(false);
  const [exportandoConciliadas, setExportandoConciliadas] = useState(false);
  const [movimientosDetalle, setMovimientosDetalle] = useState<MovimientoBancarioDTO[]>([]);
  const [transaccionesDetalle, setTransaccionesDetalle] = useState<TransaccionConciliadaDTO[]>([]);
  const [movimientosCargados, setMovimientosCargados] = useState(false);
  const [transaccionesCargadas, setTransaccionesCargadas] = useState(false);
  const [transitoCargado, setTransitoCargado] = useState(false);

  // ===== Carga de datos =====
  const cargarData = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setLoadingError(false);

    conciliacionBancariaApi.obtenerEncabezado(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setPageTitleOverride(`Conciliación N° ${res.concilID}`);
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar la conciliación');
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  const cargarEnTransito = useCallback(async () => {
    if (!id || !data) return;
    setLoadingTransito(true);
    const fechaStr = dayjs(data.fecha).format('YYYY-MM-DD');
    try {
      // Cargar tanto DOCTRANS (documentos en tránsito) como CTRANSAC sin conciliar
      const [sinConciliar, enTransitoDoctrans] = await Promise.all([
        conciliacionBancariaApi.obtenerTransaccionesSinConciliarSimple(sucursalActiva, data.numeroCta, fechaStr),
        conciliacionBancariaApi.obtenerEnTransito(sucursalActiva, parseInt(id))
      ]);
      // Combinar ambos resultados: transacciones sin conciliar de CTRANSAC + documentos en tránsito de DOCTRANS
      // Eliminar duplicados por transacId
      const combined = [...sinConciliar, ...enTransitoDoctrans];
      const combinado = combined.filter((item, index, self) =>
        index === self.findIndex(t => t.transacId === item.transacId)
      );
      setEnTransito(combinado);
      setTransitoCargado(true);
      // Recargar resumen general después de cargar los datos de tránsito
      await cargarResumenGeneral();
    } catch {
      message.error('Error al cargar documentos en tránsito');
    } finally {
      setLoadingTransito(false);
    }
  }, [id, sucursalActiva, data]);

  const cargarMovimientosDetalle = useCallback(() => {
    if (!id) return;
    conciliacionBancariaApi.obtenerMovimientos(sucursalActiva, parseInt(id))
      .then((res) => {
        setMovimientosDetalle(res);
        setMovimientosCargados(true);
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar los movimientos');
        message.error(msg);
      });
  }, [id, sucursalActiva]);

  const cargarTransaccionesDetalle = useCallback(() => {
    if (!id) return;
    conciliacionBancariaApi.obtenerTransaccionesConciliadas(sucursalActiva, parseInt(id))
      .then((res) => {
        setTransaccionesDetalle(res);
        setTransaccionesCargadas(true);
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar las transacciones');
        message.error(msg);
      });
  }, [id, sucursalActiva]);

  const cargarResumenGeneral = useCallback(() => {
    if (!id) return;
    conciliacionBancariaApi.obtenerResumenGeneral(sucursalActiva, parseInt(id))
      .then(setResumenGeneral)
      .catch(() => message.error('Error al cargar el resumen general'));
  }, [id, sucursalActiva]);

  // Resumen "en vivo": combina los valores del backend con los datos locales de tránsito
  // para que el resumen refleje tanto DOCTRANS como CTRANSAC sin conciliar.
  const resumenGeneralEnVivo = useMemo<ResumenGeneralConciliacionDTO | null>(() => {
    if (!resumenGeneral) return null;

    // Resumen de tránsito en vivo agrupado por tipo de documento
    const resumenTransitoEnVivo: ResumenTipoDocumentoDTO[] = (() => {
      const map = new Map<string, ResumenTipoDocumentoDTO>();
      enTransito.forEach((t) => {
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

    const balanceConciliadoBanco = resumenGeneral.balanceBancos + resumenTransitoEnVivo.reduce((s, r) => s + r.montoTotal, 0);

    return {
      balanceInicialLibros: resumenGeneral.balanceInicialLibros,
      resumenLibros: resumenGeneral.resumenLibros,
      balanceConciliadoLibros: resumenGeneral.balanceConciliadoLibros,
      balanceBancos: resumenGeneral.balanceBancos,
      resumenTransito: resumenTransitoEnVivo,
      balanceConciliadoBanco,
      diferencia: balanceConciliadoBanco - resumenGeneral.balanceConciliadoLibros,
    };
  }, [resumenGeneral, enTransito]);

  useEffect(() => {
    setActiveModule('FConcil');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    cargarData();
  }, [cargarData]);

  // Cargar tránsito al montar para que el label del tab muestre el conteo real
  useEffect(() => {
    if (data) cargarEnTransito();
  }, [data, cargarEnTransito]);

  // La pestaña activa por defecto es 'movimientos'; onChange no se dispara al montar,
  // así que cargar los movimientos aquí (igual que el efecto de tránsito).
  useEffect(() => {
    if (!data) return;
    if (movimientosCargados) return;
    cargarMovimientosDetalle();
    cargarResumenGeneral();
  }, [data, movimientosCargados, cargarMovimientosDetalle, cargarResumenGeneral]);

  // ===== Handlers =====
  const handleAplicar = () => {
    if (!data) return;

    Modal.confirm({
      title: 'Aplicar conciliación',
      content: `¿Está seguro de aplicar la conciliación N° ${data.concilID}?`,
      okText: 'Sí, aplicar',
      cancelText: 'Cancelar',
      onOk: async () => {
        setSaving(true);
        try {
          await conciliacionBancariaApi.aplicar(sucursalActiva, data.concilID);
          message.success('Conciliación aplicada exitosamente');
          cargarData();
          if (movimientosCargados) cargarMovimientosDetalle();
          if (transaccionesCargadas) cargarTransaccionesDetalle();
        } catch (err: any) {
          const msg = extraerMensajeError(err, 'Error al aplicar');
          message.error(msg);
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const handleImprimir = async () => {
    setImprimiendo(true);
    try {
      const res = await apiClient.get(
        `/reportes/conciliacion-bancaria/${sucursalActiva}/${Number(id)}/pdf`,
        { responseType: 'blob' }
      );
      const blobUrl = URL.createObjectURL(res.data);
      window.open(blobUrl, '_blank');
    } catch {
      message.error('Error al generar el PDF');
    } finally {
      setImprimiendo(false);
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
      // Asegurar datos cargados bajo demanda (sin barrer CTRANSAC en el backend)
      let conciliadas = transaccionesDetalle;
      if (!transaccionesCargadas) {
        conciliadas = await conciliacionBancariaApi.obtenerTransaccionesConciliadas(sucursalActiva, parseInt(id));
        setTransaccionesDetalle(conciliadas);
        setTransaccionesCargadas(true);
      }
      let transito = enTransito;
      if (!transitoCargado) {
        // Cargar tanto DOCTRANS como CTRANSAC sin conciliar para exportar
        const fechaStr = dayjs(data!.fecha).format('YYYY-MM-DD');
        const [sinConciliar, enTransitoDoctrans] = await Promise.all([
          conciliacionBancariaApi.obtenerTransaccionesSinConciliarSimple(sucursalActiva, data!.numeroCta, fechaStr),
          conciliacionBancariaApi.obtenerEnTransito(sucursalActiva, parseInt(id))
        ]);
        transito = [...sinConciliar, ...enTransitoDoctrans];
        transito = transito.filter((item, index, self) =>
          index === self.findIndex(t => t.transacId === item.transacId)
        );
        setEnTransito(transito);
        setTransitoCargado(true);
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

  const handleExportarMovimientos = async () => {
    if (!id) return;
    setExportandoMovimientos(true);
    try {
      const datos = movimientosDetalle;
      if (datos.length === 0) {
        message.warning('No hay movimientos bancarios para exportar');
        return;
      }
      const companyName = await getCompanyName(sucursalActiva);
      const columnHeaders = ['Fecha', 'Referencia', 'Concepto', 'Total', 'Déb/Créd', 'Cotejado', 'Documento', 'Entidad'];
      const dataRows = datos.map(d => [
        d.fecha ? formatDate(d.fecha) : '',
        d.numRef || '',
        d.concepto || '',
        d.monto,
        d.debCred === 'D' ? 'Débito' : 'Crédito',
        d.cotejado ? 'Sí' : 'No',
        d.documento || '',
        d.entidad || '',
      ]);
      exportToExcel({
        companyName,
        extraHeaderRows: [[`Movimientos Bancarios - Conciliación ${id}`]],
        columnHeaders,
        dataRows,
        sheetName: 'Movimientos Bancarios',
        fileName: `movimientos-bancarios-${id}.xlsx`,
        columnWidths: [{ wch: 12 }, { wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 30 }],
      });
      message.success('Movimientos bancarios exportados correctamente');
    } catch {
      message.error('Error al exportar movimientos');
    } finally {
      setExportandoMovimientos(false);
    }
  };

  const handleExportarConciliadas = async () => {
    if (!id) return;
    setExportandoConciliadas(true);
    try {
      let datos = transaccionesDetalle;
      if (!transaccionesCargadas) {
        datos = await conciliacionBancariaApi.obtenerTransaccionesConciliadas(sucursalActiva, parseInt(id));
        setTransaccionesDetalle(datos);
        setTransaccionesCargadas(true);
      }
      if (datos.length === 0) {
        message.warning('No hay transacciones conciliadas para exportar');
        return;
      }
      const companyName = await getCompanyName(sucursalActiva);
      const columnHeaders = ['Fecha', 'Documento', 'Entidad', 'Total', 'Déb/Créd'];
      const dataRows = datos.map(d => [
        d.fecha ? formatDate(d.fecha) : '',
        `${d.tipoDoc}-${d.numDoc}`,
        d.entidad || '',
        d.monto,
        d.debCred === 'D' ? 'Débito' : 'Crédito',
      ]);
      exportToExcel({
        companyName,
        extraHeaderRows: [[`Transacciones Conciliadas - Conciliación ${id}`]],
        columnHeaders,
        dataRows,
        sheetName: 'Conciliadas',
        fileName: `transacciones-conciliadas-${id}.xlsx`,
        columnWidths: [{ wch: 12 }, { wch: 18 }, { wch: 30 }, { wch: 15 }, { wch: 10 }],
      });
      message.success('Transacciones conciliadas exportadas correctamente');
    } catch {
      message.error('Error al exportar transacciones conciliadas');
    } finally {
      setExportandoConciliadas(false);
    }
  };

  const handleExportarTransitoTab = async () => {
    if (!id || !data) return;
    setExportandoTransito(true);
    try {
      let datos = enTransito;
      if (!transitoCargado) {
        // Cargar tanto DOCTRANS como CTRANSAC sin conciliar
        const fechaStr = dayjs(data.fecha).format('YYYY-MM-DD');
        const [sinConciliar, enTransitoDoctrans] = await Promise.all([
          conciliacionBancariaApi.obtenerTransaccionesSinConciliarSimple(sucursalActiva, data.numeroCta, fechaStr),
          conciliacionBancariaApi.obtenerEnTransito(sucursalActiva, parseInt(id))
        ]);
        datos = [...sinConciliar, ...enTransitoDoctrans];
        datos = datos.filter((item, index, self) =>
          index === self.findIndex(t => t.transacId === item.transacId)
        );
        setEnTransito(datos);
        setTransitoCargado(true);
      }
      if (datos.length === 0) {
        message.warning('No hay transacciones en tránsito para exportar');
        return;
      }
      const companyName = await getCompanyName(sucursalActiva);
      const columnHeaders = ['Fecha', 'Documento', 'Entidad', 'Total', 'Déb/Créd'];
      const dataRows = datos.map(d => [
        d.fecha ? formatDate(d.fecha) : '',
        `${d.tipoDoc}-${d.numDoc}`,
        d.entidad || '',
        d.monto,
        d.debCred === 'D' ? 'Débito' : 'Crédito',
      ]);
      exportToExcel({
        companyName,
        extraHeaderRows: [[`Transacciones en Tránsito - Conciliación ${id}`]],
        columnHeaders,
        dataRows,
        sheetName: 'Tránsito',
        fileName: `transito-${id}.xlsx`,
        columnWidths: [{ wch: 12 }, { wch: 18 }, { wch: 30 }, { wch: 15 }, { wch: 10 }],
      });
      message.success('Tránsito exportado correctamente');
    } catch {
      message.error('Error al exportar tránsito');
    } finally {
      setExportandoTransito(false);
    }
  };

  // ===== Loading state =====
  if (loading || (!data && !loadingError)) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando conciliación...</div>
      </div>
    );
  }

  if (loadingError && !data) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Alert
          message="Error al cargar la conciliación"
          type="error"
          showIcon
          action={<Button size="small" onClick={cargarData}>Reintentar</Button>}
        />
      </div>
    );
  }

  if (!data) return null;

  const isLarge = screens.xxl === true;
  const diferencia = data.diferencia ?? (data.balBancos - data.balLibros);

  // ===== Columnas de movimientos bancarios =====
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
      width: 130,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      key: 'concepto',
      ellipsis: true,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Total',
      dataIndex: 'monto',
      key: 'monto',
      width: 130,
      align: 'right' as const,
      render: (val: number) => <Text strong>{formatNumber(val)}</Text>,
    },
    {
      title: 'Déb/Créd',
      dataIndex: 'debCred',
      key: 'debCred',
      width: 100,
      render: (val: string) => (
        <Tag color={val === 'D' ? '#f50' : '#87d068'}>
          {val === 'D' ? 'Débito' : 'Crédito'}
        </Tag>
      ),
    },
    {
      title: 'Cotejado',
      dataIndex: 'cotejado',
      key: 'cotejado',
      width: 100,
      render: (cotejado: boolean, record: MovimientoBancarioDTO) => {
        if (!cotejado) {
          return <CloseCircleFilled style={{ color: '#d9d9d9', fontSize: 16 }} />;
        }
        // Tooltip con info del documento conciliado
        const docConciliado = record.tipoDocConciliado && record.numDocConciliado
          ? `${record.tipoDocConciliado}-${record.numDocConciliado}`
          : record.documento || '';
        const entidad = record.entidadConciliada || record.entidad || '';
        const tooltipContent = docConciliado
          ? entidad ? `Conciliado con: ${docConciliado} (${entidad})` : `Conciliado con: ${docConciliado}`
          : 'Conciliado';
        return (
          <Tooltip title={tooltipContent}>
            <CheckCircleFilled style={{ color: '#34c38f', fontSize: 16, cursor: 'pointer' }} />
          </Tooltip>
        );
      },
    },
  ];

  // ===== Columnas de transacciones conciliadas =====
  const transaccionColumns = [
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
      render: (val: string) => <Text>{toTitleCase(val || '-')}</Text>,
    },
    {
      title: 'Total',
      dataIndex: 'monto',
      key: 'monto',
      width: 130,
      align: 'right' as const,
      render: (val: number) => <Text strong>{formatNumber(val)}</Text>,
    },
    {
      title: 'Déb/Créd',
      dataIndex: 'debCred',
      key: 'debCred',
      width: 100,
      render: (val: string) => (
        <Tag color={val === 'D' ? '#f50' : '#87d068'}>
          {val === 'D' ? 'Débito' : 'Crédito'}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      {/* Alert de error */}
      {loadingError && (
        <Alert
          message="Error al cargar la conciliación"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={cargarData}>Reintentar</Button>}
        />
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/FConcil')}>
          Volver
        </Button>
        <div style={{ flex: 1 }} />
        <Space>
          <PermissionGate accion="EDITAR">
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/FConcil/${data.concilID}/editar`)}
              disabled={data.aplicada}
            >
              Editar
            </Button>
          </PermissionGate>
          <PermissionGate accion="IMPRIMIR">
            <Button
              icon={<PrinterOutlined />}
              onClick={handleImprimir}
              loading={imprimiendo}
            >
              Imprimir
            </Button>
          </PermissionGate>
          <PermissionGate accion="APLICAR">
            <Button
              icon={<CheckCircleOutlined />}
              onClick={handleAplicar}
              loading={saving}
              disabled={data.aplicada}
              style={data.aplicada ? undefined : { background: '#389e0d', borderColor: '#389e0d', color: '#fff' }}
            >
              Aplicar
            </Button>
          </PermissionGate>
        </Space>
      </div>

      {/* Layout responsive */}
      {isLarge ? (
        <Row gutter={16}>
          <Col xxl={18}>
            {/* Card Datos Generales */}
            <Card
              className="paces-card"
              size="small"
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
                  <Tag color={data.aplicada ? 'success' : 'warning'}>
                    {data.aplicada ? 'Aplicada' : 'Pendiente'}
                  </Tag>
                </div>
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered size="small" column={3} styles={{ content: { background: 'transparent' } }}>
                <Descriptions.Item label="N° Conciliación">{data.concilID}</Descriptions.Item>
                <Descriptions.Item label="Cuenta Bancaria">{data.numeroCta || '-'}</Descriptions.Item>
                <Descriptions.Item label="Fecha">{formatDate(data.fecha)}</Descriptions.Item>
                <Descriptions.Item label="Fecha Período Anterior">{data.fechaAnt ? formatDate(data.fechaAnt) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Balance Bancos">{formatCurrency(data.balBancos)}</Descriptions.Item>
                <Descriptions.Item label="Balance Libros">{formatCurrency(data.balLibros)}</Descriptions.Item>
                <Descriptions.Item label="Diferencia">
                  <Text strong className={diferencia !== 0 ? 'paces-text-error' : ''}>
                    {formatCurrency(diferencia)}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Archivo">{data.archivo || '-'}</Descriptions.Item>
                <Descriptions.Item label="Estado">
                  <Tag color={data.aplicada ? 'success' : 'warning'}>
                    {data.aplicada ? 'Aplicada' : 'Pendiente'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Notas" span={3}>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{data.notas || '-'}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Tabs */}
            <Tabs
              defaultActiveKey="resumen"
              type="card"
              onChange={(key) => {
                if (key === 'resumen') {
                  cargarResumenGeneral();
                } else if (key === 'movimientos' || key === 'sinconciliar') {
                  if (!movimientosCargados) cargarMovimientosDetalle();
                } else if (key === 'transacciones') {
                  if (!transaccionesCargadas) cargarTransaccionesDetalle();
                } else if (key === 'transito') {
                  cargarEnTransito();
                }
              }}
              items={[
              {
                key: 'resumen',
                label: 'Resumen General',
                children: resumenGeneralEnVivo ? (
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
                          {data.fechaAnt ? `${formatDate(data.fechaAnt)} → ${formatDate(data.fecha)}` : '-'}
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
              {
              key: 'movimientos',
              label: `Movimientos Bancarios (${movimientosDetalle.length})`,
              children: (
              <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 12 }}>
                <Input.Search
                  placeholder="Buscar en movimientos..."
                  allowClear
                  onSearch={(v) => setSearchMov(v)}
                  onChange={(e) => { if (!e.target.value) setSearchMov(''); }}
                  style={{ width: 300 }}
                  prefix={<SearchOutlined className="paces-text-icon" />}
                />
                <div style={{ flex: 1 }} />
                <Button
                  icon={<FileExcelOutlined />}
                  onClick={handleExportarMovimientos}
                  loading={exportandoMovimientos}
                />
              </div>
                <Table
                      dataSource={(() => {
                        const items = movimientosDetalle;
                      if (!searchMov) return items;
                      const q = searchMov.toLowerCase();
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
                      locale={{ emptyText: 'No hay movimientos bancarios importados' }}
                      summary={() => {
                        const items = searchMov ? movimientosDetalle.filter((m) =>
                          (m.concepto && m.concepto.toLowerCase().includes(searchMov.toLowerCase())) ||
                          (m.numRef && m.numRef.toLowerCase().includes(searchMov.toLowerCase())) ||
                          (m.documento && m.documento.toLowerCase().includes(searchMov.toLowerCase()))
                        ) : movimientosDetalle;
const total = items.reduce((sum, m) => sum + (m.debCred === 'C' ? m.monto : -m.monto), 0);
                        return (
                          <Table.Summary fixed="bottom">
                            <Table.Summary.Row style={{ fontWeight: 600, backgroundColor: '#fafafa' }}>
                              <Table.Summary.Cell index={0} colSpan={3}>
                                <Text strong style={{ paddingLeft: 8 }}>Total</Text>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={3} align="right">
                                <Text strong style={{ color: 'var(--paces-primary)' }}>{formatNumber(total)}</Text>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={4} />
                              <Table.Summary.Cell index={5} />
                            </Table.Summary.Row>
                          </Table.Summary>
                        );
                      }}
                      />
                        </>
                        ),
                              },
                      {
                      key: 'sinconciliar',
              label: `Importados sin conciliar (${movimientosDetalle.filter((m) => !m.cotejado).length})`,
              children: (
                <>
                  <Input.Search
                    placeholder="Buscar en sin conciliar..."
                    allowClear
                    onSearch={(v) => setSearchSinConcil(v)}
                    onChange={(e) => { if (!e.target.value) setSearchSinConcil(''); }}
                    style={{ width: 300, marginBottom: 12 }}
                    prefix={<SearchOutlined className="paces-text-icon" />}
                  />
                  <Table
                    dataSource={(() => {
                      const items = movimientosDetalle.filter((m) => !m.cotejado);
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
                    summary={() => {
                      const items = searchSinConcil ? movimientosDetalle.filter((m) => !m.cotejado && (
                        (m.concepto && m.concepto.toLowerCase().includes(searchSinConcil.toLowerCase())) ||
                        (m.numRef && m.numRef.toLowerCase().includes(searchSinConcil.toLowerCase())) ||
                        (m.documento && m.documento.toLowerCase().includes(searchSinConcil.toLowerCase())) ||
                        (m.entidad && m.entidad.toLowerCase().includes(searchSinConcil.toLowerCase()))
                      )) : movimientosDetalle.filter((m) => !m.cotejado);
                      const total = items.reduce((sum, m) => sum + (m.monto || 0), 0);
                      return (
                        <Table.Summary fixed="bottom">
                          <Table.Summary.Row style={{ fontWeight: 600, backgroundColor: '#fafafa' }}>
                            <Table.Summary.Cell index={0} colSpan={3}>
                              <Text strong style={{ paddingLeft: 8 }}>Total</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">
                              <Text strong style={{ color: 'var(--paces-primary)' }}>{formatNumber(total)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={4} />
                            <Table.Summary.Cell index={5} />
                          </Table.Summary.Row>
                        </Table.Summary>
                      );
                    }}
                  />
                </>
              ),
            },
            {
              key: 'transacciones',
              label: `Transacciones Conciliadas (${transaccionesDetalle.length})`,
              children: (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 12 }}>
                    <Input.Search
                      placeholder="Buscar en documentos..."
                      allowClear
                      onSearch={(v) => setSearchTrans(v)}
                      onChange={(e) => { if (!e.target.value) setSearchTrans(''); }}
                      style={{ width: 300 }}
                      prefix={<SearchOutlined className="paces-text-icon" />}
                    />
                    <div style={{ flex: 1 }} />
                    <Button
                      icon={<FileExcelOutlined />}
                      onClick={handleExportarConciliadas}
                      loading={exportandoConciliadas}
                    />
                  </div>
                  <Table
                    dataSource={(() => {
                      const items = transaccionesDetalle;
                      if (!searchTrans) return items;
                      const q = searchTrans.toLowerCase();
                      return items.filter((t) =>
                        (t.tipoDoc && t.tipoDoc.toLowerCase().includes(q)) ||
                        (t.numDoc && t.numDoc.toLowerCase().includes(q)) ||
                        (t.entidad && t.entidad.toLowerCase().includes(q))
                      );
                    })()}
                    columns={transaccionColumns}
                    rowKey="transacId"
                    size="small"
                    pagination={{ pageSize: 10, showTotal: (t) => `${t} registros`, size: 'small' }}
                    scroll={{ x: 700 }}
                    locale={{ emptyText: 'No hay transacciones conciliadas' }}
                    summary={() => {
                      const items = searchTrans ? transaccionesDetalle.filter((t) =>
                        (t.tipoDoc && t.tipoDoc.toLowerCase().includes(searchTrans.toLowerCase())) ||
                        (t.numDoc && t.numDoc.toLowerCase().includes(searchTrans.toLowerCase())) ||
                        (t.entidad && t.entidad.toLowerCase().includes(searchTrans.toLowerCase()))
                      ) : transaccionesDetalle;
                      const total = items.reduce((sum, t) => sum + (t.monto || 0), 0);
                      return (
                        <Table.Summary fixed="bottom">
                          <Table.Summary.Row style={{ fontWeight: 600, backgroundColor: '#fafafa' }}>
                            <Table.Summary.Cell index={0} colSpan={3}>
                              <Text strong style={{ paddingLeft: 8 }}>Total</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">
                              <Text strong style={{ color: 'var(--paces-primary)' }}>{formatNumber(total)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={4} />
                          </Table.Summary.Row>
                        </Table.Summary>
                      );
                    }}
                  />
                </>
              ),
            },
            {
              key: 'transito',
              label: (
                <>
                  Transacciones en Tránsito ({enTransito.length})
                  {loadingTransito && <Spin size="small" style={{ marginLeft: 8 }} />}
                </>
              ),
              children: (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 12 }}>
                    <Input.Search
                      placeholder="Buscar en tránsito..."
                      allowClear
                      onSearch={(v) => setSearchTransito(v)}
                      onChange={(e) => { if (!e.target.value) setSearchTransito(''); }}
                      style={{ width: 300 }}
                      prefix={<SearchOutlined className="paces-text-icon" />}
                    />
                    <div style={{ flex: 1 }} />
                    <Button
                      icon={<FileExcelOutlined />}
                      onClick={handleExportarTransitoTab}
                      loading={exportandoTransito}
                    />
                  </div>
                  <Table
                    dataSource={(() => {
                      const items = enTransito;
                      if (!searchTransito) return items;
                      const q = searchTransito.toLowerCase();
                      return items.filter((t) =>
                        (t.tipoDoc && t.tipoDoc.toLowerCase().includes(q)) ||
                        (t.numDoc && t.numDoc.toLowerCase().includes(q)) ||
                        (t.entidad && t.entidad.toLowerCase().includes(q))
                      );
                    })()}
                    columns={transaccionColumns}
                    rowKey="transacId"
                    size="small"
                    loading={loadingTransito}
                    pagination={{ pageSize: 50, showSizeChanger: true }}
                    scroll={{ x: 700 }}
                    locale={{ emptyText: 'No hay documentos en tránsito' }}
                    summary={() => {
                      const items = searchTransito ? enTransito.filter((t) =>
                        (t.tipoDoc && t.tipoDoc.toLowerCase().includes(searchTransito.toLowerCase())) ||
                        (t.numDoc && t.numDoc.toLowerCase().includes(searchTransito.toLowerCase())) ||
                        (t.entidad && t.entidad.toLowerCase().includes(searchTransito.toLowerCase()))
                      ) : enTransito;
                      const total = items.reduce((sum, t) => sum + (t.monto || 0), 0);
                      return (
                        <Table.Summary fixed="bottom">
                          <Table.Summary.Row style={{ fontWeight: 600, backgroundColor: '#fafafa' }}>
                            <Table.Summary.Cell index={0} colSpan={3}>
                              <Text strong style={{ paddingLeft: 8 }}>Total</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">
                              <Text strong style={{ color: 'var(--paces-primary)' }}>{formatNumber(total)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={4} />
                          </Table.Summary.Row>
                        </Table.Summary>
                      );
                    }}
                  />
                </>
              ),
            },
          ]}
        />
      </Col>
      <Col xxl={6}>
            {/* Sidebar con totales */}
            <Card className="paces-card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span className="paces-text-secondary">Balance Bancos</span>
                  <span>{formatCurrency(data.balBancos)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span className="paces-text-secondary">Balance Libros</span>
                  <span>{formatCurrency(data.balLibros)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 16, fontWeight: 700 }}>
                  <span>Diferencia</span>
                  <span style={{ color: diferencia !== 0 ? '#ff4d4f' : 'var(--paces-primary)' }}>
                    {formatCurrency(diferencia)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Resumen de movimientos */}
            <Card
              className="paces-card"
              title={<span style={{ fontSize: 14, fontWeight: 600 }}>Resumen</span>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">Total movimientos</span>
                  <span>{movimientosDetalle.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">Cotejados</span>
                  <span>{movimientosDetalle.filter((m) => m.cotejado).length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">Documentos conciliados</span>
                  <span>{transaccionesDetalle.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">En tránsito</span>
                  <span>{enTransito.length}</span>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      ) : (
        /* Mobile / compacto */
        <div>
          <Card
            className="paces-card"
            size="small"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
                <Tag color={data.aplicada ? 'success' : 'warning'}>
                  {data.aplicada ? 'Aplicada' : 'Pendiente'}
                </Tag>
              </div>
            }
            style={{ marginBottom: 16 }}
          >
            <Descriptions bordered size="small" column={1} styles={{ content: { background: 'transparent' } }}>
              <Descriptions.Item label="N° Conciliación">{data.concilID}</Descriptions.Item>
              <Descriptions.Item label="Cuenta Bancaria">{data.numeroCta || '-'}</Descriptions.Item>
              <Descriptions.Item label="Fecha">{formatDate(data.fecha)}</Descriptions.Item>
              <Descriptions.Item label="Fecha Período Anterior">{data.fechaAnt ? formatDate(data.fechaAnt) : '-'}</Descriptions.Item>
              <Descriptions.Item label="Balance Bancos">{formatCurrency(data.balBancos)}</Descriptions.Item>
              <Descriptions.Item label="Balance Libros">{formatCurrency(data.balLibros)}</Descriptions.Item>
              <Descriptions.Item label="Diferencia">
                <Text strong className={diferencia !== 0 ? 'paces-text-error' : ''}>
                  {formatCurrency(diferencia)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Archivo">{data.archivo || '-'}</Descriptions.Item>
              <Descriptions.Item label="Notas" span={1}>
                <span style={{ whiteSpace: 'pre-wrap' }}>{data.notas || '-'}</span>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Tabs
            defaultActiveKey="resumen"
            type="card"
            onChange={(key) => {
              if (key === 'resumen') {
                cargarResumenGeneral();
              } else if (key === 'movimientos' || key === 'sinconciliar') {
                if (!movimientosCargados) cargarMovimientosDetalle();
              } else if (key === 'transacciones') {
                if (!transaccionesCargadas) cargarTransaccionesDetalle();
              } else if (key === 'transito') {
                cargarEnTransito();
              }
            }}
            items={[
            {
              key: 'resumen',
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
                         {data.fechaAnt ? `${formatDate(data.fechaAnt)} → ${formatDate(data.fecha)}` : '-'}
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
            {
            key: 'movimientos',
            label: `Movimientos Bancarios (${movimientosDetalle.length})`,
            children: (
            <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 12 }}>
              <Input.Search
                placeholder="Buscar en movimientos..."
                allowClear
                onSearch={(v) => setSearchMov(v)}
                onChange={(e) => { if (!e.target.value) setSearchMov(''); }}
                style={{ width: 300 }}
                prefix={<SearchOutlined className="paces-text-icon" />}
              />
              <div style={{ flex: 1 }} />
              <Button
                icon={<FileExcelOutlined />}
                onClick={handleExportarMovimientos}
                loading={exportandoMovimientos}
              />
            </div>
                <Table
                    dataSource={(() => {
                      const items = movimientosDetalle;
                    if (!searchMov) return items;
                    const q = searchMov.toLowerCase();
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
                locale={{ emptyText: 'No hay movimientos bancarios importados' }}
                  summary={() => {
                      const items = searchMov ? movimientosDetalle.filter((m) =>
                          (m.concepto && m.concepto.toLowerCase().includes(searchMov.toLowerCase())) ||
                          (m.numRef && m.numRef.toLowerCase().includes(searchMov.toLowerCase())) ||
                        (m.documento && m.documento.toLowerCase().includes(searchMov.toLowerCase()))
                      ) : movimientosDetalle;
                      const total = items.reduce((sum, m) => sum + (m.monto || 0), 0);
                      return (
                        <Table.Summary fixed="bottom">
                          <Table.Summary.Row style={{ fontWeight: 600, backgroundColor: '#fafafa' }}>
                            <Table.Summary.Cell index={0} colSpan={3}>
                              <Text strong style={{ paddingLeft: 8 }}>Total</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">
                              <Text strong style={{ color: 'var(--paces-primary)' }}>{formatNumber(total)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={4} />
                            <Table.Summary.Cell index={5} />
                          </Table.Summary.Row>
                        </Table.Summary>
                      );
                    }}
                  />
                </>
              ),
              },
            {
              key: 'sinconciliar',
              label: `Importados sin conciliar (${movimientosDetalle.filter((m) => !m.cotejado).length})`,
              children: (
                <>
                  <Input.Search
                    placeholder="Buscar en sin conciliar..."
                    allowClear
                    onSearch={(v) => setSearchSinConcil(v)}
                    onChange={(e) => { if (!e.target.value) setSearchSinConcil(''); }}
                    style={{ width: 300, marginBottom: 12 }}
                    prefix={<SearchOutlined className="paces-text-icon" />}
                  />
                  <Table
                    dataSource={(() => {
                      const items = movimientosDetalle.filter((m) => !m.cotejado);
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
                    summary={() => {
                      const items = searchSinConcil ? movimientosDetalle.filter((m) => !m.cotejado && (
                        (m.concepto && m.concepto.toLowerCase().includes(searchSinConcil.toLowerCase())) ||
                        (m.numRef && m.numRef.toLowerCase().includes(searchSinConcil.toLowerCase())) ||
                        (m.documento && m.documento.toLowerCase().includes(searchSinConcil.toLowerCase())) ||
                        (m.entidad && m.entidad.toLowerCase().includes(searchSinConcil.toLowerCase()))
                      )) : movimientosDetalle.filter((m) => !m.cotejado);
                      const total = items.reduce((sum, m) => sum + (m.monto || 0), 0);
                      return (
                        <Table.Summary fixed="bottom">
                          <Table.Summary.Row style={{ fontWeight: 600, backgroundColor: '#fafafa' }}>
                            <Table.Summary.Cell index={0} colSpan={3}>
                              <Text strong style={{ paddingLeft: 8 }}>Total</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">
                              <Text strong style={{ color: 'var(--paces-primary)' }}>{formatNumber(total)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={4} />
                            <Table.Summary.Cell index={5} />
                          </Table.Summary.Row>
                        </Table.Summary>
                      );
                    }}
                  />
                </>
              ),
            },
            {
              key: 'transacciones',
              label: `Transacciones Conciliadas (${transaccionesDetalle.length})`,
              children: (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 12 }}>
                    <Input.Search
                      placeholder="Buscar en documentos..."
                      allowClear
                      onSearch={(v) => setSearchTrans(v)}
                      onChange={(e) => { if (!e.target.value) setSearchTrans(''); }}
                      style={{ width: 300 }}
                      prefix={<SearchOutlined className="paces-text-icon" />}
                    />
                    <div style={{ flex: 1 }} />
                    <Button
                      icon={<FileExcelOutlined />}
                      onClick={handleExportarConciliadas}
                      loading={exportandoConciliadas}
                    />
                  </div>
                  <Table
                    dataSource={(() => {
                      const items = transaccionesDetalle;
                      if (!searchTrans) return items;
                      const q = searchTrans.toLowerCase();
                      return items.filter((t) =>
                        (t.tipoDoc && t.tipoDoc.toLowerCase().includes(q)) ||
                        (t.numDoc && t.numDoc.toLowerCase().includes(q)) ||
                        (t.entidad && t.entidad.toLowerCase().includes(q))
                      );
                    })()}
                    columns={transaccionColumns}
                    rowKey="transacId"
                    size="small"
                    pagination={{ pageSize: 10, showTotal: (t) => `${t} registros`, size: 'small' }}
                    scroll={{ x: 700 }}
                    locale={{ emptyText: 'No hay transacciones conciliadas' }}
                    summary={() => {
                      const items = searchTrans ? transaccionesDetalle.filter((t) =>
                        (t.tipoDoc && t.tipoDoc.toLowerCase().includes(searchTrans.toLowerCase())) ||
                        (t.numDoc && t.numDoc.toLowerCase().includes(searchTrans.toLowerCase())) ||
                        (t.entidad && t.entidad.toLowerCase().includes(searchTrans.toLowerCase()))
                      ) : transaccionesDetalle;
                      const total = items.reduce((sum, t) => sum + (t.monto || 0), 0);
                      return (
                        <Table.Summary fixed="bottom">
                          <Table.Summary.Row style={{ fontWeight: 600, backgroundColor: '#fafafa' }}>
                            <Table.Summary.Cell index={0} colSpan={3}>
                              <Text strong style={{ paddingLeft: 8 }}>Total</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">
                              <Text strong style={{ color: 'var(--paces-primary)' }}>{formatNumber(total)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={4} />
                          </Table.Summary.Row>
                        </Table.Summary>
                      );
                    }}
                  />
                </>
              ),
            },
            {
              key: 'transito',
              label: (
                <>
                  Transacciones en Tránsito ({enTransito.length})
                  {loadingTransito && <Spin size="small" style={{ marginLeft: 8 }} />}
                </>
              ),
              children: (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 12 }}>
                    <Input.Search
                      placeholder="Buscar en tránsito..."
                      allowClear
                      onSearch={(v) => setSearchTransito(v)}
                      onChange={(e) => { if (!e.target.value) setSearchTransito(''); }}
                      style={{ width: 300 }}
                      prefix={<SearchOutlined className="paces-text-icon" />}
                    />
                    <div style={{ flex: 1 }} />
                    <Button
                      icon={<FileExcelOutlined />}
                      onClick={handleExportarTransitoTab}
                      loading={exportandoTransito}
                    />
                  </div>
                  <Table
                    dataSource={(() => {
                      const items = enTransito;
                      if (!searchTransito) return items;
                      const q = searchTransito.toLowerCase();
                      return items.filter((t) =>
                        (t.tipoDoc && t.tipoDoc.toLowerCase().includes(q)) ||
                        (t.numDoc && t.numDoc.toLowerCase().includes(q)) ||
                        (t.entidad && t.entidad.toLowerCase().includes(q))
                      );
                    })()}
                    columns={transaccionColumns}
                    rowKey="transacId"
                    size="small"
                    loading={loadingTransito}
                    pagination={{ pageSize: 50, showSizeChanger: true }}
                    scroll={{ x: 700 }}
                    locale={{ emptyText: 'No hay documentos en tránsito' }}
                    summary={() => {
                      const items = searchTransito ? enTransito.filter((t) =>
                        (t.tipoDoc && t.tipoDoc.toLowerCase().includes(searchTransito.toLowerCase())) ||
                        (t.numDoc && t.numDoc.toLowerCase().includes(searchTransito.toLowerCase())) ||
                        (t.entidad && t.entidad.toLowerCase().includes(searchTransito.toLowerCase()))
                      ) : enTransito;
                      const total = items.reduce((sum, t) => sum + (t.monto || 0), 0);
                      return (
                        <Table.Summary fixed="bottom">
                          <Table.Summary.Row style={{ fontWeight: 600, backgroundColor: '#fafafa' }}>
                            <Table.Summary.Cell index={0} colSpan={3}>
                              <Text strong style={{ paddingLeft: 8 }}>Total</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">
                              <Text strong style={{ color: 'var(--paces-primary)' }}>{formatNumber(total)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={4} />
                          </Table.Summary.Row>
                        </Table.Summary>
                      );
                    }}
                  />
                </>
              ),
            },
          ]}
        />

          {/* Totales en compacto */}
          <div style={{ marginTop: 24 }}>
            <Card className="paces-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span className="paces-text-secondary">Balance Bancos</span>
                  <span>{formatCurrency(data.balBancos)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span className="paces-text-secondary">Balance Libros</span>
                  <span>{formatCurrency(data.balLibros)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 16, fontWeight: 700 }}>
                  <span>Diferencia</span>
                  <span style={{ color: diferencia !== 0 ? '#ff4d4f' : 'var(--paces-primary)' }}>
                    {formatCurrency(diferencia)}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="paces-card" style={{ marginTop: 16 }} title={<span style={{ fontSize: 14, fontWeight: 600 }}>Resumen</span>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">Total movimientos</span>
                  <span>{movimientosDetalle.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">Cotejados</span>
                  <span>{movimientosDetalle.filter((m) => m.cotejado).length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">Documentos conciliados</span>
                  <span>{transaccionesDetalle.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">En tránsito</span>
                  <span>{enTransito.length}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConciliacionBancariaDetalle;
