import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message, Tooltip, Modal, Alert, App
} from 'antd';
import {
  LockFilled,
  IdcardOutlined, PhoneOutlined, EnvironmentOutlined,
  FileTextOutlined, FileSearchOutlined,
  ExclamationCircleOutlined, RedoOutlined,
} from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import ModalAnular from '../../components/ModalAnular/ModalAnular';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { facturaSuplidorApi } from '../../api/facturaSuplidorApi';
import { transaccionApi } from '../../api/transaccionApi';
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
import ErrorDetalle from '../../components/ErrorDetalle';
import TransaccionesAsociadasCard from '../../components/TransaccionesAsociadasCard';

const FacturaSuplidorDetalle: React.FC = () => {
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

  const { message: messageApi } = App.useApp();
  const operacion = useAplicar();
  const screens = Grid.useBreakpoint();

  useEffect(() => {
    setActiveModule('FRDE');
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

    // Validar scanner (ya existe)
    if (tieneScan === false) {
      messageApi.warning('Debe escanear la factura antes de aplicar.');
      return;
    }

    // Mejora F15: Validar FechaPermitida del documento
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
    if (data.estado !== 1) {
      messageApi.info('Debe aplicar el documento antes de postear.');
      return;
    }
    setOperacionTitulo(`Posteando RDE-${data?.noDocumento || id}`);
    operacion.ejecutar(
      `/RDE/${sucursalActiva}/postear`,
      handleRefresh,
      data
    );
  };

  const handleDesaplicarConfirm = async (_motivo: string) => {
    if (!id || !data) return;
    setSaving(true);
    try {
      const origen = obtenerNombreEnumSucursal(data.codigoSucursal || String(sucursalActiva));
      const documento = `${data.documento.codigo}-${data.noDocumento}`;
      await facturaSuplidorApi.desaplicar(origen, documento);
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

  const isLarge = screens.xxl === true;
  const estadoInfo = ESTADO_DOCUMENTO_MAP[data.estado] || { label: 'Desconocido', color: 'default' };
  const esCerrado = data.periodo === 6;
  const tienePagos = pagosAsociados.length > 0;

  // asientoColumns reemplazado por AsientosContableTable compartido

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
        estado={data.estado}
        periodo={data.periodo}
        revisado={data.revisado}
        saving={saving}
        imprimiendo={imprimiendo}
        operacionLoading={operacion?.loading}
        onVolver={() => navigate('/FRDE')}
        onImprimir={async () => {
          setImprimiendo(true);
          try {
            const res = await apiClient.get(`/reportes/contabilidad/facturaSuplidor/${data.codigoSucursal ? obtenerNombreEnumSucursal(data.codigoSucursal) : sucursalActiva}/${id}`, {
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
          <Button
            icon={<RedoOutlined />}
            onClick={handleRecalcular}
            loading={recalculando}
            disabled={data.estado !== 1}
          >
            Recalcular
          </Button>
        }
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
                <Descriptions.Item label="Documento">{data.noDocumento || '-'}</Descriptions.Item>
                <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
                <Descriptions.Item label="Concepto">{data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
                <Descriptions.Item label="Referencia">{data.referencia || '-'}</Descriptions.Item>

                <Descriptions.Item label="Tasa">{data.tasa ? formatNumber(data.tasa) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Vencimiento">{data.fechaVencimiento ? formatDate(data.fechaVencimiento) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Tipo Compra">{data.tipoCompra === 'C' ? 'Contado' : data.tipoCompra === 'D' ? 'Crédito' : data.tipoCompra || '-'}</Descriptions.Item>
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
                      readOnly={false}
                    />
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
            <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} retenciones={data.retenciones} total={data.total} nota={data.nota} alignRight={false}
              monedaSimbolo={data.moneda?.simbolo || 'RD$'}
              monedaNombre={data.moneda?.nombre || 'Peso Dominicano'}
              tasa={data.tasa ?? 1}
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
                <Descriptions.Item label="Documento">{data.noDocumento || '-'}</Descriptions.Item>
                <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
                <Descriptions.Item label="Concepto">{data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
                <Descriptions.Item label="Referencia">{data.referencia || '-'}</Descriptions.Item>

                <Descriptions.Item label="Tasa">{data.tasa ? formatNumber(data.tasa) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Vencimiento">{data.fechaVencimiento ? formatDate(data.fechaVencimiento) : '-'}</Descriptions.Item>
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
                    readOnly={false}
                  />
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
            <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} retenciones={data.retenciones} total={data.total} nota={data.nota} alignRight={true}
              monedaSimbolo={data.moneda?.simbolo || 'RD$'}
              monedaNombre={data.moneda?.nombre || 'Peso Dominicano'}
              tasa={data.tasa ?? 1}
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
    </div>
  );
};

export default FacturaSuplidorDetalle;
