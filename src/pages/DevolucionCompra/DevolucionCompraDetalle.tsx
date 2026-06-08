import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Input, Typography, Tooltip, Alert, Modal, App,
} from 'antd';
import {
  LockFilled,
  IdcardOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { devolucionCompraApi } from '../../api/devolucionCompraApi';
import { transaccionApi } from '../../api/transaccionApi';
import { documentoRelacionApi, type DocumentoRelacionDTO } from '../../api/documentoRelacionApi';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';

import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import ModalAnular from '../../components/ModalAnular/ModalAnular';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import DistribucionPagosCard from '../../components/DistribucionPagosCard';
import { formatCurrency, formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';
import ErrorDetalle from '../../components/ErrorDetalle';

const { Text } = Typography;

const DevolucionCompraDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const [data, setData] = useState<any>(null);
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
  const screens = Grid.useBreakpoint();

  const [modalAnularOpen, setModalAnularOpen] = useState(false);
  const [modalDesaplicarOpen, setModalDesaplicarOpen] = useState(false);
  const [pagosAsociados, setPagosAsociados] = useState<any[]>([]);
  const [loadingPagos, setLoadingPagos] = useState(false);

  const { message: messageApi } = App.useApp();
  const operacion = useAplicar();
  const [operacionTitulo, setOperacionTitulo] = useState('');

  useEffect(() => {
    setActiveModule('FDVC');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setLoadingError(false);
    devolucionCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          messageApi.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
        // Verificar si tiene documento escaneado
        devolucionCompraApi.verificarScan(sucursalActiva, parseInt(id))
          .then((scanRes) => setTieneScan(scanRes.existe))
          .catch(() => setTieneScan(false));
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        messageApi.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  // Cargar documentos relacionados desde DOCUMENTOS_RELACION
  useEffect(() => {
    if (!data?.id) return;
    documentoRelacionApi.obtenerPorTransaccion(data.id, sucursalActiva)
      .then(rel => setDocumentosRelacionados(rel || []))
      .catch(() => {
        setDocumentosRelacionados([]);
        messageApi.warning('No se pudieron cargar los documentos relacionados');
      });
  }, [data?.id, sucursalActiva]);

  // Cargar pagos asociados
  useEffect(() => {
    if (!data?.id) return;
    setLoadingPagos(true);
    transaccionApi.obtenerAsociadasInventario(sucursalActiva, data.id)
      .then((transacciones) => setPagosAsociados(transacciones || []))
      .catch(() => {
        setPagosAsociados([]);
        messageApi.warning('No se pudieron cargar los pagos asociados');
      })
      .finally(() => setLoadingPagos(false));
  }, [data?.id, sucursalActiva]);

  const handleDocumentoPagoClick = (doc: any) => {
    const tipo = (doc.tipoDocumento || '').toUpperCase();
    if (tipo === 'ND' && doc.id) {
      navigate(`/FNDSUP/${doc.id}`);
    } else if (doc.id) {
      navigate(`/FTRN/${doc.id}`);
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

  const handleRefresh = useCallback(() => {
    if (!id) return;
    setLoadingError(false);
    devolucionCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          messageApi.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
        // Cargar documentos relacionados desde DOCUMENTOS_RELACION
        documentoRelacionApi.obtenerPorTransaccion(parseInt(id), sucursalActiva)
          .then(rel => setDocumentosRelacionados(rel || []))
          .catch(() => setDocumentosRelacionados([]));
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        messageApi.error(msg);
        setLoadingError(true);
      })
  }, [id, sucursalActiva, setPageTitleOverride]);

  const handleVerScanner = async () => {
    if (!id) return;
    setScannerLoading(true);
    try {
      const blob = await devolucionCompraApi.descargarScan(sucursalActiva, parseInt(id));
      const url = URL.createObjectURL(blob);
      setScannerUrl(url);
      setScannerModalOpen(true);
    } catch {
      messageApi.error('Error al cargar el archivo escaneado');
    } finally {
      setScannerLoading(false);
    }
  };

  if (loading || (!data && !loadingError)) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando documento...</div>
      </div>
    );
  }
  if (loadingError && !data) { return <ErrorDetalle rutaVolver="/FDVC" onRecargar={handleRefresh} />; }

  const isLarge = screens.xxl === true;
  const estadoInfo = ESTADO_DOCUMENTO_MAP[data.estado] || { label: 'Desconocido', color: 'default' };
  const esCerrado = data.periodo === 6;
  const tienePagos = pagosAsociados.length > 0;

  // ===== Detalles filtrados por búsqueda =====
  const detallesFiltrados = detalleSearch
    ? (data?.detalles || []).filter((d: any) => {
        const q = detalleSearch.toLowerCase();
        return (
          (d.codigo || '').toLowerCase().includes(q) ||
          (d.articulo || '').toLowerCase().includes(q) ||
          (d.referencia || '').toLowerCase().includes(q)
        );
      })
    : (data?.detalles || []);

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
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      width: 130,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: any) => {
        const costoBase = Number(record.costo) || 0;
        const pctDesc = Number(record.porcentajeDescuento) || 0;
        const factor = Number(record.medida?.factor) || 1;
        const costoConDescuento = costoBase - ((costoBase * pctDesc) / 100);
        const costoUnitario = costoConDescuento / factor;
        return (
          <div>
            <div>{formatNumber(costoBase)}</div>
            <div style={{ fontSize: 11, lineHeight: 1.5, color: '#999' }}>
              {formatNumber(costoUnitario)} × {factor}
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
  const handleAplicar = () => {
    if (!id) return;

    // Verificación temprana del scanner
    if (tieneScan === false) {
      messageApi.warning('Debe escanear el documento antes de aplicar.');
      return;
    }

    setOperacionTitulo(`Aplicando DVC-${data?.noDocumento || id}`);
    operacion.ejecutar(`/DVC/${sucursalActiva}/aplicar/${id}`, handleRefresh);
  };

  const handleDesaplicarConfirm = async (motivo: string) => {
    if (!id || !data) return;
    setSaving(true);
    try {
      const documento = `${data.documento.codigo}-${data.noDocumento}`;
      await devolucionCompraApi.desaplicar(sucursalActiva, documento);
      messageApi.success('Documento desaplicado exitosamente');
      setModalDesaplicarOpen(false);
      const res = await devolucionCompraApi.obtenerPorId(sucursalActiva, parseInt(id));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al desaplicar');
      messageApi.error(msg);
    } finally {
      setSaving(false);
    }
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
      await devolucionCompraApi.anular(sucursalActiva, dto);
      messageApi.success('Documento anulado exitosamente');
      setModalAnularOpen(false);
      const res = await devolucionCompraApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al anular');
      messageApi.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePostear = () => {
    if (!data) return;
    if (data.concepto?.noAsientos) {
      messageApi.info('El concepto no genera asientos contables.');
      return;
    }
    // Seguridad: si no está en estado Aplicado (Validado=1), aplicar primero (como en desktop)
    if (data.estado !== 1) {
      messageApi.info('Debe aplicar el documento antes de postear.');
      return;
    }
    setOperacionTitulo(`Posteando DVC-${data?.noDocumento || id}`);
    operacion.ejecutar(
      `/DVC/${sucursalActiva}/postear`,
      handleRefresh,
      data
    );
  };

  const handleRevisar = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await devolucionCompraApi.revisar(sucursalActiva, parseInt(id));
      messageApi.success('Documento marcado como revisado');
      const res = await devolucionCompraApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al marcar revisado');
      messageApi.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReversar = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await devolucionCompraApi.reversar(sucursalActiva, data as any);
      messageApi.success('Documento reversado exitosamente');
      const res = await devolucionCompraApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al reversar');
      messageApi.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle de devolución de compra"
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
        modulo="FDVC"
        estado={data.estado}
        periodo={data.periodo}
        revisado={data.revisado}
        saving={saving}
        imprimiendo={imprimiendo}
        operacionLoading={operacion?.loading}
        onVolver={() => navigate('/FDVC')}
        onImprimir={async () => {
          setImprimiendo(true);
          try {
            const res = await apiClient.post('/reportes/inventario/devolucion-compra', data, {
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
            try {
              const blob = err?.response?.data;
              const text = blob instanceof Blob ? await blob.text() : '';
              const json = JSON.parse(text);
              messageApi.error(json.errorMessage || 'Error al generar el PDF');
            } catch {
              messageApi.error(err?.message || 'Error al generar el PDF');
            }
          } finally {
            setImprimiendo(false);
          }
        }}
        onEditar={() => navigate(`/FDVC/${id}/editar`)}
        onAplicar={handleAplicar}
        onAnular={tienePagos ? undefined : async () => setModalAnularOpen(true)}
        onPostear={data.concepto?.noAsientos ? undefined : handlePostear}
        onRevisado={handleRevisar}
        onDesaplicar={tienePagos ? undefined : async () => setModalDesaplicarOpen(true)}
        onReversar={handleReversar}
      />

      {isLarge ? (
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
                      <Tooltip title="Ver documento escaneado">
                        <Tag
                          icon={<FileTextOutlined />}
                          color="success"
                          style={{ cursor: 'pointer' }}
                          onClick={handleVerScanner}
                        />
                      </Tooltip>
                    )}
                    {tieneScan === false && (
                      <Tooltip title="Documento no escaneado">
                        <Tag icon={<FileSearchOutlined />} color="warning" />
                      </Tooltip>
                    )}
                  </Space>
                </div>
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered size="small" column={2} styles={{ content: { background: 'transparent' } }}>
                <Descriptions.Item label="Entrada">{data.documentoReferencia || '-'}</Descriptions.Item>
                <Descriptions.Item label="Concepto">{data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
                <Descriptions.Item label="Almacen">{data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Nota" span={2}><span style={{ whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</span></Descriptions.Item>
              </Descriptions>
            </Card>

            <Tabs
              defaultActiveKey="detalles"
              type="card"
              items={[
                {
                  key: 'detalles',
                  label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${data.detalles?.length || 0}` : ''})`,
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
            <EntidadCard entidad={data.suplidor} entidadSecundaria={data.entidad} fallbackTitulo="Suplidor" />
            <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} total={data.total} nota={data.nota} alignRight={false}
              monedaSimbolo={data.moneda?.simbolo || 'RD$'}
              monedaNombre={data.moneda?.nombre || 'Peso Dominicano'}
              tasa={data.tasa ?? 1}
            />
            <DistribucionPagosCard
              documentos={pagosAsociados}
              totalDocumento={data.total}
              monedaSimbolo={data.moneda?.simbolo || 'RD$'}
              loading={loadingPagos}
              onDocumentoClick={handleDocumentoPagoClick}
            />
            <DocumentosRelacionadosCard
              documentos={documentosRelacionados}
              currentId={data?.id}
            />
          </Col>
        </Row>
      ) : (
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
                      <Tooltip title="Ver documento escaneado">
                        <Tag
                          icon={<FileTextOutlined />}
                          color="success"
                          style={{ cursor: 'pointer' }}
                          onClick={handleVerScanner}
                        />
                      </Tooltip>
                    )}
                    {tieneScan === false && (
                      <Tooltip title="Documento no escaneado">
                        <Tag icon={<FileSearchOutlined />} color="warning" />
                      </Tooltip>
                    )}
                  </Space>
                </div>
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered size="small" column={1} styles={{ content: { background: 'transparent' } }}>
                <Descriptions.Item label="Entrada">{data.documentoReferencia || '-'}</Descriptions.Item>
                <Descriptions.Item label="Concepto">{data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
                <Descriptions.Item label="Almacen">{data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Nota"><span style={{ whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</span></Descriptions.Item>
              </Descriptions>
            </Card>

            <Tabs
              defaultActiveKey="detalles"
              type="card"
              items={[
                {
                  key: 'detalles',
                  label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${data.detalles?.length || 0}` : ''})`,
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
            <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} total={data.total} nota={data.nota} alignRight={true}
              monedaSimbolo={data.moneda?.simbolo || 'RD$'}
              monedaNombre={data.moneda?.nombre || 'Peso Dominicano'}
              tasa={data.tasa ?? 1}
            />
            <DistribucionPagosCard
              documentos={pagosAsociados}
              totalDocumento={data.total}
              monedaSimbolo={data.moneda?.simbolo || 'RD$'}
              loading={loadingPagos}
              onDocumentoClick={handleDocumentoPagoClick}
            />
            <DocumentosRelacionadosCard
              documentos={documentosRelacionados}
              currentId={data?.id}
            />
          </div>
        </div>
      )}

      {/* Modal de Anular */}
      <ModalAnular
        open={modalAnularOpen}
        onClose={() => setModalAnularOpen(false)}
        onConfirm={handleAnularConfirm}
        documento={`${data.documento.codigo}-${data.noDocumento}`}
        fechaDocumento={data.fechaDocumento}
        periodoCerrado={data.periodo === 6}
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

      {/* Modal de Visor de Scanner */}
      <Modal
        title="Documento Escaneado"
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
    </div>
  );
};

export default DevolucionCompraDetalle;
