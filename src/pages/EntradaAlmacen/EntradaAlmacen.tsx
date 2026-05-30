import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Card, Input, Select, Tag, Space, Button, Typography, message, Drawer, Tooltip, Alert, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  PrinterOutlined,
  EditOutlined,
  StopOutlined,
  LockFilled,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { entradaAlmacenApi } from '../../api/entradaAlmacenApi';
import FiltrosDocumento from '../../components/FiltrosDocumento/FiltrosDocumento';
import PermissionGate from '../../components/PermissionGate';
import type { MovimientoVistaDTO } from '../../types/entradaAlmacen';

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

function parseDateRaw(val: string): Date | null {
  if (!val) return null;
  const num = val.replace(/\D/g, '');
  if (num.length === 8) {
    const y = parseInt(num.slice(0, 4), 10);
    const m = parseInt(num.slice(4, 6), 10) - 1;
    const d = parseInt(num.slice(6, 8), 10);
    return new Date(y, m, d);
  }
  if (num.length >= 14) {
    const y = parseInt(num.slice(0, 4), 10);
    const m = parseInt(num.slice(4, 6), 10) - 1;
    const d = parseInt(num.slice(6, 8), 10);
    return new Date(y, m, d);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(val: string): string {
  const d = parseDateRaw(val);
  if (!d) return val || '';
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(n);
}

function getInitials(name: string): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

function getColorMonograma(diasCredito: number | undefined): string {
  if (diasCredito === undefined || diasCredito === null) return '#8C8C8C';
  if (diasCredito < 15) return '#E05252';
  if (diasCredito < 30) return '#4A8FD4';
  return '#2BA88C';
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

const EntradaAlmacen: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setNuevoCallback = useUIStore((s) => s.setNuevoCallback);

  const [data, setData] = useState<MovimientoVistaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(FILAS_POR_PAGINA);
  const [searchText, setSearchText] = useState('');
  const [selectedRow, setSelectedRow] = useState<MovimientoVistaDTO | null>(null);
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
      let resultados: MovimientoVistaDTO[];

      if (busqueda.length > 2) {
        resultados = await entradaAlmacenApi.filtrar(sucursalActiva, {
          cantidad: filas,
          salto: (pagina - 1) * filas,
          documento: busqueda,
          nCF: busqueda,
          concepto: busqueda,
          entidad: busqueda,
          almacen: busqueda,
        });
      } else {
        resultados = await entradaAlmacenApi.obtenerVista(
          sucursalActiva,
          desde,
          hasta,
          filas,
          (pagina - 1) * filas,
          filtros.estado
        );
      }

      setData(resultados);
      setTotal(resultados.length < filas ? (pagina - 1) * filas + resultados.length : pagina * filas + 1);
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
    setActiveModule('FENP');
    setNuevoCallback(() => navigate('/FENP/nuevo'));
    return () => {
      resetToolbar();
      setNuevoCallback(undefined);
    };
  }, [setActiveModule, resetToolbar, setNuevoCallback]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleRefresh = () => {
    setLoadingError(false);
    setRefreshTrigger(n => n + 1);
  };

  const handleImprimir = useCallback(async () => {
    if (!selectedRow) {
      message.warning('Seleccione un documento primero');
      return;
    }
    try {
      const res = await apiClient.get(`/reportes/inventario/entrada/${sucursalActiva}/${selectedRow.id}`, {
        responseType: 'blob',
      });
      const blobUrl = URL.createObjectURL(res.data);
      setPdfPreview({ url: blobUrl, title: `ENP-${selectedRow.documento}` });
    } catch {
      message.error('Error al generar el PDF');
    }
  }, [selectedRow, sucursalActiva]);

  const handleAnular = useCallback(() => {
    if (!selectedRow) return;
    Modal.confirm({
      title: 'Anular entrada',
      content: `¿Está seguro de que desea anular la entrada ${selectedRow.documento}?`,
      okText: 'Sí, anular',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          const data = await entradaAlmacenApi.obtenerPorId(sucursalActiva, selectedRow.id);
          await entradaAlmacenApi.anular(sucursalActiva, data as any);
          message.success('Entrada anulada correctamente');
          setLoadingError(false);
          setRefreshTrigger(n => n + 1);
        } catch (err: any) {
          message.error(err?.response?.data?.errorMessage || 'Error al anular la entrada');
        }
      },
    });
  }, [selectedRow, sucursalActiva]);

  const handleTableChange = (pagination: any) => {
    setPage(pagination.current);
  };

  const handleRowClick = (record: MovimientoVistaDTO) => {
    setSelectedRow(record);
  };

  const columns: ColumnsType<MovimientoVistaDTO> = [
{
  title: 'Documento',
  dataIndex: 'documento',
  key: 'documento',
  width: 160,
  fixed: 'left',
  render: (doc: string, record: MovimientoVistaDTO) => (
    <Text strong className="paces-doc-link" onClick={() => navigate(`/FENP/${record.id}`)}>{doc}</Text>
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
  render: (name: string, record: MovimientoVistaDTO) => (
    <Space>
      <div
        className="paces-avatar-initials"
        style={{ backgroundColor: getColorMonograma(record.diasCredito) }}
      >
        {getInitials(name)}
      </div>
      <Text>{toTitleCase(name) || ''}</Text>
    </Space>
  ),
},
{
  title: 'Concepto',
  dataIndex: 'concepto',
  key: 'concepto',
  width: 280,
  ellipsis: true,
  render: (concepto: string) => <Text>{toTitleCase(concepto) || ''}</Text>,
},
{
  title: 'Orden Compra',
  dataIndex: 'ordenCompra',
  key: 'ordenCompra',
  width: 140,
  render: (oc: string) => <Text>{oc || ''}</Text>,
},
{
  title: 'NCF',
  dataIndex: 'ncf',
  key: 'ncf',
  width: 140,
  render: (ncf: string) => <Text>{ncf || ''}</Text>,
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
  width: 130,
  render: (estado: number, record: MovimientoVistaDTO) => {
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
          title="Error al cargar entradas de almacén"
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
        styles={{
          body: { padding: 0 },
        }}
        className="paces-card-erp"
        style={{
          borderRadius: 8,
          overflow: 'hidden',
        }}
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
            placeholder="Buscar documento, NCF, concepto..."
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
          <PermissionGate accion="CREAR">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/FENP/nuevo')}>
              Nuevo
            </Button>
          </PermissionGate>
          <PermissionGate accion="IMPRIMIR">
            <Button icon={<PrinterOutlined />} onClick={handleImprimir} disabled={!selectedRow} />
          </PermissionGate>
          <PermissionGate accion="EDITAR">
            <Button icon={<EditOutlined />} disabled={!selectedRow || !(selectedRow.periodo !== 6 && selectedRow.estado === 0)} onClick={() => navigate(`/FENP/${selectedRow!.id}/editar`)}>
              Editar
            </Button>
          </PermissionGate>
          <PermissionGate accion="ANULAR">
            <Button danger icon={<StopOutlined />} disabled={!selectedRow || !(selectedRow.periodo !== 6 && selectedRow.estado === 0)} onClick={handleAnular}>
              Anular
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Table<MovimientoVistaDTO>
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1350 }}
        size="middle"
        rowClassName={(record) =>
          selectedRow?.id === record.id ? 'paces-row-selected' : 'paces-row-hover'
        }
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: {
            cursor: 'pointer',
          },
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

      <div style={{ display: 'flex', gap: 16, padding: '8px 24px 12px', flexWrap: 'wrap' }}>
        <Space size={4}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#E05252' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>0-14 días</Text>
        </Space>
        <Space size={4}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#4A8FD4' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>15-29 días</Text>
        </Space>
        <Space size={4}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#2BA88C' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>30+ días</Text>
        </Space>
      </div>

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

export default EntradaAlmacen;
