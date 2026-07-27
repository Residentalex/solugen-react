import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Table, Input, Tag, Button, Card, Typography, DatePicker, Alert, Empty } from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { actualizacionPrecioApi } from '../../api/actualizacionPrecioApi';
import type { ActualizacionPrecioDTO } from '../../types/actualizacionPrecio';
import PermissionGate from '../../components/PermissionGate';

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
      render: (val: string) => <Text>{formatDate(val)}</Text>,
    },
    {
      title: 'Fecha Aplicar',
      dataIndex: 'fechaParaAplicar',
      key: 'fechaParaAplicar',
      width: 120,
      render: (val: string) => <Text>{formatDate(val)}</Text>,
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
      width: 110,
      render: (val: string) => {
        const info = ESTADO_TAG[val] || { color: 'default', label: val };
        return <Tag color={info.color}>{info.label}</Tag>;
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
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Buscar documento..."
              allowClear
              onSearch={handleSearch}
              style={{ width: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <RangePicker
              style={{ width: 220 }}
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
