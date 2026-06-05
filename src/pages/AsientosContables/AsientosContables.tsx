import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { asientoContableApi } from '../../api/asientoContableApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { formatCurrency, formatDateRaw, formatDateParam, toTitleCase } from '../../utils/formats';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../utils/estadoDocumento';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import type { TransaccionVistaDTO } from '../../types/transaccion';

const { Text } = Typography;

const AsientosContables: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);

  const [data, setData] = useState<TransaccionVistaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRow, setSelectedRow] = useState<TransaccionVistaDTO | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loadingError, setLoadingError] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filtros, setFiltros] = useState<{ desde?: string; hasta?: string; estado?: number }>({});

  const rangoDefault = useMemo(() => ({
    desde: formatDateParam(new Date(Date.now() - 30 * 86400000)),
    hasta: formatDateParam(new Date()),
  }), []);

  const cargarDatos = useCallback(async (pagina: number, filas: number, busqueda: string) => {
    setLoading(true);
    try {
      let desde = filtros.desde ?? rangoDefault.desde;
      let hasta = filtros.hasta ?? rangoDefault.hasta;

      if (busqueda.length > 2) {
        if (!filtros.desde) desde = '19000101000000';
        if (!filtros.hasta) hasta = '20991231235959';
        const result = await asientoContableApi.filtrarConAsientos(
          sucursalActiva, filas, (pagina - 1) * filas,
          desde, hasta, filtros.estado,
          busqueda, busqueda, busqueda, busqueda
        );
        setData(result);
        setTotal(
          result.length < filas
            ? (pagina - 1) * filas + result.length
            : pagina * filas + 1
        );
      } else {
        const result = await asientoContableApi.obtenerVista(
          sucursalActiva, desde, hasta, filas, (pagina - 1) * filas, filtros.estado
        );
        setData(result);
        setTotal(
          result.length < filas
            ? (pagina - 1) * filas + result.length + 1
            : (pagina - 1) * filas + result.length + filas
        );
      }
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, rangoDefault, filtros]);

  useEffect(() => {
    cargarDatos(page, pageSize, searchText);
  }, [page, pageSize, refreshTrigger, searchText, cargarDatos]);

  useEffect(() => {
    setActiveModule('FAsientoContable');
    updateToolbar({});
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

  const handleRowClick = (record: TransaccionVistaDTO) => {
    setSelectedRow(record);
  };

  const columns: ColumnsType<TransaccionVistaDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 200,
      fixed: 'left',
      render: (doc: any, record: TransaccionVistaDTO) => (
        <Link to={`/FAsientoContable/${record.id}`} className="paces-doc-link">
          <Text strong>{typeof doc === 'string' ? doc : doc?.codigo || doc?.nombre || JSON.stringify(doc)}</Text>
        </Link>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (v: string) => <Text>{formatDateRaw(v)}</Text>,
    },
    {
      title: 'Entidad',
      dataIndex: 'entidad',
      key: 'entidad',
      ellipsis: true,
      render: (v: string) => <Text>{toTitleCase(v || '')}</Text>,
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      key: 'concepto',
      width: 320,
      ellipsis: true,
      render: (v: string) => <Text>{toTitleCase(v || '')}</Text>,
    },
    {
      title: 'NCF',
      dataIndex: 'ncf',
      key: 'ncf',
      width: 140,
      render: (v: string) => <Text>{v || ''}</Text>,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 140,
      align: 'right',
      render: (v: number) => <Text strong>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 110,
      render: (est: number) => (
        <EstadoColumnCell estado={est} />
      ),
    },
  ];

  return (
    <DocumentListadoLayout<TransaccionVistaDTO>
      columns={columns}
      data={data}
      rowKey="id"
      loading={loading}
      total={total}
      page={page}
      pageSize={pageSize}
      scrollX={1100}
      selectedRowId={selectedRow?.id}
      loadingError={loadingError}
      errorMessage="Error al cargar asientos contables"
      onRefresh={handleRefresh}
      onRowClick={handleRowClick}
      onPageChange={setPage}
      pdfPreview={null}
      onPdfClose={() => {}}
      toolbarProps={{
        showFiltros: true,
        filtros,
        rangoDefault,
        opcionesEstado: ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO,
        onFiltrosAplicar: (nuevos) => { setFiltros(nuevos); setPage(1); },
        searchPlaceholder: 'Buscar documento, entidad, concepto...',
        onSearch: handleSearch,
        pageSize,
        onPageSizeChange: (v) => { setPageSize(v); setPage(1); },
        onRefresh: handleRefresh,
      }}
    />
  );
};

export default AsientosContables;
