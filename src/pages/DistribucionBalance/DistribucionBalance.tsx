import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { distribucionBalanceApi } from '../../api/distribucionBalanceApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import EntidadColumnCell from '../../components/EntidadColumnCell';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../utils/estadoDocumento';
import type { TransaccionVistaDTO } from '../../types/transaccion';

const { Text } = Typography;

interface DistribucionBalanceProps {
  tipoEntidad: 'SUP' | 'CLI';
}

const DistribucionBalance: React.FC<DistribucionBalanceProps> = ({ tipoEntidad }) => {
  const navigate = useNavigate();
  const codigoPantalla = tipoEntidad === 'SUP' ? 'FDBASUP' : 'FDBACLI';
  const entidadLabel = tipoEntidad === 'SUP' ? 'Suplidor' : 'Cliente';

  const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado<TransaccionVistaDTO>({
    modulo: codigoPantalla,
    fetchVista: (sucursal, desde, hasta, filas, salto, estado) =>
      distribucionBalanceApi.obtenerVista(sucursal, tipoEntidad, desde, hasta, filas, salto, estado),
    fetchFiltrar: (sucursal, params) =>
      distribucionBalanceApi.filtrar(sucursal, tipoEntidad, {
        cantidad: params.cantidad,
        salto: params.salto,
        desde: params.desde,
        hasta: params.hasta,
        tipoEntidad,
        documento: params.documento,
        nCF: params.nCF,
        concepto: params.concepto,
        entidad: params.entidad,
      }),
    reporteUrl: (sucursal, id) => `/reportes/contabilidad/distribucion-balance/${sucursal}/${id}`,
    tituloReporte: 'DBA',
    tituloError: 'Error al cargar distribuciones de balance',
  });

  const columns: ColumnsType<TransaccionVistaDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 160,
      fixed: 'left',
      render: (doc: string, record: TransaccionVistaDTO) => (
        <Link to={`/${codigoPantalla}/${record.id}`} className="paces-doc-link"><Text strong>{doc}</Text></Link>
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
      title: entidadLabel,
      dataIndex: 'entidad',
      key: 'entidad',
      ellipsis: true,
      render: (name: string) => <EntidadColumnCell name={name} />,
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      key: 'concepto',
      width: 280,
      ellipsis: true,
      render: (concepto: string) => <Text>{toTitleCase(concepto) || ''}</Text>,
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
      width: 100,
      render: (estado: number, record: TransaccionVistaDTO) => (
        <EstadoColumnCell estado={estado} periodo={record.periodo} />
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
      scrollX={1150}
      selectedRowId={state.selectedRow?.id}
      loadingError={state.loadingError}
      errorMessage="Error al cargar distribuciones de balance"
      onRefresh={actions.handleRefresh}
      onRowClick={actions.handleRowClick}
      onPageChange={actions.goToPage}
      pdfPreview={state.pdfPreview}
      onPdfClose={actions.handlePdfClose}
      toolbarProps={{
        showFiltros: true,
        filtros: state.filtros,
        rangoDefault,
        opcionesEstado: ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO,
        onFiltrosAplicar: actions.handleFiltrosAplicar,
        searchPlaceholder: 'Buscar documento, concepto...',
        onSearch: actions.handleSearch,
        pageSize: state.pageSize,
        onPageSizeChange: actions.handlePageSizeChange,
        showCrear: true,
        onCrear: () => navigate(`/${codigoPantalla}/nuevo`),
        showEditar: true,
        editarDisabled: !puedeEditar,
        onEditar: () => navigate(`/${codigoPantalla}/${state.selectedRow!.id}/editar`),
        showClonar: false,
        showImprimir: true,
        imprimirDisabled: !state.selectedRow,
        onImprimir: actions.handleImprimir,
        onRefresh: actions.handleRefresh,
      }}
    />
  );
};

export default DistribucionBalance;
