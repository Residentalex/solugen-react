import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Card, Table, Button, Spin, Alert, Empty, Typography, Tag, Row, Col, Grid, message
} from 'antd';
import {
  BankOutlined, LeftOutlined, RightOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { cuentaBancariaApi } from '../../api/cuentaBancariaApi';
import type { CuentaBancariaDTO } from '../../api/cuentaBancariaApi';
import DocumentListadoToolbar from '../../components/DocumentListadoToolbar';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { formatDateRaw } from '../../utils/formats';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../utils/estadoDocumento';
import type { TransaccionVistaDTO } from '../../types/transaccion';
import './CuentaBancariaDetalle.css';

const { Text } = Typography;

/* ===== Helpers ===== */

function formatCurrency(value: number | null | undefined, moneda?: string): string {
  if (value === null || value === undefined) return '-';
  const symbol = moneda?.toUpperCase() === 'DOLAR' || moneda?.toUpperCase() === 'USD' ? 'US$' : 'RD$';
  return `${symbol} ${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function maskAccountNumber(noCuenta: string): string {
  if (!noCuenta) return '';
  const clean = noCuenta.replace(/\s+/g, '');
  if (clean.length <= 4) return clean;
  const last4 = clean.slice(-4);
  return `•••• •••• •••• ${last4}`;
}

function getMonedaInfo(moneda: string | undefined): { label: string; color: string } {
  if (moneda?.toUpperCase() === 'DOLAR') return { label: 'USD', color: '#10b981' };
  return { label: 'DOP', color: '#556ee6' };
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

function getBankColor(banco: string): string {
  const colors = [
    'linear-gradient(135deg, #556ee6 0%, #6c7ff0 100%)',
    'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
    'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
    'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
    'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
    'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
  ];
  const index = Math.abs(hashCode(banco || '')) % colors.length;
  return colors[index];
}

/* ===== Active Card ===== */

interface ActiveCardProps {
  cuenta: CuentaBancariaDTO;
}

const ActiveCard: React.FC<ActiveCardProps> = ({ cuenta }) => {
  const esUSD = cuenta.moneda?.toUpperCase() === 'DOLAR' || cuenta.moneda?.toUpperCase() === 'USD';
  const monedaInfo = getMonedaInfo(cuenta.moneda);
  const balanceDisplay = formatCurrency(cuenta.balance, cuenta.moneda);
  const hasBalance = cuenta.balance !== undefined && cuenta.balance !== null;

  return (
    <div
      className={`active-bank-card${!cuenta.activo ? ' card-inactive' : ''}${esUSD ? ' card-usd' : ''}`}
      style={{ background: getBankColor(cuenta.banco) }}
    >
      <div className="active-card-shine" />
      <div className="active-card-content">
        <div className="active-card-header">
          <div className="active-card-chip" />
          <div className="active-card-moneda-badge" style={{ background: monedaInfo.color }}>
            {monedaInfo.label}
          </div>
        </div>
        <div className="active-card-number">{maskAccountNumber(cuenta.noCuenta || '')}</div>
        <div className="active-card-bottom">
          <div className="active-card-info">
            <div className="active-card-label">Titular</div>
            <div className="active-card-value">{toTitleCase(cuenta.nombre || '')}</div>
          </div>
          <div className="active-card-info" style={{ textAlign: 'right' }}>
            <div className="active-card-label">Balance</div>
            <div className={`active-card-value${hasBalance ? ' active-card-balance' : ''}`}>
              {hasBalance ? balanceDisplay : '—'}
            </div>
          </div>
        </div>
        <div className="active-card-footer-row">
          <span className="active-card-banco">{toTitleCase(cuenta.banco || '')}</span>
          <Tag color={cuenta.activo ? 'green' : 'red'} className="active-card-status-tag">
            {cuenta.activo ? 'Activa' : 'Inactiva'}
          </Tag>
        </div>
      </div>
    </div>
  );
};

/* ===== Summary Sidebar (desktop) ===== */

interface SummarySidebarProps {
  cuenta: CuentaBancariaDTO;
}

const SummarySidebar: React.FC<SummarySidebarProps> = ({ cuenta }) => {
  const esUSD = cuenta.moneda?.toUpperCase() === 'DOLAR' || cuenta.moneda?.toUpperCase() === 'USD';
  const monedaInfo = getMonedaInfo(cuenta.moneda);
  const balanceDisplay = formatCurrency(cuenta.balance, cuenta.moneda);
  const hasBalance = cuenta.balance !== undefined && cuenta.balance !== null;

  return (
    <Card className="paces-card" styles={{ body: { padding: '20px 24px' } }}>
      <div style={{ marginBottom: 24 }}>
        <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>
          Balance actual
        </Text>
        <div
          className={`summary-balance-hero${esUSD ? ' summary-balance-usd' : ''}`}
        >
          {hasBalance ? balanceDisplay : '—'}
        </div>
      </div>

      <div className="summary-details-list">
        <div className="summary-detail-row">
          <span className="summary-detail-label">Banco</span>
          <span className="summary-detail-value">{toTitleCase(cuenta.banco || '')}</span>
        </div>
        <div className="summary-detail-row">
          <span className="summary-detail-label">No. Cuenta</span>
          <span className="summary-detail-value">{cuenta.noCuenta || '—'}</span>
        </div>
        <div className="summary-detail-row">
          <span className="summary-detail-label">Cta. Contable</span>
          <span className="summary-detail-value">{cuenta.cuentaContable || '—'}</span>
        </div>
        <div className="summary-detail-row">
          <span className="summary-detail-label">Moneda</span>
          <Tag color={esUSD ? 'green' : 'blue'} style={{ margin: 0 }}>{monedaInfo.label}</Tag>
        </div>
        <div className="summary-detail-row">
          <span className="summary-detail-label">Estado</span>
          <Tag color={cuenta.activo ? 'success' : 'error'} style={{ margin: 0 }}>
            {cuenta.activo ? 'Activo' : 'Inactivo'}
          </Tag>
        </div>
      </div>
    </Card>
  );
};

/* ===== Compact Summary (< xxl) ===== */

interface CompactSummaryProps {
  cuenta: CuentaBancariaDTO;
}

const CompactSummary: React.FC<CompactSummaryProps> = ({ cuenta }) => {
  const esUSD = cuenta.moneda?.toUpperCase() === 'DOLAR' || cuenta.moneda?.toUpperCase() === 'USD';
  const monedaInfo = getMonedaInfo(cuenta.moneda);
  const balanceDisplay = formatCurrency(cuenta.balance, cuenta.moneda);
  const hasBalance = cuenta.balance !== undefined && cuenta.balance !== null;

  return (
    <div style={{ padding: '0 24px 12px' }}>
      <Card className="paces-card" size="small" styles={{ body: { padding: '12px 16px' } }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Balance actual</Text>
            <Text strong style={{ fontSize: 20, color: esUSD ? '#10b981' : undefined }}>
              {hasBalance ? balanceDisplay : '—'}
            </Text>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>
              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>No. Cuenta</Text>
              <Text>{maskAccountNumber(cuenta.noCuenta || '')}</Text>
            </span>
            <span>
              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Cta. Contable</Text>
              <Text>{cuenta.cuentaContable || '—'}</Text>
            </span>
            <Tag color={monedaInfo.color}>{monedaInfo.label}</Tag>
            <Tag color={cuenta.activo ? 'success' : 'error'}>
              {cuenta.activo ? 'Activo' : 'Inactivo'}
            </Tag>
          </div>
        </div>
      </Card>
    </div>
  );
};

/* ===== Main Component ===== */

const FTransBanco: React.FC = () => {
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const isLarge = screens.xxl === true;

  const [cuentas, setCuentas] = useState<CuentaBancariaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [filtros, setFiltros] = useState<{ desde?: string; hasta?: string; estado?: number }>({});

  const [movimientos, setMovimientos] = useState<TransaccionVistaDTO[]>([]);
  const [loadingMov, setLoadingMov] = useState(false);
  const [totalMov, setTotalMov] = useState(0);

  const cuentaActiva = useMemo(() => cuentas[activeIndex] || null, [activeIndex, cuentas]);

  /* ---- Data loading ---- */

  const cargarDatos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    setLoadingError(false);
    try {
      const result = await cuentaBancariaApi.obtenerListado(sucursalActiva);
      setCuentas(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar cuentas bancarias');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  /* ---- Lifecycle ---- */

  useEffect(() => {
    setActiveModule('FTransBanco');
    cargarDatos();
    return () => resetToolbar();
  }, [setActiveModule, resetToolbar, cargarDatos]);

  /* ---- Pre-selection from MCuentaBanco ---- */

  useEffect(() => {
    if (cuentas.length > 0) {
      const preSelected = (location.state as any)?.cuentaCodigo;
      if (preSelected) {
        const idx = cuentas.findIndex((c) => c.codigo === preSelected);
        if (idx >= 0) {
          setActiveIndex(idx);
          return;
        }
      }
      if (activeIndex >= cuentas.length) {
        setActiveIndex(0);
      }
    }
  }, [cuentas, location.state]);

  /* ---- Navigation handlers ---- */

  const handlePrev = () => {
    setActiveIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => Math.min(cuentas.length - 1, prev + 1));
  };

  const handleRefresh = () => {
    setSearchText('');
    setCurrentPage(1);
    cargarDatos();
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setCurrentPage(1);
  };

  const handleFiltrosAplicar = (f: { desde?: string; hasta?: string; estado?: number }) => {
    setFiltros(f);
    setCurrentPage(1);
  };

  const cargarMovimientos = useCallback(async (pagina: number, filas: number) => {
    if (!cuentaActiva?.noCuenta) return;
    setLoadingMov(true);
    try {
      const desde = filtros.desde ?? '19000101000000';
      const hasta = filtros.hasta ?? '20991231235959';
      const result = await cuentaBancariaApi.obtenerMovimientos(sucursalActiva, cuentaActiva.noCuenta, {
        desde, hasta, cantidad: filas, salto: (pagina - 1) * filas,
        busqueda: searchText || undefined,
        estado: filtros.estado,
      });
      setMovimientos(result || []);
      setTotalMov(result.length < filas ? (pagina - 1) * filas + result.length : pagina * filas + 1);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar movimientos');
    } finally {
      setLoadingMov(false);
    }
  }, [sucursalActiva, cuentaActiva?.codigo, filtros, searchText]);

  /* ---- Load movimientos on dependency change ---- */

  useEffect(() => {
    cargarMovimientos(currentPage, pageSize);
  }, [currentPage, pageSize, cuentaActiva, filtros, searchText, cargarMovimientos]);

  /* ---- Client-side search filter ---- */

  const movimientosFiltrados = useMemo(() => {
    if (!searchText || !movimientos.length) return movimientos;
    const lower = searchText.toLowerCase();
    return movimientos.filter(
      (m) =>
        (m.documento || '').toLowerCase().includes(lower) ||
        (m.concepto || '').toLowerCase().includes(lower) ||
        (m.entidad || '').toLowerCase().includes(lower)
    );
  }, [movimientos, searchText]);

  /* ---- Table columns ---- */

  const monedaActual = cuentaActiva?.moneda;

  const columns: any[] = [
    { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 160, fixed: 'left' as const,
      render: (doc: string) => <Text strong>{doc}</Text> },
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 130,
      render: (val: string) => formatDateRaw(val) },
    { title: 'Entidad / Beneficiario', dataIndex: 'entidad', key: 'entidad',
      render: (val: string) => <Text>{toTitleCase(val ?? '')}</Text> },
    { title: 'Concepto', dataIndex: 'concepto', key: 'concepto', width: 280, ellipsis: true,
      render: (val: string) => <Text>{toTitleCase(val ?? '')}</Text> },
    { title: 'Total', dataIndex: 'total', key: 'total', width: 160, align: 'right' as const,
      render: (val: number) => <Text strong className="paces-text-total">{formatCurrency(val, monedaActual)}</Text> },
    { title: 'Estado', dataIndex: 'estado', key: 'estado', width: 130,
      render: (est: number) => <EstadoColumnCell estado={est} /> },
  ];

  /* ---- Derived state ---- */

  const isEmpty = !loading && !loadingError && cuentas.length === 0;
  const hasError = loadingError;
  const hasContent = !loading && !loadingError && cuentas.length > 0;

  /* ===== Render ===== */

  return (
    <Card
      className="paces-card-erp"
      style={{ borderRadius: 8, overflow: 'hidden' }}
      styles={{ body: { padding: 0 } }}
    >
      {/* Loading state */}
      {loading && !loadingError && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando cuentas bancarias...</div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div style={{ padding: '16px 24px 24px' }}>
          <Alert
            message="Error al cargar cuentas bancarias"
            type="error"
            showIcon
            action={<Button size="small" onClick={handleRefresh}>Reintentar</Button>}
          />
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Empty
            image={<BankOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
            description="No hay cuentas bancarias registradas"
          />
        </div>
      )}

      {/* Main content */}
      {hasContent && cuentaActiva && (
        <>
          {/* Top row: two columns (slider | account info) */}
          <div style={{ padding: '16px 24px 0' }}>
            {isLarge ? (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col xxl={18}>
                  {/* Card stack slider */}
                  <div className="cuenta-card-stack">
                    <Button
                      className="stack-arrow-btn"
                      shape="circle"
                      icon={<LeftOutlined />}
                      onClick={handlePrev}
                      disabled={activeIndex === 0}
                      size="large"
                    />
                    <div className="stack-cards-wrapper">
                      <div className="stack-card-main">
                        <ActiveCard cuenta={cuentaActiva} />
                      </div>
                      <div className="stack-card-count">
                        {activeIndex + 1} / {cuentas.length}
                      </div>
                    </div>
                    <Button
                      className="stack-arrow-btn"
                      shape="circle"
                      icon={<RightOutlined />}
                      onClick={handleNext}
                      disabled={activeIndex === cuentas.length - 1}
                      size="large"
                    />
                  </div>
                </Col>
                <Col xxl={6}>
                  <div className="cuenta-summary-sidebar">
                    <SummarySidebar cuenta={cuentaActiva} />
                  </div>
                </Col>
              </Row>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <div className="cuenta-card-stack">
                  <Button
                    className="stack-arrow-btn"
                    shape="circle"
                    icon={<LeftOutlined />}
                    onClick={handlePrev}
                    disabled={activeIndex === 0}
                    size="large"
                  />
                  <div className="stack-cards-wrapper">
                    <div className="stack-card-main">
                      <ActiveCard cuenta={cuentaActiva} />
                    </div>
                    <div className="stack-card-count">
                      {activeIndex + 1} / {cuentas.length}
                    </div>
                  </div>
                  <Button
                    className="stack-arrow-btn"
                    shape="circle"
                    icon={<RightOutlined />}
                    onClick={handleNext}
                    disabled={activeIndex === cuentas.length - 1}
                    size="large"
                  />
                </div>
                <CompactSummary cuenta={cuentaActiva} />
              </div>
            )}
          </div>

          {/* Bottom: toolbar + table (full width, como EntradaAlmacen) */}
          <div style={{ padding: '0 24px 16px' }}>
            <DocumentListadoToolbar
              showFiltros
              filtros={filtros}
              opcionesEstado={ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO}
              rangoDefault={{ desde: '', hasta: '' }}
              onFiltrosAplicar={handleFiltrosAplicar}
              searchPlaceholder="Buscar documento, concepto..."
              onSearch={handleSearch}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              onRefresh={handleRefresh}
            />
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                Movimientos
              </Text>
            </div>
            <Table
              dataSource={movimientosFiltrados}
              columns={columns}
              rowKey="id"
              size="small"
              loading={loadingMov}
              className="paces-border-top paces-list-table"
              scroll={{ x: 1100 }}
              pagination={{
                current: currentPage,
                pageSize,
                total: searchText ? movimientosFiltrados.length : totalMov,
                showTotal: (t) => `${t} registros`,
                showSizeChanger: false,
                onChange: (page) => setCurrentPage(page),
              }}
              rowClassName="paces-row-hover"
              locale={{ emptyText: 'No hay movimientos para esta cuenta' }}
            />
          </div>
        </>
      )}
    </Card>
  );
};

export default FTransBanco;
