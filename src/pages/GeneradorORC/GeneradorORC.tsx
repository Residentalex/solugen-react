import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { generadorOrcApi } from '../../api/generadorOrcApi';
import { apiClient } from '../../api/client';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import type { GeneradorOrdenCompraDTO } from '../../types/generadorOrc';

const { Text } = Typography;

const ESTADO_MAP_ORC: Record<number, { label: string; color: string }> = {
  0: { label: 'Borrador', color: 'default' },
  1: { label: 'Generado', color: 'success' },
  2: { label: 'Procesado', color: 'processing' },
  3: { label: 'Anulado', color: 'error' },
};

const ESTADO_OPCIONES_ORC = [
  { value: 0, label: 'Borrador' },
  { value: 1, label: 'Generado' },
  { value: 3, label: 'Anulado' },
];

const GeneradorORC: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);

  const [data, setData] = useState<GeneradorOrdenCompraDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchText, setSearchText] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loadingError, setLoadingError] = useState(false);
  const [filtros, setFiltros] = useState<{ desde?: string; hasta?: string; estado?: number }>({});
  const [selectedRow, setSelectedRow] = useState<GeneradorOrdenCompraDTO | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null);

  const rangoDefault = useMemo(() => ({
    desde: '20000101000000',
    hasta: '20991231000000',
  }), []);

  const cargarDatos = useCallback(async (pagina: number, filas: number, busqueda: string) => {
    setLoading(true);
    try {
      let desde = filtros.desde ?? rangoDefault.desde;
      let hasta = filtros.hasta ?? rangoDefault.hasta;
      let resultados;
      if (busqueda.length > 2) {
        if (!filtros.desde) desde = '19000101000000';
        if (!filtros.hasta) hasta = '20991231235959';
        resultados = await generadorOrcApi.filtrar(sucursalActiva, {
          cantidad: filas,
          salto: (pagina - 1) * filas,
          desde,
          hasta,
          documento: busqueda,
          estado: filtros.estado ?? 0,
        });
      } else {
        resultados = await generadorOrcApi.obtenerVista(sucursalActiva, desde, hasta, filas, (pagina - 1) * filas, busqueda, filtros.estado);
      }
      setData(resultados);
      setTotal(resultados.length < filas ? (pagina - 1) * filas + resultados.length : pagina * filas + 1);
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, filtros, rangoDefault]);

  useEffect(() => {
    cargarDatos(page, pageSize, searchText);
  }, [page, pageSize, searchText, refreshTrigger, filtros, cargarDatos]);

  useEffect(() => {
    setActiveModule('FGORC');
    updateToolbar({ editar: false, anular: false });
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleRefresh = () => {
    setLoadingError(false);
    setRefreshTrigger((n) => n + 1);
  };

  const columns: ColumnsType<GeneradorOrdenCompraDTO> = [
    {
      title: 'Número',
      dataIndex: 'numero',
      key: 'numero',
      width: 160,
      fixed: 'left',
      render: (num: string, record: GeneradorOrdenCompraDTO) => (
        <Link to={`/FGORC/${record.idExterno}`} className="paces-doc-link"><Text strong>{num}</Text></Link>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (f: string) => <Text>{formatDateRaw(f)}</Text>,
    },
    {
      title: 'Suplidor',
      key: 'suplidor',
      render: (_, record: GeneradorOrdenCompraDTO) => (
        <Text>{record.suplidor ? toTitleCase(record.suplidor.nombre) : '-'}</Text>
      ),
    },
    {
      title: 'Almacén',
      dataIndex: 'almacen',
      key: 'almacen',
      width: 200,
      ellipsis: true,
      render: (alm: string) => <Text>{toTitleCase(alm) || ''}</Text>,
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
      width: 130,
      render: (estado: number) => {
        const info = ESTADO_MAP_ORC[estado] || { label: 'Desconocido', color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
  ];

  return (
    <DocumentListadoLayout<GeneradorOrdenCompraDTO>
      columns={columns}
      data={data}
      rowKey="idExterno"
      loading={loading}
      total={total}
      page={page}
      pageSize={pageSize}
      scrollX={920}
      loadingError={loadingError}
      errorMessage="Error al cargar generadores ORC"
      onRefresh={handleRefresh}
      onPageChange={setPage}
      onRowClick={(record) => setSelectedRow(record)}
      pdfPreview={pdfPreview}
      onPdfClose={() => { setPdfPreview(null); }}
      selectedRowId={selectedRow?.idExterno}
      toolbarProps={{
        showFiltros: true,
        filtros,
        rangoDefault,
        opcionesEstado: ESTADO_OPCIONES_ORC,
        onFiltrosAplicar: (nuevos) => { setFiltros(nuevos); setPage(1); },
        searchPlaceholder: 'Buscar número o suplidor...',
        onSearch: handleSearch,
        pageSize,
        onPageSizeChange: (v) => { setPageSize(v); setPage(1); },
        showCrear: true,
        onCrear: () => navigate('/FGORC/nuevo'),
        showEditar: true,
        editarDisabled: !selectedRow,
        onEditar: () => selectedRow && navigate(`/FGORC/${selectedRow.idExterno}/editar`),
        showImprimir: true,
        imprimirDisabled: !selectedRow,
        onImprimir: async () => {
          if (!selectedRow) return;
          try {
            const res = await apiClient.get(`/ReporteGeneradorOrdenCompra/${sucursalActiva}/${selectedRow.idExterno}`, {
              responseType: 'blob',
            });
            const url = URL.createObjectURL(res.data);
            setPdfPreview({ url, title: `GORC-${selectedRow.numero}` });
          } catch (err: any) {
            message.error(err?.response?.data?.errorMessage || 'Error al generar el reporte');
          }
        },
        onRefresh: handleRefresh,
      }}
    />
  );
};

export default GeneradorORC;
