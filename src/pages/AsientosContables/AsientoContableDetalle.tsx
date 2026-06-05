import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Tabs, Tag, Spin, Button, Space, Row, Col, Grid, message, Typography, Tooltip, Descriptions, Alert
} from 'antd';
import {
  ArrowLeftOutlined,
  PrinterOutlined,
  LockFilled,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { transaccionApi } from '../../api/transaccionApi';
import type { TransaccionDTO, TransaccionAsientoDTO } from '../../types/transaccion';
import { ErrorDetalle } from '../../components';
import AsientosContableTable from '../../components/AsientosContableTable';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';

const { Text } = Typography;

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(n);
}

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
  const screens = Grid.useBreakpoint();

  const [data, setData] = useState<TransaccionDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);

  useEffect(() => {
    setActiveModule('FAsientoContable');
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

  if (loading || (!data && !loadingError)) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando asiento contable...</div>
      </div>
    );
  }
  if (loadingError && !data) {
    return <ErrorDetalle mensaje="Error al cargar el documento" rutaVolver="/FAsientoContable" />;
  }
  if (!data) return null;

  const isLarge = screens.lg ?? true;
  const estadoInfo = ESTADO_DOCUMENTO_MAP[data.estado] || { label: 'Desconocido', color: 'default' };
  const esCerrado = data.periodo === 6;

  // Mapear TransaccionAsientoDTO al formato esperado por AsientosContableTable
  const asientosMapeados = React.useMemo(() =>
    (data.asientos || []).map(a => ({
      ...a,
      cuentaContable: { noCuenta: a.noCuenta || '', nombre: '' },
    })), [data.asientos]);

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle del asiento contable"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => { setLoadingError(false); window.location.reload(); }}>
              Reintentar
            </Button>
          }
        />
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/FAsientoContable')}>
          Volver
        </Button>
        <div style={{ flex: 1 }} />
        <Space>
          <Button icon={<PrinterOutlined />} loading={imprimiendo} onClick={async () => {
            setImprimiendo(true);
            try {
              message.info('Funcionalidad de impresión en desarrollo');
            } catch {
              message.error('Error al generar el PDF');
            } finally {
              setImprimiendo(false);
            }
          }} />
        </Space>
      </div>

      {isLarge ? (
        /* Desktop layout */
        <Row gutter={16}>
          <Col lg={18}>
            <Card className="paces-card" size="small" title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  {data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : 'Asiento Contable'}
                </span>
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
                <Descriptions.Item label="Documento:">
                  {data.noDocumento || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha:">
                  {formatDate(data.fechaDocumento)}
                </Descriptions.Item>
                <Descriptions.Item label="NCF:">
                  {data.ncf || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Entidad:">
                  {toTitleCase(data.nombreEntidad || data.entidad?.nombre || '-')}
                </Descriptions.Item>
                <Descriptions.Item label="Concepto:">
                  {toTitleCase(data.concepto?.nombre || data.codigoConcepto || '-')}
                </Descriptions.Item>
                <Descriptions.Item label="Referencia:">
                  {data.referencia || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Moneda:" span={1}>
                  {data.codigoMoneda || 'DOP'}
                  {data.tasa > 0 && data.tasa !== 1 ? ` (Tasa: ${formatNumber(data.tasa)})` : ''}
                </Descriptions.Item>
                <Descriptions.Item label="SubTotal:">
                  {formatCurrency(data.subTotal)}
                </Descriptions.Item>
                <Descriptions.Item label="Total:">
                  <Text strong>{formatCurrency(data.total)}</Text>
                </Descriptions.Item>
                {data.ncfModificado && (
                  <Descriptions.Item label="NCF Modificado:" span={3}>
                    {data.ncfModificado}
                  </Descriptions.Item>
                )}
                {data.nota && (
                  <Descriptions.Item label="Nota:" span={3}>
                    <span style={{ whiteSpace: 'pre-wrap' }}>{data.nota}</span>
                  </Descriptions.Item>
                )}
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
              ]}
            />
          </Col>

          <Col lg={6}>
            {/* Sidebar info */}
            <Card className="paces-card" size="small" title="Información" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Débitos">
                  <Text strong style={{ color: '#34c38f' }}>{formatCurrency(data.debitos)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Créditos">
                  <Text strong style={{ color: '#f46a6a' }}>{formatCurrency(data.creditos)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Balance">
                  <Text strong>{formatCurrency(data.debitos - data.creditos)}</Text>
                </Descriptions.Item>
                {data.debitado != null && (
                  <Descriptions.Item label="Debitado">{formatCurrency(data.debitado)}</Descriptions.Item>
                )}
                {data.acreditado != null && (
                  <Descriptions.Item label="Acreditado">{formatCurrency(data.acreditado)}</Descriptions.Item>
                )}
              </Descriptions>
            </Card>
            {data.entidad && (
              <Card className="paces-card" size="small" title="Entidad" style={{ marginBottom: 16 }}>
                <div>
                  <div><Text strong>{toTitleCase(data.entidad.nombre || data.nombreEntidad || '')}</Text></div>
                  {data.entidad.codigo && (
                    <div className="paces-text-secondary">{data.entidad.codigo}</div>
                  )}
                </div>
              </Card>
            )}
          </Col>
        </Row>
      ) : (
        /* Mobile layout */
        <div>
          <Card className="paces-card" size="small" title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>
                {data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : 'Asiento Contable'}
              </span>
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
              <Descriptions.Item label="Documento:">{data.noDocumento || '-'}</Descriptions.Item>
              <Descriptions.Item label="Fecha:">{formatDate(data.fechaDocumento)}</Descriptions.Item>
              <Descriptions.Item label="NCF:">{data.ncf || '-'}</Descriptions.Item>
              <Descriptions.Item label="Entidad:">{toTitleCase(data.nombreEntidad || data.entidad?.nombre || '-')}</Descriptions.Item>
              <Descriptions.Item label="Concepto:">{toTitleCase(data.concepto?.nombre || data.codigoConcepto || '-')}</Descriptions.Item>
              <Descriptions.Item label="Referencia:">{data.referencia || '-'}</Descriptions.Item>
              <Descriptions.Item label="Moneda:">{data.codigoMoneda || 'DOP'}</Descriptions.Item>
              <Descriptions.Item label="Total:"><Text strong>{formatCurrency(data.total)}</Text></Descriptions.Item>
              {data.nota && (
                <Descriptions.Item label="Nota:"><span style={{ whiteSpace: 'pre-wrap' }}>{data.nota}</span></Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Card className="paces-card" size="small" title="Información" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Débitos"><Text strong style={{ color: '#34c38f' }}>{formatCurrency(data.debitos)}</Text></Descriptions.Item>
              <Descriptions.Item label="Créditos"><Text strong style={{ color: '#f46a6a' }}>{formatCurrency(data.creditos)}</Text></Descriptions.Item>
              <Descriptions.Item label="Balance"><Text strong>{formatCurrency(data.debitos - data.creditos)}</Text></Descriptions.Item>
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
            ]}
          />
        </div>
      )}
    </div>
  );
};

export default AsientoContableDetalle;
