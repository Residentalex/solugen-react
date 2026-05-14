import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Card, DatePicker, Input, Select, Tag, Space, Button, Typography, Tooltip, message, Drawer } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EyeOutlined,
  EditOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { transferenciaAlmacenApi } from '../../api/transferenciaAlmacenApi';
import type { MovimientoVistaDTO } from '../../types/transferenciaAlmacen';

const { Text } = Typography;
const { RangePicker } = DatePicker;

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
const FILAS_POR_PAGINA = 50;

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

function formatDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}000000`;
}

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const TransferenciaAlmacen: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setImprimirCallback = useUIStore((s) => s.setImprimirCallback);

  const [data, setData] = useState<MovimientoVistaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(FILAS_POR_PAGINA);
  const [searchText, setSearchText] = useState('');
  const [selectedRow, setSelectedRow] = useState<MovimientoVistaDTO | null>(null);
  const [fechaTrigger, setFechaTrigger] = useState(0);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null);
  const dateParamsRef = useRef({ desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)), hasta: formatDateParam(new Date()) });

  const cargarDatos = useCallback(async (pagina: number, filas: number, busqueda: string) => {
    setLoading(true);
    try {
      const { desde, hasta } = dateParamsRef.current;
      let resultados: MovimientoVistaDTO[];

      if (busqueda.length > 2) {
        resultados = await transferenciaAlmacenApi.filtrar(sucursalActiva, {
          cantidad: filas,
          salto: (pagina - 1) * filas,
          documento: busqueda,
          concepto: busqueda,
          almacen: busqueda,
        });
      } else {
        resultados = await transferenciaAlmacenApi.obtenerVista(
          sucursalActiva,
          desde,
          hasta,
          filas,
          (pagina - 1) * filas
        );
      }

      setData(resultados);
      setTotal(resultados.length < filas ? (pagina - 1) * filas + resultados.length : pagina * filas + 1);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    cargarDatos(page, pageSize, searchText);
  }, [page, pageSize, searchText, fechaTrigger, cargarDatos]);

  useEffect(() => {
    setActiveModule('FTRP');
    updateToolbar({ nuevo: true, editar: false, imprimir: true });
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  useEffect(() => {
    if (selectedRow) {
      setImprimirCallback(async () => {
        try {
          const res = await apiClient.get(`/reportes/inventario/transferencia/${sucursalActiva}/${selectedRow.id}`, {
            responseType: 'blob',
          });
          const blobUrl = URL.createObjectURL(res.data);
          setPdfPreview({ url: blobUrl, title: `TRP-${selectedRow.documento}` });
        } catch {
          message.error('Error al generar el PDF');
        }
      });
    } else {
      setImprimirCallback(undefined);
    }
  }, [selectedRow, sucursalActiva, setImprimirCallback]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleRefresh = () => {
    setFechaTrigger(n => n + 1);
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
    setFechaTrigger(n => n + 1);
  };

  const handleTableChange = (pagination: any) => {
    setPage(pagination.current);
  };

  const handleRowClick = (record: MovimientoVistaDTO) => {
    setSelectedRow(record);
    const editable = record.periodo !== 6 && record.estado === 0;
    updateToolbar({ editar: editable });
  };

  const columns: ColumnsType<MovimientoVistaDTO> = [
{
  title: 'Documento',
  dataIndex: 'documento',
  key: 'documento',
  width: 160,
  fixed: 'left',
  render: (doc: string, record: MovimientoVistaDTO) => (
    <Text strong style={{ color: '#556ee6', cursor: 'pointer' }} onClick={() => navigate(`/FTRP/${record.id}`)}>{doc}</Text>
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
  title: 'Almacén Origen',
  dataIndex: 'almacenOrigen',
  key: 'almacenOrigen',
  width: 180,
  render: (alm: string) => <Text>{toTitleCase(alm) || ''}</Text>,
},
{
  title: 'Almacén Destino',
  dataIndex: 'almacenDestino',
  key: 'almacenDestino',
  width: 180,
  render: (alm: string) => <Text>{toTitleCase(alm) || ''}</Text>,
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
  title: 'Total',
  dataIndex: 'total',
  key: 'total',
  width: 160,
  align: 'right',
  render: (total: number) => (
    <Text strong style={{ color: '#343a40' }}>{formatCurrency(total)}</Text>
  ),
},
{
  title: 'Estado',
  dataIndex: 'estado',
  key: 'estado',
  width: 100,
  render: (estado: number, record: MovimientoVistaDTO) => {
    const esCerrado = record.periodo === 6;
    const info = ESTADO_MAP[estado] || { label: 'Desconocido', color: 'default' };
    return (
      <Space>
        <Tag color={info.color}>{info.label}</Tag>
        {esCerrado && <Tag color="geekblue">Cerrado</Tag>}
      </Space>
    );
  },
},
{
  title: 'Acciones',
  key: 'acciones',
  width: 140,
  fixed: 'right',
  render: (_: any, record: MovimientoVistaDTO) => (
    <Space size="small">
      <Tooltip title="Ver detalle">
        <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/FTRP/${record.id}`)} />
      </Tooltip>
      {record.periodo !== 6 && record.estado === 0 && (
        <Tooltip title="Editar">
          <Button type="text" size="small" icon={<EditOutlined />} />
        </Tooltip>
      )}
    </Space>
  ),
},
  ];

  return (
    <Card
      styles={{
        body: { padding: 0 },
      }}
      style={{
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: 16,
          flexWrap: 'wrap',
        }}>
          <RangePicker
            style={{ width: 180 }}
            format="YYYY-MM-DD"
            onChange={handleDateChange}
            placeholder={['Desde', 'Hasta']}
          />
          <Input.Search
            placeholder="Buscar documento, concepto..."
            allowClear
            onSearch={handleSearch}
            style={{ width: 400 }}
            prefix={<SearchOutlined style={{ color: '#aaa' }} />}
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
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            style={{ marginLeft: 'auto' }}
          />
        </div>
      </div>

      <Table<MovimientoVistaDTO>
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
        size="middle"
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: {
            cursor: 'pointer',
            background: selectedRow?.id === record.id ? '#eef0fc' : undefined,
            transition: 'background 0.15s',
          },
          onMouseEnter: (e) => {
            if (selectedRow?.id !== record.id) {
              e.currentTarget.style.background = '#f8f9fa';
            }
          },
          onMouseLeave: (e) => {
            if (selectedRow?.id !== record.id) {
              e.currentTarget.style.background = 'transparent';
            }
          },
        })}
        onChange={handleTableChange}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          showTotal: (t) => `${t} registros`,
        }}
        style={{ borderTop: '1px solid #e9ecef', fontFamily: 'inherit' }}
      />

      <Drawer
        title={pdfPreview?.title}
        open={!!pdfPreview}
        onClose={() => {
          if (pdfPreview) URL.revokeObjectURL(pdfPreview.url);
          setPdfPreview(null);
        }}
        width="70%"
      >
        {pdfPreview && (
          <div style={{ width: '100%', height: '100%', overflow: 'auto', transform: 'scale(1.1)', transformOrigin: 'top left' }}>
            <iframe src={pdfPreview.url} style={{ width: '100%', height: '90vh', border: 'none' }} title="PDF" />
          </div>
        )}
      </Drawer>
    </Card>
  );
};

export default TransferenciaAlmacen;