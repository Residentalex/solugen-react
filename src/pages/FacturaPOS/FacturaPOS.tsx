import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, Alert } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { facturaPOSApi } from '../../api/facturaPOSApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import EntidadColumnCell from '../../components/EntidadColumnCell';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../utils/estadoDocumento';
import type { FacturaVistaDTO } from '../../types/facturacion';
import { useScreenConfig } from '../../hooks/useScreenConfig';

const { Text } = Typography;

const FacturaPOS: React.FC = () => {
  const navigate = useNavigate();
  const { screenCode, documentCode } = useScreenConfig();

  const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado<FacturaVistaDTO>({
    modulo: screenCode,
    fetchVista: (sucursal, desde, hasta, filas, salto, estado) =>
      facturaPOSApi.obtenerVista(sucursal, desde, hasta, filas, salto, estado),
    fetchFiltrar: (sucursal, params) =>
      facturaPOSApi.filtrar(sucursal, params),
    reporteUrl: (sucursal, id) => `/reportes/facturacion/pos/${sucursal}/${id}`,
    tituloReporte: 'POS',
    tituloError: 'Error al cargar facturas POS',
  });

  const columns: ColumnsType<FacturaVistaDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 180,
      fixed: 'left',
      render: (doc: string, record: FacturaVistaDTO) => (
        <Link to={`/FPV/${record.id}`} className="paces-doc-link"><Text strong>{doc}</Text></Link>
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
      title: 'Cliente',
      dataIndex: 'entidad',
      key: 'entidad',
      render: (name: string, record: any) => (
        <div>
          <EntidadColumnCell name={name} />
          {record.identificacion && (
            <div className="paces-text-secondary" style={{ fontSize: 10 }}>RNC: {record.identificacion}</div>
          )}
        </div>
      ),
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
      title: 'Almacén',
      dataIndex: 'almacen',
      key: 'almacen',
      width: 200,
      render: (alm: string) => <Text>{toTitleCase(alm) || ''}</Text>,
    },
    {
      title: 'NCF',
      dataIndex: 'ncf',
      key: 'ncf',
      width: 150,
      render: (ncf: string) => <Text>{ncf || ''}</Text>,
    },
    {
      title: 'Turno',
      dataIndex: 'turno',
      key: 'turno',
      width: 100,
      render: (turno: string) => <Text>{turno || ''}</Text>,
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
      render: (estado: number, record: FacturaVistaDTO) => (
        <EstadoColumnCell estado={Number(estado)} periodo={record.periodo} />
      ),
    },
  ];

  const customEmptyText = state.searchText ? (
    <div style={{ padding: '20px 0' }}>
      <Alert
        type="info"
        showIcon
        message="Búsqueda limitada"
        description={`La búsqueda en Factura POS solo considera los últimos 30 días. Si la factura "${state.searchText}" es más antigua, use el botón "Filtros" para expandir el rango de fechas manualmente.`}
      />
    </div>
  ) : undefined;

  return (
    <DocumentListadoLayout<FacturaVistaDTO>
      columns={columns}
      data={state.data}
      rowKey="id"
      loading={state.loading}
      total={state.total}
      page={state.page}
      pageSize={state.pageSize}
      scrollX={1520}
      selectedRowId={state.selectedRow?.id}
      loadingError={state.loadingError}
      errorMessage="Error al cargar facturas POS"
      onRefresh={actions.handleRefresh}
      onRowClick={actions.handleRowClick}
      onPageChange={actions.goToPage}
      pdfPreview={state.pdfPreview}
      onPdfClose={actions.handlePdfClose}
      emptyText={customEmptyText}
      toolbarProps={{
        showFiltros: true,
        filtros: state.filtros,
        rangoDefault,
        opcionesEstado: ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO,
        onFiltrosAplicar: actions.handleFiltrosAplicar,
        searchPlaceholder: 'Buscar documento, NCF, concepto...',
        onSearch: actions.handleSearch,
        pageSize: state.pageSize,
        onPageSizeChange: actions.handlePageSizeChange,
        showCrear: true,
        onCrear: () => navigate('/FPV/nuevo'),
        showEditar: true,
        editarDisabled: !puedeEditar,
        onEditar: () => navigate(`/FPV/${state.selectedRow!.id}/editar`),
        showImprimir: true,
        imprimirDisabled: !state.selectedRow,
        onImprimir: actions.handleImprimir,
        onRefresh: actions.handleRefresh,
      }}
    />
  );
};

export default FacturaPOS;
