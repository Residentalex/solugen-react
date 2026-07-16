import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Tabs, Tag, Spin, Button, Space, Row, Col, Grid, message, Typography, Tooltip, Descriptions, Alert
} from 'antd';
import {
  LockFilled,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { transaccionApi } from '../../api/transaccionApi';
import DetalleToolbar from '../../components/DetalleToolbar';
import type { TransaccionDTO, TransaccionAsientoDTO } from '../../types/transaccion';
import { ErrorDetalle } from '../../components';
import AsientosContableTable from '../../components/AsientosContableTable';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import LogTable from '../../components/LogTable';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import { formatCurrency } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { obtenerNombreSucursal } from '../../utils/sucursalEnumMapper';

import ModalAnular from '../../components/ModalAnular/ModalAnular';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import SucursalField from '../../components/SucursalField';
import { documentoRelacionApi, type DocumentoRelacionDTO } from '../../api/documentoRelacionApi';
import CobrosCard from '../../components/CobrosCard';
import TransaccionesAsociadasCard from '../../components/TransaccionesAsociadasCard';

const { Text } = Typography;

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function toTitleCase(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(val: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const AsientoContableDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const { screenCode, documentCode } = useScreenConfig();
  const screens = Grid.useBreakpoint();

  const [data, setData] = useState<TransaccionDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [documentosRelacionados, setDocumentosRelacionados] = React.useState<DocumentoRelacionDTO[]>([]);
  const [modalAnularOpen, setModalAnularOpen] = useState(false);
  const [modalDesaplicarOpen, setModalDesaplicarOpen] = useState(false);

  useEffect(() => {
    setActiveModule(screenCode);
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      message.error('ID de transacción inválido');
      setLoading(false);
      return;
    }
    transaccionApi.obtenerPorId(sucursalActiva, idNum)
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`${res.noDocumento || `Transacción #${res.id}`}`);
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el detalle del asiento contable';
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  React.useEffect(() => {
    if (!data?.id) return;
    documentoRelacionApi.obtenerPorTransaccion(data.id, sucursalActiva)
      .then(rel => setDocumentosRelacionados(rel || []))
      .catch(() => {
        setDocumentosRelacionados([]);
      });
  }, [data?.id, sucursalActiva]);

  const asientosMapeados = React.useMemo(() =>
    (data?.asientos || []).map(a => ({
      ...a,
      cuentaContable: {
        noCuenta: (a as any).cuentaContable?.noCuenta || a.noCuenta || '',
        nombre: (a as any).cuentaContable?.nombre || '',
      },
    })), [data?.asientos]);

  const handleRefresh = useCallback(() => {
    if (!id) return;
    setLoadingError(false);
    setData(null);
    setLoading(true);
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      message.error('ID de transacción inválido');
      setLoading(false);
      return;
    }
    transaccionApi.obtenerPorId(sucursalActiva, idNum)
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`${res.noDocumento || `Transacción #${res.id}`}`);
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el detalle del asiento contable';
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  const recargar = useCallback(async () => {
    if (!data?.id) return;
    const res = await transaccionApi.obtenerPorId(sucursalActiva, data.id);
    if (res) setData(res);
  }, [data?.id, sucursalActiva]);

  if (loading || (!data && !loadingError)) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando asiento contable...</div>
      </div>
    );
  }
  if (loadingError && !data) {
    return <ErrorDetalle mensaje="Error al cargar el documento" rutaVolver="/FAsientoContable" onRecargar={handleRefresh} />;
  }
  if (!data) return null;

  const isLarge = screens.xxl === true;
  const estadoInfo = ESTADO_DOCUMENTO_MAP[toEstadoNum(data.estado)] || { label: 'Desconocido', color: 'default' };
  const esCerrado = toPeriodoNum(data.periodo) === 6;
  const esReverso = data.reversoID != null && data.reversoID > 0;

  const handlePostear = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await transaccionApi.postear(sucursalActiva, data);
      message.success('Documento posteado correctamente');
      await recargar();
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al postear';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAplicar = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await transaccionApi.aplicar(sucursalActiva, data.id);
      message.success('Documento aplicado correctamente');
      await recargar();
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al aplicar';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDesaplicarConfirm = async (motivo: string) => {
    if (!data) return;
    setSaving(true);
    const documento = `${data.documento?.codigo || ''}-${data.noDocumento || ''}`;
    try {
      await transaccionApi.desaplicar(sucursalActiva, documento);
      message.success('Documento desaplicado correctamente');
      setModalDesaplicarOpen(false);
      await recargar();
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al desaplicar';
      message.error(msg);
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
      await transaccionApi.anular(sucursalActiva, dto);
      message.success('Documento anulado correctamente');
      setModalAnularOpen(false);
      await recargar();
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al anular';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle del asiento contable"
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
        estado={data.estado}
        periodo={data.periodo}
        saving={saving}
        imprimiendo={imprimiendo}
        onVolver={() => navigate(-1)}
        onImprimir={async () => {
          setImprimiendo(true);
          try {
            message.info('Funcionalidad de impresión en desarrollo');
          } catch {
            message.error('Error al generar el PDF');
          } finally {
            setImprimiendo(false);
          }
        }}
        onEditar={() => navigate(`/FAsientoContable/${data.id}/editar`)}
        onAplicar={handleAplicar}
        onAnular={async () => setModalAnularOpen(true)}
        onPostear={handlePostear}
        onDesaplicar={async () => setModalDesaplicarOpen(true)}
      />

      {isLarge ? (
        /* Desktop layout */
        <Row gutter={16}>
          <Col lg={18}>
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
                <Descriptions.Item label="Fecha:">
                  {formatDate(data.fechaDocumento)}
                </Descriptions.Item>
                <Descriptions.Item label="Concepto:">
                  {data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : toTitleCase(data.concepto?.nombre || data.codigoConcepto || '-')}
                </Descriptions.Item>
                <Descriptions.Item label="NCF:">
                  {data.ncf || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Referencia:">
                  {data.referencia || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Sucursal:">
                  <SucursalField codigoSucursal={data.codigoSucursal} sucursal={data.sucursal} />
                </Descriptions.Item>
                <Descriptions.Item label="NCF Modificado:">
                  {data.ncfModificado || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Nota:" span={3}>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Tabs
              defaultActiveKey="asientos"
              type="card"
              items={[
                {
                  key: 'asientos',
                  label: `Asientos (${data.asientos?.length || 0})`,
                  children: (
<AsientosContableTable asientos={asientosMapeados} scroll={{ x: 600 }} rowKey={(r) => `${r.id || ''}`} />
                  ),
                },
                {
                  key: 'documentos',
                  label: `Documentos Asociados (${data.transaccionesAsociadas?.length || 0})`,
                  children: (
                    <TransaccionesAsociadasCard documentos={data.transaccionesAsociadas || []} readOnly />
                  ),
                },
                {
                  key: 'historial',
                  label: `Historial (${data.logs?.length || 0})`,
                  children: (
                    <LogTable dataSource={data.logs || []} scroll={{ x: 800 }} />
                  ),
                },
                {
                  key: 'cobros',
                  label: `Cobros (${data.cobros?.length || 0})`,
                  children: (
                    <CobrosCard cobros={data.cobros || []} />
                  ),
                },
              ]}
            />
          </Col>

          <Col lg={6}>
            <EntidadCard entidad={data.entidad as any} fallbackTitulo="Entidad" />
            <DocumentosRelacionadosCard
              documentos={documentosRelacionados}
              currentId={data?.id}
            />
            <TotalesCard
              subTotal={data.subTotal}
              descuento={data.descuento}
              impuestos={data.impuestos}
              total={data.total}
              monedaSimbolo={data.codigoMoneda || getMonedaSucursalActiva().codigo}
              tasa={data.tasa ?? 1}
            />
          </Col>
        </Row>
      ) : (
        /* Mobile layout */
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
              <Descriptions.Item label="Fecha:">{formatDate(data.fechaDocumento)}</Descriptions.Item>
              <Descriptions.Item label="Concepto:">{data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : toTitleCase(data.concepto?.nombre || data.codigoConcepto || '-')}</Descriptions.Item>
              <Descriptions.Item label="NCF:">{data.ncf || '-'}</Descriptions.Item>
              <Descriptions.Item label="Referencia:">{data.referencia || '-'}</Descriptions.Item>
              <Descriptions.Item label="Sucursal:"><SucursalField codigoSucursal={data.codigoSucursal} sucursal={data.sucursal} /></Descriptions.Item>
              <Descriptions.Item label="NCF Modificado:">{data.ncfModificado || '-'}</Descriptions.Item>
              <Descriptions.Item label="Nota:"><span style={{ whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</span></Descriptions.Item>
            </Descriptions>
          </Card>

          <div style={{ marginTop: 24 }}>
            <TotalesCard
              subTotal={data.subTotal}
              descuento={data.descuento}
              impuestos={data.impuestos}
              total={data.total}
              monedaSimbolo={data.codigoMoneda || getMonedaSucursalActiva().codigo}
              tasa={data.tasa ?? 1}
              alignRight
            />
          </div>

          <Tabs
            defaultActiveKey="asientos"
            type="card"
            items={[
              {
                key: 'asientos',
                label: `Asientos (${data.asientos?.length || 0})`,
                children: (
                  <AsientosContableTable asientos={asientosMapeados} scroll={{ x: 600 }} rowKey={(r) => `${r.id || ''}`} />
                ),
              },
              {
                key: 'documentos',
                label: `Documentos Asociados (${data.transaccionesAsociadas?.length || 0})`,
                children: (
                  <TransaccionesAsociadasCard documentos={data.transaccionesAsociadas || []} readOnly />
                ),
              },
              {
                key: 'historial',
                label: `Historial (${data.logs?.length || 0})`,
                children: (
                  <LogTable dataSource={data.logs || []} scroll={{ x: 800 }} />
                ),
              },
              {
                key: 'cobros',
                label: `Cobros (${data.cobros?.length || 0})`,
                children: (
                  <CobrosCard cobros={data.cobros || []} />
                ),
              },
            ]}
          />
        </div>
      )}

      <ModalDesaplicar
        open={modalDesaplicarOpen}
        onClose={() => setModalDesaplicarOpen(false)}
        onConfirm={handleDesaplicarConfirm}
      />
      <ModalAnular
        open={modalAnularOpen}
        onClose={() => setModalAnularOpen(false)}
        onConfirm={handleAnularConfirm}
        documento={`${data.documento?.codigo || ''}-${data.noDocumento || ''}`}
        fechaDocumento={data.fechaDocumento}
        periodoCerrado={esCerrado}
      />
    </div>
  );
};

export default AsientoContableDetalle;
