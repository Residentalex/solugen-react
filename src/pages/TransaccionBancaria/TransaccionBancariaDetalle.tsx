import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Typography, Tooltip, Descriptions, Alert, Switch, App,
} from 'antd';
import {
  LockFilled,
} from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { transaccionBancariaApi } from '../../api/transaccionBancariaApi';
import TransaccionesAsociadasCard from '../../components/TransaccionesAsociadasCard/TransaccionesAsociadasCard';
import SucursalField from '../../components/SucursalField';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import type { AsientoContableDTO, LogDTO } from '../../types/entradaAlmacen';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import { formatCurrency, formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import ErrorDetalle from '../../components/ErrorDetalle';
import type { TransaccionDTO } from '../../types/transaccion';

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

// Normaliza TransaccionDTO a un objeto compatible con el template existente
function normalizarTransaccion(t: TransaccionDTO): any {
  const monedaSimbolo = t.codigoMoneda === 'DOP' ? 'RD$' : t.codigoMoneda === 'USD' ? 'US$' : '$';
  const monedaNombre = t.codigoMoneda || '';
  return {
    ...t,
    // Alias para compatibilidad con el template
    fecha: t.fechaDocumento,
    cuentaBancaria: t.ctaBancaria || '',
    moneda: t.codigoMoneda ? { simbolo: monedaSimbolo, nombre: monedaNombre } : undefined,
    // entidad: si es objeto {codigo, nombre}, usar el nombre como string; si ya es string, dejarlo
    entidad:
      typeof t.entidad === 'object' && t.entidad !== null
        ? (t.entidad as any).nombre || (t.entidad as any).codigo || '-'
        : t.entidad || '-',
    // documento: normalizar a objeto {codigo, nombre}
    documento:
      typeof t.documento === 'object' && t.documento !== null
        ? t.documento
        : { codigo: t.documento || (t as any).codigoTipo || '', nombre: '' },
    // concepto: normalizar a objeto {codigo, nombre}
    concepto:
      typeof t.concepto === 'object' && t.concepto !== null
        ? t.concepto
        : { codigo: '', nombre: t.concepto || '' },
  };
}

const TransaccionBancariaDetalle: React.FC = () => {
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
    transaccionBancariaApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        const normalizado = normalizarTransaccion(res);
        setData(normalizado);
        setPageTitleOverride(`${strVal(normalizado.documento)}-${normalizado.noDocumento || id}`);
        // Si el documento está anulado y tiene reversoID, cargar el reverso
        if (toEstadoNum(res.estado) === 3 && (res as any).reversoID) {
          transaccionBancariaApi.obtenerPorId(sucursalActiva, (res as any).reversoID)
            .then((revRes) => setReversoData(normalizarTransaccion(revRes)))
            .catch(() => setReversoData(null));
        } else {
          setReversoData(null);
          setMostrandoReverso(false);
        }
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar la transacción bancaria';
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  const handleRefresh = useCallback(() => {
    if (!id) return;
    setLoadingError(false);
    transaccionBancariaApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        const normalizado = normalizarTransaccion(res);
        setData(normalizado);
        setPageTitleOverride(`${strVal(normalizado.documento)}-${normalizado.noDocumento || id}`);
        if (toEstadoNum(res.estado) === 3 && (res as any).reversoID) {
          transaccionBancariaApi.obtenerPorId(sucursalActiva, (res as any).reversoID)
            .then((revRes) => setReversoData(normalizarTransaccion(revRes)))
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
      const docCodigo = data.documento?.codigo || (typeof data.documento === 'string' ? data.documento : '');
      const documento = `${docCodigo}-${data.noDocumento}`;
      await transaccionBancariaApi.desaplicarDocBancario(
        sucursalActiva,
        documento,
        data.ctaBancaria || ''
      );
      message.success('Documento desaplicado exitosamente');
      handleRefresh();
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al desaplicar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAplicar = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await transaccionBancariaApi.aplicar(sucursalActiva, parseInt(id));
      message.success('Documento aplicado exitosamente');
      handleRefresh();
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
      await transaccionBancariaApi.anular(sucursalActiva, data as any);
      message.success('Documento anulado exitosamente');
      const res = await transaccionBancariaApi.obtenerPorId(sucursalActiva, parseInt(id!));
      const normalizado = normalizarTransaccion(res);
      setData(normalizado);
      if (toEstadoNum(res.estado) === 3 && (res as any).reversoID) {
        const revRes = await transaccionBancariaApi.obtenerPorId(sucursalActiva, (res as any).reversoID);
        setReversoData(normalizarTransaccion(revRes));
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

  const handlePostear = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await transaccionBancariaApi.postear(sucursalActiva, data as any);
      message.success('Documento posteado exitosamente');
      handleRefresh();
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al postear');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Actualizar el título del header al alternar entre Original/Reverso
  useEffect(() => {
    if (mostrandoReverso && reversoData) {
      const doc = reversoData as any;
      setPageTitleOverride(`${strVal(doc.documento)}-${doc.noDocumento || ''}`);
    } else if (data) {
      const doc = data as any;
      setPageTitleOverride(`${strVal(doc.documento)}-${doc.noDocumento || ''}`);
    }
  }, [mostrandoReverso, reversoData, data, setPageTitleOverride]);

  // === Early returns ===
  if (loading || (!data && !loadingError)) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando transacción bancaria...</div>
      </div>
    );
  }

  if (loadingError && !data) { return <ErrorDetalle rutaVolver="/FTransBanco" onRecargar={handleRefresh} />; }

  if (!data) return null;

  const documentoActivo = mostrandoReverso && reversoData ? reversoData : data;
  const isLarge = screens.xxl === true;
  const estadoInfo = ESTADO_DOCUMENTO_MAP[toEstadoNum(documentoActivo.estado)] || { label: 'Desconocido', color: 'default' };
  const esCerrado = toPeriodoNum(documentoActivo.periodo) === 6;

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle de transacción bancaria"
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
        modulo="FTransBanco"
        estado={documentoActivo.estado}
        periodo={documentoActivo.periodo}
        saving={saving}
        onVolver={() => navigate('/FTransBanco')}
        onEditar={() => navigate(`/FTransBanco/${id}/editar`)}
        onAplicar={handleAplicar}
        onAnular={handleAnular}
        onPostear={handlePostear}
        onDesaplicar={handleDesaplicar}
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
        /* === DESKTOP LAYOUT (≥ xxl) === */
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
                {/* Fila 1: Documento | Concepto | Cuenta Bancaria */}
                <Descriptions.Item label="Documento">{strVal(documentoActivo.documento)}</Descriptions.Item>
                <Descriptions.Item label="Concepto">{strVal(documentoActivo.concepto)}<ConceptoInfoLabel concepto={documentoActivo.concepto} /></Descriptions.Item>
                <Descriptions.Item label="Cuenta Bancaria">
                  <Text strong style={{ color: '#556ee6' }}>{documentoActivo.cuentaBancaria || '-'}</Text>
                </Descriptions.Item>

                {/* Fila 2: Fecha Doc | Entidad | Referencia */}
                <Descriptions.Item label="Fecha Doc">{formatDate(documentoActivo.fecha)}</Descriptions.Item>
                <Descriptions.Item label="Entidad">{strVal(documentoActivo.entidad)}</Descriptions.Item>
                <Descriptions.Item label="Referencia">{documentoActivo.referencia || '-'}</Descriptions.Item>

                {/* Fila 3: Sucursal | Beneficiario */}
                <Descriptions.Item label="Sucursal">
                  <SucursalField codigoSucursal={documentoActivo.codigoSucursal} />
                </Descriptions.Item>
                <Descriptions.Item label="Beneficiario">{(documentoActivo as any)?.nombreBeneficiario || '-'}</Descriptions.Item>
                <Descriptions.Item label=""> </Descriptions.Item>

                {/* Fila 4: Nota (span 3) */}
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
                  label: `Documentos Relacionados (${(data as any)?.transaccionesAsociadas?.length || 0})`,
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
              alignRight={false}
              monedaSimbolo={documentoActivo.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={documentoActivo.moneda?.nombre || monedaDefault.nombre}
              tasa={documentoActivo.tasa ?? 1}
            />
          </Col>
        </Row>
      ) : (
        /* === MOBILE LAYOUT (< xxl) === */
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
                <Descriptions.Item label="Concepto">{strVal(documentoActivo.concepto)}<ConceptoInfoLabel concepto={documentoActivo.concepto} /></Descriptions.Item>
                <Descriptions.Item label="Cuenta Bancaria">
                  <Text strong style={{ color: '#556ee6' }}>{documentoActivo.cuentaBancaria || '-'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Fecha Doc">{formatDate(documentoActivo.fecha)}</Descriptions.Item>
                <Descriptions.Item label="Entidad">{strVal(documentoActivo.entidad)}</Descriptions.Item>
                <Descriptions.Item label="Referencia">{documentoActivo.referencia || '-'}</Descriptions.Item>
                <Descriptions.Item label="Sucursal">
                  <SucursalField codigoSucursal={documentoActivo.codigoSucursal} />
                </Descriptions.Item>
                <Descriptions.Item label="Beneficiario">{(documentoActivo as any)?.nombreBeneficiario || '-'}</Descriptions.Item>
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
                label: `Documentos Relacionados (${(data as any)?.transaccionesAsociadas?.length || 0})`,
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
              alignRight={true}
              monedaSimbolo={documentoActivo.moneda?.simbolo || monedaDefault.simbolo}
              monedaNombre={documentoActivo.moneda?.nombre || monedaDefault.nombre}
              tasa={documentoActivo.tasa ?? 1}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TransaccionBancariaDetalle;
