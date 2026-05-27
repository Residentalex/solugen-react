import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message, Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, LockFilled,
  IdcardOutlined, PhoneOutlined, EnvironmentOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { solicitudPagoApi } from '../../api/solicitudPagoApi';
import PermissionGate from '../../components/PermissionGate';

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

function formatDate(val: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface EntidadCardProps {
  entidad: { nombre: string; identificacion: string; telefono?: string; direccion?: string } | undefined;
}

const EntidadCard: React.FC<EntidadCardProps> = ({ entidad }) => {
  const identificacion = entidad?.identificacion || '';
  const telefono = entidad?.telefono || '';
  const direccion = entidad?.direccion ? toTitleCase(entidad.direccion) : '-';
  return (
    <Card title={<span style={{ fontSize: 16, fontWeight: 600 }}>Entidad</span>} className="paces-card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{entidad?.nombre ? toTitleCase(entidad.nombre) : '-'}</div>
        {identificacion && identificacion !== '-' && (
          <div style={{ fontSize: 13 }}><IdcardOutlined style={{ color: '#556ee6', marginRight: 8 }} />{identificacion}</div>
        )}
        {telefono && telefono !== '-' && (
          <div style={{ fontSize: 13 }}><PhoneOutlined style={{ color: '#556ee6', marginRight: 8 }} />{telefono}</div>
        )}
        {direccion && direccion !== '-' && (
          <div style={{ fontSize: 13, color: '#595959' }}><EnvironmentOutlined style={{ color: '#556ee6', marginRight: 8 }} />{direccion}</div>
        )}
      </div>
    </Card>
  );
};

interface TotalesCardProps {
  subTotal: number;
  descuento: number;
  impuestos: number;
  retenciones: number;
  total: number;
  nota: string;
  alignRight: boolean;
  monedaSimbolo?: string;
  monedaNombre?: string;
  tasa?: number;
}

const TotalesCard: React.FC<TotalesCardProps> = ({ subTotal, descuento, impuestos, retenciones, total, nota, alignRight, monedaSimbolo, monedaNombre, tasa }) => (
  <Card title={<span style={{ fontSize: 16, fontWeight: 600 }}>Totales</span>} className="paces-card">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: alignRight ? 'right' : undefined }}>
      {monedaSimbolo && tasa !== undefined && (
        <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16 }}>
          {!alignRight && <span className="paces-text-secondary">Moneda</span>}
          <span>{toTitleCase(monedaNombre || 'Peso Dominicano')} ({monedaSimbolo || 'RD$'} {formatNumber(tasa ?? 1)})</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16, fontSize: 14 }}>
        {!alignRight && <span className="paces-text-secondary">Subtotal</span>}
        <span>{formatNumber(subTotal)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16, fontSize: 14 }}>
        {!alignRight && <span className="paces-text-secondary">Descuento</span>}
        <span>{formatNumber(descuento)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16, fontSize: 14 }}>
        {!alignRight && <span className="paces-text-secondary">Impuestos</span>}
        <span>{formatNumber(impuestos)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16, fontSize: 14 }}>
        {!alignRight && <span className="paces-text-secondary">Retenciones</span>}
        <span>{formatNumber(retenciones)}</span>
      </div>
    </div>
    <Divider style={{ margin: '12px 0' }} />
    <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16, fontSize: 16, fontWeight: 700 }}>
      {!alignRight && <span>Total</span>}
      <span style={{ color: 'var(--paces-primary)' }}>{formatCurrency(total)}</span>
    </div>
    {nota && (
      <>
        <Divider style={{ margin: '12px 0' }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, textAlign: alignRight ? 'right' : undefined }} className="paces-text-secondary">Notas</div>
          <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5, textAlign: alignRight ? 'right' : undefined }} className="paces-text-dark">{nota}</div>
        </div>
      </>
    )}
  </Card>
);

const SolicitudPagoDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveModule('FSPA');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    // SPA only has GET list endpoints. For detalle, fetch from the list/filter APIs
    // or use the transaccion API if available. Since there's no specific GET by ID for SPA,
    // we'll load from the list and filter by ID
    solicitudPagoApi.obtenerResumido(sucursalActiva)
      .then((list) => {
        const item = list.find((r: any) => r.id === parseInt(id!));
        if (item) {
          setData(item);
          setPageTitleOverride(`SPA-${item.documento || id}`);
        } else {
          setError('Solicitud de pago no encontrada');
        }
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar la solicitud de pago';
        setError(msg);
        message.error(msg);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando solicitud de pago...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <div style={{ fontSize: 18, color: '#ff4d4f', marginBottom: 16 }}>Error</div>
        <div style={{ marginBottom: 24 }} className="paces-text-secondary">{error}</div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/FSPA')}>Volver</Button>
      </div>
    );
  }

  if (!data) return null;

  const isLarge = screens.lg ?? true;
  const estadoInfo = ESTADO_MAP[data.estado] || { label: 'Desconocido', color: 'default' };
  const esCerrado = data.periodo === 6;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/FSPA')}>Volver</Button>
        <div style={{ flex: 1 }} />
        <Space>
          {data.estado === 0 && data.periodo !== 6 && (
            <PermissionGate accion="EDITAR">
              <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/FSPA/${id}/editar`)}>Editar</Button>
            </PermissionGate>
          )}
        </Space>
      </div>

      {isLarge ? (
        <Row gutter={16}>
          <Col lg={18}>
            <Card className="paces-card" size="small" title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
                <Space>
                  {esCerrado && (<Tooltip title="Período contable cerrado"><LockFilled style={{ fontSize: 14, color: '#595959' }} /></Tooltip>)}
                  <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
                </Space>
              </div>
            } style={{ marginBottom: 16 }}>
              <Descriptions bordered size="small" column={3} styles={{ content: { background: 'transparent' } }}>
                <Descriptions.Item label="Documento">{data.documento || '-'}</Descriptions.Item>
                <Descriptions.Item label="Fecha">{formatDate(data.fecha)}</Descriptions.Item>
                <Descriptions.Item label="Concepto">{data.concepto ? toTitleCase(data.concepto) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Entidad">{data.entidad ? toTitleCase(data.entidad) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Referencia">{data.referencia || '-'}</Descriptions.Item>
                <Descriptions.Item label="Cuenta Bancaria">{data.cuentaBancaria || '-'}</Descriptions.Item>
                <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
                <Descriptions.Item label="Total">{formatCurrency(data.total || 0)}</Descriptions.Item>
                <Descriptions.Item label="No. Documento">{data.noDocumento || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col lg={6}>
            <EntidadCard entidad={{ nombre: data.entidad, identificacion: '', telefono: '', direccion: '' }} />
            <TotalesCard
              subTotal={data.total || 0}
              descuento={0}
              impuestos={0}
              retenciones={0}
              total={data.total || 0}
              nota=""
              alignRight={false}
            />
          </Col>
        </Row>
      ) : (
        <div>
          <Card className="paces-card" size="small" title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
              <Space>
                {esCerrado && (<Tooltip title="Período contable cerrado"><LockFilled style={{ fontSize: 14, color: '#595959' }} /></Tooltip>)}
                <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
              </Space>
            </div>
          } style={{ marginBottom: 16 }}>
            <Descriptions bordered size="small" column={1} styles={{ content: { background: 'transparent' } }}>
              <Descriptions.Item label="Documento">{data.documento || '-'}</Descriptions.Item>
              <Descriptions.Item label="Fecha">{formatDate(data.fecha)}</Descriptions.Item>
              <Descriptions.Item label="Concepto">{data.concepto ? toTitleCase(data.concepto) : '-'}</Descriptions.Item>
              <Descriptions.Item label="Entidad">{data.entidad ? toTitleCase(data.entidad) : '-'}</Descriptions.Item>
              <Descriptions.Item label="Referencia">{data.referencia || '-'}</Descriptions.Item>
              <Descriptions.Item label="Cuenta Bancaria">{data.cuentaBancaria || '-'}</Descriptions.Item>
              <Descriptions.Item label="Total">{formatCurrency(data.total || 0)}</Descriptions.Item>
            </Descriptions>
          </Card>
          <TotalesCard
            subTotal={data.total || 0}
            descuento={0}
            impuestos={0}
            retenciones={0}
            total={data.total || 0}
            nota=""
            alignRight={true}
          />
        </div>
      )}
    </div>
  );
};

export default SolicitudPagoDetalle;
