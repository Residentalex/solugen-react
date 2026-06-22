import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Card, Table, Input, Select, Button, Typography, message, Spin, DatePicker, Checkbox,
  Modal, Space, Row, Col, Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined, ReloadOutlined, PrinterOutlined, DownloadOutlined, CloseOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { antiguedadSaldosApi } from '../../api/antiguedadSaldosApi';
import { proveedorApi } from '../../api/proveedorApi';
import { clienteApi } from '../../api/clienteApi';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { toTitleCase, formatCurrency } from '../../utils/formats';
import type { TransaccionBalanceDTO, ResumenAgingDTO, CategoriaEntidadDTO } from '../../types/antiguedadSaldos';
import type { SuplidorDTO } from '../../types/entradaAlmacen';
import type { ClienteDTO } from '../../types/facturacion';

const { Text } = Typography;

/* â”€â”€â”€â”€â”€ Helpers de formato â”€â”€â”€â”€â”€ */

function formatDate(val: string): string {
  if (!val) return '';
  const d = dayjs(val);
  if (!d.isValid()) return val;
  return d.format('DD/MM/YYYY');
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

/* â”€â”€â”€â”€â”€ Helpers de aging â”€â”€â”€â”€â”€ */

interface AgingValues {
  monto0_30: number;
  monto31_60: number;
  monto61_90: number;
  monto91_120: number;
  montoMas120: number;
}

const FILAS_POR_PAGINA = 25;

/* â”€â”€â”€â”€â”€ Componente principal â”€â”€â”€â”€â”€ */

const AntiguedadSaldos: React.FC<{ tipoEntidad: string }> = ({ tipoEntidad }) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  const esCxP = tipoEntidad === 'SUP';
  const titulo = esCxP ? 'AntigÃ¼edad de Saldos - CxP' : 'AntigÃ¼edad de Saldos - CxC';
  const codigoPantalla = esCxP ? 'RAntiguedadCXP' : 'RAntiguedaCXC';
  const entidadLabel = esCxP ? 'Suplidor' : 'Cliente';

  /* â”€â”€â”€â”€â”€ Estados â”€â”€â”€â”€â”€ */

  // Filtros
  const [fechaHasta, setFechaHasta] = useState<dayjs.Dayjs>(dayjs());
  const [codEntidad, setCodEntidad] = useState<string>('');
  const [nomEntidad, setNomEntidad] = useState<string>('');
  const [codCategoria, setCodCategoria] = useState<string>('');
  const [nomCategoria, setNomCategoria] = useState<string>('');
  const [detallado, setDetallado] = useState<boolean>(true);

  // Datos
  const [data, setData] = useState<TransaccionBalanceDTO[]>([]);
  const [loading, setLoading] = useState(false);

  // ImpresiÃ³n PDF
  const [imprimiendo, setImprimiendo] = useState(false);

  // BÃºsqueda y paginaciÃ³n
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(FILAS_POR_PAGINA);

  // Modal de bÃºsqueda de entidad
  const [modalEntidadAbierto, setModalEntidadAbierto] = useState(false);
  const [entidades, setEntidades] = useState<(SuplidorDTO | ClienteDTO)[]>([]);
  const [entidadesOrig, setEntidadesOrig] = useState<(SuplidorDTO | ClienteDTO)[]>([]);
  const [buscandoEntidad, setBuscandoEntidad] = useState(false);
  const [_searchEntidad, setSearchEntidad] = useState('');

  // Modal de bÃºsqueda de categorÃ­a
  const [modalCategoriaAbierto, setModalCategoriaAbierto] = useState(false);
  const [categorias, setCategorias] = useState<CategoriaEntidadDTO[]>([]);
  const [categoriasOrig, setCategoriasOrig] = useState<CategoriaEntidadDTO[]>([]);
  const [buscandoCategoria, setBuscandoCategoria] = useState(false);
  const [_searchCategoria, setSearchCategoria] = useState('');
  const entidadSearchRef = useRef<any>(null);
  const categoriaSearchRef = useRef<any>(null);

  useEffect(() => {
    if (modalEntidadAbierto) {
      const timer = setTimeout(() => {
        entidadSearchRef.current?.focus?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [modalEntidadAbierto]);

  useEffect(() => {
    if (modalCategoriaAbierto) {
      const timer = setTimeout(() => {
        categoriaSearchRef.current?.focus?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [modalCategoriaAbierto]);

  /* â”€â”€â”€â”€â”€ Cargar datos â”€â”€â”€â”€â”€ */

  const generarReporte = useCallback(async () => {
    setLoading(true);
    try {
      const hasta = formatDateParam(fechaHasta.toDate());
      const resultados = await antiguedadSaldosApi.obtenerBalances(
        sucursalActiva,
        tipoEntidad,
        hasta,
        codEntidad || undefined,
        codCategoria || undefined,
      );
      setData(resultados || []);
      setSearchText('');
      setPage(1);
      if (!resultados || resultados.length === 0) {
        message.info('No se encontraron registros para los filtros seleccionados');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, tipoEntidad, fechaHasta, codEntidad, codCategoria]);

  /* â”€â”€â”€â”€â”€ UI setup â”€â”€â”€â”€â”€ */

  useEffect(() => {
    setActiveModule(codigoPantalla);
    setPageTitleOverride(titulo);
    updateToolbar({});
    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, updateToolbar, resetToolbar, codigoPantalla, titulo]);

  /* â”€â”€â”€â”€â”€ Handlers â”€â”€â”€â”€â”€ */

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleRefresh = () => {
    generarReporte();
  };

  const handlePrint = async () => {
    if (!fechaHasta || data.length === 0) {
      message.warning('No hay datos para imprimir');
      return;
    }
    setImprimiendo(true);
    try {
      const hasta = formatDateParam(fechaHasta.toDate());
      const blob = await antiguedadSaldosApi.generarPDF(
        sucursalActiva, tipoEntidad, hasta,
        codEntidad || undefined, codCategoria || undefined
      );
      const blobUrl = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(blobUrl);
        }, 30000);
      }, 2000);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al generar el PDF');
    } finally {
      setImprimiendo(false);
    }
  };

  const limpiarFiltros = () => {
    setFechaHasta(dayjs());
    setCodEntidad('');
    setNomEntidad('');
    setCodCategoria('');
    setNomCategoria('');
    setDetallado(true);
    setData([]);
    setSearchText('');
    setPage(1);
  };

  /* â”€â”€â”€â”€â”€ Handlers de bÃºsqueda de entidad â”€â”€â”€â”€â”€ */

  const abrirModalEntidad = async () => {
    setModalEntidadAbierto(true);
    setSearchEntidad('');
    setBuscandoEntidad(true);
    try {
      if (esCxP) {
        const lista = await proveedorApi.obtenerListado(sucursalActiva);
        setEntidades(lista || []);
        setEntidadesOrig(lista || []);
      } else {
        const lista = await clienteApi.obtenerListado(sucursalActiva);
        setEntidades(lista || []);
        setEntidadesOrig(lista || []);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || `Error al cargar ${entidadLabel.toLowerCase()}s`);
    } finally {
      setBuscandoEntidad(false);
    }
  };

  const buscarEntidad = (valor: string) => {
    setSearchEntidad(valor);
    if (!valor) {
      setEntidades([...entidadesOrig]);
      return;
    }
    const term = valor.toLowerCase();
    const filtradas = entidadesOrig.filter(
      (e) =>
        e.codigo?.toLowerCase().includes(term) ||
        e.nombre?.toLowerCase().includes(term) ||
        ((e as any).identificacion?.toLowerCase() || '').includes(term),
    );
    setEntidades(filtradas);
  };

  const seleccionarEntidad = (item: SuplidorDTO | ClienteDTO) => {
    setCodEntidad(item.codigo);
    setNomEntidad(item.nombre);
    setModalEntidadAbierto(false);
  };

  const limpiarEntidad = () => {
    setCodEntidad('');
    setNomEntidad('');
  };

  /* â”€â”€â”€â”€â”€ Handlers de bÃºsqueda de categorÃ­a â”€â”€â”€â”€â”€ */

  const abrirModalCategoria = async () => {
    setModalCategoriaAbierto(true);
    setSearchCategoria('');
    setBuscandoCategoria(true);
    try {
      const lista = await antiguedadSaldosApi.obtenerCategorias(sucursalActiva, tipoEntidad);
      setCategorias(lista || []);
      setCategoriasOrig(lista || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar categorÃ­as');
    } finally {
      setBuscandoCategoria(false);
    }
  };

  const buscarCategoria = (valor: string) => {
    setSearchCategoria(valor);
    if (!valor) {
      setCategorias(categoriasOrig);
      return;
    }
    const filtradas = categoriasOrig.filter(
      (c) =>
        c.nombre?.toLowerCase().includes(valor.toLowerCase()) ||
        c.codigo?.toLowerCase().includes(valor.toLowerCase()),
    );
    setCategorias(filtradas);
  };

  const seleccionarCategoria = (item: CategoriaEntidadDTO) => {
    setCodCategoria(item.codigo);
    setNomCategoria(item.nombre);
    setModalCategoriaAbierto(false);
  };

  const limpiarCategoria = () => {
    setCodCategoria('');
    setNomCategoria('');
  };

  /* â”€â”€â”€â”€â”€ Procesar datos: filtro local â”€â”€â”€â”€â”€ */

  const filteredData = useMemo(() => {
    if (!searchText) return data;
    const term = searchText.toLowerCase();
    return data.filter(
      (item) =>
        (item.noDocumento || '').toLowerCase().includes(term) ||
        (item.ncf || '').toLowerCase().includes(term) ||
        (item.entidad?.nombre || item.nombreEntidad || '').toLowerCase().includes(term),
    );
  }, [data, searchText]);

  /* â”€â”€â”€â”€â”€ Procesar datos: aging â”€â”€â”€â”€â”€ */

  const calcAging = useCallback(
    (item: TransaccionBalanceDTO): AgingValues => {
      const diff = fechaHasta.diff(dayjs(item.fechaDocumento), 'day');
      const balance = (item.creditos || 0) - (item.debitos || 0);
      return {
        monto0_30: diff >= 0 && diff <= 30 ? balance : 0,
        monto31_60: diff >= 31 && diff <= 60 ? balance : 0,
        monto61_90: diff >= 61 && diff <= 90 ? balance : 0,
        monto91_120: diff >= 91 && diff <= 120 ? balance : 0,
        montoMas120: diff > 120 ? balance : 0,
      };
    },
    [fechaHasta],
  );

  const agingData = useMemo(() => {
    return filteredData.map((item) => ({ ...item, ...calcAging(item) }));
  }, [filteredData, calcAging]);

  const resumenData = useMemo(() => {
    const map = new Map<string, ResumenAgingDTO>();
    for (const item of filteredData) {
      const key = item.entidad?.codigo || item.codigoEntidad || '';
      const nombre = item.entidad?.nombre || item.nombreEntidad || '';
      const moneda = item.moneda?.nombre || getMonedaSucursalActiva().codigo;
      const aging = calcAging(item);
      const existente = map.get(key);
      if (existente) {
        existente.total += item.total || 0;
        existente.monto0_30 += aging.monto0_30;
        existente.monto31_60 += aging.monto31_60;
        existente.monto61_90 += aging.monto61_90;
        existente.monto91_120 += aging.monto91_120;
        existente.montoMas120 += aging.montoMas120;
      } else {
        map.set(key, {
          key,
          codigoEntidad: key,
          nombreEntidad: nombre,
          total: item.total || 0,
          monto0_30: aging.monto0_30,
          monto31_60: aging.monto31_60,
          monto61_90: aging.monto61_90,
          monto91_120: aging.monto91_120,
          montoMas120: aging.montoMas120,
          moneda,
        });
      }
    }
    return Array.from(map.values());
  }, [filteredData, calcAging]);

  /* â”€â”€â”€â”€â”€ Totales para summary â”€â”€â”€â”€â”€ */

  const summaryTotals = useMemo(() => {
    const items: Array<{ total: number; monto0_30: number; monto31_60: number; monto61_90: number; monto91_120: number; montoMas120: number }> =
      detallado ? agingData : resumenData;
    let total = 0;
    let m0_30 = 0;
    let m31_60 = 0;
    let m61_90 = 0;
    let m91_120 = 0;
    let mMas120 = 0;
    for (const item of items) {
      total += item.total || 0;
      m0_30 += item.monto0_30 || 0;
      m31_60 += item.monto31_60 || 0;
      m61_90 += item.monto61_90 || 0;
      m91_120 += item.monto91_120 || 0;
      mMas120 += item.montoMas120 || 0;
    }
    return { total, m0_30, m31_60, m61_90, m91_120, mMas120 };
  }, [detallado, agingData, resumenData]);

  /* â”€â”€â”€â”€â”€ Exportar Excel â”€â”€â”€â”€â”€ */

  const exportarCSV = () => {
    const items = detallado ? agingData : resumenData;
    if (items.length === 0) {
      message.warning('No hay datos para exportar');
      return;
    }

    const workbook = XLSX.utils.book_new();
    let headersParaExportar: string[];
    let excelData: Record<string, any>[];

    if (detallado) {
      headersParaExportar = ['Documento', 'NCF', 'Fecha', 'Total', '0-30 dÃ­as', '31-60 dÃ­as', '61-90 dÃ­as', '91-120 dÃ­as', 'MÃ¡s 120 dÃ­as'];
      excelData = agingData.map((item) => ({
        [headersParaExportar[0]]: item.noDocumento || '',
        [headersParaExportar[1]]: item.ncf || '',
        [headersParaExportar[2]]: formatDate(item.fechaDocumento),
        [headersParaExportar[3]]: item.total ?? 0,
        [headersParaExportar[4]]: item.monto0_30 ?? 0,
        [headersParaExportar[5]]: item.monto31_60 ?? 0,
        [headersParaExportar[6]]: item.monto61_90 ?? 0,
        [headersParaExportar[7]]: item.monto91_120 ?? 0,
        [headersParaExportar[8]]: item.montoMas120 ?? 0,
      }));
      excelData.push({
        [headersParaExportar[0]]: 'Totales',
        [headersParaExportar[3]]: summaryTotals.total,
        [headersParaExportar[4]]: summaryTotals.m0_30,
        [headersParaExportar[5]]: summaryTotals.m31_60,
        [headersParaExportar[6]]: summaryTotals.m61_90,
        [headersParaExportar[7]]: summaryTotals.m91_120,
        [headersParaExportar[8]]: summaryTotals.mMas120,
      });
    } else {
      headersParaExportar = [entidadLabel, 'CÃ³digo', 'Total', '0-30 dÃ­as', '31-60 dÃ­as', '61-90 dÃ­as', '91-120 dÃ­as', 'MÃ¡s 120 dÃ­as'];
      excelData = resumenData.map((item) => ({
        [headersParaExportar[0]]: item.nombreEntidad,
        [headersParaExportar[1]]: item.codigoEntidad,
        [headersParaExportar[2]]: item.total,
        [headersParaExportar[3]]: item.monto0_30,
        [headersParaExportar[4]]: item.monto31_60,
        [headersParaExportar[5]]: item.monto61_90,
        [headersParaExportar[6]]: item.monto91_120,
        [headersParaExportar[7]]: item.montoMas120,
      }));
      excelData.push({
        [headersParaExportar[0]]: 'Totales',
        [headersParaExportar[2]]: summaryTotals.total,
        [headersParaExportar[3]]: summaryTotals.m0_30,
        [headersParaExportar[4]]: summaryTotals.m31_60,
        [headersParaExportar[5]]: summaryTotals.m61_90,
        [headersParaExportar[6]]: summaryTotals.m91_120,
        [headersParaExportar[7]]: summaryTotals.mMas120,
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = headersParaExportar.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(workbook, worksheet, 'AntigÃ¼edad');
    XLSX.writeFile(workbook, `${titulo.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
  };

  /* â”€â”€â”€â”€â”€ Columnas vista detallada â”€â”€â”€â”€â”€ */

  type AgingRow = TransaccionBalanceDTO & AgingValues;

  const columnsDetallado: ColumnsType<AgingRow> = [
    {
      title: 'Documento',
      dataIndex: 'noDocumento',
      key: 'noDocumento',
      width: 140,
      render: (doc: string) => <Text strong>{toTitleCase(doc || '')}</Text>,
    },
    {
      title: 'NCF',
      dataIndex: 'ncf',
      key: 'ncf',
      width: 140,
      render: (ncf: string) => <Text>{toTitleCase(ncf || '')}</Text>,
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaDocumento',
      key: 'fechaDocumento',
      width: 110,
      render: (f: string) => <Text>{formatDate(f)}</Text>,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 140,
      align: 'right',
      render: (val: number) => <Text strong className="paces-text-total">{formatCurrency(val || 0)}</Text>,
    },
    {
      title: '0-30 dÃ­as',
      dataIndex: 'monto0_30',
      key: 'monto0_30',
      width: 120,
      align: 'right',
      render: (val: number) => <Text>{formatCurrency(val ?? 0)}</Text>,
    },
    {
      title: '31-60 dÃ­as',
      dataIndex: 'monto31_60',
      key: 'monto31_60',
      width: 120,
      align: 'right',
      render: (val: number) => <Text>{formatCurrency(val ?? 0)}</Text>,
    },
    {
      title: '61-90 dÃ­as',
      dataIndex: 'monto61_90',
      key: 'monto61_90',
      width: 120,
      align: 'right',
      render: (val: number) => <Text>{formatCurrency(val ?? 0)}</Text>,
    },
    {
      title: '91-120 dÃ­as',
      dataIndex: 'monto91_120',
      key: 'monto91_120',
      width: 120,
      align: 'right',
      render: (val: number) => <Text>{formatCurrency(val ?? 0)}</Text>,
    },
    {
      title: 'MÃ¡s 120 dÃ­as',
      dataIndex: 'montoMas120',
      key: 'montoMas120',
      width: 120,
      align: 'right',
      render: (val: number) => <Text>{formatCurrency(val ?? 0)}</Text>,
    },
  ];

  /* â”€â”€â”€â”€â”€ Columnas vista resumida â”€â”€â”€â”€â”€ */

  const columnsResumen: ColumnsType<ResumenAgingDTO> = [
    {
      title: entidadLabel,
      key: 'entidad',
      width: 260,
      render: (_: any, record: ResumenAgingDTO) => (
        <Text strong>{toTitleCase(record.nombreEntidad || '')}</Text>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 140,
      align: 'right',
      render: (val: number) => <Text strong className="paces-text-total">{formatCurrency(val ?? 0)}</Text>,
    },
    {
      title: '0-30 dÃ­as',
      dataIndex: 'monto0_30',
      key: 'monto0_30',
      width: 120,
      align: 'right',
      render: (val: number) => <Text>{formatCurrency(val ?? 0)}</Text>,
    },
    {
      title: '31-60 dÃ­as',
      dataIndex: 'monto31_60',
      key: 'monto31_60',
      width: 120,
      align: 'right',
      render: (val: number) => <Text>{formatCurrency(val ?? 0)}</Text>,
    },
    {
      title: '61-90 dÃ­as',
      dataIndex: 'monto61_90',
      key: 'monto61_90',
      width: 120,
      align: 'right',
      render: (val: number) => <Text>{formatCurrency(val ?? 0)}</Text>,
    },
    {
      title: '91-120 dÃ­as',
      dataIndex: 'monto91_120',
      key: 'monto91_120',
      width: 120,
      align: 'right',
      render: (val: number) => <Text>{formatCurrency(val ?? 0)}</Text>,
    },
    {
      title: 'MÃ¡s 120 dÃ­as',
      dataIndex: 'montoMas120',
      key: 'montoMas120',
      width: 120,
      align: 'right',
      render: (val: number) => <Text>{formatCurrency(val ?? 0)}</Text>,
    },
  ];

  /* â”€â”€â”€â”€â”€ Summary row â”€â”€â”€â”€â”€ */

  const renderSummaryDetallado = () => (
    <Table.Summary fixed>
      <Table.Summary.Row>
        <Table.Summary.Cell index={0} colSpan={3}>
          <Text strong style={{ fontSize: 13 }}>Totales</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={3} align="right">
          <Text strong className="paces-text-total">{formatCurrency(summaryTotals.total)}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={4} align="right">
          <Text strong>{formatCurrency(summaryTotals.m0_30)}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={5} align="right">
          <Text strong>{formatCurrency(summaryTotals.m31_60)}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={6} align="right">
          <Text strong>{formatCurrency(summaryTotals.m61_90)}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={7} align="right">
          <Text strong>{formatCurrency(summaryTotals.m91_120)}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={8} align="right">
          <Text strong>{formatCurrency(summaryTotals.mMas120)}</Text>
        </Table.Summary.Cell>
      </Table.Summary.Row>
    </Table.Summary>
  );

  const renderSummaryResumen = () => (
    <Table.Summary fixed>
      <Table.Summary.Row>
        <Table.Summary.Cell index={0}>
          <Text strong style={{ fontSize: 13 }}>Totales</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={1} align="right">
          <Text strong className="paces-text-total">{formatCurrency(summaryTotals.total)}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={2} align="right">
          <Text strong>{formatCurrency(summaryTotals.m0_30)}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={3} align="right">
          <Text strong>{formatCurrency(summaryTotals.m31_60)}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={4} align="right">
          <Text strong>{formatCurrency(summaryTotals.m61_90)}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={5} align="right">
          <Text strong>{formatCurrency(summaryTotals.m91_120)}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={6} align="right">
          <Text strong>{formatCurrency(summaryTotals.mMas120)}</Text>
        </Table.Summary.Cell>
      </Table.Summary.Row>
    </Table.Summary>
  );

  /* â”€â”€â”€â”€â”€ PaginaciÃ³n â”€â”€â”€â”€â”€ */

  const paginationProps = {
    current: page,
    pageSize,
    showSizeChanger: false,
    showTotal: (t: number) => `${t} registros`,
    onChange: (p: number) => setPage(p),
  };

  /* â”€â”€â”€â”€â”€ Render â”€â”€â”€â”€â”€ */

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .paces-card-erp { box-shadow: none !important; border: none !important; }
          .ant-table { font-size: 9pt; }
          .ant-table-thead > tr > th { background: #f0f0f0 !important; }
          .ant-table-pagination { display: none !important; }
          .ant-spin-nested-loading { overflow: visible !important; }
        }
      `}</style>

      {/* â”€â”€â”€â”€â”€ Filtros â”€â”€â”€â”€â”€ */}
      <Card className="paces-card no-print" style={{ marginBottom: 16 }}>
        <div style={{ padding: '16px 24px' }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Fecha corte</Text>
              </div>
              <DatePicker
                value={fechaHasta}
                onChange={(d) => d && setFechaHasta(d)}
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
              />
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{entidadLabel}</Text>
              </div>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder={`Buscar ${entidadLabel.toLowerCase()}...`}
                  value={nomEntidad}
                  readOnly
                  style={{ width: '100%' }}
                />
                <Button icon={<SearchOutlined />} onClick={abrirModalEntidad} />
                {nomEntidad ? (
                  <Button icon={<CloseOutlined />} onClick={limpiarEntidad} />
                ) : null}
              </Space.Compact>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>CategorÃ­a</Text>
              </div>
              <Input
                placeholder="Buscar categorÃ­a..."
                value={nomCategoria}
                readOnly
                style={{ width: '100%' }}
                prefix={<SearchOutlined className="paces-text-icon" />}
                suffix={
                  nomCategoria ? (
                    <Button
                      type="text"
                      size="small"
                      onClick={limpiarCategoria}
                      style={{ color: '#999' }}
                    >
                      Ã—
                    </Button>
                  ) : undefined
                }
                onClick={abrirModalCategoria}
              />
            </Col>

            <Col xs={24} sm={12} md={2}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>&nbsp;</Text>
              </div>
              <Checkbox checked={detallado} onChange={(e) => setDetallado(e.target.checked)}>
                Detallado
              </Checkbox>
            </Col>
          </Row>

          <Row style={{ marginTop: 16 }}>
            <Col>
              <Space>
                <Button type="primary" onClick={generarReporte} loading={loading}>
                  Generar
                </Button>
                <Button icon={<ReloadOutlined />} onClick={limpiarFiltros} />
              </Space>
            </Col>
          </Row>
        </div>
      </Card>

      {/* â”€â”€â”€â”€â”€ Resultados â”€â”€â”€â”€â”€ */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : data.length > 0 ? (
        <Card
          className="paces-card-erp"
          styles={{ body: { padding: 0 } }}
          style={{ borderRadius: 8, overflow: 'hidden' }}
        >
          {/* Barra de bÃºsqueda y acciones (no-print) */}
          <div className="no-print" style={{ padding: '16px 24px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
              <Input.Search
                placeholder="Buscar por documento, entidad o NCF..."
                allowClear
                onSearch={handleSearch}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    (e.target as HTMLInputElement).blur();
                    handleSearch('');
                  }
                }}
                style={{ flex: 1, minWidth: 200, maxWidth: 400 }}
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
              <Button icon={<PrinterOutlined />} onClick={handlePrint} loading={imprimiendo}>
                Imprimir PDF
              </Button>
              <Button icon={<DownloadOutlined />} onClick={exportarCSV}>
                Exportar
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
            </div>
          </div>

          {/* Tabla con aging */}
          {detallado ? (
            <Table<AgingRow>
              columns={columnsDetallado}
              dataSource={agingData}
              rowKey="id"
              loading={false}
              scroll={{ x: 1300 }}
              size="middle"
              pagination={paginationProps}
              summary={renderSummaryDetallado}
              className="paces-border-top paces-list-table"
            />
          ) : (
            <Table<ResumenAgingDTO>
              columns={columnsResumen}
              dataSource={resumenData}
              rowKey="key"
              loading={false}
              scroll={{ x: 1100 }}
              size="middle"
              pagination={paginationProps}
              summary={renderSummaryResumen}
              className="paces-border-top paces-list-table"
            />
          )}
        </Card>
      ) : null}

      {/* â”€â”€â”€â”€â”€ Modal bÃºsqueda entidad â”€â”€â”€â”€â”€ */}
      <Modal
        title={`Buscar ${entidadLabel}`}
        open={modalEntidadAbierto}
        onCancel={() => setModalEntidadAbierto(false)}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Input.Search
          ref={entidadSearchRef}
          placeholder="Buscar por nombre o cÃ³digo..."
          allowClear
          onSearch={buscarEntidad}
          style={{ marginBottom: 12 }}
        />
        <Table
          columns={[
            { title: 'CÃ³digo', dataIndex: 'codigo', key: 'codigo', width: 100 },
            { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
            ...(esCxP
              ? [{ title: 'RNC', dataIndex: 'identificacion' as string, key: 'identificacion', width: 140 }]
              : [{ title: 'IdentificaciÃ³n', dataIndex: 'identificacion' as string, key: 'identificacion', width: 140 }]
            ),
          ]}
          dataSource={entidades}
          rowKey="codigo"
          loading={buscandoEntidad}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          onRow={(record: any) => ({
            onClick: () => seleccionarEntidad(record),
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="Sin resultados" /></div> }}
        />
      </Modal>

      {/* â”€â”€â”€â”€â”€ Modal bÃºsqueda categorÃ­a â”€â”€â”€â”€â”€ */}
      <Modal
        title="Buscar CategorÃ­a"
        open={modalCategoriaAbierto}
        onCancel={() => setModalCategoriaAbierto(false)}
        footer={null}
        width={500}
        destroyOnHidden
      >
        <Input.Search
          ref={categoriaSearchRef}
          placeholder="Buscar por nombre o cÃ³digo..."
          allowClear
          onSearch={buscarCategoria}
          style={{ marginBottom: 12 }}
        />
        <Table
          columns={[
            { title: 'CÃ³digo', dataIndex: 'codigo', key: 'codigo', width: 100 },
            { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
          ]}
          dataSource={categorias}
          rowKey={(r) => r.id || r.codigo}
          loading={buscandoCategoria}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          onRow={(record: any) => ({
            onClick: () => seleccionarCategoria(record),
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="Sin resultados" /></div> }}
        />
      </Modal>
    </>
  );
};

export default AntiguedadSaldos;
