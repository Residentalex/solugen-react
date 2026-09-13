import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Grid, Input, message, Modal, Tooltip, Typography, QRCode, Badge, Dropdown
} from 'antd';
import type { MenuProps } from 'antd';
import {
  ArrowLeftOutlined,
  PrinterOutlined,
  EditOutlined,
  LockFilled,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CreditCardOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { apiClient } from '../../api/client';
import { companiaApi } from '../../api/companiaApi';
import { documentoImpresionApi } from '../../api/documentoImpresionApi';
import { facturaPOSApi } from '../../api/facturaPOSApi';
import { devolucionVentaApi } from '../../api/devolucionVentaApi';
import { transaccionApi } from '../../api/transaccionApi';
import { productoApi } from '../../api/productoApi';

import type { FacturaPOSDTO } from '../../types/facturaPOS';
import type { VisanetVoucherDTO } from '../../types/visanet';
import PermissionGate from '../../components/PermissionGate';
import LogTable from '../../components/LogTable';
import ModalSeleccionarImpresoraPOS from '../../components/ModalSeleccionarImpresoraPOS/ModalSeleccionarImpresoraPOS';
import { formatNumber, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { resolveEstado, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import { useQZTray } from '../../hooks/useQZTray';
import { useCargaDocumento } from '../../hooks/useCargaDocumento';
import { reportesConfigApi } from '../../api/reportesConfigApi';
import { obtenerLogoEscPosBase64 } from '../../utils/logoEscPos';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import CobrosMinimal from '../../components/CobrosCard/CobrosMinimal';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import ErrorDetalle from '../../components/ErrorDetalle';
import DetalleToolbar from '../../components/DetalleToolbar';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import SucursalField from '../../components/SucursalField';
import { documentoRelacionApi, type DocumentoRelacionDTO } from '../../api/documentoRelacionApi';

const { Text } = Typography;
const { TextArea } = Input;

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(val: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(val: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const date = d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} ${time}`;
}

/** Enriquecer detalles con la oferta actual del producto en la sucursal activa */
async function enriquecerDetallesConOferta(detalles: any[], sucursal: number): Promise<any[]> {
  if (!detalles?.length) return detalles;
  const codigosUnicos = Array.from(new Set(detalles.map((d) => d.codigo).filter(Boolean))) as string[];
  if (codigosUnicos.length === 0) return detalles;
  const mapaPrecios = await productoApi.preciosPorSucursal(sucursal, codigosUnicos);
  return detalles.map((d) => {
    const precio = mapaPrecios.get(d.codigo);
    return {
      ...d,
      precioOferta: precio?.precioOferta ?? 0,
      precioRegularOferta: precio?.precio ?? 0,
    };
  });
}

const FacturaPOSDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode, documentCode } = useScreenConfig();

  const [saving, setSaving] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [previsualizando, setPrevisualizando] = useState(false);
  const [vistaPreviaUrl, setVistaPreviaUrl] = useState<string | null>(null);
  const vistaPreviaUrlRef = useRef<string | null>(null);
  const [printerModalOpen, setPrinterModalOpen] = useState(false);
  const [printerList, setPrinterList] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [detalleSearch, setDetalleSearch] = useState('');
  const [devolucionesPV, setDevolucionesPV] = useState<any[]>([]);
  const [dtransasocDevueltos, setDtransasocDevueltos] = useState<Set<number>>(new Set());
  const [documentosRelacionados, setDocumentosRelacionados] = useState<DocumentoRelacionDTO[]>([]);
  const [modalAnularOpen, setModalAnularOpen] = useState(false);
  const [razonAnulacion, setRazonAnulacion] = useState('');
  const [anulando, setAnulando] = useState(false);
  const monedaDefault = getMonedaSucursalActiva();
  const screens = Grid.useBreakpoint();
  const qz = useQZTray();

  useEffect(() => {
    setActiveModule(screenCode);
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  // ═══ Carga estandar: encabezado primero + todas las secciones en paralelo ═══
  const { data, setData, loading, loadingError, seccionesCargando, recargar: recargarDocumento, reintentarSeccion } = useCargaDocumento<FacturaPOSDTO>({
    id,
    sucursal: sucursalActiva,
    obtenerEncabezado: facturaPOSApi.obtenerEncabezado,
    secciones: {
      detalles: {
        cargar: async (suc, docId) => {
          const detalles = await facturaPOSApi.obtenerDetalles(suc, docId);
          return enriquecerDetallesConOferta(detalles, suc);
        },
        prop: 'detalles',
      },
      cobros: { cargar: facturaPOSApi.obtenerCobros, prop: 'cobros' },
      impuestos: { cargar: facturaPOSApi.obtenerImpuestos, prop: 'impuestosFactura' },
      relacionados: { cargar: facturaPOSApi.obtenerRelacionadosPV, prop: 'transaccionesAsociadas' },
      vouchers: { cargar: facturaPOSApi.obtenerVouchers, prop: 'vouchers' },
    },
    onEncabezadoCargado: (res) => {
      setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
    },
  });

  const handleRefresh = React.useCallback(() => {
    recargarDocumento();
  }, [recargarDocumento]);

  useEffect(() => () => {
    if (vistaPreviaUrlRef.current) {
      URL.revokeObjectURL(vistaPreviaUrlRef.current);
    }
  }, []);

  // Cargar devoluciones vinculadas via DTRANSIDASOC cuando cambie el documento
  useEffect(() => {
    if (!data?.id) return;
    transaccionApi.obtenerDevolucionesPorPV(sucursalActiva, data.id)
      .then((devs) => {
        setDevolucionesPV(devs);
        if (devs.length > 0) {
          Promise.all(
            devs.map((d: any) =>
              devolucionVentaApi.obtenerPorId(sucursalActiva, d.id)
                .then((dev: any) => (dev.detalles || []).map((det: any) => Number(det.idAsociado)))
                .catch(() => [] as number[])
            )
          ).then((results) => {
            const set = new Set<number>();
            for (const ids of results) ids.forEach((id: number) => set.add(id));
            setDtransasocDevueltos(set);
          });
        }
      })
      .catch((err: any) => console.error('Error cargando devoluciones PV:', err));
  }, [data?.id, sucursalActiva]);

  useEffect(() => {
    if (!data?.id) return;
    documentoRelacionApi.obtenerPorTransaccion(data.id, sucursalActiva)
      .then(rel => setDocumentosRelacionados(rel || []))
      .catch((err) => console.warn('Error al cargar documentos relacionados', err));
  }, [data?.id, sucursalActiva]);

  const handleGenerarPVC = React.useCallback(async () => {
    if (!id || !data) return;
    Modal.confirm({
      title: 'Generar PVC',
      content: `¿Generar PVC para ${data.documento?.codigo}-${data.noDocumento}?`,
      okText: 'Generar',
      cancelText: 'Cancelar',
      onOk: async () => {
        setSaving(true);
        try {
          await facturaPOSApi.generarPVC(sucursalActiva, parseInt(id));
          message.success('PVC creado exitosamente');
          handleRefresh();
        } catch (err: any) {
          const msg = err?.response?.data?.errorMessage || 'Error al generar PVC';
          message.error(msg);
        } finally {
          setSaving(false);
        }
      },
    });
  }, [id, data, sucursalActiva, handleRefresh]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando documento...</div>
      </div>
    );
  }

  if (loadingError && !data) {
    return <ErrorDetalle rutaVolver="/FPV" onRecargar={handleRefresh} />;
  }

  if (!data) {
    return null;
  }

  const isLarge = screens.xxl === true;

  const estadoInfo = resolveEstado(data.estado);
  const esCerrado = toPeriodoNum(data.periodo) === 6;

  const totalPagado = (data.cobros || []).reduce((sum: number, c: any) => sum + (Number(c.pago) || 0), 0);
  const saldoPendiente = (data.total || 0) - totalPagado;

  // ═══ Filtrado y totales de detalles ═══
  const detallesFiltrados = detalleSearch
    ? (data.detalles || []).filter((d: any) => {
        const q = detalleSearch.toLowerCase();
        return (
          (d.codigo || '').toLowerCase().includes(q) ||
          (d.articulo || '').toLowerCase().includes(q) ||
          (d.referencia || '').toLowerCase().includes(q)
        );
      })
    : (data.detalles || []);

  const totalesDetalles = detallesFiltrados.reduce(
    (acc, item: any) => ({
      cantidad: acc.cantidad + (item.cantidad || 0),
      subTotal: acc.subTotal + (item.subTotal || 0),
      descuento: acc.descuento + (item.descuento || 0),
      impuestos: acc.impuestos + (item.impuestos || 0),
      total: acc.total + (item.total || 0),
    }),
    { cantidad: 0, subTotal: 0, descuento: 0, impuestos: 0, total: 0 }
  );

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
            <Tooltip title={record.referencia}>
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                {record.referencia}
              </div>
            </Tooltip>
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
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => {
        const devuelto = dtransasocDevueltos.has(record.id);
        return (
          <div>
            <div>
              {devuelto ? (
                <span style={{ textDecoration: 'line-through', color: '#ff4d4f' }}>
                  {formatNumber(record.cantidad || 0)}
                </span>
              ) : (
                <span>{formatNumber(record.cantidad || 0)}</span>
              )}
            </div>
            {record.medida?.nombre && (
              <Tooltip title={record.medida.nombre}>
                <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {record.medida.nombre}
                </div>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: 'Precio',
      dataIndex: 'precio',
      key: 'precio',
      width: 130,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: any) => {
        const pctDesc = Number(record.porcentajeDescuento) || 0;
        const factor = Number(record.medida?.factor) || 1;
        const precioBase = Number(record.precio) || 0;
        const precioConDescuento = precioBase - ((precioBase * pctDesc) / 100);
        const precioUnitario = precioConDescuento / factor;
        return (
          <div>
            <div>{formatNumber(precioBase)}</div>
            <div style={{ fontSize: 11, lineHeight: 1.5, color: '#999' }}>
              {formatNumber(precioUnitario)} × {factor}
              {record.precioOferta > 0 && record.precioOferta < (record.precioRegularOferta ?? record.precio) && (
                <Tag color="red" style={{ marginLeft: 4 }}>Oferta</Tag>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Descuento',
      key: 'descuento',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: any) => (
        <div>
          <div>{formatNumber(record.porcentajeDescuento || 0)}%</div>
          <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 2 }}>
            {formatNumber(record.descuento || 0)}
          </div>
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
      render: (_: any, record: any) => (
        <div>
          <div>{formatNumber(record.subTotal || 0)}</div>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
    {
      title: 'Impuestos',
      key: 'impuestos',
      width: 140,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: any) => (
        <div>
          <div>{formatNumber(record.impuestos || 0)}</div>
          {record.impuesto?.nombre && (
            <Tooltip title={record.impuesto.nombre}>
              <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {toTitleCase(record.impuesto.nombre)}
              </div>
            </Tooltip>
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
      onCell: () => ({ style: { verticalAlign: 'top', paddingRight: 16 } }),
      onHeaderCell: () => ({ style: { paddingRight: 16 } }),
      render: (_: any, record: any) => (
        <div>
          <Text strong>{formatNumber(record.total || 0)}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
  ];


  // ===== Handlers de acciones de estado =====
  const handleAplicar = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await facturaPOSApi.aplicar(sucursalActiva, parseInt(id));
      message.success('Documento aplicado exitosamente');
      const res = await facturaPOSApi.obtenerPorId(sucursalActiva, parseInt(id));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al aplicar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAnular = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await facturaPOSApi.anular(sucursalActiva, data as any);
      message.success('Documento anulado exitosamente');
      const res = await facturaPOSApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al anular');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePostear = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await facturaPOSApi.postear(sucursalActiva, data as any);
      message.success('Documento posteado exitosamente');
      const res = await facturaPOSApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al postear');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAnularPV = async () => {
    if (!razonAnulacion.trim()) {
      message.error('Debe ingresar una razón para la anulación');
      return;
    }
    setAnulando(true);
    try {
      // Cargar la factura completa para obtener todos los detalles
      const facturaFull = await devolucionVentaApi.obtenerFacturaPOS(sucursalActiva, data!.id);
      if (!facturaFull?.detalles || facturaFull.detalles.length === 0) {
        message.error('La factura no tiene detalles para anular');
        return;
      }
      // Mapear todos los detalles con cantidad completa (devolver todo)
      const detalles = facturaFull.detalles
        .filter((d: any) => d.id > 0)
        .map((d: any) => ({
          idAsociado: d.id,
          cantidad: d.cantidad || 0,
          precio: d.precio || 0,
          porcentajeDescuento: d.porcentajeDescuento || 0,
          porcentajeImpuesto: d.porcentajeImpuesto || 0,
        }));
      const result = await devolucionVentaApi.crearDesdePV(sucursalActiva, data!.id, {
        detalles,
        nota: razonAnulacion.trim(),
      });
      message.success('Devolución por anulación creada exitosamente');
      setModalAnularOpen(false);
      setRazonAnulacion('');
      navigate(`/FDEV/${result.id}`);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al crear la devolución por anulación');
      message.error(msg);
    } finally {
      setAnulando(false);
    }
  };

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

  const printMenuItems: MenuProps['items'] = [
    { key: 'ticket', label: 'Ticket' },
    {
      key: 'vista-previa-termica',
      label: previsualizando ? 'Generando vista previa...' : 'Vista previa termica',
      disabled: previsualizando,
    },
    { key: 'factura-cliente', label: 'Factura Cliente' },
  ];

  const handlePrintMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'ticket') {
      handlePrintTicket();
    } else if (key === 'vista-previa-termica') {
      handlePrevisualizarTicket();
    } else if (key === 'factura-cliente') {
      handlePrintFacturaCliente();
    }
  };

  const prepararPayloadTicket = async () => {
    // Plantilla ESC/POS asignada al documento PV via /reportes/config.
    const plantilla = await reportesConfigApi.obtenerPorEntdoc('PV');
    if (!plantilla) {
      throw new Error('No hay plantilla ESC/POS asignada al documento PV.');
    }

    // El logo se rasteriza en el navegador (canvas) y viaja como comando ESC/POS en base64;
    // el servicio lo antepone a los bytes generados por el formateador.
    const logoEscPosBase64 = await obtenerLogoEscPosBase64(plantilla.config?.logo);

    // Datos de la compañía para el encabezado de la plantilla.
    const sucDoc = data?.sucursal;
    let companyInfo = {
      nombre: sucDoc?.nombre || '',
      direccion: sucDoc?.direccion || '',
      telefono: sucDoc?.telefono || '',
      rnc: sucDoc?.rnc || '',
      fax: sucDoc?.fax || '',
      slogan: sucDoc?.slogan || '',
    };
    if (!companyInfo.nombre && !companyInfo.rnc) {
      try {
        const lista = await companiaApi.obtenerTodas(sucursalActiva);
        if (lista.length > 0) {
          companyInfo = {
            nombre: lista[0].nombre ?? '',
            direccion: lista[0].direccion ?? '',
            telefono: lista[0].telefono ?? '',
            rnc: lista[0].rnc ?? '',
            fax: lista[0].fax ?? '',
            slogan: lista[0].slogan ?? '',
          };
        }
      } catch {
        const sucursales = useAuthStore.getState().sucursalesPermitidas;
        companyInfo.nombre = sucursales.find((sp) => sp.sucursal === sucursalActiva)?.nombre || '';
      }
    }

    // Los impuestos ya se cargan automaticamente junto al encabezado.
    const dataPrint = data;

    // Obtener el payload serializado que el frontend enviara directamente
    // al servicio local de la maquina cliente.
    const payload = await reportesConfigApi.obtenerPayloadImpresion(plantilla.plantillaId, {
      tipoDoc: 'TICKET_POS',
      data: dataPrint,
      company: companyInfo,
      logoEscPosBase64: logoEscPosBase64 || undefined,
      feedLines: 3,
      cut: true,
      copias: 1,
    });

    // URL del servicio local de impresion.
    const servicioLocalUrl = import.meta.env.VITE_IMPRESSION_SERVICE_URL || 'http://localhost:5010/imprimir';
    return { payload, servicioLocalUrl };
  };

  const handlePrintTicket = async () => {
    setImprimiendo(true);
    try {
      // Marcar como impreso es best-effort: no bloquea la impresion fisica.
      await documentoImpresionApi.marcarImpreso('PV', sucursalActiva, parseInt(id)).catch(
        (errImprimir: any) => {
          console.warn('No se pudo marcar como impreso:', errImprimir?.response?.data?.errorMessage || errImprimir?.message);
        }
      );

      const { payload, servicioLocalUrl } = await prepararPayloadTicket();
      const resultado = await reportesConfigApi.imprimirLocal(payload, servicioLocalUrl);
      if (resultado.ok) {
        message.success(`Ticket enviado a la impresora`);
      } else {
        message.error(resultado.error ?? 'Error al imprimir: el servicio local no respondio');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.errorMessage ||
        err?.response?.data?.ErrorMessage ||
        err?.message ||
        'Error al imprimir el ticket';
      message.error(msg);
    } finally {
      setImprimiendo(false);
    }
  };

  const cerrarVistaPreviaTicket = () => {
    if (vistaPreviaUrlRef.current) {
      URL.revokeObjectURL(vistaPreviaUrlRef.current);
      vistaPreviaUrlRef.current = null;
    }
    setVistaPreviaUrl(null);
  };

  const handlePrevisualizarTicket = async () => {
    setPrevisualizando(true);
    try {
      const { payload, servicioLocalUrl } = await prepararPayloadTicket();
      const resultado = await reportesConfigApi.previsualizarLocal(payload, servicioLocalUrl);
      if (!resultado.ok || !resultado.imagen) {
        message.error(resultado.error ?? 'No se pudo generar la vista previa del ticket.');
        return;
      }

      cerrarVistaPreviaTicket();
      const urlImagen = URL.createObjectURL(resultado.imagen);
      vistaPreviaUrlRef.current = urlImagen;
      setVistaPreviaUrl(urlImagen);
    } catch (err: any) {
      const msg =
        err?.response?.data?.errorMessage ||
        err?.response?.data?.ErrorMessage ||
        err?.message ||
        'Error al generar la vista previa del ticket';
      message.error(msg);
    } finally {
      setPrevisualizando(false);
    }
  };

  const imprimirPDF = async () => {
    const res = await apiClient.post(`/reportes/facturacion/pos/${sucursalActiva}`, data, {
      responseType: 'blob',
    });
    const blobUrl = URL.createObjectURL(res.data);
    window.open(blobUrl, '_blank');
  };

  const handlePrintFacturaCliente = async () => {
    setImprimiendo(true);
    try {
      try {
        await documentoImpresionApi.marcarImpreso('PV', sucursalActiva, parseInt(id));
      } catch (errImprimir: any) {
        message.error(errImprimir?.response?.data?.errorMessage || errImprimir?.response?.data?.ErrorMessage || 'Error al marcar el documento como impreso');
        return;
      }
      const res = await apiClient.post(`/reportes/facturacion/pos/factura-cliente`, data, {
        responseType: 'blob',
      });
      const pdfBlob: Blob = res.data;

      // Intentar imprimir directo a la impresora térmica via QZ Tray
      try {
        await qz.printPDF(pdfBlob);
        message.success(`Factura Cliente imprimiendo en: ${qz.printerName || 'Impresora POS'}`);
      } catch (errQZ: any) {
        if (errQZ.code === 'NO_PRINTER_SELECTED') {
          // Mostrar selector de impresora; al seleccionar, reintentar
          try {
            const list = await qz.fetchPrinters();
            if (list.length === 0) {
              // Sin impresoras: abrir PDF en navegador como fallback
              const blobUrl = URL.createObjectURL(pdfBlob);
              window.open(blobUrl, '_blank');
            } else {
              setPrinterList(list);
              setSelectedPrinter(list[0] || '');
              setPrinterModalOpen(true);
              // NOTA: al cerrar el modal con una impresora seleccionada,
              // el usuario debe volver a dar click en Factura Cliente para reintentar.
            }
          } catch {
            const blobUrl = URL.createObjectURL(pdfBlob);
            window.open(blobUrl, '_blank');
          }
        } else {
          // Otro error de QZ (impresora no encontrada, etc.): fallback a navegador
          console.warn('QZ Tray error en Factura Cliente:', errQZ.message);
          const blobUrl = URL.createObjectURL(pdfBlob);
          window.open(blobUrl, '_blank');
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.ErrorMessage || 'Error al generar el PDF';
      message.error(msg);
    } finally {
      setImprimiendo(false);
    }
  };

  return (
    <div>
      <DetalleToolbar
        modulo={screenCode}
        showImprimir={false}
        estado={data.estado}
        periodo={data.periodo}
        saving={saving}
        imprimiendo={imprimiendo}
        onVolver={() => navigate(-1)}
        onEditar={() => navigate(`/FPV/${id}/editar`)}
        onAplicar={handleAplicar}
        onAnular={handleAnular}
        onPostear={handlePostear}
        confirmActions={false}
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
            {data.documento?.codigo === 'PV' && data.estado !== 0 && data.estado !== 3 && saldoPendiente > 0.01 && data.diasCredito > 0 && (
              <Button icon={<CreditCardOutlined />} onClick={handleGenerarPVC}>
                Generar PVC
              </Button>
            )}
            {data.estado !== 0 && data.estado !== 3 && dtransasocDevueltos.size < (data.detalles?.length || 0) && (
              <PermissionGate codigoPantalla="FPV" permisoEspecial="pe_crear_devolucion">
                <Dropdown menu={{
                  items: [
                    { key: 'anular', label: 'Anular', icon: <CloseCircleOutlined /> },
                    { key: 'devolver', label: 'Devolver', icon: <RollbackOutlined /> },
                  ],
                  onClick: ({ key }) => {
                    if (key === 'anular') {
                      setModalAnularOpen(true);
                    } else if (key === 'devolver') {
                      navigate(`/FDEV/nuevo?pvId=${data.id}`);
                    }
                  },
                }} trigger={['click']}>
                  <Button type="primary" icon={<RollbackOutlined />}>
                    Crear Devolución
                  </Button>
                </Dropdown>
              </PermissionGate>
            )}
          </>
        }
      />

      {isLarge ? (
        /* === DESKTOP LAYOUT (≥ lg) === */
        <Row gutter={16}>
          <Col xxl={18}>
            <Card className="paces-card" size="small" title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>
                    Datos Generales
                  </span>
                  <Space>
                    {esCerrado && (
  <Tooltip title="Período contable cerrado">
    <LockFilled style={{ marginLeft: 4, fontSize: 14, color: '#595959' }} />
  </Tooltip>
)}
                    <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
                  </Space>
                </div>
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered size="small" column={3} styles={{ content: { background: 'transparent' } }}>
                <Descriptions.Item label="Fecha">{formatDateTime(data.fechaDocumento)}</Descriptions.Item>
                <Descriptions.Item label="Concepto">{data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : (data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-')}<ConceptoInfoLabel concepto={data.concepto} /></Descriptions.Item>
                <Descriptions.Item label="Tipo">—</Descriptions.Item>
                <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
                <Descriptions.Item label="Sucursal">
                  <SucursalField codigoSucursal={data.codigoSucursal} sucursal={data.sucursal} />
                </Descriptions.Item>
                <Descriptions.Item label="Almacen" span={2}>{data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Cajero">{data.cajero ? toTitleCase(data.cajero) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Punto de Venta">{data.caja || '-'}</Descriptions.Item>
                <Descriptions.Item label="Turno">
                  {data.turno ? (
                    data.turno.includes('(Local)') ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span>{data.turno.replace(' (Local)', '')}</span>
                        <Tag style={{ background: '#d9d9d9', borderColor: '#d9d9d9', color: '#595959', marginRight: 0 }}>Local</Tag>
                      </div>
                    ) : data.turno
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                      <Tag style={{ background: '#d9d9d9', borderColor: '#d9d9d9', color: '#595959', marginRight: 0 }}>Local</Tag>
                    </div>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Nota" span={3}><span style={{ whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</span></Descriptions.Item>
              </Descriptions>
            </Card>

            <Tabs
              defaultActiveKey="detalles"
              type="card"
              onChange={(key) => {
                // Las secciones se cargan automaticamente junto al encabezado
                // (useCargaDocumento); aqui solo reintentos defensivos si faltaran.
                if (key === 'vouchers' && !data?.vouchers) reintentarSeccion('vouchers');
              }}
              tabBarExtraContent={
                <Input.Search
                  placeholder="Buscar detalle..."
                  allowClear
                  style={{ width: 320 }}
                  onSearch={(value) => setDetalleSearch(value)}
                  onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                />
              }
              items={[
                {
                  key: 'detalles',
                  label: `Detalles (${data.detalles?.length || 0})`,
                  children: (
                    <Spin spinning={seccionesCargando.has('detalles')} tip="Cargando detalles...">
                      <div style={{ minHeight: 220 }}>
                        <Table
                          dataSource={detallesFiltrados}
                          columns={detalleColumns}
                          rowKey={(r: any, i?: number) => r.id || i}
                          size="small"
                          pagination={false}
                          scroll={{ x: 1100 }}
                          summary={() => (
                            <Table.Summary fixed="bottom">
                              <Table.Summary.Row style={{ fontWeight: 600, backgroundColor: '#fafafa' }}>
                                <Table.Summary.Cell index={0} colSpan={2}>
                                  <Text strong style={{ paddingLeft: 8 }}>Totales</Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={2} align="right">
                                  {formatNumber(totalesDetalles.cantidad)}
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={3} align="right" responsive={['md', 'lg', 'xl', 'xxl']}>
                                  {formatNumber(totalesDetalles.subTotal)}
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={4} align="right" responsive={['lg', 'xl', 'xxl']}>
                                  {formatNumber(totalesDetalles.descuento)}
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={5} align="right" responsive={['lg', 'xl', 'xxl']}>
                                  {formatNumber(totalesDetalles.impuestos)}
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={6} align="right">
                                  <Text strong style={{ color: 'var(--paces-primary)' }}>{formatNumber(totalesDetalles.total)}</Text>
                                </Table.Summary.Cell>
                              </Table.Summary.Row>
                            </Table.Summary>
                          )}
                        />
                      </div>
                    </Spin>
                  ),
                },
                {
                  key: 'historial',
                  label: `Historial (${data.logs?.length || 0})`,
                  children: (
                    <LogTable dataSource={data.logs || []} scroll={{ x: 900 }} />
                  ),
                },
                {
                  key: 'impuestos',
                  label: `Impuestos (${data.impuestosFactura?.length || 0})`,
                  children: (
                    <Spin spinning={seccionesCargando.has('impuestos')} tip="Cargando impuestos...">
                      <div style={{ minHeight: 120 }}>
                        <Table
                          dataSource={data.impuestosFactura || []}
                          rowKey={(r: any, i?: number) => r.id || r.impuesto?.codigo || i}
                          size="small"
                          pagination={false}
                          scroll={{ x: 500 }}
                          columns={[
                            { title: 'Impuesto', key: 'nombre', render: (_: any, r: any) => toTitleCase(r.impuesto?.nombre || '-') },
                            { title: 'Porcentaje', key: 'porcentaje', width: 110, align: 'right' as const, render: (_: any, r: any) => r.impuesto?.porcentaje != null ? `${r.impuesto.porcentaje}%` : '-' },
                            { title: 'Monto', key: 'monto', width: 130, align: 'right' as const, render: (_: any, r: any) => <Text strong>{formatNumber(r.monto || 0)}</Text> },
                            { title: 'Tipo', key: 'tipo', width: 110, render: (_: any, r: any) => r.tipo || '-' },
                          ]}
                          summary={() => {
                            const totalMonto = (data.impuestosFactura || []).reduce((sum: number, r: any) => sum + (r.monto || 0), 0);
                            return (
                              <Table.Summary fixed="bottom">
                                <Table.Summary.Row style={{ fontWeight: 600, backgroundColor: '#fafafa' }}>
                                  <Table.Summary.Cell index={0} colSpan={2}>
                                    <Text strong style={{ paddingLeft: 8 }}>Total</Text>
                                  </Table.Summary.Cell>
                                  <Table.Summary.Cell index={2} align="right">
                                    <Text strong style={{ color: 'var(--paces-primary)' }}>{formatNumber(totalMonto)}</Text>
                                  </Table.Summary.Cell>
                                  <Table.Summary.Cell index={3} />
                                </Table.Summary.Row>
                              </Table.Summary>
                            );
                          }}
                        />
                      </div>
                    </Spin>
                  ),
                },
                {
                  key: 'vouchers',
                  label: `Vouchers (${data.vouchers?.length || 0})`,
                  children: (
                    <Spin spinning={seccionesCargando.has('vouchers')} tip="Cargando vouchers...">
                      <div style={{ minHeight: 120 }}>
                        <Table
                          dataSource={data.vouchers || []}
                          rowKey={(r: any) => r.noSec || Math.random()}
                          size="small"
                          pagination={false}
                          scroll={{ x: 700 }}
                          columns={[
                            { title: 'No. Secuencia', dataIndex: 'noSec', key: 'noSec', width: 150 },
                            { title: 'No. Aprobación', dataIndex: 'noAprob', key: 'noAprob', width: 130, render: (v: string) => v || '-' },
                            { title: 'Tarjeta', key: 'tarjeta', render: (_: any, r: any) => (
                              <div>
                                <div>{r.notarjeta || '-'}</div>
                                {r.nombtar && <div className="paces-text-secondary" style={{ fontSize: 11 }}>{toTitleCase(r.nombtar)}</div>}
                              </div>
                            )},
                            { title: 'Monto', dataIndex: 'monto', key: 'monto', width: 120, align: 'right' as const,
                              render: (v: number) => <Text strong>{formatNumber(v || 0)}</Text>,
                            },
                            { title: 'Estado', dataIndex: 'anulado', key: 'anulado', width: 100,
                              render: (v: string) => v === 'S' ? <Tag color="red">Anulado</Tag> : <Tag color="green">Activo</Tag>,
                            },
                          ]}
                          summary={() => {
                            const totalMonto = (data.vouchers || []).reduce((sum: number, r: any) => sum + (r.monto || 0), 0);
                            return (
                              <Table.Summary fixed="bottom">
                                <Table.Summary.Row style={{ fontWeight: 600, backgroundColor: '#fafafa' }}>
                                  <Table.Summary.Cell index={0} colSpan={3}>
                                    <Text strong style={{ paddingLeft: 8 }}>Total</Text>
                                  </Table.Summary.Cell>
                                  <Table.Summary.Cell index={3} align="right">
                                    <Text strong style={{ color: 'var(--paces-primary)' }}>{formatNumber(totalMonto)}</Text>
                                  </Table.Summary.Cell>
                                  <Table.Summary.Cell index={4} />
                                </Table.Summary.Row>
                              </Table.Summary>
                            );
                          }}
                        />
                      </div>
                    </Spin>
                  ),
                },
                ...(devolucionesPV.length > 0 ? [{
                  key: 'devoluciones',
                  label: (
                    <span>
                      Devoluciones
                      <Badge count={devolucionesPV.length}
                        style={{ marginLeft: 6, backgroundColor: '#556ee6' }} />
                    </span>
                  ),
                  children: (
                    <Table
                      dataSource={devolucionesPV}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      scroll={{ x: 600 }}
                      columns={[
                        { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110,
                          render: (v: string) => formatDate(v),
                        },
                        { title: 'Documento', key: 'documento', width: 160,
                          render: (_: any, rec: any) => (
                            <a className="paces-doc-link"
                              onClick={() => navigate(`/FDEV/${rec.id}`)}
                              style={{ cursor: 'pointer' }}>
                              {`${rec.documento}-${rec.noDocumento}`}
                              </a>
                            ),
                        },
                        { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 150,
                          render: (v: string) => v || '-',
                        },
                      ]}
                    />
                  ),
                }] : []),
                ...(data.transaccionesAsociadas?.length ? [{
                  key: 'relacionados',
                  label: (
                    <span>
                      Documentos Relacionados
                      <Badge count={data.transaccionesAsociadas!.length}
                        style={{ marginLeft: 6, backgroundColor: '#556ee6' }} />
                    </span>
                  ),
                  children: (
                    <Table
                      dataSource={data.transaccionesAsociadas!}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      scroll={{ x: 600 }}
                      columns={[
                        { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110,
                          render: (v: string) => formatDate(v),
                        },
                        { title: 'Documento', key: 'documento', width: 160,
                          render: (_: any, rec: any) => (
                            <a className="paces-doc-link"
                              onClick={() => navigate(`/FDEV/${rec.transaccionAsociadaID}`)}
                              style={{ cursor: 'pointer' }}>
                              {rec.documento || 'DEV'}
                            </a>
                          ),
                        },
                        { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 150,
                          render: (v: string) => v || '-',
                        },
                        { title: 'Monto', dataIndex: 'monto', key: 'monto', width: 120, align: 'right' as const,
                          render: (v: number) => <Text strong>{formatNumber(v || 0)}</Text>,
                        },
                      ]}
                    />
                  ),
                }] : []),
              ]}
            />
          </Col>

          <Col xxl={6}>
            <EntidadCard entidad={data.cliente} entidadSecundaria={data.entidad} fallbackTitulo="Cliente" />
            <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} total={data.total} alignRight={false}
              monedaSimbolo={data.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={data.moneda?.nombre || monedaDefault.nombre}
              tasa={data.tasa ?? 1}
            />
            <CobrosMinimal cobrosPOS={data.cobros?.[0]} loading={loading} />
            <DocumentosRelacionadosCard
              documentos={documentosRelacionados}
              currentId={data?.id}
            />
            {data?.envioDGII?.codigoQR && (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <QRCode value={data.envioDGII.codigoQR} size={140} />
              </div>
            )}
          </Col>
        </Row>
      ) : (
        /* === MOBILE LAYOUT (< lg) === */
        <div>
          <Card className="paces-card" size="small" title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>
                    Datos Generales
                  </span>
                  <Space>
                    {esCerrado && (
  <Tooltip title="Período contable cerrado">
    <LockFilled style={{ marginLeft: 4, fontSize: 14, color: '#595959' }} />
  </Tooltip>
)}
                    <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
                  </Space>
                </div>
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered size="small" column={1} styles={{ content: { background: 'transparent' } }}>
              <Descriptions.Item label="Fecha">{formatDateTime(data.fechaDocumento)}</Descriptions.Item>
              <Descriptions.Item label="Concepto">{data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : (data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-')}<ConceptoInfoLabel concepto={data.concepto} /></Descriptions.Item>
              <Descriptions.Item label="Tipo">—</Descriptions.Item>
              <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
              <Descriptions.Item label="Sucursal">
                  <SucursalField codigoSucursal={data.codigoSucursal} sucursal={data.sucursal} />
                </Descriptions.Item>
              <Descriptions.Item label="Almacen">{data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Cajero">{data.cajero ? toTitleCase(data.cajero) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Punto de Venta">{data.caja || '-'}</Descriptions.Item>
                <Descriptions.Item label="Turno">
                  {data.turno ? (
                    data.turno.includes('(Local)') ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span>{data.turno.replace(' (Local)', '')}</span>
                        <Tag style={{ background: '#d9d9d9', borderColor: '#d9d9d9', color: '#595959', marginRight: 0 }}>Local</Tag>
                      </div>
                    ) : data.turno
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                      <Tag style={{ background: '#d9d9d9', borderColor: '#d9d9d9', color: '#595959', marginRight: 0 }}>Local</Tag>
                    </div>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Nota"><span style={{ whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</span></Descriptions.Item>
              </Descriptions>
            </Card>

            <EntidadCard entidad={data.cliente} entidadSecundaria={data.entidad} fallbackTitulo="Cliente" />

          <Tabs
            defaultActiveKey="detalles"
            type="card"
            onChange={(key) => {
              // Las secciones se cargan automaticamente junto al encabezado
              // (useCargaDocumento); aqui solo reintentos defensivos si faltaran.
              if (key === 'vouchers' && !data?.vouchers) reintentarSeccion('vouchers');
            }}
            tabBarExtraContent={
              <Input.Search
                placeholder="Buscar detalle..."
                allowClear
                style={{ width: 320 }}
                onSearch={(value) => setDetalleSearch(value)}
                onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
              />
            }
            items={[
              {
                key: 'detalles',
                label: `Detalles (${data.detalles?.length || 0})`,
                children: (
                  <Spin spinning={seccionesCargando.has('detalles')} tip="Cargando detalles...">
                    <div style={{ minHeight: 220 }}>
                      <Table
                        dataSource={detallesFiltrados}
                        columns={detalleColumns}
                        rowKey={(r: any, i?: number) => r.id || i}
                        size="small"
                        pagination={false}
                        scroll={{ x: 1100 }}
                        summary={() => (
                          <Table.Summary fixed="bottom">
                            <Table.Summary.Row style={{ fontWeight: 600, backgroundColor: '#fafafa' }}>
                              <Table.Summary.Cell index={0} colSpan={2}>
                                <Text strong style={{ paddingLeft: 8 }}>Totales</Text>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={2} align="right">
                                {formatNumber(totalesDetalles.cantidad)}
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={3} align="right" responsive={['md', 'lg', 'xl', 'xxl']}>
                                {formatNumber(totalesDetalles.subTotal)}
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={4} align="right" responsive={['lg', 'xl', 'xxl']}>
                                {formatNumber(totalesDetalles.descuento)}
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={5} align="right" responsive={['lg', 'xl', 'xxl']}>
                                {formatNumber(totalesDetalles.impuestos)}
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={6} align="right">
                                <Text strong style={{ color: 'var(--paces-primary)' }}>{formatNumber(totalesDetalles.total)}</Text>
                              </Table.Summary.Cell>
                            </Table.Summary.Row>
                          </Table.Summary>
                        )}
                      />
                    </div>
                  </Spin>
                ),
              },
              {
                key: 'historial',
                label: `Historial (${data.logs?.length || 0})`,
                children: (
                  <LogTable dataSource={data.logs || []} scroll={{ x: 900 }} />
                ),
              },
              {
                key: 'impuestos',
                label: `Impuestos (${data.impuestosFactura?.length || 0})`,
                children: (
                  <Table
                    dataSource={data.impuestosFactura || []}
                    rowKey={(r: any) => r.id || r.impuesto?.codigo || Math.random()}
                    size="small"
                    pagination={false}
                    scroll={{ x: 500 }}
                    columns={[
                      { title: 'Impuesto', key: 'nombre', render: (_: any, r: any) => toTitleCase(r.impuesto?.nombre || '-') },
                      { title: 'Porcentaje', key: 'porcentaje', width: 110, align: 'right' as const, render: (_: any, r: any) => r.impuesto?.porcentaje != null ? `${r.impuesto.porcentaje}%` : '-' },
                      { title: 'Monto', key: 'monto', width: 130, align: 'right' as const, render: (_: any, r: any) => <Text strong>{formatNumber(r.monto || 0)}</Text> },
                      { title: 'Tipo', key: 'tipo', width: 110, render: (_: any, r: any) => r.tipo || '-' },
                    ]}
                    summary={() => {
                      const totalMonto = (data.impuestosFactura || []).reduce((sum: number, r: any) => sum + (r.monto || 0), 0);
                      return (
                        <Table.Summary fixed="bottom">
                          <Table.Summary.Row style={{ fontWeight: 600, backgroundColor: '#fafafa' }}>
                            <Table.Summary.Cell index={0} colSpan={2}>
                              <Text strong style={{ paddingLeft: 8 }}>Total</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right">
                              <Text strong style={{ color: 'var(--paces-primary)' }}>{formatNumber(totalMonto)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} />
                          </Table.Summary.Row>
                        </Table.Summary>
                      );
                    }}
                  />
                ),
              },
              {
                key: 'vouchers',
                label: `Vouchers (${data.vouchers?.length || 0})`,
                children: (
                  <Table
                    dataSource={data.vouchers || []}
                    rowKey={(r: any) => r.noSec || Math.random()}
                    size="small"
                    pagination={false}
                    scroll={{ x: 700 }}
                    columns={[
                      { title: 'No. Secuencia', dataIndex: 'noSec', key: 'noSec', width: 150 },
                      { title: 'No. Aprobación', dataIndex: 'noAprob', key: 'noAprob', width: 130, render: (v: string) => v || '-' },
                      { title: 'Tarjeta', key: 'tarjeta', render: (_: any, r: any) => (
                        <div>
                          <div>{r.notarjeta || '-'}</div>
                          {r.nombtar && <div className="paces-text-secondary" style={{ fontSize: 11 }}>{toTitleCase(r.nombtar)}</div>}
                        </div>
                      )},
                      { title: 'Monto', dataIndex: 'monto', key: 'monto', width: 120, align: 'right' as const,
                        render: (v: number) => <Text strong>{formatNumber(v || 0)}</Text>,
                      },
                      { title: 'Estado', dataIndex: 'anulado', key: 'anulado', width: 100,
                        render: (v: string) => v === 'S' ? <Tag color="red">Anulado</Tag> : <Tag color="green">Activo</Tag>,
                      },
                    ]}
                    summary={() => {
                      const totalMonto = (data.vouchers || []).reduce((sum: number, r: any) => sum + (r.monto || 0), 0);
                      return (
                        <Table.Summary fixed="bottom">
                          <Table.Summary.Row style={{ fontWeight: 600, backgroundColor: '#fafafa' }}>
                            <Table.Summary.Cell index={0} colSpan={3}>
                              <Text strong style={{ paddingLeft: 8 }}>Total</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">
                              <Text strong style={{ color: 'var(--paces-primary)' }}>{formatNumber(totalMonto)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={4} />
                          </Table.Summary.Row>
                        </Table.Summary>
                      );
                    }}
                  />
                ),
              },
              ...(devolucionesPV.length > 0 ? [{
                key: 'devoluciones',
                label: (
                  <span>
                    Devoluciones
                    <Badge count={devolucionesPV.length}
                      style={{ marginLeft: 6, backgroundColor: '#556ee6' }} />
                  </span>
                ),
                children: (
                  <Table
                    dataSource={devolucionesPV}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    scroll={{ x: 600 }}
                    columns={[
                      { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110,
                        render: (v: string) => formatDate(v),
                      },
                      { title: 'Documento', key: 'documento', width: 160,
                        render: (_: any, rec: any) => (
                          <a className="paces-doc-link"
                            onClick={() => navigate(`/FDEV/${rec.id}`)}
                            style={{ cursor: 'pointer' }}>
                            {`${rec.documento}-${rec.noDocumento}`}
                            </a>
                          ),
                      },
                      { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 150,
                        render: (v: string) => v || '-',
                      },
                    ]}
                  />
                ),
              }] : []),
              ...(data.transaccionesAsociadas?.length ? [{
                key: 'relacionados',
                label: (
                  <span>
                    Documentos Relacionados
                    <Badge count={data.transaccionesAsociadas!.length}
                      style={{ marginLeft: 6, backgroundColor: '#556ee6' }} />
                  </span>
                ),
                children: (
                  <Table
                    dataSource={data.transaccionesAsociadas!}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    scroll={{ x: 600 }}
                    columns={[
                      { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110,
                        render: (v: string) => formatDate(v),
                      },
                      { title: 'Documento', key: 'documento', width: 160,
                        render: (_: any, rec: any) => (
                          <a className="paces-doc-link"
                            onClick={() => navigate(`/FDEV/${rec.transaccionAsociadaID}`)}
                            style={{ cursor: 'pointer' }}>
                            {rec.documento || 'DEV'}
                          </a>
                        ),
                      },
                      { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 150,
                        render: (v: string) => v || '-',
                      },
                      { title: 'Monto', dataIndex: 'monto', key: 'monto', width: 120, align: 'right' as const,
                        render: (v: number) => <Text strong>{formatNumber(v || 0)}</Text>,
                      },
                    ]}
                  />
                ),
              }] : []),
            ]}
          />

          <div style={{ marginTop: 24 }}>
            <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} total={data.total} alignRight={true}
              monedaSimbolo={data.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={data.moneda?.nombre || monedaDefault.nombre}
              tasa={data.tasa ?? 1}
            />
            <CobrosMinimal cobrosPOS={data.cobros?.[0]} loading={loading} />
            {data?.envioDGII?.codigoQR && (
              <div style={{ textAlign: 'center' }}>
                <QRCode value={data.envioDGII.codigoQR} size={140} />
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        title="Vista previa termica"
        open={vistaPreviaUrl !== null}
        onCancel={cerrarVistaPreviaTicket}
        footer={<Button onClick={cerrarVistaPreviaTicket}>Cerrar</Button>}
        width={680}
      >
        <Text type="secondary">
          Se interpreta el mismo ticket enviado al agente local. La apariencia fisica puede variar segun el papel y la impresora.
        </Text>
        {vistaPreviaUrl && (
          <div
            style={{
              maxHeight: '70vh',
              overflow: 'auto',
              marginTop: 16,
              textAlign: 'center',
              background: '#f5f5f5',
              padding: 16,
            }}
          >
            <img
              src={vistaPreviaUrl}
              alt="Vista previa del ticket termico"
              style={{
                display: 'block',
                width: '100%',
                maxWidth: 576,
                height: 'auto',
                margin: '0 auto',
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.18)',
              }}
            />
          </div>
        )}
      </Modal>

      {/* Modal de anulación de factura POS */}
      <Modal
        title="Anular Factura POS"
        open={modalAnularOpen}
        onCancel={() => { setModalAnularOpen(false); setRazonAnulacion(''); }}
        onOk={handleAnularPV}
        okText="Confirmar Anulación"
        cancelText="Cancelar"
        okButtonProps={{ danger: true, loading: anulando }}
        confirmLoading={anulando}
        destroyOnHidden
      >
        <p style={{ marginBottom: 12 }}>
          Se creará una devolución con <strong>todos los artículos</strong> de la factura POS.
          Ingrese la razón de la anulación:
        </p>
        <TextArea
          rows={4}
          maxLength={500}
          showCount
          value={razonAnulacion}
          onChange={(e) => setRazonAnulacion(e.target.value)}
          placeholder="Razón de la anulación..."
        />
      </Modal>

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

export default FacturaPOSDetalle;
