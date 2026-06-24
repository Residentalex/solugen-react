import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { transaccionApi } from '../../api/transaccionApi';
import { documentosApi } from '../../api/documentosApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import SucursalDocumentoSelector from '../../components/SucursalDocumentoSelector';
import { formatCurrency, formatDateRaw, formatDateParam, toTitleCase } from '../../utils/formats';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import type { TransaccionDTO } from '../../types/transaccion';
import type { DocumentoDTO } from '../../types/documento';

const { Text } = Typography;

const IntegridadAsientos: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const sucursalesDisponibles = useCompanyStore((s: any) => s.data.sucursales);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);

  const [data, setData] = useState<TransaccionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRow, setSelectedRow] = useState<TransaccionDTO | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filtros, setFiltros] = useState<{ desde?: string; hasta?: string }>({});
  const [sucursalFiltro, setSucursalFiltro] = useState<number | undefined>(undefined);
  const [tipoDoc, setTipoDoc] = useState<string | undefined>(undefined);
  const [documentos, setDocumentos] = useState<DocumentoDTO[]>([]);

  const rangoDefault = useMemo(() => ({
    desde: formatDateParam(new Date(Date.now() - 30 * 86400000)),
    hasta: formatDateParam(new Date()),
  }), []);

  useEffect(() => {
    documentosApi.obtenerListado(sucursalActiva).then(setDocumentos).catch(() => {});
  }, [sucursalActiva]);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const desde = filtros.desde ?? rangoDefault.desde;
      const hasta = filtros.hasta ?? rangoDefault.hasta;
      if (sucursalFiltro === -1) {
        const sucursalesIds = (sucursalesDisponibles || [])
          .filter((s: any) => s.sucursal !== undefined)
          .map((s: any) => s.sucursal as number);
        const resultados = await Promise.all(
          sucursalesIds.map(suc =>
            transaccionApi.obtenerCuentasInvalidas(suc, desde, hasta, tipoDoc || undefined)
              .catch(() => [] as any[])
          )
        );
        const result = resultados.flat();
        setData(result);
      } else {
        const suc = sucursalFiltro ?? sucursalActiva;
        const result = await transaccionApi.obtenerCuentasInvalidas(suc, desde, hasta, tipoDoc || undefined);
        setData(result);
      }
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, sucursalFiltro, rangoDefault, filtros, tipoDoc, sucursalesDisponibles]);

  useEffect(() => {
    cargarDatos();
  }, [refreshTrigger, cargarDatos]);

  useEffect(() => {
    setActiveModule('RIntegridadAsientos');
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

  const handleRowClick = (record: TransaccionDTO) => {
    setSelectedRow(record);
  };

  const filteredData = useMemo(() => {
    if (!searchText) return data;
    const t = searchText.toLowerCase();
    return data.filter((r) =>
      (r.noDocumento || '').toLowerCase().includes(t) ||
      (r.nombreEntidad || '').toLowerCase().includes(t) ||
      (r.concepto?.nombre || '').toLowerCase().includes(t) ||
      (r.documento?.codigo || '').toLowerCase().includes(t)
    );
  }, [data, searchText]);

  const columns: ColumnsType<TransaccionDTO> = [
    {
      title: 'Documento',
      key: 'documento',
      width: 180,
      fixed: 'left',
      render: (_, record) => (
        <Link to={`/FAsientoContable/${record.id}`} className="paces-doc-link">
          <Text strong>{record.documento?.codigo || ''}-{record.noDocumento}</Text>
        </Link>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaDocumento',
      key: 'fechaDocumento',
      width: 110,
      render: (v: string) => <Text>{formatDateRaw(v)}</Text>,
    },
    {
      title: 'Entidad',
      key: 'entidad',
      ellipsis: true,
      render: (_, record) => (
        <Text>{toTitleCase(record.nombreEntidad || record.entidad?.nombre || '')}</Text>
      ),
    },
    {
      title: 'Concepto',
      key: 'concepto',
      width: 320,
      ellipsis: true,
      render: (_, record) => (
        <Text>{toTitleCase(record.concepto?.nombre || '')}</Text>
      ),
    },
    {
      title: 'Cuenta Inválida',
      key: 'cuentaInvalida',
      width: 160,
      render: (_: any, record: TransaccionDTO) => {
        const asiento = record.asientos?.[0];
        const noCuenta = asiento?.cuentaContable?.noCuenta || asiento?.noCuenta || '';
        return noCuenta ? (
          <Text type="danger">{noCuenta}</Text>
        ) : <Text type="warning">—</Text>;
      },
    },
    {
      title: 'Monto',
      key: 'monto',
      width: 130,
      align: 'right' as const,
      render: (_: any, record: TransaccionDTO) => {
        const asiento = record.asientos?.[0];
        return <Text>{formatCurrency(asiento?.monto ?? 0)}</Text>;
      },
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 110,
      render: (est: string | number, record) => <EstadoColumnCell estado={est} periodo={record.periodo} />,
    },
  ];

  const docOptions = useMemo(() =>
    documentos.map((d) => ({ value: d.codigo, label: `${d.codigo} - ${d.nombre || ''}` })),
  [documentos]);

  return (
    <DocumentListadoLayout<TransaccionDTO>
      columns={columns}
      data={filteredData}
      rowKey="id"
      loading={loading}
      total={filteredData.length}
      page={page}
      pageSize={pageSize}
      scrollX={1100}
      selectedRowId={selectedRow?.id}
      loadingError={loadingError}
      errorMessage="Error al cargar integridad de asientos"
      onRefresh={handleRefresh}
      onRowClick={handleRowClick}
      onPageChange={setPage}
      pdfPreview={null}
      onPdfClose={() => {}}
      toolbarProps={{
        showFiltros: true,
        filtros,
        rangoDefault,
        opcionesEstado: [],
        onFiltrosAplicar: (nuevos) => { setFiltros(nuevos); setPage(1); },
        searchPlaceholder: 'Buscar documento, entidad...',
        onSearch: handleSearch,
        pageSize,
        onPageSizeChange: (v) => { setPageSize(v); setPage(1); },
        onRefresh: handleRefresh,
        extraLeft: (
          <>
            <SucursalDocumentoSelector
              value={sucursalFiltro}
              onChange={(val) => { setSucursalFiltro(val); setPage(1); }}
              showAllOption
            />
            <Select
              placeholder="Documento"
              allowClear
              showSearch
              style={{ minWidth: 280 }}
              value={tipoDoc}
              onChange={(val) => { setTipoDoc(val); setPage(1); }}
              options={docOptions}
              size="small"
              filterOption={(input, option) =>
                (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </>
        ),
      }}
    />
  );
};

export default IntegridadAsientos;
