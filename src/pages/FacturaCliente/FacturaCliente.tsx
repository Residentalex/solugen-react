import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { facturaClienteApi } from '../../api/facturaClienteApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import EntidadColumnCell from '../../components/EntidadColumnCell';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../utils/estadoDocumento';
import type { FacturaVistaDTO } from '../../types/facturacion';

const { Text } = Typography;

const FacturaCliente: React.FC = () => {
  const navigate = useNavigate();

  const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado<FacturaVistaDTO>({
    modulo: 'FFAC',
    fetchVista: (sucursal, desde, hasta, filas, salto, estado) =>
      facturaClienteApi.obtenerVista(sucursal, desde, hasta, filas, salto, estado),
    fetchFiltrar: (sucursal, params) =>
      facturaClienteApi.filtrar(sucursal, params),
    reporteUrl: (sucursal, id) => `/reportes/contabilidad/factura-cliente/${sucursal}/${id}`,
    tituloReporte: 'FC',
    tituloError: 'Error al cargar facturas de cliente',
  });

  const columns: ColumnsType<FacturaVistaDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 160,
      fixed: 'left',
      render: (doc: string, record: FacturaVistaDTO) => (
        <Link to={`/FFAC/${record.id}`} className="paces-doc-link"><Text strong>{doc}</Text></Link>
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
      title: 'NCF',
      dataIndex: 'ncf',
      key: 'ncf',
      width: 150,
      render: (ncf: string) => <Text>{ncf || ''}</Text>,
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

  return (
    <DocumentListadoLayout<FacturaVistaDTO>
      columns={columns}
      data={state.data}
      rowKey="id"
      loading={state.loading}
      total={state.total}
      page={state.page}
      pageSize={state.pageSize}
      scrollX={1350}
      selectedRowId={state.selectedRow?.id}
      loadingError={state.loadingError}
      errorMessage="Error al cargar facturas de cliente"
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
        searchPlaceholder: 'Buscar documento, NCF, concepto...',
        onSearch: actions.handleSearch,
        pageSize: state.pageSize,
        onPageSizeChange: actions.handlePageSizeChange,
        showCrear: true,
        onCrear: () => navigate('/FFAC/nuevo'),
        showEditar: true,
        editarDisabled: !puedeEditar,
        onEditar: () => navigate(`/FFAC/${state.selectedRow!.id}/editar`),
        showImprimir: true,
        imprimirDisabled: !state.selectedRow,
        onImprimir: actions.handleImprimir,
        onRefresh: actions.handleRefresh,
      }}
    />
  );
};

export default FacturaCliente;
