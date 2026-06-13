import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Tooltip, Modal, Alert, App, QRCode, Input, Typography
} from 'antd';
import {
  LockFilled,
  IdcardOutlined, PhoneOutlined, EnvironmentOutlined,
  FileTextOutlined, FileSearchOutlined, ReloadOutlined,
  SendOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import PermissionGate from '../../components/PermissionGate';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { notaCreditoApi } from '../../api/notaCreditoApi';
import { obtenerNombreEnumSucursal } from '../../utils/sucursalEnumMapper';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import { documentoRelacionApi, type DocumentoRelacionDTO } from '../../api/documentoRelacionApi';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import { formatCurrency, formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';
import type { NotaCreditoFullDTO, DetalleMovimientoDTO } from '../../types/notaCredito';
import ErrorDetalle from '../../components/ErrorDetalle';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import ModalAnular from '../../components/ModalAnular/ModalAnular';
import TransaccionesAsociadasCard from '../../components/TransaccionesAsociadasCard';
import { useScreenConfig } from '../../hooks/useScreenConfig';

interface NotaCreditoDetalleProps {
  tipoEntidad: 'SUP' | 'CLI';
}

const NotaCreditoDetalle: React.FC<NotaCreditoDetalleProps> = ({ tipoEntidad }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { message } = App.useApp();

  const [data, setData] = useState<NotaCreditoFullDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [tieneScan, setTieneScan] = useState<boolean | null>(null);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [scannerUrl, setScannerUrl] = useState<string | null>(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [documentosRelacionados, setDocumentosRelacionados] = useState<DocumentoRelacionDTO[]>([]);
  const [modalDesaplicarOpen, setModalDesaplicarOpen] = useState(false);
  const [modalAnularOpen, setModalAnularOpen] = useState(false);
  const [sucursalDestino, setSucursalDestino] = useState<number | undefined>(undefined);
  const [estadoDGII, setEstadoDGII] = useState<any>(null);
  const [enviandoDGII, setEnviandoDGII] = useState(false);
  const screens = Grid.useBreakpoint();

  const [detalleSearch, setDetalleSearch] = useState('');

  const codigoPantalla = tipoEntidad === 'SUP' ? 'FNCSUP' : 'FNCCLI';
  const { screenCode, documentCode } = useScreenConfig(codigoPantalla);
  const rutaBase = tipoEntidad === 'SUP' ? 'NCSUP' : 'NCCLI';

  const operacion = useAplicar();
  const [operacionTitulo, setOperacionTitulo] = useState('');

  useEffect(() => {
    setActiveModule(codigoPantalla);
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride, codigoPantalla]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setLoadingError(false);
    notaCreditoApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res: NotaCreditoFullDTO) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
        const promises: Promise<any>[] = [
          notaCreditoApi.verificarScan(sucursalActiva, parseInt(id))
            .then((scanRes) => setTieneScan(scanRes.existe))
            .catch(() => setTieneScan(false)),
        ];
        if (res.tipo?.envioDGII) {
          promises.push(
            apiClient.get(`/EnvioDGII/${sucursalActiva}/${res.id}`)
              .then(({ data: resp }: any) => { setEstadoDGII(resp?.data || null); })
              .catch(() => { setEstadoDGII(null); })
          );
        }
        Promise.all(promises).catch(() => {});
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  useEffect(() => {
    if (!data?.id) return;
    documentoRelacionApi.obtenerPorTransaccion(data.id)
      .then(rel => setDocumentosRelacionados(rel || []))
      .catch(() => {
        setDocumentosRelacionados([]);
        message.warning('No se pudieron cargar los documentos relacionados');
      });
  }, [data?.id]);

  const handleRefresh = useCallback(() => {
    if (!id) return;
    setLoadingError(false);
    notaCreditoApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res: NotaCreditoFullDTO) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
        const promises: Promise<any>[] = [
          notaCreditoApi.verificarScan(sucursalActiva, parseInt(id))
            .then((scanRes) => setTieneScan(scanRes.existe))
            .catch(() => setTieneScan(false)),
          // Cargar documentos relacionados desde DOCUMENTOS_RELACION
          documentoRelacionApi.obtenerPorTransaccion(parseInt(id))
            .then(rel => setDocumentosRelacionados(rel || []))
            .catch(() => setDocumentosRelacionados([])),
        ];
        if (res.tipo?.envioDGII) {
          promises.push(
            apiClient.get(`/EnvioDGII/${sucursalActiva}/${res.id}`)
              .then(({ data: resp }: any) => { setEstadoDGII(resp?.data || null); })
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
  }, [id, sucursalActiva, setPageTitleOverride]);

  const handleVerScanner = async () => {
    if (!id) return;
    setScannerLoading(true);
    try {
      const blob = await notaCreditoApi.descargarScan(sucursalActiva, parseInt(id));
      const url = URL.createObjectURL(blob);
      setScannerUrl(url);
      setScannerModalOpen(true);
    } catch {
      message.error('Error al cargar el archivo escaneado');
    } finally {
      setScannerLoading(false);
    }
  };

  const handleAplicar = () => {
    if (!id) return;
    // Validar scanner
    if (tieneScan === false) {
      message.warning('Debe escanear la factura antes de aplicar.');
      return;
    }
    // Validar DGII si el tipo lo requiere
    if (data?.tipo?.envioDGII && !estadoDGII?.codigoQR) {
      message.error('Debe enviar el documento a la DGII antes de aplicar.');
      return;
    }
    // Validar FechaPermitida (si aplica)
    if (data?.documento?.fechaPermitida === 'MenorIgualFechaDia') {
      const hoy = new Date();
      const fechaDoc = new Date(data.fechaDocumento);
      if (fechaDoc > hoy) {
        message.error('La fecha del documento no puede ser mayor a la fecha del día.');
        return;
      }
    }
    setOperacionTitulo(`Aplicando ${rutaBase}-${data?.noDocumento || id}`);
    operacion.ejecutar(
      `/${rutaBase}/${sucursalActiva}/aplicar/${id}`,
      handleRefresh
    );
  };

  const handleAnularConfirm = async (dataAnular: { fecha: string; motivo: string }) => {
    if (!data || !id) return;
    try {
      const payload = { ...data, motivo: dataAnular.motivo, fechaAnulacion: dataAnular.fecha };
      await notaCreditoApi.anular(sucursalActiva, payload);
      message.success('Documento anulado exitosamente');
      setModalAnularOpen(false);
      const res = await notaCreditoApi.obtenerPorId(sucursalActiva, parseInt(id));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al anular');
      message.error(msg);
      throw err;
    }
  };

  const handleDesaplicarConfirm = async (motivo: string) => {
    if (!id || !data) return;
    try {
      const origen = obtenerNombreEnumSucursal(data.codigoSucursal || String(sucursalActiva));
      const documento = `${data.documento.codigo}-${data.noDocumento}`;
      await notaCreditoApi.desaplicar(origen, documento);
      message.success('Documento desaplicado exitosamente');
      setModalDesaplicarOpen(false);
      handleRefresh();
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al desaplicar');
      message.error(msg);
      throw err;
    }
  };

  const handlePostear = () => {
    if (!data) return;
    setOperacionTitulo(`Posteando ${rutaBase}-${data?.noDocumento || id}`);
    operacion.ejecutar(
      `/${rutaBase}/${sucursalActiva}/postear`,
      handleRefresh,
      data
    );
  };

  const handleRevisado = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await notaCreditoApi.revisado(sucursalActiva, parseInt(id));
      message.success('Documento marcado como revisado');
      const res = await notaCreditoApi.obtenerPorId(sucursalActiva, parseInt(id!));
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
      await notaCreditoApi.reversar(sucursalActiva, parseInt(id));
      message.success('Documento reversado exitosamente');
      const res = await notaCreditoApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al reversar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRecalcular = async () => {
    if (!id) return;
    setRecalculando(true);
    try {
      await notaCreditoApi.recalcular(sucursalActiva, parseInt(id));
      const res = await notaCreditoApi.obtenerPorId(sucursalActiva, parseInt(id));
      setData(res);
      message.success('Documento recalculado correctamente');
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al recalcular');
      message.error(msg);
    } finally {
      setRecalculando(false);
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

  const detallesFiltrados = detalleSearch
    ? (data?.detallesMovimiento || []).filter((d: DetalleMovimientoDTO) => {
        const q = detalleSearch.toLowerCase();
        return (
          (d.codigo || '').toLowerCase().includes(q) ||
          (d.articulo || '').toLowerCase().includes(q) ||
          (d.referencia || '').toLowerCase().includes(q)
        );
      })
    : (data?.detallesMovimiento || []);

  const detalleColumns = [
    {
      title: 'Código',
      key: 'codigo',
      width: 120,
      fixed: 'left' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: DetalleMovimientoDTO) => (
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
      render: (_: any, record: DetalleMovimientoDTO) => (
        <div style={{ fontSize: 13 }}>
          <div>{toTitleCase(record.articulo || '')}</div>
          <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }}>
            {record.familia?.nombre ? <Tag style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>{toTitleCase(record.familia.nombre)}</Tag> : null}
          </div>
        </div>
      ),
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 110,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: DetalleMovimientoDTO) => (
        <div>
          <div>{formatNumber(record.cantidad || 0)}</div>
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
      render: (_: any, record: DetalleMovimientoDTO) => <div>{formatNumber(record.precio || 0)}</div>,
    },
    {
      title: 'SubTotal',
      dataIndex: 'subTotal',
      key: 'subTotal',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: DetalleMovimientoDTO) => <div>{formatNumber(record.subTotal || 0)}</div>,
    },
    {
      title: 'Impuestos',
      dataIndex: 'impuestos',
      key: 'impuestos',
      width: 140,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: DetalleMovimientoDTO) => <div>{formatNumber(record.impuestos || 0)}</div>,
    },
    {
      title: 'Descuento',
      dataIndex: 'descuento',
      key: 'descuento',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: DetalleMovimientoDTO) => <div>{formatNumber(record.descuento || 0)}</div>,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: DetalleMovimientoDTO) => <Typography.Text strong>{formatNumber(record.total || 0)}</Typography.Text>,
    },
  ];

  if (loading || (!data && !loadingError)) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando documento...</div>
      </div>
    );
  }

  if (loadingError && !data) { return <ErrorDetalle rutaVolver="/FNDC" onRecargar={handleRefresh} />; }

  if (!data) {
    return null;
  }

  const isLarge = screens.xxl === true;
  const estadoInfo = ESTADO_DOCUMENTO_MAP[data.estado] || { label: 'Desconocido', color: 'default' };
  const esCerrado = data.periodo === 6;

  // asientoColumns reemplazado por AsientosContableTable compartido

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle de nota de crédito"
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
        modulo={codigoPantalla}
        estado={data.estado}
        periodo={data.periodo}
        revisado={data.revisado}
        saving={saving}
        imprimiendo={imprimiendo}
        operacionLoading={operacion?.loading}
        onVolver={() => navigate(`/${codigoPantalla}`)}
        onImprimir={async () => {
          setImprimiendo(true);
          try {
            const res = await apiClient.post('/reportes/contabilidad/nota-credito', data, {
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
          } catch {
            message.error('Error al generar el PDF');
          } finally {
            setImprimiendo(false);
          }
        }}
        onEditar={() => navigate(`/${codigoPantalla}/${id}/editar`)}
        confirmActions={true}
        onAplicar={handleAplicar}
        onAnular={async () => setModalAnularOpen(true)}
        onPostear={handlePostear}
        onRevisado={handleRevisado}
        onDesaplicar={async () => setModalDesaplicarOpen(true)}
        onReversar={handleReversar}
        extraButtons={id ? (
          <PermissionGate accion="EDITAR">
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRecalcular}
              loading={recalculando}
            >
              Recalcular
            </Button>
          </PermissionGate>
        ) : undefined}
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
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered size="small" column={3} styles={{ content: { background: 'transparent' } }}>
                <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
                <Descriptions.Item label="Concepto">{data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : (data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-')}</Descriptions.Item>
                <Descriptions.Item label="Tipo">
                  {data.tipo ? `${data.tipo.codigo} - ${toTitleCase(data.tipo.nombre)}` : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
                <Descriptions.Item label="Nota" span={3}><span style={{ whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</span></Descriptions.Item>
              </Descriptions>
            </Card>

            <Tabs
              defaultActiveKey="documentos"
              type="card"
              items={[
                {
                  key: 'documentos',
                  label: `Documentos (${data?.transaccionesAsociadas?.length || 0})`,
                  children: (
                    <TransaccionesAsociadasCard
                      documentos={data?.transaccionesAsociadas || []}
                      readOnly={true}
                    />
                  ),
                },
                {
                  key: 'detalles',
                  label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${data?.detallesMovimiento?.length || 0}` : ''})`,
                  children: (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                        <Input.Search
                          placeholder="Buscar detalle..."
                          allowClear
                          style={{ maxWidth: 250 }}
                          onSearch={(value) => setDetalleSearch(value)}
                          onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                        />
                      </div>
                      <Table dataSource={detallesFiltrados} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 1100 }} />
                    </>
                  ),
                },
                {
                  key: 'asientos',
                  label: `Asientos (${data.asientos?.length || 0})`,
                  children: (
                    <AsientosContableTable asientos={data.asientos || []} scroll={{ x: 600 }} rowKey={(r: any) => r.id || r.asientoID} />
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
            <EntidadCard entidad={data.entidad} fallbackTitulo={tipoEntidad === 'SUP' ? 'Suplidor' : 'Cliente'} />
            <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} total={data.total} alignRight={false}
              monedaSimbolo={data.moneda?.simbolo || 'RD$'}
              monedaNombre={data.moneda?.nombre || 'Peso Dominicano'}
              tasa={data.tasa ?? 1}
            />
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
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered size="small" column={1} styles={{ content: { background: 'transparent' } }}>
              <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
              <Descriptions.Item label="Concepto">{data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : (data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-')}</Descriptions.Item>
              <Descriptions.Item label="Tipo">
                {data.tipo ? `${data.tipo.codigo} - ${toTitleCase(data.tipo.nombre)}` : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
              <Descriptions.Item label="Nota"><span style={{ whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</span></Descriptions.Item>
              </Descriptions>
          </Card>

          <Tabs
            defaultActiveKey="documentos"
            type="card"
            items={[
              {
                key: 'documentos',
                label: `Documentos (${data?.transaccionesAsociadas?.length || 0})`,
                children: (
                  <TransaccionesAsociadasCard
                    documentos={data?.transaccionesAsociadas || []}
                    readOnly={true}
                  />
                ),
              },
              {
                key: 'detalles',
                label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${data?.detallesMovimiento?.length || 0}` : ''})`,
                children: (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                      <Input.Search
                        placeholder="Buscar detalle..."
                        allowClear
                        style={{ maxWidth: 250 }}
                        onSearch={(value) => setDetalleSearch(value)}
                        onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                      />
                    </div>
                    <Table dataSource={detallesFiltrados} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 1100 }} />
                  </>
                ),
              },
              {
                key: 'asientos',
                label: `Asientos (${data.asientos?.length || 0})`,
                children: (
                  <AsientosContableTable asientos={data.asientos || []} scroll={{ x: 600 }} rowKey={(r: any) => r.id || r.asientoID} />
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
            <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} total={data.total} alignRight={true}
              monedaSimbolo={data.moneda?.simbolo || 'RD$'}
              monedaNombre={data.moneda?.nombre || 'Peso Dominicano'}
              tasa={data.tasa ?? 1}
            />
            {estadoDGII?.codigoQR && (
              <div style={{ textAlign: 'center' }}>
                <QRCode value={estadoDGII.codigoQR} size={140} />
              </div>
            )}

          <DocumentosRelacionadosCard
            documentos={documentosRelacionados}
            currentId={data?.id}
          />
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

      {/* Modal de Progreso para Aplicar/Postear */}
      <ModalProgreso
        open={operacion.loading || !!operacion.completado}
        titulo={operacionTitulo}
        eventos={operacion.eventos}
        completado={operacion.completado}
        onClose={() => operacion.reset()}
      />

      <ModalDesaplicar
        open={modalDesaplicarOpen}
        onClose={() => setModalDesaplicarOpen(false)}
        onConfirm={handleDesaplicarConfirm}
        tituloDocumento={`${data?.documento?.codigo || rutaBase}-${data?.noDocumento || id}`}
      />

      <ModalAnular
        open={modalAnularOpen}
        onClose={() => setModalAnularOpen(false)}
        onConfirm={handleAnularConfirm}
        documento={`${data?.documento?.codigo || rutaBase}-${data?.noDocumento || ''}`}
        fechaDocumento={data?.fechaDocumento || ''}
        periodoCerrado={data?.periodo === 6}
      />
    </div>
  );
};

export default NotaCreditoDetalle;
