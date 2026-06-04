import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Table, Card, Input, Typography, Alert, Button, Select, Switch, Space, Popover, Badge, DatePicker } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { movimientoApi } from '../../api/movimientoApi';
import { almacenApi } from '../../api/almacenApi';
import type { MovimientoFiltros } from '../../api/movimientoApi';
import type { MovimientoDTO } from '../../types/movimiento';
import type { AlmacenDTO } from '../../types/entradaAlmacen';

const { Text } = Typography;

const DIAS_POR_DEFECTO = 30;
const FILAS_POR_PAGINA = 25;

const TIPO_DOC_OPTIONS = [
  { value: 'ENP', label: 'Entrada Almacén' },
  { value: 'SAP', label: 'Salida Almacén' },
  { value: 'FAC', label: 'Factura Cliente' },
  { value: 'PV', label: 'Factura POS' },
  { value: 'DVC', label: 'Devolución Compra' },
  { value: 'DEV', label: 'Devolución Venta' },
];

function formatDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${dy}000000`;
}

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

function formatNumber(n: number): string {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toTitleCase(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

type FiltrosMov = {
  desde: string;
  hasta: string;
  codigo: string;
  almacen: string;
  tipoDoc: string[];
  noCuenta: string;
  existencia: boolean;
};

const MovimientosProductos: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  const [data, setData] = useState<MovimientoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(FILAS_POR_PAGINA);
  const [searchText, setSearchText] = useState('');
  const [loadingError, setLoadingError] = useState(false);

  const rangoDefault = useMemo(() => ({
    desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
    hasta: formatDateParam(new Date()),
  }), []);

  const [filtros, setFiltros] = useState<FiltrosMov>({
    desde: rangoDefault.desde,
    hasta: rangoDefault.hasta,
    codigo: '',
    almacen: '',
    tipoDoc: [],
    noCuenta: '',
    existencia: true,
  });

  const [listaAlmacenes, setListaAlmacenes] = useState<AlmacenDTO[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [draft, setDraft] = useState<FiltrosMov>(filtros);
  const [generated, setGenerated] = useState(false);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const params: MovimientoFiltros = {
        desde: filtros.desde,
        hasta: filtros.hasta,
        cantidad: 100000,
        salto: 0,
        existencia: filtros.existencia ? 'true' : 'false',
      };

      if (filtros.codigo) params.codigo = filtros.codigo;
      if (filtros.almacen) params.almacen = filtros.almacen;
      if (filtros.tipoDoc.length > 0) params.tipoDoc = filtros.tipoDoc.join(',');
      if (filtros.noCuenta) params.noCuenta = filtros.noCuenta;

      const resultados = await movimientoApi.obtenerDetallado(sucursalActiva, params);
      setData(resultados);
      setGenerated(true);
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, filtros]);

  useEffect(() => {
    setActiveModule('CMovimientosProductos');
    return () => {
      resetToolbar();
    };
  }, [setActiveModule, resetToolbar]);

  useEffect(() => {
    almacenApi.obtenerListado(sucursalActiva).then(setListaAlmacenes).catch(() => {});
  }, [sucursalActiva]);

  const handleGenerar = () => {
    setPage(1);
    setSearchText('');
    cargarDatos();
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleRefresh = () => {
    setLoadingError(false);
    cargarDatos();
  };

  const handleTableChange = (pagination: any) => {
    setPage(pagination.current);
  };

  const datosFiltrados = useMemo(() => {
    if (!searchText) return data;
    const t = searchText.toLowerCase();
    return data.filter(d =>
      d.codigo?.toLowerCase().includes(t) ||
      d.articulo?.toLowerCase().includes(t)
    );
  }, [data, searchText]);

  const datosPaginados = useMemo(() => {
    const start = (page - 1) * pageSize;
    return datosFiltrados.slice(start, start + pageSize);
  }, [datosFiltrados, page, pageSize]);

  const totales = useMemo(() => {
    let cantidad = 0;
    let costo = 0;
    for (const d of datosFiltrados) {
      cantidad += d.cantidad ?? 0;
      costo += d.costo ?? 0;
    }
    return { cantidad, costo };
  }, [datosFiltrados]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filtros.desde !== rangoDefault.desde || filtros.hasta !== rangoDefault.hasta) count++;
    if (filtros.codigo) count++;
    if (filtros.almacen) count++;
    if (filtros.tipoDoc.length > 0) count++;
    if (filtros.noCuenta) count++;
    if (!filtros.existencia) count++;
    return count;
  }, [filtros, rangoDefault]);

  function strToDayjs(val: string): dayjs.Dayjs | null {
    if (!val) return null;
    const num = val.replace(/\D/g, '');
    if (num.length >= 14) return dayjs(num.slice(0, 14), 'YYYYMMDDHHmmss');
    if (num.length === 8) return dayjs(num, 'YYYYMMDD');
    return null;
  }

  const abrirPopover = () => {
    setDraft({ ...filtros });
    setPopoverOpen(true);
  };

  const aplicarFiltros = () => {
    setPopoverOpen(false);
    setFiltros({ ...draft });
    setPage(1);
  };

  const limpiarFiltros = () => {
    setDraft({
      desde: rangoDefault.desde,
      hasta: rangoDefault.hasta,
      codigo: '',
      almacen: '',
      tipoDoc: [],
      noCuenta: '',
      existencia: true,
    });
  };

  const { RangePicker } = DatePicker;

  const contentPopover = (
    <div style={{ width: 320 }}>
      <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>
        <FilterOutlined style={{ marginRight: 8 }} />
        Filtros
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>Período</div>
        <RangePicker
          value={
            draft.desde && draft.hasta
              ? [strToDayjs(draft.desde), strToDayjs(draft.hasta)]
              : undefined
          }
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              setDraft({ ...draft, desde: dates[0].format('YYYYMMDDHHmmss'), hasta: dates[1].format('YYYYMMDDHHmmss') });
            } else {
              setDraft({ ...draft, desde: rangoDefault.desde, hasta: rangoDefault.hasta });
            }
          }}
          style={{ width: '100%' }}
          placeholder={['Desde', 'Hasta']}
          allowClear
          renderExtraFooter={() => (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button type="link" size="small" style={{ padding: 0 }}
                onClick={() => {
                  const hoy = dayjs();
                  setDraft({ ...draft, desde: hoy.format('YYYYMMDDHHmmss'), hasta: hoy.format('YYYYMMDDHHmmss') });
                }}>
                Hoy
              </Button>
              <Button type="link" size="small" style={{ padding: 0 }}
                onClick={() => {
                  const inicio = dayjs().startOf('month');
                  const fin = dayjs();
                  setDraft({ ...draft, desde: inicio.format('YYYYMMDDHHmmss'), hasta: fin.format('YYYYMMDDHHmmss') });
                }}>
                Este mes
              </Button>
              <Button type="link" size="small" style={{ padding: 0 }}
                onClick={() => {
                  const inicio = dayjs().subtract(30, 'day');
                  const fin = dayjs();
                  setDraft({ ...draft, desde: inicio.format('YYYYMMDDHHmmss'), hasta: fin.format('YYYYMMDDHHmmss') });
                }}>
                30 días
              </Button>
            </div>
          )}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>Código</div>
        <Input
          placeholder="Filtrar por código"
          allowClear
          style={{ width: '100%' }}
          value={draft.codigo}
          onChange={(e) => setDraft({ ...draft, codigo: e.target.value })}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>Almacén</div>
        <Select
          placeholder="Seleccionar almacén"
          allowClear
          showSearch
          style={{ width: '100%' }}
          value={draft.almacen || undefined}
          onChange={(val) => setDraft({ ...draft, almacen: val ?? '' })}
          options={listaAlmacenes.map(a => ({ value: a.codigo, label: a.nombre }))}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>Tipo Documento</div>
        <Select
          mode="multiple"
          placeholder="Seleccionar tipo(s)"
          style={{ width: '100%' }}
          value={draft.tipoDoc}
          onChange={(val) => setDraft({ ...draft, tipoDoc: val })}
          options={TIPO_DOC_OPTIONS}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>No. Cuenta</div>
        <Input
          placeholder="Buscar por No. Cuenta"
          allowClear
          style={{ width: '100%' }}
          value={draft.noCuenta}
          onChange={(e) => setDraft({ ...draft, noCuenta: e.target.value })}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <Text type="secondary" style={{ fontSize: 13 }}>Incluir existencia</Text>
          <Switch checked={draft.existencia} onChange={(val) => setDraft({ ...draft, existencia: val })} />
        </Space>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
        <Button onClick={limpiarFiltros}>Limpiar</Button>
        <Button type="primary" onClick={aplicarFiltros}>Aplicar</Button>
      </div>
    </div>
  );

  const columns: ColumnsType<MovimientoDTO> = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 120,
      render: (f: string) => <Text>{formatDate(f)}</Text>,
    },
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 140,
      render: (doc: string) => <Text strong>{doc}</Text>,
    },
    {
      title: 'Artículo',
      key: 'articulo',
      width: 250,
      render: (_: unknown, record: MovimientoDTO) => (
        <Text>
          <Text strong>{record.codigo}</Text>
          {record.articulo ? <Text> - {toTitleCase(record.articulo)}</Text> : null}
        </Text>
      ),
    },
    {
      title: 'Almacén',
      dataIndex: 'almacen',
      key: 'almacen',
      width: 150,
      render: (val: string) => <Text>{toTitleCase(val)}</Text>,
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 100,
      align: 'right',
      render: (val: number) => (
        <Text style={{ color: val < 0 ? '#f5222d' : undefined }}>
          {formatNumber(val)}
        </Text>
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
      title: 'Tipo Doc.',
      dataIndex: 'tipoDocumento',
      key: 'tipoDocumento',
      width: 120,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Entidad',
      dataIndex: 'entidad',
      key: 'entidad',
      width: 180,
      render: (val: string) => <Text>{toTitleCase(val) || '-'}</Text>,
    },

  ];

  return (
    <>
      {loadingError && (
        <Alert
          message="Error al cargar movimientos de productos"
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
            <Popover
              open={popoverOpen}
              trigger="click"
              placement="bottomRight"
              onOpenChange={(visible) => { if (!visible) setPopoverOpen(false); }}
              content={contentPopover}
            >
              <Badge count={activeFilterCount} size="small" offset={[-5, 5]}>
                <Button
                  icon={<FilterOutlined />}
                  onClick={abrirPopover}
                  style={activeFilterCount > 0 ? { borderColor: '#556ee6', color: '#556ee6' } : undefined}
                >
                  Filtros
                </Button>
              </Badge>
            </Popover>
            <Button type="primary" onClick={handleGenerar} style={{ minWidth: 100 }}>
              Generar
            </Button>
            <Input.Search
              placeholder="Buscar en resultados..."
              allowClear
              onSearch={handleSearch}
              style={{ width: 350 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <div style={{ flex: 1 }} />
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
          </div>
        </div>

        <Table<MovimientoDTO>
          columns={columns}
          dataSource={datosPaginados}
          rowKey={(record) => `${record.documento}-${record.codigo}-${record.almacen}`}
          loading={loading}
          scroll={{ x: 1400 }}
          size="middle"
          onChange={handleTableChange}
          pagination={{
            current: page,
            pageSize,
            total: datosFiltrados.length,
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
          }}
          className="paces-border-top paces-list-table"
          locale={generated ? undefined : { emptyText: 'Presione "Generar" para cargar los movimientos' }}
          summary={generated ? () => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={4}>
                <Text strong style={{ fontSize: 13 }}>Totales</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                <Text strong>{formatNumber(totales.cantidad)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">
                <Text strong>{formatCurrency(totales.costo)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6} colSpan={2} />
            </Table.Summary.Row>
          ) : undefined}
        />
      </Card>
    </>
  );
};

export default MovimientosProductos;
