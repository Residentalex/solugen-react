import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Table, Input, Tag, Button, Card, Typography, DatePicker, Alert, Empty } from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import FechaColumnCell from '../../components/FechaColumnCell';
import { useAuthStore } from '../../stores/authStore';
import { actualizacionPrecioApi } from '../../api/actualizacionPrecioApi';
import type { ActualizacionPrecioDTO } from '../../types/actualizacionPrecio';
import PermissionGate from '../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const DIAS_POR_DEFECTO = 30;
const FILAS_POR_PAGINA = 25;

const ESTADO_TAG: Record<string, { color: string; label: string }> = {
  Pendiente: { color: 'warning', label: 'Pendiente' },
  P: { color: 'warning', label: 'Pendiente' },
  Aplicado: { color: 'success', label: 'Aplicado' },
  A: { color: 'success', label: 'Aplicado' },
  Anulado: { color: 'error', label: 'Anulado' },
  N: { color: 'error', label: 'Anulado' },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
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

const ActualizacionPrecio: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(FILAS_POR_PAGINA);

  const dateParamsRef = useRef({
    desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
    hasta: formatDateParam(new Date()),
  });
  const [dateTrigger, setDateTrigger] = useState(0);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['actualizacionPrecio', sucursalActiva, page, pageSize, searchText, dateTrigger],
    queryFn: async () => {
      const { desde, hasta } = dateParamsRef.current;
      let resultados: ActualizacionPrecioDTO[];

      if (searchText.length > 2) {
        resultados = await actualizacionPrecioApi.filtrar(sucursalActiva, {
          cantidad: pageSize,
          salto: (page - 1) * pageSize,
          desde,
          hasta,
          documento: searchText,
        });
      } else {
        resultados = await actualizacionPrecioApi.obtenerResumido(
          sucursalActiva,
          desde,
          hasta,
          pageSize,
          (page - 1) * pageSize
        );
      }

      return { datos: resultados };
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  const { data: totalData } = useQuery({
    queryKey: ['actualizacionPrecioTotal', sucursalActiva, dateTrigger, searchText],
    queryFn: () => actualizacionPrecioApi.obtenerTotal(
      sucursalActiva,
      dateParamsRef.current.desde,
      dateParamsRef.current.hasta
    ),
    enabled: sucursalActiva !== undefined,
  });

  useEffect(() => {
    setActiveModule('FActPrecio');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleRefresh = () => {
    setDateTrigger((n) => n + 1);
  };

  const handleExportarExcel = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    const dataSource = data?.datos || [];
    const exportCols = columns.filter((col: any) => col.title && col.title !== '' && col.title !== 'Acciones');
    const columnHeaders = exportCols.map((col: any) => col.title);
    const dataRows = dataSource.map((item: any) =>
      exportCols.map((col: any) => {
        const val = item[col.dataIndex];
        return val != null ? String(val) : '';
      })
    );
    exportToExcel({
      fileName: `ActualizacionPrecio_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'ActualizacionPrecio',
      companyName,
      columnHeaders,
      dataRows,
    });
  };

  const handleDateChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      const d = dates[0].format('YYYYMMDD') + '000000';
      const h = dates[1].format('YYYYMMDD') + '000000';
      dateParamsRef.current = { desde: d, hasta: h };
    } else {
      dateParamsRef.current = {
        desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
        hasta: formatDateParam(new Date()),
      };
    }
    setPage(1);
    setDateTrigger((n) => n + 1);
  };

  const columns: ColumnsType<ActualizacionPrecioDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 140,
      fixed: 'left',
      render: (val: string, record: ActualizacionPrecioDTO) => (
        <Text
          strong
          className="paces-doc-link"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/FActPrecio/${record.idExterno}`)}
        >
          {val}
        </Text>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 120,
      render: (val: string) => <FechaColumnCell fecha={val} />,
    },
{
  title: 'Fecha Aplicar',
  dataIndex: 'fechaParaAplicar',
  key: 'fechaParaAplicar',
  width: 120,
  render: (val: string, record: ActualizacionPrecioDTO) => {
    const today = new Date();
    const fechaAplicar = new Date(val);
    const diffTime = fechaAplicar.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let color = '#6b7280'; // gray-500
    let label = formatDate(val);

    if (diffDays < 0) {
      color = '#ef4444'; // red-500 - vencida
    } else if (diffDays === 0) {
      color = '#f59e0b'; // yellow-500 - hoy
      label = 'HOY';
    } else if (diffDays === 1) {
      color = '#10b981'; // green-500 - mañana
      label = 'MAÑANA';
    } else if (diffDays <= 3) {
      color = '#8b5cf6'; // purple-500 - pronto
    }

    return (
      <div style={{
        background: `${color}15`,
        padding: '2px 6px',
        borderRadius: 3,
        textAlign: 'center',
        fontSize: diffDays === 0 || diffDays === 1 ? 11 : 12,
        fontWeight: diffDays === 0 || diffDays === 1 ? 600 : 500
      }}>
        {label}
      </div>
    );
  },
},
    {
      title: 'Doc. Referencia',
      dataIndex: 'docReferencia',
      key: 'docReferencia',
      width: 150,
      render: (val: string) => <Text type="secondary">{val || '-'}</Text>,
    },
    {
      title: 'Ajuste',
      dataIndex: 'ajuste',
      key: 'ajuste',
      width: 100,
      align: 'right',
      render: (val: number) => (
        <Text style={{ fontFamily: 'monospace' }}>{val.toLocaleString('es-DO')}</Text>
      ),
},
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 100,
      render: (val: string, record: ActualizacionPrecioDTO) => {
        const info = ESTADO_TAG[val] || { color: 'default', label: val };
        const baseClass = record.estado === 'Pendiente' || record.estado === 'P' ? 'paces-row-unread' : '';
        return (
          <Tag color={info.color} className={baseClass} style={{ fontWeight: 500, borderRadius: 4 }}>
            {info.label}
          </Tag>
        );
      },
    },
    {
      title: 'Autorizado',
      dataIndex: 'autorizado',
      key: 'autorizado',
      width: 100,
      render: (val: boolean) => (
        <Tag color="blue">{val ? 'Sí' : 'No'}</Tag>
      ),
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar actualizaciones de precio"
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

      {/* Resumen de actualizaciones */}
      <div style={{ margin: '0 24px 20px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Card className="paces-card-erp" style={{ borderRadius: 8, padding: 16, flex: '1 1 220px', minWidth: 180, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Pendientes</div>
          <div style={{ fontSize: 26, fontWeight: 600, color: '#f59e0b' }}>{Math.max(0, (totalData || 0) - (data?.datos?.filter(d => d.estado === 'Aplicado' || d.estado === 'A').length || 0))}</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>por aplicar</div>
        </Card>
        <Card className="paces-card-erp" style={{ borderRadius: 8, padding: 16, flex: '1 1 220px', minWidth: 180, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Aplicadas</div>
          <div style={{ fontSize: 26, fontWeight: 600, color: '#10b981' }}>{data?.datos?.filter(d => d.estado === 'Aplicado' || d.estado === 'A').length || 0}</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>completadas</div>
        </Card>
        <Card className="paces-card-erp" style={{ borderRadius: 8, padding: 16, flex: '1 1 220px', minWidth: 180, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Canceladas</div>
          <div style={{ fontSize: 26, fontWeight: 600, color: '#ef4444' }}>{data?.datos?.filter(d => d.estado === 'Anulado' || d.estado === 'N').length || 0}</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>reversadas</div>
        </Card>
      </div>

      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Buscar documento..."
              allowClear
              onSearch={handleSearch}
              style={{ width: '100%', maxWidth: 400, flex: '1 1 auto', minWidth: 200 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <RangePicker
              style={{ width: '100%', maxWidth: 220, flex: '0 0 auto' }}
              format="YYYY-MM-DD"
              onChange={handleDateChange}
              placeholder={["Desde", "Hasta"]}
            />
            <div style={{ flex: 1 }} />
            <PermissionGate accion="CREAR">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/FActPrecio/nuevo')}>
                Nuevo
              </Button>
            </PermissionGate>
            <PermissionGate accion="EXPORTAR">
              <Button icon={<FileExcelOutlined />} onClick={handleExportarExcel} />
            </PermissionGate>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
          </div>
        </div>
        <Table<ActualizacionPrecioDTO>
          className="paces-border-top paces-list-table"
          columns={columns}
          dataSource={data?.datos || []}
          rowKey="idExterno"
          loading={isLoading}
          scroll={{ x: 1200 }}
          size="middle"
          locale={{
            emptyText: isLoading ? ' ' : <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No se encontraron actualizaciones de precio" /></div>,
          }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: totalData || 0,
            onChange: (newPage, newPageSize) => {
              if (newPageSize !== pageSize) {
                setPageSize(newPageSize);
                setPage(1);
              } else {
                setPage(newPage);
              }
            },
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
          }}
        />
      </Card>
    </>
  );
};

export default ActualizacionPrecio;
