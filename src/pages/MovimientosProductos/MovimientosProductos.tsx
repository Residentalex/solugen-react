import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Table, Card, Input, Typography, Alert, Button,  Switch, Space, Popover, Badge, DatePicker, Empty, Tooltip, Tag } from 'antd';
import { Select } from '../../components/Select';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { formatCurrency } from '../../utils/formats';
import FechaColumnCell from '../../components/FechaColumnCell';
import PermissionGate from '../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { movimientoApi } from '../../api/movimientoApi';
import { almacenApi } from '../../api/almacenApi';
import type { MovimientoFiltros } from '../../api/movimientoApi';
import type { MovimientoDTO } from '../../types/movimiento';
import type { AlmacenDTO } from '../../types/entradaAlmacen';
import ColumnVisibilityToggle from '../../components/ColumnVisibilityToggle';
import type { ColumnConfig } from '../../components/ColumnVisibilityToggle';
import { useColumnasVisibles } from '../../hooks/useColumnasVisibles';

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

const TIPO_DOC_STYLE: Record<string, { color: string; label: string }> = {
  ENP: { color: 'success', label: 'Entrada' },
  SAP: { color: 'error', label: 'Salida' },
  FAC: { color: 'processing', label: 'Factura' },
  PV: { color: 'processing', label: 'POS' },
  DVC: { color: 'warning', label: 'Dev. Compra' },
  DEV: { color: 'warning', label: 'Dev. Venta' },
  Existencia: { color: 'default', label: 'Existencia' },
};

const ALL_COLUMNS_CONFIG: ColumnConfig[] = [
  { key: 'fecha', label: 'Fecha', defaultVisible: true },
  { key: 'documento', label: 'Documento', defaultVisible: true },
  { key: 'articulo', label: 'Artículo', defaultVisible: true },
  { key: 'familia', label: 'Familia', defaultVisible: true },
  { key: 'almacen', label: 'Almacén', defaultVisible: true },
  { key: 'cantidad', label: 'Cantidad', defaultVisible: true },
  { key: 'costo', label: 'Costo', defaultVisible: true },
  { key: 'tipoDocumento', label: 'Tipo Doc.', defaultVisible: true },
  { key: 'entidad', label: 'Entidad', defaultVisible: true },
  { key: 'referencia', label: 'Referencia/Concepto', defaultVisible: false },
  { key: 'usuario', label: 'Usuario', defaultVisible: false },
  { key: 'costoUnitario', label: 'Costo Unitario', defaultVisible: false },
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

type AgruparPor =
  | 'ninguno'
  | 'fecha'
  | 'documento'
  | 'tipoDocumento'
  | 'producto'
  | 'familia'
  | 'almacen'
  | 'entidad'
  | 'usuario';

const AGRUPAR_OPTIONS: { value: Exclude<AgruparPor, 'ninguno'>; label: string }[] = [
  { value: 'fecha', label: 'Fecha' },
  { value: 'documento', label: 'Documento' },
  { value: 'tipoDocumento', label: 'Tipo Documento' },
  { value: 'producto', label: 'Producto' },
  { value: 'familia', label: 'Familia' },
  { value: 'almacen', label: 'Almacén' },
  { value: 'entidad', label: 'Entidad' },
  { value: 'usuario', label: 'Usuario' },
];

function llaveGrupo(criterio: AgruparPor, d: MovimientoDTO): string {
  switch (criterio) {
    case 'fecha': return (d.fecha ?? '').slice(0, 8);
    case 'documento': return d.documento;
    case 'tipoDocumento': return d.tipoDocumento;
    case 'producto': return d.codigo;
    case 'familia': return d.familia ?? '';
    case 'almacen': return d.almacen;
    case 'entidad': return d.entidad ?? '';
    case 'usuario': return d.usuario?.trim() ?? '';
    default: return '';
  }
}

function etiquetaGrupo(criterio: AgruparPor, d: MovimientoDTO): string {
  switch (criterio) {
    case 'fecha': return formatDate(d.fecha);
    case 'documento': return d.documento || '-';
    case 'tipoDocumento': return TIPO_DOC_STYLE[d.tipoDocumento]?.label ?? d.tipoDocumento;
    case 'producto': return `${d.codigo}${d.articulo ? ' - ' + toTitleCase(d.articulo) : ''}`;
    case 'familia': return toTitleCase(d.familia) || '(Sin familia)';
    case 'almacen': return toTitleCase(d.almacen) || '(Sin almacén)';
    case 'entidad': return toTitleCase(d.entidad) || '(Sin entidad)';
    case 'usuario': return toTitleCase(d.usuario?.trim()) || '(Sin usuario)';
    default: return '';
  }
}

type FilaMovimiento = MovimientoDTO & {
  key: string;
  esGrupo?: boolean;
  grupoEtiqueta?: string;
  grupoLlave?: string;
  grupoCantidad?: number;
  children?: FilaMovimiento[];
};

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
  // Guard de secuencia: descarta respuestas obsoletas sin bloquear clics concurrentes
  const requestIdRef = useRef(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(FILAS_POR_PAGINA);
  const [searchText, setSearchText] = useState('');
  const [loadingError, setLoadingError] = useState(false);

  const { visibleKeys: visibleColumnKeys, setVisibleKeys: setVisibleColumnKeys } = useColumnasVisibles({
    pantalla: 'CMovimientosProductos',
    columns: ALL_COLUMNS_CONFIG,
    legacyStorageKey: 'movProd_visibleColumns',
  });

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
  const [agruparPor, setAgruparPor] = useState<AgruparPor>('ninguno');
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  const cargarDatos = useCallback(async (filtrosParaCargar?: FiltrosMov) => {
    const requestId = ++requestIdRef.current;
    setLoadingError(false);
    setLoading(true);
    try {
      const f = filtrosParaCargar ?? filtros;
      const params: MovimientoFiltros = {
        desde: f.desde,
        hasta: f.hasta,
        cantidad: 100000,
        salto: 0,
        existencia: f.existencia ? 'true' : 'false',
      };

      if (f.codigo) params.codigo = f.codigo;
      if (f.almacen) params.almacen = f.almacen;
      if (f.tipoDoc.length > 0) params.tipoDoc = f.tipoDoc.join(',');
      if (f.noCuenta) params.noCuenta = f.noCuenta;

      const resultados = await movimientoApi.obtenerDetallado(sucursalActiva, params);
      if (requestId !== requestIdRef.current) return;
      setData(resultados);
      setGenerated(true);
    } catch {
      if (requestId === requestIdRef.current) setLoadingError(true);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [sucursalActiva, filtros]);

  useEffect(() => {
    setActiveModule('CMovimientosProductos');
    return () => {
      resetToolbar();
    };
  }, [setActiveModule, resetToolbar]);

  useEffect(() => {
    almacenApi.obtenerListado(sucursalActiva).then(setListaAlmacenes).catch((err) => console.warn('Error al cargar lista de almacenes', err));
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

  const handleExportarExcel = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    const conGrupo = agruparPor !== 'ninguno';
    const columnHeaders = [
      'Fecha', 'Documento', 'Código', 'Artículo', 'Familia', 'Almacén',
      'Cantidad', 'Costo', 'Tipo Doc.', 'Entidad', 'Referencia/Concepto', 'Usuario', 'Costo Unitario',
      ...(conGrupo ? ['Grupo'] : []),
    ];
    const dataRows = detalleFiltrado.map((r) => [
      formatDate(r.fecha),
      r.documento,
      r.codigo,
      toTitleCase(r.articulo) || '-',
      toTitleCase(r.familia) || '-',
      toTitleCase(r.almacen),
      r.cantidad ?? 0,
      r.costo ?? 0,
      r.tipoDocumento || '-',
      toTitleCase(r.entidad) || '-',
      r.referencia || '-',
      toTitleCase(r.usuario?.trim()) || '-',
      r.cantidad ? r.costo / r.cantidad : 0,
      ...(conGrupo ? [etiquetaGrupo(agruparPor, r)] : []),
    ]);
    exportToExcel({
      companyName,
      columnHeaders,
      dataRows,
      sheetName: 'MovimientosProductos',
      columnWidths: [
        { wch: 14 },
        { wch: 18 },
        { wch: 14 },
        { wch: 30 },
        { wch: 20 },
        { wch: 18 },
        { wch: 12 },
        { wch: 14 },
        { wch: 12 },
        { wch: 22 },
        { wch: 22 },
        { wch: 16 },
        { wch: 14 },
        ...(conGrupo ? [{ wch: 30 }] : []),
      ],
    });
  };

  const handleTableChange = (pagination: any) => {
    setPage(pagination.current);
  };

  const columnaAgrupadaKey = useMemo(() => {
    switch (agruparPor) {
      case 'fecha': return 'fecha';
      case 'documento': return 'documento';
      case 'tipoDocumento': return 'tipoDocumento';
      case 'producto': return 'articulo';
      case 'familia': return 'familia';
      case 'almacen': return 'almacen';
      case 'entidad': return 'entidad';
      case 'usuario': return 'usuario';
      default: return '';
    }
  }, [agruparPor]);

  const primeraColumnaKey = useMemo(() => {
    const visibleSet = new Set(visibleColumnKeys);
    const primera = ALL_COLUMNS_CONFIG.find(
      (col) => visibleSet.has(col.key) || col.key === columnaAgrupadaKey
    );
    return primera?.key ?? 'fecha';
  }, [visibleColumnKeys, columnaAgrupadaKey]);

  const detalleFiltrado = useMemo<MovimientoDTO[]>(() => {
    if (!searchText) return data;
    const t = searchText.toLowerCase();
    return data.filter((d) =>
      d.documento?.toLowerCase().includes(t) ||
      d.codigo?.toLowerCase().includes(t) ||
      d.articulo?.toLowerCase().includes(t) ||
      d.familia?.toLowerCase().includes(t) ||
      d.almacen?.toLowerCase().includes(t) ||
      d.entidad?.toLowerCase().includes(t) ||
      d.usuario?.toLowerCase().includes(t) ||
      d.tipoDocumento?.toLowerCase().includes(t)
    );
  }, [data, searchText]);

  const filas = useMemo<FilaMovimiento[]>(() => {
    const detalle: FilaMovimiento[] = detalleFiltrado.map((d, i) => ({
      ...d,
      key: `${d.documento}-${d.codigo}-${d.almacen}-${d.familia ?? ''}-${i}`,
    }));

    if (agruparPor === 'ninguno') return detalle;

    const grupos = new Map<string, FilaMovimiento>();
    for (const f of detalle) {
      const llave = llaveGrupo(agruparPor, f);
      let g = grupos.get(llave);
      if (!g) {
        g = {
          ...f,
          key: `grupo-${llave}`,
          esGrupo: true,
          grupoEtiqueta: etiquetaGrupo(agruparPor, f),
          grupoLlave: llave,
          grupoCantidad: 0,
          cantidad: 0,
          costo: 0,
          children: [],
        };
        grupos.set(llave, g);
      }
      g.grupoCantidad = (g.grupoCantidad ?? 0) + 1;
      g.cantidad = (g.cantidad ?? 0) + (f.cantidad ?? 0);
      g.costo = (g.costo ?? 0) + (f.costo ?? 0);
      g.children!.push(f);
    }

    return Array.from(grupos.values()).sort((a, b) =>
      (a.grupoLlave ?? '').localeCompare(b.grupoLlave ?? '', undefined, { sensitivity: 'base' })
    );
  }, [detalleFiltrado, agruparPor]);

  const filasPaginadas = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filas.slice(start, start + pageSize);
  }, [filas, page, pageSize]);

  const totales = useMemo(() => {
    let cantidad = 0;
    let costo = 0;
    for (const d of detalleFiltrado) {
      cantidad += d.cantidad ?? 0;
      costo += d.costo ?? 0;
    }
    return { cantidad, costo };
  }, [detalleFiltrado]);

  const resumenMovimiento = useMemo(() => {
    const base = !searchText
      ? data
      : data.filter(d => {
          const t = searchText.toLowerCase();
          return (
            d.codigo?.toLowerCase().includes(t) ||
            d.articulo?.toLowerCase().includes(t) ||
            d.familia?.toLowerCase().includes(t)
          );
        });
    const entradas = base.filter((r) => r.tipoDocumento === 'ENP').length;
    const salidas = base.filter((r) => r.tipoDocumento === 'SAP').length;
    const saldo = entradas - salidas;
    return { entradas, salidas, saldo };
  }, [data, searchText]);

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

  const filterTags = useMemo(() => {
    const tags: { key: string; label: string }[] = [];
    if (filtros.desde !== rangoDefault.desde || filtros.hasta !== rangoDefault.hasta) {
      tags.push({ key: 'fecha', label: `Período: ${formatDate(filtros.desde)} - ${formatDate(filtros.hasta)}` });
    }
    if (filtros.codigo) tags.push({ key: 'codigo', label: `Código: ${filtros.codigo}` });
    if (filtros.almacen) tags.push({ key: 'almacen', label: `Almacén: ${filtros.almacen}` });
    if (filtros.tipoDoc.length > 0) tags.push({ key: 'tipoDoc', label: `Tipos: ${filtros.tipoDoc.join(', ')}` });
    if (filtros.noCuenta) tags.push({ key: 'noCuenta', label: `No. Cuenta: ${filtros.noCuenta}` });
    if (!filtros.existencia) tags.push({ key: 'existencia', label: 'Sin existencia' });
    return tags;
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
    const next = { ...draft };
    setPopoverOpen(false);
    setFiltros(next);
    setPage(1);
    setSearchText('');
    if (generated) cargarDatos(next);
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
          options={listaAlmacenes.map(a => ({ value: a.idExterno ?? a.codigo, label: a.nombre }))}
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
        <Button onClick={limpiarFiltros} disabled={loading}>Limpiar</Button>
        <Button type="primary" onClick={aplicarFiltros} disabled={loading}>Aplicar</Button>
      </div>
    </div>
  );

  const celdaWrap = () => ({
    style: { verticalAlign: 'top' as const, whiteSpace: 'normal' as const, wordBreak: 'break-word' as const },
  });

  const celdaConGrupo = (
    colKey: string,
    renderNormal: (val: any, record: FilaMovimiento) => React.ReactNode,
  ) =>
    (val: any, record: FilaMovimiento): React.ReactNode => {
      if (!record.esGrupo) return renderNormal(val, record);
      if (colKey === primeraColumnaKey) {
        return (
          <Text strong>
            {record.grupoEtiqueta} ({record.grupoCantidad})
          </Text>
        );
      }
      return '';
    };

  const ALL_COLUMN_DEFS: ColumnsType<FilaMovimiento> = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 130,
      render: celdaConGrupo('fecha', (f: string) => <FechaColumnCell fecha={f} />),
    },
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 140,
      render: celdaConGrupo('documento', (doc: string) => <Text strong>{doc}</Text>),
    },
    {
      title: 'Artículo',
      key: 'articulo',
      width: 260,
      onCell: celdaWrap,
      render: celdaConGrupo('articulo', (_: unknown, record: FilaMovimiento) => (
        <Text>
          <Text strong>{record.codigo}</Text>
          {record.articulo ? <Text> - {toTitleCase(record.articulo)}</Text> : null}
        </Text>
      )),
    },
    {
      title: 'Familia',
      dataIndex: 'familia',
      key: 'familia',
      width: 150,
      onCell: celdaWrap,
      render: celdaConGrupo('familia', (val: string) => <Text>{toTitleCase(val) || '-'}</Text>),
    },
    {
      title: 'Almacén',
      dataIndex: 'almacen',
      key: 'almacen',
      width: 150,
      onCell: celdaWrap,
      render: celdaConGrupo('almacen', (val: string) => <Text>{toTitleCase(val)}</Text>),
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 120,
      align: 'right',
      render: (val: number, record: FilaMovimiento) => {
        if (record.esGrupo) {
          return (
            <Text strong style={{ whiteSpace: 'nowrap' }}>
              {formatNumber(record.cantidad ?? 0)}
            </Text>
          );
        }
        return (
          <Text style={{ color: val < 0 ? '#f5222d' : undefined, whiteSpace: 'nowrap' }}>
            {formatNumber(val)}
          </Text>
        );
      },
    },
    {
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      width: 150,
      align: 'right',
      render: (val: number, record: FilaMovimiento) => {
        if (record.esGrupo) {
          return (
            <Text strong style={{ whiteSpace: 'nowrap' }}>
              {formatCurrency(record.costo ?? 0)}
            </Text>
          );
        }
        return <Text style={{ whiteSpace: 'nowrap' }}>{formatCurrency(val)}</Text>;
      },
    },
    {
      title: 'Tipo Doc.',
      dataIndex: 'tipoDocumento',
      key: 'tipoDocumento',
      width: 100,
      render: celdaConGrupo('tipoDocumento', (val: string) => {
        const tag = TIPO_DOC_STYLE[val] || { color: 'default', label: val || '-' };
        return <Tag color={tag.color}>{tag.label}</Tag>;
      }),
    },
    {
      title: 'Entidad',
      dataIndex: 'entidad',
      key: 'entidad',
      width: 180,
      onCell: celdaWrap,
      render: celdaConGrupo('entidad', (val: string) => <Text>{toTitleCase(val) || '-'}</Text>),
    },
    {
      title: 'Referencia/Concepto',
      dataIndex: 'referencia',
      key: 'referencia',
      width: 220,
      onCell: celdaWrap,
      render: celdaConGrupo('referencia', (val: string) => <Text>{val || '-'}</Text>),
    },
    {
      title: 'Usuario',
      dataIndex: 'usuario',
      key: 'usuario',
      width: 120,
      onCell: celdaWrap,
      render: celdaConGrupo('usuario', (val: string) => {
        const display = val?.trim() || '-';
        return <Text>{toTitleCase(display)}</Text>;
      }),
    },
    {
      title: 'Costo Unitario',
      key: 'costoUnitario',
      width: 140,
      align: 'right',
      render: (_: unknown, record: FilaMovimiento) => {
        const unitario = record.cantidad ? record.costo / record.cantidad : 0;
        return (
          <Text strong={!!record.esGrupo} style={{ whiteSpace: 'nowrap' }}>
            {formatCurrency(unitario)}
          </Text>
        );
      },
    },
  ];

  const columns = useMemo(() => {
    const visibleSet = new Set(visibleColumnKeys);
    const visibles = ALL_COLUMN_DEFS.filter(
      (col) => visibleSet.has(col.key as string) || col.key === columnaAgrupadaKey
    );

    if (agruparPor === 'ninguno') return visibles;

    const COLS_VALOR = ['cantidad', 'costo', 'costoUnitario'];
    const fin = (() => {
      const i = visibles.findIndex((c) => COLS_VALOR.includes(c.key as string));
      return i === -1 ? visibles.length : i;
    })();

    return visibles.map((col, idx) => {
      const onCellBase = col.onCell;
      if (idx === 0) {
        return {
          ...col,
          onCell: (r: FilaMovimiento) =>
            r.esGrupo ? { colSpan: Math.max(1, fin) } : onCellBase ? onCellBase(r) : {},
        };
      }
      if (idx < fin) {
        return {
          ...col,
          onCell: (r: FilaMovimiento) =>
            r.esGrupo ? { colSpan: 0 } : onCellBase ? onCellBase(r) : {},
        };
      }
      return col;
    });
  }, [visibleColumnKeys, columnaAgrupadaKey, agruparPor]);

  const handleRemoveFilterTag = (key: string) => {
    const next = { ...filtros };
    if (key === 'fecha') {
      next.desde = rangoDefault.desde;
      next.hasta = rangoDefault.hasta;
    } else if (key === 'codigo') {
      next.codigo = '';
    } else if (key === 'almacen') {
      next.almacen = '';
    } else if (key === 'tipoDoc') {
      next.tipoDoc = [];
    } else if (key === 'noCuenta') {
      next.noCuenta = '';
    } else if (key === 'existencia') {
      next.existencia = true;
    }
    setFiltros(next);
    setPage(1);
    cargarDatos(next);
  };

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
                  disabled={loading}
                  style={activeFilterCount > 0 ? { borderColor: '#556ee6', color: '#556ee6' } : undefined}
                >
                  Filtros
                </Button>
              </Badge>
            </Popover>
            <ColumnVisibilityToggle
              columns={ALL_COLUMNS_CONFIG}
              visibleKeys={visibleColumnKeys}
              onChange={setVisibleColumnKeys}
              disabled={loading}
            />
            <Select
              placeholder="Agrupar por"
              allowClear
              style={{ width: 190 }}
              value={agruparPor === 'ninguno' ? undefined : agruparPor}
              onChange={(val) => {
                setAgruparPor((val ?? 'ninguno') as AgruparPor);
                setPage(1);
                setExpandedRowKeys([]);
              }}
              options={AGRUPAR_OPTIONS}
              disabled={loading}
            />
            <Button type="primary" onClick={handleGenerar} loading={loading} disabled={loading} style={{ minWidth: 100 }}>
              Generar
            </Button>
            <Input.Search
              placeholder="Buscar en resultados..."
              allowClear
              onSearch={handleSearch}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  (e.target as HTMLInputElement).blur();
                  handleSearch('');
                }
              }}
              style={{ width: '100%', maxWidth: 350 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <div style={{ flex: 1 }} />
            <PermissionGate accion="EXPORTAR">
              <Button icon={<FileExcelOutlined />} onClick={handleExportarExcel} disabled={loading} />
            </PermissionGate>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} disabled={loading} />
          </div>
        </div>

        {/* Filtros activos visibles fuera del panel */}
        {filterTags.length > 0 && (
          <div style={{ padding: '8px 24px 0', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Filtros aplicados:</Text>
              {filterTags.map((tag) => (
              <Tooltip title={`Eliminar filtro: ${tag.label}`}>
                <Button size="small" type="dashed" onClick={() => handleRemoveFilterTag(tag.key)} key={tag.key} disabled={loading}>
                  {tag.label} ×
                </Button>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Indicadores rápidos */}
        {generated && (
          <div style={{ padding: '8px 24px 0', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Badge count={resumenMovimiento.entradas} style={{ backgroundColor: '#52c41a' }}>
              <Card size="small" style={{ width: 100, textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Entradas</Text>
              </Card>
            </Badge>
            <Badge count={resumenMovimiento.salidas} style={{ backgroundColor: '#f5222d' }}>
              <Card size="small" style={{ width: 100, textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Salidas</Text>
              </Card>
            </Badge>
            <Badge count={resumenMovimiento.saldo} style={{ backgroundColor: resumenMovimiento.saldo > 0 ? '#52c41a' : '#f5222d' }}>
              <Card size="small" style={{ width: 100, textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Saldo</Text>
              </Card>
            </Badge>
          </div>
        )}

        <Table<FilaMovimiento>
          columns={columns}
          dataSource={filasPaginadas}
          rowKey="key"
          loading={loading}
          scroll={{ x: 1310 }}
          size="middle"
          onChange={handleTableChange}
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys.map(String)),
            rowExpandable: (r) => !!r.esGrupo && (r.children?.length ?? 0) > 0,
          }}
          onRow={(r) => (r.esGrupo ? { style: { background: '#fafafa', fontWeight: 600 } } : {})}
          pagination={{
            current: page,
            pageSize,
            total: filas.length,
            showSizeChanger: false,
            showTotal: (t) => (agruparPor !== 'ninguno' ? `${t} grupos` : `${t} registros`),
            disabled: loading,
          }}
          className="paces-border-top paces-list-table"
          locale={{
            emptyText: generated ? (
              <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description="No se encontraron movimientos para los filtros seleccionados" />
              </div>
            ) : (
              <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description='Presione "Generar" para cargar los movimientos' />
              </div>
            ),
          }}
          summary={generated ? () => {
            const visibleKeys = columns.map((c) => c.key as string);
            return (
              <Table.Summary.Row>
                {columns.map((col, idx) => {
                  const key = col.key as string;
                  if (key === 'cantidad') {
                    return (
                      <Table.Summary.Cell key={key} index={idx} align="right">
                        <Text strong style={{ whiteSpace: 'nowrap' }}>{formatNumber(totales.cantidad)}</Text>
                      </Table.Summary.Cell>
                    );
                  }
                  if (key === 'costo') {
                    return (
                      <Table.Summary.Cell key={key} index={idx} align="right">
                        <Text strong style={{ whiteSpace: 'nowrap' }}>{formatCurrency(totales.costo)}</Text>
                      </Table.Summary.Cell>
                    );
                  }
                  if (idx === 0) {
                    return (
                      <Table.Summary.Cell key={key} index={idx}>
                        <Text strong style={{ fontSize: 13 }}>Totales</Text>
                      </Table.Summary.Cell>
                    );
                  }
                  return <Table.Summary.Cell key={key} index={idx} />;
                })}
              </Table.Summary.Row>
            );
          } : undefined}
        />
      </Card>
    </>
  );
};

export default MovimientosProductos;