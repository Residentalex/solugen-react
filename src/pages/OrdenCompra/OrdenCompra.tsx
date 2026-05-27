import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Card, Input, Tag, Button, Typography, message, Alert } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { ordenCompraApi } from '../../api/ordenCompraApi';
import FiltrosDocumento from '../../components/FiltrosDocumento/FiltrosDocumento';
import PermissionGate from '../../components/PermissionGate';
import { Sucursal } from '../../types/auth';
import type { OrdenCompraVistaDTO } from '../../types/entradaAlmacen';

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

const DIAS_POR_DEFECTO = 30;
const FILAS_POR_PAGINA = 25;

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
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${day}${hh}${mm}${ss}`;
}

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const OrdenCompra: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setEditarCallback = useUIStore((s) => s.setEditarCallback);

  const [data, setData] = useState<OrdenCompraVistaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(FILAS_POR_PAGINA);
  const [searchText, setSearchText] = useState('');
  const [selectedRow, setSelectedRow] = useState<OrdenCompraVistaDTO | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loadingError, setLoadingError] = useState(false);
  const [filtros, setFiltros] = useState<{ desde?: string; hasta?: string; estado?: number }>({});

  const rangoDefault = useMemo(() => ({
    desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
    hasta: formatDateParam(new Date()),
  }), []);

  // Destino por defecto: Sucursal.Compra (5)
  const destino = Sucursal.Compra;

  const cargarDatos = useCallback(async (pagina: number, filas: number, busqueda: string) => {
    setLoading(true);
    try {
      const desde = filtros.desde ?? rangoDefault.desde;
      const hasta = filtros.hasta ?? rangoDefault.hasta;
      let resultados: OrdenCompraVistaDTO[];

      if (busqueda.length > 2) {
        resultados = await ordenCompraApi.filtrar(sucursalActiva, destino, {
          cantidad: filas,
          documento: busqueda,
          suplidor: busqueda,
          desde,
          hasta,
        });
      } else {
        resultados = await ordenCompraApi.obtenerResumido(sucursalActiva, destino, {
          suplidor: undefined,
          desde,
          hasta,
          cantidad: filas,
          salto: (pagina - 1) * filas,
          estado: filtros.estado,
        } as any);
      }

      setData(resultados);
      setTotal(resultados.length < filas ? (pagina - 1) * filas + resultados.length : pagina * filas + 1);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar datos');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, destino, filtros.desde, filtros.hasta, filtros.estado]);

  useEffect(() => {
    cargarDatos(page, pageSize, searchText);
  }, [page, pageSize, searchText, refreshTrigger, filtros, cargarDatos]);

  useEffect(() => {
    setActiveModule('FORC');
    updateToolbar({ editar: false, anular: false });
    return () => {
      resetToolbar();
    };
  }, [setActiveModule, updateToolbar, resetToolbar]);

  useEffect(() => {
    return () => {
      setEditarCallback(undefined);
    };
  }, [setEditarCallback]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleRefresh = () => {
    setLoadingError(false);
    setRefreshTrigger(n => n + 1);
  };

  const handleTableChange = (pagination: any) => {
    setPage(pagination.current);
  };

  const handleRowClick = (record: OrdenCompraVistaDTO) => {
    setSelectedRow(record);
  };

  const columns: ColumnsType<OrdenCompraVistaDTO> = [
    {
      title: 'Documento',
      dataIndex: 'noDocumento',
      key: 'noDocumento',
      width: 160,
      fixed: 'left',
      render: (doc: string, record: OrdenCompraVistaDTO) => (
        <Text strong className="paces-doc-link" onClick={() => navigate(`/FORC/${record.id}`)}>{doc || '-'}</Text>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaDocumento',
      key: 'fechaDocumento',
      width: 110,
      render: (f: string) => <Text>{formatDate(f)}</Text>,
    },
    {
      title: 'Suplidor',
      key: 'suplidor',
      render: (_: any, record: OrdenCompraVistaDTO) => (
        <Text>{record.suplidor?.nombre ? toTitleCase(record.suplidor.nombre) : '-'}</Text>
      ),
    },
    {
      title: 'Concepto',
      key: 'concepto',
      width: 250,
      ellipsis: true,
      render: (_: any, record: OrdenCompraVistaDTO) => (
        <Text>{record.concepto?.nombre ? toTitleCase(record.concepto.nombre) : '-'}</Text>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 160,
      align: 'right',
      render: (total: number) => (
        <Text strong className="paces-text-total">{formatCurrency(total || 0)}</Text>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 130,
      render: (estado: number) => {
        const info = ESTADO_MAP[estado] || { label: 'Desconocido', color: 'default' };
        return (
          <Tag color={info.color}>
            {info.label}
          </Tag>
        );
      },
    },
  ];

  return (
    <>
      {loadingError && (
        <Alert
          message="Error al cargar órdenes de compra"
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
      <Card
        styles={{ body: { padding: 0 } }}
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
      >
      <div style={{ padding: '16px 24px 0' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: 16,
          flexWrap: 'wrap',
        }}>
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
            placeholder="Buscar documento, suplidor..."
            allowClear
            onSearch={handleSearch}
            style={{ width: 400 }}
            prefix={<SearchOutlined className="paces-text-icon" />}
          />
          <div style={{ flex: 1 }} />
          <PermissionGate accion="CREAR">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/FORC/nuevo')}>
              Nuevo
            </Button>
          </PermissionGate>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
        </div>
      </div>

      <Table<OrdenCompraVistaDTO>
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1100 }}
        size="middle"
        rowClassName={(record) =>
          selectedRow?.id === record.id ? 'paces-row-selected' : 'paces-row-hover'
        }
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' },
        })}
        onChange={handleTableChange}
        pagination={{
          current: page,
          pageSize,
          total: total,
          showSizeChanger: false,
          showTotal: (t) => `${t} registros`,
        }}
        className="paces-border-top paces-list-table"
      />
    </Card>
    </>
  );
};

export default OrdenCompra;
