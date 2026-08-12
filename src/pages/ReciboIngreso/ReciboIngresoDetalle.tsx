import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Input, Tooltip, Alert, App, Typography, Dropdown
} from 'antd';
import type { MenuProps } from 'antd';
import {
  LockFilled,
  IdcardOutlined, PhoneOutlined, EnvironmentOutlined,
  FileTextOutlined, FileSearchOutlined, WarningFilled,
  PrinterOutlined,
} from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import PermissionGate from '../../components/PermissionGate';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { apiClient } from '../../api/client';
import { reciboIngresoApi } from '../../api/reciboIngresoApi';
import { transaccionApi } from '../../api/transaccionApi';
import { obtenerNombreEnumSucursal } from '../../utils/sucursalEnumMapper';
import SucursalField from '../../components/SucursalField';
import LogTable from '../../components/LogTable';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import ModalAnular from '../../components/ModalAnular/ModalAnular';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import ModalVisorScanner from '../../components/ModalVisorScanner/ModalVisorScanner';
import ModalSeleccionarImpresoraPOS from '../../components/ModalSeleccionarImpresoraPOS/ModalSeleccionarImpresoraPOS';
import { documentoRelacionApi, type DocumentoRelacionDTO } from '../../api/documentoRelacionApi';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import { formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import ErrorDetalle from '../../components/ErrorDetalle';
import { useQZTray } from '../../hooks/useQZTray';
import { formatTicketReciboIngreso, escposQRCode, feed, CMD_CUT } from '../../utils/escpos-formatter';
import { obtenerConfigPlantilla, CODIGO_PLANTILLA_FRI_TICKET } from '../../utils/ticketPlantilla';
import { obtenerLogoEscPosBase64 } from '../../utils/logoEscPos';

// ===== Helpers para tipo de asiento =====
function esDebito(tipo: any): boolean { return tipo === 'D' || tipo === 0; }
function esCredito(tipo: any): boolean { return tipo === 'C' || tipo === 1; }

const { Text } = Typography;

const ReciboIngresoDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode, documentCode } = useScreenConfig();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [printerModalOpen, setPrinterModalOpen] = useState(false);
  const [printerList, setPrinterList] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [detalleSearch, setDetalleSearch] = useState('');
  const [tieneScan, setTieneScan] = useState<boolean | null>(null);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [scannerUrl, setScannerUrl] = useState<string | null>(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [documentosRelacionados, setDocumentosRelacionados] = React.useState<DocumentoRelacionDTO[]>([]);
  const [modalAnularOpen, setModalAnularOpen] = useState(false);
  const [modalDesaplicarOpen, setModalDesaplicarOpen] = useState(false);
  const [pagosAsociados, setPagosAsociados] = useState<any[]>([]);
  const monedaDefault = getMonedaSucursalActiva();
  const screens = Grid.useBreakpoint();

  const { message } = App.useApp();
  const qz = useQZTray();

  const operacion = useAplicar();
  const [operacionTitulo, setOperacionTitulo] = useState('');
  const [sucursalDestino, setSucursalDestino] = useState<number | undefined>(undefined);

  useEffect(() => {
    setActiveModule(screenCode);
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  const handleRefresh = useCallback(() => {
    if (!id) return;
    setLoadingError(false);
    reciboIngresoApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        // Calcular balance de asientos contables
        const totalDeb = (res?.asientos || []).reduce((s: number, r: any) =>
          s + ((r.tipoAsiento === 0 || r.tipoAsiento === 'D') ? (r.monto || 0) : 0), 0);
        const totalCred = (res?.asientos || []).reduce((s: number, r: any) =>
          s + ((r.tipoAsiento === 1 || r.tipoAsiento === 'C') ? (r.monto || 0) : 0), 0);
        operacion.setBalanceInfo({ debitos: totalDeb, creditos: totalCred });
        setPageTitleOverride(`${(res as any).documento.codigo}-${(res as any).noDocumento}`);
        // Verificar si tiene factura escaneada
        reciboIngresoApi.verificarScan(sucursalActiva, parseInt(id))
          .then((scanRes) => setTieneScan(scanRes.existe))
          .catch(() => setTieneScan(false));
        // Cargar pagos asociados
        transaccionApi.obtenerAsociadasInventario(sucursalActiva, parseInt(id))
          .then((transacciones) => setPagosAsociados(transacciones || []))
          .catch(() => setPagosAsociados([]));
        // Cargar documentos relacionados desde DOCUMENTOS_RELACION
        documentoRelacionApi.obtenerPorTransaccion(parseInt(id), sucursalActiva)
          .then(rel => setDocumentosRelacionados(rel || []))
          .catch(() => setDocumentosRelacionados([]));
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        message.error(msg);
        setLoadingError(true);
      })
  }, [id, sucursalActiva, setPageTitleOverride]);

  useEffect(() => {
    if (!id) return;
    setLoadingError(false);
    setLoading(true);
    reciboIngresoApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`${(res as any).documento.codigo}-${(res as any).noDocumento}`);
        // Verificar si tiene factura escaneada
        reciboIngresoApi.verificarScan(sucursalActiva, parseInt(id))
          .then((scanRes) => setTieneScan(scanRes.existe))
          .catch(() => setTieneScan(false));
        // Cargar pagos asociados
        transaccionApi.obtenerAsociadasInventario(sucursalActiva, parseInt(id))
          .then((transacciones) => setPagosAsociados(transacciones || []))
          .catch(() => setPagosAsociados([]));
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  // Cargar documentos relacionados desde DOCUMENTOS_RELACION
  React.useEffect(() => {
    if (!data?.id) return;
    documentoRelacionApi.obtenerPorTransaccion(data.id, sucursalActiva)
      .then(rel => setDocumentosRelacionados(rel || []))
      .catch(() => {
        setDocumentosRelacionados([]);
        message.warning('No se pudieron cargar los documentos relacionados');
      });
  }, [data?.id, sucursalActiva]);

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando documento...</div>
      </div>
    );
  }

  if (loadingError && !data) { return <ErrorDetalle rutaVolver="/FRCI" onRecargar={handleRefresh} />; }

  if (!data) {
    return null;
  }

  const isLarge = screens.xxl === true;
  const estadoInfo = ESTADO_DOCUMENTO_MAP[toEstadoNum(data.estado)] || { label: 'Desconocido', color: 'default' };
  const esCerrado = toPeriodoNum(data.periodo) === 6;

  // ===== Documentos filtrados por búsqueda =====
  const documentosFiltrados = detalleSearch
    ? (data?.transaccionesAsociadas || []).filter((d: any) => {
        const q = detalleSearch.toLowerCase();
        return (
          (d.documento || '').toLowerCase().includes(q) ||
          (d.nCF || '').toLowerCase().includes(q)
        );
      })
    : (data?.transaccionesAsociadas || []);

  // ===== Mapa de rutas para documentos relacionados =====
  const MAPA_RUTAS_DOC: Record<string, string> = {
    ND: '/FND',
    FAC: '/FFAC',
    NC: '/FNC',
    RI: '/FRI',
    NDD: '/FNDD',
    NDN: '/FNDN',
    NCN: '/FNCN',
  };
  const getRutaDocumento = (record: any): string | null => {
    const tipoDoc = record?.tipoDocumento;
    if (!tipoDoc) return null;
    const codigo = typeof tipoDoc === 'number'
      ? (['AID','AIC','ABN','AJA','CBI','CDC','CHK','CHN','CIE','CIT','CKO','CPF','CTT','DBA','DBI','DCA','DCN','DEC','DEP','DEV','DGA','DPN','DPR','DVC','DVN','ED','EDI','EDN','EIN','ENP','EPJ','EPN','ER','EXP','FAC','FAN','LAC','NBN','NC','NCB','NCN','ND','NDB','NDD','NDN','NDV','NOM','ORC','ORT','PAG','PRES','PV','PVC','PVN','PVS','PVT','RAC','RBN','RCM','RDE','RDN','REA','REQ','RES','RETA','RI','RIN','RSV','RTB','RUA','SAP','SCO','SDD','SPA','SPJ','SPN','SPT','TBN','TID','TRB','TRP','TUR','UBD','VD','DBN','PVComponente','Existencia'][tipoDoc] || '')
      : tipoDoc;
    const rutaBase = MAPA_RUTAS_DOC[codigo];
    if (!rutaBase) return null;
    const docId = record.id || record.transaccionAsociadaID;
    if (!docId) return null;
    return `${rutaBase}/${docId}`;
  };

  const asociadasColumns = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110, render: (v: string) => v ? formatDate(v) : '-' },
    {
      title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140,
      render: (doc: string, record: any) => {
        const ruta = getRutaDocumento(record);
        if (ruta) {
          return <Link to={ruta} style={{ color: '#6c5ffc', fontWeight: 500 }}>{doc}</Link>;
        }
        return <span>{doc}</span>;
      },
    },
    { title: 'NCF', dataIndex: 'nCF', key: 'nCF', width: 140, render: (v: string) => v || '-' },
    { title: 'Monto Original', dataIndex: 'montoOriginal', key: 'montoOriginal', width: 130, align: 'right' as const, render: (v: number) => formatNumber(v) },
    { title: 'Pagado', dataIndex: 'pagado', key: 'pagado', width: 120, align: 'right' as const, render: (v: number) => formatNumber(v) },
    { title: 'Saldo', dataIndex: 'saldoPendiente', key: 'saldoPendiente', width: 120, align: 'right' as const, render: (v: number) => <strong>{formatNumber(v)}</strong> },
    { title: 'Monto', dataIndex: 'monto', key: 'monto', width: 120, align: 'right' as const, render: (v: number) => <strong>{formatNumber(v)}</strong> },
  ];

  // asientoColumns reemplazado por AsientosContableTable compartido

  // ===== Handlers de acciones de estado =====
  const handleDesaplicarConfirm = async (_motivo: string) => {
    if (!id || !data) return;
    setSaving(true);
    try {
      const origen = obtenerNombreEnumSucursal(data.codigoSucursal || String(sucursalActiva));
      const documento = `${data.documento.codigo}-${data.noDocumento}`;
      await reciboIngresoApi.desaplicar(sucursalActiva, documento);
      message.success('Documento desaplicado exitosamente');
      setModalDesaplicarOpen(false);
      handleRefresh();
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al desaplicar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAplicar = () => {
    if (!id) return;

    // Validar FechaPermitida del documento
    if (data?.documento?.fechaPermitida === 'MenorIgualFechaDia') {
      const hoy = new Date();
      const fechaDoc = new Date(data.fechaDocumento);
      if (fechaDoc > hoy) {
        message.error('La fecha del documento no puede ser mayor a la fecha del día.');
        return;
      }
    }

    setOperacionTitulo(`Aplicando FRI-${data?.noDocumento || id}`);
    operacion.ejecutar(
      `/Transaccion/${sucursalActiva}/aplicar/${id}`,
      handleRefresh
    );
  };

  const handleAnularConfirm = async (dataAnular: { fecha: string; motivo: string }) => {
    if (!data) return;
    setSaving(true);
    try {
      const dto = {
        ...data,
        fechaDocumento: dataAnular.fecha,
        nota: `${data.nota || ''} Documento anulado por: ${dataAnular.motivo}.`,
      };
      await reciboIngresoApi.anular(sucursalActiva, dto);
      message.success('Documento anulado exitosamente');
      setModalAnularOpen(false);
      const res = await reciboIngresoApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al anular');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePostear = () => {
    if (!data) return;
    if (data.concepto?.noAsientos) {
      message.info('El concepto no genera asientos contables.');
      return;
    }
    if (toEstadoNum(data.estado) !== 1 && toEstadoNum(data.estado) !== 3) {
      message.info('Debe aplicar el documento antes de postear.');
      return;
    }
    setOperacionTitulo(`Posteando RI-${data?.noDocumento || id}`);
    operacion.ejecutar(
      `/Transaccion/${sucursalActiva}/postear`,
      handleRefresh,
      data
    );
  };

  const handleRevisado = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await reciboIngresoApi.revisado(sucursalActiva, parseInt(id));
      message.success('Documento marcado como revisado');
      const res = await reciboIngresoApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al marcar revisado');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReversar = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await reciboIngresoApi.reversar(sucursalActiva, parseInt(id));
      message.success('Documento reversado exitosamente');
      const res = await reciboIngresoApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al reversar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleVerScanner = async () => {
    if (!id) return;
    setScannerLoading(true);
    try {
      const blob = await reciboIngresoApi.descargarScan(sucursalActiva, parseInt(id));
      const url = URL.createObjectURL(blob);
      setScannerUrl(url);
      setScannerModalOpen(true);
    } catch (err: any) {
      message.error('Error al cargar el archivo escaneado');
    } finally {
      setScannerLoading(false);
    }
  };

  const printMenuItems: MenuProps['items'] = [
    { key: 'ticket', label: 'Ticket' },
    { key: 'carta', label: 'Factura Carta' },
  ];

  const handlePrintMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'ticket') {
      handlePrintTicket();
    } else if (key === 'carta') {
      handlePrintCarta();
    }
  };

  const handlePrintTicket = async () => {
    if (!id || !data) return;
    setImprimiendo(true);
    try {
      const sucursales = useAuthStore.getState().sucursalesPermitidas;
      const sucursalNombre = sucursales.find((sp) => sp.sucursal === sucursalActiva)?.nombre || '';

      // Obtener config de plantilla (si falla o no existe, usar formato predeterminado)
      let config = null;
      try {
        config = await obtenerConfigPlantilla(CODIGO_PLANTILLA_FRI_TICKET);
      } catch {
        config = null;
      }

      // Generar ticket ESC/POS (texto con formato)
      let ticketText = formatTicketReciboIngreso(data, {
        nombre: sucursalNombre,
        direccion: data.sucursal?.direccion || '',
        telefono: data.sucursal?.telefono || '',
        rnc: data.sucursal?.rnc || '',
        fax: data.sucursal?.fax || '',
        slogan: data.sucursal?.slogan || '',
      }, config || undefined);

      // QR se genera desde la plantilla configurable (CAMPO:CODIGO_QR)
      // const qrData = data.envioDGII?.codigoQR;
      // if (qrData) {
      //   ticketText += escposQRCode(qrData);
      // }

      // Avance y corte DESPUÉS del QR
      ticketText += feed(config?.opciones?.feedCorte ?? 4);
      ticketText += CMD_CUT;

      // Logo configurable: generar comando GS v 0 (base64) si la plantilla lo activa.
      let logoBase64 = '';
      if (config?.logo?.mostrar) {
        logoBase64 = await obtenerLogoEscPosBase64(config.logo);
      }

      // Enviar a QZ Tray como texto raw ESC/POS
      await qz.print(ticketText, logoBase64 || undefined);
      message.success(`Imprimiendo en: ${qz.printerName || 'Impresora POS'}`);
    } catch (err: any) {
      if (err.code === 'NO_PRINTER_SELECTED') {
        // Mostrar selector de impresora
        try {
          const list = await qz.fetchPrinters();
          if (list.length === 0) {
            await imprimirPDF();
          } else {
            setPrinterList(list);
            setSelectedPrinter(list[0] || '');
            setPrinterModalOpen(true);
          }
        } catch {
          await imprimirPDF();
        }
      } else {
        message.error('QZ Tray: ' + (err.message || 'Error'));
        await imprimirPDF();
      }
    } finally {
      setImprimiendo(false);
    }
  };

  const imprimirPDF = async () => {
    const res = await apiClient.post(`/reportes/contabilidad/reciboIngreso/ticket`, data, {
      responseType: 'blob',
    });
    const blobUrl = URL.createObjectURL(res.data);
    window.open(blobUrl, '_blank');
  };

  const handlePrintCarta = async () => {
    if (!id || !data) return;
    setImprimiendo(true);
    try {
      const res = await apiClient.post(`/reportes/contabilidad/reciboIngreso`, data, {
        responseType: 'blob',
      });
      const blobUrl = URL.createObjectURL(res.data);
      window.open(blobUrl, '_blank');
    } catch (err: any) {
      const msg = err?.response?.data?.ErrorMessage || 'Error al generar el PDF';
      message.error(msg);
    } finally {
      setImprimiendo(false);
    }
  };

  const tienePagos = pagosAsociados.length > 0;

  // RI8 - Verificar si los asientos están cuadrados
  const asientosNoCuadrados = (data?.asientos?.length || 0) > 0 ? (() => {
    const totalDeb = (data?.asientos || []).reduce((s: number, r: any) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
    const totalCred = (data?.asientos || []).reduce((s: number, r: any) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);
    return Math.abs(totalDeb - totalCred) > 0.01;
  })() : false;

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

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle de recibo de ingreso"
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
      <DetalleToolbar
        modulo="FRI"
        showImprimir={false}
        estado={data.estado}
        periodo={data.periodo}
        revisado={data.revisado}
        saving={saving}
        imprimiendo={imprimiendo}
        operacionLoading={operacion?.loading}
        onVolver={() => navigate(-1)}
        onEditar={() => navigate(`/FRI/${id}/editar`)}
        onAplicar={handleAplicar}
        onAnular={tienePagos ? undefined : async () => setModalAnularOpen(true)}
        onPostear={data.concepto?.noAsientos ? undefined : handlePostear}
        onRevisado={handleRevisado}
        onDesaplicar={tienePagos ? undefined : async () => setModalDesaplicarOpen(true)}
        onReversar={handleReversar}
        extraButtons={
          <>
            <PermissionGate codigoPantalla={screenCode} accion="IMPRIMIR">
              <Dropdown menu={{ items: printMenuItems, onClick: handlePrintMenuClick }} trigger={['click']}>
                <Button icon={<PrinterOutlined />} loading={imprimiendo} />
              </Dropdown>
              {qz.printerName && (
                <Tag color="success" style={{ marginLeft: 2, fontSize: 11, lineHeight: '18px' }}>
                  QZ: {qz.printerName}
                </Tag>
              )}
            </PermissionGate>
          </>
        }
      />

      {isLarge ? (
        /* === DESKTOP LAYOUT (≥ lg) === */
        <Row gutter={16}>
          <Col xxl={18}>
            <Card className="paces-card" size="small" title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
                <Space>
                  {esCerrado && (
                    <Tooltip title="Período contable cerrado">
                      <LockFilled style={{ fontSize: 14, color: '#595959' }} />
                    </Tooltip>
                  )}
                  <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
                  {tieneScan === true && (
                    <Tooltip title="Ver factura escaneada">
                      <Tag
                        icon={<FileTextOutlined />}
                        color="success"
                        style={{ cursor: 'pointer' }}
                        onClick={handleVerScanner}
                      />
                    </Tooltip>
                  )}
                  {tieneScan === false && <Tag icon={<FileSearchOutlined />} color="warning" />}
                </Space>
              </div>
            } style={{ marginBottom: 16 }}>
              <Descriptions bordered size="small" column={2} styles={{ content: { background: 'transparent' } }}>
                <Descriptions.Item label="Tipo">
                  {data.tipo ? `${data.tipo.codigo} - ${toTitleCase(data.tipo.nombre)}` : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Concepto">{data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : (data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-')}<ConceptoInfoLabel concepto={data.concepto} /></Descriptions.Item>
                <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
                <Descriptions.Item label="Sucursal">
                  <SucursalField codigoSucursal={data.codigoSucursal} sucursal={data.sucursal} />
                </Descriptions.Item>
              </Descriptions>
              {(data.nota) && (
                <div style={{ marginTop: 12, padding: '0 16px 16px' }}>
                  <Text strong style={{ fontSize: 13, color: '#595959' }}>Nota:</Text>
                  <div style={{ whiteSpace: 'pre-wrap', marginTop: 4, fontSize: 13 }}>{data.nota}</div>
                </div>
              )}
            </Card>

            <Tabs
              defaultActiveKey="documentos"
              type="card"
              tabBarExtraContent={
                <Input.Search
                  placeholder="Buscar documento..."
                  allowClear
                  style={{ width: 320 }}
                  onSearch={(value) => setDetalleSearch(value)}
                  onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                />
              }
              items={[
                {
                  key: 'documentos',
                  label: `Documentos (${documentosFiltrados.length}${detalleSearch ? `/${data.transaccionesAsociadas?.length || 0}` : ''})`,
                  children: (
                    <Table dataSource={documentosFiltrados} columns={asociadasColumns} rowKey={(r: any) => r.transaccionAsociadaID || r.id} size="small" pagination={false} scroll={{ x: 900 }} />
                  ),
                },
                {
                  key: 'asientos',
                  label: `Asientos (${data.asientos?.length || 0})`,
                  children: (
                    <>
                      {asientosNoCuadrados && (
                        <Alert
                          message="Los asientos contables no están cuadrados. Los débitos deben ser igual a los créditos."
                          type="warning"
                          showIcon
                          icon={<WarningFilled />}
                          style={{ marginBottom: 16 }}
                        />
                      )}
                      <AsientosContableEditables
                        asientos={data?.asientos || []}
                        onChange={(nuevos) => setData((prev: any) => prev ? { ...prev, asientos: nuevos } : prev)}
                        editable={false}
                        scroll={{ x: 900 }}
                      />
                    </>
                  ),
                },
                {
                  key: 'historial',
                  label: `Historial (${data.logs?.length || 0})`,
                  children: (
                    <LogTable dataSource={data.logs || []} scroll={{ x: 900 }} />
                  ),
                },
              ]}
            />
          </Col>

          <Col xxl={6}>
            <EntidadCard entidad={data.entidad} fallbackTitulo="Entidad" />
            <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} retenciones={data.retenciones} total={data.total} alignRight={false}
              monedaSimbolo={data.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={data.moneda?.nombre || monedaDefault.nombre}
              tasa={data.tasa ?? 1}
            />
            <DocumentosRelacionadosCard
              documentos={documentosRelacionados}
              currentId={data?.id}
            />
          </Col>
        </Row>
      ) : (
        /* === MOBILE LAYOUT (< lg) === */
        <div>
          <Card className="paces-card" size="small" title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
              <Space>
                {esCerrado && (
                  <Tooltip title="Período contable cerrado">
                    <LockFilled style={{ fontSize: 14, color: '#595959' }} />
                  </Tooltip>
                )}
                <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
                {tieneScan === true && (
                  <Tooltip title="Ver factura escaneada">
                    <Tag
                      icon={<FileTextOutlined />}
                      color="success"
                      style={{ cursor: 'pointer' }}
                      onClick={handleVerScanner}
                    />
                  </Tooltip>
                )}
                {tieneScan === false && <Tag icon={<FileSearchOutlined />} color="warning" />}
              </Space>
            </div>
          } style={{ marginBottom: 16 }}>
            <Descriptions bordered size="small" column={1} styles={{ content: { background: 'transparent' } }}>
            <Descriptions.Item label="Tipo">
               {data.tipo ? `${data.tipo.codigo} - ${toTitleCase(data.tipo.nombre)}` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Concepto">{data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : (data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-')}<ConceptoInfoLabel concepto={data.concepto} /></Descriptions.Item>
            <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
            <Descriptions.Item label="Sucursal">
                  <SucursalField codigoSucursal={data.codigoSucursal} sucursal={data.sucursal} />
                </Descriptions.Item>
            </Descriptions>
            {(data.nota) && (
            <div style={{ marginTop: 12, padding: '0 16px 16px' }}>
                <Text strong style={{ fontSize: 13, color: '#595959' }}>Nota:</Text>
                 <div style={{ whiteSpace: 'pre-wrap', marginTop: 4, fontSize: 13 }}>{data.nota}</div>
               </div>
             )}
           </Card>

           <Tabs
            defaultActiveKey="documentos"
            type="card"
            tabBarExtraContent={
              <Input.Search
                placeholder="Buscar documento..."
                allowClear
                style={{ width: 320 }}
                onSearch={(value) => setDetalleSearch(value)}
                onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
              />
            }
            items={[
              {
                key: 'documentos',
                label: `Documentos (${documentosFiltrados.length}${detalleSearch ? `/${data.transaccionesAsociadas?.length || 0}` : ''})`,
                children: (
                  <Table dataSource={documentosFiltrados} columns={asociadasColumns} rowKey={(r: any) => r.transaccionAsociadaID || r.id} size="small" pagination={false} scroll={{ x: 900 }} />
                ),
              },
              {
                key: 'asientos',
                label: `Asientos (${data.asientos?.length || 0})`,
                  children: (
                    <>
                      {asientosNoCuadrados && (
                        <Alert
                          message="Los asientos contables no están cuadrados. Los débitos deben ser igual a los créditos."
                          type="warning"
                          showIcon
                          icon={<WarningFilled />}
                          style={{ marginBottom: 16 }}
                        />
                      )}
                      <AsientosContableEditables
                        asientos={data?.asientos || []}
                        onChange={(nuevos) => setData((prev: any) => prev ? { ...prev, asientos: nuevos } : prev)}
                        editable={false}
                        scroll={{ x: 900 }}
                      />
                    </>
                  ),
              },
              {
                key: 'historial',
                label: `Historial (${data.logs?.length || 0})`,
                children: (
                  <LogTable dataSource={data.logs || []} scroll={{ x: 900 }} />
                ),
              },
            ]}
          />

          <div style={{ marginTop: 24 }}>
            <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} retenciones={data.retenciones} total={data.total} alignRight={true}
              monedaSimbolo={data.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={data.moneda?.nombre || monedaDefault.nombre}
              tasa={data.tasa ?? 1}
            />

          <DocumentosRelacionadosCard
            documentos={documentosRelacionados}
            currentId={data?.id}
          />
          </div>
        </div>
      )}

      <ModalVisorScanner
        open={scannerModalOpen}
        titulo="Factura Escaneada"
        url={scannerUrl}
        loading={scannerLoading}
        onClose={() => { setScannerModalOpen(false); setScannerUrl(null); }}
      />

      {/* Modal de Anular */}
      <ModalAnular
        open={modalAnularOpen}
        onClose={() => setModalAnularOpen(false)}
        onConfirm={handleAnularConfirm}
        documento={`${data.documento.codigo}-${data.noDocumento}`}
        fechaDocumento={data.fechaDocumento}
        periodoCerrado={toPeriodoNum(data.periodo) === 6}
      />

      {/* Modal de Desaplicar */}
      <ModalDesaplicar
        open={modalDesaplicarOpen}
        onClose={() => setModalDesaplicarOpen(false)}
        onConfirm={handleDesaplicarConfirm}
        tituloDocumento={`${data.documento.codigo}-${data.noDocumento}`}
      />

      {/* Modal de Progreso para Aplicar/Postear */}
      <ModalProgreso
        open={operacion.loading || !!operacion.completado}
        titulo={operacionTitulo}
        eventos={operacion.eventos}
        completado={operacion.completado}
        balanceInfo={operacion.balanceInfo}
        onClose={() => operacion.reset()}
      />

      {/* Modal selector de impresora POS */}
      <ModalSeleccionarImpresoraPOS
        open={printerModalOpen}
        impresoras={printerList}
        seleccionada={selectedPrinter}
        onSelect={setSelectedPrinter}
        onConfirm={async () => {
          if (!selectedPrinter) return;
          qz.selectPrinter(selectedPrinter);
          setPrinterModalOpen(false);
          // Reintentar impresión
          handlePrintTicket();
        }}
        onClose={() => { setPrinterModalOpen(false); }}
      />
    </div>
  );
};

export default ReciboIngresoDetalle;
