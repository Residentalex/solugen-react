import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Card, Input, Tag, Space, Button, Typography, message, Tooltip, Drawer, Alert } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  LockFilled,
  PlusOutlined,
} from '@ant-design/icons';
import FiltrosDocumento from '../../components/FiltrosDocumento/FiltrosDocumento';
import PermissionGate from '../../components/PermissionGate';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { solicitudPagoApi } from '../../api/solicitudPagoApi';
import type { TransaccionBancariaVistaDTO } from '../../types/transaccion';

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

function getInitials(name: string): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
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

const SolicitudPago: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const setEditarCallback = useUIStore((s: any) => s.setEditarCallback);

  const [data, setData] = useState<TransaccionBancariaVistaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(FILAS_POR_PAGINA);
  const [searchText, setSearchText] = useState('');
  const [selectedRow, setSelectedRow] = useState<TransaccionBancariaVistaDTO | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null);
  const [loadingError, setLoadingError] = useState(false);
  const [filtros, setFiltros] = useState<{ desde?: string; hasta?: string; estado?: number }>({});

  const rangoDefault = useMemo(() => ({
    desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
    hasta: formatDateParam(new Date()),
  }), []);

  const cargarDatos = useCallback(async (pagina: number, filas: number, busqueda: string) => {
    setLoading(true);
    try {
      const desde = filtros.desde ?? rangoDefault.desde;
      const hasta = filtros.hasta ?? rangoDefault.hasta;
      let resultados: TransaccionBancariaVistaDTO[];
      if (busqueda.length > 2) {
        resultados = (await solicitudPagoApi.filtrar(sucursalActiva, {
          cantidad: filas,
          salto: (pagina - 1) * filas,
          desde,
          hasta,
          documento: busqueda,
          entidad: busqueda,
          concepto: busqueda,
        })) as unknown as TransaccionBancariaVistaDTO[];
      } else {
        resultados = await solicitudPagoApi.obtenerVista(
          sucursalActiva,
          desde,
          hasta,
          filas,
          (pagina - 1) * filas,
          filtros.estado
        );
      }
      setData(resultados);
      setTotal(resultados.length < filas ? (pagina - 1) * filas + resultados.length + 1 : (pagina - 1) * filas + resultados.length + filas);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar datos');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, filtros.desde, filtros.hasta, filtros.estado]);

  useEffect(() => {
    cargarDatos(page, pageSize, searchText);
  }, [page, pageSize, searchText, refreshTrigger, filtros, cargarDatos]);

  useEffect(() => {
    setActiveModule('FSPA');
    updateToolbar({ editar: false });
    return () => resetToolbar();
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

  const handleRowClick = (record: TransaccionBancariaVistaDTO) => {
    setSelectedRow(record);
  };

  const columns: ColumnsType<TransaccionBancariaVistaDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 160,
      fixed: 'left',
      render: (doc: any, record: TransaccionBancariaVistaDTO) => (
        <Text strong className="paces-doc-link" onClick={() => navigate(`/FSPA/${record.id}`)}>{typeof doc === 'string' ? doc : doc?.codigo || doc?.nombre || JSON.stringify(doc)}</Text>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (f: string) => <Text>{formatDate(f)}</Text>,
    },
    {
      title: 'Entidad',
      dataIndex: 'entidad',
      key: 'entidad',
      ellipsis: true,
      render: (name: string) => (
        <Space>
          <div className="paces-avatar-initials">{getInitials(name)}</div>
          <Text>{titlecase(name) || ''}</Text>
        </Space>
      ),
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      key: 'concepto',
      width: 250,
      ellipsis: true,
      render: (concepto: string) => <Text>{titlecase(concepto) || ''}</Text>,
    },
    {
      title: 'Cuenta Bancaria',
      dataIndex: 'ctaBancaria',
      key: 'ctaBancaria',
      width: 260,
      ellipsis: true,
      render: (val: string) => <Text>{val ? titlecase(val) : '-'}</Text>,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 160,
      align: 'right',
      render: (total: number) => (
        <Text strong className="paces-text-total">{formatCurrency(total)}</Text>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 100,
      render: (estado: number, record: TransaccionBancariaVistaDTO) => {
        const esCerrado = record.periodo === 6;
        const info = ESTADO_MAP[estado] || { label: 'Desconocido', color: 'default' };
        return (
          <Tag color={info.color}>
            {info.label}
            {esCerrado && (
              <Tooltip title="Período contable cerrado">
                <LockFilled style={{ marginLeft: 4, fontSize: 12, color: '#595959' }} />
              </Tooltip>
            )}
          </Tag>
        );
      },
    },
  ];

  return (
    <>
      {loadingError && (
        <Alert
          message="Error al cargar solicitudes de pago"
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
        className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }}
      >
      <div style={{ padding: '16px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
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
          <div style={{ flex: 1 }} />
          <PermissionGate accion="CREAR">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/FSPA/nuevo')}>
              Nuevo
            </Button>
          </PermissionGate>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
        </div>
      </div>

      <Table<TransaccionBancariaVistaDTO>
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
        size="middle"
        rowClassName={(record) =>
          selectedRow?.id === record.id ? 'paces-row-selected' : 'paces-row-hover'
        }
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          current: page,
          pageSize,
          total: total,
          showSizeChanger: false,
          showTotal: (t) => `${t} registros`,
        }}
        className="paces-border-top paces-list-table"
      />

      <Drawer
        title={pdfPreview?.title}
        open={!!pdfPreview}
        onClose={() => {
          if (pdfPreview) URL.revokeObjectURL(pdfPreview.url);
          setPdfPreview(null);
        }}
        size="70%"
      >
        {pdfPreview && (
          <div style={{ width: '100%', height: '100%', overflow: 'auto', transform: 'scale(1.1)', transformOrigin: 'top left' }}>
            <iframe src={pdfPreview.url} style={{ width: '100%', height: '90vh', border: 'none' }} title="PDF" />
          </div>
        )}
      </Drawer>
    </Card>
    </>
  );
};
export default SolicitudPago;
