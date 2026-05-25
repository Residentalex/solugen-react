import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Input, DatePicker, Select, Tag, message, Drawer, Card, Button, Tooltip, Typography, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { reciboIngresoApi } from '../../api/reciboIngresoApi';
import { apiClient } from '../../api/client';
import PermissionGate from '../../components/PermissionGate';
import type { TransaccionVistaDTO, FiltroTransaccion } from '../../types/transaccion';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined, PlusOutlined, PrinterOutlined, LockFilled } from '@ant-design/icons';

const { RangePicker } = DatePicker;
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

const ReciboIngreso: React.FC = () => {
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
  const [searchText, setSearchText] = useState('');
  const [selectedRow, setSelectedRow] = useState<TransaccionVistaDTO | null>(null);
  const [fechaTrigger, setFechaTrigger] = useState(0);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null);

  const dateParamsRef = useRef({ desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)), hasta: formatDateParam(new Date()) });

  const cargarDatos = useCallback(async (pagina: number, filas: number, busqueda: string) => {
    setLoading(true);
    try {
      let result: TransaccionVistaDTO[];
      if (busqueda.length > 2) {
        const filtro: FiltroTransaccion = {
          cantidad: filas,
          salto: (pagina - 1) * filas,
          ...dateParamsRef.current,
          documento: busqueda,
        };
        result = await reciboIngresoApi.filtrar(sucursalActiva, filtro);
      } else {
        result = await reciboIngresoApi.obtenerVista(
          sucursalActiva,
          dateParamsRef.current.desde, dateParamsRef.current.hasta,
          filas, (pagina - 1) * filas
        );
      }
      setData(result);
      setTotal(result.length < filas ? (pagina - 1) * filas + result.length + 1 : (pagina - 1) * filas + result.length + filas);
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
    setActiveModule('FRI');
    updateToolbar({ editar: false });
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleRefresh = () => setFechaTrigger(n => n + 1);

  const handleImprimir = useCallback(async () => {
    if (!selectedRow) {
      message.warning('Seleccione un documento primero');
      return;
    }
    try {
      const res = await apiClient.get(`/reportes/contabilidad/reciboIngreso/${sucursalActiva}/${selectedRow.id}`, {
        responseType: 'blob',
      });
      const blobUrl = URL.createObjectURL(res.data);
      setPdfPreview({ url: blobUrl, title: `RI-${selectedRow.documento}` });
    } catch {
      message.error('Error al generar el PDF');
    }
  }, [selectedRow, sucursalActiva]);

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
    setFechaTrigger(n => n + 1);
  };

  const handleRowClick = (record: TransaccionVistaDTO) => {
    setSelectedRow(record);
    const editable = record.periodo !== 6 && record.estado === 0;
    updateToolbar({ editar: editable });
  };

  const columns: ColumnsType<TransaccionVistaDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 160,
      fixed: 'left',
      render: (doc: string, record: TransaccionVistaDTO) => (
        <Text strong className="paces-doc-link" onClick={() => navigate(`/FRI/${record.id}`)}>{doc}</Text>
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
          <div className="paces-avatar-initials">
            {getInitials(name)}
          </div>
          <Text>{titlecase(name) || ''}</Text>
        </Space>
      ),
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      key: 'concepto',
      width: 280,
      ellipsis: true,
      render: (concepto: string) => <Text>{titlecase(concepto) || ''}</Text>,
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
      render: (estado: number, record: TransaccionVistaDTO) => {
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
    <Card
      styles={{ body: { padding: 0 } }}
      className="paces-card-erp" style={{ borderRadius: 8 }}
    >
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
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
          <PermissionGate accion="CREAR">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/FCOIN/nuevo')}>
              Nuevo
            </Button>
          </PermissionGate>
          <PermissionGate accion="IMPRIMIR">
            <Button icon={<PrinterOutlined />} onClick={handleImprimir} disabled={!selectedRow} />
          </PermissionGate>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
        </div>
      </div>

      <Table<TransaccionVistaDTO>
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1150 }}
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
        pagination={{
          current: page,
          pageSize,
          total,
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
        width="70%"
      >
        {pdfPreview && (
          <iframe src={pdfPreview.url} style={{ width: '100%', height: '90vh', border: 'none' }} title="PDF" />
        )}
      </Drawer>
    </Card>
  );
};

export default ReciboIngreso;
