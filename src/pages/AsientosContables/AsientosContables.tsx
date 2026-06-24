import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { asientoContableApi } from '../../api/asientoContableApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import type { TransaccionVistaDTO } from '../../types/transaccion';

const { Text } = Typography;

const OPCIONES_ESTADO = [
  { value: '', label: 'Todos' },
  { value: 0, label: 'Borrador' },
  { value: 1, label: 'Terminado' },
  { value: 3, label: 'Anulado' },
];

const AsientosContables: React.FC = () => {
  const navigate = useNavigate();
  const { screenCode } = useScreenConfig();

  const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado<TransaccionVistaDTO>({
    modulo: screenCode,
    fetchVista: (sucursal, desde, hasta, filas, salto, estado) =>
      asientoContableApi.obtenerVista(sucursal, desde, hasta, filas, salto, estado),
    fetchFiltrar: (sucursal, params) =>
      asientoContableApi.filtrarConAsientos(sucursal, params),
    reporteUrl: () => '',
    tituloReporte: 'AsientoContable',
    tituloError: 'Error al cargar asientos contables',
  });

  const handleClonar = async () => {
    if (!state.selectedRow) return;
    message.info('Función de clonar no disponible para asientos contables');
  };

  const columns: ColumnsType<TransaccionVistaDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 180,
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
      render: (est: string) => (
        <EstadoColumnCell estado={est} />
      ),
    },
  ];

  return (
    <DocumentListadoLayout<TransaccionVistaDTO>
      columns={columns}
      data={state.data}
      rowKey="id"
      loading={state.loading}
      total={state.total}
      page={state.page}
      pageSize={state.pageSize}
      scrollX={1080}
      selectedRowId={state.selectedRow?.id}
      loadingError={state.loadingError}
      errorMessage="Error al cargar asientos contables"
      onRefresh={actions.handleRefresh}
      onRowClick={actions.handleRowClick}
      onPageChange={actions.goToPage}
      pdfPreview={state.pdfPreview}
      onPdfClose={actions.handlePdfClose}
      toolbarProps={{
        showFiltros: true,
        filtros: state.filtros,
        rangoDefault,
        opcionesEstado: OPCIONES_ESTADO,
        onFiltrosAplicar: actions.handleFiltrosAplicar,
        searchPlaceholder: 'Buscar documento, entidad, concepto...',
        onSearch: actions.handleSearch,
        pageSize: state.pageSize,
        onPageSizeChange: actions.handlePageSizeChange,
        onRefresh: actions.handleRefresh,
        showCrear: true,
        onCrear: () => navigate('/FAsientoContable/nuevo'),
        showEditar: true,
        editarDisabled: !state.selectedRow,
        onEditar: () => navigate(`/FAsientoContable/${state.selectedRow!.id}/editar`),
        showClonar: true,
        clonarDisabled: !state.selectedRow,
        onClonar: handleClonar,
      }}
    />
  );
};

export default AsientosContables;
