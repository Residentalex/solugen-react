import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Card,
  DatePicker,
  Input,
  Tag,
  Button,
  Typography,
  Alert,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { conteoApi } from '../../api/conteoApi';
import type { ConteoFisicoDTO } from '../../types/conteo';

const { Text } = Typography;
const { RangePicker } = DatePicker;

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
  if (!d) return val || '-';
  return d.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(n);
}

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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

const Conteos: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  const [data, setData] = useState<ConteoFisicoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(FILAS_POR_PAGINA);
  const [fechaTrigger, setFechaTrigger] = useState(0);
  const [loadingError, setLoadingError] = useState(false);

  const dateParamsRef = useRef({
    desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
    hasta: formatDateParam(new Date()),
  });

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadingError(false);
    try {
      const { desde, hasta } = dateParamsRef.current;
      const resultados = await conteoApi.obtenerListado(sucursalActiva, {
        desde,
        hasta,
        cantidad: pageSize,
        salto: (page - 1) * pageSize,
      });
      setData(resultados);
      setTotal(
        resultados.length < pageSize
          ? (page - 1) * pageSize + resultados.length
          : page * pageSize + 1
      );
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, page, pageSize]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos, fechaTrigger]);

  useEffect(() => {
    setActiveModule('FConteos');
    updateToolbar({});

    return () => {
      resetToolbar();
    };
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleRefresh = () => {
    setPage(1);
    setFechaTrigger((n) => n + 1);
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
    setFechaTrigger((n) => n + 1);
  };

  const handleTableChange = (pagination: any) => {
    setPage(pagination.current);
  };

  const abrirDetalle = (record: ConteoFisicoDTO) => {
    navigate(`/FConteos/${record.documento}`, { state: record });
  };

  const columns: ColumnsType<ConteoFisicoDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 140,
      render: (doc: string, record: ConteoFisicoDTO) => (
        <Text
          strong
          className="paces-doc-link"
          onClick={() => abrirDetalle(record)}
        >
          {doc}
        </Text>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 120,
      render: (f: string) => <Text>{formatDate(f)}</Text>,
    },
    {
      title: 'Almacén',
      dataIndex: 'almacen',
      key: 'almacen',
      width: 150,
      render: (val: string) => <Text>{toTitleCase(val)}</Text>,
    },
    {
      title: 'Usuario',
      dataIndex: 'usuario',
      key: 'usuario',
      width: 150,
      render: (val: string) => <Text>{toTitleCase(val) || '-'}</Text>,
    },
    {
      title: 'Suplidor',
      dataIndex: 'nombreSuplidor',
      key: 'nombreSuplidor',
      width: 200,
      render: (val: string, record: any) => <Text>{val ? toTitleCase(val) : record.codigoSuplidor || '-'}</Text>,
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 100,
      align: 'right',
      render: (val: number) => (
        <Text>{val.toLocaleString('es-DO')}</Text>
      ),
    },
    {
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      width: 130,
      align: 'right',
      render: (val: number) => <Text>{formatCurrency(val)}</Text>,
    },

    {
      title: 'Bloqueado',
      dataIndex: 'bloqueado',
      key: 'bloqueado',
      width: 100,
      render: (val: boolean) => (
        <Tag color={val ? 'red' : 'green'}>{val ? 'Sí' : 'No'}</Tag>
      ),
    },
  ];

  return (
    <>
      {loadingError && (
        <Alert
          message="Error al cargar conteos"
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <RangePicker
              style={{ width: 180 }}
              format="YYYY-MM-DD"
              onChange={handleDateChange}
              placeholder={['Desde', 'Hasta']}
            />
            <Input.Search
              placeholder="Buscar..."
              allowClear
              onSearch={() => {}}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              style={{ width: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <div style={{ flex: 1 }} />
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
          </div>
        </div>

        <Table<ConteoFisicoDTO>
          columns={columns}
          dataSource={data}
          rowKey="documento"
          loading={loading}
          scroll={{ x: 1200 }}
          size="middle"
          locale={{
            emptyText: (
              <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description="No hay conteos registrados" />
              </div>
            ),
          }}
          onRow={(record) => ({
            onClick: () => abrirDetalle(record),
            style: { cursor: 'pointer' },
          })}
          onChange={handleTableChange}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
          }}
          className="paces-border-top paces-list-table"
        />
      </Card>
    </>
  );
};

export default Conteos;
