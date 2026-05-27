import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Grid, message, Typography, Tooltip, Descriptions, Alert
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

const { Text } = Typography;

const ESTADO_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Borrador', color: 'default' },
  1: { label: 'Aplicado', color: 'success' },
  2: { label: 'Autorizado', color: 'processing' },
  3: { label: 'Anulado', color: 'error' },
  4: { label: 'Pagado', color: 'cyan' },
  5: { label: 'Abierto', color: 'warning' },
  6: { label: 'Cerrado', color: 'default' },
};

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

  if (loading || !data) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando asiento contable...</div>
      </div>
    );
  }

  const isLarge = screens.lg ?? true;
  const estadoInfo = ESTADO_MAP[data.estado] || { label: 'Desconocido', color: 'default' };
  const esCerrado = data.periodo === 6;

  const totalDebitos = (data.asientos || []).reduce((s, r) => s + (r.tipoAsiento === 0 ? r.monto : 0), 0);
  const totalCreditos = (data.asientos || []).reduce((s, r) => s + (r.tipoAsiento === 1 ? r.monto : 0), 0);

  const asientoColumns = [
    { title: 'No. Cuenta', dataIndex: 'noCuenta', key: 'noCuenta', width: 140,
      render: (v: string) => <Text style={{ fontFamily: 'monospace' }}>{v || '-'}</Text> },
    { title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true,
      render: (v: string) => v ? toTitleCase(v) : '-' },
    { title: 'Débito', key: 'debito', width: 140, align: 'right' as const,
      render: (_: unknown, r: TransaccionAsientoDTO) =>
        r.tipoAsiento === 0 ? formatNumber(r.monto) : '' },
    { title: 'Crédito', key: 'credito', width: 140, align: 'right' as const,
      render: (_: unknown, r: TransaccionAsientoDTO) =>
        r.tipoAsiento === 1 ? formatNumber(r.monto) : '' },
  ];

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
                    <Table<TransaccionAsientoDTO>
                      dataSource={data.asientos || []}
                      columns={asientoColumns}
                      rowKey={(r, i) => `${r.id || ''}-${i}`}
                      size="small"
                      pagination={false}
                      scroll={{ x: 600 }}
                      summary={() => (
                        <Table.Summary fixed>
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={2}>
                              <Text strong>Totales</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right">
                              <Text strong>{formatNumber(totalDebitos)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right">
                              <Text strong>{formatNumber(totalCreditos)}</Text>
                            </Table.Summary.Cell>
                          </Table.Summary.Row>
                        </Table.Summary>
                      )}
                    />
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
                  <Table<TransaccionAsientoDTO>
                    dataSource={data.asientos || []}
                    columns={asientoColumns}
                    rowKey={(r, i) => `${r.id || ''}-${i}`}
                    size="small"
                    pagination={false}
                    scroll={{ x: 600 }}
                    summary={() => (
                      <Table.Summary fixed>
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={2}>
                            <Text strong>Totales</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right">
                            <Text strong>{formatNumber(totalDebitos)}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right">
                            <Text strong>{formatNumber(totalCreditos)}</Text>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    )}
                  />
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
