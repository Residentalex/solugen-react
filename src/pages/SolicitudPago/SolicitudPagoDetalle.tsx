import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Typography, Tooltip, Descriptions, Alert, Modal, App,
} from 'antd';
import {
  LockFilled,
  FileTextOutlined,
  FileSearchOutlined,
  IdcardOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { solicitudPagoApi } from '../../api/solicitudPagoApi';
import { documentoRelacionApi, type DocumentoRelacionDTO } from '../../api/documentoRelacionApi';
import { obtenerNombreEnumSucursal } from '../../utils/sucursalEnumMapper';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import type { AsientoContableDTO, LogDTO } from '../../types/entradaAlmacen';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import { formatCurrency, formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';
import ErrorDetalle from '../../components/ErrorDetalle';

const { Text } = Typography;

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

// Helper para obtener string de fields que pueden ser string u objeto
function strVal(val: any, fallback = '-'): string {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return val.nombre || val.codigo || fallback;
  return String(val);
}

const SolicitudPagoDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tieneScan, setTieneScan] = useState<boolean | null>(null);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [scannerUrl, setScannerUrl] = useState<string | null>(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [documentosRelacionados, setDocumentosRelacionados] = useState<DocumentoRelacionDTO[]>([]);

  const operacion = useAplicar();
  const [operacionTitulo, setOperacionTitulo] = useState('');

  // Módulo activo
  useEffect(() => {
    setActiveModule('FSPA');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  // Cargar documentos relacionados
  useEffect(() => {
    if (!data?.id) return;
    documentoRelacionApi.obtenerPorTransaccion(data.id)
      .then(rel => setDocumentosRelacionados(rel || []))
      .catch(() => {
        setDocumentosRelacionados([]);
        message.warning('No se pudieron cargar los documentos relacionados');
      });
  }, [data?.id]);

  // Carga inicial
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    solicitudPagoApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`SPA-${res.noDocumento || id}`);
        // Verificar scanner
        solicitudPagoApi.verificarScan(sucursalActiva, parseInt(id))
          .then((scanRes) => setTieneScan(scanRes.existe))
          .catch(() => setTieneScan(false));
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar la solicitud de pago';
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  const handleRefresh = useCallback(() => {
    if (!id) return;
    setLoadingError(false);
    solicitudPagoApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`SPA-${res.noDocumento || id}`);
        solicitudPagoApi.verificarScan(sucursalActiva, parseInt(id))
          .then((scanRes) => setTieneScan(scanRes.existe))
          .catch(() => setTieneScan(false));
        // Cargar documentos relacionados desde DOCUMENTOS_RELACION
        documentoRelacionApi.obtenerPorTransaccion(parseInt(id))
          .then(rel => setDocumentosRelacionados(rel || []))
          .catch(() => setDocumentosRelacionados([]));
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        message.error(msg);
        setLoadingError(true);
      })
  }, [id, sucursalActiva, setPageTitleOverride]);

  // === Scanner ===
  const handleVerScanner = async () => {
    if (!id) return;
    setScannerLoading(true);
    try {
      const blob = await solicitudPagoApi.descargarScan(sucursalActiva, parseInt(id));
      const url = URL.createObjectURL(blob);
      setScannerUrl(url);
      setScannerModalOpen(true);
    } catch (err: any) {
      message.error('Error al cargar el archivo escaneado');
    } finally {
      setScannerLoading(false);
    }
  };

  // === Handlers de estado ===
  const handleDesaplicar = async () => {
    if (!id || !data) return;
    setSaving(true);
    try {
      const origen = obtenerNombreEnumSucursal(data.codigoSucursal || String(sucursalActiva));
      const documento = `${data.documento?.codigo || data.documento || ''}-${data.noDocumento}`;
      await solicitudPagoApi.desaplicar(origen, documento);
      message.success('Documento desaplicado exitosamente');
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
    if (tieneScan === false) {
      message.warning('Debe escanear el documento antes de aplicar.');
      return;
    }
    setOperacionTitulo(`Aplicando SPA-${data?.noDocumento || id}`);
    operacion.ejecutar(`/SPA/${sucursalActiva}/aplicar/${id}`, handleRefresh);
  };

  const handleAnular = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await solicitudPagoApi.anular(sucursalActiva, data as any);
      message.success('Documento anulado exitosamente');
      const res = await solicitudPagoApi.obtenerPorId(sucursalActiva, parseInt(id!));
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
    setOperacionTitulo(`Posteando SPA-${data?.noDocumento || id}`);
    operacion.ejecutar(
      `/SPA/${sucursalActiva}/postear`,
      handleRefresh,
      data
    );
  };

  const handleRevisado = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await solicitudPagoApi.revisado(sucursalActiva, parseInt(id));
      message.success('Documento marcado como revisado');
      const res = await solicitudPagoApi.obtenerPorId(sucursalActiva, parseInt(id));
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
      await solicitudPagoApi.reversar(sucursalActiva, parseInt(id));
      message.success('Documento reversado exitosamente');
      const res = await solicitudPagoApi.obtenerPorId(sucursalActiva, parseInt(id));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al reversar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // === Early returns ===
  if (loading || (!data && !loadingError)) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando solicitud de pago...</div>
      </div>
    );
  }

  if (loadingError && !data) { return <ErrorDetalle rutaVolver="/FSOLP" onRecargar={handleRefresh} />; }

  if (!data) return null;

  const isLarge = screens.xxl === true;
  const estadoInfo = ESTADO_DOCUMENTO_MAP[data.estado] || { label: 'Desconocido', color: 'default' };
  const esCerrado = data.periodo === 6;

  // asientoColumns reemplazado por AsientosContableTable compartido

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle de solicitud de pago"
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
        modulo="FSPA"
        estado={data.estado}
        periodo={data.periodo}
        revisado={data.revisado}
        saving={saving}
        operacionLoading={operacion?.loading}
        onVolver={() => navigate('/FSPA')}
        onEditar={() => navigate(`/FSPA/${id}/editar`)}
        onAplicar={handleAplicar}
        onAnular={handleAnular}
        onPostear={handlePostear}
        onRevisado={handleRevisado}
        onDesaplicar={handleDesaplicar}
        onReversar={handleReversar}
        showImprimir={false}
      />

      {isLarge ? (
        /* === DESKTOP LAYOUT (≥ lg) === */
        <Row gutter={16}>
          <Col xxl={18}>
            {/* Datos Generales */}
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
                    <Tooltip title="Ver documento escaneado">
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
              <Descriptions bordered size="small" column={3} styles={{ content: { background: 'transparent' } }}>
                <Descriptions.Item label="Documento">{strVal(data.documento)}</Descriptions.Item>
                <Descriptions.Item label="Fecha">{formatDate(data.fecha)}</Descriptions.Item>
                <Descriptions.Item label="Concepto">{strVal(data.concepto)}</Descriptions.Item>
                <Descriptions.Item label="Entidad">{strVal(data.entidad)}</Descriptions.Item>
                <Descriptions.Item label="Referencia">{data.referencia || '-'}</Descriptions.Item>
                <Descriptions.Item label="Cuenta Bancaria">{data.cuentaBancaria || '-'}</Descriptions.Item>
                <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
                <Descriptions.Item label="No. Documento">{data.noDocumento || '-'}</Descriptions.Item>
                <Descriptions.Item label="Nota" span={3}>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Tabs */}
            <Tabs
              defaultActiveKey="detalles"
              type="card"
              items={[
                {
                  key: 'detalles',
                  label: 'Detalles',
                  children: (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      <span className="paces-text-secondary">Sin detalles de artículos</span>
                    </div>
                  ),
                },
                {
                  key: 'asientos',
                  label: `Asientos (${data.asientos?.length || 0})`,
                  children: (
                    <AsientosContableTable asientos={data.asientos || []} scroll={{ x: 900 }} />
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
            <EntidadCard entidad={{
              nombre: typeof data.entidad === 'string' ? data.entidad : data.entidad?.nombre || '',
              identificacion: data.entidad?.identificacion || '',
              telefono: data.entidad?.telefono || '',
              direccion: data.entidad?.direccion || '',
            }} fallbackTitulo="Entidad" />
            <TotalesCard
              subTotal={data.subTotal ?? data.total ?? 0}
              descuento={data.descuento ?? 0}
              impuestos={data.impuestos ?? 0}
              retenciones={data.retenciones ?? 0}
              total={data.total ?? 0}
              nota={data.nota || ''}
              alignRight={false}
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
                  <Tooltip title="Ver documento escaneado">
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
              <Descriptions.Item label="Documento">{strVal(data.documento)}</Descriptions.Item>
              <Descriptions.Item label="Fecha">{formatDate(data.fecha)}</Descriptions.Item>
              <Descriptions.Item label="Concepto">{strVal(data.concepto)}</Descriptions.Item>
              <Descriptions.Item label="Entidad">{strVal(data.entidad)}</Descriptions.Item>
              <Descriptions.Item label="Referencia">{data.referencia || '-'}</Descriptions.Item>
              <Descriptions.Item label="Cuenta Bancaria">{data.cuentaBancaria || '-'}</Descriptions.Item>
              <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
              <Descriptions.Item label="No. Documento">{data.noDocumento || '-'}</Descriptions.Item>
              <Descriptions.Item label="Nota">
                <span style={{ whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</span>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Tabs
            defaultActiveKey="detalles"
            type="card"
            items={[
              {
                key: 'detalles',
                label: 'Detalles',
                children: (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <span className="paces-text-secondary">Sin detalles de artículos</span>
                  </div>
                ),
              },
              {
                key: 'asientos',
                label: `Asientos (${data.asientos?.length || 0})`,
                children: (
                  <AsientosContableTable asientos={data.asientos || []} scroll={{ x: 900 }} />
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
            <TotalesCard
              subTotal={data.subTotal ?? data.total ?? 0}
              descuento={data.descuento ?? 0}
              impuestos={data.impuestos ?? 0}
              retenciones={data.retenciones ?? 0}
              total={data.total ?? 0}
              nota={data.nota || ''}
              alignRight={true}
              monedaSimbolo={data.moneda?.simbolo || 'RD$'}
              monedaNombre={data.moneda?.nombre || 'Peso Dominicano'}
              tasa={data.tasa ?? 1}
            />

          <DocumentosRelacionadosCard
            documentos={documentosRelacionados}
            currentId={data?.id}
          />
          </div>
        </div>
      )}

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

export default SolicitudPagoDetalle;
