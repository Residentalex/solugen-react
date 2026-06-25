import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Table, DatePicker, Tag, Card, Button, Typography, Empty, Input
} from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { turnoApi } from '../../api/turnoApi';
import type { TurnoDTO } from '../../types/turno';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { formatCurrency } from '../../utils/formats';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const PERIODO_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Abierto', color: 'warning' },
  1: { label: 'Cerrado', color: 'success' },
};

const DIAS_POR_DEFECTO = 30;
const FILAS_POR_PAGINA = 25;

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-DO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}000000`;
}

const Turnos: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(FILAS_POR_PAGINA);
  const [selectedRow, setSelectedRow] = useState<TurnoDTO | null>(null);
  const [searchText, setSearchText] = useState('');

  const dateParamsRef = useRef({
    desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
    hasta: formatDateParam(new Date()),
  });
  const [dateTrigger, setDateTrigger] = useState(0);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['turnos', sucursalActiva, page, pageSize, searchText, dateTrigger],
    queryFn: async () => {
      if (searchText) {
        // Búsqueda: solo filtrar por turno, sin fechas
        const params: { cantidad?: number; salto?: number; turno?: string } = {
          cantidad: pageSize,
          salto: (page - 1) * pageSize,
          turno: searchText,
        };
        const result = await turnoApi.filtrar(sucursalActiva, params);
        const total = result.length < pageSize
          ? (page - 1) * pageSize + result.length + 1
          : (page - 1) * pageSize + result.length + pageSize;
        return { datos: result, total };
      } else {
        // Listado normal: con rango de fechas
        const params = {
          desde: dateParamsRef.current.desde,
          hasta: dateParamsRef.current.hasta,
          cantidad: pageSize,
          salto: (page - 1) * pageSize,
        };
        const result = await turnoApi.obtenerListadoResumido(sucursalActiva, params);
        const total = result.length < pageSize
          ? (page - 1) * pageSize + result.length + 1
          : (page - 1) * pageSize + result.length + pageSize;
        return { datos: result, total };
      }
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('FTURNOS');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleRefresh = () => {
    setDateTrigger((n) => n + 1);
  };

  const handleDateChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      dateParamsRef.current = {
        desde: formatDateParam(dates[0].toDate()),
        hasta: formatDateParam(dates[1].toDate()),
      };
    } else {
      dateParamsRef.current = {
        desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
        hasta: formatDateParam(new Date()),
      };
    }
    setPage(1);
    setDateTrigger((n) => n + 1);
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleRowClick = (record: TurnoDTO) => {
    setSelectedRow(record);
  };

  const openDetalle = (record: TurnoDTO) => {
    navigate(`/FTURNOS/${record.noTurno}`);
  };

  const columns: ColumnsType<TurnoDTO> = [
    {
      title: 'No. Turno',
      dataIndex: 'noTurno',
      key: 'noTurno',
      width: 140,
      render: (val: string, record: TurnoDTO) => (
        <Text strong className="paces-doc-link" onClick={() => openDetalle(record)}>
          {val}
        </Text>
      ),
    },
    {
      title: 'Fecha Apertura',
      dataIndex: 'fechaApertura',
      key: 'fechaApertura',
      width: 140,
      render: (val: string) => <Text>{formatDateTime(val)}</Text>,
    },
    {
      title: 'Fecha Cierre',
      dataIndex: 'fechaCierre',
      key: 'fechaCierre',
      width: 140,
      render: (val: string) => <Text>{val ? formatDateTime(val) : '-'}</Text>,
    },
    {
      title: 'Usuario',
      dataIndex: 'usuario',
      key: 'usuario',
      width: 180,
      ellipsis: true,
      render: (val: { id: number; nombre: string; nombreUsuario: string } | null) => (
        <Text>{toTitleCase(val?.nombre || '')}</Text>
      ),
    },
    {
      title: 'POS',
      dataIndex: 'nombrePOS',
      key: 'nombrePOS',
      width: 150,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 140,
      align: 'right',
      render: (val: number) => <Text strong>{formatCurrency(val)}</Text>,
    },
    {
      title: 'Cerrado',
      dataIndex: 'cerrado',
      key: 'cerrado',
      width: 90,
      render: (val: boolean) => (
        <Tag color={val ? 'green' : 'default'}>{val ? 'Sí' : 'No'}</Tag>
      ),
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar turnos"
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
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Buscar turno..."
              allowClear
              onSearch={handleSearch}
              style={{ width: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <RangePicker
              style={{ width: 180 }}
              format="YYYY-MM-DD"
              onChange={handleDateChange}
              placeholder={["Desde", "Hasta"]}
            />
            <div style={{ flex: 1 }} />
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
          </div>
        </div>

        <Table<TurnoDTO>
          className="paces-border-top paces-list-table"
          columns={columns}
          dataSource={data?.datos || []}
          rowKey="id"
          loading={isLoading}
          size="middle"
          scroll={{ x: 900 }}
          locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No hay turnos registrados" /></div> }}
          pagination={{
            current: page,
            pageSize,
            total: data?.total || 0,
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

export default Turnos;
