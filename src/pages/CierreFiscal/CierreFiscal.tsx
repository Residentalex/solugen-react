import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { cierreFiscalApi, type CierreFiscalItem } from '../../api/cierreFiscalApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { formatCurrency, formatDateRaw } from '../../utils/formats';

const { Text } = Typography;

const PAGE_SIZE = 50;

const CierreFiscal: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);

  // Estados
  const [cierres, setCierres] = useState<CierreFiscalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [selectedRow, setSelectedRow] = useState<CierreFiscalItem | null>(null);

  // ============================================================
  // Carga de datos
  // ============================================================
  const cargarCierres = useCallback(async () => {
    setLoading(true);
    setLoadingError(false);
    try {
      const data = await cierreFiscalApi.listarCierres();
      setCierres(data);
      setPage(1);
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al cargar cierres fiscales';
      message.error(msg);
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Toolbar y carga inicial
  useEffect(() => {
    setActiveModule('RCIERREFISCAL');
    cargarCierres();
    return () => {
      resetToolbar();
    };
  }, [setActiveModule, resetToolbar, cargarCierres]);

  // ============================================================
  // Handlers
  // ============================================================
  const handleRefresh = useCallback(() => {
    cargarCierres();
  }, [cargarCierres]);

  const handleSearch = useCallback((value: string) => {
    setSearchText(value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  const handleRowClick = useCallback((record: CierreFiscalItem) => {
    setSelectedRow(record);
    navigate(`/RCIERREFISCAL/${record.transacId}`, { state: { cierre: record } });
  }, [navigate]);

  // ============================================================
  // Filtrado y paginación cliente-side
  // ============================================================
  const filteredCierres = useMemo(() => {
    if (!searchText) return cierres;
    const q = searchText.toLowerCase();
    return cierres.filter((c) =>
      c.numeroDocumento?.toLowerCase().includes(q)
    );
  }, [cierres, searchText]);

  const total = filteredCierres.length;

  const paginatedData = useMemo(() => {
    return filteredCierres.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredCierres, page, pageSize]);

  // ============================================================
  // Columnas
  // ============================================================
  const columns: ColumnsType<CierreFiscalItem> = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 130,
      render: (val: string, record: CierreFiscalItem) => (
        <Link
          to={`/RCIERREFISCAL/${record.transacId}`}
          state={{ cierre: record }}
          className="paces-doc-link"
        >
          <Text strong>{formatDateRaw(val)}</Text>
        </Link>
      ),
    },
    {
      title: 'No. Documento',
      dataIndex: 'numeroDocumento',
      key: 'numeroDocumento',
      width: 200,
      render: (val: string) => <Text>{val || ''}</Text>,
    },
    {
      title: 'Débitos',
      dataIndex: 'totalDebitos',
      key: 'totalDebitos',
      width: 160,
      align: 'right',
      render: (val: number) => (
        <Text strong className="paces-text-total">{formatCurrency(val)}</Text>
      ),
    },
    {
      title: 'Créditos',
      dataIndex: 'totalCreditos',
      key: 'totalCreditos',
      width: 160,
      align: 'right',
      render: (val: number) => (
        <Text strong className="paces-text-total">{formatCurrency(val)}</Text>
      ),
    },
  ];

  return (
    <DocumentListadoLayout<CierreFiscalItem>
      columns={columns}
      data={paginatedData}
      rowKey="transacId"
      loading={loading}
      total={total}
      page={page}
      pageSize={pageSize}
      scrollX={800}
      selectedRowId={selectedRow?.transacId}
      loadingError={loadingError}
      errorMessage="Error al cargar cierres fiscales"
      onRefresh={handleRefresh}
      onRowClick={handleRowClick}
      onPageChange={handlePageChange}
      pdfPreview={null}
      onPdfClose={() => {}}
      toolbarProps={{
        showFiltros: false,
        searchPlaceholder: 'Buscar número de documento...',
        onSearch: handleSearch,
        pageSize,
        onPageSizeChange: handlePageSizeChange,
        showCrear: false,
        showEditar: false,
        showClonar: false,
        showImprimir: false,
        onRefresh: handleRefresh,
      }}
    />
  );
};

export default CierreFiscal;
