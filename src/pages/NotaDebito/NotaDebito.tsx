import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Input, DatePicker, Select, Tag, message, Drawer } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { notaDebitoApi } from '../../api/notaDebitoApi';
import { apiClient } from '../../api/client';
import type { TransaccionVistaDTO, FiltroTransaccion } from '../../types/transaccion';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';

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
const FILAS_POR_PAGINA = 25;

function formatDate(val: string): string {
  if (!val) return '-';
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

interface NotaDebitoProps {
  tipoEntidad: 'SUP' | 'CLI';
}

const NotaDebito: React.FC<NotaDebitoProps> = ({ tipoEntidad }) => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const setImprimirCallback = useUIStore((s: any) => s.setImprimirCallback);

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
          tipoEntidad,
          documento: busqueda,
        };
        result = await notaDebitoApi.filtrar(sucursalActiva, tipoEntidad, filtro);
      } else {
        result = await notaDebitoApi.obtenerVista(
          sucursalActiva, tipoEntidad,
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
  }, [sucursalActiva, tipoEntidad]);

  useEffect(() => {
    cargarDatos(page, pageSize, searchText);
  }, [page, pageSize, searchText, fechaTrigger, cargarDatos]);

  const codigoPantalla = tipoEntidad === 'SUP' ? 'FNDSUP' : 'FNDCLI';
  const entidadLabel = tipoEntidad === 'SUP' ? 'Suplidor' : 'Cliente';

  useEffect(() => {
    setActiveModule(codigoPantalla);
    updateToolbar({ nuevo: true, editar: false, imprimir: true });
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, codigoPantalla]);

  useEffect(() => {
    if (selectedRow) {
      setImprimirCallback(async () => {
        try {
          const res = await apiClient.get(`/reportes/contabilidad/nota-debito/${sucursalActiva}/${selectedRow.id}`, {
            responseType: 'blob',
          });
          const blobUrl = URL.createObjectURL(res.data);
          setPdfPreview({ url: blobUrl, title: `ND-${selectedRow.documento}` });
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

  const handleRefresh = () => setFechaTrigger(n => n + 1);

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
      width: 140,
      fixed: 'left',
      render: (doc: string, record: TransaccionVistaDTO) => (
        <a onClick={() => navigate(`/${codigoPantalla}/${record.id}`)} style={{ color: '#6c5ffc', fontWeight: 500 }}>
          {doc}
        </a>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (v: string) => formatDate(v),
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      key: 'concepto',
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: entidadLabel,
      dataIndex: 'entidad',
      key: 'entidad',
      width: 180,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: 'NCF',
      dataIndex: 'ncf',
      key: 'ncf',
      width: 140,
      render: (v: string) => v || '-',
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 140,
      align: 'right',
      render: (v: number) => <strong>{formatCurrency(v)}</strong>,
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

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <RangePicker onChange={handleDateChange} />
        <Input.Search
          placeholder={`Buscar por documento, NCF, concepto, ${entidadLabel.toLowerCase()}...`}
          onSearch={handleSearch}
          enterButton={<SearchOutlined />}
          allowClear
          style={{ width: 360 }}
        />
        <Select
          value={pageSize}
          onChange={(v) => { setPageSize(v); setPage(1); }}
          style={{ width: 100 }}
          options={[
            { value: 25, label: '25 filas' },
            { value: 50, label: '50 filas' },
            { value: 100, label: '100 filas' },
          ]}
        />
        <a onClick={handleRefresh} style={{ fontSize: 18, color: '#6c757d', cursor: 'pointer' }}>
          <ReloadOutlined />
        </a>
      </div>

      <div className="paces-card" style={{ padding: 0 }}>
        <Table<TransaccionVistaDTO>
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          size="middle"
          scroll={{ x: 900 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: false,
            showTotal: (t) => `Aprox. ${t} registros`,
          }}
          onChange={(pagination) => {
            if (pagination.current) setPage(pagination.current);
          }}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: {
              cursor: 'pointer',
              background: selectedRow?.id === record.id ? '#f0f1ff' : undefined,
            },
          })}
        />
      </div>

      <Drawer
        title={pdfPreview?.title || 'Vista previa PDF'}
        placement="right"
        width="70%"
        onClose={() => {
          setPdfPreview(null);
          if (pdfPreview?.url) URL.revokeObjectURL(pdfPreview.url);
        }}
        open={!!pdfPreview}
      >
        {pdfPreview && (
          <iframe src={pdfPreview.url} style={{ width: '100%', height: '100%', border: 'none' }} title="PDF Preview" />
        )}
      </Drawer>
    </div>
  );
};

export default NotaDebito;
