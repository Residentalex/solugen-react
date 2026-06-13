import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { cotizacionVentaApi } from '../../api/cotizacionVentaApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import EntidadColumnCell from '../../components/EntidadColumnCell';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../utils/estadoDocumento';
import type { FacturaVistaDTO } from '../../types/facturacion';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;

const CotizacionVenta: React.FC = () => {
  const navigate = useNavigate();
  const { screenCode, documentCode } = useScreenConfig('FCotizacion');

  const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado<FacturaVistaDTO>({
    modulo: screenCode,
    fetchVista: (sucursal, desde, hasta, filas, salto, estado) =>
      cotizacionVentaApi.obtenerVista(sucursal, desde, hasta, filas, salto, estado) as unknown as Promise<FacturaVistaDTO[]>,
    fetchFiltrar: (sucursal, params) =>
      cotizacionVentaApi.filtrar(sucursal, params) as unknown as Promise<FacturaVistaDTO[]>,
    reporteUrl: (sucursal, id) => `/reportes/facturacion/cotizacionVenta/${sucursal}/${id}`,
    tituloReporte: 'Cotizacion',
    tituloError: 'Error al cargar cotizaciones',
  });

  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const handleClonar = async () => {
    if (!state.selectedRow) return;
    try {
      const data = await cotizacionVentaApi.obtenerPorId(sucursalActiva, state.selectedRow.id);
      const cloneData = {
        ...data,
        id: 0,
        noDocumento: '',
        estado: 0,
        asientos: [],
        logs: [],
      };
      navigate('/FCotizacion/nuevo', { state: { cloneData } });
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al obtener datos para clonar');
    }
  };

  const columns: ColumnsType<FacturaVistaDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 180,
      fixed: 'left',
      render: (doc: string, record: FacturaVistaDTO) => (
        <Link to={`/FCotizacion/${record.id}`} className="paces-doc-link"><Text strong>{doc}</Text></Link>
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
      scrollX={1370}
      selectedRowId={state.selectedRow?.id}
      loadingError={state.loadingError}
      errorMessage="Error al cargar cotizaciones"
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
        searchPlaceholder: 'Buscar documento, concepto, cliente...',
        onSearch: actions.handleSearch,
        pageSize: state.pageSize,
        onPageSizeChange: actions.handlePageSizeChange,
        showCrear: true,
        onCrear: () => navigate('/FCotizacion/nuevo'),
        showEditar: true,
        editarDisabled: !puedeEditar,
        onEditar: () => navigate(`/FCotizacion/${state.selectedRow!.id}/editar`),
        showClonar: true,
        clonarDisabled: !state.selectedRow,
        onClonar: handleClonar,
        showImprimir: true,
        imprimirDisabled: !state.selectedRow,
        onImprimir: actions.handleImprimir,
        onRefresh: actions.handleRefresh,
      }}
    />
  );
};

export default CotizacionVenta;
