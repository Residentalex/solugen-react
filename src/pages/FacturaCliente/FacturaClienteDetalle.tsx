import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message, Input, Tooltip, Typography, Modal, Alert, App, QRCode, Switch
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  IdcardOutlined,
  LockFilled,
  PhoneOutlined,
  PrinterOutlined,
  RedoOutlined,
  SendOutlined,
} from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';

import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { apiClient } from '../../api/client';
import { facturaClienteApi } from '../../api/facturaClienteApi';
import { obtenerNombreSucursal } from '../../utils/sucursalEnumMapper';
import SucursalField from '../../components/SucursalField';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import type { FacturaClienteDTO, AsientoContableDTO } from '../../types/facturaCliente';
import { documentoRelacionApi, type DocumentoRelacionDTO } from '../../api/documentoRelacionApi';
import { transaccionApi } from '../../api/transaccionApi';
import ModalAnular from '../../components/ModalAnular/ModalAnular';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import TransaccionesAsociadasCard from '../../components/TransaccionesAsociadasCard';
import { formatCurrency, formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import DetalleToolbar from '../../components/DetalleToolbar';
import ErrorDetalle from '../../components/ErrorDetalle';
import CobrosMinimal from '../../components/CobrosCard/CobrosMinimal';
import NotasSeguimientoCard from '../../components/NotasSeguimientoCard';
const { Text } = Typography;

const FacturaClienteDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode, documentCode } = useScreenConfig('FFAC');

  const [data, setData] = useState<FacturaClienteDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');
  const [tieneScan, setTieneScan] = useState<boolean | null>(null);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [scannerUrl, setScannerUrl] = useState<string | null>(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [documentosRelacionados, setDocumentosRelacionados] = useState<DocumentoRelacionDTO[]>([]);
  const [modalAnularOpen, setModalAnularOpen] = useState(false);
  const [modalDesaplicarOpen, setModalDesaplicarOpen] = useState(false);
  const [pagosAsociados, setPagosAsociados] = useState<any[]>([]);
  const monedaDefault = getMonedaSucursalActiva();
  const screens = Grid.useBreakpoint();
  const { message } = App.useApp();
  const operacion = useAplicar();
  const [operacionTitulo, setOperacionTitulo] = useState('');
  const [estadoDGII, setEstadoDGII] = useState<any>(null);
  const [enviandoDGII, setEnviandoDGII] = useState(false);
  const [sucursalDestino, setSucursalDestino] = useState<number | undefined>(undefined);
  const [mostrandoReverso, setMostrandoReverso] = useState(false);
  const [reversoData, setReversoData] = useState<any>(null);

  const handleRefresh = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setLoadingError(false);
    facturaClienteApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
        // Si el documento está anulado y tiene reversoId, cargar el reverso
        if (res.estado === 3 && (res as any).reversoID) {
          facturaClienteApi.obtenerPorId(sucursalActiva, (res as any).reversoID)
            .then((revRes) => setReversoData(revRes))
            .catch(() => setReversoData(null));
        } else {
          setReversoData(null);
          setMostrandoReverso(false);
        }

        // Parallelizar llamadas secundarias
        const promises: Promise<any>[] = [
          transaccionApi.obtenerAsociadasInventario(sucursalActiva, parseInt(id))
            .then((transacciones) => { setPagosAsociados(transacciones || []); }),
          documentoRelacionApi.obtenerPorTransaccion(parseInt(id), sucursalActiva)
            .then(rel => { setDocumentosRelacionados(rel || []); }),
        ];

        if (res.tipo?.envioDGII) {
          promises.push(
            apiClient.get(`/EnvioDGII/${sucursalActiva}/${res.id}`)
              .then(({ data }: any) => { setEstadoDGII(data?.data || null); })
              .catch(() => { setEstadoDGII(null); })
          );
        }

        Promise.all(promises).catch(() => {});
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  useEffect(() => {
    setActiveModule(screenCode);
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  // Actualizar el título del header al alternar entre Original/Reverso
  useEffect(() => {
    if (mostrandoReverso && reversoData) {
      const doc = reversoData as any;
      setPageTitleOverride(`${doc.documento?.codigo || 'FAC'}-${doc.noDocumento || ''}`);
    } else if (data) {
      const doc = data as any;
      setPageTitleOverride(`${doc.documento?.codigo || 'FAC'}-${doc.noDocumento || ''}`);
    }
  }, [mostrandoReverso, reversoData, data, setPageTitleOverride]);

  if (loading || (!data && !loadingError)) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando documento...</div>
      </div>
    );
  }

  if (loadingError && !data) { return <ErrorDetalle rutaVolver="/FFAC" onRecargar={handleRefresh} />; }

  if (!data) {
    return null;
  }

  const documentoActivo = mostrandoReverso && reversoData ? reversoData : data;
  const isLarge = screens.xxl === true;

  const estadoInfo = ESTADO_DOCUMENTO_MAP[toEstadoNum(documentoActivo.estado)] || { label: 'Desconocido', color: 'default' };
  const esCerrado = toPeriodoNum(documentoActivo.periodo) === 6;
  const tienePagos = pagosAsociados.length > 0;

  // ===== Detalles filtrados por búsqueda =====
  const detallesFiltrados = detalleSearch
    ? (documentoActivo?.detalles || []).filter((d: any) => {
        const q = detalleSearch.toLowerCase();
        return (
          (d.codigo || '').toLowerCase().includes(q) ||
          (d.articulo || '').toLowerCase().includes(q) ||
          (d.referencia || '').toLowerCase().includes(q)
        );
      })
    : (documentoActivo?.detalles || []);

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
      render: (_: any, record: any) => (
        <div>
          <div>{formatNumber(record.cantidad || 0)}</div>
          {record.medida?.nombre && (
            <Tooltip title={record.medida.nombre}>
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {record.medida.nombre}
              </div>
            </Tooltip>
          )}
        </div>
      ),
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

  // asientoColumns reemplazado por AsientosContableTable compartido

  // ===== Handlers de acciones de estado =====
  const handleVerScanner = async () => {
    if (!id) return;
    setScannerLoading(true);
    try {
      const blob = await facturaClienteApi.descargarScan(sucursalActiva, parseInt(id));
      const url = URL.createObjectURL(blob);
      setScannerUrl(url);
      setScannerModalOpen(true);
    } catch (err: any) {
      message.error('Error al cargar el archivo escaneado');
    } finally {
      setScannerLoading(false);
    }
  };

  const handleDesaplicarConfirm = async (_motivo: string) => {
    if (!id || !data) return;
    setSaving(true);
    try {
      const origen = obtenerNombreSucursal(data.codigoSucursal || String(sucursalActiva));
      const documento = `${data.documento.codigo}-${data.noDocumento}`;
      await facturaClienteApi.desaplicar(origen, documento);
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

    // Validar DGII si el tipo lo requiere
    if (data?.tipo?.envioDGII && !estadoDGII?.codigoQR) {
      message.error('Debe enviar el documento a la DGII antes de aplicar.');
      return;
    }

    // FC15 - Validar FechaPermitida
    if (data?.documento?.fechaPermitida === 'MenorIgualFechaDia') {
      const hoy = new Date();
      const fechaDoc = new Date(data.fechaDocumento);
      if (fechaDoc > hoy) {
        message.error('La fecha del documento no puede ser mayor a la fecha del día.');
        return;
      }
    }

    setOperacionTitulo(`Aplicando FAC-${data?.noDocumento || id}`);
    operacion.ejecutar(`/FAC/${sucursalActiva}/aplicar/${id}`, handleRefresh);
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
      await facturaClienteApi.anular(sucursalActiva, dto);
      message.success('Documento anulado exitosamente');
      setModalAnularOpen(false);
      const res = await facturaClienteApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
      if (res.estado === 3 && (res as any).reversoID) {
        const revRes = await facturaClienteApi.obtenerPorId(sucursalActiva, (res as any).reversoID);
        setReversoData(revRes);
      } else {
        setReversoData(null);
      }
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
    setOperacionTitulo(`Posteando FAC-${data?.noDocumento || id}`);
    operacion.ejecutar(
      `/FAC/${sucursalActiva}/postear`,
      handleRefresh,
      data
    );
  };

  const handleRevisado = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await facturaClienteApi.revisado(sucursalActiva, parseInt(id));
      message.success('Documento marcado como revisado');
      const res = await facturaClienteApi.obtenerPorId(sucursalActiva, parseInt(id!));
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
      await facturaClienteApi.reversar(sucursalActiva, parseInt(id));
      message.success('Documento reversado exitosamente');
      const res = await facturaClienteApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
      if (res.estado === 3 && (res as any).reversoID) {
        const revRes = await facturaClienteApi.obtenerPorId(sucursalActiva, (res as any).reversoID);
        setReversoData(revRes);
      } else {
        setReversoData(null);
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al reversar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEnviarDGII = async () => {
    if (!id || !data) return;
    setEnviandoDGII(true);
    try {
      await apiClient.put(`/EnvioDGII/${sucursalActiva}/MarcarEnviado`, null, {
        params: { transaccionID: parseInt(id) }
      });
      message.success('Documento enviado a la DGII exitosamente');
      const { data: resp } = await apiClient.get(`/EnvioDGII/${sucursalActiva}/${id}`);
      setEstadoDGII(resp?.data || null);
      handleRefresh();
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al enviar a la DGII';
      message.error(msg);
    } finally {
      setEnviandoDGII(false);
    }
  };

  const handleReasignarNCF = async () => {
    if (!id || !data) return;
    Modal.confirm({
      title: 'Reasignar NCF',
      icon: <ExclamationCircleOutlined />,
      content: '¿Desea reasignar un nuevo NCF a esta factura?',
      okText: 'Sí',
      cancelText: 'No',
      onOk: async () => {
        setSaving(true);
        try {
          await apiClient.put(`/Transaccion/${sucursalActiva}/reasignarNCF/${id}`);
          message.success('NCF reasignado correctamente');
          handleRefresh();
        } catch (err: any) {
          const msg = err?.response?.data?.errorMessage || 'Error al reasignar NCF';
          message.error(msg);
        } finally {
          setSaving(false);
        }
      },
    });
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

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle de factura de cliente"
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
        modulo={screenCode}
        estado={documentoActivo.estado}
        periodo={documentoActivo.periodo}
        revisado={documentoActivo.revisado}
        saving={saving}
        imprimiendo={imprimiendo}
        operacionLoading={operacion.loading}
        onVolver={() => navigate('/FFAC')}
        onImprimir={async () => {
          setImprimiendo(true);
          try {
            const res = await apiClient.post('/reportes/contabilidad/factura-cliente', data, {
              responseType: 'blob',
            });
            const blobUrl = URL.createObjectURL(res.data);
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = blobUrl;
            document.body.appendChild(iframe);
            setTimeout(() => {
              iframe.contentWindow?.print();
              setTimeout(() => {
                document.body.removeChild(iframe);
                URL.revokeObjectURL(blobUrl);
              }, 30000);
            }, 2000);
          } catch (err: any) {
            const msg = err?.response?.data?.ErrorMessage || 'Error al generar el PDF';
            message.error(msg);
          } finally {
            setImprimiendo(false);
          }
        }}
        onEditar={() => navigate(`/FFAC/${id}/editar`)}
        onAplicar={handleAplicar}
        onAnular={tienePagos ? undefined : async () => setModalAnularOpen(true)}
        onPostear={documentoActivo.concepto?.noAsientos ? undefined : handlePostear}
        onRevisado={handleRevisado}
        onDesaplicar={tienePagos ? undefined : async () => setModalDesaplicarOpen(true)}
        onReversar={handleReversar}
        extraButtons={id ? (
          <>
            {toEstadoNum(data?.estado) === 3 && reversoData && (
              <Switch
                checked={mostrandoReverso}
                checkedChildren="Reverso"
                unCheckedChildren="Original"
                onChange={(checked) => setMostrandoReverso(checked)}
                style={{ marginLeft: 8 }}
              />
            )}
            {documentoActivo?.tipo?.envioDGII ? (
              <Space>
                <PermissionGate codigoPantalla="FFAC" accion="APLICAR">
                  <Button icon={<SendOutlined />} size="small" onClick={handleEnviarDGII} loading={enviandoDGII} disabled={toEstadoNum(documentoActivo.estado) !== 1}>Enviar DGII</Button>
                  <Button icon={<FileTextOutlined />} size="small" onClick={handleReasignarNCF} disabled={toEstadoNum(documentoActivo.estado) !== 1}>Reasignar NCF</Button>
                </PermissionGate>
                {estadoDGII?.codigoQR && <Tag color="success" icon={<CheckCircleOutlined />}>DGII OK</Tag>}
              </Space>
            ) : undefined}
          </>
        ) : undefined}
      />

      {mostrandoReverso && (
        <Alert
          message="Viendo documento de Reverso"
          description="Este documento es el reverso generado al anular el documento original."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

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
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered size="small" column={3} styles={{ content: { background: 'transparent' } }}>
                <Descriptions.Item label="Sucursal" span={3}><SucursalField codigoSucursal={documentoActivo.codigoSucursal} /></Descriptions.Item>
                <Descriptions.Item label="Fecha">{formatDate(documentoActivo.fechaDocumento)}</Descriptions.Item>
                <Descriptions.Item label="Concepto">{documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-')}</Descriptions.Item>
                <Descriptions.Item label="NCF">{documentoActivo.ncf || '-'}</Descriptions.Item>
                <Descriptions.Item label="Tipo">
                  {documentoActivo.tipo ? `${documentoActivo.tipo.codigo} - ${toTitleCase(documentoActivo.tipo.nombre)}` : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Almacen">{documentoActivo.almacen?.nombre ? toTitleCase(documentoActivo.almacen.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Nota" span={3}><span style={{ whiteSpace: 'pre-wrap' }}>{documentoActivo.nota || '-'}</span></Descriptions.Item>
              </Descriptions>
            </Card>

            <Tabs
              defaultActiveKey="detalles"
              type="card"
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
                  label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${documentoActivo.detalles?.length || 0}` : ''})`,
                  children: (
                    <Table dataSource={detallesFiltrados} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 1100 }} />
                  ),
                },
                {
                  key: 'transacciones',
                  label: `Documentos (${data?.transaccionesAsociadas?.length || 0})`,
                  children: (
                    <TransaccionesAsociadasCard
                      documentos={data?.transaccionesAsociadas || []}
                      readOnly={true}
                    />
                  ),
                },
                {
                  key: 'notas',
                  label: `Notas (${data?.notasSeguimiento?.length || 0})`,
                  children: (
                    <NotasSeguimientoCard
                      notas={data?.notasSeguimiento || []}
                      readOnly={true}
                    />
                  ),
                },
                {
                  key: 'asientos',
                  label: `Asientos (${documentoActivo.asientos?.length || 0})`,
                  children: (
                    <AsientosContableTable asientos={documentoActivo.asientos || []} scroll={{ x: 900 }} />
                  ),
                },
                {
                  key: 'historial',
                  label: `Historial (${documentoActivo.logs?.length || 0})`,
                  children: (
                    <LogTable dataSource={documentoActivo.logs || []} scroll={{ x: 900 }} />
                  ),
                },
              ]}
            />
          </Col>

          <Col xxl={6}>
            <EntidadCard entidad={documentoActivo.cliente} fallbackTitulo="Cliente" />
            <TotalesCard subTotal={documentoActivo.subTotal} descuento={documentoActivo.descuento} impuestos={documentoActivo.impuestos} total={documentoActivo.total} alignRight={false}
              monedaSimbolo={documentoActivo.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={documentoActivo.moneda?.nombre || monedaDefault.nombre}
              tasa={documentoActivo.tasa ?? 1}
            />
            <CobrosMinimal cobrosArray={data?.cobros} loading={loading} />
            {estadoDGII?.codigoQR && (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <QRCode value={estadoDGII.codigoQR} size={140} />
              </div>
            )}
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
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered size="small" column={1} styles={{ content: { background: 'transparent' } }}>
              <Descriptions.Item label="Sucursal"><SucursalField codigoSucursal={documentoActivo.codigoSucursal} /></Descriptions.Item>
              <Descriptions.Item label="Fecha">{formatDate(documentoActivo.fechaDocumento)}</Descriptions.Item>
              <Descriptions.Item label="Concepto">{documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-')}</Descriptions.Item>
              <Descriptions.Item label="NCF">{documentoActivo.ncf || '-'}</Descriptions.Item>
              <Descriptions.Item label="Tipo">
                {documentoActivo.tipo ? `${documentoActivo.tipo.codigo} - ${toTitleCase(documentoActivo.tipo.nombre)}` : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Almacen">{documentoActivo.almacen?.nombre ? toTitleCase(documentoActivo.almacen.nombre) : '-'}</Descriptions.Item>
              <Descriptions.Item label="Nota"><span style={{ whiteSpace: 'pre-wrap' }}>{documentoActivo.nota || '-'}</span></Descriptions.Item>
              </Descriptions>
            </Card>

            <EntidadCard entidad={documentoActivo.cliente} fallbackTitulo="Cliente" />

          <Tabs
            defaultActiveKey="detalles"
            type="card"
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
                label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${documentoActivo.detalles?.length || 0}` : ''})`,
                children: (
                  <Table dataSource={detallesFiltrados} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 1100 }} />
                ),
              },
              {
                key: 'transacciones',
                label: `Documentos (${data?.transaccionesAsociadas?.length || 0})`,
                children: (
                  <TransaccionesAsociadasCard
                    documentos={data?.transaccionesAsociadas || []}
                    readOnly={true}
                  />
                ),
              },
              {
                key: 'notas',
                label: `Notas (${data?.notasSeguimiento?.length || 0})`,
                children: (
                  <NotasSeguimientoCard
                    notas={data?.notasSeguimiento || []}
                    readOnly={true}
                  />
                ),
              },
              {
                key: 'asientos',
                label: `Asientos (${documentoActivo.asientos?.length || 0})`,
                children: (
                  <AsientosContableTable asientos={documentoActivo.asientos || []} scroll={{ x: 900 }} />
                ),
              },
              {
                key: 'historial',
                label: `Historial (${documentoActivo.logs?.length || 0})`,
                children: (
                  <LogTable dataSource={documentoActivo.logs || []} scroll={{ x: 900 }} />
                ),
              },
            ]}
          />

          <div style={{ marginTop: 24 }}>
            <TotalesCard subTotal={documentoActivo.subTotal} descuento={documentoActivo.descuento} impuestos={documentoActivo.impuestos} total={documentoActivo.total} alignRight={true}
              monedaSimbolo={documentoActivo.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={documentoActivo.moneda?.nombre || monedaDefault.nombre}
              tasa={documentoActivo.tasa ?? 1}
            />
            <CobrosMinimal cobrosArray={data?.cobros} loading={loading} />
            {estadoDGII?.codigoQR && (
              <div style={{ textAlign: 'center' }}>
                <QRCode value={estadoDGII.codigoQR} size={140} />
              </div>
            )}
          </div>

        </div>
      )}

      {/* Modal de Visor de Scanner */}
      <Modal
        title="Factura Escaneada"
        open={scannerModalOpen}
        onCancel={() => { setScannerModalOpen(false); if (scannerUrl) URL.revokeObjectURL(scannerUrl); setScannerUrl(null); }}
        width="80%"
        style={{ top: 20 }}
        footer={null}
        destroyOnHidden
      >
        {scannerLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : scannerUrl ? (
          <iframe src={scannerUrl} style={{ width: '100%', height: '70vh', border: 'none' }} title="Scanner" />
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        )}
      </Modal>

      {/* Modal de Anulación */}
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
        onClose={() => operacion.reset()}
      />
    </div>
  );
};

export default FacturaClienteDetalle;

