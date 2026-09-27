import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Spin, Alert, Empty, Typography, Tag, Row, Col, Grid, message, Select
} from 'antd';
import {
  BankOutlined, LeftOutlined, RightOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import FechaColumnCell from '../../components/FechaColumnCell';
import { cuentaBancariaApi } from '../../api/cuentaBancariaApi';
import type { CuentaBancariaDTO } from '../../api/cuentaBancariaApi';
import DocumentListadoToolbar from '../../components/DocumentListadoToolbar';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { formatDateRaw } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../utils/estadoDocumento';
import type { TransaccionVistaDTO } from '../../types/transaccion';
import './CuentaBancariaDetalle.css';

const { Text } = Typography;

/* ===== Helpers ===== */

function formatCurrency(value: number | null | undefined, moneda?: string): string {
  if (value === null || value === undefined) return '-';
  const monedaDefault = getMonedaSucursalActiva();
  const symbol = moneda?.toUpperCase() === 'DOLAR' || moneda?.toUpperCase() === 'USD' ? 'US$' : (monedaDefault.simbolo || 'RD$');
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

/* ===== Account List (reemplaza summary / compact) ===== */

interface AccountListProps {
  cuentas: CuentaBancariaDTO[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

const AccountList: React.FC<AccountListProps> = ({ cuentas, activeIndex, onSelect }) => {
  const cuentasVisibles = cuentas.slice(0, 5);
  return (
    <Card className="paces-card" size="small" styles={{ body: { padding: '12px 16px' } }}>
      <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>
        Cuentas bancarias
      </Text>
      <div style={{ marginBottom: 8 }}>
        <Select
          size="middle"
          style={{ width: '100%', borderRadius: 8, boxShadow: '0 2px 8px rgba(85,110,230,0.15)' }}
          placeholder="Buscar cuenta bancaria..."
          value={cuentas.find((c, idx) => idx === activeIndex)?.noCuenta || undefined}
          onChange={(value: string) => {
            const idx = cuentas.findIndex((c) => c.noCuenta === value);
            if (idx >= 0) onSelect(idx);
          }}
          options={cuentas.map((c) => ({ value: c.noCuenta || '', label: c.noCuenta || '—' }))}
          showSearch
          optionFilterProp="label"
          suffixIcon={<span style={{ color: '#8c8c8c' }}>🔍</span>}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {cuentasVisibles.map((c, idxLocal) => {
          const i = cuentas.findIndex((cc) => cc.noCuenta === c.noCuenta);
          const isActive = i === activeIndex;
          return (
            <button
              key={c.noCuenta || idxLocal}
              onClick={() => onSelect(i >= 0 ? i : idxLocal)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: 6,
                border: isActive ? '2px solid #556ee6' : '1px solid #d9d9d9',
                background: isActive ? '#e8f0fe' : '#fff',
                color: isActive ? '#1a1a1a' : '#595959',
                fontWeight: isActive ? 700 : 400,
                boxShadow: isActive ? '0 2px 8px rgba(85,110,230,0.15)' : 'none',
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {c.noCuenta || '—'}
            </button>
          );
        })}
      </div>
    </Card>
  );
};

/* ===== Main Component ===== */

const FTransBanco: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
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
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const [filtros, setFiltros] = useState<{ desde?: string; hasta?: string; estado?: number }>({ desde: '20200101', hasta: todayStr });

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
        const idx = cuentas.findIndex((c) => c.noCuenta === preSelected);
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

  const handleSelectAccount = (index: number) => {
    setActiveIndex(index);
    setCurrentPage(1);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => Math.max(0, prev - 1));
    setCurrentPage(1); // Reset paginación al cambiar cuenta
  };

  const handleNext = () => {
    setActiveIndex((prev) => Math.min(cuentas.length - 1, prev + 1));
    setCurrentPage(1); // Reset paginación al cambiar cuenta
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
      const result = await cuentaBancariaApi.obtenerMovimientos(sucursalActiva, cuentaActiva.noCuenta, {
        desde: filtros.desde, hasta: filtros.hasta, cantidad: filas, salto: (pagina - 1) * filas,
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
  }, [sucursalActiva, cuentaActiva?.noCuenta, filtros, searchText]);

  /* ---- Load movimientos on account change ---- */

  useEffect(() => {
    if (!cuentaActiva?.noCuenta) return;
    const cargarDirecto = async () => {
      setLoadingMov(true);
      try {
        const result = await cuentaBancariaApi.obtenerMovimientos(sucursalActiva, cuentaActiva.noCuenta, {
          desde: filtros.desde, hasta: filtros.hasta, cantidad: pageSize, salto: (currentPage - 1) * pageSize,
          busqueda: searchText || undefined,
          estado: filtros.estado,
        });
        setMovimientos(result || []);
        setTotalMov(result.length < pageSize ? (currentPage - 1) * pageSize + result.length : currentPage * pageSize + 1);
      } catch (err: any) {
        message.error(err?.response?.data?.errorMessage || 'Error al cargar movimientos');
      } finally {
        setLoadingMov(false);
      }
    };
    cargarDirecto();
  }, [cuentaActiva?.noCuenta]);

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
      render: (val: string) => <FechaColumnCell fecha={val} /> },
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
          {/* Top row: slider + account info */}
          <div style={{ padding: '16px 24px 0' }}>
            {isLarge ? (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col xxl={18}>
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
                    <AccountList cuentas={cuentas} activeIndex={activeIndex} onSelect={handleSelectAccount} />
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
                <AccountList cuentas={cuentas} activeIndex={activeIndex} onSelect={handleSelectAccount} />
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
              showCrear
              onCrear={() => navigate('/FTransBanco/nuevo')}
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
              onRow={(record) => ({
                onClick: () => {
                  if (record.id) {
                    navigate(`/FTransBanco/${record.id}`, { state: { cuentaCodigo: cuentaActiva?.noCuenta } });
                  }
                },
                style: { cursor: record.id ? 'pointer' : 'default' },
              })}
              locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No hay movimientos para esta cuenta" /></div> }}
            />
          </div>
        </>
      )}
    </Card>
  );
};

export default FTransBanco;
