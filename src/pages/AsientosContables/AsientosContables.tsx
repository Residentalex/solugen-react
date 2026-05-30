import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Table, Select, Tag, message, Card, Button, Typography, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { asientoContableApi } from '../../api/asientoContableApi';
import FiltrosDocumento from '../../components/FiltrosDocumento/FiltrosDocumento';
import type { TransaccionVistaDTO } from '../../types/transaccion';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';

const ESTADO_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Borrador', color: 'default' },
  1: { label: 'Aplicado', color: 'success' },
  2: { label: 'Autorizado', color: 'processing' },
  3: { label: 'Anulado', color: 'error' },
  4: { label: 'Pagado', color: 'cyan' },
  5: { label: 'Abierto', color: 'warning' },
  6: { label: 'Cerrado', color: 'default' },
};

const { Text } = Typography;

const DIAS_POR_DEFECTO = 30;
const FILAS_POR_PAGINA = 25;

function titlecase(s: string): string {
  if (!s) return '';
  return s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function formatDate(val: string): string {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(n);
}

function formatDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}000000`;
}

const AsientosContables: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);

  const [data, setData] = useState<TransaccionVistaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(FILAS_POR_PAGINA);
  const [selectedRow, setSelectedRow] = useState<TransaccionVistaDTO | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loadingError, setLoadingError] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filtros, setFiltros] = useState<{ desde?: string; hasta?: string; estado?: number }>({});

  const rangoDefault = useMemo(() => ({
    desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
    hasta: formatDateParam(new Date()),
  }), []);

  const cargarDatos = useCallback(async (pagina: number, filas: number) => {
    setLoading(true);
    try {
      const desde = filtros.desde ?? rangoDefault.desde;
      const hasta = filtros.hasta ?? rangoDefault.hasta;
      const result = await asientoContableApi.obtenerVista(
        sucursalActiva,
        desde,
        hasta,
        filas,
        (pagina - 1) * filas,
        filtros.estado
      );
      setData(result);
      setTotal(
        result.length < filas
          ? (pagina - 1) * filas + result.length + 1
          : (pagina - 1) * filas + result.length + filas
      );
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar datos');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, rangoDefault, filtros]);

  // ===== Filtrado client-side por búsqueda de texto =====
  const filteredData = useMemo(() => {
    if (!searchText || searchText.length < 2) return data;
    const q = searchText.toLowerCase();
    return data.filter((item) => {
      const doc = item.documento || '';
      const entidad = item.entidad || '';
      const concepto = item.concepto || '';
      const ncf = item.ncf || '';
      return (
        doc.toLowerCase().includes(q) ||
        entidad.toLowerCase().includes(q) ||
        concepto.toLowerCase().includes(q) ||
        ncf.toLowerCase().includes(q)
      );
    });
  }, [data, searchText]);

  useEffect(() => {
    cargarDatos(page, pageSize);
  }, [page, pageSize, refreshTrigger, cargarDatos]);

  useEffect(() => {
    setActiveModule('FAsientoContable');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleRefresh = () => {
    setLoadingError(false);
    setRefreshTrigger(n => n + 1);
  };

  const handleRowClick = (record: TransaccionVistaDTO) => {
    setSelectedRow(record);
  };

  const columns: ColumnsType<TransaccionVistaDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 200,
      fixed: 'left',
      render: (doc: any, record: TransaccionVistaDTO) => (
        <Text strong className="paces-doc-link" onClick={() => navigate(`/FAsientoContable/${record.id}`)}>
          {typeof doc === 'string' ? doc : doc?.codigo || doc?.nombre || JSON.stringify(doc)}
        </Text>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (v: string) => <Text>{formatDate(v)}</Text>,
    },
    {
      title: 'Entidad',
      dataIndex: 'entidad',
      key: 'entidad',
      ellipsis: true,
      render: (v: string) => <Text>{titlecase(v || '')}</Text>,
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      key: 'concepto',
      width: 320,
      ellipsis: true,
      render: (v: string) => <Text>{titlecase(v || '')}</Text>,
    },
    {
      title: 'NCF',
      dataIndex: 'ncf',
      key: 'ncf',
      width: 140,
      render: (v: string) => <Text>{v || ''}</Text>,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 140,
      align: 'right',
      render: (v: number) => <Text strong>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 110,
      render: (est: number) => {
        const info = ESTADO_MAP[est] || { label: 'Desconocido', color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
  ];

  return (<>
    {loadingError && (
      <Alert
        message="Error al cargar asientos contables"
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
    <Card styles={{ body: { padding: 0 } }} className="paces-card-erp" style={{ borderRadius: 8 }}>
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
          <FiltrosDocumento
            filtros={filtros}
            onAplicar={(nuevos) => {
              setFiltros(nuevos);
              setPage(1);
            }}
            opcionesEstado={[
              { value: 0, label: 'Borrador' },
              { value: 1, label: 'Aplicado' },
              { value: 3, label: 'Anulado' },
            ]}
            rangoDefault={rangoDefault}
          />
          <Input.Search
            placeholder="Buscar documento, entidad, concepto..."
            allowClear
            onSearch={handleSearch}
            style={{ width: 400 }}
            prefix={<SearchOutlined className="paces-text-icon" />}
          />
          <Select
            style={{ width: 65 }}
            value={pageSize}
            onChange={(v) => { setPageSize(v); setPage(1); }}
            options={[
              { value: 25, label: '25' },
              { value: 50, label: '50' },
              { value: 100, label: '100' },
            ]}
          />
          <div style={{ flex: 1 }} />
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
        </div>
      </div>

      <Table<TransaccionVistaDTO>
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        loading={loading}
        size="middle"
        scroll={{ x: 1100 }}
        className="paces-border-top paces-list-table"
        pagination={{
          current: page,
          pageSize,
          total: searchText.length >= 2 ? filteredData.length : total,
          showSizeChanger: false,
          showTotal: (t) => `${t} registros`,
        }}
        onChange={(pagination) => {
          if (pagination.current) setPage(pagination.current);
        }}
        rowClassName={(record) =>
          selectedRow?.id === record.id ? 'paces-row-selected' : 'paces-row-hover'
        }
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' },
        })}
      />
    </Card>
    </>
  );
};

export default AsientosContables;
