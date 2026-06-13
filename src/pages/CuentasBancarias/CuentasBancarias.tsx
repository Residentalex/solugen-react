import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Input, Select, Button, message, Pagination, Skeleton, Empty, Alert } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined, BankOutlined } from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { cuentaBancariaApi } from '../../api/cuentaBancariaApi';
import type { CuentaBancariaDTO } from '../../api/cuentaBancariaApi';
import CuentaBancariaCard from './CuentaBancariaCard';
import './CuentasBancarias.css';

/* ===== Skeleton grid ===== */

function renderSkeletonGrid() {
  return (
    <Row gutter={[16, 16]}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Col key={i} xs={24} sm={12} lg={8} xxl={6}>
          <div className="cuenta-card-skeleton">
            <div className="cuenta-card-skeleton-header">
              <Skeleton.Input active style={{ width: 160, height: 18 }} />
            </div>
            <div style={{ padding: '12px 16px', background: '#fff' }}>
              <Skeleton active paragraph={{ rows: 2 }} />
            </div>
          </div>
        </Col>
      ))}
    </Row>
  );
}

/* ===== Component ===== */

const CuentasBancarias: React.FC = () => {
  /* ---- Hooks FIRST (before any early return) ---- */
  const navigate = useNavigate();

  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [data, setData] = useState<CuentaBancariaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  /* ---- Data loading ---- */

  const cargarDatos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    setLoadingError(false);
    try {
      const result = await cuentaBancariaApi.obtenerListado(sucursalActiva);
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar cuentas bancarias');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  /* ---- Lifecycle ---- */

  useEffect(() => {
    setActiveModule('MCuentaBanco');
    updateToolbar({});
    cargarDatos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos]);

  /* ---- Handlers ---- */

  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    setSearchText('');
    setCurrentPage(1);
    cargarDatos();
  };

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setCurrentPage(1);
  };

  const handleNavigate = (codigo: string) => {
    navigate('/FTransBanco', { state: { cuentaCodigo: codigo } });
  };

  /* ---- Client-side filter ---- */

  const filteredData = useMemo(() => {
    if (!searchText) return data;
    const lower = searchText.toLowerCase();
    return data.filter(
      (item) =>
        item.codigo?.toLowerCase().includes(lower) ||
        item.nombre?.toLowerCase().includes(lower) ||
        item.noCuenta?.toLowerCase().includes(lower) ||
        item.banco?.toLowerCase().includes(lower)
    );
  }, [data, searchText]);

  /* ---- Pagination ---- */

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Reset to page 1 if current page exceeds available pages
  useEffect(() => {
    const maxPage = Math.ceil(filteredData.length / pageSize) || 1;
    if (currentPage > maxPage) {
      setCurrentPage(1);
    }
  }, [filteredData, pageSize, currentPage]);

  /* ---- Derived display states ---- */

  const isEmpty = !loading && !loadingError && data.length === 0;
  const isEmptySearch = !loading && !loadingError && data.length > 0 && filteredData.length === 0 && !!searchText;
  const hasContent = !loading && !loadingError && filteredData.length > 0;
  const showPagination = hasContent && filteredData.length > pageSize;

  /* ===== Render ===== */

  return (
    <Card
      className="paces-card-erp"
      style={{ borderRadius: 8, overflow: 'hidden' }}
      styles={{ body: { padding: 0 } }}
    >
      {/* ---- Toolbar ---- */}
      <div style={{ padding: '16px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
          <Input.Search
            placeholder="Buscar por código, nombre o cuenta..."
            allowClear
            onSearch={handleSearch}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                (e.target as HTMLInputElement).blur();
                handleSearch('');
              }
            }}
            style={{ flex: 1, minWidth: 200, maxWidth: 400 }}
            prefix={<SearchOutlined className="paces-text-icon" />}
          />
          <Select
            style={{ width: 65 }}
            value={pageSize}
            onChange={handlePageSizeChange}
            options={[
              { value: 25, label: '25' },
              { value: 50, label: '50' },
              { value: 100, label: '100' },
            ]}
          />
          <div style={{ flex: 1 }} />
          <PermissionGate accion="CREAR">
            <Button type="primary" icon={<PlusOutlined />}>Nuevo</Button>
          </PermissionGate>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
        </div>
      </div>

      {/* ---- Content area ---- */}
      <div style={{ padding: '0 24px 16px' }}>

        {/* Error state */}
        {loadingError && (
          <Alert
            message="Error al cargar cuentas bancarias"
            description="No se pudieron cargar las cuentas bancarias. Verifique la conexión e intente de nuevo."
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

        {/* Loading skeleton: 8 card placeholders */}
        {loading && !loadingError && renderSkeletonGrid()}

        {/* Empty state: no data at all */}
        {isEmpty && (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <Empty
              image={<BankOutlined className="cuenta-empty-icon" />}
              description="No hay cuentas bancarias registradas"
            >
              <PermissionGate accion="CREAR">
                <Button type="primary" icon={<PlusOutlined />}>Nueva cuenta</Button>
              </PermissionGate>
            </Empty>
          </div>
        )}

        {/* Empty search: no results for current query */}
        {isEmptySearch && (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <Empty description="No se encontraron cuentas con ese criterio">
              <Button onClick={() => handleSearch('')}>Limpiar búsqueda</Button>
            </Empty>
          </div>
        )}

        {/* Card grid */}
        {hasContent && (
          <>
            <Row gutter={[16, 16]}>
              {paginatedData.map((cuenta, i) => (
                <Col key={cuenta.codigo} xs={24} sm={12} lg={8} xxl={6}>
                  <CuentaBancariaCard
                    cuenta={cuenta}
                    onClick={() => handleNavigate(cuenta.codigo)}
                    index={i}
                  />
                </Col>
              ))}
            </Row>

            {showPagination && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={filteredData.length}
                  onChange={(page) => setCurrentPage(page)}
                  showSizeChanger={false}
                  showTotal={(total) => `${total} registros`}
                />
              </div>
            )}
          </>
        )}

      </div>
    </Card>
  );
};

export default CuentasBancarias;
