import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Typography, Tooltip, Descriptions, Alert, Modal, App, Switch,
} from 'antd';
import {
  LockFilled,
  BankOutlined,
} from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { solicitudPagoApi } from '../../api/solicitudPagoApi';
import TransaccionesAsociadasCard from '../../components/TransaccionesAsociadasCard/TransaccionesAsociadasCard';
import SucursalField from '../../components/SucursalField';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import type { AsientoContableDTO, LogDTO } from '../../types/entradaAlmacen';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import { formatCurrency, formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
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
  const { screenCode, documentCode } = useScreenConfig();
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const monedaDefault = getMonedaSucursalActiva();
  const operacion = useAplicar();
  const [operacionTitulo, setOperacionTitulo] = useState('');
  const [sucursalDestino, setSucursalDestino] = useState<number | undefined>(undefined);
  const [mostrandoReverso, setMostrandoReverso] = useState(false);
  const [reversoData, setReversoData] = useState<any>(null);

  // Módulo activo
  useEffect(() => {
    setActiveModule(screenCode);
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

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
        // Si el documento está anulado y tiene reversoId, cargar el reverso
        if (toEstadoNum(res.estado) === 3 && (res as any).reversoID) {
          solicitudPagoApi.obtenerPorId(sucursalActiva, (res as any).reversoID)
            .then((revRes) => setReversoData(revRes))
            .catch(() => setReversoData(null));
        } else {
          setReversoData(null);
          setMostrandoReverso(false);
        }
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
        // Si el documento está anulado y tiene reversoId, cargar el reverso
        if (toEstadoNum(res.estado) === 3 && (res as any).reversoID) {
          solicitudPagoApi.obtenerPorId(sucursalActiva, (res as any).reversoID)
            .then((revRes) => setReversoData(revRes))
            .catch(() => setReversoData(null));
        } else {
          setReversoData(null);
          setMostrandoReverso(false);
        }
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        message.error(msg);
        setLoadingError(true);
      })
  }, [id, sucursalActiva, setPageTitleOverride]);

  // === Handlers de estado ===
  const handleDesaplicar = async () => {
    if (!id || !data) return;
    setSaving(true);
    try {
      const documento = `${data.documento?.codigo || data.documento || ''}-${data.noDocumento}`;
      await solicitudPagoApi.desaplicar(sucursalActiva, documento);
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
      if (toEstadoNum(res.estado) === 3 && (res as any).reversoID) {
        const revRes = await solicitudPagoApi.obtenerPorId(sucursalActiva, (res as any).reversoID);
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
      if (toEstadoNum(res.estado) === 3 && (res as any).reversoID) {
        const revRes = await solicitudPagoApi.obtenerPorId(sucursalActiva, (res as any).reversoID);
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

  const handleGenerarPago = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const idDocBancario = await solicitudPagoApi.generarPago(sucursalActiva, parseInt(id));
      message.success('Pago generado exitosamente');
      navigate(`/FTransBanco/${idDocBancario}`);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al generar pago');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Actualizar el título del header al alternar entre Original/Reverso
  useEffect(() => {
    if (mostrandoReverso && reversoData) {
      const doc = reversoData as any;
      setPageTitleOverride(`SPA-${doc.noDocumento || ''}`);
    } else if (data) {
      const doc = data as any;
      setPageTitleOverride(`SPA-${doc.noDocumento || ''}`);
    }
  }, [mostrandoReverso, reversoData, data, setPageTitleOverride]);

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

  const documentoActivo = mostrandoReverso && reversoData ? reversoData : data;
  const isLarge = screens.xxl === true;
  const estadoInfo = ESTADO_DOCUMENTO_MAP[toEstadoNum(documentoActivo.estado)] || { label: 'Desconocido', color: 'default' };
  const esCerrado = toPeriodoNum(documentoActivo.periodo) === 6;

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
        estado={documentoActivo.estado}
        periodo={documentoActivo.periodo}
        revisado={documentoActivo.revisado}
        saving={saving}
        operacionLoading={operacion?.loading}
        onVolver={() => navigate(-1)}
        onEditar={() => navigate(`/FSPA/${id}/editar`)}
        onAplicar={handleAplicar}
        onAnular={handleAnular}
        onPostear={handlePostear}
        onRevisado={handleRevisado}
        onDesaplicar={handleDesaplicar}
        onReversar={handleReversar}
        showImprimir={false}
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
            {toEstadoNum(data?.estado) === 2 && (data as any)?.tipoPagoCodigo && (
              <>
                <Divider type="vertical" />
                <Button
                  type="primary"
                  icon={<BankOutlined />}
                  onClick={handleGenerarPago}
                  loading={saving}
                >
                  Generar {(data as any)?.tipoPagoCodigo}
                </Button>
              </>
            )}
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
                </Space>
              </div>
            } style={{ marginBottom: 16 }}>
              <Descriptions bordered size="small" column={3} styles={{ content: { background: 'transparent' } }}>
                <Descriptions.Item label="Documento">{strVal(documentoActivo.documento)}</Descriptions.Item>
                <Descriptions.Item label="Fecha">{formatDate(documentoActivo.fecha)}</Descriptions.Item>
                <Descriptions.Item label="Concepto">{strVal(documentoActivo.concepto)}<ConceptoInfoLabel concepto={documentoActivo.concepto} /></Descriptions.Item>
                <Descriptions.Item label="Tipo">
                  {documentoActivo.tipo ? `${documentoActivo.tipo.codigo} - ${toTitleCase(documentoActivo.tipo.nombre)}` : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Entidad">{strVal(documentoActivo.entidad)}</Descriptions.Item>
                <Descriptions.Item label="Sucursal:">
                  <SucursalField codigoSucursal={documentoActivo.codigoSucursal} />
                </Descriptions.Item>
                <Descriptions.Item label="Cuenta Bancaria">{documentoActivo.cuentaBancaria || '-'}</Descriptions.Item>
                <Descriptions.Item label="NCF">{documentoActivo.ncf || '-'}</Descriptions.Item>
                <Descriptions.Item label="No. Documento">{documentoActivo.noDocumento || '-'}</Descriptions.Item>
                <Descriptions.Item label="Nota" span={3}>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{documentoActivo.nota || '-'}</span>
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
                  label: `Documentos Asociados (${(data as any)?.transaccionesAsociadas?.length || 0})`,
                  children: (
                    <TransaccionesAsociadasCard
                      documentos={(data as any)?.transaccionesAsociadas || []}
                      readOnly={false}
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
            <EntidadCard entidad={{
              nombre: typeof documentoActivo.entidad === 'string' ? documentoActivo.entidad : documentoActivo.entidad?.nombre || '',
              identificacion: documentoActivo.entidad?.identificacion || '',
              telefono: documentoActivo.entidad?.telefono || '',
              direccion: documentoActivo.entidad?.direccion || '',
            }} fallbackTitulo="Entidad" />
            <TotalesCard
              subTotal={documentoActivo.subTotal ?? documentoActivo.total ?? 0}
              descuento={documentoActivo.descuento ?? 0}
              impuestos={documentoActivo.impuestos ?? 0}
              retenciones={documentoActivo.retenciones ?? 0}
              total={documentoActivo.total ?? 0}
              nota={documentoActivo.nota || ''}
              alignRight={false}
              monedaSimbolo={documentoActivo.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={documentoActivo.moneda?.nombre || monedaDefault.nombre}
              tasa={documentoActivo.tasa ?? 1}
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
                </Space>
              </div>
            } style={{ marginBottom: 16 }}>
              <Descriptions bordered size="small" column={1} styles={{ content: { background: 'transparent' } }}>
              <Descriptions.Item label="Documento">{strVal(documentoActivo.documento)}</Descriptions.Item>
              <Descriptions.Item label="Fecha">{formatDate(documentoActivo.fecha)}</Descriptions.Item>
              <Descriptions.Item label="Concepto">{strVal(documentoActivo.concepto)}<ConceptoInfoLabel concepto={documentoActivo.concepto} /></Descriptions.Item>
              <Descriptions.Item label="Tipo">
                {documentoActivo.tipo ? `${documentoActivo.tipo.codigo} - ${toTitleCase(documentoActivo.tipo.nombre)}` : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Entidad">{strVal(documentoActivo.entidad)}</Descriptions.Item>
              <Descriptions.Item label="Sucursal:">
                  <SucursalField codigoSucursal={documentoActivo.codigoSucursal} />
                </Descriptions.Item>
              <Descriptions.Item label="Cuenta Bancaria">{documentoActivo.cuentaBancaria || '-'}</Descriptions.Item>
              <Descriptions.Item label="NCF">{documentoActivo.ncf || '-'}</Descriptions.Item>
              <Descriptions.Item label="No. Documento">{documentoActivo.noDocumento || '-'}</Descriptions.Item>
              <Descriptions.Item label="Nota">
                <span style={{ whiteSpace: 'pre-wrap' }}>{documentoActivo.nota || '-'}</span>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Tabs
            defaultActiveKey="detalles"
            type="card"
            items={[
              {
                key: 'detalles',
                label: `Documentos Asociados (${(data as any)?.transaccionesAsociadas?.length || 0})`,
                children: (
                  <TransaccionesAsociadasCard
                    documentos={(data as any)?.transaccionesAsociadas || []}
                    readOnly={false}
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
            <TotalesCard
              subTotal={documentoActivo.subTotal ?? documentoActivo.total ?? 0}
              descuento={documentoActivo.descuento ?? 0}
              impuestos={documentoActivo.impuestos ?? 0}
              retenciones={documentoActivo.retenciones ?? 0}
              total={documentoActivo.total ?? 0}
              nota={documentoActivo.nota || ''}
              alignRight={true}
              monedaSimbolo={documentoActivo.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={documentoActivo.moneda?.nombre || monedaDefault.nombre}
              tasa={documentoActivo.tasa ?? 1}
            />
          </div>
        </div>
      )}

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
