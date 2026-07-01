import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Input, message, Tooltip, Modal, Alert, App, Switch, Typography
} from 'antd';
import {
  LockFilled,
  IdcardOutlined, PhoneOutlined, EnvironmentOutlined,
  FileTextOutlined, FileSearchOutlined,
  ExclamationCircleOutlined, RedoOutlined,
} from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import PermissionGate from '../../components/PermissionGate';
import ModalAnular from '../../components/ModalAnular/ModalAnular';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { apiClient } from '../../api/client';
import { facturaSuplidorApi } from '../../api/facturaSuplidorApi';
import { transaccionApi } from '../../api/transaccionApi';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import { documentoRelacionApi, type DocumentoRelacionDTO } from '../../api/documentoRelacionApi';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import { formatCurrency, formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, resolveEstado, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import ErrorDetalle from '../../components/ErrorDetalle';
import TransaccionesAsociadasCard from '../../components/TransaccionesAsociadasCard';

const FacturaSuplidorDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode, documentCode } = useScreenConfig('FRDE');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);

  const [tieneScan, setTieneScan] = useState<boolean | null>(null);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [scannerUrl, setScannerUrl] = useState<string | null>(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [documentosRelacionados, setDocumentosRelacionados] = useState<DocumentoRelacionDTO[]>([]);
  const [modalAnularOpen, setModalAnularOpen] = useState(false);
  const [modalDesaplicarOpen, setModalDesaplicarOpen] = useState(false);
  const [pagosAsociados, setPagosAsociados] = useState<any[]>([]);
  const [operacionTitulo, setOperacionTitulo] = useState('');
  const [recalculando, setRecalculando] = useState(false);
  const monedaDefault = getMonedaSucursalActiva();
  const [sucursalDestino, setSucursalDestino] = useState<number | undefined>(undefined);
  const [mostrandoReverso, setMostrandoReverso] = useState(false);
  const [reversoData, setReversoData] = useState<any>(null);
  const [detalleSearch, setDetalleSearch] = useState('');

  const { message: messageApi } = App.useApp();
  const operacion = useAplicar();
  const screens = Grid.useBreakpoint();

  useEffect(() => {
    setActiveModule(screenCode);
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  const handleRefresh = useCallback(() => {
    if (!id) return;
    setLoadingError(false);
    facturaSuplidorApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          const msg = 'Documento no encontrado en la sucursal seleccionada.';
          messageApi.error(msg);
          setLoadingError(true);
          return;
        }
        setData(res);
        const data = res as any;
        setPageTitleOverride(`${data.documento.codigo}-${data.noDocumento}`);
        // Si el documento está anulado y tiene reversoId, cargar el reverso
        if (toEstadoNum(res.estado) === 3 && (res as any).reversoID) {
          facturaSuplidorApi.obtenerPorId(sucursalActiva, (res as any).reversoID)
            .then((revRes) => setReversoData(revRes))
            .catch(() => setReversoData(null));
        } else {
          setReversoData(null);
          setMostrandoReverso(false);
        }
        // Verificar scan
        facturaSuplidorApi.verificarScan(sucursalActiva, parseInt(id))
          .then((scanRes) => setTieneScan(scanRes.existe))
          .catch(() => setTieneScan(false));
        // Cargar documentos relacionados
        documentoRelacionApi.obtenerPorTransaccion(data.id)
          .then(rel => setDocumentosRelacionados(rel || []))
          .catch(() => setDocumentosRelacionados([]));
        // Cargar pagos asociados
        transaccionApi.obtenerAsociadasInventario(sucursalActiva, data.id)
          .then((transacciones) => setPagosAsociados(transacciones || []))
          .catch(() => setPagosAsociados([]));
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || err?.response?.data?.ErrorMessage || 'Error al cargar el documento';
        messageApi.error(msg);
        setLoadingError(true);
      })
  }, [id, sucursalActiva, setPageTitleOverride, messageApi]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    facturaSuplidorApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          const msg = 'Documento no encontrado en la sucursal seleccionada.';
          messageApi.error(msg);
          setLoadingError(true);
          return;
        }
        setData(res);
        const data = res as any;
        setPageTitleOverride(`${data.documento.codigo}-${data.noDocumento}`);
        // Si el documento está anulado y tiene reversoId, cargar el reverso
        if (toEstadoNum(res.estado) === 3 && (res as any).reversoID) {
          facturaSuplidorApi.obtenerPorId(sucursalActiva, (res as any).reversoID)
            .then((revRes) => setReversoData(revRes))
            .catch(() => setReversoData(null));
        } else {
          setReversoData(null);
          setMostrandoReverso(false);
        }
        // Verificar scan
        facturaSuplidorApi.verificarScan(sucursalActiva, parseInt(id))
          .then((scanRes) => setTieneScan(scanRes.existe))
          .catch(() => setTieneScan(false));
        // Cargar documentos relacionados
        documentoRelacionApi.obtenerPorTransaccion(data.id)
          .then(rel => setDocumentosRelacionados(rel || []))
          .catch(() => setDocumentosRelacionados([]));
        // Cargar pagos asociados
        transaccionApi.obtenerAsociadasInventario(sucursalActiva, data.id)
          .then((transacciones) => setPagosAsociados(transacciones || []))
          .catch(() => setPagosAsociados([]));
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || err?.response?.data?.ErrorMessage || 'Error al cargar el documento';
        messageApi.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride, messageApi]);

  // Actualizar el título del header al alternar entre Original/Reverso
  useEffect(() => {
    if (mostrandoReverso && reversoData) {
      const doc = reversoData as any;
      setPageTitleOverride(`${doc.documento?.codigo || 'RDE'}-${doc.noDocumento || ''}`);
    } else if (data) {
      const doc = data as any;
      setPageTitleOverride(`${doc.documento?.codigo || 'RDE'}-${doc.noDocumento || ''}`);
    }
  }, [mostrandoReverso, reversoData, data, setPageTitleOverride]);

  const handleVerScanner = async () => {
    if (!id) return;
    setScannerLoading(true);
    try {
      const blob = await facturaSuplidorApi.descargarScan(sucursalActiva, parseInt(id));
      const url = URL.createObjectURL(blob);
      setScannerUrl(url);
      setScannerModalOpen(true);
    } catch (err: any) {
      messageApi.error('Error al cargar el archivo escaneado');
    } finally {
      setScannerLoading(false);
    }
  };

  const handleAplicar = () => {
    if (!id) return;

    // Validar FechaPermitida del documento
    if (data?.documento?.fechaPermitida === 'MenorIgualFechaDia') {
      const hoy = new Date();
      const fechaDoc = new Date(data.fechaDocumento);
      if (fechaDoc > hoy) {
        messageApi.error('La fecha del documento no puede ser mayor a la fecha del día.');
        return;
      }
      if (data.fechaEntrega) {
        const fechaEntrega = new Date(data.fechaEntrega);
        if (fechaEntrega > hoy) {
          messageApi.error('La fecha de entrega no puede ser mayor a la fecha del día.');
          return;
        }
      }
    }

    setOperacionTitulo(`Aplicando RDE-${data?.noDocumento || id}`);
    operacion.ejecutar(
      `/RDE/${sucursalActiva}/aplicar/${id}`,
      handleRefresh
    );
  };

  const handlePostear = () => {
    if (!data) return;
    if (data.concepto?.noAsientos) {
      messageApi.info('El concepto no genera asientos contables.');
      return;
    }
    if (toEstadoNum(data.estado) !== 1 && toEstadoNum(data.estado) !== 3) {
      messageApi.info('Debe aplicar el documento antes de postear.');
      return;
    }
    setOperacionTitulo(`Posteando RDE-${data?.noDocumento || id}`);
    operacion.ejecutar(
      `/Transaccion/${sucursalActiva}/postear`,
      handleRefresh,
      data
    );
  };

  const handleDesaplicarConfirm = async (_motivo: string) => {
    if (!id || !data) return;
    setSaving(true);
    try {
      const documento = `${data.documento.codigo}-${data.noDocumento}`;
      await facturaSuplidorApi.desaplicar(sucursalActiva, documento);
      messageApi.success('Documento desaplicado exitosamente');
      setModalDesaplicarOpen(false);
      handleRefresh();
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al desaplicar');
      messageApi.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRevisado = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await facturaSuplidorApi.revisado(sucursalActiva, parseInt(id));
      messageApi.success('Documento marcado como revisado');
      handleRefresh();
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
      await facturaSuplidorApi.reversar(sucursalActiva, parseInt(id));
      messageApi.success('Documento reversado exitosamente');
      handleRefresh();
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al reversar');
      messageApi.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRecalcular = async () => {
    if (!id || !data) return;
    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: 'Recalcular',
        icon: <ExclamationCircleOutlined />,
        content: '¿Desea recalcular los pagos de este documento?',
        okText: 'Sí, recalcular',
        cancelText: 'No',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed) return;

    setRecalculando(true);
    try {
      await apiClient.put(
        `/Transaccion/${sucursalActiva}/recalcularPagos/${id}`
      );
      messageApi.success('Documento recalculado correctamente');
      handleRefresh();
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al recalcular';
      messageApi.error(msg);
    } finally {
      setRecalculando(false);
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
      await facturaSuplidorApi.anular(sucursalActiva, dto);
      messageApi.success('Documento anulado exitosamente');
      setModalAnularOpen(false);
      handleRefresh();
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al anular');
      messageApi.error(msg);
    } finally {
      setSaving(false);
    }
  };

  function extraerMensajeError(err: any, fallback: string): string {
    const responseData = err?.response?.data;
    if (!responseData) return fallback;
    if (responseData.errorMessage) return responseData.errorMessage;
    if (responseData.errors && typeof responseData.errors === 'object') {
      const mensajes: string[] = [];
      for (const key of Object.keys(responseData.errors)) {
        const val = responseData.errors[key];
        if (Array.isArray(val)) mensajes.push(...val);
        else if (typeof val === 'string') mensajes.push(val);
      }
      if (mensajes.length > 0) return mensajes.join('; ');
    }
    return fallback;
  }

  if (loading || (!data && !loadingError)) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando documento...</div>
      </div>
    );
  }

  if (loadingError && !data) { return <ErrorDetalle rutaVolver="/FRDE" onRecargar={handleRefresh} />; }

  if (!data) {
    return null;
  }

  const documentoActivo = mostrandoReverso && reversoData ? reversoData : data;
  const isLarge = screens.xxl === true;
  const estadoInfo = resolveEstado(documentoActivo.estado);
  const esCerrado = toPeriodoNum(documentoActivo.periodo) === 6;
  const tienePagos = pagosAsociados.length > 0;

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

  // asientoColumns reemplazado por AsientosContableTable compartido

  const detalleColumns = [
    {
      title: 'Código',
      key: 'codigo',
      width: 100,
      fixed: 'left' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column' }}>
          <span>{record.codigo || '-'}</span>
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
        <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column' }}>
          <span>{toTitleCase(record.articulo || '')}</span>
          {record.familia?.nombre && (
            <Tag style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px', marginTop: 4, width: 'fit-content' }}>
              {toTitleCase(record.familia.nombre)}
            </Tag>
          )}
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
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div>{formatNumber(record.cantidad || 0)}</div>
          <Tooltip title={record.medida?.nombre || ''}>
            <div className="paces-text-secondary" style={{ fontSize: 11, marginTop: 'auto' }}>
              {record.medida?.nombre || ''}
            </div>
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Precio',
      key: 'costo',
      width: 110,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: any) => {
        const factor = Number(record.medida?.factor) || 1;
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div>{formatNumber(record.costo || 0)}</div>
            <div className="paces-text-secondary" style={{ fontSize: 11 }}>
              {factor > 1 ? `${formatNumber((record.costo || 0) / factor)} × ${factor}` : ''}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Descuento',
      key: 'descuento',
      width: 100,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div>{formatNumber(record.porcentajeDescuento || 0)}%</div>
          <div className="paces-text-secondary" style={{ fontSize: 12 }}>
            {formatNumber(record.descuento || 0)}
          </div>
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
              <div className="paces-text-secondary" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
      width: 100,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top', paddingRight: 16 } }),
      onHeaderCell: () => ({ style: { paddingRight: 16 } }),
      render: (_: any, record: any) => (
        <Typography.Text strong>{formatNumber(record.total || 0)}</Typography.Text>
      ),
    },
  ];

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle de factura suplidor"
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
        modulo="FRDE"
        estado={documentoActivo.estado}
        periodo={documentoActivo.periodo}
        revisado={documentoActivo.revisado}
        saving={saving}
        imprimiendo={imprimiendo}
        operacionLoading={operacion?.loading}
        onVolver={() => navigate('/FRDE')}
        onImprimir={async () => {
          setImprimiendo(true);
          try {
            const res = await apiClient.get(`/reportes/contabilidad/facturaSuplidor/${sucursalActiva}/${id}`, {
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
            messageApi.error('Error al generar el PDF');
          } finally {
            setImprimiendo(false);
          }
        }}
        onEditar={() => navigate(`/FRDE/${id}/editar`)}
        onAplicar={handleAplicar}
        onAnular={tienePagos ? undefined : async () => setModalAnularOpen(true)}
        onPostear={data.concepto?.noAsientos ? undefined : handlePostear}
        onRevisado={handleRevisado}
        onDesaplicar={tienePagos ? undefined : async () => setModalDesaplicarOpen(true)}
        onReversar={handleReversar}
        extraButtons={
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
            <PermissionGate permisoEspecial="pe_recalcular">
              <Button
                icon={<RedoOutlined />}
                onClick={handleRecalcular}
                loading={recalculando}
                disabled={toEstadoNum(data.estado) !== 1}
              >
                Recalcular
              </Button>
            </PermissionGate>
          </>
        }
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
                <Descriptions.Item label="Documento">{documentoActivo.noDocumento || '-'}</Descriptions.Item>
                <Descriptions.Item label="Fecha">{formatDate(documentoActivo.fechaDocumento)}</Descriptions.Item>
                <Descriptions.Item label="Concepto">{documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-')}<ConceptoInfoLabel concepto={documentoActivo.concepto} /></Descriptions.Item>
                <Descriptions.Item label="Tipo">
                  {documentoActivo.tipo ? `${documentoActivo.tipo.codigo} - ${toTitleCase(documentoActivo.tipo.nombre)}` : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="NCF">{documentoActivo.ncf || '-'}</Descriptions.Item>
                <Descriptions.Item label="Referencia">{documentoActivo.referencia || '-'}</Descriptions.Item>
                <Descriptions.Item label="Sucursal">{documentoActivo.sucursal?.nombre || documentoActivo.sucursal?.codigo || '-'}</Descriptions.Item>

                <Descriptions.Item label="Tasa">{documentoActivo.tasa ? formatNumber(documentoActivo.tasa) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Tipo Compra">{documentoActivo.tipoCompra === 'C' ? 'Contado' : documentoActivo.tipoCompra === 'D' ? 'Crédito' : documentoActivo.tipoCompra || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Tabs
              defaultActiveKey="articulos"
              type="card"
              tabBarExtraContent={
                <Input.Search
                  placeholder="Buscar artículo..."
                  allowClear
                  style={{ width: 320 }}
                  onSearch={(value) => setDetalleSearch(value)}
                  onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                />
              }
              items={[
                {
                  key: 'articulos',
                  label: `Artículos (${detallesFiltrados.length}${detalleSearch ? `/${documentoActivo?.detalles?.length || 0}` : ''})`,
                  children: (
                    <Table dataSource={detallesFiltrados} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 800 }} />
                  ),
                },
                {
                  key: 'documentos',
                  label: `Documentos (${documentoActivo?.transaccionesAsociadas?.length || 0})`,
                  children: (
                    <TransaccionesAsociadasCard
                      documentos={documentoActivo?.transaccionesAsociadas || []}
                      readOnly={false}
                    />
                  ),
                },
                {
                  key: 'asientos',
                  label: `Asientos (${documentoActivo.asientos?.length || 0})`,
                  children: (
                    <AsientosContableTable asientos={documentoActivo.asientos || []} scroll={{ x: 600 }} rowKey={(r: any) => r.id || r.asientoID} />
                  ),
                },
                {
                  key: 'impuestos',
                  label: `Impuestos (${documentoActivo.impuestosFactura?.length || 0})`,
                  children: (
                    <Table
                      dataSource={documentoActivo.impuestosFactura || []}
                      rowKey={(r: any) => r.transactionID + (r.impuesto?.idExterno || '')}
                      size="small"
                      pagination={false}
                      scroll={{ x: 600 }}
                      columns={[
                        { title: 'Impuesto / Retención', key: 'nombre', render: (_: any, r: any) => r.impuesto?.nombre || '-' },
                        { title: 'Porcentaje', key: 'porcentaje', width: 100, align: 'right' as const, render: (_: any, r: any) => r.impuesto?.porcentaje != null ? `${r.impuesto.porcentaje}%` : '-' },
                        { title: 'No. Cuenta', key: 'cuenta', width: 150, render: (_: any, r: any) => r.impuesto?.noCuenta || '-' },
                        { title: 'Monto', key: 'monto', width: 140, align: 'right' as const, render: (_: any, r: any) => formatCurrency(r.monto || 0) },
                        { title: 'Tipo', key: 'tipo', width: 120, render: (_: any, r: any) => r.tipo || (r.impuesto?.tipo === 1 ? 'Impuesto' : r.impuesto?.tipo === 2 ? 'Retención' : '-') },
                      ]}
                    />
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
            <EntidadCard entidad={documentoActivo.suplidor} entidadSecundaria={documentoActivo.entidad} fallbackTitulo="Suplidor" />
            <TotalesCard subTotal={documentoActivo.subTotal} descuento={documentoActivo.descuento} impuestos={documentoActivo.impuestos} retenciones={documentoActivo.retenciones} total={documentoActivo.total} alignRight={false}
              monedaSimbolo={documentoActivo.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={documentoActivo.moneda?.nombre || monedaDefault.nombre}
              tasa={documentoActivo.tasa ?? 1}
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
                <Descriptions.Item label="Documento">{documentoActivo.noDocumento || '-'}</Descriptions.Item>
                <Descriptions.Item label="Fecha">{formatDate(documentoActivo.fechaDocumento)}</Descriptions.Item>
                <Descriptions.Item label="Concepto">{documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-')}<ConceptoInfoLabel concepto={documentoActivo.concepto} /></Descriptions.Item>
                <Descriptions.Item label="Tipo">
                  {documentoActivo.tipo ? `${documentoActivo.tipo.codigo} - ${toTitleCase(documentoActivo.tipo.nombre)}` : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="NCF">{documentoActivo.ncf || '-'}</Descriptions.Item>
                <Descriptions.Item label="Referencia">{documentoActivo.referencia || '-'}</Descriptions.Item>

                <Descriptions.Item label="Tasa">{documentoActivo.tasa ? formatNumber(documentoActivo.tasa) : '-'}</Descriptions.Item>
              </Descriptions>
          </Card>

          <Tabs
            defaultActiveKey="articulos"
            type="card"
            tabBarExtraContent={
              <Input.Search
                placeholder="Buscar artículo..."
                allowClear
                style={{ width: 320 }}
                onSearch={(value) => setDetalleSearch(value)}
                onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
              />
            }
            items={[
              {
                key: 'articulos',
                label: `Artículos (${detallesFiltrados.length}${detalleSearch ? `/${documentoActivo?.detalles?.length || 0}` : ''})`,
                children: (
                  <Table dataSource={detallesFiltrados} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 800 }} />
                ),
              },
              {
                key: 'documentos',
                label: `Documentos (${documentoActivo?.transaccionesAsociadas?.length || 0})`,
                children: (
                  <TransaccionesAsociadasCard
                    documentos={documentoActivo?.transaccionesAsociadas || []}
                    readOnly={false}
                  />
                ),
              },
              {
                key: 'asientos',
                label: `Asientos (${documentoActivo.asientos?.length || 0})`,
                children: (
                  <AsientosContableTable asientos={documentoActivo.asientos || []} scroll={{ x: 600 }} rowKey={(r: any) => r.id || r.asientoID} />
                ),
              },
              {
                key: 'impuestos',
                label: `Impuestos (${documentoActivo.impuestosFactura?.length || 0})`,
                children: (
                  <Table
                    dataSource={documentoActivo.impuestosFactura || []}
                    rowKey={(r: any) => r.transactionID + (r.impuesto?.idExterno || '')}
                    size="small"
                    pagination={false}
                    scroll={{ x: 600 }}
                    columns={[
                      { title: 'Impuesto / Retención', key: 'nombre', render: (_: any, r: any) => r.impuesto?.nombre || '-' },
                      { title: 'Porcentaje', key: 'porcentaje', width: 100, align: 'right' as const, render: (_: any, r: any) => r.impuesto?.porcentaje != null ? `${r.impuesto.porcentaje}%` : '-' },
                      { title: 'No. Cuenta', key: 'cuenta', width: 150, render: (_: any, r: any) => r.impuesto?.noCuenta || '-' },
                      { title: 'Monto', key: 'monto', width: 140, align: 'right' as const, render: (_: any, r: any) => formatCurrency(r.monto || 0) },
                      { title: 'Tipo', key: 'tipo', width: 120, render: (_: any, r: any) => r.tipo || (r.impuesto?.tipo === 1 ? 'Impuesto' : r.impuesto?.tipo === 2 ? 'Retención' : '-') },
                    ]}
                  />
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
            <TotalesCard subTotal={documentoActivo.subTotal} descuento={documentoActivo.descuento} impuestos={documentoActivo.impuestos} retenciones={documentoActivo.retenciones} total={documentoActivo.total} alignRight={true}
              monedaSimbolo={documentoActivo.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={documentoActivo.moneda?.nombre || monedaDefault.nombre}
              tasa={documentoActivo.tasa ?? 1}
            />
          </div>

          <DocumentosRelacionadosCard
            documentos={documentosRelacionados}
            currentId={data?.id}
          />
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
        onClose={() => operacion.reset()}
      />
    </div>
  );
};

export default FacturaSuplidorDetalle;
