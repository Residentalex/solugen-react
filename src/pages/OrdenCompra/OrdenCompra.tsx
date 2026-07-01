import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ordenCompraApi } from '../../api/ordenCompraApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../utils/estadoDocumento';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { Sucursal } from '../../types/auth';
import type { OrdenCompraVistaDTO } from '../../types/entradaAlmacen';
import { useScreenConfig } from '../../hooks/useScreenConfig';

const { Text } = Typography;

const destino = Sucursal.Compra;

const OrdenCompra: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const { screenCode, documentCode } = useScreenConfig();

  const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado<OrdenCompraVistaDTO>({
    modulo: screenCode,
    fetchVista: (sucursal, desde, hasta, filas, salto, estado) =>
      ordenCompraApi.obtenerResumido(sucursal, destino, {
        desde,
        hasta,
        cantidad: filas,
        salto,
        estado,
      } as any),
    fetchFiltrar: (sucursal, params) =>
      ordenCompraApi.filtrar(sucursal, destino, {
        cantidad: params.cantidad,
        salto: params.salto,
        documento: params.documento,
        suplidor: params.documento,
        concepto: params.concepto,
        desde: params.desde,
        hasta: params.hasta,
      }),
    reporteUrl: () => '',
    tituloReporte: '',
    tituloError: 'Error al cargar órdenes de compra',
  });

  const handleClonar = async () => {
    if (!state.selectedRow) return;
    try {
      const data = await ordenCompraApi.obtenerPorId(sucursalActiva, state.selectedRow.id);
      const cloneData = {
        ...data,
        id: 0,
        noDocumento: '',
        ncf: '',
        ncfModificado: '',
        estado: 0,
        asientos: [],
        logs: [],
      };
      navigate('/FORC/nuevo', { state: { cloneData } });
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al obtener datos para clonar');
    }
  };

  const columns: ColumnsType<OrdenCompraVistaDTO> = [
    {
      title: 'Documento',
      dataIndex: 'noDocumento',
      key: 'noDocumento',
      width: 180,
      fixed: 'left',
      render: (doc: string, record: OrdenCompraVistaDTO) => (
        <Link to={`/FORC/${record.id}`} className="paces-doc-link"><Text strong>{doc || '-'}</Text></Link>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaDocumento',
      key: 'fechaDocumento',
      width: 110,
      render: (f: string) => <Text>{formatDateRaw(f)}</Text>,
    },
    {
      title: 'Suplidor',
      key: 'suplidor',
      render: (_: any, record: OrdenCompraVistaDTO) => (
        <Text>{record.suplidor?.nombre ? toTitleCase(record.suplidor.nombre) : '-'}</Text>
      ),
    },
    {
      title: 'Concepto',
      key: 'concepto',
      width: 250,
      ellipsis: true,
      render: (_: any, record: OrdenCompraVistaDTO) => (
        <Text>{record.concepto?.nombre ? toTitleCase(record.concepto.nombre) : '-'}</Text>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 160,
      align: 'right',
      render: (total: number) => (
        <Text strong className="paces-text-total">{formatCurrency(total || 0)}</Text>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 130,
      render: (estado: number, record: OrdenCompraVistaDTO) => (
        <EstadoColumnCell estado={estado} periodo={(record as any).periodo} />
      ),
    },
  ];

  return (
    <DocumentListadoLayout<OrdenCompraVistaDTO>
      columns={columns}
      data={state.data}
      rowKey="id"
      loading={state.loading}
      total={state.total}
      page={state.page}
      pageSize={state.pageSize}
      scrollX={1120}
      selectedRowId={state.selectedRow?.id}
      loadingError={state.loadingError}
      errorMessage="Error al cargar órdenes de compra"
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
        searchPlaceholder: 'Buscar documento, suplidor...',
        onSearch: actions.handleSearch,
        searchDefaultValue: state.searchText,
        pageSize: state.pageSize,
        onPageSizeChange: actions.handlePageSizeChange,
        showCrear: true,
        onCrear: () => navigate('/FORC/nuevo'),
        showClonar: true,
        clonarDisabled: !state.selectedRow,
        onClonar: handleClonar,
        showImprimir: false,
        showEditar: true,
        editarDisabled: !puedeEditar,
        onEditar: () => navigate(`/FORC/${state.selectedRow!.id}/editar`),
        onRefresh: actions.handleRefresh,
      }}
    />
  );
};

export default OrdenCompra;
