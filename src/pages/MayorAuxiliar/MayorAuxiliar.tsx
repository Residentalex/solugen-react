import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card, Input, Button, Typography, message, Spin, DatePicker, Checkbox,
  Space, Row, Col, Table, Empty, Statistic, Tag,
} from 'antd';
import { PrinterOutlined, SearchOutlined, CloseOutlined, TableOutlined, ArrowUpOutlined, ArrowDownOutlined, SwapOutlined, FileExcelOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { mayorAuxiliarApi } from '../../api/mayorAuxiliarApi';
import { companiaApi } from '../../api/companiaApi';
import { formatDateParam } from '../../utils/formats';
import PermissionGate from '../../components/PermissionGate';
import BuscarCuentaContableModal from '../../components/BuscarCuentaContableModal/BuscarCuentaContableModal';
import { exportToExcel, exportToExcelMultiSheet } from '../../utils/exportToExcel';
import type { CuentaContableResumenDTO } from '../../types/contabilidad';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface MayorAuxiliarItem {
  fechaDocumento: string;
  documentoCodigo: string;
  documentoNoDocumento: string;
  documentoNombre: string;
  entidadNombre: string;
  cuentaContableNoCuenta: string;
  cuentaContableNombre: string;
  tipoAsiento: string;
  monto: number;
  montoAlterno: number;
  balance: number;
  ordenDocumento: number;
  balanceDocumento: number;
  origenCuenta: string;
}

interface BalancesCuenta {
  balanceInicial: number;
  balanceInicialAlterno: number;
  balanceInicialDebito: number;
  balanceInicialCredito: number;
  balanceFinal: number;
  balanceFinalAlterno: number;
}

interface ResultadoPorCuenta {
  cuenta: CuentaContableResumenDTO;
  items: MayorAuxiliarItem[];
  balances: BalancesCuenta;
}

const toTitleCase = (str: string): string =>
  str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());

const calcularKpi = (items: MayorAuxiliarItem[], balances: BalancesCuenta) => {
  const trimmed = items.map((r) => ({
    ...r,
    tipoAsiento: r.tipoAsiento.trim(),
    origenCuenta: r.origenCuenta.trim(),
  }));
  const totalDebe = trimmed.filter((r) => r.tipoAsiento === 'Debito').reduce((s, r) => s + r.montoAlterno, 0);
  const totalHaber = trimmed.filter((r) => r.tipoAsiento === 'Credito').reduce((s, r) => s + r.montoAlterno, 0);
  return {
    totalDebe,
    totalHaber,
    balanceInicial: balances.balanceInicial,
    balanceInicialDebito: balances.balanceInicialDebito,
    balanceInicialCredito: balances.balanceInicialCredito,
    balanceFinal: balances.balanceFinal,
  };
};

const ordenarItems = (items: MayorAuxiliarItem[]): MayorAuxiliarItem[] => {
  return [...items].sort((a, b) => {
    if (a.documentoCodigo === 'Existencia' && b.documentoCodigo !== 'Existencia') return -1;
    if (a.documentoCodigo !== 'Existencia' && b.documentoCodigo === 'Existencia') return 1;
    return a.fechaDocumento.localeCompare(b.fechaDocumento);
  });
};

const filtrarItems = (items: MayorAuxiliarItem[], busqueda: string): MayorAuxiliarItem[] => {
  if (!busqueda) return items;
  const term = busqueda.toLowerCase();
  return items.filter(
    (r) =>
      r.documentoCodigo.toLowerCase().includes(term) ||
      r.documentoNoDocumento.toLowerCase().includes(term) ||
      r.cuentaContableNoCuenta.toLowerCase().includes(term) ||
      r.cuentaContableNombre.toLowerCase().includes(term) ||
      r.tipoAsiento.trim().toLowerCase().includes(term),
  );
};

interface GrupoDocumento {
  key: string;
  codigo: string;
  nombre: string;
  minFecha: string;
  maxFecha: string;
  totalDebe: number;
  totalHaber: number;
  items: MayorAuxiliarItem[];
}

const agruparPorDocumento = (items: MayorAuxiliarItem[]): GrupoDocumento[] => {
  if (items.length === 0) return [];
  const grupos: GrupoDocumento[] = [];
  const map = new Map<string, MayorAuxiliarItem[]>();
  for (const item of items) {
    if (!map.has(item.documentoCodigo)) map.set(item.documentoCodigo, []);
    map.get(item.documentoCodigo)!.push(item);
  }
  for (const [codigo, itemsDoc] of map) {
    grupos.push({
      key: codigo,
      codigo,
      nombre: itemsDoc[0].documentoNombre,
      minFecha: itemsDoc[0].fechaDocumento,
      maxFecha: itemsDoc[itemsDoc.length - 1].fechaDocumento,
      totalDebe: itemsDoc.filter((i) => i.tipoAsiento.trim() === 'Debito').reduce((s, i) => s + i.montoAlterno, 0),
      totalHaber: itemsDoc.filter((i) => i.tipoAsiento.trim() === 'Credito').reduce((s, i) => s + i.montoAlterno, 0),
      items: itemsDoc,
    });
  }
  return grupos.sort((a, b) => a.minFecha.localeCompare(b.minFecha));
};

const columnasDetallado = [
  { title: 'Fecha', dataIndex: 'fechaDocumento', key: 'fechaDocumento', width: 100, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
  { title: 'Documento', key: 'documento', width: 140, render: (_: any, r: MayorAuxiliarItem) => r.documentoCodigo === 'Existencia' ? 'Balance Anterior' : `${r.documentoCodigo}-${r.documentoNoDocumento}` },
  { title: 'No. Cuenta', dataIndex: 'cuentaContableNoCuenta', key: 'cuentaContableNoCuenta', width: 120 },
  { title: 'Nombre Cuenta', key: 'cuentaContableNombre', width: 200, render: (_: any, r: MayorAuxiliarItem) => toTitleCase(r.cuentaContableNombre) },
  { title: 'Tipo', dataIndex: 'tipoAsiento', key: 'tipoAsiento', width: 80 },
  { title: 'Monto Débito', key: 'montoDebito', width: 130, align: 'right' as const, render: (_: any, r: MayorAuxiliarItem) => r.tipoAsiento.trim() === 'Debito' ? r.montoAlterno.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-' },
  { title: 'Monto Crédito', key: 'montoCredito', width: 130, align: 'right' as const, render: (_: any, r: MayorAuxiliarItem) => r.tipoAsiento.trim() === 'Credito' ? r.montoAlterno.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-' },
  { title: 'Balance', dataIndex: 'balance', key: 'balance', width: 130, align: 'right' as const, render: (v: number) => v.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
];

const MayorAuxiliar: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  /* ──── Estados ──── */

  // Filtros
  const [fechas, setFechas] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().startOf('month'), dayjs()]);
  const [cuentasSeleccionadas, setCuentasSeleccionadas] = useState<CuentaContableResumenDTO[]>([]);
  const [nomCuenta, setNomCuenta] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [balanceAnterior, setBalanceAnterior] = useState(true);
  const [detallado, setDetallado] = useState(true);

  // Datos de tabla (una sola cuenta)
  const [datos, setDatos] = useState<MayorAuxiliarItem[]>([]);
  const [balances, setBalances] = useState<BalancesCuenta | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [busquedaTabla, setBusquedaTabla] = useState('');

  // Datos por cuenta (multiples cuentas)
  const [resultadosPorCuenta, setResultadosPorCuenta] = useState<ResultadoPorCuenta[]>([]);
  const [busquedaPorCuenta, setBusquedaPorCuenta] = useState<Record<string, string>>({});

  // Generacion PDF
  const [generando, setGenerando] = useState(false);

  // Modal de busqueda de cuenta contable
  const [modalCuentaAbierto, setModalCuentaAbierto] = useState(false);

  /* ──── UI setup ──── */

  useEffect(() => {
    setActiveModule('RMayorAux');
    setPageTitleOverride('Mayor Auxiliar');
    updateToolbar({});
    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, updateToolbar, resetToolbar]);

  /* ──── Derivados ──── */

  const esMultiCuenta = cuentasSeleccionadas.length > 1;

  /* ──── Handlers ──── */

  const handlePrint = useCallback(async () => {
    if (cuentasSeleccionadas.length === 0) {
      message.warning('Debe seleccionar al menos una cuenta contable');
      return;
    }
    setGenerando(true);
    try {
      const filtros = {
        fechaInicial: formatDateParam(fechas[0].toDate()),
        fechaFinal: formatDateParam(fechas[1].toDate()),
        noCuentas: cuentasSeleccionadas.map((c) => c.noCuenta),
        tipoDocumento: tipoDocumento || undefined,
        balanceAnterior,
        detallado,
      };

      let blob: Blob;

      if (esMultiCuenta && resultadosPorCuenta.length > 0) {
        // Multi-cuenta: enviar todos los items de la pantalla via imprimir
        const todosItems = resultadosPorCuenta.flatMap((r) => r.items);
        const balancesGlobales: BalancesCuenta = {
          balanceInicial: resultadosPorCuenta.reduce((s, r) => s + r.balances.balanceInicial, 0),
          balanceInicialAlterno: resultadosPorCuenta.reduce((s, r) => s + r.balances.balanceInicialAlterno, 0),
          balanceInicialDebito: resultadosPorCuenta.reduce((s, r) => s + r.balances.balanceInicialDebito, 0),
          balanceInicialCredito: resultadosPorCuenta.reduce((s, r) => s + r.balances.balanceInicialCredito, 0),
          balanceFinal: resultadosPorCuenta.reduce((s, r) => s + r.balances.balanceFinal, 0),
          balanceFinalAlterno: resultadosPorCuenta.reduce((s, r) => s + r.balances.balanceFinalAlterno, 0),
        };
        blob = await mayorAuxiliarApi.imprimir(sucursalActiva, filtros, todosItems, balancesGlobales);
      } else if (datos.length > 0 && balances) {
        // Una sola cuenta: usar imprimir con datos de la pantalla
        blob = await mayorAuxiliarApi.imprimir(sucursalActiva, filtros, datos, balances);
      } else {
        // Sin datos en pantalla: generar desde backend
        blob = await mayorAuxiliarApi.generarPDF(sucursalActiva, filtros);
      }

      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al generar el PDF');
    } finally {
      setGenerando(false);
    }
  }, [sucursalActiva, fechas, cuentasSeleccionadas, tipoDocumento, balanceAnterior, detallado, datos, balances, esMultiCuenta, resultadosPorCuenta]);

  const handleConsultar = useCallback(async () => {
    if (cuentasSeleccionadas.length === 0) {
      message.warning('Debe seleccionar al menos una cuenta contable');
      return;
    }
    setConsultando(true);
    setDatos([]);
    setBalances(null);
    setResultadosPorCuenta([]);
    setBusquedaPorCuenta({});

    try {
      const filtrosBase = {
        fechaInicial: formatDateParam(fechas[0].toDate()),
        fechaFinal: formatDateParam(fechas[1].toDate()),
        tipoDocumento: tipoDocumento || undefined,
        balanceAnterior,
        detallado,
      };

      if (cuentasSeleccionadas.length === 1) {
        // Una sola cuenta: comportamiento original
        const filtros = {
          ...filtrosBase,
          noCuentas: [cuentasSeleccionadas[0].noCuenta],
        };

        const res = await mayorAuxiliarApi.obtenerDatos(sucursalActiva, filtros);
        const items = Array.isArray(res) ? res : (res.items ?? []);
        const sorted = ordenarItems(items);
        setDatos(sorted);
        setBalances({
          balanceInicial: Array.isArray(res) ? 0 : (res.balanceInicial ?? 0),
          balanceInicialAlterno: Array.isArray(res) ? 0 : (res.balanceInicialAlterno ?? 0),
          balanceInicialDebito: Array.isArray(res) ? 0 : (res.balanceInicialDebito ?? 0),
          balanceInicialCredito: Array.isArray(res) ? 0 : (res.balanceInicialCredito ?? 0),
          balanceFinal: Array.isArray(res) ? 0 : (res.balanceFinal ?? 0),
          balanceFinalAlterno: Array.isArray(res) ? 0 : (res.balanceFinalAlterno ?? 0),
        });
      } else {
        // Multiples cuentas: una llamada por cuenta
        const promesas = cuentasSeleccionadas.map(async (cuenta) => {
          const filtros = {
            ...filtrosBase,
            noCuenta: cuenta.noCuenta,
          };
          const res = await mayorAuxiliarApi.obtenerDatos(sucursalActiva, filtros);
          const items = Array.isArray(res) ? res : (res.items ?? []);
          return {
            cuenta,
            items: ordenarItems(items),
            balances: {
              balanceInicial: Array.isArray(res) ? 0 : (res.balanceInicial ?? 0),
              balanceInicialAlterno: Array.isArray(res) ? 0 : (res.balanceInicialAlterno ?? 0),
              balanceInicialDebito: Array.isArray(res) ? 0 : (res.balanceInicialDebito ?? 0),
              balanceInicialCredito: Array.isArray(res) ? 0 : (res.balanceInicialCredito ?? 0),
              balanceFinal: Array.isArray(res) ? 0 : (res.balanceFinal ?? 0),
              balanceFinalAlterno: Array.isArray(res) ? 0 : (res.balanceFinalAlterno ?? 0),
            },
          } as ResultadoPorCuenta;
        });

        const resultados = await Promise.all(promesas);
        setResultadosPorCuenta(resultados);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al consultar los datos');
    } finally {
      setConsultando(false);
    }
  }, [sucursalActiva, fechas, cuentasSeleccionadas, tipoDocumento, balanceAnterior, detallado]);

  /* ──── KPIs y filtro de tabla (una sola cuenta) ──── */

  const kpi = useMemo(() => {
    if (datos.length === 0 || !balances) return null;
    return calcularKpi(datos, balances);
  }, [datos, balances]);

  const datosFiltrados = useMemo(() => {
    return filtrarItems(datos, busquedaTabla);
  }, [datos, busquedaTabla]);

  const gruposDocumento = useMemo(() => agruparPorDocumento(datosFiltrados), [datosFiltrados]);

  /* ──── Exportar Excel ──── */

  const obtenerCompanyInfo = useCallback(async () => {
    let companyInfo = { nombre: 'SOLUGEN S.R.L.', direccion: '', telefono: '', rnc: '' };
    try {
      const lista = await companiaApi.obtenerTodas(sucursalActiva);
      if (lista.length > 0) {
        companyInfo.nombre = lista[0].nombre ?? companyInfo.nombre;
        companyInfo.direccion = lista[0].direccion ?? '';
        companyInfo.telefono = lista[0].telefono ?? '';
        companyInfo.rnc = lista[0].rnc ?? '';
      }
    } catch { /* ignora */ }
    return companyInfo;
  }, [sucursalActiva]);

  const handleExportExcel = useCallback(async () => {
    const companyInfo = await obtenerCompanyInfo();
    const desdeStr = dayjs(fechas[0]).format('DD/MM/YYYY');
    const hastaStr = dayjs(fechas[1]).format('DD/MM/YYYY');
    const filtroCta = cuentasSeleccionadas.length > 0
      ? cuentasSeleccionadas.map((c) => `${c.noCuenta} - ${toTitleCase(c.nombre)}`).join(' | ')
      : 'Todas';
    const filtroDoc = tipoDocumento || 'Todos';

    if (detallado) {
      const columnHeaders = ['Fecha', 'Documento', 'Entidad', 'No. Cuenta', 'Nombre Cuenta', 'Tipo', 'Debito', 'Credito', 'Balance'];
      const dataRows = datosFiltrados.map((r) => [
        dayjs(r.fechaDocumento).format('DD/MM/YYYY'),
        r.documentoCodigo === 'Existencia' ? 'Balance Anterior' : `${r.documentoCodigo}-${r.documentoNoDocumento}`,
        r.entidadNombre,
        r.cuentaContableNoCuenta,
        r.cuentaContableNombre,
        r.tipoAsiento.trim(),
        r.tipoAsiento.trim() === 'Debito' ? r.montoAlterno : 0,
        r.tipoAsiento.trim() === 'Credito' ? r.montoAlterno : 0,
        r.balance,
      ]);
      exportToExcel({
        companyName: companyInfo.nombre,
        extraHeaderRows: [
          [companyInfo.direccion],
          [`Tel.: ${companyInfo.telefono}`],
          [`RNC: ${companyInfo.rnc}`],
          ['REPORTE MAYOR AUXILIAR'],
          [`Periodo: ${desdeStr} - ${hastaStr}  |  Cuenta: ${filtroCta}  |  Doc: ${filtroDoc}`],
          [],
        ],
        columnHeaders,
        dataRows,
        sheetName: 'MayorAuxiliar',
        columnWidths: [{ wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 22 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 16 }],
      });
    } else {
      const columnHeaders = ['Codigo', 'Nombre', 'Desde', 'Hasta', 'Total Debito', 'Total Credito'];
      const dataRows = gruposDocumento.map((g) => [
        g.codigo,
        g.codigo === 'Existencia' ? 'Balance Anterior' : g.nombre,
        dayjs(g.minFecha).format('DD/MM/YYYY'),
        dayjs(g.maxFecha).format('DD/MM/YYYY'),
        g.totalDebe,
        g.totalHaber,
      ]);
      exportToExcel({
        companyName: companyInfo.nombre,
        extraHeaderRows: [
          [companyInfo.direccion],
          [`Tel.: ${companyInfo.telefono}`],
          [`RNC: ${companyInfo.rnc}`],
          ['REPORTE MAYOR AUXILIAR'],
          [`Periodo: ${desdeStr} - ${hastaStr}  |  Cuenta: ${filtroCta}  |  Doc: ${filtroDoc}`],
          [],
        ],
        columnHeaders,
        dataRows,
        sheetName: 'MayorAuxiliar',
        columnWidths: [{ wch: 8 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }],
      });
    }
  }, [obtenerCompanyInfo, datosFiltrados, gruposDocumento, detallado, fechas, cuentasSeleccionadas, tipoDocumento]);

  const handleExportExcelCuenta = useCallback(async (resultado: ResultadoPorCuenta) => {
    const companyInfo = await obtenerCompanyInfo();
    const desdeStr = dayjs(fechas[0]).format('DD/MM/YYYY');
    const hastaStr = dayjs(fechas[1]).format('DD/MM/YYYY');
    const filtroCta = `${resultado.cuenta.noCuenta} - ${toTitleCase(resultado.cuenta.nombre)}`;
    const filtroDoc = tipoDocumento || 'Todos';
    const busqueda = busquedaPorCuenta[resultado.cuenta.noCuenta] || '';
    const itemsCuenta = filtrarItems(resultado.items, busqueda);

    const columnHeaders = ['Fecha', 'Documento', 'Entidad', 'No. Cuenta', 'Nombre Cuenta', 'Tipo', 'Debito', 'Credito', 'Balance'];
    const dataRows = itemsCuenta.map((r) => [
      dayjs(r.fechaDocumento).format('DD/MM/YYYY'),
      r.documentoCodigo === 'Existencia' ? 'Balance Anterior' : `${r.documentoCodigo}-${r.documentoNoDocumento}`,
      r.entidadNombre,
      r.cuentaContableNoCuenta,
      r.cuentaContableNombre,
      r.tipoAsiento.trim(),
      r.tipoAsiento.trim() === 'Debito' ? r.montoAlterno : 0,
      r.tipoAsiento.trim() === 'Credito' ? r.montoAlterno : 0,
      r.balance,
    ]);
    exportToExcel({
      companyName: companyInfo.nombre,
      extraHeaderRows: [
        [companyInfo.direccion],
        [`Tel.: ${companyInfo.telefono}`],
        [`RNC: ${companyInfo.rnc}`],
        ['REPORTE MAYOR AUXILIAR'],
        [`Periodo: ${desdeStr} - ${hastaStr}  |  Cuenta: ${filtroCta}  |  Doc: ${filtroDoc}`],
        [],
      ],
      columnHeaders,
      dataRows,
      sheetName: `Cuenta_${resultado.cuenta.noCuenta}`,
      columnWidths: [{ wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 22 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 16 }],
    });
  }, [obtenerCompanyInfo, fechas, tipoDocumento, busquedaPorCuenta]);

  const handleExportExcelTodas = useCallback(async () => {
    const companyInfo = await obtenerCompanyInfo();
    const desdeStr = dayjs(fechas[0]).format('DD/MM/YYYY');
    const hastaStr = dayjs(fechas[1]).format('DD/MM/YYYY');
    const filtroDoc = tipoDocumento || 'Todos';

    const columnHeaders = ['Fecha', 'Documento', 'Entidad', 'No. Cuenta', 'Nombre Cuenta', 'Tipo', 'Debito', 'Credito', 'Balance'];
    const columnWidths = [{ wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 22 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];

    const sheets = resultadosPorCuenta.map((resultado) => {
      const filtroCta = `${resultado.cuenta.noCuenta} - ${toTitleCase(resultado.cuenta.nombre)}`;
      const dataRows = resultado.items.map((r) => [
        dayjs(r.fechaDocumento).format('DD/MM/YYYY'),
        r.documentoCodigo === 'Existencia' ? 'Balance Anterior' : `${r.documentoCodigo}-${r.documentoNoDocumento}`,
        r.entidadNombre,
        r.cuentaContableNoCuenta,
        r.cuentaContableNombre,
        r.tipoAsiento.trim(),
        r.tipoAsiento.trim() === 'Debito' ? r.montoAlterno : 0,
        r.tipoAsiento.trim() === 'Credito' ? r.montoAlterno : 0,
        r.balance,
      ]);
      return {
        sheetName: resultado.cuenta.noCuenta,
        extraHeaderRows: [
          [companyInfo.direccion],
          [`Tel.: ${companyInfo.telefono}`],
          [`RNC: ${companyInfo.rnc}`],
          ['REPORTE MAYOR AUXILIAR'],
          [`Periodo: ${desdeStr} - ${hastaStr}  |  Cuenta: ${filtroCta}  |  Doc: ${filtroDoc}`],
          [],
        ],
        columnHeaders,
        dataRows,
        columnWidths,
      };
    });

    exportToExcelMultiSheet({
      companyName: companyInfo.nombre,
      sheets,
    });
  }, [obtenerCompanyInfo, fechas, tipoDocumento, resultadosPorCuenta]);

  /* ──── Handlers de busqueda de cuenta ──── */

  const actualizarDisplayCuentas = (cuentas: CuentaContableResumenDTO[]) => {
    if (cuentas.length === 0) {
      setNomCuenta('');
      return;
    }
    if (cuentas.length === 1) {
      setNomCuenta(`${cuentas[0].noCuenta} - ${toTitleCase(cuentas[0].nombre)}`);
    } else {
      setNomCuenta(`${cuentas.length} cuentas (${cuentas.map((c) => c.noCuenta).join(', ')})`);
    }
  };

  const limpiarResultados = () => {
    setDatos([]);
    setBalances(null);
    setResultadosPorCuenta([]);
    setBusquedaPorCuenta({});
  };

  const seleccionarCuenta = (item: CuentaContableResumenDTO) => {
    const cuentas = [item];
    setCuentasSeleccionadas(cuentas);
    actualizarDisplayCuentas(cuentas);
    limpiarResultados();
    setModalCuentaAbierto(false);
  };

  const seleccionarMultiples = (cuentas: CuentaContableResumenDTO[]) => {
    setCuentasSeleccionadas(cuentas);
    actualizarDisplayCuentas(cuentas);
    limpiarResultados();
  };

  const quitarCuenta = (noCuentaAEliminar: string) => {
    const nuevas = cuentasSeleccionadas.filter((c) => c.noCuenta !== noCuentaAEliminar);
    setCuentasSeleccionadas(nuevas);
    actualizarDisplayCuentas(nuevas);
    limpiarResultados();
  };

  const limpiarCuenta = () => {
    setCuentasSeleccionadas([]);
    setNomCuenta('');
    limpiarResultados();
  };

  /* ──── Render KPIs ──── */

  const renderKpis = (kpiData: { totalDebe: number; totalHaber: number; balanceInicial: number; balanceInicialDebito: number; balanceInicialCredito: number; balanceFinal: number }) => (
    <Row gutter={[16, 16]}>
      <Col xs={12} sm={8} md={4}>
        <Statistic
          title="Balance Inicial"
          value={kpiData.balanceInicial}
          precision={2}
          prefix={<SwapOutlined style={{ color: '#556ee6' }} />}
          valueStyle={{ color: '#556ee6', fontSize: 18, fontWeight: 600 }}
        />
      </Col>
      <Col xs={12} sm={8} md={4}>
        <Statistic
          title="Sdo. Anterior Débito"
          value={kpiData.balanceInicialDebito}
          precision={2}
          prefix={<ArrowDownOutlined style={{ color: kpiData.balanceInicialDebito < 0 ? '#f5222d' : '#52c41a' }} />}
          valueStyle={{ color: kpiData.balanceInicialDebito < 0 ? '#f5222d' : '#52c41a', fontSize: 18 }}
        />
      </Col>
      <Col xs={12} sm={8} md={4}>
        <Statistic
          title="Sdo. Anterior Crédito"
          value={kpiData.balanceInicialCredito}
          precision={2}
          prefix={<ArrowUpOutlined style={{ color: kpiData.balanceInicialCredito < 0 ? '#f5222d' : '#52c41a' }} />}
          valueStyle={{ color: kpiData.balanceInicialCredito < 0 ? '#f5222d' : '#52c41a', fontSize: 18 }}
        />
      </Col>
      <Col xs={12} sm={8} md={4}>
        <Statistic
          title="Total Débitos"
          value={kpiData.totalDebe}
          precision={2}
          prefix={<ArrowDownOutlined style={{ color: '#f5222d' }} />}
          valueStyle={{ color: '#f5222d', fontSize: 18 }}
        />
      </Col>
      <Col xs={12} sm={8} md={4}>
        <Statistic
          title="Total Créditos"
          value={kpiData.totalHaber}
          precision={2}
          prefix={<ArrowUpOutlined style={{ color: '#52c41a' }} />}
          valueStyle={{ color: '#52c41a', fontSize: 18 }}
        />
      </Col>
      <Col xs={12} sm={8} md={4}>
        <Statistic
          title="Balance Final"
          value={kpiData.balanceFinal}
          precision={2}
          prefix={<SwapOutlined style={{ color: '#556ee6' }} />}
          valueStyle={{ color: '#556ee6', fontSize: 18, fontWeight: 600 }}
        />
      </Col>
    </Row>
  );

  /* ──── Render ──── */

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .paces-card-erp { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      {/* ──── Filtros ──── */}
      <Card className="paces-card no-print" style={{ marginBottom: 16 }}>
        <div style={{ padding: '16px 24px' }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Rango de Fechas</Text>
              </div>
              <RangePicker
                value={fechas}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) setFechas([dates[0], dates[1]]);
                }}
                format="YYYY-MM-DD"
                allowClear={false}
                style={{ width: '100%' }}
              />
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Cuenta(s)</Text>
              </div>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="Buscar cuenta..."
                  value={nomCuenta}
                  readOnly
                  style={{ width: '100%' }}
                />
                <Button icon={<SearchOutlined />} onClick={() => setModalCuentaAbierto(true)} />
                {cuentasSeleccionadas.length > 0 ? (
                  <Button icon={<CloseOutlined />} onClick={limpiarCuenta} />
                ) : null}
              </Space.Compact>
              {cuentasSeleccionadas.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {cuentasSeleccionadas.map((c) => (
                    <Tag
                      key={c.noCuenta}
                      closable
                      onClose={(e) => {
                        e.preventDefault();
                        quitarCuenta(c.noCuenta);
                      }}
                      style={{ marginInlineEnd: 0 }}
                    >
                      {c.noCuenta} - {toTitleCase(c.nombre)}
                    </Tag>
                  ))}
                </div>
              )}
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Tipo Documento</Text>
              </div>
              <Input
                placeholder="Ej: FAC, NCR, NDB..."
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                style={{ width: '100%' }}
              />
            </Col>
          </Row>

          <Row gutter={[16, 12]} style={{ marginTop: 12 }}>
            <Col xs={24} sm={12} md={6}>
              <Checkbox checked={balanceAnterior} onChange={(e) => setBalanceAnterior(e.target.checked)}>
                Incluir Balance Anterior
              </Checkbox>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Checkbox checked={detallado} onChange={(e) => setDetallado(e.target.checked)}>
                Vista Detallada
              </Checkbox>
            </Col>
          </Row>

          <Row style={{ marginTop: 16 }}>
            <Col>
              <Space>
                <Button
                  type="primary"
                  icon={<TableOutlined />}
                  onClick={handleConsultar}
                  loading={consultando}
                >
                  Consultar
                </Button>
                <Button
                  icon={<PrinterOutlined />}
                  onClick={handlePrint}
                  loading={generando}
                >
                  Generar PDF
                </Button>
              </Space>
            </Col>
          </Row>
        </div>
      </Card>

      {/* ──── Tabla de datos ──── */}
      {consultando && (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" tip="Consultando datos..." />
        </div>
      )}

      {/* ──── Render: una sola cuenta (comportamiento original) ──── */}
      {!consultando && !esMultiCuenta && datos.length > 0 && kpi && (
        <>
          {/* KPIs */}
          <Card className="paces-card" style={{ marginBottom: 16 }}>
            {renderKpis(kpi)}
          </Card>

          {/* Tabla */}
          <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }}
            styles={{ body: { padding: 0 } }}>
            <div style={{ padding: '16px 24px 0', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Input.Search
                placeholder="Buscar por documento, cuenta o nombre..."
                allowClear
                onSearch={(v) => setBusquedaTabla(v)}
                onChange={(e) => !e.target.value && setBusquedaTabla('')}
                style={{ width: 400 }}
                prefix={<SearchOutlined className="paces-text-icon" />}
              />
              <div style={{ flex: 1 }} />
              <PermissionGate accion="EXPORTAR">
                <Button icon={<FileExcelOutlined />} onClick={handleExportExcel} />
              </PermissionGate>
            </div>

            {detallado ? (
              <Table
                className="paces-list-table"
                dataSource={datosFiltrados}
                rowKey={(r) => `${r.fechaDocumento}-${r.documentoCodigo}-${r.cuentaContableNoCuenta}-${r.tipoAsiento}-${r.monto}`}
                size="small"
                pagination={{ pageSize: 50, showTotal: (t) => `${t} registros` }}
                scroll={{ x: 1400 }}
                columns={columnasDetallado}
                locale={{ emptyText: <Empty description="Sin resultados" /> }}
              />
            ) : (
              <Table
                className="paces-list-table"
                dataSource={gruposDocumento}
                rowKey="key"
                size="small"
                pagination={{ pageSize: 25, showTotal: (t) => `${t} documentos` }}
                
                columns={[
                  { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 80 },
                  { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', width: 200 },
                  { title: 'Desde', dataIndex: 'minFecha', key: 'minFecha', width: 100, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
                  { title: 'Hasta', dataIndex: 'maxFecha', key: 'maxFecha', width: 100, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
                  { title: 'Total Débito', dataIndex: 'totalDebe', key: 'totalDebe', width: 130, align: 'right', render: (v: number) => v.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
                  { title: 'Total Crédito', dataIndex: 'totalHaber', key: 'totalHaber', width: 130, align: 'right', render: (v: number) => v.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
                ]}
                locale={{ emptyText: <Empty description="Sin resultados" /> }}
              />
            )}
          </Card>
        </>
      )}

      {/* ──── Render: multiples cuentas (cards separadas) ──── */}
      {!consultando && esMultiCuenta && resultadosPorCuenta.length > 0 && (
        <>
          {/* Barra superior con export general */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <Text strong style={{ fontSize: 14 }}>
              {resultadosPorCuenta.length} cuentas consultadas
            </Text>
            <div style={{ flex: 1 }} />
            <PermissionGate accion="EXPORTAR">
              <Button icon={<FileExcelOutlined />} onClick={handleExportExcelTodas}>
                Exportar Excel (todas)
              </Button>
            </PermissionGate>
          </div>

          {resultadosPorCuenta.map((resultado) => {
            const kpiCuenta = calcularKpi(resultado.items, resultado.balances);
            const busqueda = busquedaPorCuenta[resultado.cuenta.noCuenta] || '';
            const itemsFiltradosCuenta = filtrarItems(resultado.items, busqueda);

            return (
              <Card
                key={resultado.cuenta.noCuenta}
                className="paces-card-erp"
                style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}
                styles={{ body: { padding: 0 } }}
              >
                {/* Header de la cuenta */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
                  <Text strong style={{ fontSize: 16, color: '#556ee6' }}>
                    {resultado.cuenta.noCuenta} - {toTitleCase(resultado.cuenta.nombre)}
                  </Text>
                </div>

                {/* KPIs de esta cuenta */}
                <div style={{ padding: '16px 24px' }}>
                  {renderKpis(kpiCuenta)}
                </div>

                {/* Toolbar de esta cuenta */}
                <div style={{ padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Input.Search
                    placeholder="Buscar por documento, cuenta o nombre..."
                    allowClear
                    onSearch={(v) => setBusquedaPorCuenta((prev) => ({ ...prev, [resultado.cuenta.noCuenta]: v }))}
                    onChange={(e) => !e.target.value && setBusquedaPorCuenta((prev) => ({ ...prev, [resultado.cuenta.noCuenta]: '' }))}
                    style={{ width: 400 }}
                    prefix={<SearchOutlined className="paces-text-icon" />}
                  />
                  <div style={{ flex: 1 }} />
                  <PermissionGate accion="EXPORTAR">
                    <Button icon={<FileExcelOutlined />} onClick={() => handleExportExcelCuenta(resultado)} />
                  </PermissionGate>
                </div>

                  {detallado ? (
                    <Table
                      className="paces-list-table"
                      dataSource={itemsFiltradosCuenta}
                      rowKey={(r) => `${r.fechaDocumento}-${r.documentoCodigo}-${r.cuentaContableNoCuenta}-${r.tipoAsiento}-${r.monto}`}
                      size="small"
                      pagination={{ pageSize: 50, showTotal: (t) => `${t} registros` }}
                      scroll={{ x: 1400 }}
                      columns={columnasDetallado}
                      locale={{ emptyText: <Empty description="Sin resultados" /> }}
                    />
                  ) : (
                    <Table
                      className="paces-list-table"
                      dataSource={agruparPorDocumento(itemsFiltradosCuenta)}
                      rowKey="key"
                      size="small"
                      pagination={{ pageSize: 25, showTotal: (t) => `${t} documentos` }}
                      
                      columns={[
                        { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 80 },
                        { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', width: 200 },
                        { title: 'Desde', dataIndex: 'minFecha', key: 'minFecha', width: 100, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
                        { title: 'Hasta', dataIndex: 'maxFecha', key: 'maxFecha', width: 100, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
                        { title: 'Total Débito', dataIndex: 'totalDebe', key: 'totalDebe', width: 130, align: 'right' as const, render: (v: number) => v.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
                        { title: 'Total Crédito', dataIndex: 'totalHaber', key: 'totalHaber', width: 130, align: 'right' as const, render: (v: number) => v.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
                      ]}
                      locale={{ emptyText: <Empty description="Sin resultados" /> }}
                    />
                  )}
              </Card>
            );
          })}
        </>
      )}

      {/* ──── Modal busqueda cuenta contable ──── */}
      <BuscarCuentaContableModal
        open={modalCuentaAbierto}
        onClose={() => setModalCuentaAbierto(false)}
        onSelect={seleccionarCuenta}
        onSeleccionarMultiples={seleccionarMultiples}
        multiple
        sucursal={sucursalActiva}
      />
    </>
  );
};

export default MayorAuxiliar;
